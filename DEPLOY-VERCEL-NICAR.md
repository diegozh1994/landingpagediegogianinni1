# Deploy a Vercel + Conectar dominio NIC.ar
**Diego Giannini · Coldwell Banker · gianninirealestate.com.ar**
**Tiempo total:** 30-45 minutos (sin contar la propagación DNS, que tarda entre 15 min y 24 hs)

---

## Paso 1 — Crear cuenta en Vercel (3 min)

1. Andá a **https://vercel.com/signup**
2. Loguéate con **Continue with GitHub** (lo más recomendado — te sirve para versionar el código en el futuro). Si no tenés GitHub, usá **Continue with Email**.
3. Cuando te pregunte plan, elegí **Hobby** (gratis, alcanza y sobra para tu sitio).

✅ Listo cuando ves el dashboard de Vercel.

---

## Paso 2 — Instalar Vercel CLI (2 min)

Abrí Terminal en tu Mac (Cmd+Espacio → "Terminal") y pegá:

```bash
npm install -g vercel
```

Si te tira `command not found: npm`, primero instalá Node.js desde **https://nodejs.org** (versión LTS, "Recommended for most users") y volvé a correr el comando.

✅ Verificá que funcionó:
```bash
vercel --version
```
Te tiene que devolver algo como `42.x.x`.

---

## Paso 3 — Deploy del sitio (5 min)

```bash
cd "/Users/diego/Desktop/CLAUDE/pagina web CB/mi-sitio"
vercel
```

Te va a hacer estas preguntas (respondé exactamente así):

| Pregunta | Respuesta |
|---|---|
| Set up and deploy? | **Y** + Enter |
| Which scope? | tu nombre/cuenta + Enter |
| Link to existing project? | **N** + Enter |
| What's your project's name? | **gianninirealestate** + Enter |
| In which directory is your code located? | **./** + Enter |
| Want to modify settings? | **N** + Enter |

En 30 segundos te devuelve una URL temporal tipo `https://gianninirealestate-xxxx.vercel.app` — **¡ya está online!**

Para hacer el deploy de producción (más rápido, con caché optimizado):
```bash
vercel --prod
```

✅ Abrí la URL en el navegador y revisá que todo se vea bien.

---

## Paso 4 — Agregar tu dominio en Vercel (3 min)

1. En el dashboard de Vercel, andá a tu proyecto **gianninirealestate**.
2. Tab **Settings** → menú lateral **Domains**.
3. Pegá **`gianninirealestate.com.ar`** y hacé clic en **Add**.
4. Vercel te va a mostrar **2 registros DNS** que tenés que agregar en NIC.ar. Algo así:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com.
```

**No cierres esta pestaña** — vamos a copiar esos valores en el siguiente paso.

---

## Paso 5 — Configurar DNS en NIC.ar (10 min)

NIC.ar tiene una interfaz un poco vieja, pero los pasos son simples:

1. Andá a **https://nic.ar** y logueate con tu CUIT/CUIL.
2. Menú **"Mis dominios"** → buscá **gianninirealestate.com.ar** → click en el dominio.
3. En la pantalla del dominio, sección **"Delegaciones"** → click en **"Editar delegaciones"** o **"Agregar registros DNS"** (la opción exacta cambió varias veces).

### Si NIC.ar te pide "elegir DNS":

Tenés dos opciones. **Recomiendo la Opción A** para arrancar simple.

#### Opción A — Usar los nameservers de Vercel (más simple)

En NIC.ar, en el campo de delegación de DNS, ponés:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

Eliminás cualquier otro DNS que esté listado.

Con esto, Vercel se ocupa de todo el DNS y vos no necesitás tocar nada más en NIC.ar.

#### Opción B — Mantener DNS en NIC.ar y agregar registros

Si NIC.ar te permite registros A/CNAME directamente (algunos paneles lo permiten):

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| **A** | @ | 76.76.21.21 | 3600 |
| **CNAME** | www | cname.vercel-dns.com. | 3600 |

(El valor exacto del A record te lo da Vercel en el paso 4 — usá el de ahí, podría cambiar.)

4. Guardá los cambios.

✅ NIC.ar suele tardar entre **15 minutos y 4 horas** en propagar el cambio. A veces hasta 24 horas. Es normal.

---

## Paso 6 — Verificar y activar SSL (automático)

Volvé a la pestaña de Vercel (la que dejaste abierta en el paso 4).

Una vez que el DNS propaga, Vercel detecta el dominio automáticamente:
1. El estado cambia a **Valid configuration** ✅
2. Vercel emite un certificado SSL gratuito (Let's Encrypt) automáticamente
3. `https://gianninirealestate.com.ar` empieza a funcionar

Para chequear cuándo propaga sin esperar, usá: **https://dnschecker.org** y pegá `gianninirealestate.com.ar`. Cuando ves el A record `76.76.21.21` en la mayoría de las regiones, ya está.

---

## Paso 7 — Configurar redirect www → naked domain (2 min)

En Vercel **Settings → Domains** vas a ver:
- `gianninirealestate.com.ar` (Primary)
- `www.gianninirealestate.com.ar`

Hacé click en el `www` y elegí **"Redirect to gianninirealestate.com.ar"**. Así si alguien escribe `www.` lo redirige al sin www, evitando contenido duplicado para SEO.

✅ Probá en el navegador: tipear `www.gianninirealestate.com.ar` te tiene que mandar a `https://gianninirealestate.com.ar`.

---

## Paso 8 — Google Search Console (5 min)

1. Andá a **https://search.google.com/search-console**.
2. **Add Property** → **URL prefix** → pegá `https://gianninirealestate.com.ar`
3. Para verificar, elegí el método **HTML tag** y copiá el meta tag que te dan.
4. Avisame cuando lo tengas y te lo agrego al `<head>` de las páginas.
5. Una vez verificado, en Search Console: menú **Sitemaps** → pegá `https://gianninirealestate.com.ar/sitemap.xml` → **Submit**.

Resultado: Google empieza a indexar tu sitio en 1-7 días.

---

## Cómo hacer cambios al sitio después

Cuando quieras actualizar algo en el futuro:

```bash
cd "/Users/diego/Desktop/CLAUDE/pagina web CB/mi-sitio"
vercel --prod
```

Eso resube todo. En 30 segundos los cambios están live.

Si querés un flujo más profesional (cada cambio que guardes en GitHub se deploya solo), después conectamos un repo de GitHub al proyecto Vercel. Por ahora con `vercel --prod` alcanza.

---

## Si algo falla — checklist

| Síntoma | Causa probable | Fix |
|---|---|---|
| `vercel: command not found` | npm/node no instalado | Instalar Node.js desde nodejs.org |
| Deploy ok pero sitio se ve roto | Falta algún archivo | `vercel --prod` de nuevo desde la carpeta correcta |
| Dominio dice "Invalid configuration" después de 24hs | DNS mal configurado en NIC.ar | Revisar nameservers o registros A/CNAME |
| SSL no se activa | Vercel todavía no detectó el dominio | Esperar más, o forzar re-check en Settings → Domains |
| Sitio carga sin estilos | Path de assets incorrecto | Avisame y reviso los `<link>` del HTML |

Si te trabás en cualquier paso, copiame el mensaje de error o screenshot y lo destrabamos.
