/* ===== Obby game engine ===== */
const Game = {
  canvas:null, ctx:null, dpr:1, W:0, H:0,
  world:null, level:1, seed:1, mode:'solo',
  player:null, cam:{x:0,y:0},
  input:{left:false,right:false,jump:false, joyX:0},
  keys:{},
  running:false, raf:0, last:0, acc:0, t:0,
  coinsThisRun:0, hitCheckpoints:new Set(),
  disappear:{},                 // platform id -> {standSince, gone, goneAt}
  onLevelComplete:null,         // cb(level, coinsEarned, isFinalLevel)
  onCheckpoint:null,            // cb(index)
  onExit:null,
  multiplayer:false,
  netTimer:0,
  finished:false,
  startedAt:0,
  padReport:{},                 // grp+pad -> bool (local)
  guns:[], bullets:[],          // side cannons + their projectiles
  freezeHazards:false,          // used by automated reachability tests
  difficulty:'hard',            // 'easy' = no shooting cannons, 'hard' = cannons
  tower:false,                  // endless Tower mode
  daily:false,                  // daily challenge run
  heist:false, heistLoot:0, heistEndT:0,  // daily Gold Heist (45s coin grab)
  disaster:false, disasterType:null, disasterPhase:'build', disasterPhaseT:0,
  disasterButtons:0, disasterLives:3,
  buildMode:false, buildColor:'#cdb8ff', buildLavaProof:false, builtPlatforms:[],
  dz:null,                       // active disaster entities
  myEmote:null, myEmoteAt:0,    // quick-emoji bubble over the local player
  spectating:false, spectateId:null,  // watch a friend after finishing
  racePlace:0,                  // your finishing place in a race (1 = first)
  power:{magnetUntil:0, dashUntil:0, shield:false, slowUntil:0, x2Until:0, ghostUntil:0},  // active power-up effects
  bossShots:[], activeBoss:null,// Tower boss projectiles + current boss
  trap:{},                      // trap-door id -> {since, openUntil}
  theme:null, weather:null, weatherParticles:[],  // per-level look & weather
  tagCdUntil:0,                 // Tag mode: cooldown before you can tag again
  tagEscaped:false,             // Tag mode: finished while NOT "it"
  abilityFx:[],                 // visible pet-ability particles
  shakeMag:0,                   // screen-shake magnitude (decays each frame)
  myColorName:null, myColor:null, partnerColor:null,  // Team colour assignment
  // equipped-pet ability effects:
  petMoveMul:1, petJumpMul:1, petFallMul:1, petMaxJumps:1, petCanPlatform:false,
  petSaveFall:false, petBanana:false, petMagnet:false, petAutoShield:false,
  petCanPoop:false, petGlow:false,   // Hyena poop troll + Starlight glow
  poops:[], floatUntil:0,       // dropped poop piles + Pegasus cloud-leap float
  bananas:[], lastSafe:null,    // Monkey banana projectiles + Phoenix last-platform rescue
  stunUntil:0,                  // hit by a friend's banana -> can't move for a bit
  placedPlatforms:[],           // platforms spawned by the 'platform' pet ability
  platformCdUntil:0,            // ability cooldown
  trailPoints:[],               // recent positions for the cosmetic trail
  deaths:0, runStartT:0, runCoins:0,   // per-run timer / deaths / coins collected
  room:false, roomMode:null,           // Hide&Seek / Room Tag arena ('hideseek'|'tag')
  roomSolo:false,                      // true = solo vs an AI agent (else multiplayer PvP)
  soloRole:'runner',                   // solo role: 'runner' (you dodge) or 'tagger' (you chase the bot)
  tagArena:'obby',                     // Tag/Colour-Tag layout: 'obby' | 'room'
  colorTag:false, colorArena:null, ct:null,  // Colour Tag state
  ai:null,                             // the AI seeker / tagger agent
  rm:null,                             // room-mode state (phase, timers, disguise, suspicion…)
  myDisguise:null,                     // my hide&seek disguise (synced in MP)
  caughtIds:null,                      // set of caught hider ids (MP hide&seek)
  moveLock:false,                      // input frozen (seeker during the hide phase)
  petPower:null, powerCdUntil:0,       // equipped SECRET pet signature power + its cooldown
  flyUntil:0, phaseUntil:0,            // Unicorn flight / Ghost phase timers
  freezeEnemiesUntil:0, slowWorldUntil:0,  // Yeti freeze / Starlight slow-time timers
  fire:[],                             // Dragon fire-breath projectiles
  morph:null, morphPower:'none', morphUntil:0,   // my own transformed animal (set by an Alien)
  morphMoveMul:1, morphJumpMul:1, morphFly:false,
  faceMorph:null, accMorph:null, morphRound:false,  // Alien can also swap my face/accessory for the round
};
// SECRET pet signature powers — button emoji/label + cooldown (ms)
const POWER_META = {
  polymorph: {emoji:'👽', label:'MORPH',  cd:6000},
  firebreath:{emoji:'🔥', label:'FIRE',   cd:2600},
  freeze:    {emoji:'🧊', label:'FREEZE', cd:3000},   // Yeti — 3s cooldown
  phase:     {emoji:'👻', label:'PHASE',  cd:9000},
  teleport:  {emoji:'🌈', label:'BLINK',  cd:1600},
  grapple:   {emoji:'🦑', label:'GRAPPLE',cd:2200},
  flight:    {emoji:'🦄', label:'FLY',    cd:11000},
  stomp:     {emoji:'🦕', label:'STOMP',  cd:3200},
  supernova: {emoji:'🌟', label:'SUPERNOVA', cd:9000},   // Starlight signature
  cloudjump: {emoji:'☁️', label:'CLOUD',  cd:4000},       // Pegasus (mythical)
  hop:       {emoji:'🥕', label:'HOP',    cd:2200},       // Bunny (rare)
};
// animals the Alien can morph a target into (with the power it grants)
const MORPH_ANIMALS = [
  {emoji:'🦁', name:'Lion',    power:'speed'},
  {emoji:'🐰', name:'Bunny',   power:'jump'},
  {emoji:'🦅', name:'Eagle',   power:'fly'},
  {emoji:'🐢', name:'Turtle',  power:'shield'},
  {emoji:'🐤', name:'Chick',   power:'none'},
  {emoji:'🐸', name:'Frog',    power:'jump'},
  {emoji:'🐆', name:'Cheetah', power:'speed'},
  {emoji:'🐷', name:'Pig',     power:'none'},
];

function applyEquippedPet(){
  let a = (typeof equippedAbilities==='function') ? equippedAbilities()
          : {moveMul:1,jumpMul:1,fallMul:1,maxJumps:1,canPlatform:false};
  // a hungry or overfed pet can't use its power (feed it in the Pet Café!)
  if(SAVE.equippedPet && typeof petCanUsePower==='function' && !petCanUsePower(SAVE.equippedPet)){
    a = {moveMul:1,jumpMul:1,fallMul:1,maxJumps:1,canPlatform:false};
    if(typeof toast==='function') toast('🍽️ Your pet is hungry — feed it for its power!');
  }
  Game.petMoveMul=a.moveMul; Game.petJumpMul=a.jumpMul; Game.petFallMul=a.fallMul;
  Game.petMaxJumps=a.maxJumps; Game.petCanPlatform=a.canPlatform;
  Game.petSaveFall=!!a.canSaveFall; Game.petBanana=!!a.canBanana;
  Game.petMagnet=!!a.canMagnet; Game.petAutoShield=!!a.canShield;
  Game.petCanPoop=!!a.canPoop; Game.petGlow=!!a.glow;
  Game.petPower = a.power || null;
  const btn=document.getElementById('abilityBtn');
  if(btn){
    const pm = Game.petPower && POWER_META[Game.petPower];
    btn.style.display = (a.canPlatform || a.canBanana || a.canPoop || pm) ? 'flex' : 'none';
    btn.innerHTML = pm ? `${pm.emoji}<br><span style="font-size:10px">${pm.label}</span>`
                  : a.canBanana ? '🍌<br><span style="font-size:10px">THROW</span>'
                  : a.canPoop ? '💩<br><span style="font-size:10px">POOP</span>'
                                : '✨<br><span style="font-size:10px">PLATFORM</span>';
  }
}

// Team colours: in Team mode you are PINK (host) or BLUE (joiner). A coloured
// platform is only solid for the matching player — the other falls through it.
const TEAM_COLORS = { pink:'#ff84c8', blue:'#74a8ff' };

const SCALE_TARGET_H = 560;     // world-units shown vertically (camera zoom baseline)

function gameInit(){
  Game.canvas=document.getElementById('gameCanvas');
  Game.ctx=Game.canvas.getContext('2d');
  window.addEventListener('resize', gameResize);
  // keyboard (desktop)
  const typingInField = e => {
    const t=e.target;
    return t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable);
  };
  window.addEventListener('keydown',e=>{
    if(typingInField(e)) return;     // don't hijack keys while typing a name
    if(['ArrowLeft','ArrowRight','ArrowUp',' ','a','d','w'].includes(e.key)) e.preventDefault();
    Game.keys[e.key]=true;
    if(e.key==='ArrowUp'||e.key===' '||e.key==='w') Game.input.jump=true;
  },{passive:false});
  window.addEventListener('keyup',e=>{ if(typingInField(e)) return; Game.keys[e.key]=false; });
  // tap the arena to place a block while building (disaster mode),
  // or — with the Monkey banana ability — to fling a banana at that spot
  Game.canvas.addEventListener('pointerdown', e=>{
    const r=Game.canvas.getBoundingClientRect();
    const sx=e.clientX-r.left, sy=e.clientY-r.top;
    if(Game.ship){ shipTap(sx,sy); return; }                 // tap a trapped friend to free you both
    if(Game.disaster && Game.buildMode){ disasterBuildAt(sx,sy); return; }
    if(Game.petPower==='polymorph' && Game.running){ alienTapMorph(sx,sy); return; }  // 👽 tap a friend/boss
    if(Game.petBanana && Game.running) throwBananaAt(sx,sy);
  });
  setupTouchControls();
}

function gameResize(){
  if(!Game.canvas) return;
  const dpr=Math.min(window.devicePixelRatio||1, 2);
  Game.dpr=dpr;
  Game.W=window.innerWidth; Game.H=window.innerHeight;
  Game.canvas.width=Game.W*dpr; Game.canvas.height=Game.H*dpr;
  Game.canvas.style.width=Game.W+'px'; Game.canvas.style.height=Game.H+'px';
  Game.ctx.setTransform(dpr,0,0,dpr,0,0);
}

/* scale so a fixed world height fills the screen height (consistent difficulty) */
function gameScale(){ return Game.H / SCALE_TARGET_H; }

function startGame(opts){
  // opts: {level, seed, mode, multiplayer}
  Game.level=opts.level||1;
  Game.seed=opts.seed|| (Math.floor(Math.random()*1e6));
  Game.mode=opts.mode||'solo';
  Game.multiplayer=!!opts.multiplayer;
  Game.difficulty=opts.difficulty||'hard';
  Game.tower = opts.mode==='tower';
  Game.daily = !!opts.daily;
  Game.heist = opts.mode==='heist';
  Game.disaster = opts.mode==='disaster';
  Game.tagArena = opts.arena || 'obby';
  Game.colorTag = (opts.mode==='colortag');
  Game.colorArena = Game.colorTag ? (opts.arena||'room') : null;
  Game.towerResume = opts.resumeFloor || 0;
  Game.room = (opts.mode==='roomtag' || (opts.mode==='tag' && Game.tagArena==='room'));
  Game.roomMode = opts.mode==='roomtag' ? 'tag' : null;
  // solo-vs-AI only for the single-player room modes; MP uses real players
  Game.roomSolo = !Game.multiplayer && (opts.mode==='roomtag' || opts.mode==='colortag');
  Game.soloRole = opts.role==='tagger' ? 'tagger' : 'runner';
  if(Game.room || Game.colorTag) Game.difficulty='easy';   // no cannons in these arenas
  Game.disasterTypeForce = opts.disasterType || null;   // host can force the disaster in MP
  Game.spectating=false; Game.spectateId=null; Game.myEmote=null; Game.racePlace=0;
  // Team colour: host = pink, joiner = blue (only colour-codes in coop mode)
  if(Game.mode==='coop' && Game.multiplayer){
    Game.myColorName = MP.isHost ? 'pink' : 'blue';
    Game.myColor = TEAM_COLORS[Game.myColorName];
    Game.partnerColor = TEAM_COLORS[Game.myColorName==='pink'?'blue':'pink'];
  } else {
    Game.myColorName=null; Game.myColor=null; Game.partnerColor=null;
  }
  loadLevel(Game.level);
  if(Game.myColorName){
    toast('You are '+(Game.myColorName==='pink'?'PINK 🩷':'BLUE 🩵')+' — only stand on your colour!');
  }
  gameResize();
  showScreen('gameScreen');
  applyTheme();                       // themed backdrop + weather (overrides plain bg)
  // multiplayer-only chrome: quick emojis (all modes) + boost button (co-op)
  const eb=document.getElementById('emoteBar'); if(eb){ eb.style.display = Game.multiplayer ? 'flex':'none'; if(Game.multiplayer && typeof buildEmoteBar==='function') buildEmoteBar(); }
  const bb=document.getElementById('boostBtn'); if(bb) bb.style.display = (Game.multiplayer && Game.mode==='coop') ? 'flex':'none';
  const bbar=document.getElementById('buildBar'); if(bbar){ bbar.style.display = Game.disaster ? 'flex':'none'; if(Game.disaster && typeof setupBuildBar==='function') setupBuildBar(); }
  if(typeof refreshCamoBar==='function') refreshCamoBar();
  if(typeof refreshColorBar==='function') refreshColorBar();
  if(typeof setSpectateChrome==='function') setSpectateChrome(false);
  Game.running=true; Game.finished=false; Game.last=performance.now(); Game.acc=0;
  cancelAnimationFrame(Game.raf);
  Game.raf=requestAnimationFrame(gameLoop);
}

function loadLevel(level){
  Game.world = Game.colorTag ? generateColorArena(Game.seed, Game.colorArena)
             : Game.room ? generateRoom(Game.seed)
             : Game.disaster ? generateDisaster(Game.seed)
             : Game.heist ? generateHeist(Game.seed)
             : Game.tower ? generateTower(Game.seed)
             : generateLevel(level, Game.seed, Game.mode);
  if(Game.tower && Game.towerResume>0 && typeof advanceTowerTo==='function') advanceTowerTo(Game.world, Game.towerResume);
  if(Game.disaster){
    Game.disasterPhase='build'; Game.disasterPhaseT=Game.t+2000;
    Game.disasterButtons=0; Game.disasterLives=3;
    Game.buildMode=false; Game.buildLavaProof=false; Game.builtPlatforms=[]; Game.dz=null;
    Game.disasterType = Game.disasterTypeForce || DISASTERS[Math.floor(Math.random()*DISASTERS.length)];
    Game.ship=null;
  }
  Game.blurUntil=0; if(Game.canvas) Game.canvas.style.filter='';
  Game.heistLoot=0; Game.heistEndT=Game.t+20000;   // 20-second heist clock
  Game.disappear={};
  Game.hitCheckpoints=new Set();
  if(Game.tower && Game.towerResume>0){ for(let i=1;i<=Game.towerResume;i++) Game.hitCheckpoints.add(i); }
  Game.coinsThisRun=0;
  Game.padReport={};
  const st=Game.world.start;
  Game.player={
    x:st.x, y:st.y-22, vx:0, vy:0, w:34, h:34, facing:1,
    onGround:false, squash:0, cp:0, respawnX:st.x, respawnY:st.y-22, invuln:0, jumps:0,
  };
  Game.placedPlatforms=[]; Game.platformCdUntil=0; Game.trailPoints=[];
  Game.bananas=[]; Game.poops=[]; Game.floatUntil=0; Game.lastSafe=null; Game.stunUntil=0; Game.moveLock=false;
  Game.powerCdUntil=0; Game.flyUntil=0; Game.phaseUntil=0; Game.freezeEnemiesUntil=0;
  Game.slowWorldUntil=0; Game.fire=[]; Game.morph=null; Game.morphPower='none'; Game.morphUntil=0;
  Game.morphMoveMul=1; Game.morphJumpMul=1; Game.morphFly=false;
  Game.faceMorph=null; Game.accMorph=null; Game.morphRound=false;
  Game.deaths=0; Game.runStartT=Game.t; Game.runCoins=0;
  Game.power={magnetUntil:0, dashUntil:0, shield:false, slowUntil:0, x2Until:0, ghostUntil:0};
  Game.bossShots=[]; Game.activeBoss=null;
  Game.trap={}; Game.abilityFx=[]; Game.tagCdUntil=0; Game.shakeMag=0; Game.tagEscaped=false;
  applyTheme();                     // per-level backdrop + weather
  applyEquippedPet();               // load equipped-pet ability effects
  if(Game.petAutoShield) Game.power.shield=true;   // Turtle starts each level shielded
  // screen-anchored turrets ride the left/right edges, glide up/down, fire across
  Game.guns = makeTurrets(level);
  Game.bullets=[];
  Game.player.invuln = 1200;        // brief grace at the start of a level
  Game.cam.x=st.x; Game.cam.y=st.y-200;
  if(Game.room && Game.roomSolo) initRoom();
  else if(Game.room && Game.multiplayer) initRoomMP();
  if(Game.colorTag) initColorTag();
  updateHud();
}

function makeTurrets(level){
  if(Game.difficulty==='easy') return [];   // Easy mode has no shooting cannons
  const fire=2000;                  // shoot every 2 seconds
  const t=[
    {side:'L', mid:0.42, amp:0.24, omega:(2*Math.PI)/2600, phase:0.0, fireEvery:fire, lastFire:Game.t-600},
    {side:'R', mid:0.50, amp:0.24, omega:(2*Math.PI)/2300, phase:1.6, fireEvery:fire, lastFire:Game.t-1600},
  ];
  if(level>=4){                     // extra pressure on the last two levels
    t.push({side:'L', mid:0.60, amp:0.22, omega:(2*Math.PI)/2000, phase:3.0, fireEvery:fire, lastFire:Game.t-1100});
    t.push({side:'R', mid:0.34, amp:0.22, omega:(2*Math.PI)/2100, phase:0.7, fireEvery:fire, lastFire:Game.t-300});
  }
  return t;
}

/* a quick camera shake for impacts (juice) */
function addShake(mag){ Game.shakeMag = Math.min(14, Math.max(Game.shakeMag, mag)); }

function respawn(){
  const p=Game.player;
  addShake(7);
  Game.deaths++;
  p.x=p.respawnX; p.y=p.respawnY; p.vx=0; p.vy=0;
  p.invuln=Math.max(p.invuln||0, 900);   // brief safety so turrets can't instakill on respawn
  // reset disappearing blocks so the climb is fair again
  for(const k in Game.disappear){ Game.disappear[k]={}; }
}

/* ---------- main loop with fixed timestep ---------- */
function gameLoop(now){
  if(!Game.running) return;
  let dt=(now-Game.last)/1000; Game.last=now;
  if(dt>0.05) dt=0.05;
  Game.acc+=dt;
  const STEP=1/60;
  while(Game.acc>=STEP){ update(STEP); Game.acc-=STEP; Game.t+=STEP*1000; }
  render();
  Game.raf=requestAnimationFrame(gameLoop);
}

function readInput(){
  const i=Game.input;
  let dir=0;
  if(Game.keys['ArrowLeft']||Game.keys['a']) dir-=1;
  if(Game.keys['ArrowRight']||Game.keys['d']) dir+=1;
  if(i.btnL) dir-=1;                 // on-screen left arrow held
  if(i.btnR) dir+=1;                 // on-screen right arrow held
  if(i.joyX) dir=i.joyX;             // explicit override (tests)
  return Math.max(-1,Math.min(1,dir));
}

