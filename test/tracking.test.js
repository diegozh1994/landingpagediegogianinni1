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
  const eventosFbq = [];
  const io = { cb: null };
  let uuidN = 0;

  const sandbox = {
    console, JSON, Object, String, Date, Math, URLSearchParams, encodeURIComponent,
    fetch: (url, opts) => { fetches.push({ url: String(url), opts }); return { catch: () => {} }; },
    setTimeout: (fn, ms) => { timeouts.push({ fn, ms }); return timeouts.length; },
    localStorage: storageEnMemoria(),
    sessionStorage: storageEnMemoria(),
    crypto: { randomUUID: () => `uuid-${++uuidN}` },
    fbq: (...args) => { eventosFbq.push(args); },
    IntersectionObserver: function (cb) {
      io.cb = cb;
      this.observe = () => {};
      this.disconnect = () => {};
    },
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
    eventosFbq,
    io,
    sandbox,
    // Form fake para instrumentarForm: captura listeners y permite dispararlos
    crearForm: () => {
      const ls = {};
      return {
        addEventListener: (e, fn) => { (ls[e] = ls[e] || []).push(fn); },
        disparar: (e) => (ls[e] || []).forEach((fn) => fn()),
      };
    },
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

// 5) Embudo FormView/FormStart: una sola vez cada uno, con los params correctos
{
  const p = crearPagina();
  const form = p.crearForm();
  p.sandbox.GTrack.instrumentarForm(form, { landing: 'propiedad', propiedad: 'terralagos' });

  p.io.cb([{ isIntersecting: false }]);
  assert.strictEqual(p.eventosFbq.length, 0, 'sin intersección no dispara nada');
  p.io.cb([{ isIntersecting: true }]);
  p.io.cb([{ isIntersecting: true }]);
  form.disparar('focusin');
  form.disparar('focusin');

  assert.deepStrictEqual(p.eventosFbq, [
    ['trackCustom', 'FormView', { landing: 'propiedad', propiedad: 'terralagos' }],
    ['trackCustom', 'FormStart', { landing: 'propiedad', propiedad: 'terralagos' }],
  ], 'FormView y FormStart: una vez cada uno, con params');
  console.log('OK  FormView/FormStart una sola vez con params');
}

// 6) Sin IntersectionObserver (browser viejo): FormView se saltea, FormStart vive
{
  const p = crearPagina();
  delete p.sandbox.IntersectionObserver;
  const form = p.crearForm();
  p.sandbox.GTrack.instrumentarForm(form, { landing: 'compradores' });
  form.disparar('focusin');
  assert.deepStrictEqual(p.eventosFbq, [['trackCustom', 'FormStart', { landing: 'compradores' }]]);
  console.log('OK  sin IntersectionObserver → solo FormStart, sin romper');
}

// 7) instrumentarForm con form inexistente no explota (página sin form)
{
  const p = crearPagina();
  p.sandbox.GTrack.instrumentarForm(null, { landing: 'x' });
  assert.strictEqual(p.eventosFbq.length, 0);
  console.log('OK  form null inofensivo');
}

console.log('\nTodos los tests de tracking pasaron.');
