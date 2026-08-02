// /api/lead — recibe leads de las landings, los persiste en el destino configurado
// y dispara el evento Lead server-side a la Meta Conversions API (CAPI).
//
// Persistencia y CAPI son CANALES INDEPENDIENTES: si uno falla, el otro sale
// igual (misma regla de resiliencia de todo el funnel). La dedup con el pixel
// browser-side usa el MISMO event_id que generó _tracking.js en el cliente.
//
// El destino de persistencia se elige con LEAD_DESTINATION (default: "airtable").
// Para enchufar el CRM propio (post-R1): agregar una función destino acá abajo,
// registrarla en DESTINOS y cambiar la env var. Las landings no se tocan.
//
// Env vars (se cargan en Vercel, nunca en el repo — detalle en README.md):
//   LEAD_DESTINATION      destino activo (default "airtable")
//   AIRTABLE_TOKEN        PAT con data.records:write sobre la base de leads
//   AIRTABLE_BASE_ID      id de la base (app...)
//   AIRTABLE_TABLE        nombre de la tabla (default "Leads Landing")
//   META_CAPI_TOKEN       access token de la Conversions API (Events Manager)
//   META_TEST_EVENT_CODE  código de Test Events; se aplica SOLO a leads test:true
//
// REGLA DURA (ago 2026): no se crea ninguna fila sin nombre Y teléfono. Ver la
// "barrera de persistencia" en el handler.

const crypto = require('node:crypto');

// Versión estable de la Graph API — verificada 2026-07: v25.0 (feb 2026).
// Meta expira versiones cada ~2 años; subirla es cambiar esta constante.
const GRAPH_API_VERSION = 'v25.0';
const META_PIXEL_ID = '1609863687137753';

const LARGO_MAX = 500;

const TIPOS_VALIDOS = ['propietario', 'comprador'];
const LANDINGS_VALIDAS = ['propietarios', 'compradores', 'home', 'propiedad'];
// Origen de la captura. 'form' (default) = completó el formulario, con teléfono.
// 'whatsapp_directo' = tocó "Escribime por WhatsApp" en el CTA sticky de una
// página de propiedad. Desde ago 2026 ese origen NO persiste (ver la barrera en
// el handler): dispara la conversión a Meta y nada más. Se conserva el valor
// porque el evento CAPI lo manda en `custom_data.lead_origen`, que es lo que
// permite separar en Events Manager los Lead del form de los del botón.
const ORIGENES_VALIDOS = ['form', 'whatsapp_directo'];
// Slug de propiedad (páginas /propiedad/{slug}): formato estricto para que un
// valor basura no cree opciones fantasma en el single select de Airtable
// (el POST va con typecast:true, que crea opciones nuevas sin preguntar).
const SLUG_PROPIEDAD = /^[a-z0-9-]{2,30}$/;

function limpiar(valor) {
  return typeof valor === 'string' ? valor.trim().slice(0, LARGO_MAX) : '';
}

