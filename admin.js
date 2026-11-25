/* RML Admin — a separate admin panel (admin.html). Signs in with its own "admin" account; teachers keep using index.html.
   Talks to the same API (window.PORTAL_CONFIG.apiUrl); every change is checked and logged by the server. */
(function () {
  'use strict';
  var CFG = window.PORTAL_CONFIG || {}, $app = document.getElementById('app');
  var TK = 'rml_admin_token', UK = 'rml_admin_user';
  var S = { token: get(TK), user: null }; try { S.user = JSON.parse(get(UK) || 'null'); } catch (e) {}
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(action, payload) {
    return fetch(CFG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action, token: S.token }, payload || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'network' }; })
      .then(function (r) { if (!r.ok && (r.error === 'auth_expired' || r.error === 'auth_required')) { logout(true); } return r; });
  }
  var ERR = { network: 'Нет связи с сервером. Проверьте интернет.', bad_credentials: 'Неверный логин или пароль.', too_many_attempts: 'Слишком много попыток. Подождите 10 минут.',
    forbidden: 'Нет доступа.', bad_group: 'Группа пишется так: 10-alpha, 9-beta.', cannot_demote_self: 'Нельзя снять права администратора или отключить самого себя.',
    use_change_password: 'Свой пароль меняйте через «Сменить пароль».', bad_round_id: 'ID раунда: латиница, цифры, - или _, 2–24 символа.', round_exists: 'Раунд с таким ID уже есть.',
    bad_date: 'Дата в формате ГГГГ-ММ-ДД.', bad_request: 'Заполните обязательные поля.', weak_password: 'Пароль слишком простой: минимум 6 символов, не равен логину.',
    bad_old_password: 'Текущий пароль неверный.', reason_required: 'Укажите причину.', not_found: 'Не найдено.', bad_m1_minutes: 'M1: от 5 до 180 минут.', bad_m2_minutes: 'M2: от 5 до 180 минут.',
    bad_threshold: 'Порог: от 0 до 22.', bad_grace_seconds: 'Запас: от 0 до 600 секунд.', bad_scale_a: 'Шкала a: от 0 до 2000.', bad_scale_b: 'Шкала b: от 0 до 1000.', bad_round_no: 'Номер раунда: 1–99.', bad_close_at: 'Неверная дата закрытия.' };
  function errText(e) { return ERR[e] || 'Ошибка: ' + e; }
  var ICO = {
    home: '<path d="M3 21H21"/><path d="M4.5 21V4.5H19.5V21"/><path d="M8.5 21V12A5 5 0 0 1 12 7.23A5 5 0 0 1 15.5 12V21"/>',
    users: '<path d="M4 5H9.5V10.5H4Z"/><path d="M1.75 20V14H11.75V20"/><path d="M14.5 4H20V9.5H14.5Z"/><path d="M14.5 13H22.25V19"/>',
    shield: '<path d="M12 2.5L20 5.5V11C20 16 16.5 19.5 12 21.5C7.5 19.5 4 16 4 11V5.5Z"/><path d="M8.5 12L11 14.5L15.5 9.5"/>',
    upload: '<path d="M12 16V4"/><path d="M7 9L12 4L17 9"/><path d="M4 20.5H20"/>', download: '<path d="M12 3V15"/><path d="M7 10L12 15L17 10"/><path d="M4 20.5H20"/>',
    key: '<circle cx="7.5" cy="16.5" r="4"/><path d="M10.4 13.6L20.5 3.5"/><path d="M16.5 7.5L19.5 10.5"/><path d="M18.5 5.5L21 8"/>',
    grid: '<path d="M4 4H10.5V10.5H4Z"/><path d="M13.5 4H20V10.5H13.5Z"/><path d="M4 13.5H10.5V20H4Z"/><path d="M13.5 13.5H20V20H13.5Z"/>',
    calendar: '<path d="M3.5 5.5H20.5V20.5H3.5Z"/><path d="M3.5 10H20.5"/><path d="M8 2.5V7"/><path d="M16 2.5V7"/>',
    chart: '<path d="M3.5 20.5H20.5"/><path d="M6 17V11"/><path d="M10.5 17V6"/><path d="M15 17V13"/><path d="M19.5 17V8.5"/>',
    cube: '<path d="M12 2.8L20 7.4V16.6L12 21.2L4 16.6V7.4Z"/><path d="M4 7.4L12 12L20 7.4M12 12V21.2"/>',
    trophy: '<path d="M7 3.5H17V9A5 5 0 0 1 7 9Z"/><path d="M7 5.5H3.5V7.5A3.5 3.5 0 0 0 7 11"/><path d="M17 5.5H20.5V7.5A3.5 3.5 0 0 1 17 11"/><path d="M12 14V17.5"/><path d="M8 17.5H16V21H8Z"/>',
    megaphone: '<path d="M3 9.5V14.5H6.5L15 19.5V4.5L6.5 9.5Z"/><path d="M18 8.5A4.5 4.5 0 0 1 18 15.5"/>',
    list: '<path d="M9 6H20M9 12H20M9 18H20"/><path d="M4 5H6V7H4ZM4 11H6V13H4ZM4 17H6V19H4Z"/>',
    db: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5V18.5C4.5 19.9 7.9 21 12 21S19.5 19.9 19.5 18.5V5.5"/><path d="M4.5 12C4.5 13.4 7.9 14.5 12 14.5S19.5 13.4 19.5 12"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5V5.5M12 18.5V21.5M2.5 12H5.5M18.5 12H21.5M5.3 5.3L7.4 7.4M16.6 16.6L18.7 18.7M5.3 18.7L7.4 16.6M16.6 7.4L18.7 5.3"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>', x: '<path d="M5 5L19 19"/><path d="M19 5L5 19"/>',
    alert: '<path d="M12 3L22 20H2Z"/><path d="M12 9.5V14"/><path d="M12 16.8V17.2"/>', plus: '<path d="M12 5V19M5 12H19"/>', menu: '<path d="M4 6H20M4 12H20M4 18H20"/>',
    check: '<path d="M4 12.5L9.5 18L20 6.5"/>', refresh: '<path d="M20 11A8 8 0 1 0 17.7 17"/><path d="M20 4V11H13"/>', play: '<path d="M7 4V20L20 12Z"/>',
    lock: '<path d="M4.5 11H19.5V21H4.5Z"/><path d="M8 11V8A4.5 4.5 0 0 1 12 3.53A4.5 4.5 0 0 1 16 8V11"/>', swap: '<path d="M4 8H19L15 4"/><path d="M20 16H5L9 20"/>'
  };
  function ic(n, s) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"' + (s ? ' style="width:' + s + 'px;height:' + s + 'px"' : '') + '>' + ICO[n] + '</svg>'; }
  var MARK = '<svg width="34" height="34" viewBox="61 7 100 100" aria-hidden="true"><path d="M79 86V46A26 26 0 0 1 95 22A26 26 0 0 1 111 46V86M111 46A26 26 0 0 1 127 22A26 26 0 0 1 143 46V86" stroke="#fff" fill="none" stroke-width="12"/><rect x="72" y="96" width="78" height="8" rx="4" fill="#F2B731"/></svg>';
  var GREEK = { alpha: 'α', beta: 'β', gamma: 'γ' };
  function gl(g) { var p = String(g || '').split('-'); return p.length > 1 && GREEK[p[1]] ? p[0] + ' ' + GREEK[p[1]] : String(g || '—'); }
  function gcls(g) { var p = String(g || '').split('-')[1]; return p === 'beta' ? 'g-beta' : p === 'gamma' ? 'g-gamma' : g === 'test' ? 'g-test' : ''; }
  function gp(g) { return '<span class="gp ' + gcls(g) + '">' + esc(gl(g)) + '</span>'; }
  function st(t, k) { return '<span class="st ' + k + '">' + esc(t) + '</span>'; }
  function fmt(ms) { if (!ms) return '—'; var d = new Date(Number(ms)); return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function dmy(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] : String(s || '—'); }
  function toast(t) { var x = document.createElement('div'); x.className = 'toast'; x.setAttribute('role', 'status'); x.textContent = t; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 3200); }
  function h(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function modal(inner, buttons) {
    var prev = document.activeElement, m = h('<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">' + inner + '<div class="ma">' + buttons + '</div></div></div>');
    m._close = function () { m.remove(); if (prev && prev.focus) prev.focus(); };
    m.addEventListener('click', function (e) { if (e.target === m) m._close(); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') m._close(); });
    document.body.appendChild(m); var f = m.querySelector('input, textarea, select, button'); if (f) f.focus(); return m;
  }
  function confirmBox(title, text, yes, onYes, danger) {
    var m = modal('<h2 id="mt">' + esc(title) + '</h2><p>' + esc(text) + '</p>', '<button class="btn" data-n>Отмена</button><button class="btn ' + (danger ? 'dng' : 'pri') + '" data-y>' + esc(yes) + '</button>');
    m.querySelector('[data-n]').onclick = m._close; m.querySelector('[data-y]').onclick = function () { m._close(); onYes(); }; m.querySelector('[data-n]').focus();
  }
  function pwModal(login, pw) {
    var m = modal('<h2 id="mt">Временный пароль</h2><p>Логин <b class="mono">' + esc(login) + '</b>. Пароль показывается один раз: при первом входе его нужно сменить. Все прежние входы этого аккаунта закрыты.</p><div class="pw">' + esc(pw) + '</div>',
      '<button class="btn" data-c>Скопировать</button><button class="btn pri" data-n>Готово</button>');
    m.querySelector('[data-n]').onclick = m._close;
    m.querySelector('[data-c]').onclick = function () { try { navigator.clipboard.writeText(login + ' / ' + pw); toast('Скопировано'); } catch (e) {} };
  }

  // ---------- sign-in ----------
  function logout(expired) {
    if (S.token && !expired) api('logout');
    S.token = null; S.user = null; put(TK, null); put(UK, null); viewLogin(expired ? 'Сеанс истёк. Войдите снова.' : '');
  }
  function viewLogin(msg) {
    document.title = 'RML Admin — вход';
    $app.innerHTML = '<div class="login"><form autocomplete="on"><div class="lh"><span style="background:var(--navy);border-radius:12px;padding:6px;display:grid">' + MARK + '</span><div><b>RML Admin</b><div class="muted">Вход администратора</div></div></div>' +
      '<label class="field">Логин<input name="login" autocomplete="username" required autocapitalize="off" spellcheck="false"></label>' +
      '<label class="field">Пароль<input name="password" type="password" autocomplete="current-password" required></label>' +
      '<p class="err" role="alert">' + esc(msg || '') + '</p><button class="btn pri" type="submit">Войти</button>' +
      '<a href="./" class="muted" style="font-size:13px;text-align:center">Вход для учителей и учеников →</a></form></div>';
    var f = $app.querySelector('form'); f.login.focus();
    f.onsubmit = function (e) {
      e.preventDefault(); var b = f.querySelector('button'); b.disabled = true;
      api('login', { login: f.login.value.trim(), password: f.password.value }).then(function (r) {
        b.disabled = false;
        if (!r.ok) { f.querySelector('.err').textContent = errText(r.error); return; }
        if (r.user.role !== 'admin') { S.token = r.token; api('logout'); S.token = null; f.querySelector('.err').textContent = 'Этот вход только для администратора. Учителя входят на главной странице.'; return; }
        S.token = r.token; S.user = r.user; put(TK, r.token); put(UK, JSON.stringify(r.user));
        if (r.user.mustChange) return viewChangePw(true);
        route();
      });
    };
  }
  function viewChangePw(first) {
    var html = '<div class="login"><form><div class="lh"><span style="background:var(--navy);border-radius:12px;padding:6px;display:grid">' + MARK + '</span><div><b>Новый пароль</b><div class="muted">' + (first ? 'Первый вход: придумайте свой пароль' : 'Смена пароля') + '</div></div></div>' +
      '<label class="field">Текущий пароль<input name="old" type="password" autocomplete="current-password" required></label>' +
      '<label class="field">Новый пароль (от 8 символов)<input name="nw" type="password" autocomplete="new-password" minlength="8" required></label>' +
      '<label class="field">Ещё раз<input name="nw2" type="password" autocomplete="new-password" required></label><p class="err" role="alert"></p><button class="btn pri" type="submit">Сохранить</button>' +
      (first ? '' : '<a href="#dash" class="muted" style="font-size:13px;text-align:center">Отмена</a>') + '</form></div>';
    $app.innerHTML = html; var f = $app.querySelector('form'); f.old.focus();
    f.onsubmit = function (e) {
      e.preventDefault(); var er = f.querySelector('.err');
      if (f.nw.value !== f.nw2.value) { er.textContent = 'Пароли не совпадают.'; return; }
      if (f.nw.value.length < 8) { er.textContent = 'Для администратора — не меньше 8 символов.'; return; }
      api('changePassword', { oldPassword: f.old.value, newPassword: f.nw.value }).then(function (r) {
        if (!r.ok) { er.textContent = errText(r.error); return; }
        S.user = r.user; put(UK, JSON.stringify(r.user)); toast('Пароль сохранён'); location.hash = '#dash'; route();
      });
    };
  }

  // ---------- shell ----------
  var NAV = [['ОБЗОР', [['dash', 'home', 'Дашборд']]],
    ['ЛЮДИ', [['users', 'users', 'Ученики'], ['staff', 'shield', 'Учителя и роли'], ['import', 'upload', 'Импорт по шаблону', 1]]],
    ['УЧЁБА', [['rounds', 'calendar', 'Раунды'], ['monitor', 'eye', 'Монитор теста'], ['analytics', 'chart', 'Аналитика', 1]]],
    ['ЛИГА', [['cubes', 'cube', 'Кубы и магазин', 1], ['games', 'trophy', 'Игры и дуэли', 1]]],
    ['СИСТЕМА', [['ann', 'megaphone', 'Объявления', 1], ['log', 'list', 'Журнал действий'], ['backup', 'db', 'Резервные копии'], ['settings', 'gear', 'Настройки', 1]]]];
  var BADGE = {};
  function shell(key, crumb, title, acts) {
    document.title = 'RML Admin — ' + title.replace(/<[^>]+>/g, '');
    var nav = NAV.map(function (sec) {
      return '<div><div class="nav-sec" aria-hidden="true">' + sec[0] + '</div>' + sec[1].map(function (x) {
        var b = x[3] ? '<span class="bdg soon">скоро</span>' : BADGE[x[0]] ? '<span class="bdg' + (x[0] === 'users' ? '' : ' gold') + '">' + BADGE[x[0]] + '</span>' : '';
        var href = x[0] === 'monitor' ? './#/proctor' : '#' + x[0];
        return '<a href="' + href + '"' + (x[0] === key ? ' aria-current="page"' : '') + (x[3] ? ' class="soon"' : '') + (x[0] === 'monitor' ? ' target="_blank" rel="noopener"' : '') + '>' + ic(x[1]) + esc(x[2]) + b + '</a>';
      }).join('') + '</div>';
    }).join('');
    $app.innerHTML = '<div class="mbar"><button aria-label="Меню" aria-expanded="false" data-menu>' + ic('menu', 22) + '</button><b>RML Admin</b></div><div class="shell">' +
      '<aside class="side" aria-label="Разделы"><a class="brand" href="#dash">' + MARK + '<div><b>RML Admin</b><small>Registan Math League</small></div></a><nav class="nav">' + nav + '</nav>' +
      '<div class="me"><span class="av" aria-hidden="true">A</span><div><b>' + esc(S.user.login) + '</b><small>Администратор</small></div><div class="me-a"><button data-mypw>Сменить пароль</button><button data-out>Выйти</button></div></div></aside>' +
      '<main class="main" id="main"><div class="top"><div><div class="crumb">' + esc(crumb) + '</div><h1 tabindex="-1">' + title + '</h1></div><div class="acts">' + (acts || '') + '</div></div><div class="body" id="body"><div class="loading">Загрузка…</div></div></main></div>';
    var side = $app.querySelector('.side'), mb = $app.querySelector('[data-menu]');
    mb.onclick = function () { var on = !side.classList.contains('on'); side.classList.toggle('on', on); mb.setAttribute('aria-expanded', on); if (on) side.querySelector('a').focus(); };
    side.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function (e) { if (a.classList.contains('soon')) { e.preventDefault(); toast('Этот раздел будет в следующем обновлении.'); } side.classList.remove('on'); }); });
    $app.querySelector('[data-out]').onclick = function () { logout(false); };
    $app.querySelector("[data-mypw]").onclick = function () { viewChangePw(false); };
    if (FOCUS) { $app.querySelector('h1').focus({ preventScroll: true }); }
    return document.getElementById('body');
  }
  var FOCUS = false;
  function route() {
    if (!S.token || !S.user) return viewLogin();
    if (S.user.mustChange) return viewChangePw(true);
    var k = (location.hash || '#dash').slice(1).split('/')[0];
    window.scrollTo(0, 0);
    if (k === 'users') return viewUsers();
    if (k === 'staff') return viewStaff();
    if (k === 'rounds') return viewRounds();
    if (k === 'log') return viewLog();
    if (k === 'backup') return viewBackup();
    return viewDash();
  }
  window.addEventListener('hashchange', function () { FOCUS = true; route(); });
  function failBox(body, r, retry) { body.innerHTML = '<div class="card"><p class="err">' + esc(errText(r.error)) + '</p><button class="btn" data-r>' + ic('refresh') + 'Повторить</button></div>'; body.querySelector('[data-r]').onclick = retry; }

  // ---------- dashboard ----------
  var ALERT = {
    noRound: function (a) { return ['Нет раунда для ' + gl(a.group), a.n + ' учеников', 'Создать раунд', '#rounds/new/' + a.group]; },
    variants: function (a) { return ['Не у всех есть вариант: ' + gl(a.group), 'не хватает ' + a.n + ' · ' + a.roundId, 'Раунды', '#rounds/' + a.roundId]; },
    neverIn: function (a) { return [a.n + ' учеников ещё не входили', 'временный пароль не сменён', 'Список', '#users/never']; },
    notClosed: function (a) { return ['Round ' + a.roundNo + ' (' + gl(a.group) + ') не закрыт', 'разбор и игры недоступны ученикам', 'Раунды', '#rounds/' + a.roundId]; },
    staffNew: function (a) { return [a.target + ' ещё не входил(а)', 'учитель', 'Учителя', '#staff']; }
  };
  var LOGK = { user: 'изменён пользователь', password: 'сброшен пароль', round: 'изменён раунд', roundNew: 'создан раунд',
    'pr.on': 'контроль теста включён', 'pr.off': 'контроль теста выключен', 'pr.code': 'новый код старта', 'pr.present': 'отмечен на перекличке', 'pr.absent': 'отмечен отсутствующим',
    'pr.admit': 'вошёл в тест по коду', 'pr.badcode': 'неверный код', 'pr.leave': 'ушёл со страницы теста — пауза', 'pr.unlock': 'тест продолжен', 'pr.finish': 'модуль завершён учителем', 'pr.reset': 'попытка сброшена' };
  function logLine(x) { return (LOGK[x.kind] || x.kind) + (x.target ? ' · ' + x.target : '') + (x.round ? ' · ' + x.round : ''); }
  var histGroup = null;
  function viewDash() {
    var body = shell('dash', 'Обзор', 'Дашборд', '<a class="btn" href="./" target="_blank" rel="noopener">' + ic('eye') + 'Открыть сайт</a><a class="btn pri" href="#rounds/new">' + ic('plus') + 'Новый раунд</a>');
    api('admOverview').then(function (d) {
      if (!body.isConnected) return;
      if (!d.ok) return failBox(body, d, viewDash);
      var T = d.totals; BADGE.users = T.students; BADGE.staff = T.staff;
      var nextR = d.groups.filter(function (g) { return g.next; }).map(function (g) { return g.next; }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
      var nr = nextR[0], nrGroups = nr ? d.groups.filter(function (g) { return g.next && g.next.date === nr.date; }).map(function (g) { return gl(g.group); }) : [];
      var pct = T.students ? Math.round(100 * T.activated / T.students) : 0, staffNew = d.staff.filter(function (s) { return s.active && !s.activated; }).length;
      var kpi = function (l, v, s, extra) { return '<div class="card kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="s">' + s + '</div>' + (extra || '') + '</div>'; };
      var html = '<div class="kpis">' + kpi('Ученики', T.students, T.groups + ' групп') +
        kpi('Хотя бы раз вошли', T.activated + '<small> / ' + T.students + '</small>', pct + ' % сменили временный пароль', '<div class="meter" aria-hidden="true"><i style="width:' + pct + '%"></i></div>') +
        kpi('Учителя', T.staff, staffNew ? staffNew + ' ещё не входили' : 'все входили') +
        kpi('Ближайший раунд', nr ? dmy(nr.date) : '—', nr ? 'Round ' + nr.roundNo + ' · ' + esc(nrGroups.join(', ')) + (nr.open ? ' · открыт' : '') : 'нет запланированных') +
        kpi('Кубы выдано', T.cubes, T.heroes + ' героев создано') + '</div>';
      // group readiness
      var max = Math.max.apply(null, d.groups.map(function (g) { return g.students; }).concat([1]));
      var bars = d.groups.map(function (g) {
        var w = function (n) { return Math.max(1, Math.round(100 * n / max)); };
        return '<div class="gr"><div>' + gp(g.group) + '</div><div class="bars">' +
          '<div class="b s"><i style="width:' + w(g.students) + '%"></i><span>' + g.students + '<span class="sr"> учеников</span></span></div>' +
          '<div class="b a"><i style="width:' + w(g.activated) + '%"></i><span>' + g.activated + '<span class="sr"> вошли</span></span></div>' +
          (g.next ? '<div class="b v"><i style="width:' + w(g.next.variants) + '%"></i><span>' + g.next.variants + ' · R' + g.next.roundNo + ' ' + dmy(g.next.date) + (g.next.proctor ? ' · контроль' : '') + '</span></div>'
                  : '<div class="b x"><span>нет раунда</span></div>') + '</div></div>';
      }).join('');
      var legend = '<div class="legend"><span><i style="background:#C9D9EE"></i>ученики</span><span><i style="background:var(--blue)"></i>вошли</span><span><i style="background:var(--gold)"></i>есть вариант раунда</span></div>';
      var alerts = d.alerts.map(function (a) {
        var t = ALERT[a.kind](a);
        return '<div class="alert ' + a.level + '"><span class="ai">' + ic('alert') + '</span><div><b>' + esc(t[0]) + '</b><small>' + esc(t[1]) + '</small></div><a href="' + t[3] + '">' + esc(t[2]) + ' →</a></div>';
      }).join('') || '<p class="muted">Всё в порядке.</p>';
      html += '<div class="row"><section class="card" style="flex:1.5 1 420px"><div class="card-h"><h2>Готовность групп</h2>' + legend + '</div><div class="gbars">' + bars + '</div></section>' +
        '<section class="card"><div class="card-h"><h2>Требует внимания</h2>' + (d.alerts.length ? st(String(d.alerts.length), d.alerts.some(function (a) { return a.level === 'bad'; }) ? 'bad' : 'warn') : '') + '</div>' + alerts + '</section></div>';
      // histogram of the latest round per group
      var withLast = d.groups.filter(function (g) { return g.last && g.last.sats.length; });
      if (!histGroup || !withLast.some(function (g) { return g.group === histGroup; })) histGroup = withLast[0] ? withLast[0].group : null;
      var hist = '<p class="muted">Результатов пока нет.</p>';
      if (histGroup) {
        var L = withLast.filter(function (g) { return g.group === histGroup; })[0].last, bins = {}, lo = 800, hi = 200;
        L.sats.forEach(function (s) { var b = Math.floor(s / 50) * 50; bins[b] = (bins[b] || 0) + 1; lo = Math.min(lo, b); hi = Math.max(hi, b); });
        var mx = Math.max.apply(null, Object.keys(bins).map(function (k) { return bins[k]; })), cols = '';
        for (var b = lo; b <= hi; b += 50) cols += '<div class="col"><b>' + (bins[b] || '') + '</b><i style="height:' + Math.round(100 * (bins[b] || 0) / mx) + '%"></i><small>' + b + '</small></div>';
        var avg = Math.round(L.sats.reduce(function (a, c) { return a + c; }, 0) / L.sats.length);
        hist = '<div class="chips small" role="group" aria-label="Группа">' + withLast.map(function (g) { return '<button class="chip" data-h="' + esc(g.group) + '" aria-pressed="' + (g.group === histGroup) + '">' + esc(gl(g.group)) + '</button>'; }).join('') + '</div>' +
          '<p class="muted" style="margin:10px 0 0">' + esc(L.season) + ' · Round ' + L.roundNo + ' · написали ' + L.sats.length + ' из ' + L.size + ' · среднее <b style="color:var(--ink)">' + avg + '</b>' + (L.closed ? '' : ' · раунд не закрыт') + '</p>' +
          '<div class="hist" role="img" aria-label="Распределение SAT: ' + Object.keys(bins).sort().map(function (k) { return k + '–' + (Number(k) + 49) + ': ' + bins[k]; }).join(', ') + '">' + cols + '</div>';
      }
      var feed = d.log.map(function (x) { return '<div><time>' + fmt(x.at) + '</time><span>' + esc(logLine(x)) + (x.by ? ' <span class="muted">(' + esc(x.by) + ')</span>' : '') + '</span></div>'; }).join('') || '<p class="muted">Пока пусто.</p>';
      html += '<div class="row"><section class="card"><div class="card-h"><h2>SAT · последний раунд</h2></div>' + hist + '</section>' +
        '<section class="card" style="flex:1.2 1 360px"><div class="card-h"><h2>Последние действия</h2><a href="#log" style="display:inline-flex;align-items:center;min-height:44px;font-size:13px;font-weight:700;text-decoration:none">Журнал →</a></div><div class="feed">' + feed + '</div></section></div>';
      body.innerHTML = html;
      body.querySelectorAll('[data-h]').forEach(function (b) { b.onclick = function () { histGroup = b.getAttribute('data-h'); viewDash(); }; });
    });
  }

  // ---------- students ----------
  var UF = { q: '', group: '', status: 'all' }, USERS = null;
  function viewUsers() {
    var parts = location.hash.split('/'); if (parts[1] === 'never') UF.status = 'never';
    var body = shell('users', 'Люди', 'Ученики');
    api('admUsers').then(function (d) {
      if (!body.isConnected) return;
      if (!d.ok) return failBox(body, d, viewUsers);
      USERS = d; drawUsers(body);
    });
  }
  function drawUsers(body) {
    var d = USERS, studs = d.users.filter(function (u) { return u.role === 'student'; }), q = UF.q.toLowerCase();
    var cnt = { all: studs.length, never: 0, active: 0, off: 0 };
    studs.forEach(function (u) { if (!u.active) cnt.off++; else if (u.activated) cnt.active++; else cnt.never++; });
    BADGE.users = studs.length;
    var list = studs.filter(function (u) {
      if (UF.group && u.group !== UF.group) return false;
      if (UF.status === 'never' && (!u.active || u.activated)) return false;
      if (UF.status === 'active' && (!u.active || !u.activated)) return false;
      if (UF.status === 'off' && u.active) return false;
      return !q || String(u.name).toLowerCase().indexOf(q) >= 0 || String(u.login).indexOf(q) >= 0;
    });
    var chip = function (k, t) { return '<button class="chip" data-s="' + k + '" aria-pressed="' + (UF.status === k) + '">' + t + ' · ' + cnt[k] + '</button>'; };
    var html = '<div class="tools"><label class="search">' + ic('search') + '<span class="sr">Поиск</span><input type="search" placeholder="Имя или логин" value="' + esc(UF.q) + '" data-q></label>' +
      '<div class="chips small">' + chip('all', 'Все') + chip('never', 'Не входили') + chip('active', 'Вошли') + chip('off', 'Отключены') + '</div>' +
      '<label class="field" style="flex-direction:row;align-items:center;gap:8px"><span class="sr">Группа</span><select data-g><option value="">Все группы</option>' + d.groups.map(function (g) { return '<option value="' + esc(g) + '"' + (UF.group === g ? ' selected' : '') + '>' + esc(gl(g)) + '</option>'; }).join('') + '</select></label></div>' +
      '<section class="card" style="padding:6px 8px"><div class="tbl-w"><table><thead><tr><th>Ученик</th><th>Группа · класс</th><th>Статус</th><th class="n">Последний SAT</th><th class="n hide-m">Кубы</th></tr></thead><tbody>' +
      (list.map(function (u) {
        return '<tr class="click" tabindex="0" data-u="' + esc(u.login) + '"><td class="who"><b>' + esc(u.name) + '</b><span class="mono">' + esc(u.login) + '</span></td><td>' + gp(u.group) + '<div class="muted" style="font-size:12px;margin-left:14px">' + esc(u.cls) + '</div></td>' +
          '<td>' + (!u.active ? st('Отключён', 'mute') : u.activated ? st('Вошёл', 'ok') : st('Не входил', 'warn')) + '</td><td class="n"><b>' + (u.last === null ? '—' : u.last) + '</b></td><td class="n hide-m">' + u.cubes + '</td></tr>';
      }).join('') || '<tr><td colspan="5" class="empty">Никого не найдено</td></tr>') + '</tbody></table></div><p class="muted" style="margin:10px 12px 4px;font-size:13px">' + list.length + ' из ' + studs.length + '</p></section>';
    body.innerHTML = html;
    var qi = body.querySelector('[data-q]');
    qi.oninput = function () { UF.q = qi.value; var pos = qi.selectionStart; drawUsers(body); var n = body.querySelector('[data-q]'); n.focus(); n.setSelectionRange(pos, pos); };
    body.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { UF.status = b.getAttribute('data-s'); drawUsers(body); }; });
    body.querySelector('[data-g]').onchange = function (e) { UF.group = e.target.value; drawUsers(body); };
    body.querySelectorAll('[data-u]').forEach(function (tr) {
      var open = function () { userDrawer(tr.getAttribute('data-u'), function () { api('admUsers').then(function (x) { if (x.ok) { USERS = x; drawUsers(body); } }); }); };
      tr.onclick = open; tr.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    });
  }
  function userDrawer(login, onChange) {
    var u = USERS.users.filter(function (x) { return x.login === login; })[0]; if (!u) return;
    var prev = document.activeElement;
    var rounds = USERS.rounds.filter(function (r) { return r.group === u.group; });
    var bg = h('<div class="drawer-bg"></div>');
    var dr = h('<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dn"><div class="dh"><span class="av" aria-hidden="true">' + esc(String(u.name).charAt(0)) + '</span><div><b id="dn">' + esc(u.name) + '</b><span class="mono muted">' + esc(u.login) + '</span></div><button class="iconbtn" data-x aria-label="Закрыть">' + ic('x') + '</button></div>' +
      '<div class="db"><div class="grid2"><label class="field">Ф.И.О.<input data-f="name" value="' + esc(u.name) + '"></label><label class="field">Класс<input data-f="cls" value="' + esc(u.cls) + '"></label></div>' +
      '<label class="field">Группа<select data-f="group">' + USERS.groups.map(function (g) { return '<option value="' + esc(g) + '"' + (g === u.group ? ' selected' : '') + '>' + esc(gl(g)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="tog"><input type="checkbox" data-f="active"' + (u.active ? ' checked' : '') + '>Аккаунт включён</label>' +
      '<div class="box"><h3>Пароль ' + (u.activated ? st('сменён учеником', 'ok') : st('временный', 'warn')) + '</h3><div><button class="btn sm" data-pw>' + ic('key') + 'Сбросить пароль</button></div></div>' +
      '<div class="box"><h3>SAT по раундам</h3>' + (u.sats && u.sats.length ? '<div class="muted" style="font-size:14px">' + u.sats.map(function (s) { return esc(s.s) + ' R' + s.r + ': <b style="color:var(--ink)">' + s.sat + '</b>'; }).join(' · ') + '</div>' : '<span class="muted">пока нет</span>') + '</div>' +
      '<div class="box"><h3>Кубы <span class="muted" style="font-weight:600">баланс ' + (u.cubes || 0) + '</span></h3><div class="grid2"><label class="field">+/−<input type="number" data-cn min="-500" max="500" step="1" placeholder="10"></label><label class="field">За что<input data-cw maxlength="120"></label></div><div><button class="btn sm" data-cb>' + ic('cube') + 'Начислить</button></div></div>' +
      '<div class="box dng"><h3 style="color:var(--bad)">Сброс попытки раунда</h3><p class="muted" style="margin:0;font-size:13px">Стирает ответы, время, результат и кубы ученика за выбранный раунд — второй шанс. Отменить нельзя.</p>' +
      (rounds.length ? '<label class="field">Раунд<select data-rr>' + rounds.map(function (r) { return '<option value="' + esc(r.roundId) + '">' + esc(r.season + ' · Round ' + r.roundNo + ' · ' + dmy(r.date)) + '</option>'; }).join('') + '</select></label><label class="field">Причина (в журнал)<input data-rw maxlength="300"></label><div><button class="btn sm dng" data-rb>Сбросить попытку</button></div>' : '<span class="muted">У группы нет раундов.</span>') + '</div>' +
      '<p class="err" role="alert"></p></div><div class="df"><button class="btn" data-x>Закрыть</button><button class="btn pri" data-save>Сохранить</button></div></aside>');
    document.body.appendChild(bg); document.body.appendChild(dr);
    var close = function () { bg.remove(); dr.remove(); if (prev && prev.focus) prev.focus(); };
    var er = dr.querySelector('.err');
    bg.onclick = close; dr.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = close; });
    dr.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    dr.querySelector('[data-f=name]').focus();
    dr.querySelector('[data-save]').onclick = function () {
      var x = {}; dr.querySelectorAll('[data-f]').forEach(function (i) { x[i.getAttribute('data-f')] = i.type === 'checkbox' ? i.checked : i.value; });
      api('admUserSave', { login: login, user: x }).then(function (r) { if (!r.ok) { er.textContent = errText(r.error); return; } toast(r.saved ? 'Сохранено' : 'Изменений нет'); close(); onChange(); });
    };
    dr.querySelector('[data-pw]').onclick = function () {
      confirmBox('Сбросить пароль?', u.name + ' получит временный пароль, все его входы закроются.', 'Сбросить', function () {
        api('admResetPw', { login: login }).then(function (r) { if (!r.ok) { er.textContent = errText(r.error); return; } pwModal(r.login, r.tempPassword); onChange(); });
      });
    };
    dr.querySelector('[data-cb]').onclick = function () {
      var n = Number(dr.querySelector('[data-cn]').value);
      if (!n) { er.textContent = 'Укажите число кубов.'; return; }
      api('cubesAdjust', { login: login, delta: n, note: dr.querySelector('[data-cw]').value }).then(function (r) { if (!r.ok) { er.textContent = errText(r.error); return; } toast('Готово. Баланс: ' + r.balance); close(); onChange(); });
    };
    var rb = dr.querySelector('[data-rb]');
    if (rb) rb.onclick = function () {
      var rid = dr.querySelector('[data-rr]').value, why = dr.querySelector('[data-rw]').value.trim();
      if (!why) { er.textContent = 'Укажите причину.'; return; }
      confirmBox('Сбросить попытку?', u.name + ' · ' + rid + '. Ответы и результат будут стёрты.', 'Стереть', function () {
        api('proctorReset', { roundId: rid, login: login, note: why }).then(function (r) { if (!r.ok) { er.textContent = errText(r.error); return; } toast('Попытка сброшена'); close(); onChange(); });
      }, true);
    };
  }

  // ---------- staff & roles ----------
  function viewStaff() {
    var body = shell('staff', 'Люди', 'Учителя и роли');
    api('admUsers').then(function (d) {
      if (!body.isConnected) return;
      if (!d.ok) return failBox(body, d, viewStaff);
      USERS = d;
      var staff = d.users.filter(function (u) { return u.role !== 'student'; }), groups = d.groups;
      BADGE.staff = staff.length;
      var html = '<div class="note">' + ic('swap') + '<div><b>Админ отделён от учителя.</b> Вход администратора открывает только эту панель. Учителя входят на главной странице и видят только отмеченные группы: открывают раунды, ведут монитор теста, сбрасывают пароли и начисляют кубы своим ученикам.</div></div>' +
        '<section class="card"><div class="card-h"><h2>Кто какие группы ведёт</h2><span class="muted" style="font-size:13px">отметьте группы и нажмите «Сохранить» в строке</span></div><div class="tbl-w"><table class="matrix"><thead><tr><th>Сотрудник</th><th>Роль</th>' +
        groups.map(function (g) { return '<th>' + gp(g) + '</th>'; }).join('') + '<th>Статус</th><th></th></tr></thead><tbody>' +
        staff.map(function (u) {
          var adm = u.role === 'admin';
          return '<tr data-s="' + esc(u.login) + '"><td class="who"><b>' + esc(u.name) + '</b><span class="mono">' + esc(u.login) + '</span></td>' +
            '<td><label class="sr" for="r_' + esc(u.login) + '">Роль</label><select id="r_' + esc(u.login) + '" data-role class="field" style="min-height:44px;border:1px solid var(--line);border-radius:8px;padding:0 8px"' + (u.login === S.user.login ? ' disabled' : '') + '><option value="teacher"' + (u.role === 'teacher' ? ' selected' : '') + '>Учитель</option><option value="admin"' + (adm ? ' selected' : '') + '>Администратор</option></select></td>' +
            groups.map(function (g) { return '<td>' + (adm ? '<span class="muted" title="Администратор видит все группы">все</span>' : '<input type="checkbox" data-g="' + esc(g) + '" aria-label="' + esc(u.name + ': ' + gl(g)) + '"' + (u.groups.indexOf(g) >= 0 ? ' checked' : '') + '>') + '</td>'; }).join('') +
            '<td>' + (!u.active ? st('отключён', 'mute') : u.activated ? st('входил', 'ok') : st('не входил', 'warn')) + '</td>' +
            '<td style="white-space:nowrap"><button class="btn sm" data-save>Сохранить</button> ' + (u.login === S.user.login ? '' : '<button class="btn sm" data-pw aria-label="Сбросить пароль: ' + esc(u.name) + '">' + ic('key') + '</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="err" role="alert"></p></section>' +
        '<div class="row">' + [['Администратор', 'shield', 'var(--navy)', ['Все разделы этой панели', 'Раунды, ученики, учителя, роли', 'Журнал и резервные копии', 'Отдельный вход: admin.html']],
          ['Учитель', 'users', 'var(--blue)', ['Свои группы: ученики и результаты', 'Открывает и закрывает свои раунды', 'Монитор теста, перекличка, сброс попытки', 'Пароли и кубы своих учеников']]].map(function (r) {
          return '<section class="card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="width:36px;height:36px;border-radius:10px;background:' + r[2] + ';color:#fff;display:grid;place-items:center">' + ic(r[1]) + '</span><h2>' + r[0] + '</h2></div>' +
            r[3].map(function (x) { return '<div style="display:flex;gap:8px;font-size:14px;color:var(--ink2);padding:3px 0">' + ic('check', 16) + esc(x) + '</div>'; }).join('') + '</section>';
        }).join('') + '</div>';
      body.innerHTML = html;
      var er = body.querySelector('.err');
      body.querySelectorAll('tr[data-s]').forEach(function (tr) {
        var login = tr.getAttribute('data-s');
        tr.querySelector('[data-save]').onclick = function () {
          var role = tr.querySelector('[data-role]').value, gs = [].map.call(tr.querySelectorAll('[data-g]:checked'), function (c) { return c.getAttribute('data-g'); });
          var x = { role: role }; if (role !== 'admin') x.groups = gs;
          if (login === S.user.login) delete x.role;
          api('admUserSave', { login: login, user: x }).then(function (r) { if (!r.ok) { er.textContent = errText(r.error); return; } toast(r.saved ? 'Сохранено' : 'Изменений нет'); viewStaff(); });
        };
        var pw = tr.querySelector('[data-pw]');
        if (pw) pw.onclick = function () {
          confirmBox('Сбросить пароль?', 'Сотрудник получит временный пароль, все его входы закроются.', 'Сбросить', function () {
            api('admResetPw', { login: login }).then(function (r) { if (!r.ok) { er.textContent = errText(r.error); return; } pwModal(r.login, r.tempPassword); viewStaff(); });
          });
        };
      });
    });
  }

  // ---------- rounds ----------
  var RD = null;
  function viewRounds() {
    var parts = location.hash.split('/'), sel = parts[1] || null, newGroup = parts[1] === 'new' ? (parts[2] || '') : null;
    var body = shell('rounds', 'Учёба', 'Раунды', '<button class="btn" data-up>' + ic('upload') + 'Загрузить раунд (.json)</button><input type="file" accept=".json,application/json" data-upfile hidden>' +
      '<a class="btn pri" href="#rounds/new">' + ic('plus') + 'Новый раунд</a>');
    var upf = $app.querySelector('[data-upfile]');
    $app.querySelector('[data-up]').onclick = function () { upf.click(); };
    upf.onchange = function () { var f = upf.files && upf.files[0]; upf.value = ''; if (f) pickRoundFile(f); };
    api('admRounds').then(function (d) {
      if (!body.isConnected) return;
      if (!d.ok) return failBox(body, d, viewRounds);
      RD = d;
      var byGrade = {};
      d.rounds.forEach(function (r) { var k = String(r.group).split('-')[0]; (byGrade[k] = byGrade[k] || []).push(r); });
      if (!sel) { var pend = d.rounds.filter(function (r) { return !r.closed; }); sel = (pend[pend.length - 1] || d.rounds[d.rounds.length - 1] || {}).round_id; }
      var status = function (r) { return r.closed ? st('закрыт', 'mute') : r.open ? st('тест открыт', 'ok') : r.online && r.variants < r.size ? st('варианты ' + r.variants + '/' + r.size, 'warn') : r.online ? st('ждёт открытия', 'info') : st('на бумаге', 'mute'); };
      var list = Object.keys(byGrade).sort(function (a, b) { return isNaN(a) - isNaN(b) || Number(b) - Number(a); }).map(function (k) {
        return '<div class="lsec">' + (isNaN(k) ? esc(k) : esc(k) + ' класс') + '</div>' + byGrade[k].slice().reverse().map(function (r) {
          return '<a class="rc" href="#rounds/' + esc(r.round_id) + '"' + (r.round_id === sel && newGroup === null ? ' aria-current="true"' : '') + ' style="text-decoration:none;color:inherit"><span class="t">' + esc(r.title || ('Round ' + r.round_no)) + status(r) + '</span><small>' + esc(r.round_id) + ' · ' + dmy(r.date) + ' · ' + esc(gl(r.group)) + '</small></a>';
        }).join('');
      }).join('');
      body.innerHTML = '<div class="split"><nav class="list" aria-label="Раунды">' + list + '<a class="rc" href="#rounds/new" style="text-align:center;color:var(--blue);font-weight:700;border-style:dashed;text-decoration:none"' + (newGroup !== null ? ' aria-current="true"' : '') + '>+ Новый раунд</a></nav><div class="grow" id="rform"></div></div>';
      var f = body.querySelector('#rform');
      if (newGroup !== null) roundForm(f, null, newGroup);
      else { var r = d.rounds.filter(function (x) { return x.round_id === sel; })[0]; if (r) roundForm(f, r); else f.innerHTML = '<div class="card empty">Раундов пока нет.</div>'; }
    });
  }
  function roundForm(box, r, newGroup) {
    var isNew = !r, last = RD.rounds.filter(function (x) { return x.scale_a !== ''; }).slice(-1)[0] || {};
    r = r || { round_id: '', season: RD.season, round_no: '', title: '', group: newGroup || '', date: '', online: true, open: false, closed: false, close_at: '', m1_minutes: 35, m2_minutes: 35, grace_seconds: 90, threshold: 14, scale_a: last.scale_a || '', scale_b: last.scale_b || '', show_results: true };
    var inp = function (k, label, type, extra) { return '<label class="field">' + label + '<input data-k="' + k + '" type="' + (type || 'text') + '" value="' + esc(r[k]) + '"' + (extra || '') + '></label>'; };
    var tog = function (k, label) { return '<label class="tog"><input type="checkbox" data-k="' + k + '"' + (r[k] ? ' checked' : '') + '>' + label + '</label>'; };
    var groups = RD.groups.concat(r.group && RD.groups.indexOf(r.group) < 0 ? [r.group] : []);
    var stats = isNew ? '' : '<div class="stats"><div><b>' + r.variants + ' / ' + r.size + '</b><small>вариантов у учеников</small></div><div><b>' + r.items + '</b><small>ключей модулей</small></div><div><b>' + r.sessions + '</b><small>начали M1</small></div><div><b>' + r.results + '</b><small>с результатом SAT</small></div></div>' +
      (r.online && r.variants < r.size ? '<div class="note warn">' + ic('alert') + '<div>У ' + (r.size - r.variants) + ' учеников группы нет варианта — они не смогут начать тест. Варианты загружаются файлом раунда (их готовлю я).</div></div>' : '') +
      (r.proctor ? '<div class="note">' + ic('eye') + '<div>Контроль теста включён (перекличка, код, пауза). Управление — в «Мониторе теста».</div></div>' : '');
    var quick = isNew ? '' : '<div class="tools" style="margin-bottom:6px">' + (r.online && !r.closed ? '<button class="btn sm ' + (r.open ? '' : 'gold') + '" data-q="open">' + ic(r.open ? 'lock' : 'play') + (r.open ? 'Закрыть тест' : 'Открыть тест') + '</button>' : '') +
      '<button class="btn sm" data-q="closed">' + ic(r.closed ? 'refresh' : 'check') + (r.closed ? 'Открыть раунд снова (скрыть разбор)' : 'Закрыть раунд: открыть разбор и игры') + '</button></div>';
    box.innerHTML = '<section class="card"><div class="card-h"><div><h2 class="disp" style="font-size:21px">' + (isNew ? 'Новый раунд' : esc(r.title || r.round_id)) + '</h2><span class="muted" style="font-size:13px">' + (isNew ? 'Варианты к нему загружаются отдельно' : esc(r.round_id) + ' · ' + esc(gl(r.group))) + '</span></div></div>' + quick + stats +
      '<div class="sect">Основное</div><div class="grid3">' + (isNew ? inp('round_id', 'ID раунда *', 'text', ' placeholder="S2R3-9a" maxlength="24" autocapitalize="off"') : '') + inp('title', 'Название', 'text', ' maxlength="80"') + inp('season', 'Сезон', 'text', ' maxlength="10"') + inp('round_no', 'Номер', 'number', ' min="1" max="99"') +
      '<label class="field">Группа *<select data-k="group">' + (isNew ? '<option value="">— выберите —</option>' : '') + groups.map(function (g) { return '<option value="' + esc(g) + '"' + (g === r.group ? ' selected' : '') + '>' + esc(gl(g)) + '</option>'; }).join('') + '</select></label>' +
      inp('date', 'Дата *', 'date') + '</div>' +
      '<div class="sect">Доступ</div><div class="grid3">' + tog('online', 'Онлайн на сайте') + tog('open', 'Тест открыт сейчас') + tog('closed', 'Раунд закрыт (разбор открыт)') + tog('show_results', 'Показывать результат сразу') + '</div>' +
      '<div class="grid3">' + inp('close_at', 'Авто-закрытие (необязательно)', 'datetime-local') + '</div>' +
      '<div class="sect">Время и маршрут</div><div class="grid3">' + inp('m1_minutes', 'M1, минут', 'number', ' min="5" max="180"') + inp('m2_minutes', 'M2, минут', 'number', ' min="5" max="180"') + inp('grace_seconds', 'Запас, секунд', 'number', ' min="0" max="600"') + inp('threshold', 'M1 ≥ … верных → M2 Hard', 'number', ' min="0" max="22"') + '</div>' +
      '<div class="sect">Шкала SAT = a + b·θ</div><div class="grid3">' + inp('scale_a', 'a', 'number', ' step="0.0001"') + inp('scale_b', 'b', 'number', ' step="0.0001"') + '</div>' +
      '<p class="err" role="alert"></p><div class="tools" style="justify-content:flex-end"><button class="btn pri" data-save>' + (isNew ? 'Создать раунд' : 'Сохранить') + '</button></div></section>';
    var ca = box.querySelector('[data-k=close_at]'); if (ca && r.close_at) { var dt = new Date(r.close_at); if (!isNaN(dt)) ca.value = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
    var er = box.querySelector('.err');
    var collect = function () {
      var x = {}; box.querySelectorAll('[data-k]').forEach(function (i) {
        var k = i.getAttribute('data-k'), v = i.type === 'checkbox' ? i.checked : i.value;
        if (k === 'close_at') v = v ? new Date(v).toISOString() : '';
        if (i.type === 'number' && v === '') return;
        x[k] = v;
      });
      if (!isNew) x.round_id = r.round_id;
      return x;
    };
    var save = function (x, msg) {
      api('admRoundSave', { round: x, create: isNew }).then(function (res) {
        if (!box.isConnected) return;
        if (!res.ok) { er.textContent = errText(res.error); return; }
        toast(isNew ? 'Раунд создан' : res.saved ? (msg || 'Сохранено') : 'Изменений нет');
        var to = '#rounds/' + (isNew ? x.round_id : r.round_id); if (location.hash !== to) location.hash = to; else viewRounds();
      });
    };
    box.querySelector('[data-save]').onclick = function () {
      var x = collect();
      if (!isNew && x.open && !r.open && r.variants < r.size) return confirmBox('Открыть тест?', 'У ' + (r.size - r.variants) + ' учеников нет варианта — они не смогут начать.', 'Открыть всё равно', function () { save(x); });
      save(x);
    };
    box.querySelectorAll('[data-q]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-q'), x = { round_id: r.round_id }; x[k] = !r[k];
        if (k === 'closed' && x.closed && r.open) x.open = false;
        var text = k === 'open' ? (x.open ? 'Ученики группы смогут начать тест.' : 'Новые старты будут закрыты. Кто уже пишет — допишет.') : (x.closed ? 'Ученики увидят ответы и разбор, откроются игры по этому раунду. Делайте после всех пересдач.' : 'Разбор снова скроется.');
        confirmBox(b.textContent, text, 'Да', function () { save(x); });
      };
    });
  }

  // ---------- round file upload: same flow as the main site (adminRound, then adminVariant per variant) ----------
  function pickRoundFile(file) {
    file.text().then(function (txt) {
      var d; try { d = JSON.parse(txt); } catch (e) { d = null; }
      if (!d || d.format !== 'rml-round-1' || !d.round || !d.round.round_id || !Array.isArray(d.variants)) { toast('Это не файл раунда: нужен .json формата rml-round-1.'); return; }
      if (!RD) { toast('Список раундов ещё загружается — попробуйте через секунду.'); return; }
      var rid = String(d.round.round_id), r = RD.rounds.filter(function (x) { return x.round_id === rid; })[0];
      var what = (r ? 'Раунд ' + rid + ' уже есть — его варианты будут заменены. ' : 'Будет создан раунд ' + rid + '. ') + 'Вариантов в файле: ' + d.variants.length + '.';
      if (r && (r.open || r.closed || Number(r.sessions) > 0 || Number(r.results) > 0)) {
        var why = [r.open ? 'тест открыт' : '', r.closed ? 'раунд закрыт, разбор открыт' : '', Number(r.sessions) > 0 ? 'начали M1: ' + r.sessions : '', Number(r.results) > 0 ? 'с результатом: ' + r.results : ''].filter(Boolean).join(', ');
        return confirmBox('Заменить варианты идущего раунда?', what + ' Сейчас: ' + why + '. Задания и ключи у этих учеников изменятся.', 'Заменить всё равно', function () { uploadRound(d); }, true);
      }
      confirmBox('Загрузить раунд?', what, 'Загрузить', function () { uploadRound(d); });
    });
  }
  function uploadRound(d) {
    var rid = String(d.round.round_id), total = d.variants.length, done = 0, busy = true;
    var m = modal('<h2 id="mt">Загрузка раунда ' + esc(rid) + '</h2><p data-p role="status">Настройки раунда…</p><p class="muted" style="font-size:13px">Не закрывайте вкладку до конца загрузки.</p>', '<button class="btn" data-x disabled>Закрыть</button>');
    // while uploading, Escape and a click on the backdrop must not close the progress dialog
    ['click', 'keydown'].forEach(function (t) {
      m.addEventListener(t, function (e) { if (busy && (t === 'click' ? e.target === m : e.key === 'Escape')) e.stopImmediatePropagation(); }, true);
    });
    var p = m.querySelector('[data-p]'), x = m.querySelector('[data-x]');
    x.onclick = m._close;
    var stop = function (text) { busy = false; p.textContent = text; x.disabled = false; x.focus(); };
    var next = function () {
      if (done >= total) { history.replaceState(null, '', '#rounds/' + rid); viewRounds(); return stop('Готово: раунд ' + rid + ', вариантов ' + total + '.'); }
      var v = d.variants[done];
      api('adminVariant', { roundId: rid, login: v.login, module: v.module, key: v.key, items: v.items }).then(function (res) {
        if (!res.ok) return stop('Остановлено на ' + done + ' из ' + total + ': ' + errText(res.error).replace(/\.?$/, '.') + ' Загрузите файл ещё раз.');
        done++; p.textContent = 'Варианты: ' + done + ' из ' + total; next();
      });
    };
    api('adminRound', { round: d.round, params: d.params }).then(function (res) {
      if (!res.ok) return stop('Раунд не сохранён: ' + errText(res.error).replace(/\.?$/, '.'));
      p.textContent = 'Варианты: 0 из ' + total; next();
    });
  }

  // ---------- log & backup ----------
  function viewLog() {
    var body = shell('log', 'Система', 'Журнал действий');
    api('admLog').then(function (d) {
      if (!body.isConnected) return;
      if (!d.ok) return failBox(body, d, viewLog);
      body.innerHTML = '<section class="card" style="padding:6px 8px"><div class="tbl-w"><table><thead><tr><th>Когда</th><th>Кто</th><th>Что</th><th>Детали</th></tr></thead><tbody>' +
        (d.log.map(function (x) { return '<tr><td style="white-space:nowrap">' + fmt(x.at) + '</td><td class="mono">' + esc(x.by) + '</td><td>' + esc(logLine(x)) + '</td><td class="muted" style="font-size:13px">' + esc(x.note || '') + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="empty">Пока пусто</td></tr>') +
        '</tbody></table></div><p class="muted" style="margin:10px 12px 4px;font-size:13px">Последние 30 дней: изменения в админ-панели и события мониторинга тестов.</p></section>';
    });
  }
  function viewBackup() {
    var body = shell('backup', 'Система', 'Резервные копии');
    body.innerHTML = '<section class="card"><h2>Скачать копию базы</h2><p class="muted">Все таблицы, кроме текстов задач, входов и счётчиков. Файл .json — храните его у себя (например, на Google Диске). Делайте копию после каждого раунда.</p><p class="err" role="alert"></p><button class="btn pri" data-b>' + ic('download') + 'Скачать копию</button><div data-out style="margin-top:14px"></div></section>';
    body.querySelector('[data-b]').onclick = function () {
      var b = this; b.disabled = true;
      api('backup').then(function (d) {
        b.disabled = false;
        if (!d.ok) { body.querySelector('.err').textContent = errText(d.error); return; }
        var name = 'rml-backup-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json';
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
        body.querySelector('[data-out]').innerHTML = '<div class="note">' + ic('check') + '<div>Сохранено: <b>' + esc(name) + '</b><br><span class="muted">' + Object.keys(d.tables).map(function (k) { return esc(k) + ' ' + d.tables[k].length; }).join(' · ') + '</span></div></div>';
      });
    };
  }

  route();
})();
