'use client'

import React from 'react'
import { OfficialPrintLetterhead, OfficialPrintSignaturesFooter } from '@/components/print/OfficialPrintLetterhead'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import { resolveEffectiveStampDate } from '@/lib/stamp-date'
import { ExecutiveBreakdownPacket } from './ExecutiveBreakdownPacket'
import {
  clampSupportThreshold,
  filterNeedsSupportLearners,
  type DetailedReportResult,
} from '@/lib/hub-detailed-report'

function toArabicDigits(val: number | string | null | undefined): string {
  if (val == null || val === '' || (typeof val === 'number' && Number.isNaN(val))) return '—'
  return String(val).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

interface DetailedReportPrintDocumentProps {
  report: DetailedReportResult | null
  supportThreshold: number
  globalStampDate?: string
}

export function DetailedReportPrintDocument({
  report,
  supportThreshold,
  globalStampDate,
}: DetailedReportPrintDocumentProps) {
  if (!report) return null

  const isArabic = report.meta.curriculum === 'theology'
  const effectiveStampDate = resolveEffectiveStampDate(null, globalStampDate || null)
  const threshold = clampSupportThreshold(supportThreshold ?? report.learners.supportThreshold)
  const needsSupport = filterNeedsSupportLearners(
    report.learners.eligibleLearners,
    report.meta.curriculum,
    threshold
  )

  const fmtNum = (val: number | string | null | undefined, suffix = ''): string => {
    if (val === null || val === undefined || val === '' || (typeof val === 'number' && Number.isNaN(val))) {
      return '—'
    }
    const text = `${val}${suffix}`
    return isArabic ? toArabicDigits(text) : text
  }

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: isArabic ? '20px' : '10.5px',
    fontWeight: 900,
    textTransform: isArabic ? 'none' : 'uppercase',
    letterSpacing: isArabic ? '0' : '0.04em',
    color: '#0F4D25',
    borderBottom: '1.5px solid #0F4D25',
    paddingBottom: '3px',
    marginBottom: '6px',
    marginTop: '12px',
  }

  const thStyle: React.CSSProperties = {
    padding: isArabic ? '5px 7px' : '4px 6px',
    border: '1px solid #D6D3D1',
    backgroundColor: '#F5F5F4',
    color: '#1C1917',
    fontSize: isArabic ? '14.5px' : '9px',
    fontWeight: 900,
    textAlign: isArabic ? 'right' : 'left',
  }

  const tdStyle: React.CSSProperties = {
    padding: isArabic ? '4.5px 7px' : '3.5px 6px',
    border: '1px solid #E7E5E4',
    color: '#1C1917',
    fontSize: isArabic ? '14px' : '9px',
    fontWeight: isArabic ? 700 : 400,
    fontVariantNumeric: 'tabular-nums',
  }

  return (
    <div
      id={isArabic ? 'theology-detailed-report-print-root' : 'secular-detailed-report-print-root'}
      data-testid="detailed-report-print-document"
      data-report-orientation="portrait"
      dir={isArabic ? 'rtl' : 'ltr'}
      style={{
        backgroundColor: '#FFFFFF',
        color: '#111827',
        colorScheme: 'light',
        fontFamily: isArabic ? 'Amiri, "Noto Naskh Arabic", Arial, sans-serif' : 'Inter, Arial, sans-serif',
        width: '100%',
        padding: '2mm 0',
      }}
    >
      <OfficialPrintLetterhead
        visibleOnScreen
        rtl={isArabic}
        documentTitle={
          isArabic
            ? 'التقرير الأكاديمي التحليلي المفصل'
            : 'DETAILED ACADEMIC ASSESSMENT REPORT'
        }
        arabicDocumentTitle={isArabic ? undefined : 'التقرير الأكاديمي التحليلي المفصل'}
        metadata={[
          {
            label: isArabic ? 'النطاق' : 'Scope',
            value: isArabic ? report.meta.scopeLabelArabic : report.meta.scopeLabel,
          },
          {
            label: isArabic ? 'الفترة' : 'Term',
            value: `${report.meta.termLabel} (${fmtNum(report.meta.academicYear)})`,
          },
          {
            label: isArabic ? 'الاختبار' : 'Exam',
            value: report.meta.examPhase.toUpperCase(),
          },
          {
            label: isArabic ? 'العدد المكتمل' : 'Complete Cohort',
            value: `${fmtNum(report.cohort.satComplete)} / ${fmtNum(report.cohort.totalEnrolled)}`,
          },
        ]}
      />

      {/* EXECUTIVE BREAKDOWN PACKET AT TOP OF PORTRAIT PRINT ("النظر الدقيق على النتائج") */}
      <ExecutiveBreakdownPacket report={report} variant="print" />

      {/* CURRENT-TERM COHORT TABLE (BOT, MOT, EOT ONLY) */}
      <div style={{ breakInside: 'avoid', marginBottom: '10px' }}>
        <div style={sectionHeadingStyle}>
          {isArabic
            ? 'كشف نتائج التلاميذ للفترة الحالية (BOT / MOT / EOT)'
            : 'Current Term Cohort Summary (BOT, MOT, EOT)'}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>{isArabic ? 'اسم التلميذ' : 'Student Name'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'بداية الفترة (BOT)' : 'BOT Score/Grade'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'منتصف الفترة (MOT)' : 'MOT Score/Grade'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'نهاية الفترة (EOT)' : 'EOT Score/Grade'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'المجموع الكلي' : 'Overall Total'}</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const rows = report?.learners?.cohortStudents ?? report?.learners?.eligibleLearners ?? []
              if (rows.length === 0) {
                return (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'center' }}>
                      {isArabic ? 'لا توجد بيانات متاحة بعد' : 'No data available yet'}
                    </td>
                  </tr>
                )
              }
              return rows.map((student, idx) => (
                <tr key={student?.id || idx}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>
                    {isArabic ? (student?.arabicName || student?.name || '--') : (student?.name || '--')}
                    {student?.className ? ` (${student.className})` : ''}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{student?.bot_score ?? '--'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{student?.mot_score ?? '--'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{student?.eot_score ?? '--'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>
                    {student?.overall_total ?? student?.total ?? '--'}
                  </td>
                </tr>
              ))
            })()}
          </tbody>
        </table>
      </div>

      {/* KPI Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        {[
          {
            label: isArabic ? 'اكتمال الفوج' : 'Cohort Completion',
            val: `${fmtNum(report.cohort.completionPct, isArabic ? '٪' : '%')}`,
            sub: isArabic
              ? `${fmtNum(report.cohort.satComplete)} من ${fmtNum(report.cohort.totalEnrolled)} (مستثنى P.7: ${fmtNum(report.cohort.candidateExcludedCount)})`
              : `${report.cohort.satComplete}/${report.cohort.totalEnrolled} complete • P.7 N/A: ${report.cohort.candidateExcludedCount}`,
          },
          {
            label: isArabic ? 'المتوسط والوسيط' : 'Mean / Median',
            val: `${fmtNum(report.performance.meanPct, isArabic ? '٪' : '%')} / ${fmtNum(report.performance.medianPct, isArabic ? '٪' : '%')}`,
            sub: `n = ${fmtNum(report.performance.n)} • IQR ${fmtNum(report.performance.iqrPct)} pp`,
          },
          {
            label: isArabic ? 'نسبة النجاح والمدى' : 'Pass Rate & Range',
            val: fmtNum(report.performance.passRatePct, isArabic ? '٪' : '%'),
            sub: `${fmtNum(report.performance.lowestPct, '%')} – ${fmtNum(report.performance.highestPct, '%')}`,
          },
          {
            label: isArabic ? `بحاجة لدعم (<${toArabicDigits(threshold)}٪)` : `Needs Support (<${threshold}%)`,
            val: fmtNum(needsSupport.length),
            sub: isArabic ? 'تلاميذ مكتملو الدرجات' : `of ${report.performance.n} complete`,
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            style={{
              border: '1px solid #D6D3D1',
              borderRadius: '6px',
              padding: '6px 8px',
              backgroundColor: '#FAF7F2',
            }}
          >
            <div style={{ fontSize: '8px', fontWeight: 700, color: '#57534E', textTransform: 'uppercase' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#111827', marginTop: '2px' }}>
              {kpi.val}
            </div>
            <div style={{ fontSize: '8px', color: '#57534E', marginTop: '1px' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Deterministic Insights */}
      <div style={sectionHeadingStyle}>
        {isArabic ? 'الاستنتاجات الآلية المستخلصة من البيانات' : '1. Computed Deterministic Insights'}
      </div>
      <div style={{ border: '1px solid #E7E5E4', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#FFFFFF' }}>
        {report.insights.map((ins) => (
          <p key={ins.id} style={{ fontSize: '9px', lineHeight: 1.45, margin: '0 0 3px 0', color: '#1C1917' }}>
            <strong>{isArabic ? ins.titleArabic : ins.title}:</strong> {isArabic ? ins.textArabic : ins.text}
          </p>
        ))}
      </div>

      {/* Grade / Division Distribution */}
      <div style={sectionHeadingStyle}>
        {isArabic ? '٢. توزيع التقديرات والدرجات' : '2. Grade & Division Distribution'}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>{isArabic ? 'التقدير' : 'Division / Grade'}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'العدد' : 'Count'}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'النسبة' : 'Share %'}</th>
          </tr>
        </thead>
        <tbody>
          {report.performance.divisionDistribution.map((d) => (
            <tr key={d.key}>
              <td style={tdStyle}>{isArabic ? d.labelArabic : d.label}</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{fmtNum(d.count)}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(d.pct, isArabic ? '٪' : '%')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section & Class Comparisons */}
      {report.comparisons.sectionVsSection.length > 0 && (
        <div style={{ breakInside: 'avoid' }}>
          <div style={sectionHeadingStyle}>
            {isArabic ? '٣. مقارنة الأقسام' : '3. Section vs Section Comparison'}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>{isArabic ? 'القسم' : 'Section'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'المقيدون' : 'Enrolled'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'مكتمل' : 'Sat'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'المتوسط' : 'Mean %'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'الوسيط' : 'Median %'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'النجاح' : 'Pass %'}</th>
              </tr>
            </thead>
            <tbody>
              {report.comparisons.sectionVsSection.map((s) => (
                <tr key={s.sectionId}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{isArabic ? s.labelArabic : s.label}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(s.totalEnrolled)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(s.satComplete)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(s.meanPct, isArabic ? '٪' : '%')}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(s.medianPct, isArabic ? '٪' : '%')}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(s.passRatePct, isArabic ? '٪' : '%')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ breakInside: 'avoid' }}>
        <div style={sectionHeadingStyle}>
          {isArabic ? '٤. مقارنة الصفوف' : '4. Class vs Class Breakdown'}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>{isArabic ? 'الصف' : 'Class'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'المقيدون' : 'Enrolled'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'مكتمل' : 'Sat'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'الإكمال' : 'Completion'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'المتوسط' : 'Mean %'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'النجاح' : 'Pass %'}</th>
            </tr>
          </thead>
          <tbody>
            {report.comparisons.classVsClass.map((c) => (
              <tr key={c.classId}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>
                  {c.className} {c.candidateExcluded ? `(${c.candidateBadge})` : ''}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(c.totalEnrolled)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{c.candidateExcluded ? 'N/A' : fmtNum(c.satComplete)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{c.candidateExcluded ? 'N/A' : fmtNum(c.completionPct, isArabic ? '٪' : '%')}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{c.candidateExcluded ? 'N/A' : fmtNum(c.meanPct, isArabic ? '٪' : '%')}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{c.candidateExcluded ? 'N/A' : fmtNum(c.passRatePct, isArabic ? '٪' : '%')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Subject Analysis */}
      <div style={{ breakInside: 'avoid' }}>
        <div style={sectionHeadingStyle}>
          {isArabic ? '٥. تحليل المواد الدراسية' : '5. Subject Performance'}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>{isArabic ? 'المادة' : 'Subject'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'المختبرون' : 'Sat'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'المتوسط' : 'Mean %'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'الأعلى / الأدنى' : 'High / Low'}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'نسبة النجاح' : 'Pass %'}</th>
            </tr>
          </thead>
          <tbody>
            {report.subjects.orderedSubjects.map((s) => (
              <tr key={s.subjectId}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>
                  {isArabic ? s.subjectNameArabic : s.subjectName}
                  {s.isStrongest ? (isArabic ? ' (الأقوى)' : ' (Strongest)') : ''}
                  {s.isWeakest && !s.isStrongest ? (isArabic ? ' (الأضعف)' : ' (Weakest)') : ''}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(s.satCount)}/{fmtNum(s.expectedCount)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(s.mean, isArabic ? '٪' : '%')}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {fmtNum(s.highest)} / {fmtNum(s.lowest)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{fmtNum(s.passRate, isArabic ? '٪' : '%')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top 10 & Needs Support side by side or stacked cleanly */}
      <div style={{ breakInside: 'avoid' }}>
        <div style={sectionHeadingStyle}>
          {isArabic ? '٦. أفضل ١٠ تلاميذ والتلاميذ المحتاجون للدعم' : `6. Top 10 Merit Roll & Needs Support (< ${threshold}%)`}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center', width: '28px' }}>#</th>
                <th style={thStyle}>{isArabic ? 'التلميذ (أفضل ١٠)' : 'Top 10 Student'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'النسبة' : 'Avg %'}</th>
              </tr>
            </thead>
            <tbody>
              {report.learners.top10.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                </tr>
              ) : (
                report.learners.top10.map((st) => (
                  <tr key={st.id}>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>{fmtNum(st.position)}</td>
                    <td style={tdStyle}>
                      {isArabic ? st.arabicName || st.name : st.name} ({st.className})
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                      {fmtNum(st.normalizedScore, isArabic ? '٪' : '%')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>{isArabic ? `بحاجة لدعم (<${toArabicDigits(threshold)}٪)` : `Needs Support (<${threshold}%)`}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'المعدل' : 'Avg %'}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{isArabic ? 'التقدير' : 'Div'}</th>
              </tr>
            </thead>
            <tbody>
              {needsSupport.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ ...tdStyle, textAlign: 'center' }}>
                    {isArabic ? 'لا يوجد تلاميذ دون العتبة' : 'No learners below threshold'}
                  </td>
                </tr>
              ) : (
                needsSupport.slice(0, 15).map((st) => (
                  <tr key={st.id}>
                    <td style={tdStyle}>
                      {isArabic ? st.arabicName || st.name : st.name} ({st.className})
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                      {fmtNum(st.normalizedScore, isArabic ? '٪' : '%')}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{st.division}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Quality & Scope Notes */}
      <div style={{ breakInside: 'avoid', marginTop: '10px', borderTop: '1px solid #D6D3D1', paddingTop: '6px' }}>
        <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#57534E', marginBottom: '2px' }}>
          {isArabic ? 'جودة البيانات والملاحظات المنهجية:' : 'Data Quality & Scope Notes:'}
        </div>
        <div style={{ fontSize: '8px', color: '#57534E', lineHeight: 1.4 }}>
          {isArabic
            ? `درجات ناقصة: ${fmtNum(report.dataQuality.missingMarksStudentsCount)} • خارج النطاق: ${fmtNum(report.dataQuality.outOfRangeScores.length)} • مكررة: ${fmtNum(report.dataQuality.duplicateMarkRows.length)} • صفوف غير مصنفة: ${fmtNum(report.dataQuality.unmappedClasses.length)}.`
            : `Incomplete learners: ${report.dataQuality.missingMarksStudentsCount} • Out-of-range scores: ${report.dataQuality.outOfRangeScores.length} • Duplicate mark keys: ${report.dataQuality.duplicateMarkRows.length} • Unmapped classes: ${report.dataQuality.unmappedClasses.length}.`}
        </div>
        {report.omittedMetrics.map((o) => (
          <div key={o.key} style={{ fontSize: '7.5px', color: '#78716C', marginTop: '1px' }}>
            • <strong>{isArabic ? o.labelArabic : o.label}:</strong> {isArabic ? o.reasonArabic : o.reason}
          </div>
        ))}
      </div>

      <div
        className="hub-print-keep-together"
        style={{
          marginTop: '10px',
          display: 'flex',
          justifyContent: isArabic ? 'flex-start' : 'flex-end',
          alignItems: 'center',
        }}
      >
        <OfficialReportStamp
          reportData={{
            stamp_config: {
              ink_color: '#1B3B8B',
              date: effectiveStampDate,
            },
          }}
          maxWidth={208}
          maxHeight={121}
        />
      </div>

      <OfficialPrintSignaturesFooter rtl={isArabic} />
    </div>
  )
}
