/* ===== Pets / Creatures / Chests =====
   Open chests to roll creatures of escalating rarity. Each creature has an
   ability that helps you complete the obby. Duplicates can be sold for coins,
   and pets can be traded with friends via a trade code. */

// rarity order, low -> high (secret is the very hardest, then mythical)
const RARITIES = ['basic','rare','superRare','legendary','mythical','secret'];
const RARITY_INFO = {
  basic:     { label:'Basic',      color:'#b8c4d6' },
  rare:      { label:'Rare',       color:'#6fc3ff' },
  superRare: { label:'Super Rare', color:'#9b6bff' },
  legendary: { label:'Legendary',  color:'#ffb13c' },
  mythical:  { label:'Mythical',   color:'#ff5fb0' },
  secret:    { label:'Secret',     color:'#2bd4c0' },
};

// ability ids -> how they help. (No height-boost abilities, so pets help you
// move/float but never let you skip blocks.)
const ABILITY_INFO = {
  speed1:     'Move a bit faster',
  speed2:     'Move much faster',
  glide:      'Fall slower (float)',
  glideStrong:'Float gently down',
  platform:   'Place a platform (tap the ✨ button!)',
  doubleJump: 'Double jump (tap jump again in mid-air!)',
  tripleJump: 'Triple jump (jump THREE times in the air!)',
  savefall:   'Rescue! If you fall you pop back on your last platform',
  banana:     'Throw bananas (tap 🍌) at the boss & friends!',
  highJump:   'Jump much higher!',
  coinmagnet: 'Coins are always pulled to you',
  autoshield: 'Start every level with a shield 🛡️',
};

// the creature roster
const CREATURES = [
  // basic — sell 30
  { id:'mouse',   name:'Mouse',     emoji:'🐭', rarity:'basic', abilities:['speed1'], sell:30 },
  { id:'frog',    name:'Frog',      emoji:'🐸', rarity:'basic', abilities:['glide'],  sell:30 },
  { id:'hamster', name:'Hamster',   emoji:'🐹', rarity:'basic', abilities:['speed1'], sell:30 },
  { id:'chick',   name:'Chick',     emoji:'🐤', rarity:'basic', abilities:[],         sell:30 },
  { id:'hedgehog',name:'Hedgehog',  emoji:'🦔', rarity:'basic', abilities:['speed1'], sell:30 },
  // rare — sell 70
  { id:'bunny',   name:'Bunny',     emoji:'🐰', rarity:'rare', abilities:['speed1'], sell:70 },
  { id:'fox',     name:'Fox',       emoji:'🦊', rarity:'rare', abilities:['speed1'], sell:70 },
  { id:'cat',     name:'Cat',       emoji:'🐱', rarity:'rare', abilities:['glide'],  sell:70 },
  { id:'turtle',  name:'Turtle',    emoji:'🐢', rarity:'rare', abilities:['autoshield'], sell:70 },
  { id:'penguin', name:'Penguin',   emoji:'🐧', rarity:'rare', abilities:['glide','speed1'], sell:70 },
  // super rare — sell 120
  { id:'wolf',    name:'Wolf',      emoji:'🐺', rarity:'superRare', abilities:['speed2'], sell:120 },
  { id:'eagle',   name:'Eagle',     emoji:'🦅', rarity:'superRare', abilities:['glide'],  sell:120 },
  { id:'tiger',   name:'Tiger',     emoji:'🐯', rarity:'superRare', abilities:['speed2'], sell:120 },
  { id:'raccoon', name:'Raccoon',   emoji:'🦝', rarity:'superRare', abilities:['coinmagnet','speed1'], sell:120 },
  { id:'hyena',   name:'Hyena',     emoji:'🐆', rarity:'superRare', abilities:['highJump'], sell:120 },
  // legendary — sell 200
  { id:'lion',    name:'Lion',      emoji:'🦁', rarity:'legendary', abilities:['speed2'],   sell:200 },
  { id:'elephant',name:'Elephant',  emoji:'🐘', rarity:'legendary', abilities:['platform'], sell:200 },
  { id:'giraffe', name:'Giraffe',   emoji:'🦒', rarity:'legendary', abilities:['glideStrong'], sell:200 },
  { id:'monkey',  name:'Monkey',    emoji:'🐵', rarity:'legendary', abilities:['banana'], sell:200 },
  // mythical — sell 320
  { id:'phoenix', name:'Phoenix',   emoji:'🔥', rarity:'mythical', abilities:['savefall','glideStrong'], sell:320 },
  { id:'butterfly',name:'Butterfly',emoji:'🦋', rarity:'mythical', abilities:['doubleJump','glide'],       sell:320 },
  { id:'octopus', name:'Octopus',   emoji:'🐙', rarity:'mythical', abilities:['platform','speed1'], sell:320 },
  { id:'pegasus', name:'Pegasus',   emoji:'🐴', rarity:'mythical', abilities:['doubleJump','speed2'],      sell:320 },
  // secret — sell 700 (the rarest!)
  { id:'unicorn', name:'Unicorn',   emoji:'🦄', rarity:'secret', abilities:['tripleJump','speed2','platform'],     sell:700 },
  { id:'dragon',  name:'Dragon',    emoji:'🐉', rarity:'secret', abilities:['tripleJump','platform','glideStrong'],sell:700 },
  { id:'prism',   name:'Prism',     emoji:'🌈', rarity:'secret', abilities:['speed2','glideStrong'],  sell:700 },
  { id:'kraken',  name:'Kraken',    emoji:'🦑', rarity:'secret', abilities:['platform','speed2'],     sell:700 },
  { id:'yeti',    name:'Yeti',      emoji:'🧊', rarity:'secret', abilities:['glideStrong','speed1'],  sell:700 },
  { id:'ghost',   name:'Ghost',     emoji:'👻', rarity:'secret', abilities:['glide','platform'],      sell:700 },
  { id:'alien',   name:'Alien',     emoji:'👽', rarity:'secret', abilities:['speed2','glide'],        sell:700 },
];

