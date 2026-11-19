import {
  getClassTeacherComment,
  getHeadTeacherComment,
  getConductRemark,
  getTheologyComment,
  getSubjectRemark,
  getSubjectGradeNumber,
} from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'
import { CleanSignatureImage } from '@/components/reports/CleanSignatureImage'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import { resolveReportBranding, resolveReportGradingBands } from '@/lib/school-settings-helper'
import { getClassTeacherSignatureKey } from '@/utils/signatures'
import { transliterateEnglishToArabic } from '@/lib/transliterate'
import { useStudioFormatting, resolveEffectiveStudioStyle } from '@/lib/studio-config-store'
import { NurseryEducativeWatermark } from '@/components/reports/NurseryEducativeWatermark'

export default function PrimaryEOTReport({ reportData, studioFormatting: studioFormattingProp }: any) {
  const studioFormatting = useStudioFormatting(studioFormattingProp, reportData?.settings?.report_studio_config)
  const effective = resolveEffectiveStudioStyle(studioFormatting, reportData, 'primary-eot')
  const effectiveStudioPass = {
    ...studioFormatting,
    ...effective,
    stampInkColor: effective.stampColor,
  }
  const branding = resolveReportBranding(reportData)
  const gradingBands = resolveReportGradingBands(reportData)

  const className =
    reportData?.class_name ||
    reportData?.class ||
    reportData?.student?.class_name ||
    ''

  const lowerClasses = ['baby', 'middle', 'top', 'p.1', 'p.2', 'p.3']
  const isLower =
    reportData?.section_type === 'lower_primary' ||
    reportData?.section_type === 'nursery' ||
    lowerClasses.some((c) => className.toLowerCase().includes(c))

  const showTheologyPanel =
    reportData?.student?.class_name?.toLowerCase() !== 'p.7' ||
    (reportData?.theology?.subjects && reportData?.theology?.subjects.length > 0)

  const toAr = (val: number | string | null | undefined): string => {
    if (val == null) return '--'
    return String(val).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
  }
  const toArabicNumerals = toAr

  const theologyPosition =
    reportData?.theology?.position ??
    reportData?.theology?.theology_position ??
    reportData?.theology_position ??
    reportData?.meta?.theology_position ??
    reportData?.circular?.position ??
    null

  const theologyTotalStudents =
    reportData?.theology?.total_students ??
    reportData?.theology?.theology_total_students ??
    reportData?.theology_total_students ??
    reportData?.meta?.theology_total_students ??
    reportData?.circular?.total_students ??
    null

  const toHijri = (gregorianYear: number): number =>
    Math.round((gregorianYear - 622) * (33 / 32))

  const printPrefs = reportData?.settings?.print_preferences
  const includeSignatures =
    effective.showSignatures &&
    (printPrefs?.includeSignatures !== undefined ? Boolean(printPrefs.includeSignatures) : true)

  const secularClassTeacherSigUrl = reportData?.signatures?.secular_class_teacher ?? null
  const headTeacherSigUrl =
    reportData?.signatures?.head_teacher ??
    reportData?.signatures?.['head-teacher'] ??
    null
  const theologyTeacherSigUrl = reportData?.signatures?.theology_class_teacher ?? null
  const theologyDosSigUrl = reportData?.signatures?.dos_theology ?? null
  const includeStamp =
    effective.showStamp &&
    (printPrefs?.includeStamp !== undefined ? Boolean(printPrefs.includeStamp) : true)

  const teacherComment =
    reportData?.circular?.class_teacher_comment ||
    getClassTeacherComment(reportData?.circular?.division ?? null, undefined, reportData?.settings?.grading_scale, reportData?.settings?.division_boundaries)
  const headComment =
    reportData?.circular?.head_teacher_comment ||
    getHeadTeacherComment(reportData?.circular?.division ?? null, undefined, reportData?.settings?.grading_scale, reportData?.settings?.division_boundaries)
  const conductRemark =
    reportData?.circular?.conduct_remark ??
    getConductRemark(reportData?.circular?.division ?? null, reportData?.settings?.division_boundaries, reportData?.settings?.promotion_comments?.default_conduct)

  const remarkColor = (remark: string | undefined): string => {
    if (!remark) return "#1d4ed8"
    const r = remark.toLowerCase()
    if (r.includes("excellent") || r.includes("outstanding") || r.includes("ممتاز")) return "#1d4ed8"
    if (r.includes("very good") || r.includes("جيد جداً")) return "#16a34a"
    if (r.includes("good") || r.includes("fairly") || r.includes("جيد")) return "#0e7490"
    if (r.includes("fair") || r.includes("average") || r.includes("مقبول")) return "#ea580c"
    if (r.includes("poor") || r.includes("fail") || r.includes("weak") || r.includes("ضعيف") || r.includes("راسب")) return "#dc2626"
    return "#1d4ed8"
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "........................."
    try {
      const d = new Date(dateString)
      if (isNaN(d.getTime())) return dateString
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
    } catch {
      return dateString
    }
  }

  const arabicSubjects = [
    "القرآن",
    "اللغة",
    "الفقه",
    "التربية",
  ];

  const eotAgg = reportData?.circular?.eot_aggregate ?? reportData?.circular?.aggregate ?? reportData?.total_aggregates ?? null
  const division = reportData?.circular?.eot_division ?? reportData?.circular?.division ?? null
  const formattedTerm = reportData?.term?.term_number ? `Term ${reportData.term.term_number}` : (reportData?.term?.label || 'Term 1')

  const renderSubjectRow = (subject: any, i: number) => (
    <tr key={subject.subject_name} className={i % 2 === 0 ? "row-even" : "row-odd"}>
      <td className="subj-name">{subject.subject_name}</td>
      <td style={{ fontWeight: effective.scoreFontWeight }}>{subject.bot_score ?? "--"}</td>
      <td className="grade-cell">{subject.bot_grade_display ?? subject.bot_agg ?? "--"}</td>
      <td style={{ fontWeight: effective.scoreFontWeight }}>{subject.mot_score ?? "--"}</td>
      <td className="grade-cell">{subject.mot_grade_display ?? subject.mot_agg ?? "--"}</td>
      <td style={{ fontWeight: effective.scoreFontWeight }}>{subject.eot_score ?? "--"}</td>
      <td className="grade-cell">{subject.eot_grade_display ?? subject.eot_agg ?? subject.grade ?? "--"}</td>
      <td className="remark-cell" style={{ color: remarkColor(subject.remark) }}>
        {subject.remark || (subject.eot_score != null ? getSubjectRemark(getSubjectGradeNumber(subject.eot_score, gradingBands), gradingBands) : subject.mot_score != null ? getSubjectRemark(getSubjectGradeNumber(subject.mot_score, gradingBands), gradingBands) : "")}
      </td>
      <td style={{ textTransform: 'uppercase', fontFamily: '"Caveat", cursive', fontWeight: 'bold', fontSize: '1.2em', color: effective.primaryColor }}>{(subject.teacher_initials || '').toUpperCase()}</td>
    </tr>
  )

  return (
    <ReportContainer
      reportType="PrimaryEOTReport"
      primaryFont={branding.primaryFont}
      arabicFont={branding.arabicFont}
      themePreset={branding.themePreset}
      themeColor={effective.primaryColor}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Montserrat:wght@500;600;700;800;900&display=swap');

        /* ── RESPONSIVE & PRINT ARCHITECTURE ── */
        .print-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        /* ── PAGE CONTAINER ── */
        .landscape-page {
          --report-primary-color: ${effective.primaryColor};
          --report-secondary-color: ${effective.secondaryColor};
          --report-border-color: ${effective.secondaryColor};
          --report-accent-color: ${effective.headerAccentColor};
          width: 100%;
          height: 100%;
          background: white;
          padding: 2.5mm 4mm;
          margin: 0;
          position: relative;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          flex: 1;
          font-family: ${effective.fontFamilyCss} !important;
        }

        .landscape-page * { box-sizing: border-box; }
        p, h1, h2, h3, h4, h5, h6 { margin: 0; }

        /* ── PREMIUM DOUBLE BORDERS ── */
        .outer-border {
          border: 4px solid ${effective.secondaryColor};
          padding: 2px;
          flex: 1; 
          display: flex;
          flex-direction: column;
        }
        
        .inner-border {
          border: 1.5px solid ${effective.primaryColor};
          padding: 3px 12px;
          flex: 1; 
          position: relative;
          display: flex;
          flex-direction: column;
          background: #ffffff;
        }

        /* ── WATERMARK ── */
        .inner-border::before {
          content: "";
          position: absolute;
          inset: 0;
          background: url('${branding.logoUrl}') center center no-repeat;
          background-size: 420px;
          opacity: 0;
          pointer-events: none;
          z-index: 0;
        }
        
        .content-layer {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: space-between;
          gap: 2.5px;
          font-family: ${effective.fontFamilyCss} !important;
          --report-font-scale: ${effective.fontScaleMultiplier};
        }

        /* ── HEADER SECTION ── */
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
          padding-bottom: 2px;
          overflow: visible;
        }
        
        .header-left { flex: 0 0 36%; overflow: visible; }
        .header-left h1 {
          color: ${effective.headerAccentColor};
          font-size: 22px;
          font-weight: 900;
          margin: 0 0 3px 0;
          line-height: 1.15;
          letter-spacing: -0.3px;
        }
        .header-left p {
          color: #4b5563;
          font-size: 11.5px;
          font-weight: 600;
          line-height: 1.2;
          margin: 1.5px 0;
        }
        
        .header-center {
          flex: 0 0 28%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .bismillah {
          font-family: 'Amiri', serif;
          font-size: 22px;
          color: ${effective.primaryColor};
          line-height: 1;
          margin-bottom: 2px;
        }
        .school-logo {
          height: 48px; 
          margin-bottom: 2px;
        }
        .report-badge {
          background-color: ${effective.primaryColor};
          color: #ffffff;
          padding: 4px 18px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .header-right {
          flex: 0 0 36%;
          text-align: right;
          direction: rtl;
        }
        .header-right h2 {
          color: ${effective.headerAccentColor};
          font-family: ${effective.arabicFontFamilyCss} !important;
          font-size: ${Math.round(23 * effective.arabicFontScaleMultiplier)}px;
          font-weight: 900;
          margin: 0;
          line-height: 1.2;
        }
        .header-right .arabic-subline {
          color: ${effective.headerAccentColor};
          font-family: ${effective.arabicFontFamilyCss} !important;
          font-size: ${Math.round(20 * effective.arabicFontScaleMultiplier)}px;
          font-weight: 800;
          line-height: 1.25;
          margin-top: 2px;
        }

        .header-divider {
          border-top: 1.5px solid ${effective.primaryColor};
          margin: 2px 0;
          flex-shrink: 0;
        }

        /* ── PUPIL INFO SECTION ── */
        .info-section {
          display: flex;
          gap: 12px;
          flex-shrink: 0;
        }
        .info-box {
          border: 1.5px dashed ${effective.secondaryColor};
          border-radius: 8px;
          padding: 3px 8px; 
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          gap: 2px; 
          background: #fdfaf3;
        }
        .info-row {
          display: flex;
          align-items: flex-end;
          gap: 6px;
        }
        .info-label {
          font-size: 10px;
          font-weight: 800;
          color: #1e293b;
          white-space: nowrap;
        }
        .info-value {
          border-bottom: 1.5px dashed #94a3b8;
          flex: 1;
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          padding-bottom: 1px;
          min-width: 40px;
          text-align: center;
        }
        .info-value.pupil-name {
          font-size: 15.5px;
          font-weight: 900;
          letter-spacing: 0.3px;
        }
        .info-box.arabic {
          direction: rtl;
          font-family: ${effective.arabicFontFamilyCss} !important;
        }
        .info-box.arabic .info-label { font-size: ${Math.round(13.5 * effective.arabicFontScaleMultiplier)}px; font-weight: 700; }
        .info-box.arabic .info-value { font-size: ${Math.round(16.5 * effective.arabicFontScaleMultiplier)}px; font-weight: 900; color: #0F172A; border-bottom: 1.5px dotted #94a3b8; }
        .info-box.arabic .info-value.arabic-pupil-name { font-size: ${Math.round(21 * effective.arabicFontScaleMultiplier)}px; font-weight: 900; color: #0F172A; }

        /* ── TABLES SECTION (DYNAMIC EXPANSION) ── */
        .tables-wrapper {
          display: flex;
          gap: 20px;
          min-height: 0;
        }
        .table-col-academic { 
          flex: 1.5; 
          display: flex; 
          flex-direction: column; 
          gap: 10px;
        }
        .table-col-theology { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          direction: rtl; 
          gap: 10px;
        }

        .table-container {
          border: 2px solid ${effective.secondaryColor};
          border-radius: 8px;
          overflow: hidden;
          background: white;
        }
        
        .flex-grow-table {
          display: flex;
          flex-direction: column;
        }

        .table-container table {
          width: 100%;
          border-collapse: collapse;
          border-style: hidden;
        }

        .table-container th, .table-container td {
          border: 1px solid #cbd5e1;
          padding: ${studioFormatting?.pageDensity === 'spacious' ? effective.densityPadding : '2px 3.5px'};
          text-align: center;
          font-size: calc(10px * var(--report-font-scale, 1));
          line-height: 1.15;
          vertical-align: middle;
        }
        
        .th-banner {
          background-color: ${effective.secondaryColor};
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .table-container thead th { border-color: ${effective.secondaryColor}; }
        
        .th-sub {
          background-color: ${effective.primaryColor};
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .row-even { background-color: #ffffff; }
        .row-odd { background-color: #fdfaf3; }
        
        .subj-name {
          text-align: left;
          font-weight: ${effective.headingFontWeight};
          color: ${effective.primaryColor};
          padding-left: 10px !important;
        }
        .grade-cell { font-weight: ${effective.scoreFontWeight}; color: #1e293b; }
        .remark-cell { font-style: ${studioFormatting?.italicizeText ? 'italic' : 'normal'}; font-weight: 800; }
        .total-row td { background-color: #f1f5f9; font-weight: 800; }

        /* Grading Table */
        .grading-container {
          flex-shrink: 0;
        }
        .grading-container th, .grading-container td {
          padding: 1.5px 3px !important;
          line-height: 1.1;
        }
        .grade-head { background-color: ${effective.primaryColor}; color: white; font-weight: 800; } 
        .marks-head { background-color: #475569; color: white; font-weight: 800; }
        .grade-val { background-color: #f1f5f9; font-weight: 700; }

        /* Theology Specifics */
        .theology-table th { font-family: ${effective.arabicFontFamilyCss} !important; font-size: ${Math.round(13.5 * effective.arabicFontScaleMultiplier)}px; }
        .theology-table td { font-family: ${effective.arabicFontFamilyCss} !important; font-size: ${Math.round(13.5 * effective.arabicFontScaleMultiplier)}px; font-weight: ${effective.scoreFontWeight}; }
        .theology-subj { text-align: right; font-weight: 700; padding-right: 12px !important; color: ${effective.primaryColor}; }
        
        .theology-notes {
          font-family: ${effective.arabicFontFamilyCss} !important;
          font-size: ${Math.round(14.5 * effective.arabicFontScaleMultiplier)}px;
          flex-shrink: 0;
        }
        .t-note-row { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 2px; }
        .t-note-lbl { font-weight: 700; white-space: nowrap; }
        .t-note-val { border-bottom: 1.5px dotted #94a3b8; flex: 1; min-width: 50px; font-style: normal; font-weight: 700; color: #ea580c; text-align: right; padding-bottom: 1px; font-size: ${effective.arabicCommentFontSizePx}px; }

        /* ── FOOTER SECTION ── */
        .footer-section {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex-shrink: 0;
        }
        
        .comments-and-stamp {
          display: flex;
          gap: 16px; 
          align-items: flex-end;
        }
        .comments-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px; 
          border: 1.5px dashed #cbd5e1;
          padding: 3px 8px; 
          border-radius: 8px;
          background: #ffffff;
        }
        
        .comment-line {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .c-label {
          font-size: 10px;
          font-weight: 800;
          color: #1e293b;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .c-value {
          flex: 1;
          border-bottom: 1.5px dotted #94a3b8;
          font-size: ${effective.commentFontSizePx}px;
          font-weight: 800;
          font-style: ${studioFormatting?.italicizeText ? 'italic' : 'normal'};
          color: #0ea5e9;
          padding-bottom: 2px;
          min-width: 50px;
        }
        .c-sig {
          width: 160px;
          border-bottom: 1.5px dotted #94a3b8;
        }

        .stamp-circle {
          width: 85px; 
          height: 85px;
          border: 1.5px dashed #94a3b8;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          line-height: 1.3;
          flex-shrink: 0;
          background: #ffffff;
        }

        /* ── DATES (Centered) & VALIDITY BAR ── */
        .dates-row {
          display: flex;
          gap: 12px;
          margin-top: 1px;
        }
        .date-box {
          flex: 1;
          border-radius: 6px;
          padding: 2.5px 6px; 
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px; 
          font-size: 10.5px;
          font-weight: 800;
        }
        .date-red {
          border: 1.5px solid #fca5a5;
          color: #b91c1c;
          background: #fef2f2;
        }
        .date-blue {
          border: 1.5px solid #93c5fd;
          color: #1d4ed8;
          background: #eff6ff;
        }

        .validity-bar {
          background-color: ${effective.headerAccentColor};
          color: white;
          text-align: center;
          padding: 3.5px 6px; 
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.7px;
          border-radius: 4px;
        }

        @media print {
          .landscape-page {
            width: 297mm !important;
            min-width: 297mm !important;
            max-width: 297mm !important;
            height: 209mm !important;
            min-height: 0 !important;
            max-height: 209mm !important;
            margin: 0 !important;
            left: 0 !important;
            padding: 2.5mm 4mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .landscape-page .tables-wrapper,
          .landscape-page .tables-row {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: stretch !important;
          }
        }
        `
        }}
      />

      <div className="print-wrapper">
        <div className="landscape-page" data-report-orientation="landscape">
          <div className="outer-border">
            <div className="inner-border">
              <NurseryEducativeWatermark
                templateId="primary-eot"
                logoUrl={branding.logoUrl || '/logo-512h.png'}
                studioFormatting={effectiveStudioPass}
                includeEducativeArt={false}
              />
              <div className="content-layer">

                {/* ── HEADER ── */}
                <header className="header-section">
                  <div className="header-left">
                    <h1 data-testid="report-school-name">{effective.schoolHeader.nameEnglish}</h1>
                    <p data-testid="report-school-address">{effective.schoolHeader.address}</p>
                    <p data-testid="report-school-phone">Tel: {effective.schoolHeader.phone}</p>
                    <p style={{ textTransform: 'lowercase' }} data-testid="report-school-email">{effective.schoolHeader.email}</p>
                    {effective.schoolHeader.motto ? <p style={{ fontStyle: studioFormatting?.italicizeText ? 'italic' : 'normal' }} data-testid="report-school-motto">&ldquo;{effective.schoolHeader.motto}&rdquo;</p> : null}
                  </div>

                  <div className="header-center">
                    <div className="bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْم</div>
                    <div className="w-14 h-14 overflow-visible flex items-center justify-center mx-auto my-0.5" style={{ width: '56px', height: '56px', overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto' }}>
                      <img
                        src={branding.logoUrl || '/school_logo.svg'}
                        alt="School Badge"
                        className="school-logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '56px' }}
                        data-testid="report-school-logo"
                        onError={(e) => {
                          if (!e.currentTarget.src.endsWith('/school_logo.svg')) {
                            e.currentTarget.src = '/school_logo.svg';
                          }
                        }}
                      />
                    </div>
                    <div className="report-badge">
                      {isLower ? 'LOWER' : 'UPPER'} REPORT FORM – END OF TERM
                    </div>
                  </div>

                  <div className="header-right">
                    <h2 style={{ whiteSpace: 'nowrap' }}>{effective.schoolHeader.nameArabicLine1}</h2>
                    {effective.schoolHeader.nameArabicLine2 ? (
                      <div className="arabic-subline">{effective.schoolHeader.nameArabicLine2}</div>
                    ) : null}
                  </div>
                </header>

                <div className="header-divider"></div>

                {/* ── PUPIL INFO ── */}
                <section className="info-section">
                  <div className="info-box">
                    <div className="info-row">
                      <span className="info-label">PUPIL&apos;S NAME:</span>
                      <div className="info-value pupil-name" style={{ textTransform: 'uppercase' }}>{reportData?.student?.name}</div>
                    </div>
                    <div className="info-row">
                      <span className="info-label">CLASS:</span>
                      <div className="info-value" style={{ flex: 0.5 }}>{className}</div>
                      <span className="info-label">TERM:</span>
                      <div className="info-value" style={{ flex: 0.5, whiteSpace: 'nowrap' }}>{formattedTerm}</div>
                      <span className="info-label">YEAR:</span>
                      <div className="info-value" style={{ flex: 0.5 }}>{reportData?.term?.academic_year}</div>
                    </div>
                    <div className="info-row">
                      <span className="info-label">AGGREGATE:</span>
                      <div className="info-value" style={{ flex: 1, fontSize: '14.5px', fontWeight: 900, color: '#0F172A', textAlign: 'center' }}>
                        {eotAgg || reportData?.total_aggregates || '--'}
                      </div>
                      <span className="info-label">DIVISION:</span>
                      <div className="info-value" style={{ flex: 1, fontSize: '14.5px', fontWeight: 900, color: '#0D5C3A', textAlign: 'center' }}>
                        {division || '--'}
                      </div>
                    </div>
                  </div>

                  {showTheologyPanel && (
                    <div className="info-box arabic">
                      <div className="info-row">
                        <span className="info-label">اسم التلميذ/ة :</span>
                        <div className="info-value arabic-pupil-name">
                          {reportData?.student?.arabic_name || transliterateEnglishToArabic(reportData?.student?.name || '')}
                        </div>
                      </div>
                      <div className="info-row">
                        <span className="info-label">الفصل :</span>
                        <div className="info-value" style={{ flex: 0.5 }}>
                          {reportData?.student?.theology_class_arabic ?? reportData?.student?.class_name}
                        </div>
                        <span className="info-label">الفترة :</span>
                        <div className="info-value" style={{ flex: 0.5 }}>{toAr(reportData?.term?.term_number)}</div>
                        <span className="info-label">عام :</span>
                        <span className="info-label" style={{ marginRight: '4px' }}>م</span>
                        <div className="info-value" style={{ flex: 0.4 }}>{toAr(reportData?.term?.academic_year)}</div>
                        <span className="info-label" style={{ marginRight: '4px' }}>ه‍</span>
                        <div className="info-value" style={{ flex: 0.4 }}>{toAr(toHijri(Number(reportData?.term?.academic_year)))}</div>
                      </div>
                      <div className="info-row">
                        <span className="info-label">الترتيب :</span>
                        <div className="info-value" style={{ flex: 1, fontSize: '15.5px', fontWeight: 900, color: '#0F172A', textAlign: 'center' }}>
                          {toArabicNumerals(theologyPosition)}
                        </div>
                        <span className="info-label" style={{ marginRight: '8px' }}>عدد الطلبة :</span>
                        <div className="info-value" style={{ flex: 1, fontSize: '15.5px', fontWeight: 900, color: '#0F172A', textAlign: 'center' }}>
                          {toArabicNumerals(theologyTotalStudents)}
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* ── TABLES ── */}
                <div className="tables-wrapper tables-row">

                  {/* ACADEMIC TABLE */}
                  <div className="table-col-academic" style={{ flex: showTheologyPanel ? 1.5 : 1 }}>
                    <div className="table-container flex-grow-table">
                      <table>
                        <thead>
                          <tr>
                            <th colSpan={9} className="th-banner">COMPARATIVE PERFORMANCE</th>
                          </tr>
                          <tr>
                            <th rowSpan={2} className="th-sub" style={{ width: '18%' }}>SUBJECTS</th>
                            <th colSpan={2} className="th-sub" style={{ width: '14%' }}>BEGINNING OF TERM</th>
                            <th colSpan={2} className="th-sub" style={{ width: '14%' }}>MIDTERM</th>
                            <th colSpan={2} className="th-sub" style={{ width: '14%' }}>END OF TERM</th>
                            <th rowSpan={2} className="th-sub" style={{ width: '30%' }}>TEACHER&apos;S REMARKS</th>
                            <th rowSpan={2} className="th-sub" style={{ width: '10%' }}>INITIALS</th>
                          </tr>
                          <tr>
                            <th className="th-sub" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>MARK</th>
                            <th className="th-sub" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>AGG</th>
                            <th className="th-sub" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>MARK</th>
                            <th className="th-sub" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>AGG</th>
                            <th className="th-sub" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>MARK</th>
                            <th className="th-sub" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>AGG</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData?.circular?.subjects?.map(renderSubjectRow)}
                          <tr className="total-row">
                            <td className="subj-name" style={{ color: '#1e293b' }}>TOTAL</td>
                            <td>{reportData?.circular?.bot_total ?? '--'}</td>
                            <td>{reportData?.circular?.bot_aggregate ?? '--'}</td>
                            <td>{reportData?.circular?.mot_total ?? '--'}</td>
                            <td>{reportData?.circular?.mot_aggregate ?? '--'}</td>
                            <td>{reportData?.circular?.eot_total ?? '--'}</td>
                            <td>{reportData?.circular?.aggregate ?? '--'}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="table-container grading-container" data-testid="report-grading-scale">
                      <table>
                        <tbody>
                          <tr>
                            <th className="grade-head">-- GRADE --</th>
                            {gradingBands.map((b) => (
                              <td key={b.grade} className="grade-val">{b.grade}</td>
                            ))}
                          </tr>
                          <tr>
                            <th className="marks-head" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>Marks</th>
                            {gradingBands.map((b) => (
                              <td key={b.grade}>{b.range}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* THEOLOGY TABLE */}
                  {showTheologyPanel && (
                    <div className="table-col-theology">
                      <div className="table-container flex-grow-table theology-table">
                        <table dir="rtl">
                          <thead>
                            <tr>
                              <th colSpan={6} className="th-banner">نتائج المواد الشرعية</th>
                            </tr>
                            <tr>
                              <th rowSpan={2} className="th-sub" style={{ width: '22%' }}>المواد</th>
                              <th colSpan={2} className="th-sub" style={{ width: '26%' }}>منتصف الفترة</th>
                              <th colSpan={2} className="th-sub" style={{ width: '26%' }}>نهاية الفترة</th>
                              <th rowSpan={2} className="th-sub" style={{ width: '26%' }}>الملاحظات</th>
                            </tr>
                            <tr>
                              <th className="th-sub" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>الدرجة الكبرى</th>
                              <th className="th-sub" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>الدرجة الصغرى</th>
                              <th className="th-sub" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>الدرجة الكبرى</th>
                              <th className="th-sub" style={{ borderTop: `1px solid ${effective.secondaryColor}` }}>الدرجة الصغرى</th>
                            </tr>
                          </thead>
                          <tbody>
                            {arabicSubjects.map((arabicName, i) => {
                              const subject = reportData?.theology?.subjects?.find((s: any) => {
                                const dbName = s.subject_name_arabic === "التاريخ والسيرة" ? "التربية" : s.subject_name_arabic || "";
                                return arabicName.includes(dbName) || dbName.includes(arabicName.split(" ")[0]);
                              });

                              return (
                                <tr key={arabicName} className={i % 2 === 0 ? "row-even" : "row-odd"}>
                                  <td className="theology-subj">{arabicName}</td>
                                  <td>{toAr(100)}</td>
                                  <td className="grade-cell">{toAr(subject?.mot_score)}</td>
                                  <td>{toAr(100)}</td>
                                  <td className="grade-cell">{toAr(subject?.eot_score)}</td>
                                  <td className="remark-cell" style={{ color: remarkColor(subject?.theology_remark), textAlign: 'right', paddingRight: '12px' }}>
                                    {subject?.theology_remark ?? ''}
                                  </td>
                                </tr>
                              )
                            })}
                            <tr className="total-row">
                              <td className="theology-subj" style={{ color: '#1e293b' }}>المجموع</td>
                              <td>{toAr(reportData?.theology?.subjects?.length ? reportData.theology.subjects.length * 100 : 400)}</td>
                              <td>{toAr(reportData?.theology?.mot_total_score ?? reportData?.theology?.mot_total)}</td>
                              <td>{toAr(reportData?.theology?.subjects?.length ? reportData.theology.subjects.length * 100 : 400)}</td>
                              <td>{toAr(reportData?.theology?.total ?? reportData?.theology?.eot_total)}</td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="theology-notes">
                        <div className="t-note-row">
                          <span className="t-note-lbl">ملاحظة مشرف الفصل:</span>
                          <div className="t-note-val" style={{ color: remarkColor(reportData?.theology?.teacher_comment || getTheologyComment(reportData?.theology?.eot_total ?? null, reportData?.student?.gender, reportData?.settings?.theology_remarks, reportData?.theology?.division, reportData?.theology?.subjects?.length || 4)) }}>
                            {reportData?.theology?.teacher_comment || getTheologyComment(reportData?.theology?.eot_total ?? null, reportData?.student?.gender, reportData?.settings?.theology_remarks, reportData?.theology?.division, reportData?.theology?.subjects?.length || 4)}
                          </div>
                        </div>
                        <div className="t-note-row">
                          <span className="t-note-lbl">التوقيع والختم:</span>
                          <div
                            className="t-note-val"
                            style={{
                              flex: 1,
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'flex-end',
                              justifyContent: 'center',
                              height: '42px',
                              overflow: 'visible',
                            }}
                          >
                            {includeSignatures && theologyTeacherSigUrl ? (
                              <CleanSignatureImage
                                src={theologyTeacherSigUrl}
                                style={{ maxHeight: '45px', width: '100%', maxWidth: '140px', objectFit: 'contain', mixBlendMode: 'multiply', marginBottom: '-5px' }}
                                alt="Theology Class Teacher Signature"
                                studioFormatting={effectiveStudioPass}
                              />
                            ) : null}
                          </div>
                          <div
                            className="t-note-val"
                            style={{
                              flex: 0.85,
                              borderBottom: 'none',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'flex-end',
                              justifyContent: 'center',
                              height: '42px',
                              overflow: 'visible',
                            }}
                          >
                            {includeSignatures && theologyDosSigUrl ? (
                              <CleanSignatureImage
                                src={theologyDosSigUrl}
                                style={{ maxHeight: '45px', width: '100%', maxWidth: '140px', objectFit: 'contain', mixBlendMode: 'multiply', marginBottom: '-5px' }}
                                alt="DOS Theology Signature"
                                studioFormatting={effectiveStudioPass}
                              />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── FOOTER ── */}
                <footer className="footer-section">
                  <div className="comments-and-stamp">
                    <div className="comments-area">
                      <div className="comment-line">
                        <span className="c-label">CONDUCT:</span>
                        <div className="c-value">{conductRemark}</div>
                      </div>
                      <div className="comment-line">
                        <span className="c-label">CLASS TEACHER&apos;S COMMENT:</span>
                        <div className="c-value" style={{ textTransform: 'uppercase' }}>{teacherComment}</div>
                        <span className="c-label">SIGNATURE:</span>
                        <div className="c-sig" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '42px', minWidth: '140px', borderBottom: '1.5px dotted #334155', overflow: 'visible' }}>
                          {includeSignatures && secularClassTeacherSigUrl ? (
                            <CleanSignatureImage src={secularClassTeacherSigUrl} style={{ maxHeight: '45px', width: '100%', maxWidth: '140px', objectFit: 'contain', mixBlendMode: 'multiply', marginBottom: '-6px' }} alt="Secular Class Teacher Signature" studioFormatting={effectiveStudioPass} />
                          ) : null}
                        </div>
                      </div>
                      <div className="comment-line">
                        <span className="c-label">HEAD TEACHER&apos;S COMMENT:</span>
                        <div className="c-value" style={{ textTransform: 'uppercase' }}>{headComment}</div>
                        <span className="c-label">SIGNATURE:</span>
                        <div className="c-sig" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '42px', minWidth: '140px', borderBottom: '1.5px dotted #334155', overflow: 'visible' }}>
                          {includeSignatures && headTeacherSigUrl ? (
                            <CleanSignatureImage src={headTeacherSigUrl} style={{ maxHeight: '45px', width: '100%', maxWidth: '140px', objectFit: 'contain', mixBlendMode: 'multiply', marginBottom: '-6px' }} alt="Head Teacher Signature" studioFormatting={effectiveStudioPass} />
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="stamp-wrapper" style={{ width: '135px', height: '64px', minWidth: '135px', minHeight: '64px', position: 'relative', marginBottom: '2px', overflow: 'visible', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
                      {includeStamp ? (
                        <OfficialReportStamp reportData={reportData} studioFormatting={effectiveStudioPass} maxWidth={135} maxHeight={64} />
                      ) : null}
                    </div>
                  </div>

                  <div className="dates-row">
                    <div className="date-box date-red">
                      <span>THIS TERM ENDS ON:</span>
                      <span>{studioFormatting?.reportDateOverride || formatDate(reportData?.term?.end_date || reportData?.term?.endDate)}</span>
                    </div>
                    <div className="date-box date-blue">
                      <span>NEXT TERM BEGINS ON:</span>
                      <span>{studioFormatting?.nextTermBeginsOverride || formatDate(reportData?.term?.next_term_start || reportData?.term?.nextTermBegins || reportData?.term?.next_term_begins)}</span>
                    </div>
                  </div>

                  <div className="validity-bar">
                    THIS REPORT FORM IS NOT VALID WITHOUT THE OFFICIAL SCHOOL STAMP
                  </div>
                </footer>

              </div>
            </div>
          </div>
        </div>
      </div>
    </ReportContainer>
  )
}
