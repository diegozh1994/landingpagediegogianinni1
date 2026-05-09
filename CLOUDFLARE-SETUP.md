# Conectar gianninirealestate.com.ar → Cloudflare → Vercel
**Flujo:** NIC.ar (registrar) → Cloudflare (DNS + CDN + SSL) → Vercel (hosting)

**Tiempo total estimado:** 30 min de setup + 1-24hs de propagación DNS

---

## Resumen del flujo

```
[Visitante] → [Cloudflare CDN] → [Vercel hosting] → [HTML del sitio]
                ↑
                DNS gestionado acá (no en NIC.ar)
                Nameservers cambian en NIC.ar
```

---

## Paso 1 — Agregar el dominio en Cloudflare (5 min)

1. Login en **https://dash.cloudflare.com**
2. Botón superior derecho **"Add a Site"** o **"Add Domain"**
3. Escribir: `gianninirealestate.com.ar` (sin https, sin www)
4. Plan: **Free** (alcanza para todo lo que necesitás)
5. Cloudflare escanea registros DNS existentes — probablemente no encuentre nada (NIC.ar no tiene records configurados todavía). Avanzá.
6. Cloudflare te muestra 2 **nameservers personalizados** asignados a tu cuenta. Algo tipo:
   ```
   alex.ns.cloudflare.com
   nina.ns.cloudflare.com
   ```
   (los nombres son random, pueden variar)

📌 **No cierres esta pestaña.** Vamos a copiar esos nameservers en NIC.ar.

---

## Paso 2 — Cambiar nameservers en NIC.ar (5 min)

1. Login en **https://nic.ar** con tu CUIT/CUIL
2. Menú **"Mis dominios"** → click en `gianninirealestate.com.ar`
3. Buscar la opción **"Editar delegaciones"** o **"DNS"** o **"Configurar nameservers"**
4. Eliminar cualquier nameserver actual (si NIC.ar trae los suyos por default, los borrás)
5. Pegar los 2 nameservers de Cloudflare. Algo así:
   ```
   alex.ns.cloudflare.com
   nina.ns.cloudflare.com
   ```
6. Guardar / Confirmar

⏰ **NIC.ar tarda entre 15 minutos y 24 horas en propagar.** Es normal.

---

## Paso 3 — Volver a Cloudflare y esperar verificación

1. Volvés al dashboard de Cloudflare → tu sitio
2. Vas a ver un mensaje: *"Pending nameserver update"*
3. Hay un botón **"Check nameservers"** que podés pulsar para forzar verificación
4. Cuando Cloudflare detecta que NIC.ar ya delega a sus nameservers, el sitio cambia a estado **"Active"** ✅

Te mandan email cuando se activa.

---

## Paso 4 — Configurar registros DNS en Cloudflare (5 min)

Con el sitio ya activo en Cloudflare:

1. Ir a tu dominio en Cloudflare → tab **"DNS"** → **"Records"**
2. **Agregar registro A** (apunta el dominio raíz a Vercel):
   - **Type:** A
   - **Name:** `@` (significa el dominio raíz)
   - **IPv4 address:** `76.76.21.21` (IP de Vercel)
   - **Proxy status:** 🟠 **Proxied (naranja)** — esto activa el CDN de Cloudflare
   - **TTL:** Auto
   - Save

3. **Agregar registro CNAME** (para el subdominio www):
   - **Type:** CNAME
   - **Name:** `www`
   - **Target:** `cname.vercel-dns.com`
   - **Proxy status:** 🟠 Proxied (naranja)
   - **TTL:** Auto
   - Save

✅ Tu DNS está apuntando a Vercel a través de Cloudflare.

---

## Paso 5 — Configurar SSL en Cloudflare (2 min)

⚠️ **Crítico**: si no hacés esto vas a tener "Too many redirects" loop infinito.

1. Cloudflare → tu dominio → tab **"SSL/TLS"** → **"Overview"**
2. **Encryption mode:** elegí **"Full (strict)"** — NO "Flexible" (Flexible rompe la conexión con Vercel porque Vercel ya tiene SSL del lado del servidor).

Otras opciones recomendadas en SSL/TLS:
- **Edge Certificates → Always Use HTTPS:** ON
- **Edge Certificates → Automatic HTTPS Rewrites:** ON
- **Edge Certificates → Minimum TLS Version:** 1.2

---

## Paso 6 — Agregar el dominio en Vercel (3 min)

1. Vercel Dashboard → proyecto **gianninirealestate** → **Settings** → **Domains**
2. Input "Add" → escribir `gianninirealestate.com.ar` → **Add**
3. Vercel intenta verificar el DNS. Como ya configuraste todo en Cloudflare, debería decir **"Valid Configuration"** ✅ en pocos minutos.
4. Repetir el paso para `www.gianninirealestate.com.ar` y configurarlo como **redirect a `gianninirealestate.com.ar`** (evita contenido duplicado, mejor SEO).

---

## Paso 7 — Verificar que funciona (2 min)

Abrir en el navegador (modo incógnito):

- ✅ `https://gianninirealestate.com.ar` → carga el sitio
- ✅ `http://gianninirealestate.com.ar` → redirige a https
- ✅ `www.gianninirealestate.com.ar` → redirige a sin www

Si todo está OK, en Cloudflare → Analytics empezás a ver las primeras visitas.

---

## Bonus: features de Cloudflare Free que vale activar

### A) Page Rules / Redirects útiles
Cloudflare → Rules → Page Rules / Redirect Rules:
- Forzar HTTPS siempre (ya está en Always Use HTTPS, pero podés sumar regla)
- Redirect 301: `gianninirealestate.com` → `gianninirealestate.com.ar` (si comprás el .com en el futuro)

### B) Cloudflare Web Analytics (sin cookies)
Analytics → Web Analytics → Add Site
- Mide visitas, países, top pages, referrers
- No necesita cookie banner (no usa cookies)
- Gratis

### C) Image optimization (Polish)
Cloudflare → Speed → Optimization → Image Optimization:
- Activar **Polish** (Lossy o Lossless)
- Sirve fotos optimizadas automáticamente
- Útil cuando sumemos las fotos de propiedades de Tokko

### D) Cache rules
Cloudflare → Caching → Configuration:
- **Browser Cache TTL:** 4 horas (default) o 1 día
- **Always Online:** ON (sirve copia cacheada si Vercel cae)

---

## Troubleshooting común

| Síntoma | Causa | Fix |
|---|---|---|
| "Too many redirects" loop | SSL/TLS en "Flexible" | Cambiar a "Full (strict)" |
| DNS no propaga | NIC.ar tardando | Esperar más (hasta 24hs). Verificar con dnschecker.org |
| Vercel "Invalid configuration" | Aún no propagó | Esperar y hacer "Refresh" en Vercel Settings → Domains |
| Sitio no carga | Proxy de Cloudflare apagado | En DNS records: 🟠 ON (naranja) |
| Imágenes lentas | Polish no activo | Cloudflare → Speed → activar Polish |

---

## ¿Y después?

Una vez funcionando:
1. **Volver a actualizar Search Console** con la URL `https://gianninirealestate.com.ar` (no la de Vercel)
2. **Submit sitemap** desde Search Console
3. **Activar Cloudflare Web Analytics** para empezar a medir
4. **Conectar Tokko** cuando tengas la API key (siguiente fase)
