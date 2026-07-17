/* ===== OBBY MAKER 🛠️ =====
   Build your OWN obby — solo, or side-by-side with a friend in a room.

   BUILD: tap the palette, then tap the world to place pieces in your zone —
   coloured bricks, side-to-side movers, push-pads (conveyors), vanishing
   bricks, bouncy pads, spikes, shooters and a 🏁 finish flag.
   ▶ DONE: test your obby from the start pad. 🔨 Keep working to build more.
   In a room your friend builds the zone NEXT DOOR — walk over and try theirs!
   When you're BOTH done, press 🔗 Combine to merge the two obbys into one
   giant course. 💾 Save keeps it on the My Obbys screen (with who you made it
   with) so you can play it again any time. */

const MAKER = {
  GRID:40, FLOOR_TOP:516, W:4600, H:560,
  ZONE_L:{x0:40, x1:2200}, ZONE_R:{x0:2400, x1:4560},
  MAX_PIECES:400,
};

function generateMaker(seed){
  const platforms=[{id:0, x:0, y:MAKER.FLOOR_TOP, w:MAKER.W, h:MAKER.H, type:'big', room:true}];
  return { level:1, seed, mode:'maker', width:MAKER.W, height:MAKER.H,
    platforms, checkpoints:[], bosses:[],
    start:{x:120, y:MAKER.FLOOR_TOP-40}, finishY:-1e9 };
}

function initMaker(){
  const mp=Game.multiplayer;
  const hostSide = !mp || MP.isHost;
  const zMe  = hostSide ? MAKER.ZONE_L : MAKER.ZONE_R;
  const zFoe = hostSide ? MAKER.ZONE_R : MAKER.ZONE_L;
  Game.world.start = { x: zMe.x0+80, y: MAKER.FLOOR_TOP-40 };
  const M = Game.makerC = {
    mp, hostSide, zMe, zFoe,
    mode:'build',                 // 'build' | 'test'
    combined:false, meDone:false, foeDone:false,
    sel:'brick', color:'#cdb8ff',
    pieces:[],                    // every placed piece {k,x,y,col,dir,mine,ref?}
    spikes:[], shooters:[], finishes:[], shots:[], fx:[],
    hudTxt:'', saveIdx:null, loadedWith:null,
  };
  // playing/editing a saved obby?
  if(!mp && typeof Game.makerLoad==='number' && SAVE.myObbys && SAVE.myObbys[Game.makerLoad]){
    const sv=SAVE.myObbys[Game.makerLoad];
    M.saveIdx=Game.makerLoad; M.loadedWith=sv.with||null;
    for(const pc of sv.pieces) makerPlace(M, pc, true);
    M.mode='test'; M.combined=true;
    Game.world.start={x:MAKER.ZONE_L.x0+80, y:MAKER.FLOOR_TOP-40};
    toast('▶ '+(sv.name||'Your obby')+' — reach a 🏁 to finish!');
  } else {
    toast(mp ? '🛠️ BUILD! Your friend has the zone next door →'
             : '🛠️ BUILD your obby! Tap a piece, then tap the world.');
  }
  renderMakerBar(); renderMakerActs();
}

function makerSend(d){
  if(Game.multiplayer && typeof mpSend==='function')
    mpSend(Object.assign({t:'maker', from:MP.selfId}, d));
}
function onMakerNet(msg){
  const M=Game.makerC; if(!M) return;
  switch(msg.a){
    case 'add': makerPlace(M, {k:msg.k, x:msg.x, y:msg.y, col:msg.col, dir:msg.dir}, false); break;
    case 'rm':  { const pc=M.pieces.find(p=>!p.mine && p.x===msg.x && p.y===msg.y && p.k===msg.k); if(pc) makerRemove(M,pc); break; }
    case 'done': M.foeDone=!!msg.on; renderMakerActs();
                 toast(msg.on ? '🎉 Your friend finished building — go try their obby!' : '🔨 Your friend is building again…'); break;
    case 'combine': makerCombine(M, true); break;
  }
}

