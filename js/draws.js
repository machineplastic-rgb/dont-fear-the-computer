'use strict';
// Ilustraciones de ERASE (dibujo propio, 160x224): póster de ordenador, tienda nocturna, retrato en semitono,
// chica glitch, cara en líneas de CRT verde, mano de alambre, caballero oficinista y ojo en monitor verde.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const PW = 160, PH = 224;
  const gv = (v, a) => { v = Math.max(0, Math.min(255, Math.round(v))); return a == null ? 'rgb(' + v + ',' + v + ',' + v + ')' : 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')'; };
  const grad = (g, st) => { st.forEach((s) => g.addColorStop(s[0], gv(s[1], s[2]))); return g; };
  const lin = (c, x0, y0, x1, y1, st) => grad(c.createLinearGradient(x0, y0, x1, y1), st);
  const rad = (c, x, y, r0, r1, st) => grad(c.createRadialGradient(x, y, r0, x, y, r1), st);
  const fill = (c, f) => { c.fillStyle = typeof f === 'number' ? gv(f) : f; };
  const fr = (c, x, y, w, h, f) => { fill(c, f); c.fillRect(x, y, w, h); };
  const el = (c, x, y, rx, ry, f, rot) => { fill(c, f); c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); c.fill(); };
  const pg = (c, p, f) => { fill(c, f); c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); };
  const sk = (c, col, w) => { c.strokeStyle = typeof col === 'number' ? gv(col) : col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; };
  const ln = (c, p, col, w) => { sk(c, col, w); c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); };
  const bz = (c, p, col, w) => { sk(c, col, w); c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i + 5 < p.length + 0; i += 6) c.bezierCurveTo(p[i], p[i + 1], p[i + 2], p[i + 3], p[i + 4], p[i + 5]); c.stroke(); };
  const qd = (c, p, col, w) => { sk(c, col, w); c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i + 3 < p.length + 0; i += 4) c.quadraticCurveTo(p[i], p[i + 1], p[i + 2], p[i + 3]); c.stroke(); };
  const rr = (c, x, y, w, h, r, f) => { fill(c, f); c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.fill(); };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const PALS = [K, W, L, B, Gr].map(rgb);
  function work() { const c = document.createElement('canvas'); c.width = PW; c.height = PH; return c.getContext('2d', { willReadFrequently: true }); }
  function lum(c) { const d = c.getImageData(0, 0, PW, PH).data, o = new Float32Array(PW * PH); for (let i = 0; i < o.length; i++) o[i] = d[i * 4] / 255; return o; }
  function put(o, fn) { const id = o.x.createImageData(PW, PH), p = id.data; for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x, col = fn(x, y, i); p[i * 4] = col[0]; p[i * 4 + 1] = col[1]; p[i * 4 + 2] = col[2]; p[i * 4 + 3] = 255; } o.x.putImageData(id, 0, 0); }
  // trama ordenada con una rampa de colores de la paleta
  function dither(Lm, ramp) { const o = G.mkCanvas(PW, PH), cols = ramp.map(rgb), m = ramp.length - 1; put(o, (x, y, i) => { const v = Math.max(0, Math.min(1, Lm[i])) * m, b = Math.floor(v); return cols[Math.min(m, b + (v - b > (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 1 : 0))]; }); return o; }
  // semitono: puntos en una rejilla girada 45º, más grandes cuanto más oscuro
  function halftone(Lm, ink, paper, cell) { const o = G.mkCanvas(PW, PH), a = rgb(ink), b = rgb(paper), k = cell * Math.SQRT2; put(o, (x, y, i) => { const u = (x + y) / k, v = (x - y) / k, fu = u - Math.round(u), fv = v - Math.round(v); return Math.hypot(fu, fv) < 0.64 * Math.sqrt(1 - Lm[i]) ? a : b; }); return o; }
  // líneas de monitor: solo se encienden las filas pares
  function scan(Lm, lit, bg) { const a = rgb(lit), b = rgb(bg); const o = G.mkCanvas(PW, PH); put(o, (x, y, i) => (y % 2 ? b : Lm[i] > 0.38 + ((BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 0.3 ? a : b)); return o; }
  // deja solo colores de la paleta (quita el suavizado de los trazos)
  function snap(o) { const id = o.x.getImageData(0, 0, PW, PH), p = id.data; for (let i = 0; i < p.length; i += 4) { let best = 0, bd = 1e9; for (let k = 0; k < PALS.length; k++) { const c = PALS[k], dd = (p[i] - c[0]) ** 2 + (p[i + 1] - c[1]) ** 2 + (p[i + 2] - c[2]) ** 2; if (dd < bd) { bd = dd; best = k; } } p[i] = PALS[best][0]; p[i + 1] = PALS[best][1]; p[i + 2] = PALS[best][2]; p[i + 3] = 255; } o.x.putImageData(id, 0, 0); }
  const onto = (o, f) => { const T = G.ctx(); G.target(o.x); try { f(o.x); } finally { G.target(T); } };
  const sprite = (txt, font, col, maxW) => { const s = G.fsprite(txt, font, col, 128); return { s, k: Math.min(1, maxW / s.width) }; };
  const drawSprite = (c, sp, cx, y) => { const w = Math.round(sp.s.width * sp.k), h = Math.round(sp.s.height * sp.k); c.drawImage(sp.s, Math.round(cx - w / 2), y, w, h); };

  const D = {
    // 1) póster: ordenador viejo con impresora y lema
    poster() {
      const c = work();
      fr(c, 0, 0, PW, PH, 0);
      pg(c, [0, 170, 160, 150, 160, 224, 0, 224], lin(c, 0, 150, 0, 224, [[0, 130], [1, 55]]));
      el(c, 70, 182, 66, 9, gv(0, 0.55)); el(c, 144, 184, 20, 5, gv(0, 0.5));
      // caja
      pg(c, [12, 150, 26, 140, 134, 140, 120, 150], 242);
      pg(c, [12, 150, 120, 150, 120, 178, 12, 178], lin(c, 0, 150, 0, 178, [[0, 228], [1, 180]]));
      pg(c, [120, 150, 134, 140, 134, 166, 120, 178], 118);
      for (const [x0, w0] of [[20, 36], [64, 34]]) { fr(c, x0, 157, w0, 4, 60); fr(c, x0 + 2, 158, w0 - 4, 1, 20); fr(c, x0, 166, w0, 4, 60); fr(c, x0 + 2, 167, w0 - 4, 1, 20); }
      el(c, 110, 172, 1.6, 1.6, 255); for (let i = 0; i < 4; i++) fr(c, 104, 156 + i * 3, 12, 1, 130);
      // monitor
      pg(c, [56, 142, 84, 142, 88, 150, 52, 150], 170);
      pg(c, [28, 74, 42, 64, 126, 64, 112, 74], 246);
      pg(c, [112, 74, 126, 64, 126, 130, 112, 142], 128);
      rr(c, 26, 72, 88, 72, 4, lin(c, 26, 0, 114, 0, [[0, 236], [1, 196]]));
      rr(c, 34, 80, 70, 54, 7, 18);
      c.save(); c.beginPath(); if (c.roundRect) c.roundRect(36, 82, 66, 50, 6); else c.rect(36, 82, 66, 50); c.clip();
      fr(c, 36, 82, 66, 50, rad(c, 66, 108, 2, 48, [[0, 95], [1, 15]]));
      sk(c, 185, 0.9); for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(70, 108, 26, 2 + k * 2.6, -0.42, 0, Math.PI * 2); c.stroke(); }
      for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(70, 108, 6 + Math.abs(k) * 5, 15, -0.42 + 1.57, 0, Math.PI * 2); c.stroke(); }
      pg(c, [42, 84, 62, 84, 38, 124, 36, 104], gv(255, 0.32)); pg(c, [66, 84, 72, 84, 44, 130, 40, 130], gv(255, 0.18));
      c.restore();
      fr(c, 94, 136, 8, 2, 90); el(c, 104, 138, 1.4, 1.4, 255);
      // teclado
      pg(c, [22, 186, 112, 186, 124, 206, 10, 206], 222); pg(c, [10, 206, 124, 206, 124, 210, 10, 210], 100);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 14; k++) { const t = (r + 0.5) / 4, xl = 22 + (10 - 22) * t, xr = 112 + (124 - 112) * t, w = (xr - xl) / 14; fr(c, xl + k * w + 1, 188 + r * 4.6, w - 1.6, 2.6, 120); }
      // impresora
      pg(c, [126, 150, 160, 150, 160, 184, 126, 184], 226); pg(c, [126, 150, 134, 142, 160, 142, 160, 150], 246);
      pg(c, [132, 143, 136, 126, 158, 126, 156, 143], 252); for (let i = 0; i < 3; i++) fr(c, 138, 130 + i * 4, 14, 1, 150);
      fr(c, 130, 160, 28, 3, 50); el(c, 152, 174, 1.4, 1.4, 60);
      const o = dither(lum(c), [K, W]);
      onto(o, () => {
        G.text("DON'T FEAR", PW / 2, 9, W, { s: 2, al: 'c', b: true });
        G.text('THE COMPUTER', PW / 2, 29, W, { s: 2, al: 'c' });
        G.dash(14, 47, PW - 28, W, 1, 1);
      });
      return o.c;
    },
    // 2) tienda nocturna en perspectiva isométrica, 1 bit
    shop() {
      const c = work();
      fr(c, 0, 0, PW, PH, 255);
      fr(c, 6, 6, PW - 12, PH - 12, 0);
      for (let i = 0; i < 40; i++) fr(c, 90 + Math.random() * 64, 8 + Math.random() * 40, 1, 1, 220);
      c.save(); c.beginPath(); c.rect(6, 6, PW - 12, PH - 12); c.clip();
      c.transform(1, 0.34, 0, 1, 0, -6);
      // cartel grande
      fr(c, 4, 8, 118, 34, 255); fr(c, 4, 8, 118, 2, 0); fr(c, 4, 40, 118, 2, 0);
      const t1 = G.fsprite('電脳食堂', '28px ' + G.FONT_JP, K, 128); c.drawImage(t1, 8, 10, Math.min(110, t1.width), 28);
      fr(c, 4, 42, 118, 10, 0); { const t2 = G.fsprite('DENNOU SHOKUDO', '9px ' + G.FONT_JP, W, 128); c.drawImage(t2, 10, 43, Math.min(100, t2.width), 8); }
      // cartel vertical
      fr(c, 126, 20, 26, 74, 255); fr(c, 126, 20, 26, 2, 0); fr(c, 126, 92, 26, 2, 0);
      ['2', '4', '時'].forEach((ch, i) => { const s = G.fsprite(ch, '20px ' + G.FONT_JP, K, 128); c.drawImage(s, 130, 24 + i * 22, 18, 20); });
      // escaparate: dibujo de línea limpio (blanco y negro, casi sin grises)
      fr(c, 4, 54, 118, 140, 255);
      fr(c, 12, 60, 40, 16, 0); for (let i = 0; i < 3; i++) fr(c, 15, 63 + i * 4, 20 + (i * 9) % 14, 2, 255);
      el(c, 92, 62, 8, 3, 0); ln(c, [92, 54, 92, 60], 0, 1.4);
      // barra
      fr(c, 4, 112, 118, 3, 0); fr(c, 4, 115, 118, 22, 128); fr(c, 4, 137, 118, 2, 0);
      // cliente que come (de lado)
      el(c, 32, 86, 9, 9, 255); sk(c, 0, 1.6); c.beginPath(); c.ellipse(32, 86, 9, 9, 0, 0, 7); c.stroke();
      pg(c, [23, 84, 24, 76, 36, 74, 42, 80, 41, 84], 0); el(c, 37, 87, 1.4, 1.4, 0); ln(c, [35, 92, 39, 91], 0, 1.2);
      pg(c, [22, 96, 44, 96, 48, 112, 20, 112], 255); ln(c, [22, 96, 20, 112], 0, 1.6); ln(c, [44, 96, 48, 112], 0, 1.6); ln(c, [22, 96, 44, 96], 0, 1.6);
      ln(c, [40, 100, 52, 108], 0, 2); pg(c, [50, 104, 64, 104, 61, 111, 53, 111], 0); fr(c, 50, 103, 14, 2, 255); ln(c, [55, 92, 58, 104], 0, 1); ln(c, [58, 92, 60, 104], 0, 1);
      // cliente de espaldas
      el(c, 94, 92, 10, 10, 255); sk(c, 0, 1.6); c.beginPath(); c.ellipse(94, 92, 10, 10, 0, 0, 7); c.stroke();
      for (let k = -7; k <= 7; k += 2.5) ln(c, [94 + k * 0.6, 83, 94 + k, 99], 0, 0.9);
      pg(c, [80, 102, 108, 102, 112, 112, 76, 112], 255); ln(c, [80, 102, 76, 112], 0, 1.6); ln(c, [108, 102, 112, 112], 0, 1.6); ln(c, [80, 102, 108, 102], 0, 1.6);
      // taburetes y suelo a cuadros
      for (let y = 152; y < 194; y += 8) for (let x = 4; x < 122; x += 8) if (((x - 4) / 8 + (y - 152) / 8) % 2 < 1) fr(c, x, y, 8, 8, 0);
      for (const sx of [26, 62, 98]) { fr(c, sx - 1.5, 140, 3, 18, 0); el(c, sx, 141, 10, 4, 0); el(c, sx, 140, 7, 2.5, 255); el(c, sx, 158, 7, 3, 0); }
      // marcos del escaparate
      for (const x of [4, 62, 120]) fr(c, x, 54, 3, 140, 0);
      fr(c, 4, 54, 119, 3, 0); fr(c, 4, 192, 119, 3, 0);
      c.restore();
      const o = dither(lum(c), [K, W]);
      onto(o, () => { G.rect(PW - 14, PH - 14, 7, 7, W); G.circ(PW - 11, PH - 11, 2, K, K); });
      return o.c;
    },
    // 3) retrato en semitono (cara inventada mirando hacia arriba)
    halftone() {
      const c = work();
      fr(c, 0, 0, PW, PH, lin(c, 160, 0, 0, 200, [[0, 252], [0.5, 180], [1, 115]]));
      pg(c, [0, 224, 0, 164, 30, 144, 60, 152, 82, 174, 106, 188, 160, 196, 160, 224], 22);
      pg(c, [94, 224, 106, 186, 134, 172, 160, 176, 160, 224], 218);
      pg(c, [62, 136, 104, 130, 112, 178, 70, 182], lin(c, 60, 0, 112, 0, [[0, 15], [0.55, 80], [1, 205]]));
      c.save(); c.translate(88, 90); c.rotate(-0.28);
      c.save(); c.beginPath(); c.ellipse(0, 0, 38, 48, 0, 0, Math.PI * 2); c.clip();
      fr(c, -50, -60, 100, 120, lin(c, -38, 0, 38, 0, [[0, 18], [0.32, 60], [0.6, 195], [1, 248]]));
      el(c, 12, -36, 22, 11, gv(255, 0.35));
      c.restore();
      el(c, -12, -6, 9, 5, gv(25, 0.9)); el(c, 15, -8, 8, 4.5, gv(35, 0.85));
      ln(c, [-22, -15, -4, -16], gv(10, 0.9), 3); ln(c, [7, -18, 25, -16], gv(20, 0.85), 2.6);
      el(c, -10, -6, 2.5, 1.2, 230); el(c, 17, -8, 2.5, 1.2, 250);
      ln(c, [3, -6, 6, 12], gv(250, 0.7), 2.2); pg(c, [-4, 4, 4, 18, -8, 20], gv(15, 0.75)); el(c, 2, 20, 8, 3.4, gv(10, 0.9)); el(c, 8, 18, 3, 2.4, gv(255, 0.6));
      qd(c, [-12, 31, 1, 35, 15, 29], 10, 2.6); el(c, 2, 37, 9, 2.2, gv(240, 0.55));
      el(c, 24, 10, 9, 14, gv(255, 0.3)); el(c, -37, 2, 5, 11, 15);
      qd(c, [-30, 20, -10, 46, 22, 40], gv(0, 0.5), 3);
      c.restore();
      return halftone(lum(c), K, W, 3).c;
    },
    // 4) chica con visor y cables, en glitch con colores desplazados
    glitch() {
      const o = G.mkCanvas(PW, PH), c = o.x;
      fr(c, 0, 0, PW, PH, 0);
      const art = (col, dx) => {
        c.save(); c.translate(dx, 0);
        // cables que salen del visor hacia arriba
        for (const p of [[66, 64, 44, 40, 70, 16, 48, -4], [80, 61, 88, 34, 60, 20, 72, -4], [98, 59, 118, 38, 104, 16, 126, -4], [112, 62, 142, 52, 148, 24, 166, 14], [60, 70, 30, 60, 18, 38, 4, 28]]) bz(c, p, col, 1.6);
        // pelo corto (media melena) y mechones
        bz(c, [50, 128, 38, 92, 46, 48, 86, 42, 126, 38, 136, 92, 126, 128], col, 1.7);
        for (const p of [[58, 94, 54, 106, 54, 118, 50, 128], [64, 96, 60, 108, 62, 118, 58, 126], [118, 88, 122, 102, 122, 116, 124, 126], [112, 92, 116, 104, 114, 116, 118, 124], [72, 58, 70, 62, 68, 66, 66, 70], [92, 54, 92, 58, 90, 62, 90, 66]]) bz(c, p, col, 1.3);
        // visor
        ln(c, [54, 68, 118, 61, 122, 86, 58, 94, 54, 68], col, 1.8); ln(c, [57, 81, 120, 74], col, 1.3);
        ln(c, [48, 70, 54, 68, 58, 94, 52, 94, 48, 70], col, 1.4); ln(c, [74, 66, 76, 91], col, 1.1); ln(c, [100, 63, 103, 88], col, 1.1);
        // cara
        bz(c, [60, 94, 64, 110, 74, 122, 86, 128, 98, 126, 108, 116, 114, 92], col, 1.6);
        ln(c, [80, 114, 90, 113], col, 1.5); ln(c, [82, 117, 88, 116], col, 1); ln(c, [88, 104, 87, 107], col, 1.1);
        // cuello, cuello de la camisa y hombros
        ln(c, [78, 127, 76, 144], col, 1.5); ln(c, [96, 126, 98, 144], col, 1.5);
        ln(c, [76, 144, 84, 160, 88, 150, 92, 160, 98, 144], col, 1.5);
        ln(c, [76, 144, 40, 152, 16, 176], col, 1.7); ln(c, [98, 144, 134, 152, 156, 178], col, 1.7);
        ln(c, [40, 158, 46, 186], col, 1.2); ln(c, [134, 158, 128, 186], col, 1.2); ln(c, [88, 160, 88, 186], col, 1.1);
        c.restore();
      };
      art(B, -2); art(Gr, 2); art(W, 0);
      onto(o, () => {
        const t = "IT'S ALL IN THE CODE";
        G.text(t, PW / 2 - 1, 198, B, { al: 'c', b: true }); G.text(t, PW / 2 + 1, 198, Gr, { al: 'c', b: true }); G.text(t, PW / 2, 198, W, { al: 'c', b: true });
      });
      snap(o);
      for (let k = 0; k < 4; k++) { const y = Math.floor(Math.random() * (PH - 8)), h = 2 + Math.floor(Math.random() * 5), dx = Math.round((Math.random() - 0.5) * 12); c.drawImage(o.c, 0, y, PW, h, dx, y, PW, h); }
      for (let y = 1; y < PH; y += 2) fr(c, 0, y, PW, 1, 'rgba(0,0,0,0.45)');
      snap(o);
      return o.c;
    },
    // 5) cara en líneas de monitor verde
    scan() {
      const c = work();
      fr(c, 0, 0, PW, PH, 0);
      pg(c, [18, 60, 30, 20, 80, 8, 130, 18, 150, 60, 152, 130, 140, 200, 120, 150, 118, 90], 120);
      pg(c, [52, 78, 50, 118, 62, 150, 84, 168, 104, 158, 118, 128, 120, 82], 215);
      pg(c, [74, 160, 104, 154, 108, 200, 72, 204], 200); pg(c, [72, 168, 104, 160, 104, 170, 76, 176], 90);
      pg(c, [90, 186, 160, 170, 160, 224, 80, 224], 175); ln(c, [100, 196, 130, 224], 40, 2); ln(c, [120, 186, 150, 224], 40, 2);
      pg(c, [0, 200, 40, 180, 74, 196, 70, 224, 0, 224], 70);
      for (let k = 0; k < 9; k++) { const x0 = 40 + k * 10; pg(c, [x0 - 4, 30, x0 + 10, 30, x0 + 4 + (k % 3) * 2, 74 + (k % 4) * 6], k % 2 ? 175 : 160); ln(c, [x0 + 9, 34, x0 + 5, 70 + (k % 4) * 5], 30, 1.4); }
      pg(c, [36, 28, 132, 22, 134, 38, 34, 44], 150);
      for (const [ex, ey, s] of [[70, 104, 1], [104, 100, -1]]) {
        qd(c, [ex - 13, ey + 1 * s * 0, ex, ey - 7, ex + 13, ey - 1], 15, 3.2);
        el(c, ex + 1, ey + 3, 5.5, 5, 25); el(c, ex + 3, ey + 1, 1.6, 1.6, 230); ln(c, [ex - 9, ey + 9, ex + 9, ey + 8], 70, 1);
      }
      ln(c, [89, 122, 91, 129], 60, 1.4); ln(c, [82, 145, 96, 144], 40, 1.8);
      ln(c, [52, 118, 60, 146], 140, 1.2);
      return scan(lum(c), Gr, K).c;
    },
    // 6) mano de alambre que sale del monitor y toca un dedo
    touch() {
      const c = work();
      fr(c, 0, 0, PW, PH, 0);
      pg(c, [8, 12, 22, 4, 84, 4, 70, 12], 240); pg(c, [70, 12, 84, 4, 84, 52, 70, 60], 130);
      rr(c, 6, 10, 66, 52, 3, lin(c, 6, 0, 72, 0, [[0, 230], [1, 190]])); rr(c, 12, 16, 46, 38, 4, 20);
      for (let i = 0; i < 3; i++) el(c, 64, 24 + i * 8, 1.6, 1.6, 90);
      // la mano (apuntando con el índice) en coordenadas propias: muñeca en 0, dedo hacia +x
      const handPath = (x) => {
        x.beginPath(); x.rect(-34, -8, 34, 17);
        x.moveTo(0, -12); x.lineTo(26, -12); x.lineTo(31, -6); x.lineTo(31, 9); x.lineTo(22, 14); x.lineTo(0, 12); x.closePath();
        x.moveTo(26, -12); x.lineTo(56, -11); x.quadraticCurveTo(61, -8, 56, -5); x.lineTo(28, -4); x.closePath();
        x.moveTo(37, -1); x.ellipse(31, -1, 6, 3.6, 0, 0, Math.PI * 2); x.moveTo(37, 5); x.ellipse(31, 5, 6, 3.6, 0, 0, Math.PI * 2); x.moveTo(34, 11); x.ellipse(29, 11, 5, 3.4, 0, 0, Math.PI * 2);
        x.moveTo(6, -12); x.lineTo(18, -19); x.lineTo(23, -16); x.lineTo(14, -10); x.closePath();
      };
      // mano de verdad desde abajo a la derecha (manga oscura y puño blanco)
      c.save(); c.translate(152, 196); c.rotate(-2.12); c.scale(1.45, 1.45);
      fr(c, -70, -13, 40, 26, 70); fr(c, -32, -12, 6, 24, 248);
      handPath(c); fill(c, 205); c.fill(); sk(c, 120, 1); c.stroke();
      ln(c, [30, -8, 55, -8], 150, 1); el(c, 55, -8, 2, 1.5, 245);
      c.restore();
      const o = dither(lum(c), [K, L, W]), x = o.x;
      fr(x, 12, 16, 46, 38, K); for (let y = 18; y < 52; y += 3) for (let k = 14; k < 56; k += 3) if (Math.random() < 0.25) fr(x, k, y, 1, 1, Gr);
      // mano de alambre que sale de la pantalla (rejilla verde recortada a la forma de la mano)
      x.save(); x.translate(40, 52); x.rotate(0.9); x.scale(1.4, 1.4);
      x.save(); handPath(x); x.clip();
      sk(x, Gr, 0.7); for (let k = -20; k < 20; k += 3.2) { x.beginPath(); x.moveTo(-40, k); x.lineTo(64, k + Math.sin(k) * 0.8); x.stroke(); }
      for (let k = -36; k < 64; k += 3.6) { x.beginPath(); x.moveTo(k, -22); x.quadraticCurveTo(k + 2, 0, k, 22); x.stroke(); }
      x.restore(); sk(x, Gr, 0.9); handPath(x); x.stroke();
      x.restore();
      // destello donde se tocan
      const sx = 103, sy = 113, cols = [W, B, Gr, L];
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + 0.2, l = i % 3 === 0 ? 34 : i % 2 ? 18 : 10; sk(x, cols[i % 4], 1); x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); x.stroke(); }
      el(x, sx, sy, 3, 3, W);
      snap(o);
      return o.c;
    },
    // 7) caballero oficinista: BORN TO QUEST
    knight() {
      const o = G.mkCanvas(PW, PH);
      onto(o, (c) => {
        G.rect(0, 0, PW, PH, K); G.drect(0, 0, PW, PH, 2, L, null);
        drawSprite(c, sprite('Born to Quest', '700 23px ' + G.FONT_GOTH, W, PW - 8), PW / 2, 3);
        G.box(8, 34, 144, 156, W); G.rect(9, 35, 142, 154, K); G.drect(9, 35, 142, 115, 3, L, null);
        for (let i = 0; i < 9; i++) { G.rect(12, 74 + i * 4, 28, 3, L); G.rect(12, 77 + i * 4, 28, 1, K); }
        for (let i = 0; i < 12; i++) { G.rect(128, 102 + i * 4, 21, 3, L); G.rect(128, 105 + i * 4, 21, 1, K); }
        G.rect(42, 66, 36, 30, Gr); G.box(42, 66, 36, 30, K); G.rect(46, 70, 26, 20, L); G.drect(46, 70, 26, 20, 4, W, null);
        G.rect(14, 92, 42, 42, Gr); G.box(14, 92, 42, 42, K); G.drect(44, 92, 12, 42, 6, K, null);
        G.rect(19, 97, 26, 24, W); G.drect(19, 97, 26, 24, 3, L, null); for (let i = 0; i < 4; i++) G.rect(22, 101 + i * 5, 10 + (i * 7) % 14, 1, K);
        G.rect(26, 134, 18, 6, Gr); G.box(26, 134, 18, 6, K);
        G.rect(9, 150, 142, 39, L); G.drect(9, 150, 142, 39, 3, K, null); G.rect(9, 150, 142, 1, K);
        G.rect(18, 160, 24, 14, W); for (let i = 0; i < 3; i++) G.rect(21, 163 + i * 3, 17, 1, K);
        G.rect(108, 166, 26, 15, W); for (let i = 0; i < 3; i++) G.rect(111, 169 + i * 3, 19, 1, K);
        G.rect(56, 142, 48, 10, L); G.box(56, 142, 48, 10, K); for (let i = 0; i < 10; i++) { G.px(59 + i * 4, 145, K); G.px(59 + i * 4, 148, K); }
        // caballero
        G.rect(82, 96, 44, 54, B); G.drect(82, 96, 44, 54, 8, K, null); G.circ(86, 104, 8, B, K); G.circ(122, 104, 8, B, K); G.drect(78, 96, 52, 16, 8, K, null);
        G.rect(95, 100, 20, 50, W); G.drect(95, 100, 20, 50, 3, L, null); G.rect(103, 104, 4, 32, K); G.rect(97, 113, 16, 4, K);
        G.tri(105, 48, 92, 80, 118, 80, B); G.drect(92, 50, 13, 30, 3, W, null); G.rect(93, 78, 24, 18, B); G.box(93, 78, 24, 18, K);
        G.rect(96, 85, 18, 2, K); G.rect(104, 80, 2, 12, K); G.rect(92, 94, 26, 6, B); G.drect(92, 94, 26, 6, 8, K, null);
        // brazos de malla hacia el teclado
        for (const a of [[84, 104, 93, 112, 70, 142, 62, 137], [118, 106, 127, 114, 90, 146, 81, 140]]) {
          c.save(); c.beginPath(); c.moveTo(a[0], a[1]); for (let i = 2; i < 8; i += 2) c.lineTo(a[i], a[i + 1]); c.closePath();
          c.fillStyle = B; c.fill(); c.clip(); G.drect(56, 100, 76, 50, 8, K, null); c.restore();
          c.beginPath(); c.moveTo(a[0], a[1]); for (let i = 2; i < 8; i += 2) c.lineTo(a[i], a[i + 1]); c.closePath(); c.strokeStyle = K; c.lineWidth = 1; c.stroke();
        }
        G.rect(59, 136, 10, 6, W); G.box(59, 136, 10, 6, K); G.rect(79, 139, 10, 6, W); G.box(79, 139, 10, 6, K);
        drawSprite(c, sprite('Forced to Reboot', '700 19px ' + G.FONT_GOTH, W, PW - 8), PW / 2, 194);
      });
      snap(o);
      return o.c;
    },
    // 8) ojo tramado en un monitor verde con menús
    eye() {
      const c = work();
      fr(c, 0, 0, PW, PH, lin(c, 0, 0, 0, PH, [[0, 150], [1, 120]]));
      for (let k = 0; k < 40; k++) ln(c, [40 + Math.random() * 120, 20 + Math.random() * 180, 40 + Math.random() * 120, 20 + Math.random() * 180], 110 + Math.random() * 40, 0.6);
      qd(c, [44, 70, 100, 40, 156, 66], 45, 12); qd(c, [50, 64, 100, 40, 150, 60], 95, 2);
      qd(c, [48, 98, 100, 66, 152, 96], 85, 2);
      const lid = () => { c.beginPath(); c.moveTo(42, 122); c.quadraticCurveTo(100, 72, 156, 116); c.quadraticCurveTo(102, 164, 42, 122); c.closePath(); };
      lid(); fill(c, 225); c.fill();
      c.save(); lid(); c.clip();
      el(c, 98, 116, 30, 30, rad(c, 98, 116, 8, 30, [[0, 130], [0.7, 85], [1, 28]]));
      sk(c, 40, 0.8); for (let a = 0; a < 6.28; a += 0.3) { c.beginPath(); c.moveTo(98 + Math.cos(a) * 13, 116 + Math.sin(a) * 13); c.lineTo(98 + Math.cos(a) * 28, 116 + Math.sin(a) * 28); c.stroke(); }
      el(c, 98, 116, 12, 12, 4); el(c, 106, 106, 5, 4, 255);
      fr(c, 0, 0, PW, PH, lin(c, 0, 84, 0, 104, [[0, 0, 0.55], [1, 0, 0]]));
      c.restore();
      qd(c, [42, 122, 100, 72, 156, 116], 15, 3.5); qd(c, [42, 122, 102, 164, 156, 116], 70, 1.4);
      for (let t = 0.1; t < 0.95; t += 0.07) { const x = (1 - t) * (1 - t) * 42 + 2 * (1 - t) * t * 100 + t * t * 156, y = (1 - t) * (1 - t) * 122 + 2 * (1 - t) * t * 72 + t * t * 116; ln(c, [x, y, x + (t - 0.4) * 10, y - 6], 20, 1); }
      const o = dither(lum(c), [K, Gr]);
      onto(o, () => {
        G.rect(0, 0, 36, PH - 22, K); G.rect(35, 0, 1, PH - 22, Gr);
        ['TOOLS', '', 'MOVE', 'SELECT', 'ZOOM', 'ANGLE', 'AREA', 'FILL', 'MEASURE'].forEach((t, i) => { const y = 6 + i * 11; if (t === 'SELECT') { G.rect(1, y - 2, 34, 10, Gr); G.text(t, 3, y, K); } else if (t) G.text(t, 3, y, Gr); });
        G.rect(0, PH - 22, PW, 22, K); G.rect(0, PH - 22, PW, 1, Gr);
        G.text('[CTRL/P] PRINT', 3, PH - 19, Gr); G.text('[X] EXPAND', 92, PH - 19, Gr);
        G.text('[CTRL/T] FONT', 3, PH - 9, Gr); G.text('[?] HELP', 92, PH - 9, Gr);
        G.box(100, 100, 16, 10, W);
      });
      return o.c;
    },
  };
  G.DRAW_KINDS = Object.keys(D);
  const cache = {};
  G.drawPic = function (kind) { if (!cache[kind]) cache[kind] = D[kind](); return cache[kind]; };
  G.DRAW_W = PW; G.DRAW_H = PH;
})(window.G);
