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
};

const SCALE_TARGET_H = 560;     // world-units shown vertically (camera zoom baseline)

function gameInit(){
  Game.canvas=document.getElementById('gameCanvas');
  Game.ctx=Game.canvas.getContext('2d');
  window.addEventListener('resize', gameResize);
  // keyboard (desktop)
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp',' ','a','d','w'].includes(e.key)) e.preventDefault();
    Game.keys[e.key]=true;
    if(e.key==='ArrowUp'||e.key===' '||e.key==='w') Game.input.jump=true;
  },{passive:false});
  window.addEventListener('keyup',e=>{ Game.keys[e.key]=false; });
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
  loadLevel(Game.level);
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
    onGround:false, squash:0, cp:0, respawnX:st.x, respawnY:st.y-22,
  };
  Game.cam.x=st.x; Game.cam.y=st.y-200;
  updateHud();
}

function respawn(){
  const p=Game.player;
  p.x=p.respawnX; p.y=p.respawnY; p.vx=0; p.vy=0;
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
  if(i.joyX) dir=i.joyX;             // joystick overrides
  return dir;
}

function update(dt){
  const p=Game.player; if(!p) return;
  const GRAV=0.7, MAXFALL=18, MOVE=4.7, ACCEL=0.6, FRICT=0.75, JUMP=-15.6;

  const dir=Math.max(-1,Math.min(1,readInput()));
  // horizontal
  const target=dir*MOVE;
  p.vx += (target-p.vx)*0.35;
  if(Math.abs(dir)<0.05){ p.vx*=FRICT; if(Math.abs(p.vx)<0.05)p.vx=0; }
  if(dir>0.05)p.facing=1; if(dir<-0.05)p.facing=-1;

  // jump
  if(Game.input.jump && p.onGround){ p.vy=JUMP; p.onGround=false; p.squash=-1; }
  Game.input.jump=false;

  // gravity
  p.vy+=GRAV; if(p.vy>MAXFALL)p.vy=MAXFALL;

  // integrate + collide
  p.onGround=false;
  moveAndCollide(p);

  // squash easing
  p.squash += (0 - p.squash)*0.18;

  // out of bounds (fell off bottom)
  if(p.y > Game.world.height + 240){ respawn(); }

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
  const plats=Game.world.platforms;
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
      if(!solidNow(pl)) continue;
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
  }

  // handle effects of the platform we're standing on
  Game.curPad=null;
  if(standingOn){ onStand(p, standingOn, now); }
  // clear pad reports if not standing on a pad this frame
  reconcilePads();
}

function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
  return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
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
  // update generic respawn anchor to last safe non-special platform
  if(pl.type==='normal'||pl.type==='big'||pl.type==='small'){
    p.respawnX=p.x; p.respawnY=pl.y-p.h;
  }
  // disappearing block timer
  if(pl.type==='disappear'){
    const d=Game.disappear[pl.id]||(Game.disappear[pl.id]={});
    if(!d.standSince) d.standSince=now;
    if(!d.gone && now-d.standSince>5000){ d.gone=true; d.goneAt=now; }
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
  // co-op pad
  if(pl.type==='pad'){
    setPadReport(pl.grp, pl.pad, true);
    Game.curPad=pl.grp+pl.pad;
  }
}

/* track which pad we report as pressed; release when we leave */
function setPadReport(grp,pad,on){
  const key=grp+pad;
  if(Game.padReport[key]===on) return;
  Game.padReport[key]=on;
  if(Game.multiplayer) mpReportPad(grp,pad,on);
  else {
    // solo "race"/solo: allow single player to bridge for testing/play alone
    if(on){ MP.bridges[grp]=nowMs()+10000; }
  }
}
function reconcilePads(){
  for(const key in Game.padReport){
    if(Game.padReport[key] && key!==Game.curPad){
      const grp=key.slice(0,-1), pad=key.slice(-1);
      Game.padReport[key]=false;
      if(Game.multiplayer) mpReportPad(parseInt(grp),pad,false);
    }
  }
}

function levelFinished(){
  Game.finished=true;
  let earned=10; addCoins(10);   // bonus for finishing a level
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

  // remote players
  if(Game.multiplayer){
    for(const r of mpRemoteList()){
      if(typeof r.x!=='number') continue;
      drawCharacter(ctx, r.x+17, r.y+17, 34, {skin:r.skin,accessory:r.accessory,face:r.face,facing:r.facing||1,t:Game.t});
      drawNameTag(ctx, r.x+17, r.y-8, r.name||'Blob');
    }
  }

  // local player
  const p=Game.player;
  drawCharacter(ctx, p.x+p.w/2, p.y+p.h/2, 34, {skin:SAVE.skin,accessory:SAVE.accessory,face:SAVE.face,facing:p.facing,t:Game.t,squash:p.squash});
  drawNameTag(ctx, p.x+p.w/2, p.y-8, SAVE.name||'You');

  ctx.restore();
  updateHudLive();
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
        const left=5000-(Game.t-d.standSince);
        const blink = left<1600 ? (Math.sin(Game.t/70)*0.4+0.6) : 1;
        alpha=blink;
      }
      ctx.globalAlpha=alpha;
      fill='#ffb3b3'; edge='#ff7a7a';
      break;
    }
    case 'conveyor': fill='#9cd8ff'; edge='#5aa8ee'; break;
    case 'pad':{
      const lit = isPadLit(pl.grp);
      fill = lit?'#ffe177':'#ffd6f0'; edge=lit?'#ffb300':'#ff9bce'; break;
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
  if(pl.type==='pad'){
    ctx.font='14px serif';ctx.textAlign='center';ctx.fillStyle='#a05';
    ctx.fillText(pl.pad, pl.x+pl.w/2, pl.y-8);
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
