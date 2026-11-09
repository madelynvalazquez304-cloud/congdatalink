import fs from 'fs';
import path from 'path';

const src = path.join(process.cwd(), 'dist');
const dest = path.join(process.cwd(), 'build');

try {
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log('✓ Successfully synced dist to build directory for Render / Static deployment.');
  } else {
    console.warn('Warning: dist directory does not exist to sync to build.');
  }
} catch (error) {
  console.error('Error syncing dist to build:', error);
}
