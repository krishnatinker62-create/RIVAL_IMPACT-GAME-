import * as THREE from "three";
import {glowTex} from "./fx.js";
import {applyRealism} from "./realism.js";
const V=THREE.Vector3, AD=THREE.AdditiveBlending, rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
const cv=(w,h,fn)=>{const c=document.createElement("canvas");c.width=w;c.height=h;fn(c.getContext("2d"),w,h);return c;};
const tx=(c,rep,srgb=true)=>{const t=new THREE.CanvasTexture(c);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.anisotropy=8;return t;};
const mesh=(geo,mat,p,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);p.add(m);return m;};
const STD=(c,r=.8,m=0,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,...o});
const glowM=(c,i=2)=>new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i)});
const beamM=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:AD,depthWrite:false,side:THREE.DoubleSide});
const blobs=(x,w,h,n,cols,r0,r1,a)=>{for(let i=0;i<n;i++){x.globalAlpha=rnd(a*.4,a);x.fillStyle=pick(cols);x.beginPath();x.arc(rnd(0,w),rnd(0,h),rnd(r0,r1),0,6.283);x.fill();}x.globalAlpha=1;};
const circ=(x,cx,cy,r)=>{x.beginPath();x.arc(cx,cy,r,0,6.283);x.stroke();};
const aim=(piv,from,to)=>{piv.position.copy(from);piv.quaternion.setFromUnitVectors(new V(0,-1,0),new V().subVectors(to,from).normalize());};
const hsh=(x,y,z,k)=>{const n=Math.sin(x*127.1+y*311.7+z*74.7+k*19.3)*43758.5453;return n-Math.floor(n)-.5;};
const jitter=(geo,a)=>{const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setXYZ(i,x+hsh(x,y,z,1)*2*a,y+hsh(x,y,z,2)*2*a,z+hsh(x,y,z,3)*2*a);}geo.computeVertexNormals();return geo;};

function dirLight(g,Q,color,i,pos,shadow){const l=new THREE.DirectionalLight(color,i);l.position.set(...pos);
 if(shadow&&Q.shadow){l.castShadow=true;l.shadow.mapSize.set(Q.sres,Q.sres);const c=l.shadow.camera;c.left=-13;c.right=13;c.top=11;c.bottom=-11;c.near=1;c.far=70;l.shadow.bias=-.0004;l.shadow.normalBias=.04;}
 g.add(l);return l;}
function stars(g,n){const p=new Float32Array(n*3);for(let i=0;i<n;i++){const u=Math.random()*.95+.05,a=Math.random()*6.283,s=Math.sqrt(1-u*u);p[i*3]=220*s*Math.cos(a);p[i*3+1]=220*u;p[i*3+2]=220*s*Math.sin(a);}
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(p,3));
 const s=new THREE.Points(geo,new THREE.PointsMaterial({size:1.7,sizeAttenuation:false,color:0xffffff,fog:false,transparent:true,opacity:.9}));g.add(s);}
function earth(g,r,pos){
 const c=cv(1024,512,(x,w,h)=>{x.fillStyle="#0a2a66";x.fillRect(0,0,w,h);blobs(x,w,h,80,["#2f6b3c","#3d7a46","#8a7a4a","#c9b88a"],15,70,.9);
  x.fillStyle="#fff";blobs(x,w,h,140,["#ffffff"],10,45,.3);x.fillRect(0,0,w,14);x.fillRect(0,h-14,w,14);});
 const m=mesh(new THREE.SphereGeometry(r,56,36),new THREE.MeshStandardMaterial({map:tx(c),roughness:1,fog:false}),g,...pos);
 const a=mesh(new THREE.SphereGeometry(r*1.05,56,36),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,blending:AD,depthWrite:false,
  vertexShader:"varying vec3 n,v;void main(){n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}",
  fragmentShader:"varying vec3 n,v;void main(){float f=pow(1.-abs(dot(n,v)),2.2);gl_FragColor=vec4(.3,.6,1.,1.)*f*1.8;}"}),g,...pos);
 return m;}
