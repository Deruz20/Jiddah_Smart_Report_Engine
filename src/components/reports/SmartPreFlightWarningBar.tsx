"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Wand2, ShieldAlert } from "lucide-react";
import { TemplateOverlays } from "@/lib/report-overlays";

export interface PreFlightIssue {
  id: string;
  type: "warning" | "error" | "info";
  message: string;
  autoFix?: () => void;
}

export function SmartPreFlightWarningBar({
  overlays,
  signatures,
  templateId,
  onAutoFix,
}: {
  overlays: TemplateOverlays;
  signatures?: Record<string, string | null>;
  templateId: string;
  onAutoFix?: () => void;
}) {
  const issues: PreFlightIssue[] = [];

  // 1. Check Stamp Coordinates (detect overlap with table)
  // Usually marks table sits between y: 25% and 65%
  const stamp = overlays.stamp;
  if (stamp.visible && stamp.yPercent > 25 && stamp.yPercent < 68 && stamp.xPercent < 65) {
    issues.push({
      id: "stamp-table-overlap",
      type: "warning",
      message: "Stamp placed inside marks table area. Recommended location: bottom right.",
    });
  }

  // 2. Check Signatures
  const hasHeadSig = Boolean(signatures?.["head-teacher"]);
  if (!hasHeadSig && overlays.headTeacher.visible) {
    issues.push({
      id: "missing-head-sig",
      type: "warning",
      message: "Head Teacher signature not uploaded yet.",
    });
  }

  // 3. A4 Margin Overflow
  if (stamp.visible && (stamp.xPercent > 90 || stamp.yPercent > 92)) {
    issues.push({
      id: "stamp-overflow",
      type: "error",
      message: "Stamp exceeds printable A4 paper margins (may be clipped during printing).",
    });
  }

  if (issues.length === 0) {
    return (
      <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 font-medium">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-400" strokeWidth={2} />
          <span>Pre-Flight Passed: Document layout, signatures, and margins ready for print.</span>
        </div>
        <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider">A4 Verified</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 font-medium">
      <div className="flex items-center gap-2 flex-wrap">
        <AlertTriangle className="size-4 text-amber-400 shrink-0" strokeWidth={2} />
        <span className="font-bold text-amber-300">Pre-Flight Warnings:</span>
        {issues.map((issue) => (
          <span
            key={issue.id}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
              issue.type === "error"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}
          >
            {issue.message}
          </span>
        ))}
      </div>

      {onAutoFix && (
        <button
          type="button"
          onClick={onAutoFix}
          className="h-7 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-black font-extrabold text-[11px] flex items-center gap-1.5 shrink-0 transition cursor-pointer"
        >
          <Wand2 className="size-3" strokeWidth={2.5} />
          <span>Auto-Fix Positions</span>
        </button>
      )}
    </div>
  );
}
