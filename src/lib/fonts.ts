import { 
  Montserrat, 
  Inter, 
  Poppins, 
  Roboto, 
  Amiri, 
  Cairo, 
  Tajawal, 
  Almarai, 
  Changa, 
  Kufam 
} from 'next/font/google';

// Primary Interface Fonts
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap', variable: '--font-primary' });
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-primary' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap', variable: '--font-primary' });
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700', '900'], display: 'swap', variable: '--font-primary' });

// Arabic Fonts
const amiri = Amiri({ subsets: ['arabic', 'latin'], weight: ['400', '700'], display: 'swap', variable: '--font-arabic' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], display: 'swap', variable: '--font-arabic' });
const tajawal = Tajawal({ subsets: ['arabic', 'latin'], weight: ['400', '500', '700', '800'], display: 'swap', variable: '--font-arabic' });
const almarai = Almarai({ subsets: ['arabic'], weight: ['400', '700', '800'], display: 'swap', variable: '--font-arabic' });
const changa = Changa({ subsets: ['arabic', 'latin'], display: 'swap', variable: '--font-arabic' });
const kufam = Kufam({ subsets: ['arabic', 'latin'], display: 'swap', variable: '--font-arabic' });

export const primaryFonts: Record<string, any> = {
  'Montserrat': montserrat,
  'Inter': inter,
  'Poppins': poppins,
  'Roboto': roboto,
};

export const arabicFonts: Record<string, any> = {
  'Amiri': amiri,
  'Cairo': cairo,
  'Tajawal': tajawal,
  'Almarai': almarai,
  'Changa': changa,
  'Kufam': kufam,
};

/**
 * Returns the CSS variable classes for the specified primary and arabic fonts.
 * If a font isn't found, it falls back to Montserrat and Amiri respectively.
 */
export function getFontVariables(primaryName?: string, arabicName?: string) {
  const primary = primaryFonts[primaryName || 'Montserrat'] || montserrat;
  const arabic = arabicFonts[arabicName || 'Amiri'] || amiri;
  
  return `${primary.variable} ${arabic.variable}`;
}

/**
 * Returns the CSS class names for the specified primary and arabic fonts.
 */
export function getFontClassNames(primaryName?: string, arabicName?: string) {
  const primary = primaryFonts[primaryName || 'Montserrat'] || montserrat;
  const arabic = arabicFonts[arabicName || 'Amiri'] || amiri;
  
  return `${primary.className} ${arabic.className}`;
}
