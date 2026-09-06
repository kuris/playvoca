/* ============================================================
   단어야 놀자! (PlayVoca) - 공통 상단 내비게이션 (nav.js)
   - PC: 5개 그룹 + 드롭다운 / 태블릿·모바일: 햄버거 서랍
   - 화면 조회수 및 접속 시간대 통계 수집 (voca.page_views)
   ============================================================ */

(function () {
  const MENU = [
    { label: '홈', href: 'index.html', icon: '🏠' },
    {
      label: '단어 학습', icon: '📚',
      children: [
        { label: '전체 단어장', href: 'learn.html', icon: '📖', desc: '토익·토플·수능·공무원 1만 단어' },
        { label: '플래시카드 깜빡이', href: 'flashcard.html', icon: '⚡', desc: '3D 카드 뒤집기 간격 반복' },
        { label: '내 단어장 (북마크)', href: 'bookmark.html', icon: '⭐️', desc: '내가 찜한 단어 & 오답 복습' }
      ]
    },
    {
      label: '테스트 & 퀴즈', icon: '🎯',
      children: [
        { label: '4지선다 퀴즈', href: 'quiz.html', icon: '🧩', desc: '영단어·뜻 실전 4지선다 문제' },
        { label: 'A4 단어 연습장', href: 'worksheet.html', icon: '📄', desc: '시험지 & 깜지 인쇄 / PDF' }
      ]
    },
    { label: '내 학습실', href: 'login.html', icon: '👤' }
  ];

  function currentFile() {
    const f = location.pathname.split('/').pop() || 'index.html';
    return f === '' ? 'index.html' : f;
  }

  function buildDesktop(here) {
    return MENU.map(function (item, i) {
      if (!item.children) {
        const active = item.href === here ? ' class="active"' : '';
        return `<li><a href="${item.href}"${active}>${item.icon} ${item.label}</a></li>`;
      }
      const active = item.children.some(c => c.href === here);
      return `
        <li class="nav-group">
          <button class="nav-group-btn${active ? ' active' : ''}" aria-expanded="false" data-group="${i}">
            ${item.icon} ${item.label} <i class="fa-solid fa-chevron-down" style="font-size:0.75rem;"></i>
          </button>
          <div class="nav-dropdown">
            ${item.children.map(c => `
              <a href="${c.href}" class="${c.href === here ? 'current' : ''}">
                <span class="nd-icon">${c.icon}</span>
                <span class="nd-body"><strong>${c.label}</strong><small>${c.desc || ''}</small></span>
              </a>`).join('')}
          </div>
        </li>`;
    }).join('');
  }

  function buildMobile(here) {
    return MENU.map(function (item) {
      if (!item.children) {
        return `<li><a href="${item.href}"${item.href === here ? ' class="active"' : ''}>${item.icon} ${item.label}</a></li>`;
      }
      return `
        <li class="m-group">
          <span class="m-group-title">${item.icon} ${item.label}</span>
          <ul class="m-sub">
            ${item.children.map(c => `<li><a href="${c.href}"${c.href === here ? ' class="active"' : ''}>${c.icon} ${c.label}</a></li>`).join('')}
          </ul>
        </li>`;
    }).join('');
  }

  function initNav() {
    const navToggle = document.getElementById('nav-toggle');
    const mainNav = document.getElementById('main-nav');
    const header = document.querySelector('.site-header');
    if (!navToggle || !mainNav) return;

    const here = currentFile();
    mainNav.innerHTML = `
      <ul class="nav-desktop">${buildDesktop(here)}</ul>
      <ul class="nav-mobile">${buildMobile(here)}</ul>
    `;

    const icon = navToggle.querySelector('i');
    navToggle.setAttribute('aria-expanded', 'false');

    function closeAllDropdowns() {
      mainNav.querySelectorAll('.nav-group.open').forEach(g => {
        g.classList.remove('open');
        const b = g.querySelector('.nav-group-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }

    function openNav() {
      mainNav.classList.add('open');
      document.body.classList.add('nav-open');
      navToggle.setAttribute('aria-expanded', 'true');
      if (icon) icon.className = 'fa-solid fa-xmark';
    }
    function closeNav() {
      mainNav.classList.remove('open');
      document.body.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
      if (icon) icon.className = 'fa-solid fa-bars';
      closeAllDropdowns();
    }

    navToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      mainNav.classList.contains('open') ? closeNav() : openNav();
    });

    // PC 드롭다운 클릭
    mainNav.querySelectorAll('.nav-group-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const group = btn.closest('.nav-group');
        const wasOpen = group.classList.contains('open');
        closeAllDropdowns();
        if (!wasOpen) {
          group.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));

    document.addEventListener('click', function (e) {
      if (mainNav.contains(e.target) || (header && header.contains(e.target))) return;
      closeAllDropdowns();
      if (mainNav.classList.contains('open')) closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeAllDropdowns(); closeNav(); }
    });

    window.addEventListener('resize', function () {
      if (!window.matchMedia('(max-width: 1024px)').matches) closeNav();
      else closeAllDropdowns();
    });
  }

  // ---------- 화면 조회수 및 접속 시간대 통계 수집 (voca.page_views) ----------
  function trackPageView() {
    try {
      const f = location.pathname.split('/').pop() || 'index.html';
      if (f === 'admin.html') return; // 관리자 페이지 제외
      const title = document.title.replace(' - 단어야 놀자!', '').trim() || f;
      const now = new Date();
      const hour = now.getHours();
      const day = now.toISOString().slice(0, 10);

      // 1) 로컬 통계
      try {
        const STATS_KEY = 'voca_local_pv_stats';
        const stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{"pages":{},"hours":{},"days":{},"recent":[]}');
        stats.pages[f] = (stats.pages[f] || 0) + 1;
        stats.hours[hour] = (stats.hours[hour] || 0) + 1;
        stats.days[day] = (stats.days[day] || 0) + 1;
        stats.recent = (stats.recent || []).slice(0, 29);
        stats.recent.unshift({ path: f, title: title, time: now.toISOString() });
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
      } catch (e) {}

      // 2) Supabase 실시간 서버 통계
      function sendToSupabase() {
        if (!window.sb) return;
        const uid = window.VocaAuth && window.VocaAuth.getUser ? (window.VocaAuth.getUser() || {}).id : null;
        window.sb.from('page_views').insert({
          path: '/' + f,
          page_title: title,
          referrer: document.referrer || null,
          user_id: uid || null,
          hour: hour,
          day: day
        }).then(() => {}, () => {});
      }

      if (window.sb) {
        sendToSupabase();
      } else {
        window.addEventListener('load', () => setTimeout(sendToSupabase, 600), { once: true });
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initNav(); trackPageView(); });
  } else {
    initNav();
    trackPageView();
  }
})();
