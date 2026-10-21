/**
 * REAL SYNTHETIC REPORT FIXTURES FOR REPORT STUDIO & LIVE PREVIEWS
 * 
 * Provides comprehensive, culturally and academically authentic student datasets
 * for all 7 report templates. Matches real Ugandan primary school curricula
 * and Islamic theology standards.
 */

export const SYNTHETIC_REPORT_FIXTURES: Record<string, any> = {
  'primary-eot': {
    id: 'syn-p5-eot-01',
    student: {
      name: 'Farouk Ssemakula',
      admission_number: 'JIS/2024/0482',
      class_name: 'P.5',
      section: 'upper_primary',
      gender: 'Male',
      religion: 'Muslim',
      theology_class_arabic: 'الفصل الخامس',
      stream: 'A',
    },
    term: {
      id: 'term-1-2026',
      label: 'Term 1, 2026',
      term_number: 1,
      academic_year: 2026,
      start_date: '2026-02-02',
      end_date: '2026-05-01',
      next_term_start: '2026-05-25',
    },
    circular: {
      position: 2,
      total_students: 45,
      division: 'I',
      total_score: 368,
      aggregate: 7,
      class_teacher_comment: 'A remarkably focused and disciplined pupil. Excellent performance in science and mathematics.',
      head_teacher_comment: 'Outstanding academic progress this term. Maintain this trajectory for candidate preparation.',
      conduct_remark: 'Exemplary Islamic conduct and active participation in congregational prayer.',
      subjects: [
        { subject_name: 'ENGLISH', bot_score: 86, mot_score: 88, eot_score: 90, grade: 'D1', points: 1, remark: 'Excellent command of grammar and composition' },
        { subject_name: 'MATHEMATICS', bot_score: 92, mot_score: 95, eot_score: 96, grade: 'D1', points: 1, remark: 'Exceptional problem-solving ability' },
        { subject_name: 'BASIC SCIENCE', bot_score: 89, mot_score: 91, eot_score: 94, grade: 'D1', points: 1, remark: 'Superb grasp of experimental concepts' },
        { subject_name: 'SOCIAL STUDIES', bot_score: 82, mot_score: 85, eot_score: 88, grade: 'D2', points: 2, remark: 'Very strong analytical answers' },
      ],
    },
    theology: {
      position: 1,
      total_students: 45,
      division: '1',
      total_score: 472,
      average: 94.4,
      class_teacher_comment: 'طالب متميز في حفظ القرآن الكريم وقواعد التجويد',
      head_teacher_comment: 'بارك الله في جهوده ووفقه لمزيد من التقدم والنجاح',
      subjects: [
        { subject_name_arabic: 'القرآن الكريم', mot_score: 98, eot_score: 99, grade: 'ممتاز', remark: 'أداء صوتي ممتاز مع التجويد الكامل' },
        { subject_name_arabic: 'الحديث الشريف', mot_score: 92, eot_score: 94, grade: 'ممتاز', remark: 'حفظ متقن للأحاديث وشرحها' },
        { subject_name_arabic: 'الفقه الإسلامي', mot_score: 90, eot_score: 93, grade: 'ممتاز', remark: 'فهم عميق للأحكام والعبادات' },
        { subject_name_arabic: 'التوحيد والعقيدة', mot_score: 95, eot_score: 96, grade: 'ممتاز', remark: 'استيعاب متميز لمفاهيم العقيدة' },
        { subject_name_arabic: 'اللغة العربية', mot_score: 88, eot_score: 90, grade: 'ممتاز', remark: 'طلاقة في القراءة والتعبير الكتابي' },
      ],
    },
    signatures: {
      'head-teacher': '/signatures/head-teacher.png',
      'class-teacher-p5': '/signatures/class-teacher.png',
    },
  },
  'primary-mot': {
    id: 'syn-p4-mot-01',
    student: {
      name: 'Amina Nakato',
      admission_number: 'JIS/2024/0512',
      class_name: 'P.4',
      section: 'lower_primary',
      gender: 'Female',
      theology_class_arabic: 'الفصل الرابع',
    },
    term: {
      label: 'Term 1, 2026',
      academic_year: 2026,
      next_term_start: '2026-05-25',
    },
    circular: {
      position: 3,
      total_students: 42,
      division: 'I',
      mot_total: 428,
      mot_aggregate: 8,
      class_teacher_comment: 'Very polite, hardworking and cooperative child.',
      head_teacher_comment: 'Keep up the good spirit and steady revision.',
      conduct_remark: 'Courteous and respectful to peers and teachers.',
      subjects: [
        { subject_name: 'ENG', bot_score: 84, bot_grade_display: 'D1', mot_score: 88, mot_grade_display: 'D1', remark: 'Very Good' },
        { subject_name: 'MATH', bot_score: 82, bot_grade_display: 'D2', mot_score: 86, mot_grade_display: 'D1', remark: 'Excellent' },
        { subject_name: 'LIT I', bot_score: 85, bot_grade_display: 'D1', mot_score: 89, mot_grade_display: 'D1', remark: 'Very Good' },
        { subject_name: 'LIT II', bot_score: 80, bot_grade_display: 'D2', mot_score: 84, mot_grade_display: 'D2', remark: 'Good' },
        { subject_name: 'I.R.E', bot_score: 90, bot_grade_display: 'D1', mot_score: 92, mot_grade_display: 'D1', remark: 'Outstanding' },
      ],
    },
    signatures: {
      'head-teacher': '/signatures/head-teacher.png',
      'class-teacher-p4': '/signatures/class-teacher.png',
    },
  },
  'primary-bot': {
    id: 'syn-p3-bot-01',
    student: {
      name: 'Ibrahim Lwanga',
      admission_number: 'JIS/2025/0631',
      class_name: 'P.3',
      section: 'lower_primary',
      gender: 'Male',
      theology_class_arabic: 'الفصل الثالث',
    },
    term: {
      label: 'Term 1, 2026',
      academic_year: 2026,
    },
    circular: {
      position: 1,
      total_students: 38,
      division: 'I',
      bot_total: 445,
      bot_aggregate: 6,
      class_teacher_comment: 'Bright pupil with great potential. Consistently punctual.',
      head_teacher_comment: 'Very commendable start of term assessment.',
      conduct_remark: 'Disciplined and orderly in class.',
      subjects: [
        { subject_name: 'ENG', bot_score: 92, bot_grade_display: 'D1', remark: 'Excellent' },
        { subject_name: 'MATH', bot_score: 94, bot_grade_display: 'D1', remark: 'Outstanding' },
        { subject_name: 'LIT I', bot_score: 88, bot_grade_display: 'D1', remark: 'Very Good' },
        { subject_name: 'LIT II', bot_score: 85, bot_grade_display: 'D1', remark: 'Good' },
        { subject_name: 'I.R.E', bot_score: 96, bot_grade_display: 'D1', remark: 'Exceptional' },
      ],
    },
  },
  'p7-eot': {
    id: 'syn-p7-eot-01',
    student: {
      name: 'Zahra Nabirye',
      admission_number: 'JIS/2021/0109',
      class_name: 'P.7',
      section: 'upper_primary',
      gender: 'Female',
      theology_class_arabic: 'الفصل السابع',
    },
    term: {
      label: 'Term 1, 2026',
      academic_year: 2026,
      next_term_start: '2026-05-25',
    },
    circular: {
      position: 1,
      total_students: 34,
      division: 'I',
      total_score: 382,
      aggregate: 4,
      class_teacher_comment: 'Top candidate standard. Mastered examination technique and speed.',
      head_teacher_comment: 'Superb aggregate 4. Ready for UNEB PLE distinction.',
      conduct_remark: 'Role model prefect and exemplary student.',
      subjects: [
        { subject_name: 'ENGLISH', bot_score: 94, mot_score: 96, eot_score: 98, grade: 'D1', points: 1, remark: 'Mastery of language and comprehension' },
        { subject_name: 'MATHEMATICS', bot_score: 96, mot_score: 98, eot_score: 99, grade: 'D1', points: 1, remark: 'Flawless calculation and speed' },
        { subject_name: 'BASIC SCIENCE', bot_score: 92, mot_score: 94, eot_score: 96, grade: 'D1', points: 1, remark: 'Complete conceptual accuracy' },
        { subject_name: 'SOCIAL STUDIES', bot_score: 90, mot_score: 92, eot_score: 95, grade: 'D1', points: 1, remark: 'Outstanding map and historical analysis' },
      ],
    },
  },
  'nursery-eot': {
    id: 'syn-nur-eot-01',
    student: {
      name: 'Maryam Namubiru',
      admission_number: 'JIS/2026/0890',
      class_name: 'Top Class',
      section: 'nursery',
      gender: 'Female',
    },
    term: {
      label: 'Term 1, 2026',
      academic_year: 2026,
    },
    circular: {
      position: 1,
      total_students: 25,
      division: 'I',
      total_score: 480,
      class_teacher_comment: 'Quick learner, enthusiastic and enjoys recitation and arts.',
      head_teacher_comment: 'Promoted to Primary One with distinction.',
      conduct_remark: 'Cheerful, polite and cooperative child.',
      subjects: [
        { subject_name: 'Reading', eot_score: 98, grade: 'D1', remark: 'Reads simple 4-letter words fluently' },
        { subject_name: 'Writing', eot_score: 95, grade: 'D1', remark: 'Neat letter formation and spacing' },
        { subject_name: 'Numbers', eot_score: 97, grade: 'D1', remark: 'Counts and writes numbers 1 to 100' },
        { subject_name: 'General Knowledge', eot_score: 96, grade: 'D1', remark: 'Recognizes animals, colors, and shapes' },
        { subject_name: 'Quran & Hadith', eot_score: 100, grade: 'D1', remark: 'Memorized Surah Al-Fatihah and Al-Ikhlas' },
      ],
    },
  },
  'theology-mot': {
    id: 'syn-theo-mot-01',
    student: {
      name: 'Kassim Katongole',
      theology_class_arabic: 'الصف الثالث',
      class_name: 'P.3',
    },
    term: {
      term_number: 1,
      academic_year: 2026,
    },
    meta: {
      total_students: 40,
      position: 2,
    },
    theology: {
      mot_total: 465,
      eot_total: 480,
      division: '1',
      subjects: [
        { subject_name_arabic: 'القرآن الكريم والتجويد', mot_score: 96, eot_score: 98 },
        { subject_name_arabic: 'الحديث الشريف', mot_score: 92, eot_score: 95 },
        { subject_name_arabic: 'الفقه والعبادات', mot_score: 90, eot_score: 94 },
        { subject_name_arabic: 'العقيدة الإسلامية', mot_score: 94, eot_score: 97 },
        { subject_name_arabic: 'اللغة العربية والإملاء', mot_score: 93, eot_score: 96 },
      ],
    },
  },
};
