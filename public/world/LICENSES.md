# World asset sources and licenses

Every file under `public/world/` except `models/` comes from [Poly Haven](https://polyhaven.com) and is
released under **CC0 1.0** (public domain dedication; no attribution required, credited
here anyway). Files were downloaded on 2026-09-24 and modified as noted. No creator
project media is stored here.

| File(s) | Asset | Authors | Source | Changes |
| --- | --- | --- | --- | --- |
| `sky/kloppenheim_06_1k.hdr` | Kloppenheim 06 (Pure Sky) | Greg Zaal (original), Jarod Guest (sky edits) | https://polyhaven.com/a/kloppenheim_06_puresky | None (1k HDR). Used for image-based lighting. |
| `sky/kloppenheim_06_upper.webp` | Kloppenheim 06 (Pure Sky) | Greg Zaal, Jarod Guest | https://polyhaven.com/a/kloppenheim_06_puresky | Tonemapped JPG resized to 4096 wide, cropped to the upper 1152 rows (sky above ~11° below horizon), WebP q84. |
| `textures/marble_01_*.webp` | Marble 01 | Rob Tuytel | https://polyhaven.com/a/marble_01 | 2k set; diffuse brightened 4% and desaturated to 30%; roughness grayscale at half size; WebP. |
| `textures/plastered_wall_04_*.webp` | Plastered Wall 04 | Rob Tuytel | https://polyhaven.com/a/plastered_wall_04 | 1k set; diffuse brightened, desaturated to 45%, levels lifted; roughness at half size; WebP. |
| `textures/rock_boulder_dry_*.webp` | Rock Boulder Dry | Dimitrios Savva (photography), Rico Cilliers (processing) | https://polyhaven.com/a/rock_boulder_dry | 1k set; diffuse brightened and desaturated to 35%; roughness at half size; WebP. |
| `textures/red_oak_veneer_*.webp` | Red Oak Veneer | Jenelle van Heerden | https://polyhaven.com/a/red_oak_veneer | 1k set; roughness at half size; WebP. |

| `models/trees.glb` | District trees (4 species × 2 LODs, leaf-spray atlas, bark texture) | Demo District (generated) | `tools/blender/trees.py` | Original work generated from code with fixed seeds; no external inputs. Built with Blender 5.0 (`bpy`) and meshopt-compressed with glTF Transform. |

Procedural textures (leaf clusters, hedges, lawn, grass tufts, city facades) are generated in the browser
by `src/world/district/materials.ts` and have no external source.

When adding an asset: keep it local, record it in this table with its license and changes,
and prefer CC0. Never copy creator thumbnails or media without explicit permission.
