/* ============================================================
   단어야 놀자! - 내 학습 이력 패널 (voca-recent.js)

   [이 파일이 하는 일]
     로그인한 사용자에게 "최근 외운 단어"와 "내 북마크 단어"를 보여 줍니다.
     데이터는 이미 voca.learn_progress 에 쌓이고 있어 읽기만 합니다.
       item_id 규칙 : 'w_<단어id>' = 암기 완료 / 'bm_<단어id>' = 북마크

   [비로그인 사용자]
     서버 호출 없음. 단어 학습·퀴즈·플래시카드는 지금과 100% 동일합니다.

   의존성: cg-auth.js (window.CGAuth)
   ============================================================ */

(function () {
  'use strict';

  function CG() { return window.CGAuth || null; }

  // ---------- 단어 id → 단어 ----------
  var byId = null;
  function buildIndex() {
    if (byId) return byId;
    byId = {};
    try {
      var data = window.VOCA_DATA || {};
      Object.keys(data).forEach(function (cat) {
        (data[cat] || []).forEach(function (w) {
          if (w && w.id != null) byId[String(w.id)] = w;
        });
      });
    } catch (e) { /* 데이터가 없는 페이지에서는 원본 id 표시 */ }
    return byId;
  }

  function wordOf(itemId) {
    var raw = String(itemId || '');
    var id = raw.replace(/^(w_|bm_)/, '');
    var w = buildIndex()[id];
    if (!w) return { title: raw, url: 'learn.html' };
    return {
      title: w.word,
      subtitle: w.meaning || '',
      url: 'learn.html?cat=' + encodeURIComponent(w.cat || '')
    };
  }

  function mount() {
    if (!CG() || !CGAuth.mountRecentPanel) return;

    var host = document.getElementById('voca-recent');
    if (host) {
      CGAuth.mountRecentPanel(host, {
        title: '⚡ 최근 외운 단어',
        moreUrl: 'login.html',
        guestText: 'Google 로그인하면 외운 단어와 북마크가 계정에 저장돼, 다른 기기에서도 이어서 학습할 수 있어요.',
        emptyText: '아직 외운 단어가 없어요. 단어 학습을 시작하면 여기에 쌓입니다.',
        loader: async function () {
          var rows = await CGAuth.listHistory('learn_progress', {
            schema: 'voca', orderBy: 'learned_at', limit: 20
          });
          return rows
            .filter(function (r) { return String(r.item_id).indexOf('bm_') !== 0; })
            .slice(0, 8)
            .map(function (r) {
              var w = wordOf(r.item_id);
              return { title: w.title, subtitle: w.subtitle, url: w.url, updated_at: r.learned_at };
            });
        }
      });
    }

    var bmHost = document.getElementById('voca-recent-bookmark');
    if (bmHost) {
      CGAuth.mountRecentPanel(bmHost, {
        title: '⭐ 내 북마크 단어',
        moreUrl: 'bookmark.html',
        guestText: 'Google 로그인하면 북마크한 단어를 어느 기기에서나 볼 수 있어요.',
        emptyText: '아직 북마크한 단어가 없어요.',
        loader: async function () {
          var rows = await CGAuth.listHistory('learn_progress', {
            schema: 'voca', orderBy: 'learned_at', limit: 40
          });
          return rows
            .filter(function (r) { return String(r.item_id).indexOf('bm_') === 0; })
            .slice(0, 8)
            .map(function (r) {
              var w = wordOf(r.item_id);
              return { title: w.title, subtitle: w.subtitle, url: 'bookmark.html', updated_at: r.learned_at };
            });
        }
      });
    }
  }

  function start() { if (CG()) mount(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