/* pet ability button (next to JUMP): drop a platform OR throw a banana */
function triggerAbility(){
  if(!Game.running) return;
  if(Game.petPower){ usePower(Game.petPower); return; }   // SECRET pet signature power
  if(Game.t < Game.platformCdUntil) return;        // shared cooldown
  const p=Game.player;
  if(Game.petBanana){                              // Monkey: lob a banana forward (3s cooldown)
    Game.bananas.push({ x:p.x+p.w/2, y:p.y+p.h/2, vx:p.facing*9, vy:-6, r:11, born:Game.t });
    Game.platformCdUntil = Game.t + 3000;
    SFX.jump();
    return;
  }
  if(Game.petCanPoop){                             // Hyena: drop a stinky pile that freezes friends
    dropPoop();
    return;
  }
  if(Game.petCanPlatform){
    const w=100, h=18;
    Game.placedPlatforms.push({ type:'placed', w, h,
      x: p.x + p.w/2 - w/2 + p.facing*16, y: p.y + p.h + 6, until: Game.t + 4500 });
    Game.platformCdUntil = Game.t + 2600;
    if(typeof toast==='function') toast('✨ Platform!');
  }
}
/* Monkey: tap anywhere on the arena to LOB a banana in an arc onto that spot */
function throwBananaAt(screenX, screenY){
  if(!Game.running || !Game.petBanana) return;
  if(Game.t < Game.platformCdUntil) return;          // shared ability cooldown
  if(Game.t < (Game.stunUntil||0)) return;           // can't throw while stunned
  const p=Game.player; if(!p) return;
  const s=(typeof gameScale==='function')?gameScale():1;
  const wx=(screenX-Game.W/2)/s + Game.cam.x;         // tap point -> world coords
  const wy=(screenY-Game.H/2)/s + Game.cam.y;
  const ox=p.x+p.w/2, oy=p.y+p.h/2;
  const dx=wx-ox, dy=wy-oy, dist=Math.hypot(dx,dy)||1;
  // ballistic throw: pick a flight time from the distance, then solve EXACTLY for
  // the launch velocity so the banana arcs through the air and lands right on the
  // tapped spot. updateBananas applies gravity before moving, so after N frames:
  //   x = x0 + N*vx ; y = y0 + N*vy0 + g*N*(N+1)/2  →  solve for vx, vy0.
  const g=0.5;
  const N=Math.max(20, Math.min(78, Math.round(dist/7)));   // flight time (frames)
  const vx=dx/N;
  const vy=dy/N - g*(N+1)/2;                          // rises, then lands exactly on the tap
  Game.bananas.push({ x:ox, y:oy, vx, vy, r:11, born:Game.t, g, tx:wx, ty:wy, splatAt:Game.t+N*(1000/60) });
  p.facing = dx>=0?1:-1;
  Game.platformCdUntil = Game.t + 3000;      // Monkey banana — 3s cooldown
  SFX.jump();
}
/* Alien: tap directly on a friend (or the boss) to morph THAT one — then pick what into */
function alienTapMorph(screenX, screenY){
  if(!Game.running) return;
  if(Game.t < Game.powerCdUntil){ if(typeof toast==='function') toast('👽 Morph is recharging…'); return; }
  const s=(typeof gameScale==='function')?gameScale():1;
  const wx=(screenX-Game.W/2)/s + Game.cam.x;
  const wy=(screenY-Game.H/2)/s + Game.cam.y;
  let target=null, bd=90;                       // must tap fairly close to someone
  if(Game.multiplayer){
    for(const r of mpRemoteList()){ if(typeof r.x!=='number') continue;
      const d=Math.hypot((r.x+17)-wx,(r.y+17)-wy); if(d<bd){ bd=d; target={kind:'player', id:r.id, name:r.name}; } }
  }
  if(!target && Game.activeBoss && !Game.activeBoss.defeated){
    const bx=Game.world.width/2, by=Game.activeBoss.topY-110;
    if(Math.hypot(bx-wx,by-wy)<170) target={kind:'boss'};
  }
  if(!target){ if(typeof toast==='function') toast('👽 Tap right on a friend or the boss to morph them!'); return; }
  Game.powerCdUntil = Game.t + (POWER_META.polymorph?POWER_META.polymorph.cd:6000);
  if(typeof openMorphPicker==='function') openMorphPicker(target);
}
/* Hyena: drop a poop pile at your feet; anyone who steps in it freezes 3s */
function dropPoop(){
  if(Game.t < Game.platformCdUntil) return;
  const p=Game.player;
  const poop={ x:p.x+p.w/2-13, y:p.y+p.h-8, w:26, h:16, born:Game.t, owner:MP.selfId||'me' };
  Game.poops.push(poop);
  if(Game.poops.length>40) Game.poops.shift();
  Game.platformCdUntil = Game.t + 1200;
  if(Game.multiplayer && typeof mpSendPoop==='function') mpSendPoop({x:poop.x, y:poop.y});
  SFX.click(); if(typeof toast==='function') toast('💩 Plop! Watch them step in it…');
}
/* a friend dropped a poop (multiplayer) */
function onPoopNet(d){
  if(!d) return;
  Game.poops.push({ x:d.x, y:d.y, w:26, h:16, born:Game.t, owner:'friend' });
  if(Game.poops.length>40) Game.poops.shift();
}
/* step-in-poop checks: freeze whoever walks over someone else's pile */
function updatePoops(){
  if(!Game.poops || !Game.poops.length) return;
  const p=Game.player, me=MP.selfId||'me';
  for(let i=Game.poops.length-1;i>=0;i--){ const g=Game.poops[i];
    if(Game.t-g.born > 14000){ Game.poops.splice(i,1); continue; }   // dries up
    const feetY=p.y+p.h;
    const overP = p.x+p.w>g.x && p.x<g.x+g.w && feetY>=g.y-6 && feetY<=g.y+g.h+10;
    if(overP && g.owner!==me && Game.t-g.born>250 && Game.t>=(Game.stunUntil||0)-100 && !g._hitMe){
      g._hitMe=true; Game.stunUntil=Math.max(Game.stunUntil||0, Game.t+3000);
      SFX.hit(); addShake(2); if(typeof toast==='function') toast('💩 Ew! Frozen for 3s!');
    }
    // in solo modes, poop also freezes the AI bot & disaster zombies that walk over it
    const a=Game.ai;
    if(a && a.x+a.w>g.x && a.x<g.x+g.w && (a.y+a.h)>=g.y-6 && (a.y+a.h)<=g.y+g.h+12){
      a.frozenUntil=Math.max(a.frozenUntil||0, Game.t+3000); }
    if(Game.dz && Game.dz.zombies){ for(const z of Game.dz.zombies){
      if(z.x+z.w>g.x && z.x<g.x+g.w && (z.y+z.h)>=g.y-6 && (z.y+z.h)<=g.y+g.h+12) z.frozenUntil=Math.max(z.frozenUntil||0, Game.t+3000); } }
  }
}

/* ==================== SECRET pet signature powers ==================== */
function usePower(power){
  const meta=POWER_META[power]; if(!meta) return;
  if(Game.t < Game.powerCdUntil) return;                 // still cooling down
  const p=Game.player; if(!p) return;
  Game.powerCdUntil = Game.t + meta.cd;
  switch(power){
    case 'teleport': {                                    // 🌈 blink forward through walls
      p.x = Math.max(0, Math.min(Game.world.width-p.w, p.x + p.facing*230));
      p.y -= 90; p.vy = Math.min(p.vy, 0); p.invuln=Math.max(p.invuln,300);
      for(let i=0;i<8;i++) Game.abilityFx.push({kind:'spark', x:p.x+p.w/2+(Math.random()*24-12), y:p.y+p.h/2+(Math.random()*24-12), vx:0, vy:0.3, life:1, born:Game.t});
      SFX.jump(); if(typeof toast==='function') toast('🌈 Blink!'); break;
    }
    case 'grapple': {                                     // 🦑 reel yourself way up
      p.vy = -19; p.onGround=false; p.jumps=0; p.squash=-1.2; addShake(3);
      SFX.jump(); if(typeof toast==='function') toast('🦑 Tentacle pull!'); break;
    }
    case 'flight': {                                      // 🦄 fly + invincible
      Game.flyUntil = Game.t + 5000; p.invuln = Math.max(p.invuln, 5000);
      SFX.rare(); if(typeof toast==='function') toast('🦄 Rainbow Flight! Hold JUMP to soar!'); break;
    }
    case 'phase': {                                       // 👻 intangible to hazards
      Game.phaseUntil = Game.t + 4500; p.invuln = Math.max(p.invuln, 4500);
      SFX.chest(); if(typeof toast==='function') toast('👻 Ghost Phase — nothing can touch you!'); break;
    }
    case 'freeze': {                                      // 🧊 freeze the world's enemies
      Game.freezeEnemiesUntil = Game.t + 4500;
      if(Game.multiplayer && typeof mpSendFreeze==='function') mpSendFreeze();
      addShake(4); SFX.hit(); if(typeof toast==='function') toast('🧊 Deep Freeze!'); break;
    }
    case 'slowtime': {                                    // 🌟 slow everything else
      Game.slowWorldUntil = Game.t + 4500;
      SFX.rare(); if(typeof toast==='function') toast('🌟 Star Time — the world slows down!'); break;
    }
    case 'firebreath': {                                  // 🐉 fire jet forward
      for(let i=0;i<5;i++) Game.fire.push({ x:p.x+p.w/2, y:p.y+p.h/2, vx:p.facing*(9+i*0.6), vy:(Math.random()*2-1)*1.4, r:15, born:Game.t+i*40 });
      addShake(3); SFX.hit(); if(typeof toast==='function') toast('🐉 Fire Breath!'); break;
    }
    case 'stomp': {                                       // 🦕 shockwave stun around you
      addShake(9); SFX.hit();
      const cx=p.x+p.w/2, cy=p.y+p.h, R=170;
      if(Game.disaster && Game.dz && Game.dz.zombies){    // knock out nearby zombies
        for(let i=Game.dz.zombies.length-1;i>=0;i--){ const z=Game.dz.zombies[i];
          if(Math.hypot((z.x+z.w/2)-cx,(z.y+z.h/2)-cy)<R){ z.flash=Game.t; Game.dz.zombies.splice(i,1); } } }
      if(Game.multiplayer){                               // shove & stun nearby friends
        for(const r of mpRemoteList()){ if(typeof r.x!=='number') continue;
          if(Math.hypot((r.x+17)-cx,(r.y+17)-cy)<R+30 && typeof mpSendStun==='function') mpSendStun(r.id); } }
      for(let i=0;i<14;i++){ const a=i/14*Math.PI*2; Game.abilityFx.push({kind:'dust', x:cx+Math.cos(a)*24, y:cy, vx:Math.cos(a)*3, vy:-Math.random()*1.5, life:1, born:Game.t}); }
      if(typeof toast==='function') toast('🦕 MEGA STOMP!'); break;
    }
    case 'supernova': {                                   // 🌟 Starlight — huge starburst
      addShake(12); SFX.rare(); p.invuln = Math.max(p.invuln, 2500);
      p.vy = -14; p.onGround=false; p.jumps=0;             // launch skyward
      const cx=p.x+p.w/2, cy=p.y+p.h/2, R=240;
      Game.freezeEnemiesUntil = Math.max(Game.freezeEnemiesUntil||0, Game.t+2500);   // stun the world briefly
      if(Game.dz){                                         // wipe nearby hazards
        if(Game.dz.zombies) for(let i=Game.dz.zombies.length-1;i>=0;i--){ const z=Game.dz.zombies[i];
          if(Math.hypot((z.x+z.w/2)-cx,(z.y+z.h/2)-cy)<R){ Game.dz.zombies.splice(i,1); } }
        if(Game.dz.meteors) for(const m of Game.dz.meteors){ if(Math.hypot(m.x-cx,m.y-cy)<R){ m.vy=-8; m.x+= (m.x<cx?-1:1)*6; } }
      }
      if(Game.bossShots) Game.bossShots=[];                // clear falling boss blocks
      if(Game.activeBoss && !Game.activeBoss.defeated){ Game.activeBoss.stunUntil=Game.t+3000; }  // dazzle the boss
      if(Game.multiplayer){                                // stun every nearby rival
        for(const r of mpRemoteList()){ if(typeof r.x!=='number') continue;
          if(Math.hypot((r.x+17)-cx,(r.y+17)-cy)<R+40 && typeof mpSendStun==='function') mpSendStun(r.id); } }
      for(let i=0;i<26;i++){ const an=i/26*Math.PI*2, sp=3+Math.random()*3;
        Game.abilityFx.push({kind:'star', x:cx, y:cy, vx:Math.cos(an)*sp, vy:Math.sin(an)*sp-1, life:1, born:Game.t}); }
      if(typeof toast==='function') toast('🌟 SUPERNOVA!'); break;
    }
    case 'cloudjump': {                                   // ☁️ Pegasus — big leap + refill jumps + float
      p.vy = -17; p.onGround=false; p.jumps=0; p.squash=-1.1;
      Game.floatUntil = Game.t + 1200;                    // gentle float on the way down
      p.invuln = Math.max(p.invuln, 300);
      for(let i=0;i<8;i++) Game.abilityFx.push({kind:'dust', x:p.x+p.w/2+(Math.random()*30-15), y:p.y+p.h, vx:(Math.random()*2-1)*2, vy:Math.random()*1.5, life:1, born:Game.t});
      SFX.jump(); if(typeof toast==='function') toast('☁️ Cloud Leap!'); break;
    }
    case 'hop': {                                         // 🥕 Bunny — springy mega hop + refill jumps
      p.vy = -18.5; p.onGround=false; p.jumps=0; p.squash=-1.2;
      for(let i=0;i<6;i++) Game.abilityFx.push({kind:'dust', x:p.x+p.w/2+(Math.random()*26-13), y:p.y+p.h, vx:(Math.random()*2-1)*1.8, vy:Math.random()*1.2, life:1, born:Game.t});
      SFX.jump(); if(typeof toast==='function') toast('🐰 Mega Hop!'); break;
    }
    case 'polymorph': {                                   // 👽 morph a friend or the boss
      const target = pickMorphTarget();
      if(!target){ Game.powerCdUntil = Game.t + 400;      // nothing near — refund most of the cd
        if(typeof toast==='function') toast('👽 Get closer to a friend or the boss to morph them!'); return; }
      if(typeof openMorphPicker==='function') openMorphPicker(target);
      else Game.powerCdUntil = Game.t + 400;
      break;
    }
  }
}
// nearest morphable target (a multiplayer friend or a Tower boss) within reach
function pickMorphTarget(){
  const p=Game.player, cx=p.x+p.w/2, cy=p.y+p.h/2; let best=null, bd=110;
  if(Game.multiplayer){
    for(const r of mpRemoteList()){ if(typeof r.x!=='number') continue;
      const d=Math.hypot((r.x+17)-cx,(r.y+17)-cy); if(d<bd){ bd=d; best={kind:'player', id:r.id, name:r.name}; } }
  }
  if(Game.activeBoss && !Game.activeBoss.defeated){
    const bx=Game.world.width/2, by=Game.activeBoss.topY-110;
    if(Math.hypot(bx-cx,by-cy)<220){ if(!best){ best={kind:'boss'}; } }
  }
  return best;
}
// apply a chosen morph (called by the picker).
//   spec = {type:'animal',emoji,name,power} | {type:'face',face,label} | {type:'acc',acc,label}
// The change lasts the WHOLE round.
function applyMorph(target, spec){
  if(!spec) return;
  if(target.kind==='boss'){
    // only an animal morph makes sense for the boss — it becomes a harmless critter
    const emoji = spec.type==='animal' ? spec.emoji : '🐤';
    const name  = spec.type==='animal' ? spec.name : 'critter';
    if(Game.activeBoss){ Game.activeBoss.morph = emoji; Game.activeBoss.tamed = true; }
    Game.bossShots=[];                     // clear any blocks already falling
    if(typeof toast==='function') toast('👽 Turned the boss into a harmless '+name+'!');
  } else if(target.kind==='player'){
    const payload = { emoji:spec.emoji||null, grant:spec.grant||'none', face:spec.face||null, acc:spec.acc||null, kind:spec.type };
    if(Game.multiplayer && typeof mpSendMorph==='function') mpSendMorph(target.id, payload);
    const r=MP.remote[target.id];
    if(r){ if(spec.type==='animal') r.morph=spec.emoji;
           else if(spec.type==='face') r.faceMorph=spec.face;
           else if(spec.type==='acc') r.accMorph=spec.acc; }
    const what = spec.type==='animal'?('a '+spec.name):spec.type==='face'?('the '+spec.label+' face'):('the '+spec.label);
    if(typeof toast==='function') toast('👽 Morphed '+((target.name)||'your friend')+' into '+what+' for the round!');
  }
  SFX.rare();
}
// a friend morphed ME (multiplayer): change how I look for the round + optionally my power
function onMorphedMe(payload){
  const d = (typeof payload==='object' && payload) ? payload : {emoji:payload, grant:arguments[1], kind:'animal'};
  Game.morphRound = true;
  if(d.kind==='face'){ Game.faceMorph = d.face; if(typeof toast==='function') toast('✨ Your face was swapped for the round!'); }
  else if(d.kind==='acc'){ Game.accMorph = d.acc; if(typeof toast==='function') toast('✨ Your accessory was swapped for the round!'); }
  else {
    Game.morph = d.emoji;
    Game.morphPower = d.grant||'none';
    Game.morphUntil = Game.t + 10000000;   // round-long
    applyMorphPower(d.grant||'none');
    if(typeof toast==='function') toast('✨ You were morphed into '+d.emoji+' for the round!');
  }
}
function applyMorphPower(grant){
  // temporary stat tweaks from being morphed
  Game.morphMoveMul = grant==='speed'?1.5 : 1;
  Game.morphJumpMul = grant==='jump'?1.25 : 1;
  Game.morphFly = grant==='fly';
  if(grant==='shield') Game.power.shield=true;
  if(grant==='fly') Game.flyUntil = Game.t + 15000;
}
// how fast enemies move right now: 0 = frozen (🧊), 0.35 = slowed (🌟), 1 = normal
function powerScale(){
  if(Game.t < (Game.freezeEnemiesUntil||0)) return 0;
  if(Game.t < (Game.slowWorldUntil||0)) return 0.35;
  return 1;
}
function updatePowers(dt){
  // a morph wears off after a while (unless it's a round-long Alien morph)
  if(Game.morph && !Game.morphRound && Game.t>Game.morphUntil){
    Game.morph=null; Game.morphPower='none'; Game.morphMoveMul=1; Game.morphJumpMul=1; Game.morphFly=false;
  }
  if(!Game.fire.length) return;
  const W=Game.world.width;
  for(let i=Game.fire.length-1;i>=0;i--){ const f=Game.fire[i];
    if(Game.t<f.born) continue;
    f.x+=f.vx; f.y+=f.vy; f.vy+=0.05; f.r*=0.986;
    if(f.r<5 || Game.t-f.born>1000 || f.x<-40 || f.x>W+40){ Game.fire.splice(i,1); continue; }
    const boss=Game.activeBoss;
    if(boss && !boss.defeated){ const bx=W/2, by=boss.topY-110;
      if(Math.abs(bx-f.x)<72 && Math.abs(by-f.y)<72){ boss.hits=(boss.hits||0)+1; boss._flash=Game.t; addShake(2);
        if(boss.hits>=5){ boss.defeated=true; Game.bossShots=[]; bossReward(boss.floorNo); }
        Game.fire.splice(i,1); continue; } }
    let done=false;
    if(Game.disaster && Game.dz && Game.dz.zombies){
      for(let k=Game.dz.zombies.length-1;k>=0;k--){ const z=Game.dz.zombies[k];
        if(f.x>z.x-f.r && f.x<z.x+z.w+f.r && f.y>z.y-f.r && f.y<z.y+z.h+f.r){ Game.dz.zombies.splice(k,1); done=true; break; } } }
    if(done){ Game.fire.splice(i,1); continue; }
    for(let k=Game.bossShots.length-1;k>=0;k--){ const s=Game.bossShots[k];
      if(Math.abs(s.x-f.x)<s.r+f.r && Math.abs(s.y-f.y)<s.r+f.r){ Game.bossShots.splice(k,1); } }
  }
}

function update(dt){
  if(Game.spectating){ spectateUpdate(); return; }
  if(Game.ship){ updateShip(dt); return; }      // inside the alien ship — escape scene
  const p=Game.player; if(!p) return;
  if(Game.shakeMag){ Game.shakeMag*=0.86; if(Game.shakeMag<0.2) Game.shakeMag=0; }
  const GRAV=0.86, MAXFALL=18, MOVE=4.8, ACCEL=0.6, FRICT=0.72, JUMP=-14.0;

  updateMovers();                       // slide moving blocks before collision
  updateLifts();                        // raise co-op lifts (carries riders)
  updateTrapdoors();                    // flip trap-doors after you've stood on them
  if(Game.placedPlatforms.length) Game.placedPlatforms = Game.placedPlatforms.filter(pp=>pp.until>Game.t);
  if(p.invuln>0) p.invuln-=dt*1000;

  if(p.onGround) p.jumps=0;              // reset jump count when grounded

  const beamed = Game.disaster && Game.dz && Game.dz.beamed;   // caught in an alien tractor beam
  const stunned = Game.t < (Game.stunUntil||0) || Game.moveLock;   // banana stun or seeker-blind
  const dir = (stunned||beamed) ? 0 : Math.max(-1,Math.min(1,readInput()));
  // horizontal (pet speed boost) — ice makes you slip (low grip, slow stop)
  const dashing = Game.t < Game.power.dashUntil;
  const flying = Game.t < (Game.flyUntil||0);            // 🦄 rainbow flight / morphed eagle
  const move = MOVE*Game.petMoveMul*(Game.morphMoveMul||1)*(dashing?1.5:1);
  const target=dir*move;
  const grip = p.onIce ? 0.09 : 0.35;
  p.vx += (target-p.vx)*grip;
  if(Math.abs(dir)<0.05){ p.vx*=(p.onIce?0.985:FRICT); if(Math.abs(p.vx)<0.05)p.vx=0; }
  if(dir>0.05)p.facing=1; if(dir<-0.05)p.facing=-1;
  p.onIce=false;                          // re-set by onStand if still on ice

  // jump (pet: higher jump + double jump; flight = thrust up)
  if(Game.input.jump && !stunned){
    if(flying){ p.vy=-9; p.onGround=false; p.squash=-1; SFX.jump(); }
    else {
      const jv = JUMP*Game.petJumpMul*(Game.morphJumpMul||1);
      if(p.onGround){ p.vy=jv; p.onGround=false; p.jumps=1; p.squash=-1; SFX.jump(); }
      else if(p.jumps < Game.petMaxJumps){ p.vy=jv; p.jumps++; p.squash=-1; SFX.jump(); }
    }
  }
  Game.input.jump=false;
  // hold UP to keep soaring while flying
  if(flying && !stunned && (Game.keys['ArrowUp']||Game.keys[' ']||Game.keys['w'])) p.vy=Math.min(p.vy,-4);

  if(beamed){
    // pulled up under the UFO's beam (mash ◀▶ to fight it — handled in updateDisaster)
    const a=Game.dz.beamAlien, bx=a?a.beamX:(p.x+p.w/2);
    p.vx=(bx-(p.x+p.w/2))*0.22;
    p.vy=-(2.6 + (Game.dz.levit||0)*5);
    p.onGround=false;
  } else {
    // gravity (pet glide = slower fall; flight = gentle float; Pegasus cloud-leap floats you down)
    const floating = Game.t < (Game.floatUntil||0);
    const g = flying ? 0.14 : (p.vy>0) ? GRAV*Game.petFallMul*(floating?0.35:1) : GRAV;
    p.vy+=g; if(p.vy>MAXFALL)p.vy=MAXFALL;
    if(flying && p.vy>4) p.vy=4;
    if(floating && p.vy>3.2) p.vy=3.2;
  }

  // integrate + collide
  const wasGround=p.onGround;
  p.onGround=false;
  moveAndCollide(p);
  if(p.onGround && !wasGround) SFX.land();

  // squash easing
  p.squash += (0 - p.squash)*0.18;

  // out of bounds (fell off bottom)
  if(p.y > Game.world.height + 240){
    if(Game.petSaveFall && Game.lastSafe){    // Phoenix: pop back onto your last platform
      p.x=Game.lastSafe.x; p.y=Game.lastSafe.y; p.vx=0; p.vy=0; p.invuln=600;
      if(typeof toast==='function') toast('🔥 Rescued by your Phoenix!');
    } else respawn();
  }

  // cannons + bullets + laser beams
  updateHazards(dt);
  updateLasers();
  updateSoloHazards();                  // pendulums / spikes / laser gates (Hard)
  collectCoins(p);
  updatePowers(dt);                     // secret-pet powers (fire, morph timers)
  if(Game.tower){ maybeExtendTower(); updateBoss(); }   // grow tower + boss fights
  if(Game.bananas.length) updateBananas();
  if(Game.poops.length) updatePoops();
  if(Game.heist && !Game.finished && Game.t>=Game.heistEndT) endHeist();
  if(Game.disaster && !Game.finished){
    const drives = !Game.multiplayer || MP.isHost;   // host drives the shared disaster cycle
    if(Game.disasterPhase==='build'){ if(Game.t>=Game.disasterPhaseT && drives) startDisasterActive(); }
    else if(Game.disasterPhase==='active'){ updateDisaster(dt); if(Game.t>=Game.disasterPhaseT && drives) nextDisaster(); }
  }
  if(Game.room && Game.roomSolo && !Game.finished) updateRoom(dt);
  else if(Game.room && Game.multiplayer && !Game.finished) updateRoomMP(dt);
  if(Game.colorTag && !Game.finished) updateColorTag(dt);

  // conveyor push handled in collision (sets p.vx target)
  // camera follow (smooth)
  const flatArena = Game.room || (Game.colorTag && Game.colorArena==='room');
  const camTX=p.x, camTY=flatArena ? Game.world.height/2 - 20 : p.y-40;
  Game.cam.x += (camTX-Game.cam.x)*0.12;
  Game.cam.y += (camTY-Game.cam.y)*0.12;
  // clamp camera horizontally to world
  const half=(Game.W/gameScale())/2;
  Game.cam.x=Math.max(half, Math.min(Game.world.width-half, Game.cam.x));

  // Tag mode (or the disaster 'killer' bonus): if I'm "it", tagging a friend passes it on
  const tagActive = Game.mode==='tag' || (Game.disaster && Game.disasterType==='killer' && Game.disasterPhase==='active');
  if(Game.multiplayer && tagActive && MP.itId===MP.selfId && Game.t>Game.tagCdUntil){
    for(const r of mpRemoteList()){
      if(typeof r.x!=='number') continue;
      if(rectsOverlap(p.x,p.y,p.w,p.h, r.x,r.y,34,34)){
        mpSendIt(r.id); Game.tagCdUntil=Game.t+2200;
        unlockAchievement('tagger');
        if(typeof toast==='function') toast('🏃 You tagged '+(r.name||'a friend')+'!');
        SFX.win(); break;
      }
    }
  }
  updateAbilityFx();

  // multiplayer net update ~18Hz
  if(Game.multiplayer){
    Game.netTimer+=dt;
    if(Game.netTimer>0.055){
      Game.netTimer=0;
      mpSendPos({x:Math.round(p.x),y:Math.round(p.y),facing:p.facing,
                 skin:SAVE.skin,accessory:SAVE.accessory,face:SAVE.face,petSkin:SAVE.petSkin,
                 name:SAVE.name,cp:p.cp,finished:Game.finished, inShip:false,
                 disg:(Game.myDisguise&&Game.myDisguise.emoji)||null, morph:Game.morph||null});
    }
  }
}

