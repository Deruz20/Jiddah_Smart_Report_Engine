"use client";

import React, { useState, useEffect } from "react";
import {
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Check,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export interface FieldOverride {
  id?: string;
  template_type: string;
  field_key: string;
  font_family?: string;
  font_size?: string;
  font_weight?: string;
  color?: string;
  background?: string;
  alignment?: "left" | "center" | "right";
  border?: string;
  visible?: boolean;
}

const CUSTOMIZABLE_FIELDS = [
  { key: "school_header", label: "School Header & Title" },
  { key: "pupil_profile", label: "Pupil Profile Box" },
  { key: "marks_table", label: "Assessment Scores Table" },
  { key: "grading_scale", label: "Grading Standards Table" },
  { key: "teacher_comment", label: "Teacher & Head Comments" },
  { key: "signature_block", label: "Signatures & Official Stamp" },
];

export function ReportTemplateOverridesPanel({
  templateType,
  onApplyOverride,
}: {
  templateType: string;
  onApplyOverride?: (overrides: Record<string, FieldOverride>) => void;
}) {
  const [selectedField, setSelectedField] = useState<string>("pupil_profile");
  const [overrides, setOverrides] = useState<Record<string, FieldOverride>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("report_template_overrides")
      .select("*")
      .eq("template_type", templateType)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const map: Record<string, FieldOverride> = {};
          data.forEach((row: any) => {
            map[row.field_key] = row;
          });
          setOverrides(map);
          if (onApplyOverride) onApplyOverride(map);
        }
      });
  }, [templateType, onApplyOverride]);

  const currentConfig: FieldOverride = overrides[selectedField] || {
    template_type: templateType,
    field_key: selectedField,
    font_family: "Montserrat",
    font_size: "14px",
    font_weight: "700",
    color: "#1C1917",
    alignment: "center",
    visible: true,
  };

  const updateCurrent = (patch: Partial<FieldOverride>) => {
    const updated = { ...currentConfig, ...patch };
    const nextOverrides = { ...overrides, [selectedField]: updated };
    setOverrides(nextOverrides);
    if (onApplyOverride) onApplyOverride(nextOverrides);
  };

  const handlePersist = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const rows = Object.values(overrides).map((ov) => ({
        template_type: templateType,
        field_key: ov.field_key,
        font_family: ov.font_family,
        font_size: ov.font_size,
        font_weight: ov.font_weight,
        color: ov.color,
        background: ov.background,
        alignment: ov.alignment,
        border: ov.border,
        visible: ov.visible ?? true,
        updated_at: new Date().toISOString(),
      }));

      if (rows.length > 0) {
        await supabase
          .from("report_template_overrides")
          .upsert(rows, { onConflict: "template_type,field_key" });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error("Failed to save template overrides:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 text-xs font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-emerald-400" strokeWidth={1.75} />
          <span className="font-bold text-white text-sm">No-Code Template Editor</span>
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
          <span>{saveSuccess ? "Saved!" : "Save Overrides"}</span>
        </button>
      </div>

      {/* Target Section Picker */}
      <div className="space-y-1">
        <label className="text-stone-300 font-semibold text-[11px]">Select Document Section</label>
        <select
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
          className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium text-xs focus:border-emerald-400 outline-none"
        >
          {CUSTOMIZABLE_FIELDS.map((f) => (
            <option key={f.key} value={f.key} className="bg-stone-900 text-white">
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
        <span className="text-stone-200 font-semibold">Section Visibility</span>
        <button
          type="button"
          onClick={() => updateCurrent({ visible: !(currentConfig.visible ?? true) })}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            currentConfig.visible ?? true
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
          }`}
        >
          {currentConfig.visible ?? true ? (
            <>
              <Eye className="size-3.5" />
              <span>Visible</span>
            </>
          ) : (
            <>
              <EyeOff className="size-3.5" />
              <span>Hidden</span>
            </>
          )}
        </button>
      </div>

      {/* Font Family & Weight */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-stone-400 text-[10px] uppercase font-bold">Font Family</label>
          <select
            value={currentConfig.font_family || "Montserrat"}
            onChange={(e) => updateCurrent({ font_family: e.target.value })}
            className="w-full h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none"
          >
            <option value="Montserrat" className="bg-stone-900">Montserrat</option>
            <option value="Inter" className="bg-stone-900">Inter</option>
            <option value="Cairo" className="bg-stone-900">Cairo (Arabic)</option>
            <option value="Amiri" className="bg-stone-900">Amiri (Naskh)</option>
            <option value="Caveat" className="bg-stone-900">Caveat (Cursive)</option>
            <option value="Georgia" className="bg-stone-900">Georgia (Serif)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-stone-400 text-[10px] uppercase font-bold">Font Weight</label>
          <select
            value={currentConfig.font_weight || "700"}
            onChange={(e) => updateCurrent({ font_weight: e.target.value })}
            className="w-full h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none"
          >
            <option value="400" className="bg-stone-900">400 - Normal</option>
            <option value="600" className="bg-stone-900">600 - SemiBold</option>
            <option value="700" className="bg-stone-900">700 - Bold</option>
            <option value="900" className="bg-stone-900">900 - Black</option>
          </select>
        </div>
      </div>

      {/* Font Size & Alignment */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-stone-400 text-[10px] uppercase font-bold">Font Size</label>
          <input
            type="text"
            value={currentConfig.font_size || "14px"}
            onChange={(e) => updateCurrent({ font_size: e.target.value })}
            placeholder="14px"
            className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-stone-400 text-[10px] uppercase font-bold">Text Align</label>
          <div className="grid grid-cols-3 gap-1">
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => updateCurrent({ alignment: a })}
                className={`h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  (currentConfig.alignment || "center") === a
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400"
                    : "bg-white/5 text-stone-400 hover:text-white"
                }`}
              >
                {a === "left" && <AlignLeft className="size-3.5" />}
                {a === "center" && <AlignCenter className="size-3.5" />}
                {a === "right" && <AlignRight className="size-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Text Color & Background */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-stone-400 text-[10px] uppercase font-bold">Text Color</label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={currentConfig.color || "#1C1917"}
              onChange={(e) => updateCurrent({ color: e.target.value })}
              className="size-7 rounded border-none cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={currentConfig.color || "#1C1917"}
              onChange={(e) => updateCurrent({ color: e.target.value })}
              className="w-full h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs uppercase"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-stone-400 text-[10px] uppercase font-bold">Background</label>
          <input
            type="text"
            value={currentConfig.background || "transparent"}
            onChange={(e) => updateCurrent({ background: e.target.value })}
            placeholder="transparent / #fff"
            className="w-full h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
}
