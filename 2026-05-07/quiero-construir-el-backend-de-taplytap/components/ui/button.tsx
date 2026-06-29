import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
};

const variants = {
  default:
    "bg-brand text-white shadow-[0_16px_36px_rgba(0,109,255,0.24)] hover:bg-brandHover hover:shadow-[0_22px_44px_rgba(0,109,255,0.28)]",
  outline:
    "border border-line bg-white text-ink hover:border-brandBorder hover:bg-brandSoft",
  ghost:
    "bg-transparent text-brand hover:bg-brandSoft hover:text-brandHover",
  secondary:
    "border border-brandBorder bg-brandSoft text-brand hover:bg-white"
};

const sizes = {
  default: "min-h-11 px-4 py-2.5 text-sm",
  sm: "min-h-9 px-3 py-2 text-sm",
  lg: "min-h-12 px-5 py-3 text-base"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-70",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
