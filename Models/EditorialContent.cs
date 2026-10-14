using System.Text.Json;
using System.Text.Json.Serialization;

namespace GLHF.Models;

// Textos de la capa editorial en dos idiomas, versionados en Content/editorial.json.
// JsonExtensionData mantiene todos los textos originales sin descartar atributos nuevos.
public sealed class EditorialContent
{
    [JsonPropertyName("es")] public EditorialLanguage Es { get; set; } = new();
    [JsonPropertyName("en")] public EditorialLanguage En { get; set; } = new();
}

public sealed class EditorialLanguage
{
    [JsonExtensionData] public Dictionary<string, JsonElement> Fields { get; set; } = new(StringComparer.Ordinal);
}

// Contenido editorial de videojuegos; nunca se descarga una API en tiempo de ejecución.
public sealed class GameNews
{
    [JsonPropertyName("titulo")] public string Title { get; set; } = "";
    [JsonPropertyName("titulo_en")] public string EnglishTitle { get; set; } = "";
    [JsonPropertyName("fecha")] public string Date { get; set; } = "";
    [JsonPropertyName("etiqueta")] public string Category { get; set; } = "";
    [JsonPropertyName("resumen")] public string Description { get; set; } = "";
    [JsonPropertyName("resumen_en")] public string EnglishDescription { get; set; } = "";
    [JsonPropertyName("imagen")] public string Image { get; set; } = "";
    [JsonPropertyName("enlace")] public string SourceUrl { get; set; } = "";
}
