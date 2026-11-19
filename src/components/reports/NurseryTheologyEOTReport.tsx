import {
  getTheologyComment,
  getNurseryTheologySubjectRemark,
  resolveDistinctNurseryTheologyComments,
} from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'
import { CleanSignatureImage } from '@/components/reports/CleanSignatureImage'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import { normalizeSchoolLogoUrl } from '@/lib/school-settings-helper'
import { getClassTeacherSignatureKey } from '@/utils/signatures'
import { NurseryEducativeWatermark } from '@/components/reports/NurseryEducativeWatermark'
import { NurseryCornerDecor, NurseryPlayfulHeaderArt } from '@/components/reports/NurseryPlayfulVectorDecor'
import { useStudioFormatting, resolveEffectiveStudioStyle } from '@/lib/studio-config-store'

const THEO_PILL_PALETTES = [
  { bg: '#ECFDF5', border: '#6EE7B7', iconBg: '#D1FAE5', badgeAccent: '#047857' },
  { bg: '#FEFCE8', border: '#FDE047', iconBg: '#FEF08A', badgeAccent: '#B45309' },
  { bg: '#EFF6FF', border: '#93C5FD', iconBg: '#DBEAFE', badgeAccent: '#1D4ED8' },
  { bg: '#FDF2F8', border: '#F9A8D4', iconBg: '#FCE7F3', badgeAccent: '#BE185D' },
  { bg: '#F5F3FF', border: '#C4B5FD', iconBg: '#EDE9FE', badgeAccent: '#6D28D9' },
]

