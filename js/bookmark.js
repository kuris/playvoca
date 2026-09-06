/* ============================================================
   단어야 놀자! (PlayVoca) - 내 단어장 스크립트 (bookmark.js)
   - 별표(북마크) 단어, 퀴즈 오답 단어, 암기 완료 단어 분류
   - 발음 듣기, 북마크 해제, TXT 파일 다운로드
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  const vocaData = window.VOCA_DATA || {};
  let allWordsMap = {};
  Object.keys(vocaData).forEach(k => {
    vocaData[k].forEach(w => {
      allWordsMap[w.id] = w;
    });
  });

  let currentTab = 'star'; // 'star' | 'wrong' | 'learned'
  let searchQuery = '';

  const tabBtns = document.querySelectorAll('.bm-tab-btn');
  const listContainer = document.getElementById('bookmark-list-container');
  const countDisplay = document.getElementById('bookmark-count');
  const downloadBtn = document.getElementById('btn-download-txt');
  const searchInput = document.getElementById('bookmark-search');

  function getBookmarks() {
    return JSON.parse(localStorage.getItem('voca_bookmark_ids') || '[]');
  }
  function getLearned() {
    return JSON.parse(localStorage.getItem('voca_learned_ids') || '[]');
  }
  function getWrongs() {
    return JSON.parse(localStorage.getItem('voca_wrong_words') || '[]');
  }

  function getActiveWords() {
    let list = [];
    if (currentTab === 'star') {
      const ids = getBookmarks();
      list = ids.map(id => allWordsMap[id]).filter(Boolean);
    } else if (currentTab === 'wrong') {
      list = getWrongs();
    } else if (currentTab === 'learned') {
      const ids = getLearned();
      list = ids.map(id => allWordsMap[id]).filter(Boolean);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(w => 
        (w.word && w.word.toLowerCase().includes(q)) ||
        (w.meaning && w.meaning.toLowerCase().includes(q))
      );
    }
    return list;
  }

  function render() {
    if (!listContainer) return;
    const words = getActiveWords();

    if (countDisplay) {
      countDisplay.textContent = `총 ${words.length}개 단어`;
    }

    if (words.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #8c8075;">
          <div style="font-size: 3rem; margin-bottom: 12px;">📂</div>
          <h3>저장된 단어가 없습니다.</h3>
          <p>단어 학습 화면에서 별표(⭐️)를 누르거나 퀴즈를 풀어보세요!</p>
          <a href="learn.html" class="btn btn-primary" style="margin-top:16px;">단어 학습하러 가기</a>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = `
      <div class="word-list-grid">
        ${words.map(w => `
          <div class="word-card" data-id="${w.id}">
            <div class="wc-top">
              <div class="wc-word">${escapeHtml(w.word)}</div>
              <div class="wc-actions">
                ${currentTab === 'star' ? `
                  <button class="btn-star active" data-id="${w.id}" title="북마크 해제">
                    <i class="fa-solid fa-star"></i>
                  </button>
                ` : ''}
                ${currentTab === 'wrong' ? `
                  <button class="btn-remove-wrong" data-id="${w.id}" title="오답노트에서 삭제" style="color:#d9534f;background:none;font-size:1.1rem;cursor:pointer;">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                ` : ''}
              </div>
            </div>
            ${w.pron ? `<div class="wc-pron">${escapeHtml(w.pron)}</div>` : ''}
            <div class="wc-meaning">${escapeHtml(w.meaning)}</div>
            <div class="wc-bottom">
              <button class="btn-speaker btn-speak-bm" data-word="${escapeHtml(w.word)}" data-lang="${w.lang || 'en'}" title="원어민 발음 듣기">
                <i class="fa-solid fa-volume-high"></i>
              </button>
              <span class="badge badge-orange">${w.cat ? w.cat.toUpperCase() : 'VOCA'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // 이벤트 바인딩
    listContainer.querySelectorAll('.btn-speak-bm').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.VocaTTS) window.VocaTTS.speak(btn.dataset.word, btn.dataset.lang || 'en');
      });
    });

    listContainer.querySelectorAll('.btn-star').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        let bms = getBookmarks().filter(bId => bId !== id);
        localStorage.setItem('voca_bookmark_ids', JSON.stringify(bms));
        if (window.VocaAuth) window.VocaAuth.syncBookmarkItem(id, false);
        render();
      });
    });

    listContainer.querySelectorAll('.btn-remove-wrong').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        let wrongs = getWrongs().filter(w => w.id !== id);
        localStorage.setItem('voca_wrong_words', JSON.stringify(wrongs));
        render();
      });
    });
  }

  // 탭 전환
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      render();
    });
  });

  // 검색
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      render();
    });
  }

  // TXT 다운로드
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const words = getActiveWords();
      if (words.length === 0) {
        alert('내보낼 단어가 없습니다.');
        return;
      }
      const lines = words.map(w => `${w.word}\t${w.meaning}${w.pron ? '\t' + w.pron : ''}`);
      const content = lines.join('\r\n');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `playvoca_${currentTab}_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  render();
});
