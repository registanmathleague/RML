/* Registan Math League (RML) — single-page client, v2.
   Talks to the Apps Script web app (window.PORTAL_CONFIG.apiUrl) or, in demo mode, to the same Code.gs
   running in the page against an in-memory sheet. */
(function () {
  'use strict';
  var CFG = window.PORTAL_CONFIG || {};
  var DEMO = CFG.apiUrl === 'demo';
  var DESMOS_KEY = 'dcb31709b452b1cf9dc26972add0fda6';
  var $app = document.getElementById('app');

  // ---------- storage ----------
  var mem = {};
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { if (v === null) delete mem[k]; else mem[k] = v; } }
  function load(k) { try { var v = localStorage.getItem(k); return v === null ? (mem[k] || null) : v; } catch (e) { return mem[k] || null; } }

  // ---------- i18n ----------
  var LANGS = [{ id: 'uz', label: 'O‘zbekcha' }, { id: 'ru', label: 'Русский' }, { id: 'en', label: 'English' }];
  var nav0 = (navigator.language || '').slice(0, 2);
  var lang = load('rm_lang') || (nav0 === 'ru' ? 'ru' : nav0 === 'en' ? 'en' : 'uz');
  function t(k, vars) {
    var s = (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
    if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  }
  var FLAGS = {
    uz: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#1eb53a"/><rect width="30" height="13" fill="#fff"/><rect width="30" height="6.4" fill="#0099b5"/><rect y="6.4" width="30" height=".6" fill="#ce1126"/><rect y="13" width="30" height=".6" fill="#ce1126"/><circle cx="5" cy="3.2" r="2.1" fill="#fff"/><circle cx="5.8" cy="3.2" r="2" fill="#0099b5"/></svg>',
    ru: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#d52b1e"/><rect width="30" height="13.3" fill="#0039a6"/><rect width="30" height="6.7" fill="#fff"/></svg>',
    en: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#012169"/><path d="M0 0L60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0L60 40M60 0L0 40" stroke="#c8102e" stroke-width="3"/><path d="M30 0V40M0 20H60" stroke="#fff" stroke-width="12"/><path d="M30 0V40M0 20H60" stroke="#c8102e" stroke-width="7"/></svg>'
  };

  // ---------- icons (inline SVG, one stroke style) ----------
  var ICONS = {
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 20 3M16 7l3 3M14 9l2 2"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>', chevron: '<path d="m9 6 6 6-6 6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    caret: '<path d="m6 9 6 6 6-6"/>', logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    tests: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4v4h-4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>', flag: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12"/>',
    refresh: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h2M16 15v3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>', play: '<path d="M7 4v16l13-8z"/>',
    flame: '<path d="M12 3c2 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 1 2 2 3 4z"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>', star: '<path d="M12 3l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 10l6-1z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1"/>',
    cube: '<path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z"/><path d="M4 7.4l8 4.6 8-4.6M12 12v9.2"/>'
  };
  function icon(name, label) {
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      (label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true" focusable="false"') + '>' + ICONS[name] + '</svg>';
  }
  function sr(text) { return '<span class="sr">' + esc(text) + '</span>'; }
  // temporary league mark: three arches (Registan) + gold base; swap for the brand logo when it arrives
  function logo(size, label) {
    return '<svg class="logo-mark" width="' + size + '" height="' + size + '" viewBox="0 0 72 72" ' + (label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true"') + '>' +
      '<path d="M8 50V30a8 8 0 0 1 16 0v20" fill="none" stroke="#1d4ed8" stroke-width="4.5"/>' +
      '<path d="M24 50V24a12 12 0 0 1 24 0v26" fill="none" stroke="#0b1f4d" stroke-width="5"/>' +
      '<path d="M48 50V30a8 8 0 0 1 16 0v20" fill="none" stroke="#1d4ed8" stroke-width="4.5"/>' +
      '<path d="M4 55h64" stroke="#d4a017" stroke-width="4.5" stroke-linecap="round"/>' +
      '<path d="M30 33h12M36 27v12" stroke="#d4a017" stroke-width="3.5" stroke-linecap="round"/></svg>';
  }

  // ---------- helpers ----------
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function h(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  var GREEK = { alpha: 'α Alpha', beta: 'β Beta', gamma: 'γ Gamma' };
  function groupLabel(g) { var p = String(g || '').split('-'); return p.length > 1 ? p[0] + ' · ' + (GREEK[p[1]] || p[1]) : String(g || ''); }
  function groupShort(g) { var p = String(g || '').split('-')[1]; return GREEK[p] || groupLabel(g); }
  function groupClass(g) { var p = String(g || '').split('-')[1]; return GREEK[p] ? 'g-' + p : ''; }
  function fmtDate(d) { if (!d) return ''; var p = String(d).split('-'); return p.length === 3 ? p[2] + '.' + p[1] : d; }
  function seasonNo(s) { return String(s || '').replace('S', ''); }
  function firstName(n) { var p = String(n || '').split(' '); return p[1] || p[0]; }
  var DOMAIN_ORDER = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'];
  var timers = [];
  function later(fn, ms) { var id = setInterval(fn, ms); timers.push(id); return id; }

  // ---------- API ----------
  var session = { token: load('rm_token'), user: null };
  try { session.user = JSON.parse(load('rm_user') || 'null'); } catch (e) {}
  function api(action, payload) {
    var body = Object.assign({ action: action, token: session.token }, payload || {});
    if (DEMO) {
      return new Promise(function (res) { setTimeout(function () {
        res(JSON.parse(window.doPost({ postData: { contents: JSON.stringify(body) } }).getContent()));
      }, 120); });
    }
    return fetch(CFG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'network' }; })
      .then(function (res) { if (!RC_READ[action] && !RC_KEEP[action]) rcDrop(); return res; });
  }

  // ---------- read cache (stale-while-revalidate): a screen opened before shows its last data at once,
  // the server is asked again in the background and the screen is redrawn only if the answer changed ----------
  var RC_READ = { dashboard: 1, testState: 1, round: 1, mistakes: 1, league: 1, heroes: 1, students: 1, groupOverview: 1, cubes: 1, cubesGroup: 1, hero: 1 };
  var RC_KEEP = { ping: 1, proctorBoard: 1 };          // reads that are never cached but must not drop the cache either
  var RC_FRESH_MS = 2000, RC_MAX_AGE_MS = 30 * 60 * 1000, RC_STORE = 'rm_rc';
  var rc = {}, rcInflight = {}, rcGen = 0, rcRedrawT = null;
  try { var rcSaved = JSON.parse(sessionStorage.getItem(RC_STORE) || 'null'); if (rcSaved && session.user && rcSaved.u === session.user.login) rc = rcSaved.e || {}; } catch (e) {}
  function rcSave() { try { sessionStorage.setItem(RC_STORE, JSON.stringify({ u: session.user && session.user.login, e: rc })); } catch (e) {} }
  function rcDrop() { rcGen++; rc = {}; rcInflight = {}; try { sessionStorage.removeItem(RC_STORE); } catch (e) {} }
  function rcFetch(key, action, payload) {
    if (rcInflight[key]) return rcInflight[key];
    var gen = rcGen;
    var p = api(action, payload).then(function (res) {
      if (rcInflight[key] === p) delete rcInflight[key];
      if (res.ok && gen === rcGen) { rc[key] = { at: Date.now(), json: JSON.stringify(res) }; rcSave(); }
      return res;
    });
    rcInflight[key] = p;
    return p;
  }
  function apiC(action, payload) {                    // cached variant of api() for read-only screens
    if (DEMO || !RC_READ[action]) return api(action, payload);
    var key = action + '|' + JSON.stringify(payload || {}), hit = rc[key], now = Date.now();
    if (!hit || now - hit.at > RC_MAX_AGE_MS) return rcFetch(key, action, payload);
    if (now - hit.at > RC_FRESH_MS) {
      var before = hit.json, route = curRoute();
      rcFetch(key, action, payload).then(function (res) {
        if (!res.ok) { if (/^(auth_expired|auth_required|must_change_password)$/.test(res.error)) { try { guard(res); } catch (e) {} } return; }
        if (rc[key] && rc[key].json !== before) rcRedraw(route);
      });
    }
    return Promise.resolve(JSON.parse(hit.json));
  }
  function rcRedraw(route) {                          // redraw the same screen with fresh data, keeping the scroll position
    clearTimeout(rcRedrawT);
    rcRedrawT = setTimeout(function () {
      if (curRoute() !== route || TS || document.querySelector('.modal, .plock')) return;
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
      var y = window.scrollY;
      render();
      setTimeout(function () { window.scrollTo(0, y); }, 0);
    }, 30);
  }
  function errText(e) { return t('err.' + e) !== 'err.' + e ? t('err.' + e) : t('err.generic'); }
  function guard(res) {
    if (res.ok) return res;
    if (res.error === 'auth_expired' || res.error === 'auth_required') { setSession(null); flash = errText(res.error); go('#/login'); }
    else if (res.error === 'must_change_password') { session.user.mustChange = true; go('#/password'); }
    throw res;
  }
  function setSession(tok, user) {
    rcDrop();
    session.token = tok; session.user = user || null;
    store('rm_token', tok); store('rm_user', user ? JSON.stringify(user) : null);
  }
  var flash = '';
  var isStaff = function () { return session.user && session.user.role !== 'student'; };

  // ---------- menus & dialogs ----------
  function langMenu(dark) {
    return '<div class="lang"><button class="lang-btn' + (dark ? ' on-dark' : '') + '" aria-haspopup="true" aria-expanded="false" aria-label="' + esc(t('c.language')) + ': ' + lang.toUpperCase() + '">' + FLAGS[lang] +
      '<span aria-hidden="true">' + lang.toUpperCase() + '</span>' + icon('caret') + '</button><div class="lang-menu" hidden>' +
      LANGS.map(function (l) { return '<button data-lang="' + l.id + '"' + (l.id === lang ? ' class="on"' : '') + '>' + FLAGS[l.id] + '<span>' + l.label + '</span></button>'; }).join('') + '</div></div>';
  }
  function setLang(l) { lang = l; store('rm_lang', lang); document.documentElement.lang = lang; render(); }
  // language is chosen on the login page; after sign-in it is changed from the profile (students) or the account menu (staff)
  function langDialog() {
    var m = openDialog('<h2>' + esc(t('c.language')) + '</h2><div class="lang-pick">' + LANGS.map(function (l) { return '<button class="btn' + (l.id === lang ? ' primary' : '') + '" data-l="' + l.id + '">' + FLAGS[l.id] + l.label + '</button>'; }).join('') + '</div>', '<button class="btn" data-n>' + esc(t('c.close')) + '</button>');
    m.querySelector('[data-n]').onclick = m._close;
    m.querySelectorAll('[data-l]').forEach(function (x) { x.onclick = function () { m.remove(); setLang(x.getAttribute('data-l')); }; });
    m.querySelector('[data-l]').focus();
  }
  function bindLang(root) {
    root.querySelectorAll('.lang').forEach(function (box) {
      var btn = box.querySelector('.lang-btn'), menu = box.querySelector('.lang-menu');
      btn.onclick = function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); };
      menu.querySelectorAll('[data-lang]').forEach(function (b) { b.onclick = function () { setLang(b.getAttribute('data-lang')); }; });
    });
  }
  function closeMenus() {
    document.querySelectorAll('.lang-menu,.user-menu').forEach(function (m) { m.hidden = true; });
    document.querySelectorAll('.lang-btn[aria-expanded],.user-btn[aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  }
  document.addEventListener('click', closeMenus);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var m = document.querySelector('.modal'); if (m) { m._close(); return; }
    var s = document.querySelector('.sheet.on'); if (s && s._close) { s._close(); return; }
    closeMenus();
  });
  function openDialog(inner, buttons) {
    var prev = document.activeElement;
    var m = h('<div class="modal"><div class="modal-c card" role="dialog" aria-modal="true" aria-labelledby="dlg-t">' + inner + '<div class="modal-a">' + buttons + '</div></div></div>');
    var first = m.querySelector('.modal-c h2, .modal-c p'); if (first) first.id = 'dlg-t';
    m._close = function () { m.remove(); if (prev && prev.focus) prev.focus(); };
    m.addEventListener('click', function (e) { if (e.target === m) m._close(); });
    m.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = m.querySelectorAll('button, input, textarea'); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    document.body.appendChild(m);
    return m;
  }
  function modal(inner) {
    var m = openDialog(inner, '<button class="btn primary" data-c>' + esc(t('c.close')) + '</button>');
    m.querySelector('[data-c]').onclick = m._close; m.querySelector('[data-c]').focus();
  }
  function confirmBox(text, onYes, yesLabel) {
    var m = openDialog('<p>' + esc(text) + '</p>', '<button class="btn" data-n>' + esc(t('c.cancel')) + '</button><button class="btn primary" data-y>' + esc(yesLabel || t('c.ok')) + '</button>');
    m.querySelector('[data-n]').onclick = m._close;
    m.querySelector('[data-y]').onclick = function () { m._close(); onYes(); };
    m.querySelector('[data-n]').focus();
  }
  function toast(text) {
    var x = h('<div class="toast" role="status" aria-live="polite">' + esc(text) + '</div>'); document.body.appendChild(x);
    setTimeout(function () { x.remove(); }, 3000);
  }

  // ---------- focus after navigation ----------
  var navigated = false;
  function focusMain(root) {
    if (!navigated) return;
    var hd = (root || document).querySelector('main h1, main h2, .hero h1, form h1');
    if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
  }

  // ---------- shells ----------
  var STUDENT_TABS = [['home', 'nav.home', 'home'], ['tests', 'nav.tests', 'tests'], ['mistakes', 'nav.mistakes', 'target'], ['league', 'nav.league', 'trophy'], ['profile', 'nav.profile', 'user']];
  var STAFF_TABS = [['group', 'nav.group', 'grid'], ['students', 'nav.students', 'users'], ['rounds', 'nav.rounds', 'calendar'], ['league', 'nav.league', 'trophy']];
  if (CFG.cubes !== false) STAFF_TABS.push(['cubes', 'cb.title', 'cube']);
  function demoBar() { return DEMO ? '<div class="demo">' + esc(t('demo.banner')) + '</div>' : ''; }
  function brandBar() {
    return '<div class="brandbar"><a class="brand" href="#/home" aria-label="Registan Math League">' + '<span class="brand-badge">' + logo(26) + '</span><span class="brand-short">RML</span><span class="brand-long">Registan Math League</span></a>';
  }
  function studentShell(active, title, sub) {
    $app.innerHTML = demoBar() + '<div class="app student">' +
      '<header class="hero">' + brandBar() + '<nav class="top-nav" aria-label="' + esc(t('nav.label')) + '">' + STUDENT_TABS.map(function (x) {
        return '<a href="#/' + x[0] + '"' + (x[0] === active ? ' class="on" aria-current="page"' : '') + '>' + icon(x[2]) + '<span>' + esc(t(x[1])) + '</span></a>';
      }).join('') + '</nav>' + cubeChip() + '</div>' +
      '<h1>' + esc(title) + '</h1>' + (sub ? '<p class="hero-sub">' + sub + '</p>' : '') + '</header>' +
      '<main id="main" class="lift"></main>' +
      '<nav class="bottom-nav" aria-label="' + esc(t('nav.label')) + '">' + STUDENT_TABS.map(function (x) {
        return '<a href="#/' + x[0] + '"' + (x[0] === active ? ' class="on" aria-current="page"' : '') + '>' + icon(x[2]) + '<span>' + esc(t(x[1])) + '</span></a>';
      }).join('') + '</nav></div>';
    bindLang($app);
    if (CUBE.bal === null) refreshBal();
    return document.getElementById('main');
  }
  // two columns on a computer, one column (in the order given by m-a/m-b classes) on a phone
  function cols(mainHtml, sideHtml) { return '<div class="cols"><div class="col-main">' + mainHtml + '</div><div class="col-side">' + sideHtml + '</div></div>'; }
  function staffShell(active) {
    var u = session.user;
    $app.innerHTML = demoBar() + '<div class="app staff"><header class="hero staff-bar">' + brandBar() +
      '<nav class="staff-nav" aria-label="' + esc(t('nav.label')) + '">' + STAFF_TABS.map(function (x) {
        return '<a href="#/' + x[0] + '"' + (x[0] === active ? ' class="on" aria-current="page"' : '') + '>' + icon(x[2]) + '<span>' + esc(t(x[1])) + '</span></a>';
      }).join('') + '</nav>' +
      '<div class="top-r"><div class="user"><button class="user-btn" aria-haspopup="true" aria-expanded="false" aria-label="' + esc(t('menu.account')) + ': ' + esc(u.name) + '"><span class="avatar" aria-hidden="true">' + esc(String(u.name || u.login).charAt(0)) + '</span></button>' +
      '<div class="user-menu" hidden><div class="um-name">' + esc(u.name) + '<small>' + esc(u.login) + ' · ' + esc(u.role) + '</small></div>' +
      '<button data-act="langdlg">' + icon('globe') + esc(t('c.language')) + '<span class="um-v">' + FLAGS[lang] + '</span></button>' +
      '<a href="#/password">' + icon('lock') + esc(t('menu.password')) + '</a><button data-act="logout">' + icon('logout') + esc(t('menu.logout')) + '</button></div></div></div></div></header>' +
      '<main id="main" class="staff-main"></main></div>';
    bindLang($app);
    var ub = $app.querySelector('.user-btn'), um = $app.querySelector('.user-menu');
    ub.onclick = function (e) { e.stopPropagation(); um.hidden = !um.hidden; ub.setAttribute('aria-expanded', String(!um.hidden)); };
    $app.querySelector('[data-act=logout]').onclick = logout;
    $app.querySelector('[data-act=langdlg]').onclick = function () { um.hidden = true; langDialog(); };
    return document.getElementById('main');
  }
  function logout() { api('logout'); setSession(null); go('#/login'); }
  function loading(main) { main.innerHTML = '<div class="loading"><span class="spin"></span>' + esc(t('c.loading')) + '</div>'; }
  function showError(main, e, retry) {
    main.innerHTML = '<div class="card err-card"><p>' + esc(errText(e && e.error)) + '</p><button class="btn">' + icon('refresh') + esc(t('c.retry')) + '</button></div>';
    main.querySelector('button').onclick = retry;
  }
  function fail(main, retry) { return function (e) { if (e && e.error) showError(main, e, retry); else { console.error(e); showError(main, { error: 'generic' }, retry); } }; }

  // ---------- auth views ----------
  function authFrame(inner) {
    $app.innerHTML = demoBar() + '<div class="auth"><div class="auth-top">' + langMenu(true) + '</div>' +
      '<div class="auth-brand"><div class="auth-logo">' + logo(76, 'Registan Math League') + '</div><div class="auth-title">Registan Math League</div><div class="auth-sub">' + esc(t('brand.tagline')) + '</div></div>' +
      inner + '<div class="auth-foot">Registan school · Mathematics</div></div>';
    bindLang($app); bindEyes($app);
  }
  function pwField(name, label, auto, min) {
    return '<label>' + esc(label) + '<span class="pw"><input name="' + name + '" type="password" autocomplete="' + auto + '" required' + (min ? ' minlength="' + min + '"' : '') + '><button type="button" class="eye" aria-label="' + esc(t('pw.show')) + '" aria-pressed="false">' + icon('eye') + '</button></span></label>';
  }
  function bindEyes(root) {
    root.querySelectorAll('.eye').forEach(function (b) {
      b.onclick = function () {
        var i = b.previousElementSibling, show = i.type === 'password';
        i.type = show ? 'text' : 'password';
        b.setAttribute('aria-pressed', show ? 'true' : 'false'); b.setAttribute('aria-label', t(show ? 'pw.hide' : 'pw.show'));
        b.innerHTML = icon(show ? 'eyeOff' : 'eye');
      };
    });
  }
  function viewLogin() {
    authFrame('<form class="card auth-card" autocomplete="on"><h1>' + esc(t('login.title')) + '</h1>' +
      '<label>' + esc(t('login.login')) + '<input name="login" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>' +
      pwField('password', t('login.password'), 'current-password') +
      '<p class="msg" role="alert" aria-live="assertive">' + esc(flash) + '</p><button class="btn primary big" type="submit">' + esc(t('login.submit')) + '</button>' +
      '<p class="hint center">' + esc(t('login.hint')) + '</p></form>');
    flash = '';
    var f = $app.querySelector('form');
    f.onsubmit = function (e) {
      e.preventDefault();
      var b = f.querySelector('button[type=submit]'), msg = f.querySelector('.msg');
      b.disabled = true; msg.textContent = '';
      api('login', { login: f.login.value.trim(), password: f.password.value }).then(function (r) {
        b.disabled = false;
        if (!r.ok) { msg.textContent = errText(r.error); return; }
        setSession(r.token, r.user);
        go(r.user.mustChange ? '#/password' : '#/');
      });
    };
  }
  function viewPassword() {
    var forced = session.user.mustChange;
    var form = '<form class="card auth-card"><h1>' + esc(t(forced ? 'pw.title' : 'pw.change')) + '</h1>' +
      (forced ? '<p class="hint">' + esc(t('pw.firstHint')) + '</p>' : '') +
      pwField('current', t('pw.current'), 'current-password') + pwField('new', t('pw.new'), 'new-password', 6) + pwField('repeat', t('pw.repeat'), 'new-password', 6) +
      '<p class="msg" role="alert" aria-live="assertive"></p><button class="btn primary big" type="submit">' + esc(t('pw.save')) + '</button>' +
      (forced ? '' : '<a class="btn ghost" href="#/' + (isStaff() ? 'group' : 'profile') + '">' + esc(t('c.cancel')) + '</a>') + '</form>';
    authFrame(form);
    var f = $app.querySelector('form');
    f.onsubmit = function (e) {
      e.preventDefault();
      var msg = f.querySelector('.msg');
      if (f['new'].value !== f.repeat.value) { msg.textContent = t('pw.mismatch'); return; }
      var b = f.querySelector('button[type=submit]'); b.disabled = true;
      api('changePassword', { oldPassword: f.current.value, newPassword: f['new'].value }).then(function (r) {
        b.disabled = false;
        if (!r.ok) { if (r.error === 'auth_expired') return guard(r); msg.textContent = errText(r.error); return; }
        setSession(session.token, r.user); toast(t('pw.saved')); go('#/');
      });
    };
  }

  // ---------- shared bits ----------
  function lastSats(rounds) { return rounds.filter(function (r) { return r.result && r.result.sat !== null; }).map(function (r) { return r.result.sat; }); }
  function routeChip(route) { return route ? '<i class="route ' + (route === 'Hard' ? 'hard' : 'easy') + '">' + esc(t('r.' + route)) + '</i>' : ''; }
  function tile(label, value, sub) {
    return '<div class="tile"><div class="tile-l">' + esc(label) + '</div><div class="tile-v">' + value + '</div><div class="tile-s">' + (sub || '&nbsp;') + '</div></div>';
  }
  function satChart(rounds, compact) {
    var narrow = compact || window.innerWidth < 560, W = narrow ? 340 : 640, H = narrow ? 200 : 220, L = 38, R = 14, T = 16, B = 28;
    var n = rounds.length, xs = function (i) { return n === 1 ? (L + (W - R)) / 2 : L + i * (W - L - R) / (n - 1); };
    var ys = function (v) { return T + (800 - v) * (H - T - B) / 600; };
    var sats = rounds.map(function (r) { return r.result.sat; });
    var summary = t('ov.chartSummary', { n: n, last: sats[n - 1], min: Math.min.apply(null, sats), max: Math.max.apply(null, sats) });
    var grid = '<text x="' + (L + 4) + '" y="' + (T - 4) + '" class="ax ax-t">SAT</text>' + [200, 400, 600, 800].map(function (v) {
      return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(v) + '" y2="' + ys(v) + '" class="grid"/><text x="' + (L - 8) + '" y="' + (ys(v) + 4) + '" class="ax" text-anchor="end">' + v + '</text>';
    }).join('');
    var pts = rounds.map(function (r, i) { return [xs(i), ys(r.result.sat)]; });
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = n > 1 ? path + ' L' + pts[n - 1][0].toFixed(1) + ' ' + ys(200) + ' L' + pts[0][0].toFixed(1) + ' ' + ys(200) + ' Z' : '';
    var labels = rounds.map(function (r, i) { return '<text x="' + xs(i) + '" y="' + (H - 8) + '" class="ax" text-anchor="middle">R' + r.roundNo + '</text>'; }).join('');
    var dots = rounds.map(function (r, i) {
      var tip = t('r.round') + ' ' + r.roundNo + ' · ' + fmtDate(r.date) + '|SAT ' + r.result.sat + '|M1 ' + r.result.m1 + '/22 · M2 ' + r.result.m2 + '/22 (' + t('r.' + r.result.route) + ')';
      return '<circle cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" r="5" class="dot"/><circle cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" r="24" class="hit" tabindex="0" role="button" aria-label="' + esc(tip.split('|').join(', ')) + '" data-tip="' + esc(tip) + '"/>' +
        (i === n - 1 ? '<text x="' + pts[i][0] + '" y="' + (pts[i][1] - 12) + '" class="lbl" text-anchor="middle">' + r.result.sat + '</text>' : '');
    }).join('');
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="' + esc(summary) + '"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2563eb" stop-opacity=".22"/><stop offset="1" stop-color="#2563eb" stop-opacity="0"/></linearGradient></defs>' + grid + labels +
      (n > 1 ? '<path d="' + area + '" fill="url(#ga)"/><path d="' + path + '" class="line"/>' : '') + dots + '</svg><div class="tip" hidden></div></div>';
  }
  function bindChart(root) {
    root.querySelectorAll('.chart').forEach(function (c) {
      var tip = c.querySelector('.tip');
      c.querySelectorAll('.hit').forEach(function (hit) {
        var show = function () {
          var p = hit.getAttribute('data-tip').split('|');
          tip.innerHTML = '<b>' + esc(p[0]) + '</b><br>' + esc(p[1]) + '<br><span>' + esc(p[2]) + '</span>';
          var cr = c.getBoundingClientRect(), hr = hit.getBoundingClientRect(); tip.hidden = false;
          var x = hr.left - cr.left + hr.width / 2 - tip.offsetWidth / 2;
          tip.style.left = Math.max(0, Math.min(cr.width - tip.offsetWidth, x)) + 'px';
          tip.style.top = Math.max(0, hr.top - cr.top - tip.offsetHeight - 4) + 'px';
        };
        ['mouseenter', 'click', 'focus'].forEach(function (ev) { hit.addEventListener(ev, show); });
        ['mouseleave', 'blur'].forEach(function (ev) { hit.addEventListener(ev, function () { tip.hidden = true; }); });
      });
    });
  }
  function domainBars(dom) {
    var keys = DOMAIN_ORDER.filter(function (k) { return dom[k]; }).concat(Object.keys(dom).filter(function (k) { return DOMAIN_ORDER.indexOf(k) < 0; }));
    if (!keys.length) return '<p class="muted">' + esc(t('ov.noRounds')) + '</p>';
    return '<div class="bars">' + keys.map(function (k) {
      var d = dom[k], p = Math.round(100 * d.c / d.n);
      return '<div class="bar-row"><div class="bar-l">' + esc(k) + '</div><div class="bar-t"><div class="bar-f" style="width:' + p + '%"></div></div><div class="bar-v"><b>' + p + '%</b><small>' + d.c + '/' + d.n + '</small></div></div>';
    }).join('') + '</div>';
  }
  function weakSkills(sk, n) {
    return Object.keys(sk).map(function (k) { return { k: k, d: sk[k], p: sk[k].c / sk[k].n }; })
      .filter(function (x) { return x.d.n >= 2 && x.p < 1; }).sort(function (a, b) { return a.p - b.p || b.d.n - a.d.n; }).slice(0, n || 4);
  }
  function roundCard(r, base, test) {
    var res = r.result, inner, status = '', href = null;
    if (test && test.roundId === r.roundId && !test.done) {
      inner = '<div class="rc-sub">' + esc(t('test.facts', { q: 22, m: test.m1Minutes })) + '</div>';
      status = '<span class="pill blue">' + esc(t(test.open ? 'test.live' : 'test.soon')) + '</span>';
      return '<div class="rc"><div><div class="rc-h"><b>' + esc(t('r.round')) + ' ' + r.roundNo + '</b><small>' + fmtDate(r.date) + '</small></div>' + inner + status + '</div>' +
        (test.open ? '<a class="btn primary" href="#/test">' + esc(t(test.m1.started ? 'test.continue' : 'test.start')) + '</a>' : '') + '</div>';
    }
    if (!res) return '<div class="rc dim"><div><div class="rc-h"><b>' + esc(t('r.round')) + ' ' + r.roundNo + '</b><small>' + fmtDate(r.date) + '</small></div><div class="rc-sub">' + esc(t('r.notWritten')) + '</div></div></div>';
    href = base + '/round/' + encodeURIComponent(r.roundId);
    inner = '<div class="rc-sub">M1 ' + res.m1 + '/22' + (res.m2 !== null ? ' · M2 ' + res.m2 + '/22 ' + routeChip(res.route) : ' · ' + esc(t('r.partial'))) + '</div>';
    status = r.reviewOpen ? '<span class="pill ok">' + icon('check') + esc(t('r.reviewOpen')) + '</span>' : '<span class="pill">' + icon('lock') + esc(t('r.reviewLocked')) + '</span>';
    return '<a class="rc" href="' + href + '"><div><div class="rc-h"><b>' + esc(t('r.round')) + ' ' + r.roundNo + '</b><small>' + fmtDate(r.date) + '</small></div>' + inner + status + '</div>' +
      '<div class="rc-sat"><b>' + (res.sat !== null ? res.sat : '—') + '</b><small>SAT</small></div></a>';
  }

  // ---------- student: home ----------
  function testCard(test) {
    if (!test) return '<section class="card testcard quiet"><div class="tc-k">' + esc(t('test.week')) + '</div><p class="muted">' + esc(t('test.none')) + '</p></section>';
    var state, btn = '', note = '';
    if (test.done) {
      state = '<span class="pill ok">' + esc(t('test.done')) + '</span>';
      btn = test.result ? '<a class="btn ghost big" href="#/test">' + esc(t('test.seeResult')) + ' · SAT ' + test.result.sat + '</a>' : '';
      note = test.result ? '' : t('test.resultLater');
    } else if (!test.open) {
      state = '<span class="pill">' + esc(t('test.soon')) + '</span>';
      note = t(test.m1.started ? 'test.pausedNote' : 'test.soonNote');
      btn = '<button class="btn ghost big" data-act="refresh">' + icon('refresh') + esc(t('c.refresh')) + '</button>';
    } else {
      state = '<span class="pill ok">' + esc(t('test.live')) + '</span>';
      var label = !test.m1.submitted ? (test.m1.started ? 'test.continueM1' : 'test.start') : (test.m2 && test.m2.started ? 'test.continueM2' : 'test.startM2');
      btn = '<a class="btn primary big" href="#/test">' + icon('play') + esc(t(label)) + '</a>';
      note = t('test.rulesShort');
    }
    return '<section class="card testcard"><div class="tc-top"><span class="tc-k">' + esc(t('test.week')) + '</span>' + state + '</div>' +
      '<div class="tc-title">' + esc(t('r.round')) + ' ' + test.roundNo + ' · SAT Math</div><div class="tc-sub">' + esc(t('test.facts', { q: 22, m: test.m1Minutes })) + '</div>' +
      btn + (note ? '<p class="tc-note">' + esc(note) + '</p>' : '') + '</section>';
  }
  function viewHome() {
    var u = session.user;
    var main = studentShell('home', t('home.hello', { name: firstName(u.name) }), esc(u.cls) + ' · ' + esc(groupShort(u.group)));
    loading(main);
    Promise.all([apiC('dashboard').then(guard), apiC('testState').then(guard)]).then(function (x) {
      var d = x[0], test = x[1].test;
      var sats = lastSats(d.rounds), last = sats[sats.length - 1], first = sats[0], delta = sats.length > 1 ? last - sats[sats.length - 2] : null;
      var html = '';
      var side = '<section class="tiles two m-b">' +
        tile(t('ov.last'), last !== undefined ? last : '—', delta !== null ? '<span class="delta ' + (delta >= 0 ? 'up' : 'down') + '">' + (delta >= 0 ? '▲ +' : '▼ ') + delta + '</span> ' + esc(t('ov.vsPrev')) : '') +
        tile(t('home.place'), d.league.place ? d.league.place + '<span class="of"> / ' + d.league.size + '</span>' : '—', '<span class="chip ' + groupClass(u.group) + '">' + esc(groupShort(u.group)) + '</span>') + '</section>';
      var s2w = d.rounds.filter(function (r) { return r.season === 'S2' && r.result && r.result.sat !== null; });
      if (s2w.length > 1) side += '<section class="card desk-only"><h2>' + esc(t('ov.trend')) + '</h2>' + satChart(s2w, true) + '</section>';
      var weak = weakSkills(d.skills, 1)[0];
      if (d.goal) {
        var pct = last ? Math.max(0, Math.min(100, Math.round(100 * (last - 200) / (d.goal - 200)))) : 0;
        html += '<section class="card goal"><div class="goal-h"><b>' + esc(t('goal.label', { g: d.goal })) + '</b><span>' + (last ? (last >= d.goal ? esc(t('goal.reached')) : esc(t('goal.left', { n: d.goal - last }))) : '') + '</span></div>' +
          '<div class="progress" role="progressbar" aria-valuemin="200" aria-valuemax="' + d.goal + '" aria-valuenow="' + (last || 200) + '"><div style="width:' + pct + '%"></div></div>' +
          (weak ? '<p class="goal-tip">' + esc(t('goal.tip')) + ' <a href="#/mistakes">' + esc(weak.k) + '</a></p>' : '') + '</section>';
      } else {
        html += '<section class="card goal empty"><div><b>' + esc(t('goal.setTitle')) + '</b><p class="muted">' + esc(t('goal.setHint')) + '</p></div><button class="btn" data-act="goal">' + icon('target') + esc(t('goal.set')) + '</button></section>';
      }
      if (d.announcement) html += '<section class="card note">' + icon('megaphone') + '<div><b>' + esc(t('home.fromTeacher')) + '</b> ' + esc(d.announcement.text) + '</div></section>';
      if (CUBES_ON) side += '<a class="card cube-home" href="#/games">' + cubeIco(34) + '<div><b>' + esc(t('cb.homeT')) + '</b><small>' + esc(t('cb.homeS')) + '</small></div>' + icon('chevron') + '</a>';
      main.innerHTML = cols('<div class="m-a">' + testCard(test) + '</div>' + html, side); bindChart(main);
      var rb = main.querySelector('[data-act=refresh]'); if (rb) rb.onclick = viewHome;
      var gb = main.querySelector('[data-act=goal]'); if (gb) gb.onclick = function () { goalDialog(d.goal, viewHome, lastSatOf(d)); };
      focusMain(main);
    }).catch(fail(main, viewHome));
  }
  // goal is picked on a 200–800 scale: drag the dot, tap −10/+10, or use the arrow keys
  function lastSatOf(d) {
    var w = (d.rounds || []).filter(function (r) { return r.season === 'S2' && r.result && r.result.sat !== null && r.result.sat !== undefined && r.result.sat !== ''; });
    return w.length ? Number(w[w.length - 1].result.sat) : null;
  }
  function goalDialog(cur, after, last) {
    var start = Number(cur) || (last ? Math.min(800, Math.round((last + 50) / 10) * 10) : 600);
    var frac = function (v) { return (v - 200) / 600; };
    var m = openDialog('<h2>' + esc(t('goal.setTitle')) + '</h2><p class="muted">' + esc(t('goal.setHint')) + '</p>' +
      '<div class="gs"><div class="gs-v" aria-hidden="true"><b id="gsV">' + start + '</b><span id="gsD"></span></div>' +
      '<div class="gs-row"><button class="btn icon-btn" data-d="-10" aria-label="−10">−</button>' +
      '<div class="gs-track">' + (last ? '<span class="gs-now" style="--f:' + frac(last) + '"><i></i><small>' + esc(t('goal.now', { n: last })) + '</small></span>' : '') +
      '<input type="range" class="gs-range" min="200" max="800" step="10" value="' + start + '" aria-label="' + esc(t('goal.input')) + '">' +
      '<div class="gs-scale" aria-hidden="true">' + [200, 400, 600, 800].map(function (v) { return '<span style="--f:' + frac(v) + '">' + v + '</span>'; }).join('') + '</div></div>' +
      '<button class="btn icon-btn" data-d="10" aria-label="+10">+</button></div></div><p class="msg" role="alert"></p>',
      '<button class="btn" data-n>' + esc(t('c.cancel')) + '</button><button class="btn primary" data-y>' + esc(t('c.save')) + '</button>');
    m.querySelector('.modal-c').classList.add('wide');
    var inp = m.querySelector('.gs-range'), out = m.querySelector('#gsV'), dl = m.querySelector('#gsD');
    var show = function () {
      var v = Number(inp.value);
      out.textContent = v; inp.style.setProperty('--p', (frac(v) * 100) + '%');
      inp.setAttribute('aria-valuetext', String(v));
      dl.textContent = last ? (v > last ? t('goal.more', { n: v - last }) : t('goal.reachedAlready')) : '';
    };
    inp.oninput = show; show(); inp.focus();
    m.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { inp.value = Math.max(200, Math.min(800, Number(inp.value) + Number(b.getAttribute('data-d')))); show(); }; });
    m.querySelector('[data-n]').onclick = m._close;
    m.querySelector('[data-y]').onclick = function () {
      api('setGoal', { goal: Number(inp.value) }).then(function (r) {
        if (!r.ok) { m.querySelector('.msg').textContent = errText(r.error); return; }
        session.user.goal = r.goal; store('rm_user', JSON.stringify(session.user)); m._close(); toast(t('goal.saved')); after();
      });
    };
  }

  // ---------- student: tests ----------
  var testsSeason = 'S2';
  function viewTests() {
    var main = studentShell('tests', t('tests.title'), esc(t('tests.sub'))); loading(main);
    Promise.all([apiC('dashboard').then(guard), apiC('testState').then(guard)]).then(function (x) {
      var d = x[0], test = x[1].test;
      var draw = function () {
        var html = '<div class="chips over">' + ['S2', 'S1'].map(function (s) { return '<button data-s="' + s + '" aria-pressed="' + (s === testsSeason) + '"' + (s === testsSeason ? ' class="on"' : '') + '>' + esc(t('r.season')) + ' ' + seasonNo(s) + '</button>'; }).join('') + '</div>';
        if (testsSeason === 'S1') {
          html += d.history.length ? '<section class="card"><h2>' + esc(t('ov.season1')) + '</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">' + esc(t('r.round')) + '</th><th scope="col" class="num">%</th><th scope="col">' + esc(t('tests.grade')) + '</th></tr></thead><tbody>' +
            d.history.map(function (x) { return '<tr><td>' + esc(x.label || ('R' + x.roundNo)) + '</td><td class="num">' + (x.pct === null ? '—' : x.pct + '%') + '</td><td>' + esc(x.grade || '') + '</td></tr>'; }).join('') + '</tbody></table></div></section>'
            : '<section class="card"><p class="muted">' + esc(t('ov.noRounds')) + '</p></section>';
        } else {
          var rounds = d.rounds.filter(function (r) { return r.season === 'S2'; });
          var written = rounds.filter(function (r) { return r.result && r.result.sat !== null; });
          if (written.length) html += '<section class="card"><h2>' + esc(t('ov.trend')) + '</h2>' + satChart(written) + '</section>';
          var nowR = rounds.filter(function (r) { return test && test.roundId === r.roundId && !test.done; });
          var rest = rounds.filter(function (r) { return nowR.indexOf(r) < 0; }).reverse();
          if (nowR.length) html += '<h2 class="sec">' + esc(t('tests.now')) + '</h2>' + nowR.map(function (r) { return roundCard(r, '#', test); }).join('');
          html += '<h2 class="sec">' + esc(t('tests.written')) + '</h2>' + (rest.length ? rest.map(function (r) { return roundCard(r, '#', test); }).join('') : '<p class="muted">' + esc(t('ov.noRounds')) + '</p>');
          var sats = written.map(function (r) { return r.result.sat; }), side = '';
          if (sats.length) side += '<section class="card row-between"><span class="muted">' + esc(t('tests.avg')) + '</span><b>' + Math.round(sats.reduce(function (a, b) { return a + b; }, 0) / sats.length) + '</b></section>';
          side += '<section class="card"><h2>' + esc(t('ov.domains')) + '</h2>' + domainBars(d.domains) + '</section>';
          var chipsEnd = html.indexOf('</div>') + 6; html = html.slice(0, chipsEnd) + cols(html.slice(chipsEnd), side);
        }
        main.innerHTML = html; bindChart(main);
        main.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { testsSeason = b.getAttribute('data-s'); draw(); }; });
      };
      draw(); focusMain(main);
    }).catch(fail(main, viewTests));
  }

  // ---------- round review (student or teacher view) ----------
  var reviewFilter = 'all';
  function itemCard(it) {
    var resp = it.resp === '' || it.resp === null || it.resp === undefined ? '<i class="muted">' + esc(t('r.blank')) + '</i>' : '<b>' + esc(it.resp) + '</b>';
    var html = '<article class="item ' + (it.correct === false || it.wrong ? 'wrong' : 'right') + '"><header><span class="qn">' + it.pos + '</span>' +
      '<span class="mark">' + icon(it.correct === false || it.wrong ? 'x' : 'check', t(it.correct === false || it.wrong ? 'r.wrong' : 'r.right')) + '</span>' +
      '<span class="meta">' + (it.roundNo ? esc(t('r.round')) + ' ' + it.roundNo + ' · ' + esc(it.module === 'M1' ? 'M1' : 'M2') + ' · ' : '') + esc(it.domain) + ' • ' + esc(it.skill) + '</span>' +
      '<span class="diff">' + esc(t('r.d' + it.diff)) + (it.kind === 'SPR' ? ' · ' + icon('pencil', t('r.spr')) : '') + '</span></header>';
    html += it.html ? '<div class="q">' + it.html + (it.opts && it.opts.length ? '<ol class="opts" type="A">' + it.opts.map(function (o) { return '<li>' + o + '</li>'; }).join('') + '</ol>' : '') + '</div>' : '';
    html += '<div class="ans"><span>' + esc(t('r.your')) + ': ' + resp + '</span>' + (it.key !== undefined ? '<span>' + esc(t('r.correct')) + ': <b>' + esc(String(it.key).replace(' or ', ' / ')) + '</b></span>' : '<span class="muted">' + icon('lock') + esc(t('r.keyLater')) + '</span>') + '</div>';
    if (it.solution) html += '<details class="sol"><summary>' + esc(t('r.solution')) + '</summary><div>' + it.solution + '</div></details>';
    if ((it.correct === false || it.wrong) && it.key !== undefined && it.html && it.roundId && it.module)
      html += '<button class="btn ghost sim" data-sim="' + esc(it.roundId + '|' + it.module + '|' + it.pos) + '">' + icon('refresh') + esc(t('sim.btn')) + '</button>';
    return html + '</article>';
  }
  // ---------- "solve a similar problem" (twin question from another variant; checked on the server) ----------
  function similarDialog(rid, module, pos, seen) {
    api('similar', { roundId: rid, module: module, pos: pos, seen: seen }).then(guard).then(function (d) {
      var mc = d.kind !== 'SPR' && d.opts && d.opts.length, pick = '';
      var inner = '<h2>' + esc(t('sim.title')) + '</h2><p class="muted sim-skill">' + esc(d.skill) + '</p><div class="qbody sim-q">' + d.html + '</div>' +
        (mc ? '<div class="opts-run" role="radiogroup" aria-label="' + esc(t('test.choose')) + '">' + d.opts.map(function (o, i) { var L = 'ABCD'.charAt(i);
                return '<button class="opt" role="radio" aria-checked="false" data-l="' + L + '"><span class="L">' + L + '</span><span class="ot">' + o + '</span></button>'; }).join('') + '</div>'
            : '<label class="spr">' + esc(t('r.your')) + '<input id="simA" autocomplete="off" inputmode="text"></label>') +
        '<div id="simR" class="sim-r" role="status" aria-live="polite"></div>';
      var m = openDialog(inner, '<button class="btn" data-n>' + esc(t('c.close')) + '</button><button class="btn primary" data-y>' + esc(t('sim.check')) + '</button>');
      m.querySelector('.modal-c').classList.add('wide');
      m.querySelector('[data-n]').onclick = m._close;
      m.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () {
        pick = b.getAttribute('data-l');
        m.querySelectorAll('.opt').forEach(function (x) { var on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-checked', String(on)); });
      }; });
      var y = m.querySelector('[data-y]'), checked = false;
      y.onclick = function () {
        if (checked) { m._close(); similarDialog(rid, module, pos, seen.concat([d.ref])); return; }
        var ans = mc ? pick : (m.querySelector('#simA').value || '').trim();
        if (!ans) { m.querySelector('#simR').innerHTML = '<p class="muted">' + esc(t('sim.empty')) + '</p>'; return; }
        y.disabled = true;
        api('similarCheck', { roundId: rid, module: module, pos: pos, ref: d.ref, answer: ans }).then(guard).then(function (c) {
          checked = true; y.disabled = false;
          m.querySelector('#simR').innerHTML = '<div class="notice ' + (c.correct ? 'ok' : 'bad') + '">' + icon(c.correct ? 'check' : 'x') + '<span>' +
            (c.correct ? esc(t('sim.right')) : esc(t('sim.wrong', { k: String(c.key).replace(' or ', ' / ') }))) + '</span></div>' +
            (c.solution ? '<details class="sol"><summary>' + esc(t('r.solution')) + '</summary><div>' + c.solution + '</div></details>' : '');
          m.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; if (x.getAttribute('data-l') === String(c.key)) x.classList.add('key'); });
          var inp = m.querySelector('#simA'); if (inp) inp.readOnly = true;
          if (d.left > 0) { y.textContent = t('sim.next'); } else { y.remove(); }
          (m.querySelector('[data-y]') || m.querySelector('[data-n]')).focus();
        }).catch(function (e) { y.disabled = false; toast(errText(e.error)); });
      };
    }).catch(function (e) { toast(e && e.error === 'no_similar' ? t('sim.none') : errText(e && e.error)); });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-sim]'); if (!b) return;
    var p = b.getAttribute('data-sim').split('|'); similarDialog(p[0], p[1], Number(p[2]), []);
  });
  function viewRound(roundId, login) {
    var main = login ? staffShell('students') : studentShell('tests', t('r.round'), '');
    loading(main);
    apiC('round', { roundId: roundId, login: login }).then(guard).then(function (d) {
      var res = d.result || {};
      if (!login) { var hh = $app.querySelector('.hero h1'); hh.textContent = t('r.round') + ' ' + d.round.roundNo; $app.querySelector('.hero').insertAdjacentHTML('beforeend', '<p class="hero-sub">' + esc(t('r.season')) + ' ' + seasonNo(d.round.season) + ' · ' + fmtDate(d.round.date) + '</p>'); }
      var html = (login ? teacherBar(d.user, '#/student/' + encodeURIComponent(login), t('r.back')) : '<a class="back" href="#/tests">' + icon('back') + esc(t('r.back')) + '</a>') +
        '<section class="card round-head"><div><div class="tile-l">SAT</div><div class="sat big">' + (res.sat !== null && res.sat !== undefined ? res.sat : '—') + '</div></div><div class="mods">M1 ' + (res.m1 !== undefined ? res.m1 : '—') + '/22' +
        (res.m2 !== null && res.m2 !== undefined ? '<br>M2 ' + res.m2 + '/22 ' + routeChip(res.route) : '') + '</div></section>';
      if (!d.keysShown) html += '<div class="notice">' + icon('lock') + '<span>' + esc(t('r.locked')) + '</span></div>';
      html += '<div class="chips"><button data-f="all">' + esc(t('r.all')) + '</button><button data-f="wrong">' + esc(t('r.mistakes')) + '</button></div><div id="items"></div>';
      main.innerHTML = html;
      var draw = function () {
        main.querySelectorAll('[data-f]').forEach(function (b) { var on = b.getAttribute('data-f') === reviewFilter; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
        main.querySelector('#items').innerHTML = d.modules.map(function (m) {
          var items = m.items.filter(function (it) { return reviewFilter === 'all' || !it.correct; });
          var title = m.module === 'M1' ? t('r.module1') : t('r.module2') + ' · ' + t(m.module === 'M2H' ? 'r.Hard' : 'r.Easy');
          return '<section class="module"><h2>' + esc(title) + ' <small>' + m.items.filter(function (i) { return i.correct; }).length + '/22</small></h2>' +
            (items.length ? items.map(function (it) { it.roundId = d.round.roundId; it.module = m.module; return itemCard(it); }).join('') : '<p class="muted">' + esc(t('r.noMistakes')) + '</p>') + '</section>';
        }).join('');
      };
      main.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { reviewFilter = b.getAttribute('data-f'); draw(); }; });
      draw(); focusMain(main);
    }).catch(fail(main, function () { viewRound(roundId, login); }));
  }

  // ---------- student: mistakes ----------
  function viewMistakes() {
    var main = studentShell('mistakes', t('mis.title'), esc(t('mis.sub'))); loading(main);
    Promise.all([apiC('mistakes').then(guard), apiC('dashboard').then(guard)]).then(function (x) {
      var items = x[0].items, skills = x[1].skills, by = {};
      items.forEach(function (it) { (by[it.skill] = by[it.skill] || []).push(it); });
      var keys = Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length || a.localeCompare(b); });
      var rounds = {}; items.forEach(function (it) { rounds[it.roundId] = 1; });
      var stats = '<section class="card stats3 m-a"><div><b class="bad">' + items.length + '</b><span>' + esc(t('mis.wrong')) + '</span></div><div><b>' + keys.length + '</b><span>' + esc(t('mis.skills')) + '</span></div><div><b>' + Object.keys(rounds).length + '</b><span>' + esc(t('mis.rounds')) + '</span></div></section>';
      var html = '';
      if (!keys.length) html += '<section class="card"><p class="muted">' + esc(t('mis.none')) + '</p></section>';
      html += keys.map(function (k, i) {
        var s = skills[k] || { n: by[k].length, c: 0 }, pct = Math.round(100 * s.c / s.n);
        return '<details class="card skill"' + (i === 0 ? ' open' : '') + '><summary><div><b>' + esc(k) + '</b><small>' + esc(by[k][0].domain) + '</small></div>' +
          '<div class="sk-r"><b class="bad">' + esc(t('mis.count', { n: by[k].length })) + '</b><small>' + esc(t('mis.acc', { p: pct })) + '</small></div></summary>' +
          '<div class="progress thin"><div style="width:' + pct + '%"></div></div><div class="sk-items">' +
          by[k].sort(function (a, b) { return b.roundNo - a.roundNo || a.pos - b.pos; }).map(function (it) { it.wrong = true; return itemCard(it); }).join('') + '</div></details>';
      }).join('');
      if (CUBES_ON) html = '<a class="card games-banner" href="#/games"><span class="g-ic">' + icon('play') + '</span><div><b>' + esc(t('gm.banner')) + '</b><small>' + esc(t('gm.bannerSub')) + '</small></div>' + icon('chevron') + '</a>' + html;
      main.innerHTML = cols(html, stats); focusMain(main);
    }).catch(fail(main, viewMistakes));
  }

  // ---------- league ----------
  var leagueGroup = null, LG_HEROES = {};
  function leagueTable(g) {
    return '<div class="tbl-wrap"><table class="tbl league"><thead><tr><th scope="col">#</th><th scope="col">' + esc(t('lg.student')) + '</th>' +
      g.rounds.map(function (r) { return '<th scope="col" class="num wide-only">R' + r.roundNo + '</th>'; }).join('') + '<th scope="col" class="num">' + esc(t('lg.avg')) + '</th></tr></thead><tbody>' +
      g.rows.map(function (r) {
        var medal = r.place && r.place <= 3 ? '<span class="medal m' + r.place + '">' + r.place + '</span>' : (r.place || '—');
        var hr = LG_HEROES[r.name + '|' + r.cls];
        return '<tr' + (r.me ? ' class="me"' : '') + '><td>' + medal + '</td><td>' + (CUBES_ON ? '<span class="who">' + avatarOf(hr, r.name, 34) + '<span>' + esc(r.name) + '<small class="lg">' + esc(r.cls) + '</small></span></span>' : esc(r.name) + '<small class="lg">' + esc(r.cls) + '</small>') + '</td>' +
          r.sats.map(function (s) { return '<td class="num wide-only">' + (s === null ? '<span class="muted">—</span>' : s) + '</td>'; }).join('') +
          '<td class="num"><b>' + (r.avg === null ? '—' : r.avg) + '</b></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function viewLeague() {
    var staff = isStaff();
    var main = staff ? staffShell('league') : studentShell('league', t('lg.title'), ''); loading(main);
    Promise.all([apiC('league').then(guard), CUBES_ON ? apiC('heroes').then(function (r) { return r.ok ? r.heroes : {}; }) : Promise.resolve({})]).then(function (xx) {
      var d = xx[0]; LG_HEROES = xx[1] || {};
      if (!d.groups.length) { main.innerHTML = '<section class="card"><p class="muted">' + esc(t('lg.empty')) + '</p></section>'; return; }
      var mine = d.groups.filter(function (g) { return g.rows.some(function (r) { return r.me; }); })[0];
      if (!leagueGroup || !d.groups.some(function (g) { return g.group === leagueGroup; })) leagueGroup = (mine || d.groups[0]).group;
      if (!staff) { var sub = $app.querySelector('.hero'); var played = Math.max.apply(null, d.groups[0].rows.map(function (r) { return r.played; }).concat([0])); sub.insertAdjacentHTML('beforeend', '<p class="hero-sub">' + esc(t('r.season')) + ' ' + seasonNo(d.season) + ' · ' + esc(t('lg.after', { n: played })) + '</p>'); }
      var draw = function () {
        var g = d.groups.filter(function (x) { return x.group === leagueGroup; })[0], me = g.rows.filter(function (r) { return r.me; })[0];
        var html = '<div class="chips' + (staff ? '' : ' over') + '">' + d.groups.map(function (x) {
          return '<button data-g="' + esc(x.group) + '" aria-pressed="' + (x.group === leagueGroup) + '" class="' + (x.group === leagueGroup ? 'on ' : '') + groupClass(x.group) + '">' + esc(staff ? groupLabel(x.group) : groupShort(x.group)) + '</button>';
        }).join('') + '</div>';
        var side = '';
        if (me && me.place) {
          var above = g.rows.filter(function (r) { return r.place === me.place - 1; })[0];
          side += '<section class="card place m-a"><div class="place-n">' + me.place + '</div><div><b>' + esc(t('lg.you')) + '</b><br><span class="muted">' + (above ? esc(t('lg.toNext', { n: above.avg - me.avg + 1, p: above.place })) : esc(t('lg.first'))) + '</span></div></section>';
        }
        html += staff ? side + '<section class="card flush">' + leagueTable(g) + '</section><p class="hint pad">' + esc(t('lg.note')) + '</p>'
          : cols('<section class="card flush">' + leagueTable(g) + '</section>', side + '<p class="hint pad">' + esc(t('lg.note')) + '</p>');
        main.innerHTML = html;
        main.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { leagueGroup = b.getAttribute('data-g'); draw(); }; });
      };
      draw(); focusMain(main);
    }).catch(fail(main, viewLeague));
  }

  // ---------- student: profile ----------
  function badges(rounds) {
    var s2 = rounds.filter(function (r) { return r.season === 'S2'; });
    var sats = lastSats(s2), best = sats.length ? Math.max.apply(null, sats) : 0, streak = 0;
    for (var i = s2.length - 1; i >= 0; i--) { if (s2[i].result && s2[i].result.sat !== null) streak++; else if (streak) break; }
    var growth = sats.length > 1 ? sats[sats.length - 1] - sats[0] : 0;
    return [
      { on: streak >= 3, icon: 'flame', t: t('b.streak'), s: t('b.streakSub', { n: streak }) },
      { on: growth > 0, icon: 'trend', t: t('b.growth'), s: growth > 0 ? '+' + growth : t('b.growthSub') },
      { on: best >= 600, icon: 'star', t: '600+', s: 'SAT' },
      { on: best >= 700, icon: 'trophy', t: '700+', s: 'SAT' }
    ];
  }
  function viewProfile() {
    var u = session.user;
    var main = studentShell('profile', t('nav.profile'), ''); loading(main);
    Promise.all([apiC('dashboard').then(guard), CUBES_ON ? apiC('cubes').then(guard) : Promise.resolve(null)]).then(function (xx) {
      var d = xx[0], w = xx[1];
      if (w) setBal(w.balance);
      var b = badges(d.rounds);
      var row = function (act, ic, label, right) { return '<button class="row-item" data-act="' + act + '">' + icon(ic) + '<span class="ri-l">' + esc(label) + '</span><span class="ri-r">' + esc(right || '') + '</span>' + icon('chevron') + '</button>'; };
      var meCard = w ? '<section class="card me-card"><a class="me-av" href="#/hero" aria-label="' + esc(t('hr.title')) + '">' + (w.hero ? heroBust(w.hero, 64) : '<span class="avatar big" aria-hidden="true">' + esc(String(u.name).charAt(0)) + '</span>') + '</a><div><b>' + esc(u.name) + '</b><br><span class="muted">' + esc(u.login) + ' · ' + esc(u.cls) + ' · ' + esc(groupShort(u.group)) + '</span><br><a class="link-b" href="#/hero">' + esc(w.hero ? t('hr.title') : t('hr.make')) + ' →</a></div></section>' + walletCard(w)
        : '<section class="card me-card"><div class="avatar big" aria-hidden="true">' + esc(String(u.name).charAt(0)) + '</div><div><b>' + esc(u.name) + '</b><br><span class="muted">' + esc(u.login) + ' · ' + esc(u.cls) + ' · ' + esc(groupShort(u.group)) + '</span></div></section>';
      main.innerHTML = cols(meCard +
        '<section class="card"><h2>' + esc(t('b.title')) + '</h2><ul class="badges">' + b.map(function (x) {
          return '<li class="' + (x.on ? 'on' : '') + '"><span class="bdg">' + icon(x.icon) + '</span><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small>' + sr(x.on ? t('b.got') : t('b.notYet')) + '</li>';
        }).join('') + '</ul></section>',
        '<section class="card list">' + row('goal', 'target', t('goal.my'), d.goal || t('goal.notSet')) + row('s1', 'calendar', t('ov.season1'), d.history.length ? t('prof.rounds', { n: d.history.length }) : '—') +
        row('lang', 'globe', t('c.language'), LANGS.filter(function (l) { return l.id === lang; })[0].label) + row('pw', 'lock', t('menu.password'), '') + '</section>' +
        '<button class="btn danger big" data-act="logout">' + icon('logout') + esc(t('menu.logout')) + '</button>');
      main.querySelector('[data-act=goal]').onclick = function () { goalDialog(d.goal, viewProfile, lastSatOf(d)); };
      main.querySelector('[data-act=s1]').onclick = function () { testsSeason = 'S1'; go('#/tests'); };
      main.querySelector('[data-act=pw]').onclick = function () { go('#/password'); };
      main.querySelector('[data-act=logout]').onclick = logout;
      main.querySelector('[data-act=lang]').onclick = langDialog;
      focusMain(main);
    }).catch(fail(main, viewProfile));
  }

  // ---------- online weekly test ----------
  var TS = null;              // the running module
  function tsKey() { return 'rml_t_' + session.user.login + '_' + TS.roundId + '_' + TS.module; }
  function tsPersist() { if (TS) store(tsKey(), JSON.stringify({ a: TS.ans, f: TS.flag, l: TS.leaves, c: TS.cur, t: TS.attempt || 0 })); }
  function viewTestHub() {
    $app.innerHTML = demoBar() + '<div class="app test"><header class="hero slim">' + brandBar() + '</div><a class="back on-hero" href="#/home">' + icon('back') + esc(t('nav.home')) + '</a></header><main id="main" class="lift"></main></div>';
    bindLang($app);
    var main = document.getElementById('main'); loading(main);
    api('testState').then(guard).then(function (x) {
      var s = x.test;
      if (!s) { main.innerHTML = '<section class="card"><p class="muted">' + esc(t('test.none')) + '</p><a class="btn" href="#/home">' + icon('back') + esc(t('nav.home')) + '</a></section>'; return; }
      if (s.done) return testResult(main, s);
      var which = !s.m1.submitted ? 'M1' : 'M2', started = which === 'M1' ? s.m1.started : (s.m2 && s.m2.started);
      var P = s.proctor || {}, pOn = !!P.on, pBlock = pOn && (!P.present || P.locked), needCode = pOn && !pBlock && !P.admitted;
      var rule = function (ic, txt) { return '<li>' + icon(ic) + '<span>' + esc(txt) + '</span></li>'; };
      main.innerHTML = '<section class="card intro"><div class="tc-k">' + esc(t('r.season')) + ' ' + seasonNo(s.season) + ' · ' + esc(t('r.round')) + ' ' + s.roundNo + '</div>' +
        '<h1>' + esc(which === 'M1' ? t('r.module1') : t('r.module2')) + ' · SAT Math</h1>' +
        '<div class="stats3"><div><b>22</b><span>' + esc(t('test.questions')) + '</span></div><div><b>' + (which === 'M1' ? s.m1Minutes : s.m2Minutes) + '</b><span>' + esc(t('test.minutes')) + '</span></div><div><b>2</b><span>' + esc(t('test.modules')) + '</span></div></div></section>' +
        (which === 'M2' && !started ? '<div class="notice ok">' + icon('check') + '<span>' + esc(t('test.m1Done')) + '</span></div>' : '') +
        '<section class="card"><ul class="rules">' + rule('clock', t('test.rule1')) + rule('refresh', t('test.rule2')) + (which === 'M1' ? rule('trend', t('test.rule3', { n: s.threshold })) : '') + rule('calc', t('test.rule4')) + (pOn ? rule('lock', t('pr.rule')) : '') + '</ul></section>' +
        (pBlock ? '<div class="notice warn">' + icon(P.locked ? 'lock' : 'users') + '<span>' + esc(t(!P.present ? 'pr.notPresent' : P.reason === 'finished' ? 'pr.finishedNote' : 'pr.pausedNote')) + '</span></div><button class="btn big" data-act="refresh">' + icon('refresh') + esc(t('c.refresh')) + '</button>' :
        s.open ? (needCode ? '<label class="field pcode">' + esc(t('pr.codeLabel')) + '<input id="pcode" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"></label>' : '') + '<button class="btn primary big" data-act="go">' + icon('play') + esc(t(started ? (which === 'M1' ? 'test.continueM1' : 'test.continueM2') : (which === 'M1' ? 'test.startM1' : 'test.startM2'))) + '</button>'
                : '<div class="notice">' + icon('lock') + '<span>' + esc(t(started ? 'test.pausedNote' : 'test.soonNote')) + '</span></div><button class="btn big" data-act="refresh">' + icon('refresh') + esc(t('c.refresh')) + '</button>') +
        '<p class="msg" role="alert"></p>';
      var go_ = main.querySelector('[data-act=go]');
      if (go_) go_.onclick = function () {
        go_.disabled = true;
        var pc = main.querySelector('#pcode');
        api('testStart', { roundId: s.roundId, which: which, code: pc ? pc.value : '' }).then(function (r) {
          if (!r.ok) { go_.disabled = false; main.querySelector('.msg').textContent = errText(r.error); if (r.error === 'auth_expired') guard(r); if (r.error === 'test_paused' || r.error === 'not_present') setTimeout(viewTestHub, 1500); return; }
          beginModule(s.roundId, r);
        });
      };
      var rf = main.querySelector('[data-act=refresh]'); if (rf) rf.onclick = viewTestHub;
      focusMain(main);
    }).catch(fail(main, viewTestHub));
  }
  function testResult(main, s) {
    var r = s.result;
    main.innerHTML = '<section class="card result">' + (r ? '<div class="tc-k">' + esc(t('r.round')) + ' ' + s.roundNo + ' · ' + esc(t('test.yourScore')) + '</div><div class="sat huge">' + r.sat + '</div><p class="muted">' + esc(t('test.scale')) + '</p>' +
      '<div class="tiles two"><div class="tile"><div class="tile-l">' + esc(t('r.module1')) + '</div><div class="tile-v">' + r.m1 + '<span class="of">/22</span></div></div><div class="tile"><div class="tile-l">' + esc(t('r.module2')) + ' ' + routeChip(r.route) + '</div><div class="tile-v">' + r.m2 + '<span class="of">/22</span></div></div></div>'
      : '<h1>' + esc(t('test.done')) + '</h1><p class="muted">' + esc(t('test.resultLater')) + '</p>') + '</section>' +
      (r ? '<section class="card"><h2>' + esc(t('ov.domains')) + '</h2>' + domainBars(r.domains) + '</section>' : '') +
      '<div class="notice">' + icon('lock') + '<span>' + esc(t('r.locked')) + '</span></div><a class="btn primary big" href="#/home">' + esc(t('nav.home')) + '</a>';
    focusMain(main);
  }
  function beginModule(roundId, r) {
    TS = { roundId: roundId, module: r.module, items: r.items, ans: r.answers || {}, flag: {}, cur: 1, deadline: r.deadline, offset: r.now - Date.now(),
           leaves: r.leaves || 0, dirty: false, saving: false, submitting: false, roundNo: r.roundNo,
           attempt: r.attempt || 0, proctor: !!r.proctor, locked: false };
    var local = null; try { local = JSON.parse(load(tsKey()) || 'null'); } catch (e) {}
    if (local && (local.t || 0) !== TS.attempt) { local = null; store(tsKey(), null); }   // the attempt was reset by the teacher: start clean
    if (local) { TS.ans = Object.assign({}, TS.ans, local.a || {}); TS.flag = local.f || {}; TS.leaves = Math.max(TS.leaves, local.l || 0); TS.cur = local.c || 1; if (Object.keys(local.a || {}).length) TS.dirty = true; }
    memRoute = '#/test/run'; if (!DEMO && location.hash !== '#/test/run') { suppressHash = true; location.hash = '#/test/run'; }
    renderRun(); startTimer(); flush(); pStart();
  }
  function testFrame() {
    $app.innerHTML = '<div class="app test running' + (calcOpen ? ' calc-open' : '') + '"><header class="testbar"><button class="qpick" data-act="nav" aria-haspopup="dialog">' +
      '<span class="tb-mod">' + esc(TS.module === 'M1' ? t('r.module1') : t('r.module2')) + '</span><b>' + esc(t('test.qOf', { i: TS.cur, n: TS.items.length })) + '</b>' + icon('caret') + '</button>' +
      '<div class="tb-r"><button class="tbtn" data-act="calc" aria-label="Desmos">' + icon('calc') + '<span class="wide-only">Desmos</span></button><div class="timer" role="timer" aria-live="off">' + icon('clock') + '<span id="tleft">--:--</span></div></div></header>' +
      '<div class="tprog"><div style="width:' + Math.round(100 * Object.keys(TS.ans).length / TS.items.length) + '%"></div></div>' +
      '<main id="main" class="qmain"></main>' +
      '<footer class="qfoot"><span class="save" id="saveSt" aria-live="polite"></span><button class="btn" data-act="prev">' + esc(t('test.prev')) + '</button><button class="btn primary" data-act="next">' + esc(t(TS.cur === TS.items.length ? 'test.check' : 'test.next')) + '</button></footer>' +
      '<div class="sheet' + (calcOpen ? ' on' : '') + '" id="dsheet" role="dialog" aria-label="Desmos"><div class="sheet-h"><b>Desmos</b><button class="btn small" data-act="calc-x">' + esc(t('c.close')) + '</button></div><div id="calc"></div></div></div>';
    $app.querySelector('[data-act=nav]').onclick = navSheet;
    $app.querySelector('[data-act=calc]').onclick = toggleCalc;
    $app.querySelector('[data-act=calc-x]').onclick = toggleCalc;
    $app.querySelector('[data-act=prev]').onclick = function () { goQ(TS.cur - 1); };
    $app.querySelector('[data-act=next]').onclick = function () { if (TS.cur < TS.items.length) goQ(TS.cur + 1); else reviewSheet(); };
    if (CALC_EL) document.getElementById('calc').replaceWith(CALC_EL);
  }
  function renderRun() {
    testFrame();
    var it = TS.items[TS.cur - 1], main = document.getElementById('main');
    var body = '<div class="qhead"><span class="qn">' + TS.cur + '</span><button class="btn small flagbtn' + (TS.flag[TS.cur] ? ' on' : '') + '" data-act="flag" aria-pressed="' + !!TS.flag[TS.cur] + '">' + icon('flag') + esc(t(TS.flag[TS.cur] ? 'test.flagged' : 'test.flag')) + '</button></div>' +
      '<div class="qbody">' + it.html + '</div>';
    if (it.kind === 'MC') {
      body += '<div class="opts-run" role="radiogroup" aria-label="' + esc(t('test.choose')) + '">' + (it.opts || []).map(function (o, i) {
        var L = 'ABCD'[i], on = TS.ans[TS.cur] === L;
        return '<button class="opt' + (on ? ' sel' : '') + '" role="radio" aria-checked="' + on + '" data-l="' + L + '"><span class="L">' + L + '</span><span class="ot">' + o + '</span></button>';
      }).join('') + '</div>';
    } else {
      body += '<label class="spr">' + esc(t('test.yourAnswer')) + '<input id="spr" inputmode="decimal" autocomplete="off" maxlength="6" value="' + esc(TS.ans[TS.cur] || '') + '"><span class="hint">' + esc(t('test.sprHint')) + '</span></label>';
    }
    main.innerHTML = body;
    main.querySelector('[data-act=flag]').onclick = function () { if (TS.flag[TS.cur]) delete TS.flag[TS.cur]; else TS.flag[TS.cur] = 1; tsPersist(); renderRun(); };
    main.querySelectorAll('.opt').forEach(function (b) {
      b.onclick = function () { var L = b.getAttribute('data-l'); if (TS.ans[TS.cur] === L) delete TS.ans[TS.cur]; else TS.ans[TS.cur] = L; changed(); renderRun(); var f = document.querySelector('.opt[data-l="' + L + '"]'); if (f) f.focus(); };
    });
    var inp = main.querySelector('#spr');
    if (inp) inp.oninput = function () { var v = inp.value.replace(/[^0-9.\/\-,]/g, '').replace(',', '.'); if (v !== inp.value) inp.value = v; if (v) TS.ans[TS.cur] = v; else delete TS.ans[TS.cur]; changed(); };
    $app.querySelector('[data-act=prev]').disabled = TS.cur === 1;
    updTimer(); window.scrollTo(0, 0);
  }
  function goQ(p) { if (p < 1 || p > TS.items.length) return; TS.cur = p; tsPersist(); renderRun(); }
  function gridButtons() {
    return '<div class="qgrid">' + TS.items.map(function (x, i) {
      var p = i + 1, cls = (TS.ans[p] ? 'ans' : '') + (TS.flag[p] ? ' flag' : '') + (p === TS.cur ? ' cur' : '');
      return '<button class="' + cls + '" data-p="' + p + '" aria-label="' + esc(t('test.qOf', { i: p, n: TS.items.length }) + (TS.ans[p] ? ', ' + t('test.answered') : '') + (TS.flag[p] ? ', ' + t('test.flagged') : '')) + '">' + p + '</button>';
    }).join('') + '</div><p class="hint">' + '<span class="lg-ans"></span>' + esc(t('test.answered')) + ' · <span class="lg-flag"></span>' + esc(t('test.flagged')) + '</p>';
  }
  function navSheet() {
    var m = openDialog('<h2>' + esc(TS.module === 'M1' ? t('r.module1') : t('r.module2')) + '</h2>' + gridButtons(), '<button class="btn" data-n>' + esc(t('c.close')) + '</button><button class="btn primary" data-r>' + esc(t('test.check')) + '</button>');
    m.querySelector('[data-n]').onclick = m._close;
    m.querySelector('[data-r]').onclick = function () { m.remove(); reviewSheet(); };
    m.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { m.remove(); goQ(Number(b.getAttribute('data-p'))); }; });
    (m.querySelector('.qgrid .cur') || m.querySelector('[data-p]')).focus();
  }
  function reviewSheet() {
    var un = [], fl = Object.keys(TS.flag).map(Number);
    for (var i = 1; i <= TS.items.length; i++) if (!TS.ans[i]) un.push(i);
    var m = openDialog('<h2>' + esc(t('test.checkTitle')) + '</h2><p>' + esc(un.length ? t('test.unanswered', { list: un.join(', ') }) : t('test.allAnswered')) + (fl.length ? ' ' + esc(t('test.flaggedList', { list: fl.join(', ') })) : '') + ' ' + esc(t('test.noPenalty')) + '</p>' + gridButtons(),
      '<button class="btn" data-n>' + esc(t('test.backToQ')) + '</button><button class="btn primary" data-y>' + esc(t('test.submit')) + '</button>');
    m.querySelector('[data-n]').onclick = m._close;
    m.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { m.remove(); goQ(Number(b.getAttribute('data-p'))); }; });
    m.querySelector('[data-y]').onclick = function () {
      m.remove();
      confirmBox(t('test.submitConfirm', { n: un.length }), function () { submitModule(false); }, t('test.submit'));
    };
    m.querySelector('[data-n]').focus();
  }
  // autosave
  var saveT = null;
  function setSave(txt) { var s = document.getElementById('saveSt'); if (s) s.textContent = txt; }
  function changed() { TS.dirty = true; tsPersist(); setSave(t('test.saving')); clearTimeout(saveT); saveT = setTimeout(flush, 1200); var pb = document.querySelector('.tprog > div'); if (pb) pb.style.width = Math.round(100 * Object.keys(TS.ans).length / TS.items.length) + '%'; }
  function flush() {
    if (!TS || !TS.dirty || TS.saving || TS.submitting) return;
    TS.saving = true; TS.dirty = false; var snap = JSON.parse(JSON.stringify(TS.ans)), ts = TS;
    api('testSave', { roundId: ts.roundId, which: ts.module === 'M1' ? 'M1' : 'M2', answers: snap, leaves: ts.leaves, attempt: ts.attempt }).then(function (r) {
      ts.saving = false;
      if (r.reset || r.error === 'not_started') { if (TS === ts) pReset(); return; }
      if (!r.ok) { ts.dirty = true; setSave(t('test.offline')); setTimeout(flush, 5000); return; }
      if (r.submitted) { setSave(''); return; }
      if (r.late) { setSave(t('test.timeUp')); return; }
      if (r.locked) { ts.dirty = true; setSave(t('pr.pauseLabel')); if (TS === ts) pLock('left'); return; }
      setSave(t('test.saved')); if (ts.dirty) flush();
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (!TS || TS.submitting) return;
    if (TS.proctor) { if (document.hidden) pLeave(); else { pPing(); if (TS && !TS.locked) flush(); } return; }
    if (document.hidden) { TS.leaves++; tsPersist(); TS.dirty = true; } else flush();
  });
  // ---- proctored module: any leave pauses the test until the teacher continues it from the monitor ----
  var pingT = null, blurT = null, wakeL = null;
  window.addEventListener('blur', function () {
    if (!TS || !TS.proctor || TS.submitting) return;
    clearTimeout(blurT); blurT = setTimeout(function () { if (TS && !document.hasFocus()) pLeave(); }, 3000);
  });
  window.addEventListener('focus', function () { clearTimeout(blurT); });
  function pStart() {
    pStop(); if (!TS || !TS.proctor) return;
    pingT = setInterval(pPing, 10000); pPing();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wakeL = w; }).catch(function () {}); } catch (e) {}
  }
  function pStop() {
    if (pingT) clearInterval(pingT); pingT = null; clearTimeout(blurT);
    if (wakeL) { try { wakeL.release(); } catch (e) {} wakeL = null; }
    var o = document.getElementById('plock'); if (o) o.remove();
  }
  function pPing() {
    if (!TS || !TS.proctor || TS.submitting) return;
    var ts = TS;
    api('proctorPing', { roundId: ts.roundId, leaves: ts.leaves, attempt: ts.attempt }).then(function (r) {
      if (!r.ok || TS !== ts || ts.submitting) return;
      if (r.reset) return pReset();
      if (r.locked && !ts.locked) pLock(r.reason);
      else if (!r.locked && ts.locked) pUnlock();
    });
  }
  function pLeave() {
    if (!TS || TS.submitting || !TS.proctor) return;
    if (!TS.locked) { TS.leaves++; tsPersist(); }
    pLock('left');
    try {     // the page may be frozen right after it is hidden: send now
      var body = JSON.stringify({ action: 'proctorPing', token: session.token, roundId: TS.roundId, leaves: TS.leaves, attempt: TS.attempt });
      if (!DEMO && navigator.sendBeacon && navigator.sendBeacon(CFG.apiUrl, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return;
    } catch (e) {}
    pPing();
  }
  function pLock(reason) {
    if (!TS) return;
    TS.locked = true;
    document.querySelectorAll('.modal').forEach(function (m) { m.remove(); });
    if (pingT) clearInterval(pingT); pingT = setInterval(pPing, 3000);
    if (document.getElementById('plock')) return;
    var o = h('<div class="plock" id="plock" role="alertdialog" aria-modal="true" aria-labelledby="plock-t" aria-describedby="plock-d"><div class="plock-c card">' +
      '<span class="plock-i">' + icon('lock') + '</span><h2 id="plock-t" tabindex="-1">' + esc(t('pr.lockTitle')) + '</h2>' +
      '<p id="plock-d">' + esc(t(reason === 'finished' ? 'pr.finishedNote' : 'pr.lockText')) + '</p>' +
      '<p class="muted">' + icon('clock') + ' ' + esc(t('pr.lockTimer')) + ' <b id="plockT"></b></p>' +
      '<p class="plock-w" role="status" aria-live="polite">' + esc(t('pr.lockWait')) + '</p></div></div>');
    document.body.appendChild(o); o.querySelector('h2').focus(); updTimer();
  }
  function pReset() {          // the teacher erased this attempt while the page was open: drop it and go back to the start
    if (!TS) return;
    store(tsKey(), null); pStop(); stopTimer(); clearTimeout(saveT); TS = null; closeCalc();
    toast(t('pr.resetDone')); go('#/test');
  }
  function pUnlock() {
    if (!TS) return;
    TS.locked = false;
    var o = document.getElementById('plock'); if (o) o.remove();
    if (pingT) clearInterval(pingT); pingT = setInterval(pPing, 10000);
    toast(t('pr.unlocked')); TS.dirty = true; flush();
  }
  // timer
  var tick = null;
  function startTimer() { stopTimer(); tick = setInterval(updTimer, 500); updTimer(); }
  function stopTimer() { if (tick) clearInterval(tick); tick = null; }
  function updTimer() {
    if (!TS) return;
    var left = Math.max(0, Math.round((TS.deadline - (Date.now() + TS.offset)) / 1000)), el = document.getElementById('tleft');
    if (el) { el.textContent = Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2); el.parentNode.classList.toggle('low', left <= 300); }
    var pl = document.getElementById('plockT'); if (pl) pl.textContent = Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2);
    if (left === 0 && !TS.submitting) submitModule(true);
  }
  function submitModule(auto) {
    if (!TS || TS.submitting) return;
    TS.submitting = true; stopTimer(); clearTimeout(saveT);
    var ts = TS, snap = JSON.parse(JSON.stringify(ts.ans));
    var attempt = function (n) {
      setSave(t('test.submitting'));
      api('testSubmit', { roundId: ts.roundId, which: ts.module === 'M1' ? 'M1' : 'M2', answers: snap, leaves: ts.leaves }).then(function (r) {
        if (!r.ok) {
          if (r.error === 'auth_expired') return guard(r);
          if (n < 20) { setTimeout(function () { attempt(n + 1); }, 4000); return; }
          ts.submitting = false; modal('<h2>' + esc(t('test.submitFail')) + '</h2><p>' + esc(t('test.submitFailHint')) + '</p>'); return;
        }
        store(tsKey(), null); pStop(); TS = null; closeCalc();
        if (auto) toast(t('test.autoSubmitted'));
        go('#/test');
      });
    };
    attempt(0);
  }
  // Desmos
  var CALC = null, CALC_EL = null, calcOpen = false;
  function toggleCalc() {
    var s = document.getElementById('dsheet'); if (!s) return;
    var on = !s.classList.contains('on'); s.classList.toggle('on', on); calcOpen = on;
    var app = document.querySelector('.app.running'); if (app) app.classList.toggle('calc-open', on);
    s._close = toggleCalc;
    if (on && !CALC) {
      var sc = document.createElement('script'); sc.src = 'https://www.desmos.com/api/v1.10/calculator.js?apiKey=' + DESMOS_KEY;
      sc.onload = function () { CALC_EL = document.getElementById('calc'); CALC = window.Desmos.GraphingCalculator(CALC_EL, { keypad: true, expressions: true, settingsMenu: false }); };
      sc.onerror = function () { document.getElementById('calc').innerHTML = '<p class="pad">' + esc(t(DEMO ? 'test.desmosDemo' : 'test.desmosFail')) + '</p>'; };
      document.body.appendChild(sc);
    }
  }
  function closeCalc() { calcOpen = false; var s = document.getElementById('dsheet'); if (s) s.classList.remove('on'); var app = document.querySelector('.app.running'); if (app) app.classList.remove('calc-open'); }

  // ---------- staff: live test monitor (roll call, start code, pauses, reset) ----------
  function prClock(ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function prStatus(s) {
    if (s.locked) return '<span class="pill bad">' + esc(t('pr.pauseLabel')) + ' · ' + esc(t('pr.reason.' + (s.reason || 'left'))) + '</span>';
    if (s.status === 'live') return '<span class="pill blue">' + (s.live.module === 'M1' ? 'M1' : 'M2') + ' · ' + esc(t('test.qOf', { i: s.live.answered, n: 22 })) + '</span>';
    if (s.status === 'done') return '<span class="pill ok">' + esc(t('pr.st.done')) + (s.sat !== null ? ' · ' + s.sat : '') + '</span>';
    if (s.status === 'between') return '<span class="pill warn">' + esc(t('pr.st.between')) + '</span>';
    return '<span class="pill">' + esc(t('pr.st.none')) + '</span>';
  }
  function prLink(s) {
    if (s.seenAgo === null) return '<span class="muted">—</span>';
    if (s.seenAgo < 25) return '<span class="pr-on">' + esc(t('pr.online')) + '</span>';
    return '<span class="muted">' + esc(s.seenAgo < 120 ? t('pr.agoS', { n: s.seenAgo }) : t('pr.ago', { n: Math.round(s.seenAgo / 60) })) + '</span>';
  }
  function prActs(s) {
    var b = '';
    if (s.locked) b += '<button class="btn small primary" data-u="' + esc(s.login) + '">' + icon('play') + esc(t('pr.continue')) + '</button>';
    if (s.status === 'live') b += '<button class="btn small" data-f="' + esc(s.login) + '">' + esc(t('pr.finish')) + '</button>';
    if (s.locked || s.status !== 'none') b += '<button class="btn small danger" data-r="' + esc(s.login) + '">' + esc(t('pr.reset')) + '</button>';
    return b || '<span class="muted">—</span>';
  }
  var PR = null;
  function viewProctor() {
    var main = staffShell('group'); loading(main); PR = { main: main, busy: false };
    var load = function () {
      if (PR.busy || document.querySelector('.modal') || curRoute() !== '#/proctor') return;
      PR.busy = true;
      teacherGroups().then(function (groups) {
        if (!curGroup || groups.indexOf(curGroup) < 0) curGroup = groups[0];
        return api('proctorBoard', { group: curGroup }).then(function (d) { return { d: d, groups: groups }; });
      }).then(function (x) { PR.busy = false; drawProctor(main, x.d, x.groups); }).catch(function (e) { PR.busy = false; fail(main, viewProctor)(e); });
    };
    PR.load = load; load(); later(load, 4000);
  }
  function drawProctor(main, d, groups) {
    var chips = '<div class="chips">' + groups.map(function (g) { return '<button data-g="' + esc(g) + '" aria-pressed="' + (g === curGroup) + '" class="' + (g === curGroup ? 'on ' : '') + groupClass(g) + '">' + esc(groupLabel(g)) + '</button>'; }).join('') + '</div>';
    var head = '<div class="page-h"><h1>' + esc(t('pr.title')) + '</h1>' + chips + '</div>';
    if (!d.ok) {
      main.innerHTML = head + '<section class="card"><p class="muted">' + esc(d.error === 'not_found' ? t('pr.noRound') : errText(d.error)) + '</p><a class="btn" href="#/group">' + icon('back') + esc(t('grp.title')) + '</a></section>';
      bindChips(); return;
    }
    var r = d.round, c = d.counts, focusKey = document.activeElement && document.activeElement.getAttribute('data-k');
    var codeBox = d.on ? (d.code ? '<div class="pr-code"><span class="tile-l">' + esc(t('pr.code')) + '</span><b class="pr-digits">' + esc(d.code.code) + '</b><small class="muted">' + esc(t('pr.codeUntil', { t: prClock(d.code.until) })) + '</small>' +
        '<div class="row-gap"><button class="btn small" data-k="full" data-act="full">' + esc(t('pr.codeFull')) + '</button><button class="btn small" data-k="code" data-act="code">' + icon('refresh') + esc(t('pr.codeNew')) + '</button></div></div>'
      : '<div class="pr-code"><span class="tile-l">' + esc(t('pr.code')) + '</span><span class="muted">' + esc(t('pr.codeNone')) + '</span><button class="btn primary" data-k="code" data-act="code">' + icon('key') + esc(t('pr.codeMake')) + '</button></div>') : '';
    var html = head +
      '<section class="card pr-bar"><div class="pr-bar-l"><div class="tc-k">' + esc(t('r.round')) + ' ' + r.roundNo + ' · ' + esc(groupLabel(r.group)) + ' · ' + esc(r.date) + '</div>' +
      '<div class="row-gap"><button class="btn ' + (d.on ? 'ok-on' : 'primary') + '" data-k="on" data-act="on" aria-pressed="' + d.on + '">' + icon(d.on ? 'check' : 'lock') + esc(t(d.on ? 'pr.on' : 'pr.turnOn')) + '</button>' +
      (r.online ? '<button class="btn" data-k="open" data-act="open">' + icon(r.open ? 'lock' : 'play') + esc(t(r.open ? 'grp.closeTest' : 'grp.openTest')) + '</button>' : '') +
      (d.on ? '<button class="btn small ghost" data-k="off" data-act="off">' + esc(t('pr.turnOff')) + '</button>' : '') + '</div>' +
      '<p class="hint">' + esc(t(d.on ? 'pr.onNote' : 'pr.offNote')) + ' ' + esc(t(r.open ? 'pr.testOpen' : 'pr.testClosed')) + '.</p></div>' + codeBox + '</section>' +
      '<section class="kpis four">' + [['pr.present', c.present + '<span class="of"> / ' + d.size + '</span>'], ['pr.writing', c.live], ['pr.paused', c.paused], ['pr.done', c.done]].map(function (k, i) {
        return '<div class="card kpi' + (i === 2 && c.paused ? ' bad' : '') + '"><div class="tile-l">' + esc(t(k[0])) + '</div><div class="tile-v">' + k[1] + '</div></div>'; }).join('') + '</section>';
    var paused = d.students.filter(function (s) { return s.locked; });
    if (paused.length) html += '<section class="card pr-alert" role="region" aria-label="' + esc(t('pr.alerts')) + '"><h2>' + icon('lock') + esc(t('pr.alerts')) + '</h2>' + paused.map(function (s) {
      return '<div class="pr-arow"><div><b>' + esc(s.name) + '</b><small class="lg">' + esc(t('pr.reason.' + (s.reason || 'left'))) + (s.lockedAt ? ' · ' + prClock(s.lockedAt) : '') + ' · ' + esc(t('pr.leaves')) + ': ' + s.leaves + '</small></div><div class="row-gap">' + prActs(s) + '</div></div>'; }).join('') + '</section>';
    html += '<section class="card"><div class="row-between"><h2>' + esc(t('nav.students')) + '</h2><div class="row-gap"><span class="hint">' + esc(t('pr.auto')) + '</span><button class="btn small" data-k="all" data-act="all">' + icon('check') + esc(t('pr.allHere')) + '</button></div></div>' +
      '<div class="tbl-wrap"><table class="tbl pr-tbl"><thead><tr><th scope="col">' + esc(t('lg.student')) + '</th><th scope="col">' + esc(t('pr.rollcall')) + '</th><th scope="col">' + esc(t('pr.status')) + '</th><th scope="col" class="num">' + esc(t('pr.left')) + '</th><th scope="col" class="num">' + esc(t('pr.leaves')) + '</th><th scope="col">' + esc(t('pr.link')) + '</th><th scope="col">' + esc(t('pr.actions')) + '</th></tr></thead><tbody>' +
      d.students.map(function (s) {
        return '<tr class="' + (s.locked ? 'pr-bad' : '') + '"><td><b>' + esc(s.name) + '</b><small class="lg">' + esc(s.cls) + (s.attempt ? ' · ' + esc(t('pr.attempt', { n: s.attempt + 1 })) : '') + '</small></td>' +
          '<td><div class="seg" role="group" aria-label="' + esc(t('pr.rollcall') + ': ' + s.name) + '"><button class="' + (s.present ? 'on' : '') + '" aria-pressed="' + s.present + '" data-k="p' + esc(s.login) + '" data-p="' + esc(s.login) + '">' + esc(t('pr.here')) + '</button><button class="' + (!s.present ? 'on off' : '') + '" aria-pressed="' + !s.present + '" data-k="a' + esc(s.login) + '" data-a="' + esc(s.login) + '">' + esc(t('pr.absent')) + '</button></div></td>' +
          '<td>' + prStatus(s) + '</td><td class="num">' + (s.live ? Math.floor(s.live.left / 60) + ':' + ('0' + s.live.left % 60).slice(-2) : '—') + '</td>' +
          '<td class="num' + (s.leaves ? ' bad' : '') + '">' + s.leaves + '</td><td>' + prLink(s) + '</td><td><div class="row-gap">' + prActs(s) + '</div></td></tr>';
      }).join('') + '</tbody></table></div></section>';
    var names = {}; d.students.forEach(function (s) { names[s.login] = s.name; });
    html += '<section class="card"><h2>' + esc(t('pr.log')) + '</h2>' + (d.log.length ? '<ul class="pr-log">' + d.log.slice(0, 25).map(function (x) {
      return '<li><span class="muted">' + prClock(x.at) + '</span> ' + (x.login ? '<b>' + esc(names[x.login] || x.login) + '</b> — ' : '') + esc(t('pr.k.' + x.kind)) + (x.kind === 'reset' && x.note ? ': «' + esc(x.note) + '»' : '') + (x.by && x.by !== x.login ? ' <span class="muted">(' + esc(x.by) + ')</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="muted">' + esc(t('pr.logEmpty')) + '</p>') + '</section>';
    main.innerHTML = html;
    if (focusKey) { var f = main.querySelector('[data-k="' + focusKey + '"]'); if (f) f.focus(); }
    var run = function (action, payload, msg) {
      return api(action, Object.assign({ roundId: r.roundId }, payload)).then(guard).then(function (res) { if (msg) toast(msg); PR.load(); return res; }).catch(function (e) { toast(errText(e && e.error)); });
    };
    var on = function (sel, fn) { main.querySelectorAll(sel).forEach(function (b) { b.onclick = function () { fn(b); }; }); };
    on('[data-act=on]', function () { if (!d.on) run('proctorSet', { on: true }); });
    on('[data-act=off]', function () { confirmBox(t('pr.offConfirm'), function () { run('proctorSet', { on: false }); }, t('pr.turnOff')); });
    on('[data-act=open]', function () { api('setRound', { roundId: r.roundId, open: !r.open }).then(guard).then(function () { toast(t(r.open ? 'grp.testClosed' : 'grp.testOpened')); PR.load(); }).catch(function (e) { toast(errText(e && e.error)); }); });
    on('[data-act=code]', function () { run('proctorCode', {}).then(function (x) { if (x && x.code) prCodeFull(x.code, x.until); }); });
    on('[data-act=full]', function () { prCodeFull(d.code.code, d.code.until); });
    on('[data-act=all]', function () { run('proctorMark', { logins: d.students.map(function (s) { return s.login; }), present: true }); });
    on('[data-p]', function (b) { run('proctorMark', { logins: [b.getAttribute('data-p')], present: true }); });
    on('[data-a]', function (b) { run('proctorMark', { logins: [b.getAttribute('data-a')], present: false }); });
    on('[data-u]', function (b) { run('proctorUnlock', { login: b.getAttribute('data-u') }, t('pr.unlocked')); });
    on('[data-f]', function (b) { var l = b.getAttribute('data-f'); confirmBox(t('pr.finishConfirm', { x: names[l] }), function () { run('proctorFinish', { login: l }, t('pr.finished')); }, t('pr.finish')); });
    on('[data-r]', function (b) { prResetDialog(r.roundId, b.getAttribute('data-r'), names[b.getAttribute('data-r')]); });
    bindChips();
    function bindChips() { main.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { curGroup = b.getAttribute('data-g'); loading(main); PR.load(); }; }); }
  }
  function prCodeFull(code, until) {
    var m = openDialog('<p class="tc-k">' + esc(t('pr.code')) + '</p><div class="pr-big" aria-label="' + esc(String(code).split('').join(' ')) + '">' + esc(code) + '</div><p>' + esc(t('pr.codeHint')) + ' ' + esc(t('pr.codeUntil', { t: prClock(until) })) + '</p>',
      '<button class="btn primary" data-c>' + esc(t('c.close')) + '</button>');
    m.classList.add('pr-full'); m.querySelector('[data-c]').onclick = function () { m._close(); if (PR) PR.load(); }; m.querySelector('[data-c]').focus();
  }
  function prResetDialog(rid, login, name) {
    var m = openDialog('<h2>' + esc(t('pr.resetTitle', { x: name })) + '</h2><p>' + esc(t('pr.resetText')) + '</p><label class="field">' + esc(t('pr.resetReason')) + '<textarea maxlength="300" rows="2"></textarea></label><p class="msg" role="alert"></p>',
      '<button class="btn" data-n>' + esc(t('c.cancel')) + '</button><button class="btn danger" data-y disabled>' + esc(t('pr.resetGo')) + '</button>');
    var ta = m.querySelector('textarea'), y = m.querySelector('[data-y]');
    ta.oninput = function () { y.disabled = !ta.value.trim(); };
    m.querySelector('[data-n]').onclick = function () { m._close(); if (PR) PR.load(); };
    y.onclick = function () {
      y.disabled = true;
      api('proctorReset', { roundId: rid, login: login, note: ta.value.trim() }).then(function (res) {
        if (!res.ok) { y.disabled = false; m.querySelector('.msg').textContent = errText(res.error); return; }
        m._close(); toast(t('pr.resetDone')); if (PR) PR.load();
      });
    };
    ta.focus();
  }

  // ---------- staff: group overview ----------
  var curGroup = null, GROUPS = null;
  function teacherGroups() {
    var g = session.user.groups || [];
    if (g.length) return Promise.resolve(g);
    if (GROUPS) return Promise.resolve(GROUPS);
    return apiC('students').then(guard).then(function (d) { GROUPS = Array.from(new Set(d.students.map(function (s) { return s.group; }))).sort(); return GROUPS; });
  }
  function statusChip(s) {
    var map = { done: ['ok', 'grp.done'], live: ['blue', 'grp.live'], partial: ['warn', 'grp.partial'], none: ['', 'grp.none'] };
    var x = map[s.status];
    var extra = s.status === 'live' && s.live ? ' · ' + (s.live.module === 'M1' ? 'M1' : 'M2') + ' · ' + Math.ceil(s.live.left / 60) + ' ' + t('grp.min') : '';
    return '<span class="pill ' + x[0] + '">' + esc(t(x[1])) + esc(extra) + '</span>';
  }
  function exportCsv(d) {
    var rows = [['Name', 'Class', 'Group', 'Round', 'M1 /22', 'Route', 'M2 /22', 'Total /44', '% correct', 'SAT', '5-point (by %)']];
    d.students.forEach(function (s) {
      var tot = s.m1 !== null && s.m2 !== null ? s.m1 + s.m2 : null, pct = tot !== null ? Math.round(100 * tot / 44) : null;
      var g5 = pct === null ? '' : pct >= 86 ? 5 : pct >= 71 ? 4 : pct >= 55 ? 3 : 2;
      rows.push([s.name, s.cls, d.group, d.current.roundNo, s.m1, s.route, s.m2, tot, pct, s.sat, g5]);
    });
    var csv = '﻿' + rows.map(function (r) { return r.map(function (v) { v = v === null || v === undefined ? '' : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'RML_' + d.group + '_R' + d.current.roundNo + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  var pvModule = 'M1';
  function viewGroup() {
    var main = staffShell('group'); loading(main);
    teacherGroups().then(function (groups) {
      if (!curGroup || groups.indexOf(curGroup) < 0) curGroup = groups[0];
      return apiC('groupOverview', { group: curGroup }).then(guard).then(function (d) { return { d: d, groups: groups }; });
    }).then(function (x) {
      var d = x.d, c = d.current;
      var html = '<div class="page-h"><h1>' + esc(t('grp.title')) + '</h1><div class="chips">' + x.groups.map(function (g) { return '<button data-g="' + esc(g) + '" aria-pressed="' + (g === curGroup) + '" class="' + (g === curGroup ? 'on ' : '') + groupClass(g) + '">' + esc(groupLabel(g)) + '</button>'; }).join('') + '</div></div>';
      if (!c) { main.innerHTML = html + '<section class="card"><p class="muted">' + esc(t('grp.noRounds')) + '</p></section>'; bindGroupChips(main); return; }
      var delta = c.avg !== null && c.prevAvg !== null ? c.avg - c.prevAvg : null;
      html += '<section class="kpis">' +
        '<div class="card kpi"><div class="tile-l">' + esc(t('r.round')) + ' ' + c.roundNo + ' · ' + esc(c.online ? (c.open ? t('grp.openNow') : t('grp.closedNow')) : t('grp.paper')) + '</div><div class="tile-v">' + c.counts.done + '<span class="of"> / ' + c.size + ' ' + esc(t('grp.finished')) + '</span></div><div class="tile-s">' + esc(t('grp.counts', { live: c.counts.live, partial: c.counts.partial, none: c.counts.none })) + '</div></div>' +
        '<div class="card kpi"><div class="tile-l">' + esc(t('ov.avg')) + '</div><div class="tile-v">' + (c.avg === null ? '—' : c.avg) + '</div><div class="tile-s">' + (delta !== null ? '<span class="delta ' + (delta >= 0 ? 'up' : 'down') + '">' + (delta >= 0 ? '▲ +' : '▼ ') + delta + '</span> ' + esc(t('grp.vsRound', { n: c.prevNo })) : '&nbsp;') + '</div></div>' +
        '<div class="card kpi"><div class="tile-l">' + esc(t('grp.hardest')) + '</div><div class="tile-v sm">' + (d.hardest ? esc(d.hardest.skill) : '—') + '</div><div class="tile-s">' + (d.hardest ? esc(t('mis.acc', { p: d.hardest.pct })) : '') + '</div></div>' +
        '<div class="card kpi actions">' +
        (c.online ? '<button class="btn ' + (c.open ? '' : 'primary') + '" data-act="open">' + icon(c.open ? 'lock' : 'play') + esc(t(c.open ? 'grp.closeTest' : 'grp.openTest')) + '</button>' : '') +
        '<button class="btn ' + (c.closed ? '' : 'primary') + '" data-act="review">' + icon(c.closed ? 'lock' : 'check') + esc(t(c.closed ? 'st.reopen' : 'grp.closeRound')) + '</button>' +
        '<button class="btn" data-act="csv">' + icon('download') + esc(t('grp.export')) + '</button>' +
        (c.online ? '<a class="btn" href="#/proctor">' + icon('eye') + esc(t('pr.title')) + '</a>' : '') + '</div></section>';
      html += '<section class="split"><div class="card grow"><div class="row-between"><h2>' + esc(t('nav.students')) + ' · ' + esc(t('r.round')) + ' ' + c.roundNo + '</h2>' + (c.online && c.open ? '<span class="hint">' + esc(t('grp.auto')) + '</span>' : '') + '</div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">' + esc(t('lg.student')) + '</th><th scope="col">' + esc(t('grp.status')) + '</th><th scope="col" class="num">M1</th><th scope="col" class="num">M2</th><th scope="col" class="num">SAT</th><th scope="col" class="num">' + esc(t('grp.leaves')) + '</th></tr></thead><tbody>' +
        d.students.map(function (s) { return '<tr><td><a href="#/student/' + encodeURIComponent(s.login) + '">' + esc(s.name) + '</a><small class="lg">' + esc(s.cls) + '</small></td><td>' + statusChip(s) + '</td><td class="num">' + (s.m1 === null ? '—' : s.m1) + '</td><td class="num">' + (s.m2 === null ? '—' : s.m2 + ' ' + routeChip(s.route)) + '</td><td class="num"><b>' + (s.sat === null ? '—' : s.sat) + '</b></td><td class="num' + (s.leaves ? ' bad' : '') + '">' + s.leaves + '</td></tr>'; }).join('') +
        '</tbody></table></div></div><div class="side">';
      var mods = Object.keys(d.pvalues || {}).sort();
      if (mods.length) {
        if (mods.indexOf(pvModule) < 0) pvModule = mods[0];
        var pv = d.pvalues[pvModule];
        html += '<div class="card"><h2>' + esc(t('grp.pv')) + '</h2><div class="chips small">' + mods.map(function (m) { return '<button data-m="' + m + '" aria-pressed="' + (m === pvModule) + '"' + (m === pvModule ? ' class="on"' : '') + '>' + (m === 'M1' ? 'M1' : m === 'M2H' ? 'M2 ' + t('r.Hard') : 'M2 ' + t('r.Easy')) + '</button>'; }).join('') + '</div>' +
          '<p class="hint">' + esc(t('grp.pvHint')) + '</p><ol class="pv">' + pv.map(function (q) { var p = q.n ? Math.round(100 * q.c / q.n) : 0;
            return '<li class="' + (p < 50 ? 'low' : '') + '" title="' + esc(q.pos + '. ' + (q.skill || '') + ' — ' + p + '% (' + q.c + '/' + q.n + ')') + '"><span class="pv-bar" style="height:' + Math.max(4, p) + '%"></span><span class="pv-n">' + q.pos + '</span>' + sr(q.skill + ': ' + p + '%') + '</li>'; }).join('') + '</ol></div>';
      }
      html += '<div class="card"><h2>' + esc(t('grp.announce')) + '</h2><label class="field">' + esc(t('grp.announceLabel')) + '<textarea maxlength="500" rows="3">' + esc(d.announcement ? d.announcement.text : '') + '</textarea></label>' +
        '<div class="row-gap"><button class="btn primary" data-act="announce">' + icon('megaphone') + esc(t('grp.publish')) + '</button>' + (d.announcement ? '<button class="btn" data-act="clear">' + esc(t('grp.clear')) + '</button>' : '') + '</div></div></div></section>';
      main.innerHTML = html;
      bindGroupChips(main);
      main.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { pvModule = b.getAttribute('data-m'); viewGroup(); }; });
      var act = function (sel, fn) { var b = main.querySelector(sel); if (b) b.onclick = function () { b.disabled = true; fn(b); }; };
      act('[data-act=open]', function () { api('setRound', { roundId: c.roundId, open: !c.open }).then(guard).then(function () { toast(t(c.open ? 'grp.testClosed' : 'grp.testOpened')); viewGroup(); }).catch(fail(main, viewGroup)); });
      act('[data-act=review]', function (b) { b.disabled = false; confirmBox(t(c.closed ? 'grp.reopenConfirm' : 'grp.closeConfirm'), function () { api('setRound', { roundId: c.roundId, closed: !c.closed }).then(guard).then(function () { viewGroup(); }).catch(fail(main, viewGroup)); }); });
      act('[data-act=csv]', function (b) { b.disabled = false; exportCsv(d); });
      var ta = main.querySelector('textarea');
      act('[data-act=announce]', function () { api('setAnnouncement', { group: curGroup, text: ta.value }).then(guard).then(function () { toast(t('grp.published')); viewGroup(); }).catch(fail(main, viewGroup)); });
      act('[data-act=clear]', function () { api('setAnnouncement', { group: curGroup, text: '' }).then(guard).then(function () { viewGroup(); }).catch(fail(main, viewGroup)); });
      if (c.online && c.open) later(function () { if (curRoute() === '#/group' && !document.querySelector('.modal') && document.activeElement.tagName !== 'TEXTAREA') viewGroup(); }, 15000);
      focusMain(main);
    }).catch(fail(main, viewGroup));
  }
  function bindGroupChips(main) { main.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { curGroup = b.getAttribute('data-g'); viewGroup(); }; }); }

  // ---------- staff: students, student detail, rounds ----------
  // one compact line: [←] Teacher view / Name · class · group  (back goes to the list, or to the student page from a round)
  function teacherBar(user, backHref, backLabel) {
    return '<div class="teacher-bar"><a href="' + (backHref || '#/students') + '" aria-label="' + esc(backLabel || t('nav.students')) + '">' + icon('back') + '</a>' +
      '<span class="tb-t"><small>' + esc(t('st.viewing')) + '</small><span class="tb-n"><b>' + esc(user.name) + '</b> · ' + esc(user.cls) + ' · ' + esc(groupLabel(user.group)) + '</span></span></div>';
  }
  var stFilter = { q: '', g: '' };
  function viewStudents() {
    var main = staffShell('students'); loading(main);
    apiC('students').then(guard).then(function (d) {
      var groups = Array.from(new Set(d.students.map(function (s) { return s.group; }))).sort();
      main.innerHTML = '<div class="page-h"><h1>' + esc(t('nav.students')) + ' <small>' + d.students.length + '</small></h1>' + '</div><section class="card">' +
        '<div class="st-filters"><label class="sr" for="stq">' + esc(t('st.search')) + '</label><input id="stq" type="search" placeholder="' + esc(t('st.search')) + '" value="' + esc(stFilter.q) + '"><label class="sr" for="stg">' + esc(t('grp.group')) + '</label><select id="stg"><option value="">' + esc(t('st.all')) + '</option>' +
        groups.map(function (g) { return '<option value="' + esc(g) + '"' + (g === stFilter.g ? ' selected' : '') + '>' + esc(groupLabel(g)) + '</option>'; }).join('') + '</select></div>' +
        '<div class="tbl-wrap"><table class="tbl st"><thead><tr><th scope="col">' + esc(t('lg.student')) + '</th><th scope="col">' + esc(t('lg.class')) + '</th><th scope="col" class="num">' + esc(t('st.last')) + '</th><th scope="col" class="num">' + esc(t('st.avg')) + '</th><th scope="col">' + esc(t('st.signedIn')) + '</th><th scope="col"><span class="sr">' + esc(t('st.reset')) + '</span></th></tr></thead><tbody></tbody></table></div></section>';
      var tb = main.querySelector('tbody');
      var draw = function () {
        var q = stFilter.q.toLowerCase();
        tb.innerHTML = d.students.filter(function (s) { return (!stFilter.g || s.group === stFilter.g) && (!q || (s.name + ' ' + s.login).toLowerCase().indexOf(q) >= 0); }).map(function (s) {
          return '<tr><td><a href="#/student/' + encodeURIComponent(s.login) + '">' + esc(s.name) + '</a><small class="lg">' + esc(s.login) + '</small></td><td>' + esc(s.cls) + '<small class="lg">' + esc(groupLabel(s.group)) + '</small></td>' +
            '<td class="num">' + (s.last === null ? '—' : s.last) + '</td><td class="num">' + (s.avg === null ? '—' : s.avg) + '</td>' +
            '<td>' + (s.activated ? '<span class="pill ok">' + esc(t('st.yes')) + '</span>' : '<span class="pill">' + esc(t('st.no')) + '</span>') + '</td>' +
            '<td><button class="btn small icon-btn" aria-label="' + esc(t('st.reset')) + ': ' + esc(s.name) + '" data-reset="' + esc(s.login) + '" data-name="' + esc(s.name) + '">' + icon('key') + '<span class="wide-only" aria-hidden="true">' + esc(t('st.reset')) + '</span></button></td></tr>';
        }).join('');
        tb.querySelectorAll('[data-reset]').forEach(function (b) {
          b.onclick = function () {
            var name = b.getAttribute('data-name');
            confirmBox(t('st.resetConfirm', { name: name }), function () {
              b.disabled = true;
              api('resetPassword', { login: b.getAttribute('data-reset') }).then(guard).then(function (r) {
                modal('<h2>' + esc(t('st.temp', { name: name })) + '</h2><p class="login-card"><span>' + esc(r.login) + '</span><b>' + esc(r.tempPassword) + '</b></p><p class="hint">' + esc(t('st.tempHint')) + '</p>');
                var s = d.students.filter(function (x) { return x.login === r.login; })[0]; if (s) s.activated = false; draw();
              }).catch(function (e) { b.disabled = false; if (e && e.error) toast(errText(e.error)); });
            });
          };
        });
      };
      main.querySelector('#stq').oninput = function (e) { stFilter.q = e.target.value; draw(); };
      main.querySelector('#stg').onchange = function (e) { stFilter.g = e.target.value; draw(); };
      draw(); focusMain(main);
    }).catch(fail(main, viewStudents));
  }
  function viewStudentDetail(login) {
    var main = staffShell('students'); loading(main);
    apiC('dashboard', { login: login }).then(guard).then(function (d) {
      var written = d.rounds.filter(function (r) { return r.result && r.result.sat !== null; }), sats = lastSats(d.rounds);
      var weak = weakSkills(d.skills, 4);
      main.innerHTML = teacherBar(d.user) + '<section class="tiles three">' +
        tile(t('ov.last'), sats.length ? sats[sats.length - 1] : '—', '') + tile(t('ov.avg'), sats.length ? Math.round(sats.reduce(function (a, b) { return a + b; }, 0) / sats.length) : '—', '') +
        tile(t('home.place'), d.league.place ? d.league.place + '<span class="of"> / ' + d.league.size + '</span>' : '—', esc(d.goal ? t('goal.label', { g: d.goal }) : t('goal.notSet'))) + '</section>' +
        (written.length ? '<section class="card"><h2>' + esc(t('ov.trend')) + '</h2>' + satChart(written) + '</section>' : '') +
        '<section class="split"><div class="card grow"><h2>' + esc(t('nav.tests')) + '</h2>' + d.rounds.slice().reverse().map(function (r) { return roundCard(r, '#/student/' + encodeURIComponent(login), null); }).join('') + '</div>' +
        '<div class="side"><div class="card"><h2>' + esc(t('ov.domains')) + '</h2>' + domainBars(d.domains) + '</div><div class="card"><h2>' + esc(t('ov.focus')) + '</h2>' +
        (weak.length ? '<ul class="focus">' + weak.map(function (x) { return '<li><div><b>' + esc(x.k) + '</b><small>' + esc(x.d.domain) + '</small></div><span>' + esc(t('ov.items', { c: x.d.c, n: x.d.n })) + '</span></li>'; }).join('') + '</ul>' : '<p class="muted">' + esc(t('ov.focusNone')) + '</p>') + '</div></div></section>';
      bindChart(main); focusMain(main);
      if (CUBES_ON && d.user.role === 'student') staffCubesCard(login).then(function (html) { if (!html || !main.isConnected) return; main.insertAdjacentHTML('beforeend', html); bindStaffCubes(main, login, function () { viewStudentDetail(login); }); });
    }).catch(fail(main, function () { viewStudentDetail(login); }));
  }
  function viewRounds() {
    var main = staffShell('rounds'); loading(main);
    apiC('students').then(guard).then(function (d) {
      main.innerHTML = '<div class="page-h"><h1>' + esc(t('nav.rounds')) + '</h1></div>' + (session.user.role === 'admin' && !DEMO ? adminTools() : '') + '<section class="card"><div class="rm"></div></section>';
      if (session.user.role === 'admin' && !DEMO) bindAdminTools(main);
      var el = main.querySelector('.rm');
      el.innerHTML = d.rounds.slice().reverse().map(function (r) {
        var local = r.closeAt ? new Date(new Date(r.closeAt).getTime() + 5 * 3600e3).toISOString().slice(0, 16) : '';
        return '<div class="rm-row"><div><b>' + esc(groupLabel(r.group)) + ' · ' + esc(t('r.round')) + ' ' + r.roundNo + '</b><small>' + esc(t('r.season')) + ' ' + seasonNo(r.season) + ' · ' + fmtDate(r.date) + ' · ' + esc(r.online ? t('rd.online') : t('grp.paper')) + '</small>' +
          '<div class="row-gap">' + (r.online ? '<span class="pill ' + (r.open ? 'blue' : '') + '">' + esc(t(r.open ? 'grp.openNow' : 'grp.closedNow')) + '</span>' : '') + '<span class="pill ' + (r.reviewOpen ? 'ok' : '') + '">' + esc(t(r.reviewOpen ? 'st.closed' : 'st.open')) + '</span></div></div>' +
          '<div class="rm-act">' + (r.online ? '<button class="btn small ' + (r.open ? '' : 'primary') + '" data-open="' + esc(r.roundId) + '" data-v="' + (r.open ? 0 : 1) + '">' + esc(t(r.open ? 'grp.closeTest' : 'grp.openTest')) + '</button>' : '') +
          '<button class="btn small ' + (r.closed ? '' : 'primary') + '" data-rid="' + esc(r.roundId) + '" data-closed="' + (r.closed ? 0 : 1) + '">' + esc(t(r.closed ? 'st.reopen' : 'st.close')) + '</button>' +
          '<label class="auto">' + esc(t('st.autoAt')) + '<input type="datetime-local" value="' + local + '" data-at="' + esc(r.roundId) + '"></label></div></div>';
      }).join('');
      el.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { b.disabled = true; api('setRound', { roundId: b.getAttribute('data-open'), open: b.getAttribute('data-v') === '1' }).then(guard).then(viewRounds).catch(fail(main, viewRounds)); }; });
      el.querySelectorAll('[data-rid]').forEach(function (b) { b.onclick = function () { b.disabled = true; api('setRound', { roundId: b.getAttribute('data-rid'), closed: b.getAttribute('data-closed') === '1' }).then(guard).then(viewRounds).catch(fail(main, viewRounds)); }; });
      el.querySelectorAll('[data-at]').forEach(function (inp) {
        inp.onchange = function () {
          var iso = inp.value ? new Date(new Date(inp.value + ':00Z').getTime() - 5 * 3600e3).toISOString() : '';   // input is Tashkent time
          api('setRound', { roundId: inp.getAttribute('data-at'), closeAt: iso }).then(guard).then(viewRounds).catch(fail(main, viewRounds));
        };
      });
      focusMain(main);
    }).catch(fail(main, viewRounds));
  }

  // ---------- admin: load a round's questions/keys from a file, download a backup ----------
  var admNote = '';
  function adminTools() {
    return '<section class="card admin-tools"><h2>' + esc(t('adm.title')) + '</h2><div class="row-gap">' +
      '<label class="btn primary file-btn">' + icon('upload') + esc(t('adm.upload')) + '<input type="file" accept=".json,application/json" data-act="upfile" class="sr"></label>' +
      '<button class="btn" data-act="backup">' + icon('download') + esc(t('adm.backup')) + '</button></div>' +
      '<p class="hint" id="admMsg" role="status" aria-live="polite">' + esc(admNote || t('adm.hint')) + '</p></section>';
  }
  function bindAdminTools(main) {
    var msg = main.querySelector('#admMsg');
    main.querySelector('[data-act=backup]').onclick = function () {
      msg.textContent = t('c.loading');
      api('backup').then(guard).then(function (d) {
        var blob = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'rml-backup-' + d.at.slice(0, 16).replace(/[:T]/g, '-') + '.json';
        document.body.appendChild(a); a.click(); a.remove(); msg.textContent = t('adm.backupDone');
      }).catch(function (e) { msg.textContent = errText(e && e.error); });
    };
    main.querySelector('[data-act=upfile]').onchange = function (ev) {
      var f = ev.target.files && ev.target.files[0]; if (!f) return;
      f.text().then(function (txt) {
        var d; try { d = JSON.parse(txt); } catch (e) { d = null; }
        if (!d || d.format !== 'rml-round-1' || !d.round || !d.round.round_id || !Array.isArray(d.variants)) { msg.textContent = t('adm.badFile'); return; }
        var total = d.variants.length, done = 0;
        msg.textContent = t('adm.uploading', { n: 0, t: total });
        var next = function () {
          if (done >= total) { admNote = t('adm.uploaded', { r: d.round.round_id, n: total }); toast(admNote); viewRounds(); return; }
          var v = d.variants[done];
          return api('adminVariant', { roundId: d.round.round_id, login: v.login, module: v.module, key: v.key, items: v.items }).then(guard).then(function () {
            done++; msg.textContent = t('adm.uploading', { n: done, t: total }); return next();
          });
        };
        api('adminRound', { round: d.round, params: d.params }).then(guard).then(next)
          .catch(function (e) { msg.textContent = t('adm.failedAt', { n: done, t: total }) + ' ' + errText(e && e.error); });
      });
      ev.target.value = '';
    };
  }


  // =====================================================================================
  // v4: cubes, hero (blocky avatar), shop, games over mistakes, 1-v-1 duels
  // =====================================================================================
  var CUBES_ON = CFG.cubes !== false;
  function cubeIco(s) {
    return '<svg class="cube-ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l8.5 4.9L12 12.3 3.5 7.4z" fill="#f4cf5a"/><path d="M3.5 7.4L12 12.3v9.2l-8.5-4.9z" fill="#d4a017"/><path d="M12 12.3l8.5-4.9v9.2L12 21.5z" fill="#9a7310"/></svg>';
  }
  var CUBE = { bal: null };
  function cubeChip() {
    if (!CUBES_ON) return '';
    return '<a class="cube-chip" href="#/cubes" aria-label="' + esc(t('cb.chipLabel', { n: CUBE.bal === null ? '…' : CUBE.bal })) + '">' + cubeIco(20) + '<span class="cc-n">' + (CUBE.bal === null ? '…' : CUBE.bal) + '</span></a>';
  }
  function setBal(n) {
    if (n === undefined || n === null) return;
    CUBE.bal = n; document.querySelectorAll('.cube-chip .cc-n').forEach(function (x) { x.textContent = n; });
    document.querySelectorAll('.cube-chip').forEach(function (x) { x.setAttribute('aria-label', t('cb.chipLabel', { n: n })); });
  }
  function plusCubes(n) { return '<span class="cplus' + (n < 0 ? ' neg' : '') + '">' + (n < 0 ? '−' + Math.abs(n) : '+' + n) + cubeIco(15) + '</span>'; }

  // ---------- hero renderer (original blocky style: cube head, flat block body) ----------
  var HSKIN = { 1: ['#f3cfae', '#e0b08c'], 2: ['#dcab80', '#c38d62'], 3: ['#b9825a', '#9c6943'], 4: ['#8a5a3b', '#71472d'] };
  var HHAIR = { black: '#1f1712', brown: '#5a3a22', chestnut: '#7a4a2a', dark: '#2e211a' };
  var HSCARF = { indigo: ['#3b3f99', '#2a2d75', '#d4a017'], rose: ['#e8899b', '#c76479', '#ffffff'], emerald: ['#0f8a6a', '#0b6a52', '#f4cf5a'],
    sky: ['#6fa8ec', '#4f86c9', '#ffffff'], cream: ['#efe4cf', '#d4c3a3', '#b45309'], grey: ['#8b95a3', '#6b7583', '#ffffff'], mint: ['#7fd1b9', '#5fb39b', '#ffffff'] };
  var HROBE = { chapan: ['#1d3fa8', '#3b82f6', '#d4a017'], 'robe:blue': ['#1d4ed8', '#1d3fa8', '#d4a017'], 'robe:teal': ['#0f766e', '#14b8a6', '#e7f6f3'],
    'robe:amber': ['#a16207', '#ca8a04', '#ffffff'], 'robe:purple': ['#6d28d9', '#8b5cf6', '#d4a017'], 'robe:brown': ['#7c2d12', '#9a3412', '#f4cf5a'],
    'robe:indigo': ['#312e81', '#4338ca', '#d4a017'], 'robe:emerald': ['#065f46', '#059669', '#f4cf5a'] };
  var HFRAME = { gold: '#d4a017', neon: '#2dd4bf' };
  var hid = 0;
  function blk(x, y, w, hh, c, bev, rx) {
    if (rx === undefined) rx = 1.5;
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="' + rx + '" fill="' + c + '"/>';
    if (bev !== false && w > 6 && hh > 6)
      s += '<rect x="' + (x + 1) + '" y="' + y + '" width="' + (w - 2) + '" height="2.2" fill="#fff" fill-opacity=".28"/><rect x="' + x + '" y="' + (y + 1) + '" width="1.8" height="' + (hh - 2) + '" fill="#fff" fill-opacity=".14"/>' +
        '<rect x="' + (x + w - 2.2) + '" y="' + (y + 1) + '" width="2.2" height="' + (hh - 2) + '" fill="#000" fill-opacity=".13"/><rect x="' + (x + 1) + '" y="' + (y + hh - 2.4) + '" width="' + (w - 2) + '" height="2.4" fill="#000" fill-opacity=".2"/>';
    return s;
  }
  function hbg(k) {
    var s = '', x, y;
    if (k === 'registan') {
      s = '<rect width="160" height="200" fill="#bfe0ff"/><rect y="150" width="160" height="50" fill="#e8cf9c"/>' + blk(30, 60, 100, 92, '#d9b77a', false, 0);
      for (x = 40; x < 120; x += 8) s += blk(x, 70, 8, 8, (x / 8) % 2 ? '#1f6fd1' : '#2b8de0', false, 0);
      s += '<path d="M58 152V112a22 22 0 0 1 44 0v40z" fill="#14408f"/><path d="M64 152V114a16 16 0 0 1 32 0v38z" fill="#2563eb" fill-opacity=".55"/>' +
        blk(12, 40, 14, 112, '#d1ad6d', false, 0) + blk(134, 40, 14, 112, '#d1ad6d', false, 0) + blk(10, 34, 18, 8, '#1f6fd1', false, 0) + blk(132, 34, 18, 8, '#1f6fd1', false, 0);
      [60, 84, 108, 132].forEach(function (yy) { s += blk(14, yy, 10, 4, '#2b8de0', false, 0) + blk(136, yy, 10, 4, '#2b8de0', false, 0); });
      return s;
    }
    if (k === 'stars') {
      s = '<rect width="160" height="200" fill="#16224a"/>';
      [[12, 18, 3], [40, 40, 2], [128, 22, 3], [146, 60, 2], [20, 90, 2], [140, 110, 3], [100, 14, 2], [60, 10, 2], [8, 140, 2]].forEach(function (p) { s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="' + p[2] + '" height="' + p[2] + '" fill="#fef3c7"/>'; });
      return s + '<circle cx="128" cy="44" r="12" fill="#f4cf5a"/><circle cx="134" cy="40" r="11" fill="#16224a"/><rect y="164" width="160" height="36" fill="#0e1733"/>';
    }
    if (k === 'sunset') return '<rect width="160" height="200" fill="#ffb26b"/><rect width="160" height="60" fill="#ff8f6b"/><rect x="104" y="96" width="34" height="34" fill="#ffe08a"/>' + blk(0, 140, 70, 60, '#e2a05a', false, 0) + blk(56, 152, 104, 48, '#cf8b45', false, 0);
    if (k === 'fire') {
      s = '<rect width="160" height="200" fill="#3b0d0d"/>';
      [[10, 150, 24, 50, '#dc2626'], [30, 130, 20, 70, '#f97316'], [50, 160, 18, 40, '#facc15'], [96, 140, 22, 60, '#f97316'], [118, 120, 22, 80, '#dc2626'], [138, 150, 22, 50, '#facc15']].forEach(function (f) { s += blk(f[0], f[1], f[2], f[3], f[4], false, 3); });
      return s;
    }
    s = '<rect width="160" height="200" fill="#f4f8ff"/>';
    for (x = 0; x <= 160; x += 10) s += '<path d="M' + x + ' 0V200" stroke="#bcd0f2" stroke-width=".6"/>';
    for (y = 0; y <= 200; y += 10) s += '<path d="M0 ' + y + 'H160" stroke="#bcd0f2" stroke-width=".6"/>';
    return s + '<path d="M14 0V200" stroke="#f3a3a3"/><text x="120" y="40" font-family="Georgia,serif" font-style="italic" font-size="14" fill="#9ab4e4">x²</text><text x="24" y="70" font-family="Georgia,serif" font-size="13" fill="#9ab4e4">π</text>';
  }
  function hairBack(st, c) {
    if (st === 'bob') return blk(53, 28, 54, 44, c, false, 3);
    if (st === 'long') return blk(53, 28, 54, 72, c, false, 3);
    if (st === 'braids') {
      var s = blk(54, 28, 52, 30, c, false, 3);
      [52, 57, 98, 103].forEach(function (x) { for (var y = 46; y < 104; y += 7) s += blk(x, y, 5, 6, c, false, 1.5); s += '<rect x="' + x + '" y="104" width="5" height="3" fill="#d4a017"/>'; });
      return s;
    }
    return '';
  }
  function hairFront(st, c) {
    if (st === 'none') return '';
    if (st === 'short') return blk(56, 26, 48, 12, c) + blk(56, 36, 5, 8, c, false) + blk(99, 36, 5, 8, c, false);
    if (st === 'curly') { var s = blk(56, 28, 48, 10, c, false); for (var x = 55; x < 100; x += 8) s += blk(x, 22, 9, 9, c, true, 4); return s + blk(55, 36, 6, 10, c, false) + blk(99, 36, 6, 10, c, false); }
    if (st === 'bun') return blk(56, 26, 48, 11, c) + blk(70, 12, 20, 16, c, true, 5) + blk(56, 36, 5, 14, c, false) + blk(99, 36, 5, 14, c, false);
    if (st === 'pony') return blk(56, 26, 48, 10, c) + blk(55, 34, 6, 12, c, false) + blk(99, 34, 6, 12, c, false) + blk(100, 28, 10, 8, c, false, 3) + blk(104, 34, 9, 34, c, true, 4) + '<rect x="103" y="31" width="7" height="4" fill="#ec4899"/>';
    return blk(56, 26, 48, 9, c) + blk(56, 34, 22, 6, c, false) + blk(82, 34, 22, 6, c, false) + blk(55, 36, 6, 22, c, false) + blk(99, 36, 6, 22, c, false);
  }
  function hatBack(k) { if (k.indexOf('scarf:') === 0) return blk(51, 22, 58, 58, (HSCARF[k.slice(6)] || HSCARF.rose)[0], false, 6); return ''; }
  function hatFront(k) {
    var s = '';
    if (k === 'none') return '';
    if (k.indexOf('scarf:') === 0) {
      var c = HSCARF[k.slice(6)] || HSCARF.rose;
      return blk(52, 22, 56, 15, c[0]) + '<rect x="54" y="35" width="52" height="2" fill="' + c[2] + '"/>' + blk(52, 34, 7, 40, c[0], false) + blk(101, 34, 7, 40, c[0], false) +
        '<path d="M50 72h60l6 16H44z" fill="' + c[1] + '"/><path d="M58 72h44l-4 8H62z" fill="' + c[0] + '"/>';
    }
    if (k === 'doppi') { s = '<path d="M55 33h50l-4-15H59z" fill="#141414"/><rect x="55" y="30" width="50" height="4" fill="#2a2a2a"/>'; [64, 80, 96].forEach(function (x) { s += '<path d="M' + (x - 4) + ' 27c2-6 6-7 8-4-3 0-5 2-8 4z" fill="#fff"/>'; }); return s; }
    if (k === 'doppi_gul') { s = '<path d="M55 33h50l-4-15H59z" fill="#8f1d3f"/><rect x="55" y="30" width="50" height="4" fill="#d4a017"/>'; [66, 80, 94].forEach(function (x) { s += '<circle cx="' + x + '" cy="24" r="3.2" fill="#f4cf5a"/><circle cx="' + x + '" cy="24" r="1.3" fill="#0f8a6a"/>'; }); return s; }
    if (k === 'beanie') return blk(55, 18, 50, 16, '#e3542f') + blk(53, 30, 54, 7, '#b93d1f') + blk(74, 10, 12, 10, '#f4cf5a', true, 5);
    if (k === 'phones') return '<path d="M54 44V36a26 22 0 0 1 52 0v8" fill="none" stroke="#1d4ed8" stroke-width="4"/>' + blk(48, 42, 9, 16, '#1d4ed8') + blk(103, 42, 9, 16, '#1d4ed8');
    if (k.indexOf('turban') === 0) {
      var tc = { turban: ['#f6f1e4', '#d9cfb6'], 'turban:teal': ['#137a72', '#0b4f4a'], 'turban:crimson': ['#9f1239', '#6f0c27'], 'turban:amber': ['#f8f1e3', '#f59e0b'] }[k] || ['#f6f1e4', '#d9cfb6'];
      s = blk(52, 22, 56, 14, tc[0]) + blk(56, 12, 48, 12, tc[0]) + '<path d="M54 30l52-12" stroke="' + tc[1] + '" stroke-width="3"/><path d="M54 20l48 12" stroke="' + tc[1] + '" stroke-width="2"/>';
      if (k === 'turban') s += '<rect x="76" y="20" width="8" height="8" fill="#d4a017"/><path d="M80 20c-2-8 2-12 6-14-1 6-2 10-6 14z" fill="#fff"/>';
      return s;
    }
    if (k === 'cap_q') { s = '<path d="M55 33h50l-3-13H58z" fill="#141a26"/>'; [62, 72, 82, 92].forEach(function (x) { s += '<rect x="' + x + '" y="24" width="4" height="4" fill="#fff"/>'; }); return s; }
    if (k === 'crown') return '<path d="M56 32V16l9 8 6-12 9 10 9-10 6 12 9-8v16z" fill="#f4cf5a"/><rect x="56" y="28" width="48" height="5" fill="#d4a017"/><rect x="77" y="20" width="6" height="6" fill="#dc2626"/>';
    return '';
  }
  function ikat(x, y, w, hh) {
    var cols = ['#d6246e', '#f4cf5a', '#1d4ed8', '#0f8a6a', '#ffffff', '#7c3aed'], s = '';
    for (var i = 0, xx = x; xx < x + w; xx += 6, i++) {
      var ww = Math.min(6, x + w - xx);
      s += '<rect x="' + xx + '" y="' + y + '" width="' + ww + '" height="' + hh + '" fill="' + cols[i % 6] + '"/>';
      for (var yy = y + 4; yy < y + hh - 2; yy += 10) s += '<path d="M' + xx + ' ' + yy + 'l' + ww / 2 + ' 4 ' + ww / 2 + '-4v3l-' + ww / 2 + ' 4-' + ww / 2 + '-4z" fill="#000" fill-opacity=".14"/>';
    }
    return s;
  }
  function outfit(k, S) {
    var legs = function (c, shoe) { shoe = shoe || '#1f2937'; return blk(57, 122, 22, 48, c) + blk(81, 122, 22, 48, c) + blk(55, 168, 25, 9, shoe) + blk(80, 168, 25, 9, shoe); };
    var arms = function (c, short) {
      return (short ? blk(42, 74, 13, 16, c) + blk(42, 90, 13, 26, S) + blk(105, 74, 13, 16, c) + blk(105, 90, 13, 26, S) : blk(42, 74, 13, 42, c) + blk(105, 74, 13, 42, c)) + blk(42, 115, 13, 11, S) + blk(105, 115, 13, 11, S);
    };
    if (k === 'hoodie') return legs('#1f2937', '#f3f4f6') + blk(56, 70, 48, 10, '#5b21b6', false, 4) + arms('#7c3aed') + blk(55, 74, 50, 50, '#7c3aed') + blk(64, 104, 32, 14, '#6d28d9', false) +
      '<text x="80" y="100" text-anchor="middle" font-family="Georgia,serif" font-size="20" font-weight="700" fill="#fff">π</text><path d="M74 76v12M86 76v12" stroke="#fff" stroke-width="1.6"/>';
    if (k === 'vest') return legs('#1e2b4f') + arms('#ffffff') + blk(55, 74, 50, 50, '#ffffff') + blk(55, 74, 18, 50, '#1e3a8a') + blk(87, 74, 18, 50, '#1e3a8a') + '<path d="M77 76h6l-1 4 2 18-4 4-4-4 2-18z" fill="#b91c1c"/>';
    if (k === 'dress') { var id = 'sk' + (++hid); return legs('#8f1d3f', '#3b1a0f') + arms('#d6246e') + ikat(55, 74, 50, 40) + '<path d="M53 112h54l6 56H47z" fill="#d6246e"/><clipPath id="' + id + '"><path d="M53 112h54l6 56H47z"/></clipPath><g clip-path="url(#' + id + ')">' + ikat(46, 112, 68, 56) + '</g><rect x="55" y="110" width="50" height="4" fill="#f4cf5a"/>'; }
    if (HROBE[k]) {
      var c = HROBE[k], st = '';
      for (var x = 58; x < 104; x += 9) st += '<rect x="' + x + '" y="74" width="3" height="94" fill="' + c[1] + '"/>';
      return legs('#3f2a1d', '#3b1a0f') + arms(c[0]) + '<path d="M54 74h52l4 94H50z" fill="' + c[0] + '"/>' + st + '<path d="M80 74v94" stroke="' + c[2] + '" stroke-width="2"/><rect x="54" y="104" width="52" height="6" fill="' + c[2] + '"/><path d="M54 74h52l4 94H50z" fill="none" stroke="#000" stroke-opacity=".15" stroke-width="2"/>';
    }
    return legs('#2b3a55') + arms('#1d4ed8', true) + blk(55, 74, 50, 50, '#1d4ed8') + '<path d="M80 92l7 4-7 4-7-4z" fill="#f4cf5a"/><path d="M73 96l7 4v8l-7-4z" fill="#d4a017"/><path d="M87 96l-7 4v8l7-4z" fill="#9a7310"/>';
  }
  function heldItem(k) {
    var cx = 48, cy = 116;
    if (k === 'astrolabe') return '<circle cx="48" cy="116" r="13" fill="#d4a017"/><circle cx="48" cy="116" r="9.5" fill="#f4cf5a"/><path d="M39 116h18M48 107v18" stroke="#9a7310" stroke-width="1.4"/><circle cx="48" cy="116" r="4.5" fill="none" stroke="#9a7310" stroke-width="1.2"/><rect x="45" y="97" width="6" height="6" fill="#d4a017"/>';
    if (k === 'compass') return '<path d="M48 96l-9 30M48 96l9 30" stroke="#64748b" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="96" r="3.5" fill="#d4a017"/><rect x="54" y="122" width="5" height="6" fill="#1d4ed8"/>';
    if (k === 'book') return '<g transform="rotate(-12 48 116)">' + blk(36, 102, 24, 30, '#b91c1c') + '<rect x="36" y="102" width="4" height="30" fill="#7f1d1d"/><text x="50" y="121" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="12" font-weight="700" fill="#fff">x²</text></g>';
    if (k === 'globe') return '<rect x="46" y="124" width="4" height="8" fill="#9a7310"/><rect x="40" y="131" width="16" height="4" fill="#9a7310"/><circle cx="48" cy="114" r="12" fill="#3b82f6"/><path d="M40 108h7v5h-5zM50 115h7v7h-6z" fill="#22a06b"/><circle cx="48" cy="114" r="12" fill="none" stroke="#1e3a8a" stroke-width="1.2"/>';
    if (k === 'scroll') return blk(34, 102, 28, 32, '#f8eccf', true, 2) + '<rect x="32" y="99" width="32" height="5" rx="2.5" fill="#d4b483"/><rect x="32" y="131" width="32" height="5" rx="2.5" fill="#d4b483"/><text x="48" y="115" text-anchor="middle" font-family="Georgia,serif" font-size="9" font-weight="700" fill="#7c2d12">½ ⅓</text><text x="48" y="126" text-anchor="middle" font-family="Georgia,serif" font-size="9" font-weight="700" fill="#7c2d12">⅙ ⅛</text>';
    return '';
  }
  function heroScene(hr) {
    hr = Object.assign({ skin: 2, hair: 'short', hairc: 'black', hat: 'none', outfit: 'tee', item: 'none', bg: 'grid' }, hr || {});
    var S = HSKIN[hr.skin] || HSKIN[2], hc = HHAIR[hr.hairc] || HHAIR.black, hat = hr.hat, hair = hr.hair;
    var wraps = hat.indexOf('scarf:') === 0 || hat.indexOf('turban') === 0;
    var back = wraps ? '' : hairBack(hair, hc), front = '';
    if (!wraps && hat !== 'beanie') { front = hairFront(hair, hc); if (/^(doppi|doppi_gul|cap_q|crown)$/.test(hat) && hair === 'bun') front = hairFront('bob', hc); }
    var face = blk(58, 30, 44, 42, S[0], true, 3) + '<rect x="66" y="47" width="6" height="9" rx="1" fill="#24160c"/><rect x="88" y="47" width="6" height="9" rx="1" fill="#24160c"/><rect x="67" y="48" width="2.2" height="2.2" fill="#fff"/><rect x="89" y="48" width="2.2" height="2.2" fill="#fff"/>' +
      '<path d="M73 62q7 6 14 0" fill="none" stroke="#7a3b26" stroke-width="2.4" stroke-linecap="round"/><rect x="61" y="58" width="5" height="3" rx="1.5" fill="#e98a7a" fill-opacity=".55"/><rect x="94" y="58" width="5" height="3" rx="1.5" fill="#e98a7a" fill-opacity=".55"/>';
    return hbg(hr.bg) + '<ellipse cx="80" cy="178" rx="34" ry="5" fill="#000" fill-opacity=".16"/>' + hatBack(hat) + back + outfit(hr.outfit, S[0]) + blk(72, 70, 16, 6, S[1], false, 0) + face + front + hatFront(hat) + heldItem(hr.item);
  }
  function heroFull(hr, w, label) {
    return '<svg class="hero-full" width="' + w + '" height="' + Math.round(w * 1.25) + '" viewBox="0 0 160 200" ' + (label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true"') + '>' + heroScene(hr) + '</svg>';
  }
  function heroBust(hr, size, label) {
    var id = 'hb' + (++hid), fr = hr && HFRAME[hr.frame];
    return '<svg class="hero-bust" width="' + size + '" height="' + size + '" viewBox="0 0 88 88" ' + (label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true"') + '><defs><clipPath id="' + id + '"><circle cx="44" cy="44" r="44"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')"><g transform="scale(1.3) translate(-46 -8)">' + heroScene(hr) + '</g></g>' + (fr ? '<circle cx="44" cy="44" r="41.5" fill="none" stroke="' + fr + '" stroke-width="5"/>' : '') + '</svg>';
  }
  /** Avatar circle: the hero if the student made one, otherwise the first letter. */
  function avatarOf(hero, name, size) {
    if (CUBES_ON && hero) return heroBust(hero, size);
    return '<span class="avatar lt" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size / 2.4) + 'px" aria-hidden="true">' + esc(String(name || '?').charAt(0)) + '</span>';
  }

  var cubeFetch = null;
  function refreshBal() {
    if (!CUBES_ON || isStaff() || cubeFetch) return;
    cubeFetch = api('cubes').then(function (r) { cubeFetch = null; if (r.ok) setBal(r.balance); }, function () { cubeFetch = null; });
  }
  function reasonText(c) {
    var p = String(c.ref || '').split('|'), rn = function (rid) { var m = /R(\d+)$/.exec(rid || ''); return m ? t('r.round') + ' ' + m[1] : rid; };
    switch (c.reason) {
      case 'test': return t('cb.rTest', { r: rn(p[0]) });
      case 'streak': return t('cb.rStreak', { n: p[1] || '' });
      case 'grow': return t('cb.rGrow', { n: p[1] || '' });
      case 'goal': return t('cb.rGoal', { g: p[1] || '' });
      case 'fix': return t('cb.rFix');
      case 'blitz': return t('cb.rBlitz');
      case 'duel': return c.delta >= CUBE_RULES.duelWin ? t('cb.rDuelWin') : t('cb.rDuelPlay');
      case 'buy': return t('cb.rBuy', { x: itemName(c.ref) });
      case 'teacher': return t('cb.rTeacher') + (c.ref ? ' · ' + c.ref : '');
    }
    return c.reason;
  }
  var CUBE_RULES = { duelWin: 10, duelPlay: 3, fix: 3, blitz: 2, gameCap: 30, test: 20, goal: 50 };
  function itemName(id) {
    if (String(id).indexOf('look:') === 0) return t('lk.' + id.slice(5) + '.name');
    var k = 'it.' + id; return t(k) === k ? id : t(k);
  }
  function fmtDay(ms) { var d = new Date(Number(ms) + 5 * 3600e3).toISOString().slice(0, 10).split('-'); return d[2] + '.' + d[1]; }

  // ---------- wallet ----------
  function walletCard(w, compact) {
    return '<section class="card wallet"><div class="wl-top">' + cubeIco(compact ? 40 : 52) + '<div><div class="wl-l">' + esc(t('cb.mine')) + '</div><div class="wl-n">' + w.balance + '</div></div>' +
      '<div class="wl-m"><div class="wl-l">' + esc(t('cb.month')) + '</div><b>+' + w.month + '</b></div></div>' +
      (compact ? '' : '<div class="wl-stats"><div><b>' + (w.streak || 0) + '</b><span>' + esc(t('cb.streak')) + '</span></div><div><b>' + w.duels.win + '–' + w.duels.lose + '</b><span>' + esc(t('cb.duels')) + '</span></div><div><b>' + w.place + '</b><span>' + esc(t('cb.place')) + '</span></div></div>') +
      '<div class="wl-btns"><a class="btn wl-b" href="#/games">' + icon('play') + esc(t('gm.title')) + '</a><a class="btn wl-shop" href="#/shop">' + cubeIco(18) + esc(t('cb.shop')) + '</a></div></section>';
  }
  function viewCubes() {
    var main = studentShell('profile', t('cb.title'), esc(t('cb.sub'))); loading(main);
    apiC('cubes').then(guard).then(function (w) {
      setBal(w.balance); Object.assign(CUBE_RULES, w.rules || {});
      var list = w.ledger.length ? '<ul class="ledger">' + w.ledger.map(function (c) {
        return '<li><div><b>' + esc(reasonText(c)) + '</b><small>' + fmtDay(c.at) + '</small></div>' + plusCubes(c.delta) + '</li>'; }).join('') + '</ul>' : '<p class="muted">' + esc(t('cb.empty')) + '</p>';
      var R = CUBE_RULES;
      var rules = '<section class="card"><h2>' + esc(t('cb.how')) + '</h2><ul class="rules">' +
        [[t('cb.hTest'), '+' + R.test], [t('cb.hStreak'), '+5…+25'], [t('cb.hGrow'), '+1'], [t('cb.hGoal'), '+' + R.goal], [t('cb.hFix'), '+' + R.fix], [t('cb.hBlitz'), '+' + R.blitz],
         [t('cb.hDuel'), '+' + R.duelWin + ' / +' + R.duelPlay]].map(function (x) { return '<li><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + cubeIco(14) + '</b></li>'; }).join('') +
        '</ul><p class="hint">' + esc(t('cb.cap', { n: R.gameCap })) + ' ' + esc(t('cb.noTransfer')) + '</p></section>';
      main.innerHTML = cols(walletCard(w) + '<section class="card"><h2>' + esc(t('cb.history')) + '</h2>' + list + '</section>', rules);
      focusMain(main);
    }).catch(fail(main, viewCubes));
  }

  // ---------- hero constructor ----------
  var HTABS = ['looks', 'look', 'hat', 'outfit', 'item', 'bg', 'frame'], heroTab = 'hat', heroDraft = null;
  function viewHero() {
    var main = studentShell('profile', t('hr.title'), esc(t('hr.sub'))); loading(main);
    apiC('hero').then(guard).then(function (d) {
      setBal(d.balance);
      var saved = d.hero || d.dflt; if (!heroDraft) heroDraft = Object.assign({}, d.dflt, saved);
      var can = function (id) { var it = d.items[id]; if (!it) return false; if (it[1] === 0) return true; if (String(it[1]).indexOf('ach:') === 0) return !!d.unlocked[String(it[1]).slice(4)]; return !!d.owned[id]; };
      var draw = function () {
        var dirty = JSON.stringify(heroDraft) !== JSON.stringify(Object.assign({}, d.dflt, saved)) || !d.hero;
        var tabs = '<nav class="htabs" aria-label="' + esc(t('hr.parts')) + '">' + HTABS.map(function (x) { return '<button data-tab="' + x + '" aria-pressed="' + (x === heroTab) + '"' + (x === heroTab ? ' class="on"' : '') + '>' + esc(t('hr.t.' + x)) + '</button>'; }).join('') + '</nav>';
        var tile = function (preview, name, foot, attrs, sel, dim) {
          return '<button class="htile' + (sel ? ' sel' : '') + (dim ? ' dim' : '') + '" ' + attrs + '>' + preview + '<span class="ht-n">' + esc(name) + '</span>' + foot + '</button>';
        };
        var price = function (n) { return '<span class="ht-p">' + cubeIco(13) + n + '</span>'; };
        var body = '';
        if (heroTab === 'looks') {
          body = '<p class="hint pad">' + esc(t('hr.looksHint', { n: CUBE_RULES.lookPrice || 150 })) + '</p><div class="hgrid two">' + Object.keys(d.looks).map(function (k) {
            var L = d.looks[k], have = L.parts.every(function (p) { return d.owned[p]; }), pv = Object.assign({}, heroDraft);
            L.parts.forEach(function (p) { var s = p.split(':')[0]; pv[s] = p.slice(s.length + 1); });
            return '<button class="hlook" data-look="' + k + '">' + heroBust(pv, 54) + '<span><b>' + esc(t('lk.' + k + '.name')) + '</b><small>' + esc(t('lk.' + k + '.era')) + '</small>' +
              (have ? '<span class="ht-ok">' + esc(t('hr.have')) + '</span>' : price(L.price)) + '</span></button>';
          }).join('') + '</div>';
        } else if (heroTab === 'look') {
          var lab = function (x) { return '<h3 class="hsec">' + esc(t(x)) + '</h3>'; };
          body = lab('hr.hair') + '<div class="hgrid four">' + d.free.hair.map(function (k) {
            var pv = Object.assign({}, heroDraft, { hair: k, hat: 'none', item: 'none' });
            return tile(heroBust(pv, 46), t('hr.h.' + k), '<span class="ht-free">' + esc(heroDraft.hair === k ? t('hr.on') : t('hr.free')) + '</span>', 'data-set="hair" data-v="' + k + '"', heroDraft.hair === k);
          }).join('') + '</div>' +
            '<div class="hsw2"><div>' + lab('hr.skin') + '<div class="swatches">' + d.free.skin.map(function (k) { return '<button class="sw' + (Number(heroDraft.skin) === k ? ' sel' : '') + '" data-set="skin" data-v="' + k + '" aria-pressed="' + (Number(heroDraft.skin) === k) + '" aria-label="' + esc(t('hr.skin')) + ' ' + k + '" style="background:' + HSKIN[k][0] + ';box-shadow:inset 0 -6px 0 ' + HSKIN[k][1] + '"></button>'; }).join('') + '</div></div>' +
            '<div>' + lab('hr.hairc') + '<div class="swatches">' + d.free.hairc.map(function (k) { return '<button class="sw' + (heroDraft.hairc === k ? ' sel' : '') + '" data-set="hairc" data-v="' + k + '" aria-pressed="' + (heroDraft.hairc === k) + '" aria-label="' + esc(t('hr.hc.' + k)) + '" style="background:' + HHAIR[k] + '"></button>'; }).join('') + '</div></div></div>';
        } else {
          var ids = Object.keys(d.items).filter(function (id) { return d.items[id][0] === heroTab; });
          ids.sort(function (a, b) { var pa = d.items[a][1], pb = d.items[b][1]; var na = typeof pa === 'number' ? pa : 999, nb = typeof pb === 'number' ? pb : 999; return (can(b) - can(a)) * 0 + na - nb; });
          body = '<div class="hgrid">' + ids.map(function (id) {
            var v = id.slice(heroTab.length + 1), pv = Object.assign({}, heroDraft); pv[heroTab] = v;
            var it = d.items[id], on = heroDraft[heroTab] === v, ach = String(it[1]).indexOf('ach:') === 0, ok = can(id);
            var foot = on ? '<span class="ht-on">' + esc(t('hr.on')) + '</span>' : ok ? '<span class="ht-free">' + esc(it[1] === 0 ? t('hr.free') : t('hr.have')) + '</span>' : ach ? '<span class="ht-ach">' + esc(t('hr.ach.' + String(it[1]).slice(4))) + '</span>' : price(it[1]);
            var prev = heroTab === 'bg' ? heroFull(pv, 64) : heroTab === 'frame' ? heroBust(pv, 52) : heroTab === 'outfit' || heroTab === 'item' ? heroFull(Object.assign(pv, { bg: heroDraft.bg }), 52) : heroBust(pv, 52);
            return tile(prev, itemName(id), foot, 'data-item="' + id + '"', on, ach && !ok);
          }).join('') + '</div>';
        }
        var card = '<section class="card hero-card"><div class="hc-full">' + heroFull(heroDraft, 118, t('hr.myHero')) + '</div><div class="hc-r"><div class="hc-av">' + heroBust(heroDraft, 60) +
          '<div><b>' + esc(t('hr.avatar')) + '</b><small>' + esc(t('hr.avatarSub')) + '</small></div></div>' +
          '<div class="hc-bal">' + cubeIco(18) + '<b>' + d.balance + '</b></div></div></section>';
        main.innerHTML = '<div class="hero-wrap">' + card + tabs + '<div class="hbody">' + body + '</div>' +
          '<div class="hsave"><button class="btn" data-act="reset"' + (dirty ? '' : ' disabled') + '>' + esc(t('c.cancel')) + '</button><button class="btn primary" data-act="save"' + (dirty ? '' : ' disabled') + '>' + esc(t('hr.save')) + '</button></div></div>';
        main.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { heroTab = b.getAttribute('data-tab'); draw(); }; });
        main.querySelectorAll('[data-set]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-set'); heroDraft[k] = k === 'skin' ? Number(b.getAttribute('data-v')) : b.getAttribute('data-v'); draw(); }; });
        main.querySelectorAll('[data-item]').forEach(function (b) { b.onclick = function () {
          var id = b.getAttribute('data-item'), it = d.items[id];
          if (can(id)) { heroDraft[heroTab] = id.slice(heroTab.length + 1); draw(); return; }
          if (String(it[1]).indexOf('ach:') === 0) { toast(t('hr.achHow.' + String(it[1]).slice(4))); return; }
          buyDialog(id, it[1], d, function () { heroDraft[heroTab] = id.slice(heroTab.length + 1); draw(); });
        }; });
        main.querySelectorAll('[data-look]').forEach(function (b) { b.onclick = function () { lookDialog(b.getAttribute('data-look'), d, draw); }; });
        main.querySelector('[data-act=reset]').onclick = function () { heroDraft = Object.assign({}, d.dflt, saved); draw(); };
        main.querySelector('[data-act=save]').onclick = function (e) {
          e.target.disabled = true;
          api('heroSave', { hero: heroDraft }).then(guard).then(function (r) { saved = r.hero; d.hero = r.hero; heroDraft = Object.assign({}, r.hero); toast(t('hr.saved')); draw(); })
            .catch(function (x) { e.target.disabled = false; toast(errText(x.error)); });
        };
      };
      draw(); focusMain(main);
    }).catch(fail(main, viewHero));
  }
  function buyDialog(id, price, d, after) {
    var enough = d.balance >= price;
    var m = openDialog('<h2>' + esc(itemName(id)) + '</h2><p class="buy-p">' + cubeIco(22) + '<b>' + price + '</b> · ' + esc(t('hr.youHave', { n: d.balance })) + '</p>' + (enough ? '' : '<p class="muted">' + esc(t('hr.short', { n: price - d.balance })) + '</p>'),
      '<button class="btn" data-n>' + esc(t('c.close')) + '</button>' + (enough ? '<button class="btn primary" data-y>' + esc(t('hr.buyFor', { n: price })) + '</button>' : '<a class="btn primary" href="#/games" data-g>' + esc(t('gm.title')) + '</a>'));
    m.querySelector('[data-n]').onclick = m._close; var g = m.querySelector('[data-g]'); if (g) g.onclick = m._close;
    var y = m.querySelector('[data-y]');
    if (y) { y.focus(); y.onclick = function () {
      y.disabled = true;
      api('shopBuy', { item: id }).then(guard).then(function (r) { d.balance = r.balance; d.owned = r.owned; setBal(r.balance); m._close(); toast(t('hr.bought', { x: itemName(id) })); after && after(); })
        .catch(function (x) { y.disabled = false; toast(errText(x.error)); });
    }; } else m.querySelector('[data-n]').focus();
  }
  function lookDialog(k, d, after) {
    var L = d.looks[k], have = L.parts.every(function (p) { return d.owned[p]; }), pv = Object.assign({}, heroDraft);
    L.parts.forEach(function (p) { var s = p.split(':')[0]; pv[s] = p.slice(s.length + 1); });
    var sum = L.parts.reduce(function (s, p) { return s + (d.owned[p] ? 0 : d.items[p][1]); }, 0);
    var inner = '<div class="look-top">' + heroFull(pv, 112, t('hr.inLook', { x: t('lk.' + k + '.name') })) + '<div><h2>' + esc(t('lk.' + k + '.name')) + '</h2><p class="muted">' + esc(t('lk.' + k + '.era')) + '</p></div></div>' +
      '<p class="look-fact">' + esc(t('lk.' + k + '.fact')) + '</p>' + (t('lk.' + k + '.note') !== 'lk.' + k + '.note' ? '<p class="hint">' + esc(t('lk.' + k + '.note')) + '</p>' : '') +
      '<ul class="look-parts">' + L.parts.map(function (p) { return '<li><span>' + esc(itemName(p)) + '</span>' + (d.owned[p] ? '<span class="ht-ok">' + esc(t('hr.have')) + '</span>' : '<span class="ht-p">' + cubeIco(13) + d.items[p][1] + '</span>') + '</li>'; }).join('') + '</ul>' +
      (have ? '' : '<p class="buy-p">' + (sum > L.price ? '<s>' + sum + '</s> ' : '') + cubeIco(20) + '<b>' + L.price + '</b> · ' + esc(t('hr.youHave', { n: d.balance })) + '</p>');
    var btn = have ? '<button class="btn primary" data-w>' + esc(t('hr.wear')) + '</button>' : d.balance >= L.price ? '<button class="btn primary" data-y>' + esc(t('hr.buyLook', { n: L.price })) + '</button>' : '<button class="btn" disabled>' + esc(t('hr.short', { n: L.price - d.balance })) + '</button>';
    var m = openDialog(inner, '<button class="btn" data-n>' + esc(t('c.close')) + '</button>' + btn);
    m.querySelector('.modal-c').classList.add('wide');
    m.querySelector('[data-n]').onclick = m._close;
    var wear = function () { L.parts.forEach(function (p) { var s = p.split(':')[0]; heroDraft[s] = p.slice(s.length + 1); }); m._close(); after(); };
    var w = m.querySelector('[data-w]'); if (w) { w.onclick = wear; w.focus(); }
    var y = m.querySelector('[data-y]');
    if (y) { y.focus(); y.onclick = function () {
      y.disabled = true;
      api('shopBuy', { item: 'look:' + k }).then(guard).then(function (r) { d.balance = r.balance; d.owned = r.owned; setBal(r.balance); toast(t('hr.bought', { x: t('lk.' + k + '.name') }));
        Object.keys(d.looks).forEach(function (x) { var miss = d.looks[x].parts.filter(function (p) { return !d.owned[p]; }).reduce(function (s, p) { return s + d.items[p][1]; }, 0); d.looks[x].price = Math.min(CUBE_RULES.lookPrice || 150, miss); });
        wear(); })
        .catch(function (x) { y.disabled = false; toast(errText(x.error)); });
    }; }
    if (!w && !y) m.querySelector('[data-n]').focus();
  }

  // ---------- shop (frames, hints) ----------
  function viewShop() {
    var main = studentShell('profile', t('cb.shop'), esc(t('sh.sub'))); loading(main);
    apiC('hero').then(guard).then(function (d) {
      setBal(d.balance);
      var good = function (id, sub, prev) {
        var it = d.items[id], have = d.owned[id], hint = it[0] === 'hint';
        return '<div class="card good">' + prev + '<b>' + esc(itemName(id)) + '</b><small>' + esc(sub) + '</small>' +
          (have && !hint ? '<span class="ht-ok">' + esc(t('hr.have')) + '</span>' : '<button class="btn sm" data-buy="' + id + '">' + cubeIco(16) + it[1] + '</button>') + (hint && have ? '<small>' + esc(t('sh.left', { n: have })) + '</small>' : '') + '</div>';
      };
      var me = d.hero || d.dflt;
      main.innerHTML = '<a class="card hero-link" href="#/hero">' + heroBust(me, 56) + '<div><b>' + esc(t('hr.title')) + '</b><small>' + esc(t('sh.heroSub')) + '</small></div>' + icon('chevron') + '</a>' +
        '<h2 class="sec-h">' + esc(t('sh.frames')) + '</h2><div class="goods">' + good('frame:gold', t('sh.frameSub'), heroBust(Object.assign({}, me, { frame: 'gold' }), 56)) + good('frame:neon', t('sh.frameSub'), heroBust(Object.assign({}, me, { frame: 'neon' }), 56)) + '</div>' +
        '<h2 class="sec-h">' + esc(t('sh.help')) + '</h2><div class="goods">' + good('hint:5050', t('sh.hintSub'), '<span class="good-ic">50/50</span>') + '</div>' +
        '<p class="hint pad">' + esc(t('cb.noTransfer')) + '</p>';
      main.querySelectorAll('[data-buy]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-buy'); buyDialog(id, d.items[id][1], d, function () { viewShop(); }); }; });
      focusMain(main);
    }).catch(fail(main, viewShop));
  }

  // ---------- games hub ----------
  function viewGames() {
    var main = studentShell('mistakes', t('gm.title'), esc(t('gm.sub'))); loading(main);
    api('games').then(guard).then(function (g) {
      setBal(g.balance); Object.assign(CUBE_RULES, g.rules || {});
      var pct = Math.round(100 * g.gameToday / g.gameCap);
      var card = function (href, title, sub, reward, tag, ic, cls, off) {
        return '<' + (off ? 'div' : 'a href="' + href + '"') + ' class="card game ' + cls + (off ? ' off' : '') + '"><span class="g-ic">' + icon(ic) + '</span><div class="g-t"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small><span class="g-r">' + reward + '</span></div>' + (tag ? '<span class="g-tag">' + esc(tag) + '</span>' : '') + '</' + (off ? 'div' : 'a') + '>';
      };
      var noPool = !g.pool;
      main.innerHTML = '<section class="card today"><div class="td-h"><b>' + esc(t('gm.today')) + '</b><span>' + g.gameToday + ' / ' + g.gameCap + cubeIco(14) + '</span></div><div class="progress"><div style="width:' + pct + '%"></div></div><small class="muted">' + esc(t('gm.todaySub')) + '</small></section>' +
        (noPool ? '<section class="card note">' + icon('lock') + '<div>' + esc(t('gm.noPool')) + '</div></section>' : '') +
        card('#/fix', t('gm.fix'), t('gm.fixSub'), esc(t('gm.perRight', { n: CUBE_RULES.fix })), g.mistakes ? t('gm.left', { n: g.mistakes }) : '', 'target', 'g-fix', noPool || !g.mistakes) +
        card('#/blitz', t('gm.blitz'), t('gm.blitzSub', { s: CUBE_RULES.blitzSec }), esc(t('gm.perRight', { n: CUBE_RULES.blitz })), '', 'clock', 'g-blitz', noPool) +
        card('#/duel', t('gm.duel'), t('gm.duelSub'), esc(t('gm.duelReward', { w: CUBE_RULES.duelWin, p: CUBE_RULES.duelPlay })), g.online ? t('gm.online', { n: g.online }) : '', 'users', 'g-duel', noPool) +
        '<p class="hint pad">' + esc(t('gm.duelsToday', { n: g.duelsToday, m: g.duelsPerDay })) + '</p>';
      focusMain(main);
    }).catch(fail(main, viewGames));
  }
  function qBody(q, cls) {
    var mc = q.kind === 'MC' && q.opts && q.opts.length;
    return '<div class="qbody ' + (cls || '') + '">' + q.html + '</div>' + (mc ? '<div class="opts-run" role="radiogroup" aria-label="' + esc(t('test.choose')) + '">' + q.opts.map(function (o, i) { var L = 'ABCD'.charAt(i);
      return '<button class="opt" role="radio" aria-checked="false" data-l="' + L + '"><span class="L">' + L + '</span><span class="ot">' + o + '</span></button>'; }).join('') + '</div>'
      : '<label class="spr">' + esc(t('r.your')) + '<input id="gA" autocomplete="off" inputmode="text"></label>');
  }
  function bindPick(root, onPick) {
    root.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () {
      root.querySelectorAll('.opt').forEach(function (x) { var on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-checked', String(on)); });
      onPick(b.getAttribute('data-l'));
    }; });
  }
  function gameShell(title, back) {
    var main = studentShell('mistakes', title, '');
    var hb = $app.querySelector('.hero h1'); if (hb) hb.insertAdjacentHTML('beforebegin', '<a class="back-l" href="' + (back || '#/games') + '">' + icon('back') + esc(t('gm.title')) + '</a>');
    return main;
  }

  // ---------- game: fix a mistake ----------
  function viewFix(skip) {
    skip = skip || [];
    var main = gameShell(t('gm.fix')); loading(main);
    api('fixNext', { skip: skip }).then(guard).then(function (d) {
      if (d.done) { main.innerHTML = '<section class="card center"><p>' + esc(t('fx.none')) + '</p><a class="btn primary" href="#/games">' + esc(t('gm.title')) + '</a></section>'; return; }
      var s = d.slot, q = d.q, pick = '';
      main.innerHTML = '<section class="card game-q"><div class="gq-h"><span>' + esc(t('r.round')) + ' ' + s.roundNo + ' · ' + esc(s.skill) + '</span><span class="muted">' + esc(t('gm.left', { n: d.left })) + '</span></div>' +
        qBody(q) + '<div id="gR" class="sim-r" role="status" aria-live="polite"></div><div class="g-acts"><button class="btn" data-act="skip">' + esc(t('fx.skip')) + '</button><button class="btn primary" data-act="check">' + esc(t('sim.check')) + '</button></div></section>';
      bindPick(main, function (L) { pick = L; });
      var chk = main.querySelector('[data-act=check]'), done = false;
      main.querySelector('[data-act=skip]').onclick = function () { viewFix(skip.concat([s.roundId + '|' + s.module + '|' + s.pos])); };
      chk.onclick = function () {
        if (done) return viewFix(skip);
        var ans = q.kind === 'MC' && q.opts.length ? pick : (main.querySelector('#gA').value || '').trim();
        if (!ans) { main.querySelector('#gR').innerHTML = '<p class="muted">' + esc(t('sim.empty')) + '</p>'; return; }
        chk.disabled = true;
        api('fixCheck', { roundId: s.roundId, module: s.module, pos: s.pos, ref: q.ref, answer: ans }).then(guard).then(function (c) {
          chk.disabled = false; setBal(c.balance);
          var msg = c.correct ? (c.got ? t('fx.right', { n: c.got }) : c.capped ? t('fx.capped') : t('sim.right')) : t('sim.wrong', { k: String(c.key).replace(' or ', ' / ') });
          main.querySelector('#gR').innerHTML = '<div class="notice ' + (c.correct ? 'ok' : 'bad') + '">' + icon(c.correct ? 'check' : 'x') + '<span>' + esc(msg) + '</span>' + (c.got ? plusCubes(c.got) : '') + '</div>' +
            (c.solution ? '<details class="sol"><summary>' + esc(t('r.solution')) + '</summary><div>' + c.solution + '</div></details>' : '');
          main.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; if (x.getAttribute('data-l') === String(c.key)) x.classList.add('key'); });
          var inp = main.querySelector('#gA'); if (inp) inp.readOnly = true;
          done = true; chk.textContent = t('sim.next');
          if (!c.correct) skip = skip.concat([s.roundId + '|' + s.module + '|' + s.pos]);
          chk.focus();
        }).catch(function (x) { chk.disabled = false; toast(errText(x.error)); });
      };
      focusMain(main);
    }).catch(fail(main, function () { viewFix(skip); }));
  }

  // ---------- game: blitz ----------
  function viewBlitz() {
    var main = gameShell(t('gm.blitz'));
    main.innerHTML = '<section class="card center"><span class="big-ic">' + icon('clock') + '</span><h2>' + esc(t('bz.ready')) + '</h2><p class="muted">' + esc(t('bz.rules', { n: 5, s: CUBE_RULES.blitzSec || 45, c: CUBE_RULES.blitz })) + '</p><button class="btn primary big" data-act="go">' + icon('play') + esc(t('bz.start')) + '</button></section>';
    main.querySelector('[data-act=go]').onclick = function () {
      loading(main);
      api('blitzStart').then(guard).then(function (g) { runBlitz(main, g); }).catch(function (x) {
        main.innerHTML = '<section class="card center"><p>' + esc(x && x.error === 'no_questions' ? t('gm.noPool') : errText(x && x.error)) + '</p><a class="btn" href="#/games">' + esc(t('gm.title')) + '</a></section>';
      });
    };
    focusMain(main);
  }
  function runBlitz(main, g) {
    var i = 0, right = 0, got = 0, hints = g.hints, tmr = null;
    var next = function () {
      if (tmr) clearInterval(tmr);
      if (i >= g.items.length) {
        main.innerHTML = '<section class="card center"><h2>' + esc(t('bz.done')) + '</h2><div class="big-score">' + right + '<span class="of"> / ' + g.items.length + '</span></div>' + (got ? '<p>' + plusCubes(got) + '</p>' : '') +
          '<div class="g-acts"><a class="btn" href="#/games">' + esc(t('gm.title')) + '</a><button class="btn primary" data-act="again">' + esc(t('bz.again')) + '</button></div></section>';
        main.querySelector('[data-act=again]').onclick = viewBlitz; return;
      }
      var q = g.items[i], left = g.sec, answered = false;
      main.innerHTML = '<section class="card game-q"><div class="gq-h"><span>' + esc(t('bz.q', { i: i + 1, n: g.items.length })) + ' · ' + esc(q.skill) + '</span><span class="bz-t" aria-live="off"><b id="bzT">' + left + '</b> ' + esc(t('bz.sec')) + '</span></div>' +
        '<div class="tbar"><div id="bzB" style="width:100%"></div></div>' + qBody(q) + '<div id="gR" class="sim-r" role="status" aria-live="polite"></div>' +
        '<div class="g-acts">' + (hints > 0 ? '<button class="btn" data-act="hint">50/50 · ' + hints + '</button>' : '') + '</div></section>';
      var send = function (L) {
        if (answered) return; answered = true; clearInterval(tmr);
        main.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; });
        api('blitzAnswer', { id: g.id, idx: i, answer: L || '-' }).then(guard).then(function (r) {
          if (r.correct) right++; got += r.got || 0; setBal(r.balance);
          main.querySelectorAll('.opt').forEach(function (x) { if (x.getAttribute('data-l') === String(r.key)) x.classList.add('key'); });
          main.querySelector('#gR').innerHTML = '<div class="notice ' + (r.correct ? 'ok' : 'bad') + '">' + icon(r.correct ? 'check' : 'x') + '<span>' + esc(r.correct ? t('sim.right') : (L ? t('sim.wrong', { k: r.key }) : t('bz.timeout', { k: r.key }))) + '</span>' + (r.got ? plusCubes(r.got) : '') + '</div>';
          setTimeout(function () { i++; next(); }, r.correct ? 900 : 1800);
        }).catch(function (x) { toast(errText(x.error)); i++; setTimeout(next, 800); });
      };
      bindPick(main, send);
      var hb = main.querySelector('[data-act=hint]');
      if (hb) hb.onclick = function () {
        hb.disabled = true;
        api('blitzHint', { id: g.id, idx: i }).then(guard).then(function (r) { hints = r.hints; r.remove.forEach(function (L) { var o = main.querySelector('.opt[data-l="' + L + '"]'); if (o) { o.disabled = true; o.classList.add('gone'); } }); hb.remove(); })
          .catch(function (x) { hb.disabled = false; toast(errText(x.error)); });
      };
      tmr = setInterval(function () {
        left--; var e = document.getElementById('bzT'), b = document.getElementById('bzB');
        if (!e) { clearInterval(tmr); return; }
        e.textContent = Math.max(0, left); b.style.width = Math.max(0, 100 * left / g.sec) + '%';
        if (left <= 0) send('');
      }, 1000);
      timers.push(tmr);
    };
    next();
  }

  // ---------- duels ----------
  function viewDuelLobby() {
    var main = gameShell(t('gm.duel')); loading(main);
    var first = true;
    var poll = function () {
      if (document.hidden && !first) return;
      api('duelLobby').then(guard).then(function (d) {
        if (curRoute().indexOf('#/duel') !== 0 || /^#\/duel\/./.test(curRoute())) return;
        if (d.active) return go('#/duel/' + d.active);
        var lim = d.duelsToday >= d.duelsPerDay;
        var html = '<section class="card"><h2>' + esc(t('du.how')) + '</h2><p class="muted">' + esc(t('du.rules', { n: d.rules.duelQ, s: d.rules.duelSec })) + '</p>' +
          '<div class="pills"><span class="pill gold">' + cubeIco(14) + esc(t('du.win', { n: d.rules.duelWin })) + '</span><span class="pill gold">' + cubeIco(14) + esc(t('du.play', { n: d.rules.duelPlay })) + '</span><span class="pill">' + esc(t('du.today', { n: d.duelsToday, m: d.duelsPerDay })) + '</span></div>' +
          '<p class="hint">' + esc(t('du.bank')) + '</p></section>';
        d.incoming.forEach(function (x) {
          html += '<section class="card invite">' + avatarOf(x.other && x.other.hero, x.other && x.other.name, 48) + '<div><b>' + esc(t('du.invited', { x: x.other ? x.other.name : '' })) + '</b><small>' + esc(t('du.inviteSub')) + '</small></div>' +
            '<div class="g-acts"><button class="btn" data-dec="' + x.id + '">' + esc(t('du.decline')) + '</button><button class="btn primary" data-acc="' + x.id + '">' + esc(t('du.accept')) + '</button></div></section>';
        });
        d.outgoing.forEach(function (x) {
          html += '<section class="card invite"><span class="spin"></span><div><b>' + esc(x.status === 'queue' ? t('du.searching') : t('du.waiting', { x: x.other ? x.other.name : '' })) + '</b><small>' + esc(t('du.waitSub')) + '</small></div><button class="btn" data-can="' + x.id + '">' + esc(t('c.cancel')) + '</button></section>';
        });
        html += '<button class="btn primary big" data-act="random"' + (lim || d.outgoing.length ? ' disabled' : '') + '>' + esc(t('du.random')) + '</button>';
        html += '<h2 class="sec-h">' + esc(t('du.online')) + '</h2>' + (d.online.length ? '<section class="card flush"><ul class="online">' + d.online.map(function (o) {
          return '<li>' + avatarOf(o.hero, o.name, 44) + '<div><b>' + esc(o.name) + '</b><small>' + (o.sat ? 'SAT ' + o.sat : '') + (o.topics.length ? ' · ' + esc(t('du.common')) + ': ' + esc(o.topics.join(', ')) : '') + '</small></div>' +
            (o.busy ? '<span class="muted sm">' + esc(t('du.busy')) + '</span>' : '<button class="btn sm gold" data-inv="' + esc(o.login) + '"' + (lim || d.outgoing.length ? ' disabled' : '') + '>' + esc(t('du.challenge')) + '</button>') + '</li>';
        }).join('') + '</ul></section>' : '<section class="card"><p class="muted">' + esc(t('du.nobody')) + '</p></section>');
        if (lim) html += '<p class="hint pad">' + esc(t('du.limit')) + '</p>';
        main.innerHTML = html;
        var act = function (p) { return p.then(guard).then(function (r) { if (r.started && r.id) go('#/duel/' + r.id); else poll(); }).catch(function (x) { toast(errText(x.error)); poll(); }); };
        main.querySelectorAll('[data-inv]').forEach(function (b) { b.onclick = function () { b.disabled = true; act(api('duelInvite', { login: b.getAttribute('data-inv') })); }; });
        main.querySelectorAll('[data-acc]').forEach(function (b) { b.onclick = function () { b.disabled = true; act(api('duelRespond', { id: b.getAttribute('data-acc'), accept: true })); }; });
        main.querySelectorAll('[data-dec]').forEach(function (b) { b.onclick = function () { act(api('duelRespond', { id: b.getAttribute('data-dec'), accept: false })); }; });
        main.querySelectorAll('[data-can]').forEach(function (b) { b.onclick = function () { act(api('duelCancel', { id: b.getAttribute('data-can') })); }; });
        var rb = main.querySelector('[data-act=random]'); if (rb) rb.onclick = function () { rb.disabled = true; act(api('duelRandom')); };
        if (first) { first = false; focusMain(main); }
      }).catch(fail(main, viewDuelLobby));
    };
    poll(); later(poll, 4000);
  }
  function viewDuel(id) {
    var main = gameShell(t('gm.duel'), '#/duel'); loading(main);
    var cur = null, skew = 0, busy = false, pick = '';
    var vs = function (s) {
      return '<div class="vs"><figure>' + heroFull(s.me.hero || {}, 132, t('du.you')) + '<figcaption><b>' + esc(firstName(s.me.name)) + '</b><small>' + esc(t('du.you')) + '</small></figcaption></figure><span class="vs-b">VS</span>' +
        '<figure>' + heroFull((s.other && s.other.hero) || {}, 132, s.other ? s.other.name : '') + '<figcaption><b>' + esc(s.other ? firstName(s.other.name) : '') + '</b><small>' + (s.other && s.other.sat ? 'SAT ' + s.other.sat : '') + '</small></figcaption></figure></div>';
    };
    var score = function (s) {
      var dots = ''; for (var i = 0; i < s.n; i++) { var r = s.results[i]; dots += '<span class="dd ' + (r ? (r.win === 'me' ? 'me' : r.win === 'them' ? 'them' : 'none') : (s.idx === i && s.phase === 'question' ? 'cur' : '')) + '"></span>'; }
      return '<section class="duel-bar">' + avatarOf(s.me.hero, s.me.name, 40) + '<div class="db-n"><b>' + esc(t('du.you')) + '</b></div><div class="db-s"><b>' + s.my + ' : ' + s.their + '</b><div class="dots">' + dots + '</div></div><div class="db-n r"><b>' + esc(s.other ? firstName(s.other.name) : '') + '</b></div>' + avatarOf(s.other && s.other.hero, s.other && s.other.name, 40) + '</section>';
    };
    var draw = function (s) {
      skew = (s.now || Date.now()) - Date.now();
      var key = s.phase + '|' + (s.idx === undefined ? '' : s.idx);
      if (s.phase === 'question' && cur === key) {          // same question: update flags only, keep the student's input
        var st = main.querySelector('#duSt');
        if (st) st.innerHTML = s.answered ? esc(s.answered.c ? t('du.rightWait') : t('du.wrongWait')) : s.theirAnswered ? esc(t('du.theyAnswered')) : '';
        main.querySelector('.duel-bar').outerHTML = score(s);
        return;
      }
      cur = key;
      if (s.phase === 'invite' || s.phase === 'queue') {
        main.innerHTML = '<section class="card center"><span class="spin"></span><p>' + esc(s.phase === 'queue' ? t('du.searching') : t('du.waiting', { x: s.other ? s.other.name : '' })) + '</p><button class="btn" data-act="cancel">' + esc(t('c.cancel')) + '</button></section>';
        main.querySelector('[data-act=cancel]').onclick = function () { api('duelCancel', { id: id }).then(function () { go('#/duel'); }); };
        return;
      }
      if (s.phase === 'expired' || s.phase === 'declined' || s.phase === 'cancelled') {
        main.innerHTML = '<section class="card center"><p>' + esc(t('du.gone.' + s.phase)) + '</p><a class="btn primary" href="#/duel">' + esc(t('gm.duel')) + '</a></section>'; return;
      }
      if (s.phase === 'wait') {
        main.innerHTML = '<section class="duel-stage"><p class="ds-k">' + esc(t('du.found')) + '</p>' + vs(s) + '<p class="ds-cd">' + esc(t('du.startsIn')) + ' <b id="duCd"></b></p></section>';
      } else if (s.phase === 'question') {
        pick = '';
        main.innerHTML = score(s) + '<section class="card game-q"><div class="gq-h"><span>' + esc(t('bz.q', { i: s.idx + 1, n: s.n })) + ' · ' + esc(s.q.skill) + '</span><span class="bz-t"><b id="duT"></b> ' + esc(t('bz.sec')) + '</span></div><div class="tbar"><div id="duB"></div></div>' +
          qBody(s.q) + '<p id="duSt" class="du-st" role="status" aria-live="polite"></p>' + (s.q.kind !== 'MC' ? '<div class="g-acts"><button class="btn primary" data-act="send">' + esc(t('du.answer')) + '</button></div>' : '') + '</section>';
        var send = function (ans) {
          if (busy || !ans) return; busy = true;
          main.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; });
          api('duelAnswer', { id: id, idx: s.idx, answer: ans }).then(guard).then(function (n) { busy = false; draw._s = n; draw(n); tick(); }).catch(function (x) { busy = false; toast(errText(x.error)); });
        };
        bindPick(main, function (L) { pick = L; send(L); });
        var sb = main.querySelector('[data-act=send]'); if (sb) sb.onclick = function () { send((main.querySelector('#gA').value || '').trim()); };
        var inp = main.querySelector('#gA'); if (inp) inp.onkeydown = function (e) { if (e.key === 'Enter') send(inp.value.trim()); };
        if (s.answered) { main.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; if (x.getAttribute('data-l') === s.answered.a) x.classList.add('sel'); }); if (inp) inp.readOnly = true; if (sb) sb.disabled = true; }
        main.querySelector('#duSt').innerHTML = s.answered ? esc(s.answered.c ? t('du.rightWait') : t('du.wrongWait')) : s.theirAnswered ? esc(t('du.theyAnswered')) : '';
      } else if (s.phase === 'pause') {
        var r = s.results[s.idx];
        main.innerHTML = score(s) + '<section class="card center"><h2>' + esc(r.win === 'me' ? t('du.pointMe') : r.win === 'them' ? t('du.pointThem') : t('du.pointNone')) + '</h2><p class="muted">' + esc(t('r.correct')) + ': <b>' + esc(String(r.key).replace(' or ', ' / ')) + '</b></p><p class="ds-cd">' + esc(t('du.nextIn')) + ' <b id="duCd"></b></p></section>';
      } else if (s.phase === 'done') {
        main.innerHTML = '<section class="duel-stage done"><p class="ds-k">' + esc(t('gm.duel')) + '</p><h2 class="ds-res">' + esc(t('du.res.' + s.result)) + '</h2>' +
          '<div class="vs">' + avatarOf(s.me.hero, s.me.name, 76) + '<span class="vs-score">' + s.my + ' : ' + s.their + '</span>' + avatarOf(s.other && s.other.hero, s.other && s.other.name, 76) + '</div>' +
          '<section class="card"><div class="td-h"><b>' + esc(t('du.yourCubes')) + '</b>' + plusCubes(s.got) + '</div><p class="hint">' + esc(t('du.bankNote')) + '</p></section>' +
          '<div class="g-acts col"><a class="btn primary big" href="#/duel">' + esc(t('du.again')) + '</a><a class="btn" href="#/mistakes">' + esc(t('du.review')) + '</a><a class="btn" href="#/games">' + esc(t('gm.title')) + '</a></div></section>';
        refreshBal();
      }
      focusMain(main);
    };
    var tick = function () {
      if (!cur) return;
      var now = Date.now() + skew, s = draw._s; if (!s) return;
      var cd = document.getElementById('duCd'); if (cd && s.until) cd.textContent = Math.max(0, Math.ceil((s.until - now) / 1000));
      var tt = document.getElementById('duT'), bb = document.getElementById('duB');
      if (tt && s.deadline) { var left = Math.max(0, Math.ceil((s.deadline - now) / 1000)); tt.textContent = left; bb.style.width = (100 * left / s.sec) + '%'; }
    };
    var poll = function () {
      if (busy) return;
      api('duelState', { id: id }).then(guard).then(function (s) { draw._s = s; if (curRoute() !== '#/duel/' + id) return; draw(s); tick(); }).catch(fail(main, function () { viewDuel(id); }));
    };
    poll(); later(function () { var s = draw._s; if (s && s.phase === 'done') return; poll(); }, 1500); later(tick, 250);
  }

  // ---------- staff: cubes ----------
  function staffCubesCard(login) {
    return apiC('cubes', { login: login }).then(guard).then(function (w) {
      return '<section class="card staff-cubes"><h2>' + cubeIco(20) + ' ' + esc(t('cb.title')) + ': ' + w.balance + '</h2><ul class="ledger">' + w.ledger.slice(0, 6).map(function (c) { return '<li><div><b>' + esc(reasonText(c)) + '</b><small>' + fmtDay(c.at) + '</small></div>' + plusCubes(c.delta) + '</li>'; }).join('') + '</ul>' +
        '<form class="adj"><label>' + esc(t('cb.adjN')) + '<input name="n" type="number" step="1" min="-500" max="500" required></label><label>' + esc(t('cb.adjNote')) + '<input name="note" maxlength="120"></label><button class="btn primary">' + esc(t('cb.adjGo')) + '</button></form></section>';
    }).catch(function () { return ''; });
  }
  function bindStaffCubes(main, login, again) {
    var f = main.querySelector('form.adj'); if (!f) return;
    f.onsubmit = function (e) {
      e.preventDefault(); var n = Number(f.n.value); if (!n) return;
      api('cubesAdjust', { login: login, delta: n, note: f.note.value }).then(guard).then(function (r) { toast(t('cb.adjDone', { n: r.balance })); again(); }).catch(function (x) { toast(errText(x.error)); });
    };
  }
  var cubeGroup = null;
  function viewCubesGroup() {
    var main = staffShell('cubes'); loading(main);
    teacherGroups().then(function (groups) {
      if (!cubeGroup || groups.indexOf(cubeGroup) < 0) cubeGroup = curGroup && groups.indexOf(curGroup) >= 0 ? curGroup : groups[0];
      var head = '<div class="page-h"><h1>' + esc(t('cb.title')) + '</h1><div class="chips">' + groups.map(function (g) {
        return '<button data-g="' + esc(g) + '" aria-pressed="' + (g === cubeGroup) + '" class="' + (g === cubeGroup ? 'on ' : '') + groupClass(g) + '">' + esc(groupLabel(g)) + '</button>'; }).join('') + '</div></div>';
      var bind = function () { main.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { cubeGroup = b.getAttribute('data-g'); viewCubesGroup(); }; }); };
      main.innerHTML = head + '<div class="loading"><span class="spin"></span>' + esc(t('c.loading')) + '</div>'; bind();
      var want = cubeGroup;
      return apiC('cubesGroup', { group: want }).then(guard).then(function (d) {
        if (want !== cubeGroup || !main.isConnected) return;
        main.innerHTML = head + (d.students.length ? '<section class="card flush"><div class="tbl-wrap"><table class="tbl cubes-t"><thead><tr><th scope="col" class="wide-only">#</th><th scope="col">' + esc(t('lg.student')) + '</th><th scope="col" class="num">' + esc(t('cb.week')) + '</th><th scope="col" class="num">' + esc(t('cb.title')) + '</th></tr></thead><tbody>' +
          d.students.map(function (s, i) { return '<tr><td class="wide-only">' + (i + 1) + '</td><td><a class="who" href="#/student/' + encodeURIComponent(s.login) + '">' + avatarOf(s.hero, s.name, 32) + '<span>' + esc(s.name) + '<small class="lg">' + esc(s.cls) + '</small></span></a></td><td class="num">+' + s.week + '</td><td class="num"><b>' + s.balance + '</b></td></tr>'; }).join('') + '</tbody></table></div></section>'
          : '<section class="card"><p class="muted">' + esc(t('lg.empty')) + '</p></section>') +
          '<p class="hint pad">' + esc(t('cb.groupHint')) + '</p>';
        bind(); focusMain(main);
      });
    }).catch(fail(main, viewCubesGroup));
  }


  // ---------- router ----------
  var memRoute = '#/', suppressHash = false;
  function curRoute() { return DEMO ? memRoute : location.hash; }
  function go(hash) {
    navigated = true;
    if (DEMO) { memRoute = hash; return render(); }
    if (location.hash === hash) render(); else location.hash = hash;
  }
  if (DEMO) document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (a) { e.preventDefault(); go(a.getAttribute('href')); }
  });
  function render() {
    timers.forEach(clearInterval); timers = [];
    document.documentElement.lang = lang;
    var p = curRoute().replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    window.scrollTo(0, 0);
    if (!session.token || !session.user) return viewLogin();
    if (p[0] === 'login') return go('#/');
    if (session.user.mustChange || p[0] === 'password') return viewPassword();
    if (TS && p[0] === 'test' && p[1] === 'run') return renderRun();
    if (TS && !(p[0] === 'test' && p[1] === 'run')) { tsPersist(); }   // leaving the test page keeps answers locally
    var staff = isStaff();
    if (staff) {
      if (p[0] === 'student' && p[1]) return p[2] === 'round' ? viewRound(p[3], p[1]) : viewStudentDetail(p[1]);
      if (p[0] === 'students') return viewStudents();
      if (p[0] === 'rounds') return viewRounds();
      if (p[0] === 'league') return viewLeague();
      if ((p[0] === 'cubes' || p[0] === 'cubesgroup') && CUBES_ON) return viewCubesGroup();
      if (p[0] === 'proctor') return viewProctor();
      return viewGroup();
    }
    if (p[0] === 'test') return viewTestHub();
    if (p[0] === 'tests') return viewTests();
    if (p[0] === 'round' && p[1]) return viewRound(p[1]);
    if (p[0] === 'mistakes') return viewMistakes();
    if (p[0] === 'league') return viewLeague();
    if (p[0] === 'profile') return viewProfile();
    if (CUBES_ON) {
      if (p[0] === 'cubes') return viewCubes();
      if (p[0] === 'hero') return viewHero();
      if (p[0] === 'shop') return viewShop();
      if (p[0] === 'games') return viewGames();
      if (p[0] === 'fix') return viewFix();
      if (p[0] === 'blitz') return viewBlitz();
      if (p[0] === 'duel') return p[1] ? viewDuel(p[1]) : viewDuelLobby();
    }
    return viewHome();
  }
  if (!DEMO) window.addEventListener('hashchange', function () { if (suppressHash) { suppressHash = false; return; } navigated = true; render(); });
  window.addEventListener('beforeunload', function () { if (TS) tsPersist(); });
  render();
})();
