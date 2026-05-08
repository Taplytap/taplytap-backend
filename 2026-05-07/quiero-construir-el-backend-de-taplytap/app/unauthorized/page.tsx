import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-mint">TaplyTap</p>
      <h1 className="text-3xl font-bold text-ink">Acceso no autorizado</h1>
      <p className="mt-4 text-gray-600">
        Tu sesión existe, pero este correo no está autorizado para administrar TaplyTap.
      </p>
      <Link href="/login" className="mt-8 text-sm font-semibold text-mint">
        Entrar con otro correo
      </Link>
    </main>
  );
}
