// Gom các file game vào thư mục www/ để Capacitor đóng gói thành app Android.
// Chỉ chép những gì game cần khi chạy (không chép tests, docs, android, node_modules...).
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const OUT = 'www';
const FILES = ['index.html', 'manifest.json'];
const DIRS = ['css', 'js', 'vendor', 'icons'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
FILES.forEach((f) => cpSync(f, `${OUT}/${f}`));
DIRS.forEach((d) => cpSync(d, `${OUT}/${d}`, { recursive: true }));
console.log('Đã gom file game vào www/');
