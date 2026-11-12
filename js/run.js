/* =========================================================
   Lauf-Logik (Pokelike-Prinzip)
   Team aus bis zu 6 Monstern, Stufen und Entwicklungen,
   Fangen, Items, Tausch, Rast, Arenaleiter.
   ========================================================= */

const SAVE_KEY = 'duellpfad-run-v2';
const BEST_KEY = 'duellpfad-best-v1';
const PARAMS = new URLSearchParams(location.search);
const AUTO = PARAMS.has('auto');
const TEAM_MAX = 6;

let RUN = null;
let uidc = 1;
const app = () => document.getElementById('app');

/* ---------- Speichern ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(RUN)); } catch (e) { /* ohne Speicher spielbar */ } }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* egal */ } }
function getBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || null; } catch (e) { return null; } }
function setBest(b) { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* egal */ } }

/* ---------- Monster ---------- */
const ALL = Object.values(CARDS);
const rarIdx = c => RAR_ORDER[c.rar];
const xpNeed = lvl => 6 + lvl * 4;
const maxHpOf = m => Stats.of(m, RUN ? RUN.talismans : []).maxHp;

function mkMon(id, lvl, item = null) {
  const m = { uid: Date.now().toString(36) + (uidc++), id, lvl, xp: 0, hp: 0, item };
  m.hp = Stats.of(m, RUN ? RUN.talismans : []).maxHp;
  return m;
}
function setLevel(m, lvl) {
  const before = maxHpOf(m);
  m.lvl = lvl;
  if (m.hp > 0) m.hp += maxHpOf(m) - before;
}
function transform(m, id) {
  const ratio = m.hp / maxHpOf(m);
  m.id = id;
  m.hp = m.hp > 0 ? Math.max(1, Math.round(maxHpOf(m) * ratio)) : 0;
}
const alive = team => team.filter(m => m.hp > 0);

function rollRarity(weights) {
  const tot = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot;
  for (let i = 0; i < weights.length; i++) { if ((r -= weights[i]) < 0) return i; }
  return 0;
}

/* Stufenbereich der aktuellen Arena */
const baseLvl = () => 4 + RUN.arena * 4;

/* Wilde Monster: niedrige Entwicklungsstufen bevorzugt */
const evolvedFrom = new Set(Object.values(EVOS).map(e => e[0]));
function wildPool(maxR) {
  return ALL.filter(c => c.type === 'monster' && (c.kind === 'normal' || c.kind === 'effect') && rarIdx(c) <= maxR);
}
function wildChoices(n) {
  const a = RUN.arena;
  const w = [Math.max(15, 60 - a * 6), 30 + a * 2, Math.max(3, 4 + a * 2.5), Math.max(0.5, a * 1.2 - 1)];
  const out = [];
  let g = 0;
  while (out.length < n && g++ < 300) {
    const ri = rollRarity(w);
    let pool = wildPool(3).filter(c => rarIdx(c) === ri && !out.some(o => o.id === c.id));
    // Grundformen sind häufiger
    if (Math.random() < 0.7) { const basic = pool.filter(c => !evolvedFrom.has(c.id)); if (basic.length) pool = basic; }
    if (!pool.length) continue;
    const c = pick(pool);
    const lvl = Math.max(2, baseLvl() + rnd(3) - (ri >= 2 ? 2 : 0));
    out.push({ id: c.id, lvl });
  }
  return out;
}

function itemChoices(n, boost = 0) {
  const a = RUN.arena;
  const w = [Math.max(10, 55 - a * 5 - boost * 20), 35 + boost * 10, 8 + a * 2 + boost * 12, Math.max(0.5, a * 0.8 - 1 + boost * 6)];
  const out = [];
  let g = 0;
  while (out.length < n && g++ < 300) {
    const ri = rollRarity(w);
    const pool = ALL.filter(c => c.type !== 'monster' && rarIdx(c) === ri && !out.includes(c.id));
    if (pool.length) out.push(pick(pool).id);
  }
  return out;
}

/* ---------- Gegner ---------- */
const THEME_RACE = { krieger: 'Krieger', drache: 'Drache', hexer: 'Hexer', wasser: 'Aqua', wind: 'Geflügeltes Ungeheuer', zombie: 'Zombie', maschine: 'Maschine', feuer: 'Pyro', licht: 'Fee' };

/* Passende Form zur Stufe (entwickelt Gegner automatisch) */
function evolveFor(id, lvl) {
  let cur = id;
  for (let g = 0; g < 4; g++) { const e = EVOS[cur]; if (e && lvl >= e[1]) cur = e[0]; else break; }
  return cur;
}

function genEnemy(type) {
  const a = RUN.arena;
  if (type === 'boss') {
    const L = a < 8 ? LEADERS[a] : FINAL_BOSS;
    const top = baseLvl() + (a === 0 ? 2 : a < 8 ? 3 : 6);
    const team = L.team.map((id, i) => mkMon(id, Math.max(2, top - (L.team.length - 1 - i)), L.items[id] || null));
    return { name: L.name, title: L.title, team };
  }
  const elite = type === 'elite';
  const theme = Math.random() < 0.6 ? ARENA_THEMES[Math.min(a, 7)] : pick(Object.keys(THEME_LABEL));
  const size = Math.min(6, (elite ? 2 : 1) + Math.floor(a / 2) + (a > 0 ? rnd(2) : 0));
  const maxR = Math.min(3, Math.floor(a / 3) + (elite ? 1 : 0));
  const pool = wildPool(maxR).filter(c => c.theme === theme);
  const team = [];
  for (let i = 0; i < size; i++) {
    const lvl = Math.max(2, baseLvl() - 2 + rnd(3) + (elite ? (a === 0 ? 1 : 2) : 0));
    const c = pick(pool.length ? pool : wildPool(maxR));
    const item = (elite || a >= 3) && Math.random() < (elite ? 0.7 : 0.25) ? pick(itemChoices(3).filter(id => !isConsumable(id))) || null : null;
    team.push(mkMon(evolveFor(c.id, lvl), lvl, item));
  }
  return { name: pick(DUELIST_NAMES), title: `${pick(elite ? ELITE_TITLES : DUELIST_TITLES)} · ${THEME_LABEL[theme]}`, team };
}