/* ===== Tower boss: every 5th floor a big blob rains blocks down on you ===== */
function updateBoss(){
  if(!Game.world || !Game.world.bosses) return;
  const p=Game.player;
  // active boss = the nearest undefeated boss whose arena the player is climbing
  Game.activeBoss=null;
  for(const b of Game.world.bosses){
    if(b.defeated) continue;
    if(p.y <= b.bottomY+80 && p.y >= b.topY-120){ Game.activeBoss=b; break; }
  }
  if(Game.freezeHazards) return;          // tests: no projectiles
  const b=Game.activeBoss;
  if(b && b.tamed) return;                // morphed into a powerless animal — no attacks
  if(Game.t < (Game.freezeEnemiesUntil||0)) return;   // 🧊 boss frozen
  const W=Game.world.width, topY=b?b.topY-70:0;
  if(b){
    if(!b.lastThrow) b.lastThrow=Game.t;
    const pat=b.pattern||'rain';
    const every = pat==='spread'?1500 : pat==='sweep'?260 : (b.floorNo>=15?760:980);
    if(Game.t-b.lastThrow > every){
      b.lastThrow=Game.t;
      if(pat==='rain'){
        const n=b.floorNo>=20?2:1;
        for(let k=0;k<n;k++) Game.bossShots.push({x:70+Math.random()*(W-140), y:topY, vy:3, r:13});
      } else if(pat==='aimed'){
        // lob a block straight at the player's current column
        Game.bossShots.push({x:Math.max(40,Math.min(W-40, p.x+p.w/2)), y:topY, vy:4.5, r:13});
      } else if(pat==='spread'){
        // a wide volley across the arena all at once
        for(let k=0;k<3;k++) Game.bossShots.push({x:90+k*(W-180)/2, y:topY, vy:3.4, r:13});
      } else if(pat==='sweep'){
        // a marching wall of blocks that sweeps side to side with a gap to slip through
        b.sweepX=(b.sweepX||60)+Math.sin(Game.t/600)*40+34;
        if(b.sweepX>W-60){ b.sweepX=60; }
        Game.bossShots.push({x:b.sweepX, y:topY, vy:3, r:13});
      }
    }
  }
  const hs=hazardSpeed();
  for(let i=Game.bossShots.length-1;i>=0;i--){
    const s=Game.bossShots[i];
    s.vy=Math.min(13, s.vy+0.42); s.y+=s.vy*hs;
    if(s.y > p.y+900){ Game.bossShots.splice(i,1); continue; }
    if(isHittable(p) && p.x < s.x+s.r && p.x+p.w > s.x-s.r && p.y < s.y+s.r && p.y+p.h > s.y-s.r){
      Game.bossShots.splice(i,1);
      if(absorbWithShield()){ p.invuln=600; continue; }
      respawn(); p.invuln=1100; SFX.hit();
      if(typeof toast==='function') toast('👹 Boss hit you!');
    }
  }
}
/* Monkey bananas: arc forward, smash boss projectiles, damage the boss,
   and splat friends in multiplayer (just for fun). */
function updateBananas(){
  const W=Game.world.width;
  for(let i=Game.bananas.length-1;i>=0;i--){
    const b=Game.bananas[i];
    b.vy += (b.g||0.5);               // all bananas arc through the air (gravity)
    b.x+=b.vx; b.y+=b.vy;
    if(Game.t-b.born>3500 || b.x<-40 || b.x>W+40 || b.y>Game.world.height+200){ Game.bananas.splice(i,1); continue; }
    let hit=false;
    for(let k=Game.bossShots.length-1;k>=0;k--){ const s=Game.bossShots[k];
      if(Math.abs(s.x-b.x)<s.r+b.r && Math.abs(s.y-b.y)<s.r+b.r){ Game.bossShots.splice(k,1); hit=true; break; } }
    if(!hit){
      const boss=Game.activeBoss;
      if(boss && !boss.defeated){
        const bx=Game.world.width/2, by=boss.topY-110;
        if(Math.abs(bx-b.x)<60 && Math.abs(by-b.y)<62){
          boss.hits=(boss.hits||0)+1; boss._flash=Game.t; hit=true; addShake(3);
          if(boss.hits>=5){ boss.defeated=true; Game.bossShots=[]; bossReward(boss.floorNo); }
          else if(typeof toast==='function') toast('🍌 Boss hit! ('+boss.hits+'/5)');
        }
      }
    }
    // disaster zombies are "monsters": 3 banana hits and they're gone
    if(!hit && Game.disaster && Game.dz && Game.dz.zombies){
      const zs=Game.dz.zombies;
      for(let k=zs.length-1;k>=0;k--){ const z=zs[k];
        if(b.x>z.x-b.r && b.x<z.x+z.w+b.r && b.y>z.y-b.r && b.y<z.y+z.h+b.r){
          z.bhits=(z.bhits||0)+1; z.flash=Game.t; hit=true; addShake(2); SFX.hit();
          if(z.bhits>=3){ zs.splice(k,1); addCoins(2); if(typeof toast==='function') toast('🍌 Monster down! +2🪙'); }
          else if(typeof toast==='function') toast('🍌 Monster hit! ('+z.bhits+'/3)');
          break;
        }
      }
    }
    // splat a friend in multiplayer -> stun them for 3 seconds
    if(!hit && Game.multiplayer){
      for(const r of mpRemoteList()){ if(typeof r.x!=='number') continue;
        if(Math.abs(r.x+17-b.x)<24 && Math.abs(r.y+17-b.y)<24){
          hit=true; r.emote='😵'; r.emoteAt=nowMs();
          if(typeof mpSendStun==='function') mpSendStun(r.id);
          if(typeof toast==='function') toast('🍌 Stunned your friend! 😵');
          break; } }
    }
    if(hit) Game.bananas.splice(i,1);
  }
}
function drawBananas(ctx){
  ctx.font='20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const b of Game.bananas){
    ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(Game.t/90 + b.x); ctx.fillText('🍌',0,0); ctx.restore();
  }
}
function bossReward(floorNo){
  addShake(9);
  addCoins(25); unlockAchievement('boss');
  if(typeof questEvent==='function') questEvent('boss',1);
  let creature=null;
  if(typeof rollRarity==='function'){
    const rar=rollRarity({basic:18,rare:36,superRare:26,legendary:13,mythical:5,secret:2});
    const pool=creaturesOfRarity(rar);
    creature=pool[Math.floor(Math.random()*pool.length)];
    SAVE.pets[creature.id]=(SAVE.pets[creature.id]||0)+1;
    if(!SAVE.equippedPet) SAVE.equippedPet=creature.id;
    if(creature.rarity==='secret') unlockAchievement('secret');
    checkPetAchievements(); persist();
  }
  SFX.win();
  toast('👹 Boss beaten! +🪙25'+(creature?' & '+creature.emoji+' '+creature.name+'!':''));
}

/* spectate: smoothly follow the watched friend's blob */
function spectateUpdate(){
  const r = Game.spectateId ? MP.remote[Game.spectateId] : null;
  if(!r || typeof r.x!=='number') return;
  const camTX=r.x+17, camTY=r.y-40;
  Game.cam.x += (camTX-Game.cam.x)*0.10;
  Game.cam.y += (camTY-Game.cam.y)*0.10;
  const half=(Game.W/gameScale())/2;
  Game.cam.x=Math.max(half, Math.min(Game.world.width-half, Game.cam.x));
}

function moveAndCollide(p){
  // world platforms + any active pet-placed platforms
  const plats = Game.placedPlatforms.length ? Game.world.platforms.concat(Game.placedPlatforms) : Game.world.platforms;
  const now=Game.t;

  // ---- horizontal: free movement (one-way platforms don't block sideways) ----
  p.x+=p.vx;
  if(p.x<0)p.x=0; if(p.x+p.w>Game.world.width)p.x=Game.world.width-p.w;

  // ---- vertical: ONE-WAY (jump-through) platforms ----
  // You pass through blocks while jumping up, and only land on top when your
  // feet cross the platform's top edge from above while falling.
  const prevBottom = p.y + p.h;     // feet position before moving this step
  p.y += p.vy;
  const newBottom = p.y + p.h;

  const SNAP = 14;                  // forgiveness so you don't slip off when landing
  let standingOn=null, bestTop=Infinity;
  if(p.vy >= 0){                    // only when falling or resting
    for(const pl of plats){
      if(!solidForMe(pl)) continue;
      // horizontal overlap with the platform?
      if(p.x < pl.x+pl.w && p.x+p.w > pl.x){
        const top = pl.y;
        // Land if EITHER:
        //  (a) your feet crossed the top edge from above this frame (clean drop), OR
        //  (b) your feet are only slightly past the top while your body is still
        //      mostly above it (caught a ledge after a diagonal/side approach).
        const crossedFromAbove = prevBottom <= top + 1 && newBottom >= top;
        const caughtLedge = newBottom >= top && newBottom <= top + SNAP && p.y < top;
        if(crossedFromAbove || caughtLedge){
          if(top < bestTop){ bestTop = top; standingOn = pl; } // highest surface first
        }
      }
    }
  }
  if(standingOn){
    p.y = bestTop - p.h;
    if(standingOn.type==='bouncy'){
      // trampoline: launch up automatically (a touch higher than a normal jump)
      p.vy = -15.2; p.onGround = false; p.jumps = 0; p.squash = -1.1;
      if(!standingOn._bt || Game.t-standingOn._bt>140){ standingOn._bt=Game.t; SFX.jump(); }
    } else {
      // landing dust puff (most landings) + a tiny shake only on a big drop
      if(!p.onGround && p.vy>9){
        const n = p.vy>13?4:2;
        for(let i=0;i<n;i++) Game.abilityFx.push({kind:'dust', x:p.x+p.w/2+(Math.random()*22-11), y:p.y+p.h-2, vx:(Math.random()*2-1)*1.3, vy:-Math.random()*0.8, life:1, born:Game.t});
        if(p.vy>14) addShake(2.5);
      }
      p.vy = 0;
      if(!p.onGround && p.squash > -0.4) p.squash = 0.9;
      p.onGround = true;
      Game.lastSafe = {x:p.x, y:p.y};      // Phoenix rescue point
      // ride moving blocks: carry the player along with the platform
      if(standingOn.type==='mover'){ p.x += standingOn.dx||0; }
    }
  }
  p.onLift = (standingOn && standingOn.type==='lift') ? standingOn : null;

  // handle effects of the platform we're standing on
  Game.curPadKey=null;
  if(standingOn){ onStand(p, standingOn, now); }
  // clear pad reports if not standing on a pad this frame
  reconcilePads();
}

function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
  return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
}

/* grab floating coins (magnet pulls them in) and power-ups you touch */
function collectCoins(p){
  const magnet = Game.t < Game.power.magnetUntil || Game.petMagnet;   // Raccoon = always magnet
  const pcx=p.x+p.w/2, pcy=p.y+p.h/2;
  for(const c of Game.world.platforms){
    if(c.taken) continue;
    if(c.type==='coin'){
      let grab = p.x < c.x+c.w && p.x+p.w > c.x && p.y < c.y+c.h && p.y+p.h > c.y;
      if(magnet && !grab){
        const dx=(c.x+c.w/2)-pcx, dy=(c.y+c.h/2)-pcy;
        if(dx*dx+dy*dy < 150*150) grab=true;     // magnet radius
      }
      if(grab){
        const gain = Game.t<Game.power.x2Until ? 2 : 1;     // ⭐ double-coins power-up
        c.taken=true; Game.runCoins+=gain; SFX.coin();
        if(Game.heist){
          Game.heistLoot += gain;        // 1 coin each — banked all at once when the timer ends
        } else {
          addCoins(gain);
          SAVE.lvlCoinsCollected=(SAVE.lvlCoinsCollected||0)+gain; persist();
          if(SAVE.lvlCoinsCollected>=50) unlockAchievement('coins50');
        }
        if(typeof questEvent==='function') questEvent('coins',gain);
      }
    } else if(c.type==='powerup'){
      if(p.x < c.x+c.w && p.x+p.w > c.x && p.y < c.y+c.h && p.y+p.h > c.y){
        c.taken=true; applyPowerup(c.pw);
      }
    }
  }
}
const POWERUP_INFO = {
  magnet:{emoji:'🧲', name:'Coin Magnet'},
  shield:{emoji:'🛡️', name:'Shield'},
  dash:  {emoji:'👟', name:'Speed Dash'},
  slow:  {emoji:'⏳', name:'Slow-mo'},
  x2:    {emoji:'⭐', name:'Double Coins'},
  ghost: {emoji:'👻', name:'Ghost'},
};
function applyPowerup(kind){
  if(SFX.rare) SFX.rare();
  if(kind==='magnet'){ Game.power.magnetUntil=Game.t+8000; toast('🧲 Coin magnet!'); }
  else if(kind==='dash'){ Game.power.dashUntil=Game.t+6000; toast('👟 Speed dash!'); }
  else if(kind==='shield'){ Game.power.shield=true; toast('🛡️ Shield up!'); }
  else if(kind==='slow'){ Game.power.slowUntil=Game.t+6000; toast('⏳ Slow-mo!'); }
  else if(kind==='x2'){ Game.power.x2Until=Game.t+9000; toast('⭐ Double coins!'); }
  else if(kind==='ghost'){ Game.power.ghostUntil=Game.t+4500; toast('👻 Ghost — can\'t be hit!'); }
  if(typeof questEvent==='function') questEvent('powerup',1);
}
/* shield blocks one hit; returns true if a hit was absorbed */
function absorbWithShield(){
  if(Game.power.shield){ Game.power.shield=false; if(typeof toast==='function') toast('🛡️ Blocked!'); SFX.hit(); return true; }
  return false;
}
/* can the player currently be hit by a hazard? (invuln frames or 👻 ghost) */
function isHittable(p){ return p.invuln<=0 && Game.t>=Game.power.ghostUntil; }
/* hazard motion multiplier while ⏳ slow-mo is active */
function hazardSpeed(){ return Game.t<Game.power.slowUntil ? 0.45 : 1; }

/* slide moving blocks horizontally around their base position */
function updateMovers(){
  if(Game.freezeHazards || !Game.world) return;
  for(const pl of Game.world.platforms){
    if(pl.type==='mover'){
      const old=pl.x;
      pl.x = pl.base + pl.amp*Math.sin(Game.t*pl.omega + pl.phase);
      pl.dx = pl.x - old;
    }
  }
}

/* Co-op lifts: rise (carrying riders) once both players are aboard. */
const LIFT_RISE_MS=2200, LIFT_HOLD_MS=4000;
function updateLifts(){
  if(Game.freezeHazards || !Game.world) return;
  for(const pl of Game.world.platforms){
    if(pl.type!=='lift') continue;
    const start = MP.lifts ? MP.lifts[pl.grp] : 0;
    const old=pl.y;
    if(start){
      const t=nowMs()-start;
      if(t < LIFT_RISE_MS){
        let pr=t/LIFT_RISE_MS;
        const e = pr<0.5 ? 2*pr*pr : 1-Math.pow(-2*pr+2,2)/2;  // ease in-out
        pl.y = pl.baseY + (pl.topY-pl.baseY)*e;
      } else if(t < LIFT_RISE_MS+LIFT_HOLD_MS){
        pl.y = pl.topY;                 // hold at top so both can step off
      } else {
        pl.y = pl.baseY;                // reset so it can be used again
      }
    } else pl.y = pl.baseY;
    pl.dy = pl.y - old;
  }
  // carry the local player if they're riding a lift
  const p=Game.player;
  if(p && p.onLift && p.onLift.type==='lift') p.y += (p.onLift.dy||0);
}

/* Trap-doors: once you stand on one it flips open ~0.85s later for ~1.4s,
   then recloses so it can be used again. */
function updateTrapdoors(){
  if(Game.freezeHazards || !Game.world) return;
  const now=Game.t;
  for(const k in Game.trap){
    const t=Game.trap[k];
    if(t.since!=null && !t.openUntil && now-t.since > 850){ t.openUntil=now+1400; t.since=null; }
    else if(t.openUntil && now > t.openUntil){ delete Game.trap[k]; }
  }
}

/* Solo "dodge" hazards (Hard only): swinging pendulums, popping spikes and
   toggling laser gates. Frozen during automated tests and inert in Easy. */
function updateSoloHazards(){
  if(Game.freezeHazards || !Game.world || !Game.world.hazards) return;
  if(Game.difficulty!=='hard' && !Game.heist) return;
  const p=Game.player; if(!isHittable(p)) return;
  for(const h of Game.world.hazards){
    let hit=false, label='💫 Bonked!';
    if(h.kind==='pendulum'){
      const ang=h.amp*Math.sin(Game.t*h.omega+h.phase);
      const bx=h.px+Math.sin(ang)*h.len, by=h.py+Math.cos(ang)*h.len;
      const cx=Math.max(p.x,Math.min(bx,p.x+p.w)), cy=Math.max(p.y,Math.min(by,p.y+p.h));
      hit=(bx-cx)*(bx-cx)+(by-cy)*(by-cy) < h.r*h.r;
    } else if(h.kind==='spike'){
      if(Math.sin(Game.t*h.omega+h.phase)>0){ hit=rectsOverlap(p.x,p.y,p.w,p.h, h.x,h.y-h.h,h.w,h.h+4); label='🔺 Ouch! Spikes!'; }
    } else if(h.kind==='lasergate'){
      if(Math.sin(Game.t*h.omega+h.phase)>0.1){ hit=rectsOverlap(p.x,p.y,p.w,p.h, h.x,h.y,h.w,h.h); label='⚡ Zapped!'; }
    } else if(h.kind==='movelaser'){
      const bx=h.cx + h.range*Math.sin(Game.t*h.omega+h.phase);
      if(rectsOverlap(p.x,p.y,p.w,p.h, bx-h.w/2,h.y,h.w,h.h)){ hit=true; label='⚡ Laser!'; h._bx=bx; }
    }
    if(hit){
      if(absorbWithShield()){ p.invuln=600; break; }
      if(Game.heist){
        // heist: knock you back a bit instead of resetting to the bottom
        const fromX = (h.kind==='movelaser') ? h._bx : (h.x+ (h.w||0)/2);
        p.vy=Math.max(p.vy,5); p.vx = (p.x+p.w/2 < fromX ? -7 : 7); p.invuln=900;
        SFX.hit(); addShake(4);
      } else {
        respawn(); p.invuln=1100; SFX.hit();
      }
      if(typeof toast==='function') toast(label);
      break;
    }
  }
}

