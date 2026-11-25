// Registan Math League — API server for Cloudflare Workers + D1.
// The business logic below (between "BEGIN Code.gs" and "END Code.gs") is the same Code.gs that ran on Google Apps Script;
// only storage is replaced: each request loads the rows it needs from D1 into memory, runs the logic synchronously,
// and writes all changes back in one atomic D1 batch.  Built by build/build_worker.py — edit the sources, not worker.js.

// ---------- SHA-256 (byte output identical to Apps Script Utilities.computeDigest: signed bytes) ----------
function sha256Bytes_(str) {
  var bytes = new TextEncoder().encode(str);
  var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,
    0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,
    0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,
    0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,
    0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var l = bytes.length, padded = Math.ceil((l + 9) / 64) * 64;
  var m = new Uint8Array(padded); m.set(bytes); m[l] = 0x80;
  var bits = l * 8; for (var i = 0; i < 4; i++) m[padded - 1 - i] = (bits >>> (8 * i)) & 0xff;
  var w = new Uint32Array(64);
  for (var off = 0; off < padded; off += 64) {
    for (var t = 0; t < 16; t++) w[t] = (m[off+4*t]<<24)|(m[off+4*t+1]<<16)|(m[off+4*t+2]<<8)|m[off+4*t+3];
    for (t = 16; t < 64; t++) {
      var x = w[t-15], y = w[t-2];
      var s0 = ((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3), s1 = ((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) | 0;
    }
    var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for (t = 0; t < 64; t++) {
      var S1 = ((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)), ch = (e&f)^(~e&g);
      var t1 = (h + S1 + ch + K[t] + w[t]) | 0;
      var S0 = ((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)), mj = (a&b)^(a&c)^(b&c);
      var t2 = (S0 + mj) | 0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0; H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
  }
  var out = [];
  H.forEach(function (v) { for (var k = 3; k >= 0; k--) { var by = (v >>> (8 * k)) & 0xff; out.push(by > 127 ? by - 256 : by); } });
  return out;
}

// fast path for sha_ (hex output), used 500× per password check: reuses buffers, ASCII without TextEncoder
var SHA_K_ = new Int32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,
  0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,
  0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,
  0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,
  0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
var SHA_W_ = new Int32Array(64), SHA_H_ = new Int32Array(8), SHA_M_ = new Uint8Array(1024), HEX_ = [];
for (var hx = 0; hx < 256; hx++) HEX_.push((hx < 16 ? '0' : '') + hx.toString(16));
function sha256Hex_(str) {
  var l = str.length, ascii = true;
  for (var i = 0; i < l; i++) if (str.charCodeAt(i) > 127) { ascii = false; break; }
  if (!ascii || l > 900) { var b = sha256Bytes_(str), o = ''; for (i = 0; i < 32; i++) o += HEX_[b[i] & 255]; return o; }
  var padded = Math.ceil((l + 9) / 64) * 64, m = SHA_M_, w = SHA_W_, K = SHA_K_, H = SHA_H_;
  for (i = 0; i < l; i++) m[i] = str.charCodeAt(i);
  m[l] = 0x80; for (i = l + 1; i < padded; i++) m[i] = 0;
  var bits = l * 8; m[padded - 1] = bits & 255; m[padded - 2] = (bits >>> 8) & 255; m[padded - 3] = (bits >>> 16) & 255; m[padded - 4] = (bits >>> 24) & 255;
  H[0]=0x6a09e667;H[1]=0xbb67ae85|0;H[2]=0x3c6ef372;H[3]=0xa54ff53a|0;H[4]=0x510e527f;H[5]=0x9b05688c|0;H[6]=0x1f83d9ab;H[7]=0x5be0cd19;
  for (var off = 0; off < padded; off += 64) {
    for (var t = 0; t < 16; t++) w[t] = (m[off+4*t]<<24)|(m[off+4*t+1]<<16)|(m[off+4*t+2]<<8)|m[off+4*t+3];
    for (t = 16; t < 64; t++) { var x = w[t-15], y = w[t-2];
      w[t] = (w[t-16] + (((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3)) + w[t-7] + (((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10))) | 0; }
    var a=H[0],bb=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for (t = 0; t < 64; t++) {
      var t1 = (h + (((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7))) + ((e&f)^(~e&g)) + K[t] + w[t]) | 0;
      var t2 = ((((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10))) + ((a&bb)^(a&c)^(bb&c))) | 0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=bb; bb=a; a=(t1+t2)|0;
    }
    H[0]=(H[0]+a)|0;H[1]=(H[1]+bb)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
  }
  var out = '';
  for (i = 0; i < 8; i++) { var v = H[i]; out += HEX_[(v >>> 24) & 255] + HEX_[(v >>> 16) & 255] + HEX_[(v >>> 8) & 255] + HEX_[v & 255]; }
  return out;
}

// ---------- values: stored as text/number in D1, read back the way Google Sheets returned them ----------
function coerce_(v) {
  if (typeof v !== 'string') return v === null || v === undefined ? '' : v;
  var s = v.trim();
  if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(s)) return Number(s);
  if (/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(s)) return new Date(s);
  if (/^(true|false)$/i.test(s)) return s.toUpperCase() === 'TRUE';
  return v;
}
function toDb_(v) {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
  if (v === true) return 'TRUE';
  if (v === false) return 'FALSE';
  if (typeof v === 'number') return isFinite(v) ? v : '';
  return String(v);
}

// ---------- per-request in-memory store (set right before the synchronous logic runs) ----------
var CUR = null;
function Need_(what) { this.need = what; }
function Store_() { this.t = {}; this.items = {}; this.ops = []; this.seq = 0; this.cache = {}; }
function needTable_(name) { if (!CUR.t[name]) throw new Need_({ table: name }); return CUR.t[name]; }

// Apps Script services used by Code.gs
var Utilities = {
  DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
  computeDigest: function (alg, s) { return sha256Bytes_(String(s)); },
  getUuid: function () { return crypto.randomUUID(); },
  formatDate: function (d) { return new Date(new Date(d).getTime() + 5 * 3600e3).toISOString().slice(0, 10); }  // Asia/Tashkent, UTC+5, no DST
};
var LockService = { getScriptLock: function () { return { waitLock: function () {}, tryLock: function () { return true; }, releaseLock: function () {} }; } };
var CacheService = { getScriptCache: function () { return {
  get: function (k) { var t = needTable_('Cache'), r = t.rows.filter(function (x) { return x.key === k; })[0];
    return r && Number(r.expires) > Date.now() ? String(r.value) : null; },
  put: function (k, v, sec) { var t = needTable_('Cache'), r = t.rows.filter(function (x) { return x.key === k; })[0];
    if (r) setCells_('Cache', r, { value: String(v), expires: Date.now() + (sec || 600) * 1000 });
    else append_('Cache', { key: k, value: String(v), expires: Date.now() + (sec || 600) * 1000 }); },
  remove: function (k) { var t = table_('Cache'), r = t.rows.filter(function (x) { return x.key === k; })[0]; if (r) t.sheet.deleteRow(r._row); }
}; } };
var ContentService = { MimeType: { JSON: 'json' }, createTextOutput: function (s) { return { setMimeType: function () { return this; }, getContent: function () { return s; } }; } };
var SpreadsheetApp = { getActiveSpreadsheet: function () { throw new Error('no_spreadsheet_in_worker'); }, getUi: function () { throw new Error('no_ui'); } };

// ===================== BEGIN Code.gs =====================
/**
 * Registon Math Portal — server (Google Apps Script, bound to the portal Google Sheet).
 * The site (Cloudflare Pages) calls this web app with POST {action, token, ...} as text/plain JSON.
 * Deploy: Execute as "Me", access "Anyone". Data lives only in this Sheet.
 */
var VERSION = '4.4.7';

// ---------- sheet schema ----------
var SCHEMA = {
  Settings: ['key', 'value'],
  Users:    ['login', 'name', 'cls', 'group', 'role', 'groups', 'salt', 'hash', 'must_change', 'active', 'note', 'goal'],
  Tokens:   ['token_hash', 'login', 'expires'],
  Rounds:   ['round_id', 'season', 'round_no', 'title', 'group', 'date', 'closed', 'close_at', 'scale_a', 'scale_b', 'threshold',
             'online', 'open', 'm1_minutes', 'm2_minutes', 'grace_seconds', 'show_results'],
  Params:   ['round_id', 'module', 'pos', 'diff', 'kind', 'domain', 'skill', 'b'],
  Results:  ['round_id', 'login', 'm1', 'route', 'm2', 'total', 'sat', 'theta', 'status', 'note'],
  Answers:  ['round_id', 'login', 'module', 'resp_json', 'key_json', 'correct'], // correct = 'YYN…' (Y right, N wrong/blank)
  Items:    ['id', 'round_id', 'login', 'module', 'pos', 'kind', 'html', 'opts_json', 'solution_html'], // id = round|login|module|pos2, rows in that order
  Keys:     ['round_id', 'login', 'module', 'key_json'],                                    // server only
  Sessions: ['round_id', 'login', 'module', 'started', 'deadline', 'submitted', 'answers_json', 'leaves', 'raw', 'route', 'correct'],
  Announcements: ['group', 'text', 'updated', 'author'],
  History:  ['login', 'season', 'round_no', 'label', 'pct', 'grade', 'points'],
  // v4: cubes (currency), hero, games, duels
  Cubes:    ['id', 'login', 'delta', 'reason', 'ref', 'at'],        // ledger; id is unique and makes every award idempotent
  Owned:    ['login', 'item', 'qty', 'at'],
  Heroes:   ['login', 'hero_json', 'updated'],
  Games:    ['id', 'login', 'kind', 'q_json', 'started', 'answers_json', 'done'],
  Duels:    ['id', 'a', 'b', 'grp', 'status', 'created', 'started', 'q_json', 'ended', 'winner', 'score_a', 'score_b'],
  DuelAnswers: ['duel_id', 'idx', 'login', 'answer', 'correct', 'at'],
  Presence: ['login', 'seen', 'place'],
  // v4.3: exam proctoring — roll call, start code, pause on leaving the page, reset of one attempt
  Proctor:  ['round_id', 'login', 'present', 'marked_by', 'marked_at', 'admitted', 'locked', 'locked_at', 'reason', 'leaves', 'seen', 'attempt', 'bad_codes'],
  ProctorLog: ['id', 'round_id', 'login', 'kind', 'at', 'by', 'note'],
  // v4.4: admin panel — every change made there is logged
  AdminLog: ['id', 'at', 'by', 'action', 'target', 'note']
};
var ROLES = { student: 1, teacher: 2, admin: 3 };
var HASH_ROUNDS = 500;
var TOKEN_DAYS = 30;
var MAX_FAILS = 6, LOCK_MIN = 10;

// ---------- entry points ----------
function doGet() { return out_({ ok: true, app: 'registon-math-portal', version: VERSION }); }

function doPost(e) {
  CACHE_ = {};
  var req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (x) { return out_({ ok: false, error: 'bad_request' }); }
  try {
    var res = route_(req) || {};
    res.ok = true;
    return out_(res);
  } catch (err) {
    if (err && err.code) return out_({ ok: false, error: err.code });
    console.error(err && err.stack || err);
    return out_({ ok: false, error: 'server_error' });
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function fail_(code) { var e = new Error(code); e.code = code; throw e; }

function route_(req) {
  var a = req.action;
  seedRand_(req._seed);
  if (a === 'login') return apiLogin_(req);
  if (a === 'ping') return { version: VERSION };
  var me = auth_(req.token);
  if (a === 'logout') return apiLogout_(req, me);
  if (a === 'changePassword') return apiChangePassword_(req, me);
  if (me.must_change) fail_('must_change_password');
  switch (a) {
    case 'dashboard': return apiDashboard_(req, me);
    case 'round': return apiRound_(req, me);
    case 'league': return apiLeague_(req, me);
    case 'students': return apiStudents_(req, me);
    case 'resetPassword': return apiResetPassword_(req, me);
    case 'setRound': return apiSetRound_(req, me);
    case 'testState': return apiTestState_(req, me);
    case 'testStart': return apiTestStart_(req, me);
    case 'testSave': return apiTestSave_(req, me);
    case 'testSubmit': return apiTestSubmit_(req, me);
    case 'mistakes': return apiMistakes_(req, me);
    case 'setGoal': return apiSetGoal_(req, me);
    case 'setAnnouncement': return apiSetAnnouncement_(req, me);
    case 'groupOverview': return apiGroupOverview_(req, me);
    case 'similar': return apiSimilar_(req, me);
    case 'similarCheck': return apiSimilarCheck_(req, me);
    case 'cubes': return apiCubes_(req, me);
    case 'hero': return apiHero_(req, me);
    case 'heroSave': return apiHeroSave_(req, me);
    case 'shopBuy': return apiShopBuy_(req, me);
    case 'heroes': return apiHeroes_(req, me);
    case 'games': return apiGames_(req, me);
    case 'fixNext': return apiFixNext_(req, me);
    case 'fixCheck': return apiFixCheck_(req, me);
    case 'blitzStart': return apiBlitzStart_(req, me);
    case 'blitzAnswer': return apiBlitzAnswer_(req, me);
    case 'blitzHint': return apiBlitzHint_(req, me);
    case 'duelLobby': return apiDuelLobby_(req, me);
    case 'duelInvite': return apiDuelInvite_(req, me);
    case 'duelRandom': return apiDuelRandom_(req, me);
    case 'duelRespond': return apiDuelRespond_(req, me);
    case 'duelCancel': return apiDuelCancel_(req, me);
    case 'duelState': return apiDuelState_(req, me);
    case 'duelAnswer': return apiDuelAnswer_(req, me);
    case 'cubesGroup': return apiCubesGroup_(req, me);
    case 'cubesAdjust': return apiCubesAdjust_(req, me);
    case 'proctorPing': return apiProctorPing_(req, me);
    case 'proctorBoard': return apiProctorBoard_(req, me);
    case 'proctorSet': return apiProctorSet_(req, me);
    case 'proctorCode': return apiProctorCode_(req, me);
    case 'proctorMark': return apiProctorMark_(req, me);
    case 'proctorUnlock': return apiProctorUnlock_(req, me);
    case 'proctorFinish': return apiProctorFinish_(req, me);
    case 'proctorReset': return apiProctorReset_(req, me);
    case 'admOverview': return apiAdmOverview_(req, me);
    case 'admUsers': return apiAdmUsers_(req, me);
    case 'admUserSave': return apiAdmUserSave_(req, me);
    case 'admResetPw': return apiAdmResetPw_(req, me);
    case 'admRounds': return apiAdmRounds_(req, me);
    case 'admRoundSave': return apiAdmRoundSave_(req, me);
    case 'admLog': return apiAdmLog_(req, me);
  }
  fail_('unknown_action');
}

// ---------- table helpers ----------
var CACHE_ = {};
function sheet_SHEETS_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
    sh.setFrozenRows(1);
  }
  return sh;
}
function table_SHEETS_(name) {
  if (CACHE_[name]) return CACHE_[name];
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var head = values.shift().map(function (h) { return String(h).trim(); });
  var rows = values.map(function (r, i) {
    var o = { _row: i + 2 };
    head.forEach(function (h, j) { o[h] = r[j]; });
    return o;
  }).filter(function (o) { return head.some(function (h) { return o[h] !== '' && o[h] !== null; }); });
  CACHE_[name] = { sheet: sh, head: head, rows: rows };
  return CACHE_[name];
}
function setCells_SHEETS_(name, rowObj, patch) {
  var t = table_(name);
  Object.keys(patch).forEach(function (k) {
    var c = t.head.indexOf(k);
    if (c < 0) fail_('schema_' + name + '_' + k);
    t.sheet.getRange(rowObj._row, c + 1).setValue(patch[k]);
    rowObj[k] = patch[k];
  });
}
function append_SHEETS_(name, obj) {
  var t = table_(name);
  t.sheet.appendRow(t.head.map(function (h) { return obj[h] === undefined ? '' : obj[h]; }));
  delete CACHE_[name];
}
function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE' || v === 1 || v === '1'; }
function num_(v) { return (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v); }
function setting_(key, dflt) {
  var r = table_('Settings').rows.filter(function (x) { return x.key === key; })[0];
  return r && r.value !== '' ? r.value : dflt;
}

// ---------- crypto ----------
function hex_(bytes) {
  return bytes.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}
function sha_SHEETS_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
function hashPw_(salt, pw) {
  var h = sha_(salt + ':' + pw);
  for (var i = 1; i < HASH_ROUNDS; i++) h = sha_(salt + h);
  return 'h' + h; // letter prefix: Sheets must never read it as a number
}
function newSalt_() { return 's' + randomToken_().slice(0, 16); }
function randomToken_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }
function tempPassword_() {
  var letters = 'abcdefghjkmnpqrstuvwxyz', digits = '23456789', u = randomToken_(), p = '';
  for (var i = 0; i < 4; i++) p += letters[parseInt(u.substr(i * 2, 2), 16) % letters.length];
  for (var j = 4; j < 8; j++) p += digits[parseInt(u.substr(j * 2, 2), 16) % digits.length];
  return p;
}
function constEq_(a, b) {
  if (a.length !== b.length) return false;
  var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// ---------- users & sessions ----------
function userByLogin_(login) {
  login = String(login || '').trim().toLowerCase();
  return table_('Users').rows.filter(function (u) { return String(u.login).toLowerCase() === login; })[0];
}
function publicUser_(u) {
  return { login: u.login, name: u.name, cls: u.cls, group: u.group, role: u.role || 'student',
           groups: groupsOf_(u), mustChange: bool_(u.must_change), goal: num_(u.goal) };
}
function groupsOf_(u) {
  if ((u.role || 'student') === 'student') return [String(u.group)];
  return String(u.groups || '').split(',').map(function (s) { return s.trim(); }).filter(String);
}
function auth_(token) {
  if (!token) fail_('auth_required');
  var th = 't' + sha_(String(token));
  var t = table_('Tokens').rows.filter(function (r) { return r.token_hash === th; })[0];
  if (!t || new Date(t.expires).getTime() < Date.now()) fail_('auth_expired');
  var u = userByLogin_(t.login);
  if (!u || !bool_(u.active)) fail_('auth_expired');
  u.must_change = bool_(u.must_change);
  u._tokenRow = t;
  return u;
}

function apiLogin_(req) {
  var login = String(req.login || '').trim().toLowerCase();
  var pw = String(req.password || '');
  if (!login || !pw) fail_('bad_credentials');
  var cache = CacheService.getScriptCache(), fk = 'fail:' + login;
  var fails = Number(cache.get(fk) || 0);
  if (fails >= MAX_FAILS) fail_('too_many_attempts');
  var u = userByLogin_(login);
  if (!u || !bool_(u.active) || !u.salt || !constEq_(hashPw_(u.salt, pw), String(u.hash))) {
    cache.put(fk, String(fails + 1), LOCK_MIN * 60);
    fail_('bad_credentials');
  }
  cache.remove(fk);
  var token = randomToken_();
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    // drop this user's expired tokens to keep the tab small
    var tt = table_('Tokens');
    for (var i = tt.rows.length - 1; i >= 0; i--) {
      var r = tt.rows[i];
      if (new Date(r.expires).getTime() < Date.now()) tt.sheet.deleteRow(r._row);
    }
    delete CACHE_.Tokens;
    append_('Tokens', { token_hash: 't' + sha_(token), login: u.login,
      expires: new Date(Date.now() + Number(setting_('token_days', TOKEN_DAYS)) * 864e5).toISOString() });
  } finally { lock.releaseLock(); }
  return { token: token, user: publicUser_(u) };
}

function apiLogout_(req, me) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { table_('Tokens').sheet.deleteRow(me._tokenRow._row); delete CACHE_.Tokens; }
  finally { lock.releaseLock(); }
  return {};
}

function apiChangePassword_(req, me) {
  var oldPw = String(req.oldPassword || ''), nw = String(req.newPassword || '');
  if (!constEq_(hashPw_(me.salt, oldPw), String(me.hash))) fail_('bad_old_password');
  var min = Number(setting_('min_password', 6));
  if (nw.length < min || nw === oldPw || nw.toLowerCase() === String(me.login).toLowerCase()) fail_('weak_password');
  var salt = newSalt_();
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { setCells_('Users', me, { salt: salt, hash: hashPw_(salt, nw), must_change: false }); }
  finally { lock.releaseLock(); }
  me.must_change = false;
  return { user: publicUser_(me) };
}

// ---------- access control ----------
function canSee_(me, target) {
  if (me.role === 'admin') return true;
  if (String(me.login) === String(target.login)) return true;
  if (me.role === 'teacher') return groupsOf_(me).indexOf(String(target.group)) >= 0;
  return false;
}
function targetUser_(me, login) {
  if (!login || login === me.login) return me;
  var u = userByLogin_(login);
  if (!u || !canSee_(me, u)) fail_('forbidden');
  return u;
}

// ---------- rounds & scoring ----------
function roundsFor_(group) {
  return table_('Rounds').rows.filter(function (r) { return String(r.group) === String(group) || r.group === 'all'; })
    .sort(function (a, b) { return String(a.season).localeCompare(String(b.season)) || Number(a.round_no) - Number(b.round_no); });
}
function reviewOpen_(r) {
  if (bool_(r.closed)) return true;
  if (r.close_at && !isNaN(new Date(r.close_at).getTime()) && Date.now() >= new Date(r.close_at).getTime()) return true;
  return false;
}
function resultOf_(roundId, login) {
  return table_('Results').rows.filter(function (x) { return x.round_id === roundId && String(x.login) === String(login); })[0];
}
function paramsOf_(roundId) {
  var p = {};
  table_('Params').rows.forEach(function (x) {
    if (x.round_id !== roundId) return;
    (p[x.module] = p[x.module] || [])[Number(x.pos) - 1] = x;
  });
  return p;
}
function answersOf_(login, roundId) {
  return table_('Answers').rows.filter(function (x) {
    return String(x.login) === String(login) && (!roundId || x.round_id === roundId);
  });
}

/** SPR answer check: integer / decimal (comma allowed) / fraction; "a or b" keys; tolerance 0.0005. */
function sprValue_(s) {
  s = String(s).trim().replace(',', '.').replace(/\s+/g, '');
  if (/^-?\d+\/\d+$/.test(s)) { var p = s.split('/'); return Number(p[1]) === 0 ? null : Number(p[0]) / Number(p[1]); }
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return Number(s);
  return null;
}
function gradeItem_(kind, key, resp) {
  if (resp === '' || resp === null || resp === undefined) return 0;
  if (kind === 'MC') return String(resp).trim().toUpperCase() === String(key).trim().toUpperCase() ? 1 : 0;
  var v = sprValue_(resp); if (v === null) return 0;
  return String(key).split(/\s+or\s+|;/).some(function (k) {
    var kv = sprValue_(k); return kv !== null && Math.abs(kv - v) <= 0.0005;
  }) ? 1 : 0;
}

/** IRT 3PL EAP: a = 1.2, c = 0.25 MC / 0 SPR, grid −5..5 step 0.02, N(0,1) prior. */
function eapTheta_(items) {
  var A = 1.2, best = { num: 0, den: 0 };
  for (var t = -5; t <= 5.0000001; t += 0.02) {
    var logL = -t * t / 2;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], c = it.kind === 'MC' ? 0.25 : 0;
      var p = c + (1 - c) / (1 + Math.exp(-A * (t - it.b)));
      logL += Math.log(it.correct ? p : 1 - p);
    }
    var w = Math.exp(logL);
    best.num += t * w; best.den += w;
  }
  return best.num / best.den;
}
function satFromTheta_(theta, a, b) {
  var s = Math.round((a + b * theta) / 10) * 10;
  return Math.max(200, Math.min(800, s));
}

