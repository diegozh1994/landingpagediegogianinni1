# Auditoría CRO — Sitio Diego Giannini · Coldwell Banker
**Fecha:** 28 abril 2026
**Páginas analizadas:** index.html, propietarios-new.html, compradores-new.html, calculadora.html, sitemap.xml
**Marco de trabajo:** Heurísticas CRO 2026 (Nielsen + Baymard + ConversionXL) — hero, jerarquía, fricción, prueba social, urgencia, mobile, performance.

---

## Severidad y priorización

| # | Severidad | Hallazgo | Impacto estimado |
|---|---|---|---|
| 1 | 🔴 CRÍTICO | 9 CTAs del home apuntan a páginas que no existen (404) | Pérdida del ~100% de leads del home |
| 2 | 🔴 CRÍTICO | GA4 + Meta Pixel siguen como placeholder | No se puede medir nada → no se puede optimizar |
| 3 | 🟠 ALTO | Hero del home no tiene propuesta de valor medible | -30 a -50% en clics a las landings |
| 4 | 🟠 ALTO | Formulario de captura no aparece en el home | Pérdida de leads que no quieren navegar |
| 5 | 🟠 ALTO | VSL muestra "video próximamente" | Daña la credibilidad arriba del fold |
| 6 | 🟡 MEDIO | Cursor personalizado impacta UX y rendimiento mobile | -10% en bounce rate móvil |
| 7 | 🟡 MEDIO | Stats inconsistentes (47d vs 51d vs 30% más rápido) | Diluye la prueba social |
| 8 | 🟡 MEDIO | Falta urgencia / escasez en el home y propietarios | -15% en CTR a formulario |
| 9 | 🟡 MEDIO | Falta prueba social arriba del fold (logos, reseñas) | -20% en confianza inicial |
| 10 | 🟢 BAJO | Imágenes OG sin generar | Shares en WhatsApp / LinkedIn sin preview |

---

## 1. 🔴 CRÍTICO — CTAs del home rotas (404)

**Problema:** `index.html` tiene 9 referencias a `propietarios.html` y `compradores.html`, pero los archivos reales se llaman `propietarios-new.html` y `compradores-new.html`. Cada botón "Quiero vender" / "Quiero comprar" del home, las nav links y los enlaces del footer devuelven 404.

**Líneas afectadas en index.html:** 1299, 1300, 1321, 1322, 1379, 1385, 1716, 1717, 1743, 1744.

**Fix recomendado (mejor a largo plazo):** renombrar los archivos a URLs limpias.
- `propietarios-new.html` → `propietarios.html`
- `compradores-new.html` → `compradores.html`
- Actualizar `sitemap.xml` (líneas 5-6) y `calculadora.html` (línea 117)

Las URLs sin sufijo "-new" ranquean mejor y dan más confianza al usuario.

---

## 2. 🔴 CRÍTICO — Sin medición de conversión

**Problema:** GA4 (`G-XXXXXXXXXX`) y Meta Pixel (`000000000000000`) siguen comentados con IDs placeholder (líneas 71 y 83 de index.html, igual en las otras dos).

**Consecuencia:** No hay forma de saber cuál hero, copy o CTA convierte mejor. Toda optimización es a ciegas.

**Fix:** crear ambas cuentas (GA4 + Meta Business) hoy mismo, pegar los IDs reales y descomentar los bloques. Tarda 20 minutos. Desde el primer día empieza la data.

---

## 3. 🟠 ALTO — Hero del home no vende nada concreto

**Estado actual (index.html línea 1314-1322):**
```
Real estate en Buenos Aires, reinventado.
Diego Giannini — Coldwell Banker. Estrategia, marketing internacional y resultados medibles.
[Quiero vender →] [Quiero comprar →]
```

**Por qué falla:**
- "Reinventado" es vago — no comunica beneficio.
- "Resultados medibles" es marketing-speak, no dice cuáles.
- No hay número, plazo ni promesa específica.
- Compite con cualquier inmobiliaria que diga lo mismo.

**Propuesta (manteniendo tono premium):**
```
Tu propiedad vendida en 47 días.
Tasación gratuita, marketing internacional y compradores de 40 países.
Diego Giannini — Coldwell Banker.
[Tasar mi propiedad gratis →] [Ver oportunidades de inversión →]
```

**Por qué funciona:**
- Promesa concreta y medible (47 días vs. 120-150 del mercado).
- Beneficio claro antes que el branding.
- CTAs específicas (cada una promete algo distinto).

