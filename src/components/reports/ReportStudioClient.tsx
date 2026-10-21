'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Move,
  RotateCw,
  Eye,
  RotateCcw,
  Save,
  Check,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Award,
  Palette,
  Layout,
  RefreshCw,
  X,
  Keyboard,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

import PrimaryEOTReport from '@/components/reports/PrimaryEOTReport';
import PrimaryMOTReport from '@/components/reports/PrimaryMOTReport';
import PrimaryBOTReport from '@/components/reports/PrimaryBOTReport';
import P7EOTReport from '@/components/reports/P7EOTReport';
import NurseryEOTReport from '@/components/reports/NurseryEOTReport';
import NurseryMOTReport from '@/components/reports/NurseryMOTReport';
import TheologyMOTReport from '@/components/reports/TheologyMOTReport';

import { DraggableOverlayLayer } from '@/components/reports/DraggableOverlayLayer';
import { RankingSettingsPreview } from '@/components/reports/RankingSettingsPreview';
import { ReportCardDesignGate } from '@/components/reports/ReportCardDesignGate';
import {
  TemplateOverlays,
  DEFAULT_OVERLAYS_BY_TEMPLATE,
  getStoredOverlays,
  saveStoredOverlays,
} from '@/lib/report-overlays';
import { SYNTHETIC_REPORT_FIXTURES } from '@/lib/report-synthetic-fixtures';
import { getContrastRatio } from '@/lib/contrast-guard';
import { themePresets, ThemePreset } from '@/lib/themes';

interface ReportStudioClientProps {
  initialSettings?: {
    primary_font?: string;
    arabic_font?: string;
    report_theme_preset?: string;
    theme_color?: string;
    school_name?: string;
  };
}

const TEMPLATE_OPTIONS = [
  { id: 'primary-eot', label: 'Primary EOT (A4 Landscape)', orientation: 'landscape', width: 1123, height: 794 },
  { id: 'primary-mot', label: 'Primary MOT (A4 Portrait)', orientation: 'portrait', width: 794, height: 1123 },
  { id: 'primary-bot', label: 'Primary BOT (A4 Portrait)', orientation: 'portrait', width: 794, height: 1123 },
  { id: 'p7-eot', label: 'P.7 Candidate EOT (A4 Landscape)', orientation: 'landscape', width: 1123, height: 794 },
  { id: 'nursery-eot', label: 'Nursery EOT (A4 Landscape)', orientation: 'landscape', width: 1123, height: 794 },
  { id: 'nursery-mot', label: 'Nursery MOT (A4 Portrait)', orientation: 'portrait', width: 794, height: 1123 },
  { id: 'theology-mot', label: 'Theology MOT (2-Up Sheet)', orientation: 'portrait', width: 794, height: 1123 },
];