/* ---- per-level themes / weather ---- */
function levelTheme(){
  if(Game.heist) return {css:'linear-gradient(180deg,#2a2030,#4a3a2a 55%,#6e5a2e)', weather:'embers', glow:'rgba(255,210,90,.25)'};
  if(Game.tower) return {css:'linear-gradient(180deg,#1a1340,#3b2a7a 55%,#5a4a9a)', weather:'stars', glow:'rgba(180,160,255,.22)'};
  const T={
    1:{css:'linear-gradient(180deg,#cfeaff,#bcd9ff)',         weather:null,     glow:'rgba(123,224,176,.25)'},
    2:{css:'linear-gradient(180deg,#d9f6dc,#bdebc6)',         weather:null,     glow:'rgba(255,180,210,.25)'},
    3:{css:'linear-gradient(180deg,#fff0c2,#ffd9a0)',         weather:null,     glow:'rgba(255,200,120,.3)'},
    4:{css:'linear-gradient(180deg,#eaf5ff,#cfe6ff)',         weather:'snow',   glow:'rgba(255,255,255,.4)'},
    5:{css:'linear-gradient(180deg,#ffd0b0,#ff9e7a 55%,#b86a8a)', weather:'embers', glow:'rgba(255,150,90,.3)'},
  };
  return T[Game.level]||T[1];
}
function applyTheme(){
  const th=levelTheme(); Game.theme=th;
  const gs=document.getElementById('gameScreen'); if(gs) gs.style.background=th.css;
  initWeather(th.weather);
}
function initWeather(kind){
  Game.weather=kind; Game.weatherParticles=[];
  if(!kind) return;
  const W=Game.W||420, H=Game.H||820, n = kind==='stars'?44:34;
  for(let i=0;i<n;i++) Game.weatherParticles.push({x:Math.random()*W, y:Math.random()*H, t:Math.random()*6.283, sp:0.3+Math.random()*1.0, sz:6+Math.random()*10});
}
function drawWeather(ctx){
  if(!Game.weather || !Game.weatherParticles.length) return;
  const W=Game.W, H=Game.H;
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const pt of Game.weatherParticles){
    if(Game.weather==='snow'){ pt.y+=pt.sp; pt.x+=Math.sin(Game.t/600+pt.t)*0.4; if(pt.y>H+8){pt.y=-8;pt.x=Math.random()*W;}
      ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.sz*0.28,0,6.283); ctx.fill();
    } else if(Game.weather==='petals'){ pt.y+=pt.sp; pt.x+=Math.sin(Game.t/500+pt.t)*0.9; if(pt.y>H+8){pt.y=-8;pt.x=Math.random()*W;}
      ctx.font=`${Math.round(pt.sz)}px serif`; ctx.fillText('🌸',pt.x,pt.y);
    } else if(Game.weather==='embers'){ pt.y-=pt.sp*0.7; pt.x+=Math.sin(Game.t/400+pt.t)*0.5; if(pt.y<-8){pt.y=H+8;pt.x=Math.random()*W;}
      ctx.fillStyle='rgba(255,170,90,.7)'; ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.sz*0.18,0,6.283); ctx.fill();
    } else if(Game.weather==='stars'){ const tw=Math.sin(Game.t/400+pt.t)*0.5+0.5;
      ctx.globalAlpha=0.25+tw*0.7; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.sz*0.16,0,6.283); ctx.fill(); ctx.globalAlpha=1;
    }
  }
  ctx.restore();
}
function drawSoloHazards(ctx){
  if((Game.difficulty!=='hard' && !Game.heist) || !Game.world.hazards) return;
  for(const h of Game.world.hazards){
    if(h.kind==='pendulum'){
      const ang=h.amp*Math.sin(Game.t*h.omega+h.phase);
      const bx=h.px+Math.sin(ang)*h.len, by=h.py+Math.cos(ang)*h.len;
      ctx.strokeStyle='#9a8aa8'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(h.px,h.py); ctx.lineTo(bx,by); ctx.stroke();
      ctx.fillStyle='#7a6a86'; ctx.beginPath(); ctx.arc(h.px,h.py,5,0,6.283); ctx.fill();
      ctx.strokeStyle='#7a3a5e'; ctx.lineWidth=3;
      for(let i=0;i<8;i++){ const a=i/8*6.283; ctx.beginPath(); ctx.moveTo(bx+Math.cos(a)*h.r,by+Math.sin(a)*h.r); ctx.lineTo(bx+Math.cos(a)*(h.r+5),by+Math.sin(a)*(h.r+5)); ctx.stroke(); }
      ctx.fillStyle='#c25b8a'; ctx.beginPath(); ctx.arc(bx,by,h.r,0,6.283); ctx.fill();
    } else if(h.kind==='spike'){
      const up=Math.sin(Game.t*h.omega+h.phase)>0, ext=up?1:0.16;
      ctx.fillStyle='#8a6b78'; ctx.fillRect(h.x,h.y,h.w,4);
      ctx.fillStyle=up?'#c94f6d':'#caa9b4';
      const n=Math.max(2,Math.floor(h.w/14));
      for(let i=0;i<n;i++){ const sx=h.x+i*(h.w/n), sw=h.w/n;
        ctx.beginPath(); ctx.moveTo(sx,h.y); ctx.lineTo(sx+sw/2,h.y-h.h*ext); ctx.lineTo(sx+sw,h.y); ctx.closePath(); ctx.fill(); }
    } else if(h.kind==='lasergate'){
      const on=Math.sin(Game.t*h.omega+h.phase)>0.1;
      ctx.fillStyle='#6b5b78'; ctx.fillRect(h.x-8,h.y-6,8,h.h+12); ctx.fillRect(h.x+h.w,h.y-6,8,h.h+12);
      if(on){ ctx.globalAlpha=Math.sin(Game.t/60)*0.25+0.75; ctx.fillStyle='#ff5a5a'; roundRect(ctx,h.x,h.y,h.w,h.h,4); ctx.fill();
        ctx.fillStyle='#fff'; ctx.fillRect(h.x,h.y+h.h/2-1,h.w,2); ctx.globalAlpha=1;
      } else { ctx.globalAlpha=0.25; ctx.fillStyle='#b8c4d6'; ctx.fillRect(h.x,h.y+h.h/2-1,h.w,2); ctx.globalAlpha=1; }
    } else if(h.kind==='movelaser'){
      const bx=h.cx + h.range*Math.sin(Game.t*h.omega+h.phase);
      // emitter caps top & bottom
      ctx.fillStyle='#6b5b78'; ctx.fillRect(bx-9,h.y-9,18,9); ctx.fillRect(bx-9,h.y+h.h,18,9);
      ctx.globalAlpha=Math.sin(Game.t/50)*0.2+0.8; ctx.fillStyle='#ff5a5a';
      roundRect(ctx,bx-h.w/2,h.y,h.w,h.h,4); ctx.fill();
      ctx.fillStyle='#fff'; ctx.fillRect(bx-1.5,h.y,3,h.h); ctx.globalAlpha=1;
    }
  }
}

/* Screen-anchored turrets: they slide up/down the left & right edges of the
   screen and fire bullets across your view every 2s. Everything here is in
   SCREEN coordinates so the cannons are always visible (the world is wider
   than the viewport). */
function updateHazards(dt){
  if(Game.freezeHazards || !Game.world || !Game.W) return;
  const p=Game.player, s=gameScale(), W=Game.W, H=Game.H;
  // player's screen-space box
  const psx=(p.x-Game.cam.x)*s + W/2, psy=(p.y-Game.cam.y)*s + H/2, pw=p.w*s, ph=p.h*s;

  for(const g of Game.guns){
    g.sx = g.side==='L' ? 26 : W-26;
    g.sy = H*g.mid + H*g.amp*Math.sin(Game.t*g.omega + g.phase);
    if(Game.t - g.lastFire >= g.fireEvery){
      g.lastFire = Game.t;
      const dir = g.side==='L' ? 1 : -1;
      Game.bullets.push({ x:g.sx + dir*16, y:g.sy, vx:dir*7.0, r:9 });
    }
  }
  const hs=hazardSpeed();
  for(let i=Game.bullets.length-1; i>=0; i--){
    const bl=Game.bullets[i];
    bl.x += bl.vx*hs;
    if(bl.x < -40 || bl.x > W+40){ Game.bullets.splice(i,1); continue; }
    if(isHittable(p) &&
       bl.x+bl.r > psx && bl.x-bl.r < psx+pw &&
       bl.y+bl.r > psy && bl.y-bl.r < psy+ph){
      Game.bullets.length=0;            // clear so you aren't instantly re-hit
      if(absorbWithShield()){ p.invuln=600; break; }
      respawn(); p.invuln=1300; SFX.hit();
      toast('💥 Hit! Back to checkpoint');
      break;
    }
  }
}

/* is a platform currently solid (handles disappearing + bridges) */
function solidNow(pl){
  if(pl.type==='disappear'){
    const d=Game.disappear[pl.id];
    if(d && d.gone) return false;
    return true;
  }
  if(pl.type==='bridge'){
    const until=MP.bridges? MP.bridges[pl.grp] : 0;
    return !!until && until > nowMs();
  }
  if(pl.type==='trapdoor'){
    const t=Game.trap[pl.id];
    return !(t && t.openUntil && Game.t < t.openUntil);  // solid unless flipped open
  }
  if(pl.type==='placed'){ return pl.until > Game.t; }  // pet-placed platform
  if(pl.type==='laser'){ return false; }               // beams aren't solid (they hurt)
  if(pl.type==='coin'){ return false; }                // collectible, not a platform
  if(pl.type==='powerup'){ return false; }             // collectible, not a platform
  if(pl.type==='dbutton'){ return false; }             // disaster button, not a platform
  return true;
}

/* a co-op laser beam is LIVE unless its power button (H*) is being held */
function laserLive(pl){
  const until = MP.bridges ? MP.bridges[pl.grp] : 0;
  return !(until && until > nowMs());
}
/* deadly laser beams: touching a live beam sends you to your checkpoint */
function updateLasers(){
  if(Game.freezeHazards || !Game.world) return;
  const p=Game.player; if(!p || !isHittable(p)) return;
  for(const pl of Game.world.platforms){
    if(pl.type!=='laser' || !laserLive(pl)) continue;
    if(p.x < pl.x+pl.w && p.x+p.w > pl.x && p.y < pl.y+pl.h && p.y+p.h > pl.y){
      if(absorbWithShield()){ p.invuln=600; break; }
      respawn(); p.invuln=1100; SFX.hit();
      if(typeof toast==='function') toast('⚡ Zapped! Back to checkpoint');
      break;
    }
  }
}

/* solid for the LOCAL player — adds Team colour gating on top of solidNow.
   A coloured platform is only solid for the matching-colour player. */
function solidForMe(pl){
  if(!solidNow(pl)) return false;
  if(pl.color && Game.myColorName && pl.color!==Game.myColorName) return false;
  return true;
}

function onStand(p, pl, now){
  // checkpoint
  if((pl.type==='checkpoint') && !Game.hitCheckpoints.has(pl.cpIndex)){
    Game.hitCheckpoints.add(pl.cpIndex);
    p.cp=pl.cpIndex; p.respawnX=pl.x+pl.w/2-p.w/2; p.respawnY=pl.y-p.h;
    Game.coinsThisRun+=5; addCoins(5); SFX.checkpoint();
    gainPetXp(1);
    if(typeof questEvent==='function') questEvent('checkpoints',1);
    if(Game.onCheckpoint)Game.onCheckpoint(pl.cpIndex);
    if(Game.multiplayer) mpSendCheckpoint(pl.cpIndex);
    if(Game.tower){
      // tower floor reached — track your best height + save progress to resume later
      if(pl.cpIndex > (SAVE.towerBest||0)){ SAVE.towerBest=pl.cpIndex; }
      if(!Game.multiplayer && pl.cpIndex > (SAVE.towerFloor||0)){ SAVE.towerFloor=pl.cpIndex; SAVE.towerSeed=Game.seed; }
      persist();
      if(pl.cpIndex>=10) unlockAchievement('tower');
      if(typeof questEvent==='function') questEvent('towerFloor', pl.cpIndex);
      // boss arena cleared!
      if(pl.boss){
        const b=(Game.world.bosses||[]).find(x=>x.floorNo===pl.cpIndex);
        if(b && !b.defeated){ b.defeated=true; Game.bossShots=[]; bossReward(pl.cpIndex); }
        else toast('🏗️ Floor '+pl.cpIndex+'!  +5 🪙');
      } else {
        toast('🏗️ Floor '+pl.cpIndex+'!  +5 🪙');
      }
    } else {
      toast('Checkpoint '+pl.cpIndex+'/'+CHECKPOINTS+'  +5 🪙');
    }
    updateHud();
  } else if(pl.type==='checkpoint'){
    p.respawnX=pl.x+pl.w/2-p.w/2; p.respawnY=pl.y-p.h;
  }
  // NOTE: respawn point only updates at checkpoints (and starts at the bottom).
  // Standing on any other block does NOT save your spot — fall or get shot and
  // you always return to your last checkpoint.

  // disappearing block timer
  if(pl.type==='disappear'){
    const d=Game.disappear[pl.id]||(Game.disappear[pl.id]={});
    if(!d.standSince) d.standSince=now;
    if(!d.gone && now-d.standSince > (pl.crumbleMs||5000)){ d.gone=true; d.goneAt=now; }
  }
  // conveyor: auto-move forward
  if(pl.type==='conveyor'){
    p.x += pl.dir*2.2;
    p.facing=pl.dir;
  }
  // trap-door: standing arms it; updateTrapdoors flips it ~0.85s later
  if(pl.type==='trapdoor'){
    const t=Game.trap[pl.id]||(Game.trap[pl.id]={});
    if(!t.openUntil && t.since==null) t.since=now;
  }
  // ice: mark slippery (movement friction handled in update)
  if(pl.type==='ice'){ p.onIce=true; }
  // wind: a gusty sideways push while you stand in it
  if(pl.type==='wind'){
    const gust = pl.dir * (0.9 + Math.sin(now/200 + pl.x)*0.5);   // ~0.4..1.4 px
    p.x += gust;
  }
  // finish
  if(pl.type==='finish' && !Game.finished){
    levelFinished();
  }
  // co-op pad / lever
  if(pl.type==='pad'){
    const key=pl.grp+':'+pl.pad;
    Game.curPadKey=key;
    setPadReport(pl.grp, pl.pad, true, key);
  }
  // co-op lift: report that we're aboard (both players => it rises)
  if(pl.type==='lift'){
    const key=pl.grp+':LIFT';
    Game.curPadKey=key;
    setPadReport(pl.grp, 'LIFT', true, key);
  }
}

/* track which pad/lever we report as pressed; release when we leave it */
function setPadReport(grp,pad,on,key){
  key = key || (grp+':'+pad);
  const has = !!Game.padReport[key];
  if(on===has) return;
  if(on) Game.padReport[key]={grp,pad}; else delete Game.padReport[key];
  if(Game.multiplayer) mpReportPad(grp,pad,on);
}
function reconcilePads(){
  for(const key in Game.padReport){
    if(key!==Game.curPadKey){
      const {grp,pad}=Game.padReport[key];
      delete Game.padReport[key];
      if(Game.multiplayer) mpReportPad(grp,pad,false);
    }
  }
}

/* award XP to the equipped pet (helps it level up); toast on level-up */
function gainPetXp(amount){
  if(!SAVE.equippedPet || typeof addPetXp!=='function') return;
  const r=addPetXp(SAVE.equippedPet, amount);
  if(r && r.leveledUp){
    const c=creatureById(SAVE.equippedPet);
    if(c && typeof toast==='function') toast('⭐ '+c.name+' reached level '+r.level+'!');
  }
}

/* ---- quick emojis: send + show a bubble over the local player ---- */
function sendEmote(e){
  Game.myEmote=e; Game.myEmoteAt=Game.t;
  if(Game.multiplayer && typeof mpSendEmote==='function') mpSendEmote(e);
  SFX.click();
}

/* ---- carry/boost: fling a teammate who's standing on your head ---- */
function sendBoost(){
  if(typeof mpSendBoost==='function') mpSendBoost();
  if(typeof toast==='function') toast('🙌 Boost!');
  SFX.jump();
}
/* Tag mode: react when the "it" player changes */
function onItChange(id){
  if(id===MP.selfId){
    Game.tagCdUntil=Game.t+2500;              // grace so you can't instantly tag back
    if(Game.colorTag){                        // Colour Tag: the new "it" picks a colour
      if(typeof toast==='function') toast("🌈 You're IT! Tap a colour to call!");
      if(Game.ct){ Game.ct.tagCd=Game.t+2500; Game.ct.color=null; }
      if(typeof refreshColorBar==='function') refreshColorBar();
    } else if(typeof toast==='function') toast("🏃 You're IT! Catch a friend!");
    SFX.hit();
  } else if(typeof toast==='function'){
    const r=MP.remote[id];
    toast((Game.colorTag?'🌈 ':'🏃 ')+((r&&r.name)||'A friend')+' is IT!');
  }
}
/* a hider got caught (announced by the seeker) */
function onCaughtNet(targetId){
  if(!Game.caughtIds) Game.caughtIds=new Set();
  Game.caughtIds.add(targetId);
  if(targetId===MP.selfId && typeof onCaughtMe==='function') onCaughtMe();
}
/* Colour Tag: the "it" called a colour everyone must reach */
function onTagColor(color){
  if(!Game.ct) return;
  const c=(Game.world.colors||[]).find(k=>k.name===color);
  Game.ct.color=color; Game.ct.colorHex=c?c.hex:null; Game.ct.graceUntil=Game.t+4500;
  SFX.checkpoint();
  if(typeof toast==='function') toast('🎨 Get on '+color.toUpperCase()+'!');
  if(typeof refreshColorBar==='function') refreshColorBar();
}

/* visible pet-ability effects: speed = dust puffs, glide = floaty sparkles */
function updateAbilityFx(){
  const p=Game.player; if(!p) return;
  // speed pet: kick up dust when moving fast on the ground
  if(Game.petMoveMul>1 && p.onGround && Math.abs(p.vx)>3 && Game.t%60<17){
    Game.abilityFx.push({kind:'dust', x:p.x+p.w/2 - Math.sign(p.vx)*10, y:p.y+p.h-2, vx:-Math.sign(p.vx)*1.2, vy:-0.6, life:1, born:Game.t});
  }
  // glide pet: trailing sparkles while floating gently down
  if(Game.petFallMul<1 && !p.onGround && p.vy>1 && p.vy<8 && Game.t%80<17){
    Game.abilityFx.push({kind:'spark', x:p.x+p.w/2+(Math.random()*16-8), y:p.y+p.h, vx:0, vy:0.4, life:1, born:Game.t});
  }
  for(let i=Game.abilityFx.length-1;i>=0;i--){
    const f=Game.abilityFx[i]; f.x+=f.vx; f.y+=f.vy; f.life-=0.035;
    if(f.life<=0) Game.abilityFx.splice(i,1);
  }
}
function drawAbilityFx(ctx){
  for(const f of Game.abilityFx){
    ctx.globalAlpha=Math.max(0,f.life)*0.7;
    if(f.kind==='dust'){ ctx.fillStyle='#e8dcc8'; ctx.beginPath(); ctx.arc(f.x,f.y,4*(1.4-f.life)+2,0,6.283); ctx.fill(); }
    else if(f.kind==='star'){ ctx.font='14px serif'; ctx.textAlign='center'; ctx.fillText('🌟', f.x, f.y); }
    else { ctx.font='12px serif'; ctx.textAlign='center'; ctx.fillText('✨', f.x, f.y); }
  }
  ctx.globalAlpha=1;
}
/* Starlight passive: a soft, shimmering rainbow-star halo around the blob */
function drawStarGlow(ctx, cx, cy){
  const t=Game.t/1000, pulse=0.5+Math.sin(t*3)*0.12;
  ctx.save();
  const g=ctx.createRadialGradient(cx,cy,6,cx,cy,34);
  const hue=(t*60)%360;
  g.addColorStop(0, `hsla(${hue},100%,80%,${0.55*pulse})`);
  g.addColorStop(0.6, `hsla(${(hue+60)%360},100%,72%,${0.28*pulse})`);
  g.addColorStop(1, 'hsla(0,0%,100%,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,34,0,6.283); ctx.fill();
  // a few twinkling stars orbiting
  ctx.font='11px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(let i=0;i<3;i++){ const a=t*2+i*2.09, rr=26+Math.sin(t*4+i)*3;
    ctx.globalAlpha=0.7+Math.sin(t*6+i)*0.3;
    ctx.fillText('✨', cx+Math.cos(a)*rr, cy+Math.sin(a)*rr); }
  ctx.restore();
}
/* dropped poop piles (Hyena troll) */
function drawPoops(ctx){
  if(!Game.poops || !Game.poops.length) return;
  ctx.font='22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const g of Game.poops){
    const age=Game.t-g.born, fade=age>11000?Math.max(0,(14000-age)/3000):1;
    ctx.globalAlpha=fade;
    ctx.fillText('💩', g.x+g.w/2, g.y+g.h/2);
  }
  ctx.globalAlpha=1;
}
/* a red "IT" marker over the tagged player in Tag mode */
function drawItMarker(ctx,cx,topY){
  ctx.save();
  ctx.globalAlpha=Math.sin(Game.t/120)*0.2+0.8;
  ctx.fillStyle='#ff5a5a';
  ctx.beginPath(); ctx.arc(cx,topY-30,3,0,6.283); ctx.fill();
  ctx.font='bold 12px Nunito'; ctx.textAlign='center';
  ctx.fillText('🏃 IT', cx, topY-30);
  ctx.restore();
}

/* received a boost from another player — if they're below & under me, hop up */
function onBoostFrom(senderId){
  const p=Game.player; if(!p || !Game.running) return;
  const r=MP.remote[senderId]; if(!r || typeof r.x!=='number') return;
  const myFeet=p.y+p.h, myCx=p.x+p.w/2;
  const theirTop=r.y, theirCx=r.x+17;
  // I'm roughly above them and horizontally close -> they launch me up
  if(Math.abs(myCx-theirCx) < 60 && myFeet <= theirTop+20 && myFeet >= theirTop-70){
    p.vy = -15.5; p.onGround=false; p.squash=-1;
    if(typeof toast==='function') toast('🚀 Lifted up!');
  }
}

/* a Yeti froze me solid */
function onFreezeNet(){
  if(!Game.running) return;
  Game.stunUntil = Math.max(Game.stunUntil||0, Game.t+2500);
  SFX.hit(); if(typeof toast==='function') toast('🧊 Frozen solid!');
}
/* a friend's banana splatted me -> freeze for 3 seconds */
function onStunned(senderId){
  const p=Game.player; if(!p || !Game.running) return;
  Game.stunUntil = Game.t + 3000;
  p.vx=0;
  addShake(5); SFX.hit();
  if(typeof toast==='function') toast('😵 Splatted! Stunned for 3s');
}

/* ---- spectate a friend after you finish a multiplayer race ---- */
function startSpectate(){
  const others=mpRemoteList().filter(r=>typeof r.x==='number');
  if(!others.length){ if(typeof backToLobby==='function') backToLobby(); return; }
  Game.spectating=true;
  Game.spectateId=others[0].id;
  Game.running=true; Game.last=performance.now(); Game.acc=0;
  showScreen('gameScreen');
  document.getElementById('gameScreen').style.background=SAVE.bg;
  if(typeof setSpectateChrome==='function') setSpectateChrome(true);
  cancelAnimationFrame(Game.raf); Game.raf=requestAnimationFrame(gameLoop);
}
function spectateNext(){
  const others=mpRemoteList().filter(r=>typeof r.x==='number');
  if(!others.length) return;
  let i=others.findIndex(r=>r.id===Game.spectateId);
  Game.spectateId=others[(i+1)%others.length].id;
}
function stopSpectate(){
  Game.spectating=false; Game.spectateId=null;
  if(typeof setSpectateChrome==='function') setSpectateChrome(false);
}

