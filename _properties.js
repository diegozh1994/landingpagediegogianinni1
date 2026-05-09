/* ══════════════════════════════════════════════════════════════
   PROPERTIES RENDERER — lee propiedades.json y renderiza:
   - Carrusel destacado en index.html (si existe .properties-scroll)
   - Catálogo completo en propiedades.html (si existe #properties-catalog)
   ══════════════════════════════════════════════════════════════ */

(function propertiesRenderer() {
  if (typeof window === 'undefined') return;

  const fmtUSD = (n) => 'USD ' + n.toLocaleString('es-AR');
  const fmtM2 = (n) => n.toLocaleString('es-AR') + ' m²';

  const TIPO_LABEL = {
    casa: 'Casa',
    lote: 'Lote',
    departamento: 'Departamento',
    ph: 'PH',
    cochera: 'Cochera',
    comercial: 'Local'
  };

  const ESTADO_BADGE = {
    disponible: { label: 'Disponible', color: '#1F69FF', bg: 'rgba(31,105,255,0.12)' },
    reservada: { label: 'Reservada', color: '#FFC34D', bg: 'rgba(255,195,77,0.14)' },
    vendida: { label: 'Vendida', color: '#7A8BAD', bg: 'rgba(122,139,173,0.14)' }
  };

  const WA_NUMBER = '5491157274477';
  const waText = (prop) => encodeURIComponent(
    `Hola Diego, vi la propiedad "${prop.titulo}" (${prop.id}) en tu web. Quiero más información.`
  );

  function badge(prop) {
    const parts = [];
    if (prop.off_market) {
      parts.push(`<span class="prop-badge prop-badge-off">⚡ Off-market</span>`);
    }
    if (prop.estado === 'vendida' && prop.vendida_en_dias) {
      parts.push(`<span class="prop-badge prop-badge-sold">✓ Vendida en ${prop.vendida_en_dias} días</span>`);
    } else {
      const e = ESTADO_BADGE[prop.estado] || ESTADO_BADGE.disponible;
      parts.push(`<span class="prop-badge" style="color:${e.color};background:${e.bg};border-color:${e.color}40;">${e.label}</span>`);
    }
    return parts.join('');
  }

  function specsLine(prop) {
    const parts = [`📐 ${fmtM2(prop.m2)}`];
    if (prop.ambientes) parts.push(`🛏 ${prop.ambientes} amb`);
    if (prop.banos) parts.push(`🚿 ${prop.banos} baños`);
    if (prop.cocheras) parts.push(`🚗 ${prop.cocheras} coch.`);
    return parts.join(' · ');
  }

  function backDetailsHTML(prop) {
    const items = [];
    if (prop.m2) items.push(['Superficie', fmtM2(prop.m2)]);
    if (prop.m2_cubiertos) items.push(['Cubiertos', fmtM2(prop.m2_cubiertos)]);
    if (prop.ambientes) items.push(['Ambientes', prop.ambientes]);
    if (prop.dormitorios) items.push(['Dormitorios', prop.dormitorios]);
    if (prop.banos) items.push(['Baños', prop.banos]);
    if (prop.cocheras) items.push(['Cocheras', prop.cocheras]);
    items.push(['Tipo', TIPO_LABEL[prop.tipo] || prop.tipo]);
    items.push(['Zona', [prop.barrio, prop.zona].filter(Boolean).join(', ')]);
    return items.map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join('');
  }

  function cardHTML(prop, opts = {}) {
    const zona = [prop.barrio, prop.zona].filter(Boolean).join(', ');
    return `
      <article class="property-card" data-property-id="${prop.id}" data-tipo="${prop.tipo}" data-zona="${prop.zona}" data-estado="${prop.estado}">
        <div class="property-flip">
          <div class="property-face property-face-front">
            <div class="property-image" style="background-image:url('${prop.foto}');background-size:cover;background-position:center;">
              <div class="property-image-overlay"></div>
              <div class="property-badges-top">${badge(prop)}</div>
              <div class="property-tipo">${TIPO_LABEL[prop.tipo] || prop.tipo}</div>
              <div class="property-flip-hint">↻ Más info al hover</div>
            </div>
            <div class="property-info">
              <h3 class="property-address">${prop.titulo}</h3>
              <div class="property-location">${zona}</div>
              <div class="property-specs">${specsLine(prop)}</div>
              <div class="property-price-row">
                <div class="property-price">${fmtUSD(prop.precio_usd)}</div>
              </div>
            </div>
          </div>
          <div class="property-face property-face-back">
            <div>
              <h4>${prop.titulo}</h4>
              <p class="property-back-desc">${prop.descripcion || ''}</p>
              <ul class="property-back-list">${backDetailsHTML(prop)}</ul>
            </div>
            <a class="property-back-cta" href="https://wa.me/${WA_NUMBER}?text=${waText(prop)}" target="_blank" rel="noopener" data-magnetic data-shimmer aria-label="Consultar por WhatsApp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </article>
    `;
  }

  async function loadJSON() {
    try {
      const res = await fetch('propiedades.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      console.warn('[properties] Could not load propiedades.json:', err);
      return null;
    }
  }

  function renderHomeCarousel(data) {
    const scroll = document.querySelector('.properties-scroll');
    if (!scroll) return;
    const featured = data.properties.filter(p => p.destacada).slice(0, 6);
    if (!featured.length) return;
    scroll.innerHTML = featured.map(p => cardHTML(p, { variant: 'mini' })).join('');
    // Show parent section if hidden
    const section = scroll.closest('.properties-section');
    if (section) section.style.display = '';
  }

  function renderCatalog(data) {
    const root = document.getElementById('properties-catalog');
    if (!root) return;

    const allProps = data.properties;

    // Filters UI
    const zonas = [...new Set(allProps.map(p => p.zona))];
    const tipos = [...new Set(allProps.map(p => p.tipo))];

    const filtersHTML = `
      <div class="catalog-filters">
        <div class="filter-group">
          <label>Tipo</label>
          <select data-filter="tipo">
            <option value="">Todos</option>
            ${tipos.map(t => `<option value="${t}">${TIPO_LABEL[t] || t}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Zona</label>
          <select data-filter="zona">
            <option value="">Todas</option>
            ${zonas.map(z => `<option value="${z}">${z}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Estado</label>
          <select data-filter="estado">
            <option value="">Todos</option>
            <option value="disponible">Disponibles</option>
            <option value="reservada">Reservadas</option>
            <option value="vendida">Vendidas</option>
          </select>
        </div>
        <div class="filter-group filter-toggle">
          <label>
            <input type="checkbox" data-filter="off_market">
            Solo off-market ⚡
          </label>
        </div>
        <div class="filter-result-count">
          <span id="catalog-count">${allProps.length}</span> propiedades
        </div>
      </div>
      <div class="catalog-grid" id="catalog-grid"></div>
    `;
    root.innerHTML = filtersHTML;

    const grid = document.getElementById('catalog-grid');
    const countEl = document.getElementById('catalog-count');

    function applyFilters() {
      const tipo = root.querySelector('[data-filter="tipo"]').value;
      const zona = root.querySelector('[data-filter="zona"]').value;
      const estado = root.querySelector('[data-filter="estado"]').value;
      const offmarket = root.querySelector('[data-filter="off_market"]').checked;

      const filtered = allProps.filter(p => {
        if (tipo && p.tipo !== tipo) return false;
        if (zona && p.zona !== zona) return false;
        if (estado && p.estado !== estado) return false;
        if (offmarket && !p.off_market) return false;
        return true;
      });

      grid.innerHTML = filtered.length
        ? filtered.map(p => cardHTML(p)).join('')
        : `<div class="catalog-empty">Sin resultados con esos filtros. <button onclick="document.querySelectorAll('[data-filter]').forEach(el => { if (el.type==='checkbox') el.checked=false; else el.value=''; }); document.querySelector('#properties-catalog [data-filter]').dispatchEvent(new Event('change'));">Limpiar filtros</button></div>`;
      countEl.textContent = filtered.length;
    }

    root.querySelectorAll('[data-filter]').forEach(el => {
      el.addEventListener('change', applyFilters);
    });
    applyFilters();
  }

  async function init() {
    const data = await loadJSON();
    if (!data || !data.properties) return;
    renderHomeCarousel(data);
    renderCatalog(data);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
