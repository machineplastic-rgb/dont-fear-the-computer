'use strict';
// PARTE 2 · 16 POP.BREAKER: rompeladrillos sobre el escritorio de la parte 1. Los ladrillos son ventanitas
// emergentes de muchos tipos y tamaños (o, en las rondas pares, iconos de escritorio 1-bit tipo pantalla de inicio),
// la pala es el botón START de la barra de tareas y la pelota es el reloj de arena, que gira sobre sí mismo.
// Se mueve arrastrando el dedo en cualquier parte (movimiento relativo: el dedo no tapa nada).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const VW = 46, VH = 28, ROWG = 8, SLIDE_GAP = 20, BR = 6; // ventanita del jefe, hueco entre filas, pelota (medio lado)
  const WSET = [34, 40, 46, 52, 60], HSET = [24, 28, 32]; // tamaños de las ventanitas
  const TS = 26, IH = TS + 10; // icono: baldosa + etiqueta

  // estilos por bloque de color (la regla de la parte 1)
  const POOL = [
    { basic: ['m1', 'm2', 'm3', 'm5'], armor: 'm4', copy: 'm2', boss: 'm1', rage: 'm2', pad: { bg: K, fg: W } },
    { basic: ['m1', 'm2', 'm3', 'b2', 'b4'], armor: 'b3', copy: 'b1', boss: 'b3', rage: 'b1', pad: { bg: B, fg: W } },
    { basic: ['m1', 'm2', 'm3', 'b1', 'b2', 'b4', 'g1', 'g3'], armor: 'b3', copy: 'g2', boss: 'g4', rage: 'g2', pad: { bg: K, fg: Gr } },
    { basic: ['m1', 'm2', 'b1', 'b2', 'b4', 'g1', 'g3'], armor: 'g4', copy: 'g2', boss: 'b3', rage: 'g2', pad: { bg: K, fg: W } },
  ];
  const pool = (s) => POOL[Math.min(3, s.block)];

  // tipos de ventanita (contenido) con sus títulos y el tamaño mínimo que necesitan
  const WKIND = {
    err: { t: ['ERROR', 'OOPS', '404', 'FAIL'], minW: 40, minH: 24 },
    warn: { t: ['WARNING', 'ALERT', 'HEY'], minW: 40, minH: 28 },
    load: { t: ['LOADING', 'COPYING', 'LOAD', 'WAIT'], minW: 34, minH: 24 },
    mine: { t: ['MINES', 'BOOM', 'GAME'], minW: 40, minH: 28 },
    pass: { t: ['LOGIN', 'USER', 'PIN'], minW: 34, minH: 24 },
    hg: { t: ['BUSY', 'HOLD', 'WAIT'], minW: 40, minH: 24 },
    icon: { t: ['FILE.EXE', 'README', 'FILE', 'DOC'], minW: 46, minH: 32 },
    word: { t: ['SPAM', 'ADS', 'MSG', 'HEY'], minW: 34, minH: 24 },
    text: { t: ['README', 'NOTE', 'TXT'], minW: 34, minH: 24 },
    smile: { t: ['SMILE', 'HAPPY', 'JOY'], minW: 40, minH: 32 },
  };
  const WORDS = ['STAY', 'NO!', 'HELP', 'LOL', 'BUY!', 'WIN!', 'WHY?', 'YES', 'NOPE', 'RUN', 'HI!', 'FREE'];
  const fitTitle = (list, w) => { const n = Math.floor((w - 15) / 6); return list.find((t) => t.length <= n) || ''; };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- iconos de escritorio 1-bit (16x16, dibujo propio): k = tinta, w = papel ----------
  function asc(rows, k, w) { rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = r[x]; if (c === '#') G.px(x, y, k); else if (c === 'o') G.px(x, y, w); } }); }
  const PIC = {
    mail(k, w) { asc(['', '', '', '################', '##oooooooooooo##', '#o#oooooooooo#o#', '#oo#oooooooo#oo#', '#ooo#oooooo#ooo#', '#oooo#oooo#oooo#', '#ooooo#oo#ooooo#', '#oooooo##oooooo#', '#oooooooooooooo#', '#oooooooooooooo#', '################'], k, w); },
    agenda(k, w) { G.rect(1, 2, 14, 13, k); G.rect(2, 7, 12, 7, w); G.rect(4, 0, 1, 4, k); G.rect(11, 0, 1, 4, k); G.px(4, 4, w); G.px(11, 4, w); G.text(String(new Date().getDate()).padStart(2, '0'), 3, 7, k); },
    photos(k, w) { G.rect(1, 2, 14, 12, k); G.rect(2, 3, 12, 10, w); G.circ(10, 5, 1, k, null); G.tri(2, 13, 6, 7, 10, 13, k); G.tri(7, 13, 10, 9, 14, 13, k); },
    camera(k, w) { G.rect(5, 3, 6, 2, k); G.rect(1, 5, 14, 9, k); G.rect(2, 6, 12, 7, w); G.circ(8, 9, 3, w, k); G.rect(7, 8, 3, 3, k); G.px(8, 9, w); G.rect(11, 7, 2, 1, k); },
    screen(k, w) { G.rect(1, 1, 14, 11, k); G.rect(3, 3, 10, 7, w); G.px(4, 4, k); G.px(5, 5, k); G.px(4, 6, k); G.rect(7, 6, 3, 1, k); G.rect(6, 12, 4, 2, k); G.rect(3, 14, 10, 2, k); G.rect(4, 14, 8, 1, w); },
    chart(k, w) { G.rect(1, 1, 14, 14, k); G.rect(2, 2, 12, 12, w); G.rect(3, 3, 1, 10, k); G.rect(3, 12, 10, 1, k); G.line(4, 10, 6, 7, k); G.line(6, 7, 8, 9, k); G.line(8, 9, 12, 4, k); G.px(11, 4, k); G.px(12, 5, k); },
    weather(k, w) { asc(['', '......####......', '.....#oooo#.....', '...###ooooo##...', '..#oooooooooo#..', '.#oooooooooooo#.', '#oooooooooooooo#', '#oooooooooooooo#', '.##############.', '......##........', '.....##.........', '....######......', '.......##.......', '......##........', '.....#..........'], k, w); },
    map(k, w) { G.rect(1, 2, 14, 12, k); G.rect(2, 3, 3, 10, w); G.rect(6, 4, 4, 9, w); G.rect(11, 3, 3, 10, w); G.drect(6, 4, 4, 9, 4, k, null); G.line(3, 11, 7, 8, k); G.line(7, 8, 10, 10, k); G.circ(12, 6, 2, k, null); G.px(12, 6, w); G.px(12, 9, k); },
    clock(k, w) { G.circ(8, 8, 7, w, k); G.line(8, 8, 8, 3, k); G.line(8, 8, 11, 10, k); G.px(13, 8, k); G.px(3, 8, k); G.px(8, 13, k); G.px(8, 2, k); },
    calc(k, w) { G.rect(2, 0, 12, 16, k); G.rect(3, 1, 10, 4, w); G.rect(9, 2, 1, 2, k); G.rect(11, 2, 1, 2, k); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) G.rect(4 + c * 3, 7 + r * 3, 2, 2, w); },
    notes(k, w) { G.rect(2, 1, 12, 15, k); G.rect(3, 4, 10, 11, w); G.px(5, 2, w); G.px(8, 2, w); G.px(11, 2, w); [6, 8, 10, 12].forEach((y, i) => G.rect(4, y, i === 3 ? 5 : 8, 1, k)); },
    setup(k, w) { G.rect(1, 1, 14, 14, k); G.rect(2, 2, 12, 12, w); [[4, 9], [8, 4], [12, 7]].forEach(([x, ky]) => { G.rect(x, 3, 1, 10, k); G.rect(x - 1, ky, 3, 2, k); }); },
    dialer(k, w) { G.rect(1, 3, 14, 3, k); G.rect(1, 6, 3, 2, k); G.rect(12, 6, 3, 2, k); for (let y = 8; y < 15; y++) { const e = Math.floor((y - 8) / 3); G.rect(4 - e, y, 8 + 2 * e, 1, k); } G.circ(8, 11, 2, w, k); G.px(8, 11, k); },
    compass(k, w) { G.circ(8, 8, 7, w, k); G.tri(8, 2, 6, 8, 10, 8, k); G.line(6, 8, 8, 13, k); G.line(10, 8, 8, 13, k); G.px(8, 8, w); },
    tape(k, w) { G.rect(0, 3, 16, 11, k); G.rect(1, 4, 14, 9, w); G.rect(3, 6, 10, 4, k); G.px(5, 7, w); G.px(5, 8, w); G.px(10, 7, w); G.px(10, 8, w); G.rect(4, 11, 8, 2, k); G.px(2, 5, k); G.px(13, 5, k); },
    backup(k, w) { G.rect(1, 1, 14, 14, k); G.rect(4, 1, 8, 5, w); G.rect(9, 2, 2, 3, k); G.rect(3, 8, 10, 6, w); G.rect(4, 10, 8, 1, k); G.rect(4, 12, 6, 1, k); },
    games(k, w) { G.rect(2, 11, 12, 4, k); G.rect(3, 12, 10, 2, w); G.rect(7, 6, 2, 6, k); G.circ(8, 4, 3, w, k); G.rect(11, 9, 2, 2, k); },
    music(k, w) { G.rect(5, 2, 9, 2, k); G.rect(5, 4, 1, 9, k); G.rect(13, 4, 1, 7, k); G.ell(3, 13, 2, 1, k, null); G.ell(11, 11, 2, 1, k, null); },
    copy(k, w) { G.rect(1, 1, 9, 11, k); G.rect(2, 2, 7, 9, w); G.rect(6, 5, 9, 11, k); G.rect(7, 6, 7, 9, w); [8, 10, 12].forEach((y) => G.rect(8, y, 5, 1, k)); },
  };
  const ILABEL = { mail: 'MAIL', agenda: 'AGENDA', photos: 'PHOTOS', camera: 'CAMERA', screen: 'SCREEN', chart: 'CHART', weather: 'WEATHER', map: 'MAP', clock: 'CLOCK', calc: 'CALC', notes: 'NOTES', setup: 'SETUP', dialer: 'DIALER', compass: 'COMPASS', tape: 'TAPE', backup: 'BACKUP', games: 'GAMES', music: 'MUSIC', copy: 'COPY' };
  const PICN = Object.keys(PIC).filter((n) => n !== 'copy');
  const picCache = {};
  function picCanvas(name, k, w) {
    const key = name + k + w; if (picCache[key]) return picCache[key];
    const cv = G.mkCanvas(16, 16), T = G.ctx(); G.target(cv.x);
    try { PIC[name](k, w); } finally { G.target(T); }
    return (picCache[key] = cv.c);
  }
  const haloCache = {};
  function picHalo(name) {
    if (haloCache[name]) return haloCache[name];
    const src = picCanvas(name, K, W).getContext('2d').getImageData(0, 0, 16, 16).data, cv = G.mkCanvas(18, 18);
    const on = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && src[(y * 16 + x) * 4 + 3] > 0;
    cv.x.fillStyle = W;
    for (let y = -1; y < 17; y++) for (let x = -1; x < 17; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) cv.x.fillRect(x + 1, y + 1, 1, 1);
    return (haloCache[name] = cv.c);
  }
  // fondo tramado de cada baldosa (según el bloque de color)
  function tileSchemes(block) {
    const s = [{ lv: 8, on: K, off: W }, { lv: 4, on: K, off: W }];
    if (block >= 1) s.push({ lv: 8, on: B, off: W }, { lv: 6, on: B, off: W });
    if (block >= 2) s.push({ lv: 8, on: Gr, off: K }, { lv: 8, on: Gr, off: W });
    return s;
  }
  const tileCache = {};
  function tileCanvas(name, sch) {
    const key = name + JSON.stringify(sch); if (tileCache[key]) return tileCache[key];
    const cv = G.mkCanvas(TS, TS), T = G.ctx(); G.target(cv.x);
    try {
      G.rect(1, 0, TS - 2, TS, K); G.rect(0, 1, TS, TS - 2, K); // esquinas redondeadas
      G.rect(2, 1, TS - 4, TS - 2, W); G.rect(1, 2, TS - 2, TS - 4, W);
      G.drect(2, 2, TS - 4, TS - 4, sch.lv, sch.on, sch.off);
      G.ctx().drawImage(picHalo(name), 4, 4); // contorno blanco: el dibujo se lee sobre cualquier trama
      G.ctx().drawImage(picCanvas(name, K, W), 5, 5);
    } finally { G.target(T); }
    return (tileCache[key] = cv.c);
  }

  // ---------- reloj de arena que gira (fotogramas rotados píxel a píxel, contorno blanco) ----------
  const HGN = 16, HGS = 26, hgCache = {};
  function hgFrames(sand) {
    if (hgCache[sand]) return hgCache[sand];
    const rows = G.ART.hg1, sw = rows[0].length, sh = rows.length, out = [];
    for (let i = 0; i < HGN; i++) {
      const a = (i / HGN) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), grid = new Uint8Array(HGS * HGS);
      for (let py = 0; py < HGS; py++) for (let px = 0; px < HGS; px++) {
        const dx = px + 0.5 - HGS / 2, dy = py + 0.5 - HGS / 2;
        const c = Math.floor((ca * dx + sa * dy + sw) / 2), r = Math.floor((-sa * dx + ca * dy + sh) / 2);
        if (c < 0 || r < 0 || c >= sw || r >= sh) continue;
        const ch = rows[r][c]; if (ch === '#') grid[py * HGS + px] = 1; else if (ch === 'o') grid[py * HGS + px] = 2;
      }
      const cv = G.mkCanvas(HGS, HGS), x = cv.x;
      for (let py = 0; py < HGS; py++) for (let px = 0; px < HGS; px++) {
        const v = grid[py * HGS + px];
        let col = v === 1 ? K : v === 2 ? sand : null;
        if (!v) { const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < HGS && yy < HGS && grid[yy * HGS + xx]; if (n(px - 1, py) || n(px + 1, py) || n(px, py - 1) || n(px, py + 1)) col = W; }
        if (col) { x.fillStyle = col; x.fillRect(px, py, 1, 1); }
      }
      out.push(cv.c);
    }
    return (hgCache[sand] = out);
  }

  // ---------- utilidades ----------
  const hitR = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function burst(s, x, y, n, col) { for (let i = 0; i < n; i++) s.parts.push({ x, y, vx: G.rand(-60, 60), vy: G.rand(-80, 10), t: 0, life: G.rand(0.25, 0.5), col }); }
  function ghost(s, o) { s.ghosts.push({ x: o.x, y: o.y, w: o.w, h: o.h, t: 0, col: o.st.fr === K ? (s.block === 0 ? W : K) : o.st.fr }); }
  // ventanita: tamaño, estilo, título y contenido variados
  function mkWin(s, kind, o) {
    const pl = pool(s), w = o.w || VW, h = o.h || VH;
    const st = G.WSTYLES[kind === 'armor' ? pl.armor : kind === 'copy' ? pl.copy : G.pick(pl.basic)];
    let wk = 'err', title;
    if (kind === 'basic') {
      const ok = Object.keys(WKIND).filter((k) => w >= WKIND[k].minW && h >= WKIND[k].minH);
      wk = G.pick(ok.length ? ok : ['load']); title = fitTitle(WKIND[wk].t, w);
    } else title = kind === 'armor' ? fitTitle(['LOCKED', 'LOCK', '!!'], w) : kind === 'copy' ? fitTitle(['COPY', 'x2'], w) : 'AGAIN';
    const words = WORDS.filter((t) => G.textW(t, 1, 1, true) <= w - 8);
    return Object.assign({ kind, ico: false, wk, st, title, hp: 1, max: 1, flash: 0, crack: G.rand(0, 6), seed: Math.random(), word: G.pick(words.length ? words : ['NO']), pic: G.pick(PICN), stripes: Math.random() < 0.5, st8: 'form', et: 0 }, o, { w, h });
  }
  // icono de escritorio (rondas pares)
  function mkIcon(s, kind, o) {
    const name = kind === 'copy' ? 'copy' : o.name || G.pick(PICN), lbl = ILABEL[name];
    const w = Math.max(TS, G.textW(lbl) + 2);
    const sch = kind === 'copy' ? { lv: 8, on: s.block >= 2 ? Gr : s.block >= 1 ? B : K, off: W } : G.pick(tileSchemes(s.block));
    return Object.assign({ kind, ico: true, name, lbl, sch, hp: 1, max: 1, flash: 0, crack: G.rand(0, 6), st: { fr: W, bar: s.block >= 2 ? Gr : s.block >= 1 ? B : W }, st8: 'form', et: 0 }, o, { w, h: IH });
  }
  function newBall(s, x, y, vx, vy, held) { const b = { x, y, vx, vy, held: !!held, trail: [], ang: 0, spin: 0 }; s.balls.push(b); return b; }

  G.MICRO.popbreaker = {
    mode: 'desk', cmd: 'BREAK!', hint: 'DRAG TO MOVE - BREAK THE POP-UPS', time: 10, fx: 0.5,
    help: ['DRAG ANYWHERE TO MOVE', 'THE START BUTTON. BOUNCE', 'THE SPINNING HOURGLASS AND', 'BREAK POP-UPS AND ICONS.'],
    init(s) {
      const r = s.r, d = s.d, pl = pool(s);
      s.ptr = null; s.parts = []; s.ghosts = []; s.balls = []; s.ens = []; s.xs = []; s.kills = 0; s.clearT = -1; s.dead = false; s.pops = [];
      s.spd = 240 + 70 * d; s.spd0 = s.spd; // más lenta que antes (~30 %)
      const pw = Math.round(58 - 8 * d);
      s.pd = { x: Math.round(r.x + r.w / 2 - pw / 2), y: r.y + r.h - 16, w: pw, h: 12, frz: 0, bump: 0, col: pl.pad };
      newBall(s, s.pd.x + pw / 2, s.pd.y - BR - 1, 0, 0, true);
      s.launchT = 0.45;
      if (s.boss) { this.initBoss(s); return; }
      s.icons = (s.round || 1) % 2 === 0; // rondas pares: iconos de escritorio
      if (s.icons) s.hint = 'DRAG TO MOVE - BREAK THE ICONS';
      const m = 3; s.m = m;
      let plan;
      if (s.icons) { // pantalla de inicio: 4 columnas
        plan = [{ type: 'grid', n: 4 }, { type: 'grid', n: 3 }, { type: 'grid', n: 4 }];
        if (d >= 0.25) plan.splice(1, 0, { type: 'slide', n: 2 });
      } else { // muro de ventanitas casi pegadas y filas que patinan
        plan = [{ type: 'grid', n: 4 }, { type: 'grid', n: 4 }];
        if (d >= 0.1) plan[0].n = 5;
        if (d >= 0.25) plan.splice(1, 0, { type: 'slide', n: 2 });
        if (d >= 0.4) plan[1].n = 3;
        if (d >= 0.55) plan.push({ type: 'slide', n: 2 });
      }
      const names = shuffle(PICN.slice()); let ni = 0;
      const mk = (kind, o) => (s.icons ? mkIcon(s, kind, Object.assign({ name: names[ni++ % names.length] }, o)) : mkWin(s, kind, o));
      let oy = 0;
      s.rows = plan.map((p, i) => {
        const row = { type: p.type, i, oy };
        if (s.icons) {
          row.h = IH;
          if (p.type === 'slide') {
            const items = []; for (let k = 0; k < p.n; k++) items.push(mk('basic', { row: i }));
            let x = 0; items.forEach((e) => { e.ox = x; x += e.w + 26; }); row.span = x - 26; s.ens.push(...items);
          } else {
            const cols = shuffle([0, 1, 2, 3]).slice(0, p.n).sort((a, b) => a - b);
            for (const k of cols) { const e = mk('basic', { row: i }); e.cx = Math.round(r.x + (r.w * (k + 0.5)) / 4); e.gx = e.cx - Math.round(e.w / 2); s.ens.push(e); }
          }
        } else {
          const h = row.h = G.pick(i === 0 ? [28, 32] : HSET);
          if (p.type === 'slide') {
            const items = []; let x = 0;
            for (let k = 0; k < p.n; k++) { const e = mk('basic', { row: i, w: G.pick(WSET.slice(0, 4)), h }); e.ox = x; x += e.w + SLIDE_GAP; items.push(e); }
            row.span = x - SLIDE_GAP; s.ens.push(...items);
          } else {
            // trozos de anchos distintos que llenan la fila; luego se quitan algunos
            const avail = r.w - 2 * m, segs = []; let x = 0;
            for (;;) { const fits = WSET.filter((w) => x + w <= avail); if (!fits.length) break; const w = G.pick(fits); segs.push({ x, w }); x += w + 2; }
            const off = Math.round(r.x + m + (avail - (x - 2)) / 2);
            const pick = shuffle(segs.slice()).slice(0, p.n).sort((a, b) => a.x - b.x);
            for (const q of pick) { const e = mk('basic', { row: i, w: q.w, h }); e.gx = off + q.x; s.ens.push(e); }
          }
        }
        if (p.type === 'slide') { row.x = G.rand(r.x + 4, r.x + r.w - 4 - row.span); row.v = (28 + 48 * d) * (i % 2 ? -1 : 1) * G.rand(0.85, 1.15); }
        oy += row.h + ROWG;
        return row;
      });
      s.fy = Math.round(r.y + r.h * 0.5 - (oy - ROWG)); // la formación acaba a media pantalla: ciclos cortos
      // blindadas (2-3 golpes) arriba; una COPY (pelota extra) desde la ronda 3
      const keep = (e) => ({ row: e.row, w: e.w, h: e.h, gx: e.gx, ox: e.ox, cx: e.cx, name: e.name });
      const fix = (e) => { if (e.cx != null) e.gx = e.cx - Math.round(e.w / 2); };
      const armors = d >= 0.1 ? 1 + Math.floor(d * 2.2) : 0;
      const grid = s.ens.filter((e) => s.rows[e.row].type === 'grid').sort((a, b) => a.row - b.row || Math.random() - 0.5);
      grid.slice(0, armors).forEach((e) => { Object.assign(e, (s.icons ? mkIcon : mkWin)(s, 'armor', keep(e))); e.hp = e.max = d >= 0.4 ? 3 : 2; fix(e); });
      if (d >= 0.25) { const c = s.ens.filter((e) => e.kind === 'basic' && s.rows[e.row].type === 'grid'); if (c.length) { const e = c[c.length - 1]; Object.assign(e, (s.icons ? mkIcon : mkWin)(s, 'copy', keep(e))); fix(e); } }
      s.ens.forEach((e, k) => { e.st8 = 'enter'; e.et = -k * 0.04; Object.assign(e, this.slotPos(s, e)); });
      s.total = s.ens.length;
      // cuota: hay que romper casi todas (las últimas sueltas cuestan mucho); el resto se cierra solo al ganar
      s.need = s.total - 3 - (d >= 0.55 ? 1 : 0);
      const extra = s.ens.reduce((a, e) => a + e.hp - 1, 0);
      s.T = (5 + s.need * (2.1 - 0.45 * d) + extra * 0.8) * (s.icons ? 1.15 : 1); // la pelota va más despacio: más tiempo (entre iconos se cuela más)
    },
    initBoss(s) {
      const r = s.r, w = Math.min(124, r.w - 40), h = 72, pl = pool(s);
      s.bo = { st: G.WSTYLES[pl.boss], title: 'FATAL.ERR', x: r.x + r.w / 2 - w / 2, y: r.y - h - 10, y0: r.y + 2, w, h, hp: 5, max: 5, ph: 'enter', pt: 0, ang: 0, flash: 0, rage: false, dying: -1, spawnT: 0.6, dropT: 2.2, tele: 0, spawned: 0 };
      s.slots = [0, 1, 2].map((k) => ({ x: r.x + 10 + k * ((r.w - 20 - VW) / 2), y: s.bo.y0 + h + 6, e: null })); // escudo pegado debajo: la pelota no cabe entre los dos
      s.T = 40;
      s.launchT = 1.3; // la pelota sale cuando el jefe ya ha bajado
    },
    slotPos(s, e) {
      const row = s.rows[e.row], y = s.fy + row.oy + Math.round((row.h - e.h) / 2);
      if (row.type === 'slide') return { x: row.x + e.ox, y };
      return { x: e.gx, y };
    },
    // ---------- entrada: arrastre relativo con un dedo ----------
    down(s, x, y, e) { s.ptr = { id: e ? e.pointerId : 1, x, y }; },
    move(s, x, y, e) {
      const p = s.ptr; if (!p || (e && e.pointerId !== p.id)) return;
      const r = s.r, pd = s.pd;
      pd.x = G.clamp(pd.x + (x - p.x) * 1.3 * (pd.frz > 0 ? 0.35 : 1), r.x + 1, r.x + r.w - pd.w - 1); // si le da una X va a cámara lenta (NOT RESPONDING)
      p.x = x; p.y = y;
    },
    up(s, x, y, e) { if (s.ptr && (!e || e.pointerId === s.ptr.id)) s.ptr = null; },
    // ---------- lógica ----------
    update(s, dt) {
      const r = s.r, pd = s.pd;
      for (const q of s.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; }
      s.parts = s.parts.filter((q) => q.t < q.life);
      s.ghosts.forEach((g) => (g.t += dt)); s.ghosts = s.ghosts.filter((g) => g.t < 0.18);
      for (const p of s.pops) p.t += dt; s.pops = s.pops.filter((p) => p.t < 0.7);
      if (pd.frz > 0) pd.frz -= dt; if (pd.bump > 0) pd.bump -= dt;
      for (const b of s.balls) if (!b.held) b.ang += b.spin * dt;
      if (s.dead) return;
      if (s.clearT >= 0) { // las que quedan se cierran solas, una tras otra
        s.clearT += dt;
        for (const e of s.ens) if (!e.dead && s.clearT >= e.closeAt) { e.dead = true; ghost(s, e); burst(s, e.x + e.w / 2, e.y + 6, 4, e.st.fr === K ? W : e.st.fr); A().sfx('close', Math.min(9, ++s.kills)); }
        if (s.clearT > s.clearEnd) s.win();
        return;
      }
      // filas que patinan
      if (!s.boss) for (const row of s.rows) if (row.type === 'slide') {
        row.x += row.v * dt;
        if (row.x < r.x + 4) { row.x = r.x + 4; row.v = Math.abs(row.v); } else if (row.x + row.span > r.x + r.w - 4) { row.x = r.x + r.w - 4 - row.span; row.v = -Math.abs(row.v); }
      }
      for (const e of s.ens) {
        if (e.flash > 0) e.flash -= dt;
        if (e.st8 === 'enter') { e.et += dt; if (e.et >= 0 && !e.pop) { e.pop = true; A().sfx('spawn', G.irand(0, 2)); } if (e.et >= 0.12) e.st8 = 'form'; }
        else if (e.st8 === 'fly') { e.ft += dt; const k = G.clamp(e.ft / 0.35, 0, 1); e.x = G.lerp(e.fx, e.slot.x, k); e.y = G.lerp(e.fy, e.slot.y, k); if (k >= 1) e.st8 = 'form'; }
        if (!s.boss && e.st8 !== 'fly') { const p = this.slotPos(s, e); e.x = p.x; e.y = p.y; }
      }
      if (s.boss) this.updateBoss(s, dt);
      // pelotas: la primera espera encima de la pala
      s.launchT -= dt;
      for (const b of s.balls) {
        if (b.held) {
          b.x = pd.x + pd.w / 2; b.y = pd.y - BR - 1; b.ang = 0;
          if (s.launchT <= 0) { const a = G.rand(0.2, 0.5) * (Math.random() < 0.5 ? -1 : 1); b.vx = Math.sin(a) * s.spd; b.vy = -Math.cos(a) * s.spd; b.held = false; b.spin = a < 0 ? -7 : 7; A().sfx('bounce', 0); }
          continue;
        }
        b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 4) b.trail.pop();
        const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 3));
        for (let i = 0; i < n && !b.gone; i++) this.stepBall(s, b, dt / n);
        if (s.dead || s.clearT >= 0) return;
      }
      s.balls = s.balls.filter((b) => !b.gone);
      if (!s.balls.length && !s.done) { s.dead = true; G.vibrate(60); G.pulse({ shake: 5, glitch: 0.6 }); s.fail('BALL LOST'); return; }
      // ventanitas cerradas
      for (let i = s.ens.length - 1; i >= 0; i--) if (s.ens[i].dead) s.ens.splice(i, 1);
      if (!s.boss && s.kills >= s.need) {
        s.clearT = 0; s.ens.forEach((e, k) => (e.closeAt = 0.08 + k * 0.07)); s.clearEnd = 0.35 + s.ens.length * 0.07;
        s.T = Math.max(s.T, s.t + s.clearEnd + 0.3);
        s.pops.push({ x: s.r.x + s.r.w / 2, y: s.pd.y - 30, txt: 'ALL CLOSED', t: 0 }); A().sfx('combo'); G.pulse({ ab: 3 });
      }
    },
    stepBall(s, b, dt) {
      const r = s.r, pd = s.pd;
      const ox = b.x, oy = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      // paredes y techo (el giro cambia de sentido al rebotar)
      if (b.x - BR < r.x) { b.x = r.x + BR; b.vx = Math.abs(b.vx); b.spin = -b.spin; A().sfx('tap'); }
      else if (b.x + BR > r.x + r.w) { b.x = r.x + r.w - BR; b.vx = -Math.abs(b.vx); b.spin = -b.spin; A().sfx('tap'); }
      if (b.y - BR < r.y) { b.y = r.y + BR; b.vy = Math.abs(b.vy); b.spin = -b.spin; A().sfx('tap'); }
      // la pala: el ángulo (y el giro) depende de dónde toca
      if (b.vy > 0 && b.y + BR >= pd.y && oy + BR <= pd.y + 3 && b.x + BR >= pd.x - 1 && b.x - BR <= pd.x + pd.w + 1) {
        const off = G.clamp((b.x - (pd.x + pd.w / 2)) / (pd.w / 2 + BR), -1, 1), a = off * 1.05;
        s.spd = Math.min(s.spd0 * 1.22, s.spd * 1.015);
        b.vx = Math.sin(a) * s.spd; b.vy = -Math.cos(a) * s.spd; b.y = pd.y - BR - 0.5;
        b.spin = (off < 0 ? -1 : 1) * (5 + Math.abs(off) * 7);
        pd.bump = 0.1; A().sfx('bounce', Math.abs(off) * 2); G.vibrate(5);
        return;
      }
      if (b.y - BR > r.y + r.h + 4) { b.gone = true; burst(s, b.x, r.y + r.h, 6, W); return; }
      const bb = { x: b.x - BR, y: b.y - BR, w: BR * 2, h: BR * 2 };
      // ventanitas e iconos
      for (const e of s.ens) {
        if (e.dead || e.st8 === 'enter' && e.et < 0.04 || !hitR(bb, e)) continue;
        this.bounceOff(b, e, ox, oy);
        this.hitPop(s, e, b);
        return;
      }
      // el jefe
      const bo = s.bo;
      if (bo && bo.ph !== 'enter' && bo.dying < 0 && hitR(bb, bo)) { this.bounceOff(b, bo, ox, oy); this.hitBoss(s, b); }
    },
    bounceOff(b, o, ox, oy) { // sale por el lado por el que entró (sin pegarse a ventanas que se mueven)
      const wasX = ox + BR > o.x && ox - BR < o.x + o.w, wasY = oy + BR > o.y && oy - BR < o.y + o.h;
      let horiz;
      if (wasY && !wasX) horiz = true; else if (wasX && !wasY) horiz = false;
      else { const dx = Math.min(b.x + BR - o.x, o.x + o.w - (b.x - BR)), dy = Math.min(b.y + BR - o.y, o.y + o.h - (b.y - BR)); horiz = dx < dy; }
      if (horiz) { const sg = b.x < o.x + o.w / 2 ? -1 : 1; b.vx = sg * Math.abs(b.vx); b.x = sg < 0 ? o.x - BR - 0.5 : o.x + o.w + BR + 0.5; }
      else { const sg = b.y < o.y + o.h / 2 ? -1 : 1; b.vy = sg * Math.abs(b.vy); b.y = sg < 0 ? o.y - BR - 0.5 : o.y + o.h + BR + 0.5; }
      b.spin = -b.spin * G.rand(0.9, 1.2);
      if (Math.abs(b.spin) < 4) b.spin = (b.spin < 0 ? -1 : 1) * 6; else if (Math.abs(b.spin) > 13) b.spin *= 0.7;
    },
    hitPop(s, e, b) {
      e.hp--; e.flash = 0.08;
      if (e.hp > 0) { A().sfx('hit'); burst(s, b.x, b.y, 2, e.ico ? W : e.st.fr); return; }
      e.dead = true; s.kills++; ghost(s, e);
      burst(s, e.x + e.w / 2, e.y + 6, 5, e.st.bar === K ? (s.block === 0 ? W : e.st.fr) : e.st.bar);
      A().sfx('close', Math.min(9, s.kills)); G.pulse({ ab: 1.5 }); G.vibrate(6);
      if (e.slot && e.slot.e === e) e.slot.e = null;
      if (e.kind === 'copy') { // COPY: sale otra pelota
        const a = Math.atan2(b.vy, b.vx) + (Math.random() < 0.5 ? -0.7 : 0.7);
        let vy = Math.sin(a) * s.spd; if (Math.abs(vy) < s.spd * 0.45) vy = -s.spd * 0.6;
        const nb = newBall(s, e.x + e.w / 2, e.y + e.h / 2, Math.cos(a) * s.spd, vy); nb.spin = -b.spin || 7;
        s.pops.push({ x: e.x + e.w / 2, y: e.y, txt: 'COPIED x2', t: 0 }); A().sfx('combo');
      }
    },
    // ---------- jefe: la ventana FATAL.ERR ----------
    updateBoss(s, dt) {
      const r = s.r, bo = s.bo, pd = s.pd;
      if (bo.flash > 0) bo.flash -= dt;
      if (bo.dying >= 0) {
        bo.dying += dt;
        if (Math.random() < dt * 14) { const gw = G.irand(20, 50), gh = G.irand(14, 34); s.ghosts.push({ x: bo.x + G.rand(0, bo.w - gw), y: bo.y + G.rand(0, bo.h - gh), w: gw, h: gh, t: 0, col: W }); burst(s, bo.x + Math.random() * bo.w, bo.y + Math.random() * bo.h, 4, G.pick([W, bo.st.bd])); A().sfx('close', G.irand(3, 9)); }
        if (bo.dying > 1.15 && !bo.gone) { bo.gone = true; ghost(s, bo); s.balls = []; s.win(); }
        return;
      }
      bo.pt += dt;
      if (bo.ph === 'enter') { bo.y = G.lerp(r.y - bo.h - 10, bo.y0, G.clamp(bo.pt / 1.1, 0, 1)); if (bo.pt > 1.1) { bo.ph = 'live'; } }
      else {
        const amp = (r.w - bo.w) / 2 - 4;
        bo.ang += dt * (bo.rage ? 0.95 : 0.6);
        bo.x = r.x + r.w / 2 - bo.w / 2 + Math.sin(bo.ang) * amp;
        bo.y = bo.y0 + (1 + Math.sin(s.t * 1.6)) * 1.5; // pegado arriba: la pelota no se cuela por encima
        // suelta ventanitas AGAIN que hacen de escudo (y de vez en cuando una COPY)
        bo.spawnT -= dt;
        const free = s.slots.filter((q) => !q.e);
        if (bo.spawnT <= 0 && free.length) {
          bo.spawnT = bo.rage ? 1.9 : 2.6;
          const q = free.sort((a, b) => Math.abs(a.x - bo.x) - Math.abs(b.x - bo.x))[0];
          bo.spawned++;
          const e = mkWin(s, bo.spawned % 4 === 0 ? 'copy' : 'mini', { w: VW, h: VH, st8: 'fly', ft: 0, fx: bo.x + bo.w / 2 - VW / 2, fy: bo.y + bo.h - VH, slot: q });
          e.x = e.fx; e.y = e.fy; q.e = e; s.ens.push(e); A().sfx('spawn', G.irand(0, 2));
        }
        // avisa y suelta una X sobre la pala
        if (bo.tele > 0) { bo.tele -= dt; if (bo.tele <= 0) { const n = bo.rage ? 2 : 1; for (let i = 0; i < n; i++) s.xs.push({ x: bo.x + bo.w / 2 + (n > 1 ? (i ? 14 : -14) : 0), y: bo.y + bo.h, vy: 120 + (bo.rage ? 30 : 0) }); A().sfx('zap'); } }
        else { bo.dropT -= dt; if (bo.dropT <= 0) { bo.dropT = (bo.rage ? 2.2 : 3.0) * G.rand(0.8, 1.2); bo.tele = 0.5; A().sfx('warn'); } }
      }
      // las X caen: si dan a la pala, se queda colgada un momento
      for (const q of s.xs) {
        q.y += q.vy * dt;
        if (!q.gone && hitR({ x: q.x - 5, y: q.y - 5, w: 10, h: 10 }, pd)) { q.gone = true; pd.frz = 1.0; A().sfx('deny'); G.pulse({ shake: 3, glitch: 0.4 }); G.vibrate(40); burst(s, q.x, q.y, 5, W); }
      }
      s.xs = s.xs.filter((q) => !q.gone && q.y < r.y + r.h + 10);
    },
    hitBoss(s, b) {
      const bo = s.bo;
      bo.hp--; bo.flash = 0.1; burst(s, b.x, b.y, 4, W); A().sfx('hit'); G.pulse({ glitch: 0.5, ab: 3 }); G.vibrate(20);
      if (!bo.rage && bo.hp <= bo.max / 2) { bo.rage = true; bo.st = G.WSTYLES[pool(s).rage]; bo.title = 'FATAL.ERR!!'; G.pulse({ glitch: 0.9, ab: 4 }); A().sfx('alarm'); }
      if (bo.hp <= 0) {
        bo.dying = 0; s.xs = []; s.balls.forEach((q) => { if (q !== b) q.gone = true; }); b.vx *= 0.3; b.vy = Math.abs(b.vy) * 0.3;
        for (const e of s.ens) { e.dead = true; ghost(s, e); }
        s.T = Math.max(s.T, s.t + 1.6); A().sfx('boom'); G.pulse({ flash: 0.3, flashCol: W, shake: 6, glitch: 1 }); G.vibrate(120);
      }
    },
    // ---------- dibujo ----------
    okBtn(rr, st, lbl) {
      const bw = 18, bx = rr.x + rr.w - bw - 2, by = rr.y + Math.floor((rr.h - 9) / 2);
      G.rect(bx, by, bw, 9, st.bd); G.box(bx, by, bw, 9, st.tx); G.text(lbl, bx + 9, by + 1, st.tx, { al: 'c' });
    },
    drawBody(s, e, rr) { // contenido de cada tipo de ventanita (ideas de ventanas de los 90, dibujo propio)
      const st = e.st, cy = rr.y + Math.floor((rr.h - 9) / 2), hash = (i) => (Math.floor(e.seed * 997) * 31 + i * 17) % 7;
      if (e.kind === 'armor') { // blindada: candado y un cuadrito por cada golpe que le queda
        G.box(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2, st.tx);
        const ly = rr.y + Math.floor((rr.h - 7) / 2);
        G.drawSpr('lock', rr.x + 3, ly, { '#': st.ac });
        for (let i = 0; i < e.hp; i++) G.rect(rr.x + 12 + i * 5, ly + 2, 3, 3, st.tx);
        if (rr.w >= 12 + e.max * 5 + 22) this.okBtn(rr, st, 'OK');
        return;
      }
      if (e.kind === 'copy') { const oy = rr.y + Math.max(0, Math.floor((rr.h - 9) / 2)); G.box(rr.x + 3, oy, 8, 6, st.tx); G.rect(rr.x + 6, oy + 3, 8, 6, st.bd); G.box(rr.x + 6, oy + 3, 8, 6, st.tx); this.okBtn(rr, st, 'x2'); return; }
      if (e.kind === 'mini') { G.drawSpr('xcirc', rr.x + 3, cy, { '#': st.ac }); this.okBtn(rr, st, 'OK'); return; }
      switch (e.wk) {
        case 'err': G.drawSpr('xcirc', rr.x + 3, cy, { '#': st.ac }); this.okBtn(rr, st, 'OK'); break;
        case 'warn': G.drawSpr('warn', rr.x + 3, rr.y + Math.floor((rr.h - 10) / 2), { '#': st.ac }); this.okBtn(rr, st, 'OK'); break;
        case 'load': {
          const bx = rr.x + 2, bw = rr.w - 4, by = rr.y + Math.floor((rr.h - 7) / 2), n = Math.floor((bw - 3) / 4), p = (s.t * 0.35 + e.seed) % 1;
          G.box(bx, by, bw, 7, st.tx); for (let i = 0; i < Math.floor(n * p); i++) G.rect(bx + 2 + i * 4, by + 2, 3, 3, st.ac);
          break; }
        case 'mine': {
          const cols = Math.floor((rr.w - 3) / 5), rows = Math.floor((rr.h - 1) / 5), x0 = rr.x + Math.floor((rr.w - cols * 5 - 1) / 2), y0 = rr.y + Math.floor((rr.h - rows * 5 - 1) / 2);
          for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
            const cx = x0 + i * 5, cy2 = y0 + j * 5, h = hash(i + j * 9);
            G.box(cx, cy2, 6, 6, st.tx);
            if (h === 0) G.rect(cx + 2, cy2 + 2, 2, 2, st.tx); else if (h < 3) G.drect(cx + 1, cy2 + 1, 4, 4, 8, st.ac === st.bd ? st.tx : st.ac, null);
          }
          break; }
        case 'pass': {
          const fy = cy, n = Math.min(5, Math.floor((rr.w - 12) / 6));
          G.rect(rr.x + 2, fy, rr.w - 4, 9, st.bd); G.box(rr.x + 2, fy, rr.w - 4, 9, st.tx); G.text('*'.repeat(n), rr.x + 4, fy + 2, st.tx);
          if (Math.floor(G.time * 3) % 2) G.rect(rr.x + 4 + n * 6, fy + 2, 1, 5, st.tx);
          break; }
        case 'hg': G.drawSpr(Math.floor(G.time * 3) % 2 ? 'hg1' : 'hg2', rr.x + 3, cy, { '#': st.tx, o: st.ac }); G.text('WAIT', rr.x + 13, cy + 1, st.tx); break;
        case 'icon': {
          G.ctx().drawImage(picCanvas(e.pic, st.tx, st.bd), rr.x + 2, rr.y + Math.floor((rr.h - 16) / 2));
          for (let i = 0; i < 3; i++) G.rect(rr.x + 21, rr.y + 4 + i * 4, rr.w - 25 - ((i * 5) % 9), 1, st.tx);
          break; }
        case 'word':
          if (rr.h >= 13) { G.rect(rr.x + 2, rr.y + 2, rr.w - 4, rr.h - 4, st.tx); G.text(e.word, rr.x + rr.w / 2, rr.y + Math.floor((rr.h - 7) / 2), st.bd, { al: 'c', b: true }); }
          else G.text(e.word, rr.x + rr.w / 2, rr.y + 1, st.tx, { al: 'c', b: true });
          break;
        case 'text': { const n = Math.floor((rr.h - 2) / 3); for (let i = 0; i < n; i++) G.rect(rr.x + 3, rr.y + 2 + i * 3, rr.w - 6 - ((i * 7 + Math.floor(e.seed * 9)) % 10), 1, st.tx); break; }
        case 'smile': {
          const sw = G.sprW('smiley'), sh = G.sprH('smiley'), sx = rr.x + Math.floor((rr.w - sw) / 2), sy = rr.y + Math.floor((rr.h - sh) / 2);
          G.drawSpr('smiley', sx, sy, { '#': st.tx, o: st.ac });
          for (const [hx, hy] of [[sx - 3, rr.y], [sx + sw + 1, rr.y], [sx - 3, rr.y + rr.h - 2], [sx + sw + 1, rr.y + rr.h - 2]]) G.rect(hx, hy, 2, 2, st.tx);
          break; }
      }
    },
    drawPop(s, e) {
      if (e.ico) { this.drawIcon(s, e); return; }
      let x = Math.round(e.x), y = Math.round(e.y);
      if (e.st8 === 'enter') {
        if (e.et < 0) return;
        const k = Math.min(1, e.et / 0.12), ww = Math.max(4, e.w * k), hh = Math.max(3, e.h * k);
        G.box(x + (e.w - ww) / 2, y + (e.h - hh) / 2, ww, hh, e.st.fr === K ? K : e.st.fr); return;
      }
      if (e.flash > 0) x += G.irand(-1, 1);
      const st = e.st;
      const rr = G.drawFrame({ x, y, w: e.w, h: e.h, st, title: e.title, stripes: e.stripes, xmode: 'x' });
      this.drawBody(s, e, rr);
      if (e.max > 1 && e.hp < e.max) {
        const n = e.max - e.hp, c0 = e.crack;
        for (let i = 0; i < n; i++) { const cx0 = x + 8 + ((c0 * 7 + i * 17) % Math.max(1, e.w - 16)); G.line(cx0, y + 1, cx0 + 4, y + 9, st.tx); G.line(cx0 + 4, y + 9, cx0 - 1, y + 17, st.tx); G.line(cx0 - 1, y + 17, cx0 + 5, y + e.h - 2, st.tx); }
      }
      if (e.flash > 0) G.drect(x, y, e.w, e.h, 8, W, null);
    },
    drawIcon(s, e) {
      let x = Math.round(e.x), y = Math.round(e.y);
      const tx = x + Math.round((e.w - TS) / 2);
      if (e.st8 === 'enter') {
        if (e.et < 0) return;
        const k = Math.min(1, e.et / 0.12), ww = Math.max(4, TS * k);
        G.box(tx + (TS - ww) / 2, y + (TS - ww) / 2, ww, ww, W); return;
      }
      const jx = e.flash > 0 ? G.irand(-1, 1) : 0;
      G.ctx().drawImage(tileCanvas(e.name, e.sch), tx + jx, y);
      if (e.max > 1 && e.hp < e.max) { // grietas
        for (let i = 0; i < e.max - e.hp; i++) { const cx0 = tx + 6 + ((Math.floor(e.crack * 7) + i * 9) % 13); G.line(cx0 + 1, y + 2, cx0 + 4, y + 11, W); G.line(cx0, y + 2, cx0 + 3, y + 11, K); G.line(cx0 + 3, y + 11, cx0 - 1, y + 23, K); }
      }
      if (e.max > 1) { // globo con los golpes que le quedan (como una notificación)
        const cx = tx + TS - 2, cy = y + 2, bg = s.block >= 2 ? Gr : s.block >= 1 ? B : K, fg = s.block >= 2 ? K : W;
        G.circ(cx, cy, 5, bg, s.block === 0 ? W : K); G.text(String(e.hp), cx - 2, cy - 3, fg);
      }
      // etiqueta debajo, en blanco con contorno negro
      const lx = x + Math.round(e.w / 2), ly = y + TS + 2;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) G.text(e.lbl, lx + dx, ly + dy, K, { al: 'c' });
      G.text(e.lbl, lx, ly, e.kind === 'copy' && s.block >= 2 ? Gr : W, { al: 'c' });
      if (e.flash > 0) G.drect(tx, y, TS, TS, 8, W, null);
    },
    drawBall(s, b) {
      // estela tramada y el reloj de arena girando sobre sí mismo (contorno blanco: se ve en cualquier fondo)
      b.trail.forEach((q, i) => { if (i % 2) return; const c = s.block >= 2 ? Gr : W; G.drect(Math.round(q.x) - 3, Math.round(q.y) - 3, 6, 6, 8 - i * 2, c, null); });
      const fr = hgFrames(s.block >= 2 ? Gr : B), a = ((b.ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      G.ctx().drawImage(fr[Math.round((a / (Math.PI * 2)) * HGN) % HGN], Math.round(b.x) - HGS / 2, Math.round(b.y) - HGS / 2);
    },
    drawPaddle(s) {
      const pd = s.pd, c = pd.col, x = Math.round(pd.x), y = pd.y, frz = pd.frz > 0;
      const shx = frz ? G.irand(-1, 1) : 0;
      G.rect(x + 2 + shx, y + 2, pd.w, pd.h, K);
      const pressed = pd.bump > 0;
      G.rect(x + shx, y, pd.w, pd.h, pressed ? c.fg : c.bg); G.box(x + shx, y, pd.w, pd.h, c.fg); G.box(x - 1 + shx, y - 1, pd.w + 2, pd.h + 2, c.bg === K ? (s.block >= 2 ? K : W) : K);
      const ink = pressed ? c.bg : c.fg;
      if (frz) { // NOT RESPONDING: reloj de arena y WAIT
        G.drawSpr(Math.floor(G.time * 6) % 2 ? 'hg1' : 'hg2', x + pd.w / 2 - 17 + shx, y + 2, { '#': ink, o: ink });
        G.text('WAIT', x + pd.w / 2 - 6 + shx, y + 3, ink);
        return;
      }
      const lw = 9 + 3 + G.textW('START'), lx = Math.round(x + pd.w / 2 - lw / 2);
      G.drawSpr('eyelogo', lx, y + 3, { '#': ink });
      G.text('START', lx + 12, y + 3, ink);
    },
    draw(s) {
      const r = s.r;
      if (s.icons) G.drect(r.x, r.y, r.w, r.h, 3, W, K); // fondo de trama fina, como una pantalla de inicio 1-bit
      if (s.boss) this.drawBoss(s);
      for (const e of s.ens) if (!e.dead) this.drawPop(s, e);
      for (const gh of s.ghosts) { const k = 1 - gh.t / 0.18; for (let i = 0; i < 2; i++) { const kk = k - i * 0.25; if (kk <= 0) continue; const ww = gh.w * kk, hh = gh.h * kk; G.box(gh.x + (gh.w - ww) / 2, gh.y + (gh.h - hh) / 2, ww, hh, gh.col); } }
      for (const q of s.xs) { const x = Math.round(q.x), y = Math.round(q.y); G.rect(x - 5, y - 5, 11, 11, W); G.box(x - 5, y - 5, 11, 11, K); G.line(x - 3, y - 3, x + 3, y + 3, K); G.line(x + 3, y - 3, x - 3, y + 3, K); }
      this.drawPaddle(s);
      for (const b of s.balls) this.drawBall(s, b);
      for (const q of s.parts) G.rect(Math.round(q.x), Math.round(q.y), 2, 2, q.col);
      for (const p of s.pops) { const y = Math.round(p.y - 8 - p.t * 22), tw = G.textW(p.txt, 1, 1, true) + 6; G.rect(Math.round(p.x - tw / 2), y - 2, tw, 11, K); G.text(p.txt, Math.round(p.x), y, W, { al: 'c', b: true }); }
      if (!s.boss) {
        const t = 'BREAK ' + G.pad(Math.max(0, s.need - s.kills), 2), tw = G.textW(t, 1, 1, true) + 6;
        G.rect(r.x + r.w - tw - 2, r.y + 2, tw, 10, K); G.text(t, r.x + r.w - 5, r.y + 4, W, { al: 'r', b: true });
      }
    },
    drawBoss(s) {
      const bo = s.bo;
      if (bo.gone || bo.dying >= 0 && Math.floor(bo.dying * 18) % 2) return;
      const st = bo.st, x = Math.round(bo.x) + (bo.dying >= 0 || bo.flash > 0 ? G.irand(-2, 2) : 0), y = Math.round(bo.y);
      const r = G.drawFrame({ x, y, w: bo.w, h: bo.h, st, title: bo.title, stripes: true, xmode: 'x' });
      const hot = s.block >= 2 ? Gr : W;
      G.drawSpr('xcirc', r.x + 4, r.y + 4, { '#': bo.flash > 0 ? hot : st.ac }, 2);
      G.text('FATAL ERROR', r.x + 26, r.y + 5, st.tx, { b: true });
      G.text(bo.rage ? 'NOT RESPONDING' : 'POP-UPS: 9999', r.x + 26, r.y + 15, st.tx);
      // aviso antes de soltar la X
      if (bo.tele > 0 && Math.floor(bo.tele * 14) % 2) { G.rect(x + bo.w / 2 - 5, y + bo.h + 2, 10, 11, K); G.text('!', x + bo.w / 2, y + bo.h + 4, W, { al: 'c', b: true }); }
      // barra de errores que quedan
      const bw = r.w - 12, f = Math.round((bw - 2) * Math.max(0, bo.hp) / bo.max);
      G.text('ERRORS', r.x + 6, r.y + r.h - 20, st.tx); G.text(String(Math.max(0, bo.hp)), r.x + r.w - 6, r.y + r.h - 20, st.tx, { al: 'r' });
      G.box(r.x + 6, r.y + r.h - 10, bw, 7, st.tx); G.drect(r.x + 7, r.y + r.h - 9, f, 5, 10, st.tx, null);
      if (bo.rage && Math.random() < 0.3) G.drect(x, y + G.irand(0, bo.h - 6), bo.w, 4, 8, G.pick(s.block >= 2 ? [Gr, B, W] : [B, W]), null);
      if (bo.flash > 0) G.drect(x, y, bo.w, bo.h, 6, W, null);
    },
  };

  // icono: el reloj de arena rebota entre la pala y tres ventanitas, y cierra una
  G.ICONS[16] = function (t) {
    const per = 1.2, k = (t % per) / per, i0 = Math.floor(t / per) % 3;
    for (let i = 0; i < 3; i++) {
      const x = 1 + i * 8, y = 1;
      if (i === i0 && k > 0.5 && k < 0.75) { const kk = 1 - (k - 0.5) / 0.25, ww = Math.max(1, Math.round(7 * kk)), hh = Math.max(1, Math.round(5 * kk)); G.box(x + Math.round((7 - ww) / 2), y + Math.round((5 - hh) / 2), ww, hh, W); continue; }
      if (i === i0 && k >= 0.75) continue;
      G.rect(x, y, 7, 5, W); G.rect(x, y, 7, 2, Gr); G.px(x + 5, y, K);
    }
    const tx = 4 + i0 * 8, bx = 12, ph = k < 0.5 ? k / 0.5 : 1 - (k - 0.5) / 0.5;
    const px = Math.round(G.lerp(bx, tx, ph)), py = Math.round(G.lerp(14, 7, ph));
    G.rect(px - 1, py - 1, 3, 3, W);
    const padX = Math.round(G.lerp(8, 4 + i0 * 3, 0.5));
    G.rect(padX, 17, 10, 2, Gr);
  };
  G.CARD_SCHEMES[16] = { top: Gr, tt: K, ib: K, grid: B, bot: L, nc: B, bt: K };
})(window.G);
