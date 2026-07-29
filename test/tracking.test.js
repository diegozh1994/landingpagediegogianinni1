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
// `opts.search` permite simular el querystring (lo usa el modo test con ?test=1).
function crearPagina(opts = {}) {
  const search = opts.search || '?utm_source=test';
  const listeners = {};
  const fetches = [];
  const timeouts = [];
  const eventosFbq = [];
  const eventosGtag = [];
  const io = { cb: null };
  let uuidN = 0;

  // DOM mínimo con árbol real: el panel del modo test crea nodos, los cuelga de
  // body y los busca por id, así que el mock necesita más que un stub vacío.
  const nuevoNodo = (tag) => {
    const nodo = {
      tag, style: {}, hijos: [], atributos: {}, textContent: '',
      appendChild(h) { this.hijos.push(h); h.padre = this; return h; },
      setAttribute(k, v) { this.atributos[k] = v; },
      addEventListener(e, fn) { (this.listeners = this.listeners || {})[e] = fn; },
      remove() {
        if (this.padre) this.padre.hijos = this.padre.hijos.filter((h) => h !== this);
      },
      // Texto acumulado del subárbol — para poder afirmar sobre lo que se ve.
      texto() {
        return this.textContent + this.hijos.map((h) => (h.texto ? h.texto() : String(h.nodeValue || ''))).join(' ');
      },
    };
    return nodo;
  };
  const body = nuevoNodo('body');

  const sandbox = {
    console, JSON, Object, String, Date, Math, URLSearchParams, encodeURIComponent,
    fetch: (url, opts2) => { fetches.push({ url: String(url), opts: opts2 }); return { catch: () => {} }; },
    setTimeout: (fn, ms) => { timeouts.push({ fn, ms }); return timeouts.length; },
    localStorage: storageEnMemoria(),
    sessionStorage: storageEnMemoria(),
    crypto: { randomUUID: () => `uuid-${++uuidN}` },
    fbq: (...args) => { eventosFbq.push(args); },
    gtag: (...args) => { eventosGtag.push(args); },
    IntersectionObserver: function (cb) {
      io.cb = cb;
      this.observe = () => {};
      this.disconnect = () => {};
    },
    document: {
      cookie: '',
      referrer: '',
      body,
      createElement: (tag) => nuevoNodo(tag),
      createTextNode: (t) => ({ nodeValue: t, texto: () => String(t) }),
      getElementById: (id) => body.hijos.find((h) => h.atributos && h.atributos.id === id)
        || body.hijos.find((h) => h.id === id) || null,
    },
  };
  sandbox.window = sandbox;
  sandbox.location = { href: 'https://test.local/compradores' + search, search };
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
    payloads: () => fetches.map((f) => JSON.parse(f.opts.body)),
    // Redirects: el submit real agenda el wa.me en un setTimeout de 300ms.
    redirects: () => timeouts.filter((t) => t.ms === 300),
    eventosFbq,
    eventosGtag,
    body,
    panel: () => body.hijos.find((h) => h.id === 'gtrack-test-panel') || null,
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

// ----------------------------------------------------------------------------
// MODO TEST (?test=1) — jul 2026, tras el incidente de los 7 leads fantasma.
// Invariante: con el flag, el submit NO puede producir una conversión ni un chat.
// ----------------------------------------------------------------------------

// 8) Submit normal (sin flag): dispara Lead y agenda el redirect. Línea de base.
{
  const p = crearPagina();
  p.enviar();
  assert.strictEqual(p.fetches.length, 1, 'el POST a /api/lead sale siempre');
  assert.strictEqual(p.payloads()[0].test, undefined, 'sin flag no viaja `test` en el payload');
  assert.deepStrictEqual(
    p.eventosFbq.filter((e) => e[1] === 'Lead').length, 1, 'submit real dispara fbq Lead');
  assert.strictEqual(p.redirects().length, 1, 'submit real agenda el redirect a wa.me');
  assert.strictEqual(p.panel(), null, 'sin flag no aparece el panel');
  console.log('OK  submit normal → Lead + redirect (línea de base)');
}

// 9) LO CENTRAL: con ?test=1 el POST sale, pero NO hay Lead ni redirect.
{
  const p = crearPagina({ search: '?test=1&utm_source=qa' });
  assert.strictEqual(p.sandbox.GTrack.modoTest, true, 'el flag se levanta del querystring');
  p.enviar();

  assert.strictEqual(p.fetches.length, 1, 'el pipeline se ejercita igual: el POST sale');
  assert.strictEqual(p.payloads()[0].test, true, '`test:true` viaja al server');
  assert.strictEqual(p.eventosFbq.filter((e) => e[1] === 'Lead').length, 0,
    'NINGÚN fbq Lead en modo test: es la contaminación que causó los 7 fantasma');
  assert.strictEqual(p.eventosGtag.length, 0, 'tampoco generate_lead de GA4');
  assert.strictEqual(p.redirects().length, 0,
    'NINGÚN redirect a wa.me: cero chats nuevos, cero ruido en el CRM');
  assert.ok(p.panel(), 'aparece el panel de verificación en lugar del redirect');
  assert.ok(p.panel().texto().includes('Hola Diego, test.'),
    'el panel muestra el mensaje WA que se habría mandado, para poder verificarlo');
  console.log('OK  ?test=1 → POST sí, Lead NO, redirect NO, panel sí');
}

// 10) La atribución se sigue capturando en modo test (el QA valida fbc/fbp/UTMs).
{
  const p = crearPagina({ search: '?test=1&utm_source=meta&utm_campaign=camp-qa&fbclid=ABC123' });
  p.enviar();
  const payload = p.payloads()[0];
  assert.strictEqual(payload.utm_source, 'meta');
  assert.strictEqual(payload.utm_campaign, 'camp-qa');
  assert.ok(payload.fbc && payload.fbc.includes('ABC123'), 'fbc se deriva del fbclid igual que en real');
  console.log('OK  modo test conserva la atribución completa (fbc/UTMs)');
}

// 11) EL FLAG NO SE PEGA: es el bug inverso y el más caro (perder una conversión
//     real). `test` no se persiste, así que otra página de la misma sesión —
//     mismo storage, sin ?test=1 — envía como lead REAL.
{
  const p1 = crearPagina({ search: '?test=1&utm_source=meta' });
  p1.enviar();
  assert.strictEqual(p1.payloads()[0].test, true);

  const p2 = crearPagina({ search: '?utm_source=meta' });
  // Se le pasa el storage de la sesión anterior para simular la misma pestaña.
  assert.strictEqual(p2.sandbox.GTrack.modoTest, false, 'sin ?test=1 el modo test está apagado');
  p2.enviar();
  assert.strictEqual(p2.payloads()[0].test, undefined, 'el flag NO sobrevive a la navegación');
  assert.strictEqual(p2.eventosFbq.filter((e) => e[1] === 'Lead').length, 1,
    'un lead real posterior dispara su conversión normalmente');
  assert.strictEqual(p2.redirects().length, 1, 'y redirige a WhatsApp como corresponde');
  console.log('OK  el flag no se pega: submit posterior sin ?test=1 es lead REAL');
}

// 12) test=0 / test=cualquier-cosa NO activa el modo test (solo ?test=1).
{
  for (const search of ['?test=0', '?test=false', '?test=', '?testigo=1']) {
    const p = crearPagina({ search });
    assert.strictEqual(p.sandbox.GTrack.modoTest, false, `${search} no debe activar modo test`);
    p.enviar();
    assert.strictEqual(p.redirects().length, 1, `${search}: sigue siendo un submit real`);
  }
  console.log('OK  solo ?test=1 activa el modo (nada de valores ambiguos)');
}

// 13) El panel permite repetir el QA sin recargar (libera el guard de reentrada).
{
  const p = crearPagina({ search: '?test=1' });
  p.enviar();
  p.enviar();
  assert.strictEqual(p.fetches.length, 1, 'el guard anti-doble-tap sigue vivo en modo test');
  const cerrar = p.panel().hijos.find((h) => h.tag === 'button');
  assert.ok(cerrar, 'el panel tiene botón de cerrar');
  cerrar.listeners.click();
  assert.strictEqual(p.panel(), null, 'el panel se cierra');
  p.enviar();
  assert.strictEqual(p.fetches.length, 2, 'tras cerrar se puede repetir la corrida');
  console.log('OK  cerrar el panel habilita la corrida siguiente');
}

// 14) fbqParams: suma params custom al Lead sin tocar content_name ni eventID.
//     Lo usa el botón "Escribime por WhatsApp" de las páginas de propiedad.
{
  const p = crearPagina();
  p.sandbox.GTrack.enviarLead({
    payload: { nombre: '', telefono: '', propiedad: 'gaboto', origen: 'whatsapp_directo' },
    contentName: 'propiedad-gaboto',
    fbqParams: { lead_origen: 'whatsapp_directo' },
    mensajeWA: 'Hola Diego, vi Sebastián Gaboto (USD 340.000) y quiero más info',
  });
  const lead = p.eventosFbq.find((e) => e[1] === 'Lead');
  assert.ok(lead, 'el click de WhatsApp dispara Lead');
  assert.strictEqual(lead[2].content_name, 'propiedad-gaboto', 'content_name intacto');
  assert.strictEqual(lead[2].lead_origen, 'whatsapp_directo', 'param custom presente');
  assert.ok(lead[3].eventID, 'eventID presente → dedup con CAPI');
  assert.strictEqual(p.payloads()[0].event_id, lead[3].eventID,
    'el event_id del POST y el eventID del pixel son EL MISMO (dedup)');
  assert.strictEqual(p.redirects().length, 1, 'y recién después abre WhatsApp');
  console.log('OK  fbqParams: Lead del botón WhatsApp con dedup y param propio');
}

// 15) Sin fbqParams el Lead sale exactamente como siempre (no rompimos el form).
{
  const p = crearPagina();
  p.enviar();
  const lead = p.eventosFbq.find((e) => e[1] === 'Lead');
  // Comparación por contenido: el objeto viene del sandbox de vm y su prototipo
  // no es el mismo Object que el de este archivo (deepStrictEqual lo rechazaría).
  assert.deepStrictEqual(Object.keys(lead[2]), ['content_name'], 'sin fbqParams: ni una key extra');
  assert.strictEqual(lead[2].content_name, 'test');
  console.log('OK  sin fbqParams el contrato del Lead no cambia');
}

console.log('\nTodos los tests de tracking pasaron.');
