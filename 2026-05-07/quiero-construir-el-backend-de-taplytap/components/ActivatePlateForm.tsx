"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, CheckCircle2, Copy, Gift, Loader2, Sparkles } from "lucide-react";
import { SupportWhatsAppBubble } from "@/components/SupportWhatsAppBubble";
import type { QrFormErrors } from "@/lib/qr-form";

type ActivatePlateFormProps = {
  code: string;
};

const emptyErrors: QrFormErrors = {};
const giftCode = "BYX100";

export function ActivatePlateForm({ code }: ActivatePlateFormProps) {
  const [errors, setErrors] = useState<QrFormErrors>(emptyErrors);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const plateUrl = useMemo(() => `/user/${code}`, [code]);

  async function copyGiftCode() {
    try {
      await navigator.clipboard.writeText(giftCode);
    } catch {
      return;
    }

    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 2200);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors(emptyErrors);
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch(`/api/activate/${code}`, {
        method: "POST",
        body: formData
      });

      const result = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok?: false; error?: string; errors?: QrFormErrors }
        | null;

      if (!response.ok || result?.ok !== true) {
        const errorResult = result as { error?: string; errors?: QrFormErrors } | null;
        setErrors(errorResult?.errors ?? emptyErrors);
        setSubmitError(errorResult?.error ?? "No pudimos activar tu placa. Intenta de nuevo.");
        return;
      }

      setIsSuccess(true);
    });
  }

  if (isSuccess) {
    return (
      <>
        <section className="relative mt-8 overflow-hidden rounded-lg border border-emerald-100 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-700 sm:p-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="absolute right-8 top-8 h-2 w-2 animate-ping rounded-full bg-mint/60" />
            <span className="absolute left-10 top-24 h-1.5 w-1.5 animate-pulse rounded-full bg-coral/70" />
            <span className="absolute bottom-20 right-16 h-2 w-2 animate-bounce rounded-full bg-emerald-300/70" />
          </div>

          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-ink">¡Tu placa TaplyTap ya está activa!</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Ya puedes probar el escaneo. Tus clientes llegarán directo a dejarte una reseña.
            </p>

            <div className="mt-6 rounded-lg border border-emerald-100 bg-[#f7faf9] p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-mint shadow-sm">
                  <Gift size={22} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-mint">
                    <Sparkles size={13} />
                    Regalo desbloqueado
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-700">
                    Por ser uno de nuestros clientes especiales, desbloqueaste $100 MXN de regalo para tu próxima placa.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-md border border-dashed border-emerald-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Código</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-mono text-2xl font-bold tracking-wide text-ink">{giftCode}</span>
                  <button
                    type="button"
                    onClick={copyGiftCode}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-gray-50"
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    {isCopied ? "Código copiado" : "Copiar código"}
                  </button>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-500">
                Código válido durante 21 días. Aplica únicamente en tu próxima compra.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a
                href="https://taplytap.io"
                className="inline-flex w-full items-center justify-center rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Comprar otra placa
              </a>
              <a
                href="/dashboard"
                className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-gray-50"
              >
                Ir a mi dashboard
              </a>
            </div>

            <a href={plateUrl} className="mt-5 inline-flex text-sm font-semibold text-mint">
              Probar mi placa
            </a>
          </div>
        </section>
        <SupportWhatsAppBubble />
      </>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="grid gap-5">
          <Field
            label="Nombre del negocio"
            name="business_name"
            placeholder="Café Central"
            required
            error={errors.business_name}
          />
          <Field
            label="Número de teléfono / WhatsApp"
            name="whatsapp"
            inputMode="tel"
            pattern="[0-9]{10}"
            maxLength={10}
            placeholder="5512345678"
            required
            error={errors.whatsapp}
          />
          <Field
            label="Correo electrónico"
            name="owner_email"
            type="email"
            placeholder="dueno@negocio.com"
            required
            error={errors.owner_email}
          />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
            error={errors.password}
          />
          <PlaceIdField error={errors.place_id} />
        </div>

        <p className="mt-6 rounded-md bg-[#f7faf9] px-4 py-3 text-sm leading-6 text-gray-600">
          Podrás solicitar cambios a soporte cuando lo necesites.
        </p>

        {submitError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
          {isPending ? "Activando..." : "Activar mi placa"}
        </button>
      </form>
      <SupportWhatsAppBubble />
    </>
  );
}

function PlaceIdField({ error }: { error?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">
        Place ID de Google Maps <span className="text-coral">*</span>
      </span>
      <input
        name="place_id"
        required
        className={`rounded-md border bg-white px-3 py-3 text-base text-ink outline-none transition placeholder:text-gray-400 focus:border-mint focus:ring-2 focus:ring-mint/20 ${
          error ? "border-red-300" : "border-gray-300"
        }`}
        placeholder="Ej. ChIJxxxxxxxxxxxx"
      />
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
      <span className="text-sm leading-6 text-gray-500">
        Busca tu negocio, copia tu Place ID y pégalo aquí. Si necesitas ayuda, toca el botón de WhatsApp.{" "}
        <a
          href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-mint"
        >
          Buscar mi Place ID
        </a>
      </span>
    </label>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  inputMode,
  pattern,
  maxLength,
  minLength,
  error
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  maxLength?: number;
  minLength?: number;
  error?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-coral"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
        minLength={minLength}
        className={`rounded-md border bg-white px-3 py-3 text-base text-ink outline-none transition placeholder:text-gray-400 focus:border-mint focus:ring-2 focus:ring-mint/20 ${
          error ? "border-red-300" : "border-gray-300"
        }`}
        placeholder={placeholder}
      />
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </label>
  );
}
