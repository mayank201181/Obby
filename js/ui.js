/* ===== UI / screen orchestration ===== */

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id);
  if(el) el.classList.add('active');
  // hide game-only chrome unless in game
  document.getElementById('gameOverlay').style.display = (id==='gameScreen')?'block':'none';
}

let toastTimer=null;
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),1800);
}

function openModal(id){ document.getElementById(id).classList.add('active'); }
function closeModal(id){ document.getElementById(id).classList.remove('active'); }
function closeChest(){ clearInterval(chestTimerInt); closeModal('chestModal'); refreshChestButton(); }

/* quit an active game back to the lobby */
function quitGame(){
  Game.running=false; cancelAnimationFrame(Game.raf);
  if(typeof stopSpectate==='function') stopSpectate();
  if(Game.multiplayer) mpLeave();
  showScreen('lobbyScreen'); initLobby();
}

/* ---------------- Preview animation ---------------- */
let previewRaf=0;
function startPreview(canvasId){
  const cv=document.getElementById(canvasId);
  const ctx=cv.getContext('2d');
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const size=150;
  cv.width=size*dpr; cv.height=size*dpr; cv.style.width=size+'px';cv.style.height=size+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  cancelAnimationFrame(previewRaf);
  const loop=t=>{
    ctx.clearRect(0,0,size,size);
    drawCharacter(ctx,size/2,size/2+6,72,{skin:SAVE.skin,accessory:SAVE.accessory,face:SAVE.face,facing:1,t,petSkin:SAVE.petSkin,shiny:SAVE.petSkin&&isShiny(SAVE.petSkin)});
    previewRaf=requestAnimationFrame(loop);
  };
  previewRaf=requestAnimationFrame(loop);
}
function stopPreview(){ cancelAnimationFrame(previewRaf); }

/* ---------------- Lobby ---------------- */
function initLobby(){
  const nameIn=document.getElementById('nameInput');
  nameIn.value=SAVE.name||'';
  nameIn.addEventListener('input',()=>{ SAVE.name=nameIn.value.slice(0,12); persist(); });
  // background picker
  const bp=document.getElementById('bgPicker');
  bp.innerHTML='';
  BG_COLORS.forEach(c=>{
    const d=document.createElement('div');
    d.className='swatch'+(SAVE.bg===c?' selected':'');
    d.style.background=c;
    d.onclick=()=>{ SAVE.bg=c; persist(); document.body.style.setProperty('--lobby-bg',c);
      [...bp.children].forEach(x=>x.classList.remove('selected')); d.classList.add('selected');
      applyLobbyBg();
    };
    bp.appendChild(d);
  });
  applyLobbyBg();
  updateCoinDisplays();
  startPreview('lobbyPreview');
  refreshChestButton();
  refreshDailyButton();
  refreshQuestButton();
  refreshHeistButton();
  refreshTodayBadge();
  if(typeof ensurePetFeed==='function') ensurePetFeed();
  startMusicIfOn('lobby');
}
function applyLobbyBg(){
  document.getElementById('lobbyScreen').style.background =
    `linear-gradient(135deg, ${SAVE.bg} 0%, var(--purple) 60%, var(--blue) 120%)`;
}

/* ---------------- Customize / Shop ---------------- */
let customTab='skins';
function openCustomize(){
  showScreen('customizeScreen');
  startPreview('customPreview');
  renderCustomize();
}
function setTab(tab){ customTab=tab; renderCustomize(); }

function renderCustomize(){
  document.querySelectorAll('#customTabs .tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.tab===customTab);
  });
  updateCoinDisplays();
  const grid=document.getElementById('customGrid');
  grid.innerHTML='';
  if(customTab==='skins') renderSkins(grid);
  else if(customTab==='accessories') renderAccessories(grid);
  else if(customTab==='trails') renderTrails(grid);
  else renderFaces(grid);
}

function renderTrails(grid){
  TRAILS.forEach(t=>{
    const owned=SAVE.ownedTrails.includes(t.id);
    const sw=document.createElement('div');
    sw.className='swatch'+(SAVE.trail===t.id?' selected':'')+(!owned?' locked':'');
    if(t.color==='rainbow') sw.classList.add('rainbow');
    else if(t.color==='royal') sw.classList.add('royal');
    else if(t.color) sw.style.background=t.color;
    else if(t.emoji){ sw.style.background='#fff'; sw.textContent=t.emoji; }
    else { sw.style.background='#fff'; sw.textContent='🚫'; }
    if(!owned){ const p=document.createElement('span');p.className='price';p.textContent=t.special?'🌟':('🪙'+t.price);sw.appendChild(p); }
    sw.onclick=()=>buyOrEquip('trail',t,owned);
    grid.appendChild(sw);
  });
}

function renderSkins(grid){
  SKINS.forEach(s=>{
    const owned=SAVE.ownedSkins.includes(s.id);
    const sw=document.createElement('div');
    sw.className='swatch'+(SAVE.skin===s.id?' selected':'')+(!owned?' locked':'');
    if(s.color==='rainbow') sw.classList.add('rainbow');
    else if(s.color==='galaxy') sw.style.background='radial-gradient(circle at 35% 30%,#7b5cff,#140f33)';
    else sw.style.background=s.color;
    if(!owned){
      const p=document.createElement('span');p.className='price';
      p.textContent = s.special?'Chest':('🪙'+s.price);
      sw.appendChild(p);
    }
    sw.onclick=()=>buyOrEquip('skin',s,owned);
    grid.appendChild(sw);
  });
}
function renderAccessories(grid){
  ACCESSORIES.forEach(a=>{
    const owned=SAVE.ownedAccessories.includes(a.id);
    const sw=document.createElement('div');
    sw.className='swatch'+(SAVE.accessory===a.id?' selected':'')+(!owned?' locked':'');
    sw.style.background='#fff';sw.textContent=a.emoji;
    if(!owned){const p=document.createElement('span');p.className='price';p.textContent='🪙'+a.price;sw.appendChild(p);}
    sw.onclick=()=>buyOrEquip('accessory',a,owned);
    grid.appendChild(sw);
  });
}
function renderFaces(grid){
  FACES.forEach(f=>{
    const owned=SAVE.ownedFaces.includes(f.id);
    const sw=document.createElement('div');
    sw.className='swatch'+(SAVE.face===f.id?' selected':'')+(!owned?' locked':'');
    sw.style.background='#fff';
    // mini face preview
    const c=document.createElement('canvas');c.width=70;c.height=70;c.style.width='100%';c.style.height='100%';
    const cx=c.getContext('2d');
    drawCharacter(cx,35,38,52,{skin:SAVE.skin,accessory:'none',face:f.id,facing:1,t:0});
    sw.appendChild(c);
    if(!owned){const p=document.createElement('span');p.className='price';p.textContent=f.special?'Chest':(f.price>0?'🪙'+f.price:'Free');sw.appendChild(p);}
    sw.onclick=()=>buyOrEquip('face',f,owned);
    grid.appendChild(sw);
  });
}

function buyOrEquip(kind,item,owned){
  SFX.click();
  if(owned){
    if(kind==='skin'){ SAVE.skin=item.id; SAVE.petSkin=null; } // a normal skin clears a worn pet
    if(kind==='accessory')SAVE.accessory=item.id;
    if(kind==='face')SAVE.face=item.id;
    if(kind==='trail')SAVE.trail=item.id;
    persist();renderCustomize();
    return;
  }
  if(item.special){ toast('🎁 Only from the Daily Chest!'); return; }
  if(item.price>0 && SAVE.coins<item.price){ toast('Not enough coins 🪙'); return; }
  // purchase
  if(item.price>0) SAVE.coins-=item.price;
  if(kind==='skin'){ SAVE.ownedSkins.push(item.id); SAVE.skin=item.id; SAVE.petSkin=null; }
  if(kind==='accessory'){ SAVE.ownedAccessories.push(item.id); SAVE.accessory=item.id; }
  if(kind==='face'){ SAVE.ownedFaces.push(item.id); SAVE.face=item.id; }
  if(kind==='trail'){ SAVE.ownedTrails.push(item.id); SAVE.trail=item.id; }
  persist(); renderCustomize();
  toast(item.price>0?('Unlocked! −🪙'+item.price):'Equipped!');
}

