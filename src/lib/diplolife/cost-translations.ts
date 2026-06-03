export const CATEGORY_KO: Record<string, string> = {
  "Restaurants & Cafes": "Dining",
  "Utilities & Internet": "Utilities",
  Clothing: "Clothing",
  Groceries: "Groceries",
  Housing: "Housing",
  "Leisure & Fitness": "Leisure",
  "Personal Care": "Personal care",
  Transport: "Transport",
  dining: "Dining",
  groceries: "Groceries",
  leisure: "Leisure",
  rent: "Rent",
  transport: "Transport",
};

export const CATEGORY_ICON: Record<string, string> = {
  "Restaurants & Cafes": "fork-knife",
  "Utilities & Internet": "plug",
  Clothing: "shirt",
  Groceries: "shopping-basket",
  Housing: "home",
  "Leisure & Fitness": "activity",
  "Personal Care": "heart",
  Transport: "bus",
  dining: "fork-knife",
  groceries: "shopping-basket",
  leisure: "activity",
  rent: "home",
  transport: "bus",
};

export const PURPOSE_PRIORITY_CATEGORIES: Record<string, string[]> = {
  RESIDENCE: ["Housing", "Groceries", "Transport", "Utilities & Internet"],
  STUDY: ["Housing", "Groceries", "Transport", "Restaurants & Cafes"],
  TRAVEL: ["Restaurants & Cafes", "Transport", "Leisure & Fitness", "Personal Care"],
  VOLUNTEER: ["Housing", "Groceries", "Transport", "Personal Care"],
  WORK: ["Housing", "Transport", "Restaurants & Cafes", "Utilities & Internet"],
};

export const CITY_KEY_MAP: Record<string, Record<string, string>> = {
  AU: {
    Brisbane: "AU-Brisbane",
    Melbourne: "AU-Melbourne",
    Perth: "AU-Perth",
    Sydney: "AU-Sydney",
  },
  CA: {
    Montreal: "CA-Montreal",
    Toronto: "CA-Toronto",
    Vancouver: "CA-Vancouver",
  },
  DE: {
    Berlin: "DE-Berlin",
    Frankfurt: "DE-Frankfurt",
    Munich: "DE-Munich",
  },
  FR: {
    Lyon: "FR-Lyon",
    Paris: "FR-Paris",
  },
  GB: {
    Edinburgh: "GB-Edinburgh",
    London: "GB-London",
    Manchester: "GB-Manchester",
  },
  HK: {
    "Hong Kong": "HK-HongKong",
  },
  JP: {
    Fukuoka: "JP-Fukuoka",
    Kyoto: "JP-Kyoto",
    Osaka: "JP-Osaka",
    Tokyo: "JP-Tokyo",
  },
  PH: {
    Cebu: "PH-Cebu",
    Manila: "PH-Manila",
  },
  SG: {
    Singapore: "SG-Singapore",
  },
  TH: {
    Bangkok: "TH-Bangkok",
    ChiangMai: "TH-ChiangMai",
    "Chiang Mai": "TH-ChiangMai",
  },
  US: {
    Chicago: "US-Chicago",
    "Los Angeles": "US-LosAngeles",
    "New York": "US-NewYork",
    Seattle: "US-Seattle",
    Washington: "US-WashingtonDC",
    "Washington DC": "US-WashingtonDC",
  },
  VN: {
    Hanoi: "VN-Hanoi",
    "Ho Chi Minh City": "VN-HoChiMinhCity",
  },
};

export function getKoreanItemName(key: string): string {
  return CATEGORY_KO[key] ?? key;
}
