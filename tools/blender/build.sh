#!/usr/bin/env bash
# Regenerates Blender-authored world models into public/world/models/.
#   tools/blender/build.sh                  # all models
#   tools/blender/build.sh trees landmark   # named models
#   PREVIEW=docs/art tools/blender/build.sh # also write Cycles previews to docs/art
# Needs Python 3.11 with the Blender module (pip install -r tools/blender/requirements.txt)
# and Node for the meshopt compression step.
set -euo pipefail
cd "$(dirname "$0")/../.."
models=("$@"); [ ${#models[@]} -eq 0 ] && models=(trees landmark)
mkdir -p public/world/models
for model in "${models[@]}"; do
  python3 "tools/blender/${model}.py" --out "tools/blender/build/${model}.raw.glb" ${PREVIEW:+--preview "$PREVIEW"}
  npx --yes @gltf-transform/cli@4.5.0 meshopt "tools/blender/build/${model}.raw.glb" "public/world/models/${model}.glb"
done
