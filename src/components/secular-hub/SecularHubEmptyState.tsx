import { motion } from 'motion/react';
import { ScrollText, Search } from 'lucide-react';

export function SecularHubEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 select-none overflow-y-auto py-8 bg-slate-50 print:hidden">
      {/* Background glow */}
      <motion.div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(5,150,105,0.07) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Icon cluster */}
      <div className="relative mb-8">
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: 'rgba(5,150,105,0.1)', transform: 'scale(1.5)' }}
          animate={{ scale: [1.5, 1.65, 1.5], opacity: [0.6, 0.3, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative w-24 h-24 rounded-2xl flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #047857 0%, #064e3b 100%)' }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ScrollText size={40} color="white" strokeWidth={1.5} />
          <motion.div
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: '#f97316' }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <Search size={14} color="white" strokeWidth={2.5} />
          </motion.div>
        </motion.div>
      </div>

      {/* Arabic title */}
      <div
        className="mb-1 text-center"
        style={{
          fontFamily: "'Cairo', sans-serif",
          fontSize: "clamp(18px, 4vw, 22px)",
          fontWeight: 800,
          color: '#047857',
          letterSpacing: 1,
          direction: 'rtl',
        }}
      >
        مركز الدراسات الإسلامية
      </div>

      {/* Gold pill */}
      <div
        className="mb-5 px-3 md:px-4 py-1 rounded-full text-center max-w-full"
        style={{
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.4)',
          color: '#92730b',
          fontSize: "clamp(9px, 2.5vw, 12px)",
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}
      >
        JIDDAH ISLAMIC NURSERY &amp; PRIMARY SCHOOL
      </div>

      <h2
        className="mb-3 text-center px-2"
        style={{ fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 700, color: '#0f172a' }}
      >
        Secular Forms Ready to Generate
      </h2>

      <p
        className="mb-6 md:mb-8 text-center max-w-[280px] md:max-w-xs px-2"
        style={{ fontSize: "clamp(12px, 3vw, 14px)", color: '#64748b', lineHeight: 1.6 }}
      >
        Select your required parameters from the dropdowns above to instantly view and print theology forms.
      </p>

      {/* Step hints */}
      <div className="mt-4 flex flex-row flex-wrap justify-center gap-3 md:gap-6 w-full max-w-md">
        {[
          { step: '1', label: 'Choose Term & Year' },
          { step: '2', label: 'Select View Type' },
          { step: '3', label: 'Pick Class or Level' },
        ].map(({ step, label }) => (
          <div key={step} className="flex flex-col items-center gap-1 w-[85px] md:w-auto shrink-0">
            <div
              className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold shrink-0"
              style={{ background: 'rgba(5,150,105,0.12)', color: '#047857', fontSize: "clamp(11px, 3vw, 13px)" }}
            >
              {step}
            </div>
            <span style={{ fontSize: "clamp(9px, 2.5vw, 11px)", color: '#94a3b8', textAlign: 'center', maxWidth: 80, lineHeight: 1.3 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
