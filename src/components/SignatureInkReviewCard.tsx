'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Check, Upload, X, RefreshCw } from 'lucide-react';
import {
  processSignatureFileToPng,
  type SignatureInkMode,
} from '@/lib/signature-ink-processor';

interface SignatureInkReviewCardProps {
  file: File;
  targetLabel?: string;
  onCancel: () => void;
  onConfirmUpload: (fileToUpload: File) => Promise<void> | void;
}

const INK_MODE_OPTIONS: { value: SignatureInkMode; label: string; swatch: string }[] = [
  { value: 'blue', label: 'Pen Blue', swatch: '#14387F' },
  { value: 'black', label: 'Jet Black', swatch: '#0F172A' },
  { value: 'original', label: 'Original', swatch: '#475569' },
];

export function SignatureInkReviewCard({
  file,
  targetLabel,
  onCancel,
  onConfirmUpload,
}: SignatureInkReviewCardProps) {
  const [inkMode, setInkMode] = useState<SignatureInkMode>('blue');
  const [boldness, setBoldness] = useState<number>(1.25);
  const [processing, setProcessing] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [cleanedUrl, setCleanedUrl] = useState<string>('');
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setProcessing(true);
    setErrorMsg(null);

    processSignatureFileToPng(file, { inkMode, boldness })
      .then((res) => {
        if (!active) return;
        setOriginalUrl(res.originalDataUrl);
        setCleanedUrl(res.cleanedDataUrl);
        setProcessedFile(res.file);
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(err?.message || 'Unable to process signature ink.');
      })
      .finally(() => {
        if (active) setProcessing(false);
      });

    return () => {
      active = false;
    };
  }, [file, inkMode, boldness]);

  const handleConfirm = async (useProcessed: boolean) => {
    setUploading(true);
    try {
      await onConfirmUpload(useProcessed && processedFile ? processedFile : file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      data-testid="signature-ink-review-card"
      className="rounded-2xl border border-[#D5DDD8] dark:border-[#24332E] bg-white dark:bg-[#111916] p-4 sm:p-5 shadow-md space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D5C3A] dark:text-[#10B981]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automatic Signature Ink Extractor</span>
          </div>
          <h3 className="text-sm font-bold text-[#111827] dark:text-[#F3F7F5] mt-0.5">
            {targetLabel ? `Review Signature: ${targetLabel}` : file.name}
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Shadows, uneven phone lighting, and paper grain are removed automatically into a crisp transparent PNG.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F7F5] dark:hover:bg-[#1C2622] cursor-pointer"
          aria-label="Close signature preview"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Before / After Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#E6ECE8] dark:border-[#1C2622] bg-[#F8FAF9] dark:bg-[#0D1412] p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-2">
            Before (Original Photo)
          </div>
          <div className="h-28 rounded-lg bg-white dark:bg-[#0B100E] border border-[#E6ECE8] dark:border-[#1C2622] flex items-center justify-center overflow-hidden p-2">
            {originalUrl ? (
              <img src={originalUrl} alt="Original signature" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-[#6B7280]">Loading...</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#0D5C3A]/30 dark:border-[#10B981]/30 bg-[#F8FAF9] dark:bg-[#0D1412] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D5C3A] dark:text-[#10B981]">
              After (Transparent PNG)
            </span>
            {processing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0D5C3A]" />}
          </div>
          <div className="h-28 rounded-lg border border-[#D5DDD8] dark:border-[#24332E] bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:10px_10px] bg-white flex items-center justify-center overflow-hidden p-2">
            {cleanedUrl ? (
              <img src={cleanedUrl} alt="Extracted transparent ink" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-[#6B7280]">Extracting ink...</span>
            )}
          </div>
        </div>
      </div>

      {/* Extraction Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
            Ink Color Normalization
          </span>
          <div className="flex items-center gap-1.5">
            {INK_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setInkMode(opt.value)}
                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition ${
                  inkMode === opt.value
                    ? 'bg-[#0D5C3A]/10 border-[#0D5C3A] text-[#0D5C3A] dark:bg-emerald-500/15 dark:border-emerald-400 dark:text-emerald-300'
                    : 'bg-white dark:bg-[#0D1412] border-[#D5DDD8] dark:border-[#24332E] text-[#374151] dark:text-[#CBD5E1]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.swatch }} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
            <span>Stroke Boldness</span>
            <span className="font-mono text-[#111827] dark:text-[#F3F7F5]">{Math.round(boldness * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.7"
            max="1.8"
            step="0.05"
            value={boldness}
            onChange={(e) => setBoldness(parseFloat(e.target.value))}
            className="w-full accent-[#0D5C3A] cursor-pointer"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#E6ECE8] dark:border-[#1C2622]">
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="h-9 px-3 rounded-lg border border-[#D5DDD8] dark:border-[#24332E] bg-white dark:bg-[#0D1412] text-xs font-semibold text-[#374151] dark:text-[#CBD5E1] cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm(false)}
          disabled={uploading}
          className="h-9 px-3 rounded-lg border border-[#D5DDD8] dark:border-[#24332E] bg-white dark:bg-[#0D1412] text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
        >
          Upload Raw Photo
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm(true)}
          disabled={uploading || processing || !processedFile}
          className="h-9 px-4 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {uploading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>{uploading ? 'Uploading...' : 'Upload Clean Signature'}</span>
        </button>
      </div>
    </div>
  );
}

