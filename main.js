import * as THREE from "three";
import {FIGHTERS,STAGES,ENDINGS,QUOTES,CODES} from "./fighters.js";
import {makeFighter,animateFighter,disposeFighter} from "./characters.js";
import {initModels,setLowDetail} from "./models.js";
import {enhanceStage} from "./detail.js";
import {buildStage,makeEnv} from "./stages.js";
import {makePost,FX} from "./fx.js";
import {AUD,sfx} from "./audio.js";
import {Hazards} from "./hazards.js";
import {Pads} from "./gamepad.js";
import {buildRun,diffFor,aiParams,hitScore,roundScore,matchScore,rankOf,LADDER_LEN,LEVELS} from "./arcade.js";

const $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), rnd=(a,b)=>a+Math.random()*(b-a), lerp=(a,b,t)=>a+(b-a)*t, sleep=ms=>new Promise(r=>setTimeout(r,ms));
const say=(t,o)=>AUD.say(t,o);
const TIPS=["Hold BLOCK to reduce damage - heavy attacks still chip you.","Side-step (W/S or right stick) to dodge straight attacks and stage hazards.","COUNTER HIT: hit your enemy while he is starting an attack for +25% damage.","IMPACT meter fills from hits and damage taken. Full meter = 7 seconds of +30% damage.","Every stage has a hazard. Watch the warning circle or line, then move.","Stage hazards hurt BOTH fighters - lure the CPU into them.","The final boss gets stronger every round you win. Finish fast.","Press C (or Y) on character select for an alternate color."];
let inputKind="kb";
const GLYPH={kb:{ok:"ENTER",bk:"ESC",alt:"C"},xbox:{ok:"A",bk:"B",alt:"Y"},ps:{ok:"✕",bk:"◯",alt:"△"}};
function helpText(){
 if(inputKind==="xbox")return "L-STICK MOVE / SIDE-STEP · X PUNCH · A KICK · Y HEAVY · LB BLOCK · SELECT IMPACT";
 if(inputKind==="ps")return "L-STICK MOVE / SIDE-STEP · ▢ PUNCH · ✕ KICK · △ HEAVY · L1 BLOCK · SELECT IMPACT";
 return mode==="vs"?"P1  A/D MOVE · J K L ATTACK · SHIFT BLOCK · H IMPACT     P2  ← → MOVE · , . / ATTACK · R-SHIFT BLOCK · ; IMPACT":"A/D MOVE · W/S Q/E SIDE-STEP · J PUNCH · K KICK · L HEAVY · SHIFT BLOCK · H IMPACT";
}
function applyHints(){const g=GLYPH[inputKind];for(const k of["ok","bk","alt"])document.querySelectorAll(".kh-"+k).forEach(e=>{e.textContent=g[k];});if(view==="fight")$("hud-help").textContent=helpText();}
function setInput(k){if(k!==inputKind){inputKind=k;applyHints();}}
const rndTip=()=>TIPS[Math.floor(Math.random()*TIPS.length)];
function safePixelRatio(){const d=window.devicePixelRatio||1;const p=(typeof Q!=="undefined"&&Q&&Q.pr)?Q.pr:1;return Math.max(1,Math.min(d,p));}
const PRESETS=[
 {name:"LOW",pr:1,shadow:false,sres:512,bloom:.28,crowd:150,parts:.4,samples:0},
 {name:"MEDIUM",pr:1.35,shadow:true,sres:1536,bloom:.32,crowd:400,parts:.8,samples:2},
 {name:"HIGH",pr:2.0,shadow:true,sres:3072,bloom:.34,crowd:900,parts:1.15,samples:4}];
let qi=+(localStorage.getItem("ri_q")??((/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||innerWidth<760)?1:2)),Q=PRESETS[qi]||PRESETS[2];setLowDetail(qi===0);
const SHAKES=[0,.25,.5,.75,1],cfg={haz:localStorage.getItem("ri_haz")!=="0",shake:Math.max(0,Math.min(4,+(localStorage.getItem("ri_shake")??4)))};
const errorBox=$("error-box");
function showError(e){errorBox.classList.remove("hidden");errorBox.textContent="GAME ERROR: "+(e?.stack||e?.message||e);console.error(e);}
addEventListener("error",e=>showError(e.error||e.message));addEventListener("unhandledrejection",e=>showError(e.reason));
function toast(t){const el=$("toast");el.textContent=t;el.classList.add("show");clearTimeout(toast.h);toast.h=setTimeout(()=>el.classList.remove("show"),2400);}

/* ---------- renderer / scenes ---------- */
const canvas=$("game-canvas");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();toast("Graphics memory limit reached — reducing quality");if(qi>0){qi--;Q=PRESETS[qi];setLowDetail(qi===0);localStorage.setItem("ri_q",qi);}});
canvas.addEventListener("webglcontextrestored",()=>{renderer.setPixelRatio(safePixelRatio());renderer.setSize(innerWidth,innerHeight);setupPost();toast("Graphics restored");});
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,400);
const fightScene=new THREE.Scene(),selScene=new THREE.Scene(),fx=new FX(),clock=new THREE.Clock();
const haz=new Hazards(fx,sfx);haz.attach(fightScene);
const pads=new Pads();
/* character lighting: rim light (stage colour) + soft front fill make the fighters pop from the background */
const heroRim=new THREE.DirectionalLight(0xffffff,1.15),heroFill=new THREE.DirectionalLight(0xfff1e0,.9);fightScene.add(heroRim,heroFill);
/* every hit flashes a short point light on the fighters (colour = hit type) */
const hitLight=new THREE.PointLight(0xffffff,0,12,2);fightScene.add(hitLight);let hitLightV=0,flashV=0;
/* per-stage colour grading (tint / saturation / contrast / exposure), blended smoothly */
const GRADE_DEF={sat:1.04,tint:[1,1,1],con:1.08,exp:.92},gradeCur={sat:1.04,tint:[1,1,1],con:1.08,exp:.92};
function lerpGrade(t,k){gradeCur.sat=lerp(gradeCur.sat,t.sat,k);gradeCur.con=lerp(gradeCur.con,t.con,k);gradeCur.exp=lerp(gradeCur.exp,t.exp,k);for(let i=0;i<3;i++)gradeCur.tint[i]=lerp(gradeCur.tint[i],t.tint[i],k);}
let post=null,usePost=true,curScene=fightScene,satV=1.04;
function setupPost(){try{post?.dispose();post=makePost(renderer,curScene,camera,Q);}catch(e){console.warn("Post-processing disabled:",e);post=null;}}
function applyQuality(i,silent){qi=i;Q=PRESETS[i];setLowDetail(i===0);localStorage.setItem("ri_q",i);renderer.setPixelRatio(safePixelRatio());renderer.setSize(innerWidth,innerHeight);setupPost();if(!silent){if(stageObj){fightScene.remove(stageObj.group);stageObj=null;}stageCache.forEach(x=>x?.dispose());stageCache.length=0;thumbsP=null;}}
function render(scn,t){
 curScene=scn;
 lerpGrade(scn===fightScene&&stageObj&&STAGES[stageIdx].grade||GRADE_DEF,.06);renderer.toneMappingExposure=gradeCur.exp;
 if(post&&usePost){try{const u=post.grade.uniforms;post.rp.scene=scn;post.rp.camera=camera;u.uTime.value=t;u.uAb.value=fx.ab;u.uSat.value=gradeCur.sat*satV;u.uTint.value.set(gradeCur.tint[0],gradeCur.tint[1],gradeCur.tint[2]);u.uCon.value=gradeCur.con;u.uFlash.value=flashV;u.uSharp.value=qi===0?0:(qi===1?.28:.38);post.composer.render();return;}catch(e){console.warn(e);usePost=false;}}
 renderer.render(scn,camera);
}
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);post?.resize();});

/* ---------- state ---------- */
let view="loading",mode="arcade",stageIdx=0,tNow=0,thumbsP=null,arc=null;
const sel={p1:0,p2:5,phase:1,lock:false,alt:[false,false]},portraits=[],thumbs=[],stageCache=[];
let stageObj=null,A=null,B=null,selF=[null,null],selGlow=[0,0],selLights=[];
const keys={},pressed={};
const fadeEl=$("fade");

/* ---------- stages ---------- */
function getStage(i){const c=stageCache[i];if(c&&c.q===Q)return c;if(c){if(c===stageObj)return c;c.dispose();}const s=buildStage(i,Q,renderer);s.q=Q;stageCache[i]=s;return s;}
function useStage(i,keepFx){
 if(stageObj)fightScene.remove(stageObj.group);
 stageObj=getStage(i);enhanceStage(stageObj.group,qi);stageIdx=i;fightScene.add(stageObj.group);fightScene.background=stageObj.bg;fightScene.fog=stageObj.fog;fightScene.environment=stageObj.env;
 heroRim.color.set(STAGES[i].accent).lerp(new THREE.Color(1,1,1),.6);if(!keepFx)fx.attach(fightScene);
}
async function makeThumbs(){
 for(let i=0;i<STAGES.length;i++){
  camera.fov=50;camera.updateProjectionMatrix();
  useStage(i,true);lerpGrade(STAGES[i].grade,1);stageObj.update(.016,3+i);camera.position.set(0,2.8,13);camera.lookAt(0,2.4,-6);render(fightScene,i);
  const W=renderer.domElement.width,H=renderer.domElement.height,c=document.createElement("canvas");c.width=384;c.height=216;
  let sw=W,sh=W*9/16,sx=0,sy=(H-sh)/2;if(W/H>16/9){sw=H*16/9;sh=H;sx=(W-sw)/2;sy=0;}
  c.getContext("2d").drawImage(renderer.domElement,sx,sy,sw,sh,0,0,384,216);thumbs[i]=c.toDataURL("image/jpeg",.85);await sleep(8);
 }
 camera.fov=34;camera.updateProjectionMatrix();stageIdx=0;   // thumbnails leave the last stage selected; start the stage list on the first one
}

/* ---------- portraits (rendered from the 3D models) ---------- */
function makePortraits(){
 portraits.length=0;
 const pr=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});pr.setPixelRatio(1);pr.setSize(256,320);
 pr.toneMapping=THREE.ACESFilmicToneMapping;pr.toneMappingExposure=.95;
 const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(24,.8,.1,50);
 sc.add(new THREE.HemisphereLight(0xdfe6ff,0x403038,1.5));const k=new THREE.DirectionalLight(0xfff4ea,2.3);k.position.set(2,3,4);sc.add(k);
 const r=new THREE.DirectionalLight(0xff8a98,1.0);r.position.set(-3,2,-2);sc.add(r);
 const v=new THREE.Vector3();
 for(const d of FIGHTERS){const F=makeFighter(d);F.root.rotation.y=.3;sc.add(F.root);
  if(F.isModel){animateFighter(F,.016);animateFighter(F,.016);}
  F.root.updateMatrixWorld(true);F.headWorld(v);const s=F.baseScale;
  cam.position.set(v.x+.2,v.y+.04,v.z+3.7*s*.78);cam.lookAt(v.x,v.y-.05,v.z);pr.render(sc,cam);portraits.push(pr.domElement.toDataURL("image/png"));
  disposeFighter(F);}
 pr.dispose();pr.forceContextLoss?.();
}

