
// Advanced Arabic Transliteration Engine for Ugandan & Islamic Names
// Handles common Islamic names exactly, and uses advanced phonetic rules for local Luganda/Bantu names

const ISLAMIC_NAMES_DICT: Record<string, string> = {
  // Canonical & Ugandan Variations Male
  'muhammad': 'محمد', 'mohammed': 'محمد', 'muhammed': 'محمد', 'mohammad': 'محمد', 'musa': 'موسى', 'musaa': 'موسى',
  'ahmad': 'أحمد', 'ahmed': 'أحمد',
  'ali': 'علي', 'aliyu': 'علي',
  'umar': 'عمر', 'umaru': 'عمر',
  'abubakar': 'أبوبكر', 'abuubakar': 'أبوبكر',
  'usman': 'عثمان', 'uthman': 'عثمان', 'usmanu': 'عثمان',
  'ibrahim': 'إبراهيم', 'ibrahiim': 'إبراهيم',
  'yusuf': 'يوسف', 'yusufu': 'يوسف',
  'isa': 'عيسى', 'isaa': 'عيسى',
  'hasan': 'حسن', 'hassan': 'حسن',
  'hussein': 'حسين', 'husein': 'حسين',
  'ismail': 'إسماعيل', 'ismaila': 'إسماعيل',
  'sulaiman': 'سليمان', 'sulayman': 'سليمان',
  'yahya': 'يحيى', 'yahaya': 'يحيى',
  'yunus': 'يونس', 'yunusu': 'يونس',
  'abdulrahman': 'عبد الرحمن', 'abdurahman': 'عبد الرحمن', 'abdul': 'عبد', 'abdullah': 'عبد الله',
  'bilal': 'بلال', 'hamza': 'حمزة', 'tariq': 'طارق', 'khalid': 'خالد', 'imran': 'عمران',
  'shuraim': 'شريم', 'faham': 'فهم', 'arham': 'أرحم', 'malik': 'مالك', 'muhsin': 'محسن',
  'twaibu': 'طيب', 'zaid': 'زيد', 'zaidi': 'زيد',
  'rashid': 'راشد', 'shaban': 'شعبان', 'shaaban': 'شعبان', 'ramadhan': 'رمضان', 'ramadan': 'رمضان',
  'kassim': 'قاسم', 'bashir': 'بشير', 'swaleh': 'صالح', 'twaha': 'طه',
  'lukman': 'لقمان', 'luqman': 'لقمان', 'ishaq': 'إسحاق', 'is-haq': 'إسحاق', 'nuhu': 'نوح', 'rajab': 'رجب',
  'murshid': 'مرشد', 'mursheed': 'مرشد', 'muzamil': 'مزمل', 'muzammil': 'مزمل', 'muzamiru': 'مزمل',
  'mudathir': 'مدثر', 'mudasiru': 'مدثر',
  
  // Canonical & Ugandan Variations Female
  'fatima': 'فاطمة', 'fatiimah': 'فاطمة', 'fatuma': 'فاطمة',
  'aisha': 'عائشة', 'aishah': 'عائشة', 'ayisha': 'عائشة',
  'khadija': 'خديجة', 'khadijah': 'خديجة',
  'zainab': 'زينب', 'zainabu': 'زينب',
  'mariam': 'مريم', 'mariamu': 'مريم',
  'amina': 'آمنة', 'aminah': 'آمنة',
  'ruqayya': 'رقية', 'ruqayyah': 'رقية',
  'sumayyah': 'سمية', 'sumayya': 'سمية',
  'halima': 'حليمة', 'halimah': 'حليمة',
  'safiya': 'صفية', 'safiyyah': 'صفية',
  'hafsa': 'حفصة', 'hafsah': 'حفصة',
  'zubeida': 'زبيدة', 'zubaidah': 'زبيدة',
  'hawa': 'حواء', 'nuru': 'نور', 'salma': 'سلمى', 'asma': 'أسماء',
  'jamila': 'جميلة', 'shadia': 'شادية', 'amiirah': 'أميرة', 'hakiimah': 'حكيمة',
  'sameeha': 'سميحة', 'rahmah': 'رحمة', 'maysarat': 'ميسرة', 'shukran': 'شكران',
  'nasheem': 'نسيم', 'leilah': 'ليلى', 'kabiirah': 'كبيرة', 'swalha': 'صالحة',
  'taubah': 'توبة', 'daliirah': 'دليرة',
  'madiina': 'مدينة', 'madina': 'مدينة', 'swabrah': 'صابرة', 'swabura': 'صابرة',
};

const ISLAMIC_KEYS = Object.keys(ISLAMIC_NAMES_DICT);

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
    // 1. EXACT DICTIONARY MATCH ONLY (No fuzzy matching)
    if (ISLAMIC_NAMES_DICT[word]) {
      return ISLAMIC_NAMES_DICT[word];
    }

    // 2. LUGANDA PHONETICS: Strip leading double consonants (Sse-, Nna-)
    let processedWord = word.replace(/^([b-df-hj-np-tv-z])\1/g, '$1'); 
    
    let result = '';
    let i = 0;
    
    while (i < processedWord.length) {
      const char = processedWord[i];
      const nextChar = processedWord[i + 1] || '';
      
      // Handle Digraphs first (sh, ch, ny)
      const twoLetter = char + nextChar;
      if (PHONETIC_MAP[twoLetter]) {
        result += PHONETIC_MAP[twoLetter];
        i += 2;
        continue;
      }

      // Handle Vowels (Preserve short and long vowels for readable local names)
      if ('aeiou'.includes(char)) {
        if (i === 0) {
          // Word starts with a vowel
          result += char === 'a' ? 'أ' : 'إ';
        } else if (char === nextChar) {
          // Double English vowel (ee, oo) -> Long Arabic vowel
          if (char === 'e' || char === 'i') result += 'ي';
          else if (char === 'o' || char === 'u') result += 'و';
          else if (char === 'a') result += 'ا';
          i++; // Skip the second vowel
        } else {
          // Explicitly map short vowels in Bantu names so the syllable structure is readable
          if (char === 'a') result += 'ا';
          if (char === 'i' || char === 'e') result += 'ي';
          if (char === 'o' || char === 'u') result += 'و';
        }
        i++;
        continue;
      }

      // Single Consonant
      result += PHONETIC_MAP[char] || char;
      i++;
    }

    return result;
  });

  return transliteratedWords.join(' ');
}
