#!/bin/sh
# Descarga PocketBase en backend/bin/ para desarrollar en local (el binario no va al repo).
# Misma versión y checksum que el Containerfile.
set -eu
VERSION=0.40.4
SHA256=9042ec818570e79c3628dadcd0a756c1496d9e1173918ec409d133c02f82e5fa
cd "$(dirname "$0")"
mkdir -p bin
curl -fsSL -o bin/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/pocketbase_${VERSION}_linux_amd64.zip"
echo "${SHA256}  bin/pb.zip" | sha256sum -c -
python3 -c "import zipfile; zipfile.ZipFile('bin/pb.zip').extract('pocketbase', 'bin')"
chmod +x bin/pocketbase
rm bin/pb.zip
bin/pocketbase --version
