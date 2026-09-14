import Link from "next/link";
import { ArrowLeft, Link2 } from "lucide-react";
import { AdminProfilePlateActions } from "@/components/AdminProfilePlateActions";
import { ProfilePlateCreator } from "@/components/ProfilePlateCreator";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { QrStatus } from "@/lib/types";

type AdminProfilePageProps = {
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

export default async function AdminProfilePage({ searchParams }: AdminProfilePageProps) {
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
    .from("profile_plates")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (query) {
    const escapedQuery = escapeSupabasePattern(query);
    platesQuery = platesQuery.or(
      [
        `code.ilike.%${escapedQuery}%`,
        `owner_email.ilike.%${escapedQuery}%`,
        `business_name.ilike.%${escapedQuery}%`,
        `public_url.ilike.%${escapedQuery}%`
      ].join(",")
    );
  }

  if (["inactive", "active", "blocked"].includes(status)) {
    platesQuery = platesQuery.eq("status", status as QrStatus);
  }

  const [{ data: plates, error: platesError, count }, totalCount, activeCount, inactiveCount, blockedCount] =
    await Promise.all([
      platesQuery.range(from, to),
      countProfilePlates(),
      countProfilePlates("active"),
      countProfilePlates("inactive"),
      countProfilePlates("blocked")
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
            <Link2 size={22} />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap Admin</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Placas Perfil</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slateText">
            Genera placas únicas para perfiles multi-link. Estos registros viven en tablas separadas y no
            modifican las placas de Google, Instagram o Facebook.
          </p>
        </div>

        <section className="mt-6">
          <ProfilePlateCreator />
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-white p-5 text-sm leading-6 text-slateText shadow-sm">
          <p className="font-semibold text-ink">Formato de link</p>
          <p className="mt-2">
            Cada placa queda guardada con una URL pública como{" "}
            <span className="font-mono text-xs text-ink">https://app.taplytap.io/p/[codigo]</span>.
          </p>
          <p className="mt-2">
            Esta Fase 1 exporta CSV de links permanentes; no genera PNGs ni toca la generación actual de otros tipos de placa.
          </p>
        </section>

        <section className="mt-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Placas Perfil</h2>
            <p className="mt-1 text-sm text-slateText">Registro real guardado en Supabase.</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Total" value={totalCount} />
            <Metric label="Activas" value={activeCount} />
            <Metric label="Pendientes" value={inactiveCount} />
            <Metric label="Bloqueadas" value={blockedCount} />
          </div>

          <form className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-sm" action="/admin/profile">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Buscar</span>
                <input
                  name="q"
                  defaultValue={query}
                  className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                  placeholder="Código, negocio, propietario o link"
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
                    <th className="px-4 py-3">Negocio</th>
                    <th className="px-4 py-3">Propietario</th>
                    <th className="px-4 py-3">URL pública</th>
                    <th className="px-4 py-3">Creación</th>
                    <th className="px-4 py-3">Activación</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(plates ?? []).length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-slateText" colSpan={8}>
                        No encontramos placas Perfil.
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
                          {plate.business_name ?? "—"}
                        </td>
                        <td className="max-w-[12rem] truncate px-4 py-3 text-slateText">
                          {plate.owner_email ?? "—"}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-slateText">
                          {plate.public_url ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slateText">{formatDate(plate.created_at)}</td>
                        <td className="px-4 py-3 text-slateText">{formatDate(plate.activated_at)}</td>
                        <td className="px-4 py-3">
                          <AdminProfilePlateActions code={plate.code} publicUrl={plate.public_url} />
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

async function countProfilePlates(status?: QrStatus) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("profile_plates").select("id", { count: "exact", head: true });

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
  const previousHref = createPageHref(page - 1, query, status);
  const nextHref = createPageHref(page + 1, query, status);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-slateText shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p>
        Página <span className="font-semibold text-ink">{page}</span> de{" "}
        <span className="font-semibold text-ink">{totalPages}</span>. Mostrando{" "}
        <span className="font-semibold text-ink">{visibleFrom}-{visibleTo}</span> de{" "}
        <span className="font-semibold text-ink">{total}</span>.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Link
          href={previousHref as never}
          aria-disabled={page <= 1}
          className={`rounded-xl border border-line px-4 py-2 text-center font-semibold ${
            page <= 1 ? "pointer-events-none opacity-50" : "text-ink hover:bg-brandSoft"
          }`}
        >
          Anterior
        </Link>
        <Link
          href={nextHref as never}
          aria-disabled={page >= totalPages}
          className={`rounded-xl border border-line px-4 py-2 text-center font-semibold ${
            page >= totalPages ? "pointer-events-none opacity-50" : "text-ink hover:bg-brandSoft"
          }`}
        >
          Siguiente
        </Link>
      </div>
    </div>
  );
}

function createPageHref(page: number, query: string, status: string) {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(page, 1)));
  if (query) params.set("q", query);
  if (status !== "all") params.set("status", status);
  return `/admin/profile?${params.toString()}`;
}

function escapeSupabasePattern(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
