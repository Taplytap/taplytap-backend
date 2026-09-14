"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { SupportWhatsAppBubble } from "@/components/SupportWhatsAppBubble";
import { profileLinkLabels, profileLinkTypes } from "@/lib/profile-links";
import type { ProfileLinkType } from "@/lib/types";

type ActivateProfilePlateFormProps = {
  code: string;
  currentUserEmail: string | null;
};

type FormErrors = Record<string, string | undefined>;

const placeholders: Record<ProfileLinkType, string> = {
  instagram: "https://www.instagram.com/tuperfil",
  whatsapp: "523312345678",
  facebook: "https://www.facebook.com/tupagina",
  google_reviews: "ChIJxxxxxxxxxxxx",
  tiktok: "https://www.tiktok.com/@tuperfil",
  website: "https://tunegocio.com"
};

export function ActivateProfilePlateForm({ code, currentUserEmail }: ActivateProfilePlateFormProps) {
  const [activeEmail, setActiveEmail] = useState(currentUserEmail);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isConfirmingAccountChange, setIsConfirmingAccountChange] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, startSignOutTransition] = useTransition();
  const isSignedIn = Boolean(activeEmail);

  function changeAccount() {
    setSubmitError(null);

    startSignOutTransition(async () => {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST"
      });

      if (!response.ok) {
        setSubmitError("No pudimos cerrar la sesión actual. Intenta de nuevo.");
        return;
      }

      setActiveEmail(null);
      setIsConfirmingAccountChange(false);
      setErrors({});
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch(`/api/activate/profile/${code}`, {
        method: "POST",
        body: formData
      });
      const result = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok?: false; error?: string; errors?: FormErrors }
        | null;

      if (!response.ok || result?.ok !== true) {
        const errorResult = result as { error?: string; errors?: FormErrors } | null;
        setErrors(errorResult?.errors ?? {});
        setSubmitError(errorResult?.error ?? "No pudimos activar tu perfil.");
        return;
      }

      setIsSuccess(true);
    });
  }

  if (isSuccess) {
    return (
      <>
        <section className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] animate-in fade-in slide-in-from-bottom-3 duration-700 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brandSoft text-brand">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-ink">Tu perfil TaplyTap ya está activo</h2>
          <p className="mt-3 text-sm leading-6 text-slateText">
            Tu placa ahora mostrará tus enlaces principales en una página rápida y limpia.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href={`/p/${code}`}
              className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brandHover"
            >
              Probar perfil
            </a>
            <a
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-brandSoft"
            >
              Ir a mi dashboard
            </a>
          </div>
        </section>
        <SupportWhatsAppBubble />
      </>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="grid gap-5">
          {isSignedIn ? (
            <div className="rounded-xl border border-brandBorder bg-brandSoft px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slateText">Cuenta TaplyTap</p>
              <p className="mt-1 break-all text-sm font-semibold text-ink">{activeEmail}</p>
              <p className="mt-3 text-xs leading-5 text-slateText">
                Este perfil quedará vinculado a esta cuenta.{" "}
                <button
                  type="button"
                  onClick={() => setIsConfirmingAccountChange(true)}
                  className="font-semibold text-brand hover:text-brandHover"
                >
                  Cambiar cuenta
                </button>
              </p>
            </div>
          ) : (
            <>
              <Field
                label="Correo de la cuenta TaplyTap"
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
            </>
          )}

          <Field
            label="Nombre del negocio"
            name="business_name"
            placeholder="Café Central"
            required
            error={errors.business_name}
          />

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Descripción corta</span>
            <textarea
              name="description"
              rows={3}
              maxLength={240}
              placeholder="Una frase corta para presentar tu negocio."
              className={`rounded-xl border bg-white px-3 py-3 text-base text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15 ${
                errors.description ? "border-error" : "border-line"
              }`}
            />
            {errors.description ? <span className="text-sm text-red-600">{errors.description}</span> : null}
          </label>

          <div className="rounded-2xl border border-line bg-slate-50 p-4">
            <p className="text-sm font-bold text-ink">Enlaces del perfil</p>
            <p className="mt-1 text-sm leading-6 text-slateText">
              Agrega al menos un enlace. Puedes activar o pausar cada botón visible.
            </p>
            <div className="mt-4 grid gap-4">
              {profileLinkTypes.map((type) => (
                <ProfileLinkField key={type} type={type} error={errors[type] ?? errors[`value_${type}`]} />
              ))}
            </div>
            {errors.links ? <p className="mt-3 text-sm text-error">{errors.links}</p> : null}
          </div>
        </div>

        {submitError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-white shadow-[0_14px_30px_rgba(0,109,255,0.24)] transition hover:bg-brandHover disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
          {isPending ? "Activando..." : "Activar mi perfil"}
        </button>
      </form>
      {isConfirmingAccountChange ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/30 px-4 py-5 sm:items-center sm:justify-center">
          <div className="w-full rounded-2xl border border-line bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:max-w-sm">
            <p className="text-base font-bold text-ink">¿Seguro que quieres cambiar de cuenta?</p>
            <p className="mt-2 text-sm leading-6 text-slateText">
              Se cerrará la sesión actual y podrás iniciar sesión con otro correo.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => setIsConfirmingAccountChange(false)}
                className="min-h-11 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={changeAccount}
                className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brandHover disabled:cursor-wait disabled:opacity-70"
              >
                {isSigningOut ? "Cambiando..." : "Sí, cambiar cuenta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <SupportWhatsAppBubble />
    </>
  );
}

function ProfileLinkField({ type, error }: { type: ProfileLinkType; error?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-ink" htmlFor={`value_${type}`}>
          {profileLinkLabels[type]}
        </label>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slateText">
          <input name={`enabled_${type}`} type="checkbox" defaultChecked className="h-4 w-4 rounded border-line text-brand" />
          Visible
        </label>
      </div>
      <input
        id={`value_${type}`}
        name={`value_${type}`}
        placeholder={placeholders[type]}
        className={`mt-3 w-full rounded-xl border bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15 ${
          error ? "border-error" : "border-line"
        }`}
      />
      {type === "google_reviews" ? (
        <p className="mt-2 text-xs leading-5 text-slateText">
          Pega solo el Place ID o el link completo con placeid=. Nosotros creamos el enlace de reseña.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  minLength,
  error
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  error?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        className={`rounded-xl border bg-white px-3 py-3 text-base text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15 ${
          error ? "border-error" : "border-line"
        }`}
        placeholder={placeholder}
      />
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </label>
  );
}
