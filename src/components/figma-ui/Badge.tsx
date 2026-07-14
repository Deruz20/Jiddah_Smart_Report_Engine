import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'orange' | 'slate' | 'blue' | 'violet' | 'rose';
  dot?: boolean;
}

const dotColors: Record<string, string> = {
  emerald: 'bg-emerald-500',
  orange: 'bg-orange-500',
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  rose: 'bg-rose-500',
};

export function Badge({ children, variant = 'slate', dot = false, className, ...props }: BadgeProps) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors";

  const variants: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    orange: "bg-orange-50 text-orange-800 border-orange-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    violet: "bg-violet-50 text-violet-800 border-violet-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
  };

  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
}
