/* Thot Studio — site test */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- nav, apparitions, modales ---------- */
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
$$('.reveal').forEach(el => io.observe(el));

$$('[data-open]').forEach(b => b.onclick = () => { const d = $('#' + b.dataset.open); d.showModal(); const v = $('video', d); if (v) v.play().catch(() => {}); });
$$('dialog').forEach(d => {
  d.addEventListener('click', e => { if (e.target === d || e.target.matches('[data-close]')) d.close(); });
  d.addEventListener('close', () => { const v = $('video', d); if (v) v.pause(); });
});

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- page interne (données absentes de la version publiée) ---------- */
const HAS_INTERNAL = !!window.PROSPECTS;
if (HAS_INTERNAL) $('#internal-link').hidden = false; else $('#interne').remove();
function showPane(name) {
  $$('[data-itab]').forEach(b => b.classList.toggle('on', b.dataset.itab === name));
  $$('[data-ipane]').forEach(p => p.hidden = p.dataset.ipane !== name);
}
function route() {
  const internal = HAS_INTERNAL && location.hash.startsWith('#interne');
  document.body.classList.toggle('internal-view', internal);
  if (internal) { showPane(location.hash === '#interne/appels' ? 'appels' : 'prospects'); scrollTo(0, 0); }
}
$$('[data-itab]').forEach(b => b.onclick = () => { location.hash = b.dataset.itab === 'appels' ? '#interne/appels' : '#interne'; });
addEventListener('hashchange', route); route();
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'site'; } };

/* prospects : boutons horizontaux qui déplient la liste en repoussant la page */
if (HAS_INTERNAL) {
  const P = window.PROSPECTS.groupes, wrap = $('#pgroups');
  wrap.innerHTML = `<div class="pbar">${P.map((g, i) => `<button class="pbtn" data-g="${i}">${esc(g.titre)} <b>${g.items.length}</b></button>`).join('')}</div><div class="ppanel"></div>`;
  const panel = $('.ppanel', wrap);
  $$('.pbtn', wrap).forEach(b => b.onclick = () => {
    const open = b.classList.contains('on');
    $$('.pbtn', wrap).forEach(x => x.classList.remove('on'));
    if (open) { panel.style.maxHeight = '0'; panel.classList.remove('open'); return; }
    b.classList.add('on');
    const g = P[b.dataset.g];
    panel.innerHTML = `<ol>${g.items.map(x => `<li><b>${esc(x.nom)} <span class="v">· ${esc(x.ville)}</span></b><p>${esc(x.pourquoi)}</p><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(host(x.url))} ↗</a></li>`).join('')}</ol>`;
    panel.classList.add('open'); panel.style.maxHeight = panel.scrollHeight + 'px';
  });
}

/* appels d'offres : 7 prioritaires, vigilance, processus, passés ou récurrents */
(function appels() {
  if (!HAS_INTERNAL || !window.APPELS) return;
  const A = window.APPELS.appels, box = $('#ao');
  const fmt = d => new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const date = a => a.date ? `${fmt(a.date)}${a.date_txt ? `<small>${esc(a.date_txt)}</small>` : ''}` : `<small>${esc(a.date_txt || 'date à préciser')}</small>`;
  const item = (a, n) => `<div class="aoi"><div class="d">${n ? `<div class="n">${n}</div>` : ''}${date(a)}</div>
    <div><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.titre)} ↗</a> <span class="o">· ${esc(a.organisme)}</span>
    <p>${esc(a.resume)}</p>${a.pourquoi ? `<p class="why">${esc(a.pourquoi)}</p>` : ''}</div></div>`;
  const byDate = (x, y) => (x.date || '9999').localeCompare(y.date || '9999');
  const prio = A.filter(a => a.priorite).sort((x, y) => x.priorite - y.priorite);
  const vig = A.filter(a => !a.priorite && a.vigilance && a.statut !== 'passe').sort(byDate);
  const past = A.filter(a => !a.priorite && !vig.includes(a)).sort(byDate);
  const steps = window.APPELS.processus || [];
  box.innerHTML = `
    <div class="aoh">Les 7 prioritaires <small>mise à jour du ${fmt(window.APPELS.maj)}</small></div><div class="aolist">${prio.map(a => item(a, a.priorite)).join('')}</div>
    <div class="aoh">À surveiller <small>${vig.length} appels</small></div><div class="aolist">${vig.map(a => item(a)).join('')}</div>
    ${steps.length ? `<div class="aoh">Le processus à suivre</div><div class="steps">${steps.map(s => `<div><b>${esc(s.titre)}</b>${esc(s.texte)}</div>`).join('')}</div>` : ''}
    <details class="aopast"><summary>Appels déjà passés ou récurrents (${past.length})</summary><div class="aolist">${past.map(a => item(a)).join('')}</div></details>`;
})();


