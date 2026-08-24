const fs = require('fs');
const glob = require('glob'); // Note: glob might not be installed, better use fs.readdirSync recursively
const path = require('path');

function replaceInitials() {
  const dir = 'src/components/reports';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace: <td className="data-cell">{subject.teacher_initials ?? ''}</td>
    // Replace: <td>{subject.teacher_initials ?? ''}</td>
    // Replace: <td>{subject.teacher_initials ?? ""}</td>
    const regex1 = /<td className="data-cell">\{subject\.teacher_initials \?\? ['"]['"]\}<\/td>/g;
    const regex2 = /<td>\{subject\.teacher_initials \?\? ['"]['"]\}<\/td>/g;
    
    const styledHtml = `<td style={{ textTransform: 'uppercase', fontFamily: '"Caveat", cursive', fontWeight: 'bold', fontSize: '1.2em', color: '#047857' }}>{subject.teacher_initials ?? ''}</td>`;
    const styledHtmlDataCell = `<td className="data-cell" style={{ textTransform: 'uppercase', fontFamily: '"Caveat", cursive', fontWeight: 'bold', fontSize: '1.2em', color: '#047857' }}>{subject.teacher_initials ?? ''}</td>`;
    
    content = content.replace(regex1, styledHtmlDataCell);
    content = content.replace(regex2, styledHtml);
    
    // Also we need to add @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');
    // If it doesn't have Caveat, let's inject it into the style block
    if (content.includes('<style') && !content.includes('family=Caveat')) {
      content = content.replace(
        /@import url\('https:\/\/fonts.googleapis.com\/css2\?family=Amiri/g, 
        `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');\n        @import url('https://fonts.googleapis.com/css2?family=Amiri`
      );
      // For templates without Amiri but with Montserrat
      if (!content.includes('family=Amiri')) {
          content = content.replace(
            /@import url\('https:\/\/fonts.googleapis.com\/css2\?family=Montserrat/g, 
            `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');\n        @import url('https://fonts.googleapis.com/css2?family=Montserrat`
          );
      }
    }
    
    fs.writeFileSync(fullPath, content);
  }
}

replaceInitials();
