"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/figma-ui/ui/dialog";

interface ConfirmDestructiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmPhrase?: string; // e.g. "ARCHIVE" or "DELETE"
  confirmButtonText?: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDestructiveDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmPhrase = "CONFIRM",
  confirmButtonText = "Proceed with Action",
  onConfirm,
}: ConfirmDestructiveDialogProps) {
  const [typedInput, setTypedInput] = useState("");
  const [loading, setLoading] = useState(false);

  const isMatched = typedInput.trim().toUpperCase() === confirmPhrase.toUpperCase();

  const handleAction = async () => {
    if (!isMatched || loading) return;
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setTypedInput("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          onOpenChange(v);
          if (!v) setTypedInput("");
        }
      }}
    >
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border border-rose-500/30 bg-[#090C0A] text-stone-100 shadow-2xl rounded-2xl">
        <div className="p-5 bg-gradient-to-b from-[#180D0E] to-[#090C0A] border-b border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400 mt-0.5">
                Destructive action safeguard
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-stone-300 leading-relaxed">{description}</p>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <p className="text-[11px] text-stone-400">
              To proceed, please type <strong className="text-rose-400 font-mono tracking-wider">{confirmPhrase}</strong> below:
            </p>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={`Type "${confirmPhrase}" to confirm`}
              className="w-full h-9 px-3 rounded-xl bg-black/40 border border-rose-500/40 text-rose-300 font-mono text-xs outline-none focus:ring-1 focus:ring-rose-500 uppercase"
            />
          </div>
        </div>

        <div className="p-4 bg-[#111714] border-t border-white/5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-8 px-3.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-stone-300 font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isMatched || loading}
            onClick={handleAction}
            className="h-8 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            <span>{loading ? "Processing..." : confirmButtonText}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
