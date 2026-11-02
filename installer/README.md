# Nexcord Installer (Windows x64, v0.1 preview)

This source builds a single Windows Forms executable with .NET 8.

- Detects standard Discord Stable, PTB and Canary installations.
- Downloads `desktop.asar` from the public `nexcord-dev` GitHub release.
- Verifies the SHA-256 digest advertised by the GitHub release before writing it.
- Keeps original Discord `app.asar` as `_app.asar`; restores it during uninstall.
- Refuses to overwrite another client's patched install.
- Saves mod data separately in `%APPDATA%\\Nexcord\\nexcord.asar`.
- Reuse the *same installer executable* to fetch newer Nexcord preview releases.
- Requires Discord to be fully closed before patching.
- GUI is unsigned; Windows SmartScreen may warn. Only download from our repo.

This is a preview, not a production-grade installer. It does not automatically repair
Discord updates or handle all Store/MSIX installs. Do not use it on your only Discord
installation until the PTB/Canary smoke test has passed.

Local build:
```powershell
dotnet publish installer/NexcordInstaller.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true
```

The Windows GitHub Actions build uploads the portable `NexcordInstaller.exe`.
