import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from 'jose';

import {
  ACCESS_ASSERTION_HEADER,
  accessAudience,
  parseAccessConfig,
  stripAccessCredentials,
  verifyAccessRequest,
} from '../src/lib/session-access.ts';

const issuer = 'https://unit-test.cloudflareaccess.com';
const previewAudience = 'preview_audience_00000000000000000000000000000001';
const editorAudience = 'editor_audience_000000000000000000000000000000002';
const config = parseAccessConfig({
  SESSION_ACCESS_TEAM_DOMAIN: issuer,
  SESSION_ACCESS_PREVIEW_AUD: previewAudience,
  SESSION_ACCESS_EDITOR_AUD: editorAudience,
});

const { publicKey, privateKey } = await generateKeyPair('RS256');
const publicJwk = await exportJWK(publicKey);
publicJwk.alg = 'RS256';
publicJwk.kid = 'access-test-key';
publicJwk.use = 'sig';
const getKey = createLocalJWKSet({ keys: [publicJwk] });

async function identityToken({
  audience = previewAudience,
  tokenIssuer = issuer,
  type = 'app',
  email = 'invited@example.test',
  subject = 'identity-subject',
  issuedAt,
  notBefore,
  expiresAt,
} = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ type, ...(email === null ? {} : { email }) })
    .setProtectedHeader({ alg: 'RS256', kid: 'access-test-key', typ: 'JWT' })
    .setIssuer(tokenIssuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt(issuedAt ?? now)
    .setNotBefore(notBefore ?? now - 5)
    .setExpirationTime(expiresAt ?? now + 300)
    .sign(privateKey);
}

function accessRequest(token, headers = {}) {
  return new Request('https://demo-session.example.test/path', {
    headers: { ...headers, [ACCESS_ASSERTION_HEADER]: token },
  });
}

test('Access config accepts a canonical team origin and distinct application audiences', () => {
  assert.deepEqual(config, {
    teamDomain: issuer,
    previewAudience,
    editorAudience,
  });
  assert.equal(accessAudience(config, 'preview'), previewAudience);
  assert.equal(accessAudience(config, 'editor'), editorAudience);
});

test('Access config rejects unsafe origins and invalid or shared audiences', () => {
  const valid = {
    SESSION_ACCESS_TEAM_DOMAIN: issuer,
    SESSION_ACCESS_PREVIEW_AUD: previewAudience,
    SESSION_ACCESS_EDITOR_AUD: editorAudience,
  };
  for (const patch of [
    { SESSION_ACCESS_TEAM_DOMAIN: undefined },
    { SESSION_ACCESS_TEAM_DOMAIN: 'http://unit-test.cloudflareaccess.com' },
    { SESSION_ACCESS_TEAM_DOMAIN: 'https://user@unit-test.cloudflareaccess.com' },
    { SESSION_ACCESS_TEAM_DOMAIN: `${issuer}/path` },
    { SESSION_ACCESS_TEAM_DOMAIN: `${issuer}/` },
    { SESSION_ACCESS_TEAM_DOMAIN: 'https://example.test' },
    { SESSION_ACCESS_PREVIEW_AUD: 'short' },
    { SESSION_ACCESS_PREVIEW_AUD: 'invalid audience value' },
    { SESSION_ACCESS_EDITOR_AUD: previewAudience },
  ]) {
    assert.throws(() => parseAccessConfig({ ...valid, ...patch }));
  }
});

test('valid identity application tokens verify only for their intended surface', async () => {
  const previewToken = await identityToken();
  const preview = await verifyAccessRequest(
    accessRequest(previewToken),
    config,
    'preview',
    { getKey },
  );
  assert.deepEqual(preview, {
    ok: true,
    identity: {
      email: 'invited@example.test',
      subject: 'identity-subject',
    },
  });

  const editorToken = await identityToken({ audience: editorAudience });
  const editor = await verifyAccessRequest(
    accessRequest(editorToken),
    config,
    'editor',
    { getKey },
  );
  assert.equal(editor.ok, true);

  const crossed = await verifyAccessRequest(
    accessRequest(previewToken),
    config,
    'editor',
    { getKey },
  );
  assert.deepEqual(crossed, {
    ok: false,
    reason: 'assertion_verification_failed',
  });
});

