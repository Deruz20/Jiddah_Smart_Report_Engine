/**
 * REPORT OVERLAY POSITIONING SYSTEM
 * 
 * Manages relative coordinates, rotation, opacity, snap guides,
 * and page margin constraints for stamps and signatures across report templates.
 */

export interface OverlayElementState {
  id: 'stamp' | 'head-teacher' | 'class-teacher';
  label: string;
  xPercent: number; // 0% - 100% relative to container width
  yPercent: number; // 0% - 100% relative to container height
  rotation: number; // degrees -45 to +45
  opacity: number;  // 0.1 to 1.0
  scale: number;    // 0.5 to 1.5
  visible: boolean;
}

export interface TemplateOverlays {
  stamp: OverlayElementState;
  headTeacher: OverlayElementState;
  classTeacher: OverlayElementState;
}

export const DEFAULT_OVERLAYS_BY_TEMPLATE: Record<string, TemplateOverlays> = {
  'primary-eot': {
    stamp: {
      id: 'stamp',
      label: 'School Stamp',
      xPercent: 78,
      yPercent: 80,
      rotation: -3,
      opacity: 0.88,
      scale: 1.0,
      visible: true,
    },
    headTeacher: {
      id: 'head-teacher',
      label: 'Head Teacher Signature',
      xPercent: 65,
      yPercent: 85,
      rotation: 0,
      opacity: 0.95,
      scale: 1.0,
      visible: true,
    },
    classTeacher: {
      id: 'class-teacher',
      label: 'Class Teacher Signature',
      xPercent: 24,
      yPercent: 85,
      rotation: 0,
      opacity: 0.95,
      scale: 1.0,
      visible: true,
    },
  },
  'primary-mot': {
    stamp: {
      id: 'stamp',
      label: 'School Stamp',
      xPercent: 68,
      yPercent: 84,
      rotation: -2,
      opacity: 0.88,
      scale: 1.0,
      visible: true,
    },
    headTeacher: {
      id: 'head-teacher',
      label: 'Head Teacher Signature',
      xPercent: 66,
      yPercent: 88,
      rotation: 0,
      opacity: 0.95,
      scale: 1.0,
      visible: true,
    },
    classTeacher: {
      id: 'class-teacher',
      label: 'Class Teacher Signature',
      xPercent: 26,
      yPercent: 88,
      rotation: 0,
      opacity: 0.95,
      scale: 1.0,
      visible: true,
    },
  },
  'primary-bot': {
    stamp: {
      id: 'stamp',
      label: 'School Stamp',
      xPercent: 68,
      yPercent: 84,
      rotation: -2,
      opacity: 0.88,
      scale: 1.0,
      visible: true,
    },
    headTeacher: {
      id: 'head-teacher',
      label: 'Head Teacher Signature',
      xPercent: 66,
      yPercent: 88,
      rotation: 0,
      opacity: 0.95,
      scale: 1.0,
      visible: true,
    },
    classTeacher: {
      id: 'class-teacher',
      label: 'Class Teacher Signature',
      xPercent: 26,
      yPercent: 88,
      rotation: 0,
      opacity: 0.95,
      scale: 1.0,
      visible: true,
    },
  },
  'p7-eot': {
    stamp: {
      id: 'stamp',
      label: 'School Stamp',
      xPercent: 78,
      yPercent: 82,
      rotation: -3,
      opacity: 0.88,
      scale: 1.0,
      visible: true,
    },
    headTeacher: {
      id: 'head-teacher',
      label: 'Head Teacher Signature',
      xPercent: 66,
      yPercent: 86,
      rotation: 0,
      opacity: 0.95,
      scale: 1.0,
      visible: true,
    },
    classTeacher: {
      id: 'class-teacher',
      label: 'Class Teacher Signature',
      xPercent: 24,
      yPercent: 86,
      rotation: 0,
      opacity: 0.95,
      scale: 1.0,
      visible: true,
    },
  },
  'nursery-eot': {
    stamp: {
      id: 'stamp',
      label: 'School Stamp',
      xPercent: 75,
      yPercent: 80,
      rotation: -2,
      opacity: 0.88,
      scale: 1.0,
      visible: true,
    },
    headTeacher: {
      id: 'head-teacher',
      label: 'Head Teacher Signature',
      xPercent: 65,
      yPercent: 85,
      rotation: 0,
      opacity: 0.95,
      scale: 1.0,
      visible: true,
    },
    classTeacher: {
      id: 'class-teacher',
      label: 'Class Teacher Signature',
      xPercent: 24,
      yPercent: 85,
      rotation: 0,
      opacity: 0.95,
      scale: 1.0,
      visible: true,
    },
  },
  'theology-mot': {
    stamp: {
      id: 'stamp',
      label: 'School Stamp',
      xPercent: 65,
      yPercent: 80,
      rotation: -2,
      opacity: 0.88,
      scale: 0.9,
      visible: true,
    },
    headTeacher: {
      id: 'head-teacher',
      label: 'Head Teacher Signature',
      xPercent: 62,
      yPercent: 86,
      rotation: 0,
      opacity: 0.95,
      scale: 0.9,
      visible: true,
    },
    classTeacher: {
      id: 'class-teacher',
      label: 'Class Teacher Signature',
      xPercent: 22,
      yPercent: 86,
      rotation: 0,
      opacity: 0.95,
      scale: 0.9,
      visible: true,
    },
  },
};