/* ---------- fighter extras: blob shadow, boss aura, hit flash ---------- */
let blobMat=null,bossMat=null,impMat=null;const addMat=(c,o)=>new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(2.3),transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});const blobGeo=new THREE.PlaneGeometry(2,2),auraGeo=new THREE.RingGeometry(1.0,1.35,48);
function blobMaterial(){
 if(blobMat)return blobMat;const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d"),g=x.createRadialGradient(64,64,0,64,64,64);
 g.addColorStop(0,"rgba(0,0,0,.7)");g.addColorStop(.55,"rgba(0,0,0,.32)");g.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=g;x.fillRect(0,0,128,128);
 blobMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});return blobMat;
}
function addExtras(F,boss){
 F.mats=[];
 if(!F.isModel){const seen=new Set();F.root.traverse(o=>{if(o.isMesh&&o.material&&o.material.emissive&&!seen.has(o.material)){seen.add(o.material);F.mats.push(o.material);}});}
 const b=new THREE.Mesh(blobGeo,blobMaterial());b.rotation.x=-Math.PI/2;b.position.y=.03;b.userData.shared=true;F.root.add(b);
 bossMat=bossMat||addMat(0xff2a2a,.8);impMat=impMat||addMat(0xffc020,.8);
 const ia=new THREE.Mesh(auraGeo,impMat);ia.rotation.x=-Math.PI/2;ia.position.y=.06;ia.visible=false;ia.userData.shared=true;F.root.add(ia);F.ia=ia;
 if(boss){const a=new THREE.Mesh(auraGeo,bossMat);a.rotation.x=-Math.PI/2;a.position.y=.05;a.userData.shared=true;F.root.add(a);F.aura=a;}
}
function tintFighter(F,dt){
 if(F.flash>0)F.flash=Math.max(0,F.flash-dt*7);
 if(F.aura){const p=.5+.5*Math.sin(tNow*(F.rage?9:3));F.aura.scale.setScalar(1.7+.25*p*(F.rage?1.6:1));F.aura.rotation.z+=dt*(F.rage?3:1);F.aura.material.opacity=.5+.4*p;
  if(Math.random()<dt*(F.rage?30:8))fx.emit({x:F.root.position.x+rnd(-.7,.7),y:.2,z:F.root.position.z+rnd(-.7,.7)},1,1.6,0xff3a2a);}
 if(F.ia){if(F.impactT>0){const p=.5+.5*Math.sin(tNow*10);F.ia.visible=true;F.ia.scale.setScalar(1.6+.3*p);F.ia.rotation.z-=dt*4;
  if(Math.random()<dt*20)fx.emit({x:F.root.position.x+rnd(-.6,.6),y:rnd(.2,1.4),z:F.root.position.z+rnd(-.6,.6)},1,2,0xffc020);}else F.ia.visible=false;}
 if(!F.mats||!F.mats.length)return;
 let r=0,g=0,b=0;
 if(F.boss){const p=.5+.5*Math.sin(tNow*(F.rage?9:3)),k=(F.rage?.5:.2)*(.6+.4*p);r=k;g=k*.08;b=k*.05;}
 if(F.impactT>0){const p=.5+.5*Math.sin(tNow*10);r+=.35*p;g+=.22*p;}
 if(F.flash>0){const f=F.flash*.55;r+=f;g+=f;b+=f;}
 for(const m of F.mats)m.emissive.setRGB(r,g,b);
}

/* ---------- 3D scene used by main menu / character select / VS screen / ending ---------- */
function buildSelectScene(){
 selScene.background=new THREE.Color(0x04060e);selScene.fog=new THREE.Fog(0x04060e,14,34);
 selScene.environment=makeEnv(renderer,0x101830,0x1c1020,0x05060a,[{c:0xff3050,p:[-12,6,6],i:3,w:8},{c:0x3080ff,p:[12,6,6],i:3,w:8},{c:0xffffff,p:[0,10,10],i:2,w:16}]);
 const fl=new THREE.Mesh(new THREE.CircleGeometry(40,48),new THREE.MeshStandardMaterial({color:0x080b16,roughness:.5,metalness:.55}));fl.rotation.x=-Math.PI/2;selScene.add(fl);
 for(const s of[-1,1]){const col=s<0?0xff2a44:0x2a7cff;
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.55,1.85,64),new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(3)}));ring.rotation.x=-Math.PI/2;ring.position.set(s*2.7,.02,0);selScene.add(ring);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(1.55,48),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.set(s*2.7,.03,0);selScene.add(disc);
  const cone=new THREE.Mesh(new THREE.CylinderGeometry(.4,2.2,11,32,1,true).translate(0,-5.5,0),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));cone.position.set(s*2.7,11,0);selScene.add(cone);
  const sp=new THREE.SpotLight(new THREE.Color(col).lerp(new THREE.Color(1,1,1),.45),90,34,.55,.7,2);sp.position.set(s*7,8,5);sp.target.position.set(s*2.7,1.5,0);selScene.add(sp,sp.target);selLights.push(sp);
  const rim=new THREE.PointLight(col,11,14);rim.position.set(s*5,3,-3);selScene.add(rim);}
 const key=new THREE.DirectionalLight(0xfff2e6,2.1);key.position.set(0,6,10);selScene.add(key);selScene.add(new THREE.HemisphereLight(0x8090b8,0x18181e,.85));
 const col=new THREE.Mesh(new THREE.BoxGeometry(.5,16,.5),new THREE.MeshBasicMaterial({color:new THREE.Color(0x9ad0ff).multiplyScalar(2.5)}));col.position.set(0,8,-9);selScene.add(col);
 for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.12,10,.12),new THREE.MeshBasicMaterial({color:new THREE.Color(i%2?0xff2a44:0x2a7cff).multiplyScalar(2)}));b.position.set((i-2)*3.2,5,-10);selScene.add(b);}
}
/* put a fighter on the select stage. o: fight (battle stance) x yaw scale win nopop */
function setSel(side,d,o={}){
 if(selF[side])disposeFighter(selF[side]);
 const F=makeFighter(d);F.show=!o.fight;F.pop=o.nopop?1:0;F.baseYaw=o.yaw??(side?-.45:.45);F.sc=o.scale||1;
 F.root.position.set(o.x??(side?2.7:-2.7),0,0);F.root.rotation.y=F.baseYaw;
 if(o.fight){F.stance=side?1:-1;F.lead=side?1:0;}if(o.win)F.win=true;
 addExtras(F,false);selScene.add(F.root);selF[side]=F;selGlow[side]=1;return F;
}
function dropSel(side){if(selF[side]){disposeFighter(selF[side]);selF[side]=null;}}
function updateSelFighters(dt){
 for(let s=0;s<2;s++){const F=selF[s];if(!F)continue;F.pop=Math.min(1,F.pop+dt*4);const e=1-Math.pow(1-F.pop,3);F.root.scale.setScalar(F.baseScale*(F.sc||1)*(.88+.12*e));
  F.root.rotation.y=F.baseYaw+Math.sin(tNow*.6+s)*.07;animateFighter(F,dt);selGlow[s]=Math.max(0,selGlow[s]-dt*2.5);selLights[s].intensity=90+selGlow[s]*200;}
 fx.update(dt);
}
function camSel(){camera.fov=30;camera.updateProjectionMatrix();camera.position.set(Math.sin(tNow*.3)*.25,1.9,9.5);camera.lookAt(0,1.35,0);}

/* ---------- main menu (3D attract mode behind the logo) ---------- */
let menuT=0;
function showMenuFighters(){
 const open=FIGHTERS.map((_,i)=>i).filter(i=>!FIGHTERS[i].locked),a=open[Math.floor(Math.random()*open.length)];let b;do{b=open[Math.floor(Math.random()*open.length)];}while(b===a);
 setSel(0,FIGHTERS[a],{fight:true,x:-3.9,yaw:1.1});setSel(1,FIGHTERS[b],{fight:true,x:3.9,yaw:-1.1});menuT=0;
}
function updateMenu(dt){
 menuT+=dt;if(menuT>9)showMenuFighters();
 if(Math.random()<dt*.35){const p={x:0,y:1.9+rnd(-.2,.3),z:0};fx.hit(p,.7,false);fx.ab=0;fx.shake=0;fx.zoom=0;}
 updateSelFighters(dt);camSel();
}

/* ---------- character select ---------- */
function bars(d){return[["POWER",d.power],["SPEED",d.speed],["TECHNIQUE",d.tech]].map(([n,v])=>`<div class="sbar"><label>${n}<span>${v}</span></label><i><s style="width:${v}%"></s></i></div>`).join("");}
function renderInfo(side){
 const d=FIGHTERS[side?sel.p2:sel.p1],el=$(side?"info-r":"info-l");
 el.innerHTML=`<h2>${d.locked?"🔒 ":""}${d.name}</h2>${d.locked?`<div class="lock-note"><b>LOCKED</b>${d.lockNote||""}<br>Not a playable fighter</div>`:""}<div class="irow"><b>FIGHTING STYLE</b>${d.style}</div><div class="irow"><b>NATIONALITY</b>${d.nat}</div><div class="irow"><b>HEIGHT</b>${d.ht} cm</div><div class="irow"><b>WEIGHT</b>${d.wt} kg</div>${bars(d)}`;
 $(side?"ghost-r":"ghost-l").textContent=d.name;
}
function buildRoster(){
 const r=$("roster");r.innerHTML="";
 FIGHTERS.forEach((d,i)=>{const b=document.createElement("button");b.className="tile";b.dataset.i=i;b.innerHTML=`<img src="${portraits[i]}" alt=""><span>${d.name}</span>${d.locked?'<em class="lk">🔒<small>LOCKED</small></em>':""}`;if(d.locked)b.classList.add("locked");
  b.addEventListener("mouseenter",()=>{if(view==="select"&&!sel.lock)setCursor(i);});
  b.addEventListener("click",()=>{if(view==="select"&&!sel.lock){setCursor(i);selConfirm();}});r.appendChild(b);});
}
function updateRoster(){
 const arcade=mode==="arcade"||mode==="team"||mode==="force";
 document.querySelectorAll(".tile").forEach((t,i)=>{t.classList.toggle("p1",i===sel.p1);t.classList.toggle("p2",!arcade&&i===sel.p2);t.querySelector("i")?.remove();
  if(i===sel.p1)t.insertAdjacentHTML("beforeend",'<i class="a">1P</i>');if(!arcade&&i===sel.p2)t.insertAdjacentHTML("beforeend",`<i class="b">${mode==="vs"?"2P":"CPU"}</i>`);});
 $("sel-title").textContent=sel.phase===1?(arcade?(mode==="team"?"CHOOSE YOUR TEAM LEADER":mode==="force"?"CHOOSE YOUR WARRIOR":"SELECT YOUR FIGHTER"):"PLAYER 1 — SELECT YOUR FIGHTER"):(mode==="vs"?"PLAYER 2 — SELECT YOUR FIGHTER":"SELECT TRAINING DUMMY");
}
function firstOpen(i){for(let k=0;k<FIGHTERS.length;k++){const j=(i+k)%FIGHTERS.length;if(!FIGHTERS[j].locked)return j;}return 0;}
const altData=d=>({...d,color:d.accent,accent:d.color,pants:d.color});
const fdata=(idx,alt)=>alt?altData(FIGHTERS[idx]):FIGHTERS[idx];
function showSel(side){const F=setSel(side,fdata(side?sel.p2:sel.p1,sel.alt[side]),{});
 if(FIGHTERS[side?sel.p2:sel.p1].locked&&F)F.root.traverse(o=>{if(o.isMesh&&!o.userData.shared&&o.material){const ms=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{if(!m.color)return m;const c=m.clone();c.color.multiplyScalar(.22);if(c.emissive)c.emissive.setRGB(0,0,0);return c;});o.material=Array.isArray(o.material)?ms:ms[0];}});}
