# Roadmap de configuración — Sitio + GHL + Stack de growth
**Diego Giannini · Coldwell Banker**
**Fecha:** 28 abril 2026
**Estado actual:** Sitio con copy y formularios listos; tracking, GHL, hosting y assets reales pendientes.

---

## Cómo leer este documento

Está ordenado por **dependencias**, no por importancia. Hay cosas que sí o sí van primero (dominio, GHL setup) porque otras dependen de ellas. Cada tarea tiene:
- **⏱ Tiempo estimado**
- **🎯 Para qué sirve**
- **✅ Cómo saber que está hecho**

El **VSL queda al final**, como pediste — todo lo demás corre antes.

---

## FASE 0 — Decisiones e infraestructura (1-2 días)

### 0.1 Registrar el dominio
- ⏱ 15 min
- 🎯 Hoy todo el sitio asume `gianninirealestate.com`. Si vas a usar otro, hay que cambiar `canonical`, `og:url` y `sitemap.xml` antes de indexar.
- ✅ Dominio comprado en Namecheap / GoDaddy / Cloudflare ($12-15/año).

### 0.2 Elegir hosting
- ⏱ 30 min
- 🎯 Vercel y Netlify son gratis y se conectan al dominio en 5 minutos. Vercel es mi sugerencia: deploy con un comando, SSL automático, edge cache.
- ✅ Sitio levantado en `gianninirealestate.com` con HTTPS funcionando.

### 0.3 Cuenta GHL activa
- ⏱ Ya está
- 🎯 Verificar plan: para WhatsApp Business + email + SMS + landings + calendar necesitás como mínimo **GHL Pro / Agency Pro** (o el equivalente actual). Si lo tenés en Starter, vamos a chocar contra límites.
- ✅ Confirmar: ¿es plan Agency, Sub-account propio, white-label?

---

## FASE 1 — GHL: estructura base (medio día)

### 1.1 Crear sub-account / location
- ⏱ 10 min
- 🎯 Una location por línea de negocio. Para vos: "Diego Giannini Real Estate" (única).
- ✅ Sub-account creado, vos como admin, time zone Argentina/Buenos Aires.

### 1.2 Custom Fields del contacto
Hay que crear estos campos para que matcheen lo que pide el formulario del sitio. Si los nombres difieren, los workflows fallan en silencio.

| Campo | Tipo | Valores |
|---|---|---|
| `intencion` | Dropdown | vender / comprar / invertir |
| `zona` | Dropdown | palermo, recoleta, belgrano, puerto-madero, caba-otro, canning, berazategui, nordelta, gba-norte, gba-sur, otra |
| `presupuesto_usd` | Dropdown | <100k, 100-200k, 200-350k, 350-600k, 600k+ |
| `ticket_inversion_usd` | Dropdown | 50-150k, 150-300k, 300-600k, 600k+ |
| `objetivo_inversion` | Dropdown | renta, plusvalia, pozo, lotes, no-se |
| `propiedad_zona` | Dropdown | mismas que zona (para vendedores) |
| `fuente_lead` | Single line | home_miniform / propietarios_form / compradores_form / referidos / wa_directo |
| `tipo_de_consulta` | Dropdown | tasacion / compra / inversion / alquiler / referido |

- ⏱ 30 min
- ✅ Los 8 custom fields creados en Settings → Custom Fields.

### 1.3 Pipelines
Tres pipelines (no uno solo) — cada flujo de ventas tiene etapas distintas.

**Pipeline "Vendedores"**
1. Lead nuevo → 2. Contactado → 3. Tasación agendada → 4. Tasación realizada → 5. Listing firmado → 6. En venta → 7. Vendido → 8. Cerrado / perdido

**Pipeline "Compradores"**
1. Lead nuevo → 2. Calificado → 3. Visitas activas → 4. Oferta presentada → 5. Reserva firmada → 6. Boleto → 7. Escritura → 8. Cerrado / perdido

**Pipeline "Inversores"**
1. Lead nuevo → 2. Calificado → 3. Análisis enviado → 4. Visitas / propuesta → 5. Reserva → 6. Cerrado / perdido

