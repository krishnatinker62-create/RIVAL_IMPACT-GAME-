import numpy as np, json, struct, sys
import rig, anim
from anim import *

FIX_COLORS = True

# ------------------------------------------------------------------ mesh
V = np.load('dv.npy').astype(np.float64)       # original coords
C = np.load('dc.npy').astype(np.float64)
F = np.load('df.npy').astype(np.int64)

if FIX_COLORS:    # long back-hair strands were filled with the body's skin tone -> make them hair-dark
    z, y, x = V[:, 2], V[:, 1], V[:, 0]
    ycut = np.interp(z, [43, 52, 62, 72], [5.0, 4.0, 3.4, 1.0])
    hair = (z >= 43) & (y > ycut) & (np.abs(x) < 12)
    rng = np.random.default_rng(3)
    C[hair] = np.array([0.075, 0.062, 0.062]) + rng.uniform(-.015, .02, (hair.sum(), 1))
    print('recoloured hair verts:', hair.sum())

Vg = rig.to_game(V)
BI, BW = rig.skin_weights(V)

# normals (area weighted)
fn = np.cross(Vg[F[:, 1]] - Vg[F[:, 0]], Vg[F[:, 2]] - Vg[F[:, 0]])
N = np.zeros_like(Vg)
for k in range(3): np.add.at(N, F[:, k], fn)
N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)

def srgb2lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
Clin = srgb2lin(np.clip(C, 0, 1))

# ------------------------------------------------------------------ clips
NB = len(rig.NAMES)
def bake(fn_pose, D, fps, loop=False, vertex_lock=False):
    n = int(round(D * fps)); times = np.arange(n + 1) / fps * (D / (n / fps))
    times = np.linspace(0, D, n + 1)
    Q = np.zeros((n + 1, NB, 4)); T = np.zeros((n + 1, 3))
    for f, t in enumerate(times):
        eul, off = fn_pose(t if not (loop and f == n) else 0.0)
        if vertex_lock:
            R, P = rig.fk(eul, (off[0], 0, off[2]))
            pv = rig.skin(Vg, BI, BW, R, P)
            off = (off[0], -pv[:, 1].min(), off[2])
        else:
            off = anim.ground_lock(eul, off)
        for i, nm in enumerate(rig.NAMES):
            Q[f, i] = rig.R_to_quat(rig.euler_to_R(eul.get(nm, (0, 0, 0))))
        T[f] = rig.REST_LOCAL[0] + np.array(off)
    for f in range(1, n + 1):                       # quaternion sign continuity
        flip = (Q[f] * Q[f - 1]).sum(1) < 0
        Q[f][flip] *= -1
    if loop: Q[n] = Q[0]; T[n] = T[0]
    return times, Q, T

def keyed(keys_frac, D):
    keys = [(u * D, p, o) for u, p, o in keys_frac]
    return lambda t: sample(keys, t)

Z = (0, 0, 0)
def breathe(P, t, D, amp=1.0):
    b = np.sin(2 * np.pi * t / D)
    P = add(P, Spine=(1.6 * b * amp, 0, 0), Spine1=(1.2 * b * amp, 0, 0), Head=(-1.5 * b * amp, 0, 0))
    P = dict(P)
    for sd, ph in (("Left", 0.0), ("Right", 0.6)):
        bb = np.sin(2 * np.pi * t / D + ph)
        P[sd + "ForeArm"] = tuple(np.array(P[sd + "ForeArm"]) + [-3 * bb * amp, 0, 0])
        P[sd + "Arm"] = tuple(np.array(P[sd + "Arm"]) + [-1.5 * bb * amp, 0, 0])
    kb = np.sin(2 * np.pi * t / D * 2)       # knee bob twice per breath
    for sd in ("Left", "Right"):
        P[sd + "Leg"] = tuple(np.array(P[sd + "Leg"]) + [3.0 * kb * amp, 0, 0])
        P[sd + "Foot"] = tuple(np.array(P[sd + "Foot"]) + [-3.0 * kb * amp, 0, 0])
        P[sd + "UpLeg"] = tuple(np.array(P[sd + "UpLeg"]) + [-1.5 * kb * amp, 0, 0])
    return P, Z

