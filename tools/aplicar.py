#!/usr/bin/env python3
"""Aplica cambios GLHF a un checkout original, sin sobrescribir README/LICENSE."""
import argparse, json, re, shutil, sys, subprocess
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--repo',default='.');args=p.parse_args()
repo=Path(args.repo).resolve(); pack=Path(__file__).resolve().parents[1]
assert (repo/'GLHF.csproj').is_file() and (repo/'Templates/page.html').is_file(), 'Ejecuta con --repo /ruta/GLHF'
page=repo/'Templates/page.html';s=page.read_text(encoding='utf8')
if 'class="site-header glhf-header"' in s and 'id="bitacora"' in s:
    print('El parche ya esta aplicado a Templates/page.html. Ejecuta dotnet publish y abre el resultado por HTTP.')
    sys.exit(0)
assert '{{games}}' in s and '<header class="site-header"' in s, 'Plantilla inesperada: no se cambió nada'

def replace_between(s,start,end,new):
    a=s.index(start);b=s.index(end,a);return s[:a]+new+s[b:]

s=replace_between(s,'    <header class="site-header"','    <div class="resume-prompt"', '''    <header class="site-header glhf-header" aria-label="Cabecera de GLHF">
        <a class="brand" href="#inicio" aria-label="GLHF: inicio"><img src="assets/Logo_GgWp.png" width="48" height="48" alt=""/><span>GLHF<span class="brand-subtitle">ARCHIVO DE VIDEOJUEGOS</span></span></a>
        <button class="glhf-menu-toggle" type="button" aria-label="Abrir menú" aria-controls="glhf-menu" aria-expanded="false"><span aria-hidden="true">☰</span></button>
        <nav class="main-nav glhf-menu" id="glhf-menu" aria-label="Navegación principal"><a href="#historia">Historia</a><a href="#revoluciones">Revoluciones</a><a href="#coleccion">Colección</a><a href="#bitacora">Bitácora</a><a href="#futuro">Lo que viene</a></nav>
        <span class="edition">ARCHIVO / 2026</span>
    </header>
''')
s=replace_between(s,'            <div class="hero-toolbar"','            <div class="hero-bottom"','')
s=s.replace(' data-hero-auto-state="running"',' data-hero-auto-state="paused"')
s=s.replace('            <div class="hero-toolbar"','            <div class="hero-toolbar"')
s=re.sub(r'\s*<span aria-hidden="true">↗</span>(?=</a>)','',s) # only internal arrows adjacent closing
s=s.replace('href="#futuro">Lo que viene\n                <span aria-hidden="true">↗</span></a>','href="#futuro">Lo que viene</a>')
s=s.replace('<div class="hero-axis"','<div class="hero-axis"')
s=s.replace('<img src="assets/Logo_GgWp.png"\n                            alt=', '<img src="assets/Logo_GgWp.png"\n                            alt=')
# Replace new home: after hero, before current archive brief (retain ALL old sections)
new_home='''        <section class="glhf-latest section-wrap" aria-labelledby="featured-title">
            <div class="glhf-section-top"><p class="eyebrow">EDICIÓN / ACTUALIDAD</p><span class="glhf-index">01 — NOVEDAD DESTACADA</span></div>
            <article class="glhf-feature" id="featured-content"><div class="glhf-feature-visual"><img src="assets/Logo_GgWp.png" width="800" height="800" loading="lazy" alt="Identidad visual GLHF, archivo digital sobre videojuegos"></div><div class="glhf-feature-copy"><span class="glhf-tag">EN DESARROLLO</span><time datetime="2026-10-08">08 OCT 2026</time><h2 id="featured-title">UN MUSEO QUE SIGUE EN CONSTRUCCIÓN.</h2><p>El archivo incorpora una bitácora para hacer visibles las mejoras, nuevas fichas y correcciones. Consulta el registro para conocer qué se ha trabajado y qué sigue pendiente.</p><a class="button primary" href="#bitacora">Leer la bitácora</a></div></article>
        </section>
        <section class="glhf-journal section-wrap" id="bitacora" aria-labelledby="bitacora-title"><div class="glhf-heading"><div><p class="eyebrow">DIARIO DE CAMPO / GLHF</p><h2 id="bitacora-title">BITÁCORA DE GLHF.</h2></div><p>Una ventana al trabajo editorial y técnico detrás del archivo.</p></div><div id="glhf-posts" class="glhf-posts" aria-live="polite"><p>Consultando las últimas entradas…</p></div><button id="glhf-show-all" class="glhf-outline" type="button" hidden>Ver todas las entradas</button><p id="glhf-posts-error" role="status" hidden>No fue posible cargar la bitácora. Puedes consultar el historial en GitHub.</p></section>
        <section class="glhf-pick section-wrap" aria-labelledby="glhf-pick-title"><div class="glhf-section-top"><p class="eyebrow">PIEZA SELECCIONADA / ARCHIVO</p><span class="glhf-index">03 — FICHA DEL MES</span></div><div class="glhf-pick-body"><div class="glhf-pick-cover"><img src="assets/Logo_GgWp.png" alt="Identidad GLHF: pieza seleccionada del museo" loading="lazy" width="800" height="800" /></div><div><span class="glhf-tag">1958 / ORÍGENES</span><h2 id="glhf-pick-title">TENNIS FOR TWO.</h2><p>Un osciloscopio convertido en pantalla de juego. Brookhaven National Laboratory documenta este experimento de 1958 como una de las primeras demostraciones interactivas.</p><p class="glhf-small">Fuente: Brookhaven National Laboratory, «The First Video Game?» (EN).</p><a class="button primary" href="#coleccion">Ver ficha en la colección</a><a class="glhf-source-link" href="https://www.bnl.gov/about/history/firstvideo.php" target="_blank" rel="noopener noreferrer">Consultar fuente (EN) ↗</a></div></div></section>
'''
s=s.replace('        <section class="archive-brief section-wrap"',new_home+'        <section class="archive-brief section-wrap"',1)
s=s.replace('<strong>MUÉVETE</strong> Arrastra el menú: al llevarlo al borde izquierdo o derecho\n                    cambia automáticamente de horizontal a vertical.', '<strong>EXPLORA</strong> Utiliza el menú fijo para navegar por las secciones del museo.')
s=s.replace('            <div class="game-grid">{{games}}</div>', '''            <div class="glhf-filter"><label for="glhf-era-filter">Filtrar fichas por era</label><select id="glhf-era-filter"><option value="all">Todas las eras</option><option value="era-1958">1958–1969</option><option value="era-1970">1970–1979</option><option value="era-1980">1980–1989</option><option value="era-1990">1990–1999</option><option value="era-2000">2000–2009</option><option value="era-2010">2010–2019</option><option value="era-2020">2020–2026</option></select><span id="glhf-filter-count" role="status"></span></div>
            <div class="game-grid">{{games}}</div><p id="glhf-no-results" hidden>No hay fichas para esta era.</p>''')
