# 3D Models + Mixamo animations — kaise lagana hai

Game apne aap models ko `models/manifest.json` se uthata hai.
- `characters` khaali hai → game built-in (code wale) models use karta hai.
- Jis character ka FBX/GLB likh diya, uski jagah real model + Mixamo animations chalenge.
- Koi file load na ho to console mein `[models] ...` warning aati hai aur game built-in model par wapas aa jata hai.

## Step 1 — Pehle Mixamo ke ek character se pipeline test karo (10 min)
1. mixamo.com → Adobe account (free) se login.
2. **Characters** tab → koi bhi (jaise "Y Bot") → **Download** → Format: **FBX Binary (.fbx)**, Pose: **T-pose** → file ko `models/ybot.fbx` naam se save karo.
3. **Animations** tab → us character ko select karke ye animations dhoondo. Har ek par **"In Place" tick karo**, phir **Download** → Format **FBX Binary**, Skin **Without Skin**, FPS 30:

| File (models/anims/) | Mixamo mein ye search karo (naam thoda alag ho sakta hai) |
|---|---|
| idle.fbx | Fight Idle / Boxing Idle |
| walk.fbx | Walking (forward) |
| walk_back.fbx | Walking Backwards (optional) |
| punch.fbx | Jab / Cross Punch |
| kick.fbx | Roundhouse Kick / Mma Kick |
| heavy.fbx | Hook Punch / Uppercut / Hurricane Kick |
| block.fbx | Standing Block / Block Idle |
| hit.fbx | Hit Reaction / Head Hit |
| ko.fbx | Dying / Falling Back Death |
| win.fbx | Victory / Victory Idle |

4. `models/manifest.json` mein ek character jodo (id `fighters.js` se aati hai):
```json
"characters": { "arjun": "ybot.fbx" }
```
5. Live Server reload karo. Top par "1 real 3D model loaded" dikhna chahiye aur Arjun ab real model hoga.

## Step 2 — Apne design (character sheet) ko 3D banana
Meri taraf se image se 3D model nahi ban sakta. Ye raasta hai:
1. Har character ki alag, saaf image lo (front view; best result ke liye side/back view bhi).
2. Image-to-3D tool use karo (jaise Tripo, Meshy, Hunyuan3D, Rodin — free tiers hote hain) → model download karo.
3. Agar GLB mila hai to Blender mein import karke **FBX** export karo (Mixamo FBX/OBJ leta hai).
4. Mixamo → **Upload Character** → auto-rigger mein markers (chin, wrists, elbows, knees, groin) lagao → rig hone ke baad **Download** (FBX, T-pose, With Skin).
5. File `models/arjun.fbx` jaisa naam do (textures usi folder mein rakho) aur manifest mein jodo.
6. Animations Step 1 wali hi sab characters par chalti hain (sabka rig Mixamo ka hai).

Dhyaan rakho:
- Mixamo ka auto-rigger insaan jaisi body (haath-pair, pair alag alag, T-pose jaisa) maangta hai. Lambe robes, lion face, tail wale characters mein skin weights kharab ho sakte hain — pehle simple characters (Lee, Jackie, Rika, Xiyou) se shuru karo.
- AI models mein bahut zyada triangles ho sakte hain. 50k se zyada ho to Blender mein decimate kar lo.
- Model ki height game khud adjust karta hai (`tall` value fighters.js mein).

## Attack timing
Animation clip ki length attack ki duration (`ATK` in main.js) ke hisaab se khud speed adjust hoti hai. Agar maar ka moment animation se match na kare to `ATK.punch.hit`, `ATK.kick.hit`, `ATK.heavy.hit` (0 se 1) badlo.

---
## RUDRA (shivansh) — already installed
`models/rudra.glb` is your `Ashen_Wanderer_Colored.fbx`, reduced to ~46k triangles, auto-rigged (27 bones) and animated
(idle, walk, walk_back, block, punch, kick, heavy, hit, ko, win). `manifest.json` points `shivansh` to it.
- Rudra faces the wrong way? set `"rotY": 180` in manifest.json.
- Too big/small? `"scale": 1.1`.
- Want Mixamo animations instead? Put them in `models/anims/` and note: clips embedded in rudra.glb take priority for Rudra; other characters use the shared Mixamo clips.
- Rebuild / restyle moves: see `tools/rudra_autorig/README.md`.

---
## All 6 real-model fighters (auto-rigged GLB with built-in animations)
RUDRA `rudra.glb` · MADHAV `madhav.glb` · BAJRANG `hanuman.glb` · SAMRAT `narsimha.glb` · ARJUNA `arjun.glb` · SAAVI `rani.glb`
(the other 10 fighters still use the built-in code models). Per-model tweaks in `manifest.json`: `"rotY"` (yaw fix), `"scale"`.
Rebuild/restyle: `tools/rudra_autorig/` (Rudra) and `tools/autorig_all/` (the other five).

---
## Added: ALEXA `xiyou.glb` · TAKESHI `sumo.glb` · JAKSAN `danceking.glb` · JACKIE `hao.glb`
Now 10 real-model fighters. Remaining built-in code models: VEER (raghav), KAIZEN (samurai), KLAW (lilong), YUKI, STELLA (kazura), SIRI (rika).

---
## Added: SIRI `rika.glb` · STELLA `kazura.glb` · VEER `raghav.glb`
Now 13 real-model fighters. Still built-in code models: KAIZEN (samurai) and KLAW (lilong).

---
## Added: YUKI `yuki.glb` · KAIZEN `samurai.glb` · KLAW `lilong.glb`
Now **all 16 fighters** use real auto-rigged models. Sources: Violet Lotus Empress (binary FBX + texture), Moonlit Ronin (ASCII FBX), Yellow Dragon Warrior (GLB).
Kaizen's katana and scabbard are rigid props bound to the hips (`rigid` in chars.py). Rebuild: `tools/autorig_all/load3.py` -> `prep.py` -> `dec.py yuki=0.85 samurai=0.75 lilong=0.45` -> `buildx.py yuki samurai lilong`.
If a model faces backwards, set `"rotY": 180` in manifest.json.