def walk_fn(D, direction=1):
    def f(t):
        ph = 2 * np.pi * t / D * direction
        P = dict(base_guard(lean=5 if direction > 0 else 2))
        for sd, off in (("Left", 0.0), ("Right", np.pi)):
            p = ph + off
            fwd = 24 * np.sin(p)
            knee = 10 + 44 * max(0.0, np.cos(p)) ** 1.2 * (1 if direction > 0 else 1)
            leg(P, sd, fwd=fwd + (10 if sd == "Left" else -6), out=4, knee=knee)
        P = add(P, Hips=(0, 5 * np.sin(ph), 0), Spine=(0, -6 * np.sin(ph), 0), Spine1=(0, -4 * np.sin(ph), 0))
        return P, Z
    return f

hitf, kickh, heavyh = 0.36, 0.44, 0.52
guard = anim.G
clips = {}

clips['idle'] = bake(lambda t: breathe(guard, t, 1.8), 1.8, 30, loop=True)
clips['walk'] = bake(walk_fn(0.86, 1), 0.86, 30, loop=True)
clips['walk_back'] = bake(walk_fn(0.95, -1), 0.95, 30, loop=True)
clips['block'] = bake(lambda t: breathe(pose_block(), t, 1.4, 0.6), 1.4, 30, loop=True)

D = 0.34
clips['punch'] = bake(keyed([(0, guard, Z), (hitf * .55, pose_punch_wind(), Z), (hitf, pose_punch_hit(), (0, 0, .04)),
                             (hitf + .16, pose_punch_hit(), (0, 0, .04)), (1.0, guard, Z)], D), D, 60)
D = 0.52
clips['kick'] = bake(keyed([(0, guard, Z), (.22, pose_kick_chamber(), Z), (kickh, pose_kick_hit(), (0, 0, .03)),
                            (kickh + .14, pose_kick_hit(), (0, 0, .03)), (.82, pose_kick_chamber(), Z), (1.0, guard, Z)], D), D, 60)
D = 0.78
clips['heavy'] = bake(keyed([(0, guard, Z), (.30, pose_heavy_wind(), (0, 0, -.05)), (heavyh, pose_heavy_hit(), (0, 0, .10)),
                             (heavyh + .14, pose_heavy_hit(), (0, 0, .10)), (1.0, guard, Z)], D), D, 60)
D = 0.55
hp = pose_hit()
clips['hit'] = bake(keyed([(0, guard, Z), (.22, hp, (0, 0, -.06)), (.5, merge(guard, hp, .55), (0, 0, -.03)), (1.0, merge(guard, hp, .25), Z)], D), D, 60)
D = 1.9
ko_mid = merge(pose_hit(), pose_ko_end(), .5); ko_mid["Hips"] = (-42, 0, 0)
clips['ko'] = bake(keyed([(0, guard, Z), (.12, pose_hit(), (0, 0, -.08)), (.40, ko_mid, (0, 0, -.35)),
                          (.62, pose_ko_end(), (0, 0, -.62)), (.72, add(pose_ko_end(), Spine=(2, 0, 0)), (0, 0, -.64)),
                          (1.0, pose_ko_end(), (0, 0, -.64))], D), D, 30, vertex_lock=True)
D = 2.6
w1 = pose_win(); w2 = add(w1, LeftArm=(0, 0, 6), RightArm=(0, 0, -6), Head=(-4, 0, 0), Spine2=(-3, 0, 0))
clips['win'] = bake(keyed([(0, guard, Z), (.22, merge(guard, w1, .6), Z), (.34, w1, Z), (.60, w2, Z), (.85, w1, Z), (1.0, w2, Z)], D), D, 30)

for k, (t, q, tr) in clips.items():
    print(f'{k:10s} frames={len(t):3d} dur={t[-1]:.2f}')

