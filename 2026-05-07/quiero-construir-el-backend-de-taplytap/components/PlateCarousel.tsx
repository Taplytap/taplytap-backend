"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Link2,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Store
} from "lucide-react";
import { DestinationUrlEditor } from "@/components/DestinationUrlEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PlateCarouselItem = {
  id: string;
  code: string;
  status: string;
  businessName: string;
  destinationUrl: string | null;
  boostEnabled: boolean;
  createdAt: string;
  scanTotal: number;
  scanRecent: number;
  lastScanAt: string | null;
};

type PlateCarouselProps = {
  plates: PlateCarouselItem[];
  hasActiveBoostLicense: boolean;
};

export function PlateCarousel({
  plates,
  hasActiveBoostLicense
}: PlateCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localPlates, setLocalPlates] = useState(plates);

  useEffect(() => {
    setLocalPlates(plates);
  }, [plates]);

  useEffect(() => {
    function handleGlobalBoostChange(event: Event) {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;

      if (typeof detail?.enabled !== "boolean") return;

      setLocalPlates((currentPlates) =>
        currentPlates.map((plate) => ({
          ...plate,
          boostEnabled: detail.enabled ?? plate.boostEnabled
        }))
      );
    }

    window.addEventListener("taplytap:boost-global-change", handleGlobalBoostChange);

    return () => {
      window.removeEventListener("taplytap:boost-global-change", handleGlobalBoostChange);
    };
  }, []);

  function goPrevious() {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function goNext() {
    setCurrentIndex((index) => Math.min(localPlates.length - 1, index + 1));
  }

  if (localPlates.length === 0) {
    return (
      <Card className="taply-fade-up mt-8 overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brandSoft text-brand">
          <Store size={22} />
        </div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink">Aún no encontramos placas.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slateText">
          Verifica que la placa haya sido activada con el mismo email con el que iniciaste sesión.
        </p>
        <a
          href="https://taplytap.io"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,109,255,0.22)] transition hover:bg-brandHover"
        >
          Comprar una placa
        </a>
      </Card>
    );
  }

  return (
    <section className="taply-fade-up mt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Tus placas</h2>
          <p className="mt-1 text-sm text-slateText">
            {currentIndex + 1} de {localPlates.length}
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goPrevious}
            disabled={currentIndex === 0}
            aria-label="Placa anterior"
          >
            <ChevronLeft size={17} />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={goNext}
            disabled={currentIndex === localPlates.length - 1}
            aria-label="Placa siguiente"
          >
            <ChevronRight size={17} />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem]">
        <motion.div
          className="flex"
          animate={{ x: `-${currentIndex * 100}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        >
          {localPlates.map((plate, index) => (
            <div key={plate.id} className="w-full shrink-0 pr-0">
              <PlateCard
                plate={plate}
                index={index}
                total={localPlates.length}
                hasActiveBoostLicense={hasActiveBoostLicense}
                onBoostChange={(boostEnabled) => {
                  setLocalPlates((currentPlates) =>
                    currentPlates.map((currentPlate) =>
                      currentPlate.id === plate.id
                        ? { ...currentPlate, boostEnabled }
                        : currentPlate
                    )
                  );
                }}
              />
            </div>
          ))}
        </motion.div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {localPlates.map((plate, index) => (
          <button
            key={plate.id}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "h-2 rounded-full transition-all",
              currentIndex === index ? "w-6 bg-brand" : "w-2 bg-slate-300 hover:bg-brandBorder"
            )}
            aria-label={`Ver placa ${index + 1}`}
          />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={goPrevious}
          disabled={currentIndex === 0}
          aria-label="Placa anterior"
        >
          <ChevronLeft size={18} />
          Anterior
        </Button>
        <Button
          type="button"
          onClick={goNext}
          disabled={currentIndex === localPlates.length - 1}
          aria-label="Placa siguiente"
        >
          Siguiente
          <ChevronRight size={18} />
        </Button>
      </div>
    </section>
  );
}

function PlateCard({
  plate,
  index,
  total,
  hasActiveBoostLicense,
  onBoostChange
}: {
  plate: PlateCarouselItem;
  index: number;
  total: number;
  hasActiveBoostLicense: boolean;
  onBoostChange: (boostEnabled: boolean) => void;
}) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-white bg-white/95 shadow-[0_28px_90px_rgba(15,23,42,0.10)]">
      <div className="relative overflow-hidden bg-[linear-gradient(145deg,#6DA7FF_0%,#EAF3FF_52%,#FFFFFF_100%)] px-6 pb-8 pt-6 text-center">
        <Badge className="absolute left-5 top-5 border-white bg-white/85 normal-case tracking-normal text-brand">
          {index + 1} de {total}
        </Badge>
        <div className="mx-auto mt-10 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/90 bg-white/20 text-brand shadow-inner">
          <Store size={38} />
        </div>
        <h3 className="mt-5 text-3xl font-bold tracking-tight text-ink">
          {plate.businessName}
        </h3>
        <div className="mt-2 flex items-center justify-center gap-2">
          <p className="font-mono text-sm font-semibold text-slateText">{plate.code}</p>
          <CopyCodeButton code={plate.code} />
        </div>
        <Badge className={cn("mt-4 normal-case tracking-normal", getStatusBadgeClass(plate.status))}>
          {getStatusLabel(plate.status)}
        </Badge>
      </div>

      <div className="divide-y divide-line/80">
        <BoostRow
          code={plate.code}
          initialEnabled={plate.boostEnabled}
          hasActiveBoostLicense={hasActiveBoostLicense}
          onBoostChange={onBoostChange}
        />
        <InfoRow icon={<BarChart3 size={18} />} label="Scans totales" value={plate.scanTotal} />
        <InfoRow icon={<RadioTower size={18} />} label="Scans últimos 30 días" value={plate.scanRecent} />
        <InfoRow icon={<ShieldCheck size={18} />} label="Estado" value={getStatusLabel(plate.status)} />
        <InfoRow icon={<CalendarDays size={18} />} label="Último escaneo" value={formatDate(plate.lastScanAt)} />
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {plate.destinationUrl ? (
          <a
            href={plate.destinationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft"
          >
            <ExternalLink size={16} />
            Link de reseña
          </a>
        ) : null}
        <Link
          href={`/user/${plate.code}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft"
        >
          <Link2 size={16} />
          Probar placa
        </Link>
        <div className="sm:col-span-2">
          <DestinationUrlEditor
            code={plate.code}
            initialDestinationUrl={plate.destinationUrl}
            buttonLabel="Cambiar Place ID"
          />
        </div>
      </div>
    </Card>
  );
}

