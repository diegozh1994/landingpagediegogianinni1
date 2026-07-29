// _tracking.js — atribución Meta (fbclid/UTM/fbp/fbc) y envío de leads.
// Se carga con defer en el <head> de las páginas con formulario y expone window.GTrack.
//
// Orden congelado del submit (no cambiar sin avisar a Diego):
//   1) POST /api/lead con keepalive (fire-and-forget: la captura NUNCA bloquea)
//   2) fbq Lead con eventID (dedup con CAPI server-side vía Event ID en Airtable)
//   3) redirect a wa.me a los ~300ms (deja despachar al pixel)
//
// MODO TEST (`?test=1`) — jul 2026, tras el incidente de los 7 leads fantasma:
// un QA nocturno generó 7 conversiones reales atribuidas a un anuncio activo.
// Con el flag, el submit ejercita el pipeline entero SIN contaminar nada:
//   - NO dispara `fbq Lead` (ni `generate_lead` de GA4): cero conversiones.
//   - NO redirige a wa.me: cero chats nuevos, cero ruido en el CRM.
//   - Manda `test:true` en el payload → el server usa test_event_code en ESE
//     request y marca la fila de Airtable como PRUEBA.
// Los eventos de embudo (FormView/FormStart) siguen intactos: son custom, no
// conversiones, y no afectan atribución.
(function () {
  'use strict';

  var META_KEY = 'meta_tracking';
  var UTM_KEY = 'lead_utms';
  var UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var WHATSAPP_DIEGO = '5491157274477';

  // El flag se lee del querystring en CADA pageload y NUNCA se persiste (no entra
  // a persistir() ni a UTM_PARAMS). Es deliberado: si sobreviviera en
  // sessionStorage, un submit real posterior en la misma sesión saldría marcado
  // como prueba — el bug inverso, y peor, porque perderíamos una conversión real.
  function leerModoTest() {
    try {
      return new URLSearchParams(window.location.search).get('test') === '1';
    } catch (e) {
      return false;
    }
  }
  var MODO_TEST = leerModoTest();

  function leerParamsURL() {
    var params = new URLSearchParams(window.location.search);
    var data = {};
    UTM_PARAMS.forEach(function (k) {
      var v = params.get(k);
      if (v) data[k] = v;
    });
    var fbclid = params.get('fbclid');
    if (fbclid) data.fbclid = fbclid;
    return data;
  }

  function leerCookie(nombre) {
    var m = document.cookie.match('(^|;)\\s*' + nombre + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m[2]) : '';
  }

  // Last-touch: con fbclid pisa lo anterior en localStorage (persiste entre visitas);
  // los UTM solos viven en sessionStorage (sobreviven la navegación interna).
  function persistir(data) {
    try {
      if (data.fbclid) {
        var conTs = {};
        for (var k in data) conTs[k] = data[k];
        conTs.ts = Date.now();
        localStorage.setItem(META_KEY, JSON.stringify(conTs));
      }
      if (Object.keys(data).length) {
        sessionStorage.setItem(UTM_KEY, JSON.stringify(data));
      }
    } catch (e) { /* storage bloqueado (navegación privada) — el lead viaja igual */ }
  }

  function recuperar() {
    var out = {};
    try {
      var meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
      var sesion = JSON.parse(sessionStorage.getItem(UTM_KEY) || '{}');
      var k;
      for (k in meta) out[k] = meta[k];
      for (k in sesion) out[k] = sesion[k];
    } catch (e) { /* JSON corrupto: se ignora */ }
    delete out.ts;
    return out;
  }

  var paramsActuales = leerParamsURL();
  persistir(paramsActuales);

  function datosTracking() {
    var data = recuperar();
    for (var k in paramsActuales) data[k] = paramsActuales[k];

    var fbp = leerCookie('_fbp');
    var fbc = leerCookie('_fbc');
    if (!fbc && data.fbclid) {
      fbc = 'fb.1.' + Date.now() + '.' + data.fbclid;
    }
    if (fbp) data.fbp = fbp;
    if (fbc) data.fbc = fbc;

    data.landing_url = window.location.href.split('#')[0];
    data.referrer = document.referrer || '';
    return data;
  }

  function eventId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // Teléfono argentino, formato flexible: acepta +54 / 54 / 9 / 0 iniciales y
  // el "15" doméstico intercalado tras el código de área (ej. 011 15-5555-4444).
  // Devuelve +549XXXXXXXXXX o null si no valida.
  function normalizarTelefonoAR(valor) {
    var limpio = String(valor || '').replace(/\D/g, '');
    if (limpio.slice(0, 2) === '54') limpio = limpio.slice(2);
    if (limpio.charAt(0) === '9' && limpio.length > 10) limpio = limpio.slice(1);
    if (limpio.charAt(0) === '0') limpio = limpio.slice(1);
    // "15" después del código de área (2 a 4 dígitos): se quita
    if (limpio.length === 12) {
      for (var i = 2; i <= 4; i++) {
        if (limpio.slice(i, i + 2) === '15') {
          limpio = limpio.slice(0, i) + limpio.slice(i + 2);
          break;
        }
      }
    }
    // 10 dígitos exactos; "15" o "0" al inicio no son códigos de área válidos
    if (limpio.length !== 10 || limpio.charAt(0) === '0' || limpio.slice(0, 2) === '15') return null;
    return '+549' + limpio;
  }

  function marcarErrorTelefono(input) {
    input.style.borderColor = '#FF5A5A';
    var aviso = input.parentElement.querySelector('.tel-error');
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.className = 'tel-error';
      aviso.style.cssText = 'color:#FF5A5A;font-size:12px;margin-top:6px;font-family:Inter,sans-serif;';
      input.parentElement.appendChild(aviso);
      input.addEventListener('input', function () {
        input.style.borderColor = '';
        aviso.style.display = 'none';
      });
    }
    aviso.textContent = 'Revisá el número — ej: +54 9 11 5555-4444';
    aviso.style.display = 'block';
    input.focus();
  }

  // Guard de reentrada: un doble tap en la ventana previa al redirect generaría
  // dos filas en Airtable y dos Lead con eventID distinto (la dedup no los colapsa).
  // OJO: el candado se libera en cada pageshow (abajo) y a los 5s — sin eso, volver
  // desde WhatsApp con el botón atrás (bfcache) dejaba el form muerto para siempre.
  var enviando = false;

  window.addEventListener('pageshow', function () { enviando = false; });

  function enviarLead(opciones) {
    if (enviando) return;
    enviando = true;
    // Auto-recuperación: si el redirect no llega a navegar, el form vuelve a operar
    setTimeout(function () { enviando = false; }, 5000);
    var lead = {};
    var k;
    for (k in opciones.payload) lead[k] = opciones.payload[k];
    var tracking = datosTracking();
    for (k in tracking) lead[k] = tracking[k];
    lead.event_id = eventId();
    lead.submitted_at = new Date().toISOString();
    if (MODO_TEST) lead.test = true;

    try {
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
        keepalive: true
      }).catch(function () {});
    } catch (e) { /* la captura nunca bloquea al usuario */ }

    // Conversiones: en modo test NO se disparan. `fbq` no acepta test_event_code
    // como parámetro (el Test Events tool captura por sesión de navegador, no por
    // argumento), así que la única forma confiable de no ensuciar la atribución es
    // no emitir el evento. La cobertura en Test Events la da el CAPI server-side,
    // que sí lo acepta por request.
    if (window.fbq && !MODO_TEST) {
      fbq('track', 'Lead', { content_name: opciones.contentName }, { eventID: lead.event_id });
    }
    if (window.gtag && !MODO_TEST) {
      gtag('event', 'generate_lead', { form: opciones.contentName, zona: lead.zona || '' });
    }

    if (MODO_TEST) {
      mostrarPanelTest(lead, opciones);
      return;
    }

    setTimeout(function () {
      window.location.href = 'https://wa.me/' + WHATSAPP_DIEGO + '?text=' + encodeURIComponent(opciones.mensajeWA);
    }, 300);
  }

  // Panel de verificación del modo test. Reemplaza al redirect: muestra en
  // pantalla lo que se habría mandado (mensaje WA textual + event_id + payload)
  // para poder chequear el mensaje congelado y la atribución sin abrir WhatsApp.
  function mostrarPanelTest(lead, opciones) {
    var previo = document.getElementById('gtrack-test-panel');
    if (previo) previo.remove();

    var panel = document.createElement('div');
    panel.id = 'gtrack-test-panel';
    panel.setAttribute('role', 'status');
    panel.style.cssText = 'position:fixed;inset:auto 12px 12px 12px;z-index:99999;max-height:70vh;overflow:auto;' +
      'background:#0A0E1F;border:2px solid #32E5A7;border-radius:12px;padding:16px;' +
      'font-family:Inter,system-ui,sans-serif;font-size:13px;color:#fff;box-shadow:0 8px 40px rgba(0,0,0,.5);';

    var titulo = document.createElement('div');
    titulo.style.cssText = 'font-weight:600;color:#32E5A7;margin-bottom:10px;font-size:14px;';
    titulo.textContent = 'MODO TEST — no se disparó Lead ni se abrió WhatsApp';
    panel.appendChild(titulo);

    function fila(rotulo, valor) {
      var d = document.createElement('div');
      d.style.cssText = 'margin-bottom:8px;line-height:1.45;word-break:break-word;';
      var b = document.createElement('strong');
      b.style.cssText = 'color:#4D8AFF;display:block;font-size:11px;text-transform:uppercase;letter-spacing:.04em;';
      b.textContent = rotulo;
      d.appendChild(b);
      // textContent en vez de innerHTML: el contenido viene del form del usuario.
      d.appendChild(document.createTextNode(valor));
      panel.appendChild(d);
    }

    fila('Mensaje WhatsApp (no enviado)', opciones.mensajeWA);
    fila('Event ID', lead.event_id);
    fila('Landing', lead.landing || '(vacío)');
    fila('fbc / fbp', (lead.fbc || '—') + ' / ' + (lead.fbp || '—'));
    fila('Payload completo', JSON.stringify(lead));

    var cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.textContent = 'Cerrar';
    cerrar.style.cssText = 'margin-top:6px;background:#1F69FF;color:#fff;border:0;border-radius:8px;' +
      'padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;';
    cerrar.addEventListener('click', function () {
      panel.remove();
      enviando = false; // permite repetir el QA sin recargar la página
    });
    panel.appendChild(cerrar);

    document.body.appendChild(panel);
  }

  // Embudo por escalón (jul 2026): con PageView → FormView → FormStart → Lead
  // se ve en Events Manager dónde fuga cada página, sin herramienta nueva.
  // ADITIVO PURO: no toca enviarLead, ni el contrato del Lead, ni el mensaje WA.
  //   FormView  — el form entró al viewport (≥25%), una vez por pageload.
  //   FormStart — primer foco en un control del form, una vez por pageload.
  function instrumentarForm(form, params) {
    if (!form) return;
    var visto = false;
    var iniciado = false;
    function disparar(nombre) {
      if (window.fbq) fbq('trackCustom', nombre, params || {});
    }
    if (window.IntersectionObserver) {
      var obs = new IntersectionObserver(function (entradas) {
        for (var i = 0; i < entradas.length; i++) {
          if (entradas[i].isIntersecting && !visto) {
            visto = true;
            disparar('FormView');
            obs.disconnect();
          }
        }
      }, { threshold: 0.25 });
      obs.observe(form);
    }
    form.addEventListener('focusin', function () {
      if (iniciado) return;
      iniciado = true;
      disparar('FormStart');
    });
  }

  window.GTrack = {
    datosTracking: datosTracking,
    eventId: eventId,
    normalizarTelefonoAR: normalizarTelefonoAR,
    marcarErrorTelefono: marcarErrorTelefono,
    enviarLead: enviarLead,
    instrumentarForm: instrumentarForm,
    // Solo lectura, para los tests y para poder verificarlo desde la consola.
    modoTest: MODO_TEST
  };
})();
