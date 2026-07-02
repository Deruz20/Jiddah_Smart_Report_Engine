import { AnimatePresence, motion } from "framer-motion";
import { useLocation, Outlet } from "react-router";

export function PageTransition() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.33, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}