export interface ApiUser {
  id: string
  email: string
  name: string
  role: string
}

export interface LoginResponse {
  user: ApiUser
}

export interface ApiErrorBody {
  error?: string
  message?: string
}

export interface PaginatedMeta {
  page: number
  pageSize: number
  total: number
}

export interface ApiStudentRecord {
  id: string
  enrollment_id?: string
  name: string
  admission_number: string
  circular_class: string
  section?: string | null
  theology_class_arabic?: string | null
  theology_class_english?: string | null
  academic_year?: number
  created_at?: string
}

export interface DashboardStudent {
  id: string
  enrollmentId?: string
  name: string
  class: string
  age?: number
  gender?: string
  guardian?: string
  phone?: string
  status: 'active' | 'inactive'
  attendance?: number
  avgScore?: number
  enrolled?: string
}

export interface DashboardTeacher {
  id: string
  name: string
  role: string
  subject: string
  classes: string[]
  email: string
  phone: string
  status: string
  joined: string
  avatar: string | null
}

export interface DashboardClass {
  id: string
  name: string
  teacher: string
  students: number
  room: string
  capacity: number
  section?: string
}

export interface AnalyticsPayload {
  kpis: {
    totalStudents: number
    activeClasses: number
    reportsGenerated: number
    avgAttendance: number
    teachers: number
    pendingMarks: number
  }
  termPerformance: { term: string; average: number; highest: number; lowest: number }[]
  classPerformance: { class: string; avg: number }[]
  subjectPerformance: { subject: string; avg: number }[]
  attendanceTrend: { month: string; rate: number }[]
  currentTerm?: { id: string; label: string; term_number: number } | null
}

export interface NotificationItem {
  id: number
  title: string
  message: string
  time: string
  read: boolean
  priority: string
  type: string
}

export interface ActivityItem {
  id: string
  user_name: string
  action: string
  entity_label: string
  entity_type: 'student' | 'marks' | 'teacher' | 'report' | 'notification' | 'system'
  created_at: string
}

export interface MarksRow {
  studentId: string
  name: string
  [subject: string]: string | number
}

export interface CircularMarkSubject {
  subject_id: string
  subject_name: string
  is_core?: boolean
  mot_score: number | null
  eot_score: number | null
}

export interface MarksApiResponse {
  circular_marks: CircularMarkSubject[]
  theology_marks: { subject_id: string; subject_name_arabic: string; mot_score: number | null; eot_score: number | null }[]
}

export interface ReportListItem {
  id: string
  type: string
  class: string
  term: string
  count: number
  status: 'ready' | 'processing'
  date: string
  enrollmentId?: string
  termId?: string
}

export interface ApiRequestConfig {
  signal?: AbortSignal
  params?: Record<string, string | number | boolean | undefined>
  skipAuth?: boolean
}
