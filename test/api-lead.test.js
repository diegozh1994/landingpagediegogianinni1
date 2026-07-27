// Tests de /api/lead — corre en CI con `node test/api-lead.test.js`.
// Cubre: validación de entrada, mapeo a Airtable, y el evento CAPI server-side
// (hashing SHA-256, dedup por event_id, independencia Airtable ↔ CAPI).

const assert = require('node:assert');
const crypto = require('node:crypto');
const handler = require('../api/lead.js');

const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');

let llamadas = [];
let fallaAirtable = false;
let fallaCAPI = false;
global.fetch = async (url, opts) => {
  const esCAPI = String(url).includes('graph.facebook.com');
  llamadas.push({ url: String(url), body: JSON.parse(opts.body), esCAPI });
  if ((esCAPI && fallaCAPI) || (!esCAPI && fallaAirtable)) {
    return { ok: false, status: 500, text: async () => 'error simulado' };
  }
  return { ok: true, status: 200, text: async () => '{}' };
};

function fakeRes() {
  const res = { statusCode: null, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

const HEADERS = { 'x-forwarded-for': '181.90.10.20, 10.0.0.1', 'user-agent': 'TestAgent/1.0' };

const leadCompleto = {
  nombre: 'Juan', apellido: 'Pérez', telefono: '+5491155554444',
  email: '  Juan@Test.com ', zona: 'Canning', tipo: 'comprador',
  landing: 'compradores', fbc: 'fb.1.1752600000000.abc', fbp: 'fb.1.1752500000000.987',
  event_id: 'e3b0c442-98fc-4c14-9afb-d4c1b2a3f4d5',
  landing_url: 'https://gianninirealestate.com.ar/compradores',
  utm_campaign: 'camp-x',
};

async function correr(nombre, body, esperado, check) {
  llamadas = [];
  const res = fakeRes();
  await handler({ method: 'POST', body, headers: HEADERS }, res);
  assert.strictEqual(res.statusCode, esperado, `${nombre}: status ${res.statusCode} != ${esperado} (${JSON.stringify(res.body)})`);
  if (check) check(res);
  console.log(`OK  ${nombre}`);
}

const capiDe = () => llamadas.find((c) => c.esCAPI);
const airtableDe = () => llamadas.find((c) => !c.esCAPI);

(async () => {
  process.env.AIRTABLE_TOKEN = 'patFAKE';
  process.env.AIRTABLE_BASE_ID = 'appFAKE';
  process.env.META_CAPI_TOKEN = 'capiFAKE';
  delete process.env.META_TEST_EVENT_CODE;
  delete process.env.LEAD_DESTINATION;

  // Validación de entrada
  {
    const res = fakeRes();
    await handler({ method: 'GET', headers: {} }, res);
    assert.strictEqual(res.statusCode, 405);
    console.log('OK  rechaza GET');
  }
  await correr('rechaza sin teléfono', { nombre: 'Juan' }, 422, () => {
    assert.strictEqual(llamadas.length, 0, 'lead inválido: no sale NADA (ni Airtable ni CAPI)');
  });

  // Camino feliz: dos canales, dedup, hashing
  await correr('lead válido → Airtable + CAPI', leadCompleto, 200, (res) => {
    assert.strictEqual(res.body.capi, true);
    const capi = capiDe();
    const airtable = airtableDe();
    assert.ok(capi && airtable, 'deben salir los dos canales');
    assert.ok(capi.url.includes('/v25.0/1609863687137753/events'), `url CAPI: ${capi.url}`);
    assert.ok(capi.url.includes('access_token=capiFAKE'));

    const ev = capi.body.data[0];
    assert.strictEqual(ev.event_name, 'Lead');
    assert.strictEqual(ev.action_source, 'website');
    assert.strictEqual(ev.event_id, leadCompleto.event_id, 'MISMO event_id que el pixel (dedup)');
    assert.strictEqual(airtable.body.fields['Event ID'], leadCompleto.event_id, 'y el mismo en Airtable');
    assert.strictEqual(ev.event_source_url, leadCompleto.landing_url);
    assert.strictEqual(ev.custom_data.content_name, 'compradores');
    assert.ok(Number.isInteger(ev.event_time));

    // Hashing: lowercase + trim; teléfono solo dígitos E.164 sin '+'
    assert.deepStrictEqual(ev.user_data.em, [sha('juan@test.com')]);
    assert.deepStrictEqual(ev.user_data.ph, [sha('5491155554444')]);
    assert.deepStrictEqual(ev.user_data.fn, [sha('juan')]);
    assert.deepStrictEqual(ev.user_data.ln, [sha('pérez')]);
    // fbc/fbp SIN hashear; IP real (primer valor del x-forwarded-for) y UA
    assert.strictEqual(ev.user_data.fbc, leadCompleto.fbc);
    assert.strictEqual(ev.user_data.fbp, leadCompleto.fbp);
    assert.strictEqual(ev.user_data.client_ip_address, '181.90.10.20');
    assert.strictEqual(ev.user_data.client_user_agent, 'TestAgent/1.0');
    assert.ok(!('test_event_code' in capi.body), 'sin env var no viaja test_event_code');
  });

  // Páginas de propiedad: campo Propiedad + landing 'propiedad' + content_name por slug
  const leadPropiedad = {
    ...leadCompleto, landing: 'propiedad', propiedad: 'terralagos',
    landing_url: 'https://gianninirealestate.com.ar/propiedad/terralagos?utm_content=ad_terralagos_video_v1',
  };
  await correr('lead de página de propiedad → Propiedad + content_name por slug', leadPropiedad, 200, () => {
    const airtable = airtableDe();
    assert.strictEqual(airtable.body.fields['Propiedad'], 'terralagos');
    assert.strictEqual(airtable.body.fields['Landing'], 'propiedad', "landing 'propiedad' es válida");
    assert.strictEqual(capiDe().body.data[0].custom_data.content_name, 'propiedad-terralagos');
  });

  // Slug inválido no viaja (typecast:true crearía opciones fantasma en el select)
  await correr('slug de propiedad inválido → se descarta', { ...leadPropiedad, propiedad: 'Terra Lagos!<script>' }, 200, () => {
    assert.ok(!('Propiedad' in airtableDe().body.fields));
    assert.strictEqual(capiDe().body.data[0].custom_data.content_name, 'propiedad');
  });

  // Regresión: leads de landings siguen sin campo Propiedad ni cambio de content_name
  await correr('lead de /compradores sin propiedad → sin campo Propiedad', leadCompleto, 200, () => {
    assert.ok(!('Propiedad' in airtableDe().body.fields));
    assert.strictEqual(capiDe().body.data[0].custom_data.content_name, 'compradores');
  });

  // Campos vacíos se omiten del user_data
  await correr('user_data omite vacíos', { ...leadCompleto, email: '', apellido: '', fbc: '' }, 200, () => {
    const ud = capiDe().body.data[0].user_data;
    assert.ok(!('em' in ud) && !('ln' in ud) && !('fbc' in ud));
    assert.ok('ph' in ud && 'fn' in ud);
  });

  // Independencia de canales, dirección 1: Airtable falla → CAPI sale igual
  fallaAirtable = true;
  await correr('Airtable caído → CAPI sale igual', leadCompleto, 502, (res) => {
    assert.ok(capiDe(), 'el evento CAPI debe salir aunque la persistencia falle');
    assert.strictEqual(res.body.capi, true);
  });
  fallaAirtable = false;

  // Independencia, dirección 2: CAPI falla → persistencia y respuesta intactas
  fallaCAPI = true;
  await correr('CAPI caído → persistencia intacta y 200', leadCompleto, 200, (res) => {
    assert.ok(airtableDe(), 'Airtable debe recibir el lead aunque CAPI falle');
    assert.strictEqual(res.body.ok, true, 'la falla de CAPI JAMÁS afecta la respuesta');
    assert.strictEqual(res.body.capi, false);
  });
  fallaCAPI = false;

  // Sin token: CAPI se saltea con warning, persistencia normal
  delete process.env.META_CAPI_TOKEN;
  await correr('sin META_CAPI_TOKEN → solo Airtable, 200', leadCompleto, 200, (res) => {
    assert.ok(!capiDe(), 'sin token no debe llamar a graph.facebook.com');
    assert.ok(airtableDe());
    assert.strictEqual(res.body.capi, false);
  });
  process.env.META_CAPI_TOKEN = 'capiFAKE';

  // --------------------------------------------------------------------------
  // MODO TEST (jul 2026, tras el incidente de los 7 leads fantasma).
  // El invariante que protegen estos tests: un lead de prueba NUNCA puede
  // producir una conversión real, y un lead real NUNCA puede caer en Test Events.
  // --------------------------------------------------------------------------

  // Regresión del bug original: la env var sola YA NO manda todo a Test Events.
  // Antes bastaba con que existiera para que las conversiones reales dejaran de
  // contar. Es el test más importante del bloque.
  process.env.META_TEST_EVENT_CODE = 'TEST12345';
  await correr('lead REAL con la env var puesta → NO viaja test_event_code', leadCompleto, 200, () => {
    assert.strictEqual(capiDe().body.test_event_code, undefined,
      'un lead real jamás debe caer en Test Events, aunque la env var exista');
    assert.strictEqual(airtableDe().body.fields.Estado, 'Nuevo');
  });

  await correr('lead de PRUEBA → test_event_code en ESE request', { ...leadCompleto, test: true }, 200, () => {
    assert.strictEqual(capiDe().body.test_event_code, 'TEST12345');
    assert.strictEqual(airtableDe().body.fields.Estado, 'PRUEBA',
      'la fila de prueba se marca sola para poder filtrarla y borrarla');
  });

  // Guarda dura: prueba sin código de test → el evento NO sale. Sin esto, un QA
  // con la env var mal configurada seguiría inyectando conversiones al pixel.
  delete process.env.META_TEST_EVENT_CODE;
  await correr('PRUEBA sin META_TEST_EVENT_CODE → CAPI salteado, Airtable sí', { ...leadCompleto, test: true }, 200, (res) => {
    assert.ok(!capiDe(), 'sin código de test el evento NO puede salir: contaminaría el pixel');
    assert.strictEqual(airtableDe().body.fields.Estado, 'PRUEBA');
    assert.strictEqual(res.body.capi, false);
  });
  process.env.META_TEST_EVENT_CODE = 'TEST12345';

  // El flag es estricto: nada de truthy accidental marcando PRUEBA un lead real.
  for (const valor of [false, 'false', 0, null, undefined, '', 'no']) {
    await correr(`test=${JSON.stringify(valor)} → se trata como lead REAL`, { ...leadCompleto, test: valor }, 200, () => {
      assert.strictEqual(airtableDe().body.fields.Estado, 'Nuevo');
      assert.strictEqual(capiDe().body.test_event_code, undefined);
    });
  }
  // Las formas string se aceptan para poder correr el E2E con curl.
  for (const valor of [true, 'true', '1']) {
    await correr(`test=${JSON.stringify(valor)} → se trata como PRUEBA`, { ...leadCompleto, test: valor }, 200, () => {
      assert.strictEqual(airtableDe().body.fields.Estado, 'PRUEBA');
      assert.strictEqual(capiDe().body.test_event_code, 'TEST12345');
    });
  }
  delete process.env.META_TEST_EVENT_CODE;

  console.log('\nTodos los tests de /api/lead pasaron.');
})();
