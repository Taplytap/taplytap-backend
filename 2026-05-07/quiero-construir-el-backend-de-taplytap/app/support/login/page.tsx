import { redirect } from "next/navigation";
import { getSupportEmails } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    error?: string;
    message?: string;
  };
};

export default function SupportLoginPage({ searchParams }: PageProps) {
  async function signInSupport(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      redirect("/support/login?error=invalid-email");
    }

    if (!password) {
      redirect("/support/login?error=missing-password");
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user?.email) {
      redirect(`/support/login?error=auth&message=${encodeURIComponent(error?.message ?? "No se pudo iniciar sesión.")}`);
    }

    const isSupport = getSupportEmails().includes(data.user.email.toLowerCase());

    if (!isSupport) {
      await supabase.auth.signOut();
      redirect("/support/login?error=unauthorized");
    }

    redirect("/support");
  }

  const errorMessage = getSupportLoginErrorMessage(searchParams?.error, searchParams?.message);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap Soporte</p>
      <h1 className="text-3xl font-bold text-ink">Entrar a soporte</h1>
      <p className="mt-3 text-gray-600">Acceso exclusivo para personal autorizado.</p>

      {errorMessage ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <form action={signInSupport} className="mt-8 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Correo</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-gray-300 bg-white px-3 py-2"
            placeholder="soporte@taplytap.io"
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
        <button className="rounded-md bg-ink px-4 py-2 font-semibold text-white">Entrar a soporte</button>
      </form>
    </main>
  );
}

function getSupportLoginErrorMessage(error?: string, message?: string) {
  if (!error) return null;

  if (error === "invalid-email") {
    return "Ingresa un correo válido.";
  }

  if (error === "missing-password") {
    return "Ingresa tu contraseña.";
  }

  if (error === "unauthorized") {
    return "No tienes permiso para acceder a soporte.";
  }

  if (error === "auth") {
    return message ?? "No pudimos iniciar sesión. Revisa tu correo y contraseña.";
  }

  if (error === "session") {
    return message ?? "No se encontró una sesión activa.";
  }

  if (error === "config") {
    return message ?? "Falta una variable de entorno necesaria para soporte.";
  }

  return "No pudimos iniciar sesión.";
}
