'use client'

import React from 'react'
import type {
  DetailedReportResult,
  ExecutiveSectionMatrix,
  ExecutiveSectionTopAchievers,
} from '@/lib/hub-detailed-report'

function toArabicDigits(val: number | string | null | undefined): string {
  if (val == null || val === '' || (typeof val === 'number' && Number.isNaN(val))) return '—'
  return String(val).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

interface ExecutiveBreakdownPacketProps {
  report: DetailedReportResult
  variant: 'screen' | 'print'
}

const BAND_ROWS = [
  { key: 'I' as const, ar: 'ممتاز', en: 'Div I (A)' },
  { key: 'II' as const, ar: 'جيد جدا', en: 'Div II (B)' },
  { key: 'III' as const, ar: 'جيد', en: 'Div III (C)' },
  { key: 'IV' as const, ar: 'مقبول', en: 'Div IV (D)' },
  { key: 'U' as const, ar: 'ضعيف', en: 'Ungraded (E/U)' },
]

function getTermArabicSuffix(termLabel: string, examPhase: string): string {
  const phaseAr =
    examPhase === 'eot' ? 'لنهاية' : examPhase === 'mot' ? 'لمنتصف' : 'لبداية'
  if (/3|iii|third/i.test(termLabel)) return `${phaseAr} الفترة الثالثة`
  if (/2|ii|second/i.test(termLabel)) return `${phaseAr} الفترة الثانية`
  if (/1|i|first/i.test(termLabel)) return `${phaseAr} الفترة الأولى`
  return `${phaseAr} ${termLabel}`
}

/**
 * Shared Jiddah Executive Breakdown Packet ("النظر الدقيق على النتائج")
 * Renders Section Grade Distribution Matrices + Top Achievers per Section table
 * identically at the top of both the on-screen Detailed Report and Portrait A4 Print.
 */
export function ExecutiveBreakdownPacket({ report, variant }: ExecutiveBreakdownPacketProps) {
  const packet = report.executivePacket
  if (!packet || packet.sectionMatrices.length === 0) return null

  const isArabic = report.meta.curriculum === 'theology'
  const isPrint = variant === 'print'
  const fmt = (val: number | string) => (isArabic ? toArabicDigits(val) : String(val))
  const fmtCount = (count: number) => (count === 0 ? '..' : fmt(count))
  const fmtPct = (pct: number, total: number) =>
    total > 0 ? `${fmt(pct)}${isArabic ? '٪' : '%'}` : '..'

  const termArBanner = `النظر الدقيق على النتائج ${getTermArabicSuffix(report.meta.termLabel, report.meta.examPhase)} ${toArabicDigits(report.meta.academicYear)}م`
  const secularBanner = `EXECUTIVE PERFORMANCE BREAKDOWN — ${report.meta.termLabel.toUpperCase()} ${report.meta.academicYear} (${report.meta.examPhase.toUpperCase()})`

  const borderOuter = '#14532D'
  const borderInnerBlue = '#1D4ED8'
  const cellBorder = '#94A3B8'
  const mintBg = '#DCEFE9'
  const creamBg = '#EDE6D6'

  return (
    <section
      data-testid="executive-breakdown-packet"
      dir={isArabic ? 'rtl' : 'ltr'}
      style={{
        border: `2.5px solid ${borderOuter}`,
        padding: '3px',
        borderRadius: isPrint ? '4px' : '12px',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        marginBottom: isPrint ? '12px' : '4px',
        boxShadow: isPrint ? 'none' : '0 1px 3px rgba(15,23,42,0.06)',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      <div
        style={{
          border: `1.5px solid ${borderInnerBlue}`,
          borderRadius: isPrint ? '2px' : '9px',
          padding: isPrint ? '8px 10px' : '14px 16px',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Institutional Header Banner with Crest */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingBottom: isPrint ? '6px' : '10px',
            marginBottom: isPrint ? '8px' : '12px',
            borderBottom: `2px solid ${borderOuter}`,
          }}
        >
          <img
            src="/logo-512h.png"
            alt="Jiddah Crest"
            style={{
              width: isPrint ? '40px' : '46px',
              height: isPrint ? '40px' : '46px',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: isPrint ? '12px' : '15px',
                fontWeight: 900,
                color: borderOuter,
                lineHeight: 1.25,
              }}
            >
              {isArabic
                ? 'مدرسة جدة الإسلامية للروضة والابتدائية'
                : 'JIDDAH ISLAMIC NURSERY & PRIMARY SCHOOL'}
            </div>
            <div
              style={{
                display: 'inline-block',
                marginTop: '3px',
                padding: isPrint ? '2px 10px' : '3px 14px',
                borderRadius: '4px',
                backgroundColor: '#F0FDF4',
                border: `1px solid ${borderInnerBlue}`,
                fontSize: isPrint ? '10.5px' : '13px',
                fontWeight: 800,
                color: borderInnerBlue,
              }}
            >
              {isArabic ? termArBanner : secularBanner}
            </div>
          </div>
          <img
            src="/logo-512h.png"
            alt=""
            style={{
              width: isPrint ? '40px' : '46px',
              height: isPrint ? '40px' : '46px',
              objectFit: 'contain',
              flexShrink: 0,
              opacity: 0.9,
            }}
          />
        </div>

        {/* Section Grade Distribution Matrices (Nursery / Lower Primary / Upper Primary) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              packet.sectionMatrices.length === 1
                ? 'minmax(0, 1fr)'
                : isPrint
                  ? 'repeat(auto-fit, minmax(305px, 1fr))'
                  : 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: isPrint ? '8px' : '12px',
            marginBottom: isPrint ? '10px' : '14px',
          }}
        >
          {packet.sectionMatrices.map((matrix: ExecutiveSectionMatrix) => (
            <div
              key={matrix.sectionId}
              data-testid={`executive-matrix-${matrix.sectionId}`}
              style={{
                border: `1.5px solid ${borderOuter}`,
                borderRadius: '6px',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
              }}
            >
              <div
                style={{
                  backgroundColor: borderOuter,
                  color: '#FFFFFF',
                  padding: isPrint ? '4px 8px' : '6px 10px',
                  fontSize: isPrint ? '10px' : '12px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{isArabic ? matrix.labelArabic : `${matrix.label} Section`}</span>
                <span style={{ fontSize: isPrint ? '8.5px' : '10.5px', opacity: 0.9 }}>
                  {isArabic
                    ? `الطلبة: ${fmt(matrix.rowTotals.total)}`
                    : `n = ${matrix.rowTotals.total}`}
                </span>
              </div>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: isPrint ? '9.5px' : '11.5px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    <th
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: isPrint ? '3.5px 5px' : '5px 7px',
                        textAlign: isArabic ? 'right' : 'left',
                        fontWeight: 900,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isArabic ? 'التقدير' : 'Division'}
                    </th>
                    {matrix.classes.map((cls, cIdx) => (
                      <th
                        key={cls.classId}
                        style={{
                          border: `1px solid ${cellBorder}`,
                          padding: isPrint ? '3.5px 4px' : '5px 6px',
                          textAlign: 'center',
                          fontWeight: 800,
                          backgroundColor: cIdx % 2 === 0 ? mintBg : creamBg,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isArabic ? cls.classNameArabic : cls.className}
                      </th>
                    ))}
                    <th
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: isPrint ? '3.5px 4px' : '5px 6px',
                        textAlign: 'center',
                        fontWeight: 900,
                        backgroundColor: '#F1F5F9',
                        color: borderOuter,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isArabic ? 'المجموع' : 'Total'}
                    </th>
                    <th
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: isPrint ? '3.5px 4px' : '5px 6px',
                        textAlign: 'center',
                        fontWeight: 900,
                        backgroundColor: '#EFF6FF',
                        color: borderInnerBlue,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isArabic ? 'النسبة' : '%'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {BAND_ROWS.map((band) => (
                    <tr key={band.key}>
                      <td
                        style={{
                          border: `1px solid ${cellBorder}`,
                          padding: isPrint ? '3px 5px' : '4.5px 7px',
                          fontWeight: 800,
                          color: band.key === 'U' ? '#9F1239' : '#1E293B',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isArabic ? band.ar : band.en}
                      </td>
                      {matrix.classes.map((cls, cIdx) => {
                        const val = cls.counts[band.key]
                        return (
                          <td
                            key={cls.classId}
                            style={{
                              border: `1px solid ${cellBorder}`,
                              padding: isPrint ? '3px 4px' : '4.5px 6px',
                              textAlign: 'center',
                              backgroundColor: cIdx % 2 === 0 ? mintBg : creamBg,
                              fontWeight: val === 0 ? 500 : 800,
                              color: val === 0 ? '#64748B' : '#0F172A',
                            }}
                          >
                            {cls.candidateExcluded ? '—' : fmtCount(val)}
                          </td>
                        )
                      })}
                      <td
                        style={{
                          border: `1px solid ${cellBorder}`,
                          padding: isPrint ? '3px 4px' : '4.5px 6px',
                          textAlign: 'center',
                          fontWeight: 900,
                          backgroundColor: '#F8FAFC',
                          color: borderOuter,
                        }}
                      >
                        {fmtCount(matrix.rowTotals[band.key])}
                      </td>
                      <td
                        style={{
                          border: `1px solid ${cellBorder}`,
                          padding: isPrint ? '3px 4px' : '4.5px 6px',
                          textAlign: 'center',
                          fontWeight: 800,
                          backgroundColor: '#F8FAFC',
                          color: borderInnerBlue,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {fmtPct(matrix.rowPcts[band.key], matrix.rowTotals.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#F1F5F9', fontWeight: 900 }}>
                    <td
                      style={{
                        border: `1px solid ${borderOuter}`,
                        padding: isPrint ? '3.5px 5px' : '5px 7px',
                        color: borderOuter,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isArabic ? 'عدد الطلبة' : 'Total Learners'}
                    </td>
                    {matrix.classes.map((cls, cIdx) => (
                      <td
                        key={cls.classId}
                        style={{
                          border: `1px solid ${borderOuter}`,
                          padding: isPrint ? '3.5px 4px' : '5px 6px',
                          textAlign: 'center',
                          backgroundColor: cIdx % 2 === 0 ? '#CBE6DD' : '#E3DAC6',
                          color: '#0F172A',
                        }}
                      >
                        {cls.candidateExcluded ? '—' : fmt(cls.counts.total)}
                      </td>
                    ))}
                    <td
                      style={{
                        border: `1px solid ${borderOuter}`,
                        padding: isPrint ? '3.5px 4px' : '5px 6px',
                        textAlign: 'center',
                        color: borderOuter,
                      }}
                    >
                      {fmt(matrix.rowTotals.total)}
                    </td>
                    <td
                      style={{
                        border: `1px solid ${borderOuter}`,
                        padding: isPrint ? '3.5px 4px' : '5px 6px',
                        textAlign: 'center',
                        color: borderInnerBlue,
                      }}
                    >
                      {matrix.rowTotals.total > 0 ? (isArabic ? '١٠٠٪' : '100%') : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>

        {/* Top Achievers per Section Summary Table */}
        <div
          data-testid="executive-top-achievers-table"
          style={{
            border: `1.5px solid ${borderInnerBlue}`,
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          <div
            style={{
              backgroundColor: borderInnerBlue,
              color: '#FFFFFF',
              padding: isPrint ? '4px 8px' : '6px 10px',
              fontSize: isPrint ? '10px' : '12px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {isArabic
                ? 'قائمة أوائل الطلبة المتفوقين حسب المرحلة'
                : 'Top Achievers per Section (Complete Marks Ranked by Normalized %)'}
            </span>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: isPrint ? '9.5px' : '12px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#EFF6FF' }}>
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: isPrint ? '4px 6px' : '6px 10px',
                    textAlign: isArabic ? 'right' : 'left',
                    fontWeight: 900,
                    color: '#0F172A',
                    width: '22%',
                  }}
                >
                  {isArabic ? 'المرحلة' : 'Section'}
                </th>
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: isPrint ? '4px 6px' : '6px 10px',
                    textAlign: isArabic ? 'right' : 'left',
                    fontWeight: 900,
                    color: '#0F172A',
                  }}
                >
                  {isArabic ? 'الطلبة الأوائل (١ — ٣)' : 'Top Learners (1 – 3)'}
                </th>
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: isPrint ? '4px 6px' : '6px 10px',
                    textAlign: 'center',
                    fontWeight: 900,
                    color: borderOuter,
                    width: '18%',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isArabic ? 'المعدل التراكمي' : 'Avg %'}
                </th>
              </tr>
            </thead>
            <tbody>
              {packet.topAchieversBySection.map((sec: ExecutiveSectionTopAchievers, sIdx: number) => (
                <tr
                  key={sec.sectionId}
                  style={{
                    backgroundColor: sIdx % 2 === 0 ? '#FFFFFF' : '#FAF8F5',
                  }}
                >
                  <td
                    style={{
                      border: `1px solid ${cellBorder}`,
                      padding: isPrint ? '4px 6px' : '6px 10px',
                      fontWeight: 900,
                      color: borderOuter,
                      verticalAlign: 'middle',
                    }}
                  >
                    {isArabic ? sec.labelArabic : sec.label}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${cellBorder}`,
                      padding: isPrint ? '4px 6px' : '6px 10px',
                      verticalAlign: 'middle',
                    }}
                  >
                    {sec.learners.length === 0 ? (
                      <span style={{ color: '#64748B' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {sec.learners.map((l) => (
                          <div key={`${sec.sectionId}-${l.rank}`} style={{ fontWeight: 700, color: '#0F172A' }}>
                            <span style={{ fontWeight: 900, color: borderInnerBlue }}>
                              {isArabic ? `${toArabicDigits(l.rank)}.` : `${l.rank}.`}
                            </span>{' '}
                            {isArabic ? l.arabicName || l.name : l.name}{' '}
                            <span style={{ color: '#475569', fontWeight: 600, fontSize: isPrint ? '8.5px' : '10.5px' }}>
                              ({l.className})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${cellBorder}`,
                      padding: isPrint ? '4px 6px' : '6px 10px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    {sec.learners.length === 0 ? (
                      <span style={{ color: '#64748B' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {sec.learners.map((l) => (
                          <div
                            key={`${sec.sectionId}-score-${l.rank}`}
                            style={{ fontWeight: 900, color: borderOuter }}
                          >
                            {isArabic ? `${toArabicDigits(l.normalizedScore)}٪` : `${l.normalizedScore}%`}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