- ⏱ 45 min
- ✅ Tres pipelines visibles en Opportunities con sus etapas.

### 1.4 Tags
Sistema de etiquetas para segmentar campañas y reportar:
- Por intención: `tag-vender`, `tag-comprar`, `tag-invertir`, `tag-alquiler`
- Por zona: `zona-palermo`, `zona-recoleta`, `zona-belgrano`, etc.
- Por temperatura: `lead-frio`, `lead-tibio`, `lead-caliente`
- Por canal de origen: `src-home-miniform`, `src-propietarios`, `src-compradores`, `src-referidos`, `src-wa-directo`, `src-meta-ads`, `src-google-ads`

- ⏱ 20 min
- ✅ Tags creadas en Settings → Tags.

---

## FASE 2 — GHL: conectar los formularios del sitio (1-2 horas)

Hoy los 3 formularios mandan al WhatsApp de Diego con un mensaje pre-armado. Eso funciona pero **no captura el lead en GHL** — no entra al pipeline ni al CRM. Hay que cambiar la lógica.

### Opción A (recomendada) — Webhook + WhatsApp paralelo
Cada submit hace 2 cosas: (1) POST a un webhook de GHL que crea el contacto y dispara workflows, y (2) abre WhatsApp como hace hoy (para quien quiere chatear ya).

**Pasos:**
1. En GHL: **Workflows → New Workflow → Webhook trigger** → copiar la URL del webhook.
2. En el HTML, modificar las funciones `handleHomeMiniForm`, `handleFormSubmit` para hacer un `fetch()` POST al webhook **antes** del `window.open()` del WhatsApp.
3. El webhook recibe `nombre`, `whatsapp`, `email`, `intencion`, `zona`, `presupuesto`, `fuente_lead`.
4. El workflow: crea/actualiza contacto, asigna pipeline correspondiente, suma tags, manda email de bienvenida y notificación a Diego.

- ⏱ 1 h por las 3 páginas
- ✅ Test: enviar form de prueba → aparece contacto nuevo en GHL en menos de 5 segundos con todos los campos.

### Opción B — Embed nativo de GHL
Reemplazar los formularios HTML por iframes de forms de GHL. Más rápido de hacer (5 min por form), pero perdés el diseño actual y la UX se siente "plantilla".

**Sugerencia:** Opción A. Mantenés el diseño premium y capturás todo en GHL.

### 2.1 Configurar Formspree como fallback
Mientras tanto el `<form action="https://formspree.io/f/REPLACE_WITH_YOUR_ID">` sigue como fallback HTML por si el JS falla. Crear 2 endpoints reales en formspree.io y reemplazar los placeholders.
- ⏱ 15 min
- ✅ Submit de form sin JS → llega email a tu inbox.

---

## FASE 3 — GHL: workflows / automatizaciones (1 día)

### 3.1 Workflow "Lead nuevo — Vendedor"
**Trigger:** webhook con `intencion = vender` O tag `tag-vender`.
1. **Inmediato:** SMS/WhatsApp a Diego: "Nuevo lead vendedor: {nombre} ({whatsapp}) — zona {propiedad_zona}"
2. **Inmediato:** Email de bienvenida al lead con link al calendario para agendar tasación.
3. **+15 min:** Si no agendó → mensaje de WhatsApp templado.
4. **+24 hs:** Email 1 de la sequence "vendedores" (de tu docx).
5. **+72 hs sin agendar:** Diego recibe recordatorio para llamar.
6. **+7 días:** Email 2 de la sequence.
7. **+14 días:** Email 3.
8. ... así hasta el email 6 a los 30 días.
9. Si en algún punto agenda tasación → mover a etapa "Tasación agendada" del pipeline y stop sequence.

### 3.2 Workflow "Lead nuevo — Comprador / Inversor"
Misma lógica con la sequence de compradores.

### 3.3 Workflow "No-show de tasación"
Si la tasación estaba agendada y no llegó: WhatsApp + email de re-agenda automática.

