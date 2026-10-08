(() => {
  "use strict";
  // This file is already loaded by both the generated HTML and the root preview.
  // The editorial layer therefore needs no commands or template modification.
  const ownScript = document.currentScript;
  const ownUrl = ownScript?.src || document.querySelector('script[src$="bootstrap.js"]')?.src;
  if (ownUrl) {
    const cssUrl = new URL('../css/mejoras.css', ownUrl).href;
    const jsUrl = new URL('./mejoras.js', ownUrl).href;
    if (!document.querySelector('link[data-glhf-upgrade]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = cssUrl; link.dataset.glhfUpgrade = 'true';
      document.head.append(link);
    }
    if (!document.querySelector('script[data-glhf-upgrade]')) {
      const script = document.createElement('script');
      script.src = jsUrl; script.async = false; script.dataset.glhfUpgrade = 'true';
      document.head.append(script);
    }
  }

  // Preserve the existing Blazor boot process used by the Pages workflow.
  const mode = document.querySelector('meta[name="glhf-mode"]')?.content;
  if (mode !== "blazor") return;
  const status = document.getElementById("runtime-status");
  const controls = document.getElementById("era-controls");
  const fallbackNavigation = controls?.innerHTML;
  const failure = error => {
    if (controls && fallbackNavigation) controls.innerHTML = fallbackNavigation;
    if (status) status.textContent = "Interacción HTML";
    const engineError = document.getElementById("engine-error");
    if (engineError) engineError.hidden = false;
    console.error("GLHF: no se pudo iniciar Blazor.", error);
  };
  const script = document.createElement("script");
  script.src = new URL("_framework/blazor.webassembly.js", document.baseURI).href;
  script.setAttribute("autostart", "false");
  script.onerror = () => failure(new Error("No se encontró el runtime de Blazor."));
  script.onload = async () => {
    try {
      await Blazor.start();
      document.documentElement.dataset.engine = "blazor";
      if (status) status.textContent = "Interacción C# activa";
    } catch (error) { failure(error); }
  };
  document.body.append(script);
})();