function levelFinished(){
  Game.finished=true;
  gainPetXp(4);
  if(typeof questEvent==='function'){ questEvent('finish',1); if(Game.deaths===0) questEvent('deathless',1); }
  // Tag mode: reaching the top while NOT "it" means you escaped
  if(Game.multiplayer && Game.mode==='tag'){
    Game.tagEscaped = (MP.itId !== MP.selfId);
  }
  // race standings: your place = (players who already finished) + 1
  if(Game.multiplayer && Game.mode==='race'){
    Game.racePlace = (typeof mpFinishedCount==='function' ? mpFinishedCount() : 0) + 1;
    if(Game.racePlace===1){ SAVE.raceWins=(SAVE.raceWins||0)+1; unlockAchievement('racewin'); }
    else SAVE.raceLosses=(SAVE.raceLosses||0)+1;
    persist();
  }
  let earned=30; addCoins(30); SFX.win();   // bonus for finishing a level
  if(Game.multiplayer) mpSendFinish();
  const timeMs = Math.max(0, Math.round(Game.t - Game.runStartT));
  const stars = Game.deaths<=1 ? 3 : Game.deaths<=5 ? 2 : 1;
  let newRecord=false;

  // ----- Daily Challenge: one bonus per day + a daily best time -----
  if(Game.daily){
    const k = dailyKey();
    if(!SAVE.daily || SAVE.daily.key!==k) SAVE.daily={key:k, best:0, done:false};
    if(!SAVE.daily.done){ SAVE.daily.done=true; earned+=50; addCoins(50); unlockAchievement('daily'); }
    if(!SAVE.daily.best || timeMs<SAVE.daily.best){ SAVE.daily.best=timeMs; newRecord=true; }
    if(Game.difficulty==='hard') unlockAchievement('hard');
    if(Game.deaths===0) unlockAchievement('flawless');
    persist();
    if(Game.onLevelComplete) Game.onLevelComplete(Game.level, earned, true,
                              {timeMs, stars, newRecord, deaths:Game.deaths, coins:Game.runCoins, daily:true});
    return;
  }

  const isFinal = Game.level>=TOTAL_LEVELS;
  if(Game.level+1 > SAVE.bestLevel){ SAVE.bestLevel=Math.min(TOTAL_LEVELS,Game.level+ (isFinal?0:1)); persist(); }

  // timer, stars (by deaths), best time, achievements (solo only)
  if(!Game.multiplayer){
    const lv=Game.level;
    const prev=SAVE.bestTimes[lv];
    if(prev==null || timeMs<prev){ SAVE.bestTimes[lv]=timeMs; newRecord=true; }
    if((SAVE.starsByLevel[lv]||0) < stars) SAVE.starsByLevel[lv]=stars;
    persist();
    unlockAchievement('first');
    if(Game.deaths===0) unlockAchievement('flawless');
    if(stars===3) unlockAchievement('star3');
    if(Game.difficulty==='hard') unlockAchievement('hard');
    if(isFinal) unlockAchievement('all5');
  }
  if(Game.onLevelComplete) Game.onLevelComplete(Game.level, earned, isFinal,
                            {timeMs, stars, newRecord, deaths:Game.deaths, coins:Game.runCoins});
}

/* Gold Heist: the 45s timer ran out — bank all the loot at once */
function endHeist(){
  Game.finished=true;
  const loot=Game.heistLoot;
  addCoins(loot); SFX.win(); addShake(6);
  if(!Game.multiplayer){                 // playing with friends doesn't burn your daily heist
    const k=dailyKey();
    if(!SAVE.heist || SAVE.heist.key!==k) SAVE.heist={key:k, best:0, done:false};
    SAVE.heist.done=true;
    if(loot>SAVE.heist.best) SAVE.heist.best=loot;
  }
  unlockAchievement('heist');
  persist();
  if(Game.onLevelComplete) Game.onLevelComplete(1, loot, true, {heist:true, loot, coins:Game.runCoins, mp:Game.multiplayer});
}

/* ===== NATURAL DISASTER SURVIVAL ===== */
const DISASTERS = ['lava','meteor','tsunami','zombies','aliens','sandstorm','earthquake'];
const DISASTER_INFO = {
  lava:    {name:'🌋 LAVA RISING', tip:'Get to high ground!'},
  meteor:  {name:'☄️ METEOR SHOWER', tip:'Dodge the meteors!'},
  tsunami: {name:'🌊 TSUNAMI', tip:'The wave roams everywhere — dodge it!'},
  zombies: {name:'🧟 ZOMBIES', tip:"It's tag — don't get caught!"},
  aliens:  {name:'👽 ALIEN INVASION', tip:'Dodge the beams — mash ◀▶ to break free!'},
  sandstorm:{name:'🏜️ SAND STORM', tip:'The sand blurs your sight — keep moving!'},
  earthquake:{name:'🫨 EARTHQUAKE', tip:'The ground is shaking — hold on!'},
};
/* place a built platform at a world position (during disaster mode) */
function placeBuild(wx, wy){
  if(!Game.disaster || !Game.buildMode) return;
  if(Game.builtPlatforms.length>=50){ if(typeof toast==='function') toast('Build limit reached!'); return; }
  const lavaProof=Game.buildLavaProof;
  if(lavaProof){ if(SAVE.coins<20){ if(typeof toast==='function') toast('Need 🪙20 for a lava-proof block'); return; } addCoins(-20); }
  const w=96, h=20;
  const p={id:1e6+Game.builtPlatforms.length, type:'built', x:wx-w/2, y:wy-h/2, w, h, color:Game.buildColor, lavaProof};
  Game.builtPlatforms.push(p); Game.world.platforms.push(p);
  if(Game.multiplayer && typeof mpSendBuild==='function') mpSendBuild(p);   // friends see & can hide under it
  SFX.click();
}
/* a friend built a platform — add it to my world too */
function onBuildNet(d){
  if(!Game.disaster || !Game.world) return;
  const p={id:2e6+Game.builtPlatforms.length, type:'built', x:d.x, y:d.y, w:d.w, h:d.h, color:d.color, lavaProof:d.lavaProof};
  Game.builtPlatforms.push(p); Game.world.platforms.push(p);
}
function disasterStandingProof(){          // true if the player is on a lava-proof block
  const p=Game.player;
  for(const pl of Game.builtPlatforms){ if(!pl.lavaProof) continue;
    if(p.x<pl.x+pl.w && p.x+p.w>pl.x && Math.abs((p.y+p.h)-pl.y)<6) return true; }
  return false;
}
const DISASTER_SEG_MS = 17000;   // how long each disaster lasts before the next one hits
function shuffledDisasters(){
  const a=DISASTERS.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function startDisasterActive(){
  Game.buildMode=false;
  // disasters never stop — they cycle one after another until you press all buttons
  const chosen=Game.disasterType;
  Game.disasterCycle = shuffledDisasters();
  if(chosen && Game.disasterCycle.includes(chosen))   // start with the player's pick
    Game.disasterCycle = [chosen, ...Game.disasterCycle.filter(d=>d!==chosen)];
  Game.disasterIdx = 0;
  Game.disasterType = Game.disasterCycle[0];
  beginDisasterSegment();
  if(Game.multiplayer && MP.isHost && typeof mpSendDisaster==='function') mpSendDisaster(Game.disasterType);
}
function beginDisasterSegment(){
  Game.disasterPhase='active';
  Game.disasterPhaseT = Game.t + DISASTER_SEG_MS;
  const H=Game.world.height, W=Game.world.width, t=Game.disasterType;
  Game.dz={ startT:Game.t, dur:DISASTER_SEG_MS, lavaY:H+40, meteors:[],
    waveBX:W/2, waveBY:200, wtx:W/2, wty:200, wr:140,   // roaming tsunami orb (big)
    zombies:[], aliens:[], beamed:false, levit:0, lastInputDir:0,
    sandX:-180, sandDir:1, lastSpawn:0 };
  if(t==='zombies'){ Game.dz.maxChasers = 2+Math.floor(Math.random()*2);   // only 2-3 ever chase you
    for(let i=0;i<5;i++) Game.dz.zombies.push({x:60+Math.random()*(W-120), y:H-30-34, vx:0, vy:0, w:26, h:34, onGround:false, chase:i<Game.dz.maxChasers, wanderDir:Math.random()<0.5?-1:1, wanderUntil:0}); }
  if(t==='aliens'){   // lots of UFOs prowling near the player, firing tractor beams
    for(let i=0;i<5;i++) Game.dz.aliens.push({ x:120+Math.random()*(W-240), y:0, vx:(Math.random()<0.5?-1:1)*(1.3+Math.random()*1.1), beaming:false, beamT:Game.t+Math.random()*1800, beamUntil:0, beamX:0 }); }
  if(typeof toast==='function') toast(DISASTER_INFO[t].name+' — '+DISASTER_INFO[t].tip);
  SFX.hit(); addShake(6);
}
function nextDisaster(){
  const last=Game.disasterType;
  Game.disasterIdx++;
  if(Game.disasterIdx>=Game.disasterCycle.length){   // looped — reshuffle for variety
    Game.disasterCycle = shuffledDisasters(); Game.disasterIdx=0;
    if(Game.disasterCycle[0]===last && Game.disasterCycle.length>1) Game.disasterCycle.push(Game.disasterCycle.shift());
  }
  Game.disasterType = Game.disasterCycle[Game.disasterIdx];
  beginDisasterSegment();
  if(Game.multiplayer && MP.isHost && typeof mpSendDisaster==='function') mpSendDisaster(Game.disasterType);
}
/* a joiner follows the host's synced disaster */
function onDisasterNet(type){
  if(!Game.disaster || Game.finished) return;
  Game.disasterType=type;
  beginDisasterSegment();     // sets phase='active' + inits the same disaster
}
function disasterHit(knockUp){
  const p=Game.player; if(p.invuln>0) return;
  Game.disasterLives--; p.invuln=1300; SFX.hit(); addShake(7);
  p.vy=knockUp?-12:p.vy; p.vx=(Math.random()<0.5?-1:1)*8;
  if(typeof toast==='function') toast('💥 Hit! ❤️ '+Math.max(0,Game.disasterLives)+' left');
  if(Game.disasterLives<=0) endDisaster(false);
}
const DISASTER_BUTTONS = 20;
function checkDisasterButtons(){
  const p=Game.player;
  for(const c of Game.world.platforms){
    if(c.type!=='dbutton' || c.taken) continue;
    if(p.x<c.x+c.w && p.x+p.w>c.x && p.y<c.y+c.h && p.y+p.h>c.y){
      c.taken=true; Game.disasterButtons++; addCoins(5); SFX.coin();
      if(Game.multiplayer && typeof mpSendButton==='function') mpSendButton(c.bId);   // shared with friends
      if(typeof toast==='function') toast('🔘 Button '+Game.disasterButtons+'/'+DISASTER_BUTTONS+'!  +5🪙');
      if(Game.disasterButtons>=DISASTER_BUTTONS){ if(typeof toast==='function') toast('🎉 All buttons — YOU WIN!'); endDisaster(true); return; }
    }
  }
}
// a friend pressed a button — mark it done for me too (shared progress)
function onButtonNet(bId){
  if(!Game.disaster || !Game.world) return;
  const c=Game.world.platforms.find(p=>p.type==='dbutton' && p.bId===bId);
  if(!c || c.taken) return;
  c.taken=true; Game.disasterButtons++;
  if(typeof toast==='function') toast('🤝 Friend pressed a button! '+Game.disasterButtons+'/'+DISASTER_BUTTONS);
  if(Game.disasterButtons>=DISASTER_BUTTONS && !Game.finished){ endDisaster(true); }
}
function updateDisaster(dt){
  const p=Game.player, W=Game.world.width, H=Game.world.height, dz=Game.dz, t=Game.disasterType;
  checkDisasterButtons();
  const prog=Math.min(1, Math.max(0,(Game.t-(dz.startT!=null?dz.startT:Game.t))/(dz.dur||DISASTER_SEG_MS)));   // 0..1 within this disaster
  const escale=(typeof powerScale==='function')?powerScale():1;   // 🧊 freeze / 🌟 slow hazards
  if(t==='lava'){
    // lava rises slowly and STOPS at the top path platform (roof stays safe above)
    const cap = (Game.world.lavaTopY!=null) ? Game.world.lavaTopY : 220;
    dz.lavaY = Math.max(cap, H+40 - Math.min(1, prog*1.7)*(H-220));
    const inLava = (p.y+p.h) > dz.lavaY && !disasterStandingProof();
    if(inLava && p.invuln<=0) disasterHit(true);
  }
  if(t==='meteor'){
    if(Game.t-dz.lastSpawn>520){ dz.lastSpawn=Game.t; const n=1+Math.floor(prog*2);
      for(let k=0;k<n;k++) dz.meteors.push({x:40+Math.random()*(W-80), y:p.y-520-Math.random()*200, vy:5+Math.random()*3, r:16}); }
    for(let i=dz.meteors.length-1;i>=0;i--){ const m=dz.meteors[i]; m.vy=Math.min(15,m.vy+0.3); m.y+=m.vy*escale;
      if(m.y>p.y+700){ dz.meteors.splice(i,1); continue; }
      // a block you built (above OR beside you) smashes the meteor — it shields you!
      let blocked=false;
      for(const b of Game.builtPlatforms){
        if(m.x+m.r>b.x && m.x-m.r<b.x+b.w && m.y+m.r>b.y && m.y-m.r<b.y+b.h){ blocked=true; break; } }
      if(blocked){ dz.meteors.splice(i,1); addShake(2); SFX.hit();
        for(let k=0;k<4;k++) Game.abilityFx.push({kind:'dust', x:m.x, y:m.y, vx:(Math.random()*2-1)*2, vy:-Math.random()*1.2, life:1, born:Game.t});
        continue; }
      if(p.invuln<=0 && p.x<m.x+m.r && p.x+p.w>m.x-m.r && p.y<m.y+m.r && p.y+p.h>m.y-m.r){ dz.meteors.splice(i,1); disasterHit(true); } }
  }
  if(t==='tsunami'){
    // a roaming wave that prowls all over the screen — top, middle, bottom, side to side
    const s = (typeof gameScale==='function') ? gameScale() : 1;
    const viewW=(Game.W/2)/s, viewH=(Game.H/2)/s;   // half the visible area (world units)
    const sp = 3.0 + prog*3.2;
    const dx = dz.wtx - dz.waveBX, dy = dz.wty - dz.waveBY, d = Math.hypot(dx,dy)||1;
    dz.waveBX += dx/d*Math.min(sp,d)*escale; dz.waveBY += dy/d*Math.min(sp,d)*escale;
    if(d < sp+6){   // reached the target → dart to a new spot, kept close to the player
      const px=p.x+p.w/2, py=p.y+p.h/2;
      dz.wtx = Math.max(70, Math.min(W-70, px + (Math.random()*2-1)*Math.min(viewW*0.5, 360)));
      dz.wty = Math.max(70, Math.min(H-30, py + (Math.random()*2-1)*Math.min(viewH*0.5, 320)));
    }
    const cx=p.x+p.w/2, cy=p.y+p.h/2;
    if(p.invuln<=0 && Math.hypot(cx-dz.waveBX, cy-dz.waveBY) < dz.wr){
      disasterHit(true); p.vx=(cx>dz.waveBX?1:-1)*12; p.vy=-10;
    }
  }
  if(t==='zombies'){
    const maxCh=dz.maxChasers||3;
    if(Game.t-dz.lastSpawn>2200 && dz.zombies.length<12){ dz.lastSpawn=Game.t;
      const chasers=dz.zombies.filter(z=>z.chase).length;
      dz.zombies.push({x:Math.random()<0.5?40:W-40, y:H-30-34, vx:0, vy:0, w:26, h:34, onGround:false, chase:chasers<maxCh, wanderDir:Math.random()<0.5?-1:1, wanderUntil:0}); }
    // tag-pace: chasers stay right on your heels but a little slower than your run (4.8),
    // so you can shake them with good movement & jumps
    const ZSPEED=(3.5+prog*0.7)*escale;   // frozen/slowed by Yeti/Starlight powers
    for(const z of dz.zombies){
      if(escale===0 || Game.t < (z.frozenUntil||0)){ z.vx=0; continue; }   // 🧊 frozen (Yeti power or 💩 poop)
      let dir;
      if(z.chase){
        // not a perfect mirror — they react with a delay and sometimes guess wrong / juke
        if(z.aimUntil==null || Game.t>z.aimUntil){
          z.aim=(p.x>z.x+z.w/2)?1:-1;
          if(Math.random()<0.22) z.aim*=-1;          // mis-step, lets you slip past
          z.aimUntil=Game.t+280+Math.random()*360;   // reaction lag before re-aiming
        }
        dir=z.aim;
      }
      else {       // wanderers shuffle around in random directions
        if(z.x<=10) z.wanderDir=1; else if(z.x>=W-10-z.w) z.wanderDir=-1;
        else if(Game.t>z.wanderUntil){ z.wanderDir=Math.random()<0.5?-1:1; z.wanderUntil=Game.t+700+Math.random()*1400; }
        dir=z.wanderDir;
      }
      z.vx=dir*ZSPEED*(z.chase?1:0.75);
      if(z.onGround){
        if(z.chase && p.y < z.y-24) { z.vy=-12.5; z.onGround=false; }      // chasers climb toward you
        else if(!z.chase && Math.random()<0.012){ z.vy=-11; z.onGround=false; }   // wanderers hop now & then
      }
      z.vy=Math.min(16, z.vy+0.7);
      z.x=Math.max(8, Math.min(W-8-z.w, z.x+z.vx));
      const prevBottom=z.y+z.h; z.y+=z.vy; const newBottom=z.y+z.h;
      z.onGround=false;
      if(z.vy>=0){ for(const pl of Game.world.platforms){ if(pl.type==='dbutton' || !solidNow(pl)) continue;
        if(z.x < pl.x+pl.w && z.x+z.w > pl.x && prevBottom<=pl.y+2 && newBottom>=pl.y){ z.y=pl.y-z.h; z.vy=0; z.onGround=true; break; } } }
      if(p.invuln<=0 && rectsOverlap(p.x,p.y,p.w,p.h, z.x,z.y,z.w,z.h)) disasterHit(false);
    }
  }
  if(t==='aliens'){
    const A=dz.aliens, topY=Game.cam.y - (Game.H/(2*((typeof gameScale==='function')?gameScale():1))) + 70;
    // spawn more aliens over time — it gets crowded (hard!)
    if(A.length<9 && Game.t-dz.lastSpawn>2600){ dz.lastSpawn=Game.t;
      A.push({x:80+Math.random()*(W-160), y:topY, vx:(Math.random()<0.5?-1:1)*(1.5+Math.random()*1.4), beaming:false, beamT:Game.t+400, beamUntil:0, beamX:0}); }
    for(const a of A){
      a.y += (topY - a.y)*0.08;                     // hover near the top of the screen
      if(!dz.beamed){ a.x += a.vx*escale;
        if(a.x<70){a.x=70;a.vx=Math.abs(a.vx);} if(a.x>W-70){a.x=W-70;a.vx=-Math.abs(a.vx);} }
      if(!a.beaming && Game.t>a.beamT && escale>0){ a.beaming=true; a.beamX=a.x; a.beamUntil=Game.t+2400; }
      if(a.beaming && Game.t>a.beamUntil){ a.beaming=false; a.beamT=Game.t+1200+Math.random()*2200; }
    }
    if(!dz.beamed){
      if(p.invuln<=0) for(const a of A){ if(!a.beaming) continue;
        if(Math.abs((p.x+p.w/2)-a.beamX)<32 && (p.y+p.h)>a.y){ dz.beamed=true; dz.beamAlien=a; dz.levit=0; dz.lastInputDir=0;
          if(typeof toast==='function') toast('🛸 Caught in a beam — mash ◀▶ to break free!'); SFX.hit(); break; } }
    } else {
      // levitating up toward the UFO — mash left/right to struggle down
      const dir = (typeof readInput==='function') ? readInput() : 0;
      if(dir!==0 && dz.lastInputDir!==0 && Math.sign(dir)!==Math.sign(dz.lastInputDir)) dz.levit -= 0.07;  // a mash!
      if(dir!==0) dz.lastInputDir=Math.sign(dir);
      dz.levit += 0.006;                             // steady pull upward
      // friend rescue: a friend who touches you knocks you free
      if(Game.multiplayer){
        for(const r of mpRemoteList()){ if(typeof r.x!=='number') continue;
          if(rectsOverlap(p.x-6,p.y-6,p.w+12,p.h+12, r.x,r.y,34,34)){ dz.beamed=false; p.vy=7;
            if(typeof toast==='function') toast('🤝 A friend knocked you free!'); break; } }
      }
      if(dz.levit<=0){ dz.beamed=false; p.vy=8; if(typeof toast==='function') toast('🛸 Broke free!'); }
      else if(dz.levit>=1){ dz.beamed=false; dz.levit=0;
        if(Game.multiplayer && typeof mpSendAbduct==='function') mpSendAbduct();   // pull my friends in too
        abductToShip();
        if(typeof toast==='function') toast(Game.multiplayer?'👽 Beamed into the ship — a friend must tap you to escape!':'👽 Beamed into the ship — sneak to the back door!'); }
    }
  }
  if(t==='sandstorm'){
    const sp=(3.6+prog*3)*escale;
    dz.sandX += dz.sandDir*sp;
    if(dz.sandX>W+170) dz.sandDir=-1; else if(dz.sandX<-170) dz.sandDir=1;
    if(Math.abs((p.x+p.w/2)-dz.sandX) < 100){ Game.blurUntil = Game.t + 3000;   // sight goes blurry for 3s
      if(!dz._sandToast || Game.t-dz._sandToast>2500){ dz._sandToast=Game.t; if(typeof toast==='function') toast('🌫️ Sand in your eyes!'); } }
  }
  if(t==='earthquake' && escale>0){
    addShake(8 + prog*6);                        // the whole world violently rumbles
    // constant tremor: the ground you stand on keeps sliding you around
    if(p.onGround){ dz.quakeDir = dz.quakeDir||1;
      if(Math.random()<0.04) dz.quakeDir*=-1;
      p.vx += dz.quakeDir*(1.2+prog*1.4); }       // steady drift toward the edges
    // hard jolts buck you right off your footing
    if(Game.t-dz.lastSpawn > Math.max(150, 460-prog*300)){ dz.lastSpawn=Game.t;
      p.vx += (Math.random()<0.5?-1:1)*(10+prog*7);
      p.vy = -6 - prog*2; p.onGround=false;        // the platform throws you up & off
      addShake(6); SFX.hit();
    }
  }
}
/* ---- Alien ship interior: sneak to the back door without being spotted ---- */
function abductToShip(){
  if(Game.dz){ Game.dz.beamed=false; Game.dz.levit=0; }
  const W=Game.W, H=Game.H, floorY=Math.round(H*0.82);
  const plats=[
    {x:Math.round(W*0.26), y:Math.round(H*0.60), w:120, h:16},
    {x:Math.round(W*0.48), y:Math.round(H*0.48), w:120, h:16},
    {x:Math.round(W*0.66), y:Math.round(H*0.62), w:130, h:16},
  ];
  const aliens=[];
  for(let i=0;i<5;i++) aliens.push({ x:150+Math.random()*(W-360), y:floorY-34, w:30, h:34,
      vx:(Math.random()<0.5?-1:1)*(1.4+Math.random()*1.1), face:1, alert:0 });
  Game.ship={ p:{x:50, y:floorY-34, w:30, h:34, vx:0, vy:0, onGround:false, facing:1},
    floorY, plats, aliens, doorX:W-64, spotted:false, hitCd:0, coop:!!Game.multiplayer, netT:0 };
  const bb=document.getElementById('buildBar'); if(bb) bb.style.display='none';
  SFX.hit(); addShake(6);
}
/* a friend was abducted (multiplayer): I get sucked into the same ship too */
function onAbductNet(){
  if(Game.ship || !Game.disaster || Game.finished) return;
  if(Game.dz){ Game.dz.beamed=false; Game.dz.levit=0; }
  abductToShip();
  if(typeof toast==='function') toast('👽 Your friend was abducted — you got pulled in too! Find each other & tap to escape!');
}
/* a friend tapped someone in the ship — we all break out together */
function onShipFreeNet(){ if(Game.ship) escapeShip(); }
/* tap a trapped friend inside the ship to free BOTH of you */
function shipTap(screenX, screenY){
  const s=Game.ship; if(!s) return;
  // in a co-op ship the tap coords are already in overlay/screen space (no camera)
  let hit=false;
  if(Game.multiplayer){
    for(const r of mpRemoteList()){ if(!r.inShip || typeof r.shipX!=='number') continue;
      if(Math.hypot((r.shipX+15)-screenX,(r.shipY+17)-screenY)<48){ hit=true; break; } }
  }
  if(hit){
    if(typeof mpSendShipFree==='function') mpSendShipFree();
    if(typeof toast==='function') toast('🤝 You tapped your friend — escaping together!');
    escapeShip();
  } else if(s.coop && typeof toast==='function'){
    toast('👽 Tap right on your friend to free you both!');
  }
}
function updateShip(dt){
  const s=Game.ship, p=s.p, W=Game.W;
  // co-op: broadcast my position inside the ship so friends can see & tap me
  if(Game.multiplayer && typeof mpSendPos==='function'){
    s.netT=(s.netT||0)+dt;
    if(s.netT>0.06){ s.netT=0; mpSendPos({inShip:true, shipX:Math.round(p.x), shipY:Math.round(p.y), name:SAVE.name, skin:SAVE.skin, finished:false}); }
  }
  const dir=(typeof readInput==='function')?readInput():0;
  const MOVE=4.6, GRAV=0.9;
  p.vx += (dir*MOVE - p.vx)*0.35;
  if(dir>0.1)p.facing=1; else if(dir<-0.1)p.facing=-1;
  if(Game.input.jump && p.onGround){ p.vy=-14; p.onGround=false; SFX.jump(); }
  Game.input.jump=false;
  p.vy+=GRAV; if(p.vy>18)p.vy=18;
  p.x=Math.max(10, Math.min(W-10-p.w, p.x+p.vx));
  const prevB=p.y+p.h; p.y+=p.vy; const newB=p.y+p.h; p.onGround=false;
  if(newB>=s.floorY){ p.y=s.floorY-p.h; p.vy=0; p.onGround=true; }
  if(p.vy>=0) for(const pl of s.plats){ if(p.x<pl.x+pl.w && p.x+p.w>pl.x && prevB<=pl.y+2 && newB>=pl.y){ p.y=pl.y-p.h; p.vy=0; p.onGround=true; } }
  s.spotted=false;
  for(const a of s.aliens){
    const inFront = Math.sign((p.x+p.w/2)-(a.x+a.w/2))===a.face;
    const dist = Math.abs((p.x+p.w/2)-(a.x+a.w/2));
    const sameLevel = Math.abs((p.y+p.h)-(a.y+a.h))<48;
    if(inFront && dist<150 && sameLevel) a.alert=Math.min(1,a.alert+0.06); else a.alert=Math.max(0,a.alert-0.02);
    if(a.alert>=1){ s.spotted=true; a.vx=Math.sign((p.x)-(a.x))*2.4; }   // chase!
    a.x += a.vx;
    if(a.x<40){a.x=40;a.vx=Math.abs(a.vx);} if(a.x>W-40-a.w){a.x=W-40-a.w;a.vx=-Math.abs(a.vx);}
    a.face = a.vx>0?1:-1;
    if(Game.t>s.hitCd && Math.abs((p.x+p.w/2)-(a.x+a.w/2))<26 && Math.abs((p.y+p.h/2)-(a.y+a.h/2))<32){
      s.hitCd=Game.t+1200; Game.disasterLives=Math.max(0,Game.disasterLives-0.5); SFX.hit(); addShake(5);
      p.x=50; p.y=s.floorY-p.h; p.vx=0;
      if(typeof toast==='function') toast('👽 Caught! ❤️ '+Math.max(0,Game.disasterLives)+' — back to the start');
      if(Game.disasterLives<=0){ Game.ship=null; endDisaster(false); return; }
    }
  }
  if(Math.abs((p.x+p.w/2)-s.doorX)<38 && (p.y+p.h)>=s.floorY-4) escapeShip();
}
function escapeShip(){
  Game.ship=null;
  const bb=document.getElementById('buildBar'); if(bb && Game.disaster) bb.style.display='flex';
  const p=Game.player; if(p){ p.invuln=1500; p.vy=6; }
  if(Game.multiplayer && typeof mpSendPos==='function') mpSendPos({inShip:false, x:Math.round(p?p.x:0), y:Math.round(p?p.y:0)});  // clear my ship marker
  if(typeof toast==='function') toast('🚪 Escaped the ship! Dropped back down.');
  SFX.win();
}
function drawShipOverlay(ctx){
  const s=Game.ship, W=Game.W, H=Game.H;
  ctx.fillStyle='rgba(18,24,46,.94)'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(120,160,255,.12)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=48){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<H;y+=48){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.fillStyle='#2a3560'; ctx.fillRect(0, s.floorY, W, H-s.floorY);
  ctx.fillStyle='#3a4a80'; ctx.fillRect(0, s.floorY, W, 6);
  for(const pl of s.plats){ ctx.fillStyle='#3a4a80'; roundRect(ctx,pl.x,pl.y,pl.w,pl.h,6); ctx.fill(); }
  ctx.fillStyle='#0d1830'; roundRect(ctx, s.doorX-26, s.floorY-72, 52, 72, 8); ctx.fill();
  ctx.fillStyle='rgba(120,255,170,'+(0.45+0.4*Math.abs(Math.sin(Game.t/250)))+')'; roundRect(ctx, s.doorX-20, s.floorY-64, 40, 60, 6); ctx.fill();
  ctx.font='24px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🚪', s.doorX, s.floorY-34);
  ctx.font='30px serif';
  for(const a of s.aliens){
    if(a.alert>0.05){ ctx.fillStyle='rgba(255,'+(a.alert>=1?60:210)+',80,'+(0.05+a.alert*0.13)+')';
      ctx.beginPath(); ctx.moveTo(a.x+a.w/2, a.y+8);
      ctx.lineTo(a.x+a.w/2+a.face*155, a.y-28); ctx.lineTo(a.x+a.w/2+a.face*155, a.y+a.h+28); ctx.closePath(); ctx.fill(); }
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(a.alert>=1?'😡':'👽', a.x+a.w/2, a.y+a.h/2);
  }
  // co-op: draw trapped friends + a "tap me!" prompt so you can free each other
  let friendInShip=false;
  if(Game.multiplayer){
    ctx.textAlign='center'; ctx.textBaseline='middle';
    for(const r of mpRemoteList()){ if(!r.inShip || typeof r.shipX!=='number') continue;
      friendInShip=true;
      ctx.font='28px serif'; ctx.fillText('🧑‍🚀', r.shipX+15, r.shipY+17);
      ctx.font='16px serif'; ctx.fillText('🆘', r.shipX+15, r.shipY-14);
      ctx.fillStyle='#ffe08a'; ctx.font='bold 12px Nunito'; ctx.fillText('tap me!', r.shipX+15, r.shipY-28);
    }
  }
  ctx.font='28px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🧑‍🚀', s.p.x+s.p.w/2, s.p.y+s.p.h/2);
  ctx.fillStyle='#dfeaff'; ctx.font='bold 17px Nunito'; ctx.textAlign='left';
  const tip = s.coop ? (friendInShip?'🤝 Tap your friend to escape together!':'🛸 Reach the 🚪 door — or tap a trapped friend!') : '🛸 Sneak to the 🚪 back door!';
  ctx.fillText(tip+'   ❤️ '+Math.max(0,Game.disasterLives), 14, 28);
  if(s.spotted){ ctx.fillStyle='rgba(255,70,70,.95)'; ctx.textAlign='center'; ctx.font='bold 20px Nunito'; ctx.fillText('❗ SPOTTED — RUN!', W/2, 30); }
}

