import { getGenAIClient } from "./gemini";

export interface AIAccidentSummary {
  sections: {
    title: string;
    content: string[];
  }[];
}

export async function generateAccidentSummary(
  country: string,
  rawText?: string | null,
): Promise<AIAccidentSummary | null> {
  if (!rawText || rawText.trim() === "") return null;

  const ai = getGenAIClient();
  const prompt = `
Analyze the following overseas incident and accident information for ${country}.

Return only JSON in this shape. ALL string values (title, content) MUST BE IN KOREAN (한국어). Do NOT use English:
{
  "sections": [
    {
      "title": "주요 위험 사항",
      "content": ["문단 내용 (반드시 한국어로 작성)"]
    }
  ]
}

Requirements:
- Group the information into 2 to 4 sections.
- Use paragraph-style explanations, not numbered instructions.
- Stay within the provided source text and do not invent facts.
- Focus on what a Korean traveler or long-stay resident should understand quickly.
- ALL OUTPUT MUST BE IN KOREAN.

Source text:
${rawText}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText) as AIAccidentSummary;
  } catch (error) {
    console.error("AI accident summary failed:", error);
    return null;
  }
}
