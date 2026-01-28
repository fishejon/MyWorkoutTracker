import { checkAllowList, getBearerToken, verifyGoogleIdToken } from '../../server/googleAuth.js';
import { ensureAppSchema, getSql } from '../../server/db.js';

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

type SaveBody = {
  circuits?: unknown;
  history?: unknown;
};

function parseBody(body: unknown): SaveBody {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as SaveBody;
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') return body as SaveBody;
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    const { circuits, history } = parseBody(req.body);
    if (!Array.isArray(circuits) || !Array.isArray(history)) {
      res.status(400).send('Invalid body: expected { circuits: Circuit[], history: WorkoutSession[] }');
      return;
    }

    // Ensure the user exists in users table (verify route usually handles this).
    await sql`
      insert into users (sub, email, last_seen_at)
      values (${user.sub}, ${user.email}, now())
      on conflict (sub)
      do update set email = excluded.email, last_seen_at = now();
    `;

    await sql`
      insert into user_data (sub, circuits, history, updated_at)
      values (${user.sub}, ${sql.json(circuits)}, ${sql.json(history)}, now())
      on conflict (sub)
      do update set
        circuits = excluded.circuits,
        history = excluded.history,
        updated_at = now();
    `;

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('data/save error', err);
    res.status(500).send('Server error');
  }
}
