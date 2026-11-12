/* =========================================================
   Duellpfad – Kartendaten, Duellanten, Talismane
   Alle Karten sind Eigenkreationen. Regelwerk im Stil der
   klassischen Ära: Tributbeschwörung, Fusion, Ritual,
   Flipp-Effekte, gesetzte Fallen.
   ========================================================= */

const CARDS = {};
const RAR_ORDER = { C: 0, R: 1, SR: 2, UR: 3 };
const RAR_LABEL = { C: 'Gewöhnlich', R: 'Selten', SR: 'Super Selten', UR: 'Ultra Selten' };

function M(id, name, lvl, atk, def, attr, race, theme, rar, fx, flavor) {
  CARDS[id] = { id, name, type: 'monster', kind: fx ? 'effect' : 'normal', lvl, atk, def, attr, race, theme, rar, fx: fx || null, flavor: flavor || '' };
}
function F(id, name, lvl, atk, def, attr, race, rar, mats, fx) {
  CARDS[id] = { id, name, type: 'monster', kind: 'fusion', lvl, atk, def, attr, race, theme: 'fusion', rar, mats, fx: fx || null, flavor: '' };
}
function R(id, name, lvl, atk, def, attr, race, theme, rar, spell, fx) {
  CARDS[id] = { id, name, type: 'monster', kind: 'ritual', lvl, atk, def, attr, race, theme, rar, ritualSpell: spell, fx: fx || null, flavor: '' };
}
function S(id, name, rar, sp, n, extra) {
  CARDS[id] = Object.assign({ id, name, type: 'spell', kind: 'spell', theme: 'neutral', rar, sp, n: n || 0 }, extra || {});
}
function T(id, name, rar, trig, eff, n) {
  CARDS[id] = { id, name, type: 'trap', kind: 'trap', theme: 'neutral', rar, trig, eff, n: n || 0 };
}

/* ---------- Krieger ---------- */
M('k1', 'Rekrut der Grenzwacht', 3, 1200, 1000, 'ERDE', 'Krieger', 'krieger', 'C', null, 'Frisch vereidigt und fest entschlossen, seinen Posten zu halten.');
M('k2', 'Schildträgerin', 4, 1000, 1900, 'ERDE', 'Krieger', 'krieger', 'C', null, 'Ihr Turmschild hat noch keinen Pfeil durchgelassen.');
M('k3', 'Klingentänzer', 4, 1700, 1100, 'ERDE', 'Krieger', 'krieger', 'C', null, 'Zwei Säbel, kein Laut, ein Wirbel aus Stahl.');
M('k4', 'Veteran mit Morgenstern', 4, 1800, 800, 'ERDE', 'Krieger', 'krieger', 'C', null, 'Zu alt zum Ausweichen, zu stur zum Fallen.');
M('k5', 'Bannerträger', 3, 1300, 1200, 'LICHT', 'Krieger', 'krieger', 'R', { on: 'summon', do: 'rally', n: 300 });
M('k6', 'Doppelklinge', 4, 1400, 1000, 'ERDE', 'Krieger', 'krieger', 'R', { on: 'static', do: 'double' });
M('k7', 'Speerreiter', 4, 1600, 1200, 'ERDE', 'Krieger', 'krieger', 'R', { on: 'static', do: 'pierce' });
M('k8', 'Feldherr Aldric', 6, 2300, 1800, 'ERDE', 'Krieger', 'krieger', 'SR', { on: 'summon', do: 'destroyMon' });
M('k9', 'Zitadellenwächter', 7, 2400, 2800, 'ERDE', 'Krieger', 'krieger', 'R', null, 'Ein lebendes Bollwerk aus Granit und Eid.');
M('k10', 'Klingenkönigin Seraphine', 8, 2800, 2300, 'LICHT', 'Krieger', 'krieger', 'UR', { on: 'static', do: 'double' });
M('k11', 'Junger Knappe', 2, 600, 800, 'ERDE', 'Krieger', 'krieger', 'C', { on: 'destroyed', do: 'recruit', race: 'Krieger', maxLvl: 4 });

