"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createGoogleReviewUrl } from "@/lib/qr-form";
import type { QrCode, QrStatus } from "@/lib/types";
import type { QrFormErrors } from "@/lib/qr-form";

type AdminQrEditFormProps = {
  qrCode: QrCode;
};

const statuses: { value: QrStatus; label: string }[] = [
  { value: "inactive", label: "Inactive" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" }
];

const emptyErrors: QrFormErrors = {};

export function AdminQrEditForm({ qrCode }: AdminQrEditFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<QrStatus>(qrCode.status);
  const [placeId, setPlaceId] = useState(qrCode.place_id ?? "");
  const [destinationUrl, setDestinationUrl] = useState(qrCode.destination_url ?? "");
  const [errors, setErrors] = useState<QrFormErrors>(emptyErrors);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const platePath = useMemo(() => `/user/${qrCode.code}`, [qrCode.code]);

  async function submit(form: HTMLFormElement, nextStatus?: QrStatus) {
    setErrors(emptyErrors);
    setMessage(null);
    setSubmitError(null);

    const formData = new FormData(form);

    if (nextStatus) {
      formData.set("status", nextStatus);
      setStatus(nextStatus);
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/qr-codes/${qrCode.code}`, {
        method: "PATCH",
        body: formData
      });

      const result = (await response.json().catch(() => null)) as
        | { ok: true; message?: string }
        | { ok?: false; error?: string; errors?: QrFormErrors }
        | null;

      if (!response.ok || result?.ok !== true) {
        const errorResult = result as { error?: string; errors?: QrFormErrors } | null;
        setErrors(errorResult?.errors ?? emptyErrors);
        setSubmitError(errorResult?.error ?? "No pudimos actualizar el QR.");
        return;
      }

      setMessage(result.message ?? "QR actualizado correctamente");
      router.refresh();
    });
  }

  return (
    <form
      className="mt-8 rounded-md border border-gray-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Estado</span>
          <select
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as QrStatus)}
            className={`rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint/20 ${
              errors.status ? "border-red-300" : "border-gray-300"
            }`}
          >
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.status ? <span className="text-sm text-red-600">{errors.status}</span> : null}
        </label>
        <Field
          label="Nombre del negocio"
          name="business_name"
          defaultValue={qrCode.business_name}
          error={errors.business_name}
        />
        <Field label="WhatsApp" name="whatsapp" defaultValue={qrCode.whatsapp} error={errors.whatsapp} />
        <Field
          label="Email"
          name="owner_email"
          type="email"
          defaultValue={qrCode.owner_email}
          error={errors.owner_email}
        />
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Place ID</span>
          <input
            name="place_id"
            value={placeId}
            onChange={(event) => setPlaceId(event.target.value)}
            className={`rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint/20 ${
              errors.place_id ? "border-red-300" : "border-gray-300"
            }`}
            placeholder="ChIJxxxxxxxxxxxxxxxx"
          />
          {errors.place_id ? <span className="text-sm text-red-600">{errors.place_id}</span> : null}
        </label>
        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-ink">Destination URL / Google Reviews URL</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="destination_url"
              type="url"
              value={destinationUrl}
              onChange={(event) => setDestinationUrl(event.target.value)}
              className={`min-w-0 flex-1 rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint/20 ${
                errors.destination_url ? "border-red-300" : "border-gray-300"
              }`}
            />
            <button
              type="button"
              onClick={() => {
                const cleanPlaceId = placeId.trim().replace(/\s/g, "");
                if (cleanPlaceId) setDestinationUrl(createGoogleReviewUrl(cleanPlaceId));
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-ink"
            >
              Reconstruir URL
            </button>
          </div>
          {errors.destination_url ? (
            <span className="text-sm text-red-600">{errors.destination_url}</span>
          ) : null}
        </label>
      </div>

      {message ? (
        <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {submitError ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={(event) => submit(event.currentTarget.form!, "blocked")}
          className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Bloquear QR
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={(event) => submit(event.currentTarget.form!, "active")}
          className="rounded-md border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reactivar QR
        </button>
        <Link
          href="/admin"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-ink"
        >
          Cancelar
        </Link>
        <a href={platePath} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-ink">
          Ver placa
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  error
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  error?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className={`rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-mint focus:ring-2 focus:ring-mint/20 ${
          error ? "border-red-300" : "border-gray-300"
        }`}
      />
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </label>
  );
}
