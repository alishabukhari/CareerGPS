"use client";

import * as React from "react";
import { cn } from "./utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      default: "bg-[#0F52BA] text-white hover:opacity-90",
      outline:
        "border border-slate-300 text-slate-900 hover:bg-slate-100",
      ghost: "text-slate-900 hover:bg-slate-100",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";