import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OwnerPage() {
  const supabaseAuth = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabaseAuth.auth.getUser();

  if (userError || !user?.email) {
    redirect("/owner/login?error=session&message=No%20se%20encontr%C3%B3%20una%20sesi%C3%B3n%20activa.");
  }

  const supabase = createSupabaseAdminClient();

  await supabase
    .from("qr_codes")
    .update({
      owner_user_id: user.id,
      claimed_at: new Date().toISOString()
    })
    .eq("owner_email", user.email.toLowerCase())
    .is("owner_user_id", null);

  const { data: plates, error: platesError } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });

  if (platesError) {
    throw new Error(platesError.message);
  }

  const plateIds = (plates ?? []).map((plate) => plate.id);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: scans } = plateIds.length > 0
    ? await supabase.from("scan_events").select("qr_code_id,created_at").in("qr_code_id", plateIds)
    : { data: [] };

  const totalScans = new Map<string, number>();
  const recentScans = new Map<string, number>();

  for (const scan of scans ?? []) {
    if (!scan.qr_code_id) continue;

    totalScans.set(scan.qr_code_id, (totalScans.get(scan.qr_code_id) ?? 0) + 1);

    if (scan.created_at >= thirtyDaysAgo) {
      recentScans.set(scan.qr_code_id, (recentScans.get(scan.qr_code_id) ?? 0) + 1);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7faf9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Mis placas</h1>
          <p className="mt-2 text-sm text-gray-600">{user.email}</p>
        </div>

        <div className="mt-8 overflow-hidden rounded-md border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Negocio</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Public URL</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Activada</th>
                  <th className="px-4 py-3">Scans</th>
                  <th className="px-4 py-3">30 días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(plates ?? []).map((plate) => (
                  <tr key={plate.id}>
                    <td className="px-4 py-3 font-mono text-xs text-ink">{plate.code}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={plate.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">{plate.business_name ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{plate.whatsapp ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{plate.owner_email ?? "-"}</td>
                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-gray-600">
                      {plate.public_url ?? "-"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-700">
                      {plate.destination_url ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {plate.activated_at ? new Date(plate.activated_at).toLocaleDateString("es-MX") : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{totalScans.get(plate.id) ?? 0}</td>
                    <td className="px-4 py-3 text-gray-700">{recentScans.get(plate.id) ?? 0}</td>
                  </tr>
                ))}
                {(plates ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-600" colSpan={10}>
                      No encontramos placas asociadas a este correo.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
