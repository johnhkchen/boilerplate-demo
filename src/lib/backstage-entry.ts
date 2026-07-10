// Portable contract shared by the backstage form, HTTP edges, persistence, and
// agent retrieval seam. Callers at untrusted boundaries still own runtime
// validation; this module pins the values and field shape they validate into.

export const BACKSTAGE_ENTRY_TYPES = ['reference', 'feedback'] as const;

export type BackstageEntryType = (typeof BACKSTAGE_ENTRY_TYPES)[number];

export interface BackstageEntry {
  type: BackstageEntryType;
  url: string;
  text: string;
  submittedAt: string;
}
