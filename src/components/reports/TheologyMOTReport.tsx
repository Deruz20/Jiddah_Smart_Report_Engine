import { getTheologyComment } from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import { useStudioFormatting, resolveEffectiveStudioStyle } from '@/lib/studio-config-store'
import { NurseryEducativeWatermark } from '@/components/reports/NurseryEducativeWatermark'

const theologyCSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');

/*
 * THEOLOGY CARD CSS
 * Sized to fill the 558px tall × 794px wide slot (A5 landscape in 2-up A4 sheet).
 * Uses justify-content: space-between so all sections expand and fill the available space evenly.
 */

/* Wrapper provided by the 2-up sheet / single preview */
.theology-card-page {
    --tc-primary: #064e3b;
    --tc-secondary: #d6b14c;
    --tc-accent: #047857;
    --tc-watermark-opacity: 0.08;
    --tc-score-weight: 800;
    --tc-comment-size: 17px;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 4px;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

/* OUTER GOLD BORDER */
.theology-card-outer {
    border: 3.5px solid var(--tc-secondary);
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    background: #fff;
    box-sizing: border-box;
}

/* INNER GREEN BORDER */
.theology-card-inner {
    border: 2px solid var(--tc-primary);
    flex: 1;
    display: flex;
    flex-direction: column;
    margin: 2px;
    position: relative;
    overflow: hidden;
    background: #fff;
    box-sizing: border-box;
}

/* WATERMARK */
.theology-card-inner::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url('/logo-512h.png') center center no-repeat;
    background-size: 240px;
    opacity: var(--tc-watermark-opacity);
    pointer-events: none;
    z-index: 0;
}

/* CARD CONTENT — fills entire 558px slot */
.theology-card {
    flex: 1;
    height: 100%;
    direction: rtl;
    font-family: 'Cairo', sans-serif;
    color: #111;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12px 24px;
    position: relative;
    z-index: 1;
}

/* HEADER */
.tc-header {
    text-align: center;
    background: linear-gradient(to right, var(--tc-primary), var(--tc-accent));
    padding: 10px 18px;
    border-radius: 12px;
    border-bottom: 3.5px solid var(--tc-secondary);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.tc-header-center {
    flex: 1;
    text-align: center;
}

.tc-badge {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
}

.tc-badge img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.tc-basmala {
    font-family: 'Amiri', serif;
    font-size: 23px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 2px;
    line-height: 1.2;
}

.tc-school {
    font-size: 19px;
    font-weight: 800;
    color: #fff;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    line-height: 1.25;
}

.tc-title {
    margin-top: 5px;
    font-size: 15px;
    font-weight: 900;
    color: #fff;
    display: inline-block;
    padding: 3px 26px;
    border: 1.5px solid rgba(255,255,255,0.4);
    border-radius: 999px;
    background: rgba(255,255,255,0.22);
}

/* INFO SECTION */
.tc-info {
    font-size: 15px;
    font-weight: 700;
    background: #f8fafc;
    padding: 10px 18px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    flex-shrink: 0;
}

.tc-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.tc-row-sub {
    margin-top: 8px;
}

.tc-label {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    white-space: nowrap;
}

.tc-field {
    flex: 1;
    min-width: 0;
    border-bottom: 2px dashed var(--tc-primary);
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px 1px;
    color: var(--tc-primary);
    font-weight: 900;
    font-size: 17px;
}

.tc-term {
    width: 55px;
    flex: none;
    justify-content: center;
}

.tc-class {
    width: 130px;
    flex: none;
    justify-content: center;
}

.tc-year {
    width: 80px;
    flex: none;
    justify-content: center;
}

/* SCORES TABLE */
.tc-table-wrap {
    border: 2.5px solid var(--tc-secondary);
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
}

.tc-table {
    width: 100%;
    border-collapse: collapse;
    border-style: hidden;
    table-layout: fixed;
}

.tc-table th {
    padding: 9px 4px;
    background: var(--tc-primary);
    color: white;
    font-weight: 800;
    border: 1px solid var(--tc-secondary);
    font-size: 14.5px;
    text-align: center;
}

.tc-table td {
    height: 48px;
    background: white;
    vertical-align: middle;
    padding: 2px 4px;
    color: #0f172a;
    font-weight: var(--tc-score-weight);
    font-size: 17px;
    border: 1px solid #e2e8f0;
    text-align: center;
}

.tc-red {
    color: #c1121f;
    font-weight: 900;
    font-size: 18px;
}

/* RANK ROW */
.tc-rank-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 14px;
    font-size: 15px;
    font-weight: 800;
    flex-shrink: 0;
}

