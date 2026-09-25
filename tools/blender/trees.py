"""Procedural district trees, built and exported with Blender (bpy).

Run with the Blender Python module (``pip install bpy==5.0.1``) or inside Blender:

    python3 tools/blender/trees.py                       # writes public/world/models/trees.glb
    python3 tools/blender/trees.py --preview docs/art    # also renders docs/art/trees-blender.jpg (Cycles)

Everything is generated here from fixed seeds: geometry, the leaf-spray atlas, and the bark
texture. There are no external inputs, so the output is reproducible and license-clean.

The GLB holds one mesh per tree and level of detail, named ``<tree>_lod0`` / ``<tree>_lod1``.
Each has two primitives: bark (opaque, tiling bark texture) and leaves (alpha-masked sprays).
Both carry COLOR_0: a per-species tint on bark, and baked crown occlusion plus per-spray color
jitter on leaves. Leaf normals point out of the crown so it shades as a soft volume in
three.js rather than as flat cards; no lighting is baked in. Units are meters, +Y up, the
trunk base at the origin. Mesh extras carry height, crown and trunk dimensions.

LOD0 is for trees near the walkway; LOD1 (a few hundred triangles) is for the groves and street
trees outside the district, where dozens of instances are in view at once.
"""

from __future__ import annotations

import argparse
import math
import os
import random
import sys
from dataclasses import dataclass, field

import bpy
import numpy as np
from mathutils import Quaternion, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
UP = Vector((0.0, 0.0, 1.0))


# --------------------------------------------------------------------------------------------
# Textures (numpy, sRGB, rows bottom-to-top as Blender stores them)
# --------------------------------------------------------------------------------------------

LEAF_PALETTE = np.array([
    (0.40, 0.53, 0.25), (0.51, 0.63, 0.31), (0.60, 0.71, 0.37), (0.33, 0.46, 0.21),
    (0.68, 0.76, 0.42), (0.46, 0.58, 0.28), (0.37, 0.50, 0.23),
])
TILE = 512
ATLAS = 1024  # 2 x 2 tiles: three spray variants and a sparse edge spray.


def _leaf(img: np.ndarray, cx: float, cy: float, angle: float, length: float, width: float,
          color: np.ndarray, rng: random.Random) -> None:
    """Rasterize one pointed-oval leaf with a lighter half and a darker midrib."""
    h, w, _ = img.shape
    r = int(length) + 2
    x0, x1 = max(int(cx) - r, 0), min(int(cx) + r, w)
    y0, y1 = max(int(cy) - r, 0), min(int(cy) + r, h)
    if x0 >= x1 or y0 >= y1:
        return
    ys, xs = np.mgrid[y0:y1, x0:x1]
    dx, dy = xs - cx, ys - cy
    ca, sa = math.cos(angle), math.sin(angle)
    u = dx * ca + dy * sa  # along the leaf, 0 at the stalk
    v = -dx * sa + dy * ca
    t = np.clip(u / length, 0.0, 1.0)
    half = width * np.sin(np.pi * t) ** 0.75 * (1.0 - 0.25 * t)
    # Fine serration along the edge.
    half *= 1.0 - 0.08 * (np.sin(t * 38.0) > 0.4)
    inside = (u >= 0) & (u <= length) & (np.abs(v) <= half)
    if not inside.any():
        return
    side = np.where(v > 0, 1.06, 0.92)
    shade = (0.86 + 0.2 * t) * side
    midrib = np.abs(v) < max(0.6, width * 0.07)
    shade = np.where(midrib, shade * 0.82, shade)
    rgb = np.clip(color[None, None, :] * shade[..., None], 0, 1)
    block = img[y0:y1, x0:x1]
    block[inside, :3] = rgb[inside]
    block[inside, 3] = 1.0


