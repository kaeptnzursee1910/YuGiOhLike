/* =========================================================
   Duellpfad – Kartendaten, Duellanten, Talismane
   Alle Karten sind Eigenkreationen. Kampfsystem: Autokampf
   im Stil von Pokelike (Team, Stufen, Typvorteile, Items).
   Zauber- und Fallenkarten dienen als Items.
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

/* ---------- Attribute & Typvorteile ----------
   Kreislauf: FEUER > WIND > ERDE > WASSER > FEUER
   LICHT und FINSTERNIS sind gegeneinander sehr effektiv. */
const ATTR_COLORS = {
  LICHT: ['#f3e3a1', '#c9a640'], FINSTERNIS: ['#6d4f8f', '#2a1d3d'], FEUER: ['#f08a4b', '#a33221'],
  WASSER: ['#69b6e0', '#1e5a8c'], ERDE: ['#b59a6a', '#5e4a2c'], WIND: ['#9fd8a8', '#3d7a52'],
};
const BEATS = { FEUER: 'WIND', WIND: 'ERDE', ERDE: 'WASSER', WASSER: 'FEUER' };
function typeMult(a, d) {
  if ((a === "LICHT" && d === "FINSTERNIS") || (a === "FINSTERNIS" && d === "LICHT")) return 1.4;
  if (BEATS[a] === d) return 1.4;
  if (BEATS[d] === a) return 0.75;
  return 1;
}

/* ---------- Entwicklungen (Stufe) ---------- */
const EVOS = {
  d1: ['d4', 16], d4: ['d6', 32], d2: ['d5', 28], d3: ['d6', 34], d9: ['d7', 44], d8: ['d5', 30],
  w2: ['w8', 18], w8: ['w5', 34], w3: ['w7', 14], w6: ['w1', 16], w4: ['w8', 24],
  k3: ['k8', 18], k8: ['k10', 36], k1: ['k4', 12], k4: ['k9', 30], k11: ['k6', 14], k6: ['k8', 26], k2: ['k9', 32],
  h1: ['h3', 14], h3: ['h7', 38], h9: ['h5', 18], h5: ['h6', 34], h8: ['h4', 16], h2: ['h6', 32],
  f2: ['f1', 12], f1: ['f4', 24], f4: ['f5', 36], f6: ['f3', 14], f3: ['f7', 40],
  z1: ['z2', 12], z2: ['z6', 28], z4: ['z5', 30], z5: ['z7', 44], z3: ['z6', 26],
  m2: ['m1', 12], m1: ['m5', 28], m3: ['m6', 32], m4: ['m7', 42],
  p1: ['p2', 12], p2: ['p5', 28], p5: ['p6', 40], p3: ['p5', 30], p4: ['p6', 36],
  l1: ['l2', 12], l2: ['l4', 26], l4: ['l6', 42], l3: ['l5', 34],
  k5: ['k8', 24], h4: ['h7', 40], w7: ['w5', 36], k7: ['k10', 40],
};

/* ---------- Fähigkeitstexte (Autokampf) ---------- */
function fxText(fx) {
  if (!fx) return '';
  const on = fx.on === 'destroyed' ? 'Wenn besiegt: ' : fx.on === 'static' ? '' : 'Beim Betreten des Kampfes: ';
  let t = '';
  switch (fx.do) {
    case 'burn': t = fx.on === 'destroyed' ? `Der Angreifer erleidet ${fx.n} Effektschaden.` : `Der Gegner erleidet ${fx.n} Effektschaden.`; break;
    case 'heal': t = fx.on === 'destroyed' ? `Das nächste Monster deines Teams heilt ${fx.n} KP.` : `Dein am stärksten verletztes Monster heilt ${fx.n} KP.`; break;
    case 'drain': t = `Der Gegner erleidet ${fx.n} Effektschaden, dieses Monster heilt ${fx.n} KP.`; break;
    case 'draw': t = fx.on === 'destroyed' ? 'Alle deine Monster heilen 10 % ihrer KP.' : `Erhält +${fx.n * 10} % ATK für diesen Kampf.`; break;
    case 'destroyMon': t = 'Der Gegner verliert sofort 20 % seiner max. KP.'; break;
    case 'destroyST': t = 'Das Item des Gegners wird für diesen Kampf wirkungslos.'; break;
    case 'destroyAllST': t = 'Alle Items des gegnerischen Teams werden für diesen Kampf wirkungslos.'; break;
    case 'destroyAllMon': t = 'Alle gegnerischen Monster verlieren 15 % ihrer max. KP.'; break;
    case 'weakenAll': t = `Alle gegnerischen Monster verlieren ${fx.n} ATK für diesen Kampf.`; break;
    case 'rally': t = `Alle deine Monster erhalten ${fx.n} ATK für diesen Kampf.`; break;
    case 'recruit': t = 'Das nächste Monster deines Teams erhält +20 % ATK.'; break;
    case 'reviveLow': t = 'Ein besiegtes Monster deines Teams steht mit 30 % KP wieder auf.'; break;
    case 'pierce': t = 'Durchschlag: Ignoriert 30 % der gegnerischen DEF.'; break;
    case 'direct': t = 'Streuangriff: 25 % des Schadens treffen auch das nächste gegnerische Monster.'; break;
    case 'double': t = 'Doppelschlag: Greift jede Runde ein zweites Mal mit halber Stärke an.'; break;
    case 'indestructible': t = 'Zäh: Überlebt einmal pro Kampf einen tödlichen Treffer mit 1 KP.'; break;
  }
  return on + t;
}

