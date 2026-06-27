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
    const cBottomY=3600, levW=84, stepW=124;
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
      // staircase of held bridges
      const sx=[ex+20, ex-20, ex+30, ex-30];
      let y=ey;
      for(let i=0;i<nSteps;i++){
        y -= (i===0?95:92);
        const x=clamp(sx[i%4]-stepW/2,40,WORLD_W-40-stepW);
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

    for(let g=0; g<CHECKPOINTS; g++){
      land = leapfrogGate(land, g, (g%2===0)?2:3);   // alternate 2/3-step climbs
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
    while(y - 104 > bandTop){
      y -= rint(72, 104);                         // vertical gap: clears one block, never two

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
        const dThresh = 0.18 + diff*0.22;          // disappearing
        const cThresh = dThresh + 0.10 + diff*0.05; // conveyors
        const mThresh = cThresh + 0.10 + diff*0.06; // moving blocks
        if(roll < dThresh) type='disappear';
        else if(roll < cThresh) type='conveyor';
        else if(roll < mThresh) type='mover';
      }
      const p={id:id++, x:nx-w/2, y, w, h:26, type};
      if(type==='conveyor') p.dir = rnd()<0.5?-1:1;
      // disappearing blocks crumble after 2s (a bit faster on later levels)
      if(type==='disappear') p.crumbleMs = Math.round(2000 - diff*500);
      // moving blocks slide left<->right around their placed (mid) position.
      if(type==='mover'){
        const room = Math.min(nx-30-w/2, (WORLD_W-30-w/2)-nx);
        const amp = Math.min(rint(70,108), room);
        if(amp < 45){ p.type='normal'; }          // not enough room -> static
        else{
          p.base = p.x;                            // left coord at mid-swing
          p.amp = amp;
          p.omega = (2*Math.PI)/rint(1400,2000);   // rad per ms (fairly fast)
          p.phase = rnd()*Math.PI*2;
          p.dx = 0;
        }
      }
      platforms.push(p);
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
