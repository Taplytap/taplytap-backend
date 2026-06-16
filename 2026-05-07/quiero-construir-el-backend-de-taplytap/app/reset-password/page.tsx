import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    error?: string;
    message?: string;
    updated?: string;
  };
};

export default function ResetPasswordPage({ searchParams }: PageProps) {
  async function updatePassword(formData: FormData) {
    "use server";

    const password = String(formData.get("password") ?? "");

    if (password.length < 8) {
      redirect("/reset-password?error=password");
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      redirect(`/reset-password?error=auth&message=${encodeURIComponent(error.message)}`);
    }

    redirect("/dashboard");
  }

  const errorMessage = getResetPasswordError(searchParams?.error, searchParams?.message);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap</p>
      <h1 className="text-3xl font-bold text-ink">Crear nueva contraseña</h1>
      <p className="mt-3 text-gray-600">Ingresa una contraseña nueva para tu cuenta.</p>

      {errorMessage ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <form action={updatePassword} className="mt-8 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Nueva contraseña</span>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            className="rounded-md border border-gray-300 bg-white px-3 py-2"
            placeholder="Mínimo 8 caracteres"
          />
        </label>
        <button className="rounded-md bg-ink px-4 py-2 font-semibold text-white">Guardar contraseña</button>
      </form>
    </main>
  );
}

function getResetPasswordError(error?: string, message?: string) {
  if (!error) return null;

  if (error === "password") {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  if (error === "auth") {
    return message ?? "No pudimos actualizar tu contraseña. Abre de nuevo el link de recuperación.";
  }

  return "No pudimos actualizar tu contraseña.";
}