/* ---------- Karte ---------- */
const NODE_INFO = {
  duel: { label: 'Duell', sym: '⚔︎' }, elite: { label: 'Elite', sym: '✦' }, catch: { label: 'Begegnung', sym: '◎' },
  item: { label: 'Item', sym: '▤' }, rest: { label: 'Rast', sym: '+' }, trade: { label: 'Tausch', sym: '⇄' },
  event: { label: 'Ereignis', sym: '?' }, boss: { label: 'Arenaleiter', sym: '♛' },
};

function genMap(arena) {
  const R = arena === 8 ? 4 : 6;
  const rows = [];
  for (let r = 0; r < R; r++) {
    const lanes = shuffle([0, 1, 2]).slice(0, 2 + rnd(2)).sort();
    const row = lanes.map(l => ({ lane: l, t: 'duel', next: [] }));
    row.forEach((n, k) => {
      if (r === 0) n.t = k === 0 ? 'catch' : 'duel';
      else if (r === R - 1) n.t = 'rest';
      else {
        const opts = [['duel', 34], ['catch', 22], ['item', 13], ['event', 9], ['trade', 7], ['rest', 9], ['elite', r >= 2 ? 12 : 0]];
        n.t = opts[rollRarity(opts.map(o => o[1]))][0];
      }
    });
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
      if (!cur.some(n => n.next.includes(i))) cur.reduce((b, n) => (Math.abs(n.lane - m.lane) < Math.abs(b.lane - m.lane) ? n : b), cur[0]).next.push(i);
    });
  }
  return { rows, pos: null, visited: [] };
}

function availableNodes() {
  const { rows, pos } = RUN.map;
  if (!pos) return rows[0].map((_, i) => [0, i]);
  if (pos[0] + 1 >= rows.length) return [];
  return rows[pos[0]][pos[1]].next.map(j => [pos[0] + 1, j]);
}

/* ---------- Darstellung ---------- */
function show(html) { app().innerHTML = html; window.scrollTo(0, 0); }

function monChip(m, opts = {}) {
  const c = CARDS[m.id];
  const mx = maxHpOf(m);
  const r = m.hp / mx;
  return `<div class="chip ${m.hp <= 0 ? 'down' : ''}" ${opts.attrs || ''}>
    <div class="bm-art" style="--a1:${ATTR_COLORS[c.attr][0]};--a2:${ATTR_COLORS[c.attr][1]}">${initials(c.name)}</div>
    <div class="chip-info"><b>${esc(c.name)}</b><small>St. ${m.lvl}${m.item ? ' · ' + esc(CARDS[m.item].name) : ''}</small>
    <div class="hpbar"><i style="width:${Math.max(0, r * 100)}%" class="${Battle.hpClass(r)}"></i></div></div></div>`;
}

function headerHTML(teamBtn = false) {
  const a = RUN.arena;
  const L = a < 8 ? LEADERS[a] : FINAL_BOSS;
  return `<header class="runbar">
    <div class="rb-arena"><span class="eyebrow">${a < 8 ? `Arena ${a + 1} von 8` : 'Finale'}</span><b>${esc(L.name)}</b><small>${esc(L.title)}</small></div>
    <div class="rb-stats">
      <div class="badges">${Array.from({ length: 8 }, (_, i) => `<span class="badge ${i < RUN.badges ? 'won' : ''}" title="${esc(LEADERS[i].name)}">${i + 1}</span>`).join('')}</div>
      ${teamBtn ? '<button class="btn small primary" data-r="team">Team &amp; Items</button>' : ''}
    </div>
    <div class="team-strip">${RUN.team.map(m => monChip(m)).join('')}</div>
    ${RUN.talismans.length ? `<div class="tals">${RUN.talismans.map(k => `<span class="tal" title="${esc(TALISMANS[k].text)}">${esc(TALISMANS[k].name)}</span>`).join('')}</div>` : ''}
  </header>`;
}

function titleScreen() {
  const saved = loadSave();
  const best = getBest();
  show(`<section class="title-screen">
    <div class="title-cards" aria-hidden="true">${['d7', 'h7', 'k10'].map(id => cardHTML(CARDS[id], { size: 'md' })).join('')}</div>
    <h1>Duellpfad</h1>
    <p class="tagline">Ein Monster-Roguelike mit Autokämpfen. Wähle einen Starter, fange Monster, stelle dein Team zusammen und besiege acht Arenaleiter und den Großmeister.</p>
    <div class="title-btns">
      ${saved ? `<button class="btn primary big" data-r="continue">Lauf fortsetzen <small>${saved.arena >= 8 ? 'Finale' : 'Arena ' + (saved.arena + 1)}</small></button>` : ''}
      <button class="btn ${saved ? '' : 'primary'} big" data-r="new">Neuer Lauf</button>
      <button class="btn" data-r="howto">Spielregeln</button>
    </div>
    ${best ? `<p class="best">Bester Lauf: ${best.badges} Wappen${best.champion ? ' · Champion' : ''}</p>` : ''}
  </section>`);
}

function starterScreen() {
  show(`<section class="screen">
    <h2>Wähle deinen Starter</h2>
    <p class="sub">Typvorteile: Feuer schlägt Wind, Wind schlägt Erde, Erde schlägt Wasser, Wasser schlägt Feuer. Licht und Finsternis sind gegeneinander sehr effektiv.</p>
    <div class="starters">${STARTERS.map(s => `
      <button class="starter" data-r="starter" data-id="${s.id}">
        ${cardHTML(CARDS[s.id], { size: 'lg' })}
        <div class="st-info"><span class="eyebrow">${s.tag}</span><h3>${esc(CARDS[s.id].name)}</h3><p>${s.blurb}</p></div>
      </button>`).join('')}</div>
    <button class="btn" data-r="title">Zurück</button>
  </section>`);
}

function newRun(starterId) {
  RUN = { team: [], box: [], bag: ['s_fusion'], talismans: [], arena: 0, badges: 0, map: genMap(0), herzUsed: false, stats: { wins: 0, caught: 0, battles: 0 } };
  RUN.team.push(mkMon(starterId, 7, 's_heal'));
  save();
  mapScreen();
}

