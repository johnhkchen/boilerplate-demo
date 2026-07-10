import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { listEntries, saveEntry } from '../src/lib/backstage-store.ts';

const here = dirname(fileURLToPath(import.meta.url));
// Exercise the module against the COMMITTED migration, not a copy — so the schema,
// column names, mapping, and CHECK under test are the real ones T-003-01-01 shipped.
const MIGRATION_SQL = readFileSync(
  join(here, '..', 'migrations', '0001_create_backstage_entries.sql'),
  'utf8',
);

// A real store: SQLite is the very engine D1 runs on, so "byte-for-byte against the
// store" is literal here. The adapter exposes exactly the small D1 surface the module
// uses (prepare -> bind -> run/all), backed by an in-memory database.
function createEntryStore() {
  const db = new DatabaseSync(':memory:');
  db.exec(MIGRATION_SQL);
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

test('a single entry round-trips byte-for-byte through the store', async () => {
  const store = createEntryStore();
  const one = entry();

  await saveEntry(store, one);
  const read = await listEntries(store);

  assert.deepStrictEqual(read, [one]);
});

test('multiple entries come back in insertion order (id ASC)', async () => {
  const store = createEntryStore();
  const a = entry({ url: 'https://example.com/1', text: 'first' });
  const b = entry({ type: 'feedback', url: 'https://example.com/2', text: 'second' });
  const c = entry({ url: 'https://example.com/3', text: 'third' });

  for (const e of [a, b, c]) await saveEntry(store, e);

  assert.deepStrictEqual(await listEntries(store), [a, b, c]);
});

test('hard content — newlines, Unicode, quotes, query strings — survives exactly', async () => {
  const store = createEntryStore();
  const gnarly = entry({
    url: 'https://example.com/search?q=a%20b&tag=caf%C3%A9&x=1&y=2',
    text: 'line one\nline two\t"quoted" — café ☺ 😀 ́ end',
    submittedAt: '2026-01-02T03:04:05.678Z',
  });

  await saveEntry(store, gnarly);
  const [read] = await listEntries(store);

  assert.deepStrictEqual(read, gnarly);
  // Explicit byte assertions so a silent normalization would be obvious.
  assert.equal(read.text, gnarly.text);
  assert.equal(read.url, gnarly.url);
});

test('both entry types persist with their discriminator intact', async () => {
  const store = createEntryStore();
  const ref = entry({ type: 'reference', text: 'a link worth keeping' });
  const fb = entry({ type: 'feedback', text: 'the flow felt slow' });

  await saveEntry(store, ref);
  await saveEntry(store, fb);

  const read = await listEntries(store);
  assert.deepStrictEqual(read.map((e) => e.type), ['reference', 'feedback']);
  assert.deepStrictEqual(read, [ref, fb]);
});

test('equal timestamps and duplicate url/text are all kept, ordered by insertion', async () => {
  const store = createEntryStore();
  const first = entry({ text: 'identical', url: 'https://dup.example', submittedAt: 'same' });
  const second = entry({ text: 'identical', url: 'https://dup.example', submittedAt: 'same' });

  await saveEntry(store, first);
  await saveEntry(store, second);

  const read = await listEntries(store);
  assert.equal(read.length, 2);
  assert.deepStrictEqual(read, [first, second]);
});

test('an empty store lists as [] (not null/undefined)', async () => {
  const store = createEntryStore();
  assert.deepStrictEqual(await listEntries(store), []);
});

test('returned entries expose exactly the four public fields — no id, no submitted_at', async () => {
  const store = createEntryStore();
  await saveEntry(store, entry());

  const [read] = await listEntries(store);
  assert.deepStrictEqual(Object.keys(read).sort(), ['submittedAt', 'text', 'type', 'url']);
  assert.equal('id' in read, false);
  assert.equal('submitted_at' in read, false);
});

test('an out-of-contract type is rejected by the store and nothing is written', async () => {
  const store = createEntryStore();
  // Force a value the TS type forbids past the boundary to prove the migration's
  // CHECK is the last-line guard and the module surfaces (not swallows) the rejection.
  const bogus = { ...entry(), type: 'other' };

  await assert.rejects(saveEntry(store, /** @type {any} */ (bogus)));
  assert.deepStrictEqual(await listEntries(store), []);
});
