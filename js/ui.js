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
    drawCharacter(ctx,size/2,size/2+6,72,{skin:SAVE.skin,accessory:SAVE.accessory,face:SAVE.face,facing:1,t});
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
  else renderFaces(grid);
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
    if(!owned){const p=document.createElement('span');p.className='price';p.textContent=f.special?'Chest':'Free';sw.appendChild(p);}
    sw.onclick=()=>buyOrEquip('face',f,owned);
    grid.appendChild(sw);
  });
}

function buyOrEquip(kind,item,owned){
  if(owned){
    if(kind==='skin')SAVE.skin=item.id;
    if(kind==='accessory')SAVE.accessory=item.id;
    if(kind==='face')SAVE.face=item.id;
    persist();renderCustomize();
    return;
  }
  if(item.special){ toast('🎁 Only from the Daily Chest!'); return; }
  if(item.price>0 && SAVE.coins<item.price){ toast('Not enough coins 🪙'); return; }
  // purchase
  if(item.price>0) SAVE.coins-=item.price;
  if(kind==='skin'){ SAVE.ownedSkins.push(item.id); SAVE.skin=item.id; }
  if(kind==='accessory'){ SAVE.ownedAccessories.push(item.id); SAVE.accessory=item.id; }
  if(kind==='face'){ SAVE.ownedFaces.push(item.id); SAVE.face=item.id; }
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

function playSolo(diff){
  Game.multiplayer=false;
  Game.onLevelComplete=onLevelComplete;
  Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
  startGame({level:1, seed:Math.floor(Math.random()*1e6), mode:'solo',
             multiplayer:false, difficulty:(diff==='easy'?'easy':'hard')});
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
    : 'Race: same obby, separate climbs — first to the top wins! 🏁';
}
function wireRoomCallbacks(){
  MP.onRosterChange=refreshRoster;
  MP.onPeerLeft=()=>{ toast('A player left'); refreshRoster(); };
  MP.onStart=(config)=>{
    Game.onLevelComplete=onLevelComplete;
    Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
    startGame({level:config.level, seed:config.seed, mode:config.mode,
               multiplayer:true, difficulty:config.difficulty||'hard'});
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
}
function hostStart(){
  if(!MP.isHost) return;
  const seed=Math.floor(Math.random()*1e6);
  Game.onLevelComplete=onLevelComplete;
  Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
  mpStart({level:1, seed, mode:pendingRoomMode, difficulty:pendingRoomDiff});
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
function onLevelComplete(level, earned, isFinal){
  Game.running=false; cancelAnimationFrame(Game.raf);
  const body=document.getElementById('winBody');
  let waitMsg='';
  if(Game.multiplayer){
    const others=mpRemoteList();
    const doneCount=others.filter(o=>o.finished).length;
    if(Game.mode==='coop') waitMsg=`<p class="muted">Teammates finished: ${doneCount}/${others.length}</p>`;
  }
  if(isFinal){
    body.innerHTML=`<div class="win-emoji">🏆🌈</div>
      <h2>YOU DID IT!</h2>
      <p>You climbed all ${TOTAL_LEVELS} levels!</p>
      <p class="timer-big">+🪙${earned} bonus</p>${waitMsg}
      <button class="btn gold" onclick="backToLobby()">Back to Lobby</button>`;
  }else{
    body.innerHTML=`<div class="win-emoji">🎉</div>
      <h2>Level ${level} complete!</h2>
      <p class="timer-big">+🪙${earned}</p>${waitMsg}
      <button class="btn" onclick="goNextLevel()">Next Level →</button>
      <button class="btn ghost" onclick="backToLobby()">Lobby</button>`;
  }
  openModal('winModal');
}
function goNextLevel(){
  closeModal('winModal');
  Game.running=true; Game.last=performance.now(); Game.acc=0;
  nextLevel();
  cancelAnimationFrame(Game.raf); Game.raf=requestAnimationFrame(gameLoop);
}
function backToLobby(){
  closeModal('winModal');
  if(Game.multiplayer) mpLeave();
  showScreen('lobbyScreen'); initLobby();
}

/* ---------------- Boot ---------------- */
function boot(){
  gameInit();
  Game.onLevelComplete=onLevelComplete;
  Game.onCheckpoint=(i)=>{};
  Game.onExit=()=>{ showScreen('lobbyScreen'); initLobby(); };
  initLobby();
  showScreen('lobbyScreen');
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
