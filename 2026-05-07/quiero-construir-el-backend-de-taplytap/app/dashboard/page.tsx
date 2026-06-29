import { redirect } from "next/navigation";
import { BoostLockedCard } from "@/components/BoostLockedCard";
import { CustomerBoostOverview } from "@/components/CustomerBoostOverview";
import { PlateCarousel, type PlateCarouselItem } from "@/components/PlateCarousel";
import { SupportWhatsAppBubble } from "@/components/SupportWhatsAppBubble";
import { logServerError } from "@/lib/server-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FeedbackItem = {
  qr_code_id: string | null;
  rating: number;
  message: string;
  created_at: string;
};

type PageProps = {
  searchParams?: {
    boost?: string;
  };
};

export default async function DashboardPage({ searchParams }: PageProps) {
  try {
    return await renderDashboardPage({ searchParams });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    logServerError("/dashboard render", error);
    throw error;
  }
}

async function renderDashboardPage({ searchParams }: PageProps) {
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

  const { data: boostSubscription, error: boostSubscriptionError } = await supabase
    .from("boost_subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (boostSubscriptionError) {
    throw new Error(boostSubscriptionError.message);
  }

  const hasActiveBoostLicense = boostSubscription?.status === "active";
  const shouldEnableBoostAfterCheckout = hasActiveBoostLicense && searchParams?.boost === "success";

  if (shouldEnableBoostAfterCheckout) {
    const { error: enableBoostError } = await supabase
      .from("qr_codes")
      .update({ boost_enabled: true })
      .eq("owner_user_id", user.id)
      .eq("boost_enabled", false);

    if (enableBoostError) {
      throw new Error(enableBoostError.message);
    }
  }

  const { data: plates, error: platesError } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });

  if (platesError) {
    throw new Error(platesError.message);
  }

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
  const latestScan = new Map<string, string>();
  const feedbackByPlate = new Map<string, FeedbackItem[]>();

  for (const scan of scans ?? []) {
    if (!scan.qr_code_id) continue;
    scanTotals.set(scan.qr_code_id, (scanTotals.get(scan.qr_code_id) ?? 0) + 1);

    if (scan.created_at >= thirtyDaysAgoIso) {
      scanRecent.set(scan.qr_code_id, (scanRecent.get(scan.qr_code_id) ?? 0) + 1);
    }

    const currentLatestScan = latestScan.get(scan.qr_code_id);

    if (!currentLatestScan || scan.created_at > currentLatestScan) {
      latestScan.set(scan.qr_code_id, scan.created_at);
    }
  }

  for (const item of feedback ?? []) {
    if (!item.qr_code_id) continue;
    const currentFeedback = feedbackByPlate.get(item.qr_code_id) ?? [];
    currentFeedback.push(item);
    feedbackByPlate.set(item.qr_code_id, currentFeedback);
  }

  const businessName = plates?.find((plate) => plate.business_name)?.business_name ?? "tu negocio";
  const feedbackCount = feedback?.length ?? 0;
  const allBoostEnabled = (plates ?? []).length > 0 && (plates ?? []).every((plate) => plate.boost_enabled);
  const carouselPlates: PlateCarouselItem[] = (plates ?? []).map((plate) => ({
    id: plate.id,
    code: plate.code,
    status: plate.status,
    businessName: plate.business_name ?? "Placa TaplyTap",
    destinationUrl: plate.destination_url,
    boostEnabled: plate.boost_enabled,
    createdAt: plate.created_at,
    scanTotal: scanTotals.get(plate.id) ?? 0,
    scanRecent: scanRecent.get(plate.id) ?? 0,
    lastScanAt: latestScan.get(plate.id) ?? null
  }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#EEF6FF_0%,#F8FAFC_34%,#FFFFFF_100%)] px-5 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-base font-bold tracking-tight text-brand">TaplyTap</p>
        <div className="taply-fade-up mt-8">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            ¡Bienvenido, <span className="text-brand">{businessName}</span>!
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slateText">
            Administra tus placas y mejora tu presencia en Google desde un solo lugar.
          </p>
        </div>

        {hasActiveBoostLicense ? (
          <CustomerBoostOverview
            feedbackCount={feedbackCount}
            allBoostEnabled={allBoostEnabled}
          />
        ) : (
          <BoostLockedCard />
        )}

        <PlateCarousel
          plates={carouselPlates}
          hasActiveBoostLicense={hasActiveBoostLicense}
        />

        <a
          href="https://taplytap.io"
          className="taply-fade-up mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-brand px-5 py-3 text-center text-base font-semibold text-white shadow-[0_18px_44px_rgba(0,109,255,0.28)] transition hover:-translate-y-0.5 hover:bg-brandHover sm:w-auto sm:min-w-80"
        >
          Comprar otra placa
        </a>
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
