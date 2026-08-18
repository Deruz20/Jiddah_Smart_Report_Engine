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
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Poppins:wght@300;400;500;600;700;800&display=swap');

        .report-page,
        .report-page * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .report-page {
            --primary-green: #0f5b48;
            --accent-gold: #c5a059;
            --deep-maroon: #7d140c;
            --bg-cream: #fdfaf2;
            --text-dark: #1a1a1a;
            --border-light: #d8c68a;
            
            width: 100%;
            height: 100%;
            max-height: 100%;
            overflow: hidden;
            background: var(--bg-cream);
            padding: 20px 30px;
            display: flex;
            flex-direction: column;
            position: relative;
            border: 4px double var(--primary-green);
            font-family: 'Poppins', sans-serif;
            color: var(--text-dark);
            margin: 0 auto;
        }

        /* WATERMARK */
        .report-page::before {
            content: "";
            position: absolute;
            inset: 0;
            background: url('/school_budge.jpeg') center center no-repeat;
            background-size: 450px;
            opacity: 0.04;
            pointer-events: none;
            z-index: 0;
        }
        
        .report-page > * {
            position: relative;
            z-index: 1;
        }

        /* HEADER */
        .report-page .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 90px;
            margin-bottom: 8px;
            flex-shrink: 0;
        }

        .report-page .school-left { width: 32%; }
        .report-page .school-left h1 {
            margin: 0;
            font-size: 18px;
            color: var(--deep-maroon);
            font-weight: 800;
            line-height: 1.1;
        }
        .report-page .school-left p { margin: 1px 0; font-size: 10px; font-weight: 500; color: #444; }

        .report-page .header-center { width: 36%; text-align: center; }
        .report-page .bismillah { font-family: 'Amiri', serif; font-size: 24px; color: var(--primary-green); margin-bottom: 2px; }
        .report-page .report-badge {
            background: var(--primary-green);
            color: white;
            padding: 4px 20px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 15px;
            display: inline-block;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .report-page .header-right { width: 32%; text-align: right; direction: rtl; }
        .report-page .header-right h2 { margin: 0; font-family: 'Amiri', serif; font-size: 22px; color: var(--deep-maroon); line-height: 1.1; }

        /* INFO BOXES */
        .report-page .info-container {
            display: flex;
            gap: 15px;
            height: 85px;
            margin-bottom: 10px;
            flex-shrink: 0;
        }
        .report-page .info-box {
            flex: 1;
            background: white;
            border: 1px solid var(--border-light);
            border-radius: 8px;
            padding: 8px 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .report-page .info-row { display: flex; align-items: flex-end; gap: 6px; font-size: 11px; margin-bottom: 3px; }
        .report-page .label { font-weight: 700; color: #1a1a1a; white-space: nowrap; text-transform: uppercase; }
        .report-page .info-box[dir="rtl"] .label { text-transform: none; }
        .report-page .line { 
            flex: 1; 
            border-bottom: 1.5px dotted #999; 
            height: 14px; 
            display: flex; 
            align-items: flex-end; 
            justify-content: center; 
            padding-bottom: 1px;
            font-weight: 700;
            font-size: 12px;
            color: var(--primary-green);
        }

        /* MAIN PERFORMANCE TABLES */
        .report-page .main-performance {
            display: flex;
            gap: 20px;
            flex: 1;
            min-height: 0;
        }
        .report-page .col-academic, .report-page .col-theology { display: flex; flex-direction: column; }
        .report-page .col-academic { width: 55%; }
        .report-page .col-theology { width: 45%; direction: rtl; }

        .report-page table { width: 100%; border-collapse: collapse; background: white; table-layout: fixed; }
        .report-page th { background: var(--primary-green); color: white; font-size: 10px; padding: 4px 2px; border: 1px solid rgba(255,255,255,0.2); }
        .report-page .table-banner { background: var(--accent-gold); font-size: 12px; font-weight: 700; padding: 4px; text-align: center; color: white; }
        .report-page td { border: 1px solid #ddd; height: 24px; text-align: center; font-size: 11px; font-weight: 500; color: #111; }
        
        .report-page .data-cell { font-family: 'Courier New', Courier, monospace; font-weight: 800; font-size: 12px; }
        .report-page .remarks-cell { text-align: left; padding-left: 6px; font-style: italic; color: var(--primary-green); font-size: 10px; }
        
        .report-page .grading-key { margin-top: 6px; border: 1px solid #ddd; }
        .report-page .grading-key th { background: #555; font-size: 9px; padding: 2px; border-color: rgba(255,255,255,0.1); }
        .report-page .grading-key td { font-size: 9px; height: 16px; font-weight: 700; border-color: #ddd; }

        /* THEOLOGY SPECIFICS (RTL) */
        .report-page .col-theology th, .report-page .col-theology td { font-family: 'Amiri', serif; font-size: 14px; }
        .report-page .th-sub { background: #f4f4f4; color: var(--primary-green); height: 20px; font-size: 11px; font-weight: 700; border-color: #ddd; }
        .report-page .col-theology .remarks-cell { text-align: right; padding-right: 6px; }
        
        .report-page .theology-footer { display: flex; gap: 10px; margin-top: 8px; flex-shrink: 0; }
        .report-page .t-box { 
            flex: 1; border: 1px solid var(--border-light); border-radius: 4px; padding: 5px; 
            background: white; font-family: 'Amiri', serif; min-height: 38px; font-size: 13px;
            display: flex; align-items: flex-start; gap: 6px;
        }

        /* FOOTER AREA */
        .report-page .footer {
            height: 165px;
            margin-top: 10px;
            display: flex;
            gap: 20px;
            align-items: flex-end;
            flex-shrink: 0;
        }

        .report-page .footer-left { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }

        .report-page .comment-section {
            border: 1.5px dashed var(--primary-green);
            border-radius: 10px;
            padding: 10px 15px;
            background: rgba(255,255,255,0.5);
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .report-page .comment-row { display: flex; gap: 15px; margin-bottom: 5px; align-items: flex-end; }
        .report-page .c-field { display: flex; align-items: flex-end; gap: 8px; flex: 1; }
        .report-page .c-field span { font-size: 11px; font-weight: 700; white-space: nowrap; text-transform: uppercase; }
        .report-page .c-field .line { 
            border-bottom: 1.5px dotted #999; 
            flex: 1; 
            padding-bottom: 1px;
            color: var(--primary-green);
            font-family: 'Georgia', serif;
            font-style: italic;
            font-size: 13px;
            font-weight: 800;
        }

        .report-page .dates-bar {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            gap: 12px;
        }
        .report-page .date-chip {
            flex: 1;
            padding: 6px;
            border-radius: 6px;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            border: 1px solid #ddd;
            text-transform: uppercase;
        }
        .report-page .ends { background: #fff0f0; color: var(--deep-maroon); border-color: #ffdada; }
        .report-page .begins { background: #eef3ff; color: #1d4ed8; border-color: #dbe4ff; }

        .report-page .stamp-box {
            width: 120px;
            height: 120px;
            border: 2px dashed #9aa8bd;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 11px;
            font-weight: 800;
            color: #7584a0;
            line-height: 1.2;
            margin-bottom: 10px;
            flex-shrink: 0;
        }

        .report-page .validity-strip {
            margin-top: 8px;
            background: var(--deep-maroon);
            color: white;
            text-align: center;
            padding: 5px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.5px;
        }
        \`
        }} />

      <div className="report-page">
        <header className="header">
          <div className="school-left">
            <h1>JIDDAH ISLAMIC NURSERY<br/>AND PRIMARY SCHOOL - Nsaggu</h1>
            <p>P.O.Box 34008 Kampala (U)</p>
            <p>Tel: +256 744950042 / 0705316961</p>
          </div>
          <div className="header-center">
            <div className="bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
            <div className="report-badge">{isLower ? 'LOWER REPORT FORM' : 'UPPER REPORT FORM'} - ${termLabel}</div>
          </div>
          <div className="header-right">
            <h2>مدرسة جدة الإسلامية للروضة والابتدائية بنساغو</h2>
          </div>
        </header>

        <section className="info-container">
          <div className="info-box">
            <div className="info-row"><span className="label">Pupil's Name:</span><div className="line">{reportData?.student?.name || ''}</div></div>
            <div className="info-row">
                <span className="label">Class:</span><div className="line">{className}</div>
                <span className="label">Term:</span><div className="line">{reportData?.term?.term_number}</div>
                <span className="label">Year:</span><div className="line" style={{flex: 0.4}}>{reportData?.term?.academic_year}</div>
            </div>
            <div className="info-row">
                <span className="label">Position:</span><div className="line">{toAr(reportData?.circular?.position)}</div>
                <span className="label">Out Of:</span><div className="line">{toAr(reportData?.meta?.total_students)}</div>
                <span className="label">Division:</span><div className="line" style={{flex: 0.4}}>{toAr(reportData?.circular?.division)}</div>
            </div>
          </div>

          <div className="info-box" dir="rtl">
            <div className="info-row"><span className="label">اسم التلميذ/ة :</span><div className="line">{reportData?.student?.arabic_name || transliterateEnglishToArabic(reportData?.student?.name || '')}</div></div>
            <div className="info-row">
                <span className="label">الفصل :</span><div className="line">{reportData?.student?.theology_class_arabic ?? reportData?.student?.class_name}</div>
                <span className="label">الفترة :</span><div className="line">{toAr(reportData?.term?.term_number)}</div>
                <span className="label">عام :</span>
                <div className="line" style={{flex: 0.5}}>{toAr(toHijri(Number(reportData?.term?.academic_year)))}</div><span className="label">هـ</span>
                <div className="line" style={{flex: 0.5}}>{toAr(reportData?.term?.academic_year)}</div><span className="label">م</span>
            </div>
            <div className="info-row">
                <span className="label">الترتيب :</span><div className="line">{toAr(reportData?.theology?.position)}</div>
                <span className="label">عدد الطلبة :</span><div className="line">{toAr(reportData?.meta?.total_students)}</div>
            </div>
          </div>
        </section>

        <main className="main-performance">
          <div className="col-academic">
            <table>
              <thead>
                <tr><th colSpan={${isEOT ? 6 : 4}} className="table-banner">COMPARATIVE PERFORMANCE</th></tr>
                ${isEOT ? \`
                <tr>
                    <th rowSpan={2} style={{ width: '28%' }}>SUBJECTS</th>
                    <th colSpan={2}>MIDTERM</th>
                    <th colSpan={2}>END OF TERM</th>
                    <th rowSpan={2}>COMMENT</th>
                </tr>
                <tr>
                    <th style={{ width: '12%' }}>MK</th><th style={{ width: '10%' }}>AGG</th>
                    <th style={{ width: '12%' }}>MK</th><th style={{ width: '10%' }}>AGG</th>
                }
                \` : \`
                <tr>
                    <th style={{ width: '40%' }}>SUBJECTS</th>
                    <th style={{ width: '15%' }}>MARK</th>
                    <th style={{ width: '15%' }}>AGG</th>
                    <th style={{ width: '30%' }}>TEACHER'S REMARKS</th>
                </tr>
                \`}
              </thead>
              <tbody>
                {reportData?.circular?.subjects?.map(renderSubjectRow)}
                <tr style={{ background: '#f9f9f9', fontWeight: 800 }}>
                  <td style={{ textAlign: 'left', paddingLeft: '8px' }}>TOTAL</td>
                  ${isEOT ? \`
                  <td>{reportData?.circular?.mot_total ?? '--'}</td>
                  <td>--</td>
                  <td>{reportData?.circular?.eot_total ?? '--'}</td>
                  \` : \`
                  <td>{reportData?.circular?.total ?? '--'}</td>
                  \`}
                  <td>{reportData?.circular?.aggregates ?? '--'}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <table className="grading-key">
                <thead>
                  <tr><th>Grade</th><td>D1</td><td>D2</td><td>C3</td><td>C4</td><td>C5</td><td>C6</td><td>P7</td><td>P8</td><td>F9</td></tr>
                </thead>
                <tbody>
                  <tr><td><b>Marks</b></td><td>85-100</td><td>75-84</td><td>70-74</td><td>60-69</td><td>55-59</td><td>50-54</td><td>40-49</td><td>35-39</td><td>0-34</td></tr>
                </tbody>
            </table>
          </div>

          {showTheologyPanel && (
          <div className="col-theology">
            <table>
              <thead>
                <tr><th colSpan={${isEOT ? 6 : 4}} className="table-banner">نتائج المواد الشرعية</th></tr>
                ${isEOT ? \`
                <tr>
                    <th rowSpan={2} style={{ width: '28%' }}>المواد</th>
                    <th colSpan={2}>منتصف الفترة</th>
                    <th colSpan={2}>نهاية الفترة</th>
                    <th rowSpan={2}>الملاحظات</th>
                </tr>
                <tr>
                    <th className="th-sub">الدرجة الكبرى</th><th className="th-sub">الدرجة الصغرى</th>
                    <th className="th-sub">الدرجة الكبرى</th><th className="th-sub">الدرجة الصغرى</th>
                </tr>
                \` : \`
                <tr>
                    <th style={{ width: '28%' }}>المواد</th>
                    <th className="th-sub">الدرجة الكبرى</th>
                    <th className="th-sub">الدرجة الصغرى</th>
                    <th>الملاحظات</th>
                </tr>
                \`}
              </thead>
              <tbody>
                {reportData?.theology?.subjects?.map((subject: any) => {
                  const arabicName = subject.subject_name_arabic === 'التاريخ والسيرة' 
                    ? 'التربية' 
                    : subject.subject_name_arabic;
                  
                  return (
                  <tr key={subject.subject_name_arabic}>
                    <td>{arabicName}</td>
                    ${isEOT ? \`
                    <td className="data-cell">{toAr(100)}</td>
                    <td className="data-cell">{toAr(subject.mot_score)}</td>
                    <td className="data-cell">{toAr(100)}</td>
                    <td className="data-cell">{toAr(subject.eot_score)}</td>
                    \` : \`
                    <td className="data-cell">{toAr(100)}</td>
                    <td className="data-cell">{toAr(subject.score)}</td>
                    \`}
                    <td className="remarks-cell">
                      {subject.theology_remark ?? ''}
                    </td>
                  </tr>
                )})}
                <tr style={{ background: '#f9f9f9', fontWeight: 800 }}>
                  <td>المجموع</td>
                  ${isEOT ? \`
                  <td>{toAr(reportData?.theology?.subjects?.length ? reportData.theology.subjects.length * 100 : 400)}</td>
                  <td>{toAr(reportData?.theology?.mot_total)}</td>
                  <td>{toAr(reportData?.theology?.subjects?.length ? reportData.theology.subjects.length * 100 : 400)}</td>
                  <td>{toAr(reportData?.theology?.eot_total)}</td>
                  \` : \`
                  <td>{toAr(reportData?.theology?.subjects?.length ? reportData.theology.subjects.length * 100 : 400)}</td>
                  <td>{toAr(reportData?.theology?.total)}</td>
                  \`}
                  <td></td>
                </tr>
              </tbody>
            </table>
            <div className="theology-footer">
                <div className="t-box">
                  <span style={{color: '#7d140c', fontWeight: 'bold'}}>ملاحظة مشرف الفصل:</span>
                  <span style={{color: 'var(--primary-green)', fontStyle: 'italic', fontWeight: 'bold'}}>{getTheologyComment(reportData?.theology?.${isEOT ? 'eot_total' : 'total'} ?? null)}</span>
                </div>
                <div className="t-box" style={{ flex: 0.8 }}>
                  <span style={{color: '#7d140c', fontWeight: 'bold'}}>التوقيع والختم:</span>
                </div>
            </div>
          </div>
          )}
        </main>

        <footer className="footer">
          <div className="footer-left">
            <div className="comment-section">
                <div className="comment-row">
                    <div className="c-field"><span>Conduct:</span><div className="line">{conductRemark}</div></div>
                </div>
                <div className="comment-row">
                    <div className="c-field"><span>Class Teacher's Comment:</span><div className="line">{teacherComment}</div></div>
                    <div className="c-field" style={{ flex: 0.4 }}><span>Signature:</span><div className="line"></div></div>
                </div>
                <div className="comment-row">
                    <div className="c-field"><span>Head Teacher's Comment:</span><div className="line">{headComment}</div></div>
                    <div className="c-field" style={{ flex: 0.4 }}><span>Signature:</span><div className="line"></div></div>
                </div>
            </div>

            <div className="dates-bar">
                <div className="date-chip ends">
                  Term Ends On: {reportData?.term?.end_date ? new Date(reportData.term.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '________________'}
                </div>
                <div class="date-chip begins">
                  Next Term Begins: {reportData?.term?.next_term_start ? new Date(reportData.term.next_term_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '________________'}
                </div>
            </div>

            <div className="validity-strip">
                THIS REPORT FORM IS NOT VALID WITHOUT THE OFFICIAL SCHOOL STAMP
            </div>
          </div>

          <div className="stamp-box">OFFICIAL<br/>SCHOOL<br/>STAMP</div>
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
