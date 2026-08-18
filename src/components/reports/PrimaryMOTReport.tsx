import {
  getClassTeacherComment,
  getHeadTeacherComment,
  getConductRemark,
  getTheologyComment,
} from "@/lib/grading";
import { ReportContainer } from "@/components/reports/shared/ReportContainer";
import { formatDateWithOrdinal } from "@/utils/dateHelpers";
import { transliterateEnglishToArabic } from "@/lib/transliterate";

export default function PrimaryMOTReport({ reportData }: any) {
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
      <td style={{ textAlign: "left", paddingLeft: "4px", fontWeight: 800 }}>
        {subject.subject_name}
      </td>
      <td>{subject.bot_score ?? ""}</td>
      <td>{subject.bot_grade_display ?? ""}</td>
      <td>{subject.mot_score ?? ""}</td>
      <td>{subject.mot_grade_display ?? ""}</td>
      <td>{subject.eot_score ?? ""}</td>
      <td>{subject.eot_grade_display ?? ""}</td>
      <td style={{ textAlign: "left", paddingLeft: "4px" }}>
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
    <ReportContainer reportType="PrimaryMOTReport">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700;800;900&display=swap');

        .report-page,
        .report-page * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .report-page {
            --primary-green: #15803d;
            --dark-maroon: #881337;
            --red-star: #dc2626;
            
            width: 100%;
            height: 100%;
            background: #ffffff;
            padding: 20px;
            display: flex;
            flex-direction: column;
            position: relative;
            font-family: 'Inter', sans-serif;
            color: #000;
            
            /* Decorative border using repeating linear gradient or svg */
            /* Premium Frame Border */
            border: 6px double var(--dark-maroon);
            outline: 2px solid var(--primary-green);
            outline-offset: 2px;
            margin: 4px; /* Space for outline */
        }

        /* HEADER */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }

        .school-left { width: 35%; }
        .school-left h1 {
            margin: 0;
            font-size: 21px;
            color: var(--dark-maroon);
            font-weight: 900;
            line-height: 1.1;
            letter-spacing: -0.5px;
        }
        .school-left h1 span.red-text { color: var(--red-star); }
        .school-left p { margin: 2px 0; font-size: 11px; font-weight: 700; color: #000; letter-spacing: -0.2px; }

        .header-center { width: 30%; display: flex; flex-direction: column; align-items: center; position: relative; top: -10px;}
        .bismillah { font-family: 'Amiri', serif; font-size: 28px; color: #22c55e; margin-bottom: 2px; }
        .logo { width: 70px; height: 70px; margin-bottom: 6px; }
        .logo img { width: 100%; height: 100%; object-fit: contain; }
        .report-badge {
            border: 2px solid #22c55e;
            padding: 4px 12px;
            font-weight: 800;
            font-size: 14px;
            color: #000;
        }

        .header-right { width: 35%; text-align: right; direction: rtl; }
        .header-right h2 { margin: 0; font-family: 'Amiri', serif; font-size: 24px; color: var(--dark-maroon); line-height: 1.2; font-weight: 700; }

        /* PUPIL INFO */
        .pupil-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
        }
        .info-col-left { flex: 1; }
        .info-col-right { flex: 1; text-align: right; direction: rtl; font-family: 'Amiri', serif; font-size: 16px; font-weight: 700; }
        
        .info-row { display: flex; align-items: flex-end; margin-bottom: 8px; gap: 4px;}
        .info-row .label { font-weight: 500; color: #000; white-space: nowrap; }
        .info-row .line { 
            border-bottom: 2px solid #22c55e; 
            flex: 1; 
            min-width: 20px; 
            text-align: center; 
            font-weight: 800;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            padding: 0 4px;
        }

        /* TABLES */
        .tables-section {
            display: flex;
            gap: 12px;
            flex: 1;
        }
        .academic-table { flex: 1.3; display: flex; flex-direction: column; }
        .theology-table { flex: 1; display: flex; flex-direction: column; direction: rtl; }

        table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 3px solid var(--primary-green); }
        th, td { border: 2px solid var(--primary-green); text-align: center; font-size: 12px; }
        th { font-weight: 800; padding: 4px 2px; }
        td { height: 20px; font-weight: 600; }
        
        .table-title { background: var(--primary-green); color: white; font-size: 14px; letter-spacing: 1px; padding: 4px; }
        
        .academic-table th { background: #f0fdf4; color: #000; font-size: 11px; }
        .academic-table .table-title { color: white; }

        .theology-table table { height: 100%; }
          .theology-table th { font-family: 'Amiri', serif; font-size: 15px; background: #f0fdf4; color: #000; }
        .theology-table td { font-family: 'Amiri', serif; font-size: 16px; }
        .theology-table .table-title { color: white; font-size: 18px; }

        /* GRADING KEY */
        .grading-key { margin-top: 4px; border: 2px solid #dc2626; }
        .grading-key th { background: #fee2e2; color: #000; border: 1px solid #dc2626; font-size: 10px; }
        .grading-key td { border: 1px solid #dc2626; font-size: 10px; font-weight: 800; height: 18px; }
        .grading-key .grade-row th { color: #dc2626; }

        .theology-comment { margin-top: 12px; font-family: 'Amiri', serif; font-size: 16px; font-weight: 700; display: flex; align-items: baseline; gap: 8px;}
        .theology-comment .line { border-bottom: 2px dotted #000; flex: 1; font-style: italic; font-weight: 400;}

        /* FOOTER */
        .footer {
            margin-top: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .comment-row { display: flex; align-items: flex-end; gap: 8px; font-size: 12px; font-weight: 700; }
        .comment-row .line { border-bottom: 2px dotted #000; flex: 1; min-width: 50px; text-align: left; padding-left: 8px; font-style: italic; font-weight: 600; font-family: 'Indie Flower', 'Comic Sans MS', cursive; color: #1e293b; }

        .dates-row {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 12px;
            font-weight: 800;
        }
        .dates-row .label { color: #dc2626; }
        .dates-row .date { color: #1e40af; border-bottom: 1px solid #1e40af; }
        
        .validity-text {
            text-align: right;
            color: #1e40af;
            font-size: 11px;
            font-weight: 600;
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
              <span className="red-text">AND PRIMARY SCHOOL - Nsaggu</span>
            </h1>
            <p>
              P.O.Box 34008,Kampala(U)
              Email:jiddahislamicnurseryandpri@gmail.com
            </p>
            <p>Telephone: +256 (0)744950042 / +256 (0)705316961</p>
          </div>

          <div className="header-center">
            <div className="bismillah">
              بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
            </div>
            <div className="logo">
              <img src="/school_budge.jpeg" alt="Logo" />
            </div>
            <div className="report-badge">LOWER REPORT FORM</div>
          </div>

          <div className="header-right">
            <h2>
              مدرسة جدة الإسلامية للروضة
              <br />
              والابتدائية بنساغو
            </h2>
          </div>
        </header>

        <section className="pupil-info">
          <div className="info-col-left">
            <div className="info-row">
              <span className="label">Pupil's Name:</span>
              <div className="line" style={{ flex: 1 }}>
                {reportData?.student?.name}
              </div>
            </div>
            <div className="info-row">
              <span className="label">Year:</span>
              <div className="line">
                {reportData?.term?.academic_year ?? "--"}
              </div>
              <span className="label">Term:</span>
              <div className="line">
                {reportData?.term?.term_number ?? "--"}
              </div>
              <span className="label">Class:</span>
              <div className="line">{className}</div>
            </div>
            <div className="info-row">
              <span className="label">Position:</span>
              <div className="line">
                {reportData?.circular?.position ?? "--"}
              </div>
              <span className="label">Out of:</span>
              <div className="line">
                {reportData?.circular?.total_students ?? "--"}
              </div>
              <span className="label">Division:</span>
              <div className="line">
                {reportData?.circular?.division ?? "--"}
              </div>
            </div>
          </div>

          {showTheologyPanel && (
            <div className="info-col-right" style={{ paddingRight: "20px" }}>
              <div className="info-row">
                <span className="label">اسم التلميذ/ة:</span>
                <div
                  className="line"
                  style={{
                    borderBottomColor: "#000",
                    borderBottomStyle: "dotted",
                  }}
                >
                  {reportData?.student?.arabic_name ||
                    transliterateEnglishToArabic(
                      reportData?.student?.name || "",
                    )}
                </div>
              </div>
              <div className="info-row">
                <span className="label">الفصل:</span>
                <div
                  className="line"
                  style={{
                    borderBottomColor: "#000",
                    borderBottomStyle: "dotted",
                  }}
                >
                  {reportData?.student?.theology_class_arabic ??
                    reportData?.student?.class_name}
                </div>
                <span className="label">الفترة:</span>
                <div
                  className="line"
                  style={{
                    borderBottomColor: "#000",
                    borderBottomStyle: "dotted",
                  }}
                >
                  {toAr(reportData?.term?.term_number)}
                </div>
                <span className="label">عام:</span>
                <div
                  className="line"
                  style={{
                    flex: 0.5,
                    borderBottomColor: "#000",
                    borderBottomStyle: "dotted",
                  }}
                >
                  {toAr(toHijri(reportData?.term?.academic_year || 2024))}
                </div>
                <span className="label">هـ</span>
                <div
                  className="line"
                  style={{
                    flex: 0.5,
                    borderBottomColor: "#000",
                    borderBottomStyle: "dotted",
                  }}
                >
                  {toAr(reportData?.term?.academic_year)}
                </div>
                <span className="label">م</span>
              </div>
              <div className="info-row">
                <span className="label">الترتيب:</span>
                <div
                  className="line"
                  style={{
                    borderBottomColor: "#000",
                    borderBottomStyle: "dotted",
                  }}
                >
                  {toAr(reportData?.theology?.position)}
                </div>
                <span className="label">عددالطلبة:</span>
                <div
                  className="line"
                  style={{
                    borderBottomColor: "#000",
                    borderBottomStyle: "dotted",
                  }}
                >
                  {toAr(reportData?.theology?.total_students)}
                </div>
              </div>
            </div>
          )}
        </section>

        <main className="tables-section">
          <div
            className="academic-table"
            style={!showTheologyPanel ? { width: "100%" } : {}}
          >
            <table>
              <thead>
                <tr>
                  <th colSpan={2} rowSpan={2} style={{ width: "22%" }}>
                    SUBJECTS
                  </th>
                  <th colSpan={6} className="table-title">
                    COMPARATIVE PERFORMANCE
                  </th>
                </tr>
                <tr>
                  <th colSpan={2}>
                    BEGINNING OF
                    <br />
                    TERM
                  </th>
                  <th colSpan={2}>MIDTERM</th>
                  <th colSpan={2}>END OF TERM</th>
                  <th rowSpan={2} style={{ width: "25%" }}>
                    SUBJECT
                    <br />
                    TEACHER'S
                    <br />
                    COMMENT
                  </th>
                </tr>
                <tr>
                  <th colSpan={2}></th>
                  <th style={{ width: "8%" }}>MARK</th>
                  <th style={{ width: "8%" }}>AGG</th>
                  <th style={{ width: "8%" }}>MARK</th>
                  <th style={{ width: "8%" }}>AGG</th>
                  <th style={{ width: "8%" }}>MARK</th>
                  <th style={{ width: "8%" }}>AGG</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.circular?.subjects?.map(renderSubjectRow)}
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      textAlign: "left",
                      paddingLeft: "4px",
                      fontWeight: 900,
                    }}
                  >
                    TOTAL
                  </td>
                  <td>{reportData?.circular?.bot_total_score ?? ""}</td>
                  <td>{reportData?.circular?.bot_total_aggregates ?? ""}</td>
                  <td>{reportData?.circular?.mot_total_score ?? ""}</td>
                  <td>{reportData?.circular?.mot_total_aggregates ?? ""}</td>
                  <td>{reportData?.circular?.eot_total_score ?? ""}</td>
                  <td>{reportData?.circular?.eot_total_aggregates ?? ""}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <div
              style={{ fontWeight: 800, fontSize: "12px", marginTop: "4px" }}
            >
              Grading
            </div>
            <table className="grading-key">
              <tbody>
                <tr className="grade-row">
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
                  <th>Marks</th>
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
            <div className="theology-table">
              <table>
                <thead>
                  <tr>
                    <th rowSpan={3} style={{ width: "25%" }}>
                      المواد
                    </th>
                    <th colSpan={4} className="table-title">
                      نتائج المواد الشرعية
                    </th>
                    <th rowSpan={3} style={{ width: "25%" }}>
                      الملاحظات
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={2}>منتصف الفترة</th>
                    <th colSpan={2}>نهاية الفترة</th>
                  </tr>
                  <tr>
                    <th>الدرجة الكبرى</th>
                    <th>الدرجة الصغرى</th>
                    <th>الدرجة الكبرى</th>
                    <th>الدرجة الصغرى</th>
                  </tr>
                </thead>
                <tbody>
                  {arabicSubjects.map((arabicName) => {
                    const subject = reportData?.theology?.subjects?.find(
                      (s: any) =>
                        s.subject_name_arabic === arabicName ||
                        s.subject_name === arabicName ||
                        (s.subject_name || "").includes(arabicName.split(" ")[0]) ||
                        (s.subject_name_arabic || "").includes(arabicName.split(" ")[0])
                    );
                    return (
                      <tr key={arabicName}>
                        <td style={{ textAlign: "right", paddingRight: "4px" }}>
                          {arabicName}
                        </td>
                        <td>{toAr(100)}</td>
                        <td>{toAr(subject?.mot_score)}</td>
                        <td>{toAr(100)}</td>
                        <td>{toAr(subject?.eot_score)}</td>
                        <td style={{ textAlign: "right", paddingRight: "4px" }}>
                          {subject?.theology_remark ?? ""}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td
                      style={{
                        textAlign: "right",
                        paddingRight: "4px",
                        fontWeight: 900,
                      }}
                    >
                      المجموع
                    </td>
                    <td>
                      {toAr(
                        reportData?.theology?.subjects?.length
                          ? reportData.theology.subjects.length * 100
                          : 400,
                      )}
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
                    <td></td>
                  </tr>
                </tbody>
              </table>
              <div className="theology-comment">
                <span>ملاحظة مشرف الفصل:</span>
                <div className="line">
                  {getTheologyComment(reportData?.theology?.total ?? null)}
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <div className="comment-row">
            <span>Class teacher's Comment:</span>
            <div className="line">{teacherComment}</div>
          </div>
          <div className="comment-row">
            <span>Conduct:</span>
            <div className="line">{conductRemark}</div>
            <span style={{ marginLeft: "20px" }}>Signature:</span>
            <div className="line" style={{ minWidth: "150px", position: "relative" }}>
              {(reportData?.student?.class_name?.includes('P.3') || reportData?.student?.class_name?.includes('P.1') || reportData?.student?.class_name?.includes('P.2')) && reportData?.signatures?.['class-teacher-p3'] && (
                <img src={reportData.signatures['class-teacher-p3']} alt="Signature" style={{ position: 'absolute', bottom: 0, height: '40px', left: '50%', transform: 'translateX(-50%)' }} />
              )}
              {(reportData?.student?.class_name?.includes('P.4') || reportData?.student?.class_name?.includes('P.5') || reportData?.student?.class_name?.includes('P.6')) && reportData?.signatures?.['class-teacher-p5'] && (
                <img src={reportData.signatures['class-teacher-p5']} alt="Signature" style={{ position: 'absolute', bottom: 0, height: '40px', left: '50%', transform: 'translateX(-50%)' }} />
              )}
  </div>
          </div>
          <div className="comment-row">
            <span>Head teacher's Comment:</span>
            <div className="line">{headComment}</div>
            <span style={{ marginLeft: "20px" }}>Signature:</span>
            <div className="line" style={{ minWidth: "150px", position: "relative" }}>
              {reportData?.signatures?.['head-teacher'] && (
                <img src={reportData.signatures['head-teacher']} alt="Signature" style={{ position: 'absolute', bottom: 0, height: '40px', left: '50%', transform: 'translateX(-50%)' }} />
              )}
</div>
          </div>

          <div className="dates-row">
            <div>
              <span className="label">This term ends On: </span>
              <span className="date">
                {reportData?.term?.end_date || "________________"}
              </span>
            </div>
            <div>
              <span className="label">Next term Begins On: </span>
              <span className="date">
                {reportData?.term?.next_term_start_date || "________________"}
              </span>
            </div>
          </div>

          <div className="validity-text" style={{ position: 'relative' }}>
            This Report Form Is Not Valid Without The Official Stamp

            {reportData?.signatures?.['school-stamp'] && (
              <img src={reportData.signatures['school-stamp']} alt="Stamp" style={{ position: 'absolute', right: '10%', bottom: '-10px', height: '70px', opacity: 0.85 }} />
            )}

          </div>
        </footer>
      </div>
    </ReportContainer>
  );
}
