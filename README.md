# Rudra auto-rig (Python)
Pipeline that turned `Ashen_Wanderer_Colored.fbx` (static, 2.9M tris, vertex colours) into `models/rudra.glb`.

| file | what it does |
|---|---|
| `parse_fbx.py` | reads the ASCII FBX (vertices, faces, vertex colours) |
| `decimate.py` | vertex-clustering reduction to ~46k tris, extra detail around the head. `python3 decimate.py 0.8` = more detail (58k), `1.0` = lighter (37k) |
| `rig.py` | 27-bone Mixamo-style skeleton (Hips/Spine/Neck/Head/arms/legs/feet) placed from the mesh measurements + distance-based skin weights |
| `anim.py` / `build.py` | procedural poses -> idle, walk, walk_back, block, punch, kick, heavy, hit, ko, win. Edit the `pose_*` functions to restyle moves |

`FIX_COLORS = True` in `build.py` repaints the long back-hair strands (they were filled with skin colour in the FBX) dark. Set it to `False` to keep the file's colours exactly.
Attack clip lengths/hit moments match `ATK` in `main.js` (punch .34s @36%, kick .52s @44%, heavy .78s @52%).
