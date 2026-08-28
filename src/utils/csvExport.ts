/**
 * Utility functions for exporting Theology Hub data to CSV.
 * Includes UTF-8 BOM (\uFEFF) to ensure Microsoft Excel renders Arabic (RTL) characters correctly.
 */

// Helper to escape CSV values (quotes, commas, etc.)
const escapeCSV = (val: any) => {
  if (val === null || val === undefined) return '"-"'
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Download function
export const downloadCSV = (csvContent: string, filename: string) => {
  // CRITICAL: Prepend UTF-8 Byte Order Mark (BOM) for Excel Arabic support
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ----------------------------------------------------
// Type definitions for the pre-calculated data
// ----------------------------------------------------

export type AssessmentRow = {
  id: string
  name: string
  arabic_name: string
  total: number
  position: number | string
  subjectScores: Record<string, number | null>
}

export type AssessmentSubject = {
  id: string
  subject_name_arabic: string
}

export type AnalysisRow = {
  id: string
  className: string
  numStudents: number
  excellent: number
  vGood: number
  good: number
  fair: number
  weak: number
  passRate: number
}

export type TopStudentRow = {
  id: string
  className: string
  studentName: string
  total: number
  avg: number
  rank: number
}

// ----------------------------------------------------
// Generators
// ----------------------------------------------------

export const generateAssessmentCSV = (
  students: AssessmentRow[],
  orderedSubjects: AssessmentSubject[],
  filename: string
) => {
  const headers = [
    'No',
    'Student Name',
    'Arabic Name',
    ...orderedSubjects.map(s => s.subject_name_arabic),
    'Total',
    'Rank',
    'Remark'
  ]

  const getRemark = (score: number) => {
    if (score >= 90) return 'ممتاز'
    if (score >= 80) return 'جيد جداً'
    if (score >= 70) return 'جيد'
    if (score >= 60) return 'جيد'
    if (score >= 50) return 'مقبول'
    return 'ضعيف'
  }

  const rows = students.map((student, idx) => {
    const scores = orderedSubjects.map(s => 
      student.subjectScores[s.id] !== undefined && student.subjectScores[s.id] !== null 
        ? student.subjectScores[s.id] 
        : '-'
    )
    const remark = student.total > 0 ? getRemark(student.total / (orderedSubjects.length || 1)) : '-'
    
    return [
      idx + 1,
      student.name,
      student.arabic_name || '',
      ...scores,
      student.total > 0 ? student.total : '-',
      student.total > 0 ? student.position : '-',
      remark
    ]
  })

  const csvString = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  downloadCSV(csvString, filename)
}


export const generateSecularAnalysisCSV = (
  analysisRows: any[],
  filename: string,
  isNursery: boolean
) => {
  const headers = isNursery
    ? [
        'Class',
        'Total Students',
        'Highest Avg',
        'Lowest Avg',
        'Class Avg',
        'Grade A',
        'Grade B',
        'Grade C',
        'Grade D',
        'Grade E'
      ]
    : [
        'Class',
        'Total Students',
        'Highest Avg',
        'Lowest Avg',
        'Class Avg',
        'Div I', 'Div II', 'Div III', 'Div IV', 'Div U', 'Div X',
        'D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9'
      ]

  const rows = analysisRows.map(row => {
    const base = [
      row.className,
      row.numStudents,
      row.highestAvg,
      row.lowestAvg,
      row.classAvg
    ]

    if (isNursery) {
      return [
        ...base,
        row.gradeCounts.A,
        row.gradeCounts.B,
        row.gradeCounts.C,
        row.gradeCounts.D,
        row.gradeCounts.E
      ]
    }

    return [
      ...base,
      row.divCounts.I, row.divCounts.II, row.divCounts.III, row.divCounts.IV, row.divCounts.U, row.divCounts.X,
      row.gradeCounts.D1, row.gradeCounts.D2, row.gradeCounts.C3, row.gradeCounts.C4,
      row.gradeCounts.C5, row.gradeCounts.C6, row.gradeCounts.P7, row.gradeCounts.P8, row.gradeCounts.F9
    ]
  })

  const csvString = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  downloadCSV(csvString, filename)
}


export const generateAnalysisCSV = (
  analysisRows: AnalysisRow[],
  filename: string
) => {
  const headers = [
    'Class',
    'Total Students',
    'Excellent (ممتاز)',
    'Very Good (جيد جداً)',
    'Good (جيد)',
    'Fair (مقبول)',
    'Weak (ضعيف)',
    'Pass Rate (%)'
  ]

  const rows = analysisRows.map(row => [
    row.className,
    row.numStudents,
    row.excellent,
    row.vGood,
    row.good,
    row.fair,
    row.weak,
    `${row.passRate}%`
  ])

  const csvString = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  downloadCSV(csvString, filename)
}


export const generateSecularTopStudentsCSV = (
  topStudentsRows: any[],
  filename: string
) => {
  const headers = [
    'Class',
    'Rank',
    'Student Name',
    'Total Score',
    'Average'
  ]

  const rows = topStudentsRows.map(row => [
    row.className,
    row.rank,
    row.studentName,
    row.total,
    row.avg
  ])

  const csvString = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  downloadCSV(csvString, filename)
}

export const generateTopStudentsCSV = (
  topStudentsRows: TopStudentRow[],
  filename: string
) => {
  const headers = [
    'Class',
    'Rank',
    'Student Name',
    'Total Score',
    'Average'
  ]

  const rows = topStudentsRows.map(row => [
    row.className,
    row.rank,
    row.studentName,
    row.total,
    Math.round(row.avg)
  ])

  const csvString = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  downloadCSV(csvString, filename)
}


export const generateReportBroadsheetCSV = (
  reports: any[],
  filename: string
) => {
  const headers = [
    'No',
    'Admission Number',
    'Student Name',
    'Arabic Name',
    'Class',
    'Total Score',
    'Average',
    'Overall Remark'
  ]
  
  // Collect all unique subjects across all loaded reports
  const allSubjects = new Map<string, string>()
  reports.forEach(r => {
    r.circular?.subjects?.forEach((s: any) => allSubjects.set(s.subject_id, s.subject_name))
    r.theology?.subjects?.forEach((s: any) => allSubjects.set(s.subject_id, s.subject_name_arabic))
  })
  
  const subjectIds = Array.from(allSubjects.keys())
  const subjectNames = Array.from(allSubjects.values())

  headers.push(...subjectNames)

  const rows = reports.map((r, idx) => {
    let total = 0
    let count = 0
    const scores: Record<string, string> = {}
    
    r.circular?.subjects?.forEach((s: any) => {
      const score = s.mot_score != null ? s.mot_score : s.eot_score
      scores[s.subject_id] = score != null ? score : '-'
      if (score != null) { total += score; count++ }
    })
    
    r.theology?.subjects?.forEach((s: any) => {
      const score = s.mot_score != null ? s.mot_score : s.eot_score
      scores[s.subject_id] = score != null ? score : '-'
      if (score != null) { total += score; count++ }
    })
    
    const subjectScores = subjectIds.map(id => scores[id] || '-')
    const avg = count > 0 ? Math.round(total / count) : 0
    
    let remark = 'Weak / ضعيف'
    if (avg >= 90) remark = 'Excellent / ممتاز'
    else if (avg >= 80) remark = 'Very Good / جيد جداً'
    else if (avg >= 60) remark = 'Good / جيد'
    else if (avg >= 50) remark = 'Fair / مقبول'

    return [
      idx + 1,
      r.student?.admission_number || '',
      r.student?.name || '',
      r.student?.arabic_name || '',
      r.student?.class_name || r.student?.theology_class_arabic || '',
      total > 0 ? total : '-',
      total > 0 ? avg : '-',
      total > 0 ? remark : '-',
      ...subjectScores
    ]
  })

  const csvString = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  downloadCSV(csvString, filename)
}

export const generateSecularAssessmentCSV = (
  students: any[],
  orderedSubjects: any[],
  filename: string,
  getGradeDisplayStr: (val: number | null) => string
) => {
  const headers = [
    'No',
    'Student Name',
    ...orderedSubjects.flatMap(s => [
      s.subject_name === 'MATH' ? 'MTC' : s.subject_name === 'SCI' ? 'SCIE' : s.subject_name,
      'AGG'
    ]),
    'TOTAL',
    'T/L AGG.',
    'DIV',
    'PSN'
  ]

  const rows = students.map((student, idx) => {
    const scoresAndAggs = orderedSubjects.flatMap(s => {
      const score = student.subjectScores[s.id] !== undefined ? student.subjectScores[s.id] : '-'
      const aggNum = student.subjectAggregates[s.id]
      const aggStr = aggNum != null ? getGradeDisplayStr(aggNum) : '-'
      return [score, aggStr]
    })
    
    return [
      idx + 1,
      student.name,
      ...scoresAndAggs,
      student.total > 0 ? student.total : '-',
      student.totalAggregate > 0 ? student.totalAggregate : '-',
      student.division,
      student.total > 0 ? student.position : '-'
    ]
  })

  const csvString = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  downloadCSV(csvString, filename)
}
