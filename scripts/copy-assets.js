const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

try {
  const base = '.next/standalone';
  // Static files
  const staticDir = '.next/static';
  if (fs.existsSync(staticDir)) {
    copyDir(staticDir, path.join(base, '.next/static'));
    console.log('Copied .next/static');
  }
  // Public dir
  if (fs.existsSync('public')) {
    copyDir('public', path.join(base, 'public'));
    console.log('Copied public');
  }
  console.log('Done');
} catch (e) {
  console.error(e);
  process.exit(1);
}
