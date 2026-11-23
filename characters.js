import * as THREE from "three";
import {instantiate} from "./models.js";
const M=(c,r=.6,m=0,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,...o});
const add=(p,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;};
const grp=(p,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g;};
const sg=i=>i?-1:1, lerp=(a,b,t)=>a+(b-a)*t;
const ss=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
const L1=.56,L2=.58,FOOT=.13;

/* Built-in jointed fighter (hips > spine > head/arms, hips > legs). Faces +Z. */
export function buildFighter(d){
 const root=new THREE.Group(), b=d.build, gs=d.glove||1;
 const skin=M(d.skin,.5), suit=M(d.color,.55,.08), pants=M(d.pants,.62), trim=M(d.accent,.3,.55), dark=M(0x12141b,.55,.1), hairM=M(d.hair,.4,.15), boot=M(d.boot||0x12141b,.5,.2), white=M(0xf8f8f8,.4);
 const rob=d.robe?{m:M(d.robe[0],.6),t:M(d.robe[1],.35,.6),len:d.robe[2]||.95}:null, sashM=d.sash?M(d.sash,.5):trim;
 const hips=grp(root,0,1.35,0); hips.rotation.order="YXZ";
 add(hips,new THREE.CylinderGeometry(.33*b,.3*b,.32,16),pants,0,0,0,1,1,.74);
 add(hips,new THREE.TorusGeometry(.33*b,.06,8,24),sashM,0,.12,0,1,.74,1).rotation.x=Math.PI/2;
 if(d.sash)for(const s of[-1,1]){const t=add(hips,new THREE.BoxGeometry(.13,.75,.03),sashM,s*.2*b,-.35,-.24*b);t.rotation.z=s*.08;}
 const spine=grp(hips,0,.14,0); spine.rotation.order="YXZ";
 add(spine,new THREE.CylinderGeometry(.47*b,.36*b,.82,18),d.top===1?skin:suit,0,.42,0,1,1,.62);
 if(d.top===1){for(const s of[-1,1])add(spine,new THREE.SphereGeometry(.2*b,12,10),skin,s*.2*b,.6,.2,1,.8,.6);
  if(!d.belly)for(let i=0;i<3;i++)for(const s of[-1,1])add(spine,new THREE.SphereGeometry(.09*b,8,6),skin,s*.1*b,.36-i*.12,.22,1,.7,.5);}
 if(d.belly)add(spine,new THREE.SphereGeometry(.62*b,18,14),skin,0,.12,.14,1,.85,.85);
 if(d.top===0)for(const s of[-1,1]){const l=add(spine,new THREE.BoxGeometry(.07,.55,.02),M(0xf4f4f4,.5),s*.1,.62,.285);l.rotation.z=s*.38;}
 if(d.top===3)add(spine,new THREE.SphereGeometry(.26,12,10,0,6.28,0,2.2),suit,0,.88,-.12,1,.8,1);
 if(d.stripe)for(const s of[-1,1])add(spine,new THREE.BoxGeometry(.05,.72,.3),M(d.stripe,.5),s*.43*b,.44,0);
 if(d.beads)for(let k=0;k<3;k++){const t=add(spine,new THREE.TorusGeometry(.2+k*.035,.02,6,20),trim,0,.8-k*.09,.07,1,1,.8);t.rotation.x=1.25;}
 if(d.scarf){const sc=M(d.scarf,.6);add(spine,new THREE.TorusGeometry(.17,.05,8,16),sc,0,.82,0).rotation.x=Math.PI/2;add(spine,new THREE.BoxGeometry(.2,.8,.04),sc,.12,.38,-.3).rotation.z=.08;}
 if(d.sword===1){const s=add(spine,new THREE.BoxGeometry(.07,1.3,.05),dark,.05,.55,-.34);s.rotation.z=.55;add(spine,new THREE.BoxGeometry(.1,.2,.07),trim,-.38,1.07,-.34).rotation.z=.55;}
 if(d.sword===2)for(let i=0;i<2;i++){const s=add(hips,new THREE.BoxGeometry(.06,.06,1.15),M(0x2a1010,.4,.3),.38*b,.03-i*.1,-.35);s.rotation.y=.12;add(hips,new THREE.BoxGeometry(.09,.09,.22),trim,.38*b+.02,.03-i*.1,.25).rotation.y=.12;}
 add(spine,new THREE.CylinderGeometry(.1,.12,.2,10),skin,0,.86,0);
 const head=grp(spine,0,.92,0); head.rotation.order="YXZ";
 add(head,new THREE.SphereGeometry(.27,24,16),skin,0,.3,0,.92,1.08,1);
 for(const s of[-1,1]){add(head,new THREE.SphereGeometry(.05,8,6),skin,s*.25,.3,0,.6,1,1);
  add(head,new THREE.SphereGeometry(.05,10,8),white,s*.1,.33,.222,1.1,.6,.5).castShadow=false;
  add(head,new THREE.SphereGeometry(.026,8,6),d.lion||d.monkey?M(0xc98a10,.3):dark,s*.1,.33,.252).castShadow=false;
  const br=add(head,new THREE.BoxGeometry(.11,.022,.03),hairM,s*.1,.388,.248);br.rotation.z=s*-.2;}
 add(head,new THREE.BoxGeometry(.05,.09,.05),skin,0,.27,.262);
 add(head,new THREE.BoxGeometry(.1,.016,.02),dark,0,.17,.245);
 if(d.beard)add(head,new THREE.BoxGeometry(.16,.09,.08),hairM,0,.12,.2);
 const hs=d.hs, cap=()=>{const c=add(head,new THREE.SphereGeometry(.29,20,12,0,6.28,0,Math.PI*.46),hairM,0,.31,-.015,.96,1.1,1.04);c.rotation.x=-.25;return c;};
 if(d.helm){add(head,new THREE.SphereGeometry(.31,18,12,0,6.28,0,Math.PI*.62),M(d.color,.35,.55),0,.32,-.01,1,1.05,1.05);
  add(head,new THREE.CylinderGeometry(.3,.37,.2,14,1,true),M(d.color,.4,.4),0,.1,-.06);
  add(head,new THREE.BoxGeometry(.36,.2,.06),M(0x3a1216,.5,.3),0,.15,.225);
  for(const s of[-1,1]){const h=add(head,new THREE.ConeGeometry(.045,.55,6),trim,s*.2,.78,.04);h.rotation.z=-s*.7;}}
 else if(d.lion){add(head,new THREE.SphereGeometry(.47,22,16),M(d.hair,.9),0,.3,-.07,1,1.05,.95);
  add(head,new THREE.SphereGeometry(.14,12,10),M(0xe8c07a,.6),0,.2,.25,1.2,.8,1.1);add(head,new THREE.SphereGeometry(.04,8,6),dark,0,.26,.37);
  for(const s of[-1,1]){add(head,new THREE.BoxGeometry(.03,.07,.02),white,s*.05,.12,.33);add(head,new THREE.SphereGeometry(.07,8,6),skin,s*.2,.58,.02);}}
 else if(d.monkey){add(head,new THREE.SphereGeometry(.17,14,10),M(0xdcae8c,.6),0,.2,.17,1.1,.95,.9);
  for(const s of[-1,1]){add(head,new THREE.SphereGeometry(.11,10,8),skin,s*.31,.32,-.02,.6,1,1);add(head,new THREE.SphereGeometry(.09,8,6),hairM,s*.24,.15,.04);}
  add(head,new THREE.BoxGeometry(.3,.05,.06),M(0x7a4a30,.5),0,.4,.23);}
 else if(hs!==5&&hs!==8)cap();
 if(hs===1)for(let i=0;i<7;i++){const c=add(head,new THREE.ConeGeometry(.07,.22,6),hairM,(i-3)*.08,.6+Math.cos(i-3)*-.03,-.02+((i%2)?.05:-.04));c.rotation.z=(i-3)*-.2;}
 if(hs===2)add(head,new THREE.SphereGeometry(.13,12,10),hairM,0,.64,-.08);
 if(hs===3){const t=add(head,new THREE.CapsuleGeometry(.07,.55,4,8),hairM,0,.3,-.38);t.rotation.x=.5;add(head,new THREE.SphereGeometry(.09,8,6),M(d.accent,.4),0,.52,-.2);}
 if(hs===4)for(let i=0;i<6;i++)add(head,new THREE.BoxGeometry(.06,.2,.12),hairM,0,.6-Math.abs(i-2.5)*.03,.14-i*.07).rotation.x=.2;
 if(hs===6)add(head,new THREE.BoxGeometry(.52,.85,.16),hairM,0,0,-.2).rotation.x=.08;
 if(hs===7)add(head,new THREE.TorusGeometry(.275,.03,6,20),trim,0,.43,0,.95,1,1).rotation.x=Math.PI/2-.1;
 if(hs===8)add(head,new THREE.SphereGeometry(.4,16,12),hairM,0,.45,-.04,1,.95,1);
 if(hs===9){add(head,new THREE.SphereGeometry(.1,10,8),hairM,0,.64,-.05);add(head,new THREE.BoxGeometry(.05,.1,.05),hairM,0,.58,-.05);}
 if(hs===10)for(let i=0;i<11;i++){const a=-1.2+i*.24,t=add(head,new THREE.CapsuleGeometry(.04,.55,4,6),i%3===0?trim:hairM,Math.sin(a)*.28,.12,-.05-Math.cos(a)*.14);t.rotation.z=-a*.18;}
 if(hs===11){for(const s of[-1,1])add(head,new THREE.CapsuleGeometry(.07,.28,4,8),hairM,s*.25,.18,.02);add(head,new THREE.BoxGeometry(.5,.42,.12),hairM,0,.14,-.2);}
 if(d.bun)add(head,new THREE.SphereGeometry(.13,12,10),hairM,0,.64,-.08);
 if(d.band)add(head,new THREE.TorusGeometry(.275,.03,6,20),trim,0,.43,0,.95,1,1).rotation.x=Math.PI/2-.1;
 if(d.streak){const k=add(head,new THREE.BoxGeometry(.05,.34,.05),M(d.streak,.4),-.21,.2,.18);k.rotation.z=.15;}
 if(d.feather){add(head,new THREE.TorusGeometry(.265,.022,6,20),trim,0,.5,0,.95,1,1).rotation.x=Math.PI/2+.1;
  add(head,new THREE.CylinderGeometry(.012,.012,.55,5),M(0x4a6a2a,.6),.02,.86,-.1).rotation.x=-.15;
  add(head,new THREE.SphereGeometry(.07,10,8),M(0x1d8ab8,.3,.3,{emissive:0x0a4a6a,emissiveIntensity:.6}),.02,1.1,-.14,.7,1.3,.4);}
 const J={hips,spine,head,sh:[],el:[],hand:[],th:[],kn:[],an:[],tail:null};
 const sleeve=(d.top===0||d.top===3)?suit:skin;
 for(let i=0;i<2;i++){
  const s=sg(i), sh=grp(spine,s*.56*b,.74,0);
  add(sh,new THREE.SphereGeometry(.19*b,14,12),d.top===1?skin:suit);
  add(sh,new THREE.CapsuleGeometry(.13*b,.4,4,10),sleeve,0,-.26,0);
  const el=grp(sh,0,-.52,0);
  add(el,new THREE.CapsuleGeometry(.115*b,.34,4,10),(d.top===0||d.top===3)?sleeve:skin,0,-.25,0);
  add(el,new THREE.CylinderGeometry(.13*b*gs,.125*b*gs,.18,10),trim,0,-.4,0);
  const hand=grp(el,0,-.52,0); add(hand,new THREE.SphereGeometry(.15*gs,14,12),d.glove?M(d.accent,.35,.1):skin,0,0,0,1,1,1.1);
  J.sh.push(sh);J.el.push(el);J.hand.push(hand);
  const th=grp(hips,s*.19*b,-.08,0), legM=d.short?skin:pants;
  add(th,new THREE.CapsuleGeometry(.17*b,.5,4,12),legM,0,-.3,0);
  if(d.short)add(th,new THREE.CylinderGeometry(.2*b,.22*b,.34,12),pants,0,-.12,0);
  if(d.stripe)add(th,new THREE.BoxGeometry(.045,1,.22),M(d.stripe,.5),s*.175*b,-.4,0);
  if(rob)for(const z of[1,-1]){const p=add(th,new THREE.BoxGeometry(.37*b,rob.len,.045),rob.m,0,.06-rob.len/2,z*.235*b);p.rotation.x=z*-.05;
   add(th,new THREE.BoxGeometry(.37*b,.05,.055),rob.t,0,.1-rob.len,z*.24*b).rotation.x=z*-.05;}
  const kn=grp(th,0,-L1,0);
  add(kn,new THREE.CapsuleGeometry(.13*b,.46,4,10),legM,0,-.3,0);
  const an=grp(kn,0,-L2,0);
  add(an,new THREE.BoxGeometry(.25,.15,.5),boot,0,-.06,.1);
  add(an,new THREE.BoxGeometry(.255,.05,.1),trim,0,-.02,.25);
  J.th.push(th);J.kn.push(kn);J.an.push(an);
 }
 if(d.tail){const fur=M(d.skin,.8);let p=grp(hips,0,-.05,-.3);J.tail=[];
  for(let i=0;i<9;i++){const g=grp(p,0,i?.17:0,0);g.rotation.x=i?.3:-1.95;add(g,new THREE.CapsuleGeometry(.055-i*.003,.15,3,6),fur,0,.09,0);J.tail.push(g);p=g;}}
 root.scale.setScalar(d.tall||1);
 const F={root,j:J,d,baseScale:d.tall||1,isModel:false};
 F.headWorld=v=>{J.head.getWorldPosition(v);v.y+=.3*(d.tall||1);return v;};
 return F;
}

