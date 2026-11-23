"""Pose library for any Rig. Bones have identity rest rotation: rx<0 swings a hanging limb forward,
rx>0 on spine leans forward, rz>0 on LEFT limbs abducts. Arm helper compensates each model's A-pose."""
import numpy as np
from scipy.interpolate import PchipInterpolator

class Poses:
    def __init__(self, rg, style=None):
        self.rg = rg
        st = dict(lean=6, leg_out=5, knee=1.0, guard_fwd=50, guard_elbow=105, shield=False, crouch=0.0)
        st.update(style or {}); self.st = st
        self.G = self.base_guard()

    # ---- helpers
    def arm(self, P, side, fwd=0, out=0, elbow=0, fout=0, twist=0, ftwist=0):
        s = 1 if side == "Left" else -1
        P[side + "Arm"] = (-fwd, twist, s * (out - self.rg.A1[side]))
        P[side + "ForeArm"] = (-elbow, ftwist, s * (fout - self.rg.A2[side]))

    def leg(self, P, side, fwd=0, out=0, knee=0, ankle=None, toe=0):
        s = 1 if side == "Left" else -1
        knee = knee * self.st["knee"]
        P[side + "UpLeg"] = (-fwd, 0, s * out)
        P[side + "Leg"] = (knee, 0, -s * out * 0.6)
        a = -(-fwd + knee) if ankle is None else ankle
        P[side + "Foot"] = (a, 0, 0); P[side + "ToeBase"] = (toe, 0, 0)

    @staticmethod
    def add(a, **d):
        out = dict(a)
        for k, v in d.items(): out[k] = tuple(np.array(out.get(k, (0, 0, 0)), float) + np.array(v, float))
        return out

    @staticmethod
    def merge(a, b, w=1.0):
        out = {}
        for k in set(a) | set(b):
            va = np.array(a.get(k, (0, 0, 0)), float); vb = np.array(b.get(k, (0, 0, 0)), float)
            out[k] = tuple(va + (vb - va) * w)
        return out

    def sample(self, keys, t):
        ts = np.array([k[0] for k in keys]); names = sorted(set().union(*[set(k[1]) for k in keys])); eul = {}
        tc = np.clip(t, ts[0], ts[-1])
        for n in names:
            arr = np.array([k[1].get(n, (0, 0, 0)) for k in keys], float)
            eul[n] = tuple(PchipInterpolator(ts, arr, axis=0)(tc))
        off = PchipInterpolator(ts, np.array([k[2] for k in keys], float), axis=0)(tc)
        return eul, off

    # ---- poses
    def base_guard(self, lean=None):
        st = self.st; lean = st["lean"] if lean is None else lean; P = {}; o = st["leg_out"]; cr = st["crouch"]
        P["Hips"] = (0, 14, 0)
        P["Spine"] = (lean, -4, 0); P["Spine1"] = (lean * .8, -4, 0); P["Spine2"] = (lean * .6, -4, 0)
        P["Neck"] = (-lean * .9, -3, 0); P["Head"] = (-lean * .9 - 4, -3, 0)
        gf, ge = st["guard_fwd"], st["guard_elbow"]
        self.arm(P, "Left", fwd=gf, out=-4, elbow=ge, fout=-8)
        self.arm(P, "Right", fwd=gf + 10, out=-6, elbow=ge + 10, fout=-10)
        self.leg(P, "Left", fwd=18 + cr, out=o, knee=28 + cr)
        self.leg(P, "Right", fwd=-12 + cr * .3, out=o - 1, knee=24 + cr)
        return P

    def punch_wind(self):
        P = self.add(self.G, Hips=(0, -12, 0), Spine=(0, -12, 0), Spine1=(0, -10, 0), Spine2=(0, -8, 0))
        self.arm(P, "Right", fwd=40, out=-8, elbow=135, fout=-10); return P

    def punch_hit(self):
        P = self.add(self.G, Hips=(2, 22, 0), Spine=(4, 18, 0), Spine1=(2, 14, 0), Spine2=(2, 10, 0), Head=(0, -22, 0), Neck=(0, -12, 0))
        self.arm(P, "Right", fwd=88, out=-2, elbow=0, fout=0)
        self.arm(P, "Left", fwd=self.st["guard_fwd"] + 12, out=-8, elbow=self.st["guard_elbow"] + 15, fout=-12)
        self.leg(P, "Left", fwd=26, out=self.st["leg_out"], knee=36); self.leg(P, "Right", fwd=-14, out=self.st["leg_out"] - 1, knee=14)
        return P

    def kick_chamber(self):
        P = self.add(self.G, Spine=(-4, 0, 0), Head=(0, 0, 0))
        self.leg(P, "Right", fwd=75, out=6, knee=100, ankle=-30); self.leg(P, "Left", fwd=2, out=3, knee=14)
        self.arm(P, "Left", fwd=58, out=-6, elbow=118); self.arm(P, "Right", fwd=40, out=-10, elbow=110); return P

    def kick_hit(self):
        P = self.add(self.G, Hips=(0, 4, 0), Spine=(-12, 14, 0), Spine1=(-8, 8, 0), Spine2=(-6, 6, 0), Head=(8, -14, 0))
        self.leg(P, "Right", fwd=88, out=14, knee=6, ankle=-25); self.leg(P, "Left", fwd=0, out=3, knee=22)
        self.arm(P, "Left", fwd=35, out=18, elbow=95); self.arm(P, "Right", fwd=30, out=28, elbow=90); return P

    def heavy_wind(self):
        P = self.add(self.G, Hips=(0, -22, 0), Spine=(10, -20, 0), Spine1=(8, -16, 0), Spine2=(6, -10, 0), Neck=(-8, 0, 0), Head=(-4, 0, 0))
        self.arm(P, "Left", fwd=15, out=40, elbow=125, fout=-10); self.arm(P, "Right", fwd=15, out=40, elbow=125, fout=-10)
        self.leg(P, "Left", fwd=10, out=8, knee=52); self.leg(P, "Right", fwd=-26, out=6, knee=44); return P

    def heavy_hit(self):
        P = self.add(self.G, Hips=(4, 18, 0), Spine=(24, 10, 0), Spine1=(14, 6, 0), Spine2=(8, 4, 0), Neck=(-12, 0, 0), Head=(-12, -10, 0))
        self.arm(P, "Left", fwd=90, out=-4, elbow=4, fout=0); self.arm(P, "Right", fwd=88, out=-4, elbow=8, fout=0)
        self.leg(P, "Left", fwd=42, out=6, knee=60); self.leg(P, "Right", fwd=-30, out=4, knee=8); return P

    def block(self):
        P = self.add(self.G, Spine=(14, 0, 0), Spine1=(8, 0, 0), Spine2=(4, 0, 0), Neck=(-10, 0, 0), Head=(-10, 0, 0))
        self.arm(P, "Left", fwd=70, out=-8, elbow=128, fout=-14, twist=-20); self.arm(P, "Right", fwd=72, out=-10, elbow=132, fout=-14, twist=20)
        self.leg(P, "Left", fwd=14, out=6, knee=44); self.leg(P, "Right", fwd=-10, out=5, knee=40); return P

    def hit(self):
        P = self.add(self.G, Hips=(-4, 6, 0), Spine=(-18, 8, 0), Spine1=(-12, 6, 0), Spine2=(-10, 4, 0), Neck=(8, 4, 0), Head=(-20, 14, 0))
        self.arm(P, "Left", fwd=15, out=30, elbow=60); self.arm(P, "Right", fwd=25, out=34, elbow=70)
        self.leg(P, "Left", fwd=2, out=6, knee=18); self.leg(P, "Right", fwd=-14, out=5, knee=30); return P

    def ko_end(self):
        P = {"Hips": (-90, 0, 0), "Spine": (6, 0, 0), "Spine1": (4, 0, 0), "Head": (-14, 8, 0), "Neck": (-4, 0, 0)}
        self.arm(P, "Left", fwd=-15, out=42, elbow=24); self.arm(P, "Right", fwd=-5, out=55, elbow=10)
        self.leg(P, "Left", fwd=2, out=12, knee=10, ankle=-6); self.leg(P, "Right", fwd=-4, out=18, knee=18, ankle=-4); return P

    def win(self):
        P = self.add(self.G, Hips=(0, 0, 0), Spine=(-8, 0, 0), Spine1=(-6, 0, 0), Spine2=(-6, 0, 0), Neck=(-6, 0, 0), Head=(-10, 0, 0))
        self.arm(P, "Left", fwd=10, out=150, elbow=18); self.arm(P, "Right", fwd=10, out=150, elbow=18)
        self.leg(P, "Left", fwd=4, out=9, knee=6); self.leg(P, "Right", fwd=-2, out=9, knee=6); return P