function BoostRow({
  code,
  initialEnabled,
  hasActiveBoostLicense,
  onBoostChange
}: {
  code: string;
  initialEnabled: boolean;
  hasActiveBoostLicense: boolean;
  onBoostChange: (boostEnabled: boolean) => void;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);

  function updateBoost(nextEnabled: boolean) {
    const previousEnabled = enabled;
    setEnabled(nextEnabled);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/qr-codes/${code}/boost`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ boost_enabled: nextEnabled })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error ?? "No pudimos actualizar Boost.");
        }

        setEnabled(Boolean(payload.boost_enabled));
        onBoostChange(Boolean(payload.boost_enabled));
      } catch {
        setEnabled(previousEnabled);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="inline-flex items-center gap-2 text-sm font-bold text-ink">
          <Sparkles size={17} className="text-brand" />
          {hasActiveBoostLicense ? (enabled ? "Boost activado" : "Boost desactivado") : "Boost bloqueado"}
        </p>
        <p className="mt-1 text-sm leading-6 text-slateText">
          {hasActiveBoostLicense
            ? "Controla Boost solo para esta placa."
            : "Activa TaplyTap Boost para usar esta función."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={!hasActiveBoostLicense || isPending}
        onClick={() => updateBoost(!enabled)}
        className={cn(
          "relative h-9 w-16 shrink-0 rounded-full transition duration-300 focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60",
          enabled && hasActiveBoostLicense ? "bg-emerald-500 shadow-[0_12px_28px_rgba(16,185,129,0.28)]" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition-all duration-300",
            enabled && hasActiveBoostLicense ? "left-8" : "left-1"
          )}
        />
        <span className="sr-only">Activar o desactivar Boost</span>
      </button>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3 text-slateText">
        <span className="shrink-0">{icon}</span>
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <span className="shrink-0 text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copyCode}
      className="rounded-lg p-1.5 text-slateText transition hover:bg-white/70 hover:text-brand"
      aria-label="Copiar código"
    >
      {copied ? <CheckCircle2 size={15} className="text-success" /> : <Copy size={15} />}
    </button>
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

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
