const fs = require('fs');
const path = require('path');

function replaceInitials() {
  const dir = 'src/components/reports';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace: {subject.teacher_initials ?? ''}
    // Replace: {subject.teacher_initials ?? ""}
    const regex1 = /\{subject\.teacher_initials \?\? ['"]['"]\}/g;
    
    const styledHtml = `{(subject.teacher_initials || '').toUpperCase()}`;
    
    content = content.replace(regex1, styledHtml);
    
    fs.writeFileSync(fullPath, content);
  }
}

replaceInitials();
