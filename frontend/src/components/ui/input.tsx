"use client";

import * as React from "react";
import { cn } from "./utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";