/* ---------- Drachen ---------- */
M('d1', 'Glutwelpe', 3, 1200, 700, 'FEUER', 'Drache', 'drache', 'C', { on: 'summon', do: 'burn', n: 300 });
M('d2', 'Schuppendrache', 4, 1700, 1400, 'WIND', 'Drache', 'drache', 'C', null, 'Seine Schuppen klirren wie Kettenhemden im Wind.');
M('d3', 'Aschenwyvern', 4, 1800, 1000, 'FEUER', 'Drache', 'drache', 'C', null, 'Wo er landet, wächst ein Jahr lang kein Gras.');
M('d4', 'Feuerschwingen-Drache', 5, 2100, 1600, 'FEUER', 'Drache', 'drache', 'R', null, 'Sein Flügelschlag entfacht Steppenbrände.');
M('d5', 'Sturmdrache', 6, 2400, 2000, 'WIND', 'Drache', 'drache', 'R', { on: 'summon', do: 'burn', n: 500 });
M('d6', 'Ascheherz-Drache', 7, 2600, 2100, 'FEUER', 'Drache', 'drache', 'SR', { on: 'static', do: 'pierce' });
M('d7', 'Obsidiandrache', 8, 3000, 2500, 'FINSTERNIS', 'Drache', 'drache', 'UR', null, 'Ein Drache aus erkaltetem Vulkanglas. Legenden sagen, er sei unzerbrechlich.');
M('d8', 'Drachenbrut-Hüterin', 4, 1200, 1100, 'FEUER', 'Drache', 'drache', 'R', { on: 'destroyed', do: 'recruit', race: 'Drache', maxLvl: 4 });
M('d9', 'Eisenschuppen-Drache', 4, 1400, 2000, 'ERDE', 'Drache', 'drache', 'C', null, 'Langsam, schwer und kaum zu verwunden.');

/* ---------- Hexer ---------- */
M('h1', 'Lehrling des Zirkels', 3, 1100, 1000, 'FINSTERNIS', 'Hexer', 'hexer', 'C', { on: 'flip', do: 'draw', n: 1 });
M('h2', 'Nebelweberin', 4, 1500, 1500, 'FINSTERNIS', 'Hexer', 'hexer', 'C', null, 'Sie spinnt aus Nebel Schleier, die selbst Drachen täuschen.');
M('h3', 'Runenmagier', 4, 1600, 1200, 'LICHT', 'Hexer', 'hexer', 'R', { on: 'summon', do: 'destroyST' });
M('h4', 'Schattenbeschwörer', 4, 1300, 1600, 'FINSTERNIS', 'Hexer', 'hexer', 'R', { on: 'flip', do: 'destroyMon' });
M('h5', 'Arkaner Gelehrter', 5, 2000, 1700, 'LICHT', 'Hexer', 'hexer', 'R', { on: 'summon', do: 'draw', n: 1 });
M('h6', 'Hohe Zauberin Lyra', 7, 2500, 2100, 'LICHT', 'Hexer', 'hexer', 'SR', { on: 'summon', do: 'burn', n: 800 });
M('h7', 'Meister der Leere', 8, 2900, 2400, 'FINSTERNIS', 'Hexer', 'hexer', 'UR', { on: 'summon', do: 'destroyAllST' });
M('h8', 'Kristallkugel-Seher', 2, 400, 600, 'LICHT', 'Hexer', 'hexer', 'R', { on: 'flip', do: 'draw', n: 2 });
M('h9', 'Dunkle Novizin', 4, 1400, 1200, 'FINSTERNIS', 'Hexer', 'hexer', 'C', null, 'Ihre erste Beschwörung ging schief. Die zweite nicht.');

/* ---------- Wasser ---------- */
M('w1', 'Korallenwächter', 4, 1300, 1800, 'WASSER', 'Aqua', 'wasser', 'C', null, 'Er wächst seit tausend Jahren am selben Riff.');
M('w2', 'Gezeitenschlange', 4, 1600, 1300, 'WASSER', 'Aqua', 'wasser', 'C', null, 'Sie kommt mit der Flut und geht mit der Beute.');
M('w3', 'Perlentaucher', 3, 1000, 1000, 'WASSER', 'Aqua', 'wasser', 'C', { on: 'destroyed', do: 'draw', n: 1 });
M('w4', 'Flussgeist', 4, 1200, 900, 'WASSER', 'Aqua', 'wasser', 'R', { on: 'static', do: 'direct' });
M('w5', 'Leviathan der Tiefe', 7, 2700, 2400, 'WASSER', 'Aqua', 'wasser', 'SR', { on: 'summon', do: 'weakenAll', n: 500 });
M('w6', 'Muschelpanzer', 3, 500, 2100, 'WASSER', 'Aqua', 'wasser', 'C', null, 'Schließt er die Schale, ist das Duell für ihn vorbei.');
M('w7', 'Brandungshexe', 4, 1500, 1000, 'WASSER', 'Aqua', 'wasser', 'C', { on: 'summon', do: 'heal', n: 500 });
M('w8', 'Tiefseekrake', 5, 2000, 1900, 'WASSER', 'Aqua', 'wasser', 'R', null, 'Acht Arme, ein Hunger.');

