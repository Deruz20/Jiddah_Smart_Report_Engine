// @ts-nocheck
import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { names } = await request.json();
    if (!names || !Array.isArray(names)) {
      return NextResponse.json({ error: 'Valid array of names is required.' }, { status: 400 });
    }

    // Initialize Gemini Client
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
       console.error("No Gemini API Key found in environment.");
       return NextResponse.json({ error: 'AI Transliteration is not configured (missing API key).' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert in Islamic and Ugandan phonetic name transliteration.
Please transliterate the following list of English names into Arabic script.
Rules:
1. Use standard Islamic/Arabic spellings for known Muslim names (e.g., "Khadija" -> "خديجة", "Ismail" -> "إسماعيل").
2. For African/Ugandan specific names (like "Namatovu", "Ssekalema"), transliterate phonetically into Arabic script accurately.
3. Return the exact same number of names in the same order.

Names to transliterate:
${JSON.stringify(names)}
`;

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: "The Arabic transliteration of the name"
      },
      description: "An array of Arabic names corresponding exactly to the provided English names."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for factual transliteration
      }
    });

    const resultText = response.text();
    if (!resultText) {
      throw new Error("Gemini returned an empty response.");
    }

    const transliterated = JSON.parse(resultText);

    if (!Array.isArray(transliterated) || transliterated.length !== names.length) {
       console.error("Gemini returned a mismatched array length:", transliterated);
       throw new Error("Gemini returned mismatched results.");
    }

    return NextResponse.json({ transliterated });

  } catch (error: any) {
    console.error('Transliteration System Failure:', error);
    return NextResponse.json({ error: error.message || 'Internal system recovery error occurred.' }, { status: 500 });
  }
}

