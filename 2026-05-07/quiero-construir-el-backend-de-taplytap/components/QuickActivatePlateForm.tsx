"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { SupportWhatsAppBubble } from "@/components/SupportWhatsAppBubble";

type QuickActivatePlateFormProps = {
  code: string;
};

export function QuickActivatePlateForm({ code }: QuickActivatePlateFormProps) {
  const router = useRouter();
  const [placeId, setPlaceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function activatePlate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/activate/quick/${code}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ place_id: placeId })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error ?? "No pudimos activar esta placa.");
        }

        setIsSuccess(true);
        router.refresh();
      } catch (activateError) {
        setError(activateError instanceof Error ? activateError.message : "No pudimos activar esta placa.");
      }
    });
  }

  if (isSuccess) {
    return (
      <>
        <section className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] animate-in fade-in slide-in-from-bottom-3 duration-500 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={30} />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">¡Tu placa está lista!</h1>
          <p className="mt-3 text-sm leading-6 text-slateText">
            Ya quedó vinculada a tu cuenta y aparecerá en tu dashboard.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href={`/user/${code}`}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,109,255,0.24)] transition hover:bg-brandHover"
            >
              Probar placa
            </a>
            <a
              href="/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-brandSoft"
            >
              Volver a mis placas
            </a>
          </div>
        </section>
        <SupportWhatsAppBubble />
      </>
    );
  }

  return (
    <>
      <section className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Nueva placa detectada</h1>
        <p className="mt-3 text-base leading-7 text-slateText">
          ¿A qué negocio quieres dirigir esta placa?
        </p>

        <form onSubmit={activatePlate} className="mt-7">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Place ID de Google</span>
            <input
              value={placeId}
              onChange={(event) => setPlaceId(event.target.value)}
              placeholder="Ej. ChIJxxxxxxxxxxxx"
              disabled={isPending}
              className="min-h-12 rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:cursor-wait disabled:bg-slate-50"
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-slateText">
            Puedes pegar solo el Place ID o el link completo que contiene placeid=.
          </p>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-base font-semibold text-white shadow-[0_16px_36px_rgba(0,109,255,0.26)] transition hover:bg-brandHover disabled:cursor-wait disabled:bg-slate-300 disabled:shadow-none"
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : null}
            {isPending ? "Activando..." : "Activar placa"}
          </button>
        </form>
      </section>
      <SupportWhatsAppBubble />
    </>
  );
}