export default function NurseryTheologyEOTReport({ reportData, studioFormatting: studioFormattingProp }: any) {
  const studioFormatting = useStudioFormatting(studioFormattingProp, reportData?.settings?.report_studio_config)
  const effective = resolveEffectiveStudioStyle(studioFormatting, reportData, 'nursery-theology-eot')
  const effectiveStudioPass = { ...studioFormatting, ...effective, stampInkColor: effective.stampColor }
  const nurseryTheme = effective.nurseryTheme || 'islamic-garden'
  const isLineArt = nurseryTheme === 'lineart' || studioFormatting.themeId === 'monochrome'
  const isIslamicGarden = nurseryTheme === 'islamic-garden' && !isLineArt
  const isPlayful = (nurseryTheme === 'playful' || nurseryTheme === 'islamic-garden') && !isLineArt
  const decorVariant = nurseryTheme === 'playful' ? 'secular' : 'islamic-garden'
  const includeSignatures = effective.showSignatures
  const includeStamp = effective.showStamp

  const rawClassName =
    reportData?.student?.class_name ||
    reportData?.student?.theology_class_english ||
    reportData?.student?.theology_class_arabic ||
    reportData?.class_name ||
    ''
  const theoTeacherKey = getClassTeacherSignatureKey(rawClassName, true)
  const sigMap = reportData?.signatures || {}
  const fallbackTeacherSig =
    sigMap?.['theology-teacher-baby'] ||
    sigMap?.['theology-teacher-middle'] ||
    sigMap?.['theology-teacher-top'] ||
    Object.entries(sigMap).find(
      ([k, v]) => k.startsWith('theology-teacher-') && Boolean(v)
    )?.[1] ||
    null
  const classTeacherSignatureUrl =
    sigMap?.['theology_class_teacher'] ||
    (theoTeacherKey ? sigMap?.[theoTeacherKey] : null) ||
    sigMap?.['theology-head'] ||
    fallbackTeacherSig ||
    null
  const headTeacherSignatureUrl =
    sigMap?.['head_teacher'] ?? sigMap?.['head-teacher'] ?? null

  const toAr = (val: number | string | null | undefined): string => {
    if (val == null) return '--'
    return String(val).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
  }

  const toHijri = (gregorianYear: number): number => Math.round((gregorianYear - 622) * (33 / 32))

  const getGradeColor = (score: number | null) => {
    if (isLineArt) return { bg: '#FFFFFF', border: '#1E293B', color: '#0F172A' }
    if (score == null) return { bg: '#FFFFFF', border: '#D97706', color: '#B45309' }
    if (score >= 85) return { bg: '#DCFCE7', border: '#16A34A', color: '#14532D' }
    if (score >= 75) return { bg: '#DBEAFE', border: '#2563EB', color: '#1E3A8A' }
    if (score >= 65) return { bg: '#FEF3C7', border: '#D97706', color: '#92400E' }
    if (score >= 50) return { bg: '#FFEDD5', border: '#EA580C', color: '#9A3412' }
    return { bg: '#FFE4E6', border: '#DC2626', color: '#9F1239' }
  }

  const getSubjectIcon = (arabicName: string) => {
    if (!arabicName) return '☪️'
    if (arabicName.includes('قرآن')) return '📖'
    if (arabicName.includes('حديث')) return '💬'
    if (arabicName.includes('فقه')) return '⚖️'
    if (arabicName.includes('توحيد') || arabicName.includes('عقيدة')) return '❤️'
    if (arabicName.includes('سيرة')) return '🐪'
    if (arabicName.includes('أدعية') || arabicName.includes('دعاء')) return '🤲'
    if (arabicName.includes('لغة عربية') || arabicName.includes('عربي')) return '✍️'
    return '☪️'
  }

  const computedDefaultTeacherComment = getTheologyComment(
    reportData?.theology?.total ?? null,
    reportData?.student?.gender,
    reportData?.settings?.theology_remarks,
    reportData?.theology?.division,
    reportData?.theology?.subjects?.length || 4
  )
  const { teacherComment, headTeacherComment } = resolveDistinctNurseryTheologyComments({
    teacherComment: reportData?.theology?.teacher_comment || computedDefaultTeacherComment,
    headComment: reportData?.theology?.head_teacher_comment,
    gender: reportData?.student?.gender,
  })

  const accentPrimary = isLineArt ? '#1E293B' : '#0D5C3A'
  const accentGold = isLineArt ? '#334155' : '#D97706'
  const paperBg = isPlayful ? '#FFFDF9' : '#FFFFFF'

  return (
    <ReportContainer reportType="NurseryTheologyEOTReport">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.nursery-theology-eot-report,
.nursery-theology-eot-report * {
    box-sizing: border-box;
}

.nursery-theology-eot-report {
    --nursery-gold: ${accentGold};
    --nursery-text: #1E293B;
    --primary-green: ${accentPrimary};
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    direction: rtl;
    padding: 12px 18px 10px 18px;
    margin: 0 auto;
    background: ${paperBg};
    font-family: ${effective.arabicFontFamilyCss} !important;
    --report-font-scale: ${effective.arabicFontScaleMultiplier};
    font-size: calc(100% * var(--report-font-scale, 1));
    color: var(--nursery-text);
}

@media print {
    .nursery-theology-eot-report {
        box-shadow: none;
        margin: 0;
        background: #FFFFFF !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
}

.nursery-theology-eot-report > *:not(.watermark-bg) {
    position: relative;
    z-index: 2;
}

/* JOYFUL LIGHT HEADER WITH BASMALA & SCALLOPED CLOUD BORDER */
.nursery-theology-eot-report .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    text-align: center;
    background: ${isLineArt ? '#FFFFFF' : 'linear-gradient(180deg, #ECFDF5 0%, #FFFBEB 100%)'};
    padding: 8px 14px 10px 14px;
    border-radius: 18px;
    border: 2.5px solid ${isLineArt ? '#334155' : isIslamicGarden ? '#047857' : '#D97706'};
    color: var(--primary-green);
    flex-shrink: 0;
}

.nursery-theology-eot-report .header-badge {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
}
.nursery-theology-eot-report .header-badge img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}
.nursery-theology-eot-report .header-center {
    flex: 1;
    min-width: 0;
    text-align: center;
}

.nursery-theology-eot-report .basmala {
    font-family: 'Amiri', serif;
    font-size: 20px;
    font-weight: 900;
    color: ${accentPrimary};
    margin-bottom: 2px;
    line-height: 1.2;
}

.nursery-theology-eot-report .school-name {
    font-size: 20px;
    font-weight: 900;
    color: #0F172A;
    margin: 2px 0 4px 0;
    line-height: 1.2;
}

.nursery-theology-eot-report .report-badge {
    background: ${isLineArt ? '#F8FAFC' : '#FEF3C7'};
    color: ${isLineArt ? '#0F172A' : '#92400E'};
    display: inline-block;
    padding: 3px 18px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 900;
    border: 1.5px solid var(--nursery-gold);
}

/* CHILD IDENTITY GRID */
.nursery-theology-eot-report .info-grid {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 14px;
    margin: 6px 0 0 0;
    background: ${isLineArt ? '#FFFFFF' : '#F8FAFC'};
    padding: 9px 14px;
    border-radius: 14px;
    border: 1.5px solid ${isLineArt ? '#334155' : '#CBD5E1'};
}

.nursery-theology-eot-report .info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 800;
}

