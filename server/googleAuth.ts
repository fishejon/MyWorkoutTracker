import { OAuth2Client } from 'google-auth-library';

type VercelRequestLike = {
  headers: Record<string, string | string[] | undefined>;
};

export type VerifiedGoogleUser = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  hostedDomain?: string;
};

export function getGoogleClientId(): string | null {
  return (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    null
  );
}

export function getBearerToken(req: VercelRequestLike): string | null {
  const raw = req.headers.authorization ?? req.headers.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error('Missing GOOGLE_CLIENT_ID (or VITE_GOOGLE_CLIENT_ID)');

  const oauth = new OAuth2Client(clientId);
  const ticket = await oauth.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) throw new Error('Missing Google payload fields');

  const emailVerified = payload.email_verified === true;

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified,
    name: payload.name || undefined,
    picture: payload.picture || undefined,
    hostedDomain: ('hd' in payload && typeof (payload as { hd?: string }).hd === 'string') ? (payload as { hd: string }).hd : undefined,
  };
}

export function checkAllowList(user: VerifiedGoogleUser): void {
  const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN;
  const allowedEmails = (process.env.ALLOWED_GOOGLE_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (allowedDomain && user.hostedDomain !== allowedDomain) {
    throw new Error('Account not in allowed domain');
  }

  if (allowedEmails.length > 0 && !allowedEmails.includes(user.email)) {
    throw new Error('Account not allowed');
  }
}