/* ---------- bruit 2D (value noise lissé) ---------- */
const perm = new Uint8Array(512); { const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const fade = t => t * t * (3 - 2 * t);
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => perm[(perm[a & 255] + b) & 255] / 255;
  const u = fade(xf), v = fade(yf);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
const smooth = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------- logo : survol numérique, clic = ondes d'eau ---------- */
(function orb() {
  const box = $('#orb'), cv = $('canvas', box), ctx = cv.getContext('2d', { willReadFrequently: true });
  const S = cv.width, img = new Image(); img.src = 'assets/logo-sphere.png';
  let hover = 0, hTarget = 0, ripples = [], glitch = 0, mx = .5, my = .5, base = null, visible = true;
  box.addEventListener('pointerenter', () => hTarget = 1);
  box.addEventListener('pointerleave', () => hTarget = 0);
  box.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height; });
  box.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect();
    ripples.push({ x: (e.clientX - r.left) / r.width * S, y: (e.clientY - r.top) / r.height * S, t: 0 });
  });
  new IntersectionObserver(e => visible = e[0].isIntersecting).observe(box);
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = S; const tc = tmp.getContext('2d', { willReadFrequently: true });

  function frame(time) {
    requestAnimationFrame(frame);
    if (!visible || !img.complete) return;
    const T = time / 1000;
    hover += (hTarget - hover) * .08;
    tc.clearRect(0, 0, S, S);
    // respiration + léger suivi de la souris
    const k = 1 + Math.sin(T * .8) * .012 + hover * .02, ox = (mx - .5) * 10 * hover, oy = (my - .5) * 10 * hover;
    tc.save(); tc.translate(S / 2 + ox, S / 2 + oy); tc.scale(k, k); tc.drawImage(img, -S / 2, -S / 2, S, S); tc.restore();

    // survol : un globe de points numériques tourne dans la sphère
    if (hover > .01) {
      const R = S * .41, rot = T * .6;
      for (let la = -75; la <= 75; la += 15) for (let lo = 0; lo < 360; lo += 10) {
        const phi = la * Math.PI / 180, th = lo * Math.PI / 180 + rot;
        const x = Math.cos(phi) * Math.sin(th), y = Math.sin(phi), z = Math.cos(phi) * Math.cos(th);
        if (z < -.1) continue;
        const px = S / 2 + ox + x * R, py = S / 2 + oy + y * R * .98, a = hover * (.15 + .65 * z) * (.6 + .4 * Math.sin(T * 4 + lo * .2 + la));
        tc.fillStyle = (lo + la) % 60 === 0 ? `rgba(243,194,126,${a})` : `rgba(165,213,185,${a})`;
        tc.fillRect(px - 1.6, py - 1.6, 3.2, 3.2);
      }
      // ligne de balayage
      const sy = (T * 160) % S; const g = tc.createLinearGradient(0, sy - 30, 0, sy + 2);
      g.addColorStop(0, 'rgba(165,213,185,0)'); g.addColorStop(1, `rgba(165,213,185,${.22 * hover})`);
      tc.globalCompositeOperation = 'source-atop'; tc.fillStyle = g; tc.fillRect(0, sy - 30, S, 32); tc.globalCompositeOperation = 'source-over';
    }

    ctx.clearRect(0, 0, S, S);
    ripples = ripples.filter(r => (r.t += 1 / 60) < 1.8);
    if (!ripples.length) { ctx.drawImage(tmp, 0, 0); return; }

    // ondes d'eau : déplacement radial des pixels depuis le point cliqué
    const src = tc.getImageData(0, 0, S, S), sd = src.data, out = ctx.createImageData(S, S), od = out.data;
    for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) {
      let dx = 0, dy = 0, lit = 0;
      for (const r of ripples) {
        const vx = x - r.x, vy = y - r.y, d = Math.sqrt(vx * vx + vy * vy) + .001, front = r.t * 420;
        if (d - front > 210 || front - d > 210) continue; // hors de l'anneau de l'onde
        const w = Math.exp(-Math.pow((d - front) / 70, 2)) * Math.max(0, 1 - r.t / 1.8);
        const a = Math.sin(d * .09 - r.t * 18) * 22 * w;
        dx += vx / d * a; dy += vy / d * a; lit += a;
      }
      const sx = Math.min(S - 1, Math.max(0, (x + dx) | 0)), syy = Math.min(S - 1, Math.max(0, (y + dy) | 0));
      const i = (y * S + x) * 4, j = (syy * S + sx) * 4;
      const L = lit * 2.4; od[i] = sd[j] + L; od[i + 1] = sd[j + 1] + L * 1.15; od[i + 2] = sd[j + 2] + L * 1.1; od[i + 3] = sd[j + 3];
    }
    ctx.putImageData(out, 0, 0);
  }
  requestAnimationFrame(frame);
})();

