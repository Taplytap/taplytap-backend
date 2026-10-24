import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { ExternalLink, LogOut, Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { requireSupport } from "@/lib/auth";
import {
  buildFacebookPlateUrl,
  buildInstagramPlateUrl,
  buildProfilePlateUrl,
  buildPublicQrUrl
} from "@/lib/public-qr-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { QrStatus } from "@/lib/types";

type SupportPlateType = "all" | "google" | "instagram" | "facebook" | "profile";

type SupportPlateResult = {
  id: string;
  type: Exclude<SupportPlateType, "all">;
  code: string;
  status: QrStatus;
  name: string | null;
  ownerEmail: string | null;
  publicUrl: string;
  detail: string | null;
  createdAt: string;
};

type SupportPageProps = {
  searchParams?: {
    q?: string;
    type?: string;
  };
};

const plateTypes: Array<{ value: SupportPlateType; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "google", label: "Google" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "profile", label: "Perfiles" }
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupportPage({ searchParams }: SupportPageProps) {
  noStore();

  const supportUser = await requireSupport();
  const query = String(searchParams?.q ?? "").trim();
  const selectedType = normalizePlateType(searchParams?.type);
  const results = await searchSupportPlates(query, selectedType);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 pb-28 pt-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">TaplyTap Operaciones</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Buscar una placa</h1>
            <p className="mt-2 text-sm text-slateText">
              Google, Instagram, Facebook y perfiles desde un solo buscador.
            </p>
            <p className="mt-1 text-xs text-slateText">Sesión: {supportUser.email}</p>
          </div>
          <form action="/api/auth/sign-out" method="post">
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-slateText shadow-sm"
            >
              <LogOut size={18} />
            </button>
          </form>
        </header>

        <form action="/support" className="sticky top-3 z-10 mt-7 rounded-2xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
          <input type="hidden" name="type" value={selectedType} />
          <label className="sr-only" htmlFor="support-search">Buscar placa</label>
          <div className="flex items-center gap-2">
            <Search size={19} className="ml-2 shrink-0 text-slateText" />
            <input
              id="support-search"
              name="q"
              defaultValue={query}
              className="min-h-12 min-w-0 flex-1 border-0 bg-transparent px-1 text-base text-ink outline-none placeholder:text-slateText/60"
              placeholder="Código, negocio, usuario, teléfono o correo"
              autoComplete="off"
            />
            <button className="min-h-11 shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brandHover">
              Buscar
            </button>
          </div>
        </form>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Tipos de placa">
          {plateTypes.map((type) => (
            <Link
              key={type.value}
              href={buildFilterHref(type.value, query)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                selectedType === type.value
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-slateText hover:border-brandBorder hover:text-brand"
              }`}
            >
              {type.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">
            {query ? `Resultados para “${query}”` : "Placas recientes"}
          </p>
          <span className="text-xs font-medium text-slateText">{results.length} resultados</span>
        </div>

        <section className="mt-3 grid gap-3">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-7 text-center shadow-sm">
              <Search size={24} className="mx-auto text-slateText" />
              <p className="mt-3 font-semibold text-ink">No encontramos ninguna placa</p>
              <p className="mt-1 text-sm leading-6 text-slateText">
                Revisa el código, correo, teléfono o nombre e intenta de nuevo.
              </p>
            </div>
          ) : (
            results.map((plate) => (
              <article key={`${plate.type}-${plate.id}`} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <PlateTypeBadge type={plate.type} />
                      <span className="font-mono text-xs font-semibold text-slateText">{plate.code}</span>
                    </div>
                    <h2 className="mt-3 truncate text-lg font-bold text-ink">{plate.name || "Placa sin nombre"}</h2>
                    <p className="mt-1 truncate text-sm text-slateText">{plate.ownerEmail || "Sin propietario"}</p>
                    {plate.detail ? <p className="mt-1 truncate text-sm text-slateText">{plate.detail}</p> : null}
                  </div>
                  <StatusBadge status={plate.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/support/${plate.type}/${plate.code}` as never}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brandHover"
                  >
                    Editar placa
                  </Link>
                  <a
                    href={plate.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-brandSoft"
                  >
                    <ExternalLink size={16} />
                    Probar
                  </a>
                </div>
              </article>
            ))
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-slateText">
          Este panel permite editar placas existentes. La creación y eliminación están deshabilitadas para Operaciones.
        </p>
      </div>
    </main>
  );
}

async function searchSupportPlates(query: string, selectedType: SupportPlateType) {
  const searches: Array<Promise<SupportPlateResult[]>> = [];

  if (selectedType === "all" || selectedType === "google") searches.push(searchGooglePlates(query));
  if (selectedType === "all" || selectedType === "instagram") searches.push(searchInstagramPlates(query));
  if (selectedType === "all" || selectedType === "facebook") searches.push(searchFacebookPlates(query));
  if (selectedType === "all" || selectedType === "profile") searches.push(searchProfilePlates(query));

  const groups = await Promise.all(searches);
  const balancedGroups = selectedType === "all" && !query
    ? groups.flatMap((group) => group.slice(0, 8))
    : groups.flat();
  const limit = 50;

  return balancedGroups
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, limit);
}

