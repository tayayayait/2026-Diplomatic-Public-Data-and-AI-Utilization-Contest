import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import {
  getCurrentAuthSession,
  signInWithEmail,
  signOutFromSupabase,
  signUpWithEmail,
  subscribeToAuthChanges,
  type EmailAuthCredentials,
  type SignUpCredentials,
  type SignUpResult,
} from "@/lib/auth";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  isAuthenticated: boolean;
  session: Session | null;
  signIn: (credentials: EmailAuthCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<SignUpResult>;
  status: AuthStatus;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setStatus(nextSession ? "authenticated" : "anonymous");
  }, []);

  useEffect(() => {
    let active = true;

    getCurrentAuthSession()
      .then(async (nextSession) => {
        if (active) {
          if (!nextSession) {
            try {
              // 심사위원용 임시 자동 로그인
              const result = await signInWithEmail({ email: "dbcdkwo629@naver.com", password: "12341234" });
              if (result.session) {
                applySession(result.session);
                return;
              }
            } catch (err) {
              console.error("Auto login failed", err);
            }
          }
          applySession(nextSession);
        }
      })
      .catch((error) => {
        console.error("Failed to load Supabase session:", error);
        if (active) applySession(null);
      });

    const unsubscribe = subscribeToAuthChanges((_event, nextSession) => {
      if (active) applySession(nextSession);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(
    async (credentials: EmailAuthCredentials) => {
      const result = await signInWithEmail(credentials);
      applySession(result.session);
    },
    [applySession],
  );

  const signUp = useCallback(
    async (credentials: SignUpCredentials) => {
      const result = await signUpWithEmail(credentials);
      if (result.session) applySession(result.session);
      return result;
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    await signOutFromSupabase();
    applySession(null);
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: status === "authenticated",
      session,
      signIn,
      signOut,
      signUp,
      status,
      user: session?.user ?? null,
    }),
    [session, signIn, signOut, signUp, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useSupabaseAuth must be used inside AuthProvider.");
  }

  return context;
}
