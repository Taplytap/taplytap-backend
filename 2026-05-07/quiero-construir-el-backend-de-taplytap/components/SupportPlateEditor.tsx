"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { createGoogleReviewUrl } from "@/lib/qr-form";
import { profileLinkLabels, profileLinkTypes } from "@/lib/profile-links";
import type { ProfileLinkType, QrStatus } from "@/lib/types";

export type SupportEditablePlateType = "google" | "instagram" | "facebook" | "profile";

export type SupportEditablePlate = {
  id: string;
  code: string;
  status: QrStatus;
  public_url: string | null;
  owner_user_id: string | null;
  owner_email: string | null;
  business_name: string | null;
  destination_url?: string | null;
  place_id?: string | null;
  contact_name?: string | null;
  whatsapp?: string | null;
  instagram_handle?: string | null;
  facebook_handle?: string | null;
  description?: string | null;
};

export type SupportEditableProfileLink = {
  type: ProfileLinkType;
  source_value: string | null;
  enabled: boolean;
  sort_order: number;
};

type SupportPlateEditorProps = {
  type: SupportEditablePlateType;
  plate: SupportEditablePlate;
  publicUrl: string;
  links?: SupportEditableProfileLink[];
};

const statuses: Array<{ value: QrStatus; label: string }> = [
  { value: "inactive", label: "Pendiente" },
  { value: "active", label: "Activa" },
  { value: "blocked", label: "Bloqueada" }
];

const profilePlaceholders: Record<ProfileLinkType, string> = {
  instagram: "https://www.instagram.com/usuario",
  whatsapp: "5213312345678",
  facebook: "https://www.facebook.com/pagina",
  google_reviews: "ChIJ...",
  tiktok: "https://www.tiktok.com/@usuario",
  website: "https://sitio.com"
};

