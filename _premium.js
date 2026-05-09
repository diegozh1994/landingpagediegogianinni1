/* ══════════════════════════════════════════════════════════════
   PREMIUM ANIMATIONS RUNTIME v2 — Diego Giannini / Coldwell Banker
   Selectors tuned to the actual site classes for visible impact.
   ══════════════════════════════════════════════════════════════ */

(function premium() {
  if (typeof window === 'undefined') return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = matchMedia('(pointer: fine)').matches;

  // ═══ 0b. Hero photo mouse parallax (subtle camera-follow) ═══
  function setupHeroPhotoParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    if (reduce) return;
    if (!isFinePointer) return;

    let tx = 0, ty = 0, x = 0, y = 0, animating = false;
    document.addEventListener('pointermove', (ev) => {
      tx = ((ev.clientX / innerWidth) - 0.5) * 2;
      ty = ((ev.clientY / innerHeight) - 0.5) * 2;
      if (!animating) { animating = true; requestAnimationFrame(loop); }
    }, { passive: true });

    function loop() {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      hero.style.setProperty('--hero-mx', `${(-x * 14).toFixed(1)}px`);
      hero.style.setProperty('--hero-my', `${(-y * 8).toFixed(1)}px`);
      if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) {
        requestAnimationFrame(loop);
      } else {
        animating = false;
      }
    }
  }

  // ═══ 0. Hero photo background (Ken Burns cinematic) ═══
  function ensureHeroPhotoBackground() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    if (hero.querySelector('.hero-photo-bg')) return;

    hero.style.position = hero.style.position || 'relative';

    const photo = document.createElement('div');
    photo.className = 'hero-photo-bg';
    photo.setAttribute('aria-hidden', 'true');

    const overlay = document.createElement('div');
    overlay.className = 'hero-photo-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const vignette = document.createElement('div');
    vignette.className = 'hero-photo-vignette';
    vignette.setAttribute('aria-hidden', 'true');

    hero.insertBefore(photo, hero.firstChild);
    hero.insertBefore(overlay, photo.nextSibling);
    hero.insertBefore(vignette, overlay.nextSibling);
  }

  // ═══ 1. Page Curtain ═══
  function ensureCurtain() {
    if (document.querySelector('.page-curtain')) return;
    const c = document.createElement('div');
    c.className = 'page-curtain';
    c.innerHTML = `
      <div class="curtain-3d-logo">
        <div class="curtain-3d-cube">
          <div class="curtain-3d-face curtain-3d-face-front">CB</div>
          <div class="curtain-3d-face curtain-3d-face-back">CB</div>
          <div class="curtain-3d-face curtain-3d-face-right">CB</div>
          <div class="curtain-3d-face curtain-3d-face-left">CB</div>
          <div class="curtain-3d-face curtain-3d-face-top">CB</div>
          <div class="curtain-3d-face curtain-3d-face-bottom">CB</div>
        </div>
      </div>
      <div class="curtain-loader"></div>
    `;
    document.body.insertBefore(c, document.body.firstChild);
  }

  function ensureProgressBar() {
    if (document.querySelector('.scroll-progress')) return;
    const p = document.createElement('div');
    p.className = 'scroll-progress';
    document.body.insertBefore(p, document.body.firstChild);
  }

  // ═══ 2. CTA tagging — REAL site selectors ═══
  function autoTagCTAs() {
    const PRIMARY = [
      '.btn-primary',
      '.btn-cta-primary',
      '.btn-cta',
      '.nav-cta',
      '.hero-miniform-submit',
      '.cta-panel a',
      'button[type="submit"]'
    ];
    const SECONDARY = [
      '.btn-cta-secondary',
      '.btn-secondary',
      '.service-link',
      'a[href*="wa.me"]:not(.whatsapp-button)',
      'a[href*="whatsapp"]:not(.whatsapp-button)'
    ];

    const tagged = new Set();
    PRIMARY.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (tagged.has(el)) return;
        tagged.add(el);
        el.setAttribute('data-magnetic', '');
        el.setAttribute('data-shimmer', '');
        el.setAttribute('data-glow', '');
        // Add permanent pulse to the very first hero CTA on the page
      });
    });
    SECONDARY.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (tagged.has(el)) return;
        tagged.add(el);
        el.setAttribute('data-magnetic', '');
        el.setAttribute('data-glow', '');
      });
    });

    // Pulse glow on the first prominent CTA visible on page
    const firstHeroCTA = document.querySelector(
      '.hero .btn-cta-primary, .hero .btn-primary, .hero-cta-group .btn-cta-primary, .hero-cta-group .btn-primary'
    );
    if (firstHeroCTA) firstHeroCTA.setAttribute('data-glow-pulse', '');
  }

  // ═══ 3. WhatsApp floats: pulse ring ═══
  function autoTagWAFloats() {
    document.querySelectorAll(
      '.whatsapp-float, .wa-float, .floating-whatsapp, .whatsapp-button[class*="float" i], a.whatsapp-button'
    ).forEach(el => {
      // Heuristic: position fixed = floating
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed') el.setAttribute('data-wa-pulse', '');
    });
  }

  // ═══ 4a. Service-card 3D flip wrapper ═══
  function wrapServiceCardsForFlip() {
    document.querySelectorAll('.service-card').forEach((card) => {
      if (card.querySelector('.service-card-flip')) return; // already wrapped
      const number = card.querySelector('.service-number')?.textContent?.trim() || '';
      const title = card.querySelector('h3')?.textContent?.trim() || '';
      const desc = card.querySelector('p')?.textContent?.trim() || '';
      const link = card.querySelector('a.service-link');
      const linkHref = link?.getAttribute('href') || '#';
      const linkText = link?.textContent?.trim() || 'Saber más';

      const flipWrap = document.createElement('div');
      flipWrap.className = 'service-card-flip';
      flipWrap.innerHTML = `
        <div class="service-card-front">
          ${number ? `<div class="service-number">${number}</div>` : ''}
          <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;font-weight:600;color:#fff;margin-bottom:14px;line-height:1.2;">${title}</h3>
          <p style="font-family:'Inter',sans-serif;font-size:13.5px;line-height:1.6;color:rgba(255,255,255,0.65);">${desc}</p>
          <div class="service-card-flip-hint">↻ Pasá el mouse</div>
        </div>
        <div class="service-card-back">
          <div>
            <div style="font-family:'Space Grotesk',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#6AA0FF;margin-bottom:10px;">→ Trabajemos juntos</div>
            <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:600;color:#fff;line-height:1.15;margin-bottom:14px;">${title}</h3>
            <p style="font-family:'Inter',sans-serif;font-size:13.5px;line-height:1.65;color:rgba(255,255,255,0.85);">Trabajo con vos personalmente desde el primer contacto hasta el cierre. Sin intermediarios, sin promesas vacías. Resultados reales.</p>
          </div>
          <a class="service-back-cta" href="${linkHref}">${linkText}</a>
        </div>
      `;
      card.innerHTML = '';
      card.appendChild(flipWrap);
    });
  }

  // ═══ 4. Premium card hover (real site classes) ═══
  function tagPremiumCards() {
    const SELECTORS = [
      '.service-card',
      '.property-card',
      '.testimonial-item',
      '.faq-item',
      '.credential',
      '.stat-item'
    ];
    SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.setAttribute('data-premium-card', '');
      });
    });
  }

  // ═══ 4b. Auto-tag sections for 3D scroll reveal ═══
  function autoTag3DReveal() {
    const SKIP = ['hero', 'marquee-section', 'global-loader'];
    document.querySelectorAll('section').forEach((sec) => {
      if (SKIP.some(cls => sec.classList.contains(cls))) return;
      if (!sec.hasAttribute('data-3d-reveal')) sec.setAttribute('data-3d-reveal', '');
    });
  }

  // ═══ 5. Stagger reveal — real grids ═══
  function autoStaggerGrids() {
    const GRID_SELECTORS = [
      '.servicios-grid',
      '.properties-scroll',
      '.testimonials-content',
      '.stats-section',
      '.faq-list',
      '.cta-buttons',
      '.hero-cta-group',
      '.about-credentials',
      '.footer-content'
    ];

    GRID_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(grid => {
        [...grid.children].forEach((child, i) => {
          if (!child.hasAttribute('data-stagger')) {
            child.setAttribute('data-stagger', '');
            child.style.setProperty('--i', i);
          }
        });
      });
    });

    // Section titles → underline reveal
    document.querySelectorAll('.section-title, h2.section-title').forEach(el => {
      el.classList.add('premium-section-underline');
      el.setAttribute('data-stagger', '');
    });

    // Generic fade-in elements
    document.querySelectorAll('.fade-in').forEach(el => {
      if (!el.hasAttribute('data-stagger')) el.setAttribute('data-stagger', '');
    });

    // Section headers/subtitles
    document.querySelectorAll(
      'section .hero-headline, section .hero-subtitle, section .hero-urgency, ' +
      '.testimonials-header > *, .properties-header > *'
    ).forEach((el, i) => {
      if (!el.hasAttribute('data-stagger')) {
        el.setAttribute('data-stagger', '');
        el.style.setProperty('--i', i);
      }
    });
  }

  // ═══ 6. Reveal observer ═══
  function setupRevealObserver() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-stagger]').forEach(el => el.classList.add('visible'));
      document.querySelectorAll('.premium-section-underline').forEach(el => el.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('[data-stagger], .premium-section-underline, [data-3d-reveal]').forEach(el => obs.observe(el));
  }

  // ═══ 7. Scroll progress ═══
  function setupScrollProgress() {
    const bar = document.querySelector('.scroll-progress');
    if (!bar) return;
    const update = () => {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      bar.style.width = ((h.scrollTop / max) * 100) + '%';
    };
    addEventListener('scroll', update, { passive: true });
    update();
  }

  // ═══ 8. Page curtain reveal ═══
  function setupCurtainReveal() {
    const curtain = document.querySelector('.page-curtain');
    if (!curtain) return;
    const reveal = () => setTimeout(() => curtain.classList.add('hidden'), 600);
    if (document.readyState === 'complete') reveal();
    else window.addEventListener('load', reveal, { once: true });
  }

  // ═══ 9. Magnetic ═══
  function setupMagnetic() {
    if (reduce || !isFinePointer) return;
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      btn.addEventListener('pointermove', (ev) => {
        const r = btn.getBoundingClientRect();
        const mx = (ev.clientX - r.left - r.width / 2) * 0.22;
        const my = (ev.clientY - r.top - r.height / 2) * 0.22;
        btn.style.setProperty('--mx', mx + 'px');
        btn.style.setProperty('--my', my + 'px');
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  }

  // ═══ 10. Counter animation — auto-detect numeric .stat-item h3 ═══
  function setupAutoCounters() {
    const stats = document.querySelectorAll(
      '.stat-item h3, .stat-item .stat-number, .credential-value, [data-counter]'
    );
    if (!stats.length) return;
    if (!('IntersectionObserver' in window)) return;

    const parseTarget = (el) => {
      // Use data-counter if explicitly set
      if (el.dataset.counter) {
        return {
          value: parseFloat(el.dataset.counter),
          prefix: el.dataset.prefix || '',
          suffix: el.dataset.suffix || ''
        };
      }
      // Auto-parse from text: "+100" → prefix="+", value=100
      const text = el.textContent.trim();
      const m = text.match(/^([+\-]?)\s*(\d+(?:[.,]\d+)?)\s*(.*)$/);
      if (!m) return null;
      return {
        value: parseFloat(m[2].replace(',', '.')),
        prefix: m[1] || '',
        suffix: m[3] || ''
      };
    };

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const parsed = parseTarget(el);
        if (!parsed) { obs.unobserve(el); return; }
        const { value, prefix, suffix } = parsed;
        // Apply gradient shine
        el.setAttribute('data-counter-shine', '');
        if (reduce) {
          el.textContent = prefix + value + suffix;
          obs.unobserve(el);
          return;
        }
        const dur = 1500, start = performance.now();
        const ease = t => 1 - Math.pow(1 - t, 3);
        (function tick(now) {
          const t = Math.min(1, (now - start) / dur);
          el.textContent = prefix + Math.round(value * ease(t)) + suffix;
          if (t < 1) requestAnimationFrame(tick);
        })(start);
        obs.unobserve(el);
      });
    }, { threshold: 0.4 });
    stats.forEach(c => obs.observe(c));
  }

  // ═══ 11. Sticky-scroll nav state ═══
  function setupNavScroll() {
    const nav = document.querySelector('nav, header.nav, .navbar, header[class*="nav"]');
    if (!nav) return;
    const onScroll = () => {
      if (scrollY > 24) nav.classList.add('nav-scrolled');
      else nav.classList.remove('nav-scrolled');
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ═══ 12. Property images: hover zoom host ═══
  function tagPropertyImages() {
    document.querySelectorAll('.property-card').forEach(card => {
      card.setAttribute('data-zoom-host', '');
      const img = card.querySelector('.property-image, img');
      if (img) img.setAttribute('data-zoom-img', '');
    });
  }

  // ═══ 13. GHL Booking Modal ═══
  const GHL_BOOKING_URL = 'https://api.leadconnectorhq.com/widget/booking/zIyWHKskr64sDGC3y2kI';

  function ensureBookingModal() {
    if (document.querySelector('.booking-modal')) return;
    const m = document.createElement('div');
    m.className = 'booking-modal';
    m.setAttribute('aria-hidden', 'true');
    m.innerHTML = `
      <div class="booking-modal-box" role="dialog" aria-label="Agendar llamada con Diego">
        <button class="booking-modal-close" aria-label="Cerrar">×</button>
        <iframe src="${GHL_BOOKING_URL}" loading="lazy" allow="clipboard-write" title="Agendar llamada"></iframe>
      </div>
    `;
    document.body.appendChild(m);

    const close = () => {
      m.classList.remove('visible');
      m.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    m.querySelector('.booking-modal-close').addEventListener('click', close);
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && m.classList.contains('visible')) close();
    });
  }

  function setupBookingTriggers() {
    document.body.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-action="open-booking"]');
      if (!trigger) return;
      e.preventDefault();
      const m = document.querySelector('.booking-modal');
      if (!m) return;
      m.classList.add('visible');
      m.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      // Track event if analytics available
      if (window.gtag) gtag('event', 'open_booking', { method: 'modal' });
      if (window.fbq)  fbq('track', 'Schedule');
    });
  }

  // ═══ 14. Sticky Mobile CTA ═══
  function ensureStickyMobileCTA() {
    if (document.querySelector('.sticky-mobile-cta')) return;
    if (innerWidth > 768) return; // injected only when mobile viewport
    const bar = document.createElement('div');
    bar.className = 'sticky-mobile-cta';
    bar.innerHTML = `
      <div class="sticky-mobile-cta-row">
        <a href="https://wa.me/5491157274477?text=Hola%20Diego%2C%20quiero%20una%20consulta." class="smc-wa" target="_blank" rel="noopener" aria-label="WhatsApp">
          💬 WhatsApp
        </a>
        <a href="#" class="smc-call" data-action="open-booking" aria-label="Agendar llamada">
          📅 Agendar
        </a>
      </div>
    `;
    document.body.appendChild(bar);
  }

  function setupStickyMobileCTA() {
    const bar = document.querySelector('.sticky-mobile-cta');
    if (!bar) return;
    const onScroll = () => {
      const h = document.documentElement;
      const pct = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      if (pct > 0.18) bar.classList.add('visible');
      else bar.classList.remove('visible');
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ═══ 15. Exit Intent Popup (desktop only, single-shot per session) ═══
  function ensureExitIntent() {
    if (document.querySelector('.exit-intent-overlay')) return;
    if (innerWidth <= 900) return; // desktop only
    const overlay = document.createElement('div');
    overlay.className = 'exit-intent-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="exit-intent-box" role="dialog" aria-label="Tasación gratuita">
        <button class="exit-intent-close" aria-label="Cerrar">×</button>
        <div class="exit-intent-eyebrow">⚡ Antes de irte</div>
        <h2 class="exit-intent-title">Tasación profesional<br><em>gratis en 24 horas</em></h2>
        <p class="exit-intent-sub">Sin compromiso. Te paso un análisis comparativo de mercado real con datos de operaciones cerradas en tu zona.</p>
        <a href="#" class="exit-intent-cta" data-action="open-booking">📅 Reservar 15 minutos con Diego →</a>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.classList.remove('visible');
      overlay.setAttribute('aria-hidden', 'true');
      sessionStorage.setItem('exitIntentDismissed', '1');
    };
    overlay.querySelector('.exit-intent-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  function setupExitIntent() {
    if (innerWidth <= 900) return;
    if (sessionStorage.getItem('exitIntentDismissed')) return;
    if (sessionStorage.getItem('exitIntentShown')) return;

    let armed = false;
    setTimeout(() => { armed = true; }, 8000); // arm after 8s on page

    document.addEventListener('mouseleave', (e) => {
      if (!armed) return;
      if (e.clientY > 0) return; // only when leaving from the top
      if (sessionStorage.getItem('exitIntentShown')) return;
      const overlay = document.querySelector('.exit-intent-overlay');
      if (!overlay) return;
      overlay.classList.add('visible');
      overlay.setAttribute('aria-hidden', 'false');
      sessionStorage.setItem('exitIntentShown', '1');
      if (window.gtag) gtag('event', 'exit_intent_shown');
    });
  }

  // ═══ 16. Lead Magnet form handler ═══
  function setupLeadMagnetForm() {
    const form = document.querySelector('.lead-magnet-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]').value.trim();
      if (!email) return;
      const btn = form.querySelector('button');
      btn.textContent = 'Enviando...';
      btn.disabled = true;

      // Fire-and-forget webhook (optional; PDF download works regardless)
      const endpoint = form.dataset.endpoint || '';
      if (endpoint && !endpoint.startsWith('PEGAR_AQUI')) {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            source: 'lead-magnet-pdf',
            asset: 'por-que-tu-propiedad-no-se-vende',
            timestamp: new Date().toISOString(),
            url: location.href
          })
        }).catch(err => console.warn('[lead-magnet] webhook fail:', err));
      }

      if (window.fbq)  fbq('track', 'Lead', { content_name: 'pdf-por-que-no-se-vende' });
      if (window.gtag) gtag('event', 'generate_lead', { method: 'lead_magnet_pdf' });

      // Always: trigger PDF download
      const pdfUrl = '/por-que-no-se-vende.pdf';
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = 'Por-que-tu-propiedad-no-se-vende-Diego-Giannini.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Replace form with success message
      form.innerHTML = `
        <div style="padding:20px 24px;background:rgba(50,229,167,0.1);border:1px solid rgba(50,229,167,0.3);border-radius:14px;font-family:'Inter',sans-serif;font-size:14px;line-height:1.5;">
          <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;letter-spacing:0.8px;color:#32E5A7;margin-bottom:6px;">✓ ¡Listo, ${email}!</div>
          <div style="color:rgba(255,255,255,0.85);font-size:13px;">El PDF se está descargando. Si no se abre solo,
            <a href="${pdfUrl}" download style="color:#6AA0FF;text-decoration:underline;font-weight:600;">descargalo desde acá →</a>
          </div>
        </div>
      `;
    });
  }

  // ═══ INIT ═══
  function init() {
    // ensureHeroPhotoBackground(); // photo now set directly via .hero::before in index.html
    setupHeroPhotoParallax();
    ensureCurtain();
    ensureProgressBar();
    ensureBookingModal();
    ensureStickyMobileCTA();
    ensureExitIntent();
    wrapServiceCardsForFlip();
    autoTag3DReveal();
    autoTagCTAs();
    autoTagWAFloats();
    tagPremiumCards();
    autoStaggerGrids();
    tagPropertyImages();
    setupRevealObserver();
    setupScrollProgress();
    setupCurtainReveal();
    setupMagnetic();
    setupAutoCounters();
    setupNavScroll();
    setupBookingTriggers();
    setupStickyMobileCTA();
    setupExitIntent();
    setupLeadMagnetForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
