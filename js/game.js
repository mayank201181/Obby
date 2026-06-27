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
  myColorName:null, myColor:null, partnerColor:null,  // Team colour assignment
  // equipped-pet ability effects:
  petMoveMul:1, petJumpMul:1, petFallMul:1, petMaxJumps:1, petCanPlatform:false,
  placedPlatforms:[],           // platforms spawned by the 'platform' pet ability
  platformCdUntil:0,            // ability cooldown
};

function applyEquippedPet(){
  const a = (typeof equippedAbilities==='function') ? equippedAbilities()
          : {moveMul:1,jumpMul:1,fallMul:1,maxJumps:1,canPlatform:false};
  Game.petMoveMul=a.moveMul; Game.petJumpMul=a.jumpMul; Game.petFallMul=a.fallMul;
  Game.petMaxJumps=a.maxJumps; Game.petCanPlatform=a.canPlatform;
  const btn=document.getElementById('abilityBtn');
  if(btn) btn.style.display = a.canPlatform ? 'flex' : 'none';
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
  document.getElementById('gameScreen').style.background = SAVE.bg;
  Game.running=true; Game.finished=false; Game.last=performance.now(); Game.acc=0;
  cancelAnimationFrame(Game.raf);
  Game.raf=requestAnimationFrame(gameLoop);
}

