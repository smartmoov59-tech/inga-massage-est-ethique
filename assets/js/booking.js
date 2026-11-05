/* Inga Massage Est’Éthique — assistant de réservation 100 % statique
   Aucun serveur, aucune base de données, aucun abonnement : la demande est préparée dans la page,
   puis envoyée depuis le téléphone de la cliente (SMS / WhatsApp / e-mail) ou ajoutée à son agenda (.ics). */
(() => {
  'use strict';

  const PHONE_SMS = '+33781891151';
  const PHONE_WA = '33781891151';
  const MAIL = 'inga71210@gmail.com';
  const ADDRESS = '17 chemin de l’Adrech de Saint-Véran, 04000 Digne-les-Bains';
  const HOME_FEE = 20;
  const PACK = { 30: 90, 60: 180, 90: 240 };       // forfaits 3 séances (valables 3 mois)
  const OPEN_DAYS = new Set([2, 3, 5, 6, 0]);        // mardi, mercredi, vendredi, samedi, dimanche
  const OPEN_H = 10, CLOSE_H = 20, CLOSE_H_HOLIDAY = 19, LEAD_HOURS = 2;

  const app = document.querySelector('[data-booking]');
  if (!app) return;
  const $ = (s, c = app) => c.querySelector(s);
  const $$ = (s, c = app) => Array.from(c.querySelectorAll(s));

  /* ------------------------------------------------------------ données (lues dans la carte HTML) */
  const cats = [];
  document.querySelectorAll('[data-cat-name]').forEach((cat) => {
    const items = Array.from(cat.querySelectorAll('[data-item]')).map((li) => ({
      id: li.dataset.item,
      name: li.dataset.name,
      cat: cat.dataset.catName,
      opts: li.dataset.opts.split(',').map((s) => { const [m, p] = s.split(':').map(Number); return { min: m, price: p }; }),
    }));
    cats.push({ name: cat.dataset.catName, items });
  });
  const ITEMS = {};
  cats.forEach((c) => c.items.forEach((i) => { ITEMS[i.id] = i; }));

  /* ------------------------------------------------------------ outils */
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fmtDur = (m) => (m < 60 ? m + ' min' : m % 60 === 0 ? (m / 60) + ' h' : Math.floor(m / 60) + ' h ' + pad(m % 60));
  const fmtTime = (t) => Math.floor(t / 60) + 'h' + pad(t % 60);
  const longDate = (d) => DAYS[d.getDay()] + ' ' + d.getDate() + (d.getDate() === 1 ? 'er ' : ' ') + MONTHS[d.getMonth()] + ' ' + d.getFullYear();

  const holidayCache = {};
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  function holidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const set = new Set();
    [[1, 1], [5, 1], [5, 8], [7, 14], [8, 15], [11, 1], [11, 11], [12, 25]].forEach(([m, d]) => set.add(y + '-' + pad(m) + '-' + pad(d)));
    const e = easter(y);
    [1, 39, 50].forEach((n) => { const x = new Date(e); x.setDate(e.getDate() + n); set.add(iso(x)); });
    holidayCache[y] = set;
    return set;
  }

  function slotsFor(date, duration) {
    const hol = holidays(date.getFullYear()).has(iso(date));
    const open = OPEN_H * 60, close = (hol ? CLOSE_H_HOLIDAY : CLOSE_H) * 60;
    const limit = Date.now() + LEAD_HOURS * 3600 * 1000;
    const slots = [];
    for (let t = open; t + duration <= close; t += 30) {
      const dt = new Date(date); dt.setHours(Math.floor(t / 60), t % 60, 0, 0);
      if (dt.getTime() < limit) continue;
      slots.push(t);
    }
    return { slots, holiday: hol };
  }

  /* ------------------------------------------------------------ état */
  const state = { item: null, min: 0, pack: false, packPref: 0, home: false, address: '', date: null, time: null, name: '', phone: '', note: '' };
  let current = 1;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 120);
  let view = new Date(today.getFullYear(), today.getMonth(), 1);

  const els = {
    items: $('[data-items]'), durations: $('[data-durations]'), packWrap: $('[data-pack-wrap]'), pack: $('[data-pack]'), packTxt: $('[data-pack-txt]'),
    home: $('[data-home]'), addrWrap: $('[data-address-wrap]'), addr: $('#b-address'), cal: $('[data-cal]'), slots: $('[data-slots]'),
    name: $('#b-name'), phone: $('#b-phone'), note: $('#b-note'), err: $('[data-err]'), prev: $('[data-prev]'), next: $('[data-next]'),
    preview: $('[data-preview]'), sms: $('[data-send="sms"]'), wa: $('[data-send="wa"]'), mail: $('[data-send="mail"]'),
    copy: $('[data-copy]'), ics: $('[data-ics]'),
    t: { item: $('[data-t="item"]'), dur: $('[data-t="dur"]'), place: $('[data-t="place"]'), when: $('[data-t="when"]'), total: $('[data-t="total"]'), note: $('[data-t="note"]') },
  };

  /* ------------------------------------------------------------ rendu : soins */
  function renderItems() {
    els.items.innerHTML = cats.map((c) => (
      '<div class="bcat"><h4>' + c.name + '</h4><div class="bcat__list">' +
      c.items.map((i) => {
        const from = Math.min.apply(null, i.opts.map((o) => o.price));
        return '<label class="bitem"><input type="radio" name="b-item" value="' + i.id + '"><span><b>' + i.name + '</b><i>' + (i.opts.length > 1 ? 'dès ' : '') + from + ' €</i></span></label>';
      }).join('') + '</div></div>'
    )).join('');
    $$('input[name="b-item"]').forEach((r) => r.addEventListener('change', () => chooseItem(r.value)));
  }

  function chooseItem(id, preferredMin) {
    const it = ITEMS[id];
    if (!it) return;
    state.item = id;
    const radio = $('input[name="b-item"][value="' + id + '"]');
    if (radio) radio.checked = true;
    let min = preferredMin || (state.pack && state.packPref ? state.packPref : state.min);
    if (!it.opts.some((o) => o.min === min)) min = it.opts.length === 1 ? it.opts[0].min : 0;
    state.min = min;
    if (state.pack && !PACK[min]) state.pack = false;
    state.date = null; state.time = null;
    renderDurations();
    renderCal();
    renderSlots();
    update();
  }

  function renderDurations() {
    const it = ITEMS[state.item];
    if (!it) { els.durations.innerHTML = '<p class="bhelp">Choisissez d’abord un massage (étape 1).</p>'; els.packWrap.hidden = true; return; }
    els.durations.innerHTML = it.opts.map((o) => (
      '<label class="bopt"><input type="radio" name="b-dur" value="' + o.min + '"' + (o.min === state.min ? ' checked' : '') + '><span><b>' + fmtDur(o.min) + '</b><i>' + o.price + ' €</i></span></label>'
    )).join('');
    $$('input[name="b-dur"]').forEach((r) => r.addEventListener('change', () => {
      state.min = +r.value;
      if (state.pack && !PACK[state.min]) state.pack = false;
      state.date = null; state.time = null;
      renderCal(); renderSlots(); update();
    }));
  }

  /* ------------------------------------------------------------ rendu : calendrier & créneaux */
  function renderCal() {
    const y = view.getFullYear(), m = view.getMonth();
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const canPrev = new Date(y, m, 0) >= today;
    const canNext = new Date(y, m + 1, 1) <= maxDate;
    const dur = state.min || 60;
    let html = '<div class="cal__head"><span class="cal__title" aria-live="polite">' + MONTHS[m] + ' ' + y + '</span><div class="cal__nav">' +
      '<button class="round" type="button" data-cal-prev aria-label="Mois précédent"' + (canPrev ? '' : ' disabled') + '><svg style="transform:scaleX(-1)" viewBox="0 0 24 24"><use href="#i-arrow"/></svg></button>' +
      '<button class="round" type="button" data-cal-next aria-label="Mois suivant"' + (canNext ? '' : ' disabled') + '><svg viewBox="0 0 24 24"><use href="#i-arrow"/></svg></button></div></div>';
    html += '<div class="cal__grid" role="group" aria-label="Choisir un jour">';
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((d) => { html += '<span class="cal__dow" aria-hidden="true">' + d + '</span>'; });
    for (let i = 0; i < lead; i++) html += '<span class="cal__day is-empty" aria-hidden="true"></span>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const isToday = date.getTime() === today.getTime();
      let disabled = date < today || date > maxDate || !OPEN_DAYS.has(date.getDay());
      if (!disabled && isToday && !slotsFor(date, dur).slots.length) disabled = true;
      const hol = holidays(y).has(iso(date));
      const selected = state.date && iso(state.date) === iso(date);
      html += '<button type="button" class="cal__day' + (isToday ? ' is-today' : '') + (hol ? ' is-holiday' : '') + '" data-date="' + iso(date) + '"' +
        (disabled ? ' disabled' : '') + ' aria-pressed="' + (selected ? 'true' : 'false') + '" aria-label="' + longDate(date) + (hol ? ' (jour férié)' : '') + (disabled ? ', indisponible' : '') + '">' + d + '</button>';
    }
    html += '</div>';
    els.cal.innerHTML = html;
    $('[data-cal-prev]', els.cal).addEventListener('click', () => { view = new Date(y, m - 1, 1); renderCal(); });
    $('[data-cal-next]', els.cal).addEventListener('click', () => { view = new Date(y, m + 1, 1); renderCal(); });
    $$('.cal__day[data-date]', els.cal).forEach((b) => b.addEventListener('click', () => {
      const [yy, mm, dd] = b.dataset.date.split('-').map(Number);
      state.date = new Date(yy, mm - 1, dd);
      state.time = null;
      $$('.cal__day', els.cal).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderSlots(); update();
    }));
  }

  function renderSlots() {
    if (!state.date) { els.slots.innerHTML = '<p class="slots__msg">Choisissez un jour pour voir les heures possibles.</p>'; return; }
    const { slots, holiday } = slotsFor(state.date, state.min || 60);
    let html = '';
    if (holiday) html += '<p class="slots__msg slots__msg--warn">Jour férié : les horaires sont à confirmer avec Inga (fermeture possible dès 19 h).</p>';
    if (!slots.length) html += '<p class="slots__msg slots__msg--warn">Plus de créneau possible ce jour-là pour cette durée. Essayez un autre jour.</p>';
    html += slots.map((t) => '<button type="button" class="slot" data-t="' + t + '" aria-pressed="' + (state.time === t ? 'true' : 'false') + '">' + fmtTime(t) + '</button>').join('');
    els.slots.innerHTML = html;
    $$('.slot', els.slots).forEach((b) => b.addEventListener('click', () => {
      state.time = +b.dataset.t;
      $$('.slot', els.slots).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      update();
    }));
  }

  /* ------------------------------------------------------------ calculs & récapitulatif */
  function pricing() {
    const it = ITEMS[state.item];
    if (!it || !state.min) return null;
    const opt = it.opts.find((o) => o.min === state.min);
    if (!opt) return null;
    if (state.pack && PACK[state.min]) {
      return { base: PACK[state.min], total: PACK[state.min], label: '3 × ' + fmtDur(state.min), per: opt.price, packed: true };
    }
    const total = opt.price + (state.home ? HOME_FEE : 0);
    return { base: opt.price, total, label: fmtDur(state.min), per: opt.price, packed: false };
  }

  function update() {
    const it = ITEMS[state.item];
    const p = pricing();
    els.t.item.textContent = it ? it.name : 'À choisir';
    els.t.dur.textContent = p ? p.label + (p.packed ? ' (forfait, valable 3 mois)' : '') : '—';
    els.t.place.textContent = state.home ? 'À mon domicile' + (state.address ? ' : ' + state.address : '') : 'Cabinet, Digne-les-Bains';
    els.t.when.textContent = state.date ? longDate(state.date) + (state.time != null ? ' à ' + fmtTime(state.time) : '') : '—';
    els.t.total.textContent = p ? p.total + ' €' : '—';
    let note = 'Règlement en espèces. Demande à confirmer par Inga.';
    if (p && p.packed) note = '3 séances à planifier avec Inga' + (state.home ? ' (+ ' + HOME_FEE + ' € par séance à domicile)' : '') + '. ' + note;
    else if (p && state.home) note = 'Dont ' + HOME_FEE + ' € de déplacement. ' + note;
    els.t.note.textContent = note;

    // forfait
    const packOK = !!(it && state.min && PACK[state.min]);
    els.packWrap.hidden = !packOK;
    if (!packOK && state.pack) state.pack = false;
    els.pack.checked = state.pack;
    if (packOK) els.packTxt.textContent = '3 × ' + fmtDur(state.min) + ' pour ' + PACK[state.min] + ' € au lieu de ' + (ITEMS[state.item].opts.find((o) => o.min === state.min).price * 3) + ' € · valable 3 mois';
    els.addrWrap.hidden = !state.home;
    els.home.checked = state.home;
  }

  /* ------------------------------------------------------------ message & envois */
  function message() {
    const it = ITEMS[state.item], p = pricing();
    const lines = [
      'Bonjour Inga, je souhaiterais réserver : ' + it.name + ' (' + p.label + (p.packed ? ', forfait 3 séances' : '') + ') — ' + p.total + ' €.',
      'Créneau souhaité : ' + longDate(state.date) + ' à ' + fmtTime(state.time) + (p.packed ? ' (1re séance)' : '') + '.',
      state.home ? 'Lieu : à mon domicile (+ ' + HOME_FEE + ' €) — ' + state.address + '.' : 'Lieu : à votre cabinet, Digne-les-Bains.',
    ];
    if (state.note.trim()) lines.push('Précision : ' + state.note.trim());
    lines.push('Je m’appelle ' + state.name.trim() + ', mon numéro : ' + state.phone.trim() + '.');
    lines.push('Pouvez-vous me confirmer la disponibilité ? Merci !');
    return lines.join('\n');
  }

  function buildOutputs() {
    const msg = message();
    els.preview.value = msg;
    els.sms.href = 'sms:' + PHONE_SMS + '?&body=' + encodeURIComponent(msg);
    els.wa.href = 'https://wa.me/' + PHONE_WA + '?text=' + encodeURIComponent(msg);
    const it = ITEMS[state.item];
    els.mail.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Demande de rendez-vous : ' + it.name + ', ' + longDate(state.date)) + '&body=' + encodeURIComponent(msg);
  }

  function icsEscape(s) { return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function downloadICS() {
    const it = ITEMS[state.item], p = pricing();
    const start = new Date(state.date); start.setHours(Math.floor(state.time / 60), state.time % 60, 0, 0);
    const end = new Date(start.getTime() + state.min * 60000);
    const f = (d) => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Inga Massage Est’Ethique//Reservation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:' + Date.now() + '@inga-massage-est-ethique', 'DTSTAMP:' + stamp,
      'DTSTART:' + f(start), 'DTEND:' + f(end),
      'SUMMARY:' + icsEscape('Massage chez Inga : ' + it.name + ' (à confirmer)'),
      'LOCATION:' + icsEscape(state.home ? state.address : ADDRESS),
      'DESCRIPTION:' + icsEscape('Demande de rendez-vous envoyée à Inga Massage Est’Éthique (07 81 89 11 51).\n' + it.name + ' – ' + p.label + ' – ' + p.total + ' €.\nRèglement en espèces. Créneau à confirmer par Inga.'),
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Rendez-vous massage dans 2 heures', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rdv-inga-massage.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    say('Fichier d’agenda téléchargé. Il marque votre demande : pensez à attendre la confirmation d’Inga.', true);
  }

  function say(text, ok) {
    els.err.textContent = text || '';
    els.err.classList.toggle('is-ok', !!ok);
  }

  /* ------------------------------------------------------------ navigation entre étapes */
  function validate(step) {
    if (step === 1 && !state.item) return 'Choisissez un massage pour continuer.';
    if (step === 2) {
      if (!state.min) return 'Choisissez une durée.';
      if (state.home && state.address.trim().length < 5) return 'Indiquez l’adresse de la séance à domicile.';
    }
    if (step === 3 && (!state.date || state.time == null)) return 'Choisissez un jour puis une heure.';
    if (step === 4) {
      if (state.name.trim().length < 2) return 'Indiquez votre prénom.';
      const digits = state.phone.replace(/[\s.\-()]/g, '');
      if (!/^(?:\+33|0033|0)[1-9]\d{8}$/.test(digits)) return 'Indiquez un numéro de téléphone français valide (ex. 06 12 34 56 78).';
    }
    return '';
  }

  function go(n, opts) {
    opts = opts || {};
    if (n > current) {
      for (let s = current; s < n; s++) {
        const e = validate(s);
        if (e) { say(e); markInvalid(s); current = s; show(s, true); return; }
      }
    }
    say('');
    current = n;
    if (n === 5) buildOutputs();
    show(n, opts.keepScroll);
  }

  function markInvalid(step) {
    if (step === 4) {
      els.name.setAttribute('aria-invalid', String(state.name.trim().length < 2));
      els.phone.setAttribute('aria-invalid', String(!!validate(4) && state.name.trim().length >= 2));
    }
    if (step === 2 && state.home) els.addr.setAttribute('aria-invalid', String(state.address.trim().length < 5));
  }

  function show(n, keepScroll) {
    $$('.bpane').forEach((p) => p.classList.toggle('is-active', +p.dataset.pane === n));
    $$('.bstep').forEach((b) => {
      const k = +b.dataset.go;
      b.classList.toggle('is-active', k === n);
      b.classList.toggle('is-done', k < n);
      if (k === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    els.prev.hidden = n === 1;
    els.next.hidden = n === 5;
    const lab = $('.btn__label', els.next);
    lab.textContent = n === 4 ? 'Voir mon message' : 'Continuer';
    if (n === 2) renderDurations();
    if (n === 3) { renderCal(); renderSlots(); }
    const pane = $('.bpane.is-active');
    const h = pane && $('h3', pane);
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    if (!keepScroll) {
      const top = $('.bsteps').getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.5) {
        if (window.IngaScrollTo) window.IngaScrollTo($('.bsteps'));
        else $('.bsteps').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  /* ------------------------------------------------------------ évènements */
  els.next.addEventListener('click', () => go(current + 1));
  els.prev.addEventListener('click', () => go(current - 1));
  $$('.bstep').forEach((b) => b.addEventListener('click', () => go(+b.dataset.go)));
  els.home.addEventListener('change', () => { state.home = els.home.checked; update(); if (state.home) els.addr.focus({ preventScroll: true }); });
  els.pack.addEventListener('change', () => { state.pack = els.pack.checked; update(); });
  els.addr.addEventListener('input', () => { state.address = els.addr.value; els.addr.removeAttribute('aria-invalid'); update(); });
  els.name.addEventListener('input', () => { state.name = els.name.value; els.name.removeAttribute('aria-invalid'); });
  els.phone.addEventListener('input', () => { state.phone = els.phone.value; els.phone.removeAttribute('aria-invalid'); });
  els.note.addEventListener('input', () => { state.note = els.note.value; });
  app.querySelector('form').addEventListener('submit', (e) => e.preventDefault());
  app.querySelector('form').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'radio' && e.target.type !== 'checkbox') { e.preventDefault(); if (current < 5) go(current + 1); }
  });

  [els.sms, els.wa, els.mail].forEach((a) => a.addEventListener('click', () => {
    say('Votre message s’ouvre : il ne reste qu’à appuyer sur « Envoyer ». Inga vous répondra pour confirmer le créneau.', true);
  }));
  els.ics.addEventListener('click', downloadICS);
  els.copy.addEventListener('click', () => {
    const txt = els.preview.value;
    const done = () => say('Message copié : collez-le dans votre messagerie.', true);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => { els.preview.select(); document.execCommand('copy'); done(); });
    else { els.preview.select(); try { document.execCommand('copy'); done(); } catch (e) { say('Sélectionnez le message ci-dessus pour le copier.'); } }
  });

  // Boutons « durée » de la carte et forfaits
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-book]');
    if (chip) {
      state.pack = false; state.packPref = 0;
      const min = +chip.dataset.min || 0;
      chooseItem(chip.dataset.book, min);
      go(min ? 3 : 2, { keepScroll: true });
      return;
    }
    const pk = e.target.closest('[data-book-pack]');
    if (pk) {
      state.pack = true; state.packPref = +pk.dataset.bookPack; state.min = state.packPref;
      if (state.item && ITEMS[state.item].opts.some((o) => o.min === state.packPref)) { chooseItem(state.item, state.packPref); state.pack = true; update(); go(2, { keepScroll: true }); }
      else { state.item = null; $$('input[name="b-item"]').forEach((r) => { r.checked = false; }); update(); go(1, { keepScroll: true }); say('Forfait 3 × ' + fmtDur(state.packPref) + ' : choisissez d’abord le massage qui vous tente.', true); }
    }
  });

  /* ------------------------------------------------------------ init */
  renderItems();
  renderDurations();
  renderCal();
  renderSlots();
  update();
  show(1, true);
})();
