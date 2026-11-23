import fbxbin, numpy as np, sys, io
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
NAMES = {"madhav": "Peacock_Wanderer_colored", "hanuman": "Golden_Monkey_Sage_colored", "narsimha": "Aurelion_the_Lionheart_coloured",
         "arjun": "Divine_Warrior", "rani": "Crimson_Shieldmaiden", "xiyou": "Midnight_Streetwave", "sumo": "IronSumoSovereign",
         "danceking": "DreadNomad", "hao": "Golden_Dragon_Fist_coloured",
         "rika": "Crimson_Blossom_Sentinel_1", "kazura": "Crimson_Lotus_Sovereign", "raghav": "Crimson_Titan_coloured"}
def load(path):
    """binary FBX -> vertices, triangles, per-vertex colour (vertex-colour layer, or texture baked through the UVs)"""
    top = fbxbin.parse(path); obj = [t for t in top if t[0] == 'Objects'][0]
    g = [k for k in obj[2] if k[0] == 'Geometry'][0]
    V = fbxbin.find(g, 'Vertices')[0][1][0].reshape(-1, 3).astype(np.float32)
    P = fbxbin.find(g, 'PolygonVertexIndex')[0][1][0].astype(np.int64)
    ends = np.where(P < 0)[0]; assert (np.diff(np.r_[-1, ends]) == 3).all()
    cv = np.where(P < 0, ~P, P); F = cv.reshape(-1, 3)
    le = [k for k in g[2] if k[0] == 'LayerElementColor']
    if le:
        C = fbxbin.find(le[0], 'Colors')[0][1][0].reshape(-1, 4)[:, :3].astype(np.float32); return V, F, C
    lu = [k for k in g[2] if k[0] == 'LayerElementUV'][0]
    UV = fbxbin.find(lu, 'UV')[0][1][0].reshape(-1, 2); UI = fbxbin.find(lu, 'UVIndex')[0][1][0]
    vid = [k for k in obj[2] if k[0] == 'Video'][0]; raw = fbxbin.find(vid, 'Content')[0][1][0]
    im = np.asarray(Image.open(io.BytesIO(raw)).convert("RGB"), dtype=np.float32) / 255.0; H, W, _ = im.shape
    uv = UV[UI]; px = np.clip((uv[:, 0] % 1.0) * (W - 1), 0, W - 1).astype(int); py = np.clip((1 - (uv[:, 1] % 1.0)) * (H - 1), 0, H - 1).astype(int)
    cc = im[py, px]; n = len(V); cnt = np.bincount(cv, minlength=n).astype(np.float32); C = np.zeros((n, 3), np.float32)
    for i in range(3): C[:, i] = np.bincount(cv, cc[:, i], n) / np.maximum(cnt, 1)
    return V, F, C
if __name__ == "__main__":
    for k, f in NAMES.items():
        try: V, F, C = load(f"{sys.argv[1]}/{f}.fbx")
        except FileNotFoundError: print("skip (missing)", f); continue
        print(k, len(V), len(F)); np.save(f"{k}_V.npy", V); np.save(f"{k}_F.npy", F.astype(np.int32)); np.save(f"{k}_C.npy", C)
