import { redirect } from "next/navigation";
import { SupportWhatsAppBubble } from "@/components/SupportWhatsAppBubble";
import { getSiteUrl } from "@/lib/env";
import { logServerError } from "@/lib/server-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    sent?: string;
    error?: string;
    message?: string;
    reset?: string;
  };
};

export default function LoginPage({ searchParams }: PageProps) {
  async function signInWithPassword(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      redirect(buildLoginUrl({ error: "invalid-email" }));
    }

    if (!password) {
      redirect(buildLoginUrl({ error: "missing-password" }));
    }

    let authErrorMessage: string | null = null;

    try {
      const supabase = createSupabaseServerClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        authErrorMessage = error.message;
      }
    } catch (error) {
      logServerError("/login action signInWithPassword", error);
      authErrorMessage = error instanceof Error ? error.message : "No se pudo contactar Supabase.";
    }

    if (authErrorMessage) {
      const params = new URLSearchParams({
        error: "auth",
        message: authErrorMessage
      });

      redirect(buildLoginUrl(Object.fromEntries(params)));
    }

    redirect("/dashboard");
  }

  async function sendPasswordRecovery(formData: FormData) {
    "use server";

    const email = String(formData.get("recovery_email") ?? "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      redirect(buildLoginUrl({ error: "invalid-email" }));
    }

    try {
      const supabase = createSupabaseServerClient();
      const callbackUrl = new URL("/auth/callback", getSiteUrl());
      callbackUrl.searchParams.set("next", "/reset-password");
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl.toString()
      });
    } catch (error) {
      logServerError("/login action sendPasswordRecovery", error);
      // Keep the response intentionally neutral so we do not reveal whether an account exists.
    }

    redirect(buildLoginUrl({ reset: "sent" }));
  }

  try {
    return renderLoginPage({ searchParams, signInWithPassword, sendPasswordRecovery });
  } catch (error) {
    logServerError("/login render", error);
    throw error;
  }
}

function renderLoginPage({
  searchParams,
  signInWithPassword,
  sendPasswordRecovery
}: PageProps & {
  signInWithPassword: (formData: FormData) => Promise<void>;
  sendPasswordRecovery: (formData: FormData) => Promise<void>;
}) {
  const errorMessage = getLoginErrorMessage(searchParams?.error, searchParams?.message);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap</p>
        <h1 className="text-4xl font-bold tracking-tight text-ink">Entrar a mi cuenta</h1>
        <p className="mt-3 text-base leading-7 text-slateText">
          Usa el correo y contraseña que creaste al activar tu placa.
        </p>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6">
          {searchParams?.sent ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              Revisa tu correo para continuar.
            </div>
          ) : (
            <form action={signInWithPassword} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  className="rounded-xl border border-line bg-white px-3 py-3 text-base text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                  placeholder="tu@email.com"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Contraseña</span>
                <input
                  name="password"
                  type="password"
                  required
                  className="rounded-xl border border-line bg-white px-3 py-3 text-base text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                  placeholder="Tu contraseña"
                />
              </label>
              <button className="rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-white shadow-[0_14px_30px_rgba(0,109,255,0.24)] transition hover:bg-brandHover">
                Entrar
              </button>
            </form>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-line bg-white p-4">
          {searchParams?.reset === "sent" ? (
            <div className="grid gap-2 text-sm leading-6">
              <p className="text-emerald-700">
                Te enviamos un enlace para restablecer tu contraseña si el correo existe.
              </p>
              <p className="text-slateText">Si no recibes el correo, escríbenos por WhatsApp.</p>
            </div>
          ) : (
            <details className="group">
              <summary className="cursor-pointer list-none text-sm font-semibold text-brand">
                ¿Olvidaste tu contraseña?
              </summary>
              <form action={sendPasswordRecovery} className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-ink">Correo electrónico</span>
                  <input
                    name="recovery_email"
                    type="email"
                    required
                    className="rounded-xl border border-line bg-white px-3 py-3 text-base text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                    placeholder="tu@email.com"
                  />
                </label>
                <button className="rounded-xl border border-brandBorder bg-brandSoft px-4 py-3 text-sm font-semibold text-brand transition hover:bg-white">
                  Enviar enlace de recuperación
                </button>
                <p className="text-xs leading-5 text-slateText">
                  Si no recibes el correo, escríbenos por WhatsApp.
                </p>
              </form>
            </details>
          )}
        </section>

        <SupportWhatsAppBubble />
      </div>
    </main>
  );
}

function buildLoginUrl(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  return `/login?${searchParams.toString()}`;
}

function getLoginErrorMessage(error?: string, message?: string) {
  if (!error) return null;

  if (error === "invalid-email") {
    return "Ingresa un correo válido.";
  }

  if (error === "missing-password") {
    return "Ingresa tu contraseña.";
  }

  if (error === "auth") {
    return message ?? "No pudimos iniciar sesión. Revisa tu correo y contraseña.";
  }

  if (error === "session") {
    return message ?? "No se encontró una sesión activa. Vuelve a iniciar sesión.";
  }

  if (error === "unauthorized") {
    return message ?? "Este email no está autorizado para entrar al panel.";
  }

  if (error === "token") {
    return message ?? "El enlace es inválido o expiró. Solicita uno nuevo.";
  }

  if (error === "config") {
    return message ?? "Falta una variable de entorno necesaria para auth.";
  }

  return "No se pudo iniciar sesión. Intenta de nuevo.";
}
