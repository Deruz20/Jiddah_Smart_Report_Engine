import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TheologyMOTReport from './src/components/reports/TheologyMOTReport';

// Mock data
const reportData = {
  term: { term_number: 2, academic_year: '2026' },
  student: { name: 'Test', arabic_name: 'تست', theology_class_arabic: 'الاول' },
  theology: {},
  meta: {}
};

console.log("Rendering TheologyMOTReport...");
const html = renderToStaticMarkup(React.createElement(TheologyMOTReport, { reportData, subjects: [], attendance: [] }));

const match = html.match(/<span>الفترة:<\/span><div class="line-dots short"><span class="line-text">([^<]+)<\/span><\/div>/);
if (match) {
  console.log("Rendered Term Number Output: " + match[1].trim());
} else {
  console.log("Could not find the exact pattern. Here is a snippet of the HTML around 'الفترة':");
  const idx = html.indexOf('الفترة');
  console.log(html.substring(idx - 50, idx + 150));
}
