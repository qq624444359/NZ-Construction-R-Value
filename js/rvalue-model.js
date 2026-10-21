/*
 * R-value model for the configurator — data, construction templates and the
 * isothermal-planes calculation, H1/AS1 6th edition (NZS 4214 as modified by
 * 2.1.3.2). No DOM in this file: the page owns the layout, this owns the numbers.
 * Use it as-is; if a result looks wrong, say so rather than changing the arithmetic.
 *
 *   calc(construction) -> { total, rows:[{name,r,half,regions,shared,joined}], notes }
 *   construction: { el, kind, o:{ <option id>:bool }, name, v:{ <slot id>:{...} }, manualR, subR }
 *   tpl(construction) -> { el, kind, name, opts:[{id,label,on}], slots:[…], vented, ends, manual }
 *   newC("wall"|"roof"|"floor") -> a new construction with the default build-up
 *   toSection(construction) -> { fn, params, notDrawn } for the section drawing, or null when there is none
 *   toSheet(construction, list) -> everything one printed calculation sheet shows; basis() -> the assumptions
 *   edge(construction) -> truss roof: does the full insulation fit at the ceiling's outer edge (heel check), and the
 *     perimeter product (default Pink® Batts® Perimeter R2.7) used when it does not
 *   perimC(construction) -> the perimeter part as a construction of its own (H1/AS1 2.1.2.9), or null
 *   strategy(construction) -> truss roof: default insulation, stepped down by the room at the heel:
 *     1 two layers R3.6 · 2 R7.0 · 3 R7.0 + perimeter product · 4 R7.0 + compressed insulation (BRANZ slice method)
 *   (edge / perimC / perimR / perimRect are the earlier single-route versions, kept but no longer called)
 */
/* ---------- data: provisional defaults, every one editable in the UI ---------- */
const D={se:0.03,si:0.09,vent:0.08,roofSpace:0.11,kTimber:0.12,wallH:2400,plate:45,emptyGap:0.16,
  ventGap:25,purlin:45,topChord:90,wallDepth:90};   // eaves geometry: the same defaults eaves-section.js draws with
/* plasterboard: a product R, not thickness ÷ k */
const PBSRC="Convention value — to be confirmed with Winstone GIB data";
const PB=(n,mm,r,x)=>Object.assign({n,r,t:mm,pr:1},x||{});
const M=(n,r,x)=>Object.assign({n,r},x||{}), K=(n,mm,k,x)=>M(n,+(mm/1000/k).toFixed(3),Object.assign({t:mm,k},x||{}));
const LIB={
  cladding:[M('None (cladding is part of the insulation system)',0),M('None — faces outside air',0),
    M('None — faces still indoor air (garage, roof space)',0,{still:1}),
    K('Fibre cement 6 mm',6,.25),K('Fibre cement 7.5 mm',7.5,.25),K('Fibre cement 9 mm',9,.25),K('Fibre cement 14 mm',14,.25),
    K('Timber weatherboard 18 mm',18,.12),K('Plywood 9 mm',9,.13),K('Plywood 12 mm',12,.13),
    K('Brick veneer 70 mm',70,1.2),K('Brick veneer 90 mm',90,1.2),K('AAC panel 50 mm',50,.16),K('AAC panel 75 mm',75,.16),
    M('Metal sheet or aluminium weatherboard',0),K('Plaster / stucco 20 mm',20,.9),
    PB('Plasterboard 10 mm into still air (garage)',10,0.04,{still:1}),PB('Plasterboard 13 mm into still air (garage)',13,0.06,{still:1}),K('Vertical timber board 18 mm',18,.12),
    /* named products used by the House Guide: fibre cement k 0.25 as for the generic boards; thickness and R to be confirmed with the manufacturer */
    K('James Hardie Linea Weatherboard 16 mm',16,.25,{vsrc:'Value to be confirmed with the manufacturer'}),K('James Hardie Stria Cladding 14 mm',14,.25,{vsrc:'Value to be confirmed with the manufacturer'}),K('James Hardie Axon Panel 9 mm',9,.25,{vsrc:'Value to be confirmed with the manufacturer'}),
    K('James Hardie Oblique Weatherboard 14 mm',14,.25,{vsrc:'Value to be confirmed with the manufacturer'}),K('James Hardie HardieFlex sheet 6 mm',6,.25,{vsrc:'Value to be confirmed with the manufacturer'}),
    K('Clad Solutions Shera Weatherboard Cavity Cladding 7.5 mm',7.5,.25,{vsrc:'Value to be confirmed with the manufacturer'}),K('Clad Solutions Shera Shiplap Vertical Weatherboard 7.5 mm',7.5,.25,{vsrc:'Value to be confirmed with the manufacturer'}),
    /* profiles without their own data: same material and generic thickness, k as above */
    K('Timber bevelback weatherboard 18 mm',18,.12,{vsrc:'Value to be confirmed with the manufacturer'}),K('Fibre cement weatherboard horizontal 7.5 mm',7.5,.25,{vsrc:'Value to be confirmed with the manufacturer'}),
    K('Fibre cement vertical 7.5 mm',7.5,.25,{vsrc:'Value to be confirmed with the manufacturer'}),K('Fibre cement bevelback 7.5 mm',7.5,.25,{vsrc:'Value to be confirmed with the manufacturer'})],
  airBarrier:[M('None',0),M('Building paper / wrap',.01,{pliable:1}),K('Fibre cement RAB 6 mm',6,.25),K('Plywood 7 mm',7,.13),K('Plywood 9 mm',9,.13),
    K('Plywood 12 mm',12,.13),K('Plywood 21 mm',21,.13),PB('Plasterboard RAB 10 mm',10,0.04),PB('Plasterboard RAB 13 mm',13,0.06)],
  lining:[M('None',0),PB('Plasterboard 10 mm',10,0.04),PB('Plasterboard 13 mm',13,0.06),PB('Plasterboard 2 × 10 mm',20,0.08),PB('Plasterboard 2 × 13 mm',26,0.12),
    K('Plywood 9 mm',9,.13),K('Plywood 12 mm',12,.13),K('MDF 12 mm',12,.14),K('Fibre cement 6 mm',6,.25),K('T&G timber 12 mm',12,.12),K('T&G timber 19 mm',19,.12)],
  /* display order; saved projects store the id, so the order can change. Metal tile: no R of its own, like metal sheet */
  roofing:[M('Metal sheet (any profile)',0),K('Shingles on 15 mm plywood',15,.13),K('Membrane on 17 mm plywood',17,.13),M('Metal tile',0),
    M('Concrete or clay tiles',.02),M('None — faces an unconditioned indoor space',0,{still:1})],
  flooring:[K('Particleboard 20 mm',20,.12),K('Plywood 15 mm',15,.13),K('Plywood 19 mm',19,.13),K('T&G timber 19 mm',19,.12),K('T&G timber 25 mm',25,.12),M('None',0)],
  /* intertenancy wall, central board: plain plasterboard and fire-rated board only */
  itBoard:[PB('Plasterboard 10 mm',10,0.04),PB('Plasterboard 13 mm',13,0.06),PB('Plasterboard 15 mm',15,0.07),PB('Fire-rated plasterboard 13 mm',13,0.06),PB('Fire-rated plasterboard 16 mm',16,0.07)],
  floorLining:[M('None',0),K('Fibre cement 6 mm',6,.25),K('Plywood 9 mm',9,.13),PB('Plasterboard 10 mm',10,0.04),PB('Plasterboard 13 mm',13,0.06),PB('Plasterboard 2 × 13 mm',26,0.12),K('James Hardie fibre cement 6.5 mm',6.5,.25,{vsrc:'Value to be confirmed with the manufacturer'})],
  /* concrete block wall: generic block R-values (block only, no surface resistances); the designer can enter the manufacturer's own */
  block:[M('Concrete block 20 series (190 mm), all cells filled',0.14,{t:190,vsrc:'Generic value — confirm with the block manufacturer'}),
    M('Concrete block 20 series (190 mm), 1 in 3 cells filled',0.15,{t:190,vsrc:'Generic value — confirm with the block manufacturer'}),
    M('Concrete block 20 series (190 mm), 1 in 5 cells filled',0.16,{t:190,vsrc:'Generic value — confirm with the block manufacturer'}),
    M('Concrete block 20 series (190 mm), no cells filled',0.19,{t:190,vsrc:'Generic value — confirm with the block manufacturer'}),
    M('Concrete block 15 series (140 mm), all cells filled',0.12,{t:140,vsrc:'Generic value — confirm with the block manufacturer'}),
    M('Concrete block 15 series (140 mm), 1 in 3 cells filled',0.14,{t:140,vsrc:'Generic value — confirm with the block manufacturer'}),
    M('Concrete block 15 series (140 mm), 1 in 5 cells filled',0.15,{t:140,vsrc:'Generic value — confirm with the block manufacturer'}),
    M('Concrete block 15 series (140 mm), no cells filled',0.16,{t:140,vsrc:'Generic value — confirm with the block manufacturer'})],
  brk:[M('None',0)],
  gap:[M('None',0),M('Still air gap 12 mm, non-reflective',.15),M('Still air gap 20–90 mm, non-reflective',.16)]
};
LIB.ceiling=LIB.lining;
/* wall cladding as shown to the designer: category first, brand and product in brackets. Display only — n and the saved ids stay. [group, display] */
const CLAD_DN={
  'James Hardie Linea Weatherboard 16 mm':['fc','Weatherboard — horizontal (James Hardie Linea, 16 mm)'],'James Hardie Oblique Weatherboard 14 mm':['fc','Weatherboard — horizontal (James Hardie Oblique, 14 mm)'],
  'James Hardie Stria Cladding 14 mm':['fc','Weatherboard — horizontal (James Hardie Stria, 14 mm)'],'Clad Solutions Shera Weatherboard Cavity Cladding 7.5 mm':['fc','Weatherboard — horizontal (Clad Solutions Shera Weatherboard Cavity Cladding, 7.5 mm)'],
  'Fibre cement weatherboard horizontal 7.5 mm':['fc','Weatherboard — horizontal (generic, 7.5 mm)'],'Fibre cement bevelback 7.5 mm':['fc','Bevelback weatherboard (generic, 7.5 mm)'],
  'Clad Solutions Shera Shiplap Vertical Weatherboard 7.5 mm':['fc','Board — vertical (Clad Solutions Shera Shiplap Vertical, 7.5 mm)'],'Fibre cement vertical 7.5 mm':['fc','Board — vertical (generic, 7.5 mm)'],
  'James Hardie Axon Panel 9 mm':['fc','Sheet / panel (James Hardie Axon, 9 mm)'],'James Hardie HardieFlex sheet 6 mm':['fc','Sheet / panel (James Hardie HardieFlex, 6 mm)'],
  'Fibre cement 6 mm':['fc','Sheet / panel (generic, 6 mm)'],'Fibre cement 7.5 mm':['fc','Sheet / panel (generic, 7.5 mm)'],'Fibre cement 9 mm':['fc','Sheet / panel (generic, 9 mm)'],'Fibre cement 14 mm':['fc','Sheet / panel (generic, 14 mm)'],
  'Timber weatherboard 18 mm':['tb','Weatherboard — horizontal (generic, 18 mm)'],'Timber bevelback weatherboard 18 mm':['tb','Bevelback weatherboard (generic, 18 mm)'],'Vertical timber board 18 mm':['tb','Board — vertical (generic, 18 mm)'],
  'Plywood 9 mm':['tb','Sheet / panel (plywood, 9 mm)'],'Plywood 12 mm':['tb','Sheet / panel (plywood, 12 mm)'],
  'Brick veneer 70 mm':['br','Brick veneer (70 mm)'],'Brick veneer 90 mm':['br','Brick veneer (90 mm)'],'AAC panel 50 mm':['ot','AAC panel (50 mm)'],'AAC panel 75 mm':['ot','AAC panel (75 mm)'],
  'Metal sheet or aluminium weatherboard':['ot','Metal sheet or aluminium weatherboard'],'Plaster / stucco 20 mm':['ot','Plaster / stucco (20 mm)'],
  'Plasterboard 10 mm into still air (garage)':['ot','Plasterboard into still air — garage side (10 mm)'],'Plasterboard 13 mm into still air (garage)':['ot','Plasterboard into still air — garage side (13 mm)'],
  'None — faces still indoor air (garage, roof space)':['ot','None — faces still indoor air (garage, roof space)'],'None — faces outside air':['ot','None — faces outside air'],'None (cladding is part of the insulation system)':['ot','None (cladding is part of the insulation system)']};
