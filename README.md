# RIVAL IMPACT — v14 · RUDRA LOCK + REALISM PASS

## Rudra is locked
- RUDRA still appears in the character-select roster (greyed, padlock + "LOCKED"), but cannot be chosen in any mode (Arcade, Team, Tekken Force, VS, Practice).
- He is never picked as an ally/enemy/dummy. He appears **only in the Stage 7 Rudra trial** of Arcade Mode.
- Code: `locked:true` on his entry in `fighters.js`; guards in `main.js` (`selConfirm`, `firstOpen`, campaign pool).

## Realism pass (`realism.js`, hooked from `stages.js -> buildStage`)
- Animated cloud skies (Jungle, Neon District, Sakura, Frozen, Colosseum).
- Normal maps baked from every stage texture (stone, sand, wood, ice get real surface relief). Off on LOW graphics.
- Floor wear decals: scuffs, cracks, stains, footprints, petals, frost, wet mirror puddles.
- Per-stage environment detail: truss + light rigs, grass / ferns / reeds, habitat base, rooftop AC units + signs, basalt columns, stone lanterns + railing, snow pines + icicles + ice crystals, fluted columns + cornice.
- Brighter daylight grade on Frozen Sanctum and Sand Colosseum.
- Every addition is wrapped in try/catch: if one fails, the stage still loads (see the browser console for "[realism]").
- Tuning: edit the `D[n]` functions in `realism.js`, sky colours in `SKIES`, normal strength in `upgradeMaterials`.

# RIVAL IMPACT — v13 STORY & BATTLE UPDATE

## New modes
- **Team Battle (3 vs 3 relay):** choose a leader; two allies and three random opponents are assigned. Fighters battle one at a time in a three-match relay.
- **Tekken Force:** five black-armoured soldier waves followed by a random enlarged final challenger.
- **Arcade rework:** six random opponents, the seventh-stage Rudra trial, and a final giant boss.
- **Rudra trial:** hold BLOCK (Left Shift / Space or touch BLOCK) and do not attack. Keep blocking until Divya Prakash reaches 100%; attacking is disabled and cannot defeat Rudra.

## Notes
- The update reuses the supplied 16 character models and their existing rigged animation clips. Soldier visuals are dark-tinted versions of existing roster models; the final boss is an enlarged, red-tinted roster model with added horn geometry and the existing fighter animation system.
- Team Battle is a relay format (one fighter active at a time), not simultaneous six-character combat. Tekken Force is a sequence of soldier encounters, not a multi-enemy crowd brawler.
- Existing VS, Practice, graphics settings, stages, and touch controls remain available.

## Run
Extract the ZIP and serve `RIVAL_IMPACT/index.html` with a local web server (for example VS Code Live Server). The game imports Three.js from jsDelivr, so an internet connection is needed.

# v12 — FINAL VISUAL + CHARACTER PASS

- Mobile-safe rendering: sensible MEDIUM default on phones, pixel-budget based DPR cap, and reduced multisampling/shadow cost to avoid GPU-memory black screens.
- HIGH keeps the detailed models, richer arena crowd and stage detail while using a safer 2048 shadow map and capped render resolution.
- Fixed the quality auto-downgrade path so a stage is rebuilt when graphics are reduced; the old silent downgrade could leave expensive stage assets active.
- Added WebGL context-loss recovery messaging and renderer/post-process reinitialization after restoration.
- Audited all 16 GLB files: each contains the complete 10-clip set (idle, walk, walk_back, block, punch, kick, heavy, hit, ko, win), with vertex-coloured skinned meshes. Existing model assets and animation clips are preserved.

# RIVAL IMPACT — v10 (T6-style presentation pass)

## v10 changes
- Fight camera: closer, lower, slightly longer lens (fighters fill ~65% of the screen height instead of ~54%). Tune in `main.js` -> `updateCamera` (`dist`, `h`, `fov`).
- Fighters: cleaner colours on the dense models (light colour smoothing 0.45, grain mostly off), glossier PBR (roughness .64, env .55), stronger rim + fill light.
- Stages: cheap translucent light cones / god-rays / lasers toned down (stages.js `beamM` opacities, `shafts` default).
- Sharpen pass 0.3 -> 0.22 (it was emphasising colour noise). HUD respects phone notches (safe-area).

