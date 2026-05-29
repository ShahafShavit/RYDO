# Sets User-level JAVA_HOME and ANDROID_HOME for Capacitor Android builds on Windows.
# Capacitor 7 requires JDK 21+ to compile (error: invalid source release: 21).
#
# Configure only (existing installs):
#   .\scripts\setup-windows-env.ps1
#
# Install missing prerequisites, then configure:
#   .\scripts\setup-windows-env.ps1 -Install
#
# Restart the terminal / Cursor after running.

param(
  [switch]$Install,
  [switch]$SkipAndroidStudio
)

$ErrorActionPreference = 'Stop'

$MinJavaMajor = 21
$AndroidCompileSdk = 35
$AndroidBuildTools = '35.0.0'
$JdkWingetId = 'EclipseAdoptium.Temurin.21.JDK'
$AndroidStudioWingetId = 'Google.AndroidStudio'

$JdkSearchPatterns = @(
  'C:\Program Files\Eclipse Adoptium\jdk-2*',
  'C:\Program Files\Java\jdk-2*',
  'C:\Program Files\Microsoft\jdk-2*'
)

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-WingetAvailable {
  return [bool](Get-Command winget -ErrorAction SilentlyContinue)
}

function Test-WingetPackageInstalled {
  param([Parameter(Mandatory)][string]$Id)

  $raw = & winget list --id $Id -e --disable-interactivity 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    return $false
  }
  return $raw -match [regex]::Escape($Id)
}

