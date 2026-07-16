"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

type LinksResponse = {
  ok: true;
  count: number;
  csv: string;
  filePrefix: string;
};

type LastDownload = {
  csv?: string;
  filePrefix: string;
};

export function InstagramPlateCreator() {
  const [quantity, setQuantity] = useState(1);
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
    if (quantity >= 100) {
      const confirmed = window.confirm(`Vas a generar ${quantity} placas de Instagram permanentes. ¿Quieres continuar?`);

      if (!confirmed) return;
    }

    beginProgress();

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/instagram-plates/links", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ quantity })
        });
        const result = (await response.json().catch(() => null)) as LinksResponse | { error?: string } | null;

        if (!response.ok || !result || !("ok" in result)) {
          const errorResult = result as { error?: string } | null;
          setError(errorResult?.error ?? "No pudimos generar los links de Instagram.");
          return;
        }

        endProgress();
        setLastDownload({ csv: result.csv, filePrefix: result.filePrefix });
        setMessage(`${result.count} placas de Instagram generadas correctamente`);
        downloadCsv(result.csv, result.filePrefix);
      } catch {
        setError("No pudimos generar las placas de Instagram. Intenta de nuevo.");
      } finally {
        if (progressTimer.current) clearInterval(progressTimer.current);
      }
    });
  }

  async function exportLinksCsv() {
    beginProgress();

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/instagram-plates/links/export", {
          method: "POST"
        });
        const result = (await response.json().catch(() => null)) as LinksResponse | { error?: string } | null;

        if (!response.ok || !result || !("ok" in result)) {
          const errorResult = result as { error?: string } | null;
          setError(errorResult?.error ?? "No pudimos exportar los links de Instagram.");
          return;
        }

        endProgress();
        setLastDownload({
          csv: result.csv,
          filePrefix: result.filePrefix
        });
        setMessage(`${result.count} links de Instagram exportados correctamente`);
        downloadCsv(result.csv, result.filePrefix);
      } catch {
        setError("No pudimos exportar los links de Instagram. Intenta de nuevo.");
      } finally {
        if (progressTimer.current) clearInterval(progressTimer.current);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slateText">Cantidad</span>
          <input
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            type="number"
            min="1"
            max="1000"
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm sm:w-36"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {[1, 10, 25, 50, 100, 500].map((quickQuantity) => (
            <button
              key={quickQuantity}
              type="button"
              disabled={isPending}
              onClick={() => setQuantity(quickQuantity)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                quantity === quickQuantity
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-ink hover:bg-brandSoft"
              }`}
            >
              {quickQuantity}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isPending}
            onClick={generateLinks}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Generar placas
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={exportLinksCsv}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Exportar CSV
          </button>
        </div>
      </div>

      {isPending ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-slateText">Creando registros permanentes para placas Instagram...</p>
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {lastDownload ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {lastDownload.csv ? (
            <button
              type="button"
              onClick={() => downloadCsv(lastDownload.csv!, lastDownload.filePrefix)}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink"
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
