// /api/lead — recibe leads de las landings y los persiste en el destino configurado.
//
// El destino se elige con la env var LEAD_DESTINATION (default: "airtable").
// Para enchufar el CRM propio (post-R1): agregar una función destino acá abajo,
// registrarla en DESTINOS y cambiar la env var. Las landings no se tocan.
//
// Env vars (se cargan en Vercel, nunca en el repo):
//   LEAD_DESTINATION  destino activo (default "airtable")
//   AIRTABLE_TOKEN    PAT con data.records:write sobre la base de leads
//   AIRTABLE_BASE_ID  id de la base (app...)
//   AIRTABLE_TABLE    nombre de la tabla (default "Leads Landing")

const LARGO_MAX = 500;

const TIPOS_VALIDOS = ['propietario', 'comprador'];
const LANDINGS_VALIDAS = ['propietarios', 'compradores', 'home'];

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
    'Estado': 'Nuevo',
  };
  for (const clave of Object.keys(campos)) {
    if (!campos[clave]) delete campos[clave];
  }

  const respuesta = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tabla)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // typecast: crea opciones nuevas en selects en vez de rechazar el registro
      body: JSON.stringify({ fields: campos, typecast: true }),
    }
  );
  if (!respuesta.ok) {
    throw new Error(`Airtable respondió ${respuesta.status}: ${await respuesta.text()}`);
  }
}

const DESTINOS = {
  airtable: enviarAAirtable,
};

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
    fecha: new Date().toISOString(),
  };

  if (!lead.nombre || !lead.telefono) {
    return res.status(422).json({ ok: false, error: 'Faltan nombre o teléfono' });
  }
  if (!TIPOS_VALIDOS.includes(lead.tipo)) {
    lead.tipo = '';
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

  try {
    await enviar(lead);
    return res.status(200).json({ ok: true });
  } catch (error) {
    // El cliente hace fire-and-forget: este error no bloquea al usuario,
    // pero queda en los logs de Vercel para detectar fallas sistemáticas.
    console.error('Error persistiendo lead:', error.message);
    return res.status(502).json({ ok: false, error: 'No se pudo persistir el lead' });
  }
};