/* brand for the second dropdown, read from the display name; products without one are Generic */
const CLAD_BR=['James Hardie','Clad Solutions'];
LIB.cladding.forEach(o=>{const d=CLAD_DN[o.n];if(d){o.grp=d[0];o.dn=d[1]}o.brand=CLAD_BR.find(b=>(o.dn||'').includes('('+b+' '))||'Generic';
  o.pn=(o.dn||o.n).replace('('+o.brand+' ','(').replace('(generic, ','(')});
/* ---------- saved projects store each choice by a fixed material id, not its place in the list ----------
   At run time c.v[slot].m (and a frame's .gap) stay list indices; toSaved / fromSaved translate on save and load,
   so adding, removing or reordering options never changes a saved project. Ids are fixed: never rename one. */
const slug=s=>s.toLowerCase().replace(/×/g,'x').replace(/[^a-z0-9.]+/g,'-').replace(/^-|-$/g,'');
Object.keys(LIB).forEach(k=>{if(k==='ceiling')return;LIB[k].forEach(o=>{if(!o.id)o.id=slug(o.n)})});
/* list orders before ids were saved (format 1). floorLining had no "Plasterboard 10 mm" until it was inserted at index 3. */
const LEGACY={floorLining:['None','Fibre cement 6 mm','Plywood 9 mm','Plasterboard 13 mm','Plasterboard 2 × 13 mm'],
  roofing:['Metal sheet (any profile)','None — faces an unconditioned indoor space','Concrete or clay tiles','Membrane on 17 mm plywood','Shingles on 15 mm plywood']};
const libOf=(n)=>n==='ceiling'?'lining':n;
function libSlots(c){let t;try{t=tpl(c)}catch(e){return[]}if(!t||t.manual)return[];const out=[];
  (t.slots||[]).forEach(s=>{if(s.k==='mat'&&s.lib)out.push([s.id,'m',libOf(s.lib)]);else if(s.k==='gap')out.push([s.id,'m','gap']);else if(s.k==='frame'&&s.gap)out.push([s.id,'gap','gap'])});return out}
function idAt(lib,i,legacy){const L=legacy&&LEGACY[lib];if(L){const nm=L[+i||0];const o=nm&&LIB[lib].find(x=>x.n===nm);return o?o.id:null}const o=LIB[lib][+i||0];return o?o.id:null}
function toSaved(list){return JSON.parse(JSON.stringify(list)).map(c=>{libSlots(c).forEach(([id,f,lib])=>{const v=c.v&&c.v[id];if(!v||v[f]==null||typeof v[f]==='string')return;
    if(v[f]===-1&&v.lm){v[f]='id:'+v.lm.id;delete v.lm;return}const k=idAt(lib,v[f]);if(k)v[f]='id:'+k});return c})}
function fromSaved(list,fmt){return fromSaved0(list,fmt).map(slabMig).map(ffMig).map(batMig).map(tbMig).map(gapMig)}
function tbMig(c){if(c&&c.v&&c.v.fr&&+c.v.fr.brkR>0&&((c.el==='wall'&&c.kind==='frame')||(c.el==='roof'&&c.kind==='skillion'))){c.o=c.o||{};c.o.tb=true}return c}
/* ceiling battens are always part of a flat-ceiling roof: roofs saved without them get the locked default, asked once */
function batMig(c){if(!c||c.el!=='roof'||!c.o||(c.kind!=='truss'&&c.kind!=='skillion'&&c.kind))return c;c.v=c.v||{};
  const st=c.v.st,oldDef=!st||(+st.d===35&&+st.w===70&&+st.s===400&&!+st.insR);   /* 35 × 70 @ 400 was the old unused default */
  if(c.o.below===false||(oldDef&&!(st&&st.s450))){c.v.st={d:35,w:70,s:450,s450:1};c.batMsg='Ceiling battens are now always included (70 × 35 @ 450 by default).'}
  if(c.v.st)delete c.v.st.lock;delete c.o.below;return c}
function fromSaved0(list,fmt){return(list||[]).map(c=>{if(c&&c.el==='roof'&&c.v&&c.v.fr&&c.v.fr.cover==null&&(!c.kind||c.kind==='truss'))c.v.fr.cover=true;libSlots(c).forEach(([id,f,lib])=>{const v=c.v&&c.v[id];if(!v||v[f]==null)return;
    let k=typeof v[f]==='string'&&v[f].startsWith('id:')?v[f].slice(3):(fmt>=2?null:idAt(lib,v[f],true));
    if(k==null&&typeof v[f]==='number')k=idAt(lib,v[f]);const i=LIB[lib].findIndex(o=>o.id===k);
    /* a saved choice that is no longer in this slot's list (an intertenancy wall saved with a cladding entry) is kept as it was */
    if(i<0&&k){const lm=Object.keys(LIB).map(n=>LIB[n].find(o=>o.id===k)).find(Boolean);if(lm){v.lm=Object.assign({},lm);v[f]=-1;return}}v[f]=i<0?0:i});return c})}
const PROD={stud:[[2.2,90],[2.4,90],[2.6,90],[2.8,90],[3.2,140],[3.6,140],[4.0,140],[4.3,140]],
  chord:[[1.8,95],[2.2,115],[2.6,110],[2.6,140],[3.0,160],[3.2,170],[3.6,180]],
  rafter:[[2.6,110],[3.0,160],[3.2,170],[3.6,180]],joist:[[1.8,95],[2.6,110],[3.2,170],[3.6,180]],batten:[]};
const MEMBER={stud:{d:90,w:45,s:600,dw:800,name:'Studs'},chord:{d:90,w:45,s:900,name:'Truss bottom chords'},rafter:{d:190,w:45,s:600,name:'Rafters'},
  joist:{d:190,w:45,s:400,name:'Joists'},batten:{d:35,w:45,s:600,name:'Battens'}};

/* ---------- templates: every construction type is the same grammar of slots ---------- */
const mat=(id,label,lib,x)=>Object.assign({k:'mat',id,label,lib},x||{}), ins=(id,label,x)=>Object.assign({k:'ins',id,label},x||{}),
  fix=(id,label,r)=>({k:'fix',id,label,r}), gap=(id,label)=>({k:'gap',id,label}),
  fr=(id,label,member,x)=>Object.assign({k:'frame',id,label,member},x||{});
const CL=mat('clad','Cladding','cladding',{ext:1}),AB=mat('ab','Air barrier','airBarrier'),LIN=mat('lin','Wall lining','lining'),
  ST=fr('st','Internal strapping','batten',{ins:1}),RF=mat('roof','Roofing','roofing'),CE=mat('ceil','Ceiling lining','ceiling'),
  FL=mat('floor','Flooring','flooring'),FLL=mat('flin','Lining under joists','floorLining');
const CB=fr('st','Ceiling battens','batten',{ins:1});
const WF=x=>fr('fr','Timber frame and cavity','stud',Object.assign({gap:1},x||{}));
const TR=x=>fr('fr','Truss bottom chord and ceiling insulation','chord',Object.assign({cover:1},x||{}));
/* skillion: a vented cavity over the insulation unless the roofing is insulated — R0.08 on the cavity side of the bridged portion (2.1.3.2 i)) */
const RA=(vent,brk)=>fr('fr','Rafters and insulation','rafter',vent?{brk,cavGap:D.vent,cavLabel:'Vented cavity over the insulation'}:{gap:1,brk}), JO=x=>fr('fr','Joists and insulation','joist',x);
/* A construction is { el, kind, o:{ticked options}, v:{slot values} }. tpl(c) builds its slots from
   the kind and the options, so there is one entry per kind and not one per combination.
   opts: [id, label, on by default] */
const KINDS={
 wall:[
  {id:'frame',name:'Timber frame',opts:[['cav','Vented cavity',1],['strap','Internal strapping'],['tb','Thermal break on the framing'],['cins','Insulated cladding'],['xins','External insulation']]},
  {id:'double',name:'Timber-framed double stud wall',opts:[]},
  {id:'it',name:'Timber-framed intertenancy wall',opts:[]},
  {id:'block',name:'Concrete block wall',opts:[['strap','Internal strapping',1]]},
  {id:'custom',name:'Custom — enter the R-value',opts:[],manual:1},{id:'exist',name:'Existing wall (addition or alteration)',opts:[],manual:1}],
 roof:[
  {id:'truss',name:'Timber truss roof, flat ceiling',opts:[['susp','Suspended ceiling']]},
  {id:'skillion',name:'Timber skillion or flat roof',opts:[['susp','Suspended ceiling'],['iroof','Insulated roofing, no vent cavity'],['tb','Thermal break over the rafters']]},
  {id:'grid',name:'Any roof, insulation on a suspended grid',opts:[]},
  {id:'self',name:'Self-supporting insulated roof',opts:[]},
  {id:'custom',name:'Custom — enter the R-value',opts:[],manual:1},{id:'exist',name:'Existing roof (addition or alteration)',opts:[],manual:1}],
 floor:[
  {id:'susp',name:'Suspended timber floor',opts:[['lined','Lining under the joists',1],['float','Floating flooring'],['under','Insulation under the joists'],['ugar','Underside faces an unconditioned indoor space (garage)']]},
  {id:'solid',name:'Solid timber floor',opts:[]},
  {id:'slab',name:'Concrete slab-on-ground (H1/AS1 Appendix E)',opts:[],manual:1,slab:1},
  {id:'custom',name:'Custom — enter the R-value',opts:[],manual:1},{id:'exist',name:'Existing floor (addition or alteration)',opts:[],manual:1}]
};
function tpl(c){
  const K=KINDS[c.el].find(k=>k.id===c.kind)||KINDS[c.el][0],o=c.o||{};
  const on=id=>{const d=K.opts.find(x=>x[0]===id);return d?(o[id]!=null?!!o[id]:!!d[2]):false};
  const t={el:c.el,kind:K.id,name:K.name+K.opts.filter(x=>on(x[0])).map(x=>', '+x[1].toLowerCase()).join(''),
    opts:K.opts.map(x=>({id:x[0],label:x[1],on:on(x[0])}))};
  if(K.manual){t.manual=1;if(K.slab)t.slab=1;return t}
  let s;
  if(K.id==='frame'){t.vented=on('cav')?1:0;
    s=[CL,on('cins')&&ins('cins','Cladding insulation',{ext:t.vented}),t.vented&&fix('vcav','Vented cavity',D.vent),AB,on('xins')&&ins('xins','External insulation'),
       WF({brk:on('tb')?1:0}),on('strap')&&ST,LIN]}
  else if(K.id==='double')s=[CL,AB,WF(),gap('mid','Gap between frames'),fr('fr2','Second frame and cavity','stud',{gap:1}),LIN];
  else if(K.id==='it'){t.ends=['si','si'];s=[mat('lin0','Lining, first side','lining'),WF(),mat('clad','Central lining','itBoard'),fr('fr2','Second frame and cavity','stud',{gap:1}),LIN]}
  else if(K.id==='block')s=[mat('blk','Concrete block','block'),on('strap')&&ST,LIN];
  else if(K.id==='truss'){const p=c.part==='perimeter';   // the perimeter part of the same roof: the perimeter product only, no roof space counted
    s=[RF,!p&&fix('rspace','Roof space',D.roofSpace),!p&&!(c.fkey&&c.fkey!=='own'&&!+OV(c).r)&&ins('over','Insulation over the framing',{opt:1}),TR(),CB,on('susp')&&fix('agap','Air gap 50–200 mm',.15),CE]}
  else if(K.id==='skillion'){t.vented=on('iroof')?0:1;s=[t.vented?mat('roof','Roofing','roofing',{ext:1}):RF,on('iroof')&&ins('over','Roofing insulation'),on('iroof')&&mat('sark','Sarking','ceiling'),RA(t.vented,on('tb')?1:0),CB,on('susp')&&fix('rspace','Roof space',.18),CE]}
  else if(K.id==='grid')s=[RF,fix('gridgap','Air gap and framing',.08),ins('over','Insulation'),CE];
  else if(K.id==='self')s=[RF,ins('over','Insulation')];
  else if(K.id==='susp'){const l=on('lined'),f=on('float'),u=on('under'),g=on('ugar');t.ends=(l||u)&&g?['si','si']:(l&&!u)?['si','se']:['si','sub'];if((l||u)&&g)t.endName='Underside surface, still air (garage — 2.1.3.4)';
    s=[FL,f&&fr('st','Flooring battens','batten',{ins:1}),f&&gap('mid','Gap under floating floor'),f&&mat('floor2','Structural flooring','flooring'),
       JO((l||u)?{cavGap:.20}:{}),u&&ins('under','Insulation under joists'),(l||u)&&FLL]}
  else{t.ends=['si','sub'];s=[FL,fix('solid','Solid timber 94 mm',.78)]}
  t.slots=s.filter(Boolean);return t;
}
/* What a new construction starts as: the build-ups this practice draws most. */
const DEFAULTS={
 wall:{kind:'frame',name:'Wall – 90@600',v:{clad:{m:5},ab:{m:1},fr:{d:90,w:45,s:600,dw:800,insR:2.8,insT:90,prod:'Pink® Batts®'},lin:{m:1}}},
 roof:{kind:'truss',name:'Roof – truss',v:{roof:{m:0},over:{on:false,r:3.6,t:180,prod:'Pink® Batts® Ceiling'},fr:{d:90,w:45,s:900,insR:3.6,insT:180,cover:false,prod:'Pink® Batts® Ceiling'},st:{d:35,w:70,s:450,s450:1},ceil:{m:1},
   edge:{pitch:20,heel:null,width:500,fsel:'auto',psel:'auto',pprod:'Pink® Batts® Perimeter',pR:2.7,pT:100,pW:560,cpName:'Pink® Superbatts®',cpR:7.0,cpT:275,n:0.24,rOver:null,area:null,perim:null}}},
 floor:{kind:'susp',name:'Floor – 240@400',v:{floor:{m:0},fr:{d:240,w:45,s:400,insR:3.6,insT:180,prod:'Pink® Batts®'},flin:{m:3}}}};
