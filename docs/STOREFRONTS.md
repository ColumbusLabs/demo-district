# Storefront exhibit pass — September 26, 2026

Owner requested replacing the blank storefront displays. All eight pavilions now use original category-specific exhibit artwork, dark frames, warm plaster interiors, floor joints, recessed ceiling lighting, a pedestal with a polished object, and a small angled display kiosk. Lower glass reflectivity keeps the interiors visible. Existing category signs, targeting, sample listing truthfulness, and click/tap behavior are preserved.

The pavilion shells are solid meshes. Interiors therefore extend the existing ray/box interior shader, including nearest-hit exhibit occlusion and view-dependent parallax. They are display windows, not enterable rooms. No extra draw calls, lights, animation loops, dependencies, or remote requests. One shared 504 KiB local atlas; tracked texture ownership and teardown handling. No mipmaps across adjacent atlas tiles.

Validation: npm run verify passed (71 unit tests, TypeScript, production build, static artifact checks). The fragment body also compiled using Mesa OpenGL with the Three shader includes omitted and numeric sky constants substituted; this is a syntax check, not WebGL/browser validation. The browser asset expectation is updated from 16 to 17. Browser walkthrough, real GPU appearance, lifecycle browser tests, and iPhone/Safari verification remain unrun: the managed browser blocks terminal.local and the standalone Chromium download failed. Do not treat build success as visual approval.

Review on device: artwork readability at oblique views, kiosk/frame proportions, floor depth, glass reflections, and storefront taps. Asset provenance and prompt direction are recorded in public/world/LICENSES.md.
