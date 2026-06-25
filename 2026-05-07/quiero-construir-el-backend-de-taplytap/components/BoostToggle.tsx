"use client";

import { useState, useTransition } from "react";

type BoostToggleProps = {
  code: string;
  initialEnabled: boolean;
};

export function BoostToggle({ code, initialEnabled }: BoostToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">TaplyTap Boost</p>
          <p className="mt-1 text-xs leading-5 text-slateText">
            {enabled ? "Activado para esta placa." : "Desactivado. Tu placa sigue funcionando normal."}
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
        <p className={`mt-2 text-xs ${message.includes("No pudimos") ? "text-error" : "text-success"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
