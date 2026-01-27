
import { WorkoutSession } from "../types";

type AnalyzeResponse = {
  text: string;
};

export const analyzeWorkoutProgress = async (
  history: WorkoutSession[],
  idToken: string | null
) => {
  if (history.length === 0) return "Start a workout to get AI-powered insights!";
  if (!idToken) return "Sign in to view AI-powered insights.";

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ history }),
    });

    if (!response.ok) {
      const msg = await response.text().catch(() => '');
      console.error('AI API error:', response.status, msg);
      return "I'm having trouble analyzing your progress right now, but keep up the great work!";
    }

    const data = (await response.json()) as AnalyzeResponse;
    return data.text;
  } catch (error) {
    console.error('AI API error:', error);
    return "I'm having trouble analyzing your progress right now, but keep up the great work!";
  }
};
