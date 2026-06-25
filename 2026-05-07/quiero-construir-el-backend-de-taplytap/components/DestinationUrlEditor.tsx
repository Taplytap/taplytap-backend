"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DestinationUrlEditorProps = {
  code: string;
  initialDestinationUrl: string | null;
  buttonLabel?: string;
};

export function DestinationUrlEditor({
  code,
  initialDestinationUrl,
  buttonLabel = "Cambiar Place ID"
}: DestinationUrlEditorProps) {
  const router = useRouter();
  const initialPlaceId = extractPlaceId(initialDestinationUrl ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [placeId, setPlaceId] = useState(initialPlaceId);
  const [draftPlaceId, setDraftPlaceId] = useState(initialPlaceId);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEditing() {
    setDraftPlaceId(placeId);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftPlaceId(placeId);
    setError(null);
    setIsEditing(false);
  }

  function savePlaceId() {
    setError(null);

    startTransition(async () => {
      try {
        const normalizedPlaceId = extractPlaceId(draftPlaceId);
        const response = await fetch(`/api/dashboard/qr-codes/${code}/destination`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ place_id: normalizedPlaceId })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error ?? "No pudimos actualizar el link.");
        }

        const savedPlaceId = extractPlaceId(payload.destination_url ?? "");
        setPlaceId(savedPlaceId);
        setDraftPlaceId(savedPlaceId);
        setIsEditing(false);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No pudimos actualizar el Place ID.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={startEditing}
        className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brandSoft"
      >
        {buttonLabel}
      </button>

      {isEditing ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/35 px-4 py-5 sm:items-center sm:justify-center">
          <div className="w-full rounded-2xl border border-line bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:max-w-md">
            <div>
              <p className="text-sm font-semibold text-ink">Cambiar Place ID</p>
              <p className="mt-1 text-sm leading-6 text-slateText">
                Actualiza el Place ID que se usa para enviar clientes a tu link de reseñas.
              </p>
            </div>
            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slateText">
                Nuevo Place ID
              </span>
              <input
                value={draftPlaceId}
                onChange={(event) => setDraftPlaceId(event.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                placeholder="ChIJ..."
                disabled={isPending}
              />
            </label>
            {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
            <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isPending}
                className="min-h-11 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={savePlaceId}
                disabled={isPending}
                className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brandHover disabled:cursor-wait disabled:opacity-70"
              >
                {isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function extractPlaceId(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return "";

  try {
    const url = new URL(trimmedValue);
    const placeId = url.searchParams.get("placeid");

    if (placeId) {
      return placeId.replace(/\s/g, "");
    }
  } catch {
    // Plain Place IDs are expected. URLs are handled only when parsing succeeds.
  }

  const match = trimmedValue.match(/[?&]placeid=([^&\s]+)/i);

  if (match?.[1]) {
    return decodeURIComponent(match[1]).replace(/\s/g, "");
  }

  return trimmedValue.replace(/\s/g, "");
}
