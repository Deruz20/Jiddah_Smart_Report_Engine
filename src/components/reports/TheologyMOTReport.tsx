import { getTheologyComment } from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'
import { transliterateEnglishToArabic } from '@/lib/transliterate'

export default function TheologyMOTReport({ reportData }: any) {
  const getTheologyRemark = (score: number | null): string => {
    if (score == null) return '--'
    if (score >= 90) return 'ممتاز'
    if (score >= 80) return 'جيد جدا'
    if (score >= 70) return 'جيد'
    if (score >= 60) return 'مقبول'
    return 'ضعيف'
  }

  const toAr = (val: number | string | null | undefined): string => {
    if (val == null) return '--'
    return String(val).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
  }

  const toHijri = (gregorianYear: number): number =>
    Math.round((gregorianYear - 622) * (33 / 32))

  const termInArabic = (n: number): string => {
    if (n === 1) return 'الأولى'
    if (n === 2) return 'الثاني'
    if (n === 3) return 'الثالث'
    return String(n)
  }

  const isEOT = reportData?.score_type === 'eot'
  const subjects = reportData?.theology?.subjects ?? []

  const renderCard = () => (
    <div className="theology-mot-report font-cairo">
      <div className="inner">
        <div className="header">
          <div className="basmala">بسم الله الرحمن الرحيم</div>
          <div className="school">
            مدرسة جدة الإسلامية للروضة والابتدائية _ انساغو واكيسو
          </div>
          <div className="title">
            {isEOT ? 'كشف الدرجات لنهاية الفترة' : 'كشف الدرجات لمنتصف الفترة'}
          </div>
        </div>

        <div className="info">
          <div className="row">
            <span>اسم الطالب/ة :</span>
            <div className="line-dots">
              <span className="line-text">
                {reportData?.student?.arabic_name || "___"}
              </span>
            </div>
          </div>

          <div className="row">
            <span>الفترة:</span>
            <div className="line-dots short">
              <span className="line-text">
                {toAr(reportData?.term?.term_number)}
              </span>
            </div>

            <span>الفصل:</span>
            <div className="line-dots short">
              <span className="line-text">
                {reportData?.student?.theology_class_arabic ?? '--'}
              </span>
            </div>

            <span>السنة :</span>
            <div className="line-dots medium">
              <span className="line-text">
                {toAr(toHijri(Number(reportData?.term?.academic_year)))}
              </span>
            </div>
            <span>هـ</span>
            <div className="line-dots medium">
              <span className="line-text">
                {toAr(reportData?.term?.academic_year)}
              </span>
            </div>
            <span>م</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <tbody>
              <tr>
                {subjects.map((subj: any, index: number) => (
                  <th key={index}>{subj.subject_name_arabic || subj.subject_name}</th>
                ))}
                <th>المجموع</th>
                <th className="red">الدرجة</th>
              </tr>
              <tr>
                {subjects.map((subj: any, index: number) => (
                  <td key={index}>{toAr(isEOT ? subj.eot_score : subj.mot_score)}</td>
                ))}
                <td>{toAr(isEOT ? reportData?.theology?.eot_total : reportData?.theology?.mot_total)}</td>
                <td className="red">
                  {reportData?.theology?.division ?? '--'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="students">
          <span>عدد الطلبة :</span>
          <div className="line-dots">
            <span className="line-text">
              {toAr(reportData?.meta?.total_students)}
            </span>
          </div>
          <span className="rank">الترتيب :</span>
          <div className="line-dots">
            <span className="line-text">
              {toAr(reportData?.meta?.position)}
            </span>
          </div>
        </div>

        <div className="comment-section">
          <div className="comment" style={{ flex: 1, margin: 0 }}>
            <span>تقرير مرب الفصل :</span>
            <div className="line-dots">
              <span className="line-text">
                {getTheologyComment(isEOT ? (reportData?.theology?.eot_total ?? 0) : (reportData?.theology?.mot_total ?? 0))}
              </span>
            </div>
          </div>
          <div className="stamp-box">
            الختم الرسمي للمدرسة
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <ReportContainer reportType="TheologyMOTReport">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');

.theology-mot-report-page {
    --primary-green: #064e3b;
    --secondary-green: #047857;
    --data-navy: #0f172a;
    --data-indigo: #1e293b;
    --data-teal: #0369a1;
    
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background: transparent;
}



/* MAIN CARD */
.theology-mot-report {
    flex: 1;
    width: 100%;
    background: transparent;
    position: relative;
    overflow: hidden;
    direction: rtl;
    color: #111;
    font-family: 'Cairo', sans-serif;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
}



/* WATERMARK */
.theology-mot-report::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url('/school_budge.jpeg') center center no-repeat;
    background-size: 250px;
    opacity: 0.08;
    pointer-events: none;
}

/* CONTENT */
.theology-mot-report .inner {
    padding: 16px 28px 12px;
    position: relative;
    z-index: 2;
}

/* HEADER */
.theology-mot-report .header {
    text-align: center;
    position: relative;
    background: linear-gradient(to right, var(--primary-green), var(--secondary-green));
    padding: 16px;
    border-radius: 12px;
    color: white;
    border-bottom: 4px solid #fbbf24;
}

.theology-mot-report .basmala {
    font-family: 'Amiri', serif;
    font-size: 24px;
    font-weight: 700;
    color: white;
    margin-bottom: 4px;
    letter-spacing: .5px;
}

.theology-mot-report .school {
    font-size: 22px;
    font-weight: 800;
    color: white;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    line-height: 1.3;
}

.theology-mot-report .title {
    margin-top: 6px;
    font-size: 18px;
    font-weight: 900;
    color: white;
    display: inline-block;
    padding: 4px 22px;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 999px;
    background: rgba(255,255,255,0.2);
}

/* INFO AREA */
.theology-mot-report .info {
    margin-top: 16px;
    font-size: 15px;
    font-weight: 700;
    color: #111;
    line-height: 1.5;
    background: #f8fafc;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.theology-mot-report .row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 8px;
}

.theology-mot-report .short { width: 100px; }
.theology-mot-report .medium { width: 150px; }

.theology-mot-report .comment {
    margin-top: 14px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.4;
}

.theology-mot-report .line-dots {
    flex: 1;
    min-width: 0;
    border-bottom: 1.5px dashed #cbd5e1;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 8px 2px 8px;
    color: var(--data-indigo);
    font-weight: 800;
    font-size: 16px;
}

.theology-mot-report .line-text {
    line-height: 1.1;
    padding-right: 4px;
    color: var(--data-teal);
    font-style: italic;
    font-weight: 900;
    font-size: 16px;
}

/* TABLE */
.theology-mot-report .table-wrap {
    margin-top: 14px;
    display: flex;
    justify-content: center;
}

.theology-mot-report .table {
    width: 95%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    font-size: 15px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
}

.theology-mot-report .table th,
.theology-mot-report .table td {
    border-right: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    text-align: center;
    white-space: normal;
    word-break: break-word;
}
.theology-mot-report .table th:last-child,
.theology-mot-report .table td:last-child {
    border-right: none;
}

.theology-mot-report .table th {
    padding: 6px 4px;
    background: var(--secondary-green);
    color: white;
    font-weight: 700;
    border-bottom: 2px solid var(--primary-green);
}

.theology-mot-report .table td {
    height: 28px;
    background: white;
    vertical-align: middle;
    padding: 2px;
    color: var(--data-indigo);
    font-weight: 800;
    font-size: 16px;
}

.theology-mot-report .red {
    color: #c1121f;
    font-weight: 900;
}

/* STUDENTS ROW */
.theology-mot-report .students {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
}

.theology-mot-report .students .line-dots {
    width: 140px;
    flex: none;
}

.theology-mot-report .rank {
    color: #c1121f;
    font-weight: 900;
}

/* STAMP BOX */
.theology-mot-report .stamp-box {
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
    margin-right: auto;
}

.theology-mot-report .comment-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 14px;
}

@media print {
    .theology-mot-report-page {
        margin: 0;
        border: none;
        box-shadow: none;
        padding: 10px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
}
        `
        }}
      />

      <div className="theology-mot-report-page">
        {renderCard()}
      </div>
    </ReportContainer>
  )
}
