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

export default function P7EOTReport({ reportData, studioFormatting }: any) {
  const branding = resolveReportBranding(reportData)
  const gradingBands = resolveReportGradingBands(reportData)
  const printPrefs = reportData?.settings?.print_preferences
  const includeSignatures = printPrefs?.includeSignatures !== undefined ? Boolean(printPrefs.includeSignatures) : true
  const includeStamp = Boolean(printPrefs?.includeStamp)

  const className =
    reportData?.class_name ||
    reportData?.class ||
    reportData?.student?.class_name ||
    ''

  const isMuslim = isMuslimStudent(reportData?.student, reportData)
  const reportTitle = getSecularPortraitReportTitle(className)

  const teacherComment =
    reportData?.circular?.class_teacher_comment ??
    getClassTeacherComment(reportData?.circular?.division ?? null, undefined, reportData?.settings?.grading_scale)

  const headComment =
    reportData?.circular?.head_teacher_comment ??
    getHeadTeacherComment(reportData?.circular?.division ?? null, undefined, reportData?.settings?.grading_scale)

  const conductRemark =
    reportData?.circular?.conduct_remark ??
    getConductRemark(reportData?.circular?.division ?? null)

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
      <td>{subject.bot_score ?? '--'}</td>
      <td className="grade-cell">{subject.bot_grade_display ?? '--'}</td>
      <td>{subject.mot_score ?? '--'}</td>
      <td className="grade-cell">{subject.mot_grade_display ?? '--'}</td>
      <td>{subject.eot_score ?? '--'}</td>
      <td className="grade-cell">{subject.eot_grade_display ?? '--'}</td>
      <td className="remark-cell" style={{ color: remarkColor(subject.remark) }}>
        {subject.remark ||
          (subject.eot_score != null
            ? getSubjectRemark(getSubjectGradeNumber(subject.eot_score))
            : subject.mot_score != null
            ? getSubjectRemark(getSubjectGradeNumber(subject.mot_score))
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
      themeColor={branding.themeColor}
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
          width: 100%;
          height: 100%;
          background: white;
          padding: 3mm;
          margin: 0;
          position: relative;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          flex: 1;
          font-family: 'Montserrat', sans-serif;
          color: #0F172A;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portrait-page.p7-eot-report * { box-sizing: border-box; }
        p, h1, h2, h3, h4, h5, h6 { margin: 0; }

        /* ── PREMIUM DOUBLE BORDERS (Identical to PrimaryEOTReport) ── */
        .p7-eot-report .outer-border {
          border: 4px solid var(--report-border-color, #c2994c);
          padding: 2px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .p7-eot-report .inner-border {
          border: 1.5px solid var(--report-primary-color, #0f4d25);
          padding: 4px 10px;
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          background: #ffffff;
        }

        /* ── WATERMARK ── */
        .p7-eot-report .inner-border::before {
          content: "";
          position: absolute;
          inset: 0;
          background: url('${branding.logoUrl || '/logo-512h.png'}') center center no-repeat;
          background-size: 380px;
          opacity: 0.04;
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
        }

        /* ── HEADER (Identical to PrimaryEOTReport) ── */
        .p7-eot-report .header-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 2px;
        }

        .p7-eot-report .header-left { flex: 0 0 35%; }
        .p7-eot-report .header-left h1 {
          color: #7F1D1D;
          font-size: 16px;
          font-weight: 900;
          margin: 0 0 2px 0;
          line-height: 1.15;
          letter-spacing: -0.2px;
        }
        .p7-eot-report .header-left p {
          color: #4b5563;
          font-size: 9.5px;
          font-weight: 600;
          margin: 1px 0;
        }

        .p7-eot-report .header-center {
          flex: 0 0 32%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .p7-eot-report .bismillah {
          font-family: 'Amiri', serif;
          font-size: 19px;
          color: var(--report-primary-color, #0f4d25);
          line-height: 1;
          margin-bottom: 2px;
        }
        .p7-eot-report .school-logo {
          height: 48px;
          margin-bottom: 2px;
        }
        .p7-eot-report .report-badge {
          background-color: var(--report-primary-color, #0f4d25);
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
          flex: 0 0 33%;
          text-align: right;
        }
        .p7-eot-report .header-right h2 {
          font-family: 'Amiri', serif;
          font-size: 13.5px;
          color: var(--report-primary-color, #0f4d25);
          line-height: 1.25;
          margin: 0;
        }

        .p7-eot-report .header-divider {
          height: 1.5px;
          background: #c2994c;
          margin: 2px 0 4px 0;
          opacity: 0.85;
        }

        /* ── PUPIL INFO ── */
        .p7-eot-report .info-grid {
          display: flex;
          flex-direction: column;
          gap: 3px;
          background-color: #faf8f5;
          border: 1px solid #e2d8b8;
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 11px;
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
          font-size: 10.5px;
          white-space: nowrap;
        }
        .p7-eot-report .info-value {
          font-weight: 900;
          color: #0F172A;
          border-bottom: 1px dotted #94a3b8;
          flex: 1;
          padding-left: 4px;
          font-size: 12px;
        }
        .p7-eot-report .info-value.pupil-name,
        .p7-eot-report .line.pupil-name {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.3px;
          color: #0F172A;
        }

        /* ── TABLES ── */
        .p7-eot-report table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          text-align: center;
        }
        .p7-eot-report th,
        .p7-eot-report td {
          border: 1px solid #cbd5e1;
          padding: 2.5px 3.5px;
          height: 19px;
        }
        .p7-eot-report th {
          background-color: var(--report-primary-color, #0f4d25);
          color: white;
          font-weight: 800;
          letter-spacing: 0.2px;
          font-size: 9.5px;
        }

        .p7-eot-report .row-even { background-color: #ffffff; }
        .p7-eot-report .row-odd { background-color: #fdfaf3; }

        .p7-eot-report .subj-name {
          text-align: left;
          font-weight: 800;
          color: var(--report-primary-color, #0f4d25);
          padding-left: 8px !important;
        }
        .p7-eot-report .grade-cell { font-weight: 800; color: #1e293b; }
        .p7-eot-report .remark-cell { font-style: italic; font-weight: 800; }
        .p7-eot-report .total-row td { background-color: #f1f5f9; font-weight: 800; }

        /* Grading Table */
        .p7-eot-report .grading-container {
          flex-shrink: 0;
          margin-top: 2px;
        }
        .p7-eot-report .grade-head { background-color: var(--report-primary-color, #0f4d25); color: white; font-weight: 800; font-size: 9px; }
        .p7-eot-report .marks-head { background-color: #475569; color: white; font-weight: 800; font-size: 9px; }
        .p7-eot-report .grade-val { background-color: #f1f5f9; font-weight: 700; font-size: 9px; }

        /* ── FOOTER SECTION ── */
        .p7-eot-report .footer-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: auto;
        }

        .p7-eot-report .comments-box {
          background-color: #faf8f5;
          border: 1px solid #e2d8b8;
          border-radius: 6px;
          padding: 5px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .p7-eot-report .comment-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
        }
        .p7-eot-report .comment-lbl {
          font-weight: 800;
          color: #334155;
          white-space: nowrap;
          font-size: 10px;
        }
        .p7-eot-report .comment-val {
          border-bottom: 1px dotted #94a3b8;
          flex: 1;
          font-style: italic;
          font-weight: 700;
          color: #1d4ed8;
          padding-left: 4px;
          font-size: 10.5px;
        }
        .p7-eot-report .sig-box {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 140px;
          flex-shrink: 0;
        }

        /* ── DATES & STAMP ROW ── */
        .p7-eot-report .bottom-meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
        }

        .p7-eot-report .dates-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
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
          background-color: #8b0000;
          color: white;
          text-align: center;
          padding: 4px;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.6px;
          border-radius: 4px;
        }

        @media print {
          .portrait-page.p7-eot-report {
            page: portrait-sheet !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            padding: 4mm 5mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            break-inside: avoid !important;
          }
        }
        `
        }}
      />

      <div className="print-wrapper">
        <div className="portrait-page p7-eot-report" data-report-orientation="portrait">
          <div className="outer-border">
            <div className="inner-border">
              <div className="content-layer">

                {/* ── HEADER ── */}
                <header className="header-section">
                  <div className="header-left">
                    <h1 data-testid="report-school-name">{branding.schoolName}</h1>
                    <p data-testid="report-school-address">{branding.address}</p>
                    <p data-testid="report-school-phone">Tel: {branding.phone}</p>
                    <p style={{ textTransform: 'lowercase' }} data-testid="report-school-email">{branding.email}</p>
                    {branding.motto ? (
                      <p style={{ fontStyle: 'italic' }} data-testid="report-school-motto">
                        &ldquo;{branding.motto}&rdquo;
                      </p>
                    ) : null}
                  </div>

                  <div className="header-center">
                    {isMuslim ? (
                      <div className="bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْم</div>
                    ) : (
                      <div className="h-4" />
                    )}
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
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
                        style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '52px' }}
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

                  <div className="header-right">
                    {isMuslim ? (
                      <h2>
                        مدرسة جدة الإسلامية للروضة
                        <br />
                        والإبتدائية - انساغو - واكيسو
                      </h2>
                    ) : (
                      <div>
                        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', fontWeight: 800, color: '#0f4d25' }}>
                          MINISTRY OF EDUCATION &amp; SPORTS
                        </h2>
                        <p style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>
                          Reg No: PSS/J/04 • UNEB Center No: 610084
                        </p>
                      </div>
                    )}
                  </div>
                </header>

                <div className="header-divider" />

                {/* ── PUPIL INFO ── */}
                <div className="info-grid">
                  <div className="info-row">
                    <div className="info-item" style={{ flex: 2 }}>
                      <span className="info-label">PUPIL'S NAME:</span>
                      <span className="info-value pupil-name line line.pupil-name">
                        {studentName}
                      </span>
                    </div>
                    {arabicName && (
                      <div className="info-item" style={{ flex: 1.5, direction: 'rtl' }}>
                        <span className="info-label" style={{ fontFamily: 'Amiri, serif' }}>اسم التلميذ:</span>
                        <span className="info-value" style={{ fontFamily: 'Amiri, serif', fontSize: '15px' }}>
                          {arabicName}
                        </span>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="info-label">CLASS:</span>
                      <span className="info-value">{className || 'P.7'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">YEAR:</span>
                      <span className="info-value">{reportData?.term?.academic_year || 2026}</span>
                    </div>
                  </div>

                  <div className="info-row">
                    <div className="info-item">
                      <span className="info-label">TERM:</span>
                      <span className="info-value">{reportData?.term?.term_number || '3'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">GENDER:</span>
                      <span className="info-value">{reportData?.student?.gender || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">LIN / REG:</span>
                      <span className="info-value">{reportData?.student?.admission_number || reportData?.student?.lin || '--'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">TOTAL AGG:</span>
                      <span className="info-value" style={{ color: '#0D5C3A' }}>
                        {reportData?.circular?.aggregate ?? '--'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">DIVISION:</span>
                      <span className="info-value" style={{ color: '#0D5C3A' }}>
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
                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <table>
                    <thead>
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
                        <td>{reportData?.circular?.bot_total ?? '--'}</td>
                        <td className="grade-cell">{reportData?.circular?.bot_aggregate ?? '--'}</td>
                        <td>{reportData?.circular?.mot_total ?? '--'}</td>
                        <td className="grade-cell">{reportData?.circular?.mot_aggregate ?? '--'}</td>
                        <td>{reportData?.circular?.eot_total ?? '--'}</td>
                        <td className="grade-cell">{reportData?.circular?.aggregate ?? '--'}</td>
                        <td colSpan={2} />
                      </tr>
                    </tbody>
                  </table>

                  {/* Grading Key */}
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
                        <span className="comment-lbl">Sig:</span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '22px' }}>
                          {includeSignatures &&
                            reportData?.student?.class_name &&
                            reportData?.signatures?.[getClassTeacherSignatureKey(reportData.student.class_name) ?? ''] && (
                              <CleanSignatureImage
                                src={reportData.signatures[getClassTeacherSignatureKey(reportData.student.class_name)!]}
                                alt="Class Teacher Signature"
                                style={{ maxHeight: '24px' }}
                                studioFormatting={studioFormatting}
                              />
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="comment-row">
                      <span className="comment-lbl">Head Teacher's Comment:</span>
                      <span className="comment-val">{headComment}</span>
                      <div className="sig-box">
                        <span className="comment-lbl">Sig:</span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '22px' }}>
                          {includeSignatures && reportData?.signatures?.['head-teacher'] && (
                            <CleanSignatureImage
                              src={reportData.signatures['head-teacher']}
                              alt="Head Teacher Signature"
                              style={{ maxHeight: '24px' }}
                              studioFormatting={studioFormatting}
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
                        <span>{formatDate(reportData?.term?.end_date)}</span>
                      </div>
                      <div className="date-box date-blue">
                        <span>NEXT TERM BEGINS ON:</span>
                        <span>{formatDate(reportData?.term?.next_term_start)}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '135px',
                        height: '68px',
                        maxWidth: '135px',
                        maxHeight: '68px',
                        overflow: 'hidden',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {includeStamp ? (
                        <OfficialReportStamp
                          reportData={reportData}
                          studioFormatting={studioFormatting}
                          maxWidth={135}
                          maxHeight={68}
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
