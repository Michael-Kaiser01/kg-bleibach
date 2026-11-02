# KG „Bleibach“ Frauenberg 1972 e.V. – Hinweise für Claude

## Corporate Design ist Pflicht

Alles, was für die KG gestaltet wird (neue Seiten, Abschnitte, Plakate, Flyer, Social-Media-Bilder, Briefe, Präsentationen), folgt dem Corporate Design „Rheinisches Plakat“.

- Markenbuch und Tokens: https://claude.ai/artifact/4dV4khJ9GBuFXRHdwCpQNU (zuerst `project/README.md` lesen)
- Look-Book (visuell): https://claude.ai/artifact/8RfbymdXAwmTTLWMFzsTBa

Kurzfassung:

- **Farben** nur aus dem `:root`-Block in `index.html`: `--paper` (Grund), `--ink`, `--ink2`, `--rot` (Hauptfarbe), `--gruen`, `--gold` und ihre dunklen Varianten. Keine neuen Farben, kein reines Weiß als Seitengrund, Gold nie als Schrift auf Papier.
- **Schriften** nur die lokal eingebundenen aus `fonts/`: Bricolage Grotesque (Überschriften 800, Versalien), Bricolage Outline (Konturschrift), Instrument Serif kursiv (genau ein Akzentwort pro Überschrift), Space Grotesk (Fließtext). Keine Google-Fonts-Verbindung (DSGVO).
- **Formen:** 2px Tintenkontur (`--bd`), harte Versatzschatten (`--sh`, `--shS`), eckige Ecken, Drehung höchstens ±8°. Wimpelkette und Trikolore als Schmuck, ✶ statt Emojis.
- **Wappen** (`kg-bleibach-logo.png`, `kg-bleibach-wappen-klein.webp`) nie umfärben, beschneiden oder verzerren.
- **Illustrationen** flach in Markenfarben mit 5px Tintenkontur; vorhandene Motive (Intro, Zoch) wiederverwenden statt neu zu zeichnen.
- **Bewegung** mit `--ease`, immer mit `prefers-reduced-motion` abschaltbar.
- Bestehende Klassen (`.btn`, `.kchip`, `.card`, `.shead`, `.stick`, `.bunt`, `.marq` …) wiederverwenden statt neue Stile zu erfinden.

Abweichungen nur, wenn Michael sie ausdrücklich verlangt.

## Veröffentlichen

Netlify veröffentlicht automatisch von `main` auf www.kg-bleibach.de. Nichts geht nach `main`, bevor Michael „live“ sagt.