function toggleAlt(){if(view!=="select"||sel.lock)return;const k=sel.phase===1?0:1;sel.alt[k]=!sel.alt[k];sfx.ui();showSel(k);}
function setCursor(i){const k=sel.phase===1?"p1":"p2";if(sel[k]===i)return;sel[k]=i;sfx.ui();const side=sel.phase===1?0:1;showSel(side);renderInfo(side);updateRoster();}
function selMove(dx,dy){const k=sel.phase===1?"p1":"p2";let i=sel[k];if(dx)i=(i+dx+16)%16;if(dy)i=(i+dy*8+16)%16;setCursor(i);}
function selConfirm(){
 if(sel.lock)return;
 if(FIGHTERS[sel.phase===1?sel.p1:sel.p2].locked){sfx.back();toast("🔒 RUDRA IS LOCKED · He appears only on Stage 7 of Arcade Mode");return;}
 sfx.ok();
 if(sel.phase===1){
  if(mode==="arcade"){openDiff();return;}
  if(mode==="team"){startCampaign("team");return;}
  if(mode==="force"){startCampaign("force");return;}
  sel.phase=2;updateRoster();
 }else goStage();
}
function selBack(){if(sel.lock)return;sfx.back();if(sel.phase===2){sel.phase=1;updateRoster();}else goMenu();}
function goSelect(){
 clearFighters();haz.clear();campaign=null;if(mode==="arcade")arc=null;
 view="select";show("select-screen");sel.phase=1;sel.lock=false;
 if(FIGHTERS[sel.p1].locked)sel.p1=firstOpen(0);if(FIGHTERS[sel.p2].locked)sel.p2=firstOpen(5);
 showSel(0);renderInfo(0);
 if(mode==="arcade"||mode==="team"||mode==="force"){dropSel(1);$("info-r").innerHTML="";$("ghost-r").textContent="";}else{showSel(1);renderInfo(1);}
 updateRoster();fx.attach(selScene);AUD.music("select");
}
function updateSelect(dt){updateSelFighters(dt);camSel();}

/* ---------- stage select (VS / Practice) ---------- */
async function goStage(){
 view="loading";show("loading");$("loading-text").textContent="LOADING ARENAS";$("loading-tip").textContent="TIP: "+rndTip();await sleep(30);
 try{if(!thumbsP)thumbsP=makeThumbs();await thumbsP;}catch(e){showError(e);}
 const th=$("stage-thumbs");th.innerHTML="";
 STAGES.forEach((s,i)=>{const b=document.createElement("button");b.className="sthumb";b.innerHTML=`<img src="${thumbs[i]||""}" alt="${s.name}">`;
  b.addEventListener("mouseenter",()=>{if(view==="stage")pickStage(i);});b.addEventListener("click",()=>{if(view==="stage"){pickStage(i);stageConfirm();}});th.appendChild(b);});
 useStage(stageIdx);spawn(true);view="stage";show("stage-screen");pickStage(stageIdx,true);camera.fov=34;camera.updateProjectionMatrix();
}
function pickStage(i,force){if(i===stageIdx&&!force&&stageObj)return;if(i!==stageIdx||!stageObj){useStage(i);sfx.ui();}
 document.querySelectorAll(".sthumb").forEach((t,k)=>t.classList.toggle("on",k===i));$("stage-name").textContent=STAGES[i].name;$("stage-tag").textContent=STAGES[i].tag;$("stage-tag").style.borderColor=STAGES[i].accent;}
function stageConfirm(){sfx.ok();startFight();}
function updateStagePreview(dt){
 stageObj.update(dt,tNow);const a=Math.sin(tNow*.22)*.6;camera.position.set(Math.sin(a)*13,2.6+Math.sin(tNow*.3)*.5,Math.cos(a)*13);camera.lookAt(0,1.7,0);
 for(const F of[A,B])if(F){face();animateFighter(F,dt);}
}

/* ---------- ARCADE: ladder, VS screen, continue, endings ---------- */
let vsT=0,vsDone=false,contOpen=false,contT=0,contN=9,arcAuto=0,endSt=null;
let campaign=null,rudraTrial=false,rudraHold=0,rudraClearT=0,rudraOrb=null;
let diffIdx=1;
const addScore=n=>{arc.score+=Math.round(n*LEVELS[arc.level].mul);};
function buildDiff(){
 const row=$("diff-row");row.innerHTML=LEVELS.map((l,i)=>`<button data-d="${i}" class="${i===diffIdx?"on":""}">${l.name}<small>${l.note.split(" · ")[0]}</small></button>`).join("");
 [...row.children].forEach((b,i)=>b.addEventListener("click",()=>{diffIdx=i;diffConfirm();}));$("diff-note").textContent=LEVELS[diffIdx].note;
}
function openDiff(){view="diff";$("diff").classList.remove("hidden");buildDiff();}
function diffNav(d){
 if(d==="lf"||d==="up"){diffIdx=(diffIdx+LEVELS.length-1)%LEVELS.length;sfx.ui();buildDiff();}
 else if(d==="rt"||d==="dn"){diffIdx=(diffIdx+1)%LEVELS.length;sfx.ui();buildDiff();}
 else if(d==="ok")diffConfirm();
 else if(d==="bk"){sfx.back();$("diff").classList.add("hidden");view="select";}
}
function diffConfirm(){sfx.ok();$("diff").classList.add("hidden");sel.lock=true;say(FIGHTERS[sel.p1].name);startArcade();}
function startCampaign(kind){
 sel.lock=true;campaign={kind,index:0,playerTeam:[sel.p1],enemyTeam:[]};
 const pool=FIGHTERS.map((_,i)=>i).filter(i=>i!==sel.p1&&!FIGHTERS[i].locked);
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 if(kind==="team"){
  campaign.playerTeam.push(...pool.slice(0,2));campaign.enemyTeam=pool.slice(2,5);campaign.total=3;
 }else{
  campaign.soldiers=pool.slice(0,5);campaign.final=pool[5];campaign.total=6;
 }
 goCampaignFight();
}
function goCampaignFight(){
 if(!campaign)return;
 const i=campaign.index;
 if(campaign.kind==="team"){
  sel.p1=campaign.playerTeam[i];sel.p2=campaign.enemyTeam[i];stageIdx=[1,3,7][i];
 }else{
  sel.p2=i<5?campaign.soldiers[i]:campaign.final;stageIdx=[0,3,1,5,7,4][i];
 }
 useStage(stageIdx);startFight();
}
function startArcade(){
 campaign=null;arc=buildRun(sel.p1,STAGES.length,diffIdx);goVs(false);
}
async function goVs(retry){
 const op=arc.ladder[arc.i],boss=op.boss,a=fdata(sel.p1,sel.alt[0]),b=op.rudraTrial&&sel.p1===2?{...FIGHTERS[2],name:"RUDRA · DIVYA FORM"}:FIGHTERS[op.idx];
 sel.p2=op.idx;stageIdx=op.stage;
 clearFighters();haz.clear();view="vs";show("vs-screen");vsT=0;vsDone=false;
 setSel(0,a,{fight:true,x:-2.6,yaw:1.05});setSel(1,b,{fight:true,x:2.6,yaw:-1.05,scale:boss?1.1:1});fx.attach(selScene);
 $("vs-stage").textContent=boss?"FINAL STAGE":`STAGE ${arc.i+1} / ${LADDER_LEN}`;
 $("vs-sub").textContent=op.rudraTrial?"SPECIAL STAGE · DO NOT ATTACK":retry?"CONTINUE":boss?"FINAL OPPONENT":"NEXT OPPONENT";
 $("vs-warn").classList.toggle("hidden",!boss);if(op.rudraTrial){$("vs-warn").classList.remove("hidden");$("vs-warn").textContent="✦ RUDRA TRIAL · HOLD BLOCK · DO NOT ATTACK ✦";}else $("vs-warn").textContent="⚠ WARNING · FINAL BOSS ⚠";
 const vsHTML=d=>`<b class="code">${CODES[d.nat]||""}</b><br>${d.name}<small>${d.style} · ${d.nat}</small><em>“${QUOTES[d.id]||""}”</em>`;
 $("vs-l").innerHTML=vsHTML(a);$("vs-r").innerHTML=vsHTML(b);$("vs-arena").textContent=STAGES[op.stage].name+" · "+STAGES[op.stage].tag;
 $("vs-ladder").innerHTML=arc.ladder.map((o,i)=>{const known=i<=arc.i;return `<div class="vs-pip${i<arc.i?" done":""}${i===arc.i?" cur":""}${o.boss?" boss":""}">${known?`<img src="${portraits[o.idx]}" alt="">`:"?"}</div>`;}).join("");
 AUD.music(boss?"boss":"vs");sfx.vs();say(boss?"Warning. Final boss.":retry?"Continue":"Next opponent");
 await sleep(60);try{getStage(stageIdx);}catch(e){showError(e);}   // build the arena while the VS screen is showing
}
function vsGo(){if(vsDone||view!=="vs")return;vsDone=true;useStage(stageIdx);startFight();}
function updateVs(dt){
 vsT+=dt;updateSelFighters(dt);camSel();
 if(vsT>3.9)vsGo();
}
function arcWin(){
 const op=arc.ladder[arc.i],b=matchScore(arc.i,op.boss);addScore(b);hideBanner();sfx.clear();
 if(op.boss){goEnding();return;}
 say("Stage clear");
 showResult("STAGE CLEAR",`Stage ${arc.i+1} / ${LADDER_LEN} cleared  ·  +${b} bonus  ·  SCORE ${arc.score}`,[{label:"NEXT OPPONENT",act:"next",pri:true},{label:"MAIN MENU",act:"menu"}]);
 arcAuto=7;
}
function arcLose(){
 hideBanner();sfx.lose();
 if(arc.credits>0){contOpen=true;contT=9.99;contN=-1;$("continue").classList.remove("hidden");$("cont-sub").textContent=`CREDITS ${arc.credits}  ·  SCORE ${arc.score}`;ovFocus(0);AUD.music("continue");say("Continue?");}
 else gameOver();
}
function tickContinue(dt){
 contT-=dt;const n=Math.max(0,Math.ceil(contT));
 if(n!==contN){contN=n;$("cont-n").textContent=n;if(n>0)sfx.count();}
 if(contT<=0){contOpen=false;gameOver();}
}
function gameOver(){
 contOpen=false;$("continue").classList.add("hidden");sfx.gameover();AUD.stopMusic(1.2);say("Game over");
 const hi=+(localStorage.getItem("ri_hi")||0);if(arc.score>hi)localStorage.setItem("ri_hi",arc.score);
 showResult("GAME OVER",`FINAL SCORE ${arc.score}  ·  HI-SCORE ${Math.max(hi,arc.score)}`,[{label:"MAIN MENU",act:"menu",pri:true}]);
}
function goEnding(){
 clearFighters();haz.clear();view="ending";show("ending-screen");
 const d=FIGHTERS[arc.player],e=ENDINGS[d.id]||["CHAMPION","The tournament has a new champion."];
 setSel(0,d,{x:2.0,yaw:-.25,scale:1.2,win:true});dropSel(1);fx.attach(selScene);
 $("end-name").textContent=d.name;$("end-title").textContent=e[0];$("end-text").textContent="";$("end-score").classList.add("hidden");
 endSt={chars:0,text:e[1],done:false,t:0,conf:0};
 const hi=+(localStorage.getItem("ri_hi")||0),nh=arc.score>hi;if(nh)localStorage.setItem("ri_hi",arc.score);
 endSt.html=`<h2>FINAL SCORE</h2><div class="big">${arc.score}</div><div class="rank">${rankOf(arc.score,arc.used)}</div><small>CONTINUES USED ${arc.used}  ·  PERFECT ROUNDS ${arc.perfects}</small>${nh?"<small style='color:#ffd23a'>★ NEW HI-SCORE ★</small>":`<small>HI-SCORE ${hi}</small>`}`;
 AUD.music("ending");sfx.clear();say("Congratulations. You are the champion.");
}
function updateEnding(dt){
 const s=endSt;if(!s)return;s.t+=dt;
 if(!s.done){s.chars+=dt*34;$("end-text").textContent=s.text.slice(0,Math.floor(s.chars));if(s.chars>=s.text.length){s.done=true;const el=$("end-score");el.innerHTML=s.html;el.classList.remove("hidden");}}
 s.conf+=dt;if(s.conf>.07){s.conf=0;fx.emit({x:rnd(-4,4),y:6.5,z:rnd(-1.5,1)},3,1.2,[0xffd060,0xff6070,0x70b0ff,0xffffff][Math.floor(Math.random()*4)]);}
 updateSelFighters(dt);
 camera.fov=30;camera.updateProjectionMatrix();camera.position.set(Math.sin(s.t*.15)*.7,1.7,9.5-Math.min(1.8,s.t*.12));camera.lookAt(1.0,1.5,0);
}
function endAdvance(){
 if(!endSt)return;
 if(!endSt.done){endSt.chars=endSt.text.length;return;}
 sfx.ok();arc=null;endSt=null;goMenu();
}

