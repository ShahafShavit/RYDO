#!/usr/bin/env bash
# Source in Git Bash when JAVA_HOME is still wrong after setup-windows-env.ps1:
#   source scripts/android-env.sh
#
# Or: eval "$(npm run env:shell --silent 2>/dev/null)"  — use export below directly.

_win_env() {
  powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('$1','User')" 2>/dev/null | tr -d '\r'
}

_jdk="$(_win_env JAVA_HOME)"
_sdk="$(_win_env ANDROID_HOME)"

if [[ -n "$_jdk" ]]; then
  export JAVA_HOME="$_jdk"
fi
if [[ -n "$_sdk" ]]; then
  export ANDROID_HOME="$_sdk"
  export ANDROID_SDK_ROOT="$_sdk"
  case ":$PATH:" in
    *":$ANDROID_HOME/platform-tools:"*) ;;
    *) export PATH="$ANDROID_HOME/platform-tools:$PATH" ;;
  esac
fi

if [[ -n "$JAVA_HOME" ]]; then
  echo "JAVA_HOME=$JAVA_HOME"
else
  echo "JAVA_HOME not set — run: powershell -File scripts/setup-windows-env.ps1" >&2
fi
