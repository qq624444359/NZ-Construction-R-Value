/* R-value calculator — the Project item: H1/AS1 applicability, envelope areas, BRANZ input, and the
   background whole-building check that picks the lowest-cost insulation (shown only as "Suggested").
   Reference / minimum values: h1-data.js (H1/AS1 6th edition). Costs and council → zone: placeholders. */
(function(){
'use strict';
const H=window.H1,R=()=>window.RVC,KEY='ezbuild-rvc-project-v1';
const esc=H.esc,f1=H.f1,f2=H.f2;
const PARAM=/[?&](c|inc|sheet|pdf|heel|psel|heated|strap)=/.test(location.search);
const TCV=(location.search.match(/[?&]c=([^&]*)/)||[])[1];const TKEY=TCV!=null?'ezbuild-test-'+decodeURIComponent(TCV):null;
const SK=PARAM?TKEY:KEY;   /* test mode with ?c=: a test project shared with the House Guide; the real project is not read or written */
const DEF={ta:'Auckland',zone:null,housing:'yes',occ:'',q2:'no',q3:'no',glzA:'35',glzR:'0.37',doorA:'4',doorR:'',skyA:'',skyR:'',slabA:'140',slabP:'52',slabM:'int',slabW:'',slabF:'slab',slabU:'none',slabE:'none',slabWall:'other',slabT:'100'};
let P=Object.assign({},DEF);const LZ=o=>{Object.keys(o).forEach(k=>{if(typeof o[k]==='string'&&/^\.\d/.test(o[k]))o[k]='0'+o[k]})};
/* the saved project's fields — in test mode from the test project (before, a test project lost them on reload) */
/* a new project's windows and doors: ten windows at the default (Table D.1.1.1, R0.37), the front door and the door to the garage */
const NEWOPEN=()=>({glzA:'',doorA:'',skyA:'',wm:'tab',wdk:'r037',wdefR:'',wfr:'tbal',wgl:'double',wug:'',
  wins:Array.from({length:10},(_,i)=>({n:'W'+String(i+1).padStart(2,'0'),a:'',h:'',wd:'',own:''})),doors:[{n:'Front door',a:'',h:'',wd:''},{n:'Door to garage',a:'',h:'',wd:''}],skys:[],skyR:''});
let had=false;if(SK){try{const s=JSON.parse(localStorage.getItem(SK));if(s&&s.P){had=true;P=Object.assign({},DEF,s.P);LZ(P)}}catch(e){}}
if(!had)Object.assign(P,NEWOPEN());
/* 1.1.1.1: housing has no area limit; otherwise the occupied space, excluding housing parts, must be ≤ 300 m² (note 2) */
function verdict(){if(!P.housing)return{state:'open',text:''};
  if(P.housing==='yes')return{state:'ok',text:'Housing — no area limit, H1/AS1 applies (1.1.1.1 a)).'};
  if(P.occ===''||P.occ==null)return{state:'open',text:'Enter the occupied space, excluding housing parts.'};
  const N=+P.occ;return N<=300?{state:'ok',text:N+' m² ≤ 300 m² — H1/AS1 can be used (1.1.1.1 b)).'}:{state:'bad',text:N+' m² > 300 m² — H1/AS1 cannot be used (1.1.1.1 b)). Use H1/AS2 or H1/VM2.'}}
const scopeP=()=>H.scope({nonHousing:P.housing==='no'?P.occ:'',q2:P.q2,q3:P.q3});
const isSlab=c=>c.el==='floor'&&c.kind==='slab';
/* (old Project-page slab block — superseded by the slab construction) H1/AS1 Appendix E (2.1.3.1 c)) — every number from window.SlabAppE */
const UNDER={none:[null,null],s12:['strip',1.2],s24:['strip',2.4],f12:['full',1.2],f24:['full',2.4]};
function slab(){const A=+P.slabA||0,Pm=+P.slabP||0,X=window.SlabAppE;if(!A)return{ok:false,none:true};if(!Pm)return{ok:false,why:'Enter the slab perimeter.'};
  const ext=P.slabM==='ext';if(P.slabW!=null&&P.slabW!==''){const w=+P.slabW;if(w>0&&(P.slabT==null||P.slabT===''))P.slabT=w>1?w:Math.round(w*1000);delete P.slabW}
  const ap=ext?X.apExternal(A,Pm,(P.slabT==null||P.slabT===''?100:+P.slabT)/1000):X.apInternal(A,Pm),u=P.slabF==='raft'?(P.slabU==='none'?UNDER.none:['__raft',0]):UNDER[P.slabU]||UNDER.none;
  if(u[0]==='__raft')return{ok:false,ap,why:'Underslab insulation applies to slab floors only — no Appendix E table for a raft with underslab insulation.'};
  const L=X.lookup({floor:P.slabF,edge:P.slabE==='r10',under:u[0],underR:u[1],wall:P.slabWall},ap,+P.slabT||0);return Object.assign({ap,eq:ext?'E.2':'E.1'},L)}
const slabR=()=>{const s=slab();return s.ok?s.R:null};
/* 2.1.2.4: walls and floors between two conditioned spaces are not part of the thermal envelope */
const SIDES=[['out','Outside air — external wall (counted)'],['unc','Unheated space — garage, roof space, subfloor (counted)'],['cond','Heated space — neighbour’s unit or another heated area (not counted, 2.1.2.4)']];
/* the question asked, by element; a one-line explanation of each answer; the short PDF wording */
const SIDEQ=c=>c.el==='floor'?'What’s under this floor?':c.el==='roof'?'What’s above this ceiling?':'What’s on the other side of this wall?';
const SIDEHELP={out:'Normal external wall.',unc:'Still part of the thermal envelope. Typical: wall between the house and the garage, including a neighbour’s garage.',cond:'Walls between two heated spaces are left out of the heat loss (2.1.2.4). Typical: party wall to a neighbour’s living area.'};
const SIDEPDF={out:'Outside air',unc:'Unheated space (garage, roof space or subfloor)',cond:'Heated space — not counted (2.1.2.4)'};
const sideOf=c=>c.side||(c.kind==='it'?null:'out');
/* every construction with an area is part of the envelope — the designer enters envelope areas only (2.1.2.4) */
const hasSide=()=>false;
const excl=()=>false;
const sideTxt=c=>{const v=sideOf(c);return v?SIDEPDF[v]:'Not chosen'};
/* Table D.1.1.1 (housing): R of windows and glazed doors by frame, glazing and centre-of-glass Ug; a Ug between rows takes the next larger Ug (note 1) */
const FRAMES=[['al','Aluminium'],['tbal','Thermally broken aluminium'],['upvc','uPVC'],['timber','Timber']];
const D111={double:{2.9:[.24,.30,.37,.41],2.6:[.26,.32,.40,.44],1.9:[.30,.39,.50,.56],1.6:[.33,.42,.56,.63],1.3:[.35,.46,.63,.71],1.2:[.36,.48,.66,.74],1.1:[.37,.50,.69,.77],1.0:[.39,.52,.73,.81]},
  triple:{2.1:[null,.36,.47,.53],1.2:[null,.48,.66,.74],1.0:[null,.52,.73,.81],0.7:[null,.59,.86,.95],0.6:[null,.62,.91,1.01]}};
function d111(fr,gl,ug){const T=D111[gl],fi=FRAMES.findIndex(f=>f[0]===fr);if(!T||fi<0)return{why:'Choose the frame and glazing.'};if(!(+ug>0))return{why:'Enter the centre-of-glass Ug.'};
  const rows=Object.keys(T).map(Number).sort((a,b)=>a-b),u=rows.find(x=>x>=+ug-1e-9);
  if(u==null)return{why:'Ug '+ug+' is above the largest Ug in Table D.1.1.1 for '+gl+' glazing ('+rows[rows.length-1].toFixed(1)+') — calculate to H1/VM1 Appendix D.'};
  const r=T[u][fi];if(r==null)return{why:FRAMES[fi][1]+' frames with '+gl+' glazing are not in Table D.1.1.1 (–).'};
  return{r,u,src:'Table D.1.1.1 — '+FRAMES[fi][1].toLowerCase()+', '+gl+', Ug '+(+ug)+(Math.abs(u-ug)>1e-9?' (table row Ug '+u.toFixed(1)+')':'')+' → R'+r.toFixed(2)}}
/* window rows (2.1.2.9 allows each type separately); the old single row becomes the first one, values unchanged */
function wins(){if(!Array.isArray(P.wins))P.wins=[{n:'Windows and glazed doors',a:P.glzA==null?'':P.glzA,mode:'calc',r:P.glzR==null?'':P.glzR,fr:'tbal',gl:'double',ug:''}];return P.wins}
/* opaque doors, one row each (BRANZ sheet layout); the single doorA of older projects becomes the first row */
function doors(){if(!Array.isArray(P.doors))P.doors=[{n:'Opaque doors',a:P.doorA==null?'':P.doorA}];return P.doors}
/* a window or door row: Height AND Width (mm) when both are given, otherwise the Area entered — as the BRANZ sheet */
/* Quantity (default 1): the row's area is the one unit's area × quantity */
const isHW=o=>+o.h>0&&+o.wd>0,qty=o=>+o.q>0?+o.q:1,unitA=o=>isHW(o)?(+o.h)*(+o.wd)/1e6:(+o.a||0),opA=o=>unitA(o)*qty(o),doorRv=()=>+P.doorR||0.18;
/* window R-values: one method for the section (P.wm: Table D.1.1.1 'tab' or H1/VM1 Appendix D 'calc') and one default every
   window takes; a window set to Custom (w.own) has its own. R0.37 / R0.46 are the usual market windows, both rows of Table D.1.1.1. */
const WPRE={r037:['al','double','1.1'],r046:['tbal','double','1.3']};
function wset(){if(P.wm)return;const w0=wins()[0]||{},tab=w0.mode==='tab';   /* older projects: the first window's settings become the default */
  P.wm=tab?'tab':'calc';P.wdefR=tab?'':String(w0.r||'');P.wfr=w0.fr||'tbal';P.wgl=w0.gl||'double';P.wug=w0.ug||'';
  P.wdk=tab?(Object.keys(WPRE).find(k=>WPRE[k][0]===w0.fr&&WPRE[k][1]===w0.gl&&+WPRE[k][2]===+w0.ug)||'custom'):'r037';
  const same=w=>(w.mode==='tab')===tab&&(tab?w.fr===w0.fr&&w.gl===w0.gl&&+w.ug===+w0.ug:+w.r===+w0.r);
  wins().forEach(w=>{if(w.own==null)w.own=same(w)?'':'1'})}
function wdefR(){wset();if(P.wm==='tab'){const d=P.wdk==='custom'?[P.wfr,P.wgl,P.wug]:WPRE[P.wdk]||WPRE.r037,x=d111(d[0],d[1],d[2]);return{r:x.r||null,src:x.src,why:x.why}}
  return +P.wdefR>0?{r:+P.wdefR,src:'H1/VM1 Appendix D calculation'}:{r:0.15,src:'2.1.2.13 default',def:1}}
function winR(w){wset();if(!w.own)return wdefR();
  if(P.wm==='tab'){const x=d111(w.fr,w.gl,w.ug);return{r:x.r||null,src:x.src,why:x.why}}
  return +w.r>0?{r:+w.r,src:'H1/VM1 Appendix D calculation'}:{r:null,why:'Enter this window’s R (H1/VM1 Appendix D).'}}
/* skylights: R = 1/Uw rounded down to two significant figures (D.2.1.1) */
const sig2=x=>{if(!(x>0))return null;const e=Math.floor(Math.log10(x)),f=Math.pow(10,1-e);return Math.floor(x*f+1e-9)/f};
const zone=()=>P.zone||(H.TA.find(t=>t[0]===P.ta)||[])[1]||null;
const list=()=>R().S.list;
/* areas live on the construction: roofs use the strategy card's ceiling area / perimeter */
const areaOf=c=>c.el==='roof'?+((c.v.edge||{}).area)||0:+c.area||0;
const perimOfC=c=>+((c.v.edge||{}).perim)||0;
/* ---------- placeholder pricing: $/m² installed per insulation layer ---------- */
const COST=r=>3+4.2*r;
const costL=layers=>layers.reduce((a,x)=>a+COST(x.R),0);
/* ---------- the insulation options for one construction ---------- */
/* roof options write both insulation rows: the one in the chords and the one over them */
const ROOFOPT=[{key:'dbl',label:'Two layers R3.6 · 2 × 180 mm',fr:[3.6,180],ov:[3.6,180]},{key:'r70',label:'R7.0 Superbatts · 275 mm',fr:[7.0,275],ov:[0,0],prem:1.1},
  {key:'r50',label:'R5.0 Pink® Batts® Ceiling · 210 mm',fr:[5.0,210],ov:[0,0]},{key:'r36',label:'R3.6 Pink® Batts® Ceiling · 180 mm',fr:[3.6,180],ov:[0,0]}];
function optionsOf(c){
  if(isStrat(c))return ROOFOPT.map(o=>({key:o.key,label:o.label,cost:(COST(o.fr[0])+(o.ov[0]?COST(o.ov[0]):0))*(o.prem||1),apply:q=>{q.v.fr=Object.assign({},q.v.fr,{insR:o.fr[0],insT:o.fr[1],cover:true,prod:'Pink® Batts®'});q.v.over={r:o.ov[0],t:o.ov[1],prod:o.ov[0]?'Pink® Batts®':''}}}));
  const t=tpl(c);if(t.manual)return[];const s=(t.slots||[]).find(x=>x.id==='fr'&&x.k==='frame');if(!s)return[];
  const v=c.v.fr||{},depth=+v.d||MEMBER[s.member].d;
  /* only products that suit the frame depth: at least 70% of it (a 190 stud takes 140 mm or thicker), unless nothing does */
  const fitL=(PROD[s.member]||[]).filter(([,th])=>th<=depth||(s.cover&&v.cover)),suit=fitL.filter(([,th])=>th>=0.7*depth),use=suit.length?suit:fitL;
  return use.map(([r,th])=>({key:r+'@'+th,label:'R'+r.toFixed(1)+' · '+th+' mm'+(th<depth-1?' · leaves a '+(depth-th)+' mm air gap':''),r,th,cost:COST(r),apply:q=>{q.v.fr=Object.assign({},q.v.fr,{insR:r,insT:th,prod:'Pink® Batts®'})}}))}
function curKey(c){if(isStrat(c)){const fr=c.v.fr||{},ov=OV(c);const o=ROOFOPT.find(o=>+fr.insR===o.fr[0]&&+fr.insT===o.fr[1]&&(+ov.r||0)===o.ov[0]&&(+ov.t||0)===o.ov[1]);return o?o.key:'custom'}
  const v=c.v.fr||{};return(+v.insR)+'@'+(+v.insT)}
/* R of a (possibly modified) construction: whole / field, and the ceiling perimeter part */
function rOf(c){if(isStrat(c)){const st=strategy(c);return{r:calc(c).total,rp:st.per==='none'?null:st.pRT,W:st.G.W}}return{r:calc(c).total,rp:null}}
function minOK(c0,x){const z=zone()||1,HR=H.HEATR(z),c=c0.heatWet?Object.assign({},c0,{heated:false}):c0;
  if(c.el==='roof'){if(x.r<2.6-1e-9||(x.rp!=null&&x.rp<2.6-1e-9))return false;if(c.heated&&(x.r<6.6-1e-9||(x.rp!=null&&x.rp<3.3-1e-9)))return false;return true}
  if(c.el==='wall')return x.r>=1.0-1e-9&&(!c.heated||x.r>=2.9-1e-9);
  return x.r>=1.3-1e-9&&(!c.heated||x.r>=HR.susp-1e-9)}
function hlOf(c,x){const A=areaOf(c);if(x.rp!=null){const ap=Math.min(A,perimOfC(c)*x.W/1000);return(A-ap)/x.r+ap/x.rp}return A/x.r}
/* ---------- envelope ---------- */
function envelope(){const X=list().filter(c=>areaOf(c)>0&&excl(c)),L0=list().filter(c=>areaOf(c)>0&&!excl(c)),bad=L0.filter(c=>phys(c).length),L=L0.filter(c=>!bad.includes(c)),sum=el=>L.filter(c=>c.el===el).reduce((a,c)=>a+areaOf(c),0);
  const all=el=>L0.filter(c=>c.el===el).reduce((a,c)=>a+areaOf(c),0),glz=wins().reduce((a,w)=>a+opA(w),0),door=doors().reduce((a,d)=>a+opA(d),0),sky=skys().reduce((a,s)=>a+opA(s),0),wall=all('wall'),gross=wall+glz+door;
  const slab=L.filter(isSlab).reduce((a,c)=>a+areaOf(c),0),floor=L.filter(c=>c.el==='floor'&&!isSlab(c)).reduce((a,c)=>a+areaOf(c),0);
  return{L,L0,X,bad,roof:all('roof'),wall,floor,glz,door,sky,slab,gross,glzPct:gross?glz/gross*100:0}}
/* skylights, one row each by Area or Height × Width; one R from the manufacturer (Appendix D.2) — no default.
   Older projects: the single skylight area becomes the first row, and an entered Uw becomes R = 1/Uw rounded down (D.2.1.1). */
function skys(){if(!Array.isArray(P.skys)){P.skys=+P.skyA>0?[{n:'Skylight',a:P.skyA}]:[];if(+P.skyU>0&&!(+P.skyR>0))P.skyR=String(sig2(1/+P.skyU))}return P.skys}
const skyR=()=>(skys(),+P.skyR>0?+P.skyR:null);
/* the current design as entered: HL proposed (Equation 2.1) against HL reference */
function current(){const E=envelope(),hr=refHL(E),miss=[];if(!hr)miss.push('climate zone');
  if(E.sky&&!skyR())miss.push('skylight R');wins().forEach(w=>{if(opA(w)>0&&!winR(w).r)miss.push((w.n||'Windows')+' R');});E.L.filter(isSlab).forEach(c=>{const L=calc(c).slab;if(L&&!L.ok)miss.push(c.name+' — '+(L.none?L.why:slabMsg(L)))});
  let hp=fixedHL(E);E.L.forEach(c=>{if(isSlab(c)){const r=calc(c).total;if(r)hp+=areaOf(c)/r}else hp+=hlOf(c,rOf(c))});
  return{E,hp,hr,miss,ok:!miss.length&&!E.bad.length&&hr!=null}}
function refHL(E){const z=zone();if(!z)return null;const T=H.REFR(z);return (E.roof+E.sky)/T.roof+E.gross*.7/T.wall+E.gross*.3/T.glz+E.slab/T.slab+E.floor/T.susp}
const glzHL=gR=>wins().reduce((a,w)=>{const A=opA(w);if(!A)return a;const r=gR||winR(w).r;return r?a+A/r:a},0);
const refTxt=z=>{const T=H.REFR(z);const f=x=>(+x).toFixed(1);return 'roof + skylights R'+f(T.roof)+' · 70% of gross wall R'+f(T.wall)+' · slab-on-ground R'+f(T.slab)+' · other floors R'+f(T.susp)+' · 30% of gross wall (glazing) R'+T.glz.toFixed(2)};
const fixedHL=(E,gR)=>(E.glz?glzHL(gR):0)+(E.door?E.door/(+P.doorR||0.18):0)+(E.sky&&skyR()?E.sky/skyR():0);
/* ---------- background check: cheapest combination that keeps HL proposed ≤ HL reference ---------- */
const MEMO=new Map();
function optEval(c){const key=JSON.stringify([c.id,c.kind,c.o,c.v,c.heated,c.area,zone()]);if(MEMO.has(key))return MEMO.get(key);
  const out=optionsOf(c).map(o=>{const q=JSON.parse(JSON.stringify(c));o.apply(q);const x=rOf(q);return Object.assign({},o,{x,ok:minOK(c,x),hl:hlOf(c,x),$:o.cost*areaOf(c)})}).filter(o=>o.ok);
  MEMO.set(key,out);if(MEMO.size>400)MEMO.clear();return out}
let SUG=null;
function solve(){const E=envelope(),ref=refHL(E);
  const miss=[];if(!zone())miss.push('choose the council on the Project page');if(!E.roof)miss.push('enter the roof area');if(!E.wall)miss.push('enter the wall areas');if(E.bad.length)miss.push('fix '+E.bad.map(c=>'“'+c.name+'”').join(', ')+' (an insulation R-value and thickness that is not physically possible)');if(E.sky&&!skyR())miss.push('enter the skylight R');E.L.filter(isSlab).forEach(c=>{const L=calc(c).slab;if(L&&!L.ok)miss.push('“'+c.name+'”: '+(L.none?L.why:slabMsg(L)))});
  if(miss.length)return SUG={state:'need',miss};
  const units=E.L.map(c=>({c,opts:optEval(c),fixed:!optionsOf(c).length}));
  const fixedU=units.filter(u=>u.fixed||!u.opts.length);const varU=units.filter(u=>!u.fixed&&u.opts.length);
  const base=fixedU.reduce((a,u)=>a+hlOf(u.c,rOf(u.c)),0);
  let nAll=0,nOK=0;
  const search=gR=>{const fx=base+fixedHL(E,gR);let best=null;nAll=0;nOK=0;const idx=varU.map(()=>0),N=varU.reduce((a,u)=>a*u.opts.length,1);
    for(let k=0;k<Math.min(N,200000);k++){let hl=fx,cost=0;for(let j=0;j<varU.length;j++){const o=varU[j].opts[idx[j]];hl+=o.hl;cost+=o.$}
      nAll++;if(hl<=ref+1e-9)nOK++;
      if(hl<=ref+1e-9&&(!best||cost<best.cost-1e-6||(Math.abs(cost-best.cost)<1e-6&&hl<best.hl)))best={cost,hl,pick:idx.slice()};
      for(let j=0;j<idx.length;j++){if(++idx[j]<varU[j].opts.length)break;idx[j]=0}}
    return best};
  const b=search();
  if(!b){const gMin=Math.min(...wins().filter(w=>opA(w)>0).map(w=>winR(w).r||0),9),up=[0.46,0.55,0.8].filter(r=>r>gMin).find(r=>search(r));return SUG={state:'none',glzUp:up||null}}
  const by={};varU.forEach((u,j)=>{by[u.c.id]=u.opts[b.pick[j]]});
  return SUG={state:'ok',by,cost:b.cost,hl:b.hl,ref,N:nAll,nOK}}
let SUGK=null,SUGT=null;
const inKey=()=>JSON.stringify([P,list()]);
/* the whole-building search is slow: run it 600 ms after the last change, keep the page responsive meanwhile */
function sug(){const k=inKey();if(SUG&&SUGK===k)return SUG;clearTimeout(SUGT);SUGT=setTimeout(()=>{SUGT=null;if(inKey()!==k)return;solve();SUGK=k;R().render()},600);return{state:'wait'}}
function invalidate(){}
/* ---------- suggestion line under an insulation choice ---------- */
function suggHTML(c){const S=sug();if(!areaOf(c))return `<div class="sg sg-need"><span class="ms s16">lightbulb</span><span>Enter this construction's area on the <button class="sg-l" data-a="sel" data-v="project">Project</button> page to get a suggestion.</span></div>`;
  if(S.state==='wait')return `<div class="sg sg-need"><span class="ms s16">hourglass_top</span><span>Working out the suggestion…</span></div>`;
  if(S.state==='need')return `<div class="sg sg-need"><span class="ms s16">lightbulb</span><span>To get a suggestion: ${esc(S.miss.join('; '))} on the <button class="sg-l" data-a="sel" data-v="project">Project</button> page.</span></div>`;
  if(S.state==='none')return `<div class="sg sg-warn"><span class="ms s16">info</span><span>No insulation combination in the list is enough for this building with R${esc(P.glzR)} windows${S.glzUp?' — with R'+S.glzUp+' windows there is one.':' — the walls, slab or windows need to change.'}</span>${S.glzUp?`<button class="v6btn sg-b" data-a="pglz" data-v="${S.glzUp}">Use R${S.glzUp} windows</button>`:''}</div>`;
  const o=S.by[c.id];if(!o)return'';const same=o.key===curKey(c);
  return `<div class="sg${same?' sg-same':''}"><span class="ms s16">${same?'check_circle':'auto_awesome'}</span><span><b>Suggestion:</b> ${esc(o.label)} · R${f2(o.x.r)}${o.x.rp!=null?' / perimeter R'+f2(o.x.rp):''}${same?' — this is your current choice.':''}<em>Lowest-cost insulation across the whole project that keeps the building within H1/AS1 · costs are placeholders</em></span>${same?'':`<button class="v6pdfb sg-b" data-a="psugg" data-v="${c.id}">Use it</button>`}</div>`}
const suggKey=c=>{const S=sug();return S.state==='ok'&&S.by[c.id]?S.by[c.id].key:null};
function applySugg(c){const S=SUG||{};const o=S.state==='ok'&&S.by[c.id];if(!o)return;o.apply(c)}
/* ---------- Project page ---------- */
const ib=(f,v,cap,o)=>R().ib('p.'+f,v,cap,o),sel=(f,o,v,w)=>R().selF('p.'+f,o,v,w),grp=(l,i,n)=>R().grpF(l,i,n);
const pib=(k,cap,o)=>R().ib('pp.'+k,R().S.pdf.proj[k],cap,Object.assign({text:1},o||{}));
const seg=(k,v)=>`<div class="pseg">${['yes','no'].map(x=>`<button data-a="pseg" data-v="${k}:${x}" class="${v===x?'on':''}">${x==='yes'?'Yes':'No'}</button>`).join('')}</div>`;
function leftRow(){const on=R().S.cur==='project',sc=scopeP(),av=verdict(),bad=sc.length||av.state==='bad';
  return `<button class="el-card cx-row cx-proj${on?' on':''}" data-a="sel" data-v="project"><span class="ms s18 cx-pi">home_work</span><span class="cx-n"><b>Project</b><em>${esc(R().S.pdf.proj.address||'H1/AS1 inputs and areas')}</em></span></button>`}
function slabBlock(){const s=slab(),sl=(f,o,v)=>sel(f,o,v,'100%');
  return `<div class="pa-r sb"><div class="sb-hd"><span class="pa-n st">Slab-on-ground floor</span><span class="pa-i">${ib('slabA',P.slabA,'m²',{w:'96px'})}${ib('slabP',P.slabP,'m perimeter',{w:'96px'})}</span>
    <span class="pa-v mono${s.ok?'':' sb-bad'}">${s.ok?'R'+s.R.toFixed(1):s.none?'—':'no R'}</span></div>
    <div class="sb-g">${grp('Measured on',sl('slabM',[['int','Internal dimensions (Eq E.1)'],['ext','External dimensions (Eq E.2)']],P.slabM))}
    ${grp('Floor type',sl('slabF',[['slab','Slab floor'],['raft','Concrete raft foundation']],P.slabF))}
    ${grp('Underslab insulation',sl('slabU',[['none','None'],['s12','1.2 m strip R1.2'],['s24','1.2 m strip R2.4'],['f12','Full cover R1.2'],['f24','Full cover R2.4']],P.slabU),P.slabF==='raft'?'Slab floors only — set None for a raft':'')}
    ${grp('Vertical edge insulation',sl('slabE',[['none','None'],['r10','R1.0']],P.slabE))}
    ${grp('External wall',sl('slabWall',[['other','Other cladding'],['masonry','Masonry veneer']],P.slabWall))}
    ${grp('Effective wall thickness',ib('slabT',P.slabT,'mm',{w:'96px'}))}</div>
    <p class="sb-n">Effective wall thickness: horizontal distance from the outer edge of the slab to the inside face of the wall; for masonry veneer, from the slab edge at floor level.</p>
    ${s.none?'':s.ok?`<p class="sb-r">A/P = ${f2(s.ap)} (Eq ${s.eq}) → <b>Table ${esc(s.table)}</b> · A/P row ${esc(s.apRow)} · wall ${esc(s.band)} → <b>R${s.R.toFixed(1)}</b><em>A/P between two rows: the smaller row is used (no interpolation).</em></p>`:`<p class="sb-r bad"><span class="ms s16">error</span>${s.ap!=null?'A/P = '+f2(s.ap)+' · ':''}${esc(s.why)}</p>`}
    <p class="sb-n">Mixed edge insulation or wall types: Equations E.3–E.5</p></div>`}
/* roof (field + perimeter) against slab + suspended floors: the top and the bottom of the building */
function areaCheck(E){const r=E.roof,f=E.slab+E.floor;if(!r||!f)return'';const d=Math.abs(r-f)/Math.max(r,f)*100;if(d<=10)return'';
  return `<div class="pj-v open"><span class="ms s18">warning</span>Roof area (${f1(r)} m²) and floor area (${f1(f)} m²) differ by ${Math.round(d)}% — check the areas. A raked / skillion ceiling measured along the slope, or parts of the building with different numbers of storeys, can explain a difference.</div>`}
function curHTML(){const C=current();if(!C.hr)return'';const d=C.hr-C.hp,ok=d>=-1e-9;
  return `<div class="pj-cur ${C.ok?(ok?'ok':'bad'):'open'}"><div class="pj-cur-h"><b>Current design</b><span>${C.ok?(ok?'PASS':'FAIL'):'Incomplete'} · indicative — confirm in the BRANZ tool</span></div>
  <div class="pj-hl"><div><span>HL proposed</span><b class="mono">${f1(C.hp)} W/K</b></div><div><span>HL reference</span><b class="mono">${f1(C.hr)} W/K</b></div><div><span>Difference</span><b class="mono">${C.ok?(d>=0?'+':'')+f1(d)+' W/K · '+f1(d/C.hr*100)+'%':'—'}</b></div><div><span>Result</span><b class="mono">${C.ok?(ok?'PASS':'FAIL'):'—'}</b></div></div>${!C.ok?`<p class="pj-n" style="color:var(--fail-on)">Excluded: ${esc(C.miss.concat(C.E.bad.map(c=>c.name)).join('; '))}, so the figures are not comparable.</p>`:''}${C.E.bad.length?`<p class="pj-n" style="color:var(--fail-on)">Left out: ${esc(C.E.bad.map(c=>c.name).join(', '))} — R-value and thickness not physically possible.</p>`:''}</div>`}
function mid(){const z=zone(),taZ=(H.TA.find(t=>t[0]===P.ta)||[])[1],E=envelope(),sc=scopeP(),av=verdict(),S=sug();
  const byEl=el=>list().filter(c=>c.el===el);
  const delB=c=>list().length<2?'':`<button class="pa-add pa-del" data-a="delc" data-v="${c.id}" title="Delete ${esc(c.name)}" aria-label="Delete ${esc(c.name)}"><span class="ms s16">delete</span></button>`;
  const addB=(v,l)=>`<button class="pa-add" data-a="addel" data-stay="1" data-v="${v}" title="Add a ${l} construction" aria-label="Add a ${l} construction"><span class="ms s16">add</span></button>`;
  const conRow=c=>{const st=isStrat(c)?strategy(c):null,per=st&&st.per!=='none',ffN=c.el==='wall'&&!isSlab(c)&&(calc(c).notes||[]).some(n=>n.startsWith(FFEV))?`<span class="pa-why pa-amb">${esc(FFEV)}</span>`:'',itN=!hasSide(c)?'':excl(c)?`<span class="pa-why sb-n">Excluded — between conditioned spaces (2.1.2.4)</span>`:!sideOf(c)?`<span class="pa-why pa-amb">Choose what is on the other side of this wall — counted in the meantime.</span>`:'',
      sd=c.exclMsg?`<span class="pa-why pa-amb">This wall was marked as between two heated spaces and was left out. Remove its area if it isn't part of the envelope. <button class="link-btn" data-a="pexclok" data-v="${c.id}">OK</button></span>`:hasSide(c)?`<span class="pa-side">${sel('side.'+c.id,(c.kind==='it'&&!c.side?[['',SIDEQ(c)+' — choose…']]:[]).concat(SIDES),c.side||(c.kind==='it'?'':'out'),'100%')}</span>`:'';
    return `<div class="pa-r"><span class="pa-n st pa-cn">${ib('cn.'+c.id,c.name,'',{text:1,w:'100%',ph:'Construction name'})}</span>
    <span class="pa-i">${delB(c)}${isSlab(c)?ib('ca.'+c.id,c.area,'m²',{w:'96px'})+ib('sp.'+c.id,(c.v.slab||{}).sP,'m perimeter',{w:'96px',bad:!+(c.v.slab||{}).sP}):c.el==='roof'?ib('ra.'+c.id,(c.v.edge||{}).area,'m²',{w:'96px'})+(per?ib('rp.'+c.id,(c.v.edge||{}).perim,'m perim.',{w:'120px',bad:!perimOfC(c)}):''):ib('ca.'+c.id,c.area,'m²',{w:'96px'})}</span>
    ${phys(c).length?`<span class="pa-v mono bad">—</span><span class="pa-why">${esc(phys(c).map(x=>x.label+': '+x.msg).join('; '))} — left out of the heat-loss total.</span>`:`<span class="pa-v mono${excl(c)?' pa-ex':''}">${isSlab(c)?(calc(c).slab&&calc(c).slab.ok?'R'+calc(c).slab.Rtxt:'—'):'R'+f2(calc(c).total)+(per?' / '+f2(st.pRT):'')}</span>`}${sd}${itN}${ffN}${(w=>w?`<span class="pa-why sb-warn${w.w?'':' info'}"><span class="ms s16">${w.w?'warning':'info'}</span><span>${esc(w.t)}</span></span>`:'')(isSlab(c)&&R().slabWarn(c))}</div>`};
  return `<div class="card pj"><div class="pj-hd"><p class="kicker">H1/AS1 6th edition · Calculation Method</p><h2>Project</h2><p>Envelope areas and the numbers to type into the BRANZ H1/AS1 calculation tool. The areas also let the calculator suggest the lowest-cost insulation for each construction.</p></div>
  <section class="pj-s pj-det"><h3><i>1</i>Project details</h3>
    <div class="pj-addr">${pib('address','',{w:'100%',ph:'Street, suburb, city'})}<span class="pj-zt"><select class="pj-zs" data-f="p.zone" title="Climate zone — click to change">${[['',(P.ta||'Council?')+' · Zone '+(taZ||'—')]].concat([1,2,3,4,5,6].map(k=>[k,(P.ta||'')+(P.ta?' · ':'')+'Zone '+k+' (override)'])).map(([v,l])=>`<option value="${v}"${String(P.zone||'')===String(v)?' selected':''}>${esc(l)}</option>`).join('')}</select><span class="pj-i" tabindex="0"><span class="ms s16">info</span><span class="pj-tip">Placeholder — the council → climate zone list is not yet checked against H1/AS1 Appendix C. Council found from the address: ${esc(P.ta||'none')}.</span></span></span></div>
    <div class="pj-g3 pj-g4">${grp('Thermal envelope',sel('envS',[['whole','Whole building'],['unit','One household unit']],P.envS||'whole','100%').replace('<select','<select title="2.1.2.3 — shown on the PDF"'))}${grp('DP / Lot',pib('legal','',{w:'100%',ph:'e.g. Lot 1 DP 12345'}))}${grp('Designer',pib('designer','',{w:'100%'}))}${grp('Date',pib('date','',{w:'100%'}))}</div></section>
  <section class="pj-s"><h3><i>2</i>Envelope areas</h3><p class="pj-n">Finished internal face, overall internal dimensions (2.1.2.10). Enter only the walls, roofs and floors of the thermal envelope — leave out the garage, and walls or floors between two heated spaces (e.g. a party wall to a neighbour's living area) (2.1.2.4). Roof, wall and floor R-values come from the constructions on the left. A roof with a ceiling perimeter part needs the ceiling perimeter: perimeter area = perimeter × strip width, field = the rest (2.1.2.9).</p>
    ${[['roof','Roofs'],['wall','Walls']].map(([el,l])=>`<div class="pa-g"><div class="pa-h"><span class="glbl">${l}</span>${addB(el,l.slice(0,-1).toLowerCase())}</div>${byEl(el).map(conRow).join('')}</div>`).join('')}
    <div class="pa-g"><span class="glbl">Floors</span><div class="pa-h"><span class="pa-sub">Suspended / cantilevered floor</span>${addB('floor','suspended floor')}</div>${byEl('floor').filter(c=>!isSlab(c)).map(conRow).join('')}<div class="pa-h"><span class="pa-sub">Slab-on-ground</span>${addB('slab','slab-on-ground floor')}</div>${byEl('floor').filter(isSlab).map(conRow).join('')}</div>
    ${areaCheck(E)}
    <div class="pa-g"><div class="pa-h"><span class="glbl">Windows and doors</span><button class="v6btn pa-edit" data-a="sel" data-v="openings"><span class="ms s16">edit</span>Edit in Windows &amp; doors</button></div>
      ${wins().map(w=>{const x=winR(w);return roRow(w.n||'Window type',opA(w),x.r?'R'+f2(x.r):'—')}).join('')}
      ${doors().map(d=>roRow(d.n||'Opaque door',opA(d),'R'+f2(doorRv()))).join('')}${skys().map(s=>roRow(s.n||'Skylight',opA(s),skyR()?'R'+f2(skyR()):'—')).join('')}</div>
    <div class="pj-tot"><div><span>Gross wall area</span><b class="mono">${f1(E.gross)} m²</b></div><div><span>Wall glazing</span><b class="mono${E.glzPct>40?' neg':''}">${f1(E.glzPct)}%</b><em>${E.glzPct>40?'over the 40% limit of the Calculation Method (2.1.2.5)':'of gross wall area · limit 40% (2.1.2.5)'}</em></div></div>
    <p class="pj-n pj-scope">H1/AS1 does not apply to curtain walling, foil insulation, or non-housing occupied space over 300 m² (1.1.1.1, 1.1.2).</p></section>
  <section class="pj-s"><h3><i>3</i>Suggested insulation</h3>
    <div class="pj-how"><b>How the suggestion is found</b><ol><li>Heat loss by the H1/AS1 6th edition Calculation Method, Equation 2.1: HL = Σ A ÷ R over every element, for the proposed building and for the reference building (Table 2.1.2.7, zone ${z||'—'}${z?': '+refTxt(z):''}).</li><li>Every combination of the insulation options of each construction is calculated in turn. A combination is kept when HL proposed ≤ HL reference and every part meets its minimum R (2.1.2.11; Table 2.1.2.12 for heated elements).</li><li>The kept combinations are sorted by cost; the cheapest is the suggestion.</li></ol>
    <p><b>Inputs:</b> climate zone; the areas and ceiling perimeter above; each construction's framing, options and roof heel; the window and door R-values; the slab-on-ground R from Appendix E; cost per m² of each option (<span class="pj-ph">Placeholder</span>not yet checked). The BRANZ H1/AS1 calculation tool gives the compliance result.</p></div>
    ${curHTML()}
    ${S.state==='ok'?`<div class="pj-hl"><div><span>With the suggestion · HL proposed</span><b class="mono">${f1(S.hl)} W/K</b></div><div><span>HL reference</span><b class="mono">${f1(S.ref)} W/K</b></div><div><span>Margin</span><b class="mono">+${f1(S.ref-S.hl)} W/K · ${f1((S.ref-S.hl)/S.ref*100)}%</b></div><div><span>Combinations</span><b class="mono">${S.nOK} of ${S.N} within the reference</b></div></div>`:''}
    ${S.state==='wait'?`<div class="pj-v open"><span class="ms s18">hourglass_top</span>Working out the suggestions…</div>`:S.state==='need'?`<div class="pj-v open"><span class="ms s18">edit</span>To get suggestions: ${esc(S.miss.join('; '))}.</div>`:S.state==='none'?`<div class="pj-v bad"><span class="ms s18">info</span>No insulation combination in the list is enough with R${esc(P.glzR)} windows${S.glzUp?' — with R'+S.glzUp+' windows there is one.':' — the walls, slab or windows need to change.'}${S.glzUp?`<button class="v6btn sg-b" data-a="pglz" data-v="${S.glzUp}">Use R${S.glzUp} windows</button>`:''}</div>`:
    `<div class="sgl">${list().filter(c=>S.by[c.id]).map(c=>{const o=S.by[c.id],same=o.key===curKey(c);return `<div class="sgl-r${same?' same':''}"><button class="pa-n" data-a="sel" data-v="${c.id}">${esc(c.name)}</button><span>${esc(o.label)}</span><span class="mono">R${f2(o.x.r)}${o.x.rp!=null?' / '+f2(o.x.rp):''}</span>${same?'<em>Current</em>':`<button class="v6btn" data-a="psugg" data-v="${c.id}">Use it</button>`}</div>`}).join('')}</div>
    ${list().some(c=>S.by[c.id]&&S.by[c.id].key!==curKey(c))?'<button class="v6pdfb sg-all" data-a="psuggall"><span class="ms s16">auto_awesome</span>Use all suggestions</button>':''}`}</section></div>`}
/* BRANZ input rows — what the user types into the workbook */
function branzRows(){const E=envelope(),out=[];
  E.L.forEach(c=>{if(isSlab(c)){const L=calc(c).slab;if(L&&!L.ok){out.push({sh:'Slab Floors',d:c.name+' — R not determined — see sheet '+(toSheet(c,list()).ref||''),a:areaOf(c),r:null});return}
    if(L&&L.ok)out.push({sh:'Slab Floors',d:c.name+' — '+(L.vm1?'H1/VM1 Appendix E calculation'+(L.src?' ('+L.src+')':''):L.mixed?'Appendix E, '+L.segs.length+' perimeter parts (Eq E.3–E.5)':'Table '+L.table+', A/P row '+L.apRow+', wall '+L.band),a:areaOf(c),r:+L.Rtxt});return}
    const x=rOf(c),A=areaOf(c),sh={roof:'Roof',wall:'Walls',floor:'Suspended Floors'}[c.el];
    if(x.rp!=null){const ap=Math.min(A,perimOfC(c)*x.W/1000);out.push({sh,d:c.name+' — field',a:A-ap,r:x.r,heated:c.heated},{sh,d:c.name+' — ceiling perimeter '+x.W+' mm',a:ap,r:x.rp,heated:c.heated})}
    else out.push({sh,d:c.name+(hasSide(c)&&sideOf(c)!=='out'?' — other side: '+sideTxt(c):''),a:A,r:x.r,heated:c.heated})});
  const hwT=o=>(isHW(o)?' — '+(+o.h)+' × '+(+o.wd)+' mm':'')+(qty(o)>1?' × '+qty(o):'');
  wins().forEach(w=>{const A=opA(w);if(!A)return;const x=winR(w);out.push({sh:'Glazing (walls & doors)',d:(w.n||'Windows and glazed doors')+hwT(w)+' — '+(x.src||x.why),a:A,r:x.r,op:w})});
  doors().forEach(d=>{const A=opA(d);if(!A)return;out.push({sh:'Doors (opaque)',d:(d.n||'Opaque door')+hwT(d)+(P.doorR===''?' — 2.1.2.13 default':''),a:A,r:doorRv(),op:d})});
  skys().forEach(s=>{const A=opA(s);if(!A)return;out.push({sh:'Skylights',d:(s.n||'Skylight')+hwT(s)+' — manufacturer R (Appendix D.2)',a:A,r:skyR(),op:s})});
  return out}
/* the BRANZ sheets for windows, doors and skylights: always shown, last, in this order */
const OPEN_SH=['Glazing (walls & doors)','Doors (opaque)','Skylights'];
function right(){const rows=branzRows(),by={};rows.forEach(r=>{(by[r.sh]=by[r.sh]||[]).push(r)});
  return `<div class="card pj-r"><h2>BRANZ input</h2><p class="pj-n">Type these into the BRANZ H1/AS1 calculation tool — it gives the pass / fail. Copy pastes a sheet's rows at cell C10.</p>
    ${Object.entries(by).filter(([sh])=>!OPEN_SH.includes(sh)).concat(OPEN_SH.map(sh=>[sh,by[sh]||[]])).map(([sh,L])=>`<div class="bz"><div class="bz-h"><b>${esc(sh)}</b>${L.length?`<button class="v6btn bz-c" data-a="pcopy" data-v="${esc(sh)}"><span class="ms s16">content_copy</span>Copy</button>`:''}</div>${OPEN_SH.includes(sh)?(L.length?'<p class="pj-n bz-hint">Paste at the first Description cell of the sheet: Description · ID · Area · Height · Width · R-value</p>':`<p class="pj-n bz-hint">None yet — enter the sizes in <button class="link-btn" data-a="sel" data-v="openings">Windows &amp; doors</button>.</p>`):''}${L.map(r=>`<div class="bz-r"><span>${esc(r.d)}</span><b class="mono">${f1(r.a)} m²</b><b class="mono">${r.r==null?'—':'R'+f2(r.r)}</b></div>`).join('')}</div>`).join('')||'<p class="pj-n">Enter the areas first.</p>'}
    <div class="bz-pd"><span class="glbl">Project Details sheet</span><div class="bz-r"><span>F7 Project name</span><b>${esc(R().S.pdf.proj.address||'—')}</b></div><div class="bz-r"><span>F9 Designer</span><b>${esc(R().S.pdf.proj.designer||'—')}</b></div><div class="bz-r"><span>F12 Territorial Authority</span><b>${esc(P.ta||'—')}</b></div></div>
    <button class="v6pdfb pj-pdf" data-a="pdf"><span class="ms s18">picture_as_pdf</span>Export PDF report</button></div>`}
/* Windows & doors — optional, only for the BRANZ input (not in the PDF). On the Project page it is a read-only summary. */
const roRow=(n,a,r)=>`<div class="pa-r pa-ro"><span class="pa-n st">${esc(n)}</span><span class="pa-i mono">${+a>0?f1(+a)+' m²':'—'}</span><span class="pa-v mono">${r}</span></div>`;
function openRow(){const on=R().S.cur==='openings';
  return `<button class="el-card cx-row cx-proj cx-open${on?' on':''}" data-a="sel" data-v="openings"><span class="ms s18 cx-pi">window</span><span class="cx-n"><b>Windows &amp; doors</b><em>Optional · BRANZ input only</em></span></button>`}
/* Area, or Height × Width (mm) — as the BRANZ sheet; with both sizes the area is worked out and shown */
/* an Area typed in locks Height and Width (clear the area to enter sizes); Qty multiplies the unit's area */
const hwIn=(f,o)=>{const lock=!isHW(o)&&+o.a>0?'Clear the area to enter height and width':'';
  return `${isHW(o)?`<span class="sb-ro mono">${f2(unitA(o))} m²</span>`:ib(f+'a',o.a,'m²',{w:'72px'})}<span class="hw-or">or</span>${ib(f+'h',o.h,'mm',{w:'66px',ph:'Height',dis:lock})}<span class="hw-or">×</span>${ib(f+'wd',o.wd,'mm',{w:'66px',ph:'Width',dis:lock})}<span class="hw-or">Qty</span>${ib(f+'q',o.q,'',{w:'44px',ph:'1'})}${qty(o)>1&&unitA(o)?`<span class="hw-t mono">= ${f2(opA(o))} m²</span>`:''}`};
/* top of Windows & doors: how window R-values are found, and the default every window takes */
function wTop(){wset();const tab=P.wm==='tab',D=wdefR(),opt=(k,o,v)=>`<div class="pseg">${o.map(([x,l])=>`<button data-a="pseg" data-v="${k}:${x}" class="${String(v)===x?'on':''}">${l}</button>`).join('')}</div>`;
  const tip=(D.r?D.src:D.why)+'. Most housing uses Table D.1.1.1; windows not in the table are modelled to H1/VM1 Appendix D. A window set to Custom (tune icon) has its own R.';
  return `<div class="wtop"><div class="wtop-r"><span class="glbl">Window R</span>${opt('wm',[['tab','Table D.1.1.1'],['calc','H1/VM1 calc.']],P.wm)}
    <span class="glbl">Default</span>${tab?opt('wdk',[['r037','R0.37'],['r046','R0.46'],['custom','Custom']],P.wdk):opt('wdefR',[['0.37','R0.37'],['0.46','R0.46']],P.wdefR)+ib('wdefR',P.wdefR,'R',{w:'64px',ph:'0.15'})}
    <b class="mono wtop-v${D.r?'':' neg'}" title="${esc(tip)}">${D.r?'R'+f2(D.r):'—'}<span class="ms s16">info</span></b></div>
    ${tab&&P.wdk==='custom'?`<div class="wtop-r">${sel('wfr',FRAMES,P.wfr,'100%')}${sel('wgl',[['double','Double glazing'],['triple','Triple glazing']],P.wgl,'100%')}${ib('wug',P.wug,'Ug W/m²K',{w:'90px',bad:!(+P.wug>0)})}</div>`:''}
    ${D.r?'':`<span class="pa-why pa-amb">${esc(D.why)}</span>`}</div>`}
function openMid(){return `<div class="card pj"><div class="pj-hd"><p class="kicker">Optional · BRANZ input</p><h2>Windows &amp; doors</h2><p>Glazing, opaque doors and skylights for the BRANZ H1/AS1 calculation tool. Not needed for the construction R-values and not in the PDF — copy the rows from BRANZ input on the right.</p></div>
  <section class="pj-s">${wTop()}
    <div class="wlist"><div class="wrow wrow-h"><span>Window · glazed door</span><span>Area m² — or Height × Width mm · Qty</span><span></span><span>R</span></div>
      ${wins().map((w,i)=>{const x=winR(w),wf=k=>'w.'+i+'.'+k;return `<div class="wrow${w.own?' own':''}"><span class="wname">${ib(wf('n'),w.n,'',{text:1,w:'100%',ph:'e.g. EXW101'})}</span><span class="wsz">${hwIn('w.'+i+'.',w)}</span>
        <button class="wic${w.own?' on':''}" data-a="pwown" data-v="${i}" title="${w.own?'Custom R — click to use the default':'Default R — click for a custom R'}"><span class="ms s16">tune</span></button><span class="wv mono">${x.r?'R'+f2(x.r):'—'}${delB('pwdel',i,wins().length,'window')}</span>
        ${w.own?`<div class="wown">${P.wm==='tab'?sel(wf('fr'),FRAMES,w.fr||P.wfr,'100%')+sel(wf('gl'),[['double','Double glazing'],['triple','Triple glazing']],w.gl||P.wgl,'100%')+ib(wf('ug'),w.ug,'Ug W/m²K',{w:'90px',bad:!(+w.ug>0)}):ib(wf('r'),w.r,'R',{w:'64px',ph:'0.37',bad:!(+w.r>0)})}<span class="pa-why ${x.r?'sb-n':'pa-amb'}">${esc(x.r?x.src:x.why)}</span></div>`:''}</div>`}).join('')}
      <div class="wadd"><button class="v6btn" data-a="pwadd"><span class="ms s16">add</span>Add a window</button><span class="pa-why sb-n">Opaque part of a door is counted separately (D.1.1.2) — put it in Opaque doors.</span></div></div>
    <div class="wlist"><div class="wrow wrow-h"><span>Opaque door</span><span>Area m² — or Height × Width mm · Qty</span><span></span><span>R</span></div>
      ${doors().map((d,i)=>`<div class="wrow"><span class="wname">${ib('dr.'+i+'.n',d.n,'',{text:1,w:'100%',ph:'Opaque door'})}</span><span class="wsz">${hwIn('dr.'+i+'.',d)}</span><span></span><span class="wv mono">R${f2(doorRv())}${delB('pddel',i,doors().length,'door')}</span></div>`).join('')}
      <div class="wadd"><button class="v6btn" data-a="pdadd"><span class="ms s16">add</span>Add a door</button><span class="wr">Door R ${ib('doorR',P.doorR,'',{w:'64px',ph:'0.18'})}</span><span class="pa-why sb-n">Default 0.18 (2.1.2.13) unless calculated to H1/VM1 Appendix D.</span></div></div>
    <div class="wlist"><div class="wrow wrow-h"><span>Skylight</span><span>Area m² — or Height × Width mm · Qty</span><span></span><span>R</span></div>
      ${skys().map((s,i)=>`<div class="wrow"><span class="wname">${ib('sk.'+i+'.n',s.n,'',{text:1,w:'100%',ph:'Skylight'})}</span><span class="wsz">${hwIn('sk.'+i+'.',s)}</span><span></span><span class="wv mono">${skyR()?'R'+f2(skyR()):'—'}${delB('psdel',i,1,'skylight')}</span></div>`).join('')}
      <div class="wadd"><button class="v6btn" data-a="psadd"><span class="ms s16">add</span>Add a skylight</button><span class="wr">Skylight R ${ib('skyR',P.skyR,'',{w:'64px',ph:'R',bad:skys().some(s=>opA(s)>0)&&!skyR()})}</span><span class="pa-why sb-n">From the manufacturer (Appendix D.2). The reference roof uses the gross roof area (roof + skylights).</span></div></div>
  </section></div>`}
/* a row's delete button — windows and doors keep at least one row; there can be no skylights */
const delB=(a,i,n,l)=>n>1||a==='psdel'?`<button class="wdel" data-a="${a}" data-v="${i}" title="Delete this ${l}"><span class="ms s16">close</span></button>`:'';
/* ---------- PDF: project details only — the report is construction R-values; areas, glazing and the pass / fail are the BRANZ tool's ---------- */
function pdf(){const z=zone(),pr=R().S.pdf.proj;
  return[`<section class="pjps"><h3>Project</h3><div class="pjkv">${[['Address',pr.address],['DP / Lot',pr.legal],['Designer',pr.designer],['Territorial Authority',P.ta],['Climate zone',z?z+(P.zone?' (selected)':''):'—'],['Date',pr.date]].map(([k,v])=>`<div><span>${k}</span><b>${esc(v||'—')}</b></div>`).join('')}</div></section>`]}
/* ---------- writes ---------- */
function set(path,raw){if(typeof raw==='string'&&/^\.\d/.test(raw))raw='0'+raw;const p=path.split('.'),v=raw==null?'':String(raw);
  if(p[0]==='pp'){R().S.pdf.proj[p[1]]=v}
  else if(p[0]==='ra'||p[0]==='rp'){const c=list().find(c=>c.id===p[1]);if(c){c.v.edge=c.v.edge||{};c.v.edge[p[0]==='ra'?'area':'perim']=raw}}
  else if(p[0]==='sp'){const c=list().find(c=>c.id===p[1]);if(c){c.v.slab=c.v.slab||{};c.v.slab.sP=raw}}
  else if(p[0]==='ca'){const c=list().find(c=>c.id===p[1]);if(c)c.area=raw}
  else if(p[0]==='cn'){const c=list().find(c=>c.id===p[1]);if(c){c.name=v;R().nameHint(c)}}
  else if(p[0]==='side'){const c=list().find(c=>c.id===p[1]);if(c){c.side=v||undefined;delete c.sideAsk}}
  else if(p[0]==='w'){const w=wins()[+p[1]];if(w)w[p[2]]=v;syncGlz()}
  else if(p[0]==='dr'){const d=doors()[+p[1]];if(d)d[p[2]]=v;syncDoor()}
  else if(p[0]==='sk'){const s=skys()[+p[1]];if(s)s[p[2]]=v;syncSky()}
  else if(path==='zone')P.zone=raw?+raw:null;else P[path]=v;invalidate()}
/* the single-row fields stay in step (total area, first row's R) */
function syncDoor(){P.doorA=String(doors().reduce((a,d)=>a+opA(d),0)||'')}
function syncSky(){P.skyA=String(skys().reduce((a,s)=>a+opA(s),0)||'')}
function syncGlz(){const W=wins();P.glzA=String(W.reduce((a,w)=>a+opA(w),0)||'');P.glzR=String((W[0]?winR(W[0]):wdefR()).r||'')}
/* saved projects from before 2.1.2.4: an intertenancy wall keeps counting, as facing a garage — asked once to confirm */
/* the other-side choice is gone: a construction that was left out as between two heated spaces is flagged once; the rest just lose the tag */
function migSide(L){(L||[]).forEach(c=>{if(!c)return;if(c.side==='cond'&&areaOf(c)>0)c.exclMsg=1;delete c.side;delete c.sideAsk})}
function act(a,v,b){
  if(a==='pseg'){const [k,x]=v.split(':');P[k]=x}
  else if(a==='pglz'){wset();P.wm='calc';P.wdefR=String(v);wins().forEach(w=>{w.own=''});syncGlz();invalidate()}
  else if(a==='pwadd'){const L=wins(),pn=(L[L.length-1]||{}).n||'';   /* one row per window, as the BRANZ sheet; it takes the default R. EXW101 → EXW102 */
    L.push({n:/\d+$/.test(pn)?pn.replace(/\d+$/,m=>String(+m+1).padStart(m.length,'0')):'Window '+(L.length+1),a:'',h:'',wd:'',own:''});syncGlz()}
  else if(a==='pwdel'){wins().splice(+v,1);syncGlz()}
  else if(a==='pdadd'){doors().push({n:'Opaque door '+(doors().length+1),a:'',h:'',wd:''});syncDoor()}
  else if(a==='pddel'){doors().splice(+v,1);syncDoor()}
  else if(a==='psadd'){skys().push({n:'Skylight '+(skys().length+1),a:'',h:'',wd:''});syncSky()}
  else if(a==='psdel'){skys().splice(+v,1);syncSky()}
  else if(a==='pwown'){const w=wins()[+v];if(!w)return false;w.own=w.own?'':'1';   /* Custom starts from the default */
    if(w.own){const d=P.wdk==='custom'||!WPRE[P.wdk]?[P.wfr,P.wgl,P.wug]:WPRE[P.wdk];w.fr=d[0];w.gl=d[1];w.ug=d[2];w.r=P.wdefR}syncGlz()}
  else if(a==='pexclok'){const c=list().find(c=>c.id===v);if(c)delete c.exclMsg}
  else if(a==='psugg'){const c=list().find(c=>c.id===v);if(c)applySugg(c)}
  else if(a==='psuggall'){const S=SUG||{};if(S.state==='ok')list().forEach(c=>{const o=S.by[c.id];if(o&&o.key!==curKey(c))o.apply(c)});invalidate()}
  else if(a==='pcopy'){const txt=branzRows().filter(r=>r.sh===v).map(r=>(r.op?(o=>{const hw=isHW(o)&&qty(o)===1;return[(o.n||'')+(qty(o)>1?' x'+qty(o):''),'',hw?'':f2(r.a),hw?String(+o.h):'',hw?String(+o.wd):'',r.r==null?'':f2(r.r)]})(r.op):   /* BRANZ glazing / door sheet: Description · ID · Area or Height AND Width · R-value; Qty > 1 → "EXW203 x6" with the total area */[r.d,r.heated?'Yes':'No',f1(r.a),r.r==null?'—':f2(r.r)]).join('\t')).join('\n');
    const done=()=>{b.innerHTML='<span class="ms s16">check</span>Copied'};(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(done).catch(()=>{const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(_){}ta.remove();done()});return false}
  else return false}
/* council from the address: the last place name in it that matches the council list (placeholder list) */
const ALIAS={'browns bay':'Auckland','north shore':'Auckland','takapuna':'Auckland','manukau':'Auckland','lower hutt':'Hutt City','petone':'Hutt City','porirua':'Wellington','frankton':'Queenstown-Lakes','wanaka':'Queenstown-Lakes','rolleston':'Selwyn','mount maunganui':'Tauranga'};
function taFrom(addr){const s=addr.toLowerCase();let best=null,at=-1;H.TA.forEach(([n])=>{const i=s.lastIndexOf(n.toLowerCase());if(i>at){at=i;best=n}});Object.keys(ALIAS).forEach(k=>{const i=s.lastIndexOf(k);if(i>at){at=i;best=ALIAS[k]}});return best}
function after(){const S=R().S,z=zone();if(z)S.zone=z;const pr=S.pdf.proj;if(pr.address){const t=taFrom(pr.address);if(t&&t!==P.ta){P.ta=t}S.name=pr.address;pr.project_name=pr.address}invalidate();
  if(SK)try{localStorage.setItem(SK,JSON.stringify({fmt:2,P,list:toSaved(S.list),proj:S.pdf.proj,guide:S.guide||{}}))}catch(e){}}
/* New project: the stored project becomes an empty one (test mode: only this test project) */
function blank(){if(!SK)return;try{localStorage.setItem(SK,JSON.stringify({fmt:2,P:Object.assign({glzR:''},NEWOPEN()),list:[],proj:{},guide:{}}))}catch(e){}}
function seed(L){const r=L.find(c=>c.el==='roof'),w=L.filter(c=>c.el==='wall');if(r){r.v.edge=r.v.edge||{};if(r.v.edge.area==null)r.v.edge.area=140;if(r.v.edge.perim==null)r.v.edge.perim=48}
  if(w[0]&&w[0].area==null)w[0].area=100;if(w[1]&&w[1].area==null)w[1].area=30}
function load(){if(!SK)return null;try{const s=JSON.parse(localStorage.getItem(SK));if(s&&s.list){s.list=fromSaved(s.list,s.fmt||1);migSide(s.list)}return s}catch(e){return null}}
function replaceWith(d){const S=R().S;Object.keys(P).forEach(k=>delete P[k]);Object.assign(P,DEF,d.project.P||{});LZ(P);
  S.list=fromSaved(JSON.parse(JSON.stringify(d.list)),2);migSide(S.list);S.pdf.proj=Object.assign({},S.pdf.proj,d.project.proj||{});S.guide=d.guide||{};S.cur='project';S.af=null}
const hasContent=()=>list().some(c=>areaOf(c)>0)||!!(R().S.pdf.proj||{}).address;
if(SK)window.addEventListener('storage',e=>{if(e.key!==SK||!e.newValue)return;const sv=load();if(!sv)return;if(sv.P){Object.keys(P).forEach(k=>delete P[k]);Object.assign(P,DEF,sv.P);LZ(P)}R().reload(sv)});
window.RVP={blank,migSide,SIDES,SIDEQ,SIDEHELP,hasSide,sideOf,replaceWith,hasContent,seed,leftRow,openRow,openMid,mid,right,pdf,set,act,after,load,suggHTML,suggKey,invalidate,state:()=>P,PARAM};
})();
