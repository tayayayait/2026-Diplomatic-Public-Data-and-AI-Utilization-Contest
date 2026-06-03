import { useState, useMemo } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Search, ChevronsUpDown } from "lucide-react";
import { useDiploLifeStore, type UserProfile } from "@/lib/diplolife/state";
import { cn } from "@/lib/utils";
import { City, Country } from "country-state-city";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { translateCitiesFn } from "../lib/gemini";
import { getCachedTranslations, setCachedTranslations, type TranslatedCity } from "../lib/diplolife/city-translation-cache";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "온보딩 — DiploLife" }] }),
  component: OnboardingPage,
});

const FREQUENT_COUNTRIES = [
  { code: "US", name: "미국", flag: "🇺🇸" },
  { code: "JP", name: "일본", flag: "🇯🇵" },
  { code: "CA", name: "캐나다", flag: "🇨🇦" },
  { code: "AU", name: "호주", flag: "🇦🇺" },
  { code: "GB", name: "영국", flag: "🇬🇧" },
  { code: "DE", name: "독일", flag: "🇩🇪" },
];

const PURPOSES = [
  { value: "STUDY", label: "유학/어학연수" },
  { value: "WORK", label: "취업/워킹홀리데이" },
  { value: "TRAVEL", label: "단기여행" },
  { value: "RESIDENCE", label: "영주/이민" },
  { value: "VOLUNTEER", label: "해외봉사/파견" },
];

