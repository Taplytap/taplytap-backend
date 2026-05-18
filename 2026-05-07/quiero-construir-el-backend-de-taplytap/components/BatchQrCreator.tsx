"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Download, Loader2, Plus } from "lucide-react";

type BatchResponse = {
  ok: true;
  count: number;
  csv: string;
  zipBase64: string;
  filePrefix: string;
};

export function BatchQrCreator() {
  const [quantity, setQuantity] = useState(500);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastBatch, setLastBatch] = useState<BatchResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  async function createBatch() {
    setError(null);
    setMessage(null);
    setLastBatch(null);
    setProgress(8);

    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setProgress((current) => Math.min(current + 7, 88));
    }, 450);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/qr-codes/batch", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ quantity })
        });

        const result = (await response.json().catch(() => null)) as
          | BatchResponse
          | { error?: string }
          | null;

        if (!response.ok || !result || !("ok" in result)) {
          const errorResult = result as { error?: string } | null;
          setError(errorResult?.error ?? "No pudimos crear el lote.");
          return;
        }

        setProgress(100);
        setLastBatch(result);
        setMessage(`${result.count} QR creados correctamente`);
        downloadCsv(result);
        downloadZip(result);
      } catch {
        setError("No pudimos crear el lote. Intenta de nuevo.");
      } finally {
        if (progressTimer.current) clearInterval(progressTimer.current);
      }
    });
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cantidad</span>
          <input
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            type="number"
            min="1"
            max="1000"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm sm:w-28"
          />
        </label>
        <button
          type="button"
          disabled={isPending}
          onClick={createBatch}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {isPending ? "Creando lote..." : "Crear lote"}
        </button>
      </div>

      {isPending ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500">Generando registros, PNG y ZIP para impresión...</p>
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {lastBatch ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadZip(lastBatch)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-ink"
          >
            <Download size={14} />
            Descargar ZIP
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(lastBatch)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-ink"
          >
            <Download size={14} />
            Descargar CSV
          </button>
        </div>
      ) : null}
    </div>
  );
}

function downloadCsv(batch: BatchResponse) {
  const blob = new Blob([batch.csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${batch.filePrefix}.csv`);
}

function downloadZip(batch: BatchResponse) {
  const bytes = Uint8Array.from(atob(batch.zipBase64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/zip" });
  downloadBlob(blob, `${batch.filePrefix}.zip`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
