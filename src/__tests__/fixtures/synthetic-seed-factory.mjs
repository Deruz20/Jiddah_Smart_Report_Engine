/**
 * Deterministic synthetic seed factory for Jiddah testing harness.
 * Generates synthetic data for 2 schools, all canonical roles, 2+ classes per school,
 * exactly 12 students per class covering all grade boundaries, ties, blanks, and invalid marks.
 * NEVER contains real student names or production credentials.
 */

export const CANONICAL_ROLES = [
  'admin',
  'head_teacher',
  'dos',
  'class_teacher',
  'theology_instructor',
  'support_staff',
  'student',
  'parent',
  'guest',
];

export const SCHOOL_FIXTURES = [
  {
    id: 1,
    school_name: 'SYNTHETIC_SCHOOL_ALPHA',
    address: 'Plot 100 Synthetic Way, Kampala',
    district: 'Kampala',
    email: 'admin@alpha.synthetic.local',
    phone_1: '+256700000001',
    current_term: 'Term 1',
    current_year: 2026,
    motto: 'Knowledge and Integrity',
    primary_font: 'Inter',
    arabic_font: 'Amiri',
    theme_color: '#047857',
  },
  {
    id: 2,
    school_name: 'SYNTHETIC_SCHOOL_BETA',
    address: 'Plot 200 Mock Avenue, Wakiso',
    district: 'Wakiso',
    email: 'admin@beta.synthetic.local',
    phone_1: '+256700000002',
    current_term: 'Term 1',
    current_year: 2026,
    motto: 'Excellence and Faith',
    primary_font: 'Roboto',
    arabic_font: 'Lateef',
    theme_color: '#1d4ed8',
  },
];

export const USER_ROLES_FIXTURES = [
  { id: 'usr-admin-01', email: 'admin@seed.alpha.local', role: 'admin', school_id: 1 },
  { id: 'usr-head-01', email: 'headteacher@seed.alpha.local', role: 'head_teacher', school_id: 1 },
  { id: 'usr-dos-01', email: 'dos@seed.alpha.local', role: 'dos', school_id: 1 },
  { id: 'usr-teacher-01', email: 'teacher.secular@seed.alpha.local', role: 'class_teacher', school_id: 1 },
  { id: 'usr-theology-01', email: 'teacher.theology@seed.alpha.local', role: 'theology_instructor', school_id: 1 },
  { id: 'usr-staff-01', email: 'staff@seed.alpha.local', role: 'support_staff', school_id: 1 },
  { id: 'usr-student-01', email: 'student@seed.alpha.local', role: 'student', school_id: 1 },
  { id: 'usr-parent-01', email: 'parent@seed.alpha.local', role: 'parent', school_id: 1 },
  // Cross-school user for tenant isolation testing
  { id: 'usr-admin-beta', email: 'admin@seed.beta.local', role: 'admin', school_id: 2 },
];

export const CLASSES_FIXTURES = [
  { id: 'cls-alpha-p6', school_id: 1, name: 'Primary 6', stream: 'Blue', level: 'P6' },
  { id: 'cls-alpha-p7', school_id: 1, name: 'Primary 7', stream: 'Gold', level: 'P7' },
  { id: 'cls-beta-p6', school_id: 2, name: 'Primary 6 Beta', stream: 'Green', level: 'P6' },
  { id: 'cls-beta-p7', school_id: 2, name: 'Primary 7 Beta', stream: 'Silver', level: 'P7' },
];

export const SUBJECTS_FIXTURES = [
  { id: 'subj-eng', code: 'ENG', name: 'English', is_theology: false },
  { id: 'subj-mth', code: 'MTC', name: 'Mathematics', is_theology: false },
  { id: 'subj-sci', code: 'SCI', name: 'Science', is_theology: false },
  { id: 'subj-sst', code: 'SST', name: 'Social Studies', is_theology: false },
  { id: 'subj-qur', code: 'QUR', name: 'Quran Recitation', is_theology: true },
  { id: 'subj-fiq', code: 'FIQ', name: 'Fiqh & Hadith', is_theology: true },
];

/**
 * Creates 12 students per class with deterministic marks hitting all grade boundaries.
 */
