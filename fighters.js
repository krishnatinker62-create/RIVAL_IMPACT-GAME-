/* Roster based on the character sheet. NOTE: "id" stays the same (used by models/manifest.json) - only "name" is the display name.  id = file name key used in models/manifest.json
   hs (hair): 0 short,1 spiky,2 bun,3 ponytail,4 mohawk,5 none,6 long,7 headband,8 afro,9 topknot,10 dreads,11 bob
   top: 0 jacket,1 bare chest,2 tank,3 hoodie   robe: [main,trim,length]
   extra flags: bun band sash scarf beads stripe belly sword(1 back,2 hip) helm lion monkey tail feather beard streak boot */
export const FIGHTERS = [
 {id:"arjun",name:"ARJUNA",style:"Dhanurveda Combat",nat:"India",ht:180,wt:75,bio:"A calm warrior-prince whose strikes flow like arrows.",power:82,speed:84,tech:90,color:0xf4f4f4,accent:0xe8a24a,skin:0xe3b48f,hair:0x0d0d10,hs:0,top:0,pants:0xf2f2f2,build:1.0,tall:1.0,robe:[0xf6f6f6,0xd9a441,.95],sash:0xff8a2a},
 {id:"madhav",name:"MADHAV",style:"Sudarshan Flow",nat:"India",ht:178,wt:70,bio:"A graceful fighter who controls the rhythm of every fight.",power:74,speed:92,tech:94,color:0x6c86cf,accent:0xf0c75a,skin:0x7f93d8,hair:0x0b0b16,hs:6,top:1,pants:0x2f4ea6,build:.98,tall:1.0,robe:[0xdfe8ff,0xf0c75a,.9],sash:0xf0c75a,beads:true,feather:true},
 {id:"shivansh",locked:true,lockNote:"APPEARS ONLY ON STAGE 7 · ARCADE MODE",name:"RUDRA",style:"Tandava Style",nat:"India",ht:186,wt:84,bio:"A wandering ascetic with overwhelming inner power.",power:92,speed:76,tech:86,color:0xd8b08c,accent:0xcdb890,skin:0xd8b08c,hair:0x0c0a0a,hs:6,bun:true,top:1,pants:0x17171c,build:1.08,tall:1.03,robe:[0xe9e9ea,0x2a2a30,1.0],sash:0x8a7a5a,beads:true},
 {id:"raghav",name:"VEER",style:"Street Kalari",nat:"India",ht:182,wt:80,bio:"A street fighter with a red scarf and a sharp counter game.",power:86,speed:80,tech:82,color:0x1a1a20,accent:0xd0283a,skin:0xd3a27d,hair:0x0e0c0c,hs:1,top:2,pants:0x15151a,build:1.05,tall:1.02,robe:[0xefefef,0x1a1a20,.85],sash:0xd0283a,scarf:0xd0283a,beard:true},
 {id:"narsimha",name:"SAMRAT",style:"Beast Fury",nat:"India",ht:196,wt:112,bio:"A golden-maned beast warrior with crushing power.",power:98,speed:62,tech:70,color:0xc99a5a,accent:0xe0b84a,skin:0xcf9c4a,hair:0xf0e2bc,hs:5,lion:true,top:1,pants:0x1a1410,build:1.26,tall:1.1,robe:[0xe9d9a8,0xc99a2a,.8],sash:0xc99a2a,beads:true},
 {id:"samurai",name:"KAIZEN",style:"Kenjutsu Karate",nat:"Japan",ht:184,wt:86,bio:"A masked blade master who never wastes a move.",power:88,speed:78,tech:92,color:0xa82a2a,accent:0xe0b84a,skin:0xe0bb9a,hair:0x111111,hs:5,helm:true,top:0,pants:0x3a1216,build:1.08,tall:1.04,robe:[0xf0f0f0,0xa82a2a,.9],sash:0xa82a2a,sword:2,boot:0x2a1010},
 {id:"lilong",name:"KLAW",style:"Dragon Fist",nat:"Hong Kong",ht:172,wt:68,bio:"A lightning-fast fighter in a yellow combat suit.",power:80,speed:97,tech:88,color:0xf2c314,accent:0x111111,skin:0xe9b98c,hair:0x0c0c0e,hs:1,top:2,pants:0xf2c314,stripe:0x111111,glove:1.05,build:.94,tall:.97,boot:0x111111},
 {id:"hao",name:"JACKIE",style:"Acrobatic Kung Fu",nat:"China",ht:176,wt:72,bio:"A playful master who turns the whole arena into a weapon.",power:76,speed:90,tech:96,color:0xf4f4f4,accent:0x222226,skin:0xe6c4a0,hair:0x0c0c0e,hs:0,top:0,pants:0x1b1b20,build:.98,tall:1.0,robe:[0xf0f0f0,0x222226,.6]},
 {id:"sumo",name:"TAKESHI",style:"Sumo",nat:"Japan",ht:187,wt:178,bio:"An immovable giant. Once he grabs, the fight is over.",power:99,speed:38,tech:60,color:0xe6b890,accent:0xc9a24a,skin:0xe6b890,hair:0x0c0a0a,hs:9,top:1,belly:true,pants:0xc9a24a,short:true,build:1.55,tall:1.02,robe:[0xc9a24a,0x9a2a2a,.5],sash:0x9a2a2a},
 {id:"danceking",name:"JAKSAN",style:"Freestyle Dance Combat",nat:"Jamaica",ht:183,wt:78,bio:"His rhythm hides every attack until it lands.",power:78,speed:92,tech:86,color:0xf4f4f4,accent:0x55b8e6,skin:0x6e4630,hair:0x120c08,hs:10,top:2,pants:0x15151c,build:1.0,tall:1.02,robe:[0x55b8e6,0xff8fb8,.9],sash:0xff8fb8},
 {id:"rani",name:"SAAVI",style:"Mardani Khel",nat:"India",ht:169,wt:58,bio:"A fearless queen-warrior who fights with sword and spirit.",power:84,speed:88,tech:90,color:0xf4f4f4,accent:0xc02a3a,skin:0xd8a888,hair:0x0e0a0a,hs:6,band:true,top:2,pants:0xf2f2f2,build:.9,tall:.96,robe:[0xf6f6f6,0xc02a3a,.95],sash:0xc02a3a,sword:1},
 {id:"yuki",name:"YUKI",style:"Traditional Martial Arts",nat:"Japan",ht:170,wt:57,bio:"A gentle fighter whose calm hides a deadly counter.",power:70,speed:88,tech:94,color:0xf6f8ff,accent:0x9ab0d0,skin:0xf0d0b8,hair:0x0c0a10,hs:6,band:true,top:0,pants:0x1a1a22,build:.86,tall:.97,robe:[0xf6f8ff,0xb8c8e0,1.0]},
 {id:"xiyou",name:"ALEXA",style:"Wushu Acrobatics",nat:"China",ht:166,wt:52,bio:"An agile acrobat who is always one step ahead.",power:66,speed:98,tech:88,color:0xf2f2f6,accent:0x3a3a44,skin:0xf0cfb6,hair:0x14141c,hs:11,streak:0x3aa8e0,top:2,pants:0xf4f4f8,short:true,build:.84,tall:.95,robe:[0xf4f4f8,0x3a3a44,.42],boot:0xf4f4f8},
 {id:"kazura",name:"STELLA",style:"Shadow Karate",nat:"Japan",ht:172,wt:58,bio:"A dark, elegant fighter with a high ponytail and a sharper kick.",power:82,speed:86,tech:92,color:0x16161c,accent:0xc02a3a,skin:0xe9c6ad,hair:0x0a0808,hs:3,top:2,pants:0x1a1418,build:.88,tall:.99,robe:[0x1a1418,0xc02a3a,1.0],sash:0xc02a3a},
 {id:"rika",name:"SIRI",style:"Street Mixed Style",nat:"Japan",ht:165,wt:54,bio:"A free-spirited street fighter who changes style mid-fight.",power:74,speed:93,tech:84,color:0xf2f2f4,accent:0xff5a5a,skin:0xe9c6ad,hair:0x0e0e14,hs:11,streak:0x3aa8e0,top:2,pants:0x15151a,build:.86,tall:.94,robe:[0xf2f2f4,0x15151a,.7],sash:0xff5a5a},
 {id:"hanuman",name:"BAJRANG",style:"Vanara Strength",nat:"India",ht:190,wt:96,bio:"A mighty monkey warrior with incredible speed and strength.",power:94,speed:88,tech:78,color:0xf4f1ea,accent:0xe08a1e,skin:0xc89a6a,hair:0xe8e4dc,hs:4,monkey:true,tail:true,top:0,pants:0x1b1a1a,build:1.14,tall:1.06,robe:[0xf0ece2,0xe08a1e,.95],sash:0xe08a1e}
];
export const STAGES = [
 {name:"NEON ARENA",tag:"Octagon · Wall Bound",sky:"linear-gradient(#0a1030,#701828 78%,#120a14)",accent:"#ff3b3b",hazard:"laser",grade:{sat:1.08,tint:[1,.98,1.02],con:1.06,exp:.9}},
 {name:"JUNGLE RUINS",tag:"Stone Circle · Open Water",sky:"linear-gradient(#244a50,#5aa49a 70%,#0e2a2c)",accent:"#5fe0c0",hazard:"runes",grade:{sat:1.03,tint:[.97,1.02,1],con:1.04,exp:.92}},
 {name:"LUNAR ABYSS",tag:"Moon Base · Low Gravity",sky:"linear-gradient(#020308,#1a3a8a 65%,#2a2d3a)",accent:"#7aa8ff",hazard:"meteor",grade:{sat:.92,tint:[.96,.99,1.04],con:1.08,exp:.92}},
 {name:"NEON DISTRICT",tag:"Rooftop · Rainy Night",sky:"linear-gradient(#0a0830,#7a1a8a 70%,#0a0a24)",accent:"#ff3bd0",hazard:"lightning",grade:{sat:1.1,tint:[1.02,.97,1.05],con:1.08,exp:.9}},
 {name:"MAGMA CORE",tag:"Volcanic Ridge · Hazard",sky:"linear-gradient(#0a0210,#c8401a 72%,#2a0a06)",accent:"#ff7a2a",hazard:"lava",grade:{sat:1.08,tint:[1.05,.98,.94],con:1.08,exp:.88}},
 {name:"SAKURA DOJO",tag:"Courtyard · Sunset",sky:"linear-gradient(#2a1650,#ff7a5a 72%,#3a2030)",accent:"#ff8ab0",hazard:"gust",grade:{sat:1.05,tint:[1.04,.99,.96],con:1.05,exp:.9}},
 {name:"FROZEN SANCTUM",tag:"Snow Peak · Blizzard",sky:"linear-gradient(#2a4e78,#a6cde6 70%,#eaf4fa)",accent:"#8ad8ff",hazard:"ice",grade:{sat:.92,tint:[.95,.98,1.04],con:1.1,exp:.9}},
 {name:"SAND COLOSSEUM",tag:"Ancient Arena · High Noon",sky:"linear-gradient(#2f7ad6,#9ccbf0 62%,#d8b27a)",accent:"#ffc060",hazard:"sand",grade:{sat:1.06,tint:[1.04,1,.96],con:1.08,exp:.92}}
];

