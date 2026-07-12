import React from 'react'

export type CircularMarkRow = {
  subject_id: string
  subject_name: string
  is_core: boolean
  bot_score: number | null
  mot_score: number | null
  eot_score: number | null
}

type Props = {
  examType: 'BOT' | 'MOT' | 'EOT'
  scores: CircularMarkRow[]
  onChange: (id: string, val: string) => void
}

export default function CircularTable({ examType, scores, onChange }: Props) {
  const getScore = (row: CircularMarkRow) => {
    if (examType === 'BOT') return row.bot_score
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
            background: '#f0fdf4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>📚</div>
          <div>
            <div style={{ color: '#111827', fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Circular Marks</div>
            <div style={{ color: '#9ca3af', fontSize: 12 }}>General subjects · {scores.length} total</div>
          </div>
        </div>
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#15803d',
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
        gridTemplateColumns: '1fr 64px 88px',
        padding: '8px 20px',
        borderBottom: '1px solid #f3f4f6',
        background: '#fafafa',
      }}>
        <ColHead>Subject</ColHead>
        <ColHead center>Core</ColHead>
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

        // Create a short code from the subject name if needed, or just use the name
        const words = s.subject_name.split(' ')
        const code = words.length > 1 ? words.map(w => w[0]).join('').toUpperCase() : s.subject_name.substring(0, 3).toUpperCase()

        return (
          <div
            key={s.subject_id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 64px 88px',
              alignItems: 'center',
              padding: '9px 20px',
              borderBottom: i < scores.length - 1 ? '1px solid #f9fafb' : 'none',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8fdf9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div>
              <span style={{
                display: 'inline-block',
                background: '#f3f4f6',
                color: '#374151',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                padding: '2px 7px',
                borderRadius: 5,
                marginRight: 8,
                fontVariantNumeric: 'tabular-nums',
              }}>{code}</span>
              <span style={{ color: '#4b5563', fontSize: 13 }}>{s.subject_name}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              {s.is_core ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#dcfce7', color: '#16a34a',
                  fontSize: 11, fontWeight: 800,
                }}>✓</span>
              ) : (
                <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>
              )}
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
          <span style={{ color: '#1a9e5c', fontSize: 15, fontWeight: 800 }}>
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