.nursery-theology-eot-report .dot-line {
    flex: 1;
    min-width: 0;
    border-bottom: 1.5px dotted #94A3B8;
    min-height: 22px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 6px 2px 6px;
    color: #0F172A;
    font-weight: 900; font-size: 17px;
}

/* SEPARATED PILL SUBJECT ROWS */
.nursery-theology-eot-report .subjects-container {
    flex: 1 1 auto;
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    gap: 5px;
}

.nursery-theology-eot-report .table-head {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1.8fr 0.9fr 1.6fr;
    text-align: center;
    font-weight: 900;
    font-size: 14.5px;
    padding: 3px 8px;
    border-bottom: 1.5px solid ${isLineArt ? '#1E293B' : '#CBD5E1'};
    color: var(--primary-green);
    direction: rtl;
}

.nursery-theology-eot-report .subject-row {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1.8fr 0.9fr 1.6fr;
    align-items: center;
    background: #FFFFFF;
    border: 1.5px solid #CBD5E1;
    border-radius: 12px;
    padding: 6px 12px;
    color: #0F172A;
}

.nursery-theology-eot-report .subject-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 900;
    font-size: 16px;
    color: #0F172A;
}

.nursery-theology-eot-report .grade-circle-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
}

.nursery-theology-eot-report .grade-circle {
    position: relative;
    width: 40px;
    height: 40px;
    border: 2.5px solid ${isLineArt ? '#334155' : isIslamicGarden ? '#047857' : '#D97706'};
    border-radius: 50%;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 16.5px;
    color: var(--nursery-gold);
}

.nursery-theology-eot-report .comment-text {
    padding: 2px 8px;
    font-size: 16px;
    color: ${isLineArt ? '#0F172A' : '#0D5C3A'};
    font-weight: 900;
    text-align: center;
    direction: rtl;
    line-height: 1.3;
    word-break: break-word;
    white-space: normal;
}

/* COMPACT ARABIC GRADING KEY */
.nursery-theology-eot-report .grading-key-card {
    flex: 0 0 auto;
    margin-top: 6px;
    background: ${isLineArt ? '#FFFFFF' : '#F8FAFC'};
    border: 1.5px solid ${isLineArt ? '#334155' : '#93C5FD'};
    border-radius: 12px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 800;
}

/* DISTINCT REMARKS AREA */
.nursery-theology-eot-report .remarks-area {
    flex: 0 0 auto;
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 9px;
}

.nursery-theology-eot-report .remark-box {
    border: 2px dashed var(--nursery-gold);
    border-radius: 14px;
    padding: 10px 14px 6px 14px;
    position: relative;
    background: ${isLineArt ? '#FFFFFF' : '#FFFAF0'};
}

.nursery-theology-eot-report .remark-label {
    position: absolute;
    top: -11px;
    right: 16px;
    background: var(--nursery-gold);
    color: #FFFFFF;
    padding: 1px 12px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 800;
}

.nursery-theology-eot-report .signature-row {
    flex: 0 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 8px;
    padding: 0 8px;
}

.nursery-theology-eot-report .sign-field {
    text-align: center;
    font-weight: 800;
    font-size: 14px;
}

.nursery-theology-eot-report .sign-line {
    width: 170px;
    border-top: none;
    margin-top: 4px;
}

