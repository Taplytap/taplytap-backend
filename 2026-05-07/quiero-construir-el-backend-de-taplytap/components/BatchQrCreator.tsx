"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Download, FileText, Loader2, QrCode } from "lucide-react";

type LinksResponse = {
  ok: true;
  count: number;
  csv: string;
  filePrefix: string;
};

type AssetsResponse = LinksResponse & {
  zipBase64: string;
  verification?: {
    verifiedCode: string;
    verifiedPayload: string;
    width: number;
    height: number;
    quietZonePixels: number;
  };
};

type LastDownload = {
  csv?: string;
  zipBase64?: string;
  filePrefix: string;
};

export function BatchQrCreator() {
  const [quantity, setQuantity] = useState(500);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastDownload, setLastDownload] = useState<LastDownload | null>(null);
  const [isPending, startTransition] = useTransition();
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  function beginProgress() {
    setError(null);
    setMessage(null);
    setProgress(8);

    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setProgress((current) => Math.min(current + 7, 88));
    }, 450);
  }

  function endProgress() {
    setProgress(100);
    if (progressTimer.current) clearInterval(progressTimer.current);
  }

  async function generateLinks() {
    beginProgress();

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/qr-codes/links", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ quantity })
        });
        const result = (await response.json().catch(() => null)) as LinksResponse | { error?: string } | null;

        if (!response.ok || !result || !("ok" in result)) {
          const errorResult = result as { error?: string } | null;
          setError(errorResult?.error ?? "No pudimos generar los links.");
          return;
        }

        endProgress();
        setLastDownload({ csv: result.csv, filePrefix: result.filePrefix });
        setMessage(`${result.count} links creados correctamente`);
        downloadCsv(result.csv, result.filePrefix);
      } catch {
        setError("No pudimos generar los links. Intenta de nuevo.");
      } finally {
        if (progressTimer.current) clearInterval(progressTimer.current);
      }
    });
  }

  async function generateQrAssets() {
    beginProgress();

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/qr-codes/assets", {
          method: "POST"
        });
        const result = (await response.json().catch(() => null)) as AssetsResponse | { error?: string } | null;

        if (!response.ok || !result || !("ok" in result)) {
          const errorResult = result as { error?: string } | null;
          setError(errorResult?.error ?? "No pudimos generar los QR.");
          return;
        }

        endProgress();
        setLastDownload({
          csv: result.csv,
          zipBase64: result.zipBase64,
          filePrefix: result.filePrefix
        });
        setMessage(
          `${result.count} QR generados desde public_url. Verificado: ${result.verification?.verifiedPayload ?? "OK"}`
        );
        downloadCsv(result.csv, result.filePrefix);
        downloadZip(result.zipBase64, result.filePrefix);
      } catch {
        setError("No pudimos generar los QR. Intenta de nuevo.");
      } finally {
        if (progressTimer.current) clearInterval(progressTimer.current);
      }
    });
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-[auto_auto_auto] sm:items-end">
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
          onClick={generateLinks}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          Generar links
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={generateQrAssets}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
          Generar QR desde links
        </button>
      </div>

      {isPending ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500">Procesando registros y archivos...</p>
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

      {lastDownload ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {lastDownload.zipBase64 ? (
            <button
              type="button"
              onClick={() => downloadZip(lastDownload.zipBase64!, lastDownload.filePrefix)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-ink"
            >
              <Download size={14} />
              Descargar ZIP
            </button>
          ) : null}
          {lastDownload.csv ? (
            <button
              type="button"
              onClick={() => downloadCsv(lastDownload.csv!, lastDownload.filePrefix)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-ink"
            >
              <Download size={14} />
              Descargar CSV
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function downloadCsv(csv: string, filePrefix: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filePrefix}.csv`);
}

function downloadZip(zipBase64: string, filePrefix: string) {
  const bytes = Uint8Array.from(atob(zipBase64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/zip" });
  downloadBlob(blob, `${filePrefix}.zip`);
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
