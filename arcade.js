/* Arcade ladder logic (pure functions, no THREE / DOM) */
import {FIGHTERS} from "./fighters.js";

export const NORMAL_FIGHTS = 6;                 // six random opponents + Rudra trial ...
export const LADDER_LEN = NORMAL_FIGHTS + 2;    // ... + Rudra + final boss
export const BOSS_STAGE = 4;                    // MAGMA CORE is always the final arena
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

/* Builds one arcade run for the chosen fighter.
   16 fighters: you + 7 random opponents + 1 random boss (picked from the 8 who are left) + 7 spectators. */
export const LEVELS=[{name:"EASY",d:-.2,credits:5,mul:.8,note:"Relaxed CPU · 5 credits"},{name:"NORMAL",d:0,credits:3,mul:1,note:"Balanced · 3 credits"},{name:"HARD",d:.18,credits:2,mul:1.25,note:"Aggressive CPU · 2 credits · x1.25 score"}];
export function buildRun(playerIdx,stageCount=8,level=1,n=FIGHTERS.length){
 const others=shuffle([...Array(n).keys()].filter(i=>i!==playerIdx&&i!==2));
 const opp=others.slice(0,NORMAL_FIGHTS), rest=others.slice(NORMAL_FIGHTS);
 const boss=rest[Math.floor(Math.random()*rest.length)] ?? others[others.length-1];
 const pool=[];for(let i=0;i<stageCount;i++)if(i!==BOSS_STAGE&&i!==5)pool.push(i);
 let bag=[],prev=-1;const stages=[];
 for(let k=0;k<NORMAL_FIGHTS;k++){
  if(!bag.length)bag=shuffle([...pool]);
  let s=bag.pop();if(s===prev&&bag.length){const t=bag.pop();bag.push(s);s=t;}
  stages.push(s);prev=s;
 }
 const ladder=opp.map((idx,i)=>({idx,stage:stages[i],boss:false}));
 // Stage seven is the non-defeatable Rudra trial. Rudra is LOCKED in character select, so he only ever appears here.
 ladder.push({idx:2,stage:5,boss:false,rudraTrial:true});
 ladder.push({idx:boss,stage:BOSS_STAGE,boss:true,finalBoss:true});
 return {player:playerIdx,ladder,i:0,score:0,level,credits:LEVELS[level].credits,used:0,hits:0,perfects:0,startedAt:Date.now()};
}

/* Difficulty. stage = 0..6 for normal fights, boss = final fight.
   escal = extra difficulty that grows by itself (boss gets stronger every round you win, and the AI adapts if you dominate). */
export function diffFor(stage,boss,escal=0){
 const base=boss?.95:.08+stage*.115;
 return Math.max(0,Math.min(1.45,base+escal));
}
export function aiParams(diff,tech=80,boss=false){
 const d=diff, t=(tech-80)/400;
 return {
  diff:d,
  lv:Math.max(.4,Math.min(1.6,.5+d*.9+t)),          // thinking speed
  block:Math.min(.92,.1+d*.55),                      // chance to block a visible attack
  evade:Math.min(.5,.04+d*.22),                      // chance to side-step instead
  aggr:Math.min(.95,.3+d*.5),                        // how often it goes for an attack
  cd:Math.max(.35,1.05-d*.55),                       // attack cooldown multiplier (lower = faster)
  heavy:.12+d*.12,
  dmgMul:boss?1.15+Math.max(0,d-.95)*.5:.75+d*.38,  // damage dealt
  defMul:boss?.82:1,                                 // damage taken
  spdMul:.92+d*.14,
  stunMul:boss?.6:1
 };
}

/* Score */
export const hitScore=combo=>50*Math.max(1,combo);
export const roundScore=(timeLeft,hpPct,perfect)=>1500+Math.round(timeLeft)*20+Math.round(hpPct)*30+(perfect?3000:0);
export const matchScore=(stage,boss)=>boss?25000:5000+stage*500;
export function rankOf(score,used){
 if(used===0&&score>=100000)return "S";
 if(used<=1&&score>=75000)return "A";
 if(score>=45000)return "B";
 return "C";
}
