import fs from 'fs';

const c = JSON.parse(fs.readFileSync('scratch/production_catalog.json', 'utf8'));
const counts = {};
for (const p of c.policies) {
  counts[p.tablename] = (counts[p.tablename] || 0) + 1;
}

const ownerFacts = {
  academic_terms: 4, activity_log: 2, activity_logs: 2, circular_classes: 1, circular_marks: 1,
  circular_results: 1, circular_subjects: 1, classes: 2, enrollments: 1, grading_criteria: 2,
  grading_remarks: 8, marks: 5, notifications: 2, profiles: 3, school_settings: 3, signatures: 1,
  students: 3, subjects: 2, teacher_initials: 2, teachers: 7, terms: 1, theology_classes: 1,
  theology_marks: 1, theology_results: 1, theology_subjects: 1, user_profiles: 3,
  marks_audit_log: 0, marks_primary: 0, nursery_assessments: 0, report_templates: 0,
  teacher_class_assignments: 0, teacher_invites: 0, users: 0
};

console.log('=== CATALOG VS OWNER PRODUCTION FACTS ===');
for (const [t, count] of Object.entries(ownerFacts)) {
  const cat = counts[t] || 0;
  if (cat !== count) {
    console.log(`Diff on ${t}: catalog has ${cat}, owner facts has ${count}`);
  }
}
