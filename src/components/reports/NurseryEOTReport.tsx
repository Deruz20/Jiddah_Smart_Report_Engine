import {
  getNurseryGrade,
  getNurseryTeacherComment,
  getConductRemark,
  resolveDistinctNurserySecularComments,
} from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'
import { CleanSignatureImage } from '@/components/reports/CleanSignatureImage'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import { resolveReportBranding } from '@/lib/school-settings-helper'
import { formatDateWithOrdinal } from '@/utils/dateHelpers'
import { getClassTeacherSignatureKey } from '@/utils/signatures'
import { NurseryEducativeWatermark } from '@/components/reports/NurseryEducativeWatermark'
import { NurseryCornerDecor, NurseryPlayfulHeaderArt } from '@/components/reports/NurseryPlayfulVectorDecor'
import { useStudioFormatting, resolveEffectiveStudioStyle } from '@/lib/studio-config-store'

const SUBJECT_PILL_PALETTES = [
  { bg: '#EFF6FF', border: '#93C5FD', iconBg: '#DBEAFE', badgeBg: '#1D4ED8' },
  { bg: '#FEFCE8', border: '#FDE047', iconBg: '#FEF08A', badgeBg: '#B45309' },
  { bg: '#ECFDF5', border: '#6EE7B7', iconBg: '#D1FAE5', badgeBg: '#047857' },
  { bg: '#FDF2F8', border: '#F9A8D4', iconBg: '#FCE7F3', badgeBg: '#BE185D' },
  { bg: '#F5F3FF', border: '#C4B5FD', iconBg: '#EDE9FE', badgeBg: '#6D28D9' },
  { bg: '#FFF7ED', border: '#FDBA74', iconBg: '#FFEDD5', badgeBg: '#C2410C' },
]

