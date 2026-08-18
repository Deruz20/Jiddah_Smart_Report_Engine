export type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

export type EnrollmentData = {
  id: string
  student_id?: string | null
  name: string
  arabic_name?: string | null
  admission_number: string
  circular_class: string
  section: string | null
  theology_class_arabic: string | null
  theology_class_level: string | null
  theology_status: string | null
}

export type CircularMarkRow = {
  subject_id: string
  subject_name: string
  is_core: boolean
  bot_score: number | null
  mot_score: number | null
  eot_score: number | null
}

export type TheologyMarkRow = {
  subject_id: string
  subject_name_arabic: string
  mot_score: number | null
  eot_score: number | null
}
