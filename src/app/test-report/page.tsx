'use client'
import React, { useState } from 'react'
import TheologyMOTReport from '@/components/reports/TheologyMOTReport'

export default function TestReportPage() {
  const [phase, setPhase] = useState('mot')

  const dummyData = {
    score_type: phase,
    student: {
      name: "Jane Doe",
      theology_class_arabic: "الصف الأول"
    },
    term: {
      term_number: 1,
      academic_year: 2024
    },
    meta: {
      total_students: 30,
      position: 5
    },
    theology: {
      mot_total: 350,
      eot_total: 380,
      division: "1",
      subjects: [
        {
          subject_name_arabic: "القرآن",
          mot_score: 95,
          eot_score: 98
        },
        {
          subject_name_arabic: "الحديث",
          mot_score: 85,
          eot_score: 90
        }
      ]
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <button 
        id="toggle-btn"
        onClick={() => setPhase(p => p === 'mot' ? 'eot' : 'mot')}
        style={{ marginBottom: 20, padding: 10, background: 'blue', color: 'white' }}
      >
        Toggle Phase (Current: {phase})
      </button>
      <div id="report-container" style={{ width: '210mm', minHeight: '297mm', background: 'white' }}>
        <TheologyMOTReport reportData={dummyData} />
      </div>
    </div>
  )
}
