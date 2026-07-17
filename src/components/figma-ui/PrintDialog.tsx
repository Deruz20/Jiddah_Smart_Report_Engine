import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Printer, FileText, Users, ListChecks, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: { id: string; student_name: string }[];
  onConfirmPrint: (mode: 'current' | 'all' | string[]) => void;
}

export function PrintDialog({ open, onOpenChange, reports, onConfirmPrint }: PrintDialogProps) {
  const [printMode, setPrintMode] = useState<'current' | 'all' | 'custom'>('current');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setPrintMode('current');
      setSelectedIds(new Set());
    }
  }, [open]);

  const handleSelectAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

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
                className="fixed left-[50%] top-[50%] z-[101] w-full max-w-md outline-none flex flex-col"
                style={{
                  background: 'white',
                  borderRadius: 16,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  transform: 'translate(-50%, -50%)',
                  maxHeight: '90vh'
                }}
                initial={{ opacity: 0, scale: 0.95, y: '-48%', x: '-50%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, y: '-48%', x: '-50%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              >
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                  <Dialog.Title style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Printer size={20} color="#047857" />
                    Print Configuration
                  </Dialog.Title>
                  <Dialog.Close style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                    <X size={20} />
                  </Dialog.Close>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', overflowY: 'auto' }}>
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
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: printMode === 'current' ? '#047857' : '#f1f5f9', color: printMode === 'current' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                        opacity: reports.length > 1 ? 1 : 0.5,
                        pointerEvents: reports.length > 1 ? 'auto' : 'none',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: printMode === 'all' ? '#047857' : '#f1f5f9', color: printMode === 'all' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Batch Print ({reports.length})</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Print all {reports.length} currently generated reports.</div>
                      </div>
                    </div>

                    {/* Option: Custom Selection */}
                    <div 
                      onClick={() => setPrintMode('custom')}
                      style={{
                        padding: 16, borderRadius: 12, border: `2px solid ${printMode === 'custom' ? '#047857' : '#e2e8f0'}`,
                        background: printMode === 'custom' ? '#f0fdf4' : 'white',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                        transition: 'all 0.2s',
                        opacity: reports.length > 1 ? 1 : 0.5,
                        pointerEvents: reports.length > 1 ? 'auto' : 'none',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: printMode === 'custom' ? '#047857' : '#f1f5f9', color: printMode === 'custom' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ListChecks size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Custom Selection</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Handpick specific students to print.</div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {printMode === 'custom' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden', marginTop: 12 }}
                      >
                        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Selected: {selectedIds.size} / {reports.length}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#047857', padding: '4px 8px', borderRadius: 6 }}
                              className="hover:bg-emerald-50 transition-colors"
                            >
                              {selectedIds.size === reports.length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          
                          <div className="max-h-60 overflow-y-auto" style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: 'white' }}>
                            {reports.map((report) => {
                              const isSelected = selectedIds.has(report.id);
                              return (
                                <div
                                  key={report.id}
                                  onClick={(e) => { e.stopPropagation(); toggleSelect(report.id); }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                                    borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                    background: isSelected ? '#f0fdf4' : 'transparent',
                                    transition: 'background 0.15s'
                                  }}
                                  className="hover:bg-slate-50 last:border-b-0"
                                >
                                  {isSelected ? <CheckSquare size={18} color="#047857" /> : <Square size={18} color="#cbd5e1" />}
                                  <span style={{ fontSize: 14, color: isSelected ? '#0f172a' : '#475569', fontWeight: isSelected ? 500 : 400 }}>
                                    {report.student_name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                  <Dialog.Close style={{ padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#475569', background: 'transparent', border: '1px solid #cbd5e1', cursor: 'pointer' }} className="hover:bg-slate-100 transition-colors">
                    Cancel
                  </Dialog.Close>
                  <button 
                    onClick={() => {
                      if (printMode === 'custom' && selectedIds.size === 0) return;
                      onConfirmPrint(printMode === 'custom' ? Array.from(selectedIds) : printMode);
                      onOpenChange(false);
                    }}
                    disabled={printMode === 'custom' && selectedIds.size === 0}
                    style={{ 
                      padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'white', 
                      background: (printMode === 'custom' && selectedIds.size === 0) ? '#94a3b8' : '#047857', 
                      border: 'none', cursor: (printMode === 'custom' && selectedIds.size === 0) ? 'not-allowed' : 'pointer', 
                      display: 'flex', alignItems: 'center', gap: 8, 
                      boxShadow: (printMode === 'custom' && selectedIds.size === 0) ? 'none' : '0 2px 4px rgba(4,120,87,0.2)' 
                    }}
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
