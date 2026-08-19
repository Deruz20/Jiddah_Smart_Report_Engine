const fs = require('fs');
const filepath = 'src/components/reports/NurseryTheologyEOTReport.tsx';
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes('import { SchoolStamp }')) {
  content = content.replace('import { ReportContainer }', "import { SchoolStamp } from '@/components/reports/SchoolStamp'\nimport { ReportContainer }");
}

let modified = false;
const stampBoxRegex = /<div className=\"stamp-(?:box|circle)\">[\s\S]*?<\/div>/g;
if (stampBoxRegex.test(content)) {
  content = content.replace(stampBoxRegex, '<SchoolStamp date={reportData?.term?.end_date} />');
  modified = true;
}

const stampImgRegex = /\{reportData\?\.signatures\?\.\['school-stamp'\][\s\S]*?\}/g;
if (stampImgRegex.test(content)) {
  content = content.replace(stampImgRegex, '<SchoolStamp date={reportData?.term?.end_date} />');
  modified = true;
}

if (modified) {
  fs.writeFileSync(filepath, content);
  console.log('Updated NurseryTheologyEOTReport.tsx');
}
