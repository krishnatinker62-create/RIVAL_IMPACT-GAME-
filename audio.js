/* RIVAL IMPACT - audio engine
   Everything is generated in code with the Web Audio API: original music (procedural sequencer),
   synthesized sound effects and an optional announcer voice (browser speech). No audio files, nothing copyrighted. */

const st={music:true,sfx:true,voice:true,unlocked:false,vmusic:10,vsfx:10};
try{for(const k of["voice"]){const v=localStorage.getItem("ri_"+k);if(v!==null)st[k]=v==="1";}
 for(const k of["music","sfx"]){const v=localStorage.getItem("ri_v"+k);if(v!==null)st["v"+k]=Math.max(0,Math.min(10,+v));st[k]=st["v"+k]>0;}}catch(e){}
const save=k=>{try{localStorage.setItem("ri_"+k,st[k]?"1":"0");}catch(e){}};
const mVol=()=>st.music?.55*st.vmusic/10:0, sVol=()=>.9*st.vsfx/10;

let ac=null,master,comp,musicG,sfxG,revIn,dlyIn,noiseBuf,want=null,cur=null,timer=null,tempoMul=1,lvOver=null;
const rnd=(a,b)=>a+Math.random()*(b-a);
const NOTE=m=>440*Math.pow(2,(m-69)/12);
const SCALES={minor:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10],major:[0,2,4,5,7,9,11],hira:[0,2,3,7,8],harm:[0,2,3,5,7,8,11]};

/* ---------------- graph ---------------- */
function build(){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
 ac=new AC();
 master=ac.createGain();master.gain.value=.9;
 comp=ac.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=18;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.2;
 master.connect(comp);comp.connect(ac.destination);
 musicG=ac.createGain();musicG.gain.value=mVol();musicG.connect(master);
 sfxG=ac.createGain();sfxG.gain.value=sVol();sfxG.connect(master);
 // reverb (generated impulse)
 const len=Math.floor(ac.sampleRate*1.9),imp=ac.createBuffer(2,len,ac.sampleRate);
 for(let c=0;c<2;c++){const d=imp.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}
 const conv=ac.createConvolver();conv.buffer=imp;revIn=ac.createGain();revIn.gain.value=1;
 const revOut=ac.createGain();revOut.gain.value=.32;revIn.connect(conv);conv.connect(revOut);revOut.connect(master);
 // delay (music lead / arps)
 const dl=ac.createDelay(1.0);dl.delayTime.value=.34;const fb=ac.createGain();fb.gain.value=.32;const lp=ac.createBiquadFilter();lp.type="lowpass";lp.frequency.value=2400;
 dlyIn=ac.createGain();dlyIn.gain.value=1;dlyIn.connect(dl);dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(musicG);
 // noise
 const n=ac.sampleRate*2;noiseBuf=ac.createBuffer(1,n,ac.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)nd[i]=Math.random()*2-1;
 return true;
}
export function unlock(){
 try{
  if(!ac&&!build())return;
  if(ac.state==="suspended")ac.resume();
  if(!st.unlocked){st.unlocked=true;if(want&&st.music)startTrack(want.name,want.o);}
 }catch(e){console.warn("[audio]",e);}
}
export const isUnlocked=()=>st.unlocked;
const ready=()=>st.unlocked&&ac;

