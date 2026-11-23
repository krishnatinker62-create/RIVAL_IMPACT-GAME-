import numpy as np, time, sys
V=np.load('V.npy').astype(np.float64); P=np.load('P.npy'); C=np.load('C.npy')[:,:3]
ends=np.where(P<0)[0]; F=P.copy(); F[ends]=~F[ends]; F=F.reshape(-1,3)
def warp(V):
    W=V.copy(); z=W[:,2]
    W[:,2]=np.where(z>62, 62+(z-62)*2.2, z)   # finer cells around head/face
    return W
def cluster(cell):
    W=warp(V)
    q=np.floor((W-W.min(0))/cell).astype(np.int64)
    key=q[:,0]+q[:,1]*4096+q[:,2]*4096*4096
    uk,inv=np.unique(key,return_inverse=True); n=len(uk)
    cnt=np.bincount(inv,minlength=n).astype(np.float64)
    nv=np.stack([np.bincount(inv,V[:,i],n) for i in range(3)],1)/cnt[:,None]
    nc=np.stack([np.bincount(inv,C[:,i],n) for i in range(3)],1)/cnt[:,None]
    nf=inv[F]; ok=(nf[:,0]!=nf[:,1])&(nf[:,1]!=nf[:,2])&(nf[:,0]!=nf[:,2]); nf=nf[ok]
    s=np.sort(nf,1); fk=s[:,0]*n*n+s[:,1]*n+s[:,2]; _,ui=np.unique(fk,return_index=True); nf=nf[ui]
    # drop unused verts
    used=np.unique(nf); remap=-np.ones(n,np.int64); remap[used]=np.arange(len(used))
    return nv[used],nc[used],remap[nf]
if __name__=='__main__':
    cell=float(sys.argv[1]) if len(sys.argv)>1 else 0.9; nv,nc,nf=cluster(cell)
    print(cell,len(nv),'verts',len(nf),'tris')
    np.save('dv.npy',nv.astype(np.float32)); np.save('dc.npy',nc.astype(np.float32)); np.save('df.npy',nf.astype(np.int32))