export default function ReportStudioClient({ initialSettings }: ReportStudioClientProps) {
  // Active template
  const [selectedTemplate, setSelectedTemplate] = useState<string>('primary-eot');

  // Active side drawer: 'overlays' | 'branding' | 'ranking' | 'design-gate'
  const [activeDrawer, setActiveDrawer] = useState<'overlays' | 'branding' | 'ranking' | 'design-gate'>('overlays');

  // Zoom scale
  const [zoom, setZoom] = useState<number>(0.7);

  // Overlay state per template
  const [overlays, setOverlays] = useState<TemplateOverlays>(() =>
    getStoredOverlays('primary-eot')
  );
  const [selectedElementId, setSelectedElementId] = useState<'stamp' | 'head-teacher' | 'class-teacher' | null>('stamp');
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);

  // Live customization state
  const savedBranding = {
    primaryFont: initialSettings?.primary_font || 'Montserrat',
    arabicFont: initialSettings?.arabic_font || 'Amiri',
    themePreset: initialSettings?.report_theme_preset || 'emerald-gold',
    themeColor: initialSettings?.theme_color || '#0f4d25',
  };

  const [previewBranding, setPreviewBranding] = useState(savedBranding);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Load overlay positions when template changes
  useEffect(() => {
    setOverlays(getStoredOverlays(selectedTemplate));
    setSelectedElementId('stamp');
  }, [selectedTemplate]);

  // Sync saved overlays from backend on mount
  useEffect(() => {
    let active = true;
    fetch('/api/settings/school')
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (!active || !result?.data?.report_overlays) return;
        const remoteOverlays = result.data.report_overlays;
        if (remoteOverlays && typeof remoteOverlays === 'object') {
          try {
            localStorage.setItem('jiddah_report_overlay_positions', JSON.stringify(remoteOverlays));
            if (remoteOverlays[selectedTemplate]) {
              setOverlays(remoteOverlays[selectedTemplate]);
            }
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedTemplate]);

  // Contrast calculation
  const contrastRatio = getContrastRatio(previewBranding.themeColor, '#FFFFFF');
  const isContrastLow = contrastRatio < 4.5;

  const currentTemplateMeta = TEMPLATE_OPTIONS.find((t) => t.id === selectedTemplate) || TEMPLATE_OPTIONS[0];
  const currentFixture = SYNTHETIC_REPORT_FIXTURES[selectedTemplate] || SYNTHETIC_REPORT_FIXTURES['primary-eot'];

  // Handle overlay updates
  const handleOverlayChange = (updated: TemplateOverlays) => {
    setOverlays(updated);
    saveStoredOverlays(selectedTemplate, updated);
  };

  const handleResetOverlays = () => {
    const defaults = DEFAULT_OVERLAYS_BY_TEMPLATE[selectedTemplate] || DEFAULT_OVERLAYS_BY_TEMPLATE['primary-eot'];
    setOverlays(defaults);
    saveStoredOverlays(selectedTemplate, defaults);
    toast.success('Overlay positions reset to template defaults');
  };

  // Handle Branding Save / Cancel / Reset
  const handleApplyBranding = async () => {
    setIsSavingBranding(true);
    try {
      let allOverlays: Record<string, TemplateOverlays> = { [selectedTemplate]: overlays };
      try {
        const raw = localStorage.getItem('jiddah_report_overlay_positions');
        if (raw) {
          allOverlays = { ...JSON.parse(raw), [selectedTemplate]: overlays };
        }
      } catch {}

      const res = await fetch('/api/settings/school', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_font: previewBranding.primaryFont,
          arabic_font: previewBranding.arabicFont,
          report_theme_preset: previewBranding.themePreset,
          theme_color: previewBranding.themeColor,
          report_overlays: allOverlays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save school settings');
      toast.success('Report branding and template overlays persisted to backend');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleCancelBranding = () => {
    setPreviewBranding(savedBranding);
    toast.info('Preview reverted to saved settings');
  };

  const handleResetBrandingDefaults = () => {
    setPreviewBranding({
      primaryFont: 'Montserrat',
      arabicFont: 'Amiri',
      themePreset: 'emerald-gold',
      themeColor: '#0f4d25',
    });
    toast.info('Branding reset to system defaults (Emerald & Gold)');
  };

  // Keyboard nudging handler for active element
  const handleNudge = (deltaX: number, deltaY: number) => {
    if (!selectedElementId) return;
    const key = selectedElementId === 'stamp' ? 'stamp' : selectedElementId === 'head-teacher' ? 'headTeacher' : 'classTeacher';
    const elem = overlays[key];
    const updated = {
      ...overlays,
      [key]: {
        ...elem,
        xPercent: Math.max(1, Math.min(96, Math.round((elem.xPercent + deltaX) * 10) / 10)),
        yPercent: Math.max(1, Math.min(96, Math.round((elem.yPercent + deltaY) * 10) / 10)),
      },
    };
    handleOverlayChange(updated);
  };

  const activeElementKey = selectedElementId === 'stamp' ? 'stamp' : selectedElementId === 'head-teacher' ? 'headTeacher' : 'classTeacher';
  const activeElement = overlays[activeElementKey];

  return (
    <div className="flex flex-col h-screen bg-stone-100 text-stone-800 overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-stone-200 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            RS
          </div>
          <div>
            <h1 className="text-sm font-bold text-stone-900 leading-none">Report Studio & Customization Hub</h1>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Interactive stamp/signature positioning & live preview harness
            </p>
          </div>
        </div>

        {/* Template Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-600">Template:</span>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="text-xs rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 font-medium text-stone-800 outline-none focus:border-emerald-600 focus:bg-white transition"
          >
            {TEMPLATE_OPTIONS.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setActiveDrawer('overlays')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeDrawer === 'overlays'
                ? 'bg-white text-emerald-800 shadow-sm border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Stamp & Signatures</span>
          </button>
          <button
            onClick={() => setActiveDrawer('branding')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeDrawer === 'branding'
                ? 'bg-white text-emerald-800 shadow-sm border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Live Branding</span>
          </button>
          <button
            onClick={() => setActiveDrawer('ranking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeDrawer === 'ranking'
                ? 'bg-white text-emerald-800 shadow-sm border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Ranking Ties</span>
          </button>
          <button
            onClick={() => setActiveDrawer('design-gate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeDrawer === 'design-gate'
                ? 'bg-white text-emerald-800 shadow-sm border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>A4 Design Gate</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Interactive Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Zoom & Canvas Toolbar */}
          <div className="h-10 bg-stone-50 border-b border-stone-200 px-4 flex items-center justify-between z-20 text-xs text-stone-600">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] bg-stone-200/70 text-stone-700 px-2 py-0.5 rounded">
                {currentTemplateMeta.width} × {currentTemplateMeta.height}px ({currentTemplateMeta.orientation})
              </span>
              <span className="text-[11px] text-stone-500">
                Synthetic pupil: <strong>{currentFixture.student?.name}</strong> ({currentFixture.student?.class_name})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => Math.max(0.3, Math.round((z - 0.1) * 10) / 10))}
                className="p-1 rounded hover:bg-stone-200 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
                className="p-1 rounded hover:bg-stone-200 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(0.7)}
                className="px-2 py-0.5 text-[11px] font-medium rounded hover:bg-stone-200 transition"
              >
                Reset Zoom
              </button>
            </div>
          </div>

          {/* Scrollable Canvas Viewport */}
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-stone-200/60">
            <div
              className="relative shadow-2xl transition-transform duration-75 origin-top-center"
              style={{
                width: `${currentTemplateMeta.width}px`,
                height: `${currentTemplateMeta.height}px`,
                transform: `scale(${zoom})`,
                marginBottom: `${(currentTemplateMeta.height * (zoom - 1)) / 2}px`,
              }}
            >
              {/* Report Render Wrapper */}
              <div
                className="w-full h-full bg-white relative overflow-hidden"
                style={{
                  '--report-primary-color': previewBranding.themeColor,
                } as any}
              >
                {selectedTemplate === 'primary-eot' && <PrimaryEOTReport reportData={currentFixture} />}
                {selectedTemplate === 'primary-mot' && <PrimaryMOTReport reportData={currentFixture} />}
                {selectedTemplate === 'primary-bot' && <PrimaryBOTReport reportData={currentFixture} />}
                {selectedTemplate === 'p7-eot' && <P7EOTReport reportData={currentFixture} />}
                {selectedTemplate === 'nursery-eot' && <NurseryEOTReport reportData={currentFixture} />}
                {selectedTemplate === 'nursery-mot' && <NurseryMOTReport reportData={currentFixture} />}
                {selectedTemplate === 'theology-mot' && <TheologyMOTReport reportData={currentFixture} />}

                {/* Interactive Overlays Layer */}
                <DraggableOverlayLayer
                  overlays={overlays}
                  onChange={handleOverlayChange}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  snapEnabled={snapEnabled}
                  isInteractive={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls Panel */}
        <div className="w-96 bg-white border-l border-stone-200 flex flex-col shrink-0 overflow-y-auto">
          {/* Drawer 1: Stamp & Signature Positioning Controls */}
          {activeDrawer === 'overlays' && (
            <div className="p-5 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-stone-900">Stamp & Signature Overlay Controls</h2>
                  <button
                    onClick={handleResetOverlays}
                    className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium"
                    title="Reset to template defaults"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Click or drag overlay elements directly on the canvas, or use the controls below to nudge with pixel accuracy.
                </p>
              </div>

              {/* Element Selector Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedElementId('stamp')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                    selectedElementId === 'stamp' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-600'
                  }`}
                >
                  Stamp
                </button>
                <button
                  onClick={() => setSelectedElementId('head-teacher')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                    selectedElementId === 'head-teacher' ? 'bg-white text-blue-800 shadow-sm' : 'text-stone-600'
                  }`}
                >
                  Head Teacher
                </button>
                <button
                  onClick={() => setSelectedElementId('class-teacher')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                    selectedElementId === 'class-teacher' ? 'bg-white text-purple-800 shadow-sm' : 'text-stone-600'
                  }`}
                >
                  Class Teacher
                </button>
              </div>

              {/* Selected Element Controls */}
              {activeElement && (
                <div className="space-y-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="text-xs font-bold text-stone-800">{activeElement.label}</span>
                    <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeElement.visible}
                        onChange={(e) => {
                          handleOverlayChange({
                            ...overlays,
                            [activeElementKey]: { ...activeElement, visible: e.target.checked },
                          });
                        }}
                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Show on card</span>
                    </label>
                  </div>

                  {/* Position Coordinates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                        <span>Position X</span>
                        <span className="font-mono">{activeElement.xPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="95"
                        step="0.5"
                        value={activeElement.xPercent}
                        onChange={(e) =>
                          handleOverlayChange({
                            ...overlays,
                            [activeElementKey]: { ...activeElement, xPercent: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                        <span>Position Y</span>
                        <span className="font-mono">{activeElement.yPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="95"
                        step="0.5"
                        value={activeElement.yPercent}
                        onChange={(e) =>
                          handleOverlayChange({
                            ...overlays,
                            [activeElementKey]: { ...activeElement, yPercent: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>
                  </div>

                  {/* Rotation & Opacity */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                        <span>Rotation</span>
                        <span className="font-mono">{activeElement.rotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        step="1"
                        value={activeElement.rotation}
                        onChange={(e) =>
                          handleOverlayChange({
                            ...overlays,
                            [activeElementKey]: { ...activeElement, rotation: parseInt(e.target.value) },
                          })
                        }
                        className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                        <span>Opacity</span>
                        <span className="font-mono">{Math.round(activeElement.opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={activeElement.opacity}
                        onChange={(e) =>
                          handleOverlayChange({
                            ...overlays,
                            [activeElementKey]: { ...activeElement, opacity: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>
                  </div>

                  {/* Nudge Control Pad */}
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-stone-600 block mb-2">Fine Nudge (0.5% Step)</span>
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => handleNudge(0, -0.5)}
                        className="p-1.5 bg-white border border-stone-200 rounded-lg shadow-sm hover:bg-stone-100 active:scale-95 transition"
                        title="Nudge Up"
                      >
                        <ArrowUp className="w-4 h-4 text-stone-700" />
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleNudge(-0.5, 0)}
                          className="p-1.5 bg-white border border-stone-200 rounded-lg shadow-sm hover:bg-stone-100 active:scale-95 transition"
                          title="Nudge Left"
                        >
                          <ArrowLeft className="w-4 h-4 text-stone-700" />
                        </button>
                        <span className="text-[10px] text-stone-400 font-mono">Move</span>
                        <button
                          onClick={() => handleNudge(0.5, 0)}
                          className="p-1.5 bg-white border border-stone-200 rounded-lg shadow-sm hover:bg-stone-100 active:scale-95 transition"
                          title="Nudge Right"
                        >
                          <ArrowRight className="w-4 h-4 text-stone-700" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleNudge(0, 0.5)}
                        className="p-1.5 bg-white border border-stone-200 rounded-lg shadow-sm hover:bg-stone-100 active:scale-95 transition"
                        title="Nudge Down"
                      >
                        <ArrowDown className="w-4 h-4 text-stone-700" />
                      </button>
                    </div>
                  </div>

                  {/* Snap Guides Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                    <span className="text-xs text-stone-700">Snap to Margins & Guides</span>
                    <button
                      type="button"
                      onClick={() => setSnapEnabled(!snapEnabled)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        snapEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          snapEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyBranding}
                    disabled={isSavingBranding}
                    className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingBranding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Overlay Positions</span>
                  </button>
                </div>
              )}

              {/* Keyboard Shortcuts Hint */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-stone-800">
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Keyboard Shortcuts (When selected):</span>
                </div>
                <div>• Arrow keys: Fine nudge (0.5%)</div>
                <div>• Shift + Arrow: Fast nudge (2.5%)</div>
                <div>• [ and ]: Rotate -1° / +1°</div>
              </div>
            </div>
          )}

          {/* Drawer 2: Live Customization & Branding */}
          {activeDrawer === 'branding' && (
            <div className="p-5 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-stone-900">Live Customization & Contrast Guard</h2>
                <p className="text-xs text-stone-500 mt-1">
                  Every customization gets a live preview before applying. Changes reflect immediately on the canvas.
                </p>
              </div>

              {/* Theme Presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Report Theme Preset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'emerald-gold', label: 'Emerald & Gold', primary: '#0f4d25', accent: '#c2994c' },
                    { id: 'navy-silver', label: 'Navy & Silver', primary: '#1e3a8a', accent: '#94a3b8' },
                    { id: 'maroon-cream', label: 'Maroon & Cream', primary: '#7f1d1d', accent: '#d4a373' },
                    { id: 'charcoal-teal', label: 'Charcoal & Teal', primary: '#0f766e', accent: '#475569' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() =>
                        setPreviewBranding({
                          ...previewBranding,
                          themePreset: preset.id,
                          themeColor: preset.primary,
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                        previewBranding.themePreset === preset.id
                          ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-stone-800">{preset.label}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: preset.primary }} />
                          <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: preset.accent }} />
                        </div>
                      </div>
                      {previewBranding.themePreset === preset.id && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Accent Color & Contrast Guard */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Accent Color & Contrast
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={previewBranding.themeColor}
                    onChange={(e) =>
                      setPreviewBranding({
                        ...previewBranding,
                        themeColor: e.target.value,
                      })
                    }
                    className="w-10 h-10 rounded-lg cursor-pointer border border-stone-200 p-0 overflow-hidden"
                  />
                  <input
                    type="text"
                    value={previewBranding.themeColor}
                    onChange={(e) =>
                      setPreviewBranding({
                        ...previewBranding,
                        themeColor: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-stone-200 uppercase bg-white text-stone-800 outline-none"
                  />
                </div>

                {/* Inline Contrast Warning (Only shown when below WCAG AA 4.5:1) */}
                {isContrastLow ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800 mt-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Contrast Warning: {contrastRatio.toFixed(1)}:1</div>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Selected color falls below WCAG 2.1 AA 4.5:1 against white background. Text may be hard for parents to read.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Contrast ratio: {contrastRatio.toFixed(1)}:1 (WCAG AA Compliant)</span>
                  </div>
                )}
              </div>

              {/* Fonts */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Primary Font (Latin / English)
                  </label>
                  <select
                    value={previewBranding.primaryFont}
                    onChange={(e) =>
                      setPreviewBranding({
                        ...previewBranding,
                        primaryFont: e.target.value,
                      })
                    }
                    className="w-full text-xs rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none focus:bg-white"
                  >
                    <option value="Montserrat">Montserrat (Official Clean)</option>
                    <option value="Inter">Inter (Swiss Modern)</option>
                    <option value="Poppins">Poppins (Friendly Rounded)</option>
                    <option value="Roboto">Roboto (Technical Standard)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Arabic Font (Theology / Islamic Studies)
                  </label>
                  <select
                    value={previewBranding.arabicFont}
                    onChange={(e) =>
                      setPreviewBranding({
                        ...previewBranding,
                        arabicFont: e.target.value,
                      })
                    }
                    className="w-full text-xs rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800 outline-none focus:bg-white"
                  >
                    <option value="Amiri">Amiri (Classical Naskh)</option>
                    <option value="Cairo">Cairo (Modern Geometric)</option>
                    <option value="Tajawal">Tajawal (Contemporary Elegant)</option>
                    <option value="Almarai">Almarai (Clean Screen Sans)</option>
                    <option value="Changa">Changa (Display Condensed)</option>
                    <option value="Kufam">Kufam (Modern Kufic)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons: Apply, Cancel, Reset */}
              <div className="pt-4 border-t border-stone-200 space-y-2">
                <button
                  onClick={handleApplyBranding}
                  disabled={isSavingBranding}
                  className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isSavingBranding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Apply Customization</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCancelBranding}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetBrandingDefaults}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Drawer 3: Ranking Ties Interactive Preview */}
          {activeDrawer === 'ranking' && (
            <div className="p-5 space-y-4">
              <RankingSettingsPreview isStandalone={false} />
            </div>
          )}

          {/* Drawer 4: A4 Report-Card Design Gate */}
          {activeDrawer === 'design-gate' && (
            <div className="p-5 space-y-4">
              <ReportCardDesignGate isStandalone={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