async function searchGooglePlates(query: string): Promise<SupportPlateResult[]> {
  const supabase = createSupabaseAdminClient();
  let request = supabase.from("qr_codes").select("*").order("created_at", { ascending: false }).limit(50);
  const filter = buildSearchFilter(query, [
    "code", "business_name", "contact_name", "whatsapp", "owner_email", "public_url", "destination_url"
  ]);
  if (filter) request = request.or(filter);
  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return (data ?? []).map((plate) => ({
    id: plate.id,
    type: "google",
    code: plate.code,
    status: plate.status,
    name: plate.business_name,
    ownerEmail: plate.owner_email,
    publicUrl: plate.public_url ?? buildPublicQrUrl(plate.code),
    detail: plate.whatsapp,
    createdAt: plate.created_at
  }));
}

async function searchInstagramPlates(query: string): Promise<SupportPlateResult[]> {
  const supabase = createSupabaseAdminClient();
  let request = supabase.from("instagram_plates").select("*").order("created_at", { ascending: false }).limit(50);
  const filter = buildSearchFilter(query, [
    "code", "business_name", "instagram_handle", "owner_email", "public_url", "destination_url"
  ]);
  if (filter) request = request.or(filter);
  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return (data ?? []).map((plate) => ({
    id: plate.id,
    type: "instagram",
    code: plate.code,
    status: plate.status,
    name: plate.business_name,
    ownerEmail: plate.owner_email,
    publicUrl: plate.public_url ?? buildInstagramPlateUrl(plate.code),
    detail: plate.instagram_handle,
    createdAt: plate.created_at
  }));
}

async function searchFacebookPlates(query: string): Promise<SupportPlateResult[]> {
  const supabase = createSupabaseAdminClient();
  let request = supabase.from("facebook_plates").select("*").order("created_at", { ascending: false }).limit(50);
  const filter = buildSearchFilter(query, [
    "code", "business_name", "facebook_handle", "owner_email", "public_url", "destination_url"
  ]);
  if (filter) request = request.or(filter);
  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return (data ?? []).map((plate) => ({
    id: plate.id,
    type: "facebook",
    code: plate.code,
    status: plate.status,
    name: plate.business_name,
    ownerEmail: plate.owner_email,
    publicUrl: plate.public_url ?? buildFacebookPlateUrl(plate.code),
    detail: plate.facebook_handle,
    createdAt: plate.created_at
  }));
}

async function searchProfilePlates(query: string): Promise<SupportPlateResult[]> {
  const supabase = createSupabaseAdminClient();
  let request = supabase.from("profile_plates").select("*").order("created_at", { ascending: false }).limit(50);
  const filter = buildSearchFilter(query, ["code", "business_name", "description", "owner_email", "public_url"]);
  if (filter) request = request.or(filter);
  const { data, error } = await request;
  if (error) throw new Error(error.message);

  return (data ?? []).map((plate) => ({
    id: plate.id,
    type: "profile",
    code: plate.code,
    status: plate.status,
    name: plate.business_name,
    ownerEmail: plate.owner_email,
    publicUrl: plate.public_url ?? buildProfilePlateUrl(plate.code),
    detail: plate.description,
    createdAt: plate.created_at
  }));
}

function buildSearchFilter(query: string, columns: string[]) {
  if (!query) return "";
  const value = query.replace(/[\\%,()\"]+/g, " ").trim();
  if (!value) return "";
  const filters = columns.map((column) => `${column}.ilike.%${value}%`);
  const status = getStatusSearch(value);
  if (status) filters.push(`status.eq.${status}`);
  return filters.join(",");
}

function getStatusSearch(value: string): QrStatus | null {
  const normalized = value.trim().toLowerCase();
  if (["active", "activo", "activa", "activos", "activas"].includes(normalized)) return "active";
  if (["inactive", "inactivo", "inactiva", "pendiente", "pendientes"].includes(normalized)) return "inactive";
  if (["blocked", "bloqueado", "bloqueada", "bloqueados", "bloqueadas"].includes(normalized)) return "blocked";
  return null;
}

function normalizePlateType(value?: string): SupportPlateType {
  return plateTypes.some((type) => type.value === value) ? (value as SupportPlateType) : "all";
}

function buildFilterHref(type: SupportPlateType, query: string) {
  const params = new URLSearchParams({ type });
  if (query) params.set("q", query);
  return `/support?${params.toString()}` as never;
}

function PlateTypeBadge({ type }: { type: Exclude<SupportPlateType, "all"> }) {
  const labels = {
    google: "Google",
    instagram: "Instagram",
    facebook: "Facebook",
    profile: "Perfil"
  };

  return <span className="rounded-full bg-brandSoft px-2.5 py-1 text-xs font-bold text-brand">{labels[type]}</span>;
}
