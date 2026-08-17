import { getClassTeacherComment, getHeadTeacherComment, getConductRemark, getTheologyComment } from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'

export default function P7EOTReport({ reportData }: any) {
  const teacherComment =
    reportData?.circular?.class_teacher_comment ??
    getClassTeacherComment(reportData?.circular?.division ?? null)

  const headComment =
    reportData?.circular?.head_teacher_comment ??
    getHeadTeacherComment(reportData?.circular?.division ?? null)

  const conductRemark =
    reportData?.circular?.conduct_remark ??
    getConductRemark(reportData?.circular?.division ?? null)

  const hasTheology = reportData?.theology?.subjects && reportData?.theology?.subjects.length > 0;

  const toAr = (val: number | string | null | undefined): string => {
    if (val == null) return '--'
    return String(val).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
  }

  const renderSubjectRow = (subject: any) => (
    <tr key={subject.subject_name}>
      <td style={{ textAlign: 'left', paddingLeft: '8px' }}>
        {subject.subject_name}
      </td>

      <td className="data-cell">{subject.bot_score ?? '--'}</td>
      <td className="data-cell">{subject.bot_grade_display ?? '--'}</td>

      <td className="data-cell">{subject.mot_score ?? '--'}</td>
      <td className="data-cell">{subject.mot_grade_display ?? '--'}</td>

      <td className="data-cell">{subject.eot_score ?? '--'}</td>
      <td className="data-cell">{subject.eot_grade_display ?? '--'}</td>

      <td className="remarks-cell">
        {subject.remark ?? ''}
      </td>
    </tr>
  )

  return (
    <ReportContainer reportType="P7EOTReport">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Poppins:wght@400;500;600;700;800&family=Cairo:wght@600;700;800&display=swap');

.p7-eot-report,
.p7-eot-report * {
  box-sizing: border-box;
}

.p7-eot-report {
  --primary-green: #064e3b;
  --secondary-green: #047857;
  --accent-gold: #fbbf24;
  --deep-maroon: #800000;
  --bg-cream: transparent;
  --border-light: #e2e8f0;
  --data-navy: #0f172a;
  --data-indigo: #1e293b;
  --data-teal: #0369a1;
  --soft-gray: #f8fafc;
  
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 100%;


  margin: 0 auto;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: 'Poppins', sans-serif;
  color: #1a1a1a;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.p7-eot-report::before {
  content: "";
  position: absolute;
  inset: 0;
  background: url('/school_budge.jpeg') center center no-repeat;
  background-size: 450px;
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
}

.p7-eot-report > * {
  position: relative;
  z-index: 1;
}

/* ================= HEADER ================= */
.p7-eot-report .header {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to right, var(--primary-green), var(--secondary-green));
  padding: 16px 24px;
  border-bottom: 4px solid var(--accent-gold);
  color: white;
}

.p7-eot-report .school-left {
  width: 42%;
}

.p7-eot-report .school-left h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  color: white;
  font-weight: 800;
  letter-spacing: -0.2px;
}

.p7-eot-report .school-left p {
  margin: 4px 0 0 0;
  font-size: 11px;
  color: #a7f3d0;
  font-weight: 500;
}