const creatureById = id => CREATURES.find(c=>c.id===id);
const creaturesOfRarity = r => CREATURES.filter(c=>c.rarity===r);

// ===== Pet feeding: catch food -> merge 3 into a meal -> feed your pet =====
// all-vegetarian foods 🥦
const FOODS = [
  {id:'biscuit',    emoji:'🍪', name:'Biscuit'},
  {id:'apple',      emoji:'🍎', name:'Apple'},
  {id:'peach',      emoji:'🍑', name:'Peach'},
  {id:'banana',     emoji:'🍌', name:'Banana'},
  {id:'strawberry', emoji:'🍓', name:'Strawberry'},
  {id:'corn',       emoji:'🌽', name:'Corn'},
  {id:'carrot',     emoji:'🥕', name:'Carrot'},
  {id:'cheese',     emoji:'🧀', name:'Cheese'},
  {id:'berry',      emoji:'🫐', name:'Berry'},
  {id:'honey',      emoji:'🍯', name:'Honey'},
];
const foodById = id => FOODS.find(f=>f.id===id);

// each pet has a favourite food (love) — thematic where it makes sense, else hashed
const PET_FAVS = { lion:'biscuit', cat:'strawberry', mouse:'cheese', hamster:'cheese', bunny:'carrot',
  fox:'berry', wolf:'corn', tiger:'corn', dragon:'corn', unicorn:'honey', phoenix:'honey',
  eagle:'berry', octopus:'banana', kraken:'carrot', giraffe:'apple', elephant:'peach', chick:'banana',
  monkey:'banana', raccoon:'berry', turtle:'corn', penguin:'strawberry', hedgehog:'apple', pegasus:'honey',
  hyena:'corn' };
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return Math.abs(h); }
function petFav(id){ return PET_FAVS[id] || FOODS[hashStr(id)%FOODS.length].id; }
function petOkFoods(id){
  const fav=petFav(id), h=hashStr(id);
  return [FOODS[(h+3)%FOODS.length].id, FOODS[(h+7)%FOODS.length].id].filter(f=>f!==fav);
}
function foodLiking(petId, foodId){   // 'love' | 'ok' | 'dislike'
  if(foodId===petFav(petId)) return 'love';
  if(petOkFoods(petId).includes(foodId)) return 'ok';
  return 'dislike';
}