const newC=el=>JSON.parse(JSON.stringify(Object.assign({el,o:{}},DEFAULTS[el])));
const LATER={wall:['Steel frame','Masonry veneer on steel','Double brick','Solid concrete','ICF blocks','Pre-insulated blocks or panels','Solid timber','AAC double layer'],
 roof:['Steel truss','Steel skillion','Concrete'],
 floor:['Steel joists','Concrete joists and suspended concrete']};
const EL={roof:{name:'Roofs',min:2.6},wall:{name:'Walls',min:1.0},floor:{name:'Floors (not slab)',min:1.3}};

const val=(c,id)=>(c.v[id]=c.v[id]||{});
/* truss roofs: the layer over the framing counts only when ticked. Saved before the tick box: on when it has an R. */
const ovOn=v=>!!v&&(v.on!=null?!!v.on:+v.r>0);
const OV=c=>{const v=c&&c.v&&c.v.over;return ovOn(v)?v:{}};
/* a framing layer on its own — its members and what lies between them, parallel paths, before 2.1.3.2 joins it to its neighbours.
   Display only: the construction R always uses the joined bridged portion. */
function layerR(c,slot){const v=c.v[slot.id]||{},d=MEMBER[slot.member],depth=+v.d||d.d,F=frac(slot,v,c);let insR=+v.insR||0,above=0;const insT=+v.insT||0;
  if(slot.cover&&v.cover&&insT>depth&&insR){above=insR*(insT-depth)/insT;insR-=above}
  let cav=insR+(slot.gap?LIB.gap[gapIdx(slot,v)].r:0)+(slot.cavGap||0);if(cav<=0)cav=D.emptyGap;const tr=depth/1000/D.kTimber+(slot.brk&&+v.brkR||0);
  return 1/(F.f/tr+(1-F.f)/cav)+above}
/* slab-on-ground: every number from window.SlabAppE (slab-appendix-e.js). Area = the construction's area (entered on the Project page). */
const SLABU={none:[null,null],s12:['strip',1.2],s24:['strip',2.4],f12:['full',1.2],f24:['full',2.4]};
/* the reason a slab has no R, with the next step */
function slabMsg(L){if(!L||L.ok)return'';if(L.ap!=null&&L.ap<=0)return'Check the wall thickness and the area / perimeter — A/P can’t be below zero';if(/below 0\.6/.test(L.why||'')&&L.ap!=null)return'A/P '+(+L.ap).toFixed(2)+' is below the Appendix E tables — tick “R-value calculated to H1/VM1 Appendix E” and enter the calculated value';return L.why||'R not determined'}
/* the old separate "wall thickness w" box (Eq E.2): a value over 1 was typed in mm, 1 or less in m — it becomes the effective wall thickness in mm */
function slabMig(c){const s=c&&c.v&&c.v.slab;if(!s||s.sW==null||s.sW==='')return c;const w=+s.sW;if(w>0&&(s.sT==null||s.sT===''))s.sT=w>1?w:Math.round(w*1000);delete s.sW;return c}
function slabLookup(c){const X=(typeof window!=='undefined'?window:globalThis).SlabAppE,s=c.v.slab||{},A=+c.area||0,P=+s.sP||0;
  const fin=L=>{if(L.ok)L.Rtxt=L.mixed?L.R.toFixed(2):L.R.toFixed(1);return L};
  /* E.1.1.1 b): a value calculated to H1/VM1 Appendix E (e.g. by the slab system's manufacturer) instead of the tables */
  if(s.vm1){const R=+s.vmR;return fin(R>0?{ok:true,vm1:true,R,src:s.vmSrc||'',A,P}:{ok:false,vm1:true,none:true,why:'Enter the R-value calculated to H1/VM1 Appendix E.'})}
  if(!X)return{ok:false,why:'Appendix E tables not loaded.'};if(!A)return{ok:false,none:true,why:'Enter this slab’s area on the Project page.'};if(!P)return{ok:false,none:true,why:'Enter this slab’s perimeter on the Project page.'};
  slabMig(c);const ext=s.sM==='ext',wt=s.sT==null||s.sT===''?100:+s.sT;
  /* Eq E.2: w is the effective wall thickness, entered in mm */
  const ap=ext?X.apExternal(A,P,wt/1000):X.apInternal(A,P);if(ap<=0)return{ok:false,ap,eq:ext?'E.2':'E.1',why:'Check the wall thickness and the area / perimeter — A/P can’t be below zero.'};
  const fl=s.sF||'slab',u=SLABU[s.sU||'none']||SLABU.none,eq=ext?'E.2':'E.1';
  if(fl==='raft'&&u[0])return{ok:false,ap,eq,why:'Underslab insulation applies to slab floors only — no Appendix E table for a raft with underslab insulation.'};
  const look=(edge,wall)=>X.lookup({floor:fl,edge:edge==='r10',under:u[0],underR:u[1],wall:wall||'other'},ap,wt);
  /* perimeter parts (Equations E.3–E.5): extra parts with their own edge insulation / wall; the rest of the perimeter takes the main settings */
  const extra=(s.parts||[]).filter(x=>+x.len>0),used=extra.reduce((a,x)=>a+ +x.len,0),rest=P-used;
  if(rest<-1e-9)return{ok:false,ap,eq,why:'The perimeter parts add up to '+used.toFixed(2)+' m, more than the perimeter '+P.toFixed(2)+' m.'};
  const segs=[{len:rest,sE:s.sE,sWall:s.sWall,rest:1}].concat(extra.map(x=>Object.assign({},x,{len:+x.len}))).filter(x=>x.len>1e-9).map(x=>Object.assign({},x,{L:look(x.sE,x.sWall)}));
  const bad=segs.find(x=>!x.L.ok);if(bad)return Object.assign({ap,eq},bad.L);
  if(segs.length===1)return fin(Object.assign({ap,eq,A,P},segs[0].L));
  const R=X.mix(segs.map(x=>({f:x.len/P,R:x.L.R})));
  return fin({ok:true,mixed:true,R,ap,eq,A,P,segs:segs.map(x=>({len:x.len,rest:!!x.rest,name:x.name||'',edge:x.sE==='r10',wall:x.sWall||'other',table:x.L.table,title:x.L.title,apRow:x.L.apRow,band:x.L.band,R:x.L.R}))})}

/* ---------- engine: isothermal planes ---------- */
function matR(slot,v){const m=v.m===-1&&v.lm?v.lm:LIB[slot.lib][v.m||0]||LIB[slot.lib][0];return{m,r:v.r!=null?+v.r:m.r,over:v.r!=null}}
/* wall studs: the air left in the stud space when the insulation is thinner than the stud. Automatic unless the designer unlocked it.
   Values: the non-reflective still-air gaps of LIB.gap (12 mm R0.15; 20–90 mm R0.16); under 12 mm not counted. gapMan undefined = a construction not yet migrated, as saved. */
const gapMM=(slot,v)=>{const d=MEMBER[slot.member],depth=+v.d||d.d,t=+v.insT||0;return t>0&&t<depth?depth-t:0};
const gapAuto=(slot,v)=>{const g=gapMM(slot,v);return g>=20?2:g>=12?1:0};
const GAPM=['stud','joist'],gapIdx=(slot,v)=>GAPM.includes(slot.member)&&slot.gap&&v.gapMan===false?gapAuto(slot,v):(+v.gap||0);
function gapMig(c){if(!c||(c.el!=='wall'&&c.el!=='floor')||!c.v)return c;let t;try{t=tpl(c)}catch(e){return c}if(t.manual)return c;
  (t.slots||[]).filter(s=>s.k==='frame'&&GAPM.includes(s.member)&&s.gap).forEach(s=>{const v=c.v[s.id];if(!v||v.gapMan!==undefined)return;v.gapMan=(+v.gap||0)!==gapAuto(s,v)});return c}
const FFEV='Evidence required for a framing fraction below 38%';
/* the wall framing-fraction line printed under the sheet */
function ffLines(c){const t=tpl(c);if(t.manual||c.el!=='wall')return[];return(t.slots||[]).filter(s=>s.member==='stud').map(s=>{const v=c.v[s.id]||{},F=frac(s,v,c),p=(F.f*100).toFixed(1).replace(/\.0$/,'')+'%',pre=t.slots.filter(z=>z.member==='stud').length>1?s.label+': ':'';
  return F.dem?{ok:F.f>=.38-1e-9||!!String(v.ev||'').trim(),text:pre+'Framing fraction '+p+' — demonstrated for this building: '+(String(v.ev||'').trim()||'no evidence entered')}:{ok:true,text:pre+'Framing fraction '+p+' — '+(v.mode&&v.mode!=='std'?F.how:'H1/AS1 2.1.3.1 a) i) default')}})}
/* saved walls framed by another method: a demonstrated fraction with the same value, evidence empty — asked once */
function ffMig(c){if(!c||c.el!=='wall'||!c.v)return c;let t;try{t=tpl(c)}catch(e){return c}if(t.manual)return c;
  (t.slots||[]).filter(s=>s.member==='stud').forEach(s=>{const v=c.v[s.id];if(!v||!v.mode||v.mode==='std'||v.mode==='dem')return;
    if(v.mode==='pct'&&v.p38){v.mode='std';delete v.pct;delete v.p38;return}
    const F=frac(s,v,c),was={pct:'an entered percentage',geom:'the stud and dwang layout',wc:'stud width ÷ centres'}[v.mode]||'another method';
    v.mode='dem';v.pct=F.f*100;v.ev=v.ev||'';c.ffMsg='Framing fraction method changed: this wall used '+was+' ('+(F.f*100).toFixed(1)+'%). Choose the 38% default or add evidence.'});return c}
function frac(slot,v,c){
  const d=MEMBER[slot.member],w=+v.w||d.w,s=+v.s||d.s,isWall=slot.member==='stud';
  const mode=v.mode||'std';
  /* walls (2.1.3.1 a) i)): 38% unless a lower fraction is demonstrated for the building */
  if(isWall&&mode==='dem')return{f:(+v.pct||0)/100,how:'demonstrated for this building',dem:1};
  if(mode==='pct')return{f:(+v.pct||0)/100,how:'entered'};
  if(isWall&&mode==='std')return{f:.38,how:'H1/AS1 default'};
  if(isWall&&mode==='wc')return{f:w/s,how:w+' ÷ '+s};
  if(!isWall)return{f:w/s,how:w+' ÷ '+s};
  const dw=v.dw!=null?+v.dw:d.dw,rows=dw>0?Math.max(0,Math.round(D.wallH/dw)-1):0;
  return{f:1-(1-w/s)*(1-(2+rows)*D.plate/D.wallH),how:'studs, 2 plates, '+rows+' dwang rows in 2.4 m'};
}
/* an insulation layer whose R per mm is above 0.05 (conductivity below 0.02 W/m·K) is not a real loose or blanket product */
function phys(c){const t=tpl(c);if(t.manual)return[];const out=[];(t.slots||[]).forEach(s=>{const v=c.v[s.id]||{};let r=0,th=0;
  if(s.k==='ins'){if(s.opt&&!ovOn(v))return;r=+v.r||0;th=+v.t||0}else if(s.k==='frame'){r=+v.insR||0;th=+v.insT||0}
  if(r>0&&th>0&&r/th>0.05)out.push({slot:s.id,label:s.label,R:r,T:th,msg:'R'+r.toFixed(1)+' in '+th+' mm is not physically possible — check the R-value and thickness'})});return out}
