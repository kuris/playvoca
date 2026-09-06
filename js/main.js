/* ============================================================
   단어야 놀자! (PlayVoca) - 메인 홈 스크립트 (main.js)
   - 오늘의 추천 단어 카드 및 발음 재생
   - 카테고리별 단어수 그리드 렌더링
   - 실시간 내 학습 진도 요약
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  const categories = window.VOCA_CATEGORIES || [];
  const vocaData = window.VOCA_DATA || {};

  // 1. 카테고리 그리드 렌더링
  const catGridEl = document.getElementById('category-grid');
  if (catGridEl) {
    catGridEl.innerHTML = categories.map(cat => `
      <div class="category-card">
        <div class="cc-top">
          <div class="cc-icon">${cat.icon}</div>
          <div class="cc-info">
            <h3>${cat.name}</h3>
            <p>${cat.desc}</p>
          </div>
        </div>
        <div class="cc-bottom">
          <span class="cc-count">${cat.count.toLocaleString()}단어</span>
          <a href="learn.html?cat=${cat.id}" class="cc-link">학습하기 <i class="fa-solid fa-arrow-right"></i></a>
        </div>
      </div>
    `).join('');
  }

  // 2. 오늘의 추천 단어
  let allWords = [];
  Object.keys(vocaData).forEach(k => {
    allWords = allWords.concat(vocaData[k]);
  });

  const wordEl = document.getElementById('hero-word');
  const meaningEl = document.getElementById('hero-meaning');
  const pronEl = document.getElementById('hero-pron');
  const catBadgeEl = document.getElementById('hero-cat-badge');
  const speakerBtn = document.getElementById('hero-speaker-btn');
  const nextBtn = document.getElementById('hero-next-btn');

  let currentHeroWord = null;

  function setRandomWord() {
    if (allWords.length === 0) return;
    const randomIndex = Math.floor(Math.random() * allWords.length);
    currentHeroWord = allWords[randomIndex];

    if (wordEl) wordEl.textContent = currentHeroWord.word;
    if (meaningEl) meaningEl.textContent = currentHeroWord.meaning;
    if (pronEl) pronEl.textContent = currentHeroWord.pron || '';
    if (catBadgeEl) {
      const catObj = categories.find(c => c.id === currentHeroWord.cat);
      catBadgeEl.textContent = catObj ? `${catObj.icon} ${catObj.name}` : currentHeroWord.cat;
    }
  }

  setRandomWord();

  if (speakerBtn) {
    speakerBtn.addEventListener('click', () => {
      if (currentHeroWord && window.VocaTTS) {
        window.VocaTTS.speak(currentHeroWord.word, currentHeroWord.lang || 'en');
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      setRandomWord();
    });
  }

  // 3. 내 학습 통계 업데이트
  function updateStats() {
    const learned = JSON.parse(localStorage.getItem('voca_learned_ids') || '[]');
    const bookmarks = JSON.parse(localStorage.getItem('voca_bookmark_ids') || '[]');

    const statLearned = document.getElementById('stat-learned-count');
    const statBookmarked = document.getElementById('stat-bookmark-count');
    const statTotal = document.getElementById('stat-total-count');

    if (statLearned) statLearned.textContent = learned.length.toLocaleString();
    if (statBookmarked) statBookmarked.textContent = bookmarks.length.toLocaleString();
    if (statTotal) statTotal.textContent = allWords.length.toLocaleString();
  }

  updateStats();
  document.addEventListener('voca:progress-synced', updateStats);
});
