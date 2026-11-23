"""Loaders for the 3 new characters -> (V, F, C) arrays (C = linear-agnostic sRGB 0..1 per vertex)."""
import re, json, struct, io, numpy as np
import convert

def ascii_arr(t, name, dtype):
    m = re.search(r'\b%s:\s*\*(\d+)\s*\{\s*a:\s*([^}]*)\}' % name, t)
    n = int(m.group(1)); a = np.fromstring(m.group(2).replace('\n', ' '), sep=',', dtype=dtype) if False else np.array(m.group(2).replace('\n',' ').replace(' ','').strip(',').split(','), dtype=dtype)
    assert len(a) == n, (name, len(a), n); return a

def load_ascii_fbx(path):
    t = open(path, 'r', errors='replace').read()
    V = ascii_arr(t, 'Vertices', np.float64).reshape(-1, 3).astype(np.float32)
    P = ascii_arr(t, 'PolygonVertexIndex', np.int64)
    ends = np.where(P < 0)[0]; sizes = np.diff(np.r_[-1, ends]); print('poly sizes', np.unique(sizes, return_counts=True))
    cv = np.where(P < 0, ~P, P)
    assert (sizes == 3).all(); F = cv.reshape(-1, 3)
    pal = ascii_arr(t, 'Colors', np.float64).reshape(-1, 4)[:, :3]
    ci = ascii_arr(t, 'ColorIndex', np.int64); assert len(ci) == len(F)
    fc = pal[ci]                                   # per-face colour
    n = len(V); C = np.zeros((n, 3)); cnt = np.zeros(n)
    for j in range(3):
        for c in range(3): C[:, c] += np.bincount(F[:, j], fc[:, c], n)
        cnt += np.bincount(F[:, j], minlength=n)
    C /= np.maximum(cnt, 1)[:, None]
    return V, F, C.astype(np.float32)

def load_glb(path):
    b = open(path, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl])
    off = 20 + jl; bl = struct.unpack('<I', b[off:off + 4])[0]; bin_ = b[off + 8:off + 8 + bl]
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
        dt = {5125: '<u4', 5126: '<f4', 5121: 'u1', 5123: '<u2'}[a['componentType']]
        nc = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
        s = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.frombuffer(bin_, dtype=dt, count=a['count'] * nc, offset=s).reshape(-1, nc), a
    p = j['meshes'][0]['primitives'][0]['attributes']
    V = acc(p['POSITION'])[0].astype(np.float32); F = acc(j['meshes'][0]['primitives'][0]['indices'])[0].reshape(-1, 3).astype(np.int64)
    c, a = acc(p['COLOR_0']); C = c[:, :3].astype(np.float32) / (255.0 if a.get('normalized') else 1.0)
    return V, F, C

if __name__ == '__main__':
    U = '/mnt/user-data/uploads/'
    for k, fn, ld in (('samurai', 'Moonlit_Ronin_Colored.fbx', load_ascii_fbx), ('lilong', 'Yellow_Dragon_Warrior_colored.glb', load_glb),
                      ('yuki', 'Meshy_AI_Violet_Lotus_Empress_1112120831_texture.fbx', convert.load)):
        V, F, C = ld(U + fn); print(k, V.shape, F.shape, C.shape, 'bbox', V.min(0).round(3), V.max(0).round(3), 'col', C.mean(0).round(2))
        np.save(f'{k}_V.npy', V); np.save(f'{k}_F.npy', F.astype(np.int32)); np.save(f'{k}_C.npy', C)