// bigger animals hold more food before they're overfed (hours of fullness capacity).
// A 3-day (72h) favourite feast only fits in a Legendary+ belly — small pets
// must eat smaller meals more often.
const PET_CAPACITY = { basic:48, rare:60, superRare:84, legendary:108, mythical:144, secret:180 };
function petCapacityH(id){ const c=creatureById(id); return PET_CAPACITY[c?c.rarity:'basic']||24; }

// a meal is 3 foods; the more the pet loves them, the longer it stays full
function mealHours(petId, foods){
  let pts=0; for(const f of foods){ const l=foodLiking(petId,f); pts += l==='love'?3 : l==='ok'?1 : 0; }
  return pts>=9?72 : pts>=6?48 : pts>=3?24 : pts>=1?6 : 2;   // up to 3 days for a perfect meal
}
function mealLiking(petId, foods){
  const h=mealHours(petId,foods);
  return h>=48?'loves it':h>=24?'likes it':h>=6?'it\'s ok':'doesn\'t like it';
}

// give every owned pet a starting full belly so nothing breaks; the clock drains from there
function ensurePetFeed(){
  if(!SAVE.petFeed) SAVE.petFeed={};
  if(!SAVE.petMood) SAVE.petMood={};
  // migrate old non-vegetarian food to veggie equivalents
  if(SAVE.foods){
    if(SAVE.foods.fish){ SAVE.foods.strawberry=(SAVE.foods.strawberry||0)+SAVE.foods.fish; delete SAVE.foods.fish; }
    if(SAVE.foods.meat){ SAVE.foods.corn=(SAVE.foods.corn||0)+SAVE.foods.meat; delete SAVE.foods.meat; }
  }
  const now=nowMs();
  const ids=new Set([...Object.keys(SAVE.pets||{}), ...Object.keys(SAVE.shinies||{})]);
  let changed=false;
  for(const id of ids){ if((SAVE.pets[id]||0)>0 || (SAVE.shinies&&SAVE.shinies[id]>0)){
    if(SAVE.petFeed[id]==null){ SAVE.petFeed[id]=now + Math.round(petCapacityH(id)*0.3)*3600*1000; changed=true; }  // start ~30% full (room to feed)
    if(SAVE.petMood[id]==null){ SAVE.petMood[id]={h:80, t:now}; changed=true; }   // start fairly happy
    else tickMood(id);
  }}
  if(changed) persist();
}
function petFullnessMs(id){
  const until=(SAVE.petFeed&&SAVE.petFeed[id]!=null)?SAVE.petFeed[id]:(nowMs()+petCapacityH(id)*3600*1000);
  return until - nowMs();
}
function petFedState(id){                       // 'hungry' | 'fed' (pets can never be overfed)
  return petFullnessMs(id) <= 0 ? 'hungry' : 'fed';
}
function petHungerPct(id){                       // 100 = stuffed, 0 = starving
  return Math.max(0, Math.min(100, Math.round(petFullnessMs(id)/(petCapacityH(id)*3600000)*100)));
}

// ---- happiness / sadness: drifts down over time, restored by feeding ----
function tickMood(id){
  if(!SAVE.petMood) SAVE.petMood={};
  const m=SAVE.petMood[id]||(SAVE.petMood[id]={h:80,t:nowMs()});
  const now=nowMs(), dtH=(now-m.t)/3600000;
  if(dtH>0){
    const hungry=petFullnessMs(id)<=0;
    m.h=Math.max(0,Math.min(100, m.h - dtH*(hungry?6:0.5)));  // sad fast when hungry, slow when fed
    m.t=now;
  }
  return m.h;
}
function petHappiness(id){ return Math.round(tickMood(id)); }
function petIsSad(id){ return petHappiness(id) < 25; }
function petMoodFace(id){ const h=petHappiness(id); return h>=70?'😄':h>=40?'🙂':h>=25?'😐':'😢'; }
function bumpMood(id, amt){ tickMood(id); SAVE.petMood[id].h=Math.max(0,Math.min(100, SAVE.petMood[id].h+amt)); }

