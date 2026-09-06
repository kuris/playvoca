/* ============================================================
   단어야 놀자! (PlayVoca) - A4 단어 시험지 & 깜지 출력 스크립트 (worksheet.js)
   - 카테고리별 단어 선택 및 20/40/60개 A4 표준 인쇄
   - 깜지 쓰기 모드 / 단어 테스트(뜻 쓰기) / 뜻 테스트(철자 쓰기) 지원
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  const categories = window.VOCA_CATEGORIES || [];
  const vocaData = window.VOCA_DATA || {};

  const catSelectEl = document.getElementById('ws-cat-select');
  const countSelectEl = document.getElementById('ws-count-select');
  const modeSelectEl = document.getElementById('ws-mode-select');
  const paperContainer = document.getElementById('worksheet-paper');
  const printBtn = document.getElementById('btn-print-ws');

  if (catSelectEl) {
    catSelectEl.innerHTML = categories.map(c => `
      <option value="${c.id}">${c.icon} ${c.name}</option>
    `).join('');
  }

  function renderWorksheet() {
    if (!paperContainer) return;
    const cat = catSelectEl ? catSelectEl.value : 'toeic';
    const count = countSelectEl ? parseInt(countSelectEl.value, 10) : 20;
    const mode = modeSelectEl ? modeSelectEl.value : 'test_meaning'; // 'test_meaning' | 'test_word' | 'drill'

    const pool = vocaData[cat] || [];
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, count);

    const catObj = categories.find(c => c.id === cat) || { name: '단어장' };
    const dateStr = new Date().toISOString().slice(0, 10);

    let rowsHtml = '';
    shuffled.forEach((w, i) => {
      let col1 = '', col2 = '', col3 = '';

      if (mode === 'test_meaning') {
        // 단어 주어지고 뜻 쓰기
        col1 = `<strong>${escapeHtml(w.word)}</strong>${w.pron ? `<br><small style="color:#888;">${escapeHtml(w.pron)}</small>` : ''}`;
        col2 = `<div style="border-bottom: 1.5px solid #ccc; height: 32px; width: 100%;"></div>`;
      } else if (mode === 'test_word') {
        // 뜻 주어지고 단어 쓰기
        col1 = `<div style="border-bottom: 1.5px solid #ccc; height: 32px; width: 100%;"></div>`;
        col2 = `<span>${escapeHtml(w.meaning)}</span>`;
      } else {
        // 깜지 쓰기 모드 (단어 + 뜻 + 3칸 따라쓰기)
        col1 = `<strong>${escapeHtml(w.word)}</strong>`;
        col2 = `<span>${escapeHtml(w.meaning)}</span>`;
        col3 = `
          <div style="display:flex;gap:6px;width:100%;">
            <div style="border:1px dashed #bbb;height:32px;flex:1;"></div>
            <div style="border:1px dashed #bbb;height:32px;flex:1;"></div>
            <div style="border:1px dashed #bbb;height:32px;flex:1;"></div>
          </div>
        `;
      }

      rowsHtml += `
        <tr style="border-bottom: 1px solid #e5e5e5; height: 44px;">
          <td style="width: 40px; text-align: center; color: #888; font-size: 0.85rem;">${i + 1}</td>
          <td style="padding: 6px 12px; font-size: 1rem;">${col1}</td>
          <td style="padding: 6px 12px; font-size: 0.95rem;">${col2}</td>
          ${mode === 'drill' ? `<td style="padding: 6px 12px;">${col3}</td>` : ''}
        </tr>
      `;
    });

    paperContainer.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 12px; border: 1px solid #ddd; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0 0 6px; font-size: 1.6rem; color: #222;">단어야 놀자! - ${catObj.name}</h2>
            <div style="font-size: 0.88rem; color: #666;">
              ${mode === 'drill' ? '손으로 직접 쓰는 단어 깜지 연습장' : '실전 단어 테스트지'} | 총 ${shuffled.length}문항
            </div>
          </div>
          <div style="text-align: right; font-size: 0.85rem; color: #555;">
            <div>출력일: ${dateStr}</div>
            <div style="margin-top: 4px;">이름: ______________ 점수: ____ / ${shuffled.length}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8f8f8; border-bottom: 2px solid #ddd; font-size: 0.9rem; color: #555;">
              <th style="padding: 8px; width: 40px;">No</th>
              <th style="padding: 8px; text-align: left;">${mode === 'test_word' ? '단어 쓰기' : '영단어 (Word)'}</th>
              <th style="padding: 8px; text-align: left;">${mode === 'test_meaning' ? '뜻 쓰기' : '한국어 뜻 (Meaning)'}</th>
              ${mode === 'drill' ? '<th style="padding: 8px; text-align: center;">따라쓰기 연습 (3회)</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="text-align: center; margin-top: 30px; font-size: 0.78rem; color: #aaa;">
          단어야 놀자! (voca.chatgpts.kr) - 매일 10분 꾸준한 단어 학습
        </div>
      </div>
    `;
  }

  if (catSelectEl) catSelectEl.addEventListener('change', renderWorksheet);
  if (countSelectEl) countSelectEl.addEventListener('change', renderWorksheet);
  if (modeSelectEl) modeSelectEl.addEventListener('change', renderWorksheet);

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  renderWorksheet();
});
