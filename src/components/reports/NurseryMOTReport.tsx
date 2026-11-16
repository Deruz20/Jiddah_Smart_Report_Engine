import { getNurseryGrade, getNurseryTeacherComment, getConductRemark } from '@/lib/grading'
import { ReportContainer } from '@/components/reports/shared/ReportContainer'
import { CleanSignatureImage } from '@/components/reports/CleanSignatureImage'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import { resolveReportBranding } from '@/lib/school-settings-helper'
import { formatDateWithOrdinal } from '@/utils/dateHelpers';

import { getClassTeacherSignatureKey } from "@/utils/signatures";
import { NurseryEducativeWatermark } from "@/components/reports/NurseryEducativeWatermark";
import { useStudioFormatting, resolveEffectiveStudioStyle } from "@/lib/studio-config-store";

export default function NurseryMOTReport({ reportData, studioFormatting: studioFormattingProp }: any) {
  const studioFormatting = useStudioFormatting(studioFormattingProp, reportData?.settings?.report_studio_config)
  const effective = resolveEffectiveStudioStyle(studioFormatting, reportData, 'nursery-mot')
  const effectiveStudioPass = { ...studioFormatting, ...effective, stampInkColor: effective.stampColor }
  const branding = resolveReportBranding(reportData)
  const printPrefs = reportData?.settings?.print_preferences
  const includeSignatures =
    effective.showSignatures &&
    (printPrefs?.includeSignatures !== undefined ? Boolean(printPrefs.includeSignatures) : true)
  const includeStamp =
    effective.showStamp &&
    (printPrefs?.includeStamp !== undefined ? Boolean(printPrefs.includeStamp) : true)
  const rawClassName =
    reportData?.student?.class_name ||
    reportData?.class_name ||
    reportData?.class ||
    ''
  const secTeacherKey = getClassTeacherSignatureKey(rawClassName, false)
  const theoTeacherKey = getClassTeacherSignatureKey(rawClassName, true)
  const sigMap = reportData?.signatures || {}
  const classTeacherSignatureUrl =
    (secTeacherKey && sigMap[secTeacherKey]) ||
    (theoTeacherKey && sigMap[theoTeacherKey]) ||
    sigMap['class-teacher-baby'] ||
    sigMap['class-teacher-middle'] ||
    sigMap['class-teacher-top'] ||
    null
  const subjects = (reportData?.circular?.subjects || []).filter((s: any) => {
    if (reportData?.student?.class_name?.toLowerCase().includes('top') && s.subject_name.toLowerCase().includes('writing')) {
      return false;
    }
    return true;
  });

  const grades = subjects
    .map((s: any) => s.score != null ? getNurseryGrade(s.score).grade : null)
    .filter(Boolean)

  const getSubjectIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('number')) return '🔢'
    if (lower.includes('english') || lower.includes('reading')) return '📚'
    if (lower.includes('writing') || lower.includes('drawing')) return '🎨'
    if (lower.includes('social')) return '🌍'
    if (lower.includes('health')) return '🍎'
    if (lower.includes('literacy')) return '📖'
    if (lower.includes('islamic') || lower.includes('quran') || lower.includes('religion')) return '☪️'
    return '✏️'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "_________________"
    try {
      const d = new Date(dateString)
      if (isNaN(d.getTime())) return dateString
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase()
    } catch (error) {
      return dateString
    }
  }

  return (
    <ReportContainer
      reportType="NurseryMOTReport"
      primaryFont={branding.primaryFont}
      arabicFont={branding.arabicFont}
      themePreset={branding.themePreset}
      themeColor={effective.primaryColor}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
    .nursery-mot-report {
        --primary-green: ${effective.primaryColor};
        --dark-green: ${effective.headerAccentColor};
        --accent-gold: ${effective.secondaryColor};
        --border-light: #e2e8f0;
        --data-indigo: ${effective.primaryColor};
        --bg-stripes: #f8fafc;
        
        flex: 1 1 auto;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: transparent;
        font-family: ${effective.fontFamilyCss} !important;
        zoom: ${effective.fontScaleMultiplier};
        position: relative;
        overflow: hidden;
        border: none;
        border-radius: 0;
        box-shadow: none;
    }

    @media print {
        .nursery-mot-report {
            border: none;
            border-radius: 0;
            box-shadow: none;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
    }

    .nursery-mot-report > * { z-index: 2; position: relative; }

    /* HEADER */
    .nursery-mot-report .header-banner {
        background: linear-gradient(to right, ${effective.primaryColor}, ${effective.headerAccentColor});
        padding: 16px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 4px solid ${effective.secondaryColor};
        color: white;
        flex-shrink: 0;
    }

    .nursery-mot-report .school-left { width: 32%; }
    .nursery-mot-report .school-left h1 {
        margin: 0;
        font-size: 18px;
        color: white;
        font-weight: 800;
        letter-spacing: 0.04em;
        line-height: 1.15;
    }
    .nursery-mot-report .school-left p { margin: 4px 0 0; font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.85); }

    .nursery-mot-report .header-center { width: 36%; text-align: center; display: flex; flex-direction: column; align-items: center; }
    
    .nursery-mot-report .logo {
        width: 60px;
        height: 60px;
        margin: 0 auto 6px;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .nursery-mot-report .logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .nursery-mot-report .report-badge {
        display: inline-block;
        background: rgba(255,255,255,0.2);
        color: white;
        padding: 4px 16px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        border: 1px solid rgba(255,255,255,0.3);
    }

    .nursery-mot-report .header-right { width: 32%; text-align: right; }
    .nursery-mot-report .header-right h2 {
        margin: 0;
        font-size: 20px;
        color: white;
        line-height: 1.2;
        font-weight: 700;
        letter-spacing: 0.05em;
    }

    /* BODY PADDING */
    .nursery-mot-report .report-body {
        padding: 14px 24px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 8px;
        flex: 1 1 auto;
    }

    /* INFO BOXES */
    .nursery-mot-report .info-container {
        flex: 0 0 auto;
        display: flex;
        gap: 16px;
        margin-bottom: 0;
    }
    .nursery-mot-report .info-box {
        flex: 1;
        background: #f8fafc;
        border: 1.5px solid ${effective.secondaryColor};
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }
    .nursery-mot-report .info-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        font-size: 12px;
    }
    .nursery-mot-report .info-row:last-child { margin-bottom: 0; }
    .nursery-mot-report .label { font-weight: 700; color: #64748b; white-space: nowrap; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
    .nursery-mot-report .line { 
        flex: 1; 
        min-width: 0;
        border-bottom: 1.5px dotted #cbd5e1; 
        display: flex;
        align-items: flex-end;
        padding: 0 0 2px 4px;
        color: ${effective.primaryColor};
        font-weight: 700;
        font-size: ${effective.commentFontSizePx}px;
    }

    /* TABLES */
    .nursery-mot-report .tables-container {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 10px;
    }
    
    .nursery-mot-report table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border: 1.5px solid ${effective.secondaryColor};
        border-radius: 8px;
        overflow: hidden;
    }
    .nursery-mot-report th {
        background: ${effective.primaryColor};
        color: white;
        font-size: 11px;
        padding: ${effective.densityPadding};
        text-transform: uppercase;
        border-bottom: 2px solid ${effective.secondaryColor};
        font-weight: 700;
        letter-spacing: 0.05em;
        border-right: 1px solid rgba(255,255,255,0.2);
    }
    .nursery-mot-report th:last-child { border-right: none; }
    
    .nursery-mot-report td {
        border-bottom: 1px solid var(--border-light);
        border-right: 1px solid var(--border-light);
        padding: ${effective.densityPadding};
        font-size: 12.5px;
        color: #334155;
    }
    .nursery-mot-report td:last-child { border-right: none; }
    .nursery-mot-report tbody tr:last-child td { border-bottom: none; }
    .nursery-mot-report tbody tr:nth-child(even) { background: var(--bg-stripes); }

    .nursery-mot-report .data-cell {
        text-align: center;
        font-weight: ${effective.scoreFontWeight};
        color: ${effective.primaryColor};
        font-size: 13px;
    }
    
    .nursery-mot-report .subject-cell {
        font-weight: ${effective.headingFontWeight};
        color: #0f172a;
    }

    /* FOOTER */
    .nursery-mot-report .report-footer {
        flex: 0 0 auto;
        margin-top: 4px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
    }
    .nursery-mot-report .remarks-box {
        flex: 1;
        margin-right: 20px;
        background: #f8fafc;
        border-radius: 12px;
        padding: 12px 16px;
        border: 1.5px solid ${effective.secondaryColor};
    }
    .nursery-mot-report .stamp-box {
        width: 135px;
        height: 68px;
        max-width: 135px;
        max-height: 68px;
        overflow: hidden;
        border: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: transparent;
        flex-shrink: 0;
    }
        `
      }} />

      <div className="nursery-mot-report">
        <div className="header-banner">
          <div className="school-left">
            <h1>{effective.schoolHeader.nameEnglish}</h1>
            <p>{effective.schoolHeader.address}</p>
            <p>Tel: {effective.schoolHeader.phone}</p>
          </div>
          <div className="header-center">
            <div className="logo">
              <img
                src={branding.logoUrl || '/school_logo.svg'}
                alt="Badge"
                onError={(e) => {
                  if (!e.currentTarget.src.endsWith('/school_logo.svg')) {
                    e.currentTarget.src = '/school_logo.svg';
                  }
                }}
              />
            </div>
            <div className="report-badge">MID TERM REPORT</div>
          </div>
          <div className="header-right">
            <h2>NURSERY</h2>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#93c5fd', fontWeight: 600 }}>
              TERM {reportData?.term?.term_number} • {reportData?.term?.academic_year}
            </div>
          </div>
        </div>

        <div className="report-body" style={{ position: 'relative' }}>
          <NurseryEducativeWatermark
            templateId="nursery-mot"
            logoUrl={branding.logoUrl || '/logo-512h.png'}
            studioFormatting={effectiveStudioPass}
            includeEducativeArt={true}
          />
          {/* INFO BOXES */}
          <div className="info-container">
            <div className="info-box">
              <div className="info-row"><span className="label">Student Name</span><div className="line pupil-name" style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', color: '#0F172A' }}>{reportData?.student?.name}</div></div>
              <div className="info-row"><span className="label">Student ID</span><div className="line" style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{reportData?.student?.admission_number}</div></div>
              <div className="info-row"><span className="label">Pay Code</span><div className="line" style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>--</div></div>
            </div>
            <div className="info-box">
              <div className="info-row"><span className="label">Class</span><div className="line" style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>{reportData?.student?.class_name}</div></div>
              <div className="info-row"><span className="label">Date</span><div className="line" style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{reportData?.term?.end_date ? formatDate(reportData.term.end_date) : '_________________'}</div></div>
            </div>
          </div>

          {/* TABLES */}
          <div className="tables-container">

            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', width: '40%' }}>Learning Area</th>
                  <th style={{ width: '15%' }}>Grade</th>
                  <th style={{ width: '25%' }}>Remark</th>
                  <th style={{ width: '20%' }}>Initials</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject: any) => {
                  const g = subject.score != null ? getNurseryGrade(subject.score) : null
                  return (
                    <tr key={subject.subject_name}>
                      <td className="subject-cell">
                        <span style={{ marginRight: '8px', fontSize: '14px' }}>{getSubjectIcon(subject.subject_name)}</span>
                        {subject.subject_name}
                      </td>
                      <td className="data-cell">{g?.grade ?? '--'}</td>
                      <td className="data-cell">{g?.remark ?? '--'}</td>
                      <td className="data-cell" style={{ textTransform: 'uppercase', fontFamily: '"Caveat", cursive', fontWeight: 'bold', fontSize: '1.2em', color: '#047857' }}>{(subject.teacher_initials || '').toUpperCase()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <table>
              <thead>
                <tr>
                  <th colSpan={6} style={{ background: '#1e40af', textAlign: 'center' }}>OFFICIAL GRADING SCALE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="subject-cell" style={{ background: '#f8fafc' }}>Score Range</td>
                  <td className="data-cell">0 - 49</td><td className="data-cell">50 - 69</td><td className="data-cell">70 - 79</td><td className="data-cell">80 - 89</td><td className="data-cell">90 - 100</td>
                </tr>
                <tr>
                  <td className="subject-cell" style={{ background: '#f8fafc' }}>Grade</td>
                  <td className="data-cell" style={{ color: '#ef4444' }}>E</td><td className="data-cell" style={{ color: '#f59e0b' }}>D</td><td className="data-cell">C</td><td className="data-cell" style={{ color: '#10b981' }}>B</td><td className="data-cell" style={{ color: '#059669' }}>A</td>
                </tr>
              </tbody>
            </table>

          </div>

          {/* FOOTER */}
          <div className="report-footer">
            <div className="remarks-box">
              <div className="info-row"><span className="label" style={{ minWidth: '100px' }}>Conduct</span><div className="line">{reportData?.circular?.conduct_remark ?? getConductRemark(null)}</div></div>
              <div className="info-row" style={{ marginTop: '10px', alignItems: 'flex-end', gap: '8px' }}>
                <span className="label" style={{ minWidth: '100px' }}>Class Teacher</span>
                <div className="line" style={{ flex: 1, minHeight: '22px', borderBottom: '1.5px dotted #cbd5e1', display: 'flex', alignItems: 'flex-end' }}>
                  <span>{getNurseryTeacherComment(grades)}</span>
                </div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', flexShrink: 0, paddingBottom: '2px' }}>SIG:</span>
                <div style={{ borderBottom: '1.5px dotted #334155', minWidth: '95px', width: '108px', height: '28px', display: 'inline-flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                  {includeSignatures && classTeacherSignatureUrl && (
                    <CleanSignatureImage src={classTeacherSignatureUrl} alt="Signature" style={{ maxHeight: '34px', width: '104px', objectFit: 'contain', marginBottom: '-6px' }} studioFormatting={effectiveStudioPass} />
                  )}
                </div>
              </div>
              <div className="info-row" style={{ marginTop: '10px', alignItems: 'flex-end', gap: '8px' }}>
                <span className="label" style={{ minWidth: '100px' }}>Head Teacher</span>
                <div className="line" style={{ flex: 1, minHeight: '22px', borderBottom: '1.5px dotted #cbd5e1', display: 'flex', alignItems: 'flex-end' }}>
                  <span>{getNurseryTeacherComment(grades)}</span>
                </div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', flexShrink: 0, paddingBottom: '2px' }}>SIG:</span>
                <div style={{ borderBottom: '1.5px dotted #334155', minWidth: '95px', width: '108px', height: '28px', display: 'inline-flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                  {includeSignatures && reportData?.signatures?.['head-teacher'] && (
                    <CleanSignatureImage src={reportData.signatures['head-teacher']} alt="Signature" style={{ maxHeight: '34px', width: '104px', objectFit: 'contain', marginBottom: '-6px' }} studioFormatting={effectiveStudioPass} />
                  )}
                </div>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
                <div className="info-row" style={{ flex: 1 }}><span className="label">Next Term Begins</span><div className="line" style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 'bold' }}>
                  {reportData?.term?.next_term_start ? formatDateWithOrdinal(reportData.term.next_term_start) : '______________________'}
                </div></div>
              </div>
            </div>

            <div className="stamp-box" style={{ width: '135px', height: '64px', minWidth: '135px', minHeight: '64px', position: 'relative', overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {includeStamp ? (
                <OfficialReportStamp reportData={reportData} studioFormatting={effectiveStudioPass} maxWidth={135} maxHeight={64} />
              ) : null}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '9px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>
            NOT VALID WITHOUT OFFICIAL SCHOOL STAMP AND SIGNATURE
          </div>

        </div>
      </div>
    </ReportContainer>
  )
}
