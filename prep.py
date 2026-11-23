import numpy as np
# raw (Z-up, facing -Y)  ->  game space (Y-up, facing +Z, character-left=+X), feet on y=0, height 75
for k in ("samurai","lilong","yuki"):
    V=np.load(f"{k}_V.npy").astype(np.float64)
    W=np.stack([V[:,0], V[:,2], -V[:,1]],1)
    W[:,1]-=W[:,1].min()
    np.save(f"{k}_V.npy",W.astype(np.float32)); print(k,"H",W[:,1].max().round(3),"x",W[:,0].min().round(3),W[:,0].max().round(3),"z",W[:,2].min().round(3),W[:,2].max().round(3))
