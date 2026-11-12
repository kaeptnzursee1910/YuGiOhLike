/* =========================================================
   Autokampf (Pokelike-Prinzip)
   Beide Teams kämpfen automatisch in Reihenfolge: Das jeweils
   vorderste kampffähige Monster tritt an, das schnellere greift
   zuerst an. Ist eines besiegt, rückt das nächste nach.
   Erst wird der ganze Kampf berechnet, dann abgespielt.
   ========================================================= */

const Stats = {
  growth: lvl => (lvl + 3) / 8,
  of(m, tal = []) {
    const c = CARDS[m.id];
    const f = Stats.growth(m.lvl);
    // Grundwerte gestaucht, damit Stufen mehr zählen als die Seltenheit
    const bA = 900 + c.atk * 0.55, bD = 900 + c.def * 0.55;
    let atk = bA * f;
    if (m.item === 's_equip') atk *= 1.15;
    if (m.item === 's_equip2') atk *= 1.25;
    if (m.item === 's_rally') atk *= 1.1;
    if (tal.includes('schleif')) atk *= 1.1;
    let def = bD * f * (tal.includes('ruestung') ? 1.1 : 1) * (m.item === 's_rally' ? 1.1 : 1);
    let maxHp = (bD * 0.9 + bA * 0.3) * f * (tal.includes('amulett') ? 1.15 : 1);
    let spd = 100 + (c.atk - c.def) / 25 + (c.attr === 'WIND' ? 15 : 0) + m.lvl * 0.6 + (tal.includes('vorsprung') ? 40 : 0);
    return { atk: Math.round(atk), def: Math.round(def), maxHp: Math.round(maxHp), spd: Math.round(spd) };
  },
};