/* ---------- placing pieces ---------- */
const MAKER_COLORS=['#cdb8ff','#ffc7e6','#9be7a0','#9cc4ff','#ffe177','#ff8f8f','#ffffff','#6b5b78'];
const MAKER_PIECES=[
  {k:'brick',    ico:'🧱', name:'Brick'},
  {k:'mover',    ico:'↔️', name:'Mover'},
  {k:'pushR',    ico:'➡️', name:'Push'},
  {k:'pushL',    ico:'⬅️', name:'Push'},
  {k:'vanish',   ico:'🫥', name:'Vanish'},
  {k:'bouncy',   ico:'🦘', name:'Bouncy'},
  {k:'spike',    ico:'🔺', name:'Spikes'},
  {k:'shooter',  ico:'🔫', name:'Shooter'},
  {k:'finish',   ico:'🏁', name:'Finish'},
  {k:'erase',    ico:'❌', name:'Remove'},
];

/* create a piece (from my tap, the friend's message, or a save file) */
function makerPlace(M, pc, mineFromSave){
  if(M.pieces.length>=MAKER.MAX_PIECES){ toast('Your obby is FULL! (400 pieces)'); return null; }
  const g=MAKER.GRID, x=pc.x, y=pc.y;
  const piece={k:pc.k, x, y, col:pc.col||'#cdb8ff', dir:pc.dir||1, mine:mineFromSave!==false && pc.mine!==false};
  if(mineFromSave===false) piece.mine=false;
  let ref=null;
  if(pc.k==='brick'){
    ref={id:'mk'+x+'_'+y, type:'brick', x, y, w:g, h:g, col:piece.col};
  } else if(pc.k==='mover'){
    ref={id:'mk'+x+'_'+y, type:'mover', x, y, w:80, h:18, base:x, amp:60, omega:(2*Math.PI)/1400, phase:(x+y)%6.28, dx:0};
  } else if(pc.k==='pushR' || pc.k==='pushL'){
    ref={id:'mk'+x+'_'+y, type:'conveyor', x, y, w:80, h:18, dir:pc.k==='pushR'?1:-1};
  } else if(pc.k==='vanish'){
    ref={id:'mk'+x+'_'+y, type:'disappear', x, y, w:g, h:18, crumbleMs:1500};
  } else if(pc.k==='bouncy'){
    ref={id:'mk'+x+'_'+y, type:'bouncy', x, y, w:60, h:18};
  } else if(pc.k==='spike'){
    M.spikes.push(piece);
  } else if(pc.k==='shooter'){
    piece.lastFire=0; M.shooters.push(piece);
  } else if(pc.k==='finish'){
    M.finishes.push(piece);
  }
  if(ref){ piece.ref=ref; Game.world.platforms.push(ref); Game.activePlats=null; }
  M.pieces.push(piece);
  return piece;
}
function makerRemove(M,pc){
  M.pieces=M.pieces.filter(p=>p!==pc);
  if(pc.ref){ Game.world.platforms=Game.world.platforms.filter(p=>p!==pc.ref); Game.activePlats=null; }
  M.spikes=M.spikes.filter(p=>p!==pc);
  M.shooters=M.shooters.filter(p=>p!==pc);
  M.finishes=M.finishes.filter(p=>p!==pc);
  for(let i=0;i<4;i++) M.fx.push({e:'💨', x:pc.x+20+(Math.random()*20-10), y:pc.y+10, vy:-0.8, life:0.8});
}

