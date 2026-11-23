"""Procedural fight animations for the Rudra rig. All bones have identity rest rotation, so Euler angles are
about world axes of the parent frame: +X = character's left, +Y up, +Z forward.
rx<0 swings a hanging limb forward; rx>0 on spine leans forward; rz>0 on LEFT limbs abducts (outward)."""
import numpy as np
from scipy.interpolate import PchipInterpolator
import rig

A1, A2 = 17.5, 16.5        # rest outward angles (upper arm / forearm) of the A-pose, degrees
FOOT_JOINTS = [rig.IDX[n] for n in ("LeftFoot", "RightFoot", "LeftToeBase", "RightToeBase", "LeftToeEnd", "RightToeEnd")]
REST_FOOT_Y = min(rig.REST_WORLD[i][1] for i in FOOT_JOINTS)

def sgn(side): return 1 if side == "Left" else -1

def arm(P, side, fwd=0, out=0, elbow=0, fout=0, twist=0, ftwist=0):
    """fwd: swing upper arm forward (deg), out: extra abduction from vertical, elbow: flex (deg),
    fout: forearm extra outward, twist: upper-arm roll. A-pose offsets are compensated."""
    s = sgn(side)
    P[side + "Arm"] = (-fwd, twist, s * (out - A1))
    P[side + "ForeArm"] = (-elbow, ftwist, s * (fout - A2))

def leg(P, side, fwd=0, out=0, knee=0, ankle=None, toe=0):
    s = sgn(side)
    P[side + "UpLeg"] = (-fwd, 0, s * out)
    P[side + "Leg"] = (knee, 0, -s * out * 0.6)
    a = -(-fwd + knee) if ankle is None else ankle     # keep foot flat by default
    P[side + "Foot"] = (a, 0, 0)
    P[side + "ToeBase"] = (toe, 0, 0)

def base_guard(lean=6):
    """orthodox fighting guard: left foot/hand forward"""
    P = {}
    P["Hips"] = (0, 14, 0)
    P["Spine"] = (lean, -4, 0); P["Spine1"] = (lean * .8, -4, 0); P["Spine2"] = (lean * .6, -4, 0)
    P["Neck"] = (-lean * .9, -3, 0); P["Head"] = (-lean * .9 - 4, -3, 0)
    arm(P, "Left", fwd=50, out=-4, elbow=105, fout=-8)
    arm(P, "Right", fwd=60, out=-6, elbow=115, fout=-10)
    leg(P, "Left", fwd=18, out=5, knee=28)
    leg(P, "Right", fwd=-12, out=4, knee=24)
    return P

def merge(a, b, w=1.0):
    """blend pose b over pose a (euler lerp)."""
    out = {}
    for k in set(a) | set(b):
        va = np.array(a.get(k, (0, 0, 0)), float); vb = np.array(b.get(k, (0, 0, 0)), float)
        out[k] = tuple(va + (vb - va) * w)
    return out

def add(a, **deltas):
    out = dict(a)
    for k, d in deltas.items():
        k = k.replace("__", "")
        out[k] = tuple(np.array(out.get(k, (0, 0, 0)), float) + np.array(d, float))
    return out

def ground_lock(eul, off=(0, 0, 0), vertex_min=None):
    R, P = rig.fk(eul, (off[0], 0, off[2]))
    cur = min(P[i][1] for i in FOOT_JOINTS)
    return (off[0], REST_FOOT_Y - cur + off[1] * 0, off[2])

def sample(keys, t, times=None):
    """keys: list of (time, pose, hips_off). returns eulers dict & hips off at time t (pchip per channel)."""
    ts = np.array([k[0] for k in keys])
    names = sorted(set().union(*[set(k[1]) for k in keys]))
    eul = {}
    for n in names:
        arr = np.array([k[1].get(n, (0, 0, 0)) for k in keys], float)
        eul[n] = tuple(PchipInterpolator(ts, arr, axis=0)(np.clip(t, ts[0], ts[-1])))
    off = PchipInterpolator(ts, np.array([k[2] for k in keys], float), axis=0)(np.clip(t, ts[0], ts[-1]))
    return eul, off

# ----------------------------------------------------------------------------- poses
G = base_guard()

def pose_punch_wind():
    P = add(G, Hips=(0, -12, 0), Spine=(0, -12, 0), Spine1=(0, -10, 0), Spine2=(0, -8, 0))
    arm(P, "Right", fwd=40, out=-8, elbow=135, fout=-10)
    return P

