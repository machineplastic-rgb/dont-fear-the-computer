'use strict';
// Pixel art redibujado: iconos de ventanas, iconos de los 12 sectores (animados) y wallpapers de nubes tramadas.
(function (G) {
  const P = G.PAL;
  G.ART = {
    xcirc: [
      '..#####..',
      '.#######.',
      '##.###.##',
      '###.#.###',
      '####.####',
      '###.#.###',
      '##.###.##',
      '.#######.',
      '..#####..'],
    warn: [
      '.....#.....',
      '....#.#....',
      '....#.#....',
      '...#.#.#...',
      '...#.#.#...',
      '..#..#..#..',
      '..#..#..#..',
      '.#.......#.',
      '.#...#...#.',
      '###########'],
    hg1: [
      '#######',
      '.#ooo#.',
      '.#ooo#.',
      '..#o#..',
      '...#...',
      '..#.#..',
      '.#...#.',
      '.#.o.#.',
      '#######'],
    hg2: [
      '#######',
      '.#...#.',
      '.#...#.',
      '..#.#..',
      '...#...',
      '..#o#..',
      '.#ooo#.',
      '.#ooo#.',
      '#######'],
    smiley: [
      '.....#####.....',
      '...##.....##...',
      '..#.........#..',
      '.#...........#.',
      '.#...#...#...#.',
      '#....#...#....#',
      '#....#...#....#',
      '#....o........#',
      '#..#.o.....#..#',
      '#...#.....#...#',
      '.#...#####...#.',
      '.#...........#.',
      '..#.........#..',
      '...##.....##...',
      '.....#####.....'],
    skull: [
      '......##########......',
      '....##############....',
      '...################...',
      '..##################..',
      '.####################.',
      '.####################.',
      '######################',
      '###.....######.....###',
      '##......######......##',
      '##......######......##',
      '##......######......##',
      '###.....######.....###',
      '##########..##########',
      '.#########..#########.',
      '.########....########.',
      '..##################..',
      '...################...',
      '....##############....',
      '....#.#.#.##.#.#.#....',
      '....##############....',
      '.....############.....'],
    pic: [
      '#############',
      '#...........#',
      '#........##.#',
      '#........##.#',
      '#...........#',
      '#....#......#',
      '#...###...#.#',
      '#..#####.####',
      '#.###########',
      '#############'],
    cursor: [
      '#.......',
      '##......',
      '#w#.....',
      '#ww#....',
      '#www#...',
      '#wwww#..',
      '#wwwww#.',
      '#www####',
      '#w#w#...',
      '##.#w#..',
      '#..#w#..',
      '....##..'],
    lock: [
      '..###..',
      '.#...#.',
      '.#...#.',
      '#######',
      '###.###',
      '###.###',
      '#######'],
    folder: [
      '.#####........',
      '#wwwww#######.',
      '#wwwwwwwwwwww#',
      '##############',
      '#wwwwwwwwwwww#',
      '#wwwwwwwwwwww#',
      '#wwwwwwwwwwww#',
      '#wwwwwwwwwwww#',
      '#wwwwwwwwwwww#',
      '#wwwwwwwwwwww#',
      '##############'],
    trash: [
      '....###....',
      '###########',
      '.#w#w#w#w#.',
      '.#w#w#w#w#.',
      '.#w#w#w#w#.',
      '.#w#w#w#w#.',
      '.#w#w#w#w#.',
      '.#w#w#w#w#.',
      '.#w#w#w#w#.',
      '.#########.'],
    computer: [
      '##############',
      '#wwwwwwwwwwww#',
      '#w##########w#',
      '#w#bbbbbbbb#w#',
      '#w#bbbbbbbb#w#',
      '#w#bbbbbbbb#w#',
      '#w#bbbbbbbb#w#',
      '#w##########w#',
      '#wwwwwwwwwwww#',
      '##############',
      '.....####.....',
      '..##########..',
      '..##########..'],
    power: [
      '....#....',
      '.#..#..#.',
      '#...#...#',
      '#...#...#',
      '#.......#',
      '#.......#',
      '.#.....#.',
      '..#####..'],
    phone: [
      '##.....##',
      '###...###',
      '###...###',
      '.##...##.',
      '.#######.',
      '#########',
      '####.####',
      '#########'],
    eyelogo: [
      '..#####..',
      '.#.....#.',
      '#..###..#',
      '#.#####.#',
      '#..###..#',
      '.#.....#.',
      '..#####..'],
  };

  // ---------- iconos de sectores (24x20, se dibujan a x2) ----------
  const K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  function heart(cx, cy, s, fill, out) {
    for (let y = -10; y <= 10; y++) for (let x = -12; x <= 12; x++) {
      const fx = x / s, fy = -y / s + 0.25;
      const v = Math.pow(fx * fx + fy * fy - 1, 3) - fx * fx * fy * fy * fy;
      if (v <= 0) {
        // borde: algún vecino fuera
        let edge = false;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const gx = (x + ox) / s, gy = -(y + oy) / s + 0.25;
          if (Math.pow(gx * gx + gy * gy - 1, 3) - gx * gx * gy * gy * gy > 0) edge = true;
        }
        G.px(cx + x, cy + y, edge ? out : fill);
      }
    }
  }
  G.ART.hand = [
    '....##.......',
    '...#ww#......',
    '...#ww#......',
    '...#ww#......',
    '...#ww###....',
    '...#ww#ww###.',
    '.###ww#ww#ww#',
    '#ww#wwwwwwww#',
    '#ww#wwwwwwww#',
    '#wwwwwwwwwww#',
    '.#wwwwwwwwww#',
    '.#wwwwwwwwww#',
    '..#wwwwwwww#.',
    '..#wwwwwwww#.',
    '...#wwwwww#..',
    '...########..'];
  G.ART.mcur = [
    '#....',
    '##...',
    '#w#..',
    '#ww#.',
    '#www#',
    '#w##.',
    '##...'];
  G.ICONS = {
    1(t) { // CLOSE.ALL: ventanas apiladas que se cierran
      const gone = Math.floor(t * 2) % 4;
      for (let k = 0; k < 3 - gone; k++) {
        const x = 1 + k * 3, y = 1 + k * 3;
        G.rect(x, y, 15, 11, W); G.box(x, y, 15, 11, K); G.rect(x, y, 15, 3, K); G.px(x + 13, y + 1, W);
      }
      G.drawSpr('cursor', 15, 8, { '#': K, w: W });
    },
    2(t) { // TRASH: un archivo cae en la papelera
      const y = Math.floor((t * 14) % 13);
      const open = y >= 7;
      if (y < 9) { G.rect(10, y, 6, 5, W); G.box(10, y, 6, 5, K); G.px(14, y + 1, K); }
      if (open) { G.rect(6, 7, 13, 2, K); } else { G.rect(5, 9, 15, 2, K); G.rect(10, 8, 5, 1, K); }
      G.rect(6, 11, 13, 9, W); G.box(6, 11, 13, 9, K); for (const x of [9, 12, 15]) G.rect(x, 13, 1, 5, K);
    },
    3(t) { // LOAD.100: barra hasta el 100 %
      const p = Math.min(1, (t % 2.6) / 2.1);
      const done = p >= 1 && Math.floor(t * 6) % 2;
      G.text(Math.floor(p * 100) + '%', 12, 1, done ? Gr : W, { al: 'c' });
      G.box(1, 11, 22, 8, W); const f = Math.round(18 * p);
      for (let i = 0; i < f; i += 2) G.rect(3 + i, 13, 1, 4, p >= 1 ? Gr : W);
    },
    4(t) { // DEFRAG: bloques que se ordenan
      const cyc = Math.floor(t / 3), p = (t % 3) / 2.4, R = G.rng(cyc + 3), cols = [W, K, Gr];
      const arr = []; for (let i = 0; i < 20; i++) arr.push(cols[Math.floor(R() * 3)]);
      const sorted = arr.slice().sort((a, b) => cols.indexOf(a) - cols.indexOf(b));
      const n = Math.floor(Math.min(1, p) * 20);
      for (let i = 0; i < 20; i++) G.rect(2 + (i % 5) * 4, 2 + Math.floor(i / 5) * 4, 3, 3, i < n ? sorted[i] : arr[i]);
    },
    5(t) { // VERIFY: captcha con marcas
      const k = Math.floor(t * 3) % 6, good = [0, 4, 8, 2];
      for (let i = 0; i < 9; i++) {
        const x = 4 + (i % 3) * 6, y = 1 + Math.floor(i / 3) * 6, gi = good.indexOf(i);
        G.rect(x, y, 5, 5, W); G.box(x, y, 5, 5, K);
        if (gi >= 0 && gi < k) { G.px(x + 1, y + 2, B); G.px(x + 2, y + 3, B); G.px(x + 3, y + 2, B); G.px(x + 3, y + 1, B); }
      }
    },
    6(t) { // DEBUG: el virus asoma por detrás de una ventana
      const peek = Math.round((Math.sin(t * 2.4) + 1) * 4);
      const bx = 13 + peek, by = 7;
      G.rect(bx, by, 5, 5, B); G.box(bx - 1, by - 1, 7, 7, K); G.px(bx + 1, by + 1, W); G.px(bx + 3, by + 1, W);
      G.px(bx - 2, by + 1, K); G.px(bx - 2, by + 4, K); G.px(bx + 6, by + 1, K); G.px(bx + 6, by + 4, K); G.px(bx + 1, by - 2, K); G.px(bx + 4, by - 2, K);
      G.rect(2, 3, 14, 13, W); G.box(2, 3, 14, 13, K); G.rect(2, 3, 14, 3, K); G.px(14, 4, W);
      G.rect(4, 8, 8, 1, K); G.rect(4, 10, 6, 1, K); G.rect(4, 12, 9, 1, K);
    },
    7(t) { // SPOT.DIFF: dos ventanas casi iguales
      const blink = Math.floor(t * 2.5) % 2 === 0;
      for (const p of [0, 1]) {
        const x = 1 + p * 12;
        G.rect(x, 2, 10, 16, W); G.box(x, 2, 10, 16, K); G.rect(x, 2, 10, 2, K);
        G.circ(x + 5, 7, 2, B, null); G.rect(x + 2, 11, 6, 2, K);
        if (p === 1 && blink) G.box(x + 2, 14, 6, 3, B); else G.tri(x + 2, 17, x + 8, 17, x + 5, 14, K);
      }
    },
    8(t) { // CURSOR: laberinto
      const pts = [[3, 2], [3, 9], [20, 9], [20, 17], [8, 17]];
      for (let k = 0; k < pts.length - 1; k++) { const [ax, ay] = pts[k], [bx, by] = pts[k + 1]; G.rect(Math.min(ax, bx) - 2, Math.min(ay, by) - 2, Math.abs(bx - ax) + 5, Math.abs(by - ay) + 5, K); }
      for (let k = 0; k < pts.length - 1; k++) { const [ax, ay] = pts[k], [bx, by] = pts[k + 1]; G.rect(Math.min(ax, bx) - 1, Math.min(ay, by) - 1, Math.abs(bx - ax) + 3, Math.abs(by - ay) + 3, W); }
      G.rect(6, 16, 3, 3, B);
      let L0 = 0; const segs = []; for (let k = 0; k < pts.length - 1; k++) { const l = Math.abs(pts[k + 1][0] - pts[k][0]) + Math.abs(pts[k + 1][1] - pts[k][1]); segs.push(l); L0 += l; }
      let d = (t * 14) % L0, k = 0; while (d > segs[k]) { d -= segs[k]; k++; }
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1], f = d / segs[k];
      G.drawSpr('mcur', Math.round(ax + (bx - ax) * f), Math.round(ay + (by - ay) * f) - 1, { '#': K, w: Gr });
    },
    9(t) { // FORCEQUIT: ventana colgada que deja rastro
      const o = Math.floor(t * 6) % 4;
      for (let k = 3; k >= 0; k--) { const x = 1 + k * 2 + (k === 0 ? 0 : 0), y = 1 + k * 2; G.rect(x, y, 15, 12, k === 0 ? W : L); G.box(x, y, 15, 12, K); G.rect(x, y, 15, 3, K); }
      G.drawSpr(o % 2 ? 'hg1' : 'hg2', 5, 5, { '#': K, o: K });
      const f = Math.floor(((t * 0.8) % 1) * 18); G.box(3, 16, 20, 4, K); G.rect(4, 17, f, 2, Gr);
    },
    10(t) { // ECHO: baldosas que se encienden en secuencia
      const seq = [0, 3, 1, 2], k = seq[Math.floor(t * 3) % 4], cols = [Gr, B, K, L];
      for (let i = 0; i < 4; i++) {
        const x = 1 + (i % 2) * 12, y = 1 + Math.floor(i / 2) * 10, lit = i === k;
        G.rect(x, y, 10, 8, lit ? (cols[i] === Gr ? B : Gr) : cols[i]); G.box(x, y, 10, 8, K);
        if (lit) G.box(x - 1, y - 1, 12, 10, K);
      }
    },
    11(t) { // OK.EXE: el botón OK se escapa
      G.rect(1, 2, 16, 10, W); G.box(1, 2, 16, 10, K); G.rect(1, 2, 16, 3, K); G.drawSpr('mcur', 3, 6, { '#': K, w: K });
      const bx = 12 + Math.round(Math.sin(t * 3.1) * 5), by = 12 + Math.round(Math.cos(t * 2.3) * 3);
      G.rect(bx - 1, by, 10, 6, Gr); G.box(bx - 1, by, 10, 6, K); G.px(bx + 2, by + 2, K); G.px(bx + 2, by + 3, K); G.px(bx + 5, by + 2, K); G.px(bx + 6, by + 3, K);
      G.drawSpr('mcur', Math.min(21, bx + 10 - Math.round(Math.sin(t * 3.1 + 0.6) * 3)), by + 5, { '#': K, w: W });
    },
    12(t) { // ERASE: la goma destapa el dibujo
      G.rect(1, 1, 22, 18, W); G.box(1, 1, 22, 18, K);
      G.circ(12, 10, 5, null, K); G.px(10, 9, K); G.px(14, 9, K); G.rect(10, 12, 5, 1, K);
      const ex = 3 + Math.round(((t * 0.6) % 1) * 15);
      for (let x = 2; x < 22; x++) if (x > ex + 4) G.drect(x, 2, 1, 16, 10, K, L);
      G.rect(ex, 7, 6, 5, B); G.box(ex, 7, 6, 5, K);
    },
  };

  // esquemas de color de las tarjetas (como el dossier: verde/azul/gris/negro/blanco)
  G.CARD_SCHEMES = [null,
    { top: W, tt: K, ib: B, grid: W, bot: Gr, nc: B, bt: B },
    { top: W, tt: K, ib: Gr, grid: B, bot: Gr, nc: B, bt: B },
    { top: Gr, tt: K, ib: K, grid: Gr, bot: B, nc: Gr, bt: Gr },
    { top: Gr, tt: K, ib: B, grid: W, bot: W, nc: K, bt: B },
    { top: W, tt: K, ib: Gr, grid: B, bot: B, nc: Gr, bt: W },
    { top: B, tt: W, ib: Gr, grid: K, bot: L, nc: K, bt: B },
    { top: B, tt: W, ib: L, grid: K, bot: L, nc: B, bt: K },
    { top: B, tt: W, ib: Gr, grid: B, bot: L, nc: K, bt: B },
    { top: Gr, tt: B, ib: B, grid: W, bot: L, nc: B, bt: K },
    { top: Gr, tt: K, ib: W, grid: L, bot: L, nc: B, bt: K },
    { top: W, tt: B, ib: Gr, grid: K, bot: L, nc: B, bt: B },
    { top: B, tt: Gr, ib: W, grid: L, bot: L, nc: B, bt: K },
  ];

  // caché de fondos (bloque + semilla + tamaño)
  const wpCache = new Map();
  G.wallpaper = function (block, seed) {
    const k = block + '_' + seed + '_' + G.W + 'x' + G.H;
    let c = wpCache.get(k);
    if (!c) { c = G.makeWallpaper(block, G.W, G.H, seed); wpCache.set(k, c); if (wpCache.size > 12) wpCache.delete(wpCache.keys().next().value); }
    return c;
  };
  // fondo al azar entre los desbloqueados hasta ese bloque de color
  G.randomWallpaper = function (maxBlock) {
    const b = G.irand(0, Math.min(3, maxBlock));
    return G.wallpaper(b, 1000 + G.irand(0, 5) * 131);
  };

  // ---------- wallpapers: nubes con trama pixel (generadas, no copiadas) ----------
  G.makeWallpaper = function (block, Wd, Hd, seed) {
    const { c, x } = G.mkCanvas(Wd, Hd);
    if (block >= 4) { x.fillStyle = K; x.fillRect(0, 0, Wd, Hd); return c; }
    const id = x.createImageData(Wd, Hd), d = id.data;
    const R = G.rng(seed || 4242);
    const grid = new Float32Array(64 * 64); for (let i = 0; i < grid.length; i++) grid[i] = R();
    const gv = (i, j) => grid[((j & 63) << 6) + (i & 63)];
    function vn(px, py) {
      const x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = gv(x0, y0), b = gv(x0 + 1, y0), c2 = gv(x0, y0 + 1), d2 = gv(x0 + 1, y0 + 1);
      return a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d2) * sx * sy;
    }
    function fbm(px, py) { let v = 0, amp = 0.5, f = 1; for (let o = 0; o < 5; o++) { v += amp * vn(px * f, py * f); f *= 2.03; amp *= 0.5; } return v; }
    const C = {}; for (const k in P) C[k] = G.hexRGB(P[k]);
    const put = (i, rgb) => { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; };
    const by = G.bayer;
    // celdas para el bloque 3 (rejilla)
    const cell = Math.round(Wd / 3.2);
    const cellA = { cx: 1, cy: 2 }, cellB = { cx: 2, cy: 3 };
    // cuadrado central del bloque 4
    const sq = { x0: Math.round(Wd * 0.14), x1: Math.round(Wd * 0.86), y0: Math.round(Hd * 0.3), y1: Math.round(Hd * 0.62) };
    const st = { x0: Math.round(Wd * 0.34), x1: Math.round(Wd * 0.7), y0: Math.round(Hd * 0.38), y1: Math.round(Hd * 0.54) };
    const band = { y0: Math.round(Hd * 0.33), y1: Math.round(Hd * 0.45) };
    const blocks = { y0: Math.round(Hd * 0.6), y1: Math.round(Hd * 0.72) };
    for (let y = 0; y < Hd; y++) {
      const yy = y / Hd;
      // densidad de nubes: más presencia en la mitad
      const bias = -0.55 + 0.75 * Math.exp(-((yy - 0.55) ** 2) / 0.06);
      for (let xx = 0; xx < Wd; xx++) {
        const i = (y * Wd + xx) * 4;
        let den = fbm(xx / 44, y / 30) * 2.2 - 0.62 + bias;
        den = G.clamp(den, 0, 1);
        const lv = Math.round(den * 16), bv = by(xx, y);
        if (block === 0) {
          // blanco, gris y negro
          if (den < 0.5) put(i, bv < Math.round(den * 32) ? C.L : C.K);
          else put(i, bv < Math.round((den - 0.5) * 32) ? C.W : C.L);
        } else if (block === 1) {
          if (y >= band.y0 && y < band.y1) put(i, bv < lv ? C.W : C.L);
          else if (y >= blocks.y0 && y < blocks.y1) {
            const bx = xx >> 2, byy = y >> 2; const dd = G.clamp(fbm(bx * 4 / 44, byy * 4 / 30) * 2.2 - 0.62 + bias, 0, 1);
            put(i, by(bx, byy) < Math.round(dd * 16) && (xx & 3) < 3 && (y & 3) < 3 ? C.W : C.B);
          } else put(i, bv < lv ? C.W : C.B);
        } else if (block === 2) {
          const cx = Math.floor(xx / cell), cy = Math.floor(y / cell);
          const onGrid = xx % cell === 0 || y % cell === 0;
          if (onGrid) { put(i, C.W); continue; }
          if (cx === cellA.cx && cy === cellA.cy) put(i, bv < lv ? C.W : C.G);
          else if (cx === cellB.cx && cy === cellB.cy) put(i, bv < lv + 3 ? C.B : C.G);
          else put(i, bv < lv ? C.W : C.B);
        } else {
          // bloque glitch: todos los colores
          const inSq = xx >= sq.x0 && xx < sq.x1 && y >= sq.y0 && y < sq.y1;
          const inSt = xx >= st.x0 && xx < st.x1 && y >= st.y0 && y < st.y1;
          if (inSt) { const s = ((xx + y) >> 2) % 3; put(i, den > 0.55 && bv < lv ? C.W : s === 0 ? C.G : C.K); }
          else if (inSq) {
            if (y < sq.y0 + (sq.y1 - sq.y0) * 0.45) put(i, bv < lv ? C.W : C.B);
            else put(i, bv < lv ? C.G : C.K);
          } else {
            const grad = Math.round(G.clamp(yy * 1.3, 0, 1) * 16);
            if (den > 0.66) put(i, bv < Math.round((den - 0.66) * 48) ? C.W : C.L);
            else if (den > 0.35) put(i, bv < Math.round((den - 0.35) * 50) ? C.L : C.B);
            else put(i, bv < grad ? C.B : C.K);
          }
        }
      }
    }
    x.putImageData(id, 0, 0);
    return c;
  };
})(window.G);