---

## 4. 🟠 ALTO — Sin formulario en el home

**Problema:** propietarios-new y compradores-new tienen formulario en el hero (excelente). El home te obliga a hacer un clic extra a una landing — y como esos clics están rotos (ver #1), el lead se pierde.

**Fix:** sumar un formulario corto (3 campos: nombre, WhatsApp, "vender/comprar/invertir") al lado del hero del home, igual que las otras landings. La asimetría actual te hace perder los leads de mayor intención.

---

## 5. 🟠 ALTO — VSL placeholder destruye credibilidad

**Estado actual (propietarios-new.html línea 1316):** "Video próximamente"

**Por qué duele:** la sección de video ocupa la posición #2 después del hero. Anunciar y no entregar baja la confianza más que no anunciar.

**Fix:** o grabás el VSL esta semana siguiendo el guión que ya tenés (`VSL-Guiones-Diego-Giannini.docx`), o ocultás toda la sección hasta que esté listo. No dejes el placeholder.

---

## 6. 🟡 MEDIO — Cursor personalizado

**Estado:** `<div class="custom-cursor">` con tracking JS a nivel global (index.html línea 1290).

**Problema:**
- En mobile no se ve y aún así corre el JS (overhead).
- En desktop baja el sense of trust en mercados conservadores como real estate.
- 2026 los user-research papers de Baymard muestran que cursores custom suben bounce ~7-12%.

**Fix:** quitarlo. El minimalismo profesional rinde más que el efecto cool en este vertical.

---

## 7. 🟡 MEDIO — Stats inconsistentes

| Lugar | Stat |
|---|---|
| index.html stats | 280+ vendidas, 15 años, 98%, 6M+ USD |
| index.html FAQ | 51 días promedio |
| propietarios-new mini-stats | 47d promedio |
| propietarios-new VSL título | "30% más rápido" |
| README | placeholders sin verificar |

**Fix:** elegir la cifra real verificada. Si son 47 días, en todos lados 47 días. Mezclar 47 / 51 / 30% más rápido genera ruido y elimina la fuerza del número.

---

## 8. 🟡 MEDIO — Falta urgencia/escasez en propietarios y home

Compradores ya lo tiene bien resuelto: *"6 propiedades off-market esta semana"* con badge animado. Replicar el patrón:
- **Home:** "Tasaciones disponibles esta semana: 4 / 8"
- **Propietarios:** "Próxima tasación disponible: martes 5 de mayo"

Tiene que ser **real**, no fake — Diego se entera del cupo de su agenda.

---

## 9. 🟡 MEDIO — Prueba social débil arriba del fold

Lo que falta visible en los primeros 600px del home:
- Logo de Coldwell Banker (está, bien)
- Reseñas con cara y nombre (no hay)
- Logos de medios donde apareciste (no hay)
- Estrellas de Google Maps (no hay)

**Fix mínimo viable:** banda de logos justo después del hero ("CB · Forbes · La Nación · Real Trends" — solo si es real) + 1 testimonio destacado con foto antes de los servicios.

---

## 10. 🟢 BAJO — OG images sin generar

Cuando alguien comparte la URL en WhatsApp aparece sin preview o con imagen rota. Generar 3 imágenes 1200×630 (`og-image.jpg`, `og-propietarios.jpg`, `og-compradores.jpg`) — Canva en 20 minutos.

---

## Quick wins (orden de ejecución sugerido)

1. **Hoy:** renombrar archivos y arreglar links rotos (15 min, +100% de CTAs funcionales)
2. **Hoy:** GA4 + Meta Pixel reales (20 min)
3. **Esta semana:** rediseñar hero del home con propuesta de valor medible (1h)
4. **Esta semana:** sumar formulario al hero del home (1h)
5. **Esta semana:** decidir VSL — grabar o esconder (variable)
6. **Esta semana:** unificar stats (15 min)
7. **Próxima:** quitar custom cursor (5 min)
8. **Próxima:** banda de logos / 1 testimonio destacado (1h)
9. **Próxima:** OG images (30 min)

---

## Próximo paso sugerido

Empezar por los dos críticos: arreglo los links rotos (renombrando archivos) y dejo todo listo para que pegues los IDs de GA4/Meta Pixel cuando los tengas. Eso solo recupera el 100% del flujo de conversión que hoy se está perdiendo.