const ITEM_TEXT = {
  s_burn: 'Beim Betreten: Der Gegner erleidet 600 Effektschaden.',
  s_burn2: 'Beim Betreten: Der Gegner erleidet 1200 Effektschaden.',
  s_heal: 'Fallen die KP unter 50 %, heilt der Träger einmalig 30 % seiner KP.',
  s_heal2: 'Fallen die KP unter 50 %, heilt der Träger einmalig 60 % seiner KP.',
  s_draw: 'Der Träger erhält 50 % mehr EP.',
  s_destroy: 'Der erste Angriff des Trägers ist immer ein Volltreffer.',
  s_st: 'Beim Betreten: Das Item des Gegners wird wirkungslos.',
  s_allst: 'Beim Betreten: Alle gegnerischen Items werden wirkungslos.',
  s_allmon: 'Beim Betreten: Alle gegnerischen Monster verlieren 15 % ihrer max. KP.',
  s_equip: '+15 % ATK.',
  s_equip2: '+25 % ATK.',
  s_rally: '+10 % ATK und +10 % DEF.',
  s_weaken: 'Beim Betreten: Der Gegner verliert 20 % ATK.',
  s_revive: 'Wird der Träger besiegt, steht er einmalig mit 50 % KP wieder auf.',
  s_cage: 'Der Träger handelt immer zuerst.',
  t_negate: 'Blockt den ersten Treffer vollständig.',
  t_destroyAtk: 'Wird der Träger besiegt, verliert der Angreifer 30 % seiner max. KP.',
  t_mirror: 'Wirft 25 % jedes erlittenen Schadens zurück.',
  t_reflect: 'Den ersten Treffer halbiert der Träger und wirft ihn voll zurück.',
  t_burn: 'Wird der Träger getroffen, erleidet der Angreifer 400 Effektschaden.',
  t_pit: 'Betritt ein Gegner den Kampf gegen den Träger, verliert er 15 % seiner max. KP.',
  t_pit2: 'Betritt ein Gegner den Kampf gegen den Träger, verliert er 25 % seiner max. KP.',
  t_revive: 'Wird der Träger besiegt, steht er einmalig mit 50 % KP wieder auf.',
  s_fusion: 'Verbrauchbar: Verschmilzt zwei passende Monster deines Teams zu einem Fusionsmonster.',
  s_rit1: 'Verbrauchbar: Verwandelt ein Monster (ab Stufe 15) in „Ritter der Morgenröte“.',
  s_rit2: 'Verbrauchbar: Verwandelt ein Monster (ab Stufe 25) in „Dämonenfürst Xar“.',
  s_rit3: 'Verbrauchbar: Verwandelt ein Monster (ab Stufe 20) in „Drachenpriester Valdur“.',
};
const RITUAL_MIN = { s_rit1: 15, s_rit2: 25, s_rit3: 20 };
const isConsumable = id => id === 's_fusion' || CARDS[id].sp === 'ritual';

function matText(m) { return m.id ? `„${CARDS[m.id].name}“` : (m.race || m.attr); }

function cardText(c) {
  if (c.type === 'monster') {
    const parts = [];
    if (c.kind === 'fusion') parts.push('Fusion aus ' + c.mats.map(matText).join(' + ') + '.');
    if (c.kind === 'ritual') parts.push(`Entsteht durch „${CARDS[c.ritualSpell].name}“.`);
    if (c.fx) parts.push(fxText(c.fx));
    if (EVOS[c.id]) parts.push(`Entwickelt sich ab Stufe ${EVOS[c.id][1]} zu „${CARDS[EVOS[c.id][0]].name}“.`);
    if (!c.fx && c.flavor) parts.push(c.flavor);
    return parts.join(' ') || 'Ein gewöhnliches Monster.';
  }
  return ITEM_TEXT[c.id] || '';
}

/* ---------- Starter ---------- */
const STARTERS = [
  { id: 'd1', tag: 'Feuer', blurb: 'Ein hitzköpfiger Drachenwelpe. Stark gegen Wind, schwach gegen Wasser.' },
  { id: 'w2', tag: 'Wasser', blurb: 'Eine flinke Seeschlange. Stark gegen Feuer, schwach gegen Erde.' },
  { id: 'k3', tag: 'Erde', blurb: 'Ein schneller Schwertkämpfer. Stark gegen Wasser, schwach gegen Wind.' },
];