def _twig(img: np.ndarray, a: tuple[float, float], b: tuple[float, float], width: float) -> None:
    h, w, _ = img.shape
    steps = int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))) + 1
    for i in range(steps + 1):
        f = i / steps
        x, y = a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
        rr = width * (1.0 - 0.6 * f)
        xi0, xi1 = max(int(x - rr), 0), min(int(x + rr) + 1, w)
        yi0, yi1 = max(int(y - rr), 0), min(int(y + rr) + 1, h)
        img[yi0:yi1, xi0:xi1, :3] = (0.30, 0.25, 0.19)
        img[yi0:yi1, xi0:xi1, 3] = 1.0


def leaf_spray(seed: int, leaves: int, leaf_len: tuple[float, float], spread: float) -> np.ndarray:
    """A spray of small leaves on forking twigs, filling a TILE x TILE tile with alpha.

    Leaves are painted back to front with the back layers darker, which reads as depth inside
    each card.
    """
    rng = random.Random(seed)
    img = np.zeros((TILE, TILE, 4), dtype=np.float32)
    c = TILE / 2
    # Twig skeleton radiating from the center.
    tips: list[tuple[float, float, float]] = []
    for k in range(5):
        a = k / 5 * math.tau + rng.uniform(-0.4, 0.4)
        reach = TILE * rng.uniform(0.28, 0.42) * spread
        mid = (c + math.cos(a) * reach * 0.5, c + math.sin(a) * reach * 0.5)
        end = (c + math.cos(a) * reach, c + math.sin(a) * reach)
        _twig(img, (c, c), end, 3.0)
        for side in (-1, 1):
            b = a + side * rng.uniform(0.5, 0.9)
            tip = (mid[0] + math.cos(b) * reach * 0.4, mid[1] + math.sin(b) * reach * 0.4)
            _twig(img, mid, tip, 2.0)
            tips.append((tip[0], tip[1], b))
        tips.append((end[0], end[1], a))
    order = []
    for i in range(leaves):
        # Leaves cluster around the twigs, pointing outward from them.
        tx, ty, ta = tips[rng.randrange(len(tips))]
        f = rng.random() ** 0.6
        x = c + (tx - c) * f + rng.gauss(0, 18)
        y = c + (ty - c) * f + rng.gauss(0, 18)
        ang = math.atan2(y - c, x - c) + rng.gauss(0, 0.7)
        order.append((rng.random(), x, y, ang))
    order.sort()
    for depth, x, y, ang in order:
        length = rng.uniform(*leaf_len)
        color = LEAF_PALETTE[rng.randrange(len(LEAF_PALETTE))] * (0.72 + 0.34 * depth)
        _leaf(img, x, y, ang, length, length * rng.uniform(0.28, 0.36), color, rng)
    # Fade leaves near the tile border so cards never show a straight cut edge.
    return img