function mapScreen() {
  const map = RUN.map;
  const rows = map.rows;
  const W = 340, rowH = 92, top = 46;
  const H = top + rowH * (rows.length - 1) + 60;
  const X = l => 70 + l * 100, Y = r => top + r * rowH;
  const avail = availableNodes();
  const has = (arr, r, i) => arr.some(v => v[0] === r && v[1] === i);
  let lines = '', nodes = '';
  rows.forEach((row, r) => row.forEach((n, i) => n.next.forEach(j => {
    const m = rows[r + 1][j];
    const trav = has(map.visited, r, i) && has(map.visited, r + 1, j);
    lines += `<line x1="${X(n.lane)}" y1="${Y(r)}" x2="${X(m.lane)}" y2="${Y(r + 1)}" class="${trav ? 'trav' : ''}"/>`;
  })));
  rows.forEach((row, r) => row.forEach((n, i) => {
    const info = NODE_INFO[n.t];
    const isA = has(avail, r, i);
    const cur = map.pos && map.pos[0] === r && map.pos[1] === i;
    const rad = n.t === 'boss' ? 30 : 22;
    nodes += `<g class="node n-${n.t} ${isA ? 'avail' : ''} ${has(map.visited, r, i) ? 'visited' : ''} ${cur ? 'cur' : ''}" ${isA ? `data-r="node" data-row="${r}" data-i="${i}" tabindex="0" role="button" aria-label="${info.label}"` : ''} transform="translate(${X(n.lane)},${Y(r)})">
      <circle r="${rad}"/><text class="sym" dy="0.35em">${info.sym}</text><text class="lbl" dy="${rad + 15}">${info.label}</text></g>`;
  }));
  const L = RUN.arena < 8 ? LEADERS[RUN.arena] : FINAL_BOSS;
  const warn = alive(RUN.team).length === 0 ? '<p class="warn-box">Alle Monster in deinem Team sind besiegt. Tausche im Teammenü ein kampffähiges Monster aus der Box ein.</p>' : '';
  show(`${headerHTML(true)}<section class="screen map-screen">
    <div class="map-head"><h2>${RUN.arena < 8 ? `Weg zur Arena von ${esc(L.name)}` : 'Der Weg zum Großmeister'}</h2>
    <p class="sub">Wähle den nächsten Ort. Der Arenaleiter setzt auf ${L.themes.map(t => THEME_LABEL[t]).join(' und ')}, sein stärkstes Monster ist auf Stufe ${baseLvl() + (RUN.arena === 0 ? 2 : RUN.arena < 8 ? 3 : 6)}.</p>${warn}</div>
    <div class="map-wrap"><svg viewBox="0 0 ${W} ${H}" class="map">${lines}${nodes}</svg></div>
    <div class="legend">${Object.entries(NODE_INFO).map(([k, v]) => `<span class="lg n-${k}"><i>${v.sym}</i>${v.label}</span>`).join('')}</div>
    <div class="map-foot"><button class="btn small" data-r="abandon">Lauf aufgeben</button></div>
  </section>`);
}

async function enterNode(r, i) {
  const n = RUN.map.rows[r][i];
  RUN.map.pos = [r, i];
  RUN.map.visited.push([r, i]);
  save();
  switch (n.t) {
    case 'duel': case 'elite': case 'boss': return battleNode(n.t);
    case 'catch': return catchScreen();
    case 'item': return itemScreen();
    case 'rest': return restScreen();
    case 'trade': return tradeScreen();
    case 'event': return eventScreen();
  }
}

function afterNode(type) {
  const { rows, pos } = RUN.map;
  if (type === 'boss' || (pos && pos[0] === rows.length - 1)) {
    RUN.arena++;
    RUN.map = genMap(RUN.arena);
    if (!AUTO) toast(RUN.arena < 8 ? `Weiter zu Arena ${RUN.arena + 1}` : 'Das Finale wartet');
  }
  save();
  mapScreen();
}

/* ---------- Kampf ---------- */
async function battleNode(type) {
  const enemy = genEnemy(type);
  if (!AUTO) {
    const ace = type === 'boss' ? CARDS[(RUN.arena < 8 ? LEADERS[RUN.arena] : FINAL_BOSS).ace] : null;
    const go = await modal({
      title: type === 'boss' ? 'Arenakampf' : type === 'elite' ? 'Elite-Duell' : 'Duell',
      html: `<div class="vs"><div><b>${esc(enemy.name)}</b><small>${esc(enemy.title)}</small><span>${enemy.team.length} Monster · Stufe ${Math.min(...enemy.team.map(m => m.lvl))}–${Math.max(...enemy.team.map(m => m.lvl))}</span></div>${ace ? cardHTML(ace, { size: 'md' }) : ''}</div>
        <div class="enemy-preview">${enemy.team.map(m => `<span class="ep" style="--a1:${ATTR_COLORS[CARDS[m.id].attr][0]}">${CARDS[m.id].attr}</span>`).join('')}</div>
        <p class="hint">Der Kampf läuft automatisch. Dein vorderstes kampffähiges Monster tritt zuerst an. Die Reihenfolge änderst du unter „Team &amp; Items“.</p>`,
      buttons: [{ label: 'Team ordnen', value: 'team' }, { label: 'Kampf beginnen', value: true, primary: true }],
    });
    if (go === 'team') { await teamScreen(true); }
  }
  RUN.stats.battles++;
  const res = Battle.simulate(RUN.team, enemy.team, RUN.talismans);
  await Battle.play(res, { label: type === 'boss' ? `Arenakampf gegen ${enemy.name}` : `${type === 'elite' ? 'Elite-Duell' : 'Duell'} gegen ${enemy.name}`, enemyName: `${enemy.name} · ${enemy.title}`, instant: AUTO });
  RUN.team.forEach((m, i) => { m.hp = res.hp[i]; });

  if (!res.won) {
    if (RUN.talismans.includes('herz') && !RUN.herzUsed) {
      RUN.herzUsed = true;
      RUN.team.forEach(m => { m.hp = Math.round(maxHpOf(m) / 2); });
      save();
      if (!AUTO) await modal({ title: 'Zweites Herz', html: '<p>Dein Talisman zerspringt. Dein ganzes Team steht mit der Hälfte seiner KP wieder auf.</p>' });
      return afterNode();
    }
    return gameOver(false, enemy.name);
  }
  RUN.stats.wins++;
  const xpMsgs = await grantXp(enemy.team, type);
  const regen = RUN.talismans.includes('blut') ? 0.4 : 0.2;
  RUN.team.forEach(m => { if (m.hp > 0) m.hp = Math.min(maxHpOf(m), m.hp + Math.round(maxHpOf(m) * regen)); });
  if (type === 'boss') {
    RUN.badges = Math.max(RUN.badges, RUN.arena + 1);
    RUN.team.forEach(m => { m.hp = maxHpOf(m); });
    if (RUN.arena === 8) { save(); return gameOver(true); }
  }
  save();
  return rewardScreen(type, xpMsgs);
}