append='''        <section class="glhf-about section-wrap" id="acerca" aria-labelledby="glhf-about-title"><div class="glhf-about-grid"><img src="assets/Logo_GgWp.png" width="800" height="800" loading="lazy" alt="Símbolo del museo GLHF"/><div><p class="eyebrow">DETRÁS DEL ARCHIVO</p><h2 id="glhf-about-title">QUIÉN HACE GLHF.</h2><p>GLHF es un proyecto editorial independiente desarrollado por Stefanny para explorar y documentar la historia de los videojuegos en español.</p><p>El objetivo es ofrecer un recorrido contextual, contrastado y abierto a correcciones. Las fechas, hitos y fotografías se acompañan de referencias consultables; una selección no equivale a un ranking definitivo.</p></div></div></section>
        <section class="glhf-contact section-wrap" id="contacto" aria-labelledby="glhf-contact-title"><div><p class="eyebrow">EL ARCHIVO SE CONSTRUYE EN COMUNIDAD</p><h2 id="glhf-contact-title">ESCRÍBENOS.</h2><p>¿Detectaste un error de fecha o atribución? ¿Hay un videojuego o acontecimiento que merece su ficha? Abre una incidencia pública con la información y, si es posible, una fuente verificable.</p></div><a class="button primary" href="https://github.com/Stefannysj/GLHF/issues/new" target="_blank" rel="noopener noreferrer">Reportar o sugerir en GitHub ↗</a></section>
        <section class="glhf-accessibility section-wrap" id="accesibilidad" aria-labelledby="glhf-accessibility-title"><p class="eyebrow">COMPROMISO DE ACCESO</p><h2 id="glhf-accessibility-title">DECLARACIÓN DE ACCESIBILIDAD.</h2><p>GLHF busca alinearse con las pautas WCAG 2.2 nivel AA. El diseño contempla navegación mediante teclado, estados de foco visibles, reducción de movimiento y adaptación a pantallas pequeñas. Esta declaración no equivale a una certificación formal de conformidad: las pruebas con tecnologías asistivas y usuarios reales permanecen pendientes.</p><p>Si encuentras barreras, <a href="https://github.com/Stefannysj/GLHF/issues/new" target="_blank" rel="noopener noreferrer">repórtalas mediante GitHub Issues ↗</a>.</p></section>
'''
s=s.replace('    </main>',append+'    </main>',1)
s=replace_between(s,'    <footer class="site-footer"','    <p id="engine-error"', '''    <footer class="site-footer glhf-footer"><a class="brand footer-brand" href="#inicio" aria-label="GLHF, volver al inicio"><img src="assets/Logo_GgWp.png" width="44" height="44" alt="" loading="lazy"/><span>GLHF<span class="brand-subtitle">LA HISTORIA SE JUEGA.</span></span></a><div><nav aria-label="Enlaces del pie de página"><a href="#historia">Historia</a><a href="#coleccion">Colección</a><a href="#bitacora">Bitácora</a><a href="#fuentes">Fuentes</a><a href="#accesibilidad">Accesibilidad</a><a href="#contacto">Contacto</a></nav><p>Imágenes: los créditos y enlaces de licencia se indican en cada ficha; las marcas pertenecen a sus respectivos titulares.</p><p>© 2026 GLHF. Proyecto independiente. Desarrollo y edición: Stefanny. <span id="runtime-status" class="sr-only">{{status}}</span></p></div><a class="back-top" href="#inicio" aria-label="Volver al inicio">↑</a></footer>
''')
s=s.replace('content="#9b9d99"','content="#0c0f13"')
s=s.replace('    <link rel="stylesheet" href="assets/css/site.css" />','''    <link rel="canonical" href="https://stefannysj.github.io/GLHF/" />
    <meta property="og:type" content="website"/><meta property="og:locale" content="es_PE"/>
    <meta property="og:title" content="GLHF — La historia se juega"/>
    <meta property="og:description" content="Museo digital de la historia de los videojuegos, 1958–2026."/>
    <meta property="og:url" content="https://stefannysj.github.io/GLHF/"/>
    <meta property="og:image" content="https://stefannysj.github.io/GLHF/assets/Logo_GgWp.png"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <link rel="stylesheet" href="assets/css/site.css" />
    <link rel="stylesheet" href="assets/css/mejoras.css" />
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"GLHF","url":"https://stefannysj.github.io/GLHF/","inLanguage":"es","description":"Museo digital sobre la historia de los videojuegos."}</script>''')
s=s.replace('    <script src="assets/js/bootstrap.js" defer></script>','    <script src="assets/js/bootstrap.js" defer></script>\n    <script src="assets/js/mejoras.js" defer></script>')
s=s.replace('            <div class="hero-bottom"','            <div class="hero-bottom"',1)
s=s.replace('href="#historia">Entrar a la historia <span\n                                aria-hidden="true">↗</span></a>','href="#historia">Entrar a la historia</a>')
s=s.replace('                <div class="hero-axis"','                <div class="hero-axis"')
# explicit image dimensions + responsive hints in templates and safe defaults
(page).write_text(s,encoding='utf8')
# No longer auto-rotate hero; remove dock code and make source focus reliable.
jsfile=repo/'wwwroot/assets/js/site.js';js=jsfile.read_text(encoding='utf8')
js=js[:js.find('/* ================================================================\n   ETAPA EXTRA V2')] if 'ETAPA EXTRA V2' in js else js
js=js.replace('heroTimer = window.setInterval(rotateHero, 500);','// Disabled: the museum hero must never move automatically.').replace('if (!heroCanRotate()) { refreshHeroState(); return; }','if (!heroCanRotate()) { refreshHeroState(); return; }')
js=js.replace('return !!hero && !reduced() && heroVisible && !heroPointerInside && !heroFocusInside &&','return false && !!hero && !reduced() && heroVisible && !heroPointerInside && !heroFocusInside &&')
(jsfile).write_text(js,encoding='utf8')
game=repo/'Templates/game.html';g=game.read_text(encoding='utf8');g=g.replace('loading="lazy" decoding="async"','loading="lazy" decoding="async" width="800" height="600" sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"');g=g.replace('<p class="media-credit">{{mediaCredit}}</p>','<p class="media-credit">Crédito: {{mediaCredit}}. <a href="{{mediaSource}}" target="_blank" rel="noopener noreferrer">Consultar autor y licencia ↗</a>. El material mostrado puede ser contextual y no una captura del juego.</p>');game.write_text(g,encoding='utf8')
# Direct source links from reliable existing JSON: keep expandable section for bibliographic index.
for fname in ('Program.cs','tools/SiteBuilder/Program.cs'):
    f=repo/fname;t=f.read_text(encoding='utf8')
    t=t.replace('return "<a href=\\\"#source-" + H(id) + "\\\">" + H(Value(s, "publisher")) + "</a>";', 'return "<a href=\\\"" + H(Value(s, "url")) + "\\\" target=\\\"_blank\\\" rel=\\\"noopener noreferrer\\\">" + H(Value(s, "publisher")) + " (fuente externa) ↗</a>";')
    t=t.replace('"Vista previa HTML"','"Vista preliminar"')
    f.write_text(t,encoding='utf8')
