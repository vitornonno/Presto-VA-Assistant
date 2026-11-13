#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
case "$(uname -m)" in
  arm64) host="mac-arm64/CleaningUpdaterHost" ;;
  x86_64) host="mac-x64/CleaningUpdaterHost" ;;
  *) printf 'Arquitetura do Mac não suportada.\n'; exit 1 ;;
esac
if [ ! -f "$host" ]; then
  printf 'Auxiliar para este Mac não encontrado no pacote.\n'
  exit 1
fi
chmod u+x "$host"
"$PWD/$host" --setup