### 3.4 Workflow "Re-engagement 30/60/90 días"
Para leads que enfriaron sin cerrar: 3 toques espaciados con casos de éxito y oportunidades nuevas.

### 3.5 Workflow "Referidos"
Para alguien que ingresa por la página `/referidos.html`: confirma USD 500, manda términos, notifica a Diego.

- ⏱ 1 día completo si los emails/SMS los pegás de los docx que ya tenés
- ✅ Test end-to-end: simular un lead de cada tipo y verificar que llegan los mensajes en los tiempos correctos.

---

## FASE 4 — GHL: WhatsApp Business API (medio día)

Sin esto el WhatsApp sigue siendo manual / no se loguea en GHL.

### 4.1 Conectar 360dialog (o el provider que GHL ofrezca activo en Argentina)
- ⏱ 2 días de espera de aprobación de Meta + 1 hora de setup
- 🎯 Tener WhatsApp Business API → todo el chat queda dentro de GHL (Conversations), se puede automatizar mensajes de plantilla y two-way con leads.
- 💰 USD 49/mes promedio (360dialog) + costos de mensaje según país

### 4.2 Templates de WhatsApp aprobados
Meta exige aprobar plantillas de mensajes salientes. Mínimo viable:
- Plantilla 1: "Bienvenida — agendar tasación"
- Plantilla 2: "Recordatorio — visita programada"
- Plantilla 3: "Follow-up — no respuesta 48h"
- Plantilla 4: "Cierre suave — propiedad nueva en tu zona"

- ⏱ 2-5 días por la review de Meta
- ✅ Templates aprobados en Meta Business Manager.

---

## FASE 5 — GHL: Calendar (1 hora)

Hoy "agendar tasación" es manual. Con GHL Calendar es self-service.

1. **Crear calendar "Tasación gratuita propietarios"** (45 min, slots Lun-Vie 9-18hs, máx 4 por semana → coincide con el badge "4 cupos esta semana" del hero).
2. **Crear calendar "Visita propiedad / consulta inversión"** (30 min).
3. **Conectar tu Google Calendar** para que no duplique reservas.
4. **Email/SMS automático de confirmación** + recordatorio 24hs antes y 1h antes.
5. **Pegar el link en el sitio:** botón "Agendar tasación" en `propietarios-new.html` apunta al calendar URL.

- ⏱ 1 h
- ✅ Cliente reserva → te aparece en Google Calendar y en GHL con todos los datos.

---

## FASE 6 — Tracking real (30 min, alta prioridad)

### 6.1 GA4
1. Crear propiedad GA4 en analytics.google.com → copiar Measurement ID (`G-XXXXXXXXXX`).
2. En `index.html`, `propietarios-new.html`, `compradores-new.html`: reemplazar `G-XXXXXXXXXX` por el real **y descomentar** el bloque (líneas 71-79).
3. Configurar eventos de conversión: `lead_home_miniform`, `lead_propietarios`, `lead_compradores`, `whatsapp_click`.

### 6.2 Meta Pixel
1. Crear pixel en business.facebook.com → copiar Pixel ID.
2. Reemplazar `000000000000000` y descomentar (líneas 81-87 de cada landing).
3. Verificar que dispara eventos `Lead` y `PageView` con el debugger de Meta (Chrome extension).

### 6.3 Google Tag Manager (opcional pero recomendado)
Si vas a sumar más tracking en el futuro (LinkedIn Insight, TikTok Pixel, etc.), GTM evita tocar el HTML cada vez.

- ⏱ 30 min los tres
- ✅ Realtime de GA4 muestra visitas en vivo. Pixel Helper de Chrome confirma fire del Meta Pixel.

---

## FASE 7 — Visibilidad orgánica (1 día)

### 7.1 Google Search Console
1. Verificar dominio (DNS o HTML tag).
2. Subir `sitemap.xml`.
3. Pedir indexación manual de las páginas principales.

### 7.2 Google Business Profile
1. Crear ficha en business.google.com.
2. Completar dirección, horario, fotos, link al sitio, WhatsApp.
3. Pedir las primeras 5-10 reviews a clientes históricos (clave para ranking local).