/* ---------- curseur Authentique → Créatif ---------- */
(function slider() {
  const cv = $('#ac-canvas'), ctx = cv.getContext('2d'), rg = $('#ac-range');
  const W = cv.width, H = cv.height, img = new Image();
  let parts = [], t = 0, target = 0, visible = false;
  img.src = 'assets/img/main-rupestre.webp';
  img.onload = () => {
    const o = document.createElement('canvas'); o.width = W; o.height = H; const oc = o.getContext('2d');
    const s = Math.max(W / img.width, H / img.height);
    oc.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
    const d = oc.getImageData(0, 0, W, H).data, step = 7;
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      const k = (y * W + x) * 4, r = d[k], g = d[k + 1], b = d[k + 2], lum = (r + g + b) / 765;
      parts.push({ x, y, r, g, b, lum, seed: Math.random() * 1000 });
    }
    cv._src = o; draw(0);
  };
  rg.oninput = () => { target = rg.value / 100; };
  new IntersectionObserver(e => visible = e[0].isIntersecting).observe(cv);

  const pal = [[243, 194, 126], [208, 121, 63], [165, 213, 185], [69, 106, 111], [239, 230, 216]];
  function draw(time) {
    t += (target - t) * .08;
    if (!cv._src) return;
    const raw = 1 - smooth(0, .25, t);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(8,12,11,${.18 + .7 * (1 - t)})`;
    if (t < .02) { ctx.drawImage(cv._src, 0, 0); return; }
    ctx.fillRect(0, 0, W, H);
    if (raw > 0) { ctx.globalAlpha = raw; ctx.drawImage(cv._src, 0, 0); ctx.globalAlpha = 1; }
    const T = time / 1000, amp = Math.pow(t, 1.6) * 160, swirl = smooth(.55, 1, t), cx = W / 2, cy = H / 2;
    ctx.globalCompositeOperation = 'source-over';
    for (const p of parts) {
      if (t > .3 && p.lum < .2 + .12 * t) continue; // on ne garde que la matière
      const n = noise(p.x * .006 + T * .25, p.y * .006 - T * .2) * Math.PI * 4;
      let x = p.x + Math.cos(n) * amp, y = p.y + Math.sin(n) * amp;
      if (swirl > 0) { // la matière s'enroule en sphère
        const a = Math.atan2(p.y - cy, p.x - cx) + T * .4 + p.lum * 3, rad = 30 + (p.seed % 100) * 2.7 + Math.sin(T * 1.3 + p.seed) * 14;
        x += (cx + Math.cos(a) * rad - x) * swirl; y += (cy + Math.sin(a) * rad * .82 - y) * swirl;
      }
      const c = pal[(p.seed | 0) % 5], m = smooth(.15, .8, t);
      const r = p.r + (c[0] - p.r) * m, g = p.g + (c[1] - p.g) * m, b = p.b + (c[2] - p.b) * m;
      const sz = 6 + t * 3 * Math.sin(T * 2 + p.seed) ;
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${.55 + .45 * (1 - t * .5)})`;
      if (t > .45) { ctx.beginPath(); ctx.arc(x, y, Math.max(1, sz * .45), 0, 6.283); ctx.fill(); }
      else ctx.fillRect(x, y, sz, sz);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  (function loop(time) { if (visible || Math.abs(target - t) > .002) draw(time); requestAnimationFrame(loop); })(0);
})();

