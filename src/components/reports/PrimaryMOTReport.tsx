import {
  getClassTeacherComment,
  getHeadTeacherComment,
  getConductRemark,
} from "@/lib/grading";
import { ReportContainer } from "@/components/reports/shared/ReportContainer";
import { getClassTeacherSignatureKey } from "@/utils/signatures";

export default function PrimaryMOTReport({ reportData }: any) {
  const className =
    reportData?.class_name ||
    reportData?.class ||
    reportData?.student?.class_name ||
    "";

  const teacherComment =
    reportData?.circular?.class_teacher_comment ??
    getClassTeacherComment(reportData?.circular?.division ?? null);
  const headComment =
    reportData?.circular?.head_teacher_comment ??
    getHeadTeacherComment(reportData?.circular?.division ?? null);
  const conductRemark =
    reportData?.circular?.conduct_remark ??
    getConductRemark(reportData?.circular?.division ?? null);

  const renderSubjectRow = (subject: any) => (
    <tr key={subject.subject_name}>
      <td className="subject" style={{ textAlign: 'left', paddingLeft: '8px' }}>{subject.subject_name}</td>
      <td>{subject.bot_score ?? ""}</td>
      <td>{subject.bot_grade_display ?? ""}</td>
      <td>{subject.mot_score ?? ""}</td>
      <td>{subject.mot_grade_display ?? ""}</td>
      <td style={{ textAlign: "left", paddingLeft: "8px", fontFamily: '"Caveat", cursive', fontSize: '1.2em' }}>
        {subject.remark ?? ""}
      </td>
    </tr>
  );

  return (
    <ReportContainer reportType="PrimaryMOTReport">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Poppins:wght@400;600;700&family=Caveat:wght@700&display=swap');

        .report-page,
        .report-page * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .report-page {
            width: 100%;
            height: 100%;
            margin: auto;
            background: #fffef8;
            border: 4px solid #163f2d;
            position: relative;
            overflow: hidden;
            padding: 20px 25px;
            font-family: 'Poppins', sans-serif;
            color: #000;
        }

        .report-page::before {
            content: "✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦";
            position: absolute;
            top: 6px;
            left: 0;
            width: 100%;
            text-align: center;
            color: #0d5c3f;
            letter-spacing: 6px;
            font-size: 14px;
        }

        .report-page::after {
            content: "✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦";
            position: absolute;
            bottom: 6px;
            left: 0;
            width: 100%;
            text-align: center;
            color: #0d5c3f;
            letter-spacing: 6px;
            font-size: 14px;
        }

        /* Header */
        .top-arabic {
            text-align: center;
            font-family: 'Cairo', sans-serif;
            font-size: 24px;
            color: #0d5c3f;
            font-weight: 700;
            margin-top: 5px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 5px;
        }

        .school-left { width: 42%; }
        .school-left h1 {
            color: #7a1408;
            font-size: 18px;
            line-height: 1.2;
            font-weight: 800;
            margin: 0;
        }

        .school-left p {
            margin-top: 5px;
            font-size: 11px;
            line-height: 1.5;
            color: #444;
            margin-bottom: 0;
        }

        .logo {
            width: 85px;
            height: 85px;
            border-radius: 50%;
            background: #f6f6f6;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }
            
        .logo img { width: 100%; height: 100%; object-fit: contain; }

        .school-right { width: 42%; text-align: right; font-family: 'Cairo', sans-serif; }
        .school-right h2 { color: #7a1408; font-size: 21px; line-height: 1.4; margin: 0; }

        /* Ribbon */
        .ribbon {
            width: 320px;
            margin: 15px auto;
            background: linear-gradient(to right, #0d5c3f, #15734f);
            color: #fff;
            text-align: center;
            padding: 10px;
            border-radius: 50px;
            font-size: 20px;
            font-weight: 700;
            box-shadow: 0 4px 10px rgba(0,0,0,.15);
            border: 3px solid #d6b14c;
        }

        /* Info Section */
        .info {
            margin-top: 15px;
            border: 2px solid #d6b14c;
            border-radius: 12px;
            padding: 12px 18px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .field { display: flex; align-items: flex-end; gap: 8px; font-size: 13px; font-weight: 600; }
        .line { border-bottom: 2px dotted #555; width: 150px; height: 18px; text-align: center; color: #111; font-weight: 700; }

        /* Main Table */
        .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        .main-table th {
            background: #0d5c3f;
            color: #fff;
            padding: 8px 4px;
            border: 1px solid #d6b14c;
            font-size: 12px;
        }

        .main-table td {
            border: 1px solid #d6b14c;
            padding: 8px;
            height: 38px;
            font-size: 12px;
            text-align: center;
        }

        .main-table .subhead th { background: #e8f3ec; color: #0d5c3f; font-weight: 700; }
        .subject { font-weight: 700; text-align: left !important; }

        /* Grading */
        .grading { margin-top: 15px; }
        .grade-title { font-size: 15px; font-weight: 700; color: #7a1408; margin-bottom: 5px; }
        .grade-table { width: 100%; border-collapse: collapse; }
        .grade-table th { background: #d6b14c; color: #000; padding: 6px; border: 1px solid #333; font-size: 11px; }
        .grade-table td { border: 1px solid #333; text-align: center; padding: 6px; font-size: 11px; }

        /* Bottom Section */
        .bottom { margin-top: 20px; }
        .comment-box { margin-bottom: 15px; display: flex; align-items: flex-end; gap: 8px; }
        .comment-label { font-weight: 700; font-size: 13px; color: #111; white-space: nowrap; }
        .comment-line { border-bottom: 2px dotted #444; flex: 1; min-height: 22px; font-family: 'Caveat', cursive; font-size: 16px; font-weight: 700; color: #1e293b; padding-left: 8px; line-height: 1.2; }

        .footer-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 10px;
        }

        .signature { width: 200px; display: flex; align-items: flex-end; gap: 8px; position: relative;}
        .signature .line { border-bottom: 2px dotted #444; flex: 1; height: 22px; }

        .stamp {
            width: 130px;
            height: 100px;
            border: 3px dashed #c0c0c0;
            border-radius: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #999;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            background: white;
        }

        /* Footer */
        .final-footer {
            position: absolute;
            bottom: 25px;
            left: 0;
            width: 100%;
            text-align: center;
            font-size: 12px;
            color: #b10000;
            font-weight: 700;
        }
        `,
        }}
      />
      <div className="report-page">
        <div className="top-arabic">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>

        <div className="header">
          <div className="school-left">
            <h1>JIDDAH ISLAMIC NURSERY <br/> AND PRIMARY SCHOOL - Nsaggu</h1>
            <p>
              P.O.Box 34008 Kampala (U)<br/>
              Tel: +256 744950042 / 0705316961<br/>
              jiddahislamicnurseryandpri@gmail.com
            </p>
          </div>

          <div className="logo">
             <img src="/school_budge.jpeg" alt="Logo" />
          </div>

          <div className="school-right">
            <h2>مدرسة جدة الإسلامية للروضة <br/> والإبتدائية بنساغو</h2>
          </div>
        </div>

        <div className="ribbon">PROVISIONAL REPORT FORM</div>

        <div className="info">
          <div className="info-row">
            <div className="field">Class: <div className="line">{className}</div></div>
            <div className="field">Term: <div className="line">{reportData?.term?.term_number ?? "--"}</div></div>
            <div className="field">Year: <div className="line" style={{width: '100px'}}>{reportData?.term?.academic_year ?? "--"}</div></div>
          </div>
          <div className="info-row" style={{marginBottom: 0}}>
            <div className="field" style={{width: '100%'}}>
              Pupil’s Name: <div className="line" style={{width: '100%'}}>{reportData?.student?.name}</div>
            </div>
          </div>
        </div>

        <table className="main-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{width: '20%'}}>SUBJECTS</th>
              <th colSpan={2}>BEGINNING OF TERM</th>
              <th colSpan={2}>MIDTERM</th>
              <th rowSpan={2} style={{width: '25%'}}>SUBJECT TEACHER’S COMMENT</th>
            </tr>
            <tr className="subhead">
              <th>MARK</th><th>AGG</th><th>MARK</th><th>AGG</th>
            </tr>
          </thead>
          <tbody>
            {reportData?.circular?.subjects?.map(renderSubjectRow)}
            <tr>
              <td className="subject" style={{textAlign: 'left', paddingLeft: '8px'}}>TOTAL</td>
              <td>{reportData?.circular?.bot_total_score ?? ""}</td>
              <td>{reportData?.circular?.bot_total_aggregates ?? ""}</td>
              <td>{reportData?.circular?.mot_total_score ?? ""}</td>
              <td>{reportData?.circular?.mot_total_aggregates ?? ""}</td>
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
          <div className="comment-box">
            <div className="comment-label">Class Teacher’s Comment:</div>
            <div className="comment-line">{teacherComment}</div>
          </div>

          <div className="footer-row">
            <div style={{width: '68%', display: 'flex', alignItems: 'flex-end', gap: '8px'}}>
              <div className="comment-label">Conduct:</div>
              <div className="comment-line" style={{fontFamily: '"Caveat", cursive', fontSize: '18px'}}>{conductRemark}</div>
            </div>
            <div className="signature">
              <div className="comment-label">Signature:</div>
              <div className="line">
                {reportData?.student?.class_name && reportData?.signatures?.[getClassTeacherSignatureKey(reportData.student.class_name) ?? ''] && (
                  <img src={reportData.signatures[getClassTeacherSignatureKey(reportData.student.class_name)!]} alt="Signature" style={{ position: 'absolute', bottom: 0, height: '40px', left: '50%', transform: 'translateX(-50%)' }} />
                )}
              </div>
            </div>
          </div>

          <div className="comment-box" style={{marginTop: '15px'}}>
            <div className="comment-label">Head Teacher’s Comment:</div>
            <div className="comment-line">{headComment}</div>
          </div>

          <div className="footer-row">
            <div className="signature">
              <div className="comment-label">Signature:</div>
              <div className="line">
                {reportData?.signatures?.['head-teacher'] && (
                  <img src={reportData.signatures['head-teacher']} alt="Signature" style={{ position: 'absolute', bottom: 0, height: '40px', left: '50%', transform: 'translateX(-50%)' }} />
                )}
              </div>
            </div>
            <div className="stamp">OFFICIAL<br/>SCHOOL STAMP</div>
          </div>
        </div>

        <div className="final-footer">
          THIS REPORT FORM IS INVALID WITHOUT THE OFFICIAL SCHOOL STAMP
        </div>
      </div>
    </ReportContainer>
  );
}