function calc(c,opt){
  if(isStrat(c))return calc(strategy(c).ce,opt);
  const t=tpl(c),notes=[];
  if(t.slab){const L=slabLookup(c);return{total:L.ok?L.R:0,rows:[],notes,manual:1,slab:L}}
  if(t.manual)return{total:+c.manualR||0,rows:[],notes,manual:1};
  const ends=t.ends||['se','si'],el=[];let still=false;
  t.slots.forEach((slot,i)=>{
    const v=val(c,slot.id||('x'+i)),half=t.vented&&slot.ext;
    if(slot.k==='mat'){const x=matR(slot,v);if(x.m.still&&i===0)still=true;el.push({i,kind:'mat',pr:!x.over&&!!x.m.pr,vsrc:x.over?null:x.m.vsrc||null,none:/^None/.test(x.m.n),pliable:!!x.m.pliable,slot:slot.id,label:slot.label,mat:(x.m.dn||x.m.n)+(x.over?' (R entered)':''),t:x.over?null:x.m.t,k:x.over?null:x.m.k,over:x.over,raw:x.r,name:slot.label+': '+x.m.n,r:x.r*(half?.5:1),half})}
    else if(slot.k==='ins'){if(slot.opt&&!ovOn(v))return;el.push({i,kind:'ins',slot:slot.id,label:slot.label,mat:(v.prod?v.prod+' ':'Insulation ')+'R'+(+v.r||0).toFixed(1),t:+v.t||null,raw:+v.r||0,name:slot.label,r:(+v.r||0)*(half?.5:1),half})}
    else if(slot.k==='fix')el.push({i,kind:'air',slot:slot.id,label:slot.label,mat:'',raw:v.r!=null?+v.r:slot.r,name:slot.label,r:v.r!=null?+v.r:slot.r});
    else if(slot.k==='gap')el.push({i,kind:'air',slot:slot.id,label:slot.label,mat:LIB.gap[v.m||0].n,raw:LIB.gap[v.m||0].r,name:slot.label,r:LIB.gap[v.m||0].r});
    else{
      const d=MEMBER[slot.member],depth=+v.d||d.d,F=frac(slot,v,c);
      let insR=+v.insR||0,above=0;const insT=+v.insT||0;
      if(slot.cover&&v.cover&&insT>depth&&insR){above=insR*(insT-depth)/insT;insR-=above}
      const g=slot.gap?LIB.gap[gapIdx(slot,v)].r:0,cg=slot.cavGap||0;let cav=insR+g+cg;
      if(cav<=0){cav=D.emptyGap;if(slot.member!=='batten')notes.push(slot.label+': empty cavity taken as a still air gap, R'+D.emptyGap.toFixed(2)+'.')}
      const shared=above,w=+v.w||d.w,sp=+v.s||d.s,tr=depth/1000/D.kTimber;
      const fp=[{name:d.name+' '+depth+' × '+w+' mm timber',r:tr}];if(slot.brk&&+v.brkR)fp.push({name:'Thermal break strip',r:+v.brkR});
      const cp=[];if(insR)cp.push({name:'Insulation R'+(+v.insR).toFixed(1)+(insT?', '+insT+' mm':'')+(above?' — '+depth+' mm of it between the framing':''),r:insR});
      if(g)cp.push({name:LIB.gap[gapIdx(slot,v)].n+(GAPM.includes(slot.member)&&v.gapMan===false?' ('+gapMM(slot,v)+' mm, stud − insulation)':''),r:g});if(cg)cp.push({name:slot.cavLabel||'Air gap in the joist space',r:cg});if(!cp.length)cp.push({name:slot.member==='batten'?'Still air between the battens':'Empty cavity, still air',r:cav});
      const sh=[];
      if(above)sh.push({name:'Cavity insulation above the framing, '+(insT-depth)+' mm of its '+insT+' mm',r:above});
      el.push({i,kind:'frame',slot:slot.id,label:slot.label,name:slot.label,shared,how:F.how,f:F.f,slots:[i],sharedParts:sh,
        insul:+v.insR?'R'+(+v.insR).toFixed(1)+(insT?' / '+insT+' mm':''):'',t:depth,raw:+v.insR||null,
        mat:+v.insR?(v.prod?v.prod+' ':'Insulation ')+'R'+(+v.insR).toFixed(1)+(insT?' · '+insT+' mm':'')+' between '+d.name.toLowerCase():d.name+', still air between',
        members:[{name:d.name,depth,width:w,centres:sp,dwangs:slot.member==='stud'?(v.dw!=null?+v.dw:d.dw):null,fraction:F.f,basis:F.how}],
        regions:[{name:d.name,f:F.f,r:tr+(slot.brk&&+v.brkR||0),parts:fp},{name:'Cavity',f:1-F.f,r:cav,parts:cp}]});
      if(slot.member==='stud'&&F.f<.38-1e-9&&!String(v.ev||'').trim())notes.push(FFEV+' ('+slot.label+': '+(F.f*100).toFixed(1)+'%).');
    }
  });
  // H1/AS1 2.1.3.2 — where the bridged portion starts and ends.
  let seq=el.filter(e=>e.kind==='frame'||(e.kind==='mat'?!e.none:e.r>0));
  const isF=x=>x&&x.kind==='frame',soft=x=>x&&(x.kind==='ins'||x.kind==='air'),tag=h=>h.name+(h.kind==='air'&&h.mat?': '+h.mat:'');
  // "Where multiple bridged layers are immediately adjacent, they shall all be included in the bridged portion."
  for(let k=0;!(opt&&opt.noMerge)&&k<seq.length-1;k++){const a=seq[k],b=seq[k+1];if(!isF(a)||!isF(b))continue;
    const regions=[];a.regions.forEach(x=>b.regions.forEach(y=>regions.push({name:x.name+' × '+y.name,f:x.f*y.f,r:x.r+y.r,parts:x.parts.concat(y.parts)})));
    seq.splice(k,2,{i:a.i,kind:'frame',label:a.label,name:a.name+' + '+b.name,shared:a.shared+b.shared,regions,
      slots:a.slots.concat(b.slots),sharedParts:a.sharedParts.concat(b.sharedParts),members:a.members.concat(b.members)});k--}
  // On each side the portion ends at the next homogeneous layer, except: (i) an insulation material or air cavity is
  // included; (ii) a layer between two bridged layers goes half to each; (iii) a pliable membrane is passed over.
  seq.forEach((p,k)=>{if(!isF(p))return;[-1,1].forEach(side=>{
    let j=k+side;while(seq[j]&&seq[j].pliable)j+=side;const h=seq[j];if(!h||isF(h))return;
    let j2=j+side;while(seq[j2]&&seq[j2].pliable)j2+=side;
    const between=isF(seq[j2]),share=between?.5:soft(h)&&!(h.slot==='rspace'&&t.kind==='truss')?1:0;   /* the roof space above the chords is its own layer */if(!share||h.gone===true)return;
    p.shared+=h.r*share;p.slots.push(h.i);p.sharedParts[side<0?'unshift':'push']({name:tag(h)+(between?' (half)':''),r:h.r*share});
    h.gone=between?(h.gone==='half'?true:'half'):true})});
  seq=seq.filter(e=>e.gone!==true);
  const rows=[{name:(still?'Surface, still air':ends[0]==='si'?'Inside surface':'Outside surface'),r:(still||ends[0]==='si'?D.si:D.se)*(t.vented&&!still?.5:1),half:t.vented&&!still}];
  seq.forEach(e=>{
    if(e.kind==='frame'){let g=0;e.regions.forEach(x=>g+=x.f/(x.r+e.shared));rows.push(Object.assign({},e,{r:1/g}))}
    else rows.push(e)});
  if(ends[1]==='sub')rows.push({name:'Subfloor space',r:+c.subR||0});
  else rows.push({name:t.endName||(ends[1]==='si'?'Inside surface':'Outside surface'),r:D[ends[1]]});
  const total=rows.reduce((a,x)=>a+x.r,0);
  return{total,rows,notes,slots:el};
}

/* ---------- drawing: the inputs for wallSection / eavesSection / floorSection ---------- */
function toSection(c){
  if(isStrat(c))return toSection(strategy(c).ce);
  const t=tpl(c),o=id=>!!(t.opts.find(x=>x.id===id)||{}).on,v=id=>c.v[id]||{},notDrawn=[];
  const nums=map=>{const n={};(t.slots||[]).forEach((s,i)=>{if(map[s.id])n[map[s.id]]=i+1});return n};
  const mat=(lib,id)=>LIB[lib][v(id).m||0]||LIB[lib][0],fr=v('fr');
  const insul=(x,depth)=>+x.insR?{label:'R'+(+x.insR).toFixed(1)+' · '+(+x.insT||depth)+' mm',thickness:+x.insT||depth}:null;
  if(c.el==='wall'&&c.kind==='frame'){
    const cl=mat('cladding','clad'),ab=mat('airBarrier','ab'),li=mat('lining','lin'),d=+fr.d||90;
    ['strap','tb','cins','xins'].forEach(id=>{if(o(id))notDrawn.push(t.opts.find(x=>x.id===id).label)});
    return{fn:'wallSection',notDrawn,params:{labels:true,numbers:nums({clad:'cladding',vcav:'cavity',ab:'barrier',fr:'insulation',lin:'lining'}),
      cladding:/vertical/i.test(cl.n)?{type:'vertical',thickness:cl.t||18,label:cl.n}:/weatherboard/i.test(cl.n)?{type:'bevel',thickness:19,cover:160,lap:30,label:cl.n+' (drawn horizontal — bevel-back)'}:{type:'sheet',thickness:cl.t||9,label:cl.n},
      cavity:t.vented?{depth:20}:null,barrier:ab.t?{type:'rigid',thickness:ab.t,label:ab.n}:{type:'wrap',label:ab.n},
      stud:{width:+fr.w||45,depth:d},spacing:+fr.s||600,nogs:fr.dw!=null?(+fr.dw||null):800,lining:li.t||10,liningLabel:li.n,insulation:insul(fr,d)}};
  }
  if(c.el==='roof'&&(c.kind==='truss'||c.kind==='skillion')){
    const peri=c.part==='perimeter'&&!!c.field;
    const st=v('st'),ce=mat('ceiling','ceil'),truss=c.kind==='truss',list=[];
    const fc=peri?c.field:c,S2=fc.st,ed=c.v.edge||{},sp=!!(S2&&S2.per!=='none');
    const fv=id=>fc.v[id]||{},ffr=fv('fr'),ov=OV(fc),d=+ffr.d||(truss?90:190);
    const fno={};(tpl(fc).slots||[]).forEach((x,i)=>{fno[x.id]=i+1});
    const b=insul(ffr,d);if(b)list.push(Object.assign({layer:'between'},b));
    if(truss&&+ov.r)list.push({layer:'over',label:'R'+(+ov.r).toFixed(1)+(ov.t?' · '+ov.t+' mm':''),thickness:+ov.t||Math.round(+ov.r*40/5)*5});
    ['susp','iroof'].forEach(id=>{if(o(id))notDrawn.push(t.opts.find(x=>x.id===id).label)});
    const rme=LIB.roofing[(v('roof').m)||0]||LIB.roofing[0],rm=rme.n,shg=/shingle/i.test(rm),mem=/membrane/i.test(rm);
    if(/tile/i.test(rm))return{fn:null,na:'Section not available for this roofing yet',notDrawn};
    return{fn:'eavesSection',notDrawn,params:{labels:true,roofing:mem?'membrane':shg?'shingle':'longrun',ply:shg||mem?(rme.t||15):undefined,noBattens:false,numbers:peri?{roofing:fno.roof,'insulation-perimeter':'P1',battens:fno.st,lining:fno.ceil}:Object.assign(nums({roof:'roofing',rspace:'roofspace',over:'insulation-over',fr:'insulation-between',st:'battens',ceil:'lining'}),sp?{'insulation-perimeter':'P1'}:{}),zone:sp?(peri?'perimeter':'field'):null,structure:truss?'truss':'rafter',rafter:{depth:d},bottomChord:{depth:d},
      battens:{width:+st.w||70,depth:+st.d||35,spacing:+st.s||600},battenCavity:+st.insR?{label:'R'+(+st.insR).toFixed(1),thickness:+st.insT||+st.d||35}:null,
      lining:ce.t||10,chordCovered:!!ffr.cover,insulation:list,perimeter:sp,pitch:+ed.pitch||20,
      heelHeight:truss&&ed.heel!=null&&ed.heel!==''?+ed.heel:null,
      clash:(()=>{if(!S2||S2.per!=='none')return null;const T=thk(S2.field),G=S2.G;return T+D.ventGap>G.H+1e-6?{need:T+D.ventGap,room:G.H}:null})(),stripWidth:+ed.width||500,
      perimProduct:!sp?null:S2.per==='product'?{kind:'product',thickness:S2.pp.T,width:S2.pp.W,label:S2.pp.name+' R'+S2.pp.R.toFixed(1)}:
        {kind:'comp',thickness:S2.cp.T,label:'Compressed '+S2.cp.name+' R'+S2.cp.R.toFixed(1)}}};
  }
  if(c.el==='wall'&&c.kind==='it'){const L1=mat('lining','lin0'),C=v('clad').m===-1&&v('clad').lm?v('clad').lm:mat('itBoard','clad'),L2=mat('lining','lin'),f2=v('fr2');
    return{fn:'itWallSection',notDrawn,params:{numbers:nums({lin0:'lining1',fr:'frame1',clad:'centre',fr2:'frame2',lin:'lining2'}),lin1:{label:L1.n,t:L1.t||10},centre:{label:C.n,t:C.t||10},lin2:{label:L2.n,t:L2.t||10},
      f1:{d:+fr.d||90,w:+fr.w||45,s:+fr.s||600,ins:insul(fr,+fr.d||90)},f2:{d:+f2.d||90,w:+f2.w||45,s:+f2.s||600,ins:insul(f2,+f2.d||90)}}}}
  if(c.el==='floor'&&c.kind==='susp'){
    const fl=mat('flooring','floor'),li=mat('floorLining','flin'),d=+fr.d||190;
    ['float','under'].forEach(id=>{if(o(id))notDrawn.push(t.opts.find(x=>x.id===id).label)});
    return{fn:'floorSection',notDrawn,params:{labels:true,numbers:nums({floor:'flooring',fr:'insulation',flin:'lining'}),type:o('lined')?'cantilever':'subfloor',flooring:{label:fl.n,thickness:fl.t||20},
      joist:{width:+fr.w||45,depth:d},spacing:+fr.s||400,lining:{label:li.n,thickness:li.t||0},insulation:insul(fr,d)}};
  }
  return null;
}

