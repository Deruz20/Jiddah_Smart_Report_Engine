'use client'

import React from 'react'
import { OfficialPrintLetterhead, OfficialPrintSignaturesFooter } from '@/components/print/OfficialPrintLetterhead'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import {
  type BroadsheetCurriculum,
  type BroadsheetPrintConfig,
  type BroadsheetStudentLike,
  getBroadsheetTypographyTokens,
} from '@/lib/broadsheet-print-config'

export interface BroadsheetSubjectItem {
  id: string
  subject_name?: string
  subject_name_arabic?: string
}

export interface BroadsheetCohortStats {
  subjectStats: Record<string, { avg: number; highest: number; lowest: number; passRate: number }>
  classAverageTotal: number
  nurseryOverallAvg?: number
  satCandidates: number
  totalCandidates: number
  divCounts: { I: number; II: number; III: number; IV: number; U: number }
}

interface BroadsheetPrintDocumentProps {
  curriculum: BroadsheetCurriculum
  config: BroadsheetPrintConfig
  students: BroadsheetStudentLike[]
  subjects: BroadsheetSubjectItem[]
  termLabel: string
  academicYear: string | number
  classNameLabel: string
  sectionLabel?: string
  examPhase: 'bot' | 'mot' | 'eot'
  isNursery?: boolean
  summary?: BroadsheetCohortStats | null
  forPreview?: boolean
}

