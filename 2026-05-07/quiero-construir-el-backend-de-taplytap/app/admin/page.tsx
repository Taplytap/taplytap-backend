import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { buildPublicQrUrl } from "@/lib/public-qr-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminPageProps = {
  searchParams?: {
    page?: string;
    perPage?: string;
  };
};

const perPageOptions = [50, 100, 250];

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin();

  const requestedPerPage = Number(searchParams?.perPage ?? 50);
  const perPage = perPageOptions.includes(requestedPerPage) ? requestedPerPage : 50;
  const page = Math.max(Number(searchParams?.page ?? 1), 1);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const supabase = createSupabaseAdminClient();
  const { data: qrCodes, error: qrError, count } = await supabase
    .from("qr_codes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (qrError) {
    throw new Error(qrError.message);
  }

  const qrIds = (qrCodes ?? []).map((qr) => qr.id);
  const { data: scans } = qrIds.length > 0
    ? await supabase.from("scan_events").select("qr_code_id,code").in("qr_code_id", qrIds)
    : { data: [] };
  const scanCounts = new Map<string, number>();
  for (const scan of scans ?? []) {
    const key = scan.qr_code_id ?? scan.code;
    scanCounts.set(key, (scanCounts.get(key) ?? 0) + 1);
  }
  const total = count ?? 0;
  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const visibleFrom = total === 0 ? 0 : from + 1;
  const visibleTo = Math.min(to + 1, total);

  return (
    <main className="min-h-screen bg-[#f7faf9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 inline-flex rounded-md border border-mint/30 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-mint">
          Admin limpio v2
        </div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap Admin</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">Códigos QR</h1>
            <p className="mt-2 text-sm text-gray-600">
              Mostrando {visibleFrom}-{visibleTo} de {total}. Ordenados por fecha de creación ascendente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={"/admin/qr" as never}
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              Crear QR
            </Link>
            <Link
              href={"/admin/danger" as never}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              <Trash2 size={16} />
              Zona de eliminación
            </Link>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-md border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Negocio</th>
                  <th className="px-4 py-3">Public URL</th>
                  <th className="px-4 py-3">Place ID</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Owner user</th>
                  <th className="px-4 py-3">Reclamada</th>
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
                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-gray-600">
                      {qr.public_url ?? buildPublicQrUrl(qr.code)}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 font-mono text-xs text-gray-600">
                      {qr.place_id ?? "-"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-700">
                      {qr.destination_url ?? "-"}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 font-mono text-xs text-gray-600">
                      {qr.owner_user_id ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {qr.claimed_at ? new Date(qr.claimed_at).toLocaleDateString("es-MX") : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{scanCounts.get(qr.id) ?? 0}</td>
                    <td className="px-4 py-3">
                      <a
                        href={buildPublicQrUrl(qr.code)}
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
        <Pagination
          page={page}
          totalPages={totalPages}
          perPage={perPage}
          total={total}
          visibleFrom={visibleFrom}
          visibleTo={visibleTo}
        />
      </div>
    </main>
  );
}

function Pagination({
  page,
  totalPages,
  perPage,
  total,
  visibleFrom,
  visibleTo
}: {
  page: number;
  totalPages: number;
  perPage: number;
  total: number;
  visibleFrom: number;
  visibleTo: number;
}) {
  const previousPage = Math.max(page - 1, 1);
  const nextPage = Math.min(page + 1, totalPages);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
      <div>
        Página {page} de {totalPages}. Mostrando {visibleFrom}-{visibleTo} de {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Por página</span>
        {perPageOptions.map((option) => (
          <Link
            key={option}
            href={`/admin?page=1&perPage=${option}`}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
              option === perPage ? "border-ink bg-ink text-white" : "border-gray-300 text-ink"
            }`}
          >
            {option}
          </Link>
        ))}
        <Link
          href={`/admin?page=${previousPage}&perPage=${perPage}`}
          className={`rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-ink ${
            page <= 1 ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Anterior
        </Link>
        <Link
          href={`/admin?page=${nextPage}&perPage=${perPage}`}
          className={`rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-ink ${
            page >= totalPages ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Siguiente
        </Link>
      </div>
    </div>
  );
}