/* ---------------- low-level voices ---------------- */
function tone(o){
 const t=o.t,osc=ac.createOscillator(),g=ac.createGain();
 osc.type=o.type||"sine";osc.frequency.setValueAtTime(Math.max(1,o.f0),t);
 if(o.f1)osc.frequency.exponentialRampToValueAtTime(Math.max(1,o.f1),t+o.dur);
 if(o.det)osc.detune.value=o.det;
 const a=o.a||.003,end=t+o.dur;
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(Math.max(.0002,o.gain),t+a);g.gain.exponentialRampToValueAtTime(.0001,end);
 let out=osc;
 if(o.lp){const f=ac.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(o.lp,t);if(o.lp1)f.frequency.exponentialRampToValueAtTime(Math.max(20,o.lp1),end);osc.connect(f);out=f;}
 out.connect(g);g.connect(o.dest||sfxG);
 if(o.send){const s=ac.createGain();s.gain.value=o.send;g.connect(s);s.connect(revIn);}
 if(o.dly){const s=ac.createGain();s.gain.value=o.dly;g.connect(s);s.connect(dlyIn);}
 osc.start(t);osc.stop(end+.05);
}
function noise(o){
 const t=o.t,src=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
 src.buffer=noiseBuf;src.loop=true;
 f.type=o.type||"lowpass";f.Q.value=o.q||1;f.frequency.setValueAtTime(Math.max(20,o.f0),t);
 if(o.f1)f.frequency.exponentialRampToValueAtTime(Math.max(20,o.f1),t+o.dur);
 const a=o.a||.002,end=t+o.dur;
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(Math.max(.0002,o.gain),t+a);g.gain.exponentialRampToValueAtTime(.0001,end);
 src.connect(f);f.connect(g);g.connect(o.dest||sfxG);
 if(o.send){const s=ac.createGain();s.gain.value=o.send;g.connect(s);s.connect(revIn);}
 src.start(t,Math.random()*1.5);src.stop(end+.05);
}
const S=fn=>(...a)=>{if(!st.sfx||!ready())return;try{fn(ac.currentTime+.005,...a);}catch(e){console.warn("[sfx]",e);}};

