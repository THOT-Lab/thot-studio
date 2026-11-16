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
if (HAS_INTERNAL) {
  $('#internal-link').hidden = false;
  $('#notes').innerHTML = (window.NOTES || []).map(n => `<div><b>${esc(n.t)}</b>${esc(n.x)}</div>`).join('');
} else $('#interne').remove();
function showPane(name) {
  $$('[data-itab]').forEach(b => b.classList.toggle('on', b.dataset.itab === name));
  $$('[data-ipane]').forEach(p => p.hidden = p.dataset.ipane !== name);
}
function route() {
  const internal = HAS_INTERNAL && location.hash.startsWith('#interne');
  document.body.classList.toggle('internal-view', internal);
  if (!internal) $('#p-dialog')?.open && $('#p-dialog').close();
  if (internal) { showPane(location.hash === '#interne/appels' ? 'appels' : 'prospects'); scrollTo(0, 0); }
}
$$('[data-itab]').forEach(b => b.onclick = () => { location.hash = b.dataset.itab === 'appels' ? '#interne/appels' : '#interne'; });
addEventListener('hashchange', route); route();

/* appels d'offres */
(function appels() {
  if (!HAS_INTERNAL) return;
  const A = window.APPELS?.appels || [], body = $('#ao-body');
  const today = new Date('2026-11-16'), fmt = d => new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const fill = (sel, key) => [...new Set(A.map(a => a[key]).filter(Boolean))].sort().forEach(v => sel.add(new Option(v, v)));
  fill($('#ao-type'), 'type'); fill($('#ao-zone'), 'zone');
  if (window.APPELS?.maj) $('#ao-maj').textContent = `${A.length} appels recensés · mise à jour du ${fmt(window.APPELS.maj)} · vérifiez toujours la date sur la page officielle.`;
  function render() {
    const q = $('#ao-q').value.toLowerCase(), t = $('#ao-type').value, z = $('#ao-zone').value;
    body.innerHTML = A.filter(a => (!t || a.type === t) && (!z || a.zone === z) && (a.titre + ' ' + a.organisme + ' ' + a.resume).toLowerCase().includes(q)).map(a => {
      const days = a.date ? (new Date(a.date) - today) / 864e5 : null;
      const cls = a.date ? (days < 30 ? 'd soon' : 'd') : 'd na';
      return `<tr><td class="${cls}">${a.date ? fmt(a.date) : esc(a.date_txt || 'à préciser')}${a.date && a.date_txt ? `<p>${esc(a.date_txt)}</p>` : ''}</td>
        <td><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.titre)} ↗</a><br><small>${esc(a.organisme)}</small><p>${esc(a.resume)}</p></td>
        <td class="hide-m">${esc(a.type)}</td><td class="hide-m">${esc(a.zone)}</td></tr>`;
    }).join('') || '<tr><td colspan="4" style="color:var(--muted)">Aucun appel ne correspond.</td></tr>';
  }
  ['#ao-q', '#ao-type', '#ao-zone'].forEach(s => $(s).addEventListener('input', render));
  render();
})();

const P = window.PROSPECTS?.groupes || [];
if (HAS_INTERNAL) {
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'site'; } };
$('#pgroups').innerHTML = P.map((g, i) => `
  <button class="pgroup${g.id === 'prioritaires' ? ' hot' : ''}" data-g="${i}">
    <span class="n">${g.items.length}</span><b>${esc(g.titre)}</b>
    <span>${esc(g.items.slice(0, 3).map(x => x.nom.split(' (')[0]).join(' · '))}…</span>
  </button>`).join('');