/* ---------- fighters / combat ---------- */
const ATK={punch:{dur:.34,hit:.36,dmg:6,reach:2.25,width:.95,stun:.3,kb:.45,lunge:1.5,pow:.6,stop:.05},
 kick:{dur:.52,hit:.44,dmg:9,reach:2.75,width:.9,stun:.36,kb:.8,lunge:1.1,pow:1,stop:.07},
 heavy:{dur:.78,hit:.52,dmg:15,reach:2.5,width:1.15,stun:.55,kb:1.6,lunge:2.6,pow:1.8,stop:.11}};
const newStat=()=>({hits:0,thrown:0,dmg:0,maxCombo:0,taken:0,counters:0});let stat=newStat(),dmgCount=0;const dmgV=new THREE.Vector3();
function dmgNum(p,txt,cls=""){
 if(dmgCount>14)return;dmgV.set(p.x,p.y,p.z).project(camera);if(dmgV.z>1)return;
 const el=document.createElement("span");el.className="dn "+cls;el.textContent=txt;el.style.left=((dmgV.x*.5+.5)*100)+"%";el.style.top=((-dmgV.y*.5+.5)*100)+"%";
 $("dmg-layer").appendChild(el);dmgCount++;setTimeout(()=>{el.remove();dmgCount--;},900);
}
function statsHTML(){const acc=stat.thrown?Math.round(stat.hits/stat.thrown*100):0,c=(b,t)=>`<div><b>${b}</b><small>${t}</small></div>`;
 return `<div class="stats">${c(stat.hits,"HITS")}${c(acc+"%","ACCURACY")}${c(stat.maxCombo,"MAX COMBO")}${c(Math.round(stat.dmg),"DAMAGE DEALT")}${c(Math.round(stat.taken),"DAMAGE TAKEN")}${c(stat.counters,"COUNTER HITS")}</div>`;}
let called=false,wins=[0,0],round=1,ph="intro",phT=0,roundTime=60,timeScale=1,hitStop=0,paused=false,camYaw=0,winner=null,over=false,lastSec=60,lastScore=-1;
function clearFighters(){for(const F of[A,B])if(F)disposeFighter(F);A=B=null;hitLightV=0;hitLight.intensity=0;}
function spawn(preview,boss){
 clearFighters();const da=fdata(sel.p1,sel.alt[0]);let db=fdata(sel.p2,mode==="vs"&&sel.alt[1]);if(rudraTrial&&sel.p1===2)db={...FIGHTERS[2],name:"RUDRA · DIVYA FORM"};if(sel.p1===sel.p2)db={...db,color:db.accent,accent:db.color,pants:db.color};
 if(boss)db={...db,tall:(db.tall||1)*1.1,build:db.build*1.08};
 A=makeFighter(da);B=makeFighter(db);
 if(boss){B.root.scale.multiplyScalar(mode==="force"?1.7:1.6);B.root.traverse(o=>{if(o.isMesh&&o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m.color)m.color.multiply(new THREE.Color(0x8b3434));if(m.emissive)m.emissive.setHex(0x260406);}}});
  const hornMat=new THREE.MeshStandardMaterial({color:0x21070b,metalness:.35,roughness:.5});for(const side of[-1,1]){const h=new THREE.Mesh(new THREE.ConeGeometry(.16,.62,8),hornMat);h.position.set(side*.42,2.2,0);h.rotation.z=side*.32;B.root.add(h);}
 }
 if(mode==="force"&&campaign&&campaign.index<5)B.root.traverse(o=>{if(o.isMesh&&o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m.color)m.color.multiplyScalar(.22);if(m.emissive)m.emissive.setHex(0x080d18);}}});A.side=0;B.side=1;A.pn=B.pn=0;B.boss=!!boss&&!preview;
 for(const F of[A,B]){F.vx=F.vz=0;F.bs=0;F.dead=false;F.flash=0;F.rage=false;F.meter=0;F.impactT=0;addExtras(F,F===B&&B.boss);fightScene.add(F.root);}
 A.root.position.set(-2.4,0,0);B.root.position.set(2.4,0,0);face(true);
}
function face(snap){
 if(!A||!B)return;
 for(const[F,O]of[[A,B],[B,A]]){if(F.dead)continue;const dx=O.root.position.x-F.root.position.x,dz=O.root.position.z-F.root.position.z,y=Math.atan2(dx,dz);
  let d=y-F.root.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));F.root.rotation.y+=snap?d:d*.35;
  const s=Math.sin(F.root.rotation.y);if(Math.abs(s)>.25){F.stance=s>0?-1:1;F.lead=F.stance<0?0:1;}}
}
const banner=$("banner");
function showBanner(t,hold){banner.className="banner";banner.textContent=t;void banner.offsetWidth;banner.classList.add(hold?"hold":"show");sfx.announce();}
function hideBanner(){banner.className="banner";}
function setDots(){for(const[s,F]of[["l",0],["r",1]])$("dots-"+s).innerHTML=[0,1].map(i=>`<b class="${i<wins[F]?"w":""}"></b>`).join("");}
function koFlash(){const f=$("flash");f.classList.remove("go");void f.offsetWidth;f.classList.add("go");}

function startFight(){
 view="fight";show("hud");$("hud").classList.remove("hidden");wins=[0,0];round=1;over=false;paused=false;contOpen=false;arcAuto=0;
 const op=mode==="arcade"&&arc?arc.ladder[arc.i]:null,boss=!!(op&&op.boss)||(mode==="force"&&campaign&&campaign.index===5);rudraTrial=!!(op&&op.rudraTrial);rudraHold=0;rudraClearT=0;
 $("hud-name-l").innerHTML=`${FIGHTERS[sel.p1].name}<small>${CODES[FIGHTERS[sel.p1].nat]||""}</small>`;
 $("hud-name-r").innerHTML=(mode==="vs"?"":mode==="practice"?"DUMMY · ":rudraTrial?"TRIAL · ":mode==="force"&&campaign&&campaign.index<5?"BLACK SOLDIER · ":boss?"BOSS · ":"CPU · ")+`${rudraTrial?"RUDRA":FIGHTERS[sel.p2].name}<small>${CODES[FIGHTERS[sel.p2].nat]||""}</small>`;stat=newStat();
 document.querySelector(".bar.r").classList.toggle("boss",boss);
 $("hud-pic-l").src=portraits[sel.p1];$("hud-pic-r").src=portraits[sel.p2];
 $("hud-help").textContent=helpText();
 $("hud-arc").classList.toggle("hidden",!op);if(op){$("arc-stage").textContent=op.rudraTrial?"RUDRA TRIAL":boss?"FINAL BOSS":`STAGE ${arc.i+1} / ${LADDER_LEN}`;lastScore=-1;}
 if(rudraTrial){$("hud-help").textContent="RUDRA TRIAL: HOLD BLOCK (SHIFT / SPACE). DO NOT ATTACK. SURVIVE THE DIVYA PRAKASH.";}else if(mode==="force"&&campaign){$("hud-help").textContent=campaign.index<5?`TEKKEN FORCE · SOLDIER ${campaign.index+1}/5 · DEFEAT THE WAVE`:`TEKKEN FORCE · FINAL CHALLENGER · ${helpText()}`;}else if(mode==="team"&&campaign){$("hud-help").textContent=`TEAM BATTLE · ALLY ${campaign.index+1}/3 · ENEMY ${campaign.index+1}/3 · ${helpText()}`;}
 ["pause","result","continue","replay-ui","movelist"].forEach(id=>$(id).classList.add("hidden"));$("pause").classList.toggle("arc",mode==="arcade");
 spawn(false,boss);
 haz.set(STAGES[stageIdx].hazard,{on:cfg.haz&&mode!=="practice",speed:boss?1.3:1});
 AUD.music(boss?"boss":"f"+stageIdx);AUD.tempo(1);AUD.intensity(null);
 setDots();resetRound();
}
/* AI strength comes from arcade.js. The boss gets stronger by itself every round you win, and everyone adapts a little if you dominate. */
function setupAI(){
 for(const F of[A,B]){F.dmgMul=1;F.defMul=1;F.spdMul=1;F.stunMul=1;F.ai=null;}
 if(mode==="arcade"&&arc){/* arcade AI */}else if((mode==="team"||mode==="force")&&campaign){/* campaign AI */}else return;
 const op=mode==="arcade"&&arc?arc.ladder[arc.i]:null,boss=!!(op&&op.boss)||(mode==="force"&&campaign&&campaign.index===5),escal=(boss?wins[0]*.1+(round-1)*.03:clamp((wins[0]-wins[1])*.05,-.05,.1))-(mode==="arcade"&&arc?.04*arc.used:0)+(mode==="arcade"&&arc?LEVELS[arc.level].d:.18);
 const ai=aiParams(diffFor(mode==="arcade"&&arc?arc.i:campaign.index,boss,escal),B.d.tech,boss);
 if(B.rage){ai.cd*=.7;ai.aggr=Math.min(.97,ai.aggr+.12);ai.block=Math.min(.95,ai.block+.1);}
 B.ai=ai;B.dmgMul=ai.dmgMul;B.defMul=ai.defMul;B.spdMul=ai.spdMul*(B.rage?1.15:1);B.stunMul=ai.stunMul;
}
let rec=[],recEv=[],simT=0,rp=null,skipReplay=false,koHaz=false,endText="";
function resetRound(){
 for(const[F,x]of[[A,-2.4],[B,2.4]]){F.root.position.set(x,0,0);F.hp=F.ghost=100;F.dead=false;F.ko=0;F.win=false;F.act=null;F.stun=0;F.bs=0;F.block=false;F.kv={x:0,z:0};F.vx=F.vz=0;F.combo=0;F.comboT=0;F.moving=0;F.flash=0;F.rage=false;F.seen=false;F.impactT=0;}
 setupAI();haz.clear();rec.length=0;recEv.length=0;simT=0;skipReplay=false;koHaz=false;rp=null;$("replay-ui").classList.add("hidden");
 face(true);called=false;roundTime=60;lastSec=60;timeScale=1;ph="intro";phT=0;winner=null;camYaw=0;
 for(const k in pressed)delete pressed[k];hideBanner();
 const final=wins[0]===1&&wins[1]===1;banner.textContent=final?"FINAL ROUND":"ROUND "+round;banner.className="banner show";void banner.offsetWidth;sfx.announce();AUD.duck(1.4,.45);
 say(final?"Final round":"Round "+["one","two","three","four","five"][Math.min(4,round-1)]);
 $("timer").textContent=mode==="practice"?"∞":60;
}
function recent(code){return pressed[code]&&performance.now()-pressed[code]<190;}
const P1A=[["KeyJ","punch"],["KeyK","kick"],["KeyL","heavy"],["Pad0Punch","punch"],["Pad0Kick","kick"],["Pad0Heavy","heavy"]],
 P2A=[["Comma","punch"],["Period","kick"],["Slash","heavy"],["Numpad1","punch"],["Numpad2","kick"],["Numpad3","heavy"],["Pad1Punch","punch"],["Pad1Kick","kick"],["Pad1Heavy","heavy"]];