export function makeEnv(renderer,top,mid,bot,spots=[]){
 const sc=new THREE.Scene();
 sc.add(new THREE.Mesh(new THREE.SphereGeometry(50,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,uniforms:{t:{value:new THREE.Color(top)},m:{value:new THREE.Color(mid)},b:{value:new THREE.Color(bot)}},
  vertexShader:"varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader:"uniform vec3 t,m,b;varying vec3 p;void main(){float h=p.y;vec3 c=h>0.?mix(m,t,pow(h,.6)):mix(m,b,pow(-h,.6));gl_FragColor=vec4(c,1.);}"})));
 for(const s of spots){const m=new THREE.Mesh(new THREE.BoxGeometry(s.w||12,s.h||4,1),new THREE.MeshBasicMaterial({color:new THREE.Color(s.c).multiplyScalar(s.i||3)}));m.position.set(...s.p);m.lookAt(0,0,0);sc.add(m);}
 const pm=new THREE.PMREMGenerator(renderer),rt=pm.fromScene(sc,.02);pm.dispose();return rt.texture;}

/* ---------------- 1. NEON ARENA ---------------- */
function neonArena(Q){
 const g=new THREE.Group(),R=11.5,U=[];
 const base=cv(1024,1024,(x,w,h)=>{x.fillStyle="#10131b";x.fillRect(0,0,w,h);x.strokeStyle="#1d2330";x.lineWidth=2;
  for(let i=0;i<=16;i++){x.beginPath();x.moveTo(i*w/16,0);x.lineTo(i*w/16,h);x.moveTo(0,i*h/16);x.lineTo(w,i*h/16);x.stroke();}
  for(let i=0;i<3000;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.06})`;x.fillRect(rnd(0,w),rnd(0,h),2,2);}
  x.strokeStyle="#39415a";x.lineWidth=7;for(const r of[90,150,215,330,440])circ(x,512,512,r);});
 const glow=cv(1024,1024,(x,w,h)=>{x.fillStyle="#000";x.fillRect(0,0,w,h);x.strokeStyle="#ff2a2a";x.lineWidth=9;circ(x,512,512,262);circ(x,512,512,120);
  x.strokeStyle="#ff5a3a";x.lineWidth=4;circ(x,512,512,330);x.strokeStyle="#22d8ff";x.lineWidth=3;circ(x,512,512,440);
  x.setLineDash([26,18]);x.strokeStyle="#ff2a2a";x.lineWidth=6;for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8;x.beginPath();x.moveTo(512+Math.cos(a)*140,512+Math.sin(a)*140);x.lineTo(512+Math.cos(a)*430,512+Math.sin(a)*430);x.stroke();}
  x.setLineDash([]);x.fillStyle="#ff3a3a";x.font="900 54px 'Barlow Condensed',sans-serif";x.textAlign="center";x.fillText("RIVAL IMPACT",512,512+330*0.0+20-0);});
 const floor=mesh(new THREE.CircleGeometry(R,8),STD(0xffffff,.32,.75,{map:tx(base),emissiveMap:tx(glow),emissive:0xffffff,emissiveIntensity:1.25}),g);
 floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;
 const out=mesh(new THREE.CircleGeometry(90,48),STD(0x07080c,.45,.6),g,0,-.06,0);out.rotation.x=-Math.PI/2;out.receiveShadow=true;
 const L=2*R*Math.sin(Math.PI/8),D=R*Math.cos(Math.PI/8);
 for(let k=0;k<8;k++){const m=(k+.5)*Math.PI/4,r=new THREE.Group();r.position.set(D*Math.cos(m),0,-D*Math.sin(m));r.rotation.y=m+Math.PI/2;g.add(r);
  mesh(new THREE.BoxGeometry(L,.55,.28),STD(0x1a1d27,.4,.8),r,0,.28,0).castShadow=true;
  mesh(new THREE.BoxGeometry(L*.95,.07,.3),glowM(k%4===0?0x22d8ff:0xff2a2a,2.6),r,0,.5,0);
  const v=R*Math.cos(Math.PI/8)*0;mesh(new THREE.BoxGeometry(.35,1.1,.35),STD(0x20242f,.4,.8),r,-L/2,.55,0);}
 // stands
 const tierM=STD(0x12141c,.9,.1);
 for(let t=0;t<6;t++){const ro=17+t*2.8,h=1+t*1.1;mesh(new THREE.CylinderGeometry(ro,ro,h,48,1,false,Math.PI-1.5,3),tierM,g,0,h/2-.1,0).material.side=THREE.DoubleSide;}
 const nC=Q.crowd;if(nC>0){const im=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.2,.45,3,6),STD(0xffffff,.9),nC),dm=new THREE.Object3D(),cc=new THREE.Color();
  for(let i=0;i<nC;i++){const t=Math.floor(Math.random()*6),ro=17+t*2.8-1.2,a=Math.PI+rnd(-1.45,1.45);dm.position.set(Math.sin(a)*ro,1+t*1.1+.45,Math.cos(a)*ro);dm.scale.setScalar(rnd(.9,1.2));dm.updateMatrix();im.setMatrixAt(i,dm.matrix);
   cc.setHex(Math.random()<.12?pick([0xff3a3a,0x22d8ff,0xffffff]):pick([0x15151c,0x23232e,0x2d2430,0x1c2433]));im.setColorAt(i,cc);}
  g.add(im);}
 const nd=Math.floor(260*Q.parts),dp=new Float32Array(nd*3),dc=new Float32Array(nd*3);
 for(let i=0;i<nd;i++){const t=Math.floor(Math.random()*6),ro=17+t*2.8-1.2,a=Math.PI+rnd(-1.45,1.45),c=new THREE.Color(pick([0xff3a3a,0x22d8ff,0xffffff,0xffc060]));
  dp.set([Math.sin(a)*ro,1+t*1.1+1.1,Math.cos(a)*ro],i*3);dc.set([c.r*2,c.g*2,c.b*2],i*3);}
 const dg=new THREE.BufferGeometry();dg.setAttribute("position",new THREE.BufferAttribute(dp,3));dg.setAttribute("color",new THREE.BufferAttribute(dc,3));
 const dots=new THREE.Points(dg,new THREE.PointsMaterial({size:.5,map:glowTex(),vertexColors:true,transparent:true,blending:AD,depthWrite:false}));g.add(dots);
 // big screen
 const sc=cv(1024,512,(x,w,h)=>{const gr=x.createRadialGradient(512,256,10,512,256,420);gr.addColorStop(0,"#ff4a4a");gr.addColorStop(.35,"#8a1020");gr.addColorStop(1,"#0a0508");x.fillStyle=gr;x.fillRect(0,0,w,h);
  x.strokeStyle="#ffd0d0";x.lineWidth=10;x.shadowColor="#ff2a2a";x.shadowBlur=40;x.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;x.lineTo(512+Math.cos(a)*190,256+Math.sin(a)*190);}x.closePath();x.stroke();
  x.fillStyle="#fff";x.font="italic 900 150px 'Barlow Condensed',sans-serif";x.textAlign="center";x.fillText("RI",512,305);});
 mesh(new THREE.PlaneGeometry(26,13),new THREE.MeshBasicMaterial({map:tx(sc),toneMapped:false}),g,0,12,-37.5);
 for(const s of[-1,1]){const p=mesh(new THREE.CylinderGeometry(3,3,16,32,1,true),beamM(0x22d8ff,.13),g,s*16,8,-17);
  for(const y of[.5,8,15.5])mesh(new THREE.TorusGeometry(3.05,.12,8,32),glowM(0x22d8ff,2.5),g,s*16,y,-17).rotation.x=Math.PI/2;
  const pl=new THREE.PointLight(0x22d8ff,34,34);pl.position.set(s*13,6,-14);g.add(pl);}
 // lasers + spot cones
 const beams=[],cg=new THREE.CylinderGeometry(.045,.045,70,6).translate(0,-35,0);
 for(let i=0;i<Math.floor(18*Math.max(.5,Q.parts));i++){const pv=new THREE.Group();pv.position.set(rnd(-24,24),26,rnd(-30,-6));g.add(pv);pv.add(new THREE.Mesh(cg,beamM(i%5===0?0x22d8ff:0xff2a2a,.45)));pv.userData={bx:rnd(-.3,.1),bz:rnd(-.4,.4),ph:rnd(0,6)};beams.push(pv);}
 const cone=new THREE.CylinderGeometry(.2,3.4,30,24,1,true).translate(0,-15,0);
 for(let i=0;i<6;i++){const pv=new THREE.Group();aim(pv,new V((i-2.5)*8,26,-14),new V((i-2.5)*2.4,0,0));pv.add(new THREE.Mesh(cone,beamM(i%2?0xbfd8ff:0xffb0b0,.035)));g.add(pv);}
 for(let i=0;i<5;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(128),color:i%2?0x6a8aff:0xff4a4a,transparent:true,opacity:.22,blending:AD,depthWrite:false}));s.scale.set(34,18,1);s.position.set(rnd(-20,20),rnd(5,12),rnd(-34,-18));g.add(s);}
 g.add(new THREE.HemisphereLight(0x7aa8ff,0x10121a,.75));
 dirLight(g,Q,0xe6eeff,2.3,[-6,14,10],true);dirLight(g,Q,0xff3333,1.8,[7,6,-11]);
 const fl=new THREE.PointLight(0xff3a2a,12,20);fl.position.set(0,1,0);g.add(fl);
 const env=null;
 return {group:g,bg:new THREE.Color(0x05060b),fog:new THREE.FogExp2(0x070a14,.011),envCfg:[0x1a2540,0x241016,0x08090c,[{c:0xff3030,p:[0,10,-30],i:3},{c:0x22d8ff,p:[-25,12,-5],i:2.5},{c:0xffffff,p:[10,30,10],i:2,w:20}]],
  update(dt,t){beams.forEach((b,i)=>{const u=b.userData;b.rotation.x=u.bx+Math.sin(t*.6+u.ph)*.5;b.rotation.z=u.bz+Math.cos(t*.45+u.ph*1.7)*.55;});dots.material.opacity=.75+.25*Math.sin(t*3);}};
}

/* ---------------- 2. JUNGLE RUINS ---------------- */
function jungle(Q){
 const g=new THREE.Group();
 const st=cv(1024,1024,(x,w,h)=>{x.fillStyle="#3b4540";x.fillRect(0,0,w,h);blobs(x,w,h,420,["#525e55","#2f3a35","#46514a"],14,90,.3);blobs(x,w,h,220,["#2f5a35","#3d6a30"],10,60,.35);
  x.strokeStyle="#12170f";for(let i=0;i<40;i++){x.lineWidth=rnd(1.5,4);x.beginPath();let px=rnd(0,w),py=rnd(0,h);x.moveTo(px,py);for(let k=0;k<6;k++){px+=rnd(-70,70);py+=rnd(-70,70);x.lineTo(px,py);}x.stroke();}});
 const ru=cv(1024,1024,(x,w,h)=>{x.fillStyle="#000";x.fillRect(0,0,w,h);x.strokeStyle="#ff3a22";x.lineWidth=10;x.shadowColor="#ff3a22";x.shadowBlur=18;circ(x,512,512,420);x.lineWidth=4;circ(x,512,512,385);circ(x,512,512,200);
  x.lineWidth=7;for(let i=0;i<16;i++){const a=i*Math.PI/8;x.beginPath();x.moveTo(512+Math.cos(a)*400,512+Math.sin(a)*400);x.lineTo(512+Math.cos(a+.15)*330,512+Math.sin(a+.15)*330);x.stroke();}});
 const fl=mesh(new THREE.CircleGeometry(9.8,64),STD(0xffffff,.85,0,{map:tx(st),bumpMap:tx(st),bumpScale:2,emissiveMap:tx(ru),emissive:0xff3a22,emissiveIntensity:.55}),g,0,.002,0);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;
 mesh(new THREE.CylinderGeometry(9.9,10.4,.8,64),STD(0x2e3832,.9),g,0,-.4,0).receiveShadow=true;
 const wn=cv(256,256,(x,w,h)=>{x.fillStyle="#808080";x.fillRect(0,0,w,h);blobs(x,w,h,160,["#fff","#000","#aaa"],6,30,.35);});
 const wt=tx(wn,[40,40],false);
 const water=mesh(new THREE.PlaneGeometry(300,300),STD(0x0b4650,.06,.55,{transparent:true,opacity:.93,bumpMap:wt,bumpScale:.8}),g,0,-.45,0);water.rotation.x=-Math.PI/2;water.receiveShadow=true;
 const bark=STD(0x2a2118,.95),leaf=[STD(0x0f2a1c,1),STD(0x15402a,1),STD(0x1b4d2c,1)];
 const nT=Math.floor(14*Math.max(.6,Q.parts));
 for(let i=0;i<nT;i++){const a=rnd(.08,.92)*Math.PI,r=rnd(15,36),x=Math.cos(a)*r,z=-Math.sin(a)*r,h=rnd(16,24);
  mesh(new THREE.CylinderGeometry(1,1.9,h,10),bark,g,x,h/2,z).castShadow=Q.shadow;
  for(let k=0;k<5;k++){const b=k*1.256,c=mesh(new THREE.ConeGeometry(.9,4,6),bark,g,x+Math.cos(b)*1.5,1.6,z+Math.sin(b)*1.5);c.rotation.z=Math.cos(b)*.7;c.rotation.x=-Math.sin(b)*.7;}
  for(let k=0;k<3;k++)mesh(new THREE.IcosahedronGeometry(rnd(5,8),1),pick(leaf),g,x+rnd(-4,4),h+rnd(-1,4),z+rnd(-4,4));
  for(let k=0;k<5;k++){const l=rnd(5,11);mesh(new THREE.CylinderGeometry(.05,.05,l,4),STD(0x1d4a26,1),g,x+rnd(-4,4),h-l/2,z+rnd(-3,4));}}
 const rock=STD(0x59635a,.9);
 for(const s of[-1,1]){mesh(new THREE.CylinderGeometry(.9,1,10,10),rock,g,s*5.5,5,-14).castShadow=Q.shadow;mesh(new THREE.SphereGeometry(.25,10,8),glowM(0xffa040,3),g,s*5.5,3,-13);}
 mesh(new THREE.BoxGeometry(13,1.6,2.2),rock,g,0,10.4,-14);
 for(let i=0;i<10;i++){const a=rnd(0,Math.PI*2),r=rnd(10.5,13),h=rnd(1,5);const p=mesh(new THREE.CylinderGeometry(.7,.85,h,8),rock,g,Math.cos(a)*r,h/2-.4,-Math.abs(Math.sin(a))*r);p.rotation.z=rnd(-.15,.15);p.castShadow=Q.shadow;}
 const rayT=tx(cv(64,256,(x,w,h)=>{const gr=x.createLinearGradient(0,0,w,0);gr.addColorStop(0,"rgba(255,255,255,0)");gr.addColorStop(.5,"rgba(255,255,255,1)");gr.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=gr;x.fillRect(0,0,w,h);
  const g2=x.createLinearGradient(0,0,0,h);g2.addColorStop(0,"rgba(0,0,0,0)");g2.addColorStop(.8,"rgba(0,0,0,.6)");g2.addColorStop(1,"rgba(0,0,0,1)");x.globalCompositeOperation="destination-out";x.fillStyle=g2;x.fillRect(0,0,w,h);}));
 const rays=[];for(let i=0;i<8;i++){const m=mesh(new THREE.PlaneGeometry(rnd(3,7),50),new THREE.MeshBasicMaterial({map:rayT,color:0xcdf3ff,transparent:true,opacity:.2,blending:AD,depthWrite:false,side:THREE.DoubleSide}),g,rnd(-22,14),22,rnd(-22,-4));m.rotation.z=.4+rnd(-.06,.06);m.rotation.y=rnd(-.3,.3);m.userData.ph=rnd(0,6);rays.push(m);}
 const nf=Math.floor(140*Q.parts),fb=new Float32Array(nf*3),fp=new Float32Array(nf*3);
 for(let i=0;i<nf;i++)fb.set([rnd(-18,18),rnd(.4,7),rnd(-14,12)],i*3);fp.set(fb);
 const fg=new THREE.BufferGeometry();fg.setAttribute("position",new THREE.BufferAttribute(fp,3));
 const ff=new THREE.Points(fg,new THREE.PointsMaterial({size:.4,map:glowTex(),color:new THREE.Color(0xd9ff7a).multiplyScalar(2),transparent:true,blending:AD,depthWrite:false}));g.add(ff);
 g.add(new THREE.HemisphereLight(0x7fcdbb,0x1b2a1f,.85));
 dirLight(g,Q,0xeefaff,2.5,[-8,16,6],true);dirLight(g,Q,0x4fd1c5,1.4,[8,8,-10]);
 const pl=new THREE.PointLight(0xff3322,5,13);pl.position.set(0,.4,0);g.add(pl);
 return {group:g,bg:new THREE.Color(0x1d3d42),fog:new THREE.FogExp2(0x2a5054,.026),envCfg:[0x5a8f96,0x244444,0x0b1512,[{c:0xdff6ff,p:[-20,30,-10],i:2.2,w:16}]],
  update(dt,t){wt.offset.x=t*.004;wt.offset.y=t*.003;rays.forEach(r=>r.material.opacity=.15+.1*Math.sin(t*.5+r.userData.ph));
   for(let i=0;i<nf;i++){fp[i*3]=fb[i*3]+Math.sin(t*.4+i)*.8;fp[i*3+1]=fb[i*3+1]+Math.sin(t*.7+i*1.3)*.5;fp[i*3+2]=fb[i*3+2]+Math.cos(t*.35+i)*.8;}fg.attributes.position.needsUpdate=true;}};
}

/* ---------------- 3. LUNAR ABYSS ---------------- */
function lunar(Q){
 const g=new THREE.Group();stars(g,Math.floor(2600*Math.max(.5,Q.parts)));earth(g,48,[-50,34,-150]);
 const rg=cv(1024,1024,(x,w,h)=>{x.fillStyle="#6a6d78";x.fillRect(0,0,w,h);blobs(x,w,h,900,["#7b7e8a","#575a66","#8a8d99"],3,40,.3);
  for(let i=0;i<22;i++){const cx=rnd(0,w),cy=rnd(0,h),r=rnd(20,110);x.fillStyle="rgba(30,32,40,.45)";x.beginPath();x.arc(cx,cy,r,0,6.283);x.fill();x.strokeStyle="rgba(180,184,198,.5)";x.lineWidth=5;x.beginPath();x.arc(cx-3,cy-3,r,0,6.283);x.stroke();}});
 const rt=tx(rg);const rt2=tx(rg,[16,16]);
 const fl=mesh(new THREE.CircleGeometry(10.4,64),STD(0x9a9ca8,.95,0,{map:rt,bumpMap:rt,bumpScale:1.5}),g,0,.002,0);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;
 const gr=mesh(new THREE.CircleGeometry(220,48),STD(0x6e717c,1,0,{map:rt2,bumpMap:rt2,bumpScale:2}),g,0,-.2,0);gr.rotation.x=-Math.PI/2;gr.receiveShadow=true;
 mesh(new THREE.CylinderGeometry(10.5,10.9,.4,64),STD(0x2a2e3c,.5,.7),g,0,-.2,0);
 for(const[r0,r1,c,i] of[[9.9,10.35,0x66a8ff,3],[5.8,5.95,0x66a8ff,2],[1.8,1.95,0x66a8ff,2]]){const m=mesh(new THREE.RingGeometry(r0,r1,64),glowM(c,i),g,0,.012,0);m.rotation.x=-Math.PI/2;}
 for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,x=Math.cos(a)*11.8,z=Math.sin(a)*11.8;mesh(new THREE.BoxGeometry(.7,2.8,.7),STD(0x20242f,.4,.8),g,x,1.4,z).castShadow=Q.shadow;mesh(new THREE.BoxGeometry(.5,.3,.5),glowM(0x66a8ff,3.5),g,x,2.95,z);mesh(new THREE.CylinderGeometry(.08,.08,40,6),beamM(0x66a8ff,.22),g,x,22,z);}
 const rm=STD(0x585c6e,.95);const nR=Math.floor(40*Math.max(.5,Q.parts));
 for(let i=0;i<nR;i++){const a=rnd(0,6.283),r=rnd(15,80),s=rnd(.8,4),m=mesh(jitter(new THREE.IcosahedronGeometry(s,1),s*.25),new THREE.MeshStandardMaterial({color:rm.color,roughness:.95,flatShading:true}),g,Math.cos(a)*r,s*.4-.3,-Math.abs(Math.sin(a))*r*1.1);m.castShadow=Q.shadow;m.receiveShadow=true;}
 const fr=[];for(let i=0;i<14;i++){const s=rnd(.6,2.4),m=mesh(jitter(new THREE.IcosahedronGeometry(s,1),s*.3),new THREE.MeshStandardMaterial({color:0x4a4e60,roughness:.9,flatShading:true}),g,rnd(-30,30),rnd(4,18),rnd(-40,-12));m.userData={sp:rnd(-.2,.2),y:m.position.y,ph:rnd(0,6)};m.castShadow=Q.shadow;fr.push(m);}
 const nd=Math.floor(160*Q.parts),db=new Float32Array(nd*3),dpp=new Float32Array(nd*3);for(let i=0;i<nd;i++)db.set([rnd(-20,20),rnd(.5,10),rnd(-16,12)],i*3);dpp.set(db);
 const dg=new THREE.BufferGeometry();dg.setAttribute("position",new THREE.BufferAttribute(dpp,3));
 g.add(new THREE.Points(dg,new THREE.PointsMaterial({size:.12,map:glowTex(),color:0xbcd0ff,transparent:true,opacity:.7,blending:AD,depthWrite:false})));
 g.add(new THREE.HemisphereLight(0x4a5a9a,0x0a0b12,.55));
 dirLight(g,Q,0xfff4e6,3.2,[-10,12,10],true);dirLight(g,Q,0x4a86ff,1.3,[-6,8,-14]);
 const pl=new THREE.PointLight(0x66a8ff,12,16);pl.position.set(0,.8,0);g.add(pl);
 return {group:g,bg:new THREE.Color(0x02030a),fog:new THREE.FogExp2(0x03040c,.004),envCfg:[0x0a1030,0x1a2238,0x1a1a22,[{c:0x6aa0ff,p:[-30,20,-30],i:2.5,w:20},{c:0xffffff,p:[20,25,30],i:3,w:20}]],
  update(dt,t){fr.forEach(m=>{m.rotation.x+=m.userData.sp*dt;m.rotation.y+=m.userData.sp*.7*dt;m.position.y=m.userData.y+Math.sin(t*.3+m.userData.ph)*.6;});
   for(let i=0;i<nd;i++){dpp[i*3]=db[i*3]+Math.sin(t*.15+i)*1.2;dpp[i*3+1]=db[i*3+1]+Math.sin(t*.2+i*2)*.8;}dg.attributes.position.needsUpdate=true;}};
}

/* ---------------- 4. NEON DISTRICT ---------------- */
function district(Q){
 const g=new THREE.Group();
 const asp=cv(1024,1024,(x,w,h)=>{x.fillStyle="#1a1d28";x.fillRect(0,0,w,h);blobs(x,w,h,900,["#232734","#12141c","#2a2e3c"],2,30,.4);
  x.strokeStyle="#ff3bd0";x.lineWidth=8;x.shadowColor="#ff3bd0";x.shadowBlur=14;circ(x,512,512,400);x.strokeStyle="#22e6f4";x.shadowColor="#22e6f4";x.lineWidth=5;circ(x,512,512,360);
  x.strokeStyle="#e8e8f0";x.shadowBlur=0;x.lineWidth=10;x.setLineDash([60,50]);x.beginPath();x.moveTo(0,512);x.lineTo(1024,512);x.stroke();});
 const rf=cv(256,256,(x,w,h)=>{x.fillStyle="#7a7a7a";x.fillRect(0,0,w,h);blobs(x,w,h,40,["#111"],10,50,.9);});
 const fl=mesh(new THREE.PlaneGeometry(22,15),STD(0xffffff,.7,.4,{map:tx(asp),roughnessMap:tx(rf),}),g);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;
 mesh(new THREE.BoxGeometry(22.6,.7,15.6),STD(0x14161e,.5,.6),g,0,-.37,0);
 for(const[z,c] of[[-7.6,0xff3bd0],[7.6,0x22e6f4]]){mesh(new THREE.BoxGeometry(22.6,.5,.35),STD(0x1a1d27,.4,.8),g,0,.25,z);mesh(new THREE.BoxGeometry(22.4,.06,.38),glowM(c,3),g,0,.48,z);}
 for(const s of[-1,1])mesh(new THREE.BoxGeometry(.35,.5,15.6),STD(0x1a1d27,.4,.8),g,s*11.3,.25,0);
 const wc=cv(128,192,(x,w,h)=>{x.fillStyle="#0b0d18";x.fillRect(0,0,w,h);for(let i=0;i<6;i++)for(let j=0;j<12;j++){if(Math.random()<.45){x.fillStyle=pick(["#ffd48a","#9fe8ff","#ff9ad8","#fff4d0"]);x.fillRect(i*21+4,j*16+3,12,9);}}});
 const wt=tx(wc);wt.wrapS=wt.wrapT=THREE.RepeatWrapping;
 const nB=Math.floor(46*Math.max(.6,Q.parts)),signs=[];
 for(let i=0;i<nB;i++){const lay=i%3,w=rnd(4,9),d=rnd(4,8),h=rnd(14,46)+lay*8,x=rnd(-60,60),z=-26-lay*18-rnd(0,8);
  const geo=new THREE.BoxGeometry(w,h,d),uv=geo.attributes.uv,n=geo.attributes.normal;
  for(let k=0;k<uv.count;k++){const sx=Math.abs(n.getX(k))>.5?d:w;uv.setXY(k,uv.getX(k)*sx/4,uv.getY(k)*h/6);}
  const b=mesh(geo,new THREE.MeshStandardMaterial({color:0x1a1d2c,roughness:.6,metalness:.3,map:wt,emissiveMap:wt,emissive:0xffffff,emissiveIntensity:1.1-lay*.15}),g,x,h/2-1,z);
  if(lay===0&&signs.length<7)signs.push([x,h,z+d/2+.2,w]);}
 const texts=["RIVAL","IMPACT","拳","夜","ARCADE","HOTEL","FIGHT"],cols=["#ff3bd0","#22e6f4","#ffd048","#ff4a4a"];
 signs.forEach(([x,h,z,w],i)=>{const t=texts[i%texts.length],c=cols[i%4],sc=cv(128,512,(cx,W,H)=>{cx.fillStyle="#05060c";cx.fillRect(0,0,W,H);cx.strokeStyle=c;cx.lineWidth=6;cx.strokeRect(6,6,W-12,H-12);cx.fillStyle=c;cx.shadowColor=c;cx.shadowBlur=20;cx.textAlign="center";cx.font="900 64px 'Noto Sans JP','Barlow Condensed',sans-serif";
   [...t].slice(0,5).forEach((ch,k,arr)=>cx.fillText(ch,W/2,70+k*(Math.min(90,420/arr.length))));});
  mesh(new THREE.PlaneGeometry(2.6,10),new THREE.MeshBasicMaterial({map:tx(sc),toneMapped:false}),g,x+rnd(-1,1),rnd(10,h*.7),z);});
 const cars=[];for(let i=0;i<8;i++){const m=mesh(new THREE.BoxGeometry(1.6,.35,.6),glowM(pick([0xff3bd0,0x22e6f4,0xffd048]),4),g,rnd(-60,60),rnd(14,30),-rnd(16,24));m.userData.v=rnd(4,10)*(Math.random()<.5?-1:1);cars.push(m);}
 for(const[c,x] of[[0xff3bd0,-26],[0x22e6f4,26],[0x7a4aff,0]]){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(128),color:c,transparent:true,opacity:.35,blending:AD,depthWrite:false}));s.scale.set(80,50,1);s.position.set(x,18,-70);g.add(s);}
 const nr=Math.floor(700*Q.parts),rp=new Float32Array(nr*6);
 const resetDrop=i=>{const x=rnd(-18,18),y=rnd(0,22),z=rnd(-12,12);rp.set([x,y,z,x-.1,y+.7,z],i*6);};for(let i=0;i<nr;i++)resetDrop(i);
 const rg=new THREE.BufferGeometry();rg.setAttribute("position",new THREE.BufferAttribute(rp,3));
 const rain=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:0xa8d8ff,transparent:true,opacity:.4}));rain.frustumCulled=false;g.add(rain);
 g.add(new THREE.HemisphereLight(0x6a5aff,0x120a24,.9));
 dirLight(g,Q,0xb8c4ff,1.7,[-6,14,8],true);
 for(const[c,x] of[[0xff3bd0,-9],[0x22e6f4,9]]){const l=new THREE.PointLight(c,42,28);l.position.set(x,4,-6);g.add(l);const l2=new THREE.PointLight(c,12,18);l2.position.set(x*.6,1,6);g.add(l2);}
 return {group:g,bg:new THREE.Color(0x0e0a2a),fog:new THREE.FogExp2(0x1a1044,.016),envCfg:[0x2a2060,0x401050,0x0a0a14,[{c:0xff3bd0,p:[-20,10,-20],i:3,w:16},{c:0x22e6f4,p:[20,10,-20],i:3,w:16}]],
  update(dt,t){for(let i=0;i<nr;i++){const k=i*6,dy=28*dt;rp[k+1]-=dy;rp[k+4]-=dy;if(rp[k+1]<0)resetDrop(i);}rg.attributes.position.needsUpdate=true;
   cars.forEach(c=>{c.position.x+=c.userData.v*dt;if(Math.abs(c.position.x)>70)c.position.x*=-1;});}};
}

/* ---------------- 5. MAGMA CORE ---------------- */
const LAVA_FS=`varying vec2 vUv;uniform float uTime,uGlow;
 float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*nz(p);p*=2.03;a*=.5;}return v;}
 void main(){vec2 p=vUv*9.;float n=fbm(p+fbm(p*1.3-uTime*.05)*1.6+uTime*.04);float vein=1.-smoothstep(0.,.07,abs(n-.5));float vein2=1.-smoothstep(0.,.05,abs(fbm(p*2.1+7.)-.5));
  float v=clamp(vein+vein2*.6,0.,1.)*uGlow;vec3 rock=vec3(.05,.035,.035)+fbm(p*3.)*.05;vec3 lava=mix(vec3(1.,.25,.02),vec3(1.,.8,.25),v);
  gl_FragColor=vec4(mix(rock,lava*2.2,v)+vec3(.35,.06,.01)*smoothstep(.45,.9,fbm(p*.7+uTime*.03))*uGlow*.35,1.);}`;
const LAVA_VS="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}";
function magma(Q){
 const g=new THREE.Group();stars(g,1200);earth(g,60,[30,30,-170]);
 const um=[];const lm=glow=>{const m=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uGlow:{value:glow}},vertexShader:LAVA_VS,fragmentShader:LAVA_FS});um.push(m);return m;};
 const fl=mesh(new THREE.CircleGeometry(10.6,48),lm(.85),g,0,0,0);fl.rotation.x=-Math.PI/2;
 const sh=mesh(new THREE.CircleGeometry(10.6,48),new THREE.ShadowMaterial({opacity:.55}),g,0,.01,0);sh.rotation.x=-Math.PI/2;sh.receiveShadow=true;
 const rv=mesh(new THREE.PlaneGeometry(260,260),lm(1.5),g,0,-.9,0);rv.rotation.x=-Math.PI/2;
 const rockM=new THREE.MeshStandardMaterial({color:0x1c1210,roughness:.9,metalness:.1,flatShading:true});
 for(let i=0;i<Math.floor(34*Math.max(.6,Q.parts));i++){const a=rnd(.02,.98)*Math.PI,r=rnd(13,48),s=rnd(2,7),m=mesh(jitter(new THREE.IcosahedronGeometry(s,1),s*.35),rockM,g,Math.cos(a)*r,s*.3-.6,-Math.sin(a)*r);m.scale.y=rnd(.6,1.4);m.castShadow=Q.shadow;}
 const cr=cv(256,256,(x,w,h)=>{x.fillStyle="#1a0e0c";x.fillRect(0,0,w,h);x.strokeStyle="#ff7a1a";x.shadowColor="#ff5a0a";x.shadowBlur=8;for(let i=0;i<26;i++){x.lineWidth=rnd(2,5);x.beginPath();let px=rnd(0,w),py=rnd(0,h);x.moveTo(px,py);for(let k=0;k<5;k++){px+=rnd(-40,40);py+=rnd(-40,40);x.lineTo(px,py);}x.stroke();}});
 const fm=new THREE.MeshStandardMaterial({color:0x2a1812,roughness:.85,flatShading:true,emissiveMap:tx(cr),emissive:0xff6a1a,emissiveIntensity:1.4});
 const fr=[];for(let i=0;i<Math.floor(16*Math.max(.5,Q.parts));i++){const s=rnd(.8,2.6),m=mesh(jitter(new THREE.IcosahedronGeometry(s,1),s*.3),fm,g,rnd(-28,28),rnd(4,20),rnd(-45,-10));m.userData={sp:rnd(-.3,.3),y:m.position.y,ph:rnd(0,6)};fr.push(m);}
 const ne=Math.floor(320*Q.parts),eb=new Float32Array(ne*3),ep=new Float32Array(ne*3);for(let i=0;i<ne;i++)eb.set([rnd(-22,22),rnd(0,16),rnd(-18,12)],i*3);ep.set(eb);
 const eg=new THREE.BufferGeometry();eg.setAttribute("position",new THREE.BufferAttribute(ep,3));
 g.add(new THREE.Points(eg,new THREE.PointsMaterial({size:.22,map:glowTex(),color:new THREE.Color(0xff8a2a).multiplyScalar(2.2),transparent:true,blending:AD,depthWrite:false})));
 g.add(new THREE.HemisphereLight(0x4a3a6a,0x4a1408,.7));
 dirLight(g,Q,0xffc8a0,2.2,[-8,12,8],true);dirLight(g,Q,0x5a8aff,1.4,[-8,8,-14]);
 for(const[x,z] of[[-8,3],[8,3],[0,-8],[0,8]]){const l=new THREE.PointLight(0xff5a1a,30,22);l.position.set(x,.6,z);g.add(l);}
 return {group:g,bg:new THREE.Color(0x14060a),fog:new THREE.FogExp2(0x2a0c08,.014),envCfg:[0x2a1a3a,0x501808,0x200800,[{c:0xff6a1a,p:[0,-5,-20],i:3,w:30},{c:0x6a9aff,p:[-25,15,-20],i:2.5,w:16}]],
  update(dt,t){um.forEach(m=>m.uniforms.uTime.value=t);fr.forEach(m=>{m.rotation.x+=m.userData.sp*dt;m.rotation.y+=m.userData.sp*.6*dt;m.position.y=m.userData.y+Math.sin(t*.35+m.userData.ph)*.7;});
   for(let i=0;i<ne;i++){eb[i*3+1]+=dt*(.6+(i%5)*.25);if(eb[i*3+1]>18)eb[i*3+1]=0;ep[i*3]=eb[i*3]+Math.sin(t*.8+i)*.6;ep[i*3+1]=eb[i*3+1];ep[i*3+2]=eb[i*3+2];}eg.attributes.position.needsUpdate=true;}};
}

/* =====================================================================
   v5: shared helpers for the new stages + volumetric light shafts
   ===================================================================== */
function skyDome(g,top,mid,bot){
 const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{t:{value:new THREE.Color(top)},m:{value:new THREE.Color(mid)},b:{value:new THREE.Color(bot)}},
  vertexShader:"varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader:"uniform vec3 t,m,b;varying vec3 p;void main(){float h=p.y;vec3 c=h>0.?mix(m,t,pow(h,.55)):mix(m,b,pow(-h,.5));gl_FragColor=vec4(c,1.);}"});
 const s=new THREE.Mesh(new THREE.SphereGeometry(240,32,16),m);g.add(s);return s;}
function sunGlow(g,color,pos,size){
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:new THREE.Color(color).multiplyScalar(2.2),blending:AD,depthWrite:false,fog:false,transparent:true}));
 s.position.set(...pos);s.scale.set(size,size,1);g.add(s);return s;}
function mountains(g,col,z,y,w,h,seed){
 const c=cv(1024,256,(x,W,H)=>{x.clearRect(0,0,W,H);x.fillStyle="#fff";x.beginPath();x.moveTo(0,H);for(let i=0;i<=24;i++)x.lineTo(i*W/24,H*(.25+.6*(hsh(i*1.7,seed,0,1)+.5)));x.lineTo(W,H);x.closePath();x.fill();});
 return mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx(c),color:col,transparent:true,depthWrite:false,fog:false}),g,0,y,z);}
/* soft light beams (god rays). list: {from:[x,y,z],to:[x,y,z],w,len,k} */
function shafts(g,color,list,op=.05){
 const out=[];
 for(const s of list){const len=s.len||26,w=s.w||3.4,geo=new THREE.CylinderGeometry(.25,w,len,18,1,true).translate(0,-len/2,0),m=beamM(color,op*(s.k||1)),piv=new THREE.Mesh(geo,m);
  aim(piv,new V(...s.from),new V(...s.to));g.add(piv);out.push({m,base:op*(s.k||1),ph:Math.random()*6});}
 return out;}
const pulseShafts=(arr,t)=>{for(const s of arr)s.m.opacity=s.base*(.75+.25*Math.sin(t*.6+s.ph));};
/* particle field that wraps inside a box [x0,x1,y0,y1,z0,z1]. vy>0 falls, vy<0 rises */
function fallField(g,n,box,o){
 const base=new Float32Array(n*3),pos=new Float32Array(n*3);
 for(let i=0;i<n;i++)base.set([rnd(box[0],box[1]),rnd(box[2],box[3]),rnd(box[4],box[5])],i*3);pos.set(base);
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
 g.add(new THREE.Points(geo,new THREE.PointsMaterial({size:o.size,map:o.map,color:o.color,transparent:true,opacity:o.op??.9,depthWrite:false})));
 return (dt,t)=>{
  for(let i=0;i<n;i++){const k=i*3;base[k+1]-=dt*o.vy*(.6+(i%7)*.12);base[k]+=dt*o.vx*(.7+(i%5)*.1);
   if(base[k+1]<box[2])base[k+1]=box[3];else if(base[k+1]>box[3])base[k+1]=box[2];
   if(base[k]>box[1])base[k]=box[0];else if(base[k]<box[0])base[k]=box[1];
   pos[k]=base[k]+Math.sin(t*o.sway+i)*.5;pos[k+1]=base[k+1];pos[k+2]=base[k+2]+Math.cos(t*o.sway*.8+i)*.35;}
  geo.attributes.position.needsUpdate=true;};}
function brazier(g,x,z,sc,fl,lamps,col=0xff8a3a){
 const stone=STD(0x4a4038,.8,.1),flame=glowM(0xff9a3a,2.6);
 mesh(new THREE.CylinderGeometry(.45*sc,.3*sc,1.3*sc,8),stone,g,x,.65*sc,z);mesh(new THREE.CylinderGeometry(.8*sc,.48*sc,.5*sc,10),STD(0x2a2020,.5,.6),g,x,1.5*sc,z);
 for(let k=0;k<3;k++)fl.push(mesh(new THREE.ConeGeometry((.34-k*.06)*sc,(1+k*.4)*sc,6).translate(0,.5*sc,0),flame,g,x+(k-1)*.14*sc,1.7*sc,z));
 const l=new THREE.PointLight(col,30,20,2);l.position.set(x,2.5*sc,z);g.add(l);lamps.push(l);}
const flick=(fl,lamps,t)=>{fl.forEach((f,i)=>{f.scale.y=.85+.3*Math.sin(t*9+i*2)*Math.sin(t*5+i);f.scale.x=f.scale.z=.9+.15*Math.sin(t*12+i);});lamps.forEach((l,i)=>l.intensity=29+Math.sin(t*7+i*3)*3+Math.sin(t*17+i)*2);};

/* ---------------- 6. SAKURA DOJO (courtyard at sunset) ---------------- */
function sakura(Q){
 const g=new THREE.Group();
 skyDome(g,0x2a1650,0xff8a62,0x3a2030);sunGlow(g,0xffb070,[-60,24,-200],130);sunGlow(g,0xfff0d0,[-60,24,-200],40);
 mountains(g,0x6a3a6a,-170,28,520,110,3);mountains(g,0x8a4a70,-135,20,420,80,7);
 // wooden fighting deck
 const wood=cv(1024,640,(x,w,h)=>{const n=12,ph=h/n;for(let i=0;i<n;i++){x.fillStyle=`hsl(${24+Math.random()*6},${45+Math.random()*10}%,${34+Math.random()*10}%)`;x.fillRect(0,i*ph,w,ph);
   for(let k=0;k<36;k++){x.strokeStyle=`rgba(40,20,5,${.04+Math.random()*.1})`;x.lineWidth=1;const y=i*ph+Math.random()*ph;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(w*.3,y+rnd(-3,3),w*.6,y+rnd(-3,3),w,y+rnd(-3,3));x.stroke();}
   x.fillStyle="rgba(20,10,0,.6)";x.fillRect(0,i*ph,w,2);x.fillRect(Math.random()*w,i*ph,2,ph);}
  x.strokeStyle="rgba(245,235,215,.55)";x.lineWidth=7;x.beginPath();x.ellipse(w/2,h/2,300,190,0,0,6.283);x.stroke();x.lineWidth=3;x.beginPath();x.ellipse(w/2,h/2,270,165,0,0,6.283);x.stroke();});
 const deck=mesh(new THREE.BoxGeometry(24,.5,15),STD(0xffffff,.5,0,{map:tx(wood),bumpMap:tx(wood,null,false),bumpScale:.8}),g,0,-.25,0);deck.receiveShadow=true;
 mesh(new THREE.BoxGeometry(25,.35,16),STD(0x2a1a12,.7),g,0,-.55,0).receiveShadow=true;
 // raked gravel garden
 const gr=cv(512,512,(x,w,h)=>{x.fillStyle="#b9b2a8";x.fillRect(0,0,w,h);for(let i=0;i<30;i++){x.strokeStyle=`rgba(255,255,255,${.12+Math.random()*.1})`;x.lineWidth=2;circ(x,256,256,10+i*8);}for(let i=0;i<2500;i++){x.fillStyle=`rgba(0,0,0,${Math.random()*.12})`;x.fillRect(rnd(0,w),rnd(0,h),2,2);}});
 const garden=mesh(new THREE.CircleGeometry(90,48),STD(0xffffff,.95,0,{map:tx(gr,[7,7])}),g,0,-.62,0);garden.rotation.x=-Math.PI/2;garden.receiveShadow=true;
 // dojo hall
 const wd=STD(0x3a2418,.6),stone=STD(0x6a655e,.9);
 mesh(new THREE.BoxGeometry(34,1,9),stone,g,0,-.1,-17.5);
 for(let i=0;i<9;i++){const p=mesh(new THREE.CylinderGeometry(.34,.38,6.4,10),wd,g,-14+i*3.5,3.6,-13.5);p.castShadow=Q.shadow;}
 mesh(new THREE.BoxGeometry(34,.5,.6),wd,g,0,6.9,-13.5);
 const roof=mesh(new THREE.BoxGeometry(38,.7,12),STD(0x23232e,.55,.2),g,0,8.2,-15.5);roof.rotation.x=.2;roof.castShadow=Q.shadow;
 mesh(new THREE.BoxGeometry(38,.5,1.2),STD(0x181820,.5,.3),g,0,9.5,-18.4);
 const lat=cv(512,256,(x,w,h)=>{x.fillStyle="#f3e2bd";x.fillRect(0,0,w,h);x.strokeStyle="#3a2418";x.lineWidth=5;for(let i=0;i<=8;i++){x.beginPath();x.moveTo(i*w/8,0);x.lineTo(i*w/8,h);x.stroke();}for(let j=0;j<=4;j++){x.beginPath();x.moveTo(0,j*h/4);x.lineTo(w,j*h/4);x.stroke();}});
 mesh(new THREE.PlaneGeometry(30,5.6),STD(0xffffff,.8,0,{map:tx(lat,[3,1]),emissiveMap:tx(lat,[3,1]),emissive:0xffa860,emissiveIntensity:.85}),g,0,3.5,-17.4);
 const lamps=[];
 for(let i=0;i<6;i++){const x=-12.5+i*5;mesh(new THREE.CylinderGeometry(.02,.02,1,4),wd,g,x,6.2,-12.3);const b=mesh(new THREE.SphereGeometry(.42,12,10),glowM(0xff8a3a,2.4),g,x,5.5,-12.3);b.scale.y=1.25;}
 for(const x of[-8,8]){const l=new THREE.PointLight(0xff9a4a,16,16,2);l.position.set(x,5,-11);g.add(l);lamps.push(l);}
 // torii gate far behind
 const red=STD(0xc4301c,.5);for(const s of[-1,1])mesh(new THREE.CylinderGeometry(.55,.65,10,12),red,g,s*7,5,-36);
 mesh(new THREE.BoxGeometry(17,.9,1.3),STD(0x1a1414,.5),g,0,10.3,-36);mesh(new THREE.BoxGeometry(13,.6,.9),red,g,0,8.4,-36);
 // cherry trees
 const pinks=[0xf5a0bc,0xffc2d4,0xe888a8,0xffb3c8].map(c=>STD(c,.85,0,{flatShading:true,emissive:0x501830,emissiveIntensity:.25})),bark=STD(0x3a2820,.9);
 const tree=(x,z,s)=>{const t=new THREE.Group();t.position.set(x,-.5,z);g.add(t);mesh(new THREE.CylinderGeometry(.35*s,.6*s,4.2*s,7),bark,t,0,2.1*s,0).castShadow=Q.shadow;
  for(let k=0;k<3;k++){const b=mesh(new THREE.CylinderGeometry(.12*s,.22*s,2.6*s,5),bark,t,(k-1)*.9*s,4.4*s,rnd(-.3,.3));b.rotation.z=(k-1)*-.7;}
  const n=Math.max(4,Math.floor(8*Math.max(.6,Q.parts)));for(let k=0;k<n;k++){const r=rnd(1.4,2.4)*s;mesh(jitter(new THREE.IcosahedronGeometry(r,1),r*.18),pinks[k%4],t,rnd(-2.6,2.6)*s,rnd(4.4,6.6)*s,rnd(-2,2)*s);}};
 [[-15,-5,1.1],[-19,-14,1.3],[-13,-24,1.2],[15.5,-6,1.15],[19,-15,1.3],[12,-26,1.2],[-26,-4,1.4],[27,-5,1.4]].forEach(a=>tree(...a));
 // stone lanterns on the deck corners
 const st2=STD(0x8a8780,.9);
 for(const s of[-1,1]){const x=s*13.2,z=3.5;mesh(new THREE.BoxGeometry(.9,.5,.9),st2,g,x,.25,z);mesh(new THREE.CylinderGeometry(.18,.22,1.2,8),st2,g,x,1.1,z);mesh(new THREE.BoxGeometry(.9,.8,.9),st2,g,x,2,z);mesh(new THREE.BoxGeometry(.5,.55,.5),glowM(0xffa050,2.2),g,x,2,z);mesh(new THREE.ConeGeometry(.9,.6,4).rotateY(Math.PI/4),st2,g,x,2.7,z);
  const l=new THREE.PointLight(0xffa050,9,10,2);l.position.set(x,2,z);g.add(l);lamps.push(l);}
 // petals on the ground
 const np=Math.floor(260*Q.parts);
 if(np>0){const im=new THREE.InstancedMesh(new THREE.PlaneGeometry(.2,.13),new THREE.MeshBasicMaterial({color:0xffb0c8,side:THREE.DoubleSide}),np),dm=new THREE.Object3D();
  for(let i=0;i<np;i++){const d=Math.random()<.55;dm.position.set(d?rnd(-11,11):rnd(-30,30),d?.012:-.6,d?rnd(-7,7):rnd(-25,8));dm.rotation.set(-Math.PI/2,0,rnd(0,6.28));dm.updateMatrix();im.setMatrixAt(i,dm.matrix);}
  im.instanceMatrix.needsUpdate=true;g.add(im);}
 // lighting: low backlit sun (long shadows), pink bounce, soft front fill
 g.add(new THREE.HemisphereLight(0xffb0a0,0x3a2438,.7));
 dirLight(g,Q,0xffa458,2.6,[-16,7,-12],true);dirLight(g,Q,0xffe0d0,1.1,[6,8,14]);
 const sh=shafts(g,0xffc080,[{from:[-24,18,-22],to:[-4,0,-2],w:3.6},{from:[-18,20,-20],to:[2,0,0],w:3},{from:[-30,16,-16],to:[-10,0,2],w:4}],.09);
 const petal=tx(cv(64,64,(x)=>{x.translate(32,32);x.rotate(.5);const gr2=x.createRadialGradient(0,0,2,0,0,26);gr2.addColorStop(0,"#fff0f4");gr2.addColorStop(1,"rgba(255,150,185,0)");x.fillStyle=gr2;x.beginPath();x.ellipse(0,0,26,14,0,0,6.283);x.fill();}));
 const fall=fallField(g,Math.floor(380*Q.parts),[-28,28,0,16,-30,10],{size:.3,map:petal,color:0xffd0dc,vy:1.1,vx:1.4,sway:1.3,op:.95});
 return {group:g,bg:new THREE.Color(0x5a2a4a),fog:new THREE.FogExp2(0xe39a8a,.0085),
  envCfg:[0x2a1650,0xff9a6a,0x3a2030,[{c:0xffa060,p:[-20,6,-20],i:3,w:18},{c:0xff80c0,p:[20,8,-10],i:1.5,w:10}]],
  update(dt,t){fall(dt,t);pulseShafts(sh,t);lamps.forEach((l,i)=>{l.intensity=(i<2?16:9)+Math.sin(t*5+i*2)*1.4+Math.sin(t*11+i)*.7;});}};
}

/* ---------------- 7. FROZEN SANCTUM (snow peak monastery, blizzard) ---------------- */
function frozen(Q){
 const g=new THREE.Group();
 skyDome(g,0x2a4e78,0xa6cde6,0xeaf4fa);sunGlow(g,0xcfe8ff,[40,60,-190],90);
 // aurora
 const aur=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:false,side:THREE.DoubleSide,blending:AD,uniforms:{uTime:{value:0}},
  vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader:"uniform float uTime;varying vec2 vUv;void main(){float w=sin(vUv.x*6.+uTime*.4+sin(vUv.x*13.+uTime*.7)*.6)*.5+.5;float a=smoothstep(0.,.6,vUv.y)*smoothstep(1.,.4,vUv.y)*w;vec3 c=mix(vec3(.1,1.,.6),vec3(.45,.4,1.),vUv.y);gl_FragColor=vec4(c*a*.7,a);}"});
 mesh(new THREE.PlaneGeometry(320,80),aur,g,0,72,-175);
 // icy rune platform
 const draw=(x,w,h,emissive)=>{
  if(!emissive){x.fillStyle="#5d6b7d";x.fillRect(0,0,w,h);for(let i=0;i<900;i++){x.fillStyle=`rgba(${190+Math.random()*50|0},${215+Math.random()*30|0},255,${Math.random()*.1})`;x.fillRect(rnd(0,w),rnd(0,h),rnd(4,40),rnd(2,12));}
   x.strokeStyle="rgba(20,30,45,.55)";x.lineWidth=3;for(let i=0;i<=8;i++){x.beginPath();x.moveTo(i*w/8,0);x.lineTo(i*w/8,h);x.moveTo(0,i*h/8);x.lineTo(w,i*h/8);x.stroke();}}
  else{x.fillStyle="#000";x.fillRect(0,0,w,h);}
  x.strokeStyle=emissive?"#4ac8ff":"#9fd8ff";x.lineWidth=7;x.shadowColor="#4ac8ff";x.shadowBlur=emissive?0:12;for(const r of[120,240,345,440])circ(x,512,512,r);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;x.beginPath();x.moveTo(512+Math.cos(a)*120,512+Math.sin(a)*120);x.lineTo(512+Math.cos(a)*440,512+Math.sin(a)*440);x.stroke();}x.shadowBlur=0;
  if(!emissive){x.fillStyle="rgba(235,246,255,.7)";for(let i=0;i<90;i++){const a=rnd(0,6.283),r=rnd(405,520);x.beginPath();x.arc(512+Math.cos(a)*r,512+Math.sin(a)*r,rnd(10,40),0,6.283);x.fill();}}};
 const ft=cv(1024,1024,(x,w,h)=>draw(x,w,h,false)),fe=cv(1024,1024,(x,w,h)=>draw(x,w,h,true));
 const plat=mesh(new THREE.CylinderGeometry(11.6,11.9,.6,64),STD(0xffffff,.3,.12,{map:tx(ft),bumpMap:tx(ft,null,false),bumpScale:.5,emissiveMap:tx(fe),emissive:0xffffff,emissiveIntensity:.3}),g,0,-.3,0);plat.receiveShadow=true;
 const sn=cv(512,512,(x,w,h)=>{x.fillStyle="#dfeaf4";x.fillRect(0,0,w,h);for(let i=0;i<2200;i++){x.fillStyle=`rgba(${Math.random()<.5?"255,255,255":"150,175,205"},${Math.random()*.16})`;x.fillRect(rnd(0,w),rnd(0,h),rnd(2,9),rnd(2,6));}});
 const plain=mesh(new THREE.CircleGeometry(140,48),STD(0xffffff,.9,0,{map:tx(sn,[14,14]),bumpMap:tx(sn,[14,14],false),bumpScale:.6}),g,0,-.45,0);plain.rotation.x=-Math.PI/2;plain.receiveShadow=true;
 // mountains
 const mt=STD(0xdfe9f4,.8,0,{flatShading:true});
 for(let i=0;i<14;i++){const a=rnd(.1,.9)*Math.PI,r=rnd(75,140),h=rnd(30,70);mesh(jitter(new THREE.ConeGeometry(rnd(18,34),h,6,3),3),mt,g,Math.cos(a)*r*1.3,h/2-3,-Math.sin(a)*r);}
 // stone pillars ring + prayer flags
 const stoneM=STD(0x7d8998,.7,.05,{flatShading:true}),snowM=STD(0xf4faff,.8),P=[];
 for(let i=0;i<9;i++){const a=Math.PI*(.08+i*.105),x=Math.cos(a)*17,z=-Math.sin(a)*13-2;mesh(new THREE.CylinderGeometry(.8,1,7.5,8),stoneM,g,x,3.7,z).castShadow=Q.shadow;mesh(new THREE.CylinderGeometry(1,.8,.5,8),snowM,g,x,7.7,z);P.push([x,z]);}
 const flagCols=[0x3a7bd5,0xf4f4f4,0xd8332a,0x3cae5a,0xf0c030],flags=[];
 for(let s=0;s<8;s+=2){const[xa,za]=P[s],[xb,zb]=P[s+1],th=-Math.atan2(zb-za,xb-xa);
  for(let k=0;k<10;k++){const t=k/9,f=mesh(new THREE.PlaneGeometry(.55,.45),STD(flagCols[k%5],.8,0,{side:THREE.DoubleSide,emissive:flagCols[k%5],emissiveIntensity:.12}),g,xa+(xb-xa)*t,7.3-Math.sin(t*Math.PI)*.9,za+(zb-za)*t);f.rotation.y=th;f.userData={r:th,ph:k+s};flags.push(f);}}
 // gate + pagoda
 for(const s of[-1,1])mesh(new THREE.BoxGeometry(2.2,12,2.2),stoneM,g,s*8,6,-20);
 mesh(new THREE.BoxGeometry(20,1.6,2.6),stoneM,g,0,12.6,-20);mesh(new THREE.BoxGeometry(21,.6,3),snowM,g,0,13.6,-20);
 for(let k=0;k<4;k++){const w=14-k*2.6;mesh(new THREE.BoxGeometry(w,3,w),STD(0x7a2a2a,.7),g,0,3+k*4.6,-42);mesh(new THREE.ConeGeometry(w*.95,2,4).rotateY(Math.PI/4),STD(0x2a2428,.6),g,0,5.3+k*4.6,-42);mesh(new THREE.PlaneGeometry(w*.4,1.6),glowM(0xffb060,1.8),g,0,3+k*4.6,-42+w/2+.06);}
 // braziers (warm) vs ice crystals (cold)
 const fl=[],lamps=[];brazier(g,-9.5,-5,1,fl,lamps);brazier(g,9.5,-5,1,fl,lamps);
 const iceM=STD(0xa8ecff,.12,.1,{emissive:0x2ab8ff,emissiveIntensity:.4,transparent:true,opacity:.88});
 for(let i=0;i<18;i++){const a=rnd(0,6.283),r=rnd(12.8,17),x=Math.cos(a)*r,z=Math.sin(a)*r*.8;if(z>2)continue;const h=rnd(1.4,3.6),m=mesh(new THREE.ConeGeometry(rnd(.35,.7),h,6).translate(0,h/2,0),iceM,g,x,-.4,z);m.rotation.set(rnd(-.3,.3),0,rnd(-.3,.3));}
 for(const s of[-1,1]){const l=new THREE.PointLight(0x4ac8ff,12,22,2);l.position.set(s*11,1.4,-6);g.add(l);}
 // ground mist
 const mistT=tx(cv(256,256,(x,w,h)=>{x.clearRect(0,0,w,h);blobs(x,w,h,40,["#ffffff"],20,70,.35);})),mists=[];
 for(let k=0;k<3;k++){const m=mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshBasicMaterial({map:mistT,transparent:true,opacity:.08,depthWrite:false,color:0xdff0ff}),g,0,.1+k*.25,-2);m.rotation.x=-Math.PI/2;mists.push(m);}
 g.add(new THREE.HemisphereLight(0xd8ecff,0x4a5a70,.6));dirLight(g,Q,0xf0f6ff,1.9,[-8,13,9],true);dirLight(g,Q,0x7ad8ff,1.2,[9,8,-15]);
 const sh=shafts(g,0xbfe6ff,[{from:[-12,24,-18],to:[-2,0,0],w:4},{from:[10,24,-16],to:[4,0,-2],w:3.6}],.06);
 const snow=fallField(g,Math.floor(900*Q.parts),[-24,24,0,16,-28,12],{size:.12,map:glowTex(),color:0xe6f0fa,vy:4.2,vx:-3.5,sway:2,op:.55});
 return {group:g,bg:new THREE.Color(0x6f94b0),fog:new THREE.FogExp2(0x8fb0c8,.011),
  envCfg:[0x3a6a98,0xa6cde6,0x6f8096,[{c:0xdff0ff,p:[0,18,-18],i:3,w:20},{c:0x4ac8ff,p:[16,4,-10],i:2,w:10}]],
  update(dt,t){snow(dt,t);aur.uniforms.uTime.value=t;pulseShafts(sh,t);flick(fl,lamps,t);flags.forEach(f=>{f.rotation.y=f.userData.r+Math.sin(t*3+f.userData.ph)*.28;f.rotation.z=Math.sin(t*4+f.userData.ph)*.12;});mists.forEach((m,i)=>{m.rotation.z+=dt*.02*(i+1);});}};
}

/* ---------------- 8. SAND COLOSSEUM (ancient arena, high noon) ---------------- */
function colosseum(Q){
 const g=new THREE.Group();
 skyDome(g,0x2f7ad6,0x9ccbf0,0xf1e2c0);sunGlow(g,0xfff0c0,[70,110,-120],110);sunGlow(g,0xffffff,[70,110,-120],36);
 const sand=cv(1024,1024,(x,w,h)=>{x.fillStyle="#d4ae78";x.fillRect(0,0,w,h);
  for(let i=0;i<70;i++){x.strokeStyle=`rgba(${Math.random()<.5?"255,240,200":"120,80,40"},${.05+Math.random()*.1})`;x.lineWidth=rnd(2,6);const y=rnd(0,h);x.beginPath();x.moveTo(0,y);for(let k=1;k<=8;k++)x.lineTo(k*w/8,y+Math.sin(k*1.3+i)*rnd(4,14));x.stroke();}
  for(let i=0;i<2600;i++){x.fillStyle=`rgba(${Math.random()<.5?"90,60,30":"255,245,210"},${Math.random()*.14})`;x.fillRect(rnd(0,w),rnd(0,h),rnd(1,3),rnd(1,3));}
  x.strokeStyle="rgba(110,70,30,.55)";x.lineWidth=10;circ(x,512,512,430);x.lineWidth=5;circ(x,512,512,360);x.setLineDash([22,16]);circ(x,512,512,200);x.setLineDash([]);
  x.save();x.translate(512,512);x.strokeStyle="rgba(110,70,30,.5)";x.lineWidth=6;for(let i=0;i<12;i++){x.rotate(Math.PI/6);x.beginPath();x.moveTo(60,0);x.lineTo(150,0);x.stroke();}x.restore();});
 const fl0=mesh(new THREE.CircleGeometry(12.6,64),STD(0xffffff,1,0,{map:tx(sand),bumpMap:tx(sand,null,false),bumpScale:1.2}),g);fl0.rotation.x=-Math.PI/2;fl0.receiveShadow=true;
 const out=mesh(new THREE.CircleGeometry(40,48),STD(0xcfa96f,1),g,0,-.03,0);out.rotation.x=-Math.PI/2;out.receiveShadow=true;
 // wall with arches
 const blk=cv(1024,256,(x,w,h)=>{x.fillStyle="#c9a574";x.fillRect(0,0,w,h);const rows=4,rh=h/rows;for(let r=0;r<rows;r++){let px=(r%2)*40;while(px<w){const bw=rnd(70,130);x.fillStyle=`hsl(${34+Math.random()*6},${40+Math.random()*10}%,${58+Math.random()*10}%)`;x.fillRect(px+2,r*rh+2,bw-4,rh-4);px+=bw;}}x.fillStyle="rgba(60,40,20,.5)";for(let r=0;r<=rows;r++)x.fillRect(0,r*rh,w,2);});
 const blkM=STD(0xffffff,.95,0,{map:tx(blk,[10,1]),side:THREE.DoubleSide});
 mesh(new THREE.CylinderGeometry(19,19,5.5,72,1,true),blkM,g,0,2.75,0).receiveShadow=true;
 mesh(new THREE.CylinderGeometry(19.4,19.4,.6,72,1,true),STD(0x9a7a50,.9,0,{side:THREE.DoubleSide}),g,0,5.7,0);
 const arch=tx(cv(128,192,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle="#1a0f08";x.beginPath();x.moveTo(8,h);x.lineTo(8,70);x.arc(64,70,56,Math.PI,0);x.lineTo(120,h);x.closePath();x.fill();}));
 for(let i=0;i<9;i++){const a=Math.PI*(.12+i*.095),p=mesh(new THREE.PlaneGeometry(3.4,4.6),new THREE.MeshBasicMaterial({map:arch,transparent:true,depthWrite:false}),g,Math.cos(a)*18.85,2.3,-Math.sin(a)*18.85);p.lookAt(0,2.3,0);}
 // stands + crowd
 const tierM=STD(0xb8956a,.95,0,{side:THREE.DoubleSide}),tiers=[];
 for(let t=0;t<6;t++){const r=19.5+t*2.6,h=5.5+t*1.5;mesh(new THREE.CylinderGeometry(r,r,h,72,1,true),tierM,g,0,h/2,0);const ring=mesh(new THREE.RingGeometry(r-2.6,r,72),tierM,g,0,h,0);ring.rotation.x=-Math.PI/2;tiers.push({r,h});}
 const nC=Math.min(Q.crowd,700);
 if(nC>0){const im=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.22,.5,3,6),STD(0xffffff,.9),nC),dm=new THREE.Object3D(),cc=new THREE.Color(),pal=[0xc83a2a,0xf0c030,0xffffff,0x2a5ad0,0x8a5a30,0x3a3a3a];
  for(let i=0;i<nC;i++){const T=tiers[Math.floor(Math.random()*6)],a=rnd(-.1,1.1)*Math.PI,ro=T.r-1.3;dm.position.set(Math.cos(a)*ro,T.h+.5,-Math.sin(a)*ro);dm.scale.setScalar(rnd(.9,1.2));dm.updateMatrix();im.setMatrixAt(i,dm.matrix);cc.setHex(pick(pal));im.setColorAt(i,cc);}
  im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;g.add(im);}
 // banners
 const ban=[];
 for(let i=0;i<8;i++){const a=Math.PI*(.1+i*.11),b=mesh(new THREE.PlaneGeometry(1.5,3.4),STD(i%2?0xc83a2a:0xe0a830,.8,0,{side:THREE.DoubleSide,emissive:i%2?0x401008:0x402a00,emissiveIntensity:.3}),g,Math.cos(a)*18.6,3.9,-Math.sin(a)*18.6);b.lookAt(0,3.9,0);b.userData={ph:i,ry:b.rotation.y};ban.push(b);}
 // colossal statues + obelisks
 const sandS=STD(0xc9a370,.9,0,{flatShading:true}),gold=STD(0xd8a830,.35,.8,{emissive:0x402a00,emissiveIntensity:.3});
 for(const s of[-1,1]){const st=new THREE.Group();st.position.set(s*13.4,0,-8);g.add(st);
  mesh(new THREE.BoxGeometry(5,1.2,5),sandS,st,0,.6,0);mesh(new THREE.BoxGeometry(3.4,2.6,3.6),sandS,st,0,2.5,0);mesh(new THREE.BoxGeometry(3,4.2,2.2),sandS,st,0,5.9,-.3);
  for(const k of[-1,1])mesh(new THREE.BoxGeometry(.9,.9,3),sandS,st,k*1.7,3.6,1.6);
  mesh(new THREE.BoxGeometry(1.6,1.9,1.6),sandS,st,0,8.6,-.3);mesh(new THREE.BoxGeometry(2.4,1.3,2.1),gold,st,0,9.4,-.3);mesh(new THREE.BoxGeometry(3.2,.3,.5),gold,st,0,7.6,.8);
  st.lookAt(0,0,0);st.children.forEach(c=>{if(c.castShadow!==undefined)c.castShadow=Q.shadow;});
  const ob=mesh(new THREE.CylinderGeometry(.35,.9,12,4).rotateY(Math.PI/4),sandS,g,s*5,6,-17.5);mesh(new THREE.ConeGeometry(.5,1.2,4).rotateY(Math.PI/4),gold,g,s*5,12.6,-17.5);}
 const gate=mesh(new THREE.PlaneGeometry(7,9),new THREE.MeshBasicMaterial({map:arch,transparent:true,depthWrite:false}),g,0,4.5,-18.7);
 const fl=[],lamps=[];brazier(g,-6.5,-14,1.1,fl,lamps);brazier(g,6.5,-14,1.1,fl,lamps);
 g.add(new THREE.HemisphereLight(0xa8d0ff,0xc8985a,.8));dirLight(g,Q,0xfff0d8,2.6,[13,20,7],true);
 const sh=shafts(g,0xfff0c0,[{from:[-14,22,-18],to:[-4,0,-2],w:3.4},{from:[14,22,-16],to:[5,0,0],w:3.2}],.05);
 const dust=fallField(g,Math.floor(420*Q.parts),[-24,24,.2,9,-22,10],{size:.2,map:glowTex(),color:0xd8b27a,vy:-.05,vx:1.6,sway:.8,op:.35});
 return {group:g,bg:new THREE.Color(0x9ccbf0),fog:new THREE.FogExp2(0xe0c394,.0105),
  envCfg:[0x2f7ad6,0x9ccbf0,0xc8985a,[{c:0xfff0c0,p:[20,25,10],i:3,w:20}]],
  update(dt,t){dust(dt,t);pulseShafts(sh,t);flick(fl,lamps,t);ban.forEach(b=>{b.rotation.y=b.userData.ry+Math.sin(t*1.6+b.userData.ph)*.1;});}};
}

/* extra volumetric light shafts for the original 5 stages (v5 lighting pass) */
const EXTRA_SHAFTS=[
 [[0xff3a3a,[{from:[-9,16,-6],to:[-3,0,0],w:3.2},{from:[9,16,-6],to:[3,0,0],w:3.2}],.06],[0x22d8ff,[{from:[0,17,-9],to:[0,0,-1],w:3.6}],.05]],
 [[0xb8ffe0,[{from:[-8,18,-10],to:[2,0,2],w:3.4},{from:[6,18,-12],to:[-2,0,0],w:3.2},{from:[12,18,-8],to:[6,0,4],w:3}],.07]],
 [[0x9ac0ff,[{from:[0,20,-14],to:[0,0,-2],w:5}],.05]],
 [[0xff5ad8,[{from:[-10,14,-8],to:[-2,0,0],w:3.4}],.06],[0x5ad8ff,[{from:[10,14,-8],to:[2,0,0],w:3.4}],.06]],
 [[0xff7a2a,[{from:[0,16,-10],to:[0,0,-2],w:6}],.07]]
];

const BUILDERS=[neonArena,jungle,lunar,district,magma,sakura,frozen,colosseum];
export function buildStage(i,Q,renderer){
 const s=BUILDERS[i](Q);try{applyRealism(i,s,Q,renderer);}catch(e){console.warn("realism pass skipped",e);}const c=s.envCfg;
 const ex=(EXTRA_SHAFTS[i]||[]).map(([col,list,op])=>shafts(s.group,col,list,op)),upd=s.update;if(ex.length)s.update=(dt,t)=>{upd(dt,t);ex.forEach(a=>pulseShafts(a,t));};
s.env=makeEnv(renderer,c[0],c[1],c[2],c[3]);
 s.dispose=()=>{s.group.traverse(o=>{o.geometry?.dispose();const m=o.material;if(m)(Array.isArray(m)?m:[m]).forEach(x=>{["map","emissiveMap","bumpMap","roughnessMap","normalMap","alphaMap"].forEach(k=>x[k]?.dispose?.());x.dispose();});});s.env?.dispose();};
 return s;
}