function makerTap(sx,sy){
  const M=Game.makerC; if(!M || Game.finished) return true;
  if(M.mode!=='build') return true;         // no editing while testing
  const s=gameScale();
  const x=(sx-Game.W/2)/s + Game.cam.x, y=(sy-Game.H/2)/s + Game.cam.y;
  if(!(x>=M.zMe.x0 && x<=M.zMe.x1) || y>MAKER.FLOOR_TOP || y<40){ toast('Build inside YOUR zone!'); return true; }
  const g=MAKER.GRID, gx=Math.floor(x/g)*g, gy=Math.floor(y/g)*g;
  const here=M.pieces.find(p=>p.mine && x>=p.x && x<=p.x+((p.ref&&p.ref.w)||g) && y>=p.y && y<=p.y+((p.ref&&p.ref.h)||g));
  if(M.sel==='erase'){
    if(here){ makerRemove(M,here); makerSend({a:'rm', k:here.k, x:here.x, y:here.y}); SFX.click(); }
    return true;
  }
  if(here) return true;                     // one piece per spot
  const pc=makerPlace(M, {k:M.sel, x:gx, y:gy, col:M.color, mine:true});
  if(pc){ makerSend({a:'add', k:pc.k, x:pc.x, y:pc.y, col:pc.col, dir:pc.dir}); SFX.click(); }
  return true;
}

/* ---------- bars & buttons ---------- */
function renderMakerBar(){
  const bar=document.getElementById('makerBar'); if(!bar) return;
  const M=Game.makerC; if(!M){ bar.style.display='none'; return; }
  if(M.mode!=='build'){ bar.style.display='none'; return; }
  bar.style.display='flex';
  bar.innerHTML = MAKER_PIECES.map(p=>
    `<button class="btn ${M.sel===p.k?'pink':'ghost'} small" style="width:auto;pointer-events:auto" onclick="makerSel('${p.k}')">${p.ico} ${p.name}</button>`
  ).join('') +
  `<div class="build-colours">`+MAKER_COLORS.map(col=>`<div class="bcol${M.color===col?' sel':''}" style="background:${col}" onclick="makerColor('${col}')"></div>`).join('')+`</div>`;
}
function renderMakerActs(){
  const el=document.getElementById('makerActs'); if(!el) return;
  const M=Game.makerC; if(!M){ el.style.display='none'; return; }
  el.style.display='flex';
  const b=(label,fn,cls)=>`<button class="btn ${cls||'gold'} small" style="width:auto;pointer-events:auto" onclick="${fn}">${label}</button>`;
  let html='';
  if(M.mode==='build'){
    html += b('✅ Done — test it!','makerDone()');
  } else {
    if(!M.combined) html += b('🔨 Keep working','makerKeepWorking()','blue');
    if(M.mp && M.meDone && M.foeDone && !M.combined) html += b('🔗 Combine obbys!','makerDoCombine()','pink');
    html += b('💾 Save','makerSave()');
  }
  el.innerHTML=html;
}
function makerSel(k){ const M=Game.makerC; if(M){ M.sel=k; SFX.click(); renderMakerBar(); } }
function makerColor(c){ const M=Game.makerC; if(M){ M.color=c; SFX.click(); renderMakerBar(); } }

function makerDone(){
  const M=Game.makerC; if(!M) return;
  M.mode='test'; M.meDone=true;
  makerSend({a:'done', on:true});
  makerRespawn();
  toast(M.mp ? '▶ TEST! Try yours — or walk over and try your friend\'s!' : '▶ TEST! Reach a 🏁 to finish!');
  SFX.chest(); renderMakerBar(); renderMakerActs();
}
function makerKeepWorking(){
  const M=Game.makerC; if(!M) return;
  M.mode='build'; M.meDone=false;
  makerSend({a:'done', on:false});
  toast('🔨 Back to building!');
  SFX.click(); renderMakerBar(); renderMakerActs();
}
function makerDoCombine(){
  const M=Game.makerC; if(!M || !M.mp || !M.meDone || !M.foeDone) return;
  makerSend({a:'combine'});
  makerCombine(M, false);
}
function makerCombine(M, fromNet){
  if(M.combined) return;
  M.combined=true; M.mode='test';
  Game.world.start={x:MAKER.ZONE_L.x0+80, y:MAKER.FLOOR_TOP-40};
  makerRespawn();
  addShake(5); SFX.rare();
  toast('🔗 OBBYS COMBINED! One giant course — go go go!');
  renderMakerBar(); renderMakerActs();
}
function makerRespawn(){
  const M=Game.makerC; const p=Game.player; if(!M||!p) return;
  Game.disappear={};                       // vanished bricks come back
  const sx = M.combined ? MAKER.ZONE_L.x0+80 : M.zMe.x0+80;
  p.x=sx; p.y=MAKER.FLOOR_TOP-40-p.h; p.vx=0; p.vy=0; p.invuln=Math.max(p.invuln||0,800);
}