async function grantXp(enemyTeam, type) {
  const avg = enemyTeam.reduce((s, m) => s + m.lvl, 0) / enemyTeam.length;
  const base = (6 + 4 * avg) * (0.9 + 0.12 * enemyTeam.length);
  const mult = (type === 'boss' ? 1.6 : type === 'elite' ? 1.3 : 1) * (RUN.talismans.includes('lern') ? 1.3 : 1);
  const msgs = [];
  for (const m of RUN.team) {
    let gain = Math.round(base * mult * (m.item === 's_draw' ? 1.5 : 1) * (m.hp > 0 ? 1 : 0.5));
    m.xp += gain;
    const startLvl = m.lvl;
    while (m.xp >= xpNeed(m.lvl) && m.lvl < 60) { m.xp -= xpNeed(m.lvl); setLevel(m, m.lvl + 1); }
    if (m.lvl > startLvl) msgs.push(`${CARDS[m.id].name} erreicht Stufe ${m.lvl}.`);
    const e = EVOS[m.id];
    if (e && m.lvl >= e[1]) {
      const from = CARDS[m.id].name;
      transform(m, e[0]);
      msgs.push(`${from} entwickelt sich zu ${CARDS[m.id].name}!`);
      if (!AUTO) await modal({ title: 'Entwicklung!', html: `<p>${esc(from)} entwickelt sich zu <b>${esc(CARDS[m.id].name)}</b>!</p><div class="card-grid">${cardHTML(CARDS[m.id], { size: 'lg' })}</div>` });
    }
  }
  return msgs;
}

async function rewardScreen(type, xpMsgs) {
  const items = itemChoices(type === 'duel' ? 2 : 3, type === 'boss' ? 1.2 : type === 'elite' ? 0.6 : 0);
  const tals = type === 'duel' ? [] : shuffle(Object.keys(TALISMANS).filter(k => !RUN.talismans.includes(k))).slice(0, type === 'boss' ? 3 : 2);
  show(`${headerHTML()}<section class="screen">
    <h2>${type === 'boss' ? `Wappen ${RUN.arena + 1} errungen!` : 'Sieg!'}</h2>
    <p class="sub">${type === 'boss' ? 'Dein Team ist vollständig geheilt. ' : ''}${xpMsgs.length ? esc(xpMsgs.join(' ')) : 'Dein Team sammelt Erfahrung.'}</p>
    <h3 class="sec">Wähle ein Item</h3>
    <div class="reward-row">${items.map((id, i) => `<button class="reward" data-r="reward" data-i="${i}">${cardHTML(CARDS[id], { size: 'lg' })}</button>`).join('')}</div>
    ${tals.length ? `<h3 class="sec">Wähle einen Talisman</h3><div class="tal-row">${tals.map(k => `<button class="talcard" data-r="tal" data-k="${k}"><b>${esc(TALISMANS[k].name)}</b><span>${esc(TALISMANS[k].text)}</span></button>`).join('')}</div>` : ''}
    <div class="row-btns"><button class="btn" data-r="skip">Kein Item nehmen</button></div>
  </section>`);
  return new Promise(resolve => {
    let itemDone = false, talDone = !tals.length;
    const fin = () => { if (itemDone && talDone) { app().removeEventListener('click', h, true); save(); resolve(afterNode(type)); } };
    const h = e => {
      const b = e.target.closest('[data-r]');
      if (!b || b.disabled) return;
      if (b.dataset.r === 'reward' && !itemDone) { RUN.bag.push(items[+b.dataset.i]); itemDone = true; b.classList.add('taken'); app().querySelectorAll('[data-r="reward"],[data-r="skip"]').forEach(x => { x.disabled = true; }); toast(`${CARDS[items[+b.dataset.i]].name} in die Tasche gelegt`); fin(); }
      else if (b.dataset.r === 'skip' && !itemDone) { itemDone = true; app().querySelectorAll('[data-r="reward"],[data-r="skip"]').forEach(x => { x.disabled = true; }); fin(); }
      else if (b.dataset.r === 'tal' && !talDone) { gainTalisman(b.dataset.k); talDone = true; b.classList.add('taken'); app().querySelectorAll('.talcard').forEach(x => { x.disabled = true; }); fin(); }
    };
    app().addEventListener('click', h, true);
  });
}

function gainTalisman(k) {
  const ratios = RUN.team.concat(RUN.box).map(m => m.hp / maxHpOf(m));
  RUN.talismans.push(k);
  RUN.team.concat(RUN.box).forEach((m, i) => { m.hp = m.hp > 0 ? Math.max(1, Math.round(maxHpOf(m) * ratios[i])) : 0; });
  if (!AUTO) toast(`Talisman erhalten: ${TALISMANS[k].name}`);
}

function addMonster(m) {
  RUN.stats.caught++;
  if (RUN.team.length < TEAM_MAX) { RUN.team.push(m); return 'team'; }
  RUN.box.push(m);
  return 'box';
}

/* ---------- Begegnung (Fangen) ---------- */
function catchScreen() {
  const opts = wildChoices(RUN.talismans.includes('sammler') ? 4 : 3).map(o => mkMon(o.id, o.lvl));
  show(`${headerHTML()}<section class="screen">
    <span class="eyebrow">Begegnung</span><h2>Wilde Monster</h2>
    <p class="sub">Eines davon schließt sich dir an. ${RUN.team.length >= TEAM_MAX ? 'Dein Team ist voll, das neue Monster kommt in die Box.' : ''}</p>
    <div class="reward-row">${opts.map((m, i) => `<button class="reward" data-r="catch" data-i="${i}">${cardHTML(CARDS[m.id], { size: 'lg', atk: Stats.of(m).atk, def: Stats.of(m).def })}<span class="rnote">Stufe ${m.lvl} · ${maxHpOf(m)} KP</span></button>`).join('')}</div>
    <div class="row-btns"><button class="btn" data-r="leave">Weiterziehen</button></div>
  </section>`);
  return new Promise(resolve => {
    const h = e => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      if (b.dataset.r === 'catch') { const m = opts[+b.dataset.i]; const where = addMonster(m); toast(`${CARDS[m.id].name} ${where === 'team' ? 'ist jetzt in deinem Team' : 'wurde in die Box geschickt'}`); }
      else if (b.dataset.r !== 'leave') return;
      app().removeEventListener('click', h, true);
      save();
      resolve(afterNode());
    };
    app().addEventListener('click', h, true);
  });
}