/* ---------------- Daily Chest ---------------- */
function refreshChestButton(){
  const btn=document.getElementById('chestBtn');
  if(!btn) return;
  const ready = nowMs()-SAVE.chestLastClaim >= DAY_MS || SAVE.chestLastClaim===0;
  btn.classList.toggle('ready',ready);
  document.getElementById('chestReadyDot').style.display=ready?'inline-block':'none';
}
function openChest(){
  openModal('chestModal');
  const body=document.getElementById('chestBody');
  const ready = nowMs()-SAVE.chestLastClaim >= DAY_MS || SAVE.chestLastClaim===0;
  if(!ready){
    const left=DAY_MS-(nowMs()-SAVE.chestLastClaim);
    body.innerHTML=`<div class="chest-emoji">🎁</div>
      <h2>Come back soon!</h2>
      <p class="muted">Day ${SAVE.chestStreak} streak · every 5th day = something rare ✨</p>
      <div class="timer-big" id="chestTimer"></div>`;
    startChestTimer(left);
    document.getElementById('chestClaim').style.display='none';
  }else{
    const willStreak = (nowMs()-SAVE.chestLastClaim < 2*DAY_MS && SAVE.chestLastClaim>0)? SAVE.chestStreak+1 : 1;
    const special = willStreak%5===0;
    body.innerHTML=`<div class="chest-emoji">🎁</div>
      <h2>${special?'✨ RARE Chest ✨':'Daily Chest'}</h2>
      <p class="muted">Day ${willStreak} ${special?'· guaranteed rare reward!':'· random goodie'}</p>`;
    const claim=document.getElementById('chestClaim');
    claim.style.display='';claim.onclick=()=>doClaimChest(special,willStreak);
  }
}
let chestTimerInt=null;
function startChestTimer(left){
  clearInterval(chestTimerInt);
  const el=()=>document.getElementById('chestTimer');
  const tick=()=>{
    left-=1000;if(left<0){clearInterval(chestTimerInt);openChest();return;}
    const h=Math.floor(left/3600000),m=Math.floor(left/60000)%60,s=Math.floor(left/1000)%60;
    if(el())el().textContent=`${h}h ${m}m ${s}s`;
  };
  tick();chestTimerInt=setInterval(tick,1000);
}
function doClaimChest(special,streak){
  let reward;
  if(special){
    // guaranteed rare: special skin or face not yet owned
    const pool=[
      ...SKINS.filter(s=>s.special && !SAVE.ownedSkins.includes(s.id)).map(s=>({type:'skin',item:s})),
      ...FACES.filter(f=>f.special && !SAVE.ownedFaces.includes(f.id)).map(f=>({type:'face',item:f})),
    ];
    reward = pool.length? pool[Math.floor(Math.random()*pool.length)] : {type:'coins',amount:120};
  }else{
    const pool=[
      ...SKINS.filter(s=>!s.special && s.price>0 && !SAVE.ownedSkins.includes(s.id)).map(s=>({type:'skin',item:s})),
      ...ACCESSORIES.filter(a=>a.price>0 && !SAVE.ownedAccessories.includes(a.id)).map(a=>({type:'accessory',item:a})),
    ];
    reward = pool.length? pool[Math.floor(Math.random()*pool.length)] : {type:'coins',amount:25};
  }
  // grant
  let emoji='🪙',label='';
  if(reward.type==='coins'){ SAVE.coins+=reward.amount; emoji='🪙'; label=`${reward.amount} coins!`; }
  if(reward.type==='skin'){ SAVE.ownedSkins.push(reward.item.id); SAVE.skin=reward.item.id; emoji=reward.item.id==='rainbow'?'🌈':'🎨'; label=`${reward.item.id} skin!`; }
  if(reward.type==='accessory'){ SAVE.ownedAccessories.push(reward.item.id); emoji=reward.item.emoji; label=`${reward.item.label}!`; }
  if(reward.type==='face'){ SAVE.ownedFaces.push(reward.item.id); SAVE.face=reward.item.id; emoji='😎'; label=`${reward.item.label} face!`; }
  SAVE.chestStreak=streak; SAVE.chestLastClaim=nowMs(); persist();
  const body=document.getElementById('chestBody');
  body.innerHTML=`<div class="reward-emoji">${emoji}</div><h2>You got</h2><p class="timer-big">${label}</p>
    <p class="muted">Come back tomorrow! ${special?'':'Day '+ (streak%5===0?5:streak%5)+'/5 to a rare reward'}</p>`;
  document.getElementById('chestClaim').style.display='none';
  refreshChestButton();
  updateCoinDisplays();
}

/* ---------------- Play menu & rooms ---------------- */
function openPlay(){ showScreen('playScreen'); }

let soloDiff='hard';
function playSolo(diff){ soloDiff = (diff==='easy'?'easy':'hard'); showLevelMap(); }

function showLevelMap(){ showScreen('levelMapScreen'); renderLevelMap(); }
function renderLevelMap(){
  updateCoinDisplays();
  document.getElementById('mapTitle').textContent = (soloDiff==='easy'?'🌸 Easy':'🔥 Hard')+' — pick a level';
  const body=document.getElementById('levelMapBody');
  let html='';
  for(let lv=1; lv<=TOTAL_LEVELS; lv++){
    const unlocked = lv<=SAVE.bestLevel;
    const stars = SAVE.starsByLevel[lv]||0;
    const best = SAVE.bestTimes[lv];
    const starStr = '★★★'.slice(0,stars)+'☆☆☆'.slice(0,3-stars);
    html+=`<div class="level-node ${unlocked?'':'locked'}" onclick="${unlocked?`startSoloLevel(${lv})`:''}">
      <div class="lv-num">${unlocked?lv:'🔒'}</div>
      <div class="lv-info"><b>Level ${lv}</b>
        <div class="lv-stars">${unlocked?starStr:'locked'}</div></div>
      <div class="lv-time">${best!=null?fmtTime(best):''}</div>
    </div>`;
  }
  body.innerHTML=html;
}
function fmtTime(ms){ const s=ms/1000; return s<60? s.toFixed(1)+'s' : Math.floor(s/60)+':'+('0'+Math.floor(s%60)).slice(-2); }

function startSoloLevel(level){
  SFX.click();
  Game.multiplayer=false;
  Game.onLevelComplete=onLevelComplete;
  Game.onExit=()=>{ showLevelMap(); };
  startGame({level, seed:Math.floor(Math.random()*1e6), mode:'solo',
             multiplayer:false, difficulty:soloDiff});
  startMusicIfOn('game');
}

/* ---------------- Endless Tower ---------------- */
function startTower(){
  SFX.click();
  Game.multiplayer=false; Game.daily=false;
  Game.onLevelComplete=onLevelComplete;
  Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
  // Tower has no shooting cannons — the endless ramp + crumbly/ice/wind blocks
  // are the challenge.
  startGame({mode:'tower', seed:Math.floor(Math.random()*1e6), multiplayer:false, difficulty:'easy'});
  startMusicIfOn('tower');
}

/* ---------------- Natural Disaster Survival ---------------- */
const BUILD_COLOURS=['#cdb8ff','#ffc7e6','#9be7a0','#9cc4ff','#ffe177','#ff8f8f','#ffffff','#6b5b78'];
function openDisasterPick(){ showScreen('disasterPickScreen'); renderDisasterPick(); }
function renderDisasterPick(){
  updateCoinDisplays();
  document.getElementById('disasterPickBody').innerHTML =
    `<button class="btn gold" onclick="startDisaster('random')">🎲 Surprise Me (Random)</button>` +
    DISASTERS.map(t=>`<button class="btn blue" onclick="startDisaster('${t}')">${(DISASTER_INFO[t]||{}).name||t}</button>`).join('');
}
function startDisaster(type){
  SFX.click();
  Game.multiplayer=false;
  Game.onLevelComplete=onLevelComplete;
  Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
  startGame({mode:'disaster', seed:Math.floor(Math.random()*1e6), multiplayer:false, difficulty:'easy',
             disasterType:(type && type!=='random')?type:null});
  startMusicIfOn('tower');
  toast('🏗️ Build FAST — 5 seconds until the disaster!');
}
function setupBuildBar(){
  const c=document.getElementById('buildColours'); if(!c) return;
  c.innerHTML=BUILD_COLOURS.map(col=>`<div class="bcol${Game.buildColor===col?' sel':''}" style="background:${col}" onclick="setBuildColor('${col}')"></div>`).join('');
  const tb=document.getElementById('buildToggle'); if(tb){ tb.classList.toggle('pink',Game.buildMode); tb.textContent=Game.buildMode?'🧱 Building…':'🧱 Build'; }
  const lp=document.getElementById('lavaProofBtn'); if(lp) lp.classList.toggle('pink',Game.buildLavaProof);
}
function setBuildColor(col){ Game.buildColor=col; SFX.click(); setupBuildBar(); }
function toggleBuild(){ Game.buildMode=!Game.buildMode; SFX.click(); setupBuildBar(); if(Game.buildMode) toast('Tap the arena to place blocks!'); }
function toggleLavaProof(){ Game.buildLavaProof=!Game.buildLavaProof; SFX.click(); setupBuildBar(); }

