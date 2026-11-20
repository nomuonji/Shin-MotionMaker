import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import type {ReactNode} from "react";

const W=1920, H=1080;
const C={night:"#050A16",paper:"#F8F5EC",muted:"#A3ADC3",cyan:"#79E4F4",blue:"#2876C8",gold:"#FFBE77",rose:"#FF9CA8"};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const q=clamp(x);return q*q*(3-2*q)};
const appear=(t:number,s:number,e:number)=>smooth((t-s)/Math.max(.001,e-s));
const disappear=(t:number,s:number,e:number)=>1-appear(t,s,e);
const a=(t:number,start:number,end:number)=>appear(t,start,start+1.2)*disappear(t,end-1.15,end);
const stars=Array.from({length:192},(_,i)=>({
  x:((i*1103515245+12345)>>>0)%W,
  y:((i*48271+67211)>>>0)%H,
  r:.65+((i*17)%12)/15,
  p:i*.49,
  z:.35+((i*13)%11)/18,
}));
const txt=(text:string,x:number,y:number,size:number,fill:string=C.paper,weight:number=600,anchor:"start"|"middle"|"end"="start",tracking:number=1)=>(
  <text x={x} y={y} fill={fill} fontFamily="'Noto Sans JP', sans-serif" fontSize={size} fontWeight={weight} textAnchor={anchor} letterSpacing={tracking}>{text}</text>
);
const line=(x1:number,y1:number,x2:number,y2:number,color:string=C.muted,width:number=1,opacity:number=1)=>(
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} opacity={opacity}/>
);
function Scene({t,start,end,children}:{t:number,start:number,end:number,children:ReactNode}){
  const opacity=a(t,start,end);
  if(opacity<=0.0001)return null;
  return <g opacity={opacity}>{children}</g>;
}
function Moon({x,y,r,t,opacity=1}:{x:number,y:number,r:number,t:number,opacity?:number}){
 const craters=[
   [-.42,-.26,.14],[-.14,-.5,.105],[.28,-.34,.17],[.33,.23,.13],[-.38,.34,.21],[.02,.13,.12],[.48,-.08,.095],[-.08,.52,.16]
 ];
 return <g opacity={opacity}>
  <defs><clipPath id={`clipMoon-${x}`}><circle cx="0" cy="0" r={r}/></clipPath></defs>
  <circle cx={x} cy={y} r={r*1.2} fill="#B2CDDE" opacity={.11} filter="url(#blur)"/>
  <circle cx={x} cy={y} r={r} fill="url(#moon)"/>
  <g clipPath={`url(#clipMoon-${x})`} transform={`translate(${x} ${y}) rotate(${Math.sin(t*.04)*3})`}>
   {craters.map(([cx,cy,size],i)=><g key={i}>
    <circle cx={cx*r} cy={cy*r} r={size*r} fill="#344A5D" opacity={.43}/>
    <circle cx={(cx-.017)*r} cy={(cy-.02)*r} r={size*r*.83} fill="#8294A0" opacity={.22}/>
   </g>)}
   {Array.from({length:65},(_,i)=>{const dx=(((i*1597)%1000)/500-1)*r;const dy=(((i*2311+13)%1000)/500-1)*r;
     return <circle key={i} cx={dx} cy={dy} r={1+(i%6)} fill="#334C5F" opacity={.16}/>;})}
  </g>
  <circle cx={x} cy={y} r={r} fill="none" stroke="#D3E8EA" strokeWidth={1.2} opacity={.75}/>
 </g>;
}
function Earth({x,y,r,t}:{x:number,y:number,r:number,t:number}){
 return <g>
  <defs><clipPath id={`clipEarth-${x}`}><circle cx="0" cy="0" r={r}/></clipPath></defs>
  <circle cx={x} cy={y} r={r*1.35} fill="#2D88FF" opacity={.12} filter="url(#blur)"/>
  <circle cx={x} cy={y} r={r} fill="url(#earth)"/>
  <g clipPath={`url(#clipEarth-${x})`} transform={`translate(${x} ${y}) rotate(${Math.sin(t*.08)*5})`}>
   <path d={`M ${-r*.8} ${-r*.48} Q ${-r*.2} ${-r*.9} ${r*.14} ${-r*.5} L ${r*.37} ${-r*.12} L ${r*.12} ${r*.1} L ${-r*.08} ${r*.5} L ${-r*.55} ${r*.18} Z`} fill="#5CB7AC" opacity={.8}/>
   <path d={`M ${r*.52} ${r*.16} Q ${r*.84} ${r*.3} ${r*.78} ${r*.7} L ${r*.33} ${r*.88} L ${r*.12} ${r*.46} Z`} fill="#8AC2A1" opacity={.75}/>
   <path d={`M ${-r} ${-r*.22} Q ${-r*.33} ${-r*.53} ${r*.18} ${-r*.22} T ${r} ${-r*.37}`} stroke="#E1FBFF" strokeWidth={r*.07} opacity={.43} fill="none"/>
   <path d={`M ${-r} ${r*.35} Q ${-r*.45} ${r*.1} ${r*.12} ${r*.49} T ${r} ${r*.32}`} stroke="#E1FBFF" strokeWidth={r*.06} opacity={.31} fill="none"/>
  </g>
  <circle cx={x} cy={y} r={r} stroke="#7CE6FE" strokeWidth={1.3} fill="none" opacity={.7}/>
 </g>;
}
function Frame({t}:{t:number}){
 return <g>
   <text x={94} y={84} fontFamily="monospace" fontWeight="bold" letterSpacing={7} fontSize={21} fill={C.cyan}>LIGHT / TIME</text>
   <text x={1830} y={84} textAnchor="end" fontFamily="monospace" letterSpacing={4} fontSize={17} fill={C.muted}>A VISUAL ESSAY  ·  01</text>
   {line(95,102,1825,102,"#7890A4",1,.19)}
   <text x={96} y={1008} fontFamily="monospace" letterSpacing={3} fontSize={16} fill={C.muted}>NASA SCIENCE  /  SPACE-TIME STUDY</text>
   <text x={1823} y={1008} textAnchor="end" fontFamily="monospace" letterSpacing={3} fontSize={16} fill={C.muted}>00:{String(Math.floor(t)).padStart(2,"0")}</text>
   {line(96,1027,1824,1027,"#7890A4",1,.19)}
   <rect x={96} y={1025} width={1728*clamp(t/62)} height={2} fill={C.cyan} opacity={.86}/>
 </g>;
}
export const Scene001=()=>{
 const frame=useCurrentFrame();const {fps}=useVideoConfig();const t=frame/fps;
 const xMove=clamp((t-30.65)/1.282);
 const travel=384400/299792.458;
 const breathe=Math.sin(t*.46)*.012;
 return <AbsoluteFill style={{backgroundColor:C.night, fontFamily:"'Noto Sans JP', sans-serif"}}>
 <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{position:"absolute",inset:0}}>
 <defs>
   <radialGradient id="back" cx="51%" cy="47%" r="77%"><stop stopColor="#14263F"/><stop offset=".48" stopColor="#080F20"/><stop offset="1" stopColor="#02040B"/></radialGradient>
   <radialGradient id="moon" cx="29%" cy="25%" r="85%"><stop stopColor="#E7E4D5"/><stop offset=".35" stopColor="#C4CCD0"/><stop offset=".7" stopColor="#687B88"/><stop offset="1" stopColor="#192A3C"/></radialGradient>
   <radialGradient id="earth" cx="28%" cy="22%" r="83%"><stop stopColor="#A6FCFF"/><stop offset=".23" stopColor="#2C9BC2"/><stop offset=".55" stopColor="#16649C"/><stop offset=".89" stopColor="#06243F"/><stop offset="1" stopColor="#021125"/></radialGradient>
   <radialGradient id="sun" cx="47%" cy="45%" r="60%"><stop stopColor="#FFFBE6"/><stop offset=".21" stopColor="#FFE8B5"/><stop offset=".61" stopColor="#FFB05C"/><stop offset="1" stopColor="#B64A25"/></radialGradient>
   <radialGradient id="orb" cx="50%" cy="50%" r="50%"><stop stopColor="#92EFFF" stopOpacity=".65"/><stop offset="1" stopColor="#92EFFF" stopOpacity="0"/></radialGradient>
   <filter id="blur" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="31"/></filter>
   <filter id="light" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="12"/></filter>
   <clipPath id="clipMoon"><circle cx="0" cy="0" r="260"/></clipPath>
   <clipPath id="clipEarth"><circle cx="0" cy="0" r="160"/></clipPath>
 </defs>
 <rect width={W} height={H} fill="url(#back)"/>
 <g>
  {stars.map((s,i)=><circle key={i} cx={s.x+Math.sin(t*.015+s.p)*3*s.z} cy={s.y+Math.cos(t*.02+s.p)*4*s.z} r={s.r} fill={i%7===0?C.gold:C.paper} opacity={.23+.36*(.5+.5*Math.sin(t*.49+s.p))}/>)}
 </g>
 <g transform={`translate(${Math.sin(t*.12)*6},${Math.cos(t*.1)*4})`}>
  <Scene t={t} start={0} end={9.1}>
   <Moon x={1413} y={538} r={260*(1+appear(t,0,9)*.11+breathe)} t={t}/>
   {txt("あなたが見ている月は、",166,410,64,C.paper,500)}
   {txt("もう",160,545,105,C.paper,800)}
   {txt("過去だ。",160,664,111,C.cyan,800)}
   {line(167,722,777,722,C.cyan,3,.9)}
   {txt("THE MOON IS ALREADY HISTORY",166,783,25,C.muted,400)}
  </Scene>
  <Scene t={t} start={8} end={18.2}>
   <circle cx={1490} cy={552} r={342} fill="none" stroke={C.cyan} strokeWidth={1} opacity={.15}/>
   <circle cx={1490} cy={552} r={302+35*Math.sin(t*.35)} fill="none" stroke={C.cyan} strokeWidth={1.5} strokeDasharray="4 16" opacity={.35}/>
   <Moon x={1490} y={550} r={150} t={t}/>
   {txt("光が地球に届くまで",185,330,45,C.muted,500)}
   {txt("1.28",160,616,246,C.paper,700)}
   {txt("秒",1030,614,80,C.cyan,600)}
   {txt("月から届く光には、わずかな時差がある。",185,756,39,C.paper,400)}
   {txt("ONE-WAY LIGHT TRAVEL TIME  /  AVERAGE",185,824,24,C.muted,400)}
  </Scene>
  <Scene t={t} start={17} end={28.2}>
   <Earth x={425} y={563} r={145} t={t}/>
   <Moon x={1507} y={563} r={57} t={t}/>
   {line(596,562,1430,562,C.cyan,2,.7)}
   <line x1={596} y1={562} x2={1430} y2={562} stroke={C.cyan} strokeDasharray="3 18" strokeWidth={3} opacity={.65} strokeDashoffset={-t*27}/>
   {txt("地球",425,755,35,C.paper,600,"middle")}
   {txt("月",1507,670,35,C.paper,600,"middle")}
   {txt("平均距離",960,335,35,C.muted,500,"middle")}
   {txt("384,400 km",960,431,91,C.paper,700,"middle")}
   {txt("光は 1秒間に約30万km 進む",960,817,44,C.cyan,600,"middle")}
   {txt("DISTANCE IS AN AVERAGE — NOT TO SCALE",960,904,20,C.muted,400,"middle")}
  </Scene>
  <Scene t={t} start={27} end={38.4}>
   {txt("光の旅を、実時間で。",960,280,76,C.paper,700,"middle")}
   <Earth x={417} y={572} r={128} t={t}/>
   <Moon x={1517} y={572} r={71} t={t}/>
   {line(559,571,1433,571,C.muted,2,.36)}
   <line x1={1433} y1={571} x2={1433-(1433-559)*xMove} y2={571} stroke={C.gold} strokeWidth={6} filter="url(#light)" opacity={.65}/>
   <line x1={1433} y1={571} x2={1433-(1433-559)*xMove} y2={571} stroke={C.paper} strokeWidth={3}/>
   {t>30.65 && <><circle cx={1433-(1433-559)*xMove} cy={571} r={55} fill="url(#orb)" opacity={.8}/><circle cx={1433-(1433-559)*xMove} cy={571} r={8} fill={C.paper}/></>}
   {txt("地球",417,747,29,C.muted,500,"middle")}
   {txt("月",1517,694,29,C.muted,500,"middle")}
   {txt(t<30.65?"STARTING IN 3…":(Math.min(travel,Math.max(0,t-30.65))).toFixed(2)+" s",960,829,92,t<30.65?C.muted:C.cyan,700,"middle")}
   {txt("MOONLIGHT  →  YOUR EYES",960,907,22,C.muted,400,"middle")}
  </Scene>
  <Scene t={t} start={37} end={47.7}>
   <circle cx={390} cy={560} r={286} fill={C.gold} opacity={.13} filter="url(#blur)"/>
   <circle cx={390} cy={560} r={208} fill="url(#sun)"/>
   {Array.from({length:22},(_,i)=>{
     const p=i*Math.PI/11+t*.035;const r1=232,r2=268+22*Math.sin(i*7);
     return <line key={i} x1={390+Math.cos(p)*r1} y1={560+Math.sin(p)*r1} x2={390+Math.cos(p)*r2} y2={560+Math.sin(p)*r2} stroke={C.gold} strokeWidth={2} opacity={.27}/>;
   })}
   <Earth x={1530} y={559} r={89} t={t}/>
   {line(622,560,1420,560,C.gold,2,.42)}
   {txt("太陽は、もっと前の光。",965,365,48,C.muted,500,"middle")}
   {txt("約 8分20秒",965,518,102,C.paper,750,"middle")}
   {txt("前の太陽を、いま見ている。",965,646,47,C.paper,500,"middle")}
   {txt("SUNLIGHT  ≈  499 SECONDS",965,755,24,C.gold,500,"middle")}
  </Scene>
  <Scene t={t} start={46.5} end={55.8}>
   {txt("同じ空に、違う時代がある。",960,278,70,C.paper,700,"middle")}
   {[
    ["月", "1.3 秒前", C.cyan, -.07],
    ["太陽", "約 8 分 20 秒前", C.gold, .11],
    ["遠くの星", "何年も前", C.rose, .19],
   ].map(([label,value,color,offset],i)=>{
     const y=445+i*160;
     const fill=appear(t,47+i*.72,49+i*.72);
     return <g key={String(label)}>
       <circle cx={315} cy={y} r={13+i*2} fill={String(color)}/>
       <line x1={344} y1={y} x2={1485*fill} y2={y} stroke={String(color)} strokeWidth={2} opacity={.58}/>
       {txt(String(label),388,y-26,41,C.paper,600)}
       {txt(String(value),1410,y-26,48,String(color),600,"end")}
       {txt("0"+(i+1),1628,y+11,27,C.muted,400)}
     </g>;
   })}
   {txt("光の移動時間は、天体によって変わる。",960,949,30,C.muted,400,"middle")}
  </Scene>
  <Scene t={t} start={54.5} end={62}>
   <circle cx={960} cy={520} r={355+Math.sin(t*.2)*12} fill="none" stroke={C.cyan} strokeWidth={1.8} opacity={.2}/>
   <circle cx={960} cy={520} r={230+Math.sin(t*.29)*15} fill="none" stroke={C.gold} strokeWidth={1.4} opacity={.3}/>
   <circle cx={960} cy={520} r={130} fill="#3E9EA9" opacity={.16} filter="url(#blur)"/>
   {txt("宇宙を見ることは、",960,468,77,C.paper,650,"middle")}
   {txt("過去を見ること。",960,597,95,C.cyan,800,"middle")}
   {line(558,651,1362,651,C.gold,3,.8)}
   {txt("EVERY LIGHT IS A MESSAGE FROM THE PAST.",960,727,29,C.muted,400,"middle",3)}
  </Scene>
 </g>
 <Frame t={t}/>
 </svg>
 </AbsoluteFill>;
};
