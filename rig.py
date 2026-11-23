"""Rudra auto-rig: skeleton placement, skin weights, forward kinematics + skinning (numpy)."""
import numpy as np

HEIGHT_M = 1.86           # RUDRA ht = 186
S = HEIGHT_M / 75.0       # original units -> metres
YC = -2.5                 # original-Y centre of the body (feet/hips) -> game z = 0

def to_game(p):
    """original FBX (Z-up, character faces -Y, char-left = +X)  ->  game (Y-up, faces +Z, char-left = +X)"""
    p = np.asarray(p, dtype=np.float64)
    out = np.empty_like(p)
    out[..., 0] = p[..., 0] * S
    out[..., 1] = p[..., 2] * S
    out[..., 2] = -(p[..., 1] - YC) * S
    return out

# ---- joints in ORIGINAL coordinates (x, y, z). Left = +X.
def _lr(name, x, y, z):
    return {"Left" + name: (x, y, z), "Right" + name: (-x, y, z)}

J = {
    "Hips": (0, -3.0, 37.0), "Spine": (0, -3.2, 42.0), "Spine1": (0, -3.0, 48.5), "Spine2": (0, -2.8, 54.0),
    "Neck": (0, -2.4, 60.5), "Head": (0, -2.0, 63.5), "HeadTop": (0, -1.5, 73.5),
}
for nm, p in {"Shoulder": (2.5, -2.6, 58.5), "Arm": (10.5, -2.4, 58.0), "ForeArm": (13.5, -2.4, 48.5),
              "Hand": (19.5, -4.2, 39.5), "HandEnd": (21.0, -4.5, 34.0),
              "UpLeg": (5.5, -3.0, 36.5), "Leg": (8.0, -0.5, 20.0), "Foot": (8.5, 0.5, 6.5),
              "ToeBase": (9.5, -3.5, 1.5), "ToeEnd": (10.0, -7.0, 0.5)}.items():
    J.update(_lr(nm, *p))

# (bone, parent)
BONES = [("Hips", None), ("Spine", "Hips"), ("Spine1", "Spine"), ("Spine2", "Spine1"), ("Neck", "Spine2"),
         ("Head", "Neck"), ("HeadTop", "Head")]
for side in ("Left", "Right"):
    BONES += [(side + "Shoulder", "Spine2"), (side + "Arm", side + "Shoulder"), (side + "ForeArm", side + "Arm"),
              (side + "Hand", side + "ForeArm"), (side + "HandEnd", side + "Hand"),
              (side + "UpLeg", "Hips"), (side + "Leg", side + "UpLeg"), (side + "Foot", side + "Leg"),
              (side + "ToeBase", side + "Foot"), (side + "ToeEnd", side + "ToeBase")]
NAMES = [b for b, _ in BONES]
IDX = {n: i for i, n in enumerate(NAMES)}
PARENT = [(-1 if p is None else IDX[p]) for _, p in BONES]

REST_WORLD = np.array([to_game(J[n]) for n in NAMES])             # (nb,3) game space
REST_LOCAL = np.array([REST_WORLD[i] - (REST_WORLD[PARENT[i]] if PARENT[i] >= 0 else 0) for i in range(len(NAMES))])

# ---- skin segments: (bone, start joint, end joint, radius in original units)
SEG = [("Hips", "Hips", "Spine", 8.0), ("Spine", "Spine", "Spine1", 7.5), ("Spine1", "Spine1", "Spine2", 8.0),
       ("Spine2", "Spine2", "Neck", 8.5), ("Neck", "Neck", "Head", 3.2), ("Head", "Head", "HeadTop", 6.0)]
for sd in ("Left", "Right"):
    SEG += [(sd + "Shoulder", sd + "Shoulder", sd + "Arm", 3.0), (sd + "Arm", sd + "Arm", sd + "ForeArm", 3.6),
            (sd + "ForeArm", sd + "ForeArm", sd + "Hand", 3.0), (sd + "Hand", sd + "Hand", sd + "HandEnd", 2.4),
            (sd + "UpLeg", sd + "UpLeg", sd + "Leg", 5.5), (sd + "Leg", sd + "Leg", sd + "Foot", 4.2),
            (sd + "Foot", sd + "Foot", sd + "ToeBase", 3.2), (sd + "ToeBase", sd + "ToeBase", sd + "ToeEnd", 2.2)]

def _seg_dist(P, a, b):
    a = np.asarray(a, float); b = np.asarray(b, float); ab = b - a
    t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)

def skin_weights(Vorig, power=3.0, eps=0.7, topk=4):
    n = len(Vorig); D = np.zeros((n, len(NAMES)))
    W = np.zeros((n, len(NAMES)))
    for bone, a, b, r in SEG:
        d = _seg_dist(Vorig, J[a], J[b])
        W[:, IDX[bone]] = 1.0 / (np.maximum(d - r, 0) + eps) ** power
    # keep top-k
    order = np.argsort(-W, axis=1)[:, :topk]
    out_i = order.astype(np.uint8)
    out_w = np.take_along_axis(W, order, 1)
    out_w /= out_w.sum(1, keepdims=True)
    return out_i, out_w.astype(np.float32)

# ---- math helpers
def rx(a): c, s = np.cos(a), np.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def ry(a): c, s = np.cos(a), np.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def rz(a): c, s = np.cos(a), np.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])

def euler_to_R(e):
    """e = (rx, ry, rz) degrees; R = Rx*Ry*Rz  (Z applied first, i.e. three.js 'XYZ')"""
    a, b, c = np.radians(e)
    return rx(a) @ ry(b) @ rz(c)

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

def fk(eulers, hips_off=(0, 0, 0)):
    """eulers: dict bone -> (rx,ry,rz) deg. returns world rotations (nb,3,3) and positions (nb,3)."""
    nb = len(NAMES); R = np.zeros((nb, 3, 3)); P = np.zeros((nb, 3))
    for i, nm in enumerate(NAMES):
        Rl = euler_to_R(eulers.get(nm, (0, 0, 0)))
        p = PARENT[i]
        loc = REST_LOCAL[i].copy()
        if p < 0:
            R[i] = Rl; P[i] = REST_LOCAL[i] + np.asarray(hips_off)
        else:
            R[i] = R[p] @ Rl; P[i] = P[p] + R[p] @ loc
    return R, P

def skin(Vgame, bi, bw, R, P):
    """linear blend skinning. Vgame (n,3) rest positions, bi/bw (n,4)."""
    out = np.zeros_like(Vgame)
    for k in range(bi.shape[1]):
        b = bi[:, k]; w = bw[:, k][:, None]
        rel = Vgame - REST_WORLD[b]
        out += w * (np.einsum('nij,nj->ni', R[b], rel) + P[b])
    return out