# update QA to reflect requested intentional removal, new resources, and no README restriction change
qa=repo/'tools/qa.py';t=qa.read_text(encoding='utf8');t=t.replace("if not checks['movable_dock_present'] or not checks['dock_default_orientation_horizontal']: errors.append('dock markup invalid')","if checks['movable_dock_present']: errors.append('obsolete draggable navigation detected')");t=t.replace("if len(png)!=1 or png[0].name!='Logo_GgWp.png': errors.append('PNG policy failed')","if not logo.exists(): errors.append('logo missing')")
t=t.replace("if 'Desarrolladora: Stefanny' in t: self.developer=True", "if 'Desarrolladora: Stefanny' in t or 'Desarrollo y edición: Stefanny' in t: self.developer=True")
t=t.replace("if checks['pwa_references_present'] or pwa_files: errors.append('PWA was not fully removed')", "if checks['pwa_references_present']: errors.append('PWA runtime enabled in HTML')")
qa.write_text(t,encoding='utf8')
# remove obsolete "only one PNG" workflow assertion.
w=repo/'.github/workflows/pages.yml';t=w.read_text(encoding='utf8');t=t.replace('          assert len(images) == 1 and images[0].name == \'Logo_GgWp.png\', images','          assert any(img.name == \'Logo_GgWp.png\' for img in images), images');w.write_text(t,encoding='utf8')
# new files excluding README/LICENSE
for f in ([] if pack == repo else pack.rglob('*')):
    if not f.is_file() or f.name == 'aplicar.py' or f.suffix == '.zip' or '__pycache__' in f.parts: continue
    rel=f.relative_to(pack);target=repo/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,target)
# create "generated" local bitacora.json copy that works for local preview and Pages.
(repo/'wwwroot/assets/data/bitacora.json').parent.mkdir(parents=True,exist_ok=True)
if pack == repo:
    required = ['wwwroot/assets/css/mejoras.css', 'wwwroot/assets/js/mejoras.js',
                'wwwroot/assets/data/bitacora.json', '.github/workflows/quality.yml']
    missing = [name for name in required if not (repo / name).is_file()]
    if missing:
        print('ATENCION: Faltan archivos del ZIP:', ', '.join(missing), file=sys.stderr)
        sys.exit(2)
assert 'glhf-menu-toggle' in page.read_text(encoding='utf8')
assert 'glhf-posts' in page.read_text(encoding='utf8')
assert 'mejoras.css' in page.read_text(encoding='utf8')
assert 'glhf-era-filter' in page.read_text(encoding='utf8')
print('OK: Fuente de verdad modificada en', repo)
print('SIGUIENTE: dotnet publish GLHF.csproj -c Release -o artifacts/publish')
print('Previsualizar: python -m http.server 8080 --directory artifacts/publish/wwwroot')
