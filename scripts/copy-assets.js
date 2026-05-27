/* eslint-disable */
const fs = require('fs');
const path = require('path');

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  const destNextDir = path.join('.next', 'standalone', '.next');
  const destPublicDir = path.join('.next', 'standalone', 'public');

  fs.mkdirSync(destNextDir, { recursive: true });
  fs.mkdirSync(destPublicDir, { recursive: true });

  const srcStatic = path.join('.next', 'static');
  const destStatic = path.join(destNextDir, 'static');
  if (fs.existsSync(srcStatic)) {
    copyDirRecursive(srcStatic, destStatic);
    console.log('Successfully copied .next/static to ' + destStatic);
  } else {
    console.warn('Warning: .next/static folder not found');
  }

  const srcPublic = 'public';
  if (fs.existsSync(srcPublic)) {
    copyDirRecursive(srcPublic, destPublicDir);
    console.log('Successfully copied public to ' + destPublicDir);
  } else {
    console.warn('Warning: public folder not found');
  }
  
  console.log('Asset copying completed successfully.');
} catch (error) {
  console.error('Error copying assets:', error);
  process.exit(1);
}
