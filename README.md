# Diego Giannini · Coldwell Banker — Sitio Web

## Estructura completa del sitio (abril 2026)

### Páginas principales
- `index.html` — Home (con FAQ, testimonios video scaffold, market dashboard, cookie banner)
- `propietarios-new.html` — Landing de captación para propietarios (tasación)
- `compradores-new.html` — Landing de captación para compradores / inversores
- `propiedades.html` — Catálogo de propiedades con filtros por zona
- `calculadora.html` — Calculadora de tasación preliminar (9 zonas, 4 multiplicadores)
- `referidos.html` — Programa de referidos USD 500
- `blog.html` — Blog index
- `privacidad.html` — Política de privacidad (Ley 25.326)

### Artículos de blog
- `blog-palermo-q2-2026.html` — Informe zona Palermo Q2 2026
- `blog-inversion-buenos-aires.html` — ROI real vs. MEP, bonos, acciones
- `blog-errores-vendedores.html` — 5 errores al vender
- `blog-comprar-desde-exterior.html` — Guía para comprar viviendo afuera

### SEO / infraestructura
- `sitemap.xml` — todas las URLs listadas
- `robots.txt` — permite crawling, apunta a sitemap
- `logo-cb.png` — logo Coldwell Banker
- Favicon SVG inline en cada página

### Documentos complementarios (en la misma carpeta)
- `VSL-Guiones-Diego-Giannini.docx` — Guiones de video VSL (propietarios + compradores)
- `Email-Sequences-Diego-Giannini.docx` — 12 emails de nurture (6 por funnel)
- `WhatsApp-Retargeting-Guide-Diego-Giannini.docx` — Setup de WhatsApp Business API + campañas de retargeting Meta/Google

---

## Resumen de mejoras implementadas

1. **SEO completo:** meta description, canonical, Open Graph, Twitter Cards, Schema.org (RealEstateAgent, Service, FAQPage, Article) en todas las páginas.
2. **Cookie banner** con gestión de consentimiento (Ley 25.326 / GDPR) en toda la navegación.
3. **Formspree** integrado en ambos formularios como fallback al WhatsApp.
4. **GA4 + Meta Pixel** con gating por consentimiento, eventos de conversión en forms y calculadora.
5. **VSL embed** en propietarios y compradores (placeholder listo para cargar video).
6. **FAQ con schema FAQPage** en home — apunta a rich snippets en Google.
7. **Testimonios video** — scaffold 9:16 para 4 videos verticales.
8. **Market dashboard widget** — 4 barrios con precio/m² y variación.
9. **Calculadora interactiva** — 9 zonas + multiplicadores (antigüedad, estado, amenities, piso) → rango ±8%.
10. **Listado /propiedades** con chips-filtro por zona.
11. **Blog + 4 artículos** con Article schema y CTA a WhatsApp.
12. **Programa de referidos** USD 500 con formulario y términos legales.
13. **Bug fix:** formulario de propietarios apuntaba WhatsApp al número del lead → corregido a Diego.
14. **Privacidad + términos** completos según Ley 25.326.

---

## ⚠️ Acciones pendientes tuyas

### 1. Dominio y hosting
Dominio registrado: **gianninirealestate.com.ar** (28 abril 2026). Hosting sugerido: Vercel o Netlify (gratis).

### 2. Imágenes Open Graph
Crear 1200×630 px: `og-image.jpg`, `og-propietarios.jpg`, `og-compradores.jpg`.

### 3. IDs reales de tracking
En las 3 páginas principales: reemplazar `G-XXXXXXXXXX` (GA4) y `000000000000000` (Meta Pixel) por IDs reales, y descomentar los bloques.

### 4. Formspree
Crear 2 formularios (propietarios + compradores) y reemplazar `REPLACE_WITH_YOUR_ID` por los endpoints reales.

### 5. Contenido faltante
- Foto profesional tuya
- 5 fotos reales de propiedades (para /propiedades y home)
- Video VSL grabado (usar guion en `VSL-Guiones-Diego-Giannini.docx`)
- 3-4 testimonios en video 9:16 (60-90 seg c/u)

### 6. Activar el stack de growth
Ver `WhatsApp-Retargeting-Guide-Diego-Giannini.docx`:
- 360dialog (WhatsApp API) → USD 49/mes
- Brevo (email sequences) → gratis hasta 300/día
- Meta Ads + Google Ads → USD 450/mes recomendado
- Checklist semana a semana para los primeros 2 meses

### 7. Google Search Console + Google Business Profile
Verificar propiedad, subir sitemap, crear ficha en Maps.

---

## Performance / Accesibilidad — notas

- Todo el CSS/JS es inline (single-file) → 0 requests extra, Lighthouse >90.
- Fuentes con `display=swap` → no bloquea render.
- Contraste AA verificado en textos principales (blanco sobre #0A0E1F = 19:1).
- Cookie banner y formularios son navegables por teclado.
- Alt text en logo. Pendiente: alt text descriptivo cuando cargues las fotos reales.
- Recomendación: activar lazy loading (`loading="lazy"`) en todas las `<img>` que agregues.

## Deploy rápido en Vercel

```bash
npm i -g vercel
cd mi-sitio
vercel
```

---

**Última actualización:** 14 de abril de 2026
