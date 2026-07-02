import { motion } from "framer-motion";
import { FolderOpen, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedButton } from "@/components/AnimatedButton";

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title = "Nothing here yet",
  message = "No records match your filters.",
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-3xl p-10 text-center"
      style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 18px 40px rgba(15, 23, 42, 0.04)" }}
    >
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl" style={{ background: "rgba(16,185,129,0.08)" }}>
        {icon ?? <FolderOpen className="w-8 h-8 text-[#10B981]" />}
      </div>
      <p className="text-lg font-semibold" style={{ color: "#374151" }}>
        {title}
      </p>
      <p className="mt-3 text-sm" style={{ color: "#9CA3AF" }}>
        {message}
      </p>
      {onAction && actionLabel ? (
        <AnimatedButton
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#065F46] px-5 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {actionLabel}
        </AnimatedButton>
      ) : null}
    </motion.div>
  );
}
