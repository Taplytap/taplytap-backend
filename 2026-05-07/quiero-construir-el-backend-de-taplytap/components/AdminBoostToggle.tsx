"use client";

import { useState, useTransition } from "react";

type AdminBoostToggleProps = {
  code: string;
  initialEnabled: boolean;
  hasOwner: boolean;
};

export function AdminBoostToggle({
  code,
  initialEnabled,
  hasOwner
}: AdminBoostToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateBoost(nextEnabled: boolean) {
    setMessage(null);
    const previousEnabled = enabled;
    setEnabled(nextEnabled);

    startTransition(async () => {
      const response = await fetch(`/api/admin/qr-codes/${code}/boost`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ boost_enabled: nextEnabled })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setEnabled(previousEnabled);
        setMessage(payload.error ?? "No se pudo actualizar Boost.");
        return;
      }

      setEnabled(Boolean(payload.boost_enabled));
      setMessage("Boost actualizado");
      window.setTimeout(() => setMessage(null), 1800);
    });
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slateText">
          Boost: <span className={enabled ? "text-emerald-700" : "text-slateText"}>{enabled ? "Activo" : "Inactivo"}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={isPending || (!hasOwner && !enabled)}
          onClick={() => updateBoost(!enabled)}
          className={`relative h-7 w-12 rounded-full transition focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-55 ${
            enabled ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
              enabled ? "left-6" : "left-1"
            }`}
          />
          <span className="sr-only">Activar o desactivar Boost de esta placa</span>
        </button>
      </div>
      {!hasOwner && !enabled ? (
        <span className="text-[11px] leading-4 text-slateText">Asigna owner para activar Boost.</span>
      ) : null}
      {message ? <span className="text-[11px] leading-4 text-slateText">{message}</span> : null}
    </div>
  );
}