function Invoke-WingetInstall {
  param(
    [Parameter(Mandatory)][string]$Id,
    [Parameter(Mandatory)][string]$Label
  )

  if (Test-WingetPackageInstalled -Id $Id) {
    Write-Host "$Label already installed ($Id)."
    return
  }

  Write-Host "Installing $Label via winget ($Id)..."
  Write-Host "This may take several minutes."

  & winget install --id $Id -e `
    --accept-package-agreements `
    --accept-source-agreements `
    --disable-interactivity

  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189) {
    throw "winget install failed for $Id (exit code $LASTEXITCODE)."
  }
}

function Get-NativeCommandOutput {
  param([Parameter(Mandatory)][string[]]$Command)

  # java -version and many SDK tools write to stderr; with Stop that becomes terminating.
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $exe = $Command[0]
    $args = @()
    if ($Command.Length -gt 1) {
      $args = $Command[1..($Command.Length - 1)]
    }
    return (& $exe @args 2>&1 | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { "$_" }
    } | Out-String)
  }
  finally {
    $ErrorActionPreference = $prev
  }
}

function Get-JavaMajor {
  param([Parameter(Mandatory)][string]$JdkRoot)

  $javaExe = Join-Path $JdkRoot 'bin\java.exe'
  if (-not (Test-Path $javaExe)) {
    return 0
  }

  $verOut = Get-NativeCommandOutput -Command @($javaExe, '-version')
  if ($verOut -match 'version "(\d+)') {
    return [int]$Matches[1]
  }
  return 0
}

function Find-InstalledJdk {
  $best = $null
  $bestMajor = 0

  foreach ($pattern in $JdkSearchPatterns) {
    $candidates = @(Get-Item -Path $pattern -ErrorAction SilentlyContinue)
    foreach ($candidate in ($candidates | Sort-Object FullName -Descending)) {
      $major = Get-JavaMajor -JdkRoot $candidate.FullName
      if ($major -ge $MinJavaMajor -and $major -gt $bestMajor) {
        $best = $candidate.FullName
        $bestMajor = $major
      }
      elseif (-not $best -and $major -ge 17) {
        $best = $candidate.FullName
        $bestMajor = $major
      }
    }
  }

  if (-not $best) {
    return $null
  }

  return [PSCustomObject]@{
    Path  = $best
    Major = $bestMajor
  }
}

function Install-Jdk {
  if (-not (Test-WingetAvailable)) {
    throw 'winget is required to install JDK 21+. Install App Installer from the Microsoft Store, then re-run with -Install.'
  }

  Invoke-WingetInstall -Id $JdkWingetId -Label 'Eclipse Temurin JDK 21'

  $deadline = (Get-Date).AddMinutes(2)
  do {
    $jdk = Find-InstalledJdk
    if ($jdk -and $jdk.Major -ge $MinJavaMajor) {
      return $jdk
    }
    Start-Sleep -Seconds 3
  } while ((Get-Date) -lt $deadline)

  $jdk = Find-InstalledJdk
  if (-not $jdk -or $jdk.Major -lt $MinJavaMajor) {
    throw "JDK install finished but JDK $MinJavaMajor+ was not found. Restart PowerShell and re-run this script."
  }
  return $jdk
}

function Get-DefaultAndroidSdkPath {
  return Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}

function Test-AndroidStudioInstalled {
  $studioRoots = @(
    (Join-Path ${env:ProgramFiles} 'Android\Android Studio'),
    (Join-Path ${env:ProgramFiles(x86)} 'Android\Android Studio'),
    (Join-Path ${env:LOCALAPPDATA} 'Programs\Android Studio')
  )
  foreach ($root in $studioRoots) {
    if (Test-Path (Join-Path $root 'bin\studio64.exe')) {
      return $true
    }
  }
  return (Test-WingetPackageInstalled -Id $AndroidStudioWingetId)
}

function Install-AndroidStudio {
  if (-not (Test-WingetAvailable)) {
    throw 'winget is required to install Android Studio.'
  }

  Invoke-WingetInstall -Id $AndroidStudioWingetId -Label 'Android Studio'
}

function Get-AndroidCmdlineToolsUrl {
  $repoUrl = 'https://dl.google.com/android/repository/repository2-1.xml'
  $repoBase = 'https://dl.google.com/android/repository/'
  $content = (Invoke-WebRequest -Uri $repoUrl -UseBasicParsing).Content

  $marker = 'path="cmdline-tools;latest"'
  $start = $content.IndexOf($marker)
  if ($start -ge 0) {
    $end = $content.IndexOf('</remotePackage>', $start)
    if ($end -gt $start) {
      $block = $content.Substring($start, $end - $start)
      if ($block -match '<url>(commandlinetools-win-[^<]+\.zip)</url>[\s\S]*?<host-os>windows</host-os>') {
        return $repoBase + $Matches[1]
      }
    }
  }

  $matches = [regex]::Matches($content, 'commandlinetools-win-(\d+)_latest\.zip')
  if ($matches.Count -eq 0) {
    throw 'Could not resolve Android command-line tools download URL.'
  }

  $build = ($matches | ForEach-Object { [int]$_.Groups[1].Value } | Measure-Object -Maximum).Maximum
  return "${repoBase}commandlinetools-win-${build}_latest.zip"
}

function Ensure-AndroidCmdlineTools {
  param([Parameter(Mandatory)][string]$SdkRoot)

  $sdkManager = Join-Path $SdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
  if (Test-Path $sdkManager) {
    return $sdkManager
  }

  Write-Step 'Bootstrapping Android SDK command-line tools'
  New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null

  $zipUrl = Get-AndroidCmdlineToolsUrl
  $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("rydo-android-sdk-" + [guid]::NewGuid().ToString('N'))
  $zipPath = Join-Path $tempRoot 'cmdline-tools.zip'
  $extractRoot = Join-Path $tempRoot 'extract'

  try {
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
    Write-Host "Downloading $zipUrl"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

    New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extractRoot)

    $latestRoot = Join-Path $SdkRoot 'cmdline-tools\latest'
    New-Item -ItemType Directory -Force -Path $latestRoot | Out-Null

    $inner = Get-ChildItem -Path $extractRoot
    if ($inner.Count -eq 1 -and $inner[0].PSIsContainer) {
      Copy-Item -Path (Join-Path $inner[0].FullName '*') -Destination $latestRoot -Recurse -Force
    }
    else {
      Copy-Item -Path (Join-Path $extractRoot '*') -Destination $latestRoot -Recurse -Force
    }
  }
  finally {
    if (Test-Path $tempRoot) {
      Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
  }

  if (-not (Test-Path $sdkManager)) {
    throw "sdkmanager not found at $sdkManager after bootstrap."
  }

  return $sdkManager
}

function Install-AndroidSdkPackages {
  param([Parameter(Mandatory)][string]$SdkRoot)

  $sdkManager = Ensure-AndroidCmdlineTools -SdkRoot $SdkRoot
  $packages = @(
    'platform-tools',
    "platforms;android-$AndroidCompileSdk",
    "build-tools;$AndroidBuildTools"
  )

  Write-Step "Installing Android SDK packages: $($packages -join ', ')"
  Write-Host "Accepting SDK licenses..."

  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $licenseInput = ("y`n" * 100)
    $licenseInput | & $sdkManager --sdk_root=$SdkRoot --licenses | Out-Host

    & $sdkManager --sdk_root=$SdkRoot @packages | Out-Host
  }
  finally {
    $ErrorActionPreference = $prev
  }

  if ($LASTEXITCODE -ne 0) {
    throw "sdkmanager failed installing Android SDK packages (exit code $LASTEXITCODE)."
  }
}