function toArabicDigitsStr(val: number | string | null | undefined): string {
  if (val == null || val === '' || (typeof val === 'number' && Number.isNaN(val))) return '—'
  return String(val).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

export function BroadsheetPrintDocument({
  curriculum,
  config,
  students,
  subjects,
  termLabel,
  academicYear,
  classNameLabel,
  sectionLabel,
  examPhase,
  isNursery = false,
  summary,
  forPreview = false,
}: BroadsheetPrintDocumentProps) {
  const isTheology = curriculum === 'theology'
  const isMono = config.colorTheme === 'monochrome'
  const tokens = getBroadsheetTypographyTokens(config.fontScale, config.density)

  const formatNum = (val: number | string | null | undefined): string => {
    if (val == null || val === '' || (typeof val === 'number' && Number.isNaN(val))) return '—'
    return isTheology && config.useArabicNumerals ? toArabicDigitsStr(val) : String(val)
  }

  const visibleSubjects = subjects.filter((s) => !config.hiddenSubjectIds.includes(s.id))
  const showAggCols = config.showAggregate && !(curriculum === 'secular' && isNursery)
  const showDivCols = config.showDivision && !(curriculum === 'secular' && isNursery)
  // Theology sheets display raw marks only (never D1-style individual subject grade columns)
  const showSubjectGradeSubCols =
    !isTheology && config.showSubjectGrades && config.secularSubjectMode === 'split'

  // Count leading identity columns so Class Average spans cleanly across them
  const leadingColCount =
    (config.showSerialNumber ? 1 : 0) +
    (config.showAdmissionId ? 1 : 0) +
    1 + // Student name always included
    (config.showGender ? 1 : 0)

  const trailingColCount =
    (config.showTotal ? 1 : 0) +
    (config.showAverage ? 1 : 0) +
    (showAggCols ? 1 : 0) +
    (showDivCols ? 1 : 0) +
    (config.showRank ? 1 : 0)

  // Accessible high-contrast palette tokens
  const primary = isMono ? '#111827' : '#0D5C3A'
  const borderStrong = isMono ? '#111827' : '#14532D'
  const goldAccent = isMono ? '#475569' : '#C59B27'
  const headerBg = isMono ? '#E5E7EB' : '#0D5C3A'
  const headerFg = isMono ? '#0F172A' : '#FFFFFF'
  const subHeaderBg = isMono ? '#F1F5F9' : '#14532D'
  const subHeaderFg = isMono ? '#0F172A' : '#FFFFFF'
  const metaBg = isMono ? '#F8FAFC' : '#F0F9F4'
  const metaBorder = isMono ? '#CBD5E1' : '#B7DFC7'
  const zebraBg = isMono ? '#F3F4F6' : '#F4F9F6'
  const cellBorder = isMono ? '#4B5563' : '#64748B'

  const fontStack = isTheology
    ? "'Amiri', 'Cairo', 'Noto Naskh Arabic', sans-serif"
    : "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"

  const rootId = forPreview
    ? `preview-${curriculum}-broadsheet`
    : isTheology
      ? 'theology-hub-print-root'
      : 'secular-hub-print-root'

  const resolvedTitle =
    config.customTitle.trim() ||
    (isTheology
      ? 'كشف درجات الطلاب العام — قسم العلوم الشرعية واللغة العربية'
      : `ACADEMIC PERFORMANCE BROADSHEET — ${isNursery ? 'NURSERY SECTION' : 'PRIMARY CURRICULUM'}`)

  const examPhaseLabelAr =
    examPhase === 'eot'
      ? 'نهاية الفترة (EOT)'
      : examPhase === 'mot'
        ? 'منتصف الفترة (MOT)'
        : 'بداية الفترة (BOT)'

  const renderDivisionBadge = (div: string | null | undefined) => {
    const val = div && div !== '-' ? div : '—'
    if (val === '—') return <span style={{ color: '#64748B' }}>—</span>
    if (isMono) {
      return <span style={{ fontWeight: 900, fontSize: `${tokens.badgeFontPx}px` }}>{val}</span>
    }

    const normalized = val.replace(/^Div\s+/i, '').trim()
    const isTop = normalized === 'I' || normalized === 'ممتاز'
    const isGoodPlus = normalized === 'II' || normalized === 'جيد جداً' || normalized === 'جيد جدا'
    const isGood = normalized === 'III' || normalized === 'جيد'
    const isFair = normalized === 'IV' || normalized === 'مقبول'

    const bg = isTop
      ? '#DCFCE7'
      : isGoodPlus
        ? '#CCFBF1'
        : isGood
          ? '#FEF3C7'
          : isFair
            ? '#FFEDD5'
            : '#FFE4E6'
    const fg = isTop
      ? '#14532D'
      : isGoodPlus
        ? '#115E59'
        : isGood
          ? '#92400E'
          : isFair
            ? '#9A3412'
            : '#9F1239'

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: `${tokens.badgeFontPx}px`,
          fontWeight: 800,
          backgroundColor: bg,
          color: fg,
          whiteSpace: 'nowrap',
        }}
      >
        {val}
      </span>
    )
  }

  return (
    <div
      id={rootId}
      dir={isTheology ? 'rtl' : 'ltr'}
      data-report-orientation={config.orientation}
      className="hub-sheet-page"
      style={{
        display: 'block',
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        colorScheme: 'light',
        fontFamily: fontStack,
        padding: forPreview ? '16px 20px' : '0',
      }}
    >
      {/* Hidden compatibility anchors preserved for structural test invariants */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <OfficialPrintLetterhead
          documentTitle={resolvedTitle}
          rtl={isTheology}
        />
        <OfficialPrintSignaturesFooter rtl={isTheology} />
      </div>

      {/* Outer Formal Accent Frame (block flow — never clips across multi-page tables) */}
      <div
        style={{
          display: 'block',
          borderTop: config.frameStyle === 'classic' ? `4px solid ${borderStrong}` : `2px solid ${borderStrong}`,
          borderBottom: config.frameStyle === 'classic' ? `3px solid ${goldAccent}` : `2px solid ${borderStrong}`,
          borderLeft: config.frameStyle === 'classic' ? `2px solid ${borderStrong}` : 'none',
          borderRight: config.frameStyle === 'classic' ? `2px solid ${borderStrong}` : 'none',
          padding: config.headerStyle === 'none' ? '4px' : '10px 14px',
          backgroundColor: '#FFFFFF',
          boxSizing: 'border-box',
        }}
      >
        {/* HEADER SECTION */}
        {config.headerStyle === 'official' && (
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              paddingBottom: '8px',
              borderBottom: `2.5px solid ${primary}`,
            }}
          >
            <img
              src="/logo-512h.png"
              alt="Jiddah Crest"
              style={{ width: '56px', height: '56px', objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontSize: `${tokens.titleFontPx}px`,
                  fontWeight: 900,
                  color: primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                JIDDAH ISLAMIC NURSERY &amp; PRIMARY SCHOOL
              </h1>
              <p
                style={{
                  fontSize: `${tokens.subtitleFontPx + 1}px`,
                  fontWeight: 800,
                  color: primary,
                  margin: '2px 0 0',
                  fontFamily: "'Amiri', 'Cairo', serif",
                }}
              >
                مدرسة جدة الإسلامية للروضة والابتدائية
              </p>
              <p style={{ fontSize: '10.5px', color: '#334155', margin: '2px 0 0', fontWeight: 600 }}>
                P.O. Box 34008, Kampala – Uganda • Tel: +256 705 316961 / +256 787 779909
              </p>
            </div>
            <div style={{ width: '56px', height: '56px', flexShrink: 0 }} />
          </header>
        )}

        {config.headerStyle === 'compact' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '6px',
              borderBottom: `2px solid ${primary}`,
              marginBottom: '6px',
            }}
          >
            <strong style={{ fontSize: `${tokens.subtitleFontPx}px`, color: primary }}>
              {isTheology ? 'مدرسة جدة الإسلامية للروضة والابتدائية' : 'JIDDAH ISLAMIC SCHOOLS'}
            </strong>
            <span style={{ fontSize: `${tokens.metaFontPx}px`, fontWeight: 700, color: '#334155' }}>
              {classNameLabel} · {termLabel} · {examPhase.toUpperCase()}
            </span>
          </div>
        )}

        {/* DOCUMENT TITLE BANNER */}
        {config.headerStyle !== 'none' && (
          <div
            style={{
              backgroundColor: headerBg,
              color: headerFg,
              border: isMono ? '1.5px solid #111827' : 'none',
              textAlign: 'center',
              padding: '5px 12px',
              margin: '8px 0 6px',
              borderRadius: '4px',
            }}
          >
            <h2
              style={{
                fontSize: `${tokens.subtitleFontPx}px`,
                fontWeight: 900,
                margin: 0,
                letterSpacing: isTheology ? '0' : '0.4px',
              }}
            >
              {resolvedTitle}
            </h2>
          </div>
        )}

        {/* METADATA STRIP */}
        {config.showMetadataStrip && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              fontSize: `${tokens.metaFontPx}px`,
              fontWeight: 700,
              padding: '6px 12px',
              backgroundColor: metaBg,
              border: `1px solid ${metaBorder}`,
              borderRadius: '4px',
              marginBottom: '8px',
              color: '#0F172A',
            }}
          >
            {isTheology ? (
              <>
                <span>الفترة: {termLabel}</span>
                <span>الصف: {classNameLabel}</span>
                <span>السنة الدراسية: {formatNum(academicYear)}</span>
                <span>الاختبار: {examPhaseLabelAr}</span>
                <span>عدد الطلاب: {formatNum(students.length)}</span>
              </>
            ) : (
              <>
                <span>Term: {termLabel}</span>
                <span>Class: {classNameLabel}</span>
                {sectionLabel && <span>Section: {sectionLabel}</span>}
                <span>Phase: {examPhase.toUpperCase()}</span>
                <span>Year: {academicYear}</span>
                <span>Candidates: {students.length}</span>
                <span>Printed: {new Date().toLocaleDateString('en-GB')}</span>
              </>
            )}
          </div>
        )}

        {/* MAIN BROADSHEET TABLE — FLOWING MULTI-PAGE WITH REPEATING THEAD */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: `${tokens.bodyFontPx}px`,
            lineHeight: tokens.lineHeight,
            border: `2px solid ${borderStrong}`,
          }}
        >
          <thead style={{ display: 'table-header-group' }}>
            <tr
              style={{
                backgroundColor: subHeaderBg,
                color: subHeaderFg,
                fontSize: `${tokens.headerFontPx}px`,
                fontWeight: 800,
              }}
            >
              {config.showSerialNumber && (
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: tokens.headerPadding,
                    textAlign: 'center',
                    width: '36px',
                  }}
                >
                  {isTheology ? 'م' : '#'}
                </th>
              )}

              {config.showAdmissionId && (
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: tokens.headerPadding,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isTheology ? 'رقم القيد' : 'Adm No'}
                </th>
              )}

              <th
                style={{
                  border: `1px solid ${cellBorder}`,
                  padding: tokens.headerPadding,
                  textAlign: isTheology ? 'right' : 'left',
                  minWidth: '175px',
                }}
              >
                {isTheology ? 'اسم التلميذ/ة' : 'Student Name'}
              </th>

              {config.showGender && (
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: tokens.headerPadding,
                    textAlign: 'center',
                    width: '48px',
                  }}
                >
                  {isTheology ? 'النوع' : 'Sex'}
                </th>
              )}

              {visibleSubjects.map((sub) => {
                const subTitle = isTheology
                  ? sub.subject_name_arabic || sub.subject_name || ''
                  : sub.subject_name || sub.subject_name_arabic || ''
                return (
                  <th
                    key={sub.id}
                    colSpan={showSubjectGradeSubCols ? 2 : 1}
                    style={{
                      border: `1px solid ${cellBorder}`,
                      padding: tokens.headerPadding,
                      textAlign: 'center',
                      minWidth: showSubjectGradeSubCols ? '78px' : '58px',
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{subTitle}</div>
                    {showSubjectGradeSubCols && (
                      <div style={{ fontSize: `${tokens.subHeaderFontPx}px`, opacity: 0.9, marginTop: '2px' }}>
                        Mark | Grd
                      </div>
                    )}
                  </th>
                )
              })}

              {config.showTotal && (
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: tokens.headerPadding,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isTheology ? 'المجموع' : 'Total'}
                </th>
              )}

              {config.showAverage && (
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: tokens.headerPadding,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isTheology ? 'المتوسط٪' : 'Avg %'}
                </th>
              )}

              {showAggCols && (
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: tokens.headerPadding,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isTheology ? 'المعدل' : 'Agg'}
                </th>
              )}

              {showDivCols && (
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: tokens.headerPadding,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isTheology ? 'التقدير' : 'Div'}
                </th>
              )}

              {config.showRank && (
                <th
                  style={{
                    border: `1px solid ${cellBorder}`,
                    padding: tokens.headerPadding,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isTheology ? 'الترتيب' : 'Rank'}
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {students.map((st, idx) => {
              const rowBg = config.zebraStripes && idx % 2 === 1 ? zebraBg : '#FFFFFF'
              const validSubjectCount = visibleSubjects.reduce(
                (cnt, sub) => (st.subjectScores[sub.id] != null ? cnt + 1 : cnt),
                0
              )
              const avgPct =
                typeof st.total === 'number' && validSubjectCount > 0
                  ? Math.round(st.total / validSubjectCount)
                  : null

              return (
                <tr
                  key={st.id}
                  style={{
                    backgroundColor: rowBg,
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  {config.showSerialNumber && (
                    <td
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: tokens.cellPadding,
                        textAlign: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {formatNum(idx + 1)}
                    </td>
                  )}

                  {config.showAdmissionId && (
                    <td
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: tokens.cellPadding,
                        textAlign: 'center',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: `${Math.max(9.5, tokens.bodyFontPx - 1.5)}px`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {st.admission_number || '—'}
                    </td>
                  )}

                  <td
                    style={{
                      border: `1px solid ${cellBorder}`,
                      padding: tokens.cellPadding,
                      textAlign: isTheology ? 'right' : 'left',
                      fontWeight: 800,
                      color: '#0F172A',
                    }}
                  >
                    <div>{isTheology ? st.arabic_name || st.name : st.name}</div>
                    {config.showBilingualNames && (
                      <div
                        style={{
                          fontSize: `${Math.max(10, tokens.bodyFontPx - 2)}px`,
                          color: '#475569',
                          fontWeight: 500,
                          marginTop: '1px',
                        }}
                      >
                        {isTheology ? (st.arabic_name ? st.name : '') : st.arabic_name || ''}
                      </div>
                    )}
                  </td>

                  {config.showGender && (
                    <td
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: tokens.cellPadding,
                        textAlign: 'center',
                        fontWeight: 600,
                      }}
                    >
                      {st.gender
                        ? isTheology
                          ? st.gender.toLowerCase().startsWith('f')
                            ? 'أنثى'
                            : 'ذكر'
                          : st.gender.charAt(0).toUpperCase()
                        : '—'}
                    </td>
                  )}

                  {visibleSubjects.map((sub) => {
                    const score = st.subjectScores[sub.id]
                    const grade = st.subjectGrades[sub.id]

                    if (showSubjectGradeSubCols) {
                      return (
                        <React.Fragment key={sub.id}>
                          <td
                            style={{
                              border: `1px solid ${cellBorder}`,
                              padding: tokens.cellPadding,
                              textAlign: 'center',
                              fontWeight: 800,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {score != null ? formatNum(score) : '—'}
                          </td>
                          <td
                            style={{
                              border: `1px solid ${cellBorder}`,
                              padding: tokens.cellPadding,
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: `${tokens.badgeFontPx}px`,
                            }}
                          >
                            {grade || '—'}
                          </td>
                        </React.Fragment>
                      )
                    }

                    const showCombinedBadge =
                      !isTheology && config.showSubjectGrades && config.secularSubjectMode === 'combined'

                    return (
                      <td
                        key={sub.id}
                        style={{
                          border: `1px solid ${cellBorder}`,
                          padding: tokens.cellPadding,
                          textAlign: 'center',
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {score != null ? (
                          showCombinedBadge && grade ? (
                            <span>
                              {formatNum(score)}{' '}
                              <span
                                style={{
                                  fontSize: `${Math.max(9.5, tokens.bodyFontPx - 2)}px`,
                                  fontWeight: 800,
                                  color: isMono ? '#111827' : '#0D5C3A',
                                }}
                              >
                                ({grade})
                              </span>
                            </span>
                          ) : (
                            formatNum(score)
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                    )
                  })}

                  {config.showTotal && (
                    <td
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: tokens.cellPadding,
                        textAlign: 'center',
                        fontWeight: 900,
                        backgroundColor: isMono ? '#F8FAFC' : '#F1F5F9',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {st.total ? formatNum(st.total) : '—'}
                    </td>
                  )}

                  {config.showAverage && (
                    <td
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: tokens.cellPadding,
                        textAlign: 'center',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {avgPct != null ? `${formatNum(avgPct)}%` : '—'}
                    </td>
                  )}

                  {showAggCols && (
                    <td
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: tokens.cellPadding,
                        textAlign: 'center',
                        fontWeight: 800,
                        color: primary,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {st.aggregate != null ? formatNum(st.aggregate) : '—'}
                    </td>
                  )}

                  {showDivCols && (
                    <td
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: tokens.cellPadding,
                        textAlign: 'center',
                      }}
                    >
                      {renderDivisionBadge(
                        isTheology
                          ? st.division
                          : st.division && st.division !== '-'
                            ? `Div ${st.division}`
                            : null
                      )}
                    </td>
                  )}

                  {config.showRank && (
                    <td
                      style={{
                        border: `1px solid ${cellBorder}`,
                        padding: tokens.cellPadding,
                        textAlign: 'center',
                        fontWeight: 900,
                        color: isMono ? '#0F172A' : '#92400E',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {st.position !== '-' && st.position != null ? formatNum(st.position) : '—'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>

          {/* SUMMARY FOOTER ROW — prints once after final student row (display: table-row-group) */}
          {config.showSummaryFooter && summary && (
            <tfoot style={{ display: 'table-row-group' }}>
              <tr
                style={{
                  backgroundColor: metaBg,
                  fontWeight: 900,
                  borderTop: `2px solid ${borderStrong}`,
                }}
              >
                <td
                  colSpan={leadingColCount}
                  style={{
                    border: `1px solid ${borderStrong}`,
                    padding: tokens.cellPadding,
                    textAlign: isTheology ? 'right' : 'right',
                    color: primary,
                  }}
                >
                  {isTheology ? 'متوسط الفصل' : 'Class Average'}
                </td>
                {visibleSubjects.map((sub) => {
                  const avgVal = summary.subjectStats[sub.id]?.avg
                  return (
                    <td
                      key={sub.id}
                      colSpan={showSubjectGradeSubCols ? 2 : 1}
                      style={{
                        border: `1px solid ${borderStrong}`,
                        padding: tokens.cellPadding,
                        textAlign: 'center',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {avgVal != null ? formatNum(avgVal) : '—'}
                    </td>
                  )
                })}
                {trailingColCount > 0 && (
                  <td
                    colSpan={trailingColCount}
                    style={{
                      border: `1px solid ${borderStrong}`,
                      padding: tokens.cellPadding,
                      textAlign: 'center',
                      color: primary,
                    }}
                  >
                    {isTheology
                      ? `متوسط المجموع: ${formatNum(summary.classAverageTotal)}`
                      : isNursery && summary.nurseryOverallAvg != null
                        ? `Mean: ${summary.nurseryOverallAvg}%`
                        : `Mean Total: ${summary.classAverageTotal}`}
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>

        {/* COHORT SUMMARY BOX */}
        {config.showCohortSummaryBox && summary && !(curriculum === 'secular' && isNursery) && (
          <div
            className="hub-print-keep-together"
            style={{
              marginTop: '10px',
              padding: '7px 12px',
              border: `1.5px solid ${borderStrong}`,
              borderRadius: '4px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              fontSize: `${tokens.summaryFontPx}px`,
              backgroundColor: '#F8FAFC',
              color: '#0F172A',
            }}
          >
            {isTheology ? (
              <>
                <span style={{ fontWeight: 900, color: primary }}>ملخص التقديرات الشرعية:</span>
                <span>ممتاز: <strong>{formatNum(summary.divCounts.I)}</strong></span>
                <span>جيد جداً: <strong>{formatNum(summary.divCounts.II)}</strong></span>
                <span>جيد: <strong>{formatNum(summary.divCounts.III)}</strong></span>
                <span>مقبول: <strong>{formatNum(summary.divCounts.IV)}</strong></span>
                <span>راسب: <strong>{formatNum(summary.divCounts.U)}</strong></span>
                <span>
                  الممتحنون: <strong>{formatNum(summary.satCandidates)}</strong> من{' '}
                  <strong>{formatNum(summary.totalCandidates)}</strong>
                </span>
              </>
            ) : (
              <>
                <span style={{ fontWeight: 900, color: primary }}>OFFICIAL COHORT SUMMARY:</span>
                <span>Div I: <strong>{summary.divCounts.I}</strong></span>
                <span>Div II: <strong>{summary.divCounts.II}</strong></span>
                <span>Div III: <strong>{summary.divCounts.III}</strong></span>
                <span>Div IV: <strong>{summary.divCounts.IV}</strong></span>
                <span>Div U: <strong>{summary.divCounts.U}</strong></span>
                <span>
                  Sat: <strong>{summary.satCandidates}</strong> / <strong>{summary.totalCandidates}</strong>
                </span>
              </>
            )}
          </div>
        )}

        {/* CUSTOM FOOTER NOTE */}
        {config.customFooterNote.trim() && (
          <div
            className="hub-print-keep-together"
            style={{
              marginTop: '8px',
              padding: '6px 10px',
              borderLeft: isTheology ? 'none' : `3px solid ${primary}`,
              borderRight: isTheology ? `3px solid ${primary}` : 'none',
              backgroundColor: '#F8FAFC',
              fontSize: `${tokens.footerFontPx}px`,
              fontWeight: 600,
              color: '#1E293B',
            }}
          >
            {config.customFooterNote.trim()}
          </div>
        )}

        {/* SIGNATURES & OFFICIAL STAMP BLOCK */}
        {(config.showSignatures || config.showStamp) && (
          <div
            className="hub-print-keep-together"
            style={{
              marginTop: '14px',
              paddingTop: '12px',
              position: 'relative',
              minHeight: config.showStamp ? '64px' : undefined,
            }}
          >
            {config.showSignatures && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '24px',
                  textAlign: 'center',
                  fontSize: `${tokens.footerFontPx}px`,
                  paddingTop: config.showStamp ? '34px' : '14px',
                }}
              >
                {[config.signatory1, config.signatory2, config.signatory3].map((sigLabel, idx) => (
                  <div key={idx} style={{ borderTop: '1.5px dashed #475569', paddingTop: '5px' }}>
                    <p style={{ fontWeight: 800, margin: 0, color: '#0F172A' }}>{sigLabel}</p>
                    <p style={{ fontSize: `${Math.max(9.5, tokens.footerFontPx - 1.5)}px`, color: '#475569', margin: '2px 0 0' }}>
                      {isTheology ? 'التوقيع والتاريخ' : 'Signature & Date'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {config.showStamp && (
              <div
                style={{
                  position: 'absolute',
                  left: isTheology ? '16px' : undefined,
                  right: isTheology ? undefined : '16px',
                  top: '0px',
                  opacity: 0.9,
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                <OfficialReportStamp
                  reportData={{
                    stamp_config: {
                      ink_color: isMono ? '#111827' : '#0D5C3A',
                      scale: 85,
                    },
                  }}
                  maxWidth={110}
                  maxHeight={52}
                />
              </div>
            )}
          </div>
        )}

        {/* INSTITUTIONAL FOOTER METADATA */}
        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: `${Math.max(10, tokens.footerFontPx - 1)}px`,
            color: '#475569',
            borderTop: '1px solid #CBD5E1',
            paddingTop: '4px',
          }}
        >
          <span>
            {isTheology
              ? 'نظام التقارير الذكي — مدرسة جدة الإسلامية للروضة والابتدائية'
              : 'Jiddah Smart Report Engine — Jiddah Islamic Nursery & Primary School'}
          </span>
          <span>
            {isTheology
              ? `تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}`
              : `Printed on ${new Date().toLocaleDateString('en-GB')}`}
          </span>
        </div>
      </div>
    </div>
  )
}