const pd = $('#p-dialog');
$$('.pgroup').forEach(b => b.onclick = () => {
  const g = P[b.dataset.g];
  pd.innerHTML = `<button class="close" data-close aria-label="Fermer">×</button>
    <div class="eyebrow">${g.items.length} prospects</div><h3>${esc(g.titre)}</h3>
    <input type="search" placeholder="Filtrer par nom ou ville…">
    <ol>${g.items.map(x => `<li data-s="${esc((x.nom + ' ' + x.ville).toLowerCase())}">
      <b>${esc(x.nom)} <span class="v">· ${esc(x.ville)}</span></b>
      <p>${esc(x.pourquoi)}</p>
      <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(host(x.url))} ↗</a></li>`).join('')}</ol>`;
  $('input', pd).oninput = e => { const q = e.target.value.toLowerCase(); $$('li', pd).forEach(li => li.hidden = !li.dataset.s.includes(q)); };
  pd.showModal();
});
}

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

/* ---------- prototype multi-écrans + son spatialisé ---------- */
(function proto() {
  const cv = $('#proto'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const N = 6, R = 3.2, SH = 2.1, SCW = 2 * R * Math.sin(Math.PI / N) * .92, TW = 192, TH = 120;
  let mode = 'foret', yaw = .3, drag = null, visible = false, flash = 0, hover = -1;
  const pictos = ['p009', 'p040', 'p104', 'p157', 'p180', 'p226', 'p277', 'p312'].map(n => { const i = new Image(); i.src = `assets/pictos/${n}.png`; return i; });
  const photos = ['salle-ocre', 'tepuy', 'roche', 'main-rupestre'].map(n => { const i = new Image(); i.src = `assets/img/${n}.webp`; return i; });
  const screens = [...Array(N)].map((_, i) => {
    const a = i / N * Math.PI * 2, c = document.createElement('canvas'); c.width = TW; c.height = TH;
    return { a, c, x: Math.cos(a) * R, z: Math.sin(a) * R, pulse: 0, rings: [] };
  });
  new IntersectionObserver(e => visible = e[0].isIntersecting).observe(cv);

  // contenu projeté sur chaque écran
  function paint(s, i, T) {
    const c = s.c.getContext('2d'), ph = T * .3 + i * 1.7;
    if (mode === 'foret') {
      const im = photos[(i + ((T / 6) | 0)) % 4];
      if (im.complete) { const sx = ((ph * 20) % (im.width * .4)); c.drawImage(im, sx, im.height * .15, im.width * .55, im.height * .55, 0, 0, TW, TH); }
      c.fillStyle = `rgba(30,70,40,${.25 + .15 * Math.sin(ph)})`; c.fillRect(0, 0, TW, TH);
    } else if (mode === 'orage') {
      const g = c.createLinearGradient(0, 0, 0, TH); g.addColorStop(0, '#0d1626'); g.addColorStop(1, '#273445'); c.fillStyle = g; c.fillRect(0, 0, TW, TH);
      for (let k = 0; k < 40; k++) { c.fillStyle = 'rgba(160,190,220,.35)'; c.fillRect((k * 37 + T * 300) % TW, (k * 53 + T * 900) % TH, 1, 8); }
      if (s.bolt > 0) { c.strokeStyle = `rgba(255,255,240,${s.bolt})`; c.lineWidth = 3; c.beginPath(); let x = TW * (.3 + .4 * noise(i, T)); c.moveTo(x, 0); for (let y = 0; y < TH; y += 14) { x += (Math.random() - .5) * 30; c.lineTo(x, y); } c.stroke(); c.fillStyle = `rgba(220,230,255,${s.bolt * .4})`; c.fillRect(0, 0, TW, TH); s.bolt -= .06; }
    } else if (mode === 'pictos') {
      c.fillStyle = '#7a4a30'; c.fillRect(0, 0, TW, TH);
      c.fillStyle = 'rgba(0,0,0,.15)'; for (let k = 0; k < 6; k++) c.fillRect(0, (k * 23 + i * 7) % TH, TW, 4);
      for (let k = 0; k < 4; k++) {
        const im = pictos[(i * 3 + k) % pictos.length]; if (!im.complete) continue;
        const sz = 36 + 10 * Math.sin(ph + k), x = (k * 52 + T * 18 * (k % 2 ? 1 : -1) + 400) % (TW + 40) - 20, y = 20 + 26 * Math.sin(ph * .7 + k);
        c.save(); c.globalAlpha = .9; c.filter = 'sepia(1) saturate(4) hue-rotate(-20deg) brightness(.7)'; c.drawImage(im, x, y, sz, sz * 1.07); c.restore();
      }
    } else { // océan
      const g = c.createLinearGradient(0, 0, 0, TH); g.addColorStop(0, '#0a3a4a'); g.addColorStop(1, '#021018'); c.fillStyle = g; c.fillRect(0, 0, TW, TH);
      for (let k = 0; k < 7; k++) { c.strokeStyle = `rgba(165,213,185,${.12 + k * .03})`; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= TW; x += 6) c.lineTo(x, 20 + k * 14 + Math.sin(x * .05 + T * 1.5 + k + i) * 5); c.stroke(); }
      const fx = (T * 30 + i * 60) % (TW + 60) - 30; c.fillStyle = '#F3C27E'; c.beginPath(); c.ellipse(fx, 70 + 10 * Math.sin(T + i), 10, 4, 0, 0, 6.28); c.fill();
    }
    if (s.pulse > 0) { c.fillStyle = `rgba(243,194,126,${s.pulse * .5})`; c.fillRect(0, 0, TW, TH); }
  }

  // projection perspective
  const cam = { d: 8.4, h: 3.4, f: 980 };
  function P(x, y, z) {
    const ca = Math.cos(yaw), sa = Math.sin(yaw);
    let X = x * ca - z * sa, Z = x * sa + z * ca;
    Z += cam.d; const Y = y - cam.h, pitch = .33, cp = Math.cos(pitch), sp = Math.sin(pitch);
    const Y2 = Y * cp + Z * sp, Z2 = -Y * sp + Z * cp;
    return { x: W / 2 + X / Z2 * cam.f, y: H * .52 - Y2 / Z2 * cam.f, z: Z2 };
  }

  function drawScreen(s, i, T) {
    const tx = -Math.sin(s.a), tz = Math.cos(s.a); // tangente
    const x0 = s.x - tx * SCW / 2, z0 = s.z - tz * SCW / 2, x1 = s.x + tx * SCW / 2, z1 = s.z + tz * SCW / 2;
    const ca = P(s.x, 1, s.z), facing = ca.z > cam.d - .4; // écrans du fond : face visible
    const strips = 28;
    for (let k = 0; k < strips; k++) {
      const u0 = k / strips, u1 = (k + 1) / strips;
      const b0 = P(x0 + (x1 - x0) * u0, .25, z0 + (z1 - z0) * u0), b1 = P(x0 + (x1 - x0) * u1, .25, z0 + (z1 - z0) * u1);
      const t0 = P(x0 + (x1 - x0) * u0, .25 + SH, z0 + (z1 - z0) * u0);
      const w = b1.x - b0.x, top = t0.y, h = b0.y - t0.y;
      if (facing) { ctx.globalAlpha = 1; ctx.drawImage(s.c, (1 - u1) * TW, 0, TW / strips + .5, TH, b0.x, top, w + (w > 0 ? .8 : -.8), h); }
      else { ctx.globalAlpha = .35; ctx.fillStyle = '#1a2524'; ctx.fillRect(b0.x, top, w, h); }
    }
    ctx.globalAlpha = 1;
    // halo projeté au sol
    if (facing) { const f = P(s.x * .55, 0, s.z * .55); const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 160); g.addColorStop(0, `rgba(243,194,126,${.10 + s.pulse * .3})`); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(f.x - 160, f.y - 80, 320, 160); }
    s.hit = facing ? [P(x0, .25, z0), P(x1, .25 + SH, z1)] : null;
    // ondes sonores
    s.rings = s.rings.filter(r => (r.r += .035) < 2.6);
    for (const r of s.rings) {
      ctx.strokeStyle = `rgba(165,213,185,${(1 - r.r / 2.6) * .7})`; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k <= 24; k++) { const a = s.a + Math.PI + (k / 24 - .5) * 1.4, p = P(s.x + Math.cos(a) * r.r, .6, s.z + Math.sin(a) * r.r); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }
    s.pulse *= .94;
  }

  function drawPerson(T) {
    const f = P(0, 0, 0), hd = P(0, 1.7, 0), sc = (f.y - hd.y) / 1.7, bob = Math.sin(T * 2) * 2;
    const turn = Math.sin(T * .5) * .4;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(f.x, f.y, sc * .5, sc * .14, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#E9EFEC'; ctx.lineCap = 'round'; ctx.lineWidth = sc * .16;
    const hip = { x: f.x, y: f.y - sc * .85 + bob }, sh = { x: f.x, y: f.y - sc * 1.35 + bob };
    ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(f.x - sc * .15, f.y); ctx.moveTo(hip.x, hip.y); ctx.lineTo(f.x + sc * .15, f.y); ctx.stroke();
    ctx.strokeStyle = '#D0793F'; ctx.lineWidth = sc * .3; ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(sh.x, sh.y); ctx.stroke();
    ctx.strokeStyle = '#E9EFEC'; ctx.lineWidth = sc * .12; const wave = Math.sin(T * 3) * .3;
    ctx.beginPath(); ctx.moveTo(sh.x, sh.y + 4); ctx.lineTo(sh.x - sc * .35, sh.y - sc * (.25 + wave)); ctx.moveTo(sh.x, sh.y + 4); ctx.lineTo(sh.x + sc * .38, sh.y + sc * .2); ctx.stroke();
    ctx.fillStyle = '#E9EFEC'; ctx.beginPath(); ctx.arc(sh.x + turn * 6, sh.y - sc * .3, sc * .2, 0, 6.28); ctx.fill();
    // casque audio
    ctx.strokeStyle = '#A5D5B9'; ctx.lineWidth = sc * .05; ctx.beginPath(); ctx.arc(sh.x + turn * 6, sh.y - sc * .3, sc * .24, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }

  function frame(time) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const T = time / 1000;
    if (!drag) yaw += .0018;
    if (mode === 'orage' && Math.random() < .012) { const s = screens[(Math.random() * N) | 0]; s.bolt = 1; s.pulse = .6; flash = 1; sound.thunder(screens.indexOf(s)); }
    screens.forEach((s, i) => paint(s, i, T));
    // fond
    const g = ctx.createRadialGradient(W / 2, H * .6, 50, W / 2, H * .6, W * .7); g.addColorStop(0, '#13201e'); g.addColorStop(1, '#050908');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (flash > 0) { ctx.fillStyle = `rgba(200,215,255,${flash * .18})`; ctx.fillRect(0, 0, W, H); flash -= .05; }
    // sol : cercle
    ctx.strokeStyle = 'rgba(165,213,185,.18)'; ctx.lineWidth = 1.5;
    for (const r of [1, 2, 3.2]) { ctx.beginPath(); for (let k = 0; k <= 64; k++) { const a = k / 64 * 6.283, p = P(Math.cos(a) * r, 0, Math.sin(a) * r); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); }
    // tri par profondeur : du plus loin au plus proche
    const items = screens.map((s, i) => ({ z: P(s.x, 1, s.z).z, fn: () => drawScreen(s, i, T) }));
    items.push({ z: P(0, 1, 0).z, fn: () => drawPerson(T) });
    items.sort((a, b) => b.z - a.z).forEach(it => it.fn());
    sound.orient(yaw);
  }
  requestAnimationFrame(frame);

  // interactions
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, yaw, moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; yaw = drag.yaw - dx * .006; });
  cv.addEventListener('pointerup', e => {
    const moved = drag?.moved; drag = null; if (moved) return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    screens.forEach((s, i) => { if (!s.hit) return; const [a, b] = s.hit; if (x > Math.min(a.x, b.x) && x < Math.max(a.x, b.x) && y > b.y && y < a.y) { s.pulse = 1; s.rings.push({ r: 0 }); sound.ping(i); } });
  });
  $$('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; $$('[data-mode]').forEach(x => x.classList.toggle('on', x === b)); sound.setMode(mode); });

  /* ----- son : WebAudio, une source HRTF par écran ----- */
  const sound = (() => {
    let ac, master, beds = [], on = false, timer;
    const noiseBuf = () => { const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
    function panner(i) { const p = ac.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.5; const s = screens[i]; p.positionX.value = s.x; p.positionY.value = 1; p.positionZ.value = s.z; p.connect(master); return p; }
    function init() {
      ac = new AudioContext(); master = ac.createGain(); master.gain.value = .8; master.connect(ac.destination);
      screens.forEach((s, i) => {
        const src = ac.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400 + i * 260; f.Q.value = 1.2;
        const g = ac.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(panner(i)); src.start();
        beds.push({ f, g });
      });
    }
    function chirp(i, base) { const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 1.8, t + .08); o.frequency.exponentialRampToValueAtTime(base * 1.1, t + .16); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .22); o.connect(g).connect(panner(i)); o.start(); o.stop(t + .25); }
    function tone(i, f, dur, type = 'sine', vol = .3) { const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(panner(i)); o.start(); o.stop(t + dur); }
    function boom(i, dur = 2.2) { const s = ac.createBufferSource(); s.buffer = noiseBuf(); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; const g = ac.createGain(), t = ac.currentTime; g.gain.setValueAtTime(1.2, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f).connect(g).connect(panner(i)); s.start(); s.stop(t + dur); }
    function setMode(m) {
      if (!on) return;
      const lv = { foret: [.05, 1800], orage: [.12, 500], pictos: [.02, 900], ocean: [.1, 350] }[m];
      beds.forEach((b, i) => { b.g.gain.setTargetAtTime(lv[0] * (.6 + .4 * Math.sin(i)), ac.currentTime, .4); b.f.frequency.setTargetAtTime(lv[1] + i * 120, ac.currentTime, .4); });
      clearInterval(timer);
      timer = setInterval(() => { // événements qui sautent d'un écran à l'autre
        const i = (Math.random() * N) | 0; screens[i].rings.push({ r: 0 }); screens[i].pulse = .35;
        if (mode === 'foret') chirp(i, 1800 + Math.random() * 1600);
        else if (mode === 'pictos') tone(i, [196, 220, 262, 294, 330][(Math.random() * 5) | 0], 1.4, 'triangle', .22);
        else if (mode === 'ocean') tone(i, 90 + Math.random() * 40, 2.5, 'sine', .18);
      }, mode === 'foret' ? 650 : 1300);
    }
    return {
      toggle() { if (!ac) init(); on = !on; if (on) { ac.resume(); master.gain.value = .8; setMode(mode); } else { master.gain.value = 0; clearInterval(timer); } return on; },
      ping(i) { if (!on) return; mode === 'orage' ? boom(i, 1.2) : mode === 'pictos' ? tone(i, 392, 1.6, 'triangle') : chirp(i, 2400); },
      thunder(i) { if (on) setTimeout(() => boom(i), 250 + Math.random() * 600); },
      setMode,
      orient(a) { if (!ac) return; const l = ac.listener, fx = Math.sin(a), fz = -Math.cos(a); if (l.forwardX) { l.forwardX.value = fx; l.forwardZ.value = fz; } else l.setOrientation(fx, 0, fz, 0, 1, 0); }
    };
  })();
  $('#p-sound').onclick = e => { const on = sound.toggle(); e.target.textContent = on ? '🔊 Son activé' : '🔈 Activer le son'; };
})();
})();
