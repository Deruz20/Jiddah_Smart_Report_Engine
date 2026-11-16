"use client";

import React, { useId, useState, useEffect } from "react";
import { Sliders, Save, RefreshCw, Check, Calendar } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export interface StampConfig {
  id?: string;
  shape: "circle" | "oval" | "rectangle";
  school_name: string;
  title: string;
  po_box: string;
  phone: string;
  ink_color: string;
  date_ink_color?: string;
  size_scale: number;
  rotation: number;
  opacity: number;
  grain_realism: boolean;
  grunge_intensity?: number;
  date?: string;
  date_offset_x?: number;
  date_offset_y?: number;
  date_font_size?: number;
  use_uploaded_image?: boolean;
}

export const DEFAULT_STAMP_CONFIG: StampConfig = {
  shape: "rectangle",
  school_name: "JIDDAH ISLAMIC NURSERY & PRIMARY SCHOOL",
  title: "HEADTEACHER",
  po_box: "P.O.Box 34008, Nsaggu",
  phone: "Nakawuka Rd, Wakiso District",
  ink_color: "#1B3B8B",
  date_ink_color: "#C81E1E",
  size_scale: 1,
  rotation: -2,
  opacity: 0.92,
  grain_realism: true,
  grunge_intensity: 35,
  date: "26 OCT 2026",
  date_offset_x: 0,
  date_offset_y: 0,
  date_font_size: 10,
  use_uploaded_image: false,
};

const STAMP_COLOR_PRESETS = [
  { label: "Official Stamp Blue", hex: "#1B3B8B" },
  { label: "Royal Blue", hex: "#1D4ED8" },
  { label: "Institutional Emerald", hex: "#0D5C3A" },
  { label: "Archival Crimson", hex: "#D92626" },
  { label: "Jet Black", hex: "#0F172A" },
];

export function formatStampDisplayDate(rawDate?: string | null): string {
  const trimmed = typeof rawDate === "string" ? rawDate.trim() : "";
  if (!trimmed) return DEFAULT_STAMP_CONFIG.date || "26 OCT 2026";

  // Convert ISO YYYY-MM-DD cleanly into uppercase stamp format "26 OCT 2026"
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed.slice(0, 10) + "T12:00:00");
    if (!Number.isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
  }

  return trimmed.toUpperCase();
}

function splitStampSchoolHeader(name: string): [string, string] {
  const clean = (name || "JIDDAH ISLAMIC NURSERY & PRIMARY SCHOOL").trim().toUpperCase();
  if (clean.includes("NURSERY & PRIMARY")) {
    const idx = clean.indexOf("NURSERY & PRIMARY");
    const top = clean.slice(0, idx).trim();
    const bottom = clean.slice(idx).trim();
    if (top && bottom) return [top, bottom];
  }
  if (clean.length <= 24) return [clean, ""];
  const words = clean.split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export const stampCrestCache = new Map<string, string>();

/**
 * Singleton hook that converts /logo-512h.png to a transparent monochromatic emblem
 * matching the stamp's ink color via an offscreen canvas once, eliminating SVG filter clipping blocks.
 */
export function useMonochromeStampCrest(inkColor: string = "#1B3B8B"): string {
  const [crestUrl, setCrestUrl] = useState<string>(() => stampCrestCache.get(inkColor) || "/logo-512h.png");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = stampCrestCache.get(inkColor);
    if (cached) {
      setCrestUrl(cached);
      return;
    }

    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 120, 120);
        const imgData = ctx.getImageData(0, 0, 120, 120);
        const data = imgData.data;

        let hex = inkColor.replace("#", "");
        if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
        const inkR = parseInt(hex.slice(0, 2), 16) || 27;
        const inkG = parseInt(hex.slice(2, 4), 16) || 59;
        const inkB = parseInt(hex.slice(4, 6), 16) || 139;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 40) {
            data[i + 3] = 0;
            continue;
          }
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Strip white canvas backing inside crest
          if (lum > 215) {
            data[i + 3] = 0;
            continue;
          }
          // Recolor darker crest pixels to inkColor with antialiased alpha
          data[i] = inkR;
          data[i + 1] = inkG;
          data[i + 2] = inkB;
          const strokeAlpha = Math.min(255, Math.round(((215 - lum) / 140) * 255));
          data[i + 3] = Math.min(a, Math.max(0, strokeAlpha));
        }

        ctx.putImageData(imgData, 0, 0);
        const resultUrl = canvas.toDataURL("image/png");
        stampCrestCache.set(inkColor, resultUrl);
        if (active) {
          setCrestUrl(resultUrl);
        }
      } catch {
        // Fallback to /logo-512h.png
      }
    };
    img.onerror = () => {};
    img.src = "/logo-512h.png";

    return () => {
      active = false;
    };
  }, [inkColor]);

  return crestUrl;
}

