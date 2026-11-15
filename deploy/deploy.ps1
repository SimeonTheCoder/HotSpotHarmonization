<#
.SYNOPSIS
    Pulls the latest main branch, builds HSH.API + HSH.Client on this PC and (re)starts the HSH.API Windows service.

.DESCRIPTION
    Run it on the server PC, in PowerShell as Administrator, from the cloned repo.

    First time (creates the service, firewall rule and server settings):
        .\deploy\deploy.ps1 -Install

    Updates happen only when you run it (only rebuilds when main has new commits):
        .\deploy\deploy.ps1
        .\deploy\deploy.ps1 -Force      # rebuild even without new commits

    Needs on the server: Git, .NET 10 SDK, Node.js 22.13+ (with npm).

.NOTES
    Works in Windows PowerShell 5.1 (the one built into Windows 10).
#>
param(
    [string]$RepoDir = (Split-Path -Parent $PSScriptRoot),
    [string]$InstallDir = 'C:\Apps\HSH',
    [string]$ServiceName = 'HSH.API',
    [string]$Branch = 'main',
    [int]$Port = 5000,
    [switch]$Install,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Step($text) { Write-Host "==> $text" -ForegroundColor Cyan }

function Invoke-Native($exe, [string[]]$arguments) {
    & $exe @arguments
    if ($LASTEXITCODE -ne 0) { throw "$exe $($arguments -join ' ') failed with exit code $LASTEXITCODE" }
}

# ---- checks -------------------------------------------------------------------------------
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script in PowerShell as Administrator.'
}
foreach ($tool in 'git', 'dotnet', 'npm') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "'$tool' was not found. Install it first." }
}

$logFile = Join-Path (Split-Path -Parent $InstallDir) 'HSH-deploy.log'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $logFile) | Out-Null
Start-Transcript -Path $logFile -Append | Out-Null

try {
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

    # ---- 1. get the latest code -------------------------------------------------------------
    Step "Checking $Branch for new commits"
    Invoke-Native git @('-C', $RepoDir, 'fetch', '--quiet', 'origin', $Branch)
    $local = (git -C $RepoDir rev-parse HEAD).Trim()
    $remote = (git -C $RepoDir rev-parse "origin/$Branch").Trim()

    if ($local -eq $remote -and $service -and -not $Force -and -not $Install) {
        Write-Host "Already up to date ($($local.Substring(0, 7))). Nothing to do."
        return
    }

    if ($local -ne $remote) {
        Step "Updating $($local.Substring(0, 7)) -> $($remote.Substring(0, 7))"
        Invoke-Native git @('-C', $RepoDir, 'checkout', '--quiet', $Branch)
        Invoke-Native git @('-C', $RepoDir, 'merge', '--ff-only', '--quiet', "origin/$Branch")
    }

    # ---- 2. build (the API project also builds the website into wwwroot) --------------------
    $staging = Join-Path $RepoDir 'publish\HSH.API'
    Step 'Building HSH.API and HSH.Client'
    if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
    Invoke-Native dotnet @('publish', (Join-Path $RepoDir 'HSH.API'), '-c', 'Release', '-o', $staging, '--nologo')

    # ---- 3. first-time setup ----------------------------------------------------------------
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    $settingsFile = Join-Path $InstallDir 'appsettings.Production.json'

    if ($Install -and -not (Test-Path $settingsFile)) {
        Step 'Creating appsettings.Production.json (server settings, never overwritten by updates)'
        $login = Read-Host 'SQL login for the API [hsh_app]'
        if (-not $login) { $login = 'hsh_app' }
        $secure = Read-Host "Password of $login" -AsSecureString
        $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

        $cs = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
        $cs['Data Source'] = '.'
        $cs['Initial Catalog'] = 'HSH'
        $cs['User ID'] = $login
        $cs['Password'] = $password
        $cs['Encrypt'] = $true
        $cs['TrustServerCertificate'] = $true

        @{
            ConnectionStrings = @{ DefaultConnection = $cs.ConnectionString }
            Urls              = "http://0.0.0.0:$Port"
        } | ConvertTo-Json -Depth 5 | Set-Content -Path $settingsFile -Encoding UTF8
    }
    if (-not (Test-Path $settingsFile)) {
        throw "$settingsFile is missing. Run the script once with -Install."
    }

    # ---- 4. swap the files and restart --------------------------------------------------------
    if ($service -and $service.Status -ne 'Stopped') {
        Step "Stopping $ServiceName"
        Stop-Service -Name $ServiceName -Force
        (Get-Service $ServiceName).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(30))
        Start-Sleep -Seconds 2   # let Windows release the files
    }

    Step "Copying the new version to $InstallDir"
    # /MIR mirrors the build, /XF keeps the server's own settings file,
    # /XD keeps App_Data (the generated heatmap.png, which takes minutes to build)
    robocopy $staging $InstallDir /MIR /XF appsettings.Production.json /XD (Join-Path $InstallDir 'App_Data') /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

    if (-not $service) {
        Step "Creating the Windows service $ServiceName"
        New-Service -Name $ServiceName -BinaryPathName "`"$(Join-Path $InstallDir 'HSH.API.exe')`"" `
            -DisplayName 'HotSpot Harmonization API + website' -StartupType Automatic | Out-Null
        # restart automatically if it crashes
        sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/5000/restart/60000 | Out-Null
    }

    if ($Install -and -not (Get-NetFirewallRule -DisplayName "HSH website $Port" -ErrorAction SilentlyContinue)) {
        Step "Opening port $Port in Windows Firewall"
        New-NetFirewallRule -DisplayName "HSH website $Port" -Direction Inbound -Protocol TCP `
            -LocalPort $Port -Action Allow -Profile Any | Out-Null
    }

    Step "Starting $ServiceName"
    Start-Service -Name $ServiceName

    # ---- 5. check that the website answers ----------------------------------------------------
    $ok = $false
    for ($i = 0; $i -lt 15 -and -not $ok; $i++) {
        Start-Sleep -Seconds 2
        try {
            $ok = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "http://localhost:$Port/").StatusCode -eq 200
        } catch { }
    }
    if (-not $ok) { throw "The service started but http://localhost:$Port/ does not answer. Check the Windows Event Viewer (Application)." }

    $version = (git -C $RepoDir rev-parse --short HEAD).Trim()
    Write-Host "Deployed $version. Website: http://localhost:$Port/  Swagger: http://localhost:$Port/swagger" -ForegroundColor Green
}
finally {
    Stop-Transcript | Out-Null
}
