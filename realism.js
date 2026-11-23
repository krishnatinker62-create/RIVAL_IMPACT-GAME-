/* =====================================================================
   v14 REALISM PASS  (Tekken-6 style stage detailing)
   Runs after every stage is built (see stages.js -> buildStage).
   Everything here is additive and wrapped in try/catch, so a failure in one
   detail can never break a stage.

   1. Real cloud skies (procedural, animated) for outdoor stages
   2. Normal maps baked from every stage texture (stone / sand / wood / ice get real surface relief)
   3. Floor wear decals: scuffs, cracks, stains, footprints, puddles
   4. Per-stage environment detail: columns, torii gate, lanterns, AC units, pines, basalt, habitats ...
   5. Scatter props (rocks, pebbles, grass, reeds, snow drifts)
   Quality scaling: LOW graphics skips the heavy parts.
   ===================================================================== */
import * as THREE from "three";
import {glowTex} from "./fx.js";

const AD=THREE.AdditiveBlending,V=THREE.Vector3;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const cv=(w,h,fn)=>{const c=document.createElement("canvas");c.width=w;c.height=h;fn(c.getContext("2d"),w,h);return c;};
const tex=(c,rep,srgb=true)=>{const t=new THREE.CanvasTexture(c);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);t.anisotropy=8;return t;};
const STD=(c,r=.8,m=0,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,...o});
const glowM=(c,i=2)=>new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i)});
const safe=(name,fn)=>{try{return fn();}catch(e){console.warn("[realism] "+name+" skipped:",e);}};
const lvlOf=Q=>Q.sres<=512?0:(Q.sres<=1536?1:2);
const add=(g,geo,mat,x=0,y=0,z=0,o={})=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(o.cast)m.castShadow=true;m.receiveShadow=o.recv!==false;g.add(m);return m;};

/* small deterministic-ish jitter for rock shapes */
const hsh=(x,y,z,k)=>{const n=Math.sin(x*127.1+y*311.7+z*74.7+k*19.3)*43758.5453;return n-Math.floor(n)-.5;};
const rockGeo=(r,d=1,a=.3)=>{const g=new THREE.IcosahedronGeometry(r,d),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+hsh(x,y,z,1)*a*2;p.setXYZ(i,x*k,y*k*(1+hsh(x,y,z,4)*.3),z*k);}
 g.computeVertexNormals();return g;};

/* ---------- procedural textures ---------- */
function noiseTex(base,cols,n,r0,r1,a,size=512){
 return cv(size,size,(x,w,h)=>{x.fillStyle=base;x.fillRect(0,0,w,h);
  for(let i=0;i<n;i++){x.globalAlpha=rnd(a*.4,a);x.fillStyle=pick(cols);x.beginPath();x.arc(rnd(0,w),rnd(0,h),rnd(r0,r1),0,6.283);x.fill();}
  x.globalAlpha=1;for(let i=0;i<n*3;i++){x.fillStyle=`rgba(0,0,0,${Math.random()*.12})`;x.fillRect(rnd(0,w),rnd(0,h),rnd(1,3),rnd(1,3));}});
}
const rockCv=(base="#5a5750",cols=["#6c685f","#47443e","#7a766b"])=>noiseTex(base,cols,380,3,34,.35);
const grassCv=col=>cv(128,128,(x,w,h)=>{x.clearRect(0,0,w,h);
 for(let i=0;i<22;i++){const bx=rnd(14,114),tipx=bx+rnd(-28,28),th=rnd(28,118);
  x.fillStyle=`hsl(${col[0]+rnd(-12,12)},${col[1]}%,${col[2]+rnd(-10,14)}%)`;x.beginPath();x.moveTo(bx-3,h);x.quadraticCurveTo(bx+(tipx-bx)*.2,h-th*.6,tipx,h-th);x.quadraticCurveTo(bx+(tipx-bx)*.2+3,h-th*.55,bx+3,h);x.fill();}});
const leafCv=()=>cv(128,256,(x,w,h)=>{x.clearRect(0,0,w,h);
 x.strokeStyle="#2b6a2a";x.lineWidth=3;x.beginPath();x.moveTo(64,h);x.quadraticCurveTo(58,h*.5,64,6);x.stroke();
 for(let i=0;i<14;i++){const y=h-18-i*16,L=46-i*2.2;for(const s of[-1,1]){x.fillStyle=`hsl(${112+rnd(-10,12)},${55}%,${22+rnd(0,16)}%)`;x.beginPath();x.moveTo(64,y);x.quadraticCurveTo(64+s*L*.6,y-18,64+s*L,y-6);x.quadraticCurveTo(64+s*L*.55,y-4,64,y);x.fill();}}});
const panelCv=(base,line,win)=>cv(256,256,(x,w,h)=>{x.fillStyle=base;x.fillRect(0,0,w,h);x.strokeStyle=line;x.lineWidth=3;
 for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*64,0);x.lineTo(i*64,h);x.moveTo(0,i*64);x.lineTo(w,i*64);x.stroke();}
 for(let i=0;i<260;i++){x.fillStyle=`rgba(0,0,0,${Math.random()*.2})`;x.fillRect(rnd(0,w),rnd(0,h),rnd(1,6),rnd(1,3));}
 if(win){x.fillStyle=win;for(let i=0;i<4;i++)x.fillRect(rnd(10,200),rnd(10,200),rnd(20,40),rnd(8,14));}});
