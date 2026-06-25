"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DestinationUrlEditorProps = {
  code: string;
  initialDestinationUrl: string | null;
};

export function DestinationUrlEditor({ code, initialDestinationUrl }: DestinationUrlEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState(initialDestinationUrl ?? "");
  const [draftUrl, setDraftUrl] = useState(initialDestinationUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEditing() {
    setDraftUrl(destinationUrl);
    setMessage(null);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftUrl(destinationUrl);
    setMessage(null);
    setError(null);
    setIsEditing(false);
  }

  function saveDestinationUrl() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/qr-codes/${code}/destination`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ destination_url: draftUrl.trim() })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error ?? "No pudimos actualizar el link.");
        }

        setDestinationUrl(payload.destination_url ?? "");
        setDraftUrl(payload.destination_url ?? "");
        setIsEditing(false);
        setMessage("Link actualizado correctamente.");
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No pudimos actualizar el link.");
      }
    });
  }

  return (
    <section className="rounded-xl border border-line bg-white px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">Link de reseña</h3>
          <p className="mt-1 truncate text-xs text-slateText">
            {destinationUrl ? abbreviateUrl(destinationUrl) : "Aún no hay link configurado."}
          </p>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-brandSoft"
          >
            Cambiar link
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slateText">
              Nuevo link
            </span>
            <input
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
              placeholder="https://search.google.com/local/writereview?placeid=..."
              disabled={isPending}
            />
          </label>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <div className="grid gap-2 sm:flex sm:justify-end">
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
              onClick={saveDestinationUrl}
              disabled={isPending}
              className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brandHover disabled:cursor-wait disabled:opacity-70"
            >
              {isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-success">{message}</p> : null}
    </section>
  );
}

function abbreviateUrl(value: string) {
  if (value.length <= 72) return value;
  return `${value.slice(0, 42)}...${value.slice(-18)}`;
}
