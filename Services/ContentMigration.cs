using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace GLHF.Services;

// Esta migracion se ejecuta una sola vez sobre el repositorio original.
// Tras versionar su resultado, los textos son mantenidos exclusivamente desde Content/.
internal static class ContentMigration
{
    private static readonly JsonSerializerOptions Pretty = new() { WriteIndented = true, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
    private static readonly Regex TextNode = new(@">(?<text>[^<>]+)<", RegexOptions.Compiled | RegexOptions.Singleline);
    private static readonly Regex TextAttribute = new("(?<pre>\\b(?:title|alt|aria-label|content|placeholder)\\s*=\\s*\")(?<text>[^\"]+)(?<post>\")", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex JsProperty = new(@"(?<key>\w+)\s*:\s*(?<value>'(?:\\.|[^'\\])*'|\[[^\]]*\])", RegexOptions.Compiled | RegexOptions.Singleline);
    private static readonly Regex JsString = new("'(?<value>(?:\\\\.|[^'\\\\])*)'", RegexOptions.Compiled | RegexOptions.Singleline);

    private static string P(string root, params string[] names) => Path.Combine([root, .. names]);
    private static void WriteText(string path, string content)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content, new UTF8Encoding(false));
    }

    public static void Run(string root)
    {
        var pagePath = P(root, "Templates", "page.html");
        var jsPath = P(root, "wwwroot", "assets", "js", "mejoras.js");
        if (!File.Exists(pagePath) || !File.Exists(jsPath))
            throw new FileNotFoundException("Faltan las fuentes originales Templates/page.html y mejoras.js.");

        var copyPath = P(root, "Content", "textos.json");
        if (!File.Exists(copyPath))
        {
            var texts = new SortedDictionary<string, string>(StringComparer.Ordinal);
            var files = Directory.GetFiles(P(root, "Templates"), "*.html")
                .OrderBy(x => x, StringComparer.Ordinal).ToList();
            var changes = new Dictionary<string, string>();
            var index = 0;
            foreach (var file in files)
            {
                var html = File.ReadAllText(file);
                string Capture(string value)
                {
                    if (string.IsNullOrWhiteSpace(value) || value.Contains("{{", StringComparison.Ordinal)) return value;
                    var key = "t" + (++index).ToString("D4");
                    texts[key] = value;
                    return "{{copy." + key + "}}";
                }
                html = TextNode.Replace(html, m => ">" + Capture(m.Groups["text"].Value) + "<");
                html = TextAttribute.Replace(html, m => m.Groups["pre"].Value + Capture(m.Groups["text"].Value) + m.Groups["post"].Value);
                if (Path.GetFileName(file).Equals("page.html", StringComparison.Ordinal))
                {
                    // GitHub Pages recibe rutas relativas: jamas una base absoluta de repositorio.
                    html = Regex.Replace(html, @"(?m)^\s*<base href=""\{\{base\}\}""\s*/>\r?\n", "");
                    html = html.Replace("    <link rel=\"stylesheet\" href=\"assets/css/site.css\" />",
                        "    <link rel=\"stylesheet\" href=\"assets/css/site.css\" />\n    <link rel=\"stylesheet\" href=\"assets/css/retro.css\" />", StringComparison.Ordinal);
                    if (!html.Contains("assets/css/retro.css", StringComparison.Ordinal))
                        throw new InvalidDataException("No se pudo insertar retro.css sin alterar la estructura del documento.");
                    var scripts = "    <script type=\"application/json\" id=\"glhf-editorial-copy\">{{editorial_json}}</script>\n" +
                                  "    <script type=\"application/json\" id=\"glhf-bitacora-copy\">{{bitacora_json}}</script>\n";
                    html = html.Replace("</head>", scripts + "</head>", StringComparison.Ordinal);
                }
                changes[file] = html;
            }
            if (texts.Count < 35)
                throw new InvalidDataException("La migracion de textos parece incompleta; no se ha modificado ninguna plantilla.");
            // Publicar JSON primero y despues las plantillas, para evitar marcadores sin dato.
            WriteText(copyPath, JsonSerializer.Serialize(texts, Pretty) + "\n");
            foreach (var (file, html) in changes) WriteText(file, html);
        }

        var js = File.ReadAllText(jsPath);
        var editorialPath = P(root, "Content", "editorial.json");
        if (!File.Exists(editorialPath))
        {
            var esStart = js.IndexOf("    es: {", js.IndexOf("  const dict = {", StringComparison.Ordinal), StringComparison.Ordinal);
            var enStart = js.IndexOf("    en: {", esStart, StringComparison.Ordinal);
            var end = js.IndexOf("\n  };\n  let language =", enStart, StringComparison.Ordinal);
            if (esStart < 0 || enStart < 0 || end < 0)
                throw new InvalidDataException("No se pudo extraer dict ES/EN de mejoras.js; no se ha sobrescrito el JS.");
            var raw = new JsonObject
            {
                ["es"] = ParseLanguage(js[(esStart + "    es: {".Length)..enStart]),
                ["en"] = ParseLanguage(js[(enStart + "    en: {".Length)..end])
            };
            ChangeEditorial(raw);
            WriteText(editorialPath, raw.ToJsonString(Pretty) + "\n");
        }
        if (js.Contains("  const dict = {", StringComparison.Ordinal))
        {
            var begin = js.IndexOf("  const dict = {", StringComparison.Ordinal);
            var end = js.IndexOf("\n  let language =", begin, StringComparison.Ordinal);
            if (end < 0) throw new InvalidDataException("No se encontro el final de dict en mejoras.js.");
            var replace = "  const dict = JSON.parse(document.getElementById('glhf-editorial-copy')?.textContent || '{}');\n" +
                          "  if (!dict.es || !dict.en) throw new Error('GLHF: falta Content/editorial.json');\n" +
                          "  dict.es.filterCount = count => `${count} ${count === 1 ? 'ficha' : 'fichas'} disponibles`;\n" +
                          "  dict.en.filterCount = count => `${count} ${count === 1 ? 'record' : 'records'} available`;";
            js = js[..begin] + replace + js[end..];
            var fallbackStart = js.IndexOf("  let entries = [];", StringComparison.Ordinal);
            var fallbackEnd = js.IndexOf("\n  const oldHeader =", fallbackStart, StringComparison.Ordinal);
            if (fallbackStart < 0 || fallbackEnd < 0)
                throw new InvalidDataException("No se localizaron las entradas antiguas de bitacora.js.");
            js = js[..fallbackStart] +
                "  const entries = JSON.parse(document.getElementById('glhf-bitacora-copy')?.textContent || '[]')\n" +
                "    .filter(x => x && typeof x.titulo === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(x.fecha || '') && typeof x.resumen === 'string')\n" +
                "    .sort((a, b) => b.fecha.localeCompare(a.fecha));\n" +
                "  let showAll = false;\n" + js[fallbackEnd..];
            var fetchStart = js.IndexOf("  const jq=pathFromJs('../data/bitacora.json');", StringComparison.Ordinal);
            var fetchEnd = js.IndexOf("  window.matchMedia('(prefers-reduced-motion: reduce)')", fetchStart, StringComparison.Ordinal);
            if (fetchStart < 0 || fetchEnd < 0)
                throw new InvalidDataException("No se localizo el fetch antiguo de bitacora.json.");
            js = js[..fetchStart] + js[fetchEnd..];
            // La noticia principal usa la fecha de la entrada mas reciente.
            js = js.Replace("datetime=\"2026-10-08\"", "datetime=\"${entries[0]?.fecha || '2026-10-08'}\"", StringComparison.Ordinal)
                .Replace("${dateFormat('2026-10-08',language)}", "${dateFormat(entries[0]?.fecha || '2026-10-08',language)}", StringComparison.Ordinal);
            js = js.Replace("es: { contenido:'CONTENIDO', mejora:'MEJORA', correccion:'CORRECCIÓN' }", "es: { contenido:'CONTENIDO', noticia:'NOTICIA', mejora:'MEJORA', correccion:'CORRECCIÓN' }", StringComparison.Ordinal)
                .Replace("en: { contenido:'CONTENT', mejora:'IMPROVEMENT', correccion:'FIX' }", "en: { contenido:'CONTENT', noticia:'NEWS', mejora:'IMPROVEMENT', correccion:'FIX' }", StringComparison.Ordinal);
            // Las imagenes reutilizadas en noticias son ilustraciones conceptuales.
            js = js.Replace("picture.alt=language==='es'?'Ilustración editorial de la actualización':'Editorial illustration for the update';",
                "picture.alt=language==='es' ? `Ilustración conceptual para: ${entry.titulo}` : `Conceptual illustration for: ${entry.titulo_en || entry.titulo}`;", StringComparison.Ordinal);
            js = js.Replace("document.querySelector('meta[name=\"theme-color\"]')?.setAttribute('content','#f1f2f2');",
                "document.querySelector('meta[name=\"theme-color\"]')?.setAttribute('content','#1b2026');", StringComparison.Ordinal);
            js = js.Replace("https://github.com/Stefannysj/GLHF", "https://github.com/Stefannysj/GoodLuckHaveFun", StringComparison.Ordinal);
            WriteText(jsPath, js);
        }

        // Al retirar el runtime Blazor, las flechas/Home/End de la navegacion
        // lateral se siguen gestionando con JavaScript, sin alterar el HTML.
        var siteJs = P(root, "wwwroot", "assets", "js", "site.js");
        if (File.Exists(siteJs))
        {
            var script = File.ReadAllText(siteJs);
            if (!script.Contains("GLHF-STATIC-KEYBOARD-FALLBACK", StringComparison.Ordinal))
            {
                const string target = "  normalizeFragmentLinks();\n  openSource(location.hash);";
                const string keyboardFallback = """
                  // GLHF-STATIC-KEYBOARD-FALLBACK: la lista de eras mantiene su navegacion por teclado.
                  document.addEventListener("keydown", event => {
                    if (dotnet || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
                    const link = event.target.closest(".era-link");
                    if (!link || !document.querySelector("#era-controls")?.contains(link)) return;
                    let index = eraIds.indexOf(link.dataset.eraLink);
                    if (index < 0) return;
                    event.preventDefault();
                    if (event.key === "Home") index = 0;
                    else if (event.key === "End") index = eraIds.length - 1;
                    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") index = Math.max(0, index - 1);
                    else index = Math.min(eraIds.length - 1, index + 1);
                    scrollToEra(eraIds[index], `[data-era-link`);
                  });
                """;
                if (!script.Contains(target, StringComparison.Ordinal))
                    throw new InvalidDataException("No se encontro la inicializacion del navegador de eras.");
                script = script.Replace(target, keyboardFallback + "\n" + target, StringComparison.Ordinal);
                WriteText(siteJs, script);
            }
        }

        var formerBlog = P(root, "wwwroot", "assets", "data", "bitacora.json");
        var archivedBlog = P(root, "Content", "bitacora-archivo.json");
        if (File.Exists(formerBlog))
        {
            if (!File.Exists(archivedBlog)) File.Copy(formerBlog, archivedBlog);
            // La antigua bitacora queda archivada en Content/: no se publica ni duplica.
            File.Delete(formerBlog);
        }
        var activeBlog = P(root, "Content", "bitacora.json");
        if (!File.Exists(activeBlog)) throw new FileNotFoundException("Falta Content/bitacora.json con noticias de videojuegos.");
        // Migracion de rutas obsoletas en archivos aun publicados; no se borran herramientas legado.
        var migrateFiles = new []
        {
            P(root, "wwwroot", "politicas.html"), P(root, "wwwroot", "privacidad.html"),
            P(root, "wwwroot", "assets", "js", "legal.js"), P(root, "wwwroot", "robots.txt"),
            P(root, "wwwroot", "sitemap.xml")
        };
        foreach (var file in migrateFiles.Where(File.Exists))
        {
            var before = File.ReadAllText(file);
            var after = before.Replace("https://github.com/Stefannysj/GLHF", "https://github.com/Stefannysj/GoodLuckHaveFun", StringComparison.Ordinal)
                .Replace("https://stefannysj.github.io/GLHF/", "https://stefannysj.github.io/GoodLuckHaveFun/", StringComparison.Ordinal);
            if (Path.GetFileName(file) == "politicas.html")
                after = after.Replace("href=\"https://stefannysj.github.io/GoodLuckHaveFun/politicas.html\"", "href=\"politicas.html\"", StringComparison.Ordinal);
            if (after != before) WriteText(file, after);
        }
        if (!File.Exists(P(root, "wwwroot", ".nojekyll")))
            WriteText(P(root, "wwwroot", ".nojekyll"), "");
    }