async function enviarAAirtable(lead) {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tabla = process.env.AIRTABLE_TABLE || 'Leads Landing';
  if (!token || !baseId) {
    throw new Error('Faltan env vars de Airtable (AIRTABLE_TOKEN / AIRTABLE_BASE_ID)');
  }

  // Los nombres de campo tienen que existir EXACTOS en la tabla de Airtable.
  const campos = {
    'Nombre': lead.nombre,
    'Apellido': lead.apellido,
    'Telefono': lead.telefono,
    'Email': lead.email,
    'Zona': lead.zona,
    'Propiedad': lead.propiedad,
    'Tipo': lead.tipo,
    'Perfil': lead.perfil,
    'Ambientes': lead.ambientes,
    'Presupuesto': lead.presupuesto,
    'UTM Source': lead.utm_source,
    'UTM Medium': lead.utm_medium,
    'UTM Campaign': lead.utm_campaign,
    'UTM Term': lead.utm_term,
    'UTM Content': lead.utm_content,
    'FBCLID': lead.fbclid,
    'FBC': lead.fbc,
    'FBP': lead.fbp,
    'Event ID': lead.event_id,
    'Landing URL': lead.landing_url,
    'Referrer': lead.referrer,
    'Landing': lead.landing,
    'Fecha': lead.fecha,
    // Origen de la captura. Con la barrera de persistencia sólo llegan acá filas
    // 'form'; se sigue escribiendo para que el día que haya otro origen
    // persistible quede identificado desde el principio. Columna OPCIONAL —
    // ver COLUMNAS_OPCIONALES abajo: si no existe, la fila se guarda igual.
    'Origen': lead.origen,
    // Modo test: la fila queda marcada PRUEBA para poder filtrarla y borrarla de
    // un saque. No hace falta columna nueva — `typecast:true` crea la opción sola.
    'Estado': lead.test ? 'PRUEBA' : 'Nuevo',
  };
  for (const clave of Object.keys(campos)) {
    if (!campos[clave]) delete campos[clave];
  }

  const respuesta = await postAAirtable(token, baseId, tabla, campos);
  if (respuesta.ok) return;

  // Airtable rebota el registro ENTERO con 422 si mandás una columna que no
  // existe (`typecast` crea opciones de select, NO columnas). Eso ya costó
  // leads: la columna `Propiedad` hubo que crearla a mano antes de deployar las
  // páginas de propiedad. En vez de perder el lead, reintentamos sin las
  // columnas opcionales y dejamos un error bien visible en los logs de Vercel.
  const detalle = await respuesta.text();
  const opcionalesPresentes = COLUMNAS_OPCIONALES.filter((c) => c in campos);
  if (respuesta.status === 422 && opcionalesPresentes.length > 0) {
    console.error(
      `Airtable 422 — reintentando sin columnas opcionales [${opcionalesPresentes.join(', ')}]. ` +
      `Crealas en la tabla para no perder esta metadata. Detalle: ${detalle}`
    );
    for (const c of opcionalesPresentes) delete campos[c];
    const reintento = await postAAirtable(token, baseId, tabla, campos);
    if (!reintento.ok) {
      throw new Error(`Airtable respondió ${reintento.status}: ${await reintento.text()}`);
    }
    return;
  }
  throw new Error(`Airtable respondió ${respuesta.status}: ${detalle}`);
}

/**
 * Columnas que pueden no existir todavía en la tabla del cliente. Si Airtable
 * rebota por una de estas, se reintenta sin ellas: preferimos un lead con menos
 * metadata a un lead perdido. Las obligatorias (Nombre, Telefono, ...) NO van acá.
 */
const COLUMNAS_OPCIONALES = ['Origen'];

function postAAirtable(token, baseId, tabla, campos) {
  return fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tabla)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    // typecast: crea opciones nuevas en selects en vez de rechazar el registro
    body: JSON.stringify({ fields: campos, typecast: true }),
  });
}

const DESTINOS = {
  airtable: enviarAAirtable,
};

// SHA-256 en hex de un valor normalizado (lowercase + trim), como exige Meta.
function hashear(valor) {
  return crypto.createHash('sha256').update(String(valor).trim().toLowerCase()).digest('hex');
}

