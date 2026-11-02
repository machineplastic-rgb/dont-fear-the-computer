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

  // ---------- iconos 20x20 detallados (volumen, brillo y sombra; colores según el bloque) ----------
  G.iconPal = function (block) {
    if (block <= 0) return { k: K, w: W, l: L, b: K, g: L, s: L };
    if (block === 1) return { k: K, w: W, l: L, b: B, g: L, s: B };
    return { k: K, w: W, l: L, b: B, g: Gr, s: B };
  };
  function dsh(x, y, w, h, c) { G.rect(x + 2, y + h, w - 1, 1, c.b); G.rect(x + w, y + 2, 1, h - 1, c.b); }
  function bev(x, y, w, h, fill, c) { G.rect(x, y, w, h, fill); G.box(x, y, w, h, c.k); G.rect(x + 1, y + 1, w - 2, 1, c.w); G.rect(x + 1, y + 1, 1, h - 2, c.w); }
  function page(c, x, y, w, h) { dsh(x, y, w, h, c); G.rect(x, y, w, h, c.w); G.box(x, y, w, h, c.k); G.rect(x + w - 4, y, 4, 4, c.l); G.line(x + w - 4, y, x + w - 4, y + 3, c.k); G.line(x + w - 4, y + 3, x + w - 1, y + 3, c.k); }
  const I20 = {
    folder(c) { dsh(1, 5, 18, 12, c); G.rect(2, 3, 7, 3, c.l); G.box(2, 3, 7, 3, c.k); bev(1, 5, 18, 12, c.l, c); G.drect(3, 11, 15, 5, 8, c.w, null); G.rect(1, 8, 18, 1, c.k); G.rect(2, 9, 16, 1, c.w); },
    doc(c) { page(c, 3, 1, 14, 17); [6, 8, 10, 12, 14].forEach((y, i) => G.rect(5, y, i === 4 ? 6 : 9, 1, c.s)); },
    notepad(c) { dsh(3, 3, 14, 15, c); G.rect(3, 3, 14, 15, c.w); G.box(3, 3, 14, 15, c.k); G.rect(4, 4, 12, 2, c.s); for (let x = 5; x < 16; x += 3) G.rect(x, 1, 1, 4, c.k); [8, 10, 12, 14].forEach((y) => G.rect(5, y, 10, 1, c.l)); },
    cd(c) { G.circ(11, 11, 8, c.b, null); G.circ(10, 10, 8, c.l, c.k); G.ell(10, 10, 6, 6, null, c.w); G.tri(10, 10, 17, 5, 17, 10, c.g); G.tri(10, 10, 3, 15, 6, 17, c.s); G.circ(10, 10, 2, c.w, c.k); },
    floppy(c) { dsh(3, 3, 14, 14, c); bev(3, 3, 14, 14, c.s, c); G.rect(6, 3, 8, 5, c.l); G.box(6, 3, 8, 5, c.k); G.rect(11, 4, 2, 3, c.k); G.rect(5, 10, 10, 6, c.w); G.box(5, 10, 10, 6, c.k); G.rect(6, 12, 8, 1, c.l); G.rect(6, 14, 6, 1, c.l); },
    calc(c) { dsh(4, 2, 12, 16, c); bev(4, 2, 12, 16, c.l, c); G.rect(6, 4, 8, 3, c.g === L ? c.w : c.g); G.box(6, 4, 8, 3, c.k); for (let i = 0; i < 12; i++) G.rect(6 + (i % 3) * 3, 9 + Math.floor(i / 3) * 2, 2, 1, i % 3 === 2 ? c.s : c.k); },
    phone(c) { dsh(3, 9, 14, 8, c); bev(3, 9, 14, 8, c.l, c); G.rect(2, 6, 16, 3, c.w); G.box(2, 6, 16, 3, c.k); G.rect(2, 6, 4, 5, c.w); G.box(2, 6, 4, 5, c.k); G.rect(14, 6, 4, 5, c.w); G.box(14, 6, 4, 5, c.k); for (let i = 0; i < 9; i++) G.rect(7 + (i % 3) * 2, 11 + Math.floor(i / 3) * 2, 1, 1, c.k); G.rect(13, 12, 2, 3, c.s); },
    clock(c) { dsh(2, 2, 16, 16, c); bev(2, 2, 16, 16, c.s, c); G.circ(10, 10, 6, c.w, c.k); for (const [x, y] of [[10, 5], [15, 10], [10, 15], [5, 10]]) G.px(x, y, c.k); G.line(10, 10, 10, 6, c.k); G.line(10, 10, 13, 12, c.k); G.px(10, 10, c.g === L ? c.k : c.g); },
    camera(c) { dsh(2, 6, 16, 11, c); bev(2, 6, 16, 11, c.l, c); G.rect(5, 4, 5, 2, c.k); G.circ(10, 11, 4, c.s, c.k); G.circ(10, 11, 2, c.b, null); G.px(9, 10, c.w); G.rect(14, 8, 2, 2, c.w); G.box(14, 8, 2, 2, c.k); },
    music(c) { page(c, 3, 1, 14, 17); G.circ(8, 13, 2, c.k, c.k); G.rect(10, 6, 1, 8, c.k); G.rect(10, 6, 4, 1, c.k); G.rect(13, 7, 1, 2, c.k); G.px(7, 12, c.w); },
    globe(c) { G.circ(11, 11, 8, c.b, null); G.circ(10, 10, 8, c.s, c.k); const cg = c.g === L ? c.w : c.g; G.rect(6, 5, 4, 3, cg); G.rect(5, 8, 3, 3, cg); G.rect(11, 10, 4, 4, cg); G.rect(12, 6, 2, 2, cg); G.px(5, 6, c.w); G.px(6, 5, c.w); },
    search(c) { page(c, 2, 1, 13, 16); [6, 8, 10].forEach((y) => G.rect(4, y, 7, 1, c.l)); G.circ(12, 12, 4, c.g === L ? c.l : c.g, c.k); G.px(11, 11, c.w); G.px(10, 12, c.w); G.line(15, 15, 18, 18, c.k); G.line(16, 15, 18, 17, c.k); },
    briefcase(c) { dsh(2, 6, 16, 11, c); bev(2, 6, 16, 11, c.s, c); G.box(7, 3, 6, 4, c.k); G.rect(3, 11, 14, 1, c.k); G.rect(9, 10, 2, 3, c.w); G.box(9, 10, 2, 3, c.k); },
    keys(c) { const kc = c.g === L ? c.l : c.g; G.circ(5, 6, 3, kc, c.k); G.circ(5, 6, 1, c.w, null); G.rect(8, 5, 9, 3, kc); G.box(8, 5, 9, 3, c.k); G.rect(13, 8, 1, 2, c.k); G.rect(15, 8, 1, 2, c.k); G.circ(6, 13, 3, c.l, c.k); G.circ(6, 13, 1, c.w, null); G.rect(9, 12, 8, 3, c.l); G.box(9, 12, 8, 3, c.k); G.rect(14, 15, 1, 2, c.k); },
    palette(c) { G.ell(11, 12, 8, 6, c.b, null); G.ell(10, 11, 8, 6, c.w, c.k); G.circ(7, 14, 1, c.k, c.k); G.rect(5, 8, 2, 2, c.s); G.rect(9, 7, 2, 2, c.g === L ? c.l : c.g); G.rect(13, 9, 2, 2, c.k); G.rect(12, 13, 2, 2, c.l); G.line(13, 16, 18, 3, c.k); G.rect(17, 2, 2, 2, c.s); },
    picture(c) { dsh(2, 3, 16, 14, c); G.rect(2, 3, 16, 14, c.k); G.rect(3, 4, 14, 12, c.w); G.rect(4, 5, 12, 6, c.s); G.tri(4, 15, 10, 8, 16, 15, c.g === L ? c.l : c.g); G.circ(13, 7, 1, c.w, null); G.rect(4, 14, 12, 1, c.l); },
    megaphone(c) { G.tri(5, 7, 14, 2, 14, 18, c.l); G.line(5, 7, 14, 2, c.k); G.line(5, 13, 14, 18, c.k); G.rect(14, 2, 1, 17, c.k); G.rect(2, 7, 4, 7, c.w); G.box(2, 7, 4, 7, c.k); G.line(16, 6, 18, 4, c.k); G.rect(16, 10, 3, 1, c.k); G.line(16, 14, 18, 16, c.k); G.rect(8, 8, 4, 4, c.s); },
    calendar(c) { dsh(3, 3, 14, 15, c); bev(3, 3, 14, 15, c.w, c); G.rect(4, 4, 12, 3, c.s); G.rect(6, 1, 1, 4, c.k); G.rect(13, 1, 1, 4, c.k); G.text('12', 5, 9, c.k); },
    printer(c) { G.rect(5, 2, 10, 7, c.w); G.box(5, 2, 10, 7, c.k); G.rect(6, 4, 7, 1, c.l); dsh(2, 8, 16, 8, c); bev(2, 8, 16, 8, c.l, c); G.rect(5, 14, 10, 5, c.w); G.box(5, 14, 10, 5, c.k); G.rect(6, 16, 6, 1, c.s); G.px(15, 10, c.g === L ? c.k : c.g); },
    book(c) { G.rect(2, 6, 17, 11, c.b); G.rect(1, 5, 9, 11, c.w); G.rect(10, 5, 9, 11, c.w); G.box(1, 5, 18, 11, c.k); G.rect(10, 5, 1, 11, c.k); [7, 9, 11, 13].forEach((y) => { G.rect(3, y, 5, 1, c.l); G.rect(12, y, 5, 1, c.l); }); G.rect(17, 7, 1, 3, c.g === L ? c.k : c.g); },
    system(c) { dsh(3, 2, 14, 11, c); bev(3, 2, 14, 11, c.l, c); G.rect(5, 4, 10, 7, c.b === K ? c.k : c.b); G.px(6, 5, c.w); G.rect(7, 6, 6, 1, c.w); G.rect(8, 13, 4, 2, c.k); bev(2, 15, 16, 4, c.l, c); for (let x = 4; x < 16; x += 2) G.px(x, 17, c.k); },
    harddisk(c) { dsh(2, 6, 16, 9, c); bev(2, 6, 16, 9, c.l, c); G.drect(3, 7, 14, 2, 8, c.w, null); G.rect(4, 11, 7, 1, c.k); G.rect(4, 13, 7, 1, c.k); G.rect(13, 11, 3, 2, c.g === L ? c.w : c.g); G.box(13, 11, 3, 2, c.k); },
  };
  G.ICON20_TRASH = ['folder', 'doc', 'notepad', 'cd', 'floppy', 'calc', 'phone', 'clock', 'camera', 'music', 'globe', 'search', 'briefcase', 'keys', 'palette', 'picture', 'megaphone', 'calendar', 'printer', 'book'];
  G.ICON20_LABEL = { folder: 'STUFF', doc: 'README', notepad: 'NOTES', cd: 'CD-ROM', floppy: 'BACKUP', calc: 'CALC', phone: 'DIALER', clock: 'CLOCK', camera: 'PHOTOS', music: 'SONG', globe: 'WEB', search: 'FIND', briefcase: 'WORK', keys: 'KEYS', palette: 'PAINT', picture: 'IMG_01', megaphone: 'ADS', calendar: 'AGENDA', printer: 'PRINT', book: 'MANUAL', system: 'SYSTEM', harddisk: 'HD' };
  const i20Cache = {};
  G.icon20 = function (name, block) {
    const k = name + '_' + block; if (i20Cache[k]) return i20Cache[k];
    const cv = G.mkCanvas(20, 20), T = G.ctx(); G.target(cv.x);
    try { I20[name](G.iconPal(block)); } finally { G.target(T); }
    return (i20Cache[k] = cv.c);
  };
  // papelera de reciclaje 32x32 (vacía o con papeles)
  const recCache = {};
  G.drawRecycle = function (x, y, sc, block, full, open) {
    const key = block + '_' + Math.min(full, 6) + '_' + (open ? 1 : 0);
    if (recCache[key]) { G.ctx().drawImage(recCache[key], Math.round(x), Math.round(y), 32 * sc, 34 * sc); return; }
    const c = G.iconPal(block), cv = G.mkCanvas(32, 34), T = G.ctx(); G.target(cv.x);
    recCache[key] = cv.c;
    try {
      const body = c.b === K ? c.l : c.b;
      for (let yy = 8; yy < 32; yy++) { const hw = Math.round(13 - (yy - 8) * 0.14); G.rect(16 - hw + 1, yy + 1, hw * 2, 1, c.k === c.b ? c.k : c.b); }
      for (let yy = 8; yy < 32; yy++) { const hw = Math.round(13 - (yy - 8) * 0.14); G.rect(16 - hw, yy, hw * 2, 1, body); G.px(16 - hw, yy, c.k); G.px(16 + hw - 1, yy, c.k); if (yy % 3 === 0) G.drect(16 - hw + 1, yy, hw * 2 - 2, 1, 8, c.w, null); }
      G.rect(5, 31, 22, 1, c.k);
      if (full) for (let i = 0; i < Math.min(full, 6); i++) { const px = 7 + ((i * 7) % 17), py = 3 + (i % 2) * 2 - Math.floor(i / 3) * 2; G.circ(px, py + 3, 3, c.w, c.k); G.px(px - 1, py + 2, c.l); G.px(px + 1, py + 4, c.l); }
      G.ell(16, 8, 13, 3, open ? c.k : c.l, c.k); if (!open) G.ell(16, 8, 11, 2, null, c.w);
      const ar = c.g === L ? c.w : c.g; // símbolo de reciclaje
      G.tri(16, 13, 12, 19, 20, 19, ar); G.tri(11, 21, 9, 27, 15, 26, ar); G.tri(21, 21, 23, 27, 17, 26, ar);
      G.px(16, 17, body); G.px(11, 25, body); G.px(21, 25, body);
    } finally { G.target(T); }
    G.ctx().drawImage(cv.c, Math.round(x), Math.round(y), 32 * sc, 34 * sc);
  };

  // ---------- "fotos" del captcha: estilo cámara de bolsillo antigua (4 tonos con trama ordenada) ----------
  // Cada escena se pinta en gris (espacio 64x64) y luego se "revela": enfoque, grano, viñeta y trama 4x4 con una rampa de la paleta.
  G.CAPTCHA_SET = [['light', 'TRAFFIC LIGHTS'], ['car', 'CARS'], ['moon', 'THE MOON'], ['bike', 'BICYCLES'], ['cat', 'CATS'], ['flower', 'FLOWERS'],
    ['palm', 'PALM TREES'], ['tower', 'BUILDINGS'], ['skull', 'SKULLS'], ['bus', 'BUSES'], ['hydrant', 'HYDRANTS'], ['cross', 'CROSSWALKS'],
    ['mountain', 'MOUNTAINS'], ['boat', 'BOATS'], ['plane', 'PLANES'], ['computer', 'COMPUTERS'], ['eye', 'EYES']];
  // rampas de oscuro a claro, según el bloque de color del nivel
  G.camRamps = function (block) {
    const r = [[K, L, W], [K, L, W], [K, W]];
    if (block >= 1) r.push([K, B, L, W], [K, B, L, W], [K, B, W], [B, L, W], [B, W]);
    if (block >= 2) r.push([K, Gr, W], [K, B, Gr, W], [B, Gr, W], [K, Gr, L, W]);
    return r;
  };
  const gv = (v, a) => { v = Math.max(0, Math.min(255, Math.round(v))); return a == null ? 'rgb(' + v + ',' + v + ',' + v + ')' : 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')'; };
  const grad = (g, st) => { st.forEach((s) => g.addColorStop(s[0], gv(s[1], s[2]))); return g; };
  const lin = (c, x0, y0, x1, y1, st) => grad(c.createLinearGradient(x0, y0, x1, y1), st);
  const rad = (c, x, y, r0, r1, st) => grad(c.createRadialGradient(x, y, r0, x, y, r1), st);
  const fr = (c, x, y, w, h, f) => { c.fillStyle = typeof f === 'number' ? gv(f) : f; c.fillRect(x, y, w, h); };
  const el = (c, x, y, rx, ry, f, rot) => { c.fillStyle = typeof f === 'number' ? gv(f) : f; c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); c.fill(); };
  const pg = (c, p, f) => { c.fillStyle = typeof f === 'number' ? gv(f) : f; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); };
  const ln = (c, p, v, w) => { c.strokeStyle = gv(v); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); };
  const rr = (c, x, y, w, h, r, f) => { c.fillStyle = typeof f === 'number' ? gv(f) : f; c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.fill(); };
  const sky = (c, a, b, hz) => fr(c, 0, 0, 64, 64, lin(c, 0, 0, 0, hz || 64, [[0, a], [1, b]]));
  const clouds = (c, R, v, n) => { for (let i = 0; i < (n || 4); i++) { const x = R() * 64, y = 4 + R() * 24, r = 6 + R() * 9; el(c, x, y, r * 1.7, r * 0.7, rad(c, x, y, 0, r * 1.7, [[0, v, 0.9], [1, v, 0]])); } };
  const shadow = (c, x, y, w, h) => el(c, x, y, w, h, rad(c, x, y, 0, w, [[0, 10, 0.75], [1, 10, 0]]));
  const skyline = (c, R, base, v0, v1) => { for (let x = -4; x < 66; x += 7 + R() * 6) { const h = 6 + R() * 16; fr(c, x, base - h, 6 + R() * 6, h + 1, v0 + R() * (v1 - v0)); } };
  const road = (c, y, a, b) => fr(c, 0, y, 64, 64 - y, lin(c, 0, y, 0, 64, [[0, a], [1, b]]));
  const SCN = {
    light(c, R) {
      sky(c, 245, 175 + R() * 50); if (R() < 0.5) clouds(c, R, 255, 3);
      if (R() < 0.5) pg(c, [0, 64, 0, 18 + R() * 20, 12 + R() * 8, 28 + R() * 10, 16, 64], 55);
      const n = R() < 0.35 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        c.save(); c.translate(n === 2 ? 20 + k * 25 : 26 + R() * 12, 17 + R() * 8); c.rotate((R() - 0.5) * 0.5); const s = n === 2 ? 0.8 : 1 + R() * 0.2; c.scale(s, s);
        fr(c, -2, 14, 4, 60, lin(c, -2, 0, 2, 0, [[0, 35], [0.4, 120], [1, 30]]));
        rr(c, -8, -15, 16, 34, 4, lin(c, -8, 0, 8, 0, [[0, 25], [0.3, 95], [1, 15]]));
        const on = Math.floor(R() * 3);
        for (let i = 0; i < 3; i++) {
          const y = -8 + i * 10;
          c.fillStyle = gv(5); c.beginPath(); c.arc(0, y, 6, Math.PI, 0); c.fill();
          if (i === on) { el(c, 0, y + 1, 10, 10, rad(c, 0, y + 1, 0, 10, [[0, 255, 0.85], [1, 255, 0]])); el(c, 0, y + 1, 4.3, 4.3, 252); }
          else el(c, 0, y + 1, 4.3, 4.3, rad(c, -1, y, 0, 5, [[0, 115], [1, 45]]));
        }
        c.restore();
      }
    },
    car(c, R) {
      const dark = R() < 0.4;
      sky(c, 215, 160, 30); skyline(c, R, 30, 90, 170); road(c, 29, 155, 85);
      c.save(); c.translate(32, 52); c.rotate(-0.1 + (R() - 0.5) * 0.2); for (let i = -3; i < 4; i++) fr(c, i * 18 - 5, 6, 10, 2, 240); fr(c, -50, -24, 100, 1.5, 230); c.restore();
      shadow(c, 32, 47, 28, 4);
      c.save(); c.translate(32 + (R() - 0.5) * 6, 0);
      const bv = dark ? 55 : 228, lo = dark ? 22 : 140;
      c.beginPath(); c.moveTo(-28, 43); c.lineTo(-28, 37); c.quadraticCurveTo(-27, 32, -18, 31); c.lineTo(-10, 25); c.quadraticCurveTo(0, 21, 10, 25); c.lineTo(18, 30); c.quadraticCurveTo(29, 31, 29, 37); c.lineTo(29, 43); c.closePath();
      c.fillStyle = lin(c, 0, 22, 0, 44, [[0, bv + 20], [0.5, bv], [1, lo]]); c.fill();
      pg(c, [-9, 30.5, -6, 26.6, 0, 24.6, 0, 30.5], dark ? 150 : 35); pg(c, [2, 30.5, 2, 24.6, 8, 26.2, 14, 30.5], dark ? 150 : 35);
      fr(c, -25, 33, 50, 1, dark ? 120 : 255); fr(c, -1, 31, 1, 11, dark ? 30 : 150);
      for (const wx of [-17, 18]) { el(c, wx, 42, 6.5, 6.5, 12); el(c, wx, 42, 3.6, 3.6, rad(c, wx - 1, 41, 0, 4, [[0, 225], [1, 100]])); el(c, wx, 42, 1, 1, 30); }
      el(c, 27.5, 34, 1.6, 1.1, 255); c.restore();
    },
    moon(c, R) {
      fr(c, 0, 0, 64, 64, 6); for (let i = 0; i < 12; i++) fr(c, R() * 64, R() * 64, 1, 1, 140 + R() * 115);
      const x = 26 + R() * 12, y = 26 + R() * 12, r = 19 + R() * 7;
      el(c, x, y, r, r, rad(c, x - r * 0.3, y - r * 0.3, r * 0.1, r * 1.15, [[0, 250], [0.7, 195], [1, 115]]));
      c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.clip();
      for (let i = 0; i < 7; i++) { const a = R() * 6.28, d = R() * r * 0.8, cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d, q = 3 + R() * 8; el(c, cx, cy, q, q * (0.6 + R() * 0.4), rad(c, cx, cy, 0, q, [[0, 85, 0.8], [1, 85, 0]]), R() * 3); }
      for (let i = 0; i < 12; i++) { const cx = x + (R() - 0.5) * r * 1.6, cy = y + (R() - 0.5) * r * 1.6, q = 0.8 + R() * 2.4; el(c, cx, cy, q, q, 105); el(c, cx - 0.5, cy - 0.5, q * 0.7, q * 0.7, 205); }
      const ph = R() < 0.45 ? 0 : (R() < 0.5 ? 1 : -1);
      if (ph) { const sx = x + ph * r * (0.7 + R() * 0.5); el(c, sx, y, r * 1.05, r * 1.1, rad(c, sx, y, r * 0.65, r * 1.1, [[0, 6, 1], [1, 6, 0]])); }
      c.restore();
    },
    bike(c, R) {
      fr(c, 0, 0, 64, 64, lin(c, 0, 0, 0, 64, [[0, 175 + R() * 60], [0.6, 140], [0.61, 105], [1, 70]]));
      if (R() < 0.5) for (let y = 4; y < 36; y += 6) fr(c, 0, y, 64, 1, 125);
      shadow(c, 32, 56, 30, 3);
      const wy = 44, q = 11;
      for (const wx of [14, 50]) {
        c.strokeStyle = gv(15); c.lineWidth = 2.6; c.beginPath(); c.arc(wx, wy, q, 0, 7); c.stroke();
        c.strokeStyle = gv(205); c.lineWidth = 0.6; for (let a = 0; a < 6.28; a += 0.52) { c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + Math.cos(a) * q, wy + Math.sin(a) * q); c.stroke(); }
        el(c, wx, wy, 1.5, 1.5, 40);
      }
      const fv = 15 + R() * 40;
      ln(c, [14, wy, 30, wy, 24, 25, 14, wy], fv, 2); ln(c, [30, wy, 44, 24, 24, 25], fv, 2); ln(c, [44, 24, 50, wy], fv, 2);
      ln(c, [24, 25, 22, 20], 30, 1.6); fr(c, 16, 17, 10, 2.6, 15); ln(c, [44, 24, 43, 18, 48, 16], 30, 1.6);
      el(c, 30, wy, 3, 3, 60); ln(c, [30, wy, 14, wy], 70, 0.8);
    },
    cat(c, R) {
      const fur = R() < 0.5 ? 200 : 75, bg = fur > 128 ? 55 : 205;
      fr(c, 0, 0, 64, 64, rad(c, 32, 30, 5, 50, [[0, bg + 20], [1, bg - 35]]));
      c.save(); c.translate(32, 34); c.rotate((R() - 0.5) * 0.45); c.translate(-32, -34);
      pg(c, [11, 28, 13, 3, 29, 16], fur - 25); pg(c, [53, 28, 51, 3, 35, 16], fur - 25);
      pg(c, [15, 22, 16, 9, 25, 16], fur > 128 ? 145 : 115); pg(c, [49, 22, 48, 9, 39, 16], fur > 128 ? 145 : 115);
      el(c, 32, 35, 23, 19, rad(c, 26, 27, 2, 27, [[0, fur + 40], [1, fur - 45]]));
      el(c, 27, 43, 6, 4.5, fur + 30); el(c, 37, 43, 6, 4.5, fur + 30);
      const lk = (R() - 0.5) * 2.4;
      for (const ex of [23, 41]) { el(c, ex, 31, 5.2, 4.2, fur > 128 ? 230 : 215); el(c, ex + lk, 31, 1.5, 3.7, 8); el(c, ex + lk + 1, 29.4, 0.9, 0.9, 255); c.strokeStyle = gv(20); c.lineWidth = 0.8; c.beginPath(); c.ellipse(ex, 31, 5.2, 4.2, 0, 0, 7); c.stroke(); }
      pg(c, [29.5, 38.5, 34.5, 38.5, 32, 41.5], 35); ln(c, [32, 41.5, 32, 43.5, 29, 45.5], 35, 0.8); ln(c, [32, 43.5, 35, 45.5], 35, 0.8);
      for (const [sx, d] of [[24, -1], [40, 1]]) for (let i = -1; i <= 1; i++) ln(c, [sx, 43 + i, sx + d * 19, 41 + i * 3.5], fur > 128 ? 60 : 245, 0.5);
      c.restore();
    },
    flower(c, R) {
      const dark = R() < 0.5;
      fr(c, 0, 0, 64, 64, rad(c, 16 + R() * 32, 16 + R() * 32, 4, 62, [[0, dark ? 95 : 245], [1, dark ? 15 : 165]]));
      for (let i = 0; i < 5; i++) el(c, R() * 64, R() * 64, 6 + R() * 10, 3 + R() * 4, gv(dark ? 55 : 135, 0.6), R() * 3);
      const cx = 32 + (R() - 0.5) * 10, cy = 28 + (R() - 0.5) * 10;
      ln(c, [cx, cy, cx + (R() - 0.5) * 10, 46, 32, 66], dark ? 120 : 70, 3); el(c, 40, 50, 8, 3, dark ? 110 : 80, -0.6);
      const n = 5 + Math.floor(R() * 4), pr = 15 + R() * 6, rot = R() * 6;
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * 6.283, px = cx + Math.cos(a) * pr * 0.55, py = cy + Math.sin(a) * pr * 0.55;
        el(c, px, py, pr * 0.56, pr * 0.27, rad(c, px, py, 0, pr * 0.6, [[0, 252], [1, dark ? 175 : 205]]), a);
        c.strokeStyle = gv(dark ? 40 : 75); c.lineWidth = 0.9; c.beginPath(); c.ellipse(px, py, pr * 0.56, pr * 0.27, a, 0, 7); c.stroke();
      }
      el(c, cx, cy, pr * 0.3, pr * 0.3, rad(c, cx - 1, cy - 1, 0, pr * 0.32, [[0, 150], [1, 35]]));
      for (let i = 0; i < 12; i++) { const a = R() * 6.28, d = R() * pr * 0.25; el(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.7, 0.7, 230); }
    },
    palm(c, R) {
      const dusk = R() < 0.5, hz = 44 + R() * 6;
      sky(c, dusk ? 110 : 200, dusk ? 250 : 245, hz);
      if (dusk) el(c, 14 + R() * 36, hz, 9, 9, 255); else clouds(c, R, 255, 2);
      fr(c, 0, hz, 64, 64 - hz, lin(c, 0, hz, 0, 64, [[0, dusk ? 85 : 170], [1, dusk ? 30 : 215]]));
      for (let y = hz + 2; y < 64; y += 3) for (let x = R() * 8; x < 64; x += 8 + R() * 8) fr(c, x, y, 4, 1, dusk ? 170 : 245);
      const n = R() < 0.4 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const bx = n === 2 ? 16 + k * 30 : 30 + (R() - 0.5) * 18, lean = (R() - 0.5) * 26, tx = bx + lean, ty = 12 + R() * 9;
        c.strokeStyle = gv(dusk ? 15 : 45); c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx, 66); c.quadraticCurveTo(bx + lean * 0.1, 40, tx, ty); c.stroke();
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + (i - 3.5) * 0.5 + (R() - 0.5) * 0.2, len = 15 + R() * 6, ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.5 + len * 0.45;
          c.strokeStyle = gv(dusk ? 10 : 30); c.lineWidth = 2.2; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - 5, ex, ey); c.stroke();
        }
        el(c, tx, ty + 1.5, 2.6, 2, 25);
      }
    },
    tower(c, R) {
      sky(c, 245, 185, 64); if (R() < 0.5) clouds(c, R, 255, 3);
      const n = 3 + Math.floor(R() * 3), vx = 32 + (R() - 0.5) * 24, vy = -30 - R() * 50;
      let x = -10;
      for (let i = 0; i < n; i++) {
        const w = 68 / n + 6 + R() * 8, v = 55 + R() * 140, x0 = x, x1 = x + w; x += w - 3 + R() * 5;
        const ht = 3 + R() * 26, k = (64 - ht) / (64 - vy), t0 = x0 + (vx - x0) * k, t1 = x1 + (vx - x1) * k;
        pg(c, [x0, 66, t0, ht, t1, ht, x1, 66], lin(c, x0, 0, x1, 0, [[0, v + 35], [1, v - 35]]));
        for (let yy = ht + 3; yy < 64; yy += 4) { const kk = (64 - yy) / (64 - vy), a = x0 + (vx - x0) * kk, b = x1 + (vx - x1) * kk; for (let j = 1; j < 5; j++) fr(c, a + ((b - a) * j) / 5 - 0.7, yy, 1.4, 2, v > 125 ? 35 : 235); }
      }
    },
    skull(c, R) {
      fr(c, 0, 0, 64, 64, rad(c, 32, 28, 4, 48, [[0, 95 + R() * 60], [1, 8]]));
      c.save(); c.translate(32, 32); c.rotate((R() - 0.5) * 0.5); c.translate(-32, -32);
      el(c, 32, 26, 19, 18, rad(c, 26, 18, 2, 25, [[0, 252], [1, 145]]));
      rr(c, 21, 34, 22, 14, 4, lin(c, 0, 34, 0, 48, [[0, 205], [1, 125]]));
      for (const ex of [24, 40]) { el(c, ex, 30, 5.6, 5, rad(c, ex, 31, 0, 6, [[0, 0], [1, 55]])); if (R() < 0.3) el(c, ex, 30, 1, 1, 255); }
      pg(c, [32, 34, 29.5, 40, 34.5, 40], 25);
      for (let i = 0; i < 6; i++) fr(c, 23.5 + i * 3, 43, 0.8, 5, 55); fr(c, 22, 45.5, 20, 0.8, 75);
      c.restore();
    },
    bus(c, R) {
      sky(c, 230, 175, 28); skyline(c, R, 28, 110, 190); road(c, 27, 140, 80);
      shadow(c, 32, 47, 30, 4);
      const v = R() < 0.5 ? 230 : 180;
      rr(c, 3, 17, 57, 27, 3, lin(c, 0, 17, 0, 44, [[0, v + 25], [0.6, v], [1, v - 70]]));
      for (let i = 0; i < 5; i++) fr(c, 6 + i * 9, 21, 7.5, 8, lin(c, 0, 21, 0, 29, [[0, 70], [1, 20]]));
      fr(c, 52, 20, 6, 12, 25); fr(c, 44, 31, 6, 12, 50); fr(c, 3, 33, 57, 2, v > 128 ? 70 : 200); fr(c, 7, 18, 14, 2, 30);
      for (const wx of [14, 48]) { el(c, wx, 44, 5, 5, 10); el(c, wx, 44, 2.2, 2.2, 170); }
      el(c, 58, 39, 1.4, 1.2, 255);
    },
    hydrant(c, R) {
      fr(c, 0, 0, 64, 64, lin(c, 0, 0, 0, 64, [[0, 190 + R() * 50], [0.62, 150], [0.63, 120], [1, 85]]));
      for (let x = -40; x < 64; x += 12) ln(c, [x + 40, 40, x, 66], 100, 0.6);
      shadow(c, 34, 55, 18, 3);
      const v = R() < 0.5 ? 215 : 95, cyl = lin(c, 18, 0, 46, 0, [[0, v - 75], [0.35, v + 40], [1, v - 95]]);
      rr(c, 22, 22, 20, 31, 2, cyl); el(c, 32, 22, 10.5, 7, cyl); rr(c, 28.5, 11.5, 7, 5, 1, cyl); fr(c, 30.5, 9, 3, 3, v - 50);
      rr(c, 14, 28, 9, 7, 1.5, cyl); rr(c, 41, 28, 9, 7, 1.5, cyl); rr(c, 19.5, 20, 25, 3, 1, v - 45);
      el(c, 32, 34, 4.6, 4.6, v - 60); el(c, 32, 34, 2, 2, v + 15); rr(c, 18, 50, 28, 4, 1, v - 55);
    },
    cross(c, R) {
      sky(c, 225, 185, 14); skyline(c, R, 16, 110, 180); road(c, 15, 110, 55);
      const vx = 32 + (R() - 0.5) * 34, vy = 8;
      // franjas que se pierden hacia el fondo, con bordillo y línea de parada
      const top = 26 + R() * 8, sw = 6 + R() * 4, k = (64 - top) / (64 - vy);
      for (let i = -5; i <= 5; i++) { const b0 = 32 + i * sw * 1.7 - sw / 2, b1 = b0 + sw; pg(c, [b0, 66, b1, 66, b1 + (vx - b1) * k, top, b0 + (vx - b0) * k, top], 240); }
      fr(c, 0, top - 3, 64, 1.2, 220);
      fr(c, 0, 61, 64, 3, 185);
    },
    mountain(c, R) {
      sky(c, 252, 195, 40); if (R() < 0.5) clouds(c, R, 255, 2);
      const ridge = (base, amp, v) => { const p = [-2, 66]; for (let x = -2; x <= 70; x += 6) p.push(x, base - R() * amp); p.push(68, 66); pg(c, p, v); };
      ridge(34, 10, 205);
      const px = 18 + R() * 28, py = 6 + R() * 8;
      pg(c, [px - 34, 66, px, py, px + 34, 66], 120); pg(c, [px, py, px + 34, 66, px + 6, 66], 70);
      pg(c, [px - 7, py + 10, px, py, px + 7, py + 10, px + 3, py + 7, px, py + 11, px - 3, py + 7], 250);
      ridge(52, 8, 45);
      if (R() < 0.5) { fr(c, 0, 56, 64, 8, lin(c, 0, 56, 0, 64, [[0, 170], [1, 110]])); for (let y = 57; y < 64; y += 2) fr(c, R() * 30, y, 20 + R() * 20, 0.8, 230); }
    },
    boat(c, R) {
      const hz = 34 + R() * 8;
      sky(c, 235, 170, hz); if (R() < 0.5) el(c, 10 + R() * 44, hz - 6, 6, 6, 255); else clouds(c, R, 255, 3);
      fr(c, 0, hz, 64, 64 - hz, lin(c, 0, hz, 0, 64, [[0, 150], [1, 65]]));
      for (let y = hz + 2; y < 64; y += 3) for (let x = R() * 10; x < 64; x += 9 + R() * 8) fr(c, x, y, 5, 1, 205);
      const x = 22 + R() * 20, by = hz + 4;
      pg(c, [x - 16, by, x + 18, by, x + 12, by + 6, x - 12, by + 6], 20);
      fr(c, x - 12, by + 7, 24, 5, gv(20, 0.35));
      ln(c, [x, by, x, by - 30], 30, 1);
      pg(c, [x + 1, by - 29, x + 1, by - 2, x + 16, by - 2], lin(c, x, 0, x + 16, 0, [[0, 250], [1, 150]]));
      pg(c, [x - 1, by - 25, x - 1, by - 2, x - 12, by - 2], lin(c, x - 12, 0, x, 0, [[0, 120], [1, 190]]));
      ln(c, [x + 1, by - 29, x + 16, by - 2, x + 1, by - 2], 45, 0.9); ln(c, [x - 1, by - 25, x - 12, by - 2, x - 1, by - 2], 45, 0.9);
    },
    plane(c, R) {
      sky(c, 165 + R() * 40, 245, 64); clouds(c, R, 255, 5);
      c.save(); c.translate(32 + (R() - 0.5) * 10, 30 + (R() - 0.5) * 10); c.rotate((R() - 0.5) * 1.4); const s = 0.9 + R() * 0.3; c.scale(s, s);
      const v = 25 + R() * 45;
      ln(c, [-24, -1.2, -64, -1.2], 255, 1.2); ln(c, [-24, 1.2, -64, 1.2], 255, 1.2);
      pg(c, [2, 0, -6, -22, -11, -22, -7, 0, -11, 22, -6, 22], v);
      pg(c, [-16, 0, -21, -8, -24, -8, -22, 0, -24, 8, -21, 8], v);
      el(c, 0, 0, 23, 3.6, lin(c, 0, -4, 0, 4, [[0, v + 40], [1, v - 25]]));
      el(c, -3, -9, 3, 1.5, v - 20); el(c, -3, 9, 3, 1.5, v - 20);
      c.restore();
    },
    computer(c, R) {
      fr(c, 0, 0, 64, 64, lin(c, 0, 0, 0, 64, [[0, 150 + R() * 60], [0.72, 115], [0.73, 175], [1, 120]]));
      shadow(c, 33, 46, 26, 3);
      const sx = (R() - 0.5) * 6;
      c.save(); c.translate(sx, 0);
      rr(c, 10, 6, 44, 37, 3, lin(c, 10, 0, 54, 0, [[0, 225], [1, 150]]));
      const on = R() < 0.75;
      rr(c, 15, 10, 34, 26, 4, rad(c, 32, 23, 2, 23, [[0, on ? 235 : 95], [1, on ? 70 : 25]]));
      if (on) {
        const k = Math.floor(R() * 3);
        if (k === 0) { el(c, 26, 20, 1.6, 2.2, 20); el(c, 38, 20, 1.6, 2.2, 20); c.strokeStyle = gv(20); c.lineWidth = 1.4; c.beginPath(); c.arc(32, 23, 7, 0.4, 2.74); c.stroke(); }
        else if (k === 1) for (let i = 0; i < 5; i++) fr(c, 18, 13 + i * 4, 8 + R() * 18, 1.5, 30);
        else { ln(c, [18, 30, 24, 22, 29, 26, 35, 15, 41, 20, 46, 13], 25, 1.2); }
        for (let y = 10; y < 36; y += 2) fr(c, 15, y, 34, 0.6, gv(0, 0.25));
      }
      fr(c, 47, 39, 3, 1.4, on ? 255 : 90);
      pg(c, [26, 43, 38, 43, 41, 48, 23, 48], 140);
      c.restore();
      pg(c, [6, 51, 58, 51, 63, 61, 1, 61], 200);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) fr(c, 6 + i * 4.4 - r * 1.2 + r * 0, 53 + r * 2.6, 3, 1.6, 110);
    },
    eye(c, R) {
      fr(c, 0, 0, 64, 64, rad(c, 32, 34, 4, 46, [[0, 205], [1, 105]]));
      c.strokeStyle = gv(45); c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(7, 17); c.quadraticCurveTo(32, 4, 58, 18); c.stroke();
      const op = R() * 8, lk = (R() - 0.5) * 14;
      const lid = () => { c.beginPath(); c.moveTo(7, 35); c.quadraticCurveTo(32, 13 + op, 57, 35); c.quadraticCurveTo(32, 51, 7, 35); c.closePath(); };
      lid(); c.fillStyle = gv(238); c.fill();
      c.save(); lid(); c.clip();
      el(c, 32 + lk, 33, 11, 11, rad(c, 32 + lk, 33, 3, 11, [[0, 70], [0.7, 130], [1, 35]]));
      c.strokeStyle = gv(170); c.lineWidth = 0.5; for (let a = 0; a < 6.28; a += 0.4) { c.beginPath(); c.moveTo(32 + lk + Math.cos(a) * 5, 33 + Math.sin(a) * 5); c.lineTo(32 + lk + Math.cos(a) * 10, 33 + Math.sin(a) * 10); c.stroke(); }
      el(c, 32 + lk, 33, 4.6, 4.6, 4); el(c, 35 + lk, 30, 2, 2, 255);
      fr(c, 0, 0, 64, 64, lin(c, 0, 20, 0, 34, [[0, 0, 0.45], [1, 0, 0]]));
      c.restore();
      c.strokeStyle = gv(25); c.lineWidth = 2; c.beginPath(); c.moveTo(7, 35); c.quadraticCurveTo(32, 13 + op, 57, 35); c.stroke();
      for (let t = 0.12; t < 0.9; t += 0.09) { const x = (1 - t) * (1 - t) * 7 + 2 * (1 - t) * t * 32 + t * t * 57, y = (1 - t) * (1 - t) * 35 + 2 * (1 - t) * t * (13 + op) + t * t * 35; ln(c, [x, y, x + (t - 0.5) * 6, y - 4], 25, 0.8); }
    },
  };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function seeded(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let camWork = null, camCache = {}, camN = 0;
  G.camPhoto = function (name, seed, ramp, P) {
    P = Math.max(16, P | 0);
    const key = name + '|' + seed + '|' + ramp.join('') + '|' + P;
    if (camCache[key]) return camCache[key];
    if (++camN > 160) { camCache = {}; camN = 1; }
    if (!camWork || camWork.width !== P) { camWork = document.createElement('canvas'); camWork.width = camWork.height = P; }
    const c = camWork.getContext('2d', { willReadFrequently: true }), R = seeded(seed * 7919 + name.length * 131);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, P, P);
    // encuadre distinto en cada foto: zoom, desplazamiento y espejo
    const z = 1 + R() * 0.28, ox = (R() - 0.5) * (z - 1) * 64, oy = (R() - 0.5) * (z - 1) * 64;
    c.scale(P / 64, P / 64); c.translate(32 + ox, 32 + oy); c.scale(R() < 0.5 ? -z : z, z); c.translate(-32, -32);
    SCN[name](c, R);
    // revelado: enfoque + grano + viñeta + trama ordenada 4x4
    const d = c.getImageData(0, 0, P, P).data, n = P * P, Lm = new Float32Array(n);
    for (let i = 0; i < n; i++) Lm[i] = d[i * 4] / 255;
    const out = G.mkCanvas(P, P), od = out.x.createImageData(P, P), o = od.data, cols = ramp.map(rgb), m = ramp.length - 1;
    const con = 1.1 + R() * 0.35, bri = (R() - 0.5) * 0.12, vig = 0.25 + R() * 0.35;
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      let s = 0, k = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= P) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= P) continue; s += Lm[yy * P + xx]; k++; } }
      const i = y * P + x, ux = x / P - 0.5, uy = y / P - 0.5;
      let v = Lm[i] + 0.9 * (Lm[i] - s / k);
      v = (v - 0.5) * con + 0.5 + bri + (R() - 0.5) * 0.08 - (ux * ux + uy * uy) * vig;
      v = Math.max(0, Math.min(1, v)) * m;
      const b = Math.floor(v), q = Math.min(m, b + (v - b > (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 1 : 0)), col = cols[q];
      o[i * 4] = col[0]; o[i * 4 + 1] = col[1]; o[i * 4 + 2] = col[2]; o[i * 4 + 3] = 255;
    }
    out.x.putImageData(od, 0, 0);
    return (camCache[key] = out.c);
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