# ------------------------------------------------------------------ glTF writer
class Blob:
    def __init__(s): s.b = bytearray(); s.views = []; s.acc = []
    def view(s, data, target=None):
        while len(s.b) % 4: s.b.append(0)
        off = len(s.b); s.b += data
        v = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target: v["target"] = target
        s.views.append(v); return len(s.views) - 1
    def accessor(s, arr, ctype, atype, target=None, minmax=False, normalized=False):
        bv = s.view(np.ascontiguousarray(arr).tobytes(), target)
        a = {"bufferView": bv, "componentType": ctype, "count": int(len(arr)), "type": atype}
        if normalized: a["normalized"] = True
        if minmax: a["min"] = np.asarray(arr).min(0).tolist() if arr.ndim > 1 else [float(arr.min())]; a["max"] = np.asarray(arr).max(0).tolist() if arr.ndim > 1 else [float(arr.max())]
        s.acc.append(a); return len(s.acc) - 1

bl = Blob()
FLOAT, USHORT, UBYTE, UINT = 5126, 5123, 5121, 5125
pos = bl.accessor(Vg.astype(np.float32), FLOAT, "VEC3", 34962, True)
nor = bl.accessor(N.astype(np.float32), FLOAT, "VEC3", 34962)
col = bl.accessor(Clin.astype(np.float32), FLOAT, "VEC3", 34962)
jnt = bl.accessor(BI.astype(np.uint8), UBYTE, "VEC4", 34962)
wgt = bl.accessor(BW.astype(np.float32), FLOAT, "VEC4", 34962)
idx = bl.accessor(F.astype(np.uint16).reshape(-1), USHORT, "SCALAR", 34963)

# nodes: 0 = mesh node, 1.. = bones
nodes = [{"name": "RudraBody", "mesh": 0, "skin": 0}]
for i, nm in enumerate(rig.NAMES):
    nodes.append({"name": nm, "translation": rig.REST_LOCAL[i].tolist(), "children": []})
for i, p in enumerate(rig.PARENT):
    if p >= 0: nodes[1 + p]["children"].append(1 + i)
for n in nodes:
    if "children" in n and not n["children"]: del n["children"]

ibm = np.zeros((NB, 4, 4), np.float32)
for i in range(NB):
    m = np.eye(4); m[:3, 3] = -rig.REST_WORLD[i]; ibm[i] = m.T       # column-major
ibm_acc = bl.accessor(ibm.reshape(NB, 16), FLOAT, "MAT4")

anims = []
for name, (times, Q, T) in clips.items():
    tacc = bl.accessor(times.astype(np.float32), FLOAT, "SCALAR", None, True)
    samplers, channels = [], []
    for i in range(NB):
        qa = bl.accessor(Q[:, i].astype(np.float32), FLOAT, "VEC4")
        samplers.append({"input": tacc, "output": qa, "interpolation": "LINEAR"})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": 1 + i, "path": "rotation"}})
    ta = bl.accessor(T.astype(np.float32), FLOAT, "VEC3")
    samplers.append({"input": tacc, "output": ta, "interpolation": "LINEAR"})
    channels.append({"sampler": len(samplers) - 1, "target": {"node": 1, "path": "translation"}})
    anims.append({"name": name, "samplers": samplers, "channels": channels})

gltf = {
    "asset": {"version": "2.0", "generator": "Rudra auto-rig"},
    "scene": 0, "scenes": [{"nodes": [0, 1]}], "nodes": nodes,
    "meshes": [{"name": "RudraMesh", "primitives": [{"attributes": {"POSITION": pos, "NORMAL": nor, "COLOR_0": col, "JOINTS_0": jnt, "WEIGHTS_0": wgt},
                                                    "indices": idx, "material": 0}]}],
    "materials": [{"name": "RudraVertexColor", "doubleSided": True,
                   "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0.0, "roughnessFactor": 0.88}}],
    "skins": [{"name": "RudraRig", "joints": [1 + i for i in range(NB)], "inverseBindMatrices": ibm_acc, "skeleton": 1}],
    "animations": anims, "accessors": bl.acc, "bufferViews": bl.views, "buffers": [{"byteLength": len(bl.b)}],
}
js = json.dumps(gltf, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
bb = bytes(bl.b)
while len(bb) % 4: bb += b'\0'
out = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(bb)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(bb), b'BIN\0') + bb
open('../../models/rudra.glb', 'wb').write(out)
print('rudra.glb', len(out) / 1e6, 'MB; verts', len(Vg), 'tris', len(F))
