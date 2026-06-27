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

  // ---- gentle looping background music ----
  musicTimer:null, musicStep:0,
  note(freq, dur, vol){
    if(!this.ctx) return;
    const t=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type='triangle'; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.04);
    g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t+dur+0.05);
  },
  startMusic(){
    if(this.musicTimer || SAVE.musicOn===false || !this.ctx) return;
    // a soft pentatonic arpeggio loop
    const mel=[523,587,659,784,880,784,659,587, 523,659,784,1047,880,784,659,523];
    const bass=[131,131,165,165,196,196,165,165];
    this.musicStep=0;
    this.musicTimer=setInterval(()=>{
      if(SAVE.musicOn===false){ this.stopMusic(); return; }
      const s=this.musicStep;
      this.note(mel[s%mel.length], 0.32, 0.05);
      if(s%2===0) this.note(bass[(s/2)%bass.length], 0.5, 0.045);
      this.musicStep++;
    }, 300);
  },
  stopMusic(){ if(this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer=null; } },
};
