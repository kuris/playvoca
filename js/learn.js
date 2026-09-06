/* ============================================================
   단어야 놀자! (PlayVoca) - 단어 학습 화면 스크립트 (learn.js)
   - 카테고리별 단어 목록 탭 필터링 및 검색
   - 뜻 가리기(블러) 모드 토글
   - 💡 연상고리 & 기억법 표시 및 AI 실시간 생성 버튼 연동
   - Web Speech API 고품질 원어민 발음 듣기
   - 별표 북마크 및 암기 완료 체크
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  const categories = window.VOCA_CATEGORIES || [];
  const vocaData = window.VOCA_DATA || {};

  const urlParams = new URLSearchParams(window.location.search);
  let activeCat = urlParams.get('cat') || 'toeic';
  let searchQuery = '';
  let maskMeanings = false;
  let onlyUnlearned = false;

  let currentPage = 1;
  const pageSize = 40;

  function getLearned() {
    return JSON.parse(localStorage.getItem('voca_learned_ids') || '[]');
  }
  function getBookmarks() {
    return JSON.parse(localStorage.getItem('voca_bookmark_ids') || '[]');
  }

  const tabsContainer = document.getElementById('category-tabs');
  const wordListContainer = document.getElementById('word-list-grid');
  const searchInput = document.getElementById('learn-search');
  const toggleMaskBtn = document.getElementById('toggle-mask-btn');
  const toggleUnlearnedBtn = document.getElementById('toggle-unlearned-btn');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const currentCountEl = document.getElementById('current-count-display');

  // 1. 카테고리 탭
  if (tabsContainer) {
    tabsContainer.innerHTML = categories.map(cat => `
      <button class="cat-tab ${cat.id === activeCat ? 'active' : ''}" data-cat="${cat.id}">
        ${cat.icon} ${cat.name}
      </button>
    `).join('');

    tabsContainer.querySelectorAll('.cat-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCat = btn.dataset.cat;
        currentPage = 1;
        history.replaceState(null, '', `?cat=${activeCat}`);
        renderWords();
      });
    });
  }

  // 2. 단어 필터링
  function getFilteredWords() {
    let list = vocaData[activeCat] || [];
    const learnedIds = getLearned();

    if (onlyUnlearned) {
      list = list.filter(w => !learnedIds.includes(w.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(w => 
        w.word.toLowerCase().includes(q) || 
        w.meaning.toLowerCase().includes(q)
      );
    }
    return list;
  }

  // 3. 단어 카드 렌더링
  function renderWords() {
    if (!wordListContainer) return;

    const filtered = getFilteredWords();
    const total = filtered.length;
    const learnedIds = getLearned();
    const bookmarkIds = getBookmarks();

    if (currentCountEl) {
      currentCountEl.textContent = `총 ${total.toLocaleString()}개 단어`;
    }

    const wordsToShow = filtered.slice(0, currentPage * pageSize);

    if (wordsToShow.length === 0) {
      wordListContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #8c8075;">
          <div style="font-size: 3rem; margin-bottom: 12px;">🔍</div>
          <h3>조건에 맞는 단어가 없습니다.</h3>
          <p>검색어나 필터 설정을 변경해보세요.</p>
        </div>
      `;
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return;
    }

    wordListContainer.innerHTML = wordsToShow.map(w => {
      const isLearned = learnedIds.includes(w.id);
      const isBookmarked = bookmarkIds.includes(w.id);

      // 연상기법 확인 (사전 수록 tip)
      const tipText = w.tip || '';

      return `
        <div class="word-card ${isLearned ? 'learned' : ''}" data-id="${w.id}">
          <div class="wc-top">
            <div class="wc-word">${escapeHtml(w.word)}</div>
            <div class="wc-actions">
              <button class="btn-star ${isBookmarked ? 'active' : ''}" data-id="${w.id}" title="내 단어장에 별표 추가">
                <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-star"></i>
              </button>
              <button class="btn-check ${isLearned ? 'active' : ''}" data-id="${w.id}" title="암기 완료 체크">
                <i class="${isLearned ? 'fa-solid' : 'fa-regular'} fa-circle-check"></i>
              </button>
            </div>
          </div>

          ${w.pron ? `<div class="wc-pron">${escapeHtml(w.pron)}</div>` : ''}

          <div class="wc-meaning ${maskMeanings ? 'masked' : ''}" data-meaning="${escapeHtml(w.meaning)}">
            ${escapeHtml(w.meaning)}
          </div>

          ${tipText ? `
            <!-- 연상기법 & 기억법 영역 -->
            <div class="wc-mnemonic-box" id="mnemonic-box-${w.id}">
              <div class="mnemonic-content">
                <span class="mnemonic-badge"><i class="fa-solid fa-lightbulb"></i> 연상고리</span>
                <p>${escapeHtml(tipText)}</p>
              </div>
            </div>
          ` : ''}

          <div class="wc-bottom">
            <button class="btn-speaker btn-speak-word" data-word="${escapeHtml(w.word)}" data-lang="${w.lang || 'en'}" title="원어민 발음 듣기">
              <i class="fa-solid fa-volume-high"></i>
            </button>
            <span class="badge ${isLearned ? 'badge-green' : 'badge-orange'}">
              ${isLearned ? '암기완료' : '학습중'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    bindCardEvents();

    if (loadMoreBtn) {
      loadMoreBtn.style.display = wordsToShow.length < total ? 'inline-flex' : 'none';
    }
  }

  function bindCardEvents() {
    // 발음 듣기
    wordListContainer.querySelectorAll('.btn-speak-word').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const word = btn.dataset.word;
        const lang = btn.dataset.lang;
        if (window.VocaTTS) window.VocaTTS.speak(word, lang);
      });
    });


    // 별표 북마크 토글
    wordListContainer.querySelectorAll('.btn-star').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordId = parseInt(btn.dataset.id, 10);
        let bookmarks = getBookmarks();
        const exists = bookmarks.includes(wordId);

        if (exists) {
          bookmarks = bookmarks.filter(id => id !== wordId);
          btn.classList.remove('active');
          btn.innerHTML = '<i class="fa-regular fa-star"></i>';
        } else {
          bookmarks.push(wordId);
          btn.classList.add('active');
          btn.innerHTML = '<i class="fa-solid fa-star"></i>';
        }

        localStorage.setItem('voca_bookmark_ids', JSON.stringify(bookmarks));
        if (window.VocaAuth) window.VocaAuth.syncBookmarkItem(wordId, !exists);
      });
    });

    // 암기 완료 토글
    wordListContainer.querySelectorAll('.btn-check').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordId = parseInt(btn.dataset.id, 10);
        let learned = getLearned();
        const card = btn.closest('.word-card');
        const badge = card.querySelector('.wc-bottom .badge');
        const exists = learned.includes(wordId);

        if (exists) {
          learned = learned.filter(id => id !== wordId);
          btn.classList.remove('active');
          btn.innerHTML = '<i class="fa-regular fa-circle-check"></i>';
          card.classList.remove('learned');
          if (badge) {
            badge.className = 'badge badge-orange';
            badge.textContent = '학습중';
          }
        } else {
          learned.push(wordId);
          btn.classList.add('active');
          btn.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
          card.classList.add('learned');
          if (badge) {
            badge.className = 'badge badge-green';
            badge.textContent = '암기완료';
          }
        }

        localStorage.setItem('voca_learned_ids', JSON.stringify(learned));
        if (window.VocaAuth) window.VocaAuth.syncLearnedItem(wordId, !exists);
      });
    });

    // 마스킹 뜻 클릭 시 보이기
    wordListContainer.querySelectorAll('.wc-meaning').forEach(el => {
      el.addEventListener('click', () => {
        if (el.classList.contains('masked')) {
          el.classList.remove('masked');
        }
      });
    });
  }

  // 검색
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value;
        currentPage = 1;
        renderWords();
      }, 250);
    });
  }

  // 뜻 숨김/보기 토글
  if (toggleMaskBtn) {
    toggleMaskBtn.addEventListener('click', () => {
      maskMeanings = !maskMeanings;
      toggleMaskBtn.classList.toggle('active', maskMeanings);
      toggleMaskBtn.innerHTML = maskMeanings ?
        '<i class="fa-solid fa-eye-slash"></i> 뜻 숨김 켬' :
        '<i class="fa-solid fa-eye"></i> 뜻 보기 모드';
      renderWords();
    });
  }

  // 미암기 단어만 보기 토글
  if (toggleUnlearnedBtn) {
    toggleUnlearnedBtn.addEventListener('click', () => {
      onlyUnlearned = !onlyUnlearned;
      toggleUnlearnedBtn.classList.toggle('active', onlyUnlearned);
      currentPage = 1;
      renderWords();
    });
  }

  // 더보기
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentPage++;
      renderWords();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  renderWords();
  document.addEventListener('voca:progress-synced', renderWords);
});
