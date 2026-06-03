import { z } from "zod";
import { Type } from "@google/genai";

// 클라이언트 사이드에서 사용할 Zod 스키마
export const ItineraryPlaceSchema = z.object({
  order: z.number().int().describe("일정 순서 (1부터 시작)"),
  placeName: z.string().describe("실제 Google Maps에서 검색 가능한 정확한 장소 영문/현지어 명칭 (Places API 검색용)"),
  koName: z.string().describe("장소의 한국어 명칭"),
  category: z.enum(["attraction", "restaurant", "cafe", "shopping", "nature", "culture", "accommodation"]).describe("장소 유형"),
  theme: z.string().describe("사용자가 선택한 테마와의 연관성 (예: 문화 / 예술 / 박물관)"),
  description: z.string().describe("이 장소를 추천하는 이유 및 설명 (한국어)"),
  startTime: z.string().describe("시작 시간 (HH:mm 형식, 예: 09:00)"),
  endTime: z.string().describe("종료 시간 (HH:mm 형식, 예: 10:30)"),
  estimatedMinutes: z.number().int().describe("추천 체류 시간 (분 단위)"),
  estimatedCost: z.string().describe("예상 비용 (사용자 예산 기준에 맞춤)"),
  travelFromPrevMinutes: z.number().int().describe("이전 장소에서 이동 소요 시간 (분). 첫 장소는 숙소에서 출발"),
  travelFromPrevDistance: z.string().describe("이전 장소까지의 거리 (예: 1.2km, 도보 15분)"),
  mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack", "none"]).describe("식사 시간대 구분"),
  lat: z.number().describe("장소의 위도"),
  lng: z.number().describe("장소의 경도")
});

export const ItineraryResponseSchema = z.array(ItineraryPlaceSchema);

export type ItineraryPlace = z.infer<typeof ItineraryPlaceSchema>;

// Gemini API 호출 시 전달할 responseSchema (Type 객체 활용)
export const geminiItineraryResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      order: { type: Type.INTEGER, description: "일정 순서 (1부터 시작)" },
      placeName: { type: Type.STRING, description: "실제 Google Maps에서 검색 가능한 정확한 장소 영문/현지어 명칭 (Places API 검색용)" },
      koName: { type: Type.STRING, description: "장소의 한국어 명칭" },
      category: { type: Type.STRING, description: "장소 유형 (attraction, restaurant, cafe, shopping, nature, culture, accommodation)" },
      theme: { type: Type.STRING, description: "사용자가 선택한 테마와의 연관성 (예: 문화 / 예술 / 박물관)" },
      description: { type: Type.STRING, description: "이 장소를 추천하는 이유 및 설명 (한국어)" },
      startTime: { type: Type.STRING, description: "시작 시간 (HH:mm 형식, 예: 09:00)" },
      endTime: { type: Type.STRING, description: "종료 시간 (HH:mm 형식, 예: 10:30)" },
      estimatedMinutes: { type: Type.INTEGER, description: "추천 체류 시간 (분 단위)" },
      estimatedCost: { type: Type.STRING, description: "예상 비용 (사용자 예산 기준에 맞춤)" },
      travelFromPrevMinutes: { type: Type.INTEGER, description: "이전 장소에서 이동 소요 시간 (분). 첫 장소는 숙소에서 출발" },
      travelFromPrevDistance: { type: Type.STRING, description: "이전 장소까지의 거리 (예: 1.2km, 도보 15분)" },
      mealSlot: { type: Type.STRING, description: "식사 시간대 구분 (breakfast, lunch, dinner, snack, none)" },
      lat: { type: Type.NUMBER, description: "장소의 위도" },
      lng: { type: Type.NUMBER, description: "장소의 경도" }
    },
    required: ["order", "placeName", "koName", "category", "theme", "description", "startTime", "endTime", "estimatedMinutes", "estimatedCost", "travelFromPrevMinutes", "travelFromPrevDistance", "mealSlot", "lat", "lng"]
  }
};

