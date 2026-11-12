/* =========================================================
   Lauf-Logik: Karte, Knoten, Belohnungen, Laden, Events
   ========================================================= */

const SAVE_KEY = 'duellpfad-run-v1';
const BEST_KEY = 'duellpfad-best-v1';
const PARAMS = new URLSearchParams(location.search);
const AUTO = PARAMS.has('auto');
const FAST = PARAMS.has('fast');

let RUN = null;
const app = () => document.getElementById('app');

/* ---------- Speichern ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(RUN)); } catch (e) { /* ohne Speicher spielbar */ } }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* egal */ } }
function getBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || null; } catch (e) { return null; } }
function setBest(b) { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* egal */ } }

/* ---------- Kartenpools ---------- */
const ALL = Object.values(CARDS);
const isMainPool = c => !(c.type === 'spell' && c.sp === 'ritual');
const rarIdx = c => RAR_ORDER[c.rar];

function rollRarity(weights) {
  const tot = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot;
  for (let i = 0; i < weights.length; i++) { if ((r -= weights[i]) < 0) return i; }
  return 0;
}

function countCopies(id) {
  return RUN.deck.filter(x => x === id).length + RUN.extra.filter(x => x === id).length;
}

function canTake(id) {
  const c = CARDS[id];
  if (countCopies(id) >= 3) return false;
  if (c.kind !== 'fusion' && RUN.deck.length >= 40) return false;
  return true;
}

function addCard(id) {
  const c = CARDS[id];
  if (c.kind === 'fusion') RUN.extra.push(id);
  else RUN.deck.push(id);
  if (c.kind === 'ritual') RUN.deck.push(c.ritualSpell);
  RUN.stats.cards++;
}

function rewardCards(n, tierBoost = 0, themeBias = []) {
  const a = RUN.arena;
  const w = [
    Math.max(10, 64 - a * 6 - tierBoost * 25),
    28 + a * 2 + tierBoost * 10,
    Math.max(2, 6 + a * 2.5 + tierBoost * 12),
    Math.max(0.5, 1 + a * 1.2 + tierBoost * 6),
  ];
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 400) {
    const ri = rollRarity(w);
    let pool = ALL.filter(c => isMainPool(c) && rarIdx(c) === ri && !out.includes(c.id) && canTake(c.id));
    if (themeBias.length && Math.random() < 0.55) {
      const biased = pool.filter(c => themeBias.includes(c.theme) || (c.kind === 'fusion' && c.mats.some(m => themeRaces(themeBias).includes(m.race))));
      if (biased.length) pool = biased;
    }
    if (!pool.length) continue;
    out.push(pick(pool).id);
  }
  return out;
}

const THEME_RACE = { krieger: 'Krieger', drache: 'Drache', hexer: 'Hexer', wasser: 'Aqua', wind: 'Geflügeltes Ungeheuer', zombie: 'Zombie', maschine: 'Maschine', feuer: 'Pyro', licht: 'Fee' };
const themeRaces = ts => ts.map(t => THEME_RACE[t]).filter(Boolean);

function playerThemes() {
  const cnt = {};
  for (const id of RUN.deck) { const c = CARDS[id]; if (c.type === 'monster') cnt[c.theme] = (cnt[c.theme] || 0) + 1; }
  return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
}

/* ---------- Gegnerdecks ---------- */
function buildDeck(themes, power, signature = []) {
  const maxR = power >= 6 ? 3 : power >= 3.5 ? 2 : power >= 1.2 ? 1 : 0;
  const deck = [...signature];
  const copies = id => deck.filter(x => x === id).length;
  const monPool = ALL.filter(c => c.type === 'monster' && (c.kind === 'normal' || c.kind === 'effect') && themes.includes(c.theme) && rarIdx(c) <= maxR);
  const low = monPool.filter(c => c.lvl <= 4), mid = monPool.filter(c => c.lvl >= 5 && c.lvl <= 6), high = monPool.filter(c => c.lvl >= 7);
  const add = (pool, n) => {
    let g = 0;
    while (n > 0 && pool.length && g++ < 100) {
      const c = pick(pool);
      if (copies(c.id) >= (rarIdx(c) >= 2 ? 1 : 3)) continue;
      deck.push(c.id); n--;
    }
  };
  const nLow = 11 - Math.min(3, Math.floor(power / 3));
  add(low.length ? low : ALL.filter(c => c.type === 'monster' && c.kind === 'normal' && c.lvl <= 4 && c.rar === 'C'), nLow);
  add(mid, power >= 1 ? 2 : 1);
  add(high, power >= 4 ? 2 : power >= 2 ? 1 : 0);
  const spells = ALL.filter(c => c.type === 'spell' && !['ritual', 'fusion'].includes(c.sp) && rarIdx(c) <= maxR);
  const traps = ALL.filter(c => c.type === 'trap' && rarIdx(c) <= maxR);
  add(spells, 4);
  add(traps, 3);
  const races = themeRaces(themes);
  const extra = ALL.filter(c => c.kind === 'fusion' && c.mats.every(m => m.race && races.includes(m.race)) && rarIdx(c) <= Math.max(1, maxR)).map(c => c.id);
  if (extra.length && power >= 2) deck.push('s_fusion');
  const filler = ALL.filter(c => c.type === 'monster' && c.kind !== 'fusion' && c.kind !== 'ritual' && c.lvl <= 4 && rarIdx(c) <= maxR);
  for (let g = 0; deck.length < 20 && g < 200; g++) add(g < 40 && low.length ? low : filler, 1);
  return { deck, extra: power >= 2 ? extra.slice(0, 2) : [] };
}

