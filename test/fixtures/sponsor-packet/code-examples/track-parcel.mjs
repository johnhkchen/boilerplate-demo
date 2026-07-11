// Fernway Parcel sample code — fictional sponsor material inside the sample
// sponsor packet fixture. Nothing in this repo imports or executes this file;
// it exists as the "GitHub examples" intake class for playbook rehearsals.
//
// Usage (against a local stub of the sandbox — the real host never resolves):
//   FERNWAY_API_TOKEN=<your throwaway token> \
//   FERNWAY_BASE_URL=http://127.0.0.1:8788/v1 \
//   node track-parcel.mjs FW-2417-DEMO

import { createHash } from 'node:crypto';

const BASE_URL =
  process.env.FERNWAY_BASE_URL ?? 'https://api.fernway-parcel.example/v1';
const token = process.env.FERNWAY_API_TOKEN;
const parcelId = process.argv[2] ?? 'FW-2417-DEMO';

if (!token) {
  console.error('set FERNWAY_API_TOKEN (any non-empty value works on the stub)');
  process.exit(2);
}

const response = await fetch(`${BASE_URL}/parcels/${parcelId}`, {
  headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  signal: AbortSignal.timeout(5_000), // never wait forever on the scan network
});

if (!response.ok) {
  const body = await response.json().catch(() => ({}));
  console.error(`fernway: ${response.status} ${body.error ?? 'unexpected'}`);
  process.exit(1);
}

const parcel = await response.json();

// Verify the scan checksum before trusting the event (see api docs, v1).
const expected = createHash('sha256')
  .update(
    `${parcel.parcelId}:${parcel.lastScan.scannedAt}:${parcel.lastScan.event}`,
  )
  .digest('hex');

if (parcel.checksum !== expected) {
  console.error('fernway: checksum mismatch — do not display this scan');
  process.exit(1);
}

console.log(
  `${parcel.parcelId} is ${parcel.status}: ${parcel.lastScan.event} at ` +
    `${parcel.lastScan.location} (${parcel.lastScan.scannedAt}) ✓ verified`,
);
