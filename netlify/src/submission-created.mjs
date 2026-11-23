// Netlify-Ereignisfunktion „submission-created“
// Läuft automatisch nach jeder geprüften (nicht als Spam erkannten) Formular-Einsendung.
// Für das Formular „beitrittserklaerung“ erzeugt sie die Beitrittserklärung als PDF im
// Briefbogen der KG und schickt sie per E-Mail an info@kg-bleibach.de.
//
// Quelle: netlify/src/submission-created.mjs → gebündelt nach netlify/functions/ (siehe netlify/src/README.md)
//
// Umgebungsvariablen (in Netlify unter Project configuration → Environment variables):
//   Variante SMTP (Postfach info@):  SMTP_HOST, SMTP_PORT (465 oder 587), SMTP_USER, SMTP_PASS
//   Variante Resend:                 RESEND_API_KEY
//   optional:                        MAIL_TO (Standard info@kg-bleibach.de), MAIL_FROM (Standard SMTP_USER bzw. info@kg-bleibach.de)

import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import nodemailer from 'nodemailer';
import briefbogen from './assets/briefbogen.pdf';
import fDisplay from './assets/Bricolage-ExtraBold.ttf';
import fLabel from './assets/Bricolage-Bold.ttf';
import fBody from './assets/SpaceGrotesk-Regular.ttf';
import fBodyBold from './assets/SpaceGrotesk-SemiBold.ttf';
import fSerif from './assets/InstrumentSerif-Italic.ttf';

const FORM = 'beitrittserklaerung';
const C = {
  ink: rgb(0x19 / 255, 0x17 / 255, 0x12 / 255),
  ink2: rgb(0x3a / 255, 0x36 / 255, 0x2c / 255),
  grau: rgb(0x6b / 255, 0x65 / 255, 0x56 / 255),
  rotD: rgb(0xa9 / 255, 0x22 / 255, 0x18 / 255),
  gruen: rgb(0x0e / 255, 0x5a / 255, 0x35 / 255),
  linie: rgb(0xcf / 255, 0xc6 / 255, 0xaf / 255),
  paper: rgb(0xf4 / 255, 0xed / 255, 0xdd / 255),
};
const MM = 72 / 25.4;

const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const datumDE = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : clean(iso); };
const ibanFormat = (v) => clean(v, 42).replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();

