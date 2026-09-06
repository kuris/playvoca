/* ============================================================
   단어야 놀자! (PlayVoca) - 발음 음성 재생 유틸 (tts.js)
   - Web Speech API (SpeechSynthesis) 기반 원어민 발음 재생
   - macOS Chrome/Safari에서 할아버지/쉿소리(Albert, Whisper 등 노벨티 보이스) 필터링
   - 고품질 자연스러운 원어민 음성(Samantha, Alex, Google US English 등) 우선 선별
   ============================================================ */

(function () {
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  let voices = [];

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices();
  }

  if (synth) {
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }

  // macOS 및 시스템 장난/괴물/할아버지/속삭임 음성 제외 목록
  const NOVELTY_VOICES = [
    'albert', 'whisper', 'fred', 'bad news', 'bahh', 'bells', 
    'boing', 'bubbles', 'cellos', 'deranged', 'good news', 
    'hysterical', 'junior', 'kathy', 'pipe organ', 'princess', 
    'ralph', 'trinoids', 'zarvox'
  ];

  function getBestVoice(lang = 'en') {
    if (!synth || voices.length === 0) loadVoices();
    if (voices.length === 0) return null;

    if (lang === 'en') {
      // 1순위: 선호하는 자연스러운 원어민 음성 (macOS & Chrome & Windows)
      const PREFERRED_EN = [
        'samantha', 'alex', 'ava', 'allison', 'victoria', 'karen', 
        'susan', 'google us english', 'natural', 'zira', 'jenny', 'guy'
      ];

      for (const pref of PREFERRED_EN) {
        const found = voices.find(v => 
          v.lang.toLowerCase().startsWith('en') && 
          v.name.toLowerCase().includes(pref)
        );
        if (found) return found;
      }

      // 2순위: 노벨티 음성을 제외한 일반 en-US 음성
      const cleanEn = voices.find(v => {
        const name = v.name.toLowerCase();
        const isEn = v.lang.toLowerCase().startsWith('en');
        const isNovelty = NOVELTY_VOICES.some(bad => name.includes(bad));
        return isEn && !isNovelty;
      });
      if (cleanEn) return cleanEn;

    } else if (lang === 'ko') {
      // 한국어 고품질 음성 선별
      const koVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('ko') && 
        (v.name.includes('Yuna') || v.name.includes('Google') || v.name.includes('Korean') || v.name.includes('Natural'))
      ) || voices.find(v => v.lang.toLowerCase().startsWith('ko'));
      if (koVoice) return koVoice;

    } else if (lang === 'th') {
      // 태국어 음성
      const thVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('th') && 
        (v.name.includes('Kanya') || v.name.includes('Google') || v.name.includes('Thai'))
      ) || voices.find(v => v.lang.toLowerCase().startsWith('th'));
      if (thVoice) return thVoice;
    }

    return null;
  }

  function speak(text, lang = 'en', rate = 1.0) {
    if (!synth) {
      alert('이 브라우저는 음성 재생(Web Speech API)을 지원하지 않습니다.');
      return;
    }

    try {
      synth.cancel(); // 이전 발음 중단

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rate;
      utter.pitch = 1.0;

      let langCode = 'en-US';
      if (lang === 'ko') langCode = 'ko-KR';
      else if (lang === 'th') langCode = 'th-TH';
      utter.lang = langCode;

      const voice = getBestVoice(lang);
      if (voice) {
        utter.voice = voice;
      }

      synth.speak(utter);
    } catch (e) {
      console.warn('[발음 재생 오류]', e);
    }
  }

  window.VocaTTS = {
    speak,
    getBestVoice
  };
})();