/* ---------- Arenaleiter (Team, Ass zuletzt) ---------- */
const LEADERS = [
  { name: 'Bruno Kessler', title: 'Hüter der Steinarena', themes: ['krieger'], team: ['k2', 'k7', 'k4'], ace: 'k4', items: { k4: 's_equip' } },
  { name: 'Mira Flint', title: 'Herrin der Gezeiten', themes: ['wasser'], team: ['w6', 'w7', 'w4', 'w8'], ace: 'w8', items: { w8: 's_heal' } },
  { name: 'Talon Reyes', title: 'Sturmflieger', themes: ['wind'], team: ['f6', 'f3', 'f1', 'f4'], ace: 'f4', items: { f4: 's_rally' } },
  { name: 'Oskar Grimm', title: 'Totengräber', themes: ['zombie'], team: ['z3', 'z4', 'z6', 'z5'], ace: 'z5', items: { z5: 's_revive', z6: 't_negate' } },
  { name: 'Selene Vaar', title: 'Sternenmagierin', themes: ['hexer', 'licht'], team: ['h8', 'l4', 'h5', 'l5', 'h6'], ace: 'h6', items: { h6: 's_heal', l5: 't_mirror' } },
  { name: 'Ignaz Brand', title: 'Flammenschmied', themes: ['feuer'], team: ['p4', 'p3', 'p5', 'x7', 'p6'], ace: 'p6', items: { p6: 's_burn2', p5: 't_burn' } },
  { name: 'Vera Stahl', title: 'Ingenieurin', themes: ['maschine'], team: ['m3', 'm4', 'm5', 'x6', 'm6', 'm7'], ace: 'm7', items: { m7: 's_equip2', m6: 't_reflect' } },
  { name: 'Kael Drakon', title: 'Drachenbändiger', themes: ['drache'], team: ['d8', 'd5', 'x2', 'd6', 'x5', 'd7'], ace: 'd7', items: { d7: 's_equip2', x5: 's_heal2', d6: 's_rally' } },
];
const FINAL_BOSS = { name: 'Großmeister Orrin', title: 'Champion des Pfades', themes: ['hexer', 'drache', 'licht'], team: ['l6', 'h7', 'k10', 'r2', 'x13', 'd7'], ace: 'x13', items: { x13: 's_heal2', r2: 't_mirror', l6: 's_revive', d7: 's_equip2', h7: 's_allst', k10: 's_rally' } };

const ARENA_THEMES = ['krieger', 'wasser', 'wind', 'zombie', 'hexer', 'feuer', 'maschine', 'drache'];
const THEME_LABEL = { krieger: 'Krieger', drache: 'Drachen', hexer: 'Hexer', wasser: 'Wasser', wind: 'Wind', zombie: 'Zombies', maschine: 'Maschinen', feuer: 'Pyro', licht: 'Feen' };

const DUELIST_NAMES = ['Jonas', 'Lea', 'Malik', 'Ronja', 'Finn', 'Ida', 'Theo', 'Nora', 'Emil', 'Zoe', 'Levin', 'Ava', 'Milan', 'Kira', 'Anton', 'Yara', 'Paul', 'Lina', 'Jasper', 'Mona'];
const DUELIST_TITLES = ['Kadett', 'Duellant', 'Herausforderin', 'Kartensammler', 'Turnierneuling', 'Wandernde Duellantin', 'Akademieschüler', 'Strategin'];
const ELITE_TITLES = ['Turniersieger', 'Elite-Duellantin', 'Veteran', 'Meisterschüler', 'Titelverteidigerin'];

/* ---------- Talismane (gelten für dein ganzes Team) ---------- */
const TALISMANS = {
  schleif: { name: 'Schleifstein', text: 'Deine Monster haben +10 % ATK.' },
  ruestung: { name: 'Bastionsplatte', text: 'Deine Monster haben +10 % DEF.' },
  amulett: { name: 'Lebensamulett', text: 'Deine Monster haben +15 % max. KP.' },
  lern: { name: 'Lernfibel', text: 'Deine Monster erhalten 30 % mehr EP.' },
  blut: { name: 'Blutstein', text: 'Nach jedem Sieg heilen deine Monster 40 % statt 20 % ihrer KP.' },
  brenn: { name: 'Brennglas', text: 'Effektschaden deiner Monster ist 50 % höher.' },
  vorsprung: { name: 'Windfeder', text: 'Deine Monster sind schneller (+40 Initiative).' },
  krit: { name: 'Adlerauge', text: '+10 % Volltrefferchance für dein Team.' },
  herz: { name: 'Zweites Herz', text: 'Einmalig: Wird dein Team besiegt, stehen alle Monster mit 50 % KP wieder auf und du ziehst weiter.' },
  sammler: { name: 'Fangnetz', text: 'Bei Begegnungen stehen 4 statt 3 Monster zur Wahl.' },
};