function endDisaster(survived){
  if(Game.disasterPhase==='over') return;
  Game.disasterPhase='over'; Game.finished=true;
  const reward = Game.disasterButtons*5 + (survived?40:0);
  if(survived) SFX.win(); else SFX.hit();
  if(Game.multiplayer) mpSendFinish();
  if(Game.onLevelComplete) Game.onLevelComplete(1, reward, true,
    {disaster:true, survived, buttons:Game.disasterButtons, type:Game.disasterType});
}
/* world->screen helpers for build taps */
function disasterBuildAt(screenX, screenY){
  if(!Game.disaster || !Game.buildMode) return;
  const s=gameScale();
  const wx=(screenX-Game.W/2)/s + Game.cam.x;
  const wy=(screenY-Game.H/2)/s + Game.cam.y;
  placeBuild(wx, wy);
}
function drawDisaster(ctx){
  const W=Game.world.width, H=Game.world.height, dz=Game.dz, t=Game.disasterType;
  // build ghost grid hint during build phase
  if(Game.buildMode){ ctx.globalAlpha=0.25; ctx.fillStyle=Game.buildColor;
    ctx.fillText('',0,0); ctx.globalAlpha=1; }
  if(!dz) return;
  if(t==='lava' && dz.lavaY<H+40){
    ctx.fillStyle='#ff5a2a'; ctx.fillRect(-200, dz.lavaY, W+400, H+400);
    ctx.fillStyle='rgba(255,200,80,.6)'; ctx.fillRect(-200, dz.lavaY-6, W+400, 6);
  }
  if(t==='meteor'){ ctx.textAlign='center'; ctx.textBaseline='middle';
    for(const m of dz.meteors){ ctx.font=`${m.r*2}px serif`; ctx.fillText('☄️', m.x, m.y); } }
  if(t==='tsunami'){
    const r=dz.wr||88;
    const grd=ctx.createRadialGradient(dz.waveBX, dz.waveBY, r*0.25, dz.waveBX, dz.waveBY, r);
    grd.addColorStop(0,'rgba(150,215,255,.75)'); grd.addColorStop(1,'rgba(30,110,225,.55)');
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(dz.waveBX, dz.waveBY, r, 0, Math.PI*2); ctx.fill();
    ctx.font='66px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🌊', dz.waveBX, dz.waveBY); }
  if(t==='zombies'){ ctx.font='34px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const frozen = Game.t < (Game.freezeEnemiesUntil||0);
    for(const z of dz.zombies){
      const flashing = z.flash && Game.t-z.flash<160;
      ctx.fillText(flashing?'💥':(frozen?'🧊':'🧟'), z.x+z.w/2, z.y+z.h/2);
    } }
  if(t==='aliens' && dz.aliens){
    const p=Game.player, bottom=Game.world.height+200;
    for(const a of dz.aliens){
      if(a.beaming){   // tractor beam column
        const grd=ctx.createLinearGradient(0,a.y,0,bottom);
        grd.addColorStop(0,'rgba(140,255,170,.5)'); grd.addColorStop(1,'rgba(140,255,170,0)');
        ctx.fillStyle=grd; ctx.beginPath();
        ctx.moveTo(a.beamX-14, a.y); ctx.lineTo(a.beamX+14, a.y);
        ctx.lineTo(a.beamX+44, bottom); ctx.lineTo(a.beamX-44, bottom); ctx.closePath(); ctx.fill();
      }
      ctx.font='48px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🛸', a.x, a.y);
    }
    if(dz.beamed){   // struggle meter above the player
      ctx.fillStyle='rgba(0,0,0,.35)'; roundRect(ctx, p.x-6, p.y-16, p.w+12, 7, 3); ctx.fill();
      ctx.fillStyle='#8cffaa'; roundRect(ctx, p.x-6, p.y-16, (p.w+12)*Math.max(0,Math.min(1,dz.levit)), 7, 3); ctx.fill();
    }
  }
  if(t==='sandstorm'){
    ctx.fillStyle='rgba(224,196,140,.42)';
    ctx.fillRect(dz.sandX-100, Game.cam.y-500, 200, 1200);
    ctx.font='42px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    for(let i=0;i<7;i++){ const yy=Game.cam.y-260+i*80+Math.sin(Game.t/300+i)*22;
      ctx.fillText('🌫️', dz.sandX+Math.sin(Game.t/220+i*1.3)*40, yy); }
  }
}

