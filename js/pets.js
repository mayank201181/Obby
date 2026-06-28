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
};

// the creature roster
const CREATURES = [
  // basic — sell 30
  { id:'mouse',   name:'Mouse',     emoji:'🐭', rarity:'basic', abilities:['speed1'], sell:30 },
  { id:'frog',    name:'Frog',      emoji:'🐸', rarity:'basic', abilities:['glide'],  sell:30 },
  { id:'hamster', name:'Hamster',   emoji:'🐹', rarity:'basic', abilities:['speed1'], sell:30 },
  { id:'chick',   name:'Chick',     emoji:'🐤', rarity:'basic', abilities:[],         sell:30 },
  // rare — sell 70
  { id:'bunny',   name:'Bunny',     emoji:'🐰', rarity:'rare', abilities:['speed1'], sell:70 },
  { id:'fox',     name:'Fox',       emoji:'🦊', rarity:'rare', abilities:['speed1'], sell:70 },
  { id:'cat',     name:'Cat',       emoji:'🐱', rarity:'rare', abilities:['glide'],  sell:70 },
  // super rare — sell 120
  { id:'wolf',    name:'Wolf',      emoji:'🐺', rarity:'superRare', abilities:['speed2'], sell:120 },
  { id:'eagle',   name:'Eagle',     emoji:'🦅', rarity:'superRare', abilities:['glide'],  sell:120 },
  { id:'tiger',   name:'Tiger',     emoji:'🐯', rarity:'superRare', abilities:['speed2'], sell:120 },
  // legendary — sell 200
  { id:'lion',    name:'Lion',      emoji:'🦁', rarity:'legendary', abilities:['speed2'],   sell:200 },
  { id:'elephant',name:'Elephant',  emoji:'🐘', rarity:'legendary', abilities:['platform'], sell:200 },
  { id:'giraffe', name:'Giraffe',   emoji:'🦒', rarity:'legendary', abilities:['glideStrong'], sell:200 },
  // mythical — sell 320
  { id:'phoenix', name:'Phoenix',   emoji:'🔥', rarity:'mythical', abilities:['doubleJump','glideStrong'], sell:320 },
  { id:'butterfly',name:'Butterfly',emoji:'🦋', rarity:'mythical', abilities:['doubleJump','glide'],       sell:320 },
  { id:'octopus', name:'Octopus',   emoji:'🐙', rarity:'mythical', abilities:['platform','speed1'], sell:320 },
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

// chest shop: cost + rarity weights (sum 100). Basic can't give legendary/mythical.
const CHESTS = {
  basic:     { label:'Basic Chest',     cost:150, emoji:'📦',
    weights:{ basic:70, rare:24, superRare:5,  legendary:0,  mythical:0,  secret:1 } },
  rare:      { label:'Rare Chest',      cost:250, emoji:'🎁',
    weights:{ basic:38, rare:34, superRare:18, legendary:7,  mythical:2.5,secret:0.5 } },
  legendary: { label:'Legendary Chest', cost:350, emoji:'🏆',
    weights:{ basic:12, rare:24, superRare:28, legendary:21, mythical:11, secret:4 } },
};

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
    jumpMul: set.has('highJump2')?1.2 : set.has('highJump1')?1.1 : 1,
    fallMul: baseFall<1 ? Math.max(0.45, baseFall-glideBoost) : 1,
    maxJumps: set.has('tripleJump')?3 : set.has('doubleJump')?2 : 1,
    canPlatform: set.has('platform'),
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