/* ---------- export ---------- */
/* What the calculation rests on — printed once, on the summary page. */
function basis(){return[
  'Construction R-values by the isothermal planes method of NZS 4214:2006, as modified by H1/AS1 6th edition paragraph 2.1.3.2.',
  'Framed walls use a framing fraction of 38% (H1/AS1 2.1.3.1 a) i)) unless a lower fraction is stated and demonstrated on the sheet. Other framing: member width ÷ centres.',
  'Bridged layers immediately next to each other form one bridged portion (2.1.3.2).',
  'A bridged portion ends at the next homogeneous layer on each side, except that an insulation layer or air cavity next to it is included in the portion (2.1.3.2 i).',
  'A homogeneous layer between two bridged layers is counted half in each portion (2.1.3.2 ii).',
  'Pliable membranes and underlays are passed over when finding where a portion ends (2.1.3.2 iii).',
  'Surface resistances: outside R'+D.se.toFixed(2)+', inside and still indoor air R'+D.si.toFixed(2)+'. Timber framing conductivity '+D.kTimber.toFixed(2)+' W/m·K.',
  'Vented wall cavity R'+D.vent.toFixed(2)+'; the outside surface and layers outside the cavity are counted at half value. Timber skillion roofs without “Insulated roofing, no vent cavity” are treated the same way: a vented cavity R'+D.vent.toFixed(2)+' over the insulation, on the cavity side of the bridged portion (2.1.3.2 i)), and the outside surface and roofing counted at half value. Roof space over a flat ceiling R'+D.roofSpace.toFixed(2)+'.',
  'Insulation thicker than the framing it sits in is split by thickness: the part between the members is bridged, the part over them is the next layer.',
  'Truss roofs: where the full insulation thickness does not fit under the roofing at the outer edge of the ceiling, the roof is calculated as two parts (2.1.2.9) — the field at full thickness, and a perimeter strip (default 500 mm from the outer edge of the ceiling) with the insulation compressed. Each part must reach R2.6 (2.1.2.11 a)); a heated ceiling needs R3.3 within 500 mm of the edge (Table 2.1.2.12 note 4).',
  'Room at the ceiling edge: bottom chord + heel height, less whatever of the 25 mm ventilation gap under the roofing the purlin zone does not already give, plus wall framing depth × tan(pitch) to the inside of the top plate.',
  'Truss roof insulation strategy, by the room at the heel (top plate centreline, where the insulation starts; product thickness + 25 mm ventilation gap must fit): 1 two layers Pink® Batts® Ceiling R3.6 (360 mm) to the edge; 2 Pink® Superbatts® R7.0 (275 mm) to the edge; 3 R7.0 field + perimeter product (2.1.2.9; default Pink® Batts® Perimeter R2.7, 100 mm, 560 mm wide, 500 mm into the ceiling — Pink® Batts® Ceiling Product and Installation Guide, March 2026) where it fits and its part reaches its minimum; 4 R7.0 field + compressed insulation under an insulation guard. Any choice can be made by hand. No target R is set: each part only has to meet its own minimum, the whole building is checked by the H1 calculation.',
  'Minimums checked: each part of a roof, the ceiling perimeter included, R2.6 (2.1.2.11(a)); walls R1.0 (2.1.2.11(b)); floors other than slabs R1.3 (2.1.2.11(c)); within 500 mm of the edge of a heated ceiling R3.3 (Table 2.1.2.12 note 4) — not required for an unheated ceiling.',
  'Compressed perimeter: BRANZ House Insulation Guide v2.7, Roof edge insulation method — 1 mm slices from the ceiling edge, t(x) = min(d0, t_low + x·tanθ), k_c = k0·(t/d0)^n, R(x) = t/k_c; each slice a full construction (the part within the chord depth bridged, 2.1.3.2); perimeter R = width ÷ Σ 1/RT(x). Pink® guidance: Superbatts® compressed at the eaves generally need a pitch of 18° or more, R4.5 down to 15°.',
  'The perimeter calculations do not count the roof space R0.11 over the strip — conservative.',
  'Heat-loss areas: perimeter area = ceiling perimeter × strip width, field area = ceiling area − perimeter area. Corners are counted twice, which overstates the perimeter area slightly (conservative).'];}

/* ---------- truss roof: the ceiling perimeter ---------- */
const NEXP=[[0.24,'Glass wool'],[0.30,'Polyester or wool fibre'],[0,'Rigid board']];
function edge(c){
  if(c.el!=='roof'||c.kind!=='truss'||c.part)return null;
  const e=c.v.edge||{},fr=c.v.fr||{},ov=OV(c);
  const pitch=+e.pitch||20,rad=pitch*Math.PI/180,tan=Math.tan(rad),cos=Math.cos(rad);
  const bc=+fr.d||MEMBER.chord.d,std=e.heel==null||e.heel==='',tcv=D.topChord/cos,heel=std?tcv:+e.heel;
  const rise=D.purlin/cos,vent=Math.max(0,D.ventGap-rise),face=bc+heel-vent,tLow=face+D.wallDepth*tan;
  const layers=[[+fr.insT||0,+fr.insR||0],[+ov.t||0,+ov.r||0]].filter(x=>x[0]&&x[1]);
  const d0=layers.reduce((a,x)=>a+x[0],0),R0=layers.reduce((a,x)=>a+x[1],0);
  const n=e.n!=null&&e.n!==''?+e.n:.24,W=Math.max(1,Math.round(+e.width||500));
  const E={pitch,tan,cos,bc,std,tcv,heel,rise,vent,face,wall:D.wallDepth,tLow,layers,d0,R0,n,W,fits:!d0||tLow>=d0-1e-6};
  const pv=(k,d)=>e[k]!=null&&e[k]!==''?e[k]:d;
  E.prod={name:String(pv('pprod','Pink® Batts® Perimeter')),R:+pv('pR',2.7),T:+pv('pT',100),W:+pv('pW',560)};
  E.prod.over=E.prod.W-W;E.pfit=E.prod.T+D.ventGap<=tLow+1e-6;E.pcover=E.prod.over>=D.wallDepth/2-1e-6;
  if(E.fits)return E;
  const k0=d0/1000/R0,Rat=t=>t/1000/(k0*Math.pow(t/d0,n));
  let s=0,ts=0;for(let i=0;i<W;i++){const t=Math.min(d0,tLow+(i+.5)*tan);s+=1/Rat(t);ts+=t}
  const over=e.rOver!=null&&e.rOver!==''?+e.rOver:null;
  return Object.assign(E,{k0,sumInv:s,rAvg:W/s,tAvg:ts/W,rLow:Rat(Math.min(d0,tLow)),cLow:Math.min(1,tLow/d0),
    xFull:Math.min(W,(d0-tLow)/tan),over,rUse:over!=null?over:W/s});
}
function perimC(c,E){E=E||edge(c);if(!E||E.fits)return null;
  const p=JSON.parse(JSON.stringify(c)),fr=p.v.fr=p.v.fr||{};p.part='perimeter';p.name=c.name+' — ceiling perimeter';
  fr.insR=E.prod.R;fr.insT=E.prod.T;fr.cover=!!((c.v.fr||{}).cover);fr.prod=E.prod.name;delete p.v.over;
  Object.defineProperty(p,'field',{value:c,enumerable:false});return p}
function perimRect(c,E){const p=JSON.parse(JSON.stringify(c));p.part='perimeter';const fr=p.v.fr=p.v.fr||{};fr.insR=+E.rUse.toFixed(2);fr.insT=Math.round(E.tAvg);fr.cover=true;return p}
/* The perimeter strip slice by slice: 1 mm slices from the ceiling edge, each a full construction — the compressed
   blanket of thickness t(x), its part within the chord depth bridged by the chords and battens (2.1.3.2), the rest
   over them — then RT = width / Σ 1/RT(x). */
const PRC=new Map();
function perimR(c,E){E=E||edge(c);if(!E||E.fits)return null;const key=JSON.stringify([c.kind,c.o,c.v]);if(PRC.has(key))return PRC.get(key);
  const base=JSON.parse(JSON.stringify(c));base.part='perimeter';const fr=base.v.fr||{};fr.cover=!!((c.v.fr||{}).cover);
  const scale=E.over!=null?E.over/E.rAvg:1,Ri=t=>scale*t/1000/(E.k0*Math.pow(t/E.d0,E.n));
  const at=x=>{const t=Math.min(E.d0,E.tLow+x*E.tan),ri=Ri(t);fr.insT=t;fr.insR=ri;const r=calc(base),b=r.rows.find(q=>q.regions);
    return{x,t,c:t/E.d0,rIns:ri,rBetween:ri*Math.min(t,E.bc)/t,rAbove:t>E.bc?ri*(t-E.bc)/t:0,rb:b?b.r:null,rt:r.total}};
  let s=0;for(let i=0;i<E.W;i++)s+=1/at(i+.5).rt;
  const xs=[0,100,200,+E.xFull.toFixed(1),300,E.W].filter((x,i,a)=>x>=0&&x<=E.W&&a.indexOf(x)===i).sort((a,b)=>a-b);
  const o={sum:s,rt:E.W/s,pick:xs.map(at),scale,old:calc(perimRect(c,E)).total};PRC.set(key,o);return o}