// ---------- API: dashboard ----------
function apiDashboard_(req, me) {
  var u = targetUser_(me, req.login);
  var rounds = roundsFor_(u.group).map(function (r) {
    var res = resultOf_(r.round_id, u.login);
    return {
      roundId: r.round_id, season: r.season, roundNo: Number(r.round_no), title: r.title, date: fmtDate_(r.date),
      reviewOpen: reviewOpen_(r),
      result: res ? { m1: num_(res.m1), route: res.route, m2: num_(res.m2), total: num_(res.total),
                      sat: num_(res.sat), status: res.status, note: res.note } : null
    };
  });
  // domain / skill accuracy across all rounds with item data
  var dom = {}, skill = {};
  answersOf_(u.login).forEach(function (a) {
    var p = paramsOf_(a.round_id)[a.module] || [];
    String(a.correct).split('').forEach(function (ch, i) {
      var meta = p[i]; if (!meta) return;
      var d = dom[meta.domain] = dom[meta.domain] || { n: 0, c: 0 };
      var s = skill[meta.skill] = skill[meta.skill] || { n: 0, c: 0, domain: meta.domain };
      d.n++; s.n++; if (ch === 'Y') { d.c++; s.c++; }
    });
  });
  var history = table_('History').rows.filter(function (h) { return String(h.login) === String(u.login); })
    .map(function (h) { return { season: h.season, roundNo: Number(h.round_no), label: h.label, pct: num_(h.pct), grade: h.grade, points: num_(h.points) }; });
  var lg = leagueFor_(String(u.group), setting_('current_season', 'S2'), u.login);
  var mine = lg.rows.filter(function (x) { return x.me; })[0];
  return { user: publicUser_(u), viewer: publicUser_(me), rounds: rounds, domains: dom, skills: skill, history: history,
           goal: num_(u.goal), announcement: announcementFor_(u.group),
           league: { place: mine ? mine.place : null, size: lg.rows.length, avg: mine ? mine.avg : null } };
}
function fmtDate_(d) {
  if (!d) return '';
  var x = new Date(d); if (isNaN(x.getTime())) return String(d);
  return Utilities.formatDate(x, 'Asia/Tashkent', 'yyyy-MM-dd');
}

// ---------- API: round review ----------
function apiRound_(req, me) {
  var u = targetUser_(me, req.login);
  var r = table_('Rounds').rows.filter(function (x) { return x.round_id === req.roundId; })[0];
  if (!r || (String(r.group) !== String(u.group) && r.group !== 'all')) fail_('not_found');
  var open = reviewOpen_(r) || me.role !== 'student';
  var params = paramsOf_(r.round_id);
  var items = {};
  answersOf_(u.login, r.round_id).forEach(function (a) {
    itemsFor_(r.round_id, u.login, a.module).forEach(function (x) { items[a.module + '|' + Number(x.pos)] = x; });
  });
  var modules = answersOf_(u.login, r.round_id).map(function (a) {
    var resp = JSON.parse(a.resp_json || '[]'), keys = JSON.parse(a.key_json || '[]');
    var p = params[a.module] || [];
    return {
      module: a.module,
      items: resp.map(function (rv, i) {
        var meta = p[i] || {}, it = items[a.module + '|' + (i + 1)] || {};
        var o = { pos: i + 1, diff: meta.diff, kind: meta.kind, domain: meta.domain, skill: meta.skill,
                  resp: rv, correct: String(a.correct).charAt(i) === 'Y' };
        if (it.html) { o.html = it.html; o.opts = it.opts_json ? JSON.parse(it.opts_json) : null; }
        if (open) { o.key = keys[i]; if (it.solution_html) o.solution = it.solution_html; }
        return o;
      })
    };
  });
  var res = resultOf_(r.round_id, u.login);
  return { round: { roundId: r.round_id, season: r.season, roundNo: Number(r.round_no), title: r.title,
                    date: fmtDate_(r.date), reviewOpen: reviewOpen_(r), closeAt: r.close_at ? String(r.close_at) : '' },
           result: res ? { m1: num_(res.m1), route: res.route, m2: num_(res.m2), total: num_(res.total), sat: num_(res.sat), status: res.status } : null,
           keysShown: open, modules: modules, user: publicUser_(u) };
}

// ---------- API: league ----------
function apiLeague_(req, me) {
  var users = table_('Users').rows.filter(function (u) { return (u.role || 'student') === 'student' && bool_(u.active); });
  var grade = function (g) { return String(g).split('-')[0]; };
  var myGroups = me.role === 'admin' ? null : (me.role === 'teacher' ? groupsOf_(me) : [String(me.group)]);
  var grades = {};
  (myGroups || users.map(function (u) { return String(u.group); })).forEach(function (g) { grades[grade(g)] = true; });
  var groups = {};
  users.forEach(function (u) { if (grades[grade(u.group)]) (groups[u.group] = groups[u.group] || []).push(u); });
  var season = req.season || setting_('current_season', 'S2');
  var out = Object.keys(groups).sort().map(function (g) { return leagueFor_(g, season, me.login); });
  return { season: season, groups: out };
}

// ---------- API: teacher / admin ----------
function requireStaff_(me) { if (me.role !== 'teacher' && me.role !== 'admin') fail_('forbidden'); }

function apiStudents_(req, me) {
  requireStaff_(me);
  var list = table_('Users').rows.filter(function (u) {
    return (u.role || 'student') === 'student' && canSee_(me, u) && u.login !== me.login;
  }).map(function (u) {
    var sats = roundsFor_(u.group).map(function (r) { var x = resultOf_(r.round_id, u.login); return x ? num_(x.sat) : null; })
      .filter(function (s) { return s !== null; });
    return { login: u.login, name: u.name, cls: u.cls, group: u.group, active: bool_(u.active),
             activated: !!u.hash && !bool_(u.must_change),
             last: sats.length ? sats[sats.length - 1] : null,
             avg: sats.length ? Math.round(sats.reduce(function (a, b) { return a + b; }, 0) / sats.length) : null, played: sats.length };
  }).sort(function (a, b) { return String(a.group).localeCompare(String(b.group)) || String(a.name).localeCompare(String(b.name)); });
  var rounds = table_('Rounds').rows.filter(function (r) { return me.role === 'admin' || groupsOf_(me).indexOf(String(r.group)) >= 0; })
    .map(function (r) { return { roundId: r.round_id, group: r.group, season: r.season, roundNo: Number(r.round_no), title: r.title,
                                 date: fmtDate_(r.date), closed: bool_(r.closed), reviewOpen: reviewOpen_(r), closeAt: r.close_at ? String(r.close_at) : '',
                                 online: bool_(r.online), open: bool_(r.open) }; });
  return { students: list, rounds: rounds };
}

function apiResetPassword_(req, me) {
  requireStaff_(me);
  var u = userByLogin_(req.login);
  if (!u || !canSee_(me, u) || (u.role || 'student') !== 'student') fail_('forbidden');
  var pw = tempPassword_(), salt = newSalt_();
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    setCells_('Users', u, { salt: salt, hash: hashPw_(salt, pw), must_change: true });
    // sign the student out everywhere
    var tt = table_('Tokens');
    for (var i = tt.rows.length - 1; i >= 0; i--) if (String(tt.rows[i].login) === String(u.login)) tt.sheet.deleteRow(tt.rows[i]._row);
    delete CACHE_.Tokens;
  } finally { lock.releaseLock(); }
  return { login: u.login, tempPassword: pw };
}

function apiSetRound_(req, me) {
  requireStaff_(me);
  var r = table_('Rounds').rows.filter(function (x) { return x.round_id === req.roundId; })[0];
  if (!r) fail_('not_found');
  if (me.role !== 'admin' && groupsOf_(me).indexOf(String(r.group)) < 0) fail_('forbidden');
  var patch = {};
  if (req.closed !== undefined) patch.closed = !!req.closed;
  if (req.closeAt !== undefined) patch.close_at = req.closeAt || '';
  if (req.open !== undefined) patch.open = !!req.open;
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { setCells_('Rounds', r, patch); } finally { lock.releaseLock(); }
  return { roundId: r.round_id, closed: bool_(r.closed), reviewOpen: reviewOpen_(r), open: bool_(r.open) };
}

// ---------- Sheet menu (admin tools, run by the owner inside Google Sheets) ----------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Portal')
    .addItem('1. Create / check tabs', 'setupSheets')
    .addItem('3. Recompute results from answers', 'recomputeResults')
    .addItem('4. Import a round from the old ML platform…', 'importMlMenu')
    .addToUi();
}

function setupSheets() {
  Object.keys(SCHEMA).forEach(function (n) {
    var sh = sheet_(n), lastCol = Math.max(1, sh.getLastColumn ? sh.getLastColumn() : SCHEMA[n].length);
    var head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
    var empty = sh.getLastRow() <= 1;
    if (empty && head.join('|') !== SCHEMA[n].join('|')) {           // empty tab: write the current header
      sh.getRange(1, 1, 1, SCHEMA[n].length).setValues([SCHEMA[n]]);
      return;
    }
    var missing = SCHEMA[n].filter(function (h) { return head.indexOf(h) < 0; });
    var used = head.filter(String).length;
    if (missing.length) sh.getRange(1, used + 1, 1, missing.length).setValues([missing]);
  });
  delete CACHE_.Settings;
  var s = table_('Settings');
  [['current_season', 'S2'], ['token_days', TOKEN_DAYS], ['min_password', 6], ['title', 'Registon Math']].forEach(function (kv) {
    if (!s.rows.some(function (r) { return r.key === kv[0]; })) append_('Settings', { key: kv[0], value: kv[1] });
  });
}

var TRANSLIT_ = { 'а':'a','б':'b','в':'v','г':'g','ғ':'g','д':'d','е':'e','ё':'yo','ж':'j','з':'z','и':'i','й':'y','к':'k',
  'қ':'q','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ў':'o','ф':'f','х':'x','ҳ':'h','ц':'s',
  'ч':'ch','ш':'sh','щ':'sh','ъ':'','ы':'i','ь':'','э':'e','ю':'yu','я':'ya' };
function makeLogin_(name, taken) {
  var parts = String(name).trim().toLowerCase().split(/\s+/);
  var clean = function (s) {
    return s.split('').map(function (ch) { return TRANSLIT_[ch] !== undefined ? TRANSLIT_[ch] : ch; }).join('')
      .replace(/[^a-z]/g, '');
  };
  var base = clean(parts[0] || 'user') + (parts[1] ? '.' + clean(parts[1]) : '');
  var login = base, n = 2;
  while (taken[login]) login = base + n++;
  taken[login] = true;
  return login;
}

/** Recomputes Results (m1, route, m2, total, sat, theta) from Answers + Params + Rounds scale. */
function recomputeResults() {
  var rounds = {}; table_('Rounds').rows.forEach(function (r) { rounds[r.round_id] = r; });
  var by = {};
  table_('Answers').rows.forEach(function (a) { var k = a.round_id + '|' + a.login; (by[k] = by[k] || []).push(a); });
  var n = 0;
  Object.keys(by).forEach(function (k) {
    var parts = k.split('|'); if (resultFromAnswers_(rounds[parts[0]], parts[1], by[k])) n++;
  });
  return n;
}

/** Writes one student's Results row for one round from their Answers rows. */
function resultFromAnswers_(r, login, rows) {
  if (!r) return false;
  var rid = r.round_id;
  rows = rows || answersOf_(login, rid);
  {
    var p = paramsOf_(rid), m1 = null, m2 = null, route = '', items = [];
    rows.forEach(function (a) {
      var meta = p[a.module] || [], c = String(a.correct).split('');
      var raw = c.filter(function (x) { return x === 'Y'; }).length;
      if (a.module === 'M1') m1 = raw; else { m2 = raw; route = a.module === 'M2H' ? 'Hard' : 'Easy'; }
      c.forEach(function (x, i) { if (meta[i]) items.push({ kind: meta[i].kind, b: Number(meta[i].b), correct: x === 'Y' }); });
    });
    var patch = { m1: m1, route: route, m2: m2, total: m2 === null ? '' : m1 + m2 };
    if (m2 !== null && r.scale_a !== '' && r.scale_b !== '') {
      var th = eapTheta_(items);
      patch.theta = Math.round(th * 1000) / 1000;
      patch.sat = satFromTheta_(th, Number(r.scale_a), Number(r.scale_b));
      patch.status = 'written';
    } else { patch.sat = ''; patch.theta = ''; patch.status = 'partial'; }
    var res = resultOf_(rid, login);
    if (res) setCells_('Results', res, patch);
    else { patch.round_id = rid; patch.login = login; append_('Results', patch); }
  }
  return true;
}


// ======================================================================
// v2: league helper, announcements, goals, online weekly test, mistakes, group overview
// ======================================================================
function leagueFor_(g, season, meLogin) {
  var users = table_('Users').rows.filter(function (u) {
    return (u.role || 'student') === 'student' && bool_(u.active) && String(u.group) === String(g);
  });
  var rounds = roundsFor_(g).filter(function (r) { return String(r.season) === String(season); });
  var rows = users.map(function (u) {
    var sats = rounds.map(function (r) { var x = resultOf_(r.round_id, u.login); return x ? num_(x.sat) : null; });
    var got = sats.filter(function (s) { return s !== null; });
    return { name: u.name, cls: u.cls, me: String(u.login) === String(meLogin), sats: sats, played: got.length,
             avg: got.length ? Math.round(got.reduce(function (a, b) { return a + b; }, 0) / got.length) : null };
  }).sort(function (a, b) { return (b.avg === null ? -1 : b.avg) - (a.avg === null ? -1 : a.avg) || String(a.name).localeCompare(String(b.name)); });
  var place = 0; rows.forEach(function (r) { r.place = r.avg === null ? null : ++place; });
  return { group: g, rounds: rounds.map(function (r) { return { roundNo: Number(r.round_no), date: fmtDate_(r.date) }; }), rows: rows };
}

function announcementFor_(group) {
  var a = table_('Announcements').rows.filter(function (x) { return String(x.group) === String(group); })[0];
  return a && String(a.text).trim() ? { text: String(a.text), updated: fmtDate_(a.updated), author: a.author } : null;
}

function apiSetGoal_(req, me) {
  var g = Math.round(Number(req.goal) / 10) * 10;
  if (!(g >= 200 && g <= 800)) fail_('bad_goal');
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { setCells_('Users', me, { goal: g }); } finally { lock.releaseLock(); }
  return { goal: g };
}

function apiSetAnnouncement_(req, me) {
  requireStaff_(me);
  var g = String(req.group || '');
  if (me.role !== 'admin' && groupsOf_(me).indexOf(g) < 0) fail_('forbidden');
  var text = String(req.text || '').slice(0, 500);
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var a = table_('Announcements').rows.filter(function (x) { return String(x.group) === g; })[0];
    var patch = { text: text, updated: new Date().toISOString(), author: me.name };
    if (a) setCells_('Announcements', a, patch); else { patch.group = g; append_('Announcements', patch); }
  } finally { lock.releaseLock(); }
  return { announcement: text ? { text: text } : null };
}

// ---------- items & keys ----------
function pad2_(n) { return (n < 10 ? '0' : '') + n; }
/** The 22 question rows of one module, found by id (rows are stored in id order, so one block read). */
function itemsFor_SHEETS_(rid, login, module) {
  var sh = sheet_('Items');
  var cell = sh.getRange('A:A').createTextFinder(rid + '|' + login + '|' + module + '|01').matchEntireCell(true).findNext();
  if (!cell) return [];
  var head = SCHEMA.Items, v = sh.getRange(cell.getRow(), 1, 22, head.length).getValues(), out = [];
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][0]) !== rid + '|' + login + '|' + module + '|' + pad2_(i + 1)) break;
    var o = {}; head.forEach(function (h, j) { o[h] = v[i][j]; }); out.push(o);
  }
  return out;
}
function keysFor_(rid, login, module) {
  var k = table_('Keys').rows.filter(function (x) { return x.round_id === rid && String(x.login) === String(login) && x.module === module; })[0];
  if (!k) fail_('no_keys');
  return JSON.parse(k.key_json);
}

// ---------- online weekly test ----------
function roundById_(rid) { return table_('Rounds').rows.filter(function (x) { return x.round_id === rid; })[0]; }
function activeTestRound_(group) {
  var rs = roundsFor_(group).filter(function (r) { return bool_(r.online); });
  var open = rs.filter(function (r) { return bool_(r.open); });
  if (open.length) return open[open.length - 1];
  var pending = rs.filter(function (r) { return !bool_(r.closed); });
  return pending.length ? pending[pending.length - 1] : null;
}
function testCfg_(r) {
  return { m1: Number(r.m1_minutes) || 35, m2: Number(r.m2_minutes) || 35, grace: Number(r.grace_seconds) || 90,
           threshold: Number(r.threshold) || 14, show: r.show_results === '' || r.show_results === undefined ? true : bool_(r.show_results) };
}
function sessionOf_(rid, login, module) {
  return table_('Sessions').rows.filter(function (x) { return x.round_id === rid && String(x.login) === String(login) && x.module === module; })[0];
}
function m2Module_(rid, login) {
  var s1 = sessionOf_(rid, login, 'M1');
  return s1 && s1.submitted ? (s1.route === 'Hard' ? 'M2H' : 'M2E') : null;
}
function cleanAnswers_(a) {
  var o = {};
  Object.keys(a || {}).forEach(function (k) {
    var p = Number(k), v = String(a[k] == null ? '' : a[k]).trim().slice(0, 8);
    if (p >= 1 && p <= 22 && v) o[p] = v;
  });
  return o;
}
function requireStudentRound_(me, rid) {
  if ((me.role || 'student') !== 'student') fail_('students_only');
  var r = roundById_(rid);
  if (!r || !bool_(r.online) || (String(r.group) !== String(me.group) && r.group !== 'all')) fail_('not_found');
  return r;
}
function resolveModule_(r, login, which) {
  if (which === 'M1') return 'M1';
  var m = m2Module_(r.round_id, login); if (!m) fail_('finish_m1_first'); return m;
}

