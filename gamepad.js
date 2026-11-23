/* Gamepad support (Standard mapping: Xbox / PlayStation / most USB pads).
   Pad 1 = Player 1 (and menu navigation), Pad 2 = Player 2 in VS mode.
   Fight:  Left stick / D-Pad = move & side-step · Right stick up/down = fast side-step
           X / Square = Punch · A / Cross = Kick · Y / Triangle = Heavy · B / Circle, LB, RB, LT, RT = Block · Start = Pause · Select / stick click = IMPACT
   Menus:  D-Pad / Left stick = move · A / Start = confirm · B = back */
const DZ=.3, blank=()=>({connected:false,mx:0,mz:0,block:false,punch:false,kick:false,heavy:false,impact:false});
const dead=(v,z=DZ)=>Math.abs(v)<z?0:Math.sign(v)*(Math.abs(v)-z)/(1-z);

export class Pads{
 constructor(){
  this.kind="xbox";this.st=[blank(),blank()];this.prev=[[],[]];this.rep={};this.gp=[null,null];this.any=false;
 }
 /* returns {nav:[...], start:bool, anyPress:bool}; fills this.st[i] */
 poll(now){
  const out={nav:[],start:false,anyPress:false};
  let list=[];try{list=[...(navigator.getGamepads?navigator.getGamepads():[])].filter(g=>g&&g.connected);}catch(e){}
  for(let i=0;i<2;i++){
   const g=list[i],s=this.st[i];this.gp[i]=g||null;
   if(!g){Object.assign(s,blank());this.prev[i]=[];continue;}
   const b=k=>!!(g.buttons[k]&&g.buttons[k].pressed),pv=this.prev[i],edge=k=>b(k)&&!pv[k];
   const ax=g.axes[0]||0,ay=g.axes[1]||0,ry=g.axes[3]||0;
   const l=b(14),r=b(15),u=b(12),d=b(13);
   s.connected=true;
   s.mx=(r?1:0)-(l?1:0)||dead(ax);
   s.mz=((d?1:0)-(u?1:0))*.8||dead(ay)*.8;
   s.mz+=dead(ry,.4)*1.4;
   s.block=b(4)||b(5)||b(6)||b(7)||b(1);
   s.punch=edge(2);s.kick=edge(0);s.heavy=edge(3);s.impact=edge(8)||edge(10)||edge(11);
   const startEdge=edge(9);
   if(i===0){
    if(startEdge)out.start=true;
    if(edge(0)||startEdge)out.nav.push("ok");
    if(edge(1))out.nav.push("bk");
    if(edge(3))out.nav.push("alt");
    this.kind=/054c|playstation|dualshock|dualsense|wireless controller/i.test(g.id||"")?"ps":"xbox";
    const dirs={up:u||ay<-.55,dn:d||ay>.55,lf:l||ax<-.55,rt:r||ax>.55};
    for(const k in dirs){
     if(dirs[k]){const e=this.rep[k];if(!e){out.nav.push(k);this.rep[k]=now+.38;}else if(now>=e){out.nav.push(k);this.rep[k]=now+.11;}}
     else delete this.rep[k];
    }
   }
   for(let k=0;k<g.buttons.length;k++)pv[k]=b(k);
   if(g.buttons.some(x=>x&&x.pressed)||Math.abs(ax)>.6||Math.abs(ay)>.6)out.anyPress=true;
  }
  return out;
 }
 rumble(i,strong=.5,weak=.5,ms=90){
  try{const g=this.gp[i];const a=g&&g.vibrationActuator;if(a&&a.playEffect)a.playEffect("dual-rumble",{startDelay:0,duration:ms,weakMagnitude:weak,strongMagnitude:strong});}catch(e){}
 }
 count(){return this.st.filter(s=>s.connected).length;}
}
