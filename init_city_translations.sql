-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS public.city_translations_cache (
    country_code text PRIMARY KEY,
    translations jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS(Row Level Security) 설정
ALTER TABLE public.city_translations_cache ENABLE ROW LEVEL SECURITY;

-- 누구나 읽을 수 있도록 허용 (프론트엔드나 서버 함수 모두 조회 가능)
CREATE POLICY "Enable read access for all users" 
ON public.city_translations_cache 
FOR SELECT 
USING (true);

-- 서버 함수(Service Role 또는 Anon)에서 Insert 허용 (실제로는 서버 환경 변수를 통해 쓰기 권한 확보)
CREATE POLICY "Enable insert access for anon" 
ON public.city_translations_cache 
FOR INSERT 
WITH CHECK (true);

-- Update 허용
CREATE POLICY "Enable update access for anon" 
ON public.city_translations_cache 
FOR UPDATE 
USING (true);
