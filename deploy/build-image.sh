#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

release=${1:?Usage: bash deploy/build-image.sh RELEASE}
[[ "$release" =~ ^[a-z0-9][a-z0-9.-]*$ ]] || { echo 'Invalid release name' >&2; exit 1; }
destination="artifacts/$release"
mkdir -p "$destination"
image="bojian-website:$release"
python3 - "$destination" <<'PY'
import hashlib, json, subprocess, sys
from pathlib import Path
files = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"]).decode().split("\0")
manifest = {name: hashlib.sha256(Path(name).read_bytes()).hexdigest() for name in sorted(set(files)) if name and Path(name).is_file()}
Path(sys.argv[1], "source-sha256.json").write_text(json.dumps(manifest, indent=2) + "\n")
PY

docker buildx build --platform linux/amd64 --load \
  --label "org.opencontainers.image.revision=$(git rev-parse HEAD)" \
  --label "org.opencontainers.image.version=$release" \
  --tag "$image" .
docker image inspect "$image" --format '{{.Id}}' > "$destination/image.id"
docker image inspect "$image" --format '{{.Os}}/{{.Architecture}}' > "$destination/platform.txt"
test "$(cat "$destination/platform.txt")" = linux/amd64
docker save "$image" | gzip > "$destination/image.tar.gz"
(cd "$destination" && shasum -a 256 image.tar.gz > image.sha256)
cp deploy/compose.website.yaml "$destination/compose.website.yaml"
git diff --binary HEAD > "$destination/source.patch"
git rev-parse HEAD > "$destination/source-revision.txt"
printf 'Built %s; image archive: %s/image.tar.gz\n' "$image" "$destination"
