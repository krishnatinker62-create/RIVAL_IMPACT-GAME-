/* Stage hazards: telegraphed events that hurt BOTH fighters.
   lava (Magma Core) · laser (Neon Arena) · lightning (Neon District) · meteor (Lunar Abyss) · runes (Jungle Ruins)
   ice (Frozen Sanctum) · sand (Sand Colosseum) · gust (Sakura Dojo: pushes both fighters, no damage)
   Every hazard shows a warning first (glowing circle / blinking line) so a good player can dodge it. */
import * as THREE from "three";
const AD=THREE.AdditiveBlending, rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export const HAZ={
 lava:     {col:0xff6a1a,col2:0xffd36a,r:1.8,dmg:11,warn:1.15,gap:[3.4,5.8],fire:.6,kb:7,stun:.5},
 lightning:{col:0xff6af0,col2:0xb8ecff,r:1.5,dmg:9, warn:.95, gap:[3.8,6.5],fire:.35,kb:6,stun:.5},
 meteor:   {col:0x7aa8ff,col2:0xffffff,r:1.75,dmg:10,warn:1.0,gap:[4.2,7],fire:.6,kb:7,stun:.5},
 runes:    {col:0x5fe0c0,col2:0xff5a3a,r:1.75,dmg:9, warn:1.1, gap:[4,6.5],fire:.6,kb:6,stun:.5},
 ice:      {col:0x8ad8ff,col2:0xffffff,r:1.6,dmg:10,warn:1.05,gap:[3.8,6.2],fire:.6,kb:6,stun:.5},
 sand:     {col:0xe0b060,col2:0xfff0c0,r:1.7,dmg:10,warn:1.1,gap:[4,6.5],fire:.6,kb:7,stun:.5},
 gust:     {col:0xffb0c8,col2:0xffffff,r:0,dmg:0,warn:1.3,gap:[7,11],fire:1.6,kb:0,stun:0,push:20},
 laser:    {col:0xff2a2a,col2:0xffe0e0,r:.8, dmg:9, warn:1.3, gap:[4,7],  fire:.6,kb:5,stun:.45}
};
const ringG=new THREE.RingGeometry(.86,1,56), discG=new THREE.CircleGeometry(1,48), colG=new THREE.CylinderGeometry(1,1,1,28,1,true).translate(0,.5,0);
const addM=(c,o=1)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:AD,depthWrite:false,side:THREE.DoubleSide});

export class Hazards{
 constructor(fx,sfx){
  this.fx=fx;this.sfx=sfx;this.group=new THREE.Group();this.ev=[];this.kind=null;this.on=false;this.speed=1;this.next=0;this.t=0;
  this.light=new THREE.PointLight(0xffffff,0,28,2);this.light.position.set(0,5,0);this.group.add(this.light);this.flash=0;
 }
 attach(scene){scene.add(this.group);}
 set(kind,{on=true,speed=1}={}){this.clear();this.kind=kind&&HAZ[kind]?kind:null;this.on=on&&!!this.kind;this.speed=speed;this.next=rnd(5,7);}
 clear(){for(const e of this.ev)this.free(e);this.ev.length=0;this.light.intensity=0;this.flash=0;}
 free(e){this.group.remove(e.g);e.g.traverse(o=>{if(o.material)o.material.dispose?.();if(o.userData.own)o.geometry.dispose();});}