function readKeys(list,m,imps){const c={mx:m.mx,mz:m.mz,block:m.block,atk:null,code:null,imp:false};for(const[code,t]of list)if(recent(code)){c.atk=t;c.code=code;break;}for(const code of imps)if(recent(code)){c.imp=true;delete pressed[code];break;}return c;}
function readP1(){const p=pads.st[0];return readKeys(P1A,{mx:clamp((keys.KeyD?1:0)-(keys.KeyA?1:0)+p.mx,-1,1),mz:clamp((keys.KeyS?.7:0)+(keys.KeyE?1.4:0)-(keys.KeyW?.7:0)-(keys.KeyQ?1.4:0)+p.mz,-1.5,1.5),block:!!(keys.ShiftLeft||keys.Space||(mode!=="vs"&&keys.ShiftRight))||p.block},["KeyH","Pad0Impact"]);}
function readP2(){const p=pads.st[1];return readKeys(P2A,{mx:clamp((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0)+p.mx,-1,1),mz:clamp((keys.ArrowDown?.8:0)-(keys.ArrowUp?.8:0)+p.mz,-1.5,1.5),block:!!(keys.ShiftRight||keys.Numpad0||keys.KeyM)||p.block},["Semicolon","Numpad4","Pad1Impact"]);}

/* CPU brain. Parameters (reaction, block/evade chance, aggression, cooldown) come from F.ai. */
function aiControl(F,O,dt){
 const c={mx:0,mz:0,block:false,atk:null,imp:false};if(ph!=="fight"||O.dead||!F.ai)return c;
 if(F.meter>=100&&F.impactT<=0&&Math.random()<dt*.7)c.imp=true;
 const ai=F.ai,dx=O.root.position.x-F.root.position.x,dz=O.root.position.z-F.root.position.z,d=Math.hypot(dx,dz);
 F.aiT-=dt;F.aiCd=(F.aiCd||0)-dt;
 // 1) dodge stage hazards (smarter CPU = better dodge)
 for(const e of haz.ev){
  if(e.ph!==0)continue;const p=F.root.position;
  if(e.kind==="laser"){if(Math.abs(p.z-e.z)<e.K.r+.3){if(F.hzE!==e){F.hzE=e;F.hzOk=Math.random()<ai.diff*.95;}if(F.hzOk){c.mz=(p.z>=e.z?1:-1)*1.4;c.mx=0;return c;}}}
  else{const hx=p.x-e.x,hz=p.z-e.z,hd=Math.hypot(hx,hz);if(hd<e.K.r+.4&&e.K.warn-e.t<.85){if(F.hzE!==e){F.hzE=e;F.hzOk=Math.random()<ai.diff*.95;}if(F.hzOk){const n=hd||1;c.mx=hx/n*1.2;c.mz=hz/n;return c;}}}
 }
 // 2) react to the player's attack
 if(O.act&&d<3.2&&!F.act&&F.stun<=0){
  if(!F.seen){F.seen=true;const r=Math.random();
   if(r<ai.block){F.aiMode="block";F.aiT=rnd(.3,.6);}
   else if(r<ai.block+ai.evade){F.aiMode="strafe";F.aiDir=Math.random()<.5?-1:1;F.aiT=rnd(.25,.45);}}
 }else if(!O.act)F.seen=false;
 // 3) pick a plan
 if(F.aiT<=0){F.aiT=rnd(.18,.5)/ai.lv;F.aiDir=Math.random()<.5?-1:1;const r=Math.random();
  if(d>2.8)F.aiMode=r<.8?"chase":"strafe";
  else if(d<1.4)F.aiMode=r<.2?"retreat":r<.2+ai.aggr*.7?"attack":"block";
  else F.aiMode=r<ai.aggr?"attack":r<ai.aggr+.12?"block":r<ai.aggr+.22?"strafe":"chase";}
 if(F.aiMode==="chase"){if(Math.abs(dx)>1.9)c.mx=Math.sign(dx);c.mz=Math.abs(dz)>.5?Math.sign(dz)*.6:0;}
 else if(F.aiMode==="retreat")c.mx=-Math.sign(dx);
 else if(F.aiMode==="strafe")c.mz=F.aiDir;
 else if(F.aiMode==="block")c.block=true;
 else if(F.aiMode==="attack"){if(d>2.2){c.mx=Math.sign(dx);c.mz=Math.abs(dz)>.4?Math.sign(dz)*.5:0;}
  else if(F.aiCd<=0&&!F.act){const r=Math.random();c.atk=r<ai.heavy?"heavy":r<.55?"kick":"punch";F.aiCd=rnd(.35,.9)*ai.cd;}}
 return c;
}
function startAtk(F,t){const a=ATK[t];if(F===A)stat.thrown++;F.actDur=a.dur;F.act=t;F.actT=0;F.actP=0;F.actHit=a.hit;F.hitDone=false;F.block=false;if(t==="punch")F.armIdx=(F.pn++&1)?1-F.lead:F.lead;sfx.swing(a.pow/1.8);}
function activateImpact(F){
 if(F.meter<100||F.impactT>0||ph!=="fight"||F.dead)return;
 F.meter=0;F.impactT=7;sfx.impact();fx.emit({x:F.root.position.x,y:1,z:F.root.position.z},30,6,0xffc020);fx.shake=Math.max(fx.shake,.2);fx.ab=Math.max(fx.ab,.6);flashV=.2;
 dmgNum({x:F.root.position.x,y:2.9,z:F.root.position.z},"IMPACT!","imp");rumbleFor(F,.8,.8,200);
}
const gustPush=(F,v,dt)=>{F.kv.x+=v*dt*(F.act?.4:1);};
function rumbleFor(F,s,w,ms){if(F.side===0||mode==="vs")pads.rumble(F.side,s,w,ms);}
function koFighter(O,F){
 if(mode==="practice"){O.hp=100;O.ghost=100;return;}
 if(ph==="ko"){if(winner===O)winner=null;O.dead=true;return;}   // both fighters died in the same frame -> draw
 const dx=O.root.position.x-F.root.position.x,dz=O.root.position.z-F.root.position.z,n=Math.hypot(dx,dz)||1;
 O.dead=true;O.kv={x:dx/n*9,z:dz/n*9};F.win=false;ph="ko";phT=0;winner=F;timeScale=.28;
 recEv.push({t:simT,ko:true});sfx.ko();AUD.duck(2.4,.2);koFlash();say("K O!");banner.textContent="K.O.";banner.className="banner hold";
 rumbleFor(O,1,1,350);
}
function resolveHit(F,O,t){
 const a=ATK[t];if(O.dead)return;if(rudraTrial&&F===A&&O===B)return;const y=F.root.rotation.y,fx_=Math.sin(y),fz=Math.cos(y),dx=O.root.position.x-F.root.position.x,dz=O.root.position.z-F.root.position.z;
 const along=dx*fx_+dz*fz,lat=Math.abs(dx*fz-dz*fx_);if(along<.3||along>a.reach||lat>a.width)return;
 const blocked=O.block&&O.stun<=0,counter=!blocked&&!!O.act&&O.actP<ATK[O.act].hit;let dmg=a.dmg*(.8+F.d.power/250)*(F.dmgMul||1)*(F.impactT>0?1.3:1);
 const sc=O.d.tall||1,p=new THREE.Vector3(O.root.position.x-fx_*.35,(t==="kick"?1.7:2.1)*sc,O.root.position.z-fz*.35);
 if(blocked){dmg*=t==="heavy"?.35:.12;O.bs=.2;O.kv={x:fx_*a.kb*5,z:fz*a.kb*5};F.combo=0;sfx.block();rumbleFor(O,.2,.4,60);}
 else{F.combo=F.comboT>0?F.combo+1:1;dmg*=Math.max(.55,1-.09*(F.combo-1));if(counter)dmg*=1.25;F.comboT=1.1;F.comboDmg=F.combo===1?dmg:F.comboDmg+dmg;
  O.stun=O.stunMax=a.stun*(O.stunMul||1);O.act=null;O.kv={x:fx_*a.kb*7,z:fz*a.kb*7};O.combo=0;(t==="heavy"?sfx.heavy:sfx.hit)(a.pow);rumbleFor(O,t==="heavy"?1:.5,.6,t==="heavy"?200:90);
  if(mode==="arcade"&&F.side===0){addScore(hitScore(F.combo));arc.hits++;}}
 O.flash=blocked?.35:1;
 const fin=dmg*(O.defMul||1);O.hp=Math.max(0,O.hp-fin);fx.hit(p,a.pow,blocked);hitStop=blocked?.03:a.stop;
 F.meter=Math.min(100,F.meter+(blocked?3:fin*1.5+4));O.meter=Math.min(100,O.meter+(blocked?2:fin*1.1));
 hitLight.position.set(p.x,p.y,p.z);hitLight.color.set(blocked?0x8ac8ff:t==="heavy"?0xffa860:0xfff0d0);hitLightV=blocked?5:a.pow*20;
 dmgNum(p,blocked?"BLOCK":Math.round(fin),blocked?"blk":(counter||t==="heavy")?"big":"");
 if(counter){dmgNum({x:p.x,y:p.y+.8,z:p.z},"COUNTER!","cnt");sfx.counter();stat.counters++;}
 if(F===A&&!blocked){stat.hits++;stat.dmg+=fin;stat.maxCombo=Math.max(stat.maxCombo,F.combo);}
 if(O===A&&!blocked)stat.taken+=fin;
 recEv.push({t:simT,p:{x:p.x,y:p.y,z:p.z},pow:a.pow,bl:blocked});
 if(O.hp<=0)koFighter(O,F);
}
/* stage hazard damage (called by hazards.js) */
function hazHit(F,dmg,dx,dz,stun,kind,kb){
 if(F.dead||ph!=="fight"||(rudraTrial&&F===B))return;
 F.act=null;F.block=false;F.bs=0;F.stun=F.stunMax=stun*(F.stunMul||1);F.kv={x:dx*kb,z:dz*kb};F.combo=0;F.flash=1;
 const fin=dmg*(F.defMul||1);F.hp=Math.max(0,F.hp-fin);hitStop=.07;rumbleFor(F,.8,.8,220);F.meter=Math.min(100,F.meter+fin);
 dmgNum({x:F.root.position.x,y:2.3,z:F.root.position.z},Math.round(fin),"haz");if(F===A)stat.taken+=fin;
 if(F.hp<=0){koHaz=true;koFighter(F,F===A?B:A);}
}
function control(F,O,dt,c){
 F.comboT=Math.max(0,F.comboT-dt);if(F.comboT<=0)F.combo=0;
 F.stun=Math.max(0,F.stun-dt);F.bs=Math.max(0,F.bs-dt);
 const can=!F.act&&F.stun<=0&&F.bs<=0&&!F.dead&&ph==="fight";
 if(can&&c.atk){startAtk(F,c.atk);if(c.code)delete pressed[c.code];}
 if(c.imp)activateImpact(F);if(F.impactT>0)F.impactT-=dt;
 F.block=(can||F.bs>0)&&c.block&&!F.act&&F.stun<=0&&!F.dead&&ph==="fight";
 if(F.act){F.actT+=dt;const a=ATK[F.act];F.actP=F.actT/a.dur;if(!F.hitDone&&F.actP>=a.hit){F.hitDone=true;resolveHit(F,O,F.act);}if(F.actP>=1)F.act=null;}
 const busy=F.act||F.stun>0||F.bs>0||F.dead||ph!=="fight";
 const spd=(3.3+(F.d.speed-50)*.032)*(F.block?.4:1)*(F.spdMul||1)*(F.impactT>0?1.12:1);let tx=busy?0:c.mx*spd,tz=busy?0:c.mz*spd*.8;
 const k=Math.min(1,dt*14);F.vx+=(tx-F.vx)*k;F.vz+=(tz-F.vz)*k;
 const y=F.root.rotation.y,fx_=Math.sin(y),fz=Math.cos(y);let lx=0,lz=0;
 if(F.act&&F.actP<F.actHit){const dd=Math.hypot(O.root.position.x-F.root.position.x,O.root.position.z-F.root.position.z);if(dd>1.25){const l=ATK[F.act].lunge;lx=fx_*l;lz=fz*l;}}
 const p=F.root.position;p.x+=(F.vx+F.kv.x+lx)*dt;p.z+=(F.vz+F.kv.z+lz)*dt;const kd=Math.exp(-7*dt);F.kv.x*=kd;F.kv.z*=kd;
 const sp=Math.hypot(F.vx,F.vz);F.moving+=(Math.min(1,sp/3)-F.moving)*Math.min(1,dt*10);
 F.backward=(F.vx*fx_+F.vz*fz)<-.2;F.walk+=sp*dt*2.3*(F.backward?-1:1);
 if(F.dead)F.ko=Math.min(1,F.ko+dt*1.7);
 if(F.ghost>F.hp&&F.stun<=0&&F.comboT<=0)F.ghost=Math.max(F.hp,F.ghost-20*dt);
}
function bounds(F){const p=F.root.position,a=8.8,b=5.4,e=Math.hypot(p.x/a,p.z/b);if(e>1){p.x/=e;p.z/=e;}}

