/* ============================================================
   단어야 놀자! (PlayVoca) - 회원가입/로그인 & 학습 데이터 동기화 (auth.js)
   - 동일 계정(auth.users)으로 playhanja / justseoul과 통합 사용
   - Supabase 이메일 및 Google 로그인 지원
   - 북마크(⭐️) 및 암기완료(✅) 진도 클라우드 자동 동기화
   - 서비스 식별자: 'voca'
   ============================================================ */

(function () {
  const LEARNED_KEY = 'voca_learned_ids';
  const BOOKMARK_KEY = 'voca_bookmark_ids';
  const SERVICE = 'voca';
  const ADMIN_EMAILS = ['phiskim@gmail.com'];

  function isAdmin(user) {
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    return ADMIN_EMAILS.includes(email);
  }

  let currentUser = null;
  let currentProfile = null;
  let syncing = false;

  function sb() { return window.sb || null; }
  function isReady() { return !!sb(); }

  // ---------- 로컬 저장 유틸 ----------
  function getLocalArray(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
  }
  function setLocalArray(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(Array.from(new Set(arr)))); } catch (e) {}
  }

  // ---------- 인증 함수 ----------
  async function signUp(email, password, nickname) {
    if (!isReady()) throw new Error('서버 연결을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
    const { data, error } = await sb().auth.signUp({
      email: email,
      password: password,
      options: { data: { nickname: nickname || email.split('@')[0] } }
    });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already exists')) {
        try {
          await signIn(email, password);
          return { existingAccount: true, joinedNow: true, user: currentUser };
        } catch (e2) {
          const err = new Error('EXISTING_ACCOUNT');
          err.code = 'EXISTING_ACCOUNT';
          err.email = email;
          throw err;
        }
      }
      throw error;
    }

    return { needsEmailConfirm: !!(data.user && !data.session), user: data.user };
  }

  async function signIn(email, password) {
    if (!isReady()) throw new Error('서버 연결을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
    const { data, error } = await sb().auth.signInWithPassword({ email: email, password: password });
    if (error) throw error;
    return data.user;
  }

  // ---------- 콜백 & 리디렉션 주소 관리 (한자/보카 분리) ----------
  function getVocaRedirectUrl() {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return location.origin + '/login.html';
    }
    return 'https://voca.chatgpts.kr/login.html';
  }

  // 로그인 후 브라우저 주소창의 지저분한 hash(#access_token=...) 또는 code= 파라미터를 깨끗하게 정리
  function cleanCallbackUrl() {
    try {
      if (window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('refresh_token=') || window.location.hash.includes('error='))) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      if (window.location.search && window.location.search.includes('code=')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        const qs = url.searchParams.toString();
        window.history.replaceState(null, '', url.pathname + (qs ? '?' + qs : '') + url.hash);
      }
    } catch (e) {}
  }

  async function signInWithGoogle(redirectTo) {
    if (!isReady()) throw new Error('서버 연결을 준비하지 못했어요.');
    const target = redirectTo || getVocaRedirectUrl();
    const { error } = await sb().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: target }
    });
    if (error) throw error;
  }

  async function signOut() {
    if (!isReady()) return;
    await sb().auth.signOut();
    currentUser = null;
    currentProfile = null;
    renderAuthBox();
    document.dispatchEvent(new CustomEvent('voca:auth-changed', { detail: { user: null } }));
  }

  async function resetPassword(email) {
    if (!isReady()) throw new Error('서버 연결을 준비하지 못했어요.');
    const { error } = await sb().auth.resetPasswordForEmail(email, {
      redirectTo: getVocaRedirectUrl()
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword) {
    if (!isReady()) throw new Error('서버 연결을 준비하지 못했어요.');
    const { error } = await sb().auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  }

  // ---------- 서비스 멤버십 확인 및 생성 ----------
  async function ensureMembership() {
    if (!currentUser || !isReady()) return { isNew: false, status: 'active' };
    try {
      const { data: rows } = await sb().schema('public').from('service_members')
        .select('*').eq('user_id', currentUser.id).eq('service', SERVICE);

      const existing = rows && rows[0];
      const isAdm = isAdmin(currentUser);
      if (existing) {
        const updatePayload = { last_seen_at: new Date().toISOString() };
        if (isAdm && existing.role !== 'admin') updatePayload.role = 'admin';
        sb().schema('public').from('service_members')
          .update(updatePayload)
          .eq('user_id', currentUser.id).eq('service', SERVICE)
          .then(() => {}, () => {});
        return { isNew: false, status: existing.status, role: isAdm ? 'admin' : existing.role };
      }

      // 첫 서비스 방문 시 가입 생성
      const meta = currentUser.user_metadata || {};
      const nick = meta.nickname || (currentUser.email || '').split('@')[0];
      await sb().schema('public').from('service_members').insert({
        user_id: currentUser.id,
        service: SERVICE,
        role: isAdm ? 'admin' : 'member',
        nickname: nick,
        last_seen_at: new Date().toISOString()
      });

      // voca 전용 프로필 생성
      await sb().from('profiles').upsert({ id: currentUser.id, nickname: nick }, { onConflict: 'id' });
      return { isNew: true, status: 'active', role: isAdm ? 'admin' : 'member' };
    } catch (e) {
      console.warn('[단어야 놀자] 서비스 멤버십 확인 실패:', e.message || e);
      return { isNew: false, status: 'active' };
    }
  }

  // ---------- 프로필 로드 ----------
  async function loadProfile() {
    if (!currentUser) return null;
    const { data } = await sb().from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    currentProfile = data || null;
    return currentProfile;
  }

  async function updateNickname(nickname) {
    if (!currentUser) return;
    const { error } = await sb().from('profiles')
      .upsert({ id: currentUser.id, nickname: nickname, updated_at: new Date().toISOString() });
    if (error) throw error;
    if (currentProfile) currentProfile.nickname = nickname;
    renderAuthBox();
  }

  function displayName() {
    if (!currentUser) return '';
    if (currentProfile && currentProfile.nickname) return currentProfile.nickname;
    const meta = currentUser.user_metadata || {};
    return meta.nickname || (currentUser.email || '').split('@')[0];
  }

  // ---------- 학습 진도 & 북마크 동기화 ----------
  async function syncProgressOnLogin() {
    if (!currentUser || syncing) return;
    syncing = true;
    try {
      const localLearned = getLocalArray(LEARNED_KEY);
      const localBookmarks = getLocalArray(BOOKMARK_KEY);

      const { data, error } = await sb().from('learn_progress').select('item_id').eq('user_id', currentUser.id);
      if (error) throw error;

      const remoteItems = (data || []).map(r => r.item_id);
      const remoteLearned = remoteItems.filter(id => id.startsWith('w_')).map(id => id.replace('w_', ''));
      const remoteBookmarks = remoteItems.filter(id => id.startsWith('bm_')).map(id => id.replace('bm_', ''));

      // 병합
      const mergedLearned = Array.from(new Set(localLearned.map(String).concat(remoteLearned)));
      const mergedBookmarks = Array.from(new Set(localBookmarks.map(String).concat(remoteBookmarks)));

      // 서버에 없는 로컬 진도 업로드
      const uploadLearned = localLearned.filter(id => !remoteLearned.includes(String(id))).map(id => ({ user_id: currentUser.id, item_id: 'w_' + id }));
      const uploadBookmarks = localBookmarks.filter(id => !remoteBookmarks.includes(String(id))).map(id => ({ user_id: currentUser.id, item_id: 'bm_' + id }));
      const toUpload = uploadLearned.concat(uploadBookmarks);

      if (toUpload.length > 0) {
        await sb().from('learn_progress').upsert(toUpload, { onConflict: 'user_id,item_id' });
      }

      setLocalArray(LEARNED_KEY, mergedLearned.map(Number));
      setLocalArray(BOOKMARK_KEY, mergedBookmarks.map(Number));

      document.dispatchEvent(new CustomEvent('voca:progress-synced', {
        detail: { learned: mergedLearned.length, bookmarks: mergedBookmarks.length }
      }));
    } catch (e) {
      console.warn('[단어야 놀자] 진도 동기화 실패:', e.message || e);
    } finally {
      syncing = false;
    }
  }

  // 단어 암기 상태 변경 시 동기화
  async function syncLearnedItem(wordId, isLearned) {
    const itemId = 'w_' + wordId;
    if (!currentUser || !isReady()) return;
    try {
      if (isLearned) {
        await sb().from('learn_progress').upsert({ user_id: currentUser.id, item_id: itemId }, { onConflict: 'user_id,item_id' });
      } else {
        await sb().from('learn_progress').delete().eq('user_id', currentUser.id).eq('item_id', itemId);
      }
    } catch (e) {
      console.warn('[단어야 놀자] 단어 학습 저장 실패:', e.message || e);
    }
  }

  // 단어 북마크 변경 시 동기화
  async function syncBookmarkItem(wordId, isBookmarked) {
    const itemId = 'bm_' + wordId;
    if (!currentUser || !isReady()) return;
    try {
      if (isBookmarked) {
        await sb().from('learn_progress').upsert({ user_id: currentUser.id, item_id: itemId }, { onConflict: 'user_id,item_id' });
      } else {
        await sb().from('learn_progress').delete().eq('user_id', currentUser.id).eq('item_id', itemId);
      }
    } catch (e) {
      console.warn('[단어야 놀자] 북마크 저장 실패:', e.message || e);
    }
  }

  // ---------- 퀴즈 결과 저장 ----------
  async function saveQuizResult(result) {
    if (!currentUser || !isReady()) return;
    try {
      await sb().from('quiz_results').insert({
        user_id: currentUser.id,
        category: result.category || 'all',
        mode: result.mode || 'en_ko',
        total: result.total,
        score: result.score,
        percent: result.percent,
        passed: result.percent >= 70,
        wrong: result.wrong || []
      });
    } catch (e) {
      console.warn('[단어야 놀자] 퀴즈 저장 실패:', e.message || e);
    }
  }

  async function fetchQuizResults(limit = 20) {
    if (!currentUser || !isReady()) return [];
    try {
      const { data } = await sb().from('quiz_results')
        .select('*').eq('user_id', currentUser.id)
        .order('created_at', { ascending: false }).limit(limit);
      return data || [];
    } catch (e) {
      return [];
    }
  }

  // ---------- 상단 네비게이션 로그인 박스 렌더링 ----------
  function renderAuthBox() {
    let box = document.getElementById('nav-auth-box');
    if (!box) {
      const navWrap = document.querySelector('.site-header .nav-wrap');
      if (!navWrap) return;
      box = document.createElement('div');
      box.id = 'nav-auth-box';
      box.className = 'nav-auth-box';
      const toggle = document.getElementById('nav-toggle');
      if (toggle) navWrap.insertBefore(box, toggle);
      else navWrap.appendChild(box);
    }

    if (currentUser) {
      const name = displayName();
      const isAdm = isAdmin(currentUser);
      box.innerHTML = `
        <div class="user-chip" id="user-chip-btn" title="${currentUser.email}">
          <span class="user-avatar">${isAdm ? '👑' : '👤'}</span>
          <span class="user-name">${escapeHtml(name)}</span>
          <i class="fa-solid fa-chevron-down" style="font-size:0.75rem;margin-left:4px;"></i>
        </div>
        <div class="user-menu" id="user-menu-dropdown" style="display:none;">
          <div class="user-menu-header">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(currentUser.email || '')}</small>
          </div>
          <div class="user-menu-body">
            <a href="bookmark.html"><i class="fa-solid fa-star"></i> 내 단어장</a>
            <a href="login.html"><i class="fa-solid fa-chart-pie"></i> 학습 현황 & 목표</a>
            ${isAdm ? '<a href="admin.html" style="color:#d9534f;"><i class="fa-solid fa-shield-halved"></i> 관리자 센터</a>' : ''}
            <button type="button" id="btn-logout-nav"><i class="fa-solid fa-arrow-right-from-bracket"></i> 로그아웃</button>
          </div>
        </div>
      `;

      const chip = box.querySelector('#user-chip-btn');
      const dropdown = box.querySelector('#user-menu-dropdown');
      const logoutBtn = box.querySelector('#btn-logout-nav');

      if (chip && dropdown) {
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          // 햄버거 모바일 메뉴가 열려있다면 닫기
          const mainNav = document.getElementById('main-nav');
          const navToggle = document.getElementById('nav-toggle');
          if (mainNav && mainNav.classList.contains('open')) {
            mainNav.classList.remove('open');
            document.body.classList.remove('nav-open');
            if (navToggle) {
              navToggle.setAttribute('aria-expanded', 'false');
              navToggle.setAttribute('aria-label', '메뉴 열기');
              const icon = navToggle.querySelector('i');
              if (icon) icon.className = 'fa-solid fa-bars';
            }
          }
          dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', () => { dropdown.style.display = 'none'; });
      }
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          await signOut();
          location.reload();
        });
      }
    } else {
      // ---------- 공통 로그인 모듈(CGAuth) 위임 ----------
      // 비로그인 상태에서는 공통 Google 로그인 버튼을 보여 줍니다.
      // 로그인 후에는 위쪽의 기존 드롭다운 UI 가 그대로 사용됩니다.
      if (window.CGAuth && window.CGAuth.__loaded) {
        if (!box.querySelector('.cg-auth')) box.innerHTML = '';
        window.CGAuth.mountAuthUI(box);
      } else {
        box.innerHTML = `
          <a href="login.html" class="btn-nav-login">
            <i class="fa-solid fa-user"></i> <span>로그인</span>
          </a>
        `;
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  // ---------- 초기화 ----------
  async function init() {
    if (!isReady()) return;
    try {
      const { data } = await sb().auth.getSession();
      if (data && data.session && data.session.user) {
        currentUser = data.session.user;
        cleanCallbackUrl();
        await ensureMembership();
        await loadProfile();
        syncProgressOnLogin();
      }
    } catch (e) {
      console.warn('[단어야 놀자] 초기 세션 확인 실패:', e);
    }

    renderAuthBox();

    // 상태 변경 리스너
    sb().auth.onAuthStateChange(async (event, session) => {
      const user = session ? session.user : null;
      currentUser = user;
      if (user) {
        cleanCallbackUrl();
        await ensureMembership();
        await loadProfile();
        syncProgressOnLogin();
      } else {
        currentProfile = null;
      }
      renderAuthBox();
      document.dispatchEvent(new CustomEvent('voca:auth-changed', { detail: { user } }));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 전역 노출
  window.VocaAuth = {
    getUser: () => currentUser,
    getProfile: () => currentProfile,
    isAdmin: () => isAdmin(currentUser),
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateNickname,
    syncLearnedItem,
    syncBookmarkItem,
    saveQuizResult,
    fetchQuizResults,
    displayName,
    renderAuthBox
  };
})();