function loadLevel(level){
  Game.world=generateLevel(level, Game.seed, Game.mode);
  Game.disappear={};
  Game.hitCheckpoints=new Set();
  Game.coinsThisRun=0;
  Game.padReport={};
  const st=Game.world.start;
  Game.player={
    x:st.x, y:st.y-22, vx:0, vy:0, w:34, h:34, facing:1,
    onGround:false, squash:0, cp:0, respawnX:st.x, respawnY:st.y-22, invuln:0, jumps:0,
  };
  Game.placedPlatforms=[]; Game.platformCdUntil=0;
  applyEquippedPet();               // load equipped-pet ability effects
  // screen-anchored turrets ride the left/right edges, glide up/down, fire across
  Game.guns = makeTurrets(level);
  Game.bullets=[];
  Game.player.invuln = 1200;        // brief grace at the start of a level
  Game.cam.x=st.x; Game.cam.y=st.y-200;
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

function respawn(){
  const p=Game.player;
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

/* pet 'platform' ability: drop a temporary foothold (button next to JUMP) */
function triggerAbility(){
  if(!Game.running || !Game.petCanPlatform) return;
  if(Game.t < Game.platformCdUntil) return;        // on cooldown
  const p=Game.player, w=100, h=18;
  Game.placedPlatforms.push({
    type:'placed', w, h,
    x: p.x + p.w/2 - w/2 + p.facing*16,
    y: p.y + p.h + 6,
    until: Game.t + 4500,
  });
  Game.platformCdUntil = Game.t + 2600;
  if(typeof toast==='function') toast('✨ Platform!');
}

function update(dt){
  const p=Game.player; if(!p) return;
  const GRAV=0.86, MAXFALL=18, MOVE=4.8, ACCEL=0.6, FRICT=0.72, JUMP=-14.0;

  updateMovers();                       // slide moving blocks before collision
  updateLifts();                        // raise co-op lifts (carries riders)
  if(Game.placedPlatforms.length) Game.placedPlatforms = Game.placedPlatforms.filter(pp=>pp.until>Game.t);
  if(p.invuln>0) p.invuln-=dt*1000;

  if(p.onGround) p.jumps=0;              // reset jump count when grounded

  const dir=Math.max(-1,Math.min(1,readInput()));
  // horizontal (pet speed boost)
  const move = MOVE*Game.petMoveMul;
  const target=dir*move;
  p.vx += (target-p.vx)*0.35;
  if(Math.abs(dir)<0.05){ p.vx*=FRICT; if(Math.abs(p.vx)<0.05)p.vx=0; }
  if(dir>0.05)p.facing=1; if(dir<-0.05)p.facing=-1;

  // jump (pet: higher jump + double jump)
  if(Game.input.jump){
    const jv = JUMP*Game.petJumpMul;
    if(p.onGround){ p.vy=jv; p.onGround=false; p.jumps=1; p.squash=-1; }
    else if(p.jumps < Game.petMaxJumps){ p.vy=jv; p.jumps++; p.squash=-1; }
  }
  Game.input.jump=false;

  // gravity (pet glide = slower fall)
  const g = (p.vy>0) ? GRAV*Game.petFallMul : GRAV;
  p.vy+=g; if(p.vy>MAXFALL)p.vy=MAXFALL;

  // integrate + collide
  p.onGround=false;
  moveAndCollide(p);

  // squash easing
  p.squash += (0 - p.squash)*0.18;

  // out of bounds (fell off bottom)
  if(p.y > Game.world.height + 240){ respawn(); }

  // cannons + bullets
  updateHazards(dt);

  // conveyor push handled in collision (sets p.vx target)
  // camera follow (smooth)
  const camTX=p.x, camTY=p.y-40;
  Game.cam.x += (camTX-Game.cam.x)*0.12;
  Game.cam.y += (camTY-Game.cam.y)*0.12;
  // clamp camera horizontally to world
  const half=(Game.W/gameScale())/2;
  Game.cam.x=Math.max(half, Math.min(Game.world.width-half, Game.cam.x));

  // multiplayer net update ~18Hz
  if(Game.multiplayer){
    Game.netTimer+=dt;
    if(Game.netTimer>0.055){
      Game.netTimer=0;
      mpSendPos({x:Math.round(p.x),y:Math.round(p.y),facing:p.facing,
                 skin:SAVE.skin,accessory:SAVE.accessory,face:SAVE.face,
                 name:SAVE.name,cp:p.cp,finished:Game.finished});
    }
  }
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
    p.y = bestTop - p.h; p.vy = 0;
    if(!p.onGround && p.squash > -0.4) p.squash = 0.9;
    p.onGround = true;
    // ride moving blocks: carry the player along with the platform
    if(standingOn.type==='mover'){ p.x += standingOn.dx||0; }
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
  for(let i=Game.bullets.length-1; i>=0; i--){
    const bl=Game.bullets[i];
    bl.x += bl.vx;
    if(bl.x < -40 || bl.x > W+40){ Game.bullets.splice(i,1); continue; }
    if(p.invuln<=0 &&
       bl.x+bl.r > psx && bl.x-bl.r < psx+pw &&
       bl.y+bl.r > psy && bl.y-bl.r < psy+ph){
      Game.bullets.length=0;            // clear so you aren't instantly re-hit
      respawn(); p.invuln=1300;
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
  if(pl.type==='placed'){ return pl.until > Game.t; }  // pet-placed platform
  return true;
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
    Game.coinsThisRun+=5; addCoins(5);
    if(Game.onCheckpoint)Game.onCheckpoint(pl.cpIndex);
    if(Game.multiplayer) mpSendCheckpoint(pl.cpIndex);
    toast('Checkpoint '+pl.cpIndex+'/'+CHECKPOINTS+'  +5 🪙');
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

function levelFinished(){
  Game.finished=true;
  let earned=30; addCoins(30);   // bonus for finishing a level
  if(Game.multiplayer) mpSendFinish();
  const isFinal = Game.level>=TOTAL_LEVELS;
  if(Game.level+1 > SAVE.bestLevel){ SAVE.bestLevel=Math.min(TOTAL_LEVELS,Game.level+ (isFinal?0:1)); persist(); }
  if(Game.onLevelComplete) Game.onLevelComplete(Game.level, earned, isFinal);
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
  ctx.save();
  ctx.translate(Game.W/2, Game.H/2);
  ctx.scale(s,s);
  ctx.translate(-Game.cam.x, -Game.cam.y);

  drawWorldBackdrop(ctx);

  const plats=Game.world.platforms;
  for(const pl of plats) drawPlatform(ctx,pl);

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
    for(const r of mpRemoteList()){
      if(typeof r.x!=='number') continue;
      const rskin = Game.partnerColor || r.skin;
      drawCharacter(ctx, r.x+17, r.y+17, 34, {skin:rskin,accessory:r.accessory,face:r.face,facing:r.facing||1,t:Game.t});
      drawNameTag(ctx, r.x+17, r.y-8, r.name||'Blob');
    }
  }

  // local player (your team colour in coop; blink while invulnerable after a hit)
  const p=Game.player;
  const mySkin = Game.myColor || SAVE.skin;
  const blink = p.invuln>0 && Math.floor(Game.t/90)%2===0;
  ctx.save();
  if(blink) ctx.globalAlpha=0.4;
  drawCharacter(ctx, p.x+p.w/2, p.y+p.h/2, 34, {skin:mySkin,accessory:SAVE.accessory,face:SAVE.face,facing:p.facing,t:Game.t,squash:p.squash});
  ctx.restore();
  drawNameTag(ctx, p.x+p.w/2, p.y-8, SAVE.name||'You');

  ctx.restore();

  // hazards drawn in SCREEN space (turrets ride the screen edges)
  drawHazardsScreen(ctx);
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
  // soft vertical gradient hills depending on height climbed
  const w=Game.world.width;
  // goal banner glow at the top
  ctx.fillStyle='rgba(123,224,176,.25)';
  ctx.fillRect(-200, Game.world.finishY-200, w+400, 200);
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
    case 'lift': fill='#cfe3ff'; edge='#6f9bdd'; break;
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
  document.getElementById('hudLevel').textContent='Level '+Game.level+'/'+TOTAL_LEVELS;
}
function updateHudLive(){
  const done=Game.hitCheckpoints.size;
  document.getElementById('hudCp').textContent='⛳ '+done+'/'+CHECKPOINTS;
  const heightLeft=Math.max(0, Math.round((Game.player.y-Game.world.finishY)/10));
  document.getElementById('hudCoins').textContent='🪙 '+SAVE.coins;
}

function exitToLobby(){
  Game.running=false;
  cancelAnimationFrame(Game.raf);
  if(Game.multiplayer){ /* keep connection if in room */ }
  if(Game.onExit) Game.onExit();
}
