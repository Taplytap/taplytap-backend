import { notFound } from "next/navigation";
import { ActivatePlateForm } from "@/components/ActivatePlateForm";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidCode, normalizeCode } from "@/lib/security";

type PageProps = {
  params: {
    code: string;
  };
};

export default async function ActivatePage({ params }: PageProps) {
  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const { data: qrCode } = await supabase
    .from("qr_codes")
    .select("code,status,business_name,destination_url")
    .eq("code", code)
    .maybeSingle();

  if (!qrCode) {
    notFound();
  }

  const disabled = qrCode.status !== "inactive";

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap</p>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Activa tu placa TaplyTap
        </h1>
        <p className="mt-4 text-base leading-7 text-slateText">
          Configura tu placa para que tus clientes lleguen directo a dejarte una reseña.
        </p>
        <p className="mt-4 w-fit rounded-full border border-brandBorder bg-brandSoft px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-brand">
          Código {code}
        </p>

        {disabled ? (
          <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
            <p className="font-semibold text-ink">Esta placa ya no puede activarse desde aquí.</p>
            <p className="mt-2 text-sm leading-6 text-slateText">
              Estado actual: {qrCode.status}. Contacta a soporte si necesitas hacer cambios.
            </p>
          </div>
        ) : (
          <ActivatePlateForm code={code} />
        )}
      </div>
    </main>
  );
}
