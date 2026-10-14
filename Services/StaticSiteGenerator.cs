using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using GLHF.Models;

namespace GLHF.Services;

internal sealed class StaticSiteGenerator(string root)
{
    private readonly string _root = root;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly Regex Marker = new(@"\{\{(?<name>[A-Za-z0-9_.-]+)\}\}", RegexOptions.Compiled);
    private static string H(string? value) => WebUtility.HtmlEncode(value ?? "");
    private string FromRoot(params string[] names) => Path.Combine([_root, .. names]);

    public void Build()
    {
        var history = JsonSerializer.Deserialize<HistoryDocument>(File.ReadAllText(FromRoot("Content", "history.json")), JsonOptions)
            ?? throw new InvalidDataException("Content/history.json no es valido.");
        ValidateHistory(history);

        var texts = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(FromRoot("Content", "textos.json")), JsonOptions)
            ?? throw new InvalidDataException("Content/textos.json no es valido.");
        var editorial = JsonSerializer.Deserialize<EditorialContent>(File.ReadAllText(FromRoot("Content", "editorial.json")), JsonOptions)
            ?? throw new InvalidDataException("Content/editorial.json no es valido.");
        if (editorial.Es.Fields.Count < 20 || editorial.En.Fields.Count < 20 ||
            !editorial.Es.Fields.ContainsKey("heroTitle") || !editorial.En.Fields.ContainsKey("heroTitle"))
            throw new InvalidDataException("El contenido editorial bilingue esta incompleto.");

        var news = JsonSerializer.Deserialize<List<GameNews>>(File.ReadAllText(FromRoot("Content", "bitacora.json")), JsonOptions)
            ?? throw new InvalidDataException("Content/bitacora.json no es valido.");
        ValidateNews(news);

        var templates = Directory.EnumerateFiles(FromRoot("Templates"), "*.html")
            .ToDictionary(p => Path.GetFileNameWithoutExtension(p), File.ReadAllText, StringComparer.Ordinal);

        string Render(string name, Dictionary<string, string> values)
        {
            if (!templates.TryGetValue(name, out var source))
                throw new FileNotFoundException($"Falta Templates/{name}.html");
            return Marker.Replace(source, match =>
            {
                var key = match.Groups["name"].Value;
                if (key.StartsWith("copy.", StringComparison.Ordinal))
                    return texts.TryGetValue(key[5..], out var copy)
                        ? copy : throw new InvalidDataException($"Falta contenido para {key}.");
                return values.TryGetValue(key, out var value)
                    ? value : throw new InvalidDataException($"Marcador sin dato: {name}: {key}.");
            });
        }

        var sourcesById = history.Sources.ToDictionary(s => s.Id, StringComparer.Ordinal);
        string Refs(List<string> ids)
        {
            if (ids.Count == 0) return "";
            var links = ids.Select(id => "<a href=\"#source-" + H(id) + "\">" + H(sourcesById[id].Publisher) + "</a>");
            return "<div class=\"refs\">" + string.Concat(links) + "</div>";
        }

