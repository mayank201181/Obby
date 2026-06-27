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
};
