#!/bin/sh
# Rebuilds models/rudra.glb from the original FBX.  Needs: python3, numpy, scipy.
# usage:  sh make_rudra.sh /path/to/Ashen_Wanderer_Colored.fbx
set -e
python3 parse_fbx.py "${1:-Ashen_Wanderer_Colored.fbx}"   # ASCII FBX -> V.npy / P.npy / C.npy
python3 decimate.py 0.9                                   # 2.9M tris -> ~46k tris (smaller number = more detail)
python3 build.py                                          # rig + skin weights + 10 animations -> ../../models/rudra.glb
