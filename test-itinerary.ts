import { GoogleGenAI } from "@google/genai";
import { geminiItineraryResponseSchema } from "./src/lib/gemini/schema.ts";

const apiKey = process.env.VITE_GEMINI_API_KEY || "AIzaSyDJtxrgz19sav9oH3Mo8KseRgSCeFUJwd4";
const ai = new GoogleGenAI({ apiKey });

const prompt = `
You are an expert travel planner and local guide. Your task is to generate a realistic and optimal itinerary for a user visiting Tokyo, Japan.

User Preferences:
- Budget: 보통
- Total Available Time: 360 minutes
- Preferred Food/Dining Themes: 현지 로컬 맛집, 트렌디한 카페/디저트
- Preferred Place/Vibe Themes: 필수 랜드마크 & 명소, 문화 / 예술 / 박물관

Instructions:
1. Recommend actual, existing places in Tokyo, Japan that match the preferred themes.
2. The total 'estimatedMinutes' for all places should roughly sum up to 360 minutes, leaving some buffer for travel time.
3. Ensure 'placeName' is the exact name (preferably in the local language or English) that can be found via Google Maps Places API.
4. 'koName' should be the Korean translation of the place name.
5. Provide accurate coordinates ('lat', 'lng') for each place.
6. Return the response as a JSON array strictly following the provided schema. No markdown, no explanations outside the JSON.
`;

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

    console.log("Raw Response:");
    console.log(response.text);

    const data = JSON.parse(response.text || "[]");
    console.log(`\n✅ Valid JSON parsed! Length: ${data.length}`);
    
    // Check for required fields
    data.forEach((place: any, i: number) => {
      console.log(`[${i+1}] ${place.koName} (${place.placeName})`);
      console.log(`    Theme: ${place.theme}`);
      console.log(`    Time: ${place.estimatedMinutes}m, Cost: ${place.estimatedCost}`);
      console.log(`    Coords: ${place.lat}, ${place.lng}`);
      console.log(`    Desc: ${place.description}\n`);
    });

  } catch (err) {
    console.error("❌ Test Failed:", err);
  }
}

runTest();
