import { column, Schema, Table } from '@powersync/web';

const teachers = new Table({
  name: column.text,
  email: column.text,
  subject: column.text,
  classes: column.text,
  auth_user_id: column.text,
});

const subjects = new Table({
  subject_name: column.text,
  curriculum: column.text,
  section: column.text,
});

const students = new Table({
  name: column.text,
  full_name: column.text,
  admission_number: column.text,
  gender: column.text,
  status: column.text,
  is_theology_enrolled: column.integer,
});

const circular_classes = new Table({
  class_name: column.text,
  class_teacher_id: column.text,
  section: column.text,
});

const theology_classes = new Table({
  class_name_arabic: column.text,
  class_name_english: column.text,
});

const enrollments = new Table({
  student_id: column.text,
  academic_year_id: column.text,
  term_id: column.text,
  circular_class_id: column.text,
  theology_class_id: column.text,
});

const circular_marks = new Table({
  enrollment_id: column.text,
  subject_id: column.text,
  bot_mark: column.real,
  mot_mark: column.real,
  eot_mark: column.real,
  updated_by: column.text,
  device_id: column.text,
}, { indexes: { enrollment_subject: ['enrollment_id', 'subject_id'] } });

const theology_marks = new Table({
  enrollment_id: column.text,
  subject_id: column.text,
  bot_mark: column.real,
  mot_mark: column.real,
  eot_mark: column.real,
  updated_by: column.text,
  device_id: column.text,
}, { indexes: { enrollment_subject: ['enrollment_id', 'subject_id'] } });

const activity_log = new Table({
  teacher_id: column.text,
  action_type: column.text,
  target_table: column.text,
  target_id: column.text,
  description: column.text,
  metadata: column.text,
  created_at: column.text,
});

const grading_standards = new Table({
  grading_type: column.text,
  min_score: column.integer,
  max_score: column.integer,
  grade: column.text,
  remark: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const report_templates = new Table({
  class_id: column.text,
  color_scheme: column.text,
  theme_mode: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const exam_types = new Table({
  name: column.text,
  description: column.text,
  created_at: column.text,
});

const special_exam_marks = new Table({
  enrollment_id: column.text,
  subject_id: column.text,
  exam_type_id: column.text,
  score: column.real,
  updated_by: column.text,
  device_id: column.text,
  created_at: column.text,
  updated_at: column.text,
}, { indexes: { enrollment_subject_exam: ['enrollment_id', 'subject_id', 'exam_type_id'] } });

export const AppSchema = new Schema({
  teachers,
  subjects,
  circular_classes,
  theology_classes,
  enrollments,
  circular_marks,
  theology_marks,
  students,
  activity_log,
  grading_standards,
  report_templates,
  exam_types,
  special_exam_marks,
});
