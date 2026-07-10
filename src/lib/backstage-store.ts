// The write/list data layer for backstage entries, kept pure and framework-free like
// receipt.ts / passcode.ts / operation-runner.ts: the core takes its dependency — the
// D1 database handle — as an argument and never imports Astro, Cloudflare, or reads
// env. The HTTP edge (T-003-02-01) owns `Astro.locals.runtime.env.BACKSTAGE_DB` and
// passes it in, so this module stays unit-testable against any store that speaks the
// small D1 surface below.
//
// Two mapping duties, pinned by the T-003-01-01 contract:
//   * physical `submitted_at` (snake_case) <-> public `submittedAt` (camelCase);
//   * the storage-private `id` column is never part of a returned entry.
// Both live in exactly one place (rowToEntry) so they cannot drift.

import type { BackstageEntry, BackstageEntryType } from './backstage-entry.ts';

// The minimal slice of the D1 API this module uses. Real `D1Database` is structurally
// assignable to `EntryStoreDatabase` (it has `prepare`; its statement has `bind`/`run`/
// `all`, and `bind` returns the same statement), so production passes the binding in
// with no cast — while tests can supply an in-process store implementing the same shape.
// Defined here, in the repo idiom of libraries owning their own minimal types, because
// the global `D1Database` type is only present when @cloudflare/workers-types is
// installed (it is not). `src/env.d.ts` types the BACKSTAGE_DB binding via this shape.
export interface EntryStoreStatement {
  bind(...values: unknown[]): EntryStoreStatement;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface EntryStoreDatabase {
  prepare(query: string): EntryStoreStatement;
}

// The physical row as D1 returns it: snake_case columns, and only the public ones —
// `id` is deliberately not selected, so it is absent here too.
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
function rowToEntry(row: EntryRow): BackstageEntry {
  return {
    type: row.type as BackstageEntryType,
    url: row.url,
    text: row.text,
    submittedAt: row.submitted_at,
  };
}

// Persist one entry. Trusts a well-typed `BackstageEntry` (payload validation is the
// HTTP edge's job, T-003-02-01); the migration's CHECK on `type` remains the engine
// backstop and surfaces as a rejected write rather than being swallowed here.
export async function saveEntry(
  db: EntryStoreDatabase,
  entry: BackstageEntry,
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
