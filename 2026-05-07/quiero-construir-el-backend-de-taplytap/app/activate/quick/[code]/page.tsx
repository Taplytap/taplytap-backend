import { notFound, redirect } from "next/navigation";
import { QuickActivatePlateForm } from "@/components/QuickActivatePlateForm";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidCode, normalizeCode } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: {
    code: string;
  };
};

export default async function QuickActivatePlatePage({ params }: PageProps) {
  const code = normalizeCode(params.code);

  if (!isValidCode(code)) {
    notFound();
  }

  const authClient = createSupabaseServerClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();

  if (!user?.email) {
    redirect(`/activate/${code}`);
  }

  const supabase = createSupabaseAdminClient();
  const { data: qrCode } = await supabase
    .from("qr_codes")
    .select("code,status,owner_user_id")
    .eq("code", code)
    .maybeSingle();

  if (!qrCode) {
    return (
      <QuickActivationState
        title="Placa no encontrada"
        message="Revisa que el código esté completo o contacta a soporte."
      />
    );
  }

  if (qrCode.status === "blocked") {
    return (
      <QuickActivationState
        title="Placa bloqueada"
        message="Esta placa necesita revisión de soporte antes de activarse."
      />
    );
  }

  if (qrCode.status !== "inactive" || qrCode.owner_user_id) {
    return (
      <QuickActivationState
        title="Esta placa ya fue activada"
        message="No podemos vincular automáticamente una placa que ya tiene dueño."
        actionHref="/dashboard"
        actionLabel="Volver a mis placas"
      />
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#EEF6FF_0%,#F8FAFC_42%,#FFFFFF_100%)] px-5 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap</p>
        <p className="mt-4 w-fit rounded-full border border-brandBorder bg-brandSoft px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-brand">
          Código {code}
        </p>
        <QuickActivatePlateForm code={code} ownerEmail={user.email} />
      </div>
    </main>
  );
}

function QuickActivationState({
  title,
  message,
  actionHref,
  actionLabel
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap</p>
        <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slateText">{message}</p>
          {actionHref ? (
            <a
              href={actionHref}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brandHover"
            >
              {actionLabel}
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}
