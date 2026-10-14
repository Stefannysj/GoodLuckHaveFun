using System.Net;
using System.Net.Sockets;
using System.Text;

namespace GLHF.Services;

// Servidor de desarrollo minimo: solo loopback; no requiere HTTP.sys, IIS o Python.
// Publicacion real: GitHub Pages sirve artifacts/site como archivos estaticos.
internal static class LocalWebServer
{
    public static async Task RunAsync(string root, int port = 8080)
    {
        root = Path.GetFullPath(root);
        var listener = new TcpListener(IPAddress.Loopback, port);
        listener.Start();
        Console.WriteLine($"GLHF disponible en http://localhost:{port}/ (Ctrl+C para salir)");
        try
        {
            while (true)
            {
                var client = await listener.AcceptTcpClientAsync();
                _ = Task.Run(async () =>
                {
                    using (client)
                    {
                        try { await RespondAsync(client.GetStream(), root); }
                        catch (Exception ex) { Console.Error.WriteLine("HTTP local: " + ex.Message); }
                    }
                });
            }
        }
        finally { listener.Stop(); }
    }

    private static async Task RespondAsync(NetworkStream stream, string root)
    {
        var buffer = new byte[16384];
        var count = await stream.ReadAsync(buffer);
        if (count == 0) return;
        var line = Encoding.ASCII.GetString(buffer, 0, count).Split("\r\n", StringSplitOptions.None)[0];
        var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2 || (parts[0] != "GET" && parts[0] != "HEAD"))
        {
            await SendAsync(stream, "405 Method Not Allowed", "text/plain", Encoding.UTF8.GetBytes("Metodo no disponible"), false);
            return;
        }
        string relative;
        try
        {
            relative = Uri.UnescapeDataString(parts[1].Split('?', 2)[0]).TrimStart('/');
        }
        catch (UriFormatException)
        {
            await SendAsync(stream, "400 Bad Request", "text/plain", [], false);
            return;
        }
        if (relative.Length == 0) relative = "index.html";
        var full = Path.GetFullPath(Path.Combine(root, relative.Replace('/', Path.DirectorySeparatorChar)));
        var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        if (!full.StartsWith(root + Path.DirectorySeparatorChar, comparison) || !File.Exists(full))
        {
            await SendAsync(stream, "404 Not Found", "text/plain; charset=utf-8", Encoding.UTF8.GetBytes("No encontrado"), parts[0] == "HEAD");
            return;
        }
        var mime = Path.GetExtension(full).ToLowerInvariant() switch
        {
            ".html" => "text/html; charset=utf-8",
            ".css" => "text/css; charset=utf-8",
            ".js" => "text/javascript; charset=utf-8",
            ".json" => "application/json; charset=utf-8",
            ".svg" => "image/svg+xml",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".avif" => "image/avif",
            ".txt" => "text/plain; charset=utf-8",
            ".xml" => "application/xml; charset=utf-8",
            _ => "application/octet-stream"
        };
        var bytes = await File.ReadAllBytesAsync(full);
        await SendAsync(stream, "200 OK", mime, bytes, parts[0] == "HEAD");
    }

    private static async Task SendAsync(NetworkStream stream, string status, string contentType, byte[] content, bool head)
    {
        var header = Encoding.ASCII.GetBytes(
            $"HTTP/1.1 {status}\r\nContent-Type: {contentType}\r\nContent-Length: {content.Length}\r\nConnection: close\r\nX-Content-Type-Options: nosniff\r\n\r\n");
        await stream.WriteAsync(header);
        if (!head) await stream.WriteAsync(content);
    }
}
