import { redirect } from "next/navigation";
import { ActivateProfilePlateForm } from "@/components/ActivateProfilePlateForm";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActivateProfilePageProps = {
  params: {
    code: string;
  };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ActivateProfilePage({ params }: ActivateProfilePageProps) {
  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return <ActivationShell title="Código inválido" message="Revisa que el enlace de tu placa esté completo." />;
  }

  const supabase = createSupabaseAdminClient();
  const { data: plate, error } = await supabase
    .from("profile_plates")
    .select("code,status,owner_user_id")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!plate) {
    return <ActivationShell title="Placa no encontrada" message="No pudimos encontrar esta placa Perfil." />;
  }

  if (plate.status === "active") {
    redirect(`/p/${code}`);
  }

  if (plate.status === "blocked") {
    return (
      <ActivationShell
        title="Placa bloqueada"
        message="Esta placa requiere ayuda de soporte TaplyTap para poder activarse."
      />
    );
  }

  const authClient = createSupabaseServerClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-xl">
        <p className="text-sm font-bold tracking-tight text-brand">TaplyTap</p>
        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Activa tu perfil TaplyTap</h1>
          <p className="mt-3 text-base leading-7 text-slateText">
            Configura los enlaces principales de tu negocio para que tus clientes los encuentren en una sola página.
          </p>
        </div>
        <ActivateProfilePlateForm code={code} currentUserEmail={user?.email ?? null} />
      </section>
    </main>
  );
}

function ActivationShell({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-6 shadow-sm">
        <p className="text-sm font-bold tracking-tight text-brand">TaplyTap</p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slateText">{message}</p>
        <a
          href="https://wa.me/523327940448?text=Hola%2C%20necesito%20ayuda%20con%20mi%20placa%20TaplyTap."
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          Contactar soporte
        </a>
      </section>
    </main>
  );
}