/* ---------------- Daily Challenge ---------------- */
function dailyKey(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function dailySeed(){ const d=new Date(); return (d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate()); }
function startDaily(){
  SFX.click();
  closeModal('winModal');
  Game.multiplayer=false;
  Game.onLevelComplete=onLevelComplete;
  Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
  // same level for everyone today; a fixed mid difficulty with cannons on
  startGame({level:3, seed:dailySeed(), mode:'solo', multiplayer:false, difficulty:'hard', daily:true});
  startMusicIfOn('game');
}
/* ---------------- Gold Heist (daily 45s coin grab) ---------------- */
function startHeist(){
  SFX.click();
  const k=dailyKey();
  if(SAVE.heist && SAVE.heist.key===k && SAVE.heist.done){
    toast('💰 Heist already done today — come back tomorrow!'); return;
  }
  Game.multiplayer=false;
  Game.onLevelComplete=onLevelComplete;
  Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
  startGame({mode:'heist', seed:dailySeed(), multiplayer:false, difficulty:'easy'});
  startMusicIfOn('tower');
  toast('💰 Grab ALL the gold — 20 seconds! Watch the lasers!');
}
function refreshHeistButton(){
  const b=document.getElementById('heistBtn'); if(!b) return;
  const done = SAVE.heist && SAVE.heist.key===dailyKey() && SAVE.heist.done;
  b.innerHTML = done
    ? '💰 Gold Heist <span class="badge">✓ done</span>'
    : '💰 Gold Heist <span class="badge" style="background:var(--gold);color:#7a5512">20s!</span>';
}
function refreshDailyButton(){
  const b=document.getElementById('dailyBtn'); if(!b) return;
  const done = SAVE.daily && SAVE.daily.key===dailyKey() && SAVE.daily.done;
  b.innerHTML = done
    ? '🗓️ Daily Challenge <span class="badge">✓ done</span>'
    : '🗓️ Daily Challenge <span class="badge" style="background:var(--pink-2)">+50 🪙</span>';
}

let pendingRoomMode='coop';
let pendingRoomDiff='hard';

// Team button -> a co-op room by default (the 2-player teamwork puzzles)
function createTeam(){ pendingRoomMode='coop'; createRoom(); }

async function createRoom(){
  const profile=profileObj();
  showScreen('roomScreen');
  document.getElementById('roomTitle').textContent='Creating room…';
  document.getElementById('roomCodeBox').textContent='·····';
  setRoomHostControls(true);
  selectRoomMode(pendingRoomMode);
  selectRoomDiff(pendingRoomDiff);
  try{
    const code=await mpCreateRoom(profile);
    document.getElementById('roomTitle').textContent='Room created! 🎉';
    document.getElementById('roomCodeBox').textContent=code;
    document.getElementById('roomHint').textContent='Share this code with your friend to join.';
    wireRoomCallbacks();
    refreshRoster();
  }catch(e){
    document.getElementById('roomTitle').textContent='Could not create room 😢';
    document.getElementById('roomHint').textContent=e.message||'Try again.';
  }
}
async function joinRoomWithCode(){
  const code=(document.getElementById('joinCodeInput').value||'').trim().toUpperCase();
  if(code.length<4){ toast('Enter a room code'); return; }
  const profile=profileObj();
  showScreen('roomScreen');
  document.getElementById('roomTitle').textContent='Joining '+code+'…';
  document.getElementById('roomCodeBox').textContent=code;
  setRoomHostControls(false);
  try{
    await mpJoinRoom(code, profile);
    document.getElementById('roomTitle').textContent='Joined room!';
    document.getElementById('roomHint').textContent='Waiting for the host to start…';
    wireRoomCallbacks();
    refreshRoster();
  }catch(e){
    document.getElementById('roomTitle').textContent='Join failed 😢';
    document.getElementById('roomHint').textContent=e.message||'Check the code and try again.';
  }
}

function setRoomHostControls(isHost){
  document.getElementById('hostControls').style.display=isHost?'block':'none';
  document.getElementById('guestWait').style.display=isHost?'none':'block';
}
function selectRoomMode(m){
  pendingRoomMode=m;
  document.querySelectorAll('#modeBtns .btn').forEach(b=>b.classList.toggle('blue',b.dataset.mode===m));
  const d=document.getElementById('modeDesc');
  if(d) d.textContent = m==='coop'
    ? 'Team-up: stand on both pads together to make bridges appear for 10s!'
    : m==='tag'
      ? "Tag: one player is IT and chases the others up the obby — touch a friend to pass it on! 🏃"
      : m==='disaster'
        ? '🌪️ Disaster: build for 5s, then everyone survives the same disaster together! (2+ players may get a Killer round)'
        : 'Race: same obby, separate climbs — first to the top wins! 🏁';
}
function wireRoomCallbacks(){
  MP.onRosterChange=refreshRoster;
  MP.onPeerLeft=()=>{ toast('A player left'); refreshRoster(); };
  MP.onStart=(config)=>{
    Game.onLevelComplete=onLevelComplete;
    Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
    startGame({level:config.level, seed:config.seed, mode:config.mode, disasterType:config.disasterType,
               multiplayer:true, difficulty:config.difficulty||'hard'});
    startMusicIfOn('game');
    if(MP.isHost && (config.mode==='tag' || config.disasterType==='killer')) setTimeout(()=>mpSendIt(MP.selfId), 600);  // host starts as "it"
  };
}
function selectRoomDiff(d){
  pendingRoomDiff=d;
  document.querySelectorAll('#diffBtns .btn').forEach(b=>b.classList.toggle('pink',b.dataset.diff===d));
}
function refreshRoster(){
  const list=document.getElementById('rosterList');
  if(!list)return;
  const ids=Object.keys(MP.roster);
  list.innerHTML = ids.length? ids.map(id=>{
    const p=MP.roster[id];
    const you=id===MP.selfId?' <span class="badge">you</span>':'';
    const host=(MP.isHost&&id===MP.selfId)||(!MP.isHost&&id!==MP.selfId)?'':'';
    return `<div>🫧 ${escapeHtml(p.name||'Blob')}${you}</div>`;
  }).join('') : '<div class="muted">Waiting for players…</div>';
  document.getElementById('rosterCount').textContent=ids.length;
  const tb=document.getElementById('tradeBtn'); if(tb) tb.style.display = ids.length>=2 ? 'inline-flex' : 'none';
}

/* ---------------- Live trading (Adopt-Me style) ---------------- */
function startTrade(){
  if(!mpTradeStart()){ toast('Need a friend in the room to trade'); return; }
  renderTradeModal(); openModal('tradeModal');
}
// MP callbacks (global so multiplayer.js can find them)
function onTradeOpen(){ renderTradeModal(); openModal('tradeModal'); }
function onTradeUpdate(){ if(MP.trade && MP.trade.active) renderTradeModal(); }
function onTradeCancel(){ closeModal('tradeModal'); toast('Trade cancelled'); }
function onTradeComplete(){ closeModal('tradeModal'); updateCoinDisplays(); toast('🎉 Trade complete!'); }

function tradeToggle(petId){
  const t=MP.trade; if(!t) return;
  const owned=petCount(petId);
  const inOffer=t.myOffer.filter(x=>x===petId).length;
  let next=t.myOffer.slice();
  if(inOffer < owned){ next.push(petId); }      // add one more copy
  else { const i=next.indexOf(petId); if(i>=0) next.splice(i,1); }  // remove all -> none
  mpTradeSetOffer(next);
}
function renderTradeModal(){
  const t=MP.trade; if(!t){ closeModal('tradeModal'); return; }
  const body=document.getElementById('tradeModalBody');
  const offerPics = arr => arr.length ? arr.map(id=>{const c=creatureById(id);return `<span class="trade-pet">${c?c.emoji:'?'}</span>`;}).join('') : '<span class="muted">— nothing —</span>';
  // your pets to add (show owned, highlight how many are in the offer)
  const ownedList=CREATURES.filter(c=>ownsPet(c.id));
  const grid = ownedList.map(c=>{
    const inOffer=t.myOffer.filter(x=>x===c.id).length;
    return `<div class="pet-cell ${inOffer?'equipped':''}" style="--rc:${RARITY_INFO[c.rarity].color}" onclick="tradeToggle('${c.id}')">
      <div class="pet-emoji">${c.emoji}</div><div class="pet-name">${c.name}</div>
      ${inOffer?`<span class="count-badge">${inOffer}↑</span>`:''}</div>`;
  }).join('') || '<p class="muted">You have no pets to trade.</p>';
  const status = t.myAccepted && t.theirAccepted ? '✅ Both accepted!' :
                 t.myAccepted ? '⏳ Waiting for '+escapeHtml(t.partnerName)+'…' :
                 t.theirAccepted ? '❗ '+escapeHtml(t.partnerName)+' accepted — your turn!' : 'Build your offers, then both Accept.';
  body.innerHTML=`
    <h2 style="margin:2px 0">Trade with ${escapeHtml(t.partnerName)}</h2>
    <div class="trade-cols">
      <div class="trade-col"><b>You give</b><div class="trade-offer">${offerPics(t.myOffer)}</div>${t.myAccepted?'<div class="ok">✓ you accepted</div>':''}</div>
      <div class="trade-col"><b>${escapeHtml(t.partnerName)} gives</b><div class="trade-offer">${offerPics(t.theirOffer)}</div>${t.theirAccepted?'<div class="ok">✓ accepted</div>':''}</div>
    </div>
    <p class="hint" style="margin:6px 0">${status}</p>
    <b style="font-size:13px">Your pets — tap to add/remove</b>
    <div class="pet-grid" style="margin-top:6px;max-height:34vh;overflow:auto">${grid}</div>
    <button class="btn ${t.myAccepted?'ghost':'pink'}" onclick="mpTradeAccept();renderTradeModal()">${t.myAccepted?'✓ Accepted (waiting)':'Accept trade'}</button>
    <button class="btn ghost" onclick="mpTradeCancel();closeModal('tradeModal')">Cancel</button>`;
}
function hostStart(){
  if(!MP.isHost) return;
  const seed=Math.floor(Math.random()*1e6);
  Game.onLevelComplete=onLevelComplete;
  Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
  const cfg={level:1, seed, mode:pendingRoomMode, difficulty:pendingRoomDiff};
  if(pendingRoomMode==='disaster'){
    // host picks the disaster so everyone gets the same one; 'killer' tag only with 2+ players
    const pool = (mpPlayerCount()>1) ? DISASTERS.concat(['killer']) : DISASTERS;
    cfg.disasterType = pool[Math.floor(Math.random()*pool.length)];
  }
  mpStart(cfg);
}
function leaveRoom(){
  mpLeave();
  showScreen('playScreen');
}

function profileObj(){
  return {name:(SAVE.name||'Blob').slice(0,12), skin:SAVE.skin, accessory:SAVE.accessory, face:SAVE.face};
}
function escapeHtml(s){return (s+'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* ---------------- Win / level complete ---------------- */
function onLevelComplete(level, earned, isFinal, res){
  Game.running=false; cancelAnimationFrame(Game.raf);
  res = res||{stars:1,timeMs:0,newRecord:false,coins:0};
  const body=document.getElementById('winBody');
  let waitMsg='';
  if(Game.multiplayer){
    const others=mpRemoteList();
    const doneCount=others.filter(o=>o.finished).length;
    if(Game.mode==='race'){
      const place=Game.racePlace||1;
      const medal = place===1?'🥇':place===2?'🥈':place===3?'🥉':'🏁';
      const ord = place===1?'1st':place===2?'2nd':place===3?'3rd':place+'th';
      waitMsg=`<p class="timer-big">${medal} ${place===1?'You WON the race!':ord+' place'}</p>
        <p class="muted">Your record: ${SAVE.raceWins||0} W · ${SAVE.raceLosses||0} L</p>`;
    } else if(Game.mode==='tag'){
      waitMsg = Game.tagEscaped
        ? `<p class="timer-big">🎉 You escaped to the top!</p><p class="muted">You reached safety without being IT 🏃</p>`
        : `<p class="timer-big">🏃 Tagged out!</p><p class="muted">You were IT at the top — better luck next round!</p>`;
    } else if(Game.mode==='coop'){
      waitMsg=`<p class="muted">Teammates finished: ${doneCount}/${others.length}</p>`;
    }
  }
  const isHeist=!!res.heist;
  if(isHeist){
    waitMsg=`<p class="timer-big">💰 You grabbed 🪙${res.loot}!</p>
      <p class="muted">${res.coins} gold in 20 seconds${SAVE.heist&&SAVE.heist.best?` · best 🪙${SAVE.heist.best}`:''}</p>`;
  }
  const isDisaster=!!res.disaster;
  if(isDisaster){
    waitMsg = res.survived
      ? `<p class="timer-big">🎉 You SURVIVED!</p><p class="muted">${(DISASTER_INFO[res.type]||{}).name||''} · 🔘${res.buttons}/10 buttons</p>`
      : `<p class="timer-big">💀 You didn't make it…</p><p class="muted">🔘${res.buttons}/10 buttons · try again!</p>`;
  }
  const stillRacing = Game.multiplayer && mpRemoteList().some(r=>!r.finished && typeof r.x==='number');
  const showStats = !Game.multiplayer && !isHeist && !isDisaster;
  const starsRow = showStats ? `<div class="stars-row">${
    [1,2,3].map(i=>`<span class="${i<=res.stars?'star on':'star'}">★</span>`).join('')}</div>` : '';
  const timeRow = showStats ? `<p class="muted">Time ${fmtTime(res.timeMs)} · ${res.deaths} death${res.deaths===1?'':'s'}${res.coins?` · 🪙${res.coins} grabbed`:''}${res.newRecord?' · <b style="color:#46c98c">NEW RECORD! 🎉</b>':''}</p>` : '';
  const nav = Game.multiplayer
    ? `${stillRacing?`<button class="btn blue" onclick="watchFriends()">👁 Watch friends</button>`:''}<button class="btn gold" onclick="backToLobby()">Back to Lobby</button>`
    : (isDisaster
        ? `<button class="btn gold" onclick="startDisaster()">🔁 Play again</button><button class="btn ghost" onclick="backToLobby()">Lobby</button>`
        : (isHeist
        ? `<button class="btn gold" onclick="backToLobby()">Back to Lobby</button>`
        : (res.daily
            ? `<button class="btn gold" onclick="startDaily()">🔁 Try again</button><button class="btn ghost" onclick="backToLobby()">Lobby</button>`
            : (isFinal
                ? `<button class="btn gold" onclick="backToMap()">🗺️ Level Map</button><button class="btn ghost" onclick="backToLobby()">Lobby</button>`
                : `<button class="btn" onclick="goNextLevel()">Next Level →</button><button class="btn ghost" onclick="backToMap()">🗺️ Map</button>`))));
  const heading = isDisaster ? (res.survived?'🎉 Survivor!':'💀 Wiped out') : isHeist ? '💰 Heist complete!' : res.daily ? '🗓️ Daily done!' : (isFinal?'YOU DID IT!':'Level '+level+' complete!');
  body.innerHTML=`<div class="confetti-box" id="confettiBox"></div>
    <canvas id="winDance" class="win-dance"></canvas>
    <div class="win-emoji" style="font-size:30px">${isDisaster?(res.survived?'🌪️🎉':'🌪️💀'):isHeist?'💰✨':res.daily?'🗓️✨':(isFinal?'🏆🌈':'🎉')}</div>
    <h2>${heading}</h2>
    ${isFinal&&!res.daily&&!isHeist&&!isDisaster?`<p>You climbed all ${TOTAL_LEVELS} levels!</p>`:''}
    ${starsRow}${timeRow}
    ${isHeist?'':`<p class="timer-big">+🪙${earned}</p>`}${waitMsg}
    ${nav}`;
  openModal('winModal');
  spawnConfetti(document.getElementById('confettiBox'));
  startWinDance();
}
let winDanceRaf=0;
function startWinDance(){
  const cv=document.getElementById('winDance'); if(!cv) return;
  const dpr=Math.min(window.devicePixelRatio||1,2), size=92;
  cv.width=size*dpr; cv.height=size*dpr; cv.style.width=size+'px'; cv.style.height=size+'px';
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  cancelAnimationFrame(winDanceRaf);
  const loop=t=>{
    if(!document.getElementById('winModal').classList.contains('active')) return;
    ctx.clearRect(0,0,size,size);
    const sq=Math.sin(t/110)*0.5, tilt=Math.sin(t/190)*0.2, hop=Math.abs(Math.sin(t/110))*6;
    ctx.save(); ctx.translate(size/2, size/2+6-hop); ctx.rotate(tilt);
    drawCharacter(ctx,0,0,56,{skin:SAVE.skin,accessory:SAVE.accessory,face:SAVE.face,
      facing:(Math.sin(t/300)>0?1:-1), t, squash:sq, petSkin:SAVE.petSkin, shiny:SAVE.petSkin&&isShiny(SAVE.petSkin)});
    ctx.restore();
    winDanceRaf=requestAnimationFrame(loop);
  };
  winDanceRaf=requestAnimationFrame(loop);
}
function spawnConfetti(box){
  if(!box) return;
  const cols=['#ff84c8','#74a8ff','#7be0b0','#ffd36b','#b79bff','#ff7a7a'];
  for(let i=0;i<42;i++){
    const d=document.createElement('div'); d.className='confetti';
    d.style.left=Math.random()*100+'%';
    d.style.background=cols[i%cols.length];
    d.style.animationDuration=(1.2+Math.random()*1.4)+'s';
    d.style.animationDelay=(Math.random()*0.5)+'s';
    box.appendChild(d);
  }
}
function goNextLevel(){
  closeModal('winModal');
  Game.running=true; Game.last=performance.now(); Game.acc=0;
  nextLevel();
  cancelAnimationFrame(Game.raf); Game.raf=requestAnimationFrame(gameLoop);
}
function backToMap(){ closeModal('winModal'); showLevelMap(); }
function backToLobby(){
  closeModal('winModal');
  if(typeof stopSpectate==='function') stopSpectate();
  Game.running=false; cancelAnimationFrame(Game.raf);
  if(Game.multiplayer) mpLeave();
  showScreen('lobbyScreen'); initLobby();
}

/* build the in-game quick-emoji bar from the player's owned emotes */
function buildEmoteBar(){
  const bar=document.getElementById('emoteBar'); if(!bar) return;
  const owned=(SAVE.ownedEmotes||[]).map(emoteById).filter(Boolean).slice(0,8);
  bar.innerHTML = owned.map(em=>`<button onclick="sendEmote('${em.e}')">${em.e}</button>`).join('');
}

/* ---------------- Spectate ---------------- */
function watchFriends(){ closeModal('winModal'); startSpectate(); }
function setSpectateChrome(on){
  const bar=document.getElementById('spectateBar');
  const controls=document.querySelector('#gameOverlay .controls');
  const emote=document.getElementById('emoteBar');
  if(bar) bar.style.display = on?'flex':'none';
  if(controls) controls.style.visibility = on?'hidden':'visible';
  if(on && emote) emote.style.display='none';
}
/* refresh the spectate banner name each frame via updateHudLive hook */
function refreshSpectateName(){
  if(!Game.spectating) return;
  const r=Game.spectateId?MP.remote[Game.spectateId]:null;
  const el=document.getElementById('spectateName');
  if(el) el.textContent='👁 Watching '+((r&&r.name)||'friend');
}

/* ---------------- Daily rotating shop ---------------- */
function shopPool(){
  const items=[];
  SKINS.forEach(s=>{ if(s.price>0) items.push({kind:'skin', id:s.id, price:s.price, label:s.id, swatch:s.color}); });
  ACCESSORIES.forEach(a=>{ if(a.price>0) items.push({kind:'acc', id:a.id, price:a.price, label:a.label, emoji:a.emoji}); });
  TRAILS.forEach(t=>{ if(t.price>0) items.push({kind:'trail', id:t.id, price:t.price, label:t.name, emoji:t.emoji}); });
  EMOTES.forEach(e=>{ if(e.price>0) items.push({kind:'emote', id:e.id, price:e.price, label:e.e+' emote', emoji:e.e}); });
  return items;
}
function todaysShop(){
  const pool=shopPool();
  const rnd=mulberry32((dailySeed()*7 + 13)|0);   // same set all day, new each day
  for(let i=pool.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const tmp=pool[i]; pool[i]=pool[j]; pool[j]=tmp; }
  return pool.slice(0,4).map(it=>Object.assign({}, it, {sale:Math.round(it.price*0.7)}));
}
function isOwnedShopItem(it){
  if(it.kind==='skin') return SAVE.ownedSkins.includes(it.id);
  if(it.kind==='acc') return SAVE.ownedAccessories.includes(it.id);
  if(it.kind==='emote') return (SAVE.ownedEmotes||[]).includes(it.id);
  return SAVE.ownedTrails.includes(it.id);
}
function buyShopItem(idx){
  const it=todaysShop()[idx]; if(!it) return;
  if(isOwnedShopItem(it)){ toast('Already owned'); return; }
  if(SAVE.coins<it.sale){ toast('Not enough coins 🪙'); return; }
  SAVE.coins-=it.sale;
  if(it.kind==='skin') SAVE.ownedSkins.push(it.id);
  else if(it.kind==='acc') SAVE.ownedAccessories.push(it.id);
  else if(it.kind==='emote'){ if(!SAVE.ownedEmotes) SAVE.ownedEmotes=[]; SAVE.ownedEmotes.push(it.id); }
  else SAVE.ownedTrails.push(it.id);
  persist(); SFX.chest();
  toast('Bought '+it.label+'! 🛍️');
  renderShop();
}
/* ---------------- Pet Playground ---------------- */
let playgroundRaf=0;
function openPlayground(){
  showScreen('playgroundScreen');
  const cv=document.getElementById('playgroundCanvas');
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const W=Math.min(380, window.innerWidth-70), H=300;
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  const ids=[];
  for(const id in (SAVE.pets||{})) if(SAVE.pets[id]>0) ids.push(id);
  for(const id in (SAVE.shinies||{})) if(SAVE.shinies[id]>0 && !ids.includes(id)) ids.push(id);
  document.getElementById('playgroundHint').textContent = ids.length
    ? 'Tap your pets to play with them! 🐾' : 'Get pets from chests — then play with them here!';
  const pets = ids.slice(0,12).map(id=>{ const c=creatureById(id);
    return { id, emoji:c?c.emoji:'🐾', shiny:isShiny(id),
      x:24+Math.random()*(W-48), y:60+Math.random()*(H-110),
      vx:(Math.random()<0.5?-1:1)*(0.4+Math.random()*0.6), t:Math.random()*6.28, hop:0 }; });
  const hearts=[];
  cv.onclick=e=>{
    const r=cv.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
    let best=null,bd=1e9;
    for(const p of pets){ const d=(p.x-mx)*(p.x-mx)+(p.y-my)*(p.y-my); if(d<bd){bd=d;best=p;} }
    if(best && bd<2600){ best.hop=1; hearts.push({x:best.x,y:best.y-18,life:1}); SFX.coin();
      if(typeof playWithPet==='function') playWithPet(best.id); }   // playing cheers them up
  };
  cancelAnimationFrame(playgroundRaf);
  const loop=t=>{
    if(!document.getElementById('playgroundScreen').classList.contains('active')) return;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#eef9f0'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#cdeccf'; ctx.fillRect(0,H-26,W,26);
    ctx.font='16px serif'; ctx.textAlign='center';
    for(let i=0;i<W;i+=46) ctx.fillText('🌷', i+23, H-9);
    for(const p of pets){
      p.x+=p.vx; if(p.x<18||p.x>W-18) p.vx*=-1; p.x=Math.max(18,Math.min(W-18,p.x));
      p.t+=0.045; const bob=Math.sin(p.t)*3 - (p.hop>0? Math.sin((1-p.hop)*Math.PI)*16 : 0);
      if(p.hop>0) p.hop-=0.04;
      if(p.shiny){ ctx.globalAlpha=0.5; ctx.fillStyle='rgba(255,210,90,.85)';
        ctx.beginPath(); ctx.arc(p.x,p.y+bob,21,0,6.283); ctx.fill(); ctx.globalAlpha=1; }
      ctx.font='30px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(p.emoji, p.x, p.y+bob);
    }
    for(let i=hearts.length-1;i>=0;i--){ const h=hearts[i]; h.y-=1.2; h.life-=0.02;
      if(h.life<=0){ hearts.splice(i,1); continue; }
      ctx.globalAlpha=h.life; ctx.font='18px serif'; ctx.fillText('💖',h.x,h.y); ctx.globalAlpha=1; }
    playgroundRaf=requestAnimationFrame(loop);
  };
  playgroundRaf=requestAnimationFrame(loop);
}
function closePlayground(){ cancelAnimationFrame(playgroundRaf); showScreen('lobbyScreen'); initLobby(); }

/* ---------------- Pet Café (feeding) ---------------- */
let mealTray=[], feedPetId=null;
function openCafe(){ ensurePetFeed(); mealTray=[]; feedPetId=null; showScreen('cafeScreen'); renderCafe(); }
function selectFeedPet(id){ feedPetId=id; SFX.click(); renderCafe(); }
function fmtHunger(ms){
  if(ms<=0) return 'Hungry now!';
  const h=ms/3600000;
  if(h>=24) return 'Full for '+(h/24).toFixed(1)+' days';
  if(h>=1) return 'Full for '+Math.round(h)+'h';
  return 'Full for '+Math.max(1,Math.round(ms/60000))+'m';
}
function renderCafe(){
  ensurePetFeed(); updateCoinDisplays();
  document.getElementById('mealTray').innerHTML=[0,1,2].map(i=>{
    const f=mealTray[i]?foodById(mealTray[i]):null;
    return `<div class="meal-slot ${f?'filled':''}" onclick="removeFromTray(${i})">${f?f.emoji:'➕'}</div>`;
  }).join('');
  // named meal preview once you've picked all 3
  const mn=document.getElementById('mealName');
  if(mealTray.length===3){ const mi=mealInfo(mealTray); mn.innerHTML=`<span class="mn-emoji">${mi.emoji}</span> <b>${mi.name}</b>`; }
  else mn.innerHTML=`<span class="muted">Pick ${3-mealTray.length} more food to make a meal…</span>`;
  const owned=FOODS.filter(f=>foodCount(f.id)>0);
  document.getElementById('cafePantry').innerHTML = owned.length ? owned.map(f=>`
    <div class="swatch food-cell" onclick="addToTray('${f.id}')">
      <span style="font-size:26px">${f.emoji}</span><span class="count-badge">${foodCount(f.id)}</span>
    </div>`).join('') : `<p class="hint" style="grid-column:1/-1">No food yet — play Food Hunt to catch some! 🍽️</p>`;
  const ownedPets=CREATURES.filter(c=>ownsPet(c.id)||isShiny(c.id));
  // default the feed target to the equipped pet (or the first owned)
  if(!feedPetId || !ownedPets.some(c=>c.id===feedPetId))
    feedPetId = (SAVE.equippedPet && ownedPets.some(c=>c.id===SAVE.equippedPet)) ? SAVE.equippedPet : (ownedPets[0]&&ownedPets[0].id) || null;
  document.getElementById('cafePets').innerHTML = ownedPets.map(c=>{
    const full=Math.max(0,petFullnessMs(c.id));
    const hung=petHungerPct(c.id), happy=petHappiness(c.id), sad=petIsSad(c.id);
    const hungry = petFedState(c.id)==='hungry';
    const lab = hungry ? '<b style="color:#e06b6b">Hungry — no power!</b>'
              : sad    ? '<b style="color:#9b6bff">A bit sad — play with me! 🐾</b>'
              : '<b style="color:#46c98c">Happy '+petMoodFace(c.id)+'</b>';
    const sel = feedPetId===c.id ? ' feed-sel' : '';
    return `<div class="today-row${sel}" onclick="selectFeedPet('${c.id}')">
      <div class="today-ico">${c.emoji}<div class="mood-face">${petMoodFace(c.id)}</div></div>
      <div class="today-info"><b>${c.name}</b> ${lab} ${feedPetId===c.id?'<span class="badge">feeding</span>':''}
        <div class="meter-row"><span class="meter-lab">🍽️</span><div class="qbar"><div class="qfill" style="width:${hung}%;background:linear-gradient(90deg,#ffb38a,#ff9bce)"></div></div></div>
        <div class="meter-row"><span class="meter-lab">${sad?'😢':'💜'}</span><div class="qbar"><div class="qfill" style="width:${happy}%;background:linear-gradient(90deg,#c8a0ff,#9b6bff)"></div></div></div>
        <div class="muted" style="font-size:11px">${fmtHunger(full)} · loves ${foodById(petFav(c.id)).emoji}</div></div>
    </div>`;
  }).join('') || '<p class="hint">Collect pets from chests first!</p>';
  const fp=feedPetId?creatureById(feedPetId):null;
  document.getElementById('feedPetName').textContent = fp ? (fp.emoji+' '+fp.name) : 'a pet';
}
function addToTray(id){
  if(mealTray.length>=3){ toast('Meal is full — feed it!'); return; }
  if(foodCount(id) <= mealTray.filter(x=>x===id).length){ toast('No more '+foodById(id).name); return; }
  mealTray.push(id); SFX.click(); renderCafe();
}
function removeFromTray(i){ if(mealTray[i]!=null){ mealTray.splice(i,1); renderCafe(); } }
function doFeed(){
  const pet=feedPetId;
  if(!pet){ toast('Tap a pet to feed first!'); return; }
  if(mealTray.length!==3){ toast('A meal needs 3 foods — tap food to add!'); return; }
  const meal=mealInfo(mealTray);
  const res=feedPet(pet, mealTray.slice());
  if(res.error){ toast(res.error); return; }
  const c=creatureById(pet); SFX.chest();
  toast(c.emoji+' '+c.name+' ate '+meal.name+' — '+res.liking+'!'+(res.addedH>0?' +'+res.addedH+'h full':' (already full 😋)'));
  mealTray=[]; renderCafe();
}

/* Food Hunt minigame: 20 coins, 15 seconds, tap the fast-flying food to catch it */
let foodHuntRaf=0;
function startFoodHunt(){
  if(SAVE.coins<20){ toast('Need 🪙20 to play'); return; }
  SAVE.coins-=20; persist(); SFX.click();
  showScreen('foodHuntScreen');
  const cv=document.getElementById('foodHuntCanvas');
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const W=window.innerWidth, H=window.innerHeight;
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px';
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  const flyers=[], caught={}, pops=[]; let total=0, spawnAt=0, endAt=performance.now()+15000;
  cv.onpointerdown=e=>{
    const r=cv.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
    for(let i=flyers.length-1;i>=0;i--){ const f=flyers[i];
      if((f.x-mx)*(f.x-mx)+(f.y-my)*(f.y-my) < (f.r+16)*(f.r+16)){
        caught[f.id]=(caught[f.id]||0)+1; total++; pops.push({x:f.x,y:f.y,t:1}); flyers.splice(i,1);
        SFX.coin(); document.getElementById('fhCount').textContent='🍽️ '+total; break;
      }
    }
  };
  document.getElementById('fhCount').textContent='🍽️ 0';
  cancelAnimationFrame(foodHuntRaf);
  const loop=t=>{
    const left=Math.max(0,endAt-t);
    document.getElementById('fhTimer').textContent='⏱ '+Math.ceil(left/1000)+'s';
    ctx.clearRect(0,0,W,H);
    if(t>spawnAt){ spawnAt=t+(200+Math.random()*240);
      const fromLeft=Math.random()<0.5, f=FOODS[Math.floor(Math.random()*FOODS.length)];
      flyers.push({id:f.id, emoji:f.emoji, x:fromLeft?-30:W+30, y:70+Math.random()*(H-180),
        vx:(fromLeft?1:-1)*(3+Math.random()*4.5), vy:(Math.random()*2-1)*1.3, r:22});
    }
    ctx.textAlign='center'; ctx.textBaseline='middle';
    for(let i=flyers.length-1;i>=0;i--){ const f=flyers[i]; f.x+=f.vx; f.y+=f.vy;
      if(f.y<50||f.y>H-70) f.vy*=-1;
      if(f.x<-70||f.x>W+70){ flyers.splice(i,1); continue; }
      ctx.font=`${f.r*2}px serif`; ctx.fillText(f.emoji,f.x,f.y);
    }
    for(let i=pops.length-1;i>=0;i--){ const p=pops[i]; p.t-=0.04; p.y-=1.6; if(p.t<=0){pops.splice(i,1);continue;}
      ctx.globalAlpha=p.t; ctx.fillStyle='#46c98c'; ctx.font='bold 22px Nunito'; ctx.fillText('+1',p.x,p.y); ctx.globalAlpha=1; }
    if(left<=0){ endFoodHunt(caught,total); return; }
    foodHuntRaf=requestAnimationFrame(loop);
  };
  foodHuntRaf=requestAnimationFrame(loop);
}
function endFoodHunt(caught,total){
  cancelAnimationFrame(foodHuntRaf);
  if(!SAVE.foods) SAVE.foods={};
  for(const id in caught) SAVE.foods[id]=(SAVE.foods[id]||0)+caught[id];
  persist(); SFX.win();
  toast('🍽️ Caught '+total+' food!');
  openCafe();
}

/* ---------------- Daily Login Rewards ---------------- */
function loginNextDayIndex(){
  const today=dayNum(), L=SAVE.login||{day:0,lastClaim:0};
  if(L.lastClaim===today) return 0;                 // already claimed today
  if(L.lastClaim===today-1) return (L.day % 7) + 1; // consecutive day -> advance (loops 7->1)
  return 1;                                          // missed a day / first time -> reset to 1
}
function canClaimLogin(){ return loginNextDayIndex()>0; }
function openLogin(){ showScreen('loginScreen'); renderLogin(); }
function renderLogin(){
  updateCoinDisplays();
  const today=dayNum(), L=SAVE.login||{day:0,lastClaim:0};
  const claimedToday = L.lastClaim===today;
  const next = loginNextDayIndex();
  const grid=document.getElementById('loginGrid');
  grid.innerHTML = LOGIN_REWARDS.map((r,i)=>{
    const d=i+1;
    let cls;
    if(claimedToday){ cls = d<L.day?'done':(d===L.day?'today':'future'); }
    else { cls = d<next?'done':(d===next?'claim':'future'); }
    const big = d===7?' big':'';
    return `<div class="login-day ${cls}${big}">
      <div class="ld-num">Day ${d}</div>
      <div class="ld-rew">${r.pet?'🪙'+r.coins+'<br>+🐾':'🪙'+r.coins}</div>
      ${cls==='done'||cls==='today'?'<div class="ld-check">✓</div>':''}
    </div>`;
  }).join('');
  const btn=document.getElementById('loginClaimBtn');
  const hint=document.getElementById('loginHint');
  if(claimedToday){
    btn.disabled=true; btn.textContent='✓ Come back tomorrow!';
    hint.textContent='Nice — Day '+L.day+' claimed! Keep your streak going. 🔥';
  } else {
    btn.disabled=false; btn.textContent='Claim Day '+next+' reward 🎁';
    hint.textContent = (L.lastClaim===dayNum()-1) ? 'Day '+next+' — your streak continues! 🔥' : 'Welcome back! Claim Day '+next+'.';
  }
}
function claimLoginDay(){
  const idx=loginNextDayIndex(); if(!idx){ toast('Already claimed today!'); return; }
  const r=LOGIN_REWARDS[idx-1];
  SAVE.login={day:idx, lastClaim:dayNum()};
  addCoins(r.coins||0);
  let petMsg='';
  if(r.pet){
    const rar=rollRarity({basic:28,rare:38,superRare:21,legendary:9,mythical:3,secret:1});
    const pool=creaturesOfRarity(rar), c=pool[Math.floor(Math.random()*pool.length)];
    SAVE.pets[c.id]=(SAVE.pets[c.id]||0)+1; if(!SAVE.equippedPet) SAVE.equippedPet=c.id;
    if(c.rarity==='secret') unlockAchievement('secret'); checkPetAchievements();
    petMsg=' & '+c.emoji+' '+c.name+'!';
  }
  persist(); SFX.chest();
  toast('🎁 Day '+idx+'! +🪙'+(r.coins||0)+petMsg);
  if(idx===7) spawnConfetti(document.getElementById('confettiBox'));
  renderLogin(); refreshTodayBadge();
}

/* ---------------- Today hub ---------------- */
const TODAY_ITEMS = [
  { icon:'🎁', label:'Login Reward',    desc:'Daily streak prize',        act:'openLogin',  ready:()=>canClaimLogin() },
  { icon:'📋', label:'Daily Quests',    desc:'3 quests for coins',        act:'openQuests', ready:()=>questsClaimable() },
  { icon:'🎀', label:'Daily Chest',     desc:'A free goodie',             act:'openChest',  ready:()=>(SAVE.chestLastClaim===0 || nowMs()-SAVE.chestLastClaim>=DAY_MS) },
  { icon:'💰', label:'Gold Heist',      desc:'20s coin grab',             act:'startHeist', ready:()=>!(SAVE.heist&&SAVE.heist.key===dailyKey()&&SAVE.heist.done) },
  { icon:'🗓️', label:'Daily Challenge', desc:'+50 bonus coins',           act:'startDaily', ready:()=>!(SAVE.daily&&SAVE.daily.key===dailyKey()&&SAVE.daily.done) },
  { icon:'📒', label:'Blob-Dex Goals',  desc:'Collection rewards',        act:'openDex',    ready:()=>dexClaimable() },
];
function availableCount(){ return TODAY_ITEMS.filter(t=>t.ready()).length; }
function openToday(){ showScreen('todayScreen'); renderToday(); }
function renderToday(){
  updateCoinDisplays();
  document.getElementById('todayBody').innerHTML = TODAY_ITEMS.map(t=>{
    const ready=t.ready();
    return `<div class="today-row ${ready?'ready':''}">
      <div class="today-ico">${t.icon}</div>
      <div class="today-info"><b>${t.label}</b><div class="muted" style="font-size:12px">${t.desc}</div></div>
      <button class="btn ${ready?'gold':'ghost'} small" onclick="${t.act}()">${ready?'Get it!':'Done ✓'}</button>
    </div>`;
  }).join('');
}
function refreshTodayBadge(){
  const b=document.getElementById('todayBadge'); if(!b) return;
  const n=availableCount();
  if(n>0){ b.style.display='inline-block'; b.textContent=n; } else b.style.display='none';
}
function openDex(){ openPets(); setPetsTab('collection'); }
function doClaimDex(id){
  const r=claimDexMilestone(id);
  if(r){ SFX.rare(); toast('📒 Collection reward! +🪙'+r); renderPets(); refreshTodayBadge(); }
}

/* ---------------- Daily Quests ---------------- */
function openQuests(){ showScreen('questsScreen'); renderQuests(); }
function renderQuests(){
  updateCoinDisplays();
  const q=ensureQuests();
  const allDone=q.list.every(x=>x.claimed);
  const streak=SAVE.questStreak||0;
  const streakLine = `<p class="hint" style="margin-top:0">🔥 Streak: <b>${streak} day${streak===1?'':'s'}</b> · finish all 3 in a day for a bonus (up to +🪙175)${allDone?' · <b style="color:#46c98c">all done today! 🎉</b>':''}</p>`;
  document.getElementById('questsBody').innerHTML = streakLine + q.list.map(item=>{
    const def=questById(item.id); if(!def) return '';
    const pct=Math.min(100, Math.round(item.prog/def.goal*100));
    const btn = item.claimed
      ? `<button class="btn ghost small" disabled>Claimed ✓</button>`
      : item.done
        ? `<button class="btn gold small" onclick="doClaimQuest('${item.id}')">Claim 🪙${def.reward}</button>`
        : `<span class="muted" style="font-size:12px;white-space:nowrap">🪙${def.reward}</span>`;
    return `<div class="quest-row ${item.done?'done':''}">
      <div class="quest-ico">${def.emoji}</div>
      <div class="quest-info">
        <b>${def.text}</b>
        <div class="qbar"><div class="qfill" style="width:${pct}%"></div></div>
        <div class="muted" style="font-size:11px">${Math.min(item.prog,def.goal)}/${def.goal}</div>
      </div>
      ${btn}
    </div>`;
  }).join('');
}
function doClaimQuest(id){
  const r=claimQuest(id);
  if(r){ SFX.chest(); if(!r.streakBonus) toast('🪙 +'+r.reward+' claimed!'); renderQuests(); refreshQuestButton(); }
}
function refreshQuestButton(){
  const b=document.getElementById('questBtn'); if(!b) return;
  b.innerHTML = questsClaimable()
    ? '📋 Daily Quests <span class="badge">claim!</span>'
    : '📋 Daily Quests';
}

function openShop(){ showScreen('shopScreen'); renderShop(); }
function renderShop(){
  updateCoinDisplays();
  document.getElementById('shopBody').innerHTML = todaysShop().map((it,idx)=>{
    const owned=isOwnedShopItem(it);
    const icon = it.kind==='skin'
      ? `<span class="shop-swatch" style="background:${(it.swatch&&it.swatch[0]==='#')?it.swatch:'#ffd36b'}"></span>`
      : `<span class="chest-ico">${it.emoji||'✨'}</span>`;
    return `<div class="chest-row">
      ${icon}
      <div class="chest-info"><b>${it.label} <span class="muted" style="font-size:11px">(${it.kind})</span></b>
        <div class="muted" style="font-size:12px"><s>🪙${it.price}</s> → <b style="color:#46c98c">🪙${it.sale}</b> · 30% off</div></div>
      <button class="btn ${owned?'ghost':'gold'} small" ${owned?'disabled':''} onclick="buyShopItem(${idx})">${owned?'Owned ✓':'Buy'}</button>
    </div>`;
  }).join('');
}

/* ---------------- Pets & Chests ---------------- */
let petsTab='chests';
function openPets(){ showScreen('petsScreen'); petsTab='chests'; renderPets(); }
function setPetsTab(t){ petsTab=t; renderPets(); }
function renderPets(){
  updateCoinDisplays();
  document.querySelectorAll('#petsTabs .tab').forEach(el=>el.classList.toggle('active', el.dataset.ptab===petsTab));
  const body=document.getElementById('petsBody');
  if(petsTab==='chests') renderChestsTab(body);
  else if(petsTab==='collection') renderCollectionTab(body);
  else if(petsTab==='fuse') renderFuseTab(body);
  else renderTradeTab(body);
}
function oddsLine(weights){
  const parts=[];
  for(const r of RARITIES){ const w=weights[r]||0; if(w>0) parts.push(`${RARITY_INFO[r].label} ${w}%`); }
  return parts.join(' · ');
}
function renderChestsTab(body){
  body.innerHTML = Object.keys(CHESTS).map(id=>{
    const c=CHESTS[id]; const can=SAVE.coins>=c.cost;
    if(c.exclusive){
      return `<div class="chest-row gold-vault">
        <div class="chest-ico">${c.emoji}</div>
        <div class="chest-info"><b>${c.label} <span class="rarity-badge" style="background:#ffd36b;color:#7a5512">EXCLUSIVE</span></b>
          <div class="muted" style="font-size:11px;line-height:1.4">Guaranteed: 🦄 Unicorn (triple jump!) · 💜 Royal trail · 🌈 Rainbow skin</div></div>
        <button class="btn gold small" ${can?'':'disabled'} onclick="doOpenChest('${id}')">🪙${c.cost}</button>
      </div>`;
    }
    return `<div class="chest-row">
      <div class="chest-ico">${c.emoji}</div>
      <div class="chest-info"><b>${c.label}</b>
        <div class="muted" style="font-size:11px;line-height:1.35">${oddsLine(c.weights)}</div></div>
      <button class="btn gold small" ${can?'':'disabled'} onclick="doOpenChest('${id}')">🪙${c.cost}</button>
    </div>`;
  }).join('') + `<p class="hint">Better chests = better odds for rare pets. Save up for the 🌟 Gold Vault! Equip a pet to use its power in the obby!</p>`;
}
function doOpenChest(id){
  if(id==='gold'){ doOpenGoldVault(); return; }
  const res=openPetChest(id);
  if(res.error){ toast(res.error); return; }
  const rare = ['legendary','mythical','secret'].includes(res.creature.rarity);
  rare ? SFX.rare() : SFX.chest();
  if(res.creature.rarity==='secret') unlockAchievement('secret');
  checkPetAchievements();
  updateCoinDisplays(); renderPets();
  showPetReveal(res.creature, res.count);
}
function doOpenGoldVault(){
  const res=openGoldVault();
  if(res.error){ toast(res.error); return; }
  SFX.rare(); unlockAchievement('secret'); checkPetAchievements();
  updateCoinDisplays(); renderPets();
  const body=document.getElementById('petModalBody');
  body.innerHTML=`
    <div class="muted">🌟 ✨ GOLD VAULT UNLOCKED ✨ 🌟</div>
    <div class="pet-big" style="--rc:#ffd36b">🌟</div>
    <h2 style="margin:4px 0">Exclusive Bundle!</h2>
    <div class="vault-grid">
      <div class="vault-item"><div class="vi-emoji">🦄</div><b>Unicorn</b><div class="muted" style="font-size:11px">Secret · Triple jump${res.petWasNew?'':' (another one!)'}</div></div>
      <div class="vault-item"><div class="vi-emoji vi-royal"></div><b>Royal Trail</b><div class="muted" style="font-size:11px">Purple→pink→blue</div></div>
      <div class="vault-item"><div class="vi-emoji vi-rainbow"></div><b>Rainbow Skin</b><div class="muted" style="font-size:11px">Colour-changing</div></div>
    </div>
    <p class="hint">Equip them in Pets &amp; Customise! 🎉</p>
    <button class="btn pink" onclick="closeModal('petModal')">Awesome!</button>`;
  openModal('petModal');
}
function rarityBadge(r){ const i=RARITY_INFO[r]; return `<span class="rarity-badge" style="background:${i.color}">${i.label}</span>`; }
function abilityText(c){ return c.abilities.length? c.abilities.map(a=>ABILITY_INFO[a]).join(' + ') : 'No special power'; }

function showPetReveal(c, count){
  const dup = count>1;
  const body=document.getElementById('petModalBody');
  body.innerHTML = `
    <div class="muted">${dup?'You got a duplicate!':'✨ You got a NEW pet! ✨'}</div>
    <div class="pet-big" style="--rc:${RARITY_INFO[c.rarity].color}">${c.emoji}</div>
    <h2 style="margin:4px 0">${c.name} ${rarityBadge(c.rarity)}</h2>
    <p class="muted" style="font-size:13px">✨ ${abilityText(c)}</p>
    ${dup?`<p class="hint">You now own ${count}. Sell a duplicate for 🪙${c.sell}.</p>`:''}
    <button class="btn pink" onclick="doEquip('${c.id}')">${SAVE.equippedPet===c.id?'✓ Equipped':'Equip'}</button>
    ${dup?`<button class="btn gold" onclick="doSell('${c.id}')">Sell duplicate (🪙${c.sell})</button>`:''}
    <button class="btn ghost" onclick="closeModal('petModal')">Close</button>`;
  openModal('petModal');
}
function doEquip(id){
  equipPet(id); renderPets(); const c=creatureById(id);
  toast(SAVE.equippedPet===id?('Equipped '+c.name+' '+c.emoji):'Unequipped');
  if(document.getElementById('petModal').classList.contains('active')) showPetActions(id);
}
function doSell(id){
  const r=sellDuplicate(id); if(r.error){toast(r.error);return;}
  updateCoinDisplays(); renderPets(); const c=creatureById(id);
  toast('Sold '+c.name+' for 🪙'+r.coins);
  if(document.getElementById('petModal').classList.contains('active')) showPetActions(id);
}
function renderCollectionTab(body){
  const total=CREATURES.length, dex=dexOwnedCount();
  const eq=SAVE.equippedPet?creatureById(SAVE.equippedPet):null;
  // ----- Blob-Dex completion goals -----
  const pct=Math.round(dex/total*100);
  let html=`<div class="dex-head">📒 Blob-Dex <b>${dex}/${total}</b>
    <div class="qbar" style="margin:6px 0"><div class="qfill" style="width:${pct}%"></div></div></div>`;
  html += DEX_MILESTONES.map(m=>{
    const done=dexMilestoneDone(m), claimed=dexMilestoneClaimed(m.id);
    const btn = claimed ? `<span class="muted" style="font-size:12px">Claimed ✓</span>`
      : done ? `<button class="btn gold small" onclick="doClaimDex('${m.id}')">🪙${m.reward}</button>`
      : `<span class="muted" style="font-size:12px;white-space:nowrap">🪙${m.reward}</span>`;
    return `<div class="today-row ${done&&!claimed?'ready':''}">
      <div class="today-ico">${claimed?'🏅':done?'🎁':'🔒'}</div>
      <div class="today-info"><b>${m.label}</b><div class="muted" style="font-size:11px">${Math.min(dex,m.need)}/${m.need}</div></div>
      ${btn}</div>`;
  }).join('');
  html+=`<p class="hint">Equipped: ${eq?eq.emoji+' '+eq.name:'none'}</p>`;
  for(const r of RARITIES){
    html+=`<div class="rar-head" style="color:${RARITY_INFO[r].color}">${RARITY_INFO[r].label}</div><div class="pet-grid">`;
    for(const c of creaturesOfRarity(r)){
      const owns=ownsPet(c.id)||isShiny(c.id); const eqd=SAVE.equippedPet===c.id; const n=petCount(c.id);
      const shiny=isShiny(c.id); const lvl=owns?petLevel(c.id):1;
      html+=`<div class="pet-cell ${owns?'':'locked'} ${eqd?'equipped':''} ${shiny?'shiny':''}" style="--rc:${RARITY_INFO[r].color}" onclick="${owns?`showPetActions('${c.id}')`:''}">
        <div class="pet-emoji">${owns?c.emoji:'❓'}${shiny?'<span class="shiny-star">🌟</span>':''}</div>
        <div class="pet-name">${owns?c.name:'???'}</div>
        ${owns?`<span class="lvl-badge">L${lvl}</span>`:''}
        ${owns&&n>1?`<span class="count-badge">x${n}</span>`:''}
        ${eqd?`<span class="eq-badge">✓</span>`:''}</div>`;
    }
    html+=`</div>`;
  }
  body.innerHTML=html;
}
function showPetActions(id){
  const c=creatureById(id); const n=petCount(id);
  const shiny=isShiny(id); const xi=petXpInfo(id);
  const pct=xi.max?100:Math.round(xi.into/xi.need*100);
  const body=document.getElementById('petModalBody');
  body.innerHTML=`
    <div class="pet-big ${shiny?'shiny-big':''}" style="--rc:${RARITY_INFO[c.rarity].color}">${c.emoji}${shiny?' 🌟':''}</div>
    <h2 style="margin:4px 0">${shiny?'Shiny ':''}${c.name} ${rarityBadge(c.rarity)}</h2>
    <p class="muted" style="font-size:13px">✨ ${abilityText(c)}${shiny?' · <b style="color:#e0a01a">golden bonus!</b>':''}</p>
    <div class="lvl-row"><span>Lv ${xi.lvl}${xi.max?' (MAX)':''}</span>
      <div class="xp-bar"><div class="xp-fill" style="width:${pct}%"></div></div></div>
    <p class="hint">You own ${n}${shiny?' + 1 shiny ✨':''}${n>1?' · duplicates sell for 🪙'+c.sell+' each':''}</p>
    <button class="btn pink" onclick="doEquip('${c.id}')">${SAVE.equippedPet===c.id?'✓ Power equipped (tap to remove)':'Use power'}</button>
    <button class="btn blue" onclick="doWearPet('${c.id}')">${SAVE.petSkin===c.id?'✓ Worn as skin (tap to remove)':'👕 Wear as skin'}</button>
    ${n>=3?`<button class="btn gold" onclick="doMakeShiny('${c.id}')">🌟 Make Shiny (uses 3)</button>`:''}
    ${n>1?`<button class="btn ghost" onclick="doSell('${c.id}')">Sell duplicate (🪙${c.sell})</button>`:''}
    <button class="btn ghost" onclick="closeModal('petModal')">Close</button>`;
  openModal('petModal');
}
function doMakeShiny(id){
  const r=makeShiny(id); if(r.error){ toast(r.error); return; }
  SFX.rare(); const c=creatureById(id);
  toast('🌟 Forged a shiny '+c.name+'!');
  renderPets(); showPetActions(id);
}

/* ---------------- Fuse tab ---------------- */
function renderFuseTab(body){
  // shiny upgrades: any pet you own 3+ copies of
  const shinyable = CREATURES.filter(c=>petCount(c.id)>=3);
  let shinyHtml = shinyable.length
    ? shinyable.map(c=>`<div class="chest-row">
        <div class="chest-ico">${c.emoji}</div>
        <div class="chest-info"><b>${c.name}</b>
          <div class="muted" style="font-size:11px">You own ${petCount(c.id)} · turn 3 into a golden shiny</div></div>
        <button class="btn gold small" onclick="doMakeShiny('${c.id}')">🌟 Forge</button>
      </div>`).join('')
    : `<p class="hint">Collect 3 copies of any pet to forge a 🌟 shiny version (golden glow + a power boost).</p>`;

  // rarity merges: 3 of a rarity -> 1 random of the next rarity up
  let mergeHtml='';
  for(const r of RARITIES){
    const nr=nextRarity(r); if(!nr) continue;
    const have=rarityCopies(r);
    const can=have>=3;
    mergeHtml+=`<div class="chest-row">
      <div class="chest-ico" style="color:${RARITY_INFO[r].color}">🧬</div>
      <div class="chest-info"><b>${RARITY_INFO[r].label} → ${RARITY_INFO[nr].label}</b>
        <div class="muted" style="font-size:11px">Fuse 3 ${RARITY_INFO[r].label} pets → 1 random ${RARITY_INFO[nr].label} (you have ${have})</div></div>
      <button class="btn pink small" ${can?'':'disabled'} onclick="doFuseRarity('${r}')">Fuse 3</button>
    </div>`;
  }

  body.innerHTML = `<div class="rar-head">🌟 Forge a Shiny</div>${shinyHtml}
    <div class="rar-head" style="margin-top:14px">🧬 Rarity Fusion</div>
    <p class="hint" style="margin-top:0">Combine 3 pets of one rarity into a random pet of the next rarity up!</p>
    ${mergeHtml}`;
}
function doFuseRarity(r){
  const res=fuseRarity(r); if(res.error){ toast(res.error); return; }
  const rare=['legendary','mythical','secret'].includes(res.creature.rarity);
  rare?SFX.rare():SFX.chest();
  if(res.creature.rarity==='secret') unlockAchievement('secret');
  checkPetAchievements();
  renderPets(); showPetReveal(res.creature, res.count);
}
function doWearPet(id){
  SFX.click();
  SAVE.petSkin = (SAVE.petSkin===id) ? null : id;
  persist(); const c=creatureById(id);
  toast(SAVE.petSkin===id ? ('Now wearing '+c.name+' '+c.emoji) : 'Back to your blob');
  showPetActions(id);
}
function renderTradeTab(body){
  const ownedList=CREATURES.filter(c=>ownsPet(c.id));
  const opts=ownedList.map(c=>`<option value="${c.id}">${c.emoji} ${c.name} (x${petCount(c.id)})</option>`).join('');
  body.innerHTML=`
    <h3 style="margin:6px 0">Send a pet 🎁</h3>
    <p class="hint" style="margin-top:0">Pick a pet &amp; your friend's username to make a code to share.</p>
    <input class="text" id="tradeTo" maxlength="12" placeholder="Friend's username"/>
    <select class="text" id="tradePet">${opts||'<option value="">No pets yet</option>'}</select>
    <button class="btn pink" onclick="doMakeTrade()" ${ownedList.length?'':'disabled'}>Make trade code</button>
    <div id="tradeCodeOut"></div>
    <hr style="border:none;border-top:2px dashed #efe7fb;margin:14px 0">
    <h3 style="margin:6px 0">Receive a pet 🔁</h3>
    <input class="text" id="tradeCodeIn" placeholder="Paste trade code"/>
    <button class="btn gold" onclick="doRedeemTrade()">Redeem</button>`;
}
function doMakeTrade(){
  const to=(document.getElementById('tradeTo').value||'').trim();
  const pet=document.getElementById('tradePet').value;
  if(!pet){ toast('Pick a pet'); return; }
  const c=creatureById(pet);
  const r=makeTradeCode(pet, to);
  if(r.error){ toast(r.error); return; }
  document.getElementById('tradeCodeOut').innerHTML=
    `<div class="code-box" style="font-size:13px;letter-spacing:1px;word-break:break-all">${r.code}</div>
     <p class="hint">Share this with ${escapeHtml(to||'your friend')} — they paste it in “Receive”. You gave away ${c.emoji} ${c.name}.</p>`;
  updateCoinDisplays();
}
function doRedeemTrade(){
  const code=document.getElementById('tradeCodeIn').value;
  const r=redeemTradeCode(code);
  if(r.error){ toast(r.error); return; }
  renderPets();
  showPetReveal(r.creature, petCount(r.creature.id));
}

/* ---------------- Sound & music ---------------- */
function refreshSoundBtn(){
  const b=document.getElementById('soundBtn'); if(b) b.textContent = SAVE.soundOn!==false ? '🔊' : '🔇';
}
function toggleSound(){
  SAVE.soundOn = !(SAVE.soundOn!==false); persist();
  refreshSoundBtn(); if(SAVE.soundOn){ SFX.resume(); SFX.coin(); }
}
function refreshMusicBtn(){
  const b=document.getElementById('musicBtn'); if(b) b.style.opacity = SAVE.musicOn!==false ? '1' : '0.45';
}
let lastMusicMode='lobby';
// play whichever song the player picked (or an ambient loop if they chose "off-pick")
function playPickedMusic(){
  if(SAVE.musicOn===false) return;
  SFX.resume();
  const id=SAVE.musicTrack||'chill';
  if(id==='ambient') SFX.startMusic(lastMusicMode);
  else SFX.playSong(id);
}
function startMusicIfOn(mode){ if(mode) lastMusicMode=mode; if(SAVE.musicOn!==false){ playPickedMusic(); } }

const MUSIC_PICKS=['rushe','entertainer','tarantella','muppets','chill'];
function openMusicPicker(){ SFX.init(); SFX.resume(); showScreen('musicScreen'); renderMusicPicker(); }
function renderMusicPicker(){
  const body=document.getElementById('musicBody'); if(!body) return;
  const on=SAVE.musicOn!==false, cur=SAVE.musicTrack||'chill';
  body.innerHTML = MUSIC_PICKS.map(id=>{
    const s=SFX.SONGS[id]; const sel=(on && cur===id);
    return `<button class="music-pick ${sel?'sel':''}" onclick="pickSong('${id}')">
      <span class="mp-name">${s.name}</span>${sel?'<span class="mp-now">▶ playing</span>':''}</button>`;
  }).join('') +
  `<button class="music-pick ${!on?'sel':''}" onclick="musicOff()">
     <span class="mp-name">🔇 Music Off</span>${!on?'<span class="mp-now">muted</span>':''}</button>`;
}
function pickSong(id){
  SAVE.musicOn=true; SAVE.musicTrack=id; persist();
  refreshMusicBtn(); SFX.resume(); SFX.playSong(id); renderMusicPicker();
}
function musicOff(){
  SAVE.musicOn=false; persist(); refreshMusicBtn(); SFX.stopMusic(); renderMusicPicker();
}
// kept for any old callers
function toggleMusic(){ openMusicPicker(); }

/* ---------------- Achievements ---------------- */
function openAchievements(){ showScreen('achievementsScreen'); renderAchievements(); }
function renderAchievements(){
  updateCoinDisplays();
  const got=(SAVE.achievements||[]).length;
  document.getElementById('achProgress').textContent = `Unlocked ${got}/${ACHIEVEMENTS.length}`;
  document.getElementById('achBody').innerHTML = ACHIEVEMENTS.map(a=>{
    const has=(SAVE.achievements||[]).includes(a.id);
    return `<div class="ach-row ${has?'got':''}">
      <div class="ach-ico">${has?a.emoji:'🔒'}</div>
      <div class="ach-info"><b>${a.name}</b><div class="muted" style="font-size:12px">${a.desc}</div></div>
      ${has?'<span class="badge">✓</span>':''}</div>`;
  }).join('');
}

/* ---------------- Boot ---------------- */
function boot(){
  gameInit();
  SFX.init();
  // browsers need a user gesture to start audio
  const wake=()=>{ SFX.init(); SFX.resume(); startMusicIfOn(); window.removeEventListener('pointerdown',wake); window.removeEventListener('touchstart',wake); };
  window.addEventListener('pointerdown',wake); window.addEventListener('touchstart',wake);
  Game.onLevelComplete=onLevelComplete;
  Game.onCheckpoint=(i)=>{};
  Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
  initLobby();
  refreshSoundBtn(); refreshMusicBtn();
  showScreen('lobbyScreen');
  // pop the login reward straight away if it's ready (strong daily hook)
  if(canClaimLogin()) setTimeout(openLogin, 350);
  // build floating decor
  const decor=document.getElementById('bgDecor');
  for(let i=0;i<10;i++){
    const s=document.createElement('span');
    const sz=30+Math.random()*90;
    s.style.width=sz+'px';s.style.height=sz+'px';
    s.style.left=Math.random()*100+'vw';s.style.top=Math.random()*100+'vh';
    s.style.animationDelay=(Math.random()*6)+'s';
    decor.appendChild(s);
  }
}
window.addEventListener('load',boot);
