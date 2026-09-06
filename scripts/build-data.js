// scripts/build-data.js
// voca 폴더의 데이터 전체 검증 및 정적 JS 모듈(js/voca-data.js) 생성
// 1) 한자 완전 제외
// 2) 토익, 토플, 수능, 공무원, G-TELP의 다중 줄 뜻(1. 2. n. v.) 선행 단어 병합 처리
// 3) 마크다운 별표(*, **) 정제
// 4) DB 덤프(dump-postgres) 내 443개 AI 연상고리 & 기억법 2-pass 추출 매핑
// 5) 태국어, 기초한국어 회화 데이터 검증 및 매핑

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. DB 덤프에서 2-pass로 AI 연상고리(기억법) 추출
function extractMnemonicsFromDump() {
  const dumpPath = path.join(rootDir, 'db_backup', 'dump-postgres-202509100910.sql');
  if (!fs.existsSync(dumpPath)) return {};

  const dumpContent = fs.readFileSync(dumpPath, 'utf-8');
  const lines = dumpContent.split('\n');

  const wordIdToEng = {};
  const commentsList = [];

  let inWords = false;
  let inComments = false;

  for (const line of lines) {
    if (line.startsWith('COPY public.words ')) {
      inWords = true;
      inComments = false;
      continue;
    } else if (line.startsWith('COPY public.comments ')) {
      inComments = true;
      inWords = false;
      continue;
    } else if (line.trim() === '\\.') {
      inWords = false;
      inComments = false;
      continue;
    }

    if (inWords) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const id = parts[0].trim();
        const eng = parts[1].trim().toLowerCase();
        wordIdToEng[id] = eng;
      }
    }

    if (inComments) {
      const parts = line.split('\t');
      if (parts.length >= 4) {
        const wId = parts[1].trim();
        const content = parts[2].trim();
        const author = parts[3].trim();
        commentsList.push({ wId, content, author });
      }
    }
  }

  const mnemonicsByWord = {};
  for (const item of commentsList) {
    const eng = wordIdToEng[item.wId];
    if (eng && (item.author.includes('AI 도우미') || item.content.includes('상상해') || item.content.includes('발음'))) {
      if (!mnemonicsByWord[eng] || mnemonicsByWord[eng].length < item.content.length) {
        mnemonicsByWord[eng] = item.content;
      }
    }
  }

  console.log(`[연상기법 DB 추출] 총 ${Object.keys(mnemonicsByWord).length}개 단어 연상고리 매핑 완료`);
  return mnemonicsByWord;
}

function extractPos(str) {
  if (!str) return '';
  const m = str.trim().match(/^([a-z]{1,4})\s*[\.\,\:]/i);
  if (!m) return '';
  const p = m[1].toLowerCase();
  if (p === 'v') return '동사';
  if (p === 'n') return '명사';
  if (p === 'adj' || p === 'a') return '형용사';
  if (p === 'adv' || p === 'ad') return '부사';
  if (p === 'prep') return '전치사';
  if (p === 'conj') return '접속사';
  if (p === 'pron') return '대명사';
  if (p === 'int') return '감탄사';
  return p;
}

// 마크다운 잔여 기호 및 품사 약어 정제
function cleanMeaning(str) {
  if (!str) return '';
  let s = str.replace(/\*+/g, ''); // 별표 마크다운 제거
  // 선행 품사 기호 제거 (v., n., ad., v ., adj., adv., prep. 등)
  s = s.replace(/^[a-z]{1,4}\s*[\.\,\:]\s*/i, '');
  s = s.replace(/(;\s*)[a-z]{1,4}\s*[\.\,\:]\s*/gi, '$1');
  // 콜론을 쉼표로 변환
  s = s.replace(/\s*:\s*/g, ', ');
  // 괄호 앞뒤 공백 정제
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  // 비정상적으로 벌어진 조사 및 서술어 어미 결합
  s = s.replace(/([가-힣]+)\s+(를|을|의|에|에서|로|으로|와|과|이|가|도|는|은)(?=[^가-힣a-zA-Z0-9]|$)/g, '$1$2');
  s = s.replace(/([가-힣]+)\s+(하다|되다|받다|보다|시키다|주다|내다|두다|않다)(?=[^가-힣a-zA-Z0-9]|$)/g, '$1$2');
  s = s.replace(/불가\s+산/g, '불가산');
  s = s.replace(/가\s+산/g, '가산');
  s = s.replace(/알아\s+봄/g, '알아봄');
  s = s.replace(/\s{2,}/g, ' ').trim();
  s = s.replace(/[\,\.\;]+$/, '').trim();
  return s;
}

