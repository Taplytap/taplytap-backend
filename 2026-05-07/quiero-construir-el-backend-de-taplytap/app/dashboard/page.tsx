import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const scanTotals = new Map<string, number>();
  const scanRecent = new Map<string, number>();

  for (const scan of scans ?? []) {
    if (!scan.qr_code_id) continue;
    scanTotals.set(scan.qr_code_id, (scanTotals.get(scan.qr_code_id) ?? 0) + 1);

    if (scan.created_at >= thirtyDaysAgoIso) {
      scanRecent.set(scan.qr_code_id, (scanRecent.get(scan.qr_code_id) ?? 0) + 1);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7faf9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap</p>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold text-ink">Mis placas</h1>
            <p className="mt-2 text-sm text-gray-600">
              Consulta tus placas activas, su estado y los escaneos registrados.
            </p>
          </div>
          <a
            href="https://taplytap.io"
            className="rounded-md bg-ink px-4 py-2 text-center text-sm font-semibold text-white"
          >
            Comprar otra placa
          </a>
        </div>

        {(plates ?? []).length === 0 ? (
          <section className="mt-8 rounded-md border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Aún no encontramos placas para este correo.</h2>
            <p className="mt-2 text-sm text-gray-600">
              Verifica que la placa haya sido activada con el mismo email con el que iniciaste sesión.
            </p>
          </section>
        ) : (
          <section className="mt-8 grid gap-4">
            {(plates ?? []).map((plate) => (
              <article key={plate.id} className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-ink">
                      {plate.business_name ?? "Placa TaplyTap"}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-gray-500">{plate.code}</p>
                  </div>
                  <span className="w-fit rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                    {plate.status}
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric label="Scans totales" value={scanTotals.get(plate.id) ?? 0} />
                  <Metric label="Scans últimos 30 días" value={scanRecent.get(plate.id) ?? 0} />
                  <Metric label="WhatsApp" value={plate.whatsapp ?? "-"} />
                </dl>

                <div className="mt-5 flex flex-wrap gap-3">
                  {plate.destination_url ? (
                    <a
                      href={plate.destination_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-ink"
                    >
                      Abrir link de reseña
                    </a>
                  ) : null}
                  <Link
                    href={`/user/${plate.code}`}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-ink"
                  >
                    Probar placa
                  </Link>
                  <a
                    href="https://taplytap.io"
                    className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white"
                  >
                    Comprar otra placa
                  </a>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}