/* Arcade endings: one short story per fighter (shown after the final boss is beaten). */
export const ENDINGS = {
 arjun:["THE ARROW NEVER MISSES","The arena falls silent as the final challenger drops. Arjuna lowers his guard and bows to every fighter he faced. \"A warrior fights for dharma, not for fame.\" He walks into the dawn, already training for the next battle."],
 madhav:["THE RHYTHM OF THE DISC","Madhav spins one last strike, bright as a discus of light, and the boss crashes down. With a calm smile he plays a soft flute for the crowd. The world tour has a new champion, and he dances away before the cheering ends."],
 shivansh:["THE STILLNESS AFTER THE STORM","Rudra sits cross-legged in the broken ring while the dust settles. He did not come for the trophy, only to test his silence against the world's noise. He rises, leaves the prize behind, and vanishes into the mountains."],
 raghav:["KING OF THE STREETS","Veer ties his red scarf tighter as the crowd chants his name. The champion's belt feels strange in hands that grew up on concrete. He raises it high and promises every kid in his neighborhood: this belt is ours."],
 narsimha:["THE ROAR THAT SHOOK THE WORLD","Samrat lets out a roar that rattles the stadium roof. No beast, no boss, no man remains standing. He crowns himself on the shattered stage, and for the first time the lion lets his mane rest."],
 samurai:["THE BLADE STAYS SHEATHED","Kaizen's hand rests on his sword, but he never needed to draw it. The final blow was fought with fists and discipline alone. He bows to the fallen boss and whispers, \"Improve a little, every single day.\""],
 lilong:["FASTER THAN THE EYE CAN SEE","Klaw's last kick lands before the boss even blinks. Cameras can't catch it, even in slow motion. He grins, flicks his yellow glove, and vanishes in a flash before the trophy hits the floor."],
 hao:["THE PLAYFUL MASTER","Jackie wins the tournament by leaping off every wall in the arena. Afterwards he uses the golden trophy as a stool, sharing noodles with the crowd. \"The best technique,\" he laughs, \"is to enjoy the fight.\""],
 sumo:["THE IMMOVABLE MOUNTAIN","Takeshi plants his feet and the entire arena shakes. Nothing, not fire, not lasers, not the boss, could move him an inch. He bows low, claps twice, and the stadium thunders back."],
 danceking:["THE LAST BEAT","The final hit drops exactly on the beat, and the crowd erupts. Jaksan spins on one foot, freezes in a pose, and the lights cut out. In the silence, every heart in the stadium keeps his rhythm."],
 rani:["THE QUEEN'S VICTORY","Saavi raises her sword to the sky as the crowd rises to its feet. She fought for every woman who was told to stay behind the line. \"A queen does not ask for the throne,\" she says. \"She takes the arena.\""],
 yuki:["THE CALM BEFORE THE SNOW","Yuki closes her eyes as the last echo fades. The boss never touched her once, because she was never where the strikes landed. Snow begins to fall on the empty arena, and she smiles quietly."],
 xiyou:["ONE STEP AHEAD","Alexa flips off the boss's shoulder and lands lightly on the ropes. Every move he made, she had already answered. She waves to the crowd, and before the referee counts, she is gone through the lights."],
 kazura:["SHADOW UNDER THE MOON","Stella steps out of the arena into the cold night, her ponytail swaying. The crowd looks for the champion, but only a thin red ribbon remains on the floor. Some legends are never seen twice."],
 rika:["FREE STYLE, NO RULES","Siri switches style mid-fight one last time and the boss never sees it coming. She grabs the mic, laughs, and tells the world: \"Rules? Never read them.\" The street festival goes on until sunrise."],
 hanuman:["THE MIGHTY GUARDIAN","Bajrang lifts the broken arena gate with one hand and sets it back in place. His strength was never for show, only for protecting those who could not protect themselves. He salutes the sky and leaps into the clouds."]
};

/* Short pre-fight quotes (VS screen) and 3-letter country codes (HUD / VS screen) */
export const QUOTES = {
 arjun:"Focus. Aim. Release.",madhav:"Every fight has a rhythm. Learn mine.",shivansh:"Silence is the strongest strike.",raghav:"The street made me. The ring will remember me.",
 narsimha:"Kneel before the roar.",samurai:"A blade is only as sharp as the mind behind it.",lilong:"Blink and you will miss it.",hao:"Why so serious? Let's play!",
 sumo:"You cannot move a mountain.",danceking:"Feel the beat... then feel the pain.",rani:"A queen never steps back.",yuki:"Calm as snow, sharp as ice.",
 xiyou:"Catch me if you can.",kazura:"Shadows follow my lead.",rika:"Rules? Never heard of them.",hanuman:"Power is a promise to protect."
};
export const CODES = {"India":"IND","Japan":"JPN","China":"CHN","Hong Kong":"HKG","Jamaica":"JAM"};
