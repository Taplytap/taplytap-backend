import Link from "next/link";
import { Pencil } from "lucide-react";
import { BatchQrCreator } from "@/components/BatchQrCreator";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/env";

export default async function AdminPage() {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const [{ data: qrCodes, error: qrError }, { data: scans }] = await Promise.all([
    supabase.from("qr_codes").select("*").order("created_at", { ascending: false }).limit(250),
    supabase.from("scan_events").select("qr_code_id,code").limit(10000)
  ]);

  if (qrError) {
    throw new Error(qrError.message);
  }

  const scanCounts = new Map<string, number>();
  for (const scan of scans ?? []) {
    const key = scan.qr_code_id ?? scan.code;
    scanCounts.set(key, (scanCounts.get(key) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen bg-[#f7faf9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap Admin</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">Códigos QR</h1>
            <p className="mt-2 text-sm text-gray-600">
              Mostrando hasta 250 placas recientes. Los escaneos se registran por cada visita.
            </p>
          </div>
          <BatchQrCreator />
        </div>

        <div className="mt-8 overflow-hidden rounded-md border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Negocio</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Scans</th>
                  <th className="px-4 py-3">URL placa</th>
                  <th className="px-4 py-3">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(qrCodes ?? []).map((qr) => (
                  <tr key={qr.id}>
                    <td className="px-4 py-3 font-mono text-xs text-ink">{qr.code}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={qr.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">{qr.business_name ?? "Sin activar"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-700">
                      {qr.destination_url ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{scanCounts.get(qr.id) ?? 0}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`${getSiteUrl()}/user/${qr.code}`}
                        className="font-mono text-xs font-semibold text-mint"
                      >
                        /user/{qr.code}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/qr-codes/${qr.code}/edit`}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        <Pencil size={14} />
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
