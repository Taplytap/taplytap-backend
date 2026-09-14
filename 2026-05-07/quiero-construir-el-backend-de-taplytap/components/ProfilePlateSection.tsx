"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Link2, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { profileLinkLabels, profileLinkTypes } from "@/lib/profile-links";
import { cn } from "@/lib/utils";
import type { ProfileLinkType } from "@/lib/types";

export type ProfilePlateLinkItem = {
  id: string;
  type: ProfileLinkType;
  label: string;
  source_value: string | null;
  url: string;
  enabled: boolean;
  sort_order: number;
};

export type ProfilePlateItem = {
  id: string;
  code: string;
  status: string;
  publicUrl: string | null;
  profileImageUrl: string | null;
  profileImagePath: string | null;
  businessName: string | null;
  description: string | null;
  links: ProfilePlateLinkItem[];
};

type ProfilePlateSectionProps = {
  plates: ProfilePlateItem[];
};

const placeholders: Record<ProfileLinkType, string> = {
  instagram: "https://www.instagram.com/tuperfil",
  whatsapp: "523312345678",
  facebook: "https://www.facebook.com/tupagina",
  google_reviews: "ChIJ...",
  tiktok: "https://www.tiktok.com/@tuperfil",
  website: "https://tunegocio.com"
};

export function ProfilePlateSection({ plates }: ProfilePlateSectionProps) {
  if (plates.length === 0) {
    return null;
  }

  return (
    <section className="taply-fade-up mt-10">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Placas Perfil</h2>
        <p className="mt-1 text-sm text-slateText">
          Administra tu página multi-link para redes, WhatsApp y reseñas.
        </p>
      </div>

      <div className="grid gap-4">
        {plates.map((plate) => (
          <ProfilePlateCard key={plate.id} plate={plate} />
        ))}
      </div>
    </section>
  );
}

