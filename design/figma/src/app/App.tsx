import React, { useState } from 'react';
import PrimaryEOTReport from '../imports/PrimaryEOTReport';
import P7EOTReport from '../imports/P7EOTReport';

// Mock data
const mockPrimaryData = {
  section_type: 'lower_primary',
  student: {
    name: 'Ahmed Yasin',
    class_name: 'P.3',
    arabic_name: 'أحمد ياسين',
    theology_class_arabic: 'الابتدائية الثالثة'
  },
  term: {
    label: 'Term 1',
    academic_year: '2024',
    term_number: 1,
    end_date: '2024-05-10',
    next_term_start: '2024-06-01'
  },
  circular: {
    position: 3,
    total_students: 45,
    division: 1,
    mot_total: 350,
    mot_aggregate: 5,
    eot_total: 360,
    aggregate: 4,
    subjects: [
      { subject_name: 'ENGLISH', mot_score: 85, mot_grade_display: 'D1', eot_score: 90, eot_grade_display: 'D1', remark: 'Excellent' },
      { subject_name: 'MATHEMATICS', mot_score: 75, mot_grade_display: 'D2', eot_score: 80, eot_grade_display: 'D2', remark: 'V. Good' },
      { subject_name: 'SCIENCE', mot_score: 95, mot_grade_display: 'D1', eot_score: 92, eot_grade_display: 'D1', remark: 'Excellent' },
      { subject_name: 'SOCIAL STUDIES', mot_score: 88, mot_grade_display: 'D1', eot_score: 89, eot_grade_display: 'D1', remark: 'Excellent' }
    ]
  },
  theology: {
    mot_total: 380,
    eot_total: 390,
    subjects: [
      { subject_name_arabic: 'القرآن', mot_score: 98, eot_score: 99, theology_remark: 'ممتاز' },
      { subject_name_arabic: 'اللغة', mot_score: 90, eot_score: 92, theology_remark: 'جيد جدا' },
      { subject_name_arabic: 'الفقه', mot_score: 95, eot_score: 96, theology_remark: 'ممتاز' },
      { subject_name_arabic: 'التربية', mot_score: 97, eot_score: 98, theology_remark: 'ممتاز' }
    ]
  }
};

const mockP7Data = {
  section_type: 'upper_primary',
  student: {
    name: 'Kato Samuel',
    class_name: 'P.7'
  },
  term: {
    label: 'Term 3',
    academic_year: '2024',
    end_date: '2024-12-15',
    next_term_start: '2025-02-05'
  },
  circular: {
    position: 1,
    total_students: 120,
    division: 1,
    mot_total: 380,
    mot_aggregate: 4,
    eot_total: 395,
    aggregate: 4,
    subjects: [
      { subject_name: 'ENGLISH', mot_score: 95, mot_grade_display: 'D1', eot_score: 98, eot_grade_display: 'D1', remark: 'Excellent' },
      { subject_name: 'MATHEMATICS', mot_score: 92, mot_grade_display: 'D1', eot_score: 99, eot_grade_display: 'D1', remark: 'Excellent' },
      { subject_name: 'SCIENCE', mot_score: 96, mot_grade_display: 'D1', eot_score: 98, eot_grade_display: 'D1', remark: 'Excellent' },
      { subject_name: 'SOCIAL STUDIES', mot_score: 97, mot_grade_display: 'D1', eot_score: 100, eot_grade_display: 'D1', remark: 'Excellent' }
    ]
  }
};

export default function App() {
  const [view, setView] = useState<'primary' | 'p7'>('primary');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <div className="mb-4 flex gap-4 print:hidden">
        <button 
          onClick={() => setView('primary')} 
          className={`px-4 py-2 rounded ${view === 'primary' ? 'bg-blue-600 text-white' : 'bg-white'}`}
        >
          Primary EOT Report (Bilingual)
        </button>
        <button 
          onClick={() => setView('p7')} 
          className={`px-4 py-2 rounded ${view === 'p7' ? 'bg-blue-600 text-white' : 'bg-white'}`}
        >
          P.7 EOT Report (English)
        </button>
      </div>

      {view === 'primary' ? (
        <PrimaryEOTReport reportData={mockPrimaryData} />
      ) : (
        <P7EOTReport reportData={mockP7Data} />
      )}
    </div>
  );
}
