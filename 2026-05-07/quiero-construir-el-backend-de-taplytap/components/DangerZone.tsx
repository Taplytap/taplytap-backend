"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const confirmationText = "ELIMINAR TODO";

export function DangerZone() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canDelete = confirmation === confirmationText;

  function deleteAll() {
    setMessage(null);
    setError(null);

    if (!canDelete) {
      setError(`Escribe exactamente ${confirmationText} para confirmar.`);
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/admin/qr-codes/delete-all", {
        method: "DELETE",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ confirmation })
      });
      const result = (await response.json().catch(() => null)) as
        | { ok: true; deletedQrCodes: number }
        | { error?: string }
        | null;

      if (!response.ok || !result || !("ok" in result)) {
        const errorResult = result as { error?: string } | null;
        setError(errorResult?.error ?? "No pudimos eliminar los QR.");
        return;
      }

      setConfirmation("");
      setMessage(`Se eliminaron ${result.deletedQrCodes} QR correctamente.`);
      router.refresh();
    });
  }

  return (
    <section className="mt-8 rounded-md border border-red-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-50 p-2 text-red-700">
          <Trash2 size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-ink">Zona de peligro</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Elimina todos los QR y sus scans relacionados. No borra usuarios ni auth.
          </p>
          <div className="mt-4 grid gap-3 sm:max-w-md">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">
                Escribe {confirmationText} para confirmar
              </span>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder={confirmationText}
              />
            </label>
            <button
              type="button"
              disabled={!canDelete || isPending}
              onClick={deleteAll}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-fit"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {isPending ? "Eliminando..." : "Eliminar todos los QR"}
            </button>
          </div>
          {message ? (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