/* ---------- Wind ---------- */
M('f1', 'Sturmfalke', 4, 1600, 1000, 'WIND', 'Geflügeltes Ungeheuer', 'wind', 'C', null, 'Stürzt mit dreihundert Sachen vom Himmel.');
M('f2', 'Wolkenreiter', 3, 1300, 600, 'WIND', 'Geflügeltes Ungeheuer', 'wind', 'C', null, 'Er reitet den Aufwind, wohin er auch weht.');
M('f3', 'Windharpyie', 4, 1500, 1300, 'WIND', 'Geflügeltes Ungeheuer', 'wind', 'R', { on: 'summon', do: 'destroyST' });
M('f4', 'Donneradler', 6, 2300, 1600, 'WIND', 'Geflügeltes Ungeheuer', 'wind', 'R', { on: 'static', do: 'pierce' });
M('f5', 'Himmelsgreif', 7, 2400, 2000, 'WIND', 'Geflügeltes Ungeheuer', 'wind', 'SR', { on: 'static', do: 'double' });
M('f6', 'Flinker Spatz', 2, 800, 400, 'WIND', 'Geflügeltes Ungeheuer', 'wind', 'C', { on: 'static', do: 'direct' });
M('f7', 'Sturmkönigin Aerith', 8, 2800, 2200, 'WIND', 'Geflügeltes Ungeheuer', 'wind', 'UR', { on: 'summon', do: 'destroyAllST' });

/* ---------- Zombie ---------- */
M('z1', 'Moderleiche', 3, 1100, 1000, 'FINSTERNIS', 'Zombie', 'zombie', 'C', null, 'Sie weiß nicht mehr, wer sie war. Nur, dass sie Hunger hat.');
M('z2', 'Knochenritter', 4, 1600, 900, 'FINSTERNIS', 'Zombie', 'zombie', 'C', null, 'Sein Schwert ist verrostet, sein Eid nicht.');
M('z3', 'Grabwächter', 4, 1200, 1500, 'ERDE', 'Zombie', 'zombie', 'R', { on: 'destroyed', do: 'recruit', race: 'Zombie', maxLvl: 4 });
M('z4', 'Seelenfresser', 4, 1500, 1200, 'FINSTERNIS', 'Zombie', 'zombie', 'C', { on: 'summon', do: 'drain', n: 300 });
M('z5', 'Gruftfürst', 6, 2200, 1800, 'FINSTERNIS', 'Zombie', 'zombie', 'SR', { on: 'summon', do: 'reviveLow', maxLvl: 4 });
M('z6', 'Schreckensmumie', 5, 1900, 2000, 'ERDE', 'Zombie', 'zombie', 'R', null, 'Dreitausend Jahre in Leinen gewickelt. Schlecht gelaunt.');
M('z7', 'Untoter König Morvath', 8, 2800, 2200, 'FINSTERNIS', 'Zombie', 'zombie', 'UR', { on: 'static', do: 'indestructible' });

/* ---------- Maschine ---------- */
M('m1', 'Zahnradsoldat', 4, 1500, 1300, 'ERDE', 'Maschine', 'maschine', 'C', null, 'Tick, tack, Angriff.');
M('m2', 'Schraubenspinne', 3, 1000, 1200, 'FINSTERNIS', 'Maschine', 'maschine', 'C', null, 'Acht Beine aus Messing, ein rotes Auge.');
M('m3', 'Wachroboter Mk-II', 4, 1400, 1800, 'ERDE', 'Maschine', 'maschine', 'C', null, 'Modell I hatte Probleme mit Treppen.');
M('m4', 'Kanonenläufer', 4, 1600, 1000, 'FEUER', 'Maschine', 'maschine', 'R', { on: 'summon', do: 'burn', n: 400 });
M('m5', 'Stahlkoloss', 6, 2400, 1600, 'ERDE', 'Maschine', 'maschine', 'R', null, 'Achtzig Tonnen Stahl auf zwei Beinen.');
M('m6', 'Belagerungsmaschine', 7, 2600, 2300, 'ERDE', 'Maschine', 'maschine', 'SR', { on: 'static', do: 'pierce' });
M('m7', 'Omega-Konstrukt', 8, 3000, 2800, 'FINSTERNIS', 'Maschine', 'maschine', 'UR', { on: 'summon', do: 'destroyMon' });

