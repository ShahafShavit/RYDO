#!/usr/bin/env bash
# Create the Play upload keystore in playstore/ (run once; back up the file securely).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
KEYSTORE="$ROOT/rydo-upload.keystore"

if [[ -f "$KEYSTORE" ]]; then
  echo "Keystore already exists: $KEYSTORE"
  echo "Delete it first if you really need a new one (you cannot replace it on Play after first upload)."
  exit 1
fi

echo "Creating upload keystore at $KEYSTORE"
echo "You will be prompted for keystore password, key password, and certificate details."
echo ""

keytool -genkeypair \
  -alias rydo-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keystore "$KEYSTORE"

echo ""
echo "Done. Next:"
echo "  1. cp keystore.properties.example keystore.properties  (edit passwords)"
echo "  2. Back up $KEYSTORE and keystore.properties offline"
echo "  3. node build-release-aab.mjs"
