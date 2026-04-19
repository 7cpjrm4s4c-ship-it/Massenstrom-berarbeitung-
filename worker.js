/**
 * Massenstromrechner — Analytics Worker
 * Cloudflare Worker + KV Storage
 *
 * Zählt eindeutige tägliche Besucher (unique visitors per day).
 * Speichert KEINE personenbezogenen Daten — nur anonyme UUIDs als Schlüssel.
 *
 * KV Namespace: VISITS (im Cloudflare Dashboard anlegen)
 */

export default {
  async fetch(request, env) {

    /* ── CORS Preflight ── */
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const url    = new URL(request.url);
    const uid    = url.searchParams.get('uid')  || 'anonymous';
    const page   = url.searchParams.get('page') || '/';
    const ref    = url.searchParams.get('ref')  || 'direct';
    const today  = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD

    /* ── Keys ── */
    const visitKey   = `visit:${today}:${uid}`;       // Wurde dieser User heute schon gezählt?
    const countKey   = `count:${today}`;              // Tages-Gesamtzähler
    const pageKey    = `page:${today}:${page}`;       // Seitenaufrufe (gesamt, nicht unique)
    const totalKey   = `total:all`;                   // Kumulierter Gesamtzähler

    /* ── Unique Visit zählen ── */
    const alreadyCounted = await env.VISITS.get(visitKey);

    if (!alreadyCounted) {
      /* Neuer unique visitor heute */
      await env.VISITS.put(visitKey, '1', {
        expirationTtl: 60 * 60 * 24 * 90,  // 90 Tage aufbewahren
      });

      /* Tages-Counter hochzählen */
      const todayCount = await env.VISITS.get(countKey);
      const newCount   = todayCount ? parseInt(todayCount) + 1 : 1;
      await env.VISITS.put(countKey, newCount.toString(), {
        expirationTtl: 60 * 60 * 24 * 365,  // 1 Jahr
      });

      /* Gesamt-Counter hochzählen */
      const totalCount = await env.VISITS.get(totalKey);
      const newTotal   = totalCount ? parseInt(totalCount) + 1 : 1;
      await env.VISITS.put(totalKey, newTotal.toString());
    }

    /* ── Seitenaufruf zählen (jeder Aufruf, nicht unique) ── */
    const pageCount    = await env.VISITS.get(pageKey);
    const newPageCount = pageCount ? parseInt(pageCount) + 1 : 1;
    await env.VISITS.put(pageKey, newPageCount.toString(), {
      expirationTtl: 60 * 60 * 24 * 365,
    });

    /* ── Aktuelle Zähler lesen ── */
    const uniqueToday  = parseInt(await env.VISITS.get(countKey) || '0');
    const totalVisits  = parseInt(await env.VISITS.get(totalKey) || '0');
    const pageViews    = parseInt(await env.VISITS.get(pageKey)  || '0');

    /* ── Antwort ── */
    return new Response(
      JSON.stringify({
        date:                today,
        unique_visits_today: uniqueToday,
        total_visits_all:    totalVisits,
        page_views_today:    pageViews,
        page:                page,
        counted:             !alreadyCounted,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      }
    );
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
