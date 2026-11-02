// Nexcord Installer - Discord installation discovery and validation.
// SPDX-License-Identifier: GPL-3.0-or-later
using System.Diagnostics;

namespace NexcordInstaller;

internal static class DiscordDiscovery
{
    private static readonly (string Name, string Exe)[] Channels =
    {
        ("Stable", "Discord.exe"),
        ("PTB", "DiscordPTB.exe"),
        ("Canary", "DiscordCanary.exe")
    };

    public static IReadOnlyList<DiscordInstall> FindAll()
    {
        var installs = new List<DiscordInstall>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void Add(string? path)
        {
            if (string.IsNullOrWhiteSpace(path)) return;
            if (TryResolve(path, out var install, out _) && install != null
                && seen.Add(install.Resources))
                installs.Add(install);
        }

        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        foreach (string folder in new[] { "Discord", "DiscordPTB", "DiscordCanary" })
        {
            Add(Path.Combine(local, folder));
            Add(Path.Combine(local, "Programs", folder));
            foreach (string env in new[] { "ProgramFiles", "ProgramFiles(x86)" })
            {
                string? basePath = Environment.GetEnvironmentVariable(env);
                if (!string.IsNullOrWhiteSpace(basePath)) Add(Path.Combine(basePath, folder));
            }
        }

        // A nonstandard install can be found from a running Discord executable.
        // Access may be denied for certain processes; this is only best effort.
        foreach (var (_, exe) in Channels)
        {
            try
            {
                foreach (var process in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(exe)))
                {
                    try { Add(process.MainModule?.FileName); }
                    catch { /* no permissions, or process exited */ }
                    finally { process.Dispose(); }
                }
            }
            catch { /* optional live-process detection */ }
        }

        return installs;
    }

    // Accepts a Discord root, version folder, resources folder, or executable.
    public static bool TryResolve(string selected, out DiscordInstall? install, out string message)
    {
        install = null;
        message = "";
        if (string.IsNullOrWhiteSpace(selected))
        {
            message = "Select the folder containing your Discord installation.";
            return false;
        }

        string path;
        try
        {
            path = Path.GetFullPath(selected.Trim().Trim('"'));
            if (File.Exists(path))
            {
                string file = Path.GetFileName(path);
                if (!Channels.Any(channel => file.Equals(channel.Exe, StringComparison.OrdinalIgnoreCase))
                    && !file.Equals("Update.exe", StringComparison.OrdinalIgnoreCase))
                {
                    message = "Select a Discord installation directory or Discord executable.";
                    return false;
                }
                path = Path.GetDirectoryName(path)!;
            }
        }
        catch (Exception e) when (e is ArgumentException or NotSupportedException or PathTooLongException)
        {
            message = "Invalid folder path.";
            return false;
        }

        if (!Directory.Exists(path))
        {
            message = "Folder does not exist. Use Browse to select the actual installed Discord folder.";
            return false;
        }

        var candidates = new List<string>();
        if (Path.GetFileName(path).Equals("resources", StringComparison.OrdinalIgnoreCase))
            candidates.Add(path);

        candidates.Add(Path.Combine(path, "resources"));

        try
        {
            candidates.AddRange(Directory.GetDirectories(path, "app-*")
                .OrderByDescending(p => ParseVersion(Path.GetFileName(p)))
                .ThenByDescending(p => p, StringComparer.OrdinalIgnoreCase)
                .Select(p => Path.Combine(p, "resources")));
        }
        catch (UnauthorizedAccessException)
        {
            message = "Access denied when looking through this folder.";
            return false;
        }
        catch (IOException)
        {
            message = "The selected folder could not be read.";
            return false;
        }

        // Prefer the newest valid Discord app version. Do not mistake arbitrary
        // Electron applications for Discord just because app.asar exists.
        foreach (string resources in candidates.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (!Directory.Exists(resources)) continue;

            string versionDir = Path.GetDirectoryName(resources)!;
            string? channel = Channels
                .Where(c => File.Exists(Path.Combine(versionDir, c.Exe)))
                .Select(c => c.Name)
                .FirstOrDefault();

            if (channel is null) continue;

            string asar = Path.Combine(resources, "app.asar");
            string backup = Path.Combine(resources, "_app.asar");
            if (!File.Exists(asar) && !File.Exists(backup) && !Directory.Exists(Path.Combine(resources, "app")))
                continue;

            string root = Path.GetFileName(versionDir).StartsWith("app-", StringComparison.OrdinalIgnoreCase)
                ? Path.GetDirectoryName(versionDir)! : versionDir;
            install = new DiscordInstall(channel, root, resources);
            return true;
        }

        message = "Couldn't find Discord.exe (or PTB/Canary) beside a resources folder with app.asar. " +
                  "Choose the Discord root folder or app-version folder. Microsoft Store/MSIX installations " +
                  "may need the standard desktop installer instead.";
        return false;
    }

    private static Version ParseVersion(string folder)
        => Version.TryParse(folder.StartsWith("app-", StringComparison.OrdinalIgnoreCase) ? folder[4..] : folder, out var version)
            ? version : new Version(0, 0);
}
