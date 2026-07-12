const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/JIDDAH/Desktop/jiddah-smart-report-engine/apps/backend/Design_Master_Navigation_Layout_figma/src/app/components';
const layoutDest = 'c:/Users/JIDDAH/Desktop/jiddah-smart-report-engine/apps/backend/src/components/layout';
const figmaUiDest = 'c:/Users/JIDDAH/Desktop/jiddah-smart-report-engine/apps/backend/src/components/figma-ui';

// Ensure layoutDest exists
if (!fs.existsSync(layoutDest)) {
  fs.mkdirSync(layoutDest, { recursive: true });
}

// Copy layout files
const filesToMove = ['app-sidebar.tsx', 'app-topbar.tsx', 'dashboard-content.tsx', 'mobile-bottom-nav.tsx'];
filesToMove.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(layoutDest, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to layout/`);
  }
});

// Helper to copy dirs recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${entry.name}`);
    }
  }
}

// Copy ui folder
const srcUi = path.join(srcDir, 'ui');
const destUi = path.join(figmaUiDest, 'ui');
if (fs.existsSync(srcUi)) {
  copyDir(srcUi, destUi);
}

console.log('File migration complete.');
