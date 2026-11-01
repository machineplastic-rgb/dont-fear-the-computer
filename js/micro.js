'use strict';
// MICROJUEGOS (niveles 2-12): rondas rápidas con orden de una palabra, 4 vidas y un jefe al final.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const S = G.scenes.game;

  // ---------- utilidades ----------
  function sprFit(name, cx, cy, maxW, maxH, map, maxSc) {
    const w = G.sprW(name), h = G.sprH(name);
    const sc = Math.max(1, Math.min(maxSc || 9, Math.floor(Math.min(maxW / w, maxH / h))));
    G.drawSpr(name, Math.round(cx - (w * sc) / 2), Math.round(cy - (h * sc) / 2), map, sc);
    return sc;
  }
  function sprFlip(name, cx, cy, sc, map) {
    const c = G.spr(name, map), T = G.ctx();
    T.save(); T.translate(Math.round(cx + (c.width * sc) / 2), Math.round(cy - (c.height * sc) / 2)); T.scale(-1, 1);
    T.drawImage(c, 0, 0, c.width * sc, c.height * sc); T.restore();
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function place(list, r, w, h, gap, yMax) { // posición libre sin solapar
    for (let k = 0; k < 80; k++) {
      const x = Math.round(G.rand(r.x + 4, r.x + r.w - w - 4)), y = Math.round(G.rand(r.y + 4, (yMax || r.y + r.h) - h - 4));
      if (list.every((o) => Math.abs(o.x - x) > w + gap || Math.abs(o.y - y) > h + gap)) return { x, y };
    }
    return { x: Math.round(G.rand(r.x + 4, r.x + r.w - w - 4)), y: Math.round(G.rand(r.y + 4, (yMax || r.y + r.h) - h - 4)) };
  }
  function dragDown(s, list, x, y, pad) {
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i]; if (o.done) continue;
      if (G.inR(x, y, o, pad || 8)) { s.drag = { o, dx: x - o.x, dy: y - o.y }; list.splice(i, 1); list.push(o); A().sfx('pick'); return o; }
    }
    return null;
  }
  function dragMove(s, x, y) {
    if (!s.drag) return; const o = s.drag.o, r = s.r;
    o.x = G.clamp(x - s.drag.dx, r.x, r.x + r.w - o.w); o.y = G.clamp(y - s.drag.dy, r.y, r.y + r.h - o.h);
  }

  const M = G.MICRO = {};

  // ===== 2 TRASH: arrastra los archivos a la papelera (¡no tires SYSTEM!) =====
  M.trash = {
    cmd: 'DRAG!', hint: 'FILES TO THE TRASH', time: 6.5,
    help: ['DRAG EVERY FILE INTO', 'THE TRASH BEFORE THE', 'BAR RUNS OUT.', 'NEVER TRASH "SYSTEM".'],
    init(s) {
      const r = s.r;
      s.bin = { x: Math.round(r.x + r.w / 2 - 20), y: r.y + r.h - 46, w: 40, h: 40 };
      s.items = [];
      const n = 2 + Math.round(s.d * 3);
      for (let i = 0; i < n; i++) { const p = place(s.items, r, 30, 34, 6, s.bin.y - 6); s.items.push({ x: p.x, y: p.y, w: 30, h: 34, type: G.pick(['folder', 'pic']), sys: false }); }
      if (s.d > 0.12) { const p = place(s.items, r, 30, 34, 6, s.bin.y - 6); s.items.push({ x: p.x, y: p.y, w: 30, h: 34, type: 'computer', sys: true }); }
    },
    down(s, x, y) { dragDown(s, s.items, x, y, 8); },
    move: dragMove,
    up(s) {
      if (!s.drag) return; const o = s.drag.o; s.drag = null;
      if (G.inR(o.x + o.w / 2, o.y + o.h / 2, s.bin, 12)) {
        if (o.sys) { s.fail('SYSTEM DELETED'); return; }
        s.items.splice(s.items.indexOf(o), 1); A().sfx('drop'); s.binT = 0.3; G.pulse({ ab: 1.5 });
        if (!s.items.some((i) => !i.sys)) s.win();
      }
    },
    update(s, dt) {
      if (s.binT) s.binT = Math.max(0, s.binT - dt);
      if (s.d > 0.55) s.items.forEach((o, i) => { if (!s.drag || s.drag.o !== o) o.x = G.clamp(o.x + Math.sin(s.t * 5 + i) * 0.5, s.r.x, s.r.x + s.r.w - o.w); });
    },
    draw(s) {
      const st = s.st, b = s.bin;
      const hot = s.binT > 0 || (s.drag && G.inR(s.drag.o.x + 15, s.drag.o.y + 17, b, 12));
      G.drawSpr('trash', b.x + 3, b.y + 8, { '#': st.tx, w: st.bd }, 3);
      if (hot) { G.rect(b.x, b.y + 1, b.w, 4, st.tx); G.rect(b.x + 14, b.y - 2, 12, 3, st.tx); G.box(b.x - 3, b.y - 4, b.w + 6, b.h + 8, s.acc); }
      for (const o of s.items) {
        const sw = G.sprW(o.type) * 2;
        G.drawSpr(o.type, Math.round(o.x + (o.w - sw) / 2), o.y, { '#': st.tx, w: st.bd, b: s.acc }, 2);
        const lab = o.sys ? 'SYSTEM' : o.type === 'pic' ? 'PIC' : 'FILE';
        const lw = G.textW(lab) + 2;
        G.rect(o.x + o.w / 2 - lw / 2, o.y + 26, lw, 9, o.sys ? st.tx : st.bd);
        G.text(lab, o.x + o.w / 2, o.y + 27, o.sys ? st.bd : st.tx, { al: 'c' });
      }
    },
  };

  // ===== 3 LOAD.100: toca justo al 100 % =====
  M.load = {
    cmd: 'STOP!', hint: 'TAP AT 100%', time: 0,
    help: ['THE BAR IS LOADING.', 'TAP THE SCREEN WHEN', 'IT REACHES 100%.', 'TOO SOON OR TOO LATE', '= ERROR.'],
    init(s) { s.p = 0; s.v = 0.42 + 0.2 * s.d; s.zone = 0.13 - 0.05 * s.d; s.hold = 0.35; },
    fuse(s) { return 1 - Math.min(1, s.p); },
    update(s, dt) {
      if (s.hold > 0) s.hold -= dt;
      else {
        s.p += s.v * (s.p > 0.75 ? 1.15 + 0.3 * s.d : 1) * dt;
        if (Math.random() < dt * (1.3 + s.d)) s.hold = G.rand(0.08, 0.3) * (s.p > 0.8 ? 0.7 : 1);
      }
      if (s.p > 1.035) { s.p = 1.035; s.fail('OVERFLOW'); }
    },
    tap(s) { if (s.p >= 1 - s.zone) s.win(); else s.fail('TOO SOON'); },
    draw(s) {
      const r = s.r, st = s.st;
      const bw = r.w - 28, bx = r.x + 14, by = Math.round(r.y + r.h * 0.55), bh = 24;
      const pct = Math.min(104, Math.floor(s.p * 100));
      G.text('SETUP.EXE', r.x + r.w / 2, by - 66, st.tx, { al: 'c' });
      G.text(pct + '%', r.x + r.w / 2, by - 50, pct > 100 ? s.acc : st.tx, { s: 5, al: 'c', b: true });
      const zx = bx + Math.round(bw * (1 - s.zone));
      G.drect(zx, by - 6, bx + bw - zx, bh + 12, 8, s.acc, null);
      G.box(bx - 2, by - 2, bw + 4, bh + 4, st.tx);
      const f = Math.round(bw * Math.min(1.035, s.p));
      for (let i = 0; i < f; i += 6) G.rect(bx + i, by + 2, Math.min(4, f - i), bh - 4, st.tx);
      G.text('0%', bx, by + bh + 8, st.tx); G.text('100%', bx + bw, by + bh + 8, st.tx, { al: 'r' });
      G.text('▼', zx + (bx + bw - zx) / 2, by - 16, st.tx, { al: 'c' });
    },
  };

  // ===== 4 DEFRAG: lleva cada bloque a su zona =====
  M.defrag = {
    cmd: 'SORT!', hint: 'BLOCKS TO THEIR ZONE', time: 7,
    help: ['DEFRAGMENT THE DISK:', 'DRAG EACH BLOCK TO', 'THE ZONE WITH THE', 'SAME PATTERN.'],
    init(s) {
      const r = s.r, k = s.d < 0.4 ? 2 : 3, n = 3 + Math.round(s.d * 3);
      const zw = Math.floor((r.w - 8) / k);
      s.zones = []; for (let i = 0; i < k; i++) s.zones.push({ x: r.x + 4 + i * zw, y: r.y + r.h - 50, w: zw - 4, h: 46, t: i, n: 0 });
      s.blocks = []; for (let i = 0; i < n; i++) { const p = place(s.blocks, r, 26, 26, 6, r.y + r.h - 60); s.blocks.push({ x: p.x, y: p.y, w: 26, h: 26, t: i % k, hx: p.x, hy: p.y }); }
      shuffle(s.blocks);
    },
    pat(s, t, x, y, w, h) {
      if (t === 0) G.rect(x, y, w, h, s.acc);
      else if (t === 1) G.rect(x, y, w, h, K);
      else G.drect(x, y, w, h, 8, K, L);
    },
    down(s, x, y) { dragDown(s, s.blocks, x, y, 8); },
    move: dragMove,
    up(s) {
      if (!s.drag) return; const b = s.drag.o; s.drag = null;
      const z = s.zones.find((z) => G.inR(b.x + 13, b.y + 13, z, 6));
      if (z && z.t === b.t) {
        const per = Math.max(1, Math.floor((z.w - 4) / 28));
        b.x = z.x + 3 + (z.n % per) * 28; b.y = z.y + 12 + Math.floor(z.n / per) * 2; b.done = true; z.n++;
        A().sfx('drop'); G.pulse({ ab: 1 });
        if (s.blocks.every((o) => o.done)) s.win();
      } else if (z) { A().sfx('deny'); b.x = b.hx; b.y = b.hy; G.pulse({ glitch: 0.2 }); }
    },
    draw(s) {
      const st = s.st;
      for (const z of s.zones) { G.box(z.x, z.y, z.w, z.h, st.tx); this.pat(s, z.t, z.x + 2, z.y + 2, z.w - 4, 7); G.dash(z.x + 2, z.y + 10, z.w - 4, st.tx, 2, 2); }
      for (const b of s.blocks) { this.pat(s, b.t, b.x, b.y, b.w, b.h); G.box(b.x, b.y, b.w, b.h, K); if (!b.done) G.box(b.x + 2, b.y + 2, b.w - 4, b.h - 4, st.bd); }
    },
  };

  // ===== 5 VERIFY: captcha =====
  const CAP = [['skull', 'SKULLS'], ['smiley', 'SMILES'], ['lock', 'LOCKS'], ['hg1', 'CLOCKS'], ['warn', 'WARNINGS'], ['pic', 'PICTURES'], ['folder', 'FOLDERS'], ['trash', 'BINS']];
  M.verify = {
    cmd: 'VERIFY!', hint: 'SELECT ALL MATCHES', time: 6.5,
    help: ['PROVE YOU ARE HUMAN:', 'TAP EVERY SQUARE THAT', 'SHOWS WHAT IS ASKED.', 'ONE WRONG TAP = ROBOT.'],
    init(s) {
      const tg = G.pick(CAP); s.tg = tg[0]; s.hint = 'SELECT ALL ' + tg[1];
      const m = 2 + Math.round(s.d * 2), others = CAP.filter((c) => c[0] !== s.tg).map((c) => c[0]);
      s.cells = shuffle(Array.from({ length: 9 }, (_, i) => (i < m ? s.tg : G.pick(others)))).map((spr) => ({ spr, sel: false }));
      s.need = m; s.got = 0;
      const r = s.r, size = Math.floor(Math.min(r.w - 14, r.h - 52) / 3);
      s.gs = size; s.gx = Math.round(r.x + r.w / 2 - size * 1.5); s.gy = Math.round(r.y + 26 + Math.max(0, (r.h - 52 - size * 3) / 2));
    },
    tap(s, x, y) {
      const cx = Math.floor((x - s.gx) / s.gs), cy = Math.floor((y - s.gy) / s.gs);
      if (cx < 0 || cy < 0 || cx > 2 || cy > 2) return;
      const c = s.cells[cy * 3 + cx]; if (c.sel) return;
      if (c.spr === s.tg) { c.sel = true; s.got++; A().sfx('pick'); if (s.got >= s.need) s.win(); }
      else { c.bad = true; s.fail('NOT HUMAN'); }
    },
    draw(s) {
      const r = s.r, st = s.st;
      G.rect(r.x + 4, r.y + 2, r.w - 8, 20, s.acc);
      G.text(s.hint, r.x + r.w / 2, r.y + 8, s.accTx, { al: 'c' });
      s.cells.forEach((c, i) => {
        const x = s.gx + (i % 3) * s.gs, y = s.gy + Math.floor(i / 3) * s.gs;
        G.rect(x + 1, y + 1, s.gs - 2, s.gs - 2, c.bad ? st.tx : st.bd); G.box(x, y, s.gs, s.gs, st.tx);
        sprFit(c.spr, x + s.gs / 2, y + s.gs / 2, s.gs - 12, s.gs - 12, { '#': c.bad ? st.bd : st.tx, o: st.tx, w: st.bd, b: s.acc }, 3);
        if (c.sel) { G.box(x + 2, y + 2, s.gs - 4, s.gs - 4, s.acc, 3); G.rect(x + 3, y + 3, 13, 11, s.acc); G.text('✓', x + 5, y + 5, s.accTx); }
      });
      const by = s.gy + s.gs * 3 + 6;
      G.box(r.x + 10, by, 9, 9, st.tx); G.text("I'M NOT A ROBOT", r.x + 24, by + 1, st.tx);
    },
  };

  // ===== 6 INTRUDER: encuentra el icono infectado =====
  M.intruder = {
    cmd: 'FIND!', hint: 'TAP THE INFECTED ICON', time: 5.5,
    help: ['ONE OF THESE ICONS IS', 'INFECTED. FIND IT AND', 'TAP IT. THE INFECTION', 'GETS SNEAKIER.'],
    init(s) {
      const r = s.r; s.cols = 4 + Math.round(s.d * 2); s.rows = 5 + Math.round(s.d * 2);
      s.cw = Math.floor((r.w - 8) / s.cols); s.ch = Math.floor((r.h - 8) / s.rows);
      s.base = G.pick(['folder', 'pic', 'computer', 'trash', 'smiley', 'lock']);
      s.odd = G.irand(0, s.cols * s.rows - 1);
      s.kind = s.d < 0.34 ? 'other' : s.d < 0.67 ? (G.chance(0.5) ? 'flip' : 'color') : 'bug';
      if (s.kind === 'flip' && ['lock', 'trash', 'smiley'].includes(s.base)) s.kind = 'color';
      s.oddSpr = G.pick(['xcirc', 'warn'].filter((x) => x !== s.base));
    },
    cell(s, x, y) { const r = s.r, cx = Math.floor((x - r.x - 4) / s.cw), cy = Math.floor((y - r.y - 4) / s.ch); return cx < 0 || cy < 0 || cx >= s.cols || cy >= s.rows ? -1 : cy * s.cols + cx; },
    tap(s, x, y) { const i = this.cell(s, x, y); if (i < 0) return; if (i === s.odd) s.win(); else { s.bad = i; s.fail('CLEAN FILE'); } },
    draw(s) {
      const r = s.r, st = s.st, map = { '#': st.tx, w: st.bd, b: s.acc, o: st.tx };
      for (let i = 0; i < s.cols * s.rows; i++) {
        const cx = r.x + 4 + (i % s.cols) * s.cw + s.cw / 2, cy = r.y + 4 + Math.floor(i / s.cols) * s.ch + s.ch / 2;
        if (i === s.bad) G.rect(cx - s.cw / 2 + 1, cy - s.ch / 2 + 1, s.cw - 2, s.ch - 2, s.acc);
        if (i !== s.odd) { sprFit(s.base, cx, cy, s.cw - 6, s.ch - 6, map, 4); continue; }
        if (s.kind === 'other') sprFit(s.oddSpr, cx, cy, s.cw - 6, s.ch - 6, map, 4);
        else if (s.kind === 'flip') { const sc = Math.max(1, Math.min(4, Math.floor(Math.min((s.cw - 6) / G.sprW(s.base), (s.ch - 6) / G.sprH(s.base))))); sprFlip(s.base, cx, cy, sc, map); }
        else if (s.kind === 'color') sprFit(s.base, cx, cy, s.cw - 6, s.ch - 6, { '#': s.acc, w: st.bd, b: st.tx, o: s.acc }, 4);
        else { sprFit(s.base, cx, cy, s.cw - 6, s.ch - 6, map, 4); if (Math.floor(s.t * 2.5) % 3 !== 0) G.rect(cx + 4, cy - 6, 3, 3, s.acc); }
      }
    },
  };

  // ===== 7 SPOT.DIFF: toca lo que ha cambiado =====
  const SPOT = ['xcirc', 'warn', 'lock', 'hg1', 'pic', 'folder', 'trash', 'smiley'];
  M.spot = {
    cmd: 'SPOT!', hint: 'TAP THE DIFFERENCE', time: 7,
    help: ['TWO WINDOWS, ALMOST', 'THE SAME. TAP WHAT', 'CHANGED IN EITHER ONE.', 'TWO MISSES = ERROR.'],
    init(s) {
      const r = s.r; s.cols = 4; s.rows = s.d < 0.5 ? 3 : 4;
      const ph = Math.floor((r.h - 10) / 2);
      s.pA = { x: r.x + 4, y: r.y + 12, w: r.w - 8, h: ph - 14 }; s.pB = { x: r.x + 4, y: r.y + ph + 16, w: r.w - 8, h: ph - 14 };
      const cols = [s.st.tx, s.acc, s.acc2];
      s.cells = Array.from({ length: s.cols * s.rows }, () => ({ spr: G.pick(SPOT), col: G.pick(cols), on: G.chance(0.85) }));
      s.diff = G.irand(0, s.cells.length - 1);
      const c = s.cells[s.diff]; s.alt = Object.assign({}, c);
      const mode = s.d < 0.4 ? 'remove' : s.d < 0.75 ? 'swap' : 'color';
      if (!c.on) s.alt.on = true;
      else if (mode === 'remove') s.alt.on = false;
      else if (mode === 'swap') s.alt.spr = G.pick(SPOT.filter((x) => x !== c.spr));
      else s.alt.col = G.pick(cols.filter((x) => x !== c.col));
      s.mist = 0;
    },
    cellIn(s, p, x, y) { if (!G.inR(x, y, p)) return -1; return Math.floor((y - p.y) / (p.h / s.rows)) * s.cols + Math.floor((x - p.x) / (p.w / s.cols)); },
    tap(s, x, y) {
      let i = this.cellIn(s, s.pA, x, y); if (i < 0) i = this.cellIn(s, s.pB, x, y); if (i < 0) return;
      if (i === s.diff) s.win();
      else { s.mist++; s.shk = 0.25; A().sfx('deny'); G.pulse({ glitch: 0.3, ab: 2 }); if (s.mist > 1) s.fail('WRONG SPOT'); }
    },
    update(s, dt) { if (s.shk) s.shk = Math.max(0, s.shk - dt); },
    draw(s) {
      const st = s.st;
      [[s.pA, 'A.PNG', false], [s.pB, 'B.PNG', true]].forEach(([p, lab, alt]) => {
        const ox = s.shk ? G.irand(-2, 2) : 0;
        G.rect(p.x + ox, p.y - 10, 40, 10, st.tx); G.text(lab, p.x + ox + 3, p.y - 9, st.bd);
        G.box(p.x + ox, p.y, p.w, p.h, st.tx);
        const cw = p.w / s.cols, ch = p.h / s.rows;
        s.cells.forEach((c0, i) => {
          const c = alt && i === s.diff ? s.alt : c0; if (!c.on) return;
          sprFit(c.spr, p.x + ox + (i % s.cols) * cw + cw / 2, p.y + Math.floor(i / s.cols) * ch + ch / 2, cw - 6, ch - 6, { '#': c.col, o: c.col, w: st.bd, b: st.bd }, 3);
        });
      });
      G.text('MISS ' + s.mist + '/1', s.r.x + s.r.w - 6, s.r.y + 1, st.tx, { al: 'r' });
    },
  };

  // ===== 8 CURSOR: guía el cursor sin tocar las paredes =====
  M.cursor = {
    cmd: 'GUIDE!', hint: 'DRAG THE CURSOR TO EXIT', time: 10,
    help: ['SLIDE YOUR FINGER', 'ANYWHERE TO MOVE THE', 'CURSOR TO THE EXIT.', "DON'T TOUCH THE WALLS."],
    init(s) {
      const r = s.r; s.hw = Math.round(14 - 6 * s.d);
      const segs = 2 + Math.round(s.d * 2), x0 = r.x + 18, x1 = r.x + r.w - 18, mid = (x0 + x1) / 2;
      let x = Math.round(G.rand(x0, x1)), y = r.y + 18; const dy = (r.h - 40) / segs;
      s.pts = [{ x, y }];
      for (let i = 0; i < segs; i++) { y = Math.round(y + dy); s.pts.push({ x, y }); x = Math.round(x < mid ? G.rand(mid + 10, x1) : G.rand(x0, mid - 10)); s.pts.push({ x, y }); }
      s.rects = []; for (let i = 0; i < s.pts.length - 1; i++) { const a = s.pts[i], b = s.pts[i + 1]; s.rects.push({ x: Math.min(a.x, b.x) - s.hw, y: Math.min(a.y, b.y) - s.hw, w: Math.abs(b.x - a.x) + s.hw * 2 + 1, h: Math.abs(b.y - a.y) + s.hw * 2 + 1 }); }
      s.cur = { x: s.pts[0].x, y: s.pts[0].y }; s.exit = s.pts[s.pts.length - 1]; s.last = null;
    },
    inside(s, x, y) { return s.rects.some((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); },
    down(s, x, y) { s.last = { x, y }; },
    move(s, x, y) {
      if (!s.last || s.done) return;
      const dx = x - s.last.x, dy = y - s.last.y; s.last = { x, y };
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2));
      for (let k = 0; k < n; k++) {
        s.cur.x += dx / n; s.cur.y += dy / n;
        if (!this.inside(s, s.cur.x, s.cur.y)) { s.fail('CRASHED'); return; }
        if (Math.abs(s.cur.x - s.exit.x) < s.hw && Math.abs(s.cur.y - s.exit.y) < s.hw) { s.win(); return; }
      }
    },
    up(s) { s.last = null; },
    draw(s) {
      const r = s.r, st = s.st;
      G.drect(r.x, r.y, r.w, r.h, 4, st.tx, st.bd);
      for (const q of s.rects) G.rect(q.x - 1, q.y - 1, q.w + 2, q.h + 2, st.tx);
      for (const q of s.rects) G.rect(q.x, q.y, q.w, q.h, st.bd);
      const e = s.exit, on = Math.floor(s.t * 4) % 2;
      G.rect(e.x - s.hw + 1, e.y - s.hw + 1, s.hw * 2 - 1, s.hw * 2 - 1, on ? s.acc2 : s.acc);
      G.text('EXIT', e.x, e.y - 3, st.tx, { al: 'c' });
      const a = s.pts[0]; G.text('IN', a.x, a.y - 3, s.acc, { al: 'c' });
      G.drawSpr('cursor', Math.round(s.cur.x), Math.round(s.cur.y), { '#': st.tx, w: s.acc2 });
    },
  };

  // ===== 9 MINEFIELD: toca la única casilla segura =====
  M.mines = {
    cmd: 'SWEEP!', hint: 'TAP THE ONLY SAFE TILE', time: 8,
    help: ['ONLY ONE GREY TILE IS', 'SAFE. THE NUMBERS SAY', 'HOW MANY MINES TOUCH', 'EACH OPEN TILE.'],
    init(s) {
      const N = 4, k = s.d < 0.3 ? 3 : s.d < 0.7 ? 4 : 5;
      const nb = (i) => { const out = [], x = i % N, y = Math.floor(i / N); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N) out.push(yy * N + xx); } return out; };
      let best = null;
      for (let tries = 0; tries < 500 && !best; tries++) {
        const cov = shuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, k);
        const safe = G.pick(cov), mines = new Set(cov.filter((c) => c !== safe));
        const nums = Array.from({ length: 16 }, (_, i) => (cov.includes(i) ? -1 : nb(i).filter((j) => mines.has(j)).length));
        let ok = 0;
        for (const cand of cov) {
          const ms = new Set(cov.filter((c) => c !== cand));
          if (nums.every((v, i) => v < 0 || nb(i).filter((j) => ms.has(j)).length === v)) ok++;
        }
        if (ok === 1) best = { cov, safe, mines, nums };
      }
      Object.assign(s, best || { cov: [0], safe: 0, mines: new Set(), nums: Array(16).fill(0) });
      const r = s.r, size = Math.floor(Math.min(r.w - 16, r.h - 46) / 4);
      s.gs = size; s.gx = Math.round(r.x + r.w / 2 - size * 2); s.gy = Math.round(r.y + 32 + Math.max(0, (r.h - 46 - size * 4) / 2));
      s.boom = -1; s.open = -1;
    },
    tap(s, x, y) {
      const cx = Math.floor((x - s.gx) / s.gs), cy = Math.floor((y - s.gy) / s.gs);
      if (cx < 0 || cy < 0 || cx > 3 || cy > 3) return;
      const i = cy * 4 + cx; if (!s.cov.includes(i)) return;
      if (i === s.safe) { s.open = i; s.win(); } else { s.boom = i; A().sfx('boom'); G.pulse({ flash: 0.4, flashCol: W, shake: 6 }); s.fail('BOOM'); }
    },
    draw(s) {
      const r = s.r, st = s.st;
      G.rect(r.x + 4, r.y + 2, r.w - 8, 24, L); G.box(r.x + 4, r.y + 2, r.w - 8, 24, st.tx);
      G.rect(r.x + 8, r.y + 6, 30, 16, K); G.text(G.pad(s.mines.size, 3), r.x + 10, r.y + 10, Gr);
      G.drawSpr('smiley', Math.round(r.x + r.w / 2 - 7), r.y + 6, { '#': K, o: s.boom >= 0 ? K : null });
      G.text('1 SAFE', r.x + r.w - 8, r.y + 10, K, { al: 'r' });
      const numCol = [null, B, K, B, K, B];
      for (let i = 0; i < 16; i++) {
        const x = s.gx + (i % 4) * s.gs, y = s.gy + Math.floor(i / 4) * s.gs, g = s.gs;
        const covered = s.cov.includes(i) && i !== s.open;
        if (covered && i !== s.boom) {
          G.rect(x, y, g, g, L); G.rect(x, y, g, 2, W); G.rect(x, y, 2, g, W); G.rect(x, y + g - 2, g, 2, K); G.rect(x + g - 2, y, 2, g, K);
        } else {
          G.rect(x, y, g, g, i === s.boom ? s.acc2 : W); G.box(x, y, g, g, L);
          if (i === s.boom) { G.circ(x + g / 2, y + g / 2, Math.floor(g / 4), K, K); G.rect(x + g / 2 - 1, y + 4, 2, g - 8, K); G.rect(x + 4, y + g / 2 - 1, g - 8, 2, K); }
          else if (s.nums[i] > 0) G.text(String(s.nums[i]), x + g / 2, y + g / 2 - 7, numCol[s.nums[i]], { s: 2, al: 'c', b: true });
        }
      }
    },
  };

  // ===== 10 ECHO.EXE: repite la secuencia =====
  M.echo = {
    cmd: 'REPEAT!', hint: 'REPEAT THE SEQUENCE', time: 0,
    help: ['WATCH THE ERROR TILES', 'LIGHT UP AND LISTEN.', 'THEN TAP THEM IN THE', 'SAME ORDER.'],
    init(s) {
      s.len = 3 + Math.round(s.d * 3); s.seq = Array.from({ length: s.len }, () => G.irand(0, 3));
      s.phase = 'show'; s.pt = -0.45; s.lastK = -1; s.inp = 0; s.it = 0;
      s.dur = 0.42 - 0.17 * s.d; s.gap = 0.13; s.limit = 2.3 - 0.8 * s.d; s.lit = [0, 0, 0, 0];
      const r = s.r, sz = Math.floor(Math.min(r.w - 24, r.h - 50) / 2); s.sz = sz;
      s.gx = Math.round(r.x + r.w / 2 - sz); s.gy = Math.round(r.y + 26 + (r.h - 26 - 2 * sz) / 2);
    },
    fuse(s) { return s.phase === 'input' ? 1 - s.it / s.limit : 1; },
    update(s, dt) {
      s.lit = s.lit.map((v) => Math.max(0, v - dt));
      if (s.phase === 'show') {
        s.pt += dt;
        const k = Math.floor(s.pt / (s.dur + s.gap));
        if (s.pt >= 0 && k !== s.lastK && k < s.len) { s.lastK = k; s.lit[s.seq[k]] = s.dur; A().sfx('note', s.seq[k]); G.pulse({ ab: 1.2 }); }
        if (s.pt >= 0 && k >= s.len) { s.phase = 'input'; s.it = 0; }
      } else { s.it += dt; if (s.it > s.limit) s.fail('TOO SLOW'); }
    },
    tap(s, x, y) {
      if (s.phase !== 'input') return;
      const cx = Math.floor((x - s.gx) / s.sz), cy = Math.floor((y - s.gy) / s.sz);
      if (cx < 0 || cy < 0 || cx > 1 || cy > 1) return;
      const i = cy * 2 + cx; s.lit[i] = 0.18; A().sfx('note', i);
      if (i === s.seq[s.inp]) { s.inp++; s.it = 0; if (s.inp >= s.len) s.win(); } else s.fail('WRONG ORDER');
    },
    draw(s) {
      const r = s.r, st = s.st;
      const cols = [Gr, W, L, K], icons = ['xcirc', 'warn', 'smiley', 'lock'];
      G.text(s.phase === 'show' ? 'WATCH...' : 'YOUR TURN', r.x + r.w / 2, r.y + 6, st.tx, { al: 'c', b: true });
      for (let k = 0; k < s.len; k++) G.rect(r.x + r.w / 2 - s.len * 4 + k * 8, r.y + 17, 5, 3, k < s.inp ? st.tx : st.bd === B ? L : st.tx);
      for (let i = 0; i < 4; i++) {
        const x = s.gx + (i % 2) * s.sz, y = s.gy + Math.floor(i / 2) * s.sz, g = s.sz - 6, lit = s.lit[i] > 0;
        const c = lit ? (cols[i] === W ? Gr : W) : cols[i];
        G.rect(x + 3, y + 3, g, g, c); G.box(x + 3, y + 3, g, g, K, lit ? 3 : 1);
        if (lit) G.box(x, y, g + 6, g + 6, W);
        sprFit(icons[i], x + 3 + g / 2, y + 3 + g / 2, g - 16, g - 16, { '#': cols[i] === K && !lit ? W : K, o: K }, 4);
      }
    },
  };

  // ===== 11 NOTIFY: toca cuando la notificación llega a la línea =====
  M.notify = {
    cmd: 'TAP!', hint: 'TAP WHEN THEY HIT THE LINE', time: 0,
    help: ['NOTIFICATIONS FALL TO', 'THE INBOX LINE. TAP', 'THE SCREEN JUST WHEN', 'EACH ONE ARRIVES.'],
    init(s) {
      const r = s.r; s.lineY = r.y + r.h - 34; s.topY = r.y + 4;
      const n = 5 + Math.round(s.d * 3), iv = 0.62 - 0.2 * s.d;
      s.travel = 1.25 - 0.35 * s.d; s.win2 = 0.16 - 0.05 * s.d;
      s.notes = []; let t = 1.0;
      for (let i = 0; i < n; i++) { s.notes.push({ t, hit: false, miss: false }); t += iv * (s.d > 0.5 && G.chance(0.25) && i < n - 1 ? 0.55 : 1); }
      s.end = t + 0.3; s.miss = 0; s.allow = s.d < 0.5 ? 1 : 0; s.fl = 0; s.okfl = 0;
    },
    fuse(s) { return 1 - Math.min(1, s.t / s.end); },
    update(s, dt) {
      s.fl = Math.max(0, s.fl - dt); s.okfl = Math.max(0, s.okfl - dt);
      for (const n of s.notes) if (!n.hit && !n.miss && s.t > n.t + s.win2) { n.miss = true; s.miss++; s.fl = 0.25; A().sfx('deny'); if (s.miss > s.allow) { s.fail('MISSED'); return; } }
      if (s.notes.every((n) => n.hit || n.miss)) s.win();
    },
    tap(s) {
      let best = null, bd = 9;
      for (const n of s.notes) if (!n.hit && !n.miss) { const d = Math.abs(s.t - n.t); if (d < bd) { bd = d; best = n; } }
      if (best && bd <= s.win2) { best.hit = true; s.okfl = 0.15; A().sfx('spawn', 2); G.pulse({ ab: 1.5 }); }
      else { s.miss++; s.fl = 0.25; A().sfx('deny'); if (s.miss > s.allow) s.fail('OFF BEAT'); }
    },
    draw(s) {
      const r = s.r, st = s.st, lw = 64, lx = Math.round(r.x + r.w / 2 - lw / 2);
      G.rect(lx, r.y, lw, r.h, st.bd === B ? K : st.tx); G.dash(lx - 3, r.y, 1, st.tx);
      for (let y = r.y; y < r.y + r.h; y += 8) { G.rect(lx - 3, y, 1, 4, st.tx); G.rect(lx + lw + 2, y, 1, 4, st.tx); }
      G.rect(lx - 10, s.lineY - 1, lw + 20, 4, s.okfl > 0 ? W : s.fl > 0 ? s.acc2 : s.acc);
      G.text('INBOX', r.x + r.w / 2, s.lineY + 8, st.tx, { al: 'c' });
      for (const n of s.notes) {
        if (n.hit) continue;
        const y = Math.round(s.lineY - ((n.t - s.t) / s.travel) * (s.lineY - s.topY) - 8);
        if (y < r.y - 20 || y > r.y + r.h) continue;
        const x = lx + 6, w = lw - 12;
        G.rect(x, y, w, 16, n.miss ? L : W); G.box(x, y, w, 16, K); G.rect(x, y, w, 4, s.acc2);
        G.text('MSG', x + 3, y + 6, K); G.drawSpr('xcirc', x + w - 12, y + 5, { '#': K });
      }
      G.text('MISS ' + s.miss + '/' + s.allow, r.x + 6, r.y + 4, st.tx);
    },
  };

  // ===== 12 BSOD.RUN: esquiva los errores que caen =====
  M.dodge = {
    cmd: 'DODGE!', hint: 'SLIDE TO DODGE THE ERRORS', time: 5.5, winOnTimeout: true,
    help: ['ERRORS RAIN FROM THE', 'TOP. SLIDE YOUR FINGER', 'LEFT AND RIGHT AND', 'SURVIVE UNTIL THE END.'],
    init(s) {
      const r = s.r; s.p = { x: r.x + r.w / 2 - 14, y: r.y + r.h - 32, w: 28, h: 26 };
      s.drops = []; s.sp = 0.35; s.rate = 0.56 - 0.24 * s.d; s.vy = 75 + 80 * s.d; s.last = null;
    },
    down(s, x) { s.last = x; },
    move(s, x) { if (s.last == null) return; s.p.x = G.clamp(s.p.x + (x - s.last) * 1.25, s.r.x + 2, s.r.x + s.r.w - s.p.w - 2); s.last = x; },
    up(s) { s.last = null; },
    update(s, dt) {
      const r = s.r;
      s.sp -= dt;
      if (s.sp <= 0) {
        s.sp = s.rate * G.rand(0.6, 1.3);
        const w = G.irand(24, 40), aim = G.chance(0.3) ? G.clamp(s.p.x + s.p.w / 2 - w / 2, r.x, r.x + r.w - w) : G.rand(r.x, r.x + r.w - w);
        s.drops.push({ x: aim, y: r.y - 16, w, h: 16, vy: s.vy * G.rand(0.8, 1.25), k: G.irand(0, 2) });
      }
      for (const d of s.drops) d.y += d.vy * dt;
      s.drops = s.drops.filter((d) => d.y < r.y + r.h);
      const p = s.p;
      for (const d of s.drops) if (p.x + 6 < d.x + d.w && p.x + p.w - 6 > d.x && p.y + 6 < d.y + d.h && p.y + p.h - 4 > d.y) { s.fail('BSOD'); G.pulse({ flash: 0.3, flashCol: B }); return; }
    },
    draw(s) {
      const st = s.st;
      for (const d of s.drops) {
        if (d.k === 0) { G.rect(d.x, d.y, d.w, d.h, W); G.box(d.x, d.y, d.w, d.h, K); G.rect(d.x, d.y, d.w, 5, K); G.drawSpr('xcirc', d.x + 3, d.y + 6, { '#': K }); }
        else if (d.k === 1) { G.rect(d.x, d.y, d.w, d.h, B); G.box(d.x, d.y, d.w, d.h, W); G.text(':(', d.x + 4, d.y + 5, W); }
        else { G.rect(d.x, d.y, d.w, d.h, Gr); G.box(d.x, d.y, d.w, d.h, K); G.text('ERR', d.x + 3, d.y + 5, K); }
      }
      G.drawSpr('computer', Math.round(s.p.x), Math.round(s.p.y), { '#': K, w: W, b: Gr }, 2);
    },
  };

  // ======================= MODO MICRO dentro de la escena de juego =======================
  const ACC = [[L, K, K], [B, L, W], [B, Gr, W], [Gr, W, K]]; // [acento, acento2, texto sobre acento] por bloque
  S.initMicro = function () {
    this.mg = G.MICRO[this.cfg.game];
    this.rounds = this.cfg.rounds; this.round = 0; this.lives = 4; this.closed = 0;
    this.mphase = 'idle'; this.ms = null;
    this.layoutMicro();
  };
  S.layoutMicro = function () {
    const y0 = G.safeT + 2, h = G.taskbarY() - y0 - 4;
    this.mwin = { x: 4, y: y0 + 2, w: G.W - 8, h: h - 2, st: G.WSTYLES[['m1', 'b2', 'g3', 'g4'][this.block]], title: this.L.name.indexOf('.') >= 0 ? this.L.name : this.L.name + '.EXE', stripes: true, xmode: 'x' };
    const x = this.mwin.x + 2, y = this.mwin.y + G.WIN_BAR + 2;
    this.mbody = { x, y, w: this.mwin.w - 4, h: this.mwin.h - G.WIN_BAR - 4 };
  };
  S.startRound = function () {
    this.round++;
    const boss = this.round === this.rounds;
    const d = G.clamp(((this.round - 1) / Math.max(1, this.rounds - 1)) * 0.75 + this.tier * 0.12 + (boss ? 0.15 : 0), 0, 1);
    const b = this.mbody, acc = ACC[this.block];
    const s = { r: { x: b.x, y: b.y + 10, w: b.w, h: b.h - 10 }, d, t: 0, boss, block: this.block, st: this.mwin.st, acc: acc[0], acc2: acc[1], accTx: acc[2], done: null, reason: '', hint: this.mg.hint };
    s.win = () => { if (!s.done) s.done = 'win'; };
    s.fail = (why) => { if (!s.done) { s.done = 'lose'; s.reason = why || 'ERROR'; } };
    s.T = (this.mg.time || 0) * (1 - 0.3 * d) * (boss ? 1.25 : 1);
    this.mg.init(s);
    this.ms = s; this.mphase = 'cmd'; this.pt = 0;
    A().sfx('cmd'); G.pulse({ glitch: 0.5, ab: 3 });
    A().intensity(d);
    G.fx.abBase = (this.block === 3 ? 1 : Math.round(d * 0.8)) + (boss ? 1 : 0); G.fx.glitchBase = (this.block === 3 ? 0.04 + d * 0.06 : d > 0.55 ? (d - 0.55) * 0.1 : 0) + (boss ? 0.03 : 0);
  };
  S.updateMicro = function (dt) {
    const s = this.ms; if (!s) return;
    this.pt += dt;
    if (this.mphase === 'cmd') { if (this.pt > Math.max(0.75, 1.15 - s.d * 0.35)) { this.mphase = 'play'; this.pt = 0; G.pulse({ ab: 2 }); } return; }
    if (this.mphase === 'play') {
      s.t += dt;
      if (this.mg.update) this.mg.update(s, dt);
      if (!s.done && s.T > 0 && s.t >= s.T) { if (this.mg.winOnTimeout) s.win(); else s.fail('TIME OUT'); }
      if (s.done) {
        this.mphase = 'res'; this.pt = 0; this.drag = null;
        if (s.done === 'win') {
          this.closed++; this.score += Math.round(100 * (1 + s.d) + (s.T > 0 ? Math.max(0, s.T - s.t) * 30 : 50));
          A().sfx('ok'); G.pulse({ ab: 3, flash: 0.15, flashCol: W });
        } else {
          this.lives--; A().sfx('bad'); G.vibrate(60); G.pulse({ glitch: 1, ab: 6, shake: 7 });
        }
      }
      return;
    }
    if (this.mphase === 'res' && this.pt > 0.85) {
      if (this.lives <= 0) return this.lose('NO LIVES LEFT');
      if (this.round >= this.rounds) { this.state = 'play'; return this.win(); }
      this.startRound();
    }
  };
  S.drawMicro = function (g) {
    g.drawImage(this.wall, 0, 0);
    if (this.block === 3 && Math.random() < 0.08) { const y = G.irand(0, G.H - 10), h = G.irand(2, 8); g.drawImage(this.wall, 0, y, G.W, h, G.irand(-12, 12), y, G.W, h); }
    const w = this.mwin, st = w.st, s = this.ms;
    if (this.state !== 'intro') {
      const r0 = G.drawFrame(w);
      // mecha de tiempo (barra de carga que se vacía)
      const fuse = s ? G.clamp(this.mphase === 'cmd' ? 1 : this.mg.fuse ? this.mg.fuse(s) : s.T > 0 ? 1 - s.t / s.T : 1, 0, 1) : 1;
      G.box(r0.x + 2, r0.y + 1, r0.w - 4, 8, st.tx);
      const fw = Math.round((r0.w - 8) * fuse), hot = fuse < 0.3 && Math.floor(G.time * 8) % 2;
      for (let i = 0; i < fw; i += 4) G.rect(r0.x + 4 + i, r0.y + 3, Math.min(3, fw - i), 4, hot ? (this.ms ? this.ms.acc : st.tx) : st.tx);
      if (s) {
        const T = G.ctx(); T.save(); T.beginPath(); T.rect(s.r.x, s.r.y, s.r.w, s.r.h); T.clip();
        this.mg.draw(s);
        T.restore();
        if (this.mphase === 'cmd') this.drawCmd(s);
        if (this.mphase === 'res') this.drawRes(s);
      }
    }
    const info = { label: '♥'.repeat(Math.max(0, this.lives)) + '  ' + Math.min(this.round, this.rounds) + '/' + this.rounds, startDown: this.startDown > 0 };
    G.drawTaskbar(this.block, info);
    if (this.state === 'intro') { this.dim(); this.drawIntro(); }
    if (this.state === 'paused') { this.dim(); this.drawPause(); }
    if (this.state === 'clear') this.drawClear();
  };
  // orden grande estilo ventana de error
  S.drawCmd = function (s) {
    const b = this.mbody, st = this.mwin.st, k = Math.max(0, 0.18 - this.pt) * 5;
    G.drect(b.x, b.y, b.w, b.h, 6, K, null);
    const fs = Math.max(18, Math.floor(G.W / 6.5));
    const spr = G.fsprite(this.mg.cmd, 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, W, 120);
    const sc = 1 + k, ww = Math.round(spr.width * sc), hh = Math.round(spr.height * sc);
    const cy = Math.round(b.y + b.h * 0.42);
    const bw = Math.min(b.w - 8, Math.max(ww + 24, 150)), bh = hh + 40;
    const bx = Math.round(b.x + b.w / 2 - bw / 2), by = Math.round(cy - bh / 2);
    G.rect(bx + 3, by + 3, bw, bh, K);
    G.rect(bx, by, bw, bh, s.acc === L ? K : s.acc); G.box(bx, by, bw, bh, W);
    G.rect(bx + 1, by + 1, bw - 2, 10, W); G.text(s.boss ? 'BOSS.EXE' : 'ROUND ' + this.round, bx + 4, by + 2, K);
    const T = G.ctx();
    if (Math.floor(this.pt * 20) % 7 === 0) T.drawImage(G.fsprite(this.mg.cmd, 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, s.acc2 === K ? L : s.acc2, 120), Math.round(bx + bw / 2 - ww / 2) - 3, by + 14, ww, hh);
    T.drawImage(spr, Math.round(bx + bw / 2 - ww / 2), by + 14, ww, hh);
    const hint = s.hint;
    const lines = G.wrap(hint, bw - 12);
    lines.forEach((ln, i) => G.text(ln, bx + bw / 2, by + hh + 18 + i * 9, W, { al: 'c' }));
    if (s.boss && Math.floor(this.pt * 6) % 2 === 0) G.text('!! BOSS ROUND !!', b.x + b.w / 2, by - 12, st.tx === W ? W : st.tx, { al: 'c', b: true });
  };
  S.drawRes = function (s) {
    const b = this.mbody;
    if (s.done === 'win') {
      const fs = Math.max(22, Math.floor(G.W / 5));
      const spr = G.fsprite('OK!', 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, W, 120);
      const x = Math.round(b.x + b.w / 2 - spr.width / 2), y = Math.round(b.y + b.h * 0.4 - spr.height / 2);
      G.rect(x - 10, y - 6, spr.width + 20, spr.height + 12, s.acc === L ? K : s.acc); G.box(x - 10, y - 6, spr.width + 20, spr.height + 12, W);
      G.ctx().drawImage(spr, x, y);
    } else {
      const w = { x: Math.round(b.x + b.w / 2 - 70), y: Math.round(b.y + b.h * 0.4 - 30), w: 140, h: 62, st: G.WSTYLES.m1, title: 'ERROR', stripes: true, xmode: 'x' };
      const r = G.drawFrame(w);
      G.drawSpr('xcirc', r.x + 6, r.y + 6, { '#': K });
      G.text(s.reason, r.x + 21, r.y + 6, K);
      G.text('-1 ♥  ' + Math.max(0, this.lives) + ' LEFT', r.x + 21, r.y + 17, K);
      G.drawBtn(w.x + 50, w.y + w.h - 18, 40, 13, 'OK', K, W);
    }
  };
  S.tapMicro = function (x, y) {
    if (this.mphase !== 'play' || !this.ms || this.ms.done) return;
    const s = this.ms;
    if (this.mg.down) this.mg.down(s, x, y);
    if (this.mg.tap) this.mg.tap(s, x, y);
  };
  S.move = function (x, y) {
    if (this.cfg.mode !== 'micro' || this.state !== 'play' || this.mphase !== 'play' || !this.ms || this.ms.done) return;
    if (this.mg.move) this.mg.move(this.ms, x, y);
  };
  S.up = function (x, y) {
    if (this.cfg.mode !== 'micro' || this.state !== 'play' || this.mphase !== 'play' || !this.ms || this.ms.done) return;
    if (this.mg.up) this.mg.up(this.ms, x, y);
  };
})(window.G);
