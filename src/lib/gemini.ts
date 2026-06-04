import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI, Type } from "@google/genai";
import { getServerConfig } from "./config.server";
import { supabase } from "./supabase";
import { z } from "zod";

export const translateCitiesFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ country: z.string(), cities: z.array(z.string()) }))
  .handler(async ({ data: { country, cities } }) => {
    if (!cities || cities.length === 0) return [];
    
    try {
      // 1. Supabase 罹먯떆 ?뺤씤
      const { data: cached, error: fetchError } = await supabase
        .from("city_translations_cache")
        .select("translations")
        .eq("country_code", country)
        .maybeSingle();

      if (cached && cached.translations) {
        return cached.translations as { en: string; ko: string }[];
      }

      // 2. 罹먯떆 ?놁쑝硫?Gemini API濡?踰덉뿭 吏꾪뻾
      const config = getServerConfig();
      const apiKey = config.geminiApiKey;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following city names to Korean. Return a valid JSON array of strings corresponding to the exact order of the input array.
Input:
${JSON.stringify(cities)}
`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          temperature: 0.1,
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      
      const translated: string[] = JSON.parse(text);
      
      const result = cities.map((c, i) => ({
        en: c,
        ko: translated[i] || c
      }));

      // Supabase?????(await ?섏? ?딄퀬 諛깃렇?쇱슫?쒖뿉??????쒕룄)
      supabase.from("city_translations_cache").insert({
        country_code: country,
        translations: result,
      }).then(({ error }) => {
        if (error) console.error("Failed to save to Supabase:", error);
      });

      return result;
    } catch (error) {
      console.error("Gemini Translation Error:", error);
      throw new Error("Failed to translate cities");
    }
  });

export const chatFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      history: z.array(
        z.object({
          role: z.enum(["user", "model"]),
          text: z.string(),
        }),
      ),
      message: z.string(),
    }),
  )
  .handler(async ({ data: { history, message } }) => {
    try {
      const config = getServerConfig();
      const apiKey = config.geminiApiKey;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const contents = history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

      contents.push({
        role: "user",
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction: `당신은 'DiploLife'의 체류 생활 상담 AI 어시스턴트입니다. 해외 체류자 및 여행객들의 긴급 상황, 비자, 생활 관련 질문에 대해 친절하고 전문적으로 답변해 주세요. 확실하지 않은 정보는 추측하지 말고 솔직하게 모른다고 답변하거나, 공식 공공데이터(영사콜센터 등)를 확인하라고 안내하세요. **중요: 답변 시 마크다운(Markdown) 기호(예: **굵게**, *기울임*, # 제목 등)를 절대 사용하지 말고 오직 일반 텍스트와 줄바꿈, 이모지만을 사용하여 가독성 좋게 답변해 주세요.**`,
        },
      });

      return { text: response.text || "답변을 생성하지 못했습니다." };
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return { text: "죄송합니다, 답변을 생성하는 중 오류가 발생했습니다. 나중에 다시 시도해주세요." };
    }
  });

