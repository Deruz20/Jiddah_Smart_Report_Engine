import { motion } from "motion/react";
import type { ReactNode } from "react";

export function AnimatedButton({ children, className = "", ...props }: { children: ReactNode; className?: string; [k: string]: any }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={`transition-all duration-150 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
