"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDestructiveDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDestructiveDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDestructiveDialogProps) {
  if (!open) return null;

  const confirmStyles =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-700 text-white"
      : "bg-[#0D5C3A] hover:bg-[#0A472D] text-white";

  const iconBgStyles =
    variant === "danger"
      ? "bg-rose-50 text-rose-600 border-rose-200"
      : variant === "warning"
      ? "bg-amber-50 text-amber-600 border-amber-200"
      : "bg-emerald-50 text-[#0D5C3A] border-emerald-200";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#E7E2D7] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBgStyles}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="confirm-dialog-title" className="text-base font-bold text-stone-900">
                {title}
              </h3>
              <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
            aria-label="Close confirmation dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-[40px] rounded-xl border border-[#E7E2D7] bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-[#FAF7F2] transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${confirmStyles}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
