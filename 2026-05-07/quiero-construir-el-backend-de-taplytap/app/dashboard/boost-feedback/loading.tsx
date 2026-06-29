import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function BoostFeedbackLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#EEF6FF_0%,#F8FAFC_34%,#FFFFFF_100%)] px-5 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brandBorder hover:bg-brandSoft"
        >
          <ArrowLeft size={17} />
          Regresar al dashboard
        </Link>
        <p className="text-base font-bold tracking-tight text-brand">TaplyTap Boost</p>
        <div className="mt-4 h-12 w-72 rounded-2xl bg-slate-100 taply-shimmer" />
        <div className="mt-4 h-6 w-full max-w-xl rounded-2xl bg-slate-100 taply-shimmer" />
        <section className="mt-8 grid gap-4">
          {[0, 1, 2].map((item) => (
            <Card key={item} className="h-36 rounded-[1.5rem] bg-slate-100 taply-shimmer" />
          ))}
        </section>
      </div>
    </main>
  );
}