/* ---------------- sound effects ---------------- */
export const sfx={
 ui:S(t=>tone({t,type:"triangle",f0:1100,f1:900,dur:.05,gain:.07})),
 ok:S(t=>{tone({t,type:"square",f0:660,dur:.07,gain:.05});tone({t:t+.07,type:"square",f0:990,dur:.1,gain:.05});}),
 back:S(t=>tone({t,type:"triangle",f0:720,f1:420,dur:.1,gain:.07})),
 swing:S((t,p=.6)=>noise({t,type:"bandpass",f0:600+rnd(0,200),f1:2600+p*600,q:1.2,dur:.1+.08*p,gain:.07+.06*p,a:.03})),
 hit:S((t,p=.6)=>{const k=rnd(.9,1.12);
  tone({t,f0:170*k,f1:48,dur:.16,gain:.45+.2*p});
  tone({t,type:"triangle",f0:330*k,f1:110,dur:.09,gain:.2});
  noise({t,type:"highpass",f0:1800,q:.7,dur:.06,gain:.32});
 }),
 heavy:S(t=>{
  tone({t,f0:125,f1:30,dur:.34,gain:.9,send:.15});tone({t,f0:62,f1:28,dur:.5,gain:.5});
  noise({t,type:"lowpass",f0:1100,f1:160,dur:.36,gain:.5,send:.2});noise({t,type:"highpass",f0:1300,dur:.1,gain:.4});
 }),
 block:S(t=>{for(const f of[780,1250,2010,3100])tone({t,f0:f*rnd(.98,1.02),dur:.22,gain:.07});
  noise({t,type:"bandpass",f0:3000,q:2,dur:.04,gain:.25});tone({t,f0:190,f1:100,dur:.08,gain:.22});}),
 ko:S(t=>{tone({t,f0:100,f1:24,dur:1.3,gain:.9,send:.3});noise({t,type:"lowpass",f0:700,f1:60,dur:1.1,gain:.6,send:.4});
  noise({t,type:"highpass",f0:1000,dur:.15,gain:.5});sfx.crowd();}),
 crowd:S((t)=>{noise({t,type:"bandpass",f0:900,f1:1400,q:.6,dur:2.2,gain:.2,a:.5,send:.3});noise({t:t+.1,type:"bandpass",f0:1800,q:.5,dur:1.6,gain:.07,a:.4});}),
 announce:S(t=>{tone({t,type:"sawtooth",f0:180,f1:520,dur:.4,gain:.08,lp:1800});noise({t,type:"bandpass",f0:400,f1:3000,q:1,dur:.4,gain:.08,a:.1});}),
 fight:S(t=>{tone({t,f0:90,f1:35,dur:.5,gain:.7,send:.2});tone({t,type:"sawtooth",f0:220,f1:660,dur:.35,gain:.1,lp:2400});noise({t,type:"highpass",f0:1500,dur:.2,gain:.3});}),
 beep:S(t=>tone({t,type:"square",f0:1200,dur:.06,gain:.05})),
 count:S(t=>{tone({t,f0:440,dur:.14,gain:.13});noise({t,type:"highpass",f0:3000,dur:.03,gain:.15});}),
 win:S(t=>[523,659,784,1047].forEach((f,i)=>tone({t:t+i*.09,type:"triangle",f0:f,dur:.3,gain:.09,send:.25}))),
 lose:S(t=>[392,349,311,262].forEach((f,i)=>tone({t:t+i*.17,type:"sawtooth",f0:f,dur:.32,gain:.07,lp:1000,send:.2}))),
 clear:S(t=>[523,659,784,1047,1319,1568].forEach((f,i)=>tone({t:t+i*.1,type:"square",f0:f,dur:.25,gain:.05,send:.3}))),
 gameover:S(t=>{tone({t,type:"sawtooth",f0:220,f1:40,dur:1.8,gain:.3,lp:500});noise({t,type:"lowpass",f0:500,f1:60,dur:1.6,gain:.3});}),
 vs:S(t=>{tone({t,f0:70,f1:30,dur:.7,gain:.8,send:.3});noise({t,type:"highpass",f0:1200,dur:.3,gain:.4,send:.3});tone({t:t+.05,type:"sawtooth",f0:110,f1:880,dur:.5,gain:.06,lp:2500});}),
 gust:S(t=>{noise({t,type:"bandpass",f0:300,f1:1800,q:.8,dur:1.3,gain:.35,a:.5,send:.2});}),
 ice:S(t=>{[1320,1760,2490,3140].forEach((f,i)=>tone({t:t+i*.03,f0:f,dur:.4,gain:.06,send:.4}));noise({t,type:"highpass",f0:3500,dur:.12,gain:.4});tone({t,f0:150,f1:50,dur:.4,gain:.5});}),
 sand:S(t=>{tone({t,f0:80,f1:34,dur:.8,gain:.8,send:.15});noise({t,type:"lowpass",f0:1000,f1:150,dur:.9,gain:.55});noise({t,type:"bandpass",f0:2500,q:.7,dur:.5,gain:.2});}),
 impact:S(t=>{tone({t,type:"sawtooth",f0:110,f1:880,dur:.45,gain:.12,lp:3000,send:.3});tone({t,f0:70,f1:30,dur:.6,gain:.7,send:.2});[523,659,784,1047].forEach((f,i)=>tone({t:t+.1+i*.05,type:"square",f0:f,dur:.2,gain:.04,send:.3}));noise({t,type:"highpass",f0:2000,dur:.2,gain:.3});}),
 counter:S(t=>{tone({t,type:"square",f0:1500,f1:600,dur:.1,gain:.07});noise({t,type:"highpass",f0:3000,dur:.08,gain:.35});}),
 // stage hazards
 warn:S(t=>{tone({t,type:"square",f0:880,dur:.08,gain:.05});tone({t:t+.11,type:"square",f0:660,dur:.08,gain:.05});}),
 laserWarn:S(t=>tone({t,type:"sine",f0:300,f1:1400,dur:.9,gain:.06})),
 laser:S(t=>{tone({t,type:"sawtooth",f0:2600,f1:150,dur:.55,gain:.2,lp:5000,lp1:300});noise({t,type:"highpass",f0:2000,dur:.5,gain:.22,send:.15});}),
 lava:S(t=>{tone({t,f0:70,f1:30,dur:.9,gain:.9,send:.2});noise({t,type:"lowpass",f0:800,f1:90,dur:1,gain:.6,send:.25});noise({t,type:"highpass",f0:2500,dur:.5,gain:.14});}),
 thunder:S(t=>{noise({t,type:"lowpass",f0:600,f1:60,dur:1.8,gain:.8,a:.02,send:.4});noise({t,type:"highpass",f0:3000,dur:.12,gain:.6});tone({t,f0:80,f1:30,dur:.9,gain:.5});}),
 meteorFall:S(t=>tone({t,type:"sine",f0:1400,f1:260,dur:.9,gain:.07})),
 meteor:S(t=>{tone({t,f0:90,f1:28,dur:.8,gain:.9,send:.25});noise({t,type:"lowpass",f0:450,f1:80,dur:.7,gain:.6});noise({t,type:"highpass",f0:1500,dur:.12,gain:.4});}),
 runes:S(t=>{[440,660,880].forEach((f,i)=>tone({t:t+i*.04,f0:f,dur:.6,gain:.07,send:.4}));tone({t,f0:200,f1:60,dur:.5,gain:.6});noise({t,type:"bandpass",f0:1200,q:1,dur:.4,gain:.3});})
};

