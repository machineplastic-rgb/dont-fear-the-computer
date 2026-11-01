'use strict';
// Arte de escritorio: iconos 16x16 detallados, "fotos" de captcha, mini-ventanas animadas y el virus BUG.EXE.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;

  // ---------- iconos 16x16 (estilo 1-bit clásico, dibujo propio) ----------
  Object.assign(G.ART, {
    i_doc: [
      '.##########.....', '.#wwwwwwww##....', '.#wwwwwwww#w#...', '.#wwwwwwww#ww#..', '.#wwwwwwww#####.', '.#wwwwwwwwwwww#.',
      '.#w#########ww#.', '.#wwwwwwwwwwww#.', '.#w##########w#.', '.#wwwwwwwwwwww#.', '.#w#######wwww#.', '.#wwwwwwwwwwww#.',
      '.#w#########ww#.', '.#wwwwwwwwwwww#.', '.#wwwwwwwwwwww#.', '.##############.'],
    i_floppy: [
      '#############...', '#ww#aaaaa#ww##..', '#ww#aa#aa#ww#w#.', '#ww#aa#aa#ww###.', '#ww#aaaaa#wwww#.', '#ww#######wwww#.',
      '#wwwwwwwwwwwww#.', '#ww#########ww#.', '#w#wwwwwwwww#w#.', '#w#w#####www#w#.', '#w#wwwwwwwww#w#.', '#w#w#####www#w#.',
      '#w#wwwwwwwww#w#.', '#w#wwwwwwwww#w#.', '#w###########w#.', '###############.'],
    i_clip: [
      '.....######.....', '..####wwww####..', '..#ww######ww#..', '..#wwwwwwwwww#..', '..#w########w#..', '..#wwwwwwwwww#..',
      '..#w######www#..', '..#wwwwwwwwww#..', '..#w########w#..', '..#wwwwwwwwww#..', '..#w#####wwww#..', '..#wwwwwwwwww#..',
      '..#w########w#..', '..#wwwwwwwwww#..', '..#wwwwwwwwww#..', '..############..'],
    i_keys: [
      '................', '................', '................', '................', '################', '#ww#ww#ww#ww#ww#',
      '################', '#w#ww#ww#ww#ww##', '################', '#ww#wwwwwwww#ww#', '################', '................',
      '................', '................', '................', '................'],
    i_sound: [
      '................', '.......#........', '......##....#...', '.....#w#.....#..', '....#ww#..#...#.', '#####ww#...#..#.',
      '#www#ww#...#..#.', '#www#ww#....#.#.', '#www#ww#....#.#.', '#www#ww#...#..#.', '#####ww#...#..#.', '....#ww#..#...#.',
      '.....#w#.....#..', '......##....#...', '.......#........', '................'],
    bug: [
      '..#.......#..', '...#.....#...', '....#####....', '...#ggggg#...', '#..#g#g#g#..#', '.#.#ggggg#.#.',
      '..##ggggg##..', '.#.#ggggg#.#.', '#..#ggggg#..#', '....#ggg#....', '.....###.....'],
    bug2: [
      '..#.......#..', '...#.....#...', '....#####....', '...#ggggg#...', '.#.#g#g#g#.#.', '#..#ggggg#..#',
      '..##ggggg##..', '#..#ggggg#..#', '.#.#ggggg#.#.', '....#ggg#....', '.....###.....'],
    splat: [
      '.#...#...#...', '..#.###.#..#.', '...#####.....', '.#########...', '..#######.##.', '#.#######....',
      '..#######.#..', '.#########...', '...#####.#...', '..#.#.#..#...', '.#...#....#..'],
  });
  const ICON_DRAW = {
    doc: (f, b, a) => G.drawSpr('i_doc', 0, 0, { '#': f, w: b }),
    floppy: (f, b, a) => G.drawSpr('i_floppy', 0, 0, { '#': f, w: b, a: a }),
    clip: (f, b, a) => { G.drawSpr('i_clip', 0, 0, { '#': f, w: b }); G.rect(6, 1, 4, 2, a); },
    keys: (f, b, a) => { G.drawSpr('i_keys', 0, 0, { '#': f, w: b }); G.rect(4, 9, 8, 1, a); },
    sound: (f, b, a) => G.drawSpr('i_sound', 0, 0, { '#': f, w: b }),
    globe: (f, b, a) => { G.circ(8, 8, 7, b, f); G.ell(8, 8, 3, 7, null, f); G.rect(2, 5, 12, 1, f); G.rect(1, 8, 14, 1, f); G.rect(2, 11, 12, 1, f); G.rect(4, 3, 3, 2, a); G.rect(9, 9, 3, 2, a); G.rect(5, 12, 2, 1, a); },
    sun: (f, b, a) => { for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2; G.line(8 + Math.cos(an) * 5, 8 + Math.sin(an) * 5, 8 + Math.cos(an) * 7, 8 + Math.sin(an) * 7, f); } G.circ(8, 8, 3, a, f); },
    mouse: (f, b, a) => { G.rect(4, 4, 8, 11, b); G.box(4, 4, 8, 11, f); G.rect(5, 8, 6, 1, f); G.rect(8, 4, 1, 4, f); G.rect(5, 5, 3, 3, a); G.line(8, 0, 8, 3, f); G.px(9, 0, f); },
    palette: (f, b, a) => { G.ell(8, 9, 7, 5, b, f); G.circ(5, 12, 1, f, f); G.rect(4, 6, 2, 2, a); G.rect(7, 5, 2, 2, f); G.rect(10, 6, 2, 2, a); G.drect(11, 9, 2, 2, 8, f, null); },
    note: (f, b, a) => { G.rect(2, 1, 11, 14, b); G.box(2, 1, 11, 14, f); G.circ(6, 11, 2, f, f); G.rect(8, 4, 1, 7, f); G.rect(8, 4, 3, 1, f); G.rect(10, 5, 1, 2, f); G.rect(4, 3, 3, 1, a); },
    calc: (f, b, a) => { G.rect(3, 1, 10, 14, b); G.box(3, 1, 10, 14, f); G.rect(5, 3, 6, 3, a); for (let i = 0; i < 9; i++) G.rect(5 + (i % 3) * 2, 8 + Math.floor(i / 3) * 2, 1, 1, f); },
    mail: (f, b, a) => { G.rect(1, 4, 14, 9, b); G.box(1, 4, 14, 9, f); G.line(1, 4, 8, 9, f); G.line(14, 4, 8, 9, f); G.rect(11, 6, 2, 2, a); },
    camera: (f, b, a) => { G.rect(1, 5, 14, 9, b); G.box(1, 5, 14, 9, f); G.rect(4, 3, 4, 2, f); G.circ(8, 9, 3, a, f); G.px(12, 7, f); },
    disk: (f, b, a) => { G.rect(1, 5, 14, 8, b); G.box(1, 5, 14, 8, f); G.rect(3, 8, 7, 1, f); G.rect(3, 10, 7, 1, f); G.rect(11, 9, 2, 2, a); },
    system: (f, b, a) => G.drawSpr('computer', 1, 1, { '#': f, w: b, b: a }),
  };
  G.ICON_LABEL = { doc: 'TEXT', floppy: 'BACKUP', clip: 'CLIP', keys: 'KEYS', sound: 'SOUND', globe: 'MAP', sun: 'LIGHT', mouse: 'MOUSE', palette: 'COLOR', note: 'MUSIC', calc: 'CALC', mail: 'MAIL', camera: 'PHOTO', disk: 'HD', system: 'SYSTEM' };
  G.TRASH_ICONS = ['doc', 'floppy', 'clip', 'keys', 'sound', 'globe', 'sun', 'mouse', 'palette', 'note', 'calc', 'mail', 'camera'];
  const icCache = {};
  G.icon16 = function (name, f, b, a) {
    const k = name + f + b + a; if (icCache[k]) return icCache[k];
    const c = G.mkCanvas(16, 16), T = G.ctx(); G.target(c.x);
    try { ICON_DRAW[name](f, b, a); } finally { G.target(T); }
    return (icCache[k] = c.c);
  };
  G.drawIcon16 = (name, x, y, sc, f, b, a) => G.ctx().drawImage(G.icon16(name, f, b, a), Math.round(x), Math.round(y), 16 * sc, 16 * sc);

  // ---------- "fotos" del captcha (24x24, con trama de foto antigua) ----------
  G.CAPTCHA_SET = [['light', 'TRAFFIC LIGHTS'], ['bus', 'BUSES'], ['bike', 'BICYCLES'], ['cross', 'CROSSWALKS'], ['hydrant', 'HYDRANTS'], ['car', 'CARS'], ['skull', 'SKULLS']];
  function photoBg(v) {
    const sky = v % 2 ? B : L;
    for (let y = 0; y < 24; y++) G.drect(0, y, 24, 1, Math.round(16 - (y / 24) * 12), sky, W);
    G.drect(0, 17, 24, 7, 6 + (v % 3) * 3, K, L);
  }
  const PIC = {
    light: (v) => { photoBg(v); G.rect(11, 12, 2, 12, K); G.rect(8, 1, 8, 13, K); const on = v % 3; [3, 7, 11].forEach((y, i) => G.circ(12, y + 0, 1, i === on ? Gr : L, i === on ? Gr : L)); G.rect(7, 2, 1, 3, K); G.rect(16, 2, 1, 3, K); },
    bus: (v) => { photoBg(v); G.rect(1, 8, 22, 10, B); G.box(1, 8, 22, 10, K); for (let x = 3; x < 19; x += 4) G.rect(x, 10, 3, 3, W); G.rect(19, 10, 3, 5, W); G.rect(1, 14, 22, 1, W); G.circ(6, 18, 2, K, K); G.circ(17, 18, 2, K, K); G.px(6, 18, L); G.px(17, 18, L); },
    bike: (v) => { photoBg(v); G.circ(6, 16, 4, null, K); G.circ(18, 16, 4, null, K); G.line(6, 16, 11, 10, K); G.line(11, 10, 18, 16, K); G.line(11, 10, 13, 16, K); G.line(13, 16, 6, 16, K); G.rect(9, 8, 4, 1, K); G.line(16, 8, 18, 16, K); G.rect(15, 7, 4, 1, K); G.px(6, 16, Gr); G.px(18, 16, Gr); },
    cross: (v) => { for (let y = 0; y < 24; y++) G.drect(0, y, 24, 1, 12 - Math.floor(y / 3), K, L); for (let i = 0; i < 5; i++) { const y = 8 + i * 3, w0 = 6 + i * 3; G.rect(12 - w0 / 2, y, w0, 2, W); } G.rect(0, 6, 24, 1, Gr); },
    hydrant: (v) => { photoBg(v); G.ell(12, 6, 4, 2, Gr, K); G.rect(8, 7, 9, 13, Gr); G.box(8, 7, 9, 13, K); G.rect(5, 10, 3, 3, Gr); G.box(5, 10, 3, 3, K); G.rect(17, 10, 3, 3, Gr); G.box(17, 10, 3, 3, K); G.rect(7, 19, 11, 2, K); G.rect(10, 3, 5, 1, K); G.px(12, 13, K); },
    car: (v) => { photoBg(v); G.rect(2, 12, 20, 6, v % 2 ? W : Gr); G.box(2, 12, 20, 6, K); G.rect(6, 8, 11, 5, v % 2 ? W : Gr); G.box(6, 8, 11, 5, K); G.rect(8, 9, 3, 3, B); G.rect(12, 9, 3, 3, B); G.circ(7, 18, 2, K, K); G.circ(17, 18, 2, K, K); G.rect(20, 14, 2, 1, L); },
    skull: (v) => { G.drect(0, 0, 24, 24, 4 + (v % 3) * 2, K, W); G.drawSpr('skull', 1, 2, { '#': v % 2 ? W : L }); G.rect(5, 9, 4, 3, K); G.rect(15, 9, 4, 3, K); G.drect(3, 3, 6, 4, 8, K, null); },
  };
  const picCache = {};
  G.captchaPic = function (name, v) {
    const k = name + v; if (picCache[k]) return picCache[k];
    const c = G.mkCanvas(24, 24), T = G.ctx(); G.target(c.x);
    try { PIC[name](v); } finally { G.target(T); }
    return (picCache[k] = c.c);
  };

  // ---------- mini-ventanas con contenido animado ----------
  G.MINI_KINDS = ['player', 'clock', 'img', 'notes', 'chart', 'puzzle', 'eye', 'copy'];
  const TITLES = { player: 'PLAYER', clock: 'CLOCK', img: 'IMG_013', notes: 'NOTES', chart: 'CPU.SYS', puzzle: 'PUZZLE', eye: 'WATCHER', copy: 'COPYING' };
  G.miniWin = function (x, y, w, h, kind, t, st, seed) {
    x = Math.round(x); y = Math.round(y);
    const s = st || G.WSTYLES.m1, bar = 9;
    G.drect(x + 2, y + 2, w, h, 8, s.sh || K, null);
    G.rect(x, y, w, h, s.fr); G.rect(x + 1, y + bar + 1, w - 2, h - bar - 2, s.bd);
    G.rect(x + 1, y + 1, w - 2, bar - 1, s.bar);
    G.text(TITLES[kind] || 'WINDOW', x + 3, y + 1, s.bt);
    G.box(x + w - 9, y + 1, 7, 7, s.bt);
    const bx = x + 2, by = y + bar + 2, bw = w - 4, bh = h - bar - 4, fg = s.tx, ac = s.ac === s.tx ? (s.bd === W ? B : W) : s.ac;
    const T = G.ctx(); T.save(); T.beginPath(); T.rect(bx, by, bw, bh); T.clip();
    const ph = (seed || 0) * 1.7;
    switch (kind) {
      case 'player': {
        const cy = by + 3;
        G.tri(bx + 4, cy + 3, bx + 8, cy, bx + 8, cy + 6, fg); G.tri(bx + 8, cy + 3, bx + 12, cy, bx + 12, cy + 6, fg);
        G.tri(bx + bw / 2 - 3, cy, bx + bw / 2 + 4, cy + 3, bx + bw / 2 - 3, cy + 6, fg);
        G.tri(bx + bw - 12, cy, bx + bw - 8, cy + 3, bx + bw - 12, cy + 6, fg); G.tri(bx + bw - 8, cy, bx + bw - 4, cy + 3, bx + bw - 8, cy + 6, fg);
        const msg = 'VOID FM - DON\'T FEAR - ', off = Math.floor((t * 18 + ph * 10) % (msg.length * 6));
        if (bh > 18) G.text(msg + msg, bx + 2 - off, by + 12, fg);
        const pw = bw - 8, p = ((t * 0.12 + ph) % 1);
        G.rect(bx + 4, by + bh - 5, pw, 1, fg); G.rect(bx + 4 + Math.floor(pw * p) - 1, by + bh - 7, 3, 5, ac === W ? fg : ac);
        break; }
      case 'clock': {
        const s2 = Math.floor(t + ph * 100), hh = String(Math.floor(s2 / 3600 + 4) % 24).padStart(2, '0'), mm = String(Math.floor(s2 / 60) % 60).padStart(2, '0'), ss = String(s2 % 60).padStart(2, '0');
        const str = hh + ':' + mm + ':' + ss, sc = bw >= 100 ? 2 : 1;
        G.text(str, bx + bw / 2, by + bh / 2 - 3.5 * sc, fg, { s: sc, al: 'c' });
        break; }
      case 'img': {
        G.drect(bx, by, bw, bh, 5, fg, null);
        const blink = (t + ph) % 2.4 > 2.2;
        const sx = Math.round(bx + bw / 2 - 7), sy = Math.round(by + bh / 2 - 7);
        G.circ(sx + 7, sy + 7, 7, s.bd, null);
        G.drawSpr('smiley', sx, sy, { '#': fg, o: null });
        if (blink) { G.rect(sx + 5, sy + 4, 1, 3, s.bd); G.rect(sx + 9, sy + 4, 1, 3, s.bd); G.rect(sx + 4, sy + 5, 7, 1, fg); }
        break; }
      case 'notes': {
        ['REMEMBER:', "DON'T FEAR", 'THE SCREEN.', 'BREATHE.'].forEach((ln, i) => { if (by + 2 + i * 9 < by + bh - 6) G.text(ln, bx + 2, by + 2 + i * 9, fg); });
        if (Math.floor(t * 2) % 2) G.rect(bx + 2 + G.textW('BREATHE.') + 1, by + 29, 4, 7, fg);
        break; }
      case 'chart': {
        const n = Math.max(3, Math.floor(bw / 7));
        for (let i = 0; i < n; i++) { const hgt = Math.round((0.35 + 0.6 * Math.abs(Math.sin(t * 2 + i * 0.9 + ph))) * (bh - 4)); G.rect(bx + 2 + i * 7, by + bh - 2 - hgt, 5, hgt, i % 2 ? fg : (ac === W ? fg : ac)); }
        break; }
      case 'puzzle': {
        const cs = Math.max(6, Math.floor(Math.min(bw, bh) / 3) - 1), ox = Math.round(bx + bw / 2 - cs * 1.5), oy = Math.round(by + bh / 2 - cs * 1.5);
        const empty = Math.floor(t * 1.5 + ph * 3) % 9;
        for (let i = 0; i < 9; i++) { if (i === empty) continue; const cx = ox + (i % 3) * cs, cy = oy + Math.floor(i / 3) * cs; G.box(cx, cy, cs - 1, cs - 1, fg); if (cs >= 9) G.text(String(((i * 4 + 3) % 9) + 1), cx + cs / 2 - 3, cy + cs / 2 - 4, fg); }
        break; }
      case 'eye': {
        const cx = bx + bw / 2, cy = by + bh / 2, rx = Math.min(bw / 2 - 3, 18), ry = Math.min(bh / 2 - 2, 9);
        G.ell(cx, cy, rx, ry, s.bd, fg);
        const lx = Math.round(Math.sin(t * 1.4 + ph) * (rx - 5));
        G.circ(cx + lx, cy, Math.min(4, ry - 1), ac === W ? fg : ac, fg); G.px(cx + lx, cy, fg);
        break; }
      case 'copy': {
        G.text('FILE.EXE', bx + 2, by + 2, fg);
        const pw = bw - 6, p = (t * 0.25 + ph) % 1, f = Math.floor((pw - 4) * p);
        G.box(bx + 2, by + 12, pw, 7, fg); for (let i = 0; i < f; i += 3) G.rect(bx + 4 + i, by + 14, 2, 3, fg);
        break; }
    }
    T.restore();
  };
})(window.G);
