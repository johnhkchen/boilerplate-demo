import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';

import type { ProxyTarget } from './session-lifecycle';

export const ACCESS_ASSERTION_HEADER = 'cf-access-jwt-assertion';
const ACCESS_EMAIL_HEADER = 'cf-access-authenticated-user-email';
const ACCESS_COOKIE = 'cf_authorization';
const MAX_ASSERTION_CHARACTERS = 16 * 1024;
const MIN_AUDIENCE_CHARACTERS = 16;
const MAX_AUDIENCE_CHARACTERS = 256;

type AccessConfigInput = {
  SESSION_ACCESS_TEAM_DOMAIN?: unknown;
  SESSION_ACCESS_PREVIEW_AUD?: unknown;
  SESSION_ACCESS_EDITOR_AUD?: unknown;
};

export type AccessSurface = ProxyTarget;

export type AccessConfig = {
  teamDomain: string;
  previewAudience: string;
  editorAudience: string;
};

export type AccessIdentity = {
  email: string;
  subject: string;
};

export type AccessVerification =
  | { ok: true; identity: AccessIdentity }
  | { ok: false; reason: string };

type VerifyAccessOptions = {
  getKey?: JWTVerifyGetKey;
};

function requiredString(value: unknown, binding: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${binding} must be configured`);
  }
  if (value !== value.trim()) {
    throw new Error(`${binding} must not contain surrounding whitespace`);
  }
  return value;
}

function parseTeamDomain(value: unknown): string {
  const binding = 'SESSION_ACCESS_TEAM_DOMAIN';
  const raw = requiredString(value, binding);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${binding} must be a canonical HTTPS origin`);
  }
  const isAccessHostname =
    url.hostname !== 'cloudflareaccess.com' &&
    url.hostname.endsWith('.cloudflareaccess.com');
  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.port !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== '' ||
    !isAccessHostname ||
    raw !== url.origin
  ) {
    throw new Error(`${binding} must be a canonical https://<team>.cloudflareaccess.com origin`);
  }
  return url.origin;
}

function parseAudience(value: unknown, binding: string): string {
  const audience = requiredString(value, binding);
  if (
    audience.length < MIN_AUDIENCE_CHARACTERS ||
    audience.length > MAX_AUDIENCE_CHARACTERS ||
    !/^[A-Za-z0-9_-]+$/.test(audience)
  ) {
    throw new Error(`${binding} must be a valid Access application audience tag`);
  }
  return audience;
}

export function parseAccessConfig(input: AccessConfigInput): AccessConfig {
  const teamDomain = parseTeamDomain(input.SESSION_ACCESS_TEAM_DOMAIN);
  const previewAudience = parseAudience(
    input.SESSION_ACCESS_PREVIEW_AUD,
    'SESSION_ACCESS_PREVIEW_AUD',
  );
  const editorAudience = parseAudience(
    input.SESSION_ACCESS_EDITOR_AUD,
    'SESSION_ACCESS_EDITOR_AUD',
  );
  if (previewAudience === editorAudience) {
    throw new Error('preview and editor Access application audiences must differ');
  }
  return { teamDomain, previewAudience, editorAudience };
}

export function accessAudience(
  config: AccessConfig,
  surface: AccessSurface,
): string {
  return surface === 'preview'
    ? config.previewAudience
    : config.editorAudience;
}

export async function verifyAccessRequest(
  request: Request,
  config: AccessConfig,
  surface: AccessSurface,
  options: VerifyAccessOptions = {},
): Promise<AccessVerification> {
  const assertion = request.headers.get(ACCESS_ASSERTION_HEADER);
  if (
    assertion === null ||
    assertion.trim() === '' ||
    assertion.length > MAX_ASSERTION_CHARACTERS
  ) {
    return { ok: false, reason: 'missing_or_invalid_assertion' };
  }

  const getKey =
    options.getKey ??
    createRemoteJWKSet(
      new URL('/cdn-cgi/access/certs', `${config.teamDomain}/`),
    );
  try {
    const { payload } = await jwtVerify(assertion, getKey, {
      algorithms: ['RS256'],
      audience: accessAudience(config, surface),
      issuer: config.teamDomain,
      requiredClaims: ['aud', 'exp', 'iat', 'iss', 'nbf', 'sub'],
    });
    if (
      payload.type !== 'app' ||
      typeof payload.email !== 'string' ||
      payload.email.trim() === '' ||
      typeof payload.sub !== 'string' ||
      payload.sub.trim() === ''
    ) {
      return { ok: false, reason: 'invalid_identity_claims' };
    }
    return {
      ok: true,
      identity: { email: payload.email, subject: payload.sub },
    };
  } catch {
    return { ok: false, reason: 'assertion_verification_failed' };
  }
}

function withoutAccessCookie(cookieHeader: string): string | null {
  const remaining = cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => {
      if (pair === '') return false;
      const equals = pair.indexOf('=');
      const name = (equals === -1 ? pair : pair.slice(0, equals)).trim();
      return name.toLowerCase() !== ACCESS_COOKIE;
    });
  return remaining.length === 0 ? null : remaining.join('; ');
}

export function stripAccessCredentials(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.delete(ACCESS_ASSERTION_HEADER);
  headers.delete(ACCESS_EMAIL_HEADER);
  const cookie = headers.get('cookie');
  if (cookie !== null) {
    const sanitized = withoutAccessCookie(cookie);
    if (sanitized === null) headers.delete('cookie');
    else headers.set('cookie', sanitized);
  }
  return new Request(request, { headers });
}