/* ---------- saving ---------- */
function makerSave(){
  const M=Game.makerC; if(!M) return;
  if(!M.pieces.length){ toast('Build something first!'); return; }
  if(!SAVE.myObbys) SAVE.myObbys=[];
  const friend = M.mp ? ((mpRemoteList()[0]||{}).name||'a friend') : M.loadedWith;
  const data={ name: null, with: friend||null, created: Date.now(),
    pieces: M.pieces.map(p=>({k:p.k, x:p.x, y:p.y, col:p.col, dir:p.dir})) };
  if(M.saveIdx!=null && SAVE.myObbys[M.saveIdx]){
    data.name=SAVE.myObbys[M.saveIdx].name;
    SAVE.myObbys[M.saveIdx]=data;
  } else {
    data.name='Obby #'+(SAVE.myObbys.length+1);
    SAVE.myObbys.push(data);
    M.saveIdx=SAVE.myObbys.length-1;
    if(SAVE.myObbys.length>20){ SAVE.myObbys.shift(); M.saveIdx--; }
  }
  persist();
  SFX.win(); toast('💾 Saved! Find it in 🛠️ My Obbys on the home screen');
}

/* ---------- per-frame ---------- */
function updateMaker(dt){
  const M=Game.makerC; if(!M) return;
  const p=Game.player, t=Game.t;
  makerHud(M);
  // solid bricks
  for(const pc of M.pieces){
    if(pc.k!=='brick' || !pc.ref) continue;
    const b=pc.ref;
    if(!(p.x<b.x+b.w && p.x+p.w>b.x && p.y<b.y+b.h && p.y+p.h>b.y)) continue;
    const pushR=(b.x+b.w)-p.x, pushL=(p.x+p.w)-b.x, pushD=(b.y+b.h)-p.y, pushU=(p.y+p.h)-b.y;
    const m=Math.min(pushR,pushL,pushD,pushU);
    if(m===pushU){ p.y=b.y-p.h; if(p.vy>0)p.vy=0; p.onGround=true; }
    else if(m===pushD){ p.y=b.y+b.h; if(p.vy<0)p.vy=0; }
    else if(m===pushL){ p.x=b.x-p.w; p.vx=0; }
    else { p.x=b.x+b.w; p.vx=0; }
  }
  const testing = M.mode!=='build';
  // spikes: touch = back to the start (only while testing — safe to build on)
  if(testing) for(const sp of M.spikes){
    if(p.x<sp.x+40 && p.x+p.w>sp.x && p.y+p.h>sp.y+14 && p.y<sp.y+40 && p.invuln<=0){
      addShake(5); SFX.hit(); toast('🔺 Ouch! Back to the start!');
      makerRespawn(); break;
    }
  }
  // shooters fire while testing
  if(testing) for(const sh of M.shooters){
    if(t-(sh.lastFire||0)>2200){
      sh.lastFire=t;
      M.shots.push({x:sh.x+20, y:sh.y+20, vx:(sh.dir||1)*-6, born:t});   // shoots toward the start (left)
    }
  }
  for(let i=M.shots.length-1;i>=0;i--){ const s=M.shots[i];
    s.x+=s.vx;
    if(t-s.born>2500 || s.x<0 || s.x>MAKER.W){ M.shots.splice(i,1); continue; }
    if(testing && s.x>p.x && s.x<p.x+p.w && s.y>p.y && s.y<p.y+p.h && p.invuln<=0){
      M.shots.splice(i,1); addShake(5); SFX.hit(); toast('🔫 Zapped! Back to the start!');
      makerRespawn(); continue;
    }
  }
  // finish flags
  if(testing) for(const f of M.finishes){
    if(p.x<f.x+40 && p.x+p.w>f.x && p.y+p.h>f.y && p.y<f.y+48){
      addShake(4); SFX.win();
      for(let i=0;i<14;i++) M.fx.push({e:['🎉','⭐','🏁'][i%3], x:f.x+20+(Math.random()*60-30), y:f.y+(Math.random()*40-30), vy:-1-Math.random(), life:1.4});
      toast('🏁 YOU FINISHED THE OBBY! 🎉');
      makerRespawn(); break;
    }
  }
  for(let i=M.fx.length-1;i>=0;i--){ const f=M.fx[i]; f.y+=f.vy||0; f.life-=dt*1.2; if(f.life<=0) M.fx.splice(i,1); }
}
function makerHud(M){
  const el=document.getElementById('hudCp'); if(!el) return;
  const txt = M.mode==='build' ? ('🛠️ Building… '+M.pieces.filter(p=>p.mine).length+' pieces')
            : M.combined ? '🔗 COMBINED OBBY — reach a 🏁!'
            : '▶ Testing — reach your 🏁!';
  if(txt!==M.hudTxt){ M.hudTxt=txt; el.textContent=txt; }
  const lv=document.getElementById('hudLevel'); if(lv && lv.textContent!=='🛠️ Obby Maker') lv.textContent='🛠️ Obby Maker';
}