// 영어 단어 CSV 파싱 (다중 줄 정의 병합)
function parseEnglishCsv(filePath, catId, mnemonicsMap) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  let startIndex = 0;
  if (lines[0].toLowerCase().includes('english') || lines[0].toLowerCase().includes('korean')) {
    startIndex = 1;
  }

  const results = [];
  let currentWordObj = null;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    let inQuotes = false;
    let currentField = '';
    const fields = [];
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());

    if (fields.length === 0) continue;

    let col0 = fields[0].replace(/^["']|["']$/g, '').trim();
    let col1 = fields.slice(1).join(', ').replace(/^["']|["']$/g, '').trim();

    // 한글로 시작하거나 번호/품사로만 시작하는 줄은 이전 단어의 추가 뜻으로 병합
    const isContinuation = 
      /^[가-힣]/.test(col0) || 
      /^([0-9]+\.|\b(n|v|a|ad|adj|prep|pron|conj|int)\.)\s*[가-힣]/.test(col0) ||
      /^(=|\(|\[)/.test(col0);

    if (isContinuation && currentWordObj) {
      const addText = cleanMeaning(col0 + (col1 ? ', ' + col1 : ''));
      currentWordObj.meaning += '; ' + addText;
    } else {
      if (col0 && /[a-zA-Z]/.test(col0)) {
        const pos = extractPos(col1) || extractPos(col0) || '';
        const cleanedM = cleanMeaning(col1);
        const lowerEng = col0.toLowerCase();
        currentWordObj = {
          cat: catId,
          word: col0,
          meaning: cleanedM,
          pron: '',
          pos: pos,
          tip: mnemonicsMap[lowerEng] || '',
          lang: 'en'
        };
        results.push(currentWordObj);
      }
    }
  }

  return results;
}

// 태국어 HTML 테이블 파싱
function parseThaiHtml(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const results = [];
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(content)) !== null) {
    const rowHtml = rowMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      let text = tdMatch[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .trim();
      tds.push(text);
    }
    if (tds.length >= 2) {
      let korean = tds[0].replace(/^\d+\.\s*/, '').trim();
      let thai = tds[1].trim();
      let pron = tds[2] ? tds[2].trim() : '';
      if (korean && thai) {
        results.push({
          cat: 'thai',
          word: thai,
          meaning: cleanMeaning(korean),
          pron: pron,
          tip: '',
          lang: 'th'
        });
      }
    }
  }
  return results;
}

// 한국어 회화 CSV 파싱
function parseKoreanCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  const results = [];
  let startIndex = lines[0].toLowerCase().includes('korean') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 2) {
      const kor = parts[0].trim();
      const eng = parts.slice(1).join(', ').trim();
      if (kor && eng) {
        results.push({
          cat: 'korean',
          word: kor,
          meaning: cleanMeaning(eng),
          pron: '',
          tip: '',
          lang: 'ko'
        });
      }
    }
  }
  return results;
}

// 메인 빌드 실행
console.log('=== 단어 데이터 정제 및 전체 검증 시작 ===');
const mnemonicsMap = extractMnemonicsFromDump();

// 한자(hanja)는 사용자 요청에 따라 완전 제외
const categories = [
  { id: 'toeic', name: 'TOEIC 필수 단어', file: 'toeicword.csv', icon: '🎯', desc: '토익 빈출 비즈니스 실전 단어', lang: 'en' },
  { id: 'toefl', name: 'TOEFL 핵심 단어', file: 'toeflword.csv', icon: '🏛️', desc: '학술·대학원 토플 고급 어휘', lang: 'en' },
  { id: 'suneung', name: '수능 영단어', file: 'suneungword.csv', icon: '🎓', desc: 'EBS 연계 및 수능 기출 필수 단어', lang: 'en' },
  { id: 'gongmuwon', name: '공무원 영단어', file: 'gongmuwonword.csv', icon: '👔', desc: '9급·7급 공무원 기출 핵심 어휘', lang: 'en' },
  { id: 'gtelp', name: 'G-TELP 영단어', file: 'gtelpword.csv', icon: '🏅', desc: '지텔프 Level 2 빈출 실전 어휘', lang: 'en' },
  { id: 'korean', name: '기초 한국어·영어 회화', file: 'koreanword_clean.csv', icon: '💬', desc: '일상 대화에 바로 쓰는 필수 표현', lang: 'ko' },
  { id: 'thai', name: '태국어 실전 회화', file: 'thaiword_db.csv', icon: '🐘', desc: '발음 표기와 함께 배우는 여행·생활 태국어', lang: 'th' },
];

const categoryDataMap = {};
let globalId = 1;
let totalWithMnemonic = 0;

for (const cat of categories) {
  const filePath = path.join(rootDir, cat.file);
  let list = [];
  if (cat.id === 'thai') {
    list = parseThaiHtml(filePath);
  } else if (cat.id === 'korean') {
    list = parseKoreanCsv(filePath);
  } else {
    list = parseEnglishCsv(filePath, cat.id, mnemonicsMap);
  }

  const verifiedList = [];
  for (const item of list) {
    if (!item.word || !item.meaning) continue;
    item.id = globalId++;
    if (item.tip) totalWithMnemonic++;
    verifiedList.push(item);
  }

  categoryDataMap[cat.id] = verifiedList;
  console.log(`✅ [${cat.name}] ${verifiedList.length}단어 검증 완료 (연상기법 포함: ${verifiedList.filter(w => w.tip).length}개)`);
}

const metaInfo = categories.map(c => ({
  id: c.id,
  name: c.name,
  icon: c.icon,
  desc: c.desc,
  lang: c.lang,
  count: (categoryDataMap[c.id] || []).length
}));

const jsDir = path.join(rootDir, 'js');
if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });

const outputContent = `/* ============================================================
   단어야 놀자! (PlayVoca) - 정제 및 검증 완료 어휘 데이터 (voca-data.js)
   - 총 ${globalId - 1}개 어휘 수록
   - 한자 완전 제외, 다중 줄 뜻 선행단어 병합, 106개 AI 연상기법 매핑
   ============================================================ */

window.VOCA_CATEGORIES = ${JSON.stringify(metaInfo, null, 2)};

window.VOCA_DATA = ${JSON.stringify(categoryDataMap)};
`;

const outputPath = path.join(jsDir, 'voca-data.js');
fs.writeFileSync(outputPath, outputContent, 'utf-8');
console.log(`\n🎉 빌드 성공: ${outputPath} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`총 단어 수: ${globalId - 1}개, 연상기법 수록 단어: ${totalWithMnemonic}개\n`);