function genEnemy(type) {
  const a = RUN.arena;
  if (type === 'boss') {
    const L = a < 8 ? LEADERS[a] : FINAL_BOSS;
    const power = a + 2.5;
    const { deck, extra } = buildDeck(L.themes, power, L.signature);
    if (a === 8) extra.push('x13', 'x11');
    return { name: L.name, title: L.title, deck, extra, lp: a < 8 ? 6000 + a * 300 : 9000 };
  }
  const elite = type === 'elite';
  const theme = Math.random() < 0.6 ? ARENA_THEMES[Math.min(a, 7)] : pick(Object.keys(THEME_LABEL));
  const themes = Math.random() < 0.4 ? [theme, pick(Object.keys(THEME_LABEL))] : [theme];
  const power = a + (elite ? 1.5 : 0) + Math.random() * 0.8;
  const { deck, extra } = buildDeck(themes, power);
  return {
    name: pick(DUELIST_NAMES), title: `${pick(elite ? ELITE_TITLES : DUELIST_TITLES)} · ${themes.map(t => THEME_LABEL[t]).join('/')}`,
    deck, extra, lp: (elite ? 4500 : 2800) + a * 300,
  };
}

/* ---------- Karte ---------- */
const NODE_INFO = {
  duel: { label: 'Duell', sym: '⚔︎' }, elite: { label: 'Elite', sym: '✦' }, shop: { label: 'Laden', sym: '¤' },
  rest: { label: 'Rast', sym: '+' }, pack: { label: 'Booster', sym: '▤' }, event: { label: 'Ereignis', sym: '?' }, boss: { label: 'Arenaleiter', sym: '♛' },
};

function genMap(arena) {
  const R = arena === 8 ? 4 : 6;
  const rows = [];
  for (let r = 0; r < R; r++) {
    let lanes = shuffle([0, 1, 2]).slice(0, r === 0 ? 2 + rnd(2) : 2 + rnd(2)).sort();
    const row = lanes.map(l => ({ lane: l, t: 'duel', next: [] }));
    for (const n of row) {
      if (r === 0) n.t = 'duel';
      else if (r === R - 1) n.t = pick(['rest', 'rest', 'shop']);
      else {
        const opts = [['duel', 40], ['event', 16], ['shop', 10], ['pack', 12], ['rest', 8], ['elite', r >= 2 ? 14 : 0]];
        n.t = opts[rollRarity(opts.map(o => o[1]))][0];
      }
    }
    rows.push(row);
  }
  rows.push([{ lane: 1, t: 'boss', next: [] }]);
  for (let r = 0; r < rows.length - 1; r++) {
    const cur = rows[r], nx = rows[r + 1];
    cur.forEach(n => {
      n.next = nx.map((m, i) => (Math.abs(m.lane - n.lane) <= 1 ? i : -1)).filter(i => i >= 0);
      if (!n.next.length) n.next = [nx.reduce((bi, m, i) => (Math.abs(m.lane - n.lane) < Math.abs(nx[bi].lane - n.lane) ? i : bi), 0)];
    });
    nx.forEach((m, i) => {
      if (!cur.some(n => n.next.includes(i))) {
        const src = cur.reduce((b, n) => (Math.abs(n.lane - m.lane) < Math.abs(b.lane - m.lane) ? n : b), cur[0]);
        src.next.push(i);
      }
    });
  }
  // Doppelte Läden/Rasten in einer Reihe vermeiden ist nicht nötig; Typen variieren genug.
  return { rows, pos: null, visited: [] };
}

/* ---------- Bildschirme ---------- */
function show(html) {
  const el = app();
  el.innerHTML = html;
  el.scrollTop = 0;
  window.scrollTo(0, 0);
}

function headerHTML() {
  const a = RUN.arena;
  const L = a < 8 ? LEADERS[a] : FINAL_BOSS;
  const pct = Math.round((RUN.lp / RUN.maxLp) * 100);
  return `<header class="runbar">
    <div class="rb-arena"><span class="eyebrow">${a < 8 ? `Arena ${a + 1} von 8` : 'Finale'}</span><b>${esc(L.name)}</b><small>${esc(L.title)}</small></div>
    <div class="rb-lp"><div class="lp-num">${RUN.lp}<small> / ${RUN.maxLp} LP</small></div><div class="lp-bar"><i style="width:${pct}%"></i></div></div>
    <div class="rb-stats">
      <span class="gold" title="Gold">${RUN.gold} G</span>
      <button class="btn small" data-r="deck">Deck ${RUN.deck.length}${RUN.extra.length ? ` + ${RUN.extra.length}` : ''}</button>
    </div>
    <div class="badges">${Array.from({ length: 8 }, (_, i) => `<span class="badge ${i < RUN.badges ? 'won' : ''}" title="${esc(LEADERS[i].name)}">${i + 1}</span>`).join('')}</div>
    ${RUN.talismans.length ? `<div class="tals">${RUN.talismans.map(k => `<span class="tal" title="${esc(TALISMANS[k].text)}">${esc(TALISMANS[k].name)}</span>`).join('')}</div>` : ''}
  </header>`;
}

