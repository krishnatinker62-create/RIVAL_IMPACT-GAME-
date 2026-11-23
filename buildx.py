import numpy as np, json, struct, sys
import rigx
from rigx import NAMES, NB
from animx import Poses
import chars as chars_mod

Z = (0, 0, 0)

def srgb2lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def build_char(k, outdir="../../models", preview=False):
    cfg = chars_mod.CHARS[k]
    rg = rigx.Rig(cfg, cfg["ht"] / 100.0)
    st = cfg.get("style", {})
    PZ = Poses(rg, st); G = PZ.G
    V = np.load(f"{k}_dv.npy").astype(np.float64); C = np.load(f"{k}_dc.npy").astype(np.float64); F = np.load(f"{k}_df.npy").astype(np.int64)
    Vg = rg.to_game(V); BI, BW = rg.skin_weights(V)
    cm_ = rg.cut_mask[F]; keep = ~(cm_.any(1) & ~cm_.all(1))      # props bound rigidly to another bone: remove the stretched bridge faces
    if not keep.all(): print(k, "cut", int((~keep).sum()), "bridge faces"); F = F[keep]
    fn = np.cross(Vg[F[:, 1]] - Vg[F[:, 0]], Vg[F[:, 2]] - Vg[F[:, 0]])
    N = np.zeros_like(Vg)
    for j in range(3): np.add.at(N, F[:, j], fn)
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)
    Clin = srgb2lin(np.clip(C, 0, 1))

    def bake(fn_pose, D, fps, loop=False, vertex_lock=False):
        n = int(round(D * fps)); times = np.linspace(0, D, n + 1)
        Q = np.zeros((n + 1, NB, 4)); T = np.zeros((n + 1, 3))
        for f, t in enumerate(times):
            eul, off = fn_pose(0.0 if (loop and f == n) else t)
            if vertex_lock:
                R, P = rg.fk(eul, (off[0], 0, off[2])); pv = rg.skin(Vg, BI, BW, R, P)
                off = (off[0], -pv[:, 1].min(), off[2])
            else:
                off = rg.ground_lock(eul, off)
            for i, nm in enumerate(NAMES): Q[f, i] = rigx.R_to_quat(rigx.euler_to_R(eul.get(nm, Z)))
            T[f] = rg.rest_local[0] + np.array(off)
        for f in range(1, n + 1):
            flip = (Q[f] * Q[f - 1]).sum(1) < 0; Q[f][flip] *= -1
        if loop: Q[n] = Q[0]; T[n] = T[0]
        return times, Q, T

    def keyed(kf, D):
        keys = [(u * D, p, o) for u, p, o in kf]
        return lambda t: PZ.sample(keys, t)

    def breathe(P, t, D, amp=1.0):
        b = np.sin(2 * np.pi * t / D)
        P = PZ.add(P, Spine=(1.6 * b * amp, 0, 0), Spine1=(1.2 * b * amp, 0, 0), Head=(-1.5 * b * amp, 0, 0)); P = dict(P)
        for sd, ph in (("Left", 0.0), ("Right", 0.6)):
            bb = np.sin(2 * np.pi * t / D + ph)
            P[sd + "ForeArm"] = tuple(np.array(P[sd + "ForeArm"]) + [-3 * bb * amp, 0, 0])
            P[sd + "Arm"] = tuple(np.array(P[sd + "Arm"]) + [-1.5 * bb * amp, 0, 0])
        kb = np.sin(2 * np.pi * t / D * 2)
        for sd in ("Left", "Right"):
            P[sd + "Leg"] = tuple(np.array(P[sd + "Leg"]) + [3.0 * kb * amp, 0, 0])
            P[sd + "Foot"] = tuple(np.array(P[sd + "Foot"]) + [-3.0 * kb * amp, 0, 0])
            P[sd + "UpLeg"] = tuple(np.array(P[sd + "UpLeg"]) + [-1.5 * kb * amp, 0, 0])
        return P, Z

    def walk_fn(D, direction=1):
        def f(t):
            ph = 2 * np.pi * t / D * direction
            P = dict(PZ.base_guard(lean=st.get("lean", 6) - (1 if direction > 0 else 4)))
            for sd, off in (("Left", 0.0), ("Right", np.pi)):
                p = ph + off; fwd = 24 * np.sin(p); knee = 10 + 44 * max(0.0, np.cos(p)) ** 1.2
                PZ.leg(P, sd, fwd=fwd + (10 if sd == "Left" else -6), out=st.get("leg_out", 5) - 1, knee=knee)
            return PZ.add(P, Hips=(0, 5 * np.sin(ph), 0), Spine=(0, -6 * np.sin(ph), 0), Spine1=(0, -4 * np.sin(ph), 0)), Z
        return f

    sp = st.get("speed", 1.0)
    hitf, kickh, heavyh = 0.36, 0.44, 0.52
    clips = {}
    clips['idle'] = bake(lambda t: breathe(G, t, 1.8), 1.8, 30, loop=True)
    clips['walk'] = bake(walk_fn(0.86 / sp, 1), 0.86 / sp, 30, loop=True)
    clips['walk_back'] = bake(walk_fn(0.95 / sp, -1), 0.95 / sp, 30, loop=True)
    clips['block'] = bake(lambda t: breathe(PZ.block(), t, 1.4, 0.6), 1.4, 30, loop=True)
    D = 0.34
    clips['punch'] = bake(keyed([(0, G, Z), (hitf * .55, PZ.punch_wind(), Z), (hitf, PZ.punch_hit(), (0, 0, .04)),
                                 (hitf + .16, PZ.punch_hit(), (0, 0, .04)), (1.0, G, Z)], D), D, 60)
    D = 0.52
    clips['kick'] = bake(keyed([(0, G, Z), (.22, PZ.kick_chamber(), Z), (kickh, PZ.kick_hit(), (0, 0, .03)),
                                (kickh + .14, PZ.kick_hit(), (0, 0, .03)), (.82, PZ.kick_chamber(), Z), (1.0, G, Z)], D), D, 60)
    D = 0.78
    clips['heavy'] = bake(keyed([(0, G, Z), (.30, PZ.heavy_wind(), (0, 0, -.05)), (heavyh, PZ.heavy_hit(), (0, 0, .10)),
                                 (heavyh + .14, PZ.heavy_hit(), (0, 0, .10)), (1.0, G, Z)], D), D, 60)
    D = 0.55; hp = PZ.hit()
    clips['hit'] = bake(keyed([(0, G, Z), (.22, hp, (0, 0, -.06)), (.5, PZ.merge(G, hp, .55), (0, 0, -.03)), (1.0, PZ.merge(G, hp, .25), Z)], D), D, 60)
    D = 1.9
    ko_end = PZ.ko_end(); ko_mid = PZ.merge(hp, ko_end, .5); ko_mid["Hips"] = (-42, 0, 0)
    clips['ko'] = bake(keyed([(0, G, Z), (.12, hp, (0, 0, -.08)), (.40, ko_mid, (0, 0, -.35)), (.62, ko_end, (0, 0, -.62)),
                              (.72, PZ.add(ko_end, Spine=(2, 0, 0)), (0, 0, -.64)), (1.0, ko_end, (0, 0, -.64))], D), D, 30, vertex_lock=True)
    D = 2.6; w1 = PZ.win(); w2 = PZ.add(w1, LeftArm=(0, 0, 6), RightArm=(0, 0, -6), Head=(-4, 0, 0), Spine2=(-3, 0, 0))
    clips['win'] = bake(keyed([(0, G, Z), (.22, PZ.merge(G, w1, .6), Z), (.34, w1, Z), (.60, w2, Z), (.85, w1, Z), (1.0, w2, Z)], D), D, 30)

    # ---------------- glTF
    class Blob:
        def __init__(s): s.b = bytearray(); s.views = []; s.acc = []
        def view(s, data, target=None):
            while len(s.b) % 4: s.b.append(0)
            off = len(s.b); s.b += data; v = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
            if target: v["target"] = target
            s.views.append(v); return len(s.views) - 1
        def accessor(s, arr, ctype, atype, target=None, minmax=False, normalized=False):
            bv = s.view(np.ascontiguousarray(arr).tobytes(), target)
            a = {"bufferView": bv, "componentType": ctype, "count": int(len(arr)), "type": atype}
            if normalized: a["normalized"] = True
            if minmax: a["min"] = np.asarray(arr).min(0).tolist() if arr.ndim > 1 else [float(arr.min())]; a["max"] = np.asarray(arr).max(0).tolist() if arr.ndim > 1 else [float(arr.max())]
            s.acc.append(a); return len(s.acc) - 1
    bl = Blob(); FLOAT, USHORT, UBYTE = 5126, 5123, 5121
    pos = bl.accessor(Vg.astype(np.float32), FLOAT, "VEC3", 34962, True); nor = bl.accessor(N.astype(np.float32), FLOAT, "VEC3", 34962)
    col = bl.accessor(Clin.astype(np.float32), FLOAT, "VEC3", 34962); jnt = bl.accessor(BI.astype(np.uint8), UBYTE, "VEC4", 34962)
    BWn = np.clip(BW, 0, 1); BWq = np.round(BWn * 255).astype(np.int32); d = 255 - BWq.sum(1); BWq[np.arange(len(BWq)), BWn.argmax(1)] += d   # exact sum 255
    wgt = bl.accessor(BWq.astype(np.uint8), UBYTE, "VEC4", 34962, False, True)
    big = len(Vg) > 65535
    idx = bl.accessor(F.astype(np.uint32 if big else np.uint16).reshape(-1), 5125 if big else USHORT, "SCALAR", 34963)
    nodes = [{"name": "Body_" + k, "mesh": 0, "skin": 0}]
    for i, nm in enumerate(NAMES): nodes.append({"name": nm, "translation": rg.rest_local[i].tolist(), "children": []})
    for i, p in enumerate(rigx.PARENT):
        if p >= 0: nodes[1 + p]["children"].append(1 + i)
    for n in nodes:
        if "children" in n and not n["children"]: del n["children"]
    ibm = np.zeros((NB, 4, 4), np.float32)
    for i in range(NB):
        m = np.eye(4); m[:3, 3] = -rg.rest_world[i]; ibm[i] = m.T
    ibm_acc = bl.accessor(ibm.reshape(NB, 16), FLOAT, "MAT4")
    anims = []
    for name, (times, Q, T) in clips.items():
        tacc = bl.accessor(times.astype(np.float32), FLOAT, "SCALAR", None, True); samplers, channels = [], []
        for i in range(NB):
            qa = bl.accessor(Q[:, i].astype(np.float32), FLOAT, "VEC4")
            samplers.append({"input": tacc, "output": qa, "interpolation": "LINEAR"})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": 1 + i, "path": "rotation"}})
        ta = bl.accessor(T.astype(np.float32), FLOAT, "VEC3")
        samplers.append({"input": tacc, "output": ta, "interpolation": "LINEAR"})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": 1, "path": "translation"}})
        anims.append({"name": name, "samplers": samplers, "channels": channels})
    gltf = {"asset": {"version": "2.0", "generator": "RIVAL IMPACT auto-rig"}, "scene": 0, "scenes": [{"nodes": [0, 1]}], "nodes": nodes,
            "meshes": [{"name": "Mesh_" + k, "primitives": [{"attributes": {"POSITION": pos, "NORMAL": nor, "COLOR_0": col, "JOINTS_0": jnt, "WEIGHTS_0": wgt}, "indices": idx, "material": 0}]}],
            "materials": [{"name": "VertexColor", "doubleSided": True, "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0.0, "roughnessFactor": 0.88}}],
            "skins": [{"name": "Rig_" + k, "joints": [1 + i for i in range(NB)], "inverseBindMatrices": ibm_acc, "skeleton": 1}],
            "animations": anims, "accessors": bl.acc, "bufferViews": bl.views, "buffers": [{"byteLength": len(bl.b)}]}
    js = json.dumps(gltf, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    bb = bytes(bl.b)
    while len(bb) % 4: bb += b'\0'
    out = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(bb)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(bb), b'BIN\0') + bb
    import os; os.makedirs(outdir, exist_ok=True)
    path = f"{outdir}/{cfg['id']}.glb"; open(path, 'wb').write(out)
    print(k, path, round(len(out) / 1e6, 2), "MB", len(Vg), "verts", len(F), "tris")
    return rg, PZ, Vg, BI, BW, Clin, clips

if __name__ == "__main__":
    for k in (sys.argv[1:] or chars_mod.CHARS): build_char(k)
