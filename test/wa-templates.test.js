// Contrato de mensajes de WhatsApp — corre en CI con `node test/wa-templates.test.js`.
//
// El clasificador IA del CRM de Diego parsea los mensajes entrantes: el formato
// es un CONTRATO. Reglas que valida este test sobre TODAS las superficies
// (2 landings + home + shared JS):
//   1. Todo template de submit (contiene ${nombre}) debe ser EXACTAMENTE uno de
//      los dos formatos congelados — sin variantes.
//   2. Ningún mensaje de wa.me lleva teléfono, email, emojis ni saltos de línea.
//   3. Los CTAs estáticos (burbujas/links) son texto plano de una línea sin
//      datos personales.

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const ARCHIVOS = ['propietarios.html', 'compradores.html', 'propiedad.html', 'index.html', '_premium.js', '_tracking.js'];

const CONGELADOS = [
  /^Hola Diego, soy \$\{nombre\}, quiero vender en \$\{zona\}\. Vi tu anuncio\.$/,
  /^Hola Diego, soy \$\{nombre\}, estoy buscando en \$\{zona\}\. Vi tu anuncio\.$/,
];

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/u;
const VARS_PROHIBIDAS = /\$\{\s*(telefono|telInput|email|whatsapp|apellido)/;

let errores = [];
let templatesSubmit = 0;
let ctasEstaticos = 0;

for (const archivo of ARCHIVOS) {
  const contenido = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');

  // 1) Template literals con "Hola Diego" (mensajes construidos en JS).
  // Partición por backticks: los segmentos de índice IMPAR son el interior de
  // los template literals (los pares son código/markup entre templates).
  const segmentos = contenido.split('`');
  const literales = segmentos.filter((s, i) => i % 2 === 1 && s.includes('Hola Diego'));
  for (const tpl of literales) {
    const donde = `${archivo}: ${tpl.slice(0, 60)}...`;
    if (EMOJI.test(tpl)) errores.push(`EMOJI en template: ${donde}`);
    if (VARS_PROHIBIDAS.test(tpl)) errores.push(`DATO PROHIBIDO (tel/email/apellido) en template: ${donde}`);
    if (tpl.includes('\\n') || tpl.includes('\n')) errores.push(`MULTILÍNEA en template: ${donde}`);
    if (tpl.includes('${nombre}')) {
      templatesSubmit++;
      if (!CONGELADOS.some((re) => re.test(tpl))) {
        errores.push(`FUERA DE CONTRATO (no es formato congelado): ${donde}`);
      }
    }
  }

  // 2) Links/strings estáticos de wa.me con texto pre-armado
  const estaticos = contenido.match(/wa\.me\/\d+\?text=([^"'`\s)&]+)/g) || [];
  for (const bruto of estaticos) {
    const texto = decodeURIComponent(bruto.split('text=')[1]);
    ctasEstaticos++;
    const donde = `${archivo}: "${texto.slice(0, 50)}"`;
    if (EMOJI.test(texto)) errores.push(`EMOJI en CTA estático: ${donde}`);
    if (/\d{8,}/.test(texto)) errores.push(`TELÉFONO en CTA estático: ${donde}`);
    if (texto.includes('@')) errores.push(`EMAIL en CTA estático: ${donde}`);
    if (texto.includes('\n')) errores.push(`MULTILÍNEA en CTA estático: ${donde}`);
  }
}

// Sanidad del propio test: si no encontró templates, el extractor se rompió
assert.ok(templatesSubmit >= 5, `el test debe encontrar ≥5 templates de submit (encontró ${templatesSubmit}) — ¿cambió la estructura?`);
assert.ok(ctasEstaticos >= 3, `el test debe encontrar ≥3 CTAs estáticos (encontró ${ctasEstaticos})`);

if (errores.length) {
  console.error(`\n✖ ${errores.length} violaciones del contrato de mensajes WA:\n`);
  errores.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log(`OK  ${templatesSubmit} templates de submit en formato congelado exacto`);
console.log(`OK  ${ctasEstaticos} CTAs estáticos sin emojis/teléfono/email`);
console.log('\nContrato de mensajes WA validado en todas las superficies.');
