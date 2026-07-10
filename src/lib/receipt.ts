// The exemplar boundary's logic, kept pure and framework-free so it can be unit
// tested and reused (e.g. by the story's traced-operation runner / ops-check)
// without importing Astro. It never reads env and never holds a key beyond the
// argument passed in — the HTTP layer (src/pages/api/receipt.ts) owns env access.
//
// What it proves: given a server-only key, it produces a "receipt" — a fresh
// payload plus an HMAC-SHA256 signature over that payload. A browser can hold the
// receipt but cannot forge the signature without the key, so the signature is
// standing evidence the server used a secret the client never sees.

export const BOUNDARY_NAME = 'receipt';

export interface Receipt {
  boundary: string; // BOUNDARY_NAME — stable handle for tracing / ops-check
  issuedAt: string; // ISO 8601, per request
  nonce: string; // hex (16 random bytes), per request → each call is unique
  algorithm: 'HMAC-SHA256';
  signature: string; // hex HMAC over canonicalMessage(receipt)
  keySource: 'server-env'; // names the source; never the value
}

// Injectors let tests pin time and randomness for a deterministic signature.
export interface MakeReceiptOptions {
  now?: () => number; // ms since epoch; defaults to Date.now()
  randomBytes?: (n: number) => Uint8Array; // defaults to crypto.getRandomValues
}

// The exact bytes that get signed. Binding the signature to boundary+issuedAt+
// nonce means the signature covers the whole response — no field can be swapped
// without invalidating it.
export function canonicalMessage(
  r: Pick<Receipt, 'boundary' | 'issuedAt' | 'nonce'>,
): string {
  return `${r.boundary}:${r.issuedAt}:${r.nonce}`;
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

// HMAC-SHA256 a message with a raw string key → hex signature. Web Crypto is
// available identically in the Cloudflare Workers runtime and in Node (dev).
export async function signReceipt(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return toHex(new Uint8Array(sig));
}

// Build a fresh, signed receipt. The returned object never contains the key.
export async function makeReceipt(
  key: string,
  opts: MakeReceiptOptions = {},
): Promise<Receipt> {
  const now = opts.now ?? (() => Date.now());
  const randomBytes =
    opts.randomBytes ?? ((n: number) => crypto.getRandomValues(new Uint8Array(n)));

  const base = {
    boundary: BOUNDARY_NAME,
    issuedAt: new Date(now()).toISOString(),
    nonce: toHex(randomBytes(16)),
  };
  const signature = await signReceipt(key, canonicalMessage(base));

  return {
    ...base,
    algorithm: 'HMAC-SHA256',
    signature,
    keySource: 'server-env',
  };
}

// Recompute and compare — for tests and the ops-check, which hold the key
// out-of-band. Never call this on the client (it would need the key).
export async function verifyReceipt(key: string, r: Receipt): Promise<boolean> {
  const expected = await signReceipt(key, canonicalMessage(r));
  // Length-then-content compare; inputs here are trusted test/ops contexts.
  return expected === r.signature;
}