function titleScreen() {
  const saved = loadSave();
  const best = getBest();
  show(`<section class="title-screen">
    <div class="title-cards" aria-hidden="true">${['d7', 'h7', 'k10'].map(id => cardHTML(CARDS[id], { size: 'md' })).join('')}</div>
    <h1>Duellpfad</h1>
    <p class="tagline">Ein Kartenduell-Roguelike. Wähle ein Starterdeck, kämpfe dich durch acht Arenen, sammle Karten und besiege den Großmeister.</p>
    <div class="title-btns">
      ${saved ? `<button class="btn primary big" data-r="continue">Lauf fortsetzen <small>Arena ${saved.arena + 1 > 8 ? 'Finale' : saved.arena + 1}</small></button>` : ''}
      <button class="btn ${saved ? '' : 'primary'} big" data-r="new">Neuer Lauf</button>
      <button class="btn" data-r="howto">Spielregeln</button>
    </div>
    ${best ? `<p class="best">Bester Lauf: ${best.badges} Wappen${best.champion ? ' · Champion' : ''}</p>` : ''}
  </section>`);
}

function starterScreen() {
  show(`<section class="screen">
    <h2>Wähle dein Starterdeck</h2>
    <p class="sub">Jedes Deck enthält 20 Karten und ein Fusionsmonster im Extra-Deck.</p>
    <div class="starters">${STARTERS.map(s => `
      <button class="starter" data-r="starter" data-id="${s.id}">
        ${cardHTML(CARDS[s.ace], { size: 'lg' })}
        <div class="st-info"><span class="eyebrow">${s.tag}</span><h3>${s.name}</h3><p>${s.blurb}</p>
        <p class="small">Extra-Deck: ${s.extra.map(id => esc(CARDS[id].name)).join(', ')}</p></div>
      </button>`).join('')}</div>
    <button class="btn" data-r="title">Zurück</button>
  </section>`);
}

function newRun(starterId) {
  const s = STARTERS.find(x => x.id === starterId);
  RUN = {
    starter: s.id, deck: [...s.deck], extra: [...s.extra], gold: 60, lp: 8000, maxLp: 8000,
    talismans: [], arena: 0, badges: 0, map: genMap(0), herzUsed: false,
    stats: { wins: 0, cards: 0, duels: 0 },
  };
  save();
  mapScreen();
}

function mapScreen() {
  const map = RUN.map;
  const rows = map.rows;
  const W = 340, rowH = 92, top = 46;
  const H = top + rowH * (rows.length - 1) + 60;
  const X = l => 70 + l * 100;
  const Y = r => top + r * rowH;
  const avail = availableNodes();
  let lines = '', nodes = '';
  rows.forEach((row, r) => row.forEach((n, i) => {
    n.next.forEach(j => {
      const m = rows[r + 1][j];
      const traveled = map.visited.some(v => v[0] === r && v[1] === i) && map.visited.some(v => v[0] === r + 1 && v[1] === j);
      lines += `<line x1="${X(n.lane)}" y1="${Y(r)}" x2="${X(m.lane)}" y2="${Y(r + 1)}" class="${traveled ? 'trav' : ''}"/>`;
    });
  }));
  rows.forEach((row, r) => row.forEach((n, i) => {
    const info = NODE_INFO[n.t];
    const isAvail = avail.some(v => v[0] === r && v[1] === i);
    const visited = map.visited.some(v => v[0] === r && v[1] === i);
    const cur = map.pos && map.pos[0] === r && map.pos[1] === i;
    const rad = n.t === 'boss' ? 30 : 22;
    nodes += `<g class="node n-${n.t} ${isAvail ? 'avail' : ''} ${visited ? 'visited' : ''} ${cur ? 'cur' : ''}" ${isAvail ? `data-r="node" data-row="${r}" data-i="${i}" tabindex="0" role="button" aria-label="${info.label}"` : ''} transform="translate(${X(n.lane)},${Y(r)})">
      <circle r="${rad}"/><text class="sym" dy="0.35em">${info.sym}</text><text class="lbl" dy="${rad + 15}">${info.label}</text></g>`;
  }));
  const L = RUN.arena < 8 ? LEADERS[RUN.arena] : FINAL_BOSS;
  show(`${headerHTML()}<section class="screen map-screen">
    <div class="map-head"><h2>${RUN.arena < 8 ? `Weg zur Arena von ${esc(L.name)}` : 'Der Weg zum Großmeister'}</h2>
    <p class="sub">Wähle den nächsten Ort. Der Arenaleiter setzt auf ${L.themes.map(t => THEME_LABEL[t]).join(' und ')}.</p></div>
    <div class="map-wrap"><svg viewBox="0 0 ${W} ${H}" class="map">${lines}${nodes}</svg></div>
    <div class="legend">${Object.entries(NODE_INFO).map(([k, v]) => `<span class="lg n-${k}"><i>${v.sym}</i>${v.label}</span>`).join('')}</div>
    <div class="map-foot"><button class="btn small" data-r="abandon">Lauf aufgeben</button></div>
  </section>`);
}

