import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { getSupportEmail } from "@/lib/env";
import { isSafeDestinationUrl, isValidCode, normalizeCode } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: {
    code: string;
  };
};

export default async function InstagramPlatePage({ params }: PageProps) {
  noStore();

  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    return (
      <InstagramPlateState
        title="Código inválido"
        message="Revisa que la URL de la placa de Instagram esté completa."
      />
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: plate, error } = await supabase
    .from("instagram_plates")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    return (
      <InstagramPlateState
        title="No pudimos leer la placa"
        message="Intenta de nuevo o contacta a soporte de TaplyTap."
      />
    );
  }

  if (!plate) {
    return (
      <InstagramPlateState
        title="Placa no encontrada"
        message="Este código de Instagram no existe en TaplyTap."
      />
    );
  }

  if (plate.status === "blocked") {
    return (
      <InstagramPlateState
        title="Placa bloqueada"
        message="Esta placa necesita revisión. Contacta a soporte de TaplyTap para reactivarla."
      />
    );
  }

  if (plate.status !== "active" || !plate.destination_url) {
    return (
      <InstagramPlateState
        title="Placa Instagram pendiente"
        message="Esta placa ya existe, pero todavía no tiene un destino configurado."
      />
    );
  }

  if (!isSafeDestinationUrl(plate.destination_url)) {
    return (
      <InstagramPlateState
        title="Destino no disponible"
        message="La placa está activa, pero su URL de destino no es válida."
      />
    );
  }

  redirect(plate.destination_url);
}

function InstagramPlateState({ title, message }: { title: string; message: string }) {
  const supportEmail = getSupportEmail();

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-6 py-16">
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
        <div className="rounded-3xl border border-line bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap Instagram</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-slateText">{message}</p>
          <a
            href={`mailto:${supportEmail}`}
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brandHover"
          >
            Contactar soporte
          </a>
        </div>
      </section>
    </main>
  );
}
