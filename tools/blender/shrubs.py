"""Mounded shrubs for the landmark planters, built and exported with Blender (bpy).

    python3 tools/blender/shrubs.py --out tools/blender/build/shrubs.raw.glb [--preview docs/art]

Three dense, rounded shrubs, the evergreen mounds that bury the landmark's footings in the
mockup, drawn a little fuller:

- ``shrub_box``: tight small-leaved mound (boxwood-like), deep green.
- ``shrub_glossy``: looser mound of larger glossy leaves (pittosporum-like).
- ``shrub_bloom``: the glossy mound scattered with small pale blossoms, for a little life.

Each is one mesh of leaf-spray cards, with no visible stems, on a shell-biased dome. Normals
point out of the mound, so it shades as a soft volume. COLOR_0 carries baked occlusion (dark
inside and low down) and per-spray jitter; no lighting is baked. The leaf-spray atlas is
painted in code with the tree script's leaf painter, from fixed seeds. Units are meters, +Y
up, base at y = 0, about 1 m tall and 1.3 m wide at scale 1.
"""

from __future__ import annotations

import argparse
import math
import os
import random
import sys

import bpy
import numpy as np
from mathutils import Quaternion, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trees import Geo, _leaf, _twig, bleed, to_image  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TILE = 512
UP = Vector((0.0, 0.0, 1.0))

BOX = np.array([(0.24, 0.36, 0.17), (0.30, 0.43, 0.20), (0.36, 0.50, 0.23), (0.21, 0.32, 0.15), (0.42, 0.55, 0.27)])
GLOSSY = np.array([(0.22, 0.34, 0.18), (0.29, 0.42, 0.22), (0.35, 0.49, 0.26), (0.44, 0.57, 0.30), (0.19, 0.30, 0.16)])


def spray(seed: int, leaves: int, leaf_len: tuple[float, float], palette: np.ndarray, blossoms: int = 0) -> np.ndarray:
    """A dense spray filling the tile edge to edge (a shrub card is mostly foliage, not sky)."""
    rng = random.Random(seed)
    img = np.zeros((TILE, TILE, 4), dtype=np.float32)
    c = TILE / 2
    for k in range(7):
        a = k / 7 * math.tau + rng.uniform(-0.3, 0.3)
        _twig(img, (c, c), (c + math.cos(a) * TILE * 0.4, c + math.sin(a) * TILE * 0.4), 2.0)
    order = []
    for _ in range(leaves):
        r = TILE * 0.47 * math.sqrt(rng.random())
        a = rng.uniform(0, math.tau)
        x, y = c + math.cos(a) * r, c + math.sin(a) * r
        order.append((rng.random(), x, y, a + rng.gauss(0, 0.8)))
    order.sort()
    for depth, x, y, ang in order:
        length = rng.uniform(*leaf_len)
        color = palette[rng.randrange(len(palette))] * (0.62 + 0.5 * depth)
        _leaf(img, x, y, ang, length, length * rng.uniform(0.38, 0.5), color, rng)
    # Small five-petal blossoms, pale warm white with a yellow eye, on top of the leaves.
    for _ in range(blossoms):
        r = TILE * 0.44 * math.sqrt(rng.random())
        a = rng.uniform(0, math.tau)
        bx, by = c + math.cos(a) * r, c + math.sin(a) * r
        size = rng.uniform(7, 11)
        petal = np.array([0.96, 0.93, 0.88]) * rng.uniform(0.9, 1.0)
        for p in range(5):
            pa = p / 5 * math.tau + rng.uniform(0, 0.5)
            _leaf(img, bx, by, pa, size, size * 0.7, petal, rng)
        yy, xx = np.mgrid[int(by) - 3:int(by) + 4, int(bx) - 3:int(bx) + 4]
        inside = (xx - bx) ** 2 + (yy - by) ** 2 <= 6
        ys, xs = yy[inside].clip(0, TILE - 1), xx[inside].clip(0, TILE - 1)
        img[ys, xs, :3] = (0.95, 0.78, 0.30)
        img[ys, xs, 3] = 1.0
    return img


def atlas() -> np.ndarray:
    tiles = [
        spray(101, 900, (12, 18), BOX),
        spray(113, 330, (26, 38), GLOSSY),
        spray(127, 330, (26, 38), GLOSSY, blossoms=34),
        spray(131, 520, (14, 20), BOX),
    ]
    out = np.zeros((TILE * 2, TILE * 2, 4), dtype=np.float32)
    for i, tile in enumerate(tiles):
        ty, tx = divmod(i, 2)
        out[ty * TILE:(ty + 1) * TILE, tx * TILE:(tx + 1) * TILE] = tile
    return bleed(out)


