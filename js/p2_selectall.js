'use strict';
// PARTE 2 · 18 SELECT.ALL: iconos del escritorio. Arrastra un recuadro de selección que coja
// TODOS los archivos que pide la ventana y ninguno más. Siempre hay un recuadro que lo consigue.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------- tipos de archivo: icono + nombre (+ extensión) ----------
  const CLS = {
    exe: { ext: ['.EXE'], it: [['calc', 'CALC'], ['clock', 'CLOCK'], ['globe', 'WEB'], ['search', 'FIND'], ['phone', 'DIAL'], ['palette', 'PAINT'], ['printer', 'PRINT'], ['camera', 'CAM'], ['keys', 'KEYS']] },
    folder: { ext: [''], it: [['folder', 'WORK'], ['folder', 'STUFF'], ['folder', 'OLD'], ['folder', 'MISC'], ['folder', 'TEMP'], ['folder', 'GAMES'], ['folder', 'NEW'], ['folder', 'MAIL']] },
    pic: { ext: ['.JPG', '.BMP'], it: [['picture', 'ME'], ['picture', 'CAT'], ['picture', 'BEACH'], ['picture', 'SCAN'], ['picture', 'DOG'], ['picture', 'SUN']] },
    txt: { ext: ['.TXT'], it: [['doc', 'TODO'], ['notepad', 'NOTES'], ['doc', 'INFO'], ['notepad', 'DIARY'], ['doc', 'LIST'], ['doc', 'MEMO']] },
    music: { ext: ['.WAV', '.MID'], it: [['music', 'SONG'], ['music', 'LOOP'], ['music', 'BEAT'], ['music', 'TRACK'], ['music', 'HIT']] },
    other: { ext: [''], it: [['floppy', 'BACK.ZIP'], ['briefcase', 'JOB.ZIP'], ['calendar', 'DATES.CAL'], ['book', 'HELP.HLP'], ['megaphone', 'ADS.SCR'], ['cd', 'DISC.ISO'], ['harddisk', 'C:']] },
  };
  const ORD = {
    folder: { txt: 'SELECT ALL FOLDERS', ic: 'folder', look: ['briefcase', 'floppy'] },
    pic: { txt: 'SELECT ALL PICTURES', ic: 'picture', look: ['camera', 'palette', 'calendar'] },
    music: { txt: 'SELECT ALL MUSIC', ic: 'music', look: ['doc', 'notepad', 'megaphone', 'cd'] },
    txt: { txt: 'SELECT ALL .TXT', ic: 'doc', look: ['music', 'search', 'book'] },
    exe: { txt: 'SELECT ALL .EXE', ic: 'calc', look: ['doc', 'notepad', 'folder', 'picture'] },
  };
  const IW = 44, IH = 52; // caja de cada icono (icono 40x40 + etiqueta)
  const ctr = (o) => ({ x: o.x + IW / 2, y: o.y + 20 }); // punto que cuenta para la selección: el centro del dibujo
  const PAD = 8; // margen que deja el recuadro "bueno" alrededor de los objetivos

  // ---------- rejilla del escritorio ----------
  function grid(s) {
    const r = s.r, top = r.y + 42, bot = r.y + r.h - 13;
    const cols = G.clamp(Math.floor(r.w / 58), 3, 5), rows = G.clamp(Math.floor((bot - top) / 60), 4, 9);
    return { top, bot, cols, rows, cw: r.w / cols, ch: (bot - top) / rows };
  }
  // un bloque de casillas con t objetivos; devuelve las casillas y su caja ajustada
  function pickBlock(g, t, avoid) {
    const shapes = [];
    for (let bw = 1; bw <= Math.min(g.cols - 1, t); bw++) for (let bh = 1; bh <= Math.min(g.rows - 2, t); bh++) if (bw * bh >= t && bw * bh <= t + 2) shapes.push([bw, bh]);
    for (let k = 0; k < 300; k++) {
      const [bw, bh] = G.pick(shapes), i0 = G.irand(0, g.cols - bw), j0 = G.irand(0, g.rows - bh);
      if (avoid && !(i0 > avoid.i1 + 1 || i0 + bw - 1 < avoid.i0 - 1 || j0 > avoid.j1 + 1 || j0 + bh - 1 < avoid.j0 - 1)) continue; // lejos del otro grupo
      const all = []; for (let i = i0; i < i0 + bw; i++) for (let j = j0; j < j0 + bh; j++) all.push([i, j]);
      const cells = shuffle(all).slice(0, t);
      const bb = { i0: 99, j0: 99, i1: -1, j1: -1 };
      for (const [i, j] of cells) { bb.i0 = Math.min(bb.i0, i); bb.j0 = Math.min(bb.j0, j); bb.i1 = Math.max(bb.i1, i); bb.j1 = Math.max(bb.j1, j); }
      return { cells, bb };
    }
    return null;
  }
  const inBB = (i, j, bb) => i >= bb.i0 && i <= bb.i1 && j >= bb.j0 && j <= bb.j1;
  const near = (i, j, bb) => !inBB(i, j, bb) && i >= bb.i0 - 1 && i <= bb.i1 + 1 && j >= bb.j0 - 1 && j <= bb.j1 + 1;

  // nombres sin repetir en la ronda
  function mkFile(s, cls, ic) {
    const c = CLS[cls];
    let pool = c.it.filter((it) => !s.used[it[1]] && (!ic || it[0] === ic));
    if (!pool.length) pool = c.it.filter((it) => !ic || it[0] === ic);
    const it = G.pick(pool); s.used[it[1]] = 1;
    return { cls, ic: it[0], lab: it[1] + G.pick(c.ext), ph: Math.random() * 6 };
  }
  // archivo trampa: se parece a lo que piden (icono parecido o mismo nombre con otra extensión)
  function mkDecoy(s, order, d) {
    const others = Object.keys(CLS).filter((c) => c !== order);
    if (Math.random() < 0.25 + 0.55 * d) {
      if (d > 0.25 && Math.random() < 0.4) { // gemelo: mismo nombre que un objetivo, otro tipo
        const tw = G.pick(s.items.filter((o) => o.cls === order));
        const cls = G.pick(others.filter((c) => c !== 'other' && c !== 'folder'));
        if (tw) { const f = mkFile(s, cls); f.lab = tw.lab.split('.')[0] + G.pick(CLS[cls].ext); return f; }
      }
      const looks = [];
      for (const c of others) for (const it of CLS[c].it) if (ORD[order].look.indexOf(it[0]) >= 0) looks.push([c, it[0]]);
      if (looks.length) { const [c, ic] = G.pick(looks); return mkFile(s, c, ic); }
    }
    return mkFile(s, G.pick(others));
  }
  function placeAt(s, g, o, i, j, jit) {
    const r = s.r;
    o.i = i; o.j = j;
    o.bx = Math.round(r.x + (i + 0.5) * g.cw - IW / 2 + G.rand(-jit, jit));
    o.by = Math.round(g.top + (j + 0.5) * g.ch - 26 + G.rand(-jit, jit));
    o.x = o.bx; o.y = o.by;
  }

  // ---------- caja de los centros de un grupo ----------
  function cbox(list) {
    const b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    for (const o of list) { const c = ctr(o); b.x0 = Math.min(b.x0, c.x); b.y0 = Math.min(b.y0, c.y); b.x1 = Math.max(b.x1, c.x); b.y1 = Math.max(b.y1, c.y); }
    return b;
  }

  G.MICRO.selectall = {
    mode: 'desk', cmd: 'SELECT!', hint: 'DRAG A BOX AROUND THEM', time: 6,
    help: ['DRAG A BOX AROUND THE', 'FILES IT ASKS FOR.', 'ALL OF THEM, AND', 'NOTHING ELSE.'],
    init(s) {
      const d = s.d, g = grid(s);
      s.g = g; s.items = []; s.used = {}; s.parts = []; s.msgs = []; s.sel = null; s.nsel = 0;
      s.phase = 0; s.flash = 0; s.bad = null; s.miss = null;
      const pool = s.round <= 1 ? ['folder', 'pic', 'music'] : s.round === 2 ? ['folder', 'pic', 'music', 'txt'] : ['folder', 'pic', 'music', 'txt', 'exe'];
      if (s.boss) {
        // dos órdenes seguidas y todo el escritorio se mueve
        const o2 = shuffle(['folder', 'pic', 'music', 'txt', 'exe']).slice(0, 2);
        s.orders = o2;
        const bA = pickBlock(g, 3), bB = pickBlock(g, 3, bA.bb);
        const gA = [], gB = [];
        for (const [i, j] of bA.cells) { const f = mkFile(s, o2[0]); placeAt(s, g, f, i, j, 2); f.grp = 0; gA.push(f); s.items.push(f); }
        for (const [i, j] of bB.cells) { const f = mkFile(s, o2[1]); placeAt(s, g, f, i, j, 2); f.grp = 1; gB.push(f); s.items.push(f); }
        const free = [];
        for (let i = 0; i < g.cols; i++) for (let j = 0; j < g.rows; j++) if (!inBB(i, j, bA.bb) && !inBB(i, j, bB.bb)) free.push([i, j]);
        shuffle(free);
        const nd = Math.min(free.length, 7);
        for (let k = 0, tries = 0; k < nd && tries < 200; k++, tries++) {
          const others = Object.keys(CLS).filter((c) => o2.indexOf(c) < 0);
          const f = Math.random() < 0.5 ? mkDecoy(s, o2[k % 2], 0.9) : mkFile(s, G.pick(others));
          if (o2.indexOf(f.cls) >= 0) { k--; continue; } // nunca un objetivo suelto
          placeAt(s, g, f, free[k][0], free[k][1], 3); s.items.push(f);
          const a = Math.random() * 6, sp = G.rand(12, 18); f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp;
        }
        const ga = Math.random() * 6, gb = ga + G.rand(1.5, 4.5), gs = 10;
        s.groups = [{ items: gA, vx: Math.cos(ga) * gs, vy: Math.sin(ga) * gs }, { items: gB, vx: Math.cos(gb) * gs, vy: Math.sin(gb) * gs }];
        s.order = o2[0]; s.wander = true;
        s.hint = ORD[o2[0]].txt + ' (2 ORDERS)';
        s.T = 12.5;
      } else {
        const order = G.pick(pool), t = 2 + Math.round(d * 3), n = Math.min(6 + Math.round(d * 9), g.cols * g.rows - 6);
        s.order = order; s.orders = [order];
        const bl = pickBlock(g, t);
        for (const [i, j] of bl.cells) { const f = mkFile(s, order); placeAt(s, g, f, i, j, 3); s.items.push(f); }
        const ring = [], rest = [];
        for (let i = 0; i < g.cols; i++) for (let j = 0; j < g.rows; j++) { if (inBB(i, j, bl.bb)) continue; (near(i, j, bl.bb) ? ring : rest).push([i, j]); }
        shuffle(ring); shuffle(rest);
        const nRing = Math.min(ring.length, 1 + Math.round(d * 4)), cells = ring.slice(0, nRing).concat(shuffle(ring.slice(nRing).concat(rest)));
        const cbI = (bl.bb.i0 + bl.bb.i1) / 2, cbJ = (bl.bb.j0 + bl.bb.j1) / 2, nx = Math.round(2 + 6 * d), ny = Math.round(3 + 12 * d);
        for (let k = 0; k < n - t && k < cells.length; k++) {
          const [i, j] = cells[k], f = k < nRing && Math.random() < 0.6 + 0.4 * d ? mkDecoy(s, order, d) : mkDecoy(s, order, d * 0.5);
          placeAt(s, g, f, i, j, 3);
          if (k < nRing) { // las de alrededor se arriman un poco al grupo (más tensión)
            if (i < bl.bb.i0 || i > bl.bb.i1) f.bx += Math.sign(cbI - i) * nx;
            if (j < bl.bb.j0 || j > bl.bb.j1) f.by += Math.sign(cbJ - j) * ny;
            f.x = f.bx; f.y = f.by;
          }
          s.items.push(f);
        }
        s.drift = s.round >= 4 ? 4 + Math.round(4 * G.clamp((d - 0.4) / 0.25, 0, 1)) : 0;
        s.hint = ORD[order].txt;
        s.T = (4.0 + n * 0.08 + t * 0.25 + (s.drift ? 0.4 : 0)) * (1 - 0.12 * d);
      }
      for (const o of s.items) o.tgt = o.cls === s.order;
    },

    // ---------- movimiento ----------
    update(s, dt) {
      if (s.flash > 0) s.flash = Math.max(0, s.flash - dt);
      if (s.drift) for (const o of s.items) { o.x = o.bx + Math.sin(s.t * 0.9 + o.ph) * s.drift; o.y = o.by + Math.cos(s.t * 0.7 + o.ph * 1.3) * s.drift * 0.7; }
      if (s.wander) this.wander(s, dt);
      s.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }); s.parts = s.parts.filter((p) => p.t < 0.5);
      s.msgs.forEach((m) => (m.t += dt)); s.msgs = s.msgs.filter((m) => m.t < 0.9);
      // selección en vivo (los iconos se pueden mover mientras arrastras)
      if (s.sel) {
        const n0 = s.nsel; s.nsel = 0;
        const R = this.selR(s);
        for (const o of s.items) { const c = ctr(o); o.sel = !o.gone && G.inR(c.x, c.y, R); if (o.sel) s.nsel++; }
        if (s.nsel !== n0) A().sfx('type', 1.5);
      }
    },
    wander(s, dt) {
      const r = s.r, g = s.g, X0 = r.x, X1 = r.x + r.w - IW, Y0 = g.top - 6, Y1 = g.bot - IH + 4, M = 26;
      // grupos rígidos (los objetivos van juntos)
      const live = s.groups.filter((gr) => gr.items.some((o) => !o.gone));
      for (const gr of live) {
        const its = gr.items.filter((o) => !o.gone);
        for (const o of its) { o.x += gr.vx * dt; o.y += gr.vy * dt; }
        let mx0 = 1e9, mx1 = -1e9, my0 = 1e9, my1 = -1e9; for (const o of its) { mx0 = Math.min(mx0, o.x); mx1 = Math.max(mx1, o.x); my0 = Math.min(my0, o.y); my1 = Math.max(my1, o.y); }
        let sx = 0, sy = 0;
        if (mx0 < X0) { sx = X0 - mx0; gr.vx = Math.abs(gr.vx); } if (mx1 > X1) { sx = X1 - mx1; gr.vx = -Math.abs(gr.vx); }
        if (my0 < Y0) { sy = Y0 - my0; gr.vy = Math.abs(gr.vy); } if (my1 > Y1) { sy = Y1 - my1; gr.vy = -Math.abs(gr.vy); }
        if (sx || sy) for (const o of its) { o.x += sx; o.y += sy; }
      }
      // los dos grupos no se juntan
      if (live.length === 2) {
        const a = cbox(live[0].items.filter((o) => !o.gone)), b = cbox(live[1].items.filter((o) => !o.gone)), m = M * 2 + 6;
        if (a.x0 - m < b.x1 && b.x0 - m < a.x1 && a.y0 - m < b.y1 && b.y0 - m < a.y1) {
          const ox = Math.min(b.x1 + m - a.x0, a.x1 + m - b.x0), oy = Math.min(b.y1 + m - a.y0, a.y1 + m - b.y0);
          if (ox < oy) { const dir = (a.x0 + a.x1) < (b.x0 + b.x1) ? -1 : 1; live[0].vx = dir * Math.abs(live[0].vx); live[1].vx = -dir * Math.abs(live[1].vx); }
          else { const dir = (a.y0 + a.y1) < (b.y0 + b.y1) ? -1 : 1; live[0].vy = dir * Math.abs(live[0].vy); live[1].vy = -dir * Math.abs(live[1].vy); }
        }
      }
      // archivos sueltos: rebotan y nunca entran en la zona de un grupo
      const loose = s.items.filter((o) => o.grp == null && !o.gone);
      for (const o of loose) {
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x < X0) { o.x = X0; o.vx = Math.abs(o.vx); } if (o.x > X1) { o.x = X1; o.vx = -Math.abs(o.vx); }
        if (o.y < Y0) { o.y = Y0; o.vy = Math.abs(o.vy); } if (o.y > Y1) { o.y = Y1; o.vy = -Math.abs(o.vy); }
        for (const p of loose) { // que no se monten unos encima de otros
          if (p === o) continue; const dx = o.x - p.x, dy = o.y - p.y, dd = Math.hypot(dx, dy);
          if (dd < 40 && dd > 0.01) { o.x += (dx / dd) * 20 * dt; o.y += (dy / dd) * 20 * dt; }
        }
        for (const gr of live) this.keepOut(o, cbox(gr.items.filter((q) => !q.gone)), M, X0, X1, Y0, Y1);
      }
    },
    keepOut(o, b, M, X0, X1, Y0, Y1) {
      const c = ctr(o);
      if (!(c.x > b.x0 - M && c.x < b.x1 + M && c.y > b.y0 - M && c.y < b.y1 + M)) return;
      const opts = [
        { dx: b.x0 - M - c.x, dy: 0, v: 'vx', s: -1 }, { dx: b.x1 + M - c.x, dy: 0, v: 'vx', s: 1 },
        { dx: 0, dy: b.y0 - M - c.y, v: 'vy', s: -1 }, { dx: 0, dy: b.y1 + M - c.y, v: 'vy', s: 1 },
      ].filter((p) => o.x + p.dx >= X0 - 0.5 && o.x + p.dx <= X1 + 0.5 && o.y + p.dy >= Y0 - 0.5 && o.y + p.dy <= Y1 + 0.5);
      if (!opts.length) return;
      opts.sort((a, b2) => Math.abs(a.dx + a.dy) - Math.abs(b2.dx + b2.dy));
      const p = opts[0]; o.x += p.dx; o.y += p.dy; o[p.v] = p.s * Math.abs(o[p.v]);
    },

    // ---------- recuadro de selección ----------
    selR(s) {
      const q = s.sel, x0 = Math.min(q.x0, q.x1), y0 = Math.min(q.y0, q.y1);
      return { x: x0, y: y0, w: Math.abs(q.x1 - q.x0), h: Math.abs(q.y1 - q.y0) };
    },
    clampP(s, x, y) { const r = s.r; return { x: G.clamp(x, r.x, r.x + r.w - 1), y: G.clamp(y, r.y, r.y + r.h - 1) }; },
    down(s, x, y, e) {
      if (s.sel) return; // un solo dedo
      const p = this.clampP(s, x, y);
      s.sel = { id: e && e.pointerId != null ? e.pointerId : 1, x0: p.x, y0: p.y, x1: p.x, y1: p.y }; s.nsel = 0;
      A().sfx('pick');
    },
    move(s, x, y, e) {
      const q = s.sel; if (!q || (e && e.pointerId != null && e.pointerId !== q.id)) return;
      const p = this.clampP(s, x, y); q.x1 = p.x; q.y1 = p.y;
    },
    up(s, x, y, e) {
      const q = s.sel; if (!q || (e && e.pointerId != null && e.pointerId !== q.id)) return;
      const p = this.clampP(s, x, y); q.x1 = p.x; q.y1 = p.y;
      const R = this.selR(s);
      s.sel = null;
      const live = s.items.filter((o) => !o.gone);
      for (const o of live) { const c = ctr(o); o.sel = G.inR(c.x, c.y, R); }
      const chosen = live.filter((o) => o.sel);
      if (R.w < 8 && R.h < 8) { live.forEach((o) => (o.sel = false)); s.msgs.push({ x: R.x, y: R.y, txt: 'DRAG A BOX', t: 0 }); A().sfx('deny'); return; }
      if (!chosen.length) { s.msgs.push({ x: R.x + R.w / 2, y: R.y + R.h / 2, txt: 'NOTHING', t: 0 }); A().sfx('deny'); return; }
      const bad = chosen.filter((o) => !o.tgt), miss = live.filter((o) => o.tgt && !o.sel);
      if (bad.length || miss.length) {
        s.bad = bad; s.miss = miss;
        s.fail(bad.length ? (bad.length > 1 ? 'WRONG FILES' : 'WRONG FILE') : 'MISSED ' + miss.length + (miss.length > 1 ? ' FILES' : ' FILE'));
        return;
      }
      if (s.boss && s.phase === 0) { // primera orden hecha: se van y llega la segunda
        s.phase = 1; s.flash = 0.6;
        for (const o of chosen) { o.gone = true; o.sel = false; const c = ctr(o); for (let k = 0; k < 6; k++) s.parts.push({ x: c.x, y: c.y, vx: G.rand(-80, 80), vy: G.rand(-130, -30), t: 0 }); }
        s.order = s.orders[1];
        for (const o of s.items) o.tgt = !o.gone && o.cls === s.order;
        s.msgs.push({ x: s.r.x + s.r.w / 2, y: s.r.y + 60, txt: 'NEW ORDER!', t: 0 });
        A().sfx('close', 3); A().sfx('warn'); G.pulse({ glitch: 0.6, ab: 4, shake: 3 }); G.vibrate(20);
        return;
      }
      s.win();
    },

    // ---------- dibujo ----------
    drawItem(s, o) {
      const T = G.ctx(), ix = Math.round(o.x + 2), iy = Math.round(o.y);
      T.drawImage(G.icon20(o.ic, s.block), ix, iy, 40, 40);
      if (o.sel) G.drect(ix, iy, 40, 40, 8, s.acc, null); // tinte de seleccionado (como Windows, en nuestra paleta)
      const lw = G.textW(o.lab) + 4, lx = G.clamp(Math.round(o.x + IW / 2 - lw / 2), s.r.x + 1, s.r.x + s.r.w - lw - 1); // la etiqueta nunca se sale de la pantalla
      G.rect(lx, iy + 42, lw, 9, o.sel ? s.acc : K);
      G.text(o.lab, lx + 2, iy + 43, W);
    },
    draw(s) {
      const r = s.r, T = G.ctx();
      G.drect(r.x, r.y, r.w, r.h, 8, K, null); // atenúa el fondo para que se lean los iconos (como TRASH)
      const SR = s.sel ? this.selR(s) : null;
      if (SR && SR.w > 2 && SR.h > 2) G.drect(Math.round(SR.x) + 1, Math.round(SR.y) + 1, Math.round(SR.w) - 2, Math.round(SR.h) - 2, 3, s.acc, null); // relleno tramado debajo de los iconos
      for (const o of s.items) if (!o.gone) this.drawItem(s, o);
      // tras fallar: parpadean los que sobraban y los que faltaban
      if (s.done === 'lose' && (s.bad || s.miss) && Math.floor(G.time * 6) % 2 === 0) {
        for (const o of s.bad || []) { G.box(Math.round(o.x - 2), Math.round(o.y - 2), IW + 4, IH + 4, W); G.box(Math.round(o.x - 1), Math.round(o.y - 1), IW + 2, IH + 2, K); G.line(o.x + 4, o.y + 4, o.x + 40, o.y + 38, W); G.line(o.x + 40, o.y + 4, o.x + 4, o.y + 38, W); }
        for (const o of s.miss || []) { const x = Math.round(o.x - 2), y = Math.round(o.y - 2); G.dash(x, y, IW + 4, W, 2, 2); G.dash(x, y + IH + 3, IW + 4, W, 2, 2); for (let yy = y; yy < y + IH + 4; yy += 4) { G.rect(x, yy, 1, 2, W); G.rect(x + IW + 3, yy, 1, 2, W); } }
      }
      for (const p of s.parts) G.rect(p.x, p.y, 3, 3, p.t < 0.25 ? W : L);
      // recuadro de selección: borde punteado (hormigas)
      if (s.sel) {
        const R = this.selR(s), x = Math.round(R.x), y = Math.round(R.y), w = Math.max(1, Math.round(R.w)), h = Math.max(1, Math.round(R.h));
        G.box(x, y, w, h, K);
        const ph = Math.floor(G.time * 8) % 2;
        for (let i = ph; i < w; i += 2) { G.px(x + i, y, W); G.px(x + i, y + h - 1, W); }
        for (let j = ph; j < h; j += 2) { G.px(x, y + j, W); G.px(x + w - 1, y + j, W); }
        G.drawSpr('cursor', Math.round(s.sel.x1), Math.round(s.sel.y1), { '#': K, w: W });
      }
      // ventana con la orden (estilo parte 1)
      const ord = ORD[s.order], flash = s.flash > 0 && Math.floor(s.flash * 14) % 2 === 0;
      const w = { x: r.x + 6, y: r.y + 2, w: r.w - 12, h: 36, st: s.st, title: s.boss ? (s.phase ? 'NEW ORDER  2/2' : 'EXPLORER.EXE  1/2') : 'EXPLORER.EXE', stripes: true, xmode: 'x' };
      const ir = G.drawFrame(w);
      if (flash) G.rect(ir.x, ir.y, ir.w, ir.h, s.acc);
      T.drawImage(G.icon20(ord.ic, s.block), ir.x + 3, ir.y, 20, 20);
      G.text(ord.txt, ir.x + 27, ir.y + 7, flash ? W : s.st.tx, { b: true });
      for (const m of s.msgs) G.text(m.txt, m.x, m.y - 10 - m.t * 24, W, { al: 'c', b: true });
      const live = s.items.filter((o) => !o.gone && o.sel).length;
      G.text(live + ' SELECTED', r.x + 4, r.y + r.h - 9, W, { b: true });
    },
  };

  // ---------- tarjeta: un recuadro punteado que va cogiendo iconos ----------
  G.ICONS[18] = function (t) {
    const k = Math.min(1, (t % 2.6) / 1.5), full = (t % 2.6) > 1.5;
    const x0 = 9, y0 = 0, x1 = Math.round(9 + 14 * k), y1 = Math.round(19 * k);
    const pos = [[1, 1], [9, 1], [17, 1], [1, 11], [9, 11], [17, 11]];
    for (const [x, y] of pos) {
      const inside = x + 3 >= x0 && x + 3 <= x1 && y + 3 >= y0 && y + 3 <= y1;
      G.rect(x, y, 6, 5, inside ? B : W); G.box(x, y, 6, 5, K); G.rect(x, y + 6, 6, 2, inside ? B : K);
    }
    if (k > 0.05) {
      for (let x = x0; x <= x1; x += 2) { G.px(x, y0, K); G.px(x, y1, K); }
      for (let y = y0; y <= y1; y += 2) { G.px(x0, y, K); G.px(x1, y, K); }
    }
    if (!full) G.drawSpr('cursor', Math.min(x1, 17), Math.min(y1, 8), { '#': K, w: W });
    else if (Math.floor(t * 6) % 2) G.rect(x0 + 1, 19, x1 - x0 - 1, 1, Gr);
  };
  G.CARD_SCHEMES[18] = { top: Gr, tt: K, ib: L, grid: B, bot: B, nc: Gr, bt: W };
})(window.G);
