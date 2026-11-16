import { ScrollText } from 'lucide-react';

export function TheologyHubEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 select-none overflow-y-auto py-8 bg-[#FDFBF7] dark:bg-[#0D1411] print:hidden">
      <div className="w-16 h-16 rounded-2xl bg-[#0F4D25] flex items-center justify-center shadow-md mb-5">
        <ScrollText size={30} color="white" strokeWidth={1.75} />
      </div>

      <span className="mb-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#EFE9DF] dark:bg-white/10 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-white/15">
        Theology Academic Hub
      </span>

      <h2 className="mb-1.5 text-center text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100">
        Theology Broadsheets &amp; Analytics
      </h2>

      <p className="text-center text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-md leading-relaxed">
        Select academic term and theology class from the toolbar above to view and print student assessment broadsheets.
      </p>
    </div>
  );
}