/* ---------- Pyro ---------- */
M('p1', 'Funkenkobold', 2, 700, 300, 'FEUER', 'Pyro', 'feuer', 'C', { on: 'summon', do: 'burn', n: 400 });
M('p2', 'Flammenbändiger', 4, 1600, 1100, 'FEUER', 'Pyro', 'feuer', 'C', null, 'Er hält das Feuer in der bloßen Hand.');
M('p3', 'Lavagolem', 4, 1500, 1700, 'FEUER', 'Pyro', 'feuer', 'C', null, 'Er hinterlässt Fußspuren aus glühendem Stein.');
M('p4', 'Glutphönix', 4, 1400, 900, 'FEUER', 'Pyro', 'feuer', 'R', { on: 'destroyed', do: 'burn', n: 500 });
M('p5', 'Inferno-Elementar', 6, 2300, 1500, 'FEUER', 'Pyro', 'feuer', 'R', { on: 'summon', do: 'burn', n: 600 });
M('p6', 'Feuerfürst Ignis', 7, 2500, 2000, 'FEUER', 'Pyro', 'feuer', 'SR', { on: 'summon', do: 'burn', n: 1000 });

/* ---------- Licht / Fee ---------- */
M('l1', 'Morgenfee', 3, 900, 1100, 'LICHT', 'Fee', 'licht', 'C', { on: 'summon', do: 'heal', n: 500 });
M('l2', 'Lichtwächterin', 4, 1400, 1700, 'LICHT', 'Fee', 'licht', 'C', null, 'Ihre Laterne verlischt nie.');
M('l3', 'Engel der Gnade', 4, 1300, 1500, 'LICHT', 'Fee', 'licht', 'C', { on: 'destroyed', do: 'heal', n: 1000 });
M('l4', 'Sternenpriesterin', 5, 1900, 2000, 'LICHT', 'Fee', 'licht', 'R', { on: 'summon', do: 'heal', n: 1000 });
M('l5', 'Seraph des Urteils', 7, 2600, 2200, 'LICHT', 'Fee', 'licht', 'SR', { on: 'summon', do: 'destroyMon' });
M('l6', 'Strahlende Walküre', 8, 2900, 2500, 'LICHT', 'Fee', 'licht', 'UR', { on: 'summon', do: 'weakenAll', n: 700 });