def bleed(img: np.ndarray, passes: int = 12) -> np.ndarray:
    """Spread opaque colors into transparent pixels so mipmaps do not darken leaf edges."""
    rgb = img[..., :3].copy()
    known = img[..., 3] > 0.5
    for _ in range(passes):
        acc = np.zeros_like(rgb)
        cnt = np.zeros(known.shape, dtype=np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = np.roll(known, (dy, dx), (0, 1))
            acc += np.roll(rgb, (dy, dx), (0, 1)) * k[..., None]
            cnt += k
        grow = (~known) & (cnt > 0)
        rgb[grow] = acc[grow] / cnt[grow, None]
        known = known | grow
    rgb[~known] = rgb[img[..., 3] > 0.5].mean(axis=0)
    out = img.copy()
    out[..., :3] = rgb
    return out


def leaf_atlas() -> np.ndarray:
    tiles = [
        leaf_spray(11, 260, (26, 38), 1.0),
        leaf_spray(23, 240, (28, 40), 0.95),
        leaf_spray(37, 300, (22, 34), 1.05),
        leaf_spray(41, 150, (24, 36), 0.8),
    ]
    atlas = np.zeros((ATLAS, ATLAS, 4), dtype=np.float32)
    for i, tile in enumerate(tiles):
        ty, tx = divmod(i, 2)
        atlas[ty * TILE:(ty + 1) * TILE, tx * TILE:(tx + 1) * TILE] = tile
    return bleed(atlas)


def periodic_noise(shape: tuple[int, int], rng: np.random.Generator, fx: float, fy: float, beta: float) -> np.ndarray:
    """Tileable 1/f noise, anisotropic by frequency scale (fx across, fy along)."""
    h, w = shape
    white = rng.standard_normal(shape)
    ky = np.fft.fftfreq(h)[:, None] / fy
    kx = np.fft.fftfreq(w)[None, :] / fx
    k = np.sqrt(kx * kx + ky * ky)
    k[0, 0] = 1.0
    out = np.real(np.fft.ifft2(np.fft.fft2(white) / k ** beta))
    out -= out.min()
    return out / out.max()


def bark_texture() -> np.ndarray:
    """Smooth grey-brown bark with faint vertical fissures; tiles in both directions."""
    rng = np.random.default_rng(5)
    size = (512, 256)
    streaks = periodic_noise(size, rng, 1.0, 0.12, 1.6)
    patches = periodic_noise(size, rng, 1.0, 1.0, 2.0)
    fine = periodic_noise(size, rng, 1.0, 1.0, 0.6)
    fissure = np.clip((streaks - 0.35) * 3.0, 0, 1)
    lum = 0.42 + 0.2 * patches + 0.08 * fine - 0.16 * (1 - fissure)
    base = np.array([0.60, 0.55, 0.49])
    rgb = np.clip(lum[..., None] * base[None, None, :] / 0.5, 0, 1)
    img = np.ones((*size, 4), dtype=np.float32)
    img[..., :3] = rgb
    return img


def to_image(name: str, pixels: np.ndarray, path: str) -> bpy.types.Image:
    h, w, _ = pixels.shape
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(pixels.astype(np.float32).ravel())
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    return img


# --------------------------------------------------------------------------------------------
# Geometry
# --------------------------------------------------------------------------------------------

@dataclass
class Geo:
    """Accumulated vertex data; faces index into the shared vertex arrays."""
    co: list[Vector] = field(default_factory=list)
    no: list[Vector] = field(default_factory=list)
    uv: list[tuple[float, float]] = field(default_factory=list)
    col: list[tuple[float, float, float]] = field(default_factory=list)
    faces: list[tuple[int, ...]] = field(default_factory=list)
    mat: list[int] = field(default_factory=list)

    def vert(self, co: Vector, no: Vector, uv: tuple[float, float], col: tuple[float, float, float]) -> int:
        self.co.append(co.copy())
        self.no.append(no.normalized())
        self.uv.append(uv)
        self.col.append(col)
        return len(self.co) - 1

    def triangles(self) -> int:
        return sum(len(f) - 2 for f in self.faces)


@dataclass
class Branch:
    points: list[Vector]
    radii: list[float]
    level: int

    def at(self, t: float) -> tuple[Vector, Vector, float]:
        """Position, direction, and radius at parameter t in [0, 1]."""
        n = len(self.points) - 1
        f = min(max(t, 0.0), 1.0) * n
        i = min(int(f), n - 1)
        k = f - i
        p = self.points[i].lerp(self.points[i + 1], k)
        d = (self.points[i + 1] - self.points[i]).normalized()
        r = self.radii[i] + (self.radii[i + 1] - self.radii[i]) * k
        return p, d, r


@dataclass
class Crown:
    center: Vector
    radius: Vector  # semi-axes x, y, z

    def local(self, p: Vector) -> Vector:
        return Vector(((p.x - self.center.x) / self.radius.x, (p.y - self.center.y) / self.radius.y, (p.z - self.center.z) / self.radius.z))

    def depth(self, p: Vector) -> float:
        """0 at the center, 1 on the envelope."""
        return self.local(p).length

    def reach(self, p: Vector, d: Vector) -> float:
        """Distance from p along d to the envelope (p assumed inside or near it)."""
        q = self.local(p)
        e = Vector((d.x / self.radius.x, d.y / self.radius.y, d.z / self.radius.z))
        a, b, c = e.dot(e), 2 * q.dot(e), q.dot(q) - 1
        disc = b * b - 4 * a * c
        if disc < 0:
            return 0.0
        return max((-b + math.sqrt(disc)) / (2 * a), 0.0)


@dataclass
class Spec:
    name: str
    seed: int
    height: float
    clear: float  # clear trunk height (fraction of height) before the first branch
    crown: Crown
    lean: Vector
    primaries: int
    angle: tuple[float, float]  # branch angle from the parent, degrees
    secondaries: int
    sprays: int  # leaf cards per secondary twig (LOD0)
    fill: int  # extra cards scattered through the crown shell (LOD0)
    spray_size: float
    bark_tint: tuple[float, float, float] = (0.78, 0.74, 0.70)


def perpendicular(d: Vector) -> Vector:
    ref = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 1, 0))
    return d.cross(ref).normalized()


