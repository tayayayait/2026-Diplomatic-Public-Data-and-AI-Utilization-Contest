import { GoogleGenAI } from "@google/genai";
import { type ChatMessage, type DashboardState, type UserProfile } from "../state";

let aiClient: GoogleGenAI | null = null;

export function getGenAIClient(): GoogleGenAI {
  if (aiClient) return aiClient;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }

  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

export interface ChatContext {
  profile: UserProfile | null;
  dashboard: DashboardState | null;
  history: ChatMessage[];
  newUserMessage: string;
}

export async function* streamChatResponse(context: ChatContext) {
  const ai = getGenAIClient();
  const profile = context.profile;
  const dashboard = context.dashboard;

  const systemInstruction = `
You are DiploLife AI Copilot. Use Korean public-data context when available, but answer with practical, concise guidance.

Current user context:
- Destination country: ${profile?.country || "unknown"}
- Destination city: ${profile?.city || "unknown"}
- Stay purpose: ${profile?.stayPurpose || "unknown"}
- Visa type: ${profile?.visaType || "unknown"}
- Interests: ${profile?.interests?.join(", ") || "none"}
- Safety level: ${dashboard?.safetyScore.level ?? "unknown"}
- Exchange currency: ${dashboard?.exchangeRate.fromCurrency || "unknown"}

Rules:
1. For emergencies, prioritize contacting the Korean consular call center at +82-2-3210-0404 and local emergency services.
2. Do not invent official facts. Say when confirmed information is unavailable.
3. Keep the answer actionable and specific to the user's destination and purpose.
`;

  const contents = context.history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  contents.push({
    role: "user",
    parts: [{ text: context.newUserMessage }],
  });

  const responseStream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
