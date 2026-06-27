/* ===== Simple synthesized sound effects (Web Audio, no files) ===== */
const SFX = {
  ctx:null,
  get enabled(){ return SAVE.soundOn!==false; },
  init(){
    if(this.ctx) return;
    try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
  },
  resume(){ try{ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); }catch(e){} },
  tone(freq, dur, type='sine', vol=0.18, slideTo){
    if(!this.enabled || !this.ctx) return;
    const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t+dur);
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.0008, t+dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t+dur+0.02);
  },
  seq(notes, type='triangle', vol=0.18){ notes.forEach((n,i)=>setTimeout(()=>this.tone(n,0.16,type,vol),i*100)); },
  jump(){ this.tone(430,0.13,'square',0.13,760); },
  land(){ this.tone(220,0.07,'sine',0.10,130); },
  checkpoint(){ this.seq([660,990],'sine',0.16); },
  coin(){ this.tone(900,0.07,'square',0.12,1350); },
  hit(){ this.tone(320,0.28,'sawtooth',0.2,70); },
  win(){ this.seq([523,659,784,1047],'triangle',0.2); },
  chest(){ this.seq([392,523,659,880],'triangle',0.18); },
  rare(){ this.seq([659,784,988,1319,1568],'triangle',0.2); },
  click(){ this.tone(520,0.04,'square',0.08); },

  // ---- looping background music; a different track per mode ----
  musicTimer:null, musicStep:0, musicMode:null,
  TRACKS:{
    lobby:{ mel:[523,587,659,587,523,494,523,659, 587,523,494,440,494,523,587,659], bass:[131,131,165,165,147,147,131,131], step:340, vol:0.045 },
    game: { mel:[523,587,659,784,880,784,659,587, 523,659,784,1047,880,784,659,523], bass:[131,131,165,165,196,196,165,165], step:300, vol:0.05 },
    tower:{ mel:[659,784,880,988,1047,988,880,784, 659,880,1047,1175,1047,880,784,659], bass:[165,165,196,196,220,220,196,196], step:235, vol:0.05 },
  },
  note(freq, dur, vol){
    if(!this.ctx) return;
    const t=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type='triangle'; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.04);
    g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t+dur+0.05);
  },
  startMusic(mode){
    mode = mode || this.musicMode || 'lobby';
    if(SAVE.musicOn===false || !this.ctx) return;
    if(this.musicTimer && this.musicMode===mode) return;   // already on this track
    this.stopMusic();
    this.musicMode=mode;
    const tr=this.TRACKS[mode]||this.TRACKS.lobby;
    this.musicStep=0;
    this.musicTimer=setInterval(()=>{
      if(SAVE.musicOn===false){ this.stopMusic(); return; }
      const s=this.musicStep;
      this.note(tr.mel[s%tr.mel.length], tr.step/1000*1.05, tr.vol);
      if(s%2===0) this.note(tr.bass[(s/2)%tr.bass.length], tr.step/1000*1.7, tr.vol*0.9);
      this.musicStep++;
    }, tr.step);
  },
  stopMusic(){ if(this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer=null; } this.musicMode=null; },
};