function Set-ProcessDevEnvironment {
  param(
    [Parameter(Mandatory)][string]$JdkPath,
    [string]$SdkPath
  )

  $env:JAVA_HOME = $JdkPath
  $jdkBin = Join-Path $JdkPath 'bin'
  if ($env:Path -notlike "*$jdkBin*") {
    $env:Path = $jdkBin + ';' + $env:Path
  }

  if ($SdkPath) {
    $env:ANDROID_HOME = $SdkPath
    $env:ANDROID_SDK_ROOT = $SdkPath
    $platformTools = Join-Path $SdkPath 'platform-tools'
    if ($env:Path -notlike "*$platformTools*") {
      $env:Path = $platformTools + ';' + $env:Path
    }
  }
}

function Set-UserDevEnvironment {
  param(
    [Parameter(Mandatory)][string]$JdkPath,
    [Parameter(Mandatory)][int]$JdkMajor,
    [string]$SdkPath
  )

  [Environment]::SetEnvironmentVariable('JAVA_HOME', $JdkPath, 'User')
  Write-Host "JAVA_HOME = $JdkPath (Java $JdkMajor)"

  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not $userPath) {
    $userPath = ''
  }

  $jdkBin = Join-Path $JdkPath 'bin'
  if ($userPath -notlike "*$jdkBin*") {
    [Environment]::SetEnvironmentVariable('Path', ($jdkBin + ';' + $userPath), 'User')
    Write-Host "Prepended to User Path: $jdkBin"
  }

  if ($SdkPath -and (Test-Path $SdkPath)) {
    [Environment]::SetEnvironmentVariable('ANDROID_HOME', $SdkPath, 'User')
    [Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $SdkPath, 'User')

    $platformTools = Join-Path $SdkPath 'platform-tools'
    $newPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($newPath -notlike "*$platformTools*") {
      [Environment]::SetEnvironmentVariable('Path', ($platformTools + ';' + $newPath), 'User')
    }
    Write-Host "ANDROID_HOME = $SdkPath"
  }
  else {
    Write-Warning "Android SDK not found at $SdkPath - install Android Studio or re-run with -Install."
  }
}

Write-Host '--- RYDO Android prerequisites (Windows) ---'

if ($Install) {
  Write-Step 'Installing missing prerequisites'

  $jdk = Find-InstalledJdk
  if (-not $jdk -or $jdk.Major -lt $MinJavaMajor) {
    $jdk = Install-Jdk
  }
  else {
    Write-Host "JDK $($jdk.Major) already installed at $($jdk.Path)."
  }

  $sdkPath = Get-DefaultAndroidSdkPath

  if (-not $SkipAndroidStudio) {
    if (-not (Test-AndroidStudioInstalled)) {
      Install-AndroidStudio
    }
    else {
      Write-Host 'Android Studio already installed.'
    }

    Set-ProcessDevEnvironment -JdkPath $jdk.Path -SdkPath $sdkPath
    Install-AndroidSdkPackages -SdkRoot $sdkPath
  }
  else {
    Write-Host 'Skipping Android Studio / SDK install (-SkipAndroidStudio).'
  }
}
else {
  $jdk = Find-InstalledJdk
  $sdkPath = Get-DefaultAndroidSdkPath
}

Write-Step 'Configuring User environment variables'

if (-not $jdk) {
  Write-Error @"
No suitable JDK found. Capacitor 7 Android needs JDK 21+.

Install automatically:
  powershell -File scripts/setup-windows-env.ps1 -Install

Or install manually:
  https://adoptium.net/
"@
}

if ($jdk.Major -lt $MinJavaMajor) {
  Write-Warning "Selected JDK $($jdk.Major) - Capacitor needs $MinJavaMajor+. Re-run with -Install or install JDK 21+ manually."
}

if (-not $sdkPath) {
  $sdkPath = Get-DefaultAndroidSdkPath
}

Set-ProcessDevEnvironment -JdkPath $jdk.Path -SdkPath $sdkPath
Set-UserDevEnvironment -JdkPath $jdk.Path -JdkMajor $jdk.Major -SdkPath $sdkPath

Write-Host ''
Write-Host 'Done. Close and reopen your terminal (and Cursor) so changes apply.'
Write-Host 'Then: cd mobile && npm run check:android && npm run run:android'

if ($Install -and -not $SkipAndroidStudio) {
  Write-Host ''
  Write-Host 'Emulator: open Android Studio -> Device Manager -> Create device -> Start (play).'
  Write-Host 'API must be running: docker compose up (from repo root).'
}
