// Advanced Arabic Transliteration Engine for Ugandan & Islamic Names
// Handles common Islamic names exactly, and uses advanced phonetic rules for local Luganda/Bantu names

const ISLAMIC_NAMES_DICT: Record<string, string> = {
  // Male Names
  'muhammad': 'محمد', 'mohammed': 'محمد', 'muhamad': 'محمد', 'mohamed': 'محمد', 'muhd': 'محمد',
  'ahmad': 'أحمد', 'ahmed': 'أحمد',
  'ali': 'علي', 'aly': 'علي',
  'umar': 'عمر', 'omar': 'عمر',
  'abubakar': 'أبوبكر', 'abubaker': 'أبوبكر', 'abdul': 'عبد', 'abdullah': 'عبد الله', 'abdallah': 'عبد الله',
  'usman': 'عثمان', 'uthman': 'عثمان', 'othman': 'عثمان',
  'ibrahim': 'إبراهيم', 'ebrahim': 'إبراهيم',
  'yusuf': 'يوسف', 'yousuf': 'يوسف', 'yosef': 'يوسف',
  'isa': 'عيسى', 'issa': 'عيسى', 'eisa': 'عيسى',
  'musa': 'موسى', 'mousa': 'موسى', 'mussa': 'موسى',
  'hasan': 'حسن', 'hassan': 'حسن', 'hussein': 'حسين', 'husain': 'حسين',
  'ismail': 'إسماعيل', 'ismael': 'إسماعيل',
  'sulaiman': 'سليمان', 'sulayman': 'سليمان',
  'yahya': 'يحيى',
  'yunus': 'يونس', 'younus': 'يونس',
  'abdirahman': 'عبد الرحمن', 'abdulrahman': 'عبد الرحمن',
  'bilal': 'بلال',
  'hamza': 'حمزة', 'hamzah': 'حمزة',
  'tariq': 'طارق', 'tarik': 'طارق',
  'khalid': 'خالد',
  'malik': 'مالك',
  'muhsin': 'محسن',
  'twaibu': 'طيب', 'twaib': 'طيب', 'twayibu': 'طيب',
  'zaid': 'زيد', 'zayd': 'زيد',
  'yahaya': 'يحيى', 'yahya': 'يحيى',
  'rashid': 'راشد',
  'shaban': 'شعبان', 'shaaban': 'شعبان',
  'ramadhan': 'رمضان', 'ramadan': 'رمضان',
  'kassim': 'قاسم', 'qasim': 'قاسم',
  'bashir': 'بشير', 'beshir': 'بشير',
  'swaleh': 'صالح', 'saleh': 'صالح', 'salih': 'صالح',
  
  // Female Names
  'fatima': 'فاطمة', 'fatimah': 'فاطمة', 'fatuma': 'فاطمة',
  'aisha': 'عائشة', 'aysha': 'عائشة', 'asha': 'عائشة',
  'khadija': 'خديجة', 'khadijah': 'خديجة',
  'zainab': 'زينب', 'zeynab': 'زينب', 'zaynab': 'زينب',
  'mariam': 'مريم', 'maryam': 'مريم',
  'amina': 'آمنة', 'aminah': 'آمنة',
  'ruqayya': 'رقية', 'ruqaiyah': 'رقية',
  'sumayya': 'سمية', 'sumaiyah': 'سمية',
  'halima': 'حليمة', 'halimah': 'حليمة',
  'safiya': 'صفية', 'safiyyah': 'صفية',
  'hafsa': 'حفصة', 'hafsah': 'حفصة',
  'zubeida': 'زبيدة', 'zubaida': 'زبيدة',
  'hawa': 'حواء',
  'nuru': 'نور', 'noor': 'نور',
  'salma': 'سلمى',
  'asmak': 'أسماء', 'asma': 'أسماء',
  'jamila': 'جميلة', 'jamilah': 'جميلة',
  'shadia': 'شادية',
  'amiirah': 'أميرة', 'amira': 'أميرة', 'ameerah': 'أميرة',
  'hakiimah': 'حكيمة', 'hakima': 'حكيمة',
  'nasheem': 'نسيم', 'nashim': 'نسيم',
  'leilah': 'ليلة', 'laila': 'ليلة', 'layla': 'ليلة',
  'kabiirah': 'كبيرة', 'kabira': 'كبيرة',
  'swalha': 'صالحة', 'swaliha': 'صالحة', 'saliha': 'صالحة'
};