.nursery-theology-eot-report .footer-stamp {
    width: 208px;
    height: 121px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
        `,
        }}
      />

      <div
        className="nursery-theology-eot-report font-cairo"
        dir="rtl"
        data-nursery-theme={nurseryTheme}
        style={{ position: 'relative' }}
      >
        <div className="watermark-bg" />
        <NurseryEducativeWatermark
          templateId="nursery-theology-eot"
          variant="theology"
          logoUrl={normalizeSchoolLogoUrl(reportData?.settings?.logo_url)}
          studioFormatting={effectiveStudioPass}
          includeEducativeArt={nurseryTheme !== 'classic'}
        />
        {nurseryTheme !== 'classic' && <NurseryCornerDecor lineArt={isLineArt} variant={decorVariant} />}

        {/* HEADER */}
        <div className="header">
          {nurseryTheme !== 'classic' ? (
            <NurseryPlayfulHeaderArt side="right" variant={decorVariant} lineArt={isLineArt} width={96} height={74} />
          ) : (
            <div style={{ width: '48px' }} />
          )}

          <div className="header-center">
            <div className="basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div className="header-badge">
                <img
                  src={normalizeSchoolLogoUrl(reportData?.settings?.logo_url)}
                  alt="School Badge"
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith('/school_logo.svg')) {
                      e.currentTarget.src = '/school_logo.svg'
                    }
                  }}
                />
              </div>
              <div className="school-name">
                {effective.schoolHeader.nameArabic ||
                  reportData?.settings?.arabic_name ||
                  'مدرسة جدة الإسلامية للروضة والإبتدائية'}
              </div>
            </div>
            <div className="report-badge">بطاقة تقييم مرحلة الروضة — نجوم جدة الصغار</div>
          </div>

          {nurseryTheme !== 'classic' ? (
            <NurseryPlayfulHeaderArt side="left" variant={decorVariant} lineArt={isLineArt} width={96} height={74} />
          ) : (
            <div className="header-badge" style={{ visibility: 'hidden' }}>
              <img src="/school_logo.svg" alt="" />
            </div>
          )}
        </div>

        {/* CHILD IDENTITY CARD */}
        <div className="info-grid">
          <div className="info-item" style={{ gridColumn: 'span 2' }}>
            <span>اسم الطفل/ة:</span>
            <div className="dot-line pupil-name" style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>
              {reportData?.student?.arabic_name || reportData?.student?.name || '___'}
            </div>
          </div>
          <div className="info-item">
            <span>الروضة:</span>
            <div className="dot-line" style={{ fontSize: '16.5px', fontWeight: 900, color: '#0F172A' }}>
              {reportData?.student?.theology_class_arabic ?? reportData?.student?.class_name}
            </div>
          </div>
          <div className="info-item">
            <span>الفترة:</span>
            <div className="dot-line" style={{ fontSize: '16.5px', fontWeight: 900, color: '#0F172A' }}>
              {toAr(reportData?.term?.term_number)}
            </div>
          </div>
          <div className="info-item">
            <span>السنة:</span>
            <div className="dot-line" style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
              {toAr(toHijri(Number(reportData?.term?.academic_year || 2026)))} هـ /{' '}
              {toAr(reportData?.term?.academic_year || 2026)} م
            </div>
          </div>
          <div className="info-item">
            <span>عدد الأطفال:</span>
            <div className="dot-line" style={{ fontSize: '16.5px', fontWeight: 900, color: '#0F172A' }}>
              {toAr(reportData?.meta?.total_students)}
            </div>
          </div>
        </div>

        {/* SEPARATED ROUNDED-PILL SUBJECT CARDS */}
        <div className="subjects-container">
          <div className="table-head">
            <div style={{ textAlign: 'right', paddingRight: '8px' }}>المادة</div>
            <div>الدرجة</div>
            <div>التقدير / التعليق</div>
          </div>

          {(reportData?.theology?.subjects || []).map((subject: any, idx: number) => {
            const colors = getGradeColor(subject.score)
            const pillPal = isLineArt
              ? { bg: '#FFFFFF', border: '#334155', iconBg: '#F1F5F9', badgeAccent: '#1E293B' }
              : THEO_PILL_PALETTES[idx % THEO_PILL_PALETTES.length]
            const resolvedRemark = getNurseryTheologySubjectRemark(subject.score, subject.theology_remark)

            return (
              <div
                key={subject.subject_name_arabic || idx}
                className="subject-row"
                style={{
                  background: pillPal.bg,
                  borderColor: pillPal.border,
                  borderRight: `5px solid ${pillPal.badgeAccent}`,
                }}
              >
                <div className="subject-name">
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '999px',
                      background: pillPal.iconBg,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      flexShrink: 0,
                    }}
                  >
                    {getSubjectIcon(subject.subject_name_arabic)}
                  </span>
                  <span>{subject.subject_name_arabic}</span>
                </div>

                <div className="grade-circle-wrap">
                  <div
                    className="grade-circle"
                    style={{
                      background: colors.bg,
                      borderColor: colors.border,
                      color: colors.color,
                    }}
                  >
                    {!isLineArt && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          left: '-6px',
                          fontSize: '11px',
                          lineHeight: 1,
                        }}
                      >
                        ★
                      </span>
                    )}
                    {toAr(subject.score)}
                  </div>
                </div>

                <div className="comment-text">{resolvedRemark}</div>
              </div>
            )
          })}
        </div>

        {/* COMPACT BALANCED ARABIC GRADING KEY */}
        <div className="grading-key-card" data-testid="nursery-theology-grading-key">
          <span style={{ color: accentPrimary, fontWeight: 900 }}>سلم التقديرات:</span>
          <span>ممتاز: ٨٥ – ١٠٠</span>
          <span>جيد جداً: ٧٥ – ٨٤</span>
          <span>جيد: ٦٥ – ٧٤</span>
          <span>مقبول: ٥٠ – ٦٤</span>
          <span>يحتاج لمتابعة: أقل من ٥٠</span>
        </div>

        {/* DISTINCT CLASS TEACHER & HEAD TEACHER REMARKS */}
        <div className="remarks-area">
          <div className="remark-box">
            <span className="remark-label">ملاحظات مربي الفصل</span>
            <div style={{ minHeight: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
              <span
                data-testid="nursery-theology-teacher-comment"
                style={{
                  color: '#1E40AF',
                  fontWeight: 800,
                  fontSize: `${effective.arabicCommentFontSizePx}px`,
                  lineHeight: 1.35,
                  textAlign: 'center',
                  direction: 'rtl',
                }}
              >
                {teacherComment}
              </span>
            </div>
          </div>

          <div className="remark-box">
            <span className="remark-label">ملاحظات مدير المدرسة</span>
            <div style={{ minHeight: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
              <span
                data-testid="nursery-theology-head-comment"
                style={{
                  color: '#0D5C3A',
                  fontWeight: 800,
                  fontSize: `${effective.arabicCommentFontSizePx}px`,
                  lineHeight: 1.35,
                  textAlign: 'center',
                  direction: 'rtl',
                }}
              >
                {headTeacherComment}
              </span>
            </div>
          </div>
        </div>

        {/* SIGNATURES & OFFICIAL STAMP */}
        <div className="signature-row">
          <div className="sign-field">
            <div>توقيع مربي الفصل</div>
            <div
              className="sign-line"
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                height: '34px',
                minWidth: '130px',
                borderBottom: '1.5px dotted #334155',
              }}
            >
              {includeSignatures && classTeacherSignatureUrl && (
                <CleanSignatureImage
                  src={classTeacherSignatureUrl}
                  alt="Signature"
                  style={{ height: '34px', width: '112px', objectFit: 'contain', marginBottom: '-5px' }}
                  studioFormatting={effectiveStudioPass}
                />
              )}
            </div>
          </div>

          <div
            className="footer-stamp"
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

          <div className="sign-field">
            <div>توقيع مدير المدرسة</div>
            <div
              className="sign-line"
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                height: '34px',
                minWidth: '130px',
                borderBottom: '1.5px dotted #334155',
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
        </div>
      </div>
    </ReportContainer>
  )
}