 spawn(F){
  const K=HAZ[this.kind],g=new THREE.Group(),e={kind:this.kind,K,g,t:0,ph:0,done:false,hit:{}};
  if(this.kind==="laser"){
   e.z0=rnd(-3.2,3.2);e.z1=Math.random()<.5?e.z0:clamp(e.z0+rnd(-3.5,3.5),-4,4);e.z=e.z0;
   e.line=new THREE.Mesh(new THREE.BoxGeometry(26,.03,.14),addM(K.col,.9));e.line.userData.own=true;e.line.position.y=.05;
   e.band=new THREE.Mesh(new THREE.PlaneGeometry(26,1.6),addM(K.col,.1));e.band.userData.own=true;e.band.rotation.x=-Math.PI/2;e.band.position.y=.04;
   e.core=new THREE.Mesh(new THREE.BoxGeometry(26,.2,.2),addM(K.col2,0));e.core.userData.own=true;e.core.position.y=1.25;
   e.beam=new THREE.Mesh(new THREE.BoxGeometry(26,.75,.75),addM(K.col,0));e.beam.userData.own=true;e.beam.position.y=1.25;
   g.add(e.line,e.band,e.core,e.beam);g.position.set(0,0,e.z);this.sfx.laserWarn();
  }else if(this.kind==="gust"){
   e.dir=Math.random()<.5?-1:1;e.lines=[];
   for(let k=0;k<16;k++){const m=new THREE.Mesh(new THREE.PlaneGeometry(rnd(3,7),.05),addM(K.col2,0));m.userData.own=true;m.position.set(rnd(-12,12),rnd(.3,3.4),rnd(-5.5,5.5));g.add(m);e.lines.push(m);}
   this.sfx.gust();
  }else{
   const tg=F[Math.floor(Math.random()*F.length)],p=tg.root.position;
   let x=p.x+rnd(-1.3,1.3),z=p.z+rnd(-1.1,1.1);const a=8.2,b=4.9,q=Math.hypot(x/a,z/b);if(q>1){x/=q;z/=q;}
   e.x=x;e.z=z;g.position.set(x,0,z);
   e.ring=new THREE.Mesh(ringG,addM(K.col,.9));e.ring.rotation.x=-Math.PI/2;e.ring.position.y=.045;e.ring.scale.setScalar(K.r);
   e.ring2=new THREE.Mesh(ringG,addM(K.col2,.8));e.ring2.rotation.x=-Math.PI/2;e.ring2.position.y=.05;
   e.disc=new THREE.Mesh(discG,addM(K.col,0));e.disc.rotation.x=-Math.PI/2;e.disc.position.y=.04;e.disc.scale.setScalar(K.r);
   e.col=new THREE.Mesh(colG,addM(K.col,0));e.col.scale.set(K.r*.9,.1,K.r*.9);
   e.core=new THREE.Mesh(colG,addM(K.col2,0));e.core.scale.set(K.r*.45,.1,K.r*.45);
   g.add(e.ring,e.ring2,e.disc,e.col,e.core);
   if(this.kind==="ice"||this.kind==="sand"){e.solids=[];const n=this.kind==="ice"?9:1;
    for(let k=0;k<n;k++){let m;
     if(this.kind==="ice"){const h=rnd(1.6,3.2);m=new THREE.Mesh(new THREE.ConeGeometry(rnd(.25,.4),h,6).translate(0,h/2,0),new THREE.MeshStandardMaterial({color:0xbff0ff,emissive:0x2ab8ff,emissiveIntensity:.6,roughness:.15,metalness:.1}));
      const a=rnd(0,6.28),r=k?rnd(.3,K.r*.8):0;m.position.set(Math.cos(a)*r,0,Math.sin(a)*r);m.rotation.set(rnd(-.25,.25),0,rnd(-.25,.25));}
     else{const h=3.4;m=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.1,h,10).translate(0,h/2,0),new THREE.MeshStandardMaterial({color:0xcfa468,roughness:1}));}
     m.userData.own=true;m.scale.set(1,.01,1);g.add(m);e.solids.push(m);}}
   if(this.kind==="meteor"){e.rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.55,1),new THREE.MeshBasicMaterial({color:new THREE.Color(0xbcd0ff).multiplyScalar(1.6)}));e.rock.userData.own=true;
    e.trail=new THREE.Mesh(new THREE.CylinderGeometry(.01,.5,5,10,1,true).translate(0,2.5,0),addM(0x9ab8ff,.5));e.trail.userData.own=true;e.trail.rotation.z=-.4;e.rock.add(e.trail);g.add(e.rock);this.sfx.meteorFall();}
   if(this.kind==="lightning"){
    e.bolts=[];for(let k=0;k<3;k++){const geo=new THREE.BufferGeometry().setAttribute("position",new THREE.BufferAttribute(new Float32Array(14*3),3));
     const l=new THREE.Line(geo,new THREE.LineBasicMaterial({color:k?K.col:K.col2,transparent:true,opacity:0,blending:AD,depthWrite:false}));l.userData.own=true;l.frustumCulled=false;g.add(l);e.bolts.push(l);}
   }
   this.sfx.warn();
  }
  this.group.add(g);this.ev.push(e);
 }

 /* dt = simulated time. fighters = [A,B]. live = round is in the fight phase. hit(F,dmg,dx,dz,stun,kind) applies damage. */
 update(dt,fighters,live,hit,push){
  this._dt=dt;
  if(this.flash>0){this.flash=Math.max(0,this.flash-dt*3.2);this.light.intensity=this.flash*this.flashMax;}
  if(!this.on||!live){return;}
  this.t+=dt;this.next-=dt*this.speed;
  if(this.next<=0){this.spawn(fighters);this.next=rnd(...HAZ[this.kind].gap);}
  for(let i=this.ev.length-1;i>=0;i--){
   const e=this.ev[i],K=e.K;e.t+=dt;
   if(e.kind==="laser")this.stepLaser(e,fighters,hit);else if(e.kind==="gust")this.stepGust(e,fighters,push);else this.stepBurst(e,fighters,hit);
   if(e.done){this.free(e);this.ev.splice(i,1);}
  }
 }
 boom(pos,color,max){this.light.position.set(pos.x,3,pos.z);this.light.color.set(color);this.flashMax=max;this.flash=1;}

 stepBurst(e,fighters,hit){
  const K=e.K,fx=this.fx;
  if(e.ph===0){
   const u=Math.min(1,e.t/K.warn),blink=.55+.45*Math.sin(e.t*(10+u*28));
   e.ring.material.opacity=blink;e.ring.scale.setScalar(K.r*(1+.03*Math.sin(e.t*14)));
   e.ring2.scale.setScalar(K.r*(2.2-1.2*u));e.ring2.material.opacity=.3+.6*u;
   e.disc.material.opacity=.08+.32*u*blink;
   if(e.rock){const f=1-u;e.rock.position.set(f*7,.5+f*f*17,f*-3);e.rock.rotation.x+=.2;e.rock.rotation.y+=.15;}
   if(e.t>=K.warn){e.ph=1;this.fire(e,fighters,hit);}
  }else{
   const ft=e.t-K.warn,u=ft/K.fire,up=Math.min(1,ft/.12);
   const h=10*(1-Math.pow(1-up,3)),w=1-Math.max(0,u-.3)*.9;
   e.col.scale.set(K.r*.95*w,Math.max(.1,h),K.r*.95*w);e.core.scale.set(K.r*.45*w,Math.max(.1,h),K.r*.45*w);
   e.col.material.opacity=Math.max(0,1-u)*.75;e.core.material.opacity=Math.max(0,1-u*1.4);
   e.disc.material.opacity=Math.max(0,.5*(1-u));e.ring.material.opacity=Math.max(0,1-u*2);e.ring2.material.opacity=0;
   if(e.rock)e.rock.visible=false;
   if(e.solids)for(const m of e.solids)m.scale.y=Math.max(.01,Math.min(1,up*1.6)*(u<.7?1:Math.max(0,1-(u-.7)/.3)));
   if(e.bolts)this.bolt(e);
   if(u>=1)e.done=true;
  }
 }
 fire(e,fighters,hit){
  const K=e.K,fx=this.fx,p={x:e.x,y:.3,z:e.z};
  e.col.material.opacity=.8;
  const cols={lava:[0xff7a2a,0xffd060],lightning:[0xb8ecff,0xff6af0],meteor:[0x9ab8ff,0xffffff],runes:[0x5fe0c0,0xffa060],ice:[0xcff4ff,0x8ad8ff],sand:[0xe0b878,0xfff0c0]}[e.kind];
  fx.emit(p,38,8,cols[0]);fx.emit({x:e.x,y:.8,z:e.z},22,12,cols[1]);
  fx.shake=Math.max(fx.shake,.22);fx.ab=Math.max(fx.ab,.7);fx.zoom=Math.max(fx.zoom,.9);
  this.boom(p,K.col,e.kind==="lightning"?260:150);
  this.sfx[{lava:"lava",lightning:"thunder",meteor:"meteor",runes:"runes",ice:"ice",sand:"sand"}[e.kind]]();
  for(const F of fighters){if(F.dead)continue;
   const dx=F.root.position.x-e.x,dz=F.root.position.z-e.z,d=Math.hypot(dx,dz);
   if(d<K.r){const n=d||1;hit(F,K.dmg,dx/n||1,dz/n,K.stun,e.kind,K.kb);}
  }
 }
 bolt(e){
  for(const l of e.bolts){const a=l.geometry.attributes.position;
   for(let i=0;i<14;i++){const f=i/13,y=26*(1-f);a.setXYZ(i,i===13?0:rnd(-.9,.9)*(1-f*.5),y,i===13?0:rnd(-.5,.5));}
   a.needsUpdate=true;l.material.opacity=rnd(.5,1);}
 }

 stepGust(e,fighters,push){
  const K=e.K,dt=this._dt||.016,ft=e.t-K.warn;
  if(e.ph===0){const u=Math.min(1,e.t/K.warn);
   for(const m of e.lines){m.material.opacity=.06+.2*u;m.position.x+=e.dir*5*dt;if(m.position.x>13)m.position.x=-13;if(m.position.x<-13)m.position.x=13;}
   if(e.t>=K.warn){e.ph=1;this.sfx.gust();this.fx.ab=Math.max(this.fx.ab,.3);}
  }else{
   const u=ft/K.fire,env=Math.sin(Math.min(1,u)*Math.PI);
   for(const m of e.lines){m.material.opacity=.6*env;m.position.x+=e.dir*40*dt;if(m.position.x>13)m.position.x=-13;if(m.position.x<-13)m.position.x=13;}
   if(Math.random()<.7)this.fx.emit({x:-e.dir*11,y:rnd(.3,3),z:rnd(-5,5)},1,3,0xffb0c8);
   for(const F of fighters){if(!F.dead&&push)push(F,e.dir*K.push*env,dt);}
   if(u>=1)e.done=true;
  }
 }

 stepLaser(e,fighters,hit){
  const K=e.K;
  if(e.ph===0){
   const u=Math.min(1,e.t/K.warn),blink=Math.sin(e.t*(8+u*30))>0?1:.25;
   e.line.material.opacity=.9*blink;e.band.material.opacity=.05+.2*u*blink;
   if(e.t>=K.warn){e.ph=1;this.fx.shake=Math.max(this.fx.shake,.12);this.sfx.laser();
    e.line.material.opacity=1;this.boom({x:0,z:e.z},K.col,140);}
  }else{
   const ft=e.t-K.warn,u=ft/K.fire,f=Math.min(1,u*1.3);
   e.z=e.z0+(e.z1-e.z0)*f;e.g.position.z=e.z;
   const pulse=1-Math.pow(u,2.5);
   e.core.material.opacity=pulse;e.beam.material.opacity=.5*pulse;e.core.scale.y=e.core.scale.z=.8+.4*Math.sin(ft*80);
   e.line.material.opacity=pulse;e.band.material.opacity=.3*pulse;
   this.light.position.set(0,2,e.z);this.fx.ab=Math.max(this.fx.ab,.35);
   for(const F of fighters){if(F.dead||e.hit[F.side])continue;
    if(Math.abs(F.root.position.z-e.z)<K.r){e.hit[F.side]=true;hit(F,K.dmg,F.root.position.x>0?1:-1,0,K.stun,"laser",K.kb);
     this.fx.emit({x:F.root.position.x,y:1.4,z:F.root.position.z},24,8,0xff6a4a);}
   }
   if(u>=1)e.done=true;
  }
 }
}