function finalize_(r, login, module, answers, leaves) {
  var cfg = testCfg_(r), s = sessionOf_(r.round_id, login, module);
  if (!s || s.submitted) return;
  var inTime = Date.now() <= Number(s.deadline) + cfg.grace * 1000;
  var patch = {};
  if (answers && inTime) patch.answers_json = JSON.stringify(cleanAnswers_(answers));
  if (leaves != null) patch.leaves = Math.max(Number(s.leaves || 0), Number(leaves || 0));
  var ans = JSON.parse(patch.answers_json || s.answers_json || '{}');
  var keys = keysFor_(r.round_id, login, module), P = paramsOf_(r.round_id)[module] || [];
  var resp = [], corr = '';
  for (var i = 0; i < 22; i++) {
    resp.push(ans[i + 1] || '');
    corr += gradeItem_((P[i] || {}).kind || (/^[ABCD]$/.test(keys[i]) ? 'MC' : 'SPR'), keys[i], ans[i + 1]) ? 'Y' : 'N';
  }
  patch.correct = corr; patch.raw = corr.split('Y').length - 1; patch.submitted = Date.now();
  if (module === 'M1') patch.route = patch.raw >= cfg.threshold ? 'Hard' : 'Easy';
  setCells_('Sessions', s, patch);
  // Answers row (what the review and the Mistakes page read)
  var row = answersOf_(login, r.round_id).filter(function (a) { return a.module === module; })[0];
  var arow = { resp_json: JSON.stringify(resp), key_json: JSON.stringify(keys), correct: corr };
  if (row) setCells_('Answers', row, arow);
  else { arow.round_id = r.round_id; arow.login = login; arow.module = module; append_('Answers', arow); }
  delete CACHE_.Answers;
  resultFromAnswers_(r, login);
  delete CACHE_.Results;
}

function finalizeExpiredFor_(r, login) {
  var cfg = testCfg_(r), now = Date.now(), todo = ['M1', 'M2E', 'M2H'].filter(function (m) {
    var s = sessionOf_(r.round_id, login, m);
    return s && !s.submitted && now > Number(s.deadline) + cfg.grace * 1000;
  });
  if (!todo.length) return;
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { todo.forEach(function (m) { finalize_(r, login, m, null, null); }); } finally { lock.releaseLock(); }
}

function testStateFor_(r, me) {
  var login = me.login, cfg = testCfg_(r);
  finalizeExpiredFor_(r, login);
  var s1 = sessionOf_(r.round_id, login, 'M1'), m2 = m2Module_(r.round_id, login), s2 = m2 ? sessionOf_(r.round_id, login, m2) : null;
  var done = !!(s1 && s1.submitted && s2 && s2.submitted);
  var out = {
    roundId: r.round_id, season: r.season, roundNo: Number(r.round_no), title: r.title, date: fmtDate_(r.date),
    open: bool_(r.open), closed: bool_(r.closed), m1Minutes: cfg.m1, m2Minutes: cfg.m2, threshold: cfg.threshold,
    m1: { started: !!s1, submitted: !!(s1 && s1.submitted), raw: s1 && s1.submitted ? Number(s1.raw) : null, route: s1 && s1.route || '' },
    m2: m2 ? { module: m2, started: !!s2, submitted: !!(s2 && s2.submitted) } : null,
    done: done, now: Date.now(), proctor: proctorPublic_(r, login)
  };
  if (done && cfg.show) {
    var res = resultOf_(r.round_id, login), P = paramsOf_(r.round_id), dom = {};
    answersOf_(login, r.round_id).forEach(function (a) {
      String(a.correct).split('').forEach(function (ch, i) {
        var d = ((P[a.module] || [])[i] || {}).domain || 'Other';
        dom[d] = dom[d] || { n: 0, c: 0 }; dom[d].n++; if (ch === 'Y') dom[d].c++;
      });
    });
    out.result = res ? { sat: num_(res.sat), m1: num_(res.m1), m2: num_(res.m2), route: res.route, domains: dom } : null;
  }
  return out;
}

function apiTestState_(req, me) {
  if ((me.role || 'student') !== 'student') return { test: null };
  var r = req.roundId ? requireStudentRound_(me, req.roundId) : activeTestRound_(me.group);
  return { test: r ? testStateFor_(r, me) : null };
}

function apiTestStart_(req, me) {
  var r = requireStudentRound_(me, req.roundId), cfg = testCfg_(r);
  if (!bool_(r.open)) fail_('test_closed');
  finalizeExpiredFor_(r, me.login);
  var module = resolveModule_(r, me.login, req.which);
  if (proctorOn_(r.round_id)) proctorGate_(r, me, req.code);
  var lock = LockService.getScriptLock(), s; lock.waitLock(20000);
  try {
    s = sessionOf_(r.round_id, me.login, module);
    if (s && s.submitted) fail_('already_submitted');
    if (!s) {
      var now = Date.now();
      append_('Sessions', { round_id: r.round_id, login: me.login, module: module, started: now,
        deadline: now + (module === 'M1' ? cfg.m1 : cfg.m2) * 60000, submitted: '', answers_json: '{}', leaves: 0 });
      delete CACHE_.Sessions;
      s = sessionOf_(r.round_id, me.login, module);
    }
  } finally { lock.releaseLock(); }
  var P = paramsOf_(r.round_id)[module] || [];
  var items = itemsFor_(r.round_id, me.login, module).map(function (x, i) {
    return { pos: Number(x.pos), kind: x.kind || (P[i] || {}).kind, html: x.html, opts: x.opts_json ? JSON.parse(x.opts_json) : [] };
  });
  if (items.length !== 22) fail_('no_items');
  var pr = proctorRow_(r.round_id, me.login, false);
  return { module: module, items: items, answers: JSON.parse(s.answers_json || '{}'), leaves: Number(s.leaves || 0),
           deadline: Number(s.deadline), now: Date.now(), roundNo: Number(r.round_no),
           attempt: pr ? Number(pr.attempt || 0) : 0, proctor: proctorOn_(r.round_id) };
}

function apiTestSave_(req, me) {
  var r = requireStudentRound_(me, req.roundId), cfg = testCfg_(r), module = resolveModule_(r, me.login, req.which);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = sessionOf_(r.round_id, me.login, module);
    if (!s) fail_('not_started');
    if (s.submitted) return { saved: false, submitted: true };
    if (Date.now() > Number(s.deadline) + cfg.grace * 1000) return { saved: false, late: true };
    if (proctorOn_(r.round_id)) {
      var pr = proctorRow_(r.round_id, me.login, true);
      if (staleAttempt_(pr, req)) return { saved: false, reset: true };
      noteLeaves_(r, pr, req.leaves, me.login);
      if (bool_(pr.locked)) return { saved: false, locked: true };
    }
    setCells_('Sessions', s, { answers_json: JSON.stringify(cleanAnswers_(req.answers)), leaves: Math.max(Number(s.leaves || 0), Number(req.leaves || 0)) });
  } finally { lock.releaseLock(); }
  return { saved: true, now: Date.now() };
}

function apiTestSubmit_(req, me) {
  var r = requireStudentRound_(me, req.roundId), module = resolveModule_(r, me.login, req.which);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { finalize_(r, me.login, module, req.answers, req.leaves); } finally { lock.releaseLock(); }
  CACHE_ = {};
  return { test: testStateFor_(roundById_(r.round_id), me) };
}

// ---------- v4.3: exam proctoring ----------
// Off unless a teacher turns it on for a round (Settings key "proctor:<round>" = "on"); off = the test behaves exactly as before.
var PROCTOR_ = { codeMin: 15, badCodes: 5 };
function proctorOn_(rid) { return String(setting_('proctor:' + rid, '')) === 'on'; }
function setSetting_(key, value) {
  var r = table_('Settings').rows.filter(function (x) { return x.key === key; })[0];
  if (r) setCells_('Settings', r, { value: value }); else append_('Settings', { key: key, value: value });
}
function proctorRow_(rid, login, create) {
  var find = function () { return table_('Proctor').rows.filter(function (x) { return x.round_id === rid && String(x.login) === String(login); })[0]; };
  var r = find();
  if (!r && create) {
    append_('Proctor', { round_id: rid, login: login, present: '', marked_by: '', marked_at: '', admitted: '', locked: '', locked_at: '', reason: '', leaves: 0, seen: '', attempt: 0, bad_codes: 0 });
    r = find();
  }
  return r;
}
function plog_(rid, login, kind, by, note) {
  var at = Date.now();
  append_('ProctorLog', { id: rid + '|' + login + '|' + kind + '|' + at + '|' + Math.floor(rand_() * 1e9), round_id: rid, login: login, kind: kind, at: at, by: by || '', note: String(note || '').slice(0, 300) });
}
function codeOf_(rid) { try { var c = JSON.parse(setting_('pcode:' + rid, '') || 'null'); return c && c.c ? c : null; } catch (e) { return null; } }
function runningModule_(r, login) {
  var cfg = testCfg_(r), now = Date.now(), m = null;
  ['M1', 'M2E', 'M2H'].forEach(function (k) { var s = sessionOf_(r.round_id, login, k); if (s && !s.submitted && now <= Number(s.deadline) + cfg.grace * 1000) m = k; });
  return m;
}
function proctorPublic_(r, login) {
  var p = proctorRow_(r.round_id, login, false), on = proctorOn_(r.round_id);
  var o = { on: on, attempt: p ? Number(p.attempt || 0) : 0 };
  if (on) { o.present = !!(p && bool_(p.present)); o.admitted = !!(p && bool_(p.admitted)); o.locked = !!(p && bool_(p.locked)); o.reason = p ? String(p.reason || '') : ''; }
  return o;
}
function proctorGate_(r, me, code) {
  var p = proctorRow_(r.round_id, me.login, false);
  if (!p || !bool_(p.present)) fail_('not_present');
  if (bool_(p.locked)) fail_('test_paused');
  if (bool_(p.admitted)) return;
  var c = codeOf_(r.round_id);
  if (!c || Date.now() > Number(c.until)) fail_('no_code');
  if (String(code || '').replace(/\D/g, '') !== String(c.c)) {
    var n = Number(p.bad_codes || 0) + 1, patch = { bad_codes: n };
    if (n >= PROCTOR_.badCodes) { patch.locked = true; patch.locked_at = Date.now(); patch.reason = 'code'; }
    setCells_('Proctor', p, patch); plog_(r.round_id, me.login, 'badcode', me.login, String(n));
    var e = new Error('bad_code'); e.code = n >= PROCTOR_.badCodes ? 'test_paused' : 'bad_code'; throw e;   // the counter is written (business error keeps writes)
  }
  setCells_('Proctor', p, { admitted: true, bad_codes: 0, seen: Date.now() });
  plog_(r.round_id, me.login, 'admit', me.login, '');
}
// a student's page was hidden: the browser reports how many times; a new one while a module is running pauses the test
function staleAttempt_(p, req) { return req.attempt !== undefined && req.attempt !== null && Number(req.attempt) !== Number(p.attempt || 0); }
function noteLeaves_(r, p, leaves, by) {
  var n = Number(leaves || 0);
  if (!(n > Number(p.leaves || 0))) return;
  var patch = { leaves: n };
  if (!bool_(p.locked) && runningModule_(r, p.login)) { patch.locked = true; patch.locked_at = Date.now(); patch.reason = 'left'; plog_(r.round_id, p.login, 'leave', by, String(n)); }
  setCells_('Proctor', p, patch);
}
function apiProctorPing_(req, me) {
  var r = requireStudentRound_(me, req.roundId);
  if (!proctorOn_(r.round_id)) return { on: false, locked: false };
  var p = proctorRow_(r.round_id, me.login, true), now = Date.now();
  if (staleAttempt_(p, req)) return { on: true, locked: false, reset: true, attempt: Number(p.attempt || 0) };   // a page left open from before a reset
  noteLeaves_(r, p, req.leaves, me.login);
  if (now - Number(p.seen || 0) > 8000) setCells_('Proctor', p, { seen: now });
  return { on: true, locked: bool_(p.locked), reason: String(p.reason || ''), running: !!runningModule_(r, me.login) };
}
// ---- staff side ----
function staffRound_(me, req) {
  requireStaff_(me);
  var r = req.roundId ? roundById_(String(req.roundId)) : activeTestRound_(String(req.group || ''));
  if (!r) fail_('not_found');
  if (me.role !== 'admin' && groupsOf_(me).indexOf(String(r.group)) < 0) fail_('forbidden');
  return r;
}
function roundStudents_(r) {
  return table_('Users').rows.filter(function (u) { return (u.role || 'student') === 'student' && bool_(u.active) && (r.group === 'all' || String(u.group) === String(r.group)); })
    .sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
}
function apiProctorBoard_(req, me) {
  var r = staffRound_(me, req), cfg = testCfg_(r), now = Date.now(), code = codeOf_(r.round_id);
  var counts = { present: 0, live: 0, paused: 0, done: 0 };
  var list = roundStudents_(r).map(function (u) {
    var p = proctorRow_(r.round_id, u.login, false) || {}, res = resultOf_(r.round_id, u.login), live = null, sl = 0, done = [];
    ['M1', 'M2E', 'M2H'].forEach(function (m) {
      var s = sessionOf_(r.round_id, u.login, m); if (!s) return;
      sl += Number(s.leaves || 0);
      if (s.submitted) done.push(m);
      else if (now <= Number(s.deadline) + cfg.grace * 1000) live = { module: m, answered: Object.keys(JSON.parse(s.answers_json || '{}')).length, left: Math.max(0, Math.round((Number(s.deadline) - now) / 1000)) };
    });
    var st = res && num_(res.sat) !== null ? 'done' : live ? 'live' : done.length ? 'between' : 'none';
    var o = { login: u.login, name: u.name, cls: u.cls, present: bool_(p.present), admitted: bool_(p.admitted), locked: bool_(p.locked), reason: String(p.reason || ''),
              lockedAt: num_(p.locked_at), leaves: Math.max(Number(p.leaves || 0), sl), seenAgo: num_(p.seen) ? Math.round((now - Number(p.seen)) / 1000) : null,
              attempt: Number(p.attempt || 0), status: st, live: live, done: done, sat: res ? num_(res.sat) : null };
    if (o.present) counts.present++; if (o.locked) counts.paused++; else if (st === 'live') counts.live++; if (st === 'done') counts.done++;
    return o;
  });
  var log = table_('ProctorLog').rows.filter(function (x) { return x.round_id === r.round_id; })
    .sort(function (a, b) { return Number(b.at) - Number(a.at); }).slice(0, 40)
    .map(function (x) { return { login: x.login, kind: x.kind, at: Number(x.at), by: x.by, note: x.note }; });
  return { round: { roundId: r.round_id, roundNo: Number(r.round_no), season: r.season, group: r.group, date: fmtDate_(r.date), online: bool_(r.online), open: bool_(r.open), closed: bool_(r.closed) },
           on: proctorOn_(r.round_id), code: code && now <= Number(code.until) ? { code: String(code.c), until: Number(code.until) } : null,
           counts: counts, size: list.length, students: list, log: log, now: now };
}
function apiProctorSet_(req, me) {
  var r = staffRound_(me, req), on = !!req.on;
  setSetting_('proctor:' + r.round_id, on ? 'on' : '');
  plog_(r.round_id, '', on ? 'on' : 'off', me.login, '');
  return { on: on };
}
function apiProctorCode_(req, me) {
  var r = staffRound_(me, req), c = String(1000 + Math.floor(rand_() * 9000)), until = Date.now() + PROCTOR_.codeMin * 60000;
  setSetting_('pcode:' + r.round_id, JSON.stringify({ c: c, until: until }));
  plog_(r.round_id, '', 'code', me.login, '');
  return { code: c, until: until };
}
function apiProctorMark_(req, me) {
  var r = staffRound_(me, req), present = !!req.present, ok = {};
  roundStudents_(r).forEach(function (u) { ok[u.login] = 1; });
  var logins = (Array.isArray(req.logins) ? req.logins : []).map(String).filter(function (l) { return ok[l]; });
  if (!logins.length) fail_('bad_request');
  logins.forEach(function (l) {
    var p = proctorRow_(r.round_id, l, true);
    if (bool_(p.present) === present) return;
    setCells_('Proctor', p, { present: present, marked_by: me.login, marked_at: Date.now() });
    plog_(r.round_id, l, present ? 'present' : 'absent', me.login, '');
  });
  return { marked: logins.length };
}
function targetProctor_(r, req) {
  var l = String(req.login || '');
  if (!roundStudents_(r).some(function (u) { return u.login === l; })) fail_('not_found');
  return proctorRow_(r.round_id, l, true);
}
function apiProctorUnlock_(req, me) {
  var r = staffRound_(me, req), p = targetProctor_(r, req);
  setCells_('Proctor', p, { locked: '', reason: '', bad_codes: 0 });
  plog_(r.round_id, p.login, 'unlock', me.login, '');
  return { unlocked: true };
}
function apiProctorFinish_(req, me) {        // submit the running module now with the answers saved so far; the pause stays
  var r = staffRound_(me, req), p = targetProctor_(r, req), m = runningModule_(r, p.login);
  if (!m) fail_('not_running');
  finalize_(r, p.login, m, null, null);
  if (!bool_(p.locked)) setCells_('Proctor', p, { locked: true, locked_at: Date.now(), reason: 'finished' });
  else setCells_('Proctor', p, { reason: 'finished' });
  plog_(r.round_id, p.login, 'finish', me.login, m);
  return { finished: m };
}
function apiProctorReset_(req, me) {          // erase this student's attempt at this round (answers, time, result, round cubes) — a second chance
  var r = staffRound_(me, req), p = targetProctor_(r, req), rid = r.round_id, l = p.login;
  var note = String(req.note || '').trim(); if (!note) fail_('reason_required');
  var del = function (name, pred) {
    var t = table_(name);
    t.rows.filter(pred).sort(function (a, b) { return b._row - a._row; }).forEach(function (row) { t.sheet.deleteRow(row._row); });
  };
  var mine = function (x) { return x.round_id === rid && String(x.login) === String(l); };
  del('Sessions', mine); del('Answers', mine); del('Results', mine);
  var ids = ['test:', 'streak:', 'grow:', 'goal:'].map(function (k) { return k + rid + ':' + l; });
  del('Cubes', function (x) { return ids.indexOf(String(x.id)) >= 0; });
  CACHE_ = {};
  setCells_('Proctor', p, { admitted: '', locked: '', locked_at: '', reason: '', leaves: 0, bad_codes: 0, attempt: Number(p.attempt || 0) + 1 });
  plog_(rid, l, 'reset', me.login, note);
  return { reset: true, attempt: Number(p.attempt) };
}

