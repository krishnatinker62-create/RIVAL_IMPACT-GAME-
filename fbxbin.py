import struct, zlib, numpy as np
def parse(path):
    b=open(path,'rb').read(); ver=struct.unpack('<I',b[23:27])[0]; big=ver>=7500
    pos=27; n=len(b)
    def rec(pos):
        if big: end,np_,pl=struct.unpack('<QQQ',b[pos:pos+24]); h=24
        else: end,np_,pl=struct.unpack('<III',b[pos:pos+12]); h=12
        nl=b[pos+h]; 
        if end==0: return None,pos+h+1
        name=b[pos+h+1:pos+h+1+nl].decode('latin1'); p=pos+h+1+nl; props=[]
        for _ in range(np_):
            t=chr(b[p]); p+=1
            if t=='Y': props.append(struct.unpack('<h',b[p:p+2])[0]); p+=2
            elif t=='C': props.append(bool(b[p])); p+=1
            elif t=='I': props.append(struct.unpack('<i',b[p:p+4])[0]); p+=4
            elif t=='F': props.append(struct.unpack('<f',b[p:p+4])[0]); p+=4
            elif t=='D': props.append(struct.unpack('<d',b[p:p+8])[0]); p+=8
            elif t=='L': props.append(struct.unpack('<q',b[p:p+8])[0]); p+=8
            elif t in 'fdlib':
                ln,enc,cl=struct.unpack('<III',b[p:p+12]); p+=12
                dt={'f':'<f4','d':'<f8','l':'<i8','i':'<i4','b':'?'}[t]
                raw=b[p:p+cl]; p+=cl
                if enc==1: raw=zlib.decompress(raw)
                props.append(np.frombuffer(raw,dtype=dt,count=ln))
            elif t=='S': ln=struct.unpack('<I',b[p:p+4])[0]; props.append(b[p+4:p+4+ln].decode('latin1')); p+=4+ln
            elif t=='R': ln=struct.unpack('<I',b[p:p+4])[0]; props.append(b[p+4:p+4+ln]); p+=4+ln
        kids=[]
        while p<end:
            k,p2=rec(p)
            if k is None: p=p2; break
            kids.append(k); p=p2
        return (name,props,kids),end
    top=[]
    while pos<n-30:
        r,pos2=rec(pos)
        if r is None: break
        top.append(r); pos=pos2
    return top
def find(node,name): return [k for k in node[2] if k[0]==name]
