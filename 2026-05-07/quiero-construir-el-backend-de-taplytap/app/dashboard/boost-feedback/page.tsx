import Link from "next/link";
import type React from "react";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageSquareText, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { logServerError } from "@/lib/server-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FeedbackItem = {
  id: string;
  code: string;
  rating: number;
  message: string;
  created_at: string;
  plate_code: string;
  plate_name: string | null;
};

export default async function BoostFeedbackPage() {
  try {
    return await renderBoostFeedbackPage();
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    logServerError("/dashboard/boost-feedback render", error);

    return (
      <FeedbackShell>
        <Card className="mt-8 rounded-[2rem] border-red-100 bg-red-50 p-6 text-red-700">
          <h2 className="text-lg font-bold">No pudimos cargar tus comentarios.</h2>
          <p className="mt-2 text-sm leading-6">
            Intenta de nuevo en unos segundos.
          </p>
        </Card>
      </FeedbackShell>
    );
  }
}

async function renderBoostFeedbackPage() {
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user) {
    redirect("/login?error=session&message=No%20se%20encontr%C3%B3%20una%20sesi%C3%B3n%20activa.");
  }

  const supabase = createSupabaseAdminClient();
  const { data: plates, error: platesError } = await supabase
    .from("qr_codes")
    .select("id,code,business_name")
    .eq("owner_user_id", user.id);

  if (platesError) {
    throw new Error(platesError.message);
  }

  const plateIds = (plates ?? []).map((plate) => plate.id);
  let feedback: FeedbackItem[] = [];

  if (plateIds.length > 0) {
    const { data, error } = await supabase
      .from("boost_feedback")
      .select("id,qr_code_id,code,rating,message,created_at")
      .in("qr_code_id", plateIds)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    const platesById = new Map((plates ?? []).map((plate) => [plate.id, plate]));
    feedback = (data ?? []).map((item) => {
      const plate = item.qr_code_id ? platesById.get(item.qr_code_id) : null;

      return {
        id: item.id,
        code: item.code,
        rating: item.rating,
        message: item.message,
        created_at: item.created_at,
        plate_code: plate?.code ?? item.code,
        plate_name: plate?.business_name ?? null
      };
    });
  }

  return (
    <FeedbackShell>
      {feedback.length === 0 ? (
        <Card className="mt-8 rounded-[2rem] border-dashed border-brandBorder bg-brandSoft/60 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand">
            <MessageSquareText size={25} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-ink">Aún no tienes comentarios privados.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slateText">
            Cuando un cliente califique con 1 a 3 estrellas y deje feedback, aparecerá aquí.
          </p>
        </Card>
      ) : (
        <section className="mt-8 grid gap-4">
          {feedback.map((item) => (
            <Card key={item.id} className="rounded-[1.5rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-ink">
                    {item.plate_name ?? "Placa TaplyTap"}
                  </p>
                  <p className="mt-1 font-mono text-xs font-semibold text-slateText">
                    {item.plate_code}
                  </p>
                </div>
                <Badge variant="secondary" className="normal-case tracking-normal">
                  {formatFeedbackDate(item.created_at)}
                </Badge>
              </div>
              <p className="mt-4 flex gap-0.5 text-amber-400" aria-label={`${item.rating} estrellas`}>
                {renderStars(item.rating)}
              </p>
              <p className="mt-4 text-sm leading-7 text-ink">“{item.message}”</p>
            </Card>
          ))}
        </section>
      )}
    </FeedbackShell>
  );
}

function FeedbackShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#EEF6FF_0%,#F8FAFC_34%,#FFFFFF_100%)] px-5 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft"
        >
          <ArrowLeft size={17} />
          Regresar al dashboard
        </Link>
        <p className="text-base font-bold tracking-tight text-brand">TaplyTap Boost</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Comentarios privados
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slateText">
          Feedback recibido de clientes que calificaron con 1 a 3 estrellas.
        </p>
        {children}
      </div>
    </main>
  );
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      size={17}
      fill={index < rating ? "currentColor" : "none"}
      className={index < rating ? "text-amber-400" : "text-slate-300"}
    />
  ));
}

function formatFeedbackDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Hoy";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Ayer";
  }

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
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
