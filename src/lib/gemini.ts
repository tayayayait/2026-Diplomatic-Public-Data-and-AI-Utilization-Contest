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

