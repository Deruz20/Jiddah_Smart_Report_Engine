'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0').toUpperCase()
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r1 = 0
  let g1 = 0
  let b1 = 0
  if (h < 60) {
    r1 = c; g1 = x
  } else if (h < 120) {
    r1 = x; g1 = c
  } else if (h < 180) {
    g1 = c; b1 = x
  } else if (h < 240) {
    g1 = x; b1 = c
  } else if (h < 300) {
    r1 = x; b1 = c
  } else {
    r1 = c; b1 = x
  }
  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
  }
}

export interface ColorWheelPickerProps {
  label: string
  value: string
  defaultValue: string
  onChange: (hex: string) => void
  swatches?: { label: string; hex: string }[]
}

const DEFAULT_SWATCHES = [
  { label: 'Forest Green', hex: '#14532D' },
  { label: 'Royal Emerald', hex: '#0D5C3A' },
  { label: 'Imperial Navy', hex: '#1E3A8A' },
  { label: 'Stamp Blue', hex: '#1B3B8B' },
  { label: 'Warm Gold', hex: '#C59B27' },
  { label: 'Heritage Maroon', hex: '#7F1D1D' },
  { label: 'Carbon Slate', hex: '#1F2937' },
]

export function ColorWheelPicker({
  label,
  value,
  defaultValue,
  onChange,
  swatches = DEFAULT_SWATCHES,
}: ColorWheelPickerProps) {
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() => {
    const rgb = hexToRgb(value) || hexToRgb(defaultValue) || { r: 20, g: 83, b: 45 }
    return rgbToHsv(rgb.r, rgb.g, rgb.b)
  })
  const [hexInput, setHexInput] = useState(value.toUpperCase())
  const [expanded, setExpanded] = useState(false)
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const svBoxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setHexInput(value.toUpperCase())
    const rgb = hexToRgb(value)
    if (rgb) {
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b))
    }
  }, [value])

  const commitHsv = useCallback(
    (next: { h: number; s: number; v: number }) => {
      setHsv(next)
      const rgb = hsvToRgb(next.h, next.s, next.v)
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
      setHexInput(hex)
      onChange(hex)
    },
    [onChange]
  )

  const handleWheelPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = wheelRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const angle = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90
      const hue = ((angle % 360) + 360) % 360
      commitHsv({ ...hsv, h: hue })
    },
    [commitHsv, hsv]
  )

  const handleSvPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = svBoxRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const s = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1)
      const v = clamp(1 - (clientY - rect.top) / Math.max(1, rect.height), 0, 1)
      commitHsv({ ...hsv, s, v })
    },
    [commitHsv, hsv]
  )

  const pureHueHex = (() => {
    const rgb = hsvToRgb(hsv.h, 1, 1)
    return rgbToHex(rgb.r, rgb.g, rgb.b)
  })()

  return (
    <div
      data-testid="color-wheel-picker"
      className="rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-[#1E2623]/70 p-2.5 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 min-w-0 cursor-pointer text-left"
        >
          <span
            className="w-5 h-5 rounded-full border-2 border-white dark:border-stone-800 shadow-xs shrink-0"
            style={{ backgroundColor: value }}
          />
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-stone-800 dark:text-stone-100 truncate">
              {label}
            </div>
            <div className="text-[10px] font-mono text-stone-500">{value.toUpperCase()}</div>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                aria-label={expanded ? 'Hide Color Wheel' : 'Open Color Wheel'}
                className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border transition-colors cursor-pointer ${
                  expanded
                    ? 'bg-emerald-500/15 border-emerald-500/40'
                    : 'bg-white dark:bg-[#151D1A] border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full shadow-2xs border border-white/80"
                  style={{
                    background:
                      'conic-gradient(#ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                  }}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {expanded ? 'Hide Color Wheel' : 'Open Color Wheel'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(defaultValue)}
                aria-label="Reset Default"
                className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-stone-500 hover:text-[#0D5C3A] dark:hover:text-emerald-300 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {`Reset to Default (${defaultValue})`}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {expanded && (
        <div className="pt-2 border-t border-stone-200/80 dark:border-white/10 space-y-2.5">
          <div className="flex items-center gap-3">
            {/* 360° Conic Hue Ring */}
            <div
              ref={wheelRef}
              role="slider"
              aria-label={`${label} Hue Wheel`}
              aria-valuenow={Math.round(hsv.h)}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId)
                handleWheelPointer(e.clientX, e.clientY)
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1) handleWheelPointer(e.clientX, e.clientY)
              }}
              className="relative w-24 h-24 rounded-full shrink-0 cursor-crosshair select-none touch-none shadow-inner"
              style={{
                background:
                  'conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              }}
            >
              <div className="absolute inset-3.5 rounded-full bg-white dark:bg-[#151D1A] shadow-xs flex items-center justify-center">
                <span
                  className="w-8 h-8 rounded-full border border-black/10 shadow-xs"
                  style={{ backgroundColor: value }}
                />
              </div>
              <span
                className="pointer-events-none absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow-md"
                style={{
                  left: `${50 + 41 * Math.cos(((hsv.h - 90) * Math.PI) / 180)}%`,
                  top: `${50 + 41 * Math.sin(((hsv.h - 90) * Math.PI) / 180)}%`,
                  backgroundColor: pureHueHex,
                }}
              />
            </div>

            {/* 2D Saturation / Brightness Box */}
            <div
              ref={svBoxRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId)
                handleSvPointer(e.clientX, e.clientY)
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1) handleSvPointer(e.clientX, e.clientY)
              }}
              className="relative flex-1 h-24 rounded-lg overflow-hidden cursor-crosshair select-none touch-none border border-stone-300 dark:border-white/15"
              style={{
                backgroundColor: pureHueHex,
                backgroundImage:
                  'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
              }}
            >
              <span
                className="pointer-events-none absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow-md"
                style={{
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`,
                  backgroundColor: value,
                }}
              />
            </div>
          </div>

          {/* Hex Input + Institutional Quick Swatches */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => {
                const raw = e.target.value.toUpperCase()
                setHexInput(raw)
                const normalizedHex = raw.startsWith('#') ? raw : `#${raw}`
                if (/^#[0-9A-F]{6}$/.test(normalizedHex)) {
                  onChange(normalizedHex)
                }
              }}
              maxLength={7}
              className="w-24 h-7 px-2 rounded-lg bg-white dark:bg-[#151D1A] border border-stone-200 dark:border-white/10 font-mono text-[11px] font-bold text-stone-800 dark:text-stone-100"
              aria-label={`${label} Hex`}
            />
            <div className="flex items-center gap-1 flex-wrap flex-1">
              {swatches.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  title={sw.label}
                  onClick={() => onChange(sw.hex)}
                  className={`w-4.5 h-4.5 rounded-full border cursor-pointer transition ${
                    value.toUpperCase() === sw.hex.toUpperCase()
                      ? 'ring-2 ring-[#0D5C3A] scale-110 border-white'
                      : 'border-white/70 hover:scale-105'
                  }`}
                  style={{ backgroundColor: sw.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
