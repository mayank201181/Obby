/* ===== AREA CLASH 🏰 =====
   1v1 castle battle vs the Builder Bot.

   BUILD PHASE (1/3/5 min): both sides build a castle from coloured square
   bricks in their own zone. Cannons, stun traps and reinforced bricks cost
   🪙10 each. You also hide your 🏀 ball somewhere in your castle.

   BATTLE PHASE: no more building! Cross the middle (jump blocks or ground),
   breach enemy bricks (🪙10 a swing), dodge cannons & traps, grab their ball
   (Pick up), and carry it home (Put down) to WIN 🪙500. If the owner tags the
   carrier, the ball flies back to its hiding spot. Sword is free; the gun
   costs 🪙10 once and shoots stunning pellets. */

const CLASH = {
  GRID:40, FLOOR_TOP:516, W:2200,
  ZONE_ME:{x0:40, x1:840}, ZONE_FOE:{x0:1360, x1:2160},
  COST:10, WIN_COINS:500,
  BOT_SPEED:2.6, BOT_JUMP:-13,
};

/* flat arena: two castle zones + jump blocks across the middle */
function generateClash(seed){
  const W=CLASH.W, H=560, floorTop=CLASH.FLOOR_TOP;
  const platforms=[]; let id=0;
  platforms.push({id:id++, x:0, y:floorTop, w:W, h:H, type:'big', room:true});   // ground
  // middle hop-blocks (optional faster route)
  platforms.push({id:id++, x:940,  y:floorTop-90,  w:90, h:20, type:'normal'});
  platforms.push({id:id++, x:1060, y:floorTop-150, w:90, h:20, type:'normal'});
  platforms.push({id:id++, x:1180, y:floorTop-90,  w:90, h:20, type:'normal'});
  return { level:1, seed, mode:'clash', width:W, height:H,
    platforms, checkpoints:[], bosses:[],
    start:{x:220, y:floorTop-40}, finishY:-1e9 };
}

function initClash(){
  const t=Game.t;
  const C = Game.clashC = {
    phase:'build', buildUntil:t+(Game.clashBuildMs||60000),
    bricks:[], cannons:[], traps:[], shots:[], fx:[],
    myBall:{x:200, y:CLASH.FLOOR_TOP-14, hx:200, hy:CLASH.FLOOR_TOP-14, carrier:null},
    foeBall:{x:1980, y:CLASH.FLOOR_TOP-14, hx:1980, hy:CLASH.FLOOR_TOP-14, carrier:null},
    bot:{x:1940, y:CLASH.FLOOR_TOP-34, vx:0, vy:0, w:34, h:34, onGround:true,
         stunUntil:0, breachAt:0, blockedT:0, facing:-1},
    buildSel:'brick', buildColor:'#cdb8ff', weapon:'sword', gunOwned:false,
    gunCdUntil:0, swordCdUntil:0, botBuildT:0, botPlan:null, hudTxt:'', actTxt:'',
  };
  // the bot picks a hiding spot + plans a castle around it
  const bx = 1500+Math.floor(Math.random()*14)*CLASH.GRID;
  C.foeBall.x=C.foeBall.hx=bx+20; C.foeBall.y=C.foeBall.hy=CLASH.FLOOR_TOP-14;
  C.botPlan = clashBotPlan(bx);
  toast('🏰 BUILD! Make your castle & hide your 🏀 (tap the bar below)');
  renderClashBar();
  const ab=document.getElementById('clashActBtn'); if(ab) ab.style.display='none';
}