/* ---------- Item-Fund ---------- */
function itemScreen() {
  const items = itemChoices(3, 0.3);
  show(`${headerHTML()}<section class="screen">
    <span class="eyebrow">Fund</span><h2>Verlassene Kartentruhe</h2>
    <p class="sub">Zauber- und Fallenkarten wirken als Items. Gib sie deinen Monstern unter „Team &amp; Items“ zum Tragen. Wähle eine Karte.</p>
    <div class="reward-row">${items.map((id, i) => `<button class="reward" data-r="take" data-i="${i}">${cardHTML(CARDS[id], { size: 'lg' })}</button>`).join('')}</div>
  </section>`);
  return new Promise(resolve => {
    const h = e => {
      const b = e.target.closest('[data-r="take"]');
      if (!b) return;
      RUN.bag.push(items[+b.dataset.i]);
      toast(`${CARDS[items[+b.dataset.i]].name} in die Tasche gelegt`);
      app().removeEventListener('click', h, true);
      save();
      resolve(afterNode());
    };
    app().addEventListener('click', h, true);
  });
}

/* ---------- Rast ---------- */
function restScreen() {
  RUN.team.concat(RUN.box).forEach(m => { m.hp = maxHpOf(m); });
  save();
  const draw = () => show(`${headerHTML()}<section class="screen narrow">
    <span class="eyebrow">Rast</span><h2>Lagerfeuer</h2>
    <p class="sub">Dein Team und alle Monster in der Box sind vollständig geheilt. Ein guter Moment, um Team und Items zu ordnen.</p>
    <div class="row-btns"><button class="btn" data-r="restteam">Team &amp; Items</button><button class="btn primary" data-r="leave">Weiterziehen</button></div>
  </section>`);
  draw();
  return new Promise(resolve => {
    const h = async e => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      if (b.dataset.r === 'restteam') { app().removeEventListener('click', h, true); await teamScreen(true); app().addEventListener('click', h, true); draw(); return; }
      if (b.dataset.r !== 'leave') return;
      app().removeEventListener('click', h, true);
      resolve(afterNode());
    };
    app().addEventListener('click', h, true);
  });
}

/* ---------- Tausch ---------- */
function tradeScreen() {
  const all = RUN.team.concat(RUN.box);
  show(`${headerHTML()}<section class="screen">
    <span class="eyebrow">Tausch</span><h2>Wandernde Sammlerin</h2>
    <p class="sub">Sie tauscht eines deiner Monster gegen ein zufälliges, meist selteneres Monster auf gleicher Stufe. Das Item behält das neue Monster.</p>
    <div class="chip-grid">${all.map((m, i) => `<button class="chip-btn" data-r="give" data-i="${i}">${monChip(m)}</button>`).join('')}</div>
    <div class="row-btns"><button class="btn" data-r="leave">Ablehnen</button></div>
  </section>`);
  return new Promise(resolve => {
    const h = async e => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      if (b.dataset.r === 'give') {
        const m = all[+b.dataset.i];
        const r = Math.min(3, rarIdx(CARDS[m.id]) + (Math.random() < 0.6 ? 1 : 0));
        const pool = wildPool(3).filter(c => rarIdx(c) === r && c.id !== m.id);
        const from = CARDS[m.id].name;
        const nid = evolveFor(pick(pool).id, m.lvl);
        transform(m, nid);
        m.xp = 0;
        if (!AUTO) await modal({ title: 'Tausch abgeschlossen', html: `<p>Du gibst ${esc(from)} und erhältst <b>${esc(CARDS[nid].name)}</b> (Stufe ${m.lvl}).</p><div class="card-grid">${cardHTML(CARDS[nid], { size: 'lg' })}</div>` });
      } else if (b.dataset.r !== 'leave') return;
      app().removeEventListener('click', h, true);
      save();
      resolve(afterNode());
    };
    app().addEventListener('click', h, true);
  });
}

/* ---------- Ereignisse ---------- */
const EVENTS = [
  {
    title: 'Trainingsplatz', text: 'Ein alter Meister bietet an, eines deiner Monster zu trainieren.',
    opts: [
      { label: 'Ein Monster trainieren (+3 Stufen)', run: async () => { const m = await pickMonster('Welches Monster trainieren?'); if (!m) return 'Du überlegst es dir anders.'; setLevel(m, m.lvl + 3); const e = EVOS[m.id]; let extra = ''; if (e && m.lvl >= e[1]) { const f = CARDS[m.id].name; transform(m, e[0]); extra = ` ${f} entwickelt sich zu ${CARDS[m.id].name}!`; } return `${CARDS[m.id].name} erreicht Stufe ${m.lvl}.${extra}`; } },
      { label: 'Ablehnen', run: async () => 'Der Meister nickt und meditiert weiter.' },
    ],
  },
  {
    title: 'Heilquelle', text: 'Eine klare Quelle sprudelt zwischen den Felsen.',
    opts: [
      { label: 'Team trinken lassen (50 % KP)', run: async () => { RUN.team.forEach(m => { m.hp = Math.min(maxHpOf(m), m.hp + Math.round(maxHpOf(m) / 2)); }); return 'Dein Team fühlt sich erfrischt. Auch besiegte Monster stehen wieder auf.'; } },
      { label: 'Nach Schätzen tauchen', run: async () => { if (Math.random() < 0.5) { const id = itemChoices(1, 1)[0]; RUN.bag.push(id); return `Du findest ${CARDS[id].name}.`; } return 'Nur Kieselsteine.'; } },
    ],
  },
  {
    title: 'Mysteriöser Händler', text: 'Ein Händler bietet ein seltenes Item. Bezahlen sollst du mit der Kraft eines Monsters.',
    opts: [
      { label: 'Ein Monster gibt 2 Stufen ab', cond: () => RUN.team.some(m => m.lvl > 3), run: async () => { const m = await pickMonster('Wer zahlt?', x => x.lvl > 3); if (!m) return 'Du überlegst es dir anders.'; setLevel(m, m.lvl - 2); const id = itemChoices(1, 1.5)[0]; RUN.bag.push(id); return `Du erhältst ${CARDS[id].name}.`; } },
      { label: 'Ablehnen', run: async () => 'Der Händler verschwindet im Nebel.' },
    ],
  },
  {
    title: 'Verirrtes Monster', text: 'Ein verletztes Monster folgt dir seit einer Weile.',
    opts: [
      { label: 'Mitnehmen', run: async () => { const o = wildChoices(1)[0]; const m = mkMon(o.id, o.lvl + 2); m.hp = Math.round(maxHpOf(m) * 0.4); addMonster(m); return `${CARDS[m.id].name} (Stufe ${m.lvl}) schließt sich dir an.`; } },
      { label: 'Ein Heilitem geben und weiterziehen', cond: () => RUN.bag.includes('s_heal'), run: async () => { RUN.bag.splice(RUN.bag.indexOf('s_heal'), 1); const id = itemChoices(1, 1)[0]; RUN.bag.push(id); return `Zum Dank lässt es ${CARDS[id].name} zurück.`; } },
    ],
  },
  {
    title: 'Duellgeist', text: 'Ein durchscheinender Duellant flüstert: „Opfere Kraft, und ich lehre dein Team.“',
    opts: [
      { label: 'Alle Monster verlieren 30 % KP, erhalten aber je 1 Stufe', run: async () => { RUN.team.forEach(m => { if (m.hp > 0) { m.hp = Math.max(1, m.hp - Math.round(maxHpOf(m) * 0.3)); setLevel(m, m.lvl + 1); } }); return 'Dein Team wird stärker, aber erschöpft.'; } },
      { label: 'Weitergehen', run: async () => 'Der Geist löst sich auf.' },
    ],
  },
];