/* ---------- truss roof: insulation strategy ----------
   Default field insulation, stepped down by the room at the heel (top plate centreline, 25 mm vent):
   1 two layers R3.6 · 2 one layer R7.0 · 3 R7.0 + perimeter product (2.1.2.9) · 4 R7.0 + compressed insulation under a guard.
   No target R: each part only has to meet its own minimum. */
const FIELDP={dbl:{key:'dbl',name:'Two layers Pink® Batts® Ceiling R3.6',layers:[{R:3.6,T:180,prod:'Pink® Batts® Ceiling'},{R:3.6,T:180,prod:'Pink® Batts® Ceiling'}]},
  r50:{key:'r50',name:'Pink® Batts® Ceiling R5.0',layers:[{R:5.0,T:210,prod:'Pink® Batts® Ceiling'}]},
  r70:{key:'r70',name:'Pink® Superbatts® R7.0',layers:[{R:7.0,T:275,prod:'Pink® Superbatts®'}]}};
const isStrat=c=>!!c&&c.el==='roof'&&c.kind==='truss'&&!c.part&&!c.fkey;
const ev=(c,k,d)=>{const e=c.v.edge||{};return e[k]!=null&&e[k]!==''?e[k]:d};
function geom(c){
  const pitch=+ev(c,'pitch',20),rad=pitch*Math.PI/180,tan=Math.tan(rad),cos=Math.cos(rad);
  const bc=+(c.v.fr||{}).d||MEMBER.chord.d,std=ev(c,'heel',null)==null,tcv=D.topChord/cos,heel=std?tcv:+ev(c,'heel');
  const rise=D.purlin/cos,vent=Math.max(0,D.ventGap-rise),face=bc+heel-vent;
  return{pitch,tan,cos,bc,std,tcv,heel,rise,vent,face,wall:D.wallDepth,H:face+D.wallDepth/2*tan,tLow:face+D.wallDepth*tan,W:Math.max(1,Math.round(+ev(c,'width',500)))}}
function fieldP(c,key){if(key==='own'){const fr=c.v.fr||{},ov=OV(c),L=[];if(+fr.insR)L.push({R:+fr.insR,T:+fr.insT||0,prod:fr.prod||''});if(+ov.r)L.push({R:+ov.r,T:+ov.t||0,prod:ov.prod||''});
    return{key:'own',name:L.length?L.map(x=>'R'+x.R.toFixed(1)+(x.T?' '+x.T+' mm':'')).join(' + '):'No insulation',layers:L.length?L:[{R:0,T:0,prod:''}]}}
  if(key==='custom'){const R=+ev(c,'cR',7.0),T=+ev(c,'cT',275),nm=String(ev(c,'cName','Custom insulation'));return{key,name:nm+' R'+R.toFixed(1),layers:[{R,T,prod:nm}]}}return FIELDP[key]||FIELDP.r70}
const thk=p=>p.layers.reduce((a,x)=>a+x.T,0);
function withField(c,p){const q=JSON.parse(JSON.stringify(c)),L=p.layers;q.fkey=p.key;q.fname=p.name;
  if(p.key==='own')return q   /* each row keeps its own insulation */
  q.v.fr=Object.assign({},q.v.fr,{insR:L[0].R,insT:L[0].T,prod:L[0].prod});
  q.v.over=L[1]?{r:L[1].R,t:L[1].T,prod:L[1].prod}:{r:0,t:0};return q}
const perimProd=c=>({name:String(ev(c,'pprod','Pink® Batts® Perimeter')),R:+ev(c,'pR',2.7),T:+ev(c,'pT',100),W:+ev(c,'pW',560)});
const compProd=c=>({name:String(ev(c,'cpName','Pink® Superbatts®')),R:+ev(c,'cpR',7.0),T:+ev(c,'cpT',275),n:+ev(c,'n',.24),over:ev(c,'rOver',null)==null?null:+ev(c,'rOver')});
function partC(ce,kind,R,T,prod){const p=JSON.parse(JSON.stringify(ce)),fr=p.v.fr=p.v.fr||{};p.part='perimeter';p.pkind=kind;p.name=ce.name+' — ceiling perimeter';
  fr.insR=R;fr.insT=T;fr.cover=!!((ce.v.fr||{}).cover);fr.prod=prod;delete p.v.over;Object.defineProperty(p,'field',{value:ce,enumerable:false});return p}
function compSlices(ce,cp,G){const d0=cp.T,k0=d0/1000/cp.R,n=cp.n,W=G.W,Rat=t=>t/1000/(k0*Math.pow(t/d0,n)),tx=x=>Math.min(d0,G.tLow+x*G.tan);
  let si=0;for(let i=0;i<W;i++)si+=1/Rat(tx(i+.5));const rAvg=W/si,scale=cp.over!=null?cp.over/rAvg:1;
  const base=partC(ce,'comp',cp.R,d0,cp.name),fr=base.v.fr;
  const at=x=>{const t=tx(x),ri=scale*Rat(t);fr.insT=t;fr.insR=ri;const r=calc(base),b=r.rows.find(q=>q.regions);
    return{x,t,c:t/d0,rIns:ri,rBetween:ri*Math.min(t,G.bc)/t,rAbove:t>G.bc?ri*(t-G.bc)/t:0,rb:b?b.r:null,rt:r.total}};
  let s=0;for(let i=0;i<W;i++)s+=1/at(i+.5).rt;
  const xFull=Math.max(0,Math.min(W,(d0-G.tLow)/G.tan));
  const xs=[0,100,200,+xFull.toFixed(1),300,W].filter((x,i,a)=>x>=0&&x<=W&&a.indexOf(x)===i).sort((a,b)=>a-b);
  return{d0,k0,n,W,sumInv:si,rAvg,scale,sum:s,rt:W/s,pick:xs.map(at),xFull,rLow:scale*Rat(Math.min(d0,G.tLow)),cLow:Math.min(1,G.tLow/d0)}}
const STC=new Map();
function strategy(c){const hw=!!(c.heated&&!c.heatWet);const key=JSON.stringify([c.kind,c.o,c.v,hw,c.name]);if(STC.has(key))return STC.get(key);
  const G=geom(c),pmin=hw?3.3:2.6,fit=T=>T+D.ventGap<=G.H+1e-6,L1=x=>x.toFixed(1);
  const dbl=fieldP(c,'dbl'),r70=fieldP(c,'r70'),pp=perimProd(c),cp=compProd(c);
  const fitTxt=(T,nm)=>nm+': '+T+' + 25 = '+(T+25)+' mm '+(fit(T)?'≤':'>')+' room at the heel '+L1(G.H)+' mm'+(fit(T)?' — fits':' — does not fit');
  const c70=withField(c,r70),ppRT=calc(partC(c70,'product',pp.R,pp.T,pp.name)).total,ppOK=fit(pp.T)&&ppRT>=pmin-1e-9;
  const steps=[
    {n:1,name:dbl.name+' · '+thk(dbl)+' mm to the edge',ok:fit(thk(dbl)),why:fitTxt(thk(dbl),'Two layers R3.6')},
    {n:2,name:r70.name+' · '+thk(r70)+' mm to the edge',ok:fit(thk(r70)),why:fitTxt(thk(r70),'R7.0')},
    {n:3,name:'R7.0 field + '+pp.name+' R'+pp.R.toFixed(1)+' perimeter',ok:ppOK,why:fitTxt(pp.T,'R'+pp.R.toFixed(1)+' perimeter')+'; perimeter RT '+ppRT.toFixed(2)+(ppRT>=pmin-1e-9?' ≥ ':' < ')+'R'+pmin.toFixed(1)+(c.heated?' (heated ceiling)':'')},
    {n:4,name:'R7.0 field + compressed '+cp.name+' R'+cp.R.toFixed(1)+' under an insulation guard',ok:true,why:'Last step — checked below'}];
  /* the user chooses: field preset (default two layers R3.6) and, with “Ceiling perimeter” ticked, the perimeter method — nothing is picked automatically */
  const auto=steps.find(s=>s.ok).n;let fsel='own',psel=String(ev(c,'psel','none'));if(psel==='auto')psel='none';
  const field=fieldP(c,fsel),per=psel;
  const ce=withField(c,field);ce.pkey=per;
  const st={G,pmin,steps,auto,fsel,psel,field,per,pp,cp,ce,checks:[],used:null};
  Object.defineProperty(ce,'st',{value:st,enumerable:false});
  const ck=(ok,text,sev)=>st.checks.push({ok,text,sev:ok?'pass':sev||'fail'});
  if(per==='none')ck(fit(thk(field)),fit(thk(field))?fitTxt(thk(field),field.name)+' — full thickness to the edge':'Heel too low for full-thickness insulation — raise the heel or tick Ceiling perimeter ('+thk(field)+' + 25 = '+(thk(field)+25)+' mm > room at the heel '+L1(G.H)+' mm)','fail');
  else if(!fit(thk(field)))ck(true,fitTxt(thk(field),field.name)+' — the ceiling perimeter part takes the first '+G.W+' mm');
  if(per==='product'){st.pc=partC(ce,'product',pp.R,pp.T,pp.name);st.pRT=calc(st.pc).total;pp.over=pp.W-G.W;
    ck(fit(pp.T),fitTxt(pp.T,pp.name+' R'+pp.R.toFixed(1)));
    ck(pp.over>=G.wall/2-1e-6,'Perimeter product over the top plate '+L1(pp.over)+' mm ('+pp.W+' − '+G.W+') '+(pp.over>=G.wall/2-1e-6?'≥':'<')+' half the plate, '+G.wall/2+' mm','review')}
  if(per==='comp'){const cs=st.cs=compSlices(ce,cp,G);st.pc=partC(ce,'comp',cp.R,cp.T,cp.name);st.pRT=cs.rt;
    ck(cs.rLow>3.3,'Compressed insulation at the ceiling edge R'+cs.rLow.toFixed(2)+(cs.rLow>3.3?' (above R3.3)':' — R3.3 or less'));
    ck(1-cs.cLow<=.5,'Compressed '+((1-cs.cLow)*100).toFixed(0)+'% at the ceiling edge'+(1-cs.cLow>.5?' — more than half: the manufacturer must confirm it may be used compressed':''),'review');
    const mp=cp.R<=4.5?15:18;ck(G.pitch>=mp,'Roof pitch '+G.pitch+'° '+(G.pitch>=mp?'≥':'<')+' '+mp+'°, Pink® guidance for compressing '+(cp.R<=4.5?'R4.5':'Superbatts®')+' at the eaves','review')}
  if(st.pc){const p=st.pRT;ck(p>=2.6-1e-9,'Perimeter RT '+p.toFixed(2)+(p>=2.6-1e-9?' ≥':' <')+' R2.6 (2.1.2.11(a), each part of the roof)');
    if(hw)ck(p>=3.3-1e-9,'Perimeter RT '+p.toFixed(2)+(p>=3.3-1e-9?' ≥':' <')+' R3.3 within 500 mm of the edge of a heated ceiling (Table 2.1.2.12 note 4)'+(p<3.3-1e-9&&per==='product'?' — a heated ceiling cannot use this perimeter product: raise the heel':''))}
  if(STC.size>200)STC.clear();STC.set(key,st);return st}

