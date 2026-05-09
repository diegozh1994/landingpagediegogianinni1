# Sitio web Diego Giannini · Coldwell Banker

Sitio web personal de **Diego Giannini**, broker en Coldwell Banker Livello (Buenos Aires). Sitio estático en HTML/CSS/JS, deploy en Vercel.

## Objetivo del proyecto

Generar leads inmobiliarios vía dos landings principales:
- `/propietarios` — captura de vendedores (servicio de venta con tasación gratuita)
- `/compradores` — captura de compradores e inversores (acceso a propiedades off-market)

El tráfico se va a originar principalmente desde **Meta Ads** (paid). El home también recibe tráfico orgánico/directo.

## Stack y deploy

- **Tipo:** Sitio estático (HTML/CSS/JS) — no hay framework ni build step.
- **Deploy:** Vercel con `cleanUrls: true` y `trailingSlash: false` (configurado en `vercel.json`).
  - URLs limpias por convención: `/propietarios`, `/compradores` (no `.html`).
  - Cualquier link interno debe usar la URL limpia.
- **Dominio:** `gianninirealestate.com.ar`

## Estructura de archivos importantes

| Archivo | Función |
|---|---|
| `index.html` | Home — hero + propuesta de valor + miniform + servicios |
| `propietarios.html` | Landing de captura para vendedores |
| `compradores.html` | Landing de captura para compradores/inversores |
| `propiedades.html` | Catálogo de propiedades (off-market) |
| `propiedades.json` | Data del catálogo (consumida por `_properties.js`) |
| `tasador-ai.html` | Tasador con IA |
| `calculadora.html` | Calculadora simple de valor de propiedad |
| `referidos.html` | Programa de referidos |
| `blog.html` y `blog-*.html` | Blog SEO |
| `_premium.css` | CSS compartido |
| `_premium.js` | JS compartido (animaciones, ScrollReveal, etc.) |
| `_properties.js` | Renderiza el catálogo desde `propiedades.json` |
| `_three.js` | Three.js / WebGL del home (NO se carga en las landings) |
| `vercel.json` | Configuración de Vercel (headers, cleanUrls) |
| `sitemap.xml` y `robots.txt` | SEO |
| `og-image.jpg`, `og-propietarios.jpg`, `og-compradores.jpg` | Open Graph images (1200×630) |

## Convenciones de código

- **CSS:** mayoritariamente inline en `<style>` por landing (autocontenido, sin build step). Compartido en `_premium.css`.
- **Paleta:**
  - `--primary-dark: #0A0E1F` (fondo)
  - `--electric-blue: #1F69FF` (primario)
  - `--soft-blue: #4D8AFF`
  - `--french-blue: #004DE6`
  - Acento verde: `#32E5A7` (éxito, urgencia)
- **Tipografía:**
  - **Cormorant Garamond** (serif) — titulares y números destacados
  - **Space Grotesk** — eyebrow, badges, CTAs
  - **Inter** — body
  - Pesos cargados (recortados para performance): Cormorant 500/600/700 + 500i/600i, Space Grotesk 500/600/700, Inter 400/500/600
- **Performance reglas (importantes para no romper):**
  - `backdrop-filter` está desactivado en mobile (`@media max-width: 768px`) — no lo reactives sin necesidad.
  - `filter: blur()` máx 50px en halos decorativos. No subir a 80-100px.
  - Animaciones infinitas reducidas a las visualmente clave (gradientShift del hero, scroll del marquee, pulse de badges live). No agregar más sin razón.

## Tracking y conversión

### Meta Pixel
- **ID:** `1646890566557004`
- Cargado en `index.html`, `propietarios.html`, `compradores.html`.
- Eventos:
  - `PageView` (page load)
  - `ViewLanding` custom (en `propietarios` y `compradores` con label de landing)
  - `Lead` (en submit del form, con `content_category` o `content_name`)
- **Privacy/consent:** el pixel arranca con `consent: revoke`. Se concede cuando el usuario acepta el banner de cookies. Si ya aceptó en visita anterior, se restaura desde `localStorage` al cargar.

