#!/usr/bin/env bash
# Regenerates public/world/models/trees.glb from tools/blender/trees.py.
# Needs Python 3.11 with the Blender module (pip install -r tools/blender/requirements.txt)
# and Node for the meshopt compression step. Extra arguments go to trees.py (e.g. --preview docs/art).
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 tools/blender/trees.py --out tools/blender/build/trees.raw.glb "$@"
mkdir -p public/world/models
npx --yes @gltf-transform/cli@4.5.0 meshopt tools/blender/build/trees.raw.glb public/world/models/trees.glb
