// Advanced Arabic Transliteration Engine for Ugandan & Islamic Names
// Handles common Islamic names exactly, and uses advanced phonetic rules for local Luganda/Bantu names
const ISLAMIC_NAMES_DICT = {
    // Canonical Male Names
    'muhammad': 'محمد',
    'ahmad': 'أحمد',
    'ali': 'علي',
    'umar': 'عمر',
    'abubakar': 'أبوبكر',
    'usman': 'عثمان',
    'ibrahim': 'إبراهيم',
    'yusuf': 'يوسف',
    'isa': 'عيسى',
    'musa': 'موسى',
    'hasan': 'حسن',
    'hussein': 'حسين',
    'ismail': 'إسماعيل',
    'sulaiman': 'سليمان',
    'yahya': 'يحيى',
    'yunus': 'يونس',
    'abdulrahman': 'عبد الرحمن',
    'bilal': 'بلال',
    'hamza': 'حمزة',
    'tariq': 'طارق',
    'khalid': 'خالد',
    'imran': 'عمران',
    'shuraim': 'شريم',
    'faham': 'فهم',
    'arham': 'أرحم',
    'malik': 'مالك',
    'muhsin': 'محسن',
    'twaibu': 'طيب',
    'zaid': 'زيد',
    'rashid': 'راشد',
    'shaban': 'شعبان',
    'ramadhan': 'رمضان',
    'kassim': 'قاسم',
    'bashir': 'بشير',
    'swaleh': 'صالح',
    // Canonical Female Names
    'fatima': 'فاطمة',
    'aisha': 'عائشة',
    'khadija': 'خديجة',
    'zainab': 'زينب',
    'mariam': 'مريم',
    'amina': 'آمنة',
    'ruqayya': 'رقية',
    'sumayyah': 'سمية',
    'halima': 'حليمة',
    'safiya': 'صفية',
    'hafsa': 'حفصة',
    'zubeida': 'زبيدة',
    'hawa': 'حواء',
    'nuru': 'نور',
    'salma': 'سلمى',
    'asma': 'أسماء',
    'jamila': 'جميلة',
    'shadia': 'شادية',
    'amiirah': 'أميرة',
    'hakiimah': 'حكيمة',
    'sameeha': 'سميحة',
    'rahmah': 'رحمة',
    'maysarat': 'ميسرة',
    'shukran': 'شكران',
    'nasheem': 'نسيم',
    'leilah': 'ليلى',
    'kabiirah': 'كبيرة',
    'swalha': 'صالحة',
    'taubah': 'توبة',
    'daliirah': 'دليرة',
};
const ISLAMIC_KEYS = Object.keys(ISLAMIC_NAMES_DICT);
const PHONETIC_MAP = {
    // Complex Consonants
    'sh': 'ش', 'ch': 'تش', 'th': 'ث', 'dh': 'ذ', 'ph': 'ف', 'kh': 'خ', 'gh': 'غ',
    'ny': 'ني', 'ky': 'كي', 'sy': 'سي', 'by': 'بي', 'gy': 'غي', 'dy': 'دي', 'ty': 'تي',
    'mw': 'مو', 'nw': 'نو', 'kw': 'كو', 'bw': 'بو', 'gw': 'غو', 'dw': 'دو', 'tw': 'تو',
    // Single Consonants
    'b': 'ب', 'c': 'ك', 'd': 'د', 'f': 'ف', 'g': 'غ', 'h': 'ه', 'j': 'ج',
    'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن', 'p': 'ب', 'q': 'ق', 'r': 'ر',
    's': 'س', 't': 'ت', 'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي', 'z': 'ز',
};
export function transliterateEnglishToArabic(name) {
    if (!name)
        return '';
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
                }
                else if (char === nextChar) {
                    // Double English vowel (ee, oo) -> Long Arabic vowel
                    if (char === 'e' || char === 'i')
                        result += 'ي';
                    else if (char === 'o' || char === 'u')
                        result += 'و';
                    else if (char === 'a')
                        result += 'ا';
                    i++; // Skip the second vowel
                }
                else {
                    // Explicitly map short vowels in Bantu names so the syllable structure is readable
                    if (char === 'a')
                        result += 'ا';
                    if (char === 'i' || char === 'e')
                        result += 'ي';
                    if (char === 'o' || char === 'u')
                        result += 'و';
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