async function enviarACAPI(lead, req) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) {
    console.warn('META_CAPI_TOKEN no configurado — evento CAPI salteado');
    return false;
  }

  // Guarda dura del modo test: sin test_event_code, un evento marcado como
  // prueba caería igual en el pixel de producción como conversión real — que es
  // exactamente lo que el modo test viene a evitar. Ante la duda, no se manda.
  if (lead.test && !process.env.META_TEST_EVENT_CODE) {
    console.warn('Lead de PRUEBA sin META_TEST_EVENT_CODE — evento CAPI salteado para no contaminar el pixel');
    return false;
  }

  const userData = {};
  if (lead.email) userData.em = [hashear(lead.email)];
  // Teléfono en E.164 sin '+' (solo dígitos), ej: 5491157274477
  if (lead.telefono) userData.ph = [hashear(lead.telefono.replace(/\D/g, ''))];
  if (lead.nombre) userData.fn = [hashear(lead.nombre)];
  if (lead.apellido) userData.ln = [hashear(lead.apellido)];
  if (lead.fbc) userData.fbc = lead.fbc;
  if (lead.fbp) userData.fbp = lead.fbp;

  // IP y user-agent REALES del usuario: el POST a /api/lead viene de su browser.
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (ip) userData.client_ip_address = ip;
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent) userData.client_user_agent = userAgent;

  const evento = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    // Mismo event_id que el fbq('track','Lead') del browser: Meta deduplica el par.
    event_id: lead.event_id,
    action_source: 'website',
    // En páginas de propiedad el content_name distingue por slug (igual que el
    // pixel browser-side); en las landings sigue siendo el nombre de la landing.
    custom_data: {
      content_name: lead.landing === 'propiedad' && lead.propiedad
        ? `propiedad-${lead.propiedad}`
        : lead.landing,
      // Permite separar en Events Manager los Lead del formulario (con teléfono,
      // contactables) de los del botón de WhatsApp (solo atribución). Los dos
      // cuentan como conversión —es lo que queremos que Meta optimice— pero no
      // valen lo mismo y hay que poder medirlos por separado.
      lead_origen: lead.origen,
    },
    user_data: userData,
  };
  if (lead.landing_url) evento.event_source_url = lead.landing_url;

  const payload = { data: [evento] };
  // test_event_code SOLO para leads marcados como prueba, nunca global (jul 2026).
  // Antes bastaba con que la env var existiera para que TODOS los eventos —
  // incluidas las conversiones reales — cayeran en Test Events y dejaran de
  // contar. Con el gate, la variable puede vivir en Production sin riesgo: sin
  // `test:true` en el payload no se aplica. No se toma del body del cliente para
  // que nadie pueda redirigir eventos desde afuera.
  if (lead.test && process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  const respuesta = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  if (!respuesta.ok) {
    throw new Error(`CAPI respondió ${respuesta.status}: ${await respuesta.text()}`);
  }
  return true;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Solo POST' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Body JSON inválido' });
  }

  const lead = {
    nombre: limpiar(body.nombre),
    apellido: limpiar(body.apellido),
    telefono: limpiar(body.telefono),
    email: limpiar(body.email),
    zona: limpiar(body.zona),
    propiedad: limpiar(body.propiedad),
    tipo: limpiar(body.tipo),
    perfil: limpiar(body.perfil),
    ambientes: limpiar(body.ambientes),
    presupuesto: limpiar(body.presupuesto),
    utm_source: limpiar(body.utm_source),
    utm_medium: limpiar(body.utm_medium),
    utm_campaign: limpiar(body.utm_campaign),
    utm_term: limpiar(body.utm_term),
    utm_content: limpiar(body.utm_content),
    fbclid: limpiar(body.fbclid),
    fbc: limpiar(body.fbc),
    fbp: limpiar(body.fbp),
    // event_id: clave de deduplicación pixel ↔ CAPI — debe llegar intacto a Airtable.
    // El submitted_at del cliente NO se persiste a propósito: "Fecha" (server-side,
    // más abajo) es el timestamp canónico y no depende del reloj del dispositivo.
    event_id: limpiar(body.event_id),
    landing_url: limpiar(body.landing_url),
    referrer: limpiar(body.referrer),
    landing: limpiar(body.landing),
    origen: limpiar(body.origen) || 'form',
    fecha: new Date().toISOString(),
    // Flag de prueba. Estricto a propósito (no truthy): un valor accidental que
    // marcara como PRUEBA un lead real nos haría perder una conversión.
    test: body.test === true || body.test === 'true' || body.test === '1',
  };

  if (!ORIGENES_VALIDOS.includes(lead.origen)) {
    lead.origen = 'form';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BARRERA DE PERSISTENCIA (Fase 0.5, ago 2026)
  //
  // Contexto: el botón "Escribime por WhatsApp" de las páginas de propiedad
  // generó 60 filas con Nombre/Teléfono/Email vacíos. NO era un bug —era la
  // atribución del click, pedida y especificada— pero en la práctica ensuciaba
  // la bandeja: filas con `Estado: Nuevo` que no correspondían a nadie
  // contactable, indistinguibles a simple vista de un lead roto.
  //
  // Decisión (Diego, 2 ago 2026): el click NO escribe más en Airtable. La señal
  // de conversión para Meta se conserva —pixel browser + CAPI server-side con el
  // mismo event_id— porque es lo que necesita la campaña para optimizar; lo que
  // se elimina es la fila. Airtable queda reservado para personas contactables.
  //
  // Regla resultante, sin excepciones: NINGUNA fila se crea sin nombre Y
  // teléfono. Es una barrera independiente de quién llame al endpoint: aunque
  // mañana otro camino postee sin datos, no puede ensuciar la base.
  // ──────────────────────────────────────────────────────────────────────────
  const sinDatosDePersona = !lead.nombre || !lead.telefono;

  // El click de WhatsApp: se acepta para poder disparar el CAPI, pero NO
  // persiste. Responde 200 con `persisted:false` para que quede explícito.
  const soloCAPI = lead.origen === 'whatsapp_directo';

  if (sinDatosDePersona && !soloCAPI) {
    // 400 y no 422: para el cliente esto es un request mal formado, no una
    // entidad válida que no se pudo procesar. Nada se escribe, nada se dispara.
    return res.status(400).json({ ok: false, error: 'Faltan nombre o teléfono' });
  }
  // Un click sin nada que atribuir no vale ni siquiera el evento.
  if (soloCAPI && !lead.propiedad && !lead.event_id) {
    return res.status(400).json({ ok: false, error: 'Click sin propiedad ni event_id' });
  }
  if (!TIPOS_VALIDOS.includes(lead.tipo)) {
    lead.tipo = '';
  }
  if (!SLUG_PROPIEDAD.test(lead.propiedad)) {
    lead.propiedad = '';
  }
  if (!LANDINGS_VALIDAS.includes(lead.landing)) {
    lead.landing = '';
  }

  const destino = process.env.LEAD_DESTINATION || 'airtable';
  const enviar = DESTINOS[destino];
  if (!enviar) {
    console.error(`LEAD_DESTINATION desconocido: ${destino}`);
    return res.status(500).json({ ok: false, error: 'Destino mal configurado' });
  }

  // Persistencia y CAPI en paralelo, INDEPENDIENTES: la falla de uno jamás
  // afecta al otro. Se esperan ambos (allSettled) porque en serverless un
  // fire-and-forget real puede morir cuando la función responde.
  //
  // `soloCAPI` (click de WhatsApp) saltea la persistencia: la conversión llega
  // a Meta igual, pero no deja fila. Se resuelve como cumplida para no
  // confundirla con un fallo real de Airtable en la respuesta de abajo.
  const [persistencia, capi] = await Promise.allSettled([
    soloCAPI ? Promise.resolve('skipped') : enviar(lead),
    enviarACAPI(lead, req),
  ]);

  let capiOk = false;
  if (capi.status === 'rejected') {
    // Nunca afecta la respuesta al cliente ni el guardado — solo log.
    console.error('Error enviando evento CAPI:', capi.reason.message);
  } else {
    capiOk = capi.value === true;
  }

  if (soloCAPI) {
    return res.status(200).json({ ok: true, persisted: false, capi: capiOk });
  }

  if (persistencia.status === 'rejected') {
    // El cliente hace fire-and-forget: este error no bloquea al usuario,
    // pero queda en los logs de Vercel para detectar fallas sistemáticas.
    console.error('Error persistiendo lead:', persistencia.reason.message);
    return res.status(502).json({ ok: false, error: 'No se pudo persistir el lead', capi: capiOk });
  }

  return res.status(200).json({ ok: true, capi: capiOk });
};
