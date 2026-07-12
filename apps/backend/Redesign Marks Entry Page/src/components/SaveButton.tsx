import type { ExamType } from '../pages/MarksEntryPage'

type Props = {
  examType: ExamType
  isSaving: boolean
  isReady: boolean
  onSave: () => void
}

const examLabel: Record<ExamType, string> = {
  BOT: 'BOT',
  MOT: 'MOT',
  EOT: 'EOT',
}

export default function SaveButton({ examType, isSaving, isReady, onSave }: Props) {
  return (
    <button
      className="save-btn"
      onClick={onSave}
      disabled={!isReady || isSaving}
      style={{ minWidth: 160 }}
    >
      {isSaving ? (
        <>
          <svg
            className="spin"
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Saving…
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save {examLabel[examType]} Marks
        </>
      )}
    </button>
  )
}
