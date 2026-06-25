"use client";

import { useState } from "react";

type BoostRatingGateProps = {
  code: string;
  businessName: string | null;
  destinationUrl: string;
};

const ratings = [1, 2, 3, 4, 5];

export function BoostRatingGate({ code, businessName, destinationUrl }: BoostRatingGateProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  function handleRating(rating: number) {
    setSelectedRating(rating);

    if (rating >= 4) {
      window.location.assign(destinationUrl);
    }
  }

  async function submitFeedback() {
    if (!selectedRating || selectedRating > 3) return;

    setError(null);
    setStatus("saving");

    try {
      const response = await fetch("/api/boost-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code,
          rating: selectedRating,
          message
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos guardar tu comentario.");
      }

      setStatus("sent");
    } catch (submitError) {
      setStatus("idle");
      setError(submitError instanceof Error ? submitError.message : "No pudimos guardar tu comentario.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <section className="rounded-3xl border border-line bg-white p-6 text-center shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">
            ¿Nos regalas una calificación?
          </h1>
          <p className="mt-3 text-sm leading-6 text-slateText">
            {businessName
              ? `Tu opinión ayuda a ${businessName} a mejorar cada día.`
              : "Tu opinión ayuda a este negocio a mejorar cada día."}
          </p>

          <div className="mt-7 flex justify-center gap-2">
            {ratings.map((rating) => {
              const isSelected = selectedRating !== null && rating <= selectedRating;

              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRating(rating)}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl transition ${
                    isSelected
                      ? "border-amber-300 bg-amber-50 text-amber-400"
                      : "border-line bg-white text-slate-300 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-300"
                  }`}
                  aria-label={`${rating} estrellas`}
                >
                  ★
                </button>
              );
            })}
          </div>

          {selectedRating && selectedRating <= 3 ? (
            <div className="mt-7 rounded-2xl border border-brandBorder bg-brandSoft p-4 text-left">
              {status === "sent" ? (
                <p className="text-base font-semibold text-ink">Gracias por tu comentario.</p>
              ) : (
                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-base font-semibold text-ink">
                      Gracias por tu comentario. Déjanos aquí lo que pasó en tu experiencia.
                    </span>
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      className="min-h-28 rounded-xl border border-brandBorder bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                      placeholder="Escribe tu comentario..."
                      maxLength={1200}
                      disabled={status === "saving"}
                    />
                  </label>
                  {error ? <p className="text-sm text-error">{error}</p> : null}
                  <button
                    type="button"
                    onClick={submitFeedback}
                    disabled={status === "saving" || !message.trim()}
                    className="min-h-11 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brandHover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === "saving" ? "Enviando..." : "Enviar comentario"}
                  </button>
                </div>
              )}
            </div>
          ) : null}

        </section>
      </div>
    </main>
  );
}