def grow(rng: random.Random, start: Vector, direction: Vector, length: float, r0: float, r1: float,
         segments: int, wobble: float, rise: float, level: int) -> Branch:
    points, radii = [start.copy()], [r0]
    d = direction.normalized()
    step = length / segments
    p = start.copy()
    for i in range(1, segments + 1):
        axis = perpendicular(d)
        axis.rotate(Quaternion(d, rng.uniform(0, math.tau)))
        d = (Quaternion(axis, rng.gauss(0, wobble)) @ d)
        d = (d + UP * rise).normalized()
        p = p + d * step
        points.append(p.copy())
        radii.append(r0 + (r1 - r0) * (i / segments) ** 0.8)
    return Branch(points, radii, level)


def build_skeleton(spec: Spec, rng: random.Random, detail: int) -> list[Branch]:
    """Trunk, primaries, and (at detail 0) secondaries, clamped to the crown envelope."""
    h = spec.height
    trunk_r = h * 0.018
    top = Vector((spec.lean.x, spec.lean.y, h * 0.93))
    trunk_dir = (top - Vector((0, 0, -0.2))).normalized()
    trunk = grow(rng, Vector((0, 0, -0.2)), trunk_dir, (top - Vector((0, 0, -0.2))).length,
                 trunk_r, trunk_r * 0.18, 12 if detail == 0 else 6, 0.035, 0.0, 0)
    branches = [trunk]
    golden = math.radians(137.5)
    azimuth = rng.uniform(0, math.tau)
    count = spec.primaries if detail == 0 else max(4, spec.primaries // 2)
    for i in range(count):
        t = spec.clear + (0.9 - spec.clear) * (i + rng.uniform(0.1, 0.9)) / count
        p, d, r = trunk.at(t)
        azimuth += golden + rng.uniform(-0.3, 0.3)
        axis = perpendicular(d)
        axis.rotate(Quaternion(d, azimuth))
        bd = Quaternion(axis, math.radians(rng.uniform(*spec.angle))) @ d
        reach = spec.crown.reach(p, bd)
        length = max(min(reach * rng.uniform(0.85, 1.0), h), 0.6)
        br = min(r * 0.62, trunk_r * 0.55)
        segs = 4 if detail == 0 else 2
        branches.append(grow(rng, p - bd * r * 0.5, bd, length, br, br * 0.2, segs, 0.12, 0.06, 1))
    if detail == 0:
        primaries = branches[1:]
        for parent in primaries:
            for k in range(spec.secondaries):
                t = 0.3 + 0.65 * (k + rng.uniform(0.1, 0.9)) / spec.secondaries
                p, d, r = parent.at(t)
                axis = perpendicular(d)
                axis.rotate(Quaternion(d, rng.uniform(0, math.tau)))
                bd = Quaternion(axis, math.radians(rng.uniform(30, 55))) @ d
                reach = spec.crown.reach(p, bd)
                length = max(min(reach * 0.95, parent_length(parent) * 0.45), 0.35)
                branches.append(grow(rng, p, bd, length, r * 0.6, r * 0.15, 1, 0.15, 0.08, 2))
    return branches


def parent_length(b: Branch) -> float:
    return sum((b.points[i + 1] - b.points[i]).length for i in range(len(b.points) - 1))


def add_tube(geo: Geo, b: Branch, sides: int, tint: tuple[float, float, float], bark_repeat: float) -> None:
    """Tapered tube with parallel-transported rings; the UV seam vertex is duplicated."""
    n = len(b.points)
    frames: list[tuple[Vector, Vector]] = []
    d0 = (b.points[1] - b.points[0]).normalized()
    normal = perpendicular(d0)
    for i in range(n):
        if i < n - 1:
            d = (b.points[i + 1] - b.points[i]).normalized()
        if i > 0 and i < n - 1:
            d = ((b.points[i] - b.points[i - 1]).normalized() + d).normalized()
        normal = (normal - d * normal.dot(d)).normalized()
        frames.append((d, normal))
    circumference_uv = max(1, round(bark_repeat))
    v_acc = 0.0
    rings: list[list[int]] = []
    for i, (p, r) in enumerate(zip(b.points, b.radii)):
        d, nrm = frames[i]
        binormal = d.cross(nrm)
        if i > 0:
            v_acc += (p - b.points[i - 1]).length / (math.tau * max(b.radii[0], 0.03)) * circumference_uv
        flare = 1.0 + (0.35 if b.level == 0 and i == 0 else 0.0)
        ring = []
        for s in range(sides + 1):
            a = s / sides * math.tau
            radial = nrm * math.cos(a) + binormal * math.sin(a)
            ring.append(geo.vert(p + radial * r * flare, radial, (s / sides * circumference_uv, v_acc), tint))
        rings.append(ring)
    for i in range(n - 1):
        for s in range(sides):
            a, b_, c, d_ = rings[i][s], rings[i][s + 1], rings[i + 1][s + 1], rings[i + 1][s]
            geo.faces.append((a, b_, c, d_))
            geo.mat.append(0)


def add_card(geo: Geo, spec: Spec, rng: random.Random, center: Vector, size: float, tile: int) -> None:
    crown = spec.crown
    outward = (center - crown.center)
    outward = Vector((outward.x / crown.radius.x ** 2, outward.y / crown.radius.y ** 2, outward.z / crown.radius.z ** 2))
    if outward.length < 1e-4:
        outward = UP.copy()
    outward.normalize()
    # Card faces mostly outward, with enough scatter that the crown is not a shell of billboards.
    facing = (outward * 1.2 + Vector((rng.gauss(0, 0.6), rng.gauss(0, 0.6), rng.gauss(0, 0.6)))).normalized()
    if facing.dot(outward) < 0.15:
        facing = (facing + outward).normalized()
    tangent = perpendicular(facing)
    tangent.rotate(Quaternion(facing, rng.uniform(0, math.tau)))
    bitangent = facing.cross(tangent)
    # Shading normal: out of the crown, lifted toward the sky.
    shade_n = (outward * 0.75 + facing * 0.25 + UP * 0.3).normalized()
    depth = crown.depth(center)
    height_f = min(max((center.z - (crown.center.z - crown.radius.z)) / (2 * crown.radius.z), 0), 1)
    ao = (0.62 + 0.38 * min(depth, 1.0) ** 1.5) * (0.85 + 0.15 * height_f)
    jitter = rng.uniform(0.9, 1.08)
    warm = rng.uniform(-0.04, 0.04)
    col = (ao * jitter * (1 + warm), ao * jitter, ao * jitter * (1 - warm))
    tx, ty = tile % 2, tile // 2
    u0, v0 = tx * 0.5, ty * 0.5
    flip = rng.random() < 0.5
    corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    ids = []
    for cx, cy in corners:
        p = center + tangent * (cx * size / 2) + bitangent * (cy * size / 2)
        u = (cx if not flip else -cx) * 0.5 + 0.5
        ids.append(geo.vert(p, shade_n, (u0 + u * 0.5, v0 + (cy * 0.5 + 0.5) * 0.5), col))
    geo.faces.append(tuple(ids))
    geo.mat.append(1)


def build_tree(spec: Spec, detail: int) -> tuple[Geo, dict]:
    rng = random.Random(spec.seed * 10 + detail)
    branches = build_skeleton(spec, rng, detail)
    geo = Geo()
    for b in branches:
        if detail == 0:
            sides = {0: 8, 1: 4, 2: 3}[b.level]
        else:
            sides = {0: 6, 1: 3}[b.level]
        add_tube(geo, b, sides, spec.bark_tint, 2 if b.level == 0 else 1)
    size = spec.spray_size * (1.0 if detail == 0 else 1.6)
    crown = spec.crown
    if detail == 0:
        twigs = [b for b in branches if b.level == 2]
        for twig in twigs:
            for k in range(spec.sprays):
                p, d, _ = twig.at(0.35 + 0.65 * (k + rng.random()) / spec.sprays)
                jitter = Vector((rng.gauss(0, 0.15), rng.gauss(0, 0.15), rng.gauss(0, 0.12)))
                add_card(geo, spec, rng, p + jitter, size * rng.uniform(0.8, 1.2), rng.randrange(3))
        fill = spec.fill
    else:
        fill = round(spec.fill * 0.5) + len(branches) * 10
    # Fill clumps around the outer half of each primary limb, so the crown reads as separate
    # leaf masses with sky between them (as in the mockup) rather than one solid ball.
    limbs = [b for b in branches if b.level == 1]
    spread = size * (0.55 if detail == 0 else 0.45)
    for _ in range(fill):
        anchor, _, _ = limbs[rng.randrange(len(limbs))].at(rng.uniform(0.5, 1.0))
        p = anchor + Vector((rng.gauss(0, spread), rng.gauss(0, spread), rng.gauss(0, spread * 0.8)))
        depth = crown.depth(p)
        if depth > 1.0:
            p = crown.center.lerp(p, 1.0 / depth)
        tile = 3 if crown.depth(p) > 0.9 else rng.randrange(3)
        add_card(geo, spec, rng, p, size * rng.uniform(0.8, 1.25), tile)
    extras = {
        'height': round(max(c.z for c in geo.co), 3),
        'crownCenter': [round(crown.center.x, 3), round(crown.center.z, 3), round(-crown.center.y, 3)],
        'crownRadius': [round(crown.radius.x, 3), round(crown.radius.z, 3), round(crown.radius.y, 3)],
        'trunkRadius': round(spec.height * 0.018, 3),
        'triangles': geo.triangles(),
    }
    return geo, extras


def specs() -> list[Spec]:
    """Three upright street-tree variants (mockup allee) and one leaning framing tree."""
    def street(name: str, seed: int, h: float, width: float) -> Spec:
        return Spec(
            name=name, seed=seed, height=h, clear=0.3,
            crown=Crown(Vector((0, 0, h * 0.64)), Vector((h * width, h * width, h * 0.34))),
            lean=Vector((0, 0, 0)), primaries=14, angle=(28, 48), secondaries=4, sprays=3,
            fill=70, spray_size=h * 0.12,
        )
    framing_h = 12.5
    return [
        street('street_a', 3, 9.5, 0.2),
        street('street_b', 8, 8.2, 0.22),
        street('street_c', 21, 10.5, 0.19),
        # Leans over the walkway (+X) with a broad crown, framing the top corners of the view.
        Spec(
            name='framing', seed=55, height=framing_h, clear=0.28,
            crown=Crown(Vector((2.6, 0, framing_h * 0.64)), Vector((5.2, 4.4, framing_h * 0.3))),
            lean=Vector((2.2, 0, 0)), primaries=16, angle=(40, 62), secondaries=5, sprays=3,
            fill=150, spray_size=1.55,
        ),
    ]


# --------------------------------------------------------------------------------------------
# Blender scene, materials, export
# --------------------------------------------------------------------------------------------

def make_materials(leaf_img: bpy.types.Image, bark_img: bpy.types.Image) -> tuple[bpy.types.Material, bpy.types.Material]:
    def base(name: str, img: bpy.types.Image, roughness: float, masked: bool) -> bpy.types.Material:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        nt = mat.node_tree
        bsdf = nt.nodes['Principled BSDF']
        bsdf.inputs['Roughness'].default_value = roughness
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
        if masked:
            # Round() is how the glTF exporter recognizes alphaMode MASK with a 0.5 cutoff.
            clip = nt.nodes.new('ShaderNodeMath')
            clip.operation = 'ROUND'
            nt.links.new(tex.outputs['Alpha'], clip.inputs[0])
            nt.links.new(clip.outputs['Value'], bsdf.inputs['Alpha'])
        # Leaf sprays are seen from both sides; closed bark tubes are not.
        mat.use_backface_culling = not masked
        return mat
    return base('tree_bark', bark_img, 0.92, False), base('tree_leaves', leaf_img, 0.75, True)


def make_object(name: str, geo: Geo, mats: tuple[bpy.types.Material, bpy.types.Material], extras: dict) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(c) for c in geo.co], [], geo.faces)
    mesh.polygons.foreach_set('material_index', geo.mat)
    for m in mats:
        mesh.materials.append(m)
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
    for key, value in extras.items():
        mesh[key] = value
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def export(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', export_yup=True, export_apply=True,
        export_texcoords=True, export_normals=True, export_vertex_color='ACTIVE',
        export_image_format='WEBP', export_image_quality=88, export_extras=True,
        export_materials='EXPORT', export_cameras=False, export_lights=False,
        export_animations=False, export_tangents=False,
    )


