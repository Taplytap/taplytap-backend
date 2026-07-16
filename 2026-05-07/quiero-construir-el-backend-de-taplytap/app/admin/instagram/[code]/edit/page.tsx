import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminInstagramPlateEditForm } from "@/components/AdminInstagramPlateEditForm";
import { requireAdmin } from "@/lib/auth";
import { isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: {
    code: string;
  };
};

export default async function AdminInstagramPlateEditPage({ params }: PageProps) {
  await requireAdmin();

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const { data: plate, error } = await supabase
    .from("instagram_plates")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!plate) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/instagram"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slateText hover:text-ink"
        >
          <ArrowLeft size={16} />
          Volver a placas Instagram
        </Link>
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap Admin</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Editar placa Instagram</h1>
          <p className="mt-2 text-sm leading-6 text-slateText">
            Solo puedes cambiar propietario, enlace de Instagram y estado. El código y la URL pública no se modifican.
          </p>
        </div>
        <div className="mt-6">
          <AdminInstagramPlateEditForm plate={plate} />
        </div>
      </div>
    </main>
  );
}