### GA4
- **Pendiente:** los placeholders `G-XXXXXXXXXX` siguen comentados. Reemplazar por el Measurement ID real cuando esté disponible.

### Pipeline de leads (decisión arquitectónica)
Flujo previsto:
```
Form en landing → Vercel Function (/api/lead) → Airtable + Meta Pixel + GA4 → redirect a WhatsApp
```
- **Endpoint actual:** Formspree placeholder (`https://formspree.io/f/REPLACE_WITH_YOUR_ID`) en `propietarios.html` y `compradores.html`. **A reemplazar por la Vercel Function cuando esté lista.**
- **Destino:** Airtable (centralizar leads). Las credenciales van como **env vars en Vercel**, nunca en el cliente.

## Cómo verificar el sitio localmente

```bash
cd "ruta/al/proyecto/mi-sitio"
python3 -m http.server 8765
# Abrir http://localhost:8765/
```

> En Windows: usar `python -m http.server 8765` (igual, solo cambia `python3` → `python`).

## Cómo regenerar las OG images (macOS)

Workflow: HTML template → Chrome headless → PNG → JPG. Detallado:

1. Crear template HTML 1200×630 con `body{padding:45px 0}` (workaround del bug de Chrome headless en macOS que recorta ~90px del bottom).
2. Renderizar a 1200×720 con `--window-size=1200,720` (se compensa el offset).
3. Crop centrado a 1200×630 con `sips --cropToHeightWidth 630 1200`.
4. Convertir PNG → JPG con `sips -s format jpeg`.

> En Windows el flujo cambia: `sips` no existe. Usar herramientas como ImageMagick (`magick convert`) o reemplazar por un script Node con `sharp`. Las OG images actuales ya están generadas — sólo regenerar si se cambia el branding.

## Pendientes y decisiones tomadas

### Pendientes para activar Meta Ads
- [ ] GA4 Measurement ID (Diego lo está creando).
- [ ] Crear base de Airtable para leads (campos: nombre, whatsapp, email, zona, tipo de operación, fuente del anuncio, fecha, estado del pipeline).
- [ ] Implementar Vercel Function `/api/lead` que reemplaza a Formspree.
- [ ] Grabar VSL (guion en `VSL-Guiones-Diego-Giannini.docx`). Mientras tanto las secciones VSL están ocultas con `display:none` en ambas landings.
- [ ] Testimonios reales (sección oculta hasta que haya material verificado).
- [ ] Casos de venta reales para las landings (sección "properties-section" oculta hasta que haya datos).

### Decisiones tomadas
- **URLs limpias:** los archivos se llaman `propietarios.html` y `compradores.html` pero los links internos y canonical usan `/propietarios` y `/compradores` (gracias a `cleanUrls:true` de Vercel).
- **VSL ocultos hasta tener video real** — el placeholder "Video próximamente" daña credibilidad. Mejor ocultar la sección.
- **Performance > efectos visuales en mobile** — backdrop-filter off, blurs reducidos, animaciones infinitas mínimas. El 60-70% del tráfico de ads viene de mobile.
- **Stats unificados:** "47 días promedio" como cifra clave. Casos individuales (45 d, 54 d) en testimonios — eso es coherente, no hay que unificarlos.
- **Form destination = Airtable** (no Formspree, no email crudo). Single source of truth para el pipeline.

## Cómo no romper cosas (notas para Claude)

1. Si vas a tocar las landings, **respetá las reglas de performance** del bloque "Convenciones de código". Mucho de lo que parece "decorativo" se eliminó a propósito porque mataba mobile.
2. Antes de agregar JS pesado, considerá si se puede hacer con CSS o HTML semántico.
3. Si agregás una página nueva, sumarla a `sitemap.xml`.
4. Si el form cambia, asegurate que dispare:
   - `gtag('event', 'generate_lead', ...)` para GA4
   - `fbq('track', 'Lead', ...)` para Meta Pixel
5. **No commitear secrets nunca** — `.env`, claves de Airtable, etc., quedan en Vercel env vars.
