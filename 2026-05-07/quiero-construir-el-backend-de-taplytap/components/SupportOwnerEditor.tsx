"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, UserRoundCog } from "lucide-react";

type SupportOwnerEditorProps = {
  code: string;
  currentOwnerEmail: string | null;
  currentOwnerUserId: string | null;
};

export function SupportOwnerEditor({
  code,
  currentOwnerEmail,
  currentOwnerUserId
}: SupportOwnerEditorProps) {
  const router = useRouter();
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const normalizedNewEmail = newOwnerEmail.trim().toLowerCase();
  const currentOwnerLabel = currentOwnerEmail ?? "Sin propietario";

  function requestConfirmation() {
    setMessage(null);
    setError(null);

    if (!normalizedNewEmail) {
      setError("Ingresa el correo del nuevo propietario.");
      return;
    }

    setIsConfirming(true);
  }

  function changeOwner() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/support/qr-codes/${code}/owner`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ owner_email: normalizedNewEmail })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "No pudimos cambiar el propietario.");
        setIsConfirming(false);
        return;
      }

      setMessage(payload.unchanged ? "La placa ya pertenece a ese propietario." : "Propietario actualizado.");
      setNewOwnerEmail("");
      setIsConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-5 rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brandSoft text-brand">
          <UserRoundCog size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Cambiar propietario</p>
          <p className="mt-1 text-xs leading-5 text-slateText">
            Solo asigna placas a cuentas que ya existen en Supabase Auth.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slateText">Propietario actual</p>
        <p className="mt-1 break-all text-sm font-semibold text-ink">{currentOwnerLabel}</p>
        <p className="mt-1 break-all font-mono text-xs text-slateText">{currentOwnerUserId ?? "Sin owner_user_id"}</p>
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-sm font-semibold text-ink">Nuevo propietario</span>
        <input
          value={newOwnerEmail}
          onChange={(event) => setNewOwnerEmail(event.target.value)}
          type="email"
          className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink outline-none transition placeholder:text-slateText/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
          placeholder="clientenuevo@email.com"
          disabled={isPending}
        />
      </label>

      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
      {message ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 size={16} />
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={requestConfirmation}
        disabled={isPending}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brandSoft disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        Cambiar propietario
      </button>

      {isConfirming ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/35 px-4 py-5 sm:items-center sm:justify-center">
          <div className="w-full rounded-2xl border border-line bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:max-w-md">
            <p className="text-base font-bold text-ink">Confirmar cambio de propietario</p>
            <p className="mt-2 text-sm leading-6 text-slateText">
              Esta placa dejará de pertenecer a{" "}
              <span className="font-semibold text-ink">{currentOwnerLabel}</span> y pasará a{" "}
              <span className="font-semibold text-ink">{normalizedNewEmail}</span>.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsConfirming(false)}
                className="min-h-11 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={changeOwner}
                className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brandHover disabled:cursor-wait disabled:opacity-70"
              >
                {isPending ? "Cambiando..." : "Confirmar cambio"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
