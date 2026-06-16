import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BatchQrCreator } from "@/components/BatchQrCreator";
import { requireAdmin } from "@/lib/auth";

export default async function AdminQrPage() {
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
          <p className="text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap Admin</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Crear QR</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Genera links públicos para producción física y exporta el CSV de links. La generación de PNG
            permanece desactivada hasta usar una herramienta externa validada.
          </p>
        </div>

        <div className="mt-8">
          <BatchQrCreator />
        </div>
      </div>
    </main>
  );
}
