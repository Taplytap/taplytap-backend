import { QrStatus } from "@/lib/types";

const labels: Record<QrStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  blocked: "Bloqueado"
};

const styles: Record<QrStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-amber-100 text-amber-800",
  blocked: "bg-red-100 text-red-800"
};

export function StatusBadge({ status }: { status: QrStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
