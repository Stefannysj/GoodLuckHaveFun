namespace GLHF.Services;

internal static class SitePaths
{
    public static string FindRoot(string start)
    {
        for (var path = Path.GetFullPath(start); path is not null; path = Directory.GetParent(path)?.FullName)
            if (File.Exists(Path.Combine(path, "GLHF.csproj")) &&
                File.Exists(Path.Combine(path, "Templates", "page.html")))
                return path;
        throw new DirectoryNotFoundException("No se localizo el repositorio GLHF.csproj + Templates/page.html.");
    }
}
