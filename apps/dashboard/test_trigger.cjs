const fs = require('fs');
const env = fs.readFileSync('c:\\Users\\JIDDAH\\Desktop\\jiddah-smart-report-engine\\apps\\backend\\.env.production', 'utf-8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1].trim()] = val;
  }
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testTrigger() {
  console.log('--- Testing Circular Marks Mismatch ---');
  
  // Find a lower_primary class
  const { data: classData } = await supabase.from('circular_classes').select('id, section').eq('section', 'lower_primary').limit(1);
  if (!classData || classData.length === 0) {
     console.log('No lower_primary class found.');
     return;
  }
  const classId = classData[0].id;
  
  // Find an enrollment for this class
  let { data: enrollmentData } = await supabase.from('enrollments').select('id').eq('circular_class_id', classId).limit(1);
  
  let enrollmentId;
  let createdEnrollment = false;
  if (!enrollmentData || enrollmentData.length === 0) {
     // create dummy enrollment
     console.log('Creating dummy enrollment...');
     // get a student
     const { data: studentData } = await supabase.from('students').select('id').limit(1);
     const studentId = studentData[0].id;
     const { data: newEnroll } = await supabase.from('enrollments').insert({
       student_id: studentId,
       circular_class_id: classId,
       academic_year: '2024-2025'
     }).select();
     enrollmentId = newEnroll[0].id;
     createdEnrollment = true;
  } else {
     enrollmentId = enrollmentData[0].id;
  }
  
  // Find an upper_primary subject
  const { data: subjectData } = await supabase.from('circular_subjects').select('id, section').eq('section', 'upper_primary').limit(1);
  if (!subjectData || subjectData.length === 0) {
      console.log('No upper_primary subject found.');
      return;
  }
  const subjectId = subjectData[0].id;
  
  console.log(`Attempting insert: Enrollment (Class section: ${classData[0].section}) with Subject (Section: ${subjectData[0].section})`);
  
  // Attempt INSERT
  const { data: insertData, error: insertError } = await supabase.from('circular_marks').insert({
    enrollment_id: enrollmentId,
    subject_id: subjectId,
    term_id: (await supabase.from('terms').select('id').limit(1)).data[0].id,
    marks: 85
  });
  
  if (insertError) {
    console.log('EXPECTED ERROR RAISED BY POSTGRES:');
    console.log(insertError.message);
  } else {
    console.log('INSERT SUCCEEDED! (Trigger failed to block)');
    // Cleanup if it succeeded
    await supabase.from('circular_marks').delete().eq('enrollment_id', enrollmentId).eq('subject_id', subjectId);
  }
  
  if (createdEnrollment) {
    console.log('Cleaning up dummy enrollment...');
    await supabase.from('enrollments').delete().eq('id', enrollmentId);
  }
  
}
testTrigger();
