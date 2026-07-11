import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { saveEntry } from '../src/lib/backstage-store.ts';
import { readBackstageFeed } from '../src/lib/backstage-retrieval.ts';

const here = dirname(fileURLToPath(import.meta.url));

// Exercise the seam against the COMMITTED migrations and a REAL SQLite store (the engine
// D1 runs on), so "byte-for-byte against the store" is literal — the retrieved payload is
// compared to rows that actually went through the same schema, CHECK, and column mapping a
// live submission would. Mirrors test/backstage-store.test.mjs's store helper.
const MIGRATION_0001_SQL = readFileSync(
  join(here, '..', 'migrations', '0001_create_backstage_entries.sql'),
  'utf8',
);
const MIGRATION_0002_SQL = readFileSync(
  join(here, '..', 'migrations', '0002_add_backstage_entry_completion.sql'),
  'utf8',
);

function createEntryStore() {
  const db = new DatabaseSync(':memory:');
  db.exec(MIGRATION_0001_SQL);
  db.exec(MIGRATION_0002_SQL);
  return {
    prepare(sql) {
      const stmt = db.prepare(sql);
      const withParams = (params) => ({
        async run() {
          return stmt.run(...params);
        },
        async all() {
          return { results: stmt.all(...params) };
        },
        bind(...more) {
          return withParams([...params, ...more]);
        },
      });
      return withParams([]);
    },
  };
}

const entry = (over = {}) => ({
  type: 'reference',
  url: 'https://example.com/a',
  text: 'a note',
  submittedAt: '2026-07-10T12:00:00.000Z',
  ...over,
});

const PASSCODE = 's3cret-day-1';

// Build the request an agent sends: a GET carrying the shared passcode header (or not).
function req(passcode) {
  const headers = passcode === undefined ? {} : { 'x-demo-passcode': passcode };
  return new Request('https://demo.example/api/backstage/feed', { headers });
}

// Drive the seam exactly as the route does, then read the Response the way an agent would.
// Key-presence (not defaulting) is used so `{ passcode: undefined }` means "omit the header"
// and `{ configured: '' }` means "blank server passcode" — an explicit `undefined` default
// would otherwise silently fall back to the valid passcode.
async function read(store, opts = {}) {
  const passcode = 'passcode' in opts ? opts.passcode : PASSCODE;
  const configured = 'configured' in opts ? opts.configured : PASSCODE;
  const res = await readBackstageFeed({ request: req(passcode), configured, db: store });
  return { res, status: res.status, body: await res.json() };
}

test('a previously submitted entry comes back byte-for-byte through the seam', async () => {
  const store = createEntryStore();
  const submitted = entry();
  await saveEntry(store, submitted); // the storage side of a submission

  const { status, body } = await read(store);

  assert.equal(status, 200);
  assert.deepStrictEqual(body.entries, [submitted]);
  // Explicit byte assertions so a silent normalization of the two free-text fields
  // named in the acceptance criterion (text/url) would be obvious.
  assert.equal(body.entries[0].text, submitted.text);
  assert.equal(body.entries[0].url, submitted.url);
});

test('hard content — newlines, Unicode, quotes, query strings — survives the seam exactly', async () => {
  const store = createEntryStore();
  const gnarly = entry({
    type: 'feedback',
    url: 'https://example.com/search?q=a%20b&tag=caf%C3%A9&x=1&y=2',
    text: 'line one\nline two\t"quoted" — café ☺ 😀 ́ end',
    submittedAt: '2026-01-02T03:04:05.678Z',
  });
  await saveEntry(store, gnarly);

  const { body } = await read(store);

  assert.deepStrictEqual(body.entries[0], gnarly);
  assert.equal(body.entries[0].text, gnarly.text);
  assert.equal(body.entries[0].url, gnarly.url);
});

test('multiple entries come back oldest-first (insertion order)', async () => {
  const store = createEntryStore();
  const a = entry({ url: 'https://example.com/1', text: 'first' });
  const b = entry({ type: 'feedback', url: 'https://example.com/2', text: 'second' });
  const c = entry({ url: 'https://example.com/3', text: 'third' });
  for (const e of [a, b, c]) await saveEntry(store, e);

  const { body } = await read(store);

  assert.equal(body.count, 3);
  assert.deepStrictEqual(body.entries, [a, b, c]);
});

test('an empty store retrieves as a 200 feed with count 0 and entries []', async () => {
  const store = createEntryStore();

  const { status, body } = await read(store);

  assert.equal(status, 200);
  assert.equal(body.count, 0);
  assert.deepStrictEqual(body.entries, []);
});

test('the feed envelope is a stable, versioned shape and never exposes id', async () => {
  const store = createEntryStore();
  await saveEntry(store, entry());

  const { body } = await read(store);

  assert.equal(body.schemaVersion, 1);
  assert.equal(body.gate, 'backstage');
  assert.equal(body.count, body.entries.length);
  // Only the four public contract fields leave the seam — no storage-private id.
  assert.deepStrictEqual(Object.keys(body.entries[0]).sort(), [
    'submittedAt',
    'text',
    'type',
    'url',
  ]);
  assert.equal('id' in body.entries[0], false);
  assert.equal('completedAt' in body.entries[0], false);
});

test('a missing passcode is rejected (401) and no entries are listed', async () => {
  const store = createEntryStore();
  await saveEntry(store, entry());

  const { status, body } = await read(store, { passcode: undefined });

  assert.equal(status, 401);
  // The denial body is the gate's; the store is never listed, so nothing leaks.
  assert.equal('entries' in body, false);
  assert.equal(body.gate, 'backstage');
});

test('a wrong passcode is rejected (403) and no entries are listed', async () => {
  const store = createEntryStore();
  await saveEntry(store, entry());

  const { status, body } = await read(store, { passcode: 'not-the-passcode' });

  assert.equal(status, 403);
  assert.equal('entries' in body, false);
});

test('a blank server passcode fails closed (500 misconfigured), not open', async () => {
  const store = createEntryStore();
  await saveEntry(store, entry());

  const { status, body } = await read(store, { configured: '' });

  assert.equal(status, 500);
  assert.equal('entries' in body, false);
});

test('a correct passcode with no bound store is a safe 500, checked after the gate', async () => {
  // Gate passes (correct passcode) but the binding is absent → server misconfiguration,
  // surfaced as a safe 500 with no leaked value and no entries.
  const res = await readBackstageFeed({
    request: req(PASSCODE),
    configured: PASSCODE,
    db: undefined,
  });
  const body = await res.json();

  assert.equal(res.status, 500);
  assert.equal(body.error, 'store_unavailable');
  assert.equal('entries' in body, false);
});

test('access is account-free: the shared passcode is the only credential and no session is issued', async () => {
  const store = createEntryStore();
  await saveEntry(store, entry());

  // A bare GET with only the shared passcode header — no cookie, no auth token, no user
  // record on either side — retrieves the feed.
  const { res, status } = await read(store);

  assert.equal(status, 200);
  // The seam issues no session artifact: it does not set a cookie or hand back identity.
  assert.equal(res.headers.get('set-cookie'), null);
});