function availableNodes() {
  const { rows, pos } = RUN.map;
  if (!pos) return rows[0].map((_, i) => [0, i]);
  const n = rows[pos[0]][pos[1]];
  if (pos[0] + 1 >= rows.length) return [];
  return n.next.map(j => [pos[0] + 1, j]);
}

async function enterNode(r, i) {
  const n = RUN.map.rows[r][i];
  RUN.map.pos = [r, i];
  RUN.map.visited.push([r, i]);
  save();
  switch (n.t) {
    case 'duel': case 'elite': case 'boss': return duelNode(n.t);
    case 'shop': return shopScreen();
    case 'rest': return restScreen();
    case 'pack': return packScreen();
    case 'event': return eventScreen();
  }
}

/* ---------- Duelle ---------- */
async function duelNode(type) {
  const enemy = genEnemy(type);
  app().innerHTML = '';
  if (!AUTO) {
    const ace = type === 'boss' ? CARDS[(RUN.arena < 8 ? LEADERS[RUN.arena] : FINAL_BOSS).ace] : null;
    await modal({
      title: type === 'boss' ? 'Arenakampf' : type === 'elite' ? 'Elite-Duell' : 'Duell',
      html: `<div class="vs"><div><b>${esc(enemy.name)}</b><small>${esc(enemy.title)}</small><span>${enemy.lp} LP</span></div>${ace ? cardHTML(ace, { size: 'md' }) : ''}</div>
        <p class="hint">Deine LP bleiben zwischen den Duellen erhalten. Aktuell: <b>${RUN.lp}</b>.</p>`,
      buttons: [{ label: 'Duell beginnen', value: true, primary: true }],
    });
  }
  RUN.stats.duels++;
  const res = await Duel.start({
    player: { name: 'Du', lp: RUN.lp, maxLp: RUN.maxLp, deck: RUN.deck, extra: RUN.extra },
    enemy, talismans: RUN.talismans, auto: AUTO, fast: FAST,
    label: type === 'boss' ? `Arenakampf gegen ${enemy.name}` : type === 'elite' ? 'Elite-Duell' : 'Duell',
  });
  if (!res.won) {
    if (RUN.talismans.includes('herz') && !RUN.herzUsed) {
      RUN.herzUsed = true;
      RUN.lp = Math.round(RUN.maxLp / 2);
      save();
      if (!AUTO) await modal({ title: 'Zweites Herz', html: '<p>Dein Talisman zerspringt. Du stehst mit der Hälfte deiner LP wieder auf und setzt deinen Weg fort.</p>' });
      return afterNode();
    }
    return gameOver(false, enemy.name);
  }
  RUN.stats.wins++;
  RUN.lp = Math.min(RUN.maxLp, res.lp);
  if (RUN.talismans.includes('blut')) RUN.lp = Math.min(RUN.maxLp, RUN.lp + 600);
  let gold = type === 'boss' ? 150 : type === 'elite' ? 90 : 40 + rnd(25);
  gold += RUN.arena * 6;
  if (RUN.talismans.includes('muenze')) gold = Math.round(gold * 1.3);
  RUN.gold += gold;
  if (type === 'boss') {
    RUN.badges = Math.max(RUN.badges, RUN.arena + 1);
    RUN.lp = RUN.maxLp;
    if (RUN.arena === 8) { save(); return gameOver(true); }
  }
  save();
  return rewardScreen(type, gold);
}

async function rewardScreen(type, gold) {
  const boost = type === 'boss' ? 1.2 : type === 'elite' ? 0.6 : 0;
  const bias = [...playerThemes(), ARENA_THEMES[Math.min(RUN.arena, 7)]];
  const cards = rewardCards(3, boost, bias);
  let talOffer = [];
  if (type === 'elite' || type === 'boss') talOffer = shuffle(Object.keys(TALISMANS).filter(k => !RUN.talismans.includes(k))).slice(0, type === 'boss' ? 2 : 1);
  const heading = type === 'boss' ? `Wappen ${RUN.arena + 1} errungen!` : 'Sieg!';
  const render = () => show(`${headerHTML()}<section class="screen">
    <h2>${heading}</h2>
    <p class="sub">+${gold} Gold${type === 'boss' ? ' · LP vollständig wiederhergestellt' : ''}. Wähle eine Karte für dein Deck.</p>
    <div class="reward-row">${cards.map((id, i) => rewardCardHTML(id, i)).join('')}</div>
    ${talOffer.length ? `<h3 class="sec">Talisman${talOffer.length > 1 ? ' (wähle einen)' : ''}</h3><div class="tal-row">${talOffer.map(k => `<button class="talcard" data-r="tal" data-k="${k}"><b>${esc(TALISMANS[k].name)}</b><span>${esc(TALISMANS[k].text)}</span></button>`).join('')}</div>` : ''}
    <div class="row-btns"><button class="btn" data-r="skip">Keine Karte nehmen (+15 Gold)</button></div>
  </section>`);
  render();
  return new Promise(resolve => {
    let cardTaken = false, talTaken = !talOffer.length;
    const done = () => { if (cardTaken && talTaken) { cleanup(); save(); resolve(afterNode(type)); } };
    const handler = e => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      if (b.dataset.r === 'reward' && !cardTaken) {
        addCard(cards[+b.dataset.i]); cardTaken = true;
        toast(`${CARDS[cards[+b.dataset.i]].name} hinzugefügt`);
        document.querySelectorAll('.reward-row .reward').forEach(x => x.disabled = true);
        b.classList.add('taken');
        done();
      } else if (b.dataset.r === 'skip' && !cardTaken) {
        RUN.gold += 15; cardTaken = true;
        document.querySelectorAll('.reward-row .reward').forEach(x => x.disabled = true);
        b.disabled = true;
        done();
      } else if (b.dataset.r === 'tal' && !talTaken) {
        const k = b.dataset.k;
        gainTalisman(k);
        talTaken = true;
        document.querySelectorAll('.talcard').forEach(x => x.disabled = true);
        b.classList.add('taken');
        done();
      }
    };
    const cleanup = () => app().removeEventListener('click', handler, true);
    app().addEventListener('click', handler, true);
  });
}

