import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-mint">
        TaplyTap
      </p>
      <h1 className="text-4xl font-bold text-ink">Backend NFC/QR listo para operar.</h1>
      <p className="mt-4 text-lg text-gray-600">
        Escanea una placa, valida su estado, redirige al negocio y registra el evento.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Panel admin
        </Link>
      </div>
    </main>
  );
}