// only STARVING removes a pet's power (happiness is just wellbeing now)
function petCanUsePower(id){ return petFedState(id)==='fed'; }
function petPowerBlockReason(id){ return petFedState(id)==='hungry' ? 'hungry' : null; }

// ---- merging 3 foods into a named meal ----
const FOOD_GROUPS = {
  fruit:new Set(['apple','peach','banana','strawberry','berry']),
  veg:new Set(['carrot','corn']),
  sweet:new Set(['biscuit','honey','cheese']),
};
function mealInfo(foods){
  const f=foods.map(foodById);
  if(foods[0]===foods[1] && foods[1]===foods[2]) return { name:'Big '+f[0].name, emoji:f[0].emoji+f[0].emoji };
  const all=set=>foods.every(x=>set.has(x));
  if(all(FOOD_GROUPS.fruit))  return { name:'Fruit Platter', emoji:'🍓🍎' };
  if(all(FOOD_GROUPS.veg))    return { name:'Veggie Plate',  emoji:'🥗' };
  if(all(FOOD_GROUPS.sweet))  return { name:'Sweet Treat',   emoji:'🍰' };
  if(foods.every(x=>FOOD_GROUPS.fruit.has(x)||FOOD_GROUPS.sweet.has(x))) return { name:'Dessert Bowl', emoji:'🍨' };
  return { name:'Yummy Combo', emoji:'🍱' };
}

/* feed a 3-food meal to a pet; extends fullness, may overfeed */
function feedPet(petId, foods){
  if(!petId || !creatureById(petId)) return {error:'Pick a pet'};
  if(!foods || foods.length!==3) return {error:'A meal needs exactly 3 foods'};
  for(const f of foods){ if((SAVE.foods&&SAVE.foods[f]||0) < foods.filter(x=>x===f).length) return {error:'Not enough food — catch more!'}; }
  for(const f of foods){ SAVE.foods[f]--; if(SAVE.foods[f]<=0) delete SAVE.foods[f]; }
  if(!SAVE.petFeed) SAVE.petFeed={};
  const now=nowMs();
  const add=mealHours(petId,foods)*3600*1000;
  const cur=Math.max(now, SAVE.petFeed[petId]!=null?SAVE.petFeed[petId]:now);
  const cap=now + petCapacityH(petId)*3600*1000;
  SAVE.petFeed[petId]=Math.min(cur+add, cap);   // tops up to full, never overfed
  const gained=Math.max(0, Math.round((SAVE.petFeed[petId]-cur)/3600000));
  // happiness: love meal cheers them up a lot; disliked barely
  const lk=mealLiking(petId,foods);
  bumpMood(petId, lk==='loves it'?40 : lk==='likes it'?22 : lk==='it\'s ok'?12 : 6);
  persist();
  return { addedH:gained, liking:lk, state:petFedState(petId), meal:mealInfo(foods), happiness:petHappiness(petId) };
}
/* playing with a pet (in the Playground) makes it happier — less neglected */
function playWithPet(id){
  if(!id || !creatureById(id)) return 0;
  bumpMood(id, 14); persist();
  return petHappiness(id);
}
function foodCount(id){ return (SAVE.foods&&SAVE.foods[id])||0; }
function totalFood(){ let n=0; for(const k in (SAVE.foods||{})) n+=SAVE.foods[k]; return n; }