# v9 (hi-detail fighters: SAMRAT · VEER · JACKIE · BAJRANG)

## v9 changes
- Rebuilt **narsimha (SAMRAT), raghav (VEER), hao (JACKIE), hanuman (BAJRANG)** straight from the original FBX files with ~5x more vertices
  (57k-82k verts instead of ~11k-17k): sharper faces, costume detail, cleaner silhouettes. Colour smoothing is skipped on these dense meshes.
- Old light versions are kept as `models/<id>_lo.glb` and used automatically on LOW graphics / after the low-FPS auto-downgrade (`setLowDetail`).
- `tools/autorig_all/buildx.py`: uint32 indices for >65k verts, 8-bit skin weights. Rebuild with a finer cell: `python3 dec.py <id>=0.4 && python3 buildx.py <id>`.
- Slightly punchier contrast grade. The other 12 fighters still use the old light models: send their FBX files to upgrade them the same way.

# v8 (UI/UX overhaul · touch controls · stage detail · sharpen)

## v8 changes
- `ui_v8.css`: new glass UI layer, smoother motion, better HUD, phone-landscape fixes (menu no longer overlaps).
- `touch.js`: on-screen controls for phones (move, side-step, punch, kick, heavy, block, impact) + BACK / CONFIRM buttons. Auto-enabled on touch devices.
- `detail.js`: procedural grain (colour + roughness) on every stage material (off on LOW graphics).
- `fx.js`: sharpen pass in the final grade shader; `main.js`: portraits 256x320.
- `models.js`: lighter colour smoothing (0.2) so faces stay crisper.

# v7 (Character detail + calmer lighting)

## v7 changes
- **Characters** (`models.js`): vertex-colour smoothing (removes blotchy speckle), albedo lift, new PBR material (low env reflection),
  fine procedural cloth/skin grain + local contrast + soft rim. Applied to all 16 models automatically at load.
- **Lighting**: exposure, bloom, grain, vignette, saturation reduced; stage lights, hit flash and colored point lights toned down;
  neutral key/fill on fighters (rim is only 40% stage colour); menu/select spotlights softened; Frozen Sanctum fog/mist white-out fixed.
- Tuning: `models.js` -> `smoothColors(g,.35)` (blur amount), `detailMaterial` (roughness/grain); `fighters.js` -> `STAGES[i].grade.exp` (brightness);
  `main.js` -> `PRESETS[].bloom`, `heroRim` / `heroFill` intensity.

# (older notes below)
# RIVAL IMPACT — v5 (New Stages · UI · Lighting)

## Run
1. Zip extract karo → `RIVAL_IMPACT` folder VS Code mein kholo.
2. `index.html` par right-click → **Open with Live Server** (internet chahiye: Three.js + fonts CDN se aate hain).
3. Game ab **PRESS START** screen se shuru hota hai (isi se sound bhi enable hota hai).
4. Problem aaye to DevTools → Console dekho; errors screen par red box mein bhi aate hain.

## v5 mein naya

### 1. Teen naye stages (ab total 8)
| Stage | Look | Hazard |
|---|---|---|
| **SAKURA DOJO** (Courtyard · Sunset) | lakdi ka dojo deck, cherry blossom ped, lanterns, torii gate, girti petals, low backlit sun | **Blossom Gust** — hawa dono fighters ko side mein dhakelti hai (damage nahi) |
| **FROZEN SANCTUM** (Snow Peak · Blizzard) | rune-wala icy platform, pillars + prayer flags, pagoda, aurora, snowstorm, ground mist, braziers vs ice crystals | **Ice Shards** — floor se barf ke spikes |
| **SAND COLOSSEUM** (Ancient Arena · High Noon) | sandstone wall + arches, tiers with crowd, colossal statues, banners, dust, tez dhoop | **Sand Pillar** — ret se pillar fatta hai |

Arcade ladder ab 7 fights = 7 **alag** stages, boss hamesha MAGMA CORE. Naye stages ka music bhi alag hai.

