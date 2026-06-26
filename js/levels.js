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
  const gapBoost = diff*40;

  // start ground platform
  platforms.push({id:id++, x:WORLD_W/2-130, y:bottomY, w:260, h:40, type:'big'});
  const start = {x:WORLD_W/2, y:bottomY-40};

  let prevX = WORLD_W/2;
  let y = bottomY - 70;
  for(let band=0; band<=CHECKPOINTS; band++){
    const bandTop = bottomY - (band+1)*BAND;     // y of this band's checkpoint
    // place stepping platforms upward with solvable gaps until we near the band top
    while(y - 130 > bandTop){
      y -= rint(86,118);                          // vertical gap (clearable by jump)
      let nx = prevX + (rnd()<0.5?-1:1)*rint(70,135+gapBoost);
      nx = Math.max(70, Math.min(WORLD_W-70, nx));
      prevX = nx;

      // choose a block type
      let type='normal';
      const roll=rnd();
      if(band>0){ // keep first band gentle
        if(roll<0.14+diff*0.12) type='disappear';
        else if(roll<0.27+diff*0.13) type='conveyor';
        else if(roll<0.39) type='small';
        else if(roll<0.49) type='big';
      }
      let w = type==='small'?72 : type==='big'?180 : type==='disappear'?116 : rint(104,150);
      const p={id:id++, x:nx-w/2, y, w, h:26, type};
      if(type==='conveyor') p.dir = rnd()<0.5?-1:1;
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
