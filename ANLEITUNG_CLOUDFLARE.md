# Cloudflare Worker — Einrichtungsanleitung
## Massenstromrechner Analytics

---

## Zwei Fehler aus dem Build-Log — beide einfach zu lösen

| Fehler | Ursache | Fix |
|---|---|---|
| Worker name mismatch | wrangler.toml hatte falschen Namen | Bereits korrigiert auf "massenstromrechner" |
| KV namespace not valid | Platzhalter-ID noch nicht ersetzt | Schritt 1 unten |

---

## Schritt 1 — KV Namespace ID herausfinden

1. Gehe zu https://dash.cloudflare.com
2. Links: Workers & Pages → KV
3. Klick auf den Namespace "massenstrom-visits"
4. Oben auf der Seite steht die Namespace ID (32-stelliger Hex-String):
   Beispiel: a1b2c3d4e5f6789012345678901234ab
   Diese ID kopieren.

---

## Schritt 2 — wrangler.toml im GitHub-Repo anpassen

Datei pwa3/wrangler.toml auf GitHub öffnen (Edit-Button):

Zeile ändern:
  id = "HIER_KV_NAMESPACE_ID_EINTRAGEN"

Ersetzen durch die echte ID:
  id = "a1b2c3d4e5f6789012345678901234ab"

Datei speichern → Commit → GitHub loest automatisch neues Deployment aus.

---

## Schritt 3 — KV Namespace im Dashboard verknuepfen

1. Workers & Pages → massenstromrechner → Settings → Variables
2. Abschnitt "KV Namespace Bindings" → "Add binding"
3. Eintragen:
   Variable name: VISITS
   KV Namespace:  massenstrom-visits
4. "Save" klicken

---

## Schritt 4 — Worker-URL in index.html eintragen

Nach erfolgreichem Deploy diese Zeile in index.html suchen:
  const WORKER_URL = 'https://DEIN-WORKER.massenstrom.workers.dev';

Ersetzen durch die echte URL (aus dem Cloudflare Dashboard):
  const WORKER_URL = 'https://massenstromrechner.DEIN-SUBDOMAIN.workers.dev';

Dann index.html auf GitHub hochladen.

---

## Schritt 5 — Testen

Worker direkt im Browser aufrufen:
  https://massenstromrechner.DEIN-SUBDOMAIN.workers.dev?uid=test&page=/

Erwartete Antwort:
  {
    "date": "2026-04-11",
    "unique_visits_today": 1,
    "total_visits_all": 1,
    "page_views_today": 1,
    "page": "/",
    "counted": true
  }

In der Browser-Konsole der App (F12):
  [Analytics] Unique Visitors heute: 1

---

## Daten einsehen

Cloudflare Dashboard → Workers & Pages → KV → massenstrom-visits → View

Schluessel          | Inhalt
--------------------|------------------------------------------
count:2026-04-11    | Unique Visitors heute
total:all           | Gesamtbesucher aller Zeiten
page:2026-04-11:/   | Seitenaufrufe heute
visit:2026-04-11:uuid | Einzelbesuch (laeuft nach 90 Tagen ab)

---

## Kosten (Free Plan)

Ressource         | Limit Free     | Erwarteter Verbrauch
------------------|----------------|---------------------
Worker Requests   | 100.000 / Tag  | ~50-500 / Tag
KV Reads          | 10 Mio. / Mon. | ~500 / Tag
KV Writes         | 1 Mio. / Mon.  | ~200 / Tag
KV Storage        | 1 GB           | < 1 MB

Voellig kostenlos fuer eine interne HLS-Planungsapp.

---

## Datenschutz

- Nur anonyme UUID gespeichert (kein Personenbezug)
- Kein Cookie, keine IP-Adresse, kein Name
- Automatische Loeschung nach 90 Tagen
- DSGVO-konform
