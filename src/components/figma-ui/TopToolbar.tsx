import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Printer, Share2, MessageSquare, Search, X, LayoutGrid, List, PanelTop, Menu } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Popover from '@radix-ui/react-popover';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useSidebar } from './ui/sidebar';

interface TopToolbarProps {
  searchOpen?: boolean;
  onSearchToggle?: () => void;
  onDownload?: () => void;
  downloadOptions?: { label: string, onClick: () => void, icon?: React.ReactNode }[];
  onPrint?: () => void;
  printOptions?: { label: string, onClick: () => void, icon?: React.ReactNode }[];
  onBatchPrint?: () => void;
  onShare?: () => void;
  reportCount?: number;
  layout?: 'single' | 'grid';
  onLayoutToggle?: () => void;
  isGenerating?: boolean;
  title?: React.ReactNode;
}

const EMOJIS = ['👍', '❤️', '⭐', '🎉', '✅', '🔖'];

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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [chosenEmoji, setChosenEmoji] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const { toggleSidebar } = useSidebar();

  return (
    <Tooltip.Provider delayDuration={300}>
      <div
        className="flex items-center justify-between shrink-0 w-full bg-white/80 backdrop-blur-md z-30 transition-all duration-300"
        style={{
          height: 60,
          padding: '0 12px',
          borderBottom: `1px solid ${reportCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.05)'}`,
          boxShadow: '0 1px 12px rgba(0,0,0,0.03)',
        }}
      >
        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
          {/* ── Hamburger (Mobile) ────────── */}
          <button
            onClick={toggleSidebar}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Menu size={22} />
          </button>

          {/* ── Reports loaded badge ───────── */}
          <AnimatePresence>
            {title ? (
              <div className="flex items-center gap-2 font-medium truncate">
                {title}
              </div>
            ) : reportCount > 0 ? (
              <motion.div
                className="flex items-center gap-2 rounded-xl truncate"
                style={{
                  background: isGenerating ? '#fff7ed' : '#ecfdf5',
                  border: `1px solid ${isGenerating ? '#fed7aa' : '#a7f3d0'}`,
                  padding: '6px 12px',
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <span
                  style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: isGenerating ? '#f97316' : '#10b981',
                    boxShadow: `0 0 0 3px ${isGenerating ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  }}
                  className={isGenerating ? 'animate-pulse' : ''}
                />
                <span className="text-xs md:text-sm font-bold text-slate-700 truncate">
                  {isGenerating ? 'Generating…' : `${reportCount} loaded`}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
        {reportCount > 1 && onLayoutToggle && (
          <div className="hidden md:block flex-shrink-0">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <motion.button
                onClick={onLayoutToggle}
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 34, height: 34,
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.07)',
                  cursor: 'pointer',
                  color: '#475569',
                }}
                whileHover={{ background: 'rgba(5,150,105,0.08)', color: '#047857' }}
                whileTap={{ scale: 0.92 }}
              >
                {layout === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
              </motion.button>
            </Tooltip.Trigger>
            <TooltipContent>{layout === 'grid' ? 'Single scroll view' : 'Grid view'}</TooltipContent>
          </Tooltip.Root>
          </div>
        )}

        {/* ── Download / Export ─────────── */}
        {downloadOptions && downloadOptions.length > 0 ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <div className="flex-shrink-0">
                <IconBtn
                  icon={<Download size={16} />}
                  tooltip="Export / Download"
                  onClick={() => {}}
                  disabled={reportCount === 0 && !title}
                />
              </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 4,
                  minWidth: 200,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  zIndex: 300,
                }}
              >
                {downloadOptions.map((opt, i) => (
                  <DropdownMenu.Item
                    key={i}
                    onClick={opt.onClick}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 font-medium cursor-pointer rounded-md outline-none focus:bg-emerald-50 focus:text-emerald-700 transition-colors"
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

        {/* ── Print ─────────────────────── */}
        {printOptions && printOptions.length > 0 ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <div className="flex-shrink-0">
                <IconBtn
                  icon={<Printer size={16} />}
                  tooltip="Print Options"
                  onClick={() => {}}
                  disabled={reportCount === 0 && !title}
                />
              </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 4,
                  minWidth: 200,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  zIndex: 300,
                }}
              >
                {printOptions.map((opt, i) => (
                  <DropdownMenu.Item
                    key={i}
                    onClick={opt.onClick}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 font-medium cursor-pointer rounded-md outline-none focus:bg-emerald-50 focus:text-emerald-700 transition-colors"
                  >
                    {opt.icon}
                    {opt.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : onPrint || onBatchPrint ? (
          <div className="flex gap-1.5 md:gap-2">
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
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full text-white" style={{ fontSize: '9px', padding: '1px 3px', fontWeight: 'bold', lineHeight: 1 }}>All</div>
                  </div>
                }
                tooltip="Batch Print All Classes"
                onClick={onBatchPrint}
                disabled={reportCount === 0 && !title}
              />
            )}
          </div>
        ) : null}

        {/* ── Share ─────────────────────── */}
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

        {/* ── Toggle App Header ─────────── */}
        <div className="hidden md:block flex-shrink-0">
          <IconBtn
            icon={<PanelTop size={16} />}
            tooltip="Toggle App Header"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-topbar'))}
          />
        </div>

        {/* ── Emoji reaction ────────────── */}
        <div className="hidden md:block flex-shrink-0">
        <Popover.Root open={emojiOpen} onOpenChange={setEmojiOpen}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Popover.Trigger asChild>
                <motion.button
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 34, height: 34,
                    background: chosenEmoji ? 'rgba(249,115,22,0.1)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${chosenEmoji ? 'rgba(249,115,22,0.3)' : 'rgba(0,0,0,0.07)'}`,
                    cursor: 'pointer', fontSize: 16,
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                >
                  {chosenEmoji ?? '😊'}
                </motion.button>
              </Popover.Trigger>
            </Tooltip.Trigger>
            <TooltipContent>React to this report</TooltipContent>
          </Tooltip.Root>

          <Popover.Content
            side="bottom"
            sideOffset={6}
            style={{
              background: 'white',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.1)',
              padding: 10,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              display: 'flex', gap: 6,
              zIndex: 100,
            }}
          >
            {EMOJIS.map((e) => (
              <motion.button
                key={e}
                onClick={() => { setChosenEmoji(e); setEmojiOpen(false); }}
                style={{
                  width: 32, height: 32, fontSize: 18, cursor: 'pointer',
                  background: 'none', border: 'none', borderRadius: 8,
                }}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
              >
                {e}
              </motion.button>
            ))}
          </Popover.Content>
        </Popover.Root>
        </div>

        {/* ── Feedback ──────────────────── */}
        <div className="hidden md:block flex-shrink-0">
        <Dialog.Root open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Dialog.Trigger asChild>
                <motion.button
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 34, height: 34,
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.07)',
                    cursor: 'pointer', color: '#475569',
                  }}
                  whileHover={{ background: 'rgba(5,150,105,0.08)', color: '#047857' }}
                  whileTap={{ scale: 0.92 }}
                >
                  <MessageSquare size={16} />
                </motion.button>
              </Dialog.Trigger>
            </Tooltip.Trigger>
            <TooltipContent>Send feedback</TooltipContent>
          </Tooltip.Root>

          <Dialog.Portal>
            <Dialog.Overlay style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 200,
            }} />
            <Dialog.Content style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              background: 'white', borderRadius: 16, padding: 28,
              width: 380, boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              zIndex: 201,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Dialog.Title style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Send Feedback
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={18} />
                  </button>
                </Dialog.Close>
              </div>
              <textarea
                placeholder="Describe your experience or report an issue…"
                style={{
                  width: '100%', minHeight: 100, borderRadius: 10,
                  border: '1.5px solid #e2e8f0', padding: '10px 12px',
                  fontSize: 13, resize: 'none', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#059669'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                <Dialog.Close asChild>
                  <button style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b',
                  }}>
                    Cancel
                  </button>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <button style={{
                    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    border: 'none', background: '#059669', color: 'white', cursor: 'pointer',
                  }}>
                    Send
                  </button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        </div>

        {/* ── Divider ───────────────────── */}
        <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.08)', margin: '0 4px' }} />

        {/* ── Search toggle ─────────────── */}
        <div className="flex-shrink-0">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <motion.button
              onClick={onSearchToggle}
              className="flex items-center gap-1.5 rounded-lg font-semibold"
              style={{
                padding: '0 14px',
                height: 34,
                background: searchOpen ? '#fff7ed' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${searchOpen ? '#fed7aa' : 'rgba(0,0,0,0.07)'}`,
                cursor: 'pointer',
                color: searchOpen ? '#ea580c' : '#475569',
                fontSize: 13,
              }}
              whileHover={searchOpen ? {} : { background: 'rgba(5,150,105,0.08)', color: '#047857', borderColor: 'rgba(5,150,105,0.2)' }}
              whileTap={{ scale: 0.96 }}
            >
              <motion.span
                animate={{ rotate: searchOpen ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {searchOpen ? <X size={15} /> : <Search size={15} />}
              </motion.span>
              {searchOpen ? 'Close' : 'Filter'}
            </motion.button>
          </Tooltip.Trigger>
            <TooltipContent>{searchOpen ? 'Close filter panel' : 'Open search & filter'}</TooltipContent>
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
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <motion.button
          onClick={onClick}
          disabled={disabled}
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 34, height: 34,
            background: 'rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.07)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: disabled ? '#cbd5e1' : '#475569',
            opacity: disabled ? 0.5 : 1,
          }}
          whileHover={disabled ? {} : { background: 'rgba(5,150,105,0.08)', color: '#047857', borderColor: 'rgba(5,150,105,0.2)' }}
          whileTap={disabled ? {} : { scale: 0.9 }}
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
        style={{
          background: '#0f172a',
          color: 'white',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: 11,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 300,
        }}
      >
        {children}
        <Tooltip.Arrow style={{ fill: '#0f172a' }} />
      </Tooltip.Content>
    </Tooltip.Portal>
  );
}
