import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { BoostRatingGate } from "@/components/BoostRatingGate";
import { getSupportEmail } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashIp, isSafeDestinationUrl, isValidCode, normalizeCode } from "@/lib/security";
import type { QrStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BOOST_TEST_CODE = "szeacqhj";

type PageProps = {
  params: {
    code: string;
  };
};

export default async function UserQrPage({ params }: PageProps) {
  noStore();

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return <ScanState title="Código inválido" message="Revisa que la URL de la placa esté completa." />;
  }

  const supabase = createSupabaseAdminClient();
  const { data: qrCode, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    return <ScanState title="No pudimos leer la placa" message="Intenta de nuevo o contacta a soporte." />;
  }

  await recordScan({
    qrCodeId: qrCode?.id ?? null,
    code,
    status: qrCode?.status ?? "not_found",
    destinationUrl: qrCode?.destination_url ?? null
  });

  if (!qrCode) {
    return <ScanState title="Placa no encontrada" message="Este código no existe en TaplyTap." />;
  }

  if (qrCode.status === "inactive") {
    redirect(`/activate/${code}`);
  }

  if (qrCode.status === "blocked") {
    return (
      <ScanState
        title="Placa bloqueada"
        message="Esta placa necesita revisión. Contacta a soporte de TaplyTap para reactivarla."
      />
    );
  }

  if (!qrCode.destination_url || !isSafeDestinationUrl(qrCode.destination_url)) {
    return (
      <ScanState
        title="Destino no disponible"
        message="La placa está activa, pero su URL de destino no es válida."
      />
    );
  }

  if (code === BOOST_TEST_CODE && qrCode.boost_enabled) {
    return (
      <BoostRatingGate
        code={code}
        businessName={qrCode.business_name}
        destinationUrl={qrCode.destination_url}
      />
    );
  }

  redirect(qrCode.destination_url);
}

async function recordScan({
  qrCodeId,
  code,
  status,
  destinationUrl
}: {
  qrCodeId: string | null;
  code: string;
  status: QrStatus | "not_found";
  destinationUrl: string | null;
}) {
  const requestHeaders = headers();
  const supabase = createSupabaseAdminClient();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await supabase.from("scan_events").insert({
    qr_code_id: qrCodeId ?? undefined,
    code,
    status_at_scan: status,
    destination_url: destinationUrl,
    user_agent: requestHeaders.get("user-agent"),
    referrer: requestHeaders.get("referer"),
    ip_hash: hashIp(forwardedFor)
  });
}

function ScanState({ title, message }: { title: string; message: string }) {
  const supportEmail = getSupportEmail();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap</p>
      <h1 className="text-3xl font-bold text-ink">{title}</h1>
      <p className="mt-4 text-gray-600">{message}</p>
      <a href={`mailto:${supportEmail}`} className="mt-8 text-sm font-semibold text-mint">
        Contactar soporte
      </a>
    </main>
  );
}