/* ---------- Fusionsmonster (Extra-Deck) ---------- */
F('x1', 'Flammenritter', 6, 2500, 2000, 'FEUER', 'Krieger', 'R', [{ race: 'Krieger' }, { race: 'Drache' }], { on: 'static', do: 'pierce' });
F('x2', 'Zwillingskopf-Drache', 7, 2600, 2000, 'FEUER', 'Drache', 'R', [{ race: 'Drache' }, { race: 'Drache' }], { on: 'summon', do: 'burn', n: 500 });
F('x3', 'Heilige Klinge', 7, 2600, 2400, 'LICHT', 'Krieger', 'R', [{ race: 'Krieger' }, { race: 'Fee' }], { on: 'summon', do: 'heal', n: 1000 });
F('x4', 'Nekromant der Leere', 7, 2600, 2100, 'FINSTERNIS', 'Hexer', 'R', [{ race: 'Hexer' }, { race: 'Zombie' }], { on: 'summon', do: 'reviveLow', maxLvl: 4 });
F('x5', 'Knochendrache', 7, 2700, 2000, 'FINSTERNIS', 'Drache', 'SR', [{ race: 'Zombie' }, { race: 'Drache' }], { on: 'static', do: 'indestructible' });
F('x6', 'Gezeitenkoloss', 7, 2700, 2600, 'WASSER', 'Maschine', 'R', [{ race: 'Aqua' }, { race: 'Maschine' }], null);
F('x7', 'Infernokaiser', 7, 2700, 1800, 'FEUER', 'Pyro', 'R', [{ race: 'Pyro' }, { race: 'Pyro' }], { on: 'summon', do: 'burn', n: 800 });
F('x8', 'Arkane Chimäre', 7, 2600, 2000, 'WIND', 'Hexer', 'R', [{ race: 'Hexer' }, { race: 'Geflügeltes Ungeheuer' }], { on: 'static', do: 'double' });
F('x9', 'Sturmwerk-Titan', 7, 2700, 2200, 'WIND', 'Maschine', 'R', [{ race: 'Maschine' }, { race: 'Geflügeltes Ungeheuer' }], { on: 'static', do: 'pierce' });
F('x10', 'Gruftkoloss', 7, 2500, 2500, 'FINSTERNIS', 'Zombie', 'R', [{ race: 'Zombie' }, { race: 'Zombie' }], { on: 'summon', do: 'reviveLow', maxLvl: 6 });
F('x11', 'Sternenweber', 7, 2500, 2300, 'LICHT', 'Hexer', 'R', [{ race: 'Hexer' }, { race: 'Fee' }], { on: 'summon', do: 'draw', n: 2 });
F('x12', 'Brandungsdrache', 7, 2700, 2100, 'WASSER', 'Drache', 'R', [{ race: 'Drache' }, { race: 'Aqua' }], { on: 'summon', do: 'weakenAll', n: 400 });
F('x13', 'Urdrache Aeternus', 10, 4000, 3500, 'FINSTERNIS', 'Drache', 'UR', [{ id: 'd7' }, { id: 'd7' }], { on: 'summon', do: 'destroyAllMon' });
F('x14', 'Kriegsherr der Klingen', 8, 3000, 2500, 'ERDE', 'Krieger', 'SR', [{ race: 'Krieger' }, { race: 'Krieger' }], { on: 'static', do: 'double' });

/* ---------- Ritualmonster ---------- */
R('r1', 'Ritter der Morgenröte', 6, 2500, 2200, 'LICHT', 'Krieger', 'krieger', 'SR', 's_rit1', { on: 'summon', do: 'destroyMon' });
R('r2', 'Dämonenfürst Xar', 8, 3200, 2500, 'FINSTERNIS', 'Unterweltler', 'hexer', 'UR', 's_rit2', { on: 'summon', do: 'weakenAll', n: 600 });
R('r3', 'Drachenpriester Valdur', 7, 2800, 2400, 'FEUER', 'Drache', 'drache', 'SR', 's_rit3', { on: 'static', do: 'pierce' });

/* ---------- Zauberkarten ---------- */
S('s_burn', 'Feuerball', 'C', 'burn', 600);
S('s_burn2', 'Meteorschauer', 'R', 'burn', 1200);
S('s_heal', 'Heiltrank', 'C', 'heal', 1000);
S('s_heal2', 'Quelle des Lebens', 'R', 'heal', 2500);
S('s_draw', 'Kartenorakel', 'R', 'draw', 2);
S('s_destroy', 'Blitzschlag', 'R', 'destroyMon');
S('s_st', 'Wirbelsturm', 'C', 'destroyST');
S('s_allst', 'Sturmflut', 'SR', 'destroyAllST');
S('s_allmon', 'Himmelsgericht', 'UR', 'destroyAllMon');
S('s_equip', 'Langschwert', 'C', 'equip', 500);
S('s_equip2', 'Drachenzahn-Klinge', 'R', 'equip', 800);
S('s_rally', 'Kriegsschrei', 'C', 'rallyTemp', 500);
S('s_weaken', 'Lähmender Nebel', 'R', 'weakenAll', 500);
S('s_revive', 'Wiedergeburt', 'R', 'revive');
S('s_cage', 'Lichtkäfig', 'SR', 'cage', 2);
S('s_fusion', 'Verschmelzung', 'R', 'fusion');
S('s_rit1', 'Ritual der Morgenröte', 'SR', 'ritual', 0, { ritual: 'r1' });
S('s_rit2', 'Pakt der Finsternis', 'UR', 'ritual', 0, { ritual: 'r2' });
S('s_rit3', 'Drachenweihe', 'SR', 'ritual', 0, { ritual: 'r3' });

