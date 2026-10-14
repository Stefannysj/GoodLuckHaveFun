using GLHF.Services;

try
{
    var root = SitePaths.FindRoot(Directory.GetCurrentDirectory());
    if (args.Contains("--migrate", StringComparer.Ordinal))
    {
        ContentMigration.Run(root);
        Console.WriteLine("Migracion completada. Revisa Content/ y Templates/ antes de confirmar los cambios.");
    }
    else if (args.Contains("--verify", StringComparer.Ordinal))
    {
        new StaticSiteGenerator(root).Verify();
        Console.WriteLine("Verificacion estructural: OK.");
    }
    else
    {
        // Solo en el primer arranque; una vez versionados Content/ y Templates/,
        // una compilacion no debe volver a migrar los archivos.
        if (!File.Exists(Path.Combine(root, "Content", "textos.json")) ||
            !File.Exists(Path.Combine(root, "Content", "editorial.json")))
            ContentMigration.Run(root);
        new StaticSiteGenerator(root).Build();
        Console.WriteLine("GLHF: artifacts/site/index.html generado.");
        if (args.Contains("--serve", StringComparer.Ordinal))
            await LocalWebServer.RunAsync(Path.Combine(root, "artifacts", "site"));
    }
}
catch (Exception ex)
{
    Console.Error.WriteLine("GLHF ERROR: " + ex.Message);
    return 1;
}
return 0;
