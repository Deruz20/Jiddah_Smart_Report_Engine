import { getClassTeacherComment, getHeadTeacherComment, getConductRemark, getTheologyComment } from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'

export default function PrimaryEOTReport({ reportData }: any) {
  const className = reportData?.class_name || reportData?.class || '';
  const lowerClasses = ['baby', 'middle', 'top', 'p.1', 'p.2', 'p.3'];
  // showTheologyPanel logic
  const showTheologyPanel = reportData?.student?.class_name?.toLowerCase() !== 'p.7' ||
    (reportData?.theology?.subjects && reportData?.theology?.subjects.length > 0)

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

  const teacherComment = reportData?.circular?.class_teacher_comment ?? getClassTeacherComment(reportData?.circular?.division ?? null);
  const headComment = reportData?.circular?.head_teacher_comment ?? getHeadTeacherComment(reportData?.circular?.division ?? null);
  const conductRemark = reportData?.circular?.conduct_remark ?? getConductRemark(reportData?.circular?.division ?? null);

  const renderSubjectRow = (subject: any) => (
    <tr key={subject.subject_name}>
      <td style={{textAlign: 'left', paddingLeft: '8px'}}>{subject.subject_name}</td>
      <td>{subject.mot_score ?? '--'}</td>
      <td>{subject.mot_grade_display ?? '--'}</td>
      <td>{subject.eot_score ?? '--'}</td>
      <td>{subject.eot_grade_display ?? '--'}</td>
      <td style={{ fontStyle: 'italic', color: '#444', fontSize: '11px' }}>{subject.remark ?? ''}</td>
    </tr>
  );

  return (
    <ReportContainer reportType="PrimaryEOTReport">
      <style dangerouslySetInnerHTML={{
        __html: `
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Poppins:wght@400;500;600;700;800&family=Cairo:wght@600;700&display=swap');

    .primary-eot-report,
    .primary-eot-report * {
        box-sizing: border-box;
    }

    .primary-eot-report {
        --primary-green: #0f5b48;
        --accent-gold: #c5a059;
        --deep-maroon: #7d140c;
        --bg-cream: #fdfaf2;
        --text-dark: #1a1a1a;
        --border-light: #d8c68a;
        
        width: 1123px;
        height: 794px;
        margin: 0 auto;
        background: var(--bg-cream);
        border: 4px double var(--primary-green);
        padding: 20px 30px;
        position: relative;
        overflow: hidden;
        font-family: 'Poppins', sans-serif;
        color: var(--text-dark);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    /* Decorative Watermark */
    .primary-eot-report::before {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: url('/school_budge.jpeg') center center no-repeat;
        background-size: 400px;
        opacity: 0.04;
        pointer-events: none;
        z-index: 0;
    }
    
    .primary-eot-report > * {
        position: relative;
        z-index: 1;
    }

    /* HEADER */
    .primary-eot-report .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .primary-eot-report .school-left { width: 32%; }
    .primary-eot-report .school-left h1 {
        margin: 0;
        font-size: 19px;
        color: var(--deep-maroon);
        font-weight: 800;
        line-height: 1.1;
    }
    .primary-eot-report .school-left p { margin: 2px 0; font-size: 11px; font-weight: 500; color: #444; }

    .primary-eot-report .header-center { width: 36%; text-align: center; }
    .primary-eot-report .bismillah {
        font-family: 'Amiri', serif;
        font-size: 30px;
        color: var(--primary-green);
        margin-bottom: 4px;
    }
    
    .primary-eot-report .logo {
        width: 65px;
        height: 65px;
        margin: 0 auto 8px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .primary-eot-report .logo img {
        width: 100%;
        height: auto;
        object-fit: contain;
    }

    .primary-eot-report .report-badge {
        background: var(--primary-green);
        color: white;
        padding: 6px 25px;
        border-radius: 50px;
        font-weight: 700;
        font-size: 17px;
        display: inline-block;
        box-shadow: 0 3px 8px rgba(0,0,0,0.15);
    }

    .primary-eot-report .header-right { width: 32%; text-align: right; direction: rtl; font-family: 'Cairo', sans-serif;}
    .primary-eot-report .header-right h2 {
        margin: 0;
        font-size: 26px;
        color: var(--deep-maroon);
        line-height: 1.2;
        font-weight: 700;
    }

    /* INFO BOXES */
    .primary-eot-report .info-container {
        display: flex;
        gap: 15px;
        margin-bottom: 12px;
    }
    .primary-eot-report .info-box {
        flex: 1;
        background: white;
        border: 1px solid var(--border-light);
        border-radius: 10px;
        padding: 10px 15px;
    }
    .primary-eot-report .info-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        font-size: 12px;
    }
    .primary-eot-report .info-row:last-child { margin-bottom: 0; }
    .primary-eot-report .label { font-weight: 700; color: #333; white-space: nowrap; }
    .primary-eot-report .line { 
        flex: 1; 
        border-bottom: 1.5px dotted #aaa; 
        height: 16px; 
        display: flex;
        align-items: flex-end;
        padding-bottom: 2px;
        padding-left: 6px;
        color: #111;
        font-weight: 500;
    }
    .primary-eot-report .info-box[dir="rtl"] .line {
        padding-left: 0;
        padding-right: 6px;
        font-family: 'Cairo', sans-serif;
    }

    /* TABLES */
    .primary-eot-report .tables-container {
        display: flex;
        gap: 15px;
        margin-bottom: 10px;
    }
    .primary-eot-report .academic-side, .primary-eot-report .theology-side { width: 50%; }

    .primary-eot-report table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border: 1px solid var(--border-light);
    }
    .primary-eot-report th {
        background: var(--primary-green);
        color: white;
        font-size: 11px;
        padding: 6px 4px;
        text-transform: uppercase;
        border: 1px solid rgba(255,255,255,0.2);
    }
    .primary-eot-report .table-banner {
        background: var(--accent-gold);
        color: white;
        font-size: 13px;
        letter-spacing: 1px;
        padding: 5px;
        text-align: center;
    }
    .primary-eot-report td {
        border: 1px solid #ddd;
        height: 24px;
        text-align: center;
        font-size: 12px;
        font-weight: 500;
        padding: 2px 4px;
    }

    /* GRADING KEY */
    .primary-eot-report .grading-key { margin-top: 8px; }
    .primary-eot-report .grading-key th { background: #555; font-size: 10px; padding: 3px; }
    .primary-eot-report .grading-key td { font-size: 10px; height: 18px; font-weight: 700; }

    /* THEOLOGY SIDE (RTL) */
    .primary-eot-report .theology-side { direction: rtl; }
    .primary-eot-report .theology-side th, .primary-eot-report .theology-side td { font-family: 'Amiri', serif; font-size: 14px; }
    .primary-eot-report .theology-side .table-banner { font-size: 16px; }
    
    .primary-eot-report .th-subhead {
        background: #f8f9fa;
        color: var(--primary-green);
        font-weight: 700;
        font-size: 12px;
        height: 24px;
    }

    .primary-eot-report .theology-footer {
        display: flex;
        gap: 10px;
        margin-top: 8px;
    }
    .primary-eot-report .t-comment {
        flex: 1;
        border: 1px solid var(--border-light);
        padding: 5px 10px;
        background: white;
        font-family: 'Amiri', serif;
        font-size: 13px;
        text-align: right;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    /* PREMIUM FOOTER */
    .primary-eot-report .premium-footer {
        display: flex;
        gap: 15px;
        align-items: flex-end;
        position: absolute;
        bottom: 20px;
        left: 30px;
        right: 30px;
    }

    .primary-eot-report .footer-left { flex: 1; }

    .primary-eot-report .comment-card {
        border: 2px dashed var(--primary-green);
        border-radius: 12px;
        padding: 10px 15px;
        background: rgba(255,255,255,0.8);
    }
    .primary-eot-report .comment-row { display: flex; gap: 15px; margin-bottom: 8px; }
    .primary-eot-report .comment-row:last-child { margin-bottom: 0; }
    .primary-eot-report .c-field { display: flex; align-items: center; gap: 8px; }
    .primary-eot-report .c-field span { font-size: 12px; font-weight: 700; white-space: nowrap; }
    .primary-eot-report .w-line { 
        flex: 1; 
        border-bottom: 1.5px dotted #666; 
        height: 16px; 
        display: flex;
        align-items: flex-end;
        padding-bottom: 1px;
    }
    .primary-eot-report .line-text {
        font-style: italic;
        color: #444;
        font-size: 11px;
        line-height: 1.2;
        padding-left: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .primary-eot-report .term-dates-bar {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 10px;
    }
    .primary-eot-report .date-item {
        flex: 1;
        padding: 6px 15px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid #ddd;
    }
    .primary-eot-report .red-date { background: #fff0f0; border-color: #ffb3b3; color: var(--deep-maroon); }
    .primary-eot-report .blue-date { background: #eef3ff; border-color: #a9c2ff; color: #1d4ed8; }
    
    .primary-eot-report .date-item span:last-child {
        font-weight: 600;
        color: #111;
        border-bottom: 1.5px dotted #666;
        padding-bottom: 1px;
    }

    .primary-eot-report .validity-strip {
        margin-top: 8px;
        background: var(--deep-maroon);
        color: white;
        text-align: center;
        padding: 7px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
    }

    .primary-eot-report .stamp-box {
        width: 140px;
        height: 140px;
        border: 3px dashed #9aa8bd;
        border-radius: 50%;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 13px;
        font-weight: 800;
        color: #7584a0;
        line-height: 1.3;
        flex-shrink: 0;
    }

    @media print {
        @page { size: A4 landscape; margin: 0; }
        .primary-eot-report {
            margin: 0;
            border: 4px double var(--primary-green);
            box-shadow: none;
            width: 1123px !important;
            height: 794px !important;
        }
    }
        `
      }} />

      <div className="primary-eot-report">

        {/* HEADER */}
        <header className="header">
          <div className="school-left">
            <h1>JIDDAH ISLAMIC NURSERY<br />AND PRIMARY SCHOOL - Nsaggu</h1>
            <p>P.O.Box 34008 Kampala (U)</p>
            <p>Tel: +256 744950042 / 0705316961</p>
            <p style={{ fontSize: '9px', opacity: 0.8 }}>jiddahislamicnurseryandpri@gmail.com</p>
          </div>

          <div className="header-center">
            <div className="bismillah">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْم</div>
            <div className="logo">
              <img src="/school_budge.jpeg" alt="School Badge" />
            </div>
            <div className="report-badge">{reportData?.section_type === 'upper_primary' ? 'UPPER' : 'LOWER'} REPORT FORM - END OF TERM</div>
          </div>

          <div className="header-right">
            <h2>مدرسة جدة الإسلامية للروضة والإبتدائية - نساغو - واكيسو</h2>
          </div>
        </header>

        {/* INFO SECTION */}
        <section className="info-container">
          <div className="info-box" style={{ width: showTheologyPanel ? '50%' : '100%' }}>
            <div className="info-row"><span className="label">Pupil's Name:</span><div className="line">{reportData?.student?.name}</div></div>
            <div className="info-row">
              <span className="label">Class:</span><div className="line">{reportData?.student?.class_name}</div>
              <span className="label">Term:</span><div className="line">{reportData?.term?.label}</div>
              <span className="label">Year:</span><div className="line" style={{ flex: 0.5 }}>{reportData?.term?.academic_year}</div>
            </div>
            <div className="info-row">
              <span className="label">Position:</span><div className="line">{reportData?.circular?.position ?? '--'}</div>
              <span className="label">Out Of:</span><div className="line">{reportData?.circular?.total_students ?? '--'}</div>
              <span className="label">Division:</span><div className="line" style={{ flex: 0.3 }}>{reportData?.circular?.division ?? '--'}</div>
            </div>
          </div>

          {showTheologyPanel && (
            <div className="info-box" dir="rtl">
              <div className="info-row"><span className="label">اسم التلميذ/ة :</span><div className="line">{reportData?.student?.arabic_name ?? reportData?.student?.name}</div></div>
              <div className="info-row">
                <span className="label">الفصل :</span><div className="line">{reportData?.student?.theology_class_arabic ?? reportData?.student?.class_name}</div>
                <span className="label">الفترة :</span><div className="line">{toAr(termInArabic(reportData?.term?.term_number))}</div>
                <span className="label">عام :</span><div className="line">{toAr(toHijri(Number(reportData?.term?.academic_year)))}</div>
                <span className="label">ه‍</span><div className="line" style={{ textAlign: 'center' }}>{toAr(reportData?.term?.academic_year)}</div>
                <span className="label">م</span>
              </div>
              <div className="info-row">
                <span className="label">الترتيب :</span><div className="line">{toAr(reportData?.circular?.position)}</div>
                <span className="label">عدد الطلبة :</span><div className="line">{toAr(reportData?.circular?.total_students)}</div>
              </div>
            </div>
          )}
        </section>

        {/* TABLES SECTION */}
        <div className="tables-container">
          {/* ACADEMIC TABLE */}
          <div className="academic-side" style={{ width: showTheologyPanel ? '50%' : '100%' }}>
            <table>
              <tbody>
                <tr><th colSpan={6} className="table-banner">COMPARATIVE PERFORMANCE</th></tr>
                <tr>
                  <th rowSpan={2}>SUBJECTS</th>
                  <th colSpan={2}>MIDTERM</th>
                  <th colSpan={2}>END OF TERM</th>
                  <th rowSpan={2}>COMMENT</th>
                </tr>
                <tr>
                  <th>MARK</th><th>AGG</th><th>MARK</th><th>AGG</th>
                </tr>
                {reportData?.circular?.subjects?.map(renderSubjectRow)}
                <tr style={{ background: '#f2f2f2', fontWeight: 800 }}>
                  <td style={{textAlign: 'left', paddingLeft: '8px'}}>TOTAL</td>
                  <td>{reportData?.circular?.mot_total ?? '--'}</td>
                  <td>{reportData?.circular?.mot_aggregate ?? '--'}</td>
                  <td>{reportData?.circular?.eot_total ?? '--'}</td>
                  <td>{reportData?.circular?.aggregate ?? '--'}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <table className="grading-key">
              <tbody>
                <tr><th>Grade</th><td>D1</td><td>D2</td><td>C3</td><td>C4</td><td>C5</td><td>C6</td><td>P7</td><td>P8</td><td>F9</td></tr>
                <tr><td><b>Marks</b></td><td>85-100</td><td>75-84</td><td>70-74</td><td>60-69</td><td>55-59</td><td>50-54</td><td>40-49</td><td>35-39</td><td>0-34</td></tr>
              </tbody>
            </table>
          </div>

          {/* THEOLOGY TABLE */}
          {showTheologyPanel && (
            <div className="theology-side">
              <table className="theology-table">
                <tbody>
                  <tr><th colSpan={6} className="table-banner">نتائج المواد الشرعية</th></tr>
                  <tr>
                    <th rowSpan={2}>المواد</th>
                    <th colSpan={2}>منتصف الفترة</th>
                    <th colSpan={2}>نهاية الفترة</th>
                    <th rowSpan={2}>الملاحظات</th>
                  </tr>
                  <tr>
                    <th className="th-subhead">الدرجة الكبرى</th>
                    <th className="th-subhead">الدرجة الصغرى</th>
                    <th className="th-subhead">الدرجة الكبرى</th>
                    <th className="th-subhead">الدرجة الصغرى</th>
                  </tr>
                  {reportData?.theology?.subjects?.map((subject: any) => (
                    <tr key={subject.subject_name_arabic}>
                      <td>{subject.subject_name_arabic}</td>
                      <td>{toAr(100)}</td>
                      <td>{toAr(subject.mot_score)}</td>
                      <td>{toAr(100)}</td>
                      <td>{toAr(subject.eot_score)}</td>
                      <td style={{ fontStyle: 'italic', fontSize: '12px' }}>{subject.theology_remark ?? ''}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f2f2f2', fontWeight: 800 }}>
                    <td><b>المجموع</b></td>
                    <td>{toAr(reportData?.theology?.subjects?.length ? reportData.theology.subjects.length * 100 : 400)}</td>
                    <td>{toAr(reportData?.theology?.mot_total)}</td>
                    <td>{toAr(reportData?.theology?.subjects?.length ? reportData.theology.subjects.length * 100 : 400)}</td>
                    <td>{toAr(reportData?.theology?.eot_total)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
              <div className="theology-footer">
                <div className="t-comment">
                  <span style={{ fontWeight: 700 }}>ملاحظة مشرف الفصل: </span>
                  <span style={{ fontStyle: 'italic', color: '#555' }}>{getTheologyComment(reportData?.theology?.eot_total ?? null)}</span>
                </div>
                <div className="t-comment" style={{ justifyContent: 'flex-start' }}>التوقيع والختم: </div>
              </div>
            </div>
          )}
        </div>

        {/* PREMIUM FIXED FOOTER */}
        <footer className="premium-footer">
          <div className="footer-left">
            <div className="comment-card">
              <div className="comment-row">
                <div className="c-field" style={{ flex: 1 }}>
                  <span>Conduct:</span>
                  <div className="w-line"><span className="line-text">{conductRemark}</span></div>
                </div>
              </div>
              <div className="comment-row">
                <div className="c-field" style={{ flex: 1 }}>
                  <span>Class Teacher's Comment:</span>
                  <div className="w-line"><span className="line-text">{teacherComment}</span></div>
                </div>
                <div className="c-field" style={{ width: '180px' }}>
                  <span>Signature:</span>
                  <div className="w-line"></div>
                </div>
              </div>
              <div className="comment-row">
                <div className="c-field" style={{ flex: 1 }}>
                  <span>Head Teacher's Comment:</span>
                  <div className="w-line"><span className="line-text">{headComment}</span></div>
                </div>
                <div className="c-field" style={{ width: '180px' }}>
                  <span>Signature:</span>
                  <div className="w-line"></div>
                </div>
              </div>
            </div>

            <div className="term-dates-bar">
              <div className="date-item red-date">
                <span>This Term Ends On:</span>
                <span>{reportData?.term?.end_date 
                  ? new Date(reportData.term.end_date).toLocaleDateString('en-UG', {day:'numeric', month:'short', year:'numeric'})
                  : ''}</span>
              </div>
              <div className="date-item blue-date">
                <span>Next Term Begins On:</span>
                <span>{reportData?.term?.next_term_start
                  ? new Date(reportData.term.next_term_start).toLocaleDateString('en-UG', {day:'numeric', month:'short', year:'numeric'})
                  : ''}</span>
              </div>
            </div>

            <div className="validity-strip">
              THIS REPORT FORM IS NOT VALID WITHOUT THE OFFICIAL SCHOOL STAMP
            </div>
          </div>

          <div className="stamp-box">
            OFFICIAL<br />SCHOOL<br />STAMP
          </div>
        </footer>

      </div>
    </ReportContainer>
  )
}
