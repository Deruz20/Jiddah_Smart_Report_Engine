import re

with open('src/components/reports/PrimaryEOTReport.tsx', 'r', encoding='utf-8') as f:
    eot_content = f.read()

# Fix theology mapping in EOT
old_theology = """                  {reportData?.theology?.subjects?.map((subject: any) => {
                    const arabicName = subject.subject_name_arabic === 'التاريخ والسيرة' 
                      ? 'التربية' 
                      : subject.subject_name_arabic;
                    
                    return (
                    <tr key={subject.subject_name_arabic}>
                      <td>{arabicName}</td>
                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject.mot_score)}</td>
                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject.eot_score)}</td>
                      <td className="remarks-cell">
                        {subject.theology_remark ?? ''}
                      </td>
                    </tr>
                  )})}"""

new_theology = """                  {[
                    'القرآن الكريم',
                    'اللغة العربية',
                    'الفقه الإسلامي',
                    'التربية الإسلامية'
                  ].map((arabicName) => {
                    const subject = reportData?.theology?.subjects?.find((s: any) => {
                      const dbName = s.subject_name_arabic === 'التاريخ والسيرة' ? 'التربية' : (s.subject_name_arabic || '');
                      return arabicName.includes(dbName) || dbName.includes(arabicName.split(' ')[0]);
                    });
                    return (
                    <tr key={arabicName}>
                      <td>{arabicName}</td>
                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject?.mot_score)}</td>
                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject?.eot_score)}</td>
                      <td className="remarks-cell">
                        {subject?.theology_remark ?? ''}
                      </td>
                    </tr>
                  )})}"""

eot_content = eot_content.replace(old_theology, new_theology)
with open('src/components/reports/PrimaryEOTReport.tsx', 'w', encoding='utf-8') as f:
    f.write(eot_content)

# Now create MOT from EOT
mot_content = eot_content.replace('PrimaryEOTReport', 'PrimaryMOTReport')
mot_content = mot_content.replace('END OF TERM', 'MID TERM')

mot_academic_headers_old = """                    <th colSpan={2}>BEGINNING OF TERM</th>
                    <th colSpan={2}>MIDTERM</th>
                    <th colSpan={2}>END OF TERM</th>"""
mot_academic_headers_new = """                    <th colSpan={2}>BEGINNING OF TERM</th>
                    <th colSpan={2}>MIDTERM</th>"""
mot_content = mot_content.replace(mot_academic_headers_old, mot_academic_headers_new)

mot_academic_sub_old = """                    <th style={{ width: '8%' }}>MARK</th><th style={{ width: '8%' }}>AGG</th>
                    <th style={{ width: '8%' }}>MARK</th><th style={{ width: '8%' }}>AGG</th>
                    <th style={{ width: '8%' }}>MARK</th><th style={{ width: '8%' }}>AGG</th>"""
mot_academic_sub_new = """                    <th style={{ width: '12%' }}>MARK</th><th style={{ width: '12%' }}>AGG</th>
                    <th style={{ width: '12%' }}>MARK</th><th style={{ width: '12%' }}>AGG</th>"""
mot_content = mot_content.replace(mot_academic_sub_old, mot_academic_sub_new)

mot_academic_row_old = """      <td className="data-cell">{subject.bot_score ?? '--'}</td>
      <td className="data-cell">{subject.bot_grade_display ?? '--'}</td>
      <td className="data-cell">{subject.mot_score ?? '--'}</td>
      <td className="data-cell">{subject.mot_grade_display ?? '--'}</td>
      <td className="data-cell">{subject.eot_score ?? '--'}</td>
      <td className="data-cell">{subject.eot_grade_display ?? '--'}</td>"""
mot_academic_row_new = """      <td className="data-cell">{subject.bot_score ?? '--'}</td>
      <td className="data-cell">{subject.bot_grade_display ?? '--'}</td>
      <td className="data-cell">{subject.mot_score ?? '--'}</td>
      <td className="data-cell">{subject.mot_grade_display ?? '--'}</td>"""
mot_content = mot_content.replace(mot_academic_row_old, mot_academic_row_new)

mot_academic_total_old = """                  <td>{reportData?.circular?.bot_total ?? '--'}</td>
                  <td>--</td>
                  <td>{reportData?.circular?.mot_total ?? '--'}</td>
                  <td>--</td>
                  <td>{reportData?.circular?.eot_total ?? '--'}</td>
                  <td>{reportData?.circular?.aggregates ?? '--'}</td>"""
mot_academic_total_new = """                  <td>{reportData?.circular?.bot_total ?? '--'}</td>
                  <td>--</td>
                  <td>{reportData?.circular?.mot_total ?? '--'}</td>
                  <td>{reportData?.circular?.aggregates ?? '--'}</td>"""
mot_content = mot_content.replace(mot_academic_total_old, mot_academic_total_new)


