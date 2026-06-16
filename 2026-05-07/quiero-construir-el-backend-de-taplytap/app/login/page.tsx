import { redirect } from "next/navigation";
import { SupportWhatsAppBubble } from "@/components/SupportWhatsAppBubble";
import { getSiteUrl } from "@/lib/env";
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
    } catch {
      // Keep the response intentionally neutral so we do not reveal whether an account exists.
    }

    redirect(buildLoginUrl({ reset: "sent" }));
  }

  const errorMessage = getLoginErrorMessage(searchParams?.error, searchParams?.message);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap</p>
      <h1 className="text-3xl font-bold text-ink">Entrar a mi cuenta</h1>
      <p className="mt-3 text-gray-600">Usa el correo y contraseña que creaste al activar tu placa.</p>

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
        <form action={signInWithPassword} className="mt-8 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Email</span>
            <input
              name="email"
              type="email"
              required
              className="rounded-md border border-gray-300 bg-white px-3 py-2"
              placeholder="tu@email.com"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Contraseña</span>
            <input
              name="password"
              type="password"
              required
              className="rounded-md border border-gray-300 bg-white px-3 py-2"
              placeholder="Tu contraseña"
            />
          </label>
          <button className="rounded-md bg-ink px-4 py-2 font-semibold text-white">Entrar</button>
        </form>
      )}

      <section className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        {searchParams?.reset === "sent" ? (
          <div className="grid gap-2 text-sm leading-6">
            <p className="text-emerald-700">
              Te enviamos un enlace para restablecer tu contraseña si el correo existe.
            </p>
            <p className="text-gray-600">Si no recibes el correo, escríbenos por WhatsApp.</p>
          </div>
        ) : (
          <details className="group">
            <summary className="cursor-pointer list-none text-sm font-semibold text-mint">
              ¿Olvidaste tu contraseña?
            </summary>
            <form action={sendPasswordRecovery} className="mt-4 grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Correo electrónico</span>
                <input
                  name="recovery_email"
                  type="email"
                  required
                  className="rounded-md border border-gray-300 bg-white px-3 py-2"
                  placeholder="tu@email.com"
                />
              </label>
              <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-ink">
                Enviar enlace de recuperación
              </button>
              <p className="text-xs leading-5 text-gray-500">
                Si no recibes el correo, escríbenos por WhatsApp.
              </p>
            </form>
          </details>
        )}
      </section>

      <SupportWhatsAppBubble />
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