/* ---------- KO replay: records both fighters' poses every frame and plays the last moments back in slow motion ---------- */
const REC_WIN=1.45,qa=new THREE.Quaternion(),qb=new THREE.Quaternion();
function recNodes(F){
 if(F._rn)return F._rn;const n=[F.root];
 if(F.isModel)F.root.traverse(o=>{if(o.isBone)n.push(o);});
 else{const j=F.j;n.push(j.hips,j.spine,j.head,...j.sh,...j.el,...j.th,...j.kn,...j.an);if(j.tail)n.push(...j.tail);}
 return F._rn=n;
}
function snap(F){const n=recNodes(F),a=new Float32Array(n.length*7);for(let i=0;i<n.length;i++){const k=i*7,p=n[i].position,q=n[i].quaternion;a[k]=p.x;a[k+1]=p.y;a[k+2]=p.z;a[k+3]=q.x;a[k+4]=q.y;a[k+5]=q.z;a[k+6]=q.w;}return a;}
function applySnap(F,a,b,u){const n=recNodes(F);for(let i=0;i<n.length;i++){const k=i*7,o=n[i];
 o.position.set(a[k]+(b[k]-a[k])*u,a[k+1]+(b[k+1]-a[k+1])*u,a[k+2]+(b[k+2]-a[k+2])*u);
 qa.set(a[k+3],a[k+4],a[k+5],a[k+6]);qb.set(b[k+3],b[k+4],b[k+5],b[k+6]);o.quaternion.copy(qa).slerp(qb,u);}}
function record(dt){simT+=dt;rec.push({t:simT,a:snap(A),b:snap(B)});while(rec.length>2&&rec[0].t<simT-REC_WIN)rec.shift();while(recEv.length&&recEv[0].t<simT-REC_WIN)recEv.shift();}
function beginReplay(text){
 if(rec.length<8||koHaz)return false;
 endText=text;ph="replay";phT=0;rp={t:rec[0].t,end:rec[rec.length-1].t,real:0,evi:0,ev:[...recEv]};
 hideBanner();$("replay-ui").classList.remove("hidden");$("combo-l").classList.remove("on");$("combo-r").classList.remove("on");return true;
}
function endReplay(){$("replay-ui").classList.add("hidden");rp=null;ph="end";phT=1.5;banner.textContent=endText;banner.className="banner hold";}
function updateReplay(rdt){
 const r=rp;r.real+=rdt;r.t+=rdt*.5;const t=Math.min(r.t,r.end);
 let i=0;while(i<rec.length-2&&rec[i+1].t<=t)i++;
 const a=rec[i],b=rec[i+1]||a,u=b.t>a.t?clamp((t-a.t)/(b.t-a.t),0,1):0;
 applySnap(A,a.a,b.a,u);applySnap(B,a.b,b.b,u);
 while(r.evi<r.ev.length&&r.ev[r.evi].t<=t){const e=r.ev[r.evi++];if(e.ko){sfx.ko();koFlash();}else{fx.hit(e.p,e.pow,e.bl);(e.pow>1.4?sfx.heavy:sfx.hit)(e.pow);}}
 stageObj.update(rdt*.5,tNow);fx.update(rdt*.5);
 const lo=winner===A?B:A,pa=A.root.position,pb=B.root.position,mx=(pa.x+pb.x)/2,mz=(pa.z+pb.z)/2,ang=camYaw-.3+.55*Math.sin(r.real*.6),dist=7.2-Math.min(2.4,r.real*.6),s=fx.shake*SHAKES[cfg.shake];
 camera.position.set(mx-Math.sin(ang)*dist+(Math.random()-.5)*s*2,1.3+.25*Math.sin(r.real*.8),mz+Math.cos(ang)*dist);
 camera.lookAt(lerp(mx,lo.root.position.x,.45),1.3,lerp(mz,lo.root.position.z,.45));
 const fov=30-fx.zoom*3;if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}
 if(r.t>=r.end+.7||skipReplay){skipReplay=false;endReplay();}
}