function ProfilePlateCard({ plate }: { plate: ProfilePlateItem }) {
  const [businessName, setBusinessName] = useState(plate.businessName ?? "Perfil TaplyTap");
  const [description, setDescription] = useState(plate.description ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState(plate.profileImageUrl);
  const [links, setLinks] = useState(plate.links);
  const visibleLinks = links.filter((link) => link.enabled);

  return (
    <Card className="overflow-hidden rounded-[2rem] border-white bg-white/95 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brandSoft text-brand">
            {profileImageUrl ? (
              <span
                aria-label={`Logo de ${businessName}`}
                className="h-full w-full rounded-2xl bg-cover bg-center"
                style={{ backgroundImage: `url(${profileImageUrl})` }}
              />
            ) : (
              <Link2 size={22} />
            )}
          </div>
          <h3 className="mt-4 text-xl font-bold tracking-tight text-ink">{businessName}</h3>
          <p className="mt-1 font-mono text-xs font-semibold text-slateText">{plate.code}</p>
        </div>
        <Badge className={cn("normal-case tracking-normal", getStatusBadgeClass(plate.status))}>
          {getStatusLabel(plate.status)}
        </Badge>
      </div>

      {description ? <p className="mt-4 text-sm leading-6 text-slateText">{description}</p> : null}

      <div className="mt-5 rounded-2xl border border-line bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slateText">Enlaces visibles</p>
        <p className="mt-2 text-sm font-medium text-ink">
          {visibleLinks.length > 0
            ? visibleLinks.map((link) => profileLinkLabels[link.type]).join(", ")
            : "Sin enlaces visibles"}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a
          href={`/p/${plate.code}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft"
        >
          <ExternalLink size={16} />
          Ver perfil
        </a>
        <ProfileEditor
          plate={plate}
          businessName={businessName}
          description={description}
          links={links}
          onSaved={(updated) => {
            setBusinessName(updated.businessName);
            setDescription(updated.description);
            setLinks(updated.links);
          }}
          onImageSaved={setProfileImageUrl}
        />
      </div>
    </Card>
  );
}

function ProfileEditor({
  plate,
  businessName,
  description,
  links,
  onSaved,
  onImageSaved
}: {
  plate: ProfilePlateItem;
  businessName: string;
  description: string;
  links: ProfilePlateLinkItem[];
  onSaved: (updated: { businessName: string; description: string; links: ProfilePlateLinkItem[] }) => void;
  onImageSaved: (profileImageUrl: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBusinessName, setDraftBusinessName] = useState(businessName);
  const [draftDescription, setDraftDescription] = useState(description);
  const [draftLinks, setDraftLinks] = useState(() => createDraftLinks(links));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isImagePending, startImageTransition] = useTransition();

  const linkMap = useMemo(() => new Map(draftLinks.map((link) => [link.type, link])), [draftLinks]);

  function startEditing() {
    setDraftBusinessName(businessName);
    setDraftDescription(description);
    setDraftLinks(createDraftLinks(links));
    setErrors({});
    setError(null);
    setIsEditing(true);
  }

  function updateDraftLink(type: ProfileLinkType, value: string) {
    setDraftLinks((current) => current.map((link) => (link.type === type ? { ...link, value } : link)));
  }

  function updateDraftEnabled(type: ProfileLinkType, enabled: boolean) {
    setDraftLinks((current) => current.map((link) => (link.type === type ? { ...link, enabled } : link)));
  }

  function saveProfile() {
    setErrors({});
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/profile-plates/${plate.code}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            business_name: draftBusinessName,
            description: draftDescription,
            links: draftLinks
          })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          setErrors(payload.errors ?? {});
          throw new Error(payload.error ?? "No pudimos actualizar el perfil.");
        }

        const savedLinks = (payload.plate?.links ?? []) as ProfilePlateLinkItem[];
        onSaved({
          businessName: String(payload.plate?.business_name ?? draftBusinessName),
          description: String(payload.plate?.description ?? ""),
          links: savedLinks
        });
        setIsEditing(false);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "No pudimos actualizar el perfil.");
      }
    });
  }

  function uploadImage(file: File | null) {
    if (!file) return;
    setError(null);
    setImageMessage(null);

    startImageTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(`/api/dashboard/profile-plates/${plate.code}/image`, {
          method: "POST",
          body: formData
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error ?? "No pudimos subir la imagen.");
        }

        if (payload.public_url) {
          onImageSaved(String(payload.public_url));
        }

        setImageMessage("Logo actualizado");
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "No pudimos subir la imagen.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={startEditing}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft"
      >
        <Pencil size={16} />
        Editar perfil
      </button>

      {isEditing ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/35 px-4 py-5 sm:items-center sm:justify-center">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-line bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:max-w-2xl">
            <div>
              <p className="text-sm font-semibold text-ink">Editar perfil</p>
              <p className="mt-1 text-sm leading-6 text-slateText">
                Actualiza los enlaces que verán tus clientes al escanear esta placa.
              </p>
            </div>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 rounded-2xl border border-line bg-slate-50 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slateText">Logo del negocio</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => uploadImage(event.target.files?.[0] ?? null)}
                  className="text-sm text-slateText file:mr-3 file:rounded-xl file:border-0 file:bg-brand file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white"
                  disabled={isImagePending}
                />
                <span className="text-xs leading-5 text-slateText">JPG, PNG o WEBP. Máximo 2 MB.</span>
                {isImagePending ? <span className="text-sm text-slateText">Subiendo logo...</span> : null}
                {imageMessage ? <span className="text-sm font-semibold text-success">{imageMessage}</span> : null}
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slateText">Nombre del negocio</span>
                <input
                  value={draftBusinessName}
                  onChange={(event) => setDraftBusinessName(event.target.value)}
                  className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                  disabled={isPending}
                />
                {errors.business_name ? <span className="text-sm text-error">{errors.business_name}</span> : null}
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slateText">Descripción</span>
                <textarea
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  rows={3}
                  maxLength={240}
                  className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                  disabled={isPending}
                />
                {errors.description ? <span className="text-sm text-error">{errors.description}</span> : null}
              </label>
              {profileLinkTypes.map((type) => {
                const draft = linkMap.get(type);

                return (
                  <div key={type} className="rounded-xl border border-line bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-semibold text-ink" htmlFor={`profile-edit-${type}`}>
                        {profileLinkLabels[type]}
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slateText">
                        <input
                          type="checkbox"
                          checked={draft?.enabled ?? true}
                          onChange={(event) => updateDraftEnabled(type, event.target.checked)}
                          className="h-4 w-4 rounded border-line text-brand"
                          disabled={isPending}
                        />
                        Visible
                      </label>
                    </div>
                    <input
                      id={`profile-edit-${type}`}
                      value={draft?.value ?? ""}
                      onChange={(event) => updateDraftLink(type, event.target.value)}
                      placeholder={placeholders[type]}
                      className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
                      disabled={isPending}
                    />
                    {type === "google_reviews" ? (
                      <p className="mt-2 text-xs leading-5 text-slateText">
                        Puedes pegar solo el Place ID o el link completo con placeid=.
                      </p>
                    ) : null}
                    {errors[type] ? <p className="mt-2 text-sm text-error">{errors[type]}</p> : null}
                  </div>
                );
              })}
              {errors.links ? <p className="text-sm text-error">{errors.links}</p> : null}
            </div>
            {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
            <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isPending}
                className="min-h-11 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brandHover disabled:cursor-wait disabled:opacity-70"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                {isPending ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function createDraftLinks(links: ProfilePlateLinkItem[]) {
  return profileLinkTypes.map((type, index) => {
    const existing = links.find((link) => link.type === type);

    return {
      type,
      value: existing ? getEditableValue(existing) : "",
      enabled: existing?.enabled ?? true,
      sort_order: existing?.sort_order ?? index
    };
  });
}

function getEditableValue(link: ProfilePlateLinkItem) {
  if (link.source_value) {
    return link.source_value;
  }

  if (link.type === "whatsapp") {
    try {
      return new URL(link.url).pathname.replace(/\D/g, "");
    } catch {
      return link.url;
    }
  }

  if (link.type === "google_reviews") {
    try {
      return new URL(link.url).searchParams.get("placeid") ?? link.url;
    } catch {
      return link.url;
    }
  }

  return link.url;
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
