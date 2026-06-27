/* ===== Character renderer: a cute armless/legless blob ===== */

function resolveSkinFill(ctx, skinId, x, y, r, t){
  if(typeof skinId==='string' && skinId[0]==='#') return skinId;  // raw colour (e.g. Team colour)
  const s = skinById(skinId);
  if(s.color === 'rainbow'){
    const g = ctx.createLinearGradient(x-r, y-r, x+r, y+r);
    const o = (t*0.0004)%1;
    const stops = ['#ff9bce','#ffd36b','#9be7a0','#9cc4ff','#c8a0ff','#ff9bce'];
    for(let i=0;i<stops.length;i++){
      let p = (i/(stops.length-1) + o)%1;
      g.addColorStop(i/(stops.length-1), stops[i]);
    }
    return g;
  }
  if(s.color === 'galaxy'){
    const g = ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.2, x,y,r*1.2);
    g.addColorStop(0,'#7b5cff');
    g.addColorStop(0.6,'#3b2a7a');
    g.addColorStop(1,'#140f33');
    return g;
  }
  return s.color;
}

// draw a rounded blob body
function blobPath(ctx,x,y,w,h){
  const r = Math.min(w,h)*0.42;
  ctx.beginPath();
  ctx.moveTo(x-w/2+r, y-h/2);
  ctx.arcTo(x+w/2, y-h/2, x+w/2, y+h/2, r);
  ctx.arcTo(x+w/2, y+h/2, x-w/2, y+h/2, r);
  ctx.arcTo(x-w/2, y+h/2, x-w/2, y-h/2, r);
  ctx.arcTo(x-w/2, y-h/2, x+w/2, y-h/2, r);
  ctx.closePath();
}

/* Draw character centered at (cx,cy). size = body width in px.
   opts: { skin, accessory, face, facing(1/-1), t(time), squash } */
