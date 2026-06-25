"use client";

import { useState } from "react";

type BoostRatingGateProps = {
  businessName: string | null;
  destinationUrl: string;
};

const ratings = [1, 2, 3, 4, 5];

export function BoostRatingGate({ businessName, destinationUrl }: BoostRatingGateProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  function handleRating(rating: number) {
    setSelectedRating(rating);

    if (rating >= 4) {
      window.location.assign(destinationUrl);
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
              <h2 className="text-base font-semibold text-ink">Gracias por contarnos.</h2>
              <p className="mt-2 text-sm leading-6 text-slateText">
                Tu comentario es importante. Por ahora esta prueba de Boost mantiene tu feedback privado
                y ayuda al negocio a detectar oportunidades antes de pedir una reseña pública.
              </p>
            </div>
          ) : null}

        </section>
      </div>
    </main>
  );
}
