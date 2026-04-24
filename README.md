# Massenstromrechner PWA v1.5

HLK-Rechner für Heizung · Kälte · Lüftung · h,x-Diagramm

## Dateistruktur

```
/
├── index.html           Haupt-App (alle Tabs)
├── app.js               Shared Utils · Tab-Steuerung · PWA · Einheitenrechner
├── heating-cooling.js   Massenstrom · Hydraulik · Rohrdimensionierung
├── ventilation.js       Lüftung · Volumenstrom · Δt
├── hx-engine.js         h,x-Diagramm nach Mollier · Prozessberechnungen
├── wrg-mischluft.js     WRG (Wärmerückgewinnung) · Luftmischung
├── pdf-export.js        A4-PDF-Export (alle Tabs)
├── sw.js                Service Worker (Cache-First, v1.5)
├── manifest.json        PWA-Manifest
├── styles.css           Globale Stile (hx-Modul)
└── worker.js            Cloudflare Analytics (Deployment-spezifisch)
```

## Tabs

| Tab | Datei | Funktion |
|-----|-------|----------|
| Heizung/Kälte | heating-cooling.js | Massenstrom, Leistung, ΔT · Rohrempfehlung |
| Lüftung | ventilation.js | Luft-Volumenstrom, Leistung, Δt |
| Rohrdimensionierung | heating-cooling.js | Stahl + Mapress Edelstahl, DN15–DN300 |
| Einheiten | app.js | 7 Kategorien, Swap-Funktion |
| h,x-Diagramm | hx-engine.js | Mollier-Diagramm · 6 Prozessarten · PDF |
| WRG / Mischluft | wrg-mischluft.js | Wärmerückgewinnung · Luftmischung |

## Deployment (Cloudflare Pages / GitHub Pages)

Alle Dateien direkt ins Root-Verzeichnis kopieren.

**Wichtig bei Updates:** `CACHE_NAME` in `sw.js` hochzählen  
→ Aktuell: `massenstrom-v1.5`

## Physik

- **Massenstrom:** ṁ = Q / (c_p × ΔT)
- **Hydraulik:** Darcy-Weisbach + Colebrook-White
- **Lüftung:** Q = V̇ × ρ(t_ZL) × c_p × Δt
- **h,x:** h = 1,006·t + x·(2501 + 1,86·t) kJ/kg · Magnus-Formel
- **WRG:** η_t = (T_ZL − T_AU) / (T_AB − T_AU)
- **Mischluft:** massengewichtete Mischung

## Changelog v1.5

- Echtes Mollier h,x-Diagramm (T-Achse vertikal, Isotherme horizontal)
- Auto-Zustandsberechnung ohne Button
- Physikalisch korrekte Prozessketten (Dampf, Adiabat, Entfeuchten)
- Prozessfilterung nach Ausgangs-/Zielzustand
- Neuer Tab: WRG & Mischluft
- PDF-Export: korrektes Seitenverhältnis
- Service Worker v1.5 mit wrg-mischluft.js