/* ---------------- announcer (browser speech, optional) ---------------- */
let voice=null;
function pickVoice(){
 if(voice)return voice;
 try{const vs=speechSynthesis.getVoices();if(!vs.length)return null;
  voice=vs.find(v=>/^en/i.test(v.lang)&&/(male|david|daniel|mark|guy|george|alex|fred)/i.test(v.name))||vs.find(v=>/^en/i.test(v.lang))||null;}catch(e){}
 return voice;
}
export function say(text,o={}){
 if(!st.voice||!st.unlocked)return;
 try{
  if(!("speechSynthesis" in window))return;
  const u=new SpeechSynthesisUtterance(text);u.pitch=o.pitch??.55;u.rate=o.rate??.92;u.volume=o.vol??1;const v=pickVoice();if(v)u.voice=v;
  speechSynthesis.cancel();speechSynthesis.speak(u);
 }catch(e){}
}

/* ---------------- music ---------------- */
const TRACKS={
 //  k/s/h/t = 16-step drum patterns (x hit, o open hat) · b = bass (r root, 5 fifth, o octave) · a = arp (0-2 chord tone, 3 = octave)
 menu:{bpm:86,root:45,scale:"minor",prog:[0,5,3,4],k:"x.......x.......",s:"........x.......",h:"x.x.x.x.x.x.x.x.",b:"r.....r.r.....5.",a:"0.1.2.1.0.1.2.3.",ao:1,wave:"triangle",lead:{d:.4,seed:3,lo:57,hi:76},lv:2,pad:.13},
 select:{bpm:112,root:43,scale:"dorian",prog:[0,3,6,4],k:"x...x...x...x...",s:"....x.......x...",h:"x.x.x.x.x.x.x.xo",b:"r.r.r.r.r.r.r.5.",a:"0120120301201203",ao:1,wave:"square",lead:{d:.5,seed:7,lo:55,hi:79},lv:2,pad:.09},
 vs:{bpm:100,root:40,scale:"phrygian",prog:[0,1,0,6],k:"x..x..x...x..x..",s:"....x.......x.x.",h:"x.x.x.x.xxx.x.x.",b:"rrr.rrr.rrr.rr5.",a:"0.2.0.2.0.2.0.2.",ao:1,wave:"sawtooth",lead:{d:.3,seed:5,lo:52,hi:72},lv:2,pad:.12},
 f0:{bpm:134,root:45,scale:"minor",prog:[0,0,5,4],k:"x...x...x...x...",s:"....x.......x...",h:"x.x.x.x.x.x.x.xo",b:"r.rr.r.rr.rr.r5r",a:"0120120301201203",ao:1,wave:"square",lead:{d:.55,seed:21,lo:57,hi:81},lv:2,pad:.08},
 f1:{bpm:120,root:38,scale:"dorian",prog:[0,2,3,0],k:"x..x..x...x..x..",s:"....x.......x...",h:"x.x.x.x.x.x.x.x.",t:"..x...x...x..x.x",b:"r..r..r.r..r.r..",a:"0.1.2.1.0.2.1.2.",ao:1,wave:"triangle",lead:{d:.35,seed:33,lo:50,hi:74},lv:2,pad:.12},
 f2:{bpm:104,root:40,scale:"minor",prog:[0,5,2,6],k:"x.......x...x...",s:"........x.......",h:"..x...x...x...x.",b:"r.......r.....5.",a:"01230123..2.1.0.",ao:1,wave:"sine",lead:{d:.25,seed:45,lo:55,hi:79},lv:2,pad:.18},
 f3:{bpm:124,root:42,scale:"minor",prog:[0,5,3,4],k:"x...x...x...x...",s:"....x.......x...",h:"..x...x...x...x.",b:"r.rr.rr.r.rr.rr.",a:"0.1.2.1.0.1.2.3.",ao:1,wave:"sawtooth",lead:{d:.5,seed:57,lo:54,hi:78},lv:2,pad:.11},
 f4:{bpm:142,root:36,scale:"phrygian",prog:[0,1,0,3],k:"x.xxx..xx.xxx..x",s:"....x.......x...",h:"xxxxxxxxxxxxxxxx",b:"rr.rr.r.rr.rr.r.",a:"0102010201020103",ao:1,wave:"sawtooth",lead:{d:.45,seed:69,lo:48,hi:72},lv:2,pad:.1},
 f5:{bpm:104,root:45,scale:"hira",prog:[0,2,3,1],k:"x.......x..x....",s:"",h:"..x...x...x...x.",t:"....x.......x.x.",b:"r.......r.....5.",a:"0.1.2.1.0.2.1.2.",ao:1,wave:"triangle",lead:{d:.35,seed:101,lo:57,hi:81},lv:2,pad:.1},
 f6:{bpm:118,root:40,scale:"minor",prog:[0,5,3,4],k:"x.......x...x...",s:"........x.......",h:"x.x.x.x.x.x.x.x.",b:"r.......r.......",a:"0..1..2..1..0.2.",ao:1,wave:"sine",lead:{d:.3,seed:113,lo:60,hi:84},lv:2,pad:.2},
 f7:{bpm:126,root:38,scale:"harm",prog:[0,5,0,4],k:"x...x...x...x...",s:"....x.......x...",h:"x.x.x.x.x.x.x.xo",t:"x..x..x...x.x...",b:"r.rr.r.rr.rr.r5.",a:"0.2.1.2.0.2.1.3.",ao:1,wave:"square",lead:{d:.5,seed:127,lo:52,hi:78},lv:2,pad:.09},
 boss:{bpm:156,root:38,scale:"harm",prog:[0,5,0,4],k:"x.xxx.x.x.xxx.x.",s:"....x..x....x..x",h:"xxxxxxxxxxxxxxxx",b:"rrrrrrrrrrrrrr5r",a:"0120120301201203",ao:1,wave:"sawtooth",lead:{d:.65,seed:81,lo:50,hi:76},lv:2,pad:.1},
 ending:{bpm:78,root:48,scale:"major",prog:[0,4,5,3],k:"x.......x.......",s:"",h:"",b:"r.......5.......",a:"0.1.2.1.0.1.2.3.",ao:1,wave:"triangle",lead:{d:.3,seed:93,lo:60,hi:84},lv:2,pad:.17},
 continue:{bpm:66,root:38,scale:"minor",prog:[0,0,5,5],k:"x.......x.......",s:"",h:"",b:"r...............",a:"0...1...2...1...",ao:1,wave:"sine",lead:null,lv:1,pad:.16}
};
const chordNotes=(T,deg)=>{const sc=SCALES[T.scale],n=sc.length,p=i=>sc[i%n]+12*Math.floor(i/n);return[T.root+p(deg),T.root+p(deg+2),T.root+p(deg+4)];};

