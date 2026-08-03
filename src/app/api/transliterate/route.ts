import { NextResponse } from 'next/server';

// 1. COMPREHENSIVE CANONICAL DICTIONARY (Tier 1)
const ISLAMIC_NAMES_DICT: Record<string, string> = {
  // Canonical & Ugandan Variations Male
  'muhammad': 'محمد', 'mohammed': 'محمد', 'muhammed': 'محمد', 'mohammad': 'محمد', 'musa': 'موسى', 'musaa': 'موسى',
  'ahmad': 'أحمد', 'ahmed': 'أحمد', 'ali': 'علي', 'aliyu': 'علي', 'umar': 'عمر', 'umaru': 'عمر',
  'abubakar': 'أبوبكر', 'abuubakar': 'أبوبكر', 'usman': 'عثمان', 'uthman': 'عثمان', 'usmanu': 'عثمان',
  'ibrahim': 'إبراهيم', 'ibrahiim': 'إبراهيم', 'yusuf': 'يوسف', 'yusufu': 'يوسف', 'isa': 'عيسى', 'isaa': 'عيسى',
  'hasan': 'حسن', 'hassan': 'حسن', 'hussein': 'حسين', 'husein': 'حسين', 'ismail': 'إسماعيل', 'ismaila': 'إسماعيل',
  'sulaiman': 'سليمان', 'sulayman': 'سليمان', 'yahya': 'يحيى', 'yahaya': 'يحيى', 'yunus': 'يونس', 'yunusu': 'يونس',
  'abdulrahman': 'عبد الرحمن', 'abdurahman': 'عبد الرحمن', 'abdul': 'عبد', 'abdullah': 'عبد الله',
  'bilal': 'بلال', 'hamza': 'حمزة', 'tariq': 'طارق', 'khalid': 'خالد', 'imran': 'عمران',
  'shuraim': 'شريم', 'faham': 'فهم', 'arham': 'أرحم', 'malik': 'مالك', 'muhsin': 'محسن',
  'twaibu': 'طيب', 'zaid': 'زيد', 'zaidi': 'زيد', 'rashid': 'راشد', 'shaban': 'شعبان', 'shaaban': 'شعبان', 
  'ramadhan': 'رمضان', 'ramadan': 'رمضان', 'kassim': 'قاسم', 'bashir': 'بشير', 'swaleh': 'صالح', 'twaha': 'طه',
  'lukman': 'لقمان', 'luqman': 'لقمان', 'ishaq': 'إسحاق', 'is-haq': 'إسحاق', 'nuhu': 'نوح', 'rajab': 'رجب',
  'murshid': 'مرشد', 'mursheed': 'مرشد', 'muzamil': 'مزمل', 'muzammil': 'مزمل', 'muzamiru': 'مزمل',
  'mudathir': 'مدثر', 'mudasiru': 'مدثر',
  
  // Canonical & Ugandan Variations Female
  'fatima': 'فاطمة', 'fatiimah': 'فاطمة', 'fatuma': 'فاطمة', 'aisha': 'عائشة', 'aishah': 'عائشة', 'ayisha': 'عائشة',
  'khadija': 'خديجة', 'khadijah': 'خديجة', 'zainab': 'زينب', 'zainabu': 'زينب', 'mariam': 'مريم', 'mariamu': 'مريم',
  'amina': 'آمنة', 'aminah': 'آمنة', 'ruqayya': 'رقية', 'ruqayyah': 'رقية', 'sumayyah': 'سمية', 'sumayya': 'سمية',
  'halima': 'حليمة', 'halimah': 'حليمة', 'safiya': 'صفية', 'safiyyah': 'صفية', 'hafsa': 'حفصة', 'hafsah': 'حفصة',
  'zubeida': 'زبيدة', 'zubaidah': 'زبيدة', 'hawa': 'حواء', 'nuru': 'نور', 'salma': 'سلمى', 'asma': 'أسماء',
  'jamila': 'جميلة', 'shadia': 'شادية', 'amiirah': 'أميرة', 'hakiimah': 'حكيمة', 'sameeha': 'سميحة', 
  'rahmah': 'رحمة', 'maysarat': 'ميسرة', 'shukran': 'شكران', 'nasheem': 'نسيم', 'leilah': 'ليلى', 
  'kabiirah': 'كبيرة', 'swalha': 'صالحة', 'taubah': 'توبة', 'daliirah': 'دليرة', 'madiina': 'مدينة', 
  'madina': 'مدينة', 'swabrah': 'صابرة', 'swabura': 'صابرة', 'kautharah': 'كوثرة', 'shirat': 'شيرات',
  'shifah': 'شفاء', 'nassazi': 'ناسازي', 'shafik': 'شفيق', 'hafswa': 'حفصة', 'shafah': 'شفاء', 'bakar': 'بكر',
  'rayan': 'ريان', 'shukurah': 'شكورة', 'sumaiyah': 'سمية', 'hanifah': 'حنيفة', 'hakimah': 'حكيمة',
  'latif': 'لطيف', 'latifah': 'لطيفة', 'habib': 'حبيب', 'habibah': 'حبيبة', 'swaburah': 'صابرة',
  'anwar': 'أنوار', 'iman': 'إيمان', 'nazifah': 'نظيفة', 'mubarak': 'مبارك', 'harun': 'هارون', 'idris': 'إدريس'
};

