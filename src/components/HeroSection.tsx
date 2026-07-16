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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8"
    >
      <div className="max-w-2xl">
        {label ? (
          <span
            className="inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ background: "rgba(16,185,129,0.09)", color: "#065F46" }}
          >
            {label}
          </span>
        ) : null}
        <h1
          className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight"
          style={{ color: "#065F46", fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-600" style={{ color: "#6B7280" }}>
          {subtitle}
        </p>
      </div>

      {actions ? (
        <div className="flex flex-wrap gap-3 items-center">{actions}</div>
      ) : null}
    </motion.section>
  );
}