export async function buildPdf(d, eingang = new Date()) {
  const tpl = await PDFDocument.load(briefbogen);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const F = {
    display: await doc.embedFont(fDisplay, { subset: true }),
    label: await doc.embedFont(fLabel, { subset: true }),
    body: await doc.embedFont(fBody, { subset: true }),
    bold: await doc.embedFont(fBodyBold, { subset: true }),
    serif: await doc.embedFont(fSerif, { subset: true }),
  };
  const [bg] = await doc.embedPdf(tpl, [0]);
  const W = 595.28, H = 841.89, L = 20 * MM, R = W - 20 * MM, TOP = H - 55 * MM, BOTTOM = 40 * MM;
  const name = `${clean(d.vorname)} ${clean(d.name)}`.trim();
  doc.setTitle(`Beitrittserklärung ${name}`);
  doc.setAuthor('KG „Bleibach“ Frauenberg 1972 e.V.');
  doc.setSubject('Beitrittserklärung (online übermittelt)');
  doc.setCreator('kg-bleibach.de');
  doc.setCreationDate(eingang);

  let page, y;
  const neueSeite = () => { page = doc.addPage([W, H]); page.drawPage(bg, { x: 0, y: 0, width: W, height: H }); y = TOP; };
  const platz = (h) => { if (y - h < BOTTOM) { neueSeite(); } };
  const spaced = (txt, font, size, x, yy, track, color) => { let cx = x; for (const ch of txt) { page.drawText(ch, { x: cx, y: yy, size, font, color }); cx += font.widthOfTextAtSize(ch, size) + track; } return cx - x - track; };
  const umbruch = (txt, font, size, maxW) => {
    const out = []; let line = '';
    for (const w of String(txt).split(' ')) { const t = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line); return out;
  };
  // Absatz mit **fett**-Markierung
  const absatz = (txt, { size = 9, lh = 1.45, x = L, maxW = R - L, color = C.ink2 } = {}) => {
    const words = []; String(txt).split(/(\*\*[^*]+\*\*)/).forEach((part) => { const b = part.startsWith('**'); part.replace(/\*\*/g, '').split(' ').filter(Boolean).forEach((w) => words.push({ w, b })); });
    const lines = []; let cur = [], curW = 0; const sp = F.body.widthOfTextAtSize(' ', size);
    for (const t of words) { const f = t.b ? F.bold : F.body; const ww = f.widthOfTextAtSize(t.w, size); if (cur.length && curW + sp + ww > maxW) { lines.push(cur); cur = []; curW = 0; } curW += (cur.length ? sp : 0) + ww; cur.push({ ...t, ww }); }
    if (cur.length) lines.push(cur);
    platz(lines.length * size * lh);
    for (const ln of lines) { y -= size * lh; let cx = x; for (const t of ln) { page.drawText(t.w, { x: cx, y, size, font: t.b ? F.bold : F.body, color: t.b ? C.ink : color }); cx += t.ww + sp; } }
  };
  const abschnitt = (nr, titel) => {
    platz(60); y -= 17;
    const nw = spaced(nr, F.label, 7, L, y, 1.4, C.rotD);
    page.drawText(titel.toUpperCase(), { x: L + nw + 7, y, size: 11.5, font: F.display, color: C.ink });
    y -= 6; page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1.4, color: C.ink });
  };
  // Feldreihe: [[label, wert, breitenanteil], ...]
  const felder = (reihe) => {
    platz(34); y -= 15; const gap = 14; const total = R - L - gap * (reihe.length - 1); let x = L;
    for (const [label, wert, anteil] of reihe) {
      const w = total * anteil;
      spaced(label.toUpperCase(), F.label, 5.8, x, y, 0.9, C.grau);
      let v = clean(wert) || '—'; let s = 10.5; while (F.body.widthOfTextAtSize(v, s) > w && s > 7) s -= 0.5;
      page.drawText(v, { x: x + 1, y: y - 14, size: s, font: label === 'IBAN' ? F.bold : F.body, color: C.ink });
      page.drawLine({ start: { x, y: y - 18 }, end: { x: x + w, y: y - 18 }, thickness: 0.8, color: C.ink });
      x += w + gap;
    }
    y -= 20;
  };
  const haken = (txt, ok) => {
    const size = 8.6, lh = 1.42, x = L + 22, lines = umbruch(txt.replace(/\*\*/g, ''), F.body, size, R - x - 10);
    const boxH = lines.length * size * lh + 12; platz(boxH + 10); y -= 9;
    page.drawRectangle({ x: L, y: y - boxH, width: R - L, height: boxH, color: C.paper, borderColor: C.ink, borderWidth: 0.9 });
    const by = y - 6 - 10; page.drawRectangle({ x: L + 7, y: by, width: 10, height: 10, color: ok ? C.gruen : rgb(1, 1, 1), borderColor: C.ink, borderWidth: 0.9 });
    if (ok) { page.drawLine({ start: { x: L + 9.2, y: by + 5.2 }, end: { x: L + 11.4, y: by + 2.8 }, thickness: 1.5, color: rgb(1, 1, 1) }); page.drawLine({ start: { x: L + 11.4, y: by + 2.8 }, end: { x: L + 15, y: by + 7.6 }, thickness: 1.5, color: rgb(1, 1, 1) }); }
    let ly = y - 6; for (const ln of lines) { ly -= size * lh; page.drawText(ln, { x, y: ly + 2, size, font: F.body, color: C.ink }); }
    y -= boxH;
  };

  neueSeite();
  // Absenderzeile (DIN 5008)
  page.drawText('KG Bleibach Frauenberg 1972 e.V. · Heerstraße 4 · 53909 Zülpich', { x: L, y: y + 16, size: 6.5, font: F.body, color: C.ink2 });
  // Titel
  y -= 10;
  const t1 = 'BEITRITTS'; page.drawText(t1, { x: L, y, size: 25, font: F.display, color: C.ink });
  page.drawText('erklärung', { x: L + F.display.widthOfTextAtSize(t1, 25) + 1, y, size: 29, font: F.serif, color: C.gruen });
  const ein = `Online eingegangen am ${eingang.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' })} um ${eingang.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr`;
  page.drawText(ein, { x: R - F.body.widthOfTextAtSize(ein, 7.5), y: y + 2, size: 7.5, font: F.body, color: C.grau });
  y -= 6;
  absatz('Hiermit erkläre ich meinen Beitritt als Mitglied bei der **„KG Bleibach Frauenberg 1972 e.V.“**', { size: 10 });

  abschnitt('01', 'Persönliche Angaben');
  felder([['Name', d.name, 0.38], ['Vorname', d.vorname, 0.38], ['Geburtsdatum', datumDE(d.geburtsdatum), 0.24]]);
  felder([['Straße und Hausnummer', d.strasse, 0.5], ['PLZ', d.plz, 0.14], ['Ort', d.ort, 0.36]]);
  felder([['E-Mail', d.email, 0.6], ['Telefon', d.telefon, 0.4]]);
  haken('Mit meiner Beitrittserklärung erkenne ich die Satzung des Vereins an. Der aktuelle Jahresbeitrag beträgt laut Satzung derzeit 25,– Euro.', !!d.satzung);

  abschnitt('02', 'Einwilligung zur Datenspeicherung');
  haken('Ich willige in die Erhebung, die Verarbeitung und die Weiterleitung meiner persönlichen Daten zum Zwecke der Mitgliederverwaltung ein. Eine Weitergabe meiner Daten an Personen außerhalb des Vereins und eine Veröffentlichung meiner Mitgliedschaft in Medien bedarf meiner ausdrücklichen Zustimmung.', !!d.einwilligung_datenspeicherung);

  abschnitt('03', 'Erteilung des SEPA-Lastschriftmandats');
  y -= 4; absatz('Gläubiger-Identifikationsnummer des Vereins: **DE09ZZZ00000443097**', { size: 8.6 });
  absatz('Ich ermächtige den Verein „KG Bleibach Frauenberg 1972 e.V.“, Zahlungen wiederkehrend von meinem Konto mittels Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die vom Verein auf mein Konto gezogenen Lastschriften einzulösen. Der Mitgliedsbeitrag wird als Jahresbeitrag jedes Jahr fällig.', { size: 8.6 });
  absatz('**Hinweis:** Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung des belasteten Betrages verlangen. Es gelten dabei die mit meinem Kreditinstitut vereinbarten Bedingungen.', { size: 8.6 });
  felder([['Kontoinhaber/in', d.kontoinhaber, 0.5], ['Kreditinstitut', d.kreditinstitut, 0.5]]);
  felder([['IBAN', ibanFormat(d.iban), 0.68], ['BIC', clean(d.bic).toUpperCase(), 0.32]]);
  haken('Ich erteile dem Verein das oben stehende SEPA-Lastschriftmandat für den jährlichen Mitgliedsbeitrag.', !!d.sepa_mandat);

  abschnitt('04', 'Ort, Datum');
  felder([['Ort', d.ort_unterschrift, 0.6], ['Datum', d.datum, 0.4]]);
  y -= 2; absatz('Online über kg-bleibach.de übermittelt — die Bestätigungen oben ersetzen die handschriftliche Unterschrift.', { size: 7.5, color: C.grau });

  return doc.save();
}

