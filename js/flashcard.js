/* ============================================================
   단어야 놀자! (PlayVoca) - 플래시카드 깜빡이 스크립트 (flashcard.js)
   - 3D 카드 뒤집기 애니메이션 (클릭/스페이스바)
   - 1.5초 / 2초 / 3초 자동 넘김 모드
   - 단어 전환 시 원어민 발음 자동 재생 옵션
   - 키보드 단축키(←, →, Space) 지원
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  const categories = window.VOCA_CATEGORIES || [];
  const vocaData = window.VOCA_DATA || {};

  let activeCat = 'toeic';
  let wordList = [];
  let currentIndex = 0;
  let isFlipped = false;
  let autoPlayTimer = null;
  let autoInterval = 2000;
  let autoPronounce = true;

  // DOM 요소
  const cardEl = document.getElementById('flashcard');
  const fcWordEl = document.getElementById('fc-word');
  const fcPronEl = document.getElementById('fc-pron');
  const fcMeaningEl = document.getElementById('fc-meaning');
  const catSelectEl = document.getElementById('fc-cat-select');
  const progressTextEl = document.getElementById('fc-progress-text');
  const prevBtn = document.getElementById('fc-prev-btn');
  const nextBtn = document.getElementById('fc-next-btn');
  const flipBtn = document.getElementById('fc-flip-btn');
  const shuffleBtn = document.getElementById('fc-shuffle-btn');
  const autoPlayBtn = document.getElementById('fc-autoplay-btn');
  const intervalSelectEl = document.getElementById('fc-interval-select');
  const autoAudioCheckEl = document.getElementById('fc-auto-audio-check');
  const starBtn = document.getElementById('fc-star-btn');
  const checkBtn = document.getElementById('fc-check-btn');
  const speakBtn = document.getElementById('fc-speak-btn');

  // 카테고리 셀렉트 박스 세팅
  if (catSelectEl) {
    catSelectEl.innerHTML = categories.map(c => `
      <option value="${c.id}">${c.icon} ${c.name} (${c.count}단어)</option>
    `).join('');
    catSelectEl.addEventListener('change', (e) => {
      activeCat = e.target.value;
      loadCategory();
    });
  }

  function loadCategory() {
    wordList = [...(vocaData[activeCat] || [])];
    currentIndex = 0;
    renderCard();
  }

  function getLearned() {
    return JSON.parse(localStorage.getItem('voca_learned_ids') || '[]');
  }
  function getBookmarks() {
    return JSON.parse(localStorage.getItem('voca_bookmark_ids') || '[]');
  }

  function renderCard() {
    if (wordList.length === 0) return;
    const current = wordList[currentIndex];

    // 뒤집기 상태 리셋
    isFlipped = false;
    if (cardEl) cardEl.classList.remove('flipped');

    if (fcWordEl) fcWordEl.textContent = current.word;
    if (fcPronEl) fcPronEl.textContent = current.pron || '';
    if (fcMeaningEl) fcMeaningEl.textContent = current.meaning;

    // 연상기법 (사전 수록 tip)
    const fcMnemonicEl = document.getElementById('fc-mnemonic');
    const fcMnemonicText = document.getElementById('fc-mnemonic-text');
    const tipText = current.tip || '';
    if (fcMnemonicEl && fcMnemonicText) {
      if (tipText) {
        fcMnemonicText.textContent = tipText;
        fcMnemonicEl.style.display = 'block';
      } else {
        fcMnemonicEl.style.display = 'none';
      }
    }

    if (progressTextEl) {
      progressTextEl.textContent = `${currentIndex + 1} / ${wordList.length.toLocaleString()}`;
    }

    // 북마크 & 암기 상태 버튼 갱신
    const bookmarks = getBookmarks();
    const learned = getLearned();
    const isBookmarked = bookmarks.includes(current.id);
    const isLearned = learned.includes(current.id);

    if (starBtn) {
      starBtn.classList.toggle('active', isBookmarked);
      starBtn.innerHTML = isBookmarked ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    }
    if (checkBtn) {
      checkBtn.classList.toggle('active', isLearned);
      checkBtn.innerHTML = isLearned ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-regular fa-circle-check"></i>';
    }

    // 자동 발음 재생
    if (autoPronounce && window.VocaTTS) {
      window.VocaTTS.speak(current.word, current.lang || 'en');
    }
  }

  function flipCard() {
    isFlipped = !isFlipped;
    if (cardEl) cardEl.classList.toggle('flipped', isFlipped);
  }

  function nextCard() {
    if (currentIndex < wordList.length - 1) {
      currentIndex++;
    } else {
      currentIndex = 0; // 루프
    }
    renderCard();
  }

  function prevCard() {
    if (currentIndex > 0) {
      currentIndex--;
    } else {
      currentIndex = wordList.length - 1;
    }
    renderCard();
  }

  function shuffleList() {
    for (let i = wordList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wordList[i], wordList[j]] = [wordList[j], wordList[i]];
    }
    currentIndex = 0;
    renderCard();
  }

  // 자동 재생 제어
  function toggleAutoPlay() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
      if (autoPlayBtn) {
        autoPlayBtn.classList.remove('btn-primary');
        autoPlayBtn.classList.add('btn-outline');
        autoPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i> 자동 넘김';
      }
    } else {
      autoPlayTimer = setInterval(() => {
        if (!isFlipped) {
          flipCard();
        } else {
          nextCard();
        }
      }, autoInterval);

      if (autoPlayBtn) {
        autoPlayBtn.classList.remove('btn-outline');
        autoPlayBtn.classList.add('btn-primary');
        autoPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i> 정지';
      }
    }
  }

  // 이벤트 연결
  if (cardEl) cardEl.addEventListener('click', flipCard);
  if (flipBtn) flipBtn.addEventListener('click', flipCard);
  if (nextBtn) nextBtn.addEventListener('click', nextCard);
  if (prevBtn) prevBtn.addEventListener('click', prevCard);
  if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleList);
  if (autoPlayBtn) autoPlayBtn.addEventListener('click', toggleAutoPlay);

  if (intervalSelectEl) {
    intervalSelectEl.addEventListener('change', (e) => {
      autoInterval = parseInt(e.target.value, 10);
      if (autoPlayTimer) {
        toggleAutoPlay();
        toggleAutoPlay();
      }
    });
  }

  if (autoAudioCheckEl) {
    autoAudioCheckEl.addEventListener('change', (e) => {
      autoPronounce = e.target.checked;
    });
  }

  if (speakBtn) {
    speakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = wordList[currentIndex];
      if (current && window.VocaTTS) {
        window.VocaTTS.speak(current.word, current.lang || 'en');
      }
    });
  }

  // 별표 북마크
  if (starBtn) {
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = wordList[currentIndex];
      if (!current) return;
      let bookmarks = getBookmarks();
      const exists = bookmarks.includes(current.id);
      if (exists) bookmarks = bookmarks.filter(id => id !== current.id);
      else bookmarks.push(current.id);

      localStorage.setItem('voca_bookmark_ids', JSON.stringify(bookmarks));
      if (window.VocaAuth) window.VocaAuth.syncBookmarkItem(current.id, !exists);
      starBtn.classList.toggle('active', !exists);
      starBtn.innerHTML = !exists ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    });
  }

  // 암기 완료
  if (checkBtn) {
    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = wordList[currentIndex];
      if (!current) return;
      let learned = getLearned();
      const exists = learned.includes(current.id);
      if (exists) learned = learned.filter(id => id !== current.id);
      else learned.push(current.id);

      localStorage.setItem('voca_learned_ids', JSON.stringify(learned));
      if (window.VocaAuth) window.VocaAuth.syncLearnedItem(current.id, !exists);
      checkBtn.classList.toggle('active', !exists);
      checkBtn.innerHTML = !exists ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-regular fa-circle-check"></i>';
    });
  }

  // 키보드 단축키
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      flipCard();
    } else if (e.code === 'ArrowRight') {
      nextCard();
    } else if (e.code === 'ArrowLeft') {
      prevCard();
    }
  });

  // 초기 시작
  loadCategory();
});
