// Nexcord Installer v0.1 - GPL-3.0-or-later
// Safely installs and updates the Nexcord desktop mod in a local Discord installation.
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Drawing;
using System.Windows.Forms;

namespace NexcordInstaller;

internal sealed record DiscordInstall(string Channel, string Root, string Resources)
{
    public override string ToString() => $"{Channel} — {Root}";
}

internal static class BootstrapAsar
{
    // Implements the Electron ASAR header format used by upstream Equilotl.
    // Only index.js and package.json are packed into the small bootstrap.
    public static void Write(string destination, string nexcordAsar)
    {
        string entry = "require(" + JsonSerializer.Serialize(nexcordAsar) + ")";
        const string package = "{\n  \"name\": \"discord\",\n  \"main\": \"index.js\"\n}";
        int entrySize = Encoding.UTF8.GetByteCount(entry);
        string header = JsonSerializer.Serialize(new
        {
            files = new Dictionary<string, object>
            {
                ["index.js"] = new { size = entrySize, offset = "0" },
                ["package.json"] = new { size = Encoding.UTF8.GetByteCount(package), offset = entrySize.ToString() }
            }
        });
        int length = Encoding.UTF8.GetByteCount(header);
        int alignedLength = (length + 3) & ~3;
        using var file = File.Create(destination);
        using var writer = new BinaryWriter(file, Encoding.UTF8, leaveOpen: false);
        writer.Write(4); // data size
        writer.Write(alignedLength + 8); // header size
        writer.Write(alignedLength + 4); // header object size
        writer.Write(length); // header string size
        writer.Write(Encoding.UTF8.GetBytes(header));
        writer.Write(Encoding.UTF8.GetBytes(new string('0', alignedLength - length)));
        writer.Write(Encoding.UTF8.GetBytes(entry));
        writer.Write(Encoding.UTF8.GetBytes(package));
    }
}

internal static class InstallerOperations
{
    private static readonly HttpClient Http = CreateHttpClient();
    private const string ReleaseApi = "https://api.github.com/repos/balcony3232/Nexcord-desktop/releases/tags/nexcord-dev";
    private static readonly string DataDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Nexcord");
    private static readonly string BundlePath = Path.Combine(DataDir, "nexcord.asar");

    private static HttpClient CreateHttpClient()
    {
        var client = new HttpClient { Timeout = TimeSpan.FromMinutes(3) };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("NexcordInstaller/0.1");
        client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        return client;
    }

    public static IReadOnlyList<DiscordInstall> FindDiscord()
    {
        var found = new List<DiscordInstall>();
        string baseDir = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        foreach (var (channel, folder) in new[] {
            ("Stable", "Discord"), ("PTB", "DiscordPTB"), ("Canary", "DiscordCanary")
        })
        {
            string root = Path.Combine(baseDir, folder);
            if (!Directory.Exists(root)) continue;
            var candidates = Directory.GetDirectories(root, "app-*")
                .Select(path => new { path, version = ParseVersion(Path.GetFileName(path)) })
                .OrderByDescending(x => x.version).ThenByDescending(x => x.path).ToArray();
            foreach (var item in candidates)
            {
                string resources = Path.Combine(item.path, "resources");
                if (File.Exists(Path.Combine(resources, "app.asar")))
                {
                    found.Add(new DiscordInstall(channel, root, resources));
                    break;
                }
            }
        }
        return found;
    }

    private static Version ParseVersion(string folder)
        => Version.TryParse(folder.StartsWith("app-") ? folder[4..] : folder, out var v)
            ? v : new Version(0, 0);

    private static bool IsNexcordLoader(string path)
    {
        if (!File.Exists(path)) return false;
        var info = new FileInfo(path);
        if (info.Length > 128 * 1024) return false;
        try
        {
            string text = Encoding.UTF8.GetString(File.ReadAllBytes(path));
            return text.Contains("nexcord.asar", StringComparison.OrdinalIgnoreCase)
                && text.Contains("index.js", StringComparison.Ordinal);
        }
        catch { return false; }
    }

    private static void EnsureDiscordClosed(string channel)
    {
        string process = channel switch
        {
            "PTB" => "DiscordPTB",
            "Canary" => "DiscordCanary",
            _ => "Discord"
        };
        if (Process.GetProcessesByName(process).Length != 0)
            throw new InvalidOperationException($"Close {channel} completely (including the system tray) before continuing.");
    }

