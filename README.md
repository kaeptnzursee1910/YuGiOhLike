# Duellpfad

Ein Kartenduell-Roguelike für den Browser, inspiriert von Pokelike. Die Duellregeln orientieren sich an der klassischen Ära der Sammelkartenspiele (Tributbeschwörung, Fusion, Ritual, Flipp-Effekte, gesetzte Fallen). Alle Karten, Namen und Duellanten sind Eigenkreationen.

## Spielen

`index.html` im Browser öffnen. Es braucht keinen Build-Schritt und keine Abhängigkeiten. Alternativ per GitHub Pages veröffentlichen (Settings → Pages → Branch `main`, Ordner `/`).

Lokal mit Server:

```bash
python3 -m http.server 8000
```

## Ablauf

1. Eines von drei Starterdecks wählen: **Drachenglut**, **Klingenwacht** oder **Nebelzirkel**.
2. Über eine verzweigte Karte zur Arena ziehen. Unterwegs gibt es Duelle, Elite-Duelle, Läden, Rastplätze, Booster und Ereignisse.
3. Acht Arenaleiter besiegen, danach im Finale den Großmeister.
4. Die LP bleiben zwischen den Duellen erhalten. Eine Niederlage beendet den Lauf.

Der Fortschritt wird im `localStorage` des Browsers gespeichert.

## Duellregeln (Kurzfassung)

- 5 Monster- und 5 Zauber-/Fallenzonen, 5 Startkarten, Handlimit 6.
- Eine Normalbeschwörung pro Zug. Stufe 5–6 braucht 1 Tribut, Stufe 7 und höher 2.
- Kampf mit ATK und DEF nach klassischen Regeln, inklusive Durchschlagsschaden.
- Fallen werden gesetzt und ab dem nächsten Zug bei ihrem Auslöser angeboten.
- Verschmelzung (Extra-Deck) und Ritualzauber.

## Struktur

| Datei | Inhalt |
|---|---|
| `js/data.js` | Karten, Starterdecks, Arenaleiter, Talismane |
| `js/ui.js` | Kartendarstellung, Modale, Helfer |
| `js/duel.js` | Duell-Engine, KI und Duell-Oberfläche |
| `js/run.js` | Karte, Knoten, Belohnungen, Laden, Ereignisse, Speichern |
| `css/style.css` | Gestaltung |

Neue Karten lassen sich in `js/data.js` mit `M(...)` (Monster), `F(...)` (Fusion), `R(...)` (Ritual), `S(...)` (Zauber) und `T(...)` (Falle) ergänzen.

## Testmodus

`index.html?auto&fast` lässt die KI deine Duelle im Schnelldurchlauf spielen. Das ist praktisch für Balancing-Tests.
