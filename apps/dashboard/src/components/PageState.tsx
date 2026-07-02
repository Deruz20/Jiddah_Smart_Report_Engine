import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import type { ReactNode } from "react";

interface PageStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  children: ReactNode;
}

export function PageState({
  loading,
  error,
  empty,
  emptyTitle = "Nothing here yet",
  emptyMessage = "No records match your filters.",
  onRetry,
  children,
}: PageStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-full max-w-3xl">
          <SkeletonLoader rows={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="rounded-3xl p-8 text-center"
          style={{ background: "white", border: "1px solid #FECACA", boxShadow: "0 12px 35px rgba(240, 36, 62, 0.08)" }}
        >
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <p className="mb-4 text-sm font-semibold" style={{ color: "#991B1B" }}>
            {error}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-5 py-2 rounded-xl text-white"
              style={{ background: "#065F46" }}
            >
              Try again
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  if (empty) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        actionLabel={onRetry ? "Refresh" : undefined}
        onAction={onRetry}
      />
    );
  }

  return <>{children}</>;
}
