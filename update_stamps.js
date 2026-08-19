const fs = require('fs');
const path = require('path');
const dir = 'src/components/reports';
const files = fs.readdirSync(dir).filter(f => f.endsWith('Report.tsx'));

for (const file of files) {
  const filepath = path.join(dir, file);
  let content = fs.readFileSync(filepath, 'utf8');
  let modified = false;

  if (content.includes('stamp-box') || content.includes('school-stamp')) {
    if (!content.includes('import { SchoolStamp }')) {
      content = content.replace('import { ReportContainer }', "import { SchoolStamp } from '@/components/reports/SchoolStamp'\nimport { ReportContainer }");
      modified = true;
    }
    
    // Replace stamp-box
    const stampBoxRegex = /<div className=\"stamp-box\">[\s\S]*?<\/div>/g;
    if (stampBoxRegex.test(content)) {
      content = content.replace(stampBoxRegex, '<SchoolStamp date={reportData?.term?.end_date} />');
      modified = true;
    }

    // Replace school-stamp img block
    const stampImgRegex = /\{reportData\?\.signatures\?\.\['school-stamp'\][\s\S]*?\}/g;
    if (stampImgRegex.test(content)) {
      content = content.replace(stampImgRegex, '<SchoolStamp date={reportData?.term?.end_date} />');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filepath, content);
      console.log('Updated', file);
    }
  }
}