const INTERESTS = [
  { id: "SAFETY", label: "현지 치안" },
  { id: "COST", label: "생활비/물가" },
  { id: "VISA", label: "비자 갱신" },
  { id: "EMERGENCY", label: "긴급 상황" },
  { id: "WEATHER", label: "기상/자연재해" },
  { id: "HEALTH", label: "의료/건강" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const completeOnboarding = useDiploLifeStore((state) => state.completeOnboarding);
  
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    id: "demo-user",
    name: "체류자",
    visaType: "STUDENT",
    interests: [],
    notificationSettings: {
      visa: true, safety: true, exchangeRate: true, weather: true, notices: true, aiInsight: true,
    },
    theme: "system",
    language: "ko",
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
    else handleComplete();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setIsGenerating(true);
    // Simulate AI Generation time
    await new Promise((r) => setTimeout(r, 1500));
    const finalProfile: UserProfile = {
      ...profile,
      country: profile.country || "US",
      stayPurpose: profile.stayPurpose || "STUDY",
      stayStartDate: profile.stayStartDate || new Date().toISOString().slice(0,10),
      stayEndDate: profile.stayEndDate || "2027-12-31",
      onboardingComplete: true,
    } as UserProfile;
    
    completeOnboarding(finalProfile);
    navigate({ to: "/dashboard" });
  };

  const canProceed = () => {
    if (step === 1) return !!profile.country;
    if (step === 2) return true; // City is optional
    if (step === 3) return !!profile.stayPurpose;
    if (step === 4) return !!profile.stayStartDate && !!profile.stayEndDate;
    if (step === 5) return (profile.interests?.length ?? 0) > 0;
    return true;
  };

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Progress Bar */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-1 w-full bg-border">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-12 sm:px-8 sm:py-20">
        <header className="mb-10 flex items-center justify-between">
          <Link to="/" className="text-[18px] font-bold tracking-normal text-foreground">
            DiploLife
          </Link>
          <span className="text-sm font-semibold text-muted-foreground">
            {step} / 5
          </span>
        </header>

        {isGenerating ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center stagger-child" style={{ "--index": 1 } as any}>
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <h2 className="text-2xl font-bold">AI 맞춤 로드맵 생성 중...</h2>
            <p className="mt-3 text-muted-foreground">입력하신 정보를 바탕으로 공공데이터를 세팅하고 있습니다.</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-between">
            <div className="stagger-child" key={step} style={{ "--index": 1 } as any}>
              {step === 1 && (
                <Step1Country 
                  country={(profile.country as string | undefined)} 
                  onChange={(c) => updateProfile({ country: c })} 
                />
              )}
              {step === 2 && (
                <Step2City 
                  country={(profile.country as string | undefined)}
                  city={profile.city} 
                  onChange={(city) => updateProfile({ city })} 
                />
              )}
              {step === 3 && (
                <Step3Purpose 
                  purpose={profile.stayPurpose} 
                  onChange={(p) => updateProfile({ stayPurpose: p })} 
                />
              )}
              {step === 4 && (
                <Step4Duration 
                  start={profile.stayStartDate}
                  end={profile.stayEndDate || undefined}
                  onChange={(s, e) => updateProfile({ stayStartDate: s, stayEndDate: e || null })}
                />
              )}
              {step === 5 && (
                <Step5Interests 
                  interests={(profile.interests as string[]) || []}
                  onChange={(i) => updateProfile({ interests: i as any })}
                />
              )}
            </div>

            <div className="mt-10 flex items-center justify-between pt-6">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border border-border transition-colors hover:bg-surface-alt",
                  step === 1 ? "invisible" : ""
                )}
                aria-label="이전 단계"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-primary"
              >
                {step === 5 ? "완료하고 시작하기" : "다음으로"}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Step1Country({ country, onChange }: { country?: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  
  // Intl.DisplayNames를 활용하여 한국어 국가명 맵핑
  const regionNames = new Intl.DisplayNames(['ko'], { type: 'region' });
  const allCountries = Country.getAllCountries().map(c => {
    let koName = c.name;
    try {
      koName = regionNames.of(c.isoCode) || c.name;
    } catch (e) {
      // 예외 발생 시 영문 이름 유지
    }
    return { ...c, koName };
  });

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onChange(customInput.trim());
      setOpen(false);
    }
  };

  const getDisplayName = (code: string) => {
    const freq = FREQUENT_COUNTRIES.find((c) => c.code === code);
    if (freq) return freq.name;
    const found = allCountries.find(c => c.isoCode === code);
    return found ? found.koName : code;
  };

  const filteredCountries = customInput.trim() === ""
    ? allCountries
    : allCountries.filter(c => 
        c.koName.toLowerCase().includes(customInput.toLowerCase()) || 
        c.name.toLowerCase().includes(customInput.toLowerCase()) || 
        c.isoCode.toLowerCase().includes(customInput.toLowerCase())
      );

  return (
    <>
      <h1 className="text-3xl font-bold leading-tight">어느 국가로 떠나시나요?</h1>
      <p className="mt-3 text-muted-foreground">체류 국가를 알려주시면 정확한 안전 공지와 환율을 안내해 드립니다.</p>
      
      <div className="mt-8 relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 z-10">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  setOpen(true);
                }}
                onClick={() => setOpen(true)}
                placeholder={country ? getDisplayName(country) : "국가명 검색 (예: 대한민국, 미국)"}
                className="flex h-14 w-full items-center justify-between rounded-2xl border border-border bg-surface pl-12 pr-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[calc(100vw-3rem)] max-w-lg p-0" 
            align="start" 
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandList>
                {filteredCountries.length === 0 ? (
                  <div className="py-4 text-center text-sm">
                    <p className="text-muted-foreground mb-3">"{customInput}"에 대한 검색 결과가 없습니다.</p>
                    {customInput.trim() && (
                      <button
                        type="button"
                        onClick={handleCustomSubmit}
                        className="rounded-full bg-primary/10 px-4 py-2 text-primary hover:bg-primary/20 transition-colors font-medium"
                      >
                        "{customInput}" 직접 입력하기
                      </button>
                    )}
                  </div>
                ) : (
                  <CommandGroup>
                    {filteredCountries.map((c) => (
                      <CommandItem
                        key={c.isoCode}
                        value={`${c.koName} ${c.name} ${c.isoCode}`}
                        onSelect={() => handleSelect(c.isoCode)}
                        className="py-3 cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            country === c.isoCode ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="mr-2 text-xl">{c.flag}</span>
                        {c.koName}
                        <span className="ml-2 text-xs text-muted-foreground">({c.name})</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-8">
        <p className="mb-4 text-sm font-semibold text-muted-foreground">자주 선택하는 국가</p>
        <div className="grid grid-cols-2 gap-3">
          {FREQUENT_COUNTRIES.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => onChange(item.code)}
              className={cn(
                "flex h-14 items-center justify-between rounded-xl border px-4 transition-colors",
                country === item.code
                  ? "border-primary bg-primary/5 font-semibold text-primary"
                  : "border-border bg-surface text-foreground hover:bg-surface-alt"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">{item.flag}</span>
                {item.name}
              </span>
              {country === item.code && <Check className="h-5 w-5" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

const MAJOR_CITIES: Record<string, { en: string; ko: string }[]> = {
  US: [
    { en: "Washington, D.C.", ko: "워싱턴 D.C." },
    { en: "New York", ko: "뉴욕" },
    { en: "Los Angeles", ko: "로스앤젤레스" },
    { en: "Chicago", ko: "시카고" },
    { en: "San Francisco", ko: "샌프란시스코" },
    { en: "Boston", ko: "보스턴" },
    { en: "Seattle", ko: "시애틀" },
    { en: "Honolulu", ko: "호놀룰루 (하와이)" },
  ],
  JP: [
    { en: "Tokyo", ko: "도쿄" },
    { en: "Osaka", ko: "오사카" },
    { en: "Fukuoka", ko: "후쿠오카" },
    { en: "Kyoto", ko: "교토" },
    { en: "Sapporo", ko: "삿포로" },
    { en: "Nagoya", ko: "나고야" },
    { en: "Okinawa", ko: "오키나와" },
  ],
  CA: [
    { en: "Toronto", ko: "토론토" },
    { en: "Vancouver", ko: "밴쿠버" },
    { en: "Montreal", ko: "몬트리올" },
    { en: "Calgary", ko: "캘거리" },
    { en: "Ottawa", ko: "오타와" },
  ],
  AU: [
    { en: "Sydney", ko: "시드니" },
    { en: "Melbourne", ko: "멜버른" },
    { en: "Brisbane", ko: "브리즈번" },
    { en: "Perth", ko: "퍼스" },
    { en: "Gold Coast", ko: "골드코스트" },
  ],
  GB: [
    { en: "London", ko: "런던" },
    { en: "Manchester", ko: "맨체스터" },
    { en: "Edinburgh", ko: "에든버러" },
    { en: "Birmingham", ko: "버밍엄" },
    { en: "Liverpool", ko: "리버풀" },
  ],
  DE: [
    { en: "Berlin", ko: "베를린" },
    { en: "Munich", ko: "뮌헨" },
    { en: "Frankfurt", ko: "프랑크푸르트" },
    { en: "Hamburg", ko: "함부르크" },
  ],
};

function Step2City({ country, city, onChange }: { country?: string; city?: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  
  // 선택된 국가의 주요 한국어 도시 목록 가져오기
  const curatedCities = country ? MAJOR_CITIES[country] || [] : [];
  
  // country-state-city의 데이터는 워낙 방대하고 영문이므로, 
  // 한국어 큐레이션에 없는 국가일 경우에만 영문 리스트를 보조로 제공
  const rawCities = country && curatedCities.length === 0 ? City.getCitiesOfCountry(country) || [] : [];
  const top100Cities = useMemo(() => {
    const uniqueNames = [...new Set(rawCities.map(c => c.name))];
    return uniqueNames.slice(0, 100);
  }, [rawCities]);

  const cachedData = useMemo(() => country ? getCachedTranslations(country) : null, [country]);

  const { data: translatedCities, isLoading, isError } = useQuery({
    queryKey: ['cities', country],
    queryFn: async () => {
      const res = await translateCitiesFn({ data: { country: country!, cities: top100Cities } });
      if (country && res && res.length > 0) {
        setCachedTranslations(country, res);
      }
      return res;
    },
    enabled: top100Cities.length > 0 && !cachedData,
    staleTime: 1000 * 60 * 60 * 24, // 24시간
    initialData: cachedData || undefined,
    retry: 1,
  });

  // 에러 발생 시 영문 원본 데이터 사용
  const fallbackCities = top100Cities.map(c => ({ en: c, ko: c }));
  const displayCities = curatedCities.length > 0 
    ? curatedCities 
    : (translatedCities || fallbackCities);

  const handleSelect = (cityName: string) => {
    onChange(cityName);
    setOpen(false);
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onChange(customInput.trim());
      setOpen(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold leading-tight">어느 도시로 가시나요?</h1>
      <p className="mt-3 text-muted-foreground">날씨 등 정확한 지역 기반 정보를 위해 체류 도시를 알려주세요. (선택사항)</p>
      
      <div className="mt-8 flex flex-col gap-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={open}
              className="flex h-14 w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <span className={cn("truncate", !city && "text-muted-foreground")}>
                {city || "예) 도쿄, 워싱턴, 파리"}
              </span>
              <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-3rem)] max-w-lg p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="도시 검색..." 
                value={customInput}
                onValueChange={setCustomInput}
                className="h-12"
              />
              <CommandList>
                <CommandEmpty className="py-4 text-center text-sm">
                  <p className="text-muted-foreground mb-3">"{customInput}"에 대한 검색 결과가 없습니다.</p>
                  {customInput.trim() && (
                    <button
                      type="button"
                      onClick={handleCustomSubmit}
                      className="rounded-full bg-primary/10 px-4 py-2 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      "{customInput}" 직접 입력하기
                    </button>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {isLoading && curatedCities.length === 0 && (
                    <div className="py-8 flex flex-col items-center justify-center text-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
                      <p className="text-sm text-muted-foreground">AI가 도시 목록을<br/>한국어로 번역 중입니다...</p>
                    </div>
                  )}
                  {isError && curatedCities.length === 0 && (
                    <div className="px-4 py-3 bg-amber-500/10 text-amber-500 text-xs mb-2 rounded-lg mx-2 text-center">
                      도시명 번역에 실패하여 영문으로 표시됩니다.
                    </div>
                  )}
                  {!isLoading && displayCities.map((c, idx) => (
                    <CommandItem
                      key={`${c.en}-${idx}`}
                      value={`${c.ko} ${c.en}`}
                      onSelect={(currentValue) => handleSelect(c.ko)}
                      className="py-3"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          city === c.ko || city === c.en ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {c.ko}
                      {c.en !== c.ko && <span className="ml-2 text-xs text-muted-foreground">({c.en})</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {city && (
          <p className="text-sm text-muted-foreground ml-2">
            선택된 도시: <strong className="text-foreground">{city}</strong>
            <button 
              type="button" 
              onClick={() => onChange("")}
              className="ml-3 text-primary hover:underline"
            >
              초기화
            </button>
          </p>
        )}
      </div>
    </>
  );
}

function Step3Purpose({ purpose, onChange }: { purpose?: string; onChange: (p: UserProfile["stayPurpose"]) => void }) {
  return (
    <>
      <h1 className="text-3xl font-bold leading-tight">체류 목적이 무엇인가요?</h1>
      <p className="mt-3 text-muted-foreground">목적에 맞춰 필요한 맞춤형 체크리스트와 비자 가이드를 제공합니다.</p>
      
      <div className="mt-8 flex flex-col gap-3">
        {PURPOSES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value as UserProfile["stayPurpose"])}
            className={cn(
              "flex h-14 items-center justify-between rounded-xl border px-5 transition-colors",
              purpose === item.value
                ? "border-primary bg-primary/5 font-semibold text-primary"
                : "border-border bg-surface text-foreground hover:bg-surface-alt"
            )}
          >
            {item.label}
            {purpose === item.value && <Check className="h-5 w-5" />}
          </button>
        ))}
      </div>
    </>
  );
}

function Step4Duration({ start, end, onChange }: { start?: string; end?: string; onChange: (s: string, e: string) => void }) {
  return (
    <>
      <h1 className="text-3xl font-bold leading-tight">체류 기간을 알려주세요</h1>
      <p className="mt-3 text-muted-foreground">만료일이 다가오면 D-day 알림을 통해 비자 갱신을 잊지 않게 도와드립니다.</p>
      
      <div className="mt-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">출국일 (시작일)</label>
          <input
            type="date"
            value={start || ""}
            onChange={(e) => onChange(e.target.value, end || "")}
            className="h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">귀국일 (종료일)</label>
          <input
            type="date"
            value={end || ""}
            onChange={(e) => onChange(start || "", e.target.value)}
            className="h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
    </>
  );
}

function Step5Interests({ interests, onChange }: { interests: string[]; onChange: (i: string[]) => void }) {
  const toggleInterest = (id: string) => {
    if (interests.includes(id)) {
      onChange(interests.filter((i) => i !== id));
    } else {
      onChange([...interests, id]);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold leading-tight">주로 관심 있는 정보는<br/>무엇인가요? (다중 선택)</h1>
      <p className="mt-3 text-muted-foreground">선택하신 정보를 대시보드 메인에 배치해 드립니다.</p>
      
      <div className="mt-8 flex flex-wrap gap-3">
        {INTERESTS.map((item) => {
          const isSelected = interests.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleInterest(item.id)}
              className={cn(
                "inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-semibold transition-colors",
                isSelected
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-foreground hover:bg-surface-alt"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

