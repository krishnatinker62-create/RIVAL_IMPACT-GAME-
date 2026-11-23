/* v8 stage detail pass: adds world-space procedural grain (colour + roughness variation) to every standard material of a stage,
   so flat walls / floors / rocks read as stone, sand, wood and ice instead of plain colour.  level 0 (LOW graphics) = off. */
import * as THREE from "three";

export function enhanceStage(group,level){
 if(!group||level<=0)return;
 const seen=new Set();
 group.traverse(o=>{
  if(!o.isMesh)return;
  for(const m of(Array.isArray(o.material)?o.material:[o.material])){
   if(!m||seen.has(m)||(m.userData&&m.userData.ri8))continue;seen.add(m);
   if(!m.isMeshStandardMaterial)continue;                       // skip sky shaders, basic/glow materials
   if(m.blending===THREE.AdditiveBlending||(m.transparent&&m.opacity<.85))continue;
   m.userData=m.userData||{};m.userData.ri8=1;
   const amp=level>=2?1:.7,prev=m.onBeforeCompile;
   m.onBeforeCompile=(sh,r)=>{
    if(prev)prev.call(m,sh,r);
    sh.vertexShader=sh.vertexShader
     .replace("#include <common>","#include <common>\nvarying vec3 vWP8;")
     .replace("#include <project_vertex>","#include <project_vertex>\n{vec4 w8=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nw8=instanceMatrix*w8;\n#endif\nvWP8=(modelMatrix*w8).xyz;}");
    sh.fragmentShader=sh.fragmentShader
     .replace("#include <common>",`#include <common>
      varying vec3 vWP8;
      float h8(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float n8(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
       return mix(mix(mix(h8(i),h8(i+vec3(1,0,0)),f.x),mix(h8(i+vec3(0,1,0)),h8(i+vec3(1,1,0)),f.x),f.y),
                  mix(mix(h8(i+vec3(0,0,1)),h8(i+vec3(1,0,1)),f.x),mix(h8(i+vec3(0,1,1)),h8(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
     .replace("#include <color_fragment>",`#include <color_fragment>
      float ri8n=n8(vWP8*1.6)*.5+n8(vWP8*7.5)*.32+n8(vWP8*31.)*.18;
      diffuseColor.rgb*=1.+(ri8n-.5)*${(.55*amp).toFixed(2)};`)
     .replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor+(ri8n-.5)*${(.35*amp).toFixed(2)},.04,1.);`);
   };
   m.customProgramCacheKey=()=>"ri8_"+level;
   m.needsUpdate=true;
  }
 });
}
