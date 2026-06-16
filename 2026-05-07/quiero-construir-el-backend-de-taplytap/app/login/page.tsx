import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    sent?: string;
    error?: string;
    message?: string;
    next?: string;
  };
};

export default function LoginPage({ searchParams }: PageProps) {
  async function signIn(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const next = getSafeLoginNext(String(formData.get("next") ?? ""));

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      redirect(buildLoginUrl(next, { error: "invalid-email" }));
    }

    let authErrorMessage: string | null = null;

    try {
      const supabase = createSupabaseServerClient();
      const callbackUrl = new URL("/auth/callback", getSiteUrl());
      callbackUrl.searchParams.set("next", next);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl.toString()
        }
      });

      if (error) {
        authErrorMessage = error.message;
      }
    } catch (error) {
      authErrorMessage = error instanceof Error ? error.message : "No se pudo contactar Supabase.";
    }

    if (authErrorMessage) {
      const params = new URLSearchParams({
        error: "auth",
        message: authErrorMessage
      });

      redirect(buildLoginUrl(next, Object.fromEntries(params)));
    }

    redirect(buildLoginUrl(next, { sent: "1" }));
  }

  const next = getSafeLoginNext(searchParams?.next);
  const isAdminLogin = next === "/admin";
  const errorMessage = getLoginErrorMessage(searchParams?.error, searchParams?.message);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap</p>
      <h1 className="text-3xl font-bold text-ink">
        {isAdminLogin ? "Entrar al admin" : "Entrar a mi cuenta"}
      </h1>
      <p className="mt-3 text-gray-600">
        {isAdminLogin
          ? "Recibe un enlace seguro en tu correo de administrador."
          : "Recibe un enlace seguro para ver tus placas TaplyTap."}
      </p>

      {errorMessage ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {searchParams?.sent ? (
        <div className="mt-8 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Revisa tu correo para continuar.
        </div>
      ) : (
        <form action={signIn} className="mt-8 grid gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Email</span>
            <input
              name="email"
              type="email"
              required
              className="rounded-md border border-gray-300 bg-white px-3 py-2"
              placeholder={isAdminLogin ? "admin@taplytap.io" : "tu@email.com"}
            />
          </label>
          <button className="rounded-md bg-ink px-4 py-2 font-semibold text-white">Enviar enlace</button>
        </form>
      )}
    </main>
  );
}

function getSafeLoginNext(next?: string | null) {
  if (next === "/admin") return "/admin";
  return "/dashboard";
}

function buildLoginUrl(next: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  if (next === "/admin") {
    searchParams.set("next", "/admin");
  }

  return `/login?${searchParams.toString()}`;
}

function getLoginErrorMessage(error?: string, message?: string) {
  if (!error) return null;

  if (error === "invalid-email") {
    return "Ingresa un correo válido.";
  }

  if (error === "auth") {
    return `Supabase no pudo enviar el magic link: ${message ?? "revisa las variables de entorno."}`;
  }

  if (error === "session") {
    return message ?? "Supabase no creó una sesión activa. Vuelve a solicitar el magic link.";
  }

  if (error === "unauthorized") {
    return message ?? "Este email no está autorizado para entrar al panel.";
  }

  if (error === "token") {
    return message ?? "El magic link es inválido o expiró. Solicita uno nuevo.";
  }

  if (error === "config") {
    return message ?? "Falta una variable de entorno necesaria para auth.";
  }

  return "No se pudo iniciar sesión. Intenta de nuevo.";
}
