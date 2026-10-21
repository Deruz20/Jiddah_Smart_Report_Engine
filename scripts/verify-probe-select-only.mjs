import fs from 'fs';

const sql = fs.readFileSync('scripts/prod-schema-probe.sql', 'utf8');
const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'ALTER', 'DROP', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
const regex = new RegExp(`\\b(${forbiddenKeywords.join('|')})\\b`, 'i');

const match = sql.match(regex);
if (match) {
  console.error(`FORBIDDEN MUTATION KEYWORD FOUND: ${match[0]}`);
  process.exit(1);
} else {
  console.log('SELECT-ONLY PROVEN: 0 forbidden mutation keywords found in scripts/prod-schema-probe.sql');
  process.exit(0);
}
