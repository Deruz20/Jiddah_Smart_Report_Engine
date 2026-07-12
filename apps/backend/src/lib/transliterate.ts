export function transliterateEnglishToArabic(name: string): string {
  if (!name) return ''

  // Basic map of English phonemes to Arabic letters
  const map: Record<string, string> = {
    'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي', 'f': 'ف',
    'g': 'ج', 'h': 'ه', 'i': 'ي', 'j': 'ج', 'k': 'ك', 'l': 'ل',
    'm': 'م', 'n': 'ن', 'o': 'و', 'p': 'ب', 'q': 'ك', 'r': 'ر',
    's': 'س', 't': 'ت', 'u': 'و', 'v': 'ف', 'w': 'و', 'x': 'كس',
    'y': 'ي', 'z': 'ز',
    'th': 'ث', 'sh': 'ش', 'ch': 'تش', 'ph': 'ف', 'kh': 'خ', 'gh': 'غ'
  }

  const words = name.toLowerCase().trim().split(/\s+/)
  
  const transliteratedWords = words.map(word => {
    let result = ''
    let i = 0
    while (i < word.length) {
      if (i < word.length - 1 && map[word.slice(i, i + 2)]) {
        result += map[word.slice(i, i + 2)]
        i += 2
      } else {
        result += map[word[i]] || word[i]
        i++
      }
    }
    // Simple cleanup: remove consecutive duplicate characters in Arabic (unless intended)
    // and adjust common name endings if needed
    return result.replace(/(.)\1+/g, '$1') // remove basic duplicates
  })

  return transliteratedWords.join(' ')
}
