"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  PenTool,
  Upload,
  Eraser,
  RotateCcw,
  Check,
  Save,
  RefreshCw,
  Image as ImageIcon,
  Sliders,
  FileCheck,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface SignaturePadProps {
  role?: string;
  slotKey?: string;
  label?: string;
  onSaved?: (dataUrl: string) => void;
}

export function SignaturePad({
  role = "Class Teacher",
  slotKey = "class-teacher",
  label = "Class Teacher Signature",
  onSaved,
}: SignaturePadProps) {
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  const [inkColor, setInkColor] = useState<string>("#1E3A8A"); // Deep Royal Blue
  const [lineWidth, setLineWidth] = useState<number>(2.5);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDataUrl, setSavedDataUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Background removal threshold
  const [whiteThreshold, setWhiteThreshold] = useState<number>(230);
  const [uploadedRawUrl, setUploadedRawUrl] = useState<string | null>(null);

  // Canvas Refs
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Load existing signature on mount
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("signatures")
      .select("data_url")
      .eq("role", slotKey)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.data_url) {
          setSavedDataUrl(data.data_url);
        }
      });
  }, [slotKey]);

  // Canvas Drawing Handlers
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    lastPoint.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPoint.current = currentPoint;
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    const canvas = drawCanvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      // Update preview
      setSavedDataUrl(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSavedDataUrl(null);
  };

  // Upload Handlers & Client-side Background Removal
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedRawUrl(result);
      processBackgroundRemoval(result, whiteThreshold);
    };
    reader.readAsDataURL(file);
  };

  const processBackgroundRemoval = (imageSrc: string, threshold: number) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Convert white/light pixels to transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > threshold && g > threshold && b > threshold) {
          data[i + 3] = 0; // Alpha transparent
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const cleanDataUrl = canvas.toDataURL("image/png");
      setSavedDataUrl(cleanDataUrl);
    };
    img.src = imageSrc;
  };

  const handleSaveSignature = async () => {
    if (!savedDataUrl) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || null;

      // 1. Commit to database signatures table
      await supabase.from("signatures").upsert([
        {
          role: slotKey,
          data_url: savedDataUrl,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
      ]);

      if (onSaved) onSaved(savedDataUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      console.error("Signature save error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--bg-card,#111714)] p-4 sm:p-5 space-y-4 font-sans text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PenTool className="size-4 text-emerald-400" strokeWidth={1.75} />
            <span>{label}</span>
          </h3>
          <p className="text-[11px] text-stone-400">
            Draw your signature or upload an image with automatic paper background removal.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("draw")}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "draw"
                ? "bg-emerald-500 text-black font-extrabold"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <PenTool className="size-3" />
            <span>Draw</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "upload"
                ? "bg-emerald-500 text-black font-extrabold"
                : "text-stone-400 hover:text-white"
            }`}
          >
            <Upload className="size-3" />
            <span>Upload Photo</span>
          </button>
        </div>
      </div>

      {/* DRAW TAB */}
      {activeTab === "draw" && (
        <div className="space-y-3">
          {/* Canvas Viewport */}
          <div className="relative w-full h-44 rounded-xl border border-stone-700 bg-white shadow-inner overflow-hidden flex items-center justify-center">
            <canvas
              ref={drawCanvasRef}
              width={560}
              height={176}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              className="w-full h-full cursor-crosshair touch-none"
            />
            {!savedDataUrl && (
              <span className="absolute pointer-events-none text-stone-400 text-xs italic select-none">
                Sign inside this box with stylus or finger...
              </span>
            )}
          </div>

          {/* Draw Tools Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-400 font-medium">Ink:</span>
              {[
                { hex: "#1E3A8A", label: "Blue" },
                { hex: "#000000", label: "Black" },
                { hex: "#047857", label: "Green" },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setInkColor(c.hex)}
                  className={`size-6 rounded-full border-2 transition-transform cursor-pointer ${
                    inkColor === c.hex ? "scale-115 border-white shadow-xs" : "border-transparent opacity-80"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}

              <div className="h-4 w-px bg-white/10 mx-1" />

              <span className="text-[11px] text-stone-400 font-medium">Stroke:</span>
              <input
                type="range"
                min="1.5"
                max="4.5"
                step="0.5"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseFloat(e.target.value))}
                className="w-20 accent-emerald-400 cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={clearCanvas}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 font-medium text-[11px] flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* UPLOAD TAB */}
      {activeTab === "upload" && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-dashed border-white/20 bg-white/[0.02] flex flex-col items-center justify-center text-center space-y-2">
            <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-stone-400">
              <ImageIcon className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-stone-200">Upload signature photo or scan</p>
              <p className="text-[11px] text-stone-400 mt-0.5">PNG, JPG, or WebP. Paper background is removed automatically.</p>
            </div>
            <label className="mt-2 h-8 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold flex items-center gap-2 cursor-pointer transition">
              <Upload className="size-3.5" />
              <span>Select Image File</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {uploadedRawUrl && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between text-[11px] text-stone-300 font-medium">
                <span>Background Transparency Cutoff Threshold</span>
                <span className="font-mono">{whiteThreshold} / 255</span>
              </div>
              <input
                type="range"
                min="180"
                max="250"
                value={whiteThreshold}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setWhiteThreshold(val);
                  if (uploadedRawUrl) processBackgroundRemoval(uploadedRawUrl, val);
                }}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* LIVE REPORT CARD PREVIEW BOX */}
      {savedDataUrl && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="size-3.5 text-emerald-400" />
            Report Card Verification Preview
          </span>
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-stone-300 text-stone-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-stone-700">{label}:</div>
              <div className="text-[10px] text-stone-400">Jiddah Islamic Schools • Academic Term</div>
            </div>
            <div className="w-36 h-14 border-b border-stone-400 flex items-end justify-center pb-1">
              <img src={savedDataUrl} alt="Signature Preview" className="max-h-12 max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Save Action Bar */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleSaveSignature}
          disabled={!savedDataUrl || isSaving}
          className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 text-black font-extrabold flex items-center gap-2 hover:brightness-105 active:scale-95 transition-all shadow-md disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : success ? (
            <Check className="size-3.5" strokeWidth={3} />
          ) : (
            <Save className="size-3.5" strokeWidth={2} />
          )}
          <span>{success ? "Signature Saved!" : "Save Signature"}</span>
        </button>
      </div>
    </div>
  );
}
