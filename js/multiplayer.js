/* ===== Multiplayer over WebRTC (PeerJS public broker) =====
   Star topology: joiners connect to the host; the host relays every
   message to all other peers, so everyone sees everyone. */

const MP = {
  peer:null,
  isHost:false,
  inRoom:false,
  roomCode:'',
  conns:[],            // host: all joiner conns. joiner: [hostConn]
  selfId:'',
  profile:null,        // {name,skin,accessory,face}
  remote:{},           // id -> {name,skin,accessory,face,x,y,facing,cp,finished,t}
  roster:{},           // id -> profile (host-maintained, includes self)
  bridges:{},          // grp -> activeUntil (ms epoch) — host authoritative
  bridgeTimer:{},      // grp -> expiry of the timer from an A+B activation
  lifts:{},            // grp -> start time (ms) of a co-op lift rise
  padState:{},         // grp -> {station -> Set(ids)}  (host only)
  trade:null,          // live Adopt-Me-style trade state
  itId:null,           // Tag mode: id of the player who is currently "it"
  startConfig:null,    // {level,seed,mode}
  // callbacks (assigned by game/ui):
  onStart:null,
  onRosterChange:null,
  onPeerLeft:null,
  onError:null,
};

function mpCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s='';for(let i=0;i<5;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
const mpPrefix = c => 'obbyblob-'+c;

function mpEnsureLib(){
  return typeof Peer !== 'undefined';
}

function mpCreateRoom(profile){
  return new Promise((resolve,reject)=>{
    if(!mpEnsureLib()) return reject(new Error('Multiplayer library not loaded. Check your connection.'));
    MP.profile=profile; MP.isHost=true;
    const code=mpCode();
    const peer=new Peer(mpPrefix(code),{debug:1});
    MP.peer=peer;
    let done=false;
    const fail=e=>{ if(!done){done=true;reject(e);} };
    peer.on('open', id=>{
      done=true;
      MP.selfId=id; MP.roomCode=code; MP.inRoom=true;
      MP.roster[id]=profile;
      peer.on('connection', conn=>mpHandleConn(conn));
      resolve(code);
    });
    peer.on('error', err=>{
      // taken id -> retry with new code once
      if(err.type==='unavailable-id'){ peer.destroy(); mpCreateRoom(profile).then(resolve,reject); return; }
      fail(err); if(MP.onError) MP.onError(err);
    });
    setTimeout(()=>fail(new Error('Could not reach the matchmaking server. Try again.')),12000);
  });
}

function mpJoinRoom(code, profile){
  return new Promise((resolve,reject)=>{
    if(!mpEnsureLib()) return reject(new Error('Multiplayer library not loaded. Check your connection.'));
    MP.profile=profile; MP.isHost=false;
    const peer=new Peer({debug:1});
    MP.peer=peer;
    let done=false;
    peer.on('open', id=>{
      MP.selfId=id;
      const conn=peer.connect(mpPrefix(code),{reliable:true,metadata:{profile}});
      MP.conns=[conn]; MP.roomCode=code;
      conn.on('open',()=>{
        MP.inRoom=true; done=true;
        conn.send({t:'hello', id, profile});
        mpWire(conn);
        resolve(code);
      });
      conn.on('error',e=>{ if(!done){done=true;reject(new Error('Room not found.'));} });
    });
    peer.on('error',err=>{
      if(err.type==='peer-unavailable'){ if(!done){done=true;reject(new Error('Room "'+code+'" not found.'));} return; }
      if(!done){done=true;reject(err);}
      if(MP.onError) MP.onError(err);
    });
    setTimeout(()=>{ if(!done){done=true;reject(new Error('Could not reach the room. Check the code.'));} },12000);
  });
}

function mpHandleConn(conn){
  MP.conns.push(conn);
  mpWire(conn);
}

function mpWire(conn){
  conn.on('data', msg=>mpOnMessage(conn,msg));
  conn.on('close', ()=>mpDropConn(conn));
  conn.on('error', ()=>mpDropConn(conn));
}

function mpDropConn(conn){
  MP.conns = MP.conns.filter(c=>c!==conn);
  const pid = conn.peer;
  // find roster id linked to this conn (joiner peer id)
  Object.keys(MP.remote).forEach(id=>{ if(id===pid){ delete MP.remote[id]; delete MP.roster[id]; }});
  if(MP.isHost){ mpBroadcast({t:'roster', roster:MP.roster}); }
  if(MP.onPeerLeft) MP.onPeerLeft(pid);
  if(MP.onRosterChange) MP.onRosterChange();
}

function mpOnMessage(conn,msg){
  switch(msg.t){
    case 'hello':
      MP.roster[msg.id]=msg.profile;
      MP.remote[msg.id]=Object.assign({},msg.profile,{x:0,y:0,facing:1,cp:0,finished:false});
      if(MP.isHost){
        // send full roster to everyone, plus current start config if already started
        mpBroadcast({t:'roster', roster:MP.roster});
        if(MP.startConfig) conn.send({t:'start', config:MP.startConfig});
      }
      if(MP.onRosterChange) MP.onRosterChange();
      break;
    case 'roster':
      MP.roster=msg.roster;
      Object.keys(MP.roster).forEach(id=>{
        if(id!==MP.selfId && !MP.remote[id])
          MP.remote[id]=Object.assign({},MP.roster[id],{x:0,y:0,facing:1,cp:0,finished:false});
      });
      if(MP.onRosterChange) MP.onRosterChange();
      break;
    case 'start':
      MP.startConfig=msg.config;
      if(MP.onStart) MP.onStart(msg.config);
      break;
    case 'pos': {
      const r=MP.remote[msg.id]||(MP.remote[msg.id]={});
      Object.assign(r,msg.d,{id:msg.id});
      if(MP.isHost) mpRelay(conn,msg);
      break;
    }
    case 'cp': {
      const r=MP.remote[msg.id]; if(r){ r.cp=msg.index; }
      if(MP.isHost) mpRelay(conn,msg);
      if(MP.onRosterChange) MP.onRosterChange();
      break;
    }
    case 'finish': {
      const r=MP.remote[msg.id]; if(r){ r.finished=true; }
      if(MP.isHost) mpRelay(conn,msg);
      if(MP.onRosterChange) MP.onRosterChange();
      break;
    }
    case 'pad':
      // joiner -> host pad occupancy. host computes bridge state.
      if(MP.isHost){ mpSetPad(msg.id,msg.grp,msg.pad,msg.on); }
      break;
    case 'bridge':
      // host -> peers authoritative bridge activation
      MP.bridges[msg.grp]=msg.until;
      break;
    case 'lift':
      MP.lifts[msg.grp]=msg.start;
      break;
    case 'emote': {
      const r=MP.remote[msg.id]; if(r){ r.emote=msg.e; r.emoteAt=nowMs(); }
      if(MP.isHost) mpRelay(conn,msg);
      break;
    }
    case 'boost': {
      if(MP.isHost) mpRelay(conn,msg);
      if(typeof onBoostFrom==='function') onBoostFrom(msg.id);
      break;
    }
    case 'it': {
      MP.itId=msg.id;
      if(MP.isHost) mpRelay(conn,msg);
      if(typeof onItChange==='function') onItChange(msg.id);
      break;
    }
    case 'trade':
      mpTradeOnMessage(msg);
      break;
  }
}

/* ---- live two-way trading (both players online) ---- */
function mpTradeStart(){
  const others=Object.keys(MP.roster).filter(id=>id!==MP.selfId);
  if(!others.length) return false;
  MP.trade={ active:true, partnerName:(MP.roster[others[0]]&&MP.roster[others[0]].name)||'Friend',
             myOffer:[], theirOffer:[], myAccepted:false, theirAccepted:false, done:false };
  mpSend({t:'trade', sub:'open', name:(SAVE.name||'Friend')});
  return true;
}
function mpTradeOnMessage(msg){
  if(msg.sub==='open'){
    if(!MP.trade || !MP.trade.active || MP.trade.done){
      MP.trade={ active:true, partnerName:msg.name||'Friend',
                 myOffer:[], theirOffer:[], myAccepted:false, theirAccepted:false, done:false };
    }
    if(typeof onTradeOpen==='function') onTradeOpen();
  } else if(!MP.trade){ return;
  } else if(msg.sub==='offer'){
    MP.trade.theirOffer=msg.offer||[]; MP.trade.myAccepted=false; MP.trade.theirAccepted=false;
    if(typeof onTradeUpdate==='function') onTradeUpdate();
  } else if(msg.sub==='accept'){
    MP.trade.theirAccepted=true; mpTradeTryComplete();
    if(typeof onTradeUpdate==='function') onTradeUpdate();
  } else if(msg.sub==='cancel'){
    MP.trade.active=false;
    if(typeof onTradeCancel==='function') onTradeCancel();
  }
}
function mpTradeSetOffer(list){
  if(!MP.trade) return;
  MP.trade.myOffer=list.slice(); MP.trade.myAccepted=false; MP.trade.theirAccepted=false;
  mpSend({t:'trade', sub:'offer', offer:MP.trade.myOffer});
  if(typeof onTradeUpdate==='function') onTradeUpdate();
}
function mpTradeAccept(){
  if(!MP.trade) return;
  MP.trade.myAccepted=true; mpSend({t:'trade', sub:'accept'}); mpTradeTryComplete();
  if(typeof onTradeUpdate==='function') onTradeUpdate();
}
function mpTradeTryComplete(){
  const t=MP.trade; if(!t || t.done) return;
  if(!(t.myAccepted && t.theirAccepted)) return;
  // make sure we still own everything we offered
  for(const id of t.myOffer){ if((SAVE.pets[id]||0)<=0) return; }
  for(const id of t.myOffer){
    SAVE.pets[id]--; if(SAVE.pets[id]<=0){ delete SAVE.pets[id]; if(SAVE.equippedPet===id) SAVE.equippedPet=null; }
  }
  for(const id of t.theirOffer){ SAVE.pets[id]=(SAVE.pets[id]||0)+1; }
  persist();
  t.done=true; t.active=false;
  if(typeof onTradeComplete==='function') onTradeComplete();
}
function mpTradeCancel(){
  if(MP.trade){ mpSend({t:'trade', sub:'cancel'}); MP.trade.active=false; }
}

function mpRelay(fromConn,msg){
  MP.conns.forEach(c=>{ if(c!==fromConn){ try{c.send(msg);}catch(e){} }});
}
function mpBroadcast(msg){
  MP.conns.forEach(c=>{ try{c.send(msg);}catch(e){} });
}
function mpSend(msg){
  // joiner: send to host (single conn). host: broadcast.
  if(MP.isHost) mpBroadcast(msg);
  else if(MP.conns[0]){ try{MP.conns[0].send(msg);}catch(e){} }
}

/* ---- host starts the game for everyone ---- */
function mpStart(config){
  MP.startConfig=config;
  mpBroadcast({t:'start', config});
  if(MP.onStart) MP.onStart(config);
}

/* ---- gameplay senders ---- */
function mpSendPos(d){ mpSend({t:'pos', id:MP.selfId, d}); }
function mpSendCheckpoint(index){ MP.roster[MP.selfId]&&(MP.roster[MP.selfId].cp=index); mpSend({t:'cp', id:MP.selfId, index}); }
function mpSendFinish(){ mpSend({t:'finish', id:MP.selfId}); }
function mpSendEmote(e){ mpSend({t:'emote', id:MP.selfId, e}); }
function mpSendBoost(){ mpSend({t:'boost', id:MP.selfId}); }
/* Tag mode: announce who is now "it" (everyone, host relays) */
function mpSendIt(id){ MP.itId=id; mpSend({t:'it', id}); }
/* how many remote players have already finished (for race standings) */
function mpFinishedCount(){ return mpRemoteList().filter(r=>r.finished).length; }

/* ---- co-op devices (host authoritative) ----
   Pads 'A'/'B'  -> TIMED bridge: both pressed by two different players => 10s.
   Levers 'HA'/'HB' -> HELD bridge: solid while either lever is held; vanishes
   the instant nobody holds one (one player can't pass alone). */
function mpSetPad(playerId,grp,pad,on){
  if(!MP.padState[grp]) MP.padState[grp]={};
  const s=MP.padState[grp];
  if(!s[pad]) s[pad]=new Set();
  if(on) s[pad].add(playerId); else s[pad].delete(playerId);
  if(pad==='LIFT') mpEvalLift(grp); else mpEvalGate(grp);
}

/* Co-op lift: rises (one-shot) once TWO different players stand on it. */
function mpEvalLift(grp){
  const s=MP.padState[grp]||{};
  const set=s.LIFT||new Set();
  const twoAboard = set.size>=2;
  const active = MP.lifts[grp] && (nowMs()-MP.lifts[grp] < 6600);
  if(twoAboard && !active){
    MP.lifts[grp]=nowMs();
    mpBroadcast({t:'lift', grp, start:MP.lifts[grp]});
  }
}

/* Unified gate state (host authoritative). A bridge group can have:
   - pads 'A' & 'B'  -> pressing both (two different players) starts a 10s timer.
   - any 'H*' lever  -> while held, the bridge stays solid (no lingering timer).
   The bridge is solid if a lever is held OR the A+B timer is still running. */
function mpEvalGate(grp){
  const s=MP.padState[grp]||{};
  let bothAB=false;
  if(s.A && s.B){ for(const ia of s.A){ for(const ib of s.B){ if(ia!==ib) bothAB=true; } } }
  let held=false;
  for(const k in s){ if(k[0]==='H' && s[k].size>0) held=true; }
  if(bothAB){
    const t=MP.bridgeTimer[grp];
    if(!t || t<nowMs()) MP.bridgeTimer[grp]=nowMs()+12000;   // time to climb together
  }
  const timerActive = MP.bridgeTimer[grp] && MP.bridgeTimer[grp]>nowMs();
  const until = held ? (nowMs()+3600000) : (timerActive ? MP.bridgeTimer[grp] : 0);
  if(MP.bridges[grp]!==until){
    MP.bridges[grp]=until;
    mpBroadcast({t:'bridge', grp, until});
  }
}
// local player reports pad state. host applies directly; joiner sends to host.
function mpReportPad(grp,pad,on){
  if(MP.isHost) mpSetPad(MP.selfId,grp,pad,on);
  else mpSend({t:'pad', id:MP.selfId, grp, pad, on});
}

function nowMs(){ return new Date().getTime(); }

function mpLeave(){
  try{ MP.peer && MP.peer.destroy(); }catch(e){}
  MP.peer=null;MP.conns=[];MP.inRoom=false;MP.isHost=false;MP.roomCode='';
  MP.remote={};MP.roster={};MP.bridges={};MP.bridgeTimer={};MP.lifts={};MP.padState={};MP.startConfig=null;MP.trade=null;MP.itId=null;
}

function mpRemoteList(){ return Object.keys(MP.remote).map(id=>Object.assign({id},MP.remote[id])); }
function mpPlayerCount(){ return Object.keys(MP.roster).length || 1; }
