// Test del guard de reentrada de _tracking.js — corre en CI con `node test/tracking.test.js`.
//
// Cubre la regresión del hotfix post-1B: el candado anti-doble-tap quedaba
// clavado para siempre si la página volvía a mostrarse con el estado JS
// preservado (bfcache: submit → WhatsApp → botón atrás), matando el form en
// silencio. El ciclo submit → pageshow → submit TIENE que producir dos POST.

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

function storageEnMemoria() {
  const datos = {};
  return {
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => { datos[k] = String(v); },
    removeItem: (k) => { delete datos[k]; },
  };
}

// Entorno browser mínimo para evaluar _tracking.js fuera del navegador.
function crearPagina() {
  const listeners = {};
  const fetches = [];
  const timeouts = [];
  let uuidN = 0;

  const sandbox = {
    console, JSON, Object, String, Date, Math, URLSearchParams, encodeURIComponent,
    fetch: (url, opts) => { fetches.push({ url: String(url), opts }); return { catch: () => {} }; },
    setTimeout: (fn, ms) => { timeouts.push({ fn, ms }); return timeouts.length; },
    localStorage: storageEnMemoria(),
    sessionStorage: storageEnMemoria(),
    crypto: { randomUUID: () => `uuid-${++uuidN}` },
    document: {
      cookie: '',
      referrer: '',
      createElement: () => ({ style: {}, addEventListener: () => {}, appendChild: () => {} }),
    },
  };
  sandbox.window = sandbox;
  sandbox.location = { href: 'https://test.local/compradores?utm_source=test', search: '?utm_source=test' };
  sandbox.addEventListener = (evento, fn) => { (listeners[evento] = listeners[evento] || []).push(fn); };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '_tracking.js'), 'utf8'), sandbox);

  return {
    enviar: () => sandbox.GTrack.enviarLead({
      payload: { nombre: 'Test', telefono: '+5491100000000' },
      contentName: 'test',
      mensajeWA: 'Hola Diego, test.',
    }),
    fetches,
    dispararPageshow: () => (listeners.pageshow || []).forEach((fn) => fn()),
    ejecutarTimeouts: (ms) => timeouts.filter((t) => t.ms === ms).splice(0).forEach((t) => t.fn()),
    eventIds: () => fetches.map((f) => JSON.parse(f.opts.body).event_id),
  };
}

// 1) Doble tap en la misma carga → UN solo POST (el guard sigue vivo)
{
  const p = crearPagina();
  p.enviar();
  p.enviar();
  assert.strictEqual(p.fetches.length, 1, 'doble tap debe producir 1 solo POST');
  console.log('OK  doble tap → 1 solo POST');
}

// 2) LA REGRESIÓN: submit → pageshow (vuelta desde WhatsApp vía bfcache) → submit
//    → DOS POST con event_id distintos
{
  const p = crearPagina();
  p.enviar();
  p.dispararPageshow();
  p.enviar();
  assert.strictEqual(p.fetches.length, 2, 'tras pageshow el form DEBE volver a enviar');
  const [id1, id2] = p.eventIds();
  assert.ok(id1 && id2 && id1 !== id2, 'cada intento real lleva un event_id nuevo');
  console.log('OK  submit → pageshow → submit → 2 POST con event_id distintos');
}

// 3) Auto-recuperación: si el redirect nunca navega, a los 5s el form opera de nuevo
{
  const p = crearPagina();
  p.enviar();
  p.ejecutarTimeouts(5000);
  p.enviar();
  assert.strictEqual(p.fetches.length, 2, 'tras el timeout de 5s el form debe recuperarse');
  console.log('OK  auto-recuperación a los 5s');
}

// 4) El pageshow inicial de una carga normal no rompe nada
{
  const p = crearPagina();
  p.dispararPageshow();
  p.enviar();
  assert.strictEqual(p.fetches.length, 1);
  console.log('OK  pageshow inicial inofensivo');
}

console.log('\nTodos los tests de tracking pasaron.');
