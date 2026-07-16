import { notFound } from "next/navigation";
import { ActivateInstagramPlateForm } from "@/components/ActivateInstagramPlateForm";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: {
    code: string;
  };
};

export default async function ActivateInstagramPage({ params }: PageProps) {
  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const { data: plate } = await supabase
    .from("instagram_plates")
    .select("code,status")
    .eq("code", code)
    .maybeSingle();

  if (!plate) {
    notFound();
  }

  const authClient = createSupabaseServerClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();
  const currentUserEmail = user?.email?.toLowerCase() ?? null;
  const disabled = plate.status !== "inactive";

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap Instagram</p>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Activa tu placa de Instagram
        </h1>
        <p className="mt-4 text-base leading-7 text-slateText">
          Pega el enlace para compartir tu perfil de Instagram y conecta tu placa a tu cuenta TaplyTap.
        </p>
        <p className="mt-4 w-fit rounded-full border border-brandBorder bg-brandSoft px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-brand">
          Código {code}
        </p>

        {disabled ? (
          <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
            <p className="font-semibold text-ink">Esta placa ya no puede activarse desde aquí.</p>
            <p className="mt-2 text-sm leading-6 text-slateText">
              Estado actual: {plate.status}. Contacta a soporte si necesitas hacer cambios.
            </p>
          </div>
        ) : (
          <ActivateInstagramPlateForm code={code} currentUserEmail={currentUserEmail} />
        )}
      </div>
    </main>
  );
}
