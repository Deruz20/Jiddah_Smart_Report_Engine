/* eslint-disable react/style-prop-object */

import { getClassTeacherComment, getHeadTeacherComment, getConductRemark } from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'

export default function PrimaryBOTReport({ reportData }: { reportData: any }) {
  const className = reportData?.class_name || reportData?.class || '';
  const lowerClasses = ['baby', 'middle', 'top', 'p.1', 'p.2', 'p.3'];
  const isLower = lowerClasses.some(c => className.toLowerCase().includes(c)) || reportData?.section_type === 'lower_primary';

  return (
    <ReportContainer reportType="PrimaryMOTReport">
      <style dangerouslySetInnerHTML={{
        __html: `
    .primary-bot-report,
    .primary-bot-report * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    .primary-bot-report {
        --primary-green: #064e3b;
        --secondary-green: #047857;
        --accent-gold: #fbbf24;
        --data-indigo: #1e293b;
        --data-teal: #0369a1;
        --soft-gray: #f8fafc;
        --border-light: #e2e8f0;

        flex: 1 1 auto;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: transparent;
        padding: 0;
        position: relative;
        overflow: hidden;
    }



    /* Header */
    .primary-bot-report .header {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(to right, var(--primary-green), var(--secondary-green));
        padding: 16px 24px;
        border-bottom: 4px solid var(--accent-gold);
        color: white;
    }

    .primary-bot-report .school-left { width: 33%; }
    .primary-bot-report .school-left h1 { margin: 0; font-size: 16px; font-weight: 800; color: white; line-height: 1.2; letter-spacing: -0.2px; }
    .primary-bot-report .school-left p { margin: 2px 0 0; font-size: 10px; font-weight: 500; color: #a7f3d0; }

    .primary-bot-report .logo {
        width: 60px;
        height: 60px;
        flex-shrink: 0;
        background: white;
        border-radius: 12px;
        padding: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .primary-bot-report .school-right { width: 33%; text-align: right; }
    .primary-bot-report .school-right h2 { margin: 0; font-size: 19px; color: white; font-weight: 800; font-family: 'Cairo', sans-serif; }

    /* Ribbon */
    .primary-bot-report .ribbon {
        background: rgba(255,255,255,0.2);
        color: white;
        text-align: center;
        padding: 6px;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.3);
        margin: 10px auto;
        display: inline-block;
        padding: 4px 18px;
    }

    /* INFO BOXES */
    .primary-bot-report .report-body {
        padding: 8px 24px 16px;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
    }

    .primary-bot-report .info {
        background: var(--soft-gray);
        border: 1px solid var(--border-light);
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 12px;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }

    .primary-bot-report .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .primary-bot-report .field { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .primary-bot-report .line { 
        border-bottom: 1.5px dashed #cbd5e1; 
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        color: var(--data-indigo);
        font-weight: 800;
        font-size: 14px;
        padding-bottom: 2px;
        padding-left: 8px;
        text-transform: none;
        letter-spacing: normal;
    }

    /* Main Table */
    .primary-bot-report .main-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--border-light);
        background: white;
    }

    .primary-bot-report .main-table th {
        background: var(--primary-green);
        color: white;
        font-size: 10px;
        padding: 6px 4px;
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.5px;
        border-right: 1px solid var(--border-light);
        border-bottom: 1px solid var(--border-light);
    }
    .primary-bot-report .main-table th:last-child { border-right: none; }

    .primary-bot-report .main-table td {
        border-right: 1px solid var(--border-light);
        border-bottom: 1px solid var(--border-light);
        padding: 4px 6px;
        font-size: 11px;
        text-align: center;
        font-weight: 600;
        color: #334155;
    }
    .primary-bot-report .main-table td:last-child { border-right: none; }

    .primary-bot-report .main-table .subhead th { background: var(--secondary-green); color: white; border-bottom: 2px solid #064e3b; }
    .primary-bot-report .main-table .subhead th[rowspan="2"] { background: var(--primary-green); }
    .primary-bot-report .subject { font-weight: 700; text-align: left !important; }

    .primary-bot-report .data-cell {
        color: var(--data-indigo);
        font-weight: 800;
        font-size: 13px;
        text-align: center;
    }
    
    .primary-bot-report .remarks-cell {
        color: var(--data-teal);
        font-weight: 800;
        font-style: italic;
        font-size: 11px;
        text-align: left;
    }

    /* Grading */
    .primary-bot-report .grading { margin-top: 12px; }
    .primary-bot-report .grade-table { 
        width: 100%; 
        border-collapse: separate; 
        border-spacing: 0;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid var(--border-light);
    }
    .primary-bot-report .grade-table th { background: #475569; color: white; font-size: 10px; padding: 4px; border-right: 1px solid #64748b; border-bottom: 1px solid #64748b; letter-spacing: 0; }
    .primary-bot-report .grade-table td { font-size: 10px; font-weight: 800; padding: 4px; border-right: 1px solid var(--border-light); text-align: center; }

    /* Bottom Section */
    .primary-bot-report .bottom { margin-top: 12px; padding-bottom: 0.5rem; }
    
    .primary-bot-report .comment-field {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      flex: 0 0 auto;
      align-items: center;
    }
    .primary-bot-report .comment-field > span:first-child {
      font-weight: 800;
      font-size: 11px;
      color: #475569;
      text-transform: uppercase;
    }
    .primary-bot-report .filled-line {
      flex: 1;
      border-bottom: 1.5px dashed #cbd5e1;
      min-height: 22px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0 4px 2px 8px;
    }

    .primary-bot-report .line-text {
      font-style: italic;
      color: var(--data-indigo);
      font-weight: 800; font-size: 13px;
      line-height: 1.2;
      background: transparent;
      padding-right: 4px;
      font-family: 'Georgia', serif;
    }

    .primary-bot-report .footer-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: 10px;
    }

    .primary-bot-report .signature { width: 200px; }
    .primary-bot-report .signature .line { width: 100%; }

    .primary-bot-report .stamp {
        width: 120px;
        height: 120px;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 800;
        text-align: center;
        background: white;
        border: 2px dashed #94a3b8;
        border-radius: 16px;
        box-shadow: none;
    }

    .primary-bot-report .final-footer {
        flex: 0 0 auto;
        margin-top: 10px;
        width: 100%;
        background: var(--primary-green);
        color: white;
        text-align: center;
        padding: 6px;
        font-size: 10px;
        font-weight: 800;
        border-radius: 4px;
        letter-spacing: 1px;
    }
        `
      }} />

      <div className="primary-bot-report font-poppins">
        <div className="watermark-bg"></div>
        <div className="top-arabic" style={{ visibility: 'hidden' }}>.</div>

        <div className="header">
          <div className="school-left">
            <h1>JIDDAH ISLAMIC NURSERY <br /> AND PRIMARY SCHOOL - Nsaggu</h1>
            <p>
              P.O.Box 34008 Kampala (U)<br />
              Tel: +256 744950042 / 0705316961<br />
              jiddahislamicnurseryandpri@gmail.com
            </p>
          </div>

          <div className="logo">
            <img src="/school_budge.jpeg" alt="School Badge" style={{ width: '100%', height: 'auto' }} />
          </div>

          <div className="header-right" style={{ width: '33%', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div className="ribbon" style={{ margin: 0 }}>{reportData?.section_type === 'upper_primary' ? 'UPPER' : 'LOWER'} REPORT FORM - BEGINNING OF TERM</div>
          </div>
        </div>

        <div className="report-body">
        <div className="info">
          <div className="info-row">
            <div className="field">Class: <div className="line">{reportData?.student?.class_name}</div></div>
            <div className="field">Term: <div className="line">{reportData?.term?.label}</div></div>
            <div className="field">Year: <div className="line" style={{ width: '100px' }}>{reportData?.term?.academic_year}</div></div>
          </div>
          <div className="info-row" style={{ marginBottom: 0 }}>
            <div className="field" style={{ width: '100%' }}>
              Pupil’s Name: <div className="line" style={{ width: '100%' }}>{reportData?.student?.name}</div>
            </div>
          </div>
          <div className="info-row" style={{ marginTop: '12px' }}>
            <div className="field">Position: <div className="line">{reportData?.circular?.position ?? '--'}</div></div>
            <div className="field">Out Of: <div className="line">{reportData?.circular?.total_students ?? '--'}</div></div>
            <div className="field">Division: <div className="line">{reportData?.circular?.division ?? '--'}</div></div>
          </div>
        </div>

        <table className="main-table">
          <tbody>
            <tr className="subhead">
              <th rowSpan={2} style={{ width: '25%' }}>SUBJECTS</th>
              <th colSpan={2} style={{ width: '30%' }}>BEGINNING OF TERM</th>
              <th rowSpan={2} style={{ width: '45%' }}>SUBJECT TEACHER’S COMMENT</th>
            </tr>
            <tr className="subhead">
              <th style={{ width: '15%' }}>MARK</th>
              <th style={{ width: '15%' }}>AGG</th>
            </tr>
            {reportData?.circular?.subjects?.map((subject: any) => (
              <tr key={subject.subject_name}>
                <td className="subject">{subject.subject_name}</td>
                <td className="data-cell">{subject.bot_score ?? '--'}</td>
                <td className="data-cell">{subject.bot_grade_display ?? '--'}</td>
                <td className="remarks-cell">{subject.remark ?? ''}</td>
              </tr>
            ))}
            <tr>
              <td><b>TOTAL</b></td>
              <td className="data-cell">{reportData?.circular?.bot_total ?? '--'}</td>
              <td className="data-cell">{reportData?.circular?.bot_aggregate ?? '--'}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div className="grading">
          <div className="grade-title">Grading</div>
          <table className="grade-table">
            <tbody>
              <tr>
                <th>Grade</th><th>D1</th><th>D2</th><th>C3</th><th>C4</th><th>C5</th><th>C6</th><th>P7</th><th>P8</th><th>F9</th>
              </tr>
              <tr>
                <td><strong>Marks</strong></td>
                <td>85-100</td><td>75-84</td><td>70-74</td><td>60-69</td><td>55-59</td><td>50-54</td><td>40-49</td><td>35-39</td><td>0-34</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bottom">
          <div className="comment-field">
            <span>Class Teacher's Comment:</span>
            <div className="filled-line">
              <span className="line-text">
                {reportData?.circular?.class_teacher_comment ?? getClassTeacherComment(reportData?.circular?.division ?? null)}
              </span>
            </div>
          </div>

          <div className="footer-row">
            <div style={{ width: '68%' }}>
              <div className="comment-field">
                <span>Conduct:</span>
                <div className="filled-line">
                  <span className="line-text">
                    {reportData?.circular?.conduct_remark ?? getConductRemark(reportData?.circular?.division ?? null)}
                  </span>
                </div>
              </div>
            </div>
            <div className="signature">
              <div className="comment-field">
                <span>Signature:</span>
                <div className="filled-line"></div>
              </div>
            </div>
          </div>

          <div className="comment-field" style={{ marginTop: '15px' }}>
            <span>Head Teacher's Comment:</span>
            <div className="filled-line">
              <span className="line-text">
                {reportData?.circular?.head_teacher_comment ?? getHeadTeacherComment(reportData?.circular?.division ?? null)}
              </span>
            </div>
          </div>

          <div className="footer-row">
            <div className="signature">
              <div className="comment-field">
                <span>Signature:</span>
                <div className="filled-line"></div>
              </div>
            </div>
            <div className="stamp">OFFICIAL<br />SCHOOL STAMP</div>
          </div>
        </div>

        <div className="final-footer">
          THIS REPORT FORM IS INVALID WITHOUT THE OFFICIAL SCHOOL STAMP
        </div>
        </div>

      </div>
    </ReportContainer>
  )
}
