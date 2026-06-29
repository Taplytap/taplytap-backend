"use client";

import { useState } from "react";
import { ExternalLink, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function BoostLockedCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST"
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "No pudimos iniciar el pago en este momento.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "No pudimos iniciar el pago en este momento."
      );
      setIsLoading(false);
    }
  }

  return (
    <Card className="taply-fade-up mt-5 overflow-hidden border-brandBorder bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF6FF_100%)] p-5 shadow-[0_22px_70px_rgba(0,109,255,0.10)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(0,109,255,0.14)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand" />
            <h3 className="text-lg font-bold text-ink">TaplyTap Boost</h3>
            <Badge className="bg-white/80 normal-case tracking-normal">Premium</Badge>
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">
            Estado:
            <span className="ml-2 inline-flex items-center gap-1 text-slateText">
              <LockKeyhole size={14} />
              Bloqueado
            </span>
          </p>
          <p className="mt-2 text-sm leading-6 text-slateText">
            Activa Boost para filtrar reseñas y recibir comentarios privados.
          </p>
          <a
            href="https://taplytap.io/products/taplytap-boost"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brandHover"
          >
            ¿Quieres ver más detalles?
            <ExternalLink size={14} />
          </a>
          {error ? (
            <Alert variant="destructive" className="mt-3 px-3 py-2">
              {error}
            </Alert>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={handleCheckout}
          disabled={isLoading}
          size="lg"
          className="text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Abriendo...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Activar Boost
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