.p7-eot-report .header-center {
  width: 16%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.p7-eot-report .logo {
  width: 75px;
  height: 75px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.p7-eot-report .logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.p7-eot-report .header-right {
  width: 42%;
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.p7-eot-report .report-badge {
  display: inline-block;
  background: rgba(255,255,255,0.2);
  color: white;
  padding: 6px 20px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.05em;
  border: 1px solid rgba(255,255,255,0.3);
  margin-top: 10px;
}

/* ================= BODY ================= */
.p7-eot-report .report-body {
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

/* ================= INFO ================= */
.p7-eot-report .info-box {
  flex: 0 0 auto;
  background: var(--soft-gray);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.p7-eot-report .info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.p7-eot-report .info-row:last-child {
  margin-bottom: 0;
}

.p7-eot-report .label {
  font-weight: 700;
  color: #64748b;
  white-space: nowrap;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
}

.p7-eot-report .line {
  flex: 1;
  min-width: 0;
  border-bottom: 1.5px dashed #cbd5e1;
  padding: 0 0 2px 8px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--data-navy);
  font-weight: 800;
  font-size: 15px;
}

/* ================= TABLE ================= */
.p7-eot-report .tables-container {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.p7-eot-report table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-light);
  background: white;
}
.p7-eot-report th, .p7-eot-report td {
  border-right: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
}
.p7-eot-report th:last-child, .p7-eot-report td:last-child { border-right: none; }
.p7-eot-report tr:last-child td { border-bottom: none; }

.p7-eot-report th {
  background: var(--primary-green);
  color: white;
  font-size: 10px;
  padding: 6px 2px;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
}

.p7-eot-report .table-banner {
  background: var(--secondary-green);
  color: white;
  font-size: 14px;
  letter-spacing: 2px;
  padding: 6px;
  text-align: center;
  text-transform: uppercase;
  font-weight: 800;
  border-bottom: 2px solid #064e3b;
}

.p7-eot-report td {
  padding: 8px 4px;
  font-size: 11px;
  color: var(--data-navy);
  font-weight: 600;
  text-align: center;
}

.p7-eot-report tbody tr:nth-child(even) {
  background-color: rgba(226, 216, 184, 0.15);
}

.p7-eot-report .data-cell {
  color: var(--data-indigo);
  font-weight: 800;
  font-size: 14px;
}

.p7-eot-report .remarks-cell {
  color: var(--data-teal);
  font-weight: 800;
  font-style: italic;
  font-size: 11px;
  text-align: left;
}

/* ================= THEOLOGY TABLE ================= */
.p7-eot-report .theology-table { direction: rtl; }
.p7-eot-report .theology-table th, .p7-eot-report .theology-table td { font-family: 'Amiri', serif; font-size: 14px; }
.p7-eot-report .theology-table .table-banner { font-size: 17px; letter-spacing: 0; }
.p7-eot-report .th-subhead {
    background: #e2e8f0;
    color: var(--primary-green);
    font-weight: 800;
    font-size: 13px;
}
.p7-eot-report .t-comment {
    border: 1px dashed var(--border-light);
    padding: 6px 12px;
    background: white;
    font-family: 'Amiri', serif;
    font-size: 14px;
    text-align: right;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    direction: rtl;
}

/* ================= GRADING ================= */
.p7-eot-report .grading-key {
  margin-top: 16px;
  flex: 0 0 auto;
  border: 1px solid var(--border-light);
}

.p7-eot-report .grading-key th {
  background: #475569;
  color: white;
  font-size: 10px;
  padding: 6px;
  border-right: 1px solid #64748b;
  border-bottom: 1px solid #64748b;
}

.p7-eot-report .grading-key td {
  font-size: 10px;
  font-weight: 800;
  padding: 4px;
  border-right: 1px solid var(--border-light);
  border-bottom: none;
}
.p7-eot-report .grading-key tr:last-child th { border-bottom: none; }

/* ================= FOOTER ================= */
.p7-eot-report .premium-footer {
  flex: 0 0 auto;
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-top: 12px;
  position: relative;
}

.p7-eot-report .footer-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.p7-eot-report .comment-card {
  border: 2px dashed var(--border-light);
  border-radius: 8px;
  padding: 14px 18px;
  background: white;
}

.p7-eot-report .comment-row {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.p7-eot-report .comment-row:last-child {
  margin-bottom: 0;
}

.p7-eot-report .c-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.p7-eot-report .c-field span {
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  text-transform: uppercase;
  color: #475569;
}

.p7-eot-report .w-line {
  flex: 1;
  border-bottom: 1.5px dashed #cbd5e1;
  padding: 0 0 2px 8px;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.p7-eot-report .line-text {
  font-size: 13px;
  line-height: 1.2;
  white-space: normal;
  color: var(--data-indigo);
  font-style: italic;
  font-weight: 800;
  font-family: 'Georgia', serif;
}

.p7-eot-report .term-dates-bar {
  display: flex;
  gap: 12px;
}

.p7-eot-report .date-item {
  flex: 1;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  background: white;
}

.p7-eot-report .red-date { border-color: #fca5a5; color: #b91c1c; }
.p7-eot-report .blue-date { border-color: #93c5fd; color: #1d4ed8; }

.p7-eot-report .validity-strip {
  background: var(--primary-green);
  color: white;
  border-radius: 4px;
  text-align: center;
  padding: 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
}

.p7-eot-report .stamp-box {
  width: 120px;
  height: 120px;
  border-radius: 16px;
  border: 2px dashed #94a3b8;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
  color: #94a3b8;
  flex-shrink: 0;
  align-self: flex-end;
}
          `
        }}
      />

      <div className="p7-eot-report">
        <header className="header">
          <div className="school-left">
            <h1>
              JIDDAH ISLAMIC NURSERY
              <br />
              AND PRIMARY SCHOOL - Nsaggu
            </h1>
            <p>P.O.Box 34008 Kampala (U)</p>
            <p>Tel: +256 744950042 / 0705316961</p>
            <p>jiddahislamicnurseryandpri@gmail.com</p>
          </div>

          <div className="header-center">
            <div className="logo">
              <img src="/school_budge.jpeg" alt="School Badge" />
            </div>
          </div>

          <div className="header-right">
            <div className="report-badge">
              P.7 REPORT FORM - END OF TERM
            </div>
          </div>
        </header>
        
        <div className="report-body">
        <section className="info-box">
          <div className="info-row">
            <span className="label">Pupil's Name:</span>
            <div className="line">{reportData?.student?.name}</div>
          </div>

          <div className="info-row">
            <span className="label">Class:</span>
            <div className="line">{reportData?.student?.class_name}</div>
            <span className="label">Term:</span>
            <div className="line">{reportData?.term?.label}</div>
            <span className="label">Year:</span>
            <div className="line" style={{ flex: 0.5 }}>
              {reportData?.term?.academic_year}
            </div>
          </div>

          <div className="info-row">
            <span className="label">Position:</span>
            <div className="line">
              {reportData?.circular?.position ?? '--'}
            </div>
            <span className="label">Out Of:</span>
            <div className="line">
              {reportData?.circular?.total_students ??
                reportData?.circular?.total ??
                '--'}
            </div>
            <span className="label">Division:</span>
            <div className="line" style={{ flex: 0.3 }}>
              {reportData?.circular?.division ?? '--'}
            </div>
          </div>
        </section>

        <div className="tables-container">
          <div>
            <table>
              <tbody>
                <tr>
                  <th colSpan={8} className="table-banner">
                    COMPARATIVE PERFORMANCE
                  </th>
                </tr>

                <tr>
                  <th rowSpan={2} style={{ width: '22%' }}>SUBJECTS</th>
                  <th colSpan={2} style={{ width: '18%' }}>BEGINNING OF TERM</th>
                  <th colSpan={2} style={{ width: '18%' }}>MIDTERM</th>
                  <th colSpan={2} style={{ width: '18%' }}>END OF TERM</th>
                  <th rowSpan={2} style={{ width: '24%' }}>TEACHER'S REMARKS</th>
                </tr>

                <tr>
                  <th style={{ width: '9%' }}>MARK</th>
                  <th style={{ width: '9%' }}>AGG</th>
                  <th style={{ width: '9%' }}>MARK</th>
                  <th style={{ width: '9%' }}>AGG</th>
                  <th style={{ width: '9%' }}>MARK</th>
                  <th style={{ width: '9%' }}>AGG</th>
                </tr>

                {reportData?.circular?.subjects?.map(renderSubjectRow)}

                <tr
                  style={{
                    background: 'rgba(226, 216, 184, 0.25)',
                    fontWeight: 800,
                  }}
                >
                  <td style={{ textAlign: 'left', paddingLeft: '8px' }}>
                    TOTAL
                  </td>
                  <td className="data-cell">{reportData?.circular?.bot_total ?? '--'}</td>
                  <td className="data-cell">{reportData?.circular?.bot_aggregate ?? '--'}</td>
                  <td className="data-cell">{reportData?.circular?.mot_total ?? '--'}</td>
                  <td className="data-cell">{reportData?.circular?.mot_aggregate ?? '--'}</td>
                  <td className="data-cell">{reportData?.circular?.eot_total ?? '--'}</td>
                  <td className="data-cell">{reportData?.circular?.aggregate ?? '--'}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <table className="grading-key">
              <tbody>
                <tr>
                  <th>Grade</th>
                  <td>D1</td>
                  <td>D2</td>
                  <td>C3</td>
                  <td>C4</td>
                  <td>C5</td>
                  <td>C6</td>
                  <td>P7</td>
                  <td>P8</td>
                  <td>F9</td>
                </tr>
                <tr>
                  <td>
                    <b>Marks</b>
                  </td>
                  <td>85-100</td>
                  <td>75-84</td>
                  <td>70-74</td>
                  <td>60-69</td>
                  <td>55-59</td>
                  <td>50-54</td>
                  <td>40-49</td>
                  <td>35-39</td>
                  <td>0-34</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* DUAL CANDIDATE (WAWOGA) THEOLOGY SECTION */}
          {hasTheology && (
            <div style={{ marginTop: 'auto' }}>
              <table className="theology-table">
                <tbody>
                  <tr>
                    <th colSpan={6} className="table-banner">
                      نتائج المواد الشرعية
                    </th>
                  </tr>
                  <tr>
                    <th rowSpan={2} style={{ width: '22%' }}>المواد</th>
                    <th colSpan={2} style={{ width: '26%' }}>منتصف الفترة</th>
                    <th colSpan={2} style={{ width: '26%' }}>نهاية الفترة</th>
                    <th rowSpan={2} style={{ width: '26%' }}>الملاحظات</th>
                  </tr>
                  <tr>
                    <th className="th-subhead" style={{ width: '13%' }}>
                      الدرجة الكبرى
                    </th>
                    <th className="th-subhead" style={{ width: '13%' }}>
                      الدرجة الصغرى
                    </th>
                    <th className="th-subhead" style={{ width: '13%' }}>
                      الدرجة الكبرى
                    </th>
                    <th className="th-subhead" style={{ width: '13%' }}>
                      الدرجة الصغرى
                    </th>
                  </tr>
                  {reportData?.theology?.subjects?.map((subject: any) => {
                    const arabicName = subject.subject_name_arabic === 'التاريخ والسيرة' 
                      ? 'التربية' 
                      : subject.subject_name_arabic;
                      
                    return (
                    <tr key={subject.subject_name_arabic}>
                      <td>{arabicName}</td>
                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject.mot_score)}</td>
                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject.eot_score)}</td>
                      <td className="remarks-cell" style={{ textAlign: 'right' }}>
                        {subject.theology_remark ?? ''}
                      </td>
                    </tr>
                  )})}
                  <tr style={{ background: 'rgba(226, 216, 184, 0.25)', fontWeight: 800 }}>
                    <td>
                      <b>المجموع</b>
                    </td>
                    <td>
                      {toAr(
                        reportData?.theology?.subjects?.length
                          ? reportData.theology.subjects.length * 100
                          : 400
                      )}
                    </td>
                    <td>{toAr(reportData?.theology?.mot_total)}</td>
                    <td>
                      {toAr(
                        reportData?.theology?.subjects?.length
                          ? reportData.theology.subjects.length * 100
                          : 400
                      )}
                    </td>
                    <td>{toAr(reportData?.theology?.eot_total)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
              <div className="t-comment">
                  <span style={{ fontWeight: 700 }}>ملاحظة مشرف الفصل: </span>
                  <span style={{ fontStyle: 'italic', color: '#334155', fontWeight: 600 }}>
                    {getTheologyComment(
                      reportData?.theology?.eot_total ?? null
                    )}
                  </span>
              </div>
            </div>
          )}
        </div>

        <footer className="premium-footer">
          <div className="footer-left">
            <div className="comment-card">
              <div className="comment-row">
                <div className="c-field" style={{ flex: 1 }}>
                  <span>Conduct:</span>
                  <div className="w-line">
                    <span className="line-text">{conductRemark}</span>
                  </div>
                </div>
              </div>

              <div className="comment-row">
                <div className="c-field" style={{ flex: 1 }}>
                  <span>Class Teacher's Comment:</span>
                  <div className="w-line">
                    <span className="line-text">{teacherComment}</span>
                  </div>
                </div>
                <div className="c-field" style={{ width: '200px' }}>
                  <span>Signature:</span>
                  <div className="w-line"></div>
                </div>
              </div>

              <div className="comment-row">
                <div className="c-field" style={{ flex: 1 }}>
                  <span>Head Teacher's Comment:</span>
                  <div className="w-line">
                    <span className="line-text">{headComment}</span>
                  </div>
                </div>
                <div className="c-field" style={{ width: '200px' }}>
                  <span>Signature:</span>
                  <div className="w-line"></div>
                </div>
              </div>
            </div>

            <div className="term-dates-bar">
              <div className="date-item red-date">
                <span>This Term Ends On:</span>
                <span>
                  {reportData?.term?.end_date
                    ? new Date(reportData.term.end_date).toLocaleDateString(
                        'en-UG',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      )
                    : ''}
                </span>
              </div>

              <div className="date-item blue-date">
                <span>Next Term Begins On:</span>
                <span>
                  {reportData?.term?.next_term_start
                    ? new Date(
                        reportData.term.next_term_start
                      ).toLocaleDateString('en-UG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : ''}
                </span>
              </div>
            </div>

            <div className="validity-strip">
              THIS REPORT FORM IS NOT VALID WITHOUT THE OFFICIAL SCHOOL STAMP
            </div>
          </div>

          <div className="stamp-box">
            OFFICIAL
            <br />
            SCHOOL
            <br />
            STAMP
          </div>
        </footer>
        </div>
      </div>
    </ReportContainer>
  )
}