export function VectorStamp({
  config,
  date,
  maxWidth,
  maxHeight,
}: {
  config: StampConfig;
  date?: string;
  maxWidth?: number;
  maxHeight?: number;
}) {
  const rawUid = useId();
  const safeUid = rawUid.replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `stamp-ink-grain-${safeUid}`;

  const merged: StampConfig = {
    ...DEFAULT_STAMP_CONFIG,
    ...config,
  };

  const crestDataUrl = useMonochromeStampCrest(merged.ink_color);

  const displayDate = formatStampDisplayDate(date || merged.date);
  const grunge = Math.max(0, Math.min(100, merged.grunge_intensity ?? (merged.grain_realism ? 35 : 0)));
  const useFilter = merged.grain_realism && grunge > 0;
  const displacementScale = Number(((grunge / 100) * 1.85).toFixed(2));
  const dateOffsetX = Number(merged.date_offset_x ?? 0);
  const dateOffsetY = Number(merged.date_offset_y ?? 0);
  const dateFontSize = Number(merged.date_font_size ?? 10);
  const rotation = Number(merged.rotation ?? 0);
  const scale = Number(merged.size_scale ?? 1);
  const opacity = Number(merged.opacity ?? 0.9);
  const [headerLine1, headerLine2] = splitStampSchoolHeader(merged.school_name);

  const inkHex = (merged.ink_color || "#1B3B8B").replace("#", "");
  const inkR = Number(((parseInt(inkHex.slice(0, 2), 16) || 27) / 255).toFixed(3));
  const inkG = Number(((parseInt(inkHex.slice(2, 4), 16) || 59) / 255).toFixed(3));
  const inkB = Number(((parseInt(inkHex.slice(4, 6), 16) || 139) / 255).toFixed(3));

  const baseW = merged.shape === "circle" ? 136 : merged.shape === "oval" ? 182 : 380;
  const baseH = merged.shape === "circle" ? 136 : merged.shape === "oval" ? 124 : 220;

  const fitRatio =
    maxWidth && maxHeight
      ? Math.min(maxWidth / baseW, maxHeight / baseH, 1)
      : maxWidth
      ? Math.min(maxWidth / baseW, 1)
      : maxHeight
      ? Math.min(maxHeight / baseH, 1)
      : 1;

  const effectiveScale = Number((scale * fitRatio).toFixed(3));
  const pathTopId = `circle-text-top-${safeUid}`;
  const pathBottomId = `circle-text-bottom-${safeUid}`;

  return (
    <div
      data-testid="official-vector-stamp"
      dir="ltr"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        backgroundColor: "transparent",
        transform: `rotate(${rotation}deg) scale(${effectiveScale})`,
        opacity,
        transformOrigin: "center center",
        mixBlendMode: "multiply",
        direction: "ltr",
        unicodeBidi: "isolate",
      }}
    >
      <svg
        width={baseW}
        height={baseH}
        viewBox={`0 0 ${baseW} ${baseH}`}
        direction="ltr"
        style={{
          overflow: "visible",
          filter: useFilter ? `url(#${filterId})` : undefined,
          direction: "ltr",
          unicodeBidi: "isolate",
        }}
      >
        <defs>
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={displacementScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="jiddah-stamp-ink-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
            />
            <feComponentTransfer>
              <feFuncR type="linear" slope="0" intercept={inkR} />
              <feFuncG type="linear" slope="0" intercept={inkG} />
              <feFuncB type="linear" slope="0" intercept={inkB} />
              <feFuncA type="linear" slope="-4.0" intercept="3.6" />
            </feComponentTransfer>
          </filter>
          <filter id="jiddah-stamp-crest-ink" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.106
                      0 0 0 0 0.231
                      0 0 0 0 0.545
                      -1.6 -1.6 -1.6 0 2.2"
            />
          </filter>
          <path id={pathTopId} d="M 18,68 A 50,50 0 1,1 118,68" fill="none" />
          <path id={pathBottomId} d="M 118,68 A 50,50 0 0,1 18,68" fill="none" />
        </defs>

        {/* 1. JIDDAH RECTANGULAR RUBBER STAMP — AUTHENTIC DIGITAL VECTOR CLONE */}
        {merged.shape === "rectangle" && (
          <g stroke={merged.ink_color} fill={merged.ink_color}>
            {/* Outer Bracket Frame (Royal Stamp Blue #1B3B8B, strokeWidth=4.5) */}
            <path
              d="M 14 52 L 14 18 Q 14 10 22 10 L 358 10 Q 366 10 366 18 L 366 52"
              fill="none"
              stroke={merged.ink_color}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M 14 168 L 14 202 Q 14 210 22 210 L 358 210 Q 366 210 366 202 L 366 168"
              fill="none"
              stroke={merged.ink_color}
              strokeWidth="4.5"
              strokeLinecap="round"
            />

            {/* Left Vertical Wall Text: HEADTEACHER'S OFFICE */}
            <text
              transform="translate(14, 110) rotate(90)"
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="800"
              letterSpacing="0.5px"
              fill={merged.ink_color}
              stroke="none"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              HEADTEACHER&apos;S OFFICE
            </text>

            {/* Right Vertical Wall Text: HEADTEACHER'S OFFICE */}
            <text
              transform="translate(366, 110) rotate(-90)"
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="800"
              letterSpacing="0.5px"
              fill={merged.ink_color}
              stroke="none"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              HEADTEACHER&apos;S OFFICE
            </text>

            {/* Top 2 Header Lines (Royal Stamp Blue #1B3B8B) */}
            <text
              x="190"
              y="36"
              textAnchor="middle"
              fontSize="20.5"
              fontWeight="800"
              letterSpacing="0.6px"
              fill={merged.ink_color}
              stroke="none"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              JIDDAH ISLAMIC NURSERY &amp;
            </text>
            <text
              x="190"
              y="61"
              textAnchor="middle"
              fontSize="20.5"
              fontWeight="800"
              letterSpacing="1.2px"
              fill={merged.ink_color}
              stroke="none"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              PRIMARY SCHOOL
            </text>

            {/* Middle 3-Column Row (y=68 to 142) */}
            {/* Column 1: Left Jiddah Authentic School Crest Badge (x=24 to 100, y=66 to 140) */}
            <g transform="translate(0, 0)">
              <desc>DAY AND BOARDING - STRIVE FOR LIFE &amp; HERE AFTER</desc>
              <image
                href={crestDataUrl || "/logo-512h.png"}
                x="24"
                y="66"
                width="76"
                height="74"
                preserveAspectRatio="xMidYMid meet"
              />
            </g>

            {/* Column 2: Center Crimson Red Dater-Stamp Date (#C81E1E) */}
            <text
              x={195 + dateOffsetX}
              y={115 + dateOffsetY}
              textAnchor="middle"
              fill={merged.date_ink_color || "#C81E1E"}
              stroke="none"
              fontSize="22"
              fontWeight="900"
              fontFamily="'Impact', 'Arial Black', sans-serif"
              letterSpacing="1.6px"
              direction="ltr"
              style={{ direction: "ltr", unicodeBidi: "bidi-override" }}
            >
              {displayDate}
            </text>

            {/* Column 3: Right Bold Crescent & 5-Pointed Star (x=285 to 348) */}
            <g transform="translate(0, 0)">
              {/* Crescent opening toward top-left */}
              <path
                d="M 306 86 C 330 86 344 98 344 110 C 344 124 330 132 312 132 C 304 132 296 130 290 126 C 314 124 326 114 326 104 C 326 94 316 88 306 86 Z"
                fill={merged.ink_color}
                stroke="none"
              />
              {/* 5-pointed star at upper-left */}
              <polygon
                points="300,90 302.5,95 308,95.5 304,99 305.5,104.5 300,101.5 294.5,104.5 296,99 292,95.5 297.5,95"
                fill={merged.ink_color}
                stroke="none"
              />
            </g>

            {/* Bottom 3 Footer Lines */}
            <text
              x="190"
              y="164"
              textAnchor="middle"
              fill={merged.ink_color}
              stroke="none"
              fontFamily="Georgia, 'Times New Roman', serif"
              fontSize="22"
              fontWeight="900"
              letterSpacing="3.5px"
            >
              HEADTEACHER
            </text>
            <text
              x="190"
              y="184"
              textAnchor="middle"
              fill={merged.ink_color}
              stroke="none"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="16.5"
              fontWeight="800"
              letterSpacing="0.6px"
            >
              P.O.Box 34008, Nsaggu
            </text>
            <text
              x="190"
              y="203"
              textAnchor="middle"
              fill={merged.ink_color}
              stroke="none"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="16.5"
              fontWeight="800"
              letterSpacing="0.4px"
            >
              Nakawuka Rd, Wakiso District
            </text>
          </g>
        )}

        {/* 2. CIRCULAR STAMP */}
        {merged.shape === "circle" && (
          <g stroke={merged.ink_color} fill={merged.ink_color}>
            <circle cx="68" cy="68" r="64" fill="none" strokeWidth="2.4" />
            <circle cx="68" cy="68" r="59.5" fill="none" strokeWidth="0.9" />
            <circle cx="68" cy="68" r="41" fill="none" strokeWidth="1.2" />

            <text fontSize="6.5" fontWeight="900" fontFamily="Georgia, serif" letterSpacing="0.6px" stroke="none">
              <textPath href={`#${pathTopId}`} startOffset="50%" textAnchor="middle">
                {headerLine1}
              </textPath>
            </text>

            <text fontSize="5.8" fontWeight="800" fontFamily="Georgia, serif" letterSpacing="0.4px" stroke="none">
              <textPath href={`#${pathBottomId}`} startOffset="50%" textAnchor="middle">
                ★ {merged.po_box.toUpperCase()} ★
              </textPath>
            </text>

            <text
              x="68"
              y="55"
              fontSize="7"
              fontWeight="900"
              fontFamily="Georgia, serif"
              textAnchor="middle"
              stroke="none"
            >
              {merged.title.toUpperCase()}
            </text>
            <line x1="34" y1="60" x2="102" y2="60" strokeWidth="0.9" />
            <text
              x={68 + dateOffsetX}
              y={72 + dateOffsetY}
              fontSize={Math.max(7, dateFontSize - 1.5)}
              fontWeight="900"
              fontFamily="'Courier New', Courier, monospace"
              textAnchor="middle"
              stroke="none"
              direction="ltr"
              style={{ direction: "ltr", unicodeBidi: "bidi-override" }}
            >
              {displayDate}
            </text>
            <line x1="34" y1="77" x2="102" y2="77" strokeWidth="0.9" />
            <text
              x="68"
              y="88"
              fontSize="6"
              fontWeight="800"
              fontFamily="Georgia, serif"
              textAnchor="middle"
              stroke="none"
            >
              ★ OFFICIAL ★
            </text>
          </g>
        )}

        {/* 3. OVAL STAMP */}
        {merged.shape === "oval" && (
          <g stroke={merged.ink_color} fill={merged.ink_color}>
            <ellipse cx="91" cy="62" rx="86" ry="56" fill="none" strokeWidth="2.4" />
            <ellipse cx="91" cy="62" rx="81" ry="51" fill="none" strokeWidth="0.9" />
            <ellipse cx="91" cy="62" rx="56" ry="32" fill="none" strokeWidth="1" />

            <text
              x="91"
              y="22"
              fontSize="7.4"
              fontWeight="900"
              fontFamily="Georgia, serif"
              textAnchor="middle"
              letterSpacing="0.5px"
              stroke="none"
            >
              {headerLine1}
            </text>
            <text
              x="91"
              y="50"
              fontSize="7.8"
              fontWeight="900"
              fontFamily="Georgia, serif"
              textAnchor="middle"
              stroke="none"
            >
              ★ {merged.title.toUpperCase()} ★
            </text>
            <line x1="46" y1="54" x2="136" y2="54" strokeWidth="0.9" />
            <text
              x={91 + dateOffsetX}
              y={66 + dateOffsetY}
              fontSize={Math.max(7, dateFontSize - 1)}
              fontWeight="900"
              fontFamily="'Courier New', Courier, monospace"
              textAnchor="middle"
              stroke="none"
              direction="ltr"
              style={{ direction: "ltr", unicodeBidi: "bidi-override" }}
            >
              {displayDate}
            </text>
            <line x1="46" y1="71" x2="136" y2="71" strokeWidth="0.9" />
            <text
              x="91"
              y="83"
              fontSize="6"
              fontWeight="700"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
              stroke="none"
            >
              {merged.po_box.toUpperCase()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function OfficialReportStamp({
  reportData,
  studioFormatting,
  maxWidth = 135,
  maxHeight = 64,
}: {
  reportData: any;
  studioFormatting?: any;
  maxWidth?: number;
  maxHeight?: number;
}) {
  const savedStampConfig =
    reportData?.stamp_config ||
    reportData?.settings?.print_preferences?.stamp_config ||
    {};

  const studioScaleMultiplier =
    typeof studioFormatting?.stampScale === "number" && studioFormatting.stampScale > 0
      ? studioFormatting.stampScale / 100
      : 1;
  const studioRotation =
    typeof studioFormatting?.stampRotation === "number"
      ? studioFormatting.stampRotation
      : savedStampConfig.rotation ?? DEFAULT_STAMP_CONFIG.rotation;
  const studioOpacity =
    typeof studioFormatting?.stampOpacity === "number"
      ? Math.max(0.5, Math.min(1, studioFormatting.stampOpacity / 100))
      : savedStampConfig.opacity ?? DEFAULT_STAMP_CONFIG.opacity;
  const stampOffsetX = Number(studioFormatting?.stampOffsetX ?? 0);
  const stampOffsetY = Number(studioFormatting?.stampOffsetY ?? 0);

  const config: StampConfig = {
    ...DEFAULT_STAMP_CONFIG,
    ...savedStampConfig,
    ink_color:
      studioFormatting?.stampInkColor ||
      studioFormatting?.stampColor ||
      savedStampConfig.ink_color ||
      DEFAULT_STAMP_CONFIG.ink_color,
    date_ink_color:
      studioFormatting?.stampDateInkColor ||
      savedStampConfig.date_ink_color ||
      DEFAULT_STAMP_CONFIG.date_ink_color,
    grain_realism:
      studioFormatting?.stampNaturalRealism !== undefined
        ? Boolean(studioFormatting.stampNaturalRealism)
        : savedStampConfig.grain_realism ?? DEFAULT_STAMP_CONFIG.grain_realism,
    opacity: studioOpacity,
    // Outer position:absolute transform-layer handles scale/rotation/translation with zero layout shift
    rotation: 0,
    size_scale: 1,
  };

  const resolvedDate =
    studioFormatting?.stampDate ||
    reportData?.stamp_date ||
    reportData?.settings?.stamp_date ||
    config.date ||
    reportData?.term?.end_date ||
    DEFAULT_STAMP_CONFIG.date;

  const isUploadedMode =
    studioFormatting?.stampMode === "uploaded" ||
    config.use_uploaded_image === true;

  const totalScale = (savedStampConfig.size_scale ?? DEFAULT_STAMP_CONFIG.size_scale ?? 1) * studioScaleMultiplier;

  return (
    <div
      data-testid="official-stamp-anchor-slot"
      style={{
        width: `${maxWidth}px`,
        height: `${maxHeight}px`,
        minWidth: `${maxWidth}px`,
        minHeight: `${maxHeight}px`,
        position: "relative",
        overflow: "visible",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        data-testid="official-stamp-transform-layer"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
          transform: `translate(${stampOffsetX}px, ${stampOffsetY}px) rotate(${studioRotation}deg) scale(${totalScale})`,
          transformOrigin: "center center",
        }}
      >
        {isUploadedMode && reportData?.signatures?.["school-stamp"] ? (
          <img
            src={reportData.signatures["school-stamp"]}
            alt="Official School Stamp"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              mixBlendMode: "multiply",
              opacity: studioOpacity,
              filter: "contrast(1.65) brightness(1.12)",
              backgroundColor: "transparent",
            }}
          />
        ) : (
          <VectorStamp
            config={config}
            date={resolvedDate}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
          />
        )}
      </div>
    </div>
  );
}

export function StampGeneratorPanel({
  config,
  onChange,
  onSave,
  tone = "light",
}: {
  config: StampConfig;
  onChange: (cfg: StampConfig) => void;
  onSave?: (cfg: StampConfig) => Promise<void> | void;
  tone?: "light" | "dark";
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDark = tone === "dark";
  const labelCls = isDark
    ? "text-stone-300 font-semibold text-[11px]"
    : "text-[#374151] dark:text-[#CBD5E1] font-semibold text-[11px]";
  const subLabelCls = isDark
    ? "text-stone-400 text-[10px] uppercase font-bold"
    : "text-[#6B7280] dark:text-[#9CA3AF] text-[10px] uppercase font-bold";
  const inputCls = isDark
    ? "w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium text-xs focus:border-emerald-400 outline-none"
    : "w-full h-9 px-2.5 rounded-lg bg-white dark:bg-[#0D1412] border border-[#D5DDD8] dark:border-[#24332E] text-[#111827] dark:text-[#F3F7F5] font-medium text-xs focus:border-[#0D5C3A] dark:focus:border-[#10B981] outline-none";

  const merged: StampConfig = {
    ...DEFAULT_STAMP_CONFIG,
    ...config,
  };
  const grunge = Math.max(0, Math.min(100, merged.grunge_intensity ?? (merged.grain_realism ? 35 : 0)));

  const handlePersist = async () => {
    setIsSaving(true);
    try {
      // 1. Primary schema-safe persistence via /api/settings/school print_preferences.stamp_config
      const resGet = await fetch("/api/settings/school");
      const rawGet = resGet.ok ? await resGet.json() : {};
      const currentSettings = rawGet?.data || rawGet || {};
      const nextPrintPrefs = {
        ...(currentSettings?.print_preferences || {}),
        stamp_config: merged,
      };
      const resPatch = await fetch("/api/settings/school", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ print_preferences: nextPrintPrefs }),
      });

      if (!resPatch.ok) {
        const errBody = await resPatch.json().catch(() => ({}));
        throw new Error(errBody?.error || "Failed to save stamp design settings.");
      }

      if (onSave) await onSave(merged);
      setSaveSuccess(true);
      toast.success("Official stamp design saved across all report cards.");
      setTimeout(() => setSaveSuccess(false), 2200);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save stamp design.");
    } finally {
      setIsSaving(false);
    }
  };

  const setTodayDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = now.getFullYear();
    onChange({ ...merged, date: `${day} ${month} ${year}` });
  };

  return (
    <div className="p-4 space-y-4 text-xs font-sans">
      <div
        className={`flex items-center justify-between pb-2.5 border-b ${
          isDark ? "border-white/10" : "border-[#E6ECE8] dark:border-[#1C2622]"
        }`}
      >
        <div className="flex items-center gap-2">
          <Sliders className="size-4 text-[#0D5C3A] dark:text-[#10B981]" strokeWidth={1.75} />
          <span className={`font-bold text-sm ${isDark ? "text-white" : "text-[#111827] dark:text-[#F3F7F5]"}`}>
            Official Code Stamp Studio
          </span>
        </div>
        <button
          type="button"
          onClick={handlePersist}
          disabled={isSaving}
          className="h-9 px-3.5 rounded-lg bg-[#0D5C3A] hover:bg-[#0A472C] text-white font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="size-3.5" strokeWidth={3} />
          ) : (
            <Save className="size-3.5" strokeWidth={2} />
          )}
          <span>{saveSuccess ? "Saved" : "Save Stamp"}</span>
        </button>
      </div>

      {/* Live Paper Stamp Preview */}
      <div className="rounded-xl border border-[#D5DDD8] dark:border-[#24332E] bg-[#FCFBF7] p-4 flex items-center justify-center min-h-[132px]">
        <VectorStamp config={merged} />
      </div>

      {/* Stamp Date + Today shortcut */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className={subLabelCls}>Adjustable Date Line</label>
          <button
            type="button"
            onClick={setTodayDate}
            className="text-[11px] font-semibold text-[#0D5C3A] dark:text-[#10B981] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Calendar className="size-3" />
            <span>Today</span>
          </button>
        </div>
        <input
          type="text"
          value={merged.date || ""}
          onChange={(e) => onChange({ ...merged, date: e.target.value.toUpperCase() })}
          placeholder="26 OCT 2026"
          className={inputCls}
        />
      </div>

      {/* Shape Selector */}
      <div className="space-y-1.5">
        <label className={labelCls}>Stamp Shape</label>
        <div className="grid grid-cols-3 gap-2">
          {(["rectangle", "circle", "oval"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ ...merged, shape: s })}
              className={`h-8 rounded-lg border text-center font-bold capitalize transition cursor-pointer ${
                merged.shape === s
                  ? isDark
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-[#0D5C3A]/10 border-[#0D5C3A] text-[#0D5C3A] dark:bg-emerald-500/15 dark:border-emerald-400 dark:text-emerald-300"
                  : isDark
                  ? "bg-white/5 border-white/10 text-stone-400 hover:text-white"
                  : "bg-white dark:bg-[#0D1412] border-[#D5DDD8] dark:border-[#24332E] text-[#6B7280] dark:text-[#9CA3AF]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Ink Color Palette */}
      <div className="space-y-1.5">
        <label className={labelCls}>Stamp Ink Color</label>
        <div className="flex items-center gap-2.5 flex-wrap">
          {STAMP_COLOR_PRESETS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => onChange({ ...merged, ink_color: c.hex })}
              title={c.label}
              aria-label={c.label}
              className={`size-7 rounded-full border-2 transition-transform cursor-pointer ${
                merged.ink_color === c.hex
                  ? "scale-110 border-[#0D5C3A] ring-2 ring-[#0D5C3A]/30"
                  : "border-transparent opacity-80 hover:opacity-100"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      {/* Text Content Lines */}
      <div className="space-y-2">
        <div>
          <label className={subLabelCls}>School Header</label>
          <input
            type="text"
            value={merged.school_name}
            onChange={(e) => onChange({ ...merged, school_name: e.target.value })}
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={subLabelCls}>Signatory Role</label>
            <input
              type="text"
              value={merged.title}
              onChange={(e) => onChange({ ...merged, title: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={subLabelCls}>Optional Phone</label>
            <input
              type="text"
              value={merged.phone}
              onChange={(e) => onChange({ ...merged, phone: e.target.value })}
              placeholder="Optional"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={subLabelCls}>P.O. Box &amp; Location</label>
          <input
            type="text"
            value={merged.po_box}
            onChange={(e) => onChange({ ...merged, po_box: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Fine Position, Font Size, Rotation & Grunge */}
      <div
        className={`space-y-3 pt-3 border-t ${
          isDark ? "border-white/10" : "border-[#E6ECE8] dark:border-[#1C2622]"
        }`}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className={`flex justify-between ${labelCls}`}>
              <span>Date X Offset</span>
              <span className="font-mono">{merged.date_offset_x ?? 0}px</span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={merged.date_offset_x ?? 0}
              onChange={(e) => onChange({ ...merged, date_offset_x: parseInt(e.target.value, 10) })}
              className="w-full accent-[#0D5C3A] cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <div className={`flex justify-between ${labelCls}`}>
              <span>Date Y Offset</span>
              <span className="font-mono">{merged.date_offset_y ?? 0}px</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={merged.date_offset_y ?? 0}
              onChange={(e) => onChange({ ...merged, date_offset_y: parseInt(e.target.value, 10) })}
              className="w-full accent-[#0D5C3A] cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className={`flex justify-between ${labelCls}`}>
              <span>Date Font Size</span>
              <span className="font-mono">{merged.date_font_size ?? 10}px</span>
            </div>
            <input
              type="range"
              min="6"
              max="14"
              step="0.5"
              value={merged.date_font_size ?? 10}
              onChange={(e) => onChange({ ...merged, date_font_size: parseFloat(e.target.value) })}
              className="w-full accent-[#0D5C3A] cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <div className={`flex justify-between ${labelCls}`}>
              <span>Rotation Angle</span>
              <span className="font-mono">{merged.rotation}°</span>
            </div>
            <input
              type="range"
              min="-8"
              max="8"
              step="1"
              value={merged.rotation}
              onChange={(e) => onChange({ ...merged, rotation: parseInt(e.target.value, 10) })}
              className="w-full accent-[#0D5C3A] cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className={`flex justify-between ${labelCls}`}>
              <span>Wet-Ink Texture</span>
              <span className="font-mono">{grunge}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={grunge}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onChange({ ...merged, grunge_intensity: val, grain_realism: val > 0 });
              }}
              className="w-full accent-[#0D5C3A] cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <div className={`flex justify-between ${labelCls}`}>
              <span>Size Scale</span>
              <span className="font-mono">{Math.round(merged.size_scale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.4"
              step="0.05"
              value={merged.size_scale}
              onChange={(e) => onChange({ ...merged, size_scale: parseFloat(e.target.value) })}
              className="w-full accent-[#0D5C3A] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
