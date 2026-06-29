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
  stopMusic(){
    if(this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer=null; }
    if(this.songTimer){ clearTimeout(this.songTimer); this.songTimer=null; }
    this.musicMode=null; this.songId=null;
  },

  // ---- player-picked piano songs (not AI-looping pads — actual tunes) ----
  songTimer:null, songId:null, _songIdx:0,
  NF:{
    'C2':65.41,'D2':73.42,'E2':82.41,'F2':87.31,'G2':98.00,'A2':110.00,'B2':123.47,
    'C3':130.81,'D3':146.83,'E3':164.81,'F3':174.61,'G3':196.00,'A3':220.00,'B3':246.94,
    'C4':261.63,'D4':293.66,'E4':329.63,'F4':349.23,'G4':392.00,'A4':440.00,'B4':493.88,
    'C5':523.25,'Db5':554.37,'D5':587.33,'Eb5':622.25,'E5':659.25,'F5':698.46,'Gb5':739.99,
    'G5':783.99,'Ab5':830.61,'A5':880.00,'Bb5':932.33,'B5':987.77,'C6':1046.50,'D6':1174.66,'E6':1318.51,
  },
  // each note: [trebleNote|null, beats, bassNote?]
  SONGS:{
    // The Entertainer (Scott Joplin, 1902 — public domain), recognizable A-strain
    entertainer:{ name:'🎹 The Entertainer', beat:150, vol:0.05, mel:[
      ['D5',1],['Eb5',1],['E5',1],
      ['C5',2,'C3'],['E5',2],['C5',2,'C3'],['E5',2],
      ['C5',1,'C3'],['D5',1],['E5',1],['B4',2,'G2'],['D5',2],['C5',4,'C3'],
      ['C5',1],['D5',1],['E5',1],['F5',2,'F2'],['A5',2],['G5',2,'G2'],['F5',2],
      ['E5',2,'C3'],['D5',2],['C5',4,'C3'],[null,2],
    ]},
    // Tarantella Napoletana (traditional — public domain), fast 6/8 dance feel
    tarantella:{ name:'🎻 Tarantella', beat:120, vol:0.05, mel:[
      ['E5',1,'A2'],['E5',1],['E5',1],['E5',1],['F5',1],['E5',1],['D5',1],['E5',1],
      ['D5',1,'D3'],['D5',1],['D5',1],['D5',1],['E5',1],['D5',1],['C5',1],['D5',1],
      ['C5',1,'A2'],['C5',1],['B4',1],['C5',1],['A4',2,'A2'],['E5',2,'E3'],
      ['A5',2,'A2'],['G5',1],['F5',1],['E5',2,'E3'],['A4',2,'A2'],[null,2],
    ]},
    // "Rush E" vibe — original frantic E-minor piano run (instrumental, no melody copied)
    rushe:{ name:'⚡ Rush E', beat:95, vol:0.045, mel:[
      ['E5',1,'E2'],['E5',1],['E5',1],['E5',1],['E5',1],['E5',1],['E5',1],['E5',1],
      ['E5',1,'E2'],['G5',1],['B5',1],['E6',1],['B5',1],['G5',1],['E5',1],['G5',1],
      ['D5',1,'D3'],['D5',1],['D5',1],['D5',1],['F5',1],['A5',1],['D6',1],['A5',1],
      ['C5',1,'C3'],['C5',1],['C5',1],['C5',1],['E5',1],['G5',1],['C6',1],['G5',1],
      ['B4',1,'B2'],['B4',1],['B4',1],['B4',1],['E5',1,'E2'],['E5',1],['E5',1],['E5',1],
    ]},
    // "The Muppet Show" vibe — original bouncy vaudeville piano (instrumental, no theme copied)
    muppets:{ name:'🐸 Muppets-style', beat:140, vol:0.05, mel:[
      ['G4',1,'C3'],['C5',1],['E5',1],['G5',2,'C3'],['E5',1],['C5',1],['D5',2,'G2'],['D5',2],
      ['E5',1,'C3'],['F5',1],['G5',1],['E5',2,'C3'],['C5',1],['G4',1],['C5',4,'C3'],
      ['A4',1,'F2'],['C5',1],['F5',1],['A5',2,'F2'],['G5',1],['E5',1],['C5',2,'G2'],['G5',2],
      ['E5',1,'C3'],['D5',1],['C5',1],['G4',2,'G2'],['C5',4,'C3'],[null,2],
    ]},
    // a calm original piano piece
    chill:{ name:'🌙 Chill Piano', beat:260, vol:0.05, mel:[
      ['E5',2,'A2'],['G5',2],['C6',4,'C3'],['B5',2],['A5',2,'A2'],['G5',4,'F2'],
      ['F5',2,'F2'],['A5',2],['G5',4,'C3'],['E5',2],['D5',2,'G2'],['C5',4,'C3'],[null,2],
    ]},
  },
  playSong(id){
    if(SAVE.musicOn===false || !this.ctx) return;
    if(this.songTimer && this.songId===id) return;   // already playing it
    this.stopMusic();
    this.songId=id; this.musicMode='song';
    const song=this.SONGS[id]||this.SONGS.chill;
    const BEAT=song.beat||150, vol=song.vol||0.05;
    this._songIdx=0;
    const self=this;
    const step=()=>{
      if(SAVE.musicOn===false){ self.stopMusic(); return; }
      const seq=song.mel, ev=seq[self._songIdx % seq.length], beats=ev[1];
      const dur=beats*BEAT/1000;
      if(ev[0]) self.note(self.NF[ev[0]]||440, Math.max(0.09, dur*0.92), vol);
      if(ev[2]) self.note(self.NF[ev[2]]||110, Math.max(0.12, dur*1.5), vol*0.75);
      self._songIdx++;
      self.songTimer=setTimeout(step, beats*BEAT);
    };
    step();
  },
};