/* ---------- where every R on the sheet comes from ---------- */
/* SRC: value key -> confirmed source (standard + table). Empty until each one is checked: nothing is listed without one. */
const SRC={};
function matRows(c,r){
  const t=tpl(c),out=[],seen={},slotOf=id=>(t.slots||[]).find(s=>s.id===id)||{},peri=c.part==='perimeter';
  const add=x=>{const k=x.name+'|'+(+x.r).toFixed(3);if(seen[k])return;seen[k]=1;x.src=x.src||SRC[x.key]||null;out.push(x)};
  const fixed=(name,val,key,how,src)=>add({name,d:null,k:null,key,src:src||null,r:val,how:how||'Fixed value'});
  const sk=n=>/^Inside|still/i.test(n)?'si':'se',first=r.rows[0],last=r.rows[r.rows.length-1];
  fixed(first.name,first.half?first.r*2:first.r,sk(first.name));
  r.slots.forEach(e=>{const v=c.v[e.slot]||{},s=slotOf(e.slot);
    if(e.kind==='mat'){if(e.none)return;
      if(e.over)fixed(e.mat,e.raw,null,'Entered','Entered on this sheet');
      else if(e.pr)add({name:e.mat,d:null,k:null,key:'pr:'+e.mat,r:e.raw,how:'Product R',src:PBSRC,unconf:1});
      else if(e.k)add({name:e.mat,d:e.t,k:e.k,key:'k:'+e.mat,r:e.t/1000/e.k,src:e.vsrc||null,unconf:e.vsrc?1:0});
      else fixed(e.mat,e.raw,'r:'+e.mat)}
    else if(e.kind==='ins'){if(e.raw)fixed(e.label+' · '+e.mat+(e.t?' · '+e.t+' mm':''),e.raw,null,'Declared R',v.prod?'Manufacturer’s declared R-value':'Entered on this sheet')}
    else if(e.kind==='air'){if(!e.raw)return;const ent=s.k==='fix'&&v.r!=null;fixed(e.label+(e.mat?' · '+e.mat:''),e.raw,ent?null:'air:'+e.label,ent?'Entered':'Fixed value',ent?'Entered on this sheet':null)}
    else if(e.kind==='frame'){const mb=e.members[0],Rv=+v.insR,T=+v.insT,fm=x=>x.toFixed(1);
      add({name:mb.name+' '+mb.depth+' × '+mb.width+' mm timber',d:mb.depth,k:D.kTimber,key:'kTimber',r:mb.depth/1000/D.kTimber});
      if(s.brk&&+v.brkR)fixed('Thermal break strip'+(+v.brkT?' · '+v.brkT+' mm':''),+v.brkR,null,'Entered','Entered on this sheet');
      if(Rv){const ed=c.v.edge||{},src=peri&&/perimeter/i.test(v.prod||'')?'Manufacturer’s declared R-value — Pink® Batts® Ceiling Product and Installation Guide (March 2026), “Pink® Batts® Perimeter”':(v.prod?'Manufacturer’s declared R-value':'Entered on this sheet');
        fixed((peri&&v.prod?v.prod+' ':'Insulation ')+'R'+fm(Rv)+(T?' · '+T+' mm':''),Rv,null,'Declared R',src);
        if(s.cover&&v.cover&&T>mb.depth){const nm=mb.name.toLowerCase(),sp='Split by thickness — basis of calculation item 9';
          fixed('… '+mb.depth+' mm of it between the '+nm,Rv*mb.depth/T,null,'R'+fm(Rv)+' × '+mb.depth+' / '+T,sp);
          fixed('… '+(T-mb.depth)+' mm of it over the '+nm,Rv*(T-mb.depth)/T,null,'R'+fm(Rv)+' × '+(T-mb.depth)+' / '+T,sp)}}
      const g=s.gap?LIB.gap[gapIdx(s,v)]:null;if(g&&g.r)fixed(g.n,g.r,'gap:'+g.n);
      if(s.cavGap)fixed(s.cavLabel||'Air gap in the joist space',s.cavGap,s.cavLabel?'vent':'cavGap');
      if(!Rv&&!(g&&g.r)&&!s.cavGap)fixed(s.member==='batten'?'Still air between the battens':'Empty cavity, still air',D.emptyGap,'emptyGap')}});
  if(last.name==='Subfloor space')fixed(last.name,last.r,null,'Entered','Entered on this sheet');else fixed(last.name,last.r,sk(last.name));
  const U={};out.forEach(x=>{if(x.src&&!x.unconf)return;const k=x.key||x.name;
    const u=U[k]=U[k]||{item:x.key==='kTimber'?'Timber framing conductivity':x.d!=null?x.name+' — conductivity':x.name,value:x.d!=null?'k '+x.k.toFixed(2)+' W/m·K':'R '+(+x.r).toFixed(2),used:[]};u.used.push(x.name)});
  return{rows:out,unsourced:Object.values(U)}}