const flutedCv=()=>cv(256,256,(x,w,h)=>{x.fillStyle="#d9c29a";x.fillRect(0,0,w,h);for(let i=0;i<16;i++){const g=x.createLinearGradient(i*16,0,i*16+16,0);g.addColorStop(0,"rgba(80,55,25,.55)");g.addColorStop(.5,"rgba(255,245,215,.25)");g.addColorStop(1,"rgba(80,55,25,.45)");x.fillStyle=g;x.fillRect(i*16,0,16,h);}
 for(let i=0;i<900;i++){x.fillStyle=`rgba(${Math.random()<.5?"70,45,20":"255,240,205"},${Math.random()*.1})`;x.fillRect(rnd(0,w),rnd(0,h),rnd(1,4),rnd(2,12));}});

/* ---------- 1. cloud sky ---------- */
const SKY_VS="varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}";
const SKY_FS=`uniform vec3 top,mid,bot,lit,shade,sunDir,sunCol;uniform float time,cover;varying vec3 p;
 float hh(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
 float nz(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 q){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*nz(q);q=q*2.03+vec2(7.1,3.7);a*=.5;}return s;}
 void main(){vec3 d=normalize(p);float h=d.y;
  vec3 c=h>0.?mix(mid,top,pow(h,.55)):mix(mid,bot,pow(-h,.5));
  float sd=max(dot(d,normalize(sunDir)),0.);
  c+=sunCol*(pow(sd,5.)*.18);
  if(h>.0&&cover>.01){
   vec2 uv=d.xz/(h+.22)*1.5+vec2(time*.012,time*.004);
   float n=fbm(uv*1.3+fbm(uv*.7)*.9);
   float cl=smoothstep(1.-cover,1.-cover+.32,n);
   float n2=fbm((uv+normalize(sunDir.xz+vec2(.0001))*.09)*1.3+fbm((uv+normalize(sunDir.xz+vec2(.0001))*.09)*.7)*.9);
   float lightK=clamp(.55+(n-n2)*5.5,0.,1.);
   vec3 cc=mix(shade,lit,lightK);
   cc+=sunCol*pow(sd,8.)*.35*cl;
   cl*=smoothstep(.0,.16,h);
   c=mix(c,cc,cl*.96);
  }
  c+=sunCol*(pow(sd,900.)*4.+pow(sd,60.)*.5);
  gl_FragColor=vec4(c,1.);}`;
function addSky(g,cfg,ups){
 g.children.forEach(o=>{if(o.isMesh&&o.geometry?.parameters?.radius===240&&o.material?.isShaderMaterial&&o.material.side===THREE.BackSide)o.visible=false;});
 const C=c=>new THREE.Color(c),sd=cfg.sun||[.3,.5,-.8];
 const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:C(cfg.top)},mid:{value:C(cfg.mid)},bot:{value:C(cfg.bot)},lit:{value:C(cfg.lit)},shade:{value:C(cfg.shade)},sunDir:{value:new V(...sd)},sunCol:{value:new V(...(cfg.sunCol||[0,0,0]))},time:{value:0},cover:{value:cfg.cover}},
  vertexShader:SKY_VS,fragmentShader:SKY_FS});
 const s=new THREE.Mesh(new THREE.SphereGeometry(245,32,16),m);s.renderOrder=-100;s.frustumCulled=false;g.add(s);
 ups.push((dt,t)=>{m.uniforms.time.value=t;});
}
const SKIES={
 1:{top:0x3d8ab0,mid:0xbfe6d6,bot:0x1d3d2f,lit:0xffffff,shade:0x7aa0a8,cover:.5,sun:[.5,.6,-.6],sunCol:[1,.95,.8]},
 3:{top:0x04050e,mid:0x40204f,bot:0x0a0a18,lit:0x8a3a9a,shade:0x0c0c1c,cover:.62,sun:[0,-.3,-1],sunCol:[0,0,0]},
 5:{top:0x34246a,mid:0xffa070,bot:0x3a2030,lit:0xffd4ac,shade:0x7a4a80,cover:.55,sun:[-60,24,-200],sunCol:[1,.78,.5]},
 6:{top:0x3b6a9a,mid:0xcfe4f2,bot:0xeaf4fa,lit:0xffffff,shade:0x93a9c0,cover:.72,sun:[40,60,-190],sunCol:[.9,.95,1]},
 7:{top:0x1c62c4,mid:0xa9d4f4,bot:0xf1e2c0,lit:0xffffff,shade:0x9db6cf,cover:.5,sun:[70,110,-120],sunCol:[1,.96,.82]}
};

