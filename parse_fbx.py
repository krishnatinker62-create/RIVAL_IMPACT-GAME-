import numpy as np, re, sys, time
t=time.time()
import sys; f=sys.argv[1] if len(sys.argv)>1 else 'Ashen_Wanderer_Colored.fbx'
def grab(lines_start, key_after):
    pass
txt=open(f,'r').read()
print('read',len(txt),time.time()-t)
def arr(name, start=0):
    i=txt.index(name,start)
    j=txt.index('a:',i)+2
    k=txt.index('}',j)
    return np.fromstring(txt[j:k],sep=',')
V=arr('Vertices: *').reshape(-1,3)
P=arr('PolygonVertexIndex: *').astype(np.int64)
i=txt.index('LayerElementColor: 0')
C=arr('Colors: *',i).reshape(-1,4)
print(V.shape,P.shape,C.shape)
# polygons: negative marks end (~idx)
ends=np.where(P<0)[0]
sizes=np.diff(np.concatenate([[-1],ends]))
print('poly sizes',np.unique(sizes,return_counts=True))
np.save('V.npy',V.astype(np.float32)); np.save('P.npy',P); np.save('C.npy',C.astype(np.float32))
print(V.min(0),V.max(0),time.time()-t)
