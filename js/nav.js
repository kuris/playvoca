/* ============================================================
   단어야 놀자! (PlayVoca) - 공통 상단 내비게이션 (nav.js)
   - PC: 5개 그룹 + 드롭다운 / 태블릿·모바일: 햄버거 서랍
   - 화면 조회수 수집은 js/track.js 가 담당합니다 (이 파일은 내비게이션만)
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
    const desktopHtml = MENU.map(function (item, i) {
      if (!item.children) {
        const active = item.href === here ? ' class="active"' : '';
        return `<li><a href="${item.href}"${active}>${item.icon} ${item.label}</a></li>`;
      }
      const active = item.children.some(c => c.href === here);
      return `
        <li class="nav-group">
          <button class="nav-group-btn${active ? ' active' : ''}" aria-expanded="false" data-group="${i}">
            ${item.icon} ${item.label} <i class="fa-solid fa-chevron-down"></i>
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

    const familyDesktop = `
      <li class="nav-family-item">
        <div class="family-nav-wrap">
          <button type="button" class="family-btn" id="family-btn">
            다른 놀자 서비스 <span style="font-size: 10px; margin-left: 2px;">▾</span>
          </button>
          <div class="family-dropdown" id="family-dropdown">
            <a href="https://mindtest.chatgpts.kr" target="_blank" rel="noopener"><span>🧠</span> <span>마인드테스트</span></a>
            <a href="https://hanja.chatgpts.kr" target="_blank" rel="noopener"><span>📖</span> <span>한자야 놀자</span></a>
            <a href="https://fortune.chatgpts.kr" target="_blank" rel="noopener"><span>🔮</span> <span>운세야 놀자</span></a>
            <a href="https://history.chatgpts.kr" target="_blank" rel="noopener"><span>📜</span> <span>역사야 놀자</span></a>
            <a href="https://work.chatgpts.kr" target="_blank" rel="noopener"><span>💼</span> <span>워크야 놀자</span></a>
            <a href="https://money.chatgpts.kr" target="_blank" rel="noopener"><span>💰</span> <span>머니야 놀자</span></a>
            <a href="https://tools.chatgpts.kr" target="_blank" rel="noopener"><span>🛠️</span> <span>문서야 놀자</span></a>
            <a href="https://bible.chatgpts.kr" target="_blank" rel="noopener"><span>✝️</span> <span>성경아 놀자</span></a>
            <a href="https://chatgpts.kr" target="_blank" rel="noopener"><span>🏠</span> <span>chatgpts.kr</span></a>
          </div>
        </div>
      </li>`;

    return desktopHtml + familyDesktop;
  }

  function buildMobile(here) {
    const mobileHtml = MENU.map(function (item) {
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

    const familyMobile = `
      <li class="m-group" style="border-top: 2px solid rgba(109, 40, 217, 0.25); margin-top: 10px; padding-top: 10px;">
        <span class="m-group-title" style="color: #6D28D9; font-weight: 800;">🎡 다른 놀자 서비스</span>
        <ul class="m-sub">
          <li><a href="https://mindtest.chatgpts.kr" target="_blank" rel="noopener">🧠 마인드테스트</a></li>
          <li><a href="https://hanja.chatgpts.kr" target="_blank" rel="noopener">📖 한자야 놀자</a></li>
          <li><a href="https://fortune.chatgpts.kr" target="_blank" rel="noopener">🔮 운세야 놀자</a></li>
          <li><a href="https://history.chatgpts.kr" target="_blank" rel="noopener">📜 역사야 놀자</a></li>
          <li><a href="https://work.chatgpts.kr" target="_blank" rel="noopener">💼 워크야 놀자</a></li>
          <li><a href="https://money.chatgpts.kr" target="_blank" rel="noopener">💰 머니야 놀자</a></li>
          <li><a href="https://tools.chatgpts.kr" target="_blank" rel="noopener">🛠️ 문서야 놀자</a></li>
          <li><a href="https://bible.chatgpts.kr" target="_blank" rel="noopener">✝️ 성경아 놀자</a></li>
          <li><a href="https://chatgpts.kr" target="_blank" rel="noopener">🏠 chatgpts.kr</a></li>
        </ul>
      </li>`;

    return mobileHtml + familyMobile;
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

    const familyBtn = document.getElementById('family-btn');
    const familyDropdown = document.getElementById('family-dropdown');
    if (familyBtn && familyDropdown) {
      familyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAllDropdowns();
        familyDropdown.classList.toggle('show');
      });
      document.addEventListener('click', function () {
        familyDropdown.classList.remove('show');
      });
    }

    function closeAllDropdowns() {
      if (familyDropdown) familyDropdown.classList.remove('show');
      mainNav.querySelectorAll('.nav-group.open').forEach(g => {
        g.classList.remove('open');
        const b = g.querySelector('.nav-group-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }

    function openNav() {
      // 사용자 메뉴가 열려있다면 닫기
      const userDropdown = document.getElementById('user-menu-dropdown');
      if (userDropdown) userDropdown.style.display = 'none';

      mainNav.classList.add('open');
      document.body.classList.add('nav-open');
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.setAttribute('aria-label', '메뉴 닫기');
      if (icon) icon.className = 'fa-solid fa-xmark';
    }
    function closeNav() {
      mainNav.classList.remove('open');
      document.body.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', '메뉴 열기');
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
      if (mainNav.contains(e.target) || navToggle.contains(e.target)) return;
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

  // ---------- 화면 조회수 수집은 js/track.js 가 담당합니다 ----------
  // 예전에는 이 파일에서 voca.page_views 로도 기록했지만,
  // 관리자 통계가 public.page_views(service='voca') 를 읽으므로 중복이었습니다.
  // 페이지뷰마다 불필요한 요청이 한 번 더 나가 수집 지점을 track.js 로 일원화했습니다.
  // (내비게이션 동작에는 영향 없음)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
