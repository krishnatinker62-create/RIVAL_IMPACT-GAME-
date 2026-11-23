import numpy as np, sys
def decimate(V,F,C,cell,head_from=62.0,head_k=2.2):
    V=V.astype(np.float64); W=V.copy(); y=W[:,1]
    W[:,1]=np.where(y>head_from, head_from+(y-head_from)*head_k, y)
    q=np.floor((W-W.min(0))/cell).astype(np.int64)
    key=q[:,0]+q[:,1]*4096+q[:,2]*4096*4096
    uk,inv=np.unique(key,return_inverse=True); n=len(uk)
    cnt=np.bincount(inv,minlength=n).astype(np.float64)
    nv=np.stack([np.bincount(inv,V[:,i],n) for i in range(3)],1)/cnt[:,None]
    nc=np.stack([np.bincount(inv,C[:,i],n) for i in range(3)],1)/cnt[:,None]
    nf=inv[F]; ok=(nf[:,0]!=nf[:,1])&(nf[:,1]!=nf[:,2])&(nf[:,0]!=nf[:,2]); nf=nf[ok]
    s=np.sort(nf,1); fk=s[:,0]*n*n+s[:,1]*n+s[:,2]; _,ui=np.unique(fk,return_index=True); nf=nf[ui]
    used=np.unique(nf); rm=-np.ones(n,np.int64); rm[used]=np.arange(len(used))
    return nv[used].astype(np.float32),nc[used].astype(np.float32),rm[nf].astype(np.int32)
if __name__=="__main__":
    cells=dict(a.split('=') for a in sys.argv[1:])
    for k in ["madhav","hanuman","narsimha","arjun","rani","xiyou","sumo","danceking","hao","rika","kazura","raghav","yuki","samurai","lilong"]:
        import os
        if not os.path.exists(f"{k}_V.npy"): continue
        V=np.load(f"{k}_V.npy");F=np.load(f"{k}_F.npy");C=np.load(f"{k}_C.npy")
        s=75.0/V[:,1].max(); V=V*s     # normalise to height 75 (Y up)
        cell=float(cells.get(k,0.9))
        nv,nc,nf=decimate(V,F.astype(np.int64),C,cell)
        print(k,"scale",round(s,3),"cell",cell,"->",len(nv),"verts",len(nf),"tris","bbox",nv.min(0).round(1),nv.max(0).round(1))
        np.save(f"{k}_dv.npy",nv);np.save(f"{k}_dc.npy",nc);np.save(f"{k}_df.npy",nf)