/* the bot's castle blueprint: two walls + roof around its ball, plus toys */
function clashBotPlan(ballX){
  const g=CLASH.GRID, f=CLASH.FLOOR_TOP, plan=[];
  const L=ballX-2*g, R=ballX+2*g;
  const cols=['#ffc7e6','#9cc4ff','#ffe177','#9be7a0','#c8a0ff'];
  for(let i=0;i<4;i++){ plan.push({k:'brick', x:L, y:f-g*(i+1)});
                        plan.push({k:'brick', x:R, y:f-g*(i+1)}); }
  for(let x=L; x<=R; x+=g) plan.push({k:'brick', x, y:f-g*5});    // roof
  plan.push({k:'cannon', x:L-g, y:f-g});
  plan.push({k:'trap', x:L-g*2+8, y:f-6});
  plan.push({k:'trap', x:ballX+8, y:f-6});
  for(let i=0;i<6;i++) plan.push({k:'brick', x:L+g*(1+Math.floor(Math.random()*3)), y:f-g*(1+Math.floor(Math.random()*4))});
  for(const p of plan) p.col=cols[Math.floor(Math.random()*cols.length)];
  return plan;
}

/* ---------- build & battle bars ---------- */
const CLASH_COLORS=['#cdb8ff','#ffc7e6','#9be7a0','#9cc4ff','#ffe177','#ff8f8f','#ffffff','#6b5b78'];
function renderClashBar(){
  const bar=document.getElementById('clashBar'); if(!bar) return;
  const C=Game.clashC; if(!C){ bar.style.display='none'; return; }
  bar.style.display='flex';
  const btn=(id,label,sel)=>`<button class="btn ${sel?'pink':'ghost'} small" style="width:auto;pointer-events:auto" onclick="clashSel('${id}')">${label}</button>`;
  if(C.phase==='build'){
    bar.innerHTML =
      btn('brick','🧱 Brick', C.buildSel==='brick') +
      `<div class="build-colours">`+CLASH_COLORS.map(col=>`<div class="bcol${C.buildColor===col?' sel':''}" style="background:${col}" onclick="clashColor('${col}')"></div>`).join('')+`</div>` +
      btn('cannon','💣 Cannon 🪙10', C.buildSel==='cannon') +
      btn('trap','🪤 Trap 🪙10', C.buildSel==='trap') +
      btn('ball','🏀 Hide Ball', C.buildSel==='ball') +
      btn('erase','❌ Remove', C.buildSel==='erase');
  } else {
    bar.innerHTML =
      btn('sword','🗡️ Sword', C.weapon==='sword') +
      btn('gun', C.gunOwned?'🔫 Gun':'🔫 Gun 🪙10', C.weapon==='gun') +
      btn('breach','⛏️ Breach 🪙10/hit', C.weapon==='breach');
  }
}
function clashSel(id){
  const C=Game.clashC; if(!C) return; SFX.click();
  if(C.phase==='build'){ C.buildSel=id; }
  else {
    if(id==='gun' && !C.gunOwned){
      if(SAVE.coins<CLASH.COST){ toast('Need 🪙10 for the gun!'); return; }
      SAVE.coins-=CLASH.COST; persist(); updateCoinDisplays(); C.gunOwned=true; toast('🔫 Gun bought — tap to shoot!');
    }
    C.weapon=id;
  }
  renderClashBar();
}
function clashColor(col){ const C=Game.clashC; if(C){ C.buildColor=col; SFX.click(); renderClashBar(); } }

