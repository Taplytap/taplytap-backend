"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Plus, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
      };
    };
  }
}

export function ActivateAnotherPlate() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  function openQuickActivation(rawValue: string) {
    const code = extractCode(rawValue);

    if (!code) {
      setScannerMessage("No pudimos detectar el código de la placa.");
      return;
    }

    stopCamera();
    setIsOpen(false);
    router.push(`/activate/quick/${code}`);
  }

  async function startCamera() {
    setScannerMessage(null);

    if (!window.BarcodeDetector) {
      setScannerMessage("Tu navegador no permite escanear QR aquí. Puedes ingresar el código manualmente.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;

        try {
          const barcodes = await detector.detect(videoRef.current);
          const firstValue = barcodes[0]?.rawValue;

          if (firstValue) {
            openQuickActivation(firstValue);
            return;
          }
        } catch {
          setScannerMessage("No pudimos leer el QR. Intenta con buena luz o ingresa el código.");
        }

        scanLoopRef.current = window.setTimeout(scan, 450);
      };

      scanLoopRef.current = window.setTimeout(scan, 650);
    } catch {
      setScannerMessage("No pudimos abrir la cámara. Puedes ingresar el código manualmente.");
    }
  }

  function stopCamera() {
    if (scanLoopRef.current) {
      window.clearTimeout(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  }

  function submitManualCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openQuickActivation(codeInput);
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className="taply-breathe mt-7 min-h-14 w-full rounded-2xl bg-brand text-base font-bold text-white shadow-[0_18px_44px_rgba(0,109,255,0.24)] hover:bg-brandHover sm:w-auto sm:min-w-80"
      >
        <Plus size={18} />
        ACTIVAR OTRA PLACA
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/40 px-4 py-5 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full rounded-[2rem] border border-line bg-white p-5 shadow-[0_24px_90px_rgba(15,23,42,0.22)] animate-in fade-in slide-in-from-bottom-3 duration-300 sm:max-w-md sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brandSoft text-brand">
                  <QrCode size={24} />
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink">Activa tu nueva placa</h2>
                <p className="mt-2 text-sm leading-6 text-slateText">
                  Escanea el QR de la nueva placa que quieres agregar a tu cuenta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slateText transition hover:bg-slate-100 hover:text-ink"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-slate-950">
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn("aspect-[4/3] w-full object-cover", isScanning ? "block" : "hidden")}
              />
              {!isScanning ? (
                <div className="flex aspect-[4/3] flex-col items-center justify-center p-6 text-center text-white">
                  <Camera size={34} />
                  <p className="mt-3 text-sm text-white/75">La cámara se abrirá cuando toques escanear.</p>
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={isScanning ? stopCamera : startCamera}
              className="mt-4 min-h-12 w-full rounded-2xl"
            >
              {isScanning ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
              {isScanning ? "Escaneando..." : "Escanear con cámara"}
            </Button>

            {scannerMessage ? <p className="mt-3 text-sm leading-6 text-slateText">{scannerMessage}</p> : null}

            <form onSubmit={submitManualCode} className="mt-5 rounded-2xl border border-line bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">¿No puedes escanearlo? Ingresa el código de tu placa.</p>
              <input
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value)}
                placeholder="Ej. abc12345"
                className="mt-3 min-h-12 w-full rounded-2xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
              />
              <Button type="submit" variant="outline" className="mt-3 min-h-11 w-full rounded-2xl">
                Continuar
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function extractCode(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return "";

  try {
    const url = new URL(trimmedValue);
    const segments = url.pathname.split("/").filter(Boolean);
    const userIndex = segments.findIndex((segment) => segment.toLowerCase() === "user");

    if (userIndex >= 0 && segments[userIndex + 1]) {
      return normalizeCodeForRoute(segments[userIndex + 1]);
    }
  } catch {
    // Plain codes are supported as a fallback.
  }

  const match = trimmedValue.match(/\/user\/([a-zA-Z0-9_-]{4,64})/);

  if (match?.[1]) {
    return normalizeCodeForRoute(match[1]);
  }

  return normalizeCodeForRoute(trimmedValue);
}

function normalizeCodeForRoute(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9_-]{4,64}$/.test(normalized) ? normalized : "";
}
