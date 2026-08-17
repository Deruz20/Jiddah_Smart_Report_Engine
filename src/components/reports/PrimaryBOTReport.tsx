import {
  getClassTeacherComment,
  getHeadTeacherComment,
  getConductRemark,
  getTheologyComment,
} from "@/lib/grading";
import { ReportContainer } from "@/components/reports/shared/ReportContainer";
import { transliterateEnglishToArabic } from "@/lib/transliterate";

export default function PrimaryBOTReport({ reportData }: any) {
  const className =
    reportData?.class_name ||
    reportData?.class ||
    reportData?.student?.class_name ||
    "";

  const showTheologyPanel =
    reportData?.student?.class_name?.toLowerCase() !== "p.7" ||
    (reportData?.theology?.subjects &&
      reportData?.theology?.subjects.length > 0);

  const toAr = (val: number | string | null | undefined): string => {
    if (val == null) return "--";
    return String(val).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
  };

  const toHijri = (gregorianYear: number): number =>
    Math.round((gregorianYear - 622) * (33 / 32));

  const termInArabic = (n: number): string => {
    if (n === 1) return "الأولى";
    if (n === 2) return "الثاني";
    if (n === 3) return "الثالث";
    return String(n);
  };

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
      <td style={{ textAlign: "left", paddingLeft: "8px" }}>
        {subject.subject_name}
      </td>
      <td>{subject.mot_score ?? "--"}</td>
      <td>{subject.mot_grade_display ?? "--"}</td>
      <td>{subject.eot_score ?? "--"}</td>
      <td>{subject.eot_grade_display ?? "--"}</td>
      <td style={{ textAlign: "left", paddingLeft: "8px" }}>
        {subject.remark ?? ""}
      </td>
    </tr>
  );

  const arabicSubjects = [
    "القرآن الكريم",
    "اللغة العربية",
    "الفقه الإسلامي",
    "التربية الإسلامية",
  ];

  return (
    <ReportContainer reportType="PrimaryBOTReport">
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
            background: var(--bg-cream);
            padding: 20px 30px;
            display: flex;
            flex-direction: column;
            overflow: hidden; 
            position: relative;
            border: 4px double var(--primary-green);
            font-family: 'Poppins', sans-serif;
            color: var(--text-dark);
        }

        /* HEADER */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 90px;
            margin-bottom: 8px;
        }

        .school-left { width: 32%; }
        .school-left h1 {
            margin: 0;
            font-size: 18px;
            color: var(--deep-maroon);
            font-weight: 800;
            line-height: 1.1;
        }
        .school-left p { margin: 1px 0; font-size: 10px; font-weight: 500; color: #444; }

        .header-center { width: 36%; text-align: center; }
        .bismillah { font-family: 'Amiri', serif; font-size: 24px; color: var(--primary-green); margin-bottom: 2px; }
        .report-badge {
            background: var(--primary-green);
            color: white;
            padding: 4px 20px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 15px;
            display: inline-block;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .header-right { width: 32%; text-align: right; direction: rtl; }
        .header-right h2 { margin: 0; font-family: 'Amiri', serif; font-size: 22px; color: var(--deep-maroon); line-height: 1.1; }

        /* INFO BOXES */
        .info-container {
            display: flex;
            gap: 15px;
            height: 85px;
            margin-bottom: 10px;
        }
        .info-box {
            flex: 1;
            background: white;
            border: 1px solid var(--border-light);
            border-radius: 8px;
            padding: 8px 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .info-row { display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 3px; }
        .label { font-weight: 700; color: #1a1a1a; white-space: nowrap; }
        .line { flex: 1; border-bottom: 1px dotted #999; height: 14px; min-width: 0; overflow: hidden; white-space: nowrap; font-weight: 600; padding: 0 4px; }

        /* MAIN PERFORMANCE TABLES */
        .main-performance {
            display: flex;
            gap: 20px;
            flex: 1;
        }
        .col-academic, .col-theology { width: 50%; display: flex; flex-direction: column; }

        .report-page table { width: 100%; border-collapse: collapse; background: white; table-layout: fixed; }
        .report-page th { background: var(--primary-green); color: white; font-size: 10px; padding: 4px 2px; border: 1px solid rgba(255,255,255,0.2); }
        .table-banner { background: var(--accent-gold); font-size: 12px; font-weight: 700; padding: 4px; text-align: center; color: white; }
        .report-page td { border: 1px solid #ddd; height: 24px; text-align: center; font-size: 11px; font-weight: 500; }

        .grading-key { margin-top: 6px; }
        .grading-key th { background: #555; font-size: 9px; padding: 2px; }
        .grading-key td { font-size: 9px; height: 16px; font-weight: 700; }

        /* THEOLOGY SPECIFICS (RTL) */
        .col-theology { direction: rtl; }
        .col-theology th, .col-theology td { font-family: 'Amiri', serif; font-size: 14px; }
        .th-sub { background: #f4f4f4; color: var(--primary-green) !important; height: 20px; font-size: 11px; font-weight: 700; border: 1px solid #ddd !important; }
        
        .theology-footer { display: flex; gap: 10px; margin-top: 8px; }
        .t-box { 
            flex: 1; border: 1px solid var(--border-light); border-radius: 4px; padding: 5px; 
            background: white; font-family: 'Amiri', serif; min-height: 38px; font-size: 13px;
        }

        /* FOOTER AREA */
        .footer {
            height: 165px;
            margin-top: 10px;
            display: flex;
            gap: 20px;
            align-items: flex-end;
        }

        .footer-left { flex: 1; }

        .comment-section {
            border: 1.5px dashed var(--primary-green);
            border-radius: 10px;
            padding: 10px 15px;
            background: rgba(255,255,255,0.5);
        }
        .comment-row { display: flex; gap: 15px; margin-bottom: 5px; align-items: center; }
        .c-field { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .c-field span { font-size: 11px; font-weight: 700; white-space: nowrap; }

        .dates-bar {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            gap: 12px;
        }
        .date-chip {
            flex: 1;
            padding: 6px;
            border-radius: 6px;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            border: 1px solid #ddd;
        }
        .ends { background: #fff0f0; color: var(--deep-maroon); border-color: #ffdada; }
        .begins { background: #eef3ff; color: #1d4ed8; border-color: #dbe4ff; }

        .stamp-box {
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
        }

        .validity-strip {
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
        `,
        }}
      />
      <div className="report-page">
        <header className="header">
          <div className="school-left">
            <h1>
              JIDDAH ISLAMIC NURSERY
              <br />
              AND PRIMARY SCHOOL - Nsaggu
            </h1>
            <p>P.O.Box 34008 Kampala (U)</p>
            <p>Tel: +256 744950042 / 0705316961</p>
          </div>

          <div className="header-center">
            <div className="bismillah">
              بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
            </div>
            <div className="report-badge">
              UPPER REPORT FORM - BEGINNING OF TERM
            </div>
          </div>

          <div className="header-right">
            <h2>مدرسة جدة الإسلامية للروضة والابتدائية بنساغو</h2>
          </div>
        </header>

        <section className="info-container">
          <div
            className="info-box"
            style={{ width: showTheologyPanel ? "70%" : "100%" }}
          >
            <div className="info-row">
              <span className="label">Pupil's Name:</span>
              <div className="line">{reportData?.student?.name}</div>
            </div>
            <div className="info-row">
              <span className="label">Class:</span>
              <div className="line">{className}</div>
              <span className="label">Term:</span>
              <div className="line">
                Term {reportData?.term?.term_number ?? "--"}
              </div>
              <span className="label">Year:</span>
              <div className="line" style={{ flex: 0.4 }}>
                {reportData?.term?.academic_year ?? "--"}
              </div>
            </div>
            <div className="info-row">
              <span className="label">Position:</span>
              <div className="line">
                {reportData?.circular?.position ?? "--"}
              </div>
              <span className="label">Out Of:</span>
              <div className="line">
                {reportData?.circular?.total_students ?? "--"}
              </div>
              <span className="label">Division:</span>
              <div className="line" style={{ flex: 0.4 }}>
                {reportData?.circular?.division ?? "--"}
              </div>
            </div>
          </div>

          {showTheologyPanel && (
            <div className="info-box" dir="rtl" style={{ width: "30%" }}>
              <div className="info-row">
                <span className="label">اسم التلميذ/ة :</span>
                <div className="line">
                  {reportData?.student?.arabic_name ||
                    transliterateEnglishToArabic(
                      reportData?.student?.name || "",
                    )}
                </div>
              </div>
              <div className="info-row">
                <span className="label">الفصل :</span>
                <div className="line">
                  {reportData?.student?.theology_class_arabic ??
                    reportData?.student?.class_name}
                </div>
                <span className="label">الفترة :</span>
                <div className="line">
                  {toAr(reportData?.term?.term_number)}
                </div>
                <span className="label">عام :</span>
                <div className="line" style={{ flex: 0.5 }}>
                  {toAr(toHijri(reportData?.term?.academic_year || 2024))}
                </div>
                <span className="label">هـ</span>
                <div className="line" style={{ flex: 0.5 }}>
                  {toAr(reportData?.term?.academic_year)}
                </div>
                <span className="label">م</span>
              </div>
              <div className="info-row">
                <span className="label">الترتيب :</span>
                <div className="line">
                  {toAr(reportData?.theology?.position)}
                </div>
                <span className="label">عدد الطلبة :</span>
                <div className="line">
                  {toAr(reportData?.theology?.total_students)}
                </div>
              </div>
            </div>
          )}
        </section>

        <main className="main-performance">
          <div
            className="col-academic"
            style={!showTheologyPanel ? { width: "100%" } : {}}
          >
            <table>
              <thead>
                <tr>
                  <th colSpan={6} className="table-banner">
                    COMPARATIVE PERFORMANCE
                  </th>
                </tr>
                <tr>
                  <th rowSpan={2} style={{ width: "28%" }}>
                    SUBJECTS
                  </th>
                  <th colSpan={2}>MIDTERM</th>
                  <th colSpan={2}>END OF TERM</th>
                  <th rowSpan={2}>TEACHER'S REMARKS</th>
                </tr>
                <tr>
                  <th style={{ width: "12%" }}>MARK</th>
                  <th style={{ width: "10%" }}>AGG</th>
                  <th style={{ width: "12%" }}>MARK</th>
                  <th style={{ width: "10%" }}>AGG</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.circular?.subjects?.map(renderSubjectRow)}
                <tr style={{ background: "#f9f9f9", fontWeight: 800 }}>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>
                    TOTAL
                  </td>
                  <td>{reportData?.circular?.mot_total_score ?? "--"}</td>
                  <td>{reportData?.circular?.mot_total_aggregates ?? "--"}</td>
                  <td>{reportData?.circular?.eot_total_score ?? "--"}</td>
                  <td>{reportData?.circular?.eot_total_aggregates ?? "--"}</td>
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

          {showTheologyPanel && (
            <div className="col-theology">
              <table>
                <thead>
                  <tr>
                    <th colSpan={6} className="table-banner">
                      نتائج المواد الشرعية
                    </th>
                  </tr>
                  <tr>
                    <th rowSpan={2} style={{ width: "28%" }}>
                      المواد
                    </th>
                    <th colSpan={2}>منتصف الفترة</th>
                    <th colSpan={2}>نهاية الفترة</th>
                    <th rowSpan={2}>الملاحظات</th>
                  </tr>
                  <tr>
                    <th className="th-sub">الدرجة الكبرى</th>
                    <th className="th-sub">الدرجة الصغرى</th>
                    <th className="th-sub">الدرجة الكبرى</th>
                    <th className="th-sub">الدرجة الصغرى</th>
                  </tr>
                </thead>
                <tbody>
                  {arabicSubjects.map((arabicName) => {
                    const subject = reportData?.theology?.subjects?.find(
                      (s: any) => {
                        const dbName =
                          s.subject_name_arabic === "التاريخ والسيرة"
                            ? "التربية"
                            : s.subject_name_arabic || "";
                        return (
                          arabicName.includes(dbName) ||
                          dbName.includes(arabicName.split(" ")[0])
                        );
                      },
                    );
                    return (
                      <tr key={arabicName}>
                        <td style={{ textAlign: "right", paddingRight: "8px" }}>
                          {arabicName}
                        </td>
                        <td>{toAr(subject?.mot_score)}</td>
                        <td>{toAr(100)}</td>
                        <td>{toAr(subject?.eot_score)}</td>
                        <td>{toAr(100)}</td>
                        <td style={{ textAlign: "right", paddingRight: "8px" }}>
                          {subject?.theology_remark ?? ""}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: "#f9f9f9", fontWeight: 800 }}>
                    <td style={{ textAlign: "right", paddingRight: "8px" }}>
                      المجموع
                    </td>
                    <td>{toAr(reportData?.theology?.mot_total_score)}</td>
                    <td>
                      {toAr(
                        reportData?.theology?.subjects?.length
                          ? reportData.theology.subjects.length * 100
                          : 400,
                      )}
                    </td>
                    <td>{toAr(reportData?.theology?.total)}</td>
                    <td>
                      {toAr(
                        reportData?.theology?.subjects?.length
                          ? reportData.theology.subjects.length * 100
                          : 400,
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
              <div className="theology-footer">
                <div className="t-box">
                  ملاحظة مشرف الفصل:
                  <span
                    style={{
                      fontStyle: "italic",
                      color: "#555",
                      marginRight: "8px",
                    }}
                  >
                    {getTheologyComment(reportData?.theology?.total ?? null)}
                  </span>
                </div>
                <div className="t-box" style={{ flex: 0.8, display: "flex" }}>
                  <span style={{ whiteSpace: "nowrap" }}>التوقيع والختم:</span>
                  <div
                    className="line"
                    style={{
                      borderBottom: "1.5px dashed #cbd5e1",
                      margin: "0 8px",
                      flex: 1,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <div className="footer-left">
            <div className="comment-section">
              <div className="comment-row">
                <div className="c-field">
                  <span>Conduct:</span>
                  <div className="line" style={{ fontStyle: "italic" }}>
                    {conductRemark}
                  </div>
                </div>
              </div>
              <div className="comment-row">
                <div className="c-field">
                  <span>Class Teacher's Comment:</span>
                  <div className="line" style={{ fontStyle: "italic" }}>
                    {teacherComment}
                  </div>
                </div>
                <div className="c-field" style={{ flex: 0.4 }}>
                  <span>Signature:</span>
                  <div className="line"></div>
                </div>
              </div>
              <div className="comment-row">
                <div className="c-field">
                  <span>Head Teacher's Comment:</span>
                  <div className="line" style={{ fontStyle: "italic" }}>
                    {headComment}
                  </div>
                </div>
                <div className="c-field" style={{ flex: 0.4 }}>
                  <span>Signature:</span>
                  <div className="line"></div>
                </div>
              </div>
            </div>

            <div className="dates-bar">
              <div className="date-chip ends">
                This Term Ends On:{" "}
                {reportData?.term?.end_date || "________________"}
              </div>
              <div className="date-chip begins">
                Next Term Begins On:{" "}
                {reportData?.term?.next_term_start_date || "________________"}
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
    </ReportContainer>
  );
}
