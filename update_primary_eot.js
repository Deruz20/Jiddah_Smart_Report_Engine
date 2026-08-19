const fs = require('fs');
const filepath = 'src/components/reports/PrimaryEOTReport.tsx';
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes('import { SchoolStamp }')) {
  content = content.replace('import { ReportContainer }', "import { SchoolStamp } from '@/components/reports/SchoolStamp'\nimport { ReportContainer }");
}

const stampRegex = /<div className=\"stamp-circle\">[\s\S]*?<\/div>/g;
if (stampRegex.test(content)) {
  content = content.replace(stampRegex, '<SchoolStamp date={reportData?.term?.end_date} />');
  fs.writeFileSync(filepath, content);
  console.log('Updated PrimaryEOTReport.tsx');
}