/* ---------- 2. normal maps baked from stage textures ---------- */
const nmCache=new WeakMap();
function bakeNormal(img,cap,strength){
 const key=img;if(nmCache.has(key))return nmCache.get(key);
 const S=Math.min(cap,Math.max(img.width,img.height)),W=Math.max(64,Math.round(img.width*S/Math.max(img.width,img.height))),H=Math.max(64,Math.round(img.height*S/Math.max(img.width,img.height)));
 const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(img,0,0,W,H);
 const src=x.getImageData(0,0,W,H).data,ht=new Float32Array(W*H);
 for(let i=0;i<W*H;i++)ht[i]=(src[i*4]*.299+src[i*4+1]*.587+src[i*4+2]*.114)/255;
 {const t=new Float32Array(W*H);for(let j=0;j<H;j++)for(let i=0;i<W;i++){let a=0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++)a+=ht[((j+dj+H)%H)*W+(i+di+W)%W];t[j*W+i]=a/9;}ht.set(t);}   // soften pixel-level noise so the relief doesn't shimmer
 const out=x.createImageData(W,H),o=out.data,wr=(v,m)=>(v+m)%m;
 for(let j=0;j<H;j++)for(let i=0;i<W;i++){
  const l=ht[j*W+wr(i-1,W)],r=ht[j*W+wr(i+1,W)],u=ht[wr(j-1,H)*W+i],d=ht[wr(j+1,H)*W+i];
  let nx=-(r-l)*strength,ny=(d-u)*strength,nz=1;const k=1/Math.hypot(nx,ny,nz);nx*=k;ny*=k;nz*=k;
  const q=(j*W+i)*4;o[q]=(nx*.5+.5)*255;o[q+1]=(ny*.5+.5)*255;o[q+2]=(nz*.5+.5)*255;o[q+3]=255;}
 x.putImageData(out,0,0);nmCache.set(key,c);return c;
}
function upgradeMaterials(group,lvl){
 if(lvl<=0)return;const cap=lvl>=2?768:512,seen=new Set();
 group.traverse(o=>{if(!o.isMesh)return;
  for(const m of(Array.isArray(o.material)?o.material:[o.material])){
   if(!m||seen.has(m)||!m.isMeshStandardMaterial||!m.map||m.normalMap||m.transparent||m.blending===AD)continue;seen.add(m);
   const img=m.map.image;if(!img||!img.getContext)continue;
   const nt=new THREE.CanvasTexture(bakeNormal(img,cap,lvl>=2?5:4));nt.colorSpace=THREE.NoColorSpace;nt.wrapS=m.map.wrapS;nt.wrapT=m.map.wrapT;nt.repeat.copy(m.map.repeat);nt.anisotropy=8;
   m.normalMap=nt;m.normalScale.set(.9,.9);if(m.bumpMap){m.bumpMap=null;}m.needsUpdate=true;}});
}

