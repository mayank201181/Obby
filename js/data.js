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

const DAY_MS = 24*60*60*1000;

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
  };
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
function addCoins(n){ SAVE.coins += n; persist(); }

function updateCoinDisplays(){
  document.querySelectorAll('[data-coins]').forEach(el=>{ el.textContent = SAVE.coins; });
}

// helpers to look up data
const skinById = id => SKINS.find(s=>s.id===id) || SKINS[0];
const accById  = id => ACCESSORIES.find(a=>a.id===id) || ACCESSORIES[0];
const faceById = id => FACES.find(f=>f.id===id) || FACES[0];