// ---------- v4.4: admin panel (admin.html, a separate "admin" login) ----------
function admOnly_(me) { if (me.role !== 'admin') fail_('forbidden'); }
function alog_(me, action, target, note) {
  var at = Date.now();
  append_('AdminLog', { id: at + '|' + Math.floor(rand_() * 1e9), at: at, by: me.login, action: action, target: String(target || ''), note: String(note || '').slice(0, 300) });
}
function isStudent_(u) { return (u.role || 'student') === 'student'; }
function activated_(u) { return !!u.hash && !bool_(u.must_change); }
function variantLogins_(rid) { var o = {}; table_('Keys').rows.forEach(function (k) { if (k.round_id === rid && k.module === 'M1') o[k.login] = 1; }); return o; }
function roundOut_(r) {
  var o = {}; SCHEMA.Rounds.forEach(function (h) { o[h] = r[h] instanceof Date ? fmtDate_(r[h]) : r[h]; });
  o.date = fmtDate_(r.date); o.closed = bool_(r.closed); o.online = bool_(r.online); o.open = bool_(r.open);
  o.show_results = r.show_results === '' ? true : bool_(r.show_results); o.close_at = r.close_at ? String(r.close_at) : '';
  return o;
}
function mergedLog_(n) {
  var a = table_('AdminLog').rows.map(function (x) { return { at: Number(x.at), by: x.by, kind: x.action, target: x.target, note: x.note, src: 'admin' }; });
  var p = table_('ProctorLog').rows.map(function (x) { return { at: Number(x.at), by: x.by, kind: 'pr.' + x.kind, target: x.login, note: x.kind === 'reset' ? x.note : '', round: x.round_id, src: 'proctor' }; });
  return a.concat(p).sort(function (x, y) { return y.at - x.at; }).slice(0, n);
}
function apiAdmOverview_(req, me) {
  admOnly_(me);
  var users = table_('Users').rows, studs = users.filter(function (u) { return isStudent_(u) && bool_(u.active); }), now = Date.now();
  var G = {};
  studs.forEach(function (u) { var g = G[u.group] = G[u.group] || { group: String(u.group), students: 0, activated: 0 }; g.students++; if (activated_(u)) g.activated++; });
  var groups = Object.keys(G).sort(function (a, b) { var x = a.split('-'), y = b.split('-'); return Number(y[0]) - Number(x[0]) || a.localeCompare(b); }).map(function (k) {
    var g = G[k], r = activeTestRound_(k);
    if (r) { var v = variantLogins_(r.round_id); g.next = { roundId: r.round_id, roundNo: Number(r.round_no), date: fmtDate_(r.date), open: bool_(r.open), online: bool_(r.online),
      variants: studs.filter(function (u) { return String(u.group) === k && v[u.login]; }).length, proctor: proctorOn_(r.round_id) }; }
    // latest round of the group with SAT results: distribution
    var done = roundsFor_(k).filter(function (x) { return table_('Results').rows.some(function (y) { return y.round_id === x.round_id && num_(y.sat) !== null; }); });
    var last = done[done.length - 1];
    if (last) {
      var sats = studs.filter(function (u) { return String(u.group) === k; }).map(function (u) { var x = resultOf_(last.round_id, u.login); return x ? num_(x.sat) : null; }).filter(function (v) { return v !== null; });
      g.last = { roundId: last.round_id, roundNo: Number(last.round_no), season: last.season, sats: sats, size: g.students, closed: bool_(last.closed) };
    }
    return g;
  });
  var staff = users.filter(function (u) { return !isStudent_(u); }).map(function (u) { return { login: u.login, name: u.name, role: u.role, groups: groupsOf_(u), activated: activated_(u), active: bool_(u.active) }; });
  var alerts = [];
  groups.forEach(function (g) {
    if (!g.next) { if (g.group !== 'test') alerts.push({ level: 'bad', kind: 'noRound', group: g.group, n: g.students }); }
    else if (g.next.online && g.next.variants < g.students) alerts.push({ level: 'warn', kind: 'variants', group: g.group, roundId: g.next.roundId, n: g.students - g.next.variants });
  });
  var never = studs.filter(function (u) { return !activated_(u); }).length;
  if (never) alerts.push({ level: 'warn', kind: 'neverIn', n: never });
  table_('Rounds').rows.forEach(function (r) {
    var d = new Date(r.date).getTime();
    if (!bool_(r.closed) && d && d < now - 86400000 && table_('Results').rows.some(function (y) { return y.round_id === r.round_id; }))
      alerts.push({ level: 'warn', kind: 'notClosed', roundId: r.round_id, group: String(r.group), roundNo: Number(r.round_no) });
  });
  staff.forEach(function (u) { if (u.active && !u.activated) alerts.push({ level: 'info', kind: 'staffNew', target: u.name }); });
  var cubes = table_('Cubes').rows.reduce(function (s, c) { return s + Math.max(0, Number(c.delta) || 0); }, 0);
  return { version: VERSION, now: now, season: setting_('current_season', 'S2'), totals: { students: studs.length, activated: studs.length - never, groups: groups.length, staff: staff.length, cubes: cubes, heroes: table_('Heroes').rows.length },
           groups: groups, staff: staff, alerts: alerts, log: mergedLog_(12) };
}
function apiAdmUsers_(req, me) {
  admOnly_(me);
  var bal = {}; table_('Cubes').rows.forEach(function (c) { bal[c.login] = (bal[c.login] || 0) + (Number(c.delta) || 0); });
  var rounds = table_('Rounds').rows.slice().sort(function (a, b) { return String(a.season).localeCompare(String(b.season)) || Number(a.round_no) - Number(b.round_no); });
  var list = table_('Users').rows.map(function (u) {
    var o = { login: u.login, name: u.name, cls: u.cls, group: String(u.group || ''), role: u.role || 'student', groups: groupsOf_(u), active: bool_(u.active), activated: activated_(u) };
    if (isStudent_(u)) {
      var sats = roundsFor_(u.group).map(function (r) { var x = resultOf_(r.round_id, u.login); return x && num_(x.sat) !== null ? { r: Number(r.round_no), s: r.season, sat: num_(x.sat) } : null; }).filter(Boolean);
      o.sats = sats; o.last = sats.length ? sats[sats.length - 1].sat : null; o.cubes = bal[u.login] || 0;
    }
    return o;
  }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  var groups = {}; table_('Users').rows.forEach(function (u) { if (isStudent_(u) && u.group) groups[u.group] = 1; });
  table_('Rounds').rows.forEach(function (r) { if (r.group && r.group !== 'all') groups[r.group] = 1; });
  return { users: list, groups: Object.keys(groups).sort(), rounds: rounds.map(function (r) { return { roundId: r.round_id, group: String(r.group), roundNo: Number(r.round_no), season: r.season, date: fmtDate_(r.date) }; }) };
}
function apiAdmUserSave_(req, me) {
  admOnly_(me);
  var u = userByLogin_(req.login); if (!u) fail_('not_found');
  var patch = {}, x = req.user || {}, notes = [];
  if (x.name !== undefined) { var nm = String(x.name).trim().slice(0, 80); if (!nm) fail_('bad_request'); patch.name = nm; }
  if (x.cls !== undefined) patch.cls = String(x.cls).trim().slice(0, 20);
  if (x.group !== undefined) { var g = String(x.group).trim(); if (g && !/^[a-z0-9]+(-[a-z0-9]+)?$/i.test(g)) fail_('bad_group'); patch.group = g; }
  if (x.role !== undefined) { if (!ROLES[x.role]) fail_('bad_request'); if (String(u.login) === String(me.login) && x.role !== 'admin') fail_('cannot_demote_self'); patch.role = x.role; }
  if (x.groups !== undefined) patch.groups = [].concat(x.groups).map(function (s) { return String(s).trim(); }).filter(function (s) { return /^[a-z0-9]+(-[a-z0-9]+)?$/i.test(s); }).join(',');
  if (x.active !== undefined) { if (String(u.login) === String(me.login) && !x.active) fail_('cannot_demote_self'); patch.active = !!x.active; }
  Object.keys(patch).forEach(function (k) { if (String(u[k]) !== String(patch[k])) notes.push(k + ': ' + String(u[k] === undefined ? '' : u[k]) + ' → ' + String(patch[k])); });
  if (!notes.length) return { saved: false };
  setCells_('Users', u, patch);
  if (patch.active === false) {                           // a disabled account is signed out everywhere
    var tt = table_('Tokens'); tt.rows.filter(function (t) { return String(t.login) === String(u.login); }).sort(function (a, b) { return b._row - a._row; }).forEach(function (t) { tt.sheet.deleteRow(t._row); });
  }
  alog_(me, 'user', u.login, notes.join('; '));
  return { saved: true };
}
function apiAdmResetPw_(req, me) {
  admOnly_(me);
  var u = userByLogin_(req.login); if (!u) fail_('not_found');
  if (String(u.login) === String(me.login)) fail_('use_change_password');
  var pw = tempPassword_(), salt = newSalt_();
  setCells_('Users', u, { salt: salt, hash: hashPw_(salt, pw), must_change: true });
  var tt = table_('Tokens'); tt.rows.filter(function (t) { return String(t.login) === String(u.login); }).sort(function (a, b) { return b._row - a._row; }).forEach(function (t) { tt.sheet.deleteRow(t._row); });
  alog_(me, 'password', u.login, '');
  return { login: u.login, tempPassword: pw };
}
function apiAdmRounds_(req, me) {
  admOnly_(me);
  var studs = table_('Users').rows.filter(function (u) { return isStudent_(u) && bool_(u.active); });
  var list = table_('Rounds').rows.map(function (r) {
    var o = roundOut_(r), v = variantLogins_(r.round_id), inG = studs.filter(function (u) { return r.group === 'all' || String(u.group) === String(r.group); });
    o.size = inG.length; o.variants = inG.filter(function (u) { return v[u.login]; }).length;
    o.items = table_('Keys').rows.filter(function (k) { return k.round_id === r.round_id; }).length;
    o.sessions = table_('Sessions').rows.filter(function (s) { return s.round_id === r.round_id && s.module === 'M1'; }).length;
    o.results = table_('Results').rows.filter(function (s) { return s.round_id === r.round_id && num_(s.sat) !== null; }).length;
    o.proctor = proctorOn_(r.round_id);
    return o;
  }).sort(function (a, b) { return String(a.season).localeCompare(String(b.season)) || Number(a.round_no) - Number(b.round_no) || String(a.group).localeCompare(String(b.group)); });
  var groups = {}; studs.forEach(function (u) { groups[u.group] = 1; });
  return { rounds: list, groups: Object.keys(groups).sort(), season: setting_('current_season', 'S2') };
}
function apiAdmRoundSave_(req, me) {
  admOnly_(me);
  var x = req.round || {}, rid = String(x.round_id || '').trim(), r = roundById_(rid), notes = [];
  if (!/^[A-Za-z0-9_-]{2,24}$/.test(rid)) fail_('bad_round_id');
  if (req.create && r) fail_('round_exists');
  if (!req.create && !r) fail_('not_found');
  var patch = {}, num = function (k, lo, hi) { if (x[k] === undefined) return; var v = Number(x[k]); if (!(v >= lo && v <= hi)) fail_('bad_' + k); patch[k] = v; };
  ['title', 'season'].forEach(function (k) { if (x[k] !== undefined) patch[k] = String(x[k]).trim().slice(0, 80); });
  if (x.group !== undefined) { var g = String(x.group).trim(); if (!/^[a-z0-9]+(-[a-z0-9]+)?$/i.test(g)) fail_('bad_group'); patch.group = g; }
  if (x.date !== undefined) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))) fail_('bad_date'); patch.date = String(x.date); }
  if (x.close_at !== undefined) { var ca = String(x.close_at || '').trim(); if (ca && isNaN(new Date(ca).getTime())) fail_('bad_close_at'); patch.close_at = ca; }
  num('round_no', 1, 99); num('m1_minutes', 5, 180); num('m2_minutes', 5, 180); num('grace_seconds', 0, 600); num('threshold', 0, 22); num('scale_a', 0, 2000); num('scale_b', 0, 1000);
  ['online', 'open', 'closed', 'show_results'].forEach(function (k) { if (x[k] !== undefined) patch[k] = !!x[k]; });
  if (req.create) {
    var row = { round_id: rid, season: setting_('current_season', 'S2'), round_no: 1, title: '', group: '', date: '', closed: false, close_at: '', scale_a: '', scale_b: '',
                threshold: 14, online: true, open: false, m1_minutes: 35, m2_minutes: 35, grace_seconds: 90, show_results: true };
    Object.keys(patch).forEach(function (k) { row[k] = patch[k]; });
    if (!row.group || !row.date) fail_('bad_request');
    append_('Rounds', row);
    alog_(me, 'roundNew', rid, row.group + ' · ' + row.date);
    return { created: rid };
  }
  Object.keys(patch).forEach(function (k) {
    var old = r[k] instanceof Date ? fmtDate_(r[k]) : (typeof r[k] === 'boolean' ? r[k] : r[k]);
    if (typeof patch[k] === 'boolean' ? bool_(old) !== patch[k] : String(old === undefined ? '' : old) !== String(patch[k])) notes.push(k + ': ' + String(old) + ' → ' + String(patch[k]));
    else delete patch[k];
  });
  if (!notes.length) return { saved: false };
  setCells_('Rounds', r, patch);
  alog_(me, 'round', rid, notes.join('; '));
  return { saved: true };
}
function apiAdmLog_(req, me) { admOnly_(me); return { log: mergedLog_(300) }; }

// ---------- mistakes (all wrong answers of a student) ----------
function apiMistakes_(req, me) {
  var u = targetUser_(me, req.login), staff = me.role !== 'student', out = [];
  var rounds = {}; roundsFor_(u.group).forEach(function (r) { rounds[r.round_id] = r; });
  answersOf_(u.login).forEach(function (a) {
    var r = rounds[a.round_id]; if (!r) return;
    var corr = String(a.correct), wrong = [];
    for (var i = 0; i < corr.length; i++) if (corr.charAt(i) !== 'Y') wrong.push(i);
    if (!wrong.length) return;
    var open = reviewOpen_(r) || staff, P = paramsOf_(a.round_id)[a.module] || [];
    var resp = JSON.parse(a.resp_json || '[]'), keys = JSON.parse(a.key_json || '[]'), items = {};
    itemsFor_(a.round_id, u.login, a.module).forEach(function (x) { items[Number(x.pos)] = x; });
    wrong.forEach(function (i) {
      var m = P[i] || {}, it = items[i + 1] || {};
      var o = { roundId: a.round_id, roundNo: Number(r.round_no), season: r.season, module: a.module, pos: i + 1,
                diff: m.diff, kind: m.kind, domain: m.domain, skill: m.skill, resp: resp[i] || '', reviewOpen: reviewOpen_(r) };
      if (it.html) { o.html = it.html; o.opts = it.opts_json ? JSON.parse(it.opts_json) : null; }
      if (open) { o.key = keys[i]; if (it.solution_html) o.solution = it.solution_html; }
      out.push(o);
    });
  });
  return { user: publicUser_(u), items: out };
}

// ---------- teacher: group overview ----------
function apiGroupOverview_(req, me) {
  requireStaff_(me);
  var g = String(req.group || groupsOf_(me)[0] || '');
  if (me.role !== 'admin' && groupsOf_(me).indexOf(g) < 0) fail_('forbidden');
  var students = table_('Users').rows.filter(function (u) { return (u.role || 'student') === 'student' && bool_(u.active) && String(u.group) === g; })
    .sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  var rounds = roundsFor_(g);
  var withRes = rounds.filter(function (r) { return students.some(function (u) { return resultOf_(r.round_id, u.login); }); });
  var cur = activeTestRound_(g) || withRes[withRes.length - 1] || rounds[rounds.length - 1] || null;
  var out = { group: g, announcement: announcementFor_(g), rounds: rounds.map(function (r) {
    return { roundId: r.round_id, roundNo: Number(r.round_no), date: fmtDate_(r.date), online: bool_(r.online), open: bool_(r.open), closed: bool_(r.closed) }; }) };
  if (!cur) return out;
  var cfg = testCfg_(cur), now = Date.now();
  var avg = function (r) {
    var s = students.map(function (u) { var x = resultOf_(r.round_id, u.login); return x ? num_(x.sat) : null; }).filter(function (v) { return v !== null; });
    return s.length ? Math.round(s.reduce(function (a, b) { return a + b; }, 0) / s.length) : null;
  };
  var idx = rounds.indexOf(cur), prev = null;
  for (var k = idx - 1; k >= 0; k--) if (avg(rounds[k]) !== null) { prev = rounds[k]; break; }
  var counts = { done: 0, live: 0, partial: 0, none: 0 };
  var list = students.map(function (u) {
    var res = resultOf_(cur.round_id, u.login), st = 'none', live = null, leaves = 0;
    ['M1', 'M2E', 'M2H'].forEach(function (m) {
      var s = sessionOf_(cur.round_id, u.login, m); if (!s) return;
      leaves += Number(s.leaves || 0);
      if (!s.submitted && now <= Number(s.deadline) + cfg.grace * 1000) {
        live = { module: m, answered: Object.keys(JSON.parse(s.answers_json || '{}')).length, left: Math.max(0, Math.round((Number(s.deadline) - now) / 1000)) };
      }
    });
    if (res && num_(res.sat) !== null) st = 'done';
    else if (live) st = 'live';
    else if (res || sessionOf_(cur.round_id, u.login, 'M1')) st = 'partial';
    counts[st]++;
    return { login: u.login, name: u.name, cls: u.cls, status: st, live: live, leaves: leaves,
             sat: res ? num_(res.sat) : null, m1: res ? num_(res.m1) : null, m2: res ? num_(res.m2) : null, route: res ? res.route : '' };
  });
  // item p-values for the current round, per module
  var pv = {}, P = paramsOf_(cur.round_id);
  students.forEach(function (u) {
    answersOf_(u.login, cur.round_id).forEach(function (a) {
      var arr = pv[a.module] = pv[a.module] || []; 
      String(a.correct).split('').forEach(function (ch, i) { arr[i] = arr[i] || { n: 0, c: 0 }; arr[i].n++; if (ch === 'Y') arr[i].c++; });
    });
  });
  Object.keys(pv).forEach(function (m) { pv[m] = pv[m].map(function (x, i) { var q = (P[m] || [])[i] || {}; return { pos: i + 1, n: x.n, c: x.c, skill: q.skill, diff: q.diff }; }); });
  // hardest skill this season
  var sk = {};
  rounds.filter(function (r) { return String(r.season) === String(cur.season); }).forEach(function (r) {
    var PP = paramsOf_(r.round_id);
    students.forEach(function (u) {
      answersOf_(u.login, r.round_id).forEach(function (a) {
        String(a.correct).split('').forEach(function (ch, i) {
          var q = (PP[a.module] || [])[i]; if (!q) return;
          var o = sk[q.skill] = sk[q.skill] || { n: 0, c: 0, domain: q.domain }; o.n++; if (ch === 'Y') o.c++;
        });
      });
    });
  });
  var hardest = Object.keys(sk).filter(function (k) { return sk[k].n >= 5; })
    .sort(function (a, b) { return sk[a].c / sk[a].n - sk[b].c / sk[b].n; })[0];
  out.current = { roundId: cur.round_id, roundNo: Number(cur.round_no), season: cur.season, date: fmtDate_(cur.date), online: bool_(cur.online),
                  open: bool_(cur.open), closed: bool_(cur.closed), reviewOpen: reviewOpen_(cur), counts: counts, size: students.length,
                  avg: avg(cur), prevAvg: prev ? avg(prev) : null, prevNo: prev ? Number(prev.round_no) : null };
  out.hardest = hardest ? { skill: hardest, domain: sk[hardest].domain, pct: Math.round(100 * sk[hardest].c / sk[hardest].n) } : null;
  out.students = list; out.pvalues = pv;
  return out;
}


// ======================================================================
// v2.1: import one round (content + results) from an old Math League platform spreadsheet
// ======================================================================
/** Menu: asks for the old sheet link, imports, shows a report. Safe to run again (rows are updated, not duplicated). */
function importMlMenu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Import from old ML platform', 'Paste the link (or ID) of the old platform spreadsheet:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var rep = importMlSheet(r.getResponseText());
  ui.alert(rep.text);
}

