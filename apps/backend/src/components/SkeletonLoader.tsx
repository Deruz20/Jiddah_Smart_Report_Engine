import { motion } from "motion/react";

interface SkeletonLoaderProps {
  rows?: number;
}

export function SkeletonLoader({ rows = 4 }: SkeletonLoaderProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="h-12 rounded-2xl col-span-2 bg-slate-200 animate-pulse" />
          <div className="h-14 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="h-14 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="h-12 rounded-2xl col-span-2 bg-slate-200 animate-pulse" />
        </motion.div>
      ))}
    </div>
  );
}
