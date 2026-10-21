import {
  getClassTeacherComment,
  getHeadTeacherComment,
  getConductRemark,
} from "@/lib/grading";
import { ReportContainer } from "@/components/reports/shared/ReportContainer";
import { resolveReportBranding, resolveReportGradingBands } from "@/lib/school-settings-helper";
import { getClassTeacherSignatureKey } from "@/utils/signatures";

export default function PrimaryMOTReport({ reportData }: any) {
  const branding = resolveReportBranding(reportData);
  const gradingBands = resolveReportGradingBands(reportData);

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
      <td>{subject.mot_score ?? ""}</td>
      <td>{subject.mot_grade_display ?? ""}</td>
      <td style={{ textAlign: "left", paddingLeft: "8px", fontFamily: '"Caveat", cursive', fontSize: '1.2em' }}>
        {subject.remark ?? ""}
      </td>
    </tr>
  );

  return (
    <ReportContainer
      reportType="PrimaryMOTReport"
      primaryFont={branding.primaryFont}
      arabicFont={branding.arabicFont}
      themePreset={branding.themePreset}
      themeColor={branding.themeColor}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Poppins:wght@400;600;700&family=Caveat:wght@700&display=swap');

        .mot-report-page,
        .mot-report-page * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .mot-report-page {
            width: 100%;
            height: 100%;
            background: #fffef8;
            border: 4px solid var(--report-primary-color, #163f2d);
            position: relative;
            overflow: hidden;
            padding: 20px 25px 40px;
            font-family: 'Poppins', sans-serif;
            color: #000;
        }

        .mot-report-page::before {
            content: "✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦";
            position: absolute;
            top: 6px;
            left: 0;
            width: 100%;
            text-align: center;
            color: var(--report-primary-color, #0d5c3f);
            letter-spacing: 6px;
            font-size: 14px;
        }

        /* Header */
        .mot-top-arabic {
            text-align: center;
            font-family: 'Cairo', sans-serif;
            font-size: 24px;
            color: var(--report-primary-color, #0d5c3f);
            font-weight: 700;
            margin-top: 5px;
        }

        .mot-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 5px;
        }

        .mot-school-left { width: 42%; }
        .mot-school-left h1 {
            color: #7a1408;
            font-size: 18px;
            line-height: 1.2;
            font-weight: 800;
            margin: 0;
        }
        .mot-school-left p {
            margin-top: 5px;
            font-size: 11px;
            line-height: 1.5;
            color: #444;
            margin-bottom: 0;
        }

        .mot-logo {
            width: 85px;
            height: 85px;
            border-radius: 50%;
            background: #f6f6f6;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }
        .mot-logo img { width: 100%; height: 100%; object-fit: contain; }

        .mot-school-right { width: 42%; text-align: right; font-family: 'Cairo', sans-serif; }
        .mot-school-right h2 { color: #7a1408; font-size: 21px; line-height: 1.4; margin: 0; }

        /* Ribbon */
        .mot-ribbon {
            width: 320px;
            margin: 12px auto;
            background: linear-gradient(to right, var(--report-primary-color, #0d5c3f), #15734f);
            color: #fff;
            text-align: center;
            padding: 10px;
            border-radius: 50px;
            font-size: 20px;
            font-weight: 700;
            box-shadow: 0 4px 10px rgba(0,0,0,.15);
            border: 3px solid var(--report-border-color, #d6b14c);
        }

        /* Info Section */
        .mot-info {
            border: 2px solid var(--report-border-color, #d6b14c);
            border-radius: 12px;
            padding: 10px 18px;
        }
        .mot-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .mot-field { display: flex; align-items: flex-end; gap: 8px; font-size: 13px; font-weight: 600; }
        .mot-line { border-bottom: 2px dotted #555; width: 150px; height: 18px; text-align: center; color: #111; font-weight: 700; }

        /* Rounded Table Container */
        .mot-table-wrap {
            margin-top: 12px;
            border: 2px solid var(--report-border-color, #d6b14c);
            border-radius: 10px;
            overflow: hidden;
        }

        .mot-main-table {
            width: 100%;
            border-collapse: collapse;
            border-style: hidden;
        }

        .mot-main-table th {
            background: var(--report-primary-color, #0d5c3f);
            color: #fff;
            padding: 8px 4px;
            border: 1px solid var(--report-border-color, #d6b14c);
            font-size: 12px;
        }

        .mot-main-table td {
            border: 1px solid var(--report-border-color, #d6b14c);
            padding: 7px 8px;
            height: 36px;
            font-size: 12px;
            text-align: center;
        }

        .mot-main-table .subhead th { background: #e8f3ec; color: var(--report-primary-color, #0d5c3f); font-weight: 700; }
        .mot-main-table .subject { font-weight: 700; text-align: left !important; }

        /* Grading */
        .mot-grading { margin-top: 12px; }
        .mot-grade-title { font-size: 14px; font-weight: 700; color: #7a1408; margin-bottom: 4px; }

        .mot-grade-wrap {
            border: 2px solid var(--report-border-color, #d6b14c);
            border-radius: 10px;
            overflow: hidden;
        }

        .mot-grade-table { width: 100%; border-collapse: collapse; border-style: hidden; }
        .mot-grade-table th { background: var(--report-border-color, #d6b14c); color: #000; padding: 6px; border: 1px solid #333; font-size: 11px; }
        .mot-grade-table td { border: 1px solid #333; text-align: center; padding: 6px; font-size: 11px; }

        /* Bottom Section */
        .mot-bottom { margin-top: 16px; }

        .mot-comment-row {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            margin-bottom: 12px;
        }
        .mot-comment-label { font-weight: 700; font-size: 13px; color: #111; white-space: nowrap; }
        .mot-comment-value {
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
        .mot-sig-label { font-weight: 700; font-size: 13px; color: #111; white-space: nowrap; }
        .mot-sig-line {
            width: 180px;
            border-bottom: 2px dotted #444;
            min-height: 22px;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: flex-end;
        }
        .mot-sig-line img {
            position: absolute;
            bottom: 0;
            height: 36px;
        }

        .mot-conduct-row {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            margin-bottom: 12px;
        }

        .mot-footer-stamp {
            display: flex;
            justify-content: flex-end;
            margin-top: 8px;
        }

        .mot-stamp {
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

        .mot-final-footer {
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
      <div className="mot-report-page">
        <div className="mot-top-arabic">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>

        <div className="mot-header">
          <div className="mot-school-left">
            <h1 data-testid="report-school-name">{branding.schoolName}</h1>
            <p>
              {branding.address}<br/>
              Tel: {branding.phone}<br/>
              {branding.email}
            </p>
          </div>

          <div className="mot-logo">
            <img src={branding.logoUrl} alt="Logo" data-testid="report-school-logo" />
          </div>

          <div className="mot-school-right">
            <h2>مدرسة جدة الإسلامية للروضة <br/> والإبتدائية بنساغو</h2>
          </div>
        </div>

        <div className="mot-ribbon">PROVISIONAL REPORT FORM – MIDTERM</div>

        <div className="mot-info">
          <div className="mot-info-row">
            <div className="mot-field">Class: <div className="mot-line">{className}</div></div>
            <div className="mot-field">Term: <div className="mot-line">{reportData?.term?.term_number ?? "--"}</div></div>
            <div className="mot-field">Year: <div className="mot-line" style={{width: '100px'}}>{reportData?.term?.academic_year ?? "--"}</div></div>
          </div>
          <div className="mot-info-row" style={{marginBottom: 0}}>
            <div className="mot-field" style={{width: '100%'}}>
              Pupil&apos;s Name: <div className="mot-line" style={{width: '100%'}}>{reportData?.student?.name}</div>
            </div>
          </div>
        </div>

        <div className="mot-table-wrap">
          <table className="mot-main-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{width: '22%'}}>SUBJECTS</th>
                <th colSpan={2}>BEGINNING OF TERM</th>
                <th colSpan={2}>MIDTERM</th>
                <th rowSpan={2} style={{width: '28%'}}>SUBJECT TEACHER&apos;S COMMENT</th>
              </tr>
              <tr className="subhead">
                <th>MARK</th><th>AGG</th><th>MARK</th><th>AGG</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.circular?.subjects?.map(renderSubjectRow)}
              <tr>
                <td className="subject" style={{textAlign: 'left', paddingLeft: '8px'}}>TOTAL</td>
                <td>{reportData?.circular?.bot_total ?? ""}</td>
                <td>{reportData?.circular?.bot_aggregate ?? ""}</td>
                <td>{reportData?.circular?.mot_total ?? ""}</td>
                <td>{reportData?.circular?.mot_aggregate ?? ""}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mot-grading" data-testid="report-grading-scale">
          <div className="mot-grade-title">Grading</div>
          <div className="mot-grade-wrap">
            <table className="mot-grade-table">
              <tbody>
                <tr>
                  <th>Grade</th>
                  {gradingBands.map((b) => (
                    <th key={b.grade}>{b.grade}</th>
                  ))}
                </tr>
                <tr>
                  <td><strong>Marks</strong></td>
                  {gradingBands.map((b) => (
                    <td key={b.grade}>{b.range}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mot-bottom">
          <div className="mot-conduct-row">
            <span className="mot-comment-label">Conduct:</span>
            <div className="mot-comment-value" style={{fontFamily: '"Caveat", cursive', fontSize: '18px'}}>{conductRemark}</div>
          </div>

          <div className="mot-comment-row">
            <span className="mot-comment-label">Class Teacher&apos;s Comment:</span>
            <div className="mot-comment-value">{teacherComment}</div>
            <span className="mot-sig-label">Signature:</span>
            <div className="mot-sig-line">
              {classTeacherSig && (
                <img src={classTeacherSig} alt="Class Teacher Signature" />
              )}
            </div>
          </div>

          <div className="mot-comment-row">
            <span className="mot-comment-label">Head Teacher&apos;s Comment:</span>
            <div className="mot-comment-value">{headComment}</div>
            <span className="mot-sig-label">Signature:</span>
            <div className="mot-sig-line">
              {headTeacherSig && (
                <img src={headTeacherSig} alt="Head Teacher Signature" />
              )}
            </div>
          </div>

          <div className="mot-footer-stamp">
            <div className="mot-stamp">OFFICIAL<br/>SCHOOL STAMP</div>
          </div>
        </div>

        <div className="mot-final-footer">
          THIS REPORT FORM IS INVALID WITHOUT THE OFFICIAL SCHOOL STAMP
        </div>
      </div>
    </ReportContainer>
  );
}