async function pickMonster(title, filter = () => true) {
  const list = RUN.team.filter(filter);
  if (!list.length) return null;
  if (AUTO) return list[0];
  const r = await modal({
    title, wide: true,
    html: `<div class="chip-grid">${list.map((m, i) => `<button class="chip-btn" data-pick="${i}">${monChip(m)}</button>`).join('')}</div>`,
    buttons: [{ label: 'Abbrechen', value: null }],
  });
  return r && typeof r === 'object' ? list[r.pick] : null;
}

function eventScreen() {
  const ev = pick(EVENTS);
  show(`${headerHTML()}<section class="screen narrow">
    <span class="eyebrow">Ereignis</span><h2>${esc(ev.title)}</h2><p class="sub">${esc(ev.text)}</p>
    <div class="ev-opts">${ev.opts.map((o, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-r="ev" data-i="${i}" ${o.cond && !o.cond() ? 'disabled' : ''}>${esc(o.label)}</button>`).join('')}</div>
  </section>`);
  return new Promise(resolve => {
    const h = async e => {
      const b = e.target.closest('[data-r="ev"]');
      if (!b || b.disabled) return;
      app().removeEventListener('click', h, true);
      const msg = await ev.opts[+b.dataset.i].run();
      save();
      if (!AUTO) await modal({ title: ev.title, html: `<p>${esc(msg)}</p>` });
      resolve(afterNode());
    };
    app().addEventListener('click', h, true);
  });
}

/* ---------- Team & Items ---------- */
function fusionOptions() {
  const res = [];
  const match = (crit, c) => crit.id ? c.id === crit.id : crit.race ? c.race === crit.race : c.attr === crit.attr;
  for (const f of ALL.filter(c => c.kind === 'fusion')) {
    const [a, b] = f.mats;
    for (let i = 0; i < RUN.team.length; i++) for (let j = 0; j < RUN.team.length; j++) {
      if (i === j) continue;
      if (match(a, CARDS[RUN.team[i].id]) && match(b, CARDS[RUN.team[j].id]) && !res.some(r => r.f === f.id && ((r.i === i && r.j === j) || (r.i === j && r.j === i)))) res.push({ f: f.id, i, j });
    }
  }
  return res;
}

function teamScreen(fromBattle = false) {
  return new Promise(resolve => {
    let sel = null; // {where:'team'|'box', i}
    const render = () => {
      const s = sel ? (sel.where === 'team' ? RUN.team[sel.i] : RUN.box[sel.i]) : null;
      const bagCounts = {};
      RUN.bag.forEach(id => { bagCounts[id] = (bagCounts[id] || 0) + 1; });
      let detail = '<p class="hint">Tippe ein Monster an, um es zu verschieben, ein Item auszurüsten oder es in die Box zu legen.</p>';
      if (s) {
        const st = Stats.of(s, RUN.talismans);
        const c = CARDS[s.id];
        const evo = EVOS[s.id];
        detail = `<div class="tm-detail">${cardHTML(c, { size: 'lg', atk: st.atk, def: st.def })}
          <div class="tm-stats"><h3>${esc(c.name)}</h3>
            <dl><div><dt>Stufe</dt><dd>${s.lvl}</dd></div><div><dt>KP</dt><dd>${s.hp} / ${st.maxHp}</dd></div><div><dt>Initiative</dt><dd>${st.spd}</dd></div><div><dt>EP</dt><dd>${s.xp} / ${xpNeed(s.lvl)}</dd></div></dl>
            ${evo ? `<p class="small">Entwicklung zu ${esc(CARDS[evo[0]].name)} ab Stufe ${evo[1]}.</p>` : ''}
            <p class="small">Item: <b>${s.item ? esc(CARDS[s.item].name) : 'keins'}</b>${s.item ? ` · ${esc(ITEM_TEXT[s.item])}` : ''}</p>
            <div class="tm-actions">
              ${sel.where === 'team' ? `<button class="btn small" data-t="up" ${sel.i === 0 ? 'disabled' : ''}>Nach vorn</button><button class="btn small" data-t="down" ${sel.i === RUN.team.length - 1 ? 'disabled' : ''}>Nach hinten</button><button class="btn small" data-t="tobox" ${RUN.team.length <= 1 ? 'disabled' : ''}>In die Box</button>`
                : `<button class="btn small primary" data-t="toteam">${RUN.team.length < TEAM_MAX ? 'Ins Team' : 'Mit Team-Monster tauschen'}</button><button class="btn small danger" data-t="release">Freilassen</button>`}
              ${s.item ? '<button class="btn small" data-t="unequip">Item ablegen</button>' : ''}
            </div>
            <h4 class="sec">Item ausrüsten</h4>
            <div class="bag-list">${Object.keys(bagCounts).filter(id => !isConsumable(id)).map(id => `<button class="bag-item" data-t="equip" data-id="${id}" title="${esc(ITEM_TEXT[id])}"><b>${esc(CARDS[id].name)}</b>${bagCounts[id] > 1 ? ` ×${bagCounts[id]}` : ''}<small>${esc(ITEM_TEXT[id])}</small></button>`).join('') || '<p class="small">Keine tragbaren Items in der Tasche.</p>'}</div>
            ${Object.keys(bagCounts).filter(id => CARDS[id].sp === 'ritual').map(id => `<button class="btn small" data-t="ritual" data-id="${id}" ${s.lvl < RITUAL_MIN[id] ? 'disabled' : ''}>${esc(CARDS[id].name)} anwenden (ab Stufe ${RITUAL_MIN[id]})</button>`).join(' ')}
          </div></div>`;
      }
      const fus = RUN.bag.includes('s_fusion') ? fusionOptions() : [];
      show(`${headerHTML()}<section class="screen">
        <div class="tm-head"><h2>Team &amp; Items</h2><button class="btn primary" data-t="back">${fromBattle ? 'Zum Kampf' : 'Zurück zur Karte'}</button></div>
        <p class="sub">Die Reihenfolge bestimmt, wer im Autokampf zuerst antritt. Besiegte Monster kämpfen erst nach einer Rast oder Heilung wieder.</p>
        <h3 class="sec">Team (${RUN.team.length}/${TEAM_MAX})</h3>
        <div class="chip-grid">${RUN.team.map((m, i) => `<button class="chip-btn ${sel && sel.where === 'team' && sel.i === i ? 'sel' : ''}" data-t="sel" data-w="team" data-i="${i}"><span class="ord">${i + 1}</span>${monChip(m)}</button>`).join('')}</div>
        ${RUN.box.length ? `<h3 class="sec">Box (${RUN.box.length})</h3><div class="chip-grid">${RUN.box.map((m, i) => `<button class="chip-btn ${sel && sel.where === 'box' && sel.i === i ? 'sel' : ''}" data-t="sel" data-w="box" data-i="${i}">${monChip(m)}</button>`).join('')}</div>` : ''}
        <div class="tm-panel">${detail}</div>
        <h3 class="sec">Tasche</h3>
        <div class="bag-list">${Object.keys(bagCounts).map(id => `<div class="bag-item static"><b>${esc(CARDS[id].name)}</b>${bagCounts[id] > 1 ? ` ×${bagCounts[id]}` : ''}<small>${esc(ITEM_TEXT[id])}</small></div>`).join('') || '<p class="small">Leer.</p>'}</div>
        ${RUN.bag.includes('s_fusion') ? `<h3 class="sec">Verschmelzung</h3>${fus.length ? `<div class="bag-list">${fus.map((o, k) => `<button class="bag-item" data-t="fuse" data-k="${k}"><b>${esc(CARDS[o.f].name)}</b><small>${esc(CARDS[RUN.team[o.i].id].name)} + ${esc(CARDS[RUN.team[o.j].id].name)} · ATK ${CARDS[o.f].atk}</small></button>`).join('')}</div>` : '<p class="small">Keine passenden Monster im Team. Fusionen brauchen zwei bestimmte Typen, z. B. Krieger + Drache.</p>'}` : ''}
      </section>`);
      app().querySelector('.tm-panel') && sel && app().querySelector('.tm-panel').scrollIntoView({ block: 'nearest' });
    };
    const h = async e => {
      const b = e.target.closest('[data-t]');
      if (!b || b.disabled) return;
      e.stopPropagation();
      const t = b.dataset.t;
      const list = sel ? (sel.where === 'team' ? RUN.team : RUN.box) : null;
      const m = sel ? list[sel.i] : null;
      if (t === 'back') { app().removeEventListener('click', h, true); save(); if (!fromBattle) mapScreen(); resolve(); return; }
      if (t === 'sel') { sel = { where: b.dataset.w, i: +b.dataset.i }; }
      else if (t === 'up' || t === 'down') { const j = sel.i + (t === 'up' ? -1 : 1); [RUN.team[sel.i], RUN.team[j]] = [RUN.team[j], RUN.team[sel.i]]; sel.i = j; }
      else if (t === 'tobox') { RUN.box.push(RUN.team.splice(sel.i, 1)[0]); sel = null; }
      else if (t === 'toteam') {
        if (RUN.team.length < TEAM_MAX) { RUN.team.push(RUN.box.splice(sel.i, 1)[0]); sel = { where: 'team', i: RUN.team.length - 1 }; }
        else {
          const r = await modal({ title: 'Mit wem tauschen?', wide: true, html: `<div class="chip-grid">${RUN.team.map((x, i) => `<button class="chip-btn" data-pick="${i}">${monChip(x)}</button>`).join('')}</div>`, buttons: [{ label: 'Abbrechen', value: null }] });
          if (r && typeof r === 'object') { const k = r.pick; [RUN.team[k], RUN.box[sel.i]] = [RUN.box[sel.i], RUN.team[k]]; sel = { where: 'team', i: k }; }
        }
      }
      else if (t === 'release') {
        const ok = await modal({ title: `${CARDS[m.id].name} freilassen?`, html: '<p>Das Monster ist dann für immer weg. Sein Item kommt in die Tasche.</p>', buttons: [{ label: 'Behalten', value: false }, { label: 'Freilassen', value: true, danger: true }] });
        if (ok) { if (m.item) RUN.bag.push(m.item); RUN.box.splice(sel.i, 1); sel = null; }
      }
      else if (t === 'unequip') { RUN.bag.push(m.item); setItem(m, null); }
      else if (t === 'equip') { const id = b.dataset.id; RUN.bag.splice(RUN.bag.indexOf(id), 1); if (m.item) RUN.bag.push(m.item); setItem(m, id); toast(`${CARDS[m.id].name} trägt jetzt ${CARDS[id].name}`); }
      else if (t === 'ritual') {
        const id = b.dataset.id;
        const target = CARDS[id].ritual;
        const ok = await modal({ title: CARDS[id].name, html: `<p>${esc(CARDS[m.id].name)} wird zu <b>${esc(CARDS[target].name)}</b>. Stufe und Item bleiben erhalten.</p>`, buttons: [{ label: 'Abbrechen', value: false }, { label: 'Ritual durchführen', value: true, primary: true }] });
        if (ok) { RUN.bag.splice(RUN.bag.indexOf(id), 1); transform(m, target); }
      }
      else if (t === 'fuse') {
        const o = fusionOptions()[+b.dataset.k];
        const A = RUN.team[o.i], B = RUN.team[o.j];
        const ok = await modal({ title: 'Verschmelzung', html: `<p>${esc(CARDS[A.id].name)} und ${esc(CARDS[B.id].name)} verschmelzen zu <b>${esc(CARDS[o.f].name)}</b> (Stufe ${Math.max(A.lvl, B.lvl)}). Das Item von ${esc(CARDS[B.id].name)} kommt in die Tasche.</p><div class="card-grid">${cardHTML(CARDS[o.f], { size: 'lg' })}</div>`, buttons: [{ label: 'Abbrechen', value: false }, { label: 'Verschmelzen', value: true, primary: true }] });
        if (ok) {
          RUN.bag.splice(RUN.bag.indexOf('s_fusion'), 1);
          if (B.item) RUN.bag.push(B.item);
          A.lvl = Math.max(A.lvl, B.lvl);
          A.xp = 0;
          A.id = o.f;
          A.hp = maxHpOf(A);
          RUN.team.splice(o.j, 1);
          sel = null;
        }
      }
      save();
      render();
    };
    app().addEventListener('click', h, true);
    render();
  });
}

function setItem(m, id) {
  const r = m.hp / maxHpOf(m);
  m.item = id;
  m.hp = m.hp > 0 ? Math.max(1, Math.round(maxHpOf(m) * r)) : 0;
}

/* ---------- Ende ---------- */
function gameOver(won, by) {
  clearSave();
  const best = getBest();
  if (!best || RUN.badges > best.badges || (won && !best.champion)) setBest({ badges: RUN.badges, champion: won });
  show(`<section class="screen narrow end ${won ? 'won' : 'lost'}">
    <span class="eyebrow">${won ? 'Champion' : 'Lauf beendet'}</span>
    <h2>${won ? 'Du hast den Großmeister besiegt!' : `Besiegt von ${esc(by)}`}</h2>
    <p class="sub">${won ? 'Alle acht Wappen und der Titel gehören dir.' : `Du hast ${RUN.badges} von 8 Wappen errungen.`}</p>
    <div class="chip-grid">${RUN.team.map(m => monChip(m)).join('')}</div>
    <dl class="stats"><div><dt>Siege</dt><dd>${RUN.stats.wins}</dd></div><div><dt>Kämpfe</dt><dd>${RUN.stats.battles}</dd></div><div><dt>Gefangen</dt><dd>${RUN.stats.caught}</dd></div><div><dt>Wappen</dt><dd>${RUN.badges}</dd></div></dl>
    <div class="row-btns"><button class="btn primary big" data-r="new">Neuer Lauf</button><button class="btn" data-r="title">Titelbildschirm</button></div>
  </section>`);
  window.__gameOver = { won, badges: RUN.badges, arena: RUN.arena, lvls: RUN.team.map(m => m.lvl) };
}

function howto() {
  modal({
    title: 'Spielregeln', wide: true, dismiss: true,
    html: `<div class="howto">
      <h4>Der Lauf</h4>
      <p>Du wählst einen Starter und ziehst über eine verzweigte Karte zum Arenaleiter. Besiege alle acht und danach den Großmeister. Wird dein ganzes Team in einem Kampf besiegt, endet der Lauf.</p>
      <ul>
        <li><b>Duell / Elite:</b> Autokampf gegen ein gegnerisches Team. Sieg bringt Erfahrung und ein Item, Elite zusätzlich einen Talisman.</li>
        <li><b>Begegnung:</b> Eines von drei wilden Monstern schließt sich dir an. Mehr als 6 Monster kommen in die Box.</li>
        <li><b>Item:</b> Zauber- und Fallenkarten sind Items, die deine Monster tragen.</li>
        <li><b>Rast:</b> heilt dein Team vollständig. <b>Tausch:</b> gib ein Monster gegen ein meist selteneres ab.</li>
      </ul>
      <h4>Der Autokampf</h4>
      <ul>
        <li>Dein vorderstes kampffähiges Monster kämpft gegen das vorderste des Gegners. Wer mehr Initiative hat, greift zuerst an.</li>
        <li>Schaden hängt von ATK des Angreifers und DEF des Ziels ab. Volltreffer machen 50 % mehr Schaden.</li>
        <li>Typvorteil ×1,5: Feuer › Wind › Erde › Wasser › Feuer. Licht und Finsternis sind gegeneinander sehr effektiv. Umgekehrt nur ×0,67.</li>
        <li>Effektmonster haben Fähigkeiten, etwa beim Betreten des Kampfes, wenn sie besiegt werden oder dauerhaft.</li>
        <li>KP bleiben nach dem Kampf erhalten. Besiegte Monster brauchen eine Rast.</li>
        <li>Monster steigen durch Erfahrung auf und entwickeln sich auf bestimmten Stufen weiter. Mit „Verschmelzung“ werden zwei passende Monster zu einem Fusionsmonster, Ritualzauber verwandeln ein starkes Monster.</li>
      </ul></div>`,
    buttons: [{ label: 'Verstanden', value: true, primary: true }],
  });
}

/* ---------- Globale Klicks ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-r]');
  if (!b || b.disabled || !app().contains(b)) return;
  const r = b.dataset.r;
  if (r === 'new') starterScreen();
  else if (r === 'title') titleScreen();
  else if (r === 'howto') howto();
  else if (r === 'continue') { RUN = loadSave(); if (RUN) { if (RUN.map.pos && availableNodes().length === 0) afterNode(); else mapScreen(); } }
  else if (r === 'starter') newRun(b.dataset.id);
  else if (r === 'node') enterNode(+b.dataset.row, +b.dataset.i);
  else if (r === 'team') { if (!document.querySelector('.tm-head')) teamScreen(false); }
  else if (r === 'abandon') {
    const ok = await modal({ title: 'Lauf aufgeben?', html: '<p>Dein aktueller Fortschritt geht verloren.</p>', buttons: [{ label: 'Weiterspielen', value: false }, { label: 'Aufgeben', value: true, danger: true }] });
    if (ok) gameOver(false, 'Aufgabe');
  }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('g.node.avail')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
});

titleScreen();
