import { getNurseryGrade, getNurseryTeacherComment, getConductRemark } from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'

export default function NurseryEOTReport({ reportData }: any) {
  const grades = reportData?.circular?.subjects
    ?.map((s: any) => s.score != null ? getNurseryGrade(s.score).grade : 'C') || []
  return (
    <ReportContainer reportType="NurseryEOTReport">
      <style dangerouslySetInnerHTML={{
        __html: `
.nursery-eot-report,
.nursery-eot-report * {
    box-sizing: border-box;
}

.nursery-eot-report {
    --school-green: #2e7d32;
    --nursery-blue: #1e40af;
    --light-blue: #eff6ff;
    --accent-orange: #f59e0b;
    --ink-color: #c2410c;
    width: 100%;
    height: 100%;
    padding: 10mm 12mm 15mm 12mm;
    background: white;
    border: 8px double var(--nursery-blue);
    position: relative;
    overflow: visible;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    flex-grow: 0;
    box-sizing: border-box;
}

@media print {
    .nursery-eot-report {
        box-shadow: none;
        margin: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
}

.nursery-eot-report::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    opacity: 0.12;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 20 Q 15 15 20 20 T 30 20 Q 35 25 30 30 H 10 Q 5 25 10 20' fill='%231e40af'/%3E%3Cpath d='M60 10 L 62 14 L 66 14 L 63 17 L 64 21 L 60 18 L 56 21 L 57 17 L 54 14 L 58 14 Z' fill='%23f59e0b'/%3E%3C/svg%3E");
    background-size: 100px 100px;
}

.nursery-eot-report .header {
    position: relative;
    text-align: center;
    padding: 0 95px;
    margin-bottom: 5px;
    z-index: 2;
}

.nursery-eot-report .logo-box {
    position: absolute;
    top: 0;
    width: 72px;
    height: 88px;
    border: 3px solid var(--school-green);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 900;
    color: var(--school-green);
    background: white;
    box-shadow: 3px 3px 0px var(--nursery-blue);
    overflow: hidden;
}
.nursery-eot-report .logo-left { left: 0; }
.nursery-eot-report .logo-right { right: 0; }

.nursery-eot-report .school-name {
    font-family: 'Times New Roman', serif;
    font-size: 26px;
    font-weight: 950;
    color: var(--school-green);
    text-transform: uppercase;
    margin: 0;
    line-height: 1.1;
}

.nursery-eot-report .contact-info {
    font-size: 11px;
    color: #334155;
    font-weight: 700;
    margin-top: 4px;
}

.nursery-eot-report .title-area {
    text-align: center;
    margin: 10px 0;
    z-index: 2;
}

.nursery-eot-report .nursery-label {
    font-size: 30px;
    font-weight: 900;
    color: var(--nursery-blue);
    letter-spacing: 10px;
    text-shadow: 2px 2px 0px #dbeafe;
    margin-bottom: -4px;
}

.nursery-eot-report .badge {
    display: inline-block;
    padding: 5px 45px;
    background: var(--nursery-blue);
    color: white;
    font-weight: 900;
    border-radius: 50px;
    font-size: 14px;
    box-shadow: 0 4px 10px rgba(30, 64, 175, 0.3);
}

.nursery-eot-report .term-year {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 900;
    color: var(--nursery-blue);
}

.nursery-eot-report table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 13px;
    z-index: 2;
    background: rgba(255, 255, 255, 0.8);
    border: 2px solid var(--nursery-blue);
}

.nursery-eot-report th,
.nursery-eot-report td {
    border: 1px solid var(--nursery-blue);
    padding: 7px 10px;
    color: var(--nursery-blue);
}

.nursery-eot-report .info-label {
    background: var(--light-blue);
    font-weight: 800;
    width: 18%;
}

.nursery-eot-report .data-cell {
    color: var(--ink-color);
    font-weight: 900;
    text-align: center;
}

.nursery-eot-report .main-th {
    background: var(--nursery-blue);
    color: white;
    font-weight: 900;
    text-transform: uppercase;
}

.nursery-eot-report .zebra:nth-child(even) { background: rgba(241, 245, 249, 0.4); }

.nursery-eot-report .section-pill {
    text-align: center;
    margin-top: 12px;
    z-index: 2;
}

.nursery-eot-report .section-pill h2 {
    margin: 0;
    background: var(--school-green);
    color: white;
    display: inline-block;
    padding: 3px 25px;
    border-radius: 20px;
    font-size: 15px;
    text-transform: uppercase;
}

.nursery-eot-report .comments-container {
    margin-top: 12px;
    padding: 10px;
    border: 2px dashed var(--nursery-blue);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.5);
    z-index: 2;
}

.nursery-eot-report .comment-row {
    display: flex;
    align-items: flex-end;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 700;
}

.nursery-eot-report .line-dots {
    flex-grow: 0;
    flex-basis: auto;
    width: auto;
    border-bottom: 2px dotted var(--theme-blue);
    margin-left: 8px;
    height: 20px;
    display: flex;
    align-items: flex-start;
    padding: 0 4px 2px 4px;
}

.nursery-eot-report .line-text {
    font-style: italic;
    color: #444;
    line-height: 1.2;
    background: white;
    padding-right: 4px;
}

.nursery-eot-report .footer {
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 2px solid var(--surprise-gold);
    padding-top: 10px;
    z-index: 2;
    height: 110px;
    flex-shrink: 0;
}

.nursery-eot-report .stamp-box {
    width: 135px;
    height: 90px;
    border: 2px solid #cbd5e1;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    font-weight: 900;
    background: white;
}

.nursery-eot-report .valid-warning {
    text-align: center;
    color: #b91c1c;
    font-weight: 900;
    font-size: 12px;
    margin-top: 8px;
    padding: 4px;
    background: #fee2e2;
    border-radius: 6px;
}
        `
      }} />

      <div className="nursery-eot-report">
        <div className="header">
          <div className="logo-box logo-left">
            <img src="/school_budge.jpeg" alt="School Badge" style={{ width: '100%', height: 'auto', border: 'none' }} />
          </div>
          <div className="logo-box logo-right">
            <img src="/school_budge.jpeg" alt="School Badge" style={{ width: '100%', height: 'auto', border: 'none' }} />
          </div>
          <h1 className="school-name">JIDDAH ISLAMIC NURSERY AND PRIMARY SCHOOL</h1>
          <div className="contact-info">
            P.O. BOX 34008 Kampala (U) | Tel: +256 744950042 / 787779909<br />
            Email: jiddahislamicnurseryandpri@gmail.com
          </div>
        </div>

        <div className="title-area">
          <div className="nursery-label">NURSERY</div>
          <div className="badge">END OF TERM REPORT FORM</div>
          <div className="term-year">
            TERM: {reportData?.term?.term_number === 1 ? 'ONE' : reportData?.term?.term_number === 2 ? 'TWO' : 'THREE'} &nbsp;&nbsp;&nbsp;&nbsp; YEAR: {reportData?.term?.academic_year}
          </div>
        </div>

        <table>
          <tbody>
            <tr>
              <td className="info-label">Pupil's Name:</td>
              <td style={{ width: '32%' }}>{reportData?.student?.name}</td>
              <td className="info-label">Class:</td>
              <td>{reportData?.student?.class_name}</td>
            </tr>
            <tr>
              <td className="info-label">Student ID:</td>
              <td>{reportData?.student?.admission_number}</td>
              <td className="info-label">Date:</td>
              <td>{'--'}</td>
            </tr>
            <tr>
              <td className="info-label">School Pay Code:</td>
              <td colSpan={3}>{'--'}</td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th className="main-th" style={{ textAlign: 'left' }}>Learning Area</th>
              <th className="main-th" style={{ width: '75px' }}>Grade</th>
              <th className="main-th">Remark</th>
              <th className="main-th" style={{ width: '75px' }}>Initial</th>
            </tr>
          </thead>
          <tbody>
            {reportData?.circular?.subjects?.map((subject: any) => {
              const eotGrade = subject.eot_score != null ? getNurseryGrade(subject.eot_score) : null
              return (
                <tr key={subject.subject_name} className="zebra">
                  <td>{subject.subject_name}</td>
                  <td className="data-cell">{eotGrade?.grade ?? '--'}</td>
                  <td className="data-cell">{eotGrade?.remark ?? '--'}</td>
                  <td className="data-cell"></td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="section-pill"><h2>Learner's Competence</h2></div>
        <table>
          <tbody>
            <tr>
              <th style={{ background: 'var(--school-green)', color: 'white', textAlign: 'left' }}>Progressive Records</th>
              <th className="main-th">LA1</th>
              <th className="main-th">LA2</th>
              <th className="main-th">LA3</th>
              <th className="main-th">LA4</th>
              <th className="main-th">LA5</th>
              <th className="main-th">Writing</th>
            </tr>
            <tr>
              <td style={{ fontWeight: 800 }}>Mid-Term Assessment</td>
              {reportData?.circular?.subjects?.slice(0, 6).map((subject: any, index: number) => (
                <td key={index} className="data-cell">
                  {subject.mot_score != null 
                    ? getNurseryGrade(subject.mot_score).grade 
                    : '--'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className="section-pill"><h2>Official Grading Scale</h2></div>
        <table style={{ textAlign: 'center' }}>
          <tbody>
            <tr style={{ fontWeight: 800, background: '#f1f5f9' }}>
              <td style={{ background: 'var(--light-blue)', width: '20%', color: 'var(--nursery-blue)' }}>Score Range</td>
              <td className="data-cell">0 - 49</td><td className="data-cell">50 - 69</td><td className="data-cell">70 - 79</td><td className="data-cell">80 - 89</td><td className="data-cell">90 - 100</td>
            </tr>
            <tr style={{ fontWeight: 900, fontSize: '15px' }}>
              <td style={{ background: 'var(--light-blue)', color: 'var(--nursery-blue)' }}>Grade</td>
              <td className="data-cell">E</td><td className="data-cell">D</td><td className="data-cell">C</td><td className="data-cell">B</td><td className="data-cell">A</td>
            </tr>
          </tbody>
        </table>

        <div className="comments-container">
          <div className="comment-row">Conduct: <div className="line-dots"><span className="line-text">{reportData?.circular?.conduct_remark ?? getConductRemark(null)}</span></div></div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div className="comment-row" style={{ width: '70%', flexShrink: 0 }}>Class Teacher: <div className="line-dots"><span className="line-text">{getNurseryTeacherComment(grades)}</span></div></div>
            <div className="comment-row" style={{ width: '30%', flexShrink: 0 }}>Signature: <div className="line-dots"></div></div>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div className="comment-row" style={{ width: '70%', flexShrink: 0 }}>Head Teacher: <div className="line-dots"><span className="line-text">{getNurseryTeacherComment(grades)}</span></div></div>
            <div className="comment-row" style={{ width: '30%', flexShrink: 0 }}>Signature: <div className="line-dots"></div></div>
          </div>
        </div>

        <div className="footer">
          <div>
            <div style={{ fontWeight: 900, color: 'var(--nursery-blue)', fontSize: '15px', marginBottom: '10px' }}>
              Next Term Begins On: {reportData?.term?.next_term_start
                ? new Date(reportData.term.next_term_start).toLocaleDateString('en-UG',
                    {weekday:'long', day:'numeric', month:'long', year:'numeric'})
                : '____________________'}
            </div>
            <div className="valid-warning">NOT VALID WITHOUT THE OFFICIAL SCHOOL STAMP</div>
          </div>
          <div className="stamp-box">OFFICIAL SCHOOL STAMP</div>
        </div>

      </div>
    </ReportContainer>
  )
}
