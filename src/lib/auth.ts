import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export type EmailAuthCredentials = {
  email: string;
  password: string;
};

export type SignUpCredentials = EmailAuthCredentials & {
  displayName?: string;
  redirectTo?: string;
};

export type AuthResult = {
  session: Session | null;
  user: User | null;
};

export type SignUpResult = AuthResult & {
  needsEmailConfirmation: boolean;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const assertCredentials = ({ email, password }: EmailAuthCredentials) => {
  if (!normalizeEmail(email)) {
    throw new Error("?대찓?쇱쓣 ?낅젰?섏꽭??");
  }

  if (!password) {
    throw new Error("鍮꾨?踰덊샇瑜??낅젰?섏꽭??");
  }
};

export async function getCurrentAuthSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;
  return data.session ?? null;
}

export async function signInWithEmail(credentials: EmailAuthCredentials): Promise<AuthResult> {
  assertCredentials(credentials);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(credentials.email),
    password: credentials.password,
  });

  if (error) throw error;
  return {
    session: data.session ?? null,
    user: data.user ?? null,
  };
}

export async function signUpWithEmail(credentials: SignUpCredentials): Promise<SignUpResult> {
  assertCredentials(credentials);

  const displayName = credentials.displayName?.trim();
  const authOptions =
    displayName || credentials.redirectTo
      ? {
          data: displayName ? { display_name: displayName } : undefined,
          emailRedirectTo: credentials.redirectTo,
        }
      : undefined;

  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(credentials.email),
    password: credentials.password,
    ...(authOptions ? { options: authOptions } : {}),
  });

  if (error) throw error;
  return {
    needsEmailConfirmation: Boolean(data.user && !data.session),
    session: data.session ?? null,
    user: data.user ?? null,
  };
}

export async function signOutFromSupabase(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export function subscribeToAuthChanges(
  listener: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    listener(event, session);
  });

  return () => subscription.unsubscribe();
}
