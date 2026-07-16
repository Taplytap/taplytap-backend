"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { InstagramPlate, QrStatus } from "@/lib/types";

type AdminInstagramPlateEditFormProps = {
  plate: InstagramPlate;
};

const statuses: Array<{ value: QrStatus; label: string }> = [
  { value: "inactive", label: "Pendiente" },
  { value: "active", label: "Activa" },
  { value: "blocked", label: "Bloqueada" }
];

export function AdminInstagramPlateEditForm({ plate }: AdminInstagramPlateEditFormProps) {
  const router = useRouter();
  const [destinationUrl, setDestinationUrl] = useState(plate.destination_url ?? "");
  const [ownerEmail, setOwnerEmail] = useState(plate.owner_email ?? "");
  const [status, setStatus] = useState<QrStatus>(plate.status);
  const [confirmClearOwner, setConfirmClearOwner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isClearingOwner = Boolean((plate.owner_email || plate.owner_user_id) && !ownerEmail.trim());

  function save() {
    setError(null);
    setMessage(null);

    if (isClearingOwner && !confirmClearOwner) {
      setError("Confirma que quieres quitar el propietario de esta placa.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/instagram-plates/${plate.code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          destination_url: destinationUrl,
          owner_email: ownerEmail,
          status,
          clear_owner_confirm: confirmClearOwner
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "No pudimos guardar los cambios.");
        return;
      }

      setMessage("Placa actualizada correctamente.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8">
      <div className="grid gap-5">
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Código</span>
          <p className="rounded-xl border border-line bg-slate-50 px-3 py-3 font-mono text-sm text-slateText">
            {plate.code}
          </p>
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-ink">URL pública</span>
          <p className="break-all rounded-xl border border-line bg-slate-50 px-3 py-3 font-mono text-sm text-slateText">
            {plate.public_url ?? "—"}
          </p>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Enlace de Instagram</span>
          <input
            value={destinationUrl}
            onChange={(event) => setDestinationUrl(event.target.value)}
            className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
            placeholder="https://www.instagram.com/perfil?igsh=..."
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Propietario por correo</span>
          <input
            value={ownerEmail}
            onChange={(event) => {
              setOwnerEmail(event.target.value);
              setConfirmClearOwner(false);
            }}
            className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
            placeholder="cliente@negocio.com"
          />
          <span className="text-xs leading-5 text-slateText">
            Para asignar propietario, el correo debe existir como cuenta TaplyTap. No se crean usuarios desde aquí.
          </span>
        </label>
        {isClearingOwner ? (
          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={confirmClearOwner}
              onChange={(event) => setConfirmClearOwner(event.target.checked)}
              className="mt-1"
            />
            Confirmo que quiero dejar esta placa sin propietario.
          </label>
        ) : null}
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Estado</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as QrStatus)}
            className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
          >
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {status === "inactive" ? (
          <p className="rounded-xl border border-line bg-slate-50 px-4 py-3 text-sm leading-6 text-slateText">
            Si dejas la placa como pendiente, `/instagram/{plate.code}` volverá a mostrar activación. No se limpian propietario ni destino automáticamente.
          </p>
        ) : null}
        {status === "blocked" ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            Bloqueada conserva propietario y destino, pero detiene la redirección pública.
          </p>
        ) : null}
      </div>

      {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}

      <div className="mt-6 grid gap-3 sm:flex sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/admin/instagram")}
          className="min-h-11 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brandHover disabled:cursor-wait disabled:opacity-70"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