function rewardCardHTML(id, i, extra = '') {
  const c = CARDS[id];
  const note = c.kind === 'fusion' ? 'Extra-Deck' : c.kind === 'ritual' ? `+ ${CARDS[c.ritualSpell].name}` : '';
  return `<button class="reward" data-r="reward" data-i="${i}" ${extra}>${cardHTML(c, { size: 'lg' })}${note ? `<span class="rnote">${esc(note)}</span>` : ''}<span class="owned">Im Deck: ${countCopies(id)}</span></button>`;
}

function gainTalisman(k) {
  RUN.talismans.push(k);
  if (k === 'amulett') { RUN.maxLp += 1500; RUN.lp = RUN.maxLp; }
  toast(`Talisman erhalten: ${TALISMANS[k].name}`);
}

function afterNode(type) {
  const { rows, pos } = RUN.map;
  if (type === 'boss' || (pos && pos[0] === rows.length - 1)) {
    RUN.arena++;
    RUN.map = genMap(RUN.arena);
    save();
    if (!AUTO) toast(RUN.arena < 8 ? `Weiter zu Arena ${RUN.arena + 1}` : 'Das Finale wartet');
  }
  save();
  mapScreen();
}

/* ---------- Laden ---------- */
const PRICE = { C: 40, R: 75, SR: 130, UR: 220 };
function shopScreen() {
  const bias = playerThemes();
  const stock = rewardCards(6, 0.4, bias).map(id => ({ id, price: PRICE[CARDS[id].rar] + rnd(10), sold: false }));
  const tals = shuffle(Object.keys(TALISMANS).filter(k => !RUN.talismans.includes(k))).slice(0, 2).map(k => ({ k, sold: false }));
  let removed = false;
  const render = () => show(`${headerHTML()}<section class="screen">
    <h2>Kartenladen</h2><p class="sub">Du hast <b>${RUN.gold} Gold</b>.</p>
    <div class="reward-row shop">${stock.map((s, i) => `<div class="shopitem ${s.sold ? 'sold' : ''}">${rewardCardHTML(s.id, i, s.sold || RUN.gold < s.price || !canTake(s.id) ? 'disabled' : '').replace('data-r="reward"', 'data-r="buy"')}<span class="price">${s.sold ? 'Verkauft' : s.price + ' G'}</span></div>`).join('')}</div>
    ${tals.length ? `<h3 class="sec">Talismane</h3><div class="tal-row">${tals.map((t, i) => { const T = TALISMANS[t.k]; return `<button class="talcard" data-r="buytal" data-i="${i}" ${t.sold || RUN.gold < T.price ? 'disabled' : ''}><b>${esc(T.name)}</b><span>${esc(T.text)}</span><em>${t.sold ? 'Verkauft' : T.price + ' G'}</em></button>`; }).join('')}</div>` : ''}
    <h3 class="sec">Dienste</h3>
    <div class="tal-row">
      <button class="talcard" data-r="svc-remove" ${removed || RUN.gold < 60 || RUN.deck.length <= 20 ? 'disabled' : ''}><b>Karte entfernen</b><span>Entferne eine Karte aus deinem Deck (mindestens 20 bleiben).</span><em>${removed ? 'Erledigt' : '60 G'}</em></button>
      <button class="talcard" data-r="svc-heal" ${RUN.gold < 50 || RUN.lp >= RUN.maxLp ? 'disabled' : ''}><b>Heiltrank</b><span>Stellt 2000 LP wieder her.</span><em>50 G</em></button>
    </div>
    <div class="row-btns"><button class="btn primary" data-r="leave">Laden verlassen</button></div>
  </section>`);
  render();
  return new Promise(resolve => {
    const handler = async e => {
      const b = e.target.closest('[data-r]');
      if (!b || b.disabled) return;
      e.stopPropagation();
      const r = b.dataset.r;
      if (r === 'buy') {
        const s = stock[+b.dataset.i];
        if (s.sold || RUN.gold < s.price || !canTake(s.id)) return;
        RUN.gold -= s.price; s.sold = true; addCard(s.id); toast(`${CARDS[s.id].name} gekauft`);
      } else if (r === 'buytal') {
        const t = tals[+b.dataset.i];
        const T = TALISMANS[t.k];
        if (t.sold || RUN.gold < T.price) return;
        RUN.gold -= T.price; t.sold = true; gainTalisman(t.k);
      } else if (r === 'svc-remove') {
        const ok = await removeCardDialog();
        if (ok) { RUN.gold -= 60; removed = true; }
      } else if (r === 'svc-heal') {
        RUN.gold -= 50; RUN.lp = Math.min(RUN.maxLp, RUN.lp + 2000); toast('2000 LP wiederhergestellt');
      } else if (r === 'leave') {
        app().removeEventListener('click', handler, true);
        save();
        resolve(afterNode());
        return;
      } else return;
      save();
      render();
    };
    app().addEventListener('click', handler, true);
  });
}

