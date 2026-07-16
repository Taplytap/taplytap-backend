import Link from "next/link";
import { ArrowLeft, Instagram } from "lucide-react";
import { InstagramPlateCreator } from "@/components/InstagramPlateCreator";
import { requireAdmin } from "@/lib/auth";

export default async function AdminInstagramPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slateText hover:text-ink"
        >
          <ArrowLeft size={16} />
          Volver al dashboard
        </Link>

        <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brandSoft text-brand">
            <Instagram size={22} />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-brand">TaplyTap Admin</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Placas Instagram</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slateText">
            Genera links únicos para las placas físicas de Instagram. Estos registros viven separados de
            las placas de reseñas y no cambian ningún QR público existente.
          </p>
        </div>

        <section className="mt-6">
          <InstagramPlateCreator />
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-white p-5 text-sm leading-6 text-slateText shadow-sm">
          <p className="font-semibold text-ink">Formato de link</p>
          <p className="mt-2">
            Cada placa queda con una URL pública como{" "}
            <span className="font-mono text-xs text-ink">https://app.taplytap.io/instagram/[codigo]</span>.
          </p>
          <p className="mt-2">
            Por ahora esta sección solo crea y exporta links. La configuración del destino de Instagram se
            mantiene separada para proteger las placas de reseñas que ya están en producción.
          </p>
        </section>
      </div>
    </main>
  );
}
