'use strict';
// Juego: escritorio + ventanas. Modos PURGE (1-3), OVERFLOW (4-6), GLITCH (7-9), CHAOS (10-12) y SERPENT (13).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  let uid = 0;

  function area() { const y0 = G.safeT + 2; return { x: 2, y: y0, w: G.W - 4, h: G.taskbarY() - y0 - 4 }; }

  const S = G.scenes.game = {};

  // ======================= ENTRADA =======================
  S.enter = function (p) {
    this.n = p.level; this.L = G.LEVELS[p.level];
    this.tier = this.n === 13 || this.L.p2 ? 0 : (p.tier || 0);
    this.cfg = G.scaleConfig(this.L, this.tier);
    this.block = this.L.block;
    this.wall = this.pickWall();
    this.stage = -1; this.stageFx = false;
    this.wins = []; this.ghosts = []; this.parts = []; this.pops = [];
    this.state = 'intro'; this.st = 0; this.elapsed = 0;
    this.time = this.cfg.time; this.closed = 0; this.score = 0; this.combo = 0; this.lastClose = -9; this.maxCombo = 0;
    this.spawnT = 0.4; this.lastBeep = 99; this.startDown = 0; this.pauseSel = -1;
    this.boss = null;
    A().music(G.MUSIC_BY_BLOCK[this.block]); A().intensity(0); A().muffle(false);
    this.applyFx(0);
    if (this.cfg.mode === 'serpent') this.initSnake();
    else this.intro = this.makeIntro();
    if (this.cfg.mode === 'micro') this.initMicro();
  };
  S.exit = function () { A().muffle(false); };
  // fondo: en la parte 2 es la placa del ordenador por dentro
  S.pickWall = function () { return this.block >= 4 ? G.wallpaper(4, 1) : G.randomWallpaper(this.block); };
  S.resize = function () {
    this.wall = this.pickWall();
    const ar = area();
    this.wins.forEach((w) => { w.w = Math.min(w.w, ar.w); w.x = G.clamp(w.x, ar.x, ar.x + ar.w - w.w); w.y = G.clamp(w.y, ar.y, ar.y + ar.h - w.h); });
    if (this.intro) this.intro = this.makeIntro();
    if (this.clearWin) this.clearWin = this.makeClear();
    if (this.pwin) this.makePause();
    if (this.cfg.mode === 'micro') this.layoutMicro();
  };
  S.blur = function () {
    if (this.cfg.mode === 'serpent') { if (this.state === 'play' || this.state === 'sGrow') { this.pState = this.state; this.state = 'play'; this.pause(); } return; }
    if (this.state === 'play') this.pause();
  };
  S.applyFx = function (prog) {
    const b = this.block;
    if (this.stageFx) { G.fx.abBase = 1.2 + prog * 1.2; G.fx.glitchBase = 0.04 + prog * 0.06; return; }
    G.fx.abBase = b === 3 ? 0.8 + prog * 1.2 : 0;
    G.fx.glitchBase = b === 3 ? 0.03 + prog * 0.06 : 0;
  };

  // ======================= NIVEL 1: 3 rondas (B/N → +azul → +verde con glitch) =======================
  S.startStage = function (i) {
    const sd = this.cfg.stages[i];
    this.stage = i; this.stageClosed = 0;
    Object.assign(this.cfg, { quota: sd.quota, time: sd.time, keep: sd.keep, maxOn: sd.maxOn, spawn: sd.spawn, types: sd.types, fake: sd.fake || 0, move: sd.move || 0, tele: sd.tele || 0 });
    this.block = sd.block; this.stageFx = !!sd.fx;
    this.wall = G.randomWallpaper(sd.block);
    this.time = sd.time; this.spawnT = 0.3; this.lastBeep = 99;
    A().intensity(0.2 + i * 0.35);
  };
  S.updateStage = function (dt) {
    this.sct += dt;
    if (this.wins.length && this.sct < 0.8) { this.swt -= dt; if (this.swt <= 0) { this.closeWin(this.wins[this.wins.length - 1], true); A().sfx('close', 6); this.swt = 0.05; } return; }
    if (this.sct > 1.9) { this.state = 'play'; G.pulse({ glitch: 0.6, ab: 3 }); }
  };
  S.nextStage = function () {
    this.state = 'stagechange'; this.sct = 0; this.swt = 0.1;
    this.startStage(this.stage + 1);
    A().sfx('cmd'); G.pulse({ glitch: 0.8, ab: 4, flash: 0.2, flashCol: W });
  };
  S.drawStageBanner = function () {
    if (this.sct < 0.5) return;
    const ar = area(), sd = this.cfg.stages[this.stage];
    const fs = Math.max(20, Math.floor(G.W / 6));
    const spr = G.fsprite('ROUND ' + (this.stage + 1), 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, W, 120);
    const bw = Math.min(G.W - 16, spr.width + 30), bh = spr.height + 36;
    const bx = Math.round(G.W / 2 - bw / 2), by = Math.round(ar.y + ar.h * 0.4 - bh / 2);
    const col = [K, B, Gr][sd.block] || K;
    G.rect(bx + 3, by + 3, bw, bh, K); G.rect(bx, by, bw, bh, col); G.box(bx, by, bw, bh, W);
    G.ctx().drawImage(spr, Math.round(G.W / 2 - spr.width / 2), by + 8);
    G.text('CLOSE ' + sd.quota + ' WINDOWS', G.W / 2, by + bh - 16, sd.block === 2 ? K : W, { al: 'c' });
  };

  // ======================= INTRO =======================
  S.makeIntro = function () {
    const micro = this.cfg.mode === 'micro';
    const w = Math.min(G.W - 16, 176), h = micro ? 132 + 64 + G.objectiveText(this.cfg).length * 9 - 27 : 132;
    const ar = area();
    const win = { x: Math.floor(G.W / 2 - w / 2), y: Math.floor(ar.y + ar.h / 2 - h / 2), w, h, st: G.WSTYLES[['m1', 'b2', 'g3', 'g4'][this.block] || 'm1'], title: 'SECTOR ' + G.pad(this.n, 2) + '.EXE', stripes: true, xmode: 'none' };
    win.btn = { x: win.x + w / 2 - 28, y: win.y + h - 22, w: 56, h: 15 };
    return win;
  };
  S.drawIntro = function () {
    const w = this.intro, s = w.st;
    const r = G.drawFrame(w);
    G.text(this.L.name, r.x + r.w / 2, r.y + 6, s.tx, { s: 2, al: 'c' });
    G.text('MODE: ' + G.MODE_NAMES[this.cfg.mode] + '   RUN: ' + G.TIERS[this.tier], r.x + r.w / 2, r.y + 26, s.tx, { al: 'c' });
    G.dash(r.x + 6, r.y + 37, r.w - 12, s.tx, 3, 2);
    let y = r.y + 43;
    if (this.cfg.mode === 'micro') {
      // explicación: dibujo animado del sector + instrucciones tipo HELP.TXT
      const ic = this.introIc || (this.introIc = G.mkCanvas(24, 20));
      const sch = G.CARD_SCHEMES[this.n];
      const bx = Math.round(r.x + r.w / 2 - 28);
      G.rect(bx, y, 56, 46, sch.ib); G.box(bx - 1, y - 1, 58, 48, s.tx);
      for (let gx = bx + 5; gx < bx + 56; gx += 6) G.drect(gx, y, 1, 46, 8, sch.grid, null);
      const T = G.ctx(); G.target(ic.x); ic.x.clearRect(0, 0, 24, 20); G.ICONS[this.n](this.t); G.target(T);
      T.drawImage(ic.c, bx + 4, y + 3, 48, 40);
      y += 52;
      G.rect(r.x + 4, y, 48, 9, s.tx); G.text('HELP.TXT', r.x + 6, y + 1, s.bd);
      y += 12;
    }
    G.objectiveText(this.cfg).forEach((ln, i) => G.text(ln, r.x + r.w / 2, y + i * 9, s.tx, { al: 'c' }));
    const b = w.btn, on = Math.floor(this.t * 3) % 2 === 0;
    G.drawBtn(b.x, b.y, b.w, b.h, 'START', s.tx, s.bd, false, { double: on });
  };
  S.begin = function () {
    this.state = 'play'; this.intro = null;
    A().sfx('glitch'); G.pulse({ glitch: 0.6, ab: 3 });
    if (this.cfg.mode === 'micro') { this.startRound(); return; }
    if (this.cfg.stages) this.startStage(0);
    if (this.cfg.variant === 'boss') this.spawnBoss();
  };

  // ======================= VENTANAS =======================
  S.theme = function () { return G.THEMES[this.n] || G.THEMES[1]; };
  S.makeWin = function (type, o) {
    o = o || {};
    const th = this.theme(), ar = area(), Wd = G.W;
    const w = { id: ++uid, type, st: G.randStyle(this.block), title: G.pick(th.titles), xl: G.chance(0.22), stripes: G.chance(0.55), btns: [], born: this.elapsed, xmode: 'x' };
    const cw = (v) => Math.min(ar.w - 6, v);
    const msg = () => (G.chance(0.8) ? G.pick(th.msgs) : G.pick(G.GENERIC_MSGS));
    const btnRow = (labels, acts) => {
      const bw = 40, gap = 6, tot = labels.length * bw + (labels.length - 1) * gap;
      labels.forEach((lb, i) => w.btns.push({ lbl: lb, x: Math.floor(w.w / 2 - tot / 2) + i * (bw + gap), y: w.h - 18, w: bw, h: 13, act: acts[i] }));
    };
    switch (type) {
      case 'error': case 'hydra': {
        w.w = cw(128); w.h = 56; w.title = type === 'hydra' ? 'LOOP.EXE' : G.chance(0.5) ? 'ERROR' : w.title;
        w.lines = G.wrap(type === 'hydra' ? 'CLOSE ME AND I COME BACK TWICE' : msg(), w.w - 26).slice(0, 2);
        if (G.chance(0.5)) btnRow(['OK'], ['close']); else btnRow(['RETRY', 'CANCEL'], ['close', 'close']);
        break; }
      case 'warn': { w.w = cw(128); w.h = 56; w.title = G.chance(0.5) ? 'WARNING' : w.title; w.lines = G.wrap(msg(), w.w - 28).slice(0, 2); btnRow(['OK'], ['close']); break; }
      case 'big': {
        w.word = G.pick(th.bigs); w.jp = /[^\x00-\x7F]/.test(w.word) && w.word !== '∞';
        w.w = cw(w.jp ? 116 : Math.max(96, G.textW(w.word, 3, 1, true) + 24)); w.h = 62; w.heavy = !w.jp && G.chance(0.45);
        break; }
      case 'loading': { w.w = cw(128); w.h = 60; w.title = 'LOADING'; w.prog = 0; w.rate = 1 / G.rand(2.4, 3.8); btnRow(['CANCEL'], ['cancelLoad']); break; }
      case 'copying': { w.w = cw(150); w.h = 78; w.title = 'COPYING...'; w.prog = 0; w.rate = 1 / G.rand(5.5, 7.5) * this.cfg.speed; w.file = G.pick(['FILE.EXE', 'HAPPY.EXE', 'VOID.DLL', 'SOUL.SYS', 'TIME.DAT']); btnRow(['CANCEL'], ['close']); break; }
      case 'fix': { w.w = cw(128); w.h = 62; w.title = 'ERROR'; btnRow(['FIX'], ['close']); w.xmode = 'fix'; break; }
      case 'login': { w.w = cw(142); w.h = 80; w.title = G.chance(0.5) ? 'LOGIN' : 'WELCOME'; btnRow(['OK', 'CANCEL'], ['wrong', 'close']); break; }
      case 'smiley': { w.w = 76; w.h = 86; w.title = G.chance(0.5) ? 'HAPPY?' : 'SMILE'; btnRow(['OK'], ['close']); w.tear = G.chance(0.6); break; }
      case 'pics': { w.w = cw(124); w.h = 92; w.title = G.pick(['PICS', 'MEMORIES', 'C:/LIFE']); break; }
      case 'timer': { w.w = cw(124); w.h = 60; w.title = 'TIME.EXE'; w.cd = 4 / this.cfg.speed; w.thief = true; break; }
      case 'confirmroot': { w.w = cw(128); w.h = 56; w.title = 'LEAVING?'; w.lines = ['ARE YOU REALLY', 'LEAVING ME?']; w.xmode = 'confirm'; break; }
      case 'confirm': { w.w = cw(122); w.h = 56; w.title = 'CONFIRM'; w.lines = ['ARE YOU SURE?']; btnRow(['YES', 'NO'], ['yes', 'no']); w.xmode = 'none'; w.parent = o.parent; break; }
      case 'mini': { w.w = 66; w.h = 34; w.title = 'AGAIN'; w.stripes = false; w.xl = false; break; }
      case 'wrong': { w.w = cw(124); w.h = 56; w.title = 'ERROR'; w.lines = ['WRONG PASSWORD', 'TRY NEVER']; btnRow(['OK'], ['close']); w.type = 'error'; break; }
    }
    // posición: aleatoria o en cascada
    const last = this.wins[this.wins.length - 1];
    if (o.x != null) { w.x = o.x; w.y = o.y; }
    else if (last && G.chance(0.25)) { w.x = last.x + 9; w.y = last.y + 9; }
    else { w.x = G.rand(ar.x, ar.x + ar.w - w.w); w.y = G.rand(ar.y, ar.y + ar.h - w.h); }
    w.x = Math.round(G.clamp(w.x, ar.x, ar.x + ar.w - w.w)); w.y = Math.round(G.clamp(w.y, ar.y, ar.y + ar.h - w.h));
    return w;
  };
  S.addWin = function (w, quiet) {
    this.wins.push(w);
    if (!quiet) { A().sfx('spawn', w.type === 'warn' ? 1 : w.type === 'timer' ? 2 : G.irand(0, 2)); }
    return w;
  };
  S.spawnOne = function () {
    const c = this.cfg;
    let type = G.wpick(c.types);
    if (c.thief && G.chance(c.thief)) type = 'timer';
    else if (c.hydra && G.chance(c.hydra)) type = 'hydra';
    else if (c.confirm && G.chance(c.confirm)) type = 'confirmroot';
    const w = this.makeWin(type);
    if (c.fake && ['error', 'warn', 'big', 'pics', 'smiley'].includes(type) && G.chance(c.fake)) w.fakeX = G.chance(0.5) ? 'L' : 'R';
    if (c.move && G.chance(c.move)) {
      w.mv = true; const sp = G.rand(14, 30) * c.speed, a = G.rand(0, Math.PI * 2);
      w.vx = Math.cos(a) * sp; w.vy = Math.sin(a) * sp; w.tele = c.tele ? G.rand(1.4, 3) : 0;
    }
    this.addWin(w);
  };

  // ======================= JEFE (sector 12) =======================
  S.spawnBoss = function () {
    const ar = area();
    const w = { id: ++uid, type: 'boss', st: G.WSTYLES.b3, title: 'VIRUS DETECTED', stripes: true, xl: false, btns: [], xmode: 'boss', w: Math.min(ar.w - 6, 170), h: 128 };
    w.x = Math.round(G.W / 2 - w.w / 2); w.y = Math.round(ar.y + 10);
    w.hp = this.cfg.bossHP; w.maxHp = w.hp; w.hits = 0; w.infect = 2.2;
    this.boss = w; this.addWin(w, true);
    A().sfx('toun'); G.pulse({ shake: 6, glitch: 0.8 });
  };
  S.bossHit = function (w) {
    w.hp--; w.hits++; w.hurt = 0.12; this.score += 15;
    A().sfx('hit'); G.pulse({ shake: 3, ab: 2 }); G.vibrate(15);
    this.burst(w.x + w.w / 2, w.y + w.h / 2, w.st.fr, 6);
    if (w.hp <= 0) { this.closeWin(w, true); this.boss = null; this.win(); return; }
    if (w.hits % 6 === 0) { // teletransporte + esbirros
      const ar = area();
      w.x = Math.round(G.rand(ar.x, ar.x + ar.w - w.w)); w.y = Math.round(G.rand(ar.y, ar.y + ar.h - w.h));
      A().sfx('glitch'); G.pulse({ glitch: 0.9 });
      for (let i = 0; i < 1 + Math.floor(this.tier / 2); i++) this.spawnOne();
      const i = this.wins.indexOf(w); this.wins.splice(i, 1); this.wins.push(w);
    }
  };

  // ======================= ACCIONES =======================
  S.closeWin = function (w, noCount) {
    const i = this.wins.indexOf(w); if (i < 0) return;
    this.wins.splice(i, 1); w.dead = true;
    if (w.children) w.children.forEach((c) => { const j = this.wins.indexOf(c); if (j >= 0) this.wins.splice(j, 1); });
    this.ghosts.push({ x: w.x, y: w.y, w: w.w, h: w.h, t: 0, col: w.st.fr === K ? (this.block === 0 ? W : K) : w.st.fr });
    if (noCount) return;
    if (this.elapsed - this.lastClose < 1.1) this.combo++; else this.combo = 1;
    this.lastClose = this.elapsed; this.maxCombo = Math.max(this.maxCombo, this.combo);
    const mult = Math.min(5, 1 + Math.floor(this.combo / 4));
    this.score += 10 * mult; this.closed++;
    A().sfx('close', this.combo); G.vibrate(8);
    if (this.combo > 1 && this.combo % 4 === 0) { A().sfx('combo'); this.pop(w.x + w.w / 2, w.y + 4, 'x' + mult, w.st.bt); }
    this.burst(w.x + w.w / 2, w.y + 6, w.st.bar === K ? (this.block === 0 ? W : w.st.fr) : w.st.bar, 5);
    if (w.type === 'hydra') {
      for (let k = 0; k < 2; k++) { const m = this.makeWin('mini', { x: w.x + (k ? w.w - 66 : 0) + G.irand(-6, 6), y: w.y + G.irand(4, 24) }); if (w.mv) { m.mv = true; m.vx = G.rand(-30, 30); m.vy = G.rand(-30, 30); } this.addWin(m, true); }
      A().sfx('spawn', 2);
    }
    const c = this.cfg;
    if (c.stages) {
      this.stageClosed++;
      if (this.state === 'play' && this.stageClosed >= c.quota) { if (this.stage < c.stages.length - 1) this.nextStage(); else this.win(); }
    } else if (c.quota && this.closed >= c.quota && c.variant !== 'boss') this.win();
  };
  S.penalty = function (sec, x, y, txt) {
    this.time = Math.max(0, this.time - sec);
    this.pop(x, y, txt || '-' + sec + 's', this.block === 0 ? W : Gr);
    G.pulse({ shake: 5, glitch: 0.5, ab: 3 }); G.vibrate(40);
  };
  S.onX = function (w) {
    if (w.xmode === 'fix' || w.xmode === 'boss') return this.onFake(w);
    if (w.xmode === 'confirm') {
      if (!w.children || !w.children.length || w.children.every((c) => c.dead)) {
        const c = this.makeWin('confirm', { parent: w, x: w.x + 10, y: w.y + 18 });
        w.children = [c]; this.addWin(c);
      }
      return;
    }
    if (w.type === 'loading' && this.cfg.mode !== 'purge' && w.prog < 1) { A().sfx('deny'); this.pop(w.x + w.w / 2, w.y + 20, 'WAIT', w.st.tx); w.shake = 0.2; return; }
    this.closeWin(w);
  };
  S.onFake = function (w) {
    A().sfx('fake');
    if (w.type === 'boss') { for (let i = 0; i < 2; i++) this.spawnOne(); this.penalty(3, w.x + w.w / 2, w.y + 20); return; }
    if (this.cfg.mode === 'purge') { this.addWin(this.makeWin('fix')); this.pop(w.x + w.w / 2, w.y + 20, 'NOPE', w.st.tx); G.pulse({ shake: 3 }); return; }
    this.penalty(2, w.x + w.w / 2, w.y + 20);
    if (G.chance(0.6)) this.spawnOne();
  };
  S.onBtn = function (w, b) {
    switch (b.act) {
      case 'close': this.closeWin(w); break;
      case 'cancelLoad': this.onX(w); break;
      case 'wrong': { this.closeWin(w); const e = this.makeWin('wrong', { x: w.x + 8, y: w.y + 10 }); this.addWin(e); break; }
      case 'yes': { const p = w.parent; this.closeWin(w, true); if (p) { p.children = null; this.closeWin(p); } break; }
      case 'no': { this.closeWin(w, true); A().sfx('deny'); if (w.parent) w.parent.children = null; this.addWin(this.makeWin('confirmroot')); break; }
    }
  };

  // ======================= PARTÍCULAS / POPUPS =======================
  S.burst = function (x, y, col, n) { for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: G.rand(-60, 60), vy: G.rand(-80, 10), t: 0, life: G.rand(0.25, 0.5), col }); };
  S.pop = function (x, y, txt, col) { this.pops.push({ x, y, txt, col, t: 0 }); };

  // ======================= UPDATE =======================
  S.update = function (dt) {
    this.st += dt;
    this.ghosts.forEach((g) => (g.t += dt)); this.ghosts = this.ghosts.filter((g) => g.t < 0.14);
    this.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }); this.parts = this.parts.filter((p) => p.t < p.life);
    this.pops.forEach((p) => (p.t += dt)); this.pops = this.pops.filter((p) => p.t < 0.9);
    if (this.startDown > 0) this.startDown -= dt;
    if (this.cfg.mode === 'serpent') return this.updateSnake(dt);
    if (this.cfg.mode === 'micro' && this.state === 'play') return this.updateMicro(dt);
    if (this.state === 'stagechange') return this.updateStage(dt);
    if (this.state === 'winning') {
      this.wt -= dt;
      if (this.wt <= 0) {
        if (this.wins.length) { this.closeWin(this.wins[this.wins.length - 1], true); A().sfx('close', 6); this.wt = 0.05; }
        else { this.state = 'clear'; A().sfx('clear'); this.st = 0; if (this.n === 12) this.takeover = 0; }
      }
      return;
    }
    if (this.state === 'clear') {
      if (this.n === 12) { this.takeover += dt; G.fx.glitchBase = Math.min(1, this.takeover * 0.35); G.fx.abBase = 1 + this.takeover * 2; if (this.takeover > 2.6) G.go('game', { level: 13 }); }
      else { G.fx.abBase = Math.min(G.fx.abBase, 0.4); G.fx.glitchBase = 0; } // que se lea bien la ventana de resultados
      return;
    }
    if (this.state === 'losing') { this.lt -= dt; if (this.lt <= 0) G.go('gameover', { level: this.n, reason: this.loseReason, closed: this.closed, score: this.score, left: this.cfg.mode === 'micro' ? this.rounds - this.closed : this.wins.length }); return; }
    if (this.state !== 'play') return;

    const c = this.cfg; this.elapsed += dt;
    this.time -= dt;
    const ar = area();
    // movimiento / glitch / temporizadores
    for (const w of this.wins) {
      if (w.shake) w.shake = Math.max(0, w.shake - dt);
      if (w.mv) {
        w.x += w.vx * dt; w.y += w.vy * dt;
        if (w.x < ar.x) { w.x = ar.x; w.vx = Math.abs(w.vx); } if (w.x + w.w > ar.x + ar.w) { w.x = ar.x + ar.w - w.w; w.vx = -Math.abs(w.vx); }
        if (w.y < ar.y) { w.y = ar.y; w.vy = Math.abs(w.vy); } if (w.y + w.h > ar.y + ar.h) { w.y = ar.y + ar.h - w.h; w.vy = -Math.abs(w.vy); }
        if (w.tele) { w.tele -= dt; if (w.tele <= 0) { w.tele = G.rand(1.4, 3) / c.speed; w.x = G.clamp(w.x + G.rand(-50, 50), ar.x, ar.x + ar.w - w.w); w.y = G.clamp(w.y + G.rand(-60, 60), ar.y, ar.y + ar.h - w.h); w.gl = 0.15; G.pulse({ glitch: 0.25 }); } }
      }
      if (w.gl) w.gl = Math.max(0, w.gl - dt);
      if (w.prog != null && w.prog < 1) { w.prog = Math.min(1, w.prog + w.rate * dt); }
      if (w.type === 'copying' && w.prog >= 1) { w.prog = 0; for (let k = 0; k < 2; k++) this.addWin(this.makeWin(G.wpick(c.types) === 'copying' ? 'error' : G.wpick(c.types))); this.pop(w.x + w.w / 2, w.y + 20, 'COPIED x2', w.st.tx); }
      if (w.thief) { w.cd -= dt; if (w.cd <= 0) { w.cd = 4 / c.speed; A().sfx('steal'); this.penalty(3, w.x + w.w / 2, w.y + 14); } }
      if (w.type === 'boss') { w.infect -= dt; if (w.hurt) w.hurt = Math.max(0, w.hurt - dt); if (w.infect <= 0) { w.infect = G.rand(4.0, 5.0) / (1 + 0.1 * this.tier); this.spawnOne(); const i = this.wins.indexOf(w); this.wins.splice(i, 1); this.wins.push(w); } }
    }
    // generación
    let prog, load = c.cap ? this.wins.length / c.cap : 0;
    if (c.variant === 'boss') prog = this.boss ? 1 - this.boss.hp / this.boss.maxHp : 1;
    else if (c.quota) prog = this.closed / c.quota;
    else prog = this.elapsed / c.time;
    prog = G.clamp(prog, 0, 1);
    const keepMode = c.mode === 'purge' || c.mode === 'glitch' || c.variant === 'link';
    this.spawnT -= dt;
    if (keepMode) {
      if (this.wins.length < c.keep) this.spawnT = Math.min(this.spawnT, 0.16);
      if (this.spawnT <= 0) { if (this.wins.length < c.maxOn) this.spawnOne(); this.spawnT = G.lerp(c.spawn[0], c.spawn[1], prog) * G.rand(0.7, 1.3); }
    } else if (this.spawnT <= 0) {
      this.spawnOne(); if (G.chance(0.08 + 0.15 * prog)) this.spawnOne();
      this.spawnT = G.lerp(c.spawn[0], c.spawn[1], prog) * G.rand(0.75, 1.25);
    }
    A().intensity(Math.max(prog, load));
    this.applyFx(prog);
    // pitidos de cuenta atrás
    const sec = Math.ceil(this.time);
    if (sec <= 5 && sec !== this.lastBeep && this.time > 0) { this.lastBeep = sec; A().sfx('beepT'); }
    // fin
    if (c.cap && this.wins.length > c.cap) return this.lose('SYSTEM OVERLOAD');
    if (this.time <= 0) {
      if (c.mode === 'overflow' || c.variant === 'loop') return this.win();
      return this.lose('TIME OUT');
    }
  };

  S.win = function () {
    if (this.state !== 'play') return;
    this.state = 'winning'; this.wt = 0.25;
    const micro = this.cfg.mode === 'micro';
    const bonus = micro ? this.lives * 200 : Math.max(0, Math.round(this.time)) * 20 * (this.cfg.mode === 'overflow' || this.cfg.variant === 'loop' ? 0 : 1);
    const surv = this.cfg.mode === 'overflow' || this.cfg.variant === 'loop' ? 500 : 0;
    this.bonus = bonus + surv; this.score = Math.round((this.score + this.bonus) * (1 + 0.5 * this.tier));
    const sv = G.save, l = sv.lv(this.n);
    this.prevBest = l.best; l.best = Math.max(l.best, this.score); l.clears++;
    this.oldTier = this.tier; l.tier = Math.min(3, Math.max(l.tier, this.tier + 1));
    if (!this.L.p2) sv.data.unlocked = Math.max(sv.data.unlocked, Math.min(12, this.n + 1));
    sv.write();
    G.pulse({ flash: 0.4, flashCol: W });
    this.clearWin = this.makeClear();
  };
  S.lose = function (reason) {
    if (this.state !== 'play') return;
    this.state = 'losing'; this.lt = 0.45; this.loseReason = reason;
    A().sfx('glitch'); G.pulse({ glitch: 1, ab: 5, shake: 8 });
  };
  S.pause = function () {
    if (this.state !== 'play') return;
    this.state = 'paused'; A().muffle(true); A().sfx('tap');
    this.makePause();
  };
  S.makePause = function () {
    const w = Math.min(G.W - 30, 140), h = 104, ar = area();
    this.pwin = { x: Math.floor(G.W / 2 - w / 2), y: Math.floor(ar.y + ar.h / 2 - h / 2), w, h, st: G.WSTYLES[['m1', 'b2', 'g3', 'g4', 'm1'][this.block]], title: 'PAUSE', stripes: true, xmode: 'x' };
    const bw = w - 40;
    this.pbtns = ['RESUME', 'RESTART', 'QUIT'].map((lb, i) => ({ lbl: lb, x: this.pwin.x + 20, y: this.pwin.y + 34 + i * 20, w: bw, h: 15 }));
  };
  S.resume = function () { this.state = 'play'; A().muffle(false); A().sfx('tap'); };
  S.makeClear = function () {
    const w = Math.min(G.W - 16, 170), h = 138, ar = area();
    const win = { x: Math.floor(G.W / 2 - w / 2), y: Math.floor(ar.y + ar.h / 2 - h / 2), w, h, st: G.WSTYLES[['m1', 'b2', 'g3', 'g4'][this.block] || 'm1'], title: 'SECTOR CLEARED', stripes: true, xmode: 'none' };
    const bw = 60;
    win.btns = this.n === 12 ? [] : [{ lbl: 'NEXT', x: win.x + w / 2 - bw - 4, y: win.y + h - 21, w: bw, h: 15, act: 'next' }, { lbl: this.L.p2 ? 'BACK' : 'SECTORS', x: win.x + w / 2 + 4, y: win.y + h - 21, w: bw, h: 15, act: 'sectors' }];
    if (this.L.p2 && this.n >= G.P2_LAST) win.btns.shift(); // último juego de la prueba: solo volver
    return win;
  };

  // ======================= DIBUJO =======================
  S.drawBody = function (w, r) {
    const s = w.st, t = G.time;
    switch (w.type) {
      case 'error': case 'hydra': case 'warn': {
        if (w.type === 'warn') G.drawSpr('warn', r.x + 5, r.y + 4, { '#': s.ac });
        else G.drawSpr('xcirc', r.x + 6, r.y + 5, { '#': s.ac });
        (w.lines || []).forEach((ln, i) => G.text(ln, r.x + 21, r.y + 5 + i * 9, s.tx));
        break; }
      case 'confirmroot': case 'confirm':
        G.drawSpr('warn', r.x + 5, r.y + 4, { '#': s.ac });
        (w.lines || []).forEach((ln, i) => G.text(ln, r.x + 21, r.y + 5 + i * 9, s.tx));
        break;
      case 'big': {
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        if (w.jp) { const sp = G.fsprite(w.word, '24px ' + G.FONT_JP, s.tx, 110); G.ctx().drawImage(sp, Math.floor(cx - sp.width / 2), Math.floor(cy - sp.height / 2)); }
        else if (w.heavy) { const sp = G.fsprite(w.word, 'italic 900 26px ' + G.FONT_HEAVY, s.tx, 120); const k = Math.min(1, (r.w - 6) / sp.width); G.ctx().drawImage(sp, Math.floor(cx - (sp.width * k) / 2), Math.floor(cy - (sp.height * k) / 2), Math.floor(sp.width * k), Math.floor(sp.height * k)); }
        else G.text(w.word, cx, cy - 10, s.tx, { s: 3, al: 'c', b: true });
        break; }
      case 'loading': {
        G.text('LOADING' + '...'.slice(0, Math.floor(t * 3) % 4), r.x + 8, r.y + 5, s.tx);
        const bw = r.w - 16, f = Math.floor((bw - 4) * w.prog);
        G.box(r.x + 8, r.y + 16, bw, 9, s.tx);
        for (let i = 0; i < f; i += 4) G.rect(r.x + 10 + i, r.y + 18, 3, 5, s.tx);
        if (w.prog >= 1) G.text('DONE', r.x + r.w - 9, r.y + 5, s.tx, { al: 'r' });
        else if (this.cfg.mode !== 'purge') G.drawSpr(Math.floor(t * 2) % 2 ? 'hg1' : 'hg2', r.x + r.w - 15, r.y + 4, { '#': s.tx, o: s.tx });
        break; }
      case 'copying': {
        G.text(w.file, r.x + 8, r.y + 4, s.tx, { b: true });
        G.text('FROM "C:/" TO "VOID"', r.x + 8, r.y + 14, s.tx);
        const bw = r.w - 16, f = Math.floor((bw - 4) * w.prog);
        G.box(r.x + 8, r.y + 24, bw, 9, s.tx);
        for (let i = 0; i < f; i += 4) G.rect(r.x + 10 + i, r.y + 26, 3, 5, s.tx);
        G.text(Math.max(1, Math.ceil((1 - w.prog) * 24)) + ' HOURS REMAINING', r.x + 8, r.y + 36, s.tx);
        break; }
      case 'fix':
        G.drawSpr('xcirc', r.x + 6, r.y + 5, { '#': s.ac });
        G.text('CLICK "FIX"', r.x + 21, r.y + 5, s.tx); G.text('TO FIX ERROR', r.x + 21, r.y + 14, s.tx);
        break;
      case 'login':
        G.text('TYPE USER & PASSWORD', r.x + r.w / 2, r.y + 4, s.tx, { al: 'c' });
        G.text('USER', r.x + 6, r.y + 17, s.tx); G.box(r.x + 34, r.y + 15, r.w - 40, 10, s.tx); G.text('NEO_' + this.n, r.x + 37, r.y + 17, s.tx);
        G.text('PASS', r.x + 6, r.y + 30, s.tx); G.box(r.x + 34, r.y + 28, r.w - 40, 10, s.tx); G.text('*'.repeat(Math.floor(t * 4) % 9), r.x + 37, r.y + 30, s.tx);
        break;
      case 'smiley': {
        G.drawSpr('smiley', r.x + r.w / 2 - 22, r.y + 3, { '#': s.tx, o: w.tear ? s.ac : null }, 3);
        break; }
      case 'pics': {
        const cols = Math.floor((r.w - 14) / 26);
        for (let i = 0; i < cols * 3; i++) {
          const cx = r.x + 4 + (i % cols) * 26, cy = r.y + 3 + Math.floor(i / cols) * 24;
          if (cy + 20 > r.y + r.h) break;
          G.drawSpr('pic', cx + 5, cy, { '#': s.tx });
          G.text('p' + String(i + 1).padStart(2, '0'), cx + 2, cy + 12, s.tx);
        }
        G.box(r.x + r.w - 9, r.y, 9, r.h, s.tx); G.checker(r.x + r.w - 8, r.y + 10 + Math.floor((t * 8) % (r.h - 30)), 7, 14, s.tx, s.bd);
        break; }
      case 'timer': {
        G.drawSpr(Math.floor(t * 3) % 2 ? 'hg1' : 'hg2', r.x + 6, r.y + 6, { '#': s.ac, o: s.ac }, 2);
        G.text('STEALING', r.x + 26, r.y + 5, s.tx); G.text('YOUR TIME', r.x + 26, r.y + 14, s.tx);
        const n = Math.ceil(w.cd), urgent = w.cd < 1.2 && Math.floor(t * 8) % 2;
        G.text(String(n), r.x + r.w - 8, r.y + 7, urgent ? s.bd : s.tx, { s: 3, al: 'r', b: true });
        if (urgent) G.box(r.x + 1, r.y + 1, r.w - 2, r.h - 2, s.tx);
        break; }
      case 'mini': G.text('AGAIN', r.x + r.w / 2, r.y + 6, s.tx, { al: 'c' }); break;
      case 'boss': {
        const hurt = w.hurt > 0;
        const sx = r.x + r.w / 2 - 33, sy = r.y + 4;
        G.drawSpr('skull', sx + (hurt ? G.irand(-2, 2) : 0), sy, { '#': hurt ? Gr : s.tx }, 3);
        const eyeOn = Math.floor(t * 4) % 2;
        if (eyeOn) { G.rect(sx + 15, sy + 27, 6, 6, Gr); G.rect(sx + 45, sy + 27, 6, 6, Gr); }
        const bw = r.w - 12, f = Math.round((bw - 2) * (w.hp / w.maxHp));
        G.text('INFECTION', r.x + 6, r.y + r.h - 20, s.tx); G.text(String(w.hp), r.x + r.w - 6, r.y + r.h - 20, s.tx, { al: 'r' });
        G.box(r.x + 6, r.y + r.h - 10, bw, 7, s.tx); G.drect(r.x + 7, r.y + r.h - 9, f, 5, 10, Gr, s.tx);
        w.skull = { x: sx, y: sy, w: 66, h: 63 };
        break; }
    }
    for (const b of w.btns) G.drawBtn(Math.round(w.x) + b.x, Math.round(w.y) + b.y, b.w, b.h, b.lbl, s.tx, s.bd);
  };
  S.drawWin = function (w) {
    let ox = 0;
    if (w.shake) ox = G.irand(-2, 2);
    if (w.mv && this.block >= 2 && Math.random() < 0.04) ox += G.irand(-3, 3);
    const x0 = w.x; w.x += ox;
    const r = G.drawFrame(w);
    this.drawBody(w, r);
    if (w.gl) { G.drect(w.x, w.y + G.irand(0, w.h - 6), w.w, 4, 8, G.pick([Gr, B, W]), null); }
    w.x = x0;
  };
  S.draw = function (g) {
    if (this.cfg.mode === 'serpent') return this.drawSnake(g);
    if (this.cfg.mode === 'micro') return this.drawMicro(g);
    g.drawImage(this.wall, 0, 0);
    if (this.block === 3 && Math.random() < 0.08) { const y = G.irand(0, G.H - 10), h = G.irand(2, 8); g.drawImage(this.wall, 0, y, G.W, h, G.irand(-12, 12), y, G.W, h); }
    G.drawDesktopIcons(this.block, area().y);
    // las ventanas flotan un poco con el giroscopio
    const to = this.tiltOff(), T = G.ctx();
    T.save(); T.translate(to.x, to.y);
    for (const w of this.wins) this.drawWin(w);
    for (const gh of this.ghosts) { const k = 1 - gh.t / 0.14; for (let i = 0; i < 2; i++) { const kk = k - i * 0.25; if (kk <= 0) continue; const ww = gh.w * kk, hh = gh.h * kk; G.box(gh.x + (gh.w - ww) / 2, gh.y + (gh.h - hh) / 2, ww, hh, gh.col); } }
    for (const p of this.parts) G.rect(p.x, p.y, 2, 2, p.col);
    for (const p of this.pops) G.text(p.txt, p.x, p.y - p.t * 22, p.col, { al: 'c', b: true });
    T.restore();
    if (this.state === 'stagechange') this.drawStageBanner();
    // HUD en barra de tareas
    const c = this.cfg, info = { time: this.time, startDown: this.startDown > 0 };
    if (c.variant === 'boss') { info.label = 'VIRUS ' + (this.boss ? this.boss.hp : 0); info.meter = c.cap ? this.wins.length / c.cap : null; }
    else if (c.stages) info.label = 'R' + (this.stage + 1) + ' ' + Math.min(this.stageClosed || 0, c.quota) + '/' + c.quota;
    else if (c.quota) { info.label = this.closed + '/' + c.quota; if (c.cap) info.meter = this.wins.length / c.cap; }
    else { info.label = 'LOAD'; info.meter = this.wins.length / c.cap; }
    G.drawTaskbar(this.block, info);
    if (this.state === 'intro') { this.dim(); this.drawIntro(); }
    if (this.state === 'paused') { this.dim(); this.drawPause(); }
    if (this.state === 'clear') this.drawClear();
    if (this.combo >= 4 && this.state === 'play') G.text('COMBO x' + Math.min(5, 1 + Math.floor(this.combo / 4)), G.W - 4, area().y + 2, this.block === 0 ? W : Gr, { al: 'r' });
  };
  S.dim = function () { G.drect(0, 0, G.W, G.taskbarY(), 8, K, null); };
  S.tiltOff = function () { const a = this.cfg.tilt || 0; return { x: Math.round(G.tilt.x * a), y: Math.round(G.tilt.y * a) }; };
  S.drawPause = function () {
    const w = this.pwin, s = w.st, r = G.drawFrame(w);
    G.text('- PAUSE -', r.x + r.w / 2, r.y + 6, s.tx, { al: 'c', b: true });
    this.pbtns.forEach((b, i) => G.drawBtn(b.x, b.y, b.w, b.h, b.lbl, s.tx, s.bd, this.pauseSel === i));
  };
  S.drawClear = function () {
    const w = this.clearWin, s = w.st, r = G.drawFrame(w);
    const lines = [
      this.cfg.mode === 'micro' ? ['ROUNDS', this.closed + '/' + this.rounds] : ['CLOSED', String(this.closed)],
      this.cfg.mode === 'micro' ? ['LIVES LEFT', '♥'.repeat(Math.max(0, this.lives))] : ['MAX COMBO', 'x' + this.maxCombo],
      ['BONUS', '+' + this.bonus],
      ['RUN', G.TIERS[this.oldTier] + (this.tier > 0 ? ' x' + (1 + 0.5 * this.tier) : '')],
    ];
    G.text('SCORE', r.x + r.w / 2, r.y + 4, s.tx, { al: 'c' });
    G.text(G.pad(this.score, 6), r.x + r.w / 2, r.y + 13, s.tx, { s: 2, al: 'c' });
    lines.forEach(([a, b], i) => { G.text(a, r.x + 8, r.y + 34 + i * 9, s.tx); G.text(b, r.x + r.w - 8, r.y + 34 + i * 9, s.tx, { al: 'r' }); });
    if (this.score > this.prevBest) { if (Math.floor(this.st * 4) % 2 === 0) G.text('NEW RECORD', r.x + r.w / 2, r.y + 72, s.tx, { al: 'c', b: true }); }
    const nt = Math.min(3, this.oldTier + 1);
    if (this.L.p2) G.text('GAME+  -  CORE', r.x + r.w / 2, r.y + 84, s.tx, { al: 'c' });
    else if (this.n !== 12) G.text(this.oldTier >= 3 ? 'OMEGA+ MASTERED' : 'NEXT RUN: ' + G.TIERS[nt], r.x + r.w / 2, r.y + 84, s.tx, { al: 'c' });
    else G.text('SOMETHING IS WAKING UP', r.x + r.w / 2, r.y + 84 + (Math.random() < 0.2 ? 1 : 0), s.tx, { al: 'c' });
    w.btns.forEach((b) => G.drawBtn(b.x, b.y, b.w, b.h, b.lbl, s.tx, s.bd));
  };

  // ======================= TOQUES =======================
  S.tap = function (x, y, e) {
    if (this.cfg.mode === 'serpent') return this.tapSnake(x, y);
    if (this.state === 'intro') { if (this.t > 0.3) { A().sfx('tap'); this.begin(); } return; }
    if (this.state === 'paused') {
      const xr = G.xRect(this.pwin);
      if (G.inR(x, y, xr, 4)) return this.resume();
      this.pbtns.forEach((b, i) => { if (G.inR(x, y, b, 2)) { this.pauseSel = i; if (i === 0) this.resume(); else if (i === 1) { A().sfx('tap'); G.go('game', { level: this.n, tier: this.tier }); } else { A().sfx('back'); G.go(this.L.p2 ? 'core' : 'sectors'); } } });
      return;
    }
    if (this.state === 'clear') {
      for (const b of this.clearWin.btns) if (G.inR(x, y, b, 2)) {
        A().sfx('tap');
        if (b.act === 'next') { const nx = this.L.p2 ? Math.min(G.P2_LAST, this.n + 1) : Math.min(12, this.n + 1); G.go('game', { level: nx, tier: G.save.lv(nx).tier }); }
        else G.go(this.L.p2 ? 'core' : 'sectors');
      }
      return;
    }
    if (this.state !== 'play') return;
    if (y >= G.taskbarY()) { if (G.inR(x, y, G.startRect(), 3)) { this.startDown = 0.15; this.pause(); } return; }
    if (this.cfg.mode === 'micro') return this.tapMicro(x, y, e);
    const to = this.tiltOff(); x -= to.x; y -= to.y;
    for (let i = this.wins.length - 1; i >= 0; i--) {
      const w = this.wins[i];
      if (w.xmode !== 'none') {
        if (w.fakeX) {
          const fake = G.xRect(w, w.fakeX), real = G.xRect(w, w.fakeX === 'L' ? 'R' : 'L');
          if (G.inR(x, y, real, 5)) return this.onX(w);
          if (G.inR(x, y, fake, 4)) return this.onFake(w);
        } else if (G.inR(x, y, G.xRect(w), 5)) return this.onX(w);
      }
      if (G.inR(x, y, w)) {
        for (const b of w.btns) if (G.inR(x, y, { x: w.x + b.x, y: w.y + b.y, w: b.w, h: b.h }, 3)) return this.onBtn(w, b);
        if (w.type === 'boss' && w.skull && G.inR(x, y, w.skull, 4)) return this.bossHit(w);
        if (i !== this.wins.length - 1) { this.wins.splice(i, 1); this.wins.push(w); }
        return;
      }
    }
  };
  S.key = function (k) {
    if (this.cfg.mode === 'serpent') {
      if (k === 'Escape' || k === 'p') { if (this.state === 'paused') { this.state = this.pState || 'play'; A().muffle(false); } else this.blur(); }
      return;
    }
    if (k === 'Escape' || k === 'p') { if (this.state === 'play') this.pause(); else if (this.state === 'paused') this.resume(); }
    if ((k === 'Enter' || k === ' ') && this.state === 'intro') this.begin();
  };

  // ======================= NIVEL 13: SERPENT =======================
  S.initSnake = function () {
    const ar = area();
    this.N = this.cfg.N; this.cut = 0; this.grown = 1; this.u = 0;
    this.sw = Math.round(Math.min(ar.w * 0.42, 100)); this.sh = Math.round(this.sw * 0.68);
    this.state = 'sIntro'; this.time = this.cfg.time;
    this.clock = 0; this.combo13 = 0; this.maxCombo13 = 0; this.newRec = false; // cronómetro, combo y récord
    G.fx.abBase = 1; G.fx.glitchBase = 0.05;
    A().music(null); A().stopMusic();
    A().loop('hum', true, 0.025);
  };
  // recorrido sinuoso: curva grande + ondas rápidas encima (nunca se sale de la pantalla)
  S.snakePos = function (u) {
    const ar = area();
    const ax = (ar.w - this.sw) / 2 - 1, ay = (ar.h - this.sh) / 2 - 1;
    const cx = ar.x + ar.w / 2, cy = ar.y + ar.h / 2;
    const sx = 0.8 * Math.sin(u + 0.35 * Math.sin(u * 0.37)) + 0.2 * Math.sin(u * 3.3 + 0.6);
    const sy = 0.8 * Math.sin(u * 1.63 + 1.1) + 0.2 * Math.sin(u * 2.9 + 2.1);
    return { x: Math.round(cx + ax * sx - this.sw / 2), y: Math.round(cy + ay * sy - this.sh / 2) };
  };
  S.snakeStage = function () { return Math.min(4, Math.floor(this.cut / 20)); }; // cada 20 cerradas: otro color, más rápido y más glitch
  const SNAKE_MUL = [1, 1.2, 1.4, 1.6, 1.85];
  S.updateSnake = function (dt) {
    const prog = this.cut / this.N, stg = this.snakeStage();
    const ar = area(), R = (ar.w + ar.h) / 3;
    const dsp = 7.5 / R; // ventanas más separadas: la cola se despliega por toda la pantalla
    if (this.state === 'sIntro') {
      if (this.st > 1.4) { this.state = 'sGrow'; this.st = 0; A().music('serpent'); A().intensity(0); G.pulse({ glitch: 0.6 }); A().sfx('glitch'); }
      return;
    }
    if (this.state === 'sGrow' || this.state === 'play') {
      const v = (120 + 55 * prog) * SNAKE_MUL[stg] * (this.state === 'sGrow' ? 0.6 : 1);
      this.u += (v / R) * dt;
      if (this.state === 'sGrow') {
        const target = Math.min(this.N, 1 + Math.floor(this.st * 26));
        if (target > this.grown) { this.grown = target; if (this.grown % 3 === 0) A().sfx('spawn', 2); }
        if (this.grown >= this.N && this.st > 2) { this.state = 'play'; this.st = 0; }
      } else {
        this.elapsed += dt; this.time -= dt; this.clock += dt;
        const sec = Math.ceil(this.time);
        if (sec <= 5 && sec !== this.lastBeep && this.time > 0) { this.lastBeep = sec; A().sfx('beepT'); }
        if (this.time <= 0) { this.state = 'losing'; this.lt = 0.5; this.loseReason = 'THE SERPENT WON'; A().loop('hum', false); G.pulse({ glitch: 1, ab: 6, shake: 8 }); }
      }
      A().intensity(Math.min(1, prog + stg * 0.08));
      G.fx.abBase = 1 + stg * 1.0 + prog * 1.5; G.fx.glitchBase = 0.04 + stg * 0.075 + prog * 0.08; G.fx.noise = 0.02 + stg * 0.02 + prog * 0.02;
      this.dsp = dsp;
    }
    if (this.state === 'losing') { this.lt -= dt; if (this.lt <= 0) G.go('gameover', { level: 13, reason: this.loseReason, closed: this.cut, score: this.score, left: this.N - this.cut }); }
    if (this.state === 'sWin') { this.wt += dt; G.fx.glitchBase = Math.max(0, 0.3 - this.wt * 0.2); G.fx.abBase = Math.max(0, 3 - this.wt * 2); if (this.wt > 7) G.go('ending', { score: this.score }); } // la ventana de resultados se cierra tocando
  };
  S.headRect = function () { const p = this.snakePos(this.u - this.cut * (this.dsp || 0.02)); return { x: p.x, y: p.y, w: this.sw, h: this.sh }; };
  // ventana "CLICK FIX": X a la izquierda, ERROR a la derecha; cambia de colores cada 20 cerradas
  const SNAKE_SCH = [{ bd: W, fg: K }, { bd: B, fg: W }, { bd: Gr, fg: K }, { bd: K, fg: Gr }, { bd: W, fg: B }];
  S.drawSnakeWin = function (x, y, w, h, head, k) {
    const stg = this.snakeStage();
    let { bd, fg } = SNAKE_SCH[stg];
    if (stg >= 2 && (k * 7 + Math.floor(G.time * 12)) % 19 === 0) { const t = bd; bd = fg; fg = t; } // parpadeo glitch
    G.rect(x + 1, y, w - 2, h, fg); G.rect(x, y + 1, w, h - 2, fg);
    G.rect(x + 2, y + 2, w - 4, h - 4, bd);
    // barra de título
    G.line(x + 4, y + 3, x + 10, y + 9, fg); G.line(x + 5, y + 3, x + 11, y + 9, fg); G.line(x + 10, y + 3, x + 4, y + 9, fg); G.line(x + 11, y + 3, x + 5, y + 9, fg);
    G.text('ERROR', x + w - 5, y + 3, fg, { al: 'r' });
    G.rect(x + 2, y + 12, w - 4, 2, fg);
    if (k > this.cut + 2) return; // de la cola solo se ve el borde: no hace falta pintar el interior
    // icono y texto
    const iy = y + 15 + Math.floor((h - 33) / 2);
    G.circ(x + 12, iy + 8, 7, fg, fg); G.line(x + 9, iy + 5, x + 15, iy + 11, bd); G.line(x + 15, iy + 5, x + 9, iy + 11, bd); G.line(x + 10, iy + 5, x + 16, iy + 11, bd); G.line(x + 16, iy + 5, x + 10, iy + 11, bd);
    G.text('CLICK "FIX"', x + 22, iy + 2, fg); G.text('TO FIX ERROR', x + 22, iy + 11, fg);
    // botón FIX (en la cabeza va relleno para que se vea cuál toca)
    const bw = 44, bx = Math.round(x + w / 2 - bw / 2), by = y + h - 16;
    if (head) { G.rect(bx, by, bw, 12, fg); G.text('FIX', bx + bw / 2, by + 3, bd, { al: 'c', b: true }); if (Math.floor(G.time * 8) % 2) G.box(x - 2, y - 2, w + 4, h + 4, stg === 1 ? Gr : stg === 3 ? W : stg === 4 ? Gr : B); }
    else { G.box(bx, by, bw, 12, fg); G.text('FIX', bx + bw / 2, by + 3, fg, { al: 'c' }); }
  };
  S.drawSnake = function (g) {
    G.rect(0, 0, G.W, G.H, K);
    const dsp = this.dsp || 0.02;
    if (this.state === 'sIntro') {
      const p = this.snakePos(0);
      if (this.st > 0.5 && (this.st > 0.9 || Math.floor(this.st * 12) % 2)) this.drawSnakeWin(p.x, p.y, this.sw, this.sh, true, 0);
    } else if (this.state !== 'sWin' || this.wt < 0.3) {
      for (let i = this.grown - 1; i >= this.cut; i--) {
        const p = this.snakePos(this.u - i * dsp);
        this.drawSnakeWin(p.x, p.y, this.sw, this.sh, i === this.cut, i);
      }
    }
    for (const gh of this.ghosts) { const k = 1 - gh.t / 0.14; const ww = gh.w * k, hh = gh.h * k; G.box(gh.x + (gh.w - ww) / 2, gh.y + (gh.h - hh) / 2, ww, hh, W); }
    for (const p of this.parts) G.rect(p.x, p.y, 2, 2, p.col);
    for (const p of this.pops) G.text(p.txt, p.x, p.y - p.t * 22, p.col, { al: 'c', b: true });
    // marcador: cronómetro, mejor tiempo y combo
    if (this.state !== 'sIntro') {
      const ar = area(), best = G.save.data.best13t, fmt = (t) => G.pad(Math.floor(t / 60), 2) + ':' + G.pad(Math.floor(t % 60), 2) + '.' + G.pad(Math.floor((t * 100) % 100), 2);
      const bw = 110, bx = Math.round(G.W / 2 - bw / 2), by = ar.y + 2;
      G.rect(bx, by, bw, 30, K); G.box(bx, by, bw, 30, W);
      G.text(fmt(this.clock), G.W / 2, by + 4, W, { s: 2, al: 'c', b: true });
      G.text('BEST ' + (best ? fmt(best) : '--:--.--'), G.W / 2, by + 20, this.newRec && Math.floor(G.time * 6) % 2 ? Gr : L, { al: 'c' });
      if (this.combo13 >= 3) G.text('COMBO x' + this.combo13, G.W / 2, by + 34, this.combo13 >= 10 ? Gr : W, { al: 'c', b: true });
      if (this.newRec) G.text('NEW RECORD!', G.W / 2, by + 46, Gr, { s: 2, al: 'c', b: true });
    }
    if (this.state === 'sWin' && this.wt > 0.3) this.drawSnakeResults();
    const left = this.N - this.cut;
    G.drawTaskbar(4, { time: this.state === 'sIntro' || this.state === 'sGrow' ? this.cfg.time : this.time, label: left + ' LEFT', startDown: this.startDown > 0 });
    if (this.state === 'sIntro' && this.st < 1.4) G.text('SECTOR 13', G.W / 2, area().y + 8, W, { al: 'c' });
    if (this.state === 'paused') { this.dim(); this.drawPause(); }
  };
  // ventana flotante de resultados al vencer a la serpiente (verde y negro, con brillo)
  const RES_ST = { fr: Gr, bd: K, bar: Gr, bt: K, tx: Gr, ac: W, sh: B, out: W };
  S.drawSnakeResults = function () {
    const ar = area(), t = G.time, k = Math.min(1, (this.wt - 0.3) / 0.35), w = 176, h = 132;
    const x = Math.round(G.W / 2 - w / 2 + Math.cos(t * 1.1) * 2), y = Math.round(ar.y + ar.h * 0.42 - h / 2 + Math.sin(t * 1.6) * 3 + (1 - k) * 40);
    const T = G.ctx(), fmt = (v) => G.pad(Math.floor(v / 60), 2) + ':' + G.pad(Math.floor(v % 60), 2) + '.' + G.pad(Math.floor((v * 100) % 100), 2);
    T.save(); T.shadowColor = 'rgba(70,255,0,0.75)'; T.shadowBlur = 12; G.rect(x, y, w, h, Gr); T.restore();
    const r = G.drawFrame({ x, y, w, h, st: RES_ST, title: 'RESULTS.EXE', stripes: true, xmode: 'x' });
    G.text('SERPENT DEFEATED', x + w / 2, r.y + 5, W, { al: 'c', b: true });
    G.dash(r.x + 6, r.y + 16, r.w - 12, Gr, 2, 2);
    const best = G.save.data.best13t;
    const row = (lab, val, yy, col, big) => { G.text(lab, r.x + 8, yy + (big ? 4 : 0), L); G.text(val, r.x + r.w - 8, yy, col, { al: 'r', b: true, s: big ? 2 : 1 }); };
    row('TIME', fmt(this.clock), r.y + 22, Gr, true);
    row('BEST', best ? fmt(best) : '--', r.y + 42, this.newRec ? W : Gr);
    row('MAX COMBO', 'x' + this.maxCombo13, r.y + 54, Gr);
    row('SCORE', G.pad(this.score, 7), r.y + 66, W, true);
    if (this.newRec && Math.floor(t * 4) % 2) { G.rect(r.x + 6, r.y + 88, r.w - 12, 11, Gr); G.text('NEW RECORD!', x + w / 2, r.y + 90, K, { al: 'c', b: true }); }
    else if (this.wt > 1 && Math.floor(t * 2) % 2) G.text('TAP TO CONTINUE', x + w / 2, r.y + 90, L, { al: 'c' });
  };
  S.tapSnake = function (x, y) {
    if (this.state === 'paused') {
      const xr = G.xRect(this.pwin);
      if (G.inR(x, y, xr, 4)) { this.state = this.pState; A().muffle(false); return; }
      this.pbtns.forEach((b, i) => { if (G.inR(x, y, b, 2)) { if (i === 0) { this.state = this.pState; A().muffle(false); A().sfx('tap'); } else if (i === 1) { A().loop('hum', false); G.go('game', { level: 13 }); } else { A().loop('hum', false); A().sfx('back'); G.go('sectors'); } } });
      return;
    }
    if (y >= G.taskbarY()) {
      if (G.inR(x, y, G.startRect(), 3) && (this.state === 'play' || this.state === 'sGrow')) { this.pState = this.state; this.state = 'play'; this.pause(); this.state = 'paused'; }
      return;
    }
    if (this.state === 'sWin') { if (this.wt > 1) { A().sfx('tap'); G.go('ending', { score: this.score }); } return; }
    if (this.state !== 'play') return;
    const r = this.headRect();
    if (G.inR(x, y, r, 2)) {
      this.cut++; this.combo13++; this.maxCombo13 = Math.max(this.maxCombo13, this.combo13);
      this.score += 20 + Math.round(this.cut * 2) + Math.min(10, this.combo13) * 5; // el combo suma puntos
      this.ghosts.push({ x: r.x, y: r.y, w: r.w, h: r.h, t: 0 });
      this.burst(r.x + r.w / 2, r.y + r.h / 2, G.pick([W, Gr, B]), 5);
      A().sfx('snake', this.cut / this.N); G.vibrate(10); G.pulse({ ab: 1.5 });
      if (this.cut % 20 === 0 && this.cut < this.N) { // sube de fase: otro color, más rápido, más glitch
        const stg = this.snakeStage();
        G.pulse({ glitch: 1.2, ab: 7, shake: 6, flash: 0.3, flashCol: [W, B, Gr, W, B][stg] }); A().sfx('glitch'); A().sfx('cmd'); G.vibrate(40);
        this.pop(G.W / 2, area().y + area().h / 2, 'SPEED x' + SNAKE_MUL[stg], W);
      }
      if (this.cut >= this.N) {
        this.state = 'sWin'; this.wt = 0;
        this.score += Math.round(this.time * 100);
        A().stopMusic(); A().loop('hum', false); A().sfx('restart');
        const sv = G.save.data; if (!sv.best13t || this.clock < sv.best13t) { sv.best13t = this.clock; this.newRec = true; } // mejor tiempo
        sv.beat13 = 1; sv.best13 = Math.max(sv.best13 || 0, this.score); G.save.write();
      }
    } else {
      this.combo13 = 0;
      this.time = Math.max(0, this.time - 0.4);
      A().sfx('deny'); G.pulse({ glitch: 0.3, shake: 2 }); this.pop(x, y, '-0.4', Gr);
    }
  };
})(window.G);