function genMelody(T){
 if(T._mel||!T.lead)return;
 const sc=SCALES[T.scale],L=T.lead;let seed=L.seed||1;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const pool=[];for(let o=-2;o<6;o++)for(const d of sc){const m=T.root+12*o+d;if(m>=L.lo&&m<=L.hi)pool.push(m);}
 const mel=new Array(64).fill(null);let idx=Math.floor(pool.length/2);
 for(let b=0;b<4;b++){
  const ch=chordNotes(T,T.prog[b%T.prog.length]).map(m=>((m%12)+12)%12);
  for(let s=0;s<16;s+=2){
   if(r()>L.d&&s!==0)continue;
   let step=Math.round((r()-.5)*4);
   if(s%8===0){let best=idx,bd=99;pool.forEach((m,i)=>{if(ch.includes(((m%12)+12)%12)){const d=Math.abs(i-idx);if(d<bd){bd=d;best=i;}}});idx=best;}
   else idx=Math.max(0,Math.min(pool.length-1,idx+step));
   mel[b*16+s]={m:pool[idx],d:(r()<.3?4:2)};
  }
 }
 for(let b=4;b<8;b++)for(let s=0;s<16;s++){const o=mel[(b-4)*16+s];mel[b*16+s]=o&&!(b===7&&s>=12)?o:null;}
 T._mel=mel;
}

