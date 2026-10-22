"use client";

import React, { useState } from "react";
import { Sliders, RotateCw, Save, RefreshCw, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export interface StampConfig {
  id?: string;
  shape: "circle" | "oval" | "rectangle";
  school_name: string;
  title: string;
  po_box: string;
  phone: string;
  ink_color: string;
  size_scale: number;
  rotation: number;
  opacity: number;
  grain_realism: boolean;
  date?: string;
}

export const DEFAULT_STAMP_CONFIG: StampConfig = {
  shape: "rectangle",
  school_name: "JIDDAH ISLAMIC SCHOOLS",
  title: "HEADTEACHER'S OFFICE",
  po_box: "P.O.BOX 34008, NSAGGU",
  phone: "+256 744950042 / 0705316961",
  ink_color: "#1E3A8A", // Deep Royal Blue
  size_scale: 1,
  rotation: -2,
  opacity: 0.88,
  grain_realism: true,
  date: "03 JUN 2026",
};

export function VectorStamp({
  config,
  date,
}: {
  config: StampConfig;
  date?: string;
}) {
  const displayDate = date || config.date || "03 JUN 2026";
  const filterId = config.grain_realism ? "url(#stamp-ink-grain)" : undefined;

  return (
    <div
      className="inline-block select-none pointer-events-auto"
      style={{
        transform: `rotate(${config.rotation}deg) scale(${config.size_scale})`,
        opacity: config.opacity,
        transformOrigin: "center center",
        mixBlendMode: "multiply",
      }}
    >
      <svg
        width={config.shape === "circle" ? "140" : config.shape === "oval" ? "180" : "190"}
        height={config.shape === "circle" ? "140" : config.shape === "oval" ? "130" : "100"}
        viewBox={
          config.shape === "circle"
            ? "0 0 140 140"
            : config.shape === "oval"
            ? "0 0 180 130"
            : "0 0 190 100"
        }
        className="overflow-visible"
        style={{ filter: filterId }}
      >
        <defs>
          <filter id="stamp-ink-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Paths for text curving */}
          <path id="circle-text-top" d="M 18,70 A 52,52 0 1,1 122,70" fill="none" />
          <path id="circle-text-bottom" d="M 122,70 A 52,52 0 0,1 18,70" fill="none" />
        </defs>

        {/* 1. RECTANGLE STAMP */}
        {config.shape === "rectangle" && (
          <g stroke={config.ink_color} fill={config.ink_color}>
            <rect
              x="2"
              y="2"
              width="186"
              height="96"
              rx="4"
              fill="none"
              strokeWidth="2.5"
            />
            <rect
              x="5.5"
              y="5.5"
              width="179"
              height="89"
              rx="2.5"
              fill="none"
              strokeWidth="1"
              strokeDasharray="4 2"
            />

            {/* Left vertical label */}
            <text
              x="12"
              y="50"
              fontSize="6"
              fontWeight="900"
              fontFamily="Georgia, serif"
              textAnchor="middle"
              transform="rotate(-90, 12, 50)"
              letterSpacing="0.8px"
            >
              OFFICIAL STAMP
            </text>
            <line x1="18" y1="6" x2="18" y2="94" strokeWidth="1" />

            {/* Right vertical label */}
            <line x1="172" y1="6" x2="172" y2="94" strokeWidth="1" />
            <text
              x="178"
              y="50"
              fontSize="6"
              fontWeight="900"
              fontFamily="Georgia, serif"
              textAnchor="middle"
              transform="rotate(90, 178, 50)"
              letterSpacing="0.8px"
            >
              ☪ VERIFIED
            </text>

            {/* Center Header */}
            <text
              x="95"
              y="20"
              fontSize="9"
              fontWeight="900"
              fontFamily="Georgia, serif"
              textAnchor="middle"
              letterSpacing="0.5px"
            >
              {config.school_name}
            </text>

            {/* Date Box */}
            <rect
              x="45"
              y="27"
              width="100"
              height="18"
              fill="none"
              strokeWidth="1.2"
              rx="2"
            />
            <text
              x="95"
              y="39"
              fontSize="8.5"
              fontWeight="900"
              fontFamily="Courier, monospace"
              textAnchor="middle"
              letterSpacing="1px"
            >
              {displayDate}
            </text>

            {/* Title / Role */}
            <text
              x="95"
              y="57"
              fontSize="8"
              fontWeight="900"
              fontFamily="Georgia, serif"
              textAnchor="middle"
              letterSpacing="0.6px"
            >
              ★ {config.title} ★
            </text>

            {/* Address & Tel */}
            <text
              x="95"
              y="70"
              fontSize="6.5"
              fontWeight="700"
              fontFamily="Georgia, serif"
              textAnchor="middle"
            >
              {config.po_box}
            </text>
            <text
              x="95"
              y="80"
              fontSize="6"
              fontWeight="700"
              fontFamily="Georgia, serif"
              textAnchor="middle"
            >
              {config.phone}
            </text>
          </g>
        )}

        {/* 2. CIRCULAR STAMP */}
        {config.shape === "circle" && (
          <g stroke={config.ink_color} fill={config.ink_color}>
            <circle cx="70" cy="70" r="66" fill="none" strokeWidth="2.5" />
            <circle cx="70" cy="70" r="61" fill="none" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="70" cy="70" r="42" fill="none" strokeWidth="1.5" />

            <text fontSize="7" fontWeight="900" fontFamily="Georgia, serif" letterSpacing="0.8px">
              <textPath href="#circle-text-top" startOffset="50%" textAnchor="middle">
                {config.school_name}
              </textPath>
            </text>

            <text fontSize="6" fontWeight="800" fontFamily="Georgia, serif" letterSpacing="0.5px">
              <textPath href="#circle-text-bottom" startOffset="50%" textAnchor="middle">
                ★ {config.po_box} ★
              </textPath>
            </text>

            {/* Inner Center */}
            <text
              x="70"
              y="58"
              fontSize="7"
              fontWeight="900"
              fontFamily="Georgia, serif"
              textAnchor="middle"
            >
              {config.title}
            </text>
            <rect x="36" y="63" width="68" height="15" fill="none" strokeWidth="1" />
            <text
              x="70"
              y="74"
              fontSize="8"
              fontWeight="900"
              fontFamily="Courier, monospace"
              textAnchor="middle"
            >
              {displayDate}
            </text>
            <text
              x="70"
              y="87"
              fontSize="5.5"
              fontWeight="700"
              fontFamily="Georgia, serif"
              textAnchor="middle"
            >
              ☪ OFFICIAL ☪
            </text>
          </g>
        )}

        {/* 3. OVAL STAMP */}
        {config.shape === "oval" && (
          <g stroke={config.ink_color} fill={config.ink_color}>
            <ellipse cx="90" cy="65" rx="85" ry="58" fill="none" strokeWidth="2.5" />
            <ellipse cx="90" cy="65" rx="80" ry="53" fill="none" strokeWidth="1" strokeDasharray="4 2" />
            <ellipse cx="90" cy="65" rx="55" ry="34" fill="none" strokeWidth="1.2" />

            <text
              x="90"
              y="24"
              fontSize="8"
              fontWeight="900"
              fontFamily="Georgia, serif"
              textAnchor="middle"
              letterSpacing="0.5px"
            >
              {config.school_name}
            </text>

            <text
              x="90"
              y="54"
              fontSize="7.5"
              fontWeight="900"
              fontFamily="Georgia, serif"
              textAnchor="middle"
            >
              ★ {config.title} ★
            </text>

            <rect x="52" y="58" width="76" height="15" fill="none" strokeWidth="1" />
            <text
              x="90"
              y="69"
              fontSize="8"
              fontWeight="900"
              fontFamily="Courier, monospace"
              textAnchor="middle"
            >
              {displayDate}
            </text>

            <text
              x="90"
              y="83"
              fontSize="6"
              fontWeight="700"
              fontFamily="Georgia, serif"
              textAnchor="middle"
            >
              {config.po_box}
            </text>
            <text
              x="90"
              y="110"
              fontSize="6"
              fontWeight="700"
              fontFamily="Georgia, serif"
              textAnchor="middle"
            >
              {config.phone}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function StampGeneratorPanel({
  config,
  onChange,
  onSave,
}: {
  config: StampConfig;
  onChange: (cfg: StampConfig) => void;
  onSave?: () => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handlePersist = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("stamp_configs").upsert(
        [
          {
            config_key: "current",
            shape: config.shape,
            school_name: config.school_name,
            title: config.title,
            po_box: config.po_box,
            phone: config.phone,
            ink_color: config.ink_color,
            size_scale: config.size_scale,
            rotation: config.rotation,
            opacity: config.opacity,
            grain_realism: config.grain_realism,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "config_key" }
      );
      if (error) throw error;
      if (onSave) await onSave();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error("Failed to save stamp config:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 text-xs font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sliders className="size-4 text-emerald-400" strokeWidth={1.75} />
          <span className="font-bold text-white text-sm">Stamp Customizer</span>
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
          <span>{saveSuccess ? "Saved!" : "Save Stamp"}</span>
        </button>
      </div>

      {/* Shape Selector */}
      <div className="space-y-1.5">
        <label className="text-stone-300 font-semibold text-[11px]">Stamp Shape</label>
        <div className="grid grid-cols-3 gap-2">
          {(["rectangle", "circle", "oval"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ ...config, shape: s })}
              className={`py-1.5 rounded-lg border text-center font-bold capitalize transition cursor-pointer ${
                config.shape === s
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-white/5 border-white/10 text-stone-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Ink Color Palette */}
      <div className="space-y-1.5">
        <label className="text-stone-300 font-semibold text-[11px]">Stamp Ink Color</label>
        <div className="flex items-center gap-2">
          {[
            { label: "Royal Blue", hex: "#1E3A8A" },
            { label: "Emerald", hex: "#047857" },
            { label: "Crimson", hex: "#991B1B" },
            { label: "Purple", hex: "#581C87" },
            { label: "Black", hex: "#0F172A" },
          ].map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => onChange({ ...config, ink_color: c.hex })}
              title={c.label}
              className={`size-7 rounded-full border-2 transition-transform cursor-pointer ${
                config.ink_color === c.hex ? "scale-115 border-white shadow-md" : "border-transparent opacity-80 hover:opacity-100"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      {/* Titles & Contacts */}
      <div className="space-y-2">
        <div>
          <label className="text-stone-400 text-[10px] uppercase font-bold">School Header</label>
          <input
            type="text"
            value={config.school_name}
            onChange={(e) => onChange({ ...config, school_name: e.target.value })}
            className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium text-xs focus:border-emerald-400 outline-none"
          />
        </div>
        <div>
          <label className="text-stone-400 text-[10px] uppercase font-bold">Signatory Title</label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => onChange({ ...config, title: e.target.value })}
            className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium text-xs focus:border-emerald-400 outline-none"
          />
        </div>
        <div>
          <label className="text-stone-400 text-[10px] uppercase font-bold">P.O. Box & Location</label>
          <input
            type="text"
            value={config.po_box}
            onChange={(e) => onChange({ ...config, po_box: e.target.value })}
            className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium text-xs focus:border-emerald-400 outline-none"
          />
        </div>
      </div>

      {/* Sliders: Scale, Rotation, Opacity */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-stone-300">
            <span>Size Scale</span>
            <span className="font-mono">{Math.round(config.size_scale * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.6"
            max="1.5"
            step="0.05"
            value={config.size_scale}
            onChange={(e) => onChange({ ...config, size_scale: parseFloat(e.target.value) })}
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
            min="-15"
            max="15"
            step="1"
            value={config.rotation}
            onChange={(e) => onChange({ ...config, rotation: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-stone-300">
            <span>Ink Opacity</span>
            <span className="font-mono">{Math.round(config.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.4"
            max="1"
            step="0.05"
            value={config.opacity}
            onChange={(e) => onChange({ ...config, opacity: parseFloat(e.target.value) })}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        {/* Grain Realism Toggle */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-stone-300 font-semibold">Rubber Stamp Grain Filter</span>
          <input
            type="checkbox"
            checked={config.grain_realism}
            onChange={(e) => onChange({ ...config, grain_realism: e.target.checked })}
            className="size-4 accent-emerald-400 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
