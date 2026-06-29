"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Loader2, MessageSquareText, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CustomerBoostOverviewProps = {
  feedbackCount: number;
  allBoostEnabled: boolean;
};

export function CustomerBoostOverview({
  feedbackCount,
  allBoostEnabled
}: CustomerBoostOverviewProps) {
  const [enabled, setEnabled] = useState(allBoostEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateGlobalBoost(nextEnabled: boolean) {
    setMessage(null);
    const previousEnabled = enabled;
    setEnabled(nextEnabled);

    startTransition(async () => {
      try {
        const response = await fetch("/api/dashboard/boost", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ boost_enabled: nextEnabled })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error ?? "No pudimos actualizar Boost.");
        }

        setEnabled(Boolean(payload.boost_enabled));
        window.dispatchEvent(
          new CustomEvent("taplytap:boost-global-change", {
            detail: { enabled: Boolean(payload.boost_enabled) }
          })
        );
      } catch (error) {
        setEnabled(previousEnabled);
        setMessage(error instanceof Error ? error.message : "No pudimos actualizar Boost.");
      }
    });
  }

  return (
    <Card className="taply-fade-up mt-8 overflow-hidden rounded-[1.75rem] border-brandBorder bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF6FF_100%)] p-5 shadow-[0_22px_70px_rgba(0,109,255,0.10)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_16px_34px_rgba(0,109,255,0.25)]">
            <Zap size={23} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-ink">TaplyTap Boost</h2>
              <Badge variant="success" className="normal-case tracking-normal">
                <CheckCircle2 size={13} />
                Activo
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slateText">
              Tu suscripción está activa. Puedes encender o apagar Boost en cada placa.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a
                href="https://taplytap.io/products/taplytap-boost"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brandHover"
              >
                ¿Quieres ver más detalles?
                <ArrowRight size={15} />
              </a>
              <span className="text-xs font-medium text-slateText">
                {feedbackCount} comentarios privados
              </span>
              <Link
                href="/dashboard/boost-feedback"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brandHover"
              >
                <MessageSquareText size={15} />
                Ver comentarios privados
              </Link>
            </div>
            {message ? (
              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {message}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2">
          {isPending ? (
            <Loader2 size={16} className="animate-spin text-emerald-600" />
          ) : (
            <Sparkles size={16} className="text-emerald-600" />
          )}
          <span className="text-sm font-semibold text-emerald-700">
            {enabled ? "Activado" : "Apagado"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={isPending}
            onClick={() => updateGlobalBoost(!enabled)}
            className={cn(
              "relative h-8 w-14 rounded-full transition duration-300 focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:cursor-wait disabled:opacity-70",
              enabled ? "bg-emerald-500 shadow-[0_12px_28px_rgba(16,185,129,0.28)]" : "bg-slate-300"
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-300",
                enabled ? "left-7" : "left-1"
              )}
            />
            <span className="sr-only">Activar o desactivar Boost en todas las placas</span>
          </button>
        </div>
      </div>
    </Card>
  );
}
