export interface BoundaryEvidence {
  name: string;
  selector: string;
  pattern: RegExp;
}

export interface BoundaryLandmark {
  heading: string;
  statusSelector: string;
  bodySelector: string;
  evidence: readonly BoundaryEvidence[];
  primaryActionName: string;
}

export interface BoundaryContract<Body> {
  name: string;
  path: string;
  keyEnv: string;
  assertShape(body: unknown): Body;
  verify(key: string, body: Body): Promise<boolean>;
  landmark: BoundaryLandmark;
}

interface ParcelProof {
  service: 'parcel';
  ticket: string;
  proof: string;
}

const TICKET_PATTERN = /^PX-[0-9]{4}$/;
const PROOF_PATTERN = /^[0-9a-f]{64}$/;

function assertParcelShape(body: unknown): ParcelProof {
  if (typeof body !== 'object' || body === null) {
    throw new Error('unexpected parcel proof shape');
  }

  const parcel = body as Record<string, unknown>;
  if (
    parcel.service !== 'parcel' ||
    typeof parcel.ticket !== 'string' ||
    !TICKET_PATTERN.test(parcel.ticket) ||
    typeof parcel.proof !== 'string' ||
    !PROOF_PATTERN.test(parcel.proof)
  ) {
    throw new Error('unexpected parcel proof shape');
  }

  return body as ParcelProof;
}

function hexBytes(value: string): Uint8Array<ArrayBuffer> {
  const pairs = value.match(/[0-9a-f]{2}/g) ?? [];
  const bytes = new Uint8Array(new ArrayBuffer(pairs.length));
  pairs.forEach((pair, index) => {
    bytes[index] = Number.parseInt(pair, 16);
  });
  return bytes;
}

async function verifyParcelProof(
  key: string,
  body: ParcelProof,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  return crypto.subtle.verify(
    'HMAC',
    cryptoKey,
    hexBytes(body.proof),
    encoder.encode(body.ticket),
  );
}

// The unchanged harness imports this stable declaration slot. Its value is a
// deliberately different, throwaway boundary used only in the swap-proof mirror.
export const receiptBoundary: BoundaryContract<ParcelProof> = {
  name: 'parcel-proof',
  path: '/api/parcel-proof',
  keyEnv: 'PARCEL_PROOF_KEY',
  assertShape: assertParcelShape,
  verify: verifyParcelProof,
  landmark: {
    heading: 'Parcel Window',
    statusSelector: '#parcel-status',
    bodySelector: '#parcel-card',
    evidence: [
      {
        name: 'parcel ticket',
        selector: '#parcel-ticket',
        pattern: TICKET_PATTERN,
      },
      {
        name: 'parcel proof',
        selector: '#parcel-proof',
        pattern: PROOF_PATTERN,
      },
    ],
    primaryActionName: 'Check another parcel',
  },
};