export const SNAP_GUIDES = {
  x: [4, 25, 50, 75, 88], // percentage lines (left margin, 1/4, center, 3/4, right margin)
  y: [10, 50, 80, 85, 90], // percentage lines (top, middle, comment block, signature line, footer)
};

/**
 * Snaps coordinate to nearest guide line within tolerance
 */
export function applySnapGuides(
  val: number,
  guides: number[],
  tolerance: number = 1.5
): { snappedVal: number; guideHit: number | null } {
  for (const guide of guides) {
    if (Math.abs(val - guide) <= tolerance) {
      return { snappedVal: guide, guideHit: guide };
    }
  }
  return { snappedVal: val, guideHit: null };
}

/**
 * Clamps coordinates to keep element inside valid page boundaries
 */
export function clampCoordinates(
  xPercent: number,
  yPercent: number,
  maxXPercent: number = 96,
  maxYPercent: number = 96
): { x: number; y: number } {
  return {
    x: Math.max(1, Math.min(maxXPercent, xPercent)),
    y: Math.max(1, Math.min(maxYPercent, yPercent)),
  };
}

/**
 * Nudges coordinate by delta with bounds checking
 */
export function nudgeCoordinate(
  current: number,
  delta: number,
  min: number = 1,
  max: number = 96
): number {
  return Math.max(min, Math.min(max, Math.round((current + delta) * 10) / 10));
}

/**
 * Local storage key for workstation overlay positions
 */
export const OVERLAYS_STORAGE_KEY = 'jiddah_report_overlay_positions';

/**
 * Retrieves overlay positions for template, falling back to defaults
 */
export function getStoredOverlays(templateKey: string): TemplateOverlays {
  const defaults = DEFAULT_OVERLAYS_BY_TEMPLATE[templateKey] || DEFAULT_OVERLAYS_BY_TEMPLATE['primary-eot'];
  if (typeof window === 'undefined') return defaults;
  
  try {
    const raw = localStorage.getItem(OVERLAYS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (parsed && parsed[templateKey]) {
      return {
        stamp: { ...defaults.stamp, ...parsed[templateKey].stamp },
        headTeacher: { ...defaults.headTeacher, ...parsed[templateKey].headTeacher },
        classTeacher: { ...defaults.classTeacher, ...parsed[templateKey].classTeacher },
      };
    }
  } catch (e) {
    console.error('Failed to parse stored overlay positions:', e);
  }
  return defaults;
}

/**
 * Saves overlay positions for a template to local storage
 */
export function saveStoredOverlays(templateKey: string, overlays: TemplateOverlays): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(OVERLAYS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing[templateKey] = overlays;
    localStorage.setItem(OVERLAYS_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save overlay positions:', e);
  }
}
