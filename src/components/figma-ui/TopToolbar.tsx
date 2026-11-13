import { motion, AnimatePresence } from 'motion/react';
import { Download, Printer, Share2, Search, X, LayoutGrid, List, PanelTop, Sliders, FileSpreadsheet, Settings, History } from 'lucide-react';
import Link from 'next/link';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreActionsMenu } from '@/components/ui/more-actions-menu';

interface TopToolbarProps {
  searchOpen?: boolean;
  onSearchToggle?: () => void;
  onDownload?: () => void;
  downloadOptions?: { label: string; onClick: () => void; icon?: React.ReactNode }[];
  onPrint?: () => void;
  printOptions?: { label: string; onClick: () => void; icon?: React.ReactNode }[];
  onBatchPrint?: () => void;
  onShare?: () => void;
  reportCount?: number;
  layout?: 'single' | 'grid';
  onLayoutToggle?: () => void;
  isGenerating?: boolean;
  title?: React.ReactNode;
}

export function TopToolbar({
  searchOpen = false,
  onSearchToggle,
  onDownload,
  downloadOptions,
  onPrint,
  printOptions,
  onBatchPrint,
  onShare,
  reportCount = 0,
  layout = 'single',
  onLayoutToggle,
  isGenerating,
  title,
}: TopToolbarProps) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="flex items-center justify-between shrink-0 w-full bg-white dark:bg-[#111916] border-b border-stone-200/90 dark:border-[#1C2622] px-3 sm:px-5 min-h-[52px] z-20 print:hidden">
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          {/* Contextual Title or Loaded Reports Badge (No duplicate hamburger icon!) */}
          <AnimatePresence>
            {title ? (
              <div className="flex items-center gap-2 font-semibold truncate min-w-0">
                {title}
              </div>
            ) : reportCount > 0 ? (
              <motion.div
                className="flex items-center gap-2 rounded-xl truncate min-h-[36px] px-3 py-1"
                style={{
                  background: isGenerating ? '#fff7ed' : '#ecfdf5',
                  border: `1px solid ${isGenerating ? '#fed7aa' : '#a7f3d0'}`,
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: isGenerating ? '#f97316' : '#059669',
                    boxShadow: `0 0 0 3px ${isGenerating ? 'rgba(249,115,22,0.2)' : 'rgba(5,150,105,0.2)'}`,
                  }}
                  className={isGenerating ? 'animate-pulse' : ''}
                />
                <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-100 truncate tabular-nums">
                  {isGenerating ? 'Generating…' : `${reportCount} loaded`}
                </span>
              </motion.div>
            ) : (
              <div className="text-xs font-bold text-stone-700 dark:text-stone-200 truncate">
                Report Center
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {reportCount > 1 && onLayoutToggle && (
            <div className="hidden md:block flex-shrink-0">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <motion.button
                    onClick={onLayoutToggle}
                    aria-label={layout === 'grid' ? 'Single scroll view' : 'Grid view'}
                    className="flex items-center justify-center rounded-xl min-w-[36px] min-h-[36px] bg-[#F8FAFC] dark:bg-[#141F1C] border border-stone-200 dark:border-[#24332E] text-stone-700 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-[#059669] dark:hover:text-emerald-300 cursor-pointer"
                    whileTap={{ scale: 0.92 }}
                  >
                    {layout === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
                  </motion.button>
                </Tooltip.Trigger>
                <TooltipContent>{layout === 'grid' ? 'Single scroll view' : 'Grid view'}</TooltipContent>
              </Tooltip.Root>
            </div>
          )}

          {/* Download / Export */}
          {downloadOptions && downloadOptions.length > 0 ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <div className="flex-shrink-0">
                  <IconBtn
                    icon={<Download size={16} />}
                    tooltip="Export / Download"
                    disabled={reportCount === 0 && !title}
                  />
                </div>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="print:hidden bg-white dark:bg-[#111916] rounded-xl p-1 min-w-[200px] shadow-xl border border-stone-200 dark:border-[#24332E] z-[300]"
                >
                  {downloadOptions.map((opt, i) => (
                    <DropdownMenu.Item
                      key={i}
                      onClick={opt.onClick}
                      className="flex items-center gap-3 px-3 min-h-[40px] text-xs font-semibold text-stone-800 dark:text-stone-100 cursor-pointer rounded-lg outline-none focus:bg-emerald-50 dark:focus:bg-emerald-950/40 focus:text-[#059669] dark:focus:text-emerald-300 transition-colors"
                    >
                      {opt.icon}
                      {opt.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : onDownload ? (
            <IconBtn
              icon={<Download size={16} />}
              tooltip="Download reports"
              onClick={onDownload}
              disabled={reportCount === 0 && !title}
            />
          ) : null}

          {/* Print */}
          {printOptions && printOptions.length > 0 ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <div className="flex-shrink-0">
                  <IconBtn
                    icon={<Printer size={16} />}
                    tooltip="Print Options"
                    disabled={reportCount === 0 && !title}
                  />
                </div>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="print:hidden bg-white dark:bg-[#111916] rounded-xl p-1 min-w-[200px] shadow-xl border border-stone-200 dark:border-[#24332E] z-[300]"
                >
                  {printOptions.map((opt, i) => (
                    <DropdownMenu.Item
                      key={i}
                      onClick={opt.onClick}
                      className="flex items-center gap-3 px-3 min-h-[40px] text-xs font-semibold text-stone-800 dark:text-stone-100 cursor-pointer rounded-lg outline-none focus:bg-emerald-50 dark:focus:bg-emerald-950/40 focus:text-[#059669] dark:focus:text-emerald-300 transition-colors"
                    >
                      {opt.icon}
                      {opt.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}

          {/* 1-Click Print Pill */}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              disabled={reportCount === 0 && !title}
              className="h-9 px-4 rounded-full bg-[#0D5C3A] hover:bg-[#0A4A2F] dark:bg-[#34D399] dark:hover:bg-[#10B981] text-white dark:text-[#131314] text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Printer className="size-4" />
              <span>Print</span>
            </button>
          )}

          {/* Secondary Tools in More Actions Menu */}
          <MoreActionsMenu
            items={[
              {
                label: 'Report Studio 2.0',
                icon: Sliders,
                onClick: () => {
                  window.location.href = '/admin/reports/studio';
                },
              },
              {
                label: 'Export Broadsheet',
                icon: FileSpreadsheet,
                onClick: () => {
                  window.location.href = '/admin/secular-hub';
                },
              },
              {
                label: 'Batch Settings',
                icon: Settings,
                onClick: () => {
                  window.location.href = '/admin/settings';
                },
              },
              {
                label: 'Audit & Activity',
                icon: History,
                onClick: () => {
                  window.location.href = '/admin/activity';
                },
              },
              ...(onBatchPrint
                ? [
                    {
                      label: 'Batch Print All Classes',
                      icon: Printer,
                      onClick: onBatchPrint,
                    },
                  ]
                : []),
              ...(onShare
                ? [
                    {
                      label: 'Share Link',
                      icon: Share2,
                      onClick: onShare,
                    },
                  ]
                : []),
            ]}
            align="end"
          />

          {/* Filter toggle */}
          <div className="flex-shrink-0">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <motion.button
                  onClick={onSearchToggle}
                  className={`flex items-center gap-1.5 rounded-xl font-semibold h-9 px-3 text-xs border cursor-pointer transition-colors ${
                    searchOpen
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                      : 'bg-[#F8FAFC] dark:bg-[#141F1C] border-stone-200 dark:border-[#24332E] text-stone-800 dark:text-stone-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-[#059669] dark:hover:text-emerald-300'
                  }`}
                  whileTap={{ scale: 0.96 }}
                >
                  <motion.span
                    animate={{ rotate: searchOpen ? 90 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {searchOpen ? <X size={14} /> : <Search size={14} />}
                  </motion.span>
                  <span>{searchOpen ? 'Hide Filters' : 'Filters'}</span>
                </motion.button>
              </Tooltip.Trigger>
              <TooltipContent>{searchOpen ? 'Hide filter panel' : 'Show filter panel'}</TooltipContent>
            </Tooltip.Root>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

function IconBtn({
  icon,
  tooltip,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <motion.button
          onClick={onClick}
          disabled={disabled}
          title={tooltip}
          aria-label={tooltip}
          className="flex items-center justify-center rounded-xl flex-shrink-0 min-w-[36px] min-h-[36px] bg-[#F8FAFC] dark:bg-[#141F1C] border border-stone-200 dark:border-[#24332E] text-stone-700 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-[#059669] dark:hover:text-emerald-300 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          whileTap={disabled ? {} : { scale: 0.92 }}
        >
          {icon}
        </motion.button>
      </Tooltip.Trigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip.Root>
  );
}

function TooltipContent({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Portal>
      <Tooltip.Content
        sideOffset={6}
        className="bg-stone-900 text-white rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-lg z-[300]"
      >
        {children}
        <Tooltip.Arrow style={{ fill: '#1c1917' }} />
      </Tooltip.Content>
    </Tooltip.Portal>
  );
}