const PHONETIC_MAP: Record<string, string> = {
  // Complex Consonants
  'sh': 'ش', 'ch': 'تش', 'th': 'ث', 'dh': 'ذ', 'ph': 'ف', 'kh': 'خ', 'gh': 'غ',
  'ny': 'ني', 'ky': 'كي', 'sy': 'سي', 'by': 'بي', 'gy': 'غي', 'dy': 'دي', 'ty': 'تي',
  'mw': 'مو', 'nw': 'نو', 'kw': 'كو', 'bw': 'بو', 'gw': 'غو', 'dw': 'دو', 'tw': 'تو',
  
  // Single Consonants
  'b': 'ب', 'c': 'ك', 'd': 'د', 'f': 'ف', 'g': 'غ', 'h': 'ه', 'j': 'ج', 
  'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن', 'p': 'ب', 'q': 'ق', 'r': 'ر', 
  's': 'س', 't': 'ت', 'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي', 'z': 'ز',
};

export function transliterateEnglishToArabic(name: string): string {
  if (!name) return '';

  const words = name.toLowerCase().trim().split(/\s+/);
  
  const transliteratedWords = words.map(word => {
    // 1. Dictionary Match for exact Islamic names
    if (ISLAMIC_NAMES_DICT[word]) {
      return ISLAMIC_NAMES_DICT[word];
    }

    // 2. Remove Luganda double consonants (e.g., Ssekandi -> Sekandi, Nnamdi -> Namdi)
    let processedWord = word.replace(/^([b-df-hj-np-tv-z])\1/g, '$1'); 
    
    let result = '';
    let i = 0;
    
    while (i < processedWord.length) {
      const char = processedWord[i];
      const nextChar = processedWord[i + 1] || '';
      const thirdChar = processedWord[i + 2] || '';
      
      // Handle Start of Word Vowels
      if (i === 0 && 'aeiou'.includes(char)) {
        if (char === 'a') result += 'أ';
        else if (char === 'e' || char === 'i') result += 'إ';
        else if (char === 'o' || char === 'u') result += 'أو';
        i++;
        continue;
      }

      // Handle Vowels (Middle and End)
      if ('aeiou'.includes(char)) {
        // Skip consecutive identical vowels (e.g., 'ee' -> 'ي', 'oo' -> 'و')
        if (char === nextChar) {
          if (char === 'a') result += 'ا';
          else if (char === 'e' || char === 'i') result += 'ي';
          else if (char === 'o' || char === 'u') result += 'و';
          i += 2;
          continue;
        }

        // Standard vowel mapping
        if (char === 'a') result += 'ا';
        else if (char === 'e' || char === 'i') result += 'ي';
        else if (char === 'o' || char === 'u') result += 'و';
        i++;
        continue;
      }

      // Check for 2-letter phonemes (sh, ch, ny, etc.)
      const twoLetter = char + nextChar;
      if (PHONETIC_MAP[twoLetter]) {
        result += PHONETIC_MAP[twoLetter];
        i += 2;
        continue;
      }

      // Single Consonant fallback
      result += PHONETIC_MAP[char] || char;
      i++;
    }

    // 3. Post-Processing Cleanup
    // Remove repeated identical Arabic characters (except for specific cases)
    result = result.replace(/(.)\1+/g, '$1');

    // Fix ending 'ي' to look better (some names ending in 'i' or 'y')
    if (result.endsWith('ي') && word.length > 2 && !['i', 'y', 'e'].includes(word[word.length-1])) {
       // if the english word didn't end with a vowel, but somehow we ended with ي, leave it.
    }

    return result;
  });

  return transliteratedWords.join(' ');
}
