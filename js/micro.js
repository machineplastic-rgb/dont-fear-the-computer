'use strict';
// MICROJUEGOS (niveles 2-12): rondas rápidas con orden de una palabra, 4 vidas y jefe final.
// Modos de pantalla: 'window' (ventana grande), 'float' (ventana flotante sobre el escritorio) y 'desk' (el escritorio entero).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const S = G.scenes.game;
  function area() { const y0 = G.safeT + 2; return { x: 2, y: y0, w: G.W - 4, h: G.taskbarY() - y0 - 4 }; }

  // ---------- utilidades ----------
  function sprFit(name, cx, cy, maxW, maxH, map, maxSc) {
    const w = G.sprW(name), h = G.sprH(name);
    const sc = Math.max(1, Math.min(maxSc || 9, Math.floor(Math.min(maxW / w, maxH / h))));
    G.drawSpr(name, Math.round(cx - (w * sc) / 2), Math.round(cy - (h * sc) / 2), map, sc);
    return sc;
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function place(list, r, w, h, gap) {
    for (let k = 0; k < 90; k++) {
      const x = Math.round(G.rand(r.x, r.x + r.w - w)), y = Math.round(G.rand(r.y, r.y + r.h - h));
      if (list.every((o) => Math.abs(o.x - x) > Math.max(w, o.w) + gap || Math.abs(o.y - y) > Math.max(h, o.h) + gap)) return { x, y };
    }
    return { x: Math.round(G.rand(r.x, r.x + r.w - w)), y: Math.round(G.rand(r.y, r.y + r.h - h)) };
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
  function groupBox(x, y, w, h, label, col) { // recuadro punteado con título (estilo panel de control)
    G.dash(x, y, w, col, 1, 1); G.dash(x, y + h - 1, w, col, 1, 1);
    for (let yy = y; yy < y + h; yy += 2) { G.px(x, yy, col); G.px(x + w - 1, yy, col); }
    if (label) G.text(label, x + 7, y - 3, col, { b: true });
  }
  function groupBoxBg(x, y, w, h, label, col, bg) { G.rect(x + 5, y - 4, G.textW(label) + 6, 9, bg); groupBox(x, y, w, h, null, col); G.text(label, x + 7, y - 3, col, { b: true }); }
  function handles(x, y, w, h, col, bg) { // marcos de selección (como en Paint)
    G.box(x, y, w, h, col);
    for (const [hx, hy] of [[x, y], [x + w / 2, y], [x + w - 1, y], [x, y + h / 2], [x + w - 1, y + h / 2], [x, y + h - 1], [x + w / 2, y + h - 1], [x + w - 1, y + h - 1]]) { G.rect(Math.round(hx) - 2, Math.round(hy) - 2, 5, 5, bg); G.box(Math.round(hx) - 2, Math.round(hy) - 2, 5, 5, col); }
  }

  const M = G.MICRO = {};

  // ===== 2 TRASH: arrastra los archivos a la papelera (¡no tires SYSTEM ni el HD!) =====
  function drawBin(x, y, open, full, fg, bd) {
    const bx = x + 4, w = 32;
    for (let i = 0; i < Math.min(full, 5); i++) { const px = bx + 3 + ((i * 7) % 24), py = y + 6 - (i % 2) * 3; G.rect(px, py, 7, 7, bd); G.box(px, py, 7, 7, fg); G.px(px + 2, py + 3, fg); G.px(px + 4, py + 2, fg); }
    if (open) { G.rect(bx - 3, y - 2, w + 6, 3, fg); G.rect(bx + 11, y - 6, 10, 4, fg); G.rect(bx + 13, y - 5, 6, 2, bd); }
    else { G.rect(bx - 3, y + 9, w + 6, 3, fg); G.rect(bx + 11, y + 5, 10, 4, fg); G.rect(bx + 13, y + 6, 6, 2, bd); }
    G.rect(bx, y + 12, w, 34, bd); G.box(bx, y + 12, w, 34, fg); G.rect(bx, y + 12, w, 3, fg);
    for (let k = 0; k < 4; k++) G.rect(bx + 6 + k * 6, y + 17, 1, 25, fg);
    G.rect(bx + 1, y + 44, w - 2, 1, fg);
  }
  M.trash = {
    cmd: 'DRAG!', hint: 'FILES TO THE TRASH', time: 6.5,
    help: ['DRAG EVERY FILE INTO', 'THE TRASH ON THE RIGHT.', 'NEVER TRASH "SYSTEM"', 'OR THE HARD DISK "HD".'],
    init(s) {
      const r = s.r;
      s.bin = { x: r.x + r.w - 48, y: Math.round(r.y + r.h / 2 - 22), w: 42, h: 52 };
      s.full = 0; s.items = [];
      const zone = { x: r.x + 4, y: r.y + 16, w: r.w - 62, h: r.h - 22 };
      const n = 2 + Math.round(s.d * 5), names = shuffle(G.TRASH_ICONS.slice());
      for (let i = 0; i < n; i++) { const p = place(s.items, zone, 36, 44, 2); s.items.push({ x: p.x, y: p.y, w: 36, h: 44, ic: names[i % names.length], sys: false, ph: Math.random() * 6 }); }
      const decoys = s.d > 0.12 ? (s.d > 0.6 ? 2 : 1) : 0;
      ['system', 'disk'].slice(0, decoys).forEach((nm) => { const p = place(s.items, zone, 36, 44, 2); s.items.push({ x: p.x, y: p.y, w: 36, h: 44, ic: nm, sys: true, ph: Math.random() * 6 }); });
      shuffle(s.items);
    },
    down(s, x, y) { dragDown(s, s.items, x, y, 6); },
    move: dragMove,
    up(s) {
      if (!s.drag) return; const o = s.drag.o; s.drag = null;
      if (G.inR(o.x + o.w / 2, o.y + 16, s.bin, 14)) {
        if (o.sys) { s.fail(o.ic === 'disk' ? 'DISK DELETED' : 'SYSTEM DELETED'); return; }
        s.items.splice(s.items.indexOf(o), 1); s.full++; A().sfx('drop'); s.binT = 0.3; G.pulse({ ab: 1.5 });
        if (!s.items.some((i) => !i.sys)) s.win();
      }
    },
    update(s, dt) {
      if (s.binT) s.binT = Math.max(0, s.binT - dt);
      if (s.d > 0.5) s.items.forEach((o) => { if (s.drag && s.drag.o === o) return; o.x = G.clamp(o.x + Math.sin(s.t * 5 + o.ph) * 0.5 + (s.d > 0.8 ? Math.sin(s.t * 1.3 + o.ph) * 0.6 : 0), s.r.x, s.bin.x - o.w - 4); });
    },
    draw(s) {
      const r = s.r, st = s.st, b = s.bin;
      G.text((s.items.length + s.full) + ' ITEMS', r.x + 4, r.y + 2, st.tx); G.text('1.1 MB FREE', r.x + r.w - 4, r.y + 2, st.tx, { al: 'r' });
      G.rect(r.x, r.y + 11, r.w, 1, st.tx);
      const hot = s.binT > 0 || (s.drag && G.inR(s.drag.o.x + 18, s.drag.o.y + 16, b, 14));
      drawBin(b.x, b.y, hot, s.full, st.tx, st.bd);
      G.rect(b.x + 6, b.y + b.h + 2, 30, 9, st.tx); G.text('TRASH', b.x + 21, b.y + b.h + 3, st.bd, { al: 'c' });
      for (const o of s.items) {
        G.drawIcon16(o.ic, o.x + 2, o.y, 2, st.tx, st.bd, s.acc);
        const lab = G.ICON_LABEL[o.ic], lw = G.textW(lab) + 2;
        G.rect(o.x + o.w / 2 - lw / 2, o.y + 34, lw, 9, o.sys ? st.tx : st.bd);
        G.text(lab, o.x + o.w / 2, o.y + 35, o.sys ? st.bd : st.tx, { al: 'c' });
      }
    },
  };

  // ===== 3 LOAD.100: barra de copia al 100 % · calidad en NORMAL · volumen vertical al máximo =====
  const loadKind = (s) => ['copy', 'quality', 'volume'][Math.min(2, Math.floor(((s.round || 1) - 1) * 3 / (s.rounds || 9)))];
  M.load = {
    mode: 'float', tilt: 5, cmd: 'STOP!', hint: 'TAP AT THE RIGHT MOMENT', time: 0,
    help: ['STOP EACH BAR AT THE', 'RIGHT MOMENT:', 'COPY = 100%', 'QUALITY = NORMAL', 'VOLUME = MAX'],
    float(aw, ah, round, rounds) {
      const k = loadKind({ round, rounds });
      if (k === 'copy') return { w: aw - 10, h: 128, title: 'COPYING...' };
      if (k === 'quality') return { w: aw - 10, h: 168, title: 'COMPRESSION SETTINGS' };
      return { w: aw - 10, h: Math.min(ah - 40, 230), title: 'CONTROL PANEL' };
    },
    init(s) {
      s.kind = loadKind(s);
      if (s.kind === 'copy') { s.hint = 'TAP AT 100%'; s.p = 0; s.v = 0.42 + 0.2 * s.d; s.zone = 0.13 - 0.05 * s.d; s.hold = 0.35; s.file = G.pick(['HAPPY.EXE', 'SOUL.DAT', 'DREAMS.ZIP', 'TIME.SYS']); }
      else if (s.kind === 'quality') { s.hint = 'STOP AT NORMAL'; s.T = 6.5 * (1 - 0.25 * s.d); s.ph = Math.random() * 6; s.u = 0; s.sp = 1.5 + 1.6 * s.d; s.tol = 0.075 - 0.03 * s.d; }
      else { s.hint = 'STOP AT MAX VOLUME'; s.T = 6.5 * (1 - 0.25 * s.d); s.ph = -Math.PI / 2; s.u = 0; s.sp = 1.3 + 1.5 * s.d; s.tol = 0.08 - 0.03 * s.d; }
    },
    fuse(s) { return s.kind === 'copy' ? 1 - Math.min(1, s.p) : 1 - s.t / s.T; },
    update(s, dt) {
      if (s.kind === 'copy') {
        if (s.hold > 0) s.hold -= dt;
        else { s.p += s.v * (s.p > 0.75 ? 1.15 + 0.3 * s.d : 1) * dt; if (Math.random() < dt * (1.3 + s.d)) s.hold = G.rand(0.08, 0.3) * (s.p > 0.8 ? 0.7 : 1); }
        if (s.p > 1.035) { s.p = 1.035; s.fail('OVERFLOW'); }
      } else {
        s.ph += s.sp * dt * (0.75 + 0.5 * Math.abs(Math.sin(s.t * 1.7)));
        s.u = 0.5 + 0.5 * Math.sin(s.ph);
      }
    },
    tap(s) {
      if (s.kind === 'copy') { if (s.p >= 1 - s.zone) s.win(); else s.fail('TOO SOON'); }
      else if (s.kind === 'quality') { if (Math.abs(s.u - 0.5) <= s.tol) s.win(); else s.fail(s.u < 0.5 ? 'TOO LOW' : 'TOO HIGH'); }
      else { if (s.u >= 1 - s.tol) s.win(); else s.fail('NOT LOUD ENOUGH'); }
    },
    draw(s) {
      const r = s.r, st = s.st, fg = st.tx, bg = st.bd;
      if (s.kind === 'copy') {
        G.text(s.file, r.x + 8, r.y + 6, fg, { s: 2, b: true });
        G.text('FROM "C:/" TO "VOID"', r.x + 8, r.y + 25, fg);
        const bw = r.w - 16, bx = r.x + 8, by = r.y + 40, bh = 16;
        const zx = bx + Math.round(bw * (1 - s.zone));
        G.drect(zx, by - 3, bx + bw - zx, bh + 6, 8, s.acc === L ? fg : s.acc, null);
        G.box(bx - 2, by - 2, bw + 4, bh + 4, fg);
        const f = Math.round(bw * Math.min(1.035, s.p));
        for (let i = 0; i < f; i += 5) G.rect(bx + i, by + 2, Math.min(3, f - i), bh - 4, fg);
        const pct = Math.min(104, Math.floor(s.p * 100));
        G.text(pct + '%', bx + bw, by + bh + 6, pct > 100 ? (s.acc === L ? fg : s.acc) : fg, { al: 'r', b: true });
        G.text(Math.max(0, Math.ceil((1 - s.p) * 24)) + ' HOURS REMAINING', bx, by + bh + 6, fg);
        G.drawSpr(Math.floor(s.t * 3) % 2 ? 'hg1' : 'hg2', r.x + r.w - 16, r.y + 6, { '#': fg, o: fg });
        G.drawBtn(r.x + r.w / 2 - 28, r.y + r.h - 18, 56, 14, 'CANCEL', fg, bg);
      } else if (s.kind === 'quality') {
        groupBoxBg(r.x + 4, r.y + 8, r.w - 8, 40, 'COMPRESSOR', fg, bg);
        G.box(r.x + 10, r.y + 14, r.w - 20, 12, fg); G.rect(r.x + 11, r.y + 25, r.w - 21, 1, fg); G.text('VOID VIDEO', r.x + 14, r.y + 17, fg, { b: true }); G.text('▼', r.x + r.w - 18, r.y + 17, fg);
        G.drect(r.x + 10, r.y + 31, r.w - 20, 11, 4, fg, null); G.box(r.x + 10, r.y + 31, r.w - 20, 11, fg); G.rect(r.x + 12, r.y + 32, 38, 9, bg); G.text('COLOR', r.x + 14, r.y + 33, fg, { b: true });
        groupBoxBg(r.x + 4, r.y + 58, r.w - 8, 50, 'QUALITY', fg, bg);
        const tx = r.x + 14, tw = r.w - 28, ty = r.y + 70;
        G.drect(tx + Math.round(tw * (0.5 - s.tol)), ty - 4, Math.round(tw * s.tol * 2), 15, 6, s.acc === L ? fg : s.acc, null);
        G.rect(tx, ty, tw, 7, bg); G.drect(tx + 1, ty + 1, tw - 2, 5, 8, fg, bg); G.box(tx, ty, tw, 7, fg);
        [0, 0.25, 0.5, 0.75, 1].forEach((v) => G.rect(tx + Math.round(tw * v), ty + 10, 1, 3, fg));
        G.text('LEAST', tx, ty + 16, fg); G.text('LOW', tx + tw * 0.25, ty + 16, fg, { al: 'c' }); G.text('NORMAL', tx + tw * 0.5, ty + 16, fg, { al: 'c', b: true }); G.text('HIGH', tx + tw * 0.75, ty + 16, fg, { al: 'c' }); G.text('MOST', tx + tw, ty + 16, fg, { al: 'r' });
        const thx = Math.round(tx + tw * s.u);
        G.rect(thx - 4, ty - 4, 9, 15, bg); G.box(thx - 4, ty - 4, 9, 15, fg); G.rect(thx - 2, ty - 2, 5, 11, fg); G.rect(thx - 1, ty - 1, 3, 9, bg);
        G.box(r.x + 10, r.y + r.h - 22, 15, 15, fg); G.line(r.x + 12, r.y + r.h - 20, r.x + 22, r.y + r.h - 10, fg); G.line(r.x + 22, r.y + r.h - 20, r.x + 12, r.y + r.h - 10, fg);
        G.text('FRAME DIFFERENCING', r.x + 30, r.y + r.h - 18, fg);
        G.drawBtn(r.x + r.w - 44, r.y + r.h - 24, 36, 16, 'OK', fg, bg, false, { double: true });
      } else {
        const cw = 46, sx = r.x + r.w - cw - 4;
        // paneles decorativos del panel de control
        G.box(r.x + 4, r.y + 4, sx - r.x - 10, 54, fg);
        G.checker(r.x + 10, r.y + 10, 26, 26, fg, bg); G.box(r.x + 10, r.y + 10, 26, 26, fg);
        G.drect(r.x + 42, r.y + 10, sx - r.x - 54, 26, 4 + Math.floor(s.t * 4) % 8, fg, bg); G.box(r.x + 42, r.y + 10, sx - r.x - 54, 26, fg);
        G.text('DESKTOP PATTERN', r.x + (sx - r.x) / 2, r.y + 42, fg, { al: 'c' });
        G.box(r.x + 4, r.y + 62, sx - r.x - 10, 46, fg);
        G.text('MOUSE TRACKING', r.x + 10, r.y + 66, fg);
        const sel = Math.floor(s.t * 1.5) % 3;
        for (let i = 0; i < 3; i++) { G.circ(r.x + 16 + i * 26, r.y + 84, 4, bg, fg); if (i === sel) G.circ(r.x + 16 + i * 26, r.y + 84, 2, fg, fg); }
        G.text('SLOW   FAST', r.x + 10, r.y + 94, fg);
        G.box(r.x + 4, r.y + 112, sx - r.x - 10, 22, fg); G.text('RAM CACHE', r.x + 10, r.y + 119, fg); G.box(sx - 40, r.y + 116, 30, 13, fg); G.text('128K', sx - 37, r.y + 119, fg);
        if (r.h > 180) {
          G.box(r.x + 4, r.y + 138, sx - r.x - 10, 30, fg); G.text('KEY REPEAT RATE', r.x + 10, r.y + 142, fg);
          const kr = Math.floor(s.t * 2.2) % 4;
          for (let i = 0; i < 4; i++) { G.circ(r.x + 14 + i * 18, r.y + 158, 3, bg, fg); if (i === kr) G.circ(r.x + 14 + i * 18, r.y + 158, 1, fg, fg); }
        }
        // volumen vertical
        G.box(sx, r.y + 4, cw, r.h - 8, fg);
        const ty = r.y + 14, th = r.h - 50, tx = sx + 30;
        G.drect(tx - 7, ty - 4, 15, Math.round(th * s.tol) + 6, 6, s.acc === L ? fg : s.acc, null);
        G.rect(tx - 2, ty, 5, th, bg); G.drect(tx - 1, ty, 3, th, 8, fg, bg); G.box(tx - 2, ty, 5, th, fg);
        for (let n = 0; n <= 7; n++) { const yy = Math.round(ty + th - (n / 7) * th); G.rect(sx + 14, yy, 4, 1, fg); G.text(String(n), sx + 6, yy - 3, fg); }
        const thy = Math.round(ty + th - s.u * th);
        G.rect(tx - 7, thy - 3, 15, 7, bg); G.box(tx - 7, thy - 3, 15, 7, fg); G.rect(tx - 5, thy - 1, 11, 3, fg);
        G.text('SPEAKER', sx + cw / 2, r.y + r.h - 30, fg, { al: 'c' }); G.text('VOLUME', sx + cw / 2, r.y + r.h - 21, fg, { al: 'c' });
        G.drawSpr('i_sound', r.x + 10, r.y + r.h - 34, { '#': fg, w: bg });
        if (s.u > 0.7) for (let k = 0; k < 3; k++) if (Math.floor(s.t * 8 + k) % 3) G.rect(r.x + 30 + k * 3, r.y + r.h - 30 + k, 1, 8 - k * 2, fg);
      }
    },
  };

  // ===== 4 DEFRAG: cada fragmento a su zona (estilo optimizador de disco) =====
  const DEF_T = [{ lab: 'SYS', c: Gr }, { lab: 'USED', c: W }, { lab: 'BAD', c: K }, { lab: 'FREE', c: null }];
  M.defrag = {
    cmd: 'SORT!', hint: 'FRAGMENTS TO THEIR ZONE', time: 7.5,
    help: ['DEFRAGMENT THE DISK:', 'DRAG EACH FRAGMENT TO', 'THE ZONE OF ITS COLOR.', 'THE CLUSTER BAR FILLS', 'AS YOU CLEAR ROUNDS.'],
    init(s) {
      const r = s.r, k = 2 + Math.round(s.d * 2), n = 3 + Math.round(s.d * 4);
      s.k = k; s.mapY = r.y + 12; s.mapH = Math.round(r.h * 0.3);
      const cols = Math.floor((r.w - 6) / 5), rows = Math.floor(s.mapH / 6);
      s.cols = cols; s.rows = rows; s.cells = Array.from({ length: cols * rows }, () => Math.random());
      s.stY = r.y + r.h - 26;
      const zy = s.stY - 46, zw = Math.floor((r.w - 6) / k);
      s.zones = []; for (let i = 0; i < k; i++) s.zones.push({ x: r.x + 3 + i * zw, y: zy, w: zw - 4, h: 42, t: i, n: 0 });
      const play = { x: r.x + 6, y: s.mapY + s.mapH + 6, w: r.w - 12, h: zy - (s.mapY + s.mapH) - 12 };
      s.blocks = []; for (let i = 0; i < n; i++) { const p = place(s.blocks, play, 24, 24, 4); s.blocks.push({ x: p.x, y: p.y, w: 24, h: 24, t: i % k, hx: p.x, hy: p.y }); }
      shuffle(s.blocks); s.placed = 0;
    },
    pat(t, x, y, w, h) { const d = DEF_T[t]; if (d.c) G.rect(x, y, w, h, d.c); else G.drect(x, y, w, h, 8, K, L); },
    down(s, x, y) { dragDown(s, s.blocks, x, y, 8); },
    move: dragMove,
    up(s) {
      if (!s.drag) return; const b = s.drag.o; s.drag = null;
      const z = s.zones.find((z) => G.inR(b.x + 12, b.y + 12, z, 6));
      if (z && z.t === b.t) {
        const per = Math.max(1, Math.floor((z.w - 4) / 26));
        b.x = z.x + 3 + (z.n % per) * 26; b.y = z.y + 13; b.done = true; z.n++; s.placed++;
        A().sfx('drop'); G.pulse({ ab: 1.2 });
        if (s.blocks.every((o) => o.done)) s.win();
      } else if (z) { A().sfx('deny'); b.x = b.hx; b.y = b.hy; G.pulse({ glitch: 0.25, ab: 2 }); }
    },
    draw(s) {
      const r = s.r;
      G.rect(r.x, r.y, r.w, r.h, B);
      G.rect(r.x, r.y, r.w, 10, W); G.text('OPTIMIZE', r.x + 3, r.y + 2, B); G.text('F1=HELP', r.x + r.w - 3, r.y + 2, B, { al: 'r' });
      // mapa de clusters animado
      const head = Math.floor(s.t * 14) % (s.cols * s.rows), prog = (s.placed / s.blocks.length);
      for (let i = 0; i < s.cols * s.rows; i++) {
        const x = r.x + 3 + (i % s.cols) * 5, y = s.mapY + Math.floor(i / s.cols) * 6, v = s.cells[i];
        let c = v < 0.45 + prog * 0.4 ? W : v < 0.85 ? null : v < 0.93 ? Gr : K;
        if (Math.abs(i - head) < 2) c = Math.floor(s.t * 10) % 2 ? Gr : W;
        if (c) G.rect(x, y, 4, 5, c); else G.drect(x, y, 4, 5, 4, W, null);
      }
      for (const z of s.zones) {
        G.rect(z.x, z.y, z.w, z.h, B); G.box(z.x, z.y, z.w, z.h, W);
        this.pat(z.t, z.x + 2, z.y + 2, 8, 8); G.box(z.x + 2, z.y + 2, 8, 8, W);
        G.text(DEF_T[z.t].lab, z.x + 13, z.y + 3, W);
      }
      for (const b of s.blocks) { this.pat(b.t, b.x, b.y, b.w, b.h); G.box(b.x, b.y, b.w, b.h, W); if (!b.done) { G.box(b.x - 1, b.y - 1, b.w + 2, b.h + 2, K); G.box(b.x + 3, b.y + 3, b.w - 6, b.h - 6, b.t === 1 ? B : W); } }
      // panel de estado: la barra de clusters se llena con el progreso del nivel
      const y = s.stY;
      G.box(r.x + 3, y, r.w - 6, 24, W); G.rect(r.x + 8, y - 3, 40, 7, B); G.text('STATUS', r.x + 10, y - 3, W);
      const lp = G.clamp(((s.round - 1) + (s.placed / s.blocks.length)) / s.rounds, 0, 1);
      G.text('CLUSTER ' + Math.floor(lp * 100) + '%', r.x + 8, y + 5, W);
      const sec = Math.floor(s.t); G.text('00:00:' + String(sec).padStart(2, '0'), r.x + r.w - 8, y + 5, W, { al: 'r' });
      const bw = r.w - 16; G.box(r.x + 8, y + 14, bw, 7, W); G.drect(r.x + 9, y + 15, Math.round((bw - 2) * lp), 5, 12, Gr, W);
    },
  };

  // ===== 5 CAPTCHA: ventana flotante con fotos =====
  M.captcha = {
    mode: 'float', tilt: 5, cmd: 'VERIFY!', hint: 'SELECT ALL MATCHES', time: 7,
    help: ['PROVE YOU ARE HUMAN:', 'TAP EVERY PICTURE THAT', 'MATCHES THE WORD.', 'ONE WRONG TAP = ROBOT.'],
    float(aw, ah) { const w = aw - 12; return { w, h: Math.min(ah - 30, Math.round(w * 1.32)), title: 'CAPTCHA' }; },
    init(s) {
      const tg = G.pick(G.CAPTCHA_SET); s.tg = tg[0]; s.word = tg[1]; s.hint = 'SELECT ALL ' + tg[1];
      const m = 2 + Math.round(s.d * 2), others = G.CAPTCHA_SET.filter((c) => c[0] !== s.tg).map((c) => c[0]);
      s.cells = shuffle(Array.from({ length: 9 }, (_, i) => (i < m ? s.tg : G.pick(others)))).map((p) => ({ p, v: G.irand(0, 5), sel: false }));
      s.need = m; s.got = 0;
      const r = s.r, size = Math.floor(Math.min(r.w - 8, r.h - 40 - 30) / 3);
      s.gs = size; s.gx = Math.round(r.x + r.w / 2 - size * 1.5); s.gy = r.y + 42;
    },
    tap(s, x, y) {
      const cx = Math.floor((x - s.gx) / s.gs), cy = Math.floor((y - s.gy) / s.gs);
      if (cx < 0 || cy < 0 || cx > 2 || cy > 2) return;
      const c = s.cells[cy * 3 + cx]; if (c.sel) return;
      if (c.p === s.tg) { c.sel = true; s.got++; A().sfx('pick'); G.pulse({ ab: 1 }); if (s.got >= s.need) s.win(); }
      else { c.bad = true; s.fail('NOT HUMAN'); }
    },
    draw(s) {
      const r = s.r, st = s.st;
      G.rect(r.x + 2, r.y + 2, r.w - 4, 36, B);
      G.text('SELECT ALL IMAGES WITH', r.x + 7, r.y + 6, W);
      const big = s.word.length <= 11;
      G.text(s.word, r.x + 7, r.y + 17, W, { s: big ? 2 : 1, b: true });
      if (Math.floor(s.t * 3) % 2 && !big) G.rect(r.x + 7 + G.textW(s.word, 1, 1, true) + 2, r.y + 17, 4, 7, W);
      s.cells.forEach((c, i) => {
        const x = s.gx + (i % 3) * s.gs, y = s.gy + Math.floor(i / 3) * s.gs, g = s.gs;
        const ins = c.sel ? 6 : 1;
        G.rect(x, y, g, g, st.bd);
        const pic = G.captchaPic(c.p, c.v), sc = Math.max(1, Math.floor((g - ins * 2) / 24));
        const pw = 24 * sc, px = Math.round(x + g / 2 - pw / 2), py = Math.round(y + g / 2 - pw / 2);
        G.ctx().drawImage(pic, px, py, pw, pw);
        if (c.bad) { G.drect(px, py, pw, pw, 8, K, null); }
        G.box(x, y, g, g, st.bd);
        if (c.sel) { G.circ(x + 8, y + 8, 6, B, W); G.text('✓', x + 6, y + 5, W); }
      });
      const fy = s.gy + s.gs * 3 + 6;
      G.rect(r.x + 2, fy, r.w - 4, 1, st.tx);
      G.circ(r.x + 12, fy + 12, 5, null, st.tx); G.rect(r.x + 14, fy + 6, 3, 2, st.tx);
      G.rect(r.x + 24, fy + 8, 8, 8, st.tx); G.rect(r.x + 26, fy + 10, 4, 4, st.bd);
      const bx = r.x + r.w - 56;
      G.rect(bx, fy + 5, 50, 15, B); G.text('VERIFY', bx + 25, fy + 9, W, { al: 'c', b: true });
    },
  };

  // ===== 6 DEBUG!: el virus se esconde detrás de las ventanas =====
  M.debug = {
    mode: 'desk', cmd: 'DEBUG!', hint: 'TAP THE BUG', time: 7,
    help: ['A BUG IS HIDING BEHIND', 'THE WINDOWS. TAP IT', 'WHEN IT SHOWS UP.', 'TILT THE PHONE TO MOVE', 'THE WINDOWS AWAY.'],
    init(s) {
      const r = s.r; s.wins = [];
      const nw = 4 + Math.round(s.d * 2), kinds = shuffle(G.MINI_KINDS.slice());
      for (let i = 0; i < nw; i++) {
        const w = G.irand(62, Math.min(104, r.w - 20)), h = G.irand(40, 70);
        s.wins.push({ bx: G.rand(r.x + 4, r.x + r.w - w - 4), by: G.rand(r.y + 4, r.y + r.h - h - 4), w, h, kind: kinds[i % kinds.length], pf: G.rand(0.6, 1.4), ph: Math.random() * 6, seed: Math.random(), st: G.randStyle(s.block) });
      }
      s.need = 1 + (s.d > 0.45 ? 1 : 0) + (s.d > 0.85 ? 1 : 0); s.got = 0; s.splats = [];
      this.newBug(s);
    },
    wpos(s, w) {
      const dr = s.d > 0.3 ? s.d * 12 : 0;
      return { x: w.bx + G.tilt.x * 34 * w.pf + Math.sin(s.t * 0.9 + w.ph) * dr, y: w.by + G.tilt.y * 34 * w.pf + Math.cos(s.t * 0.7 + w.ph) * dr * 0.6, w: w.w, h: w.h };
    },
    covered(s, x, y) { return s.wins.some((w) => G.inR(x, y, this.wpos(s, w))); },
    spot(s, hide) {
      const r = s.r;
      if (hide) { const w = G.pick(s.wins), p = this.wpos(s, w); return { x: p.x + p.w / 2 - 13, y: p.y + p.h / 2 - 11 }; }
      for (let k = 0; k < 30; k++) { const x = G.rand(r.x + 6, r.x + r.w - 32), y = G.rand(r.y + 6, r.y + r.h - 28); if (!this.covered(s, x + 13, y + 11)) return { x, y }; }
      return { x: G.rand(r.x + 6, r.x + r.w - 32), y: G.rand(r.y + 6, r.y + r.h - 28) };
    },
    newBug(s) { const p = this.spot(s, true); s.bug = { x: p.x, y: p.y, state: 'hide', tm: G.rand(0.4, 0.9), tx: p.x, ty: p.y }; },
    update(s, dt) {
      const b = s.bug; if (!b) return;
      const sp = 60 + 75 * s.d;
      b.tm -= dt;
      if (b.state === 'run') {
        const dx = b.tx - b.x, dy = b.ty - b.y, dd = Math.hypot(dx, dy);
        if (dd < 2) { b.state = b.peek ? 'peek' : 'hide'; b.tm = b.peek ? G.rand(0.35, 0.75) * (1 - 0.3 * s.d) : G.rand(0.5, 1.0) * (1 - 0.35 * s.d); }
        else { b.x += (dx / dd) * sp * dt; b.y += (dy / dd) * sp * dt; }
      } else if (b.tm <= 0) {
        b.peek = Math.random() < 0.45; const p = this.spot(s, !b.peek); b.tx = p.x; b.ty = p.y; b.state = 'run';
      }
    },
    tap(s, x, y) {
      const b = s.bug; if (!b) return;
      if (G.inR(x, y, { x: b.x, y: b.y, w: 26, h: 22 }, 7) && !this.covered(s, x, y)) {
        s.splats.push({ x: b.x, y: b.y }); s.got++; A().sfx('hit'); G.pulse({ ab: 3, shake: 3 }); G.vibrate(25);
        if (s.got >= s.need) { s.bug = null; s.win(); } else this.newBug(s);
      } else if (this.covered(s, x, y)) { A().sfx('deny'); }
    },
    draw(s) {
      const r = s.r;
      G.drawDesktopIcons(s.block, r.y + 2);
      for (const p of s.splats) G.drawSpr('splat', p.x, p.y, { '#': s.block >= 2 ? Gr : W }, 2);
      const b = s.bug;
      if (b) G.drawSpr(Math.floor(s.t * 12) % 2 ? 'bug' : 'bug2', Math.round(b.x), Math.round(b.y), { '#': K, g: s.block >= 2 ? Gr : W }, 2);
      for (const w of s.wins) { const p = this.wpos(s, w); G.miniWin(p.x, p.y, p.w, p.h, w.kind, s.t, w.st, w.seed); }
      G.text('BUGS ' + s.got + '/' + s.need, r.x + r.w - 4, r.y + r.h - 9, W, { al: 'r', b: true });
    },
  };

  // ===== 7 SPOT.DIFF: dos capturas de escritorio casi iguales =====
  M.spot = {
    cmd: 'SPOT!', hint: 'TAP THE DIFFERENCE', time: 8,
    help: ['TWO SCREENSHOTS, ONE', 'DIFFERENCE. TAP WHAT', 'CHANGED IN EITHER ONE.', 'TWO MISSES = ERROR.'],
    init(s) {
      const r = s.r, ph = Math.floor((r.h - 14) / 2);
      s.pA = { x: r.x + 4, y: r.y + 12, w: r.w - 8, h: ph - 14 }; s.pB = { x: r.x + 4, y: r.y + ph + 16, w: r.w - 8, h: ph - 14 };
      const pw = s.pA.w, phh = s.pA.h;
      s.pat = G.irand(2, 6); s.objs = [];
      const zone = { x: 2, y: 2, w: pw - 4, h: phh - 16 };
      const nw = 2, kinds = shuffle(G.MINI_KINDS.slice());
      for (let i = 0; i < nw; i++) { const w = G.irand(64, Math.min(92, pw - 40)), h = G.irand(42, Math.min(58, phh - 26)); const p = place(s.objs, zone, w, h, 2); s.objs.push({ t: 'win', x: p.x, y: p.y, w, h, kind: kinds[i], seed: Math.random(), st: G.randStyle(s.block) }); }
      const icons = shuffle(G.TRASH_ICONS.slice());
      for (let i = 0; i < 3; i++) { const p = place(s.objs, zone, 32, 40, 2); s.objs.push({ t: 'icon', x: p.x, y: p.y, w: 32, h: 40, ic: icons[i] }); }
      s.objs.push({ t: 'cursor', x: G.irand(20, pw - 30), y: G.irand(10, phh - 34), w: 8, h: 12 });
      s.objs.push({ t: 'clock', x: pw - 34, y: phh - 11, w: 32, h: 9, hh: G.irand(1, 12), mm: G.irand(10, 59) });
      // la diferencia
      const pool = s.objs.map((o, i) => i).filter((i) => s.d >= 0.45 || s.objs[i].t !== 'clock');
      s.diff = G.pick(pool); const o = s.objs[s.diff]; s.alt = Object.assign({}, o);
      if (o.t === 'win') {
        if (s.d < 0.4) s.alt.kind = G.pick(G.MINI_KINDS.filter((k) => k !== o.kind));
        else if (s.d < 0.75) { const opts = Object.values(G.WSTYLES).filter((x) => x.bar !== o.st.bar); s.alt.st = G.pick(opts); }
        else s.alt.seed = o.seed + 0.37;
      }
      else if (o.t === 'icon') { if (s.d < 0.3) s.alt.hidden = true; else s.alt.ic = G.pick(G.TRASH_ICONS.filter((k) => k !== o.ic)); }
      else if (o.t === 'cursor') { s.alt.x = G.clamp(o.x + G.pick([-26, 26]), 4, pw - 12); s.alt.y = G.clamp(o.y + G.pick([-18, 18]), 4, phh - 24); }
      else s.alt.mm = (o.mm + 17) % 60;
      s.mist = 0; s.tfix = Math.random() * 10;
    },
    hitObj(s, p, x, y) {
      const rx = x - p.x, ry = y - p.y, o = s.objs[s.diff], a = s.alt;
      return G.inR(rx, ry, o, 6) || G.inR(rx, ry, a, 6);
    },
    tap(s, x, y) {
      const p = G.inR(x, y, s.pA) ? s.pA : G.inR(x, y, s.pB) ? s.pB : null; if (!p) return;
      if (this.hitObj(s, p, x, y)) s.win();
      else { s.mist++; s.shk = 0.25; A().sfx('deny'); G.pulse({ glitch: 0.3, ab: 2 }); if (s.mist > 1) s.fail('WRONG SPOT'); }
    },
    update(s, dt) { if (s.shk) s.shk = Math.max(0, s.shk - dt); },
    drawObj(s, o, px, py) {
      const st = s.st;
      if (o.t === 'win') G.miniWin(px + o.x, py + o.y, o.w, o.h, o.kind, s.tfix + s.t, o.st, o.seed);
      else if (o.t === 'icon') { if (o.hidden) return; G.drawIcon16(o.ic, px + o.x, py + o.y, 2, K, W, s.acc2); const lab = G.ICON_LABEL[o.ic]; G.rect(px + o.x + 16 - (G.textW(lab) + 2) / 2, py + o.y + 32, G.textW(lab) + 2, 8, W); G.text(lab, px + o.x + 16, py + o.y + 33, K, { al: 'c' }); }
      else if (o.t === 'cursor') G.drawSpr('cursor', px + o.x, py + o.y, { '#': K, w: W });
      else { G.text(String(o.hh).padStart(2, '0') + ':' + String(o.mm).padStart(2, '0'), px + o.x + 1, py + o.y + 1, W); }
    },
    draw(s) {
      const st = s.st;
      [[s.pA, 'A.PNG', false], [s.pB, 'B.PNG', true]].forEach(([p, lab, alt]) => {
        const ox = s.shk ? G.irand(-2, 2) : 0, px = p.x + ox, py = p.y;
        G.rect(px, py - 10, 40, 10, st.tx); G.text(lab, px + 3, py - 9, st.bd);
        const T = G.ctx(); T.save(); T.beginPath(); T.rect(px, py, p.w, p.h); T.clip();
        G.drect(px, py, p.w, p.h, s.pat, s.acc === L ? K : s.acc, s.block >= 2 ? B : L);
        G.rect(px, py + p.h - 12, p.w, 12, K); G.rect(px, py + p.h - 12, p.w, 1, W);
        G.rect(px + 2, py + p.h - 10, 33, 8, W); G.text('START', px + 4, py + p.h - 10, K);
        s.objs.forEach((o, i) => this.drawObj(s, alt && i === s.diff ? s.alt : o, px, py));
        T.restore();
        G.box(px, py, p.w, p.h, st.tx);
      });
      G.text('MISS ' + s.mist + '/1', s.r.x + s.r.w - 6, s.r.y + 1, st.tx, { al: 'r' });
    },
  };

  // ===== 8 CURSOR: guía el cursor entre ventanas flotantes hasta la salida =====
  M.cursor = {
    mode: 'desk', cmd: 'GUIDE!', hint: 'CURSOR TO THE EXIT', time: 10,
    help: ['SLIDE YOUR FINGER TO', 'GUIDE THE CURSOR TO', 'THE EXIT FOLDER.', "DON'T TOUCH ANY WINDOW."],
    init(s) {
      const r = s.r, c = Math.round(9 - 3 * s.d);
      s.S = { x: r.x + 12, y: r.y + 12 }; s.E = { x: r.x + r.w - 34, y: r.y + r.h - 34, w: 30, h: 30 };
      const kinds = G.MINI_KINDS;
      let best = null;
      for (let attempt = 0; attempt < 25 && !best; attempt++) {
        const wins = [], nw = 5 + Math.round(s.d * 3);
        for (let i = 0; i < nw * 3 && wins.length < nw; i++) {
          const w = G.irand(48, Math.min(100, r.w - 30)), h = G.irand(34, 66);
          const x = G.rand(r.x + 2, r.x + r.w - w - 2), y = G.rand(r.y + 2, r.y + r.h - h - 2);
          const q = { x, y, w, h };
          if (G.inR(s.S.x, s.S.y, q, 26) || G.inR(s.E.x + 15, s.E.y + 15, q, 28)) continue;
          if (wins.some((o) => G.inR(x + w / 2, y + h / 2, o, 4))) continue;
          wins.push({ x: Math.round(x), y: Math.round(y), w, h, kind: G.pick(kinds), seed: Math.random(), st: G.randStyle(s.block) });
        }
        if (this.pathOk(s, wins, c)) best = wins;
      }
      s.wins = best || [];
      s.cur = { x: s.S.x, y: s.S.y }; s.last = null;
    },
    pathOk(s, wins, c) {
      const r = s.r, cs = 3, cw = Math.ceil(r.w / cs), ch = Math.ceil(r.h / cs), seen = new Uint8Array(cw * ch);
      const free = (gx, gy) => { const x = r.x + gx * cs + 1, y = r.y + gy * cs + 1; return !wins.some((w) => x > w.x - c && x < w.x + w.w + c && y > w.y - c && y < w.y + w.h + c); };
      const sx = Math.floor((s.S.x - r.x) / cs), sy = Math.floor((s.S.y - r.y) / cs);
      const ex = Math.floor((s.E.x + 15 - r.x) / cs), ey = Math.floor((s.E.y + 15 - r.y) / cs);
      const q = [sx + sy * cw]; seen[sx + sy * cw] = 1;
      while (q.length) {
        const i = q.shift(), x = i % cw, y = Math.floor(i / cw);
        if (Math.abs(x - ex) <= 2 && Math.abs(y - ey) <= 2) return true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ni = nx + ny * cw; if (nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen[ni] && free(nx, ny)) { seen[ni] = 1; q.push(ni); } }
      }
      return false;
    },
    down(s, x, y) { s.last = { x, y }; },
    move(s, x, y) {
      if (!s.last || s.done) return;
      const dx = x - s.last.x, dy = y - s.last.y, r = s.r; s.last = { x, y };
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2));
      for (let k = 0; k < n; k++) {
        s.cur.x = G.clamp(s.cur.x + dx / n, r.x + 1, r.x + r.w - 2); s.cur.y = G.clamp(s.cur.y + dy / n, r.y + 1, r.y + r.h - 2);
        if (s.wins.some((w) => G.inR(s.cur.x, s.cur.y, w, 1))) { s.fail('CRASHED'); G.pulse({ glitch: 0.6 }); return; }
        if (G.inR(s.cur.x, s.cur.y, s.E, 4)) { s.win(); return; }
      }
    },
    up(s) { s.last = null; },
    draw(s) {
      const r = s.r, e = s.E;
      G.drawSpr('computer', s.S.x - 6, s.S.y - 4, { '#': K, w: W, b: s.acc2 });
      for (const w of s.wins) G.miniWin(w.x, w.y, w.w, w.h, w.kind, s.t, w.st, w.seed);
      const on = Math.floor(s.t * 4) % 2;
      G.drawSpr('folder', e.x + 1, e.y + 2, { '#': K, w: on ? s.acc2 : W }, 2);
      G.rect(e.x + 2, e.y + 24, 26, 8, K); G.text('EXIT', e.x + 15, e.y + 25, W, { al: 'c' });
      G.drawSpr('cursor', Math.round(s.cur.x), Math.round(s.cur.y), { '#': K, w: W });
    },
  };

  // ===== 9 FORCE QUIT!: la ventana colgada, a toques rápidos =====
  M.forcequit = {
    mode: 'desk', cmd: 'MASH!', hint: 'TAP FAST TO FORCE QUIT', time: 6.5,
    help: ['A PROGRAM IS FROZEN.', 'TAP IT AS FAST AS YOU', 'CAN TO FORCE QUIT IT', 'BEFORE TIME RUNS OUT.'],
    init(s) {
      const r = s.r, w = Math.min(r.w - 16, 168), h = 118;
      s.fw = { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h };
      const sp = s.d > 0.3 ? 18 + 42 * s.d : 0, a = Math.random() * 6;
      s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
      s.fill = 0; s.tapV = 0.1 - 0.025 * s.d; s.decay = 0.08 + 0.12 * s.d; s.trail = []; s.tt = 0; s.clicks = [];
      s.title = G.pick(['PAINT.EXE', 'VOID.EXE', 'MAIL.APP', 'NOTES.EXE']);
    },
    update(s, dt) {
      const r = s.r, f = s.fw;
      s.fill = Math.max(0, s.fill - s.decay * dt);
      f.x += s.vx * dt; f.y += s.vy * dt;
      if (f.x < r.x) { f.x = r.x; s.vx = Math.abs(s.vx); } if (f.x + f.w > r.x + r.w) { f.x = r.x + r.w - f.w; s.vx = -Math.abs(s.vx); }
      if (f.y < r.y) { f.y = r.y; s.vy = Math.abs(s.vy); } if (f.y + f.h > r.y + r.h) { f.y = r.y + r.h - f.h; s.vy = -Math.abs(s.vy); }
      s.tt -= dt; if (s.tt <= 0) { s.tt = 0.07; s.trail.push({ x: f.x, y: f.y }); if (s.trail.length > 12) s.trail.shift(); }
      s.clicks.forEach((c) => (c.t += dt)); s.clicks = s.clicks.filter((c) => c.t < 0.5);
    },
    tap(s, x, y) {
      if (!G.inR(x, y, s.fw, 4)) return;
      s.fill += s.tapV; s.clicks.push({ x, y, t: 0 });
      A().sfx('close', Math.floor(s.fill * 10)); G.pulse({ ab: 1.5, shake: 1.5 }); G.vibrate(6);
      if (s.fill >= 1) { s.fill = 1; A().sfx('glitch'); s.win(); }
    },
    draw(s) {
      const f = s.fw, st = G.WSTYLES[['m1', 'b2', 'g1', 'g4'][s.block]] || G.WSTYLES.m1;
      for (const p of s.trail) { G.rect(Math.round(p.x), Math.round(p.y), f.w, f.h, st.fr); G.rect(Math.round(p.x) + 1, Math.round(p.y) + 1, f.w - 2, 10, st.bar); G.rect(Math.round(p.x) + 2, Math.round(p.y) + 13, f.w - 4, f.h - 15, st.bd); G.drect(Math.round(p.x) + 2, Math.round(p.y) + 13, f.w - 4, f.h - 15, 6, L, null); }
      const w = { x: f.x, y: f.y, w: f.w, h: f.h, st, title: 'NOT RESPONDING', stripes: true, xmode: 'x' };
      const r = G.drawFrame(w);
      G.text('FILE EDIT VIEW', r.x + 3, r.y + 2, st.tx);
      G.drect(r.x, r.y + 11, r.w, r.h - 11, 6, L, null);
      G.text(s.title, r.x + r.w / 2, r.y + 16, st.tx, { al: 'c', b: true });
      G.drawSpr(Math.floor(s.t * 6) % 2 ? 'hg1' : 'hg2', r.x + r.w / 2 - 10, r.y + 28, { '#': st.tx, o: st.tx }, 3);
      G.text('(NOT RESPONDING)', r.x + r.w / 2, r.y + 58, st.tx, { al: 'c' });
      const bw = r.w - 16, bx = r.x + 8, by = r.y + r.h - 22;
      G.text('FORCE QUIT', bx, by - 10, st.tx, { b: true }); G.text(Math.floor(s.fill * 100) + '%', bx + bw, by - 10, st.tx, { al: 'r' });
      G.rect(bx, by, bw, 12, st.bd); G.box(bx, by, bw, 12, st.tx);
      const fw = Math.round((bw - 4) * s.fill), hot = s.fill > 0.75 && Math.floor(s.t * 10) % 2;
      for (let i = 0; i < fw; i += 4) G.rect(bx + 2 + i, by + 2, 3, 8, hot ? (s.acc === L ? st.tx : s.acc) : st.tx);
      for (const c of s.clicks) G.text('CLICK', c.x, c.y - 8 - c.t * 30, W, { al: 'c', b: true });
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
      for (let k = 0; k < s.len; k++) G.rect(r.x + r.w / 2 - s.len * 4 + k * 8, r.y + 17, 5, 3, k < s.inp ? st.tx : L);
      for (let i = 0; i < 4; i++) {
        const x = s.gx + (i % 2) * s.sz, y = s.gy + Math.floor(i / 2) * s.sz, g = s.sz - 6, lit = s.lit[i] > 0;
        const c = lit ? (cols[i] === W ? Gr : W) : cols[i];
        G.rect(x + 3, y + 3, g, g, c); G.box(x + 3, y + 3, g, g, K, lit ? 3 : 1);
        if (lit) G.box(x, y, g + 6, g + 6, W);
        sprFit(icons[i], x + 3 + g / 2, y + 3 + g / 2, g - 16, g - 16, { '#': cols[i] === K && !lit ? W : K, o: K }, 4);
      }
    },
  };

  // ===== 11 OK!: el botón OK huye del dedo =====
  M.okbtn = {
    mode: 'desk', cmd: 'OK!', hint: 'CATCH THE OK BUTTON', time: 6.5,
    help: ['THE OK BUTTON DOES NOT', 'WANT TO BE PRESSED.', 'CATCH IT AND TAP IT.', 'NEVER PRESS CANCEL.'],
    init(s) {
      const r = s.r, dw = Math.min(r.w - 30, 172), dh = 84;
      s.dlg = { x: Math.round(r.x + (r.w - dw) / 2), y: Math.round(r.y + r.h * 0.32 - dh / 2), w: dw, h: dh };
      s.cancel = { x: s.dlg.x + 14, y: s.dlg.y + dh - 22, w: 52, h: 15 };
      const bw = Math.round(44 - 12 * s.d), bh = Math.round(17 - 3 * s.d);
      s.ok = this.mkBtn(s, s.dlg.x + dw - bw - 14, s.dlg.y + dh - 23, bw, bh, false);
      s.fakes = []; const nf = s.d > 0.6 ? (s.d > 0.85 ? 2 : 1) : 0;
      for (let i = 0; i < nf; i++) s.fakes.push(this.mkBtn(s, G.rand(r.x, r.x + r.w - bw), G.rand(r.y + r.h * 0.5, r.y + r.h - bh), bw, bh, true));
      s.ghosts = []; s.gt = 0;
    },
    mkBtn(s, x, y, w, h, fake) { const sp = 38 + 105 * s.d, a = Math.random() * 6; return { x, y, w, h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, sp, turn: G.rand(0.6, 1.3), fake, wait: fake ? 0 : 0.35 }; },
    moveBtn(s, b, dt) {
      const r = s.r;
      if (b.wait > 0) { b.wait -= dt; return; }
      b.turn -= dt; if (b.turn <= 0) { b.turn = G.rand(0.6, 1.3); const a = Math.random() * 6; b.vx = Math.cos(a) * b.sp; b.vy = Math.sin(a) * b.sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < r.x) { b.x = r.x; b.vx = Math.abs(b.vx); } if (b.x + b.w > r.x + r.w) { b.x = r.x + r.w - b.w; b.vx = -Math.abs(b.vx); }
      if (b.y < r.y) { b.y = r.y; b.vy = Math.abs(b.vy); } if (b.y + b.h > r.y + r.h) { b.y = r.y + r.h - b.h; b.vy = -Math.abs(b.vy); }
    },
    update(s, dt) {
      this.moveBtn(s, s.ok, dt); s.fakes.forEach((f) => this.moveBtn(s, f, dt));
      s.gt -= dt; if (s.gt <= 0) { s.gt = 0.06; s.ghosts.push({ x: s.ok.x, y: s.ok.y, t: 0 }); }
      s.ghosts.forEach((g) => (g.t += dt)); s.ghosts = s.ghosts.filter((g) => g.t < 0.3);
    },
    tap(s, x, y) {
      const o = s.ok;
      if (G.inR(x, y, o, 4)) { A().sfx('ok'); s.win(); return; }
      for (const f of s.fakes) if (G.inR(x, y, f, 2)) { s.fail('FAKE OK'); return; }
      if (G.inR(x, y, s.cancel, 2)) { s.fail('CANCELLED'); return; }
      if (Math.hypot(x - (o.x + o.w / 2), y - (o.y + o.h / 2)) < 40) { // casi: salta lejos
        const r = s.r; let nx, ny, k = 0;
        do { nx = G.rand(r.x, r.x + r.w - o.w); ny = G.rand(r.y, r.y + r.h - o.h); k++; } while (Math.hypot(nx - x, ny - y) < 70 && k < 20);
        o.x = nx; o.y = ny; o.sp *= 1.05; A().sfx('glitch'); G.pulse({ glitch: 0.4, ab: 2 });
      }
    },
    btn(b, st, fake) {
      G.rect(b.x + 2, b.y + 2, b.w, b.h, K);
      G.rect(b.x, b.y, b.w, b.h, st.bd);
      if (fake) G.drect(b.x, b.y, b.w, 1, 8, st.tx, null), G.drect(b.x, b.y + b.h - 1, b.w, 1, 8, st.tx, null), G.drect(b.x, b.y, 1, b.h, 8, st.tx, null), G.drect(b.x + b.w - 1, b.y, 1, b.h, 8, st.tx, null);
      else { G.box(b.x, b.y, b.w, b.h, st.tx); G.box(b.x + 2, b.y + 2, b.w - 4, b.h - 4, st.tx); }
      G.text('OK', b.x + b.w / 2, b.y + Math.floor((b.h - 7) / 2), st.tx, { al: 'c', b: true });
    },
    draw(s) {
      const d = s.dlg, st = G.WSTYLES.m1;
      const w = { x: d.x, y: d.y + (Math.random() < s.d * 0.1 ? G.irand(-1, 1) : 0), w: d.w, h: d.h, st, title: 'CONFIRM', stripes: true, xmode: 'x' };
      const r = G.drawFrame(w);
      G.drawSpr('warn', r.x + 6, r.y + 6, { '#': K });
      G.text('ARE YOU SURE YOU', r.x + 24, r.y + 6, K); G.text('WANT TO CONTINUE?', r.x + 24, r.y + 15, K);
      G.drawBtn(s.cancel.x, s.cancel.y, s.cancel.w, s.cancel.h, 'CANCEL', K, W);
      for (const g of s.ghosts) G.box(Math.round(g.x), Math.round(g.y), s.ok.w, s.ok.h, s.acc === L ? W : s.acc);
      s.fakes.forEach((f) => this.btn({ x: Math.round(f.x), y: Math.round(f.y), w: f.w, h: f.h }, st, true));
      this.btn({ x: Math.round(s.ok.x), y: Math.round(s.ok.y), w: s.ok.w, h: s.ok.h }, st, false);
    },
  };

  // ===== 12 ERASE!: borra los garabatos del dibujo de Paint =====
  const picCache = {};
  function picture(v, w, h) {
    const k = v + '_' + w + 'x' + h; if (picCache[k]) return picCache[k];
    const c = G.mkCanvas(w, h), T = G.ctx(); G.target(c.x);
    try {
      G.rect(0, 0, w, h, W);
      if (v === 0) {
        const sc = Math.max(2, Math.min(4, Math.floor(Math.min(w / 30, h / 28))));
        const sx = Math.round(w - 22 * sc - 4), sy = Math.round(h / 2 - 11 * sc);
        G.drawSpr('skull', sx, sy, { '#': K }, sc); G.drect(sx, sy, 22 * sc, 21 * sc, 6, W, null);
        G.rect(sx + 3 * sc, sy + 7 * sc, 5 * sc, 5 * sc, K); G.rect(sx + 14 * sc, sy + 7 * sc, 5 * sc, 5 * sc, K);
        G.circ(18, 18, 13, W, K); G.drawSpr('smiley', 11, 11, { '#': K }); handles(4, 4, 29, 29, K, W);
        const t = G.fsprite('NO FEAR', 'italic 900 22px ' + G.FONT_HEAVY, K, 120);
        G.ctx().drawImage(t, 6, h - t.height - 8); handles(4, h - t.height - 10, t.width + 6, t.height + 4, K, W);
      } else if (v === 1) {
        G.drect(0, 0, w, h, 3, B, null);
        sprFit('smiley', w / 2, h / 2 - 8, w - 20, h - 40, { '#': K, o: B }, 6);
        G.text('HAPPY.EXE', w / 2, h - 16, K, { s: 2, al: 'c', b: true });
        for (let i = 0; i < 5; i++) G.text('♥', 10 + i * ((w - 20) / 4), 8, Gr === B ? K : Gr, { s: 2 });
      } else {
        G.drect(0, 0, w, h, 4, K, null);
        sprFit('eyelogo', w / 2, h / 2 - 6, w - 30, h - 50, { '#': K }, 9);
        const t = G.fsprite("Don't Fear", '700 26px ' + G.FONT_GOTH, K, 128);
        G.ctx().drawImage(t, Math.round(w / 2 - t.width / 2), h - t.height - 4);
        for (let i = 0; i < 6; i++) G.text('*', G.irand(4, w - 10), G.irand(4, h / 3), B, { s: 2 });
      }
    } finally { G.target(T); }
    return (picCache[k] = c.c);
  }
  M.erase = {
    cmd: 'ERASE!', hint: 'RUB TO ERASE THE MESS', time: 8.5,
    help: ['A VIRUS SCRIBBLED ON', 'THE PICTURE. RUB WITH', 'YOUR FINGER TO ERASE', 'IT BEFORE TIME ENDS.'],
    init(s) {
      const r = s.r;
      const cw0 = r.w - 30, ch0 = Math.min(r.h - 30, Math.round(cw0 * 1.25));
      s.cv = { x: r.x + 26, y: r.y + 12, w: cw0, h: ch0 };
      s.v = G.irand(0, 2);
      const cw = s.cv.w, ch = s.cv.h;
      s.mask = G.mkCanvas(cw, ch);
      s.cell = 4; s.gw = Math.ceil(cw / 4); s.gh = Math.ceil(ch / 4); s.dirty = new Uint8Array(s.gw * s.gh).fill(1); s.clean = 0;
      const T = G.ctx(); G.target(s.mask.x);
      try {
        G.drect(0, 0, cw, ch, 9, L, K);
        const cols = [K, B, Gr, W];
        for (let k = 0; k < 9 + Math.round(s.d * 6); k++) { let x = G.rand(0, cw), y = G.rand(0, ch); const col = G.pick(cols); for (let j = 0; j < 14; j++) { const nx = G.clamp(x + G.rand(-24, 24), 0, cw), ny = G.clamp(y + G.rand(-24, 24), 0, ch); this.stroke(x, y, nx, ny, col, 3); x = nx; y = ny; } }
      } finally { G.target(T); }
      s.bs = Math.round(Math.sqrt(cw * ch) / 7.5 - 6 * s.d); s.need = 0.7 + 0.06 * s.d; s.last = null; s.cur = null;
      s.bot = s.d > 0.35 ? { x: G.rand(0, cw), y: G.rand(0, ch), a: Math.random() * 6, t: 0 } : null;
    },
    stroke(x0, y0, x1, y1, col, th) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.5));
      for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; G.rect(x - th / 2, y - th / 2, th, th, col); }
    },
    rub(s, x, y) {
      const c = s.cv, lx = x - c.x, ly = y - c.y, b = s.bs;
      s.mask.x.clearRect(Math.round(lx - b / 2), Math.round(ly - b / 2), b, b);
      const gx0 = Math.max(0, Math.floor((lx - b / 2) / 4)), gx1 = Math.min(s.gw - 1, Math.floor((lx + b / 2) / 4));
      const gy0 = Math.max(0, Math.floor((ly - b / 2) / 4)), gy1 = Math.min(s.gh - 1, Math.floor((ly + b / 2) / 4));
      for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) { const i = gy * s.gw + gx; if (s.dirty[i]) { s.dirty[i] = 0; s.clean++; } }
    },
    down(s, x, y) { s.last = { x, y }; s.cur = { x, y }; this.rub(s, x, y); },
    move(s, x, y) {
      if (!s.last) return;
      const n = Math.max(1, Math.ceil(Math.hypot(x - s.last.x, y - s.last.y) / 3));
      for (let i = 1; i <= n; i++) this.rub(s, s.last.x + ((x - s.last.x) * i) / n, s.last.y + ((y - s.last.y) * i) / n);
      s.last = { x, y }; s.cur = { x, y };
      if (Math.random() < 0.08) A().sfx('type', 0.6);
      if (s.clean / s.dirty.length >= s.need) s.win();
    },
    up(s) { s.last = null; },
    update(s, dt) {
      const b = s.bot; if (!b) return;
      b.t += dt; b.a += G.rand(-2, 2) * dt * 3;
      const sp = 40 + 60 * s.d, nx = G.clamp(b.x + Math.cos(b.a) * sp * dt, 0, s.cv.w - 1), ny = G.clamp(b.y + Math.sin(b.a) * sp * dt, 0, s.cv.h - 1);
      if (nx <= 0 || nx >= s.cv.w - 1 || ny <= 0 || ny >= s.cv.h - 1) b.a += Math.PI / 2;
      const T = G.ctx(); G.target(s.mask.x); this.stroke(b.x, b.y, nx, ny, K, 3); G.target(T);
      const gx = Math.floor(nx / 4), gy = Math.floor(ny / 4), i = gy * s.gw + gx; if (i >= 0 && i < s.dirty.length && !s.dirty[i]) { s.dirty[i] = 1; s.clean--; }
      b.x = nx; b.y = ny;
    },
    draw(s) {
      const r = s.r, st = s.st, c = s.cv;
      G.rect(r.x, r.y, r.w, 10, st.bd); G.text('FILE EDIT VIEW OPTIONS', r.x + 2, r.y + 2, st.tx); G.rect(r.x, r.y + 10, r.w, 1, st.tx);
      const tools = ['star', 'box', 'erase', 'fill', 'pen', 'mag', 'text', 'line', 'circ', 'spray'];
      tools.forEach((tl, i) => {
        const tx = r.x + 2 + (i % 2) * 11, ty = r.y + 13 + Math.floor(i / 2) * 11, on = tl === 'erase';
        G.rect(tx, ty, 10, 10, on ? st.tx : st.bd); G.box(tx, ty, 10, 10, st.tx); const fc = on ? st.bd : st.tx;
        if (tl === 'erase') { G.rect(tx + 2, ty + 3, 6, 4, fc); } else if (tl === 'box') G.box(tx + 2, ty + 2, 6, 6, fc); else if (tl === 'circ') G.circ(tx + 5, ty + 5, 3, null, fc);
        else if (tl === 'line') G.line(tx + 2, ty + 7, tx + 7, ty + 2, fc); else if (tl === 'text') G.text('A', tx + 3, ty + 2, fc); else if (tl === 'pen') G.line(tx + 2, ty + 8, tx + 7, ty + 3, fc);
        else if (tl === 'fill') { G.rect(tx + 3, ty + 4, 4, 4, fc); G.px(tx + 7, ty + 3, fc); } else if (tl === 'mag') { G.circ(tx + 4, ty + 4, 2, null, fc); G.line(tx + 6, ty + 6, tx + 8, ty + 8, fc); }
        else if (tl === 'star') { G.px(tx + 5, ty + 2, fc); G.rect(tx + 3, ty + 4, 5, 1, fc); G.px(tx + 4, ty + 6, fc); G.px(tx + 6, ty + 6, fc); } else G.drect(tx + 2, ty + 2, 6, 6, 4, fc, null);
      });
      G.ctx().drawImage(picture(s.v, c.w, c.h), c.x, c.y);
      G.ctx().drawImage(s.mask.c, c.x, c.y);
      G.box(c.x - 1, c.y - 1, c.w + 2, c.h + 2, st.tx);
      if (s.bot) { const bx = c.x + s.bot.x, by = c.y + s.bot.y; G.line(bx, by, bx + 5, by - 7, st.tx); G.rect(bx + 4, by - 9, 3, 3, Gr); }
      if (s.cur && s.last) G.box(Math.round(s.cur.x - s.bs / 2), Math.round(s.cur.y - s.bs / 2), s.bs, s.bs, s.acc === Gr ? Gr : st.tx);
      const py = r.y + r.h - 14, pal = [K, W, L, B, Gr];
      pal.forEach((col, i) => { G.rect(r.x + 26 + i * 12, py, 10, 10, col); G.box(r.x + 26 + i * 12, py, 10, 10, st.tx); });
      G.text('CLEAN ' + Math.min(100, Math.floor((100 * s.clean) / s.dirty.length)) + '/' + Math.round(s.need * 100) + '%', r.x + r.w - 4, py + 2, st.tx, { al: 'r' });
    },
  };

  // ======================= MODO MICRO dentro de la escena de juego =======================
  const ACC = [[L, K, K], [B, L, W], [B, Gr, W], [Gr, W, K]]; // [acento, acento2, texto sobre acento] por bloque
  S.initMicro = function () {
    this.mg = G.MICRO[this.cfg.game];
    this.rounds = this.cfg.rounds; this.round = 0; this.lives = 4; this.closed = 0;
    this.mphase = 'idle'; this.ms = null; this.foff = { x: 0, y: 0 };
    this.layoutMicro(1);
  };
  S.layoutMicro = function (round) {
    const ar = area(), mode = this.mg.mode || 'window';
    this.mmode = mode;
    const st = G.WSTYLES[['m1', 'b2', 'g3', 'g4'][this.block]];
    const title = this.L.name.indexOf('.') >= 0 ? this.L.name : this.L.name + '.EXE';
    this.fuseR = { x: ar.x + 3, y: ar.y + 1, w: ar.w - 6, h: 11 };
    if (mode === 'window') {
      this.mwin = { x: 4, y: ar.y + 2, w: G.W - 8, h: ar.h - 2, st, title, stripes: true, xmode: 'x' };
      const b = { x: this.mwin.x + 2, y: this.mwin.y + G.WIN_BAR + 2, w: this.mwin.w - 4, h: this.mwin.h - G.WIN_BAR - 4 };
      this.mbody = b; this.gameR = { x: b.x, y: b.y + 10, w: b.w, h: b.h - 10 };
    } else if (mode === 'float') {
      const sz = this.mg.float(ar.w, ar.h - 16, round || 1, this.rounds);
      const w = Math.min(ar.w - 10, sz.w), h = Math.min(ar.h - 24, sz.h);
      this.mwin = { x: Math.round(G.W / 2 - w / 2), y: Math.round(ar.y + 15 + (ar.h - 15 - h) / 2), w, h, st, title: sz.title || title, stripes: true, xmode: 'x' };
      const b = { x: this.mwin.x + 2, y: this.mwin.y + G.WIN_BAR + 2, w: w - 4, h: h - G.WIN_BAR - 4 };
      this.mbody = b; this.gameR = b;
    } else {
      this.mwin = null; this.mbody = { x: ar.x, y: ar.y + 14, w: ar.w, h: ar.h - 14 }; this.gameR = this.mbody;
    }
  };
  S.startRound = function () {
    this.round++;
    const boss = this.round === this.rounds;
    const d = G.clamp(((this.round - 1) / Math.max(1, this.rounds - 1)) * 0.75 + this.tier * 0.12 + (boss ? 0.15 : 0), 0, 1);
    this.layoutMicro(this.round);
    if (this.round > 1 || !this.wall) this.wall = G.randomWallpaper(this.block);
    const acc = ACC[this.block], gr = this.gameR;
    const s = { r: { x: gr.x, y: gr.y, w: gr.w, h: gr.h }, d, t: 0, boss, block: this.block, round: this.round, rounds: this.rounds, st: this.mwin ? this.mwin.st : G.WSTYLES[['m1', 'b2', 'g3', 'g4'][this.block]], acc: acc[0], acc2: acc[1], accTx: acc[2], done: null, reason: '', hint: this.mg.hint };
    s.win = () => { if (!s.done) s.done = 'win'; };
    s.fail = (why) => { if (!s.done) { s.done = 'lose'; s.reason = why || 'ERROR'; } };
    s.T = (this.mg.time || 0) * (1 - 0.3 * d) * (boss ? 1.25 : 1);
    this.mg.init(s);
    this.ms = s; this.mphase = 'cmd'; this.pt = 0;
    A().sfx('cmd'); G.pulse({ glitch: 0.5, ab: 3 });
    A().intensity(d);
    G.fx.abBase = (this.block === 3 ? 1 : Math.round(d * 0.8)) + (boss ? 1 : 0);
    G.fx.glitchBase = (this.block === 3 ? 0.04 + d * 0.06 : d > 0.55 ? (d - 0.55) * 0.1 : 0) + (boss ? 0.03 : 0);
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
        this.mphase = 'res'; this.pt = 0;
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
      if (this.round >= this.rounds) return this.win();
      this.startRound();
    }
  };
  S.drawFuse = function (r, st, s) {
    const fuse = s ? G.clamp(this.mphase === 'cmd' ? 1 : this.mg.fuse ? this.mg.fuse(s) : s.T > 0 ? 1 - s.t / s.T : 1, 0, 1) : 1;
    G.rect(r.x, r.y, r.w, r.h, st.bd); G.box(r.x, r.y, r.w, r.h, st.tx);
    const fw = Math.round((r.w - 6) * fuse), hot = fuse < 0.3 && Math.floor(G.time * 8) % 2;
    for (let i = 0; i < fw; i += 4) G.rect(r.x + 3 + i, r.y + 2, Math.min(3, fw - i), r.h - 4, hot && s ? (s.acc === L ? st.tx : s.acc) : st.tx);
  };
  S.drawMicro = function (g) {
    g.drawImage(this.wall, 0, 0);
    if (this.block === 3 && Math.random() < 0.08) { const y = G.irand(0, G.H - 10), h = G.irand(2, 8); g.drawImage(this.wall, 0, y, G.W, h, G.irand(-12, 12), y, G.W, h); }
    const s = this.ms, T = G.ctx();
    const stD = G.WSTYLES[['m1', 'b2', 'g3', 'g4'][this.block]];
    this.foff = this.mmode === 'float' ? { x: Math.round(G.tilt.x * (this.mg.tilt || 0)), y: Math.round(G.tilt.y * (this.mg.tilt || 0)) } : { x: 0, y: 0 };
    if (this.state !== 'intro') {
      if (this.mmode === 'desk') {
        this.drawFuse(this.fuseR, stD, s);
        if (s) { T.save(); T.beginPath(); T.rect(s.r.x, s.r.y, s.r.w, s.r.h); T.clip(); this.mg.draw(s); T.restore(); }
      } else {
        T.save(); T.translate(this.foff.x, this.foff.y);
        const w = this.mwin; w.title = (this.mmode === 'float' && s && s.title) ? s.title : w.title;
        const r0 = G.drawFrame(w);
        if (this.mmode === 'window') this.drawFuse({ x: r0.x + 2, y: r0.y + 1, w: r0.w - 4, h: 8 }, w.st, s);
        if (s) { T.save(); T.beginPath(); T.rect(s.r.x, s.r.y, s.r.w, s.r.h); T.clip(); this.mg.draw(s); T.restore(); }
        T.restore();
        if (this.mmode === 'float') this.drawFuse(this.fuseR, stD, s);
      }
      if (s && this.mphase === 'cmd') this.drawCmd(s);
      if (s && this.mphase === 'res') this.drawRes(s);
    }
    const info = { label: '♥'.repeat(Math.max(0, this.lives)) + '  ' + Math.min(this.round, this.rounds) + '/' + this.rounds, startDown: this.startDown > 0 };
    G.drawTaskbar(this.block, info);
    if (this.state === 'intro') { this.dim(); this.drawIntro(); }
    if (this.state === 'paused') { this.dim(); this.drawPause(); }
    if (this.state === 'clear') this.drawClear();
  };
  // orden grande estilo ventana de error
  S.drawCmd = function (s) {
    const b = this.mbody, k = Math.max(0, 0.18 - this.pt) * 5;
    G.drect(b.x, b.y, b.w, b.h, 6, K, null);
    const fs = Math.max(18, Math.floor(G.W / 6.5));
    const spr = G.fsprite(this.mg.cmd, 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, W, 120);
    const sc = 1 + k, ww = Math.round(spr.width * sc), hh = Math.round(spr.height * sc);
    const ar = area(), cy = Math.round(ar.y + ar.h * 0.42);
    const bw = Math.min(G.W - 16, Math.max(ww + 24, 150)), bh = hh + 40;
    const bx = Math.round(G.W / 2 - bw / 2), by = Math.round(cy - bh / 2);
    G.rect(bx + 3, by + 3, bw, bh, K);
    G.rect(bx, by, bw, bh, s.acc === L ? K : s.acc); G.box(bx, by, bw, bh, W);
    G.rect(bx + 1, by + 1, bw - 2, 10, W); G.text(s.boss ? 'BOSS.EXE' : 'ROUND ' + this.round, bx + 4, by + 2, K);
    const T = G.ctx();
    if (Math.floor(this.pt * 20) % 7 === 0) T.drawImage(G.fsprite(this.mg.cmd, 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, s.acc2 === K ? L : s.acc2, 120), Math.round(bx + bw / 2 - ww / 2) - 3, by + 14, ww, hh);
    T.drawImage(spr, Math.round(bx + bw / 2 - ww / 2), by + 14, ww, hh);
    G.wrap(s.hint, bw - 12).forEach((ln, i) => G.text(ln, bx + bw / 2, by + hh + 18 + i * 9, W, { al: 'c' }));
    if (s.boss && Math.floor(this.pt * 6) % 2 === 0) G.text('!! BOSS ROUND !!', G.W / 2, by - 12, W, { al: 'c', b: true });
  };
  S.drawRes = function (s) {
    const ar = area();
    if (s.done === 'win') {
      const fs = Math.max(22, Math.floor(G.W / 5));
      const spr = G.fsprite('OK!', 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, W, 120);
      const x = Math.round(G.W / 2 - spr.width / 2), y = Math.round(ar.y + ar.h * 0.4 - spr.height / 2);
      G.rect(x - 10, y - 6, spr.width + 20, spr.height + 12, s.acc === L ? K : s.acc); G.box(x - 10, y - 6, spr.width + 20, spr.height + 12, W);
      G.ctx().drawImage(spr, x, y);
    } else {
      const w = { x: Math.round(G.W / 2 - 70), y: Math.round(ar.y + ar.h * 0.4 - 30), w: 140, h: 62, st: G.WSTYLES.m1, title: 'ERROR', stripes: true, xmode: 'x' };
      const r = G.drawFrame(w);
      G.drawSpr('xcirc', r.x + 6, r.y + 6, { '#': K });
      G.text(s.reason, r.x + 21, r.y + 6, K);
      G.text('-1 ♥  ' + Math.max(0, this.lives) + ' LEFT', r.x + 21, r.y + 17, K);
      G.drawBtn(w.x + 50, w.y + w.h - 18, 40, 13, 'OK', K, W);
    }
  };
  S.tapMicro = function (x, y) {
    if (this.mphase !== 'play' || !this.ms || this.ms.done) return;
    x -= this.foff.x; y -= this.foff.y;
    const s = this.ms;
    if (this.mg.down) this.mg.down(s, x, y);
    if (this.mg.tap) this.mg.tap(s, x, y);
  };
  S.move = function (x, y) {
    if (this.cfg.mode !== 'micro' || this.state !== 'play' || this.mphase !== 'play' || !this.ms || this.ms.done) return;
    if (this.mg.move) this.mg.move(this.ms, x - this.foff.x, y - this.foff.y);
  };
  S.up = function (x, y) {
    if (this.cfg.mode !== 'micro' || this.state !== 'play' || this.mphase !== 'play' || !this.ms || this.ms.done) return;
    if (this.mg.up) this.mg.up(this.ms, x - this.foff.x, y - this.foff.y);
  };
})(window.G);
