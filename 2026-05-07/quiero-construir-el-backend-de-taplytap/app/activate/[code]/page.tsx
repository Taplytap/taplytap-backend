import { notFound } from "next/navigation";
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap</p>
      <h1 className="text-3xl font-bold text-ink">Activar placa {code}</h1>
      <p className="mt-3 text-gray-600">
        Registra el destino del negocio. Después de activar, los escaneos irán a esa URL.
      </p>

      {disabled ? (
        <div className="mt-8 rounded-md border border-gray-200 bg-white p-5">
          <p className="font-semibold text-ink">Esta placa ya no puede activarse desde aquí.</p>
          <p className="mt-2 text-sm text-gray-600">
            Estado actual: {qrCode.status}. Contacta a soporte si necesitas hacer cambios.
          </p>
        </div>
      ) : (
        <form action={`/api/activate/${code}`} method="post" className="mt-8 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Nombre del negocio</span>
            <input
              name="business_name"
              required
              maxLength={120}
              className="rounded-md border border-gray-300 bg-white px-3 py-2"
              placeholder="Café Central"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Email del responsable</span>
            <input
              name="owner_email"
              type="email"
              required
              maxLength={160}
              className="rounded-md border border-gray-300 bg-white px-3 py-2"
              placeholder="dueno@negocio.com"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">URL de destino</span>
            <input
              name="destination_url"
              type="url"
              required
              className="rounded-md border border-gray-300 bg-white px-3 py-2"
              placeholder="https://maps.google.com/..."
            />
          </label>
          <button className="mt-2 rounded-md bg-ink px-4 py-2 font-semibold text-white">
            Activar placa
          </button>
        </form>
      )}
    </main>
  );
}
