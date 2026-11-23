# Quellen der Netlify-Funktionen

`submission-created.mjs` erzeugt nach jeder Einsendung des Formulars „beitrittserklaerung“
(Seite `mitglied-werden.html`) die Beitrittserklärung als PDF im Briefbogen der KG und
schickt sie per E-Mail an info@kg-bleibach.de.

Netlify führt keinen Build aus, deshalb liegt die Funktion fertig gebündelt in
`netlify/functions/submission-created.mjs`. Nach Änderungen hier neu bündeln:

    cd netlify/src && npm install && npm run build

`assets/`: Briefbogen-Vorlage (PDF) und statische Schnitte der CD-Schriften
(Bricolage Grotesque, Space Grotesk, Instrument Serif; SIL Open Font License, siehe OFL-LICENSE.txt).

## Mailversand (Umgebungsvariablen in Netlify)

| Variable | Inhalt |
|---|---|
| `SMTP_HOST` | SMTP-Server des Postfachs info@kg-bleibach.de |
| `SMTP_PORT` | `465` (SSL) oder `587` (STARTTLS) – Standard 465 |
| `SMTP_USER` | `info@kg-bleibach.de` |
| `SMTP_PASS` | Passwort des Postfachs (als „secret“ markieren) |
| `MAIL_TO` | optional, Standard `info@kg-bleibach.de` |
| `MAIL_FROM` | optional, Standard `"KG Bleibach Website" <SMTP_USER>` |
