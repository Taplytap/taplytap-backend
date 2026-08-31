import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { ExternalLink, Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SupportPlaceIdEditor } from "@/components/SupportPlaceIdEditor";
import { requireSupport } from "@/lib/auth";
import { buildPublicQrUrl } from "@/lib/public-qr-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupportPageProps = {
  searchParams?: {
    q?: string;
  };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupportPage({ searchParams }: SupportPageProps) {
  noStore();

  const supportUser = await requireSupport();
  const query = String(searchParams?.q ?? "").trim();
  const results = query ? await searchQrCodes(query) : [];

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap Soporte</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Panel de soporte</h1>
          <p className="mt-2 text-sm text-slateText">
            Sesión activa: {supportUser.email}
          </p>
        </div>

        <form action="/support" className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Buscar placa</span>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                name="q"
                defaultValue={query}
                className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                placeholder="Código, email del propietario o ID"
              />
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brandHover">
                <Search size={16} />
                Buscar
              </button>
            </div>
          </label>
        </form>

        <section className="mt-6 grid gap-4">
          {!query ? (
            <div className="rounded-2xl border border-line bg-white p-6 text-sm leading-6 text-slateText shadow-sm">
              Busca por código de placa, email del propietario o ID para atender un caso.
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-6 text-sm leading-6 text-slateText shadow-sm">
              No encontramos placas con esa búsqueda.
            </div>
          ) : (
            results.map((qr) => {
              const publicUrl = qr.public_url ?? buildPublicQrUrl(qr.code);

              return (
                <article key={qr.id} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-mono text-xs font-semibold uppercase tracking-wide text-brand">
                        {qr.code}
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-ink">
                        {qr.business_name ?? "Placa sin nombre"}
                      </h2>
                      <p className="mt-1 text-sm text-slateText">
                        Cliente: {qr.owner_email ?? "—"}
                      </p>
                    </div>
                    <StatusBadge status={qr.status} />
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <Info label="Status" value={qr.status} />
                    <Info label="Owner user" value={qr.owner_user_id ?? "—"} mono />
                    <Info label="Place ID" value={qr.place_id ?? "—"} mono />
                    <Info label="Boost" value={qr.boost_enabled ? "Activo" : "Inactivo"} />
                    <Info label="Fecha de creación" value={formatDate(qr.created_at)} />
                    <Info label="Destination URL" value={qr.destination_url ?? "—"} />
                  </dl>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brandSoft"
                    >
                      <ExternalLink size={16} />
                      Probar placa
                    </a>
                    {qr.destination_url ? (
                      <a
                        href={qr.destination_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brandSoft"
                      >
                        <ExternalLink size={16} />
                        Abrir destino
                      </a>
                    ) : null}
                    <Link
                      href={`/support?q=${encodeURIComponent(qr.code)}` as never}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slateText"
                    >
                      Ver código
                    </Link>
                  </div>

                  <SupportPlaceIdEditor code={qr.code} initialPlaceId={qr.place_id} />
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

async function searchQrCodes(query: string) {
  const supabase = createSupabaseAdminClient();
  const escapedQuery = escapeSupabasePattern(query);
  const filters = [
    `code.ilike.%${escapedQuery}%`,
    `owner_email.ilike.%${escapedQuery}%`
  ];

  if (isUuid(query)) {
    filters.push(`id.eq.${query}`);
  }

  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .or(filters.join(","))
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function Info({
  label,
  value,
  mono = false
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slateText">{label}</dt>
      <dd className={`mt-1 break-all text-sm text-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function escapeSupabasePattern(value: string) {
  return value.replace(/[%_]/g, (character) => `\\${character}`);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
