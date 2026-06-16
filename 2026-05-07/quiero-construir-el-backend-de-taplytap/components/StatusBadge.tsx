import { QrStatus } from "@/lib/types";

const labels: Record<QrStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  blocked: "Bloqueado"
};

const styles: Record<QrStatus, string> = {
  active: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  inactive: "border border-brandBorder bg-brandSoft text-brand",
  blocked: "border border-red-200 bg-red-50 text-red-700"
};

export function StatusBadge({ status }: { status: QrStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