function padNote(t,notes,dur,vol,dest){
 for(const m of notes){for(const det of[-7,7]){
  const o=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();
  o.type="sawtooth";o.frequency.value=NOTE(m);o.detune.value=det;f.type="lowpass";f.frequency.setValueAtTime(500,t);f.frequency.linearRampToValueAtTime(1300,t+dur*.5);f.frequency.linearRampToValueAtTime(600,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol/6,t+dur*.3);g.gain.linearRampToValueAtTime(.0001,t+dur);
  o.connect(f);f.connect(g);g.connect(dest);const s=ac.createGain();s.gain.value=.5;g.connect(s);s.connect(revIn);o.start(t);o.stop(t+dur+.05);}}
}
function drumKick(t,v,dest){tone({t,f0:150,f1:42,dur:.26,gain:.95*v,dest});noise({t,type:"highpass",f0:2500,dur:.012,gain:.12*v,dest});}
function drumSnare(t,v,dest){noise({t,type:"bandpass",f0:1900,q:.8,dur:.16,gain:.4*v,dest,send:.12});tone({t,type:"triangle",f0:210,f1:140,dur:.1,gain:.25*v,dest});}
function drumHat(t,v,open,dest){noise({t,type:"highpass",f0:7000,q:.8,dur:open?.2:.04,gain:(open?.1:.08)*v,dest});}
function drumTom(t,v,dest){tone({t,f0:190,f1:95,dur:.22,gain:.5*v,dest,send:.15});}

function playStep(c,step,t,spb){
 const T=c.T,lv=lvOver??T.lv,bar=Math.floor(step/16),s=step%16,deg=T.prog[bar%T.prog.length],ch=chordNotes(T,deg),dest=c.g;
 const at=(p,i)=>p&&p[i]||".";
 if(s===0&&T.pad)padNote(t,ch,spb*16,T.pad,dest);
 const calm=lv<1;
 if(at(T.k,s)==="x"&&(!calm||s%8===0))drumKick(t,1,dest);
 if(lv>=1&&at(T.s,s)==="x")drumSnare(t,1,dest);
 if(lv>=1){const h=at(T.h,s);if(h==="x")drumHat(t,s%4===2?1:.6,false,dest);else if(h==="o")drumHat(t,1,true,dest);}
 if(at(T.t,s)==="x"&&lv>=1)drumTom(t,1,dest);
 const b=at(T.b,s);
 if(b!=="."&&(!calm||s%8===0)){const off=b==="5"?7:b==="o"?12:0,m=ch[0]-12+off;
  tone({t,type:T.wave==="sine"?"sine":"sawtooth",f0:NOTE(m),dur:spb*(T.bpm>130?1.3:1.8),gain:.2,lp:700,lp1:200,dest});tone({t,f0:NOTE(m-12),dur:spb*1.6,gain:.22,dest});}
 const a=at(T.a,s);
 if(lv>=1&&a!=="."){const i=+a,m=(i===3?ch[0]+12:ch[i])+12*(T.ao||0);tone({t,type:T.wave||"square",f0:NOTE(m),dur:spb*1.5,gain:.055,lp:3200,dest,dly:.35,send:.1});}
 if(lv>=2&&T._mel){const n=T._mel[step%64];if(n)tone({t,type:T.wave==="sine"?"triangle":"sawtooth",f0:NOTE(n.m),dur:spb*n.d*.95,gain:.075,a:.01,lp:3400,dest,dly:.4,send:.2,det:rnd(-4,4)});}
}

