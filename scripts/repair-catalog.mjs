import fs from 'fs';

let content = fs.readFileSync('scratch/raw_pasted_catalog.txt', 'utf8');

// Find the truncation marker or last complete object in columns
const lastCompleteObjIdx = content.lastIndexOf('},{"table":"teacher_initials","column":"created_at"');
if (lastCompleteObjIdx !== -1) {
  // include up to the created_at entry
  const endOfCreatedAt = content.indexOf('}', lastCompleteObjIdx + 1);
  const repaired = content.substring(0, endOfCreatedAt + 1) + ']}';
  try {
    const data = JSON.parse(repaired);
    console.log('Successfully repaired catalog JSON!');
    console.log('Tables:', data.tables.length);
    console.log('Policies:', data.policies.length);
    console.log('Grants:', data.grants.length);
    console.log('Columns:', data.columns.length);
    fs.writeFileSync('scratch/production_catalog.json', JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Repair parse error:', err.message);
  }
} else {
  console.log('Could not find last complete object marker');
}
