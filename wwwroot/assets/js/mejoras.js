(() => {
  'use strict';
  if (document.documentElement.dataset.glhfEditorial === 'ready') return;
  document.documentElement.dataset.glhfEditorial = 'ready';

  const currentScriptUrl = document.currentScript?.src || '';
  const asset = (path) => currentScriptUrl ? new URL(path, currentScriptUrl).href : path;
  const repoIssues = 'https://github.com/Stefannysj/GLHF/issues/new';
  const noMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const logo = asset('../Logo_GgWp.png');
  const sourceUrl = 'https://www.bnl.gov/about/history/firstvideo.php';

  const oldHeader = document.querySelector('.site-header');
  if (oldHeader) {
    const newHeader = document.createElement('header');
    newHeader.className = 'site-header glhf-header';
    newHeader.setAttribute('aria-label', 'Cabecera de GLHF');
    newHeader.innerHTML = `
      <a class="brand" href="#inicio" aria-label="GLHF, volver al inicio">
        <img src="${logo}" alt="" width="48" height="48" />
        <span>GLHF<span class="brand-subtitle">ARCHIVO DE VIDEOJUEGOS</span></span>
      </a>
      <button class="glhf-menu-toggle" type="button" aria-label="Abrir menú" aria-controls="glhf-menu" aria-expanded="false">
        <span aria-hidden="true">☰</span>
      </button>
      <nav id="glhf-menu" class="main-nav glhf-menu" aria-label="Navegación principal">
        <a href="#historia">Historia</a><a href="#revoluciones">Revoluciones</a>
        <a href="#coleccion">Colección</a><a href="#bitacora">Bitácora</a>
        <a href="#futuro">Lo que viene</a>
      </nav>
      <span class="edition">ARCHIVO / 2026</span>`;
    oldHeader.replaceWith(newHeader);
    const toggle = newHeader.querySelector('.glhf-menu-toggle');
    const menu = newHeader.querySelector('#glhf-menu');
    const setOpen = (open, restoreFocus = false) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      toggle.querySelector('span').textContent = open ? '×' : '☰';
      menu.classList.toggle('is-open', open);
      if (open) menu.querySelector('a')?.focus();
      if (!open && restoreFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (event) => { if (event.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        event.preventDefault(); setOpen(false, true);
      }
    });
    document.addEventListener('pointerdown', event => {
      if (toggle.getAttribute('aria-expanded') === 'true' && !newHeader.contains(event.target)) setOpen(false);
    });
    matchMedia('(min-width: 901px)').addEventListener?.('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  // Detach the auto-moving hero initialized by the legacy site.js without
  // removing the Blazor mounting placeholders from the new copy.
  const originalHero = document.querySelector('.hero');
  if (originalHero) {
    const hero = originalHero.cloneNode(true);
    originalHero.replaceWith(hero);
    hero.removeAttribute('data-hero-position');
    hero.removeAttribute('data-hero-auto-state');
    hero.classList.add('glhf-hero');
    const toolbar = hero.querySelector('.hero-toolbar');
    if (toolbar) { toolbar.hidden = true; toolbar.setAttribute('aria-hidden', 'true'); }
    hero.querySelector('.hero-axis')?.remove();
    const heroActions = hero.querySelector('.hero-actions');
    if (heroActions) heroActions.innerHTML = `<a class="button primary" href="#historia">Entrar a la historia</a><a class="button glhf-secondary" href="#coleccion">Explorar la colección</a>`;
    const eyebrow = hero.querySelector('.hero-copy .eyebrow');
    if (eyebrow) eyebrow.textContent = 'MUSEO DIGITAL · ARCHIVO 1958—2026';
    const title = hero.querySelector('h1');
    if (title) title.innerHTML = 'LA HISTORIA<br>SE <span>JUEGA.</span>';
  }

  const main = document.querySelector('main#contenido') || document.querySelector('main');
  const archiveBrief = main?.querySelector('.archive-brief');
  if (main && archiveBrief && !document.getElementById('bitacora')) {
    const cover = document.createElement('div');
    cover.className = 'glhf-home-sections';
    cover.innerHTML = `
      <section class="glhf-latest section-wrap" id="novedad" aria-labelledby="featured-title">
        <div class="glhf-section-top"><p class="eyebrow">EDICIÓN / ACTUALIDAD</p><span class="glhf-index">01 — NOVEDAD DESTACADA</span></div>
        <article class="glhf-feature">
          <div class="glhf-feature-visual"><img src="${logo}" width="800" height="800" loading="lazy" decoding="async" alt="Identidad gráfica del archivo GLHF" /></div>
          <div class="glhf-feature-copy"><span class="glhf-tag">EN REVISIÓN</span><time datetime="2026-10-08">08 OCT 2026</time>
            <h2 id="featured-title">EL ARCHIVO SIGUE CRECIENDO.</h2>
            <p>Un inicio editorial para registrar lo nuevo, explicar las mejoras y permitir que cada visitante conozca cómo evoluciona el museo.</p>
            <a class="button primary" href="#bitacora">Consultar novedades</a>
          </div>
        </article>
      </section>
      <section class="glhf-journal section-wrap" id="bitacora" aria-labelledby="bitacora-title">
        <div class="glhf-heading"><div><p class="eyebrow">DIARIO DE CAMPO / GLHF</p><h2 id="bitacora-title" tabindex="-1">BITÁCORA DE GLHF.</h2></div>
          <p>Contenido nuevo, mejoras técnicas y correcciones del archivo.</p></div>
        <div id="glhf-posts" class="glhf-posts" aria-live="polite"><p>Consultando entradas…</p></div>
        <button class="glhf-outline" id="glhf-show-all" type="button" hidden>Ver todas</button>
        <p id="glhf-posts-error" role="status" hidden>No se pudo consultar la bitácora. El archivo histórico continúa disponible.</p>
      </section>
      <section class="glhf-pick section-wrap" id="ficha-del-mes" aria-labelledby="glhf-pick-title">
        <div class="glhf-section-top"><p class="eyebrow">PIEZA SELECCIONADA / ARCHIVO</p><span class="glhf-index">03 — FICHA DEL MES</span></div>
        <div class="glhf-pick-body"><figure class="glhf-pick-cover">
            <img id="glhf-month-image" src="${logo}" alt="Identidad visual de GLHF" width="800" height="600" loading="lazy" decoding="async" />
            <figcaption id="glhf-pick-credit">Imagen de archivo. Consulta el crédito de la ficha.</figcaption>
          </figure>
          <div><span class="glhf-tag">1958 / ORÍGENES</span><h2 id="glhf-pick-title">TENNIS FOR TWO.</h2>
            <p>Un osciloscopio se convirtió en pantalla de juego. Brookhaven National Laboratory documenta este experimento de 1958.</p>
            <p class="glhf-small">Fuente: Brookhaven National Laboratory, «The First Video Game?» (EN).</p>
            <a class="button primary" href="#glhf-tennis-ficha">Ver ficha</a>
            <a class="glhf-source-link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">Consultar fuente (EN) ↗</a>
          </div>
        </div>
      </section>`;
    while (cover.firstChild) main.insertBefore(cover.firstChild, archiveBrief);
    cover.remove();
  }

  // Keep the historical archive intact and adapt its previous drag instructions.
  const howTo = document.querySelector('.archive-reading-key');
  const oldDragInstruction = howTo?.querySelector('p');
  if (oldDragInstruction) oldDragInstruction.innerHTML = '<span>01</span><strong>EXPLORA</strong> Usa el menú fijo para consultar las secciones del museo.';

  const gallery = document.querySelector('#coleccion .game-grid');
  if (gallery && !document.getElementById('glhf-era-filter')) {
    const container = document.createElement('div');
    container.className = 'glhf-filter';
    container.innerHTML = `<label for="glhf-era-filter">Filtrar colección por era</label>
      <select id="glhf-era-filter"><option value="all">Todas las eras</option>
        <option value="era-1958">1958–1969</option><option value="era-1970">1970–1979</option>
        <option value="era-1980">1980–1989</option><option value="era-1990">1990–1999</option>
        <option value="era-2000">2000–2009</option><option value="era-2010">2010–2019</option>
        <option value="era-2020">2020–2026</option></select>
      <span id="glhf-filter-count" role="status"></span>`;
    gallery.before(container);
    const empty = document.createElement('p'); empty.id = 'glhf-no-results'; empty.hidden = true;
    empty.textContent = 'No hay fichas para este período.'; gallery.after(empty);
  }

  // Retain images, titles and sources; label contextual photographs honestly.
  const games = Array.from(document.querySelectorAll('.game-card[data-game-era]'));
  games.forEach(card => {
    const img = card.querySelector('.game-media img');
    if (img) {
      if (!img.hasAttribute('width')) img.width = 800;
      if (!img.hasAttribute('height')) img.height = 600;
      img.sizes = '(max-width: 619px) 100vw, (max-width: 1149px) 50vw, 33vw';
    }
    const name = card.querySelector('h3')?.textContent?.trim();
    if (name === 'Tennis for Two') {
      card.id = 'glhf-tennis-ficha';
      const monthImage = document.getElementById('glhf-month-image');
      if (img && monthImage) {
        monthImage.src = img.currentSrc || img.src;
        monthImage.alt = img.alt || 'Tennis for Two mostrado en un osciloscopio';
        monthImage.setAttribute('referrerpolicy', 'no-referrer');
        monthImage.setAttribute('fetchpriority', 'low');
      }
      const caption = document.getElementById('glhf-pick-credit');
      const credit = card.querySelector('.media-credit')?.textContent?.trim();
      const link = card.querySelector('.game-media figcaption a')?.href;
      if (caption) {
        caption.textContent = `${credit || 'Archivo fotográfico'} · `;
        if (link) { const a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Crédito/licencia ↗'; caption.append(a); }
      }
    }
    if (['Doom', 'World of Warcraft', 'Minecraft', 'Genshin Impact', 'Tetris'].includes(name)) {
      const kind = card.querySelector('.game-media figcaption span');
      if (kind && !kind.textContent.includes('contextual')) kind.textContent += ' · Imagen contextual';
    }
  });
  const filter = document.getElementById('glhf-era-filter');
  const count = document.getElementById('glhf-filter-count');
  const empty = document.getElementById('glhf-no-results');
  const updateFilter = () => {
    let visible = 0;
    games.forEach(card => {
      const show = filter.value === 'all' || card.dataset.gameEra === filter.value;
      card.hidden = !show;
      if (show) visible++;
    });
    if (count) count.textContent = `${visible} ${visible === 1 ? 'ficha' : 'fichas'} disponibles`;
    if (empty) empty.hidden = visible > 0;
  };
  filter?.addEventListener('change', updateFilter);
  if (filter) updateFilter();

  // Bibliographic links in milestones go directly to the already cited source.
  const sources = new Map();
  document.querySelectorAll('#fuentes li[id^="source-"]').forEach(item => {
    const external = item.querySelector('a[href^="https://"]');
    if (external) sources.set(item.id, external.href);
  });
  document.querySelectorAll('a[href^="#source-"], a[data-fragment^="#source-"]').forEach(link => {
    const fragment = link.getAttribute('href')?.startsWith('#source-') ? link.getAttribute('href') : link.dataset.fragment;
    const url = sources.get(fragment?.slice(1));
    if (url && link.closest('.refs')) {
      link.href = url; link.removeAttribute('data-fragment');
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `${link.textContent.trim()}, fuente externa (abre una nueva pestaña)`);
      link.textContent = `${link.textContent.trim()} ↗`;
    }
  });
  const goSource = () => {
    let hash; try { hash = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!hash.startsWith('source-')) return;
    const target = document.getElementById(hash);
    const details = target?.closest('details');
    if (!target || !details) return;
    details.open = true;
    target.tabIndex = -1;
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      target.focus({ preventScroll: true });
    });
  };
  addEventListener('hashchange', goSource); goSource();

  if (main && !document.getElementById('accesibilidad')) {
    const after = document.createElement('div');
    after.className = 'glhf-end-sections';
    after.innerHTML = `
      <section class="glhf-about section-wrap" id="acerca" aria-labelledby="glhf-about-title">
        <div class="glhf-about-grid"><img src="${logo}" width="800" height="800" loading="lazy" alt="Identidad visual del museo GLHF" />
          <div><p class="eyebrow">DETRÁS DEL ARCHIVO</p><h2 id="glhf-about-title">QUIÉN HACE GLHF.</h2>
            <p>GLHF es un proyecto editorial independiente desarrollado por Stefanny, dedicado a documentar y presentar en español la historia de los videojuegos.</p>
            <p>Su criterio editorial consiste en contextualizar los hitos, enlazar fuentes verificables y distinguir las imágenes de época de las fotografías meramente contextuales. El recorrido es una selección, no un ranking.</p>
          </div>
        </div>
      </section>
      <section class="glhf-contact section-wrap" id="contacto" aria-labelledby="glhf-contact-title">
        <div><p class="eyebrow">CONSTRUYAMOS EL ARCHIVO</p><h2 id="glhf-contact-title">ESCRÍBENOS.</h2>
          <p>¿Detectaste un error? ¿Falta un videojuego? Puedes abrir una incidencia pública e incluir una fuente para verificar la sugerencia.</p>
        </div>
        <a class="button primary" href="${repoIssues}" target="_blank" rel="noopener noreferrer">Reportar o sugerir en GitHub ↗</a>
      </section>
      <section class="glhf-accessibility section-wrap" id="accesibilidad" aria-labelledby="glhf-accessibility-title">
        <p class="eyebrow">ACCESO SIN BARRERAS</p><h2 id="glhf-accessibility-title">DECLARACIÓN DE ACCESIBILIDAD.</h2>
        <p>GLHF trabaja para alinearse con WCAG 2.2 AA: navegación por teclado, foco visible, control de movimientos y adaptación a pantallas pequeñas. La conformidad completa aún no está certificada y requiere auditorías adicionales con tecnologías asistivas.</p>
        <p>Si encuentras una barrera de acceso, <a href="${repoIssues}" target="_blank" rel="noopener noreferrer">comunícala mediante GitHub Issues ↗</a>.</p>
      </section>`;
    while (after.firstChild) main.append(after.firstChild);
    after.remove();
  }

  const footer = document.querySelector('.site-footer');
  if (footer) {
    footer.classList.add('glhf-footer');
    const status = footer.querySelector('#runtime-status');
    // Retain status node for Blazor bootstrap and original monitoring.
    footer.innerHTML = `<a class="brand footer-brand" href="#inicio" aria-label="Volver al inicio de GLHF">
      <img src="${logo}" width="44" height="44" loading="lazy" alt="" />
      <span>GLHF<span class="brand-subtitle">LA HISTORIA SE JUEGA.</span></span></a>
      <div><nav aria-label="Enlaces del pie de página"><a href="#historia">Historia</a><a href="#coleccion">Colección</a>
        <a href="#bitacora">Bitácora</a><a href="#fuentes">Fuentes</a><a href="#accesibilidad">Accesibilidad</a>
        <a href="#contacto">Contacto</a></nav>
        <p>Créditos y licencias: consulta la atribución de cada ficha y su enlace a Wikimedia Commons.</p>
        <p>© 2026 GLHF · Edición y desarrollo: Stefanny.</p></div>
      <a class="back-top" href="#inicio" aria-label="Volver arriba">↑</a>`;
    if (status) { status.hidden = true; footer.append(status); }
  }

  // The canonical URL is already encoded in the existing description; add
  // additional discoverability metadata for browsers. Server-side metadata
  // still requires regeneration of the canonical template in a later iteration.
  const addMeta = (selector, attr, name, content) => {
    if (document.head.querySelector(selector)) return;
    const element = document.createElement('meta'); element.setAttribute(attr, name); element.content = content; document.head.append(element);
  };
  const canonicalUrl = 'https://stefannysj.github.io/GLHF/';
  if (!document.querySelector('link[rel="canonical"]')) {
    const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = canonicalUrl; document.head.append(canonical);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0c0f13');
  addMeta('meta[property="og:title"]', 'property', 'og:title', 'GLHF — La historia se juega');
  addMeta('meta[property="og:description"]', 'property', 'og:description', 'Museo digital de la historia de los videojuegos, 1958–2026.');
  addMeta('meta[property="og:image"]', 'property', 'og:image', canonicalUrl + 'assets/Logo_GgWp.png');
  addMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');

  const posts = document.getElementById('glhf-posts');
  const allButton = document.getElementById('glhf-show-all');
  const postsError = document.getElementById('glhf-posts-error');
  const labels = { contenido: 'CONTENIDO', mejora: 'MEJORA', correccion: 'CORRECCIÓN' };
  let entries = [];
  let showAll = false;
  function renderPosts() {
    if (!posts) return;
    posts.replaceChildren();
    const selected = entries.slice(0, showAll ? entries.length : 3);
    for (const item of selected) {
      const article = document.createElement('article'); article.className = 'glhf-post';
      const image = document.createElement('img');
      // Restrict to the known, same-origin editorial logo; never trust arbitrary JSON HTML.
      image.src = logo; image.width = 800; image.height = 600; image.loading = 'lazy';
      image.decoding = 'async'; image.alt = 'Archivo GLHF'; image.className = 'glhf-post-image';
      const metadata = document.createElement('div'); metadata.className = 'glhf-post-meta';
      const tag = document.createElement('span'); tag.className = 'glhf-tag'; tag.textContent = labels[item.etiqueta] || 'ACTUALIZACIÓN';
      const time = document.createElement('time'); time.dateTime = item.fecha;
      time.textContent = new Date(item.fecha + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
      metadata.append(tag, time);
      const heading = document.createElement('h3'); heading.textContent = item.titulo;
      const p = document.createElement('p'); p.textContent = item.resumen;
      const a = document.createElement('a'); a.textContent = 'Leer actualización';
      const href = String(item.enlace || '#bitacora');
      a.href = href.startsWith('#') || /^https:\/\//.test(href) ? href : '#bitacora';
      if (a.href.startsWith('https://') && new URL(a.href).origin !== location.origin) {
        a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent += ' ↗';
      }
      article.append(image, metadata, heading, p, a);
      posts.append(article);
    }
    if (allButton) {
      allButton.hidden = entries.length <= 3;
      allButton.textContent = showAll ? 'Mostrar las 3 últimas' : `Ver todas (${entries.length})`;
    }
  }
  const fallback = [
    { titulo: 'Nueva portada editorial de GLHF', fecha: '2026-10-08', etiqueta: 'mejora', resumen: 'Nueva portada en revisión, con bitácora y una ficha destacada.', enlace: '#novedad' },
    { titulo: 'Colección organizada por eras', fecha: '2026-10-08', etiqueta: 'mejora', resumen: 'La colección incluye un filtro por períodos.', enlace: '#coleccion' },
    { titulo: 'Fuentes y accesibilidad más visibles', fecha: '2026-10-08', etiqueta: 'correccion', resumen: 'Mejoras en consulta de fuentes y en el canal de sugerencias.', enlace: '#accesibilidad' },
    { titulo: 'Edición histórica del archivo', fecha: '2026-09-19', etiqueta: 'contenido', resumen: 'Siete eras y catorce fichas con referencias.', enlace: '#historia' }
  ];
  const applyEntries = data => {
    if (!Array.isArray(data)) throw new Error('Se esperaba un listado JSON');
    entries = data.filter(item => item && item.titulo && item.fecha && item.etiqueta && item.resumen)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    renderPosts();
  };
  if (posts) {
    const url = asset('../data/bitacora.json');
    if (location.protocol === 'file:') {
      applyEntries(fallback); // file:// blocks fetch(); published HTTPS reads the JSON.
      if (postsError) { postsError.hidden = false; postsError.textContent = 'Vista local: mostrando entradas de ejemplo. En GitHub Pages se consulta bitacora.json.'; }
    } else {
      fetch(url)
        .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
        .then(applyEntries)
        .catch(error => {
          applyEntries(fallback);
          if (postsError) { postsError.hidden = false; postsError.textContent = 'No se pudo cargar bitacora.json; se muestran las entradas incluidas con esta versión.'; }
          console.warn('GLHF: error al cargar bitácora', error);
        });
    }
    allButton?.addEventListener('click', () => {
      showAll = !showAll; renderPosts();
      if (!showAll) document.getElementById('bitacora-title')?.focus({ preventScroll: false });
    });
  }

  // User preference: disable movement in this editorial layer, especially for
  // reduced-motion users and coarse/touch pointer devices.
  document.documentElement.classList.add('glhf-editorial-ready');
  if (noMotion()) document.documentElement.classList.remove('motion-ready');
})();
