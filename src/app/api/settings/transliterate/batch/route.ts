import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export async function POST(request: Request) {
  try {
    // 1. Fetch all students where arabic_name is null or empty
    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, arabic_name')
      .or('arabic_name.is.null,arabic_name.eq.')
      .limit(50); // Batch limit to avoid timeouts

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ count: 0, message: 'No students found needing translation.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI Transliteration is not configured.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Break into chunks of 25 for safe prompt sizing
    let translatedCount = 0;
    
    for (let i = 0; i < students.length; i += 25) {
      const chunk = students.slice(i, i + 25);
      const names = chunk.map(s => s.name);

      const prompt = `
You are an expert in Islamic and Ugandan phonetic name transliteration.
Please transliterate the following list of English names into Arabic script.
Rules:
1. Use standard Islamic/Arabic spellings for known Muslim names.
2. For African/Ugandan specific names, transliterate phonetically into Arabic script accurately.
3. Return the exact same number of names in the same order.

Names to transliterate:
${names.join('\\n')}
`;

      const responseSchema: Schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.1,
        }
      });

      const resultText = response.text();
      if (!resultText) throw new Error("Empty response from AI");

      const transliterated = JSON.parse(resultText);

      if (!Array.isArray(transliterated) || transliterated.length !== names.length) {
         console.error("Mismatch in chunk", chunk, transliterated);
         continue; 
      }

      // Update database
      for (let j = 0; j < chunk.length; j++) {
        const student = chunk[j];
        const arabicName = transliterated[j];
        
        if (arabicName) {
          await supabase
            .from('students')
            .update({ arabic_name: arabicName })
            .eq('id', student.id);
          translatedCount++;
        }
      }
    }

    return NextResponse.json({ count: translatedCount, remaining: students.length === 50 });

  } catch (error: any) {
    console.error('Batch Transliteration Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