function mlNorm_(s) { return String(s || '').toLowerCase().replace(/[`'‘’ʻʼ‛´]/g, '').replace(/\s+/g, ' ').trim(); }
function mlRows_(ss, name) {
  var sh = ss.getSheetByName(name); if (!sh) return [];
  var v = sh.getDataRange().getValues(), head = v.shift().map(function (h) { return String(h).trim(); });
  return v.map(function (r) { var o = {}; head.forEach(function (h, j) { o[h] = r[j]; }); return o; })
          .filter(function (o) { return head.some(function (h) { return o[h] !== '' && o[h] !== null; }); });
}
function appendMany_SHEETS_(name, objs) {
  if (!objs.length) return;
  var t = table_(name), start = t.sheet.getLastRow() + 1;
  t.sheet.getRange(start, 1, objs.length, t.head.length)
    .setValues(objs.map(function (o) { return t.head.map(function (h) { return o[h] === undefined ? '' : o[h]; }); }));
  delete CACHE_[name];
}
function upsert_(name, match, obj, pending) {
  var row = table_(name).rows.filter(match)[0];
  if (row) { var patch = {}; Object.keys(obj).forEach(function (k) { if (String(row[k]) !== String(obj[k])) patch[k] = obj[k]; }); if (Object.keys(patch).length) setCells_(name, row, patch); }
  else pending.push(obj);
}

/** Imports the old sheet's current round into the portal. Matches students by name (or by an optional "login" column
 *  in the old Students tab). Returns { ok, text, matched, unmatched, results, mismatches }. */
function importMlSheet(idOrUrl, opts) {
  opts = opts || {};
  var id = (String(idOrUrl).match(/[-\w]{25,}/) || [])[0]; if (!id) fail_('bad_sheet_link');
  var old = SpreadsheetApp.openById(id);
  var S = {}; mlRows_(old, 'Settings').forEach(function (x) { S[String(x.key).trim()] = x.value; });
  var n = Number(S.round); if (!n) fail_('old_sheet_has_no_round');

  // 1) students: code -> login
  CACHE_ = {};
  var users = table_('Users').rows.filter(function (u) { return (u.role || 'student') === 'student'; });
  var byName = {}; users.forEach(function (u) { var k = mlNorm_(u.name); (byName[k] = byName[k] || []).push(u); });
  var map = {}, unmatched = [];
  mlRows_(old, 'Students').forEach(function (st) {
    var code = String(st.code).trim(); if (!code) return;
    if (st.login) { var u0 = users.filter(function (u) { return String(u.login) === String(st.login).trim(); })[0]; if (u0) { map[code] = u0; return; } }
    var w = mlNorm_(st.name).split(' '), hit = null;
    [2, 3, 1].some(function (k) {
      var c = byName[w.slice(0, k).join(' ')] || [];
      if (c.length > 1) c = c.filter(function (u) { return String(u.cls) === String(st['class']); });
      if (c.length === 1) { hit = c[0]; return true; } return false;
    });
    if (hit) map[code] = hit; else unmatched.push(code + ' ' + st.name);
  });
  var codes = Object.keys(map);
  if (!codes.length) return { ok: false, matched: 0, unmatched: unmatched, results: 0, mismatches: 0,
    text: 'No students matched — nothing imported. Unmatched: ' + unmatched.join(', ') };

  // 2) round row (season = current season, same round number, group of the matched students)
  var gc = {}; codes.forEach(function (c) { gc[map[c].group] = (gc[map[c].group] || 0) + 1; });
  var group = Object.keys(gc).sort(function (a, b) { return gc[b] - gc[a]; })[0];
  var season = String(setting_('current_season', 'S2'));
  var R = table_('Rounds').rows.filter(function (r) { return String(r.season) === season && Number(r.round_no) === n && String(r.group) === String(group); })[0];
  var scale = { scale_a: Number(S.sat_a), scale_b: Number(S.sat_b), threshold: Number(S.threshold) || 14 };
  if (!R) {
    var rid0 = season + 'R' + n, taken = table_('Rounds').rows.some(function (r) { return r.round_id === rid0; });
    var firstStart = mlRows_(old, 'Sessions').map(function (x) { return Number(x.started) || 0; }).filter(Boolean).sort()[0];
    append_('Rounds', { round_id: taken ? rid0 + '-' + group : rid0, season: season, round_no: n, title: (S.title ? String(S.title) + ' · ' : '') + 'Round ' + n,
      group: group, date: firstStart ? new Date(firstStart) : new Date(), closed: false, close_at: '', scale_a: scale.scale_a, scale_b: scale.scale_b,
      threshold: scale.threshold, online: false, open: false, m1_minutes: Number(S.m1_minutes) || 35, m2_minutes: Number(S.m2_minutes) || 35,
      grace_seconds: Number(S.grace_seconds) || 90, show_results: true });
    CACHE_ = {};
    R = table_('Rounds').rows.filter(function (r) { return String(r.season) === season && Number(r.round_no) === n && String(r.group) === String(group); })[0];
  } else setCells_('Rounds', R, scale);              // the old platform's scale is what students already saw
  var rid = R.round_id, mods = ['M1', 'M2E', 'M2H'], pad = function (k) { return (k < 10 ? '0' : '') + k; };

  // 3) content (only if the portal has none for this round yet)
  var oldParams = mlRows_(old, 'Params').filter(function (p) { return Number(p.round) === n; });
  if (!table_('Params').rows.some(function (p) { return p.round_id === rid; }))
    appendMany_('Params', oldParams.map(function (p) { return { round_id: rid, module: p.module, pos: Number(p.pos), diff: p.label,
      kind: bool_(p.spr) ? 'SPR' : 'MC', domain: p.domain, skill: p.skill, b: Number(p.b) }; }));
  var keys = {};
  mlRows_(old, 'Keys').forEach(function (k) { if (Number(k.round) !== n || !map[k.code]) return;
    ((keys[k.code] = keys[k.code] || {})[k.module] = keys[k.code][k.module] || [])[Number(k.pos) - 1] = String(k.answer); });
  var pendK = [];
  codes.forEach(function (c) { mods.forEach(function (m) { if (!keys[c] || !keys[c][m]) return;
    upsert_('Keys', function (x) { return x.round_id === rid && String(x.login) === String(map[c].login) && x.module === m; },
      { round_id: rid, login: map[c].login, module: m, key_json: JSON.stringify(keys[c][m]) }, pendK); }); });
  appendMany_('Keys', pendK);
  var haveItems = {}; table_('Items').rows.forEach(function (x) { if (x.round_id === rid) haveItems[x.login] = 1; });
  var items = mlRows_(old, 'Items').filter(function (x) { return Number(x.round) === n && map[x.code] && !haveItems[map[x.code].login]; });
  items.sort(function (a, b) { var la = map[a.code].login, lb = map[b.code].login;
    return la < lb ? -1 : la > lb ? 1 : mods.indexOf(a.module) - mods.indexOf(b.module) || Number(a.pos) - Number(b.pos); });
  appendMany_('Items', items.map(function (x) { var L = map[x.code].login; return { id: rid + '|' + L + '|' + x.module + '|' + pad(Number(x.pos)),
    round_id: rid, login: L, module: x.module, pos: Number(x.pos), kind: x.kind, html: x.html, opts_json: x.opts_json || '[]', solution_html: '' }; }));

  // 4) results: Sessions + Answers per module, regraded here; then Results
  CACHE_ = {};
  var P = paramsOf_(rid), pendS = [], pendA = [], mismatches = 0, done = {};
  var oldRes = {}; mlRows_(old, 'Results').forEach(function (x) { if (Number(x.round) === n) oldRes[x.code] = x; });
  mlRows_(old, 'Sessions').forEach(function (x) {
    if (Number(x.round) !== n || !map[x.code] || !x.submitted) return;
    var L = map[x.code].login, m = String(x.module), kk = (keys[x.code] || {})[m]; if (!kk) return;
    var ans = {}; try { ans = JSON.parse(x.answers_json || '{}'); } catch (e) {}
    var resp = [], corr = '';
    for (var i = 0; i < 22; i++) { var a = ans[i + 1] === undefined ? '' : String(ans[i + 1]); resp.push(a);
      corr += gradeItem_((P[m] && P[m][i] || {}).kind || (/^[ABCD]$/.test(kk[i]) ? 'MC' : 'SPR'), kk[i], a) ? 'Y' : 'N'; }
    if (String(x.correct).replace(/1/g, 'Y').replace(/0/g, 'N') !== corr) mismatches++;
    var raw = corr.split('Y').length - 1;
    upsert_('Sessions', function (y) { return y.round_id === rid && String(y.login) === L && y.module === m; },
      { round_id: rid, login: L, module: m, started: Number(x.started), deadline: Number(x.deadline), submitted: Number(x.submitted),
        answers_json: JSON.stringify(ans), leaves: Number(x.leaves) || 0, raw: raw, route: m === 'M1' ? (raw >= scale.threshold ? 'Hard' : 'Easy') : '', correct: corr }, pendS);
    upsert_('Answers', function (y) { return y.round_id === rid && String(y.login) === L && y.module === m; },
      { round_id: rid, login: L, module: m, resp_json: JSON.stringify(resp), key_json: JSON.stringify(kk), correct: corr }, pendA);
    done[x.code] = 1;
  });
  appendMany_('Sessions', pendS); appendMany_('Answers', pendA);
  CACHE_ = {};
  var satDiff = [];
  Object.keys(done).forEach(function (c) {
    resultFromAnswers_(R, map[c].login); delete CACHE_.Results;
    var mine = resultOf_(rid, map[c].login), o = oldRes[c];
    if (o && mine && String(o.sat) !== '' && Number(o.sat) !== Number(mine.sat)) satDiff.push(c + ' ' + o.sat + '→' + mine.sat);
  });
  CACHE_ = {};
  var text = 'Imported ' + rid + ' (' + group + '): ' + Object.keys(done).length + ' student(s) with results, ' + codes.length + ' matched, ' +
    items.length + ' question rows added.' + (unmatched.length ? '\nNot matched (skipped): ' + unmatched.join(', ') : '') +
    (mismatches ? '\nWarning: ' + mismatches + ' module(s) graded differently than the old platform.' : '') +
    (satDiff.length ? '\nWarning: SAT differs for ' + satDiff.join(', ') : '\nSAT scores match the old platform.') +
    '\nThe round stays NOT closed: students see answers after you close it on the Rounds page.';
  return { ok: true, roundId: rid, matched: codes.length, unmatched: unmatched, results: Object.keys(done).length, mismatches: mismatches, satDiff: satDiff, items: items.length, text: text };
}


// ---------- "solve a similar problem": the same question slot from another student's variant ----------
// Variants differ only in numbers/wording, so slot (module, pos) of another variant is a true twin of the question.
// Students get it only after the round's review is open; the other student is never revealed (opaque ref).
function similarRound_(req, me) {
  var r = roundById_(String(req.roundId || ''));
  if (!r) fail_('not_found');
  if ((me.role || 'student') === 'student') {
    if (!roundsFor_(me.group).some(function (x) { return x.round_id === r.round_id; })) fail_('not_found');
    if (!reviewOpen_(r)) fail_('review_locked');
  }
  var m = String(req.module || ''), pos = Number(req.pos);
  if (['M1', 'M2E', 'M2H'].indexOf(m) < 0 || !(pos >= 1 && pos <= 22)) fail_('bad_request');
  return { r: r, m: m, pos: pos };
}
function similarRef_(rid, login) { return sha_('sim|' + rid + '|' + login).slice(0, 12); }
function apiSimilar_(req, me) {
  var q = similarRound_(req, me), seen = [].concat(req.seen || []).map(String), self = String(req.login && me.role !== 'student' ? req.login : me.login);
  var cands = table_('Keys').rows.filter(function (k) { return k.round_id === q.r.round_id && k.module === q.m && String(k.login) !== self; })
    .map(function (k) { return String(k.login); }).filter(function (l) { return seen.indexOf(similarRef_(q.r.round_id, l)) < 0; });
  while (cands.length) {
    var i = Math.floor(Math.random() * cands.length), login = cands.splice(i, 1)[0];
    var it = itemsFor_(q.r.round_id, login, q.m)[q.pos - 1];
    if (!it || !it.html) continue;
    var meta = (paramsOf_(q.r.round_id)[q.m] || [])[q.pos - 1] || {};
    return { ref: similarRef_(q.r.round_id, login), html: it.html, opts: it.opts_json ? JSON.parse(it.opts_json) : [],
             kind: meta.kind || it.kind, skill: meta.skill || '', domain: meta.domain || '', left: cands.length };
  }
  fail_('no_similar');
}
function apiSimilarCheck_(req, me) {
  var q = similarRound_(req, me);
  var k = table_('Keys').rows.filter(function (x) { return x.round_id === q.r.round_id && x.module === q.m && similarRef_(q.r.round_id, String(x.login)) === String(req.ref); })[0];
  if (!k) fail_('not_found');
  var key = JSON.parse(k.key_json)[q.pos - 1], meta = (paramsOf_(q.r.round_id)[q.m] || [])[q.pos - 1] || {};
  var kind = meta.kind || (/^[ABCD]$/.test(key) ? 'MC' : 'SPR');
  var it = itemsFor_(q.r.round_id, String(k.login), q.m)[q.pos - 1] || {};
  var out = { correct: !!gradeItem_(kind, key, req.answer), key: key };
  if (it.solution_html) out.solution = it.solution_html;
  return out;
}

// =====================================================================================================
// v4: CUBES (currency), HERO (blocky avatar), SHOP, GAMES (fix a mistake, blitz) and 1-v-1 DUELS
// Everything below is new; the test flow above is not touched. Cubes for tests are computed from Results
// (idempotent ledger ids), so nothing changes in testSubmit.
// =====================================================================================================
var CUBE_ = { test: 20, streakStep: 5, streakCap: 25, grow: 1, goal: 50, fix: 3, blitz: 2, gameCap: 30,
              duelWin: 10, duelPlay: 3, duelsPerDay: 3, duelQ: 5, duelSec: 90, duelPause: 4, duelStart: 4,
              blitzQ: 5, blitzSec: 45, online: 30, invite: 60, lookPrice: 150 };
// item id -> [slot, price]; price 0 = free, 'ach:<rule>' = achievement only (cannot be bought)
var ITEMS_ = {
  'hat:none': ['hat', 0], 'hat:scarf:rose': ['hat', 0], 'hat:scarf:sky': ['hat', 0], 'hat:scarf:cream': ['hat', 0], 'hat:scarf:grey': ['hat', 0], 'hat:scarf:mint': ['hat', 0],
  'hat:doppi': ['hat', 40], 'hat:doppi_gul': ['hat', 40], 'hat:beanie': ['hat', 30], 'hat:phones': ['hat', 50],
  'hat:turban': ['hat', 60], 'hat:turban:amber': ['hat', 50], 'hat:turban:teal': ['hat', 50], 'hat:turban:crimson': ['hat', 50], 'hat:cap_q': ['hat', 50],
  'hat:scarf:indigo': ['hat', 50], 'hat:scarf:emerald': ['hat', 50], 'hat:crown': ['hat', 'ach:sat800'],
  'outfit:tee': ['outfit', 0], 'outfit:hoodie': ['outfit', 60], 'outfit:vest': ['outfit', 40], 'outfit:dress': ['outfit', 80], 'outfit:chapan': ['outfit', 80],
  'outfit:robe:blue': ['outfit', 70], 'outfit:robe:teal': ['outfit', 70], 'outfit:robe:amber': ['outfit', 70], 'outfit:robe:purple': ['outfit', 70],
  'outfit:robe:brown': ['outfit', 70], 'outfit:robe:indigo': ['outfit', 70], 'outfit:robe:emerald': ['outfit', 70],
  'item:none': ['item', 0], 'item:compass': ['item', 30], 'item:book': ['item', 30], 'item:astrolabe': ['item', 70], 'item:globe': ['item', 60], 'item:scroll': ['item', 50],
  'bg:grid': ['bg', 0], 'bg:registan': ['bg', 60], 'bg:stars': ['bg', 50], 'bg:sunset': ['bg', 40], 'bg:fire': ['bg', 'ach:streak10'],
  'frame:none': ['frame', 0], 'frame:gold': ['frame', 40], 'frame:neon': ['frame', 60],
  'hint:5050': ['hint', 15]
};
var LOOKS_ = {
  ulugbek: ['hat:turban', 'outfit:robe:blue', 'item:astrolabe'], ijliya: ['hat:scarf:indigo', 'outfit:robe:indigo', 'item:astrolabe'],
  khwarizmi: ['hat:turban:amber', 'outfit:chapan', 'item:book'], sutayta: ['hat:scarf:emerald', 'outfit:robe:emerald', 'item:scroll'],
  biruni: ['hat:turban:teal', 'outfit:robe:teal', 'item:globe'], kashi: ['hat:turban:amber', 'outfit:robe:amber', 'item:compass'],
  qushchi: ['hat:cap_q', 'outfit:robe:purple', 'item:astrolabe'], farghani: ['hat:turban:crimson', 'outfit:robe:brown', 'item:astrolabe']
};
var HERO_FREE_ = { skin: [1, 2, 3, 4], hair: ['short', 'curly', 'bob', 'long', 'braids', 'bun', 'pony', 'none'], hairc: ['black', 'brown', 'chestnut', 'dark'] };
var HERO_DEFAULT_ = { skin: 2, hair: 'short', hairc: 'black', hat: 'none', outfit: 'tee', item: 'none', bg: 'grid', frame: 'none' };

// seeded random: the Worker may re-run a request after loading more rows, and every run must make the same choices
var RAND_ = 1;
function seedRand_(seed) { RAND_ = (Number(seed) || Math.floor(Math.random() * 4294967295)) >>> 0; }
function rand_() { RAND_ = (RAND_ + 0x6D2B79F5) >>> 0; var t = RAND_; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function day_(ms) { return Utilities.formatDate(new Date(ms === undefined ? Date.now() : Number(ms)), 'Asia/Tashkent', 'yyyy-MM-dd'); }
function requireStudent_(me) { if ((me.role || 'student') !== 'student') fail_('students_only'); }
function cubesOf_(login) { return table_('Cubes').rows.filter(function (c) { return String(c.login) === String(login); }); }
function balanceOf_(login) { return cubesOf_(login).reduce(function (s, c) { return s + (Number(c.delta) || 0); }, 0); }
function hasCube_(id) { return table_('Cubes').rows.some(function (c) { return c.id === id; }); }
function award_(id, login, delta, reason, ref, at) {
  if (hasCube_(id)) return false;
  append_('Cubes', { id: id, login: login, delta: delta, reason: reason, ref: ref || '', at: at || Date.now() });
  return true;
}
function gameToday_(login) {
  var d = day_();
  return cubesOf_(login).filter(function (c) { return (c.reason === 'fix' || c.reason === 'blitz') && day_(c.at) === d; })
    .reduce(function (s, c) { return s + (Number(c.delta) || 0); }, 0);
}
function gameAward_(id, login, want, reason, ref) {          // games share a daily cap
  if (hasCube_(id)) return 0;
  var n = Math.max(0, Math.min(want, CUBE_.gameCap - gameToday_(login)));
  if (n > 0) award_(id, login, n, reason, ref);
  return n;
}

/** Awards for weekly tests, computed from Results (safe to run any number of times). */
function testFacts_(u) {
  var rounds = roundsFor_(u.group).filter(function (r) { return String(r.season) === 'S2'; });
  var out = [], streak = 0, maxStreak = 0, prev = null, best = null;
  rounds.forEach(function (r) {
    var anyone = table_('Results').rows.some(function (x) { return x.round_id === r.round_id && num_(x.sat) !== null; });
    if (!anyone) return;                                   // a round nobody has written yet does not break a streak
    var res = resultOf_(r.round_id, u.login), sat = res ? num_(res.sat) : null;
    if (sat === null) { streak = 0; return; }
    streak++; maxStreak = Math.max(maxStreak, streak);
    out.push({ r: r, sat: sat, streak: streak, prev: prev, best: best });
    prev = sat; best = best === null ? sat : Math.max(best, sat);
  });
  return { list: out, maxStreak: maxStreak, streak: streak, best: best };
}
function syncCubes_(u) {
  if ((u.role || 'student') !== 'student') return;
  var f = testFacts_(u), goal = num_(u.goal);
  f.list.forEach(function (x) {
    var rid = x.r.round_id, at = new Date(x.r.date || Date.now()).getTime() || Date.now(), tag = ':' + u.login;
    award_('test:' + rid + tag, u.login, CUBE_.test, 'test', rid, at);
    if (x.streak >= 2) award_('streak:' + rid + tag, u.login, Math.min(CUBE_.streakCap, CUBE_.streakStep * x.streak), 'streak', rid + '|' + x.streak, at);
    if (x.prev !== null && x.sat - x.prev >= 10) award_('grow:' + rid + tag, u.login, Math.floor((x.sat - x.prev) / 10) * CUBE_.grow, 'grow', rid + '|' + (x.sat - x.prev), at);
    if (goal && x.sat >= goal && (x.best === null || x.sat > x.best)) award_('goal:' + rid + tag, u.login, CUBE_.goal, 'goal', rid + '|' + goal, at);
  });
  return f;
}
function unlocked_(u, f) {
  f = f || testFacts_(u);
  return { sat800: f.best !== null && f.best >= 800, streak10: f.maxStreak >= 10 };
}
function ownedOf_(login) {
  var o = {}; table_('Owned').rows.forEach(function (x) { if (String(x.login) === String(login)) o[x.item] = Number(x.qty) || 1; }); return o;
}
function itemFree_(id) { return ITEMS_[id] && ITEMS_[id][1] === 0; }
function canWear_(u, id, owned, unl) {
  var it = ITEMS_[id]; if (!it) return false;
  if (it[1] === 0) return true;
  if (String(it[1]).indexOf('ach:') === 0) return !!unl[String(it[1]).slice(4)];
  return !!owned[id];
}
function heroOf_(login) {
  var r = table_('Heroes').rows.filter(function (x) { return String(x.login) === String(login); })[0];
  if (!r) return null;
  try { return JSON.parse(r.hero_json); } catch (e) { return null; }
}
function lookPrice_(key, owned) {
  var miss = LOOKS_[key].filter(function (id) { return !owned[id]; }).reduce(function (s, id) { return s + Number(ITEMS_[id][1]); }, 0);
  return Math.min(CUBE_.lookPrice, miss);
}
function wallet_(u) {
  var mine = cubesOf_(u.login).slice().sort(function (a, b) { return Number(b.at) - Number(a.at); });
  var month = day_().slice(0, 7);
  return { balance: mine.reduce(function (s, c) { return s + (Number(c.delta) || 0); }, 0),
           month: mine.filter(function (c) { return Number(c.delta) > 0 && day_(c.at).slice(0, 7) === month; }).reduce(function (s, c) { return s + Number(c.delta); }, 0),
           gameToday: gameToday_(u.login), gameCap: CUBE_.gameCap,
           ledger: mine.slice(0, 60).map(function (c) { return { delta: Number(c.delta), reason: c.reason, ref: String(c.ref || ''), at: Number(c.at) }; }) };
}

// ---------- API: wallet ----------
function apiCubes_(req, me) {
  var u = targetUser_(me, req.login);
  var f = syncCubes_(u) || testFacts_(u);
  var w = wallet_(u);
  // place by balance inside the student's group (after this student's own sync)
  var bal = {};
  table_('Cubes').rows.forEach(function (c) { bal[c.login] = (bal[c.login] || 0) + (Number(c.delta) || 0); });
  var mates = table_('Users').rows.filter(function (x) { return (x.role || 'student') === 'student' && bool_(x.active) && String(x.group) === String(u.group); });
  var place = 1 + mates.filter(function (x) { return (bal[x.login] || 0) > (bal[u.login] || 0); }).length;
  var duels = table_('Duels').rows.filter(function (d) { return d.status === 'done' && (d.a === u.login || d.b === u.login); });
  w.place = place; w.size = mates.length; w.streak = f.streak;
  w.duels = { win: duels.filter(function (d) { return d.winner === u.login; }).length, lose: duels.filter(function (d) { return d.winner && d.winner !== 'draw' && d.winner !== u.login; }).length };
  w.hero = heroOf_(u.login);
  w.rules = CUBE_;
  return w;
}

// ---------- API: hero & shop ----------
function apiHero_(req, me) {
  requireStudent_(me);
  var f = syncCubes_(me), owned = ownedOf_(me.login), unl = unlocked_(me, f);
  var looks = {}; Object.keys(LOOKS_).forEach(function (k) { looks[k] = { parts: LOOKS_[k], price: lookPrice_(k, owned) }; });
  return { hero: heroOf_(me.login), dflt: HERO_DEFAULT_, items: ITEMS_, looks: looks, owned: owned, unlocked: unl, balance: balanceOf_(me.login), free: HERO_FREE_ };
}
function cleanHero_(h, me, owned, unl) {
  h = h || {}; var o = {};
  o.skin = HERO_FREE_.skin.indexOf(Number(h.skin)) >= 0 ? Number(h.skin) : HERO_DEFAULT_.skin;
  o.hair = HERO_FREE_.hair.indexOf(h.hair) >= 0 ? h.hair : HERO_DEFAULT_.hair;
  o.hairc = HERO_FREE_.hairc.indexOf(h.hairc) >= 0 ? h.hairc : HERO_DEFAULT_.hairc;
  ['hat', 'outfit', 'item', 'bg', 'frame'].forEach(function (slot) {
    var id = slot + ':' + String(h[slot] || 'none');
    if (!ITEMS_[id] || ITEMS_[id][0] !== slot) id = slot + ':' + HERO_DEFAULT_[slot];
    if (!canWear_(me, id, owned, unl)) fail_('not_owned');
    o[slot] = id.slice(slot.length + 1);
  });
  return o;
}
function apiHeroSave_(req, me) {
  requireStudent_(me);
  var owned = ownedOf_(me.login), unl = unlocked_(me), hero = cleanHero_(req.hero, me, owned, unl);
  var r = table_('Heroes').rows.filter(function (x) { return String(x.login) === String(me.login); })[0];
  if (r) setCells_('Heroes', r, { hero_json: JSON.stringify(hero), updated: Date.now() });
  else append_('Heroes', { login: me.login, hero_json: JSON.stringify(hero), updated: Date.now() });
  return { hero: hero };
}
function apiShopBuy_(req, me) {
  requireStudent_(me);
  syncCubes_(me);
  var id = String(req.item || ''), owned = ownedOf_(me.login), bal = balanceOf_(me.login), now = Date.now(), price, give;
  if (id.indexOf('look:') === 0) {
    var k = id.slice(5); if (!LOOKS_[k]) fail_('not_found');
    give = LOOKS_[k].filter(function (x) { return !owned[x]; });
    if (!give.length) fail_('already_owned');
    price = lookPrice_(k, owned);
  } else {
    var it = ITEMS_[id]; if (!it) fail_('not_found');
    if (typeof it[1] !== 'number') fail_('achievement_only');
    if (it[1] === 0) fail_('free_item');
    if (owned[id] && it[0] !== 'hint') fail_('already_owned');
    price = it[1]; give = [id];
  }
  if (bal < price) fail_('not_enough_cubes');
  var n = table_('Cubes').rows.filter(function (c) { return String(c.login) === String(me.login) && c.reason === 'buy'; }).length;
  award_('buy:' + id + ':' + me.login + ':' + (n + 1), me.login, -price, 'buy', id, now);
  give.forEach(function (g) {
    var row = table_('Owned').rows.filter(function (x) { return String(x.login) === String(me.login) && x.item === g; })[0];
    if (row) setCells_('Owned', row, { qty: (Number(row.qty) || 0) + 1, at: now });
    else append_('Owned', { login: me.login, item: g, qty: 1, at: now });
  });
  return { item: id, price: price, balance: bal - price, owned: ownedOf_(me.login) };
}
/** Heroes of the students the viewer may see in the league (same grade), keyed by "name|cls". */
function apiHeroes_(req, me) {
  var grade = function (g) { return String(g).split('-')[0]; };
  var mine = me.role === 'admin' ? null : (me.role === 'teacher' ? groupsOf_(me) : [String(me.group)]).map(grade);
  var hs = {}; table_('Heroes').rows.forEach(function (x) { try { hs[x.login] = JSON.parse(x.hero_json); } catch (e) {} });
  var out = {};
  table_('Users').rows.forEach(function (u) {
    if ((u.role || 'student') !== 'student' || !hs[u.login]) return;
    if (mine && mine.indexOf(grade(u.group)) < 0) return;
    out[u.name + '|' + u.cls] = hs[u.login];
  });
  return { heroes: out };
}

// ---------- question pool for games and duels: twins of round questions (another student's variant) ----------
function weakSkills_(logins) {
  var w = {};
  table_('Answers').rows.forEach(function (a) {
    if (logins.indexOf(String(a.login)) < 0) return;
    var P = paramsOf_(a.round_id)[a.module] || [];
    String(a.correct).split('').forEach(function (ch, i) { if (ch !== 'Y' && P[i]) w[P[i].skill] = (w[P[i].skill] || 0) + 1; });
  });
  return w;
}
function poolQuestions_(group, players, n, mcOnly) {
  var rounds = roundsFor_(group).filter(reviewOpen_), weak = weakSkills_(players), cands = [];
  rounds.forEach(function (r) {
    var P = paramsOf_(r.round_id);
    Object.keys(P).forEach(function (m) {
      (P[m] || []).forEach(function (p, i) {
        if (!p || (mcOnly && p.kind !== 'MC')) return;
        cands.push({ r: r.round_id, m: m, p: i + 1, kind: p.kind, skill: p.skill, domain: p.domain, w: weak[p.skill] ? 3 : 1 });
      });
    });
  });
  var keys = table_('Keys').rows, out = [], usedSkill = {}, owner = {};
  // one variant per (round, module): at most a few question sets are read, and a twin never comes from a player's own variant
  while (out.length < n && cands.length) {
    var tot = cands.reduce(function (s, c) { return s + c.w * (usedSkill[c.skill] ? 0.3 : 1); }, 0), x = rand_() * tot, i = 0;
    for (; i < cands.length - 1; i++) { x -= cands[i].w * (usedSkill[cands[i].skill] ? 0.3 : 1); if (x <= 0) break; }
    var c = cands.splice(i, 1)[0];
    var om = c.r + '|' + c.m;
    if (owner[om] === undefined) {
      var owners = keys.filter(function (k) { return k.round_id === c.r && k.module === c.m && players.indexOf(String(k.login)) < 0; });
      owner[om] = owners.length ? owners[Math.floor(rand_() * owners.length)] : null;
    }
    var k = owner[om]; if (!k) continue;
    var it = itemsFor_(c.r, String(k.login), c.m)[c.p - 1];
    if (!it || !it.html) continue;
    var key = JSON.parse(k.key_json || '[]')[c.p - 1];
    if (key === undefined || key === '') continue;
    var opts = it.opts_json ? JSON.parse(it.opts_json) : [];
    if (c.kind === 'MC' && opts.length < 2) continue;
    usedSkill[c.skill] = true;
    out.push({ kind: c.kind, skill: c.skill, domain: c.domain, html: it.html, opts: opts, key: String(key) });
  }
  return out;
}
function publicQ_(q) { return { kind: q.kind, skill: q.skill, domain: q.domain, html: q.html, opts: q.kind === 'MC' ? q.opts : [] }; }

// ---------- API: games hub ----------
function myMistakes_(me) {
  var rounds = {}; roundsFor_(me.group).forEach(function (r) { if (reviewOpen_(r)) rounds[r.round_id] = r; });
  var out = [];
  answersOf_(me.login).forEach(function (a) {
    var r = rounds[a.round_id]; if (!r) return;
    var P = paramsOf_(a.round_id)[a.module] || [];
    String(a.correct).split('').forEach(function (ch, i) {
      if (ch === 'Y') return;
      var slot = a.round_id + '|' + a.module + '|' + (i + 1);
      if (hasCube_('fix:' + slot + ':' + me.login)) return;
      out.push({ roundId: a.round_id, roundNo: Number(r.round_no), module: a.module, pos: i + 1, skill: (P[i] || {}).skill || '', domain: (P[i] || {}).domain || '' });
    });
  });
  return out;
}
function duelsToday_(login) {
  var d = day_();
  return table_('Duels').rows.filter(function (x) { return (x.a === login || x.b === login) && (x.status === 'active' || x.status === 'done') && day_(x.started) === d; }).length;
}
function apiGames_(req, me) {
  requireStudent_(me);
  syncCubes_(me);
  var now = Date.now();
  var online = table_('Presence').rows.filter(function (p) { return p.login !== me.login && now - Number(p.seen) < CUBE_.online * 1000; })
    .filter(function (p) { var u = userByLogin_(p.login); return u && String(u.group) === String(me.group); }).length;
  var pool = roundsFor_(me.group).filter(reviewOpen_).some(function (r) { return table_('Keys').rows.some(function (k) { return k.round_id === r.round_id; }); });
  return { pool: pool, balance: balanceOf_(me.login), gameToday: gameToday_(me.login), gameCap: CUBE_.gameCap, mistakes: myMistakes_(me).length,
           duelsToday: duelsToday_(me.login), duelsPerDay: CUBE_.duelsPerDay, online: online, hints: ownedOf_(me.login)['hint:5050'] || 0, rules: CUBE_ };
}

// ---------- API: "fix a mistake" — a twin of one of your wrong answers; right answer = +3 once per mistake ----------
function apiFixNext_(req, me) {
  requireStudent_(me);
  var skip = [].concat(req.skip || []).map(String), list = myMistakes_(me).filter(function (x) { return skip.indexOf(x.roundId + '|' + x.module + '|' + x.pos) < 0; });
  if (!list.length) return { done: true, left: 0 };
  var w = weakSkills_([String(me.login)]);
  list.sort(function (a, b) { return (w[b.skill] || 0) - (w[a.skill] || 0) || b.roundNo - a.roundNo || a.pos - b.pos; });
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    try {
      var q = apiSimilar_({ roundId: s.roundId, module: s.module, pos: s.pos, seen: [] }, me);
      return { slot: s, q: q, left: list.length };
    } catch (e) { if (!e || e.code !== 'no_similar') throw e; }
  }
  return { done: true, left: 0 };
}
function apiFixCheck_(req, me) {
  requireStudent_(me);
  var c = apiSimilarCheck_(req, me), got = 0, slot = String(req.roundId) + '|' + String(req.module) + '|' + Number(req.pos);
  if (c.correct) {
    var mine = myMistakes_(me).some(function (x) { return x.roundId + '|' + x.module + '|' + x.pos === slot; });
    if (mine) {
      got = gameAward_('fix:' + slot + ':' + me.login, me.login, CUBE_.fix, 'fix', slot);
      c.capped = got === 0;
    }
  }
  c.got = got; c.balance = balanceOf_(me.login); c.gameToday = gameToday_(me.login);
  return c;
}

// ---------- API: blitz — 5 quick multiple-choice twins, 45 s each, +2 per right answer ----------
function gameOf_(id, me) {
  var g = table_('Games').rows.filter(function (x) { return x.id === String(id) && String(x.login) === String(me.login); })[0];
  if (!g) fail_('not_found');
  return g;
}
function apiBlitzStart_(req, me) {
  requireStudent_(me);
  var qs = poolQuestions_(me.group, [String(me.login)], CUBE_.blitzQ, true);
  if (qs.length < 3) fail_('no_questions');
  var id = 'b' + randomToken_().slice(0, 12), now = Date.now();
  append_('Games', { id: id, login: me.login, kind: 'blitz', q_json: JSON.stringify(qs), started: now, answers_json: '{}', done: '' });
  return { id: id, items: qs.map(publicQ_), sec: CUBE_.blitzSec, now: now, hints: ownedOf_(me.login)['hint:5050'] || 0,
           gameToday: gameToday_(me.login), gameCap: CUBE_.gameCap };
}
function apiBlitzAnswer_(req, me) {
  requireStudent_(me);
  var g = gameOf_(req.id, me), qs = JSON.parse(g.q_json), ans = JSON.parse(g.answers_json || '{}'), i = Number(req.idx);
  if (!(i >= 0 && i < qs.length)) fail_('bad_request');
  if (ans[i] !== undefined) fail_('already_answered');
  if (Date.now() > Number(g.started) + (qs.length * CUBE_.blitzSec + 60) * 1000) fail_('game_over');
  var q = qs[i], ok = !!gradeItem_(q.kind, q.key, req.answer), got = 0;
  ans[i] = { a: String(req.answer || ''), c: ok ? 'Y' : 'N' };
  if (ok) got = gameAward_('blitz:' + g.id + ':' + i, me.login, CUBE_.blitz, 'blitz', g.id);
  var done = Object.keys(ans).length >= qs.length;
  setCells_('Games', g, { answers_json: JSON.stringify(ans), done: done ? Date.now() : '' });
  return { correct: ok, key: q.key, got: got, done: done, right: Object.keys(ans).filter(function (k) { return ans[k].c === 'Y'; }).length,
           balance: balanceOf_(me.login), gameToday: gameToday_(me.login) };
}
function apiBlitzHint_(req, me) {
  requireStudent_(me);
  var g = gameOf_(req.id, me), qs = JSON.parse(g.q_json), i = Number(req.idx), q = qs[i];
  if (!q || q.kind !== 'MC') fail_('bad_request');
  var row = table_('Owned').rows.filter(function (x) { return String(x.login) === String(me.login) && x.item === 'hint:5050'; })[0];
  if (!row || Number(row.qty) < 1) fail_('no_hints');
  setCells_('Owned', row, { qty: Number(row.qty) - 1, at: Date.now() });
  var wrong = 'ABCD'.slice(0, q.opts.length).split('').filter(function (L) { return L !== String(q.key).toUpperCase(); });
  wrong.sort(function () { return rand_() - 0.5; });
  return { remove: wrong.slice(0, Math.max(0, q.opts.length - 2)), hints: Number(row.qty) };
}

// ---------- API: duels (1 v 1, same group; the bank pays; questions = twins from both players' weak topics) ----------
function seen_(me, place) {
  var r = table_('Presence').rows.filter(function (x) { return x.login === me.login; })[0], now = Date.now();
  if (r) { if (now - Number(r.seen) > 10000 || r.place !== place) setCells_('Presence', r, { seen: now, place: place }); }
  else append_('Presence', { login: me.login, seen: now, place: place });
}
function lastSat_(login, group) {
  var s = null; roundsFor_(group).forEach(function (r) { var x = resultOf_(r.round_id, login); if (x && num_(x.sat) !== null) s = num_(x.sat); }); return s;
}
function duelPublic_(d, me) {
  var other = d.a === me.login ? d.b : d.a, u = other ? userByLogin_(other) : null;
  return { id: d.id, status: d.status, mine: d.a === me.login, created: Number(d.created),
           other: u ? { name: u.name, cls: u.cls, hero: heroOf_(u.login), sat: lastSat_(u.login, u.group) } : null };
}
function liveDuel_(login) {
  var now = Date.now();
  return table_('Duels').rows.filter(function (d) {
    if (d.a !== login && d.b !== login) return false;
    if (d.status === 'active') return now < Number(d.started) + (CUBE_.duelQ * (CUBE_.duelSec + CUBE_.duelPause) + 30) * 1000;
    return false;
  })[0];
}
function openInvites_(login) {
  var now = Date.now();
  return table_('Duels').rows.filter(function (d) { return (d.status === 'invite' || d.status === 'queue') && now - Number(d.created) < CUBE_.invite * 1000 && (d.a === login || d.b === login); });
}
function apiDuelLobby_(req, me) {
  requireStudent_(me);
  seen_(me, 'lobby');
  var now = Date.now(), busy = {};
  table_('Duels').rows.forEach(function (d) { if (d.status === 'active' && now < Number(d.started) + 600000) { busy[d.a] = 1; busy[d.b] = 1; } });
  var mySat = lastSat_(me.login, me.group), weakMe = weakSkills_([String(me.login)]);
  var online = table_('Presence').rows.filter(function (p) { return p.login !== me.login && now - Number(p.seen) < CUBE_.online * 1000; }).map(function (p) {
    var u = userByLogin_(p.login);
    if (!u || (u.role || 'student') !== 'student' || String(u.group) !== String(me.group)) return null;
    var w = weakSkills_([String(u.login)]), common = Object.keys(w).filter(function (k) { return weakMe[k]; }).sort(function (a, b) { return (w[b] + weakMe[b]) - (w[a] + weakMe[a]); }).slice(0, 2);
    return { login: u.login, name: u.name, cls: u.cls, sat: lastSat_(u.login, u.group), hero: heroOf_(u.login), busy: !!busy[u.login] || p.place === 'duel', topics: common };
  }).filter(Boolean).sort(function (a, b) { return Math.abs((a.sat || 0) - (mySat || 0)) - Math.abs((b.sat || 0) - (mySat || 0)); });
  var live = liveDuel_(me.login), inv = openInvites_(me.login);
  return { online: online, active: live ? live.id : null,
           incoming: inv.filter(function (d) { return d.status === 'invite' && d.b === me.login; }).map(function (d) { return duelPublic_(d, me); }),
           outgoing: inv.filter(function (d) { return d.a === me.login; }).map(function (d) { return duelPublic_(d, me); }),
           duelsToday: duelsToday_(me.login), duelsPerDay: CUBE_.duelsPerDay, rules: CUBE_ };
}
function startDuel_(d) {
  var qs = poolQuestions_(d.grp, [String(d.a), String(d.b)], CUBE_.duelQ, false);
  if (qs.length < 3) fail_('no_questions');
  setCells_('Duels', d, { status: 'active', started: Date.now() + CUBE_.duelStart * 1000, q_json: JSON.stringify(qs) });
}
function canDuel_(login) {
  if (liveDuel_(login)) fail_('duel_busy');
  if (duelsToday_(login) >= CUBE_.duelsPerDay) fail_('duel_limit');
}
function apiDuelInvite_(req, me) {
  requireStudent_(me);
  var u = userByLogin_(req.login);
  if (!u || u.login === me.login || (u.role || 'student') !== 'student' || String(u.group) !== String(me.group)) fail_('forbidden');
  canDuel_(me.login); canDuel_(u.login);
  openInvites_(me.login).forEach(function (d) { if (d.a === me.login) setCells_('Duels', d, { status: 'cancelled' }); });
  var id = 'd' + randomToken_().slice(0, 12);
  append_('Duels', { id: id, a: me.login, b: u.login, grp: me.group, status: 'invite', created: Date.now(), started: '', q_json: '', ended: '', winner: '', score_a: '', score_b: '' });
  return { id: id };
}
function apiDuelRandom_(req, me) {
  requireStudent_(me);
  canDuel_(me.login);
  var now = Date.now(), mySat = lastSat_(me.login, me.group) || 0;
  var q = table_('Duels').rows.filter(function (d) { return d.status === 'queue' && d.a !== me.login && String(d.grp) === String(me.group) && now - Number(d.created) < CUBE_.invite * 1000; })
    .filter(function (d) { return !liveDuel_(d.a) && duelsToday_(d.a) < CUBE_.duelsPerDay; })
    .sort(function (a, b) { return Math.abs((lastSat_(a.a, me.group) || 0) - mySat) - Math.abs((lastSat_(b.a, me.group) || 0) - mySat); })[0];
  if (q) { setCells_('Duels', q, { b: me.login }); startDuel_(q); return { id: q.id, started: true }; }
  var mineQ = table_('Duels').rows.filter(function (d) { return d.status === 'queue' && d.a === me.login && now - Number(d.created) < CUBE_.invite * 1000; })[0];
  if (mineQ) return { id: mineQ.id, waiting: true };
  var id = 'd' + randomToken_().slice(0, 12);
  append_('Duels', { id: id, a: me.login, b: '', grp: me.group, status: 'queue', created: now, started: '', q_json: '', ended: '', winner: '', score_a: '', score_b: '' });
  return { id: id, waiting: true };
}
function duelById_(id, me) {
  var d = table_('Duels').rows.filter(function (x) { return x.id === String(id || ''); })[0];
  if (!d || (d.a !== me.login && d.b !== me.login)) fail_('not_found');
  return d;
}
function apiDuelRespond_(req, me) {
  requireStudent_(me);
  var d = duelById_(req.id, me);
  if (d.status !== 'invite' || d.b !== me.login) fail_('duel_gone');
  if (Date.now() - Number(d.created) > CUBE_.invite * 1000) { setCells_('Duels', d, { status: 'expired' }); fail_('duel_gone'); }
  if (!req.accept) { setCells_('Duels', d, { status: 'declined' }); return { declined: true }; }
  canDuel_(me.login); canDuel_(d.a);
  startDuel_(d);
  return { id: d.id, started: true };
}
function apiDuelCancel_(req, me) {
  requireStudent_(me);
  var d = duelById_(req.id, me);
  if (d.status === 'invite' || d.status === 'queue') setCells_('Duels', d, { status: 'cancelled' });
  return { cancelled: true };
}
/** The whole duel state is derived from the start time and the answer rows (insert-only), so two players never overwrite each other. */
function duelDerive_(d, rows, now) {
  var Q = JSON.parse(d.q_json || '[]'), t = Number(d.started), out = { results: [], sa: 0, sb: 0 };
  if (now < t) { out.phase = 'wait'; out.until = t; return out; }
  for (var i = 0; i < Q.length; i++) {
    var dl = t + CUBE_.duelSec * 1000, first = {}, win = null, end = null;
    rows.filter(function (x) { return Number(x.idx) === i && Number(x.at) >= t && Number(x.at) < dl; })
      .sort(function (a, b) { return Number(a.at) - Number(b.at); }).forEach(function (x) {
        if (win || first[x.login]) return;
        first[x.login] = { a: x.answer, c: x.correct === 'Y', at: Number(x.at) };
        if (x.correct === 'Y') { win = x.login; end = Number(x.at); }
      });
    if (!win && first[d.a] && first[d.b]) end = Math.max(first[d.a].at, first[d.b].at);
    if (end === null && now < dl) { out.phase = 'question'; out.idx = i; out.start = t; out.deadline = dl; out.answered = first; return out; }
    if (end === null) end = dl;
    out.results.push({ win: win, answered: first, key: Q[i].key });
    if (win === d.a) out.sa++; else if (win === d.b) out.sb++;
    t = end + CUBE_.duelPause * 1000;
    if (now < t && i < Q.length - 1) { out.phase = 'pause'; out.idx = i; out.until = t; return out; }
  }
  out.phase = 'done'; out.ended = t;
  return out;
}
function duelView_(d, me, st) {
  var Q = JSON.parse(d.q_json || '[]'), meA = d.a === me.login, other = userByLogin_(meA ? d.b : d.a);
  var res = st.results.map(function (r, i) {
    var mine = r.answered[me.login], his = r.answered[meA ? d.b : d.a];
    return { win: r.win === me.login ? 'me' : r.win ? 'them' : null, key: r.key, my: mine ? mine.a : null, myOk: mine ? mine.c : null, theirs: !!his };
  });
  var v = { id: d.id, phase: st.phase, now: Date.now(), n: Q.length, sec: CUBE_.duelSec, my: meA ? st.sa : st.sb, their: meA ? st.sb : st.sa, results: res,
            other: other ? { name: other.name, cls: other.cls, hero: heroOf_(other.login), sat: lastSat_(other.login, other.group) } : null,
            me: { name: me.name, hero: heroOf_(me.login), sat: lastSat_(me.login, me.group) } };
  if (st.phase === 'wait' || st.phase === 'pause') v.until = st.until;
  if (st.phase === 'question') {
    v.idx = st.idx; v.deadline = st.deadline; v.q = publicQ_(Q[st.idx]);
    var mine = st.answered[me.login], his = st.answered[meA ? d.b : d.a];
    v.answered = mine ? { a: mine.a, c: mine.c } : null; v.theirAnswered = !!his;
  }
  if (st.phase === 'pause') v.idx = st.idx;
  if (st.phase === 'done') {
    v.result = d.winner === 'draw' ? 'draw' : d.winner === me.login ? 'win' : 'lose';
    v.got = Number((table_('Cubes').rows.filter(function (c) { return c.id === 'duel:' + d.id + ':' + me.login; })[0] || {}).delta || 0);
  }
  return v;
}
function finishDuel_(d, st) {
  if (d.status === 'done') return;
  var w = st.sa > st.sb ? d.a : st.sb > st.sa ? d.b : 'draw';
  setCells_('Duels', d, { status: 'done', ended: st.ended, winner: w, score_a: st.sa, score_b: st.sb });
  [d.a, d.b].forEach(function (l) { award_('duel:' + d.id + ':' + l, l, w === l ? CUBE_.duelWin : CUBE_.duelPlay, 'duel', d.id); });
}
function duelStateFor_(d, me) {
  if (d.status === 'invite' || d.status === 'queue') {
    var gone = Date.now() - Number(d.created) > CUBE_.invite * 1000;
    return { id: d.id, phase: gone ? 'expired' : (d.status === 'queue' ? 'queue' : 'invite'), mine: d.a === me.login, other: duelPublic_(d, me).other };
  }
  if (d.status !== 'active' && d.status !== 'done') return { id: d.id, phase: d.status };
  var rows = table_('DuelAnswers').rows.filter(function (x) { return x.duel_id === d.id; });
  var st = duelDerive_(d, rows, Date.now());
  if (st.phase === 'done') finishDuel_(d, st);
  return duelView_(d, me, st);
}
function apiDuelState_(req, me) {
  requireStudent_(me);
  var d = duelById_(req.id, me);
  seen_(me, d.status === 'active' ? 'duel' : 'lobby');
  return duelStateFor_(d, me);
}
function apiDuelAnswer_(req, me) {
  requireStudent_(me);
  var d = duelById_(req.id, me);
  if (d.status !== 'active') fail_('duel_gone');
  var rows = table_('DuelAnswers').rows.filter(function (x) { return x.duel_id === d.id; }), now = Date.now();
  var st = duelDerive_(d, rows, now), i = Number(req.idx);
  if (st.phase !== 'question' || st.idx !== i) return duelStateFor_(d, me);
  if (st.answered[me.login]) return duelStateFor_(d, me);
  var q = JSON.parse(d.q_json)[i], ans = String(req.answer || '').trim();
  if (!ans) fail_('bad_request');
  append_('DuelAnswers', { duel_id: d.id, idx: i, login: me.login, answer: ans, correct: gradeItem_(q.kind, q.key, ans) ? 'Y' : 'N', at: now });
  return duelStateFor_(d, me);
}

// ---------- API: teacher — group balances and manual awards ----------
function apiCubesGroup_(req, me) {
  requireStaff_(me);
  var g = String(req.group || groupsOf_(me)[0] || '');
  if (me.role !== 'admin' && groupsOf_(me).indexOf(g) < 0) fail_('forbidden');
  var week = Date.now() - 7 * 86400000;
  var list = table_('Users').rows.filter(function (u) { return (u.role || 'student') === 'student' && bool_(u.active) && String(u.group) === g; }).map(function (u) {
    syncCubes_(u);
    var mine = cubesOf_(u.login);
    return { login: u.login, name: u.name, cls: u.cls, hero: heroOf_(u.login),
             balance: mine.reduce(function (s, c) { return s + (Number(c.delta) || 0); }, 0),
             week: mine.filter(function (c) { return Number(c.delta) > 0 && Number(c.at) >= week; }).reduce(function (s, c) { return s + Number(c.delta); }, 0) };
  }).sort(function (a, b) { return b.balance - a.balance || String(a.name).localeCompare(String(b.name)); });
  return { group: g, students: list };
}
function apiCubesAdjust_(req, me) {
  requireStaff_(me);
  var u = userByLogin_(req.login);
  if (!u || !canSee_(me, u) || (u.role || 'student') !== 'student') fail_('forbidden');
  var n = Math.round(Number(req.delta));
  if (!n || Math.abs(n) > 500) fail_('bad_request');
  var note = String(req.note || '').slice(0, 120);
  append_('Cubes', { id: 'adj:' + Date.now() + ':' + randomToken_().slice(0, 6) + ':' + u.login, login: u.login, delta: n, reason: 'teacher', ref: note + (note ? ' · ' : '') + me.name, at: Date.now() });
  return { login: u.login, balance: balanceOf_(u.login) };
}

// ===================== END Code.gs =====================

SCHEMA.Cache = ['key', 'value', 'expires'];
var UNIQUE_ = { Settings: ['key'], Users: ['login'], Tokens: ['token_hash'], Rounds: ['round_id'], Params: ['round_id', 'module', 'pos'],
  Results: ['round_id', 'login'], Answers: ['round_id', 'login', 'module'], Items: ['id'], Keys: ['round_id', 'login', 'module'],
  Sessions: ['round_id', 'login', 'module'], Announcements: ['group'], Cache: ['key'],
  Cubes: ['id'], Owned: ['login', 'item'], Heroes: ['login'], Games: ['id'], Duels: ['id'], DuelAnswers: ['duel_id', 'idx', 'login'], Presence: ['login'],
  Proctor: ['round_id', 'login'], ProctorLog: ['id'], AdminLog: ['id'] };
function q_(id) { return '"' + id + '"'; }

function sha_(s) { return sha256Hex_(String(s)); }

// ---------- storage functions Code.gs calls (replace the Google Sheets versions) ----------
function sheetProxy_(name) {
  return { deleteRow: function (id) {
    var t = CUR.t[name], i = t.rows.findIndex(function (r) { return r._row === id; });
    if (i >= 0) { var row = t.rows[i]; t.rows.splice(i, 1); CUR.ops.push({ op: 'del', table: name, row: row }); }
  }, getLastRow: function () { return 0; } };
}
function table_(name) { var t = needTable_(name); return { sheet: sheetProxy_(name), head: SCHEMA[name], rows: t.rows }; }
function setCells_(name, rowObj, patch) {
  var head = SCHEMA[name];
  Object.keys(patch).forEach(function (k) { if (head.indexOf(k) < 0) fail_('schema_' + name + '_' + k); rowObj[k] = patch[k]; });
  if (rowObj._row > 0) CUR.ops.push({ op: 'upd', table: name, row: rowObj, cols: Object.keys(patch) });
}
function append_(name, obj) {
  var t = needTable_(name), row = { _row: -(++CUR.seq) };
  SCHEMA[name].forEach(function (h) { row[h] = obj[h] === undefined ? '' : obj[h]; });
  t.rows.push(row); CUR.ops.push({ op: 'ins', table: name, row: row });
}
function appendMany_(name, objs) { objs.forEach(function (o) { append_(name, o); }); }
function itemsFor_(rid, login, module) {
  var k = rid + '|' + login + '|' + module;
  if (!CUR.items[k]) throw new Need_({ items: [rid, String(login), module] });
  return CUR.items[k];
}
function sheet_(name) { fail_('no_sheet_' + name); }

// ---------- D1 access ----------
function rowFromDb_(name, r) {
  var o = { _row: r._id };
  SCHEMA[name].forEach(function (h) { o[h] = coerce_(r[h]); });
  return o;
}
async function loadTable_(env, store, name, where, params) {
  var sql = 'SELECT rowid AS _id, * FROM ' + q_(name) + (where ? ' WHERE ' + where : '') + ' ORDER BY rowid';
  var res = await stmt_(env, sql, params || []).all();
  store.t[name] = { rows: (res.results || []).map(function (r) { return rowFromDb_(name, r); }) };
}
function stmt_(env, sql, params) { var s = env.DB.prepare(sql); return params && params.length ? s.bind.apply(s, params) : s; }
function addItems_(store, rows) {
  rows.forEach(function (r) {
    var o = rowFromDb_('Items', r), k = o.round_id + '|' + o.login + '|' + o.module;
    (store.items[k] = store.items[k] || [])[Number(o.pos) - 1] = o;
  });
}
function commitStatements_(env, store) {
  var out = [];
  store.ops.forEach(function (op) { if (op.op === 'del' && op.row._row < 0) op.row._deleted = true; });
  store.ops.forEach(function (op) {
    var name = op.table, head = SCHEMA[name];
    if (op.op === 'ins') {
      if (op.row._deleted) return;
      out.push(stmt_(env, (name === 'DuelAnswers' || name === 'Cubes' ? 'INSERT OR IGNORE INTO ' : 'INSERT OR REPLACE INTO ') + q_(name) + ' (' + head.map(q_).join(',') + ') VALUES (' + head.map(function () { return '?'; }).join(',') + ')',
        head.map(function (h) { return toDb_(op.row[h]); })));
    } else if (op.op === 'upd') {
      out.push(stmt_(env, 'UPDATE ' + q_(name) + ' SET ' + op.cols.map(function (c) { return q_(c) + '=?'; }).join(',') + ' WHERE rowid=?',
        op.cols.map(function (c) { return toDb_(op.row[c]); }).concat([op.row._row])));
    } else if (op.op === 'del') {
      if (op.row._row < 0) return;
      out.push(stmt_(env, 'DELETE FROM ' + q_(name) + ' WHERE rowid=?', [op.row._row]));
    }
  });
  return out;
}

// ---------- what each request needs (one D1 round trip); anything missed is loaded on demand ----------
var ME_ = '(SELECT login FROM "Tokens" WHERE token_hash = ?)';
var STAFF_ = '(SELECT role FROM "Users" WHERE login = ' + ME_ + ') IN (\'teacher\',\'admin\')';
function plan_(req, th) {
  // own rows for a student, the whole table for staff: two statements (see runLogic_), so a student's read uses the login index
  var a = req.action, own = { where: 'login = ' + ME_, params: [th], staffAll: true };
  var p = [{ name: 'Settings' }, { name: 'Users' }, { name: 'Rounds' }];
  if (a === 'login') {
    var lg = String(req.login || '').trim().toLowerCase();
    p.push({ name: 'Tokens', where: 'login = ? OR expires < ?', params: [lg, new Date().toISOString()] });
    p.push({ name: 'Cache', where: 'key = ?', params: ['fail:' + lg] });
    return p;
  }
  p.push(a === 'resetPassword' || a === 'admUserSave' || a === 'admResetPw' ? { name: 'Tokens', where: 'token_hash = ? OR login = ?', params: [th, String(req.login || '')] }
                               : { name: 'Tokens', where: 'token_hash = ?', params: [th] });
  var add = function (name, f) { p.push(Object.assign({ name: name }, f || {})); };
  // Results/Answers/Sessions filters (4.4.7): only the rounds the logic of this action can look at
  var who = req.login ? { sql: '?', p: [String(req.login)] } : { sql: ME_, p: [th] };   // targetUser_: req.login or me
  var groupRounds = function (w) { return { where: 'round_id IN (SELECT round_id FROM "Rounds" WHERE "group" = (SELECT "group" FROM "Users" WHERE login = ' + w.sql + ') OR "group" = \'all\')', params: w.p }; };
  var namedGroupRounds = function (g) { return { where: 'round_id IN (SELECT round_id FROM "Rounds" WHERE "group" = ? OR "group" = \'all\')', params: [g] }; };
  var GRADE_ = function (col) { return 'substr(' + col + ', 1, instr(' + col + ' || \'-\', \'-\') - 1)'; };   // grade(g) in apiLeague_: part before '-'
  var streamRounds = { where: 'round_id IN (SELECT round_id FROM "Rounds" WHERE "group" = \'all\' OR ' + GRADE_('"group"') + ' = (SELECT ' + GRADE_('"group"') + ' FROM "Users" WHERE login = ' + ME_ + '))', params: [th], staffAll: true };
  if (a === 'dashboard') { add('Results', groupRounds(who)); add('Answers', own); add('Params'); add('History', own); add('Announcements'); }
  if (/^test(State|Start|Save|Submit)$/.test(a)) {
    add('Sessions', own); add('Answers', own); add('Keys', own); add('Params'); add('Proctor', own);
    if (a !== 'testSave') add('Results', own);      // testSave never reads Results
  }
  if (a === 'proctorPing') { add('Sessions', own); add('Proctor', own); }
  if (/^adm[A-Z]/.test(a)) {
    var ago = Date.now() - 30 * 86400000;
    if (a === 'admOverview') { add('Keys', { where: 'module = ?', params: ['M1'] }); add('Results'); add('Cubes'); add('Heroes'); }
    if (a === 'admUsers') { add('Results'); add('Cubes'); }
    if (a === 'admRounds') { add('Keys'); add('Sessions', { where: 'module = ?', params: ['M1'] }); add('Results'); }
    if (a === 'admOverview' || a === 'admLog') { add('AdminLog', { where: 'at > ?', params: [ago] }); add('ProctorLog', { where: 'at > ?', params: [ago] }); }
  }
  if (a === 'proctorBoard') {                       // polled every 4 s by the teacher's monitor: only the rounds of this group (its own and 'all')
    var rf = req.roundId ? { where: 'round_id = ?', params: [String(req.roundId)] }
                         : { where: 'round_id IN (SELECT round_id FROM "Rounds" WHERE "group" = ? OR "group" = \'all\')', params: [String(req.group || '')] };
    add('Proctor', rf); add('Sessions', rf); add('Results', rf);
    add('ProctorLog', { where: rf.where + ' AND at > ?', params: rf.params.concat([Date.now() - 2 * 86400000]) });
  } else if (/^proctor(Set|Code|Mark|Unlock|Finish|Reset)$/.test(a)) {
    add('Proctor'); add('Sessions'); add('Results'); add('ProctorLog', { where: 'at > ?', params: [Date.now() - 2 * 86400000] });
    if (a === 'proctorFinish' || a === 'proctorReset') { add('Answers', { where: 'login = ?', params: [String(req.login || '')] }); add('Keys', { where: 'login = ?', params: [String(req.login || '')] }); add('Params'); }
    if (a === 'proctorReset') add('Cubes', { where: 'login = ?', params: [String(req.login || '')] });
  }
  if (a === 'mistakes') { add('Answers', own); add('Params'); add('Items', { where: 'login = ' + ME_, params: [th], items: true }); }
  if (a === 'round') { add('Answers', own); add('Results', req.roundId ? { where: 'round_id = ?', params: [String(req.roundId)] } : null); add('Params'); }
  if (a === 'league') { add('Results', streamRounds); }
  if (a === 'similar' || a === 'similarCheck') {
    add('Params'); add('Keys', { where: 'round_id = ? AND module = ?', params: [String(req.roundId || ''), String(req.module || '')] });
    add('Items', { where: 'round_id = ? AND module = ? AND pos = ?', params: [String(req.roundId || ''), String(req.module || ''), Number(req.pos) || 0], items: true, partial: true });
  }
  if (a === 'groupOverview') {
    var gf = req.group ? namedGroupRounds(String(req.group)) : null;   // no group given: the logic picks one, load everything
    add('Results', gf); add('Answers', gf); add('Sessions', gf); add('Params'); add('Announcements');
  }
  // v4: cubes, hero, games, duels
  var mineOnly = { where: 'login = ' + ME_, params: [th] }, recent = Date.now() - 2 * 86400000;
  if (a === 'cubes') { add('Results', groupRounds(who)); add('Cubes'); add('Heroes', own); add('Duels', { where: 'status = ?', params: ['done'] }); }
  if (a === 'hero' || a === 'heroSave' || a === 'shopBuy') { add('Results'); add('Cubes', mineOnly); add('Owned', mineOnly); add('Heroes', mineOnly); }
  if (a === 'heroes') { add('Heroes'); }
  if (a === 'games') { add('Results'); add('Cubes', mineOnly); add('Owned', mineOnly); add('Answers', mineOnly); add('Params'); add('Presence'); add('Keys'); add('Duels', { where: 'created > ?', params: [recent] }); }
  if (a === 'fixNext' || a === 'fixCheck') { add('Cubes', mineOnly); add('Answers', mineOnly); add('Params'); add('Keys'); }
  if (a === 'blitzStart') { add('Answers', mineOnly); add('Params'); add('Keys'); add('Cubes', mineOnly); add('Owned', mineOnly); }
  if (a === 'blitzAnswer' || a === 'blitzHint') { add('Games', { where: 'id = ?', params: [String(req.id || '')] }); add('Cubes', mineOnly); add('Owned', mineOnly); }
  if (/^duel(Lobby|Invite|Random|Respond|Cancel)$/.test(a)) {
    add('Presence'); add('Results'); add('Heroes'); add('Answers'); add('Params'); add('Duels', { where: 'created > ?', params: [recent] });
    if (a !== 'duelLobby' && a !== 'duelCancel') add('Keys');
  }
  if (a === 'duelState' || a === 'duelAnswer') {
    var did = String(req.id || '');
    add('Duels', { where: 'created > ? OR id = ?', params: [recent, did] }); add('DuelAnswers', { where: 'duel_id = ?', params: [did] });
    add('Cubes', { where: 'id LIKE ?', params: ['duel:' + did + ':%'] }); add('Presence', mineOnly); add('Heroes'); add('Results');
  }
  if (a === 'cubesGroup') { add('Results'); add('Cubes'); add('Heroes'); }
  if (a === 'cubesAdjust') { add('Cubes', { where: 'login = ?', params: [String(req.login || '')] }); }
  return p;
}

// ---------- hot tables: Settings, Users, Rounds, Params are kept in this isolate's memory ----------
// Every request reads one row, Settings['cache_rev']; any write to a hot table bumps it in the same atomic batch,
// so a stale copy is never used. HOT_TTL_MS_ also covers manual edits made outside the API (D1 console).
// A hot table enters memory the first time a request loads it in full (Params: only actions that need it).
var HOT_ = { Settings: 1, Users: 1, Rounds: 1, Params: 1 }, HOT_KEY_ = 'cache_rev', HOT_TTL_MS_ = 60000;
var HOT = null;                                      // { rev, at, t: { name: rows } }
function hotRev_(r) { var x = r && r.results && r.results[0]; return x ? String(x.value) : '0'; }
function hotCopy_(rows) { return rows.map(function (r) { var o = {}; for (var k in r) o[k] = r[k] instanceof Date ? new Date(r[k].getTime()) : r[k]; return o; }); }
function hotBump_(env) { return stmt_(env, 'INSERT INTO "Settings" ("key","value") VALUES (?, \'1\') ON CONFLICT("key") DO UPDATE SET "value" = CAST("value" AS INTEGER) + 1', [HOT_KEY_]); }
function hotRevStmt_(env) { return stmt_(env, 'SELECT value FROM "Settings" WHERE key = ?', [HOT_KEY_]); }
async function hotLoad_(env, store, names) {        // reload the given hot tables + the revision, one batch; returns { rev, t }
  var res = await env.DB.batch(names.map(function (n) { return stmt_(env, 'SELECT rowid AS _id, * FROM ' + q_(n) + ' ORDER BY rowid'); }).concat([hotRevStmt_(env)]));
  var t = {}; names.forEach(function (n, i) { t[n] = (res[i].results || []).map(function (r) { return rowFromDb_(n, r); }); store.t[n] = { rows: hotCopy_(t[n]) }; });
  return { rev: hotRev_(res[names.length]), t: t };
}

/** Runs fn() (synchronous Code.gs logic) with the rows it needs, loading more on demand, then commits all writes. */
async function runLogic_(env, req, fn) {
  var th = req.token ? 't' + sha_(String(req.token)) : '';
  var store = new Store_(), plan = plan_(req, th), partialItems = {};
  var hot = HOT, stmts = [], at = [], hotFresh = !!(hot && Date.now() - hot.at < HOT_TTL_MS_);   // local ref: a concurrent request in this isolate may reset HOT
  plan.forEach(function (x) {
    at.push(stmts.length);
    if (HOT_[x.name] && !x.where && hotFresh && hot.t[x.name]) { x.hot = true; return; }  // served from memory if the revision still matches
    stmts.push(stmt_(env, 'SELECT rowid AS _id, * FROM ' + q_(x.name) + (x.where ? ' WHERE ' + x.where : '') + ' ORDER BY rowid', x.params || []));
    // staff: the whole table; a student: LIMIT 0, so D1 reads no rows at all
    if (x.staffAll) stmts.push(stmt_(env, 'SELECT rowid AS _id, * FROM ' + q_(x.name) + ' ORDER BY rowid LIMIT (CASE WHEN ' + STAFF_ + ' THEN -1 ELSE 0 END)', [th]));
  });
  var revAt = stmts.length; stmts.push(hotRevStmt_(env));
  var res = await env.DB.batch(stmts), rev = hotRev_(res[revAt]), hotLoaded = {};
  plan.forEach(function (x, i) {
    if (x.hot) return;
    var rows = res[at[i]].results || [];
    if (x.staffAll) { var all = res[at[i] + 1].results || []; if (all.length) rows = all; }
    if (x.items) { addItems_(store, rows); if (x.partial) partialItems = true; }
    else store.t[x.name] = { rows: rows.map(function (r) { return rowFromDb_(x.name, r); }) };
    if (HOT_[x.name] && !x.where) hotLoaded[x.name] = store.t[x.name].rows;
  });
  var skipped = plan.filter(function (x) { return x.hot; }).map(function (x) { return x.name; });
  if (hotFresh && hot.rev === rev) {                 // memory is current: serve skipped tables, keep newly loaded ones
    skipped.forEach(function (n) { store.t[n] = { rows: hotCopy_(hot.t[n]) }; });
    Object.keys(hotLoaded).forEach(function (n) { hot.t[n] = hotCopy_(hotLoaded[n]); });
  } else {                                           // first load, TTL expired or the revision changed
    var nh = { rev: rev, at: Date.now(), t: {} };
    Object.keys(hotLoaded).forEach(function (n) { nh.t[n] = hotCopy_(hotLoaded[n]); });
    if (skipped.length) {                            // they were skipped on a stale copy: reload them now (rare)
      var re = await hotLoad_(env, store, skipped);
      if (re.rev !== rev) nh = { rev: re.rev, at: Date.now(), t: {} };
      skipped.forEach(function (n) { nh.t[n] = hotCopy_(re.t[n]); });
    }
    HOT = nh;
  }
  for (var attempt = 0; attempt < 25; attempt++) {
    var snapshot = JSON.stringify(Object.keys(store.t).map(function (k) { return [k, store.t[k].rows.length]; }));
    var work = cloneStore_(store);
    CUR = work;
    var out, need = null, err = null;
    try { out = fn(); } catch (e) { if (e instanceof Need_) need = e.need; else err = e; } finally { CUR = null; }
    if (need) {
      if (need.table) await loadTable_(env, store, need.table);
      else {
        var k = need.items.join('|');
        if (partialItems === true && store.items[k]) delete store.items[k];      // a partial (one position) set: load the full module
        var r = await stmt_(env, 'SELECT rowid AS _id, * FROM "Items" WHERE round_id = ? AND login = ? AND module = ? ORDER BY pos', need.items).all();
        store.items[k] = []; addItems_(store, r.results || []);
        store.items[k] = store.items[k].filter(Boolean);
      }
      continue;
    }
    if (err && !err.code) throw err;                 // unexpected error: write nothing
    var w = commitStatements_(env, work);            // like Apps Script, writes made before a business error (e.g. failed-login counter) persist
    if (work.ops.some(function (op) { return HOT_[op.table]; })) { w.push(hotBump_(env)); HOT = null; }
    if (err) { if (w.length) await env.DB.batch(w); throw err; }
    if (w.length) await env.DB.batch(w);
    return out;
  }
  throw new Error('too_many_loads');
}
function cloneStore_(s) {
  var c = new Store_();
  Object.keys(s.t).forEach(function (k) { c.t[k] = { rows: s.t[k].rows.map(function (r) { return Object.assign({}, r); }) }; });
  Object.keys(s.items).forEach(function (k) { c.items[k] = s.items[k]; });
  return c;
}

// ---------- worker-only admin actions (replace the Google Sheets menu) ----------
function requireAdmin_(me) { if (me.role !== 'admin') fail_('forbidden'); }
async function adminAction_(env, req) {
  var me = await runLogic_(env, req, function () { var u = auth_(req.token); if (u.must_change) fail_('must_change_password'); return u; });
  requireAdmin_(me);
  var a = req.action;
  if (a === 'adminRound') {                      // create/update a round row (+ replace its question parameters)
    var r = req.round || {}; if (!r.round_id) fail_('bad_request');
    var head = SCHEMA.Rounds, cur = await stmt_(env, 'SELECT rowid AS _id, * FROM "Rounds" WHERE round_id = ?', [r.round_id]).first();
    var row = {}; head.forEach(function (h) { row[h] = r[h] !== undefined ? r[h] : (cur ? cur[h] : ''); });
    var st = [stmt_(env, 'INSERT OR REPLACE INTO "Rounds" (' + head.map(q_).join(',') + ') VALUES (' + head.map(function () { return '?'; }).join(',') + ')', head.map(function (h) { return toDb_(row[h]); }))];
    if (Array.isArray(req.params)) {
      st.push(stmt_(env, 'DELETE FROM "Params" WHERE round_id = ?', [r.round_id]));
      req.params.forEach(function (p) { st.push(stmt_(env, 'INSERT OR REPLACE INTO "Params" (round_id,module,pos,diff,kind,domain,skill,b) VALUES (?,?,?,?,?,?,?,?)',
        [r.round_id, p.module, Number(p.pos), p.diff || '', p.kind || 'MC', p.domain || '', p.skill || '', toDb_(Number(p.b))])); });
    }
    st.push(hotBump_(env)); HOT = null;
    await env.DB.batch(st);
    return { roundId: r.round_id, params: (req.params || []).length };
  }
  if (a === 'adminVariant') {                    // one student's module: 22 questions + key
    var rid = String(req.roundId || ''), login = String(req.login || ''), m = String(req.module || '');
    if (!rid || !login || ['M1', 'M2E', 'M2H'].indexOf(m) < 0 || !Array.isArray(req.items) || !Array.isArray(req.key)) fail_('bad_request');
    var st2 = [stmt_(env, 'DELETE FROM "Items" WHERE round_id = ? AND login = ? AND module = ?', [rid, login, m])];
    req.items.forEach(function (it) {
      var pos = Number(it.pos);
      st2.push(stmt_(env, 'INSERT OR REPLACE INTO "Items" (id,round_id,login,module,pos,kind,html,opts_json,solution_html) VALUES (?,?,?,?,?,?,?,?,?)',
        [rid + '|' + login + '|' + m + '|' + pad2_(pos), rid, login, m, pos, it.kind || 'MC', String(it.html || ''), typeof it.opts_json === 'string' ? it.opts_json : JSON.stringify(it.opts || []), String(it.solution_html || '')]));
    });
    st2.push(stmt_(env, 'INSERT OR REPLACE INTO "Keys" (round_id,login,module,key_json) VALUES (?,?,?,?)', [rid, login, m, JSON.stringify(req.key.map(String))]));
    await env.DB.batch(st2);
    return { items: req.items.length };
  }
  if (a === 'backup') {                          // everything except question texts, sign-in tokens and counters
    var names = ['Settings', 'Users', 'Rounds', 'Params', 'Results', 'Answers', 'Keys', 'Sessions', 'Announcements', 'History', 'Cubes', 'Owned', 'Heroes', 'Duels', 'Proctor', 'ProctorLog', 'AdminLog'];
    var rs = await env.DB.batch(names.map(function (n) { return stmt_(env, 'SELECT * FROM ' + q_(n) + ' ORDER BY rowid'); }));
    var outT = {}; names.forEach(function (n, i) { outT[n] = rs[i].results || []; });
    return { version: VERSION, at: new Date().toISOString(), tables: outT };
  }
  if (a === 'adminRecompute') {
    return await runLogic_(env, Object.assign({}, req, { action: 'groupOverview' }), function () { recomputeResults(); return { done: true }; });
  }
  fail_('unknown_action');
}

// ---------- first start: create missing tables (schema only; data is never loaded from the build) ----------
var BOOT_ = {"schema": "CREATE TABLE IF NOT EXISTS \"Settings\" (\"key\", \"value\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Settings\" ON \"Settings\" (\"key\");\nCREATE TABLE IF NOT EXISTS \"Users\" (\"login\", \"name\", \"cls\", \"group\", \"role\", \"groups\", \"salt\", \"hash\", \"must_change\", \"active\", \"note\", \"goal\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Users\" ON \"Users\" (\"login\");\nCREATE TABLE IF NOT EXISTS \"Tokens\" (\"token_hash\", \"login\", \"expires\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Tokens\" ON \"Tokens\" (\"token_hash\");\nCREATE TABLE IF NOT EXISTS \"Rounds\" (\"round_id\", \"season\", \"round_no\", \"title\", \"group\", \"date\", \"closed\", \"close_at\", \"scale_a\", \"scale_b\", \"threshold\", \"online\", \"open\", \"m1_minutes\", \"m2_minutes\", \"grace_seconds\", \"show_results\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Rounds\" ON \"Rounds\" (\"round_id\");\nCREATE TABLE IF NOT EXISTS \"Params\" (\"round_id\", \"module\", \"pos\", \"diff\", \"kind\", \"domain\", \"skill\", \"b\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Params\" ON \"Params\" (\"round_id\", \"module\", \"pos\");\nCREATE TABLE IF NOT EXISTS \"Results\" (\"round_id\", \"login\", \"m1\", \"route\", \"m2\", \"total\", \"sat\", \"theta\", \"status\", \"note\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Results\" ON \"Results\" (\"round_id\", \"login\");\nCREATE TABLE IF NOT EXISTS \"Answers\" (\"round_id\", \"login\", \"module\", \"resp_json\", \"key_json\", \"correct\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Answers\" ON \"Answers\" (\"round_id\", \"login\", \"module\");\nCREATE TABLE IF NOT EXISTS \"Items\" (\"id\", \"round_id\", \"login\", \"module\", \"pos\", \"kind\", \"html\", \"opts_json\", \"solution_html\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Items\" ON \"Items\" (\"id\");\nCREATE TABLE IF NOT EXISTS \"Keys\" (\"round_id\", \"login\", \"module\", \"key_json\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Keys\" ON \"Keys\" (\"round_id\", \"login\", \"module\");\nCREATE TABLE IF NOT EXISTS \"Sessions\" (\"round_id\", \"login\", \"module\", \"started\", \"deadline\", \"submitted\", \"answers_json\", \"leaves\", \"raw\", \"route\", \"correct\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Sessions\" ON \"Sessions\" (\"round_id\", \"login\", \"module\");\nCREATE TABLE IF NOT EXISTS \"Announcements\" (\"group\", \"text\", \"updated\", \"author\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Announcements\" ON \"Announcements\" (\"group\");\nCREATE TABLE IF NOT EXISTS \"History\" (\"login\", \"season\", \"round_no\", \"label\", \"pct\", \"grade\", \"points\");\nCREATE TABLE IF NOT EXISTS \"Cubes\" (\"id\", \"login\", \"delta\", \"reason\", \"ref\", \"at\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Cubes\" ON \"Cubes\" (\"id\");\nCREATE TABLE IF NOT EXISTS \"Owned\" (\"login\", \"item\", \"qty\", \"at\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Owned\" ON \"Owned\" (\"login\", \"item\");\nCREATE TABLE IF NOT EXISTS \"Heroes\" (\"login\", \"hero_json\", \"updated\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Heroes\" ON \"Heroes\" (\"login\");\nCREATE TABLE IF NOT EXISTS \"Games\" (\"id\", \"login\", \"kind\", \"q_json\", \"started\", \"answers_json\", \"done\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Games\" ON \"Games\" (\"id\");\nCREATE TABLE IF NOT EXISTS \"Duels\" (\"id\", \"a\", \"b\", \"grp\", \"status\", \"created\", \"started\", \"q_json\", \"ended\", \"winner\", \"score_a\", \"score_b\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Duels\" ON \"Duels\" (\"id\");\nCREATE TABLE IF NOT EXISTS \"DuelAnswers\" (\"duel_id\", \"idx\", \"login\", \"answer\", \"correct\", \"at\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_DuelAnswers\" ON \"DuelAnswers\" (\"duel_id\", \"idx\", \"login\");\nCREATE TABLE IF NOT EXISTS \"Presence\" (\"login\", \"seen\", \"place\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Presence\" ON \"Presence\" (\"login\");\nCREATE TABLE IF NOT EXISTS \"Proctor\" (\"round_id\", \"login\", \"present\", \"marked_by\", \"marked_at\", \"admitted\", \"locked\", \"locked_at\", \"reason\", \"leaves\", \"seen\", \"attempt\", \"bad_codes\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Proctor\" ON \"Proctor\" (\"round_id\", \"login\");\nCREATE TABLE IF NOT EXISTS \"ProctorLog\" (\"id\", \"round_id\", \"login\", \"kind\", \"at\", \"by\", \"note\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_ProctorLog\" ON \"ProctorLog\" (\"id\");\nCREATE TABLE IF NOT EXISTS \"AdminLog\" (\"id\", \"at\", \"by\", \"action\", \"target\", \"note\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_AdminLog\" ON \"AdminLog\" (\"id\");\nCREATE TABLE IF NOT EXISTS \"Cache\" (\"key\", \"value\", \"expires\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"u_Cache\" ON \"Cache\" (\"key\");\nCREATE INDEX IF NOT EXISTS \"i_Items_login\" ON \"Items\" (\"login\");\nCREATE INDEX IF NOT EXISTS \"i_Answers_login\" ON \"Answers\" (\"login\");\nCREATE INDEX IF NOT EXISTS \"i_Sessions_login\" ON \"Sessions\" (\"login\");\nCREATE INDEX IF NOT EXISTS \"i_Tokens_login\" ON \"Tokens\" (\"login\");\nCREATE INDEX IF NOT EXISTS \"i_Proctor_login\" ON \"Proctor\" (\"login\");\nCREATE INDEX IF NOT EXISTS \"i_Keys_login\" ON \"Keys\" (\"login\");\nCREATE INDEX IF NOT EXISTS \"i_History_login\" ON \"History\" (\"login\");\nCREATE INDEX IF NOT EXISTS \"i_Cubes_login\" ON \"Cubes\" (\"login\");\nCREATE INDEX IF NOT EXISTS \"i_ProctorLog_round\" ON \"ProctorLog\" (\"round_id\", \"at\");\nCREATE INDEX IF NOT EXISTS \"i_Results_login\" ON \"Results\" (\"login\");\n"};   // filled by build/build_worker.py
var READY_ = false;
function splitSql_(sql) { return sql.split(/;\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
async function ensureDb_(env) {
  if (READY_) return;
  if (BOOT_.schema) await env.DB.batch(splitSql_(BOOT_.schema).map(function (q) { return env.DB.prepare(q); }));
  READY_ = true;
}

// ---------- HTTP ----------
var CORS_ = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
function json_(obj, status) { return new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS_) }); }
async function handle_(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_ });
  if (request.method === 'GET') {
    // GET /?health=1 — for uptime monitors: one indexed read from D1; 503 when the database does not answer
    if (/[?&]health=1(&|$)/.test(request.url)) {
      var t0 = Date.now();
      try {
        if (!env || !env.DB) throw new Error('no_database_binding');
        await env.DB.prepare('SELECT value FROM "Settings" WHERE key = ?').bind(HOT_KEY_).first();
        return json_({ ok: true, app: 'Registan Math League API', version: VERSION, db: 'ok', ms: Date.now() - t0 });
      } catch (e) {
        console.error('health', e && e.message || e);
        return json_({ ok: false, error: 'db_unavailable', version: VERSION }, 503);
      }
    }
    return json_({ ok: true, app: 'Registan Math League API', version: VERSION });
  }
  if (request.method !== 'POST') return json_({ ok: false, error: 'bad_request' }, 405);
  if (!env || !env.DB) return json_({ ok: false, error: 'no_database_binding' }, 500);
  var req;
  try { req = JSON.parse(await request.text() || '{}'); } catch (e) { return json_({ ok: false, error: 'bad_request' }); }
  try {
    await ensureDb_(env);
    var res;
    if (/^(adminRound|adminVariant|backup|adminRecompute)$/.test(req.action)) res = await adminAction_(env, req);
    else { req._seed = 1 + Math.floor(Math.random() * 4294967294); res = await runLogic_(env, req, function () { CACHE_ = {}; return route_(req) || {}; }); }
    res = res || {}; res.ok = true;
    return json_(res);
  } catch (err) {
    if (err && err.code) return json_({ ok: false, error: err.code });
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'server_error' });
  }
}
export default { fetch: handle_ };
export { handle_ as _handle, SCHEMA as _SCHEMA, UNIQUE_ as _UNIQUE, hashPw_ as _hashPw };
