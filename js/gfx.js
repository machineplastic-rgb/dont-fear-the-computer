'use strict';
// Primitivas pixel-art, tramas Bayer, texto bitmap, sprites ASCII y sprites de fuente umbralizados (1 bit).
(function (G) {
  let T = G.g;
  G.target = (x) => { T = x || G.g; };
  G.ctx = () => T;
  const F = Math.floor;

  G.rect = (x, y, w, h, c) => { if (w <= 0 || h <= 0) return; T.fillStyle = c; T.fillRect(F(x), F(y), F(w), F(h)); };
  G.px = (x, y, c) => { T.fillStyle = c; T.fillRect(F(x), F(y), 1, 1); };
  G.box = (x, y, w, h, c, t) => {
    t = t || 1; x = F(x); y = F(y); w = F(w); h = F(h);
    T.fillStyle = c; T.fillRect(x, y, w, t); T.fillRect(x, y + h - t, w, t); T.fillRect(x, y, t, h); T.fillRect(x + w - t, y, t, h);
  };
  G.hline = (x, y, w, c) => G.rect(x, y, w, 1, c);
  G.vline = (x, y, h, c) => G.rect(x, y, 1, h, c);
  // línea discontinua (estilo "---------")
  G.dash = (x, y, w, c, on, off) => { on = on || 4; off = off || 3; T.fillStyle = c; for (let i = 0; i < w; i += on + off) T.fillRect(F(x + i), F(y), Math.min(on, w - i), 1); };

  G.line = function (x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    T.fillStyle = c;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      T.fillRect(x0, y0, 1, 1);
      if ((x0 === x1 && y0 === y1) || n++ > 2000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  // elipse rellena con borde (fill o out pueden ser null)
  G.ell = function (cx, cy, rx, ry, fill, out) {
    cx = F(cx); cy = F(cy);
    const RX = rx + 0.5, RY = ry + 0.5, ix = rx - 0.5, iy = ry - 0.5;
    for (let y = -ry; y <= ry; y++) {
      let x0 = null, x1 = null;
      const spans = [];
      for (let x = -rx; x <= rx; x++) {
        const d = (x * x) / (RX * RX) + (y * y) / (RY * RY);
        if (d > 1) continue;
        const di = ix > 0 && iy > 0 ? (x * x) / (ix * ix) + (y * y) / (iy * iy) : 2;
        const edge = di > 1;
        if (edge && out) spans.push(x);
        else if (!edge && fill) { if (x0 === null) x0 = x; x1 = x; }
      }
      if (fill && x0 !== null) { T.fillStyle = fill; T.fillRect(cx + x0, cy + y, x1 - x0 + 1, 1); }
      if (out) { T.fillStyle = out; for (const x of spans) T.fillRect(cx + x, cy + y, 1, 1); }
    }
  };
  G.circ = (cx, cy, r, fill, out) => G.ell(cx, cy, r, r, fill, out);
  // triángulo relleno (test de centro de píxel)
  G.tri = function (ax, ay, bx, by, cx, cy, c) {
    const minX = F(Math.min(ax, bx, cx)), maxX = Math.ceil(Math.max(ax, bx, cx));
    const minY = F(Math.min(ay, by, cy)), maxY = Math.ceil(Math.max(ay, by, cy));
    const s = (px, py, x1, y1, x2, y2) => (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    T.fillStyle = c;
    for (let y = minY; y <= maxY; y++) {
      let x0 = null, x1 = null;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const d1 = s(px, py, ax, ay, bx, by), d2 = s(px, py, bx, by, cx, cy), d3 = s(px, py, cx, cy, ax, ay);
        const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) { if (x0 === null) x0 = x; x1 = x; }
      }
      if (x0 !== null) T.fillRect(x0, y, x1 - x0 + 1, 1);
    }
  };

  // ---------- tramas Bayer 4x4 ----------
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  G.BAYER = BAYER;
  G.bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const patCache = {};
  G.dpat = function (level, on, off) {
    const k = level + '|' + on + '|' + off;
    if (patCache[k]) return patCache[k];
    const c = document.createElement('canvas'); c.width = 4; c.height = 4; const x = c.getContext('2d');
    for (let i = 0; i < 16; i++) { const col = BAYER[i] < level ? on : off; if (col) { x.fillStyle = col; x.fillRect(i % 4, F(i / 4), 1, 1); } }
    return (patCache[k] = G.g.createPattern(c, 'repeat'));
  };
  G.drect = (x, y, w, h, level, on, off) => { if (w <= 0 || h <= 0) return; T.fillStyle = G.dpat(level, on, off || null); T.fillRect(F(x), F(y), F(w), F(h)); };
  // patrón a cuadros (scrollbars) y rayas
  G.checker = (x, y, w, h, a, b) => G.drect(x, y, w, h, 8, a, b);

  // ---------- texto bitmap ----------
  const FW = 5, FH = 7, CW = 6;
  let index = {}, atlas = null; const tints = {};
  function buildAtlas() {
    const chars = Object.keys(G.FONT5);
    atlas = document.createElement('canvas'); atlas.width = chars.length * CW; atlas.height = FH;
    const x = atlas.getContext('2d'); const id = x.createImageData(atlas.width, FH);
    chars.forEach((ch, i) => {
      index[ch] = i; const d = G.FONT5[ch];
      for (let r = 0; r < FH; r++) for (let c = 0; c < FW; c++) if (d[r * FW + c] === '#') {
        const p = (r * atlas.width + (i * CW + c)) * 4; id.data[p] = id.data[p + 1] = id.data[p + 2] = 255; id.data[p + 3] = 255;
      }
    });
    x.putImageData(id, 0, 0);
  }
  function tint(col) {
    if (!atlas) buildAtlas();
    if (tints[col]) return tints[col];
    const c = document.createElement('canvas'); c.width = atlas.width; c.height = FH;
    const x = c.getContext('2d'); x.drawImage(atlas, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, FH);
    return (tints[col] = c);
  }
  function gi(ch) { if (index[ch] !== undefined) return index[ch]; const u = ch.toUpperCase(); return index[u]; }
  G.textW = (s, sc, sp, b) => { sc = sc || 1; sp = sp == null ? 1 : sp; s = String(s); return s.length ? s.length * (FW + sp + (b ? 1 : 0)) * sc - sp * sc : 0; };
  // o: {s: escala, sp: espaciado, al: 'l'|'c'|'r', b: negrita, lh: alto de línea}
  G.text = function (s, x, y, col, o) {
    if (!atlas) buildAtlas();
    o = o || {}; const sc = o.s || 1, sp = o.sp == null ? 1 : o.sp, b = !!o.b;
    const atl = tint(col);
    const lines = String(s).split('\n');
    for (let li = 0; li < lines.length; li++) {
      const ln = lines[li];
      const w = G.textW(ln, sc, sp, b);
      let xx = F(x);
      if (o.al === 'c') xx = F(x - w / 2); else if (o.al === 'r') xx = F(x - w);
      const yy = F(y + li * (o.lh || 9) * sc);
      for (let i = 0; i < ln.length; i++) {
        const ch = ln[i];
        if (ch === '█') { T.fillStyle = col; T.fillRect(xx, yy, (FW + sp) * sc, FH * sc); }
        else if (ch !== ' ') {
          const k = gi(ch);
          if (k !== undefined) {
            T.drawImage(atl, k * CW, 0, FW, FH, xx, yy, FW * sc, FH * sc);
            if (b) T.drawImage(atl, k * CW, 0, FW, FH, xx + sc, yy, FW * sc, FH * sc);
          }
        }
        xx += (FW + sp + (b ? 1 : 0)) * sc;
      }
    }
  };
  // texto a rayas horizontales (estilo display "HORIZONTAL")
  G.textStripe = function (s, x, y, col, sc, o) {
    o = o || {}; s = String(s);
    const gap = o.gap == null ? Math.max(1, F(sc / 3)) : o.gap, spx = o.spx == null ? sc : o.spx;
    const w = s.length * (FW * sc + spx) - spx;
    let xx = F(o.al === 'c' ? x - w / 2 : o.al === 'r' ? x - w : x);
    T.fillStyle = col;
    for (const ch of s) {
      const d = G.FONT5[ch] || G.FONT5[ch.toUpperCase()];
      if (d) for (let r = 0; r < FH; r++) {
        const jit = o.jit ? o.jit(r) : 0;
        for (let c = 0; c < FW; c++) if (d[r * FW + c] === '#') T.fillRect(xx + c * sc + jit, F(y) + r * sc, sc, sc - gap);
      }
      xx += FW * sc + spx;
    }
    return w;
  };
  G.stripeW = (s, sc, spx) => { spx = spx == null ? sc : spx; return String(s).length * (FW * sc + spx) - spx; };
  // partir en líneas por ancho
  G.wrap = function (s, maxW, sc) {
    sc = sc || 1; const maxC = Math.max(1, F((maxW + sc) / (CW * sc)));
    const out = [];
    String(s).split('\n').forEach((para) => {
      const words = para.split(' '); let line = '';
      for (const w of words) {
        if (!line.length) line = w;
        else if ((line + ' ' + w).length <= maxC) line += ' ' + w;
        else { out.push(line); line = w; }
        while (line.length > maxC) { out.push(line.slice(0, maxC)); line = line.slice(maxC); }
      }
      out.push(line);
    });
    return out;
  };

  // ---------- sprites de fuentes del sistema/web umbralizados a 1 bit ----------
  const fsCache = new Map();
  function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  G.hexRGB = hexRGB;
  G.fsprite = function (text, font, col, thr) {
    const k = text + '|' + font + '|' + col + '|' + (thr || 128);
    let c = fsCache.get(k); if (c) return c;
    const tc = document.createElement('canvas'); let x = tc.getContext('2d');
    x.font = font;
    const met = x.measureText(text);
    const size = parseInt((font.match(/(\d+)px/) || [0, 16])[1], 10);
    const asc = Math.ceil(met.actualBoundingBoxAscent || size * 0.8);
    const desc = Math.ceil(met.actualBoundingBoxDescent || size * 0.25);
    const left = Math.ceil(met.actualBoundingBoxLeft || 0);
    const right = Math.ceil(met.actualBoundingBoxRight || met.width);
    const w = Math.max(1, left + right + 2), h = Math.max(1, asc + desc + 2);
    tc.width = w; tc.height = h; x = tc.getContext('2d');
    x.font = font; x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
    x.fillText(text, left + 1, asc + 1);
    const id = x.getImageData(0, 0, w, h), d = id.data, rgb = hexRGB(col), th = thr || 128;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] >= th) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; } else d[i + 3] = 0;
    }
    x.putImageData(id, 0, 0);
    fsCache.set(k, tc);
    return tc;
  };
  G.clearFontCache = () => fsCache.clear();
  G.FONT_GOTH = '"UnifrakturCook", "UnifrakturMaguntia", "Old English Text MT", serif';
  G.FONT_JP = '"DotGothic16", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';
  G.FONT_HEAVY = '"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif';
  G.drawFS = function (text, font, col, x, y, al, thr) {
    const c = G.fsprite(text, font, col, thr);
    let xx = F(x); if (al === 'c') xx = F(x - c.width / 2); else if (al === 'r') xx = F(x - c.width);
    T.drawImage(c, xx, F(y));
    return c;
  };

  // ---------- sprites ASCII ----------
  const sprCache = {};
  G.ART = G.ART || {};
  G.spr = function (name, map) {
    const k = name + JSON.stringify(map);
    if (sprCache[k]) return sprCache[k];
    const rows = G.ART[name]; if (!rows) return null;
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    for (let r = 0; r < h; r++) for (let q = 0; q < w; q++) { const ch = rows[r][q]; const col = map[ch]; if (col) { x.fillStyle = col; x.fillRect(q, r, 1, 1); } }
    return (sprCache[k] = c);
  };
  G.drawSpr = function (name, x, y, map, sc) {
    const c = G.spr(name, map); if (!c) return;
    sc = sc || 1; T.drawImage(c, F(x), F(y), c.width * sc, c.height * sc);
  };
  G.sprW = (name) => (G.ART[name] ? G.ART[name][0].length : 0);
  G.sprH = (name) => (G.ART[name] ? G.ART[name].length : 0);

  // ---------- escritor de texto letra a letra (escribe y borra) ----------
  G.Typer = function (lines, opt) {
    opt = opt || {};
    this.lines = lines; this.i = 0; this.n = 0; this.state = 'type'; this.t = 0;
    this.speed = opt.speed || 0.06; this.hold = opt.hold || 1.6; this.del = opt.del || 0.03; this.pause = opt.pause || 0.6;
    this.loop = opt.loop !== false; this.snd = opt.snd !== false; this.done = false;
    this.total = lines.join('\n').length;
  };
  G.Typer.prototype.update = function (dt) {
    this.t += dt;
    if (this.state === 'type') {
      while (this.t >= this.speed && this.n < this.total) { this.t -= this.speed; this.n++; if (this.snd && G.audio) G.audio.sfx('type'); }
      if (this.n >= this.total) { this.state = 'hold'; this.t = 0; }
    } else if (this.state === 'hold') {
      if (this.t >= this.hold) { if (this.loop) { this.state = 'del'; this.t = 0; } else this.done = true; }
    } else if (this.state === 'del') {
      while (this.t >= this.del && this.n > 0) { this.t -= this.del; this.n--; if (this.snd && G.audio && this.n % 2 === 0) G.audio.sfx('type', 0.5); }
      if (this.n <= 0) { this.state = 'pause'; this.t = 0; }
    } else if (this.state === 'pause') {
      if (this.t >= this.pause) { this.state = 'type'; this.t = 0; }
    }
  };
  G.Typer.prototype.text = function () { return this.lines.join('\n').slice(0, this.n); };
  G.Typer.prototype.cursor = function () { return (this.state === 'hold' || this.state === 'pause') ? (Math.floor(G.time * 3) % 2 === 0) : true; };
})(window.G);