export default function NurseryEOTReport({ reportData, studioFormatting: studioFormattingProp }: any) {
  const studioFormatting = useStudioFormatting(studioFormattingProp, reportData?.settings?.report_studio_config)
  const effective = resolveEffectiveStudioStyle(studioFormatting, reportData, 'nursery-eot')
  const effectiveStudioPass = { ...studioFormatting, ...effective, stampInkColor: effective.stampColor }
  const nurseryTheme = effective.nurseryTheme || 'playful'
  const isLineArt = nurseryTheme === 'lineart' || studioFormatting.themeId === 'monochrome'
  const isPlayful = nurseryTheme === 'playful' && !isLineArt
  const branding = resolveReportBranding(reportData)
  const printPrefs = reportData?.settings?.print_preferences
  const includeSignatures =
    effective.showSignatures &&
    (printPrefs?.includeSignatures !== undefined ? Boolean(printPrefs.includeSignatures) : true)
  const includeStamp =
    effective.showStamp &&
    (printPrefs?.includeStamp !== undefined ? Boolean(printPrefs.includeStamp) : true)

  const rawClassName =
    reportData?.student?.class_name ||
    reportData?.class_name ||
    reportData?.class ||
    ''
  const secTeacherKey = getClassTeacherSignatureKey(rawClassName, false)
  const sigMap = reportData?.signatures || {}
  const classTeacherSignatureUrl =
    sigMap?.['secular_class_teacher'] ||
    (secTeacherKey ? sigMap?.[secTeacherKey] : null) ||
    sigMap?.['class-teacher-baby'] ||
    sigMap?.['class-teacher-middle'] ||
    sigMap?.['class-teacher-top'] ||
    null
  const headTeacherSignatureUrl =
    sigMap?.['head_teacher'] ?? sigMap?.['head-teacher'] ?? null

  const subjects = (reportData?.circular?.subjects || []).filter((s: any) => {
    if (reportData?.student?.class_name?.toLowerCase().includes('top') && s.subject_name.toLowerCase().includes('writing')) {
      return false
    }
    return true
  })

  const grades = subjects
    .map((s: any) => (s.eot_score != null ? getNurseryGrade(s.eot_score).grade : null))
    .filter(Boolean)

  const payCodeRaw = String(reportData?.student?.pay_code || reportData?.student?.payCode || '').trim()
  const showPayCode = Boolean(payCodeRaw && payCodeRaw !== '--' && payCodeRaw !== '—')
  const admNoRaw = String(reportData?.student?.admission_number || '').trim()
  const showAdmNo = Boolean(admNoRaw && admNoRaw !== '--' && admNoRaw !== '—')

  const getSubjectIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('number')) return '🔢'
    if (lower.includes('english') || lower.includes('reading')) return '📚'
    if (lower.includes('writing') || lower.includes('drawing')) return '🎨'
    if (lower.includes('social')) return '🌍'
    if (lower.includes('health')) return '🍎'
    if (lower.includes('literacy')) return '📖'
    if (lower.includes('islamic') || lower.includes('quran') || lower.includes('religion')) return '☪️'
    return '✏️'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '_________________'
    try {
      const d = new Date(dateString)
      if (isNaN(d.getTime())) return dateString
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase()
    } catch {
      return dateString
    }
  }

  const gradeBadgeStyle = (grade: string | null | undefined) => {
    if (isLineArt) {
      return { bg: '#FFFFFF', border: '#1E293B', color: '#0F172A' }
    }
    if (grade === 'A') return { bg: '#DCFCE7', border: '#16A34A', color: '#14532D' }
    if (grade === 'B') return { bg: '#DBEAFE', border: '#2563EB', color: '#1E3A8A' }
    if (grade === 'C') return { bg: '#FEF3C7', border: '#D97706', color: '#92400E' }
    if (grade === 'D') return { bg: '#FFEDD5', border: '#EA580C', color: '#9A3412' }
    if (grade === 'E') return { bg: '#FFE4E6', border: '#E11D48', color: '#9F1239' }
    return { bg: '#F8FAFC', border: '#CBD5E1', color: '#475569' }
  }

  const defaultComment = getNurseryTeacherComment(grades)
  const { classTeacherComment, headTeacherComment } = resolveDistinctNurserySecularComments({
    classRule: reportData?.circular?.class_teacher_comment || defaultComment,
    headRule: reportData?.circular?.head_teacher_comment,
    defaultComment,
    grades,
    isTerm3: Number(reportData?.term?.term_number) === 3 || Boolean(reportData?.meta?.is_term_3),
  })

  const accentPrimary = isLineArt ? '#1E293B' : '#0D5C3A'
  const accentGold = isLineArt ? '#334155' : '#D97706'
  const accentSky = isLineArt ? '#334155' : '#0284C7'
  const paperBg = isPlayful ? '#FFFDF9' : '#FFFFFF'

  return (
    <ReportContainer
      reportType="NurseryEOTReport"
      primaryFont={branding.primaryFont}
      arabicFont={branding.arabicFont}
      themePreset={branding.themePreset}
      themeColor={accentPrimary}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
    .nursery-eot-report,
    .nursery-eot-report * {
        box-sizing: border-box;
    }

    .nursery-eot-report {
        --primary-green: ${accentPrimary};
        --accent-gold: ${accentGold};
        --accent-sky: ${accentSky};
        flex: 1 1 auto;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: ${paperBg};
        font-family: ${effective.fontFamilyCss} !important;
        --report-font-scale: ${effective.fontScaleMultiplier};
        font-size: calc(100% * var(--report-font-scale, 1));
        position: relative;
        overflow: hidden;
        padding: 12px 18px 10px 18px;
        color: #0F172A;
    }

    @media print {
        .nursery-eot-report {
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
    }

    .nursery-eot-report > * { z-index: 2; position: relative; }

    /* PLAYFUL LIGHT SCALLOPED / CLOUD HEADER */
    .nursery-eot-report .header-frame {
        position: relative;
        background: ${isLineArt ? '#FFFFFF' : 'linear-gradient(180deg, #F0F9FF 0%, #FFFBEB 100%)'};
        border: 2px solid ${isLineArt ? '#1E293B' : '#F59E0B'};
        border-radius: 18px;
        padding: 8px 12px 10px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-shrink: 0;
    }

    .nursery-eot-report .header-center {
        flex: 1;
        min-width: 0;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .nursery-eot-report .crest-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 3px;
    }

    .nursery-eot-report .logo {
        width: 46px;
        height: 46px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .nursery-eot-report .logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .nursery-eot-report .school-name {
        margin: 0;
        font-size: 16px;
        font-weight: 900;
        color: ${accentPrimary};
        letter-spacing: 0.03em;
        text-transform: uppercase;
        line-height: 1.15;
    }

    .nursery-eot-report .school-sub {
        margin: 1px 0 4px 0;
        font-size: 9.5px;
        font-weight: 700;
        color: #475569;
    }

    .nursery-eot-report .title-pill {
        display: inline-block;
        background: ${isLineArt ? '#F8FAFC' : '#FEF3C7'};
        color: ${isLineArt ? '#0F172A' : '#92400E'};
        border: 1.5px solid ${accentGold};
        border-radius: 999px;
        padding: 3px 14px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .nursery-eot-report .term-chip {
        margin-top: 3px;
        font-size: 10px;
        font-weight: 800;
        color: ${accentSky};
        letter-spacing: 0.05em;
        text-transform: uppercase;
    }

    /* REPORT BODY */
    .nursery-eot-report .report-body {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 8px;
        flex: 1 1 auto;
        margin-top: 8px;
        position: relative;
    }

    /* INFO CONTAINER */
    .nursery-eot-report .info-container {
        display: flex;
        gap: 10px;
        flex: 0 0 auto;
    }

    .nursery-eot-report .info-box {
        flex: 1;
        background: ${isLineArt ? '#FFFFFF' : '#F8FAFC'};
        border: 1.5px solid ${isLineArt ? '#334155' : '#CBD5E1'};
        border-radius: 14px;
        padding: 8px 12px;
    }

    .nursery-eot-report .info-row {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin-bottom: 4px;
        font-size: 11px;
    }
    .nursery-eot-report .info-row:last-child { margin-bottom: 0; }
    .nursery-eot-report .label {
        font-weight: 800;
        color: #475569;
        white-space: nowrap;
        text-transform: uppercase;
        font-size: 9.5px;
        letter-spacing: 0.04em;
    }
    .nursery-eot-report .line {
        flex: 1;
        min-width: 0;
        border-bottom: 1.5px dotted #94A3B8;
        padding: 0 0 1px 4px;
        color: #0F172A;
        font-weight: 800;
    }

    /* SEPARATED PILL SUBJECT CARDS */
    .nursery-eot-report .pills-head {
        display: grid;
        grid-template-columns: 2.3fr 0.7fr 1.2fr 0.7fr;
        gap: 8px;
        padding: 3px 12px;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: ${accentPrimary};
        border-bottom: 1.5px solid ${isLineArt ? '#1E293B' : '#CBD5E1'};
    }

    .nursery-eot-report .subject-pills-list {
        display: flex;
        flex-direction: column;
        gap: 9px;
    }

    .nursery-eot-report .subject-pill-row {
        display: grid;
        grid-template-columns: 2.3fr 0.7fr 1.2fr 0.7fr;
        align-items: center;
        gap: 8px;
        padding: 9px 13px;
        border-radius: 14px;
        border: 1.5px solid #CBD5E1;
        background: #FFFFFF;
    }

    /* COMPACT SUPPORTING CARDS */
    .nursery-eot-report .tables-container {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        gap: 10px;
        flex: 1 1 auto;
    }

    .nursery-eot-report .card-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border: 1.5px solid ${isLineArt ? '#334155' : '#93C5FD'};
        border-radius: 12px;
        overflow: hidden;
        background: #FFFFFF;
    }
    .nursery-eot-report .card-table th {
        background: ${isLineArt ? '#F1F5F9' : '#EFF6FF'};
        color: ${isLineArt ? '#0F172A' : '#1E3A8A'};
        font-size: 9.5px;
        padding: 4px 6px;
        text-transform: uppercase;
        font-weight: 900;
        border-bottom: 1px solid #CBD5E1;
        border-right: 1px solid #E2E8F0;
    }
    .nursery-eot-report .card-table th:last-child { border-right: none; }
    .nursery-eot-report .card-table td {
        padding: 5px 8px;
        font-size: 11px;
        font-weight: 700;
        text-align: center;
        color: #0F172A;
        border-right: 1px solid #E2E8F0;
        border-bottom: 1px solid #E2E8F0;
    }
    .nursery-eot-report .card-table tr:last-child td { border-bottom: none; }
    .nursery-eot-report .card-table td:last-child { border-right: none; }

    /* FOOTER */
    .nursery-eot-report .report-footer {
        flex: 0 0 auto;
        margin-top: 4px;
        padding-top: 2px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 12px;
    }

    .nursery-eot-report .remarks-box {
        flex: 1;
        background: ${isLineArt ? '#FFFFFF' : '#FFFBEB'};
        border: 1.5px solid ${accentGold};
        border-radius: 14px;
        padding: 9px 12px;
    }

    .nursery-eot-report .stamp-box {
        width: 208px;
        height: 121px;
        min-width: 208px;
        min-height: 121px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: visible;
    }
        `,
        }}
      />

      <div className="nursery-eot-report" data-nursery-theme={nurseryTheme}>
        {nurseryTheme !== 'classic' && <NurseryCornerDecor lineArt={isLineArt} />}

        {/* JOYFUL LIGHT HEADER */}
        <header className="header-frame">
          {nurseryTheme !== 'classic' && <NurseryPlayfulHeaderArt side="left" lineArt={isLineArt} width={104} height={78} />}

          <div className="header-center">
            <div className="crest-row">
              <div className="logo">
                <img
                  src={branding.logoUrl || '/school_logo.svg'}
                  alt="Badge"
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith('/school_logo.svg')) {
                      e.currentTarget.src = '/school_logo.svg'
                    }
                  }}
                />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h1 className="school-name">{effective.schoolHeader.nameEnglish}</h1>
                <p className="school-sub">
                  {effective.schoolHeader.address} • Tel: {effective.schoolHeader.phone}
                </p>
              </div>
            </div>
            <div className="title-pill">NURSERY END OF TERM REPORT — LITTLE STARS</div>
            <div className="term-chip">
              Term {reportData?.term?.term_number} • {reportData?.term?.academic_year}
            </div>
          </div>

          {nurseryTheme !== 'classic' && <NurseryPlayfulHeaderArt side="right" lineArt={isLineArt} width={104} height={78} />}
        </header>

        <div className="report-body">
          <NurseryEducativeWatermark
            templateId="nursery-eot"
            logoUrl={branding.logoUrl || '/logo-512h.png'}
            studioFormatting={effectiveStudioPass}
            includeEducativeArt={nurseryTheme !== 'classic'}
          />

          {/* CHILD IDENTITY CARD */}
          <div className="info-container">
            <div className="info-box">
              <div className="info-row">
                <span className="label">Learner&apos;s Name</span>
                <div
                  className="line pupil-name"
                  style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', color: '#0F172A' }}
                >
                  {reportData?.student?.name}
                </div>
              </div>
              {showAdmNo && (
                <div className="info-row">
                  <span className="label">Student ID</span>
                  <div className="line" style={{ fontSize: '12.5px', fontWeight: 800 }}>
                    {admNoRaw}
                  </div>
                </div>
              )}
              {showPayCode && (
                <div className="info-row">
                  <span className="label">Pay Code</span>
                  <div className="line" style={{ fontSize: '12.5px', fontWeight: 800 }}>
                    {payCodeRaw}
                  </div>
                </div>
              )}
            </div>

            <div className="info-box">
              <div className="info-row">
                <span className="label">Class</span>
                <div className="line" style={{ fontSize: '13.5px', fontWeight: 800 }}>
                  {reportData?.student?.class_name}
                </div>
              </div>
              <div className="info-row">
                <span className="label">Date</span>
                <div className="line" style={{ fontSize: '12.5px', fontWeight: 800 }}>
                  {studioFormatting?.reportDateOverride || (reportData?.term?.end_date || reportData?.term?.endDate ? formatDate(reportData?.term?.end_date || reportData?.term?.endDate) : '_________________')}
                </div>
              </div>
            </div>
          </div>

          {/* SEPARATED ROUNDED-PILL SUBJECT CARDS */}
          <div className="tables-container">
            <div>
              <div className="pills-head">
                <div>Learning Area</div>
                <div style={{ textAlign: 'center' }}>Grade</div>
                <div style={{ textAlign: 'center' }}>Remark</div>
                <div style={{ textAlign: 'center' }}>Initials</div>
              </div>
              <div className="subject-pills-list" style={{ marginTop: '5px' }}>
                {subjects.map((subject: any, idx: number) => {
                  const eotGrade = subject.eot_score != null ? getNurseryGrade(subject.eot_score) : null
                  const rowPal = isLineArt
                    ? { bg: '#FFFFFF', border: '#334155', iconBg: '#F1F5F9', badgeBg: '#1E293B' }
                    : SUBJECT_PILL_PALETTES[idx % SUBJECT_PILL_PALETTES.length]
                  const gBadge = gradeBadgeStyle(eotGrade?.grade)

                  return (
                    <div
                      key={subject.subject_name}
                      className="subject-pill-row"
                      style={{
                        background: rowPal.bg,
                        borderColor: rowPal.border,
                        borderLeft: `4px solid ${rowPal.badgeBg}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '999px',
                            background: rowPal.iconBg,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            flexShrink: 0,
                          }}
                        >
                          {getSubjectIcon(subject.subject_name)}
                        </span>
                        <span style={{ fontWeight: effective.headingFontWeight, fontSize: '12.5px', color: '#0F172A' }}>
                          {subject.subject_name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '28px',
                            height: '24px',
                            padding: '0 8px',
                            borderRadius: '999px',
                            background: gBadge.bg,
                            border: `1.5px solid ${gBadge.border}`,
                            color: gBadge.color,
                            fontWeight: effective.scoreFontWeight,
                            fontSize: '12.5px',
                          }}
                        >
                          {eotGrade?.grade ?? '--'}
                        </span>
                      </div>

                      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '12px', color: '#1E293B' }}>
                        {eotGrade?.remark ?? '--'}
                      </div>

                      <div
                        style={{
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          fontFamily: '"Caveat", cursive',
                          fontWeight: 800,
                          fontSize: '15px',
                          color: isLineArt ? '#1E293B' : '#047857',
                        }}
                      >
                        {(subject.teacher_initials || '').toUpperCase() || '--'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* COMPACT PROGRESSIVE RECORDS (MOT ONLY — NO BOT) */}
            <table className="card-table competence-table">
              <thead>
                <tr>
                  <th
                    colSpan={reportData?.student?.class_name?.toLowerCase().includes('top') ? 6 : 7}
                    style={{
                      background: isLineArt ? '#E2E8F0' : '#0D5C3A',
                      color: isLineArt ? '#0F172A' : '#FFFFFF',
                      textAlign: 'left',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Learner&apos;s Competence (Progressive Records)
                  </th>
                </tr>
                <tr>
                  <th>Assessment</th>
                  <th>LA1</th>
                  <th>LA2</th>
                  <th>LA3</th>
                  <th>LA4</th>
                  <th>LA5</th>
                  {!reportData?.student?.class_name?.toLowerCase().includes('top') && <th>Writing</th>}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left', fontWeight: 800 }}>Mid-Term Assessment (MOT)</td>
                  {subjects.slice(0, 6).map((subject: any, index: number) => (
                    <td key={'mot-' + index} style={{ fontWeight: 900, color: accentPrimary }}>
                      {subject.mot_score != null ? getNurseryGrade(subject.mot_score).grade : '--'}
                    </td>
                  ))}
                  {Array.from({
                    length: Math.max(
                      0,
                      (!reportData?.student?.class_name?.toLowerCase().includes('top') ? 6 : 5) - subjects.slice(0, 6).length
                    ),
                  }).map((_, i) => (
                    <td key={'mot-empty-' + i}>--</td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* OFFICIAL GRADING SCALE */}
            <table className="card-table grading-scale-table">
              <thead>
                <tr>
                  <th colSpan={6} style={{ textAlign: 'center', letterSpacing: '0.06em' }}>
                    OFFICIAL GRADING SCALE
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left', background: '#F8FAFC', fontWeight: 800 }}>Score Range</td>
                  <td>0 – 49</td>
                  <td>50 – 69</td>
                  <td>70 – 79</td>
                  <td>80 – 89</td>
                  <td>90 – 100</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left', background: '#F8FAFC', fontWeight: 800 }}>Grade &amp; Descriptor</td>
                  <td style={{ fontWeight: 900, color: isLineArt ? '#0F172A' : '#DC2626' }}>E (Emerging)</td>
                  <td style={{ fontWeight: 900, color: isLineArt ? '#0F172A' : '#D97706' }}>D (Fair)</td>
                  <td style={{ fontWeight: 900, color: isLineArt ? '#0F172A' : '#0284C7' }}>C (Good)</td>
                  <td style={{ fontWeight: 900, color: isLineArt ? '#0F172A' : '#059669' }}>B (V. Good)</td>
                  <td style={{ fontWeight: 900, color: isLineArt ? '#0F172A' : '#0D5C3A' }}>A (Excellent)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* FOOTER WITH DISTINCT TEACHER VS HEADTEACHER REMARKS + SIGNATURES + STAMP */}
          <div className="report-footer">
            <div className="remarks-box">
              <div className="info-row">
                <span className="label" style={{ minWidth: '94px' }}>
                  Conduct
                </span>
                <div className="line" style={{ fontSize: `${Math.min(13, effective.commentFontSizePx)}px` }}>
                  {reportData?.circular?.conduct_remark ??
                    getConductRemark(
                      null,
                      reportData?.settings?.division_boundaries,
                      reportData?.settings?.promotion_comments?.default_conduct
                    )}
                </div>
              </div>

              <div className="info-row" style={{ marginTop: '7px', alignItems: 'flex-end', gap: '8px' }}>
                <span className="label" style={{ minWidth: '94px' }}>
                  Class Teacher
                </span>
                <div
                  className="line"
                  style={{
                    flex: 1,
                    minHeight: '20px',
                    borderBottom: '1.5px dotted #CBD5E1',
                    display: 'flex',
                    alignItems: 'flex-end',
                    fontSize: `${Math.min(13, effective.commentFontSizePx)}px`,
                    color: '#0D5C3A',
                  }}
                >
                  <span data-testid="nursery-secular-teacher-comment">{classTeacherComment}</span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', flexShrink: 0, paddingBottom: '2px' }}>
                  SIG:
                </span>
                <div
                  style={{
                    borderBottom: '1.5px dotted #334155',
                    minWidth: '92px',
                    width: '104px',
                    height: '26px',
                    display: 'inline-flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  {includeSignatures && classTeacherSignatureUrl && (
                    <CleanSignatureImage
                      src={classTeacherSignatureUrl}
                      alt="Signature"
                      style={{ maxHeight: '32px', width: '100px', objectFit: 'contain', marginBottom: '-5px' }}
                      studioFormatting={effectiveStudioPass}
                    />
                  )}
                </div>
              </div>

              <div className="info-row" style={{ marginTop: '7px', alignItems: 'flex-end', gap: '8px' }}>
                <span className="label" style={{ minWidth: '94px' }}>
                  Head Teacher
                </span>
                <div
                  className="line"
                  style={{
                    flex: 1,
                    minHeight: '20px',
                    borderBottom: '1.5px dotted #CBD5E1',
                    display: 'flex',
                    alignItems: 'flex-end',
                    fontSize: `${Math.min(13, effective.commentFontSizePx)}px`,
                    color: '#1E3A8A',
                  }}
                >
                  <span data-testid="nursery-secular-head-comment">{headTeacherComment}</span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', flexShrink: 0, paddingBottom: '2px' }}>
                  SIG:
                </span>
                <div
                  style={{
                    borderBottom: '1.5px dotted #334155',
                    minWidth: '92px',
                    width: '104px',
                    height: '26px',
                    display: 'inline-flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  {includeSignatures && headTeacherSignatureUrl && (
                    <CleanSignatureImage
                      src={headTeacherSignatureUrl}
                      alt="Signature"
                      style={{ maxHeight: '45px', width: '100%', maxWidth: '140px', objectFit: 'contain', mixBlendMode: 'multiply', marginBottom: '-5px' }}
                      studioFormatting={effectiveStudioPass}
                    />
                  )}
                </div>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', gap: '16px' }}>
                <div className="info-row" style={{ flex: 1 }}>
                  <span className="label">Next Term Begins</span>
                  <div className="line" style={{ fontSize: '11px', color: accentSky, fontWeight: 800 }}>
                    {studioFormatting?.nextTermBeginsOverride || ((reportData?.term?.next_term_start || reportData?.term?.nextTermBegins || reportData?.term?.next_term_begins)
                      ? formatDateWithOrdinal(reportData?.term?.next_term_start || reportData?.term?.nextTermBegins || reportData?.term?.next_term_begins)
                      : '______________________')}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="stamp-box"
              style={{
                width: '208px',
                height: '121px',
                minWidth: '208px',
                minHeight: '121px',
                position: 'relative',
                overflow: 'visible',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {includeStamp ? (
                <OfficialReportStamp reportData={reportData} studioFormatting={effectiveStudioPass} maxWidth={208} maxHeight={121} />
              ) : null}
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              marginTop: '4px',
              fontSize: '8.5px',
              color: '#64748B',
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            NOT VALID WITHOUT OFFICIAL SCHOOL STAMP AND SIGNATURE
          </div>
        </div>
      </div>
    </ReportContainer>
  )
}