/* ---------- taps: place things (build) / fight (battle) ---------- */
function clashScreenToWorld(sx,sy){
  const s=gameScale();
  return { x:(sx-Game.W/2)/s + Game.cam.x, y:(sy-Game.H/2)/s + Game.cam.y };
}
function clashTap(sx,sy){
  const C=Game.clashC; if(!C || Game.finished) return true;
  const {x,y}=clashScreenToWorld(sx,sy);
  if(C.phase==='build') clashBuildAt(C,x,y);
  else clashFightAt(C,x,y);
  return true;
}
function inZone(z,x){ return x>=z.x0 && x<=z.x1; }
function clashBuildAt(C,x,y){
  if(!inZone(CLASH.ZONE_ME,x) || y>CLASH.FLOOR_TOP){ toast('Build inside YOUR zone!'); return; }
  const g=CLASH.GRID, gx=Math.floor(x/g)*g, gy=Math.floor(y/g)*g;
  const hit = C.bricks.find(b=>b.mine && x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
  if(C.buildSel==='erase'){
    if(hit) clashRemoveBrick(C,hit);
    else { const ci=C.cannons.findIndex(cn=>cn.mine&&Math.abs(cn.x-x)<30&&Math.abs(cn.y-y)<30); if(ci>=0) C.cannons.splice(ci,1);
           const ti=C.traps.findIndex(tr=>tr.mine&&Math.abs(tr.x-x)<30&&Math.abs(tr.y-y)<30); if(ti>=0) C.traps.splice(ti,1); }
    return;
  }
  if(C.buildSel==='brick'){
    if(hit) return;
    clashAddBrick(C,{x:gx, y:Math.max(gy, 40), col:C.buildColor, mine:true});
    SFX.click(); return;
  }
  if(C.buildSel==='cannon'){
    if(SAVE.coins<CLASH.COST){ toast('Need 🪙10 for a cannon!'); return; }
    SAVE.coins-=CLASH.COST; persist(); updateCoinDisplays();
    C.cannons.push({x:gx+20, y:gy+20, mine:true, dir:1, lastFire:0}); SFX.chest(); return;
  }
  if(C.buildSel==='trap'){
    if(SAVE.coins<CLASH.COST){ toast('Need 🪙10 for a trap!'); return; }
    SAVE.coins-=CLASH.COST; persist(); updateCoinDisplays();
    C.traps.push({x, y:Math.min(y,CLASH.FLOOR_TOP-6), mine:true}); SFX.chest(); return;
  }
  if(C.buildSel==='ball'){
    C.myBall.x=C.myBall.hx=x; C.myBall.y=C.myBall.hy=Math.min(y,CLASH.FLOOR_TOP-14);
    toast('🏀 Ball hidden here — shh!'); SFX.coin(); return;
  }
}
function clashAddBrick(C,b){
  const brick={id:90000+C.bricks.length, type:'brick', x:b.x, y:b.y, w:CLASH.GRID, h:CLASH.GRID, col:b.col, mine:!!b.mine};
  C.bricks.push(brick); Game.world.platforms.push(brick);
}
function clashRemoveBrick(C,b){
  C.bricks=C.bricks.filter(x=>x!==b);
  Game.world.platforms=Game.world.platforms.filter(x=>x!==b);
  Game.activePlats=null;
  for(let i=0;i<6;i++) C.fx.push({e:'💥', x:b.x+20+(Math.random()*24-12), y:b.y+20+(Math.random()*24-12), vy:-1-Math.random(), life:1});
}
function clashFightAt(C,x,y){
  const p=Game.player, px=p.x+p.w/2, py=p.y+p.h/2;
  if(C.weapon==='breach'){
    const b=C.bricks.find(bb=>!bb.mine && x>=bb.x&&x<=bb.x+bb.w&&y>=bb.y&&y<=bb.y+bb.h);
    if(!b){ toast('Tap an ENEMY brick next to you!'); return; }
    if(Math.hypot(b.x+20-px, b.y+20-py)>140){ toast('Get closer to breach!'); return; }
    if(SAVE.coins<CLASH.COST){ toast('Need 🪙10 to breach!'); return; }
    SAVE.coins-=CLASH.COST; persist(); updateCoinDisplays();
    clashRemoveBrick(C,b); addShake(4); SFX.hit(); return;
  }
  if(C.weapon==='gun'){
    if(!C.gunOwned || Game.t<C.gunCdUntil) return;
    C.gunCdUntil=Game.t+600;
    const dx=x-px, dy=y-py, d=Math.hypot(dx,dy)||1;
    C.shots.push({x:px, y:py, vx:dx/d*10, vy:dy/d*10, mine:true, born:Game.t});
    SFX.jump(); return;
  }
  // sword: swing — bonks the bot if it's close
  if(Game.t<C.swordCdUntil) return;
  C.swordCdUntil=Game.t+500;
  C.fx.push({e:'🗡️', x:px+p.facing*26, y:py, vy:0, life:0.5});
  const b=C.bot;
  if(Math.hypot(b.x+17-px, b.y+17-py)<85){
    b.stunUntil=Game.t+1500; b.vx=p.facing*6; addShake(3); SFX.hit(); toast('🗡️ Bonk!');
  }
}

/* ---------- the main clash brain (runs every frame) ---------- */
function updateClash(dt){
  const C=Game.clashC; if(!C) return;
  const p=Game.player, t=Game.t;

  // ----- phase timer -----
  if(C.phase==='build'){
    if(t>=C.buildUntil){
      C.phase='battle'; renderClashBar();
      toast('⚔️ BATTLE! Steal their 🏀 and bring it home!'); SFX.rare(); addShake(5);
    }
  }
  clashSetHud(C);

  // ----- solid bricks: push the player (and bot) out sideways/below -----
  clashSolid(p);
  // keep the player from sneaking into the enemy zone before battle
  if(C.phase==='build' && p.x>1000){ p.x=1000; p.vx=0; }

  // ----- bot -----
  clashBot(C,dt);

  // ----- cannons -----
  for(const cn of C.cannons){
    const target = cn.mine ? {x:C.bot.x+17, y:C.bot.y+17} : {x:p.x+p.w/2, y:p.y+p.h/2};
    if(C.phase!=='battle') continue;
    const dx=target.x-cn.x, dy=target.y-cn.y, d=Math.hypot(dx,dy);
    if(d<360 && t-cn.lastFire>2500){
      cn.lastFire=t;
      C.shots.push({x:cn.x, y:cn.y, vx:dx/d*7, vy:dy/d*7, mine:cn.mine, born:t});
      C.fx.push({e:'💨', x:cn.x, y:cn.y-10, vy:-0.5, life:0.8});
    }
  }
  // ----- shots -----
  for(let i=C.shots.length-1;i>=0;i--){ const s=C.shots[i];
    s.x+=s.vx; s.y+=s.vy;
    if(t-s.born>1600 || s.x<0||s.x>CLASH.W){ C.shots.splice(i,1); continue; }
    if(C.bricks.some(b=>s.x>b.x&&s.x<b.x+b.w&&s.y>b.y&&s.y<b.y+b.h)){ C.shots.splice(i,1); continue; }
    if(s.mine){ const b=C.bot;
      if(s.x>b.x&&s.x<b.x+b.w&&s.y>b.y&&s.y<b.y+b.h){ b.stunUntil=Math.max(b.stunUntil,t+1000); b.vx=s.vx>0?4:-4; C.shots.splice(i,1); SFX.hit(); }
    } else if(s.x>p.x&&s.x<p.x+p.w&&s.y>p.y&&s.y<p.y+p.h && p.invuln<=0){
      Game.stunUntil=Math.max(Game.stunUntil||0,t+1000); p.vx=s.vx>0?5:-5; p.invuln=600; C.shots.splice(i,1); addShake(4); SFX.hit(); toast('💥 Cannon hit!');
    }
  }
  // ----- traps -----
  for(let i=C.traps.length-1;i>=0;i--){ const tr=C.traps[i];
    if(C.phase!=='battle') break;
    if(tr.mine){ const b=C.bot;
      if(Math.abs(b.x+17-tr.x)<26 && Math.abs(b.y+34-tr.y)<26){ b.stunUntil=Math.max(b.stunUntil,t+2000); C.traps.splice(i,1); C.fx.push({e:'🪤',x:tr.x,y:tr.y-14,vy:-1,life:1}); SFX.hit(); toast('🪤 The bot stepped in your trap!'); }
    } else if(Math.abs(p.x+p.w/2-tr.x)<26 && Math.abs(p.y+p.h-tr.y)<26){
      Game.stunUntil=Math.max(Game.stunUntil||0,t+2000); C.traps.splice(i,1); C.fx.push({e:'🪤',x:tr.x,y:tr.y-14,vy:-1,life:1}); addShake(4); SFX.hit(); toast('🪤 Trapped! Stunned for 2s!');
    }
  }
  // ----- carrying + tags -----
  if(C.foeBall.carrier==='me'){ C.foeBall.x=p.x+p.w/2; C.foeBall.y=p.y-16; }
  if(C.myBall.carrier==='bot'){ C.myBall.x=C.bot.x+17; C.myBall.y=C.bot.y-14; }
  const touching = Math.hypot(C.bot.x+17-(p.x+p.w/2), C.bot.y+17-(p.y+p.h/2)) < 42;
  if(C.phase==='battle' && touching){
    if(C.myBall.carrier==='bot'){   // I tag the thief -> my ball flies home
      C.myBall.carrier=null; C.myBall.x=C.myBall.hx; C.myBall.y=C.myBall.hy;
      C.bot.stunUntil=Math.max(C.bot.stunUntil,t+1200);
      addShake(5); SFX.rare(); toast('🖐️ TAGGED! Your ball zoomed back home!');
    } else if(C.foeBall.carrier==='me' && t>=(C.bot.stunUntil||0)){   // the bot tags me
      C.foeBall.carrier=null; C.foeBall.x=C.foeBall.hx; C.foeBall.y=C.foeBall.hy;
      Game.stunUntil=Math.max(Game.stunUntil||0,t+1000);
      addShake(4); SFX.hit(); toast('😱 Tagged! Their ball went back!');
    }
  }
  // ----- pick up / put down button -----
  clashActionBtn(C);
  // ----- fx -----
  for(let i=C.fx.length-1;i>=0;i--){ const f=C.fx[i]; f.y+=f.vy||0; f.life-=dt*1.4; if(f.life<=0) C.fx.splice(i,1); }
}

function clashSetHud(C){
  const el=document.getElementById('hudCp'); if(!el) return;
  let txt;
  if(C.phase==='build'){ const s=Math.max(0,Math.ceil((C.buildUntil-Game.t)/1000));
    txt='🏰 Build: '+Math.floor(s/60)+':'+('0'+s%60).slice(-2);
  } else txt = C.foeBall.carrier==='me' ? '🏀 RUN HOME!' : C.myBall.carrier==='bot' ? '😱 They have YOUR ball!' : '⚔️ Steal their 🏀!';
  if(txt!==C.hudTxt){ C.hudTxt=txt; el.textContent=txt; }
  const lv=document.getElementById('hudLevel'); if(lv && lv.textContent!=='🏰 Area Clash') lv.textContent='🏰 Area Clash';
}

function clashActionBtn(C){
  const ab=document.getElementById('clashActBtn'); if(!ab) return;
  const p=Game.player; let txt='';
  if(C.phase==='battle'){
    if(C.foeBall.carrier==='me' && inZone(CLASH.ZONE_ME, p.x+p.w/2)) txt='⬇ Put down — WIN!';
    else if(!C.foeBall.carrier && Math.hypot(C.foeBall.x-(p.x+p.w/2), C.foeBall.y-(p.y+p.h/2))<70) txt='🏀 Pick up!';
  } else if(C.phase==='build') txt='';
  if(txt!==C.actTxt){ C.actTxt=txt; ab.style.display=txt?'block':'none'; ab.textContent=txt; }
}
function clashAction(){
  const C=Game.clashC; if(!C || C.phase!=='battle') return;
  const p=Game.player;
  if(C.foeBall.carrier==='me' && inZone(CLASH.ZONE_ME, p.x+p.w/2)){ clashEnd(true); return; }
  if(!C.foeBall.carrier && Math.hypot(C.foeBall.x-(p.x+p.w/2), C.foeBall.y-(p.y+p.h/2))<70){
    C.foeBall.carrier='me'; SFX.coin(); toast('🏀 GOT IT — run home!');
  }
}

/* full-solid collision against castle bricks (walls actually block you) */
function clashSolid(ent){
  const C=Game.clashC; if(!C) return;
  for(const b of C.bricks){
    if(!(ent.x<b.x+b.w && ent.x+ent.w>b.x && ent.y<b.y+b.h && ent.y+ent.h>b.y)) continue;
    const pushR=(b.x+b.w)-ent.x, pushL=(ent.x+ent.w)-b.x, pushD=(b.y+b.h)-ent.y, pushU=(ent.y+ent.h)-b.y;
    const m=Math.min(pushR,pushL,pushD,pushU);
    if(m===pushU){ ent.y=b.y-ent.h; if(ent.vy>0)ent.vy=0; ent.onGround=true; }
    else if(m===pushD){ ent.y=b.y+b.h; if(ent.vy<0)ent.vy=0; }
    else if(m===pushL){ ent.x=b.x-ent.w; ent.vx=0; }
    else { ent.x=b.x+b.w; ent.vx=0; }
  }
}

/* ---------- the Builder Bot ---------- */
function clashBot(C,dt){
  const b=C.bot, t=Game.t, p=Game.player;
  // build phase: lay one blueprint piece at a time
  if(C.phase==='build'){
    C.botBuildT+=dt;
    if(C.botBuildT>1.1 && C.botPlan.length){
      C.botBuildT=0; const piece=C.botPlan.shift();
      if(piece.k==='brick') clashAddBrick(C,{x:piece.x, y:piece.y, col:piece.col, mine:false});
      else if(piece.k==='cannon') C.cannons.push({x:piece.x+20, y:piece.y+20, mine:false, dir:-1, lastFire:0});
      else C.traps.push({x:piece.x, y:piece.y, mine:false});
    }
    return;
  }
  if(t < b.stunUntil){ b.vx=0; clashBotPhysics(b); return; }
  // pick a goal: bring MY ball home > chase me if I carry > go steal my ball
  let goalX;
  if(C.myBall.carrier==='bot'){ goalX=1900; if(b.x>1500){ clashEnd(false); return; } }
  else if(C.foeBall.carrier==='me'){ goalX=p.x; }
  else goalX=C.myBall.x-17;
  const dir=goalX>b.x+17?1:-1; b.vx=dir*CLASH.BOT_SPEED; b.facing=dir;
  // grab / steal
  if(!C.myBall.carrier && Math.abs(C.myBall.x-(b.x+17))<40 && Math.abs(C.myBall.y-(b.y+17))<60){
    C.myBall.carrier='bot'; toast('😱 The bot grabbed your ball — TAG IT!'); SFX.hit();
  }
  const oldX=b.x;
  clashBotPhysics(b);
  // blocked by a wall? jump; still stuck? breach a brick like a player would
  if(Math.abs(b.x-oldX)<0.4){
    C.blockedT=(C.blockedT||0)+dt;
    if(b.onGround && C.blockedT>0.25) b.vy=CLASH.BOT_JUMP;
    if(C.blockedT>1.4 && t-b.breachAt>1600){
      const bx=b.x+17+dir*40, by=b.y+17;
      const brick=C.bricks.find(bb=>bb.mine && bx>=bb.x&&bx<=bb.x+bb.w && by>=bb.y-20&&by<=bb.y+bb.h+20);
      if(brick){ b.breachAt=t; clashRemoveBrick(C,brick); SFX.hit(); toast('💥 The bot smashed one of your bricks!'); }
      C.blockedT=0;
    }
  } else C.blockedT=0;
}
function clashBotPhysics(b){
  b.vy+=0.86; if(b.vy>17)b.vy=17;
  b.x+=b.vx; b.y+=b.vy; b.onGround=false;
  if(b.y+b.h>=CLASH.FLOOR_TOP){ b.y=CLASH.FLOOR_TOP-b.h; b.vy=0; b.onGround=true; }
  b.x=Math.max(0,Math.min(CLASH.W-b.w,b.x));
  clashSolid(b);
  // land on the middle hop-blocks too
  if(b.vy>=0) for(const pl of Game.world.platforms){
    if(pl.type!=='normal') continue;
    if(b.x<pl.x+pl.w && b.x+b.w>pl.x && b.y+b.h>=pl.y && b.y+b.h<=pl.y+16){ b.y=pl.y-b.h; b.vy=0; b.onGround=true; }
  }
}

/* ---------- win / lose ---------- */
function clashEnd(won){
  if(Game.finished) return;
  Game.finished=true;
  const ab=document.getElementById('clashActBtn'); if(ab) ab.style.display='none';
  const cb=document.getElementById('clashBar'); if(cb) cb.style.display='none';
  if(won){ addCoins(CLASH.WIN_COINS); SFX.win(); } else SFX.hit();
  if(Game.onLevelComplete) Game.onLevelComplete(1, won?CLASH.WIN_COINS:0, false, {clash:true, survived:won});
}

/* ---------- drawing (world space) ---------- */
function drawClash(ctx){
  const C=Game.clashC; if(!C) return;
  // zone tints + banners
  ctx.globalAlpha=0.08;
  ctx.fillStyle='#74a8ff'; ctx.fillRect(CLASH.ZONE_ME.x0,80,CLASH.ZONE_ME.x1-CLASH.ZONE_ME.x0,CLASH.FLOOR_TOP-80);
  ctx.fillStyle='#ff8f8f'; ctx.fillRect(CLASH.ZONE_FOE.x0,80,CLASH.ZONE_FOE.x1-CLASH.ZONE_FOE.x0,CLASH.FLOOR_TOP-80);
  ctx.globalAlpha=1;
  ctx.font='bold 22px Nunito'; ctx.textAlign='center'; ctx.fillStyle='rgba(90,80,140,.5)';
  ctx.fillText('🏠 YOUR CASTLE', 440, 120); ctx.fillText('🏰 THEIR CASTLE', 1760, 120);
  // cannons, traps
  ctx.textBaseline='middle';
  for(const cn of C.cannons){ ctx.font='26px serif'; ctx.fillText('💣', cn.x, cn.y); }
  for(const tr of C.traps){ ctx.font='20px serif'; ctx.globalAlpha=tr.mine?1:(C.phase==='build'?1:0.35); ctx.fillText('🪤', tr.x, tr.y); ctx.globalAlpha=1; }
  // balls (the enemy's is always visible so you can hunt it)
  ctx.font='24px serif';
  ctx.fillText('🏀', C.myBall.x, C.myBall.y);
  ctx.fillText('🏀', C.foeBall.x, C.foeBall.y);
  // shots
  ctx.font='14px serif'; for(const s of C.shots) ctx.fillText('⚫', s.x, s.y);
  // the Builder Bot
  const b=C.bot;
  ctx.save();
  if(Game.t<b.stunUntil) ctx.globalAlpha=0.6;
  if(typeof drawCharacter==='function') drawCharacter(ctx, b.x+17, b.y+17, 34, {skin:'#ff8f8f', accessory:'crown', face:'cheeky', facing:b.facing, t:Game.t});
  ctx.restore();
  if(Game.t<b.stunUntil){ ctx.font='18px serif'; ctx.fillText('😵', b.x+17, b.y-14); }
  drawNameTag(ctx, b.x+17, b.y-8, 'Builder Bot');
  // fx
  for(const f of C.fx){ ctx.globalAlpha=Math.max(0,f.life); ctx.font='18px serif'; ctx.fillText(f.e, f.x, f.y); ctx.globalAlpha=1; }
}
