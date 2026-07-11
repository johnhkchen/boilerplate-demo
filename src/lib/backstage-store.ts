// The write/list data layer for backstage entries, kept pure and framework-free like
// receipt.ts / passcode.ts / operation-runner.ts: the core takes its dependency — the
// D1 database handle — as an argument and never imports Astro, Cloudflare, or reads
// env. The HTTP edge (T-003-02-01) owns Cloudflare's `env.BACKSTAGE_DB` binding and
// passes it in, so this module stays unit-testable against any store that speaks the
// small D1 surface below.
//
// Physical snake_case -> public camelCase mapping lives in exactly one place
// (`rowToEntry`) so the persisted six-field contract cannot drift across callers.

import type {
  BackstageEntry,
  BackstageEntryType,
  NewBackstageEntry,
} from './backstage-entry.ts';

// The minimal slice of the D1 API this module uses. Real `D1Database` is structurally
// assignable to `EntryStoreDatabase` (it has `prepare`; its statement has `bind`/`run`/
// `all`, and `bind` returns the same statement), so production passes the binding in
// with no cast — while tests can supply an in-process store implementing the same shape.
// Defined here so the library and its Node/SQLite tests depend only on the small
// surface they use. The generated CloudflareEnv still exposes the full D1Database.
export interface EntryStoreRunResult {
  // Node's SQLite adapter reports this at the top level.
  changes?: number;
  // D1 reports the same count under metadata.
  meta?: { changes?: number };
}

export interface EntryStoreStatement {
  bind(...values: unknown[]): EntryStoreStatement;
  run(): Promise<EntryStoreRunResult>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface EntryStoreDatabase {
  prepare(query: string): EntryStoreStatement;
}

// The complete persisted row as D1 returns it. Physical timestamp names remain
// snake_case here and are translated only by `rowToEntry`.
interface EntryRow {
  id: number;
  type: string;
  url: string;
  text: string;
  submitted_at: string;
  completed_at: string | null;
}

// Insert only the four public columns; `id` is assigned by the engine (INTEGER PRIMARY
// KEY). Column list is explicit so the positional bind order is unambiguous.
const INSERT_ENTRY_SQL =
  'INSERT INTO backstage_entries (type, url, text, submitted_at) VALUES (?, ?, ?, ?)';

// Select the settled public columns by name (never `SELECT *`, so future physical
// state cannot leak). `ORDER BY id ASC` = insertion order, oldest first: deterministic
// even when `submitted_at` values tie (equal timestamps are allowed by the schema).
// Presentation order (e.g. newest-first) is a view concern for the retrieval seam.
const LIST_ENTRIES_SQL =
  'SELECT id, type, url, text, submitted_at, completed_at FROM backstage_entries ORDER BY id ASC';

const SET_ENTRY_COMPLETION_SQL =
  'UPDATE backstage_entries SET completed_at = ? WHERE id = ?';

const DELETE_ENTRY_SQL = 'DELETE FROM backstage_entries WHERE id = ?';

// Build a fresh object with exactly the complete public persisted contract. No
// physical snake_case name or future private column can escape into output.
function rowToEntry(row: EntryRow): BackstageEntry {
  return {
    id: row.id,
    type: row.type as BackstageEntryType,
    url: row.url,
    text: row.text,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
  };
}

// Normalize the only mutation metadata the domain needs. Real D1 supplies
// `meta.changes`; the in-process Node SQLite adapter supplies top-level `changes`.
function changedExactlyOne(result: EntryStoreRunResult): boolean {
  return (result.meta?.changes ?? result.changes ?? 0) === 1;
}

// Persist one insert-ready entry. Payload validation is the HTTP edge's job
// (T-003-02-01); D1 assigns the id and migration 0002 leaves completion null.
// The migration's CHECK on `type` remains the engine backstop and surfaces as a
// rejected write rather than being swallowed here.
export async function saveEntry(
  db: EntryStoreDatabase,
  entry: NewBackstageEntry,
): Promise<void> {
  await db
    .prepare(INSERT_ENTRY_SQL)
    .bind(entry.type, entry.url, entry.text, entry.submittedAt)
    .run();
}

// Read every stored entry back verbatim, in insertion order, mapped to the public
// contract. Empty store -> []. `bind()` with no arguments keeps a single code path for
// the zero-placeholder query.
export async function listEntries(
  db: EntryStoreDatabase,
): Promise<BackstageEntry[]> {
  const { results } = await db.prepare(LIST_ENTRIES_SQL).bind().all<EntryRow>();
  return results.map(rowToEntry);
}

// Set the addressed row's current completion state. The caller owns timestamp
// generation/validation; null is the contract's single incomplete state. The
// boolean lets a higher boundary distinguish an unknown handle without a read race.
export async function setEntryCompletion(
  db: EntryStoreDatabase,
  id: number,
  completedAt: BackstageEntry['completedAt'],
): Promise<boolean> {
  const result = await db
    .prepare(SET_ENTRY_COMPLETION_SQL)
    .bind(completedAt, id)
    .run();
  return changedExactlyOne(result);
}

// Hard-delete exactly the row addressed by its stable primary-key handle. There is
// deliberately no soft-delete or audit trail in this store contract.
export async function deleteEntry(
  db: EntryStoreDatabase,
  id: number,
): Promise<boolean> {
  const result = await db.prepare(DELETE_ENTRY_SQL).bind(id).run();
  return changedExactlyOne(result);
}
