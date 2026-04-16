import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/utils";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export function FormInput({ label, error, helperText, id, className, ...props }: FormInputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "w-full rounded-lg border bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition",
          error
            ? "border-rose-500 focus:ring-2 focus:ring-rose-500/40"
            : "border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="text-xs text-rose-400" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}