/* Everything one calculation sheet prints. list = all constructions, for the W1 / R1 / F1 reference. */
function toSheet(c,list){
  if(isStrat(c)){const st=strategy(c),s=toSheet(st.ce,list),same=(list||[c]).filter(x=>x.el===c.el),ref='R'+(same.indexOf(c)+1);
    s.ref=ref;s.name=c.name;if(s.perimeter){s.perimeter.ref=ref}return s}
  const t=tpl(c),r=calc(c),f=x=>+(+x).toFixed(2),same=(list||[c]).filter(x=>x.el===c.el),min=EL[c.el].min;
  const s={ref:{wall:'W',roof:'R',floor:'F'}[c.el]+(same.indexOf(c)+1),name:c.name,el:c.el,element:EL[c.el].name,type:t.name,
    total:f(r.total),min,manual:!!t.manual,layers:[],portions:[],notes:r.notes,
    checks:[{ok:r.total>=min,text:(r.total>=min?'Meets':'Below')+' H1/AS1 2.1.2.11('+{roof:'a',wall:'b',floor:'c'}[c.el]+') minimum R'+min.toFixed(1)}]};
  if(c.el==='wall'&&!t.manual&&t.kind!=='block')s.checks.push({ok:r.total>=1.5,text:(r.total>=1.5?'Meets':'Below')+' E3/AS1 R1.5'});
  s.ff=ffLines(c);
  if(c.el==='roof'&&c.heated&&!c.heatWet&&!c.part&&!t.manual){s.min=6.6;s.checks[0]={ok:r.total>=6.6,text:(r.total>=6.6?'Meets':'Below')+' Table 2.1.2.12 minimum R6.6 (heated ceiling)'}}
  if(t.slab){const L=r.slab;s.checks=[];s.slab=L;s.element='Slab-on-ground floor';return s}
  if(t.manual)return s;
  const ST=c.st,split=!!(ST&&ST.per!=='none');
  if(split)s.checks[0].text='Field: '+s.checks[0].text;
  s.framing=r.slots.filter(e=>e.kind==='frame').map(e=>{const x=e.members[0];return x.depth+' × '+x.width+' @ '+x.centres+' · '+(x.fraction*100).toFixed(1)+'%'}).join(' + ');
  s.insulation=r.slots.map(e=>e.kind==='frame'?e.insul:e.kind==='ins'&&e.raw?'R'+e.raw.toFixed(1)+' '+e.label.toLowerCase():'').filter(Boolean).join(' + ');
  const ps=r.rows.filter(x=>x.regions),first=r.rows[0],last=r.rows[r.rows.length-1];
  ps.forEach((p,k)=>s.portions.push({id:'B'+(k+1),name:p.name,rb:f(p.r),members:p.members.map(x=>Object.assign({},x,{fraction:+(x.fraction*100).toFixed(1)})),
    paths:p.regions.map(g=>({name:g.name,pct:+(g.f*100).toFixed(1),parts:g.parts.concat(p.sharedParts).map(q=>({name:q.name,r:f(q.r)})),r:f(g.r+p.shared)})),
    formula:'1/Rb = '+p.regions.map(g=>g.f.toFixed(3)+' / '+(g.r+p.shared).toFixed(2)).join(' + ')+'   →   Rb = '+p.r.toFixed(2)}));
  s.layers.push({no:'',slot:null,label:first.name,material:'',thickness:null,own:f(first.half?first.r*2:first.r),counted:f(first.r),countedText:(+first.r).toFixed(2),halved:!!first.half,portion:null});
  r.slots.forEach((e,n)=>{const k=ps.findIndex(p=>p.slots.includes(e.i)),lead=k>=0&&ps[k].i===e.i;
    const counted=k<0?f(e.r):lead?f(ps[k].r):null;
    s.layers.push({no:n+1,slot:e.slot,label:e.label,material:e.mat||'',thickness:e.t||null,own:e.raw==null?null:f(e.raw),
      counted,countedText:counted!=null?counted.toFixed(2):'in B'+(k+1),halved:!!e.half,portion:k>=0?'B'+(k+1):null,lead})});
  s.layers.push({no:'',slot:null,label:last.name,material:'',thickness:null,own:f(last.r),counted:f(last.r),countedText:(+last.r).toFixed(2),halved:false,portion:null});
  const rng=a=>{const g=[];a.forEach(x=>{const q=g[g.length-1];if(q&&x===q[1]+1)q[1]=x;else g.push([x,x])});
    const w=[].concat(...g.map(([a,b])=>a===b?[''+a]:b===a+1?[''+a,''+b]:[a+'–'+b]));return w.length>1?w.slice(0,-1).join(', ')+' and '+w[w.length-1]:w[0]};
  s.portions.forEach(p=>{p.rows=s.layers.filter(l=>l.portion===p.id).map(l=>l.no)});
  const adj=[];ps.forEach((p,k)=>{if(p.members.length<2)return;r.slots.forEach((e,n)=>{if(e.kind!=='frame'||e.i===p.i||!p.slots.includes(e.i))return;
    const nb=r.slots[n-1]&&r.slots[n-1].kind==='frame'?n:n+2;
    adj.push('Row '+(n+1)+' ('+e.label+') is in '+s.portions[k].id+(e.raw?'':' although it holds no insulation')+': it is itself a bridged layer — '+e.members[0].name.toLowerCase()+' beside '+(e.raw?'insulation':'still air')+' — directly against row '+nb+', and 2.1.3.2 says “Where multiple bridged layers are immediately adjacent, they shall all be included in the bridged portion.”')})});
  const ids=s.portions.map(p=>p.id);
  s.portionNote=ids.length?'Rows marked “in '+ids.join('” or “in ')+'” are layers the framing bridges or that sit against it. They are not added one by one: together with the framing they make one bridged portion, whose Rb is on the '+ids.join(' / ')+' subtotal row. '+
    s.portions.map(p=>p.id+' = row'+(p.rows.length>1?'s ':' ')+rng(p.rows)+' together, calculated as '+p.members.map(()=>2).join(' × ')+' heat paths by the NZS 4214 bridged-portion rule as modified by H1/AS1 6th edition 2.1.3.2; the paths and the 1/Rb formula are in the '+p.id+' path table in Calculation details at the end of the report.').join(' ')+
    (adj.length?' '+adj.join(' '):''):'';
  {const fs=(t.slots||[]).find(x=>x.k==='frame'&&x.cover),fv=fs&&c.v[fs.id]||{},dp=fs?(+fv.d||MEMBER[fs.member].d):0;
    if(fs&&+fv.insR&&+fv.insT>dp)s.coverNote=fv.cover?'Insulation covering the bottom chord: yes — the part above the chords is counted over the chords too. '+"When using this option make sure that the insulation product is suitable - typically manufactured at 460mm width"+'.':'Insulation covering the bottom chord: no — over the chords only the timber and the continuous layers above are counted.'}
  const mr=matRows(c,r);s.materials=mr.rows;s.unsourced=mr.unsourced;
  if(!c.part&&ps.some(p=>p.members.length>1)){const a=calc(c,{noMerge:1}),ap=a.rows.filter(x=>x.regions);
    s.alt={portions:ap.map((p,k)=>({id:'B'+(k+1),name:p.name,rb:f(p.r)})),total:f(a.total)};
    s.alt.text='For comparison only, not used: with each bridged layer as its own portion, '+s.alt.portions.map(p=>p.id+' '+p.name.toLowerCase()+' Rb = '+p.rb.toFixed(2)).join(', ')+
      '; RT = '+a.total.toFixed(2)+', '+Math.abs(r.total-a.total).toFixed(2)+' '+(a.total<r.total?'lower':'higher')+' than '+r.total.toFixed(2)+'. 2.1.3.2 makes adjacent bridged layers one portion, so the calculation above stands.'}
  if(ST){const G=ST.G,L1=x=>x.toFixed(1),F=ST.field,bc=G.bc,l0=F.layers[0],no=id=>(s.layers.find(l=>l.slot===id)||{}).no,r2=x=>x.toFixed(2),rr='R'+l0.R.toFixed(1);
    const lt=F.layers.length>1?'Two layers of '+rr+' '+l0.T+' mm: the lower layer (row '+no('fr')+') lies between the '+bc+' mm chords and '+(l0.T-bc)+' mm above them — '+rr+' × '+bc+'/'+l0.T+' = '+r2(l0.R*bc/l0.T)+' between, '+rr+' × '+(l0.T-bc)+'/'+l0.T+' = '+r2(l0.R*(l0.T-bc)/l0.T)+' above; the upper layer (row '+no('over')+') lies on it, R'+r2(F.layers[1].R)+'. The part above the chords and the upper layer are adjacent insulation, counted on every heat path of B1 (2.1.3.2).'
      :'One layer of '+rr+' '+l0.T+' mm (row '+no('fr')+'): '+Math.min(bc,l0.T)+' mm between the '+bc+' mm chords, '+rr+' × '+Math.min(bc,l0.T)+'/'+l0.T+' = '+r2(l0.R*Math.min(bc,l0.T)/l0.T)+(l0.T>bc?', and '+(l0.T-bc)+' mm above them, '+rr+' × '+(l0.T-bc)+'/'+l0.T+' = '+r2(l0.R*(l0.T-bc)/l0.T)+', counted on every heat path of B1 (2.1.3.2)':'')+'.';
    const how=ST.used?'Insulation strategy step '+ST.used+' of 4, the first that works':'Insulation chosen by hand (the first workable strategy step is '+ST.auto+')';
    const roomT='Room at the heel, at the top plate centreline where the insulation starts: '+L1(G.H)+' mm = bottom chord '+bc+' + heel '+L1(G.heel)+' − vent '+L1(G.vent)+' + '+(G.wall/2)+' × tan '+G.pitch+'° (the 45 mm purlin zone, '+L1(G.rise)+' mm, gives the ventilation gap under the roofing).';
    const pn=ST.per==='product'?ST.pp.name+' R'+ST.pp.R.toFixed(1):'compressed '+ST.cp.name+' R'+ST.cp.R.toFixed(1);
    s.edgeText=how+': '+F.name+(split?' with a '+pn+' perimeter':', full thickness to the edge')+'. '+lt+' '+roomT+(split?' Two parts (H1/AS1 2.1.2.9): this sheet is the field, its insulation starting '+G.W+' mm from the outer edge of the ceiling; the first '+G.W+' mm is the perimeter part (P1 in the drawing), on its own sheet.':' One roof, one R.')}
  if(split){const G=ST.G,pc=ST.pc,P=toSheet(pc,list),L1=x=>x.toFixed(1),ex=c.v.edge||{},isP=ST.per==='product',pr=isP?ST.pp:ST.cp,pn=pr.name+' R'+pr.R.toFixed(1),cs=ST.cs;
    const no={};s.layers.forEach(l=>{if(l.slot)no[l.slot]=l.no});const tl=Math.round(Math.min(pr.T,G.tLow));
    P.layers.forEach(l=>{if(!l.slot)return;if(l.slot==='fr'){l.no='P1';
        if(isP){l.label='Truss bottom chord and perimeter insulation';l.material=pn+', '+pr.T+' mm, '+pr.W+' mm wide'}
        else{l.label='Truss bottom chord and compressed insulation';l.material=pn+', compressed to '+tl+'–'+pr.T+' mm under an insulation guard; the part within the '+G.bc+' mm chords is bridged';l.thickness=tl+'–'+pr.T;l.own=f(pr.R)}}
      else if(no[l.slot]!=null)l.no=no[l.slot]});
    P.ref=s.ref;P.part='perimeter';P.pkind=ST.per;P.width=G.W;P.type=s.type+' — ceiling perimeter, '+(isP?pn:'compressed '+pn);P.min=ST.pmin;P.insulation=isP?pn+' '+pr.T+' mm':'compressed '+pn;
    P.total=f(ST.pRT);P.checks=ST.checks.map(k=>({ok:k.ok,warn:k.sev==='review',text:k.text}));
    const B=P.portions[0];if(B)B.rows=P.layers.filter(l=>l.portion===B.id).map(l=>l.no);
    const bat=no.st!=null?' Row '+no.st+', the ceiling battens, is itself a bridged layer directly against row P1, so 2.1.3.2 puts it in the same portion.':'';
    if(isP){const inC=pr.R*Math.min(pr.T,G.bc)/pr.T,ovC=pr.T>G.bc?pr.R*(pr.T-G.bc)/pr.T:0;
      P.portionNote=B?'Rows marked “in '+B.id+'” are not added one by one: together with the framing they make one bridged portion, whose Rb is on the '+B.id+' subtotal row. '+B.id+' = rows '+B.rows.join(' and ')+' together. Of the '+pr.T+' mm '+pn+', '+Math.min(pr.T,G.bc)+' mm lies between the '+G.bc+' mm chords (R'+pr.R.toFixed(1)+' × '+Math.min(pr.T,G.bc)+'/'+pr.T+' = '+inC.toFixed(2)+')'+(ovC?' and '+(pr.T-G.bc)+' mm over them (R'+pr.R.toFixed(1)+' × '+(pr.T-G.bc)+'/'+pr.T+' = '+ovC.toFixed(2)+'), the adjacent insulation layer, added to every path':'')+'.'+bat+' 2 × 2 heat paths by NZS 4214 as modified by H1/AS1 6th edition 2.1.3.2; the paths and the 1/Rb formula are in the '+B.id+' path table in Calculation details at the end of the report.':''}
    else{if(B){B.rb=null;B.rbText='per slice';B.paths=[];B.formula='';B.slices=cs.pick;B.sum=cs.sum;B.W=G.W;B.result=cs.rt}
      P.sum='RT = '+G.W+' ÷ Σ 1/RT(x) = '+G.W+' ÷ '+cs.sum.toFixed(3)+' = '+cs.rt.toFixed(2);
      P.portionNote=B?'Rows marked “in '+B.id+'” are not added one by one. '+B.id+' = rows '+B.rows.join(' and ')+' together. Row P1 is the compressed '+pn+' as one layer; it changes thickness across the strip, so the perimeter is calculated in 1 mm slices. In each slice the part of P1 within the '+G.bc+' mm chord depth is bridged by the truss bottom chords and the rest lies over them on every path.'+bat+' 2 × 2 paths by NZS 4214 as modified by H1/AS1 6th edition 2.1.3.2; RT(x) adds the surfaces, roofing and ceiling lining; the perimeter R is '+G.W+' ÷ Σ 1/RT(x). Representative slices are in the '+B.id+' slice table.':'';
      P.materials=P.materials.filter(x=>!/^(Insulation|…|Compressed|Pink)/.test(x.name));
      const ci=P.materials.findIndex(x=>/timber/.test(x.name));
      P.materials.splice(ci+1,0,{name:'P1 compressed '+pn+' — R(x) = t ÷ (k0 · (t/d0)^n), per slice',d:tl+'–'+pr.T,k:cs.k0.toFixed(4)+' · c^'+cs.n,r:'per slice',
        src:(pr.over!=null?'Manufacturer’s compressed R-value, slices scaled; ':'')+'BRANZ House Insulation Guide v2.7, Roof edge insulation method; k0 from the declared R'+pr.R.toFixed(1)+' over '+pr.T+' mm'})}
    P.edge=[['Minimum roof pitch θ',G.pitch+'°','Entered'],
      ['Heel height',L1(G.heel)+' mm',G.std?'Standard heel: top chord '+D.topChord+' ÷ cos '+G.pitch+'°':'Entered (raised heel)'],
      ['Ventilation gap taken off',L1(G.vent)+' mm','25 mm clear under the roofing; the '+D.purlin+' mm purlin zone gives '+D.purlin+' ÷ cos '+G.pitch+'° = '+L1(G.rise)+' mm'+(G.vent>0?', the rest comes off the insulation':', which covers it')],
      ['Room at the heel (top plate centreline)',L1(G.H)+' mm','bottom chord '+G.bc+' + heel '+L1(G.heel)+' − '+L1(G.vent)+' + '+(G.wall/2)+' × tan '+G.pitch+'° — the strategy checks thickness + 25 mm against this'],
      ['Field insulation',ST.field.name+' · '+thk(ST.field)+' mm',thk(ST.field)+' + 25 = '+(thk(ST.field)+25)+' mm '+(thk(ST.field)+25<=G.H?'≤':'>')+' '+L1(G.H)+' mm'+(ST.used?' — strategy step '+ST.used:' — chosen by hand')]];
    if(isP)P.edge.push(['Perimeter product',pn,'Pink® Batts® Ceiling Product and Installation Guide (March 2026), “Pink® Batts® Perimeter”'],
      ['Product thickness · width',pr.T+' mm · '+pr.W+' mm','Laid from '+L1(pr.W-G.W)+' mm over the top plate to '+G.W+' mm into the ceiling'],
      ['Product fit',(pr.T+25)+' mm '+(pr.T+25<=G.H?'≤ ':'> ')+L1(G.H)+' mm','thickness + 25 mm ventilation gap against the room at the heel']);
    else{const nn=(NEXP.find(x=>Math.abs(x[0]-cs.n)<1e-9)||[0,'Entered'])[1];
      P.edge.push(['Compressed product',pn,'Laid under an insulation guard, compressed where the roof comes down'],
      ['t_low, at the outer edge of the ceiling',L1(G.tLow)+' mm',L1(G.face)+' + '+G.wall+' × tan '+G.pitch+'°'],
      ['d0, lofted thickness',pr.T+' mm','Declared'],
      ['k0, uncompressed conductivity',cs.k0.toFixed(4)+' W/m·K',(pr.T/1000).toFixed(3)+' ÷ '+pr.R.toFixed(1)],
      ['n, compression exponent',String(cs.n),nn],
      ['Strip width',G.W+' mm','1 mm slices from the ceiling edge, x at the slice centre; t(x) = min(d0, t_low + x·tanθ)'],
      ['Full thickness reached at x =',L1(cs.xFull)+' mm','(d0 − t_low) ÷ tanθ'],
      ['Largest compression',((1-cs.cLow)*100).toFixed(1)+'%','1 − t_low ÷ d0'],
      ['Insulation R at the lowest point',cs.rLow.toFixed(2),'t_low ÷ (k0 · (t_low/d0)^n)'],
      ['Insulation alone, strip average',cs.rAvg.toFixed(2),'width ÷ Σ 1/R(x) = '+G.W+' ÷ '+cs.sumInv.toFixed(2)+' — reference only']);
      if(pr.over!=null)P.edge.push(['Manufacturer’s compressed R',pr.over.toFixed(2),'Entered — every slice scaled by '+cs.scale.toFixed(3)]);
      P.edge.push(['Perimeter construction R',cs.rt.toFixed(2),'width ÷ Σ 1/RT(x) = '+G.W+' ÷ '+cs.sum.toFixed(3)])}
    const A=+ex.area,PL=+ex.perim,ap=PL*G.W/1000;
    P.area=A&&PL?{area:A,perim:PL,aP:ap,aF:A-ap}:null;
    P.rsText='The roof space (R'+D.roofSpace.toFixed(2)+') is not counted over the perimeter — conservative.'+(isP?' Counted, RT would be '+(P.total+D.roofSpace).toFixed(2)+'.':'');
    P.areaText='Areas for the heat-loss calculation (2.1.2.9): '+(P.area?'perimeter '+PL+' m × '+(G.W/1000)+' m = '+ap.toFixed(1)+' m²; field '+A+' − '+ap.toFixed(1)+' = '+(A-ap).toFixed(1)+' m².':'perimeter area = ceiling perimeter × '+(G.W/1000)+' m; field area = ceiling area − perimeter area (enter both on the page).')+' Corners are counted twice, so the perimeter area is slightly overstated — conservative.';
    s.perimeter=P}
  s.sum='RT = '+s.layers.filter(l=>l.counted!=null).map(l=>l.counted.toFixed(2)).join(' + ')+' = '+r.total.toFixed(2);
  return s;
}

/* The same sheet, flattened to what POST /api/h1/report accepts today. */
function toReport(c,list){
  const s=toSheet(c,list),layers=[];
  s.layers.forEach(l=>layers.push({name:l.label+(l.material?': '+l.material:'')+(l.halved?' (counted at half, outside the vented cavity)':'')+(l.portion&&l.counted==null?' (in bridged portion '+l.portion+')':''),
    thickness_mm:l.thickness,r_value:l.counted!=null?l.counted:l.own}));
  s.portions.forEach(p=>p.paths.forEach(g=>layers.push({name:p.id+' path — '+g.pct+'% '+g.name+': '+g.parts.map(q=>q.name+' '+q.r.toFixed(2)).join(' + '),thickness_mm:null,r_value:g.r})));
  if(s.perimeter)layers.push({name:'Ceiling perimeter part ('+s.perimeter.width+' mm, '+s.perimeter.insulation+'): construction R',thickness_mm:null,r_value:s.perimeter.total});
  return{name:s.ref+' · '+s.name,element_type:c.el==='floor'?'other_floor':c.el,total_r:s.total,
    method:s.manual?'Entered directly':'NZS 4214 isothermal planes as modified by H1/AS1 2.1.3.2',
    framing_fraction:s.portions.length&&s.portions[0].members.length===1?s.portions[0].members[0].fraction/100:null,layers,notes:[s.type].concat(s.notes)};
}

