// Portable contracts shared by the backstage form, HTTP edges, persistence, and
// agent retrieval seam. Callers at untrusted boundaries still own runtime
// validation; this module pins the values and field shapes they validate into.

export const BACKSTAGE_ENTRY_TYPES = ['reference', 'feedback'] as const;

export type BackstageEntryType = (typeof BACKSTAGE_ENTRY_TYPES)[number];

// The complete public shape of a persisted entry. `id` is the stable D1 row
// handle; null `completedAt` is the single incomplete state.
export interface BackstageEntry {
  id: number;
  type: BackstageEntryType;
  url: string;
  text: string;
  submittedAt: string;
  completedAt: string | null;
}

// Insert-ready data does not pretend to know fields owned by persistence and
// management. D1 assigns `id`; migration 0002 supplies null `completedAt`.
export type NewBackstageEntry = Omit<BackstageEntry, 'id' | 'completedAt'>;