async function removeCardDialog() {
  if (RUN.deck.length <= 20) { toast('Dein Deck braucht mindestens 20 Karten.'); return false; }
  const ids = [...new Set(RUN.deck)].sort((a, b) => CARDS[a].name.localeCompare(CARDS[b].name));
  const i = await chooseCard('Welche Karte entfernen?', ids.map(id => CARDS[id]), { hint: 'Ein Exemplar der gewählten Karte wird aus deinem Deck entfernt.' });
  if (i == null) return false;
  RUN.deck.splice(RUN.deck.indexOf(ids[i]), 1);
  toast(`${CARDS[ids[i]].name} entfernt`);
  return true;
}

/* ---------- Rast ---------- */
function restScreen() {
  const healAmt = Math.round(RUN.maxLp * 0.5);
  show(`${headerHTML()}<section class="screen narrow">
    <h2>Rastplatz</h2><p class="sub">Ein ruhiger Ort am Wegesrand. Du hast Zeit für eine Sache.</p>
    <div class="tal-row">
      <button class="talcard" data-r="rest-heal"><b>Ausruhen</b><span>Stelle ${healAmt} LP wieder her.</span></button>
      <button class="talcard" data-r="rest-remove" ${RUN.deck.length <= 20 ? 'disabled' : ''}><b>Deck ausdünnen</b><span>Entferne eine Karte kostenlos aus deinem Deck.</span></button>
      <button class="talcard" data-r="rest-train"><b>Training</b><span>Erhalte eine zufällige seltene Karte aus deinen Hauptthemen.</span></button>
    </div>
  </section>`);
  return new Promise(resolve => {
    const handler = async e => {
      const b = e.target.closest('[data-r]');
      if (!b || b.disabled) return;
      const r = b.dataset.r;
      if (r === 'rest-heal') { RUN.lp = Math.min(RUN.maxLp, RUN.lp + healAmt); toast(`${healAmt} LP wiederhergestellt`); }
      else if (r === 'rest-remove') { if (!(await removeCardDialog())) return; }
      else if (r === 'rest-train') {
        const themes = playerThemes();
        const pool = ALL.filter(c => c.type === 'monster' && themes.includes(c.theme) && c.rar === 'R' && canTake(c.id));
        const c = pool.length ? pick(pool) : CARDS[pick(rewardCards(1, 0.5))];
        addCard(c.id);
        if (!AUTO) await modal({ title: 'Training abgeschlossen', html: `<div class="card-grid">${cardHTML(c, { size: 'lg' })}</div>` });
      } else return;
      app().removeEventListener('click', handler, true);
      save();
      resolve(afterNode());
    };
    app().addEventListener('click', handler, true);
  });
}

/* ---------- Booster ---------- */
function packScreen() {
  const cards = rewardCards(5, 0.3, playerThemes());
  let picks = 0;
  const taken = new Set();
  const render = () => show(`${headerHTML()}<section class="screen">
    <h2>Boosterpack</h2><p class="sub">Du öffnest ein Päckchen mit 5 Karten. Behalte 2 davon (${2 - picks} übrig).</p>
    <div class="reward-row">${cards.map((id, i) => rewardCardHTML(id, i, taken.has(i) || picks >= 2 || !canTake(id) ? 'disabled' : '').replace('class="reward"', `class="reward ${taken.has(i) ? 'taken' : ''}"`)).join('')}</div>
    <div class="row-btns"><button class="btn ${picks >= 2 ? 'primary' : ''}" data-r="leave">${picks >= 2 ? 'Weiter' : 'Rest liegen lassen'}</button></div>
  </section>`);
  render();
  return new Promise(resolve => {
    const handler = e => {
      const b = e.target.closest('[data-r]');
      if (!b || b.disabled) return;
      if (b.dataset.r === 'reward' && picks < 2) {
        const i = +b.dataset.i;
        addCard(cards[i]); taken.add(i); picks++;
        save(); render();
      } else if (b.dataset.r === 'leave') {
        app().removeEventListener('click', handler, true);
        save();
        resolve(afterNode());
      }
    };
    app().addEventListener('click', handler, true);
  });
}

