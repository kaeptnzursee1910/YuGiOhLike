/* Gemeinsame UI-Helfer: Kartendarstellung, Modale, Auswahl */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

function hashStr(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

const SKIP_WORDS = new Set(['der', 'des', 'die', 'das', 'mit', 'von', 'am', 'im']);
function initials(name) {
  const w = name.replace(/[„“-]/g, ' ').split(/\s+/).filter(x => x && !SKIP_WORDS.has(x.toLowerCase()));
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0][1] || ''))).toUpperCase();
}

function typeLine(c) {
  if (c.type === 'spell') return c.sp === 'ritual' ? 'Zauber · Ritual' : c.sp === 'equip' ? 'Zauber · Ausrüstung' : 'Zauber';
  if (c.type === 'trap') return c.trig === 'manual' ? 'Falle · Normal' : 'Falle · Reaktion';
  const k = { normal: 'Normal', effect: 'Effekt', fusion: 'Fusion', ritual: 'Ritual' }[c.kind];
  return `${c.race} · ${k}`;
}

/* opts: size ('sm'|'md'|'lg'), atk/def override, faceDown, extraClass, attrs */
function cardHTML(c, o = {}) {
  const size = o.size || 'md';
  const cls = ['card', size];
  if (o.extraClass) cls.push(o.extraClass);
  const attrs = o.attrs || '';
  if (o.faceDown) return `<div class="${cls.join(' ')} back" ${attrs}><div class="back-in"><span>✦</span></div></div>`;
  cls.push('k-' + c.kind);
  const h = hashStr(c.id) % 360;
  let colors;
  if (c.type === 'monster') colors = ATTR_COLORS[c.attr];
  else if (c.type === 'spell') colors = ['#5fd0b8', '#1d6b63'];
  else colors = ['#e07ab8', '#7a2358'];
  const art = `<div class="art" style="--a1:${colors[0]};--a2:${colors[1]};--h:${h}deg"><span>${c.type === 'monster' ? initials(c.name) : (c.type === 'spell' ? 'Z' : 'F')}</span></div>`;
  let top = `<div class="cn">${esc(c.name)}</div>`;
  let lv = '';
  if (c.type === 'monster') lv = `<div class="lv"><span class="attr">${c.attr}</span><span class="stars">${'★'.repeat(Math.min(c.lvl, 10))}</span></div>`;
  else lv = `<div class="lv"><span class="attr">${c.type === 'spell' ? 'ZAUBER' : 'FALLE'}</span></div>`;
  let body = '';
  if (size === 'lg') body = `<div class="ty">[${typeLine(c)}]</div><div class="tx">${esc(cardText(c))}</div>`;
  let st = '';
  if (c.type === 'monster') {
    const a = o.atk != null ? o.atk : c.atk, d = o.def != null ? o.def : c.def;
    const ac = a > c.atk ? 'up' : a < c.atk ? 'down' : '';
    const dc = d > c.def ? 'up' : d < c.def ? 'down' : '';
    st = `<div class="st"><span class="${ac}"><i>ATK</i>${a}</span><span class="${dc}"><i>DEF</i>${d}</span></div>`;
  } else if (size !== 'sm') {
    st = `<div class="st sp">${c.type === 'spell' ? 'Zauberkarte' : 'Fallenkarte'}</div>`;
  }
  const rar = size !== 'sm' ? `<div class="rar r-${c.rar}" title="${RAR_LABEL[c.rar]}">${c.rar}</div>` : '';
  return `<div class="${cls.join(' ')}" ${attrs}>${top}${lv}${art}${body}${st}${rar}</div>`;
}

/* ---------- Modale ---------- */
let modalStack = 0;
function modal({ title, html = '', buttons = [{ label: 'OK', value: true, primary: true }], wide = false, dismiss = null }) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.style.zIndex = 100 + (++modalStack);
    wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <h3>${esc(title)}</h3><div class="modal-body">${html}</div>
      <div class="modal-btns">${buttons.map((b, i) => `<button class="btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${esc(b.label)}</button>`).join('')}</div></div>`;
    const close = v => { wrap.remove(); modalStack--; resolve(v); };
    wrap.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b && b.parentElement.classList.contains('modal-btns')) close(buttons[+b.dataset.i].value);
      const pick = e.target.closest('[data-pick]');
      if (pick) close({ pick: +pick.dataset.pick });
      if (e.target === wrap && dismiss !== null) close(dismiss);
    });
    document.body.appendChild(wrap);
    const first = wrap.querySelector('.btn.primary') || wrap.querySelector('.btn');
    if (first) first.focus();
  });
}

/* Wähle eine Karte aus einer Liste. Gibt Index zurück oder null. */
async function chooseCard(title, cards, { cancellable = true, hint = '', cancelLabel = 'Abbrechen' } = {}) {
  const html = (hint ? `<p class="hint">${esc(hint)}</p>` : '') +
    `<div class="card-grid">${cards.map((c, i) => `<button class="pick" data-pick="${i}" aria-label="${esc(c.name)}">${cardHTML(c, { size: 'lg' })}</button>`).join('')}</div>`;
  const r = await modal({ title, html, wide: true, buttons: cancellable ? [{ label: cancelLabel, value: null }] : [] });
  return r && typeof r === 'object' ? r.pick : null;
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 1800);
  setTimeout(() => t.remove(), 2300);
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
