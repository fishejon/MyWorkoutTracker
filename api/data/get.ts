import { checkAllowList, getBearerToken, verifyGoogleIdToken } from '../../server/googleAuth.js';
import { ensureAppSchema, getSql } from '../../server/db.js';

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
    if (!sql) {
      res.status(500).send('Database not configured (set DATABASE_URL)');
      return;
    }

    await ensureAppSchema();

    const rows = await sql<{
      circuits: unknown;
      history: unknown;
    }[]>`
      select circuits, history
      from user_data
      where sub = ${user.sub}
    `;

    if (rows.length === 0) {
      res.status(200).json({ circuits: [], history: [] });
      return;
    }

    const row = rows[0];
    res.status(200).json({
      circuits: Array.isArray(row.circuits) ? row.circuits : [],
      history: Array.isArray(row.history) ? row.history : [],
    });
  } catch (err) {
    console.error('data/get error', err);
    res.status(500).send('Server error');
  }
}
