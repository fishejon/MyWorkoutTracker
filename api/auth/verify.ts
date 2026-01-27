import { checkAllowList, getBearerToken, verifyGoogleIdToken } from '../../server/googleAuth.js';
import { ensureAuthSchema, getSql } from '../../server/db.js';

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  send: (body: string) => void;
  json: (body: unknown) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
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
      await sql`
        insert into users (sub, email, last_seen_at)
        values (${user.sub}, ${user.email}, now())
        on conflict (sub)
        do update set
          email = excluded.email,
          last_seen_at = now();
      `;
    } else {
      console.warn('DATABASE_URL/POSTGRES_URL not set; skipping user persistence');
    }

    res.status(200).json({
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
    });
  } catch (err) {
    console.error('verify error', err);
    res.status(401).send('Invalid token');
  }
}
