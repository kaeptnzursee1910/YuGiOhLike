# Duellpfad

Ein Monster-Roguelike für den Browser mit **Autokämpfen nach dem Prinzip von Pokelike**. Die Monster, Zauber- und Fallenkarten sind Eigenkreationen im Stil klassischer Sammelkartenspiele.

## Spielen

`index.html` im Browser öffnen. Es braucht keinen Build-Schritt und keine Abhängigkeiten. Alternativ per GitHub Pages veröffentlichen (Settings → Pages → Branch `main`, Ordner `/`).

```bash
python3 -m http.server 8000
```

## Ablauf

1. Einen von drei Startern wählen: Glutwelpe (Feuer), Gezeitenschlange (Wasser) oder Klingentänzer (Erde).
2. Über eine verzweigte Karte zur Arena ziehen:
   - **Duell / Elite:** Autokampf gegen ein Team. Ein Sieg bringt Erfahrung und ein Item, Elite zusätzlich einen Talisman.
   - **Begegnung:** Eines von drei wilden Monstern schließt sich an. Ab 6 Monstern geht es in die Box.
   - **Item:** Zauber- und Fallenkarten sind tragbare Items.
   - **Rast:** heilt alles. **Tausch:** Monster gegen ein meist selteneres abgeben. **Ereignis:** zufällige Entscheidungen.
3. Acht Arenaleiter besiegen, danach den Großmeister. Wird dein ganzes Team besiegt, endet der Lauf.

## Autokampf

- Das jeweils vorderste kampffähige Monster beider Teams tritt an. Das schnellere (Initiative) greift zuerst an. Ist eines besiegt, rückt das nächste nach.
- Schaden ergibt sich aus ATK gegen DEF, dazu kommen Volltreffer und Typvorteile (×1,4 / ×0,75): Feuer › Wind › Erde › Wasser › Feuer, Licht ↔ Finsternis.
- Effektmonster haben Fähigkeiten beim Betreten des Kampfes, beim Besiegtwerden oder dauerhaft (Durchschlag, Doppelschlag, Zäh …).
- KP bleiben zwischen Kämpfen erhalten. Nach einem Sieg heilen kampffähige Monster 20 %.
- Stufenaufstiege, Entwicklungen auf festen Stufen, **Verschmelzung** zweier passender Monster und **Ritualzauber** als Verwandlung.
- Der Kampf wird komplett vorausberechnet und dann mit 1×, 2× oder 4× abgespielt, oder übersprungen.

## Struktur

| Datei | Inhalt |
|---|---|
| `js/data.js` | Karten, Entwicklungen, Typen, Item-Texte, Arenaleiter, Talismane |
| `js/ui.js` | Kartendarstellung, Modale, Helfer |
| `js/battle.js` | Werteberechnung, Kampfsimulation und Kampfanzeige |
| `js/run.js` | Karte, Knoten, Team-Verwaltung, Erfahrung, Speichern |
| `css/style.css` | Gestaltung |

## Testmodus

`index.html?auto` überspringt Kampfanimationen und Dialoge. Das ist praktisch für automatisierte Balancing-Tests.
