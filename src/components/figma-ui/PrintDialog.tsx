import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Printer, FileText, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportCount: number;
  onConfirmPrint: (mode: 'current' | 'all') => void;
}

export function PrintDialog({ open, onOpenChange, reportCount, onConfirmPrint }: PrintDialogProps) {
  const [printMode, setPrintMode] = useState<'current' | 'all'>('current');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-[100]"
                style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            
            <Dialog.Content asChild>
              <motion.div
                className="fixed left-[50%] top-[50%] z-[101] w-full max-w-md outline-none"
                style={{
                  background: 'white',
                  borderRadius: 16,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0, scale: 0.95, y: '-48%', x: '-50%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, y: '-48%', x: '-50%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              >
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                  <Dialog.Title style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Printer size={20} color="#047857" />
                    Print Configuration
                  </Dialog.Title>
                  <Dialog.Close style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                    <X size={20} />
                  </Dialog.Close>
                </div>

                {/* Body */}
                <div style={{ padding: '24px' }}>
                  <div style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
                    Select which reports you would like to print. Your browser's native print dialog will open next to configure hardware settings.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Option: Current Report */}
                    <div 
                      onClick={() => setPrintMode('current')}
                      style={{
                        padding: 16, borderRadius: 12, border: `2px solid ${printMode === 'current' ? '#047857' : '#e2e8f0'}`,
                        background: printMode === 'current' ? '#f0fdf4' : 'white',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: printMode === 'current' ? '#047857' : '#f1f5f9', color: printMode === 'current' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Current Report</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Print only the report currently in view.</div>
                      </div>
                    </div>

                    {/* Option: Batch */}
                    <div 
                      onClick={() => setPrintMode('all')}
                      style={{
                        padding: 16, borderRadius: 12, border: `2px solid ${printMode === 'all' ? '#047857' : '#e2e8f0'}`,
                        background: printMode === 'all' ? '#f0fdf4' : 'white',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                        transition: 'all 0.2s',
                        opacity: reportCount > 1 ? 1 : 0.5,
                        pointerEvents: reportCount > 1 ? 'auto' : 'none',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: printMode === 'all' ? '#047857' : '#f1f5f9', color: printMode === 'all' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Batch Print ({reportCount})</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Print all {reportCount} currently generated reports.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc' }}>
                  <Dialog.Close style={{ padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#475569', background: 'transparent', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                    Cancel
                  </Dialog.Close>
                  <button 
                    onClick={() => {
                      onConfirmPrint(printMode);
                      onOpenChange(false);
                    }}
                    style={{ padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'white', background: '#047857', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 4px rgba(4,120,87,0.2)' }}
                  >
                    <Printer size={16} /> Continue to Print
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
