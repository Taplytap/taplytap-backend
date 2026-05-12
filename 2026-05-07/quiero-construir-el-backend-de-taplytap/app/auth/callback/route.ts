import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { assertAdminEnv, assertServerEnv, getAdminEmails } from "@/lib/env";
import type { Database } from "@/lib/types";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const providerError = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  let redirectUrl = new URL(next, request.url);
  let response = NextResponse.redirect(redirectUrl);

  function setRedirect(path: string) {
    redirectUrl = new URL(path, request.url);
    response = NextResponse.redirect(redirectUrl);
  }

  if (providerError) {
    setRedirect(`/login?error=session&message=${encodeURIComponent(providerError)}`);
    return response;
  }

  if (!code && (!tokenHash || !type)) {
    setRedirect("/login?error=session&message=El%20magic%20link%20no%20incluye%20un%20c%C3%B3digo%20v%C3%A1lido.");
    return response;
  }

  try {
    assertServerEnv();
    assertAdminEnv();

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

            response = NextResponse.redirect(redirectUrl);

            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                path: options.path ?? "/",
                sameSite: options.sameSite ?? "lax",
                secure: process.env.NODE_ENV === "production" ? true : options.secure
              });
            });
          }
        }
      }
    );

    const { error: exchangeError } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: type!
        });

    if (exchangeError) {
      setRedirect(`/login?error=session&message=${encodeURIComponent(exchangeError.message)}`);
      return response;
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      setRedirect("/login?error=session&message=Supabase%20no%20cre%C3%B3%20una%20sesi%C3%B3n%20v%C3%A1lida.");
      return response;
    }

    const isAdmin = getAdminEmails().includes(user.email.toLowerCase());

    if (!isAdmin) {
      setRedirect("/login?error=unauthorized&message=Este%20email%20no%20est%C3%A1%20autorizado%20para%20administrar%20TaplyTap.");
      await supabase.auth.signOut();
      return response;
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auth configuration failed.";
    setRedirect(`/login?error=config&message=${encodeURIComponent(message)}`);
    return response;
  }
}

function getSafeNextPath(next: string | null) {
  if (!next) return "/admin";

  try {
    const decoded = decodeURIComponent(next);
    return decoded.startsWith("/") && !decoded.startsWith("//") ? decoded : "/admin";
  } catch {
    return "/admin";
  }
}
