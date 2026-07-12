import type { Student, ExamType } from '../pages/MarksEntryPage'

type Props = {
  student: Student
  examType: ExamType
}

const examLabel: Record<ExamType, string> = {
  BOT: 'Beginning of Term',
  MOT: 'Mid of Term',
  EOT: 'End of Term',
}

const avatarHue = (id: string) => ((id.charCodeAt(1) || 0) * 37 + 120) % 360

export default function StudentBanner({ student, examType }: Props) {
  const hue = avatarHue(student.id)

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e4e9f0',
      borderRadius: 14,
      padding: '14px 18px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap',
    }}>
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: `hsl(${hue}, 60%, 88%)`,
        color: `hsl(${hue}, 55%, 30%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800,
      }}>
        {student.name.charAt(0)}
      </div>

      {/* Name + admission */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ color: '#111827', fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
          {student.name}
        </div>
        <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{student.admissionNo}</div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 36, background: '#e4e9f0', flexShrink: 0 }} />

      {/* Chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip label="Class" value={student.class} color="green" />
        <Chip label="Section" value={student.section} color="orange" />
        {/* Arabic level */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#faf5ff',
          border: '1px solid #e9d5ff',
          borderRadius: 8,
          padding: '5px 10px',
        }}>
          <span style={{ color: '#7c3aed', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
            الدرجة اللاهوتية
          </span>
          <span style={{ color: '#6d28d9', fontSize: 13, fontWeight: 700, direction: 'rtl' }}>
            {student.arabicLevel}
          </span>
        </div>
      </div>

      {/* Spacer + exam badge */}
      <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
        <div style={{
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: 8,
          padding: '5px 12px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#f07d1a',
            display: 'inline-block',
          }} />
          <span style={{ color: '#c2410c', fontSize: 12, fontWeight: 700 }}>{examType}</span>
          <span style={{ color: '#ea580c', fontSize: 12 }}>· {examLabel[examType]}</span>
        </div>
      </div>
    </div>
  )
}

function Chip({ label, value, color }: { label: string; value: string; color: 'green' | 'orange' }) {
  const greenStyle = { bg: '#f0fdf4', border: '#bbf7d0', labelColor: '#166534', valueColor: '#15803d' }
  const orangeStyle = { bg: '#fff7ed', border: '#fed7aa', labelColor: '#9a3412', valueColor: '#c2410c' }
  const s = color === 'green' ? greenStyle : orangeStyle

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 8,
      padding: '5px 10px',
    }}>
      <span style={{ color: s.labelColor, fontSize: 11, fontWeight: 600 }}>{label}:</span>
      <span style={{ color: s.valueColor, fontSize: 13, fontWeight: 700 }}>{value}</span>
    </div>
  )
}
