# HANDOFF — Sistema de captura y tracking de leads

> **Para quién es esto:** cualquier sesión técnica futura que trabaje en este repo.
> Leé este archivo completo antes de tocar nada. Complementa a `CLAUDE.md` (convenciones
> de código) y `README.md` (estructura + env vars). Última actualización: julio 2026,
> cierre del ciclo Frentes 1–4 + CAPI.

---

## 1. Estado final

**El funnel está completo, vivo y certificado en producción** (auditoría en vivo, jul 2026):

```
Meta Ads → landing (pixel + captura fbclid/UTM)
  → form (validación teléfono AR, zonas canónicas)
  → /api/lead → [ Airtable ∥ Meta CAPI ]   (canales paralelos e independientes)
  → redirect a WhatsApp (mensaje congelado)
  → CRM de Diego vía Evolution → clasificador por IA ✓
```

Verificado de punta a punta: submit real → fila en Airtable con atribución completa →
evento `Lead` browser + server deduplicado por `event_id` → WhatsApp con mensaje exacto →
lead clasificado en el CRM. Apto para tráfico pago (veredicto de auditoría: SÍ).

## 2. Arquitectura — cómo fluye un lead

| Pieza | Qué hace |
|---|---|
| `_tracking.js` | Al cargar: captura `fbclid` + `utm_*` de la URL (last-touch: `localStorage.meta_tracking` si hay fbclid, `sessionStorage.lead_utms` siempre), lee cookies `_fbp`/`_fbc` (sintetiza `fb.1.{ts}.{fbclid}` si falta). Expone `window.GTrack`: `normalizarTelefonoAR` (acepta +54/54/9/0 y el "15" doméstico intercalado), `marcarErrorTelefono` (error inline), `enviarLead` (el orden congelado, ver §3). |
| Forms (`propietarios.html`, `compradores.html`, `index.html` hero tabs) | Handlers inline: arman payload + mensaje congelado y llaman `GTrack.enviarLead`. **Respaldo:** si `_tracking.js` no cargó, redirigen a WhatsApp igual con el mensaje congelado. |
| `api/lead.js` | Vercel Function. Valida (nombre + teléfono → 422 si faltan), y dispara EN PARALELO (`Promise.allSettled`): persistencia (adapter según `LEAD_DESTINATION`) y evento CAPI. `Fecha` y `Estado: Nuevo` server-side. |
| Airtable | Base `appJV4Yzdd6P6g9JU`, tabla `Leads Landing`. Los nombres de columna deben matchear EXACTOS el mapeo de `api/lead.js`. `typecast: true` (opción nueva de select no rechaza el lead). |
| CAPI | `graph.facebook.com/{GRAPH_API_VERSION}/{pixel}/events` — versión como constante comentada al tope de `api/lead.js` (v25.0 al escribir esto). `user_data`: em/ph/fn/ln SHA-256 (lowercase+trim; tel E.164 solo dígitos), fbc/fbp crudos, IP real (`x-forwarded-for`) + user-agent. |
| Tests (`test/*.test.js`, corren en CI) | `tracking.test.js`: guard de reentrada + ciclo submit→pageshow→submit (bfcache). `api-lead.test.js`: validación, mapeo Airtable, hashing CAPI con vectores, independencia de canales en ambas direcciones. `wa-templates.test.js`: contrato de mensajes WA en todas las superficies. |
| Páginas de propiedad (`propiedad.html` + `_propiedad-data.js`) | **Template único por slug** para message match con ads de propiedades específicas: `/propiedad/{slug}` (rewrite en `vercel.json` → `propiedad.html`; el JS lee el slug del pathname y renderiza desde `window.PROPIEDADES`). Propiedad nueva = entrada en `_propiedad-data.js` + fotos, cero HTML. Form embebido con zona precargada (label canónico del archivo de datos) → `GTrack.enviarLead` con `propiedad: slug`, `landing: 'propiedad'`, `contentName: 'propiedad-{slug}'`. Pixel: `PageView` + `ViewProperty {propiedad}` al cargar. **Apagar una propiedad** (vendida/pausada): `activo: false` → su URL redirige client-side a `/compradores` preservando la query (UTMs de ads viejos siguen atribuyendo); slug desconocido, ídem — nunca 404. `/propiedad` sin slug redirige por `vercel.json`. `noindex` (destino de pauta, precios volátiles) y fuera del sitemap. Assets con rutas ABSOLUTAS (la página vive bajo `/propiedad/…`). QA local: `propiedad.html?slug={slug}` (python http.server no aplica el rewrite). |

