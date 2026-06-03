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
import { createItineraryStoreSeed } from "@/lib/itinerary/multi-day-state";
import { useItineraryStore } from "@/store/itineraryStore";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "?⑤낫????DiploLife" }] }),
  component: OnboardingPage,
});

const FREQUENT_COUNTRIES = [
  { code: "US", name: "誘멸뎅", flag: "?눣?눡" },
  { code: "JP", name: "?쇰낯", flag: "?눓?눝" },
  { code: "CA", name: "罹먮굹??, flag: "?눊?눇" },
  { code: "AU", name: "?몄＜", flag: "?눇?눣" },
  { code: "GB", name: "?곴뎅", flag: "?눐?눉" },
  { code: "DE", name: "?낆씪", flag: "?눍?눎" },
];

const PURPOSES = [
  { value: "STUDY", label: "?좏븰/?댄븰?곗닔" },
  { value: "WORK", label: "痍⑥뾽/?뚰궧?由щ뜲?? },
  { value: "TRAVEL", label: "?④린?ы뻾" },
  { value: "RESIDENCE", label: "?곸＜/?대?" },
  { value: "VOLUNTEER", label: "?댁쇅遊됱궗/?뚭껄" },
];

const INTERESTS = [
  { id: "SAFETY", label: "?꾩? 移섏븞" },
  { id: "COST", label: "?앺솢鍮?臾쇨?" },
  { id: "VISA", label: "鍮꾩옄 媛깆떊" },
  { id: "EMERGENCY", label: "湲닿툒 ?곹솴" },
  { id: "WEATHER", label: "湲곗긽/?먯뿰?ы빐" },
  { id: "HEALTH", label: "?섎즺/嫄닿컯" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const completeOnboarding = useDiploLifeStore((state) => state.completeOnboarding);
  
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    id: "demo-user",
    name: "泥대쪟??,
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
    const itinerarySeed = createItineraryStoreSeed({ profile: finalProfile });
    useItineraryStore.getState().initializeTrip(
      itinerarySeed.startDate,
      itinerarySeed.endDate,
      [],
      finalProfile.city,
      finalProfile.country,
    );
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
            <h2 className="text-2xl font-bold">AI 留욎땄 濡쒕뱶留??앹꽦 以?..</h2>
            <p className="mt-3 text-muted-foreground">?낅젰?섏떊 ?뺣낫瑜?諛뷀깢?쇰줈 怨듦났?곗씠?곕? ?명똿?섍퀬 ?덉뒿?덈떎.</p>
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
                aria-label="?댁쟾 ?④퀎"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-primary"
              >
                {step === 5 ? "?꾨즺?섍퀬 ?쒖옉?섍린" : "?ㅼ쓬?쇰줈"}
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
  
  // Intl.DisplayNames瑜??쒖슜?섏뿬 ?쒓뎅??援??紐?留듯븨
  const regionNames = new Intl.DisplayNames(['ko'], { type: 'region' });
  const allCountries = Country.getAllCountries().map(c => {
    let koName = c.name;
    try {
      koName = regionNames.of(c.isoCode) || c.name;
    } catch (e) {
      // ?덉쇅 諛쒖깮 ???곷Ц ?대쫫 ?좎?
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
      <h1 className="text-3xl font-bold leading-tight">?대뒓 援??濡??좊굹?쒕굹??</h1>
      <p className="mt-3 text-muted-foreground">泥대쪟 援??瑜??뚮젮二쇱떆硫??뺥솗???덉쟾 怨듭?? ?섏쑉???덈궡???쒕┰?덈떎.</p>
      
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
                placeholder={country ? getDisplayName(country) : "援??紐?寃??(?? ??쒕?援? 誘멸뎅)"}
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
                    <p className="text-muted-foreground mb-3">"{customInput}"?????寃??寃곌낵媛 ?놁뒿?덈떎.</p>
                    {customInput.trim() && (
                      <button
                        type="button"
                        onClick={handleCustomSubmit}
                        className="rounded-full bg-primary/10 px-4 py-2 text-primary hover:bg-primary/20 transition-colors font-medium"
                      >
                        "{customInput}" 吏곸젒 ?낅젰?섍린
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
        <p className="mb-4 text-sm font-semibold text-muted-foreground">?먯＜ ?좏깮?섎뒗 援??</p>
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
    { en: "Washington, D.C.", ko: "?뚯떛??D.C." },
    { en: "New York", ko: "?댁슃" },
    { en: "Los Angeles", ko: "濡쒖뒪?ㅼ젮?덉뒪" },
    { en: "Chicago", ko: "?쒖뭅怨? },
    { en: "San Francisco", ko: "?뚰봽??쒖뒪肄? },
    { en: "Boston", ko: "蹂댁뒪?? },
    { en: "Seattle", ko: "?쒖븷?" },
    { en: "Honolulu", ko: "?몃?猷곕（ (?섏???" },
  ],
  JP: [
    { en: "Tokyo", ko: "?꾩퓙" },
    { en: "Osaka", ko: "?ㅼ궗移? },
    { en: "Fukuoka", ko: "?꾩퓼?ㅼ뭅" },
    { en: "Kyoto", ko: "援먰넗" },
    { en: "Sapporo", ko: "?욱룷濡? },
    { en: "Nagoya", ko: "?섍퀬?? },
    { en: "Okinawa", ko: "?ㅽ궎?섏?" },
  ],
  CA: [
    { en: "Toronto", ko: "?좊줎?? },
    { en: "Vancouver", ko: "諛댁퓼踰? },
    { en: "Montreal", ko: "紐ы듃由ъ삱" },
    { en: "Calgary", ko: "罹섍굅由? },
    { en: "Ottawa", ko: "?ㅽ??" },
  ],
  AU: [
    { en: "Sydney", ko: "?쒕뱶?? },
    { en: "Melbourne", ko: "硫쒕쾭瑜? },
    { en: "Brisbane", ko: "釉뚮━利덈쾲" },
    { en: "Perth", ko: "?쇱뒪" },
    { en: "Gold Coast", ko: "怨⑤뱶肄붿뒪?? },
  ],
  GB: [
    { en: "London", ko: "?곕뜕" },
    { en: "Manchester", ko: "留⑥껜?ㅽ꽣" },
    { en: "Edinburgh", ko: "?먮뱺踰꾨윭" },
    { en: "Birmingham", ko: "踰꾨컢?? },
    { en: "Liverpool", ko: "由щ쾭?" },
  ],
  DE: [
    { en: "Berlin", ko: "踰좊?由? },
    { en: "Munich", ko: "裕뚰뿨" },
    { en: "Frankfurt", ko: "?꾨옉?ы뫖瑜댄듃" },
    { en: "Hamburg", ko: "?⑤?瑜댄겕" },
  ],
};

function Step2City({ country, city, onChange }: { country?: string; city?: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  
  // ?좏깮??援????二쇱슂 ?쒓뎅???꾩떆 紐⑸줉 媛?몄삤湲?  const curatedCities = country ? MAJOR_CITIES[country] || [] : [];
  
  // country-state-city???곗씠?곕뒗 ?뚮굺 諛⑸??섍퀬 ?곷Ц?대?濡? 
  // ?쒓뎅???먮젅?댁뀡???녿뒗 援????寃쎌슦?먮쭔 ?곷Ц 由ъ뒪?몃? 蹂댁“濡??쒓났
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
    staleTime: 1000 * 60 * 60 * 24, // 24?쒓컙
    initialData: cachedData || undefined,
    retry: 1,
  });

  // ?먮윭 諛쒖깮 ???곷Ц ?먮낯 ?곗씠???ъ슜
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
      <h1 className="text-3xl font-bold leading-tight">?대뒓 ?꾩떆濡?媛?쒕굹??</h1>
      <p className="mt-3 text-muted-foreground">?좎뵪 ???뺥솗??吏??湲곕컲 ?뺣낫瑜??꾪빐 泥대쪟 ?꾩떆瑜??뚮젮二쇱꽭?? (?좏깮?ы빆)</p>
      
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
                {city || "?? ?꾩퓙, ?뚯떛?? ?뚮━"}
              </span>
              <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-3rem)] max-w-lg p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="?꾩떆 寃??.." 
                value={customInput}
                onValueChange={setCustomInput}
                className="h-12"
              />
              <CommandList>
                <CommandEmpty className="py-4 text-center text-sm">
                  <p className="text-muted-foreground mb-3">"{customInput}"?????寃??寃곌낵媛 ?놁뒿?덈떎.</p>
                  {customInput.trim() && (
                    <button
                      type="button"
                      onClick={handleCustomSubmit}
                      className="rounded-full bg-primary/10 px-4 py-2 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      "{customInput}" 吏곸젒 ?낅젰?섍린
                    </button>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {isLoading && curatedCities.length === 0 && (
                    <div className="py-8 flex flex-col items-center justify-center text-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
                      <p className="text-sm text-muted-foreground">AI媛 ?꾩떆 紐⑸줉??br/>?쒓뎅?대줈 踰덉뿭 以묒엯?덈떎...</p>
                    </div>
                  )}
                  {isError && curatedCities.length === 0 && (
                    <div className="px-4 py-3 bg-amber-500/10 text-amber-500 text-xs mb-2 rounded-lg mx-2 text-center">
                      ?꾩떆紐?踰덉뿭???ㅽ뙣?섏뿬 ?곷Ц?쇰줈 ?쒖떆?⑸땲??
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
            ?좏깮???꾩떆: <strong className="text-foreground">{city}</strong>
            <button 
              type="button" 
              onClick={() => onChange("")}
              className="ml-3 text-primary hover:underline"
            >
              珥덇린??            </button>
          </p>
        )}
      </div>
    </>
  );
}

function Step3Purpose({ purpose, onChange }: { purpose?: string; onChange: (p: UserProfile["stayPurpose"]) => void }) {
  return (
    <>
      <h1 className="text-3xl font-bold leading-tight">泥대쪟 紐⑹쟻??臾댁뾿?멸???</h1>
      <p className="mt-3 text-muted-foreground">紐⑹쟻??留욎떠 ?꾩슂??留욎땄??泥댄겕由ъ뒪?몄? 鍮꾩옄 媛?대뱶瑜??쒓났?⑸땲??</p>
      
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
      <h1 className="text-3xl font-bold leading-tight">泥대쪟 湲곌컙???뚮젮二쇱꽭??/h1>
      <p className="mt-3 text-muted-foreground">留뚮즺?쇱씠 ?ㅺ??ㅻ㈃ D-day ?뚮┝???듯빐 鍮꾩옄 媛깆떊???딆? ?딄쾶 ?꾩??쒕┰?덈떎.</p>
      
      <div className="mt-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">異쒓뎅??(?쒖옉??</label>
          <input
            type="date"
            value={start || ""}
            onChange={(e) => onChange(e.target.value, end || "")}
            className="h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">洹援?씪 (醫낅즺??</label>
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
      <h1 className="text-3xl font-bold leading-tight">二쇰줈 愿???덈뒗 ?뺣낫??br/>臾댁뾿?멸??? (?ㅼ쨷 ?좏깮)</h1>
      <p className="mt-3 text-muted-foreground">?좏깮?섏떊 ?뺣낫瑜???쒕낫??硫붿씤??諛곗튂???쒕┰?덈떎.</p>
      
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