### 7.3 Bing Webmaster
- Mismo flujo, importa el de Google. 5 min.

- ⏱ 1 día parcial
- ✅ Sitio visible al buscar "Diego Giannini Coldwell Banker" en Google + ficha de Maps live.

---

## FASE 8 — Assets visuales que faltan (1-2 días)

| Asset | Para qué | Sugerencia |
|---|---|---|
| **Foto profesional tuya** | Sección "Sobre Diego" del home (slot ya preparado) | Vertical 4:5 (1200×1500 px), fondo de oficina/ciudad, mirada a cámara. Guardarla como `diego-giannini.jpg` en la raíz del sitio. |
| **3 OG images 1200×630** | Preview en WhatsApp/Twitter/LinkedIn | `og-image.jpg` (home), `og-propietarios.jpg`, `og-compradores.jpg`. Canva en 30 min. |
| **5+ fotos reales de propiedades** | Página `/propiedades` y home | Idealmente shoots profesionales de tus listings activos. |
| **3-4 testimonios en video 9:16** | Sección de testimonios del home | 60-90 seg cada uno. Clientes hablando a cámara. |
| **VSL (último, como pediste)** | `propietarios-new.html` y `compradores-new.html` | Guion ya está en `VSL-Guiones-Diego-Giannini.docx`. La sección VSL ya está oculta hasta que tengas el video. |

---

## FASE 9 — Lanzamiento (medio día)

### 9.1 QA pre-launch
- Probar **los 3 formularios** end-to-end → llegan a GHL con todos los campos.
- Probar **WhatsApp button** → abre con número correcto y mensaje correcto.
- Probar **calendar booking** → agenda en Google Calendar y manda confirmaciones.
- Probar **mobile** en iPhone real y Android real (no solo Chrome DevTools).
- **Lighthouse audit** → todos los scores >85.
- **Accesibilidad:** navegación con teclado, contraste, alt text en imágenes.

### 9.2 Switch DNS al sitio nuevo
Si tenés un sitio viejo en `gianninirealestate.com.ar`, configurar redirect 301 al nuevo.

### 9.3 Anuncios primer mes
- **Meta Ads:** 2 campañas (lookalike de visitantes a propietarios + retargeting de visitantes web 30 días). Budget USD 200-300/mes para arrancar.
- **Google Ads:** keywords "vender departamento Palermo", "tasación Recoleta", "broker Coldwell Banker Buenos Aires". Budget USD 150-200/mes.
- **Instagram orgánico:** 3 posts/semana con casos cerrados, market updates, behind-the-scenes.

---

## Resumen ejecutivo — Orden recomendado

| Semana | Foco |
|---|---|
| **1** | Dominio + hosting + GA4/Meta Pixel reales + slot de foto subido |
| **2** | GHL fase 1-3 (estructura, custom fields, pipelines, workflows básicos) |
| **3** | GHL fase 4 (WhatsApp API) + Calendar + conectar formularios |
| **4** | OG images, Search Console, Google Business, primeras campañas |
| **5+** | Fotos de propiedades, testimonios video |
| **Última** | **VSL** (cuando todo el resto convierta y quieras subir un nivel más) |

---

## Decisiones que necesito de vos para avanzar

1. **¿Plan de GHL?** (Starter / Pro / Agency / White-label) — define qué módulos están disponibles.
2. **Dominio final.** ¿`gianninirealestate.com` o `.com.ar`? Si tenés uno viejo, también.
3. **Hosting preferido.** Vercel / Netlify / Cloudflare Pages / otro.
4. **¿Tenés foto profesional ya o hay que organizar shoot?** El slot está listo; cuando me pasés `diego-giannini.jpg` la activo.
5. **¿Calendly ya configurado, o usamos el Calendar nativo de GHL?**
6. **WhatsApp Business API:** ¿ya tenés cuenta business verificada o arrancamos de cero con 360dialog?

Cuando me confirmes 1-3 y 6 puedo guiar la configuración paso a paso.
