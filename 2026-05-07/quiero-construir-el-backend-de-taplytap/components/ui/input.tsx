import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-12 rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink outline-none transition placeholder:text-slateText/60 hover:border-brandBorder focus:border-brand focus:ring-4 focus:ring-brand/10",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