### 2. UI / Presentation
- **PRESS START** title screen aur logo animation, 3D attract-mode background.
- **Difficulty select** (Arcade): EASY (5 credits) / NORMAL (3) / HARD (2 credits, x1.25 score).
- **VS screen**: har fighter ka country code + quote + arena ka naam.
- **IMPACT meter** (bottom): hits dene/khane se bharta hai. Full hone par **H** (P2: `;`) / pad **Select ya stick-click** → 7 sec ke liye +30% damage, +12% speed, golden aura. CPU bhi use karta hai.
- **Floating damage numbers**, **COUNTER HIT** (enemy ke attack startup mein hit = +25% damage), BLOCK numbers.
- **Result stats**: hits, accuracy, max combo, damage dealt/taken, counter hits.
- **Pause → MOVE LIST** (damage/speed/reach + tips).
- **Alt color**: character select mein **C** (pad: Y) dabao.
- **Options**: MUSIC / SFX **volume sliders (0–10)**, SCREEN SHAKE (0–100%), FULLSCREEN, hazards, announcer, graphics. Sab keyboard/pad se chalta hai.
- **Controller glyphs**: pad use karo to hints A/B ya ✕/◯ dikhte hain (Xbox / PlayStation detect hota hai).
- Loading tips.

### 3. Lighting aur detailing
- **Per-stage color grading** (tint / saturation / contrast / exposure) — har stage ka alag mood, smooth blend.
- **Volumetric light shafts** (god rays) — naye stages + purane 5 stages mein bhi.
- **Hit light**: har hit par fighters par chhota dynamic flash (colour = hit type; block = neela).
- Procedural textures + bump maps (wood planks, icy runes, rippled sand, sandstone blocks, raked gravel).
- Particles: petals, snow, dust; flickering torches/lanterns/braziers; waving flags/banners; aurora; ground mist.
- IMPACT par screen flash; replay mein desaturated look.

## Controls
| | Player 1 | Player 2 (VS) | Gamepad |
|---|---|---|---|
| Move | A / D | ← / → | Left stick / D-Pad |
| Side-step | W / S, Q / E | ↑ / ↓ | Stick ↑↓, Right stick ↑↓ (fast) |
| Punch / Kick / Heavy | J / K / L | , / . / / | X(▢) / A(✕) / Y(△) |
| Block | Shift / Space | Right Shift | LB, RB, LT, RT, B(◯) |
| IMPACT | H | ; | Select / stick-click |
| Pause | Esc / P | | Start |

## Files
`main.js` (flow, combat, AI, camera, replay, UI logic) · `stages.js` (8 stages + light shafts) · `hazards.js` · `audio.js` · `arcade.js` (ladder, difficulty LEVELS, score) · `fighters.js` (roster, stages+grade, endings, quotes) · `gamepad.js` · `fx.js` (post-processing) · `characters.js` · `models.js` · `index.html` · `style.css`

## Testing shortcuts
`index.html?debug` kholo, console mein:
- `__RI.skipToBoss()` · `__RI.winFight()` · `__RI.fill()` (IMPACT meter full)

## Tuning
- Stage look: `fighters.js` → `STAGES[i].grade` (sat / tint / con / exp)
- Hazards: `hazards.js` → `HAZ` (damage, timing, gap)
- Difficulty: `arcade.js` → `LEVELS`, `diffFor()`, `aiParams()`
- IMPACT: `main.js` → `activateImpact`, meter gain in `resolveHit`


## Graphics tuning (v11 visual pass)
- HIGH preset now targets up to 2.0 device pixel ratio, 3072px shadow maps, stronger crowd/arena detail and 4x post-process MSAA where supported.
- Reduced bloom and film grain, added a clearer sharpening pass, and explicitly uses sRGB output to improve edge and colour readability.
- HIGH is GPU-intensive. On phones, the built-in low-FPS fallback may reduce the preset. Use HIGH on a capable device; MEDIUM is the balanced mobile setting.
- This is a rendering/lighting upgrade, not a replacement of character meshes or animation assets. Tekken 6-level character fidelity requires higher-detail authored models, textures, rigs and animations; rendering settings alone cannot create missing geometry or texture detail.
