import Link from "next/link";
import { ExternalLink, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { buildPublicQrUrl } from "@/lib/public-qr-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { QrStatus } from "@/lib/types";

type AdminPageProps = {
  searchParams?: {
    page?: string;
    perPage?: string;
    q?: string;
    filter?: string;
  };
};

const perPageOptions = [50, 100, 250];
const adminSupportUrl =
  "https://wa.me/523327940448?text=Hola%2C%20necesito%20ayuda%20con%20el%20admin%20de%20TaplyTap.";
const filterOptions = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "blocked", label: "Bloqueados" },
  { value: "claimed", label: "Reclamados" },
  { value: "unclaimed", label: "Sin reclamar" }
];

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin();

  const requestedPerPage = Number(searchParams?.perPage ?? 50);
  const perPage = perPageOptions.includes(requestedPerPage) ? requestedPerPage : 50;
  const page = Math.max(Number(searchParams?.page ?? 1), 1);
  const query = String(searchParams?.q ?? "").trim();
  const filter = filterOptions.some((option) => option.value === searchParams?.filter)
    ? String(searchParams?.filter)
    : "all";
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const supabase = createSupabaseAdminClient();
  let qrQuery = supabase
    .from("qr_codes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: true });

  if (query) {
    const escapedQuery = escapeSupabasePattern(query);
    qrQuery = qrQuery.or(
      [
        `code.ilike.%${escapedQuery}%`,
        `business_name.ilike.%${escapedQuery}%`,
        `whatsapp.ilike.%${escapedQuery}%`,
        `owner_email.ilike.%${escapedQuery}%`,
        `status.ilike.%${escapedQuery}%`
      ].join(",")
    );
  }

  if (["active", "inactive", "blocked"].includes(filter)) {
    qrQuery = qrQuery.eq("status", filter as QrStatus);
  }

  if (filter === "claimed") {
    qrQuery = qrQuery.not("owner_user_id", "is", null);
  }

  if (filter === "unclaimed") {
    qrQuery = qrQuery.is("owner_user_id", null);
  }

  const { data: qrCodes, error: qrError, count } = await qrQuery.range(from, to);

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
  const visibleActive = (qrCodes ?? []).filter((qr) => qr.status === "active").length;
  const visibleScans = Array.from(scanCounts.values()).reduce((sum, value) => sum + value, 0);
  const lastUpdated = (qrCodes ?? []).reduce<string | null>((latest, qr) => {
    if (!latest || qr.updated_at > latest) return qr.updated_at;
    return latest;
  }, null);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap Admin</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Hola, Admin</h1>
            <p className="mt-2 text-base text-slateText">Administra tus placas TaplyTap</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link
              href={"/admin/qr" as never}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,109,255,0.18)] transition hover:bg-brandHover"
            >
              <Plus size={16} />
              Crear QR
            </Link>
            <Link
              href={"/admin/danger" as never}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-slateText transition hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={16} />
              Zona de eliminación
            </Link>
          </div>
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <AdminMetric label="Placas activas" value={visibleActive} helper="En esta vista" />
          <AdminMetric label="Escaneos" value={visibleScans} helper="En esta vista" />
          <AdminMetric
            label="Última actividad"
            value={lastUpdated ? new Date(lastUpdated).toLocaleDateString("es-MX") : "-"}
            helper="Actualización de placa"
            className="col-span-2 lg:col-span-1"
          />
        </section>

        <form className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm" action="/admin">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Buscar</span>
              <input
                name="q"
                defaultValue={query}
                className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                placeholder="Código, negocio, WhatsApp, email o status"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Filtro</span>
              <select
                name="filter"
                defaultValue={filter}
                className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <input type="hidden" name="perPage" value={perPage} />
            <button className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brandHover">
              Aplicar
            </button>
          </div>
        </form>

        <section className="mt-4 grid gap-4 md:hidden">
          {(qrCodes ?? []).length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-sm">
              <p className="font-semibold text-ink">No encontramos placas</p>
              <p className="mt-2 text-sm text-slateText">Prueba con otra búsqueda o filtro.</p>
            </div>
          ) : (
            (qrCodes ?? []).map((qr) => {
              const publicUrl = qr.public_url ?? buildPublicQrUrl(qr.code);

              return (
                <article key={qr.id} className="rounded-2xl border border-line bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-ink">{qr.business_name ?? "Placa sin activar"}</p>
                      <p className="mt-1 font-mono text-xs text-slateText">{qr.code}</p>
                    </div>
                    <StatusBadge status={qr.status} />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-brandSoft px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slateText">Escaneos</p>
                      <p className="mt-1 text-2xl font-bold text-ink">{scanCounts.get(qr.id) ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slateText">Cuenta</p>
                      <p className="mt-1 truncate text-sm font-semibold text-ink">
                        {qr.owner_email ?? "Sin reclamar"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-line bg-slate-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slateText">Link público</p>
                    <p className="mt-1 truncate font-mono text-xs text-ink">{publicUrl}</p>
                  </div>

                  <div className="mt-5 grid gap-2">
                    <a
                      href={publicUrl}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brandHover"
                    >
                      <ExternalLink size={17} />
                      Ver mi placa
                    </a>
                    <Link
                      href={`/admin/qr-codes/${qr.code}/edit`}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-brandSoft"
                    >
                      <Pencil size={17} />
                      Editar información
                    </Link>
                    <a
                      href={adminSupportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slateText transition hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <MessageCircle size={17} />
                      Soporte por WhatsApp
                    </a>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <div className="mt-4 hidden overflow-hidden rounded-2xl border border-line bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slateText">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Negocio</th>
                  <th className="px-4 py-3">Public URL</th>
                  <th className="px-4 py-3">Place ID</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Owner email</th>
                  <th className="px-4 py-3">Owner user</th>
                  <th className="px-4 py-3">Reclamada</th>
                  <th className="px-4 py-3">Scans</th>
                  <th className="px-4 py-3">URL placa</th>
                  <th className="px-4 py-3">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(qrCodes ?? []).map((qr) => (
                  <tr key={qr.id}>
                    <td className="px-4 py-3 font-mono text-xs text-ink">{qr.code}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={qr.status} />
                    </td>
                    <td className="px-4 py-3 text-slateText">{qr.business_name ?? "Sin activar"}</td>
                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-slateText">
                      {qr.public_url ?? buildPublicQrUrl(qr.code)}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 font-mono text-xs text-slateText">
                      {qr.place_id ?? "-"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slateText">
                      {qr.destination_url ?? "-"}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-slateText">
                      {qr.owner_email ?? "-"}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 font-mono text-xs text-slateText">
                      {qr.owner_user_id ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slateText">
                      {qr.claimed_at ? new Date(qr.claimed_at).toLocaleDateString("es-MX") : "-"}
                    </td>
                    <td className="px-4 py-3 text-slateText">{scanCounts.get(qr.id) ?? 0}</td>
                    <td className="px-4 py-3">
                      <a
                        href={buildPublicQrUrl(qr.code)}
                        className="font-mono text-xs font-semibold text-brand"
                      >
                        /user/{qr.code}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/qr-codes/${qr.code}/edit`}
                        className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-brandSoft"
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
          query={query}
          filter={filter}
        />
      </div>
    </main>
  );
}

function AdminMetric({
  label,
  value,
  helper,
  className = ""
}: {
  label: string;
  value: string | number;
  helper: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-4 shadow-sm ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slateText">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-slateText">{helper}</p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  perPage,
  total,
  visibleFrom,
  visibleTo,
  query,
  filter
}: {
  page: number;
  totalPages: number;
  perPage: number;
  total: number;
  visibleFrom: number;
  visibleTo: number;
  query: string;
  filter: string;
}) {
  const previousPage = Math.max(page - 1, 1);
  const nextPage = Math.min(page + 1, totalPages);
  const buildPageHref = (nextPageNumber: number, nextPerPage = perPage) => {
    const params = new URLSearchParams({
      page: String(nextPageNumber),
      perPage: String(nextPerPage)
    });

    if (query) params.set("q", query);
    if (filter !== "all") params.set("filter", filter);

    return `/admin?${params.toString()}` as never;
  };

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slateText shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        Página {page} de {totalPages}. Mostrando {visibleFrom}-{visibleTo} de {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slateText">Por página</span>
        {perPageOptions.map((option) => (
          <Link
            key={option}
            href={buildPageHref(1, option)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
              option === perPage ? "border-brand bg-brand text-white" : "border-line text-ink"
            }`}
          >
            {option}
          </Link>
        ))}
        <Link
          href={buildPageHref(previousPage)}
          className={`rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink ${
            page <= 1 ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Anterior
        </Link>
        <Link
          href={buildPageHref(nextPage)}
          className={`rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink ${
            page >= totalPages ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Siguiente
        </Link>
      </div>
    </div>
  );
}

function escapeSupabasePattern(value: string) {
  return value.replace(/[%_]/g, (character) => `\\${character}`);
}