    public static async Task<byte[]> FetchVerifiedReleaseAsync()
    {
        using var release = JsonDocument.Parse(await Http.GetStringAsync(ReleaseApi));
        var assets = release.RootElement.GetProperty("assets").EnumerateArray();
        JsonElement? bundle = null;
        foreach (var asset in assets)
        {
            if (asset.GetProperty("name").GetString() == "desktop.asar")
            {
                bundle = asset;
                break;
            }
        }
        if (bundle is null) throw new InvalidOperationException("Nexcord release has no desktop.asar asset.");

        string digest = bundle.Value.TryGetProperty("digest", out var dig)
            ? dig.GetString() ?? "" : "";
        if (!digest.StartsWith("sha256:", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("The release has no SHA-256 digest. Refusing an unverified download.");

        var url = bundle.Value.GetProperty("browser_download_url").GetString()
            ?? throw new InvalidOperationException("Missing release download URL.");
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != "https"
            || !string.Equals(uri.Host, "github.com", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Unexpected release asset host.");

        using var result = await Http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead);
        result.EnsureSuccessStatusCode();
        byte[] bytes = await result.Content.ReadAsByteArrayAsync();
        if (bytes.Length < 100_000 || bytes.Length > 100_000_000)
            throw new InvalidOperationException("Unexpected bundle size.");
        var hash = Convert.ToHexString(SHA256.HashData(bytes));
        if (!string.Equals(digest[7..], hash, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Nexcord release checksum mismatch.");
        return bytes;
    }

    public static void InstallOrUpdate(DiscordInstall install, byte[] verifiedBundle)
    {
        EnsureDiscordClosed(install.Channel);
        string app = Path.Combine(install.Resources, "app.asar");
        string backup = Path.Combine(install.Resources, "_app.asar");
        bool owned = IsNexcordLoader(app);
        if (File.Exists(backup) && !owned)
            throw new InvalidOperationException("Discord is already patched by another mod, or a prior installation was interrupted. Nexcord will not overwrite it.");
        if (!owned && new FileInfo(app).Length < 128 * 1024)
            throw new InvalidOperationException("Discord's app.asar looks modified. Uninstall the previous mod first.");

        Directory.CreateDirectory(DataDir);
        string temporary = BundlePath + ".download";
        File.WriteAllBytes(temporary, verifiedBundle);
        try
        {
            // Keep the old version as a rollback backup.
            if (File.Exists(BundlePath))
                File.Replace(temporary, BundlePath, BundlePath + ".previous", ignoreMetadataErrors: true);
            else
                File.Move(temporary, BundlePath);

            if (!owned)
            {
                File.Move(app, backup);
                try
                {
                    BootstrapAsar.Write(app, BundlePath);
                }
                catch
                {
                    if (File.Exists(app)) File.Delete(app);
                    File.Move(backup, app);
                    throw;
                }
            }
        }
        finally
        {
            if (File.Exists(temporary)) File.Delete(temporary);
        }
    }

    public static void Uninstall(DiscordInstall install)
    {
        EnsureDiscordClosed(install.Channel);
        string app = Path.Combine(install.Resources, "app.asar");
        string backup = Path.Combine(install.Resources, "_app.asar");
        if (!IsNexcordLoader(app) || !File.Exists(backup))
            throw new InvalidOperationException("Nexcord is not installed in this Discord channel.");
        string oldLoader = app + ".nexcord-uninstall";
        File.Move(app, oldLoader);
        try
        {
            File.Move(backup, app);
            File.Delete(oldLoader);
        }
        catch
        {
            if (!File.Exists(app) && File.Exists(oldLoader)) File.Move(oldLoader, app);
            throw;
        }
        // Keep user data and the shared bundle: another Discord channel may still use it.
    }
}

internal sealed class InstallerWindow : Form
{
    private readonly ComboBox _discords = new();
    private readonly Label _status = new();
    private readonly Button _install = new();
    private readonly Button _uninstall = new();
    private readonly Button _refresh = new();

    public InstallerWindow()
    {
        Text = "Nexcord Installer — Development Preview";
        StartPosition = FormStartPosition.CenterScreen;
        Size = new Size(660, 340);
        MinimumSize = new Size(660, 340);
        MaximumSize = new Size(800, 400);
        BackColor = Color.FromArgb(13, 15, 20);
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 10);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;

        var heading = new Label { Text = "Nexcord Desktop", Left = 24, Top = 20, Width = 590, Height = 42,
            ForeColor = Color.FromArgb(176, 137, 255), Font = new Font("Segoe UI", 21, FontStyle.Bold) };
        var note = new Label { Text = "Install or update Nexcord in your existing Discord app.", Left = 26, Top = 70,
            Width = 600, Height = 30, ForeColor = Color.Gainsboro };
        var selectLabel = new Label { Text = "Discord installation", Left = 26, Top = 111, Width = 240, Height = 25 };
        _discords.SetBounds(26, 139, 492, 30);
        _discords.DropDownStyle = ComboBoxStyle.DropDownList;
        _discords.BackColor = Color.FromArgb(36, 36, 44);
        _discords.ForeColor = Color.White;
        _refresh.Text = "Refresh";
        _refresh.SetBounds(526, 138, 105, 32);
        _refresh.Click += (_, _) => RefreshInstalls();

        _install.Text = "Install / Update";
        _install.SetBounds(26, 188, 290, 42);
        SetButtonStyle(_install, Color.FromArgb(113, 98, 218));
        _install.Click += async (_, _) => await InstallAsync();

        _uninstall.Text = "Uninstall / Restore Discord";
        _uninstall.SetBounds(328, 188, 303, 42);
        SetButtonStyle(_uninstall, Color.FromArgb(55, 54, 69));
        _uninstall.Click += (_, _) => Uninstall();

        _status.SetBounds(26, 248, 605, 48);
        _status.ForeColor = Color.LightGray;
        _status.Text = "Preview installer. Downloads verified builds from Nexcord GitHub Releases.";

        Controls.AddRange(new Control[] { heading, note, selectLabel, _discords, _refresh, _install, _uninstall, _status });
        RefreshInstalls();
    }

    private static void SetButtonStyle(Button button, Color background)
    {
        button.BackColor = background;
        button.ForeColor = Color.White;
        button.FlatStyle = FlatStyle.Flat;
        button.FlatAppearance.BorderSize = 0;
    }

    private void RefreshInstalls()
    {
        _discords.Items.Clear();
        foreach (var item in InstallerOperations.FindDiscord()) _discords.Items.Add(item);
        if (_discords.Items.Count != 0)
        {
            _discords.SelectedIndex = 0;
            _status.Text = "Ready. Choose a Discord installation above.";
        }
        else _status.Text = "No standard Discord Stable, PTB or Canary installation found.";
    }

    private async Task InstallAsync()
    {
        if (_discords.SelectedItem is not DiscordInstall discord) return;
        var confirm = MessageBox.Show(
            $"This will patch Discord {discord.Channel} on your PC. Close Discord first. Continue?",
            "Nexcord development build", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
        if (confirm != DialogResult.Yes) return;

        _install.Enabled = _uninstall.Enabled = _refresh.Enabled = false;
        try
        {
            _status.Text = "Downloading Nexcord from GitHub and verifying SHA-256...";
            byte[] bundle = await InstallerOperations.FetchVerifiedReleaseAsync();
            _status.Text = "Installing Nexcord and backing up the original Discord files...";
            InstallerOperations.InstallOrUpdate(discord, bundle);
            _status.Text = "Nexcord installed or updated successfully! Start Discord to test.";
            MessageBox.Show("Nexcord installation complete. Reopen Discord.", "Nexcord", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            _status.Text = "Installation stopped: " + ex.Message;
            MessageBox.Show(ex.Message, "Nexcord installer", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally { _install.Enabled = _uninstall.Enabled = _refresh.Enabled = true; }
    }

    private void Uninstall()
    {
        if (_discords.SelectedItem is not DiscordInstall discord) return;
        if (MessageBox.Show($"Restore original Discord {discord.Channel}? Your local Nexcord settings will be retained.",
            "Uninstall Nexcord", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
        try
        {
            InstallerOperations.Uninstall(discord);
            _status.Text = "Original Discord restored. You may now launch Discord normally.";
        }
        catch (Exception ex)
        {
            _status.Text = ex.Message;
            MessageBox.Show(ex.Message, "Nexcord uninstaller", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Contains("--self-test")) return InstallerSelfTests.Run();
        ApplicationConfiguration.Initialize();
        Application.Run(new InstallerWindow());
        return 0;
    }
}
