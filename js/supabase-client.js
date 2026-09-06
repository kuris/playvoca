/* ============================================================
   단어야 놀자! (PlayVoca) - Supabase 클라이언트 설정 (supabase-client.js)
   - 동일 Supabase 프로젝트(ybhiznlelnpwaicyoifa) 내 'voca' 전용 스키마 연동
   - 브라우저 공개 publishable(anon) 키와 RLS 정책 적용
   ============================================================ */

const SUPABASE_URL = 'https://ybhiznlelnpwaicyoifa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_H4gFRiLEjE8h8s_EX4tKzg__ZKpsBR1';
const SUPABASE_SCHEMA = 'voca';   // 단어야 놀자 전용 스키마

(function () {
  if (typeof window === 'undefined') return;

  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
  window.SUPABASE_SCHEMA = SUPABASE_SCHEMA;

  // supabase-js UMD 번들이 로드되면 전역 client 생성
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      db: { schema: SUPABASE_SCHEMA },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } else {
    console.warn('[단어야 놀자] supabase-js 로드 대기 중 - 로컬 저장 모드로 대기합니다.');
    window.sb = null;
  }
})();
