/* ============================================================
   단어야 놀자! (PlayVoca) - 고품질 원어민 발음 재생 모듈 (tts.js)
   - 1순위: 미국 원어민 고화질 오디오(MP3) 즉시 스트리밍 재생
     → 할아버지/쉿소리/노벨티 음성 및 한국식 발음 원천 차단
   - 2순위: Web Speech API (en-US 원어민 전용 보이스 엄격 바인딩)
     → 비영어/한국어 음성이 영어를 읽는 현상 100% 방지
   ============================================================ */

(function () {
  let currentAudio = null;
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  let voices = [];

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices() || [];
  }

  if (synth) {
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }

  // 시스템 노벨티/괴물/할아버지/장난 음성 완전 차단 목록
  const NOVELTY_VOICES = [
    'albert', 'whisper', 'fred', 'bad news', 'bahh', 'bells', 
    'boing', 'bubbles', 'cellos', 'deranged', 'good news', 
    'hysterical', 'junior', 'kathy', 'pipe organ', 'princess', 
    'ralph', 'trinoids', 'zarvox', 'wobble', 'organ'
  ];

  function getBestEnglishVoice() {
    if (!synth) return null;
    if (voices.length === 0) loadVoices();
    if (voices.length === 0) return null;

    // 1순위: 고품질 자연스러운 영미권 원어민 음성
    const PREFERRED = [
      'samantha', 'alex', 'ava', 'allison', 'victoria', 'karen', 
      'susan', 'google us english', 'natural', 'zira', 'jenny', 'guy', 'daniel'
    ];

    for (const pref of PREFERRED) {
      const found = voices.find(v => {
        const lang = (v.lang || '').toLowerCase().replace('_', '-');
        const name = (v.name || '').toLowerCase();
        return lang.startsWith('en') && name.includes(pref) && !NOVELTY_VOICES.some(bad => name.includes(bad));
      });
      if (found) return found;
    }

    // 2순위: 노벨티가 아닌 순수 en-US 또는 en 음성
    const cleanEn = voices.find(v => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      const name = (v.name || '').toLowerCase();
      const isEn = lang.startsWith('en');
      const isNovelty = NOVELTY_VOICES.some(bad => name.includes(bad));
      // 한국어 음성이 이름에 영어를 포함하는 경우 철저히 배제
      const isKorean = lang.startsWith('ko') || name.includes('korean') || name.includes('yuna');
      return isEn && !isNovelty && !isKorean;
    });

    return cleanEn || null;
  }

  function getBestVoice(lang = 'en') {
    if (!synth) return null;
    if (voices.length === 0) loadVoices();
    if (voices.length === 0) return null;

    if (lang === 'en') {
      return getBestEnglishVoice();
    } else if (lang === 'ko') {
      return voices.find(v => v.lang.toLowerCase().startsWith('ko')) || null;
    } else if (lang === 'th') {
      return voices.find(v => v.lang.toLowerCase().startsWith('th')) || null;
    }
    return null;
  }

  /**
   * 단어 발음 재생
   * @param {string} text 재생할 텍스트
   * @param {string} lang 언어 코드 ('en', 'ko', 'th')
   * @param {number} rate 재생 속도 (기본 1.0)
   */
  function speak(text, lang = 'en', rate = 1.0) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    // 기존 재생 중인 오디오 즉시 중단
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (e) {}
      currentAudio = null;
    }
    if (synth) {
      try { synth.cancel(); } catch (e) {}
    }

    // 1. 영어 단어의 경우 실제 원어민 녹음 MP3 1순위 재생 (할아버지/한국식 로봇 발음 0%)
    const isEnglish = lang === 'en' || /^[a-zA-Z\s\-\'\.]+$/.test(cleanText);
    if (isEnglish) {
      try {
        // 미국 원어민 오디오 스트림 (type=2: American English)
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&type=2`;
        const audio = new Audio(audioUrl);
        currentAudio = audio;
        audio.playbackRate = rate;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            // 원어민 오디오 정상 재생 성공
          }).catch(() => {
            // 오디오 차단되거나 로딩 실패 시 Web Speech API로 안전 폴백
            fallbackWebSpeech(cleanText, 'en', rate);
          });
        }
        return;
      } catch (err) {
        // 폴백으로 진행
      }
    }

    // 2. 한국어, 태국어 또는 Web Speech API 폴백
    fallbackWebSpeech(cleanText, lang, rate);
  }

  function fallbackWebSpeech(text, lang, rate) {
    if (!synth) return;

    try {
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rate;
      utter.pitch = 1.0;

      if (lang === 'en') {
        utter.lang = 'en-US';
        const voice = getBestEnglishVoice();
        if (voice) {
          utter.voice = voice;
          synth.speak(utter);
        } else {
          // 영어 보이스가 아직 로드되지 않았으면 onvoiceschanged 대기 후 1회 시도
          if (voices.length === 0) {
            synth.onvoiceschanged = () => {
              loadVoices();
              const v = getBestEnglishVoice();
              if (v) {
                utter.voice = v;
                synth.speak(utter);
              }
            };
          }
          // 한국어 음성이 대신 읽는 것은 절대 허용하지 않음 (스킵)
        }
      } else {
        let langCode = 'ko-KR';
        if (lang === 'th') langCode = 'th-TH';
        utter.lang = langCode;
        const voice = getBestVoice(lang);
        if (voice) utter.voice = voice;
        synth.speak(utter);
      }
    } catch (e) {
      console.warn('[TTS 재생 실패]', e);
    }
  }

  window.VocaTTS = {
    speak,
    getBestVoice
  };
})();
