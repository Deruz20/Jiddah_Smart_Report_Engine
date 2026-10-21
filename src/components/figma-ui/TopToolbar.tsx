import { motion, AnimatePresence } from 'motion/react';
import { Download, Printer, Share2, Search, X, LayoutGrid, List, PanelTop, Sliders } from 'lucide-react';
import Link from 'next/link';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

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
      <div className="flex items-center justify-between shrink-0 w-full bg-white border-b border-stone-200/90 px-3 sm:px-5 min-h-[52px] z-20 print:hidden">
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
                <span className="text-xs sm:text-sm font-bold text-stone-800 truncate tabular-nums">
                  {isGenerating ? 'Generating…' : `${reportCount} loaded`}
                </span>
              </motion.div>
            ) : (
              <div className="text-xs font-bold text-stone-700 truncate">
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
                    className="flex items-center justify-center rounded-xl min-w-[40px] min-h-[40px] bg-[#F8FAFC] border border-stone-200 text-stone-700 hover:bg-emerald-50 hover:text-[#059669] cursor-pointer"
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
                  className="print:hidden bg-white rounded-xl p-1 min-w-[200px] shadow-xl border border-stone-200 z-[300]"
                >
                  {downloadOptions.map((opt, i) => (
                    <DropdownMenu.Item
                      key={i}
                      onClick={opt.onClick}
                      className="flex items-center gap-3 px-3 min-h-[42px] text-xs font-semibold text-stone-800 cursor-pointer rounded-lg outline-none focus:bg-emerald-50 focus:text-[#059669] transition-colors"
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
                  className="print:hidden bg-white rounded-xl p-1 min-w-[200px] shadow-xl border border-stone-200 z-[300]"
                >
                  {printOptions.map((opt, i) => (
                    <DropdownMenu.Item
                      key={i}
                      onClick={opt.onClick}
                      className="flex items-center gap-3 px-3 min-h-[42px] text-xs font-semibold text-stone-800 cursor-pointer rounded-lg outline-none focus:bg-emerald-50 focus:text-[#059669] transition-colors"
                    >
                      {opt.icon}
                      {opt.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : onPrint || onBatchPrint ? (
            <div className="flex gap-1.5">
              {onPrint && (
                <IconBtn
                  icon={<Printer size={16} />}
                  tooltip="Print Current"
                  onClick={onPrint}
                  disabled={reportCount === 0 && !title}
                />
              )}
              {onBatchPrint && (
                <IconBtn
                  icon={
                    <div className="relative flex items-center justify-center">
                      <Printer size={16} />
                      <div
                        className="absolute -bottom-1 -right-1 bg-amber-600 rounded-full text-white"
                        style={{ fontSize: '9px', padding: '1px 3px', fontWeight: 'bold', lineHeight: 1 }}
                      >
                        All
                      </div>
                    </div>
                  }
                  tooltip="Batch Print All Classes"
                  onClick={onBatchPrint}
                  disabled={reportCount === 0 && !title}
                />
              )}
            </div>
          ) : null}

          {/* Report Studio */}
          {!title && (
            <div className="hidden sm:block flex-shrink-0">
              <Link
                href="/admin/reports/studio"
                className="flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl text-xs font-semibold bg-emerald-50 text-[#059669] border border-emerald-200 hover:bg-emerald-100 transition shadow-xs"
                title="Open Report Studio to position stamps/signatures and preview customizations"
              >
                <Sliders size={14} />
                <span>Report Studio</span>
              </Link>
            </div>
          )}

          {/* Share */}
          {onShare && (
            <div className="hidden md:block flex-shrink-0">
              <IconBtn
                icon={<Share2 size={16} />}
                tooltip="Share link"
                onClick={onShare}
                disabled={reportCount === 0 && !title}
              />
            </div>
          )}

          {/* Toggle App Header */}
          <div className="hidden lg:block flex-shrink-0">
            <IconBtn
              icon={<PanelTop size={16} />}
              tooltip="Toggle App Header"
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-topbar'))}
            />
          </div>

          <div className="w-px h-5 bg-stone-200 mx-0.5" />

          {/* Filter toggle */}
          <div className="flex-shrink-0">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <motion.button
                  onClick={onSearchToggle}
                  className={`flex items-center gap-1.5 rounded-xl font-semibold min-h-[40px] px-3 text-xs border cursor-pointer transition-colors ${
                    searchOpen
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-[#F8FAFC] border-stone-200 text-stone-800 hover:bg-emerald-50 hover:text-[#059669]'
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
          className="flex items-center justify-center rounded-xl flex-shrink-0 min-w-[40px] min-h-[40px] bg-[#F8FAFC] border border-stone-200 text-stone-700 hover:bg-emerald-50 hover:text-[#059669] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
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
