import {
  getClassTeacherComment,
  getHeadTeacherComment,
  getConductRemark,
  getTheologyComment,
  getSubjectRemark,
  getSubjectGradeNumber,
} from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'

import { getClassTeacherSignatureKey } from '@/utils/signatures'
import { transliterateEnglishToArabic } from '@/lib/transliterate'

export default function PrimaryEOTReport({ reportData }: any) {
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

  const toHijri = (gregorianYear: number): number =>
    Math.round((gregorianYear - 622) * (33 / 32))

  const teacherComment =
    reportData?.circular?.class_teacher_comment ||
    getClassTeacherComment(reportData?.circular?.division ?? null)
  const headComment =
    reportData?.circular?.head_teacher_comment ||
    getHeadTeacherComment(reportData?.circular?.division ?? null)
  const conductRemark =
    reportData?.circular?.conduct_remark ??
    getConductRemark(reportData?.circular?.division ?? null)

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
    } catch (error) {
      return dateString
    }
  }

  const arabicSubjects = [
    "القرآن",
    "اللغة",
    "الفقه",
    "التربية",
  ];

  const renderSubjectRow = (subject: any, i: number) => (
    <tr key={subject.subject_name} className={i % 2 === 0 ? "row-even" : "row-odd"}>
      <td className="subj-name">{subject.subject_name}</td>
      <td>{subject.bot_score ?? "--"}</td>
      <td className="grade-cell">{subject.bot_grade_display ?? "--"}</td>
      <td>{subject.mot_score ?? "--"}</td>
      <td className="grade-cell">{subject.mot_grade_display ?? "--"}</td>
      <td>{subject.eot_score ?? "--"}</td>
      <td className="grade-cell">{subject.eot_grade_display ?? "--"}</td>
      <td className="remark-cell" style={{ color: remarkColor(subject.remark) }}>
        {subject.remark || (subject.eot_score != null ? getSubjectRemark(getSubjectGradeNumber(subject.eot_score)) : subject.mot_score != null ? getSubjectRemark(getSubjectGradeNumber(subject.mot_score)) : "")}
      </td>
      <td style={{ textTransform: 'uppercase', fontFamily: '"Caveat", cursive', fontWeight: 'bold', fontSize: '1.2em', color: '#047857' }}>{(subject.teacher_initials || '').toUpperCase()}</td>
    </tr>
  )

  return (
    <ReportContainer reportType="PrimaryEOTReport">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Montserrat:wght@500;600;700;800;900&display=swap');

        /* ── RESPONSIVE & PRINT ARCHITECTURE ── */
        @media screen {
          .print-wrapper {
            width: 100%;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #52525b;
            overflow: auto;
          }
          .landscape-page {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 0 !important;
          }
          html, body {
            width: 297mm !important;
            height: 209mm !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
          }
          .print-wrapper {
            display: block !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .landscape-page {
            width: 297mm !important;
            height: 205mm !important;
            margin: 0 !important;
            padding: 3mm !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
        }

        /* ── PAGE CONTAINER ── */
        .landscape-page {
          width: 297mm;
          min-height: 205mm;
          background: white;
          padding: 4mm;
          margin: 0 auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          position: relative;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        .landscape-page * { box-sizing: border-box; }
        p, h1, h2, h3, h4, h5, h6 { margin: 0; }

        /* ── PREMIUM DOUBLE BORDERS ── */
        .outer-border {
          border: 4px solid #c2994c;
          padding: 2px;
          flex: 1; 
          display: flex;
          flex-direction: column;
        }
        
        .inner-border {
          border: 1.5px solid #0f4d25;
          padding: 6px 16px;
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
          background: url('/school_budge.jpeg') center center no-repeat;
          background-size: 420px;
          opacity: 0.04;
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
          gap: 6px;
        }

        /* ── HEADER SECTION ── */
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }
        
        .header-left { flex: 0 0 35%; }
        .header-left h1 {
          color: #8b0000;
          font-size: 17px;
          font-weight: 900;
          margin: 0 0 4px 0;
          line-height: 1.15;
          letter-spacing: -0.2px;
        }
        .header-left p {
          color: #4b5563;
          font-size: 10px;
          font-weight: 600;
          margin: 2px 0;
        }
        
        .header-center {
          flex: 0 0 30%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .bismillah {
          font-family: 'Amiri', serif;
          font-size: 24px;
          color: #0f4d25;
          line-height: 1;
          margin-bottom: 2px;
        }
        .school-logo {
          height: 44px; 
          margin-bottom: 4px;
        }
        .report-badge {
          background-color: #0f4d25;
          color: #ffffff;
          padding: 4px 18px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .header-right {
          flex: 0 0 35%;
          text-align: right;
          direction: rtl;
        }
        .header-right h2 {
          color: #8b0000;
          font-family: 'Amiri', serif;
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          line-height: 1.25;
        }

        .header-divider {
          border-top: 1.5px solid #0f4d25;
          margin: 6px 0;
          flex-shrink: 0;
        }

        /* ── PUPIL INFO SECTION ── */
        .info-section {
          display: flex;
          gap: 16px;
          flex-shrink: 0;
        }
        .info-box {
          border: 1.5px dashed #c2994c;
          border-radius: 8px;
          padding: 8px 16px; 
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          gap: 6px; 
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
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          padding-bottom: 1px;
          min-width: 40px;
          text-align: center;
        }
        .info-box.arabic {
          direction: rtl;
          font-family: 'Amiri', serif;
        }
        .info-box.arabic .info-label { font-size: 14px; font-weight: 700; }
        .info-box.arabic .info-value { font-size: 15px; border-bottom: 1.5px dotted #94a3b8; }

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
          gap: 10px; /* Space between academic and grading table */
        }
        .table-col-theology { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          direction: rtl; 
          gap: 10px; /* Space between theology table and notes */
        }

        /* Flawless Rounded Table Container Hack */
        .table-container {
          border: 2px solid #c2994c;
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
          padding: 3px 4px; /* Internal cell padding */
          text-align: center;
          font-size: 10px;
          vertical-align: middle;
        }
        
        .th-banner {
          background-color: #c2994c;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .table-container thead th { border-color: #c2994c; }
        
        .th-sub {
          background-color: #0f4d25;
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .row-even { background-color: #ffffff; }
        .row-odd { background-color: #fdfaf3; }
        
        .subj-name {
          text-align: left;
          font-weight: 800;
          color: #0f4d25;
          padding-left: 10px !important;
        }
        .grade-cell { font-weight: 800; color: #1e293b; }
        .remark-cell { font-style: italic; font-weight: 800; }
        .total-row td { background-color: #f1f5f9; font-weight: 800; }

        /* Grading Table */
        .grading-container {
          flex-shrink: 0; /* Stop grading table from expanding */
        }
        .grade-head { background-color: #0f4d25; color: white; font-weight: 800; } 
        .marks-head { background-color: #475569; color: white; font-weight: 800; }
        .grade-val { background-color: #f1f5f9; font-weight: 700; }

        /* Theology Specifics */
        .theology-table th { font-family: 'Amiri', serif; font-size: 14px; }
        .theology-table td { font-family: 'Amiri', serif; font-size: 14px; font-weight: bold; }
        .theology-subj { text-align: right; font-weight: 700; padding-right: 12px !important; color: #0f4d25; }
        
        .theology-notes {
          font-family: 'Amiri', serif;
          font-size: 15px;
          flex-shrink: 0;
        }
        .t-note-row { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 6px; }
        .t-note-lbl { font-weight: 700; white-space: nowrap; }
        .t-note-val { border-bottom: 1.5px dotted #94a3b8; flex: 1; min-width: 50px; font-style: italic; font-weight: 700; color: #ea580c; text-align: right; padding-bottom: 2px;}

        /* ── FOOTER SECTION ── */
        .footer-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
        }
        
        .comments-and-stamp {
          display: flex;
          gap: 20px; 
          align-items: flex-end;
        }
        .comments-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px; 
          border: 1.5px dashed #cbd5e1;
          padding: 8px 12px; 
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
          font-size: 12px;
          font-weight: 800;
          font-style: italic;
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
          gap: 20px;
        }
        .date-box {
          flex: 1;
          border-radius: 6px;
          padding: 8px 16px; 
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px; 
          font-size: 11px;
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
          background-color: #8b0000;
          color: white;
          text-align: center;
          padding: 8px; 
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          border-radius: 4px;
        }
        `
        }}
      />

      <div className="print-wrapper">
        <div className="landscape-page">
          <div className="outer-border">
            <div className="inner-border">
              <div className="content-layer">

                {/* ── HEADER ── */}
                <header className="header-section">
                  <div className="header-left">
                    <h1>JIDDAH ISLAMIC SCHOOLS</h1>
                    <p>P.O.Box 34008 Kampala (u)</p>
                    <p>Tel: +256 744950042 / 0705316961</p>
                    <p style={{ textTransform: 'lowercase' }}>jiddahislamicnurseryandpri@gmail.com</p>
                  </div>

                  <div className="header-center">
                    <div className="bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْم</div>
                    <img src="/school_budge.jpeg" alt="School Badge" className="school-logo" />
                    <div className="report-badge">
                      {isLower ? 'LOWER' : 'UPPER'} REPORT FORM – END OF TERM
                    </div>
                  </div>

                  <div className="header-right">
                    <h2>مدرسة جدة الإسلامية للروضة<br />والإبتدائية - انساغو - واكيسو</h2>
                  </div>
                </header>

                <div className="header-divider"></div>

                {/* ── PUPIL INFO ── */}
                <section className="info-section">
                  <div className="info-box">
                    <div className="info-row">
                      <span className="info-label">PUPIL&apos;S NAME:</span>
                      <div className="info-value" style={{ textTransform: 'uppercase' }}>{reportData?.student?.name}</div>
                    </div>
                    <div className="info-row">
                      <span className="info-label">CLASS:</span>
                      <div className="info-value" style={{ flex: 0.5 }}>{className}</div>
                      <span className="info-label">TERM:</span>
                      <div className="info-value" style={{ flex: 0.5 }}>{reportData?.term?.label || `Term ${reportData?.term?.term_number}`}</div>
                      <span className="info-label">YEAR:</span>
                      <div className="info-value" style={{ flex: 0.5 }}>{reportData?.term?.academic_year}</div>
                    </div>
                    <div className="info-row">
                      <span className="info-label">DIVISION:</span>
                      <div className="info-value" style={{ flex: 1 }}>{reportData?.circular?.division ?? '--'}</div>
                    </div>
                  </div>

                  {showTheologyPanel && (
                    <div className="info-box arabic">
                      <div className="info-row">
                        <span className="info-label">اسم التلميذ/ة :</span>
                        <div className="info-value">
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
                      {/* Position removed */}
                    </div>
                  )}
                </section>

                {/* ── TABLES ── */}
                <main className="tables-wrapper">

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
                            <th className="th-sub border-t border-t-[#c2994c]">MARK</th>
                            <th className="th-sub border-t border-t-[#c2994c]">AGG</th>
                            <th className="th-sub border-t border-t-[#c2994c]">MARK</th>
                            <th className="th-sub border-t border-t-[#c2994c]">AGG</th>
                            <th className="th-sub border-t border-t-[#c2994c]">MARK</th>
                            <th className="th-sub border-t border-t-[#c2994c]">AGG</th>
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

                    <div className="table-container grading-container">
                      <table>
                        <tbody>
                          <tr>
                            <th className="grade-head">-- GRADE --</th>
                            <td className="grade-val">D1</td><td className="grade-val">D2</td><td className="grade-val">C3</td><td className="grade-val">C4</td><td className="grade-val">C5</td><td className="grade-val">C6</td><td className="grade-val">P7</td><td className="grade-val">P8</td><td className="grade-val">F9</td>
                          </tr>
                          <tr>
                            <th className="marks-head border-t border-t-[#c2994c]">Marks</th>
                            <td>85-100</td><td>75-84</td><td>70-74</td><td>60-69</td><td>55-59</td><td>50-54</td><td>40-49</td><td>35-39</td><td>0-34</td>
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
                              <th className="th-sub border-t border-t-[#c2994c]">الدرجة الكبرى</th>
                              <th className="th-sub border-t border-t-[#c2994c]">الدرجة الصغرى</th>
                              <th className="th-sub border-t border-t-[#c2994c]">الدرجة الكبرى</th>
                              <th className="th-sub border-t border-t-[#c2994c]">الدرجة الصغرى</th>
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
                          <div className="t-note-val" style={{ color: remarkColor(getTheologyComment(reportData?.theology?.eot_total ?? null)) }}>
                            {getTheologyComment(reportData?.theology?.eot_total ?? null)}
                          </div>
                        </div>
                        <div className="t-note-row">
                          <span className="t-note-lbl">التوقيع والختم:</span>
                          <div className="t-note-val" style={{ flex: 1 }}></div>
                          <div className="t-note-val" style={{ flex: 0.6, borderBottom: 'none' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </main>

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
                        <div className="c-sig" style={{ display: 'flex', justifyContent: 'center' }}>
                          {reportData?.student?.class_name && reportData?.signatures?.[getClassTeacherSignatureKey(reportData.student.class_name) ?? ''] ? (
                            <img src={reportData.signatures[getClassTeacherSignatureKey(reportData.student.class_name)!]} style={{ maxHeight: '24px' }} alt="" />
                          ) : null}
                        </div>
                      </div>
                      <div className="comment-line">
                        <span className="c-label">HEAD TEACHER&apos;S COMMENT:</span>
                        <div className="c-value" style={{ textTransform: 'uppercase' }}>{headComment}</div>
                        <span className="c-label">SIGNATURE:</span>
                        <div className="c-sig" style={{ display: 'flex', justifyContent: 'center' }}>
                          {reportData?.signatures?.['head-teacher'] ? <img src={reportData.signatures['head-teacher']} style={{ maxHeight: '24px' }} alt="" /> : null}
                        </div>
                      </div>
                    </div>

                    <div className="stamp-wrapper" style={{ flexShrink: 0, paddingLeft: '10px', minWidth: '100px', minHeight: '60px', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>OFFICIAL<br />STAMP</span>
                    </div>
                  </div>

                  <div className="dates-row">
                    <div className="date-box date-red">
                      <span>THIS TERM ENDS ON:</span>
                      <span>{formatDate(reportData?.term?.end_date)}</span>
                    </div>
                    <div className="date-box date-blue">
                      <span>NEXT TERM BEGINS ON:</span>
                      <span>{formatDate(reportData?.term?.next_term_start)}</span>
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