/* ---------- Ereignisse ---------- */
const EVENTS = [
  {
    title: 'Verlassener Kartenkoffer',
    text: 'Am Wegrand liegt ein offener Koffer voller Karten. Niemand ist zu sehen.',
    opts: [
      { label: 'Eine Karte herausnehmen', run: async () => { const id = rewardCards(1, 0.8)[0]; addCard(id); return `Du findest ${CARDS[id].name}.`; }, card: true },
      { label: 'Die Goldmünzen im Deckel nehmen (+70 Gold)', run: async () => { RUN.gold += 70; return 'Du steckst 70 Gold ein.'; } },
    ],
  },
  {
    title: 'Mysteriöser Händler',
    text: 'Ein Händler in grauem Mantel bietet dir eine seltene Karte an. Bezahlen sollst du mit Lebensenergie.',
    opts: [
      { label: '1500 LP zahlen für eine super seltene Karte', cond: () => RUN.lp > 1500, run: async () => { RUN.lp -= 1500; const pool = ALL.filter(c => isMainPool(c) && rarIdx(c) >= 2 && canTake(c.id)); const c = pick(pool); addCard(c.id); return `Du erhältst ${c.name}.`; } },
      { label: 'Ablehnen', run: async () => 'Der Händler zuckt mit den Schultern und verschwindet im Nebel.' },
    ],
  },
  {
    title: 'Münzwurf',
    text: 'Ein gelangweilter Duellant schlägt eine Wette vor: Kopf oder Zahl um 50 Gold.',
    opts: [
      { label: 'Wetten (50 Gold)', cond: () => RUN.gold >= 50, run: async () => { if (Math.random() < 0.5) { RUN.gold += 70; return 'Kopf! Du gewinnst 70 Gold dazu.'; } RUN.gold -= 50; return 'Zahl. Die 50 Gold sind weg.'; } },
      { label: 'Weitergehen', run: async () => 'Du hast Wichtigeres zu tun.' },
    ],
  },
  {
    title: 'Heilquelle',
    text: 'Eine klare Quelle sprudelt zwischen den Felsen. Das Wasser glitzert seltsam.',
    opts: [
      { label: 'Trinken (+2000 LP)', run: async () => { RUN.lp = Math.min(RUN.maxLp, RUN.lp + 2000); return 'Du fühlst dich erfrischt.'; } },
      { label: 'Eine Münze hineinwerfen (−20 Gold, Talisman-Chance)', cond: () => RUN.gold >= 20, run: async () => { RUN.gold -= 20; if (Math.random() < 0.35) { const k = pick(Object.keys(TALISMANS).filter(x => !RUN.talismans.includes(x))); if (k) { gainTalisman(k); return `Aus der Quelle steigt ein Talisman: ${TALISMANS[k].name}.`; } } return 'Die Münze versinkt. Nichts passiert.'; } },
    ],
  },
  {
    title: 'Kartentausch',
    text: 'Eine Sammlerin möchte tauschen: Eine deiner Karten gegen eine zufällige Karte aus ihrer Mappe.',
    opts: [
      { label: 'Tauschen', cond: () => RUN.deck.length > 20, run: async () => { const ok = await removeCardDialog(); if (!ok) return 'Du überlegst es dir anders.'; const id = rewardCards(1, 0.5)[0]; addCard(id); return `Du erhältst ${CARDS[id].name}.`; } },
      { label: 'Nicht tauschen', run: async () => 'Die Sammlerin nickt und zieht weiter.' },
    ],
  },
  {
    title: 'Wanderprediger der Duelle',
    text: '„Ein Deck ist nur so stark wie seine schwächste Karte“, ruft ein alter Mann und bietet an, dein Deck zu segnen.',
    opts: [
      { label: 'Segen annehmen (+500 max. LP)', run: async () => { RUN.maxLp += 500; RUN.lp += 500; return 'Deine maximalen LP steigen um 500.'; } },
      { label: 'Spenden (−40 Gold, eine seltene Karte)', cond: () => RUN.gold >= 40, run: async () => { RUN.gold -= 40; const id = rewardCards(1, 1)[0]; addCard(id); return `Er überreicht dir ${CARDS[id].name}.`; } },
    ],
  },
];

