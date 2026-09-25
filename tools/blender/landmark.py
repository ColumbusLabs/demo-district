"""The district landmark's arch sculpture, built and exported with Blender (bpy).

    python3 tools/blender/landmark.py --out tools/blender/build/landmark.raw.glb [--preview docs/art]

It follows the approved mockup (docs/art/plaza-mockup.jpg):

- A tall lancet main arch with near-vertical parallel legs and an elliptical, slightly pointed
  crown. Its section is a deep, softened band rather than a tube, so the underside of the crown
  reads from the boulevard.
- Two crescent wing blades. Each rises from the ground outside a main leg, sweeps inward, and
  joins that leg where it springs into the crown, set slightly behind it and yawed back for depth.
  The wings never cross the opening, so the orb hangs in clear sky.

Only the sculpture is modelled here. The chrome orb (reflections, drift), the fountain, and the
stone footings stay in code (src/world/district/landmark.ts). The footings come from
landmarkFootings() in layout.ts, and a unit test compares them with the ``footings`` extras
written here. Units are meters, +Y up, the landmark center at the origin, the boulevard
(spawn) toward +Z, and leg bases at y = 0.
"""

from __future__ import annotations

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# Blender frame: arch plane is XZ, +Z up, +Y away from the boulevard (glTF -Z).
SPAN = 10.0  # distance between main leg centers
SPRING = 19.0  # where the legs turn into the crown
LANCET = 1.4  # crown arc radius as a multiple of the half-span (1 = round, 2 = equilateral)
HEIGHT = SPRING + math.sqrt((LANCET * SPAN / 2) ** 2 - ((LANCET - 1) * SPAN / 2) ** 2)  # apex, ≈ 25.7
# Nested inner arch: a lower lancet crown springing from the inner side of the main legs, set
# back into the band's depth, with a recessed web filling the space between the two crowns.
INNER_HALF = SPAN / 2 - 0.3  # inner crown ends, buried in the main legs
INNER_SPRING = 16.5
INNER_LANCET = 1.2
INNER_BACK = 0.6  # inner crown plane behind the main arch's center plane
WEB_BACK = 0.45  # web front face, behind the main band's front face (at -1.0 at the crown)
WING_FOOT = 11.2  # wing foot distance from the center, before yaw
WING_JOIN = 0.62  # wing joins the leg at this fraction of HEIGHT
WING_BACK = 0.5  # wing plane offset behind the main arch
WING_YAW = math.radians(20)  # wing feet swing back by this much about the join


def lancet_crown(steps: int, a: float = SPAN / 2, spring: float = SPRING, lancet: float = LANCET, y: float = 0.0) -> list[Vector]:
    """Two circular arcs, each centered level with the opposite side's spring, meeting at a point."""
    radius = lancet * a
    top = math.acos((radius - a) / radius)
    half = steps // 2
    right = []
    for i in range(half + 1):
        phi = top * i / half  # 0 at the right spring, top at the apex
        right.append(Vector((a - radius + radius * math.cos(phi), y, spring + radius * math.sin(phi))))
    left = [Vector((-p.x, y, p.z)) for p in right]
    pts = left + right[::-1][1:]
    # Soften the apex: the mockup's crown is gently pointed, not a gothic cusp.
    apex = len(pts) // 2
    for _ in range(12):
        pts = [p if abs(i - apex) > 10 or i in (0, len(pts) - 1) else (pts[i - 1] + p * 2 + pts[i + 1]) / 4 for i, p in enumerate(pts)]
    return pts


def main_path() -> list[Vector]:
    a = SPAN / 2
    left = [Vector((-a, 0, z)) for z in (-0.4, SPRING * 0.5)]
    right = [Vector((a, 0, z)) for z in (SPRING * 0.5, -0.4)]
    return left + lancet_crown(96) + right


def inner_crown() -> list[Vector]:
    return lancet_crown(96, INNER_HALF, INNER_SPRING, INNER_LANCET, INNER_BACK)


def web(outer: list[Vector], inner: list[Vector], front: float, thickness: float, name: str) -> bpy.types.Object:
    """A thin plate lofted between two crown curves (equal point counts), facing the boulevard."""
    verts, faces = [], []
    n = len(outer)
    for y in (front, front + thickness):
        for o, i in zip(outer, inner):
            verts.append((o.x, y, o.z))
            verts.append((i.x, y, i.z))
    back = 2 * n
    for k in range(n - 1):
        a, b, c, d = 2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2
        faces.append((a, b, c, d))  # front face (toward -Y, the boulevard)
        faces.append((back + a, back + d, back + c, back + b))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    # Flat plate: make the front face point at the boulevard whatever the loft winding produced.
    for k, poly in enumerate(mesh.polygons):
        if (poly.normal.y > 0) == (k % 2 == 0):
            poly.flip()
    uv = mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:
        co = mesh.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (co.x / 4.0, co.z / 4.0)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def bezier(p0: Vector, p1: Vector, p2: Vector, p3: Vector, steps: int) -> list[Vector]:
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        out.append(p0 * u ** 3 + p1 * 3 * u * u * t + p2 * 3 * u * t * t + p3 * t ** 3)
    return out