        var navigation = new StringBuilder();
        var timeline = new StringBuilder();
        var eras = new StringBuilder();
        foreach (var era in history.Eras)
        {
            var v = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["id"] = H(era.Id), ["label"] = H(era.Label), ["period"] = H(era.Period),
                ["title"] = H(era.Title), ["kicker"] = H(era.Kicker),
                ["description"] = H(era.Description),
                ["name"] = H(era.Kicker.Split(" / ", 2).Last().ToLowerInvariant())
            };
            navigation.Append(Render("nav-item", v));
            timeline.Append(Render("timeline-item", v));
            var items = new StringBuilder();
            foreach (var item in era.Events)
                items.Append(Render("event", new Dictionary<string, string>
                {
                    ["year"] = H(item.Year), ["title"] = H(item.Title),
                    ["description"] = H(item.Description), ["sources"] = Refs(item.Sources)
                }));
            v["events"] = items.ToString();
            v["tags"] = string.Concat(era.Tags.Select(tag => "<span>" + H(tag) + "</span>"));
            eras.Append(Render("era", v));
        }

        var games = new StringBuilder();
        for (var i = 0; i < history.Games.Count; i++)
        {
            var item = history.Games[i];
            games.Append(Render("game", new Dictionary<string, string>
            {
                ["number"] = (i + 1).ToString("D3"), ["eraId"] = H(item.EraId),
                ["year"] = H(item.Year), ["name"] = H(item.Name),
                ["platform"] = H(item.Platform), ["description"] = H(item.Description),
                ["mediaUrl"] = H(item.MediaUrl), ["mediaAlt"] = H(item.MediaAlt),
                ["mediaKind"] = H(item.MediaKind), ["mediaCredit"] = H(item.MediaCredit),
                ["mediaSource"] = H(item.MediaSource), ["sources"] = Refs(item.Sources)
            }));
        }
        var revolutions = new StringBuilder();
        foreach (var r in history.Revolutions)
            revolutions.Append(Render("revolution", new Dictionary<string, string>
            {
                ["number"] = H(r.Number), ["title"] = H(r.Title),
                ["period"] = H(r.Period), ["description"] = H(r.Description),
                ["sources"] = Refs(r.Sources)
            }));
        var sourceHtml = string.Concat(history.Sources.Select(s => Render("source", new Dictionary<string, string>
        {
            ["id"] = H(s.Id), ["publisher"] = H(s.Publisher),
            ["title"] = H(s.Title), ["url"] = H(s.Url)
        })));

        string EmbeddedJson<T>(T model) => JsonSerializer.Serialize(model, JsonOptions)
            .Replace("<", "\\u003C", StringComparison.Ordinal)
            .Replace(">", "\\u003E", StringComparison.Ordinal)
            .Replace("&", "\\u0026", StringComparison.Ordinal);
        var page = Render("page", new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["base"] = "./", ["mode"] = "static", ["status"] = "Archivo estatico disponible",
            ["navigation"] = navigation.ToString(), ["timeline"] = timeline.ToString(),
            ["eras"] = eras.ToString(), ["games"] = games.ToString(),
            ["revolutions"] = revolutions.ToString(), ["sources"] = sourceHtml,
            ["editorial_json"] = EmbeddedJson(editorial),
            ["bitacora_json"] = EmbeddedJson(news)
        });
        if (Marker.IsMatch(page)) throw new InvalidDataException("Quedaron marcadores sin resolver en el HTML.");

        var destination = FromRoot("artifacts", "site");
        var origin = FromRoot("wwwroot");
        if (Directory.Exists(destination)) Directory.Delete(destination, recursive: true);
        Directory.CreateDirectory(destination);
        foreach (var path in Directory.EnumerateFiles(origin, "*", SearchOption.AllDirectories))
        {
            var rel = Path.GetRelativePath(origin, path);
            if (rel.Replace('\\', '/') is "index.html" or "sw.js" or "manifest.webmanifest" or "assets/data/bitacora.json") continue;
            var output = Path.Combine(destination, rel);
            Directory.CreateDirectory(Path.GetDirectoryName(output)!);
            File.Copy(path, output, overwrite: true);
        }
        File.WriteAllText(Path.Combine(destination, "index.html"), page, new UTF8Encoding(false));
        File.WriteAllText(Path.Combine(destination, ".nojekyll"), "", new UTF8Encoding(false));
        Verify();
    }

    public void Verify()
    {
        var destination = FromRoot("artifacts", "site");
        var index = Path.Combine(destination, "index.html");
        if (!File.Exists(index)) throw new FileNotFoundException("Falta artifacts/site/index.html. Ejecuta el generador.");
        var html = File.ReadAllText(index);
        if (!html.StartsWith("<!DOCTYPE html>", StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("El documento carece de DOCTYPE.");
        if (html.Contains("_framework/", StringComparison.OrdinalIgnoreCase) ||
            html.Contains("/GLHF/", StringComparison.OrdinalIgnoreCase) ||
            html.Contains("<base ", StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("Se detecto una dependencia de Blazor o una ruta base antigua.");
        if (!File.Exists(Path.Combine(destination, ".nojekyll")))
            throw new InvalidDataException("Falta .nojekyll.");
        if (Regex.Matches(html, @"<h1\b", RegexOptions.IgnoreCase).Count != 1)
            throw new InvalidDataException("El HTML debe contener exactamente un h1.");
        var previousHeading = 0;
        foreach (Match heading in Regex.Matches(html, @"<h(?<level>[1-6])\b", RegexOptions.IgnoreCase))
        {
            var level = int.Parse(heading.Groups["level"].Value, System.Globalization.CultureInfo.InvariantCulture);
            if (level > previousHeading + 1)
                throw new InvalidDataException($"Jerarquia de encabezados incorrecta: h{previousHeading} seguido de h{level}.");
            previousHeading = level;
        }
        var ids = Regex.Matches(html, "\\bid=\"(?<id>[^\"]+)\"", RegexOptions.IgnoreCase)
            .Select(m => m.Groups["id"].Value).ToList();
        if (ids.Count != ids.Distinct(StringComparer.Ordinal).Count())
            throw new InvalidDataException("Existen atributos id duplicados.");
        foreach (Match img in Regex.Matches(html, @"<img\b[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Singleline))
            if (!Regex.IsMatch(img.Value, @"\balt\s*=", RegexOptions.IgnoreCase))
                throw new InvalidDataException("Imagen sin atributo alt: " + img.Value[..Math.Min(img.Length, 120)]);
        foreach (Match link in Regex.Matches(html, @"<a\b[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Singleline))
            if (Regex.IsMatch(link.Value, "target\\s*=\\s*\"_blank\"", RegexOptions.IgnoreCase) &&
                !Regex.IsMatch(link.Value, "rel\\s*=\\s*\"[^\"]*noopener[^\"]*noreferrer", RegexOptions.IgnoreCase))
                throw new InvalidDataException("Enlace target=_blank sin rel seguro.");
        foreach (Match asset in Regex.Matches(html, "(?:src|href)=\"(?<path>assets/[^\"?#]+)", RegexOptions.IgnoreCase))
        {
            var p = Uri.UnescapeDataString(asset.Groups["path"].Value).Replace('/', Path.DirectorySeparatorChar);
            if (!File.Exists(Path.Combine(destination, p)))
                throw new InvalidDataException("Recurso local ausente: " + p);
        }
        if (!Directory.Exists(Path.Combine(destination, "assets")))
            throw new InvalidDataException("No se copiaron los archivos estaticos.");
    }

    private static void ValidateNews(List<GameNews> news)
    {
        if (news.Count == 0) throw new InvalidDataException("No hay noticias en Content/bitacora.json.");
        foreach (var item in news)
        {
            if (string.IsNullOrWhiteSpace(item.Title) || string.IsNullOrWhiteSpace(item.Description) ||
                !DateOnly.TryParseExact(item.Date, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _) ||
                !Uri.TryCreate(item.SourceUrl, UriKind.Absolute, out var url) || url.Scheme != Uri.UriSchemeHttps ||
                !Regex.IsMatch(item.Image, @"^assets/images/[a-z0-9_-]+\.(?:svg|png|webp|avif)$", RegexOptions.IgnoreCase))
                throw new InvalidDataException("Noticia incompleta o con enlace/ruta inseguro: " + item.Title);
        }
    }

    private static void ValidateHistory(HistoryDocument history)
    {
        if (history.Eras.Count == 0 || history.Games.Count == 0 || history.Sources.Count == 0)
            throw new InvalidDataException("El catalogo debe incluir eras, fichas y fuentes.");
        if (history.Eras.Select(e => e.Id).Distinct().Count() != history.Eras.Count ||
            history.Sources.Select(s => s.Id).Distinct().Count() != history.Sources.Count)
            throw new InvalidDataException("Hay identificadores de era o de fuente repetidos.");
        var eras = history.Eras.Select(e => e.Id).ToHashSet();
        var sources = history.Sources.Select(s => s.Id).ToHashSet();
        if (history.Games.Any(g => !eras.Contains(g.EraId)))
            throw new InvalidDataException("Una ficha referencia una era que no existe.");
        var allReferences = history.Eras.SelectMany(e => e.Events).SelectMany(e => e.Sources)
            .Concat(history.Games.SelectMany(g => g.Sources))
            .Concat(history.Revolutions.SelectMany(r => r.Sources));
        if (allReferences.Any(id => !sources.Contains(id)))
            throw new InvalidDataException("Existen referencias a fuentes inexistentes.");
        if (history.Games.Any(g => string.IsNullOrWhiteSpace(g.MediaAlt) ||
                                   string.IsNullOrWhiteSpace(g.MediaCredit) ||
                                   string.IsNullOrWhiteSpace(g.MediaSource)))
            throw new InvalidDataException("Cada ficha debe incluir texto alternativo, credito y fuente de imagen.");
    }
}
