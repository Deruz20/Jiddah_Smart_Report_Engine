import { ScrollText } from 'lucide-react';

export function TheologyHubEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 select-none overflow-y-auto py-8 bg-[#FDFBF7] print:hidden">
      <div className="w-16 h-16 rounded-2xl bg-[#0F4D25] flex items-center justify-center shadow-md mb-5">
        <ScrollText size={30} color="white" strokeWidth={1.75} />
      </div>

      <span className="mb-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#EFE9DF] text-stone-700 border border-stone-300">
        Theology Hub
      </span>

      <h2 className="mb-1.5 text-center text-lg sm:text-xl font-bold text-stone-900">
        Theology Broadsheets &amp; Analytics
      </h2>

      <p className="text-center text-xs sm:text-sm text-stone-600 max-w-md">
        Select term, view type, and theology class above to view and print broadsheets.
      </p>
    </div>
  );
}
