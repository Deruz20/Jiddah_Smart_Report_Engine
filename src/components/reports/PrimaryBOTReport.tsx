import {
  getClassTeacherComment,
  getHeadTeacherComment,
  getConductRemark,
} from "@/lib/grading";
import { ReportContainer } from "@/components/reports/shared/ReportContainer";
import { CleanSignatureImage } from "@/components/reports/CleanSignatureImage";
import { OfficialReportStamp } from "@/components/reports/StampGenerator";
import { resolveReportBranding, resolveReportGradingBands } from "@/lib/school-settings-helper";
import { getClassTeacherSignatureKey } from "@/utils/signatures";
import { useStudioFormatting, resolveEffectiveStudioStyle } from "@/lib/studio-config-store";
import { NurseryEducativeWatermark } from "@/components/reports/NurseryEducativeWatermark";

export default function PrimaryBOTReport({ reportData, studioFormatting: studioFormattingProp }: any) {
  const studioFormatting = useStudioFormatting(studioFormattingProp, reportData?.settings?.report_studio_config);
  const effective = resolveEffectiveStudioStyle(studioFormatting, reportData, 'primary-bot');
  const effectiveStudioPass = { ...studioFormatting, ...effective, stampInkColor: effective.stampColor };
  const branding = resolveReportBranding(reportData);
  const gradingBands = resolveReportGradingBands(reportData);

  const className =
    reportData?.class_name ||
    reportData?.class ||
    reportData?.student?.class_name ||
    "";

  const printPrefs = reportData?.settings?.print_preferences;
  const includeSignatures =
    effective.showSignatures &&
    (printPrefs?.includeSignatures !== undefined ? Boolean(printPrefs.includeSignatures) : true);
  const includeStamp =
    effective.showStamp &&
    (printPrefs?.includeStamp !== undefined ? Boolean(printPrefs.includeStamp) : true);

  const teacherComment =
    reportData?.circular?.class_teacher_comment ??
    getClassTeacherComment(reportData?.circular?.division ?? null, undefined, reportData?.settings?.grading_scale, reportData?.settings?.division_boundaries);
  const headComment =
    reportData?.circular?.head_teacher_comment ??
    getHeadTeacherComment(reportData?.circular?.division ?? null, undefined, reportData?.settings?.grading_scale, reportData?.settings?.division_boundaries);
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
      <td className="subject" style={{ textAlign: 'left', paddingLeft: '8px', fontWeight: effective.headingFontWeight }}>{subject.subject_name}</td>
      <td style={{ fontWeight: effective.scoreFontWeight }}>{subject.bot_score ?? ""}</td>
      <td style={{ fontWeight: effective.scoreFontWeight }}>{subject.bot_grade_display ?? subject.bot_agg ?? ""}</td>
      <td style={{ textAlign: "left", paddingLeft: "8px", fontFamily: '"Caveat", cursive', fontSize: '1.2em' }}>
        {subject.remark ?? ""}
      </td>
    </tr>
  );

  return (
    <ReportContainer
      reportType="PrimaryBOTReport"
      primaryFont={branding.primaryFont}
      arabicFont={branding.arabicFont}
      themePreset={branding.themePreset}
      themeColor={effective.primaryColor}
    >
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
            --report-primary-color: ${effective.primaryColor};
            --report-secondary-color: ${effective.secondaryColor};
            --report-border-color: ${effective.secondaryColor};
            width: 100%;
            height: 100%;
            background: #fffef8;
            border: 4px solid ${effective.primaryColor};
            position: relative;
            overflow: hidden;
            padding: 20px 25px 40px;
            font-family: ${effective.fontFamilyCss} !important;
            --report-font-scale: ${effective.fontScaleMultiplier};
            font-size: calc(100% * var(--report-font-scale, 1));
            color: #000;
        }

        .bot-report-page::before {
            content: "✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦";
            position: absolute;
            top: 6px;
            left: 0;
            width: 100%;
            text-align: center;
            color: ${effective.primaryColor};
            letter-spacing: 6px;
            font-size: 14px;
        }

        .bot-top-arabic {
            text-align: center;
            font-family: 'Cairo', sans-serif;
            font-size: 24px;
            color: ${effective.primaryColor};
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
            color: ${effective.headerAccentColor};
            font-size: 21px;
            line-height: 1.15;
            letter-spacing: -0.3px;
            font-weight: 900;
            margin: 0;
        }
        .bot-school-left p {
            margin-top: 5px;
            font-size: 11.5px;
            font-weight: 600;
            line-height: 1.45;
            color: #444;
            margin-bottom: 0;
        }

        .bot-logo {
            width: 95px;
            height: 95px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: transparent;
        }
        .bot-logo img { width: 100%; height: 100%; object-fit: contain; }

        .bot-school-right { width: 42%; text-align: right; font-family: 'Cairo', sans-serif; }
        .bot-school-right h2 { color: ${effective.headerAccentColor}; font-size: 24px; font-weight: 900; line-height: 1.25; margin: 0; }

        .bot-ribbon {
            width: 360px;
            margin: 12px auto;
            background: linear-gradient(to right, ${effective.primaryColor}, ${effective.headerAccentColor});
            color: #fff;
            text-align: center;
            padding: 10px;
            border-radius: 50px;
            font-size: 20px;
            font-weight: 700;
            box-shadow: 0 4px 10px rgba(0,0,0,.15);
            border: 3px solid ${effective.secondaryColor};
        }

        .bot-info {
            border: 2px solid ${effective.secondaryColor};
            border-radius: 12px;
            padding: 10px 18px;
        }
        .bot-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .bot-field { display: flex; align-items: baseline; gap: 8px; font-size: 14px; font-weight: 700; color: #111827; }
        .bot-line { border-bottom: 2px solid ${effective.primaryColor}; min-height: 22px; text-align: center; color: ${effective.primaryColor}; font-weight: 900; font-size: 16px; display: inline-flex; align-items: center; justify-content: center; }

        .bot-table-wrap {
            margin-top: 12px;
            border: 2px solid ${effective.secondaryColor};
            border-radius: 10px;
            overflow: hidden;
        }

        .bot-main-table {
            width: 100%;
            border-collapse: collapse;
            border-style: hidden;
        }

        .bot-main-table th {
            background: ${effective.primaryColor};
            color: #fff;
            padding: 8px 4px;
            border: 1px solid ${effective.secondaryColor};
            font-size: 12px;
        }

        .bot-main-table td {
            border: 1px solid ${effective.secondaryColor};
            padding: ${effective.densityPadding};
            height: 36px;
            font-size: 12px;
            text-align: center;
        }

        .bot-main-table .subhead th { background: #e8f3ec; color: ${effective.primaryColor}; font-weight: 700; }
        .bot-main-table .subject { font-weight: ${effective.headingFontWeight}; text-align: left !important; }

        .bot-grading { margin-top: 12px; }
        .bot-grade-title { font-size: 14px; font-weight: 700; color: ${effective.headerAccentColor}; margin-bottom: 4px; }

        .bot-grade-wrap {
            border: 2px solid ${effective.secondaryColor};
            border-radius: 10px;
            overflow: hidden;
        }

        .bot-grade-table { width: 100%; border-collapse: collapse; border-style: hidden; }
        .bot-grade-table th { background: ${effective.secondaryColor}; color: #000; padding: 6px; border: 1px solid #333; font-size: 11px; }
        .bot-grade-table td { border: 1px solid #333; text-align: center; padding: 6px; font-size: 11px; }

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
            font-size: ${effective.commentFontSizePx + 2}px;
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
            width: 148px;
            height: 92px;
            border: none;
            display: flex;
            justify-content: center;
            align-items: center;
            background: transparent;
        }

        .bot-final-footer {
            position: absolute;
            bottom: 14px;
            left: 0;
            width: 100%;
            text-align: center;
            font-size: 12px;
            color: ${effective.headerAccentColor};
            font-weight: 700;
        }
        `,
        }}
      />
      <div className="bot-report-page">
        <NurseryEducativeWatermark
          templateId="primary-bot"
          logoUrl={branding.logoUrl || "/logo-512h.png"}
          studioFormatting={effectiveStudioPass}
          includeEducativeArt={false}
        />
        <div className="bot-top-arabic">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>

        <div className="bot-header">
          <div className="bot-school-left">
            <h1 data-testid="report-school-name">{effective.schoolHeader.nameEnglish}</h1>
            <p>
              {effective.schoolHeader.address}<br />
              Tel: {effective.schoolHeader.phone}<br />
              {effective.schoolHeader.email}
            </p>
          </div>

          <div className="bot-logo">
            <img
              src={branding.logoUrl || "/school_logo.svg"}
              alt="Logo"
              data-testid="report-school-logo"
              onError={(e) => {
                if (!e.currentTarget.src.endsWith("/school_logo.svg")) {
                  e.currentTarget.src = "/school_logo.svg";
                }
              }}
            />
          </div>

          <div className="bot-school-right">
            <h2>{effective.schoolHeader.nameArabic}</h2>
          </div>
        </div>

        <div className="bot-ribbon">PROVISIONAL REPORT FORM – BEGINNING OF TERM</div>

        <div className="bot-info">
          <div className="bot-info-row">
            <div className="bot-field" style={{ flex: 1.2 }}>
              Class: <div className="bot-line" style={{ fontWeight: 800, fontSize: '14.5px', textAlign: 'center', color: '#0F172A' }}>{className}</div>
            </div>
            <div className="bot-field" style={{ flex: 1 }}>
              Term: <div className="bot-line" style={{ fontWeight: 800, fontSize: '14.5px', textAlign: 'center', color: '#0F172A' }}>{reportData?.term?.term_number ?? "--"}</div>
            </div>
            <div className="bot-field" style={{ flex: 1 }}>
              Year: <div className="bot-line" style={{ fontWeight: 800, fontSize: '14.5px', textAlign: 'center', color: '#0F172A' }}>{reportData?.term?.academic_year ?? "--"}</div>
            </div>
            <div className="bot-field" style={{ flex: 1 }}>
              AGG: <div className="bot-line" style={{ fontWeight: 900, fontSize: '14.5px', textAlign: 'center', color: '#0F172A' }}>{reportData?.circular?.bot_aggregate ?? reportData?.circular?.aggregate ?? reportData?.total_aggregates ?? "_________"}</div>
            </div>
            <div className="bot-field" style={{ flex: 1 }}>
              DIV: <div className="bot-line" style={{ fontWeight: 900, fontSize: '14.5px', textAlign: 'center', color: '#b10000' }}>{reportData?.circular?.division || reportData?.student?.division || "_________"}</div>
            </div>
          </div>
          <div className="bot-info-row" style={{ marginBottom: 0 }}>
            <div className="bot-field" style={{ width: '100%' }}>
              Pupil&apos;s Name: <div className="bot-line" style={{ width: '100%', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.5px', color: '#0F172A' }}>{reportData?.student?.name}</div>
            </div>
          </div>
        </div>

        <div className="bot-table-wrap">
          <table className="bot-main-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: '25%' }}>SUBJECTS</th>
                <th colSpan={2}>BEGINNING OF TERM</th>
                <th rowSpan={2} style={{ width: '35%' }}>SUBJECT TEACHER&apos;S COMMENT</th>
              </tr>
              <tr className="subhead">
                <th>MARK</th><th>AGG</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.circular?.subjects?.map(renderSubjectRow)}
              <tr>
                <td className="subject" style={{ textAlign: 'left', paddingLeft: '8px' }}>TOTAL</td>
                <td>{reportData?.circular?.bot_total ?? ""}</td>
                <td>{reportData?.circular?.bot_aggregate ?? ""}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bot-grading" data-testid="report-grading-scale">
          <div className="bot-grade-title">Grading</div>
          <div className="bot-grade-wrap">
            <table className="bot-grade-table">
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

        <div className="bot-bottom">
          <div className="bot-conduct-row">
            <span className="bot-comment-label">Conduct:</span>
            <div className="bot-comment-value" style={{ fontFamily: '"Caveat", cursive', fontSize: '18px' }}>{conductRemark}</div>
          </div>

          <div className="bot-comment-row">
            <span className="bot-comment-label">Class Teacher&apos;s Comment:</span>
            <div className="bot-comment-value">{teacherComment}</div>
            <span className="bot-sig-label">Signature:</span>
            <div className="bot-sig-line" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '36px', minWidth: '120px', borderBottom: '1.5px dotted #334155' }}>
              {includeSignatures && classTeacherSig && (
                <CleanSignatureImage src={classTeacherSig} alt="Class Teacher Signature" style={{ height: '36px', width: '112px', objectFit: 'contain', marginBottom: '-6px' }} studioFormatting={effectiveStudioPass} />
              )}
            </div>
          </div>

          <div className="bot-comment-row">
            <span className="bot-comment-label">Head Teacher&apos;s Comment:</span>
            <div className="bot-comment-value">{headComment}</div>
            <span className="bot-sig-label">Signature:</span>
            <div className="bot-sig-line" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '36px', minWidth: '120px', borderBottom: '1.5px dotted #334155' }}>
              {includeSignatures && headTeacherSig && (
                <CleanSignatureImage src={headTeacherSig} alt="Head Teacher Signature" style={{ height: '36px', width: '112px', objectFit: 'contain', marginBottom: '-6px' }} studioFormatting={effectiveStudioPass} />
              )}
            </div>
          </div>

          <div className="bot-footer-stamp">
            <div className="bot-stamp" style={{ width: '135px', height: '64px', minWidth: '135px', minHeight: '64px', position: 'relative', overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {includeStamp ? (
                <OfficialReportStamp reportData={reportData} studioFormatting={effectiveStudioPass} maxWidth={135} maxHeight={64} />
              ) : null}
            </div>
          </div>
        </div>

        <div className="bot-final-footer">
          THIS REPORT FORM IS INVALID WITHOUT THE OFFICIAL SCHOOL STAMP
        </div>
      </div>
    </ReportContainer>
  );
}
