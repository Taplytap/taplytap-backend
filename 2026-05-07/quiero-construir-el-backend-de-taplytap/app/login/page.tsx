import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { SupportWhatsAppBubble } from "@/components/SupportWhatsAppBubble";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#EEF6FF_0%,#F8FAFC_42%,#FFFFFF_100%)] px-5 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <Card className="taply-fade-up rounded-[2.25rem] border-white/80 bg-white/90 p-6 shadow-[0_34px_100px_rgba(15,23,42,0.10)] backdrop-blur sm:p-8">
          <p className="text-center text-base font-bold tracking-tight text-brand">TaplyTap</p>
          <h1 className="mt-8 text-center text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Administra tus placas TaplyTap
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-center text-base leading-7 text-slateText">
            Activa, edita y mejora tus placas desde un solo lugar.
          </p>

          {errorMessage ? (
            <Alert variant="destructive" className="mt-6 bg-red-50/90">
              {errorMessage}
            </Alert>
          ) : null}

          <div className="mt-10">
            {searchParams?.sent ? (
              <Alert variant="success">
                Revisa tu correo para continuar.
              </Alert>
            ) : (
              <form action={signInWithPassword} className="grid gap-4">
                <Label>
                  Email
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="tu@email.com"
                  />
                </Label>
                <Label>
                  Contraseña
                  <Input
                    name="password"
                    type="password"
                    required
                    placeholder="Tu contraseña"
                  />
                </Label>
                <FormSubmitButton
                  pendingText="Entrando..."
                  className="min-h-12 rounded-2xl bg-brand px-4 py-3.5 text-base font-semibold text-white shadow-[0_16px_36px_rgba(0,109,255,0.26)] transition hover:-translate-y-0.5 hover:bg-brandHover hover:shadow-[0_22px_44px_rgba(0,109,255,0.30)] disabled:cursor-wait disabled:translate-y-0 disabled:bg-brand/70"
                >
                  <LockKeyhole size={18} />
                  Entrar
                </FormSubmitButton>
              </form>
            )}
          </div>

          <section className="mt-6 rounded-[1.5rem] border border-line bg-slate-50/70 p-4">
            {searchParams?.reset === "sent" ? (
              <div className="grid gap-2 text-sm leading-6">
                <p className="font-medium text-emerald-700">
                  Te enviamos un enlace para restablecer tu contraseña si el correo existe.
                </p>
                <p className="text-slateText">Si no recibes el correo, escríbenos por WhatsApp.</p>
              </div>
            ) : (
              <details className="group">
                <summary className="cursor-pointer list-none text-sm font-semibold text-brand transition hover:text-brandHover">
                  ¿Olvidaste tu contraseña?
                </summary>
                <form action={sendPasswordRecovery} className="mt-4 grid gap-3">
                  <Label>
                    Correo electrónico
                    <Input
                      name="recovery_email"
                      type="email"
                      required
                      placeholder="tu@email.com"
                    />
                  </Label>
                  <FormSubmitButton
                    pendingText="Enviando..."
                    className="min-h-11 rounded-2xl border border-brandBorder bg-white px-4 py-3 text-sm font-semibold text-brand transition hover:border-brand hover:bg-brandSoft disabled:cursor-wait disabled:opacity-70"
                  >
                    Enviar enlace de recuperación
                  </FormSubmitButton>
                  <p className="text-xs leading-5 text-slateText">
                    Si no recibes el correo, escríbenos por WhatsApp.
                  </p>
                </form>
              </details>
            )}
          </section>
        </Card>

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
