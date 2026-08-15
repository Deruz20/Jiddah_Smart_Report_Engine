const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vismrobdsdsaxmqegcay.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const namesDict = {
  'muhsin': 'محسن',
  'leilah': 'ليلة',
  'malik': 'مالك',
  'sumayyah': 'سمية',
  'hakiimah': 'حكيمة',
  'musa': 'موسى',
  'amiirat': 'أميرة',
  'shuraim': 'شريم',
  'sameeha': 'سميحة',
  'imran': 'عمران',
  'shukran': 'شكران',
  'asma': 'أسماء',
  'maysarat': 'ميسرة',
  'faham': 'فهم',
  'arham': 'أرحم',
  'rahmah': 'رحمة',
  'yahya': 'يحيى',
  'yahaya': 'يحيى'
};

async function run() {
  const { data: students, error } = await supabase.from('students').select('id, name, arabic_name');
  if (error) {
    console.error('Error fetching students:', error);
    return;
  }

  let updatedCount = 0;
  for (const s of students) {
    const lowered = s.name.toLowerCase();
    
    // Check if the student's name contains any of the target names
    for (const [eng, ar] of Object.entries(namesDict)) {
      if (lowered.includes(eng)) {
        // Build the correct Arabic name by translating each part of their full name 
        // to avoid destroying local surnames. We will use the exact logic from transliterate.ts
        // Actually, just let's fetch the new transliteration from the local API endpoint
        // Or since we just want to force update these specific ones quickly, we can just hit our API
        
        const res = await fetch('http://localhost:3000/api/transliterate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: [s.name] })
        });
        
        if (res.ok) {
          const { transliterated } = await res.json();
          const newArabic = transliterated[0];
          
          if (newArabic && newArabic !== s.arabic_name) {
             console.log(`Updating ${s.name} from '${s.arabic_name}' to '${newArabic}'`);
             await supabase.from('students').update({ arabic_name: newArabic }).eq('id', s.id);
             updatedCount++;
          }
        }
        break; // Stop checking other words in the dict for this student
      }
    }
  }
  console.log(`Updated ${updatedCount} students.`);
}

run();