/* ---------- Fallenkarten ---------- */
T('t_negate', 'Abwehrbarriere', 'C', 'attack', 'negate');
T('t_destroyAtk', 'Gegenschlag', 'R', 'attack', 'destroyAtk');
T('t_mirror', 'Spiegelwall', 'SR', 'attack', 'mirror');
T('t_reflect', 'Rückstoß', 'R', 'attack', 'reflect');
T('t_burn', 'Flammenfalle', 'C', 'attack', 'burn', 800);
T('t_pit', 'Fallgrube', 'C', 'summon', 'pit', 1000);
T('t_pit2', 'Bodenloser Abgrund', 'R', 'summon', 'pit', 1500);
T('t_revive', 'Ruf der Gefallenen', 'R', 'manual', 'revive');

/* ---------- Texte ---------- */
const ATTR_COLORS = {
  LICHT: ['#f3e3a1', '#c9a640'], FINSTERNIS: ['#6d4f8f', '#2a1d3d'], FEUER: ['#f08a4b', '#a33221'],
  WASSER: ['#69b6e0', '#1e5a8c'], ERDE: ['#b59a6a', '#5e4a2c'], WIND: ['#9fd8a8', '#3d7a52'],
};

function fxText(fx) {
  if (!fx) return '';
  const pre = { summon: 'Wenn diese Karte beschworen wird: ', flip: 'FLIPP: ', destroyed: 'Wenn diese Karte zerstört wird: ', static: '' }[fx.on];
  let t = '';
  switch (fx.do) {
    case 'burn': t = `Füge dem Gegner ${fx.n} Schaden zu.`; break;
    case 'heal': t = `Du erhältst ${fx.n} LP.`; break;
    case 'drain': t = `Füge dem Gegner ${fx.n} Schaden zu, du erhältst ${fx.n} LP.`; break;
    case 'draw': t = fx.n === 1 ? 'Ziehe 1 Karte.' : `Ziehe ${fx.n} Karten.`; break;
    case 'destroyMon': t = 'Zerstöre 1 Monster des Gegners.'; break;
    case 'destroyST': t = 'Zerstöre 1 Zauber- oder Fallenkarte des Gegners.'; break;
    case 'destroyAllST': t = 'Zerstöre alle Zauber- und Fallenkarten des Gegners.'; break;
    case 'destroyAllMon': t = 'Zerstöre alle Monster des Gegners.'; break;
    case 'weakenAll': t = `Alle Monster des Gegners verlieren ${fx.n} ATK.`; break;
    case 'rally': t = `Alle deine anderen Monster erhalten ${fx.n} ATK.`; break;
    case 'recruit': t = `Beschwöre 1 ${fx.race} (Stufe ${fx.maxLvl} oder niedriger) aus deinem Deck als Spezialbeschwörung.`; break;
    case 'reviveLow': t = `Beschwöre 1 Monster (Stufe ${fx.maxLvl} oder niedriger) aus deinem Friedhof als Spezialbeschwörung.`; break;
    case 'pierce': t = 'Greift diese Karte ein Monster in Verteidigungsposition an, erleidet der Gegner Durchschlagsschaden.'; break;
    case 'direct': t = 'Diese Karte kann direkt angreifen.'; break;
    case 'double': t = 'Diese Karte kann zweimal pro Kampfphase angreifen.'; break;
    case 'indestructible': t = 'Diese Karte kann nicht durch Kampf zerstört werden.'; break;
  }
  return pre + t;
}

function matText(m) { return m.id ? `„${CARDS[m.id].name}“` : (m.race || m.attr); }

