import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  GATE_NAME,
  PASSCODE_ENV,
  PASSCODE_HEADER,
  checkPasscode,
  passcodeFromHeaders,
  describeDecision,
  guardPasscode,
} from '../src/lib/passcode.ts';

const SECRET = 'open-sesame-42';

// Build a Request carrying (or not) the passcode header, for the adapter tests.
const requestWith = (passcode) =>
  new Request('https://demo.example/backstage', {
    headers: passcode === undefined ? {} : { [PASSCODE_HEADER]: passcode },
  });

test('correct passcode passes the gate', () => {
  const decision = checkPasscode(SECRET, SECRET);
  assert.equal(decision.allowed, true);
});

test('wrong passcode is rejected 403 (mismatch)', () => {
  const decision = checkPasscode(SECRET, 'not-the-code');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'mismatch');
  assert.equal(decision.status, 403);
});

test('missing passcode is rejected 401 — null, empty, and whitespace all count as missing', () => {
  for (const presented of [null, undefined, '', '   ', '\t\n']) {
    const decision = checkPasscode(SECRET, presented);
    assert.equal(decision.allowed, false, `${JSON.stringify(presented)} → denied`);
    assert.equal(decision.reason, 'missing');
    assert.equal(decision.status, 401);
  }
});

test('blank server passcode fails closed 500 (misconfigured) regardless of what is presented', () => {
  for (const configured of [undefined, null, '', '   ']) {
    // Even a "matching" presented value cannot pass an unset gate.
    const decision = checkPasscode(configured, configured ?? 'anything');
    assert.equal(decision.allowed, false, `${JSON.stringify(configured)} → denied`);
    assert.equal(decision.reason, 'misconfigured');
    assert.equal(decision.status, 500);
  }
});

test('misconfigured is checked before the visitor input, so a broken gate never blames the visitor', () => {
  // No passcode presented AND no server passcode → still reported as misconfigured (500),
  // not missing (401): the server problem takes precedence.
  const decision = checkPasscode('', null);
  assert.equal(decision.reason, 'misconfigured');
  assert.equal(decision.status, 500);
});

test('constantTimeEqual behaviour is exercised through checkPasscode', () => {
  // equal → pass
  assert.equal(checkPasscode('abc', 'abc').allowed, true);
  // same length, one char differs → mismatch
  assert.equal(checkPasscode('abc', 'abd').allowed, false);
  // differing length (one a prefix of the other) → mismatch, not accidental pass
  assert.equal(checkPasscode('abc', 'abcd').allowed, false);
  assert.equal(checkPasscode('abcd', 'abc').allowed, false);
  // exact bytes: trailing/leading whitespace is NOT trimmed away for the compare
  assert.equal(checkPasscode('abc', 'abc ').allowed, false);
});

test('passcodeFromHeaders reads the header, null when absent', () => {
  assert.equal(passcodeFromHeaders(requestWith(SECRET).headers), SECRET);
  assert.equal(passcodeFromHeaders(requestWith(undefined).headers), null);
});

test('describeDecision returns a stable slug + plain-English detail per reason', () => {
  assert.deepEqual(describeDecision({ allowed: false, reason: 'missing', status: 401 }), {
    error: 'passcode_missing',
    detail: 'this backstage door needs the shared passcode',
  });
  assert.equal(
    describeDecision({ allowed: false, reason: 'mismatch', status: 403 }).error,
    'passcode_mismatch',
  );
  assert.equal(
    describeDecision({ allowed: false, reason: 'misconfigured', status: 500 }).error,
    'gate_misconfigured',
  );
});

test('guardPasscode: correct header lets the route proceed (null)', () => {
  assert.equal(guardPasscode(requestWith(SECRET), SECRET), null);
});

test('guardPasscode: wrong header → 403 Response naming the gate', async () => {
  const res = guardPasscode(requestWith('wrong'), SECRET);
  assert.ok(res instanceof Response);
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  const body = await res.json();
  assert.equal(body.gate, GATE_NAME);
  assert.equal(body.error, 'passcode_mismatch');
});

test('guardPasscode: no header → 401 Response', async () => {
  const res = guardPasscode(requestWith(undefined), SECRET);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, 'passcode_missing');
});

test('guardPasscode: blank server passcode → 500 Response', async () => {
  const res = guardPasscode(requestWith(SECRET), '');
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'gate_misconfigured');
});

test('bundle safety: the passcode env var is server-only (not PUBLIC_-prefixed)', () => {
  // A PUBLIC_-prefixed name is the only way Astro/Vite inline a value into client
  // output; DEMO_PASSCODE is not, so the passcode can never reach a browser bundle.
  assert.equal(PASSCODE_ENV, 'DEMO_PASSCODE');
  assert.equal(PASSCODE_ENV.startsWith('PUBLIC_'), false);
});

test('the gate never echoes the passcode it checks against', async () => {
  // Every denial body must be free of the configured value — no oracle by reflection.
  const res = guardPasscode(requestWith('wrong-guess'), SECRET);
  const text = await res.text();
  assert.equal(text.includes(SECRET), false);
});