/* Creates a fighter: real 3D model if one is loaded for this id, otherwise the built-in model */
export function makeFighter(d){
 let m;const inst=instantiate(d);
 if(inst){const root=new THREE.Group();root.add(inst.wrap);
  m={root,j:null,d,baseScale:1,isModel:true,mixer:inst.mixer,actions:inst.actions,cur:null,ls:0,
   headWorld(v){v.set(0,inst.height*.93,0).applyMatrix4(root.matrixWorld);return v;}};}
 else m=buildFighter(d);
 return Object.assign(m,{t:Math.random()*6,walk:0,moving:0,stance:-1,lead:0,act:null,actP:0,actHit:.4,actDur:.4,armIdx:0,block:false,stun:0,stunMax:.3,ko:0,win:false,show:false,backward:false,
  hp:100,ghost:100,kv:{x:0,z:0},actT:0,hitDone:false,combo:0,comboT:0,comboDmg:0,aiT:0,aiMode:"chase",rounds:0});
}

/* Animation for real (Mixamo) models: picks a clip from the fighter state and cross-fades */
function animateModel(F,dt){
 const A=F.actions;let want="idle";
 if(F.dead||F.ko>0)want="ko";else if(F.win)want="win";else if(F.stun>0)want="hit";else if(F.act)want=F.act;else if(F.block)want="block";
 else if(F.moving>.12&&!F.show)want=(F.backward&&A.walk_back)?"walk_back":"walk";
 if(!A[want])want=want==="walk_back"?"walk":"idle";
 const re=want==="hit"&&F.stun>F.ls+.02;F.ls=F.stun;
 if((want!==F.cur||re)&&A[want]){
  const n=A[want],p=F.cur&&A[F.cur];n.reset();n.enabled=true;n.setEffectiveWeight(1);
  n.timeScale=(F.act&&want===F.act&&F.actDur)?n.getClip().duration/F.actDur:1;
  n.play();if(p&&p!==n)p.crossFadeTo(n,.12,false);F.cur=want;
 }
 if(want==="walk"&&A.walk)A.walk.timeScale=F.backward?-1:1;
 F.mixer.update(dt);
}