function cardText(c) {
  if (c.type === 'monster') {
    let parts = [];
    if (c.kind === 'fusion') parts.push(c.mats.map(matText).join(' + '));
    if (c.kind === 'ritual') parts.push(`Wird mit „${CARDS[c.ritualSpell].name}“ als Ritualbeschwörung beschworen.`);
    if (c.fx) parts.push(fxText(c.fx));
    if (!parts.length) parts.push(c.flavor || 'Ein gewöhnliches Monster.');
    return parts.join(' ');
  }
  if (c.type === 'spell') {
    switch (c.sp) {
      case 'burn': return `Füge dem Gegner ${c.n} Schaden zu.`;
      case 'heal': return `Du erhältst ${c.n} LP.`;
      case 'draw': return `Ziehe ${c.n} Karten.`;
      case 'destroyMon': return 'Wähle 1 Monster des Gegners und zerstöre es.';
      case 'destroyST': return 'Wähle 1 Zauber- oder Fallenkarte des Gegners und zerstöre sie.';
      case 'destroyAllST': return 'Zerstöre alle Zauber- und Fallenkarten des Gegners.';
      case 'destroyAllMon': return 'Zerstöre alle Monster des Gegners.';
      case 'equip': return `Ein Monster, das du kontrollierst, erhält dauerhaft ${c.n} ATK.`;
      case 'rallyTemp': return `Alle deine Monster erhalten bis zum Ende dieses Spielzugs ${c.n} ATK.`;
      case 'weakenAll': return `Alle Monster des Gegners verlieren dauerhaft ${c.n} ATK.`;
      case 'revive': return 'Wähle 1 Monster in deinem Friedhof und beschwöre es als Spezialbeschwörung.';
      case 'cage': return `Dein Gegner kann während seiner nächsten ${c.n} Spielzüge nicht angreifen.`;
      case 'fusion': return 'Lege Fusionsmaterial-Monster von deiner Hand oder deiner Spielfeldseite auf den Friedhof und beschwöre das passende Fusionsmonster aus deinem Extra-Deck.';
      case 'ritual': return `Biete Monster von Hand oder Feld als Tribut an, deren Stufen zusammen mindestens ${CARDS[c.ritual].lvl} ergeben, und beschwöre „${CARDS[c.ritual].name}“ von deiner Hand.`;
    }
  }
  if (c.type === 'trap') {
    const when = { attack: 'Wenn ein Monster deines Gegners angreift: ', summon: 'Wenn dein Gegner ein Monster beschwört: ', manual: '' }[c.trig];
    switch (c.eff) {
      case 'negate': return when + 'Annulliere den Angriff.';
      case 'destroyAtk': return when + 'Zerstöre das angreifende Monster.';
      case 'mirror': return when + 'Zerstöre alle Monster in Angriffsposition, die dein Gegner kontrolliert.';
      case 'reflect': return when + 'Annulliere den Angriff und füge dem Gegner Schaden in Höhe der halben ATK des Angreifers zu.';
      case 'burn': return when + `Füge dem Gegner ${c.n} Schaden zu.`;
      case 'pit': return when + `Hat es ${c.n} oder mehr ATK, zerstöre es.`;
      case 'revive': return 'Wähle 1 Monster in deinem Friedhof und beschwöre es in Angriffsposition als Spezialbeschwörung.';
    }
  }
  return '';
}

/* ---------- Starter-Decks ---------- */
const STARTERS = [
  {
    id: 'glut', name: 'Drachenglut', tag: 'Angriff', ace: 'd5',
    blurb: 'Drachen und Pyros mit hoher ATK und Schadenseffekten. Schnell und offensiv.',
    deck: ['d1', 'd1', 'd2', 'd2', 'd3', 'd9', 'd9', 'd8', 'p1', 'p2', 'p2', 'd4', 'd5',
      's_burn', 's_equip', 's_fusion', 's_heal', 't_negate', 't_pit', 't_burn'],
    extra: ['x2'],
  },
  {
    id: 'klinge', name: 'Klingenwacht', tag: 'Ausgewogen', ace: 'k9',
    blurb: 'Krieger mit soliden Werten, gestützt von Feen. Stark in Angriff und Verteidigung.',
    deck: ['k1', 'k1', 'k2', 'k2', 'k3', 'k3', 'k4', 'k11', 'k5', 'l2', 'l3', 'k7', 'k9',
      's_equip', 's_rally', 's_fusion', 't_negate', 't_destroyAtk', 't_pit', 't_burn'],
    extra: ['x3'],
  },
  {
    id: 'nebel', name: 'Nebelzirkel', tag: 'Kontrolle', ace: 'h5',
    blurb: 'Hexer und Zombies mit Flipp-Effekten, Kartenvorteil und Wiederbelebung.',
    deck: ['h1', 'h1', 'h2', 'h2', 'h9', 'h9', 'h4', 'h8', 'z1', 'z2', 'z4', 'h5', 'z6',
      's_st', 's_fusion', 's_burn', 't_negate', 't_pit', 't_reflect', 't_burn'],
    extra: ['x4'],
  },
];

