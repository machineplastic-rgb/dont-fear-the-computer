'use strict';
// PARTE 2 · 17 TASK.MGR: el administrador de tareas de NEØ OS. Los programas se comen la CPU:
// toca su fila (END TASK) antes de que llegue al 100 %. Los del candado son del sistema: no se tocan.
// Jefe: un proceso rebelde que se cambia de nombre, salta de fila y deja copias.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const S = G.scenes.game;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // programas normales (nombre, icono 16) · del sistema · nombres del rebelde · avisos que tapan la lista
  const APPS = [['FEED.EXE', 'globe'], ['INBOX.EXE', 'mail'], ['HYPE.EXE', 'sound'], ['LOOP.EXE', 'disk'], ['MSG.EXE', 'note'], ['JUNK.EXE', 'palette'],
    ['NOTIFY.EXE', 'sound'], ['UPDATE.EXE', 'floppy'], ['ORDER.EXE', 'calc'], ['SCROLL.EXE', 'doc'], ['DOPAMINE', 'sun'], ['PHOTOS.EXE', 'camera'],
    ['CLIPS.EXE', 'clip'], ['MOUSE.DRV', 'mouse'], ['TIME.EXE', 'keys']];
  const SYS = ['SYSTEM.SYS', 'KERNEL.SYS', 'NEØ98.SYS'];
  const ROGUE = ['R0GUE.EXE', 'HELPER.EXE', 'N0T.A.VIRUS', 'FREE.RAM', 'CLEAN.EXE', 'TOTALLY.OK', 'SAFE.EXE', 'FEED.EXE'];
  const POPS = [['WARNING', 'LOW MEMORY.', 'CLOSE SOMETHING!'], ['ERROR', 'CPU TOO HOT.', 'PLEASE WAIT...'], ['UPDATE', 'RESTART NOW?', '(RECOMMENDED)'], ['NEØ OS', 'ARE YOU STILL', 'THERE?'], ['WARNING', 'TOO MANY TABS.', 'CLOSE ONE.']];
  const ROW_H = 36;

  G.MICRO.taskmgr = {
    mode: 'desk', cmd: 'END IT!', hint: 'END TASKS BEFORE 100%', time: 7, winOnTimeout: true,
    help: ['PROGRAMS EAT THE CPU.', 'TAP A ROW TO END TASK', 'BEFORE IT HITS 100%.', 'NEVER END LOCKED ONES.'],
    init(s) {
      const r = s.r, d = s.d;
      s.n = s.boss ? 6 : 3 + Math.round(d * 3);
      const nSys = s.boss || d > 0.55 ? 2 : d > 0.1 ? 1 : 0;
      s.rate = s.boss ? 1 + 0.4 * d : 1 + 0.85 * d; // multiplicador de subida de CPU (en el jefe manda el rebelde)
      s.used = new Set(); s.procs = []; s.ended = 0; s.pops = []; s.pop = null; s.frozen = null; s.killed = null;
      const nReg = s.n - nSys - (s.boss ? 1 : 0);
      for (let i = 0; i < nReg; i++) s.procs.push(this.newProc(s, 'app'));
      // arranques escalonados: el primero se llena a los ~1,8 s y los demás de uno en uno, nunca a la vez
      shuffle(s.procs).forEach((p, i) => { p.cpu = Math.max(0, 100 - p.rate * (1.8 + i * 1.1 + G.rand(0, 0.3) + (s.boss ? 0.6 : 0))); });
      for (let i = 0; i < nSys; i++) s.procs.push(this.newProc(s, 'sys'));
      if (s.boss) {
        const rg = this.newProc(s, 'rogue'); rg.cpu = 0; s.procs.push(rg); s.rogue = rg;
        s.hp = s.hpMax = 5 + Math.round(s.d > 0.95 ? 1 : 0);
        s.hint = 'KILL THE ROGUE PROCESS';
      } else s.hint = nSys ? 'END TASKS - NOT THE LOCKED ONES' : 'END TASKS BEFORE 100%';
      shuffle(s.procs);
      // ventanas: gráfica de CPU arriba (iconos del escritorio a la izquierda) y el administrador debajo
      s.perf = { x: r.x + 52, y: r.y + 6, w: r.w - 56, h: 84 };
      const h = 57 + s.n * ROW_H, y0 = r.y + 100, y1 = r.y + r.h - 16;
      s.win0 = { x: r.x + 6, y: Math.round(y0 + Math.max(0, (y1 - y0 - h) / 2)), w: r.w - 12, h };
      const bx = s.win0.x + 2, by = s.win0.y + G.WIN_BAR + 2;
      s.list = { x: bx, y: by + 26, w: s.win0.w - 4, h: s.n * ROW_H };
      s.hist = []; s.hT = 0; for (let i = 0; i < 60; i++) s.hist.push(this.usage(s));
      s.popT = d > 0.4 && !s.boss ? G.rand(1.3, 2.2) : 99; // avisos que tapan la lista (en el jefe no: ya está el rebelde)
      s.T = s.boss ? 4.5 + s.hp * 2.1 : 6 + 3 * d;
    },
    newProc(s, kind) {
      const p = { kind, cpu: 0, end: 0, ph: Math.random() * 6, wf: G.rand(1.2, 2.6), flash: 0 };
      if (kind === 'sys') {
        p.name = SYS.find((n) => !s.used.has(n)) || 'SYSTEM.SYS'; p.ic = 'system';
        p.base = G.rand(28, 48); p.amp = G.rand(8, 18); p.spT = G.rand(0.8, 2.4); p.spike = 0;
      } else if (kind === 'rogue') {
        p.name = ROGUE[0]; p.ic = 'bug'; p.jumpT = 1.3; p.ni = 0; p.prevI = -1; p.prevT = -9;
      } else {
        const free = APPS.filter((a) => !s.used.has(a[0])), a = G.pick(free.length ? free : APPS);
        p.name = a[0]; p.ic = a[1]; p.rate = G.rand(14, 22) * s.rate;
      }
      s.used.add(p.name);
      return p;
    },
    usage(s) { let t = 0; for (const p of s.procs) t += p.end > 0 ? 0 : p.cpu; return s.procs.length ? t / s.procs.length : 0; },
    rowRect(s, i) { const l = s.list; return { x: l.x, y: l.y + i * ROW_H, w: l.w, h: ROW_H }; },
    // el rebelde salta a otra fila (cambiándose por un programa normal) y se cambia el nombre
    jump(s, rg) {
      const i = s.procs.indexOf(rg), opts = s.procs.map((p, k) => k).filter((k) => k !== i && s.procs[k].kind === 'app' && !(s.procs[k].end > 0));
      if (opts.length) { const k = G.pick(opts); [s.procs[i], s.procs[k]] = [s.procs[k], s.procs[i]]; rg.prevI = i; rg.prevT = s.t; }
      rg.ni = (rg.ni + 1 + G.irand(0, ROGUE.length - 2)) % ROGUE.length; rg.name = ROGUE[rg.ni]; rg.flash = 0.25;
      rg.jumpT = Math.max(0.95, 1.4 - s.d * 0.25);
    },
    spawnPop(s) {
      const w = S.makeWin('warn'), m = G.pick(POPS), l = s.list;
      w.title = m[0]; w.lines = [m[1], m[2]]; w.xl = false;
      w.x = Math.round(G.rand(l.x + 4, l.x + l.w - w.w - 4));
      w.y = Math.round(G.rand(l.y + 4, Math.max(l.y + 4, l.y + l.h - w.h - 4)));
      s.pop = w; A().sfx('spawn', 1); G.pulse({ ab: 2 });
    },
    update(s, dt) {
      for (const p of s.procs.slice()) {
        if (p.flash > 0) p.flash -= dt;
        if (p.end > 0) {
          p.end -= dt;
          if (p.end <= 0) { // vuelve como otro programa (o el rebelde reaparece en otra fila)
            if (p.kind === 'rogue') { p.cpu = 0; this.jump(s, p); }
            else { s.used.delete(p.name); const n = this.newProc(s, 'app'); Object.assign(p, n); p.cpu = G.rand(0, 10); }
          }
          continue;
        }
        if (p.kind === 'sys') { // oscila; en las rondas altas hace sustos hasta el 95 % (pero nunca se cuelga)
          if (s.d > 0.5) { p.spT -= dt; if (p.spT <= 0) { p.spike = 1.1; p.spT = G.rand(2.4, 3.6); } }
          p.spike = Math.max(0, p.spike - dt);
          const env = p.spike > 0 ? Math.sin(Math.PI * (1 - p.spike / 1.1)) : 0;
          const base = p.base + p.amp * Math.sin(s.t * p.wf + p.ph);
          p.cpu = base * (1 - env) + 95 * env;
          continue;
        }
        if (p.kind === 'rogue') {
          p.cpu += (24 + 8 * s.d) * dt;
          p.jumpT -= dt; if (p.jumpT <= 0) { this.jump(s, p); A().sfx('step'); }
        } else p.cpu += p.rate * (1 + 0.3 * Math.sin(s.t * p.wf + p.ph)) * dt;
        if (p.cpu >= 100) { p.cpu = 100; s.frozen = p; A().sfx('alarm'); G.pulse({ glitch: 0.8, ab: 4 }); s.fail('PC FROZEN'); return; }
      }
      // gráfica de uso
      s.hT += dt; while (s.hT > 0.1) { s.hT -= 0.1; s.hist.push(this.usage(s)); if (s.hist.length > 60) s.hist.shift(); }
      // avisos que tapan la lista
      if (!s.pop) { s.popT -= dt; if (s.popT <= 0) this.spawnPop(s); }
      for (const m of s.pops) m.t += dt; s.pops = s.pops.filter((m) => m.t < 0.6);
      if (s.boss && s.t >= s.T && !s.done) s.fail('ROGUE SURVIVED');
    },
    tap(s, x, y) {
      if (s.pop && G.inR(x, y, s.pop, 4)) { // cualquier toque en el aviso lo cierra
        s.pop = null; s.popT = G.rand(1.8, 3.0) * (1 - 0.3 * s.d); A().sfx('close', 3); G.pulse({ ab: 1.5 }); return;
      }
      const l = s.list;
      if (!G.inR(x, y, l)) return;
      const i = Math.floor((y - l.y) / ROW_H);
      let p = s.procs[i];
      // margen justo después de un salto: tocar donde estaba el rebelde todavía cuenta
      const rg = s.rogue; if (rg && !(rg.end > 0) && rg.prevI === i && s.t - rg.prevT < 0.3) p = rg;
      if (!p || p.end > 0) return;
      const idx = s.procs.indexOf(p);
      const rr = this.rowRect(s, idx);
      if (p.kind === 'sys') { s.killed = p; p.flash = 9; A().sfx('deny'); G.pulse({ glitch: 1, ab: 5, shake: 5 }); s.fail('SYSTEM KILLED'); return; }
      if (p.kind === 'rogue') {
        s.hp--; s.ended++; A().sfx('hit'); G.pulse({ ab: 3, shake: 3 }); G.vibrate(25);
        s.pops.push({ x: rr.x + rr.w / 2, y: rr.y + 10, t: 0, txt: s.hp > 0 ? 'TERMINATED  ' + s.hp + ' LEFT' : 'ROGUE DELETED' });
        if (s.hp <= 0) { p.end = 99; p.cpu = 0; s.win(); return; }
        p.end = 0.55; p.cpu = 0;
        // deja una copia: un programa normal pasa a ser COPY.EXE y sube más rápido
        const apps = s.procs.filter((q) => q.kind === 'app' && !(q.end > 0) && !/^COPY/.test(q.name));
        if (apps.length) { const q = G.pick(apps); s.used.delete(q.name); q.name = s.used.has('COPY.EXE') ? 'COPY(' + (s.ended + 1) + ').EXE' : 'COPY.EXE'; s.used.add(q.name); q.ic = 'disk'; q.rate *= 1.2; q.flash = 0.4; }
        return;
      }
      p.end = 0.32; s.ended++; A().sfx('close', Math.min(12, s.ended)); G.pulse({ ab: 1.5, shake: 1.5 }); G.vibrate(8);
      s.pops.push({ x: rr.x + rr.w / 2, y: rr.y + 10, t: 0, txt: 'ENDED' });
    },
    // ---------- dibujo ----------
    drawPerf(s) {
      const st = G.WSTYLES[s.block >= 2 ? 'g2' : s.block === 1 ? 'b3' : 'm2'], w = s.perf;
      const r = G.drawFrame({ x: w.x, y: w.y, w: w.w, h: w.h, st, title: 'CPU USAGE', stripes: true, xmode: 'x' });
      const u = Math.round(s.hist[s.hist.length - 1]), hot = u > 70 && Math.floor(s.t * 6) % 2;
      G.text('CPU ' + u + '%', r.x + 4, r.y + 3, st.tx, { b: true });
      G.text(s.procs.length + ' TASKS', r.x + r.w - 4, r.y + 3, st.tx, { al: 'r' });
      const gx = r.x + 3, gy = r.y + 13, gw = r.w - 6, gh = r.h - 16;
      G.box(gx, gy, gw, gh, st.tx);
      for (let yy = gy + 6; yy < gy + gh - 1; yy += 6) G.dash(gx + 1, yy, gw - 2, st.tx, 1, 3);
      const cols = Math.floor((gw - 4) / 3);
      for (let k = 0; k < cols; k++) {
        const v = s.hist[s.hist.length - 1 - k]; if (v == null) break;
        const hh = Math.max(1, Math.round((gh - 4) * v / 100)), x = gx + gw - 4 - k * 3;
        const c = hot && k < 4 ? (s.acc === L ? W : s.acc) : st.tx;
        G.rect(x, gy + gh - 2 - hh, 2, Math.min(2, hh), c); if (hh > 2) G.drect(x, gy + gh - hh, 2, hh - 2, 8, c, null);
      }
    },
    drawRow(s, p, i) {
      const st = s.st, rr = this.rowRect(s, i), x = rr.x, y = rr.y, w = rr.w;
      const hiC = s.acc === L ? K : s.acc, bg = st.bd, fg = st.tx;
      if (i > 0) G.dash(x + 2, y, w - 4, fg, 1, 1);
      // fila recién cerrada
      if (p.end > 0) {
        G.rect(x + 1, y + 2, w - 2, ROW_H - 3, fg);
        G.text(p.kind === 'rogue' ? (s.hp > 0 ? 'TERMINATED' : 'ROGUE DELETED') : 'TASK ENDED', x + w / 2, y + 14, bg, { al: 'c', b: true });
        return;
      }
      const rogue = p.kind === 'rogue', sys = p.kind === 'sys', killed = s.killed === p, frozen = s.frozen === p;
      let tc = fg, rb = null;
      if (rogue) { rb = K; tc = Math.floor(s.t * 8) % 2 ? Gr : W; G.rect(x + 1, y + 2, w - 2, ROW_H - 3, K); G.drect(x + 1, y + 2, w - 2, ROW_H - 3, 4, s.block >= 2 ? Gr : B, null); G.rect(x + 3, y + 4, 82, ROW_H - 7, K); }
      if (killed || frozen) { rb = hiC; tc = W; G.rect(x + 1, y + 2, w - 2, ROW_H - 3, hiC); }
      else if (p.flash > 0 && !rogue) G.box(x + 1, y + 2, w - 2, ROW_H - 3, hiC, 2);
      // icono y nombre
      const iy = y + 5;
      if (rogue) G.drawSpr(Math.floor(s.t * 10) % 2 ? 'bug' : 'bug2', x + 4, iy + 2, { '#': W, g: Gr });
      else G.ctx().drawImage(G.icon16(p.ic, rb ? W : fg, rb || bg, s.block >= 2 ? Gr : B), x + 3, iy);
      const nx = x + 21;
      G.text(p.name, nx, y + 6, tc, { b: p.cpu > 75 || rogue });
      const hang = !sys && !rogue && p.cpu > 78, hangSys = sys && p.cpu > 80;
      let sub = sys ? 'SYSTEM' : rogue ? 'ROGUE!' : 'RUNNING';
      if (hang || hangSys) sub = 'NOT RESPONDING';
      if (frozen) sub = 'FROZEN';
      if (killed) sub = 'HALTED';
      const blink = (hang || hangSys) && Math.floor(s.t * 6) % 2;
      G.text(sub, nx, y + 19, blink && !rb ? hiC : tc, { b: rogue });
      if (sys) G.drawSpr('lock', nx + G.textW(sub) + 4, y + 19, { '#': rb ? W : fg });
      else if (hang && !rb) G.drawSpr(Math.floor(s.t * 3) % 2 ? 'hg1' : 'hg2', nx + G.textW(sub) + 4, y + 17, { '#': fg, o: fg });
      // barra de CPU punteada
      const btnW = 30, bx = x + 21 + 72, bw = Math.max(20, w - (bx - x) - btnW - 34), by = y + 7;
      const bc = rb ? (rogue ? Gr : W) : fg;
      G.box(bx, by, bw, 9, bc);
      const f = Math.round((bw - 4) * Math.min(1, p.cpu / 100)), hot = p.cpu > 75 && Math.floor(s.t * 8) % 2;
      if (sys && !rb) G.drect(bx + 2, by + 2, f, 5, 8, fg, null);
      else for (let k = 0; k < f; k += 4) G.rect(bx + 2 + k, by + 2, Math.min(3, f - k), 5, hot && !rb ? hiC : bc);
      G.text(Math.floor(p.cpu) + '%', bx + bw + 3, by + 1, rb ? tc : p.cpu > 75 ? hiC : fg, { b: p.cpu > 75 });
      // botón END (o candado en los del sistema)
      const ex = x + w - btnW - 3, ey = y + 7;
      if (sys) { G.drect(ex, ey, btnW, 20, 8, rb ? W : fg, null); G.rect(ex + btnW / 2 - 6, ey + 4, 12, 12, rb || bg); G.box(ex + btnW / 2 - 6, ey + 4, 12, 12, rb ? W : fg); G.drawSpr('lock', ex + btnW / 2 - 3, ey + 6, { '#': rb ? W : fg }); }
      else G.drawBtn(ex, ey, btnW, 20, 'END', rogue ? Gr : rb ? W : fg, rogue ? K : rb || bg, false, { double: rogue });
    },
    draw(s) {
      const r = s.r, st = s.st, w0 = s.win0, fg = st.tx;
      G.drawDesktopIcons(s.block, r.y + 2);
      this.drawPerf(s);
      // la ventana del administrador de tareas
      const title = s.frozen ? 'TASK MANAGER (NOT RESPONDING)' : s.killed ? 'FATAL EXCEPTION' : 'TASK MANAGER';
      const wr = G.drawFrame({ x: w0.x, y: w0.y, w: w0.w, h: w0.h, st, title: G.textW(title) > w0.w - 30 ? 'NOT RESPONDING' : title, stripes: true, xmode: 'x' });
      // pestañas
      let tx = wr.x + 3;
      for (const [lab, on] of [['APPS', false], ['PROCESSES', true], ['CPU', false]]) {
        const tw = G.textW(lab, 1, 1, on) + 10;
        if (on) { G.rect(tx, wr.y + 2, tw, 12, st.bd); G.box(tx, wr.y + 2, tw, 13, fg); G.rect(tx + 1, wr.y + 13, tw - 2, 2, st.bd); G.text(lab, tx + 5, wr.y + 5, fg, { b: true }); }
        else { G.box(tx, wr.y + 4, tw, 10, fg); G.text(lab, tx + 5, wr.y + 6, fg); }
        tx += tw + 2;
      }
      G.rect(wr.x, wr.y + 14, wr.w, 1, fg);
      // cabecera de columnas
      const hy = wr.y + 16;
      G.rect(wr.x + 1, hy, wr.w - 2, 10, L); G.box(wr.x + 1, hy, wr.w - 2, 10, K);
      G.text('IMAGE NAME', wr.x + 22, hy + 2, K); G.text('CPU', wr.x + 21 + 72, hy + 2, K); G.text('KILL', wr.x + wr.w - 5, hy + 2, K, { al: 'r' });
      // filas
      s.procs.forEach((p, i) => this.drawRow(s, p, i));
      // barra de estado
      const sy = s.list.y + s.list.h + 2;
      G.rect(wr.x, sy, wr.w, 1, fg);
      G.text('PROCESSES: ' + s.procs.length, wr.x + 4, sy + 4, fg);
      if (s.boss) {
        const lab = 'ROGUE', lw = G.textW(lab, 1, 1, true) + 5; let hx = wr.x + wr.w - 4 - s.hpMax * 7;
        G.text(lab, hx - lw, sy + 4, fg, { b: true });
        for (let k = 0; k < s.hpMax; k++, hx += 7) { if (k < s.hp) G.rect(hx, sy + 3, 5, 8, s.acc === L ? fg : s.acc); else G.box(hx, sy + 3, 5, 8, fg); }
      } else G.text('ENDED: ' + s.ended, wr.x + wr.w - 4, sy + 4, fg, { al: 'r' });
      // colgado o sistema muerto
      if (s.frozen || s.killed) {
        const l = s.list, cx = l.x + l.w / 2, cy = l.y + l.h / 2;
        if (s.killed) { G.rect(l.x + 10, cy - 15, l.w - 20, 30, B); G.box(l.x + 10, cy - 15, l.w - 20, 30, W); G.text('SYSTEM HALTED', cx, cy - 10, W, { al: 'c', b: true }); G.text('PRESS ANY KEY... OR NOT', cx, cy + 3, W, { al: 'c' }); }
        else { G.rect(cx - 15, cy - 15, 30, 30, st.bd); G.box(cx - 15, cy - 15, 30, 30, fg); G.drawSpr(Math.floor(s.t * 3) % 2 ? 'hg1' : 'hg2', cx - 9, cy - 11, { '#': fg, o: fg }, 2); }
      }
      // aviso que tapa la lista
      if (s.pop) S.drawWin(s.pop);
      for (const m of s.pops) G.text(m.txt, m.x, m.y - m.t * 26, s.acc === L ? K : s.acc, { al: 'c', b: true });
    },
  };

  // icono de la tarjeta: tres barras de CPU que suben; la que se llena se cierra
  G.ICONS[17] = function (t) {
    G.rect(1, 1, 22, 18, W); G.box(1, 1, 22, 18, K); G.rect(1, 1, 22, 4, K); G.px(20, 2, W); G.px(18, 2, W);
    [0.9, 1.35, 0.6].forEach((sp, i) => {
      const y = 7 + i * 4, c = (t * sp * 0.55 + i * 0.37) % 1.15, f = Math.min(1, c);
      G.rect(3, y, 2, 3, K);
      G.box(6, y, 15, 3, K);
      if (c > 1) G.rect(6, y, 15, 3, Gr); else G.rect(7, y + 1, Math.round(13 * f), 1, f > 0.75 ? B : K);
    });
  };
  G.CARD_SCHEMES[17] = { top: B, tt: W, ib: Gr, grid: K, bot: L, nc: B, bt: K };
})(window.G);