**Patrón adapter del destino:** `DESTINOS` en `api/lead.js` mapea nombre → función.
Cambiar de Airtable al CRM propio = escribir `enviarACRM(lead)`, registrarla, y cambiar
la env var `LEAD_DESTINATION`. **Las landings no se tocan.**

## 3. Decisiones CONGELADAS — nadie toca esto sin evaluación explícita de Diego

1. **Mensajes de wa.me (contrato con el clasificador IA del CRM), carácter por carácter:**
   - propietarios: `Hola Diego, soy {nombre}, quiero vender en {zona}. Vi tu anuncio.`
   - compradores: `Hola Diego, soy {nombre}, estoy buscando en {zona}. Vi tu anuncio.`
   - `{zona}` SIEMPRE es el label del select (nunca slug). El email NUNCA viaja en el mensaje.
2. **`event_id` (UUID v4, generado en el cliente) es LA clave de dedup**: idéntico en el
   `fbq('track','Lead',...,{eventID})` del browser, en la columna `Event ID` de Airtable
   y en el evento CAPI. Romper esa identidad = conversiones dobles en Meta.
3. **Canales independientes**: persistencia y CAPI via `Promise.allSettled` — la falla de
   uno JAMÁS afecta al otro, y NADA bloquea el redirect a WhatsApp (regla madre del funnel:
   la captura nunca bloquea al usuario).
4. **`Lead` dispara en el submit** (con eventID), nunca "tras envío exitoso" — el pixel no
   espera a la persistencia.
5. **Orden congelado del submit** (`GTrack.enviarLead`): POST `/api/lead` con `keepalive`
   (fire-and-forget) → `fbq Lead` con eventID → redirect a wa.me a ~300ms. El guard de
   reentrada se libera en `pageshow` (bfcache) y a los 5s — hay test en CI que protege
   ese ciclo; no tocar sin correrlo.
6. **Zonas por flujo** (vigente desde jul 2026, reemplaza al set canónico único anterior):
   - **Compradores** (landing + home): "Zona de interés" depende de "¿Qué buscás?" —
     Propiedad o Inversión/Renta → CABA / PBA; Lote / Casa en barrio privado → Canning / Berazategui.
     Implementado como UN select cuyas opciones cambian por perfil (nunca selects required ocultos).
   - **Propietarios** (landing + home): misma lógica condicional que compradores — "Tipo de
     propiedad" (Casa / Departamento / PH / Terreno / Lote-Casa en barrio privado → viaja en
     `Perfil`) determina la zona: Casa/Departamento/PH/Terreno → CABA / PBA;
     Lote-Casa en barrio privado → Canning / Berazategui.
   - Racional: la granularidad fina por propiedad viaja en `utm_content` de los ads, y el
     pueblo exacto sale en la primera conversación de WhatsApp. El vocabulario nuevo de zona
     entra al mensaje congelado (formato intacto) — el clasificador del CRM fue verificado
     contra estas zonas por Diego post-deploy.
7. **Pixel `1609863687137753` activo por defecto** (banner informativo, Ley 25.326, público
   solo Argentina). El ID viejo `1646890566557004` está descartado — no reintroducir ninguno
   de los dos: ni el ID ni `consent revoke`.
8. Email: **opcional** en todos los forms, viaja solo en el payload.
9. **Páginas de propiedad** (`/propiedad/{slug}`): usan el mensaje congelado de compradores
   TAL CUAL, con `{zona}` = label canónico precargado desde `_propiedad-data.js`. La
   propiedad NUNCA viaja en el mensaje de WhatsApp — solo en el payload (`propiedad`),
   en `utm_content` del ad y en el `content_name` del pixel/CAPI (`propiedad-{slug}`).
   El slug se valida server-side (`^[a-z0-9-]{2,30}$`) para que un valor basura no cree
   opciones fantasma en el single select `Propiedad` de Airtable (el POST va con typecast).

## 4. Env vars (en Vercel — nunca valores en el repo)

| Variable | Entorno | Función |
|---|---|---|
| `AIRTABLE_TOKEN` | Prod + Preview | PAT con `data.records:write` sobre la base de leads |
| `AIRTABLE_BASE_ID` | Prod + Preview | `appJV4Yzdd6P6g9JU` |
| `AIRTABLE_TABLE` | (opcional) | Default `Leads Landing` |
| `LEAD_DESTINATION` | (opcional) | Adapter de persistencia activo (default `airtable`) |
| `META_CAPI_TOKEN` | Prod + Preview | Access token de la Conversions API (Events Manager) |
| `META_TEST_EVENT_CODE` | **SOLO Preview** | Manda los eventos CAPI a Test Events. Si aparece en Production es un bug de configuración: las conversiones reales dejarían de contar |

