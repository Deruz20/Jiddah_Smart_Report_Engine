import { getNurseryGrade, getNurseryTeacherComment, getConductRemark } from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'

export default function NurseryMOTReport({ reportData }: any) {
  const grades = reportData?.circular?.subjects
    ?.map((s: any) => s.score != null ? getNurseryGrade(s.score).grade : 'C') || []
  return (
    <ReportContainer reportType="NurseryMOTReport">
      <style dangerouslySetInnerHTML={{
        __html: `
.nursery-mot-report,
.nursery-mot-report * {
    box-sizing: border-box;
}

.nursery-mot-report {
    --school-green: #2e7d32;
    --theme-blue: #1e40af;
    --surprise-gold: #b45309;
    --light-gold: #fef3c7;
    --ink-color: #c2410c;
    width: 100%;
    height: 100%;
    padding: 10mm 12mm;
    background: white;
    border: 8px double var(--theme-blue);
    position: relative;
    overflow: visible;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    flex-grow: 0;
    box-sizing: border-box;
    box-shadow: 0 0 30px rgba(0,0,0,0.5);
    background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 25%);
    margin: auto;
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    line-height: 1.2;
    page-break-inside: avoid;
    page-break-after: avoid;
}

@media print {
    .nursery-mot-report {
        box-shadow: none;
        margin: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
}

.nursery-mot-report::after {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: url('/school_budge.jpeg') center center no-repeat;
    background-size: 400px;
    opacity: 0.05;
    pointer-events: none;
    z-index: 0;
}

.nursery-mot-report::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    opacity: 0.08;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 0l3.82 10.38L45 15l-10.38 3.82L30 30l-3.82-10.38L15 15l10.38-3.82z' fill='%231e40af'/%3E%3C/svg%3E");
    background-size: 50px 50px;
}

.nursery-mot-report .header {
    position: relative;
    text-align: center;
    padding: 0 95px;
    margin-bottom: 5px;
    z-index: 2;
}

.nursery-mot-report .logo-box {
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
    box-shadow: 3px 3px 0px var(--surprise-gold);
    overflow: hidden;
}
.nursery-mot-report .logo-left { left: 0; }
.nursery-mot-report .logo-right { right: 0; }

.nursery-mot-report .school-name {
    font-family: 'Times New Roman', serif;
    font-size: 26px;
    font-weight: 950;
    color: var(--school-green);
    text-transform: uppercase;
    margin: 0;
    line-height: 1.1;
}

.nursery-mot-report .contact-info {
    font-size: 11px;
    color: #334155;
    font-weight: 700;
    margin-top: 4px;
}

.nursery-mot-report .title-area {
    text-align: center;
    margin: 10px 0;
    z-index: 2;
}

.nursery-mot-report .nursery-label {
    font-size: 30px;
    font-weight: 900;
    color: var(--theme-blue);
    letter-spacing: 10px;
    text-shadow: 2px 2px 0px #dbeafe;
    margin-bottom: -4px;
}

.nursery-mot-report .badge {
    display: inline-block;
    padding: 5px 45px;
    background: var(--surprise-gold);
    color: white;
    font-weight: 900;
    border-radius: 50px;
    font-size: 14px;
    box-shadow: 0 4px 10px rgba(180, 83, 9, 0.3);
}

.nursery-mot-report .term-year {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 900;
    color: var(--theme-blue);
}

.nursery-mot-report table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 13px;
    z-index: 2;
    background: rgba(255, 255, 255, 0.8);
    border: 2px solid var(--theme-blue);
}

.nursery-mot-report th,
.nursery-mot-report td {
    border: 1px solid var(--theme-blue);
    padding: 7px 10px;
    color: var(--theme-blue);
}

.nursery-mot-report .info-label {
    background: #f0f9ff;
    font-weight: 800;
    width: 18%;
}

.nursery-mot-report .data-cell {
    color: var(--ink-color);
    font-weight: 900;
    text-align: center;
}

.nursery-mot-report .main-th {
    background: var(--theme-blue);
    color: white;
    font-weight: 900;
    text-transform: uppercase;
}

.nursery-mot-report .zebra:nth-child(even) { background: rgba(241, 245, 249, 0.4); }

.nursery-mot-report .section-pill {
    text-align: center;
    margin-top: 12px;
    z-index: 2;
}

.nursery-mot-report .section-pill h2 {
    margin: 0;
    background: var(--school-green);
    color: white;
    display: inline-block;
    padding: 3px 25px;
    border-radius: 20px;
    font-size: 15px;
    text-transform: uppercase;
}

.nursery-mot-report .comments-container {
    margin-top: 12px;
    padding: 10px;
    border: 2px dashed var(--surprise-gold);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.5);
    z-index: 2;
}

.nursery-mot-report .comment-row {
    display: flex;
    align-items: flex-end;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 700;
}

.nursery-mot-report .line-dots {
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

.nursery-mot-report .line-text {
    font-style: italic;
    color: #444;
    line-height: 1.2;
    background: white;
    padding-right: 4px;
}

.nursery-mot-report .footer {
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

.nursery-mot-report .stamp-box {
    width: 135px;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    font-weight: 900;
    background: white;
}

.nursery-mot-report .valid-warning {
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

      <div className="nursery-mot-report">
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
          <div className="badge">MID TERM REPORT FORM</div>
          <div className="term-year">TERM: {reportData?.term?.term_number === 1 ? 'ONE' : reportData?.term?.term_number === 2 ? 'TWO' : 'THREE'} &nbsp;&nbsp;&nbsp;&nbsp; YEAR: {reportData?.term?.academic_year}</div>
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
              const g = subject.score != null ? getNurseryGrade(subject.score) : null
              return (
                <tr key={subject.subject_name} className="zebra">
                  <td>{subject.subject_name}</td>
                  <td className="data-cell">{g?.grade ?? '--'}</td>
                  <td className="data-cell">{g?.remark ?? '--'}</td>
                  <td className="data-cell"></td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="section-pill"><h2>Official Grading Scale</h2></div>
        <table style={{ textAlign: 'center' }}>
          <tbody>
            <tr style={{ fontWeight: 800, background: 'var(--light-gold)' }}>
              <td style={{ width: '20%', color: 'var(--surprise-gold)' }}>Score Range</td>
              <td className="data-cell">0 - 49</td><td className="data-cell">50 - 69</td><td className="data-cell">70 - 79</td><td className="data-cell">80 - 89</td><td className="data-cell">90 - 100</td>
            </tr>
            <tr style={{ fontWeight: 900, fontSize: '15px' }}>
              <td style={{ color: 'var(--surprise-gold)' }}>Grade</td>
              <td className="data-cell">E</td><td className="data-cell">D</td><td className="data-cell">C</td><td className="data-cell">B</td><td className="data-cell">A</td>
            </tr>
          </tbody>
        </table>

        <div className="comments-container">
          <div className="comment-row">Conduct: <div className="line-dots"><span className="line-text">{reportData?.circular?.conduct_remark ?? getConductRemark(null)}</span></div></div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div className="comment-row" style={{ width: '70%', flexShrink: 0 }}>Class Teacher's Comment: <div className="line-dots"><span className="line-text">{getNurseryTeacherComment(grades)}</span></div></div>
            <div className="comment-row" style={{ width: '30%', flexShrink: 0 }}>Signature: <div className="line-dots"></div></div>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div className="comment-row" style={{ width: '70%', flexShrink: 0 }}>Head Teacher's Comment: <div className="line-dots"><span className="line-text">{getNurseryTeacherComment(grades)}</span></div></div>
            <div className="comment-row" style={{ width: '30%', flexShrink: 0 }}>Signature: <div className="line-dots"></div></div>
          </div>
        </div>

        <div className="footer">
          <div>
            <div style={{ fontWeight: 900, color: 'var(--theme-blue)', fontSize: '15px', marginBottom: '10px' }}>Next Term Begins On: {reportData?.term?.next_term_start
              ? new Date(reportData.term.next_term_start).toLocaleDateString('en-UG',
                  {weekday:'long', day:'numeric', month:'long', year:'numeric'})
              : '____________________'}</div>
            <div className="valid-warning">NOT VALID WITHOUT THE OFFICIAL SCHOOL STAMP</div>
          </div>
          <div className="stamp-box">OFFICIAL SCHOOL STAMP</div>
        </div>
      </div>
    </ReportContainer>
  )
}