/* ---------- Arenaleiter ---------- */
const LEADERS = [
  { name: 'Bruno Kessler', title: 'Hüter der Steinarena', themes: ['krieger'], ace: 'k8', signature: ['k8', 'k9', 's_rally'] },
  { name: 'Mira Flint', title: 'Herrin der Gezeiten', themes: ['wasser'], ace: 'w5', signature: ['w5', 'w8', 's_weaken'] },
  { name: 'Talon Reyes', title: 'Sturmflieger', themes: ['wind'], ace: 'f5', signature: ['f4', 'f5', 'f3'] },
  { name: 'Oskar Grimm', title: 'Totengräber', themes: ['zombie'], ace: 'z7', signature: ['z5', 'z7', 's_revive'] },
  { name: 'Selene Vaar', title: 'Sternenmagierin', themes: ['hexer', 'licht'], ace: 'h6', signature: ['h6', 'l5', 's_draw'] },
  { name: 'Ignaz Brand', title: 'Flammenschmied', themes: ['feuer'], ace: 'p6', signature: ['p6', 'p5', 's_burn2'] },
  { name: 'Vera Stahl', title: 'Ingenieurin', themes: ['maschine'], ace: 'm7', signature: ['m6', 'm7', 's_destroy'] },
  { name: 'Kael Drakon', title: 'Drachenbändiger', themes: ['drache'], ace: 'd7', signature: ['d6', 'd7', 'd7', 's_equip2'] },
];
const FINAL_BOSS = { name: 'Großmeister Orrin', title: 'Champion des Pfades', themes: ['hexer', 'drache', 'licht'], ace: 'r2', signature: ['r2', 's_rit2', 'l6', 'd7', 's_allmon', 't_mirror'] };

const ARENA_THEMES = ['krieger', 'wasser', 'wind', 'zombie', 'hexer', 'feuer', 'maschine', 'drache'];
const THEME_LABEL = { krieger: 'Krieger', drache: 'Drachen', hexer: 'Hexer', wasser: 'Wasser', wind: 'Wind', zombie: 'Zombies', maschine: 'Maschinen', feuer: 'Pyro', licht: 'Feen' };

const DUELIST_NAMES = ['Jonas', 'Lea', 'Malik', 'Ronja', 'Finn', 'Ida', 'Theo', 'Nora', 'Emil', 'Zoe', 'Levin', 'Ava', 'Milan', 'Kira', 'Anton', 'Yara', 'Paul', 'Lina', 'Jasper', 'Mona'];
const DUELIST_TITLES = ['Kadett', 'Duellant', 'Herausforderin', 'Kartensammler', 'Turnierneuling', 'Wandernde Duellantin', 'Akademieschüler', 'Strategin'];
const ELITE_TITLES = ['Turniersieger', 'Elite-Duellantin', 'Veteran', 'Meisterschüler', 'Titelverteidigerin'];

/* ---------- Talismane ---------- */
const TALISMANS = {
  muenze: { name: 'Glücksmünze', text: '+30 % Gold aus Duellen.', price: 110 },
  hand: { name: 'Vorausschau', text: 'Du startest jedes Duell mit 6 statt 5 Handkarten.', price: 160 },
  amulett: { name: 'Lebensamulett', text: '+1500 maximale LP (und sofort geheilt).', price: 130 },
  schleif: { name: 'Schleifstein', text: 'Deine Monster haben +200 ATK.', price: 150 },
  blut: { name: 'Blutstein', text: 'Nach jedem gewonnenen Duell erhältst du 600 LP.', price: 120 },
  vorsprung: { name: 'Vorsprung', text: 'Du beginnst jedes Duell als erster Spieler.', price: 100 },
  brenn: { name: 'Brennglas', text: 'Deine Schadenseffekte verursachen 50 % mehr Schaden.', price: 130 },
  opfer: { name: 'Opfergabe', text: 'Tributbeschwörungen benötigen 1 Tribut weniger.', price: 220 },
  herz: { name: 'Zweites Herz', text: 'Einmalig: Fallen deine LP im Lauf auf 0, stehst du mit 50 % wieder auf.', price: 180 },
  ruestung: { name: 'Bastionsplatte', text: 'Deine Monster haben +300 DEF.', price: 90 },
};
