"use client";

import { useState } from "react";

export function BoostLockedCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST"
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "No pudimos iniciar el pago en este momento.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "No pudimos iniciar el pago en este momento."
      );
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-brandBorder bg-white p-5 shadow-[0_18px_55px_rgba(0,109,255,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-ink">✨ TaplyTap Boost</h3>
          <p className="mt-3 text-sm font-semibold text-ink">
            Estado:
            <span className="ml-2 text-slateText">🔒 Bloqueado</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-slateText">
            Activa Boost para filtrar reseñas y recibir comentarios privados.
          </p>
          {error ? (
            <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={isLoading}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brandHover disabled:cursor-not-allowed disabled:bg-brand/70"
        >
          {isLoading ? "Abriendo..." : "Activar Boost"}
        </button>
      </div>
    </section>
  );
}