const Battle = (() => {
  /* ---------- Simulation ---------- */
  function simulate(pTeam, eTeam, tal) {
    const T = [pTeam, eTeam].map((team, side) => team.map(m => {
      const s = Stats.of(m, side === 0 ? tal : []);
      return {
        m, side, c: CARDS[m.id], lvl: m.lvl, atk: s.atk, def: s.def, maxHp: s.maxHp, spd: s.spd,
        hp: side === 0 ? Math.max(0, Math.min(m.hp, s.maxHp)) : s.maxHp,
        item: m.item || null, itemOff: false, buf: 0, used: {},
      };
    }));
    const act = [-1, -1];
    const ended = [false, false];
    const events = [];
    const f = x => Stats.growth(x.lvl);
    const cur = s => (act[s] >= 0 ? T[s][act[s]] : null);
    const curAtk = x => Math.max(50, Math.round(x.atk + x.buf));
    const itemOn = (x, id) => x.item === id && !x.itemOff;
    const nm = x => (x.side === 0 ? '' : 'Gegn. ') + x.c.name;
    const snap = (text, kind = 'info', extra = {}) => events.push(Object.assign({
      text, kind, act: [...act], hp: T.map(t => t.map(x => x.hp)), atk: T.map(t => t.map(curAtk)), off: T.map(t => t.map(x => x.itemOff)),
    }, extra));

    function heal(x, amt, why) {
      if (x.hp <= 0) return;
      const before = x.hp;
      x.hp = Math.min(x.maxHp, x.hp + Math.round(amt));
      if (x.hp > before) snap(`${nm(x)} heilt ${x.hp - before} KP${why ? ' (' + why + ')' : ''}.`, 'heal', { side: x.side, idx: T[x.side].indexOf(x), amt: x.hp - before });
    }
    function berry(x) {
      if (x.hp <= 0 || x.hp >= x.maxHp / 2 || x.used.berry) return;
      if (itemOn(x, 's_heal')) { x.used.berry = 1; heal(x, x.maxHp * 0.3, CARDS.s_heal.name); }
      else if (itemOn(x, 's_heal2')) { x.used.berry = 1; heal(x, x.maxHp * 0.6, CARDS.s_heal2.name); }
    }
    function hurt(y, dmg) {
      dmg = Math.max(1, Math.round(dmg));
      if (dmg >= y.hp && y.c.fx && y.c.fx.on === 'static' && y.c.fx.do === 'indestructible' && !y.used.sturdy && y.hp > 1) {
        y.used.sturdy = 1;
        dmg = y.hp - 1;
        y.hp = 1;
        snap(`${nm(y)} hält mit 1 KP durch!`, 'info');
        return dmg;
      }
      y.hp = Math.max(0, y.hp - dmg);
      berry(y);
      return dmg;
    }
    function effDmg(src, y, amt, why) {
      if (!y || y.hp <= 0) return;
      const mult = src.side === 0 && tal.includes('brenn') ? 1.5 : 1;
      const d = hurt(y, amt * mult);
      snap(`${nm(y)} erleidet ${d} Effektschaden${why ? ' durch ' + why : ''}.`, 'eff', { side: y.side, idx: T[y.side].indexOf(y), dmg: d });
      if (y.hp <= 0 && T[y.side].indexOf(y) !== act[y.side]) snap(`${nm(y)} wurde besiegt!`, 'faint', { side: y.side });
    }

    function place(side) {
      const i = T[side].findIndex(x => x.hp > 0);
      act[side] = i;
      if (i < 0) { ended[side] = true; return false; }
      snap(`${nm(T[side][i])} (Stufe ${T[side][i].lvl}) betritt den Kampf.`, 'enter', { side });
      return true;
    }

    function entryFx(side) {
      const x = cur(side);
      if (!x || x.hp <= 0) return;
      const o = 1 - side;
      const y = cur(o);
      const fx = x.c.fx;
      if (fx && (fx.on === 'summon' || fx.on === 'flip')) {
        const amt = (fx.n || 0) * 0.8 * f(x);
        switch (fx.do) {
          case 'burn': effDmg(x, y, amt, x.c.name); break;
          case 'heal': { const al = T[side].filter(a => a.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (al) heal(al, amt, x.c.name); break; }
          case 'drain': effDmg(x, y, amt, x.c.name); heal(x, amt, x.c.name); break;
          case 'draw': x.buf += x.atk * 0.1 * fx.n; snap(`${nm(x)} erhält +${fx.n * 10} % ATK.`, 'buff', { side }); break;
          case 'destroyMon': if (y) effDmg(x, y, y.maxHp * 0.2, x.c.name); break;
          case 'destroyST': if (y && y.item && !y.itemOff) { y.itemOff = true; snap(`Das Item von ${nm(y)} wird wirkungslos.`, 'info'); } break;
          case 'destroyAllST': T[o].forEach(e => { e.itemOff = true; }); snap(`Alle Items von ${side === 0 ? 'deinem Gegner' : 'dir'} werden wirkungslos.`, 'info'); break;
          case 'destroyAllMon': T[o].filter(e => e.hp > 0).forEach(e => effDmg(x, e, e.maxHp * 0.15, x.c.name)); break;
          case 'weakenAll': T[o].forEach(e => { e.buf -= amt; }); snap(`Alle ${side === 0 ? 'gegnerischen' : 'deine'} Monster verlieren ${Math.round(amt)} ATK.`, 'debuff', { side: o }); break;
          case 'rally': T[side].forEach(e => { e.buf += amt; }); snap(`Alle ${side === 0 ? 'deine' : 'gegnerischen'} Monster erhalten ${Math.round(amt)} ATK.`, 'buff', { side }); break;
          case 'reviveLow': { const d = T[side].find(a => a.hp <= 0); if (d) { d.hp = Math.round(d.maxHp * 0.3); snap(`${nm(d)} steht mit 30 % KP wieder auf!`, 'heal', { side }); } break; }
        }
      }
      if (x.item && !x.itemOff) {
        switch (x.item) {
          case 's_burn': effDmg(x, y, 600 * 0.8 * f(x), CARDS.s_burn.name); break;
          case 's_burn2': effDmg(x, y, 1200 * 0.8 * f(x), CARDS.s_burn2.name); break;
          case 's_st': if (y && y.item) { y.itemOff = true; snap(`${CARDS.s_st.name}: Das Item von ${nm(y)} wird wirkungslos.`, 'info'); } break;
          case 's_allst': T[o].forEach(e => { e.itemOff = true; }); snap(`${CARDS.s_allst.name}: Alle gegnerischen Items werden wirkungslos.`, 'info'); break;
          case 's_allmon': T[o].filter(e => e.hp > 0).forEach(e => effDmg(x, e, e.maxHp * 0.15, CARDS.s_allmon.name)); break;
          case 's_weaken': if (y) { y.buf -= y.atk * 0.2; snap(`${nm(y)} verliert 20 % ATK.`, 'debuff', { side: o }); } break;
        }
      }
      // Fallgrube des Gegners
      if (y && y.hp > 0 && (itemOn(y, 't_pit') || itemOn(y, 't_pit2'))) {
        effDmg(y, x, x.maxHp * (y.item === 't_pit' ? 0.15 : 0.25), CARDS[y.item].name);
      }
    }

    function handleFaint(side) {
      const x = cur(side);
      if ((itemOn(x, 's_revive') || itemOn(x, 't_revive')) && !x.used.rev) {
        x.used.rev = 1;
        x.hp = Math.round(x.maxHp * 0.5);
        snap(`${nm(x)} steht durch ${CARDS[x.item].name} wieder auf!`, 'heal', { side });
        return;
      }
      snap(`${nm(x)} wurde besiegt!`, 'faint', { side });
      const k = cur(1 - side);
      const fx = x.c.fx;
      const next = T[side].find((a, i) => a.hp > 0 && i !== act[side]);
      if (fx && fx.on === 'destroyed') {
        const amt = (fx.n || 0) * 0.8 * f(x);
        if (fx.do === 'burn' && k && k.hp > 0) effDmg(x, k, amt, x.c.name);
        if (fx.do === 'heal' && next) heal(next, amt, x.c.name);
        if (fx.do === 'draw') T[side].filter(a => a.hp > 0).forEach(a => heal(a, a.maxHp * 0.1, x.c.name));
        if (fx.do === 'recruit' && next) { next.buf += next.atk * 0.2; snap(`${nm(next)} erhält +20 % ATK.`, 'buff', { side }); }
      }
      if (itemOn(x, 't_destroyAtk') && k && k.hp > 0) effDmg(x, k, k.maxHp * 0.3, CARDS.t_destroyAtk.name);
      act[side] = -1;
    }

    function settle() {
      for (let g = 0; g < 30; g++) {
        let changed = false;
        for (const s of [0, 1]) if (act[s] >= 0 && cur(s).hp <= 0) { handleFaint(s); changed = true; }
        for (const s of [0, 1]) if (act[s] === -1 && !ended[s]) { if (place(s)) entryFx(s); changed = true; }
        if (!changed) break;
      }
    }

    function attack(x, y, mult) {
      const pierce = x.c.fx && x.c.fx.on === 'static' && x.c.fx.do === 'pierce';
      const A = curAtk(x), D = y.def * (pierce ? 0.7 : 1);
      const eff = typeMult(x.c.attr, y.c.attr);
      let crit;
      if (itemOn(x, 's_destroy') && !x.used.crit) { x.used.crit = 1; crit = true; }
      else crit = Math.random() < 0.08 + (x.side === 0 && tal.includes('krit') ? 0.1 : 0);
      let dmg = (A * A) / (A + D) * 0.55 * mult * eff * (crit ? 1.5 : 1) * (0.85 + Math.random() * 0.15);
      dmg = Math.max(1, Math.round(dmg));
      const base = { side: x.side, tside: y.side, eff, crit };
      if (itemOn(y, 't_negate') && !y.used.neg) {
        y.used.neg = 1;
        snap(`${CARDS.t_negate.name} von ${nm(y)} blockt den Angriff von ${nm(x)}!`, 'block', base);
        return;
      }
      let back = 0;
      if (itemOn(y, 't_reflect') && !y.used.ref) { y.used.ref = 1; back += dmg; dmg = Math.round(dmg / 2); }
      const dealt = hurt(y, dmg);
      snap(`${nm(x)} greift an: ${dealt} Schaden${crit ? ', Volltreffer' : ''}.`, 'attack', Object.assign({ dmg: dealt }, base));
      if (itemOn(y, 't_mirror')) back += Math.round(dealt * 0.25);
      if (itemOn(y, 't_burn')) back += 400 * 0.8 * f(y);
      if (back > 0 && x.hp > 0) effDmg(y, x, back, CARDS[y.item].name);
      if (x.c.fx && x.c.fx.do === 'direct' && x.c.fx.on === 'static') {
        const z = T[y.side].find((a, i) => a.hp > 0 && i !== act[y.side]);
        if (z) effDmg(x, z, dealt * 0.25, 'Streuangriff');
      }
    }

    // Start
    place(0); place(1);
    if (ended[0] || ended[1]) return finish();
    entryFx(0); entryFx(1);
    settle();
    let round = 0;
    while (!ended[0] && !ended[1] && round < 250) {
      round++;
      const a = cur(0), b = cur(1);
      const first = (() => {
        const ca = itemOn(a, 's_cage'), cb = itemOn(b, 's_cage');
        if (ca !== cb) return ca ? 0 : 1;
        if (a.spd !== b.spd) return a.spd > b.spd ? 0 : 1;
        return Math.random() < 0.5 ? 0 : 1;
      })();
      for (const s of [first, 1 - first]) {
        const x = cur(s), y = cur(1 - s);
        if (!x || !y || x.hp <= 0 || y.hp <= 0) break;
        attack(x, y, 1);
        const dbl = x.c.fx && x.c.fx.on === 'static' && x.c.fx.do === 'double';
        if (dbl && x.hp > 0 && y.hp > 0) attack(x, y, 0.5);
        settle();
        if (cur(0) !== a || cur(1) !== b) break;
      }
    }
    return finish();

    function finish() {
      let won;
      if (ended[1] && !ended[0]) won = true;
      else if (ended[0]) won = false;
      else {
        const r = s => T[s].reduce((t, x) => t + x.hp / x.maxHp, 0);
        won = r(0) >= r(1);
        snap('Zeit ist um! Das Team mit mehr verbleibender Kraft gewinnt.', 'info');
      }
      snap(won ? 'Du hast gewonnen!' : 'Dein Team wurde besiegt.', 'end', { won });
      return {
        won, events,
        hp: T[0].map(x => x.hp),
        fighters: T.map(t => t.map(x => ({ id: x.c.id, lvl: x.lvl, maxHp: x.maxHp, item: x.item, def: x.def, spd: x.spd }))),
      };
    }
  }

  /* ---------- Abspielen ---------- */
  let speed = 1;
  try { speed = +localStorage.getItem('duellpfad-speed') || 1; } catch (e) { /* egal */ }

  function play(res, { label, enemyName, instant }) {
    return new Promise(resolve => {
      const root = document.getElementById('battle');
      root.hidden = false;
      document.body.classList.add('in-battle');
      let i = 0, skip = !!instant, done = false, timer = null;
      const F = res.fighters;

      const benchHTML = (side, ev) => `<div class="bench ${side ? 'enemy' : 'me'}">${F[side].map((x, k) => {
        const hp = ev.hp[side][k];
        const c = CARDS[x.id];
        return `<div class="bm ${ev.act[side] === k ? 'active' : ''} ${hp <= 0 ? 'down' : ''}" title="${esc(c.name)}">
          <div class="bm-art" style="--a1:${ATTR_COLORS[c.attr][0]};--a2:${ATTR_COLORS[c.attr][1]}">${initials(c.name)}</div>
          <div class="bm-lv">St. ${x.lvl}</div><div class="hpbar"><i style="width:${Math.max(0, hp / x.maxHp * 100)}%" class="${hpClass(hp / x.maxHp)}"></i></div></div>`;
      }).join('')}</div>`;

      const fighterHTML = (side, ev) => {
        const k = ev.act[side];
        if (k == null || k < 0) return `<div class="fighter ${side ? 'enemy' : 'me'} empty"></div>`;
        const x = F[side][k];
        const c = CARDS[x.id];
        const hp = ev.hp[side][k];
        const anim = [];
        if (ev.kind === 'attack' || ev.kind === 'block') { if (ev.side === side) anim.push('lunge'); else anim.push(ev.kind === 'block' ? 'blocked' : 'shake'); }
        if ((ev.kind === 'eff') && ev.side === side && ev.idx === k) anim.push('shake');
        if (ev.kind === 'enter' && ev.side === side) anim.push('enter');
        if (ev.kind === 'faint' && ev.side === side) anim.push('faint');
        if (ev.kind === 'heal' && ev.side === side) anim.push('glow');
        let float = '';
        if (ev.kind === 'attack' && ev.tside === side) float = `<span class="dmgf">-${ev.dmg}${ev.eff > 1 ? '<em>Sehr effektiv!</em>' : ev.eff < 1 ? '<em>Nicht sehr effektiv</em>' : ''}${ev.crit ? '<em>Volltreffer!</em>' : ''}</span>`;
        if (ev.kind === 'eff' && ev.side === side && ev.idx === k) float = `<span class="dmgf">-${ev.dmg}</span>`;
        if (ev.kind === 'heal' && ev.side === side && ev.amt) float = `<span class="dmgf heal">+${ev.amt}</span>`;
        const item = x.item ? `<span class="itm ${ev.off[side][k] ? 'off' : ''}">${esc(CARDS[x.item].name)}</span>` : '';
        return `<div class="fighter ${side ? 'enemy' : 'me'}">
          <div class="f-card ${anim.join(' ')}">${cardHTML(c, { size: 'md', atk: ev.atk[side][k], def: x.def })}${float}</div>
          <div class="f-info"><b>${esc(c.name)}</b><span class="lvtag">Stufe ${x.lvl} · ${c.attr}</span>
            <div class="hpbar big"><i style="width:${Math.max(0, hp / x.maxHp * 100)}%" class="${hpClass(hp / x.maxHp)}"></i></div>
            <span class="hpnum">${hp} / ${x.maxHp} KP</span>${item}</div></div>`;
      };

      const draw = () => {
        const ev = res.events[Math.min(i, res.events.length - 1)];
        const recent = res.events.slice(Math.max(0, i - 3), i + 1).map(e => e.text).reverse();
        root.innerHTML = `<div class="battle-wrap">
          <div class="bt-head"><span class="bt-label">${esc(label)}</span>
            <div class="bt-ctrl">${[1, 2, 4].map(s => `<button class="btn small ${speed === s ? 'primary' : ''}" data-b="spd" data-s="${s}">${s}×</button>`).join('')}
            ${done ? '' : '<button class="btn small" data-b="skip">Überspringen</button>'}</div></div>
          <div class="side-name">${esc(enemyName)}</div>
          ${benchHTML(1, ev)}
          <div class="arena">${fighterHTML(1, ev)}<div class="vs-mark">VS</div>${fighterHTML(0, ev)}</div>
          ${benchHTML(0, ev)}
          <div class="side-name me">Dein Team</div>
          <div class="bt-log">${recent.map((t, n) => `<div class="${n === 0 ? 'now' : ''}">${esc(t)}</div>`).join('')}</div>
          ${done ? `<div class="bt-end ${res.won ? 'won' : 'lost'}"><h3>${res.won ? 'Sieg!' : 'Niederlage'}</h3><button class="btn primary big" data-b="next">Weiter</button></div>` : ''}
        </div>`;
      };

      const delay = ev => ({ enter: 750, attack: 700, faint: 800, end: 400 }[ev.kind] || 600) / speed;
      const step = () => {
        if (skip) { i = res.events.length - 1; done = true; draw(); return; }
        draw();
        if (i >= res.events.length - 1) { done = true; draw(); return; }
        timer = setTimeout(() => { i++; step(); }, delay(res.events[i]));
      };
      root.onclick = e => {
        const b = e.target.closest('[data-b]');
        if (!b) return;
        if (b.dataset.b === 'spd') { speed = +b.dataset.s; try { localStorage.setItem('duellpfad-speed', speed); } catch (er) { /* egal */ } draw(); }
        if (b.dataset.b === 'skip') { clearTimeout(timer); skip = true; step(); }
        if (b.dataset.b === 'next') { root.hidden = true; root.innerHTML = ''; document.body.classList.remove('in-battle'); resolve(); }
      };
      step();
      if (instant) { root.hidden = true; root.innerHTML = ''; document.body.classList.remove('in-battle'); resolve(); }
    });
  }

  function hpClass(r) { return r > 0.5 ? 'ok' : r > 0.2 ? 'mid' : 'low'; }

  return { simulate, play, hpClass };
})();
