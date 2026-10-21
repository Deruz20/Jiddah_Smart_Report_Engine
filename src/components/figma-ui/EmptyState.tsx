import { motion } from 'motion/react';
import { Search, BookOpen } from 'lucide-react';

interface EmptyStateProps {
  onSearchOpen: () => void;
}

export function EmptyState({ onSearchOpen }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 select-none overflow-y-auto py-8 bg-[#FDFBF7]">
      <div className="w-16 h-16 rounded-2xl bg-[#0F4D25] flex items-center justify-center shadow-md mb-5">
        <BookOpen size={30} color="white" strokeWidth={1.75} />
      </div>

      <span className="mb-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#EFE9DF] text-stone-700 border border-stone-300">
        Report Center
      </span>

      <h2 className="mb-1.5 text-center text-lg sm:text-xl font-bold text-stone-900">
        Report Cards Ready to Generate
      </h2>

      <p className="mb-6 text-center text-xs sm:text-sm text-stone-600 max-w-md">
        Select class or student, term, and exam phase to generate and print official report cards.
      </p>

      <motion.button
        onClick={onSearchOpen}
        className="flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-xl font-bold text-sm bg-[#0F4D25] text-white shadow-sm hover:bg-emerald-900 cursor-pointer transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        <Search size={16} />
        <span>Open Search &amp; Filter</span>
      </motion.button>
    </div>
  );
}