def build(name: str, seed: int, width: float, height: float, cards: int, size: float, tiles: tuple[int, ...]) -> tuple[Geo, dict]:
    """A dome of cards: shell-biased points inside a half-ellipsoid resting on the ground."""
    rng = random.Random(seed)
    geo = Geo()
    rx, rz = width / 2, height
    center = Vector((0, 0, height * 0.12))
    for _ in range(cards):
        while True:
            q = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(0, 1)))
            if q.length <= 1:
                break
        # Lumpy outline: a few lobes so the mound is not a perfect dome.
        az = math.atan2(q.y, q.x)
        lobe = 1.0 + 0.1 * math.sin(3 * az + seed) + 0.06 * math.sin(5 * az + seed * 2)
        q = q.normalized() * (0.5 + 0.5 * rng.random() ** 0.45) * lobe
        p = Vector((q.x * rx, q.y * rx, q.z * rz))
        outward = Vector((q.x / rx, q.y / rx, q.z / rz * 0.8)).normalized()
        facing = (outward * 1.3 + Vector((rng.gauss(0, 0.5), rng.gauss(0, 0.5), rng.gauss(0, 0.5)))).normalized()
        if facing.dot(outward) < 0.2:
            facing = (facing + outward).normalized()
        tangent = facing.cross(UP if abs(facing.z) < 0.9 else Vector((1, 0, 0))).normalized()
        tangent.rotate(Quaternion(facing, rng.uniform(0, math.tau)))
        bitangent = facing.cross(tangent)
        shade_n = (outward * 0.8 + UP * 0.35).normalized()
        depth = q.length
        ao = (0.45 + 0.55 * min(depth, 1.0) ** 1.4) * (0.72 + 0.28 * min(q.z * 1.4, 1.0))
        j = rng.uniform(0.9, 1.08)
        col = (ao * j, ao * j, ao * j * rng.uniform(0.95, 1.02))
        tile = tiles[rng.randrange(len(tiles))]
        u0, v0 = (tile % 2) * 0.5, (tile // 2) * 0.5
        s = size * rng.uniform(0.8, 1.2)
        ids = []
        for cx, cy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            v = p + tangent * (cx * s / 2) + bitangent * (cy * s / 2)
            v.z = max(v.z, 0.02)
            ids.append(geo.vert(v, shade_n, (u0 + (cx * 0.5 + 0.5) * 0.5, v0 + (cy * 0.5 + 0.5) * 0.5), col))
        geo.faces.append(tuple(ids))
        geo.mat.append(0)
    extras = {'height': round(max(c.z for c in geo.co), 3), 'width': width, 'triangles': geo.triangles()}
    return geo, extras


def make_object(name: str, geo: Geo, mat: bpy.types.Material) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(c) for c in geo.co], [], geo.faces)
    mesh.materials.append(mat)
    uv = mesh.uv_layers.new(name='UVMap')
    loop_vi = [0] * len(mesh.loops)
    mesh.loops.foreach_get('vertex_index', loop_vi)
    uv.data.foreach_set('uv', [c for vi in loop_vi for c in geo.uv[vi]])
    color = mesh.color_attributes.new('Color', 'BYTE_COLOR', 'POINT')
    color.data.foreach_set('color_srgb', [c for rgb in geo.col for c in (*rgb, 1.0)])
    mesh.color_attributes.active_color = color
    mesh.shade_smooth()
    mesh.normals_split_custom_set_from_vertices([tuple(n) for n in geo.no])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def leaf_material(img: bpy.types.Image) -> bpy.types.Material:
    mat = bpy.data.materials.new('shrub_leaves')
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.6
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    attr = nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'Color'
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    nt.links.new(tex.outputs['Color'], mix.inputs['A'])
    nt.links.new(attr.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    clip = nt.nodes.new('ShaderNodeMath')
    clip.operation = 'ROUND'
    nt.links.new(tex.outputs['Alpha'], clip.inputs[0])
    nt.links.new(clip.outputs['Value'], bsdf.inputs['Alpha'])
    mat.use_backface_culling = False
    return mat


def render_preview(objects: list[bpy.types.Object], path: str) -> None:
    scene = bpy.context.scene
    for i, obj in enumerate(objects):
        obj.location = ((i - 1) * 1.8, 0, 0)
    bpy.ops.mesh.primitive_plane_add(size=40)
    ground = bpy.context.active_object
    gm = bpy.data.materials.new('ground')
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.55, 0.53, 0.5, 1)
    ground.data.materials.append(gm)
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 4.0
    sun_data.color = (1.0, 0.82, 0.62)
    sun = bpy.data.objects.new('sun', sun_data)
    sun.rotation_euler = (math.radians(60), 0, math.radians(-35))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new('sky')
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.45, 0.58, 0.8, 1)
    scene.world = world
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.lens = 50
    cam.location = (0, -6.5, 1.6)
    cam.rotation_euler = (math.radians(80), 0, 0)
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1200, 500
    scene.view_settings.view_transform = 'AgX'
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--out', default=os.path.join(ROOT, 'tools', 'blender', 'build', 'shrubs.raw.glb'))
    parser.add_argument('--work', default=os.path.join(ROOT, 'tools', 'blender', 'build'))
    parser.add_argument('--preview')
    args = parser.parse_args(argv)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(args.work, exist_ok=True)
    mat = leaf_material(to_image('shrub_leaves', atlas(), os.path.join(args.work, 'shrub_leaves.png')))
    objects = []
    for name, seed, width, height, cards, size, tiles in (
        ('shrub_box', 7, 1.3, 0.95, 96, 0.56, (0, 3)),
        ('shrub_glossy', 11, 1.5, 1.1, 90, 0.64, (1, 1, 3)),
        ('shrub_bloom', 19, 1.4, 1.05, 90, 0.62, (2, 2, 1)),
    ):
        geo, extras = build(name, seed, width, height, cards, size, tiles)
        obj = make_object(name, geo, mat)
        for k, v in extras.items():
            obj.data[k] = v
        objects.append(obj)
        print(f'{name}: {extras["triangles"]} triangles, height {extras["height"]} m')
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=args.out, export_format='GLB', export_yup=True, export_apply=True, export_texcoords=True,
        export_normals=True, export_vertex_color='ACTIVE', export_image_format='WEBP', export_image_quality=88,
        export_extras=True, export_materials='EXPORT', export_cameras=False, export_lights=False, export_animations=False,
    )
    print(f'wrote {os.path.relpath(args.out, ROOT)} ({os.path.getsize(args.out) / 1024:.0f} KiB)')
    if args.preview:
        path = os.path.join(args.preview, 'shrubs-blender.jpg')
        render_preview(objects, path)
        print(f'wrote {os.path.relpath(path, ROOT)}')


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
