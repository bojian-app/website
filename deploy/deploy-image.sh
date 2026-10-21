#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
release=${1:?Usage: bash deploy/deploy-image.sh RELEASE}
[[ "$release" =~ ^[a-z0-9][a-z0-9.-]*$ ]] || { echo 'Invalid release name' >&2; exit 1; }
host=${BOJIAN_DEPLOY_HOST:-106.52.31.209}
local_dir="artifacts/$release"
remote_dir="/home/ubuntu/bojian-releases/$release"
(cd "$local_dir" && shasum -a 256 -c image.sha256)
ssh -o BatchMode=yes "$host" "umask 077; mkdir '$remote_dir'"
scp -q "$local_dir/image.tar.gz" "$local_dir/image.sha256" "$local_dir/image.id" \
  "$local_dir/compose.website.yaml" deploy/load-and-switch.py "$host:$remote_dir/"
ssh -o BatchMode=yes "$host" "python3 '$remote_dir/load-and-switch.py' '$remote_dir'"
