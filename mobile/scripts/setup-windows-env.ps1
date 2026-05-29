# Sets User-level JAVA_HOME and ANDROID_HOME for Capacitor Android builds on Windows.
# Capacitor 7 requires JDK 21+ to compile (error: invalid source release: 21).
# Run from PowerShell:  .\scripts\setup-windows-env.ps1
# Restart the terminal / Cursor after running.

$ErrorActionPreference = 'Stop'

# Prefer JDK 21+ (newest first). JDK 17 is not enough for Capacitor 7 Android.
$jdkPatterns = @(
  'C:\Program Files\Java\jdk-23*',
  'C:\Program Files\Java\jdk-22*',
  'C:\Program Files\Java\jdk-21*',
  'C:\Program Files\Eclipse Adoptium\jdk-21*',
  'C:\Program Files\Microsoft\jdk-21*',
  'C:\Program Files\Eclipse Adoptium\jdk-17*',
  'C:\Program Files\Java\jdk-17*'
)

$jdk = $null
$jdkMajor = 0
foreach ($pattern in $jdkPatterns) {
  $resolved = Get-Item -Path $pattern -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
  if (-not $resolved) { continue }
  $verOut = & (Join-Path $resolved.FullName 'bin\java.exe') -version 2>&1 | Out-String
  if ($verOut -match 'version "(\d+)') {
    $major = [int]$Matches[1]
    if ($major -ge 21) {
      $jdk = $resolved.FullName
      $jdkMajor = $major
      break
    }
    if (-not $jdk -and $major -ge 17) {
      $jdk = $resolved.FullName
      $jdkMajor = $major
    }
  }
}

if (-not $jdk) {
  Write-Error @'
No suitable JDK found. Capacitor 7 Android needs JDK 21+.
Install Eclipse Temurin 21 or 23: https://adoptium.net/
Or use Android Studio bundled JBR 21+.
'@
}

if ($jdkMajor -lt 21) {
  Write-Warning "Selected JDK $jdkMajor — Capacitor needs 21+. Install JDK 21+ and re-run this script."
}

[Environment]::SetEnvironmentVariable('JAVA_HOME', $jdk, 'User')
Write-Host "JAVA_HOME = $jdk (Java $jdkMajor)"

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$jdkBin = Join-Path $jdk 'bin'
# Remove other JDK bin entries from front of path is hard; prepend correct one
if ($userPath -notlike "*$jdkBin*") {
  [Environment]::SetEnvironmentVariable('Path', "$jdkBin;$userPath", 'User')
  Write-Host "Prepended to User Path: $jdkBin"
}

$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (Test-Path $sdk) {
  [Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdk, 'User')
  [Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $sdk, 'User')
  $platformTools = Join-Path $sdk 'platform-tools'
  $newPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if ($newPath -notlike "*$platformTools*") {
    [Environment]::SetEnvironmentVariable('Path', "$platformTools;$newPath", 'User')
  }
  Write-Host "ANDROID_HOME = $sdk"
} else {
  Write-Warning "Android SDK not found at $sdk — install Android Studio first."
}

Write-Host ''
Write-Host 'Done. Close and reopen your terminal (and Cursor) so changes apply.'
Write-Host 'Then: cd mobile && npm run check:android && npm run run:android'
