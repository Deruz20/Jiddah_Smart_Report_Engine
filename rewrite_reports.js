const fs = require('fs');

const EOTPath = 'src/components/reports/PrimaryEOTReport.tsx';
const MOTPath = 'src/components/reports/PrimaryMOTReport.tsx';
const BOTPath = 'src/components/reports/PrimaryBOTReport.tsx';

function getTemplate(reportType, termLabel, isEOT) {
return `import {
  getClassTeacherComment,
  getHeadTeacherComment,
  getConductRemark,
  getTheologyComment,
} from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'
import { transliterateEnglishToArabic } from '@/lib/transliterate'

export default function ${reportType}({ reportData }: any) {
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

  const termInArabic = (n: number): string => {
    if (n === 1) return 'الأولى'
    if (n === 2) return 'الثاني'
    if (n === 3) return 'الثالث'
    return String(n)
  }

  const teacherComment =
    reportData?.circular?.class_teacher_comment ??
    getClassTeacherComment(reportData?.circular?.division ?? null)
  const headComment =
    reportData?.circular?.head_teacher_comment ??
    getHeadTeacherComment(reportData?.circular?.division ?? null)
  const conductRemark =
    reportData?.circular?.conduct_remark ??
    getConductRemark(reportData?.circular?.division ?? null)

  const renderSubjectRow = (subject: any) => (
    <tr key={subject.subject_name}>
      <td style={{ textAlign: 'left', paddingLeft: '8px' }}>
        {subject.subject_name}
      </td>
      ${!isEOT ? '<td className="data-cell">{subject.score ?? \'--\'}</td>' : ''}
      ${!isEOT ? '<td className="data-cell">{subject.grade_display ?? \'--\'}</td>' : ''}
      ${isEOT ? '<td className="data-cell">{subject.bot_score ?? \'--\'}</td>' : ''}
      ${isEOT ? '<td className="data-cell">{subject.bot_grade_display ?? \'--\'}</td>' : ''}
      ${isEOT ? '<td className="data-cell">{subject.mot_score ?? \'--\'}</td>' : ''}
      ${isEOT ? '<td className="data-cell">{subject.mot_grade_display ?? \'--\'}</td>' : ''}
      ${isEOT ? '<td className="data-cell">{subject.eot_score ?? \'--\'}</td>' : ''}
      ${isEOT ? '<td className="data-cell">{subject.eot_grade_display ?? \'--\'}</td>' : ''}
      <td className="remarks-cell">
        {subject.remark ?? ''}
      </td>
    </tr>
  )

  return (
    <ReportContainer reportType="${reportType}">
      <style
        dangerouslySetInnerHTML={{
          __html: \`
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Poppins:wght@400;500;600;700;800&family=Cairo:wght@600;700;800&display=swap');

    .primary-report,
    .primary-report * {
        box-sizing: border-box;
    }

    .primary-report {
        --primary-green: #15803d; 
        --secondary-green: #166534;
        --deep-maroon: #800000;
        --border-light: #cbd5e1;
        --data-indigo: #1e293b;
        --data-teal: #0369a1;
        
        width: 100%;
        height: 100%;
        max-height: 100%;
        overflow: hidden;
        
        margin: 0 auto;
        background: #ffffff;
        border: 4px solid var(--deep-maroon);
        outline: 2px solid var(--primary-green);
        outline-offset: -10px;
        padding: 16px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-family: 'Poppins', sans-serif;
        color: #1a1a1a;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .primary-report::before {
        content: "";
        position: absolute;
        inset: 0;
        background: url('/school_budge.jpeg') center center no-repeat;
        background-size: 450px;
        opacity: 0.04;
        pointer-events: none;
        z-index: 0;
    }
    
    .primary-report > * {
        position: relative;
        z-index: 1;
    }

    /* HEADER */
    .primary-report .header {
        flex: 0 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 16px 12px 16px;
        border-bottom: 2px solid var(--primary-green);
        margin-bottom: 12px;
    }

    .primary-report .school-left { width: 35%; }
    .primary-report .school-left h1 {
        margin: 0;
        font-size: 16px;
        color: var(--deep-maroon);
        font-weight: 800;
        line-height: 1.2;
    }
    .primary-report .school-left p { margin: 2px 0; font-size: 10px; font-weight: 600; color: #475569; }

    .primary-report .header-center { width: 30%; text-align: center; display: flex; flex-direction: column; align-items: center; }
    .primary-report .bismillah {
        font-family: 'Amiri', serif;
        font-size: 26px;
        color: var(--primary-green);
        margin-bottom: -4px;
        font-weight: 700;
    }
    
    .primary-report .logo {
        width: 65px;
        height: 65px;
        margin: 0 auto 4px;
    }
    
    .primary-report .logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .primary-report .report-badge {
        display: inline-block;
        background: var(--primary-green);
        color: white;
        padding: 4px 16px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        border: 2px solid white;
        box-shadow: 0 0 0 1px var(--primary-green);
    }

    .primary-report .header-right { width: 35%; text-align: right; direction: rtl; font-family: 'Cairo', sans-serif;}
    .primary-report .header-right h2 {
        margin: 0;
        font-size: 20px;
        color: var(--deep-maroon);
        line-height: 1.2;
        font-weight: 800;
    }
    .primary-report .header-right p { margin: 2px 0; font-size: 11px; font-weight: 700; color: #475569; }

    /* INFO BOXES */
    .primary-report .info-grid {
        flex: 0 0 auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        padding: 0 8px;
        margin-bottom: 12px;
    }
    
    .primary-report .info-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        font-size: 12px;
        margin-bottom: 4px;
    }
    
    .primary-report .info-label {
        font-weight: 800;
        color: var(--deep-maroon);
        white-space: nowrap;
        text-transform: uppercase;
        font-size: 11px;
    }
    
    .primary-report .dot-line {
        flex: 1;
        border-bottom: 2px dotted #94a3b8;
        color: var(--data-indigo);
        font-weight: 700;
        font-size: 13px;
        text-align: center;
        padding-bottom: 2px;
        min-width: 50px;
    }
    
    .primary-report .info-row-rtl {
        direction: rtl;
        font-family: 'Cairo', sans-serif;
    }
    .primary-report .info-row-rtl .info-label {
        font-size: 13px;
    }

    /* TABLES CONTAINER */
    .primary-report .tables-container {
        flex: 1 1 auto;
        display: flex;
        gap: 12px;
        min-height: 0;
        padding: 0 8px;
    }
    
    .primary-report .academic-side { flex: 1.1; display: flex; flex-direction: column; }
    .primary-report .theology-side { flex: 0.9; display: flex; flex-direction: column; }

    .primary-report table {
        width: 100%;
        border-collapse: collapse;
        text-align: center;
        border: 2px solid var(--primary-green);
        background: white;
    }
    
    .primary-report th, .primary-report td {
        border: 1px solid var(--primary-green);
    }
    
    .primary-report th {
        background: var(--primary-green);
        color: white;
        font-size: 10px;
        padding: 5px 4px;
        text-transform: uppercase;
        font-weight: 700;
    }
    
    .primary-report .table-banner {
        background: var(--secondary-green);
        color: white;
        font-size: 12px;
        letter-spacing: 1px;
        padding: 5px;
        text-align: center;
        text-transform: uppercase;
        font-weight: 800;
        border-bottom: 2px solid var(--primary-green);
    }
    
    .primary-report td {
        padding: 4px;
        font-size: 11px;
        font-weight: 700;
        color: var(--data-indigo);
    }
    
    .primary-report .data-cell {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        font-weight: 800;
    }
    
    .primary-report .remarks-cell {
        font-size: 10px;
        font-style: italic;
        color: var(--data-teal);
        text-align: left;
        padding-left: 6px;
    }

    /* THEOLOGY SIDE (RTL) */
    .primary-report .theology-side table {
        direction: rtl;
        font-family: 'Cairo', sans-serif;
    }
    
    .primary-report .theology-side th {
        font-size: 12px;
        font-weight: 800;
    }
    
    .primary-report .theology-side td {
        font-size: 13px;
        font-weight: 800;
    }
    
    .primary-report .theology-side .remarks-cell {
        text-align: right;
        padding-right: 8px;
        font-size: 12px;
    }

    /* GRADING SCALE (under academic side) */
    .primary-report .grading-scale {
        margin-top: 12px;
        border: 2px solid var(--deep-maroon);
        background: white;
        flex: 0 0 auto;
    }
    
    .primary-report .grading-banner {
        background: var(--deep-maroon);
        color: white;
        font-size: 10px;
        font-weight: 800;
        text-align: center;
        padding: 3px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    .primary-report .grading-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0;
        background: var(--deep-maroon);
        border-top: 1px solid var(--deep-maroon);
    }
    
    .primary-report .g-item {
        background: white;
        padding: 2px 6px;
        font-size: 9px;
        font-weight: 700;
        display: flex;
        justify-content: space-between;
        border: 1px solid var(--deep-maroon);
    }
    
    .primary-report .g-item span { color: var(--deep-maroon); font-weight: 900; }

    /* FOOTER */
    .primary-report .footer-section {
        flex: 0 0 auto;
        margin-top: 12px;
        padding: 0 8px;
        display: flex;
        gap: 16px;
        align-items: stretch;
    }
    
    .primary-report .comments-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    
    .primary-report .comment-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        margin-bottom: 8px;
    }
    
    .primary-report .c-label {
        font-size: 11px;
        font-weight: 800;
        color: #475569;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .primary-report .c-line {
        flex: 1;
        border-bottom: 2px dotted #94a3b8;
        padding-bottom: 2px;
        color: var(--data-teal);
        font-style: italic;
        font-weight: 800;
        font-size: 13px;
        font-family: 'Georgia', serif;
    }
    
    .primary-report .sign-box {
        width: 150px;
        display: flex;
        align-items: flex-end;
        gap: 6px;
    }
    .primary-report .sign-box .c-label { font-size: 10px; }

    .primary-report .dates-row {
        display: flex;
        gap: 24px;
        margin-top: 4px;
    }
    
    .primary-report .date-item {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
    }
    .primary-report .date-item span {
        margin-left: 8px;
        color: var(--deep-maroon);
        border-bottom: 2px dotted var(--deep-maroon);
        padding-bottom: 2px;
    }
    
    .primary-report .stamp-box {
        width: 120px;
        height: 120px;
        border: 2px dashed #94a3b8;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 11px;
        font-weight: 800;
        color: #94a3b8;
        flex-shrink: 0;
        padding: 10px;
        align-self: flex-end;
    }
        \`
        }} />

      <div className="primary-report">
        <header className="header">
          <div className="school-left">
            <h1>JIDDAH ISLAMIC NURSERY<br/>AND PRIMARY SCHOOL - Nsaggu</h1>
            <p>P.O.Box 34008 Kampala (U)</p>
            <p>Tel: +256 744950042 / 0705316961</p>
            <p>jiddahislamicnurseryandpri@gmail.com</p>
          </div>
          <div className="header-center">
            <div className="bismillah">بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيْم</div>
            <div className="logo">
              <img src="/school_budge.jpeg" alt="Logo" />
            </div>
            <div className="report-badge">${isLower ? 'LOWER REPORT FORM' : 'UPPER REPORT FORM'} - ${termLabel}</div>
          </div>
          <div className="header-right">
            <h2>مدرسة جدة الإسلامية للروضة<br/>والإبتدائية - انساغو - واكيسو</h2>
          </div>
        </header>

        <div className="info-grid">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="info-row">
              <span className="info-label">PUPIL'S NAME:</span>
              <div className="dot-line">{reportData?.student?.name || ''}</div>
            </div>
            <div className="info-row">
              <span className="info-label">CLASS:</span>
              <div className="dot-line" style={{flex: 1}}>{className}</div>
              <span className="info-label" style={{marginLeft: '12px'}}>TERM:</span>
              <div className="dot-line" style={{flex: 1}}>Term {reportData?.term?.term_number}</div>
              <span className="info-label" style={{marginLeft: '12px'}}>YEAR:</span>
              <div className="dot-line" style={{flex: 1}}>{reportData?.term?.academic_year}</div>
            </div>
            <div className="info-row">
              <span className="info-label">POSITION:</span>
              <div className="dot-line">{toAr(reportData?.circular?.position)}</div>
              <span className="info-label" style={{marginLeft: '12px'}}>OUT OF:</span>
              <div className="dot-line">{toAr(reportData?.meta?.total_students)}</div>
              <span className="info-label" style={{marginLeft: '12px'}}>DIVISION:</span>
              <div className="dot-line">{toAr(reportData?.circular?.division)}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="info-row info-row-rtl">
              <span className="info-label">اسم التلميذ/ة:</span>
              <div className="dot-line">{reportData?.student?.arabic_name || transliterateEnglishToArabic(reportData?.student?.name || '')}</div>
            </div>
            <div className="info-row info-row-rtl">
              <span className="info-label">الفصل:</span>
              <div className="dot-line" style={{flex: 1}}>{reportData?.student?.theology_class_arabic ?? reportData?.student?.class_name}</div>
              <span className="info-label" style={{marginRight: '12px'}}>الفترة:</span>
              <div className="dot-line" style={{flex: 1}}>{toAr(reportData?.term?.term_number)}</div>
              <span className="info-label" style={{marginRight: '12px'}}>عام:</span>
              <div className="dot-line" style={{flex: 1}}>{toAr(toHijri(Number(reportData?.term?.academic_year)))} <span>هـ</span></div>
              <div className="dot-line" style={{flex: 1}}>{toAr(reportData?.term?.academic_year)} <span>م</span></div>
            </div>
            <div className="info-row info-row-rtl">
              <span className="info-label">الترتيب:</span>
              <div className="dot-line">{toAr(reportData?.theology?.position)}</div>
              <span className="info-label" style={{marginRight: '12px'}}>عدد الطلبة:</span>
              <div className="dot-line">{toAr(reportData?.meta?.total_students)}</div>
            </div>
          </div>
        </div>

        <div className="tables-container">
          <div className="academic-side">
            <table>
              <thead>
                <tr>
                  <th colSpan={${isEOT ? 7 : 4}} className="table-banner">COMPARATIVE PERFORMANCE</th>
                </tr>
                ${isEOT ? `
                <tr>
                  <th rowSpan={2} style={{ width: '28%', textAlign: 'left', paddingLeft: '8px' }}>SUBJECTS</th>
                  <th colSpan={2} style={{ width: '12%' }}>BOT</th>
                  <th colSpan={2} style={{ width: '12%' }}>MOT</th>
                  <th colSpan={2} style={{ width: '12%' }}>EOT</th>
                  <th rowSpan={2} style={{ width: '36%' }}>TEACHER'S REMARKS</th>
                </tr>
                <tr>
                  <th style={{ width: '6%' }}>MARK</th><th style={{ width: '6%' }}>AGG</th>
                  <th style={{ width: '6%' }}>MARK</th><th style={{ width: '6%' }}>AGG</th>
                  <th style={{ width: '6%' }}>MARK</th><th style={{ width: '6%' }}>AGG</th>
                </tr>
                ` : `
                <tr>
                  <th style={{ width: '40%', textAlign: 'left', paddingLeft: '8px' }}>SUBJECTS</th>
                  <th style={{ width: '10%' }}>MARK</th>
                  <th style={{ width: '10%' }}>AGG</th>
                  <th style={{ width: '40%' }}>TEACHER'S REMARKS</th>
                </tr>
                `}
              </thead>
              <tbody>
                {reportData?.circular?.subjects?.map(renderSubjectRow)}
                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                  <td style={{ textAlign: 'left', paddingLeft: '8px' }}>TOTAL</td>
                  ${isEOT ? `
                  <td>{reportData?.circular?.bot_total ?? '--'}</td>
                  <td>--</td>
                  <td>{reportData?.circular?.mot_total ?? '--'}</td>
                  <td>--</td>
                  <td>{reportData?.circular?.eot_total ?? '--'}</td>
                  ` : `
                  <td>{reportData?.circular?.total ?? '--'}</td>
                  `}
                  <td>{reportData?.circular?.aggregates ?? '--'}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            
            <div className="grading-scale">
              <div className="grading-banner">GRADING SCALE</div>
              <div className="grading-grid">
                <div className="g-item"><span>D1</span> 90-100</div>
                <div className="g-item"><span>D2</span> 80-89</div>
                <div className="g-item"><span>C3</span> 70-79</div>
                <div className="g-item"><span>C4</span> 60-69</div>
                <div className="g-item"><span>C5</span> 55-59</div>
                <div className="g-item"><span>C6</span> 50-54</div>
                <div className="g-item"><span>P7</span> 45-49</div>
                <div className="g-item"><span>P8</span> 40-44</div>
                <div className="g-item"><span>F9</span> 0-39</div>
              </div>
            </div>
          </div>

          {showTheologyPanel && (
            <div className="theology-side">
              <table>
                <thead>
                  <tr>
                    <th colSpan={${isEOT ? 6 : 4}} className="table-banner">تابع المواد الشرعية</th>
                  </tr>
                  ${isEOT ? `
                  <tr>
                    <th rowSpan={2} style={{ width: '22%' }}>المواد</th>
                    <th colSpan={2} style={{ width: '24%' }}>منتصف الفترة</th>
                    <th colSpan={2} style={{ width: '24%' }}>نهاية الفترة</th>
                    <th rowSpan={2} style={{ width: '30%' }}>الملاحظات</th>
                  </tr>
                  <tr>
                    <th style={{ width: '12%' }}>الدرجة الكبرى</th>
                    <th style={{ width: '12%' }}>الدرجة الصغرى</th>
                    <th style={{ width: '12%' }}>الدرجة الكبرى</th>
                    <th style={{ width: '12%' }}>الدرجة الصغرى</th>
                  </tr>
                  ` : `
                  <tr>
                    <th style={{ width: '25%' }}>المواد</th>
                    <th style={{ width: '20%' }}>الدرجة الكبرى</th>
                    <th style={{ width: '20%' }}>الدرجة الصغرى</th>
                    <th style={{ width: '35%' }}>الملاحظات</th>
                  </tr>
                  `}
                </thead>
                <tbody>
                  {[
                    'القرآن الكريم',
                    'اللغة العربية',
                    'الفقه الإسلامي',
                    'التربية الإسلامية'
                  ].map((arabicName) => {
                    const subject = reportData?.theology?.subjects?.find((s: any) => {
                      const dbName = s.subject_name_arabic === 'التاريخ والسيرة' ? 'التربية' : (s.subject_name_arabic || '');
                      return arabicName.includes(dbName) || dbName.includes(arabicName.split(' ')[0]);
                    });
                    
                    return (
                    <tr key={arabicName}>
                      <td>{arabicName}</td>
                      ${isEOT ? `
                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject?.mot_score)}</td>
                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject?.eot_score)}</td>
                      ` : `
                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject?.score)}</td>
                      `}
                      <td className="remarks-cell">
                        {subject?.theology_remark ?? ''}
                      </td>
                    </tr>
                  )})}
                  <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                    <td>المجموع</td>
                    ${isEOT ? `
                    <td>{toAr(reportData?.theology?.subjects?.length ? reportData.theology.subjects.length * 100 : 400)}</td>
                    <td>{toAr(reportData?.theology?.mot_total)}</td>
                    <td>{toAr(reportData?.theology?.subjects?.length ? reportData.theology.subjects.length * 100 : 400)}</td>
                    <td>{toAr(reportData?.theology?.eot_total)}</td>
                    ` : `
                    <td>{toAr(reportData?.theology?.subjects?.length ? reportData.theology.subjects.length * 100 : 400)}</td>
                    <td>{toAr(reportData?.theology?.total)}</td>
                    `}
                    <td></td>
                  </tr>
                </tbody>
              </table>
              
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', direction: 'rtl', fontFamily: 'Cairo' }}>
                <span style={{ fontWeight: 800, fontSize: '13px', color: '#800000' }}>ملاحظة مشرف الفصل:</span>
                <div className="dot-line" style={{ color: 'var(--data-teal)', fontStyle: 'italic', fontFamily: 'Amiri', fontSize: '15px' }}>
                  {getTheologyComment(
                    reportData?.theology?.${isEOT ? 'eot_total' : 'total'} ?? null
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="footer-section">
          <div className="comments-area">
            <div className="comment-row">
              <span className="c-label">CONDUCT:</span>
              <div className="c-line">{conductRemark}</div>
            </div>
            
            <div className="comment-row" style={{ marginTop: '4px' }}>
              <span className="c-label">CLASS TEACHER'S COMMENT:</span>
              <div className="c-line">{teacherComment}</div>
              <div className="sign-box">
                <span className="c-label">SIGNATURE:</span>
                <div className="c-line"></div>
              </div>
            </div>
            
            <div className="comment-row" style={{ marginTop: '4px' }}>
              <span className="c-label">HEAD TEACHER'S COMMENT:</span>
              <div className="c-line">{headComment}</div>
              <div className="sign-box">
                <span className="c-label">SIGNATURE:</span>
                <div className="c-line"></div>
              </div>
            </div>
            
            <div className="dates-row">
              <div className="date-item">THIS TERM ENDS ON: 
                <span>
                {reportData?.term?.end_date
                  ? new Date(reportData.term.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                  : ''}
                </span>
              </div>
              <div className="date-item" style={{ color: 'var(--data-teal)' }}>NEXT TERM BEGINS ON: 
                <span style={{ color: 'var(--data-teal)', borderBottomColor: 'var(--data-teal)' }}>
                {reportData?.term?.next_term_start
                  ? new Date(reportData.term.next_term_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                  : ''}
                </span>
              </div>
            </div>
          </div>
          
          <div className="stamp-box">
            OFFICIAL<br/>SCHOOL<br/>STAMP
          </div>
        </footer>
      </div>
    </ReportContainer>
  )
}
\`;
}

fs.writeFileSync(EOTPath, getTemplate('PrimaryEOTReport', 'END OF TERM', true));
fs.writeFileSync(MOTPath, getTemplate('PrimaryMOTReport', 'MID TERM', false));
fs.writeFileSync(BOTPath, getTemplate('PrimaryBOTReport', 'BEGINNING OF TERM', false));
console.log("Done");
