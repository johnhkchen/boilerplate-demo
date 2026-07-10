// The untrusted, client-owned half of a backstage entry. A submission deliberately
// omits `submittedAt`: the HTTP edge stamps accepted input with server time before it
// becomes the canonical BackstageEntry persisted by backstage-store.ts.

import {
  BACKSTAGE_ENTRY_TYPES,
  type BackstageEntry,
  type BackstageEntryType,
} from './backstage-entry.ts';

export const MAX_BACKSTAGE_URL_LENGTH = 2_048;
export const MAX_BACKSTAGE_TEXT_LENGTH = 20_000;

export interface BackstageSubmission {
  type: BackstageEntryType;
  url: string;
  text: string;
}

export type SubmissionValidation =
  | { valid: true; value: BackstageSubmission }
  | { valid: false; issues: string[] };

const EXPECTED_KEYS = ['text', 'type', 'url'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEntryType(value: unknown): value is BackstageEntryType {
  return (
    typeof value === 'string' &&
    (BACKSTAGE_ENTRY_TYPES as readonly string[]).includes(value)
  );
}

// Feedback does not have to be tied to a page, so the empty string is valid. When
// a URL is supplied, keep the portable contract intentionally narrow: browser-safe
// web links only, not javascript:, data:, file:, or provider-specific schemes.
function isSupportedUrl(value: string): boolean {
  if (value === '') return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateBackstageSubmission(
  value: unknown,
): SubmissionValidation {
  if (!isRecord(value)) {
    return { valid: false, issues: ['entry must be a JSON object'] };
  }

  const issues: string[] = [];
  const keys = Object.keys(value).sort();
  if (
    keys.length !== EXPECTED_KEYS.length ||
    keys.some((key, index) => key !== EXPECTED_KEYS[index])
  ) {
    issues.push('entry must contain exactly type, url, and text');
  }

  if (!isEntryType(value.type)) {
    issues.push('type must be reference or feedback');
  }

  if (typeof value.url !== 'string') {
    issues.push('url must be a string');
  } else {
    if (value.url.length > MAX_BACKSTAGE_URL_LENGTH) {
      issues.push(`url must be at most ${MAX_BACKSTAGE_URL_LENGTH} characters`);
    }
    if (!isSupportedUrl(value.url)) {
      issues.push('url must be empty or an http(s) URL');
    }
  }

  if (typeof value.text !== 'string') {
    issues.push('text must be a string');
  } else {
    if (value.text.trim() === '') {
      issues.push('text must not be blank');
    }
    if (value.text.length > MAX_BACKSTAGE_TEXT_LENGTH) {
      issues.push(`text must be at most ${MAX_BACKSTAGE_TEXT_LENGTH} characters`);
    }
  }

  if (issues.length > 0) return { valid: false, issues };

  // All three values were narrowed above. Construct a fresh object so prototypes,
  // accessors, or future private fields on the input cannot cross the boundary.
  return {
    valid: true,
    value: {
      type: value.type as BackstageEntryType,
      url: value.url as string,
      text: value.text as string,
    },
  };
}

export function toBackstageEntry(
  submission: BackstageSubmission,
  submittedAt: string,
): BackstageEntry {
  return {
    type: submission.type,
    url: submission.url,
    text: submission.text,
    submittedAt,
  };
}
