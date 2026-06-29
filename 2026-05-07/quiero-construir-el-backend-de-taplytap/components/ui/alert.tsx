import * as React from "react";
import { cn } from "@/lib/utils";

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "success" | "destructive";
};

const variants = {
  default: "border-line bg-slate-50 text-slateText",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  destructive: "border-red-100 bg-red-50 text-red-700"
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-2xl border p-4 text-sm leading-6", variants[variant], className)}
      {...props}
    />
  )
);

Alert.displayName = "Alert";
