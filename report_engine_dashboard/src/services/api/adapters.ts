import type {
  ApiStudentRecord,
  DashboardClass,
  DashboardStudent,
} from './types'

export function mapStudentFromApi(record: ApiStudentRecord): DashboardStudent {
  return {
    id: record.admission_number || record.id,
    enrollmentId: record.enrollment_id,
    name: record.name,
    class: record.circular_class || '—',
    status: 'active',
    enrolled: record.created_at?.split('T')[0],
    attendance: 90,
    avgScore: 0,
  }
}

export function mapClassFromApi(
  row: { id: string | number; class_name: string; section?: string },
  studentCount = 0
): DashboardClass {
  return {
    id: String(row.id),
    name: row.class_name,
    teacher: '—',
    students: studentCount,
    room: '—',
    capacity: 30,
    section: row.section,
  }
}
