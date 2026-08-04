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
});

const theology_marks = new Table({
  enrollment_id: column.text,
  subject_id: column.text,
  bot_mark: column.real,
  mot_mark: column.real,
  eot_mark: column.real,
  updated_by: column.text,
  device_id: column.text,
});

export const AppSchema = new Schema({
  teachers,
  subjects,
  circular_classes,
  theology_classes,
  enrollments,
  circular_marks,
  theology_marks,
  students,
});
