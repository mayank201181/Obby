/* ===== Mobile touch controls: left/right arrow buttons + jump button =====
   Hold the ◀ arrow to keep moving left, hold the ▶ arrow to keep moving right.
   Tap JUMP (bottom-right) to hop. Keyboard (←/→ or A/D, Space/↑) also works. */
function setupTouchControls(){
  const leftBtn  = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const jumpBtn  = document.getElementById('jumpBtn');

  // bind a button to a press-and-hold action
  function bindHold(el, on, off){
    const set = v => { v?on():off(); el.classList.toggle('active', v); };
    el.addEventListener('touchstart', e=>{ e.preventDefault(); set(true); }, {passive:false});
    el.addEventListener('touchend',   e=>{ e.preventDefault(); set(false); }, {passive:false});
    el.addEventListener('touchcancel',e=>{ set(false); }, {passive:false});
    el.addEventListener('mousedown',  e=>{ e.preventDefault(); set(true);
      const up = ()=>{ set(false); window.removeEventListener('mouseup',up); };
      window.addEventListener('mouseup', up);
    });
    // safety: never get stuck moving if focus/visibility is lost
    el.addEventListener('mouseleave', ()=>{ /* mouseup handler covers release */ });
  }

  bindHold(leftBtn,  ()=>Game.input.btnL=true,  ()=>Game.input.btnL=false);
  bindHold(rightBtn, ()=>Game.input.btnR=true,  ()=>Game.input.btnR=false);

  function doJump(e){ e.preventDefault(); Game.input.jump=true; }
  jumpBtn.addEventListener('touchstart', doJump, {passive:false});
  jumpBtn.addEventListener('mousedown',  doJump);

  // pet ability button (placing platforms)
  const abilityBtn=document.getElementById('abilityBtn');
  if(abilityBtn){
    const doAbility=e=>{ e.preventDefault(); if(typeof triggerAbility==='function') triggerAbility(); };
    abilityBtn.addEventListener('touchstart', doAbility, {passive:false});
    abilityBtn.addEventListener('mousedown',  doAbility);
  }

  // if the page loses focus mid-press, release everything
  window.addEventListener('blur', ()=>{ Game.input.btnL=false; Game.input.btnR=false;
    leftBtn.classList.remove('active'); rightBtn.classList.remove('active'); });
}
