export type ThemePreset = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  border: string;
};

export const themePresets: Record<string, ThemePreset> = {
  'emerald-gold': {
    primary: '#0f4d25',
    secondary: '#c2994c',
    background: '#fdfaf3',
    surface: '#ffffff',
    text: '#1a1a1a',
    border: '#c2994c',
  },
  'navy-silver': {
    primary: '#1e3a8a',
    secondary: '#94a3b8',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    border: '#94a3b8',
  },
  'maroon-cream': {
    primary: '#7f1d1d',
    secondary: '#d4a373',
    background: '#fef3c7',
    surface: '#ffffff',
    text: '#451a03',
    border: '#d4a373',
  },
  'charcoal-teal': {
    primary: '#0f766e',
    secondary: '#475569',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    border: '#475569',
  }
};

export function getThemeColors(presetName?: string): ThemePreset {
  return themePresets[presetName || 'emerald-gold'] || themePresets['emerald-gold'];
}
