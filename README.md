# Auto-rig for 12 characters (all except RUDRA, see ../rudra_autorig)
Textured models (sumo, danceking) get their embedded texture baked into vertex colours.
| file | purpose |
|---|---|
| `fbxbin.py` / `convert.py` | binary FBX reader -> arrays |
| `dec.py` | decimation (vertex clustering, finer around the head) |
| `chars.py` | **per-character settings**: joint landmarks (shoulders, hands, feet), body thickness `rs`, robe damping `skirt`, optional `style` (lean, leg_out, knee, guard_fwd, guard_elbow, speed) |
| `rigx.py` | 27-bone skeleton + skin weights + forward kinematics |
| `animx.py` | pose library (guard, punch, kick, heavy, block, hit, KO, win) |
| `buildx.py` | bakes idle/walk/walk_back/block/punch/kick/heavy/hit/ko/win and writes the .glb |
To restyle a character, edit its entry in `chars.py` (e.g. `"style": {"lean": 12, "leg_out": 2}`) and rebuild.
