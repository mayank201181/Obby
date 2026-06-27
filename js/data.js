/* ===== Game data + persistent storage ===== */
const SAVE_KEY = 'obbyBlobsSave_v1';

// Skin colors. Default ones are free (price 0). Others cost 10 coins.
const SKINS = [
  { id:'mint',    color:'#9be7a0', price:0 },
  { id:'sky',     color:'#9cc4ff', price:0 },
  { id:'bubble',  color:'#ffb8e0', price:0 },
  { id:'lemon',   color:'#ffe177', price:50 },
  { id:'peach',   color:'#ffb38a', price:50 },
  { id:'lilac',   color:'#c8a0ff', price:50 },
  { id:'coral',   color:'#ff8f8f', price:50 },
  { id:'aqua',    color:'#7fe6df', price:50 },
  { id:'grape',   color:'#9b6bff', price:50 },
  { id:'rose',    color:'#ff7eb6', price:50 },
  // chest-only specials:
  { id:'rainbow', color:'rainbow', price:-1, special:true },
  { id:'galaxy',  color:'galaxy',  price:-1, special:true },
];

// Accessories cost 100 coins each. drawn on top of the blob.
const ACCESSORIES = [
  { id:'none',    emoji:'🚫', label:'None', price:0 },
  { id:'bow',     emoji:'🎀', label:'Bow',   price:100 },
  { id:'cap',     emoji:'🧢', label:'Cap',   price:100 },
  { id:'crown',   emoji:'👑', label:'Crown', price:100 },
  { id:'glasses', emoji:'🕶️', label:'Shades',price:100 },
  { id:'flower',  emoji:'🌸', label:'Flower',price:100 },
  { id:'party',   emoji:'🥳', label:'Party', price:100 },
  { id:'halo',    emoji:'😇', label:'Halo',  price:100 },
  { id:'horns',   emoji:'😈', label:'Horns', price:100 },
  { id:'star',    emoji:'⭐', label:'Star',  price:100 },
];

// Faces. 'classic' is default & free. Specials only come from the daily chest.
const FACES = [
  { id:'classic', label:'Classic', price:0 },
  { id:'wink',    label:'Wink',    price:0 },
  { id:'star',    label:'Starry',  price:-1, special:true },
  { id:'cool',    label:'Cool',    price:-1, special:true },
  { id:'kawaii',  label:'Kawaii',  price:-1, special:true },
  { id:'sleepy',  label:'Sleepy',  price:-1, special:true },
];

const BG_COLORS = ['#bcd9ff','#ffd1ec','#d9c6ff','#c9f7d8','#fff0c2','#ffd6c2','#1d1840'];

// Trails follow the player. Rainbow costs 150, the rest 60.
const TRAILS = [
  { id:'none',    name:'None',    color:null,      price:0 },
  { id:'pink',    name:'Pink',    color:'#ff84c8', price:60 },
  { id:'blue',    name:'Blue',    color:'#74a8ff', price:60 },
  { id:'mint',    name:'Mint',    color:'#7be0b0', price:60 },
  { id:'gold',    name:'Gold',    color:'#ffd36b', price:60 },
  { id:'purple',  name:'Purple',  color:'#b79bff', price:60 },
  { id:'sparkle', name:'Sparkle', emoji:'✨',       price:60 },
  { id:'star',    name:'Stars',   emoji:'⭐',       price:60 },
  { id:'heart',   name:'Hearts',  emoji:'💕',       price:60 },
  { id:'fire',    name:'Fire',    emoji:'🔥',       price:60 },
  { id:'bubble',  name:'Bubbles', emoji:'🫧',       price:60 },
  { id:'rainbow', name:'Rainbow', color:'rainbow', price:150 },
];
const trailById = id => TRAILS.find(t=>t.id===id) || TRAILS[0];

