import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { PrivateFeedbackViewer } from "@/components/PrivateFeedbackViewer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type CustomerBoostOverviewProps = {
  feedbackCount: number;
};

export function CustomerBoostOverview({ feedbackCount }: CustomerBoostOverviewProps) {
  return (
    <Card className="taply-fade-up mt-8 overflow-hidden rounded-[1.75rem] border-brandBorder bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF6FF_100%)] p-5 shadow-[0_22px_70px_rgba(0,109,255,0.10)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_16px_34px_rgba(0,109,255,0.25)]">
            <Zap size={23} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-ink">TaplyTap Boost</h2>
              <Badge variant="success" className="normal-case tracking-normal">
                <CheckCircle2 size={13} />
                Activo
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slateText">
              Tu suscripción está activa. Puedes encender o apagar Boost en cada placa.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a
                href="https://taplytap.io/products/taplytap-boost"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brandHover"
              >
                ¿Quieres ver más detalles?
                <ArrowRight size={15} />
              </a>
              <span className="text-xs font-medium text-slateText">
                {feedbackCount} comentarios privados
              </span>
              <PrivateFeedbackViewer feedbackCount={feedbackCount} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2">
          <Sparkles size={16} className="text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700">Incluido</span>
          <span className="relative h-8 w-14 rounded-full bg-emerald-500 shadow-[0_12px_28px_rgba(16,185,129,0.28)]">
            <span className="absolute left-7 top-1 h-6 w-6 rounded-full bg-white shadow-sm" />
          </span>
        </div>
      </div>
    </Card>
  );
}
