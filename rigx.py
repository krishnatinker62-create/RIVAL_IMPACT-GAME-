"""Generalised auto-rig. Meshes are already Y-up, face +Z, character-left = +X (units: height 75).
A Rig object holds per-character joint positions, scale and arm rest angles."""
import numpy as np

BONES = [("Hips", None), ("Spine", "Hips"), ("Spine1", "Spine"), ("Spine2", "Spine1"), ("Neck", "Spine2"),
         ("Head", "Neck"), ("HeadTop", "Head")]
for _s in ("Left", "Right"):
    BONES += [(_s + "Shoulder", "Spine2"), (_s + "Arm", _s + "Shoulder"), (_s + "ForeArm", _s + "Arm"),
              (_s + "Hand", _s + "ForeArm"), (_s + "HandEnd", _s + "Hand"),
              (_s + "UpLeg", "Hips"), (_s + "Leg", _s + "UpLeg"), (_s + "Foot", _s + "Leg"),
              (_s + "ToeBase", _s + "Foot"), (_s + "ToeEnd", _s + "ToeBase")]
NAMES = [b for b, _ in BONES]
IDX = {n: i for i, n in enumerate(NAMES)}
PARENT = [(-1 if p is None else IDX[p]) for _, p in BONES]
NB = len(NAMES)

# skin segments: (bone, start joint, end joint, radius at rs=1)
SEG = [("Hips", "Hips", "Spine", 8.0), ("Spine", "Spine", "Spine1", 7.5), ("Spine1", "Spine1", "Spine2", 8.0),
       ("Spine2", "Spine2", "Neck", 8.5), ("Neck", "Neck", "Head", 3.2), ("Head", "Head", "HeadTop", 6.0)]
for _s in ("Left", "Right"):
    SEG += [(_s + "Shoulder", _s + "Shoulder", _s + "Arm", 3.0), (_s + "Arm", _s + "Arm", _s + "ForeArm", 3.6),
            (_s + "ForeArm", _s + "ForeArm", _s + "Hand", 3.0), (_s + "Hand", _s + "Hand", _s + "HandEnd", 2.4),
            (_s + "UpLeg", _s + "UpLeg", _s + "Leg", 5.5), (_s + "Leg", _s + "Leg", _s + "Foot", 4.2),
            (_s + "Foot", _s + "Foot", _s + "ToeBase", 3.2), (_s + "ToeBase", _s + "ToeBase", _s + "ToeEnd", 2.2)]

def rx(a): c, s = np.cos(a), np.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def ry(a): c, s = np.cos(a), np.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def rz(a): c, s = np.cos(a), np.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
def euler_to_R(e):
    a, b, c = np.radians(e); return rx(a) @ ry(b) @ rz(c)
def R_to_quat(R):
    t = np.trace(R)
    if t > 0:
        s = np.sqrt(t + 1) * 2; w = s / 4; x = (R[2, 1] - R[1, 2]) / s; y = (R[0, 2] - R[2, 0]) / s; z = (R[1, 0] - R[0, 1]) / s
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = np.sqrt(1 + R[0, 0] - R[1, 1] - R[2, 2]) * 2; w = (R[2, 1] - R[1, 2]) / s; x = s / 4; y = (R[0, 1] + R[1, 0]) / s; z = (R[0, 2] + R[2, 0]) / s
    elif R[1, 1] > R[2, 2]:
        s = np.sqrt(1 + R[1, 1] - R[0, 0] - R[2, 2]) * 2; w = (R[0, 2] - R[2, 0]) / s; x = (R[0, 1] + R[1, 0]) / s; y = s / 4; z = (R[1, 2] + R[2, 1]) / s
    else:
        s = np.sqrt(1 + R[2, 2] - R[0, 0] - R[1, 1]) * 2; w = (R[1, 0] - R[0, 1]) / s; x = (R[0, 2] + R[2, 0]) / s; y = (R[1, 2] + R[2, 1]) / s; z = s / 4
    q = np.array([x, y, z, w]); return q / np.linalg.norm(q)

def seg_dist(P, a, b):
    a = np.asarray(a, float); b = np.asarray(b, float); ab = b - a
    t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)

def make_joints(c):
    """c: character config -> dict of joint positions (mesh coordinates)."""
    cx, cz = c["cx"], c["cz"]; J = {}
    lev = c.get("levels", {})
    ys = dict(Hips=37.0, Spine=42.0, Spine1=48.5, Spine2=54.0, Neck=60.5, Head=63.5); ys.update(lev)
    dz = c.get("spine_dz", {})
    for n, y in ys.items(): J[n] = (cx, y, cz + dz.get(n, 0.0))
    J["HeadTop"] = (cx, c["Hmax"] - 0.5, cz + dz.get("HeadTop", 0.0))
    for side, sg in (("Left", 1), ("Right", -1)):
        sx = c["shoulder_x"][side]; T = np.array(c["tip"][side], float)   # fingertip in mesh coords
        S = np.array([cx + sg * sx, c.get("shoulder_y", 58.0), cz + c.get("arm_dz", 0.0)])
        J[side + "Shoulder"] = (cx + sg * 2.5, c.get("shoulder_y", 58.0) + 0.5, cz)
        J[side + "Arm"] = tuple(S)
        E = S + c.get("elbow_t", 0.47) * (T - S) + np.array(c.get("elbow_off", (0, 0, 0))) * np.array([sg, 1, 1])
        if side in c.get("elbow", {}): E = np.array(c["elbow"][side], float)
        W = S + 0.80 * (T - S)
        J[side + "ForeArm"] = tuple(E); J[side + "Hand"] = tuple(W); J[side + "HandEnd"] = tuple(T)
        fx = c["foot_x"][side]; zt, zh = c["foot_z"][side]            # toe z, heel z
        ak = c.get("ankle_y", 6.5)
        J[side + "UpLeg"] = (cx + sg * fx * c.get("hip_f", 0.62), c.get("hip_y", 36.5), cz)
        J[side + "Leg"] = (cx + sg * fx * 0.92, c.get("knee_y", 20.0), cz + (zh + 3.5 - cz) * 0.35 + c.get("knee_dz", 1.0))
        J[side + "Foot"] = (cx + sg * fx, ak, zh + 3.8)
        J[side + "ToeBase"] = (cx + sg * fx, 1.5, zt - 2.6)
        J[side + "ToeEnd"] = (cx + sg * fx, 0.5, zt)
    return J

