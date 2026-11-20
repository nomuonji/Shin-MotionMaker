import fs from "node:fs/promises";
import path from "node:path";

// Fully original synthesis: no sampled or downloaded audio, no external API.
const SR=44100, DURATION=62;
const note=(m)=>440*Math.pow(2,(m-69)/12);
const chords=[[48,55,60,63],[44,51,56,60],[51,58,63,67],[46,53,58,62]];
const clamp=(n)=>Math.min(1,Math.max(-1,n));
const tone=(f,t)=>Math.sin(2*Math.PI*f*t);
const smooth=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export async function createScore(dest){
  const count=SR*DURATION;
  const wav=Buffer.alloc(44+count*4);
  wav.write("RIFF",0);wav.writeUInt32LE(36+count*4,4);wav.write("WAVE",8);
  wav.write("fmt ",12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);
  wav.writeUInt32LE(SR,24);wav.writeUInt32LE(SR*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);
  wav.write("data",36);wav.writeUInt32LE(count*4,40);
  const cues=[.7,8.4,17.6,27.7,30.65,31.932,37.6,46.9,55.1];
  for(let i=0;i<count;i++){
    const t=i/SR;
    const p=Math.floor(t/8)%chords.length;
    const chord=chords[p];
    const beat=(t%1.12);
    const hit=Math.exp(-beat*8.5);
    const flourish=Math.exp(-(t%0.56)*9);
    const f0=note(chord[0]-12);
    const pad=[
      tone(note(chord[0]),t+.00003),
      tone(note(chord[1]),t+.00018),
      tone(note(chord[2]),t-.0001),
      tone(note(chord[3]),t+.00007)
    ].reduce((x,y)=>x+y,0)/4;
    const arpeggio=note(chord[Math.floor(t/.56)%4]+12);
    const air=tone(1107+.23*Math.sin(t*.33),t)*.009;
    const w= cues.reduce((acc,s)=>{
      const v=t-s;
      if(v<0||v>2.5)return acc;
      const shimmer=(tone(1000-v*54,v)+.55*tone(1754-v*59,v))*.077*Math.exp(-v*3.2);
      return acc+shimmer;
    },0);
    const low=hit*tone(f0,t)*.16 + .026*hit*tone(50,t);
    const seq=.098*flourish*(tone(arpeggio,t)+.24*tone(arpeggio*2,t));
    const swell=.08*Math.sin(t*.51)*tone(72+.5*Math.sin(t*.13),t);
    const envelope=smooth(t/1.7)*smooth((DURATION-t)/2.3);
    const section=(t>=55?1.15:(t>=37?.92:.86));
    const signal=envelope*section*(.29*pad+low+seq+w+air+swell);
    const left=clamp(Math.tanh(signal*1.08)*.84);
    const right=clamp(Math.tanh((signal+.025*tone(note(chord[1]+12),t+.003))*1.05)*.84);
    wav.writeInt16LE(Math.round(left*32760),44+i*4);
    wav.writeInt16LE(Math.round(right*32760),46+i*4);
  }
  await fs.mkdir(path.dirname(dest),{recursive:true});
  await fs.writeFile(dest,wav);
  return {bytes:wav.length,sampleRate:SR,duration:DURATION,source:"fully original synthesized score"};
}
