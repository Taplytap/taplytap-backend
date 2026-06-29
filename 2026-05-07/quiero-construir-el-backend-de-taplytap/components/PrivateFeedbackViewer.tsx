"use client";

import { useState } from "react";
import { Loader2, MessageSquareText, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PrivateFeedbackItem = {
  id: string;
  code: string;
  rating: number;
  message: string;
  created_at: string;
  plate_code: string;
  plate_name: string | null;
};

type PrivateFeedbackResponse = {
  feedback?: PrivateFeedbackItem[];
  error?: string;
};

type PrivateFeedbackViewerProps = {
  feedbackCount: number;
};

export function PrivateFeedbackViewer({ feedbackCount }: PrivateFeedbackViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<PrivateFeedbackItem[] | null>(null);

  async function openFeedback() {
    setIsOpen(true);

    if (feedback) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/boost-feedback/private", {
        method: "GET",
        cache: "no-store"
      });
      const payload = (await response.json()) as PrivateFeedbackResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar tus comentarios.");
      }

      setFeedback(payload.feedback ?? []);
    } catch (feedbackError) {
      setError(feedbackError instanceof Error ? feedbackError.message : "No pudimos cargar tus comentarios.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={openFeedback}
        className="px-0 hover:bg-transparent"
      >
        <MessageSquareText size={15} />
        Ver comentarios privados
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-ink/35 px-4 py-5 backdrop-blur-sm sm:flex sm:items-center sm:justify-center">
          <Card className="taply-fade-up ml-auto flex h-full max-h-[92vh] w-full flex-col overflow-hidden rounded-[2rem] border-white bg-white shadow-[0_32px_100px_rgba(15,23,42,0.22)] sm:mx-auto sm:h-auto sm:max-w-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-ink">Comentarios privados</h2>
                  <Badge className="normal-case tracking-normal">{feedbackCount}</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-slateText">
                  Últimos comentarios recibidos desde TaplyTap Boost.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slateText transition hover:bg-slate-100 hover:text-ink"
                aria-label="Cerrar comentarios privados"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {isLoading ? (
                <div className="grid gap-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="taply-shimmer h-28 rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  {error}
                </div>
              ) : (feedback ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-brandBorder bg-brandSoft/60 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand">
                    <MessageSquareText size={22} />
                  </div>
                  <p className="mt-4 text-base font-semibold text-ink">Aún no tienes comentarios privados.</p>
                  <p className="mt-2 text-sm leading-6 text-slateText">
                    Cuando un cliente deje feedback, aparecerá aquí.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {(feedback ?? []).map((item) => (
                    <article key={item.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {item.plate_name ?? "Placa TaplyTap"}
                          </p>
                          <p className="mt-1 font-mono text-xs text-slateText">{item.plate_code}</p>
                        </div>
                        <time className="shrink-0 text-xs font-medium text-slateText">
                          {formatFeedbackDate(item.created_at)}
                        </time>
                      </div>
                      <p className="mt-3 flex gap-0.5 text-amber-400" aria-label={`${item.rating} estrellas`}>
                        {renderStars(item.rating)}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-ink">“{item.message}”</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      size={16}
      fill={index < rating ? "currentColor" : "none"}
      className={index < rating ? "text-amber-400" : "text-slate-300"}
    />
  ));
}

function formatFeedbackDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Hoy";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Ayer";
  }

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
