
import { GoogleGenAI, Type } from "@google/genai";
import { WorkoutSession } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeWorkoutProgress = async (history: WorkoutSession[]) => {
  if (history.length === 0) return "Start a workout to get AI-powered insights!";

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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble analyzing your progress right now, but keep up the great work!";
  }
};
