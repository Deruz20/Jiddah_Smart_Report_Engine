import {
  getClassTeacherComment,
  getHeadTeacherComment,
  getConductRemark,
} from "@/lib/grading";
import { ReportContainer } from "@/components/reports/shared/ReportContainer";
import { getClassTeacherSignatureKey } from "@/utils/signatures";

export default function PrimaryBOTReport({ reportData }: any) {
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

  const classTeacherSigKey = reportData?.student?.class_name
    ? getClassTeacherSignatureKey(reportData.student.class_name) ?? ''
    : '';
  const classTeacherSig = classTeacherSigKey
    ? reportData?.signatures?.[classTeacherSigKey]
    : null;
  const headTeacherSig = reportData?.signatures?.['head-teacher'] ?? null;

  const renderSubjectRow = (subject: any) => (
    <tr key={subject.subject_name}>
      <td className="subject" style={{ textAlign: 'left', paddingLeft: '8px' }}>{subject.subject_name}</td>
      <td>{subject.bot_score ?? ""}</td>
      <td>{subject.bot_grade_display ?? ""}</td>
      <td style={{ textAlign: "left", paddingLeft: "8px", fontFamily: '"Caveat", cursive', fontSize: '1.2em' }}>
        {subject.remark ?? ""}
      </td>
    </tr>
  );

  return (
    <ReportContainer reportType="PrimaryBOTReport">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Poppins:wght@400;600;700&family=Caveat:wght@700&display=swap');

        .bot-report-page,
        .bot-report-page * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .bot-report-page {
            width: 100%;
            height: 100%;
            background: #fffef8;
            border: 4px solid #163f2d;
            position: relative;
            overflow: hidden;
            padding: 20px 25px 40px;
            font-family: 'Poppins', sans-serif;
            color: #000;
        }

        .bot-report-page::before {
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

        /* Header */
        .bot-top-arabic {
            text-align: center;
            font-family: 'Cairo', sans-serif;
            font-size: 24px;
            color: #0d5c3f;
            font-weight: 700;
            margin-top: 5px;
        }

        .bot-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 5px;
        }

        .bot-school-left { width: 42%; }
        .bot-school-left h1 {
            color: #7a1408;
            font-size: 18px;
            line-height: 1.2;
            font-weight: 800;
            margin: 0;
        }
        .bot-school-left p {
            margin-top: 5px;
            font-size: 11px;
            line-height: 1.5;
            color: #444;
            margin-bottom: 0;
        }

        .bot-logo {
            width: 85px;
            height: 85px;
            border-radius: 50%;
            background: #f6f6f6;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }
        .bot-logo img { width: 100%; height: 100%; object-fit: contain; }

        .bot-school-right { width: 42%; text-align: right; font-family: 'Cairo', sans-serif; }
        .bot-school-right h2 { color: #7a1408; font-size: 21px; line-height: 1.4; margin: 0; }

        /* Ribbon */
        .bot-ribbon {
            width: 360px;
            margin: 12px auto;
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
        .bot-info {
            border: 2px solid #d6b14c;
            border-radius: 12px;
            padding: 10px 18px;
        }
        .bot-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .bot-field { display: flex; align-items: flex-end; gap: 8px; font-size: 13px; font-weight: 600; }
        .bot-line { border-bottom: 2px dotted #555; width: 150px; height: 18px; text-align: center; color: #111; font-weight: 700; }

        /* Rounded Table Container */
        .bot-table-wrap {
            margin-top: 12px;
            border: 2px solid #d6b14c;
            border-radius: 10px;
            overflow: hidden;
        }

        .bot-main-table {
            width: 100%;
            border-collapse: collapse;
            border-style: hidden;
        }

        .bot-main-table th {
            background: #0d5c3f;
            color: #fff;
            padding: 8px 4px;
            border: 1px solid #d6b14c;
            font-size: 12px;
        }

        .bot-main-table td {
            border: 1px solid #d6b14c;
            padding: 7px 8px;
            height: 36px;
            font-size: 12px;
            text-align: center;
        }

        .bot-main-table .subhead th { background: #e8f3ec; color: #0d5c3f; font-weight: 700; }
        .bot-main-table .subject { font-weight: 700; text-align: left !important; }

        /* Grading */
        .bot-grading { margin-top: 12px; }
        .bot-grade-title { font-size: 14px; font-weight: 700; color: #7a1408; margin-bottom: 4px; }

        .bot-grade-wrap {
            border: 2px solid #d6b14c;
            border-radius: 10px;
            overflow: hidden;
        }

        .bot-grade-table { width: 100%; border-collapse: collapse; border-style: hidden; }
        .bot-grade-table th { background: #d6b14c; color: #000; padding: 6px; border: 1px solid #333; font-size: 11px; }
        .bot-grade-table td { border: 1px solid #333; text-align: center; padding: 6px; font-size: 11px; }

        /* Bottom Section */
        .bot-bottom { margin-top: 16px; }

        .bot-comment-row {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            margin-bottom: 12px;
        }
        .bot-comment-label { font-weight: 700; font-size: 13px; color: #111; white-space: nowrap; }
        .bot-comment-value {
            border-bottom: 2px dotted #444;
            flex: 1;
            min-height: 22px;
            font-family: 'Caveat', cursive;
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            padding-left: 8px;
            line-height: 1.2;
        }
        .bot-sig-label { font-weight: 700; font-size: 13px; color: #111; white-space: nowrap; }
        .bot-sig-line {
            width: 180px;
            border-bottom: 2px dotted #444;
            min-height: 22px;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: flex-end;
        }
        .bot-sig-line img {
            position: absolute;
            bottom: 0;
            height: 36px;
        }

        .bot-conduct-row {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            margin-bottom: 12px;
        }

        .bot-footer-stamp {
            display: flex;
            justify-content: flex-end;
            margin-top: 8px;
        }

        .bot-stamp {
            width: 120px;
            height: 90px;
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
        .bot-final-footer {
            position: absolute;
            bottom: 14px;
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
      <div className="bot-report-page">
        <div className="bot-top-arabic">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>

        <div className="bot-header">
          <div className="bot-school-left">
            <h1>JIDDAH ISLAMIC SCHOOLS</h1>
            <p>
              P.O.Box 34008 Kampala (U)<br/>
              Tel: +256 744950042 / 0705316961<br/>
              jiddahislamicnurseryandpri@gmail.com
            </p>
          </div>

          <div className="bot-logo">
            <img src="/school_budge.jpeg" alt="Logo" />
          </div>

          <div className="bot-school-right">
            <h2>مدرسة جدة الإسلامية للروضة <br/> والإبتدائية بنساغو</h2>
          </div>
        </div>

        <div className="bot-ribbon">PROVISIONAL REPORT FORM – BEGINNING OF TERM</div>

        <div className="bot-info">
          <div className="bot-info-row">
            <div className="bot-field">Class: <div className="bot-line">{className}</div></div>
            <div className="bot-field">Term: <div className="bot-line">{reportData?.term?.term_number ?? "--"}</div></div>
            <div className="bot-field">Year: <div className="bot-line" style={{width: '100px'}}>{reportData?.term?.academic_year ?? "--"}</div></div>
          </div>
          <div className="bot-info-row" style={{marginBottom: 0}}>
            <div className="bot-field" style={{width: '100%'}}>
              Pupil&apos;s Name: <div className="bot-line" style={{width: '100%'}}>{reportData?.student?.name}</div>
            </div>
          </div>
        </div>

        <div className="bot-table-wrap">
          <table className="bot-main-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{width: '25%'}}>SUBJECTS</th>
                <th colSpan={2}>BEGINNING OF TERM</th>
                <th rowSpan={2} style={{width: '35%'}}>SUBJECT TEACHER&apos;S COMMENT</th>
              </tr>
              <tr className="subhead">
                <th>MARK</th><th>AGG</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.circular?.subjects?.map(renderSubjectRow)}
              <tr>
                <td className="subject" style={{textAlign: 'left', paddingLeft: '8px'}}>TOTAL</td>
                <td>{reportData?.circular?.bot_total ?? ""}</td>
                <td>{reportData?.circular?.bot_aggregate ?? ""}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bot-grading">
          <div className="bot-grade-title">Grading</div>
          <div className="bot-grade-wrap">
            <table className="bot-grade-table">
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
        </div>

        <div className="bot-bottom">
          {/* Conduct row */}
          <div className="bot-conduct-row">
            <span className="bot-comment-label">Conduct:</span>
            <div className="bot-comment-value" style={{fontFamily: '"Caveat", cursive', fontSize: '18px'}}>{conductRemark}</div>
          </div>

          {/* Class Teacher: comment + signature on same row */}
          <div className="bot-comment-row">
            <span className="bot-comment-label">Class Teacher&apos;s Comment:</span>
            <div className="bot-comment-value">{teacherComment}</div>
            <span className="bot-sig-label">Signature:</span>
            <div className="bot-sig-line">
              {classTeacherSig && (
                <img src={classTeacherSig} alt="Class Teacher Signature" />
              )}
            </div>
          </div>

          {/* Head Teacher: comment + signature on same row */}
          <div className="bot-comment-row">
            <span className="bot-comment-label">Head Teacher&apos;s Comment:</span>
            <div className="bot-comment-value">{headComment}</div>
            <span className="bot-sig-label">Signature:</span>
            <div className="bot-sig-line">
              {headTeacherSig && (
                <img src={headTeacherSig} alt="Head Teacher Signature" />
              )}
            </div>
          </div>

          <div className="bot-footer-stamp">
            <div className="bot-stamp">OFFICIAL<br/>SCHOOL STAMP</div>
          </div>
        </div>

        <div className="bot-final-footer">
          THIS REPORT FORM IS INVALID WITHOUT THE OFFICIAL SCHOOL STAMP
        </div>
      </div>
    </ReportContainer>
  );
}
