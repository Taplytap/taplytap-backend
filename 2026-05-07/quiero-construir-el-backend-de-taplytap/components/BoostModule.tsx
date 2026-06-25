"use client";

import { useState, useTransition } from "react";

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
    <section className="mt-5 overflow-hidden rounded-2xl border border-brandBorder bg-white shadow-[0_18px_55px_rgba(0,109,255,0.08)]">
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-ink">✨ TaplyTap Boost</h3>
            <p className="mt-3 text-sm font-semibold text-ink">
              Estado:
              <span className={enabled ? "ml-2 text-success" : "ml-2 text-slateText"}>
                {enabled ? "✓ Activado para esta placa." : "Desactivado para esta placa."}
              </span>
            </p>
            <p className="mt-2 text-sm leading-6 text-slateText">
              Filtra reseñas y recibe comentarios privados de tus clientes.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={isPending}
            onClick={() => updateBoost(!enabled)}
            className={`relative h-8 w-14 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:cursor-wait disabled:opacity-70 ${
              enabled ? "bg-brand" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition ${
                enabled ? "left-7" : "left-1"
              }`}
            />
            <span className="sr-only">Activar o desactivar Boost</span>
          </button>
        </div>

        {message ? (
          <p className={`mt-3 text-xs ${message.includes("No pudimos") ? "text-error" : "text-success"}`}>
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
                <h4 className="text-sm font-semibold text-ink">Comentarios recientes</h4>
                <span className="rounded-full bg-brandSoft px-2.5 py-1 text-xs font-semibold text-brand">
                  {feedbackItems.length}
                </span>
              </div>

              {feedbackItems.length === 0 ? (
                <p className="mt-3 text-sm text-slateText">Aún no hay comentarios.</p>
              ) : (
                <div className="mt-3 grid gap-3">
                  <div
                    className={`grid gap-3 overflow-hidden transition-all duration-200 ease-out ${
                      showAllComments ? "max-h-[1200px]" : "max-h-32"
                    }`}
                  >
                    {visibleFeedback.map((item) => (
                      <article key={`${item.created_at}-${item.rating}`} className="rounded-xl bg-slate-50 p-3">
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
    </section>
  );
}

function renderStars(rating: number) {
  return "★".repeat(rating);
}