async function sende({ pdf, dateiname, betreff, text, replyTo }) {
  const to = process.env.MAIL_TO || 'info@kg-bleibach.de';
  if (process.env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM || 'KG Bleibach Website <info@kg-bleibach.de>', to: [to], reply_to: replyTo || undefined, subject: betreff, text, attachments: [{ filename: dateiname, content: Buffer.from(pdf).toString('base64') }] }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    return 'resend';
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error('Kein Mailversand eingerichtet: SMTP_HOST/SMTP_USER/SMTP_PASS oder RESEND_API_KEY fehlen.');
  const port = Number(process.env.SMTP_PORT || 465);
  const tx = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  await tx.sendMail({ from: process.env.MAIL_FROM || `"KG Bleibach Website" <${process.env.SMTP_USER}>`, to, replyTo: replyTo || undefined, subject: betreff, text, attachments: [{ filename: dateiname, content: Buffer.from(pdf), contentType: 'application/pdf' }] });
  return 'smtp';
}

export const handler = async (event) => {
  let payload;
  try { payload = JSON.parse(event.body || '{}').payload || {}; } catch { return { statusCode: 400, body: 'ungültig' }; }
  if (payload.form_name !== FORM) return { statusCode: 200, body: 'anderes Formular' };
  const d = payload.data || {};
  if (clean(d.firma)) return { statusCode: 200, body: 'Spam' };
  const eingang = payload.created_at ? new Date(payload.created_at) : new Date();
  const vorname = clean(d.vorname, 80), name = clean(d.name, 80);
  const pdf = await buildPdf(d, eingang);
  const tag = eingang.toISOString().slice(0, 10);
  const slug = (s) => s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const dateiname = `Beitrittserklaerung_${slug(name)}_${slug(vorname)}_${tag}.pdf`;
  const email = clean(d.email, 120);
  const text = [
    'Neue Beitrittserklärung über kg-bleibach.de',
    '',
    `Name: ${vorname} ${name}`,
    `Geburtsdatum: ${datumDE(d.geburtsdatum)}`,
    `Anschrift: ${clean(d.strasse)}, ${clean(d.plz)} ${clean(d.ort)}`,
    `E-Mail: ${email}`,
    `Telefon: ${clean(d.telefon)}`,
    '',
    'Die vollständige Beitrittserklärung mit SEPA-Lastschriftmandat liegt als PDF im Anhang.',
    'Bitte nach Übernahme in die Mitgliederverwaltung die Einsendung in Netlify (Forms) löschen.',
  ].join('\n');
  try {
    const weg = await sende({ pdf, dateiname, betreff: `Beitrittserklärung (PDF): ${vorname} ${name}`, text, replyTo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '' });
    console.log(`Beitrittserklärung als PDF versendet (${weg})`);
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('PDF-Versand fehlgeschlagen:', err.message);
    return { statusCode: 500, body: 'Versand fehlgeschlagen' };
  }
};
