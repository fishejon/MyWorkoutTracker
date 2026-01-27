import { checkAllowList, getBearerToken, verifyGoogleIdToken } from '../../server/googleAuth.js';
import { ensureAuthSchema, getSql } from '../../server/db.js';

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  send: (body: string) => void;
  json: (body: unknown) => void;
};

type EventBody = {
  event?: 'login' | 'logout';
};

function parseBody(body: unknown): EventBody {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as EventBody;
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') return body as EventBody;
  return {};
}

function getHeader(req: VercelRequest, name: string): string | null {
  const raw = req.headers[name.toLowerCase()] ?? req.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { event } = parseBody(req.body);
  if (event !== 'login' && event !== 'logout') {
    res.status(400).send("Invalid body: expected { event: 'login' | 'logout' }");
    return;
  }

  const idToken = getBearerToken(req);
  if (!idToken) {
    res.status(401).send('Missing Authorization: Bearer <id_token>');
    return;
  }

  try {
    const user = await verifyGoogleIdToken(idToken);
    if (!user.emailVerified) {
      res.status(403).send('Unverified Google account');
      return;
    }

    checkAllowList(user);

    const sql = getSql();
    if (sql) {
      await ensureAuthSchema();

      const ip = (getHeader(req, 'x-forwarded-for') || '').split(',')[0].trim() || null;
      const ua = getHeader(req, 'user-agent');

      await sql`
        insert into users (sub, email, last_seen_at, last_login_at, last_logout_at)
        values (
          ${user.sub},
          ${user.email},
          now(),
          ${event === 'login' ? sql`now()` : null},
          ${event === 'logout' ? sql`now()` : null}
        )
        on conflict (sub)
        do update set
          email = excluded.email,
          last_seen_at = now(),
          last_login_at = case when ${event === 'login'} then now() else users.last_login_at end,
          last_logout_at = case when ${event === 'logout'} then now() else users.last_logout_at end;
      `;

      await sql`
        insert into auth_events (sub, email, event, ip, user_agent)
        values (${user.sub}, ${user.email}, ${event}, ${ip}, ${ua});
      `;
    } else {
      console.warn('DATABASE_URL/POSTGRES_URL not set; skipping auth event persistence');
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('auth event error', err);
    res.status(401).send('Invalid token');
  }
}
