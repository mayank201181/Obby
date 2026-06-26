/* ===== Mobile touch controls: left/right joystick + jump button ===== */
function setupTouchControls(){
  const joy=document.getElementById('joystick');
  const knob=document.getElementById('joyKnob');
  const jumpBtn=document.getElementById('jumpBtn');
  const leftBtn=document.getElementById('downBtn'); // secondary jump (left side) optional

  let joyId=null, cx=0, cy=0, R=58;

  function startJoy(e){
    const t=e.changedTouches?e.changedTouches[0]:e;
    joyId=e.changedTouches?t.identifier:'mouse';
    const rect=joy.getBoundingClientRect();
    cx=rect.left+rect.width/2; cy=rect.top+rect.height/2;
    moveJoy(t);
  }
  function moveJoy(t){
    let dx=t.clientX-cx;
    // horizontal only (joystick goes left/right)
    dx=Math.max(-R,Math.min(R,dx));
    knob.style.transform=`translate(calc(-50% + ${dx}px), -50%)`;
    Game.input.joyX = Math.abs(dx)<8?0: dx/R;
  }
  function endJoy(){
    joyId=null; Game.input.joyX=0;
    knob.style.transform='translate(-50%,-50%)';
  }

  joy.addEventListener('touchstart',e=>{e.preventDefault();startJoy(e);},{passive:false});
  joy.addEventListener('touchmove',e=>{
    e.preventDefault();
    for(const t of e.changedTouches){ if(t.identifier===joyId) moveJoy(t); }
  },{passive:false});
  joy.addEventListener('touchend',e=>{
    for(const t of e.changedTouches){ if(t.identifier===joyId) endJoy(); }
  },{passive:false});
  joy.addEventListener('touchcancel',endJoy,{passive:false});
  // mouse fallback (desktop testing)
  joy.addEventListener('mousedown',e=>{e.preventDefault();startJoy(e);
    const mm=ev=>moveJoy(ev), mu=()=>{endJoy();window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);};
    window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu);
  });

  function doJump(e){ e.preventDefault(); Game.input.jump=true; }
  jumpBtn.addEventListener('touchstart',doJump,{passive:false});
  jumpBtn.addEventListener('mousedown',doJump);
  if(leftBtn){ leftBtn.addEventListener('touchstart',doJump,{passive:false}); leftBtn.addEventListener('mousedown',doJump); }
}