function eventScreen() {
  const ev = pick(EVENTS);
  show(`${headerHTML()}<section class="screen narrow">
    <span class="eyebrow">Ereignis</span><h2>${esc(ev.title)}</h2><p class="sub">${esc(ev.text)}</p>
    <div class="ev-opts">${ev.opts.map((o, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-r="ev" data-i="${i}" ${o.cond && !o.cond() ? 'disabled' : ''}>${esc(o.label)}</button>`).join('')}</div>
  </section>`);
  return new Promise(resolve => {
    const handler = async e => {
      const b = e.target.closest('[data-r="ev"]');
      if (!b || b.disabled) return;
      app().removeEventListener('click', handler, true);
      const msg = await ev.opts[+b.dataset.i].run();
      save();
      if (!AUTO) await modal({ title: ev.title, html: `<p>${esc(msg)}</p>` });
      resolve(afterNode());
    };
    app().addEventListener('click', handler, true);
  });
}

/* ---------- Deck-Ansicht ---------- */
function deckModal() {
  const group = ids => {
    const m = {};
    ids.forEach(id => (m[id] = (m[id] || 0) + 1));
    return Object.entries(m).sort((a, b) => {
      const A = CARDS[a[0]], B = CARDS[b[0]];
      const ord = c => (c.type === 'monster' ? 0 : c.type === 'spell' ? 1 : 2);
      return ord(A) - ord(B) || (B.lvl || 0) - (A.lvl || 0) || A.name.localeCompare(B.name);
    });
  };
  const sec = (title, ids) => `<h4 class="sec">${title} (${ids.length})</h4><div class="card-grid">${group(ids).map(([id, n]) => `<div class="deckcard">${cardHTML(CARDS[id], { size: 'lg' })}${n > 1 ? `<span class="cnt">×${n}</span>` : ''}</div>`).join('')}</div>`;
  const mon = RUN.deck.filter(id => CARDS[id].type === 'monster'), sp = RUN.deck.filter(id => CARDS[id].type === 'spell'), tr = RUN.deck.filter(id => CARDS[id].type === 'trap');
  modal({
    title: `Dein Deck (${RUN.deck.length} Karten)`, wide: true, dismiss: true,
    html: sec('Monster', mon) + sec('Zauber', sp) + sec('Fallen', tr) + (RUN.extra.length ? sec('Extra-Deck', RUN.extra) : ''),
    buttons: [{ label: 'Schließen', value: true, primary: true }],
  });
}

/* ---------- Ende ---------- */
function gameOver(won, by) {
  clearSave();
  const best = getBest();
  const champion = won;
  if (!best || RUN.badges > best.badges || (champion && !best.champion)) setBest({ badges: RUN.badges, champion });
  show(`<section class="screen narrow end ${won ? 'won' : 'lost'}">
    <span class="eyebrow">${won ? 'Champion' : 'Lauf beendet'}</span>
    <h2>${won ? 'Du hast den Großmeister besiegt!' : `Besiegt von ${esc(by)}`}</h2>
    <p class="sub">${won ? 'Alle acht Wappen und der Titel gehören dir.' : `Du hast ${RUN.badges} von 8 Wappen errungen.`}</p>
    <dl class="stats"><div><dt>Siege</dt><dd>${RUN.stats.wins}</dd></div><div><dt>Duelle</dt><dd>${RUN.stats.duels}</dd></div><div><dt>Neue Karten</dt><dd>${RUN.stats.cards}</dd></div><div><dt>Wappen</dt><dd>${RUN.badges}</dd></div></dl>
    <div class="row-btns"><button class="btn primary big" data-r="new">Neuer Lauf</button><button class="btn" data-r="title">Titelbildschirm</button></div>
  </section>`);
  window.__gameOver = { won, badges: RUN.badges };
}

function howto() {
  modal({
    title: 'Spielregeln', wide: true, dismiss: true,
    html: `<div class="howto">
      <h4>Der Lauf</h4>
      <p>Du wählst ein Starterdeck und ziehst über eine verzweigte Karte. Am Ende jeder Karte wartet ein Arenaleiter. Besiege alle acht und danach den Großmeister. Deine LP bleiben zwischen Duellen erhalten. Verlierst du ein Duell, endet der Lauf.</p>
      <p><b>Duell</b> bringt Gold und eine Kartenwahl, <b>Elite</b> bessere Karten und einen Talisman. Im <b>Laden</b> kaufst du Karten, Talismane und Dienste, an der <b>Rast</b> heilst du dich oder dünnst dein Deck aus. <b>Booster</b> enthalten 5 Karten, von denen du 2 behältst. <b>Ereignisse</b> sind Glückssache.</p>
      <h4>Das Duell</h4>
      <ul>
        <li>Jeder Zug: Karte ziehen, Hauptphase, Kampfphase, Endphase. Im allerersten Zug wird nicht angegriffen.</li>
        <li>Einmal pro Zug darfst du ein Monster normal beschwören oder verdeckt setzen. Stufe 5–6 braucht 1 Tribut, Stufe 7 und höher 2.</li>
        <li>Angriffsposition gegen Angriffsposition: Das schwächere Monster wird zerstört, sein Besitzer verliert die Differenz an LP.</li>
        <li>Gegen Verteidigungsposition: Ist die ATK höher als die DEF, wird der Verteidiger zerstört (ohne Schaden). Ist sie niedriger, verliert der Angreifer die Differenz.</li>
        <li>Verdeckte Monster werden beim Angriff aufgedeckt. FLIPP-Effekte lösen dann aus.</li>
        <li>Fallen setzt du verdeckt. Ab deinem nächsten Zug werden sie dir angeboten, sobald ihr Auslöser eintritt.</li>
        <li><b>Verschmelzung</b> kombiniert zwei passende Monster von Hand oder Feld zu einem Fusionsmonster aus dem Extra-Deck. <b>Ritualzauber</b> beschwören ein Ritualmonster gegen Tribute, deren Stufen zusammen reichen.</li>
        <li>Handlimit am Zugende: 6 Karten. Wer nicht mehr ziehen kann, verliert.</li>
      </ul></div>`,
    buttons: [{ label: 'Verstanden', value: true, primary: true }],
  });
}

/* ---------- Globale Klicks ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-r]');
  if (!b || b.disabled) return;
  if (!app().contains(b)) return;
  const r = b.dataset.r;
  if (r === 'new') starterScreen();
  else if (r === 'title') titleScreen();
  else if (r === 'howto') howto();
  else if (r === 'continue') { RUN = loadSave(); if (RUN) { if (RUN.map.pos && availableNodes().length === 0) afterNode(); else mapScreen(); } }
  else if (r === 'starter') newRun(b.dataset.id);
  else if (r === 'node') enterNode(+b.dataset.row, +b.dataset.i);
  else if (r === 'deck') deckModal();
  else if (r === 'abandon') {
    const ok = await modal({ title: 'Lauf aufgeben?', html: '<p>Dein aktueller Fortschritt geht verloren.</p>', buttons: [{ label: 'Weiterspielen', value: false }, { label: 'Aufgeben', value: true, danger: true }] });
    if (ok) gameOver(false, 'Aufgabe');
  }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('g.node.avail')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
});

titleScreen();
