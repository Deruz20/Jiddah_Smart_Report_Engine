export interface FontDefinition {
  name: string
  variable: string
  className: string
  style: {
    fontFamily: string
  }
}

const createFontDef = (
  name: string,
  role: 'primary' | 'arabic',
  fontFamily: string
): FontDefinition => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return {
    name,
    variable: `font-var-${slug}`,
    className: `font-${role}-${slug}`,
    style: { fontFamily },
  }
}

// Primary Interface Fonts
const defaultAcademic = createFontDef(
  'Default Academic (Plus Jakarta)',
  'primary',
  "'Plus Jakarta Sans', 'Montserrat', system-ui, -apple-system, sans-serif"
)
const interSans = createFontDef(
  'Inter (Modern Sans)',
  'primary',
  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
)
const merriweatherSerif = createFontDef(
  'Merriweather (Academic Serif)',
  'primary',
  "'Merriweather', Georgia, serif"
)
const timesSerif = createFontDef(
  'Times Serif',
  'primary',
  "'Times New Roman', Times, Georgia, serif"
)
const cinzelPrestige = createFontDef(
  'Cinzel (Institutional Prestige)',
  'primary',
  "'Cinzel', Georgia, serif"
)
const loraSerif = createFontDef(
  'Lora (Calligraphic Serif)',
  'primary',
  "'Lora', Georgia, serif"
)
const jetbrainsMono = createFontDef(
  'JetBrains Mono (Tabular)',
  'primary',
  "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
)
const montserrat = createFontDef(
  'Montserrat',
  'primary',
  "'Montserrat', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
)
const inter = createFontDef(
  'Inter',
  'primary',
  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
)
const poppins = createFontDef(
  'Poppins',
  'primary',
  "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
)
const roboto = createFontDef(
  'Roboto',
  'primary',
  "'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
)

// Arabic Fonts
const amiri = createFontDef(
  'Default Quranic Naskh (Amiri)',
  'arabic',
  "'Amiri', 'Noto Naskh Arabic', serif"
)
const amiriArabic = createFontDef('Amiri Arabic', 'arabic', "'Amiri', 'Noto Naskh Arabic', serif")
const cairo = createFontDef('Cairo (Modern Geometric Arabic)', 'arabic', "'Cairo', 'Amiri', sans-serif")
const tajawal = createFontDef('Tajawal (Clean Contemporary Arabic)', 'arabic', "'Tajawal', 'Cairo', sans-serif")
const notoNaskh = createFontDef('Noto Naskh Arabic (Classic Academic)', 'arabic', "'Noto Naskh Arabic', 'Amiri', serif")
const scheherazade = createFontDef('Scheherazade New (Traditional Calligraphic)', 'arabic', "'Scheherazade New', 'Amiri', serif")
const almarai = createFontDef('Almarai (Crisp Arabic Print)', 'arabic', "'Almarai', 'Cairo', sans-serif")
const changa = createFontDef('Changa', 'arabic', "'Changa', 'Cairo', sans-serif")
const kufam = createFontDef('Kufam', 'arabic', "'Kufam', 'Amiri', serif")

export const ENGLISH_FONT_OPTIONS: FontDefinition[] = [
  defaultAcademic,
  interSans,
  merriweatherSerif,
  cinzelPrestige,
  loraSerif,
  jetbrainsMono,
]

export const ARABIC_FONT_OPTIONS: FontDefinition[] = [
  amiri,
  cairo,
  tajawal,
  notoNaskh,
  scheherazade,
  almarai,
]

export const primaryFonts: Record<string, FontDefinition> = {
  'Default Academic': defaultAcademic,
  'Default Academic (Plus Jakarta)': defaultAcademic,
  default: defaultAcademic,
  'Inter Sans': interSans,
  'Inter (Modern Sans)': interSans,
  'Merriweather (Academic Serif)': merriweatherSerif,
  'Times Serif': timesSerif,
  'Cinzel Prestige': cinzelPrestige,
  'Cinzel (Institutional Prestige)': cinzelPrestige,
  'Lora (Calligraphic Serif)': loraSerif,
  'JetBrains Mono (Tabular)': jetbrainsMono,
  'Amiri Arabic': amiriArabic,
  Montserrat: montserrat,
  Inter: inter,
  Poppins: poppins,
  Roboto: roboto,
}

export const arabicFonts: Record<string, FontDefinition> = {
  Amiri: amiri,
  'Default Quranic Naskh (Amiri)': amiri,
  'Amiri Arabic': amiriArabic,
  Cairo: cairo,
  'Cairo (Modern Geometric Arabic)': cairo,
  Tajawal: tajawal,
  'Tajawal (Clean Contemporary Arabic)': tajawal,
  'Noto Naskh Arabic (Classic Academic)': notoNaskh,
  'Scheherazade New (Traditional Calligraphic)': scheherazade,
  Almarai: almarai,
  'Almarai (Crisp Arabic Print)': almarai,
  Changa: changa,
  Kufam: kufam,
}

function resolveFontPair(primaryName?: string, arabicName?: string) {
  const primary = (primaryName && primaryFonts[primaryName]) || defaultAcademic
  const arabic = (arabicName && arabicFonts[arabicName]) || amiri
  return { primary, arabic }
}

/**
 * Returns the CSS variable classes for the specified primary and arabic fonts.
 * If a font isn't found, it falls back to Default Academic and Amiri respectively.
 */
export function getFontVariables(primaryName?: string, arabicName?: string) {
  const { primary, arabic } = resolveFontPair(primaryName, arabicName)
  return `${primary.variable} ${arabic.variable}`
}

/**
 * Returns inline CSS custom properties (`--font-primary`, `--font-arabic`)
 * so report containers resolve selected fonts without compile-time `next/font/google` fetches.
 */
export function getFontCssVars(primaryName?: string, arabicName?: string): Record<string, string> {
  const { primary, arabic } = resolveFontPair(primaryName, arabicName)
  return {
    '--font-primary': primary.style.fontFamily,
    '--font-arabic': arabic.style.fontFamily,
  }
}

/**
 * Returns the CSS class names for the specified primary and arabic fonts.
 */
export function getFontClassNames(primaryName?: string, arabicName?: string) {
  const { primary, arabic } = resolveFontPair(primaryName, arabicName)
  return `${primary.className} ${arabic.className}`
}
