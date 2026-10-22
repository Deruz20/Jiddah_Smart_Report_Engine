"use client";

import React, { useState } from "react";
import { Sliders, RotateCw, Save, RefreshCw, Check, Shield } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export interface WatermarkConfig {
  id?: string;
  enabled: boolean;
  use_badge: boolean;
  custom_text: string;
  opacity: number;
  scale: number;
  rotation: number;
  layout: "center" | "tiled";
}

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: true,
  use_badge: true,
  custom_text: "OFFICIAL REPORT",
  opacity: 0.08,
  scale: 1,
  rotation: -30,
  layout: "center",
};

export function WatermarkOverlay({ config }: { config: WatermarkConfig }) {
  if (!config.enabled) return null;

  if (config.layout === "tiled") {
    return (
      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10 flex items-center justify-center flex-wrap gap-20 p-10"
        style={{ opacity: config.opacity }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center transform"
            style={{
              transform: `rotate(${config.rotation}deg) scale(${config.scale * 0.7})`,
            }}
          >
            {config.use_badge ? (
              <img src="/school_logo.svg" alt="Watermark" className="w-28 h-32 object-contain grayscale" />
            ) : (
              <span className="text-2xl font-black tracking-widest uppercase text-stone-700 font-sans border-2 border-stone-700 px-4 py-1 rounded-lg">
                {config.custom_text}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden z-10"
      style={{ opacity: config.opacity }}
    >
      <div
        className="flex flex-col items-center justify-center"
        style={{
          transform: `rotate(${config.rotation}deg) scale(${config.scale})`,
        }}
      >
        {config.use_badge ? (
          <img src="/school_logo.svg" alt="Watermark Shield" className="w-64 h-72 object-contain grayscale" />
        ) : (
          <div className="border-4 border-stone-800 px-8 py-3 rounded-2xl text-center">
            <span className="text-5xl font-black tracking-widest uppercase text-stone-800 font-sans">
              {config.custom_text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function WatermarkConfigPanel({
  config,
  onChange,
  onSave,
}: {
  config: WatermarkConfig;
  onChange: (cfg: WatermarkConfig) => void;
  onSave?: () => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handlePersist = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("watermark_configs").upsert([
        {
          enabled: config.enabled,
          use_badge: config.use_badge,
          custom_text: config.custom_text,
          opacity: config.opacity,
          scale: config.scale,
          rotation: config.rotation,
          layout: config.layout,
          updated_at: new Date().toISOString(),
        },
      ]);
      if (onSave) await onSave();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error("Failed to save watermark config:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 text-xs font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-emerald-400" strokeWidth={1.75} />
          <span className="font-bold text-white text-sm">Watermark Settings</span>
        </div>
        <button
          type="button"
          onClick={handlePersist}
          disabled={isSaving}
          className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold flex items-center gap-1.5 transition cursor-pointer"
        >
          {isSaving ? (
            <RefreshCw className="size-3 animate-spin" />
          ) : saveSuccess ? (
            <Check className="size-3" strokeWidth={3} />
          ) : (
            <Save className="size-3" strokeWidth={2} />
          )}
          <span>{saveSuccess ? "Saved!" : "Save Watermark"}</span>
        </button>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
        <span className="text-stone-200 font-semibold">Enable Report Watermark</span>
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
          className="size-4 accent-emerald-400 rounded cursor-pointer"
        />
      </div>

      {/* Mode: Emblem or Text */}
      <div className="space-y-1.5">
        <label className="text-stone-300 font-semibold text-[11px]">Watermark Style</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...config, use_badge: true })}
            className={`py-1.5 rounded-lg border text-center font-bold transition cursor-pointer ${
              config.use_badge
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                : "bg-white/5 border-white/10 text-stone-400 hover:text-white"
            }`}
          >
            School Emblem Shield
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...config, use_badge: false })}
            className={`py-1.5 rounded-lg border text-center font-bold transition cursor-pointer ${
              !config.use_badge
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                : "bg-white/5 border-white/10 text-stone-400 hover:text-white"
            }`}
          >
            Custom Text
          </button>
        </div>
      </div>

      {!config.use_badge && (
        <div className="space-y-1">
          <label className="text-stone-400 text-[10px] uppercase font-bold">Watermark Text</label>
          <input
            type="text"
            value={config.custom_text}
            onChange={(e) => onChange({ ...config, custom_text: e.target.value })}
            className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium text-xs focus:border-emerald-400 outline-none"
          />
        </div>
      )}

      {/* Layout: Center vs Tiled */}
      <div className="space-y-1.5">
        <label className="text-stone-300 font-semibold text-[11px]">Placement Pattern</label>
        <div className="grid grid-cols-2 gap-2">
          {(["center", "tiled"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onChange({ ...config, layout: l })}
              className={`py-1.5 rounded-lg border text-center font-bold capitalize transition cursor-pointer ${
                config.layout === l
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-white/5 border-white/10 text-stone-400 hover:text-white"
              }`}
            >
              {l === "center" ? "Single Center" : "Tiled Diagonal"}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders: Opacity, Scale, Rotation */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-stone-300">
            <span>Watermark Opacity</span>
            <span className="font-mono">{Math.round(config.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.02"
            max="0.25"
            step="0.01"
            value={config.opacity}
            onChange={(e) => onChange({ ...config, opacity: parseFloat(e.target.value) })}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-stone-300">
            <span>Scale</span>
            <span className="font-mono">{Math.round(config.scale * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.8"
            step="0.05"
            value={config.scale}
            onChange={(e) => onChange({ ...config, scale: parseFloat(e.target.value) })}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-stone-300">
            <span>Rotation Angle</span>
            <span className="font-mono">{config.rotation}°</span>
          </div>
          <input
            type="range"
            min="-60"
            max="60"
            step="5"
            value={config.rotation}
            onChange={(e) => onChange({ ...config, rotation: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
