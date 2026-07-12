const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/JIDDAH/Desktop/jiddah-smart-report-engine/apps/backend/Design_Master_Navigation_Layout_figma/src/app/components';
const files = ['app-sidebar.tsx', 'app-topbar.tsx', 'dashboard-content.tsx'];

files.forEach(file => {
  const filepath = path.join(dir, file);
  let content = fs.readFileSync(filepath, 'utf8');

  // Hex colors
  content = content.replace(/#6366f1/gi, '#10b981'); // indigo-500 -> emerald-500
  content = content.replace(/#8b5cf6/gi, '#059669'); // violet-500 -> emerald-600

  // RGBA colors
  content = content.replace(/99,102,241/g, '16,185,129'); // indigo-500 rgb
  content = content.replace(/139,92,246/g, '5,150,105'); // violet-500 rgb

  // Tailwind classes
  content = content.replace(/indigo/g, 'emerald');
  content = content.replace(/violet/g, 'teal');

  fs.writeFileSync(filepath, content);
  console.log(`Updated ${file}`);
});
