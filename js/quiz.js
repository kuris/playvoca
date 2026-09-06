/* ============================================================
   단어야 놀자! (PlayVoca) - 4지선다 퀴즈 스크립트 (quiz.js)
   - 영단어 보고 뜻 맞추기 / 뜻 보고 영단어 맞추기 4지선다
   - 즉각적인 정답/오답 피드백 및 해설
   - 오답노트 자동 수집 및 재시험
   - Supabase voca.quiz_results 자동 클라우드 저장
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  const categories = window.VOCA_CATEGORIES || [];
  const vocaData = window.VOCA_DATA || {};

  // 상태
  let quizPool = [];
  let questions = [];
  let currentQIndex = 0;
  let score = 0;
  let wrongAnswers = [];
  let currentMode = 'en_ko'; // 'en_ko' | 'ko_en'
  let selectedCat = 'toeic';
  let questionCount = 10;
  let isAnswered = false;

  // 화면 요소
  const setupView = document.getElementById('quiz-setup-view');
  const playView = document.getElementById('quiz-play-view');
  const resultView = document.getElementById('quiz-result-view');

  const catSelectEl = document.getElementById('quiz-cat-select');
  const modeRadios = document.querySelectorAll('input[name="quiz-mode"]');
  const countRadios = document.querySelectorAll('input[name="quiz-count"]');
  const startBtn = document.getElementById('btn-start-quiz');

  const progressBar = document.getElementById('quiz-progress-bar');
  const progressText = document.getElementById('quiz-progress-text');
  const qWordEl = document.getElementById('quiz-q-word');
  const qPromptEl = document.getElementById('quiz-prompt');
  const choicesContainer = document.getElementById('quiz-choices');
  const speakBtn = document.getElementById('quiz-speak-btn');

  const scoreText = document.getElementById('quiz-score-text');
  const scorePercent = document.getElementById('quiz-score-percent');
  const passBadge = document.getElementById('quiz-pass-badge');
  const wrongListContainer = document.getElementById('quiz-wrong-list');
  const retryWrongBtn = document.getElementById('btn-retry-wrong');
  const restartBtn = document.getElementById('btn-restart-quiz');

  // 1. 설정 화면 초기화
  if (catSelectEl) {
    catSelectEl.innerHTML = `
      <option value="all_en">🌟 전체 영어 단어 통합 퀴즈 (9,235단어 - 토익·토플·수능·공무원·지텔프)</option>
      <option value="toeic">🎯 TOEIC 필수 영단어 (1,349단어)</option>
      <option value="toefl">🏛️ TOEFL 핵심 영단어 (2,010단어)</option>
      <option value="suneung">🎓 수능 필수 영단어 (2,125단어)</option>
      <option value="gongmuwon">👔 공무원 필수 영단어 (1,762단어)</option>
      <option value="gtelp">🏅 G-TELP 필수 영단어 (1,989단어)</option>
      <option value="korean">💬 기초 한국어·영어 회화 (1,245표현)</option>
      <option value="thai">🐘 태국어 실전 회화 (558문장)</option>
    `;
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      selectedCat = catSelectEl ? catSelectEl.value : 'all_en';
      modeRadios.forEach(r => { if (r.checked) currentMode = r.value; });
      countRadios.forEach(r => { if (r.checked) questionCount = parseInt(r.value, 10); });
      startQuiz();
    });
  }

  function getPool() {
    if (selectedCat === 'all_en' || selectedCat === 'all') {
      const enCats = ['toeic', 'toefl', 'suneung', 'gongmuwon', 'gtelp'];
      let all = [];
      enCats.forEach(k => { all = all.concat(vocaData[k] || []); });
      return all;
    }
    return vocaData[selectedCat] || [];
  }

  function startQuiz(customList = null) {
    if (customList) {
      quizPool = customList;
    } else {
      quizPool = getPool();
    }

    if (quizPool.length < 4) {
      alert('문제를 출제하기에 단어 수가 부족합니다.');
      return;
    }

    // 문제 셔플 추출
    const shuffled = [...quizPool].sort(() => 0.5 - Math.random());
    const count = Math.min(questionCount, shuffled.length);
    const selected = shuffled.slice(0, count);

    // 4지선다 옵션 생성 (동일 언어/카테고리 내에서 고유한 보기만 선별)
    questions = selected.map(target => {
      const targetAnswerText = currentMode === 'en_ko' ? target.meaning : target.word;
      const poolCandidates = quizPool.filter(w => {
        const text = currentMode === 'en_ko' ? w.meaning : w.word;
        return w.id !== target.id && text !== targetAnswerText;
      });
      const shuffledCandidates = [...poolCandidates].sort(() => 0.5 - Math.random());
      const distractors = [];
      const seenTexts = new Set([targetAnswerText]);
      for (const cand of shuffledCandidates) {
        const text = currentMode === 'en_ko' ? cand.meaning : cand.word;
        if (!seenTexts.has(text)) {
          seenTexts.add(text);
          distractors.push(cand);
          if (distractors.length >= 3) break;
        }
      }
      const choices = [target, ...distractors].sort(() => 0.5 - Math.random());
      return { target, choices };
    });

    currentQIndex = 0;
    score = 0;
    wrongAnswers = [];

    if (setupView) setupView.style.display = 'none';
    if (resultView) resultView.style.display = 'none';
    if (playView) playView.style.display = 'block';

    renderQuestion();
  }

  function renderQuestion() {
    isAnswered = false;
    const q = questions[currentQIndex];
    const total = questions.length;

    if (progressBar) progressBar.style.width = `${((currentQIndex + 1) / total) * 100}%`;
    if (progressText) progressText.textContent = `문제 ${currentQIndex + 1} / ${total}`;

    if (currentMode === 'en_ko') {
      if (qPromptEl) qPromptEl.textContent = '다음 단어의 올바른 뜻을 고르세요:';
      if (qWordEl) qWordEl.textContent = q.target.word;
      if (speakBtn) {
        speakBtn.style.display = 'inline-flex';
        speakBtn.onclick = () => {
          if (window.VocaTTS) window.VocaTTS.speak(q.target.word, q.target.lang || 'en');
        };
      }
    } else {
      if (qPromptEl) qPromptEl.textContent = '다음 뜻에 알맞은 단어를 고르세요:';
      if (qWordEl) qWordEl.textContent = q.target.meaning;
      if (speakBtn) speakBtn.style.display = 'none';
    }

    // 보기 버튼 렌더링
    if (choicesContainer) {
      choicesContainer.innerHTML = q.choices.map((choice, i) => {
        const text = currentMode === 'en_ko' ? choice.meaning : choice.word;
        return `
          <button class="choice-btn" data-id="${choice.id}">
            <span>${i + 1}. ${escapeHtml(text)}</span>
            <i class="fa-regular fa-circle" style="font-size:0.9rem;opacity:0.4;"></i>
          </button>
        `;
      }).join('');

      choicesContainer.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => handleChoice(parseInt(btn.dataset.id, 10), btn));
      });
    }

    // 자동 발음 (EN -> KO 모드일 때)
    if (currentMode === 'en_ko' && window.VocaTTS) {
      window.VocaTTS.speak(q.target.word, q.target.lang || 'en');
    }
  }

  function handleChoice(chosenId, btnEl) {
    if (isAnswered) return;
    isAnswered = true;

    const q = questions[currentQIndex];
    const isCorrect = chosenId === q.target.id;

    // 모든 보기 비활성화
    choicesContainer.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      const bId = parseInt(b.dataset.id, 10);
      if (bId === q.target.id) {
        b.classList.add('correct');
        b.querySelector('i').className = 'fa-solid fa-check';
      }
    });

    if (isCorrect) {
      score++;
      setTimeout(nextQuestion, 800);
    } else {
      btnEl.classList.add('wrong');
      btnEl.querySelector('i').className = 'fa-solid fa-xmark';
      wrongAnswers.push(q.target);

      // 오답 목록 로컬 저장 (오답 노트에 누적)
      let storedWrongs = JSON.parse(localStorage.getItem('voca_wrong_words') || '[]');
      if (!storedWrongs.some(w => w.id === q.target.id)) {
        storedWrongs.push(q.target);
        localStorage.setItem('voca_wrong_words', JSON.stringify(storedWrongs));
      }

      setTimeout(nextQuestion, 1400);
    }
  }

  function nextQuestion() {
    if (currentQIndex < questions.length - 1) {
      currentQIndex++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    if (playView) playView.style.display = 'none';
    if (resultView) resultView.style.display = 'block';

    const total = questions.length;
    const percent = Math.round((score / total) * 100);
    const passed = percent >= 70;

    if (scoreText) scoreText.textContent = `${score} / ${total} 정답`;
    if (scorePercent) scorePercent.textContent = `${percent}점`;

    if (passBadge) {
      passBadge.className = passed ? 'badge badge-green' : 'badge badge-orange';
      passBadge.textContent = passed ? '🎉 합격! 훌륭합니다' : '💪 조금 더 복습해볼까요?';
    }

    // 오답 리스트 렌더링
    if (wrongListContainer) {
      if (wrongAnswers.length === 0) {
        wrongListContainer.innerHTML = `
          <div style="padding:20px;text-align:center;color:#26a670;font-weight:700;">
            ✨ 틀린 문제 없이 모두 맞혔습니다! 완벽해요!
          </div>
        `;
        if (retryWrongBtn) retryWrongBtn.style.display = 'none';
      } else {
        wrongListContainer.innerHTML = `
          <h4 style="margin:16px 0 10px;color:#d94b07;">❌ 틀린 단어 (${wrongAnswers.length}개)</h4>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${wrongAnswers.map(w => `
              <div style="background:#fff7f2;border:1px solid #ffd6be;padding:12px 16px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <strong style="font-family:var(--font-en);font-size:1.1rem;color:#372a22;">${escapeHtml(w.word)}</strong>
                  <span style="color:#796c61;margin-left:10px;">${escapeHtml(w.meaning)}</span>
                </div>
                <button class="btn-speaker" onclick="window.VocaTTS && window.VocaTTS.speak('${escapeHtml(w.word)}', '${w.lang || 'en'}')" style="width:34px;height:34px;font-size:0.9rem;">
                  <i class="fa-solid fa-volume-high"></i>
                </button>
              </div>
            `).join('')}
          </div>
        `;
        if (retryWrongBtn) retryWrongBtn.style.display = 'inline-flex';
      }
    }

    // Supabase에 퀴즈 결과 저장
    if (window.VocaAuth && window.VocaAuth.saveQuizResult) {
      window.VocaAuth.saveQuizResult({
        category: selectedCat,
        mode: currentMode,
        total,
        score,
        percent,
        wrong: wrongAnswers.map(w => ({ id: w.id, word: w.word, meaning: w.meaning }))
      });
    }
  }

  // 오답 다시 풀기
  if (retryWrongBtn) {
    retryWrongBtn.addEventListener('click', () => {
      if (wrongAnswers.length === 0) return;
      startQuiz(wrongAnswers);
    });
  }

  // 처음으로 돌아가기
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      if (resultView) resultView.style.display = 'none';
      if (setupView) setupView.style.display = 'block';
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
});
