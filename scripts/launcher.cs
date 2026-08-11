// Media Scraper launcher (compiled to MediaScraper.exe by scripts/package-win.ps1).
// Starts the bundled Node server and opens the app in the default browser.
// The server's logs share this console window — closing it stops the app.
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Sockets;
using System.Threading;

static class Launcher
{
    const int Port = 5175;

    static bool PortOpen()
    {
        try
        {
            using (var client = new TcpClient())
            {
                return client.ConnectAsync("127.0.0.1", Port).Wait(250) && client.Connected;
            }
        }
        catch
        {
            return false;
        }
    }

    static void OpenBrowser()
    {
        Process.Start(new ProcessStartInfo("http://localhost:" + Port) { UseShellExecute = true });
    }

    static int Fail(string message)
    {
        Console.Error.WriteLine(message);
        Console.Error.WriteLine("Press any key to close.");
        Console.ReadKey(true);
        return 1;
    }

    static int Main(string[] args)
    {
        bool noBrowser = args.Contains("--no-browser");
        Console.Title = "Media Scraper — close this window to stop";

        if (PortOpen())
        {
            Console.WriteLine("Media Scraper is already running — opening the browser.");
            if (!noBrowser) OpenBrowser();
            return 0;
        }

        string root = AppDomain.CurrentDomain.BaseDirectory;
        string node = Path.Combine(root, "node", "node.exe");
        string script = Path.Combine(root, "server", "index.js");
        if (!File.Exists(node) || !File.Exists(script))
        {
            return Fail("Missing files: MediaScraper.exe must sit next to its node\\ and server\\ folders.");
        }

        var server = Process.Start(new ProcessStartInfo(node, "\"" + script + "\"")
        {
            UseShellExecute = false,
            WorkingDirectory = root,
        });

        // Open the browser once the server answers (up to ~15s).
        for (int i = 0; i < 60 && !PortOpen(); i++)
        {
            Thread.Sleep(250);
            if (server.HasExited)
            {
                return Fail("The server exited before it finished starting (see errors above).");
            }
        }
        if (!noBrowser) OpenBrowser();

        server.WaitForExit();
        return server.ExitCode;
    }
}
