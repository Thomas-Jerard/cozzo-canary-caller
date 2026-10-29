// Canary, Cozzo's mascot. One flat illustrated style, many poses. Pure inline SVG (no gradients/ids, so any number can share a page).
// pose: idle | wave | point | think | sign | calc | sleep | peek | cheer | search. daynight: awake in light mode, sleepy in dark (CSS).
const C={body:"#FFD23F",shade:"#F2B01E",belly:"#FFF1BC",wing:"#F5B428",wingDk:"#E39A12",beak:"#FF8A3D",beakDk:"#F0702A",eye:"#2B2118",cheek:"#FF9C86",feet:"#E8930C",ink:"#5B21B6"};
const Eyes=({kind="open"})=>{if(kind==="happy")return(<g className="cny-eyes-happy" fill="none" stroke={C.eye} strokeWidth="3" strokeLinecap="round"><path d="M45.5 61.5q4.5-5 9 0M65.5 61.5q4.5-5 9 0"/></g>);
if(kind==="shut")return(<g className="cny-eyes-shut" fill="none" stroke={C.eye} strokeWidth="2.6" strokeLinecap="round"><path d="M45.5 60.5q4.5 4 9 0M65.5 60.5q4.5 4 9 0"/></g>);
const dx=kind==="up"?1.6:kind==="side"?2.4:0,dy=kind==="up"?-2:0;
return(<g className="cny-eyes-open"><g className="cny-eyes" fill={C.eye}><ellipse cx={50+dx} cy={60+dy} rx="3.8" ry="4.8"/><ellipse cx={70+dx} cy={60+dy} rx="3.8" ry="4.8"/></g><circle cx={51.4+dx} cy={58.2+dy} r="1.4" fill="#fff"/><circle cx={71.4+dx} cy={58.2+dy} r="1.4" fill="#fff"/></g>)};
const Face=({eyes,daynight})=>(<g className="cny-face">
{daynight?<><g className="cny-day"><Eyes kind="open"/></g><g className="cny-night"><Eyes kind="shut"/></g></>:<Eyes kind={eyes}/>}
<circle cx="42.5" cy="70" r="4.6" fill={C.cheek} opacity=".55"/><circle cx="77.5" cy="70" r="4.6" fill={C.cheek} opacity=".55"/>
<g className="cny-beak"><path d="M53.5 66.5q6.5-3.2 13 0q-2.6 6.4-6.5 7.4q-3.9-1-6.5-7.4z" fill={C.beak}/><path d="M53.5 66.5q6.5-3.2 13 0q-3 2.4-6.5 2.6q-3.5-.2-6.5-2.6z" fill={C.beakDk} opacity=".55"/></g></g>);
const Tuft=()=>(<path className="cny-tuft" d="M57 37c-3-8 1-13 5-15-1 4 0 6 2 7 1-4 5-6 8-5-3 3-4 7-5 11z" fill={C.wing}/>);
const Body=()=>(<><ellipse cx="60" cy="69" rx="31" ry="33" fill={C.body}/><path d="M31.5 76c3 15 15 25 28.5 25.9-16 3-30-7.4-28.5-25.9z" fill={C.shade} opacity=".6"/><ellipse cx="60" cy="85" rx="18.5" ry="13.5" fill={C.belly}/><ellipse cx="49" cy="48" rx="9" ry="5" fill="#fff" opacity=".28" transform="rotate(-25 49 48)"/></>);
const Feet=()=>(<g stroke={C.feet} strokeWidth="3" strokeLinecap="round" fill="none"><path d="M52 101v5.5M68 101v5.5M48.5 107h7M64.5 107h7"/></g>);
const Tail=()=>(<path d="M84 90l17 7.5-14.5 3.5z" fill={C.wingDk}/>);
const WL={rest:"M31 69c-9.5 4-11.5 17-4.5 23.5 5.5-4.5 8.5-12 8.5-20z",up:"M32 66c-8-6-13.5-16-11.5-24 7 2 12 10 14 18z",hold:"M32 70c-8 3-10 10-5 15 4 0 9-3 12-6z",chin:"M34 72c-6 2-9 8-6 12 5 0 10-2 14-6z"};
const WR={rest:"M89 69c9.5 4 11.5 17 4.5 23.5-5.5-4.5-8.5-12-8.5-20z",up:"M88 66c8-6 13.5-16 11.5-24-7 2-12 10-14 18z",point:"M88 70c9-2 19-3 26-1-6 5-17 7-26 7z",hold:"M88 70c8 3 10 10 5 15-4 0-9-3-12-6z"};
const Wing=({d,side})=>(<g className={"cny-wing-"+side}><path d={d} fill={C.wing}/></g>);
const Shadow=({y=111})=>(<ellipse className="cny-shadow" cx="60" cy={y} rx="22" ry="3.4" fill="#B7791F" opacity=".22"/>);
const Sign=({text="vs"})=>{const fs=text.length>6?9.5:text.length>4?11:text.length>2?13:15;return(<g className="cny-prop"><rect x="30" y="71" width="60" height="28" rx="8" fill="#fff" stroke="#7C3AED" strokeWidth="2.4"/><text x="60" y={85+fs*.36} textAnchor="middle" fontFamily="var(--font-display),system-ui,sans-serif" fontWeight="700" fontSize={fs} fill={C.ink}>{text}</text><ellipse cx="31" cy="85" rx="5.5" ry="7" fill={C.wing}/><ellipse cx="89" cy="85" rx="5.5" ry="7" fill={C.wing}/></g>)};
const Calc=()=>(<g className="cny-prop" transform="rotate(-6 60 88)"><rect x="43" y="70" width="34" height="38" rx="6" fill="#6D28D9"/><rect x="47" y="74" width="26" height="9" rx="2.5" fill="#EDE9FE"/><path d="M59 78.5h11" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round"/>{[0,1,2].map(r=>[0,1,2].map(c=><rect key={r+"-"+c} x={48+c*8.5} y={87+r*6.5} width="6" height="4.2" rx="1.6" fill={r===2&&c===2?"#FFC927":"#A78BFA"}/>))}<ellipse cx="44" cy="90" rx="5.5" ry="7" fill={C.wing}/><ellipse cx="76" cy="94" rx="5.5" ry="7" fill={C.wing}/></g>);
const Glass=()=>(<g className="cny-prop"><path d="M95 84l12 12" stroke="#7C3AED" strokeWidth="4.5" strokeLinecap="round"/><circle cx="91" cy="78" r="9.5" fill="#EDE9FE" fillOpacity=".55" stroke="#7C3AED" strokeWidth="3"/><path d="M86.5 75a5.5 5.5 0 0 1 4-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/><ellipse cx="90" cy="88" rx="5.5" ry="6.5" fill={C.wing}/></g>);
const Zs=()=>(<g className="cny-zs" fill="#A78BFA" fontFamily="var(--font-display),system-ui,sans-serif" fontWeight="700"><text x="88" y="36" fontSize="12">z</text><text x="98" y="24" fontSize="9">z</text></g>);
const Sparks=()=>(<g className="cny-sparks" fill="#FFC927"><path d="M18 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M102 22l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z"/></g>);
const VB={peek:[0,18,120,64]};
export default function Canary({pose="idle",size=72,className="",title,sign,daynight=false,eyes}){
const vb=VB[pose]||[0,0,120,120];const h=Math.round(size*vb[3]/vb[2]);
const e=eyes||({think:"up",sleep:"shut",cheer:"happy",search:"side",point:"side"}[pose])||"open";
const wl=pose==="cheer"?WL.up:pose==="think"?WL.chin:WL.rest;
const wr=pose==="cheer"?WR.up:pose==="wave"?WR.up:pose==="point"?WR.point:WR.rest;
const props=title?{role:"img","aria-label":title}:{"aria-hidden":"true",focusable:"false"};
if(pose==="peek")return(<svg viewBox={vb.join(" ")} width={size} height={h} className={"cny cny-peek "+(daynight?"cny-dn ":"")+className} {...props}>
<g className="cny-body"><Tuft/><Body/><Face eyes={e} daynight={daynight}/></g><ellipse cx="37" cy="80" rx="8" ry="5" fill={C.wing}/><ellipse cx="83" cy="80" rx="8" ry="5" fill={C.wing}/></svg>);
return(<svg viewBox={vb.join(" ")} width={size} height={h} className={`cny cny-${pose} ${daynight?"cny-dn ":""}${className}`} {...props}>
<Shadow/><g className="cny-body"><Tail/><Tuft/><Body/>
{pose!=="sign"&&pose!=="calc"&&<Wing d={wl} side="l"/>}{pose!=="sign"&&pose!=="calc"&&pose!=="search"&&(daynight&&pose==="wave"?<><g className="cny-day"><Wing d={WR.up} side="r"/></g><g className="cny-night"><Wing d={WR.rest} side="r"/></g></>:<Wing d={wr} side="r"/>)}
<Face eyes={e} daynight={daynight}/><Feet/>
{pose==="sign"&&<Sign text={sign}/>}{pose==="calc"&&<Calc/>}{pose==="search"&&<Glass/>}
{pose==="think"&&<g fill="#A78BFA"><circle cx="92" cy="40" r="2.4"/><circle cx="99" cy="31" r="3.4"/><circle cx="108" cy="20" r="4.6"/></g>}
</g>{(pose==="sleep"||daynight)&&<g className={daynight?"cny-night":""}><Zs/></g>}{pose==="cheer"&&<Sparks/>}</svg>)}
export function Say({pose="idle",size=64,children,className="",sign,daynight,side="left"}){return(<div className={"say "+(side==="right"?"say-r ":"")+className}><span className="say-bird cny-host"><Canary pose={pose} size={size} sign={sign} daynight={daynight}/></span><p className="bubble">{children}</p></div>)}
