import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { listEntries } from '../src/lib/backstage-store.ts';
import { handleBackstageEntry } from '../src/lib/backstage-route.ts';
import { PASSCODE_HEADER } from '../src/lib/passcode.ts';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION_0001_SQL = readFileSync(
  join(here, '..', 'migrations', '0001_create_backstage_entries.sql'),
  'utf8',
);
const MIGRATION_0002_SQL = readFileSync(
  join(here, '..', 'migrations', '0002_add_backstage_entry_completion.sql'),
  'utf8',
);
const SECRET = 'open-the-backstage-door';
const ROUTE_URL = 'https://demo.example/api/backstage/entries';

// Keep the route test honest: this is real SQLite running the committed D1
// migrations, surfaced through exactly the small D1 API production code consumes.
function createEntryStore(t) {
  const db = new DatabaseSync(':memory:');
  db.exec(MIGRATION_0001_SQL);
  db.exec(MIGRATION_0002_SQL);
  t.after(() => db.close());

  return {
    prepare(sql) {
      const statement = db.prepare(sql);
      const withParams = (params) => ({
        async run() {
          return statement.run(...params);
        },
        async all() {
          return { results: statement.all(...params) };
        },
        bind(...more) {
          return withParams([...params, ...more]);
        },
      });
      return withParams([]);
    },
  };
}

function postRequest(body, options = {}) {
  const {
    passcode = SECRET,
    contentType = 'application/json; charset=utf-8',
  } = options;
  const headers = {};
  if (passcode !== undefined) headers[PASSCODE_HEADER] = passcode;
  if (contentType !== undefined) headers['content-type'] = contentType;

  return new Request(ROUTE_URL, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function hitRoute(store, request, configured = SECRET) {
  return handleBackstageEntry(request, {
    DEMO_PASSCODE: configured,
    ...(store === undefined ? {} : { BACKSTAGE_DB: store }),
  });
}

const validReference = (overrides = {}) => ({
  type: 'reference',
  url: 'https://example.com/docs?q=route',
  text: 'This API reference belongs in the demo.',
  ...overrides,
});

test('valid passcode + well-formed payload returns 201 and round-trips through the store', async (t) => {
  const store = createEntryStore(t);
  const payload = validReference();

  const response = await hitRoute(store, postRequest(payload));

  assert.equal(response.status, 201);
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  const body = await response.json();
  assert.deepStrictEqual(Object.keys(body), ['entry']);
  assert.deepStrictEqual(
    { type: body.entry.type, url: body.entry.url, text: body.entry.text },
    payload,
  );
  assert.match(body.entry.submittedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(Number.isNaN(Date.parse(body.entry.submittedAt)), false);

  // Read through the production mapper, proving route -> INSERT -> SELECT and
  // every canonical response field agree byte-for-byte.
  assert.deepStrictEqual(await listEntries(store), [
    { id: 1, ...body.entry, completedAt: null },
  ]);
});

test('feedback may omit a page URL by sending the empty string', async (t) => {
  const store = createEntryStore(t);
  const payload = validReference({
    type: 'feedback',
    url: '',
    text: 'The result needs more contrast.\nPlease keep the detail.',
  });

  const response = await hitRoute(store, postRequest(payload));
  assert.equal(response.status, 201);
  const { entry } = await response.json();
  assert.equal(entry.url, '');
  assert.deepStrictEqual(await listEntries(store), [
    { id: 1, ...entry, completedAt: null },
  ]);
});

test('wrong passcode is 403 and writes nothing', async (t) => {
  const store = createEntryStore(t);
  const response = await hitRoute(
    store,
    postRequest(validReference(), { passcode: 'wrong-code' }),
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, 'passcode_mismatch');
  assert.deepStrictEqual(await listEntries(store), []);
});

test('malformed entry is 422, distinct from passcode denial, and writes nothing', async (t) => {
  const store = createEntryStore(t);
  const response = await hitRoute(
    store,
    postRequest({ type: 'other', url: 7, text: 'still not valid' }),
  );

  assert.equal(response.status, 422);
  assert.notEqual(response.status, 403);
  const body = await response.json();
  assert.equal(body.error, 'invalid_entry');
  assert.ok(body.issues.length >= 2);
  assert.deepStrictEqual(await listEntries(store), []);
});

test('server-owned or extra fields are rejected and never persisted', async (t) => {
  const store = createEntryStore(t);
  const payload = {
    ...validReference(),
    submittedAt: '1999-01-01T00:00:00.000Z',
  };

  const response = await hitRoute(store, postRequest(payload));
  assert.equal(response.status, 422);
  assert.match((await response.text()), /exactly type, url, and text/);
  assert.deepStrictEqual(await listEntries(store), []);
});

test('syntactically invalid JSON is 400 and writes nothing', async (t) => {
  const store = createEntryStore(t);
  const response = await hitRoute(store, postRequest('{"type":'));

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'invalid_json');
  assert.deepStrictEqual(await listEntries(store), []);
});

test('a non-JSON request is 415 and writes nothing', async (t) => {
  const store = createEntryStore(t);
  const response = await hitRoute(
    store,
    postRequest('type=reference', { contentType: 'text/plain' }),
  );

  assert.equal(response.status, 415);
  assert.equal((await response.json()).error, 'json_required');
  assert.deepStrictEqual(await listEntries(store), []);
});

test('blank configured passcode fails closed before parsing or writing', async (t) => {
  const store = createEntryStore(t);
  // Even invalid JSON remains a gate misconfiguration because gating is first.
  const response = await hitRoute(store, postRequest('{not json'), '   ');

  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'gate_misconfigured');
  assert.deepStrictEqual(await listEntries(store), []);
});

test('missing database binding returns a safe 500 after valid input', async () => {
  const response = await hitRoute(undefined, postRequest(validReference()));

  assert.equal(response.status, 500);
  assert.deepStrictEqual(await response.json(), {
    boundary: 'backstage_entries',
    error: 'store_misconfigured',
    detail: 'the backstage entry store is not configured',
  });
});

test('store failure returns a safe 500 without leaking database details', async () => {
  const sensitiveMessage = 'SQLITE_SECRET_INTERNAL_TABLE_DETAILS';
  const failingStore = {
    prepare() {
      return {
        bind() {
          return this;
        },
        async run() {
          throw new Error(sensitiveMessage);
        },
        async all() {
          return { results: [] };
        },
      };
    },
  };

  const response = await hitRoute(failingStore, postRequest(validReference()));
  assert.equal(response.status, 500);
  const text = await response.text();
  assert.match(text, /entry_write_failed/);
  assert.equal(text.includes(sensitiveMessage), false);
});
