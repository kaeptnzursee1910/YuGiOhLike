/* =========================================================
   Duell-Engine + Duell-UI
   Spieler 0 = du, Spieler 1 = KI
   ========================================================= */

const Duel = (() => {
  let D = null;
  let uidc = 1;
  const ZONES = 5;

  const sleep = ms => new Promise(r => setTimeout(r, D && D.fast ? 0 : ms));
  const inst = id => ({ uid: uidc++, id, c: CARDS[id] });
  const P = i => D.p[i];
  const O = i => 1 - i;
  const hasT = (pi, k) => pi === 0 && D.tal.includes(k);
  const isStatic = (m, k) => m.c.fx && m.c.fx.on === 'static' && m.c.fx.do === k;
  const freeZone = arr => arr.findIndex(x => !x);
  const mons = pi => P(pi).mz.map((m, z) => ({ m, z })).filter(o => o.m);
  const isAIControlled = pi => P(pi).ai || D.auto;

  function mAtk(pi, m) { return m ? Math.max(0, m.c.atk + m.atkMod + m.tempAtk + (hasT(pi, 'schleif') ? 200 : 0)) : 0; }
  function mDef(pi, m) { return m ? Math.max(0, m.c.def + (hasT(pi, 'ruestung') ? 300 : 0)) : 0; }
  function burnAmt(pi, n) { return hasT(pi, 'brenn') ? Math.round(n * 1.5) : n; }
  function tributesNeeded(pi, c) {
    let n = c.lvl >= 7 ? 2 : c.lvl >= 5 ? 1 : 0;
    if (hasT(pi, 'opfer')) n = Math.max(0, n - 1);
    return n;
  }

  const DU = { zieht: 'ziehst', kann: 'kannst', erleidet: 'erleidest', 'erhält': 'erhältst', beginnt: 'beginnst', 'beschwört': 'beschwörst', 'führt': 'führst', opfert: 'opferst', wechselt: 'wechselst', wirft: 'wirfst', aktiviert: 'aktivierst' };
  function log(msg, cls = '') {
    msg = msg.replace(/^Du (\S+)/, (m, v) => 'Du ' + (DU[v] || v)).replace('Die Monster von Du verlieren', 'Deine Monster verlieren');
    D.log.unshift({ msg, cls });
    if (D.log.length > 60) D.log.pop();
    D.lastMsg = msg;
  }

  /* ---------- Start ---------- */
  function mkPlayer(src, ai) {
    return {
      name: src.name, title: src.title || '', lp: src.lp, maxLp: src.maxLp || src.lp,
      deck: shuffle(src.deck.map(inst)), extra: (src.extra || []).map(inst),
      hand: [], gy: [], mz: Array(ZONES).fill(null), sz: Array(ZONES).fill(null),
      ns: false, cage: 0, ai,
    };
  }

  function start(o) {
    return new Promise(resolve => {
      D = {
        p: [mkPlayer(o.player, false), mkPlayer(o.enemy, true)],
        tal: o.talismans || [], turn: 0, turnCount: 0, phase: 'main', over: false,
        resolve, log: [], sel: null, busy: false, targeting: null, auto: !!o.auto, fast: !!o.fast,
        label: o.label || 'Duell', endTurnResolve: null, showLog: false,
      };
      D.turn = (D.tal.includes('vorsprung') || Math.random() < 0.5) ? 0 : 1;
      log(`${P(D.turn).name} beginnt.`, 'sys');
      draw(0, D.tal.includes('hand') ? 6 : 5, true);
      draw(1, 5, true);
      mountUI();
      render();
      loop();
    });
  }

  function draw(pi, n, silent) {
    for (let i = 0; i < n; i++) {
      if (D.over) return;
      const p = P(pi);
      if (!p.deck.length) { log(`${p.name} kann keine Karte mehr ziehen!`, 'bad'); finish(O(pi)); return; }
      p.hand.push(p.deck.pop());
    }
    if (!silent) log(`${P(pi).name} zieht ${n === 1 ? 'eine Karte' : n + ' Karten'}.`);
  }

  /* ---------- LP ---------- */
  function damage(pi, n) {
    if (D.over || n <= 0) return;
    P(pi).lp = Math.max(0, P(pi).lp - n);
    floatNum(pi, '-' + n, 'dmg');
    log(`${P(pi).name} erleidet ${n} Schaden.`, pi === 0 ? 'bad' : 'good');
    if (P(pi).lp <= 0) finish(O(pi));
  }
  function heal(pi, n) {
    if (D.over || n <= 0) return;
    P(pi).lp += n;
    floatNum(pi, '+' + n, 'heal');
    log(`${P(pi).name} erhält ${n} LP.`, pi === 0 ? 'good' : '');
  }

  function finish(winner) {
    if (D.over) return;
    D.over = true;
    D.winner = winner;
    if (D.endTurnResolve) { const r = D.endTurnResolve; D.endTurnResolve = null; r(); }
    if (D.targeting) { const t = D.targeting; D.targeting = null; t.resolve(null); }
    render();
    setTimeout(showResult, D.fast ? 0 : 700);
  }

  async function showResult() {
    const won = D.winner === 0;
    const res = { won, lp: P(0).lp, turns: D.turnCount };
    if (D.auto && D.fast) { unmountUI(); D.resolve(res); return; }
    await modal({
      title: won ? 'Sieg!' : 'Niederlage',
      html: won ? `<p>Du hast ${esc(P(1).name)} besiegt. Verbleibende LP: <b>${P(0).lp}</b>.</p>`
        : `<p>${esc(P(1).name)} hat dich besiegt.</p>`,
      buttons: [{ label: 'Weiter', value: true, primary: true }],
    });
    unmountUI();
    D.resolve(res);
  }

  /* ---------- Spielfluss ---------- */
  async function loop() {
    while (!D.over) {
      const pi = D.turn;
      const p = P(pi);
      D.turnCount++;
      D.phase = 'main';
      p.ns = false;
      for (const { m } of mons(pi)) { m.attacks = 0; m.posChanged = false; }
      if (D.turnCount > 1) draw(pi, 1);
      if (D.over) break;
      log(`— Zug ${D.turnCount}: ${p.name} —`, 'turn');
      render();
      await sleep(400);
      if (isAIControlled(pi)) await aiTurn(pi);
      else await playerTurn();
      if (D.over) break;
      await endPhase(pi);
      D.turn = O(pi);
      D.sel = null;
    }
  }

  async function endPhase(pi) {
    D.phase = 'end';
    const p = P(pi);
    while (p.hand.length > 6 && !D.over) {
      let idx;
      if (isAIControlled(pi)) {
        idx = p.hand.reduce((bi, c, i, a) => (cardValue(c.c) < cardValue(a[bi].c) ? i : bi), 0);
      } else {
        idx = await chooseCard('Handlimit: Wirf eine Karte ab', p.hand.map(h => h.c), { cancellable: false, hint: 'Am Ende deines Zuges darfst du höchstens 6 Karten auf der Hand halten.' });
      }
      const [c] = p.hand.splice(idx, 1);
      p.gy.push(c);
      log(`${p.name} wirft ${c.c.name} ab.`);
    }
    for (const i of [0, 1]) for (const { m } of mons(i)) m.tempAtk = 0;
    if (p.cage > 0) p.cage--;
    render();
  }

  function playerTurn() {
    return new Promise(res => { D.endTurnResolve = res; render(); });
  }

  /* ---------- Beschwörungen ---------- */
  function mkMon(ci, pos, faceDown) {
    return { uid: ci.uid, id: ci.id, c: ci.c, pos, faceDown, atkMod: 0, tempAtk: 0, attacks: 0, sturn: D.turnCount, posChanged: false };
  }

  async function placeMonster(pi, ci, pos, faceDown, how) {
    const z = freeZone(P(pi).mz);
    if (z < 0) { P(pi).gy.push(ci); return null; }
    const m = mkMon(ci, pos, faceDown);
    P(pi).mz[z] = m;
    const verb = { normal: 'beschwört', set: 'setzt ein Monster', special: 'beschwört per Spezialbeschwörung', fusion: 'führt eine Fusionsbeschwörung durch:', ritual: 'führt eine Ritualbeschwörung durch:' }[how];
    log(faceDown ? `${P(pi).name} ${verb}.` : `${P(pi).name} ${verb} ${ci.c.name}.`, how === 'fusion' || how === 'ritual' ? 'big' : '');
    D.flash = { pi, kind: 'm', z };
    render();
    await sleep(450);
    if (faceDown || D.over) return m;
    if (how === 'normal') {
      await trapResponse(O(pi), 'summon', { pi, z, m });
      if (P(pi).mz[z] !== m || D.over) return null;
    }
    if (m.c.fx && m.c.fx.on === 'summon') await runFx(pi, m.c.fx, m);
    return m;
  }

  function canNormalSummon(pi, ci) {
    const c = ci.c;
    if (c.type !== 'monster' || c.kind === 'fusion' || c.kind === 'ritual') return false;
    if (D.phase !== 'main' || P(pi).ns) return false;
    const need = tributesNeeded(pi, c);
    const count = mons(pi).length;
    if (count < need) return false;
    if (need === 0 && count >= ZONES) return false;
    return true;
  }

  async function normalSummon(pi, handIdx, set, tributeZones) {
    const p = P(pi);
    const ci = p.hand[handIdx];
    for (const z of tributeZones) {
      const t = p.mz[z];
      p.mz[z] = null;
      p.gy.push({ uid: t.uid, id: t.id, c: t.c });
      log(`${p.name} opfert ${t.faceDown && pi === 1 ? 'ein verdecktes Monster' : t.c.name} als Tribut.`);
    }
    p.hand.splice(p.hand.indexOf(ci), 1);
    p.ns = true;
    await placeMonster(pi, ci, set ? 'def' : 'atk', set, set ? 'set' : 'normal');
  }

  async function flipSummon(pi, z) {
    const m = P(pi).mz[z];
    m.faceDown = false; m.pos = 'atk'; m.posChanged = true;
    log(`${P(pi).name} führt eine Flippbeschwörung durch: ${m.c.name}.`);
    D.flash = { pi, kind: 'm', z };
    render();
    await sleep(400);
    await trapResponse(O(pi), 'summon', { pi, z, m });
    if (P(pi).mz[z] !== m || D.over) return;
    if (m.c.fx && (m.c.fx.on === 'flip' || m.c.fx.on === 'summon')) await runFx(pi, m.c.fx, m);
  }

  function canFlipSummon(pi, z) {
    const m = P(pi).mz[z];
    return m && D.phase === 'main' && m.faceDown && m.sturn < D.turnCount && !m.posChanged;
  }
  function canChangePos(pi, z) {
    const m = P(pi).mz[z];
    return m && D.phase === 'main' && !m.faceDown && m.sturn < D.turnCount && !m.posChanged && m.attacks === 0;
  }
  function changePos(pi, z) {
    const m = P(pi).mz[z];
    m.pos = m.pos === 'atk' ? 'def' : 'atk';
    m.posChanged = true;
    log(`${P(pi).name} wechselt ${m.c.name} in ${m.pos === 'atk' ? 'Angriffs' : 'Verteidigungs'}position.`);
  }

  /* ---------- Zerstörung ---------- */
  async function destroyMon(pi, z, cause) {
    const m = P(pi).mz[z];
    if (!m) return;
    P(pi).mz[z] = null;
    P(pi).gy.push({ uid: m.uid, id: m.id, c: m.c });
    log(`${m.c.name} wird zerstört.`, pi === 0 ? 'bad' : 'good');
    D.boom = { pi, z };
    render();
    await sleep(300);
    if (m.c.fx && m.c.fx.on === 'destroyed' && !D.over) await runFx(pi, m.c.fx, null);
  }
  async function destroyMany(pi, zones) {
    const dead = zones.map(z => P(pi).mz[z]).filter(Boolean);
    for (const z of zones) {
      const m = P(pi).mz[z];
      if (!m) continue;
      P(pi).mz[z] = null;
      P(pi).gy.push({ uid: m.uid, id: m.id, c: m.c });
      log(`${m.c.name} wird zerstört.`, pi === 0 ? 'bad' : 'good');
    }
    render();
    await sleep(350);
    for (const m of dead) if (m.c.fx && m.c.fx.on === 'destroyed' && !D.over) await runFx(pi, m.c.fx, null);
  }
  function destroyST(pi, z) {
    const s = P(pi).sz[z];
    if (!s) return;
    P(pi).sz[z] = null;
    P(pi).gy.push({ uid: s.uid, id: s.id, c: s.c });
    log(`${s.c.name} wird zerstört.`);
  }

  /* ---------- Zielwahl ---------- */
  // cands: [{side, kind:'m'|'s', z}] -> returns cand or null
  async function chooseTarget(pi, cands, prompt, { cancellable = false, ai = 'best' } = {}) {
    if (!cands.length) return null;
    if (isAIControlled(pi)) return aiPickTarget(pi, cands, ai);
    const r = await pickOnBoard(cands, prompt, cancellable);
    return r;
  }
  function aiPickTarget(pi, cands, mode) {
    const score = c => {
      if (c.kind === 's') return Math.random();
      const m = P(c.side).mz[c.z];
      const v = m.faceDown ? 1500 : Math.max(mAtk(c.side, m), m.pos === 'def' ? mDef(c.side, m) * 0.8 : 0);
      return v;
    };
    const sorted = [...cands].sort((a, b) => score(b) - score(a));
    return mode === 'worst' ? sorted[sorted.length - 1] : sorted[0];
  }
  async function chooseFromList(pi, cards, title, aiScore) {
    if (!cards.length) return -1;
    if (isAIControlled(pi)) {
      let bi = 0;
      cards.forEach((c, i) => { if (aiScore(c) > aiScore(cards[bi])) bi = i; });
      return bi;
    }
    return await chooseCard(title, cards.map(x => x.c), { cancellable: false });
  }

  const oppMonCands = pi => mons(O(pi)).map(({ z }) => ({ side: O(pi), kind: 'm', z }));
  const ownMonCands = (pi, faceUp) => mons(pi).filter(o => !faceUp || !o.m.faceDown).map(({ z }) => ({ side: pi, kind: 'm', z }));
  const oppSTCands = pi => P(O(pi)).sz.map((s, z) => s ? { side: O(pi), kind: 's', z } : null).filter(Boolean);

  /* ---------- Monstereffekte ---------- */
  async function runFx(pi, fx, src) {
    if (D.over) return;
    const name = src ? src.c.name : 'Effekt';
    switch (fx.do) {
      case 'burn': damage(O(pi), burnAmt(pi, fx.n)); break;
      case 'heal': heal(pi, fx.n); break;
      case 'drain': damage(O(pi), burnAmt(pi, fx.n)); heal(pi, fx.n); break;
      case 'draw': draw(pi, fx.n); break;
      case 'destroyMon': {
        const t = await chooseTarget(pi, oppMonCands(pi), `${name}: Wähle ein Monster des Gegners zum Zerstören.`);
        if (t) await destroyMon(t.side, t.z, 'effect');
        break;
      }
      case 'destroyST': {
        const t = await chooseTarget(pi, oppSTCands(pi), `${name}: Wähle eine Zauber-/Fallenkarte des Gegners.`);
        if (t) destroyST(t.side, t.z);
        break;
      }
      case 'destroyAllST': P(O(pi)).sz.forEach((s, z) => s && destroyST(O(pi), z)); break;
      case 'destroyAllMon': await destroyMany(O(pi), mons(O(pi)).map(o => o.z)); break;
      case 'weakenAll': for (const { m } of mons(O(pi))) m.atkMod -= fx.n; if (mons(O(pi)).length) log(`Die Monster von ${P(O(pi)).name} verlieren ${fx.n} ATK.`); break;
      case 'rally': for (const { m } of mons(pi)) if (m !== src) m.atkMod += fx.n; break;
      case 'recruit': {
        const p = P(pi);
        if (freeZone(p.mz) < 0) break;
        const opts = p.deck.filter(ci => ci.c.type === 'monster' && ci.c.race === fx.race && ci.c.lvl <= fx.maxLvl && (ci.c.kind === 'normal' || ci.c.kind === 'effect'));
        if (!opts.length) { log('Kein passendes Monster im Deck.'); break; }
        const i = await chooseFromList(pi, opts, `Wähle ein Monster aus deinem Deck`, x => x.c.atk);
        const ci = opts[i];
        p.deck.splice(p.deck.indexOf(ci), 1);
        shuffle(p.deck);
        await placeMonster(pi, ci, 'atk', false, 'special');
        break;
      }
      case 'reviveLow': {
        const p = P(pi);
        if (freeZone(p.mz) < 0) break;
        const opts = p.gy.filter(ci => ci.c.type === 'monster' && ci.c.lvl <= fx.maxLvl);
        if (!opts.length) break;
        const i = await chooseFromList(pi, opts, 'Wähle ein Monster aus deinem Friedhof', x => x.c.atk);
        const ci = opts[i];
        p.gy.splice(p.gy.indexOf(ci), 1);
        await placeMonster(pi, ci, 'atk', false, 'special');
        break;
      }
    }
    render();
    await sleep(250);
  }

  /* ---------- Zauber ---------- */
  function fusionOptions(pi) {
    const p = P(pi);
    const pool = [
      ...p.hand.filter(ci => ci.c.type === 'monster' && ci.c.kind !== 'ritual').map(ci => ({ ci, from: 'hand' })),
      ...mons(pi).map(({ m, z }) => ({ ci: m, from: 'field', z })),
    ];
    const res = [];
    const match = (crit, c) => crit.id ? c.id === crit.id : crit.race ? c.race === crit.race : c.attr === crit.attr;
    for (const f of p.extra) {
      const [a, b] = f.c.mats;
      let best = null;
      for (let i = 0; i < pool.length; i++) for (let j = 0; j < pool.length; j++) {
        if (i === j) continue;
        if (!match(a, pool[i].ci.c) || !match(b, pool[j].ci.c)) continue;
        const usesField = pool[i].from === 'field' || pool[j].from === 'field';
        if (!usesField && freeZone(p.mz) < 0) continue;
        const cost = pool[i].ci.c.atk + pool[j].ci.c.atk;
        if (!best || cost < best.cost) best = { mats: [pool[i], pool[j]], cost };
      }
      if (best) res.push({ f, mats: best.mats, cost: best.cost });
    }
    return res;
  }

  function ritualOption(pi, spell) {
    const p = P(pi);
    const rm = p.hand.find(ci => ci.id === spell.c.ritual);
    if (!rm) return null;
    const need = rm.c.lvl;
    const cands = [
      ...p.hand.filter(ci => ci !== rm && ci.c.type === 'monster' && ci.c.kind !== 'fusion').map(ci => ({ ci, from: 'hand' })),
      ...mons(pi).map(({ m, z }) => ({ ci: m, from: 'field', z })),
    ].sort((a, b) => a.ci.c.atk - b.ci.c.atk);
    const chosen = [];
    let sum = 0;
    for (const c of cands) { if (sum >= need) break; chosen.push(c); sum += c.ci.c.lvl; }
    if (sum < need) return null;
    if (!chosen.some(c => c.from === 'field') && freeZone(p.mz) < 0) return null;
    return { rm, tributes: chosen };
  }

  function gyMonsters(pi) { return P(pi).gy.filter(ci => ci.c.type === 'monster'); }

  function canActivateSpell(pi, ci) {
    const c = ci.c;
    if (D.phase !== 'main') return false;
    const p = P(pi);
    switch (c.sp) {
      case 'destroyMon': return oppMonCands(pi).length > 0;
      case 'destroyST': return oppSTCands(pi).length > 0;
      case 'destroyAllST': return oppSTCands(pi).length > 0;
      case 'destroyAllMon': return oppMonCands(pi).length > 0;
      case 'equip': return ownMonCands(pi, true).length > 0;
      case 'rallyTemp': return mons(pi).length > 0;
      case 'weakenAll': return oppMonCands(pi).length > 0;
      case 'revive': return gyMonsters(pi).length > 0 && freeZone(p.mz) >= 0;
      case 'fusion': return fusionOptions(pi).length > 0;
      case 'ritual': return !!ritualOption(pi, ci);
      case 'draw': return p.deck.length >= c.n;
      default: return true;
    }
  }

  async function activateSpell(pi, ci, preTarget) {
    const p = P(pi);
    const c = ci.c;
    // Ziele vorab (Spieler darf abbrechen)
    let target = preTarget || null;
    let fusionChoice = null, ritual = null, reviveIdx = -1;
    const human = !isAIControlled(pi);
    if (c.sp === 'destroyMon' && !target) target = await chooseTarget(pi, oppMonCands(pi), `${c.name}: Wähle ein Monster des Gegners.`, { cancellable: true });
    if (c.sp === 'destroyST' && !target) target = await chooseTarget(pi, oppSTCands(pi), `${c.name}: Wähle eine Zauber-/Fallenkarte.`, { cancellable: true });
    if (c.sp === 'equip' && !target) target = await chooseTarget(pi, ownMonCands(pi, true), `${c.name}: Wähle eines deiner Monster.`, { cancellable: true });
    if (['destroyMon', 'destroyST', 'equip'].includes(c.sp) && !target) return false;
    if (c.sp === 'fusion') {
      const opts = fusionOptions(pi);
      if (human) {
        const i = await chooseCard('Verschmelzung: Wähle ein Fusionsmonster', opts.map(o => o.f.c), { hint: 'Das günstigste passende Material wird automatisch verwendet.' });
        if (i == null) return false;
        fusionChoice = opts[i];
        const ok = await modal({ title: `Fusion: ${fusionChoice.f.c.name}`, html: `<p>Material: <b>${fusionChoice.mats.map(x => esc(x.ci.c.name) + (x.from === 'field' ? ' (Feld)' : ' (Hand)')).join('</b> + <b>')}</b></p>`, buttons: [{ label: 'Abbrechen', value: false }, { label: 'Fusionieren', value: true, primary: true }] });
        if (!ok) return false;
      } else {
        fusionChoice = opts.sort((a, b) => b.f.c.atk - a.f.c.atk)[0];
      }
    }
    if (c.sp === 'ritual') {
      ritual = ritualOption(pi, ci);
      if (human) {
        const ok = await modal({ title: `Ritual: ${ritual.rm.c.name}`, html: `<p>Tribute: <b>${ritual.tributes.map(x => esc(x.ci.c.name) + (x.from === 'field' ? ' (Feld)' : ' (Hand)')).join('</b>, <b>')}</b></p>`, buttons: [{ label: 'Abbrechen', value: false }, { label: 'Ritual durchführen', value: true, primary: true }] });
        if (!ok) return false;
      }
    }
    if (c.sp === 'revive') {
      const gm = gyMonsters(pi);
      if (human) {
        const i = await chooseCard('Wiedergeburt: Wähle ein Monster', gm.map(x => x.c));
        if (i == null) return false;
        reviveIdx = p.gy.indexOf(gm[i]);
      } else {
        const best = gm.reduce((a, b) => (b.c.atk > a.c.atk ? b : a));
        reviveIdx = p.gy.indexOf(best);
      }
    }

    // Karte ausspielen
    p.hand.splice(p.hand.indexOf(ci), 1);
    log(`${p.name} aktiviert ${c.name}.`, 'spell');
    D.reveal = c;
    render();
    await sleep(600);
    D.reveal = null;

    switch (c.sp) {
      case 'burn': damage(O(pi), burnAmt(pi, c.n)); break;
      case 'heal': heal(pi, c.n); break;
      case 'draw': draw(pi, c.n); break;
      case 'destroyMon': await destroyMon(target.side, target.z, 'effect'); break;
      case 'destroyST': destroyST(target.side, target.z); break;
      case 'destroyAllST': P(O(pi)).sz.forEach((s, z) => s && destroyST(O(pi), z)); break;
      case 'destroyAllMon': await destroyMany(O(pi), mons(O(pi)).map(o => o.z)); break;
      case 'equip': { const m = P(pi).mz[target.z]; if (m) { m.atkMod += c.n; log(`${m.c.name} erhält ${c.n} ATK.`); } break; }
      case 'rallyTemp': for (const { m } of mons(pi)) m.tempAtk += c.n; log(pi === 0 ? `Deine Monster erhalten ${c.n} ATK bis zum Zugende.` : `Die Monster von ${p.name} erhalten ${c.n} ATK bis zum Zugende.`); break;
      case 'weakenAll': for (const { m } of mons(O(pi))) m.atkMod -= c.n; log(`Die Monster von ${P(O(pi)).name} verlieren ${c.n} ATK.`); break;
      case 'cage': P(O(pi)).cage = c.n; log(`${P(O(pi)).name} kann ${c.n} Züge lang nicht angreifen.`); break;
      case 'revive': {
        const [g] = p.gy.splice(reviveIdx, 1);
        p.gy.push(ci); ci._inGy = true;
        await placeMonster(pi, g, 'atk', false, 'special');
        break;
      }
      case 'fusion': {
        for (const mt of fusionChoice.mats) {
          if (mt.from === 'hand') { p.hand.splice(p.hand.indexOf(mt.ci), 1); p.gy.push(mt.ci); }
          else { const m = p.mz[mt.z]; p.mz[mt.z] = null; p.gy.push({ uid: m.uid, id: m.id, c: m.c }); }
        }
        p.extra.splice(p.extra.indexOf(fusionChoice.f), 1);
        p.gy.push(ci); ci._inGy = true;
        await placeMonster(pi, fusionChoice.f, 'atk', false, 'fusion');
        break;
      }
      case 'ritual': {
        for (const t of ritual.tributes) {
          if (t.from === 'hand') { p.hand.splice(p.hand.indexOf(t.ci), 1); p.gy.push(t.ci); }
          else { const m = p.mz[t.z]; p.mz[t.z] = null; p.gy.push({ uid: m.uid, id: m.id, c: m.c }); }
        }
        p.hand.splice(p.hand.indexOf(ritual.rm), 1);
        p.gy.push(ci); ci._inGy = true;
        await placeMonster(pi, ritual.rm, 'atk', false, 'ritual');
        break;
      }
    }
    if (!ci._inGy) p.gy.push(ci);
    delete ci._inGy;
    render();
    await sleep(250);
    return true;
  }

  /* ---------- Fallen ---------- */
  function setTrap(pi, ci) {
    const p = P(pi);
    const z = freeZone(p.sz);
    if (z < 0) return false;
    p.hand.splice(p.hand.indexOf(ci), 1);
    p.sz[z] = { uid: ci.uid, id: ci.id, c: ci.c, setTurn: D.turnCount };
    log(`${p.name} setzt eine Karte.`);
    return true;
  }
  const trapReady = s => s && s.c.type === 'trap' && s.setTurn < D.turnCount;

  function canManualTrap(pi, z) {
    const s = P(pi).sz[z];
    if (!trapReady(s) || s.c.trig !== 'manual' || D.phase !== 'main' || D.turn !== pi) return false;
    if (s.c.eff === 'revive') return gyMonsters(pi).length > 0 && freeZone(P(pi).mz) >= 0;
    return false;
  }
  async function activateManualTrap(pi, z) {
    const p = P(pi);
    const s = p.sz[z];
    const gm = gyMonsters(pi);
    let g;
    if (isAIControlled(pi)) g = gm.reduce((a, b) => (b.c.atk > a.c.atk ? b : a));
    else { const i = await chooseCard(`${s.c.name}: Wähle ein Monster`, gm.map(x => x.c)); if (i == null) return; g = gm[i]; }
    p.sz[z] = null;
    p.gy.push({ uid: s.uid, id: s.id, c: s.c });
    log(`${p.name} aktiviert ${s.c.name}.`, 'trap');
    D.reveal = s.c; render(); await sleep(600); D.reveal = null;
    p.gy.splice(p.gy.indexOf(g), 1);
    await placeMonster(pi, g, 'atk', false, 'special');
  }

  function battlePreview(attPi, m, tz) {
    const defPi = O(attPi);
    const a = mAtk(attPi, m);
    if (tz == null) return { dmgDef: a, dmgAtt: 0, killAtt: false, killDef: false };
    const t = P(defPi).mz[tz];
    if (t.pos === 'atk' && !t.faceDown) {
      const d = mAtk(defPi, t);
      if (a > d) return { dmgDef: a - d, dmgAtt: 0, killDef: !isStatic(t, 'indestructible'), killAtt: false };
      if (a < d) return { dmgDef: 0, dmgAtt: d - a, killDef: false, killAtt: !isStatic(m, 'indestructible') };
      return { dmgDef: 0, dmgAtt: 0, killDef: !isStatic(t, 'indestructible'), killAtt: !isStatic(m, 'indestructible') };
    }
    const d = mDef(defPi, t);
    if (a > d) return { dmgDef: isStatic(m, 'pierce') ? a - d : 0, dmgAtt: 0, killDef: !isStatic(t, 'indestructible'), killAtt: false };
    if (a < d) return { dmgDef: 0, dmgAtt: d - a, killDef: false, killAtt: false };
    return { dmgDef: 0, dmgAtt: 0, killDef: false, killAtt: false };
  }

  // ctx: attack {pi, z, m, tz}  summon {pi, z, m}
  async function trapResponse(defPi, trig, ctx) {
    const p = P(defPi);
    const cands = p.sz.map((s, z) => ({ s, z })).filter(({ s }) => {
      if (!trapReady(s) || s.c.trig !== trig) return false;
      if (s.c.eff === 'pit') return mAtk(ctx.pi, ctx.m) >= s.c.n;
      return true;
    });
    if (!cands.length) return {};
    let chosen = null;
    if (isAIControlled(defPi)) {
      chosen = aiTrapChoice(defPi, trig, ctx, cands);
    } else {
      const atkName = ctx.m.c.name;
      const what = trig === 'attack'
        ? `${esc(P(ctx.pi).name)} greift mit <b>${esc(atkName)}</b> (ATK ${mAtk(ctx.pi, ctx.m)}) ${ctx.tz == null ? 'dich direkt' : 'dein Monster ' + (P(defPi).mz[ctx.tz].faceDown ? '(verdeckt)' : '<b>' + esc(P(defPi).mz[ctx.tz].c.name) + '</b>')} an.`
        : `${esc(P(ctx.pi).name)} beschwört <b>${esc(atkName)}</b> (ATK ${mAtk(ctx.pi, ctx.m)}).`;
      const r = await modal({
        title: 'Falle aktivieren?',
        html: `<p>${what}</p><div class="card-grid">${cands.map(({ s }, i) => `<button class="pick" data-pick="${i}">${cardHTML(s.c, { size: 'lg' })}</button>`).join('')}</div><p class="hint">Tippe auf eine Falle, um sie zu aktivieren.</p>`,
        wide: true, buttons: [{ label: 'Nicht aktivieren', value: null }],
      });
      if (r && typeof r === 'object') chosen = cands[r.pick];
    }
    if (!chosen) return {};
    const s = chosen.s;
    p.sz[chosen.z] = null;
    p.gy.push({ uid: s.uid, id: s.id, c: s.c });
    log(`${p.name} aktiviert die Falle ${s.c.name}!`, 'trap');
    D.reveal = s.c;
    render();
    await sleep(700);
    D.reveal = null;
    const attPi = ctx.pi;
    switch (s.c.eff) {
      case 'negate': log('Der Angriff wird annulliert.'); return { negated: true };
      case 'destroyAtk': await destroyMon(attPi, ctx.z, 'effect'); return { negated: true };
      case 'mirror': {
        const zs = mons(attPi).filter(o => o.m.pos === 'atk' && !o.m.faceDown).map(o => o.z);
        await destroyMany(attPi, zs);
        return { negated: !P(attPi).mz[ctx.z] };
      }
      case 'reflect': damage(attPi, Math.floor(mAtk(attPi, ctx.m) / 2)); log('Der Angriff wird annulliert.'); return { negated: true };
      case 'burn': damage(attPi, burnAmt(defPi, s.c.n)); return {};
      case 'pit': await destroyMon(attPi, ctx.z, 'effect'); return { negated: true };
    }
    return {};
  }

  function aiTrapChoice(defPi, trig, ctx, cands) {
    if (trig === 'summon') return cands[0];
    const prev = battlePreview(ctx.pi, ctx.m, ctx.tz);
    const bad = prev.dmgDef >= 500 || prev.killDef;
    const atkCount = mons(ctx.pi).filter(o => o.m.pos === 'atk' && !o.m.faceDown).length;
    const order = ['mirror', 'destroyAtk', 'reflect', 'negate', 'burn'];
    for (const eff of order) {
      const c = cands.find(x => x.s.c.eff === eff);
      if (!c) continue;
      if (eff === 'burn') return c;
      if (eff === 'mirror' && (atkCount >= 2 || bad)) return c;
      if (eff !== 'mirror' && bad) return c;
    }
    return null;
  }

  /* ---------- Kampf ---------- */
  function maxAttacks(m) { return isStatic(m, 'double') ? 2 : 1; }
  function canAttack(pi, z) {
    const m = P(pi).mz[z];
    if (!m || D.phase !== 'battle' || D.turn !== pi) return false;
    if (D.turnCount === 1) return false;
    if (P(pi).cage > 0) return false;
    return !m.faceDown && m.pos === 'atk' && m.attacks < maxAttacks(m);
  }
  function attackTargets(pi, z) {
    const m = P(pi).mz[z];
    const t = oppMonCands(pi);
    const direct = t.length === 0 || isStatic(m, 'direct');
    return { mons: t, direct };
  }

  async function attack(pi, z, tz) {
    const m = P(pi).mz[z];
    const defPi = O(pi);
    m.attacks++;
    const tgt = tz == null ? null : P(defPi).mz[tz];
    log(`${m.c.name} greift ${tz == null ? 'direkt' : (tgt.faceDown ? 'ein verdecktes Monster' : tgt.c.name)} an.`, 'atk');
    D.attackFx = { pi, z, tz };
    render();
    await sleep(500);
    D.attackFx = null;
    const r = await trapResponse(defPi, 'attack', { pi, z, m, tz });
    if (D.over) return;
    if (r.negated || P(pi).mz[z] !== m) { render(); return; }
    if (tz == null) {
      damage(defPi, mAtk(pi, m));
      render();
      await sleep(350);
      return;
    }
    const t = P(defPi).mz[tz];
    if (!t || t !== tgt) { log('Das Ziel ist nicht mehr da.'); render(); return; }
    const wasDown = t.faceDown;
    if (wasDown) { t.faceDown = false; log(`Aufgedeckt: ${t.c.name} (DEF ${mDef(defPi, t)}).`); render(); await sleep(450); }
    const pv = battlePreview(pi, m, tz);
    if (pv.dmgDef) damage(defPi, pv.dmgDef);
    if (pv.dmgAtt) damage(pi, pv.dmgAtt);
    const kills = [];
    if (pv.killDef) kills.push([defPi, tz]);
    if (pv.killAtt) kills.push([pi, z]);
    for (const [kp, kz] of kills) await destroyMon(kp, kz, 'battle');
    if (wasDown && t.c.fx && t.c.fx.on === 'flip' && !D.over) await runFx(defPi, t.c.fx, t);
    render();
    await sleep(300);
  }

  /* ---------- KI ---------- */
  function cardValue(c) {
    if (c.type === 'monster') return c.atk + (c.fx ? 300 : 0);
    return { UR: 2600, SR: 2000, R: 1500, C: 1000 }[c.rar];
  }
  const bestAtk = pi => mons(pi).filter(o => !o.m.faceDown).reduce((mx, o) => Math.max(mx, mAtk(pi, o.m)), 0);
  const oppThreat = pi => mons(O(pi)).reduce((mx, o) => Math.max(mx, o.m.faceDown ? 1200 : mAtk(O(pi), o.m)), 0);

  async function aiTurn(pi) {
    await sleep(500);
    for (let guard = 0; guard < 20 && !D.over; guard++) {
      const acted = await aiMainAction(pi);
      if (!acted) break;
      render();
      await sleep(450);
    }
    if (D.over) return;
    if (D.turnCount > 1 && P(pi).cage === 0) {
      D.phase = 'battle';
      render();
      await sleep(350);
      await aiBattle(pi);
    }
  }

  async function aiMainAction(pi) {
    const p = P(pi);
    const op = O(pi);
    const hand = p.hand;
    const spells = hand.filter(ci => ci.c.type === 'spell' && canActivateSpell(pi, ci));
    const find = sp => spells.find(ci => ci.c.sp === sp);
    let ci;
    if ((ci = find('draw')) && p.deck.length > 4) return activateSpell(pi, ci);
    if ((ci = find('heal')) && p.lp <= p.maxLp * 0.55) return activateSpell(pi, ci);
    if ((ci = find('burn'))) return activateSpell(pi, ci);
    if ((ci = find('destroyAllMon')) && (mons(op).length >= 2 || oppThreat(pi) > bestAtk(pi))) return activateSpell(pi, ci);
    if ((ci = find('destroyMon')) && (oppThreat(pi) >= bestAtk(pi) || oppThreat(pi) >= 1800)) return activateSpell(pi, ci);
    if ((ci = find('destroyAllST')) && oppSTCands(pi).length >= 2) return activateSpell(pi, ci);
    if ((ci = find('destroyST'))) return activateSpell(pi, ci);
    if ((ci = find('weakenAll'))) return activateSpell(pi, ci);
    if ((ci = find('fusion'))) return activateSpell(pi, ci);
    if ((ci = find('ritual'))) return activateSpell(pi, ci);
    if ((ci = find('revive')) && gyMonsters(pi).some(g => g.c.atk >= 1500)) return activateSpell(pi, ci);
    if ((ci = find('cage')) && oppThreat(pi) > bestAtk(pi)) return activateSpell(pi, ci);
    for (let z = 0; z < ZONES; z++) if (canManualTrap(pi, z) && gyMonsters(pi).some(g => g.c.atk >= 1500)) { await activateManualTrap(pi, z); return true; }

    // Normalbeschwörung
    if (!p.ns) {
      const opts = hand.filter(h => canNormalSummon(pi, h)).map(h => {
        const need = tributesNeeded(pi, h.c);
        const own = mons(pi).sort((a, b) => cardValue(a.m.c) + a.m.atkMod - (cardValue(b.m.c) + b.m.atkMod));
        const trib = own.slice(0, need);
        const lost = trib.reduce((s, o) => s + mAtk(pi, o.m), 0);
        return { h, need, trib, gain: h.c.atk - lost };
      }).filter(o => o.need === 0 || o.gain > 300).sort((a, b) => b.h.c.atk - a.h.c.atk);
      if (opts.length) {
        const o = opts[0];
        const threat = oppThreat(pi);
        const isFlip = o.h.c.fx && o.h.c.fx.on === 'flip';
        const set = isFlip || (o.h.c.atk + (hasT(pi, 'schleif') ? 200 : 0) < threat && o.h.c.def >= o.h.c.atk - 200);
        await normalSummon(pi, hand.indexOf(o.h), set, o.trib.map(t => t.z));
        return true;
      }
    }
    // Flippbeschwörung
    for (let z = 0; z < ZONES; z++) {
      const m = p.mz[z];
      if (canFlipSummon(pi, z) && ((m.c.fx && m.c.fx.on === 'flip' && (m.c.fx.do !== 'destroyMon' || mons(op).length)) || m.c.atk > oppThreat(pi))) { await flipSummon(pi, z); return true; }
    }
    if ((ci = find('equip'))) return activateSpell(pi, ci, aiPickTarget(pi, ownMonCands(pi, true), 'best'));
    if ((ci = find('rallyTemp')) && D.turnCount > 1 && mons(pi).some(o => o.m.pos === 'atk' && !o.m.faceDown)) return activateSpell(pi, ci);
    // Fallen setzen
    const trap = hand.find(h => h.c.type === 'trap');
    if (trap && freeZone(p.sz) >= 0) { setTrap(pi, trap); return true; }
    // Positionen
    const threat = oppThreat(pi);
    for (let z = 0; z < ZONES; z++) {
      const m = p.mz[z];
      if (!canChangePos(pi, z)) continue;
      if (m.pos === 'atk' && mAtk(pi, m) < threat && mDef(pi, m) > mAtk(pi, m)) { changePos(pi, z); return true; }
      if (m.pos === 'def' && mAtk(pi, m) > threat + 100) { changePos(pi, z); return true; }
    }
    return false;
  }

  async function aiBattle(pi) {
    const order = mons(pi).sort((a, b) => mAtk(pi, b.m) - mAtk(pi, a.m)).map(o => o.z);
    for (const z of order) {
      let safety = 0;
      while (!D.over && canAttack(pi, z) && safety++ < 3) {
        const m = P(pi).mz[z];
        const a = mAtk(pi, m);
        const { mons: ts, direct } = attackTargets(pi, z);
        let best = null, bestScore = 0;
        for (const t of ts) {
          const tm = P(t.side).mz[t.z];
          let score = 0;
          if (tm.faceDown) { score = a >= 1800 ? 500 : (a >= 1500 && Math.random() < 0.4 ? 300 : -1); }
          else {
            const pv = battlePreview(pi, m, t.z);
            if (pv.killAtt && !pv.killDef) score = -1;
            else if (pv.killDef && !pv.killAtt) score = 1000 + mAtk(t.side, tm) + pv.dmgDef;
            else if (pv.killDef && pv.killAtt) score = mAtk(t.side, tm) > a ? 600 : -1;
            else if (pv.dmgAtt > 0) score = -1;
            else score = -1;
          }
          if (score > bestScore) { bestScore = score; best = t; }
        }
        if (direct && (!best || a > 1000 + bestScore / 4)) { await attack(pi, z, null); continue; }
        if (best) { await attack(pi, z, best.z); continue; }
        break;
      }
    }
  }

  /* =========================================================
     UI
     ========================================================= */
  let root = null;

  function mountUI() {
    root = document.getElementById('duel');
    root.hidden = false;
    document.body.classList.add('in-duel');
    root.onclick = onClick;
  }
  function unmountUI() {
    if (!root) return;
    root.hidden = true;
    root.innerHTML = '';
    document.body.classList.remove('in-duel');
  }

  function floatNum(pi, txt, cls) {
    if (!root || D.fast) return;
    const lpEl = root.querySelector(`[data-lp="${pi}"]`);
    if (!lpEl) return;
    const f = document.createElement('span');
    f.className = 'float ' + cls;
    f.textContent = txt;
    lpEl.appendChild(f);
    setTimeout(() => f.remove(), 1300);
  }

  async function pickOnBoard(cands, prompt, cancellable, extra) {
    return new Promise(resolve => {
      D.targeting = { cands, prompt, cancellable, resolve: v => { D.targeting = null; render(); resolve(v); }, extra: extra || null };
      render();
    });
  }

  function lpBar(pi) {
    const p = P(pi);
    const pct = Math.max(0, Math.min(100, (p.lp / p.maxLp) * 100));
    return `<div class="lp" data-lp="${pi}"><div class="lp-num">${p.lp}<small> LP</small></div><div class="lp-bar"><i style="width:${pct}%"></i></div></div>`;
  }

  function pinfo(pi) {
    const p = P(pi);
    return `<div class="pinfo ${pi === 1 ? 'opp' : 'me'} ${D.turn === pi && !D.over ? 'active' : ''}">
      <div class="who"><b>${esc(p.name)}</b>${p.title ? `<small>${esc(p.title)}</small>` : ''}</div>
      ${lpBar(pi)}
      <div class="piles">
        <button class="pile" data-act="gy" data-side="${pi}" title="Friedhof">Friedhof <b>${p.gy.length}</b></button>
        <span class="pile">Deck <b>${p.deck.length}</b></span>
        ${pi === 0 ? `<button class="pile" data-act="extra" title="Extra-Deck">Extra <b>${p.extra.length}</b></button>` : `<span class="pile">Extra <b>${p.extra.length}</b></span>`}
        ${p.cage ? `<span class="pile warn">Gefangen ${p.cage}</span>` : ''}
      </div></div>`;
  }

  function isCand(side, kind, z) {
    return D.targeting && D.targeting.cands.some(c => c.side === side && c.kind === kind && c.z === z);
  }

  function slotHTML(pi, kind, z) {
    const p = P(pi);
    const item = kind === 'm' ? p.mz[z] : p.sz[z];
    const cls = ['slot', kind === 'm' ? 'mslot' : 'sslot'];
    if (isCand(pi, kind, z)) cls.push('cand');
    if (D.sel && D.sel.where === kind && D.sel.side === pi && D.sel.z === z) cls.push('sel');
    if (D.flash && D.flash.pi === pi && D.flash.kind === kind && D.flash.z === z) cls.push('flash');
    if (D.attackFx && D.attackFx.pi === pi && D.attackFx.z === z && kind === 'm') cls.push('attacking');
    if (D.attackFx && D.attackFx.pi !== pi && D.attackFx.tz === z && kind === 'm') cls.push('attacked');
    let inner = '';
    if (item) {
      if (kind === 'm') {
        const hidden = item.faceDown && pi === 1;
        const peek = item.faceDown && pi === 0;
        cls.push(item.pos === 'def' ? 'def' : 'atk');
        if (pi === 0 && canAttack(0, z)) cls.push('ready');
        inner = cardHTML(item.c, { size: 'sm', faceDown: hidden, atk: mAtk(pi, item), def: mDef(pi, item), extraClass: peek ? 'peek' : '' });
      } else {
        const hidden = pi === 1;
        inner = cardHTML(item.c, { size: 'sm', faceDown: hidden, extraClass: 'peek' });
        if (pi === 0 && trapReady(item)) cls.push('armed');
      }
    }
    return `<div class="${cls.join(' ')}" data-act="slot" data-side="${pi}" data-kind="${kind}" data-z="${z}">${inner}</div>`;
  }

  function row(pi, kind) {
    let s = '';
    for (let z = 0; z < ZONES; z++) s += slotHTML(pi, kind, z);
    return `<div class="row ${kind === 'm' ? 'mrow' : 'srow'}">${s}</div>`;
  }

  function handHTML() {
    const p = P(0);
    return `<div class="hand me-hand">${p.hand.map((ci, i) => {
      const playable = D.turn === 0 && !D.auto && !D.busy && D.phase === 'main' && handPlayable(ci);
      const sel = D.sel && D.sel.where === 'hand' && D.sel.uid === ci.uid;
      return `<button class="hcard ${playable ? 'playable' : ''} ${sel ? 'sel' : ''}" data-act="hand" data-i="${i}">${cardHTML(ci.c, { size: 'md', atk: ci.c.type === 'monster' && hasT(0, 'schleif') ? ci.c.atk + 200 : undefined })}</button>`;
    }).join('')}</div>`;
  }
  function handPlayable(ci) {
    if (ci.c.type === 'monster') return canNormalSummon(0, ci);
    if (ci.c.type === 'spell') return canActivateSpell(0, ci);
    return freeZone(P(0).sz) >= 0;
  }

  function phaseBar() {
    const myTurn = D.turn === 0 && !D.over && !D.auto;
    const ph = D.phase;
    const pills = [['main', 'Hauptphase'], ['battle', 'Kampfphase'], ['end', 'Endphase']]
      .map(([k, l]) => `<span class="ph ${ph === k ? 'on' : ''}">${l}</span>`).join('');
    let btns = '';
    if (D.targeting) {
      btns = `${D.targeting.extra ? `<button class="btn primary" data-act="tx">${esc(D.targeting.extra.label)}</button>` : ''}${D.targeting.cancellable ? '<button class="btn" data-act="tcancel">Abbrechen</button>' : ''}`;
    } else if (myTurn && !D.busy) {
      if (ph === 'main' && D.turnCount > 1 && P(0).cage === 0) btns += '<button class="btn" data-act="battle">Zur Kampfphase</button>';
      btns += '<button class="btn primary" data-act="end">Zug beenden</button>';
    }
    const msg = D.targeting ? D.targeting.prompt : (D.turn === 0 ? (D.turnCount === 1 && ph === 'main' ? 'Dein Zug. Im ersten Zug des Duells darf niemand angreifen.' : 'Dein Zug.') : `${P(1).name} ist am Zug …`);
    return `<div class="phasebar">
      <div class="ph-row"><span class="turnno">Zug ${D.turnCount}</span>${pills}<button class="logbtn" data-act="log">${D.showLog ? 'Protokoll ausblenden' : 'Protokoll'}</button></div>
      <div class="ph-msg ${D.targeting ? 'target' : ''}">${esc(msg)}</div>
      <div class="ph-last">${esc(D.log[0] ? D.log[0].msg : '')}</div>
      <div class="ph-btns">${btns}</div>
      ${D.showLog ? `<div class="logbox">${D.log.map(l => `<div class="l ${l.cls}">${esc(l.msg)}</div>`).join('')}</div>` : ''}
    </div>`;
  }

  function detailHTML() {
    const s = D.sel;
    if (!s) return `<div class="detail empty"><p>Tippe eine Karte an, um Details und Aktionen zu sehen.</p><div class="rules"><b>Kurzregeln</b><ul>
      <li>1 Normalbeschwörung pro Zug. Stufe 5–6 braucht 1 Tribut, Stufe 7+ braucht 2.</li>
      <li>ATK gegen ATK: Der Schwächere wird zerstört, sein Besitzer erleidet die Differenz.</li>
      <li>ATK gegen DEF: Ist ATK höher, wird der Verteidiger zerstört. Ist sie niedriger, erleidet der Angreifer die Differenz.</li>
      <li>Fallen müssen einen Zug lang gesetzt sein, bevor sie ausgelöst werden.</li></ul></div></div>`;
    let c, stats = {}, actions = [], faceDown = false, note = '';
    if (s.where === 'hand') {
      const ci = P(0).hand.find(h => h.uid === s.uid);
      if (!ci) { D.sel = null; return detailHTML(); }
      c = ci.c;
      const myMain = D.turn === 0 && D.phase === 'main' && !D.auto;
      if (c.type === 'monster') {
        if (c.kind === 'fusion') note = 'Fusionsmonster werden mit „Verschmelzung“ beschworen.';
        else if (c.kind === 'ritual') note = `Wird mit „${CARDS[c.ritualSpell].name}“ beschworen.`;
        else {
          const need = tributesNeeded(0, c);
          if (need) note = `Benötigt ${need} Tribut${need > 1 ? 'e' : ''}.`;
          const ok = myMain && canNormalSummon(0, ci);
          actions.push({ act: 'summon', label: 'Beschwören (Angriff)', ok });
          actions.push({ act: 'setmon', label: 'Verdeckt setzen', ok });
          if (myMain && P(0).ns) note += ' Du hast in diesem Zug bereits normal beschworen.';
        }
      } else if (c.type === 'spell') {
        actions.push({ act: 'spell', label: 'Aktivieren', ok: myMain && canActivateSpell(0, ci) });
        if (myMain && !canActivateSpell(0, ci)) note = 'Derzeit kann diese Karte nicht aktiviert werden.';
      } else {
        actions.push({ act: 'settrap', label: 'Setzen', ok: myMain && freeZone(P(0).sz) >= 0 });
      }
    } else if (s.where === 'm') {
      const m = P(s.side).mz[s.z];
      if (!m) { D.sel = null; return detailHTML(); }
      c = m.c;
      faceDown = m.faceDown && s.side === 1;
      stats = { atk: mAtk(s.side, m), def: mDef(s.side, m) };
      if (s.side === 0 && D.turn === 0 && !D.auto) {
        if (D.phase === 'main') {
          if (m.faceDown) actions.push({ act: 'flip', label: 'Flippbeschwörung', ok: canFlipSummon(0, s.z) });
          else actions.push({ act: 'pos', label: m.pos === 'atk' ? 'In Verteidigung wechseln' : 'In Angriff wechseln', ok: canChangePos(0, s.z) });
        }
        if (D.phase === 'battle') actions.push({ act: 'attack', label: 'Angreifen', ok: canAttack(0, s.z) });
      }
      const mods = m.atkMod + m.tempAtk;
      if (!faceDown && mods) note = `ATK-Änderung: ${mods > 0 ? '+' : ''}${mods}`;
      if (m.faceDown && s.side === 0) note = 'Verdeckt in Verteidigungsposition. Nur du siehst diese Karte.';
    } else if (s.where === 's') {
      const st = P(s.side).sz[s.z];
      if (!st) { D.sel = null; return detailHTML(); }
      c = st.c;
      faceDown = s.side === 1;
      if (s.side === 0) {
        if (st.c.trig === 'manual') actions.push({ act: 'trap', label: 'Aktivieren', ok: canManualTrap(0, s.z) });
        note = trapReady(st) ? (st.c.trig === 'manual' ? '' : 'Bereit. Wird automatisch angeboten, sobald der Auslöser eintritt.') : 'Kann ab deinem nächsten Zug ausgelöst werden.';
      }
    }
    return `<div class="detail">
      <button class="x" data-act="desel" aria-label="Schließen">×</button>
      ${faceDown ? cardHTML(c, { size: 'lg', faceDown: true }) + '<p class="note">Verdeckte Karte</p>' : cardHTML(c, Object.assign({ size: 'lg' }, stats))}
      ${note ? `<p class="note">${esc(note)}</p>` : ''}
      <div class="actions">${actions.map(a => `<button class="btn ${a.ok ? 'primary' : ''}" data-act="do" data-do="${a.act}" ${a.ok && !D.busy ? '' : 'disabled'}>${esc(a.label)}</button>`).join('')}</div>
    </div>`;
  }

  function render() {
    if (!root || !D) return;
    const oppHand = P(1).hand.map(() => '<div class="mini-back"></div>').join('');
    root.innerHTML = `
      <div class="duel-grid">
        <div class="board ${D.targeting ? 'targeting' : ''}">
          <div class="label-row"><span class="duel-label">${esc(D.label)}</span></div>
          ${pinfo(1)}
          <div class="opp-hand">${oppHand}<span>${P(1).hand.length} Handkarten</span></div>
          ${row(1, 's')}${row(1, 'm')}
          ${phaseBar()}
          ${row(0, 'm')}${row(0, 's')}
          ${pinfo(0)}
          ${handHTML()}
        </div>
        <aside class="side ${D.sel ? 'has-sel' : ''}">${detailHTML()}</aside>
      </div>
      ${D.reveal ? `<div class="reveal">${cardHTML(D.reveal, { size: 'lg' })}</div>` : ''}`;
    D.flash = null;
    D.boom = null;
  }

  async function act(fn) {
    if (D.busy) return;
    D.busy = true;
    render();
    try { await fn(); } catch (e) { console.error(e); }
    D.busy = false;
    render();
  }

  function onClick(e) {
    if (!D) return;
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const a = t.dataset.act;

    if (a === 'log') { D.showLog = !D.showLog; render(); return; }
    if (a === 'gy' || a === 'extra') {
      const side = a === 'gy' ? +t.dataset.side : 0;
      const list = a === 'gy' ? P(side).gy : P(0).extra;
      const title = a === 'gy' ? `Friedhof von ${P(side).name}` : 'Dein Extra-Deck';
      modal({ title, wide: true, html: list.length ? `<div class="card-grid">${list.map(ci => cardHTML(ci.c, { size: 'lg' })).join('')}</div>` : '<p>Leer.</p>', buttons: [{ label: 'Schließen', value: true, primary: true }], dismiss: true });
      return;
    }

    if (D.targeting) {
      if (a === 'tcancel') { D.targeting.resolve(null); return; }
      if (a === 'tx') { D.targeting.resolve({ direct: true }); return; }
      if (a === 'slot') {
        const side = +t.dataset.side, kind = t.dataset.kind, z = +t.dataset.z;
        const c = D.targeting.cands.find(x => x.side === side && x.kind === kind && x.z === z);
        if (c) D.targeting.resolve(c);
      }
      return;
    }

    if (a === 'desel') { D.sel = null; render(); return; }
    if (a === 'hand') {
      const ci = P(0).hand[+t.dataset.i];
      D.sel = { where: 'hand', uid: ci.uid };
      render();
      return;
    }
    if (a === 'slot') {
      const side = +t.dataset.side, kind = t.dataset.kind, z = +t.dataset.z;
      const item = kind === 'm' ? P(side).mz[z] : P(side).sz[z];
      D.sel = item ? { where: kind, side, z } : null;
      render();
      return;
    }
    if (D.turn !== 0 || D.over || D.busy || D.auto) return;
    if (a === 'battle') { D.phase = 'battle'; D.sel = null; render(); return; }
    if (a === 'end') {
      D.sel = null;
      const r = D.endTurnResolve; D.endTurnResolve = null;
      if (r) r();
      return;
    }
    if (a === 'do') doAction(t.dataset.do);
  }

  function doAction(what) {
    const s = D.sel;
    act(async () => {
      if (s.where === 'hand') {
        const ci = P(0).hand.find(h => h.uid === s.uid);
        if (!ci) return;
        if (what === 'summon' || what === 'setmon') {
          const need = tributesNeeded(0, ci.c);
          let trib = [];
          for (let i = 0; i < need; i++) {
            const cands = ownMonCands(0, false).filter(c => !trib.includes(c.z));
            const r = await pickOnBoard(cands, `Wähle Tribut ${i + 1} von ${need} für ${ci.c.name}.`, true);
            if (!r) return;
            trib.push(r.z);
          }
          D.sel = null;
          await normalSummon(0, P(0).hand.indexOf(ci), what === 'setmon', trib);
        } else if (what === 'spell') {
          const ok = await activateSpell(0, ci);
          if (ok) D.sel = null;
        } else if (what === 'settrap') {
          setTrap(0, ci);
          D.sel = null;
        }
      } else if (s.where === 'm') {
        if (what === 'flip') await flipSummon(0, s.z);
        else if (what === 'pos') changePos(0, s.z);
        else if (what === 'attack') {
          const { mons: ts, direct } = attackTargets(0, s.z);
          let tz = null;
          if (ts.length) {
            const r = await pickOnBoard(ts, 'Wähle das Angriffsziel.', true, direct ? { label: 'Direkt angreifen' } : null);
            if (!r) return;
            tz = r.direct ? null : r.z;
          }
          await attack(0, s.z, tz);
          if (!P(0).mz[s.z] || !canAttack(0, s.z)) D.sel = null;
        }
      } else if (s.where === 's') {
        if (what === 'trap') { await activateManualTrap(0, s.z); D.sel = null; }
      }
    });
  }

  return { start, get state() { return D; } };
})();
