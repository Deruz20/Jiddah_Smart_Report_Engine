'use client'

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
import { getSecularPortraitReportTitle, isMuslimStudent } from '@/lib/student-religion'
import { getClassTeacherSignatureKey } from '@/utils/signatures'
import { useStudioFormatting, resolveEffectiveStudioStyle } from '@/lib/studio-config-store'
import { NurseryEducativeWatermark } from '@/components/reports/NurseryEducativeWatermark'

export default function P7EOTReport({ reportData, studioFormatting }: any) {
  const { formatting } = useStudioFormatting(studioFormatting, reportData?.settings?.report_studio_config)
  const effective = resolveEffectiveStudioStyle(formatting, reportData, 'p7-eot')
  const effectiveStudioPass = {
    ...formatting,
    ...effective,
    stampInkColor: effective.stampColor,
  }
  const branding = resolveReportBranding(reportData)
  const gradingBands = resolveReportGradingBands(reportData)
  const printPrefs = reportData?.settings?.print_preferences
  const includeSignatures =
    effective.showSignatures &&
    (printPrefs?.includeSignatures !== undefined ? Boolean(printPrefs.includeSignatures) : true)
  const includeStamp =
    effective.showStamp &&
    (printPrefs?.includeStamp !== undefined ? Boolean(printPrefs.includeStamp) : true)
  const primaryColor = effective.headerAccentColor
  const watermarkOpacity = effective.watermarkOpacity

  const className =
    reportData?.class_name ||
    reportData?.class ||
    reportData?.student?.class_name ||
    ''

  const isMuslim = isMuslimStudent(reportData?.student, reportData)
  const reportTitle = getSecularPortraitReportTitle(className)

  const teacherComment =
    reportData?.circular?.class_teacher_comment ??
    getClassTeacherComment(reportData?.circular?.division ?? null, undefined, reportData?.settings?.grading_scale, reportData?.settings?.division_boundaries)

  const headComment =
    reportData?.circular?.head_teacher_comment ??
    getHeadTeacherComment(reportData?.circular?.division ?? null, undefined, reportData?.settings?.grading_scale, reportData?.settings?.division_boundaries)

  const conductRemark =
    reportData?.circular?.conduct_remark ??
    getConductRemark(reportData?.circular?.division ?? null, reportData?.settings?.division_boundaries, reportData?.settings?.promotion_comments?.default_conduct)

  const hasTheology =
    isMuslim &&
    reportData?.theology?.subjects &&
    reportData?.theology?.subjects.length > 0

  const toAr = (val: number | string | null | undefined): string => {
    if (val == null) return '--'
    return String(val).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
  }

  const remarkColor = (remark: string | undefined): string => {
    if (!remark) return '#1d4ed8'
    const r = remark.toLowerCase()
    if (r.includes('excellent') || r.includes('outstanding') || r.includes('ممتاز')) return '#1d4ed8'
    if (r.includes('very good') || r.includes('جيد جداً')) return '#16a34a'
    if (r.includes('good') || r.includes('fairly') || r.includes('جيد')) return '#0e7490'
    if (r.includes('fair') || r.includes('average') || r.includes('مقبول')) return '#ea580c'
    if (r.includes('poor') || r.includes('fail') || r.includes('weak') || r.includes('ضعيف') || r.includes('راسب')) return '#dc2626'
    return '#1d4ed8'
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '.........................'
    try {
      const d = new Date(dateString)
      if (isNaN(d.getTime())) return dateString
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
    } catch {
      return dateString
    }
  }

  const renderSubjectRow = (subject: any, idx: number) => (
    <tr key={subject.subject_name || idx} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
      <td className="subj-name">{subject.subject_name}</td>
      <td className="score-cell">{subject.bot_score ?? '--'}</td>
      <td className="grade-cell">{subject.bot_grade_display ?? subject.bot_agg ?? '--'}</td>
      <td className="score-cell">{subject.mot_score ?? '--'}</td>
      <td className="grade-cell">{subject.mot_grade_display ?? subject.mot_agg ?? '--'}</td>
      <td className="score-cell">{subject.eot_score ?? '--'}</td>
      <td className="grade-cell">{subject.eot_grade_display ?? subject.eot_agg ?? subject.grade ?? '--'}</td>
      <td className="remark-cell" style={{ color: remarkColor(subject.remark) }}>
        {subject.remark || (subject.eot_score != null
            ? getSubjectRemark(getSubjectGradeNumber(subject.eot_score, gradingBands), gradingBands)
            : subject.mot_score != null
              ? getSubjectRemark(getSubjectGradeNumber(subject.mot_score, gradingBands), gradingBands)
              : '')}
      </td>
      <td
        style={{
          textTransform: 'uppercase',
          fontFamily: '"Caveat", cursive',
          fontWeight: 'bold',
          fontSize: '1.2em',
          color: '#047857',
        }}
      >
        {(subject.teacher_initials || '').toUpperCase()}
      </td>
    </tr>
  )

  const studentName = (reportData?.student?.name || 'STUDENT NAME').toUpperCase()
  const arabicName = reportData?.student?.name_arabic || reportData?.student?.arabic_name || ''

  return (
    <ReportContainer
      reportType="P7EOTReport"
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

        .portrait-page.p7-eot-report {
          --report-primary-color: ${effective.primaryColor};
          --report-secondary-color: ${effective.secondaryColor};
          --report-border-color: ${effective.secondaryColor};
          width: 100%;
          height: 100%;
          max-height: 296mm;
          overflow: hidden;
          background: white;
          padding: 3mm;
          margin: 0;
          position: relative;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          flex: 1;
          font-family: ${effective.fontFamilyCss} !important;
          color: #0F172A;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        .portrait-page.p7-eot-report * { box-sizing: border-box; }
        p, h1, h2, h3, h4, h5, h6 { margin: 0; }

        /* ── PREMIUM DOUBLE BORDERS (Identical to PrimaryEOTReport) ── */
        .p7-eot-report .outer-border {
          border: 4px solid ${effective.secondaryColor};
          padding: 2px;
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .p7-eot-report .inner-border {
          border: 1.5px solid ${effective.primaryColor};
          padding: 5px 12px;
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          height: 100%;
        }

        /* ── WATERMARK ── */
        .p7-eot-report .inner-border::before {
          content: "";
          position: absolute;
          inset: 0;
          background: url('${branding.logoUrl || '/logo-512h.png'}') center center no-repeat;
          background-size: 320px;
          opacity: 0;
          pointer-events: none;
          z-index: 0;
        }

        .p7-eot-report .content-layer {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: flex-start;
          gap: 4px;
          font-family: ${effective.fontFamilyCss} !important;
          --report-font-scale: ${effective.fontScaleMultiplier};
        }

        /* ── HEADER (3-Column Grid Preventing Right Arabic Overflow) ── */
        .p7-eot-report .header-section {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
          width: 100%;
          box-sizing: border-box;
          padding: 4px 6px;
          min-height: 38mm;
          overflow: visible;
        }

        .p7-eot-report .header-left { min-width: 0; overflow: visible; }
        .p7-eot-report .header-left h1 {
          color: ${effective.headerAccentColor};
          font-size: 22px;
          font-weight: 900;
          margin: 0 0 3px 0;
          line-height: 1.15;
          letter-spacing: -0.3px;
        }
        .p7-eot-report .header-left p {
          color: #4b5563;
          font-size: 11.5px;
          font-weight: 600;
          line-height: 1.2;
          margin: 1px 0;
        }

        .p7-eot-report .header-center {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .p7-eot-report .bismillah {
          font-family: 'Amiri', serif;
          font-size: 19px;
          color: ${effective.primaryColor};
          line-height: 1;
          margin-bottom: 2px;
        }
        .p7-eot-report .school-logo {
          height: 60px;
          margin-bottom: 2px;
        }
        .p7-eot-report .report-badge {
          background-color: ${effective.primaryColor};
          color: #ffffff;
          padding: 3px 14px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.4px;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.25);
        }

        .p7-eot-report .header-right {
          direction: rtl;
          text-align: right;
          padding-right: 6px;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }
        .p7-eot-report .header-right h2 {
          font-family: 'Amiri', serif;
          font-size: 18.5px;
          font-weight: 900;
          color: ${effective.headerAccentColor};
          line-height: 1.25;
          margin: 0;
        }

        .p7-eot-report .header-divider {
          height: 1.5px;
          background: ${effective.secondaryColor};
          margin: 1px 0 3px 0;
          opacity: 0.85;
        }

        /* ── PUPIL INFO CARD (~26mm) ── */
        .p7-eot-report .info-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background-color: #FAF6EE;
          border: 1.5px dashed ${effective.secondaryColor};
          padding: 10px 14px;
          border-radius: 6px;
        }

        .p7-eot-report .info-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .p7-eot-report .info-item {
          display: flex;
          align-items: baseline;
          gap: 4px;
          flex: 1;
        }
        .p7-eot-report .info-label {
          font-weight: 800;
          color: #475569;
          font-size: 11px;
          white-space: nowrap;
        }
        .p7-eot-report .info-value {
          font-weight: 800;
          color: #0F172A;
          border-bottom: 1px dotted #94a3b8;
          flex: 1;
          padding-left: 4px;
          font-size: 15px;
        }
        .p7-eot-report .line.pupil-name {
          font-size: 16px;
          font-weight: 900;
        }
        .p7-eot-report .info-value.pupil-name {
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 0.3px;
          color: #0F172A;
        }

        /* ── COMPARATIVE PERFORMANCE TABLE (Natural height, ZERO white desert below TOTAL) ── */
        .p7-eot-report .table-section {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .p7-eot-report .table-container {
          border: 1.5px solid ${effective.secondaryColor};
          border-radius: 6px;
          overflow: hidden;
          background: white;
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
        }
        .p7-eot-report table {
          width: 100%;
          border-collapse: collapse;
          font-size: calc(13.5px * var(--report-font-scale, 1));
          text-align: center;
          height: auto;
        }
        .p7-eot-report th,
        .p7-eot-report td {
          border: 1px solid #cbd5e1;
          padding: 11px 8px;
          line-height: 1.2;
        }
        .p7-eot-report .th-banner {
          background-color: ${effective.secondaryColor} !important;
          color: #ffffff;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.8px;
          padding: 6px 0;
        }
        .p7-eot-report th {
          background-color: ${effective.primaryColor};
          color: white;
          font-weight: 800;
          letter-spacing: 0.2px;
          font-size: 11px;
          padding: 8px 6px;
        }

        .p7-eot-report .row-even { background-color: #ffffff; }
        .p7-eot-report .row-odd { background-color: #fdfaf3; }

        .p7-eot-report .subj-name {
          text-align: left;
          font-weight: ${effective.headingFontWeight};
          font-size: 13.5px;
          color: ${effective.primaryColor};
          padding-left: 10px !important;
        }
        .p7-eot-report td.score-cell,
        .p7-eot-report .grade-cell {
          font-size: 13.5px;
          font-weight: ${effective.scoreFontWeight};
          color: #0F172A;
        }
        .p7-eot-report .remark-cell { font-style: italic; font-weight: 800; font-size: 11.5px; }
        .p7-eot-report .total-row td { background-color: #f1f5f9; font-weight: 800; font-size: 14px; padding: 10px 8px; }

        /* Grading Table + UNEB Strip */
        .p7-eot-report .grading-container {
          flex-shrink: 0;
          padding: 4px 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .p7-eot-report .grading-container table {
          height: auto;
        }
        .p7-eot-report .grading-container td {
          padding: 7px 6px;
        }
        .p7-eot-report .grade-head { background-color: ${effective.primaryColor}; color: white; font-weight: 800; font-size: 9.5px; }
        .p7-eot-report .marks-head { background-color: #475569; color: white; font-weight: 800; font-size: 9.5px; }
        .p7-eot-report .grade-val { background-color: #f1f5f9; font-weight: 700; font-size: 9.5px; }

        .p7-eot-report .uneb-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 7px 12px;
          font-size: 9.5px;
          color: #334155;
        }
        .p7-eot-report .uneb-label {
          font-weight: 800;
          color: ${effective.primaryColor};
        }

        /* ── FOOTER SECTION (Balanced proportional spacing) ── */
        .p7-eot-report .footer-section {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 6px;
          flex: 1 1 auto;
        }

        .p7-eot-report .comments-box {
          flex: 1 1 auto;
          background-color: rgba(250, 246, 238, 0.45);
          border: 1.5px dashed ${effective.secondaryColor};
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
          gap: 6px;
        }

        .p7-eot-report .comment-row {
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 34px;
          font-size: 10.5px;
        }
        .p7-eot-report .comment-lbl {
          font-weight: 800;
          color: #334155;
          white-space: nowrap;
          font-size: 10.5px;
        }
        .p7-eot-report .comment-val {
          border-bottom: 1px dotted #94a3b8;
          flex: 1;
          font-style: italic;
          font-weight: 700;
          color: #1d4ed8;
          padding-left: 4px;
          font-size: ${effective.commentFontSizePx}px;
        }
        .p7-eot-report .sig-box {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          width: 140px;
          flex-shrink: 0;
        }

        /* ── DATES & STAMP ROW ── */
        .p7-eot-report .bottom-meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          justify-content: space-between;
        }

        .p7-eot-report .dates-col {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }
        .p7-eot-report .date-box {
          border-radius: 4px;
          padding: 3px 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          font-weight: 800;
        }
        .p7-eot-report .date-red {
          border: 1.5px solid #fca5a5;
          color: #b91c1c;
          background: #fef2f2;
        }
        .p7-eot-report .date-blue {
          border: 1.5px solid #93c5fd;
          color: #1d4ed8;
          background: #eff6ff;
        }

        .p7-eot-report .validity-bar {
          background-color: ${effective.headerAccentColor};
          color: white;
          text-align: center;
          padding: 3.5px;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.6px;
          border-radius: 4px;
        }

        @media print {
          .portrait-page.p7-eot-report {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 295mm !important;
            min-height: 0 !important;
            max-height: 295mm !important;
            margin: 0 !important;
            left: 0 !important;
            padding: 2.5mm 4mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
        `
        }}
      />

      <div className="print-wrapper">
        <div className="portrait-page p7-eot-report" data-report-orientation="portrait">
          <div className="outer-border">
            <div className="inner-border">
              <NurseryEducativeWatermark
                templateId="p7-eot"
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
                    {effective.schoolHeader.motto ? (
                      <p style={{ fontStyle: 'italic' }} data-testid="report-school-motto">
                        &ldquo;{effective.schoolHeader.motto}&rdquo;
                      </p>
                    ) : null}
                  </div>

                  <div className="header-center">
                    <div className="bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْم</div>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        overflow: 'visible',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '1px auto',
                      }}
                    >
                      <img
                        src={branding.logoUrl || '/logo-512h.png'}
                        alt="School Badge"
                        className="school-logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '64px' }}
                        data-testid="report-school-logo"
                        onError={(e) => {
                          if (!e.currentTarget.src.endsWith('/logo-512h.png')) {
                            e.currentTarget.src = '/logo-512h.png'
                          }
                        }}
                      />
                    </div>
                    <div className="report-badge">{reportTitle}</div>
                  </div>

                  <div
                    className="header-right"
                    style={{
                      direction: 'rtl',
                      textAlign: 'right',
                      paddingRight: '6px',
                      minWidth: 0,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: effective.arabicFontFamilyCss,
                        fontSize: `${Math.round(18.5 * effective.arabicFontScaleMultiplier)}px`,
                        fontWeight: 900,
                        lineHeight: 1.25,
                        color: effective.headerAccentColor,
                      }}
                    >
                      {effective.schoolHeader.nameArabicLine1 || 'مدرسة جدة الإسلامية للروضة والإبتدائية'}
                    </h2>
                    {effective.schoolHeader.nameArabicLine2 ? (
                      <div
                        style={{
                          fontFamily: effective.arabicFontFamilyCss,
                          fontSize: `${Math.round(16 * effective.arabicFontScaleMultiplier)}px`,
                          fontWeight: 800,
                          lineHeight: 1.2,
                          color: effective.headerAccentColor,
                        }}
                      >
                        {effective.schoolHeader.nameArabicLine2}
                      </div>
                    ) : null}
                  </div>
                </header>

                <div className="header-divider" />

                {/* ── PUPIL INFO ── */}
                <div className="info-grid">
                  <div className="info-row">
                    <div className="info-item" style={{ flex: 3, minWidth: 0, whiteSpace: 'nowrap' }}>
                      <span className="info-label" style={{ whiteSpace: 'nowrap' }}>PUPIL'S NAME:</span>
                      <span className="info-value pupil-name line line.pupil-name" style={{ fontSize: '17px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.025em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {studentName}
                      </span>
                    </div>
                    <div className="info-item" style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap' }}>
                      <span className="info-label" style={{ whiteSpace: 'nowrap' }}>CLASS:</span>
                      <span className="info-value" style={{ fontSize: '15.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>{className || 'P.7'}</span>
                    </div>
                  </div>

                  <div className="info-row">
                    <div className="info-item" style={{ flex: 0.8, minWidth: 0, whiteSpace: 'nowrap' }}>
                      <span className="info-label" style={{ whiteSpace: 'nowrap' }}>TERM:</span>
                      <span className="info-value" style={{ fontSize: '14.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {reportData?.term?.term_number ? `Term ${reportData.term.term_number}` : (reportData?.term?.label || 'Term 3')}
                      </span>
                    </div>
                    <div className="info-item" style={{ flex: 0.8, minWidth: 0, whiteSpace: 'nowrap' }}>
                      <span className="info-label" style={{ whiteSpace: 'nowrap' }}>YEAR:</span>
                      <span className="info-value" style={{ fontSize: '15px', fontWeight: 800, whiteSpace: 'nowrap' }}>{reportData?.term?.academic_year || 2026}</span>
                    </div>
                    <div className="info-item" style={{ flex: 1.1, minWidth: 0, whiteSpace: 'nowrap' }}>
                      <span className="info-label" style={{ whiteSpace: 'nowrap' }}>TOTAL MARKS:</span>
                      <span className="info-value" style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {reportData?.circular?.eot_total ?? reportData?.circular?.total ?? '--'}
                      </span>
                    </div>
                    <div className="info-item" style={{ flex: 1.0, minWidth: 0, whiteSpace: 'nowrap' }}>
                      <span className="info-label" style={{ whiteSpace: 'nowrap' }}>AGGREGATE:</span>
                      <span className="info-value" style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {reportData?.circular?.aggregate ?? '--'}
                      </span>
                    </div>
                    <div className="info-item" style={{ flex: 1.0, minWidth: 0, whiteSpace: 'nowrap' }}>
                      <span className="info-label" style={{ whiteSpace: 'nowrap' }}>DIVISION:</span>
                      <span className="info-value" style={{ fontSize: '15.5px', fontWeight: 900, color: '#0D5C3A', whiteSpace: 'nowrap' }}>
                        {reportData?.circular?.division
                          ? reportData.circular.division.startsWith('Div')
                            ? reportData.circular.division
                            : `Div ${reportData.circular.division}`
                          : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── SECULAR MARKS TABLE ── */}
                <div className="table-section" style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="table-container">
                    <table className="marks-table">
                      <thead>
                        <tr>
                          <th colSpan={9} className="th-banner">
                            COMPARATIVE PERFORMANCE
                          </th>
                        </tr>
                        <tr>
                          <th style={{ width: '28%' }} rowSpan={2}>SUBJECT</th>
                          <th colSpan={2} style={{ width: '15%' }}>BOT</th>
                          <th colSpan={2} style={{ width: '15%' }}>MOT</th>
                          <th colSpan={2} style={{ width: '15%' }}>EOT</th>
                          <th style={{ width: '17%' }} rowSpan={2}>REMARKS</th>
                          <th style={{ width: '10%' }} rowSpan={2}>INITIALS</th>
                        </tr>
                        <tr>
                          <th>MARK</th>
                          <th>GRD</th>
                          <th>MARK</th>
                          <th>GRD</th>
                          <th>MARK</th>
                          <th>GRD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData?.circular?.subjects || []).map(renderSubjectRow)}
                        <tr className="total-row">
                          <td className="subj-name" style={{ color: '#0F172A' }}>TOTAL</td>
                          <td className="score-cell">{reportData?.circular?.bot_total ?? '--'}</td>
                          <td className="grade-cell">{reportData?.circular?.bot_aggregate ?? '--'}</td>
                          <td className="score-cell">{reportData?.circular?.mot_total ?? '--'}</td>
                          <td className="grade-cell">{reportData?.circular?.mot_aggregate ?? '--'}</td>
                          <td className="score-cell">{reportData?.circular?.eot_total ?? '--'}</td>
                          <td className="grade-cell">{reportData?.circular?.aggregate ?? '--'}</td>
                          <td colSpan={2} />
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Grading Key + UNEB Strip */}
                  <div className="grading-container">
                    <table>
                      <tbody>
                        <tr>
                          <td className="grade-head" style={{ width: '12%' }}>GRADE</td>
                          {gradingBands.map((band) => (
                            <td key={`g-${band.grade}`} className="grade-val">{band.grade}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="marks-head" style={{ width: '12%' }}>MARKS</td>
                          {gradingBands.map((band) => (
                            <td key={`m-${band.grade}`} className="grade-val">{band.range}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                    <div className="uneb-strip">
                      <span className="uneb-label">UNEB PRIMARY DIVISION CLASSIFICATION:</span>
                      <span><strong>Div 1:</strong> 4 – 12</span>
                      <span><strong>Div 2:</strong> 13 – 23</span>
                      <span><strong>Div 3:</strong> 24 – 29</span>
                      <span><strong>Div 4:</strong> 30 – 34</span>
                      <span><strong>Div U:</strong> 35 – 36</span>
                    </div>
                  </div>

                  {/* Optional Theology Candidate Section */}
                  {hasTheology && (
                    <div style={{ marginTop: '2px' }}>
                      <table style={{ fontSize: '9px' }}>
                        <thead>
                          <tr>
                            <th colSpan={6} style={{ background: '#0f4d25', fontSize: '9.5px', fontFamily: 'Amiri, serif' }}>
                              نتائج المواد الشرعية
                            </th>
                          </tr>
                          <tr>
                            <th style={{ width: '25%', fontFamily: 'Amiri, serif' }}>المواد</th>
                            <th style={{ width: '15%' }}>الدرجة الكبرى</th>
                            <th style={{ width: '15%' }}>منتصف الفترة</th>
                            <th style={{ width: '15%' }}>الدرجة الكبرى</th>
                            <th style={{ width: '15%' }}>نهاية الفترة</th>
                            <th style={{ width: '15%', fontFamily: 'Amiri, serif' }}>الملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData?.theology?.subjects?.map((sub: any, sIdx: number) => (
                            <tr key={sIdx} className={sIdx % 2 === 0 ? 'row-even' : 'row-odd'}>
                              <td style={{ fontFamily: 'Amiri, serif', fontWeight: 700, textAlign: 'right', paddingRight: '6px' }}>
                                {sub.subject_name_arabic || sub.subject_name}
                              </td>
                              <td>{toAr(100)}</td>
                              <td className="grade-cell">{toAr(sub.mot_score)}</td>
                              <td>{toAr(100)}</td>
                              <td className="grade-cell">{toAr(sub.eot_score)}</td>
                              <td style={{ fontFamily: 'Amiri, serif', textAlign: 'right', paddingRight: '6px' }}>
                                {sub.theology_remark || ''}
                              </td>
                            </tr>
                          ))}
                          <tr className="total-row">
                            <td style={{ fontFamily: 'Amiri, serif', fontWeight: 800 }}>المجموع</td>
                            <td>{toAr((reportData?.theology?.subjects?.length || 4) * 100)}</td>
                            <td>{toAr(reportData?.theology?.mot_total)}</td>
                            <td>{toAr((reportData?.theology?.subjects?.length || 4) * 100)}</td>
                            <td>{toAr(reportData?.theology?.eot_total)}</td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ── FOOTER SECTION ── */}
                <footer className="footer-section">
                  <div className="comments-box">
                    <div className="comment-row">
                      <span className="comment-lbl">Conduct:</span>
                      <span className="comment-val">{conductRemark}</span>
                    </div>

                    <div className="comment-row">
                      <span className="comment-lbl">Class Teacher's Comment:</span>
                      <span className="comment-val">{teacherComment}</span>
                      <div className="sig-box">
                        <span className="comment-lbl" style={{ paddingBottom: '2px' }}>Sig:</span>
                        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', height: '36px', borderBottom: '1.5px dotted #334155' }}>
                          {includeSignatures &&
                            reportData?.student?.class_name &&
                            reportData?.signatures?.[getClassTeacherSignatureKey(reportData.student.class_name) ?? ''] && (
                              <CleanSignatureImage
                                src={reportData.signatures[getClassTeacherSignatureKey(reportData.student.class_name)!]}
                                alt="Class Teacher Signature"
                                style={{ maxHeight: '38px', marginBottom: '-6px' }}
                                studioFormatting={effectiveStudioPass}
                              />
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="comment-row">
                      <span className="comment-lbl">Head Teacher's Comment:</span>
                      <span className="comment-val">{headComment}</span>
                      <div className="sig-box">
                        <span className="comment-lbl" style={{ paddingBottom: '2px' }}>Sig:</span>
                        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', height: '36px', borderBottom: '1.5px dotted #334155' }}>
                          {includeSignatures && reportData?.signatures?.['head-teacher'] && (
                            <CleanSignatureImage
                              src={reportData.signatures['head-teacher']}
                              alt="Head Teacher Signature"
                              style={{ maxHeight: '38px', marginBottom: '-6px' }}
                              studioFormatting={effectiveStudioPass}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dates & Stamp Row */}
                  <div className="bottom-meta-row">
                    <div className="dates-col">
                      <div className="date-box date-red">
                        <span>THIS TERM ENDS ON:</span>
                        <span>{studioFormatting?.reportDateOverride || formatDate(reportData?.term?.end_date || reportData?.term?.endDate)}</span>
                      </div>
                      <div className="date-box date-blue">
                        <span>NEXT TERM BEGINS ON:</span>
                        <span>{studioFormatting?.nextTermBeginsOverride || formatDate(reportData?.term?.next_term_start || reportData?.term?.nextTermBegins || reportData?.term?.next_term_begins)}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '135px',
                        height: '64px',
                        minWidth: '135px',
                        minHeight: '64px',
                        position: 'relative',
                        overflow: 'visible',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {includeStamp ? (
                        <OfficialReportStamp
                          reportData={reportData}
                          studioFormatting={effectiveStudioPass}
                          maxWidth={135}
                          maxHeight={64}
                        />
                      ) : null}
                    </div>
                  </div>

                  {/* Validity Bar */}
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
