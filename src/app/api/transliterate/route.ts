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

    try {
      // Attempt 1: OpenAI
      const prompt = `Transliterate the following Ugandan/Arabic names from English to Arabic. Provide ONLY a JSON array of strings in the exact same order. Do NOT include markdown or explanations. Names: ${JSON.stringify(names)}`;
      
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        })
      });

      if (openaiRes.ok) {
        const data = await openaiRes.json();
        const content = data.choices[0].message.content.trim();
        let result = [];
        try {
          result = JSON.parse(content);
          if (Array.isArray(result) && result.length === names.length) {
            return NextResponse.json({ transliterated: result });
          }
        } catch (e) {
          console.error("Failed to parse OpenAI response", content);
        }
      }
    } catch (error) {
      console.error("OpenAI failed", error);
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