export function SupportPlateEditor({ type, plate, publicUrl, links = [] }: SupportPlateEditorProps) {
  const [status, setStatus] = useState<QrStatus>(plate.status);
  const [businessName, setBusinessName] = useState(plate.business_name ?? "");
  const [contactName, setContactName] = useState(plate.contact_name ?? "");
  const [whatsapp, setWhatsapp] = useState(plate.whatsapp ?? "");
  const [ownerEmail, setOwnerEmail] = useState(plate.owner_email ?? "");
  const [placeId, setPlaceId] = useState(plate.place_id ?? "");
  const [destinationUrl, setDestinationUrl] = useState(plate.destination_url ?? "");
  const [instagramHandle, setInstagramHandle] = useState(plate.instagram_handle ?? "");
  const [facebookHandle, setFacebookHandle] = useState(plate.facebook_handle ?? "");
  const [description, setDescription] = useState(plate.description ?? "");
  const [profileLinks, setProfileLinks] = useState(() => createProfileLinkDrafts(links));
  const [confirmClearOwner, setConfirmClearOwner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isClearingOwner = Boolean((plate.owner_email || plate.owner_user_id) && !ownerEmail.trim());
  const typeLabel = useMemo(() => getTypeLabel(type), [type]);

  function updatePlaceId(value: string) {
    setPlaceId(value);
    const cleanValue = value.trim().replace(/\s/g, "");
    if (cleanValue) setDestinationUrl(createGoogleReviewUrl(cleanValue));
  }

  function updateProfileLink(type: ProfileLinkType, patch: { value?: string; enabled?: boolean }) {
    setProfileLinks((current) => current.map((link) => (link.type === type ? { ...link, ...patch } : link)));
  }

  function save() {
    setMessage(null);
    setError(null);

    if (isClearingOwner && !confirmClearOwner) {
      setError("Confirma que quieres dejar esta placa sin propietario.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/support/plates/${type}/${plate.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          business_name: businessName,
          contact_name: contactName,
          whatsapp,
          owner_email: ownerEmail,
          place_id: placeId,
          destination_url: destinationUrl,
          instagram_handle: instagramHandle,
          facebook_handle: facebookHandle,
          description,
          links: profileLinks,
          clear_owner_confirm: confirmClearOwner
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "No pudimos guardar los cambios.");
        return;
      }

      setMessage("Placa actualizada correctamente");
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="grid gap-4">
          <ReadOnlyField label="Tipo" value={typeLabel} />
          <ReadOnlyField label="Código permanente" value={plate.code} mono />
          <ReadOnlyField label="URL pública" value={publicUrl} mono />
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink"
          >
            <ExternalLink size={16} />
            Probar placa
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-ink">Información de la placa</h2>
        <div className="mt-4 grid gap-4">
          <SelectField label="Estado" value={status} onChange={setStatus} />
          <TextField label={type === "profile" ? "Nombre del perfil" : "Nombre del negocio"} value={businessName} onChange={setBusinessName} />

          {type === "google" ? (
            <>
              <TextField label="Nombre del responsable" value={contactName} onChange={setContactName} />
              <TextField label="WhatsApp" value={whatsapp} onChange={setWhatsapp} inputMode="tel" />
              <TextField label="Place ID de Google" value={placeId} onChange={updatePlaceId} mono />
              <TextField label="URL de reseña" value={destinationUrl} onChange={setDestinationUrl} inputMode="url" />
            </>
          ) : null}

          {type === "instagram" ? (
            <>
              <TextField label="Usuario de Instagram" value={instagramHandle} onChange={setInstagramHandle} />
              <TextField label="Enlace de Instagram" value={destinationUrl} onChange={setDestinationUrl} inputMode="url" />
            </>
          ) : null}

          {type === "facebook" ? (
            <>
              <TextField label="Usuario o página de Facebook" value={facebookHandle} onChange={setFacebookHandle} />
              <TextField label="Enlace de Facebook" value={destinationUrl} onChange={setDestinationUrl} inputMode="url" />
            </>
          ) : null}

          {type === "profile" ? (
            <>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Descripción</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={240}
                  className="rounded-xl border border-line bg-white px-3 py-3 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
              </label>
              <div className="rounded-2xl border border-line bg-slate-50 p-4">
                <h3 className="font-semibold text-ink">Enlaces del perfil</h3>
                <div className="mt-4 grid gap-4">
                  {profileLinks.map((link) => (
                    <div key={link.type} className="rounded-xl border border-line bg-white p-3">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-ink">{profileLinkLabels[link.type]}</span>
                        <input
                          value={link.value}
                          onChange={(event) => updateProfileLink(link.type, { value: event.target.value })}
                          placeholder={profilePlaceholders[link.type]}
                          className="min-h-11 rounded-xl border border-line px-3 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                        />
                      </label>
                      <label className="mt-3 flex items-center gap-3 text-sm font-medium text-slateText">
                        <input
                          type="checkbox"
                          checked={link.enabled}
                          onChange={(event) => updateProfileLink(link.type, { enabled: event.target.checked })}
                          className="h-5 w-5 rounded border-line"
                        />
                        Mostrar este enlace
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-ink">Propietario</h2>
        <div className="mt-4 grid gap-4">
          <TextField label="Correo del propietario" value={ownerEmail} onChange={(value) => {
            setOwnerEmail(value);
            setConfirmClearOwner(false);
          }} inputMode="email" />
          <ReadOnlyField label="ID del propietario" value={plate.owner_user_id ?? "Sin reclamar"} mono />
          <p className="text-xs leading-5 text-slateText">
            Para asignar un propietario, el correo debe existir como cuenta TaplyTap. Operaciones no puede crear usuarios desde este panel.
          </p>
          {isClearingOwner ? (
            <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <input
                type="checkbox"
                checked={confirmClearOwner}
                onChange={(event) => setConfirmClearOwner(event.target.checked)}
                className="mt-0.5 h-5 w-5"
              />
              Confirmo que quiero dejar esta placa sin propietario.
            </label>
          ) : null}
        </div>
      </section>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={17} />
          {message}
        </p>
      ) : null}

      <div className="sticky bottom-3 z-10 grid grid-cols-[1fr_2fr] gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-xl backdrop-blur">
        <Link href="/support" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line text-sm font-semibold text-ink">
          Volver
        </Link>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        >
          {isPending ? <Loader2 size={17} className="animate-spin" /> : null}
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  inputMode,
  mono = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "email" | "tel" | "url";
  mono?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        className={`min-h-12 rounded-xl border border-line bg-white px-3 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function SelectField({ label, value, onChange }: { label: string; value: QrStatus; onChange: (value: QrStatus) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as QrStatus)}
        className="min-h-12 rounded-xl border border-line bg-white px-3 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
      >
        {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ReadOnlyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slateText">{label}</p>
      <p className={`mt-1 break-all text-sm text-ink ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function createProfileLinkDrafts(links: SupportEditableProfileLink[]) {
  return profileLinkTypes.map((type, index) => {
    const current = links.find((link) => link.type === type);
    return {
      type,
      value: current?.source_value ?? "",
      enabled: current?.enabled ?? false,
      sort_order: current?.sort_order ?? index
    };
  });
}

function getTypeLabel(type: SupportEditablePlateType) {
  return {
    google: "Google Reviews",
    instagram: "Instagram",
    facebook: "Facebook",
    profile: "Profile Plate"
  }[type];
}
