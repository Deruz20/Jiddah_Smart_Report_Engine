import React from 'react'

export type TheologyMarkRow = {
  subject_id: string
  subject_name_arabic: string
  mot_score: number | null
  eot_score: number | null
}

type Props = {
  examType: 'BOT' | 'MOT' | 'EOT'
  scores: TheologyMarkRow[]
  onChange: (id: string, val: string) => void
}

export default function TheologyTable({ examType, scores, onChange }: Props) {
  const getScore = (row: TheologyMarkRow) => {
    if (examType === 'BOT') return null // Theology marks might not have BOT, but just in case
    if (examType === 'MOT') return row.mot_score
    return row.eot_score
  }

  const filledCount = scores.filter(s => getScore(s) !== null).length
  const total = scores.reduce((s, row) => s + (getScore(row) || 0), 0)

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e4e9f0',
      borderRadius: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1.5px solid #f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#faf5ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>🕌</div>
          <div>
            <div style={{ color: '#111827', fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
              Theology Marks
              <span style={{
                marginLeft: 8,
                fontSize: 12,
                fontWeight: 600,
                color: '#7c3aed',
                direction: 'rtl',
                fontFamily: '"Noto Naskh Arabic", system-ui, serif',
              }}>درجات اللاهوت</span>
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12 }}>Islamic subjects · {scores.length} total</div>
          </div>
        </div>
        <div style={{
          background: '#faf5ff',
          border: '1px solid #e9d5ff',
          color: '#7c3aed',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          padding: '4px 10px',
          borderRadius: 100,
        }}>
          {examType}
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 88px',
        padding: '8px 20px',
        borderBottom: '1px solid #f3f4f6',
        background: '#fafafa',
      }}>
        {/* RTL label for المادة */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColHead>Subject</ColHead>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#9ca3af',
            letterSpacing: '0.04em', direction: 'rtl',
            fontFamily: '"Noto Naskh Arabic", system-ui, serif',
          }}>· المادة</span>
        </div>
        <ColHead center>Score / 100</ColHead>
      </div>

      {/* Rows */}
      {scores.map((s, i) => {
        const rawScore = getScore(s)
        const val = rawScore === null ? '' : String(rawScore)
        const numVal = parseFloat(val)
        const hasScore = val !== ''
        const isHigh = hasScore && numVal >= 75
        const isLow  = hasScore && numVal < 50

        return (
          <div
            key={s.subject_id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 88px',
              alignItems: 'center',
              padding: '9px 20px',
              borderBottom: i < scores.length - 1 ? '1px solid #f9fafb' : 'none',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fdf8ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div>
              {/* Arabic name — RTL, large, elegant */}
              <div style={{
                color: '#374151',
                fontSize: 15,
                fontWeight: 600,
                direction: 'rtl',
                textAlign: 'right',
                fontFamily: '"Noto Naskh Arabic", "Scheherazade New", "Arabic Typesetting", system-ui, serif',
                lineHeight: 1.5,
              }}>
                {s.subject_name_arabic}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <input
                className="score-input"
                type="number"
                min="0"
                max="100"
                placeholder="—"
                value={val}
                onChange={e => onChange(s.subject_id, e.target.value)}
                disabled={examType === 'BOT'}
                style={isHigh
                  ? { borderColor: '#86efac', background: '#f0fdf4', color: '#15803d' }
                  : isLow
                    ? { borderColor: '#fca5a5', background: '#fff5f5', color: '#dc2626' }
                    : {}
                }
              />
            </div>
          </div>
        )
      })}

      {/* Footer */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1.5px solid #f3f4f6',
        background: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>
          {filledCount} of {scores.length} filled
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: '#7c3aed', fontSize: 15, fontWeight: 800 }}>
            {total % 1 === 0 ? total : total.toFixed(1)}
          </span>
          <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 400 }}> / {scores.length * 100}</span>
        </span>
      </div>
    </div>
  )
}

function ColHead({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      color: '#9ca3af',
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      textAlign: center ? 'center' : 'left',
    }}>
      {children}
    </div>
  )
}