def render_preview(objects: dict[str, bpy.types.Object], path: str) -> None:
    """Golden-hour Cycles contact sheet: LOD0 in front, LOD1 behind, for checkpoint evidence."""
    scene = bpy.context.scene
    names = [s.name for s in specs()]
    for i, name in enumerate(names):
        x = (i - 1.5) * 9.0
        objects[f'{name}_lod0'].location = (x, 0, 0)
        objects[f'{name}_lod1'].location = (x, 16, 0)
    bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 10, 0))
    ground = bpy.context.active_object
    gm = bpy.data.materials.new('ground')
    gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.55, 0.53, 0.5, 1)
    ground.data.materials.append(gm)
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 4.0
    sun_data.color = (1.0, 0.82, 0.62)
    sun_data.angle = math.radians(2)
    sun = bpy.data.objects.new('sun', sun_data)
    sun.rotation_euler = (math.radians(62), 0, math.radians(-35))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new('sky')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.42, 0.56, 0.78, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    scene.world = world
    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = 28
    cam = bpy.data.objects.new('cam', cam_data)
    cam.location = (0, -34, 5.5)
    cam.rotation_euler = (math.radians(84), 0, 0)
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1600, 800
    scene.view_settings.view_transform = 'AgX'
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 86
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--out', default=os.path.join(ROOT, 'public', 'world', 'models', 'trees.glb'))
    parser.add_argument('--work', default=os.path.join(ROOT, 'tools', 'blender', 'build'))
    parser.add_argument('--preview', help='directory for a Cycles preview render (optional)')
    args = parser.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(args.work, exist_ok=True)
    leaf_img = to_image('tree_leaves', leaf_atlas(), os.path.join(args.work, 'tree_leaves.png'))
    bark_img = to_image('tree_bark', bark_texture(), os.path.join(args.work, 'tree_bark.png'))
    mats = make_materials(leaf_img, bark_img)

    objects: dict[str, bpy.types.Object] = {}
    for spec in specs():
        for detail in (0, 1):
            geo, extras = build_tree(spec, detail)
            name = f'{spec.name}_lod{detail}'
            objects[name] = make_object(name, geo, mats, extras)
            print(f'{name}: {extras["triangles"]} triangles, {len(geo.co)} vertices, height {extras["height"]} m')
    export(args.out)
    print(f'wrote {os.path.relpath(args.out, ROOT)} ({os.path.getsize(args.out) / 1024:.0f} KiB)')
    if args.preview:
        path = os.path.join(args.preview, 'trees-blender.jpg')
        render_preview(objects, path)
        print(f'wrote {os.path.relpath(path, ROOT)}')


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