def wing_path(side: int) -> list[Vector]:
    """Foot to join, for side = +1 (right) or -1 (left), including the yaw about the join."""
    a = SPAN / 2
    zj = HEIGHT * WING_JOIN
    p0 = Vector((side * WING_FOOT, WING_BACK, -0.4))
    p1 = Vector((side * (WING_FOOT + 0.3), WING_BACK, HEIGHT * 0.5))
    p2 = Vector((side * (a + 3.6), WING_BACK, zj + 0.4))
    p3 = Vector((side * (a - 0.2), WING_BACK, zj))
    pts = bezier(p0, p1, p2, p3, 56)
    pivot = Vector((side * a, WING_BACK, 0))
    c, s = math.cos(WING_YAW), math.sin(WING_YAW)
    out = []
    for p in pts:
        dx, dy = p.x - pivot.x, p.y - pivot.y
        # Rotate so the foot swings to +Y (away from the boulevard) on both sides.
        rx, ry = dx * c - dy * s * side, dx * s * side + dy * c
        out.append(Vector((pivot.x + rx, pivot.y + ry, p.z)))
    return out


def section(half_w: float, half_d: float, radius: float, per_corner: int = 5) -> list[tuple[float, float, float, float]]:
    """Rounded rectangle: (u, v, nu, nv) points; u across the band in its plane, v in depth."""
    radius = min(radius, half_w * 0.95, half_d * 0.95)
    pts = []
    corners = [(1, 1, 0.0), (-1, 1, 90.0), (-1, -1, 180.0), (1, -1, 270.0)]
    for cu, cv, start in corners:
        cx, cy = cu * (half_w - radius), cv * (half_d - radius)
        for k in range(per_corner):
            ang = math.radians(start + 90.0 * k / (per_corner - 1))
            nu, nv = math.cos(ang), math.sin(ang)
            pts.append((cx + nu * radius, cy + nv * radius, nu, nv))
    return pts


def sweep(path: list[Vector], plane_normal_at, widths, depths, radius: float, name: str) -> bpy.types.Object:
    """Sweep a rounded-rectangle section along `path`; returns a smooth-shaded object."""
    verts, normals, faces, uvs = [], [], [], []
    n_sec = None
    length = 0.0
    for i, p in enumerate(path):
        if i == 0:
            tangent = (path[1] - path[0]).normalized()
        elif i == len(path) - 1:
            tangent = (path[i] - path[i - 1]).normalized()
        else:
            tangent = (path[i + 1] - path[i - 1]).normalized()
            length += (path[i] - path[i - 1]).length
        if i == len(path) - 1:
            length += (path[i] - path[i - 1]).length
        depth_axis = plane_normal_at(i)
        across = tangent.cross(depth_axis).normalized()
        depth_axis = across.cross(tangent).normalized()
        f = i / (len(path) - 1)
        sec = section(widths(f) / 2, depths(f) / 2, radius)
        n_sec = len(sec)
        for j, (u, v, nu, nv) in enumerate(sec):
            verts.append(p + across * u + depth_axis * v)
            normals.append((across * nu + depth_axis * nv).normalized())
            uvs.append((j / n_sec, length / 4.0))
    rows = len(path)
    for i in range(rows - 1):
        for j in range(n_sec):
            a = i * n_sec + j
            b = i * n_sec + (j + 1) % n_sec
            faces.append((a, a + n_sec, b + n_sec, b))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    uv = mesh.uv_layers.new(name='UVMap')
    loop_vi = [0] * len(mesh.loops)
    mesh.loops.foreach_get('vertex_index', loop_vi)
    uv.data.foreach_set('uv', [c for vi in loop_vi for c in uvs[vi]])
    mesh.shade_smooth()
    mesh.normals_split_custom_set_from_vertices([tuple(n) for n in normals])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def build() -> tuple[bpy.types.Object, dict]:
    objects = []
    # Main band: 1.5 m across at the base tapering to 1.1 m at the crown; 2.0 → 1.6 m deep.
    main = main_path()
    objects.append(sweep(
        main, lambda i: Vector((0, 1, 0)),
        lambda f: 1.5 - 0.4 * _crownness(f), lambda f: 2.0 - 0.4 * _crownness(f), 0.62, 'arch_main',
    ))
    # Inner arch: 0.9 m across, 1.2 m deep, springing from the legs' inner faces.
    objects.append(sweep(inner_crown(), lambda i: Vector((0, 1, 0)), lambda f: 0.9, lambda f: 1.2, 0.4, 'arch_inner'))
    # Web between the crowns, recessed so the double outline reads with a lit soffit between.
    objects.append(web(lancet_crown(96), inner_crown(), -1.0 + WEB_BACK, 0.25, 'arch_web'))
    for side in (-1, 1):
        path = wing_path(side)
        yaw = WING_YAW * side
        plane_normal = Vector((-math.sin(yaw), math.cos(yaw), 0))
        # Crescent: 0.9 m at the foot and the join, 2.5 m at its widest.
        objects.append(sweep(
            path, lambda i, n=plane_normal: n,
            lambda f: 0.9 + 1.6 * math.sin(math.pi * min(f * 1.1, 1.0)) ** 1.3, lambda f: 0.9, 0.22,
            f'arch_wing_{"l" if side < 0 else "r"}',
        ))
    # Join into one mesh: one draw call for the whole sculpture.
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    arch = bpy.context.view_layer.objects.active
    arch.name = arch.data.name = 'landmark_arch'
    mat = bpy.data.materials.new('landmark_stone')
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.95, 0.94, 0.91, 1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.45
    arch.data.materials.append(mat)

    a = SPAN / 2
    foot_x = a + (WING_FOOT - a) * math.cos(WING_YAW)
    foot_back = WING_BACK + (WING_FOOT - a) * math.sin(WING_YAW)
    tris = sum(len(p.vertices) - 2 for p in arch.data.polygons)
    extras = {
        'height': HEIGHT,
        'span': SPAN,
        # glTF frame (x, z); z = -Blender y. Radii leave a margin around each leg's section.
        'footings': [
            {'x': -a, 'z': 0.0, 'radius': 1.4}, {'x': a, 'z': 0.0, 'radius': 1.4},
            {'x': -round(foot_x, 3), 'z': -round(foot_back, 3), 'radius': 1.0},
            {'x': round(foot_x, 3), 'z': -round(foot_back, 3), 'radius': 1.0},
        ],
        'triangles': tris,
    }
    for k, v in extras.items():
        arch.data[k] = v
    return arch, extras