/* ---------- 3. floor wear decals ---------- */
function wearCv(w,h,o){
 return cv(w,h,(x,W,H)=>{x.clearRect(0,0,W,H);
  for(let i=0;i<(o.stains||0);i++){const cx=rnd(0,W),cy=rnd(0,H),r=rnd(30,120),g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,o.stain||"rgba(0,0,0,.16)");g.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);}
  for(let i=0;i<(o.scuffs||0);i++){const cx=rnd(0,W),cy=rnd(0,H),a=rnd(0,6.283),l=rnd(10,60);x.strokeStyle=Math.random()<.55?(o.light||"rgba(255,255,255,.10)"):(o.dark||"rgba(0,0,0,.2)");x.lineWidth=rnd(1,3.5);x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*l,cy+Math.sin(a)*l);x.stroke();}
  for(let i=0;i<(o.cracks||0);i++){let px=rnd(0,W),py=rnd(0,H),a=rnd(0,6.283);const seg=Math.floor(rnd(5,11));x.lineJoin="round";
   for(const [lw,col] of [[3.2,o.crackLight||"rgba(255,255,255,.06)"],[1.6,o.crack||"rgba(0,0,0,.55)"]]){x.strokeStyle=col;x.lineWidth=lw;x.beginPath();let qx=px,qy=py,qa=a;x.moveTo(qx,qy);
    for(let k=0;k<seg;k++){qa+=rnd(-.7,.7);qx+=Math.cos(qa)*rnd(10,34);qy+=Math.sin(qa)*rnd(10,34);x.lineTo(qx,qy);}x.stroke();}}
  if(o.paint)o.paint(x,W,H);
  for(let i=0;i<(o.specks||0);i++){x.fillStyle=pick(o.speckCols||["rgba(255,255,255,.12)","rgba(0,0,0,.18)"]);x.fillRect(rnd(0,W),rnd(0,H),rnd(1,3),rnd(1,3));}
 });
}
function floorDecal(g,geo,o,y=.012,rough=.85,metal=0){
 const c=wearCv(1024,1024,o),m=STD(0xffffff,rough,metal,{map:tex(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 const d=new THREE.Mesh(geo,m);d.rotation.x=-Math.PI/2;d.position.y=y;d.receiveShadow=true;d.renderOrder=1;g.add(d);return d;
}
/* pairs of footprints */
const footprints=(x,W,H,n,col)=>{x.fillStyle=col;for(let i=0;i<n;i++){const cx=rnd(W*.2,W*.8),cy=rnd(H*.2,H*.8),a=rnd(0,6.283);x.save();x.translate(cx,cy);x.rotate(a);x.beginPath();x.ellipse(-9,0,6,13,0,0,6.283);x.ellipse(9,10,6,13,0,0,6.283);x.fill();x.restore();}};

/* ---------- instancing helper ---------- */
function inst(g,geo,mat,n,fn,cast=false){
 if(n<=0)return null;const im=new THREE.InstancedMesh(geo,mat,n),dm=new THREE.Object3D(),c=new THREE.Color();
 for(let i=0;i<n;i++){dm.position.set(0,0,0);dm.rotation.set(0,0,0);dm.scale.set(1,1,1);const col=fn(dm,i);dm.updateMatrix();im.setMatrixAt(i,dm.matrix);if(col!=null){c.set(col);im.setColorAt(i,c);}}
 im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.castShadow=cast;im.receiveShadow=true;im.frustumCulled=false;g.add(im);return im;
}
const ring=(r0,r1)=>{const r=Math.sqrt(rnd(r0*r0,r1*r1)),a=rnd(0,6.283);return[Math.cos(a)*r,Math.sin(a)*r];};
const backArc=(r0,r1)=>{const r=rnd(r0,r1),a=rnd(.04,.96)*Math.PI;return[Math.cos(a)*r,-Math.sin(a)*r];};

function pebbles(g,Q,L,o){
 const n=Math.floor(o.n*(L>=2?1:.55)),mat=STD(0xffffff,.92,0,{map:tex(rockCv(o.base,o.cols)),flatShading:true});
 inst(g,rockGeo(1,1,.35),mat,n,(d)=>{const[x,z]=ring(o.r0,o.r1),s=rnd(o.s0,o.s1);d.position.set(x,s*.3-.02,z);d.rotation.set(rnd(0,3),rnd(0,6),rnd(0,3));d.scale.set(s,s*rnd(.5,.9),s*rnd(.8,1.2));return o.tint?pick(o.tint):0xffffff;},false);
}

/* =====================================================================
   PER-STAGE DETAIL
   ===================================================================== */
const D=[];

/* 0 · NEON ARENA — steel truss, light rigs, scuffed metal floor */
D[0]=(g,Q,L,ups)=>{
 floorDecal(g,new THREE.CircleGeometry(10.4,8),{scuffs:900,cracks:6,stains:14,light:"rgba(190,210,255,.12)",dark:"rgba(0,0,0,.28)"},.012,.4,.6);
 const metal=STD(0x2a3040,.35,.85);
 for(let k=0;k<2;k++)add(g,new THREE.TorusGeometry(22+k*3,.28,8,72,Math.PI),metal,0,19+k*3,0).rotation.set(Math.PI/2,0,0);
 const n=14;for(let i=0;i<n;i++){const a=Math.PI*(.06+.88*i/(n-1)),x=Math.cos(a)*22,z=-Math.sin(a)*22;
  add(g,new THREE.BoxGeometry(2.2,.9,1.4),metal,x,19,z,{cast:Q.shadow}).lookAt(0,19,0);
  const lens=add(g,new THREE.BoxGeometry(1.7,.5,.1),glowM(i%3===0?0x22d8ff:0xfff0e0,2.6),x*.965,18.8,z*.965);lens.lookAt(0,18.8,0);
  if(L>=1)add(g,new THREE.CylinderGeometry(.06,.06,19,6),metal,x,9.5,z);}
 // LED wall strips behind the stands
 const led=cv(512,64,(x,w,h)=>{x.fillStyle="#000";x.fillRect(0,0,w,h);for(let i=0;i<64;i++){x.fillStyle=`hsl(${i%5===0?190:350},90%,${40+Math.random()*30}%)`;x.fillRect(i*8+1,6,6,52);}});
 const lm=new THREE.MeshBasicMaterial({map:tex(led),toneMapped:false,color:new THREE.Color(1.6,1.6,1.6)});
 for(const s of[-1,1])add(g,new THREE.PlaneGeometry(14,1.4),lm,s*20,3.2,-26.5,{recv:false}).rotation.y=-s*.45;
 pebbles(g,Q,L,{n:70,r0:10.8,r1:14,s0:.04,s1:.14,base:"#2a2d38",cols:["#3a3e4c","#1c1e26"]});
};

/* 1 · JUNGLE RUINS — grass, ferns, reeds, mossy floor, real sky */
D[1]=(g,Q,L,ups)=>{
 floorDecal(g,new THREE.CircleGeometry(9.7,64),{stains:26,stain:"rgba(30,70,30,.22)",scuffs:350,cracks:14,paint:(x,W,H)=>{x.fillStyle="rgba(50,110,40,.30)";for(let i=0;i<90;i++){const a=rnd(0,6.283),r=rnd(.7,.98)*W*.5;x.beginPath();x.arc(W/2+Math.cos(a)*r,H/2+Math.sin(a)*r,rnd(6,34),0,6.283);x.fill();}}},.013,.95);
 const gm=STD(0xffffff,1,0,{map:tex(grassCv([100,55,30])),alphaTest:.45,side:THREE.DoubleSide});
 const nG=Math.floor(520*(L>=2?1:L===1?.55:.2)),gp=new THREE.PlaneGeometry(1,1).translate(0,.5,0);
 inst(g,gp,gm,nG,(d)=>{const a=rnd(0,6.283),r=rnd(9.2,12.4);d.position.set(Math.cos(a)*r,-.02,-Math.abs(Math.sin(a))*r*.9);d.rotation.y=rnd(0,3.14);const s=rnd(.5,1.15);d.scale.set(s*1.3,s,1);return pick([0xffffff,0xd8ffc0,0xb8e090]);});
 const lm=STD(0xffffff,.9,0,{map:tex(leafCv()),alphaTest:.4,side:THREE.DoubleSide});
 inst(g,new THREE.PlaneGeometry(2.6,4.8).translate(0,2.4,0),lm,Math.floor(34*(L>=2?1:.6)),(d)=>{const[x,z]=backArc(9.6,26);d.position.set(x,-.3,z);d.rotation.set(rnd(-.35,.1),rnd(0,6.28),rnd(-.25,.25));const s=rnd(.8,1.7);d.scale.set(s,s,s);return pick([0xffffff,0xc8f0a0,0x9ad080]);});
 if(L>=1){const rm=STD(0x3f9a44,.9,0,{map:tex(grassCv([95,60,34])),alphaTest:.45,side:THREE.DoubleSide});
  inst(g,new THREE.PlaneGeometry(.5,3).translate(0,1.5,0),rm,Math.floor(160*(L>=2?1:.5)),(d)=>{const a=rnd(.02,.98)*Math.PI,r=rnd(11,30);d.position.set(Math.cos(a)*r,-.48,-Math.sin(a)*r);d.rotation.set(rnd(-.12,.12),rnd(0,6.28),0);const s=rnd(.7,1.5);d.scale.set(s,s,s);});}
 pebbles(g,Q,L,{n:90,r0:9.6,r1:15,s0:.06,s1:.28,base:"#4b5a48",cols:["#5d6d56","#38452f","#6b7a62"]});
};

/* 2 · LUNAR ABYSS — habitat base, textured regolith rocks, footprints */
D[2]=(g,Q,L,ups)=>{
 floorDecal(g,new THREE.CircleGeometry(10.3,64),{stains:18,stain:"rgba(20,22,30,.22)",scuffs:300,cracks:8,paint:(x,W,H)=>footprints(x,W,H,16,"rgba(25,27,35,.26)")},.013,.98);
 const hab=panelCv("#aeb4c2","#5a6070","#ffd88a"),hm=STD(0xffffff,.5,.45,{map:tex(hab,[2,1])});
 const spots=[[-26,-38,7],[-10,-44,5],[14,-40,6.5],[30,-34,4.5]];
 for(const[x,z,r] of spots){
  add(g,new THREE.SphereGeometry(r,32,14,0,6.283,0,Math.PI/2),hm,x,0,z,{cast:Q.shadow});
  add(g,new THREE.CylinderGeometry(r,r,1.1,32,1,true),hm,x,.55,z).material.side=THREE.DoubleSide;
  add(g,new THREE.TorusGeometry(r*.38,.12,6,24),glowM(0xffd88a,2.4),x,r*.55,z+r*.78).rotation.x=0;
  add(g,new THREE.CylinderGeometry(.18,.18,r*1.4,8),STD(0x8a90a0,.4,.8),x+r*.55,r*1.05,z-r*.1);}
 for(let i=0;i<spots.length-1;i++){const a=spots[i],b=spots[i+1],mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const t=add(g,new THREE.CylinderGeometry(1,1,len,12),hm,mx,1,mz);t.rotation.set(0,0,Math.PI/2);t.rotation.order="YXZ";t.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);}
 const dish=add(g,new THREE.SphereGeometry(3,24,10,0,6.283,0,1.1),STD(0xd8dce6,.35,.6,{side:THREE.DoubleSide}),20,5.5,-26);dish.rotation.set(-.9,.3,0);
 add(g,new THREE.CylinderGeometry(.2,.3,5.5,8),STD(0x8a90a0,.4,.8),20,2.7,-26);
 pebbles(g,Q,L,{n:160,r0:10.8,r1:26,s0:.06,s1:.55,base:"#5e616d",cols:["#707482","#44474f","#868a98"],tint:[0xffffff,0xd8d8e0,0xb8bcc8]});
};

/* 3 · NEON DISTRICT — rooftop gear, wet puddles, signs */
D[3]=(g,Q,L,ups)=>{
 floorDecal(g,new THREE.PlaneGeometry(21.6,14.6),{stains:30,stain:"rgba(0,0,0,.25)",scuffs:700,cracks:10,light:"rgba(255,255,255,.07)",dark:"rgba(0,0,0,.3)"},.013,.55,.3);
 // mirror-like puddles (reflect neon through the environment map)
 const pm=STD(0x07080f,.03,.7,{transparent:true,opacity:.9,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,envMapIntensity:1.6});
 const np=L>=1?8:4;for(let i=0;i<np;i++){const r=rnd(1.1,2.6),m=add(g,new THREE.CircleGeometry(r,28),pm,rnd(-8.5,8.5),.02,rnd(-5.2,5.2));m.rotation.x=-Math.PI/2;m.scale.y=rnd(.5,.85);m.rotation.z=rnd(0,3);m.renderOrder=2;}
 const metal=STD(0x40454f,.45,.8),ac=panelCv("#6a6f78","#2c3038",null),acm=STD(0xffffff,.5,.6,{map:tex(ac)});
 const units=[[-9.6,-6.2,1],[8.4,-6.5,1],[-3.4,-6.7,.8],[11,-4,.9]];
 for(const[x,z,s] of units){add(g,new THREE.BoxGeometry(2.4*s,1.3*s,1.6*s),acm,x,.65*s+.05,z,{cast:Q.shadow});
  add(g,new THREE.CylinderGeometry(.5*s,.5*s,.12,18),STD(0x15171d,.4,.7),x-.5*s,1.36*s+.05,z).rotation.x=0;
  add(g,new THREE.CylinderGeometry(.5*s,.5*s,.12,18),STD(0x15171d,.4,.7),x+.5*s,1.36*s+.05,z);
  add(g,new THREE.BoxGeometry(2.5*s,.06,.1),glowM(0xff3bd0,2.2),x,.3*s,z+.85*s);}
 for(let i=0;i<3;i++){const p=add(g,new THREE.CylinderGeometry(.14,.14,10,10),metal,-4+i*.5,.45+i*.35,-7.55);p.rotation.z=Math.PI/2;p.position.x=1.5;p.scale.y=1;}
 // water tower + antennas
 add(g,new THREE.CylinderGeometry(1.7,1.7,2.6,20),STD(0x5a4638,.8,.1),-14,9,-12,{cast:Q.shadow});add(g,new THREE.ConeGeometry(1.9,1.1,20),STD(0x3a2c24,.8),-14,11.3,-12);
 for(const[dx,dz]of[[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]])add(g,new THREE.CylinderGeometry(.1,.1,7.5,6),metal,-14+dx,3.6,-12+dz);
 for(const x of[12,15.5]){add(g,new THREE.CylinderGeometry(.05,.07,12,6),metal,x,6,-13);add(g,new THREE.SphereGeometry(.14,8,6),glowM(0xff2a2a,3),x,12.1,-13);}
 // neon signs
 const sign=(txt,col,w,h)=>new THREE.MeshBasicMaterial({map:tex(cv(512,Math.round(512*h/w),(x,W,H)=>{x.fillStyle="#05060c";x.fillRect(0,0,W,H);x.strokeStyle=col;x.lineWidth=10;x.shadowColor=col;x.shadowBlur=24;x.strokeRect(14,14,W-28,H-28);x.fillStyle=col;x.font=`900 ${H*.5}px 'Barlow Condensed',Impact,sans-serif`;x.textAlign="center";x.textBaseline="middle";x.fillText(txt,W/2,H/2+4);})),toneMapped:false,color:new THREE.Color(1.5,1.5,1.5)});
 [["BAR","#ff3bd0",-17,6.5,-9.2],["RAMEN","#22e6f4",17,5.2,-9.5],["NEON","#ffd048",0,8.5,-10.5]].forEach(([t,c,x,y,z])=>{const m=add(g,new THREE.PlaneGeometry(4.6,1.7),sign(t,c,4.6,1.7),x,y,z,{recv:false});m.lookAt(0,y,30);});
 pebbles(g,Q,L,{n:50,r0:6,r1:10.5,s0:.03,s1:.09,base:"#2e313c",cols:["#3c404e","#20222a"]});
};

/* 4 · MAGMA CORE — basalt columns, rim stones, ash sky glow */
D[4]=(g,Q,L,ups)=>{
 const rc=rockCv("#241816",["#352421","#17100e","#4a2f28"]),rm=STD(0xffffff,.85,.15,{map:tex(rc),flatShading:true});
 const nC=Math.floor(46*(L>=2?1:.6));
 inst(g,new THREE.CylinderGeometry(.9,1,1,6),rm,nC,(d)=>{const a=rnd(.03,.97)*Math.PI,r=rnd(13,34),h=rnd(2,13);d.position.set(Math.cos(a)*r,h/2-.9,-Math.sin(a)*r);d.scale.set(rnd(.8,1.5),h,rnd(.8,1.5));d.rotation.y=rnd(0,1);return pick([0xffffff,0xc8b8b0,0x988880]);},Q.shadow);
 const nRim=Math.floor(34*(L>=1?1:.5));inst(g,new THREE.BoxGeometry(1,1,1),rm,nRim,(d,i)=>{const a=(i/nRim)*Math.PI*2,r=rnd(10.7,11.6);d.position.set(Math.cos(a)*r,.08,Math.sin(a)*r);d.scale.set(rnd(.9,1.9),rnd(.3,.8),rnd(.9,1.6));d.rotation.set(rnd(-.12,.12),a+rnd(-.3,.3),rnd(-.12,.12));return pick([0xffffff,0xb8a8a0]);},Q.shadow);
 // glowing fissure lights at the rim
 if(L>=1)for(let i=0;i<5;i++){const a=rnd(.1,.9)*Math.PI,r=rnd(11.5,16),l=new THREE.PointLight(0xff6a1a,9,12,2);l.position.set(Math.cos(a)*r,.6,-Math.sin(a)*r);g.add(l);}
 pebbles(g,Q,L,{n:110,r0:11.5,r1:26,s0:.1,s1:.5,base:"#201512",cols:["#33231f","#120b09"]});
};

/* 5 · SAKURA DOJO — torii gate, stone lanterns, railing, petals, sunset clouds */
D[5]=(g,Q,L,ups)=>{
 floorDecal(g,new THREE.PlaneGeometry(23.4,14.4),{stains:20,stain:"rgba(30,15,5,.2)",scuffs:900,cracks:8,light:"rgba(255,235,210,.10)",dark:"rgba(30,12,0,.25)",paint:(x,W,H)=>{x.fillStyle="rgba(255,170,200,.75)";for(let i=0;i<260;i++){x.beginPath();x.ellipse(rnd(0,W),rnd(0,H),rnd(3,6),rnd(2,4),rnd(0,3),0,6.283);x.fill();}}},.013,.55);
 const red=STD(0xb3261e,.45,.05),blk=STD(0x16110f,.5,.1),wood=STD(0x5a3a22,.7);
 // stone lanterns
 const stone=STD(0x8a8478,.9,0,{map:tex(rockCv("#8a8478",["#9a9488","#6a6458"]))});
 for(const[x,z]of[[-10.5,-4.5],[10.5,-4.5],[-8,-9],[8,-9]]){const s=1;add(g,new THREE.CylinderGeometry(.5*s,.6*s,.4,8),stone,x,.2,z,{cast:Q.shadow});add(g,new THREE.CylinderGeometry(.22*s,.26*s,1.4,8),stone,x,1.1,z);add(g,new THREE.CylinderGeometry(.5*s,.4*s,.25,8),stone,x,1.9,z);
  add(g,new THREE.BoxGeometry(.7,.7,.7),glowM(0xffb060,1.8),x,2.3,z);add(g,new THREE.ConeGeometry(.85,.55,4).rotateY(Math.PI/4),stone,x,2.95,z,{cast:Q.shadow});add(g,new THREE.SphereGeometry(.14,8,6),stone,x,3.3,z);
  if(L>=1){const l=new THREE.PointLight(0xffa850,5,8,2);l.position.set(x,2.3,z);g.add(l);}}
 // mossy garden boulders beside the deck
 inst(g,rockGeo(1,1,.3),STD(0xffffff,.95,0,{map:tex(rockCv("#6a6a60",["#7a7a6e","#4a5a40","#58584e"])),flatShading:true}),Math.floor(16*(L>=2?1:.6)),(d)=>{const s=rnd(.5,1.2),sx=Math.random()<.5?-1:1;d.position.set(sx*rnd(13.8,17),-.62+s*.3,rnd(-9,2));d.scale.set(s*1.3,s*.8,s);d.rotation.y=rnd(0,3);},Q.shadow);
 // railing along the back edge of the deck
 for(let i=0;i<=12;i++)add(g,new THREE.BoxGeometry(.22,1.15,.22),wood,-11+i*1.83,.57,-7.4,{cast:Q.shadow});
 add(g,new THREE.BoxGeometry(24,.16,.3),wood,0,1.1,-7.4);add(g,new THREE.BoxGeometry(24,.12,.2),wood,0,.6,-7.4);
 pebbles(g,Q,L,{n:60,r0:12.5,r1:18,s0:.04,s1:.16,base:"#b0aaa0",cols:["#c0bab0","#8a847a"]});
};

/* 6 · FROZEN SANCTUM — pines, drifts, icicles, ice crystals, frosted floor */
D[6]=(g,Q,L,ups)=>{
 floorDecal(g,new THREE.CircleGeometry(11.3,64),{stains:30,stain:"rgba(255,255,255,.18)",scuffs:500,cracks:22,crack:"rgba(20,40,70,.55)",crackLight:"rgba(255,255,255,.18)",light:"rgba(255,255,255,.2)",dark:"rgba(40,70,110,.2)",specks:900,speckCols:["rgba(255,255,255,.35)","rgba(190,225,255,.3)"]},.013,.35);
 // snow pines (back / far sides)
 const trunk=STD(0x3a2c22,.9),pine=STD(0xffffff,.85,0,{map:tex(noiseTex("#2f5a48",["#3a6a56","#e8f2f8","#244a3a","#f4fafe"],420,4,26,.6))});
 const nP=Math.floor(46*(L>=2?1:.55)),pos=[];for(let i=0;i<nP;i++)pos.push(backArc(26,70).concat(rnd(.8,2.1)));
 inst(g,new THREE.CylinderGeometry(.35,.5,1,6),trunk,nP,(d,i)=>{const[x,z,s]=pos[i];d.position.set(x,s*1.2-.4,z);d.scale.set(s,s*2.4,s);});
 for(let lv=0;lv<3;lv++)inst(g,new THREE.ConeGeometry(1,1.6,9),pine,nP,(d,i)=>{const[x,z,s]=pos[i];d.position.set(x,s*(2.4+lv*1.5)-.4,z);d.scale.set(s*(2.7-lv*.65),s*(1.5-lv*.12),s*(2.7-lv*.65));d.rotation.y=rnd(0,6);return pick([0xffffff,0xe8f0f0,0xd0e0e0]);},Q.shadow&&lv===0);
 // snow drifts
 inst(g,new THREE.SphereGeometry(1,14,8),STD(0xf2f8ff,.95),Math.floor(46*(L>=2?1:.5)),(d)=>{const[x,z]=ring(12.4,34),s=rnd(.8,3);d.position.set(x,-.45,z);d.scale.set(s*1.8,s*.38,s*1.2);d.rotation.y=rnd(0,3);});
 // icicles on the pillars
 const ice=new THREE.MeshPhysicalMaterial({color:0xd8f0ff,roughness:.06,metalness:0,transparent:true,opacity:.85,clearcoat:1,envMapIntensity:1.6});
 inst(g,new THREE.ConeGeometry(.1,1,6).rotateX(Math.PI).translate(0,-.5,0),ice,9*7,(d,i)=>{const p=Math.floor(i/7),a=Math.PI*(.08+p*.105),x=Math.cos(a)*17,z=-Math.sin(a)*13-2,k=rnd(0,6.283);d.position.set(x+Math.cos(k)*.85,7.35,z+Math.sin(k)*.85);d.scale.set(rnd(.8,1.6),rnd(.8,2.2),rnd(.8,1.6));});
 // ice crystal clusters near the rim
 for(let i=0;i<(L>=1?9:4);i++){const a=rnd(.05,.95)*Math.PI,r=rnd(12.5,20),cx=Math.cos(a)*r,cz=-Math.sin(a)*r;
  for(let k=0;k<4;k++){const h=rnd(.8,2.6),c=add(g,new THREE.ConeGeometry(rnd(.18,.32),h,6),ice,cx+rnd(-.5,.5),h/2-.4,cz+rnd(-.5,.5),{cast:false});c.rotation.set(rnd(-.35,.35),0,rnd(-.35,.35));}}
 pebbles(g,Q,L,{n:60,r0:11.8,r1:20,s0:.06,s1:.24,base:"#6a7684",cols:["#7c8896","#566270","#eef6fb"]});
};

/* 7 · SAND COLOSSEUM — fluted columns, cornice, footprints, real blue sky */
D[7]=(g,Q,L,ups)=>{
 floorDecal(g,new THREE.CircleGeometry(12.4,64),{stains:24,stain:"rgba(90,55,20,.2)",scuffs:900,cracks:0,light:"rgba(255,244,215,.16)",dark:"rgba(90,55,25,.22)",specks:1200,speckCols:["rgba(255,248,225,.22)","rgba(95,60,25,.25)"],paint:(x,W,H)=>footprints(x,W,H,34,"rgba(110,70,30,.22)")},.012,.98);
 const col=STD(0xffffff,.85,0,{map:tex(flutedCv(),[3,1])}),stone=STD(0xd2b88a,.9,0,{map:tex(rockCv("#cdb083",["#d8bf94","#b89a6c","#e0c9a0"]))});
 const nCol=L>=1?13:8;
 const avoid=[[-6.5,-14],[6.5,-14],[-5,-17.5],[5,-17.5],[-13.4,-8],[13.4,-8]];
 for(let i=0;i<nCol;i++){const a=Math.PI*(.05+.9*i/(nCol-1)),x=Math.cos(a)*16.4,z=-Math.sin(a)*16.4;if(avoid.some(q=>Math.hypot(q[0]-x,q[1]-z)<2.4))continue;
  add(g,new THREE.CylinderGeometry(.62,.7,.5,16),stone,x,.25,z,{cast:Q.shadow});
  add(g,new THREE.CylinderGeometry(.5,.58,5.2,20),col,x,3.1,z,{cast:Q.shadow});
  add(g,new THREE.CylinderGeometry(.74,.5,.45,16),stone,x,5.9,z);add(g,new THREE.BoxGeometry(1.5,.28,1.5),stone,x,6.25,z);}
 // cornice with dentils along the top of the wall
 const nD=Math.floor(150*(L>=2?1:.6));
 inst(g,new THREE.BoxGeometry(.42,.34,.5),stone,nD,(d,i)=>{const a=Math.PI*(.02+.96*i/(nD-1)),r=18.7;d.position.set(Math.cos(a)*r,5.15,-Math.sin(a)*r);d.lookAt(0,5.15,0);});
 // weathered blocks and rubble
 inst(g,new THREE.BoxGeometry(1,1,1),stone,Math.floor(30*(L>=2?1:.5)),(d)=>{const[x,z]=ring(12.8,16),s=rnd(.4,1.3);d.position.set(x,s*.3-.04,z);d.scale.set(s,s*rnd(.5,1),s*rnd(.7,1.3));d.rotation.set(rnd(-.1,.1),rnd(0,3),rnd(-.1,.1));return pick([0xffffff,0xe0d0b0,0xc0aa84]);},Q.shadow);
 pebbles(g,Q,L,{n:120,r0:11.4,r1:16,s0:.04,s1:.2,base:"#b99a68",cols:["#c8aa78","#a08458","#d8bc8a"]});
 // warm tinted dust gets handled by the stage itself
};

/* =====================================================================
   PUBLIC ENTRY
   ===================================================================== */
export function applyRealism(i,stage,Q,renderer){
 const g=stage.group,L=lvlOf(Q),ups=[];
 if(SKIES[i]&&L>=1)safe("sky",()=>addSky(g,{...SKIES[i],cover:SKIES[i].cover*(L>=2?1:.9)},ups));
 if(D[i])safe("detail "+i,()=>D[i](g,Q,L,ups));
 safe("normal maps",()=>upgradeMaterials(g,L));
 if(ups.length){const u0=stage.update;stage.update=(dt,t)=>{u0&&u0(dt,t);for(const f of ups)f(dt,t);};}
}