// ===== Blob-Dex collection milestones (long-term completion goals) =====
const DEX_MILESTONES = [
  { id:'own5',  need:5,                reward:150,  label:'Collect 5 different pets' },
  { id:'own10', need:10,               reward:300,  label:'Collect 10 different pets' },
  { id:'own15', need:15,               reward:600,  label:'Collect 15 different pets' },
  { id:'own20', need:20,               reward:1000, label:'Collect 20 different pets' },
  { id:'all',   need:CREATURES.length, reward:3000, label:'Complete the Blob-Dex!' },
];
function dexOwnedCount(){ return CREATURES.filter(c=>(SAVE.pets[c.id]||0)>0 || (SAVE.shinies&&SAVE.shinies[c.id]>0)).length; }
function dexMilestoneDone(m){ return dexOwnedCount()>=m.need; }
function dexMilestoneClaimed(id){ return (SAVE.dexClaimed||[]).includes(id); }
function claimDexMilestone(id){
  const m=DEX_MILESTONES.find(x=>x.id===id); if(!m) return false;
  if(!SAVE.dexClaimed) SAVE.dexClaimed=[];
  if(dexMilestoneClaimed(id) || !dexMilestoneDone(m)) return false;
  SAVE.dexClaimed.push(id); addCoins(m.reward); persist();
  return m.reward;
}
function dexClaimable(){ return DEX_MILESTONES.some(m=>dexMilestoneDone(m) && !dexMilestoneClaimed(m.id)); }

// chest shop: cost + rarity weights (sum 100). Basic can't give legendary/mythical.
const CHESTS = {
  basic:     { label:'Basic Chest',     cost:150, emoji:'📦',
    weights:{ basic:70, rare:24, superRare:5,  legendary:0,  mythical:0,  secret:1 } },
  rare:      { label:'Rare Chest',      cost:250, emoji:'🎁',
    weights:{ basic:38, rare:34, superRare:18, legendary:7,  mythical:2.5,secret:0.5 } },
  legendary: { label:'Legendary Chest', cost:350, emoji:'🏆',
    weights:{ basic:12, rare:24, superRare:28, legendary:21, mythical:11, secret:4 } },
  // exclusive fixed-reward vault — guarantees a bundle (no random roll)
  gold:      { label:'Gold Vault', cost:10000, emoji:'🌟', exclusive:true,
    grants:{ pet:'unicorn', trail:'royal', skin:'rainbow' } },
};

/* open the exclusive Gold Vault: a guaranteed bundle, repeatable */
function openGoldVault(){
  const chest=CHESTS.gold;
  if(SAVE.coins < chest.cost) return {error:'Not enough coins'};
  SAVE.coins -= chest.cost;
  const g=chest.grants;
  // Unicorn (secret, triple jump) — stacks if you already have one
  const had=SAVE.pets[g.pet]||0;
  SAVE.pets[g.pet]=had+1;
  if(!SAVE.equippedPet) SAVE.equippedPet=g.pet;
  // Royal trail + Rainbow colour-changing skin
  if(!SAVE.ownedTrails.includes(g.trail)) SAVE.ownedTrails.push(g.trail);
  if(!SAVE.ownedSkins.includes(g.skin)) SAVE.ownedSkins.push(g.skin);
  persist();
  return { pet:creatureById(g.pet), petWasNew:had===0, trail:trailById(g.trail), skin:skinById(g.skin) };
}

function rollRarity(weights){
  let total=0; for(const r of RARITIES) total += (weights[r]||0);
  let x = Math.random()*total;
  for(const r of RARITIES){ x -= (weights[r]||0); if(x<=0) return r; }
  return 'basic';
}

/* open a chest: returns {creature, isNew, count} or {error} */
function openPetChest(chestId){
  const chest = CHESTS[chestId];
  if(!chest) return {error:'Unknown chest'};
  if(SAVE.coins < chest.cost) return {error:'Not enough coins'};
  SAVE.coins -= chest.cost;
  const rarity = rollRarity(chest.weights);
  const pool = creaturesOfRarity(rarity);
  const creature = pool[Math.floor(Math.random()*pool.length)];
  const had = SAVE.pets[creature.id]||0;
  SAVE.pets[creature.id] = had+1;
  const isNew = had===0;
  if(isNew && !SAVE.equippedPet) SAVE.equippedPet = creature.id;  // auto-equip first pet
  persist();
  return { creature, isNew, count:SAVE.pets[creature.id] };
}

function petCount(id){ return SAVE.pets[id]||0; }
function ownsPet(id){ return (SAVE.pets[id]||0) > 0; }

