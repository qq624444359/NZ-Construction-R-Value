/* EZbuild H1 calculator — data and calculation (H1/AS1 6th edition, in force 27 Nov 2025, Calculation Method 2.1.2).
   Construction R-values for roofs, framed walls and suspended floors come from the R-value calculator model
   (rvalue-model.js: newC / calc / strategy), so each one can be opened there. Everything else is a catalogue value. */
(function(){
'use strict';
/* council → climate zone: PLACEHOLDER, to be checked against H1/AS1 Appendix C */
const TA=[['Far North',1],['Whangārei',1],['Kaipara',1],['Auckland',1],['Thames-Coromandel',2],['Hamilton',2],['Waikato',2],['Tauranga',2],['Rotorua',3],['Gisborne',2],['Napier',3],['Hastings',3],['New Plymouth',3],['Whanganui',3],['Taupō',4],['Palmerston North',4],['Wellington',4],['Hutt City',4],['Nelson',3],['Marlborough',3],['Westland',5],['Christchurch',5],['Selwyn',5],['Timaru',5],['Dunedin',5],['Queenstown-Lakes',6],['Central Otago',6],['Mackenzie',6],['Invercargill',5],['Southland',6]];
/* Table 2.1.2.7 — reference building */
const REFR=z=>({roof:6.6,wall:1.6,glz:z<=4?0.46:0.50,slab:z<=4?1.5:z===5?1.6:1.7,susp:z<=3?2.5:z===4?2.8:3.0});
/* the placeholder table the previous prototype used — kept only to report old vs new */
const REFOLD={1:{roof:6.6,wall:1.6,glz:.46,slab:1.5,susp:2.5},2:{roof:6.6,wall:1.6,glz:.46,slab:1.5,susp:2.5},3:{roof:6.6,wall:2.0,glz:.5,slab:1.5,susp:2.8},4:{roof:6.6,wall:2.0,glz:.5,slab:1.6,susp:2.8},5:{roof:6.6,wall:2.0,glz:.5,slab:1.7,susp:3.0},6:{roof:6.6,wall:2.0,glz:.5,slab:1.7,susp:3.0}};
/* 2.1.2.11 minimums; Table 2.1.2.12 heated minimums (note 4: within 500 mm of a heated ceiling's edge R3.3) */
const MINR={roof:2.6,wall:1.0,susp:1.3};
const HEATR=z=>({roof:6.6,wall:2.9,slab:z<=3?2.5:z===4?2.8:3.0,susp:z<=3?2.5:z===4?2.8:3.0});
const DEFAULTR=el=>el==='glz'?0.15:0.18;   // 2.1.2.13
const EL={roof:'Roof',wall:'Wall',glz:'Glazing (walls & doors)',door:'Opaque door',slab:'Slab-on-ground floor',susp:'Suspended floor'};
const HEATABLE={roof:1,wall:1,slab:1,susp:1};
const SHEET={roof:'Roof',wall:'Walls',slab:'Slab Floors',susp:'Suspended Floors',glz:'Glazing (walls & doors)',door:'Doors (opaque)'};
const NOPE=[['ext','External insulation'],['raft','Raft slab'],['brick','Brick veneer'],['deep','Deep stud'],['foil','Foil insulation']];
/* catalogue. c = $/m² installed — PLACEHOLDER pricing. m = model build-up (R from the R-value calculator); r = catalogue R. */
const CAT={
 roof:[{id:'auto',n:'Two layers R3.6 Pink® Batts® Ceiling (R7.0 if the heel is short)',fsel:'auto',c:62,def:1},
       {id:'r50',n:'R5.0 ceiling batts, one layer',fsel:'custom',cR:5.0,cT:200,cName:'R5.0 ceiling batts',c:46},
       {id:'r36',n:'R3.6 ceiling batts, one layer',fsel:'custom',cR:3.6,cT:180,cName:'R3.6 ceiling batts',c:36}],
 wall:[{id:'w28',n:'90 mm stud @600 + R2.8 Pink® Batts®',m:{},c:92,def:1},
       {id:'w22',n:'90 mm stud @600 + R2.2 glasswool',m:{fr:{insR:2.2,insT:90,prod:'R2.2 glasswool'}},c:80},
       {id:'w26',n:'90 mm stud @600 + R2.6 glasswool',m:{fr:{insR:2.6,insT:90,prod:'R2.6 glasswool'}},c:86},
       {id:'w36',n:'140 mm stud @600 + R3.6 glasswool',m:{fr:{d:140,insR:3.6,insT:140,prod:'R3.6 glasswool'}},c:104,t:'deep'},
       {id:'brick',n:'90 mm stud + R2.2, brick veneer',r:1.9,c:165,t:'brick'},
       {id:'ext',n:'90 mm stud + R2.2 + 40 mm external EPS',r:2.9,c:140,t:'ext'},
       {id:'foil',n:'90 mm stud + foil-faced blanket',r:2.0,c:84,t:'foil'}],
 glz:[{id:'g37',n:'Aluminium, double glazed (R0.37)',r:.37,c:520,def:1},{id:'g46',n:'Thermally broken aluminium, double glazed low-E (R0.46)',r:.46,c:640},
      {id:'g55',n:'uPVC, double glazed low-E (R0.55)',r:.55,c:690},{id:'g80',n:'Timber, triple glazed (R0.80)',r:.80,c:980}],
 door:[{id:'d18',n:'Hollow core (R0.18)',r:.18,c:400,def:1},{id:'d45',n:'Solid core, insulated (R0.45)',r:.45,c:690}],
 slab:[{id:'s0',n:'Uninsulated slab',r:1.3,c:145,def:1,slabR:1},{id:'sp',n:'Slab with perimeter insulation',r:1.6,c:188,slabR:1},
       {id:'raft',n:'Waffle-pod raft slab',r:2.2,c:175,t:'raft',slabR:1},{id:'sx',n:'Fully insulated slab',r:2.8,c:232,t:'ext',slabR:1}],
 susp:[{id:'f36',n:'240 joists @400 + R3.6 underfloor batts',m:{},c:55,def:1},
       {id:'f26',n:'240 joists @400 + R2.6 underfloor batts',m:{fr:{insR:2.6,insT:110,prod:'R2.6 underfloor batts'}},c:44},
       {id:'ffoil',n:'Foil underfloor',r:2.4,c:30,t:'foil'}]};
const MEL={roof:'roof',wall:'wall',susp:'floor'};
const deep=o=>JSON.parse(JSON.stringify(o));
const hasModel=()=>typeof newC==='function'&&typeof calc==='function';
/* the model construction for a catalogue option on a row */
function buildC(row,o){const el=MEL[row.el];if(!el||!hasModel())return null;
  const c=newC(el);c.heated=!!row.heated;c.name=(row.name||EL[row.el])+' — '+o.n;
  if(row.el==='roof'){if(o.r!=null&&!o.fsel)return null;
    c.v.edge=Object.assign({},c.v.edge,{heel:row.heel===''||row.heel==null?null:+row.heel,fsel:o.fsel,psel:'auto'});
    if(o.fsel==='custom')Object.assign(c.v.edge,{cR:o.cR,cT:o.cT,cName:o.cName});return c}
  if(!o.m)return null;Object.keys(o.m).forEach(k=>{c.v[k]=Object.assign({},c.v[k],o.m[k])});return c}
const CACHE=new Map();
/* resolved option: {o, r (field / whole), rp (perimeter or null), W (strip mm), st, c, src} */
function resolve(row,o){const key=row.el+'|'+o.id+'|'+(row.heated?1:0)+'|'+(row.el==='roof'?row.heel:'');if(CACHE.has(key))return CACHE.get(key);
  let x;const c=buildC(row,o);
  if(c&&row.el==='roof'){const st=strategy(c),rf=calc(st.ce).total;x={o,r:rf,rp:st.per==='none'?null:st.pRT,W:st.G.W,st,c,src:'model',fieldLabel:(o.fsel==='auto'?st.field.name:o.n),
      label:(o.fsel==='auto'?st.field.name:o.n)+(st.per==='product'?' + '+st.pp.name+' R'+st.pp.R.toFixed(1)+' perimeter':st.per==='comp'?' + compressed perimeter':'')}}
  else if(c){x={o,r:calc(c).total,rp:null,c,src:'model',label:o.n}}
  else x={o,r:o.r,rp:null,src:o.slabR?'slab':'catalogue',label:o.n};
  x.r=+(+x.r).toFixed(2);if(x.rp!=null)x.rp=+(+x.rp).toFixed(2);CACHE.set(key,x);return x}
const link=x=>x&&x.c?'r-value-configurator-v6.html?h1='+encodeURIComponent(JSON.stringify({el:x.c.el,kind:x.c.kind,o:x.c.o,v:x.c.v,name:x.c.name,heated:x.c.heated})):null;

/* roof areas: perimeter strip = ceiling perimeter × strip width (corners counted twice — conservative), field = rest (2.1.2.9) */
function roofAreas(row,x){const A=+row.area||0;if(!x||x.rp==null)return{af:A,ap:0};const ap=Math.min(A,(+row.perim||0)*(x.W||500)/1000);return{af:A-ap,ap}}
function hlOf(row,x){const A=+row.area||0;if(row.el==='roof'&&x.rp!=null){const a=roofAreas(row,x);return a.af/x.r+a.ap/x.rp}return A/x.r}
/* minimum checks for one resolved option on a row */
function checksOf(row,x,z){const out=[],H=HEATR(z||1),ck=(part,need,have,clause)=>out.push({part,need,have,ok:have>=need-1e-9,clause});
  const m=MINR[row.el];
  if(row.el==='roof'){ck(x.rp!=null?'Field':'Whole roof',m,x.r,'2.1.2.11(a)');if(x.rp!=null)ck('Ceiling perimeter',m,x.rp,'2.1.2.11(a)');
    if(row.heated){ck(x.rp!=null?'Field, heated':'Heated ceiling',H.roof,x.r,'Table 2.1.2.12');if(x.rp!=null)ck('Perimeter, heated',3.3,x.rp,'Table 2.1.2.12 note 4')}}
  else{if(m)ck('Construction',m,x.r,row.el==='wall'?'2.1.2.11(b)':'2.1.2.11(c)');if(row.heated&&H[row.el])ck('Heated',H[row.el],x.r,'Table 2.1.2.12')}
  return out}
function options(row){const cat=CAT[row.el]||[];
  if(row.mode==='opt'&&cat[row.opt])return[{o:cat[row.opt],fixed:1}];
  if(row.mode==='r'){const R=row.opt===''||row.opt==null?DEFAULTR(row.el):+row.opt;if(!(R>0))return[];
    const up=cat.filter(o=>o.r!=null&&o.r>=R).sort((a,b)=>a.c-b.c)[0]||cat[0]||{c:0};
    return[{o:{id:'pin'+R,n:'Pinned R'+(R<1?R.toFixed(2):R.toFixed(1))+(row.opt===''||row.opt==null?' (2.1.2.13 default)':''),r:R,c:up.c,pin:1,dflt:row.opt===''||row.opt==null},fixed:1}]}
  return cat.map(o=>({o}))}
const zoneOf=S=>S.zone||(TA.find(t=>t[0]===S.ta)||[])[1]||null;
const rowsOk=S=>S.rows.filter(r=>+r.area>0);
function geom(S){const R=rowsOk(S),sum=el=>R.filter(r=>r.el===el).reduce((a,r)=>a+ +r.area,0);
  const wall=sum('wall'),glz=sum('glz'),door=sum('door'),gross=wall+glz+door;
  return{wall,glz,door,gross,roof:sum('roof'),slab:sum('slab'),susp:sum('susp'),glzPct:gross?glz/gross*100:0}}
function refLoss(S,tbl){const z=zoneOf(S);if(!z)return null;const g=geom(S),T=tbl||REFR(z);
  const parts=[['roof','Roof + skylights',g.roof,T.roof],['wall','Walls — 70% of gross wall area',g.gross*.7,T.wall],['glz','Glazing — 30% of gross wall area',g.gross*.3,T.glz],['slab','Slab-on-ground floor',g.slab,T.slab],['susp','Other floors',g.susp,T.susp]].filter(p=>p[2]>0);
  return{z,parts:parts.map(([k,n,a,r])=>({k,n,a,r,hl:a/r})),total:parts.reduce((s,p)=>s+p[2]/p[3],0)}}
function scope(S){const out=[],nh=+S.nonHousing||0;
  if(S.nonHousing!==''&&nh>300)out.push(['1.1.1.1 b)',nh+' m² of occupied space is not housing, over the 300 m² limit. Use H1/AS2 or H1/VM2 for those parts.']);
  if(S.q2==='yes')out.push(['1.1.2.2','H1/AS1 does not apply to buildings with curtain walling.']);
  if(S.q3==='yes')out.push(['1.1.2.1','H1/AS1 does not apply to buildings with foil insulation — anywhere in the building, not just in the elements being traded off here.']);return out}
function areaVerdict(S){if(S.totalArea===''||S.nonHousing==='')return{state:'open',text:'Enter both areas.'};
  const T=+S.totalArea,N=+S.nonHousing;
  if(N>T)return{state:'bad',text:'Non-housing area is larger than the total floor area — check the figures.'};
  if(N===0)return{state:'ok',text:'Housing only ('+T+' m²) — no area limit. H1/AS1 can be used (1.1.1.1 a)).'};
  if(N<=300)return{state:'ok',text:N+' m² not housing ≤ 300 m² — H1/AS1 can be used for it; the '+(T-N)+' m² of housing has no limit (1.1.1.1).'};
  return{state:'bad',text:N+' m² not housing > 300 m² — H1/AS1 cannot be used for the non-housing part (1.1.1.1 b)). Use H1/AS2 or H1/VM2.'}}
function needsPerim(row){if(row.el!=='roof')return false;return options(row).some(({o})=>{const x=resolve(row,o);return x.rp!=null})}
function ready(S){const why=[];if(!zoneOf(S))why.push('choose a Territorial Authority');
  if(S.totalArea===''||S.nonHousing==='')why.push('enter the total and non-housing floor areas');
  if(!S.q2||!S.q3)why.push('answer the curtain-walling and foil questions');
  if(!rowsOk(S).length)why.push('add at least one assembly with an area');
  rowsOk(S).forEach(r=>{if(needsPerim(r)&&!(+r.perim>0))why.push('enter the ceiling perimeter for “'+(r.name||'Roof')+'” (its insulation needs a perimeter part)')});
  return{ok:!why.length,why}}
/* every combination, ranked by cost. Auto lists only offer options that meet the minimums; a pinned or fixed option that misses one makes the run non-compliant. */
function run(S){const R=rowsOk(S),ref=refLoss(S),z=zoneOf(S);if(!ref||!R.length)return null;
  const lists=R.map(r=>{let L=options(r).filter(x=>x.fixed||!(x.o.t&&S.nope[x.o.t])).map(x=>Object.assign(resolve(r,x.o),{fixed:x.fixed}));
    return L.map(x=>Object.assign({},x,{checks:checksOf(r,x,z)})).filter(x=>x.fixed||x.checks.every(c=>c.ok))});
  if(lists.some(l=>!l.length))return{ref,R,all:[],best:null,empty:R.filter((r,i)=>!lists[i].length),z};
  const all=[];let best=null;const n=lists.reduce((a,l)=>a*l.length,1),cap=Math.min(n,200000),idx=lists.map(()=>0);
  for(let k=0;k<cap;k++){let hl=0,cost=0,minOk=true;const pick=lists.map((l,j)=>{const x=l[idx[j]];hl+=hlOf(R[j],x);cost+=(+R[j].area)*x.o.c;if(!x.checks.every(c=>c.ok))minOk=false;return x});
    const c={pick,hl,cost,margin:ref.total-hl,minOk};if(c.margin>=0&&minOk)all.push(c);if(!best||hl<best.hl)best=c;
    for(let j=0;j<idx.length;j++){if(++idx[j]<lists[j].length)break;idx[j]=0}}
  all.sort((a,b)=>a.cost-b.cost||b.margin-a.margin);
  return{ref,R,all,best,trunc:n>cap,z}}
/* everything one assessment shows, for the page and the PDF */
function assess(S,res,c){const R=res.R,z=res.z,g=geom(S),rows=[];
  R.forEach((r,j)=>{const x=c.pick[j];if(r.el==='roof'&&x.rp!=null){const a=roofAreas(r,x);
      rows.push({r,x,part:'field',el:'roof',name:r.name+' — field',area:a.af,R:x.r,hl:a.af/x.r,j});
      rows.push({r,x,part:'perimeter',el:'roof',name:r.name+' — perimeter '+x.W+' mm',area:a.ap,R:x.rp,hl:a.ap/x.rp,j})}
    else rows.push({r,x,part:null,el:r.el,name:r.name,area:+r.area,R:x.r,hl:+r.area/x.r,j})});
  const cat=k=>k==='door'?'wall':k;
  const groups=['roof','wall','glz','slab','susp'].map(k=>{const P=rows.filter(q=>cat(q.el)===k);const rf=res.ref.parts.find(p=>p.k===k);
    return P.length||rf?{k,label:{roof:'Roof',wall:'Walls (opaque, incl. doors)',glz:'Glazing',slab:'Slab-on-ground floor',susp:'Other floors'}[k],P,ref:rf||null,hl:P.reduce((a,q)=>a+q.hl,0),area:P.reduce((a,q)=>a+q.area,0)}:null}).filter(Boolean);
  const checks=[];R.forEach((r,j)=>c.pick[j].checks.forEach(k=>checks.push(Object.assign({name:r.name,el:r.el},k))));
  const hp=c.hl,hr=res.ref.total;
  return{rows,groups,checks,hp,hr,margin:hr-hp,pct:(hr-hp)/hr*100,pass:hp<=hr+1e-9&&checks.every(k=>k.ok),glz:{pct:g.glzPct,ok:g.glzPct<=40},g,z}}
const money=n=>'$'+Math.round(n).toLocaleString('en-NZ');
const f1=n=>(+n).toFixed(1),f2=n=>(+n).toFixed(2),rr=n=>n<1?(+n).toFixed(2):(+n).toFixed(2);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
window.H1=Object.assign(window.H1||{},{TA,REFR,REFOLD,MINR,HEATR,DEFAULTR,EL,HEATABLE,SHEET,NOPE,CAT,resolve,link,roofAreas,hlOf,checksOf,options,zoneOf,rowsOk,geom,refLoss,scope,areaVerdict,needsPerim,ready,run,assess,money,f1,f2,rr,esc,clearCache:()=>CACHE.clear()});
})();
