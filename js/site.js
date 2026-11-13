/* Halaman publik: merender data portofolio (disuntikkan server di #seed-data) dan menjalankan interaksinya. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var data;
  try { data = JSON.parse($('#seed-data').textContent); } catch (e) { data = null; }

  var STR = {
    id: {
      skip: 'Lewati ke konten', back: 'Kembali ke atas', ctaProjects: 'Lihat proyek', ctaContact: 'Hubungi saya',
      copyEmail: 'Salin alamat email', copied: 'Email tersalin', copyFail: 'Gagal menyalin. Salin secara manual.',
      projectsTitle: 'Proyek', projectsSub: 'Karya yang sudah dirilis dan cerita di baliknya.',
      filter: 'Filter kategori', all: 'Semua', close: 'Tutup', demo: 'Buka demo', code: 'Lihat kode',
      aboutTitle: 'Tentang saya', skillsAria: 'Keahlian', cv: 'Unduh CV', photoOf: 'Foto ',
      expTitle: 'Pengalaman dan pendidikan', kindWork: 'Pengalaman kerja', kindEdu: 'Pendidikan', now: 'Sekarang',
      contactTitle: 'Hubungi saya', fName: 'Nama', fEmail: 'Email', fMsg: 'Pesan', send: 'Kirim pesan', sending: 'Mengirim...',
      ok: 'Pesan terkirim. Terima kasih, saya balas lewat email.',
      eName: 'Tulis nama kamu (minimal 2 huruf).', eEmail: 'Alamat email belum valid.', eMsg: 'Pesan minimal 10 karakter.',
      rate: 'Terlalu banyak pesan dari perangkat ini. Coba lagi nanti.', fail: 'Pesan belum terkirim. Periksa koneksi lalu coba lagi',
      loadErr: 'Data portofolio tidak bisa dimuat. Muat ulang halaman.', rights: 'Hak cipta',
      nav: { proyek: 'Proyek', tentang: 'Tentang', pengalaman: 'Pengalaman', kontak: 'Kontak' },
    },
    en: {
      skip: 'Skip to content', back: 'Back to top', ctaProjects: 'View projects', ctaContact: 'Contact me',
      copyEmail: 'Copy email address', copied: 'Email copied', copyFail: 'Could not copy. Please copy it manually.',
      projectsTitle: 'Projects', projectsSub: 'Released work and the story behind it.',
      filter: 'Filter by category', all: 'All', close: 'Close', demo: 'Open demo', code: 'View code',
      aboutTitle: 'About me', skillsAria: 'Skills', cv: 'Download CV', photoOf: 'Photo of ',
      expTitle: 'Experience and education', kindWork: 'Work', kindEdu: 'Education', now: 'Present',
      contactTitle: 'Get in touch', fName: 'Name', fEmail: 'Email', fMsg: 'Message', send: 'Send message', sending: 'Sending...',
      ok: 'Message sent. Thank you, I will reply by email.',
      eName: 'Please enter your name (at least 2 letters).', eEmail: 'That email address does not look valid.', eMsg: 'The message needs at least 10 characters.',
      rate: 'Too many messages from this device. Please try again later.', fail: 'The message was not sent. Check your connection and try again',
      loadErr: 'The portfolio data could not be loaded. Please reload the page.', rights: 'All rights reserved',
      nav: { proyek: 'Projects', tentang: 'About', pengalaman: 'Experience', kontak: 'Contact' },
    },
  };

  var ICON = {
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="3.2"/><path d="M15.5 8.5V7.2A3.2 3.2 0 0 0 12.3 4H7.2A3.2 3.2 0 0 0 4 7.2v5.1a3.2 3.2 0 0 0 3.2 3.2h1.3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5.5 12.5 4.2 4.2L18.5 7.8"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  };

  var lang = initialLang();
  var S = STR[lang];
  var category = 'all';
  var sectionIds = [];

  function initialLang() {
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q === 'id' || q === 'en') return q;
      var saved = localStorage.getItem('pf_lang');
      if (saved === 'id' || saved === 'en') return saved;
    } catch (e) { /* penyimpanan bisa dinonaktifkan: abaikan */ }
    return /^id\b/i.test(navigator.language || '') ? 'id' : 'en';
  }

  function t(o) { return (o && (o[lang] || o.id || o.en)) || ''; }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function safeUrl(u) { return /^(https?:\/\/|mailto:|\/uploads\/)/i.test(u || '') ? u : ''; }

  // Pembuat elemen: teks selalu lewat textContent, jadi isi dari admin tidak bisa menyisipkan HTML
  function h(tag, props) {
    var n = document.createElement(tag);
    for (var k in props || {}) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v; // hanya untuk ikon statis di atas
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (Array.isArray(c)) c.forEach(function (x) { if (x) n.append(x); });
      else if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
    }
    return n;
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); setTimeout(function () { el.hidden = true; }, 400); }, 2200);
  }

  /* ---------- Salin email ---------- */
  function copyText(text, btn) {
    var done = function () {
      toast(S.copied);
      if (btn) { btn.innerHTML = ICON.check; setTimeout(function () { btn.innerHTML = ICON.copy; }, 1600); }
    };
    var fallback = function () {
      var ta = h('textarea', { 'aria-hidden': 'true', tabindex: '-1', style: 'position:fixed;opacity:0' });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* abaikan */ }
      ta.remove();
      if (ok) done(); else toast(S.copyFail);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  function fillPill(box, email, plain) {
    box.textContent = '';
    if (!email) { box.hidden = true; return; }
    box.hidden = false;
    box.classList.toggle('pill--plain', !!plain);
    var btn = h('button', { type: 'button', class: 'pill__copy glass is-pressable', 'data-refract': '', 'data-bezel': '12', 'data-strength': '0.9', 'aria-label': S.copyEmail, html: ICON.copy });
    btn.addEventListener('click', function () { copyText(email, btn); });
    box.append(h('span', { class: 'pill__bg glass', 'data-refract': '', 'data-bezel': '16', 'aria-hidden': 'true' }), h('code', { text: email }), btn);
  }

  /* ---------- Bagian halaman ---------- */
  function renderHero() {
    var p = data.profile, st = data.settings;
    $('#brand-name').textContent = p.name;
    $('#brand').setAttribute('aria-label', S.back);
    $('#hero-title').textContent = t(p.headline) || p.name;
    $('#hero-tag').textContent = t(p.tagline);
    $('#hero-tag').hidden = !t(p.tagline);
    $('#hero-foot').textContent = t(st.footnote);
    $('#hero-foot').hidden = !t(st.footnote);
    fillPill($('#email-pill'), p.email, false);
    var hasProjects = data.projects.length > 0;
    var cta = $('#hero-cta');
    cta.textContent = hasProjects ? S.ctaProjects : S.ctaContact;
    cta.setAttribute('href', hasProjects ? '#proyek' : '#kontak');
    $('#top-cta').textContent = S.ctaContact;
  }

  function sectionHead(num, key, titleId, title, sub) {
    return [
      h('p', { class: 'sec__label', text: '/' + pad(num) + ' ' + S.nav[key].toLowerCase() }),
      h('h2', { id: titleId, text: title }),
      sub ? h('p', { class: 'sec__sub', text: sub }) : null,
    ];
  }

  var PH = [['#d2323f', '#5a1226'], ['#e0623f', '#4a1030'], ['#a82a50', '#2a0c24'], ['#c8402a', '#4a0f1a']];
  function placeholder(title, i) {
    var c = PH[i % PH.length];
    return h('div', { class: 'ph', style: '--ph-a:' + c[0] + ';--ph-b:' + c[1], 'aria-hidden': 'true' }, h('span', { text: (title || '?').trim().charAt(0).toUpperCase() }));
  }

  function chipList(tags, max) {
    if (!tags || !tags.length) return null;
    return h('ul', { class: 'chips', 'aria-label': 'Tag' }, tags.slice(0, max || 12).map(function (x) { return h('li', { class: 'chip', text: x }); }));
  }

  function renderProjects(num) {
    var sec = $('#proyek');
    var list = data.projects;
    sec.textContent = '';
    if (!list.length) { sec.hidden = true; return false; }
    sec.hidden = false;

    var cats = [];
    list.forEach(function (p) { if (p.category && cats.indexOf(p.category) < 0) cats.push(p.category); });
    cats = cats.slice(0, 5);
    if (category !== 'all' && cats.indexOf(category) < 0) category = 'all';

    var head = h('div', { class: 'sec__head' }, h('div', null, sectionHead(num, 'proyek', 'proyek-title', S.projectsTitle, S.projectsSub)));
    var grid = h('ul', { class: 'grid', id: 'project-grid' });

    if (cats.length > 1) {
      var seg = h('div', { class: 'seg seg--filter', role: 'group', 'aria-label': S.filter });
      seg.append(
        h('span', { class: 'seg__bg glass', 'data-refract': '', 'data-bezel': '12', 'aria-hidden': 'true' }),
        h('span', { class: 'seg__thumb glass', 'data-refract': '', 'data-bezel': '12', 'data-strength': '1.1', 'aria-hidden': 'true' })
      );
      [['all', S.all]].concat(cats.map(function (c) { return [c, c]; })).forEach(function (pair) {
        seg.append(h('button', {
          type: 'button', 'aria-pressed': String(pair[0] === category), text: pair[1], 'data-cat': pair[0],
          onclick: function () { category = pair[0]; $$('button', seg).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cat === category)); }); fillGrid(grid); placeThumb(seg); },
        }));
      });
      head.append(seg);
    }
    sec.append(h('div', { class: 'wrap' }, head, grid));
    fillGrid(grid);
    return true;
  }

  function fillGrid(grid) {
    grid.textContent = '';
    var shown = data.projects.filter(function (p) { return category === 'all' || p.category === category; });
    if (!shown.length) { grid.append(h('li', { class: 'state', text: '-' })); return; }
    var featuredDone = false;
    shown.forEach(function (p, i) {
      var feature = !featuredDone && p.featured && shown.length > 1;
      if (feature) featuredDone = true;
      var title = t(p.title);
      var media = h('div', { class: 'card__media' }, p.cover
        ? h('img', { src: p.cover, alt: '', width: '1200', height: '1500', loading: 'lazy', decoding: 'async' })
        : placeholder(title, i));
      var panel = h('div', { class: 'card__panel glass glass--lite' },
        h('div', { class: 'card__meta' }, p.category ? h('span', { text: p.category }) : null, p.year ? h('span', { text: p.year }) : null),
        h('h3', null, h('button', { type: 'button', class: 'card__open', 'aria-haspopup': 'dialog', text: title, onclick: function (e) { openSheet(p, i, e.currentTarget); } })),
        t(p.summary) ? h('p', { text: t(p.summary) }) : null,
        chipList(p.tags, 3));
      grid.append(h('li', { class: 'card' + (feature ? ' card--feature' : '') }, media, panel));
    });
    if (window.LiquidGlass) LiquidGlass.attach(grid);
  }

  function renderAbout(num) {
    var sec = $('#tentang'), p = data.profile;
    sec.textContent = '';
    var paras = t(p.bio).split(/\n{2,}/).map(function (x) { return x.trim(); }).filter(Boolean);
    var has = paras.length || data.skills.length || p.avatar;
    if (!has) { sec.hidden = true; return false; }
    sec.hidden = false;
    var text = h('div', null, sectionHead(num, 'tentang', 'tentang-title', S.aboutTitle));
    if (paras.length) {
      text.append(h('p', { class: 'about__lead', style: 'margin-top:28px', text: paras[0] }));
      if (paras.length > 1) text.append(h('div', { class: 'about__rest' }, paras.slice(1).map(function (x) { return h('p', { text: x }); })));
    }
    var meta = [];
    if (p.location) meta.push(h('span', { text: p.location }));
    var cv = safeUrl(p.resumeUrl);
    if (cv) meta.push(h('a', { class: 'tlink', href: cv, target: '_blank', rel: 'noopener noreferrer', text: S.cv }));
    if (meta.length) text.append(h('div', { class: 'about__meta' }, meta));
    var top = h('div', { class: 'about' }, text);
    if (p.avatar) top.append(h('div', { class: 'about__photo' }, h('img', { src: p.avatar, alt: S.photoOf + p.name, width: '800', height: '1000', loading: 'lazy', decoding: 'async' })));
    var wrap = h('div', { class: 'wrap' }, top);
    if (data.skills.length) {
      wrap.append(h('div', { class: 'skills', role: 'list', 'aria-label': S.skillsAria }, data.skills.map(function (g) {
        return h('div', { class: 'skillgroup', role: 'listitem' }, h('h3', { text: t(g.group) }), chipList(g.items, 24));
      })));
    }
    sec.append(wrap);
    return true;
  }

  function renderExperience(num) {
    var sec = $('#pengalaman');
    sec.textContent = '';
    if (!data.experience.length) { sec.hidden = true; return false; }
    sec.hidden = false;
    var items = data.experience.map(function (e) {
      var period = [e.from, e.current ? S.now : e.to].filter(Boolean).join(' - ');
      return h('li', null,
        h('time', { text: period }),
        h('div', null,
          h('span', { class: 'kind', text: e.kind === 'education' ? S.kindEdu : S.kindWork }),
          h('h3', { text: t(e.role) }),
          h('p', { class: 'org', text: e.org }),
          t(e.description) ? h('p', { text: t(e.description) }) : null));
    });
    sec.append(h('div', { class: 'wrap exp' },
      h('div', { class: 'exp__head' }, sectionHead(num, 'pengalaman', 'pengalaman-title', S.expTitle)),
      h('ul', { class: 'timeline' }, items)));
    return true;
  }

  function renderContact(num) {
    var sec = $('#kontak'), p = data.profile, st = data.settings;
    sec.textContent = '';
    var left = h('div', null, sectionHead(num, 'kontak', 'kontak-title', S.contactTitle));
    if (t(st.contactNote)) left.append(h('p', { class: 'contact__note', text: t(st.contactNote) }));
    var pill = h('div', { class: 'pill' });
    fillPill(pill, p.email, false);
    left.append(pill);
    var links = (st.social || []).filter(function (s) { return safeUrl(s.url); });
    if (links.length) left.append(h('ul', { class: 'social' }, links.map(function (s) {
      return h('li', null, h('a', { class: 'tlink', href: s.url, target: '_blank', rel: 'noopener noreferrer', text: s.label }));
    })));
    sec.append(h('div', { class: 'wrap contact' }, left, buildForm()));
  }

  function field(id, label, el, errText) {
    return h('div', { class: 'field' }, h('label', { for: id, text: label }), el, h('p', { class: 'err', id: id + '-err', hidden: true, text: errText }));
  }

  function buildForm() {
    var name = h('input', { id: 'f-name', name: 'name', type: 'text', autocomplete: 'name', required: true, 'aria-describedby': 'f-name-err' });
    var email = h('input', { id: 'f-email', name: 'email', type: 'email', autocomplete: 'email', required: true, 'aria-describedby': 'f-email-err' });
    var msg = h('textarea', { id: 'f-msg', name: 'message', required: true, 'aria-describedby': 'f-msg-err' });
    var btn = h('button', { type: 'submit', class: 'btn btn--solid', text: S.send });
    var status = h('p', { class: 'form__status', role: 'status', 'aria-live': 'polite' });
    var hp = h('div', { class: 'hp', 'aria-hidden': 'true' }, h('label', { text: 'Website' }, h('input', { name: 'website', tabindex: '-1', autocomplete: 'off' })));
    var form = h('form', { class: 'form', novalidate: true },
      field('f-name', S.fName, name, S.eName), field('f-email', S.fEmail, email, S.eEmail), field('f-msg', S.fMsg, msg, S.eMsg), hp, btn, status);

    function setErr(input, bad) {
      input.setAttribute('aria-invalid', String(bad));
      $('#' + input.id + '-err', form).hidden = !bad;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';
      status.className = 'form__status';
      var bad = {
        name: name.value.trim().length < 2,
        email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()),
        message: msg.value.trim().length < 10,
      };
      setErr(name, bad.name); setErr(email, bad.email); setErr(msg, bad.message);
      if (bad.name || bad.email || bad.message) { (bad.name ? name : bad.email ? email : msg).focus(); return; }
      btn.disabled = true;
      btn.textContent = S.sending;
      (function () {
        location.href = 'mailto:' + (data.profile.email || '') + '?subject=' + encodeURIComponent('Pesan dari portofolio') + '&body=' + encodeURIComponent(msg.value + '\n\n' + name.value + ' <' + email.value + '>');
        return Promise.resolve({ ok: true });
      })().then(function (r) {
        if (r.ok) { form.reset(); status.textContent = S.ok; status.className = 'form__status ok'; return; }
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 429) status.textContent = S.rate;
          else if (j.fields) { setErr(name, !!j.fields.name); setErr(email, !!j.fields.email); setErr(msg, !!j.fields.message); }
          else status.textContent = S.fail + (data.profile.email ? ': ' + data.profile.email : '') + '.';
          status.className = 'form__status bad';
        });
      }).catch(function () {
        status.textContent = S.fail + (data.profile.email ? ': ' + data.profile.email : '') + '.';
        status.className = 'form__status bad';
      }).then(function () { btn.disabled = false; btn.textContent = S.send; });
    });
    return form;
  }

  function renderFooter() {
    var st = data.settings, p = data.profile;
    var foot = $('#foot');
    foot.textContent = '';
    var links = (st.social || []).filter(function (s) { return safeUrl(s.url); });
    foot.append(h('div', { class: 'foot__in' },
      h('span', { text: '© ' + new Date().getFullYear() + ' ' + p.name + '. ' + S.rights + '.' }),
      links.length ? h('span', null, links.map(function (s, i) { return [i ? ' · ' : '', h('a', { class: 'tlink', href: s.url, target: '_blank', rel: 'noopener noreferrer', text: s.label })]; })) : null));
  }

  /* ---------- Jendela detail proyek ---------- */
  function openSheet(p, i, opener) {
    var sheet = $('#sheet');
    var title = t(p.title);
    var close = h('button', { type: 'button', class: 'sheet__close glass is-pressable', 'aria-label': S.close, html: ICON.close, 'data-refract': '', 'data-bezel': '14', onclick: function () { sheet.close(); } });
    var demo = safeUrl(p.demoUrl), repo = safeUrl(p.repoUrl);
    var actions = [];
    if (demo) actions.push(h('a', { class: 'btn btn--solid', href: demo, target: '_blank', rel: 'noopener noreferrer', text: S.demo }));
    if (repo) actions.push(h('a', { class: 'btn glass is-pressable', href: repo, target: '_blank', rel: 'noopener noreferrer', text: S.code }));
    sheet.textContent = '';
    sheet.append(h('div', { class: 'sheet__inner' },
      close,
      h('div', { class: 'sheet__media' }, p.cover ? h('img', { src: p.cover, alt: '', width: '1200', height: '1500', decoding: 'async' }) : placeholder(title, i)),
      h('div', { class: 'sheet__body' },
        h('div', { class: 'sheet__meta' }, p.category ? h('span', { text: p.category }) : null, p.year ? h('span', { text: p.year }) : null),
        h('h2', { id: 'sheet-title', text: title }),
        t(p.description) || t(p.summary) ? h('p', { class: 'sheet__desc', text: t(p.description) || t(p.summary) }) : null,
        chipList(p.tags, 12),
        actions.length ? h('div', { class: 'sheet__actions' }, actions) : null)));
    if (window.LiquidGlass) LiquidGlass.attach(sheet);
    sheet._opener = opener;
    sheet.showModal();
  }

  function bindSheet() {
    var sheet = $('#sheet');
    sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
    sheet.addEventListener('close', function () {
      sheet.textContent = '';
      if (sheet._opener && sheet._opener.focus) sheet._opener.focus();
    });
  }

  /* ---------- Header: nav, lensa, bahasa ---------- */
  var navLinks = [];
  function buildNav() {
    var nav = $('#nav');
    $$('a', nav).forEach(function (a) { a.remove(); });
    navLinks = sectionIds.map(function (id) {
      var a = h('a', { href: '#' + id, 'data-sec': id, text: S.nav[id] });
      nav.append(a);
      return a;
    });
    $('#top').setAttribute('aria-labelledby', 'hero-title');
  }

  function placeThumb(seg) {
    var thumb = $('.seg__thumb', seg);
    var btns = $$('button', seg);
    if (!thumb || !btns.length) return;
    var on = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || btns[0];
    thumb.style.width = on.offsetWidth + 'px';
    thumb.style.transform = 'translateX(' + (on.offsetLeft - 5) + 'px)';
  }

  var activeSec = null;
  function placeLens() {
    var lens = $('#lens');
    if (!navLinks.length) return;
    var on = navLinks.filter(function (a) { return a.dataset.sec === activeSec; })[0];
    navLinks.forEach(function (a) { if (a === on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    lens.style.width = navLinks[0].offsetWidth + 'px';
    if (!on) { lens.setAttribute('data-off', ''); return; }
    lens.removeAttribute('data-off');
    lens.style.transform = 'translateX(' + (on.offsetLeft - 5) + 'px)';
  }

  var spyQueued = false;
  function spy() {
    if (spyQueued) return;
    spyQueued = true;
    requestAnimationFrame(function () {
      spyQueued = false;
      var line = window.innerHeight * 0.4, cur = null;
      sectionIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el.hidden && el.getBoundingClientRect().top <= line) cur = id;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && sectionIds.length) cur = sectionIds[sectionIds.length - 1];
      if (cur !== activeSec) { activeSec = cur; placeLens(); }
    });
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    S = STR[lang];
    try { localStorage.setItem('pf_lang', lang); } catch (e) { /* abaikan */ }
    renderAll();
  }

  function renderChrome() {
    document.documentElement.lang = lang;
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    var title = t(data.settings.siteTitle) || data.profile.name;
    document.title = title;
    var meta = $('meta[name=description]');
    if (meta) meta.setAttribute('content', t(data.settings.siteDescription));
    $('.skip').textContent = S.skip;
  }

  function renderAll() {
    if (!data) {
      $('#main').append(h('p', { class: 'state', role: 'alert', style: 'margin:120px 24px', text: STR.id.loadErr + ' / ' + STR.en.loadErr }));
      return;
    }
    renderChrome();
    renderHero();
    var order = [];
    var n = 1;
    if (renderProjects(n)) { order.push('proyek'); n++; }
    if (renderAbout(n)) { order.push('tentang'); n++; }
    if (renderExperience(n)) { order.push('pengalaman'); n++; }
    renderContact(n);
    order.push('kontak');
    sectionIds = order;
    renderFooter();
    buildNav();
    if (window.LiquidGlass) LiquidGlass.attach();
    layout();
    spy();
  }

  function layout() {
    placeThumb($('#lang-seg'));
    $$('.seg--filter').forEach(placeThumb);
    placeLens();
  }

  function init() {
    if (data) {
      $$('[data-lang]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang); }); });
      bindSheet();
    }
    renderAll();
    window.addEventListener('scroll', spy, { passive: true });
    var rz;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { layout(); spy(); }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
