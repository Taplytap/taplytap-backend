import Link from "next/link";
import { redirect } from "next/navigation";
import { BoostLockedCard } from "@/components/BoostLockedCard";
import { BoostModule } from "@/components/BoostModule";
import { DestinationUrlEditor } from "@/components/DestinationUrlEditor";
import { SupportWhatsAppBubble } from "@/components/SupportWhatsAppBubble";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { logServerError } from "@/lib/server-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FeedbackItem = {
  qr_code_id: string | null;
  rating: number;
  message: string;
  created_at: string;
};

export default async function DashboardPage() {
  try {
    return await renderDashboardPage();
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    logServerError("/dashboard render", error);
    throw error;
  }
}

async function renderDashboardPage() {
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user?.email) {
    redirect("/login?error=session&message=No%20se%20encontr%C3%B3%20una%20sesi%C3%B3n%20activa.");
  }

  const supabase = createSupabaseAdminClient();
  const ownerEmail = user.email.toLowerCase();

  await supabase
    .from("qr_codes")
    .update({
      owner_user_id: user.id,
      claimed_at: new Date().toISOString()
    })
    .eq("owner_email", ownerEmail)
    .is("owner_user_id", null);

  const { data: plates, error: platesError } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });

  if (platesError) {
    throw new Error(platesError.message);
  }

  const { data: boostSubscription, error: boostSubscriptionError } = await supabase
    .from("boost_subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (boostSubscriptionError) {
    throw new Error(boostSubscriptionError.message);
  }

  const hasActiveBoostLicense = boostSubscription?.status === "active";
  const plateIds = (plates ?? []).map((plate) => plate.id);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  const { data: scans, error: scansError } = plateIds.length > 0
    ? await supabase
        .from("scan_events")
        .select("qr_code_id,created_at")
        .in("qr_code_id", plateIds)
    : { data: [], error: null };

  if (scansError) {
    throw new Error(scansError.message);
  }

  const { data: feedback, error: feedbackError } = plateIds.length > 0
    ? await supabase
        .from("boost_feedback")
        .select("qr_code_id,rating,message,created_at")
        .in("qr_code_id", plateIds)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [], error: null };

  if (feedbackError) {
    throw new Error(feedbackError.message);
  }

  const scanTotals = new Map<string, number>();
  const scanRecent = new Map<string, number>();
  const feedbackByPlate = new Map<string, FeedbackItem[]>();

  for (const scan of scans ?? []) {
    if (!scan.qr_code_id) continue;
    scanTotals.set(scan.qr_code_id, (scanTotals.get(scan.qr_code_id) ?? 0) + 1);

    if (scan.created_at >= thirtyDaysAgoIso) {
      scanRecent.set(scan.qr_code_id, (scanRecent.get(scan.qr_code_id) ?? 0) + 1);
    }
  }

  for (const item of feedback ?? []) {
    if (!item.qr_code_id) continue;
    const currentFeedback = feedbackByPlate.get(item.qr_code_id) ?? [];
    currentFeedback.push(item);
    feedbackByPlate.set(item.qr_code_id, currentFeedback);
  }

  const totalPlates = plates?.length ?? 0;
  const activePlates = (plates ?? []).filter((plate) => plate.status === "active").length;
  const totalScans = Array.from(scanTotals.values()).reduce((total, count) => total + count, 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#EEF6FF_0%,#F8FAFC_36%,#FFFFFF_100%)] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap</p>
        <div className="taply-fade-up mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">Mis placas</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slateText">
              Consulta tus placas activas, su estado y los escaneos registrados.
            </p>
          </div>
          <a
            href="https://taplytap.io"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,109,255,0.24)] transition hover:-translate-y-0.5 hover:bg-brandHover hover:shadow-[0_22px_44px_rgba(0,109,255,0.28)]"
          >
            Comprar otra placa
          </a>
        </div>

        <section className="taply-fade-up mt-7 grid gap-3 sm:grid-cols-3">
          <Metric label="Placas" value={totalPlates} />
          <Metric label="Activas" value={activePlates} />
          <Metric label="Scans totales" value={totalScans} />
        </section>

        {(plates ?? []).length === 0 ? (
          <Card className="taply-fade-up mt-8 overflow-hidden rounded-[2rem] p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brandSoft text-xl font-black text-brand">
              T
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink">Aún no encontramos placas.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slateText">
              Verifica que la placa haya sido activada con el mismo email con el que iniciaste sesión.
            </p>
            <a
              href="https://taplytap.io"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,109,255,0.22)] transition hover:bg-brandHover"
            >
              Comprar una placa
            </a>
          </Card>
        ) : (
          <section className="mt-8 grid gap-5">
            {(plates ?? []).map((plate, index) => (
              <Card
                key={plate.id}
                className="taply-fade-up rounded-[1.75rem] border border-white bg-white/95 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(15,23,42,0.11)] sm:p-6"
                style={{ animationDelay: `${Math.min(index * 60, 240)}ms` }}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-ink">
                      {plate.business_name ?? "Placa TaplyTap"}
                    </h2>
                    <p className="mt-2 inline-flex rounded-full bg-slate-50 px-3 py-1 font-mono text-xs font-semibold text-slateText">
                      {plate.code}
                    </p>
                  </div>
                  <Badge className={getStatusBadgeClass(plate.status)}>
                    {getStatusLabel(plate.status)}
                  </Badge>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric label="Scans totales" value={scanTotals.get(plate.id) ?? 0} />
                  <Metric label="Scans últimos 30 días" value={scanRecent.get(plate.id) ?? 0} />
                  <Metric label="WhatsApp" value={plate.whatsapp ?? "-"} />
                </dl>

                {hasActiveBoostLicense ? (
                  <BoostModule
                    code={plate.code}
                    initialEnabled={plate.boost_enabled}
                    feedbackItems={feedbackByPlate.get(plate.id) ?? []}
                  />
                ) : (
                  <BoostLockedCard />
                )}

                <PlaceIdCard
                  code={plate.code}
                  destinationUrl={plate.destination_url}
                />

                <div className="mt-5 flex flex-wrap gap-3">
                  {plate.destination_url ? (
                    <a
                      href={plate.destination_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft sm:flex-none"
                    >
                      Abrir link de reseña
                    </a>
                  ) : null}
                  <Link
                    href={`/user/${plate.code}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft sm:flex-none"
                  >
                    Probar placa
                  </Link>
                </div>
              </Card>
            ))}
          </section>
        )}
      </div>
      <SupportWhatsAppBubble />
    </main>
  );
}

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function PlaceIdCard({
  code,
  destinationUrl
}: {
  code: string;
  destinationUrl: string | null;
}) {
  const placeId = extractPlaceId(destinationUrl ?? "");

  return (
    <Card className="mt-4 rounded-2xl p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">Place ID de Google</h3>
          <p className="mt-1 truncate font-mono text-xs text-slateText">
            {placeId || "Aún no hay Place ID configurado."}
          </p>
        </div>
        <DestinationUrlEditor
          code={code}
          initialDestinationUrl={destinationUrl}
          buttonLabel="Cambiar"
        />
      </div>
    </Card>
  );
}

function extractPlaceId(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return "";

  try {
    const url = new URL(trimmedValue);
    const placeId = url.searchParams.get("placeid");

    if (placeId) {
      return placeId.replace(/\s/g, "");
    }
  } catch {
    // Plain Place IDs are expected. URLs are handled only when parsing succeeds.
  }

  const match = trimmedValue.match(/[?&]placeid=([^&\s]+)/i);

  if (match?.[1]) {
    return decodeURIComponent(match[1]).replace(/\s/g, "");
  }

  return trimmedValue.replace(/\s/g, "");
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-brandBorder bg-white/85 px-4 py-4 shadow-[0_14px_34px_rgba(0,109,255,0.06)]">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slateText">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</dd>
    </div>
  );
}

function getStatusLabel(status: string) {
  if (status === "active") return "Activa";
  if (status === "inactive") return "Pendiente";
  if (status === "blocked") return "Bloqueada";
  return status;
}

function getStatusBadgeClass(status: string) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "blocked") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-brandBorder bg-brandSoft text-brand";
}
