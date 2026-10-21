import fs from 'node:fs';
import path from 'node:path';

const pdfPath = path.resolve('scratch/theology_4cards_2sheets.pdf');
const buffer = fs.readFileSync(pdfPath);
const textContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 4000));

console.log('PDF File Size:', buffer.length, 'bytes');

// Check PDF headers, objects, pages
const pagesMatch = textContent.match(/\/Count\s+(\d+)/);
console.log('Page Count Match:', pagesMatch ? pagesMatch[1] : 'Unknown');

// Check stream contents
const streamMatches = [...textContent.matchAll(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g)];
console.log('Stream count:', streamMatches.length);
streamMatches.forEach((m, i) => {
  console.log(`Stream ${i + 1} length:`, m[1].length);
  console.log(`Stream ${i + 1} preview:`, JSON.stringify(m[1].slice(0, 100)));
});

// Check text objects
const textObjects = [...textContent.matchAll(/BT[\s\S]*?ET/g)];
console.log('Text blocks (BT...ET):', textObjects.length);
textObjects.forEach((m, i) => {
  console.log(`Text Block ${i + 1}:`, m[0]);
});

console.log('--- Raw Structure Dump ---');
console.log(textContent);
