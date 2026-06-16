import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DangerZone } from "@/components/DangerZone";
import { requireAdmin } from "@/lib/auth";

export default async function AdminDangerPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#f7faf9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-ink"
        >
          <ArrowLeft size={16} />
          Volver al dashboard
        </Link>

        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">TaplyTap Admin</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Zona de eliminación</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Herramientas destructivas separadas del trabajo diario para evitar acciones accidentales.
          </p>
        </div>

        <DangerZone />
      </div>
    </main>
  );
}