class Rig:
    def __init__(self, c, height_m):
        self.c = c; self.J = make_joints(c)
        self.S = height_m / 75.0; self.cx = c["cx"]; self.cz = c["cz"]; self.rs = c.get("rs", 1.0)
        self.rest_world = np.array([self.to_game(self.J[n]) for n in NAMES])
        self.rest_local = np.array([self.rest_world[i] - (self.rest_world[PARENT[i]] if PARENT[i] >= 0 else 0) for i in range(NB)])
        # arm rest angles (A-pose compensation): outward angle from vertical of upper arm, and forearm relative to upper arm
        self.A1 = {}; self.A2 = {}
        for side, sg in (("Left", 1), ("Right", -1)):
            S, E, W = (np.array(self.J[side + n]) for n in ("Arm", "ForeArm", "Hand"))
            a1 = np.degrees(np.arctan2(sg * (E[0] - S[0]), S[1] - E[1]))
            a2 = np.degrees(np.arctan2(sg * (W[0] - E[0]), E[1] - W[1])) - a1
            self.A1[side] = float(a1); self.A2[side] = float(a2)
        foot = [IDX[n] for n in ("LeftFoot", "RightFoot", "LeftToeBase", "RightToeBase", "LeftToeEnd", "RightToeEnd")]
        self.foot_ids = foot; self.rest_foot_y = min(self.rest_world[i][1] for i in foot)

    def to_game(self, p):
        p = np.asarray(p, float); o = np.empty_like(p)
        o[..., 0] = (p[..., 0] - self.cx) * self.S; o[..., 1] = p[..., 1] * self.S; o[..., 2] = (p[..., 2] - self.cz) * self.S
        return o

    def skin_weights(self, Vm, power=3.0, eps=0.7, topk=4):
        n = len(Vm); W = np.zeros((n, NB)); dleg = np.full(n, 1e9)
        ars = self.c.get("arm_rs", 1.0)
        for bone, a, b, r in SEG:
            r = r * self.rs * (ars if any(t in bone for t in ("Shoulder", "Arm", "Hand")) else 1.0)
            d = seg_dist(Vm, self.J[a], self.J[b])
            W[:, IDX[bone]] = 1.0 / (np.maximum(d - r, 0) + eps) ** power
            if "Leg" in bone and "Up" in bone or bone.endswith("Leg"):
                dleg = np.minimum(dleg, d - r)
        sk = self.c.get("skirt", 0.0)
        if sk > 0:      # robe/skirt damping: cloth far from the legs follows the hips more
            below = np.clip((self.J["Hips"][1] + 2 - Vm[:, 1]) / 6.0, 0, 1)
            a = sk * below * np.clip((dleg - 0.5) / 5.0, 0, 1)
            Wn = W / W.sum(1, keepdims=True)
            hip = np.zeros_like(Wn); hip[:, IDX["Hips"]] = 1
            W = (1 - a)[:, None] * Wn + a[:, None] * hip
        order = np.argsort(-W, axis=1)[:, :topk]
        ow = np.take_along_axis(W, order, 1); ow /= ow.sum(1, keepdims=True)
        # rigid props (swords, scabbards): every vertex within `r` of segment p0-p1 follows ONE bone 100%
        self.cut_mask = np.zeros(n, bool)
        for ent in self.c.get("rigid", []):
            bone, p0, p1, r = ent[:4]; m = seg_dist(Vm, p0, p1) <= r
            order[m, 0] = IDX[bone]; order[m, 1:] = IDX[bone]; ow[m] = 0.0; ow[m, 0] = 1.0
            if len(ent) > 4 and ent[4]: self.cut_mask |= m      # 'cut': drop faces that bridge this prop and the body
        return order.astype(np.uint8), ow.astype(np.float32)

    def fk(self, eul, hips_off=(0, 0, 0)):
        R = np.zeros((NB, 3, 3)); P = np.zeros((NB, 3))
        for i, nm in enumerate(NAMES):
            Rl = euler_to_R(eul.get(nm, (0, 0, 0))); p = PARENT[i]
            if p < 0: R[i] = Rl; P[i] = self.rest_local[i] + np.asarray(hips_off)
            else: R[i] = R[p] @ Rl; P[i] = P[p] + R[p] @ self.rest_local[i]
        return R, P

    def skin(self, Vg, bi, bw, R, P):
        out = np.zeros_like(Vg)
        for k in range(bi.shape[1]):
            b = bi[:, k]; w = bw[:, k][:, None]
            out += w * (np.einsum('nij,nj->ni', R[b], Vg - self.rest_world[b]) + P[b])
        return out

    def ground_lock(self, eul, off=(0, 0, 0)):
        R, P = self.fk(eul, (off[0], 0, off[2]))
        cur = min(P[i][1] for i in self.foot_ids)
        return (off[0], self.rest_foot_y - cur, off[2])
