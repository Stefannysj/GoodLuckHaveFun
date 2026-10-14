using System.Text.Json.Serialization;

namespace GLHF.Models;

// Modelos tipados: Content/history.json es la unica fuente para el catalogo.
public sealed class HistoryDocument
{
    [JsonPropertyName("edition")] public string Edition { get; set; } = "";
    [JsonPropertyName("reviewDate")] public string ReviewDate { get; set; } = "";
    [JsonPropertyName("eras")] public List<HistoryEra> Eras { get; set; } = [];
    [JsonPropertyName("games")] public List<HistoryGame> Games { get; set; } = [];
    [JsonPropertyName("revolutions")] public List<HistoryRevolution> Revolutions { get; set; } = [];
    [JsonPropertyName("sources")] public List<HistorySource> Sources { get; set; } = [];
}

public sealed class HistoryEra
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public string Period { get; set; } = "";
    public string Title { get; set; } = "";
    public string Kicker { get; set; } = "";
    public string Description { get; set; } = "";
    public List<HistoryEvent> Events { get; set; } = [];
    public List<string> Tags { get; set; } = [];
    public List<string> Sources { get; set; } = [];
}

public sealed class HistoryEvent
{
    public string Year { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public List<string> Sources { get; set; } = [];
}

public sealed class HistoryGame
{
    public string EraId { get; set; } = "";
    public string Year { get; set; } = "";
    public string Name { get; set; } = "";
    public string Platform { get; set; } = "";
    public string Description { get; set; } = "";
    public List<string> Sources { get; set; } = [];
    public string MediaUrl { get; set; } = "";
    public string MediaAlt { get; set; } = "";
    public string MediaKind { get; set; } = "";
    public string MediaCredit { get; set; } = "";
    public string MediaSource { get; set; } = "";
}

public sealed class HistoryRevolution
{
    public string Number { get; set; } = "";
    public string Title { get; set; } = "";
    public string Period { get; set; } = "";
    public string Description { get; set; } = "";
    public List<string> Sources { get; set; } = [];
}

public sealed class HistorySource
{
    public string Id { get; set; } = "";
    public string Publisher { get; set; } = "";
    public string Title { get; set; } = "";
    public string Url { get; set; } = "";
}