// Achievements / badges
const ACHIEVEMENTS = [
  { id:'first',  name:'First Steps',   desc:'Finish a level',                emoji:'🏁' },
  { id:'all5',   name:'Mountaineer',   desc:'Finish all 5 levels',           emoji:'🏔️' },
  { id:'flawless',name:'Flawless',     desc:'Finish a level with no deaths', emoji:'😇' },
  { id:'hard',   name:'Daredevil',     desc:'Finish a Hard level',           emoji:'🔥' },
  { id:'star3',  name:'Perfect!',      desc:'Get 3 stars on a level',        emoji:'⭐' },
  { id:'coins50',name:'Coin Hunter',   desc:'Collect 50 coins in levels',    emoji:'💰' },
  { id:'pets5',  name:'Collector',     desc:'Own 5 different pets',          emoji:'🐾' },
  { id:'pets10', name:'Zookeeper',     desc:'Own 10 different pets',         emoji:'🦁' },
  { id:'secret', name:'Secret Finder', desc:'Get a Secret pet',             emoji:'✨' },
  { id:'rich',   name:'Rich!',         desc:'Save up 500 coins',            emoji:'🪙' },
  { id:'tower',  name:'Sky High',      desc:'Reach floor 10 in the Tower',  emoji:'🏗️' },
  { id:'daily',  name:'Daily Climber', desc:'Beat a Daily Challenge',       emoji:'🗓️' },
  { id:'shiny',  name:'Golden Touch',  desc:'Forge a shiny pet',            emoji:'🌟' },
  { id:'maxpet', name:'Best Friend',   desc:'Level a pet to 10',            emoji:'💖' },
  { id:'racewin',name:'Champion',      desc:'Win a race',                   emoji:'🥇' },
  { id:'boss',   name:'Boss Slayer',   desc:'Beat a Tower boss',            emoji:'👹' },
  { id:'questmaster',name:'Go-Getter', desc:'Complete a daily quest',       emoji:'✅' },
  { id:'streak', name:'On Fire',       desc:'Hit a 7-day quest streak',     emoji:'🔥' },
  { id:'tagger', name:"Tag, You're It",desc:'Tag a friend in Tag mode',     emoji:'🏃' },
];

// Quick-chat emotes. The first six are free; the rest unlock in the shop.
const EMOTES = [
  { id:'happy', e:'😀', price:0 },
  { id:'laugh', e:'😂', price:0 },
  { id:'heart', e:'❤️', price:0 },
  { id:'thumb', e:'👍', price:0 },
  { id:'wow',   e:'😮', price:0 },
  { id:'party', e:'🎉', price:0 },
  { id:'dance',  e:'💃', price:120, rare:true },
  { id:'dance2', e:'🕺', price:120, rare:true },
  { id:'cool',   e:'😎', price:90,  rare:true },
  { id:'cry',    e:'😭', price:80,  rare:true },
  { id:'fire',   e:'🔥', price:100, rare:true },
  { id:'crown',  e:'👑', price:150, rare:true },
  { id:'mind',   e:'🤯', price:90,  rare:true },
];
const emoteById = id => EMOTES.find(x=>x.id===id);

/* ===== Daily Quests ===== three refresh each day, seeded by the date ===== */
const QUEST_DEFS = [
  { id:'coins15',  type:'coins',       goal:15, reward:40, emoji:'🪙', text:'Collect 15 coins in levels' },
  { id:'coins30',  type:'coins',       goal:30, reward:75, emoji:'💰', text:'Collect 30 coins in levels' },
  { id:'finish2',  type:'finish',      goal:2,  reward:50, emoji:'🏁', text:'Finish 2 levels' },
  { id:'cp8',      type:'checkpoints', goal:8,  reward:40, emoji:'⛳', text:'Reach 8 checkpoints' },
  { id:'deathless',type:'deathless',   goal:1,  reward:60, emoji:'😇', text:'Finish a level with no deaths' },
  { id:'tower6',   type:'towerFloor',  goal:6,  reward:55, emoji:'🏗️', text:'Reach floor 6 in the Tower' },
  { id:'power3',   type:'powerup',     goal:3,  reward:45, emoji:'⚡', text:'Grab 3 power-ups' },
  { id:'boss1',    type:'boss',        goal:1,  reward:80, emoji:'👹', text:'Beat a Tower boss' },
];
const questById = id => QUEST_DEFS.find(q=>q.id===id);

function ensureQuests(){
  const day = (typeof dailyKey==='function') ? dailyKey() : 'x';
  if(!SAVE.quests || SAVE.quests.day!==day){
    const seed = (typeof dailySeed==='function') ? dailySeed() : 1;
    const rnd = mulberry32((seed*3 + 5)|0);
    const pool = QUEST_DEFS.slice();
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=pool[i];pool[i]=pool[j];pool[j]=t; }
    SAVE.quests = { day, list: pool.slice(0,3).map(q=>({id:q.id, prog:0, done:false, claimed:false})) };
    persist();
  }
  return SAVE.quests;
}
/* record progress toward any active quest of this type */
function questEvent(type, amount){
  ensureQuests();
  let changed=false;
  for(const q of SAVE.quests.list){
    const def=questById(q.id); if(!def || def.type!==type || q.done) continue;
    if(type==='towerFloor') q.prog=Math.max(q.prog, amount||0);
    else q.prog += (amount||1);
    if(q.prog>=def.goal){ q.prog=def.goal; q.done=true;
      if(typeof toast==='function') toast('✅ Quest done: '+def.text+'!');
      if(typeof SFX==='object' && SFX.rare) SFX.rare();
    }
    changed=true;
  }
  if(changed) persist();
}
/* local-midnight day index, so consecutive days differ by exactly 1 */
function dayNum(){ const d=new Date(); return Math.floor(new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()/DAY_MS); }

