/* Optional real 3D models (Mixamo FBX / GLB). Everything is driven by models/manifest.json.
   If the manifest has no characters (or a file fails to load) the game uses the built-in code models.

   manifest "characters" entries can be:
     "shivansh": "rudra.glb"                                  (simple)
     "shivansh": {"file":"rudra.glb","rotY":0,"scale":1}      (rotY = extra yaw in degrees if a model faces the wrong way)

   Animations:
     - If the model file carries its own animation clips (e.g. rudra.glb: idle/walk/walk_back/block/punch/kick/heavy/hit/ko/win)
       those are used for that character.
     - Otherwise the shared Mixamo clips from models/anims/ (manifest "anims") are used. */
import * as THREE from "three";
import {FBXLoader} from "three/addons/loaders/FBXLoader.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {clone} from "three/addons/utils/SkeletonUtils.js";

const BASE="./models/", chars={}, clips={};
const TARGET_H=2.9; // game units for tall=1 (same as the code models)
const NEED=["idle","walk","walk_back","block","punch","kick","heavy","hit","ko","win"];

function load(file){
 return new Promise(res=>{
  const ext=file.split(".").pop().toLowerCase(),L=ext==="fbx"?new FBXLoader():new GLTFLoader();
  L.load(BASE+file,o=>res(ext==="fbx"?{scene:o,animations:o.animations}:{scene:o.scene,animations:o.animations}),undefined,
   e=>{console.warn("[models] could not load "+file,e?.message||e);res(null);});
 });
}

/* ---------- v7 character detail pass ----------
   The GLB models carry only vertex colours (no UV textures), which looked blotchy / muddy under coloured stage lights.
   1) smooth the vertex colours over the mesh (removes speckle from decimation), 2) lift the albedo a little,
   3) replace the material with a calmer PBR one (low env reflection, high roughness) plus fine procedural
   cloth / skin micro-detail and a soft rim, so faces and costumes read clearly. */
