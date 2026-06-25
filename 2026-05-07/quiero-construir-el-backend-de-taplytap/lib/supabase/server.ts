import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/types";
import { assertServerEnv } from "@/lib/env";
import { logServerError } from "@/lib/server-log";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function createSupabaseServerClient() {
  try {
    assertServerEnv();
  } catch (error) {
    logServerError("createSupabaseServerClient assertServerEnv", error);
    throw error;
  }

  let cookieStore: ReturnType<typeof cookies>;

  try {
    cookieStore = cookies();
  } catch (error) {
    logServerError("createSupabaseServerClient cookies", error);
    throw error;
  }

  try {
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, {
                  ...options,
                  path: options.path ?? "/",
                  sameSite: options.sameSite ?? "lax",
                  secure: process.env.NODE_ENV === "production" ? true : options.secure
                });
              });
            } catch {
              // Server Components cannot always write cookies. Middleware refreshes them.
            }
          }
        }
      }
    );
  } catch (error) {
    logServerError("createSupabaseServerClient createServerClient", error);
    throw error;
  }
}