Además (no es env var): **Protection Bypass for Automation** en Deployment Protection —
necesario para testear previews con curl/browser (`x-vercel-protection-bypass` en header
o query param). Pedírselo a Diego.

## 5. Historial de frentes (PRs #1–#7, todos mergeados)

| PR | Qué hizo |
|---|---|
| #1 | Infra de trabajo: `.gitignore`, CI mínimo (html-validate + check REPLACE), protección de main (require PR, no force push) |
| #2 | Frente 1A: Vercel Function `/api/lead` → Airtable, destino swappeable por env var |
| #3 | Frente 1B: pixel nuevo en las 14 páginas (sin consent revoke), `_tracking.js` (UTMs/fbclid/fbp/fbc/event_id), forms unificados (zonas canónicas, teléfono AR, mensajes congelados, email opcional), CI REPLACE bloqueante |
| #4 | Hotfix: guard de reentrada quedaba clavado tras volver de WhatsApp (bfcache) — liberación en `pageshow` + 5s, con test de regresión en CI |
| #5 | Frente 4 (performance): fotoperfil a WebP (-99.5%), purga del DOM legacy oculto (-53%/-42% de peso), preconnect en compradores. Copy rescatado en `_legacy-copy.md` |
| #6 | Fix: hamburguesa de nav visible en mobile en las landings |
| #7 | CAPI: evento `Lead` server-side con dedup por `event_id`, canales independientes, tests en CI |

## 6. Pendientes

| Qué | Estado |
|---|---|
| **GA4** | Esperando Measurement ID (lo crea Diego). Bloques comentados listos en los `<head>` — pegar el ID y descomentar. Sin consent gating (decisión tomada) |
| **Páginas de propiedad — bloqueantes pre-deploy** | (a) Diego crea a mano en Airtable la columna `Propiedad` (single select: `terralagos`, `mag299`, `gaboto`) + opción `propiedad` en el select `Landing` — sin la columna, Airtable devuelve 422 y la fila se pierde; (b) fotos reales reemplazan los placeholders en `_propiedad-data.js` (el PR no se mergea sin fotos); (c) QA en iPhone vía webview IG (regla §7.9) |
| **CRM propio como destino** (endpoint `/api/leads/web` del CRM) | **BLOQUEADO hasta cerrar R1 del CRM** (prerequisito de seguridad). Cuando destrabe: adapter nuevo en `api/lead.js` + `LEAD_DESTINATION` — sin tocar landings |
| **CAPI offline / eventos adicionales** (compra cerrada, calificación) | Futuro, post-campañas. La base (Event ID en Airtable) ya lo soporta |
| **CI actual** (workflow `validate`) | html-validate (sintaxis) + `test/tracking.test.js` + `test/api-lead.test.js` + check REPLACE — todos bloqueantes. Cualquier feature nueva de tracking suma su test acá |
| **Versionado de `_premium.js/css` en deploys** | Backlog (decisión jul 2026): el cache de 300s puede servir JS viejo hasta 5 min post-deploy. Riesgo bajo; se resuelve con query de versión en los links cuando se justifique el tooling |

## 7. Reglas de trabajo del proyecto (innegociables)

1. **Spec liviana antes de código** — un párrafo: qué se construye, cómo se ve terminado, qué NO incluye. Diego da el OK, después se codea.
2. **Rama + PR siempre; nunca push directo a main** (está protegido). **El merge lo hace Diego.**
3. **CI verde antes de sugerir merge**; preview de Vercel verificado, y Diego valida visualmente (desktop Y mobile) antes de mergear.
4. **Test del funnel completo** obligatorio si un cambio lo toca: form → dato persistido → redirect con mensaje correcto (y desde el hotfix #4: incluido el volver-atrás-y-reintentar).
5. **Un frente a la vez**, priorizado por impacto en conversión.
6. **Una sola sesión de trabajo** — no abrir sesiones/worktrees paralelos sin OK explícito de Diego.
7. Comunicación en rioplatense, directo, sin teoría.
8. Todo lead de prueba se marca con apellido `(borrar)` — Diego los limpia de Airtable.
9. **Todo cambio que toque los formularios se verifica en iPhone real + Android real
   (idealmente vía webview de Instagram) antes del merge.** El QA de emulador no alcanza
   para bugs de repintado de selects nativos, pickers y webviews — lección aprendida: el
   bug del transform residual de `fadeInUp` que dejaba el select mostrando el placeholder
   en iOS solo era visible en dispositivo real (fix en `fixSelectRepaintIOS`, `_premium.js`).
   El tráfico pago entra casi todo por el webview de IG/FB: ese es el entorno que manda.
