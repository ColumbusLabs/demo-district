# Storefront exhibit pass — September 26, 2026

Owner requested replacing the blank storefront displays. All eight pavilions now use original category-specific exhibit artwork, dark frames, warm plaster interiors, floor joints, recessed ceiling lighting, a pedestal with a polished object, and a small angled display kiosk. Lower glass reflectivity keeps the interiors visible. Existing category signs, targeting, sample listing truthfulness, and click/tap behavior are preserved.

The pavilion shells are solid meshes. Interiors therefore extend the existing ray/box interior shader, including nearest-hit exhibit occlusion and view-dependent parallax. They are display windows, not enterable rooms. No extra draw calls, lights, animation loops, dependencies, or remote requests. One shared 504 KiB local atlas; tracked texture ownership and teardown handling. No mipmaps across adjacent atlas tiles.

Validation: npm run verify passed (71 unit tests, TypeScript, production build, static artifact checks). The fragment body also compiled using Mesa OpenGL with the Three shader includes omitted and numeric sky constants substituted; this is a syntax check, not WebGL/browser validation. The browser asset expectation is updated from 16 to 17. Browser walkthrough, real GPU appearance, lifecycle browser tests, and iPhone/Safari verification remain unrun: the managed browser blocks terminal.local and the standalone Chromium download failed. Do not treat build success as visual approval.

Review on device: artwork readability at oblique views, kiosk/frame proportions, floor depth, glass reflections, and storefront taps. Asset provenance and prompt direction are recorded in public/world/LICENSES.md.

## Creative follow-up — eight distinct installations

The owner requested more creativity. Replaced the repeated pedestal, sphere and kiosk with category-specific installations:

- Art: suspended coral/ivory mobile and brass hoop, split artwork wall.
- Worlds: floating terraced island, illuminated miniature village and lanterns, circular teal portal.
- Music: eleven luminous pipes on a black stage, panoramic backdrop and acoustic fins.
- Games: rising tilted platforms and a golden comet against an angled display.
- Stories: open book and five ascending loose pages, warm library palette and page-like wall panels.
- Tools: colored threads stretched through a brass loom, plum studio walls.
- Experiments: five glowing specimen globes on stems with a green halo window.
- Learning: suspended planet, two inclined orbit rings and satellite spheres, indigo observatory.

Each window has its own wall/floor palette and backdrop shape. The original artwork atlas is reused. EXHIBIT_KIND is a compile-time define; only the relevant bounded analytic shapes are compiled into each material. No ray marching, new draw calls, extra assets, new animation loops, or changes to navigation/interaction. Shader arithmetic increases; runtime GPU performance remains unmeasured.

Validation: all 71 unit tests, TypeScript, production build and static artifact checks passed. All eight shader variants compiled, linked, and rendered in a standalone Mesa OpenGL pbuffer; inspected a contact sheet and corrected atlas edge stretching. That diagnostic uses substituted Three includes, a simple diagnostic vertex shader and approximate display tone mapping. It is not an in-site screenshot or Safari validation. Full browser/device checks remain pending under the preview limitation above.
