export interface FontDefinition {
  name: string;
  variable: string;
  className: string;
  style: {
    fontFamily: string;
  };
}

const createFontDef = (
  name: string,
  role: 'primary' | 'arabic',
  fontFamily: string
): FontDefinition => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    name,
    variable: `font-var-${slug}`,
    className: `font-${role}-${slug}`,
    style: { fontFamily },
  };
};

// Primary Interface Fonts
const montserrat = createFontDef(
  'Montserrat',
  'primary',
  "'Montserrat', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
);
const inter = createFontDef(
  'Inter',
  'primary',
  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
);
const poppins = createFontDef(
  'Poppins',
  'primary',
  "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
);
const roboto = createFontDef(
  'Roboto',
  'primary',
  "'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
);

// Arabic Fonts
const amiri = createFontDef('Amiri', 'arabic', "'Amiri', 'Cairo', serif");
const cairo = createFontDef('Cairo', 'arabic', "'Cairo', 'Amiri', sans-serif");
const tajawal = createFontDef('Tajawal', 'arabic', "'Tajawal', 'Cairo', sans-serif");
const almarai = createFontDef('Almarai', 'arabic', "'Almarai', 'Cairo', sans-serif");
const changa = createFontDef('Changa', 'arabic', "'Changa', 'Cairo', sans-serif");
const kufam = createFontDef('Kufam', 'arabic', "'Kufam', 'Amiri', serif");

export const primaryFonts: Record<string, FontDefinition> = {
  'Montserrat': montserrat,
  'Inter': inter,
  'Poppins': poppins,
  'Roboto': roboto,
};

export const arabicFonts: Record<string, FontDefinition> = {
  'Amiri': amiri,
  'Cairo': cairo,
  'Tajawal': tajawal,
  'Almarai': almarai,
  'Changa': changa,
  'Kufam': kufam,
};

function resolveFontPair(primaryName?: string, arabicName?: string) {
  const primary = (primaryName && primaryFonts[primaryName]) || montserrat;
  const arabic = (arabicName && arabicFonts[arabicName]) || amiri;
  return { primary, arabic };
}

/**
 * Returns the CSS variable classes for the specified primary and arabic fonts.
 * If a font isn't found, it falls back to Montserrat and Amiri respectively.
 */
export function getFontVariables(primaryName?: string, arabicName?: string) {
  const { primary, arabic } = resolveFontPair(primaryName, arabicName);
  return `${primary.variable} ${arabic.variable}`;
}

/**
 * Returns inline CSS custom properties (`--font-primary`, `--font-arabic`)
 * so report containers resolve selected fonts without compile-time `next/font/google` fetches.
 */
export function getFontCssVars(primaryName?: string, arabicName?: string): Record<string, string> {
  const { primary, arabic } = resolveFontPair(primaryName, arabicName);
  return {
    '--font-primary': primary.style.fontFamily,
    '--font-arabic': arabic.style.fontFamily,
  };
}

/**
 * Returns the CSS class names for the specified primary and arabic fonts.
 */
export function getFontClassNames(primaryName?: string, arabicName?: string) {
  const { primary, arabic } = resolveFontPair(primaryName, arabicName);
  return `${primary.className} ${arabic.className}`;
}
