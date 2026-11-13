(function () {
  'use strict';

  /* ==================== 通用数独引擎（4×4 / 6×6 / 9×9） ==================== */
  var SIZE_CFG = {
    4: { n: 4, br: 2, bc: 2 },
    6: { n: 6, br: 2, bc: 3 },
    9: { n: 9, br: 3, bc: 3 }
  };
  var LEVELS = [
    { id: 1,  size: 4, holes: 4,  logic: 'naked',  name: '认识数字',   desc: '找出少了哪个数字' },
    { id: 2,  size: 4, holes: 6,  logic: 'naked',  name: '小小侦探',   desc: '一行一行找线索' },
    { id: 3,  size: 4, holes: 8,  logic: 'hidden', name: '4×4 小高手', desc: '试试看，你能全填对' },
    { id: 4,  size: 6, holes: 10, logic: 'naked',  name: '新朋友 6×6', desc: '格子变多啦，别着急' },
    { id: 5,  size: 6, holes: 14, logic: 'hidden', name: '进阶挑战',   desc: '看看小宫格里少了谁' },
    { id: 6,  size: 6, holes: 18, logic: 'hidden', name: '6×6 小达人', desc: '越来越棒了' },
    { id: 7,  size: 9, holes: 34, logic: 'hidden', name: '9×9 起步',   desc: '大棋盘来啦，慢慢来' },
    { id: 8,  size: 9, holes: 44, logic: null,     name: '9×9 进阶',   desc: '认真想一想' },
    { id: 9,  size: 9, holes: 50, logic: null,     name: '9×9 高手',   desc: '有点难度哦' },
    { id: 10, size: 9, holes: 56, logic: null,     name: '数独大王',   desc: '最后一关，冲呀' }
  ];

  function bit(v) { return 1 << (v - 1); }
  function popcount(x) { var n = 0; while (x) { x &= x - 1; n++; } return n; }
  function lowVal(low) { return 32 - Math.clz32(low); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i];
      a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function boxOf(r, c, cfg) {
    return Math.floor(r / cfg.br) * (cfg.n / cfg.bc) + Math.floor(c / cfg.bc);
  }
  function unitsOf(cfg) {
    var n = cfg.n, out = [], r, c, b, u, dr, dc;
    for (r = 0; r < n; r++) { u = []; for (c = 0; c < n; c++) u.push(r * n + c); out.push(u); }
    for (c = 0; c < n; c++) { u = []; for (r = 0; r < n; r++) u.push(r * n + c); out.push(u); }
    var boxCols = n / cfg.bc;
    for (b = 0; b < n; b++) {
      u = [];
      var sr = Math.floor(b / boxCols) * cfg.br, sc = (b % boxCols) * cfg.bc;
      for (dr = 0; dr < cfg.br; dr++) for (dc = 0; dc < cfg.bc; dc++) u.push((sr + dr) * n + sc + dc);
      out.push(u);
    }
    return out;
  }
  function makeMasks(g, cfg) {
    var n = cfg.n, rows = new Array(n).fill(0), cols = new Array(n).fill(0), boxes = new Array(n).fill(0);
    for (var i = 0; i < n * n; i++) {
      var v = g[i]; if (!v) continue;
      var m = bit(v), r = Math.floor(i / n), c = i % n;
      rows[r] |= m; cols[c] |= m; boxes[boxOf(r, c, cfg)] |= m;
    }
    return { rows: rows, cols: cols, boxes: boxes };
  }
  function candAt(g, masks, i, cfg) {
    var n = cfg.n, r = Math.floor(i / n), c = i % n;
    return ((1 << n) - 1) & ~(masks.rows[r] | masks.cols[c] | masks.boxes[boxOf(r, c, cfg)]);
  }
  function allCandidates(g, cfg) {
    var masks = makeMasks(g, cfg), out = new Array(cfg.n * cfg.n);
    for (var i = 0; i < out.length; i++) out[i] = g[i] ? 0 : candAt(g, masks, i, cfg);
    return out;
  }
  function countSolutions(grid, cfg, limit) {
    limit = limit || 2;
    var n = cfg.n, total = n * n, ALL = (1 << n) - 1, g = grid.slice();
    var rows = new Array(n).fill(0), cols = new Array(n).fill(0), boxes = new Array(n).fill(0);
    for (var i = 0; i < total; i++) {
      var v0 = g[i]; if (!v0) continue;
      var m0 = bit(v0), r0 = Math.floor(i / n), c0 = i % n, b0 = boxOf(r0, c0, cfg);
      if ((rows[r0] | cols[c0] | boxes[b0]) & m0) return { count: 0, solution: null };
      rows[r0] |= m0; cols[c0] |= m0; boxes[b0] |= m0;
    }
    var count = 0, solution = null;
    function dfs() {
      if (count >= limit) return;
      var best = -1, bestMask = 0, bestN = 10;
      for (var i = 0; i < total; i++) {
        if (g[i]) continue;
        var r = Math.floor(i / n), c = i % n;
        var m = ALL & ~(rows[r] | cols[c] | boxes[boxOf(r, c, cfg)]);
        if (m === 0) return;
        var k = popcount(m);
        if (k < bestN) { bestN = k; best = i; bestMask = m; if (k === 1) break; }
      }
      if (best === -1) { count++; if (!solution) solution = g.slice(); return; }
      var br = Math.floor(best / n), bc = best % n, bb = boxOf(br, bc, cfg);
      var mm = bestMask;
      while (mm) {
        var low = mm & -mm; mm -= low;
        g[best] = lowVal(low);
        rows[br] |= low; cols[bc] |= low; boxes[bb] |= low;
        dfs();
        g[best] = 0;
        rows[br] ^= low; cols[bc] ^= low; boxes[bb] ^= low;
        if (count >= limit) return;
      }
    }
    dfs();
    return { count: count, solution: solution };
  }
  function generateFull(cfg) {
    var n = cfg.n, total = n * n, ALL = (1 << n) - 1, g = new Array(total).fill(0);
    var rows = new Array(n).fill(0), cols = new Array(n).fill(0), boxes = new Array(n).fill(0);
    function dfs(pos) {
      if (pos === total) return true;
      var r = Math.floor(pos / n), c = pos % n, b = boxOf(r, c, cfg);
      var avail = ALL & ~(rows[r] | cols[c] | boxes[b]), vals = [];
      while (avail) { var low = avail & -avail; avail -= low; vals.push(lowVal(low)); }
      shuffle(vals);
      for (var k = 0; k < vals.length; k++) {
        var v = vals[k], m = bit(v);
        g[pos] = v; rows[r] |= m; cols[c] |= m; boxes[b] |= m;
        if (dfs(pos + 1)) return true;
        g[pos] = 0; rows[r] ^= m; cols[c] ^= m; boxes[b] ^= m;
      }
      return false;
    }
    dfs(0);
    return g;
  }
  function logicalSolve(grid, cfg, useHidden) {
    var g = grid.slice(), units = unitsOf(cfg), n = cfg.n, guard = 0;
    while (guard++ < 300) {
      var masks = makeMasks(g, cfg), move = null, i, u, v, k, cnt, spot;
      for (i = 0; i < g.length && !move; i++) {
        if (g[i]) continue;
        var m = candAt(g, masks, i, cfg);
        if (popcount(m) === 1) move = { i: i, v: lowVal(m) };
      }
      if (!move && useHidden) {
        for (var ui = 0; ui < units.length && !move; ui++) {
          u = units[ui];
          for (v = 1; v <= n && !move; v++) {
            if (u.some(function (idx) { return g[idx] === v; })) continue;
            cnt = 0; spot = -1;
            for (k = 0; k < u.length; k++) {
              if (!g[u[k]] && (candAt(g, masks, u[k], cfg) & bit(v))) { spot = u[k]; cnt++; }
            }
            if (cnt === 1) move = { i: spot, v: v };
          }
        }
      }
      if (!move) break;
      g[move.i] = move.v;
    }
    return g;
  }
  function digHoles(solution, cfg, target) {
    var n = cfg.n, puzzle = solution.slice(), pairs = [], seen = {};
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var i = r * n + c, j = (n - 1 - r) * n + (n - 1 - c);
      if (seen[i] || seen[j]) continue;
      seen[i] = 1; seen[j] = 1;
      pairs.push(i === j ? [i] : [i, j]);
    }
    shuffle(pairs);
    var holes = 0;
    for (var p = 0; p < pairs.length && holes < target; p++) {
      var pair = pairs[p], saved = pair.map(function (x) { return puzzle[x]; });
      for (var q = 0; q < pair.length; q++) puzzle[pair[q]] = 0;
      if (countSolutions(puzzle, cfg, 2).count === 1) holes += pair.length;
      else for (var q2 = 0; q2 < pair.length; q2++) puzzle[pair[q2]] = saved[q2];
    }
    return { puzzle: puzzle, holes: holes };
  }
  function generateLevel(level) {
    var cfg = SIZE_CFG[level.size], best = null;
    for (var attempt = 0; attempt < 16; attempt++) {
      var solution = generateFull(cfg);
      var res = digHoles(solution, cfg, level.holes);
      var item = { puzzle: res.puzzle, solution: solution, holes: res.holes, size: level.size, cfg: cfg };
      if (res.holes >= level.holes - 2) {
        if (!level.logic) return item;
        var solved = logicalSolve(res.puzzle, cfg, level.logic === 'hidden');
        var ok = true;
        for (var i = 0; i < solution.length; i++) if (solved[i] !== solution[i]) { ok = false; break; }
        if (ok) return item;
      }
      if (!best || res.holes > best.holes) best = item;
    }
    return best;
  }

  /* ==================== 进度与设置 ==================== */
  var PKEY = 'sudoku_kids_progress_v1', GKEY = 'sudoku_kids_game_v1';
  var DEFAULT_SETTINGS = {
    sound: true, music: false, showPeer: true, showSame: true,
    theme: 'candy', unlockedAll: false
  };
  var progress = { stars: {}, best: {}, settings: {} };
  for (var dk in DEFAULT_SETTINGS) progress.settings[dk] = DEFAULT_SETTINGS[dk];

  function loadProgress() {
    try {
      var p = JSON.parse(localStorage.getItem(PKEY));
      if (p && p.settings) {
        progress.stars = p.stars || {};
        progress.best = p.best || {};
        for (var k in DEFAULT_SETTINGS) {
          if (p.settings[k] !== undefined) progress.settings[k] = p.settings[k];
        }
      }
    } catch (e) {}
  }
  function saveProgress() { try { localStorage.setItem(PKEY, JSON.stringify(progress)); } catch (e) {} }
  function totalStars() {
    var t = 0;
    for (var k in progress.stars) t += progress.stars[k];
    return t;
  }
  function isUnlocked(level) {
    return level.id === 1 || progress.settings.unlockedAll || (progress.stars[level.id - 1] || 0) > 0;
  }
  function applySettings() {
    document.documentElement.dataset.theme = progress.settings.theme;
    if (progress.settings.music) startMusic(); else stopMusic();
  }

  function saveState() {
    if (!state || state.finished) return;
    try {
      localStorage.setItem(GKEY, JSON.stringify({
        id: state.level.id, puzzle: state.puzzle, solution: state.solution,
        values: state.values, seconds: state.seconds, hints: state.hints,
        wrongs: state.wrongs, hinted: state.hinted,
        celebrated: Array.from(state.celebrated)
      }));
    } catch (e) {}
  }
  function readState() {
    try {
      var s = JSON.parse(localStorage.getItem(GKEY));
      if (s && s.puzzle && s.solution && s.values && s.puzzle.length === s.solution.length) return s;
    } catch (e) {}
    return null;
  }
  function clearState() { try { localStorage.removeItem(GKEY); } catch (e) {} }

  /* ==================== 声音 ==================== */
  var ac = null, musicTimer = null, musicStep = 0;
  function audio() {
    try {
      if (!ac) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function tone(freq, dur, type, gain) {
    var a = audio(); if (!a) return;
    try {
      var o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, a.currentTime);
      g.gain.linearRampToValueAtTime(gain, a.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur + 0.02);
    } catch (e) {}
  }
  function later(fn, ms) { setTimeout(fn, ms); }
  function sfx(kind) { try { sfxImpl(kind); } catch (e) {} }
  function sfxImpl(kind) {
    if (!progress.settings.sound) return;
    if (kind === 'tap') tone(700, 0.07, 'sine', 0.035);
    else if (kind === 'correct') { tone(784, 0.12, 'sine', 0.05); later(function () { tone(1046, 0.16, 'sine', 0.045); }, 90); }
    else if (kind === 'wrong') tone(240, 0.18, 'triangle', 0.03);
    else if (kind === 'erase') tone(430, 0.09, 'sine', 0.03);
    else if (kind === 'hint') { tone(880, 0.1, 'sine', 0.04); later(function () { tone(1174, 0.14, 'sine', 0.04); }, 100); }
    else if (kind === 'win') [523, 659, 784, 1046, 1318].forEach(function (f, i) {
      later(function () { tone(f, 0.3, 'sine', 0.05); }, i * 130);
    });
  }
  function startMusic() {
    if (musicTimer || !progress.settings.music) return;
    if (!audio()) return;
    var chords = [[261.63, 329.63, 392], [220, 277.18, 329.63], [196, 246.94, 293.66], [233.08, 293.66, 349.23]];
    musicTimer = setInterval(function () {
      if (document.hidden) return;
      var ch = chords[musicStep++ % chords.length];
      ch.forEach(function (f) { tone(f, 2.4, 'sine', 0.009); });
    }, 2700);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

  /* ==================== 界面状态 ==================== */
  var $ = function (id) { return document.getElementById(id); };
  var state = null, cells = [], numBtns = [];
  var toastTimer = null, cheerTimer = null;
  var CHEERS = ['太棒啦！', '做得好！', '真厉害！', '继续加油！', '好眼力！', '你真细心！'];

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function isModalOpen() { return !$('modal').classList.contains('hidden'); }
  function openModal(html) { $('modalBody').innerHTML = html; $('modal').classList.remove('hidden'); }
  function closeModal() { $('modal').classList.add('hidden'); }
  function showView(v) {
    $('mapView').classList.toggle('active', v === 'map');
    $('gameView').classList.toggle('active', v === 'game');
  }
  function fmtTime(s) {
    var m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isStandalone() {
    return window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  }
  function renderMap() {
    $('totalStars').textContent = totalStars();
    var grid = $('levelGrid');
    grid.innerHTML = '';
    LEVELS.forEach(function (L) {
      var unlocked = isUnlocked(L), stars = progress.stars[L.id] || 0;
      var b = document.createElement('button');
      b.className = 'level-card sz' + L.size + (unlocked ? '' : ' locked');
      var starHtml = [1, 2, 3].map(function (s) {
        return '<span class="' + (s <= stars ? '' : 'off') + '">★</span>';
      }).join('');
      b.innerHTML = '<div class="lc-top"><div class="lc-num">' + L.id + '</div>' +
        '<div class="lc-size">' + L.size + '×' + L.size + '</div></div>' +
        '<div class="lc-title">' + L.name + '</div>' +
        '<div class="lc-desc">' + L.desc + '</div>' +
        '<div class="lc-bottom"><div class="lc-stars">' + starHtml + '</div>' +
        '<div class="lc-state">' + (unlocked ? (stars ? '已完成 · 再玩一次' : '开始挑战') : '先过上一关') + '</div></div>';
      if (unlocked) b.addEventListener('click', function () { startLevel(L.id); });
      grid.appendChild(b);
    });
    var foot = '', saved = readState();
    if (saved) {
      foot += '<button class="install-tip" data-act="resume" style="display:block;width:100%;text-align:left">' +
        '<b>继续上次 · 第 ' + saved.id + ' 关</b><br>上次的进度还在，点这里接着玩</button>';
    }
    if (isIOS() && !isStandalone()) {
      foot += '<div class="install-tip"><b>装到 iPad 主屏幕</b><br>点 Safari 的「分享」按钮 → 选「添加到主屏幕」，' +
        '就能像普通 App 一样全屏打开，断网也能玩。</div>';
    } else {
      foot += '<div class="install-tip">进度自动保存在本机，随时可以接着玩。共 ' + LEVELS.length +
        ' 关，从 4×4 慢慢玩到 9×9，每关都是唯一解。</div>';
    }
    $('mapFoot').innerHTML = foot;
  }

  function currentGrid() {
    var g = new Array(state.puzzle.length);
    for (var i = 0; i < g.length; i++) g[i] = state.puzzle[i] || state.values[i];
    return g;
  }
  function firstEmpty(puzzle) {
    for (var i = 0; i < puzzle.length; i++) if (!puzzle[i]) return i;
    return 0;
  }
  function newState(L, data) {
    return {
      level: L, puzzle: data.puzzle, solution: data.solution,
      values: new Array(data.puzzle.length).fill(0),
      sel: firstEmpty(data.puzzle), seconds: 0, hints: 0, wrongs: 0,
      finished: false, hinted: [], celebrated: new Set()
    };
  }
  function prepareGameView(L) {
    var n = L.size;
    $('levelTitle').textContent = '第 ' + L.id + ' 关 · ' + L.name;
    $('levelDesc').textContent = L.desc;
    $('sizeBadge').textContent = n + '×' + n;
    $('tipLine').textContent = n === 4 ? '先看一行里少了哪个数字吧' :
      (n === 6 ? '每行、每列、每个小宫格都不能重复哦' : '慢慢来，先找只有一个候选的格子');
    $('cheer').classList.remove('show');
    buildBoard(); renderPad(); renderBoard(); showView('game'); closeModal();
  }
  function startLevel(id) {
    var L = LEVELS.find(function (x) { return x.id === id; }) || LEVELS[0];
    state = newState(L, generateLevel(L));
    prepareGameView(L);
    saveState();
  }
  function resumeGame(s) {
    var L = LEVELS.find(function (x) { return x.id === s.id; }) || LEVELS[0];
    state = newState(L, { puzzle: s.puzzle, solution: s.solution });
    state.values = s.values.slice();
    state.seconds = s.seconds || 0;
    state.hints = s.hints || 0;
    state.wrongs = s.wrongs || 0;
    state.hinted = s.hinted || [];
    state.celebrated = new Set(s.celebrated || []);
    state.sel = firstEmpty(state.puzzle);
    for (var i = 0; i < state.values.length; i++) {
      if (!state.puzzle[i] && state.values[i] !== state.solution[i]) { state.sel = i; break; }
    }
    prepareGameView(L);
    toast('接着上次继续玩吧');
  }
  function goMap() {
    state = null;
    showView('map');
    renderMap();
  }

  function buildBoard() {
    var n = state.level.size, cfg = SIZE_CFG[n], board = $('board');
    board.style.setProperty('--n', n);
    board.style.setProperty('--cell-font', n === 4 ? 'clamp(34px,5.2vh,56px)' :
      (n === 6 ? 'clamp(24px,3.9vh,42px)' : 'clamp(18px,2.9vh,32px)'));
    board.innerHTML = ''; cells = [];
    for (var i = 0; i < n * n; i++) {
      var r = Math.floor(i / n), c = i % n;
      var d = document.createElement('div');
      d.className = 'cell';
      if (c % cfg.bc === cfg.bc - 1 && c !== n - 1) d.classList.add('br');
      if (r % cfg.br === cfg.br - 1 && r !== n - 1) d.classList.add('bb');
      if (c === n - 1) d.classList.add('lastcol');
      if (r === n - 1) d.classList.add('lastrow');
      d.innerHTML = '<span class="v"></span>';
      (function (idx) { d.addEventListener('click', function () { selectCell(idx); }); })(i);
      board.appendChild(d);
      cells.push(d);
    }
  }
  function renderPad() {
    var n = state.level.size, pad = $('numPad');
    pad.style.setProperty('--pad-cols', n === 4 ? 2 : 3);
    pad.innerHTML = ''; numBtns = [];
    for (var v = 1; v <= n; v++) {
      var b = document.createElement('button');
      b.className = 'num-btn d' + v;
      b.innerHTML = '<span class="remain"></span>' + v;
      (function (num) { b.addEventListener('click', function () { inputValue(num); }); })(v);
      pad.appendChild(b);
      numBtns.push(b);
    }
  }
  function renderBoard() {
    var n = state.level.size, cfg = SIZE_CFG[n], grid = currentGrid();
    var sel = state.sel, sr = Math.floor(sel / n), sc = sel % n, sb = boxOf(sr, sc, cfg);
    var selVal = grid[sel], counts = new Array(n + 1).fill(0), i;
    for (i = 0; i < grid.length; i++) if (grid[i]) counts[grid[i]]++;
    for (i = 0; i < grid.length; i++) {
      var cell = cells[i], r = Math.floor(i / n), c = i % n;
      var given = state.puzzle[i] !== 0, v = grid[i];
      var wrong = !given && v && v !== state.solution[i];
      var cl = cell.classList;
      cl.toggle('given', given);
      cl.toggle('user', !given && v > 0);
      cl.toggle('wrong', !!wrong);
      cl.toggle('hinted', !given && state.hinted.indexOf(i) >= 0);
      cl.toggle('sel', i === sel);
      cl.toggle('peer', !!progress.settings.showPeer && i !== sel &&
        (r === sr || c === sc || boxOf(r, c, cfg) === sb));
      cl.toggle('same', !!progress.settings.showSame && selVal > 0 && v === selVal && i !== sel);
      cl.remove('pop');
      cell.firstChild.textContent = v || '';
      if (v) cell.style.setProperty('--num-color', 'var(--n' + v + ')');
    }
    numBtns.forEach(function (b, k) {
      var v = k + 1, remain = n - counts[v];
      b.querySelector('.remain').textContent = remain;
      b.classList.toggle('done', remain === 0);
    });
    var blanks = 0, filled = 0;
    for (i = 0; i < state.puzzle.length; i++) {
      if (!state.puzzle[i]) { blanks++; if (state.values[i] === state.solution[i]) filled++; }
    }
    $('progressText').textContent = filled + ' / ' + blanks;
  }
  function selectCell(i) {
    if (!state || state.finished || isModalOpen()) return;
    state.sel = i; sfx('tap'); renderBoard(); saveState();
  }

  /* ==================== 彩带与鼓励 ==================== */
  function confetti(count) { try { confettiImpl(count); } catch (e) {} }
  function confettiImpl(count) {
    var c = $('confetti'), ctx = c.getContext('2d');
    c.width = window.innerWidth; c.height = window.innerHeight;
    var colors = ['#FF9A62', '#3FA9F5', '#2FBC91', '#A78BFA', '#FFC93C', '#FF7FA8'];
    var ps = [], i;
    for (i = 0; i < count; i++) {
      ps.push({
        x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5,
        w: 8 + Math.random() * 9, h: 10 + Math.random() * 12,
        vx: -1 + Math.random() * 2, vy: 2 + Math.random() * 3.4,
        rot: Math.random() * 6, vr: -0.12 + Math.random() * 0.24,
        color: colors[i % colors.length]
      });
    }
    var frames = 0;
    function tick() {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (++frames < 175) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, c.width, c.height);
    }
    tick();
  }
  function smallCheer() {
    $('cheer').textContent = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    $('cheer').classList.add('show');
    clearTimeout(cheerTimer);
    cheerTimer = setTimeout(function () { $('cheer').classList.remove('show'); }, 1500);
    confetti(26);
  }
  function checkUnits(i) {
    var cfg = SIZE_CFG[state.level.size], grid = currentGrid();
    var units = unitsOf(cfg).filter(function (u) { return u.indexOf(i) >= 0; });
    for (var k = 0; k < units.length; k++) {
      var key = units[k].join(',');
      if (state.celebrated.has(key)) continue;
      var done = units[k].every(function (x) { return grid[x] && grid[x] === state.solution[x]; });
      if (done) { state.celebrated.add(key); smallCheer(); return true; }
    }
    return false;
  }

  /* ==================== 游戏操作 ==================== */
  function inputValue(v) {
    if (!state || state.finished || isModalOpen()) return;
    var i = state.sel;
    if (state.puzzle[i]) { toast('这个数字是题目给的哦'); return; }
    if (state.values[i] === v) {
      state.values[i] = 0; sfx('erase'); saveState(); renderBoard(); return;
    }
    state.values[i] = v;
    if (v === state.solution[i]) {
      sfx('correct');
      void cells[i].offsetWidth;
      cells[i].classList.add('pop');
      checkUnits(i);
    } else {
      state.wrongs++;
      sfx('wrong');
      cells[i].classList.remove('wrong');
      void cells[i].offsetWidth;
      toast('再想一想，这个位置好像不对哦');
    }
    saveState(); renderBoard(); checkWin();
  }
  function erase() {
    if (!state || state.finished || isModalOpen()) return;
    var i = state.sel;
    if (state.puzzle[i]) { toast('题目给的数字不能擦掉哦'); return; }
    if (!state.values[i]) return;
    state.values[i] = 0; sfx('erase'); saveState(); renderBoard();
  }
  function hint() {
    if (!state || state.finished || isModalOpen()) return;
    var n = state.level.size, i = state.sel;
    if (state.puzzle[i] || state.values[i] === state.solution[i]) {
      i = -1;
      for (var k = 0; k < state.values.length; k++) {
        if (!state.puzzle[k] && state.values[k] !== state.solution[k]) { i = k; break; }
      }
    }
    if (i < 0) { toast('已经全部填好啦'); return; }
    state.sel = i; state.hints++; state.hinted.push(i);
    var v = state.solution[i];
    state.values[i] = v;
    sfx('hint');
    $('tipLine').textContent = '小提示：第 ' + (Math.floor(i / n) + 1) + ' 行第 ' + (i % n + 1) +
      ' 列填 ' + v + '，想想为什么吧';
    toast('小提示：这里填 ' + v);
    saveState(); renderBoard(); checkWin();
  }
  function restart() {
    if (!state || isModalOpen()) return;
    var L = state.level;
    state = newState(L, { puzzle: state.puzzle, solution: state.solution });
    prepareGameView(L);
    saveState();
    toast('这一关重新开始啦');
  }
  function checkWin() {
    for (var i = 0; i < state.puzzle.length; i++) {
      if (!state.puzzle[i] && state.values[i] !== state.solution[i]) return;
    }
    finishLevel();
  }
  function finishLevel() {
    if (state.finished) return;
    state.finished = true;
    var stars = (state.hints === 0 && state.wrongs === 0) ? 3 :
      ((state.hints + state.wrongs <= 3) ? 2 : 1);
    var id = state.level.id;
    progress.stars[id] = Math.max(progress.stars[id] || 0, stars);
    if (!progress.best[id] || state.seconds < progress.best[id]) progress.best[id] = state.seconds;
    saveProgress(); clearState();
    sfx('win'); confetti(150);
    showWinModal(stars);
    renderMap();
  }

  /* ==================== 弹窗 ==================== */
  function settingRow(label, desc, key, on) {
    return '<div class="set-row"><div><div class="lab">' + label + '</div><div class="desc">' + desc +
      '</div></div><button class="switch ' + (on ? 'on' : '') + '" data-toggle="' + key + '"><i></i></button></div>';
  }
  function showSettings() {
    var s = progress.settings;
    var themes = [['candy', '糖果'], ['ocean', '海洋'], ['forest', '森林'], ['night', '夜晚']];
    var chips = themes.map(function (t) {
      return '<button class="theme-chip ' + (s.theme === t[0] ? 'on' : '') + '" data-pick-theme="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    openModal('<h2>设置</h2><div class="sub">给家长和小朋友的小开关</div>' +
      settingRow('音效', '按键、答对和通关时的声音', 'sound', s.sound) +
      settingRow('背景音乐', '很轻的本地合成音乐，不联网', 'music', s.music) +
      settingRow('高亮同行列宫', '帮小朋友看清哪里不能重复', 'showPeer', s.showPeer) +
      settingRow('高亮相同数字', '同一个数字用同一种颜色', 'showSame', s.showSame) +
      settingRow('家长模式', '一次解锁全部 10 关', 'unlockedAll', s.unlockedAll) +
      '<div class="set-row"><div><div class="lab">界面配色</div><div class="desc">晚上可以换成「夜晚」</div></div></div>' +
      '<div class="theme-row">' + chips + '</div>' +
      '<div class="modal-btns"><button class="big-btn" data-act="reset">重置进度</button>' +
      '<button class="big-btn primary" data-act="close">好啦</button></div>');
  }
  function showWinModal(stars) {
    var L = state.level;
    var starHtml = [1, 2, 3].map(function (s) {
      return '<span class="' + (s <= stars ? '' : 'off') + '">★</span>';
    }).join('');
    var hasNext = L.id < LEVELS.length;
    var btns = '<button class="big-btn" data-act="map">关卡地图</button>' +
      '<button class="big-btn" data-act="replay">再玩一次</button>' +
      (hasNext ? '<button class="big-btn primary" data-act="next">下一关</button>' : '');
    openModal('<h2>' + (hasNext ? '太棒啦！' : '全部通关啦！') + '</h2>' +
      '<div class="sub">第 ' + L.id + ' 关 · ' + L.name + ' 完成</div>' +
      '<div class="win-stars">' + starHtml + '</div>' +
      '<div class="win-info"><div><b>' + fmtTime(state.seconds) + '</b><span>用时</span></div>' +
      '<div><b>' + state.hints + '</b><span>小提示</span></div>' +
      '<div><b>+' + stars + '</b><span>小星星</span></div></div>' +
      (hasNext ? '' : '<div class="sub" style="margin-top:14px">从 4×4 到 9×9，你全都完成啦，真厉害！</div>') +
      '<div class="modal-btns">' + btns + '</div>');
  }

  /* ==================== 事件 ==================== */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-close],[data-toggle],[data-pick-theme],[data-act]');
    if (!t || t === document.documentElement) return;
    if (t.dataset.close) { closeModal(); return; }
    if (t.dataset.toggle) {
      var key = t.dataset.toggle;
      progress.settings[key] = !progress.settings[key];
      saveProgress(); applySettings(); showSettings();
      if (state) renderBoard();
      return;
    }
    if (t.dataset.pickTheme) {
      progress.settings.theme = t.dataset.pickTheme;
      saveProgress(); applySettings(); showSettings();
      return;
    }
    var act = t.dataset.act;
    if (act === 'close') { closeModal(); }
    else if (act === 'map') { closeModal(); goMap(); }
    else if (act === 'replay') { startLevel(state.level.id); }
    else if (act === 'next') { startLevel(Math.min(LEVELS.length, state.level.id + 1)); }
    else if (act === 'resume') { var s = readState(); if (s) resumeGame(s); }
    else if (act === 'reset') {
      if (window.confirm('确定清空全部星星和闯关进度吗？')) {
        progress.stars = {}; progress.best = {};
        for (var k in DEFAULT_SETTINGS) progress.settings[k] = DEFAULT_SETTINGS[k];
        saveProgress(); clearState(); applySettings(); closeModal(); goMap();
        toast('进度已重置，从第 1 关重新开始吧');
      }
    }
  });
  $('mapSettings').addEventListener('click', showSettings);
  $('gameSettings').addEventListener('click', showSettings);
  $('backBtn').addEventListener('click', goMap);
  $('eraseBtn').addEventListener('click', erase);
  $('hintBtn').addEventListener('click', hint);
  $('restartBtn').addEventListener('click', restart);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (isModalOpen()) closeModal();
      else if ($('gameView').classList.contains('active')) goMap();
      return;
    }
    if (!state || isModalOpen() || !$('gameView').classList.contains('active')) return;
    var dm = (e.code || '').match(/^(?:Digit|Numpad)([1-9])$/);
    var digit = dm ? +dm[1] : (/^[1-9]$/.test(e.key) ? +e.key : 0);
    if (digit) { if (digit <= state.level.size) inputValue(digit); return; }
    var n = state.level.size;
    if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); erase(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); state.sel = Math.max(0, state.sel - n); renderBoard(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); state.sel = Math.min(n * n - 1, state.sel + n); renderBoard(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); state.sel = Math.max(0, state.sel - 1); renderBoard(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); state.sel = Math.min(n * n - 1, state.sel + 1); renderBoard(); }
    else if (e.key.toLowerCase() === 'h') hint();
  });
  window.addEventListener('resize', function () {
    var c = $('confetti'); c.width = window.innerWidth; c.height = window.innerHeight;
  });

  /* ==================== 启动 ==================== */
  loadProgress();
  applySettings();
  renderMap();
  showView('map');
  setInterval(function () {
    if (state && !state.finished && !isModalOpen() && !document.hidden &&
      $('gameView').classList.contains('active')) {
      state.seconds++;
      if (state.seconds % 5 === 0) saveState();
    }
  }, 1000);

  window.SudokuEngine = {
    SIZE_CFG: SIZE_CFG, LEVELS: LEVELS, unitsOf: unitsOf, boxOf: boxOf,
    makeMasks: makeMasks, allCandidates: allCandidates,
    countSolutions: countSolutions, generateFull: generateFull,
    logicalSolve: logicalSolve, generateLevel: generateLevel
  };
})();