/* sell ONE duplicate (keeps at least 1 copy) for the creature's sell value */
function sellDuplicate(id){
  const c = creatureById(id); if(!c) return {error:'?'};
  if((SAVE.pets[id]||0) <= 1) return {error:'No duplicates to sell'};
  SAVE.pets[id]--; SAVE.coins += c.sell; persist();
  return { coins:c.sell, count:SAVE.pets[id] };
}

function equipPet(id){
  if(!ownsPet(id)) return false;
  SAVE.equippedPet = (SAVE.equippedPet===id) ? null : id;  // tap again to unequip
  persist();
  return true;
}

/* ---- pet leveling ----
   Pets earn XP while equipped (checkpoints + finishing levels). Higher level =
   a slightly stronger ability. Capped at level 10. No jump/height effects, so
   levelling can never let you skip blocks. */
const PET_MAX_LEVEL = 10;
function xpForLevel(lvl){ return Math.round(6 * lvl * (lvl+1) / 2); }  // cumulative XP to reach lvl
function petLevel(id){
  const xp = SAVE.petXp ? (SAVE.petXp[id]||0) : 0;
  let lvl = 1;
  while(lvl < PET_MAX_LEVEL && xp >= xpForLevel(lvl)) lvl++;
  return lvl;
}
function petXpInfo(id){
  const xp = SAVE.petXp ? (SAVE.petXp[id]||0) : 0;
  const lvl = petLevel(id);
  if(lvl>=PET_MAX_LEVEL) return { lvl, xp, into:1, need:1, max:true };
  const prev = lvl>1 ? xpForLevel(lvl-1) : 0;
  const next = xpForLevel(lvl);
  return { lvl, xp, into: xp-prev, need: next-prev, max:false };
}
function addPetXp(id, amount){
  if(!id || !creatureById(id)) return null;
  if(!SAVE.petXp) SAVE.petXp={};
  const before = petLevel(id);
  SAVE.petXp[id] = (SAVE.petXp[id]||0) + amount;
  const after = petLevel(id);
  persist();
  if(after>=PET_MAX_LEVEL && before<PET_MAX_LEVEL && typeof unlockAchievement==='function') unlockAchievement('maxpet');
  return { leveledUp: after>before, level: after };
}

/* ---- shiny (golden) pets ---- */
function isShiny(id){ return !!(SAVE.shinies && SAVE.shinies[id]>0); }
/* fuse 3 copies of one pet into a single shiny version of it */
function makeShiny(id){
  const c=creatureById(id); if(!c) return {error:'?'};
  if((SAVE.pets[id]||0) < 3) return {error:'Need 3 copies'};
  SAVE.pets[id]-=3; if(SAVE.pets[id]<=0) delete SAVE.pets[id];
  if(!SAVE.shinies) SAVE.shinies={};
  SAVE.shinies[id]=(SAVE.shinies[id]||0)+1;
  if(SAVE.equippedPet===id && !ownsPet(id)) SAVE.equippedPet=id;  // keep equipped (shiny counts)
  persist();
  if(typeof unlockAchievement==='function') unlockAchievement('shiny');
  return { creature:c };
}