// 2. PHONETIC COMPONENT MAP
const PHONETIC_MAP: Record<string, string> = {
  'sh': 'ش', 'ch': 'تش', 'th': 'ث', 'dh': 'ذ', 'ph': 'ف', 'kh': 'خ', 'gh': 'غ',
  'ny': 'ني', 'ky': 'كي', 'sy': 'سي', 'by': 'بي', 'gy': 'غي', 'dy': 'دي', 'ty': 'تي',
  'mw': 'مو', 'nw': 'نو', 'kw': 'كو', 'bw': 'بو', 'gw': 'غو', 'dw': 'دو', 'tw': 'تو',
  'b': 'ب', 'c': 'ك', 'd': 'د', 'f': 'ف', 'g': 'غ', 'h': 'ه', 'j': 'ج', 
  'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن', 'p': 'ب', 'q': 'ق', 'r': 'ر', 
  's': 'س', 't': 'ت', 'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي', 'z': 'ز'
};

// Global in-memory cache to optimize execution speed across requests
const TOKEN_CACHE = new Map<string, string>();

// 3. ADVANCED BANTU & UGANDAN PHONETIC ENGINE (Tier 2)
function transliterateTokenByPhonetics(word: string): string {
  if (TOKEN_CACHE.has(word)) return TOKEN_CACHE.get(word)!;

  // Rule A: Collapse sequential identical consonants anywhere in the string (e.g., Sse-, Nna-, Gg-, -ss-, -ll-)
  let processedWord = word.replace(/([b-df-hj-np-tv-z])\1+/g, '$1'); 
  
  // Rule B: Intercept standard feminine English/Bantu suffixes cleanly
  let endsWithAh = false;
  if (processedWord.endsWith('ah') && processedWord.length > 3) {
    endsWithAh = true;
    processedWord = processedWord.slice(0, -2);
  }

  let result = '';
  let i = 0;
  
  while (i < processedWord.length) {
    const char = processedWord[i];
    const nextChar = processedWord[i + 1] || '';
    
    // Check Complex Digraphs first
    const twoLetter = char + nextChar;
    if (PHONETIC_MAP[twoLetter]) {
      result += PHONETIC_MAP[twoLetter];
      i += 2;
      continue;
    }

    // Process Vowels & Local Diphthongs
    if ('aeiou'.includes(char)) {
      if (i === 0) {
        // Handle Word-Initial Vowels safely for Bantu languages
        if (char === 'a') result += 'أ';
        else if (char === 'o' || char === 'u') result += 'أو';
        else result += 'إ';
      } else if (char === 'a' && nextChar === 'u') {
        result += 'و'; // Resolve "au" diphthong seamlessly (e.g., Kautharah)
        i++;
      } else if (char === 'e' && nextChar === 'i') {
        result += 'ي'; // Resolve "ei" diphthong seamlessly (e.g., Mbeiza)
        i++;
      } else if (char === nextChar) {
        // Double vowels (ee, oo, aa)
        if (char === 'e' || char === 'i') result += 'ي';
        else if (char === 'o' || char === 'u') result += 'و';
        else if (char === 'a') result += 'ا';
        i++; 
      } else {
        // Singular embedded vowels
        if (char === 'a') result += 'ا';
        if (char === 'i' || char === 'e') result += 'ي';
        if (char === 'o' || char === 'u') result += 'و';
      }
      i++;
      continue;
    }

    // Map regular single consonants
    result += PHONETIC_MAP[char] || char;
    i++;
  }

  // Restore feminine ending structures cleanly
  if (endsWithAh) {
    result += 'ة';
  }

  TOKEN_CACHE.set(word, result);
  return result;
}

// 4. MAIN ROUTE HANDLER WITH FAIL-SAFE DESIGN
export async function POST(request: Request) {
  try {
    const { names } = await request.json();
    if (!names || !Array.isArray(names)) {
      return NextResponse.json({ error: 'Valid array of names is required.' }, { status: 400 });
    }

    const transliterated = names.map(name => {
        // Tokenize full text input cleanly by spaces
        const tokens = name.toLowerCase().trim().split(/\s+/);
        
        const transliteratedTokens = tokens.map((token: string) => {
          // Step 1: Explicit Dictionary Check
          if (ISLAMIC_NAMES_DICT[token]) {
            return ISLAMIC_NAMES_DICT[token];
          }
          // Step 2 & 3 Fallback: Run Advanced Local Algorithmic Phonetics
          return transliterateTokenByPhonetics(token);
        });
    
        return transliteratedTokens.join(' ');
    });

    return NextResponse.json({ transliterated });

  } catch (error) {
    console.error('Transliteration System Failure:', error);
    return NextResponse.json({ error: 'Internal system recovery error occurred.' }, { status: 500 });
  }
}
