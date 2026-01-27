import { OAuth2Client } from 'google-auth-library';
import { GoogleGenAI } from '@google/genai';

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

type AnalyzeRequestBody = {
  history?: unknown;
};

function getBearerToken(req: VercelRequest): string | null {
  const raw = req.headers.authorization ?? req.headers.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function getClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
}

function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

function parseJsonBody(body: unknown): AnalyzeRequestBody {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as AnalyzeRequestBody;
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') return body as AnalyzeRequestBody;
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const clientId = getClientId();
  const apiKey = getGeminiApiKey();

  if (!clientId) {
    res.status(500).send('Missing GOOGLE_CLIENT_ID (or VITE_GOOGLE_CLIENT_ID)');
    return;
  }

  if (!apiKey) {
    res.status(500).send('Missing GEMINI_API_KEY');
    return;
  }

  const idToken = getBearerToken(req);
  if (!idToken) {
    res.status(401).send('Missing Authorization: Bearer <id_token>');
    return;
  }

  const oauth = new OAuth2Client(clientId);
  try {
    const ticket = await oauth.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified !== true) {
      res.status(403).send('Unverified Google account');
      return;
    }

    // Optional allow-listing (set these in Vercel env vars)
    const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN;
    const allowedEmails = (process.env.ALLOWED_GOOGLE_EMAILS || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    if (allowedDomain && payload.hd !== allowedDomain) {
      res.status(403).send('Account not in allowed domain');
      return;
    }

    if (allowedEmails.length > 0 && !allowedEmails.includes(payload.email)) {
      res.status(403).send('Account not allowed');
      return;
    }

    const { history } = parseJsonBody(req.body);
    if (!Array.isArray(history)) {
      res.status(400).send('Invalid body: expected { history: WorkoutSession[] }');
      return;
    }

    const recentHistory = history.slice(0, 5);
    const prompt = `
Analyze my recent workout history and provide a short, encouraging summary of my progress.
History: ${JSON.stringify(recentHistory)}

Focus on:
- Consistency
- Strength improvements (if weights increased)
- Areas to focus on next.
Keep it concise and professional.
`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
      contents: prompt,
    });

    res.status(200).json({ text: response.text });
  } catch (err) {
    console.error('analyze error', err);
    res.status(500).send('AI request failed');
  }
}
