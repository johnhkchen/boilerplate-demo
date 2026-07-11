// The write/list data layer for backstage entries, kept pure and framework-free like
// receipt.ts / passcode.ts / operation-runner.ts: the core takes its dependency — the
// D1 database handle — as an argument and never imports Astro, Cloudflare, or reads
// env. The HTTP edge (T-003-02-01) owns Cloudflare's `env.BACKSTAGE_DB` binding and
// passes it in, so this module stays unit-testable against any store that speaks the
// small D1 surface below.
//
// Two legacy mapping duties, pinned by the T-003-01-01 contract until the
// management projection lands in T-008-01-02:
//   * physical `submitted_at` (snake_case) <-> public `submittedAt` (camelCase);
//   * the existing four-field read omits persistence-owned state.
// Both live in exactly one place (rowToEntry) so they cannot drift.

import type {
  BackstageEntryType,
  NewBackstageEntry,
} from './backstage-entry.ts';

// The minimal slice of the D1 API this module uses. Real `D1Database` is structurally
// assignable to `EntryStoreDatabase` (it has `prepare`; its statement has `bind`/`run`/
// `all`, and `bind` returns the same statement), so production passes the binding in
// with no cast — while tests can supply an in-process store implementing the same shape.
// Defined here so the library and its Node/SQLite tests depend only on the small
// surface they use. The generated CloudflareEnv still exposes the full D1Database.
export interface EntryStoreStatement {
  bind(...values: unknown[]): EntryStoreStatement;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface EntryStoreDatabase {
  prepare(query: string): EntryStoreStatement;
}

// The current four-field projection as D1 returns it. T-008-01-02 adds the
// settled persisted fields (`id`, `completed_at`) to this row and its mapper.
interface EntryRow {
  type: string;
  url: string;
  text: string;
  submitted_at: string;
}

// Insert only the four public columns; `id` is assigned by the engine (INTEGER PRIMARY
// KEY). Column list is explicit so the positional bind order is unambiguous.
const INSERT_ENTRY_SQL =
  'INSERT INTO backstage_entries (type, url, text, submitted_at) VALUES (?, ?, ?, ?)';

// Select the public columns by name (never `SELECT *`, so `id` cannot leak and column
// identity is pinned). `ORDER BY id ASC` = insertion order, oldest first: deterministic
// even when `submitted_at` values tie (equal timestamps are allowed by the schema).
// Presentation order (e.g. newest-first) is a view concern for the retrieval seam.
const LIST_ENTRIES_SQL =
  'SELECT type, url, text, submitted_at FROM backstage_entries ORDER BY id ASC';

// The single place the snake_case->camelCase mapping and the drop-`id` rule live.
// Builds a fresh object with exactly the four contract fields, so no physical column
// name and no private id can escape into public output.
function rowToEntry(row: EntryRow): NewBackstageEntry {
  return {
    type: row.type as BackstageEntryType,
    url: row.url,
    text: row.text,
    submittedAt: row.submitted_at,
  };
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
): Promise<NewBackstageEntry[]> {
  const { results } = await db.prepare(LIST_ENTRIES_SQL).bind().all<EntryRow>();
  return results.map(rowToEntry);
}
