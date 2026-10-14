/* GLHF - portada editorial, ES/EN y bitacora. No altera el catalogo historico. */
(() => {
  'use strict';
  const documentRoot = document.documentElement;
  if (documentRoot.dataset.glhfEditorial === 'final') return;
  const scriptUrl = document.currentScript?.src || document.querySelector('script[src*="mejoras.js"]')?.src || location.href;
  const pathFromJs = value => new URL(value, scriptUrl).href;
  const legalUrl = name => pathFromJs(`../../${name}.html`);
  const issueUrl = 'https://github.com/Stefannysj/GoodLuckHaveFun/issues/new';
  const repoUrl = 'https://github.com/Stefannysj/GoodLuckHaveFun';
  const sourceUrl = 'https://www.bnl.gov/about/history/firstvideo.php';
  const motionOff = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const logoUrl = pathFromJs('../Logo_GgWp.png');
  const imgUrl = name => pathFromJs(`../images/${name}.svg`);
  const dateFormat = (value, language) => new Date(`${value}T12:00:00`).toLocaleDateString(language === 'es' ? 'es-PE' : 'en-US', { year:'numeric',month:'short',day:'numeric' });
  const labels = {
    es: { contenido:'CONTENIDO', noticia:'NOTICIA', mejora:'MEJORA', correccion:'CORRECCIÓN' },
    en: { contenido:'CONTENT', noticia:'NEWS', mejora:'IMPROVEMENT', correccion:'FIX' }
  };
  const dict = JSON.parse(document.getElementById('glhf-editorial-copy')?.textContent || '{}');
  if (!dict.es || !dict.en) throw new Error('GLHF: falta Content/editorial.json');
  dict.es.filterCount = count => `${count} ${count === 1 ? 'ficha' : 'fichas'} disponibles`;
  dict.en.filterCount = count => `${count} ${count === 1 ? 'record' : 'records'} available`;
  let language = 'es';
  try { language = localStorage.getItem('glhf:language') === 'en' ? 'en' : 'es'; } catch { /* Storage may be blocked. */ }
  const entries = JSON.parse(document.getElementById('glhf-bitacora-copy')?.textContent || '[]')
    .filter(x => x && typeof x.titulo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') && typeof x.resumen === 'string')
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  let showAll = false;

  const oldHeader = document.querySelector('header.site-header');
  const oldHero = document.querySelector('main .hero');
  const main = document.querySelector('main#contenido');
  const originalFooter = document.querySelector('footer.site-footer');
  if (!oldHeader || !oldHero || !main || !originalFooter) return;

  documentRoot.dataset.glhfEditorial = 'final';
  document.body.classList.add('glhf-light');
  const header = document.createElement('header');
  header.className = 'site-header glhf-header';
  header.innerHTML = `
    <a class="brand" href="#inicio" aria-label="GLHF, ir al inicio">
      <img src="${logoUrl}" width="42" height="42" alt="" />
      <span>GLHF<span class="brand-subtitle" id="glhf-brand-subtitle"></span></span>
    </a>
    <nav id="glhf-menu" class="main-nav glhf-menu" aria-label="Navegación principal">
      <a href="#historia"></a><a href="#revoluciones"></a><a href="#coleccion"></a><a href="#bitacora"></a><a href="#futuro"></a>
    </nav>
    <div class="glhf-head-actions">
      <div class="glhf-lang" role="group" aria-label="Idioma / Language"><button type="button" data-glhf-lang="es" aria-pressed="true" lang="es">ES</button><button type="button" data-glhf-lang="en" aria-pressed="false" lang="en">EN</button></div>
      <button class="glhf-menu-toggle" type="button" aria-expanded="false" aria-controls="glhf-menu" aria-label="Abrir menú"><span aria-hidden="true">☰</span></button>
    </div><span id="glhf-language-live" class="sr-only" role="status" aria-live="polite"></span>`;
  oldHeader.replaceWith(header);

  const menu = header.querySelector('.glhf-menu');
  const menuButton = header.querySelector('.glhf-menu-toggle');
  const setMenuOpen = (open, focusTrigger = false) => {
    menu.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? dict[language].closeMenu : dict[language].openMenu);
    menuButton.querySelector('span').textContent = open ? '×' : '☰';
    if (open) menu.querySelector('a')?.focus();
    if (!open && focusTrigger) menuButton.focus();
  };
  menuButton.addEventListener('click', () => setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', event => { if (event.target.closest('a')) setMenuOpen(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') { event.preventDefault(); setMenuOpen(false,true); } });
  document.addEventListener('pointerdown', event => { if (!header.contains(event.target) && menuButton.getAttribute('aria-expanded') === 'true') setMenuOpen(false); });
  window.matchMedia('(min-width: 891px)').addEventListener?.('change', event => { if (event.matches) setMenuOpen(false); });

  // Replace the original moving hero (and its extra logo) with a semantic, static cover.
  const hero = document.createElement('section');
  hero.className = 'glhf-home glhf-top-hero';
  hero.setAttribute('aria-labelledby','hero-title');
  // Preserve the Blazor interop mount point, but never expose moving controls.
  const legacyHeroControls = oldHero.querySelector('#hero-controls');
  if (legacyHeroControls) {
    legacyHeroControls.hidden = true;
    legacyHeroControls.setAttribute('aria-hidden','true');
    main.append(legacyHeroControls);
  }
  oldHero.replaceWith(hero);
  const intro = document.createElement('div');
  intro.className = 'glhf-home';
  intro.id = 'glhf-editorial-intro';
  const archiveBrief = main.querySelector('.archive-brief');
  if (archiveBrief) archiveBrief.before(intro);
  else hero.after(intro);

  // The historical DOM is untouched; only its language is marked for screen readers.
  [...main.children].filter(child => child !== hero && child !== intro).forEach(child => child.setAttribute('lang','es'));
  // Keep the original filter and the historical game cards accessible.
  const gameCards = [...document.querySelectorAll('.game-card[data-game-era]')];
  const gallery = document.querySelector('#coleccion .game-grid');
  let filter = document.getElementById('glhf-era-filter');
  if (gallery && !filter) {
    const bar = document.createElement('div');
    bar.className = 'glhf-filter';
    bar.innerHTML = `<label for="glhf-era-filter" id="glhf-filter-label"></label><select id="glhf-era-filter">
       <option value="all"></option><option value="era-1958">1958–1969</option><option value="era-1970">1970–1979</option>
       <option value="era-1980">1980–1989</option><option value="era-1990">1990–1999</option><option value="era-2000">2000–2009</option>
       <option value="era-2010">2010–2019</option><option value="era-2020">2020–2026</option></select><span id="glhf-filter-count" role="status"></span>`;
    gallery.before(bar);
    const none = document.createElement('p'); none.id = 'glhf-no-results'; none.hidden = true;gallery.after(none);
    filter = bar.querySelector('select');
  }
  function updateFilter() {
    if (!filter) return;
    let count = 0;
    for (const card of gameCards) {
      const visible = filter.value === 'all' || card.dataset.gameEra === filter.value;
      card.hidden = !visible;
      if (visible) count++;
    }
    const total = document.querySelector('#glhf-filter-count');
    if (total) total.textContent = dict[language].filterCount(count);
    const none = document.querySelector('#glhf-no-results');
    if (none) { none.hidden = count > 0; none.textContent = dict[language].filterEmpty; }
  }
  filter?.addEventListener('change',updateFilter);
  gameCards.forEach(card => {
    const image = card.querySelector('.game-media img');
    if (image && !image.hasAttribute('width')) image.width = 800;
    if (image && !image.hasAttribute('height')) image.height = 600;
    if (image) image.sizes = '(max-width: 649px) 100vw, (max-width: 1099px) 50vw, 33vw';
    const title = card.querySelector('h3')?.textContent?.trim();
    if (title === 'Tennis for Two') card.id = 'glhf-tennis-ficha';
    if (['Doom','World of Warcraft','Minecraft','Genshin Impact','Tetris'].includes(title)) {
      const kind = card.querySelector('.game-media figcaption span');
      if (kind && !kind.textContent.includes('contextual')) kind.textContent += ' · Imagen contextual';
    }
  });
  const sourceMap = new Map();
  document.querySelectorAll('#fuentes li[id^="source-"]').forEach(li => {
    const source = li.querySelector('a[href^="https://"]');
    if (source) sourceMap.set(li.id, source.href);
  });
  document.querySelectorAll('a[href^="#source-"],a[data-fragment^="#source-"]').forEach(a => {
    if (!a.closest('.refs')) return;
    const ref = a.getAttribute('href')?.startsWith('#source-') ? a.getAttribute('href') : a.dataset.fragment;
    const link = sourceMap.get(ref?.slice(1));
    if (!link) return;
    a.href = link;a.target = '_blank';a.rel = 'noopener noreferrer';a.removeAttribute('data-fragment');
    a.setAttribute('aria-label',`${a.textContent.trim()}, fuente externa`);a.textContent = `${a.textContent.trim()} ↗`;
  });
  const openSource = () => {
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
    if (!id.startsWith('source-')) return;
    const element = document.getElementById(id);
    if (!element) return;
    const parent = element.closest('details');if(parent)parent.open=true;
    element.tabIndex=-1;
    window.requestAnimationFrame(()=>{element.scrollIntoView({block:'center',behavior:'instant'});element.focus({preventScroll:true});});
  };
  addEventListener('hashchange',openSource);openSource();
  const oldDirections = document.querySelector('.archive-reading-key p');
  if (oldDirections) oldDirections.innerHTML = '<span>01</span><strong>EXPLORA</strong> Usa el menú para desplazarte entre las salas del museo.';

  const footer = originalFooter;
  footer.classList.add('glhf-footer');
  const runtimeStatus = footer.querySelector('#runtime-status');
  if (runtimeStatus) runtimeStatus.remove();
  const accessibility = document.createElement('section');
  accessibility.className='glhf-home glhf-section glhf-section--gray glhf-accessibility';
  accessibility.id='accesibilidad';
  main.append(accessibility);

  function validImage(image) {
    if (typeof image !== 'string' || !/^assets\/images\/[a-z0-9_-]+\.(?:svg|png|webp|avif)$/i.test(image))
      return imgUrl('bitacora-diseno');
    return pathFromJs('../../'+image);
  }
  function validLink(link) {
    if (typeof link !== 'string') return '#bitacora';
    if (/^#[a-z0-9_-]+$/i.test(link)) return link;
    try { const url = new URL(link);if(url.protocol==='https:')return url.href; } catch { /* invalid */ }
    return '#bitacora';
  }
  function renderJournal() {
    const root = document.getElementById('glhf-posts');
    const allButton = document.getElementById('glhf-show-all');
    if (!root) return;
    root.replaceChildren();
    const t = dict[language];
    for (const entry of entries.slice(0,showAll?entries.length:3)) {
      const article = document.createElement('article');article.className='glhf-post glhf-reveal glhf-in-view';
      const picture=document.createElement('img');picture.className='glhf-post-image';picture.src=validImage(entry.imagen);
      picture.width=800;picture.height=460;picture.loading='lazy';picture.decoding='async';
      picture.alt=language==='es' ? `Ilustración conceptual para: ${entry.titulo}` : `Conceptual illustration for: ${entry.titulo_en || entry.titulo}`;
      const body=document.createElement('div');body.className='glhf-post-body';
      const meta=document.createElement('div');meta.className='glhf-post-meta';
      const tag=document.createElement('span');tag.className='glhf-post-tag';tag.textContent=labels[language][entry.etiqueta]||'GLHF';
      const date=document.createElement('time');date.dateTime=entry.fecha;date.textContent=dateFormat(entry.fecha,language);
      meta.append(tag,date);
      const title=document.createElement('h3');title.textContent=language==='en'?(entry.titulo_en||entry.titulo):entry.titulo;
      const paragraph=document.createElement('p');paragraph.textContent=language==='en'?(entry.resumen_en||entry.resumen):entry.resumen;
      const a=document.createElement('a');a.className='glhf-inline-link';a.href=validLink(entry.enlace);
      const ext=a.href.startsWith('https:') && new URL(a.href).origin !== location.origin;
      a.textContent=t.blogButton+(ext?' ↗':'');
      if(ext){a.target='_blank';a.rel='noopener noreferrer';}
      body.append(meta,title,paragraph,a);article.append(picture,body);root.append(article);
    }
    if (allButton) {allButton.hidden=entries.length<=3;allButton.textContent=showAll?dict[language].less:`${dict[language].all} (${entries.length})`;}
  }
  const renderHome = () => {
    const t = dict[language];
    hero.innerHTML = `<div class="glhf-shell"><p class="glhf-kicker">${t.heroKicker}</p><h1 id="hero-title">${t.heroTitle}</h1>
      <p class="glhf-lead">${t.heroText}</p><div class="glhf-hero-actions"><a class="glhf-cta" href="#historia">${t.enter}</a><a class="glhf-cta glhf-cta--outline" href="#coleccion">${t.collection}</a></div>
      <div class="glhf-hero-foot" aria-label="GLHF en cifras">${t.heroBadge.map(x=>`<span>${x}</span>`).join('')}</div></div>`;
    intro.innerHTML = `
      <section class="glhf-home glhf-section glhf-section--silver" id="novedad" aria-labelledby="featured-title">
        <div class="glhf-shell"><div class="glhf-section-heading"><p class="glhf-kicker">${t.featureIndex}</p><span class="glhf-section-index">GLHF / 2026</span></div>
          <article class="glhf-feature glhf-reveal"><div class="glhf-feature-visual"><span class="glhf-feature-badge">${t.featureMark}</span>
              <img src="${imgUrl('archivo-portada')}" width="1200" height="700" alt="${language==='es'?'Ilustración original: equipo de videojuegos antiguo':'Original illustration: a vintage video game setup'}" fetchpriority="high" decoding="async" /></div>
            <div class="glhf-feature-copy"><span class="glhf-post-tag">${t.featureTag}</span><time class="glhf-feature-date" datetime="${entries[0]?.fecha || '2026-10-08'}">${dateFormat(entries[0]?.fecha || '2026-10-08',language)}</time>
              <h2 id="featured-title">${t.featureHeading}</h2><p>${t.featureText}</p><a class="glhf-cta glhf-cta--red" href="#bitacora">${t.featureButton}</a></div></article></div>
      </section>
      <aside class="glhf-home glhf-newsstrip" aria-label="${language==='es'?'Seguir novedades':'Follow updates'}"><div class="glhf-shell glhf-newsstrip-inner">
        <div><strong>${t.followHeading}</strong><p>${t.followText}</p></div><a class="glhf-cta" href="${repoUrl}" target="_blank" rel="noopener noreferrer">${t.followButton}</a></div></aside>
      <section class="glhf-home glhf-section glhf-section--white" id="bitacora" aria-labelledby="bitacora-title"><div class="glhf-shell">
        <div class="glhf-section-heading"><div><p class="glhf-kicker">${t.journalKicker}</p><h2 id="bitacora-title" tabindex="-1">${t.journalTitle}</h2></div><p>${t.journalDesc}</p></div>
        <div id="glhf-posts" class="glhf-post-grid" aria-live="polite"></div><button class="glhf-show-all" type="button" id="glhf-show-all">${t.all}</button>
      </div></section>
      <section class="glhf-home glhf-section glhf-section--silver" id="acerca" aria-labelledby="glhf-about-title"><div class="glhf-shell glhf-about-inner glhf-reveal">
        <div class="glhf-about-monogram" aria-hidden="true">1958<br>→</div><div class="glhf-about-copy"><p class="glhf-kicker">${t.aboutKicker}</p><h2 id="glhf-about-title">${t.aboutTitle}</h2>
        <p>${t.aboutText1}</p><p>${t.aboutText2}</p></div></div></section>
      <section class="glhf-home glhf-section glhf-section--white" id="ficha-del-mes" aria-labelledby="glhf-month-title"><div class="glhf-shell glhf-month-grid glhf-reveal">
        <div class="glhf-month-copy"><p class="glhf-kicker">${t.monthKicker}</p><h2 id="glhf-month-title">${t.monthTitle}</h2>
         <span class="glhf-post-tag">${t.monthTag}</span><h3 style="font:600 clamp(1.6rem,2.9vw,2.8rem)/1.05 var(--glhf-display);margin:0;color:#162022">${t.monthGame}</h3>
         <p>${t.monthText}</p><p style="font-size:12px">${t.monthSource}</p><a class="glhf-cta glhf-cta--red" href="#glhf-tennis-ficha">${t.monthButton}</a>
         <a class="glhf-inline-link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${t.monthSourceButton}</a></div>
        <figure class="glhf-month-figure"><img src="${imgUrl('ficha-tennis')}" alt="${language==='es'?'Ilustración conceptual de un osciloscopio usado para jugar a Tennis for Two':'Conceptual illustration of an oscilloscope running Tennis for Two'}" width="1000" height="630" loading="lazy" decoding="async" /><figcaption>${t.monthCredit}</figcaption></figure>
      </div></section>
      <section class="glhf-home glhf-section glhf-section--silver" id="contacto" aria-labelledby="glhf-contact-title"><div class="glhf-shell"><div class="glhf-contact-panel glhf-reveal">
         <div class="glhf-contact-copy"><p class="glhf-kicker">${t.contactKicker}</p><h2 id="glhf-contact-title">${t.contactTitle}</h2><p>${t.contactText}</p></div>
         <div class="glhf-contact-action"><a class="glhf-cta glhf-cta--red" href="${issueUrl}" target="_blank" rel="noopener noreferrer">${t.contactButton}</a></div></div></div></section>
      <div class="glhf-home glhf-historical-separator" role="note">${t.separator}</div>`;
    accessibility.innerHTML = `<div class="glhf-shell"><p class="glhf-kicker">${t.accessibilityKicker}</p><h2 style="font:600 clamp(1.9rem,3.7vw,3.5rem)/1.1 var(--glhf-display);color:#182326;margin:15px 0 24px">${t.accessibilityTitle}</h2>
      <p style="color:#334347;max-width:80ch;margin-bottom:15px">${t.accessibilityText}</p><a class="glhf-inline-link" href="${issueUrl}" target="_blank" rel="noopener noreferrer">${t.accessibilityLink}</a></div>`;
    renderJournal();
    document.getElementById('glhf-show-all')?.addEventListener('click',()=>{
      showAll=!showAll;renderJournal();
      if(!showAll)document.getElementById('bitacora-title')?.focus({preventScroll:false});
    });
    observeReveals();
  };
  const footerPaths = ['#historia','#coleccion','#bitacora','#fuentes','#accesibilidad','privacidad','politicas'];
  const updateFooter = () => {
    const t = dict[language];
    footer.innerHTML = `<div><a class="glhf-footer-wordmark" href="#inicio">GLHF.</a><p class="glhf-footer-tagline">${t.footerTag}</p></div>
      <div class="glhf-footer-content"><nav aria-label="${language==='es'?'Enlaces del pie de página':'Footer links'}">${footerPaths.map((item,i)=>{
        const href=item==='privacidad'?`${legalUrl('privacidad')}?lang=${language}`:item==='politicas'?`${legalUrl('politicas')}?lang=${language}`:item;
        return `<a href="${href}">${t.footerLinks[i]}</a>`;
      }).join('')}</nav><p>${t.footerCredits}</p><p>${t.footerLang}</p><div class="glhf-footer-bottom"><p>${t.footerRights}</p></div></div>`;
    if (runtimeStatus) {runtimeStatus.hidden=true;footer.append(runtimeStatus);}
  };
  let revealObserver;
  function observeReveals(){
    revealObserver?.disconnect();
    if(motionOff() || !('IntersectionObserver' in window)){
      documentRoot.classList.remove('glhf-animate');
      intro.querySelectorAll('.glhf-reveal').forEach(element=>element.classList.add('glhf-in-view'));
      return;
    }
    documentRoot.classList.add('glhf-animate');
    revealObserver=new IntersectionObserver(observations=>{
      observations.forEach(observation=>{if(observation.isIntersecting){observation.target.classList.add('glhf-in-view');revealObserver.unobserve(observation.target);}});
    },{rootMargin:'0px 0px 35px 0px',threshold:.06});
    intro.querySelectorAll('.glhf-reveal').forEach(element=>revealObserver.observe(element));
  }
  function updateLanguage(next) {
    language=next==='en'?'en':'es';
    const t=dict[language];
    documentRoot.lang=language;
    header.querySelector('#glhf-brand-subtitle').textContent=t.brand;
    header.querySelectorAll('nav a').forEach((a,i)=>{a.textContent=t.nav[i];});
    header.querySelectorAll('[data-glhf-lang]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.glhfLang===language)));
    menuButton.setAttribute('aria-label',menuButton.getAttribute('aria-expanded')==='true'?t.closeMenu:t.openMenu);
    // The original historical content is still in Spanish; its elements carry lang=es.
    renderHome();updateFooter();updateFilter();
    const status=header.querySelector('#glhf-language-live');if(status)status.textContent=t.langStatus;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#1b2026');
    try{localStorage.setItem('glhf:language',language);}catch{/* Optional preference. */}
  }
  header.querySelectorAll('[data-glhf-lang]').forEach(button=>button.addEventListener('click',()=>{
    updateLanguage(button.dataset.glhfLang);
    button.focus();
  }));
  updateLanguage(language);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',observeReveals);
})();
