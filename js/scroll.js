/* Scroll-telling.
   - Satu loop requestAnimationFrame untuk semua objek. Loop menyala saat ada gerakan scroll dan berhenti sendiri saat diam,
     jadi tidak ada biaya saat halaman diam.
   - Nilai scroll dilembutkan dengan lerp berbasis waktu: objek mengikuti scroll dengan inersia halus di semua refresh rate.
   - Hanya properti translate, scale, dan opacity yang diubah (jalur compositor). Posisi elemen diukur sekali
     (saat muat, resize, font siap, atau isi berubah), tidak dibaca ulang tiap frame.
   - Scroll asli browser tidak dibajak. Di layar sentuh jumlah objek dan jarak gerak dikurangi.
   - Jika pengunjung memilih "kurangi gerakan", file ini tidak melakukan apa pun dan semua konten tampil apa adanya. */
(function () {
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var root = document.documentElement;
  var coarse = matchMedia('(pointer: coarse)').matches;
  var lite = coarse && (navigator.deviceMemory || 4) <= 3; // HP lawas: matikan ember dan parallax gambar
  var amp = coarse ? 0.6 : 1;
  var TAU = coarse ? 80 : 130; // konstanta waktu pelembutan (ms): makin besar makin "licin"

  var vh = innerHeight, maxScroll = 0;
  var target = scrollY, cur = target, running = false, last = 0;
  var items = [], seen = new WeakSet(), hero = null, embers = [], bar = null;

  function cl(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function docTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
  function f1(n) { return n.toFixed(1); }

  // Objek yang bergerak sesuai posisinya di layar. fade=false untuk elemen yang berisi kaca (opacity merusak backdrop-filter).
  var SPECS = [
    ['.sec__label, .sec h2, .sec__sub, .about__lead, .about__rest, .about__meta, .exp__head, .contact__note, .field', 'text'],
    ['.card', 'card'],
    ['.skillgroup', 'group'],
    ['.timeline > li', 'line'],
    ['.about__photo', 'photo']
  ];

  function scan() {
    SPECS.forEach(function (sp) {
      var list = document.querySelectorAll(sp[0]);
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (seen.has(el)) continue;
        seen.add(el);
        var it = { el: el, kind: sp[1], top: 0, h: 0, vis: false, last: '', fade: !el.querySelector('.glass'), col: 0, inner: null };
        if (it.kind === 'card') {
          it.col = Array.prototype.indexOf.call(el.parentNode.children, el) % 3;
          it.inner = el.querySelector('.card__media img, .card__media .ph');
        }
        if (it.kind === 'photo') it.inner = el.querySelector('img');
        items.push(it);
      }
    });
  }

  function measure() {
    vh = innerHeight;
    maxScroll = Math.max(0, root.scrollHeight - vh);
    items = items.filter(function (it) { return it.el.isConnected; });
    items.forEach(function (it) {
      it.vis = it.el.offsetParent !== null; // elemen di dalam section tersembunyi dilewati
      if (it.vis) { it.top = docTop(it.el); it.h = it.el.offsetHeight; }
      it.last = '';
    });
    if (hero) hero.H = Math.max(1, hero.sec.offsetHeight);
  }

  /* ---------- Hero: adegan menjauh saat di-scroll ---------- */
  function applyHero(s) {
    var H = hero.H;
    if (s > H * 1.15) { if (hero.gone) return; hero.gone = true; } else hero.gone = false;
    var p = cl(s / (H * 0.85));
    hero.img.style.translate = '0 ' + f1(s * 0.36) + 'px';
    hero.img.style.scale = (1 + p * 0.2).toFixed(4);
    hero.h1.style.translate = '0 ' + f1(-p * vh * 0.2 * amp) + 'px';
    hero.h1.style.opacity = (1 - cl((p - 0.12) / 0.55)).toFixed(3);
    hero.tag.style.translate = '0 ' + f1(-p * vh * 0.15 * amp) + 'px';
    hero.tag.style.opacity = (1 - cl((p - 0.05) / 0.45)).toFixed(3);
    hero.act.style.translate = '0 ' + f1(-p * vh * 0.09 * amp) + 'px'; // berisi kaca: hanya bergeser, tidak memudar
    if (hero.foot) hero.foot.style.opacity = (1 - cl(p * 3)).toFixed(3);
  }

  /* ---------- Ember: titik bara yang melayang searah scroll, kedalaman berbeda-beda ---------- */
  function buildEmbers() {
    if (lite) return;
    var n = coarse ? 7 : 16, box = document.createElement('div');
    box.className = 'fx-embers';
    box.setAttribute('aria-hidden', 'true');
    var seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    for (var i = 0; i < n; i++) {
      var d = 0.25 + rnd() * 0.75, el = document.createElement('i'), sz = 3 + d * 8;
      el.className = 'fx-ember';
      el.style.width = el.style.height = sz.toFixed(1) + 'px';
      el.style.left = (rnd() * 100).toFixed(1) + '%';
      embers.push({ el: el, base: rnd() * (vh + 120), ph: rnd() * 6.28, o: 0.3 + d * 0.5, sp: 0.1 + d * 0.5, sw: 6 + d * 18 });
      box.appendChild(el);
    }
    document.body.appendChild(box);
  }

  function applyEmbers(s) {
    var L = vh + 120;
    for (var i = 0; i < embers.length; i++) {
      var e = embers[i];
      var y = (((e.base - s * e.sp) % L) + L) % L; // 0..L, membungkus supaya tak pernah habis
      var edge = cl(Math.min(y, L - y) / 90);
      e.el.style.translate = f1(Math.sin(s * 0.0035 + e.ph) * e.sw) + 'px ' + f1(y - 60) + 'px';
      e.el.style.opacity = (e.o * edge).toFixed(3);
    }
  }

  /* ---------- Objek per bagian ---------- */
  function setItem(it, p, pm) {
    var e = easeOut(p), st = it.el.style, k = it.kind;
    if (k === 'text') {
      st.translate = '0 ' + f1((1 - e) * 34 * amp) + 'px';
      if (it.fade) st.opacity = e.toFixed(3);
    } else if (k === 'group') {
      st.translate = '0 ' + f1((1 - e) * 50 * amp) + 'px';
      st.scale = (0.95 + 0.05 * e).toFixed(4);
      if (it.fade) st.opacity = e.toFixed(3);
    } else if (k === 'card') {
      st.translate = '0 ' + f1((1 - e) * 90 * amp) + 'px';
      st.scale = (0.93 + 0.07 * e).toFixed(4); // kartu berisi kaca: tanpa opacity
      if (it.inner && !lite) it.inner.style.translate = '0 ' + f1((pm - 0.5) * -34 * amp) + 'px';
    } else if (k === 'line') {
      st.translate = '0 ' + f1((1 - e) * 26 * amp) + 'px';
      st.opacity = e.toFixed(3);
      st.setProperty('--d', e.toFixed(3)); // garis pemisah "digambar" dari kiri
    } else if (k === 'photo') {
      st.translate = '0 ' + f1((1 - e) * 60 * amp) + 'px';
      st.scale = (0.92 + 0.08 * e).toFixed(4);
      st.opacity = e.toFixed(3);
      if (it.inner && !lite) it.inner.style.translate = '0 ' + f1((pm - 0.5) * -40 * amp) + 'px';
    }
  }

  function apply(s) {
    var sc = Math.max(0, s);
    if (hero) applyHero(sc);
    applyEmbers(sc);
    if (bar) bar.style.scale = (maxScroll > 0 ? cl(sc / maxScroll) : 0).toFixed(4) + ' 1';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.vis) continue;
      var big = it.kind === 'card';
      var start = vh * (big ? 1.0 : 0.94), span = vh * (big ? 0.42 : 0.3);
      var ymin = it.top - maxScroll;                  // posisi terendah yang bisa dicapai saat scroll mentok
      var y1 = Math.max(start - span, ymin);          // titik "selesai": dijamin tercapai, jadi tak ada elemen yang setengah tampil
      var y0 = Math.max(start, y1 + span * 0.45);
      var y = it.top - s;
      var stag = big ? it.col * 0.12 : 0;
      var p = cl(((y0 - y) / (y0 - y1)) * (1 + stag) - stag);
      var pm = cl((y + it.h / 2) / vh, -0.2, 1.2);
      var key = Math.round(p * 300) + ':' + Math.round(pm * 120);
      if (key === it.last) continue;
      it.last = key;
      setItem(it, p, pm);
    }
  }

  /* ---------- Loop ---------- */
  function frame(t) {
    var dt = Math.min(64, t - last || 16);
    last = t;
    cur += (target - cur) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(target - cur) < 0.12) cur = target;
    apply(cur);
    if (cur !== target) requestAnimationFrame(frame); else running = false;
  }
  function kick() {
    target = scrollY;
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  }
  function refresh() { measure(); apply(cur); }

  function init() {
    root.classList.add('fx');
    bar = document.createElement('div');
    bar.className = 'fx-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var sec = document.querySelector('.hero');
    if (sec) {
      hero = { sec: sec, H: 1, gone: false, img: sec.querySelector('.hero__img'), h1: sec.querySelector('h1'), tag: sec.querySelector('.hero__tag'), act: sec.querySelector('.hero__actions'), foot: sec.querySelector('.hero__foot') };
      if (!hero.img || !hero.h1 || !hero.tag || !hero.act) hero = null;
    }
    buildEmbers();
    scan();
    measure();
    target = cur = scrollY;
    apply(cur);

    addEventListener('scroll', kick, { passive: true });
    var rt;
    addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { refresh(); kick(); }, 150); });
    addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

    // Isi halaman dibangun ulang (ganti bahasa, data dimuat): daftarkan elemen baru sebelum frame berikutnya digambar.
    var main = document.getElementById('main');
    if (main && window.MutationObserver) new MutationObserver(function () { scan(); refresh(); }).observe(main, { childList: true, subtree: true });
    if (window.ResizeObserver) {
      var q = 0;
      new ResizeObserver(function () { if (q) return; q = requestAnimationFrame(function () { q = 0; refresh(); }); }).observe(document.body);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
