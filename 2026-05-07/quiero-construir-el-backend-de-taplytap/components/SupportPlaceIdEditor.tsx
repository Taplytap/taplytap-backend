"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SupportPlaceIdEditorProps = {
  code: string;
  initialPlaceId: string | null;
};

export function SupportPlaceIdEditor({
  code,
  initialPlaceId
}: SupportPlaceIdEditorProps) {
  const router = useRouter();
  const [placeId, setPlaceId] = useState(initialPlaceId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function savePlaceId() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/support/qr-codes/${code}/place-id`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ place_id: placeId })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "No pudimos actualizar el Place ID.");
        return;
      }

      setPlaceId(String(payload.place_id ?? placeId));
      setMessage("Place ID actualizado.");
      router.refresh();
    });
  }

  return (
    <div className="mt-5 rounded-2xl border border-line bg-slate-50 p-4">
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-ink">Cambiar Place ID</span>
        <input
          value={placeId}
          onChange={(event) => setPlaceId(event.target.value)}
          className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
          placeholder="ChIJ..."
          disabled={isPending}
        />
      </label>
      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      <button
        type="button"
        onClick={savePlaceId}
        disabled={isPending}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brandHover disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {isPending ? "Guardando..." : "Guardar Place ID"}
      </button>
    </div>
  );
}
