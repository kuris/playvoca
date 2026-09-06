/* ============================================================
   단어야 놀자! (PlayVoca) - 로그인/회원가입/프로필 관리 스크립트 (login.js)
   - Supabase 이메일 & 구글 로그인 연동
   - 타 서비스(playhanja 등) 기존 계정 자동 연동 UX
   - 내 학습 현황 및 목표 설정
   ============================================================ */

document.addEventListener('DOMContentLoaded', async function () {
  const AUTH = window.VocaAuth;
  if (!AUTH) return;

  const authView = document.getElementById('auth-view');
  const profileView = document.getElementById('profile-view');

  const tabBtns = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const googleBtn = document.getElementById('google-login-btn');
  const forgotBtn = document.getElementById('forgot-btn');
  const authMsg = document.getElementById('auth-msg');

  // 프로필 화면 요소
  const pfNickEl = document.getElementById('pf-nickname');
  const pfEmailEl = document.getElementById('pf-email');
  const pfLearnedEl = document.getElementById('pf-learned-count');
  const pfBookmarkEl = document.getElementById('pf-bookmark-count');
  const pfGoalInput = document.getElementById('pf-goal-input');
  const btnSaveGoal = document.getElementById('btn-save-goal');
  const btnLogout = document.getElementById('btn-logout-pf');
  const nickEditForm = document.getElementById('nick-edit-form');
  const nickInput = document.getElementById('nick-input');

  function showMsg(text, type = 'error') {
    if (!authMsg) return;
    authMsg.className = 'auth-msg ' + type;
    authMsg.textContent = text;
    authMsg.style.display = 'block';
  }
  function hideMsg() {
    if (authMsg) authMsg.style.display = 'none';
  }

  // 1. 탭 전환
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      hideMsg();
      const tab = btn.dataset.tab;
      if (tab === 'login') {
        loginForm.style.display = 'flex';
        signupForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'flex';
      }
    });
  });

  // 2. 로그인 처리
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMsg();
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-password').value;

      try {
        await AUTH.signIn(email, pass);
        location.reload();
      } catch (err) {
        showMsg(err.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    });
  }

  // 3. 회원가입 처리
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMsg();
      const nick = document.getElementById('signup-nickname').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const pass = document.getElementById('signup-password').value;

      try {
        const res = await AUTH.signUp(email, pass, nick);
        if (res.existingAccount) {
          alert('이미 가입된 계정이 있어 자동으로 로그인되었습니다! 🎉');
          location.reload();
        } else if (res.needsEmailConfirm) {
          showMsg('인증 메일이 발송되었습니다. 메일함의 링크를 확인해주세요.', 'success');
        } else {
          location.reload();
        }
      } catch (err) {
        if (err.code === 'EXISTING_ACCOUNT') {
          showMsg('이미 가입된 계정입니다. 로그인 탭에서 비밀번호를 입력해 로그인해주세요.');
          tabBtns[0].click();
          document.getElementById('login-email').value = err.email || email;
        } else {
          showMsg(err.message || '회원가입에 실패했습니다.');
        }
      }
    });
  }

  // 4. 구글 로그인
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        await AUTH.signInWithGoogle();
      } catch (err) {
        showMsg(err.message || '구글 로그인 중 오류가 발생했습니다.');
      }
    });
  }

  // 5. 비밀번호 찾기
  if (forgotBtn) {
    forgotBtn.addEventListener('click', async () => {
      const email = prompt('비밀번호를 재설정할 이메일을 입력해주세요:');
      if (!email || !email.includes('@')) return;
      try {
        await AUTH.resetPassword(email.trim());
        alert('비밀번호 재설정 링크를 메일로 발송했습니다. 메일함을 확인해주세요.');
      } catch (err) {
        alert(err.message || '메일 발송에 실패했습니다.');
      }
    });
  }

  // 6. 로그인 상태에 따른 뷰 렌더링
  function updateView() {
    const user = AUTH.getUser();
    if (user) {
      if (authView) authView.style.display = 'none';
      if (profileView) profileView.style.display = 'block';

      if (pfEmailEl) pfEmailEl.textContent = user.email || '';
      if (pfNickEl) pfNickEl.textContent = AUTH.displayName();
      if (nickInput) nickInput.value = AUTH.displayName();

      const learned = JSON.parse(localStorage.getItem('voca_learned_ids') || '[]');
      const bookmarks = JSON.parse(localStorage.getItem('voca_bookmark_ids') || '[]');
      if (pfLearnedEl) pfLearnedEl.textContent = learned.length.toLocaleString();
      if (pfBookmarkEl) pfBookmarkEl.textContent = bookmarks.length.toLocaleString();

      const profile = AUTH.getProfile();
      if (profile && profile.daily_goal && pfGoalInput) {
        pfGoalInput.value = profile.daily_goal;
      }
    } else {
      if (authView) authView.style.display = 'block';
      if (profileView) profileView.style.display = 'none';
    }
  }

  // 닉네임 수정
  if (nickEditForm) {
    nickEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newNick = nickInput.value.trim();
      if (!newNick) return;
      try {
        await AUTH.updateNickname(newNick);
        alert('닉네임이 변경되었습니다.');
        updateView();
      } catch (err) {
        alert(err.message || '닉네임 변경에 실패했습니다.');
      }
    });
  }

  // 로그아웃
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await AUTH.signOut();
      location.reload();
    });
  }

  // 초기 상태 확인 (100ms 딜레이)
  setTimeout(updateView, 150);
  document.addEventListener('voca:auth-changed', updateView);
});
