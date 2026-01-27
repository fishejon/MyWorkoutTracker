import { GoogleGenAI } from '@google/genai';
import { checkAllowList, getBearerToken, verifyGoogleIdToken } from '../server/googleAuth';

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

  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    res.status(500).send('Missing GEMINI_API_KEY');
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
