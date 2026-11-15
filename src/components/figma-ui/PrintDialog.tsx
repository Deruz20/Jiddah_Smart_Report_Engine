import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Printer, FileText, Users, ListChecks, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: { id: string; student_name?: string; student?: { name?: string; arabic_name?: string } }[];
  activeReport?: { id: string; student_name?: string; student?: { name?: string; arabic_name?: string } } | null;
  preselectedIds?: string[];
  onEnterVisualSelect?: () => void;
  onConfirmPrint: (mode: 'current' | 'all' | string[]) => void;
}

export function PrintDialog({
  open,
  onOpenChange,
  reports,
  activeReport,
  preselectedIds = [],
  onEnterVisualSelect,
  onConfirmPrint,
}: PrintDialogProps) {
  const [printMode, setPrintMode] = useState<'current' | 'all' | 'custom'>('current');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setPrintMode('current');
      setSelectedIds(new Set(preselectedIds));
    }
  }, [open, preselectedIds]);

  const activeStudentName =
    activeReport?.student?.name ||
    activeReport?.student?.arabic_name ||
    activeReport?.student_name ||
    reports[0]?.student?.name ||
    'Active Student';

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === reports.length
      ? new Set()
      : new Set(reports.map(report => report.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                data-slot="dialog-overlay"
                className="fixed inset-0 z-[100]"
                style={{ background: 'rgba(15, 23, 42, 0.25)', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed left-[50%] top-[50%] z-[101] w-[92vw] max-w-[440px] outline-none flex flex-col"
                style={{
                  background: 'white',
                  borderRadius: 16,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  transform: 'translate(-50%, -50%)',
                  maxHeight: '74dvh'
                }}
                initial={{ opacity: 0, scale: 0.95, y: '-48%', x: '-50%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, y: '-48%', x: '-50%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              >
                {/* Header */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                  <Dialog.Title style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Printer size={18} color="#047857" />
                    Print Configuration
                  </Dialog.Title>
                  <Dialog.Close style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                    <X size={18} />
                  </Dialog.Close>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 18px', overflowY: 'auto' }}>
                  <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 12 }}>
                    Select which reports you would like to print. Your browser's native print dialog will open next to configure hardware settings.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Option: Current Report */}
                    <div
                      onClick={() => setPrintMode('current')}
                      style={{
                        padding: '10px 14px', borderRadius: 10, border: `2px solid ${printMode === 'current' ? '#047857' : '#e2e8f0'}`,
                        background: printMode === 'current' ? '#f0fdf4' : 'white',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: printMode === 'current' ? '#047857' : '#f1f5f9', color: printMode === 'current' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Current Report</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Print only the report currently in view ({activeStudentName}).
                        </div>
                      </div>
                    </div>

                    {/* Option: Batch */}
                    <div
                      onClick={() => setPrintMode('all')}
                      style={{
                        padding: '10px 14px', borderRadius: 10, border: `2px solid ${printMode === 'all' ? '#047857' : '#e2e8f0'}`,
                        background: printMode === 'all' ? '#f0fdf4' : 'white',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                        transition: 'all 0.15s ease',
                        opacity: reports.length > 1 ? 1 : 0.5,
                        pointerEvents: reports.length > 1 ? 'auto' : 'none',
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: printMode === 'all' ? '#047857' : '#f1f5f9', color: printMode === 'all' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Batch Print ({reports.length})</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Print all {reports.length} reports in the current class/filter.</div>
                      </div>
                    </div>

                    {/* Option: Custom Visual Selection */}
                    <div
                      onClick={() => setPrintMode('custom')}
                      style={{
                        padding: '10px 14px', borderRadius: 10, border: `2px solid ${printMode === 'custom' ? '#047857' : '#e2e8f0'}`,
                        background: printMode === 'custom' ? '#f0fdf4' : 'white',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        transition: 'all 0.15s ease',
                        opacity: reports.length > 1 ? 1 : 0.5,
                        pointerEvents: reports.length > 1 ? 'auto' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: printMode === 'custom' ? '#047857' : '#f1f5f9', color: printMode === 'custom' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ListChecks size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                            Custom Visual Selection ({selectedIds.size} selected)
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            Select specific report cards visually on the canvas to print.
                          </div>
                        </div>
                      </div>
                      {onEnterVisualSelect && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChange(false);
                            onEnterVisualSelect();
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#047857',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Select on Canvas
                        </button>
                      )}
                    </div>

                    {printMode === 'custom' && (
                      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Selected: {selectedIds.size} / {reports.length}</span>
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#047857', padding: '4px 8px', borderRadius: 6 }}
                          >
                            {selectedIds.size === reports.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white' }}>
                          {reports.map((report) => {
                            const isSelected = selectedIds.has(report.id);
                            const name = report.student?.arabic_name || report.student?.name || report.student_name || 'Student';
                            return (
                              <button
                                key={report.id}
                                type="button"
                                onClick={() => toggleSelect(report.id)}
                                aria-pressed={isSelected}
                                style={{
                                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                                  border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', textAlign: 'left',
                                  background: isSelected ? '#f0fdf4' : 'white',
                                }}
                              >
                                {isSelected ? <CheckSquare size={18} color="#047857" /> : <Square size={18} color="#cbd5e1" />}
                                <span style={{ fontSize: 14, color: '#0f172a', fontWeight: isSelected ? 500 : 400 }}>
                                  {name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                  <Dialog.Close style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', background: 'transparent', border: '1px solid #cbd5e1', cursor: 'pointer' }} className="hover:bg-slate-100 transition-colors">
                    Cancel
                  </Dialog.Close>
                  <button
                    onClick={() => {
                      onConfirmPrint(printMode === 'custom' ? Array.from(selectedIds) : printMode);
                      onOpenChange(false);
                    }}
                    disabled={printMode === 'custom' && selectedIds.size === 0}
                    style={{
                      padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'white',
                      background: printMode === 'custom' && selectedIds.size === 0 ? '#94a3b8' : '#047857',
                      border: 'none', cursor: printMode === 'custom' && selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      boxShadow: printMode === 'custom' && selectedIds.size === 0 ? 'none' : '0 2px 4px rgba(4,120,87,0.2)'
                    }}
                  >
                    <Printer size={15} /> Continue to Print
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