.tc-rank-field {
    width: 110px;
    border-bottom: 2px dashed #94a3b8;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px 1px;
    color: #0f172a;
    font-weight: 800;
    font-size: 16px;
}

.tc-rank-val {
    color: #c1121f;
    font-weight: 900;
    font-size: 17px;
}

/* COMMENT + STAMP ROW */
.tc-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
}

.tc-comment {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15.5px;
    font-weight: 800;
    flex: 1;
    min-width: 0;
}

.tc-comment-label {
    color: var(--tc-primary);
    font-size: 16px;
    font-weight: 800;
    white-space: nowrap;
}

.tc-comment-field {
    flex: 1;
    min-width: 0;
    border-bottom: 2px dashed #94a3b8;
    height: 38px;
    display: flex;
    align-items: center;
    padding: 0 12px 2px;
    color: #0369a1;
    font-style: normal;
    font-weight: 900;
    font-size: var(--tc-comment-size);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tc-stamp {
    width: 132px;
    height: 64px;
    border: none;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.tc-stamp.has-image {
    border: 0;
    border-radius: 0;
    background: transparent;
}
.tc-stamp img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    mix-blend-mode: multiply;
    filter: contrast(1.3) saturate(1.25);
    transform: rotate(-1.5deg) scale(1.04);
}
`

export function TheologyCard({
  reportData,
  studioFormatting: studioFormattingProp,
}: {
  reportData: any
  studioFormatting?: any
}) {
  const studioFormatting = useStudioFormatting(studioFormattingProp, reportData?.settings?.report_studio_config)
  const effective = resolveEffectiveStudioStyle(studioFormatting, reportData, 'theology-mot')
  const effectiveStudioPass = { ...studioFormatting, ...effective, stampInkColor: effective.stampColor }
  const toAr = (val: number | string | null | undefined): string => {
    if (val == null) return '--'
    return String(val).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
  }

  const toHijri = (gregorianYear: number): number =>
    Math.round((gregorianYear - 622) * (33 / 32))

  const isEOT = reportData?.score_type === 'eot'
  const subjects = reportData?.theology?.subjects ?? []

  const totalStudents =
    reportData?.meta?.total_students ??
    reportData?.circular?.total_students ??
    reportData?.total_students

  const position =
    reportData?.meta?.position ??
    reportData?.circular?.position ??
    reportData?.position

  const totalScore = isEOT
    ? (reportData?.theology?.eot_total ?? 0)
    : (reportData?.theology?.mot_total ?? 0)

  const rawDivision = reportData?.theology?.division
  const computedDivision = (() => {
    if (rawDivision && rawDivision !== '--') return rawDivision
    const validScores = subjects
      .map((s: any) => (isEOT ? s?.eot_score : s?.mot_score))
      .filter((v: any): v is number => typeof v === 'number' && !Number.isNaN(v))
    if (validScores.length === 0) return '--'
    const avg = validScores.reduce((acc: number, v: number) => acc + v, 0) / validScores.length
    if (avg >= 85) return 'ممتاز'
    if (avg >= 75) return 'جيد جداً'
    if (avg >= 65) return 'جيد'
    if (avg >= 50) return 'مقبول'
    return 'ضعيف'
  })()

  const includeStamp = effective.showStamp

  return (
    <div
      className="theology-card-page"
      style={{
        ['--tc-primary' as any]: effective.primaryColor,
        ['--tc-secondary' as any]: effective.secondaryColor,
        ['--tc-accent' as any]: effective.headerAccentColor,
        ['--tc-watermark-opacity' as any]: effective.watermarkOpacity,
        ['--tc-score-weight' as any]: effective.scoreFontWeight,
        ['--tc-comment-size' as any]: `${effective.arabicCommentFontSizePx}px`,
      }}
    >
      <div className="theology-card-outer">
        <div className="theology-card-inner">
          <NurseryEducativeWatermark
            templateId="theology-mot"
            logoUrl={effective.schoolHeader.logoUrl || "/logo-512h.png"}
            studioFormatting={effectiveStudioPass}
            includeEducativeArt={false}
          />
          <div className="theology-card" style={{ fontFamily: effective.arabicFontFamilyCss, ['--report-font-scale' as any]: effective.arabicFontScaleMultiplier, fontSize: `calc(100% * ${effective.arabicFontScaleMultiplier})` }}>

            {/* HEADER */}
            <div className="tc-header">
              <div className="tc-badge">
                <img
                  src={effective.schoolHeader.logoUrl || "/logo-512h.png"}
                  alt="School Badge"
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith('/logo-512h.png') && !e.currentTarget.src.endsWith('/school_logo.svg')) {
                      e.currentTarget.src = '/logo-512h.png';
                    } else if (e.currentTarget.src.endsWith('/logo-512h.png')) {
                      e.currentTarget.src = '/school_logo.svg';
                    }
                  }}
                />
              </div>
              <div className="tc-header-center">
                <div className="tc-basmala">بسم الله الرحمن الرحيم</div>
                <div className="tc-school">{effective.schoolHeader.nameArabic || reportData?.settings?.arabic_name || "مدرسة جدة الإسلامية للروضة والابتدائية _ انساغو واكيسو"}</div>
                <div className="tc-title">
                  {isEOT ? 'كشف الدرجات لنهاية الفترة' : 'كشف الدرجات لمنتصف الفترة'}
                </div>
              </div>
              <div className="tc-badge" style={{ visibility: 'hidden' }}>
                <img src="/school_logo.svg" alt="" />
              </div>
            </div>

            {/* INFO */}
            <div className="tc-info">
              <div className="tc-row">
                <span className="tc-label">اسم الطالب/ة :</span>
                <div className="tc-field pupil-name" style={{ fontWeight: 900, fontSize: '21px', color: '#0F172A' }}>{reportData?.student?.arabic_name || reportData?.student?.name || '___'}</div>
              </div>
              <div className="tc-row tc-row-sub">
                <span className="tc-label">الفترة:</span>
                <div className="tc-field tc-term" style={{ fontWeight: 900, fontSize: '16.5px', color: '#0F172A' }}>{toAr(reportData?.term?.term_number)}</div>
                <span className="tc-label">الفصل:</span>
                <div className="tc-field tc-class" style={{ fontWeight: 900, fontSize: '16.5px', color: '#0F172A' }}>{reportData?.student?.theology_class_arabic ?? '--'}</div>
                <span className="tc-label">السنة :</span>
                <div className="tc-field tc-year" style={{ fontWeight: 900, fontSize: '16.5px', color: '#0F172A' }}>{toAr(toHijri(Number(reportData?.term?.academic_year)))}</div>
                <span className="tc-label">هـ</span>
                <div className="tc-field tc-year" style={{ fontWeight: 900, fontSize: '16.5px', color: '#0F172A' }}>{toAr(reportData?.term?.academic_year)}</div>
                <span className="tc-label">م</span>
              </div>
            </div>

            {/* SCORES TABLE */}
            <div className="tc-table-wrap">
              <table className="tc-table">
                <tbody>
                  <tr>
                    {subjects.map((subj: any, index: number) => (
                      <th key={index}>{subj.subject_name_arabic || subj.subject_name}</th>
                    ))}
                    <th>المجموع</th>
                    <th className="tc-red">الدرجة</th>
                  </tr>
                  <tr>
                    {subjects.map((subj: any, index: number) => (
                      <td key={index}>{toAr(isEOT ? subj.eot_score : subj.mot_score)}</td>
                    ))}
                    <td>{toAr(isEOT ? reportData?.theology?.eot_total : reportData?.theology?.mot_total)}</td>
                    <td className="tc-red">{computedDivision}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RANK ROW */}
            <div className="tc-rank-row">
              <span className="tc-label">عدد الطلبة :</span>
              <div className="tc-rank-field">{toAr(totalStudents)}</div>
              <span className="tc-label tc-rank-val">الترتيب :</span>
              <div className="tc-rank-field tc-rank-val">{toAr(position)}</div>
            </div>

            {/* COMMENT + STAMP */}
            <div className="tc-footer">
              <div className="tc-comment">
                <span className="tc-comment-label">تقرير مرب الفصل :</span>
                <div className="tc-comment-field">
                  {reportData?.theology?.teacher_comment || getTheologyComment(totalScore, reportData?.student?.gender, reportData?.settings?.theology_remarks, reportData?.theology?.division, subjects.length || 4)}
                </div>
              </div>
              <div className="tc-stamp" style={{ width: '135px', height: '64px', minWidth: '135px', minHeight: '64px', position: 'relative', overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {includeStamp ? (
                  <OfficialReportStamp reportData={reportData} studioFormatting={effectiveStudioPass} maxWidth={135} maxHeight={64} />
                ) : null}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 2-Up A4 Print Sheet for Theology Cards.
 * Stacks two A5-landscape cards on an A4 portrait sheet with a 1mm cut line.
 * Print CSS gives each card a fixed 148mm slot so the lower card cannot spill off-page.
 */
export function Theology2UpPrintSheet({
  topReport,
  bottomReport,
  studioFormatting,
  isLastPrinted = false,
}: {
  topReport: any
  bottomReport?: any
  studioFormatting?: any
  isLastPrinted?: boolean
}) {
  return (
    <div
      role="report"
      data-report-type="TheologyMOTReport"
      data-report-orientation="portrait"
      data-last-printed={isLastPrinted ? 'true' : 'false'}
      className="report-container theology-2up-sheet a4-two-up-page"
      style={{
        width: '794px',
        height: '1123px',
        maxHeight: '1123px',
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        flexGrow: 0,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: theologyCSS }} />

      {/* TOP CARD SLOT — exactly 558px */}
      <div
        data-slot="half-card"
        className="theology-card-slot half-card-slot theology-2up-card-slot"
        style={{
          width: '794px',
          height: '558px',
          maxHeight: '558px',
          overflow: 'hidden',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        <TheologyCard reportData={topReport} studioFormatting={studioFormatting} />
      </div>

      {/* CUT LINE — 7px */}
      <div
        data-slot="cut-divider"
        className="cut-divider-slot cut-divider theology-2up-cutline"
        style={{
          height: '7px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1.5px dashed #94a3b8',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            position: 'absolute',
            background: '#ffffff',
            padding: '0 12px',
            fontSize: '9px',
            color: '#64748b',
            fontFamily: 'sans-serif',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}
        >
          ✂ Cut Here / اقصص هنا
        </span>
      </div>

      {/* BOTTOM CARD SLOT — exactly 558px */}
      <div
        data-slot="half-card"
        className="theology-card-slot half-card-slot theology-2up-card-slot"
        style={{
          width: '794px',
          height: '558px',
          maxHeight: '558px',
          overflow: 'hidden',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        {bottomReport ? (
          <TheologyCard reportData={bottomReport} studioFormatting={studioFormatting} />
        ) : (
          <div style={{ width: '794px', height: '558px', background: '#ffffff' }} />
        )}
      </div>
    </div>
  )
}

export default function TheologyMOTReport({ reportData, studioFormatting: studioFormattingProp }: any) {
  const studioFormatting = useStudioFormatting(studioFormattingProp, reportData?.settings?.report_studio_config)
  return (
    <ReportContainer reportType="TheologyMOTReport">
      <style dangerouslySetInnerHTML={{ __html: theologyCSS }} />
      <TheologyCard reportData={reportData} studioFormatting={studioFormatting} />
    </ReportContainer>
  )
}