def pose_punch_hit():                              # right cross
    P = add(G, Hips=(2, 22, 0), Spine=(4, 18, 0), Spine1=(2, 14, 0), Spine2=(2, 10, 0), Head=(0, -22, 0), Neck=(0, -12, 0))
    arm(P, "Right", fwd=88, out=-2, elbow=0, fout=-A2 + 16)
    arm(P, "Left", fwd=62, out=-8, elbow=120, fout=-12)
    leg(P, "Left", fwd=26, out=5, knee=36); leg(P, "Right", fwd=-14, out=4, knee=14)
    return P

def pose_kick_chamber():
    P = add(G, Spine=(-4, 0, 0), Head=(0, 0, 0))
    leg(P, "Right", fwd=75, out=6, knee=100, ankle=-30)
    leg(P, "Left", fwd=2, out=3, knee=14)
    arm(P, "Left", fwd=58, out=-6, elbow=118); arm(P, "Right", fwd=40, out=-10, elbow=110)
    return P

def pose_kick_hit():                               # right front-roundhouse
    P = add(G, Hips=(0, 4, 0), Spine=(-12, 14, 0), Spine1=(-8, 8, 0), Spine2=(-6, 6, 0), Head=(8, -14, 0))
    leg(P, "Right", fwd=88, out=14, knee=6, ankle=-25)
    leg(P, "Left", fwd=0, out=3, knee=22)
    arm(P, "Left", fwd=35, out=18, elbow=95); arm(P, "Right", fwd=30, out=28, elbow=90)
    return P

def pose_heavy_wind():
    P = add(G, Hips=(0, -22, 0), Spine=(10, -20, 0), Spine1=(8, -16, 0), Spine2=(6, -10, 0), Neck=(-8, 0, 0), Head=(-4, 0, 0))
    arm(P, "Left", fwd=15, out=40, elbow=125, fout=-10); arm(P, "Right", fwd=15, out=40, elbow=125, fout=-10)
    leg(P, "Left", fwd=10, out=8, knee=52); leg(P, "Right", fwd=-26, out=6, knee=44)
    return P

def pose_heavy_hit():                              # two-handed palm strike lunge
    P = add(G, Hips=(4, 18, 0), Spine=(24, 10, 0), Spine1=(14, 6, 0), Spine2=(8, 4, 0), Neck=(-12, 0, 0), Head=(-12, -10, 0))
    arm(P, "Left", fwd=90, out=-4, elbow=4, fout=-A2 + 14); arm(P, "Right", fwd=88, out=-4, elbow=8, fout=-A2 + 14)
    leg(P, "Left", fwd=42, out=6, knee=60); leg(P, "Right", fwd=-30, out=4, knee=8)
    return P

def pose_block():
    P = add(G, Spine=(14, 0, 0), Spine1=(8, 0, 0), Spine2=(4, 0, 0), Neck=(-10, 0, 0), Head=(-10, 0, 0))
    arm(P, "Left", fwd=70, out=-8, elbow=128, fout=-14, twist=-20); arm(P, "Right", fwd=72, out=-10, elbow=132, fout=-14, twist=20)
    leg(P, "Left", fwd=14, out=6, knee=44); leg(P, "Right", fwd=-10, out=5, knee=40)
    return P

def pose_hit():
    P = add(G, Hips=(-4, 6, 0), Spine=(-18, 8, 0), Spine1=(-12, 6, 0), Spine2=(-10, 4, 0), Neck=(8, 4, 0), Head=(-20, 14, 0))
    arm(P, "Left", fwd=15, out=30, elbow=60); arm(P, "Right", fwd=25, out=34, elbow=70)
    leg(P, "Left", fwd=2, out=6, knee=18); leg(P, "Right", fwd=-14, out=5, knee=30)
    return P

def pose_ko_end():
    P = {"Hips": (-90, 0, 0), "Spine": (6, 0, 0), "Spine1": (4, 0, 0), "Head": (-14, 8, 0), "Neck": (-4, 0, 0)}
    arm(P, "Left", fwd=-15, out=42, elbow=24); arm(P, "Right", fwd=-5, out=55, elbow=10)
    leg(P, "Left", fwd=2, out=12, knee=10, ankle=-6); leg(P, "Right", fwd=-4, out=18, knee=18, ankle=-4)
    return P

def pose_win():
    P = add(G, Hips=(0, 0, 0), Spine=(-8, 0, 0), Spine1=(-6, 0, 0), Spine2=(-6, 0, 0), Neck=(-6, 0, 0), Head=(-10, 0, 0))
    arm(P, "Left", fwd=10, out=150, elbow=18); arm(P, "Right", fwd=10, out=150, elbow=18)
    leg(P, "Left", fwd=4, out=9, knee=6); leg(P, "Right", fwd=-2, out=9, knee=6)
    return P
