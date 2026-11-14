import { motion } from 'motion/react';
import { Search, BookOpen } from 'lucide-react';

interface EmptyStateProps {
  onSearchOpen: () => void;
}

export function EmptyState({ onSearchOpen }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 select-none overflow-y-auto py-8">
      <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-2xl bg-white dark:bg-[#151D1A] border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 shadow-lg max-w-md w-full">
        <div className="w-14 h-14 rounded-2xl bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 text-[#0D5C3A] dark:text-[#34D399] flex items-center justify-center shadow-xs mb-4">
          <BookOpen size={28} strokeWidth={1.75} />
        </div>

        <span className="mb-2 px-3 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 text-[#0D5C3A] dark:text-[#34D399] border border-[#0D5C3A]/20 dark:border-[#10B981]/30">
          Report Center
        </span>

        <h2 className="mb-1.5 text-center text-lg font-bold text-[#111827] dark:text-[#F3F7F5]">
          Report Cards Ready to Generate
        </h2>

        <p className="mb-6 text-center text-xs text-[#4B5563] dark:text-[#9CA3AF] max-w-sm">
          Select class, term, and exam phase from the control bar above to preview and batch print official report cards.
        </p>

        {onSearchOpen && (
          <motion.button
            onClick={onSearchOpen}
            className="flex items-center justify-center gap-2 h-9 px-5 rounded-full font-bold text-xs btn-jiddah-cta text-white shadow-xs cursor-pointer transition-transform"
            whileTap={{ scale: 0.97 }}
          >
            <Search size={14} />
            <span>Open Filters &amp; Roster</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