/* ===================== HIDE & SEEK / ROOM TAG ===================== */
function initRoom(){
  const W=Game.world.width, H=Game.world.height, floorTop=H-44;
  const tagger = Game.soloRole==='tagger';
  Game.ai={ x: tagger?160:W-90, y:floorTop-34, vx:0, vy:0, w:34, h:34, facing: tagger?1:-1,
            onGround:false, speed:3.6, tx:W-90, ty:null, jumpCdUntil:0, _stuck:0,
            _wanderT:0, state:'search', lostT:0 };
  if(Game.roomMode==='hideseek'){
    Game.rm={ phase:'hide', hideEndT:Game.t+20000, endT:Game.t+20000+120000,
              disguise:null, suspicion:0, caught:false };
    if(tagger){
      const kinds=Game.world.camoKinds||[];
      Game.ai.disg = kinds[Math.floor(Math.random()*kinds.length)];   // the bot hides as furniture
      Game.ai.x = 220+Math.random()*(W-440);
      if(typeof toast==='function') toast('🙈 Eyes closed! The bot is hiding — find it after 20s!');
    } else if(typeof toast==='function') toast('🙈 HIDE! Pick a disguise at the bottom — 20s!');
  } else {
    Game.rm={ phase:'run', endT:Game.t + (tagger?60000:90000), caught:false };
    Game.ai.speed=3.9; Game.ai.state = tagger?'flee':'chase';
    if(typeof toast==='function') toast(tagger ? '🏃 Chase the bot — tag it before time runs out!'
                                              : "🏃 RUN! Don't get tagged — parkour on the furniture!");
  }
  if(typeof refreshCamoBar==='function') refreshCamoBar();
}
function setDisguise(kind){
  if(!Game.room || Game.roomMode!=='hideseek' || !Game.rm || Game.rm.phase!=='hide') return;
  const f=(Game.world.camoKinds||[]).find(k=>k.kind===kind); if(!f) return;
  Game.rm.disguise={kind:f.kind, emoji:f.emoji}; SFX.click();
  if(typeof toast==='function') toast('🫥 Disguised as '+f.emoji+'! Stay still to blend in.');
  if(typeof refreshCamoBar==='function') refreshCamoBar();
}
// move the AI agent toward (tx,ty) with gravity + one-way landing (like the player)
function stepAgent(a){
  const GRAV=0.86, MAXFALL=18;
  const sc=(typeof powerScale==='function')?powerScale():1;
  if(sc===0 || Game.t < (a.frozenUntil||0)){ a.frozen=true; return; }   // 🧊 frozen (Yeti power or 💩 poop)
  a.frozen=false; a.speedScale=sc;
  const dx = (a.tx!=null?a.tx:a.x) - (a.x+a.w/2);
  const desired = Math.abs(dx)<6 ? 0 : (dx>0?1:-1);
  if(desired) a.facing=desired;
  a.vx += (desired*a.speed - a.vx)*0.28;
  if(desired!==0 && Math.abs(a.vx)<1.1 && a.onGround) a._stuck++; else if(a.onGround) a._stuck=Math.max(0,a._stuck-1);
  if(a.onGround){
    const wantUp = (a.ty!=null && a.ty < a.y-26);
    if((wantUp || a._stuck>6) && Game.t>a.jumpCdUntil){ a.vy=-13.4; a.onGround=false; a.jumpCdUntil=Game.t+420; a._stuck=0; }
  }
  a.vy+=GRAV; if(a.vy>MAXFALL)a.vy=MAXFALL;
  a.x+=a.vx*sc; if(a.x<0)a.x=0; if(a.x+a.w>Game.world.width)a.x=Game.world.width-a.w;
  const prevB=a.y+a.h; a.y+=a.vy*sc; const newB=a.y+a.h;
  a.onGround=false;
  if(a.vy>=0){ let bestTop=Infinity, on=null;
    for(const pl of Game.world.platforms){ if(!solidNow(pl)||pl.type==='coin'||pl.type==='powerup') continue;
      if(a.x<pl.x+pl.w && a.x+a.w>pl.x){ const top=pl.y;
        if(prevB<=top+2 && newB>=top && top<bestTop){ bestTop=top; on=pl; } } }
    if(on){ a.y=bestTop-a.h; if(on.type==='bouncy'){ a.vy=-14; a.onGround=false; } else { a.vy=0; a.onGround=true; } }
  }
}
function updateRoom(dt){
  const p=Game.player, a=Game.ai, rm=Game.rm; if(!a||!rm) return;
  const dist=Math.hypot((p.x+p.w/2)-(a.x+a.w/2), (p.y+p.h/2)-(a.y+a.h/2));
  const pMoving = Math.abs(p.vx)>0.5;

  // ---- YOU are the tagger/seeker; the BOT runs/hides ----
  if(Game.soloRole==='tagger'){
    if(Game.roomMode==='hideseek'){
      if(rm.phase==='hide'){ Game.moveLock=true;
        if(Game.t>=rm.hideEndT){ rm.phase='seek'; Game.moveLock=false;
          if(typeof toast==='function') toast('🔦 GO! Find the hidden bot!'); }
        return; }
      // bot stays mostly still (blending in), shuffles occasionally
      if(Game.t>a._wanderT){ a._wanderT=Game.t+2200+Math.random()*2600;
        a.tx = Math.random()<0.5 ? a.x : 120+Math.random()*(Game.world.width-240); }
      a.ty=null; stepAgent(a);
      if(dist<34){ return endRoom(true); }              // you found & tagged it!
      if(Game.t>=rm.endT) return endRoom(false);        // ran out of time
    } else {
      // ROOM TAG: bot flees, you chase
      const away = (a.x < p.x) ? -1 : 1;
      a.tx = Math.max(60, Math.min(Game.world.width-60, a.x + away*340));
      a.ty = (p.y < a.y-30) ? a.y-120 : null;           // hop up if you're above it
      stepAgent(a);
      if(dist<32){ return endRoom(true); }              // tagged the bot — you win!
      if(Game.t>=rm.endT) return endRoom(false);        // it got away
    }
    return;
  }

  if(Game.roomMode==='hideseek'){
    if(rm.phase==='hide'){
      if(Game.t>=rm.hideEndT){ rm.phase='seek'; a.state='search'; a.tx=p.x;
        if(typeof toast==='function') toast('🔦 The seeker is looking — RUN & re-hide!');
        if(typeof refreshCamoBar==='function') refreshCamoBar(); }
      return;   // seeker frozen while you hide
    }
    const facingYou = Math.sign((p.x+p.w/2)-(a.x+a.w/2))===a.facing;
    const visible = dist<360 && facingYou;
    const disguised = !!rm.disguise;
    if(a.state==='search'){
      if(visible && (pMoving || !disguised)) rm.suspicion += pMoving?3.2:1.6;
      else rm.suspicion = Math.max(0, rm.suspicion-1.4);
      if(disguised && !pMoving && dist<42 && facingYou && Math.random()<0.02) rm.suspicion=120;  // inspected!
      if(rm.suspicion>=100){ a.state='chase'; rm.suspicion=100; SFX.hit();
        if(typeof toast==='function') toast('👀 Spotted! RUN!'); }
      else {
        if(Game.t>a._wanderT || Math.abs(a.tx-(a.x+a.w/2))<30){
          a._wanderT=Game.t+1200+Math.random()*1400;
          a.tx=120+Math.random()*(Game.world.width-240);
        }
        a.ty=null;
      }
    }
    if(a.state==='chase'){
      a.tx=p.x+p.w/2; a.ty=p.y;
      if(dist<34){ rm.caught=true; return endRoom(false); }
      if(dist>470 && disguised && !pMoving){ a.lostT+=dt*1000;
        if(a.lostT>2200){ a.state='search'; rm.suspicion=0; a.lostT=0;
          if(typeof toast==='function') toast('🫥 You lost the seeker!'); } }
      else a.lostT=0;
    }
    stepAgent(a);
    if(Game.t>=rm.endT) return endRoom(true);
  } else {
    a.tx=p.x+p.w/2; a.ty=p.y; a.state='chase';
    stepAgent(a);
    if(dist<32 && p.invuln<=0){ rm.caught=true; return endRoom(false); }
    if(Game.t>=rm.endT) return endRoom(true);
  }
}
function endRoom(survived){
  if(Game.finished) return;
  Game.finished=true; Game.running=false;
  if(survived) SFX.win(); else SFX.hit();
  const reward = survived?60:10;
  addCoins(reward);
  if(Game.onLevelComplete) Game.onLevelComplete(1, reward, true,
    {room:true, roomMode:Game.roomMode, survived, role:Game.soloRole});
}
function drawFire(ctx){
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const f of Game.fire){ if(Game.t<f.born) continue;
    ctx.font=`${Math.round(f.r*2.2)}px serif`; ctx.fillText('🔥', f.x, f.y); }
}
function drawFurni(ctx, pl){
  // ground shadow
  ctx.fillStyle='rgba(120,90,150,.14)';
  ctx.beginPath(); ctx.ellipse(pl.x+pl.w/2, pl.y+pl.h-1, pl.w*0.46, 7, 0,0,Math.PI*2); ctx.fill();
  if(pl.type==='bouncy'){
    ctx.fillStyle='#3fcf86'; roundRect(ctx,pl.x,pl.y,pl.w,pl.h,12); ctx.fill();
    ctx.fillStyle='#b6f5c8'; roundRect(ctx,pl.x,pl.y,pl.w,6,12); ctx.fill();
    return;
  }
  // a soft pedestal so the standable top edge reads clearly
  ctx.fillStyle='rgba(255,255,255,.5)';
  roundRect(ctx, pl.x, pl.y, pl.w, pl.h, 10); ctx.fill();
  ctx.fillStyle='rgba(155,123,232,.55)';
  roundRect(ctx, pl.x, pl.y, pl.w, 6, 6); ctx.fill();
  // the furniture itself
  ctx.font=`${Math.round(pl.h*1.02)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(pl.emoji||'📦', pl.x+pl.w/2, pl.y+pl.h/2);
}
function drawRoomAgent(ctx){
  const a=Game.ai; if(!a) return;
  // Hide & Seek where YOU seek: the bot is disguised as furniture (hidden during the 20s)
  if(Game.roomMode==='hideseek' && Game.soloRole==='tagger'){
    if(Game.rm && Game.rm.phase==='hide') return;       // can't see it while it hides
    if(a.disg){ ctx.font='51px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(a.disg.emoji, a.x+a.w/2, a.y+a.h/2); return; }
  }
  const cx=a.x+a.w/2, cy=a.y+a.h/2;
  ctx.fillStyle='rgba(120,90,150,.16)'; ctx.beginPath(); ctx.ellipse(cx, a.y+a.h, 18,6,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ff7a5c'; ctx.beginPath(); ctx.arc(cx,cy,17,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(cx-5*a.facing,cy-3,3.4,0,6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+6*a.facing,cy-3,3.4,0,6.3); ctx.fill();
  ctx.fillStyle='#3a2a40';
  ctx.beginPath(); ctx.arc(cx-5*a.facing,cy-3,1.7,0,6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+6*a.facing,cy-3,1.7,0,6.3); ctx.fill();
  const rm=Game.rm;
  const mark = Game.colorTag ? '🌈' : Game.roomMode==='tag' ? '😈' : (rm&&rm.phase==='hide'?'🙈':(a.state==='chase'?'❗':'🔦'));
  ctx.font='20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(mark, cx, a.y-14);
}

/* ---------- Multiplayer Hide & Seek / Room Tag (real players) ---------- */
function initRoomMP(){
  Game.rm={ phase:(Game.roomMode==='hideseek'?'hide':'run'),
            hideEndT:Game.t+20000,
            endT:Game.t + (Game.roomMode==='hideseek' ? 20000+120000 : 120000) };
  Game.myDisguise=null; Game.caughtIds=new Set(); Game.moveLock=false;
  if(Game.roomMode==='hideseek'){
    if(MP.isHost) setTimeout(()=>mpSendIt(MP.selfId), 500);   // host = the seeker
    if(typeof refreshCamoBar==='function') refreshCamoBar();
    if(typeof toast==='function') toast('🙈 Hide & Seek! The seeker covers its eyes for 20s — hide & disguise!');
  } else {
    if(MP.isHost) setTimeout(()=>mpSendIt(MP.selfId), 500);
    if(typeof toast==='function') toast('🏃 Room Tag! Whoever is IT chases — touch a friend to pass it on!');
  }
}
function setDisguiseMP(kind){
  const f=(Game.world.camoKinds||[]).find(k=>k.kind===kind); if(!f) return;
  Game.myDisguise={kind:f.kind, emoji:f.emoji}; SFX.click();
  if(typeof refreshCamoBar==='function') refreshCamoBar();
}
function updateRoomMP(dt){
  const p=Game.player, rm=Game.rm; if(!rm) return;
  const amIt = MP.itId===MP.selfId;
  if(Game.roomMode==='hideseek'){
    if(rm.phase==='hide' && Game.t>=rm.hideEndT){ rm.phase='seek';
      if(typeof refreshCamoBar==='function') refreshCamoBar();
      if(typeof toast==='function') toast(amIt?'🔦 GO! Find the hiders!':'🔦 The seeker is looking — keep hidden!'); }
    Game.moveLock = (amIt && rm.phase==='hide');     // seeker frozen while hiders hide
    if(amIt && rm.phase==='seek'){
      for(const r of mpRemoteList()){ if(typeof r.x!=='number' || Game.caughtIds.has(r.id)) continue;
        if(rectsOverlap(p.x,p.y,p.w,p.h, r.x,r.y,34,34)){
          Game.caughtIds.add(r.id); if(typeof mpSendCaught==='function') mpSendCaught(r.id); SFX.win();
          if(typeof toast==='function') toast('🔦 Caught '+(r.name||'a hider')+'!'); } }
      const hiders=mpRemoteList().filter(r=>typeof r.x==='number');
      if(hiders.length && hiders.every(r=>Game.caughtIds.has(r.id))) return endRoomMP(true);
    }
    if(Game.t>=rm.endT) return endRoomMP(amIt ? false : true);   // hiders win at timeout
  } else {
    Game.moveLock=false;
    if(Game.t>=rm.endT) return endRoomMP(!amIt);                 // not-it survives the round
  }
}
function onCaughtMe(){           // a hider I control got tagged by the seeker
  if(Game.finished || !Game.room || Game.roomMode!=='hideseek') return;
  endRoomMP(false);
}
function endRoomMP(won){
  if(Game.finished) return;
  Game.finished=true; Game.running=false;
  if(won) SFX.win(); else SFX.hit();
  const reward = won?50:10; addCoins(reward);
  if(Game.multiplayer) mpSendFinish();
  if(Game.onLevelComplete) Game.onLevelComplete(1, reward, true,
    {room:true, roomMode:Game.roomMode||'tag', survived:won, mp:true});
}

/* ---------------- Colour Tag (solo AI + multiplayer) ---------------- */
function onColorPad(x,y,w,h,colorName){
  for(const pl of Game.world.platforms){ if(pl.type!=='cpad' || pl.colorName!==colorName) continue;
    if(!(x<pl.x+pl.w && x+w>pl.x)) continue;          // horizontally over the pad
    const feet=y+h;
    if(feet>=pl.y-6 && feet<=pl.y+pl.h+5) return true; // standing on it (or overlapping it)
  }
  return false;
}
function ctCallColor(){                 // AI (bot IT) auto-picks a random colour
  const cols=Game.world.colors||[]; if(!cols.length) return;
  const c=cols[Math.floor(Math.random()*cols.length)];
  Game.ct.color=c.name; Game.ct.colorHex=c.hex;
  Game.ct.graceUntil=Game.t+2800; Game.ct.nextCallT=Game.t+8500; SFX.checkpoint();
  if(typeof toast==='function') toast('🎨 Get on '+c.name.toUpperCase()+'!');
  if(typeof refreshColorBar==='function') refreshColorBar();
}
/* the human "it" taps a colour to call it (solo tagger or MP it) */
function ctSetColor(name){
  if(!Game.ct) return;
  const amIt = (Game.multiplayer && MP.itId===MP.selfId) || (!Game.multiplayer && Game.soloRole==='tagger');
  if(!amIt) return;
  const c=(Game.world.colors||[]).find(k=>k.name===name); if(!c) return;
  Game.ct.color=c.name; Game.ct.colorHex=c.hex;
  Game.ct.graceUntil=Game.t+2800; Game.ct.nextCallT=Game.t+1e12;   // no auto re-call — you choose
  SFX.checkpoint();
  if(typeof toast==='function') toast('🎨 You called '+name.toUpperCase()+'!');
  if(Game.multiplayer && typeof mpSendTagColor==='function') mpSendTagColor(c.name);
  if(typeof refreshColorBar==='function') refreshColorBar();
}
function initColorTag(){
  const W=Game.world.width, H=Game.world.height, floorTop=H-40;
  Game.ct={ color:null, colorHex:null, graceUntil:0, nextCallT:0, lives:3, endT:Game.t+100000, tagCd:0 };
  if(Game.multiplayer){
    if(MP.isHost) setTimeout(()=>{ mpSendIt(MP.selfId);   // host is IT and picks the colour
      if(typeof refreshColorBar==='function') refreshColorBar();
      if(typeof toast==='function') toast('🌈 You are IT — tap a colour to call!'); }, 500);
  } else {
    const tagger = Game.soloRole==='tagger';
    Game.ct.score=0; Game.ct.target=5;
    Game.ai={ x: tagger?(W/2):(W-90), y:floorTop-34, vx:0,vy:0,w:34,h:34,facing:-1,onGround:false,
              speed: tagger?3.5:3.3, tx:W/2, ty:null, jumpCdUntil:0, _stuck:0, _wanderT:0, state:'chase' };
    if(!tagger) ctCallColor();   // the bot IT calls colours; if YOU are IT you tap to call
  }
  if(typeof toast==='function') toast(Game.soloRole==='tagger'
      ? '🌈 You call the colours — tag the bot when it\'s off-colour! (5 to win)'
      : '🌈 Colour Tag! Stand on the colour the tagger calls!');
  if(typeof refreshColorBar==='function') refreshColorBar();
}
function nearestColorPad(x, color){
  let best=null, bd=1e9;
  for(const pl of Game.world.platforms){ if(pl.type!=='cpad' || pl.colorName!==color) continue;
    const d=Math.abs((pl.x+pl.w/2)-x); if(d<bd){ bd=d; best=pl; } }
  return best;
}
function updateColorTag(dt){
  const p=Game.player, ct=Game.ct; if(!ct) return;
  const safe = ct.color && onColorPad(p.x,p.y,p.w,p.h, ct.color);
  const hunting = Game.t > ct.graceUntil;
  if(Game.multiplayer){
    const amIt = MP.itId===MP.selfId;
    if(amIt){
      // chase the nearest hider; tag whoever is NOT on the called colour -> they become it
      let target=null, best=1e9;
      for(const r of mpRemoteList()){ if(typeof r.x!=='number') continue;
        const d=Math.hypot((p.x)-(r.x),(p.y)-(r.y)); if(d<best){best=d;target=r;} }
      const touching = target && Math.hypot((p.x+p.w/2)-(target.x+17),(p.y+p.h/2)-(target.y+17)) < 42;
      if(ct.color && hunting && touching && Game.t>ct.tagCd){
        const tsafe = onColorPad(target.x,target.y,34,34, ct.color);
        if(!tsafe){ ct.tagCd=Game.t+1500; mpSendIt(target.id); SFX.win(); addShake(5);
          if(typeof toast==='function') toast('🌈 Tagged '+(target.name||'a friend')+'! They\'re IT'); }
        else if(typeof toast==='function') toast('🛡️ Safe — they\'re on '+ct.color.toUpperCase()+'!'); }
    }
    if(Game.t>=ct.endT) return endColorTag(MP.itId!==MP.selfId);
    return;
  }
  // ---- solo ----
  const a=Game.ai; if(!a) return;
  if(Game.soloRole==='tagger'){
    // YOU tap a colour to call; the bot heads to it; you chase & tag it off-colour
    if(!ct.color){                      // no colour called yet — the bot just mills about
      if(Game.t>a._wanderT){ a._wanderT=Game.t+1400+Math.random()*1400; a.tx=200+Math.random()*(Game.world.width-400); }
      a.ty=null; stepAgent(a);
      if(Game.t>=ct.endT) return endColorTag((ct.score||0) >= Math.ceil(ct.target/2));
      return;
    }
    const pad=nearestColorPad(a.x+a.w/2, ct.color);
    a.tx = pad? pad.x+pad.w/2 : a.x; a.ty = pad? pad.y : null;
    stepAgent(a);
    const distT=Math.hypot((p.x+p.w/2)-(a.x+a.w/2),(p.y+p.h/2)-(a.y+a.h/2));
    const botSafe = onColorPad(a.x,a.y,34,34, ct.color);
    if(hunting && distT<32 && Game.t>ct.tagCd && !botSafe){
      ct.tagCd=Game.t+1200; ct.score=(ct.score||0)+1; SFX.win(); addShake(4);
      if(typeof toast==='function') toast('🌈 Tagged the bot! ('+ct.score+'/'+ct.target+') — call a new colour!');
      if(ct.score>=ct.target) return endColorTag(true);
    }
    if(Game.t>=ct.endT) return endColorTag((ct.score||0) >= Math.ceil(ct.target/2));
    return;
  }
  // ---- solo: you dodge, AI tagger chases ----
  a.tx=p.x+p.w/2; a.ty=p.y;
  if(hunting) stepAgent(a); // during grace the tagger waits, then hunts
  const dist=Math.hypot((p.x+p.w/2)-(a.x+a.w/2),(p.y+p.h/2)-(a.y+a.h/2));
  if(hunting && dist<32 && Game.t>ct.tagCd){
    if(!safe){ ct.tagCd=Game.t+1500; ct.lives--; SFX.hit(); addShake(6); p.vx=(p.x>a.x?1:-1)*9; p.vy=-9;
      if(typeof toast==='function') toast('💥 Off-colour! ❤️ '+Math.max(0,ct.lives)+' left');
      if(ct.lives<=0) return endColorTag(false);
      ctCallColor();                       // new round after a hit
    } else { // you're safe — tagger backs off and calls a new colour
      ct.tagCd=Game.t+800;
      if(Game.t>ct.nextCallT-2000) ctCallColor();
    }
  }
  if(Game.t>ct.nextCallT) ctCallColor();
  if(Game.t>=ct.endT) return endColorTag(true);   // survived the whole game
}
function endColorTag(won){
  if(Game.finished) return;
  Game.finished=true; Game.running=false;
  if(won) SFX.win(); else SFX.hit();
  const reward = won?55:10; addCoins(reward);
  if(Game.multiplayer) mpSendFinish();
  if(Game.onLevelComplete) Game.onLevelComplete(1, reward, true,
    {colortag:true, survived:won, mp:Game.multiplayer, role:Game.soloRole, arena:Game.colorArena});
}
function drawColorPads(ctx){
  for(const pl of Game.world.platforms){ if(pl.type!=='cpad') continue;
    const called = Game.ct && Game.ct.color===pl.colorName;
    ctx.globalAlpha = called ? 1 : 0.78;
    ctx.fillStyle=pl.fill; roundRect(ctx, pl.x, pl.y, pl.w, pl.h, 9); ctx.fill();
    if(called){ ctx.globalAlpha=0.5+0.5*Math.abs(Math.sin(Game.t/200));
      ctx.strokeStyle='#fff'; ctx.lineWidth=3; roundRect(ctx, pl.x, pl.y, pl.w, pl.h, 9); ctx.stroke(); }
    ctx.globalAlpha=1;
  }
}

function nextLevel(){
  if(Game.level<TOTAL_LEVELS){
    Game.level++;
    loadLevel(Game.level);
    Game.finished=false;
    showScreen('gameScreen');
  }
}

/* ---------- rendering ---------- */
function render(){
  const ctx=Game.ctx; if(!ctx) return;
  ctx.clearRect(0,0,Game.W,Game.H);
  const s=gameScale();
  const shx = Game.shakeMag ? (Math.random()*2-1)*Game.shakeMag : 0;
  const shy = Game.shakeMag ? (Math.random()*2-1)*Game.shakeMag : 0;
  ctx.save();
  ctx.translate(Game.W/2 + shx, Game.H/2 + shy);
  ctx.scale(s,s);
  ctx.translate(-Game.cam.x, -Game.cam.y);

  drawWorldBackdrop(ctx);

  const plats=Game.world.platforms;
  for(const pl of plats){ if(pl.furni) drawFurni(ctx,pl); else if(pl.type==='cpad'){} else drawPlatform(ctx,pl); }
  if(Game.colorTag) drawColorPads(ctx);

  // floating collectible coins
  for(const c of plats){
    if(c.type!=='coin' || c.taken) continue;
    const cx=c.x+c.w/2, cy=c.y+c.h/2 + Math.sin(Game.t/200+c.x)*3;
    const sw=Math.abs(Math.cos(Game.t/180+c.x))*c.w/2 + 2;   // spin
    ctx.fillStyle='#e8b73c'; ctx.beginPath(); ctx.ellipse(cx,cy,sw+2,c.h/2+2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffe08a'; ctx.beginPath(); ctx.ellipse(cx,cy,sw,c.h/2,0,0,Math.PI*2); ctx.fill();
  }

  // floating power-ups
  for(const c of plats){
    if(c.type!=='powerup' || c.taken) continue;
    const info=POWERUP_INFO[c.pw]||{emoji:'⚡'};
    const cx=c.x+c.w/2, cy=c.y+c.h/2 + Math.sin(Game.t/200+c.x)*4;
    const gg=ctx.createRadialGradient(cx,cy,2,cx,cy,c.w*0.8);
    gg.addColorStop(0,'rgba(255,255,255,.9)'); gg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(cx,cy,c.w*0.8,0,Math.PI*2); ctx.fill();
    ctx.font=`${Math.round(c.w)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(info.emoji, cx, cy);
  }

  // Tower bosses + their falling blocks
  if(Game.world.bosses){
    for(const b of Game.world.bosses){ if(!b.defeated) drawBoss(ctx,b); }
    for(const s of Game.bossShots) drawBossShot(ctx,s);
  }
  // solo dodge hazards (pendulums / spikes / laser gates)
  drawSoloHazards(ctx);
  if(Game.bananas.length) drawBananas(ctx);
  if(Game.fire.length) drawFire(ctx);
  if(Game.disaster) drawDisaster(ctx);

  // pet-placed platforms (fading sparkle footholds)
  for(const pp of Game.placedPlatforms){
    const left=pp.until-Game.t;
    ctx.globalAlpha = left<1200 ? Math.max(0.3,left/1200) : 1;
    ctx.fillStyle='#ffe9a8';
    roundRect(ctx,pp.x,pp.y,pp.w,pp.h,8); ctx.fill();
    ctx.fillStyle='#ffcf4d'; roundRect(ctx,pp.x,pp.y+pp.h-5,pp.w,5,8); ctx.fill();
    ctx.globalAlpha=1; ctx.font='13px serif'; ctx.textAlign='center';
    ctx.fillText('✨', pp.x+pp.w/2, pp.y-2);
  }

  // remote players (in Team mode they show their team colour)
  if(Game.multiplayer){
    const showIt = Game.mode==='tag' || Game.disasterType==='killer' || Game.colorTag || (Game.room && Game.roomMode!=='hideseek');
    const hsSeek = Game.room && Game.roomMode==='hideseek';
    for(const r of mpRemoteList()){
      if(typeof r.x!=='number') continue;
      const caught = Game.caughtIds && Game.caughtIds.has(r.id);
      const isSeeker = hsSeek && MP.itId===r.id;
      if(r.morph){
        // a friend the Alien turned into an animal
        ctx.font='46px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(r.morph, r.x+17, r.y+17);
        drawNameTag(ctx, r.x+17, r.y-8, r.name||'Blob');
      } else if(r.disg && hsSeek && !isSeeker && !caught){
        // a hidden friend disguised as furniture
        ctx.font='51px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(r.disg, r.x+17, r.y+17);
      } else {
        const rskin = Game.partnerColor || r.skin;
        ctx.save(); if(caught) ctx.globalAlpha=0.5;
        drawCharacter(ctx, r.x+17, r.y+17, 34, {skin:rskin,accessory:r.accMorph||r.accessory,face:r.faceMorph||r.face,facing:r.facing||1,t:Game.t,
                      petSkin:r.petSkin, ring:Game.partnerColor&&r.petSkin?Game.partnerColor:null});
        ctx.restore();
        drawNameTag(ctx, r.x+17, r.y-8, r.name||'Blob');
      }
      if(r.emote && nowMs()-r.emoteAt < 2200) drawEmoteBubble(ctx, r.x+17, r.y-22, r.emote);
      if(isSeeker){ ctx.font='20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🔦', r.x+17, r.y-22); }
      else if(showIt && MP.itId===r.id) drawItMarker(ctx, r.x+17, r.y);
      if(caught){ ctx.font='18px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('😵', r.x+17, r.y-22); }
    }
  }

  // AI seeker / tagger
  if((Game.room||Game.colorTag) && Game.roomSolo) drawRoomAgent(ctx);

  drawPoops(ctx);                          // stinky Hyena poop piles
  const p=Game.player;
  // visible pet-ability effects + cosmetic trail behind the player
  if(!Game.spectating){ drawAbilityFx(ctx); drawTrail(ctx, p); }

  const myDisg = Game.morph || (Game.room && Game.roomMode==='hideseek'
    ? ((Game.rm && Game.rm.disguise && Game.rm.disguise.emoji) || (Game.myDisguise && Game.myDisguise.emoji))
    : null);
  // rainbow aura while flying
  if(!Game.spectating && Game.t < (Game.flyUntil||0)){
    ctx.font='18px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🌈', p.x+p.w/2, p.y-24);
  }
  // local player (worn pet / team colour; blink while invulnerable after a hit)
  if(!Game.spectating && myDisg){
    // render as the furniture you disguised as (a faint ring shows it's you)
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=2; ctx.setLineDash([4,4]);
    ctx.strokeRect(p.x-3,p.y-3,p.w+6,p.h+6); ctx.setLineDash([]);
    ctx.font=`${Math.round(p.h*1.5)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(myDisg, p.x+p.w/2, p.y+p.h/2);
    ctx.restore();
    drawNameTag(ctx, p.x+p.w/2, p.y-10, 'You');
  } else if(!Game.spectating){
    const mySkin = Game.myColor || SAVE.skin;
    const ghosting = Game.t < Game.power.ghostUntil;
    const blink = p.invuln>0 && Math.floor(Game.t/90)%2===0;
    if(Game.petGlow) drawStarGlow(ctx, p.x+p.w/2, p.y+p.h/2);   // Starlight pretty aura
    ctx.save();
    if(ghosting) ctx.globalAlpha=0.45;
    else if(blink) ctx.globalAlpha=0.4;
    drawCharacter(ctx, p.x+p.w/2, p.y+p.h/2, 34, {skin:mySkin,accessory:Game.accMorph||SAVE.accessory,face:Game.faceMorph||SAVE.face,facing:p.facing,t:Game.t,squash:p.squash,
                  petSkin:SAVE.petSkin, shiny:SAVE.petSkin&&isShiny(SAVE.petSkin), ring:Game.myColor&&SAVE.petSkin?Game.myColor:null});
    ctx.restore();
    drawNameTag(ctx, p.x+p.w/2, p.y-8, SAVE.name||'You');
    if(Game.t < (Game.stunUntil||0)){   // dizzy stars while stunned by a friend's banana
      ctx.font='22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      const sp=Math.sin(Game.t/120)*10;
      ctx.fillText('😵', p.x+p.w/2+sp, p.y-26);
    }
    if(Game.myEmote && Game.t-Game.myEmoteAt < 2200) drawEmoteBubble(ctx, p.x+p.w/2, p.y-22, Game.myEmote);
    const meIt = MP.itId===MP.selfId;
    if(Game.multiplayer && meIt && Game.room && Game.roomMode==='hideseek'){
      ctx.font='22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🔦', p.x+p.w/2, p.y-26);
    } else if(meIt && (Game.mode==='tag'||Game.disasterType==='killer'||Game.colorTag||(Game.room&&Game.roomMode!=='hideseek'))) {
      drawItMarker(ctx, p.x+p.w/2, p.y);
    }
  }

  ctx.restore();

  // weather + hazards drawn in SCREEN space
  drawWeather(ctx);
  drawHazardsScreen(ctx);
  if(Game.ship) drawShipOverlay(ctx);           // the alien-ship escape scene (screen space)
  // 🏜️ sand storm: blur your sight for 3s + a sandy haze
  const blurry = Game.t < (Game.blurUntil||0);
  if(Game.canvas) Game.canvas.style.filter = blurry ? 'blur(4px) sepia(.35) contrast(.9)' : '';
  if(blurry){ ctx.fillStyle='rgba(214,184,132,.34)'; ctx.fillRect(0,0,Game.W,Game.H); }
  updateHudLive();
}

/* draw the screen-anchored turrets and their bullets (screen coordinates) */
function drawHazardsScreen(ctx){
  for(const g of Game.guns){
    if(g.sx==null) continue;
    const dir = g.side==='L'?1:-1;
    // body
    ctx.fillStyle='#6b5b78';
    roundRect(ctx, g.sx-16, g.sy-18, 32, 36, 9); ctx.fill();
    // barrel pointing inward
    ctx.fillStyle='#4a3f55';
    ctx.fillRect(g.sx + (dir>0?8:-32), g.sy-8, 24, 16);
    // muzzle glow just before firing
    if(Game.t - g.lastFire > g.fireEvery-300){
      ctx.fillStyle='rgba(255,120,90,.9)';
      ctx.beginPath(); ctx.arc(g.sx+dir*26, g.sy, 7, 0, Math.PI*2); ctx.fill();
    }
    // red eye
    ctx.fillStyle='#ff7a5a';
    ctx.beginPath(); ctx.arc(g.sx, g.sy-2, 5, 0, Math.PI*2); ctx.fill();
  }
  for(const bl of Game.bullets){
    // trail
    ctx.fillStyle='rgba(255,150,60,.35)';
    ctx.beginPath(); ctx.ellipse(bl.x-bl.vx*1.6, bl.y, bl.r*2.4, bl.r*0.7, 0, 0, Math.PI*2); ctx.fill();
    const g=ctx.createRadialGradient(bl.x,bl.y,1, bl.x,bl.y,bl.r);
    g.addColorStop(0,'#fff'); g.addColorStop(.4,'#ffd36b'); g.addColorStop(1,'#ff5a3c');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r, 0, Math.PI*2); ctx.fill();
  }
}

function drawWorldBackdrop(ctx){
  const w=Game.world.width;
  // goal banner glow at the top (themed colour)
  ctx.fillStyle=(Game.theme && Game.theme.glow) || 'rgba(123,224,176,.25)';
  ctx.fillRect(-200, Game.world.finishY-200, w+400, 200);
}

/* Royal trail colour: smoothly cycles purple -> pink -> blue */
function royalColor(t){
  const cols=[[176,107,255],[255,126,216],[116,168,255]];
  const p=((t/700)%cols.length+cols.length)%cols.length, i=Math.floor(p), f=p-i;
  const a=cols[i], b=cols[(i+1)%cols.length];
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*f)},${Math.round(a[1]+(b[1]-a[1])*f)},${Math.round(a[2]+(b[2]-a[2])*f)})`;
}
/* cosmetic trail of fading dots / emojis behind the player */
function drawTrail(ctx, p){
  const tr = trailById(SAVE.trail);
  if(!tr || (!tr.color && !tr.emoji)) { Game.trailPoints.length=0; return; }
  Game.trailPoints.push({x:p.x+p.w/2, y:p.y+p.h/2});
  if(Game.trailPoints.length>16) Game.trailPoints.shift();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(let i=0;i<Game.trailPoints.length;i++){
    const pt=Game.trailPoints[i], a=i/Game.trailPoints.length;
    ctx.globalAlpha=a*0.6;
    if(tr.emoji){
      ctx.font=`${Math.round(8+a*16)}px serif`;
      ctx.fillText(tr.emoji, pt.x, pt.y);
    } else {
      ctx.fillStyle = tr.color==='rainbow' ? `hsl(${(Game.t/6 + i*22)%360},90%,62%)`
                    : tr.color==='royal'   ? royalColor(Game.t + i*110)
                    : tr.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 3+a*8, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.globalAlpha=1;
}

/* a menacing boss blob hovering above its arena checkpoint */
function drawBoss(ctx,b){
  const cx=Game.world.width/2, cy=b.topY-110 + Math.sin(Game.t/300)*8;
  if(b.morph){   // an Alien turned the boss into a harmless-looking animal
    ctx.font='96px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(b.morph, cx, cy);
    if(b.tamed){ ctx.font='20px serif'; ctx.fillText('😴', cx+40, cy-40); }
    return;
  }
  const R=52, active=Game.activeBoss===b;
  ctx.save();
  // glow
  ctx.globalAlpha=active?0.5:0.25;
  ctx.fillStyle='#b25bff'; ctx.beginPath(); ctx.arc(cx,cy,R+14,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  // body
  ctx.fillStyle='#7b3fb0'; ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#5d2e88'; ctx.beginPath(); ctx.arc(cx,cy+R*0.55,R*0.95,0,Math.PI,false); ctx.fill();
  // spiky crown
  ctx.fillStyle='#ffd36b';
  for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(cx+i*16-7,cy-R+6); ctx.lineTo(cx+i*16,cy-R-12); ctx.lineTo(cx+i*16+7,cy-R+6); ctx.closePath(); ctx.fill(); }
  // angry eyes
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(cx-18,cy-4,11,0,Math.PI*2); ctx.arc(cx+18,cy-4,11,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#3a1a55';
  ctx.beginPath(); ctx.arc(cx-15,cy-1,5,0,Math.PI*2); ctx.arc(cx+21,cy-1,5,0,Math.PI*2); ctx.fill();
  // angry brows
  ctx.strokeStyle='#2a1240'; ctx.lineWidth=5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx-30,cy-18); ctx.lineTo(cx-8,cy-9); ctx.moveTo(cx+30,cy-18); ctx.lineTo(cx+8,cy-9); ctx.stroke();
  // mouth
  ctx.beginPath(); ctx.arc(cx,cy+22,12,Math.PI*1.1,Math.PI*1.9); ctx.stroke();
  // banana-hit flash
  if(b._flash && Game.t-b._flash<150){ ctx.globalAlpha=0.6; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
  // label (with this boss's attack style) + banana damage taken
  const pn={rain:'Block Rain',aimed:'Sniper',spread:'Volley',sweep:'Sweeper'}[b.pattern]||'';
  ctx.fillStyle='#fff'; ctx.font='bold 13px Nunito'; ctx.textAlign='center';
  ctx.fillText('BOSS · Floor '+b.floorNo+(pn?' · '+pn:''), cx, cy-R-22);
  if(b.hits>0){ ctx.fillText('🍌 '+b.hits+'/5', cx, cy-R-38); }
  ctx.restore();
}
function drawBossShot(ctx,s){
  ctx.save();
  ctx.fillStyle='rgba(120,60,170,.35)';
  ctx.beginPath(); ctx.ellipse(s.x, s.y-s.vy*1.4, s.r*0.8, s.r*1.8, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#7b3fb0';
  roundRect(ctx, s.x-s.r, s.y-s.r, s.r*2, s.r*2, 5); ctx.fill();
  ctx.fillStyle='#5d2e88'; roundRect(ctx, s.x-s.r, s.y+s.r-5, s.r*2, 5, 3); ctx.fill();
  ctx.restore();
}

/* a little speech bubble with an emoji over a player */
function drawEmoteBubble(ctx,cx,cy,emoji){
  ctx.save();
  ctx.fillStyle='#fff';
  ctx.strokeStyle='rgba(120,90,170,.25)'; ctx.lineWidth=1.5;
  roundRect(ctx,cx-16,cy-30,32,28,10); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-5,cy-3); ctx.lineTo(cx+5,cy-3); ctx.lineTo(cx,cy+5); ctx.closePath();
  ctx.fillStyle='#fff'; ctx.fill();
  ctx.font='20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(emoji, cx, cy-15);
  ctx.restore();
}
function drawNameTag(ctx,cx,cy,name){
  ctx.font='bold 13px Nunito, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  const tw=ctx.measureText(name).width+14;
  ctx.fillStyle='rgba(91,74,106,.85)';
  roundRect(ctx,cx-tw/2,cy-10,tw,18,9);ctx.fill();
  ctx.fillStyle='#fff';ctx.fillText(name,cx,cy);
}

function drawPlatform(ctx,pl){
  const r=8;
  let fill='#fff', top='#f3ecff', edge='#d9c6ff';
  switch(pl.type){
    case 'big': fill='#cdb8ff'; edge='#a98fff'; break;
    case 'small': fill='#ffc7e6'; edge='#ff9bce'; break;
    case 'normal': fill='#e7dcff'; edge='#c3a9ff'; break;
    case 'checkpoint':{
      // flag platform
      fill = Game.hitCheckpoints.has(pl.cpIndex)?'#7be0b0':'#bff3d6'; edge='#46c98c';
      break;
    }
    case 'finish': fill='#ffe177'; edge='#ffc233'; break;
    case 'disappear':{
      const d=Game.disappear[pl.id];
      if(d&&d.gone) return;
      let alpha=1;
      if(d&&d.standSince){
        const total=pl.crumbleMs||5000;
        const left=total-(Game.t-d.standSince);
        const warn=Math.min(1700, total*0.45);
        const blink = left<warn ? (Math.sin(Game.t/55)*0.45+0.55) : 1;
        alpha=blink;
      }
      ctx.globalAlpha=alpha;
      fill='#ffb3b3'; edge='#ff7a7a';
      break;
    }
    case 'conveyor': fill='#9cd8ff'; edge='#5aa8ee'; break;
    case 'mover': fill='#ffd98a'; edge='#f0a93c'; break;
    case 'trapdoor':{
      const t=Game.trap[pl.id];
      if(t && t.openUntil && Game.t < t.openUntil){ ctx.globalAlpha=0.22; }   // flipped open
      else if(t && t.since!=null){ ctx.globalAlpha=Math.sin(Game.t/45)*0.4+0.6; } // arming → blink
      fill='#f7d8b0'; edge='#d89b63';
      break;
    }
    case 'built':{
      fill = pl.color || '#cdb8ff'; edge='rgba(0,0,0,.18)';
      ctx.fillStyle=fill; roundRect(ctx,pl.x,pl.y,pl.w,pl.h,6); ctx.fill();
      ctx.fillStyle=edge; roundRect(ctx,pl.x,pl.y+pl.h-5,pl.w,5,6); ctx.fill();
      if(pl.lavaProof){ ctx.font='13px serif'; ctx.textAlign='center'; ctx.fillText('🔥', pl.x+pl.w/2, pl.y+pl.h/2+1); }
      return;
    }
    case 'dbutton':{
      const cx=pl.x+pl.w/2, cy=pl.y+pl.h/2;
      ctx.fillStyle = pl.taken?'#bdbdbd':'#ff5fb0';
      roundRect(ctx,pl.x,pl.y,pl.w,pl.h,9); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='12px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(pl.taken?'✓':'🔘', cx, cy);
      return;
    }
    case 'bouncy': fill='#b6f5c8'; edge='#3fcf86'; break;
    case 'ice': fill='#dff4ff'; edge='#9fd8f5'; break;
    case 'wind': fill='#eef4ff'; edge='#c2d4ee'; break;
    case 'lift': fill='#cfe3ff'; edge='#6f9bdd'; break;
    case 'laser':{
      const live=laserLive(pl);
      const vertical = pl.wall || pl.h>pl.w;
      ctx.fillStyle='#6b5b78';
      if(vertical){ ctx.fillRect(pl.x-5, pl.y-10, pl.w+10, 12); ctx.fillRect(pl.x-5, pl.y+pl.h-2, pl.w+10, 12); }
      else { ctx.fillRect(pl.x-8, pl.y-6, 10, pl.h+12); ctx.fillRect(pl.x+pl.w-2, pl.y-6, 10, pl.h+12); }
      if(live){
        ctx.globalAlpha=Math.sin(Game.t/60)*0.25+0.75;
        ctx.fillStyle='#ff5a5a'; roundRect(ctx,pl.x,pl.y,pl.w,pl.h,5);ctx.fill();
        ctx.fillStyle='#fff';
        if(vertical) ctx.fillRect(pl.x+pl.w/2-1.5,pl.y,3,pl.h);
        else ctx.fillRect(pl.x,pl.y+pl.h/2-1.5,pl.w,3);
        ctx.globalAlpha=1;
      } else {
        ctx.globalAlpha=0.22; ctx.fillStyle='#b8c4d6';
        if(vertical) ctx.fillRect(pl.x+pl.w/2-1,pl.y,2,pl.h);
        else ctx.fillRect(pl.x,pl.y+pl.h/2-1,pl.w,2);
        ctx.globalAlpha=1;
      }
      return;
    }
    case 'pad':{
      const lit = isPadLit(pl.grp);
      if(pl.color==='pink'){ fill=lit?'#ff9ed6':'#ffd0ea'; edge='#ff5fb0'; }
      else if(pl.color==='blue'){ fill=lit?'#9ec3ff':'#cfe0ff'; edge='#5b8fef'; }
      else if(pl.pad && pl.pad[0]==='H'){ fill=lit?'#b6ffd0':'#d9c6ff'; edge=lit?'#46c98c':'#9b6bff'; }
      else { fill=lit?'#ffe177':'#ffd6f0'; edge=lit?'#ffb300':'#ff9bce'; }
      break;
    }
    case 'bridge':{
      if(!solidNow(pl)){ // ghost outline
        ctx.globalAlpha=0.18; fill='#c9b8ff'; edge='#a98fff';
      } else {
        const until=MP.bridges[pl.grp]||0; const left=until-nowMs();
        const blink= left<2500 ? (Math.sin(Game.t/80)*0.35+0.65):1;
        ctx.globalAlpha=blink; fill='#b6ffd0'; edge='#46c98c';
      }
      break;
    }
  }
  ctx.fillStyle=fill;
  roundRect(ctx,pl.x,pl.y,pl.w,pl.h,r);ctx.fill();
  ctx.fillStyle=edge;
  roundRect(ctx,pl.x,pl.y+pl.h-6,pl.w,6,r);ctx.fill();
  ctx.globalAlpha=1;

  // decorations
  if(pl.type==='checkpoint'){
    drawFlag(ctx, pl.x+pl.w/2, pl.y, Game.hitCheckpoints.has(pl.cpIndex), pl.cpIndex);
  }
  if(pl.type==='finish'){
    ctx.font='26px serif';ctx.textAlign='center';ctx.fillText('🏁',pl.x+pl.w*0.2,pl.y-2);ctx.fillText('🏆',pl.x+pl.w*0.8,pl.y-2);
    ctx.fillStyle='#a07a16';ctx.font='bold 16px Nunito';ctx.fillText('TOP!',pl.x+pl.w/2,pl.y-14);
  }
  if(pl.type==='conveyor'){
    ctx.fillStyle='rgba(255,255,255,.85)';ctx.font='bold 16px Nunito';ctx.textAlign='center';
    const arrow=pl.dir>0?'»»»':'«««';
    const shift=((Game.t/60)*pl.dir)%24;
    ctx.fillText(arrow, pl.x+pl.w/2+ (pl.dir>0?shift:-shift), pl.y+pl.h/2+1);
  }
  if(pl.type==='mover'){
    ctx.fillStyle='rgba(120,80,20,.7)';ctx.font='bold 15px Nunito';ctx.textAlign='center';
    ctx.fillText('↔', pl.x+pl.w/2, pl.y+pl.h/2+1);
  }
  if(pl.type==='trapdoor'){
    ctx.strokeStyle='rgba(140,100,60,.6)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(pl.x+pl.w/2, pl.y+2); ctx.lineTo(pl.x+pl.w/2, pl.y+pl.h-2); ctx.stroke();
    ctx.fillStyle='rgba(120,80,40,.6)'; ctx.font='bold 11px Nunito'; ctx.textAlign='center';
    ctx.fillText('⚠', pl.x+pl.w/2, pl.y-7);
  }
  if(pl.type==='bouncy'){
    // springy bob + arrows so it reads as a trampoline
    const bob=Math.abs(Math.sin(Game.t/180))*3;
    ctx.fillStyle='rgba(30,150,90,.8)';ctx.font='bold 15px Nunito';ctx.textAlign='center';
    ctx.fillText('⤴', pl.x+pl.w/2, pl.y+pl.h/2+1-bob);
  }
  if(pl.type==='ice'){
    ctx.fillStyle='rgba(255,255,255,.85)';
    roundRect(ctx,pl.x+3,pl.y+2,pl.w-6,4,3);ctx.fill();   // glossy shine
    ctx.fillStyle='rgba(90,160,210,.8)';ctx.font='13px Nunito';ctx.textAlign='center';
    ctx.fillText('❄', pl.x+pl.w/2, pl.y+pl.h/2+2);
  }
  if(pl.type==='wind'){
    ctx.fillStyle='rgba(110,140,190,.7)';ctx.font='bold 14px Nunito';ctx.textAlign='center';
    const arrow=pl.dir>0?'›››':'‹‹‹';
    const shift=((Game.t/50)*pl.dir)%20;
    ctx.fillText(arrow, pl.x+pl.w/2+(pl.dir>0?shift:-shift), pl.y+pl.h/2+1);
  }
  if(pl.type==='lift'){
    ctx.fillStyle='#4d6fa8';ctx.font='bold 13px Nunito';ctx.textAlign='center';
    ctx.fillText('⬆ BOTH STAND ⬆', pl.x+pl.w/2, pl.y+pl.h/2+1);
  }
  if(pl.type==='pad'){
    const lever = pl.pad && pl.pad[0]==='H';
    ctx.textAlign='center';
    ctx.font='bold 12px Nunito';
    ctx.fillStyle = lever?'#6b3fb0':'#a05';
    const label = lever ? 'HOLD' : (pl.stand ? 'STAND' : pl.pad);
    ctx.fillText(label, pl.x+pl.w/2, pl.y-8);
  }
}

function isPadLit(grp){ return !!(MP.bridges[grp] && MP.bridges[grp]>nowMs()); }

function drawFlag(ctx,x,y,hit,idx){
  ctx.strokeStyle='#7a6a4a';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-30);ctx.stroke();
  ctx.fillStyle=hit?'#46c98c':'#ff9bce';
  ctx.beginPath();ctx.moveTo(x,y-30);ctx.lineTo(x+22,y-24);ctx.lineTo(x,y-18);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 11px Nunito';ctx.textAlign='center';ctx.fillText(idx,x+9,y-24);
}

function roundRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

/* ---------- HUD ---------- */
function updateHud(){
  const el=document.getElementById('hudLevel');
  el.textContent = Game.colorTag ? '🌈 Colour Tag'
                 : Game.room ? (Game.roomMode==='hideseek'?'🙈 Hide & Seek':'🏃 Room Tag')
                 : Game.disaster ? (Game.disasterPhase==='build'?'🏗️ Build!':(DISASTER_INFO[Game.disasterType]||{}).name||'Disaster')
                 : Game.heist ? '💰 Gold Heist'
                 : Game.tower ? '🏗️ Tower'
                 : Game.daily ? '🗓️ Daily'
                 : 'Level '+Game.level+'/'+TOTAL_LEVELS;
}
function updateHudLive(){
  const done=Game.hitCheckpoints.size;
  const clock=ms=>{ const s=Math.max(0,Math.ceil(ms/1000)); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); };
  if(Game.colorTag){
    const ct=Game.ct, cp=document.getElementById('hudCp');
    const amIt = (Game.multiplayer && MP.itId===MP.selfId) || (!Game.multiplayer && Game.soloRole==='tagger');
    if(ct){
      const suffix = Game.multiplayer ? '' : (Game.soloRole==='tagger'
        ? ' · 🎯'+(ct.score||0)+'/'+ct.target : ' · ❤️'+Math.max(0,ct.lives));
      const lead = amIt ? '🌈 Call '+(ct.color?ct.color.toUpperCase():'…')+'! ' : (ct.color?'🎨 '+ct.color.toUpperCase()+'! ':'');
      cp.textContent = lead + clock(ct.endT-Game.t) + suffix;
    }
    document.getElementById('hudCoins').textContent='🪙 '+SAVE.coins;
    const hp=document.getElementById('hudPower'); if(hp) hp.style.display='none';
    return;
  }
  if(Game.room){
    const rm=Game.rm, cp=document.getElementById('hudCp');
    if(rm && Game.roomMode==='hideseek'){
      const amSeeker = (Game.multiplayer && MP.itId===MP.selfId) || (!Game.multiplayer && Game.soloRole==='tagger');
      const disg = (rm.disguise&&rm.disguise.emoji) || (Game.myDisguise&&Game.myDisguise.emoji);
      cp.textContent = rm.phase==='hide'
        ? (amSeeker?'🙈 Eyes closed… ':'🙈 HIDE! ')+Math.max(0,Math.ceil((rm.hideEndT-Game.t)/1000))+'s'
        : (amSeeker?'🔦 FIND them! ':'🔦 ')+clock(rm.endT-Game.t)+(!amSeeker?(disg?(' · '+disg):' · ⚠️ no disguise'):'');
    } else if(rm){
      cp.textContent = '🏃 RUN! '+clock(rm.endT-Game.t);
    }
    document.getElementById('hudCoins').textContent='🪙 '+SAVE.coins;
    const hp=document.getElementById('hudPower'); if(hp) hp.style.display='none';
    return;
  }
  if(Game.disaster){
    const left=Math.max(0, Math.ceil((Game.disasterPhaseT-Game.t)/1000));
    document.getElementById('hudCp').textContent = (Game.disasterPhase==='build'
        ? '🏗️ '+left+'s'
        : '🔘 '+Game.disasterButtons+'/'+DISASTER_BUTTONS+' — press them all!');
    const hp=document.getElementById('hudPower');
    if(hp){ hp.style.display='block'; hp.textContent='❤️ '+Math.max(0,Game.disasterLives); }
  } else if(Game.heist){
    const left=Math.max(0, Math.ceil((Game.heistEndT-Game.t)/1000));
    document.getElementById('hudCp').textContent='⏱ '+left+'s · 🪙'+Game.heistLoot;
  } else if(Game.tower){
    document.getElementById('hudCp').textContent='🏗️ Floor '+done+(SAVE.towerBest?(' · best '+SAVE.towerBest):'');
  } else {
    document.getElementById('hudCp').textContent='⛳ '+done+'/'+CHECKPOINTS;
  }
  document.getElementById('hudCoins').textContent='🪙 '+SAVE.coins;
  // active power-up indicator (disaster mode uses hudPower for lives instead)
  const hp=document.getElementById('hudPower');
  if(hp && !Game.disaster){
    const bits=[];
    if(Game.power.shield) bits.push('🛡️');
    if(Game.t<Game.power.magnetUntil) bits.push('🧲'+Math.ceil((Game.power.magnetUntil-Game.t)/1000));
    if(Game.t<Game.power.dashUntil) bits.push('👟'+Math.ceil((Game.power.dashUntil-Game.t)/1000));
    if(Game.t<Game.power.slowUntil) bits.push('⏳'+Math.ceil((Game.power.slowUntil-Game.t)/1000));
    if(Game.t<Game.power.x2Until) bits.push('⭐'+Math.ceil((Game.power.x2Until-Game.t)/1000));
    if(Game.t<Game.power.ghostUntil) bits.push('👻'+Math.ceil((Game.power.ghostUntil-Game.t)/1000));
    if(bits.length){ hp.style.display='block'; hp.textContent=bits.join(' '); }
    else hp.style.display='none';
  }
  if(Game.spectating && typeof refreshSpectateName==='function') refreshSpectateName();
}

function exitToLobby(){
  Game.running=false;
  cancelAnimationFrame(Game.raf);
  if(Game.multiplayer){ /* keep connection if in room */ }
  if(Game.onExit) Game.onExit();
}