/* Procedural pose + smoothing. Rotation: shoulder/thigh rotation.x negative = swing forward. */
export function animateFighter(F,dt){
 if(F.isModel)return animateModel(F,dt);
 const j=F.j,T={sh:[],el:[],th:[],kn:[],an:[]},L=F.lead,R=1-L,st=F.stance;F.t+=dt;
 const br=Math.sin(F.t*2.6), mv=F.moving;
 T.hips=[.04,st*.5,0];T.spine=[.1+br*.015,0,0];T.head=[-.08,0,0];
 T.sh[L]=[-.85,0,sg(L)*.15];T.el[L]=[-1.9,0,0];
 T.sh[R]=[-.95,0,sg(R)*.1];T.el[R]=[-2.1,0,0];
 T.th[L]=[-.28,0,sg(L)*.1];T.kn[L]=[.5,0,0];T.an[L]=[-.1,0,0];
 T.th[R]=[.22,0,sg(R)*.12];T.kn[R]=[.4,0,0];T.an[R]=[.05,0,0];
 if(F.show){
  T.hips=[0,0,0];T.spine=[.02+br*.012,0,0];T.head=[-.02,0,0];
  for(let i=0;i<2;i++){T.sh[i]=[-.12+br*.02,0,sg(i)*.22];T.el[i]=[-.35,0,0];T.th[i]=[-.04,0,sg(i)*.14];T.kn[i]=[.08,0,0];T.an[i]=[0,0,0];}
 }
 if(mv>.05&&!F.show){
  for(let i=0;i<2;i++){const p=F.walk+(i?Math.PI:0);T.th[i][0]+=Math.sin(p)*.55*mv;T.kn[i][0]+=Math.max(0,Math.cos(p))*.7*mv;}
  T.spine[0]+=.05*mv;
 }
 const a=F.act;
 if(a){
  const p=F.actP,h=F.actHit,A=p<h?ss(0,h,p):1-ss(h,1,p),c=p<h?Math.sin(Math.min(1,p/h)*Math.PI):0;
  if(a==="punch"){const k=F.armIdx,r=1-k;
   T.sh[k]=[lerp(-.9,-1.5,A),0,sg(k)*lerp(.1,-.04,A)];T.el[k]=[lerp(-1.9,-.1,A),0,0];
   T.sh[r]=[-1.0,0,sg(r)*.1];T.el[r]=[-2.1,0,0];
   T.spine[1]=(k===0?-1:1)*.5*A;T.hips[0]=.04+.1*A;T.head[0]=-.1;
  }else if(a==="kick"){const k=R,o=L;
   T.th[k]=[lerp(.22,-1.2,A),0,sg(k)*lerp(.12,.28,A)];T.kn[k]=[lerp(.4,.08,A)+1.2*c,0,0];T.an[k]=[-.6*A,0,0];
   T.hips[0]=.04-.32*A;T.spine[0]=.1-.2*A;
   T.th[o]=[-.28+.32*A,0,sg(o)*.1];T.kn[o]=[.55,0,0];
   T.sh[L]=[-.5,0,sg(L)*(.3+.5*A)];T.el[L]=[-1.2,0,0];T.sh[R]=[-.5,0,sg(R)*(.3+.6*A)];T.el[R]=[-1.0,0,0];
  }else if(a==="heavy"){const k=R,dir=k===0?-1:1,W=c*.8;
   T.hips[1]=st*.5+dir*(-.75*W+.65*A);T.hips[0]=.04+.16*A;T.spine[0]=.1+.3*A;
   T.sh[k]=[-1+1.3*W-.55*A,0,sg(k)*(.1+.9*A)];T.el[k]=[lerp(-2.1,-.5,A)-.4*W,0,0];
   T.kn[L]=[.7,0,0];T.kn[R]=[.55,0,0];
  }
 }else if(F.block){
  for(let i=0;i<2;i++){T.sh[i]=[-1.35,0,sg(i)*-.12];T.el[i]=[-2.55,0,0];T.kn[i][0]+=.2;}
  T.spine[0]=.28;T.head[0]=.12;
 }
 if(F.stun>0){const s=F.stun/F.stunMax;
  T.spine=[-.5*s,0,.12*s];T.hips[0]=-.2*s;T.head=[.55*s,0,0];
  for(let i=0;i<2;i++){T.sh[i]=[-.25,0,sg(i)*.7*s];T.el[i]=[-.7,0,0];}
 }
 if(F.win){T.sh[L]=[-2.9,0,sg(L)*.2];T.el[L]=[-.2,0,0];T.sh[R]=[-.2,0,sg(R)*.2];T.el[R]=[-.5,0,0];T.hips[0]=0;T.spine[0]=-.08;T.head[0]=-.2;T.th[L]=[-.08,0,.1];T.th[R]=[.05,0,-.1];T.kn[L]=[.1,0,0];T.kn[R]=[.1,0,0];}
 if(F.ko>0){const k=F.ko;T.hips[0]=-1.45*k;T.hips[1]=0;T.spine[0]=0;T.head[0]=-.2*k;
  for(let i=0;i<2;i++){T.sh[i]=[-.2*k,0,sg(i)*1.0*k];T.el[i]=[-.4*k,0,0];T.th[i]=[-.1*k,0,sg(i)*.25*k];T.kn[i]=[.2*k,0,0];}}
 const k=F.ko>0?14:F.act?34:F.stun>0?28:F.show?8:13, al=1-Math.exp(-k*dt);
 const ap=(jn,t)=>{const r=jn.rotation;r.x+=(t[0]-r.x)*al;r.y+=(t[1]-r.y)*al;r.z+=(t[2]-r.z)*al;};
 ap(j.hips,T.hips);ap(j.spine,T.spine);ap(j.head,T.head);
 for(let i=0;i<2;i++){ap(j.sh[i],T.sh[i]);ap(j.el[i],T.el[i]);ap(j.th[i],T.th[i]);ap(j.kn[i],T.kn[i]);ap(j.an[i],T.an[i]);}
 if(j.tail)j.tail.forEach((s,i)=>{s.rotation.z=Math.sin(F.t*2.4+i*.55)*.14;});
 const hp=j.hips.rotation.x;let hy=0;
 for(let i=0;i<2;i++){const th=hp+j.th[i].rotation.x,kn=j.kn[i].rotation.x;hy=Math.max(hy,.08+L1*Math.cos(th)+L2*Math.cos(th+kn)+FOOT);}
 hy=lerp(hy,.42,F.ko)+(F.act||F.ko?0:br*.008);
 j.hips.position.y=hy;
}
export function disposeFighter(F){
 if(F.isModel){F.mixer.stopAllAction();F.root.parent?.remove(F.root);return;} // geometry/materials are shared with the loaded model
 F.root.traverse(o=>{if(o.userData.shared)return;o.geometry?.dispose();const m=o.material;if(m)(Array.isArray(m)?m:[m]).forEach(x=>x.dispose());});F.root.parent?.remove(F.root);
}