function claimQuest(id){
  ensureQuests();
  const q=SAVE.quests.list.find(x=>x.id===id), def=questById(id);
  if(!q || !def || !q.done || q.claimed) return false;
  q.claimed=true; addCoins(def.reward); unlockAchievement('questmaster'); persist();
  const bonus = maybeAwardStreak();
  return { reward:def.reward, streakBonus:bonus, streak:SAVE.questStreak };
}
/* when all 3 quests are claimed for the day, grant a once-per-day streak bonus */
function maybeAwardStreak(){
  if(!SAVE.quests || !SAVE.quests.list.every(q=>q.claimed)) return 0;
  const today=dayNum();
  if(SAVE.questStreakDay===today) return 0;                 // already rewarded today
  SAVE.questStreak = (SAVE.questStreakDay===today-1) ? (SAVE.questStreak||0)+1 : 1;
  SAVE.questStreakDay = today;
  if(SAVE.questStreak>=7) unlockAchievement('streak');
  const bonus = 25*Math.min(SAVE.questStreak,7);
  SAVE.coins += bonus; persist();
  if(typeof toast==='function') toast('🔥 '+SAVE.questStreak+'-day quest streak! +🪙'+bonus);
  return bonus;
}
function questsClaimable(){ ensureQuests(); return SAVE.quests.list.some(q=>q.done && !q.claimed); }

const DAY_MS = 24*60*60*1000;

// power-up pickup kinds that can spawn in levels
const POWERUP_KINDS = ['magnet','shield','dash','slow','x2','ghost'];

function defaultSave(){
  return {
    name:'',
    coins:50,
    skin:'mint',
    accessory:'none',
    face:'classic',
    bg:'#bcd9ff',
    ownedSkins:['mint','sky','bubble'],
    ownedAccessories:['none'],
    ownedFaces:['classic','wink'],
    chestLastClaim:0,      // timestamp ms
    chestStreak:0,         // how many daily claims in a row
    bestLevel:1,
    pets:{},               // creatureId -> count owned
    equippedPet:null,      // creatureId currently equipped (its ability helps in-game)
    claimedTrades:[],      // trade codes already redeemed on this device
    petSkin:null,          // creatureId worn AS your character look
    trail:'none',          // equipped trail id
    ownedTrails:['none'],  // unlocked trails
    soundOn:true,          // sound effects on/off
    musicOn:true,          // background music on/off
    bestTimes:{},          // level -> best time (ms)
    starsByLevel:{},       // level -> best stars (1-3)
    achievements:[],       // unlocked achievement ids
    lvlCoinsCollected:0,    // total floating coins collected in levels
    towerBest:0,           // highest floor reached in endless Tower mode
    daily:{key:'',best:0,done:false},  // daily challenge progress for the current day
    petXp:{},              // creatureId -> experience points (drives pet level)
    shinies:{},            // creatureId -> count of shiny (golden) copies owned
    raceWins:0,            // multiplayer race wins
    raceLosses:0,          // multiplayer race losses
    questStreak:0,         // consecutive days completing all 3 quests
    questStreakDay:0,      // day index a streak bonus was last awarded
    ownedEmotes:['happy','laugh','heart','thumb','wow','party'],  // unlocked quick emotes
  };
}

function unlockAchievement(id){
  if(!SAVE.achievements) SAVE.achievements=[];
  if(SAVE.achievements.includes(id)) return false;
  const a=ACHIEVEMENTS.find(x=>x.id===id); if(!a) return false;
  SAVE.achievements.push(id); persist();
  if(typeof toast==='function') toast('🏆 '+a.emoji+' '+a.name+'!');
  if(typeof SFX==='object') SFX.rare && SFX.rare();
  return true;
}
function checkPetAchievements(){
  const n=Object.keys(SAVE.pets||{}).length;
  if(n>=5) unlockAchievement('pets5');
  if(n>=10) unlockAchievement('pets10');
}

let SAVE = loadSave();

function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return defaultSave();
    const s = Object.assign(defaultSave(), JSON.parse(raw));
    return s;
  }catch(e){ return defaultSave(); }
}
function persist(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); }catch(e){}
  updateCoinDisplays();
}
function addCoins(n){ SAVE.coins += n; persist(); if(SAVE.coins>=500) unlockAchievement('rich'); }

function updateCoinDisplays(){
  document.querySelectorAll('[data-coins]').forEach(el=>{ el.textContent = SAVE.coins; });
}

// helpers to look up data
const skinById = id => SKINS.find(s=>s.id===id) || SKINS[0];
const accById  = id => ACCESSORIES.find(a=>a.id===id) || ACCESSORIES[0];
const faceById = id => FACES.find(f=>f.id===id) || FACES[0];