/* ---- rarity fusion: 3 pets of one rarity -> 1 random pet of the next rarity ---- */
function rarityCopies(rarity){
  let n=0; for(const c of creaturesOfRarity(rarity)) n += (SAVE.pets[c.id]||0); return n;
}
function nextRarity(rarity){
  const i=RARITIES.indexOf(rarity); return (i>=0 && i<RARITIES.length-1) ? RARITIES[i+1] : null;
}
function fuseRarity(rarity){
  const nr=nextRarity(rarity);
  if(!nr) return {error:'Secret pets can\'t fuse higher'};
  if(rarityCopies(rarity) < 3) return {error:'Need 3 '+RARITY_INFO[rarity].label+' pets'};
  // consume 3 copies, taking from the pets you own the MOST of first (spares uniques)
  let toRemove=3;
  const owned=creaturesOfRarity(rarity).filter(c=>(SAVE.pets[c.id]||0)>0)
              .sort((a,b)=>(SAVE.pets[b.id]||0)-(SAVE.pets[a.id]||0));
  for(const c of owned){
    while(toRemove>0 && (SAVE.pets[c.id]||0)>0){ SAVE.pets[c.id]--; toRemove--; if(SAVE.pets[c.id]<=0){ delete SAVE.pets[c.id]; break; } }
    if(toRemove<=0) break;
  }
  if(SAVE.equippedPet && !ownsPet(SAVE.equippedPet) && !isShiny(SAVE.equippedPet)) SAVE.equippedPet=null;
  // roll a random pet of the next rarity
  const pool=creaturesOfRarity(nr);
  const creature=pool[Math.floor(Math.random()*pool.length)];
  const had=SAVE.pets[creature.id]||0;
  SAVE.pets[creature.id]=had+1;
  if(!SAVE.equippedPet) SAVE.equippedPet=creature.id;
  persist();
  return { creature, isNew: had===0, count: SAVE.pets[creature.id] };
}

/* aggregate the equipped pet's ability effects (used by the game engine).
   Effects scale a little with the pet's level, and shinies get a small bonus. */
function equippedAbilities(){
  const id = SAVE.equippedPet;
  const c = id ? creatureById(id) : null;
  const set = new Set(c ? c.abilities : []);
  const lvl = id ? petLevel(id) : 1;
  const shiny = id ? isShiny(id) : false;
  const lvlBoost = (lvl-1)*0.015 + (shiny?0.06:0);   // up to +0.195 at lvl10 shiny
  const glideBoost = (lvl-1)*0.01 + (shiny?0.04:0);  // glide a touch stronger
  const baseMove = set.has('speed2')?1.4 : set.has('speed1')?1.2 : 1;
  const baseFall = set.has('glideStrong')?0.55 : set.has('glide')?0.75 : 1;
  return {
    moveMul: baseMove>1 ? baseMove+lvlBoost : 1,
    jumpMul: (set.has('highJump')||set.has('highJump2'))? 1.2 + (lvl-1)*0.008 + (shiny?0.03:0)
           : set.has('highJump1')?1.1 : 1,
    fallMul: baseFall<1 ? Math.max(0.45, baseFall-glideBoost) : 1,
    maxJumps: set.has('tripleJump')?3 : set.has('doubleJump')?2 : 1,
    canPlatform: set.has('platform'),
    canSaveFall: set.has('savefall'),
    canBanana:   set.has('banana'),
    canMagnet:   set.has('coinmagnet'),
    canShield:   set.has('autoshield'),
  };
}

/* ---- trading by code (no server: a shareable code transfers a pet) ---- */
function makeTradeCode(petId, toName){
  if(!ownsPet(petId)) return {error:"You don't own that pet"};
  // remove one copy from sender
  SAVE.pets[petId]--; if(SAVE.pets[petId]<=0) delete SAVE.pets[petId];
  if(SAVE.equippedPet===petId && !ownsPet(petId)) SAVE.equippedPet=null;
  persist();
  const nonce = Math.floor(Math.random()*1e9).toString(36);
  const payload = JSON.stringify({ p:petId, to:(toName||'').trim(), from:(SAVE.name||'Friend'), n:nonce });
  return { code: 'PET-' + btoa(payload).replace(/=+$/,'') };
}
function redeemTradeCode(code){
  try{
    const raw = (code||'').trim().replace(/^PET-/,'');
    const data = JSON.parse(atob(raw));
    if(!data.p || !creatureById(data.p)) return {error:'Invalid code'};
    if(SAVE.claimedTrades.includes(data.n)) return {error:'Code already used'};
    SAVE.claimedTrades.push(data.n);
    SAVE.pets[data.p] = (SAVE.pets[data.p]||0)+1;
    if(!SAVE.equippedPet) SAVE.equippedPet=data.p;
    persist();
    return { creature:creatureById(data.p), from:data.from||'Friend', to:data.to||'' };
  }catch(e){ return {error:'Invalid code'}; }
}
