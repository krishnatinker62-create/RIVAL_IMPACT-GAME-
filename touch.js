/* v8 on-screen touch controls (phones / tablets). They fire the same keyboard events the game already listens to,
   so no game logic was changed. Shown only on touch devices. */
const $=id=>document.getElementById(id);
const held=new Set();
const fire=(type,code)=>window.dispatchEvent(new KeyboardEvent(type,{code,key:code,bubbles:true,cancelable:true}));
const down=c=>{if(held.has(c))return;held.add(c);fire("keydown",c);};
const up=c=>{if(!held.has(c))return;held.delete(c);fire("keyup",c);};
const tap=c=>{fire("keydown",c);setTimeout(()=>fire("keyup",c),50);};
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms);}catch(e){}};

function mk(parent,cls,label,code,opt={}){
 const b=document.createElement("div");b.className="tc "+cls;b.innerHTML=label;b.style.gridArea=opt.area||"";
 const on=e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);b.classList.add("on");if(opt.buzz)buzz(opt.buzz);down(code);};
 const off=e=>{e.preventDefault();b.classList.remove("on");up(code);};
 b.addEventListener("pointerdown",on);b.addEventListener("pointerup",off);b.addEventListener("pointercancel",off);b.addEventListener("lostpointercapture",off);
 b.addEventListener("contextmenu",e=>e.preventDefault());
 parent.appendChild(b);return b;
}

function build(){
 if($("touch-ui"))return;
 document.body.classList.add("is-touch");
 const hud=$("hud")||document.body,root=document.createElement("div");root.id="touch-ui";
 const pad=document.createElement("div");pad.className="tpad";
 mk(pad,"dir","▲","KeyW",{area:"u"});mk(pad,"dir","◀","KeyA",{area:"l"});mk(pad,"dir","▶","KeyD",{area:"r"});mk(pad,"dir","▼","KeyS",{area:"d"});
 const act=document.createElement("div");act.className="tact";
 mk(act,"blk","BLOCK","ShiftLeft",{area:"b"});mk(act,"hvy","HEAVY","KeyL",{area:"h",buzz:18});mk(act,"imp","IMPACT","KeyH",{area:"i",buzz:30});
 mk(act,"pun","PUNCH","KeyJ",{area:"p",buzz:10});mk(act,"kck","KICK","KeyK",{area:"k",buzz:14});
 root.append(pad,act);hud.appendChild(root);

 const root2=$("game-root")||document.body;
 const mkBtn=(id,txt,code)=>{const b=document.createElement("button");b.id=id;b.className="tb";b.textContent=txt;
  b.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();tap(code);buzz(8);});root2.appendChild(b);return b;};
 const back=mkBtn("touch-back","◀ BACK","Escape"),ok=mkBtn("touch-ok","CONFIRM ▶","Enter");
 const vis=id=>{const e=$(id);return e&&!e.classList.contains("hidden");};
 setInterval(()=>{
  back.style.display=["select-screen","options","stage-screen","diff"].some(vis)?"block":"none";
  ok.style.display=["vs-screen","ending-screen"].some(vis)?"block":"none";
 },250);
 window.addEventListener("blur",()=>[...held].forEach(up));
}

if(matchMedia("(pointer:coarse)").matches)build();
else window.addEventListener("touchstart",build,{once:true,passive:true});