function updateFight(rdt){
 if(rudraClearT>0){rudraClearT-=rdt;if(B)B.root.scale.multiplyScalar(Math.max(.88,1-rdt*.72));if(rudraOrb){const k=Math.min(2.8,rudraOrb.scale.x+rdt*2.2);rudraOrb.scale.setScalar(k);}if(rudraClearT<=0){rudraClearT=0;rudraTrial=false;arcWin();return;}stageObj.update(rdt,tNow);fx.update(rdt);updateCamera(rdt);return;}
 if(ph==="result"){
  if(arcAuto>0){arcAuto-=rdt;if(arcAuto<=0){arcAuto=0;doAct("next");return;}}
  if(contOpen)tickContinue(rdt);
 }
 if(paused)return;
 if(ph==="replay"){updateReplay(rdt);return;}
 let dt=rdt*timeScale;if(hitStop>0){hitStop-=rdt;dt*=.04;}
 phT+=rdt;stageObj.update(dt,tNow);
 if(ph==="intro"){if(phT>1.3&&!called){called=true;banner.textContent="FIGHT!";banner.className="banner";void banner.offsetWidth;banner.classList.add("show");sfx.fight();say("Fight!",{pitch:.5});}
  if(phT>2.3){ph="fight";phT=0;for(const k in pressed)delete pressed[k];}}
 if(ph==="fight"&&mode!=="practice"){roundTime-=rdt*(hitStop>0?0:1);if(roundTime<=0){roundTime=0;endRound(null);}
  const sec=Math.ceil(roundTime);$("timer").textContent=sec;if(sec!==lastSec){lastSec=sec;if(sec<=10&&sec>0)sfx.beep();}}
 if(ph==="fight"&&B.boss&&!B.rage&&B.hp<35&&!B.dead){B.rage=true;setupAI();toast("⚠ BOSS RAGE MODE");sfx.warn();AUD.tempo(1.08);}
 if(ph==="ko"&&phT>1.9){timeScale=1;endRound(winner,true);}
 if(ph==="end"&&phT>3.2){nextRound();if(view!=="fight"||!A)return;}
 const c1=ph==="fight"?readP1():{mx:0,mz:0,block:false},c2=ph!=="fight"?{mx:0,mz:0,block:false}:mode==="vs"?readP2():mode==="practice"?{mx:0,mz:0,block:false}:aiControl(B,A,dt);
 if(rudraTrial&&ph==="fight"){
  c1.atk=null;c1.imp=false;
  if(c1.block&&A.stun<=0)rudraHold=Math.min(5,rudraHold+rdt);else rudraHold=Math.max(0,rudraHold-rdt*1.8);
  if(Math.floor(rudraHold)!==Math.floor(rudraHold-rdt))showBanner("HOLD BLOCK · DIVYA PRAKASH "+Math.round(rudraHold/5*100)+"%",true);
  if(rudraHold>=5&&!rudraClearT){rudraClearT=1.7;ph="result";A.act=null;B.act=null;showBanner("DIVYA PRAKASH AWAKENS",true);fx.emit({x:A.root.position.x,y:1.8,z:A.root.position.z},90,7,0xfff2a0);fx.emit({x:B.root.position.x,y:2.2,z:B.root.position.z},90,8,0xffffff);rudraOrb=new THREE.Mesh(new THREE.SphereGeometry(.42,24,16),new THREE.MeshBasicMaterial({color:0xfff2a0,transparent:true,opacity:.92}));rudraOrb.position.set(0,1.35,0);A.root.add(rudraOrb);sfx.impact();}
 }
 control(A,B,dt,c1);control(B,A,dt,c2);
 haz.update(dt,[A,B],ph==="fight",hazHit,gustPush);
 const d=Math.hypot(A.root.position.x-B.root.position.x,A.root.position.z-B.root.position.z);
 if(d<1.0&&d>.001){const push=(1.0-d)/2,nx=(A.root.position.x-B.root.position.x)/d,nz=(A.root.position.z-B.root.position.z)/d;A.root.position.x+=nx*push;A.root.position.z+=nz*push;B.root.position.x-=nx*push;B.root.position.z-=nz*push;}
 bounds(A);bounds(B);face();animateFighter(A,dt);animateFighter(B,dt);tintFighter(A,dt);tintFighter(B,dt);fx.update(dt);
 if((ph==="fight"||ph==="ko")&&dt>0)record(dt);
 hitLightV*=Math.exp(-14*rdt);hitLight.intensity=hitLightV;
 updateCamera(rdt);updateHUD();
}
function endRound(w,ko){
 if(ph==="end"||ph==="result"||ph==="replay")return;ph="end";phT=0;timeScale=1;haz.clear();
 if(!ko&&!w&&A.hp!==B.hp)w=A.hp>B.hp?A:B;
 winner=w;if(w){wins[w.side]++;w.win=true;}else{wins[0]++;wins[1]++;}
 setDots();
 const nm=w?(mode==="vs"?"PLAYER "+(w.side+1):w.side===0?"YOU":FIGHTERS[sel.p2].name):"",t=w?nm+(nm==="YOU"?" WIN":" WINS"):"DRAW";
 over=wins[0]!==wins[1]&&(Math.max(wins[0],wins[1])>=2||round>=3);
 if(mode==="arcade"&&w===A){const perfect=A.hp>=99.9;addScore(roundScore(roundTime,A.hp,perfect));if(perfect){arc.perfects++;toast("★ PERFECT ★");say("Perfect!");}}
 if(w&&(w.side===0||mode==="vs"))sfx.win();else if(w)sfx.lose();
 if(ko&&over&&mode!=="practice"&&beginReplay(t))return;
 if(ko)banner.className="banner";else{banner.textContent=w?"TIME UP":"DRAW";banner.className="banner hold";}
 if(w)setTimeout(()=>{if(view==="fight"&&ph==="end"){banner.textContent=t;banner.className="banner hold";if(!ko)say(t.toLowerCase());}},ko?250:1100);
}
function nextRound(){
 if(over){
  ph="result";hideBanner();
  if(mode==="arcade"){if(wins[0]>wins[1])arcWin();else arcLose();return;}
  if((mode==="team"||mode==="force")&&campaign){
   if(wins[0]>wins[1]){
    campaign.index++;
    if(campaign.index<campaign.total){showResult(campaign.kind==="team"?"ALLY VICTORY":"WAVE CLEARED",campaign.kind==="team"?`Your fighter advances to ally ${campaign.index+1} of 3.`:`Black soldier ${campaign.index} defeated.`,[{label:"NEXT FIGHT",act:"campaignnext",pri:true},{label:"MAIN MENU",act:"menu"}],false);return;}
    showResult(campaign.kind==="team"?"TEAM CHAMPIONS":"FORCE CAMPAIGN CLEAR",campaign.kind==="team"?"All three rivals defeated. Your team wins the 3 vs 3 battle.":"The five soldiers and final challenger have been defeated.",[{label:"MAIN MENU",act:"menu",pri:true}],false);return;
   }
   showResult("CAMPAIGN FAILED",campaign.kind==="team"?"Your team has been eliminated.":"The force campaign stopped. Train and try again.",[{label:"RETRY",act:"campaignretry",pri:true},{label:"MAIN MENU",act:"menu"}],false);return;
  }
  const w=wins[0]>wins[1]?A:B,vs=mode==="vs";
  showResult(vs?"PLAYER "+(w.side+1)+" WINS":(w.side===0?"VICTORY":"DEFEAT"),`${FIGHTERS[w.side?sel.p2:sel.p1].name} takes the match ${wins[0]} – ${wins[1]}.`,[{label:"REMATCH",act:"restart",pri:true},{label:"CHARACTER SELECT",act:"select"},{label:"MAIN MENU",act:"menu"}]);
  return;}
 round++;resetRound();
}
function showResult(title,sub,btns,stats=true){
 ph="result";$("result-title").textContent=title;$("result-sub").innerHTML=sub+(stats?statsHTML():"");
 $("result-btns").innerHTML=btns.map(b=>`<button class="btn${b.pri?" pri":""}" data-act="${b.act}">${b.label}</button>`).join("");
 $("result").classList.remove("hidden");ovFocus(0);
}
function updateCamera(dt){
 const pa=A.root.position,pb=B.root.position,mx=(pa.x+pb.x)/2,mz=(pa.z+pb.z)/2;
 let ax=pb.x-pa.x,az=pb.z-pa.z;const sep=Math.hypot(ax,az)||1;if(ax<0){ax=-ax;az=-az;}
 const yt=clamp(Math.atan2(az,ax),-.55,.55);camYaw+=(yt-camYaw)*Math.min(1,dt*3);
 let dist=clamp(6.3+sep*.55,7.5,13.5),h=1.5+sep*.05,look=1.4,off=0;
 if(ph==="intro"){const u=Math.min(1,phT/2.3),e=1-Math.pow(1-u,3);off=(1-e)*(round%2?-1:1)*.95;dist*=.6+.4*e;h=1+.9*e;look=1.3+.15*e;}
 else if(ph==="ko"||ph==="end"||ph==="result"){const u=Math.min(1,phT/3);off=u*.5*(winner&&winner.side?-1:1);dist*=.88-u*.1;h=1.5;look=1.2;}
 const ya=camYaw+off,nx=-Math.sin(ya),nz=Math.cos(ya),s=fx.shake*SHAKES[cfg.shake];
 camera.position.set(mx+nx*dist+(Math.random()-.5)*s*2,h+(Math.random()-.5)*s*2,mz+nz*dist);camera.lookAt(mx,look,mz);
 if(s>.003)camera.rotateZ((Math.random()-.5)*s*.5);
 const fov=32-fx.zoom*3.2;if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}
 heroRim.position.set(mx-nx*9+3,6.5,mz-nz*9);heroFill.position.set(mx+nx*7-2.5,4.5,mz+nz*7);
}
function updateHUD(){
 for(const[F,s]of[[A,"l"],[B,"r"]]){const hp=$("hp-"+s);hp.style.width=F.hp+"%";hp.classList.toggle("low",F.hp<25);$("ghost-bar-"+s).style.width=F.ghost+"%";
  const el=$("combo-"+s);if(F.combo>=2&&F.comboT>0){el.innerHTML=`${F.combo} HITS<small>${Math.round(F.comboDmg)} DAMAGE</small>`;el.classList.add("on");}else el.classList.remove("on");}
 for(const[F,s2]of[[A,"l"],[B,"r"]]){$("meter-"+s2).style.width=(F.impactT>0?F.impactT/7*100:F.meter)+"%";const w=$("imp-"+s2);w.classList.toggle("ready",F.meter>=100&&F.impactT<=0);w.classList.toggle("active",F.impactT>0);}
 if(arc&&mode==="arcade"&&arc.score!==lastScore){lastScore=arc.score;$("arc-score").textContent="SCORE "+String(arc.score).padStart(7,"0");}
}

/* ---------- main menu 2D effects (lightning / embers over the 3D scene) ---------- */
const mc=$("menu-fx"),mx_=mc.getContext("2d"),bolts=[],embers=[];let nextBolt=0,menuIdx=0;
function bolt(w,h){const cx=w/2,cy=h*.3,s=Math.min(w,h)/700,a=Math.random()*6.283,r1=rnd(60,330)*s,p0={x:cx+Math.cos(a)*r1*1.5,y:cy+Math.sin(a)*r1*.8},a2=a+rnd(2,4),r2=rnd(60,330)*s,p1={x:cx+Math.cos(a2)*r2*1.5,y:cy+Math.sin(a2)*r2*.8},pts=[p0],n=12;
 for(let i=1;i<n;i++){const t=i/n;pts.push({x:p0.x+(p1.x-p0.x)*t+rnd(-34,34)*s,y:p0.y+(p1.y-p0.y)*t+rnd(-34,34)*s});}pts.push(p1);bolts.push({pts,life:.28,w:rnd(1.5,3)});}
function menuFx(t,dt){
 if(mc.width!==innerWidth)mc.width=innerWidth;if(mc.height!==innerHeight)mc.height=innerHeight;const w=mc.width,h=mc.height;mx_.clearRect(0,0,w,h);
 const g=mx_.createRadialGradient(w/2,h*.3,10,w/2,h*.3,Math.min(w,h)*.55);g.addColorStop(0,"rgba(140,10,20,.45)");g.addColorStop(1,"rgba(0,0,0,0)");mx_.fillStyle=g;mx_.fillRect(0,0,w,h);
 if(t>nextBolt){bolt(w,h);if(Math.random()<.5)bolt(w,h);nextBolt=t+rnd(.12,.55);}
 mx_.lineCap="round";mx_.lineJoin="round";
 for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.life-=dt;if(b.life<=0){bolts.splice(i,1);continue;}const a=b.life/.28;mx_.globalAlpha=a;
  mx_.shadowColor="#ff2030";mx_.shadowBlur=20;mx_.strokeStyle="#fff";mx_.lineWidth=b.w;mx_.beginPath();b.pts.forEach((p,k)=>k?mx_.lineTo(p.x,p.y):mx_.moveTo(p.x,p.y));mx_.stroke();}
 mx_.globalAlpha=1;mx_.shadowBlur=0;
 if(embers.length<70)embers.push({x:rnd(0,w),y:h+10,v:rnd(30,110),s:rnd(1,3),p:rnd(0,6)});
 for(let i=embers.length-1;i>=0;i--){const e=embers[i];e.y-=e.v*dt;e.x+=Math.sin(t+e.p)*.4;if(e.y<-10){embers.splice(i,1);continue;}mx_.fillStyle=`rgba(255,${80+e.s*40},40,${.25+e.s*.15})`;mx_.fillRect(e.x,e.y,e.s,e.s);}
 const b=$("menu-list").children[menuIdx];if(b){const r=b.getBoundingClientRect(),bar=$("menu-bar");bar.style.top=(r.top+r.height/2-bar.offsetHeight/2)+"px";}
}
function setMenu(i){const n=$("menu-list").children.length;menuIdx=(i+n)%n;[...$("menu-list").children].forEach((b,k)=>b.classList.toggle("on",k===menuIdx));}
function chooseMenu(i){
 sfx.ok();const m=$("menu-list").children[i].dataset.mode;
 if(m==="options"){view="options";show("options");optIdx=0;refreshOpts();return;}
 mode=m;if(m==="vs")sel.p2=firstOpen((sel.p1+1)%FIGHTERS.length);goSelect();
}
[...$("menu-list").children].forEach((b,i)=>{b.addEventListener("mouseenter",()=>{if(view==="menu"&&menuIdx!==i){setMenu(i);sfx.ui();}});b.addEventListener("click",()=>{if(view==="menu"){setMenu(i);chooseMenu(i);}});});

/* ---------- options (keyboard / pad / mouse) ---------- */
let optIdx=0;
const optRows=()=>[...document.querySelectorAll("#options .opt-row"),$("opt-back")];
const bar10=n=>"◀ "+"▮".repeat(n)+"▯".repeat(10-n)+" ▶";
function toggleFs(){try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen();}catch(e){}}
function refreshOpts(){
 $("opt-quality").textContent=Q.name;$("opt-music").textContent=bar10(AUD.getVol("music"));$("opt-sfx").textContent=bar10(AUD.getVol("sfx"));
 $("opt-voice").textContent=AUD.getOpt("voice")?"ON":"OFF";$("opt-haz").textContent=cfg.haz?"ON":"OFF";$("opt-shake").textContent="◀ "+Math.round(SHAKES[cfg.shake]*100)+"% ▶";$("opt-fullscreen").textContent="TOGGLE";
 optRows().forEach((r,i)=>r.classList.toggle("on",i===optIdx));
}
function optToggle(n,dir=1){
 if(n==="quality")applyQuality((qi+(dir<0?2:1))%3);
 else if(n==="haz"){cfg.haz=!cfg.haz;localStorage.setItem("ri_haz",cfg.haz?"1":"0");}
 else if(n==="music"||n==="sfx"){let v=AUD.getVol(n)+dir;if(v>10)v=0;if(v<0)v=10;AUD.setVol(n,v);}
 else if(n==="shake"){cfg.shake=(cfg.shake+(dir<0?4:1))%5;localStorage.setItem("ri_shake",cfg.shake);}
 else if(n==="fullscreen")toggleFs();
 else AUD.setOpt(n,!AUD.getOpt(n));
 sfx.ui();refreshOpts();
}
function optNav(d){
 const rows=optRows();
 if(d==="up"){optIdx=(optIdx+rows.length-1)%rows.length;sfx.ui();refreshOpts();}
 else if(d==="dn"){optIdx=(optIdx+1)%rows.length;sfx.ui();refreshOpts();}
 else if(d==="bk"){sfx.back();goMenu();}
 else{const n=rows[optIdx].dataset.opt;if(n==="back"){if(d==="ok")goMenu();}else optToggle(n,d==="lf"?-1:1);}
}
document.querySelectorAll("#options .opt-row").forEach((r,i)=>{r.addEventListener("click",()=>{optIdx=i;optToggle(r.dataset.opt);});});
$("opt-back").addEventListener("click",()=>{sfx.back();goMenu();});