function tick(){
 if(!cur||!ac)return;
 const c=cur,T=c.T,spb=60/(T.bpm*tempoMul)/4;
 if(c.next<ac.currentTime-.15)c.next=ac.currentTime+.05;      // tab was in the background: do not burst-schedule
 while(c.next<ac.currentTime+.2){playStep(c,c.step,c.next,spb);c.next+=spb;c.step++;}
}
function stopCurrent(fade=.5){
 if(!cur)return;const old=cur;cur=null;
 try{old.g.gain.cancelScheduledValues(ac.currentTime);old.g.gain.setValueAtTime(old.g.gain.value,ac.currentTime);old.g.gain.linearRampToValueAtTime(.0001,ac.currentTime+fade);}catch(e){}
 setTimeout(()=>{try{old.g.disconnect();}catch(e){}},fade*1000+400);
}
function startTrack(name,o={}){
 const T=TRACKS[name];if(!T||!ready())return;
 stopCurrent(.5);genMelody(T);
 const g=ac.createGain();g.gain.setValueAtTime(.0001,ac.currentTime);g.gain.linearRampToValueAtTime(1,ac.currentTime+.6);g.connect(musicG);
 tempoMul=o.tempo||1;lvOver=o.lv??null;
 cur={name,T,g,step:0,next:ac.currentTime+.08};
 if(!timer)timer=setInterval(tick,30);
}
/* play a track (remembered even if the audio is still locked) */
export function music(name,o={}){
 if(want&&want.name===name&&cur&&cur.name===name)return;
 want={name,o};
 if(st.music&&ready())startTrack(name,o);
}
export function stopMusic(fade=.6){want=null;if(ready())stopCurrent(fade);}
export function intensity(n){lvOver=n;}
export function tempo(x){tempoMul=x;}
/* lower the music for a moment (KO, announcer) */
export function duck(sec=1.2,amt=.3){
 if(!ready())return;const t=ac.currentTime,v=mVol();
 musicG.gain.cancelScheduledValues(t);musicG.gain.setValueAtTime(musicG.gain.value,t);musicG.gain.linearRampToValueAtTime(v*amt,t+.05);musicG.gain.linearRampToValueAtTime(v,t+sec);
}

/* ---------------- settings ---------------- */
export function setOpt(k,v){
 st[k]=!!v;save(k);
 if(!ready())return;
 if(k==="voice"&&!v){try{speechSynthesis.cancel();}catch(e){}}
}
/* volume sliders: k = "music" | "sfx", n = 0..10 */
export function setVol(k,n){
 n=Math.max(0,Math.min(10,Math.round(n)));st["v"+k]=n;st[k]=n>0;try{localStorage.setItem("ri_v"+k,String(n));}catch(e){}
 if(!ready())return;
 if(k==="music"){musicG.gain.cancelScheduledValues(ac.currentTime);musicG.gain.value=mVol();if(n>0){if(want&&!cur)startTrack(want.name,want.o);}else stopCurrent(.2);}
 else sfxG.gain.value=sVol();
}
export const getVol=k=>st["v"+k];
export const getOpt=k=>st[k];
export const AUD={unlock,music,stopMusic,intensity,tempo,duck,setOpt,getOpt,setVol,getVol,isUnlocked,say,sfx};
