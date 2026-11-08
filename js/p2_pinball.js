'use strict';
// 15 PINBALL.SYS (parte 2): pinball dentro de la placa base. Las palas se mueven con los pulgares
// (mitad izquierda / derecha, varios dedos a la vez) y hay que encender todos los chips con el bit.
// Jefe: el chip calavera de la BIOS, con escudo que se abre y se cierra y multibola.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const BR = 4;                 // radio de la bola (un bit)
  const SUB = 600;              // subpasos de física por segundo: sin atravesar paredes
  const CHIP_W = 26, CHIP_H = 12;
  const LABELS = ['CPU', 'RAM', 'BUS', 'GPU', 'ROM', 'I/O', 'DMA', 'IRQ'];
  const SPOTS = [[0.27, 0.12], [0.5, 0.12], [0.73, 0.12], [0.15, 0.47], [0.85, 0.47], [0.5, 0.58], [0.3, 0.66], [0.7, 0.66]];
  const pid = (e) => (e && e.pointerId != null ? e.pointerId : 1);
  const clamp = G.clamp;

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // choque bola / cápsula (segmento con radio r0→r1). Si gira alrededor de (px,py) a w rad/s, empuja la bola.
  // Devuelve la velocidad del impacto (0 si no hay choque).
  function hitCap(b, ax, ay, bx, by, r0, r1, e, kick, px, py, w) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let u = l2 ? ((b.x - ax) * dx + (b.y - ay) * dy) / l2 : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
    const cx = ax + dx * u, cy = ay + dy * u, rad = r0 + (r1 - r0) * u;
    let nx = b.x - cx, ny = b.y - cy; const d = Math.hypot(nx, ny), m = BR + rad;
    if (d >= m) return 0;
    if (d < 1e-6) { nx = -dy; ny = dx; const ln = Math.hypot(nx, ny) || 1; nx /= ln; ny /= ln; if (ny > 0) { nx = -nx; ny = -ny; } } else { nx /= d; ny /= d; }
    b.x = cx + nx * m; b.y = cy + ny * m;
    let vcx = 0, vcy = 0;
    if (w) { vcx = -w * (cy - py); vcy = w * (cx - px); }
    const vn = (b.vx - vcx) * nx + (b.vy - vcy) * ny;
    if (vn >= 0) return 0;
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    if (kick) { b.vx += nx * kick; b.vy += ny * kick; }
    return -vn;
  }
  // choque bola / rectángulo (chips)
  function hitRect(b, r, e) {
    const cx = clamp(b.x, r.x, r.x + r.w), cy = clamp(b.y, r.y, r.y + r.h);
    let nx = b.x - cx, ny = b.y - cy, d = Math.hypot(nx, ny);
    if (d >= BR) return 0;
    if (d < 1e-6) { // el centro ha entrado: sale por el lado más cercano
      const dl = b.x - r.x, dr = r.x + r.w - b.x, dt = b.y - r.y, db = r.y + r.h - b.y, mn = Math.min(dl, dr, dt, db);
      nx = mn === dl ? -1 : mn === dr ? 1 : 0; ny = mn === dt ? -1 : mn === db ? 1 : 0; if (nx && ny) ny = 0;
      b.x = nx ? (nx < 0 ? r.x - BR : r.x + r.w + BR) : b.x; b.y = ny ? (ny < 0 ? r.y - BR : r.y + r.h + BR) : b.y;
    } else { nx /= d; ny /= d; b.x = cx + nx * BR; b.y = cy + ny * BR; }
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return 0;
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    return -vn;
  }
  // triángulo en damero (zonas muertas de la mesa)
  function triChk(ax, ay, bx, by, cx, cy, col) {
    const T = G.ctx(), s = (px, py, x1, y1, x2, y2) => (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    T.fillStyle = col;
    for (let y = Math.floor(Math.min(ay, by, cy)); y <= Math.ceil(Math.max(ay, by, cy)); y++) for (let x = Math.floor(Math.min(ax, bx, cx)); x <= Math.ceil(Math.max(ax, bx, cx)); x++) {
      if ((x + y) & 1) continue;
      const d1 = s(x + 0.5, y + 0.5, ax, ay, bx, by), d2 = s(x + 0.5, y + 0.5, bx, by, cx, cy), d3 = s(x + 0.5, y + 0.5, cx, cy, ax, ay);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) T.fillRect(x, y, 1, 1);
    }
  }
  function thick(ax, ay, bx, by, c1, c2) { G.line(ax, ay, bx, by, c1); G.line(ax + 1, ay, bx + 1, by, c1); if (c2) G.line(ax, ay + 1, bx, by + 1, c2); }

  G.MICRO.pinball = {
    mode: 'window', cmd: 'FLIP!', hint: 'HOLD LEFT/RIGHT - LIGHT THE CHIPS', time: 16, fx: 0.4,
    help: ['HOLD LEFT/RIGHT SIDE', 'TO FLIP. LIGHT UP', "ALL THE CHIPS. DON'T", 'LET THE BIT FALL.'],
    init(s) {
      const w = s.r.w, h = s.r.h, cx = w / 2, d = s.d;
      s.k = clamp(h / 480, 0.72, 1.08); s.g = 470 * s.k; s.vmax = 930 * s.k;
      // palas
      const py = h - 34, len = Math.round(w * 0.2 * (d > 0.55 && !s.boss ? 0.9 : 1)), gap = 13, ar = 0.5, au = -0.45;
      const lpx = cx - gap - len * Math.cos(ar), rpx = cx + gap + len * Math.cos(ar);
      s.py = py;
      s.flips = [
        { px: lpx, py, len, aRest: ar, aUp: au, a: ar, w: 0, on: false, r0: 5, r1: 3 },
        { px: rpx, py, len, aRest: Math.PI - ar, aUp: Math.PI - au, a: Math.PI - ar, w: 0, on: false, r0: 5, r1: 3 },
      ];
      // paredes: esquinas cortadas arriba, guías hacia las palas y tirachinas
      const gy0 = py - 64, gyAt = (x) => gy0 + ((x - 2) / (lpx - 4 - 2)) * (py - 4 - gy0);
      s.guide = { gy0, lpx, rpx };
      const segs = s.segs = [];
      const seg = (ax, ay, bx, by, e, kick, tag) => segs.push({ ax, ay, bx, by, e: e == null ? 0.45 : e, kick: kick || 0, tag });
      const mir = (ax, ay, bx, by, e, kick, tag) => { seg(ax, ay, bx, by, e, kick, tag); seg(w - ax, ay, w - bx, by, e, kick, tag); };
      mir(2, 44, 44, 2); seg(44, 2, w - 44, 2); mir(2, 44, 2, gy0); mir(2, gy0, lpx - 4, py - 4, 0.3);
      const sx = 12, sy0 = gyAt(sx), sx1 = lpx - 16, sy1 = gyAt(sx1);
      s.sling = { ax: sx, ay: sy0 - 46, bx: sx, by: sy0, cx: sx1, cy: sy1 };
      mir(sx, sy0 - 46, sx1, sy1, 0.7, 150 * s.k, 'sling'); mir(sx, sy0 - 46, sx, sy0, 0.4);
      // condensadores (bumpers)
      s.bumps = [[0.32, 0.3], [0.68, 0.3], [0.5, 0.42]].map(([fx, fy]) => ({ x: Math.round(w * fx), y: Math.round(h * fy), R: 10, fl: 0, cd: 0 }));
      // chips objetivo / jefe
      s.chips = []; s.lit = 0; s.spin = null; s.boss2 = null;
      if (s.boss) {
        s.hint = 'BREAK THE BIOS SKULL!';
        s.boss2 = { x: cx - 33, y: Math.round(h * 0.1), w: 66, h: 50, x0: cx - 33, hp: 8, hpMax: 8, fl: 0, gate: 1, gt: 0, open: false, multi: false };
        s.bumps[2].y = Math.round(h * 0.45);
        s.T = 32;
      } else {
        s.need = 3 + Math.round(2.6 * d);
        const spots = shuffle(SPOTS.slice()).slice(0, s.need), labs = shuffle(LABELS.slice());
        spots.forEach(([fx, fy], i) => s.chips.push({ x: Math.round(w * fx - CHIP_W / 2), y: Math.round(h * fy - CHIP_H / 2), w: CHIP_W, h: CHIP_H, lab: labs[i], on: false, fl: 0, x0: Math.round(w * fx - CHIP_W / 2), mv: 0 }));
        if (d >= 0.28) { const c = s.chips[s.chips.length - 1]; c.mv = 1; c.amp = Math.min(30, c.x0 - 14, w - 14 - c.x0 - CHIP_W); c.sp = 1.4 + d; }
        if (d >= 0.43) s.spin = { x: cx, y: Math.round(h * 0.5), len: 20, a: 0, w: 2 + d * 1.5 };
        s.T = 9 + s.need * 2.5;
      }
      s.balls = []; s.ptr = {}; s.parts = []; s.pops = []; s.tp = 0; s.dying = null;
      s.save = s.boss ? 4 : 3.5 - 1.5 * d; // al principio, si se cae se devuelve
      this.launch(s, 0.25);
      s.bg = this.makeBg(s);
    },
    launch(s, delay) {
      const w = s.r.w;
      s.balls.push({ x: w - 50, y: 14, vx: (s.boss ? G.rand(40, 90) : -G.rand(120, 240)) * s.k, vy: G.rand(10, 60), wait: delay || 0, still: 0, cd: 0, trail: [] });
    },
    // fondo fijo de la ronda: placa, zonas muertas, paredes y tirachinas
    makeBg(s) {
      const w = s.r.w, h = s.r.h, o = G.mkCanvas(w, h), T0 = G.ctx(), R = G.rng(s.round * 97 + 5);
      G.target(o.x);
      try {
        G.rect(0, 0, w, h, K);
        for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) G.px(x, y, B);
        for (let i = 0; i < 10; i++) { // pistas
          let x = 6 + Math.floor(R() * (w / 8 - 1)) * 8, y = 6 + Math.floor(R() * (h / 8 - 1)) * 8, dir = Math.floor(R() * 4);
          for (let sgm = 0; sgm < 3; sgm++) { const n = 8 * (2 + Math.floor(R() * 5)), dx = [1, 0, -1, 0][dir], dy = [0, 1, 0, -1][dir]; for (let j = 0; j < n; j++) { x += dx; y += dy; if (j % 3 === 0) G.px(x, y, B); } dir = (dir + (R() < 0.5 ? 1 : 3)) % 4; }
          G.rect(x - 1, y - 1, 3, 3, B); G.px(x, y, K);
        }
        const py = s.py, gy0 = s.guide.gy0, lpx = s.guide.lpx, rpx = s.guide.rpx;
        // zonas muertas bajo las guías
        triChk(0, gy0, lpx - 4, py - 4, 0, h, B); triChk(lpx - 4, py - 4, 0, h, lpx - 4, h, B);
        triChk(w, gy0, rpx + 4, py - 4, w, h, B); triChk(rpx + 4, py - 4, w, h, rpx + 4, h, B);
        // esquinas de arriba
        triChk(0, 0, 44, 0, 0, 44, B); triChk(w, 0, w - 44, 0, w, 44, B);
        // paredes
        for (const g of s.segs) if (g.tag !== 'sling') thick(g.ax, g.ay, g.bx, g.by, W, L);
        // tirachinas: triángulo gris con la cara que golpea en verde
        const sl = s.sling;
        for (const m of [0, 1]) {
          const X = (x) => (m ? w - x : x);
          G.tri(X(sl.ax), sl.ay, X(sl.bx), sl.by, X(sl.cx), sl.cy, L);
          G.line(X(sl.ax), sl.ay, X(sl.cx), sl.cy, Gr); G.line(X(sl.ax) + (m ? -1 : 1), sl.ay, X(sl.cx) + (m ? -1 : 1), sl.cy, Gr);
          G.line(X(sl.ax), sl.ay, X(sl.bx), sl.by, W);
        }
        // tubo de entrada arriba a la derecha
        G.rect(w - 56, 0, 12, 9, L); G.box(w - 56, 0, 12, 9, W); G.rect(w - 53, 2, 6, 7, K);
        G.text('IN', w - 40, 3, L);
        // flechas de los carriles y rótulo
        G.rect(4, h - 13, 58, 10, K); G.text('NEØ BOARD', 6, h - 11, L);
      } finally { G.target(T0); }
      return o;
    },
    pressSync(s) {
      const on = [false, false];
      for (const k in s.ptr) on[s.ptr[k]] = true;
      s.flips.forEach((f, i) => { if (on[i] && !f.on) A().sfx('flip'); f.on = on[i]; });
    },
    side(s, x) { return x < s.r.x + s.r.w / 2 ? 0 : 1; },
    down(s, x, y, e) { s.ptr[pid(e)] = this.side(s, x); this.pressSync(s); },
    move(s, x, y, e) { const id = pid(e); if (s.ptr[id] == null) return; const sd = this.side(s, x); if (sd !== s.ptr[id]) { s.ptr[id] = sd; this.pressSync(s); } },
    up(s, x, y, e) { delete s.ptr[pid(e)]; this.pressSync(s); },
    pop(s, x, y, txt, col, big) { s.pops.push({ x, y, txt, col: col || W, t: 0, big }); },
    spark(s, x, y, n, col, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = G.rand(40, sp || 160); s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: G.rand(0.25, 0.6), col: col || Gr }); } },
    update(s, dt) {
      s.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; }); s.parts = s.parts.filter((p) => p.t < p.life);
      s.pops.forEach((p) => (p.t += dt)); s.pops = s.pops.filter((p) => p.t < (p.big ? 1.1 : 0.6));
      s.bumps.forEach((b) => { b.fl = Math.max(0, b.fl - dt); b.cd = Math.max(0, b.cd - dt); });
      s.chips.forEach((c) => (c.fl = Math.max(0, c.fl - dt)));
      // jefe vencido: explota y luego gana
      if (s.dying != null) {
        s.dying -= dt; s.T = Math.max(s.T, s.t + 1);
        const bo = s.boss2; if (Math.random() < 0.5) this.spark(s, bo.x + G.rand(0, bo.w), bo.y + G.rand(0, bo.h), 3, Math.random() < 0.5 ? Gr : W, 220);
        if (s.dying <= 0) s.win();
        return;
      }
      const n = Math.max(1, Math.round(dt * SUB)), hh = dt / n;
      for (let i = 0; i < n && !s.done && s.dying == null; i++) this.phys(s, hh);
      // bolas perdidas
      for (let i = s.balls.length - 1; i >= 0; i--) {
        const b = s.balls[i];
        if (b.y > s.r.h + 10) {
          s.balls.splice(i, 1);
          if (s.t < s.save) { this.launch(s, 0.35); this.pop(s, s.r.w / 2, s.r.h * 0.5, 'BALL SAVED', Gr, true); A().sfx('beepT'); }
          else if (!s.balls.length) { A().sfx('drop'); G.pulse({ glitch: 0.6, shake: 4 }); s.fail('BALL LOST'); return; }
          else { A().sfx('drop'); this.pop(s, s.r.w / 2, s.r.h * 0.5, 'BALL LOST', W, true); }
        }
      }
    },
    phys(s, h) {
      s.tp += h;
      // palas
      for (const f of s.flips) {
        const tg = f.on ? f.aUp : f.aRest, sp = f.on ? 24 : 12, df = tg - f.a, st = sp * h * Math.sign(df);
        if (Math.abs(df) <= Math.abs(st)) { f.w = df / h; f.a = tg; } else { f.a += st; f.w = st / h; }
      }
      if (s.spin) s.spin.a += s.spin.w * h;
      for (const c of s.chips) if (c.mv) c.x = Math.round(c.x0 + Math.sin(s.tp * c.sp) * c.amp);
      const bo = s.boss2;
      if (bo) {
        bo.x = s.r.w / 2 - 33 + Math.sin(s.tp * 0.7) * s.r.w * 0.2;
        bo.gt += h; // escudo: cerrado → se abre → abierto → se cierra
        const cyc = 4.2, ph = bo.gt % cyc; bo.open = ph > 1.6; bo.gate = ph < 1.6 ? 1 : ph < 1.9 ? 1 - (ph - 1.6) / 0.3 : ph > cyc - 0.3 ? (ph - (cyc - 0.3)) / 0.3 : 0;
        bo.fl = Math.max(0, bo.fl - h);
      }
      for (const b of s.balls) {
        if (b.wait > 0) { b.wait -= h; continue; }
        b.cd = Math.max(0, b.cd - h);
        b.vy += s.g * h; b.x += b.vx * h; b.y += b.vy * h;
        for (const g of s.segs) {
          const imp = hitCap(b, g.ax, g.ay, g.bx, g.by, 2, 2, g.e, g.kick);
          if (imp > 60 && g.tag === 'sling' && b.cd <= 0) { b.cd = 0.12; A().sfx('bounce', 0); G.pulse({ ab: 1 }); this.spark(s, b.x, b.y, 3, Gr); }
        }
        for (const bp of s.bumps) {
          const dx = b.x - bp.x, dy = b.y - bp.y, d = Math.hypot(dx, dy), m = bp.R + BR;
          if (d < m && d > 0) {
            const nx = dx / d, ny = dy / d; b.x = bp.x + nx * m; b.y = bp.y + ny * m;
            const vn = b.vx * nx + b.vy * ny;
            if (vn < 0) { b.vx -= 1.9 * vn * nx; b.vy -= 1.9 * vn * ny; }
            b.vx += nx * 230 * s.k; b.vy += ny * 230 * s.k;
            if (bp.cd <= 0) { bp.cd = 0.1; bp.fl = 0.18; A().sfx('bounce', 1 + (bp.x % 3)); G.pulse({ ab: 1.2 }); this.spark(s, bp.x + nx * bp.R, bp.y + ny * bp.R, 4, W); this.pop(s, bp.x, bp.y - 14, '+100', L); }
          }
        }
        for (const c of s.chips) {
          const imp = hitRect(b, c, 0.6);
          if (imp > 25) {
            if (!c.on) {
              c.on = true; c.fl = 0.5; s.lit++; A().sfx('combo'); G.pulse({ ab: 2, flash: 0.08, flashCol: Gr }); G.vibrate(15);
              this.spark(s, c.x + c.w / 2, c.y + c.h / 2, 10, Gr, 200); this.pop(s, c.x + c.w / 2, c.y - 8, c.lab + ' ON', Gr);
              if (s.lit >= s.need) { A().sfx('zap'); G.pulse({ flash: 0.25, flashCol: Gr, ab: 3 }); s.win(); return; }
            } else if (c.fl <= 0) { c.fl = 0.15; A().sfx('tap'); }
          }
        }
        if (s.spin) {
          const sp = s.spin, ca = Math.cos(sp.a) * sp.len, sa = Math.sin(sp.a) * sp.len;
          if (hitCap(b, sp.x - ca, sp.y - sa, sp.x + ca, sp.y + sa, 3, 3, 0.5, 0, sp.x, sp.y, sp.w) > 80 && b.cd <= 0) { b.cd = 0.1; A().sfx('hit'); }
        }
        if (bo) this.hitBoss(s, b, bo);
        for (const f of s.flips) {
          const tx = f.px + Math.cos(f.a) * f.len, ty = f.py + Math.sin(f.a) * f.len;
          hitCap(b, f.px, f.py, tx, ty, f.r0, f.r1, 0.3, 0, f.px, f.py, f.w);
        }
        if (b.x < 6) { b.x = 6; b.vx = Math.abs(b.vx) * 0.5; } else if (b.x > s.r.w - 6) { b.x = s.r.w - 6; b.vx = -Math.abs(b.vx) * 0.5; }
        if (b.y < 6) { b.y = 6; b.vy = Math.abs(b.vy) * 0.5; }
        // tope de velocidad
        const v = Math.hypot(b.vx, b.vy); if (v > s.vmax) { b.vx *= s.vmax / v; b.vy *= s.vmax / v; }
        // si se queda atascada lejos de las palas, un empujón
        b.still = v < 12 && b.y < s.py - 30 ? b.still + h : 0;
        if (b.still > 2) { b.still = 0; b.vx = G.rand(-160, 160); b.vy = -G.rand(80, 180); }
      }
    },
    hitBoss(s, b, bo) {
      const gy = bo.y + bo.h + 8, gw = (bo.w / 2 + 8) * bo.gate;
      if (bo.gate > 0.05) { // escudo: dos hojas que se cierran desde los lados
        hitCap(b, bo.x - 8, gy, bo.x - 8 + gw, gy, 2, 2, 0.6, 0); hitCap(b, bo.x + bo.w + 8 - gw, gy, bo.x + bo.w + 8, gy, 2, 2, 0.6, 0);
      }
      const imp = hitRect(b, bo, 0.7);
      if (imp > 40 && b.cd <= 0) {
        b.cd = 0.3; b.vy = Math.max(b.vy, 160 * s.k);
        bo.hp--; bo.fl = 0.25; A().sfx('hit'); G.pulse({ ab: 4, shake: 5, flash: 0.12, flashCol: W, glitch: 0.4 }); G.vibrate(30);
        this.spark(s, b.x, b.y, 12, Math.random() < 0.5 ? Gr : W, 240); this.pop(s, bo.x + bo.w / 2, bo.y - 8, 'HP ' + Math.max(0, bo.hp), W);
        if (bo.hp > 0 && bo.hp <= Math.floor(bo.hpMax / 2) && !bo.multi) { bo.multi = true; this.launch(s, 0.2); this.pop(s, s.r.w / 2, s.r.h * 0.55, 'MULTIBALL!', Gr, true); A().sfx('alarm'); }
        if (bo.hp <= 0) { s.dying = 1.0; s.balls.forEach((q) => (q.wait = 99)); s.pops = []; this.pop(s, s.r.w / 2, s.r.h * 0.5, 'BIOS DELETED', Gr, true); A().sfx('boom'); A().sfx('glitch'); G.pulse({ flash: 0.4, flashCol: W, shake: 8, glitch: 1, ab: 6 }); }
      }
    },
    draw(s) {
      const T = G.ctx(), X0 = s.r.x, Y0 = s.r.y, w = s.r.w, h = s.r.h, t = s.t;
      T.drawImage(s.bg.c, X0, Y0);
      T.save(); T.translate(X0, Y0);
      // condensadores
      for (const bp of s.bumps) {
        G.circ(bp.x, bp.y, bp.R, bp.fl > 0 ? Gr : L, W); G.circ(bp.x, bp.y, bp.R - 4, K, bp.fl > 0 ? W : B);
        G.rect(bp.x - 1, bp.y - 3, 3, 7, bp.fl > 0 ? Gr : W); G.rect(bp.x - 3, bp.y - 1, 7, 3, bp.fl > 0 ? Gr : W);
      }
      // chips
      for (const c of s.chips) {
        for (let px = c.x + 3; px < c.x + c.w - 2; px += 5) { G.rect(px, c.y - 2, 2, 2, L); G.rect(px, c.y + c.h, 2, 2, L); }
        const hot = c.fl > 0 && Math.floor(t * 20) % 2;
        G.rect(c.x, c.y, c.w, c.h, c.on ? (hot ? W : Gr) : K);
        G.box(c.x, c.y, c.w, c.h, c.on ? W : Math.floor(t * 3 + c.x) % 2 ? Gr : W);
        G.text(c.lab, c.x + c.w / 2, c.y + 3, c.on ? K : W, { al: 'c' });
      }
      if (s.spin) { const sp = s.spin, ca = Math.cos(sp.a) * sp.len, sa = Math.sin(sp.a) * sp.len; thick(sp.x - ca, sp.y - sa, sp.x + ca, sp.y + sa, W, L); G.circ(sp.x, sp.y, 3, Gr, W); }
      if (s.boss2) this.drawBoss(s, s.boss2, t);
      // palas: cápsula blanca con eje gris
      for (const f of s.flips) {
        const c = Math.cos(f.a), sn = Math.sin(f.a), tx = f.px + c * f.len, ty = f.py + sn * f.len, nx = -sn, ny = c;
        const a1 = [f.px + nx * f.r0, f.py + ny * f.r0], a2 = [f.px - nx * f.r0, f.py - ny * f.r0], b1 = [tx + nx * f.r1, ty + ny * f.r1], b2 = [tx - nx * f.r1, ty - ny * f.r1];
        G.tri(a1[0], a1[1], a2[0], a2[1], b1[0], b1[1], W); G.tri(a2[0], a2[1], b2[0], b2[1], b1[0], b1[1], W);
        G.circ(tx, ty, f.r1, W, null); G.circ(f.px, f.py, f.r0, L, W); G.px(f.px, f.py, K);
        if (f.on) G.line(a2[0], a2[1], b2[0], b2[1], Gr);
      }
      // bolas: estela verde y brillo
      for (const b of s.balls) {
        if (b.wait > 0 && b.wait < 50) { if (Math.floor(t * 10) % 2) G.circ(b.x, b.y, BR, null, Gr); continue; }
        if (b.wait >= 50) continue;
        b.trail.push([b.x, b.y]); if (b.trail.length > 5) b.trail.shift();
        b.trail.forEach(([x, y], i) => { if (i < b.trail.length - 1) G.rect(x - 1, y - 1, 2, 2, i > 2 ? Gr : B); });
        T.save(); T.shadowColor = 'rgba(70,255,0,0.9)'; T.shadowBlur = 6; G.circ(b.x, b.y, BR, W, null); T.restore();
        G.circ(b.x, b.y, BR, W, null); G.px(b.x - 1, b.y - 1, Gr);
      }
      for (const p of s.parts) G.rect(p.x, p.y, 2, 2, p.col);
      for (const p of s.pops) {
        if (p.big) { if (Math.floor(p.t * 8) % 2 === 0 || p.t < 0.3) { const tw = G.textW(p.txt, 2, 1, true) + 10; G.rect(p.x - tw / 2, p.y - 4, tw, 22, K); G.box(p.x - tw / 2, p.y - 4, tw, 22, p.col); G.text(p.txt, p.x, p.y, p.col, { al: 'c', s: 2, b: true }); } }
        else G.text(p.txt, p.x, p.y - p.t * 24, p.col, { al: 'c', b: true });
      }
      // marcador en el delantal de abajo
      if (s.boss2) { const bo = s.boss2; G.text('BIOS', 6, h - 30, W, { b: true }); for (let i = 0; i < bo.hpMax; i++) G.rect(6 + i * 6, h - 21, 4, 6, i < bo.hp ? Gr : B); }
      else { G.text('CHIPS', w - 6, h - 30, W, { al: 'r', b: true }); G.text(s.lit + '/' + s.need, w - 6, h - 21, Gr, { al: 'r', s: 2, b: true }); }
      if (s.t < s.save && Math.floor(t * 4) % 2) G.text('BALL SAVE', s.boss2 ? w - 6 : 6, h - 30 + (s.boss2 ? 0 : -10), Gr, { al: s.boss2 ? 'r' : 'l' });
      T.restore();
    },
    drawBoss(s, bo, t) {
      const x = Math.round(bo.x + (bo.fl > 0 ? G.irand(-2, 2) : 0) + (s.dying != null ? G.irand(-3, 3) : 0)), y = Math.round(bo.y), hot = bo.fl > 0 && Math.floor(t * 30) % 2;
      // patas del chip
      for (let px = x + 4; px < x + bo.w - 3; px += 6) { G.rect(px, y - 3, 3, 3, L); G.rect(px, y + bo.h, 3, 3, L); }
      for (let py = y + 4; py < y + bo.h - 3; py += 6) { G.rect(x - 3, py, 3, 3, L); G.rect(x + bo.w, py, 3, 3, L); }
      G.rect(x, y, bo.w, bo.h, hot ? W : K); G.box(x, y, bo.w, bo.h, Gr); G.box(x + 2, y + 2, bo.w - 4, bo.h - 4, B);
      // calavera con ojos verdes (parpadean cuando tiene poca vida)
      const sx = x + Math.round(bo.w / 2 - 22), sy = y + 4, low = bo.hp <= 3;
      if (!low || Math.floor(t * 6) % 2) { G.rect(sx + 6, sy + 14, 10, 10, Gr); G.rect(sx + 28, sy + 14, 10, 10, Gr); }
      G.drawSpr('skull', sx, sy, { '#': hot ? K : W }, 2);
      if (s.dying == null) G.text('BIOS', x + bo.w / 2, y + bo.h - 1, Gr, { al: 'c' });
      // escudo: dos hojas rayadas que se cierran por debajo
      const gy = y + bo.h + 8, gw = Math.round((bo.w / 2 + 8) * bo.gate);
      if (gw > 1) {
        for (const [gx0, gx1] of [[x - 8, x - 8 + gw], [x + bo.w + 8 - gw, x + bo.w + 8]]) {
          G.rect(gx0, gy - 2, gx1 - gx0, 5, K); G.box(gx0, gy - 2, gx1 - gx0, 5, W);
          for (let i = gx0 + 2; i < gx1 - 2; i += 4) G.rect(i, gy - 1, 2, 3, Gr);
        }
      }
      if (bo.open && Math.floor(t * 4) % 2) G.text('OPEN!', x + bo.w / 2, gy + 6, Gr, { al: 'c', b: true });
    },
  };

  // icono: palas y un bit que rebota
  G.ICONS[15] = function (t) {
    const p = (t * 1.3) % 1, k = Math.sin(p * Math.PI), bx = Math.round(10 + k * 7), by = Math.round(14 - k * 10), up = p < 0.18 || p > 0.9;
    G.line(1, 6, 1, 13, L); G.line(1, 13, 7, 17, L); G.line(22, 6, 22, 13, L); G.line(22, 13, 16, 17, L);
    G.circ(18, 4, 3, K, W); G.px(18, 4, Gr);                                   // condensador
    for (const [x0, dir] of [[7, 1], [16, -1]]) {                               // palas gruesas
      const x1 = x0 + dir * 5, y1 = up ? 14 : 19;
      G.line(x0, 17, x1, y1, up ? Gr : W); G.line(x0, 18, x1, y1 + 1, up ? Gr : W);
    }
    G.rect(bx - 1, by - 1, 3, 3, W); G.px(bx - 3 + (p > 0.5 ? 6 : 0), by + 2, B);
  };
  G.CARD_SCHEMES[15] = { top: B, tt: W, ib: K, grid: B, bot: L, nc: B, bt: K };
})(window.G);
