import { redirect } from "next/navigation";
import { getAdminEmails, getSiteUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    error?: string;
    message?: string;
    reset?: string;
  };
};

export default function AdminLoginPage({ searchParams }: PageProps) {
  async function signInAdmin(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      redirect("/admin/login?error=invalid-email");
    }

    if (!password) {
      redirect("/admin/login?error=missing-password");
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user?.email) {
      redirect(`/admin/login?error=auth&message=${encodeURIComponent(error?.message ?? "No se pudo iniciar sesión.")}`);
    }

    const isAdmin = getAdminEmails().includes(data.user.email.toLowerCase());

    if (!isAdmin) {
      await supabase.auth.signOut();
      redirect("/admin/login?error=unauthorized");
    }

    redirect("/admin");
  }

  async function sendAdminPasswordRecovery(formData: FormData) {
    "use server";

    const email = String(formData.get("recovery_email") ?? "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      redirect("/admin/login?error=invalid-email");
    }

    try {
      const supabase = createSupabaseServerClient();
      const callbackUrl = new URL("/auth/callback", getSiteUrl());
      callbackUrl.searchParams.set("next", "/reset-password");
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl.toString()
      });
    } catch {
      // Keep response neutral.
    }

    redirect("/admin/login?reset=sent");
  }

  const errorMessage = getAdminLoginErrorMessage(searchParams?.error, searchParams?.message);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap Admin</p>
      <h1 className="text-3xl font-bold text-ink">Entrar al admin</h1>
      <p className="mt-3 text-gray-600">Usa tu correo autorizado y contraseña de Supabase.</p>

      {errorMessage ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <form action={signInAdmin} className="mt-8 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Correo</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-gray-300 bg-white px-3 py-2"
            placeholder="admin@taplytap.io"
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
        <button className="rounded-md bg-ink px-4 py-2 font-semibold text-white">Entrar al admin</button>
      </form>

      <section className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        {searchParams?.reset === "sent" ? (
          <p className="text-sm leading-6 text-emerald-700">
            Te enviamos un enlace para restablecer tu contraseña si el correo existe.
          </p>
        ) : (
          <details>
            <summary className="cursor-pointer list-none text-sm font-semibold text-mint">
              ¿Olvidaste tu contraseña?
            </summary>
            <form action={sendAdminPasswordRecovery} className="mt-4 grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Correo</span>
                <input
                  name="recovery_email"
                  type="email"
                  required
                  className="rounded-md border border-gray-300 bg-white px-3 py-2"
                  placeholder="admin@taplytap.io"
                />
              </label>
              <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-ink">
                Enviar recuperación
              </button>
            </form>
          </details>
        )}
      </section>
    </main>
  );
}

function getAdminLoginErrorMessage(error?: string, message?: string) {
  if (!error) return null;

  if (error === "invalid-email") {
    return "Ingresa un correo válido.";
  }

  if (error === "missing-password") {
    return "Ingresa tu contraseña.";
  }

  if (error === "unauthorized") {
    return "No tienes permiso para acceder al admin.";
  }

  if (error === "auth") {
    return message ?? "No pudimos iniciar sesión. Revisa tu correo y contraseña.";
  }

  if (error === "session") {
    return message ?? "No se encontró una sesión activa.";
  }

  if (error === "config") {
    return message ?? "Falta una variable de entorno necesaria para admin.";
  }

  return "No pudimos iniciar sesión.";
}