def _crownness(f: float) -> float:
    """0 along the legs, 1 at the apex (f is the fraction along the main path)."""
    return math.sin(math.pi * f) ** 3


def export(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', export_yup=True, export_apply=True,
        export_texcoords=True, export_normals=True, export_extras=True, export_materials='EXPORT',
        export_cameras=False, export_lights=False, export_animations=False, export_tangents=False,
    )


def render_preview(arch: bpy.types.Object, path: str) -> None:
    """Cycles view from the boulevard at golden hour, with a stand-in orb, for checkpoint evidence."""
    scene = bpy.context.scene
    bpy.ops.mesh.primitive_uv_sphere_add(radius=2.6, location=(0, 0, 11.0), segments=64, ring_count=32)
    orb = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    chrome = bpy.data.materials.new('chrome')
    bsdf = chrome.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Metallic'].default_value = 1.0
    bsdf.inputs['Roughness'].default_value = 0.04
    orb.data.materials.append(chrome)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
    ground = bpy.context.active_object
    gm = bpy.data.materials.new('ground')
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.6, 0.58, 0.55, 1)
    ground.data.materials.append(gm)
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 4.5
    sun_data.color = (1.0, 0.8, 0.6)
    sun = bpy.data.objects.new('sun', sun_data)
    sun.rotation_euler = (math.radians(68), 0, math.radians(-40))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new('sky')
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.45, 0.6, 0.85, 1)
    bg.inputs['Strength'].default_value = 0.9
    scene.world = world
    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = 35
    cam = bpy.data.objects.new('cam', cam_data)
    cam.location = (0, -48, 3.0)
    cam.rotation_euler = (math.radians(98), 0, 0)
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 900, 1100
    scene.view_settings.view_transform = 'AgX'
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 86
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--out', default=os.path.join(ROOT, 'tools', 'blender', 'build', 'landmark.raw.glb'))
    parser.add_argument('--preview', help='directory for a Cycles preview render (optional)')
    args = parser.parse_args(argv)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    arch, extras = build()
    print(f'landmark_arch: {extras["triangles"]} triangles, footings {extras["footings"]}')
    export(args.out)
    print(f'wrote {os.path.relpath(args.out, ROOT)} ({os.path.getsize(args.out) / 1024:.0f} KiB)')
    if args.preview:
        path = os.path.join(args.preview, 'landmark-blender.jpg')
        render_preview(arch, path)
        print(f'wrote {os.path.relpath(path, ROOT)}')


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
