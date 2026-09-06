import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

// dist 디렉토리 초기화
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 1. 모든 HTML 파일 복사
const files = fs.readdirSync(rootDir);
for (const file of files) {
  if (file.endsWith('.html')) {
    fs.copyFileSync(path.join(rootDir, file), path.join(distDir, file));
  }
}

// 2. css 및 js 디렉토리 복사
for (const dir of ['css', 'js']) {
  const src = path.join(rootDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(distDir, dir), { recursive: true });
  }
}

// 3. public 정적 에셋 복사
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distDir, { recursive: true });
}

// 4. 루트 정적 설정 파일들 복사
const staticFiles = [
  'manifest.json',
  'app.webmanifest',
  'sw.js',
  'robots.txt',
  'sitemap.xml',
  'vercel.json',
  'favicon.ico',
  'coupang_banner.png',
  'ads.txt'
];

for (const file of staticFiles) {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, file));
  }
}

console.log('✅ [build-dist] 모든 정적 페이지 및 리소스(HTML, CSS, JS, Assets)가 dist에 성공적으로 빌드되었습니다.');
