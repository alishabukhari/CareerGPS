"use client";

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className = "" }: ProgressProps) {
  return (
    <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-blue-600 transition-all duration-700 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}