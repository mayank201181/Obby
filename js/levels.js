/* ===== Level generation =====
   Vertical climb. World y increases downward; the player starts at the
   bottom (large y) and climbs to the finish at the top (y≈0).
   Generation is seeded so multiplayer rooms share the exact same obby. */

const WORLD_W = 760;          // logical world width
const BAND = 540;             // vertical distance between checkpoints
const CHECKPOINTS = 10;       // checkpoints per level
const TOTAL_LEVELS = 5;

function mulberry32(a){
  return function(){
    a|=0;a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}

/* mode: 'solo' | 'race' | 'coop'   (coop adds 2-player bridge puzzles) */
function generateLevel(level, seed, mode){
  const rnd = mulberry32((seed*1000 + level*97 + 7)|0);
  const rint=(a,b)=>Math.floor(a+rnd()*(b-a+1));
  const pick=arr=>arr[Math.floor(rnd()*arr.length)];

  const platforms=[];
  const checkpoints=[];
  let id=0;
  const totalHeight = BAND*(CHECKPOINTS+1);
  const finishY = 60;                         // top
  const bottomY = totalHeight;                // start ground level

  // difficulty scales with level
  const diff = Math.min(1, (level-1)/(TOTAL_LEVELS-1));

  // distinct block sizes (widths) for clear variety: tiny..extra-large.
  // Later levels lean toward SMALLER blocks (harder to land on).
  const SIZES   = [60, 86, 120, 160, 210];
  const SIZE_W  = [2+diff*5, 4+diff*3, 5, Math.max(0.5,3-diff*1.8), Math.max(0.4,2-diff*1.3)];
  const SIZE_WSUM = SIZE_W.reduce((a,b)=>a+b,0);
  function pickSize(){
    let r = rnd()*SIZE_WSUM;
    for(let i=0;i<SIZES.length;i++){ r-=SIZE_W[i]; if(r<=0) return SIZES[i]; }
    return SIZES[2];
  }
  // max horizontal centre offset is scaled to the TARGET size so small blocks
  // are placed closer (fair) and within the measured jump-reach envelope.
  // Gaps stretch wider on later levels but stay inside the reachable envelope.
  function maxOffsetFor(w){
    let m = w>=200?188 : w>=150?172 : w>=110?152 : w>=80?122 : 98;
    return m + diff*20;          // harder on later levels, still reachable
  }

  // ===== CO-OP (Team) mode: a REQUIRED 2-player gate in EVERY section =====
  // From the very first band onward, you can only progress by working together.
  // Two gate kinds alternate so the teamwork stays varied.
  if(mode==='coop'){
    const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
    // harder on later levels: narrower steps & lift platforms
    const cBottomY=3600, levW=84, stepW=Math.round(124 - diff*28);
    platforms.push({id:id++, x:WORLD_W/2-140, y:cBottomY, w:280, h:40, type:'big'});
    const cStart={x:WORLD_W/2, y:cBottomY-40};
    let land={x:WORLD_W/2, y:cBottomY};   // current landing top, we build upward

    // LEAPFROG gate — the only way up is to help each other:
    //  1) you stand on the BOTTOM button (HA) -> a staircase of bridges turns solid
    //  2) your partner climbs it to the next ledge
    //  3) your partner stands on the TOP button (HB) -> the staircase stays solid
    //  4) you let go and climb up too.
    // The bridges vanish the instant nobody holds a button, so one player alone
    // can never pass (you can't hold a button and climb at the same time).
    function leapfrogGate(entry, g, nSteps){
      const ex=entry.x, ey=entry.y;
      // bottom button (you hold this for your partner)
      const haC=clamp(ex-150,70,WORLD_W-70);
      platforms.push({id:id++, x:haC-levW/2, y:ey-44, w:levW, h:24, type:'pad', pad:'HA', grp:g});
      // staircase of held bridges (randomised zig-zag shape)
      const lean=rnd()<0.5?1:-1, sp=rint(16,44);
      let y=ey;
      for(let i=0;i<nSteps;i++){
        y -= rint(88,100);
        const x=clamp(ex + lean*((i%2)?sp:-sp) - stepW/2, 40, WORLD_W-40-stepW);
        platforms.push({id:id++, x, y, w:stepW, h:24, type:'bridge', grp:g, gate:'hold'});
      }
      const npW=190, npY=y-58, npX=clamp(ex-npW/2,60,WORLD_W-60-npW);
      platforms.push({id:id++, x:npX, y:npY, w:npW, h:30, type:'checkpoint', cpIndex:g+1});
      checkpoints.push({index:g+1, x:npX+npW/2, y:npY});
      // top button (your partner holds this so YOU can climb up after)
      const hbC=clamp(npX+npW/2+150,70,WORLD_W-70);
      platforms.push({id:id++, x:hbC-levW/2, y:npY-44, w:levW, h:24, type:'pad', pad:'HB', grp:g});
      return {x:npX+npW/2, y:npY};
    }

    // BOTH-STAND gate — you BOTH stand on the two pads at once, then a staircase
    // appears for ~12s and you both climb up together (no holding, no turns).
    function bothStandGate(entry, g, nSteps){
      const ex=entry.x, ey=entry.y;
      const spc=rint(82,112);
      const aC=clamp(ex-spc,60,WORLD_W-60), bC=clamp(ex+spc,60,WORLD_W-60);
      platforms.push({id:id++, x:aC-levW/2, y:ey-46, w:levW, h:24, type:'pad', pad:'A', grp:g, stand:true});
      platforms.push({id:id++, x:bC-levW/2, y:ey-46, w:levW, h:24, type:'pad', pad:'B', grp:g, stand:true});
      const lean=rnd()<0.5?1:-1, sp=rint(16,42); let y=ey;
      for(let i=0;i<nSteps;i++){
        y -= rint(90,100);
        const x=clamp(ex + lean*((i%2)?sp:-sp) - stepW/2, 40, WORLD_W-40-stepW);
        platforms.push({id:id++, x, y, w:stepW, h:24, type:'bridge', grp:g, gate:'timed'});
      }
      const npW=190, npY=y-58, npX=clamp(ex-npW/2,60,WORLD_W-60-npW);
      platforms.push({id:id++, x:npX, y:npY, w:npW, h:30, type:'checkpoint', cpIndex:g+1});
      checkpoints.push({index:g+1, x:npX+npW/2, y:npY});
      return {x:npX+npW/2, y:npY};
    }

    // CO-OP LIFT — you BOTH stand on the lift platform and it carries you up.
    // It only rises with two players aboard; one alone can't reach the top.
    function liftGate(entry, g, rise){
      const ex=entry.x, ey=entry.y;
      const liftW=rint(148, Math.round(196-diff*36)), baseY=ey-52, topY=baseY-rise;
      platforms.push({id:id++, x:clamp(ex-liftW/2,40,WORLD_W-40-liftW), y:baseY, w:liftW, h:26,
                      type:'lift', grp:g, baseY, topY, dy:0});
      const npW=190, npY=topY-46, npX=clamp(ex-npW/2,60,WORLD_W-60-npW);
      platforms.push({id:id++, x:npX, y:npY, w:npW, h:30, type:'checkpoint', cpIndex:g+1});
      checkpoints.push({index:g+1, x:npX+npW/2, y:npY});
      return {x:npX+npW/2, y:npY};
    }

    // POWER-DOWN gate — deadly laser beams block the climb. One player holds the
    // bottom POWER button to switch the beams OFF while the other climbs through,
    // then the climber holds the TOP button so the first can follow. Touching a
    // live beam sends you back. You can't hold a button and climb at once, so a
    // single player can never get past.
    function laserGate(entry, g){
      const ex=entry.x, ey=entry.y;
      const wy=ey-80;                                 // walkway height (one hop up)
      const wWidth=380;
      const wxL=clamp(ex-40, 40, WORLD_W-40-wWidth);
      const wxR=wxL+wWidth;
      // one long walkway you walk across
      platforms.push({id:id++, x:wxL, y:wy, w:wWidth, h:24, type:'normal'});
      // a tall LASER WALL blocking the walkway — too high to jump over
      const wallX=wxL+190;
      platforms.push({id:id++, x:wallX-6, y:wy-160, w:12, h:160, type:'laser', grp:g, wall:true});
      // a button on EACH side of the wall (raised pads). Hold one to drop the wall.
      platforms.push({id:id++, x:wallX-110-levW/2, y:wy-44, w:levW, h:24, type:'pad', pad:'HA', grp:g});
      platforms.push({id:id++, x:wallX+110-levW/2, y:wy-44, w:levW, h:24, type:'pad', pad:'HB', grp:g});
      // exit checkpoint above the far end of the walkway
      const npW=180, npY=wy-96, npX=clamp(wxR-npW-8, 60, WORLD_W-60-npW);
      platforms.push({id:id++, x:npX, y:npY, w:npW, h:30, type:'checkpoint', cpIndex:g+1});
      checkpoints.push({index:g+1, x:npX+npW/2, y:npY});
      return {x:npX+npW/2, y:npY};
    }

    // Randomised teamwork puzzles — never the same one twice in a row, and each
    // varies its size/shape so no two sections feel identical.
    // later levels = taller climbs and taller lifts (more to coordinate)
    const sd=Math.round(diff*2);
    const makers = {
      leapfrog:  (e,g)=> leapfrogGate(e, g, rint(2, 3+sd)),
      bothstand: (e,g)=> bothStandGate(e, g, rint(2, 3+sd)),
      lift:      (e,g)=> liftGate(e, g, rint(175,220) + Math.round(diff*120)),
      laser:     (e,g)=> laserGate(e, g),
    };
    const names=['leapfrog','bothstand','lift','laser'];
    let prevType=null;
    for(let g=0; g<CHECKPOINTS; g++){
      const pool=names.filter(n=>n!==prevType);
      const pick=pool[Math.floor(rnd()*pool.length)];
      prevType=pick;
      land = makers[pick](land, g);
    }
    const fw=240, fY=land.y-100;   // finish a short hop above the last checkpoint
    platforms.push({id:id++, x:WORLD_W/2-fw/2, y:fY, w:fw, h:34, type:'finish'});
    return { level, seed, mode, width:WORLD_W, height:cBottomY,
             platforms, checkpoints, start:cStart, finishY:fY };
  }

  // start ground platform
  platforms.push({id:id++, x:WORLD_W/2-130, y:bottomY, w:260, h:40, type:'big'});
  const start = {x:WORLD_W/2, y:bottomY-40};

  let prevX = WORLD_W/2;
  let y = bottomY;                               // ground platform top
  for(let band=0; band<=CHECKPOINTS; band++){
    const bandTop = bottomY - (band+1)*BAND;     // y of this band's checkpoint
    // place stepping platforms upward with guaranteed-clearable gaps
    while(y - 100 > bandTop){
      y -= rint(70, 100);                         // vertical gap: clears one block, never two

      // size first, then a reachable horizontal offset for that size
      const w = pickSize();
      const maxOff = maxOffsetFor(w);
      const off = rint(52, Math.round(maxOff));
      let dir = (rnd()<0.5?-1:1);
      let nx = prevX + dir*off;
      // keep on-screen; if we'd clip an edge, bounce the direction
      if(nx < 60 || nx > WORLD_W-60){ nx = prevX - dir*off; }
      nx = Math.max(60+w/2, Math.min(WORLD_W-60-w/2, nx));
      prevX = nx;

      // mechanic (independent of size) — gentle on the first band
      let type='normal';
      const roll=rnd();
      if(band>0){
        const dThresh = 0.14 + diff*0.26;          // disappearing (L1 14% -> L5 40%)
        const cThresh = dThresh + 0.09 + diff*0.05; // conveyors
        const mThresh = cThresh + 0.09 + diff*0.06; // moving blocks
        const bThresh = mThresh + 0.08;             // bouncy (trampoline)
        const iThresh = bThresh + 0.07;             // ice (slippery)
        const wThresh = iThresh + 0.06;             // wind (gusty push)
        if(roll < dThresh) type='disappear';
        else if(roll < cThresh) type='conveyor';
        else if(roll < mThresh) type='mover';
        else if(roll < bThresh) type='bouncy';
        else if(roll < iThresh) type='ice';
        else if(roll < wThresh) type='wind';
      }
      const p={id:id++, x:nx-w/2, y, w, h:26, type};
      if(type==='conveyor') p.dir = rnd()<0.5?-1:1;
      if(type==='wind') p.dir = rnd()<0.5?-1:1;
      // disappearing blocks crumble faster on later levels (L1 2.2s -> L5 1.1s)
      if(type==='disappear') p.crumbleMs = Math.round(2200 - diff*1100);
      // moving blocks slide left<->right around their placed (mid) position.
      if(type==='mover'){
        const room = Math.min(nx-30-w/2, (WORLD_W-30-w/2)-nx);
        const amp = Math.min(rint(70,108), room);
        if(amp < 45){ p.type='normal'; }          // not enough room -> static
        else{
          p.base = p.x;                            // left coord at mid-swing
          p.amp = amp;
          p.omega = (2*Math.PI)/rint(820,1300);    // rad per ms (fast slide!)
          p.phase = rnd()*Math.PI*2;
          p.dx = 0;
        }
      }
      platforms.push(p);
      // sprinkle collectible coins above some platforms
      if(band>0 && type!=='disappear' && rnd()<0.28){
        platforms.push({id:id++, type:'coin', x:nx-10, y:y-40, w:20, h:20});
      }
    }
    y = bandTop;

    // checkpoint / finish platform (wide & safe)
    if(band<CHECKPOINTS){
      const cw=200, cx=Math.max(60,Math.min(WORLD_W-60-cw, prevX-cw/2));
      const cp={id:id++, x:cx, y:bandTop, w:cw, h:30, type:'checkpoint', cpIndex:band+1};
      platforms.push(cp);
      checkpoints.push({index:band+1, x:cx+cw/2, y:bandTop});
      prevX = cx+cw/2;
    }
  }

  // finish at very top
  const fw=240;
  platforms.push({id:id++, x:WORLD_W/2-fw/2, y:finishY, w:fw, h:34, type:'finish'});

  return {
    level, seed, mode,
    width:WORLD_W, height:totalHeight,
    platforms, checkpoints, start,
    finishY,
  };
}

/* ===== ENDLESS TOWER =====
   An infinitely tall climb. Floors are generated on the fly as you climb and
   get harder the higher you go. There is no finish — you just see how high you
   can get. Each floor ends in a checkpoint, and the floor number is your score. */
function generateTower(seed){
  const bottomY = 4000;
  const platforms = [];
  const checkpoints = [];
  platforms.push({id:0, x:WORLD_W/2-130, y:bottomY, w:260, h:40, type:'big'});
  const world = {
    level:1, seed, mode:'tower', tower:true,
    width:WORLD_W, height:bottomY,
    platforms, checkpoints,
    start:{x:WORLD_W/2, y:bottomY-40},
    finishY:-1e9,                 // never reached -> no finish banner
    _id:1, _prevX:WORLD_W/2, _y:bottomY, _floor:0, _topY:bottomY,
  };
  for(let i=0;i<4;i++) towerFloor(world);   // a few floors ready to climb
  return world;
}

/* build the next floor of the tower (≈5-7 steps then a checkpoint) */
function towerFloor(world){
  const f = world._floor;
  const rnd = mulberry32((world.seed*1000 + f*131 + 17)|0);
  const rint=(a,b)=>Math.floor(a+rnd()*(b-a+1));
  const diff = Math.min(1, f/14);            // difficulty ramps over the first 14 floors
  const SIZES  = [60, 86, 120, 160, 210];
  const SIZE_W = [2+diff*5, 4+diff*3, 5, Math.max(0.5,3-diff*1.8), Math.max(0.4,2-diff*1.3)];
  const SUM = SIZE_W.reduce((a,b)=>a+b,0);
  const pickSize=()=>{ let r=rnd()*SUM; for(let i=0;i<SIZES.length;i++){ r-=SIZE_W[i]; if(r<=0) return SIZES[i]; } return 120; };
  const maxOffFor=w=>(w>=200?188:w>=150?172:w>=110?152:w>=80?122:98)+diff*20;

  let prevX = world._prevX, y = world._y;
  const steps = rint(5,7);
  for(let i=0;i<steps;i++){
    y -= rint(70,100);
    const w = pickSize();
    const off = rint(52, Math.round(maxOffFor(w)));
    let dir = rnd()<0.5?-1:1;
    let nx = prevX + dir*off;
    if(nx<60 || nx>WORLD_W-60) nx = prevX - dir*off;
    nx = Math.max(60+w/2, Math.min(WORLD_W-60-w/2, nx));
    prevX = nx;
    let type='normal';
    const roll=rnd();
    const dT=0.12+diff*0.24, cT=dT+0.08+diff*0.05, mT=cT+0.08+diff*0.06,
          bT=mT+0.08, iT=bT+0.07, wT=iT+0.06;
    if(roll<dT) type='disappear';
    else if(roll<cT) type='conveyor';
    else if(roll<mT) type='mover';
    else if(roll<bT) type='bouncy';
    else if(roll<iT) type='ice';
    else if(roll<wT) type='wind';
    const p={id:world._id++, x:nx-w/2, y, w, h:26, type};
    if(type==='conveyor'||type==='wind') p.dir = rnd()<0.5?-1:1;
    if(type==='disappear') p.crumbleMs = Math.round(2200 - diff*1100);
    if(type==='mover'){
      const room=Math.min(nx-30-w/2,(WORLD_W-30-w/2)-nx);
      const amp=Math.min(rint(70,108),room);
      if(amp<45){ p.type='normal'; }
      else{ p.base=p.x; p.amp=amp; p.omega=(2*Math.PI)/rint(820,1300); p.phase=rnd()*Math.PI*2; p.dx=0; }
    }
    world.platforms.push(p);
    if(type!=='disappear' && rnd()<0.26)
      world.platforms.push({id:world._id++, type:'coin', x:nx-10, y:y-40, w:20, h:20});
  }
  // floor checkpoint
  y -= rint(74,96);
  const cw=180, cx=Math.max(60,Math.min(WORLD_W-60-cw, prevX-cw/2));
  const floorNo = f+1;
  world.platforms.push({id:world._id++, x:cx, y, w:cw, h:30, type:'checkpoint', cpIndex:floorNo});
  world.checkpoints.push({index:floorNo, x:cx+cw/2, y});
  world._prevX = cx+cw/2;
  world._y = y;
  world._topY = y;
  world._floor++;
}

/* called each frame in tower mode: keep a couple of floors generated ahead */
function maybeExtendTower(){
  const w=Game.world;
  if(!w || !w.tower) return;
  if(Game.player.y - w._topY < 1700) towerFloor(w);
}
