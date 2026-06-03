import { GoogleGenAI } from "@google/genai";

import { getServerConfig } from "../../config.server";
import { enrichLocalItinerary } from "./itinerary-enrichment";
import type { ItineraryContext, LocalItineraryResult } from "./gemini-recommendation";

export async function generateLocalItineraryOnServer(
  context: ItineraryContext,
): Promise<LocalItineraryResult> {
  const config = getServerConfig();
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  const foodPrefsText = context.foodPreferences?.length
    ? context.foodPreferences.join(", ")
    : "상관없음(현지 인기 음식 선호)";

  const placePrefsText = context.placeInterests?.length
    ? context.placeInterests.join(", ")
    : "상관없음(주요 명소 위주)";

  const accommodationText = context.accommodationLocation
    ? `\n- 숙소 위치: ${context.accommodationLocation}`
    : "";

  const prompt = `
당신은 현지 사정에 밝은 여행 가이드이자 로컬 추천 전문가입니다.
사용자의 예산, 체류 기간, 선호도를 바탕으로 **실제로 존재하는** 장소들을 검색하고 조합하여 하루 추천 코스를 제안해주세요.
(Google Search/Maps Grounding을 활용하여 실제 장소명과 평점 정보를 가져와야 합니다.)

[사용자 컨텍스트]
- 지역: ${context.country} ${context.city || ""}${accommodationText}
- 체류 목적: ${context.stayPurpose}
- 전체 예산 (하루 기준이 아님): ${context.totalBudgetKrw.toLocaleString()}원 (총 ${context.stayDays}일 체류)
- 선호 음식: ${foodPrefsText}
- 관심 장소: ${placePrefsText}

위 정보를 바탕으로, 해당 지역에서 하루 동안 즐길 수 있는 추천 코스(오전/오후/저녁)를 구성해 주세요.
숙소 위치가 주어졌다면, 첫 번째 장소는 숙소에서 출발하는 것으로 계산하고 모든 장소 간의 이동 거리와 시간을 현실적으로 고려(travelTimeFromPreviousMinutes)하여 동선을 짜야 합니다. 또한 구글 지도에서 해당 장소가 바로 열리도록 각 장소의 상세 주소(address)를 반드시 포함하고, Google Maps에서 확인 가능한 실제 장소 URL(googleMapsUri) 또는 Google Place ID(googlePlaceId)를 알 수 있을 때만 포함하세요. 확실하지 않으면 googleMapsUri와 googlePlaceId는 생략하세요.

장소별 이동시간, 체류시간, 비용은 Google Maps/Google Places에서 확인 가능한 정보만 근거로 삼으세요.
- 이동시간(travelTimeFromPreviousMinutes)은 확실한 Google Maps 경로 근거가 없으면 0으로 두세요. 서버가 Google Routes 값으로 다시 계산합니다.
- 체류시간(durationMinutes)은 확실한 Google 장소 유형 근거가 없으면 0으로 두세요. 서버가 Google Places 장소 유형으로 다시 판단합니다.
- 예상 비용(estimatedCostKrw)은 확실한 Google 가격 범위나 가격대 근거가 없으면 0으로 두세요. 메뉴 가격·입장료·평균 소비액을 상상해서 만들지 마세요.
- 추천 이유(reason)는 평점, 리뷰 수, 영업시간, 위치, 가격대 등 Google에서 확인 가능한 근거와 연결하세요. 확실하지 않은 가격 설명은 쓰지 마세요.

결과는 반드시 아래와 같은 JSON 구조로만 응답하세요 (마크다운 백틱 제외):
{
  "title": "도쿄 신주쿠 도보 미식 코스",
  "description": "라멘과 카페를 즐기며 신주쿠 주변을 여유롭게 둘러보는 하루 코스입니다.",
  "totalEstimatedCostKrw": 45000,
  "itinerary": [
    {
      "timeOfDay": "Morning",
      "places": [
        {
          "name": "블루보틀 커피 신주쿠 카페",
          "address": "NEWoMan SHINJUKU, 4 Chome-1-6 Shinjuku, Shinjuku City, Tokyo",
          "googleMapsUri": "https://www.google.com/maps/search/?api=1&query=Blue%20Bottle%20Coffee%20Shinjuku%20NEWoMan%20SHINJUKU",
          "type": "cafe",
          "estimatedCostKrw": 0,
          "durationMinutes": 45,
          "travelTimeFromPreviousMinutes": 15,
          "rating": 4.2,
          "description": "신주쿠역 인근에 위치한 유명 스페셜티 커피 전문점",
          "reason": "오전의 여유를 즐기며 맛있는 커피로 하루를 시작하기 좋습니다."
        }
      ]
    }
  ],
  "tips": [
    "숙소에서 신주쿠역까지는 도보로 이동하기 좋은 거리입니다.",
    "블루보틀은 주말 오전에 붐빌 수 있습니다."
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result: LocalItineraryResult = JSON.parse(cleanText);

    return enrichLocalItinerary(result, context, {
      googleApiKey: config.googlePlacesApiKey,
    });
  } catch (error) {
    console.error("Local Itinerary API Error:", error);
    throw new Error("로컬 추천 일정을 생성하는 중 오류가 발생했습니다.");
  }
}
