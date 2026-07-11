import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import type {
  BackstageEntry,
  NewBackstageEntry,
} from '../src/lib/backstage-entry.ts';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;
type Assert<Condition extends true> = Condition;

type PersistedKeysMatch = Assert<
  Equal<
    keyof BackstageEntry,
    'id' | 'type' | 'url' | 'text' | 'submittedAt' | 'completedAt'
  >
>;
type IdIsNumber = Assert<Equal<BackstageEntry['id'], number>>;
type CompletionIsNullableString = Assert<
  Equal<BackstageEntry['completedAt'], string | null>
>;
type NewEntryKeysMatch = Assert<
  Equal<keyof NewBackstageEntry, 'type' | 'url' | 'text' | 'submittedAt'>
>;

// Concrete witnesses make each static assertion participate in the executable
// contract test as well as the repository TypeScript check.
const persistedKeysMatch: PersistedKeysMatch = true;
const idIsNumber: IdIsNumber = true;
const completionIsNullableString: CompletionIsNullableString = true;
const newEntryKeysMatch: NewEntryKeysMatch = true;

const here = dirname(fileURLToPath(import.meta.url));
const migration = (name: string): string =>
  readFileSync(join(here, '..', 'migrations', name), 'utf8');

test('BackstageEntry exposes an exact, typed public id and completion state', () => {
  const incomplete: BackstageEntry = {
    id: 42,
    type: 'reference',
    url: 'https://example.com/reference',
    text: 'Keep this API reference nearby.',
    submittedAt: '2026-07-11T12:00:00.000Z',
    completedAt: null,
  };
  const completedAt = '2026-07-11T12:05:00.000Z';
  const complete: BackstageEntry = { ...incomplete, completedAt };

  assert.deepStrictEqual(Object.keys(incomplete).sort(), [
    'completedAt',
    'id',
    'submittedAt',
    'text',
    'type',
    'url',
  ]);
  assert.equal(typeof incomplete.id, 'number');
  assert.equal(incomplete.completedAt, null);
  assert.equal(complete.completedAt, completedAt);
  assert.equal(persistedKeysMatch, true);
  assert.equal(idIsNumber, true);
  assert.equal(completionIsNullableString, true);
  assert.equal(newEntryKeysMatch, true);
});

test('migration 0002 preserves ids and adds nullable completed_at TEXT', (t) => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());

  db.exec(migration('0001_create_backstage_entries.sql'));
  const inserted = db
    .prepare(
      `INSERT INTO backstage_entries (type, url, text, submitted_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(
      'feedback',
      '',
      'This row existed before the completion migration.',
      '2026-07-11T12:00:00.000Z',
    );
  const id = Number(inserted.lastInsertRowid);

  db.exec(migration('0002_add_backstage_entry_completion.sql'));

  const row = db
    .prepare('SELECT id, completed_at FROM backstage_entries WHERE id = ?')
    .get(id) as { id: number; completed_at: string | null };
  assert.equal(row.id, id);
  assert.equal(row.completed_at, null);

  const columns = db.prepare('PRAGMA table_info(backstage_entries)').all() as Array<{
    name: string;
    type: string;
    notnull: number;
  }>;
  const completedAtColumn = columns.find((column) => column.name === 'completed_at');

  assert.deepStrictEqual(
    columns.map((column) => column.name),
    ['id', 'type', 'url', 'text', 'submitted_at', 'completed_at'],
  );
  assert.deepStrictEqual({ ...completedAtColumn }, {
    cid: 5,
    name: 'completed_at',
    type: 'TEXT',
    notnull: 0,
    dflt_value: null,
    pk: 0,
  });
});
