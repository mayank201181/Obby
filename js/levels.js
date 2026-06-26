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

  // start ground platform
  platforms.push({id:id++, x:WORLD_W/2-130, y:bottomY, w:260, h:40, type:'big'});
  const start = {x:WORLD_W/2, y:bottomY-40};

  let prevX = WORLD_W/2;
  let y = bottomY;                               // ground platform top
  for(let band=0; band<=CHECKPOINTS; band++){
    const bandTop = bottomY - (band+1)*BAND;     // y of this band's checkpoint
    // place stepping platforms upward with guaranteed-clearable gaps
    while(y - 116 > bandTop){
      y -= rint(72, 108);                         // vertical gap (well under jump height)

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
        const dThresh = 0.22 + diff*0.30;          // L1 ~22% -> L5 ~52% disappearing
        const cThresh = dThresh + 0.13 + diff*0.07; // plus conveyors
        if(roll < dThresh) type='disappear';
        else if(roll < cThresh) type='conveyor';
      }
      const p={id:id++, x:nx-w/2, y, w, h:26, type};
      if(type==='conveyor') p.dir = rnd()<0.5?-1:1;
      // disappearing blocks crumble faster on later levels (5.0s -> 2.4s)
      if(type==='disappear') p.crumbleMs = Math.round(5000 - diff*2600);
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

      // co-op puzzle: every other band in coop mode, insert a two-pad bridge gate
      if(mode==='coop' && band>0 && band%2===0){
        const padY = bandTop - 70;
        const padW=80;
        platforms.push({id:id++, x:120, y:padY, w:padW, h:24, type:'pad', pad:'A', grp:band});
        platforms.push({id:id++, x:WORLD_W-120-padW, y:padY, w:padW, h:24, type:'pad', pad:'B', grp:band});
        // the bridge that appears for 10s when both pads pressed
        platforms.push({id:id++, x:120, y:padY-150, w:WORLD_W-240, h:24, type:'bridge', active:false, grp:band});
      }
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