function drawCharacter(ctx, cx, cy, size, opts){
  const skin = opts.skin||'mint';
  const acc = opts.accessory||'none';
  const face = opts.face||'classic';
  const facing = opts.facing||1;
  const t = opts.t||0;
  const sq = opts.squash||0; // -1..1 squash for jump/land
  const w = size*(1+sq*0.18);
  const h = size*(1-sq*0.18);

  // worn-pet skin: draw as the creature emoji instead of the blob
  if(opts.petSkin && typeof creatureById==='function'){
    const c = creatureById(opts.petSkin);
    if(c){
      ctx.save(); ctx.translate(cx,cy);
      ctx.globalAlpha=0.18; ctx.fillStyle='#000';
      ctx.beginPath();ctx.ellipse(0,h*0.55,w*0.42,h*0.12,0,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      if(opts.ring){ ctx.fillStyle=opts.ring; ctx.beginPath();ctx.arc(0,0,w*0.62,0,Math.PI*2);ctx.fill(); }
      ctx.font=`${Math.round(size*1.2*(1+sq*0.15))}px serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(c.emoji, 0, h*0.06);
      drawAccessory(ctx, w, h, acc, size);
      ctx.restore();
      return;
    }
  }

  ctx.save();
  ctx.translate(cx,cy);

  // shadow
  ctx.save();
  ctx.globalAlpha=0.18; ctx.fillStyle='#000';
  ctx.beginPath();ctx.ellipse(0,h*0.55,w*0.42,h*0.12,0,0,Math.PI*2);ctx.fill();
  ctx.restore();

  // body
  ctx.fillStyle = resolveSkinFill(ctx, skin, 0,0, w*0.5, t);
  blobPath(ctx,0,0,w,h);
  ctx.shadowColor='rgba(120,90,170,.25)';ctx.shadowBlur=size*0.12;ctx.shadowOffsetY=size*0.06;
  ctx.fill();
  ctx.shadowColor='transparent';

  // cheek blush
  ctx.fillStyle='rgba(255,130,170,.35)';
  ctx.beginPath();ctx.ellipse(-w*0.24, h*0.12, w*0.09,h*0.06,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse( w*0.24, h*0.12, w*0.09,h*0.06,0,0,Math.PI*2);ctx.fill();

  // face
  drawFace(ctx,w,h,face,facing);

  // accessory on top
  drawAccessory(ctx,w,h,acc,size);

  ctx.restore();
}

function eye(ctx,x,y,r,pupil){
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3a3050';ctx.beginPath();ctx.arc(x+pupil,y+r*0.1,r*0.55,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+pupil-r*0.18,y-r*0.18,r*0.18,0,Math.PI*2);ctx.fill();
}

function drawFace(ctx,w,h,face,facing){
  const ex = w*0.18, ey=-h*0.05, er=w*0.105, pup=facing*er*0.25;
  ctx.lineWidth=Math.max(2,w*0.03);ctx.strokeStyle='#3a3050';ctx.lineCap='round';
  if(face==='classic'){
    eye(ctx,-ex,ey,er,pup);eye(ctx,ex,ey,er,pup);
    smile(ctx,w,h);
  }else if(face==='wink'){
    // one closed eye
    ctx.beginPath();ctx.arc(-ex,ey,er*0.9,Math.PI*0.15,Math.PI*0.85);ctx.stroke();
    eye(ctx,ex,ey,er,pup);
    smile(ctx,w,h);
  }else if(face==='star'){
    drawStarEye(ctx,-ex,ey,er);drawStarEye(ctx,ex,ey,er);
    smile(ctx,w,h,true);
  }else if(face==='cool'){
    // sunglasses style face
    ctx.fillStyle='#2a2440';
    ctx.beginPath();ctx.roundRect(-ex-er, ey-er*0.6, er*1.6, er*1.2, er*0.4);ctx.fill();
    ctx.beginPath();ctx.roundRect(ex-er*0.6, ey-er*0.6, er*1.6, er*1.2, er*0.4);ctx.fill();
    ctx.fillRect(-er*0.5,ey-er*0.2,er,er*0.18);
    smirk(ctx,w,h);
  }else if(face==='kawaii'){
    // big shiny eyes + small mouth
    eye(ctx,-ex,ey,er*1.15,pup);eye(ctx,ex,ey,er*1.15,pup);
    ctx.fillStyle='rgba(255,130,170,.5)';
    ctx.beginPath();ctx.arc(0,h*0.18,w*0.05,0,Math.PI*2);ctx.fill();
  }else if(face==='sleepy'){
    ctx.beginPath();ctx.arc(-ex,ey,er*0.9,Math.PI*0.1,Math.PI*0.9);ctx.stroke();
    ctx.beginPath();ctx.arc(ex,ey,er*0.9,Math.PI*0.1,Math.PI*0.9);ctx.stroke();
    smile(ctx,w,h);
  }else{
    eye(ctx,-ex,ey,er,pup);eye(ctx,ex,ey,er,pup);smile(ctx,w,h);
  }
}

function smile(ctx,w,h,big){
  ctx.lineWidth=Math.max(2,w*0.035);ctx.strokeStyle='#3a3050';ctx.lineCap='round';
  ctx.beginPath();
  const r = big? w*0.2 : w*0.16;
  ctx.arc(0,h*0.08,r,Math.PI*0.18,Math.PI*0.82);ctx.stroke();
}
function smirk(ctx,w,h){
  ctx.lineWidth=Math.max(2,w*0.035);ctx.strokeStyle='#3a3050';ctx.lineCap='round';
  ctx.beginPath();ctx.arc(w*0.05,h*0.06,w*0.14,Math.PI*0.1,Math.PI*0.7);ctx.stroke();
}
function drawStarEye(ctx,x,y,r){
  ctx.fillStyle='#ffd36b';ctx.save();ctx.translate(x,y);
  ctx.beginPath();
  for(let i=0;i<5;i++){
    const a=-Math.PI/2+i*2*Math.PI/5;
    ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
    const a2=a+Math.PI/5;
    ctx.lineTo(Math.cos(a2)*r*0.45,Math.sin(a2)*r*0.45);
  }
  ctx.closePath();ctx.fill();ctx.restore();
}

function drawAccessory(ctx,w,h,acc,size){
  const top = -h*0.5;
  ctx.textAlign='center';ctx.textBaseline='middle';
  const f = Math.round(size*0.55);
  switch(acc){
    case 'bow':
      ctx.font=`${Math.round(size*0.42)}px serif`;ctx.fillText('🎀',-w*0.32,top+h*0.05);break;
    case 'cap':
      ctx.fillStyle='#7fb0ff';ctx.beginPath();
      ctx.ellipse(0,top+h*0.04,w*0.42,h*0.16,0,Math.PI,0);ctx.fill();
      ctx.beginPath();ctx.ellipse(w*0.28,top+h*0.12,w*0.22,h*0.05,0,Math.PI,0,true);ctx.fillStyle='#5a90e0';ctx.fill();
      break;
    case 'crown':
      ctx.font=`${f}px serif`;ctx.fillText('👑',0,top-h*0.04);break;
    case 'glasses':
      ctx.font=`${Math.round(size*0.5)}px serif`;ctx.fillText('🕶️',0,-h*0.02);break;
    case 'flower':
      ctx.font=`${Math.round(size*0.4)}px serif`;ctx.fillText('🌸',-w*0.34,top+h*0.08);break;
    case 'party':
      ctx.font=`${f}px serif`;ctx.fillText('🥳',0,-h*0.02);break;
    case 'halo':
      ctx.strokeStyle='#ffe177';ctx.lineWidth=size*0.06;
      ctx.beginPath();ctx.ellipse(0,top-h*0.12,w*0.3,h*0.08,0,0,Math.PI*2);ctx.stroke();break;
    case 'horns':
      ctx.fillStyle='#ff7a7a';
      for(const sgn of [-1,1]){
        ctx.beginPath();ctx.moveTo(sgn*w*0.28,top+h*0.05);
        ctx.lineTo(sgn*w*0.36,top-h*0.18);ctx.lineTo(sgn*w*0.18,top+h*0.02);ctx.closePath();ctx.fill();
      }break;
    case 'star':
      ctx.font=`${Math.round(size*0.4)}px serif`;ctx.fillText('⭐',w*0.3,top+h*0.02);break;
  }
}
