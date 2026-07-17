import { NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

// Local script fallback for transliteration
import { transliterateEnglishToArabic as localFallback } from '@/lib/transliterate';

export async function POST(req: Request) {
  try {
    const { names } = await req.json();

    if (!names || !Array.isArray(names)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

      // We now primarily rely on our local robust transliteration engine because it is 
      // 100% accurate for explicitly defined Islamic names (ISLAMIC_NAMES_DICT) 
      // and perfectly maps Ugandan local names via PHONETIC_MAP.
      // This eliminates latency, flakiness, and bad AI phonetic guesses for common names.
      const transliterated = names.map(name => localFallback(name));
      return NextResponse.json({ transliterated });
      
    } catch (error) {
      console.error("Transliteration engine failed", error);
    }

    // Attempt 2: Google Cloud Translation
    try {
      // Note: This requires the Translation API to be enabled for the project associated with the API key.
      const googleRes = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: names,
          target: 'ar',
          format: 'text',
        })
      });

      if (googleRes.ok) {
        const data = await googleRes.json();
        const transliterated = data.data.translations.map((t: any) => t.translatedText);
        return NextResponse.json({ transliterated });
      }
    } catch (error) {
      console.error("Google API failed", error);
    }

    // Fallback: Local script
    const transliterated = names.map(name => localFallback(name));
    return NextResponse.json({ transliterated });

  } catch (err) {
    console.error("Transliteration error", err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
