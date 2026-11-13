"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  label?: string;
}

export function HeroSection({ title, subtitle, actions, label }: HeroSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6 pb-4 border-b border-[var(--border)]"
    >
      <div className="max-w-3xl">
        {label ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 mb-1.5">
            {label}
          </span>
        ) : null}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          {subtitle}
        </p>
      </div>

      {actions ? (
        <div className="flex flex-wrap gap-2.5 items-center shrink-0">{actions}</div>
      ) : null}
    </motion.section>
  );
}
