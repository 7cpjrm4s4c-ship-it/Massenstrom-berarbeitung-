// Optional separater Worker für spätere Berechnungen
self.onmessage = (e) => {
  self.postMessage({ ok: true, input: e.data });
};