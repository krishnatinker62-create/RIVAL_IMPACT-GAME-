import * as THREE from "three";
import {EffectComposer} from "three/addons/postprocessing/EffectComposer.js";
import {RenderPass} from "three/addons/postprocessing/RenderPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";
import {ShaderPass} from "three/addons/postprocessing/ShaderPass.js";
import {OutputPass} from "three/addons/postprocessing/OutputPass.js";

export function glowTex(size=64,ring=false){
 const c=document.createElement("canvas");c.width=c.height=size;const x=c.getContext("2d"),h=size/2;
 const g=x.createRadialGradient(h,h,0,h,h,h);
 if(ring){g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(.6,"rgba(255,255,255,0)");g.addColorStop(.8,"rgba(255,255,255,1)");g.addColorStop(1,"rgba(255,255,255,0)");}
 else{g.addColorStop(0,"rgba(255,255,255,1)");g.addColorStop(.25,"rgba(255,255,255,.55)");g.addColorStop(1,"rgba(255,255,255,0)");}
 x.fillStyle=g;x.fillRect(0,0,size,size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

/* Bloom + chromatic aberration + vignette + grain. */
export function makePost(renderer,scene,camera,Q){
 const w=innerWidth,h=innerHeight;
 const rt=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,samples:Q.samples});
 const composer=new EffectComposer(renderer,rt);
 composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);
 const rp=new RenderPass(scene,camera);composer.addPass(rp);
 const bloom=new UnrealBloomPass(new THREE.Vector2(w,h),Q.bloom,.5,.92);composer.addPass(bloom);
 composer.addPass(new OutputPass());
 const grade=new ShaderPass({
  uniforms:{tDiffuse:{value:null},uTime:{value:0},uAb:{value:0},uVig:{value:.38},uGrain:{value:.008},uSat:{value:1.08},uTint:{value:new THREE.Vector3(1,1,1)},uCon:{value:1.10},uFlash:{value:0},uSharp:{value:.3}},
  vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uAb,uVig,uGrain,uSat,uCon,uFlash,uSharp;uniform vec3 uTint;varying vec2 vUv;
   float hh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
   void main(){vec2 c=vUv-.5;float d=dot(c,c);vec2 o=c*(uAb*.011+d*.004);
    vec3 col=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
    if(uSharp>0.){vec2 px=1./vec2(textureSize(tDiffuse,0));vec3 bl=(texture2D(tDiffuse,vUv+vec2(px.x,0.)).rgb+texture2D(tDiffuse,vUv-vec2(px.x,0.)).rgb+texture2D(tDiffuse,vUv+vec2(0.,px.y)).rgb+texture2D(tDiffuse,vUv-vec2(0.,px.y)).rgb)*.25;col=max(col+(col-bl)*uSharp,0.);}
    float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,uSat);col*=uTint;col=(col-.5)*uCon+.5;col+=uFlash;
    col=col*col*(3.-2.*col)*.35+col*.65;
    col*=1.-uVig*smoothstep(.08,.62,d*2.);
    col+=(hh(vUv*vec2(1920.,1080.)+uTime)-.5)*uGrain;gl_FragColor=vec4(col,1.);}`
 });
 composer.addPass(grade);
 return {composer,rp,bloom,grade,
  resize(){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);},
  dispose(){composer.dispose?.();rt.dispose();}};
}

/* Sparks, flash rings, camera shake, chromatic pulse */
export class FX{
 constructor(){
  this.root=new THREE.Group();this.N=520;this.i=0;this.shake=0;this.ab=0;this.zoom=0;
  this.pos=new Float32Array(this.N*3).fill(-999);this.col=new Float32Array(this.N*3);
  this.vel=new Float32Array(this.N*3);this.life=new Float32Array(this.N);this.max=new Float32Array(this.N).fill(1);this.base=new Float32Array(this.N*3);
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(this.pos,3));g.setAttribute("color",new THREE.BufferAttribute(this.col,3));
  this.pts=new THREE.Points(g,new THREE.PointsMaterial({size:.2,map:glowTex(),vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  this.pts.frustumCulled=false;this.root.add(this.pts);
  const rt=glowTex(128,true),gt=glowTex(128);this.flashes=[];
  for(let k=0;k<6;k++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:k%2?rt:gt,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));s.userData.t=1;this.root.add(s);this.flashes.push(s);}
  this.fi=0;
 }
 attach(scene){scene.add(this.root);}
 emit(p,n,speed,color){
  const c=new THREE.Color(color);
  for(let k=0;k<n;k++){const i=this.i=(this.i+1)%this.N,a=Math.random()*6.283,u=Math.random()*2-1,s=Math.sqrt(1-u*u),v=speed*(.4+Math.random());
   this.pos.set([p.x,p.y,p.z],i*3);this.vel.set([Math.cos(a)*s*v,u*v+speed*.25,Math.sin(a)*s*v],i*3);
   this.life[i]=this.max[i]=.35+Math.random()*.45;this.base.set([c.r*2.4,c.g*2.4,c.b*2.4],i*3);}
 }
 hit(p,power,blocked){
  const col=blocked?0x7fc8ff:power>1.4?0xff5a2a:0xffc060;
  this.emit(p,Math.round((blocked?10:18)+power*14),blocked?4:6+power*2,col);
  const f=this.flashes[this.fi=(this.fi+1)%6];f.position.copy(p);f.userData.t=0;f.userData.s=(blocked?1.2:1.8)+power;f.material.color.set(col);
  this.shake=Math.max(this.shake,blocked?.04:.08+power*.07);this.ab=Math.max(this.ab,blocked?.2:.5+power*.3);this.zoom=Math.max(this.zoom,blocked?.1:power>1.4?1:.35);
 }
 update(dt){
  const P=this.pos,C=this.col;
  for(let i=0;i<this.N;i++){
   if(this.life[i]<=0){P[i*3+1]=-999;continue;}
   this.life[i]-=dt;const k=i*3,f=Math.max(0,this.life[i]/this.max[i]),d=Math.exp(-2.2*dt);
   this.vel[k]*=d;this.vel[k+1]=this.vel[k+1]*d-9*dt;this.vel[k+2]*=d;
   P[k]+=this.vel[k]*dt;P[k+1]+=this.vel[k+1]*dt;P[k+2]+=this.vel[k+2]*dt;
   C[k]=this.base[k]*f;C[k+1]=this.base[k+1]*f;C[k+2]=this.base[k+2]*f;
  }
  this.pts.geometry.attributes.position.needsUpdate=true;this.pts.geometry.attributes.color.needsUpdate=true;
  for(const s of this.flashes){const u=s.userData;if(u.t<1){u.t+=dt*5;const e=u.t;s.scale.setScalar(u.s*(.3+e*1.4));s.material.opacity=Math.max(0,1-e);}else s.material.opacity=0;}
  this.shake*=Math.exp(-9*dt);this.ab*=Math.exp(-6*dt);this.zoom*=Math.exp(-7*dt);
 }
}
