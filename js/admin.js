/* ============================================================
   단어야 놀자! (PlayVoca) - 관리자 센터 스크립트 (admin.js)
   - phiskim@gmail.com 전용 관리자 화면
   - 방문자 및 화면별 조회수, 24시간 접속 시간대 통계 분석
   - 회원 목록 (public.service_members 연동)
   - 퀴즈 응시 통계 (voca.quiz_results)
   ============================================================ */

document.addEventListener('DOMContentLoaded', async function () {
  const ADMIN_EMAIL = 'phiskim@gmail.com';
  const AUTH = window.VocaAuth;
  const sb = () => window.sb || null;

  const loadingView = document.getElementById('admin-loading');
  const authView = document.getElementById('admin-auth-view');
  const deniedView = document.getElementById('admin-denied-view');
  const dashboardView = document.getElementById('admin-dashboard-view');
  const deniedEmailEl = document.getElementById('denied-user-email');
  const adminEmailBadge = document.getElementById('admin-current-email');

  const loginForm = document.getElementById('admin-login-form');
  const googleBtn = document.getElementById('admin-google-btn');
  const authMsg = document.getElementById('admin-auth-msg');

  let currentAdminUser = null;
  let cachedMembers = [];
  let cachedPageViews = [];
  let cachedQuizLogs = [];

  function showMsg(text, type = 'error') {
    if (!authMsg) return;
    authMsg.className = 'admin-msg show ' + type;
    authMsg.textContent = text;
  }

  function checkAccess() {
    if (loadingView) loadingView.style.display = 'none';
    const user = AUTH ? AUTH.getUser() : null;

    if (!user) {
      if (authView) authView.style.display = 'block';
      if (deniedView) deniedView.style.display = 'none';
      if (dashboardView) dashboardView.style.display = 'none';
      return;
    }

    const email = (user.email || '').toLowerCase().trim();
    if (email !== ADMIN_EMAIL) {
      if (authView) authView.style.display = 'none';
      if (deniedView) deniedView.style.display = 'block';
      if (dashboardView) dashboardView.style.display = 'none';
      if (deniedEmailEl) deniedEmailEl.textContent = email;
      return;
    }

    // 관리자 승인 완료
    currentAdminUser = user;
    if (authView) authView.style.display = 'none';
    if (deniedView) deniedView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
    if (adminEmailBadge) adminEmailBadge.textContent = email;

    loadDashboardData();
  }

  async function loadDashboardData() {
    if (!sb()) return;

    try {
      // 1. 회원 목록 조회
      const { data: members } = await sb().schema('public')
        .from('service_members')
        .select('*')
        .eq('service', 'voca')
        .order('created_at', { ascending: false });
      cachedMembers = members || [];

      // 2. 페이지 뷰 조회 (최근 1,000건)
      const { data: pvs } = await sb()
        .from('page_views')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      cachedPageViews = pvs || [];

      // 3. 퀴즈 기록 조회
      const { data: quizzes } = await sb()
        .from('quiz_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      cachedQuizLogs = quizzes || [];

      renderStats();
      renderHourlyChart();
      renderMembersTable();
      renderPageViewsTable();
    } catch (e) {
      console.warn('[관리자 데이터 로드 실패]', e);
    }
  }

  function renderStats() {
    const today = new Date().toISOString().slice(0, 10);
    const todayViews = cachedPageViews.filter(pv => pv.day === today);

    const elMembers = document.getElementById('stat-admin-members');
    const elTodayViews = document.getElementById('stat-admin-today');
    const elTotalViews = document.getElementById('stat-admin-total-pv');
    const elQuizCount = document.getElementById('stat-admin-quiz');

    if (elMembers) elMembers.textContent = cachedMembers.length.toLocaleString();
    if (elTodayViews) elTodayViews.textContent = todayViews.length.toLocaleString();
    if (elTotalViews) elTotalViews.textContent = cachedPageViews.length.toLocaleString();
    if (elQuizCount) elQuizCount.textContent = cachedQuizLogs.length.toLocaleString();
  }

  function renderHourlyChart() {
    const container = document.getElementById('hourly-bars-container');
    if (!container) return;

    const hourCounts = new Array(24).fill(0);
    cachedPageViews.forEach(pv => {
      const h = pv.hour;
      if (h >= 0 && h < 24) hourCounts[h]++;
    });

    const maxCount = Math.max(...hourCounts, 1);

    container.innerHTML = hourCounts.map((count, hour) => {
      const heightPercent = Math.max(4, Math.round((count / maxCount) * 100));
      return `
        <div class="bar-col" title="${hour}시: ${count}회">
          <div class="bar-fill" style="height: ${heightPercent}%;"></div>
          <span class="bar-label">${hour}</span>
        </div>
      `;
    }).join('');
  }

  function renderMembersTable() {
    const tbody = document.getElementById('admin-members-tbody');
    if (!tbody) return;

    if (cachedMembers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;">아직 가입한 회원이 없습니다.</td></tr>';
      return;
    }

    tbody.innerHTML = cachedMembers.map(m => `
      <tr>
        <td><strong>${escapeHtml(m.nickname || '이름 없음')}</strong></td>
        <td><span class="badge ${m.role === 'admin' ? 'badge-purple' : 'badge-blue'}">${m.role}</span></td>
        <td>${m.last_seen_at ? new Date(m.last_seen_at).toLocaleDateString() : '-'}</td>
        <td>${m.created_at ? new Date(m.created_at).toLocaleDateString() : '-'}</td>
      </tr>
    `).join('');
  }

  function renderPageViewsTable() {
    const tbody = document.getElementById('admin-pv-tbody');
    if (!tbody) return;

    const recent = cachedPageViews.slice(0, 30);
    if (recent.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;">조회 기록이 없습니다.</td></tr>';
      return;
    }

    tbody.innerHTML = recent.map(pv => `
      <tr>
        <td><strong>${escapeHtml(pv.page_title || pv.path)}</strong></td>
        <td><code>${escapeHtml(pv.path)}</code></td>
        <td>${new Date(pv.created_at).toLocaleTimeString()}</td>
      </tr>
    `).join('');
  }

  // 로그인 처리
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-email-input').value.trim();
      const pass = document.getElementById('admin-pass-input').value;

      try {
        await AUTH.signIn(email, pass);
        checkAccess();
      } catch (err) {
        showMsg(err.message || '로그인 실패');
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        await AUTH.signInWithGoogle(location.origin + '/admin.html');
      } catch (err) {
        showMsg(err.message || '구글 로그인 실패');
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  setTimeout(checkAccess, 200);
  document.addEventListener('voca:auth-changed', checkAccess);
});