test('missing, blank, oversized, and malformed assertions fail closed', async () => {
  const requests = [
    new Request('https://demo-session.example.test'),
    accessRequest('   '),
    accessRequest('x'.repeat(16 * 1024 + 1)),
    accessRequest('not-a-jwt'),
  ];
  for (const request of requests) {
    const result = await verifyAccessRequest(request, config, 'preview', { getKey });
    assert.equal(result.ok, false);
  }
});

test('wrong issuer, expired, and not-yet-valid tokens fail closed', async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const token of [
    await identityToken({ tokenIssuer: 'https://other.cloudflareaccess.com' }),
    await identityToken({ issuedAt: now - 600, notBefore: now - 600, expiresAt: now - 300 }),
    await identityToken({ issuedAt: now, notBefore: now + 300, expiresAt: now + 600 }),
  ]) {
    assert.deepEqual(
      await verifyAccessRequest(accessRequest(token), config, 'preview', { getKey }),
      { ok: false, reason: 'assertion_verification_failed' },
    );
  }
});

test('non-RS256 assertions are rejected', async () => {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ type: 'app', email: 'invited@example.test' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(issuer)
    .setAudience(previewAudience)
    .setSubject('identity-subject')
    .setIssuedAt(now)
    .setNotBefore(now - 5)
    .setExpirationTime(now + 300)
    .sign(new TextEncoder().encode('unit-test-only-signing-key-32bytes'));
  assert.deepEqual(
    await verifyAccessRequest(accessRequest(token), config, 'preview', { getKey }),
    { ok: false, reason: 'assertion_verification_failed' },
  );
});

test('service, organization, and incomplete identity claim shapes are rejected', async () => {
  for (const token of [
    await identityToken({ email: null }),
    await identityToken({ subject: '' }),
    await identityToken({ type: 'org' }),
  ]) {
    assert.deepEqual(
      await verifyAccessRequest(accessRequest(token), config, 'preview', { getKey }),
      { ok: false, reason: 'invalid_identity_claims' },
    );
  }
});

test('verification failures never echo the assertion or identity', async () => {
  const token = await identityToken({ audience: editorAudience });
  const result = await verifyAccessRequest(
    accessRequest(token),
    config,
    'preview',
    { getKey },
  );
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, new RegExp(token.replaceAll('.', '\\.')));
  assert.doesNotMatch(serialized, /invited@example\.test/);
});

test('credential stripping removes Access headers and cookie while preserving request state', () => {
  const request = new Request('https://demo-session.example.test/socket', {
    headers: {
      [ACCESS_ASSERTION_HEADER]: 'signed.assertion.value',
      'Cf-Access-Authenticated-User-Email': 'untrusted@example.test',
      Cookie: 'theme=dark; CF_Authorization=browser.jwt; session=kept',
      Upgrade: 'websocket',
      'Sec-WebSocket-Protocol': 'vite-hmr',
      'X-Application': 'kept',
    },
  });
  const sanitized = stripAccessCredentials(request);
  assert.equal(sanitized.url, request.url);
  assert.equal(sanitized.method, 'GET');
  assert.equal(sanitized.headers.get(ACCESS_ASSERTION_HEADER), null);
  assert.equal(sanitized.headers.get('cf-access-authenticated-user-email'), null);
  assert.equal(sanitized.headers.get('cookie'), 'theme=dark; session=kept');
  assert.equal(sanitized.headers.get('upgrade'), 'websocket');
  assert.equal(sanitized.headers.get('sec-websocket-protocol'), 'vite-hmr');
  assert.equal(sanitized.headers.get('x-application'), 'kept');
});

test('credential stripping removes an only Access cookie and preserves similar names', () => {
  const onlyAccess = stripAccessCredentials(
    new Request('https://example.test', {
      headers: { Cookie: 'cF_aUtHoRiZaTiOn=value' },
    }),
  );
  assert.equal(onlyAccess.headers.get('cookie'), null);

  const similar = stripAccessCredentials(
    new Request('https://example.test', {
      headers: { Cookie: 'CF_Authorization_backup=kept; other=value' },
    }),
  );
  assert.equal(
    similar.headers.get('cookie'),
    'CF_Authorization_backup=kept; other=value',
  );
});
