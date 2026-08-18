const fs = require('fs');

function fix(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Fix colSpan={5} to colSpan={6}
  content = content.replace(/<th colSpan=\{5\} className="table-title">/g, '<th colSpan={6} className="table-title">');
  
  // Move the COMMENT header from Row 2 to Row 1
  const oldRow2End = `                    <th colSpan={2}>END OF TERM</th>
                    <th rowSpan={2} style={{ width: "25%" }}>
                      SUBJECT
                      <br />
                      TEACHER'S
                      <br />
                      COMMENT
                    </th>
                  </tr>`;
  const newRow2End = `                    <th colSpan={2}>END OF TERM</th>
                  </tr>`;
                  
  const oldRow1End = `                    <th colSpan={6} className="table-title">
                      COMPARATIVE PERFORMANCE
                    </th>
                  </tr>`;
  const newRow1End = `                    <th colSpan={6} className="table-title">
                      COMPARATIVE PERFORMANCE
                    </th>
                    <th rowSpan={2} style={{ width: "25%" }}>
                      SUBJECT
                      <br />
                      TEACHER'S
                      <br />
                      COMMENT
                    </th>
                  </tr>`;
  
  content = content.replace(oldRow2End, newRow2End);
  content = content.replace(oldRow1End, newRow1End);
  
  // Fix Row 3 to have the empty cell for COMMENT
  const oldRow3End = `<th style={{ width: "8%" }}>AGG</th>
                  </tr>
                </thead>`;
  const newRow3End = `<th style={{ width: "8%" }}>AGG</th>
                    <th></th>
                  </tr>
                </thead>`;
  content = content.replace(oldRow3End, newRow3End);
  
  // Fix theology table subject padding and cell heights
  content = content.replace(/td \{ height: 26px; font-weight: 600; \}/g, 'td { height: 20px; font-weight: 600; }');
  
  fs.writeFileSync(filepath, content);
}

['EOT', 'MOT', 'BOT'].forEach(term => {
  fix(`src/components/reports/Primary${term}Report.tsx`);
});
console.log('Fixed');
