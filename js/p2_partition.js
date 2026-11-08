'use strict';
// PARTE 2 · 19 DISK.PART: el particionador de discos de NEØ OS (FDISK en modo texto arriba, administrador de discos abajo).
// Un cursor de corte recorre el espacio libre del disco: toca para cortar y deja el disco en N particiones IGUALES.
// Cada corte tiene que caer cerca de su frontera ideal (tolerancia); si no, la partición sale grande o pequeña y error.
// Jefe: disco enorme, 5 particiones, sectores dañados donde no se puede cortar y un cursor con glitch.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const LET = 'CDEFGHIJ';
  const ROW = 9, BH = 46;                               // alto de fila de la tabla · alto de la barra del disco
  const MW_ST = ['b4', 'g3', 'b4', 'm1', 'g3', 'b4'];   // administrador de discos (siempre cuerpo blanco) por ronda
  const FD_ST = ['g2', 'm2', 'g2', 'm2', 'g2', 'g2'];   // FDISK en modo texto
  const GLOG = ['READ ERROR. RETRYING...', 'SEEK ERROR ON TRACK ', 'HEAD MISALIGNED!', 'CRC ERROR. IGNORED.'];

  // trama de rayas diagonales (espacio sin asignar)
  let HATCH = null;
  function hatch() {
    if (HATCH) return HATCH;
    const o = G.mkCanvas(5, 5);
    o.x.fillStyle = K; for (let i = 0; i < 5; i++) o.x.fillRect(i, 4 - i, 1, 1);
    return (HATCH = G.g.createPattern(o.c, 'repeat'));
  }
  const hexA = () => '0x' + G.irand(4096, 65535).toString(16).toUpperCase();
  const fit = (opts, w, b) => { for (const o of opts) if (G.textW(o, 1, 1, b) <= w) return o; return ''; };
  const mbTxt = (mb, w) => fit([mb + ' MB', mb + 'MB', '' + mb], w);

  // ronda → disco: n particiones iguales de 'part' MB (+ 'res' MB de sistema al principio), velocidad del cursor en
  // fracciones de disco por segundo, ondulación de la velocidad, sectores dañados y tolerancia en píxeles de barra
  function plan(s) {
    const d = s.d;
    if (s.boss) return { n: 5, part: 2048, res: 1024, v: 0.5, vr: 0.2, bad: 2, mid: 1, glitch: true, tol: 8 };
    if (d < 0.1) return { n: 2, part: 2048, res: 0, v: 0.4, vr: 0, bad: 0, tol: 12 };
    if (d < 0.2) return { n: 3, part: 1024, res: 0, v: 0.42, vr: 0, bad: 0, tol: 11 };
    if (d < 0.35) return { n: 3, part: G.pick([1536, 2048]), res: 0, v: 0.48, vr: 0.15, bad: 0, tol: 10.5 };
    if (d < 0.5) return { n: 4, part: 1024, res: 512, v: 0.46, vr: 0.3, bad: 0, tol: 10 };
    return { n: 4, part: G.pick([1024, 2048]), res: 512, v: 0.5, vr: 0.35, bad: 1, tol: 9 };
  }

  G.MICRO.partition = {
    mode: 'desk', cmd: 'SPLIT!', hint: 'MAKE EQUAL PARTITIONS', time: 6, fx: 0.4,
    help: ['TAP TO CUT THE DISK', 'INTO EQUAL PARTITIONS.', 'WATCH THE SIZE (MB).', 'NEVER CUT BAD SECTORS.'],
    init(s) {
      const r = s.r, c = plan(s), ri = (s.round - 1) % 6;
      s.n = c.n; s.part = c.part; s.res = c.res; s.total = c.part * c.n + c.res; s.f0 = c.res / s.total;
      s.ideal = []; for (let k = 1; k < c.n; k++) s.ideal.push(s.f0 + (k * (1 - s.f0)) / c.n);
      s.cuts = []; s.bads = []; s.log = []; s.pops = [];
      s.c = s.f0; s.dir = 1; s.v = c.v; s.vr = c.vr; s.ph = Math.random() * 6; s.vm = 1; s.vmT = 0;
      s.wait = 0.45; // el cabezal tarda un poco en arrancar
      s.flash = 0; s.gfx = 0; s.bad = -1; s.why = ''; s.lastT = -1; s.tickI = -1;
      s.glitch = !!c.glitch; s.gT = G.rand(0.9, 1.4);
      s.diskN = s.boss ? 1 : 0;
      s.mst = G.WSTYLES[MW_ST[ri]]; s.fst = G.WSTYLES[FD_ST[ri]];
      // ---- colocación: FDISK arriba, administrador de discos debajo (la barra queda hacia el centro) ----
      s.rowsN = c.n + (c.res ? 1 : 0) + 1;
      const mx = r.x + 5, mw = r.w - 10;
      const mh = 150 + s.rowsN * ROW + G.WIN_BAR + 4, gap = 8;
      const fh = G.clamp(r.h - mh - gap - 8, 46, 12 * ROW + 6 + G.WIN_BAR + 4);
      const tot = fh + gap + mh, y0 = r.y + Math.max(3, Math.round((r.h - tot) * 0.4));
      s.fw = { x: mx, y: y0, w: mw, h: fh, st: s.fst, title: 'FDISK.EXE', stripes: true, xmode: 'x' };
      s.mw = { x: mx, y: y0 + fh + gap, w: mw, h: mh, st: s.mst, title: 'DISK MANAGEMENT', stripes: true, xmode: 'x' };
      const by = s.mw.y + G.WIN_BAR + 2;
      s.bx0 = mx + 2; s.bw0 = mw - 4;
      s.tblY = by + 13;
      s.diskY = s.tblY + 12 + s.rowsN * ROW + 5;
      s.barY = s.diskY + 27;
      s.bx = s.bx0 + 5; s.bw = s.bw0 - 10;
      s.rulY = s.barY + BH + 11;
      s.legY = s.rulY + 14;
      s.stY = s.legY + 10;
      s.tolF = c.tol / s.bw;
      s.guides = !s.boss && s.d < 0.35;   // líneas guía en la barra (primeras rondas)
      s.hotAid = !s.boss && s.d < 0.5;    // la etiqueta se ilumina cuando estás en tolerancia
      for (let i = 0; i < (c.bad || 0); i++) this.addBad(s, false);
      for (let i = 0; i < (c.mid || 0); i++) this.addBad(s, true);
      if (s.boss) s.hint = 'SPLIT IN 5 EQUAL PARTS. AVOID BAD SECTORS!';
      else if (s.bads.length) s.hint = 'SPLIT THE FREE SPACE IN ' + c.n + '. NEVER CUT A BAD SECTOR';
      else if (c.res) s.hint = 'KEEP SYS. SPLIT THE FREE SPACE IN ' + c.n + ' EQUAL PARTS';
      else s.hint = 'SPLIT THE DISK IN ' + c.n + ' EQUAL PARTS';
      // perfecto + una vuelta entera de margen
      s.T = ((s.ideal[s.ideal.length - 1] - s.f0) + 1.4 * (1 - s.f0)) / s.v + 0.9 + s.wait + (s.boss ? 1.6 : 0);
      this.log(s, 'DISK ' + s.diskN + ': ' + s.total + ' MB FOUND');
      if (s.bads.length) this.log(s, 'SCANDISK: ' + s.bads.length + ' BAD SECTOR' + (s.bads.length > 1 ? 'S' : ''), true);
    },
    log(s, txt, err) { s.log.push({ txt, err: !!err, t: s.t }); if (s.log.length > 8) s.log.shift(); },
    // sector dañado pegado a una frontera ideal (a un lado, con 3/4 de la tolerancia de margen) o en mitad de una partición
    addBad(s, mid) {
      const px = 1 / s.bw, lo = (s.cuts.length ? s.cuts[s.cuts.length - 1] : s.f0) + 5 * px;
      for (let tries = 0; tries < 40; tries++) {
        const wF = G.rand(7, 11) * px, k = G.irand(s.cuts.length, s.ideal.length - 1);
        let a0;
        if (mid) { const pa = k ? s.ideal[k - 1] : s.f0; a0 = (pa + s.ideal[k]) / 2 - wF / 2 + G.rand(-4, 4) * px; }
        else {
          if (s.bads.some((z) => z.k === k)) continue; // uno por frontera como mucho
          const g = s.tolF * 0.75;
          a0 = Math.random() < 0.5 ? s.ideal[k] + g : s.ideal[k] - g - wF;
        }
        const a1 = a0 + wF;
        if (a0 < lo || a1 > 1 - 3 * px) continue;
        if (s.ideal.some((q, j) => (mid || j !== k) && a1 > q - s.tolF - 2 * px && a0 < q + s.tolF + 2 * px)) continue;
        if (s.bads.some((z) => a1 > z.a - 4 * px && a0 < z.b + 4 * px)) continue;
        if (s.c >= a0 - 2 * px && s.c <= a1 + 2 * px) continue; // nunca justo debajo del cursor
        s.bads.push({ a: a0, b: a1, k: mid ? -1 : k, hit: false });
        return true;
      }
      return false;
    },

    update(s, dt) {
      if (s.flash > 0) s.flash -= dt;
      if (s.gfx > 0) s.gfx -= dt;
      for (const m of s.pops) m.t += dt; s.pops = s.pops.filter((m) => m.t < 0.7);
      if (s.t < s.wait) return;
      const px = 1 / s.bw, lo = (s.cuts.length ? s.cuts[s.cuts.length - 1] : s.f0) + px;
      let v = s.v * (1 + s.vr * Math.sin(s.t * 2.4 + s.ph)) * s.vm;
      if (s.glitch && s.bads.some((z) => s.c >= z.a && s.c <= z.b)) v *= 1.8; // el cabezal patina sobre los sectores dañados
      s.c += s.dir * v * dt;
      if (s.c >= 1) { s.c = Math.max(lo, 2 - s.c); s.dir = -1; }
      if (s.c <= lo) { s.c = lo; s.dir = 1; }
      // clics del cabezal del disco duro
      const ti = Math.floor(s.c * 10); if (ti !== s.tickI) { if (s.tickI >= 0) A().sfx('step'); s.tickI = ti; }
      if (s.glitch) { // jefe: el cursor se vuelve loco (nunca cerca de la frontera que toca)
        const nx = s.ideal[s.cuts.length], near = nx != null && Math.abs(s.c - nx) * s.bw < 24;
        if (s.vmT > 0) { s.vmT -= dt; if (s.vmT <= 0 || near) { s.vm = 1; s.vmT = 0; } } // cerca de la frontera, velocidad normal
        s.gT -= dt;
        if (s.gT <= 0 && !near) {
          s.gT = G.rand(1.0, 1.7);
          if (Math.random() < 0.4) s.dir = -s.dir; else { s.vm = G.pick([0.55, 1.6, 1.9]); s.vmT = G.rand(0.25, 0.45); }
          s.gfx = 0.22; A().sfx('glitch'); G.pulse({ glitch: 0.5, ab: 3 });
          const m = G.pick(GLOG); this.log(s, m + (m.endsWith(' ') ? G.irand(10, 99) : ''), true);
        }
      }
    },

    tap(s) {
      if (s.done || s.t - s.lastT < 0.1) return;
      s.lastT = s.t;
      const k = s.cuts.length, c = s.c, lo = k ? s.cuts[k - 1] : s.f0, want = s.ideal[k];
      if (want == null) return;
      const mb = Math.round((c - lo) * s.total), half = 0.5 / s.bw, cx = s.bx + c * s.bw;
      const z = s.bads.find((q) => c >= q.a - half && c <= q.b + half);
      s.cuts.push(c); s.flash = 0.35;
      if (z) {
        s.bad = k; s.why = 'sector'; z.hit = true;
        this.log(s, 'BAD SECTOR AT ' + hexA() + '!', true);
        this.log(s, 'PARTITION TABLE CORRUPTED', true);
        A().sfx('zap'); A().sfx('hit'); G.pulse({ glitch: 1, ab: 6, shake: 5, flash: 0.15, flashCol: Gr });
        s.fail('BAD SECTOR'); return;
      }
      if (Math.abs(c - want) > s.tolF) {
        s.bad = k; s.why = c > want ? 'big' : 'small';
        this.log(s, LET[k] + ': ' + mb + ' MB  WANT ' + s.part + '  ×', true);
        A().sfx('deny'); G.pulse({ glitch: 0.8, ab: 5, shake: 4 });
        s.fail(c > want ? 'PARTITION TOO BIG' : 'PARTITION TOO SMALL'); return;
      }
      const perfect = Math.abs(c - want) * s.bw <= 2;
      this.log(s, LET[k] + ': ' + mb + ' MB  CREATED  ' + (perfect ? 'PERFECT' : 'OK'));
      s.pops.push({ x: cx, t: 0, txt: perfect ? 'PERFECT!' : 'OK' });
      A().sfx('close', 2 + k * 3); if (perfect) A().sfx('combo');
      G.vibrate(10); G.pulse({ ab: 2, shake: 1.5 });
      if (s.cuts.length >= s.ideal.length) {
        this.log(s, LET[k + 1] + ': ' + Math.round((1 - c) * s.total) + ' MB  CREATED  OK');
        this.log(s, 'WRITING PARTITION TABLE... DONE');
        G.pulse({ flash: 0.12, flashCol: W });
        s.win(); return;
      }
      s.dir = 1;
      if (s.boss && Math.random() < 0.6 && this.addBad(s, false)) { this.log(s, 'SCANDISK: NEW BAD SECTOR!', true); A().sfx('warn'); G.pulse({ ab: 3 }); }
    },

    // ---------- datos para dibujar ----------
    segs(s) {
      const out = [], won = s.done === 'win';
      if (s.f0 > 0) out.push({ a: 0, b: s.f0, kind: 'res', mb: s.res });
      let a = s.f0;
      const ends = s.cuts.slice(); if (won) ends.push(1);
      ends.forEach((c, i) => { out.push({ a, b: c, kind: 'part', i, mb: Math.round((c - a) * s.total) }); a = c; });
      if (!won && a < 1) out.push({ a, b: 1, kind: 'free', mb: Math.round((1 - a) * s.total) });
      return out;
    },

    // ---------- dibujo ----------
    draw(s) {
      this.drawFdisk(s);
      this.drawMgr(s);
      for (const m of s.pops) {
        const y = Math.round(s.barY - 30 - m.t * 22), tw = G.textW(m.txt, 1, 1, true) + 6;
        const x = G.clamp(Math.round(m.x - tw / 2), s.bx0, s.bx0 + s.bw0 - tw);
        G.rect(x, y - 2, tw, 11, K); G.text(m.txt, x + 3, y, Gr, { b: true });
      }
    },
    drawFdisk(s) {
      const st = s.fst, fb = G.drawFrame(s.fw), T = G.ctx(), tx = st.tx, bg = st.bd, err = tx === Gr ? W : Gr;
      T.save(); T.beginPath(); T.rect(fb.x, fb.y, fb.w, fb.h); T.clip();
      const x = fb.x + 4, blink = Math.floor(s.t * 3) % 2 === 0;
      let y = fb.y + 3;
      G.text('NEØ OS FIXED DISK SETUP', x, y, tx, { b: true }); y += ROW;
      G.text('CURRENT FIXED DISK: ' + s.diskN + '   ' + s.total + ' MB', x, y, tx); y += ROW + 2;
      ['1. CREATE PARTITION', '2. SET ACTIVE PARTITION', '3. DELETE PARTITION', '4. DISPLAY PARTITION INFO'].forEach((o, i) => {
        if (i === 0) { G.rect(x + 4, y - 1, G.textW(o) + 4, ROW, tx); G.text(o, x + 6, y, bg); } else G.text(o, x + 6, y, tx);
        y += ROW;
      });
      G.text('ENTER CHOICE: [1]', x, y + 1, tx); y += ROW + 3;
      G.dash(fb.x + 2, y, fb.w - 4, tx, 2, 2); y += 4;
      const avail = Math.max(0, Math.floor((fb.y + fb.h - y - 1) / ROW));
      const lines = s.log.slice(-Math.max(0, avail - 1));
      for (const l of lines) {
        const fresh = l.err && s.t - l.t < 0.6 && Math.floor(s.t * 10) % 2;
        G.text(l.txt, x, y, l.err ? (fresh ? tx : err) : tx); y += ROW;
      }
      if (avail > 0) {
        let live;
        if (s.done === 'win') live = 'C:\\> ALL PARTITIONS OK';
        else if (s.done) live = 'ABORTED. PRESS ANY KEY';
        else { const k = s.cuts.length, lo = k ? s.cuts[k - 1] : s.f0; live = '> CUT ' + LET[k] + ': ' + Math.round((s.c - lo) * s.total) + ' MB'; }
        G.text(live, x, y, tx);
        if (blink) G.rect(x + G.textW(live) + 2, y, 5, 7, tx);
      }
      T.restore();
    },
    drawMgr(s) {
      const st = s.mst, tx = st.tx, T = G.ctx(), w = s.mw;
      w.title = s.glitch && s.gfx > 0 ? G.pick(['D1SK MANAG3MENT', 'DISK M@NAGEMENT', 'DISK_MANAGEMENT']) : 'DISK MANAGEMENT';
      const b = G.drawFrame(w);
      // menú
      let mx = b.x + 4;
      for (const m of ['ACTION', 'VIEW', 'HELP']) { G.text(m, mx, b.y + 2, tx); G.rect(mx, b.y + 9, 5, 1, tx); mx += G.textW(m) + 12; }
      G.rect(b.x, b.y + 11, b.w, 1, tx);
      this.drawTable(s, b);
      // fila del disco
      const dy = s.diskY;
      G.rect(b.x, dy - 4, b.w, 1, tx);
      G.rect(b.x + 4, dy, 13, 8, tx); G.rect(b.x + 5, dy + 1, 11, 6, st.bd); G.rect(b.x + 6, dy + 5, 6, 1, tx); G.rect(b.x + 13, dy + 4, 2, 2, B);
      G.text('DISK ' + s.diskN, b.x + 21, dy + 1, tx, { b: true });
      G.text('BASIC  ' + s.total + ' MB', b.x + 21 + G.textW('DISK 0', 1, 1, true) + 8, dy + 1, tx);
      G.text('ONLINE', b.x + b.w - 4, dy + 1, tx, { al: 'r' });
      // barra del disco
      this.drawBar(s);
      if (s.glitch && s.gfx > 0) for (let i = 0; i < 2; i++) { // trozos de la barra desplazados
        const sy = s.barY + G.irand(0, BH - 6), sh = G.irand(2, 6), dx = G.irand(-10, 10);
        T.save(); T.beginPath(); T.rect(s.bx - 1, sy, s.bw + 2, sh); T.clip(); T.translate(dx, 0); this.drawBar(s); T.restore();
      }
      this.drawMarks(s);
      this.drawCursor(s);
      // leyenda
      let lx = b.x + 4; const ly = s.legY;
      const sw = (fn, lab) => { fn(lx, ly); G.text(lab, lx + 11, ly, tx); lx += 11 + G.textW(lab) + 8; };
      sw((x, y) => { G.rect(x, y, 8, 7, W); G.box(x, y, 8, 7, K); G.rect(x, y, 8, 2, B); }, 'PRIMARY');
      sw((x, y) => { G.rect(x, y, 8, 7, W); T.fillStyle = hatch(); T.fillRect(x, y, 8, 7); G.box(x, y, 8, 7, K); }, 'FREE');
      if (s.res) sw((x, y) => { G.rect(x, y, 8, 7, W); G.drect(x, y, 8, 7, 6, L, null); G.box(x, y, 8, 7, K); G.rect(x, y, 8, 2, K); }, 'SYSTEM');
      if (s.bads.length) sw((x, y) => { G.rect(x, y, 8, 7, K); G.px(x + 2, y + 2, Gr); G.px(x + 5, y + 4, W); G.px(x + 3, y + 5, Gr); G.px(x + 6, y + 1, Gr); }, 'BAD');
      // barra de estado
      G.rect(b.x, s.stY, b.w, 1, tx);
      G.text('TARGET ' + s.part + ' MB EACH', b.x + 4, s.stY + 3, tx, { b: true });
      G.text('CUT ' + Math.min(s.cuts.length, s.ideal.length) + '/' + s.ideal.length, b.x + b.w - 4, s.stY + 3, tx, { al: 'r' });
    },
    drawTable(s, b) {
      const tx = s.mst.tx, y0 = s.tblY, wide = b.w >= 214;
      const cx = [b.x + 3, b.x + 26, b.x + 78, b.x + 112, b.x + 167];
      G.rect(b.x + 1, y0, b.w - 2, 10, L); G.box(b.x + 1, y0, b.w - 2, 10, K);
      ['VOL', 'TYPE', 'FS', 'SIZE', 'STATUS'].forEach((h, i) => { if (i < 4 || wide) { G.text(h, cx[i], y0 + 2, K); if (i) G.rect(cx[i] - 3, y0 + 1, 1, 8, K); } });
      const blink = Math.floor(s.t * 6) % 2 === 0, newest = s.cuts.length - 1;
      this.segs(s).forEach((g, j) => {
        const y = y0 + 12 + j * ROW;
        let row;
        if (g.kind === 'res') row = ['SYS', 'PRIMARY', 'FAT32', 'SYSTEM'];
        else if (g.kind === 'part') row = [LET[g.i] + ':', g.i === 0 && !s.res ? 'PRIMARY' : 'LOGICAL', 'FAT32', g.i === s.bad ? (s.why === 'sector' ? 'BAD SECT' : 'BAD SIZE') : g.i === newest && s.flash > 0 ? 'NEW' : 'HEALTHY'];
        else row = ['-', 'FREE', '-', 'UNALLOC'];
        let bg = null, fg = tx;
        if (g.kind === 'free' && !s.done) { bg = B; fg = W; }                // fila seleccionada
        else if (g.kind === 'part' && g.i === s.bad) { if (blink) { bg = s.acc === L ? K : s.acc; fg = s.acc === L ? W : K; } }
        else if (g.kind === 'part' && g.i === newest && s.flash > 0) { bg = Gr; fg = K; }
        if (bg) G.rect(b.x + 1, y - 1, b.w - 2, ROW, bg);
        G.text(row[0], cx[0], y, fg, { b: true }); G.text(row[1], cx[1], y, fg); G.text(row[2], cx[2], y, fg);
        G.text(g.mb + ' MB', cx[3], y, fg);
        if (wide) G.text(row[3], cx[4], y, fg);
      });
      G.rect(b.x, y0 + 12 + s.rowsN * ROW + 1, b.w, 1, tx);
    },
    drawBar(s) {
      const x0 = s.bx, y = s.barY, w = s.bw, h = BH, T = G.ctx(), blink = Math.floor(s.t * 6) % 2 === 0, newest = s.cuts.length - 1;
      G.rect(x0 - 1, y - 1, w + 2, h + 2, K);
      const labels = [];
      for (const g of this.segs(s)) {
        const xa = x0 + Math.round(g.a * w), xb = x0 + Math.round(g.b * w), ix = xa + 1, iw = xb - xa - 1;
        if (iw < 1) continue;
        let fg = K, lb = W;
        if (g.kind === 'res') { G.rect(ix, y, iw, h, W); G.drect(ix, y + 6, iw, h - 6, 6, L, null); G.rect(ix, y, iw, 6, K); }
        else if (g.kind === 'part') {
          const bad = g.i === s.bad, nw = g.i === newest && s.flash > 0 && !bad;
          let body = nw ? Gr : W; if (bad && blink) { body = K; fg = W; }
          lb = body;
          G.rect(ix, y, iw, h, body); G.rect(ix, y, iw, 6, bad ? Gr : B);
        } else {
          G.rect(ix, y, iw, h, W); T.fillStyle = hatch(); T.fillRect(ix, y + 6, iw, h - 6); G.rect(ix, y, iw, 6, K);
          if (!s.done) { // vista previa de la partición que vas a crear
            const pc = x0 + Math.round(s.c * w);
            if (pc > ix) { G.rect(ix, y + 6, pc - ix, h - 6, W); G.drect(ix, y + 6, pc - ix, h - 6, 5, B, null); G.drect(ix, y, pc - ix, 6, 8, B, K); }
          }
        }
        labels.push([g, ix, iw, fg, lb]);
      }
      // sectores dañados: estática verde y blanca
      for (const z of s.bads) {
        const za = x0 + Math.round(z.a * w), zw = Math.max(3, x0 + Math.round(z.b * w) - za);
        G.rect(za, y, zw, h, K);
        for (let k = 0; k < zw * 5; k++) G.px(za + G.irand(0, zw - 1), y + 6 + G.irand(0, h - 7), Math.random() < 0.5 ? Gr : W);
        G.rect(za, y, zw, 6, Math.floor(s.t * 4 + z.a * 9) % 2 ? Gr : K);
        if (z.hit && blink) G.box(za - 1, y - 1, zw + 2, h + 2, Gr);
      }
      // líneas guía (y, al fallar, dónde tenía que ir el corte)
      for (let k = 0; k < s.ideal.length; k++) {
        const show = k === s.bad ? blink : s.guides && k >= s.cuts.length && !s.done;
        if (!show) continue;
        const gx = x0 + Math.round(s.ideal[k] * w), col = k === s.bad ? Gr : B;
        for (let yy = y + 7; yy < y + h; yy += 4) G.rect(gx, yy, 1, 2, col);
        if (k === s.bad) G.rect(gx - 1, y + 7, 3, 2, col);
      }
      for (const [g, ix, iw, fg, lb] of labels) this.segLabel(s, g, ix, y, iw, fg, lb); // los textos, encima de todo
    },
    segLabel(s, g, x, y, w, fg, lb) {
      if (w < 10) return;
      const ln = [];
      if (g.kind === 'res') ln.push([fit(['SYS'], w - 3, true), true], [mbTxt(g.mb, w - 3)], [fit(['SYSTEM'], w - 3)]);
      else if (g.kind === 'part') ln.push([LET[g.i] + ':', true], [mbTxt(g.mb, w - 3)], [fit(['FAT32'], w - 3)]);
      else ln.push([fit(['UNALLOCATED', 'UNALLOC', 'FREE'], w - 5)], [mbTxt(g.mb, w - 5)]);
      ln.forEach(([t, b], i) => {
        if (!t) return;
        const tw = G.textW(t, 1, 1, !!b), ty = y + 10 + i * 10;
        if (tw > w - 2) return;
        if (g.kind === 'free') { const tx = x + w - 3 - tw; G.rect(tx - 1, ty - 1, tw + 3, 9, W); G.text(t, tx, ty, K); } // a la derecha, para no tapar la vista previa
        else { if (s.bads.length) G.rect(x + 1, ty - 1, tw + 2, 9, lb); G.text(t, x + 2, ty, fg, { b: !!b }); } // con fondo si hay estática debajo
      });
    },
    drawMarks(s) {
      const x0 = s.bx, w = s.bw, y = s.barY + BH + 2, tx = s.mst.tx, nk = s.cuts.length;
      s.ideal.forEach((f, k) => {
        if (k < nk && k !== s.bad) return;
        const gx = x0 + Math.round(f * w), next = k === nk && !s.done;
        const col = k === s.bad ? (s.acc === L ? K : s.acc) : next && Math.floor(s.t * 4) % 2 ? B : tx;
        G.text('▲', gx - 2, y, col);
      });
      const ry = s.rulY;
      G.rect(x0, ry, w, 1, tx);
      for (let i = 0; i <= 16; i++) G.rect(x0 + Math.round((i / 16) * (w - 1)), ry + 1, 1, i % 4 ? 1 : 3, tx);
      G.text('0', x0, ry + 4, tx);
      G.text(s.total + ' MB', x0 + w, ry + 4, tx, { al: 'r' });
    },
    drawCursor(s) {
      if (s.done) return;
      const cx = s.bx + Math.round(s.c * s.bw), y = s.barY, k = s.cuts.length, lo = k ? s.cuts[k - 1] : s.f0, want = s.ideal[k];
      const mb = Math.round((s.c - lo) * s.total), hot = s.hotAid && want != null && Math.abs(s.c - want) <= s.tolF;
      G.rect(cx - 1, y - 4, 3, BH + 8, W); G.rect(cx, y - 4, 1, BH + 8, K);
      const t = mb + ' MB', tw = G.textW(t, 1, 1, true) + 6, tx = G.clamp(Math.round(cx - tw / 2), s.bx0 + 1, s.bx0 + s.bw0 - tw - 1), ty = y - 15;
      G.rect(tx, ty, tw, 10, hot ? Gr : W); G.box(tx, ty, tw, 10, K); G.text(t, tx + 3, ty + 2, K, { b: true });
      G.rect(cx, ty + 10, 1, 1, K);
    },
  };

  // icono de la tarjeta: un disco que un cursor corta en tres particiones iguales
  G.ICONS[19] = function (t) {
    const c = (t * 0.4) % 1, x0 = 3, w = 18, y = 8, h = 7, done = c >= 0.75, p = Math.min(w, Math.round((c / 0.75) * w));
    G.rect(1, 1, 22, 17, W); G.box(1, 1, 22, 17, K); G.rect(1, 1, 22, 4, K); G.px(20, 2, W); G.px(18, 2, W);
    G.rect(x0 - 1, y - 1, w + 2, h + 2, K);
    const cuts = [0, 6, 12, 18];
    for (let i = 0; i < 3; i++) {
      const a = cuts[i], b = cuts[i + 1];
      if (done || p >= b) { G.rect(x0 + a, y, b - a, h, done && Math.floor(t * 8) % 2 ? Gr : W); G.rect(x0 + a, y, b - a, 2, B); }
      else { G.drect(x0 + a, y, b - a, h, 8, K, W); if (p > a) G.drect(x0 + a, y, p - a, h, 8, B, W); }
      if (a) G.rect(x0 + a, y, 1, h, K);
    }
    if (!done) G.rect(x0 + p, y - 2, 1, h + 4, Gr);
    G.rect(4, 15, 3, 1, K); G.rect(10, 15, 3, 1, K); G.rect(16, 15, 3, 1, K);
  };
  G.CARD_SCHEMES[19] = { top: Gr, tt: K, ib: B, grid: W, bot: L, nc: K, bt: B };
})(window.G);
