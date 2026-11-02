// Installer integration tests. Runs on Windows CI without touching real Discord.
using System.Text;
using System.Text.Json;

namespace NexcordInstaller;

internal static class InstallerSelfTests
{
    public static int Run()
    {
        string dir = Path.Combine(Path.GetTempPath(), "NexcordInstallerTest-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            string resources = Path.Combine(dir, "resources");
            Directory.CreateDirectory(resources);
            string app = Path.Combine(resources, "app.asar");
            string backup = Path.Combine(resources, "_app.asar");
            byte[] original = Enumerable.Repeat((byte)0xA5, 160_000).ToArray();
            File.WriteAllBytes(app, original);
            var discord = new DiscordInstall("Canary", dir, resources);
            byte[] mockVerifiedBundle = Enumerable.Repeat((byte)0xB6, 180_000).ToArray();

            InstallerOperations.InstallOrUpdate(discord, mockVerifiedBundle);
            Assert(File.Exists(backup), "Original Discord app.asar was not backed up");
            Assert(File.ReadAllBytes(backup).SequenceEqual(original), "Backup does not match original");
            VerifyBootstrap(app);
            InstallerOperations.InstallOrUpdate(discord, mockVerifiedBundle);
            VerifyBootstrap(app);
            InstallerOperations.Uninstall(discord);
            Assert(File.Exists(app) && File.ReadAllBytes(app).SequenceEqual(original), "Uninstall did not restore original Discord");
            Assert(!File.Exists(backup), "Uninstall did not remove backup marker");

            File.WriteAllBytes(backup, original);
            bool refusedForeignPatch = false;
            try { InstallerOperations.InstallOrUpdate(discord, mockVerifiedBundle); }
            catch (InvalidOperationException) { refusedForeignPatch = true; }
            Assert(refusedForeignPatch, "Installer failed to refuse another mod's backup marker");

            Console.WriteLine("Nexcord installer self-test: PASS");
            return 0;
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine("Nexcord installer self-test: FAIL - " + exception);
            return 1;
        }
        finally
        {
            try { Directory.Delete(dir, recursive: true); } catch { }
        }
    }

    private static void VerifyBootstrap(string path)
    {
        using var fs = File.OpenRead(path);
        using var r = new BinaryReader(fs);
        int first = r.ReadInt32();
        int headerSize = r.ReadInt32();
        int headerObjectSize = r.ReadInt32();
        int stringSize = r.ReadInt32();
        Assert(first == 4 && headerSize == headerObjectSize + 4, "Invalid ASAR header lengths");
        Assert(headerObjectSize - 4 >= stringSize, "Invalid ASAR header padding");
        string json = Encoding.UTF8.GetString(r.ReadBytes(stringSize));
        using var header = JsonDocument.Parse(json);
        var entries = header.RootElement.GetProperty("files");
        Assert(entries.GetProperty("index.js").GetProperty("offset").GetString() == "0", "Missing loader entry");
        Assert(entries.GetProperty("package.json").GetProperty("size").GetInt32() > 0, "Missing package metadata");
        long offset = 16L + headerObjectSize - 4;
        fs.Position = offset;
        byte[] body = r.ReadBytes((int)(fs.Length - offset));
        Assert(Encoding.UTF8.GetString(body).Contains("nexcord.asar", StringComparison.OrdinalIgnoreCase), "Loader does not target Nexcord");
    }

    private static void Assert(bool value, string message)
    {
        if (!value) throw new InvalidOperationException(message);
    }
}
