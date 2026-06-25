import Link from "next/link";
import { redirect } from "next/navigation";
import { BoostToggle } from "@/components/BoostToggle";
import { DestinationUrlEditor } from "@/components/DestinationUrlEditor";
import { SupportWhatsAppBubble } from "@/components/SupportWhatsAppBubble";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FeedbackItem = {
  qr_code_id: string | null;
  rating: number;
  message: string;
  created_at: string;
};

export default async function DashboardPage() {
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

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap</p>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-ink">Mis placas</h1>
            <p className="mt-2 text-base leading-7 text-slateText">
              Consulta tus placas activas, su estado y los escaneos registrados.
            </p>
          </div>
          <a
            href="https://taplytap.io"
            className="rounded-xl bg-brand px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,109,255,0.24)] transition hover:bg-brandHover"
          >
            Comprar otra placa
          </a>
        </div>

        {(plates ?? []).length === 0 ? (
          <section className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Aún no encontramos placas para este correo.</h2>
            <p className="mt-2 text-sm leading-6 text-slateText">
              Verifica que la placa haya sido activada con el mismo email con el que iniciaste sesión.
            </p>
          </section>
        ) : (
          <section className="mt-8 grid gap-4">
            {(plates ?? []).map((plate) => (
              <article key={plate.id} className="rounded-2xl border border-line bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-ink">
                      {plate.business_name ?? "Placa TaplyTap"}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-slateText">{plate.code}</p>
                  </div>
                  <span className="w-fit rounded-full border border-brandBorder bg-brandSoft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
                    {plate.status}
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric label="Scans totales" value={scanTotals.get(plate.id) ?? 0} />
                  <Metric label="Scans últimos 30 días" value={scanRecent.get(plate.id) ?? 0} />
                  <Metric label="WhatsApp" value={plate.whatsapp ?? "-"} />
                </dl>

                <div className="mt-5">
                  <BoostToggle code={plate.code} initialEnabled={plate.boost_enabled} />
                </div>

                <div className="mt-4">
                  <DestinationUrlEditor
                    code={plate.code}
                    initialDestinationUrl={plate.destination_url}
                  />
                </div>

                <FeedbackList items={feedbackByPlate.get(plate.id) ?? []} />

                <div className="mt-5 flex flex-wrap gap-3">
                  {plate.destination_url ? (
                    <a
                      href={plate.destination_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brandSoft"
                    >
                      Abrir link de reseña
                    </a>
                  ) : null}
                  <Link
                    href={`/user/${plate.code}`}
                    className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brandSoft"
                  >
                    Probar placa
                  </Link>
                  <a
                    href="https://taplytap.io"
                    className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brandHover"
                  >
                    Comprar otra placa
                  </a>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
      <SupportWhatsAppBubble />
    </main>
  );
}

function FeedbackList({
  items
}: {
  items: Array<{
    rating: number;
    message: string;
    created_at: string;
  }>;
}) {
  return (
    <section className="mt-4 rounded-xl border border-line bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">Comentarios Boost</h3>
        <span className="rounded-full bg-brandSoft px-2.5 py-1 text-xs font-semibold text-brand">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slateText">Aún no hay comentarios.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {items.slice(0, 3).map((item) => (
            <article key={`${item.created_at}-${item.rating}`} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{item.rating} estrellas</p>
                <time className="text-xs text-slateText">
                  {new Date(item.created_at).toLocaleDateString("es-MX")}
                </time>
              </div>
              <p className="mt-2 text-sm leading-6 text-slateText">{item.message}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-brandBorder bg-brandSoft px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slateText">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-ink">{value}</dd>
    </div>
  );
}