/* ---------- drawing ---------- */
function drawMaker(ctx){
  const M=Game.makerC; if(!M) return;
  // zone tints + labels (only interesting with a friend)
  if(M.mp || M.combined===false){
    ctx.globalAlpha=0.06;
    ctx.fillStyle='#74a8ff'; ctx.fillRect(M.zMe.x0,60,M.zMe.x1-M.zMe.x0,MAKER.FLOOR_TOP-60);
    if(M.mp){ ctx.fillStyle='#ffb13c'; ctx.fillRect(M.zFoe.x0,60,M.zFoe.x1-M.zFoe.x0,MAKER.FLOOR_TOP-60); }
    ctx.globalAlpha=1;
    ctx.font='bold 22px Nunito'; ctx.textAlign='center'; ctx.fillStyle='rgba(90,80,140,.45)';
    ctx.fillText('🛠️ YOUR OBBY', (M.zMe.x0+M.zMe.x1)/2, 100);
    if(M.mp) ctx.fillText('🧑‍🤝‍🧑 FRIEND\'S OBBY', (M.zFoe.x0+M.zFoe.x1)/2, 100);
  }
  ctx.textBaseline='middle';
  // start pad
  ctx.font='26px serif';
  const sx = M.combined ? MAKER.ZONE_L.x0+80 : M.zMe.x0+80;
  ctx.fillText('🚩', sx+10, MAKER.FLOOR_TOP-20);
  // spikes
  for(const sp of M.spikes){
    ctx.fillStyle='#8d93a5';
    for(let i=0;i<3;i++){ const bx=sp.x+i*13+2;
      ctx.beginPath(); ctx.moveTo(bx, sp.y+40); ctx.lineTo(bx+6, sp.y+16); ctx.lineTo(bx+12, sp.y+40); ctx.closePath(); ctx.fill(); }
  }
  // shooters + shots
  ctx.font='24px serif';
  for(const sh of M.shooters) ctx.fillText('🔫', sh.x+20, sh.y+20);
  ctx.font='13px serif';
  for(const s of M.shots) ctx.fillText('⚫', s.x, s.y);
  // finish flags
  ctx.font='30px serif';
  for(const f of M.finishes) ctx.fillText('🏁', f.x+20, f.y+16);
  // fx
  for(const f of M.fx){ ctx.globalAlpha=Math.max(0,f.life); ctx.font='18px serif'; ctx.fillText(f.e, f.x, f.y); ctx.globalAlpha=1; }
}