    private static JsonObject ParseLanguage(string input)
    {
        var item = new JsonObject();
        foreach (Match match in JsProperty.Matches(input))
        {
            var key = match.Groups["key"].Value;
            var literal = match.Groups["value"].Value;
            if (literal.StartsWith("[", StringComparison.Ordinal))
            {
                var array = new JsonArray();
                foreach (Match word in JsString.Matches(literal)) array.Add(Unquote(word.Groups["value"].Value));
                item[key] = array;
            }
            else item[key] = Unquote(literal[1..^1]);
        }
        if (item.Count < 20 || item["heroTitle"] is null || item["footerLinks"] is null)
            throw new InvalidDataException("No se extrajeron correctamente los textos editoriales de mejoras.js.");
        return item;
    }

    private static string Unquote(string literal) => literal
        .Replace("\\'", "'", StringComparison.Ordinal)
        .Replace("\\n", "\n", StringComparison.Ordinal)
        .Replace("\\\\", "\\", StringComparison.Ordinal);

    private static void ChangeEditorial(JsonObject obj)
    {
        var es = (JsonObject)obj["es"]!;
        var en = (JsonObject)obj["en"]!;
        // Se sustituyen novedades internas por noticias verificables de videojuegos.
        es["nav"] = JsonSerializer.SerializeToNode(new [] { "Historia", "Revoluciones", "Colección", "Actualidad gamer", "Lo que viene" });
        es["featureIndex"] = "01 / ACTUALIDAD GAMER";
        es["featureMark"] = "EN PORTADA";
        es["featureTag"] = "VIDEOJUEGOS";
        es["featureHeading"] = "EL UNIVERSO GAMER <em>SIGUE EN JUEGO.</em>";
        es["featureText"] = "Lanzamientos, anuncios y eventos del mundo de los videojuegos. Información contrastada con fuentes oficiales y enlaces a cada noticia.";
        es["featureButton"] = "Explorar noticias";
        es["followHeading"] = "Lo último en la industria del videojuego.";
        es["followText"] = "Una selección editorial con fechas de publicación y fuentes verificables. El archivo histórico permanece disponible.";
        es["followButton"] = "Repositorio del proyecto";
        es["journalKicker"] = "INFORMACIÓN / VIDEOJUEGOS";
        es["journalTitle"] = "Noticias de videojuegos.";
        es["journalDesc"] = "Anuncios oficiales, lanzamientos y eventos recientes.";
        es["blogButton"] = "Leer fuente oficial";
        es["all"] = "Ver todas las noticias";
        es["less"] = "Mostrar tres noticias";
        if (es["footerLinks"] is JsonArray linksEs && linksEs.Count > 2) linksEs[2] = "Actualidad gamer";
        en["nav"] = JsonSerializer.SerializeToNode(new [] { "History", "Revolutions", "Collection", "Gaming news", "What's next" });
        en["featureIndex"] = "01 / GAMING NEWS";
        en["featureMark"] = "FEATURED";
        en["featureTag"] = "VIDEO GAMES";
        en["featureHeading"] = "GAMING NEWS <em>IN MOTION.</em>";
        en["featureText"] = "Game launches, announcements and events, with links to the original official announcements.";
        en["featureButton"] = "Explore gaming news";
        en["followHeading"] = "What's new in gaming.";
        en["followText"] = "An editorial selection with publication dates and verifiable sources. The historical archive remains available.";
        en["followButton"] = "Project repository";
        en["journalKicker"] = "GAMING / UPDATES";
        en["journalTitle"] = "Gaming news.";
        en["journalDesc"] = "Recent official announcements, releases and events.";
        en["blogButton"] = "Read official source";
        en["all"] = "View all news";
        en["less"] = "Show three news items";
        if (en["footerLinks"] is JsonArray linksEn && linksEn.Count > 2) linksEn[2] = "Gaming news";
    }
}
