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
  function work() { const c = document.createElement('canvas'); c.width = PW * 2; c.height = PH * 2; const x = c.getContext('2d', { willReadFrequently: true }); x.scale(2, 2); return x; } // se dibuja al doble y se reduce: tonos más suaves
  function lum(c) { const W2 = PW * 2, d = c.getImageData(0, 0, W2, PH * 2).data, o = new Float32Array(PW * PH); for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = (y * 2 * W2 + x * 2) * 4; o[y * PW + x] = (d[i] + d[i + 4] + d[i + W2 * 4] + d[i + W2 * 4 + 4]) / 1020; } return o; }
  function put(o, fn) { const id = o.x.createImageData(PW, PH), p = id.data; for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x, col = fn(x, y, i); p[i * 4] = col[0]; p[i * 4 + 1] = col[1]; p[i * 4 + 2] = col[2]; p[i * 4 + 3] = 255; } o.x.putImageData(id, 0, 0); }
  // trama ordenada con una rampa de colores de la paleta
  function dither(Lm, ramp) { const o = G.mkCanvas(PW, PH), cols = ramp.map(rgb), m = ramp.length - 1; put(o, (x, y, i) => { const v = Math.max(0, Math.min(1, Lm[i])) * m, b = Math.floor(v); return cols[Math.min(m, b + (v - b > (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 1 : 0))]; }); return o; }
  // semitono: puntos en una rejilla girada 45º, más grandes cuanto más oscuro
  function halftone(Lm, ink, paper, cell, hi) { const o = G.mkCanvas(PW, PH), a = rgb(ink), b = rgb(paper), h = hi ? rgb(hi) : null, k = cell * Math.SQRT2; put(o, (x, y, i) => { if (h && Lm[i] > 0.9) return h; const u = (x + y) / k, v = (x - y) / k, fu = u - Math.round(u), fv = v - Math.round(v); return Math.hypot(fu, fv) < 0.64 * Math.sqrt(1 - Lm[i]) ? a : b; }); return o; }
  // trama gruesa (píxeles de 2x2), como las ventanas de virus
  function dither2(Lm, ramp) { const o = G.mkCanvas(PW, PH), cols = ramp.map(rgb), m = ramp.length - 1; put(o, (x, y) => { const xx = x >> 1, yy = y >> 1, i = yy * 2 * PW + xx * 2; const v = Math.max(0, Math.min(1, (Lm[i] + Lm[i + 1] + Lm[i + PW] + Lm[i + PW + 1]) / 4)) * m, b = Math.floor(v); return cols[Math.min(m, b + (v - b > (BAY[(yy & 3) * 4 + (xx & 3)] + 0.5) / 16 ? 1 : 0))]; }); return o; }
  // mano señalando con el índice (coordenadas propias: muñeca en 0, el dedo apunta a +x)
  function handPath(x) {
    x.beginPath(); x.rect(-18, -9, 19, 19);
    x.moveTo(0, -12); x.lineTo(26, -12); x.lineTo(31, -6); x.lineTo(31, 9); x.lineTo(22, 15); x.lineTo(0, 13); x.closePath();
    x.moveTo(26, -12); x.lineTo(54, -11.5); x.quadraticCurveTo(60, -8, 54, -4.5); x.lineTo(28, -4); x.closePath();
    x.moveTo(37, -1); x.ellipse(31, -1, 6, 3.8, 0, 0, Math.PI * 2); x.moveTo(37, 5.5); x.ellipse(31, 5.5, 6, 3.8, 0, 0, Math.PI * 2); x.moveTo(34, 11.5); x.ellipse(28.5, 11.5, 5.5, 3.5, 0, 0, Math.PI * 2);
    x.moveTo(5, -12); x.quadraticCurveTo(14, -21, 24, -17); x.lineTo(22, -12); x.closePath();
  }
  // líneas de monitor: solo se encienden las filas pares
  function scan(Lm, lit, bg) { const a = rgb(lit), b = rgb(bg); const o = G.mkCanvas(PW, PH); put(o, (x, y, i) => (y % 2 ? b : Lm[i] > 0.38 + ((BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 0.3 ? a : b)); return o; }
  // deja solo colores de la paleta (quita el suavizado de los trazos)
  function snap(o) { const id = o.x.getImageData(0, 0, PW, PH), p = id.data; for (let i = 0; i < p.length; i += 4) { let best = 0, bd = 1e9; for (let k = 0; k < PALS.length; k++) { const c = PALS[k], dd = (p[i] - c[0]) ** 2 + (p[i + 1] - c[1]) ** 2 + (p[i + 2] - c[2]) ** 2; if (dd < bd) { bd = dd; best = k; } } p[i] = PALS[best][0]; p[i + 1] = PALS[best][1]; p[i + 2] = PALS[best][2]; p[i + 3] = 255; } o.x.putImageData(id, 0, 0); }
  const onto = (o, f) => { const T = G.ctx(); G.target(o.x); try { f(o.x); } finally { G.target(T); } };
  const sprite = (txt, font, col, maxW) => { const s = G.fsprite(txt, font, col, 128); return { s, k: Math.min(1, maxW / s.width) }; };
  const drawSprite = (c, sp, cx, y) => { const w = Math.round(sp.s.width * sp.k), h = Math.round(sp.s.height * sp.k); c.drawImage(sp.s, Math.round(cx - w / 2), y, w, h); };

  const D = {
    // 1) póster: ordenador de sobremesa con monitor de tubo e impresora (1 bit)
    poster() {
      const c = work();
      fr(c, 0, 0, PW, PH, 0);
      pg(c, [0, 176, 160, 160, 160, 224, 0, 224], lin(c, 0, 160, 0, 224, [[0, 215], [1, 150]]));
      const box3 = (x, y, w, h, dx, dy, fF, fT, fS) => { pg(c, [x, y, x + w, y, x + w + dx, y + dy, x + dx, y + dy], fT); pg(c, [x + w, y, x + w + dx, y + dy, x + w + dx, y + h + dy, x + w, y + h], fS); fr(c, x, y, w, h, fF); };
      el(c, 72, 174, 72, 8, gv(0, 0.35));
      // impresora (cortada a la derecha)
      box3(124, 152, 42, 26, 18, -8, lin(c, 0, 152, 0, 178, [[0, 230], [1, 190]]), 246, 150);
      pg(c, [132, 145, 136, 124, 156, 124, 154, 145], 252); for (let i = 0; i < 4; i++) ln(c, [139, 129 + i * 4, 151, 129 + i * 4], 160, 0.7);
      fr(c, 128, 162, 34, 2.5, 60);
      // caja con disqueteras
      box3(12, 140, 96, 30, 22, -10, lin(c, 0, 140, 0, 170, [[0, 240], [1, 200]]), 250, lin(c, 108, 0, 130, 0, [[0, 170], [1, 120]]));
      for (const [xx, yy] of [[20, 146], [20, 156]]) { fr(c, xx, yy, 34, 6, 200); fr(c, xx, yy, 34, 1, 120); fr(c, xx + 4, yy + 3, 22, 1.5, 40); }
      fr(c, 70, 150, 26, 12, 225); fr(c, 70, 150, 26, 1, 140); el(c, 100, 163, 1.6, 1.6, 40);
      // monitor de tubo en 3/4
      fr(c, 50, 132, 30, 8, 180);
      box3(22, 64, 80, 70, 22, -10, lin(c, 22, 0, 102, 0, [[0, 245], [1, 205]]), 252, lin(c, 102, 0, 124, 0, [[0, 175], [1, 130]]));
      for (let i = 0; i < 6; i++) ln(c, [106 + i * 3, 70 - i * 1.4, 106 + i * 3, 104 - i * 1.4], 110, 0.6);
      rr(c, 29, 71, 66, 52, 6, 150); rr(c, 31, 73, 62, 48, 6, 18);
      c.save(); c.beginPath(); if (c.roundRect) c.roundRect(31, 73, 62, 48, 6); else c.rect(31, 73, 62, 48); c.clip();
      fr(c, 31, 73, 62, 48, rad(c, 62, 97, 2, 44, [[0, 95], [1, 15]]));
      sk(c, 205, 0.8); for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(64, 98, 24, 2 + k * 2.5, -0.35, 0, Math.PI * 2); c.stroke(); }
      for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(64, 98, 5 + Math.abs(k) * 5, 14, -0.35 + Math.PI / 2, 0, Math.PI * 2); c.stroke(); }
      pg(c, [35, 75, 58, 75, 33, 112, 33, 92], gv(255, 0.32)); pg(c, [62, 75, 68, 75, 40, 121, 35, 121], gv(255, 0.16));
      c.restore();
      fr(c, 58, 126, 14, 3, 150); el(c, 92, 128, 1.4, 1.4, 60);
      // teclado inclinado
      pg(c, [4, 184, 96, 176, 106, 198, 10, 208], lin(c, 0, 176, 0, 208, [[0, 240], [1, 205]])); pg(c, [10, 208, 106, 198, 106, 202, 10, 212], 110);
      for (let r = 0; r < 4; r++) { const t = (r + 0.5) / 4, yl = 184 + t * 24, yr = 176 + t * 22, xl = 4 + 6 * t, wr = 92 + 4 * t; for (let k = 0; k < 14; k++) { const f = k / 14; fr(c, xl + f * wr + 1, yl + (yr - yl) * f - 1.5, wr / 14 - 1.6, 3, 145); } }
      const o = dither(lum(c), [K, W]);
      onto(o, () => { G.text("DON'T FEAR", PW / 2, 9, W, { s: 2, al: 'c', b: true }); G.text('THE COMPUTER', PW / 2, 29, W, { s: 2, al: 'c' }); G.dash(14, 47, PW - 28, W, 1, 1); });
      return o.c;
    },
    // 2) tienda nocturna en isométrica, 1 bit, con dos clientes en la barra
    shop() {
      const c = work();
      fr(c, 0, 0, PW, PH, 255); fr(c, 6, 6, PW - 12, PH - 12, 0);
      for (let i = 0; i < 50; i++) fr(c, 96 + Math.random() * 58, 8 + Math.random() * 46, 0.8, 0.8, 230);
      c.save(); c.beginPath(); c.rect(6, 6, PW - 12, PH - 12); c.clip();
      // fachada (baja hacia la derecha)
      c.save(); c.transform(1, 0.42, 0, 1, 0, -2);
      fr(c, 6, 4, 18, 48, 255); fr(c, 6, 4, 18, 1.5, 0);
      ['ラ', 'ー', 'メ', 'ン'].forEach((ch, i) => { const s = G.fsprite(ch, '12px ' + G.FONT_JP, K, 128); c.drawImage(s, 9, 7 + i * 11, 12, 11); });
      fr(c, 26, 8, 96, 30, 255); fr(c, 26, 8, 96, 2, 0); fr(c, 26, 36, 96, 2, 0); fr(c, 26, 8, 2, 30, 0);
      { const t1 = G.fsprite('電脳食堂', '26px ' + G.FONT_JP, K, 128); c.drawImage(t1, 30, 10, 88, 26); }
      fr(c, 26, 38, 96, 9, 0); { const t2 = G.fsprite('DENNOU SHOKUDO', '9px ' + G.FONT_JP, W, 128); c.drawImage(t2, 32, 39.5, 84, 7); }
      fr(c, 6, 50, 116, 150, 255);
      fr(c, 12, 56, 46, 18, 0); for (let i = 0; i < 3; i++) fr(c, 15, 59 + i * 5, 22 + (i * 11) % 16, 2, 255);
      fr(c, 66, 58, 50, 10, 225);
      fr(c, 6, 104, 116, 3, 0); fr(c, 6, 107, 116, 20, 128); fr(c, 6, 127, 116, 2, 0);
      // cliente que come fideos (de perfil)
      el(c, 30, 78, 9, 10, 255); sk(c, 0, 1.5); c.beginPath(); c.ellipse(30, 78, 9, 10, 0, 0, 7); c.stroke();
      pg(c, [21, 76, 22, 67, 34, 66, 40, 72, 39, 76], 0);
      el(c, 35, 79, 1.3, 1.6, 0); ln(c, [33, 85, 37, 84], 0, 1.2); ln(c, [38, 78, 40, 82, 38, 82], 0, 1);
      pg(c, [18, 88, 42, 88, 46, 104, 14, 104], 255); ln(c, [18, 88, 14, 104], 0, 1.5); ln(c, [42, 88, 46, 104], 0, 1.5); ln(c, [24, 88, 30, 93, 36, 88], 0, 1.2);
      ln(c, [40, 94, 50, 100], 0, 2.2);
      pg(c, [46, 98, 62, 98, 59, 104, 49, 104], 0); fr(c, 46, 97, 16, 1.6, 255);
      ln(c, [52, 84, 55, 97], 0, 1); ln(c, [55, 84, 57, 97], 0, 1);
      for (let k = 0; k < 3; k++) qd(c, [50 + k * 4, 94, 48 + k * 4, 90, 51 + k * 4, 87], 0, 0.7);
      // cliente de espaldas, pelo claro
      el(c, 92, 86, 10, 10, 255); sk(c, 0, 1.5); c.beginPath(); c.ellipse(92, 86, 10, 10, 0, 0, 7); c.stroke();
      for (let k = -8; k <= 8; k += 2) ln(c, [92 + k * 0.5, 77, 92 + k, 95], 0, 0.6);
      pg(c, [78, 96, 106, 96, 110, 104, 74, 104], 255); ln(c, [78, 96, 74, 104], 0, 1.5); ln(c, [106, 96, 110, 104], 0, 1.5); ln(c, [78, 96, 106, 96], 0, 1.5);
      ln(c, [106, 98, 116, 100], 0, 1.6); fr(c, 114, 96, 6, 4, 0);
      // suelo a cuadros y taburetes
      for (let y = 150; y < 200; y += 8) for (let x = 6; x < 122; x += 8) if (((x - 6) / 8 + (y - 150) / 8) % 2 < 1) fr(c, x, y, 8, 8, 0);
      for (const sx2 of [24, 60, 96]) { fr(c, sx2 - 1.5, 131, 3, 18, 0); el(c, sx2, 132, 10, 4.5, 0); el(c, sx2, 131, 7, 2.5, 255); el(c, sx2, 150, 7, 3, 0); }
      for (const x of [6, 64, 120]) fr(c, x, 50, 3, 150, 0); fr(c, 6, 50, 117, 3, 0);
      c.restore();
      // cartel de la esquina (se va hacia el fondo)
      c.save(); c.transform(1, -0.42, 0, 1, 0, 0);
      fr(c, 126, 106, 26, 70, 255); fr(c, 126, 106, 2, 70, 0);
      ['2', '4', '時', '間'].forEach((ch, i) => { const s = G.fsprite(ch, '16px ' + G.FONT_JP, K, 128); c.drawImage(s, 131, 110 + i * 16, 16, 15); });
      fr(c, 126, 178, 26, 90, 40);
      c.restore();
      c.restore();
      const o = dither(lum(c), [K, W]);
      onto(o, () => { G.rect(PW - 14, PH - 14, 7, 7, W); G.circ(PW - 11, PH - 11, 2, K, K); });
      return o.c;
    },
    // 3) retrato en semitono: cabeza mirando hacia arriba, luz fuerte desde la derecha
    halftone() {
      const c = work();
      fr(c, 0, 0, PW, PH, lin(c, 160, 0, 0, 224, [[0, 252], [0.55, 205], [1, 150]]));
      for (let i = 0; i < 9; i++) ln(c, [118 + i * 5, 0, 160, 42 - i * 5], gv(255, 0.5), 1.5);             // rayos de luz arriba
      pg(c, [0, 224, 4, 194, 28, 176, 58, 168, 80, 184, 102, 168, 132, 176, 156, 194, 160, 224], lin(c, 0, 0, 160, 0, [[0, 20], [0.6, 60], [1, 120]])); // chaqueta
      pg(c, [62, 168, 80, 204, 98, 168, 90, 164, 80, 186, 70, 164], 240);                                   // cuello de camisa
      pg(c, [60, 120, 100, 120, 102, 168, 80, 184, 58, 168], lin(c, 58, 0, 102, 0, [[0, 115], [0.5, 170], [1, 228]])); // cuello
      el(c, 80, 136, 24, 10, gv(0, 0.4));                                                                 // sombra de la barbilla
      c.save(); c.translate(80, 86); c.rotate(-0.1);
      el(c, -40, 4, 6, 11, 140); el(c, -40, 4, 2.5, 6, 90); el(c, 40, 2, 6, 11, 230); el(c, 40, 2, 2.5, 6, 170); // orejas
      c.save(); c.beginPath(); c.ellipse(0, 0, 38, 50, 0, 0, Math.PI * 2); c.clip();
      fr(c, -50, -60, 100, 120, lin(c, -38, 0, 38, 0, [[0, 155], [0.4, 208], [0.7, 246], [1, 255]]));
      el(c, -30, 16, 10, 18, gv(0, 0.18)); el(c, 0, 52, 34, 13, gv(0, 0.3));
      c.restore();
      pg(c, [-41, -4, -41, -28, -30, -47, -8, -56, 14, -55, 33, -45, 41, -27, 40, -6, 35, -22, 20, -32, 0, -34, -20, -31, -34, -20], 22); // pelo corto
      for (let k = 0; k < 9; k++) ln(c, [-24 + k * 6, -50 + Math.abs(k - 4) * 1.4, -20 + k * 6, -40], 90, 1);
      // cejas altas, ojos mirando hacia arriba
      ln(c, [-27, -13, -17, -19, -6, -16], 20, 4); ln(c, [6, -16, 17, -20, 27, -14], 30, 4);
      el(c, -15, -3, 9, 4.6, 248); el(c, 15, -4, 9, 4.6, 252);
      el(c, -15, -6, 4.2, 4.2, 12); el(c, 15, -7, 4.2, 4.2, 12); el(c, -13.5, -7.5, 1.4, 1.4, 255); el(c, 16.5, -8.5, 1.4, 1.4, 255);
      qd(c, [-25, -3, -15, -11, -5, -4], 8, 2.4); qd(c, [5, -4, 15, -12, 25, -4], 8, 2.4);
      qd(c, [-23, 2, -15, 4, -7, 1], 110, 1.2); qd(c, [7, 1, 15, 3, 23, 0], 150, 1.2);
      // nariz: arista clara, sombra lateral y orificios pequeños
      pg(c, [-2, -1, -7, 14, -2, 16], gv(0, 0.3)); ln(c, [2, -2, 4, 12], 255, 2.4);
      el(c, 0, 17, 8, 3, gv(0, 0.45)); el(c, -4, 17, 2.4, 1.5, 15); el(c, 5, 17, 2.4, 1.5, 25); el(c, 2, 13, 3, 2.4, 255);
      // boca entreabierta
      el(c, 0, 30, 10, 2.6, 15); qd(c, [-11, 29, 0, 26, 11, 29], 70, 1.4); el(c, 1, 34.5, 8, 2, gv(255, 0.7)); el(c, 0, 41, 9, 2.5, gv(0, 0.25));
      c.restore();
      return halftone(lum(c), K, W, 4).c;
    },
    glitch() {
      const o = G.mkCanvas(PW, PH), c = o.x;
      fr(c, 0, 0, PW, PH, 0);
      const art = (col, dx, fillK) => {
        c.save(); c.translate(dx, 0);
        const J = (p) => p.map((v) => v + (Math.random() - 0.5) * 0.9); // trazo a mano
        for (const p of [[64, 64, 40, 36, 66, 14, 44, -4], [76, 60, 84, 30, 54, 18, 66, -4], [94, 58, 112, 34, 98, 12, 122, -4], [108, 62, 140, 52, 146, 22, 166, 10], [56, 70, 24, 60, 16, 38, 0, 28], [100, 58, 104, 36, 128, 30, 134, -4]]) { bz(c, J(p), col, 2); bz(c, J(p.map((v, i) => v + (i % 2 ? 0 : 2.5))), col, 1.1); }
        c.beginPath(); c.moveTo(50, 134); c.bezierCurveTo(36, 100, 42, 52, 84, 46); c.bezierCurveTo(126, 42, 136, 96, 126, 134); c.lineTo(118, 126); c.lineTo(114, 136); c.lineTo(106, 118); c.lineTo(68, 118); c.lineTo(62, 136); c.lineTo(58, 124); c.closePath();
        if (fillK) { c.fillStyle = K; c.fill(); }
        sk(c, col, 1.8); c.stroke();
        for (const p of [[58, 94, 52, 106, 54, 120, 50, 130], [64, 96, 60, 108, 62, 120, 58, 128], [118, 88, 122, 102, 122, 116, 124, 128], [112, 92, 116, 104, 114, 116, 118, 124], [72, 52, 70, 58, 68, 62, 66, 66], [92, 48, 92, 54, 90, 58, 90, 62], [104, 50, 108, 56, 110, 60, 112, 64]]) bz(c, J(p), col, 1.3);
        c.beginPath(); c.moveTo(60, 94); c.bezierCurveTo(64, 112, 74, 126, 86, 128); c.bezierCurveTo(98, 126, 108, 114, 114, 90); c.closePath(); if (fillK) { c.fillStyle = K; c.fill(); } sk(c, col, 1.7); c.stroke();
        c.beginPath(); c.moveTo(52, 68); c.lineTo(120, 60); c.lineTo(126, 86); c.lineTo(58, 96); c.closePath(); if (fillK) { c.fillStyle = K; c.fill(); } sk(c, col, 2); c.stroke();
        ln(c, J([56, 82, 124, 75]), col, 1.3); ln(c, J([46, 70, 52, 68, 58, 96, 50, 96, 46, 70]), col, 1.5); ln(c, J([120, 60, 132, 62, 136, 84, 126, 86]), col, 1.5);
        ln(c, J([74, 66, 76, 92]), col, 1); ln(c, J([102, 63, 105, 89]), col, 1); ln(c, J([60, 70, 116, 64]), col, 0.8);
        ln(c, J([80, 113, 90, 112]), col, 1.6); ln(c, J([82, 117, 88, 116]), col, 1.1); ln(c, J([88, 103, 87, 106]), col, 1.1);
        ln(c, J([78, 127, 76, 146]), col, 1.6); ln(c, J([96, 126, 98, 146]), col, 1.6);
        ln(c, J([76, 146, 84, 162, 88, 152, 92, 162, 98, 146]), col, 1.6);
        ln(c, J([76, 146, 40, 154, 14, 178]), col, 1.8); ln(c, J([98, 146, 134, 154, 156, 180]), col, 1.8);
        ln(c, J([40, 160, 46, 182]), col, 1.2); ln(c, J([134, 160, 128, 182]), col, 1.2); ln(c, J([88, 162, 88, 182]), col, 1.1);
        c.restore();
      };
      art(B, -2, false); art(Gr, 2, false); art(W, 0, true);
      onto(o, () => { for (const [t, y] of [["IT'S ALL IN", 192], ['THE CODE', 208]]) { G.text(t, PW / 2 - 2, y, B, { s: 2, al: 'c', b: true }); G.text(t, PW / 2 + 2, y, Gr, { s: 2, al: 'c', b: true }); G.text(t, PW / 2, y, W, { s: 2, al: 'c', b: true }); } });
      snap(o);
      for (let k = 0; k < 5; k++) { const y = Math.floor(Math.random() * (PH - 8)), h = 2 + Math.floor(Math.random() * 5), dx = Math.round((Math.random() - 0.5) * 14); c.drawImage(o.c, 0, y, PW, h, dx, y, PW, h); }
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
    // 6) mano de alambre que sale del monitor y toca el dedo de una mano de verdad
    touch() {
      const c = work();
      fr(c, 0, 0, PW, PH, rad(c, 100, 120, 10, 170, [[0, 24], [1, 0]]));
      pg(c, [4, 14, 22, 4, 86, 4, 70, 14], 238); pg(c, [70, 14, 86, 4, 86, 50, 70, 60], 140);
      rr(c, 2, 12, 70, 50, 3, lin(c, 2, 0, 72, 0, [[0, 225], [1, 185]])); rr(c, 8, 18, 46, 38, 4, 15);
      for (let i = 0; i < 3; i++) el(c, 63, 24 + i * 9, 2, 2, 100); fr(c, 60, 50, 8, 2, 90);
      c.save(); c.translate(165, 184); c.rotate(-2.2); c.scale(1.5, 1.5);
      fr(c, -70, -14, 54, 28, lin(c, 0, -14, 0, 14, [[0, 110], [1, 60]])); fr(c, -22, -13, 6, 26, 248);
      handPath(c); fill(c, lin(c, 0, -14, 0, 16, [[0, 228], [1, 165]])); c.fill(); sk(c, 110, 0.8); c.stroke();
      ln(c, [26, -8, 54, -8], gv(255, 0.6), 1); el(c, 56, -8, 2.2, 1.6, 245); ln(c, [6, -2, 22, 2], 140, 0.6);
      c.restore();
      const o = dither(lum(c), [K, L, W]), x = o.x;
      for (let y = 20; y < 54; y += 3) for (let k = 10; k < 52; k += 3) if (Math.random() < 0.2) fr(x, k, y, 1, 1, Gr);
      x.save(); x.translate(28, 52); x.rotate(0.85); x.scale(1.7, 1.7);
      x.save(); handPath(x); x.clip();
      sk(x, Gr, 0.7); for (let k = -22; k < 22; k += 3) { x.beginPath(); x.moveTo(-40, k); x.quadraticCurveTo(10, k + 2, 64, k); x.stroke(); }
      for (let k = -36; k < 64; k += 3.4) { x.beginPath(); x.moveTo(k, -24); x.quadraticCurveTo(k + 2, 0, k, 24); x.stroke(); }
      x.restore(); sk(x, Gr, 1); handPath(x); x.stroke();
      x.restore();
      const sx = 103, sy = 118, cols = [W, B, Gr, L];
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + 0.15, l = i % 4 === 0 ? 42 : i % 2 ? 20 : 12; sk(x, cols[i % 4], 1); x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); x.stroke(); }
      el(x, sx, sy, 3, 3, W);
      snap(o);
      return o.c;
    },
    // 7) caballero oficinista: BORN TO QUEST
    knight() {
      const o = G.mkCanvas(PW, PH);
      onto(o, (c) => {
        G.rect(0, 0, PW, PH, K); G.drect(0, 0, PW, PH, 3, L, null);
        drawSprite(c, sprite('Born to Quest', '700 23px ' + G.FONT_GOTH, W, PW - 8), PW / 2, 3);
        G.box(8, 34, 144, 156, W); G.rect(9, 35, 142, 154, K); G.drect(9, 35, 142, 154, 2, L, null);
        for (let i = 0; i < 10; i++) { G.rect(12, 62 + i * 4, 34, 3, i % 2 ? L : Gr); G.rect(12, 65 + i * 4, 34, 1, K); }
        for (let i = 0; i < 12; i++) { G.rect(126, 104 + i * 4, 23, 3, i % 2 ? L : Gr); G.rect(126, 107 + i * 4, 23, 1, K); }
        G.rect(44, 70, 36, 30, Gr); G.box(44, 70, 36, 30, K); G.rect(48, 74, 26, 20, W); G.drect(48, 74, 26, 20, 4, Gr, null);
        G.rect(12, 96, 46, 44, Gr); G.box(12, 96, 46, 44, K); G.drect(46, 96, 12, 44, 6, K, null);
        G.rect(17, 101, 28, 24, W); G.drect(17, 101, 28, 24, 3, Gr, null); for (let i = 0; i < 4; i++) G.rect(20, 105 + i * 5, 10 + (i * 7) % 14, 1, K);
        G.rect(24, 140, 20, 6, Gr); G.box(24, 140, 20, 6, K);
        G.rect(9, 150, 142, 39, L); G.drect(9, 150, 142, 39, 4, K, null); G.rect(9, 150, 142, 1, K);
        for (const [px, py] of [[16, 162], [44, 172], [104, 166], [124, 176]]) { G.rect(px, py, 22, 12, Gr); G.box(px, py, 22, 12, K); for (let i = 0; i < 3; i++) G.rect(px + 3, py + 3 + i * 3, 15, 1, K); }
        G.rect(56, 142, 48, 10, L); G.box(56, 142, 48, 10, K); for (let i = 0; i < 11; i++) { G.px(58 + i * 4, 145, K); G.px(58 + i * 4, 148, K); }
        // cuerpo de malla, sobreveste con cruz, almófar, cara y yelmo con nasal
        G.rect(80, 92, 48, 58, B); G.drect(80, 92, 48, 58, 8, K, null);
        G.circ(84, 100, 9, B, K); G.circ(124, 100, 9, B, K); G.drect(75, 91, 58, 18, 8, K, null);
        G.rect(93, 98, 24, 52, W); G.drect(93, 98, 24, 52, 3, L, null); G.rect(103, 102, 4, 34, K); G.rect(96, 112, 18, 4, K); G.rect(101, 102, 8, 2, K); G.rect(101, 134, 8, 2, K);
        G.rect(91, 80, 28, 14, B); G.drect(91, 80, 28, 14, 8, K, null);
        G.rect(96, 66, 18, 18, W); G.drect(96, 66, 18, 18, 6, L, null); G.rect(100, 73, 3, 2, K); G.rect(108, 73, 3, 2, K); G.rect(103, 79, 5, 1, K);
        G.tri(105, 40, 90, 70, 120, 70, B); G.drect(90, 42, 15, 28, 3, W, null); G.rect(90, 68, 30, 4, B); G.box(90, 68, 30, 4, K); G.rect(104, 70, 2, 11, B);
        for (const a of [[82, 104, 92, 112, 70, 142, 62, 137], [118, 106, 127, 114, 90, 146, 81, 140]]) {
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
    // 9) póster: monitor con calavera — TRUST NO ONE
    skullcrt() {
      const c = work();
      fr(c, 0, 0, PW, PH, 0);
      pg(c, [0, 176, 160, 160, 160, 224, 0, 224], lin(c, 0, 160, 0, 224, [[0, 125], [1, 50]]));
      el(c, 80, 168, 64, 8, gv(0, 0.55));
      pg(c, [22, 62, 34, 52, 126, 52, 138, 62], 246);
      rr(c, 20, 60, 120, 98, 5, lin(c, 20, 0, 140, 0, [[0, 238], [1, 196]]));
      rr(c, 30, 68, 100, 78, 8, 15);
      c.save(); c.beginPath(); if (c.roundRect) c.roundRect(32, 70, 96, 74, 7); else c.rect(32, 70, 96, 74); c.clip();
      fr(c, 32, 70, 96, 74, rad(c, 80, 106, 4, 56, [[0, 70], [1, 10]]));
      el(c, 80, 98, 22, 20, rad(c, 74, 90, 2, 26, [[0, 245], [1, 160]]));
      rr(c, 66, 108, 28, 16, 4, lin(c, 0, 108, 0, 124, [[0, 210], [1, 130]]));
      el(c, 71, 101, 6, 5.5, 10); el(c, 89, 101, 6, 5.5, 10); el(c, 71, 101, 1.2, 1.2, 255);
      pg(c, [80, 108, 77, 115, 83, 115], 20);
      for (let i = 0; i < 6; i++) fr(c, 68.5 + i * 4.2, 118, 1, 6, 60);
      for (let y = 70; y < 144; y += 3) fr(c, 32, y, 96, 1, gv(0, 0.35));
      pg(c, [36, 72, 56, 72, 34, 110, 34, 92], gv(255, 0.25));
      c.restore();
      el(c, 124, 151, 1.6, 1.6, 255); fr(c, 30, 150, 30, 2, 120);
      fr(c, 62, 158, 36, 6, 150); pg(c, [56, 164, 104, 164, 110, 170, 50, 170], 175);
      pg(c, [18, 182, 118, 182, 128, 204, 8, 204], 222); pg(c, [8, 204, 128, 204, 128, 208, 8, 208], 100);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 15; k++) { const t = (r + 0.5) / 4, xl = 18 + (8 - 18) * t, xr = 118 + (128 - 118) * t, w = (xr - xl) / 15; fr(c, xl + k * w + 1, 184 + r * 5, w - 1.6, 3, 120); }
      el(c, 144, 196, 8, 11, lin(c, 136, 0, 152, 0, [[0, 235], [1, 170]])); fr(c, 143.5, 186, 1, 9, 120);
      qd(c, [144, 185, 146, 170, 132, 166], 200, 1);
      const o = dither(lum(c), [K, W]);
      onto(o, () => { G.text('TRUST NO ONE', PW / 2, 10, W, { s: 2, al: 'c' }); G.text('NOT EVEN YOUR COMPUTER', PW / 2, 30, W, { al: 'c' }); G.dash(14, 42, PW - 28, W, 1, 1); });
      return o.c;
    },
    // 10) cartel de privacidad: ojo en semitono verde y texto de terminal
    watch() {
      const c = work();
      fr(c, 0, 0, PW, PH, 0);
      c.save(); c.beginPath(); c.rect(6, 30, 148, 96); c.clip();
      fr(c, 6, 30, 148, 96, lin(c, 0, 30, 0, 126, [[0, 150], [1, 205]]));
      qd(c, [0, 52, 70, 30, 160, 50], 60, 9); for (let k = 0; k < 30; k++) { const x = 10 + k * 5, b = Math.sin((k / 30) * Math.PI) * 12; ln(c, [x, 46 - b, x + 4, 41 - b], 35, 1); }
      qd(c, [10, 80, 80, 48, 152, 74], 110, 2.5);
      const lid = () => { c.beginPath(); c.moveTo(14, 96); c.quadraticCurveTo(80, 56, 148, 90); c.quadraticCurveTo(84, 126, 14, 96); c.closePath(); };
      lid(); fill(c, 235); c.fill();
      c.save(); lid(); c.clip();
      el(c, 82, 90, 24, 24, rad(c, 82, 90, 6, 24, [[0, 120], [0.7, 80], [1, 30]]));
      sk(c, 60, 0.7); for (let a = 0; a < 6.28; a += 0.25) { c.beginPath(); c.moveTo(82 + Math.cos(a) * 10, 90 + Math.sin(a) * 10); c.lineTo(82 + Math.cos(a) * 22, 90 + Math.sin(a) * 22); c.stroke(); }
      el(c, 82, 90, 10, 10, 5); el(c, 90, 82, 6, 3, 255);
      fr(c, 0, 0, PW, PH, lin(c, 0, 70, 0, 86, [[0, 0, 0.5], [1, 0, 0]]));
      c.restore();
      qd(c, [14, 96, 80, 56, 148, 90], 15, 3);
      for (let t = 0.08; t < 0.95; t += 0.06) { const x = (1 - t) * (1 - t) * 14 + 2 * (1 - t) * t * 80 + t * t * 148, y = (1 - t) * (1 - t) * 96 + 2 * (1 - t) * t * 56 + t * t * 90; ln(c, [x, y, x + (t - 0.4) * 10, y - 7], 20, 1.2); }
      qd(c, [14, 96, 84, 126, 148, 90], 90, 1.4);
      el(c, 130, 112, 22, 10, gv(255, 0.45));
      ln(c, [8, 34, 14, 70, 10, 110], 60, 2); ln(c, [14, 34, 20, 66], 70, 1.5);
      c.restore();
      const o = halftone(lum(c), K, Gr, 2.6, L);
      onto(o, () => {
        G.rect(0, 0, PW, 30, K); G.rect(0, 126, PW, PH - 126, K);
        G.dash(6, 4, 60, Gr, 2, 2); G.dash(94, 4, 60, Gr, 2, 2); G.dash(6, 24, 60, Gr, 2, 2); G.dash(94, 24, 60, Gr, 2, 2);
        G.text('OFFLINE.', 6, 11, Gr); G.text('NEØ NET', PW - 6, 11, Gr, { al: 'r' });
        G.rect(73, 5, 14, 18, Gr); G.ell(80, 10, 5, 2.5, K, K); G.circ(80, 10, 1, Gr, Gr); G.ell(80, 18, 5, 2.5, K, K); G.circ(80, 18, 1, Gr, Gr);
        G.box(6, 28, PW - 12, 98, Gr);
        G.rect(6, 130, PW - 12, 7, L);
        G.box(6, 139, PW - 12, 68, Gr);
        ['> THE NETWORK IS', 'WATCHING EVERY CLICK.', '', '> ENCRYPT YOUR DREAMS.', 'OPT OUT OF THE VOID.', '', '> TAKE BACK YOUR MIND.'].forEach((t, i) => G.text(t, 10, 143 + i * 9, Gr));
        G.text('STAY OFFLINE. NEØ NET', 8, 212, L);
      });
      return o.c;
    },
    // 11) página de teletexto: figura en mosaico y anuncio inventado
    teletext() {
      const o = G.mkCanvas(PW, PH);
      onto(o, (c) => {
        G.rect(0, 0, PW, PH, K);
        G.text('693 NEØTEXT  31 OKT 00:14', 4, 4, W);
        G.text('-W-', 4, 14, L);
        const fig = [
          '....YYYYYY....', '..YYYYYYYYYY..', '.YYWWWWWWWYYY.', '.YWWWWWWWWWYY.', 'YYWWKWWWKWWYY.', 'YYWWWWWWWWWYY.', 'YYWWWKKKWWWYY.', 'YYYWWWWWWWYYY.',
          'YYYYWWWWWYYYY.', 'YYY..WWW..YYY.', 'YY.WWWWWWWW.YY', 'YY.WWWWWWWWWWW', 'YY.WWWWWWWWWWB', 'YY.WWWWWWW..BB', 'YY.CCCCCCC....', 'YY.CWCWCWC....',
          'YY.WWWWWWW....', 'YY..WWWWWW....', 'Y...WWWWWW....', 'Y...WWWWWWW...', 'Y..WWWWWWWW...', '...WWWWWWWWW..', '...WWWWWWWWW..', '..WWWWWWWWWW..',
          '..WWWWWWWWWWW.', '..WWWWWWWWWWW.', '...WW....WW...', '...WW....WW...', '..BBBB..BBBB..', '.BBBBBB.BBBBB.', 'BBBBBBBBBBBBBB', 'BBBBBBBBBBBBBB'];
        const cmap = { Y: Gr, W: W, K: K, C: L, B: B };
        fig.forEach((row, j) => row.split('').forEach((ch, i) => { if (cmap[ch]) G.rect(4 + i * 4, 26 + j * 5, 4, 5, cmap[ch]); }));
        G.text('ONLY 99', 66, 26, Gr, { s: 2 }); G.text('CREDITS!', 64, 44, Gr, { s: 2 });
        ['UPLOAD YOUR MIND', 'TODAY AND CHAT', 'WITH YOUR OWN', 'COMPUTER 24H'].forEach((t, i) => G.text(t, 64, 66 + i * 9, L));
        G.text('0800-', 66, 108, Gr, { s: 2 }); G.text('13 13 13', 64, 128, Gr, { s: 2 });
        G.text('CALL + JACK IN', 64, 152, L);
        ['14 CR/MIN ON NEØTEL LINES', 'NO REFUNDS. NO ESCAPE.', 'ONLY FOR HUMANS. MAYBE.'].forEach((t, i) => G.text(t, 4, 190 + i * 9, W));
        G.tri(4, 219, 9, 216, 9, 222, B); G.box(10, 216, 8, 6, B); G.text('GAMES', PW / 2, 216, Gr, { al: 'c' }); G.box(PW - 18, 216, 8, 6, B); G.tri(PW - 4, 219, PW - 9, 216, PW - 9, 222, B);
      });
      return o.c;
    },
    // 12) ventana VIRUS DETECTED con una calavera tramada
    virus() {
      const c = work();
      fr(c, 0, 0, PW, PH, 0);
      c.save(); c.beginPath(); c.rect(12, 46, 136, 116); c.clip();
      el(c, 70, 94, 46, 38, rad(c, 86, 80, 6, 56, [[0, 255], [0.6, 210], [1, 120]]));
      pg(c, [90, 74, 124, 84, 132, 112, 128, 132, 118, 140, 96, 140, 80, 122], rad(c, 104, 100, 4, 40, [[0, 250], [1, 170]]));
      el(c, 46, 104, 20, 24, gv(0, 0.45));
      el(c, 92, 100, 14, 12, 8); el(c, 122, 104, 7, 11, 15);
      pg(c, [108, 112, 114, 128, 102, 128], 15);
      el(c, 106, 110, 14, 6, gv(255, 0.5));
      fr(c, 92, 132, 40, 12, 240); for (let i = 0; i < 8; i++) fr(c, 95 + i * 4.8, 132, 1.2, 12, 40);
      pg(c, [86, 146, 132, 144, 128, 160, 98, 164, 82, 154], lin(c, 0, 144, 0, 164, [[0, 220], [1, 140]]));
      for (let i = 0; i < 7; i++) fr(c, 96 + i * 4.8, 146, 1.2, 8, 50);
      ln(c, [62, 64, 72, 92, 66, 120], gv(0, 0.4), 1.5);
      c.restore();
      const pic = dither2(lum(c), [B, W]), o = G.mkCanvas(PW, PH);
      onto(o, (x) => {
        G.rect(0, 0, PW, PH, K);
        G.rect(8, 30, 144, 170, B); G.box(8, 30, 144, 170, W); G.box(10, 32, 140, 166, W);
        G.rect(11, 33, 138, 13, W); G.text('VIRUS DETECTED', PW / 2 - 4, 36, B, { al: 'c', b: true });
        G.line(139, 36, 145, 42, B); G.line(140, 36, 146, 42, B); G.line(145, 36, 139, 42, B); G.line(146, 36, 140, 42, B);
        x.drawImage(pic.c, 12, 46, 136, 116, 12, 46, 136, 116);
        G.text('×', 92, 97, W, { al: 'c', b: true });
        G.text('ACCESS TO THE FILE', PW / 2, 166, W, { al: 'c' }); G.text('WAS DENIED', PW / 2, 175, W, { al: 'c' });
        G.box(30, 184, 44, 12, W); G.text('RETRY', 52, 187, W, { al: 'c' }); G.box(86, 184, 44, 12, W); G.text('CANCEL', 108, 187, W, { al: 'c' });
      });
      return o.c;
    },

    // 13) mago oficinista: BORN TO CAST
    wizard() {
      const o = G.mkCanvas(PW, PH);
      onto(o, (c) => {
        G.rect(0, 0, PW, PH, K); G.drect(0, 0, PW, PH, 2, L, null);
        drawSprite(c, sprite('Born to Cast', '700 23px ' + G.FONT_GOTH, W, PW - 8), PW / 2, 3);
        G.box(8, 34, 144, 156, W); G.rect(9, 35, 142, 154, K); G.drect(9, 35, 142, 115, 3, B, null);
        for (let i = 0; i < 6; i++) G.text('*', 14 + ((i * 37) % 128), 40 + ((i * 23) % 50), W);
        // monitor
        G.rect(86, 86, 50, 46, L); G.box(86, 86, 50, 46, K); G.drect(126, 86, 10, 46, 6, K, null);
        G.rect(91, 91, 34, 28, Gr); G.drect(91, 91, 34, 28, 4, K, null); for (let i = 0; i < 4; i++) G.rect(94, 95 + i * 5, 8 + (i * 9) % 18, 1, K);
        G.rect(102, 132, 18, 6, L); G.box(102, 132, 18, 6, K);
        G.rect(9, 150, 142, 39, L); G.drect(9, 150, 142, 39, 3, K, null); G.rect(9, 150, 142, 1, K);
        G.rect(82, 142, 48, 9, W); G.box(82, 142, 48, 9, K); for (let i = 0; i < 10; i++) { G.px(85 + i * 4, 145, K); G.px(85 + i * 4, 147, K); }
        // mago: sombrero, barba, túnica, manos
        G.tri(44, 40, 26, 84, 66, 84, B); G.drect(26, 40, 40, 44, 3, W, null); G.rect(20, 82, 52, 5, B); G.box(20, 82, 52, 5, K);
        G.text('*', 40, 58, W, { b: true }); G.text('*', 50, 70, W);
        G.rect(32, 87, 28, 12, W); G.drect(32, 87, 28, 12, 6, L, null); G.rect(37, 91, 4, 2, K); G.rect(51, 91, 4, 2, K);
        G.tri(30, 98, 62, 98, 46, 136, W); G.drect(30, 98, 32, 38, 4, L, null);
        G.rect(18, 104, 56, 46, B); G.drect(18, 104, 56, 46, 8, K, null); G.tri(30, 98, 62, 98, 46, 136, W);
        G.rect(62, 118, 28, 8, B); G.drect(62, 118, 28, 8, 8, K, null); G.rect(88, 140, 8, 5, W); G.box(88, 140, 8, 5, K);
        G.rect(70, 128, 22, 7, B); G.drect(70, 128, 22, 7, 8, K, null); G.rect(100, 141, 8, 5, W); G.box(100, 141, 8, 5, K);
        G.rect(12, 108, 3, 42, L); G.circ(13, 106, 4, Gr, K);
        G.rect(22, 160, 22, 14, W); for (let i = 0; i < 3; i++) G.rect(25, 163 + i * 3, 16, 1, K);
        drawSprite(c, sprite('Forced to Compile', '700 19px ' + G.FONT_GOTH, W, PW - 8), PW / 2, 194);
      });
      snap(o);
      return o.c;
    },
  };
  G.DRAW_KINDS = Object.keys(D);
  const cache = {};
  G.drawPic = function (kind) { if (!cache[kind]) cache[kind] = D[kind](); return cache[kind]; };
  G.DRAW_W = PW; G.DRAW_H = PH;
})(window.G);