# MOT Theology table
mot_theo_header_old = """                  <tr>
                    <th rowSpan={2} style={{ width: '22%' }}>المواد</th>
                    <th colSpan={2} style={{ width: '26%' }}>منتصف الفترة</th>
                    <th colSpan={2} style={{ width: '26%' }}>نهاية الفترة</th>
                    <th rowSpan={2} style={{ width: '26%' }}>الملاحظات</th>
                  </tr>
                  <tr>
                    <th className="th-subhead" style={{ width: '13%' }}>
                      الدرجة الكبرى
                    </th>
                    <th className="th-subhead" style={{ width: '13%' }}>
                      الدرجة الصغرى
                    </th>
                    <th className="th-subhead" style={{ width: '13%' }}>
                      الدرجة الكبرى
                    </th>
                    <th className="th-subhead" style={{ width: '13%' }}>
                      الدرجة الصغرى
                    </th>
                  </tr>"""
mot_theo_header_new = """                  <tr>
                    <th style={{ width: '22%' }}>المواد</th>
                    <th style={{ width: '26%' }}>الدرجة الكبرى</th>
                    <th style={{ width: '26%' }}>الدرجة الصغرى</th>
                    <th style={{ width: '26%' }}>الملاحظات</th>
                  </tr>"""
mot_content = mot_content.replace(mot_theo_header_old, mot_theo_header_new)

mot_theo_row_old = """                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject?.mot_score)}</td>
                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject?.eot_score)}</td>"""
mot_theo_row_new = """                      <td className="data-cell">{toAr(100)}</td>
                      <td className="data-cell">{toAr(subject?.score)}</td>"""
mot_content = mot_content.replace(mot_theo_row_old, mot_theo_row_new)

mot_theo_tot_old = """                    <td>
                      {toAr(
                        reportData?.theology?.subjects?.length
                          ? reportData.theology.subjects.length * 100
                          : 400
                      )}
                    </td>
                    <td>{toAr(reportData?.theology?.mot_total)}</td>
                    <td>
                      {toAr(
                        reportData?.theology?.subjects?.length
                          ? reportData.theology.subjects.length * 100
                          : 400
                      )}
                    </td>
                    <td>{toAr(reportData?.theology?.eot_total)}</td>"""
mot_theo_tot_new = """                    <td>
                      {toAr(
                        reportData?.theology?.subjects?.length
                          ? reportData.theology.subjects.length * 100
                          : 400
                      )}
                    </td>
                    <td>{toAr(reportData?.theology?.total)}</td>"""
mot_content = mot_content.replace(mot_theo_tot_old, mot_theo_tot_new)
mot_content = mot_content.replace('theology?.eot_total', 'theology?.total')

with open('src/components/reports/PrimaryMOTReport.tsx', 'w', encoding='utf-8') as f:
    f.write(mot_content)

# BOT Report
bot_content = mot_content.replace('PrimaryMOTReport', 'PrimaryBOTReport')
bot_content = bot_content.replace('MID TERM', 'BEGINNING OF TERM')

bot_academic_headers_old = """                    <th colSpan={2}>BEGINNING OF TERM</th>
                    <th colSpan={2}>MIDTERM</th>"""
bot_academic_headers_new = """                    <th colSpan={2}>BEGINNING OF TERM</th>"""
bot_content = bot_content.replace(bot_academic_headers_old, bot_academic_headers_new)

bot_academic_sub_old = """                    <th style={{ width: '12%' }}>MARK</th><th style={{ width: '12%' }}>AGG</th>
                    <th style={{ width: '12%' }}>MARK</th><th style={{ width: '12%' }}>AGG</th>"""
bot_academic_sub_new = """                    <th style={{ width: '24%' }}>MARK</th><th style={{ width: '24%' }}>AGG</th>"""
bot_content = bot_content.replace(bot_academic_sub_old, bot_academic_sub_new)

bot_academic_row_old = """      <td className="data-cell">{subject.bot_score ?? '--'}</td>
      <td className="data-cell">{subject.bot_grade_display ?? '--'}</td>
      <td className="data-cell">{subject.mot_score ?? '--'}</td>
      <td className="data-cell">{subject.mot_grade_display ?? '--'}</td>"""
bot_academic_row_new = """      <td className="data-cell">{subject.score ?? '--'}</td>
      <td className="data-cell">{subject.grade_display ?? '--'}</td>"""
bot_content = bot_content.replace(bot_academic_row_old, bot_academic_row_new)

bot_academic_total_old = """                  <td>{reportData?.circular?.bot_total ?? '--'}</td>
                  <td>--</td>
                  <td>{reportData?.circular?.mot_total ?? '--'}</td>
                  <td>{reportData?.circular?.aggregates ?? '--'}</td>"""
bot_academic_total_new = """                  <td>{reportData?.circular?.total ?? '--'}</td>
                  <td>{reportData?.circular?.aggregates ?? '--'}</td>"""
bot_content = bot_content.replace(bot_academic_total_old, bot_academic_total_new)

with open('src/components/reports/PrimaryBOTReport.tsx', 'w', encoding='utf-8') as f:
    f.write(bot_content)
print("done")
