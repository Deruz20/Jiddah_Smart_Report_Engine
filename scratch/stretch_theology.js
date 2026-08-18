const fs = require('fs');

function stretch(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  content = content.replace(
    /\.theology-table th \{/g,
    '.theology-table table { height: 100%; }\n          .theology-table th {'
  );
  fs.writeFileSync(filepath, content);
}

['EOT', 'MOT', 'BOT'].forEach(term => {
  stretch(`src/components/reports/Primary${term}Report.tsx`);
});
console.log('Stretched');
