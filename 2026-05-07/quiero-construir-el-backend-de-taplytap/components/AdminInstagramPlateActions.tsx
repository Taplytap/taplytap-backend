"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, ExternalLink, Lock, Pencil, Unlock } from "lucide-react";

type AdminInstagramPlateActionsProps = {
  code: string;
  publicUrl: string | null;
  destinationUrl: string | null;
  status: string;
};

export function AdminInstagramPlateActions({
  code,
  publicUrl,
  destinationUrl,
  status
}: AdminInstagramPlateActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function copyPublicUrl() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setMessage("Copiado");
    window.setTimeout(() => setMessage(null), 1400);
  }

  function updateStatus(nextStatus: "inactive" | "active" | "blocked") {
    startTransition(async () => {
      const response = await fetch(`/api/admin/instagram-plates/${code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(payload.error ?? "No se pudo actualizar.");
        return;
      }

      setMessage("Actualizado");
      router.refresh();
      window.setTimeout(() => setMessage(null), 1400);
    });
  }

  return (
    <div className="flex min-w-[18rem] flex-wrap gap-2">
      <a
        href={`/instagram/${code}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-brandSoft"
      >
        <ExternalLink size={14} />
        Abrir placa
      </a>
      <button
        type="button"
        onClick={copyPublicUrl}
        disabled={!publicUrl}
        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-brandSoft disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Copy size={14} />
        Copiar link
      </button>
      {destinationUrl ? (
        <a
          href={destinationUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-brandSoft"
        >
          <ExternalLink size={14} />
          Abrir destino
        </a>
      ) : null}
      <Link
        href={`/admin/instagram/${code}/edit`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-brandSoft"
      >
        <Pencil size={14} />
        Editar
      </Link>
      {status === "blocked" ? (
        <button
          type="button"
          onClick={() => updateStatus(destinationUrl ? "active" : "inactive")}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
        >
          <Unlock size={14} />
          Desbloquear
        </button>
      ) : (
        <button
          type="button"
          onClick={() => updateStatus("blocked")}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-70"
        >
          <Lock size={14} />
          Bloquear
        </button>
      )}
      {message ? <span className="inline-flex items-center px-2 text-xs font-semibold text-slateText">{message}</span> : null}
    </div>
  );
}
