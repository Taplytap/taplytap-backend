"use client";

import { cn } from "@/lib/utils";

export function PrimaryButton({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-black transition disabled:opacity-50",
        variant === "primary" && "bg-[#ff5a5f] text-white shadow-lg shadow-red-500/20 hover:bg-[#ef444b]",
        variant === "secondary" && "bg-[#13212f] text-white hover:bg-[#22364a]",
        variant === "ghost" && "border border-[#eadfd1] bg-white text-[#13212f] hover:bg-slate-50",
        variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