function smoothColors(geo,w){
 const col=geo.attributes.color,pos=geo.attributes.position;if(!col||!pos)return;
 const n=pos.count,is=col.itemSize,idx=geo.index?geo.index.array:null,tris=idx?idx.length/3:n/3;
 const box=new THREE.Box3().setFromBufferAttribute(pos),q=1/Math.max(1e-6,box.getSize(new THREE.Vector3()).length()*2e-4);
 const key=new Map(),wid=new Int32Array(n);let m=0;
 for(let i=0;i<n;i++){const k=Math.round(pos.getX(i)*q)+"_"+Math.round(pos.getY(i)*q)+"_"+Math.round(pos.getZ(i)*q);let g=key.get(k);if(g===undefined){g=m++;key.set(k,g);}wid[i]=g;}
 const sum=new Float32Array(m*3),cnt=new Float32Array(m);
 const add=(a,b)=>{const ga=wid[a];sum[ga*3]+=col.getX(b);sum[ga*3+1]+=col.getY(b);sum[ga*3+2]+=col.getZ(b);cnt[ga]++;};
 for(let t=0;t<tris;t++){const a=idx?idx[t*3]:t*3,b=idx?idx[t*3+1]:t*3+1,c=idx?idx[t*3+2]:t*3+2;add(a,b);add(a,c);add(b,a);add(b,c);add(c,a);add(c,b);}
 for(let i=0;i<n;i++){const g=wid[i],k=cnt[g];if(!k)continue;
  const r=col.getX(i),gg=col.getY(i),b=col.getZ(i),ar=sum[g*3]/k,ag=sum[g*3+1]/k,ab=sum[g*3+2]/k;
  let R=r+(ar-r)*w,G=gg+(ag-gg)*w,B=b+(ab-b)*w;
  // albedo lift (colours were baked quite dark) + slight de-saturation so red/blue blotches calm down
  R=Math.pow(Math.max(0,R),.82)*1.06;G=Math.pow(Math.max(0,G),.82)*1.06;B=Math.pow(Math.max(0,B),.82)*1.06;
  const l=R*.299+G*.587+B*.114,ds=.9;R=l+(R-l)*ds;G=l+(G-l)*ds;B=l+(B-l)*ds;
  col.setXYZ(i,Math.min(1,R),Math.min(1,G),Math.min(1,B));}
 col.needsUpdate=true;
}
function liftColors(geo){ // dense (hi-detail) meshes already carry real colour detail: no smoothing, only the albedo lift
 const col=geo.attributes.color;if(!col)return;
 for(let i=0;i<col.count;i++){let R=Math.pow(Math.max(0,col.getX(i)),.82)*1.06,G=Math.pow(Math.max(0,col.getY(i)),.82)*1.06,B=Math.pow(Math.max(0,col.getZ(i)),.82)*1.06;
  const l=R*.299+G*.587+B*.114;R=l+(R-l)*.92;G=l+(G-l)*.92;B=l+(B-l)*.92;col.setXYZ(i,Math.min(1,R),Math.min(1,G),Math.min(1,B));}
 col.needsUpdate=true;
}
function detailMaterial(H,amp){
 const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.64,metalness:0,envMapIntensity:.55});
 m.onBeforeCompile=sh=>{
  sh.uniforms.uInvH={value:1/Math.max(1e-4,H)};sh.uniforms.uAmp={value:amp};
  sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 vOP;").replace("#include <begin_vertex>","#include <begin_vertex>\nvOP=position;");
  sh.fragmentShader=sh.fragmentShader.replace("#include <common>",`#include <common>
   varying vec3 vOP;uniform float uInvH,uAmp;
   float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
   float vnz(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
    return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
  .replace("#include <color_fragment>",`#include <color_fragment>
   {vec3 q=vOP*uInvH;float n=vnz(q*90.)*.5+vnz(q*230.)*.3+vnz(q*520.)*.2;
    float lum=dot(diffuseColor.rgb,vec3(.299,.587,.114));
    diffuseColor.rgb*=1.+(n-.5)*.2*uAmp;                                  // fine cloth / skin grain
    diffuseColor.rgb=mix(vec3(lum),diffuseColor.rgb,1.08)*(.92+.16*smoothstep(.02,.45,lum));} // local contrast`)
  .replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
   {float rim=pow(1.-clamp(dot(normalize(vNormal),normalize(vViewPosition)),0.,1.),3.);totalEmissiveRadiance+=diffuseColor.rgb*rim*.22;}`);
 };
 m.customProgramCacheKey=()=>"ri_detail_v7";
 return m;
}
function upgradeScene(scene){
 const done=new Set();
 scene.traverse(o=>{if(!o.isMesh||!o.geometry||done.has(o.geometry))return;done.add(o.geometry);
  const g=o.geometry;if(!g.boundingBox)g.computeBoundingBox();
  const dense=g.attributes.position.count>40000;smoothColors(g,dense?.45:.2);
  const H=g.boundingBox.getSize(new THREE.Vector3()).y||1;
  o.material=detailMaterial(H,dense?.3:1);});
}

export async function initModels(onProgress){
 let man;
 try{const r=await fetch(BASE+"manifest.json");if(!r.ok)return 0;man=await r.json();}catch(e){return 0;}
 const list=Object.entries(man.characters||{});if(!list.length)return 0;
 // shared (Mixamo) clips - optional now
 for(const[name,file]of Object.entries(man.anims||{})){
  const o=await load("anims/"+file);if(!o||!o.animations.length)continue;
  const c=o.animations[0].clone();c.name=name;
  if(name!=="ko")c.tracks=c.tracks.filter(t=>!/Hips\.position$/.test(t.name)); // in-place: remove body travel
  clips[name]=c;
 }
 for(const[id,entry]of list){
  const cfg=typeof entry==="string"?{file:entry}:entry;
  const o=await load(cfg.file);if(!o)continue;
  // clips embedded in the model file take priority for this character
  const own={};for(const a of o.animations||[]){if(NEED.includes(a.name))own[a.name]=a;}
  const useOwn=!!own.idle;
  if(!useOwn&&!clips.idle){console.warn("[models] "+id+": no animations (embedded or models/anims/idle) - using built-in model.");continue;}
  try{upgradeScene(o.scene);}catch(e){console.warn("[models] detail pass skipped for "+id,e);}
  o.scene.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(o.scene);
  chars[id]={scene:o.scene,H:Math.max(.001,b.max.y-b.min.y),minY:b.min.y,own:useOwn?own:null,rotY:(cfg.rotY||0)*Math.PI/180,scale:cfg.scale||1};
  if(cfg.lo){ // optional lighter version of the same model (used on LOW graphics / weak phones)
   try{const l=await load(cfg.lo);if(l){const lown={};for(const a of l.animations||[]){if(NEED.includes(a.name))lown[a.name]=a;}
    if(lown.idle){upgradeScene(l.scene);l.scene.updateMatrixWorld(true);const lb=new THREE.Box3().setFromObject(l.scene);
     chars[id].lo={scene:l.scene,H:Math.max(.001,lb.max.y-lb.min.y),minY:lb.min.y,own:lown};}}}catch(e){console.warn("[models] lo version skipped for "+id,e);}
  }
  onProgress?.(id);
 }
 return Object.keys(chars).length;
}
export const hasModel=d=>!!chars[d.id];
let lowDetail=false;
export function setLowDetail(v){lowDetail=!!v;}
export function instantiate(d){
 const c0=chars[d.id];if(!c0)return null;
 const c=(lowDetail&&c0.lo)?Object.assign({},c0,c0.lo):c0;
 const model=clone(c.scene),k=(TARGET_H*(d.tall||1)*c.scale)/c.H,wrap=new THREE.Group();
 model.scale.setScalar(k);model.position.y=-c.minY*k;wrap.add(model);wrap.rotation.y=c.rotY;
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
 const mixer=new THREE.AnimationMixer(model),actions={},src=c.own||clips;
 for(const[n,cl]of Object.entries(src)){const a=mixer.clipAction(cl);actions[n]=a;
  if(["punch","kick","heavy","hit","ko","win"].includes(n)){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}}
 return {wrap,mixer,actions,height:TARGET_H*(d.tall||1)*c.scale};
}
