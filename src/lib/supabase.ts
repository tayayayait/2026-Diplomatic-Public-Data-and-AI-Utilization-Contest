import { createClient } from "@supabase/supabase-js";

const processEnv = typeof process !== "undefined" ? process.env : {};
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || processEnv.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || processEnv.VITE_SUPABASE_ANON_KEY || "";
const isBrowser = typeof window !== "undefined";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase ?섍꼍 蹂?섍? ?ㅼ젙?섏? ?딆븯?듬땲??");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
    persistSession: isBrowser,
  },
});
