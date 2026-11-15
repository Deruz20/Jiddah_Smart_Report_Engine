import { getTheologyComment } from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'
import { CleanSignatureImage } from '@/components/reports/CleanSignatureImage'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import { normalizeSchoolLogoUrl } from '@/lib/school-settings-helper'
import { transliterateEnglishToArabic } from '@/lib/transliterate'

import { getClassTeacherSignatureKey } from '@/utils/signatures'
import { NurseryEducativeWatermark } from '@/components/reports/NurseryEducativeWatermark'
import { useStudioFormatting, resolveEffectiveStudioStyle } from '@/lib/studio-config-store'

export default function NurseryTheologyEOTReport({ reportData, studioFormatting: studioFormattingProp }: any) {
  const studioFormatting = useStudioFormatting(studioFormattingProp, reportData?.settings?.report_studio_config)
  const effective = resolveEffectiveStudioStyle(studioFormatting, reportData)
  const includeSignatures = effective.showSignatures
  const includeStamp = effective.showStamp

  const rawClassName =
    reportData?.student?.class_name ||
    reportData?.student?.theology_class_english ||
    reportData?.student?.theology_class_arabic ||
    reportData?.class_name ||
    ''
  const theoTeacherKey = getClassTeacherSignatureKey(rawClassName, true)
  const secTeacherKey = getClassTeacherSignatureKey(rawClassName, false)
  const sigMap = reportData?.signatures || {}
  const fallbackTeacherSig =
    sigMap['class-teacher-baby'] ||
    sigMap['class-teacher-middle'] ||
    sigMap['class-teacher-top'] ||
    sigMap['theology-teacher-baby'] ||
    sigMap['theology-teacher-middle'] ||
    sigMap['theology-teacher-top'] ||
    Object.entries(sigMap).find(([k, v]) => (k.startsWith('class-teacher-') || k.startsWith('theology-teacher-')) && Boolean(v))?.[1] ||
    null
  const classTeacherSignatureUrl =
    (theoTeacherKey && sigMap[theoTeacherKey]) ||
    (secTeacherKey && sigMap[secTeacherKey]) ||
    sigMap['theology-head'] ||
    fallbackTeacherSig ||
    null

  const getTheologyRemark = (score: number | null): string => {
    if (score == null) return '--'
    if (score >= 90) return 'ممتاز'
    if (score >= 80) return 'جيد جداً'
    if (score >= 70) return 'جيد'
    if (score >= 60) return 'جيد'
    if (score >= 50) return 'مقبول'
    return 'ضعيف'
  }

  const toAr = (val: number | string | null | undefined): string => {
    if (val == null) return '--'
    return String(val).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])
  }

  const toHijri = (gregorianYear: number): number =>
    Math.round((gregorianYear - 622) * (33 / 32))

  const termInArabic = (n: number): string => {
    if (n === 1) return 'الأولى'
    if (n === 2) return 'الثاني'
    if (n === 3) return 'الثالث'
    return String(n)
  }

  const getGradeColor = (score: number | null) => {
    if (score == null) return { bg: '#fff', border: 'var(--nursery-gold)', color: 'var(--nursery-gold)' }
    if (score >= 90) return { bg: '#dcfce7', border: '#16a34a', color: '#16a34a' } // A - Green
    if (score >= 80) return { bg: '#dbeafe', border: '#2563eb', color: '#2563eb' } // B - Blue
    if (score >= 70) return { bg: '#fef3c7', border: '#d97706', color: '#d97706' } // C - Yellow
    if (score >= 50) return { bg: '#ffedd5', border: '#ea580c', color: '#ea580c' } // D - Orange
    return { bg: '#fee2e2', border: '#dc2626', color: '#dc2626' } // E - Red
  }

  const getSubjectIcon = (arabicName: string) => {
    if (!arabicName) return '☪️'
    if (arabicName.includes('قرآن')) return '📖'
    if (arabicName.includes('حديث')) return '💬'
    if (arabicName.includes('فقه')) return '⚖️'
    if (arabicName.includes('عقيدة')) return '❤️'
    if (arabicName.includes('سيرة')) return '🐪'
    if (arabicName.includes('أدعية') || arabicName.includes('دعاء')) return '🤲'
    if (arabicName.includes('لغة عربية') || arabicName.includes('عربي')) return '✍️'
    return '☪️'
  }

  return (
    <ReportContainer reportType="NurseryTheologyEOTReport">
      <style dangerouslySetInnerHTML={{
        __html: `
.nursery-theology-eot-report,
.nursery-theology-eot-report * {
    box-sizing: border-box;
}

.nursery-theology-eot-report {
    --nursery-blue: #e3f2fd;
    --nursery-mint: #e8f5e9;
    --nursery-gold: ${effective.secondaryColor};
    --nursery-text: #2c3e50;
    --primary-green: ${effective.primaryColor};
    --secondary-green: ${effective.headerAccentColor};
    --data-navy: #0f172a;
    --data-indigo: #1e293b;
    --data-teal: #0369a1;
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    direction: rtl;
    padding: 5mm 10mm;
    margin: 0 auto;
    font-family: ${effective.fontFamilyCss} !important;
    zoom: ${effective.fontScaleMultiplier};
    color: var(--nursery-text);
}

@media print {
    .nursery-theology-eot-report {
        box-shadow: none;
        margin: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .nursery-theology-eot-report .info-grid {
        gap: 8px;
    }
    .nursery-theology-eot-report .subject-row {
        margin-bottom: 8px;
    }
    .nursery-theology-eot-report .remarks-area {
        margin-top: 15px;
    }
    .nursery-theology-eot-report .remark-box {
        margin-bottom: 8px;
    }
    .nursery-theology-eot-report .signature-row {
        margin-top: 15px;
    }
    .nursery-theology-eot-report .footer-stamp {
        margin-top: 20px;
    }
}

.nursery-theology-eot-report::before {
    content: "⭐";
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 30px;
    opacity: 0.5;
}

.nursery-theology-eot-report::after {
    content: "🌙";
    position: absolute;
    bottom: 10px;
    left: 10px;
    font-size: 30px;
    opacity: 0.5;
}

.nursery-theology-eot-report .watermark-bg {
    position: absolute;
    inset: 0;
    background: url('${normalizeSchoolLogoUrl(effective.schoolHeader.logoUrl)}') center center no-repeat;
    background-size: contain;
    opacity: ${effective.watermarkOpacity};
    pointer-events: none;
    z-index: 0;
}

.nursery-theology-eot-report > *:not(.watermark-bg) {
    position: relative;
    z-index: 1;
}

.nursery-theology-eot-report .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: center;
    background: linear-gradient(135deg, var(--primary-green), var(--secondary-green));
    padding: 10px 18px;
    border-radius: 16px;
    border: 3px solid var(--nursery-gold);
    color: white;
}
.nursery-theology-eot-report .header-badge {
    width: 60px;
    height: 60px;
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
    text-align: center;
}

.nursery-theology-eot-report .basmala {
    font-family: 'Amiri', serif;
    font-size: 36px;
    color: white;
    margin-bottom: 10px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.nursery-theology-eot-report .school-name {
    font-size: 32px;
    font-weight: 900;
    color: white;
    margin: 5px 0;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.nursery-theology-eot-report .report-badge {
    background: rgba(255,255,255,0.2);
    color: white;
    display: inline-block;
    padding: 5px 30px;
    border-radius: 999px;
    font-size: 22px;
    font-weight: 700;
    margin-top: 10px;
    border: 1px solid rgba(255,255,255,0.3);
}

.nursery-theology-eot-report .info-grid {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 10px 0;
    background: #f8fafc;
    padding: 10px 15px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.nursery-theology-eot-report .info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
}

.nursery-theology-eot-report .dot-line {
    flex: 1;
    min-width: 0;
    border-bottom: 1.5px dotted #9ca3af;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 8px 2px 8px;
    color: var(--data-navy);
    font-weight: 900;
    font-size: 17px;
}

.nursery-theology-eot-report .subjects-container {
    flex: 1 1 auto;
    margin-top: 10px;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.nursery-theology-eot-report .subject-row {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1.5fr 1fr 2fr;
    align-items: center;
    background: #fff;
    border: 2px solid var(--nursery-mint);
    margin-bottom: 8px;
    border-radius: 12px;
    overflow: visible;
    color: var(--primary-green);
    border-right: 5px solid var(--nursery-gold);
}

.nursery-theology-eot-report .grade-circle-wrap {
    display: flex;
    justify-content: center;
    padding: 5px;
}

.nursery-theology-eot-report .grade-circle {
    width: 50px;
    height: 50px;
    border: 3px solid var(--nursery-gold);
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    color: var(--nursery-gold);
}

.nursery-theology-eot-report .comment-text {
    padding: 10px;
    font-size: 16px;
    color: var(--data-teal);
    font-style: italic;
    font-weight: 900;
    text-align: right;
    direction: rtl;
    line-height: 1.4;
    word-break: break-word;
    white-space: normal;
}

.nursery-theology-eot-report .table-head {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1.5fr 1fr 2fr;
    text-align: center;
    font-weight: 900;
    font-size: 18px;
    margin-bottom: 10px;
    color: var(--primary-green);
    direction: rtl;
}

.nursery-theology-eot-report .subject-name {
    word-break: break-word;
    white-space: normal;
    padding: 0.5rem;
}

.nursery-theology-eot-report .remarks-area {
    flex: 0 0 auto;
    margin-top: 20px;
}

.nursery-theology-eot-report .remark-box {
    border: 2px dashed var(--nursery-gold);
    border-radius: 15px;
    padding: 12px;
    margin-bottom: 12px;
    position: relative;
    background: #fffaf0;
}

.nursery-theology-eot-report .remark-label {
    position: absolute;
    top: -12px;
    right: 20px;
    background: var(--nursery-gold);
    color: white;
    padding: 2px 15px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
}

.nursery-theology-eot-report .signature-row {
    flex: 0 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 20px;
    padding: 0 10px;
}

.nursery-theology-eot-report .sign-field {
    text-align: center;
    font-weight: 700;
}

.nursery-theology-eot-report .sign-line {
    width: 180px;
    border-top: none;
    margin-top: 8px;
}

.nursery-theology-eot-report .footer-stamp {
    width: 140px;
    height: 90px;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
        `
      }} />

      <div className="nursery-theology-eot-report font-cairo" dir="rtl" style={{ position: 'relative' }}>
        <div className="watermark-bg"></div>
        <NurseryEducativeWatermark
          logoUrl={normalizeSchoolLogoUrl(reportData?.settings?.logo_url)}
          studioFormatting={studioFormatting}
          includeEducativeArt={false}
        />
        <div className="header">
          <div className="header-badge">
            <img
              src={normalizeSchoolLogoUrl(reportData?.settings?.logo_url)}
              alt="School Badge"
              onError={(e) => {
                if (!e.currentTarget.src.endsWith('/school_logo.svg')) {
                  e.currentTarget.src = '/school_logo.svg';
                }
              }}
            />
          </div>
          <div className="header-center">
            <div className="basmala">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْم</div>
            <div className="school-name">{effective.schoolHeader.nameArabic || reportData?.settings?.arabic_name || "مدرسة جدة الإسلامية للروضة والإبتدائية"}</div>
            <div className="report-badge">بطاقة تقرير للروضة</div>
          </div>
          <div className="header-badge" style={{ visibility: 'hidden' }}>
            <img src="/school_logo.svg" alt="" />
          </div>
        </div>

        <div className="info-grid">
          <div className="info-item" style={{ gridColumn: 'span 2' }}>
            <span>اسم الطفل/ة:</span>
            <div className="dot-line pupil-name" style={{ fontSize: '21px', fontWeight: 900, color: '#0F172A' }}>{reportData?.student?.arabic_name || "___"}</div>
          </div>
          <div className="info-item">
            <span>الروضة:</span>
            <div className="dot-line" style={{ fontSize: '16.5px', fontWeight: 900, color: '#0F172A' }}>{reportData?.student?.theology_class_arabic ?? reportData?.student?.class_name}</div>
          </div>
          <div className="info-item">
            <span>الفترة:</span>
            <div className="dot-line" style={{ fontSize: '16.5px', fontWeight: 900, color: '#0F172A' }}>{toAr(reportData?.term?.term_number)}</div>
          </div>
          <div className="info-item">
            <span>السنة:</span>
            <div className="dot-line medium" style={{ fontSize: '16.5px', fontWeight: 900, color: '#0F172A' }}>{toAr(toHijri(Number(reportData?.term?.academic_year)))}</div>
            <span>هـ</span>
            <div className="dot-line medium" style={{ fontSize: '16.5px', fontWeight: 900, color: '#0F172A' }}>{toAr(reportData?.term?.academic_year)}</div>
            <span>م</span>
          </div>
          <div className="info-item">
            <span>عدد الأطفال:</span>
            <div className="dot-line" style={{ fontSize: '16.5px', fontWeight: 900, color: '#0F172A' }}>{toAr(reportData?.meta?.total_students)}</div>
          </div>
        </div>

        <div className="subjects-container">
          <div className="table-head">
            <div>المادة</div>
            <div>الدرجة</div>
            <div>التعليق</div>
          </div>

          {reportData?.theology?.subjects?.map((subject: any) => {
            const colors = getGradeColor(subject.score)
            return (
              <div key={subject.subject_name_arabic} className="subject-row">
                <div className="subject-name">
                  <span className="print:hidden" style={{ fontSize: '18px', marginLeft: '8px' }}>{getSubjectIcon(subject.subject_name_arabic)}</span>
                  {subject.subject_name_arabic}
                </div>
                <div className="grade-circle-wrap">
                  <div className="grade-circle" style={{ background: colors.bg, borderColor: colors.border, color: colors.color, boxShadow: `0 0 10px ${colors.bg}` }}>
                    {toAr(subject.score)}
                  </div>
                </div>
                <div className="comment-text">
                  {subject.theology_remark ?? ''}
                </div>
              </div>
            )
          })}
        </div>

        <div className="remarks-area">
          <div className="remark-box">
            <span className="remark-label">ملاحظات مرب الفصل</span>
            <div style={{ minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
              <span style={{ color: '#1E40AF', fontWeight: 800, fontSize: `${effective.arabicCommentFontSizePx}px`, lineHeight: 1.35, textAlign: 'center', direction: 'rtl' }}>
                {getTheologyComment(reportData?.theology?.total ?? null, reportData?.student?.gender, reportData?.settings?.theology_remarks)}
              </span>
            </div>
          </div>
          <div className="remark-box">
            <span className="remark-label">ملاحظات مدير المدرسة</span>
            <div style={{ minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
              <span style={{ color: '#1E40AF', fontWeight: 800, fontSize: `${effective.arabicCommentFontSizePx}px`, lineHeight: 1.35, textAlign: 'center', direction: 'rtl' }}>
                {getTheologyComment(reportData?.theology?.total ?? null, reportData?.student?.gender, reportData?.settings?.theology_remarks)}
              </span>
            </div>
          </div>
        </div>

        <div className="signature-row">
          <div className="sign-field">
            <div>تقرير مرب الفصل</div>
            <div className="sign-line" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '36px', minWidth: '130px', borderBottom: '1.5px dotted #334155' }}>
              {includeSignatures && classTeacherSignatureUrl && (
                <CleanSignatureImage src={classTeacherSignatureUrl} alt="Signature" style={{ height: '36px', width: '112px', objectFit: 'contain', marginBottom: '-6px' }} studioFormatting={studioFormatting} />
              )}
            </div>
          </div>
          <div className="footer-stamp" style={{ width: '135px', height: '68px', maxWidth: '135px', maxHeight: '68px', overflow: 'hidden', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {includeStamp ? (
              <OfficialReportStamp reportData={reportData} studioFormatting={studioFormatting} maxWidth={135} maxHeight={68} />
            ) : null}
          </div>
          <div className="sign-field">
            <div>تقرير مدير المدرسة</div>
            <div className="sign-line" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '36px', minWidth: '130px', borderBottom: '1.5px dotted #334155' }}>
              {includeSignatures && reportData?.signatures?.['head-teacher'] && (
                <CleanSignatureImage src={reportData.signatures['head-teacher']} alt="Signature" style={{ height: '36px', width: '112px', objectFit: 'contain', marginBottom: '-6px' }} studioFormatting={studioFormatting} />
              )}
            </div>
          </div>
        </div>
      </div>
    </ReportContainer>
  )
}
