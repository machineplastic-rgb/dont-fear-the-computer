'use strict';
// Motor de audio 100% generado por código (Web Audio): SFX + secuenciador con 6 estilos.
// Midtempo Bass (1-3) · Darksynth (4-6) · Industrial/EBM (7-9) · Mezcla (10-12) · Serpent (13) · Ambient (menús)
(function (G) {
  const A = G.audio = {};
  let ac = null, out, comp, mIn, mFilt, mBus, sBus, rvIn, dlIn, noiseBuf;
  const mf = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const curves = {};
  function curve(k) {
    if (curves[k]) return curves[k];
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    return (curves[k] = c);
  }
  function crush(steps) {
    const k = 'c' + steps; if (curves[k]) return curves[k];
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = Math.round(x * steps) / steps; }
    return (curves[k] = c);
  }
  function impulse(sec, decay) {
    const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(1, len, ac.sampleRate);
    for (let ch = 0; ch < 1; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }

  A.ready = () => !!ac;
  A.init = function () {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
    try { ac = new AC({ latencyHint: 'interactive' }); } catch (e) { ac = new AC(); }
    buildGraph();
    A.applySettings();
    return true;
  };
  let offline = false;
  function buildGraph() {
    shared = {};
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
    out = ac.createGain(); out.gain.value = 0.85; out.connect(comp); comp.connect(ac.destination);
    mBus = ac.createGain(); mBus.connect(out);
    sBus = ac.createGain(); sBus.connect(out);
    mFilt = ac.createBiquadFilter(); mFilt.type = 'lowpass'; mFilt.frequency.value = 20000; mFilt.Q.value = 0.7; mFilt.connect(mBus);
    mIn = ac.createGain(); mIn.gain.value = 1; mIn.connect(mFilt);
    // reverb ligera: 4 filtros peine con retroalimentación (mucho más barata que un convolver en móvil)
    rvIn = ac.createGain(); const rvOut = ac.createGain(); rvOut.gain.value = 0.22; rvOut.connect(mFilt);
    [0.0297, 0.0371, 0.0411, 0.0437].forEach((dt, i) => {
      const d = ac.createDelay(0.1); d.delayTime.value = dt * 1.6;
      const fbk = ac.createGain(); fbk.gain.value = 0.78 - i * 0.02;
      const damp = ac.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2400;
      rvIn.connect(d); d.connect(damp); damp.connect(fbk); fbk.connect(d); damp.connect(rvOut);
    });
    const dl = ac.createDelay(1.5); dl.delayTime.value = 0.375; const fb = ac.createGain(); fb.gain.value = 0.38;
    const dlf = ac.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2600;
    dlIn = ac.createGain(); dlIn.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl);
    const dOut = ac.createGain(); dOut.gain.value = 0.28; dlf.connect(dOut); dOut.connect(mFilt);
    const len = ac.sampleRate * 2; noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
    mBus.gain.value = 0.42; sBus.gain.value = 2.0;
  }
  // render sin conexión de un estilo o un sfx (pruebas de nivel)
  A.renderOffline = async function (kind, name, secs) {
    const saved = { ac, out, comp, mIn, mFilt, mBus, sBus, rvIn, dlIn, noiseBuf, shared };
    const oc = new OfflineAudioContext(2, Math.floor(44100 * secs), 44100);
    ac = oc; offline = true; buildGraph();
    try {
      if (kind === 'inst') {
        const I = { kick, snare, hat, metal, growl, sbass, lead, pad, guitar, vox, ping, tick };
        let t = 0.05, s = 0; while (t < secs - 0.6) { name(I, t, s, mf); t += 0.12; s++; }
      } else if (kind === 'music') {
        const st = STYLES[name]; let t = 0.05, s = 0;
        while (t < secs - 0.6) { const sd = 60 / (st.bpm * (1 + (st.accel == null ? 0.07 : st.accel))) / 4; st.step(s, t, 1, sd); t += sd; s++; }
      } else A.sfx(name, 1);
    } finally { offline = false; }
    const buf = await oc.startRendering();
    ({ ac, out, comp, mIn, mFilt, mBus, sBus, rvIn, dlIn, noiseBuf, shared } = saved);
    let sum = 0, peak = 0, clip = 0, n = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); sum += v * v; if (v > peak) peak = v; if (v > 0.99) clip++; n++; } }
    return { rms: Math.sqrt(sum / n), peak, clip };
  };
  A.unlock = function () {
    if (!A.init()) return;
    if (ac.state !== 'running') { try { ac.resume(); } catch (e) { } }
    if (!A._silent) {
      A._silent = true;
      try { const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0); } catch (e) { }
    }
  };
  A.meter = function () { // nivel de salida (pruebas)
    if (!ac) return { rms: 0, peak: 0 };
    if (!A._an) { A._an = ac.createAnalyser(); A._an.fftSize = 2048; comp.connect(A._an); }
    const d = new Float32Array(2048); A._an.getFloatTimeDomainData(d);
    let s = 0, p = 0; for (let i = 0; i < d.length; i++) { s += d[i] * d[i]; p = Math.max(p, Math.abs(d[i])); }
    return { rms: Math.sqrt(s / d.length), peak: p };
  };
  A.suspend = () => { if (ac && ac.state === 'running') ac.suspend(); };
  A.resume = () => { if (ac && ac.state !== 'running') ac.resume(); };
  A.applySettings = function () {
    if (!ac) return;
    const s = G.save.data.settings;
    mBus.gain.setTargetAtTime(s.music ? 0.42 : 0, ac.currentTime, 0.05);
    sBus.gain.setTargetAtTime(s.sfx ? 2.0 : 0, ac.currentTime, 0.05);
  };
  A.now = () => (ac ? ac.currentTime : 0);
  A.muffle = function (on) { if (!ac) return; mFilt.frequency.setTargetAtTime(on ? 650 : 20000, ac.currentTime, 0.08); };
  A.duck = function (amt, rec) {
    if (!ac) return; const t = ac.currentTime;
    mIn.gain.cancelScheduledValues(t); mIn.gain.setValueAtTime(amt, t); mIn.gain.linearRampToValueAtTime(1, t + (rec || 1.2));
  };

  // ---------- bloques básicos ----------
  function osc(type, f, t) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); return o; }
  function gain(v) { const g = ac.createGain(); g.gain.value = v; return g; }
  function bq(type, f, q) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
  function shaper(k) { const s = ac.createWaveShaper(); s.curve = curve(k); s.oversample = mode === 'render' ? '2x' : 'none'; return s; }
  function noise(t, dur) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s; }
  // nodos compartidos (se crean una vez): mucho menos trabajo para el móvil
  let shared = {};
  function sh(key, make) { return shared[key] || (shared[key] = make()); }
  function sendBus(amt, bus) {
    const b = bus || rvIn, key = (b === dlIn ? 'd' : 'r') + amt.toFixed(2);
    return sh(key, () => { const g = gain(amt); g.connect(b); return g; });
  }
  function driveBus(k) { return sh('drv' + k, () => { const i = gain(1), s = shaper(k), o = gain(0.8); i.connect(s); s.connect(o); o.connect(mIn); return i; }); }
  function chain(key, nodes) { return sh(key, () => { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); nodes[nodes.length - 1].connect(mIn); return nodes[0]; }); }
  function adsr(p, t, a, peak, d, sus, rel, end) {
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(Math.max(0.0001, sus), t + a, d / 3);
    p.setValueAtTime(Math.max(0.0001, sus), end);
    p.exponentialRampToValueAtTime(0.0001, end + rel);
  }
  function perc(p, t, peak, dec) { p.setValueAtTime(0.0001, t); p.exponentialRampToValueAtTime(peak, t + 0.002); p.exponentialRampToValueAtTime(0.0001, t + dec); }
  function send(node, amt, bus) { if (amt > 0) node.connect(sendBus(amt, bus)); }

  // ---------- caché de notas pre-renderizadas ----------
  // Cada sonido se sintetiza UNA vez en segundo plano (OfflineAudioContext) y después solo se reproduce:
  // así los estilos cañeros no saturan la CPU del móvil (era lo que hacía fallar la música).
  const nCache = new Map(), queue = [], queued = new Set();
  let busy = false, mode = 'live'; // live | warm | render
  function enqueue(key, len, fn) {
    if (nCache.has(key) || queued.has(key)) return;
    queued.add(key); queue.push({ key, len, fn }); pump();
  }
  function pump() {
    if (busy || !queue.length || !ac || offline) return;
    busy = true;
    const job = queue.shift();
    let p;
    try { p = renderJob(job); } catch (e) { busy = false; queued.delete(job.key); setTimeout(pump, 0); return; }
    p.then((buf) => { nCache.set(job.key, buf); if (nCache.size > 500) nCache.delete(nCache.keys().next().value); })
      .catch(() => { })
      .then(() => { queued.delete(job.key); busy = false; setTimeout(pump, 0); });
  }
  function renderJob(job) {
    const saved = { ac, mIn, rvIn, dlIn, shared };
    const oc = new OfflineAudioContext(1, Math.ceil(44100 * job.len), 44100);
    ac = oc; shared = {};
    mIn = oc.createGain(); mIn.connect(oc.destination); rvIn = oc.createGain(); dlIn = oc.createGain();
    const prev = mode; mode = 'render';
    try { job.fn(0.002); } finally { mode = prev; ({ ac, mIn, rvIn, dlIn, shared } = saved); }
    return oc.startRendering();
  }
  function playBuf(buf, t, v, rv, dl) {
    const s = ac.createBufferSource(); s.buffer = buf;
    const g = gain(v); s.connect(g); g.connect(mIn);
    if (rv) send(g, rv); if (dl) send(g, dl, dlIn);
    s.start(t);
  }
  const q20 = (v) => Math.max(0.05, Math.round(v * 20) / 20);
  const qd = (d) => Math.max(0.02, Math.round(d * 50) / 50);
  // true = ya resuelto (reproducido desde caché o encolado en modo warm)
  function viaCache(key, len, t, v, vr, render, rv, dl) {
    if (mode === 'render') return false;
    const b = nCache.get(key);
    if (b) { if (mode === 'live') playBuf(b, t, v / vr, rv, dl); return true; }
    enqueue(key, len, render);
    return mode === 'warm';
  }
  A.cacheSize = () => nCache.size;
  A.queueSize = () => queue.length;

  // ---------- instrumentos (síntesis completa; se usa al pre-renderizar) ----------
  function kickS(t, v, drive) {
    const o = osc('sine', drive ? 185 : 150, t), g = gain(0);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    perc(g.gain, t, v, 0.42);
    o.connect(g);
    if (drive) { const s = shaper(drive); g.connect(s); const pg = gain(0.8); s.connect(pg); pg.connect(mIn); } else g.connect(mIn);
    o.start(t); o.stop(t + 0.46);
    const n = noise(t, 0.02), hp = bq('highpass', 2500), ng = gain(0); perc(ng.gain, t, v * 0.25, 0.015); n.connect(hp); hp.connect(ng); ng.connect(mIn);
  }
  function snareS(t, v, tone) {
    const n = noise(t, 0.3), bp = bq('bandpass', 1900, 0.7), g = gain(0);
    perc(g.gain, t, v, 0.24); n.connect(bp); bp.connect(g); g.connect(mIn);
    const o = osc('triangle', tone || 190, t), og = gain(0);
    o.frequency.exponentialRampToValueAtTime((tone || 190) * 0.6, t + 0.08); perc(og.gain, t, v * 0.7, 0.11);
    o.connect(og); og.connect(mIn); o.start(t); o.stop(t + 0.14);
  }
  function hatS(t, v, open) {
    const n = noise(t, open ? 0.3 : 0.06), hp = bq('highpass', 7600), g = gain(0);
    perc(g.gain, t, v, open ? 0.22 : 0.04); n.connect(hp); hp.connect(g); g.connect(mIn);
  }
  function metalS(t, v) {
    const g = gain(0), bp = bq('bandpass', 2900, 2.5), s = shaper(6);
    [317, 489, 732, 1043].forEach((f) => { const o = osc('square', f, t); o.connect(bp); o.start(t); o.stop(t + 0.2); });
    perc(g.gain, t, v, 0.16); bp.connect(s); s.connect(g); g.connect(mIn);
  }
  function growlS(t, f, dur, v, wob, drive) {
    const mix = gain(0.3), s = shaper(drive || 14), lp = bq('lowpass', 420, 9), g = gain(0);
    const o1 = osc('sawtooth', f, t), o2 = osc('sawtooth', f * 1.007, t), o3 = osc('square', f * 0.5, t);
    [o1, o2, o3].forEach((o) => { o.connect(mix); o.start(t); o.stop(t + dur + 0.1); });
    const lfo = osc('sine', wob, t), lg = gain(820); lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
    mix.connect(s); s.connect(lp); lp.connect(g); g.connect(mIn);
    adsr(g.gain, t, 0.01, v, 0.05, v * 0.9, 0.06, t + dur);
  }
  function sbassS(t, f, dur, v, cut, envAmt, type, q, drive) {
    const o = osc(type || 'sawtooth', f, t), o2 = osc('square', f * 1.004, t), mix = gain(0.5), lp = bq('lowpass', cut + envAmt, q || 6), g = gain(0);
    lp.frequency.setValueAtTime(cut + envAmt, t); lp.frequency.exponentialRampToValueAtTime(Math.max(60, cut), t + Math.min(dur, 0.16));
    o.connect(mix); o2.connect(mix);
    let last = mix; if (drive) { const s = shaper(drive); mix.connect(s); last = s; }
    last.connect(lp); lp.connect(g); g.connect(mIn);
    adsr(g.gain, t, 0.003, v, 0.08, v * 0.7, 0.03, t + dur);
    o.start(t); o2.start(t); o.stop(t + dur + 0.08); o2.stop(t + dur + 0.08);
  }
  function leadS(t, f, dur, v, type, det) {
    const g = gain(0), lp = bq('lowpass', 3200, 1);
    [-(det || 7), det || 7].forEach((c) => { const o = osc(type || 'sawtooth', f, t); o.detune.value = c; o.connect(lp); o.start(t); o.stop(t + dur + 0.12); });
    lp.connect(g); g.connect(mIn);
    adsr(g.gain, t, 0.005, v, 0.1, v * 0.75, 0.08, t + dur);
  }
  function guitarS(t, f, dur, v, mute) {
    const mix = gain(0.18), hp = bq('highpass', 95), s = shaper(90), pk = bq('peaking', 1500, 1); pk.gain.value = 5;
    const lp = bq('lowpass', mute ? 1700 : 3300, 0.9), g = gain(0);
    [f, f * 1.4983, f * 2].forEach((ff) => [-9, 9].forEach((c) => { const o = osc('sawtooth', ff, t); o.detune.value = c; o.connect(mix); o.start(t); o.stop(t + dur + 0.25); }));
    mix.connect(hp); hp.connect(s); s.connect(pk); pk.connect(lp); lp.connect(g); g.connect(mIn);
    adsr(g.gain, t, 0.004, v, mute ? 0.05 : 0.2, v * (mute ? 0.4 : 0.8), mute ? 0.04 : 0.18, t + dur);
  }
  function voxS(t, f, dur, v, vowel) {
    const F = { a: [800, 1150, 2900], o: [450, 800, 2830], e: [400, 1600, 2700], u: [325, 700, 2530] }[vowel || 'a'];
    const src = osc('sawtooth', f, t), vib = osc('sine', 6, t), vg = gain(5); vib.connect(vg); vg.connect(src.frequency);
    const sum = gain(1), s = shaper(4), g = gain(0);
    F.forEach((ff, i) => { const b = bq('bandpass', ff, 11), bg = gain([1, 0.6, 0.3][i]); src.connect(b); b.connect(bg); bg.connect(sum); });
    sum.connect(s); s.connect(g); g.connect(mIn);
    adsr(g.gain, t, 0.01, v, 0.08, v * 0.8, 0.1, t + dur);
    src.start(t); vib.start(t); src.stop(t + dur + 0.2); vib.stop(t + dur + 0.2);
  }

  // ---------- instrumentos que usa la música (caché + respaldo en directo) ----------
  function kick(t, v, drive) {
    const vr = q20(v), d = drive || 0;
    if (viaCache('k' + vr + '_' + d, 0.5, t, v, vr, (t0) => kickS(t0, vr, d))) return;
    kickS(t, v, d);
  }
  function snare(t, v, rv, tone) {
    const vr = q20(v), tn = tone || 190, r = Math.round((rv == null ? 0.4 : rv) * 20) / 20;
    if (viaCache('s' + vr + '_' + tn, 0.32, t, v, vr, (t0) => snareS(t0, vr, tn), r)) return;
    snareS(t, v, tn);
  }
  function hat(t, v, open) {
    const vr = q20(v);
    if (viaCache('h' + vr + '_' + (open ? 1 : 0), open ? 0.32 : 0.08, t, v, vr, (t0) => hatS(t0, vr, open))) return;
    hatS(t, v, open);
  }
  function metal(t, v) {
    const vr = q20(v);
    if (viaCache('m' + vr, 0.24, t, v, vr, (t0) => metalS(t0, vr), 0.3)) return;
    metalS(t, v);
  }
  function growl(t, f, dur, v, wob, drive) {
    const vr = q20(v), dd = qd(dur), w = Math.round(wob * 100) / 100, dr = drive || 14;
    if (viaCache(['w', Math.round(f * 10), dd, vr, w, dr].join('_'), dd + 0.2, t, v, vr, (t0) => growlS(t0, f, dd, vr, w, dr))) return;
    growlS(t, f, dur, v, wob, dr);
  }
  function sbass(t, f, dur, v, cut, envAmt, type, q, drive) {
    const vr = q20(v), dd = qd(dur);
    if (viaCache(['b', Math.round(f * 10), dd, vr, cut, envAmt, type, q, drive || 0].join('_'), dd + 0.14, t, v, vr, (t0) => sbassS(t0, f, dd, vr, cut, envAmt, type, q, drive))) return;
    sbassS(t, f, dur, v, cut, envAmt, type, q, drive);
  }
  function lead(t, f, dur, v, type, dly, det) {
    const vr = q20(v * 4) / 4, dd = qd(dur), dl = dly == null ? 0.25 : dly;
    if (viaCache(['l', Math.round(f * 10), dd, vr, type || 's', det || 7].join('_'), dd + 0.25, t, v, vr, (t0) => leadS(t0, f, dd, vr, type, det), 0.15, dl)) return;
    leadS(t, f, dur, v, type, det);
  }
  function guitar(t, f, dur, v, mute) {
    const vr = q20(v), dd = qd(dur);
    if (viaCache(['g', Math.round(f * 10), dd, vr, mute ? 1 : 0].join('_'), dd + 0.3, t, v, vr, (t0) => guitarS(t0, f, dd, vr, mute), 0.08)) return;
    guitarS(t, f, dur, v, mute);
  }
  function vox(t, f, dur, v, vowel) {
    const vr = q20(v), dd = qd(dur);
    if (viaCache(['v', Math.round(f * 10), dd, vr, vowel || 'a'].join('_'), dd + 0.3, t, v, vr, (t0) => voxS(t0, f, dd, vr, vowel), 0.3, 0.2)) return;
    voxS(t, f, dur, v, vowel);
  }
  function pad(t, fs, dur, v, cut) {
    if (mode === 'warm') return;
    const g = gain(0), lp = bq('lowpass', cut || 900, 0.8);
    fs.forEach((f, i) => { const o = osc('sawtooth', f, t); o.detune.value = i % 2 ? 9 : -9; o.connect(lp); o.start(t); o.stop(t + dur + 1.2); });
    lp.connect(g); g.connect(mIn); send(g, 0.6);
    adsr(g.gain, t, dur * 0.3, v * 1.3, 0.5, v * 1.1, 1.0, t + dur);
  }
  function ping(t, f, v) {
    if (mode === 'warm') return;
    const o = osc('sine', f, t), g = gain(0); perc(g.gain, t, v, 1.2);
    o.connect(g); g.connect(mIn); send(g, 0.5); send(g, 0.4, dlIn); o.start(t); o.stop(t + 1.3);
  }
  function tickS(t, v) { const n = noise(t, 0.02), bp = bq('bandpass', 3200, 4), g = gain(0); perc(g.gain, t, v, 0.02); n.connect(bp); bp.connect(g); g.connect(mIn); }
  function tick(t, v) { const vr = q20(v); if (viaCache('t' + vr, 0.05, t, v, vr, (t0) => tickS(t0, vr))) return; tickS(t, v); }
  // pre-calienta la caché de un estilo (4 compases a varias intensidades) sin sonar
  function warm(st) {
    if (!ac || !st) return;
    const prev = mode; mode = 'warm';
    try {
      for (const I of [0, 0.35, 0.7, 1]) {
        const sd = 60 / (st.bpm * (1 + (st.accel == null ? 0.07 : st.accel) * I)) / 4;
        for (let s = 0; s < 64; s++) st.step(s, 0, I, sd);
      }
    } catch (e) { console.error(e); } finally { mode = prev; }
  }
  function chord(root, q) { const iv = q === 'm' ? [0, 3, 7] : [0, 4, 7]; return iv.map((i) => mf(root + i)); }

  // ---------- estilos ----------
  const STYLES = {
    ambient: { bpm: 76, accel: 0, step(s, t, I, sd) {
      const bar = s >> 4, st = s & 15;
      const prog = [[50, 'm'], [46, 'M'], [48, 'M'], [45, 'm']];
      const [r, q] = prog[(bar >> 1) % 4];
      if (st === 0 && bar % 2 === 0) { pad(t, chord(r, q).concat([mf(r + 14)]), sd * 31, 0.045, 650); if (mode === 'warm') return; const o = osc('sine', mf(r - 24), t), g = gain(0); adsr(g.gain, t, 1.5, 0.12, 1, 0.1, 1.5, t + sd * 30); o.connect(g); g.connect(mIn); o.start(t); o.stop(t + sd * 32 + 1.6); }
      if (st % 4 === 0) tick(t, st === 0 ? 0.05 : 0.03);
      if (Math.random() < 0.05) ping(t, mf(G.pick([74, 77, 81, 84, 86, 89])), 0.025);
    } },
    midtempo: { bpm: 100, step(s, t, I, sd) { // Cyberpunk / Midtempo Bass: lento y pesado
      const bar = s >> 4, st = s & 15;
      const prog = [[30, 'm'], [30, 'm'], [26, 'M'], [28, 'M']];
      const [r, q] = prog[bar % 4];
      const wob = (100 / 60) * 2;
      if ('x.........x.....'[st] === 'x' || (I > 0.5 && st === 7)) kick(t, 0.95, 3);
      if (st === 8) snare(t, 0.62, 0.6, 175);
      if (st === 14 && bar % 2 === 1) snare(t, 0.22, 0.3, 200);
      if (I > 0.2 && st % 4 === 2) hat(t, 0.11);
      if (I > 0.6 && st % 2 === 1) hat(t, 0.06);
      if (st === 0) growl(t, mf(r), sd * 6, 0.3, wob);
      if (st === 8) growl(t, mf(r), sd * 3.6, 0.3, wob * 2);
      if (st === 12) growl(t, mf(r + 12), sd * 3, 0.24, wob * 2);
      if (st === 0) pad(t, chord(r + 24, q), sd * 15, 0.03, 560);
      if (I > 0.4 && (st === 3 || st === 6 || st === 11)) lead(t, mf(r + 36 + (st === 6 ? (q === 'm' ? 3 : 4) : st === 11 ? 7 : 0)), sd * 0.9, 0.05, 'square', 0.35);
    } },
    darksynth: { bpm: 120, step(s, t, I, sd) { // Darksynth / Outrun: rápido y cañero
      const bar = s >> 4, st = s & 15;
      const prog = [[33, 'm'], [29, 'M'], [36, 'M'], [31, 'M']];
      const [r, q] = prog[bar % 4];
      if (st % 4 === 0) kick(t, 0.95, 2);
      if (st === 4 || st === 12) snare(t, 0.66, 0.9, 205);
      if (I > 0.15 && st % 2 === 0) hat(t, st % 4 === 2 ? 0.1 : 0.05);
      if (I > 0.5 && st % 4 === 2) hat(t, 0.07, true);
      sbass(t, mf(r + (st % 2 ? 12 : 0)), sd * 0.85, 0.2, 170, 1700, 'sawtooth', 8, 2);
      const arp = q === 'm' ? [0, 3, 7, 12, 15, 12, 7, 3] : [0, 4, 7, 12, 16, 12, 7, 4];
      if (I > 0.18) lead(t, mf(r + 36 + arp[st % 8]), sd * 0.7, 0.042, 'square', 0.22, 4);
      if (I > 0.6 && st % 8 === 0) { const mel = [12, 15, 19, 17, 15, 12, 10, 12]; lead(t, mf(r + 48 + mel[(bar * 2 + st / 8) % 8] - 12), sd * 7, 0.05, 'sawtooth', 0.35, 9); }
      if (st === 0) pad(t, chord(r + 24, q), sd * 15, 0.028, 900);
    } },
    industrial: { bpm: 128, step(s, t, I, sd) { // Industrial / EBM: sucio y distópico
      const bar = s >> 4, st = s & 15;
      const prog = [[28, 'm'], [28, 'm'], [29, 'M'], [26, 'M']];
      const [r] = prog[bar % 4];
      if (st % 4 === 0) kick(t, 1, 6);
      if (st === 4 || st === 12) snare(t, 0.68, 0.45, 165);
      if ('..x...x...x.x.x.'[st] === 'x') metal(t, 0.13);
      if (I > 0.2 && st % 2 === 1) hat(t, 0.07);
      sbass(t, mf(r + (st % 4 === 3 ? 12 : 0)), sd * 0.7, 0.22, 120, 1150, 'square', 10, 4);
      if (I > 0.3 && 'x.x.x..xx.x.x...'[st] === 'x') guitar(t, mf(r + 12), sd * 0.8, 0.11, true);
      if (I > 0.7 && st === 0) guitar(t, mf(r + 12), sd * 7, 0.12, false);
      if (bar % 2 === 1 && st === 12) vox(t, mf(r + 36), sd * 2, 0.16, 'a');
      if (bar % 4 === 3 && st === 6) vox(t, mf(r + 31), sd * 1.5, 0.12, 'o');
    } },
    chaos: { bpm: 138, step(s, t, I, sd) { // mezcla de todo
      const bar = s >> 4, st = s & 15;
      const prog = [[26, 'm'], [26, 'm'], [34, 'M'], [24, 'M']];
      const [r, q] = prog[bar % 4];
      if (st % 4 === 0) kick(t, 1, 5);
      if (st === 4 || st === 12) snare(t, 0.68, 0.7, 190);
      if (bar % 4 === 3 && st >= 12) { snare(t + sd * 0.5, 0.35, 0.2, 230); }
      if ('..x...x...x.x.x.'[st] === 'x') metal(t, 0.1);
      if (st % 2 === 0) hat(t, 0.06);
      if (I < 0.5) sbass(t, mf(r + (st % 4 === 3 ? 12 : 0)), sd * 0.7, 0.21, 130, 1200, 'square', 10, 3);
      else if (st % 4 === 0) growl(t, mf(r), sd * 3.6, 0.27, (138 / 60) * 4, 16);
      const arp = q === 'm' ? [0, 3, 7, 12, 7, 3, 7, 10] : [0, 4, 7, 12, 7, 4, 7, 11];
      lead(t, mf(r + 48 + arp[st % 8]), sd * 0.6, 0.035, 'square', 0.2, 4);
      if (I > 0.35 && 'x..x..x.x..x..x.'[st] === 'x') guitar(t, mf(r + 12), sd * 0.8, 0.09, true);
      if (bar % 4 === 1 && st === 12) vox(t, mf(r + 36), sd * 2, 0.15, 'e');
    } },
    serpent: { bpm: 172, step(s, t, I, sd) { // nivel 13: lo más bestia
      const bar = s >> 4, st = s & 15;
      const roots = [26, 26, 29, 24]; const r = roots[bar % 4];
      if ('x.....x...x.....'[st] === 'x' || (I > 0.5 && st === 9)) kick(t, 1, 7);
      if ('....x.......x..x'[st] === 'x') snare(t, st === 15 ? 0.35 : 0.7, 0.35, 210);
      if (st % 2 === 0) hat(t, 0.08);
      if (st % 8 === 0) growl(t, mf(r), sd * 7.5, 0.26, 0.6 + I * 5, 20);
      if (I > 0.25) lead(t, mf(r + 48 + [0, 12, 7, 15, 12, 19, 15, 22][st % 8]), sd * 0.5, 0.035 + I * 0.02, 'sawtooth', 0.15, 12);
      if (I > 0.5 && st % 4 === 2) metal(t, 0.12);
      if (bar % 2 === 1 && st >= 12 && mode !== 'warm') for (let k = 0; k < 2; k++) { const tt = t + k * sd * 0.5; const n = noise(tt, 0.05), g = gain(0), sh = ac.createWaveShaper(); sh.curve = crush(4); perc(g.gain, tt, 0.15, 0.05); n.connect(sh); sh.connect(g); g.connect(mIn); }
    } },
  };

  // ---------- secuenciador ----------
  const seq = { name: null, style: null, step: 0, next: 0, I: 0, timer: null };
  A.music = function (name) {
    if (seq.name === name) return;
    seq.name = name; seq.style = STYLES[name] || null; seq.step = 0;
    if (!ac) return;
    warm(seq.style);
    seq.next = ac.currentTime + 0.1;
    if (!seq.timer) seq.timer = setInterval(tickSeq, 30);
  };
  // pre-renderiza en segundo plano todos los estilos (se llama al encender)
  A.warmAll = function () { if (!ac) return; ['ambient', 'midtempo', 'darksynth', 'industrial', 'chaos', 'serpent'].forEach((n) => warm(STYLES[n])); };
  A.stopMusic = function () { seq.name = null; seq.style = null; };
  A.intensity = function (v) { seq.I = G.clamp(v, 0, 1); };
  // programa con 0,22 s de margen; si el móvil se atasca, salta los pasos atrasados en vez de soltarlos de golpe
  function tickSeq() {
    if (!ac || !seq.style || ac.state !== 'running') return;
    const st = seq.style, now = ac.currentTime;
    if (seq.next < now - 0.3) seq.next = now + 0.05;
    while (seq.next < now + 0.22) {
      const bpm = st.bpm * (1 + (st.accel == null ? 0.07 : st.accel) * seq.I);
      const sd = 60 / bpm / 4;
      if (seq.next >= now - 0.015) { try { st.step(seq.step, seq.next, seq.I, sd); } catch (e) { console.error(e); } }
      seq.next += sd; seq.step++;
    }
  }
  // si la música se pidió antes del primer toque, arrancar al desbloquear
  const _unlock = A.unlock;
  A.unlock = function () { _unlock(); if (ac && seq.style && !seq.timer) { warm(seq.style); seq.next = ac.currentTime + 0.1; seq.timer = setInterval(tickSeq, 30); } };

  // ---------- bucles continuos (siseo + pitido fino) ----------
  const loops = {};
  A.loop = function (name, on, vol) {
    if (!ac) return;
    if (!on) { const l = loops[name]; if (l) { l.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05); const n = l.nodes; setTimeout(() => n.forEach((x) => { try { x.stop(); } catch (e) { } }), 300); delete loops[name]; } return; }
    if (loops[name]) { loops[name].g.gain.setTargetAtTime(vol, ac.currentTime, 0.1); return; }
    const t = ac.currentTime, g = gain(0.0001); g.connect(sBus); g.gain.setTargetAtTime(vol, t, 0.05);
    const nodes = [];
    if (name === 'hiss') {
      const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const lp = bq('lowpass', 4200), hp = bq('highpass', 280); s.connect(hp); hp.connect(lp); lp.connect(g); s.start(t); nodes.push(s);
    } else if (name === 'beep') {
      const o = osc('sine', 9400, t); o.connect(g); o.start(t); nodes.push(o);
    } else if (name === 'hum') {
      const o = osc('sawtooth', 50, t), lp = bq('lowpass', 180); o.connect(lp); lp.connect(g); o.start(t); nodes.push(o);
    }
    loops[name] = { g, nodes };
  };

  // ---------- efectos de sonido ----------
  let modemNodes = [];
  function tone(t, f, dur, v, type, dest, f2) {
    const o = osc(type || 'square', f, t), g = gain(0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sBus); o.start(t); o.stop(t + dur + 0.02);
    return o;
  }
  function bell(t, f, dur, v, ratio, idx, dest) {
    const car = osc('sine', f, t), mod = osc('sine', f * (ratio || 3.5), t), mg = gain(f * (idx || 2)), g = gain(0);
    mg.gain.setValueAtTime(f * (idx || 2), t); mg.gain.exponentialRampToValueAtTime(1, t + dur);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(dest || sBus);
    perc(g.gain, t, v, dur); car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
    return g;
  }
  A.sfx = function (name, p) {
    if (!ac || (ac.state !== 'running' && !offline)) return;
    const t = ac.currentTime + 0.004;
    switch (name) {
      case 'tap': tone(t, 880, 0.05, 0.2, 'square', null, 1320); break;
      case 'back': tone(t, 990, 0.06, 0.1, 'square', null, 520); break;
      case 'type': { const n = noise(t, 0.015), bp = bq('bandpass', 2600 + Math.random() * 2400, 3), g = gain(0); perc(g.gain, t, 0.07 * (p || 1), 0.014); n.connect(bp); bp.connect(g); g.connect(sBus); break; }
      case 'close': {
        const c = p || 0, f = 520 + Math.min(c, 12) * 55;
        tone(t, f, 0.07, 0.28, 'square', null, f * 0.35);
        const n = noise(t, 0.03), hp = bq('highpass', 3000), g = gain(0); perc(g.gain, t, 0.2, 0.025); n.connect(hp); hp.connect(g); g.connect(sBus);
        break; }
      case 'spawn': {
        const k = p || 0;
        if (k === 1) { tone(t, 659, 0.12, 0.13, 'triangle'); tone(t, 880, 0.14, 0.11, 'triangle'); }
        else if (k === 2) { tone(t, 1175, 0.06, 0.12, 'square'); tone(t + 0.06, 1568, 0.08, 0.1, 'square'); }
        else { bell(t, 1318, 0.25, 0.15, 2.0, 1.2); }
        break; }
      case 'toun': { // error MUY fuerte (sonido propio, no el original)
        A.duck(0.04, 1.6);
        const g = gain(1); g.connect(out);
        bell(t, 440, 1.3, 0.75, 1.41, 3, g); bell(t, 349.2, 1.4, 0.55, 2.01, 2, g);
        const o = osc('triangle', 220, t), og = gain(0); perc(og.gain, t, 0.5, 0.9); o.connect(og); og.connect(g); o.start(t); o.stop(t + 1);
        const th = osc('sine', 90, t), tg = gain(0); th.frequency.exponentialRampToValueAtTime(40, t + 0.3); perc(tg.gain, t, 0.9, 0.35); th.connect(tg); tg.connect(g); th.start(t); th.stop(t + 0.4);
        const n = noise(t, 0.4), lp = bq('lowpass', 1800), ng = gain(0); perc(ng.gain, t, 0.35, 0.3); n.connect(lp); lp.connect(ng); ng.connect(g);
        break; }
      case 'crtOn': {
        const o = osc('sine', 60, t), g = gain(0); perc(g.gain, t, 0.45, 0.35); o.connect(g); g.connect(sBus); o.start(t); o.stop(t + 0.4);
        const n = noise(t, 0.5), lp = bq('lowpass', 2500), ng = gain(0); perc(ng.gain, t, 0.18, 0.45); n.connect(lp); lp.connect(ng); ng.connect(sBus);
        const w = osc('sine', 11800, t), wg = gain(0); wg.gain.setValueAtTime(0.0001, t); wg.gain.linearRampToValueAtTime(0.018, t + 0.2); wg.gain.exponentialRampToValueAtTime(0.0001, t + 2.2); w.connect(wg); wg.connect(sBus); w.start(t); w.stop(t + 2.3);
        break; }
      case 'crtOff': tone(t, 1400, 0.3, 0.12, 'sawtooth', null, 50); tone(t + 0.28, 3000, 0.02, 0.1, 'square'); break;
      case 'glitch': {
        for (let i = 0; i < 6; i++) tone(t + i * 0.022, 200 + Math.random() * 2400, 0.02, 0.06, 'square');
        const n = noise(t, 0.15), sh = ac.createWaveShaper(); sh.curve = crush(3); const g = gain(0); perc(g.gain, t, 0.08, 0.14); n.connect(sh); sh.connect(g); g.connect(sBus);
        break; }
      case 'steal': tone(t, 900, 0.4, 0.13, 'sawtooth', null, 110); tone(t + 0.05, 2400, 0.03, 0.08, 'square'); tone(t + 0.25, 1800, 0.03, 0.08, 'square'); break;
      case 'fake': { const o = osc('square', 92, t), s = shaper(20), g = gain(0); perc(g.gain, t, 0.22, 0.28); o.connect(s); s.connect(g); g.connect(sBus); o.start(t); o.stop(t + 0.3); break; }
      case 'deny': tone(t, 220, 0.06, 0.12, 'square'); tone(t + 0.08, 196, 0.08, 0.12, 'square'); break;
      case 'hit': { tone(t, 140, 0.12, 0.25, 'square', null, 60); const n = noise(t, 0.05), bp = bq('bandpass', 2600, 2), g = gain(0); perc(g.gain, t, 0.18, 0.06); n.connect(bp); bp.connect(g); g.connect(sBus); break; }
      case 'combo': tone(t, 1568, 0.05, 0.06, 'square'); tone(t + 0.05, 2093, 0.07, 0.06, 'square'); break;
      case 'beepT': tone(t, 1760, 0.06, 0.08, 'square'); break;
      case 'snake': { const f = 300 + (p || 0) * 1100; tone(t, f, 0.06, 0.22, 'square', null, f * 1.5); break; }
      case 'clear': {
        [60, 63, 67, 72, 75, 79, 84].forEach((n, i) => tone(t + i * 0.055, mf(n), 0.1, 0.07, 'square'));
        const g = gain(0.5); g.connect(sBus); [72, 76, 79, 84].forEach((n) => bell(t + 0.42, mf(n), 1.4, 0.12, 2, 0.8, g));
        break; }
      case 'restart': { // arranque/reinicio propio (composición original)
        A.duck(0.0, 5);
        const g = gain(0.9); g.connect(out); send(g, 0.9);
        const padG = gain(0); padG.connect(g);
        const lp = bq('lowpass', 1400, 0.7); lp.connect(padG);
        [51, 55, 58, 62, 65].forEach((n) => [-8, 8].forEach((c) => { const o = osc('sawtooth', mf(n), t); o.detune.value = c; o.connect(lp); o.start(t); o.stop(t + 5); }));
        padG.gain.setValueAtTime(0.0001, t); padG.gain.linearRampToValueAtTime(0.06, t + 1.4); padG.gain.setValueAtTime(0.06, t + 2.6); padG.gain.exponentialRampToValueAtTime(0.0001, t + 4.8);
        [70, 75, 77, 79, 82, 87].forEach((n, i) => bell(t + 0.3 + i * 0.34, mf(n), 2.4, 0.13, 2, 1, g));
        break; }
      case 'power': tone(t, 120, 0.15, 0.2, 'square', null, 60); break;
      // ---- microjuegos (sonidos de sistema propios, estilo escritorio 90s) ----
      case 'cmd': { // orden en pantalla: arpegio rápido + chispazo
        [0, 7, 12, 19].forEach((n, i) => tone(t + i * 0.045, mf(76 + n), 0.07, 0.13, 'square'));
        const n = noise(t, 0.12), hp = bq('highpass', 2500), g = gain(0); perc(g.gain, t, 0.12, 0.1); n.connect(hp); hp.connect(g); g.connect(sBus);
        break; }
      case 'ok': // ronda superada: "ding" de sistema
        tone(t, mf(84), 0.07, 0.15, 'square'); tone(t + 0.07, mf(91), 0.12, 0.15, 'square');
        bell(t + 0.07, mf(96), 0.6, 0.12, 2, 1);
        break;
      case 'bad': { // ronda fallada: acorde de error + zumbido
        A.duck(0.25, 0.9);
        const g = gain(1.3); g.connect(out);
        bell(t, 311, 0.7, 0.35, 1.41, 2.5, g); bell(t, 233, 0.8, 0.3, 2.01, 2, g);
        const o = osc('square', 82, t), s = shaper(18), og = gain(0); perc(og.gain, t, 0.18, 0.3); o.connect(s); s.connect(og); og.connect(g); o.start(t); o.stop(t + 0.32);
        break; }
      case 'sys': { // 4 avisos de sistema estilo escritorio 90s (sonidos propios, no copias): acorde, campanitas, golpe crítico y "ding"
        const k = (p | 0) % 4;
        if (k === 0) { [mf(72), mf(76), mf(79)].forEach((f) => bell(t, f, 0.5, 0.09, 2, 0.6)); tone(t, mf(48), 0.3, 0.07, 'triangle'); }
        else if (k === 1) { bell(t, mf(84), 0.28, 0.13, 3.5, 1.1); bell(t + 0.1, mf(79), 0.38, 0.12, 3.5, 1.1); }
        else if (k === 2) {
          const o = osc('sine', 120, t), og = gain(0); o.frequency.exponentialRampToValueAtTime(50, t + 0.2); perc(og.gain, t, 0.32, 0.25); o.connect(og); og.connect(sBus); o.start(t); o.stop(t + 0.3);
          bell(t, mf(55), 0.45, 0.13, 1.41, 2.2); bell(t, mf(58), 0.45, 0.09, 1.41, 2);
        } else { bell(t, mf(91), 0.4, 0.17, 2, 1); bell(t + 0.004, mf(103), 0.18, 0.05, 2, 0.5); }
        break; }
      case 'note': { // tonos del juego de memoria
        const f = [mf(64), mf(68), mf(71), mf(76)][(p | 0) % 4];
        tone(t, f, 0.28, 0.17, 'square'); tone(t, f * 2, 0.22, 0.05, 'triangle');
        break; }
      case 'pick': tone(t, 660, 0.04, 0.12, 'square', null, 990); break;
      case 'drop': { tone(t, 320, 0.12, 0.2, 'square', null, 70); const n = noise(t, 0.1), lp = bq('lowpass', 1500), g = gain(0); perc(g.gain, t, 0.2, 0.09); n.connect(lp); lp.connect(g); g.connect(sBus); break; }
      case 'boom': {
        A.duck(0.2, 1);
        const n = noise(t, 0.8), lp = bq('lowpass', 900), g = gain(0); perc(g.gain, t, 0.6, 0.7); n.connect(lp); lp.connect(g); g.connect(sBus);
        const o = osc('sine', 70, t), og = gain(0); o.frequency.exponentialRampToValueAtTime(30, t + 0.4); perc(og.gain, t, 0.5, 0.45); o.connect(og); og.connect(sBus); o.start(t); o.stop(t + 0.5);
        break; }
      case 'lose': tone(t, 400, 0.6, 0.15, 'sawtooth', null, 40); break;
    }
  };

  // ---------- módem (carga) ----------
  A.modem = function () {
    if (!ac) return;
    A.stopModem();
    const t0 = ac.currentTime + 0.05, g = gain(0.55); g.connect(sBus);
    const add = (n) => { modemNodes.push(n); return n; };
    const tn = (t, f, dur, v, type) => { const o = add(osc(type || 'sine', f, t)), gg = gain(0); gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(v, t + 0.01); gg.gain.setValueAtTime(v, t + dur - 0.01); gg.gain.linearRampToValueAtTime(0.0001, t + dur); o.connect(gg); gg.connect(g); o.start(t); o.stop(t + dur + 0.02); };
    let t = t0;
    tn(t, 350, 0.9, 0.12); tn(t, 440, 0.9, 0.12); t += 1.0;
    const rows = [697, 770, 852, 941], cols = [1209, 1336, 1477];
    for (let i = 0; i < 10; i++) { tn(t, G.pick(rows), 0.085, 0.1); tn(t, G.pick(cols), 0.085, 0.1); t += 0.13; }
    t += 0.35;
    tn(t, 2100, 1.1, 0.07); t += 1.15;
    { const o = add(osc('square', 1080, t)), gg = gain(0.035), lp = bq('lowpass', 2600); for (let k = 0; k < 80; k++) o.frequency.setValueAtTime(G.pick([980, 1180, 1650, 1850]), t + k * 0.006); o.connect(lp); lp.connect(gg); gg.connect(g); o.start(t); o.stop(t + 0.5); }
    t += 0.5;
    tn(t, 1200, 0.5, 0.06, 'triangle'); tn(t, 2400, 0.5, 0.04, 'triangle'); t += 0.55;
    { const n = add(noise(t, 3.2)), bp = bq('bandpass', 1900, 0.6), gg = gain(0), trem = add(osc('square', 17, t)), tg = gain(0.04);
      trem.connect(tg); tg.connect(gg.gain); gg.gain.setValueAtTime(0.09, t); gg.gain.linearRampToValueAtTime(0.06, t + 3.2);
      n.connect(bp); bp.connect(gg); gg.connect(g); trem.start(t); trem.stop(t + 3.3);
      const o = add(osc('sine', 1800, t)), og = gain(0.05); for (let k = 0; k < 400; k++) o.frequency.setValueAtTime(1500 + Math.random() * 1200, t + k * 0.008); o.connect(og); og.connect(g); o.start(t); o.stop(t + 3.2); }
    A._modemGain = g;
  };
  A.stopModem = function () {
    modemNodes.forEach((n) => { try { n.stop(); } catch (e) { } }); modemNodes = [];
    if (A._modemGain) { try { A._modemGain.disconnect(); } catch (e) { } A._modemGain = null; }
  };
})(window.G);