/* ---------- six propositions immersives, chacune un petit cadran animé ---------- */
(function ideas() {
  let ac;
  function blip(f = 660, d = .18, type = 'sine', pan = 0) {
    try {
      ac = ac || new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner(), t = ac.currentTime;
      o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + d * .4);
      g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + d); p.pan.value = pan;
      o.connect(g).connect(p).connect(ac.destination); o.start(); o.stop(t + d);
    } catch {}
  }
  function rumble(d = 1.2, pan = 0) {
    try {
      ac = ac || new AudioContext(); const b = ac.createBuffer(1, ac.sampleRate * d, ac.sampleRate), x = b.getChannelData(0);
      for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2);
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), p = ac.createStereoPanner(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = 220; p.pan.value = pan;
      s.connect(f).connect(p).connect(ac.destination); s.start();
    } catch {}
  }
  const R = Math.random, TAU = Math.PI * 2;
  const pictos = ['p009', 'p104', 'p157', 'p226', 'p312'].map(n => { const i = new Image(); i.src = `assets/pictos/${n}.png`; return i; });

  // petit visiteur vu de côté
  function visitor(c, x, y, s = 1, col = '#E9EFEC') {
    c.fillStyle = col; c.beginPath(); c.arc(x, y - 30 * s, 6 * s, 0, TAU); c.fill();
    c.fillRect(x - 4 * s, y - 23 * s, 8 * s, 15 * s); c.fillRect(x - 4 * s, y - 8 * s, 3 * s, 8 * s); c.fillRect(x + 1 * s, y - 8 * s, 3 * s, 8 * s);
  }

  const scenes = {
    canopee: {
      init(s) { s.leaves = Array.from({ length: 140 }, () => ({ x: R() * 480, y: R() * 270, r: 2 + R() * 4, a: R() * TAU, h: R() })); },
      draw(c, s, T) {
        const night = s.o === 2, storm = s.o === 1, wind = storm ? 5 : 1.2;
        c.fillStyle = night ? '#04100d' : '#0c2a20'; c.fillRect(0, 0, 480, 270);
        // trois écrans en arc
        for (let k = 0; k < 3; k++) { c.fillStyle = night ? 'rgba(30,60,50,.35)' : 'rgba(60,140,90,.28)'; c.beginPath(); c.moveTo(40 + k * 140, 40 + (k === 1 ? -10 : 10)); c.lineTo(160 + k * 140, 40 + (k === 1 ? -10 : 10)); c.lineTo(160 + k * 140, 200); c.lineTo(40 + k * 140, 200); c.fill(); }
        for (const l of s.leaves) {
          l.x += wind * (1 + Math.sin(T + l.h * 6)) + (storm ? R() * 2 : 0); l.y += Math.sin(T * 2 + l.a) * (storm ? 1.6 : .4); l.a += .05 * wind;
          if (l.x > 490) { l.x = -10; l.y = R() * 230; }
          c.save(); c.translate(l.x, l.y); c.rotate(l.a);
          c.fillStyle = night ? `rgba(255,212,59,${.3 + .7 * Math.abs(Math.sin(T * 3 + l.h * 20))})` : `hsl(${100 + l.h * 50},${50 + l.h * 20}%,${30 + l.h * 25}%)`;
          night ? c.fillRect(-1.5, -1.5, 3, 3) : (c.beginPath(), c.ellipse(0, 0, l.r * 1.6, l.r * .7, 0, 0, TAU), c.fill()); c.restore();
        }
        // ventilateurs : traits de vent
        c.strokeStyle = 'rgba(165,213,185,.35)'; c.lineWidth = 1.5;
        for (let k = 0; k < (storm ? 9 : 4); k++) { const y = 60 + k * 18, x = (T * 260 * wind / 2 + k * 97) % 560 - 60; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 30, y - 8, x + 60, y); c.stroke(); }
        visitor(c, 240, 240, 1.1); c.fillStyle = '#A5D5B9'; c.fillRect(0, 240, 480, 30);
      },
      opt(s) { blip([520, 260, 880][s.o], .4, 'triangle'); }
    },
    sol: {
      init(s) { s.steps = []; },
      draw(c, s, T) {
        c.fillStyle = '#0b1513'; c.fillRect(0, 0, 480, 270);
        const amp = [10, 18, 6][s.o];
        if (s.o === 2 && R() < .05) { s.steps.push({ x: R() * 18, y: R() * 9, t: T }); rumble(.3, R() - .5); }
        s.steps = s.steps.filter(p => T - p.t < 2.5);
        for (let j = 0; j < 10; j++) {
          c.beginPath();
          for (let i = 0; i <= 18; i++) {
            let h = 0;
            if (s.o === 0) h = Math.sin(i * .5 + T * 2 + j * .4) * amp;
            if (s.o === 1) h = Math.sin(i * 1.7 + T * 22) * amp * Math.max(0, Math.sin(T * 1.3)) * (R() * .6 + .4);
            for (const p of s.steps) { const d = Math.hypot(i - p.x, j - p.y), w = (T - p.t) * 8; h += Math.sin(d - w) * amp * Math.exp(-Math.abs(d - w)) * (1 - (T - p.t) / 2.5); }
            const px = 40 + i * 22 + j * 8, py = 110 + j * 13 - h * (j / 10 + .3);
            i ? c.lineTo(px, py) : c.moveTo(px, py);
          }
          c.strokeStyle = `rgba(${s.o === 1 ? '255,138,61' : '165,213,185'},${.25 + j * .07})`; c.lineWidth = 1.5; c.stroke();
        }
        const shake = s.o === 1 ? Math.sin(T * 40) * 3 * Math.max(0, Math.sin(T * 1.3)) : 0;
        visitor(c, 250 + shake, 196, 1.1);
      },
      opt(s) { s.o === 1 ? rumble(1.4) : blip(140, .5, 'sine'); }
    },
    brume: {
      init(s) { s.p = Array.from({ length: 90 }, () => ({ x: R() * 480, y: 40 + R() * 200, r: 30 + R() * 50, v: .2 + R() * .5 })); s.fish = Array.from({ length: 9 }, (_, i) => ({ x: R() * 480, y: 70 + i * 16, v: .6 + R() })); },
      draw(c, s, T) {
        c.fillStyle = '#06090b'; c.fillRect(0, 0, 480, 270);
        // faisceau du projecteur
        const g = c.createLinearGradient(0, 135, 480, 135); g.addColorStop(0, 'rgba(255,240,200,.18)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, 125); c.lineTo(480, 20); c.lineTo(480, 250); c.lineTo(0, 145); c.fill();
        for (const p of s.p) { p.y -= p.v * .3; p.x += Math.sin(T + p.r) * .3; if (p.y < 20) p.y = 250; const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); gr.addColorStop(0, 'rgba(200,215,220,.07)'); gr.addColorStop(1, 'rgba(200,215,220,0)'); c.fillStyle = gr; c.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
        c.save(); c.globalAlpha = .55 + .2 * Math.sin(T * 1.7);
        if (s.o === 0) { const x = (T * 60) % 640 - 80; c.fillStyle = '#FF8A3D'; c.beginPath(); c.ellipse(x, 150, 60, 18, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(x + 62, 140, 16, 0, TAU); c.fill(); for (let k = 0; k < 4; k++) c.fillRect(x - 45 + k * 28, 160 + Math.sin(T * 8 + k * 2) * 6, 7, 30); c.fillStyle = '#3a1a08'; for (let k = 0; k < 12; k++) c.fillRect(x - 50 + k * 9, 140 + (k % 3) * 7, 4, 4); }
        if (s.o === 1) for (const f of s.fish) { f.x = (f.x + f.v) % 520; c.fillStyle = '#3CC8C0'; c.beginPath(); c.ellipse(f.x - 20, f.y + Math.sin(T * 3 + f.y) * 6, 14, 5, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(f.x - 34, f.y); c.lineTo(f.x - 42, f.y - 6); c.lineTo(f.x - 42, f.y + 6); c.fill(); }
        if (s.o === 2) pictos.forEach((im, k) => { if (!im.complete) return; c.filter = 'sepia(1) saturate(5) hue-rotate(-15deg)'; c.drawImage(im, 60 + k * 80, 100 + Math.sin(T + k) * 14, 60, 64); c.filter = 'none'; });
        c.restore();
        visitor(c, 200 + Math.sin(T * .5) * 120, 245, 1, 'rgba(233,239,236,.9)');
      },
      opt(s) { blip([300, 900, 440][s.o], .6, 'sine'); }
    },
    meteo: {
      init(s) { s.flash = 0; s.drops = Array.from({ length: 140 }, () => ({ x: R() * 480, y: R() * 270, r: 1 + R() * 2.5, v: .5 + R() })); },
      draw(c, s, T) {
        const g = c.createLinearGradient(0, 0, 0, 270);
        g.addColorStop(0, ['#0a1222', '#1a2630', '#2a3644'][s.o]); g.addColorStop(1, ['#16202c', '#2a3a40', '#c9d4dc'][s.o]);
        c.fillStyle = g; c.fillRect(0, 0, 480, 270);
        // nuages en relief
        for (let k = 0; k < 6; k++) { const x = (k * 110 + T * 12) % 600 - 60, y = 30 + (k % 2) * 16, gr = c.createRadialGradient(x, y - 8, 4, x, y, 70); gr.addColorStop(0, s.o === 2 ? 'rgba(240,245,250,.5)' : 'rgba(120,135,155,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(x - 70, y - 70, 140, 140); }
        if (s.o === 0 && R() < .02) { s.flash = 1; s.bx = 60 + R() * 360; setTimeout(() => rumble(1.3, (s.bx - 240) / 240), 300); }
        if (s.flash > 0) {
          c.fillStyle = `rgba(220,230,255,${s.flash * .25})`; c.fillRect(0, 0, 480, 270);
          c.strokeStyle = `rgba(255,255,240,${s.flash})`; c.lineWidth = 2.5; c.shadowColor = '#bcd'; c.shadowBlur = 12; c.beginPath(); let x = s.bx, y = 40; c.moveTo(x, y);
          while (y < 200) { x += (R() - .5) * 26; y += 14; c.lineTo(x, y); } c.stroke(); c.shadowBlur = 0; s.flash -= .07;
        }
        for (const d of s.drops) {
          if (s.o === 2) { d.y += d.v * .7; d.x += Math.sin(T + d.r * 3) * .6; if (d.y > 262) d.y = -5; c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(d.x % 480, d.y, d.r, 0, TAU); c.fill(); }
          else { d.y = (d.y + (s.o === 1 ? 9 : 6) * d.v) % 280; d.x = (d.x + (s.o === 1 ? .5 : 2)) % 480; c.strokeStyle = 'rgba(170,195,225,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - (s.o === 1 ? 1 : 4), d.y - 10); c.stroke(); }
        }
        c.fillStyle = s.o === 2 ? '#eef3f6' : '#1d2a2c'; c.fillRect(0, 252, 480, 18);
        visitor(c, 240, 252, 1.1, s.o === 2 ? '#2F4B4F' : '#E9EFEC');
      },
      opt(s) { s.o === 0 ? rumble() : blip([0, 220, 880][s.o], .5, 'sine'); }
    },
    parfum: {
      init(s) { s.p = []; },
      draw(c, s, T) {
        c.fillStyle = '#0d1412'; c.fillRect(0, 0, 480, 270);
        const col = [[150, 142, 132], [168, 166, 150], [158, 150, 150]][s.o], name = ['terre', 'résine', 'feu'][s.o];
        [[60, 220], [420, 220], [240, 40]].forEach(([x, y]) => { c.fillStyle = '#2F4B4F'; c.beginPath(); c.arc(x, y, 12, 0, TAU); c.fill(); if (R() < .5) s.p.push({ x, y, vx: ((240 - x) / 160 + (R() - .5)) * .4, vy: ((190 - y) / 160 + (R() - .5)) * .4, a: 1, r: 6 + R() * 8 }); });
        s.p = s.p.filter(p => (p.a -= .004) > 0);
        for (const p of s.p) { p.x += p.vx + Math.sin(T * 2 + p.r) * .5; p.y += p.vy + Math.cos(T * 2 + p.r) * .4; p.r += .08; c.fillStyle = `rgba(${col},${p.a * .2})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
        visitor(c, 240, 225, 1.2);
        // le nez qui sent
        c.fillStyle = `rgba(${col},${.5 + .5 * Math.sin(T * 3)})`; c.font = '600 13px Manrope'; c.fillText(`« ${name} »`, 262, 182);
      },
      opt(s) { blip([330, 494, 392][s.o], .5, 'sine'); }
    },
    paroi: {
      init(s) { s.marks = []; s.draw = []; },
      draw(c, s, T) {
        const night = s.o === 2;
        c.fillStyle = night ? '#120b08' : '#e9dfcf'; c.fillRect(0, 0, 480, 270);
        c.fillStyle = night ? '#1c120c' : '#d9cbb4'; for (let k = 0; k < 30; k++) c.fillRect((k * 71) % 480, (k * 37) % 230, 40, 2);
        for (const m of s.marks) {
          const ax = s.o === 1 ? Math.sin(T * 2 + m.seed) * 10 : 0, ay = s.o === 1 ? Math.cos(T * 1.6 + m.seed) * 6 : 0;
          const im = pictos[m.k]; if (!im.complete) continue;
          c.save(); c.filter = night ? 'sepia(1) saturate(6) hue-rotate(-20deg) brightness(1.3) drop-shadow(0 0 6px #FF8A3D)' : 'sepia(1) saturate(4) hue-rotate(-25deg) brightness(.55)';
          c.drawImage(im, m.x + ax - 24, m.y + ay - 26, 48, 52); c.restore();
        }
        if (!s.marks.length) { c.fillStyle = night ? '#FFD43B' : '#6b4a30'; c.font = '600 14px Manrope'; c.fillText('Cliquez sur la paroi pour y laisser une trace', 90, 140); }
        // échelle
        c.strokeStyle = night ? '#5a4030' : '#8a6a48'; c.lineWidth = 4; c.beginPath(); c.moveTo(400, 270); c.lineTo(420, 60); c.moveTo(436, 270); c.lineTo(456, 60); for (let y = 250; y > 70; y -= 30) { const k = (270 - y) / 210 * 20; c.moveTo(400 + k, y); c.lineTo(436 + k, y); } c.stroke();
        visitor(c, 432, 150 + Math.sin(T) * 4, 1, night ? '#E9EFEC' : '#2F4B4F');
      },
      click(s, x, y) { s.marks.push({ x, y, k: (s.marks.length * 3) % pictos.length, seed: R() * 9 }); if (s.marks.length > 14) s.marks.shift(); blip(300 + y, .25, 'triangle', (x - 240) / 240); },
      opt(s) { blip([392, 523, 262][s.o], .4, 'triangle'); }
    }
  };

  function gloss(c) {
    const g = c.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, 'rgba(255,255,255,.09)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 480, 120);
    const v = c.createRadialGradient(240, 135, 120, 240, 135, 300); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
    c.fillStyle = v; c.fillRect(0, 0, 480, 270);
  }
  $$('.idea').forEach(card => {
    const k = card.dataset.idea, sc = scenes[k], cv = $('canvas', card), c = cv.getContext('2d'), s = { o: 0 };
    let visible = false; sc.init(s);
    new IntersectionObserver(e => visible = e[0].isIntersecting).observe(cv);
    $$('.opts button', card).forEach(b => b.onclick = () => { s.o = +b.dataset.o; $$('.opts button', card).forEach(x => x.classList.toggle('on', x === b)); sc.opt?.(s); });
    cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * 480 / r.width, y = (e.clientY - r.top) * 270 / r.height; sc.click ? sc.click(s, x, y) : blip(400 + R() * 400, .2, 'sine', (x - 240) / 240); });
    (function loop(t) { requestAnimationFrame(loop); if (visible) { sc.draw(c, s, t / 1000); gloss(c); } })(0);
  });
})();
})();
