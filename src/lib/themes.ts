export type ThemePreset = {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  border: string
}

export const themePresets: Record<string, ThemePreset> = {
  'jiddah-classic': {
    primary: '#14532D',
    secondary: '#C59B27',
    background: '#FAF6EE',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    border: '#C59B27',
  },
  'royal-emerald': {
    primary: '#0D5C3A',
    secondary: '#10B981',
    background: '#F0FDF4',
    surface: '#FFFFFF',
    text: '#064E3B',
    border: '#059669',
  },
  'imperial-navy': {
    primary: '#1E3A8A',
    secondary: '#D97706',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    border: '#3B82F6',
  },
  'burgundy-heritage': {
    primary: '#7F1D1D',
    secondary: '#B45309',
    background: '#FEF2F2',
    surface: '#FFFFFF',
    text: '#450A0A',
    border: '#991B1B',
  },
  'monochrome': {
    primary: '#18181B',
    secondary: '#71717A',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#09090B',
    border: '#A1A1AA',
  },
  // Legacy aliases
  'emerald-gold': {
    primary: '#14532D',
    secondary: '#C59B27',
    background: '#FAF6EE',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    border: '#C59B27',
  },
  'navy-silver': {
    primary: '#1E3A8A',
    secondary: '#94A3B8',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    border: '#94A3B8',
  },
  'maroon-cream': {
    primary: '#7F1D1D',
    secondary: '#D4A373',
    background: '#FEF3C7',
    surface: '#FFFFFF',
    text: '#451A03',
    border: '#D4A373',
  },
  'charcoal-teal': {
    primary: '#0F766E',
    secondary: '#475569',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    border: '#475569',
  },
}

export function getThemeColors(presetName?: string): ThemePreset {
  return themePresets[presetName || 'jiddah-classic'] || themePresets['jiddah-classic']
}
