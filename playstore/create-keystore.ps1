# Create the Play upload keystore in playstore/ (run once; back up the file securely).
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Keystore = Join-Path $Root "rydo-upload.keystore"

if (Test-Path $Keystore) {
    Write-Host "Keystore already exists: $Keystore"
    Write-Host "Delete it first if you really need a new one (you cannot replace it on Play after first upload)."
    exit 1
}

Write-Host "Creating upload keystore at $Keystore"
Write-Host "You will be prompted for keystore password, key password, and certificate details."
Write-Host ""

& keytool -genkeypair `
    -alias rydo-upload `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -keystore $Keystore

Write-Host ""
Write-Host "Done. Next:"
Write-Host "  1. Copy keystore.properties.example to keystore.properties and edit passwords"
Write-Host "  2. Back up $Keystore and keystore.properties offline"
Write-Host "  3. node build-release-aab.mjs"
