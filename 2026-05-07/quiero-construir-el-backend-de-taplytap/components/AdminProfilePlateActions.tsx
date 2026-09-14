"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

type AdminProfilePlateActionsProps = {
  code: string;
  publicUrl: string | null;
};

export function AdminProfilePlateActions({ code, publicUrl }: AdminProfilePlateActionsProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function copyPublicUrl() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setMessage("Copiado");
    window.setTimeout(() => setMessage(null), 1400);
  }

  return (
    <div className="flex min-w-[12rem] flex-wrap gap-2">
      <a
        href={`/p/${code}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-brandSoft"
      >
        <ExternalLink size={14} />
        Abrir perfil
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
      {message ? <span className="inline-flex items-center px-2 text-xs font-semibold text-slateText">{message}</span> : null}
    </div>
  );
}
