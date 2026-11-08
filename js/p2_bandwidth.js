'use strict';
// PARTE 2 · 17 BANDWIDTH: el bus de datos visto desde arriba. Eres un paquete: cambia de carril y esquiva.
// Rondas normales: aguantar unos segundos cada vez más rápido. Jefe: FIREWALL, que avisa un carril y lo barre con un rayo.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const OH = 22, PW2 = 9, PH2 = 7, TILE = 192; // alto de obstáculo, media anchura/altura del paquete, alto del tramo lateral
  const TELE = [0.62, 0.5], FIRE = 0.45, ROAD = 1.8; // ROAD: el bus pasa 1,8 veces más rápido que los paquetes que esquivas      // aviso del rayo (al principio / al final) y duración del rayo

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const cx = (s, i) => s.x0 + s.lw * (i + 0.5);
  const ease = (k) => k * k * (3 - 2 * k);
  // centro y anchura de un obstáculo (los que cambian de carril se deslizan)
  function obX(s, o) {
    if (o.kind === 'bar') return { c: s.x0 + s.lw * (o.lane + 1), w: s.lw * 2 - 10 };
    const c = o.kind === 'switch' ? G.lerp(cx(s, o.lane), cx(s, o.to), ease(o.sw)) : cx(s, o.lane);
    return { c, w: s.lw - 12 };
  }
  const lanesOf = (o) => (o.kind === 'bar' ? [o.lane, o.lane + 1] : o.kind === 'switch' ? [o.lane, o.to] : [o.lane]);

  // ---------- dibujos que se preparan una vez por ronda ----------
  function offscreen(w, h, fn) { const o = G.mkCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))), T0 = G.ctx(); G.target(o.x); try { fn(o.c.width, o.c.height); } finally { G.target(T0); } return o.c; }
  // franja lateral de placa (pistas, resistencias, condensadores, chips) que se repite hacia abajo
  function sideTile(w, seed, right) {
    const R = G.rng(seed);
    return offscreen(w, TILE, (ww, hh) => {
      G.rect(0, 0, ww, hh, K);
      G.rect(right ? 2 : ww - 3, 0, 1, hh, B); G.rect(right ? ww - 4 : 3, 0, 1, hh, B);
      for (let y = 1; y < hh; y += 4) G.px(Math.round(ww / 2), y, B);
      for (let y = 6 + Math.floor(R() * 10); y < hh - 18; y += 16 + Math.floor(R() * 26)) {
        const k = Math.floor(R() * 4), x = 3 + Math.floor(R() * Math.max(1, ww - 16));
        G.rect(right ? 2 : x + 5, y + 2, right ? x - 2 : ww - x - 8, 1, B); // pista hasta el borde del bus
        if (k <= 1) { G.rect(x, y, 10, 5, L); G.rect(x + 2, y, 1, 5, K); G.rect(x + 5, y, 1, 5, k ? Gr : B); G.rect(x + 7, y, 1, 5, K); } // resistencia
        else if (k === 2) { G.circ(x + 3, y + 3, 3, L, K); G.px(x + 3, y + 3, K); } // condensador
        else { G.rect(x, y, 10, 14, K); G.box(x, y, 10, 14, L); G.rect(x + 2, y + 2, 2, 2, L); for (let py = y + 2; py < y + 13; py += 3) { G.px(x - 1, py, L); G.px(x + 10, py, L); } } // chip
        if (R() < 0.3) G.rect(x + 4, y + 16, 2, 2, Gr);
      }
    });
  }
  function stripes(w, h, a, step) { for (let y = 0; y < h; y++) for (let x = (y % step) - step; x < w; x += step) { const x0 = Math.max(0, x), x1 = Math.min(w, x + step / 2); if (x1 > x0) G.rect(x0, y, x1 - x0, 1, a); } } // rayas diagonales
  function makeSprites(s) {
    const bw = Math.round(s.lw - 12), barW = Math.round(s.lw * 2 - 10);
    s.spBlock = ['ERR', '404', 'NUL'].map((lab, v) => offscreen(bw, OH, (w, h) => { // paquetes rotos a rayas
      G.rect(0, 0, w, h, v === 2 ? L : W); stripes(w, h, K, 6); G.box(0, 0, w, h, K); G.rect(1, 1, w - 2, 2, K);
      const lw = Math.min(w - 6, 26), ly = Math.round(h / 2 - 4); G.rect(Math.round(w / 2 - lw / 2), ly, lw, 9, v === 1 ? K : W); G.box(Math.round(w / 2 - lw / 2), ly, lw, 9, K);
      G.text(lab, w / 2, ly + 1, v === 1 ? W : K, { al: 'c' });
    }));
    s.spSwitch = offscreen(bw, OH, (w, h) => { // paquete que salta de carril: gris con flechas
      G.rect(0, 0, w, h, L); stripes(w, h, K, 4); G.box(0, 0, w, h, K); G.rect(3, Math.round(h / 2 - 6), w - 6, 12, K);
    });
    s.spBar = offscreen(barW, 12, (w, h) => { // barra de cortafuegos: ladrillos
      G.rect(0, 0, w, h, B);
      for (let y = 0; y < h; y += 4) { G.rect(0, y, w, 1, W); for (let x = (y / 4) % 2 ? 4 : 0; x < w; x += 8) G.rect(x, y, 1, 4, W); }
      G.box(0, 0, w, h, K);
      const tw = G.textW('FIREWALL') + 6; G.rect(Math.round(w / 2 - tw / 2), 2, tw, 9, K); G.text('FIREWALL', w / 2, 3, W, { al: 'c' });
    });
  }

  // ---------- filas de obstáculos (siempre hay un camino posible) ----------
  function genRow(s) {
    const n = s.n;
    let p = s.path + (Math.random() < 0.6 ? G.irand(-1, 1) : 0);
    if (!s.bossMode && Math.random() < 0.18 * s.d) p = s.path + G.pick([-2, 2]);
    p = G.clamp(p, 0, n - 1);
    const blocked = new Set(), objs = [];
    const maxB = s.bossMode ? 1 : Math.min(n - 1, 1 + Math.floor(Math.random() * (1.5 + s.d * 1.8)));
    // barra de cortafuegos sobre 2 carriles (nunca tapa el carril seguro)
    if (!s.bossMode && maxB >= 2 && Math.random() < 0.22 + 0.22 * s.d) {
      const pairs = []; for (let i = 0; i < n - 1; i++) if (i !== p && i + 1 !== p) pairs.push(i);
      if (pairs.length) { const a = G.pick(pairs); blocked.add(a); blocked.add(a + 1); objs.push({ kind: 'bar', lane: a, h: 12 }); }
    }
    for (const i of shuffle([...Array(n).keys()].filter((k) => k !== p))) {
      if (blocked.size >= maxB) break;
      if (blocked.has(i)) continue;
      const nb = [i - 1, i + 1].filter((j) => j >= 0 && j < n && j !== p && !blocked.has(j));
      if (!s.bossMode && s.d > 0.45 && nb.length && blocked.size + 2 <= Math.max(maxB, 2) && Math.random() < 0.4) {
        const j = G.pick(nb); blocked.add(i); blocked.add(j);
        objs.push({ kind: 'switch', lane: i, to: j, h: OH, swY: s.top + (s.py - s.top) * G.rand(0.22, 0.42), sw: 0 });
      } else { blocked.add(i); objs.push({ kind: 'block', lane: i, h: OH, v: Math.floor(Math.random() * 3) }); }
    }
    const free = []; for (let i = 0; i < n; i++) if (!blocked.has(i)) free.push(i);
    // cuánto tendría que moverse como mucho alguien que va por cualquier carril libre de la fila anterior
    let need = 0;
    for (const f of s.prevFree) { let m = 9; for (const g of free) m = Math.min(m, Math.abs(f - g)); need = Math.max(need, m); }
    s.path = p; s.prevFree = free;
    const vMax = s.v0 * (1 + s.ramp) * 1.05;
    const S = OH + PH2 * 2 + vMax * (s.wbase + 0.15 * need) + s.v * G.rand(0, s.bossMode ? 0.5 : 0.15);
    return { objs, S, path: p, bits: Math.random() < 0.55 };
  }
  function placeRow(s, row, y) {
    for (const o of row.objs) { o.y = y; o.sw = o.sw || 0; s.obs.push(o); }
    if (row.bits) for (let k = 0; k < 3; k++) s.bits.push({ lane: row.path, y: y - 22 - k * 13, got: false });
    s.lastRowY = y;
  }

  // ---------- jefe: elige los carriles del rayo dejando siempre una salida ----------
  function chooseBeams(s) {
    const prog = s.t / s.T, n = s.n, pl = s.lane, win = s.tele + FIRE;
    const occ = new Set();
    for (const o of s.obs) { const y1 = o.y + o.h + s.v * 1.2 * win; if (y1 >= s.py - PH2 - 2 && o.y <= s.py + PH2 + 2) lanesOf(o).forEach((l) => occ.add(l)); }
    const ok = (beams) => {
      for (let f = 0; f < n; f++) {
        if (beams.includes(f) || occ.has(f) || Math.abs(f - pl) > 2) continue;
        let clear = true; for (let l = Math.min(f, pl); l <= Math.max(f, pl); l++) if (l !== pl && occ.has(l)) clear = false;
        if (clear) return true;
      }
      return false;
    };
    const first = Math.random() < 0.72 ? pl : G.irand(0, n - 1);
    let beams = [first];
    if (prog > 0.38 && Math.random() < 0.8) { const o = [...Array(n).keys()].filter((i) => i !== first); beams.push(G.pick(o)); }
    if (!ok(beams)) beams = [first];
    if (!ok(beams)) return false;
    s.atk.lanes = beams; return true;
  }

  G.MICRO.bandwidth = {
    mode: 'window', cmd: 'DODGE!', hint: 'TAP LEFT / RIGHT TO SWITCH LANE', time: 7, winOnTimeout: true, fx: 0.5,
    help: ['RIDE THE DATA BUS.', 'TAP LEFT OR RIGHT', 'TO SWITCH LANE AND', 'DODGE THE PACKETS.'],
    init(s) {
      const r = s.r, d = s.d, k = G.clamp(r.h / 460, 0.75, 1.1);
      s.n = s.boss || d > 0.5 ? 4 : 3;
      s.bossH = s.boss ? Math.round(G.clamp(r.h * 0.15, 54, 74)) : 0;
      s.side = Math.max(18, Math.round(r.w * 0.1));
      s.x0 = r.x + s.side; s.roadW = r.w - s.side * 2; s.lw = s.roadW / s.n;
      s.top = r.y + s.bossH; s.py = r.y + r.h - Math.max(30, Math.round(r.h * 0.085));
      s.T = s.boss ? 13.5 : 6 + 2 * d;
      s.v0 = (s.boss ? 165 : 140 + 120 * d) * k; s.ramp = s.boss ? 0.25 : 0.4 + 0.3 * d; s.v = s.v0;
      s.wbase = s.boss ? 0.4 : 0.24 - 0.08 * d; s.bossMode = !!s.boss;
      if (s.boss) s.hint = 'DODGE THE FIREWALL BEAMS!';
      s.lane = Math.floor((s.n - 1) / 2); s.px = cx(s, s.lane); s.trail = [];
      s.path = s.lane; s.prevFree = [...Array(s.n).keys()];
      s.obs = []; s.bits = []; s.parts = []; s.pops = []; s.touch = {}; s.dist = 0; s.combo = 0; s.bitN = 0; s.bump = 0; s.lastShift = -9;
      s.dead = null; s.dying = false; s.speedUp = false; s.sut = -9;
      s.atk = { st: 'idle', t: 0, dur: 1.4, lanes: [] }; s.tele = TELE[0];
      s.sideL = sideTile(s.side, 40 + s.round * 7, false); s.sideR = sideTile(s.side, 90 + s.round * 11, true);
      makeSprites(s);
      s.streaks = Array.from({ length: 9 }, () => ({ x: s.x0 + Math.random() * s.roadW, y: s.top + Math.random() * (r.h - s.bossH), l: G.irand(6, 16) }));
      // filas iniciales: la primera llega al paquete a los ~0,9 s (se ven ya mientras sale la orden)
      let y = Math.min(s.py - PH2 - s.v0 * 0.95 - OH, s.top + (s.py - s.top) * 0.35), row = genRow(s);
      s.lastRowY = s.top - OH;
      while (y >= s.top - OH) { placeRow(s, row, y); row = genRow(s); y -= row.S; }
      s.pending = row;
      if (s.boss) s.chunks = Array.from({ length: 16 }, (_, i) => ({ x: r.x + 8 + (i % 8) * ((r.w - 16) / 8), y: r.y + 4 + Math.floor(i / 8) * (s.bossH / 2 - 4), vx: G.rand(-90, 90), vy: G.rand(-160, -40), w: G.irand(8, 22), h: G.irand(5, 12), c: G.pick([B, W, Gr, L]) }));
    },
    shift(s, dir) {
      if (s.dead) return false;
      const nl = G.clamp(s.lane + dir, 0, s.n - 1);
      if (nl === s.lane) { s.bump = 0.12 * dir; A().sfx('deny'); return false; }
      s.lane = nl; s.lastShift = s.t; A().sfx('lane'); return true;
    },
    // toque: mitad izquierda / derecha al instante; un deslizamiento manda sobre el toque
    down(s, x, y, e) {
      if (s.dead) return;
      const id = e ? e.pointerId : 1, dir = x < s.r.x + s.r.w / 2 ? -1 : 1;
      s.touch[id] = { x0: x, t0: s.t, dir, ok: this.shift(s, dir), swiped: false };
    },
    move(s, x, y, e) {
      const p = s.touch[e ? e.pointerId : 1]; if (!p || s.dead) return;
      const dx = x - p.x0; if (Math.abs(dx) < 22 || s.t - p.t0 > 0.45) return;
      const sd = Math.sign(dx);
      if (!p.swiped) { p.swiped = true; if (sd !== p.dir) { if (p.ok) this.shift(s, sd); this.shift(s, sd); } }
      else this.shift(s, sd);
      p.x0 = x; p.t0 = s.t; p.dir = sd;
    },
    up(s, x, y, e) { delete s.touch[e ? e.pointerId : 1]; },
    update(s, dt) {
      if (s.dead) return;
      const r = s.r, prog = Math.min(1, s.t / s.T);
      s.v = s.v0 * (1 + s.ramp * prog);
      const dy = s.v * dt; s.dist += dy * ROAD; // la carretera corre más que los paquetes: sensación de velocidad
      if (!s.boss && !s.speedUp && prog > 0.5) { s.speedUp = true; s.sut = s.t; A().sfx('beepT'); G.pulse({ ab: 2 }); }
      // obstáculos, bits y rayas de velocidad
      for (const o of s.obs) { o.y += dy; if (o.kind === 'switch' && o.y >= o.swY && o.sw < 1) { if (o.sw === 0) A().sfx('pick'); o.sw = Math.min(1, o.sw + dt / 0.3); } }
      s.obs = s.obs.filter((o) => o.y < r.y + r.h + 4);
      for (const b of s.bits) b.y += dy;
      s.bits = s.bits.filter((b) => !b.got && b.y < r.y + r.h + 4);
      for (const k of s.streaks) { k.y += dy * ROAD * 1.3; if (k.y > r.y + r.h) { k.y = s.top - 20; k.x = s.x0 + Math.random() * s.roadW; k.l = G.irand(6, 16); } }
      s.lastRowY += dy;
      const busy = s.boss && (s.atk.st !== 'idle' || s.dying);
      if (!busy && s.lastRowY - (s.top - OH) >= s.pending.S) { placeRow(s, s.pending, s.top - OH); s.pending = genRow(s); }
      // paquete: se desliza rápido al carril elegido
      const tx = cx(s, s.lane); s.px += (tx - s.px) * Math.min(1, dt * 28); if (Math.abs(tx - s.px) < 0.4) s.px = tx;
      s.trail.unshift(s.px); if (s.trail.length > 5) s.trail.pop();
      if (s.bump) s.bump = Math.abs(s.bump) < 0.01 ? 0 : s.bump * Math.exp(-14 * dt);
      for (const p of s.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }
      s.parts = s.parts.filter((p) => p.t < p.life);
      for (const p of s.pops) p.t += dt; s.pops = s.pops.filter((p) => p.t < 0.8);
      // bits verdes (adorno: no hacen falta para ganar)
      for (const b of s.bits) if (!b.got && Math.abs(cx(s, b.lane) - s.px) < s.lw * 0.45 && Math.abs(b.y - s.py) < PH2 + 4) {
        b.got = true; s.bitN++; s.combo++; A().sfx('reel', Math.min(6, s.combo % 7));
        for (let i = 0; i < 5; i++) s.parts.push({ x: cx(s, b.lane), y: b.y, vx: G.rand(-60, 60), vy: G.rand(-120, -20), t: 0, life: 0.35, col: Gr });
        if (s.combo % 3 === 0) { s.pops.length = 0; s.pops.push({ x: s.px, y: s.py - 16, t: 0, txt: 'BITS x' + s.bitN }); A().sfx('combo'); }
      }
      if (s.dying) return;
      // choques
      const hx0 = s.px - PW2 + 2, hx1 = s.px + PW2 - 2, hy0 = s.py - PH2 + 2, hy1 = s.py + PH2 - 2;
      for (const o of s.obs) {
        if (o.y > hy1 || o.y + o.h < hy0) continue;
        const q = obX(s, o); if (q.c + q.w / 2 < hx0 || q.c - q.w / 2 > hx1) continue;
        return this.crash(s, 'PACKET LOST');
      }
      if (s.boss) this.updBoss(s, dt, prog);
    },
    updBoss(s, dt, prog) {
      const a = s.atk; a.t += dt;
      if (s.t >= s.T - 0.9) { // el cortafuegos revienta
        s.dying = true; s.boomG = G.time; a.st = 'idle'; a.lanes = [];
        for (const o of s.obs) { const q = obX(s, o); for (let i = 0; i < 3; i++) s.parts.push({ x: q.c, y: o.y + 6, vx: G.rand(-120, 120), vy: G.rand(-200, -60), t: 0, life: 0.6, col: G.pick([W, L, B]) }); }
        s.obs = [];
        A().sfx('boom'); A().sfx('glitch'); G.pulse({ flash: 0.45, flashCol: W, shake: 9, glitch: 1.2, ab: 6 }); G.vibrate(120);
        return;
      }
      s.tele = G.lerp(TELE[0], TELE[1], prog);
      if (a.st === 'idle' && a.t >= a.dur) { if (chooseBeams(s)) { a.st = 'tele'; a.t = 0; a.dur = s.tele; A().sfx('warn'); } else a.dur += 0.15; }
      else if (a.st === 'tele' && a.t >= a.dur) { a.st = 'fire'; a.t = 0; a.dur = FIRE; A().sfx('zap'); G.pulse({ ab: 4, shake: 3 }); G.vibrate(30); }
      else if (a.st === 'fire') {
        const bw = s.lw * 0.72;
        for (const l of a.lanes) if (Math.abs(cx(s, l) - s.px) < bw / 2 + PW2 - 3) return this.crash(s, 'FIREWALLED');
        if (a.t >= a.dur) { a.st = 'idle'; a.t = 0; a.dur = G.rand(0.5, 0.95) * (1 - 0.35 * prog); a.lanes = []; }
      }
    },
    crash(s, why) {
      s.dead = { x: s.px, y: s.py }; s.deadG = G.time;
      s.deadBits = Array.from({ length: 8 }, () => ({ vx: G.rand(-110, 110), vy: G.rand(-170, -50), c: G.pick([W, K, Gr, L]), w: G.irand(2, 5) }));
      A().sfx('hit'); G.pulse({ glitch: 1, shake: 7, ab: 6 }); G.vibrate(90);
      s.fail(why);
    },
    draw(s) {
      const r = s.r, T = G.ctx(), a = s.atk;
      G.rect(r.x, r.y, r.w, r.h, K);
      // laterales de placa que pasan a toda velocidad
      const off = Math.floor(s.dist % TILE);
      for (let y = r.y - TILE + off; y < r.y + r.h; y += TILE) { T.drawImage(s.sideL, r.x, y); T.drawImage(s.sideR, r.x + r.w - s.side, y); }
      // bus: bordes, separadores azules con marcas que corren
      G.rect(s.x0 - 2, s.top, 1, r.y + r.h - s.top, L); G.rect(s.x0 + s.roadW + 1, s.top, 1, r.y + r.h - s.top, L);
      const mo = Math.floor(s.dist % 22);
      for (let i = 0; i <= s.n; i++) {
        const x = Math.round(s.x0 + s.lw * i) - (i === s.n ? 1 : 0);
        if (i > 0 && i < s.n) G.rect(x, s.top, 1, r.y + r.h - s.top, B);
        for (let y = s.top - 22 + mo; y < r.y + r.h; y += 22) G.rect(x, Math.max(s.top, y), 1, 8, i > 0 && i < s.n ? L : Gr);
      }
      for (const k of s.streaks) { G.rect(Math.round(k.x), Math.round(k.y), 1, k.l, B); G.rect(Math.round(k.x), Math.round(k.y + k.l - 3), 1, 3, L); }
      // rayo del jefe: aviso parpadeante y luego el rayo
      if (s.boss && a.lanes.length) {
        for (const l of a.lanes) {
          const c = cx(s, l), x = Math.round(c - s.lw / 2) + 2, w = Math.round(s.lw) - 3;
          if (a.st === 'tele') {
            if (Math.floor(a.t * 12) % 2 === 0) { G.drect(x, s.top, w, r.y + r.h - s.top, 4, Gr, null); G.box(x, s.top, w, r.y + r.h - s.top, Gr); }
            G.text('!', c, s.py - 30, Gr, { al: 'c', s: 2, b: true });
          } else {
            const bw = Math.round(s.lw * 0.72 * (a.t < 0.06 ? a.t / 0.06 : a.t > FIRE - 0.1 ? Math.max(0.15, (FIRE - a.t) / 0.1) : 1));
            T.save(); T.shadowColor = 'rgba(70,255,0,0.9)'; T.shadowBlur = 10;
            G.rect(Math.round(c - bw / 2), s.top, bw, r.y + r.h - s.top, B); T.restore();
            G.rect(Math.round(c - bw / 2) + 2, s.top, Math.max(1, bw - 4), r.y + r.h - s.top, W);
            for (let y = s.top + ((G.time * 400) % 14); y < r.y + r.h; y += 14) G.rect(Math.round(c - bw / 2), Math.round(y), bw, 2, Gr);
          }
        }
      }
      // obstáculos
      for (const o of s.obs) {
        const q = obX(s, o), x = Math.round(q.c - q.w / 2), y = Math.round(o.y);
        if (o.kind === 'bar') T.drawImage(s.spBar, x, y);
        else if (o.kind === 'switch') {
          T.drawImage(s.spSwitch, x, y);
          const dir = Math.sign(o.to - o.lane), m = Math.round(q.c), on = Math.floor(G.time * 8) % 2 === 0;
          const yy = y + Math.round(OH / 2) - 4;
          if (dir > 0) { G.tri(m - 4, yy, m - 4, yy + 8, m + 1, yy + 4, on ? Gr : W); G.tri(m + 1, yy, m + 1, yy + 8, m + 6, yy + 4, on ? W : Gr); }
          else { G.tri(m + 4, yy, m + 4, yy + 8, m - 1, yy + 4, on ? Gr : W); G.tri(m - 1, yy, m - 1, yy + 8, m - 6, yy + 4, on ? W : Gr); }
        } else T.drawImage(s.spBlock[o.v || 0], x, y);
      }
      // bits
      for (const b of s.bits) { const x = Math.round(cx(s, b.lane)), y = Math.round(b.y); G.rect(x - 2, y - 2, 5, 5, Gr); if (Math.floor(G.time * 6 + b.y * 0.1) % 2) G.px(x, y, W); }
      // jefe arriba
      if (s.boss) this.drawBoss(s);
      // paquete (o sus trozos si ha chocado)
      const py = Math.round(s.py);
      if (s.dead) {
        const k = G.time - s.deadG;
        for (const p of s.deadBits) G.rect(Math.round(s.dead.x + p.vx * k), Math.round(s.dead.y + p.vy * k + 260 * k * k), p.w, p.w, p.c);
      } else {
        const px = Math.round(s.px + s.bump * 40);
        for (let i = 4; i >= 1; i--) if (s.trail[i] != null && Math.abs(s.trail[i] - s.px) > 1) G.drect(Math.round(s.trail[i]) - PW2, py - PH2, PW2 * 2, PH2 * 2, Math.max(1, 9 - i * 2), Gr, null);
        const fl = Math.floor(G.time * 20) % 2;
        G.rect(px - 5, py + PH2, 1, 6 + fl * 3, Gr); G.rect(px + 4, py + PH2, 1, 6 + (1 - fl) * 3, Gr); G.rect(px - 1, py + PH2, 2, 3 + fl * 2, B);
        T.save(); T.shadowColor = 'rgba(70,255,0,0.85)'; T.shadowBlur = 7; G.rect(px - PW2 - 1, py - PH2 - 1, PW2 * 2 + 2, PH2 * 2 + 2, Gr); T.restore();
        G.rect(px - PW2, py - PH2, PW2 * 2, PH2 * 2, W); G.box(px - PW2, py - PH2, PW2 * 2, PH2 * 2, K);
        G.line(px - PW2 + 1, py - PH2 + 1, px, py + 1, K); G.line(px + PW2 - 2, py - PH2 + 1, px, py + 1, K);
        G.rect(px - 3, py + 3, 6, 2, Gr);
      }
      for (const p of s.parts) G.rect(Math.round(p.x), Math.round(p.y), 2, 2, p.col);
      for (const p of s.pops) G.text(p.txt, p.x, Math.round(p.y - p.t * 26), Gr, { al: 'c', b: true });
      // marcador: velocidad del bus y bits
      const hy = r.y + r.h - 10;
      const sp = Math.round(s.v * ROAD * 2) + ' MB/S', tw = G.textW(sp) + 6;
      G.rect(r.x + r.w - tw - 2, hy - 2, tw, 10, K); G.text(sp, r.x + r.w - 5, hy, s.speedUp && s.t - s.sut < 1 && Math.floor(G.time * 10) % 2 ? W : Gr, { al: 'r' });
      if (s.bitN) { const bt = 'BITS ' + s.bitN; G.rect(r.x + 2, hy - 2, G.textW(bt) + 6, 10, K); G.text(bt, r.x + 5, hy, Gr); }
      if (s.speedUp && s.t - s.sut < 0.9 && !s.dead) { const k = s.t - s.sut, y = Math.round(s.top + 8); G.rect(s.x0 + 6, y - 3, s.roadW - 12, 13, K); G.box(s.x0 + 6, y - 3, s.roadW - 12, 13, Gr); G.text('▲ SPEED UP ▲', r.x + r.w / 2, y, Math.floor(k * 10) % 2 ? W : Gr, { al: 'c', b: true }); }
      // pista para tocar: flechas a los lados del paquete al principio
      if (s.t < 1.4 && !s.dead && Math.floor(G.time * 4) % 2 === 0) {
        const lx = r.x + Math.round(s.side / 2) + 2, rx = r.x + r.w - Math.round(s.side / 2) - 2;
        G.tri(lx + 4, py - 6, lx + 4, py + 6, lx - 3, py, Gr); G.tri(rx - 4, py - 6, rx - 4, py + 6, rx + 3, py, Gr);
      }
    },
    drawBoss(s) {
      const r = s.r, a = s.atk, T = G.ctx(), hp = G.clamp(1 - s.t / (s.T - 0.9), 0, 1);
      if (s.dying) { // la ventana salta en pedazos
        const k = G.time - s.boomG;
        for (const c of s.chunks) G.rect(Math.round(c.x + c.vx * k), Math.round(c.y + c.vy * k + 300 * k * k), c.w, c.h, c.c);
        if (k < 0.5) { const rr = Math.round(10 + k * 160); G.circ(Math.round(r.x + r.w / 2), Math.round(r.y + s.bossH / 2), rr, null, Math.floor(k * 20) % 2 ? Gr : W); }
        if (Math.floor(G.time * 6) % 2 === 0) G.text('FIREWALL DOWN', r.x + r.w / 2, s.top + 30, Gr, { al: 'c', s: 2, b: true });
        return;
      }
      const sh = a.st === 'fire' ? G.irand(-2, 2) : a.st === 'tele' && a.t > a.dur - 0.15 ? G.irand(-1, 1) : 0;
      const w = { x: r.x + 3 + sh, y: r.y + 2, w: r.w - 6, h: s.bossH - 6, st: { fr: K, bd: B, bar: Gr, bt: K, tx: W, ac: W, sh: K, out: Gr }, title: 'FIREWALL.EXE', stripes: true, xmode: 'none' };
      T.save(); T.shadowColor = 'rgba(70,255,0,0.6)'; T.shadowBlur = 8; G.rect(w.x, w.y, w.w, w.h, Gr); T.restore();
      const b = G.drawFrame(w);
      for (let y = b.y; y < b.y + b.h - 12; y += 5) { G.rect(b.x, y, b.w, 1, W); for (let x = b.x + (((y - b.y) / 5) % 2 ? 6 : 0); x < b.x + b.w; x += 12) G.rect(x, y, 1, 5, W); }
      // integridad del cortafuegos: baja mientras aguantas
      const iy = b.y + b.h - 11; G.rect(b.x, iy, b.w, 11, K);
      G.text('INTEGRITY', b.x + 3, iy + 2, W);
      const bx = b.x + G.textW('INTEGRITY') + 8, bw = b.x + b.w - bx - 26, f = Math.round((bw - 4) * hp);
      G.box(bx, iy + 2, bw, 7, W); for (let i = 0; i < f; i += 3) G.rect(bx + 2 + i, iy + 4, 2, 3, hp < 0.3 && Math.floor(G.time * 8) % 2 ? W : Gr);
      G.text(Math.ceil(hp * 100) + '%', b.x + b.w - 3, iy + 2, Gr, { al: 'r' });
      // bocas de disparo, una por carril
      for (let i = 0; i < s.n; i++) {
        const c = Math.round(cx(s, i)), hot = a.lanes.includes(i), on = hot && (a.st === 'fire' || Math.floor(a.t * 12) % 2 === 0);
        G.rect(c - 7, s.top - 4, 14, 6, K); G.box(c - 7, s.top - 4, 14, 6, on ? Gr : L); G.rect(c - 3, s.top - 2, 6, 3, on ? W : B);
      }
    },
  };

  // icono: un paquete esquiva bloques entre tres carriles
  G.ICONS[17] = function (t) {
    const mo = Math.floor((t * 24) % 6);
    for (const x of [8, 16]) for (let y = -6 + mo; y < 20; y += 6) G.rect(x, Math.max(0, y), 1, 3, Gr);
    const cyc = Math.floor(t / 1.1), ph = (t % 1.1) / 1.1, ob = [0, 2, 1, 0, 1, 2][cyc % 6];
    const oy = Math.round(-5 + ph * 26); G.rect(ob * 8 + 1, oy, 6, 4, W); G.px(ob * 8 + 2, oy + 1, K); G.px(ob * 8 + 4, oy + 2, K); G.px(ob * 8 + 6, oy + 1, K);
    const safe = (ob + 1) % 3, prev = ([0, 2, 1, 0, 1, 2][(cyc + 5) % 6] + 1) % 3;
    const lane = ph > 0.25 ? safe : prev, px = lane * 8 + 1;
    G.rect(px, 13, 6, 5, W); G.box(px, 13, 6, 5, K); G.px(px + 2, 14, K); G.px(px + 3, 14, K);
    G.rect(px + 1, 18, 1, 2, Gr); G.rect(px + 4, 18, 1, 2, Gr);
  };
  G.CARD_SCHEMES[17] = { top: Gr, tt: K, ib: K, grid: K, bot: Gr, nc: K, bt: K };
})(window.G);
