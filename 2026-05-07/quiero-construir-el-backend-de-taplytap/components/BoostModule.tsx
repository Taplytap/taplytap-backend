"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, MessageSquareText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type FeedbackItem = {
  rating: number;
  message: string;
  created_at: string;
};

type BoostModuleProps = {
  code: string;
  initialEnabled: boolean;
  feedbackItems: FeedbackItem[];
};

export function BoostModule({
  code,
  initialEnabled,
  feedbackItems
}: BoostModuleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [isPending, startTransition] = useTransition();
  const visibleFeedback = showAllComments ? feedbackItems : feedbackItems.slice(0, 1);

  function updateBoost(nextEnabled: boolean) {
    setMessage(null);
    const previousEnabled = enabled;
    setEnabled(nextEnabled);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/qr-codes/${code}/boost`, {
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
        setMessage("Boost actualizado.");
      } catch (error) {
        setEnabled(previousEnabled);
        setMessage(error instanceof Error ? error.message : "No pudimos actualizar Boost.");
      }
    });
  }

  return (
    <Card className="taply-fade-up mt-5 overflow-hidden border-brandBorder bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF6FF_100%)] shadow-[0_22px_70px_rgba(0,109,255,0.10)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(0,109,255,0.14)]">
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles size={18} className="text-brand" />
              <h3 className="text-lg font-bold text-ink">TaplyTap Boost</h3>
              <Badge className="bg-white/80 normal-case tracking-normal">Premium</Badge>
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">
              Estado:
              <span className={enabled ? "ml-2 inline-flex items-center gap-1 text-success" : "ml-2 text-slateText"}>
                {enabled ? <CheckCircle2 size={14} /> : null}
                {enabled ? "Activado para esta placa." : "Desactivado para esta placa."}
              </span>
            </p>
            <p className="mt-2 text-sm leading-6 text-slateText">
              Filtra reseñas y recibe comentarios privados de tus clientes.
            </p>
            <a
              href="https://taplytap.io/products/taplytap-boost"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brandHover"
            >
              ¿Quieres ver más detalles?
              <ExternalLink size={14} />
            </a>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={isPending}
            onClick={() => updateBoost(!enabled)}
            className={`relative h-9 w-16 shrink-0 rounded-full transition duration-300 focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:cursor-wait disabled:opacity-70 ${
              enabled ? "bg-brand shadow-[0_12px_28px_rgba(0,109,255,0.28)]" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition-all duration-300 ${
                enabled ? "left-8" : "left-1"
              }`}
            />
            <span className="sr-only">Activar o desactivar Boost</span>
          </button>
        </div>

        {message ? (
          <p className={`mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs ${message.includes("No pudimos") ? "text-error" : "text-success"}`}>
            {message}
          </p>
        ) : null}

        <div
          className={`grid transition-all duration-200 ease-out ${
            enabled ? "mt-5 grid-rows-[1fr] opacity-100 translate-y-0" : "grid-rows-[0fr] opacity-0 -translate-y-1"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-line/80 pt-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  <MessageSquareText size={16} className="text-brand" />
                  Comentarios recientes
                </h4>
                <Badge className="bg-white">{feedbackItems.length}</Badge>
              </div>

              {feedbackItems.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-brandBorder bg-white/70 p-4">
                  <p className="text-sm font-semibold text-ink">Aún no hay comentarios.</p>
                  <p className="mt-1 text-sm leading-6 text-slateText">
                    Cuando un cliente deje feedback, aparecerá aquí.
                  </p>
                </div>
              ) : (
                <div className="mt-3 grid gap-3">
                  <div
                    className={`grid gap-3 overflow-hidden transition-all duration-200 ease-out ${
                      showAllComments ? "max-h-[1200px]" : "max-h-32"
                    }`}
                  >
                    {visibleFeedback.map((item) => (
                      <article key={`${item.created_at}-${item.rating}`} className="rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
                        <p className="text-sm text-amber-400">{renderStars(item.rating)}</p>
                        <time className="mt-1 block text-xs text-slateText">
                          {new Date(item.created_at).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </time>
                        <p className="mt-3 text-sm leading-6 text-ink">“{item.message}”</p>
                      </article>
                    ))}
                  </div>

                  {feedbackItems.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllComments((current) => !current)}
                      className="w-fit rounded-xl px-1 py-1 text-sm font-semibold text-brand transition hover:text-brandHover"
                    >
                      {showAllComments ? "Ver menos comentarios" : "Ver todos los comentarios"}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function renderStars(rating: number) {
  return "★".repeat(rating);
}
