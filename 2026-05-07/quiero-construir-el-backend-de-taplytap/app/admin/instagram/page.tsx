import Link from "next/link";
import { ArrowLeft, Instagram } from "lucide-react";
import { AdminInstagramPlateActions } from "@/components/AdminInstagramPlateActions";
import { InstagramPlateCreator } from "@/components/InstagramPlateCreator";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { QrStatus } from "@/lib/types";

type AdminInstagramPageProps = {
  searchParams?: {
    page?: string;
    q?: string;
    status?: string;
  };
};

const perPage = 25;
const statusFilters = [
  { value: "all", label: "Todas" },
  { value: "inactive", label: "Pendientes" },
  { value: "active", label: "Activas" },
  { value: "blocked", label: "Bloqueadas" }
];

export default async function AdminInstagramPage({ searchParams }: AdminInstagramPageProps) {
  await requireAdmin();

  const page = Math.max(Number(searchParams?.page ?? 1), 1);
  const query = String(searchParams?.q ?? "").trim();
  const status = statusFilters.some((filter) => filter.value === searchParams?.status)
    ? String(searchParams?.status)
    : "all";
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const supabase = createSupabaseAdminClient();
  let platesQuery = supabase
    .from("instagram_plates")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (query) {
    const escapedQuery = escapeSupabasePattern(query);
    platesQuery = platesQuery.or(
      [
        `code.ilike.%${escapedQuery}%`,
        `owner_email.ilike.%${escapedQuery}%`,
        `destination_url.ilike.%${escapedQuery}%`
      ].join(",")
    );
  }

  if (["inactive", "active", "blocked"].includes(status)) {
    platesQuery = platesQuery.eq("status", status as QrStatus);
  }

  const [{ data: plates, error: platesError, count }, totalCount, activeCount, inactiveCount, blockedCount] =
    await Promise.all([
      platesQuery.range(from, to),
      countInstagramPlates(),
      countInstagramPlates("active"),
      countInstagramPlates("inactive"),
      countInstagramPlates("blocked")
    ]);

  if (platesError) {
    throw new Error(platesError.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const visibleFrom = total === 0 ? 0 : from + 1;
  const visibleTo = Math.min(to + 1, total);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slateText hover:text-ink"
        >
          <ArrowLeft size={16} />
          Volver al dashboard
        </Link>

        <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brandSoft text-brand">
            <Instagram size={22} />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap Admin</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Placas Instagram</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slateText">
            Genera placas únicas para producción física de Instagram. Estos registros viven separados de
            las placas de reseñas y no cambian ningún QR público existente.
          </p>
        </div>

        <section className="mt-6">
          <InstagramPlateCreator />
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-white p-5 text-sm leading-6 text-slateText shadow-sm">
          <p className="font-semibold text-ink">Formato de link</p>
          <p className="mt-2">
            Cada placa queda guardada con una URL pública como{" "}
            <span className="font-mono text-xs text-ink">https://app.taplytap.io/instagram/[codigo]</span>.
          </p>
          <p className="mt-2">
            El CSV siempre sale desde registros guardados en Supabase. La configuración del destino de Instagram se
            mantiene separada para proteger las placas de reseñas que ya están en producción.
          </p>
        </section>

        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink">Placas de Instagram</h2>
              <p className="mt-1 text-sm text-slateText">Registro real guardado en Supabase.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Total" value={totalCount} />
            <Metric label="Activas" value={activeCount} />
            <Metric label="Pendientes" value={inactiveCount} />
            <Metric label="Bloqueadas" value={blockedCount} />
          </div>

          <form className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-sm" action="/admin/instagram">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Buscar</span>
                <input
                  name="q"
                  defaultValue={query}
                  className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                  placeholder="Código, propietario o enlace"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Estado</span>
                <select
                  name="status"
                  defaultValue={status}
                  className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                >
                  {statusFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brandHover">
                Aplicar
              </button>
            </div>
          </form>

          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slateText">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Propietario</th>
                    <th className="px-4 py-3">Enlace configurado</th>
                    <th className="px-4 py-3">Creación</th>
                    <th className="px-4 py-3">Activación</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(plates ?? []).length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-slateText" colSpan={7}>
                        No encontramos placas de Instagram.
                      </td>
                    </tr>
                  ) : (
                    (plates ?? []).map((plate) => (
                      <tr key={plate.id}>
                        <td className="px-4 py-3 font-mono text-xs text-ink">{plate.code}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={plate.status} />
                        </td>
                        <td className="max-w-[12rem] truncate px-4 py-3 text-slateText">
                          {plate.owner_email ?? "—"}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-slateText">
                          {plate.destination_url ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slateText">{formatDate(plate.created_at)}</td>
                        <td className="px-4 py-3 text-slateText">{formatDate(plate.activated_at)}</td>
                        <td className="px-4 py-3">
                          <AdminInstagramPlateActions
                            code={plate.code}
                            publicUrl={plate.public_url}
                            destinationUrl={plate.destination_url}
                            status={plate.status}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            visibleFrom={visibleFrom}
            visibleTo={visibleTo}
            query={query}
            status={status}
          />
        </section>
      </div>
    </main>
  );
}

async function countInstagramPlates(status?: QrStatus) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("instagram_plates")
    .select("id", { count: "exact", head: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slateText">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  visibleFrom,
  visibleTo,
  query,
  status
}: {
  page: number;
  totalPages: number;
  total: number;
  visibleFrom: number;
  visibleTo: number;
  query: string;
  status: string;
}) {
  const previousPage = Math.max(page - 1, 1);
  const nextPage = Math.min(page + 1, totalPages);
  const buildHref = (nextPageNumber: number) => {
    const params = new URLSearchParams({
      page: String(nextPageNumber)
    });

    if (query) params.set("q", query);
    if (status !== "all") params.set("status", status);

    return `/admin/instagram?${params.toString()}` as never;
  };

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slateText shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        Página {page} de {totalPages}. Mostrando {visibleFrom}-{visibleTo} de {total}
      </div>
      <div className="flex gap-2">
        <Link
          href={buildHref(previousPage)}
          className={`rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink ${
            page <= 1 ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Anterior
        </Link>
        <Link
          href={buildHref(nextPage)}
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

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function escapeSupabasePattern(value: string) {
  return value.replace(/[%_]/g, (character) => `\\${character}`);
}