function show(id){
 ["main-menu","options","select-screen","stage-screen","loading","hud","vs-screen","ending-screen"].forEach(x=>$(x).classList.toggle("hidden",x!==id));
 mc.style.display=(id==="main-menu"||id==="options")?"block":"none";
 fadeEl.classList.remove("go");void fadeEl.offsetWidth;fadeEl.classList.add("go");
}
function enterMenu(){if(view!=="title")return;view="menu";$("main-menu").classList.remove("title");sfx.ok();flashV=.35;AUD.music("menu");}
function goMenu(){
 clearFighters();haz.clear();paused=false;contOpen=false;arc=null;campaign=null;rudraTrial=false;rudraHold=0;rudraClearT=0;rudraOrb=null;endSt=null;["pause","result","continue","replay-ui","movelist","diff"].forEach(id=>$(id).classList.add("hidden"));$("main-menu").classList.remove("title");
 view="menu";show("main-menu");fx.attach(selScene);showMenuFighters();AUD.music("menu");AUD.tempo(1);AUD.intensity(null);
}

/* ---------- pause / overlays / actions ---------- */
let ovIdx=0;
const ovEl=()=>["continue","result","movelist","pause"].map($).find(e=>e&&!e.classList.contains("hidden"));
const ovBtns=()=>{const o=ovEl();return o?[...o.querySelectorAll(".btn")].filter(b=>b.offsetParent!==null):[];};
function ovFocus(i){const bs=ovBtns();if(!bs.length)return;ovIdx=(i+bs.length)%bs.length;bs.forEach((b,k)=>b.classList.toggle("f",k===ovIdx));if(i!==0)sfx.ui();}
function ovClick(){const b=ovBtns()[ovIdx];if(b)doAct(b.dataset.act);}
function setPause(v){if(view!=="fight"||ph==="result")return;paused=v;$("pause").classList.toggle("hidden",!v);if(v)ovFocus(0);}
function buildMoveList(){
 const kb=inputKind==="kb",ps=inputKind==="ps",btn={punch:kb?"J":ps?"▢":"X",kick:kb?"K":ps?"✕":"A",heavy:kb?"L":ps?"△":"Y"};
 const rows=["punch","kick","heavy"].map(t=>{const a=ATK[t];return `<tr><td>${t.toUpperCase()}</td><td><span class="k">${btn[t]}</span></td><td>${a.dmg}</td><td>${Math.round(a.dur*1000)} ms</td><td>${a.reach.toFixed(1)}</td></tr>`;}).join("");
 $("move-body").innerHTML=`<table class="mv"><tr><th>MOVE</th><th>BUTTON</th><th>DAMAGE</th><th>SPEED</th><th>REACH</th></tr>${rows}</table><p class="mvtip"><b>BLOCK</b> reduces damage (hold). <b>SIDE-STEP</b> dodges straight attacks and hazards. <b>COUNTER HIT</b> = hit an enemy while he starts an attack: +25% damage. <b>IMPACT</b>: the meter fills from hits and damage taken; when it is full press ${kb?"H":"SELECT / stick-click"} for 7 seconds of +30% damage and +12% speed.</p>`;
}
function doAct(a){
 if(a==="moves"){sfx.ok();$("pause").classList.add("hidden");buildMoveList();$("movelist").classList.remove("hidden");ovFocus(0);return;}
 if(a==="movesback"){sfx.back();$("movelist").classList.add("hidden");$("pause").classList.remove("hidden");ovFocus(0);return;}
 sfx.ok();for(const id of["pause","result","continue","movelist"])$(id).classList.add("hidden");paused=false;arcAuto=0;
 if(a==="resume")return;
 if(a==="restart"){startFight();return;}
 if(a==="next"){contOpen=false;arc.i++;goVs(false);return;}
 if(a==="campaignnext"){goCampaignFight();return;}
 if(a==="campaignretry"){if(campaign){campaign.index=0;goCampaignFight();}return;}
 if(a==="cont"){contOpen=false;arc.credits--;arc.used++;goVs(true);return;}
 if(a==="quit"){gameOver();return;}
 if(a==="select"){goSelect();return;}
 goMenu();
}
$("hud").addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(b)doAct(b.dataset.act);});
$("pause-btn").addEventListener("click",()=>setPause(!paused));
document.addEventListener("visibilitychange",()=>{if(document.hidden)setPause(true);});

/* ---------- input: keyboard + gamepad -> nav() ---------- */
function nav(d){
 if(view==="title"){if(d==="ok")enterMenu();return;}
 if(view==="diff"){diffNav(d);return;}
 if(view==="fight"){
  if(ovEl()){if(d==="up")ovFocus(ovIdx-1);else if(d==="dn")ovFocus(ovIdx+1);else if(d==="ok")ovClick();else if(d==="bk"){if(!$("movelist").classList.contains("hidden"))doAct("movesback");else if(paused)doAct("resume");}return;}
  if(ph==="replay"&&d==="ok")skipReplay=true;
  return;}
 if(view==="menu"){if(d==="up"){setMenu(menuIdx-1);sfx.ui();}else if(d==="dn"){setMenu(menuIdx+1);sfx.ui();}else if(d==="ok")chooseMenu(menuIdx);}
 else if(view==="options")optNav(d);
 else if(view==="select"){if(sel.lock)return;if(d==="lf")selMove(-1,0);else if(d==="rt")selMove(1,0);else if(d==="up")selMove(0,-1);else if(d==="dn")selMove(0,1);else if(d==="ok")selConfirm();else if(d==="bk")selBack();else if(d==="alt")toggleAlt();}
 else if(view==="stage"){if(d==="lf")pickStage((stageIdx+STAGES.length-1)%STAGES.length);else if(d==="rt")pickStage((stageIdx+1)%STAGES.length);else if(d==="ok")stageConfirm();else if(d==="bk"){sfx.back();goSelect();}}
 else if(view==="vs"){if(d==="ok"&&vsT>.8)vsGo();}
 else if(view==="ending"){if(d==="ok")endAdvance();}
}
addEventListener("keydown",e=>{
 AUD.unlock();setInput("kb");if(view==="title"){enterMenu();return;}
 if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Slash"].includes(e.code))e.preventDefault();
 keys[e.code]=true;if(!e.repeat)pressed[e.code]=performance.now();
 if(e.repeat&&!["select","stage","menu","options","diff"].includes(view))return;
 const c=e.code;
 if(view==="fight"&&(c==="Escape"||c==="KeyP")){if(!$("movelist").classList.contains("hidden")){doAct("movesback");return;}setPause(!paused);return;}
 const up=c==="ArrowUp"||c==="KeyW",dn=c==="ArrowDown"||c==="KeyS",lf=c==="ArrowLeft"||c==="KeyA",rt=c==="ArrowRight"||c==="KeyD",
  ok=c==="Enter"||c==="NumpadEnter"||(c==="KeyJ"&&view!=="fight"),bk=c==="Escape"||c==="Backspace";
 const d=up?"up":dn?"dn":lf?"lf":rt?"rt":ok?"ok":bk?"bk":(c==="KeyC"&&view==="select")?"alt":null;if(d)nav(d);
});
addEventListener("keyup",e=>{keys[e.code]=false;});
addEventListener("blur",()=>{for(const k in keys)keys[k]=false;});
addEventListener("pointerdown",()=>{AUD.unlock();if(view==="title")enterMenu();});
addEventListener("gamepadconnected",e=>toast("🎮 Gamepad connected: "+String(e.gamepad.id).slice(0,38)));
addEventListener("gamepaddisconnected",()=>toast("🎮 Gamepad disconnected"));
function pollPads(){
 const hadOv=!!ovEl(),o=pads.poll(tNow);
 if(o.anyPress){AUD.unlock();setInput(pads.kind);if(view==="title")enterMenu();}
 for(const d of o.nav)nav(d);
 if(o.start&&view==="fight"&&!hadOv)setPause(true);
 const now=performance.now();
 for(let i=0;i<2;i++){const s=pads.st[i];if(s.punch)pressed["Pad"+i+"Punch"]=now;if(s.kick)pressed["Pad"+i+"Kick"]=now;if(s.heavy)pressed["Pad"+i+"Heavy"]=now;if(s.impact)pressed["Pad"+i+"Impact"]=now;}
}

/* ---------- main loop ---------- */
let fpsT=0,fpsN=0;
function frame(){
 requestAnimationFrame(frame);const rdt=Math.min(clock.getDelta(),.05);tNow+=rdt;
 try{
  pollPads();
  satV=(view==="fight"&&ph==="replay")?.55:1;flashV*=Math.exp(-8*rdt);
  if(view==="menu"||view==="options"||view==="title"){updateMenu(rdt);menuFx(tNow,rdt);render(selScene,tNow);return;}
  if(view==="select"){updateSelect(rdt);render(selScene,tNow);}
  else if(view==="vs"){updateVs(rdt);render(selScene,tNow);}
  else if(view==="ending"){updateEnding(rdt);render(selScene,tNow);}
  else if(view==="stage"){updateStagePreview(rdt);fx.update(rdt);render(fightScene,tNow);}
  else if(view==="fight"){updateFight(rdt);render(fightScene,tNow);}
  else return;
  fpsT+=rdt;fpsN++;if(fpsT>3){const f=fpsN/fpsT;fpsT=fpsN=0;if(f<28&&qi>0&&!frame.warned){frame.warned=true;applyQuality(qi-1,false);toast("Low FPS detected — graphics set to "+Q.name);}}
 }catch(e){showError(e);}
}
(async function init(){
 try{
  show("loading");$("loading-text").textContent="LOADING FIGHTERS";$("loading-tip").textContent="TIP: "+rndTip();await sleep(30);
  renderer.setPixelRatio(safePixelRatio());renderer.setSize(innerWidth,innerHeight);setupPost();
  makePortraits();buildRoster();buildSelectScene();setMenu(0);
  view="title";show("main-menu");$("main-menu").classList.add("title");fx.attach(selScene);showMenuFighters();AUD.music("menu");applyHints();frame();
  setTimeout(()=>{if(!thumbsP&&view==="menu")thumbsP=makeThumbs().catch(showError);},1800);
  setTimeout(async()=>{try{const n=await initModels();if(n>0){makePortraits();document.querySelectorAll(".tile img").forEach((im,i)=>{im.src=portraits[i];});showMenuFighters();toast(n+" real 3D model"+(n>1?"s":"")+" loaded");}}catch(e){console.warn("[models]",e);}},400);
 }catch(e){showError(e);}
})();

/* Dev helper: open index.html?debug and use the console, e.g.  __RI.skipToBoss()  /  __RI.winFight()  */
if(/[?&]debug/.test(location.search))window.__RI={
 get A(){return A;},get B(){return B;},get arc(){return arc;},get ph(){return ph;},get view(){return view;},get menuIdx(){return menuIdx;},get cfg(){return cfg;},get campaign(){return campaign;},get rudraHold(){return rudraHold;},fill(){if(A)A.meter=B.meter=100;},get stageIdx(){return stageIdx;},
 winFight(){if(B&&view==="fight"){B.hp=1;A.root.position.set(B.root.position.x-1.5,0,B.root.position.z);}},
 skipToBoss(){if(arc){arc.i=LADDER_LEN-2;toast("next fight = FINAL BOSS");}},
 haz(){return haz;}
};
