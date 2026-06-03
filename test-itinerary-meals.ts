import { GoogleGenAI } from "@google/genai";
import { geminiItineraryResponseSchema } from "./src/lib/gemini/schema.ts";
import { buildItineraryPrompt } from "./src/lib/gemini/itinerary-prompt.ts";

const apiKey = process.env.VITE_GEMINI_API_KEY || "AIzaSyDJtxrgz19sav9oH3Mo8KseRgSCeFUJwd4";
const ai = new GoogleGenAI({ apiKey });

const input = {
  country: "일본",
  city: "오사카",
  foodThemes: ["로컬 맛집"],
  vibeThemes: ["필수 랜드마크 & 명소", "쇼핑"],
  budget: "보통",
  durationMinutes: 720, // 12 hours
  startTime: "10:00",
  includeMeals: true,
  mealPreference: "local" as const,
};

const prompt = buildItineraryPrompt(input);

console.log("=== Generated Prompt ===");
console.log(prompt);
console.log("========================\n");

async function runTest() {
  console.log("Generating itinerary from Gemini...");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: geminiItineraryResponseSchema,
        temperature: 0.2,
      },
    });

    const data = JSON.parse(response.text || "[]");
    console.log(`\n✅ Valid JSON parsed! Length: ${data.length}\n`);
    
    let mealCount = 0;

    data.forEach((place: any, i: number) => {
      console.log(`[${i+1}] ${place.koName} (${place.category})`);
      console.log(`    Time: ${place.startTime} - ${place.endTime}`);
      console.log(`    Meal Slot: ${place.mealSlot}`);
      if (place.mealSlot !== "none" && place.category !== "restaurant" && place.category !== "cafe") {
         console.error(`    ❌ ERROR: Non-food category '${place.category}' has mealSlot '${place.mealSlot}'`);
      }
      if (place.category === "restaurant") {
          mealCount++;
      }
    });

    console.log(`\nTotal Restaurants: ${mealCount}`);
    if (mealCount > 2) {
       console.error(`❌ ERROR: Too many restaurants! Limit was 2, got ${mealCount}`);
    } else {
       console.log(`✅ Restaurant count is within limit (<=2).`);
    }

  } catch (err) {
    console.error("❌ Test Failed:", err);
  }
}

runTest();
