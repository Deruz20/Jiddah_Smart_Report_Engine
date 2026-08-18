const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_GATEWAY_API_KEY;

if (!geminiKey) {
  console.error("Missing GEMINI_API_KEY or AI_GATEWAY_API_KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: geminiKey });

async function run() {
  console.log("Fetching students without arabic_name...");
  
  const { data: students, error } = await supabase
    .from('students')
    .select('id, name')
    .is('arabic_name', null);
    
  if (error) {
    console.error("Error fetching students:", error);
    process.exit(1);
  }
  
  console.log(`Found ${students.length} students to transliterate.`);
  
  if (students.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  // Process in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);
    const names = batch.map(s => s.name);
    
    console.log(`Processing batch ${i / BATCH_SIZE + 1} (${names.length} names)...`);
    
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

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'array',
            items: { type: 'string' }
          },
          temperature: 0.1,
        }
      });
      
      const transliterated = JSON.parse(response.text());
      
      if (!Array.isArray(transliterated) || transliterated.length !== names.length) {
        console.error("Mismatched output length, skipping batch.");
        continue;
      }
      
      // Update each student individually or use upsert
      for (let j = 0; j < batch.length; j++) {
        const student = batch[j];
        const arabic_name = transliterated[j];
        
        await supabase
          .from('students')
          .update({ arabic_name })
          .eq('id', student.id);
          
        console.log(`Updated ${student.name} -> ${arabic_name}`);
      }
      
    } catch (err) {
      console.error("Error processing batch:", err);
    }
    
    // Add small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log("Migration complete.");
}

run();
