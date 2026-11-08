'use strict';
// PARTE 2 · 21 RUN.EXE: el reloj de arena corre por encima de la barra de tareas y salta las ventanas de error.
// Toque = salto · mantener = más alto · otro toque en el aire = doble salto (con voltereta).
// Jefe: una ventana gigante te persigue por la izquierda y te tira X rodando por el suelo.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  const GRAV = 1350, JV = 430, JV2 = 370, HOLD_G = 560, HOLD_T = 0.24; // salto: ~68 px con un toque, ~118 manteniendo
  const SHOT_V = 100;  // X del jefe: px/s hacia la derecha
  const MSGS = ['NOT FOUND', 'NO SIGNAL', 'DENIED', 'ERROR 404', 'TRY AGAIN', 'LOW DISK', 'FATAL', 'WAIT...', 'NO!', 'BAD FILE', 'ABORT?'];
  const TITLES = ['ERROR', 'ALERT', 'FATAL', 'WARN!', 'OOPS', 'HALT', 'BUG'];
  const DECO = ['folder', 'doc', 'notepad', 'cd', 'floppy', 'calc', 'clock', 'camera', 'music', 'globe', 'picture', 'printer'];
  const fit = (str, px) => { const n = Math.max(0, Math.floor((px + 1) / 6)); return str.length <= n ? str : n >= 3 ? str.slice(0, n - 1) + '.' : ''; };

  // reloj de arena 7x9 (a escala 2): '#' marco, 'a' arena de arriba, 'b' arena de abajo
  const HG = ['#######', '.#aaa#.', '.#aaa#.', '..#a#..', '...#...', '..#b#..', '.#bbb#.', '.#bbb#.', '#######'];
  const TOP = [[3, 3], [2, 2], [2, 3], [2, 4], [1, 2], [1, 3], [1, 4]];  // se vacía de arriba abajo
  const BOT = [[7, 2], [7, 3], [7, 4], [6, 2], [6, 3], [6, 4], [5, 3]];  // se llena de abajo arriba
  function glass(ox, oy, p, sand, flow) {
    const nTop = Math.round(7 * (1 - G.clamp(p, 0, 1))), nBot = 7 - nTop;
    const full = {};
    TOP.slice(0, nTop).forEach(([r, c]) => (full[r + '_' + c] = 1));
    BOT.slice(0, nBot).forEach(([r, c]) => (full[r + '_' + c] = 1));
    // contorno blanco para que se lea sobre cualquier fondo
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (let r = 0; r < 9; r++) for (let c = 0; c < 7; c++) if (HG[r][c] !== '.') G.rect(ox + c * 2 + dx, oy + r * 2 + dy, 2, 2, W);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 7; c++) {
      const ch = HG[r][c]; if (ch === '.') continue;
      G.rect(ox + c * 2, oy + r * 2, 2, 2, ch === '#' ? K : full[r + '_' + c] ? sand : W);
    }
    if (flow && nTop > 0) { const top = nBot >= 4 ? 12 : 14; for (let y = oy + 10; y < oy + top; y++) if ((y + Math.floor(G.time * 20)) % 2) G.px(ox + 7, y, sand); }
  }

  // una pieza (ventana) de un obstáculo: dx desde su borde izquierdo, base = altura sobre el suelo
  function piece(s, kind, dx, base, w, h) {
    const p = { kind, dx, base, w, h, st: G.randStyle(s.block), ic: Math.random() < 0.5 ? 'xcirc' : 'warn' };
    p.title = w >= 44 ? fit(G.pick(TITLES), w - 17) : '';
    if (kind === 'float' || kind === 'high') p.msg = fit(G.pick(MSGS), w - 8);
    if (kind === 'stk') p.msg = G.pick(['ERR', '!!!', 'NO', '404', 'BUG']);
    return p;
  }
  function mkOb(s, kind, x) {
    const ps = [];
    if (kind === 'err') ps.push(piece(s, 'err', 0, 0, G.irand(28, 34), G.irand(24, 28)));
    else if (kind === 'warn') ps.push(piece(s, 'warn', 0, 0, G.irand(42, 50), G.irand(29, 33)));
    else if (kind === 'tall') ps.push(piece(s, 'tall', 0, 0, G.irand(30, 34), G.irand(48, 54)));
    else if (kind === 'stack') { const n = s.d > 0.7 && Math.random() < 0.5 ? 3 : 2; for (let i = 0; i < n; i++) ps.push(piece(s, 'stk', i * 5, i * 14, 28, 22)); }
    else if (kind === 'float') ps.push(piece(s, 'float', 0, G.irand(28, 33), G.irand(56, 72), 24));
    else if (kind === 'arch') { ps.push(piece(s, 'err', 10, 0, 30, 24)); ps.push(piece(s, 'high', 0, 98, 50, 24)); }
    let w = 0; for (const p of ps) w = Math.max(w, p.dx + p.w);
    return { kind, x, w, ps, ph: Math.random() * 6, passed: false };
  }
  // las ventanas que flotan suben y bajan un poco
  const bobY = (s, o, p) => (p.base > 0 && p.kind !== 'stk' ? Math.round(Math.sin(s.t * 3 + o.ph) * 2) : 0);

  function drawPiece(s, o, p, fy) {
    const st = p.st, x = Math.round(o.x + p.dx), y = Math.round(fy - p.base - p.h - bobY(s, o, p));
    if (p.base > 0 && p.kind !== 'stk') G.drect(x + 4, fy - 2, p.w - 8, 2, 4, K, null); // sombra en el suelo: así se ve que flota
    const r = G.drawFrame({ x, y, w: p.w, h: p.h, st, title: p.title, stripes: p.w >= 40, xmode: 'x' });
    if (p.kind === 'err') G.drawSpr('xcirc', r.x + Math.floor(r.w / 2) - 4, r.y + Math.floor((r.h - 9) / 2), { '#': st.ac });
    else if (p.kind === 'warn') {
      G.drawSpr(p.ic, r.x + 3, r.y + 3, { '#': st.ac });
      G.drawBtn(r.x + r.w - 19, r.y + r.h - 12, 17, 10, 'OK', st.tx, st.bd);
    } else if (p.kind === 'tall') {
      G.drawSpr('hg1', r.x + Math.floor(r.w / 2) - 7, r.y + 2, { '#': st.ac, o: st.ac }, 2);
      G.text('WAIT', r.x + r.w / 2, r.y + r.h - 9, st.tx, { al: 'c' });
    } else G.text(p.msg, r.x + 3, r.y + Math.floor((r.h - 7) / 2), st.tx);
  }

  G.MICRO.run = {
    mode: 'desk', cmd: 'JUMP!', hint: 'JUMP THE ERROR WINDOWS', time: 9, fx: 0.7, winOnTimeout: true,
    help: ['TAP TO JUMP THE ERRORS.', 'HOLD TO JUMP HIGHER.', 'TAP AGAIN IN THE AIR', 'FOR A DOUBLE JUMP.'],
    init(s) {
      const r = s.r, d = s.d;
      r.h += 4; // el suelo es la propia barra de tareas: el área llega hasta ella
      s.fy = r.y + r.h - 3;                       // altura del suelo en pantalla
      s.rx = r.x + (s.boss ? 124 : 40);            // el corredor (no se mueve en horizontal)
      s.v0 = s.boss ? 132 : 122 + 58 * d;
      s.T = s.boss ? 14 : 7 + 3 * d;
      s.run = { h: 0, vh: 0, ground: true, dbl: false, holdT: 0, ang: 0, spin: false, cyc: 0, stun: 0 };
      s.hold = false; s.buf = 0; s.dist = 0; s.nextAt = 30; s.v = s.v0;
      s.obs = []; s.parts = []; s.ghosts = []; s.shots = []; s.cleared = 0; s.crash = false; s.nextKind = this.pickKind(s);
      s.rc = G.mkCanvas(24, 30);
      s.deco = [];
      for (let i = 0; i < 4; i++) s.deco.push({ x: r.x + 20 + i * 72, y: s.fy - 200, name: G.pick(DECO), sp: 0.32 });
      for (let i = 0; i < 4; i++) s.deco.push({ x: r.x + 56 + i * 72, y: s.fy - 300, name: G.pick(DECO), sp: 0.18 });
      if (s.boss) {
        s.hint = 'OUTRUN THE GIANT WINDOW';
        s.bo = { edge: s.rx - 66, gap0: 66, w: 178, h: Math.min(226, Math.round(r.h * 0.48)), flash: 0, fireT: 2.2, warnT: -1, roarT: 1.2, st: G.WSTYLES.b3 };
      }
    },
    pickKind(s) {
      const d = s.d, opts = [['err', 3], ['warn', 3]];
      if (d >= 0.14) opts.push(['float', 2]);
      if (d >= 0.29) opts.push(['tall', 1.6]);
      if (d >= 0.44) opts.push(['stack', 1.6]);
      if (d >= 0.59) opts.push(['arch', 1]);
      let tot = 0; for (const o of opts) tot += o[1];
      let k = Math.random() * tot; for (const o of opts) { k -= o[1]; if (k <= 0) return o[0]; }
      return 'err';
    },
    spawn(s) {
      const r = s.r, o = mkOb(s, s.nextKind, r.x + r.w + 50);
      s.obs.push(o);
      s.nextKind = this.pickKind(s);
      let gapT = G.rand(0.95, 1.45) - 0.3 * s.d;
      if (s.nextKind === 'float' || s.nextKind === 'arch') gapT += 0.25; // después de un salto largo, margen antes de lo que hay que pasar por debajo
      if (o.kind === 'float') gapT += 0.1;
      s.nextAt = s.dist + o.w + s.v * gapT;
    },
    jump(s, second) {
      const R = s.run;
      R.vh = second ? JV2 : JV; R.ground = false; R.holdT = 0;
      if (second) { R.dbl = true; R.spin = true; R.ang = 0; }
      A().sfx('bounce', second ? 2 : 0);
      if (R.h <= 0) for (let k = 0; k < 4; k++) s.parts.push({ x: s.rx + 7 + G.rand(-4, 4), y: s.fy - 1, vx: G.rand(-60, -10), vy: G.rand(-40, -10), t: 0, col: W });
    },
    down(s) {
      s.hold = true;
      if (s.crash) return;
      const R = s.run;
      if (R.ground) this.jump(s, false);
      else if (!R.dbl) this.jump(s, true);
      else s.buf = 0.14; // toque justo antes de caer: salta al tocar el suelo
    },
    up(s) { s.hold = false; },
    // choque: fuera de la ronda del jefe es fallo directo; con el jefe, tropiezas y él se acerca
    hurt(s, o, why) {
      const R = s.run, cx = o ? o.x + o.w / 2 : s.rx;
      for (let k = 0; k < 14; k++) s.parts.push({ x: cx + G.rand(-10, 10), y: s.fy - R.h - G.rand(4, 24), vx: G.rand(-90, 90), vy: G.rand(-160, -40), t: 0, col: G.pick([W, Gr, B, K]) });
      A().sfx('hit');
      if (!s.boss) { s.crash = true; R.ang = -Math.PI / 2; G.pulse({ shake: 6, glitch: 0.8, ab: 4 }); s.fail(why || 'CRASHED'); return; }
      R.stun = 0.7; s.bo.edge += 36; s.bo.flash = 0.25; A().sfx('zap');
      G.pulse({ glitch: 1, shake: 6, ab: 5 }); G.vibrate(40);
      if (o) { o.dead = true; this.ghostOb(s, o); }
    },
    ghostOb(s, o) {
      for (const p of o.ps) {
        const x = o.x + p.dx, y = s.fy - p.base - p.h;
        s.ghosts.push({ x, y, w: p.w, h: p.h, t: 0, col: p.st.fr === K ? W : p.st.fr });
        for (let k = 0; k < 4; k++) s.parts.push({ x: x + G.rand(0, p.w), y: y + G.rand(0, p.h), vx: G.rand(-50, 50), vy: G.rand(-90, -20), t: 0, col: W });
      }
    },
    update(s, dt) {
      const r = s.r, R = s.run, k = G.clamp(s.t / s.T, 0, 1);
      s.v = s.v0 * (1 + 0.12 * k);
      const mv = s.v * dt;
      s.dist += mv;
      // con el jefe, mientras rueda una X por detrás no entra nada por delante (no hay dos peligros a la vez)
      const shotLive = s.boss && (s.bo.warnT >= 0 || s.shots.some((sh) => !sh.passed));
      if (s.dist >= s.nextAt) { if (shotLive) s.nextAt = s.dist + 4; else this.spawn(s); }
      for (const o of s.obs) o.x -= mv;
      for (const q of s.deco) { q.x -= mv * q.sp; if (q.x < r.x - 30) q.x += 4 * 72; }
      // salto
      if (!R.ground) {
        const hold = s.hold && R.vh > 0 && R.holdT < HOLD_T;
        if (hold) R.holdT += dt;
        R.vh -= (hold ? HOLD_G : GRAV) * dt; R.h += R.vh * dt;
        if (R.spin) { R.ang += dt * 15; if (R.ang >= Math.PI * 2) { R.ang = 0; R.spin = false; } }
        if (R.h <= 0) {
          R.h = 0; R.vh = 0; R.ground = true; R.dbl = false; R.spin = false; R.ang = 0;
          A().sfx('step');
          for (let q = 0; q < 5; q++) s.parts.push({ x: s.rx + 7 + G.rand(-6, 6), y: s.fy - 1, vx: G.rand(-70, 40), vy: G.rand(-50, -10), t: 0, col: W });
          if (s.buf > 0) { s.buf = 0; this.jump(s, false); }
        }
      }
      if (s.buf > 0) s.buf -= dt;
      R.cyc += dt * s.v / 10;
      if (R.stun > 0) R.stun -= dt;
      // choques (cajas más pequeñas que el dibujo: perdona los roces)
      const hx0 = s.rx + 2, hx1 = s.rx + 12, hy0 = R.h + 1, hy1 = R.h + 21;
      if (R.stun <= 0) {
        for (const o of s.obs) {
          if (o.dead || o.x > hx1 || o.x + o.w < hx0) continue;
          for (const p of o.ps) {
            const ox0 = o.x + p.dx + 2, ox1 = o.x + p.dx + p.w - 2, b = p.base + bobY(s, o, p), oy0 = b + (b > 0 ? 2 : 0), oy1 = b + p.h - 2;
            if (hx1 > ox0 && hx0 < ox1 && hy1 > oy0 && hy0 < oy1) { this.hurt(s, o); if (s.done) return; break; }
          }
          if (R.stun > 0) break;
        }
      }
      // ventanas que ya has pasado
      for (const o of s.obs) {
        if (!o.passed && !o.dead && o.x + o.w < hx0) {
          o.passed = true; s.cleared++;
          A().sfx('reel', s.cleared % 4);
          if (s.cleared % 5 === 0) { A().sfx('combo'); G.pulse({ ab: 2 }); }
          if (s.boss) s.bo.edge -= 8;
        }
      }
      if (s.boss) { this.updBoss(s, dt, hx0, hx1, hy0); if (s.done) return; }
      s.obs = s.obs.filter((o) => !o.dead && o.x + o.w > r.x - 6);
      s.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; }); s.parts = s.parts.filter((p) => p.t < 0.5);
      s.ghosts.forEach((g) => (g.t += dt)); s.ghosts = s.ghosts.filter((g) => g.t < 0.14);
    },
    updBoss(s, dt, hx0, hx1, hy0) {
      const bo = s.bo, r = s.r, k = G.clamp(s.t / s.T, 0, 1);
      bo.edge += (4 + 3 * k) * dt;            // se acerca solo
      bo.edge = Math.max(r.x + 8, bo.edge);
      if (bo.flash > 0) bo.flash -= dt;
      // se come las ventanas que dejas atrás
      for (const o of s.obs) if (!o.dead && o.x + o.w < bo.edge - 6) { o.dead = true; this.ghostOb(s, o); bo.flash = Math.max(bo.flash, 0.08); }
      // rugido: glitch de vez en cuando
      bo.roarT -= dt; if (bo.roarT <= 0) { bo.roarT = G.rand(1.2, 2.2); G.pulse({ glitch: 0.45, ab: 3 }); A().sfx('glitch'); }
      // dispara X rodando por el suelo (avisa antes)
      if (bo.warnT >= 0) {
        bo.warnT -= dt;
        if (bo.warnT < 0) { s.shots.push({ x: bo.edge - 6, passed: false }); bo.fireT = G.rand(2.0, 3.0); A().sfx('zap'); G.pulse({ ab: 3 }); }
      } else {
        bo.fireT -= dt;
        if (bo.fireT <= 0) {
          const eta = (s.rx - bo.edge) / SHOT_V + 0.55;
          const busy = s.obs.some((o) => { const xa = o.x - s.v * eta; return !o.passed && xa < s.rx + 14 + s.v * 0.8 && xa + o.w > s.rx - 40; });
          if (busy) bo.fireT = 0.25; else { bo.warnT = 0.55; A().sfx('warn'); }
        }
      }
      for (const sh of s.shots) {
        sh.x += SHOT_V * dt;
        if (s.run.stun <= 0 && !sh.hit && sh.x + 8 > hx0 && sh.x + 1 < hx1 && hy0 < 8) { sh.hit = true; this.hurt(s, null); if (s.done) return; }
        if (!sh.passed && sh.x > hx1) { sh.passed = true; if (!sh.hit) { s.cleared++; bo.edge -= 6; A().sfx('reel', 2); } }
      }
      s.shots = s.shots.filter((sh) => sh.x < r.x + r.w + 12);
      if (bo.edge >= s.rx + 3) { s.run.stun = 0; s.crash = true; G.pulse({ glitch: 1, shake: 8, ab: 6 }); A().sfx('boom'); s.fail('CAUGHT'); }
    },
    draw(s) {
      const r = s.r, fy = s.fy, R = s.run, T = G.ctx();
      // iconos del escritorio que pasan despacio (sensación de velocidad)
      for (const q of s.deco) {
        const x = Math.round(q.x), y = Math.round(q.y);
        T.drawImage(G.icon20(q.name, s.block), x, y);
        const lb = G.ICON20_LABEL[q.name] || '', lw = G.textW(lb) + 4;
        G.rect(x + 10 - lw / 2, y + 22, lw, 9, K); G.text(lb, x + 10, y + 23, W, { al: 'c' });
      }
      this.drawHud(s);
      // suelo: el borde de la barra de tareas, con marcas que corren
      G.rect(r.x, fy, r.w, r.y + r.h - fy, K);
      const off = Math.floor(s.dist) % 7;
      G.dash(r.x - off, fy + 1, r.w + 8, Gr, 3, 4);
      if (s.boss) this.drawBoss(s, fy);
      // obstáculos (las piezas de abajo primero)
      for (const o of s.obs) {
        if (o.x > r.x + r.w + 2) { // aviso en el borde antes de entrar
          if (Math.floor(G.time * 10) % 2 === 0) { const p = o.ps[o.ps.length - 1], y = Math.round(fy - p.base - Math.min(p.h, 24) / 2 - 5); G.rect(r.x + r.w - 9, y, 9, 11, K); G.box(r.x + r.w - 9, y, 9, 11, W); G.text('!', r.x + r.w - 7, y + 2, Gr); }
          continue;
        }
        for (const p of o.ps) drawPiece(s, o, p, fy);
      }
      // X del jefe
      for (const sh of s.shots) {
        const x = Math.round(sh.x), y = fy - 10, spin = Math.floor(sh.x / 6) % 2;
        G.rect(x - 1, y - 1, 11, 11, W); G.rect(x, y, 9, 9, K);
        if (spin) { G.line(x + 2, y + 2, x + 6, y + 6, W); G.line(x + 6, y + 2, x + 2, y + 6, W); }
        else { G.rect(x + 4, y + 1, 1, 7, W); G.rect(x + 1, y + 4, 7, 1, W); }
        G.drect(x - 10, y + 3, 8, 3, 4, W, null);
      }
      // líneas de velocidad detrás del corredor
      if (R.ground && !s.crash) for (let i = 0; i < 3; i++) { const lx = s.rx - 8 - ((Math.floor(s.dist * 1.3) + i * 11) % 30), ly = fy - 6 - i * 6; G.rect(lx, ly, 5, 1, W); }
      this.drawRunner(s);
      for (const p of s.parts) G.rect(Math.round(p.x), Math.round(p.y), 2, 2, p.col);
      for (const g of s.ghosts) { const kk = 1 - g.t / 0.14; for (let i = 0; i < 2; i++) { const k2 = kk - i * 0.25; if (k2 <= 0) continue; const ww = g.w * k2, hh = g.h * k2; G.box(g.x + (g.w - ww) / 2, g.y + (g.h - hh) / 2, ww, hh, g.col); } }
    },
    drawRunner(s) {
      const R = s.run, T = G.ctx(), cv = s.rc;
      if (R.stun > 0 && Math.floor(R.stun * 16) % 2) return; // parpadea tras tropezar
      G.target(cv.x); cv.x.clearRect(0, 0, 24, 30);
      try {
        // piernas (debajo del reloj): corren en el suelo, encogidas en el aire
        const legs = (col, ox, oy) => {
          let a, b, lh = 5;
          if (!R.ground || s.crash) { a = 2; b = -1; lh = 3; } else { const c = Math.sin(R.cyc * Math.PI * 2); a = Math.round(c * 3); b = -a; }
          for (const [hx, f] of [[9, a], [14, b]]) { G.line(hx + ox, 21 + oy, hx + f + ox, 21 + lh + oy, col); G.line(hx + 1 + ox, 21 + oy, hx + f + 1 + ox, 21 + lh + oy, col); G.rect(hx + f + ox + (f >= 0 ? 0 : -1), 21 + lh + oy, 3, 1, col); }
        };
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) legs(W, dx, dy);
        legs(K, 0, 0);
        glass(5, 3, s.T > 0 ? s.t / s.T : 0, s.block >= 2 ? Gr : B, !s.crash && !s.done);
      } finally { G.target(T); }
      // pies en la fila 26 del lienzo → sobre el suelo
      const x = s.rx - 5, y = Math.round(s.fy - R.h) - 27;
      if (R.ang) { T.save(); T.translate(x + 12, y + 12); T.rotate(R.ang); T.drawImage(cv.c, -12, -12); T.restore(); }
      else T.drawImage(cv.c, x, y);
    },
    drawHud(s) {
      const r = s.r, st = s.st, x = r.x + 10, y = r.y + 6, w = r.w - 20, h = 48;
      const fr = G.drawFrame({ x, y, w, h, st, title: 'RUN.EXE', stripes: true, xmode: 'x' });
      const k = G.clamp(s.t / s.T, 0, 1), bar = s.acc === L ? K : s.acc;
      G.text(s.boss ? 'IT IS RIGHT BEHIND YOU!' : 'ESCAPING TO DRIVE D:', fr.x + 3, fr.y + 3, st.tx);
      const bx = fr.x + 3, by = fr.y + 12, bw = fr.w - 34;
      G.box(bx, by, bw, 9, st.tx);
      const fw = Math.round((bw - 4) * k);
      for (let i = 0; i < fw; i += 5) G.rect(bx + 2 + i, by + 2, Math.min(4, fw - i), 5, bar);
      G.text(Math.floor(k * 100) + '%', fr.x + fr.w - 3, by + 1, st.tx, { al: 'r' });
      G.text('DODGED ' + G.pad(s.cleared, 2), fr.x + 3, fr.y + 24, st.tx);
      if (s.boss) { // lo cerca que está
        const gap = G.clamp((s.rx - s.bo.edge) / (s.bo.gap0 + 20), 0, 1), gw = 46, gx = fr.x + fr.w - gw - 3, hot = gap < 0.35 && Math.floor(G.time * 8) % 2;
        G.text('GAP', gx - 4, fr.y + 24, st.tx, { al: 'r' });
        G.box(gx, fr.y + 23, gw, 9, st.tx);
        G.rect(gx + 2, fr.y + 25, Math.round((gw - 4) * gap), 5, hot ? Gr : bar);
      } else {
        const sp = 'SPEED ' + Math.round(s.v / 10) + ' KB/S';
        G.text(sp, fr.x + fr.w - 3, fr.y + 24, st.tx, { al: 'r' });
      }
    },
    drawBoss(s, fy) {
      const bo = s.bo, T = G.ctx(), won = s.done === 'win', st = bo.st;
      const jx = !won && (bo.flash > 0 || bo.warnT >= 0) ? G.irand(-2, 2) : 0;
      const bob = won ? 0 : Math.round(Math.abs(Math.sin(s.t * 9)) * 3);
      const x1 = Math.round(bo.edge) + jx, x = x1 - bo.w, y = fy - 9 - bo.h - bob;
      // patas gordas que corren
      const c = won ? 0 : Math.sin(s.t * 18);
      for (const [lx, ph] of [[x1 - 46, 1], [x1 - 20, -1]]) {
        const f = Math.round(c * ph * 4);
        G.rect(lx - 1 + f, y + bo.h - 1, 8, 11 - bob, W); G.rect(lx + f, y + bo.h, 6, 9 - bob, K);
        G.rect(lx + f - 2, fy - 3, 11, 3, K); G.rect(lx + f - 2, fy - 4, 11, 1, W);
      }
      G.drawFrame({ x, y, w: bo.w, h: bo.h, st, title: '', stripes: true, xmode: 'x' });
      // todo lo que se ve está pegado al borde derecho (el resto de la ventana queda fuera de la pantalla)
      const tt = 'IT.EXE', tw = G.textW(tt) + 6;
      G.rect(x1 - 14 - tw, y + 1, tw, 11, st.bar); G.text(tt, x1 - 11 - tw, y + 3, st.bt);
      const ink = bo.flash > 0 ? Gr : W;
      G.drawSpr('xcirc', x1 - 44, y + 18, { '#': ink }, 4); // cara: una X gigante
      G.text('COME', x1 - 6, y + 60, W, { al: 'r', b: true });
      G.text('BACK!', x1 - 6, y + 70, W, { al: 'r', b: true });
      const big = G.fsprite('NO!', 'italic 900 22px ' + G.FONT_HEAVY, Gr, 120), bx0 = x1 - 6 - big.width;
      if (Math.floor(s.t * 12) % 9 === 0 && !won) T.drawImage(G.fsprite('NO!', 'italic 900 22px ' + G.FONT_HEAVY, W, 120), bx0 - 3, y + 84);
      T.drawImage(big, bx0, y + 84);
      // columna de X que parpadean
      for (let i = 0; i < 6; i++) if ((Math.floor(s.t * 6) + i) % 3) G.drawX({ x: x1 - 17, y: y + 112 + i * 13, w: 9, h: 9 }, W);
      for (let i = 0; i < 6; i++) if ((Math.floor(s.t * 6) + i + 1) % 3) G.drawX({ x: x1 - 30, y: y + 118 + i * 13, w: 9, h: 9 }, i % 2 ? Gr : W);
      // barra de "atrapando"
      const gap = G.clamp(1 - (s.rx - bo.edge) / (bo.gap0 + 20), 0, 1), bw = 42, bx = x1 - bw - 5, by = y + bo.h - 14;
      G.text('CATCH', bx, by - 9, W);
      G.box(bx, by, bw, 9, W); for (let i = 0; i < Math.round((bw - 4) * gap); i += 4) G.rect(bx + 2 + i, by + 2, 3, 5, Gr);
      // aviso de disparo
      if (bo.warnT >= 0 && Math.floor(G.time * 14) % 2 === 0) { G.rect(x1 + 2, fy - 22, 13, 13, Gr); G.box(x1 + 2, fy - 22, 13, 13, K); G.text('!', x1 + 6, fy - 19, K, { b: true }); }
      // glitch: franjas de color
      if (!won && Math.random() < 0.35) G.drect(x, y + G.irand(12, bo.h - 6), bo.w, G.irand(2, 5), 8, G.pick([Gr, B, W]), null);
      if (won) {
        G.drect(x, y, bo.w, bo.h, 4, K, null);
        const t2 = 'NOT RESPONDING', w2 = G.textW(t2, 1, 1, true) + 8, xx = Math.max(s.r.x + 2, x1 - w2 - 6);
        G.rect(xx, y + bo.h / 2 - 6, w2, 13, W); G.box(xx, y + bo.h / 2 - 6, w2, 13, K); G.text(t2, xx + 4, y + bo.h / 2 - 3, K, { b: true });
      }
    },
  };

  // icono: el reloj de arena corre y salta una ventana
  G.ICONS[21] = function (t) {
    G.rect(0, 18, 24, 2, K); for (let x = -(Math.floor(t * 20) % 4); x < 24; x += 4) G.px(x, 18, Gr);
    const c = t % 1.6, wx = Math.round(26 - c * 22);
    G.rect(wx, 12, 9, 6, W); G.box(wx, 12, 9, 6, K); G.rect(wx, 12, 9, 2, B); G.px(wx + 4, 15, K);
    const jh = c > 0.62 && c < 1.42 ? Math.round(9 * Math.sin(Math.PI * (c - 0.62) / 0.8)) : 0;
    const y = 7 - jh, run = jh === 0 && Math.floor(t * 10) % 2;
    G.drawSpr('hg1', 3, y, { '#': K, o: Gr });
    G.px(5 + (run ? 1 : 0), y + 9, K); G.px(7 - (run ? 1 : 0), y + 9, K);
    G.px(5 + (run ? 0 : 1), y + 10, K); G.px(7 - (run ? 0 : 1), y + 10, K);
  };
  G.CARD_SCHEMES[21] = { top: K, tt: Gr, ib: W, grid: B, bot: L, nc: K, bt: B };
})(window.G);
