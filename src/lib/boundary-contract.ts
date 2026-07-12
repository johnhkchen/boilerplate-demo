// The one declaration a demo boundary gives to its checks. It joins the server
// operation (identity, route, key, response shape, and verification) to the page
// landmarks that make the result observable. The module stays free of I/O and
// Node-only imports so both check scripts and Playwright support can read it.

import { BOUNDARY_NAME, verifyReceipt } from './receipt.ts';
import type { Receipt } from './receipt.ts';

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

const NONCE_PATTERN = /^[0-9a-f]{32}$/;
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/;
const SHAPE_ERROR = 'unexpected response shape from the boundary';

function assertReceiptShape(body: unknown): Receipt {
  if (typeof body !== 'object' || body === null) {
    throw new Error(SHAPE_ERROR);
  }

  const receipt = body as Record<string, unknown>;
  if (typeof receipt.boundary !== 'string') {
    throw new Error(SHAPE_ERROR);
  }
  if (receipt.boundary !== BOUNDARY_NAME) {
    throw new Error(
      `boundary named "${receipt.boundary}", expected "${BOUNDARY_NAME}"`,
    );
  }

  if (
    typeof receipt.issuedAt !== 'string' ||
    receipt.issuedAt.trim() === '' ||
    typeof receipt.nonce !== 'string' ||
    !NONCE_PATTERN.test(receipt.nonce) ||
    receipt.algorithm !== 'HMAC-SHA256' ||
    typeof receipt.signature !== 'string' ||
    !SIGNATURE_PATTERN.test(receipt.signature) ||
    receipt.keySource !== 'server-env'
  ) {
    throw new Error(SHAPE_ERROR);
  }

  return body as Receipt;
}

export const receiptBoundary: BoundaryContract<Receipt> = {
  name: BOUNDARY_NAME,
  path: '/api/receipt',
  keyEnv: 'DEMO_SIGNING_KEY',
  assertShape: assertReceiptShape,
  verify: verifyReceipt,
  landmark: {
    heading: 'Demo Runway',
    statusSelector: '#receipt-status',
    bodySelector: '#receipt-body',
    evidence: [
      {
        name: 'nonce',
        selector: '#receipt-nonce',
        pattern: NONCE_PATTERN,
      },
      {
        name: 'signature',
        selector: '#receipt-signature',
        pattern: SIGNATURE_PATTERN,
      },
    ],
    primaryActionName: 'Ask for a fresh note',
  },
};
