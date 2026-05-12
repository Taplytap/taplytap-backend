import { notFound } from "next/navigation";
import { AdminQrEditForm } from "@/components/AdminQrEditForm";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: {
    code: string;
  };
};

export default async function AdminQrEditPage({ params }: PageProps) {
  await requireAdmin();

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const { data: qrCode, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!qrCode) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7faf9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap Admin</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-ink">Editar QR {qrCode.code}</h1>
          <StatusBadge status={qrCode.status} />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Actualiza el estado, destino y datos operativos de esta placa.
        </p>

        <AdminQrEditForm qrCode={qrCode} />
      </div>
    </main>
  );
}
