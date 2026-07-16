"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Instagram, Link2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type InstagramPlateItem = {
  id: string;
  code: string;
  status: string;
  destinationUrl: string | null;
};

type InstagramPlateSectionProps = {
  plates: InstagramPlateItem[];
};

export function InstagramPlateSection({ plates }: InstagramPlateSectionProps) {
  if (plates.length === 0) {
    return null;
  }

  return (
    <section className="taply-fade-up mt-10">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Placas de Instagram</h2>
        <p className="mt-1 text-sm text-slateText">
          Administra los enlaces de tus placas para enviar clientes a tu perfil.
        </p>
      </div>

      <div className="grid gap-4">
        {plates.map((plate) => (
          <InstagramPlateCard key={plate.id} plate={plate} />
        ))}
      </div>
    </section>
  );
}

function InstagramPlateCard({ plate }: { plate: InstagramPlateItem }) {
  const [destinationUrl, setDestinationUrl] = useState(plate.destinationUrl);

  return (
    <Card className="overflow-hidden rounded-[2rem] border-white bg-white/95 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brandSoft text-brand">
            <Instagram size={22} />
          </div>
          <h3 className="mt-4 text-xl font-bold tracking-tight text-ink">Placa Instagram</h3>
          <p className="mt-1 font-mono text-xs font-semibold text-slateText">{plate.code}</p>
        </div>
        <Badge className={cn("normal-case tracking-normal", getStatusBadgeClass(plate.status))}>
          {getStatusLabel(plate.status)}
        </Badge>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slateText">Enlace configurado</p>
        <p className="mt-2 break-all text-sm font-medium text-ink">{destinationUrl ?? "Sin enlace"}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {destinationUrl ? (
          <a
            href={destinationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft"
          >
            <ExternalLink size={16} />
            Abrir Instagram
          </a>
        ) : null}
        <a
          href={`/instagram/${plate.code}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft"
        >
          <Link2 size={16} />
          Probar placa
        </a>
        <div className="sm:col-span-2">
          <InstagramUrlEditor
            code={plate.code}
            initialDestinationUrl={destinationUrl}
            onSaved={setDestinationUrl}
          />
        </div>
      </div>
    </Card>
  );
}

function InstagramUrlEditor({
  code,
  initialDestinationUrl,
  onSaved
}: {
  code: string;
  initialDestinationUrl: string | null;
  onSaved: (destinationUrl: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState(initialDestinationUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEditing() {
    setDraftUrl(initialDestinationUrl ?? "");
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setError(null);
    setIsEditing(false);
  }

  function saveDestinationUrl() {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/instagram-plates/${code}/destination`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ destination_url: draftUrl })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error ?? "No pudimos actualizar el enlace.");
        }

        onSaved(String(payload.destination_url ?? draftUrl));
        setIsEditing(false);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No pudimos actualizar el enlace.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={startEditing}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft"
      >
        <Pencil size={16} />
        Cambiar enlace de Instagram
      </button>

      {isEditing ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/35 px-4 py-5 sm:items-center sm:justify-center">
          <div className="w-full rounded-2xl border border-line bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:max-w-md">
            <div>
              <p className="text-sm font-semibold text-ink">Cambiar enlace de Instagram</p>
              <p className="mt-1 text-sm leading-6 text-slateText">
                Pega el enlace que Instagram te da al tocar “Compartir perfil”.
              </p>
            </div>
            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slateText">
                Enlace de Instagram
              </span>
              <input
                value={draftUrl}
                onChange={(event) => setDraftUrl(event.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                placeholder="https://www.instagram.com/tuperfil?igsh=..."
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
                onClick={saveDestinationUrl}
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

function getStatusLabel(status: string) {
  if (status === "active") return "Activa";
  if (status === "inactive") return "Pendiente";
  if (status === "blocked") return "Bloqueada";
  return status;
}

function getStatusBadgeClass(status: string) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "blocked") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-brandBorder bg-brandSoft text-brand";
}