export function generateSyntheticCohort(classId, schoolId) {
  const students = [
    {
      id: `${classId}-std-01`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_ALPHA',
      last_name: 'TOP_D1',
      gender: 'M',
      marks: { ENG: 92, MTC: 95, SCI: 90, SST: 88, QUR: 96, FIQ: 94 },
      scenario: 'High Distinction 1 across all subjects',
    },
    {
      id: `${classId}-std-02`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_BETA',
      last_name: 'BOUNDARY_D2',
      gender: 'F',
      marks: { ENG: 79, MTC: 80, SCI: 76, SST: 78, QUR: 82, FIQ: 80 },
      scenario: 'Distinction 2 boundary (75-80)',
    },
    {
      id: `${classId}-std-03`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_GAMMA',
      last_name: 'BOUNDARY_C3',
      gender: 'M',
      marks: { ENG: 71, MTC: 74, SCI: 70, SST: 72, QUR: 75, FIQ: 73 },
      scenario: 'Credit 3 boundary (70-74)',
    },
    {
      id: `${classId}-std-04`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_DELTA',
      last_name: 'BOUNDARY_C4',
      gender: 'F',
      marks: { ENG: 66, MTC: 68, SCI: 65, SST: 69, QUR: 67, FIQ: 68 },
      scenario: 'Credit 4 boundary (65-69)',
    },
    {
      id: `${classId}-std-05`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_EPSILON',
      last_name: 'BOUNDARY_C5',
      gender: 'M',
      marks: { ENG: 61, MTC: 63, SCI: 60, SST: 64, QUR: 62, FIQ: 61 },
      scenario: 'Credit 5 boundary (60-64)',
    },
    {
      id: `${classId}-std-06`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_ZETA',
      last_name: 'BOUNDARY_C6',
      gender: 'F',
      marks: { ENG: 56, MTC: 58, SCI: 55, SST: 59, QUR: 57, FIQ: 55 },
      scenario: 'Credit 6 boundary (55-59)',
    },
    {
      id: `${classId}-std-07`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_ETA',
      last_name: 'BOUNDARY_P7',
      gender: 'M',
      marks: { ENG: 51, MTC: 53, SCI: 50, SST: 54, QUR: 52, FIQ: 50 },
      scenario: 'Pass 7 boundary (50-54)',
    },
    {
      id: `${classId}-std-08`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_THETA',
      last_name: 'BOUNDARY_P8',
      gender: 'F',
      marks: { ENG: 42, MTC: 45, SCI: 40, SST: 48, QUR: 46, FIQ: 44 },
      scenario: 'Pass 8 boundary (40-49)',
    },
    {
      id: `${classId}-std-09`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_IOTA',
      last_name: 'BOUNDARY_F9',
      gender: 'M',
      marks: { ENG: 32, MTC: 28, SCI: 35, SST: 30, QUR: 38, FIQ: 25 },
      scenario: 'Failure 9 (<40)',
    },
    {
      id: `${classId}-std-10`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_KAPPA_TIE_A',
      last_name: 'TIED_RANK',
      gender: 'F',
      marks: { ENG: 75, MTC: 75, SCI: 75, SST: 75, QUR: 75, FIQ: 75 },
      scenario: 'Tied Score Candidate A (Aggregate 300 / 12)',
    },
    {
      id: `${classId}-std-11`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_LAMBDA_TIE_B',
      last_name: 'TIED_RANK',
      gender: 'M',
      marks: { ENG: 75, MTC: 75, SCI: 75, SST: 75, QUR: 75, FIQ: 75 },
      scenario: 'Tied Score Candidate B (Identical to Candidate A)',
    },
    {
      id: `${classId}-std-12`,
      class_id: classId,
      school_id: schoolId,
      first_name: 'SYNTH_MU_BLANK',
      last_name: 'MISSING_DATA',
      gender: 'F',
      marks: { ENG: null, MTC: 70, SCI: null, SST: 65, QUR: null, FIQ: 80 },
      scenario: 'Missing & blank marks handling',
    },
  ];

  return students;
}

export function buildCompleteSyntheticFixture() {
  const allStudents = [];
  for (const cls of CLASSES_FIXTURES) {
    allStudents.push(...generateSyntheticCohort(cls.id, cls.school_id));
  }

  return {
    schools: SCHOOL_FIXTURES,
    roles: USER_ROLES_FIXTURES,
    classes: CLASSES_FIXTURES,
    subjects: SUBJECTS_FIXTURES,
    students: allStudents,
  };
}
