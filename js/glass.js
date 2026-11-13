/* Mesin liquid glass.
   - Semua .glass: cahaya tepi dan kilau mengikuti pointer, efek tekan.
   - .glass[data-refract]: refraksi tepi sungguhan di Chromium. glass.js menggambar peta pembelokan
     (canvas) sesuai ukuran elemen, lalu memasangnya ke filter SVG yang dipakai backdrop-filter: url(#...).
     Safari dan Firefox belum mendukung SVG di backdrop-filter, jadi mereka mendapat kaca blur biasa dari CSS.
   Atribut opsional: data-bezel (px, tebal lengkung tepi), data-strength (0-2), data-chroma="0" untuk mematikan
   pemisahan warna di tepi. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var ua = navigator.userAgent;
  var chromium = /(Chrome|Chromium|Edg)\//.test(ua) && !/(CriOS|FxiOS|iPhone|iPad|iPod)/.test(ua);
  var reducedTransparency = window.matchMedia && matchMedia('(prefers-reduced-transparency: reduce)').matches;
  // Di layar sentuh refraksi dimatikan: filter SVG pada backdrop-filter dihitung ulang tiap frame scroll dan berat untuk HP.
  var touchOnly = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var canRefract = chromium && !reducedTransparency && !touchOnly && window.CSS && CSS.supports('backdrop-filter', 'blur(1px)');
  if (canRefract) document.documentElement.classList.add('lg-refract');

  var defs;
  function ensureDefs() {
    if (defs) return defs;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    defs = document.createElementNS(NS, 'defs');
    // Filter identitas: dipakai sebagai nilai awal supaya backdrop-filter tetap valid sebelum peta siap
    var id = document.createElementNS(NS, 'filter');
    id.id = 'lg-id';
    var off = document.createElementNS(NS, 'feOffset');
    off.setAttribute('dx', '0');
    off.setAttribute('dy', '0');
    id.appendChild(off);
    defs.appendChild(id);
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  }

  var mapCache = new Map();
  // Peta pembelokan: tiap piksel menyimpan arah dan besar geseran. Di tepi (lebar bezel) geseran besar menuju
  // ke dalam, di tengah nol, sehingga isi di belakang tampak melengkung di tepi kaca seperti lensa tebal.
  function makeMap(w, h, radius, bezel, power) {
    var key = [w, h, radius, bezel, power].join('/');
    if (mapCache.has(key)) return mapCache.get(key);
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(w, h);
    var d = img.data;
    var hw = w / 2, hh = h / 2, rr = Math.min(radius, hw, hh);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var dx = x + 0.5 - hw, dy = y + 0.5 - hh;
        var qx = Math.abs(dx) - (hw - rr), qy = Math.abs(dy) - (hh - rr);
        var ox = Math.max(qx, 0), oy = Math.max(qy, 0);
        var outside = Math.hypot(ox, oy);
        var depth = -(outside + Math.min(Math.max(qx, qy), 0) - rr); // jarak dari tepi, positif di dalam
        var vx = 0, vy = 0;
        if (depth > 0 && depth < bezel) {
          var mag = Math.pow(1 - depth / bezel, power);
          var nx, ny;
          if (outside > 0) { nx = Math.sign(dx) * ox / outside; ny = Math.sign(dy) * oy / outside; }
          else if (qx > qy) { nx = Math.sign(dx); ny = 0; }
          else { nx = 0; ny = Math.sign(dy); }
          vx = -nx * mag;
          vy = -ny * mag;
        }
        var i = (y * w + x) * 4;
        d[i] = 128 + vx * 127;
        d[i + 1] = 128 + vy * 127;
        d[i + 2] = 128;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    var url = c.toDataURL('image/png');
    if (mapCache.size > 60) mapCache.clear();
    mapCache.set(key, url);
    return url;
  }

  var channels = [
    ['R', 1.08, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
    ['G', 1, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
    ['B', 0.92, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'],
  ];

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  var counter = 0;
  function build(node) {
    var w = Math.round(node.offsetWidth), h = Math.round(node.offsetHeight);
    if (w < 8 || h < 8) return;
    var style = getComputedStyle(node);
    var radius = parseFloat(style.getPropertyValue('--lg-radius')) || parseFloat(style.borderTopLeftRadius) || h / 2;
    var bezel = parseFloat(node.dataset.bezel) || Math.min(Math.min(w, h) * 0.45, 22);
    var strength = node.dataset.strength ? parseFloat(node.dataset.strength) : 1;
    var chroma = node.dataset.chroma !== '0';
    var scale = Math.round(bezel * 1.7 * strength * 10) / 10;
    var url = makeMap(w, h, radius, bezel, 2.2);
    var id = node.dataset.lgId || 'lg-' + (++counter);
    node.dataset.lgId = id;
    var old = document.getElementById(id);
    if (old) old.remove();
    var f = el('filter', { id: id, x: '0', y: '0', width: String(w), height: String(h), filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' });
    f.appendChild(el('feImage', { href: url, x: '0', y: '0', width: String(w), height: String(h), preserveAspectRatio: 'none', result: 'map' }));
    if (chroma) {
      channels.forEach(function (ch) {
        f.appendChild(el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: String(scale * ch[1]), xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + ch[0] }));
        f.appendChild(el('feColorMatrix', { in: 'd' + ch[0], type: 'matrix', values: ch[2], result: 'c' + ch[0] }));
      });
      f.appendChild(el('feBlend', { in: 'cR', in2: 'cG', mode: 'screen', result: 'rg' }));
      f.appendChild(el('feBlend', { in: 'rg', in2: 'cB', mode: 'screen' }));
    } else {
      f.appendChild(el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: String(scale), xChannelSelector: 'R', yChannelSelector: 'G' }));
    }
    ensureDefs().appendChild(f);
    node.style.setProperty('--lg-filter', 'url(#' + id + ')');
    node.setAttribute('data-lg', '');
  }

  var pending = new Set();
  var raf = 0;
  function schedule(node) {
    pending.add(node);
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      pending.forEach(build);
      pending.clear();
    });
  }
  var ro = canRefract && 'ResizeObserver' in window ? new ResizeObserver(function (entries) {
    entries.forEach(function (e) { schedule(e.target); });
  }) : null;

  function bindPointer(node) {
    node.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = node.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      node.style.setProperty('--mx', x + 'px');
      node.style.setProperty('--my', y + 'px');
      var angle = Math.atan2(y - r.height / 2, x - r.width / 2) * 180 / Math.PI + 90;
      node.style.setProperty('--lg-angle', angle.toFixed(1) + 'deg');
    }, { passive: true });
    node.addEventListener('pointerleave', function () {
      node.style.removeProperty('--lg-angle');
      node.classList.remove('is-pressed');
    });
    var press = function () { node.classList.add('is-pressed'); };
    var release = function () { node.classList.remove('is-pressed'); };
    if (node.matches('a, button, [data-press]')) {
      node.addEventListener('pointerdown', press);
      node.addEventListener('pointerup', release);
      node.addEventListener('pointercancel', release);
    }
  }

  var seen = new WeakSet();
  function attach(root) {
    (root || document).querySelectorAll('.glass').forEach(function (node) {
      if (seen.has(node)) return;
      seen.add(node);
      bindPointer(node);
      if (ro && node.hasAttribute('data-refract')) ro.observe(node);
    });
  }

  window.LiquidGlass = { attach: attach, canRefract: canRefract };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { attach(); });
  else attach();
})();
