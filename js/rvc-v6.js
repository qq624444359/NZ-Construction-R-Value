/* R-value Calculator v6 — three columns: constructions · build-up · section and export.
   Every number comes from rvalue-model.js (calc / frac / matR / tpl / newC); this file only writes inputs into state and draws. */
(function(){
const $=s=>document.querySelector(s);
const q=new URLSearchParams(location.search);
const r2=x=>(+x||0).toFixed(2),p1=x=>((+x||0)*100).toFixed(1)+'%';
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const nv=x=>x==null||x===''?'':x;
const ELW={roof:'Roof',wall:'Wall',floor:'Floor'};
const DEFM={clad:5,ab:1,lin:1,lin0:1,roof:0,ceil:1,sark:0,floor:0,floor2:0,flin:0};
/* roofing → the underlay and substrate it sets, by material id (the list order can change) */
const ROOFLINK={'metal-sheet-any-profile':['Self-supporting roof underlay','Purlins'],'shingles-on-15-mm-plywood':['D226+ underlay','Plywood 15 mm'],'membrane-on-17-mm-plywood':['Membrane underlay','Plywood 17 mm'],
  'metal-tile':['Roof underlay','Tile battens'],'concrete-or-clay-tiles':['Roof underlay','Tile battens']};
const rLink=m=>ROOFLINK[(LIB.roofing[+m||0]||{}).id];
/* ceiling battens: locked to the plasterboard default until unlocked */
const BAT0={d:35,w:70,s:450},BATTXT='Ceiling battens for 10 mm GIB® plasterboard — 450 mm maximum spacing';
/* unlocking is for this visit only — every reopen starts locked (not saved) */
const SOPEN=new Set(),UNL=new Set(),isUnl=(c,id)=>UNL.has(c.id+':'+id);
const lockBtn=(id,k)=>`<button class="link-btn v6unl" data-a="unlock" data-v="${id}" data-k="${k}"><span class="ms s16">lock_open</span>Unlock to edit</button>`;
/* layers that 2.1.3.2 joins into one bridged portion: shown on the first framing layer of the portion */
function groupNote(x,i,num){const g=x.rows.find(r=>r.kind==='frame'&&r.i===i&&r.slots&&r.slots.length>1);if(!g)return'';
  const ns=[...new Set(g.slots.map(j=>num[j]).filter(n=>n!=null))].sort((a,b)=>a-b);
  return `<div class="lsub v6grp">Layers ${ns.join(' + ')} are one bridged portion (2.1.3.2) — calculated together: R${r2(g.r)}</div>`}
const SVGMAP={wall:{clad:['cladding'],vcav:['cavity'],ab:['barrier'],fr:['framing','insulation'],lin:['lining']},
  roof:{roof:['roofing','underlay','substrate'],rspace:['roofspace'],fr:['chord','insulation-between','perimeter','insulation-perimeter','perimeter-zone'],over:['insulation-over'],st:['battens','insulation-battens'],ceil:['lining']},
  floor:{floor:['flooring'],fr:['joists','insulation','airspace'],st:['battens'],flin:['lining']}};

/* ---------- state ---------- */
let n=0;
/* a library entry by its id: the list order can change */
const libI=(lib,id)=>Math.max(0,LIB[lib].findIndex(m=>m.id===id));
const RAFT_R=6.0,RAFT_T=230;   /* 290 rafters: the highest-R batt that still leaves the 25 mm vented cavity */
const mk=(el,f)=>{const c=Object.assign({id:'c'+(++n),manualR:null,subR:null,heated:false},newC(el));if(f)f(c);return c};
const S={name:'12 Example Street, Auckland',zone:1,cur:null,pin:null,hover:null,af:null,menu:false,list:[
  mk('wall',c=>{c.name='Wall – Oblique 90@600';c.v.clad.m=libI('cladding','james-hardie-oblique-weatherboard-14-mm')}),
  mk('wall',c=>{c.name='Wall – Oblique 90@400';c.v.clad.m=libI('cladding','james-hardie-oblique-weatherboard-14-mm');c.v.fr.s=400}),
  mk('wall',c=>{c.name='Wall – internal garage 90@600';c.nh='int';c.o.cav=false;c.v.clad.m=16;c.v.ab.m=0}),
  mk('roof',c=>{c.name='Roof – metal longrun, flat ceiling';c.v.roof.m=libI('roofing','metal-sheet-any-profile')}),
  mk('roof',c=>{c.kind='skillion';c.name='Roof – metal longrun, rafter';c.v={roof:{m:libI('roofing','metal-sheet-any-profile')},fr:{d:290,w:45,s:600,mode:'std',insR:RAFT_R,insT:RAFT_T,gap:0,cover:false,prod:'Pink® Superbatts®'},st:{d:35,w:70,s:450,s450:1},ceil:{m:1}}}),
  mk('floor',c=>{c.name='Floor – timber cantilever 240@400';c.v.flin.m=libI('floorLining','james-hardie-fibre-cement-6.5-mm')}),
  mk('floor',c=>{c.kind='slab';c.name='Floor – RibRaft concrete slab';c.area=140;c.v={slab:{sP:52,sM:'int',sF:'raft',sU:'none',sE:'none',sWall:'other',sT:100}}})]};
S.cur=S.list[0].id;const DEF_IDS=S.list.map(c=>c.id);
/* links to the 3D house keep the test-mode ?c= */
const TQ=q.get('c')!=null?'c='+encodeURIComponent(q.get('c')):'';
const to3d=()=>'house-guide.html'+(TQ?'?'+TQ:'');
let FROMG=q.get('from')==='guide';const SHOW3D=false;
/* a new project: only the starting constructions, nothing from the 3D house, no address */
const isNew=()=>S.list.every(c=>DEF_IDS.includes(c.id)&&!(c.origin&&c.origin.guide))&&!((S.pdf&&S.pdf.proj||{}).address);
const startCard=()=>FROMG?`<div class="card v6start"><span class="ms">checklist</span><div><b>Next: check the constructions from the 3D house</b><p>Enter each construction's area, the windows and doors, and the slab perimeter below. When it all checks out, Export PDF.</p></div><button class="v6btn" data-a="startx">Got it</button></div>`
  /* the 3D house entry is not shown on the live site (house-guide.html is kept; set SHOW3D to bring it back) */
  :SHOW3D&&isNew()?`<div class="card v6start"><span class="ms">deployed_code</span><div><b>New to this?</b><p>Pick materials on a 3D house — the constructions are added here for you.</p></div><a class="v6btn" href="${to3d()}">Start with the 3D house</a></div>`:'';
const pick=q.get('c');if(pick){const m={w1:0,w2:1,w3:2,r1:3,r2:3,f1:5}[pick];if(m!=null)S.cur=S.list[m].id}
/* Project item (rvc-project.js): restore the saved project, open on Project when there are no view parameters */
const XP=window.RVP||null;
/* the House Guide writes the same saved project: reload it when the other page changes it */
function reload(sv){if(!sv||!sv.list)return;S.list=sv.list;n=sv.list.reduce((m,c)=>Math.max(m,+String(c.id).slice(1)||0),n);S.guide=sv.guide||{};if(sv.proj)Object.assign(S.pdf.proj,sv.proj);S.list.forEach(ensure);if(S.cur!=='project'&&S.cur!=='openings'&&!S.list.some(c=>c.id===S.cur))S.cur='project';render()}
/* the left-column line: the real address only — never the placeholder sample name */
function hdrTxt(){const ad=((S.pdf&&S.pdf.proj)||{}).address||'',P=XP&&XP.state?XP.state():{};return (ad||'No address yet')+(P.ta?' · '+P.ta:'')+(S.zone?' · Zone '+S.zone:'')}
window.addEventListener('storage',e=>{if(e.key==='ezbuild-theme'&&e.newValue)document.body.dataset.theme=e.newValue==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):e.newValue});   /* theme shared with the 3D house */
window.RVC={get S(){return S},reload:sv=>reload(sv),render:()=>render(),ib:(...a)=>ib(...a),selF:(...a)=>selF(...a),grpF:(...a)=>grpF(...a),block:(c,k)=>block(c,k),nameHint:c=>nameHint(c),slabWarn:c=>slabWarn(c)};
/* "New project": the page reloads blank — no sample areas, no slab size */
let NEWP=false;try{NEWP=sessionStorage.getItem('ezbuild-newproj')==='1'}catch(e){}
if(XP){const sv=NEWP?null:XP.load();if(sv&&sv.list&&sv.list.length){S.list=sv.list;n=sv.list.reduce((m,c)=>Math.max(m,+String(c.id).slice(1)||0),n);S._proj=sv.proj;S.guide=sv.guide||{}}
  else if(!XP.PARAM&&!NEWP)XP.seed(S.list);
  if(NEWP){S.list.forEach(c=>{if(c.kind==='slab'){delete c.area;if(c.v.slab){delete c.v.slab.sP}}});try{sessionStorage.removeItem('ezbuild-newproj')}catch(e){}}
  /* projects saved before the slab became a construction: move the old Project-page slab into one. Not for a newer
     project that simply has no slab (e.g. a suspended timber floor) — that once got a phantom 140 m² slab */
  if(sv&&(sv.fmt||1)<2&&!S.list.some(c=>c.kind==='slab')){const P0=XP.state(),nc=mk('floor',c=>{c.kind='slab';c.name='Floor – concrete slab';c.area=+P0.slabA||140;c.v={slab:{sP:+P0.slabP||52,sM:P0.slabM||'int',sW:P0.slabW||'',sF:P0.slabF||'slab',sU:P0.slabU||'none',sE:P0.slabE||'none',sWall:P0.slabWall||'other',sT:+P0.slabT||100}}});S.list.push(nc)}
  if(!XP.PARAM)S.cur='project'}
if(q.get('cid')==='project'&&XP)S.cur='project';else if(q.get('cid')&&S.list.some(c=>c.id===q.get('cid')))S.cur=q.get('cid');   /* opened from the House Guide */
if(q.get('add'))S.menu=true;
if(q.get('theme'))document.body.dataset.theme=q.get('theme');
document.querySelectorAll('[data-a="to3d"]').forEach(a=>a.href=to3d());document.querySelectorAll('[data-a="rvhome"]').forEach(a=>a.href='index.html'+(TQ?'?'+TQ:''));
function cur(){return S.list.find(c=>c.id===S.cur)||(XP&&(S.cur==='project'||S.cur==='openings')?null:S.list[0])}
function ensure(c){c.o=c.o||{};const t=tpl(c);if(t.manual)return;ffMig(c);batMig(c);gapMig(c);
  if(c.el==='roof'){['fr','st'].forEach(id=>{const v=c.v[id];if(v&&v.p38){v.mode='std';v.p38=false;delete v.pct}})}   /* 38% is the wall default only (2.1.3.1 a)) */(t.slots||[]).forEach(s=>{if(c.v[s.id])return;
  if(s.k==='mat')c.v[s.id]={m:s.lib==='itBoard'?0:DEFM[s.id]||0};
  else if(s.k==='frame'){const d=MEMBER[s.member];c.v[s.id]=Object.assign({d:d.d,w:d.w,s:d.s,mode:'std',insR:null,insT:null,gap:0,cover:false},d.dw?{dw:d.dw}:{},c.kind==='block'&&s.id==='st'?BLOCK_ST:{})}
  else c.v[s.id]={}})}
function firstFrame(c){const t=tpl(c);const f=(t.slots||[]).find(s=>s.k==='frame'&&prodList(s.member,(c.v[s.id]||{}).d||MEMBER[s.member].d).length);return f?f.id:null}
S.list.forEach(ensure);S.af=cur()?firstFrame(cur()):null;

/* ---------- checks ---------- */
function minOf(c){const el=c.el;
  if(c.heated&&!c.heatWet){if(el==='roof')return{r:6.6,cl:'Table 2.1.2.12'};if(el==='wall')return{r:2.9,cl:'Table 2.1.2.12'};return{r:S.zone<=3?2.5:S.zone===4?2.8:3.0,cl:'Table 2.1.2.12'}}
  return{r:EL[el].min,cl:'H1/AS1'}}
function perimOf(c){if(!isStrat(c))return null;const st=strategy(c);if(st.per==='none')return null;return{st,E:{W:st.G.W},x:{total:st.pRT}}}
const pminOf=c=>c.heated&&!c.heatWet?3.3:2.6;
function status(c){if(phys(c).length)return'fail';if(tpl(c).slab)return calc(c).total?'pass':'review';const x=calc(c),m=minOf(c),P=perimOf(c);
  if(x.total<m.r-1e-9)return'fail';
  const SC=isStrat(c)?strategy(c).checks:[];
  if(SC.some(k=>k.sev==='fail'))return'fail';
  if(x.notes.length||SC.some(k=>k.sev==='review'))return'review';
  return'pass'}

/* ---------- left: constructions ---------- */
function leftCol(){
  const grp=(el,sl)=>{const L=S.list.filter(c=>c.el===el&&(el!=='floor'||!!tpl(c).slab===!!sl));if(sl&&!L.length)return'';
    return `<div class="cx-g"><div class="cx-gh"><span>${sl?'Slab on ground':EL[el].name}</span><span class="mono">${sl?'no minimum':'min R'+EL[el].min.toFixed(1)}</span></div>
    ${L.length?L.map(c=>`<button class="el-card cx-row${c.id===S.cur?' on':''}" data-a="sel" data-v="${c.id}"><i class="cx-dot ${status(c)}"></i><span class="cx-n">${c.origin&&c.origin.guide?'<span class="ms s16 cx-hg" title="Created by the House Guide">cottage</span>':''}${esc(c.name||'Untitled')}</span><b class="mono">${tpl(c).slab?(calc(c).slab&&calc(c).slab.ok?'R'+calc(c).slab.Rtxt:'—'):'R'+r2(calc(c).total)}${(P=>P?`<em class="cx-p">perim R${r2(P.x.total)}</em>`:'')(perimOf(c))}</b></button>`).join(''):'<div class="cx-none">None yet</div>'}</div>`};
  const menu=S.menu?`<div class="cx-menu v6menu">${['wall','roof','floor'].map(el=>`<button data-a="addel" data-v="${el}">${ELW[el]}</button>`).join('')}<button data-a="addel" data-v="slab">Floor – concrete slab</button></div>`:'';
  return `<div class="card cx">${XP?XP.leftRow():''}<div class="cx-hd"><h2>Constructions</h2><p>${esc(hdrTxt())}</p></div>
  ${grp('roof')}${grp('wall')}${grp('floor')}${grp('floor',1)}${XP?XP.openRow():''}
  <div class="cx-add"><button class="cx-addb" data-a="add" aria-expanded="${S.menu}"><span class="ms s18">add</span>Add a construction…<span class="ms s18 cv">${S.menu?'expand_less':'expand_more'}</span></button>${menu}</div>
</div>`}

/* concrete slab-on-ground: H1/AS1 Appendix E lookup (slabLookup in the model → window.SlabAppE) */
function slabMid(c){const s=c.v.slab=c.v.slab||{},L=slabLookup(c),f='v.slab.',sl=(k,o,d)=>selF(f+k,o,s[k]!=null?s[k]:d,'100%'),r2b=x=>(+x).toFixed(2),raft=s.sF==='raft';
  const ro=(v,u)=>`<span class="sb-ro mono">${+v?(+v).toFixed(1)+' '+u:'—'}</span>`;
  const ii=t=>`<span class="bchip sb-i" tabindex="0"><span class="ms">info</span><span class="tip">${esc(t)}</span></span>`;
  const sw=slabWarn(c),top=`${grpF('Area',ro(c.area,'m²'),'From Project page')}${grpF('Perimeter',ro(s.sP,'m'),'From Project page')}`,
    warnB=sw?`<div class="sb-warn${sw.w?'':' info'}"><span class="ms s18">${sw.w?'warning':'info'}</span><span>${esc(sw.t)} <button class="link-btn" data-a="sel" data-v="project">${sw.w?'Check them':'Edit them'} on the Project page</button></span></div>`:'';
  const notes=`<p class="sb-n">Leave out the garage, porch or other unconditioned slab when measuring area. The perimeter still includes the wall between the house and the garage (E.1.2.2). Two heated slabs that don’t touch (an unconditioned area between them) are calculated separately — make a slab construction for each (E.1.2.2 Comment 3).</p>
  <p class="sb-n">Tables are for the default soil conductivity λ = 2.0 W/(m·K) (E.1.2.1 Comment 5). Floor coverings such as carpet are not counted (2.1.3.1 a) iii)).${c.heated?'':' Heated floor: tick it at the top — embedded heating needs the Table 2.1.2.12 minimum.'}</p>`;
  const vm=`<label class="tgl sb-vm"><input type="checkbox" data-f="v.slab.vm1"${s.vm1?' checked':''}>R-value calculated to H1/VM1 Appendix E (manufacturer)</label><p class="sb-n">For what the tables don’t cover: insulation under or within a raft, a raft on piles, insulation over the slab or a topping slab, edge insulation other than R1.0.</p>`;
  if(s.vm1){const noSrc=!String(s.vmSrc||'').trim();return `<div class="card sbc"><div class="sb-g">${top}</div>${warnB}${vm}<div class="sb-g">${grpF('Construction R',ib(f+'vmR',s.vmR,'R'),+s.vmR>0?'':(()=>{const T=slabLookup(Object.assign({},c,{v:Object.assign({},c.v,{slab:Object.assign({},s,{vm1:false})})}));return T.ok?`Table value: R${T.Rtxt} — untick to use it`:''})())}${grpF('Source (required)',ib(f+'vmSrc',s.vmSrc,'',{text:1,w:'100%',ph:'e.g. manufacturer calculation ref.',bad:noSrc}))}</div>
    ${noSrc?'<p class="sb-r bad"><span class="ms s16">error</span>Enter the source of the H1/VM1 Appendix E calculation — the document and its reference.</p>':''}
    <p class="sb-r ${L.ok?'':'bad'}">${L.ok?'H1/VM1 Appendix E calculation — <b>R'+L.Rtxt+'</b>'+(L.src?' · source: '+esc(L.src):''):esc(L.why)}<em>Allowed by E.1.1.1 b). BRANZ House Insulation Guide 5th edition or earlier slab values are not acceptable (E.1.1.1 Comment 1).</em></p>${notes}</div>`}
  const segSel=(i,k,o,d)=>selF(f+'parts.'+i+'.'+k,o,(s.parts[i]||{})[k]!=null?s.parts[i][k]:d,'100%');
  s.parts=s.parts||[];
  const extra=s.parts.map((p,i)=>`<div class="sb-seg">${p.name?`<span class="sb-sl sb-nm">${esc(p.name)}</span>`:''}${grpF('Length',ib(f+'parts.'+i+'.len',p.len,'m'))}${grpF('Vertical edge insulation',segSel(i,'sE',[['none','None'],['r10','R1.0']],'none'))}${grpF('External wall cladding',segSel(i,'sWall',[['other','Other'],['masonry','Masonry veneer']],'other'))}<button class="v6btn sb-x" data-a="sbdel" data-v="${i}" title="Remove this part"><span class="ms s16">close</span></button></div>`).join('');
  const used=s.parts.reduce((a,p)=>a+(+p.len||0),0),rest=(+s.sP||0)-used;
  const segName=g=>g.rest?'Rest of the perimeter':(g.name?g.name+' · ':'')+(g.edge?'R1.0 edge':'no edge insulation')+' · '+(g.wall==='masonry'?'masonry':'other');
  const res=L.ok?(L.mixed?`<div class="sb-r"><div>A/P = ${r2b(L.ap)} (Eq ${L.eq}) — the same A/P for every part.</div><table class="sb-t"><tr><th>Part</th><th class="n">m</th><th>Table</th><th>A/P row · wall</th><th class="n">R</th></tr>${L.segs.map(g=>`<tr><td>${esc(segName(g))}</td><td class="n">${g.len.toFixed(2)}</td><td>${esc(g.table)}</td><td>${esc(g.apRow)} · ${esc(g.band)}</td><td class="n">${g.R.toFixed(1)}</td></tr>`).join('')}</table>
      <div>Equations E.3–E.5: R = 1 / Σ (Pᵢ/P ÷ Rᵢ) = <b>R${L.Rtxt}</b></div><em>A/P between two rows: the smaller row is used (no interpolation).</em></div>`
    :`<p class="sb-r">A/P = ${r2b(L.ap)} (Eq ${L.eq}) → <b>Table ${esc(L.table)}</b> · A/P row ${esc(L.apRow)} · wall ${esc(L.band)} → <b>R${L.Rtxt}</b><em>A/P between two rows: the smaller row is used (no interpolation).</em></p>`)
    :`<p class="sb-r ${L.none?'':'bad'}"><span class="ms s16">${L.none?'edit':'error'}</span>${L.ap!=null&&!/below 0\.6/.test(L.why)?'A/P = '+r2b(L.ap)+' · ':''}${esc(L.none?L.why:slabMsg(L))}</p>`;
  const uSel=sl('sU',[['none','None'],['s12','1.2 m perimeter strip R1.2'],['s24','1.2 m perimeter strip R2.4'],['f12','Full cover R1.2'],['f24','Full cover R2.4']],'none');
  return `<div class="card sbc"><div class="sb-g">${top}</div>${warnB}
  <div class="sb-q">${grpF('Foundation',sl('sF',[['raft','Concrete raft (waffle / pods)'],['slab','Conventional slab with footings']],'slab'))}
  ${grpF('Vertical edge insulation '+ii('Appendix E tables give R1.0 only. More than R1.0 adds little (E.1.2.1 Comment 4) — for other values use an H1/VM1 Appendix E calculation.'),sl('sE',[['none','None'],['r10','R1.0']],'none'))}
  ${grpF('Underslab insulation',raft?uSel.replace('<select','<select disabled'):uSel)}
  ${grpF('External wall cladding',sl('sWall',[['masonry','Masonry veneer'],['other','Other']],'other'))}</div>
  ${raft?'<p class="sb-n sb-raft">Pods or formers are not insulation — a raft without extra insulation is treated as uninsulated. For insulation under or within a raft, use a manufacturer’s H1/VM1 Appendix E calculation (option below).</p>':''}
  <div class="sb-g">${grpF('Measured on '+ii('Internal: A/P from the internal floor area and perimeter (Eq E.1). External: A/P − w/2 (Eq E.2), w the effective wall thickness below (entered in mm, used in metres). For masonry veneer, w is measured from the concrete edge below the step (E.1.2.2 Comment 1).'),sl('sM',[['int','Internal dimensions (Eq E.1)'],['ext','External dimensions (Eq E.2)']],'int'))}
  ${grpF('Effective wall thickness',ib(f+'sT',s.sT,'mm',{ph:'100'}))}</div>
  <p class="sb-n">Effective wall thickness: horizontal distance from the outer edge of the slab to the inside face of the wall; for masonry veneer, from the slab edge at floor level.</p>
  <div class="sb-parts"><div class="sb-ph"><b>Perimeter parts</b><span>Equations E.3–E.5 — add a part where the edge insulation or the wall type changes. Door and full-height window openings with no edge insulation under them count as “no edge insulation” perimeter (E.1.2.3 Comment).</span></div>
  <div class="sb-seg main"><span class="sb-sl">${s.parts.length?'Rest of the perimeter':'Whole perimeter'} <b class="mono">${rest.toFixed(2)} m</b> · ${s.sE==='r10'?'R1.0 edge':'no edge insulation'} · ${s.sWall==='masonry'?'masonry veneer':'other cladding'} (as above)</span></div>
  ${extra}<div class="sb-btns"><button class="v6btn sb-add" data-a="sbadd"><span class="ms s16">add</span>Add a perimeter part</button>${s.parts.some(p=>p.name==='Wall to garage')?'':'<button class="v6btn sb-add" data-a="sbgar"><span class="ms s16">garage</span>Add the house–garage wall</button>'}</div>
  <p class="sb-n">Thermally separating the garage slab with vertical edge insulation is recommended (E.1.2.1 Comment 1).</p></div>
  ${res}${notes}${vm}</div>`}
/* ---------- middle: one grammar for every construction ---------- */
/* what the user is typing is kept as typed ("3.", "0.", ".") as long as it means the stored number; numbers are shown with a leading zero */
const RAW={};
const lz=s=>typeof s==='string'&&/^-?\.\d/.test(s)?s.replace('.','0.'):s;
function rawOr(f,val){const r=RAW[f];if(r!=null){const pr=r.trim()===''||r==='.'||r==='-'?null:parseFloat(r),pv=val===''||val==null?null:parseFloat(val);if(pr===pv||(isNaN(pr)&&pv==null))return r;delete RAW[f]}return lz(nv(val))}
const ib=(f,val,cap,o)=>{o=o||{};return `<span class="ib${o.bad?' bad':''}"${o.w?` style="width:${o.w}"`:''}><input type="text" ${o.text?'':'inputmode="decimal" data-n="1" '}autocomplete="off" data-f="${f}" value="${esc(rawOr(f,val))}"${o.ph?` placeholder="${o.ph}"`:''}${o.dis?` disabled title="${esc(o.dis)}"`:''}><em>${cap}</em></span>`};
const selF=(f,opts,curv,w)=>{let g=false;const o=opts.map(([v,l,dis])=>{if(v==='§'){const s=(g?'</optgroup>':'')+`<optgroup label="${esc(l)}">`;g=true;return s}return `<option value="${v}"${String(curv)===String(v)?' selected':''}${dis?' disabled':''}>${esc(l)}</option>`}).join('')+(g?'</optgroup>':'');return `<select data-f="${f}"${w?` style="width:${w}"`:''}>${o}</select>`};
/* wall cladding: Fibre cement, Timber, Other — in the order of CLAD_DN (category, brand before generic); display names only */
function cladOpts(){const L=LIB.cladding,ord=Object.keys(CLAD_DN),out=[];
  [['fc','Fibre cement'],['tb','Timber'],['br','Brick veneer'],['ot','Other']].forEach(([g,lbl])=>{const it=L.map((o,j)=>j).filter(j=>(L[j].grp||'ot')===g).sort((a,b)=>{const x=ord.indexOf(L[a].n),y=ord.indexOf(L[b].n);return(x<0?999:x)-(y<0?999:y)});
    if(!it.length)return;out.push(['§',lbl]);it.forEach(j=>out.push([j,(L[j].dn||L[j].n)+(L[j].vsrc&&/generic/.test(L[j].dn||'')?' *':'')]))});return out}
/* wall cladding as three dropdowns: material → brand (only where there is more than one) → product. Only the product is stored */
const CLG=[['fc','Fibre cement'],['tb','Timber'],['br','Brick veneer'],['ot','Other']],CLBR=[...CLAD_BR,'Generic'];   /* brands from js/products.js, then Generic */
const cladIn=(g,b)=>{const L=LIB.cladding,ord=Object.keys(CLAD_DN);return L.map((o,j)=>j).filter(j=>(L[j].grp||'ot')===g&&(b==null||L[j].brand===b)).sort((x,y)=>{const a=ord.indexOf(L[x].n),c=ord.indexOf(L[y].n);return(a<0?999:a)-(c<0?999:c)})};
const cladBrands=g=>CLBR.filter(b=>cladIn(g,b).length);
function cladSel(f,m){const L=LIB.cladding,o=L[m]||L[0],g=o.grp||'ot',brs=cladBrands(g),b=brs.length>1?o.brand:null;
  const mk=(kind,opts,cur,t)=>`<select data-f="${f}" data-cl="${kind}" title="${t}">${opts.map(([v,l])=>`<option value="${esc(v)}"${String(cur)===String(v)?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
  return `<span class="v6clsel">${mk('g',CLG,g,'Cladding material')}${b?mk('b',brs.map(x=>[x,x]),b,'Brand'):''}</span>`+
    selF(f,cladIn(g,b).map(j=>[j,L[j].pn+(L[j].vsrc&&L[j].brand==='Generic'&&g!=='ot'?' *':'')]),m)}
const grpF=(label,inner,note)=>`<div class="fgrp"><span class="glbl">${label}</span><div class="ginputs">${inner}</div>${note?`<span class="fcalc">${note}</span>`:''}</div>`;
const halfChip=t=>`<span class="bchip v6half">${t}</span>`;
function lrow(num,id,name,body,r,cls,chip){return `<div class="lrow ${cls||''}"${id?` data-layer="${id}" tabindex="0"`:''}><span class="lnum"${num==='·'?' style="background:transparent;border-style:dashed"':''}>${num}</span><div><div class="lname">${name}${chip||''}</div>${body||''}</div><div class="lr">${r}</div></div>`}
function header(c,t,x){const m=minOf(c),ok=x.total>=m.r-1e-9,P=perimOf(c),RT=t.slab?(x.slab&&x.slab.ok?x.slab.Rtxt:'—'):r2(x.total);
  const ck=t.slab?(c.heated?[[ok?'pass':'fail',`${ok?'Meets':'Below'} heated floor minimum R${m.r.toFixed(1)} (Table 2.1.2.12)`]]:(x.slab&&!x.slab.ok&&!x.slab.none?[['fail',esc('No R-value: '+slabMsg(x.slab))]]:x.slab&&x.slab.none?[['review',esc(x.slab.why)]]:[['pass','No 2.1.2.11 minimum for slab-on-ground — its R goes into the heat-loss calculation']])):[[ok?'pass':'fail',`${P?'Field: ':''}${ok?'Meets':'Below'} ${m.cl} minimum R${m.r.toFixed(1)}`]];
  phys(c).forEach(p=>ck.unshift(['fail',esc(p.label+': '+p.msg)]));
  if(c.el==='wall'&&t.vented&&(LIB.cladding[(c.v.clad||{}).m||0]||{}).still)ck.push(['review','The outside of this wall faces still air (garage or roof space) — a wall like this usually has no vented cavity. Untick “Vented cavity” unless there really is one; the outside surface is not halved here.']);
  if(isStrat(c))strategy(c).checks.forEach(k=>ck.push([k.sev,esc(k.text)]));
  if(c.el==='wall'&&c.kind!=='block'){const e3=x.total>=1.5-1e-9;ck.push([e3?'pass':'review',`${e3?'Meets':'Below'} E3/AS1 R1.5`])}
  if(c.batMsg)ck.unshift(['review',esc(c.batMsg)+` <button class="link-btn" data-a="batok">OK</button>`]);
  if(c.ffMsg)ck.unshift(['review',esc(c.ffMsg)+` <button class="link-btn" data-a="ffok">OK</button>`]);
  const kinds=KINDS[c.el].map(k=>[k.id,k.name]).concat((LATER[c.el]||[]).map(l=>['',l+' — phase 2',1]));
  const opts=(t.opts||[]).map(o=>{const box=`<label class="tgl"><input type="checkbox" data-f="o.${o.id}"${o.on?' checked':''}>${esc(o.label)}</label>`;
    return o.id==='perim'?`<span class="v6optg">${box}<span class="v6hint">Tick only for the perimeter strip — add it as its own construction.</span></span>`:box}).join('');
  const SG0=isStrat(c)?strategy(c):null,pTgl=SG0?`<label class="tgl"><input type="checkbox" data-f="perimTgl"${SG0.per!=='none'?' checked':''}>Ceiling perimeter</label>`:'';
  const heat=`<label class="tgl v6heat"><input type="checkbox" data-f="heated"${c.heated?' checked':''}>Heated ${c.el==='roof'?'ceiling':c.el}</label>`+(t.slab?`<span class="v6sx sb-hn">Embedded heating: minimum R2.5 (zones 1–3), R2.8 (zone 4), R3.0 (zones 5–6) — other elements can’t make up for it (Table 2.1.2.12). Not required for heating only in rooms with a shower, bath or toilet, or for a floor between two heated floors (not part of the envelope).</span>`:'')+(c.heated?`<label class="tgl v6heat"><input type="checkbox" data-f="heatWet"${c.heatWet?' checked':''}>Only in rooms with a shower, bath or toilet</label>`:'');
  const SD=XP&&XP.hasSide(c)?XP.SIDES:null,sdv=SD?(c.side||(c.kind==='it'?'':'out')):'';
  const fold=SD&&sdv==='out'&&c.el==='wall'&&c.kind!=='it'&&!c.sideAsk&&!SOPEN.has(c.id);
  const side=!SD?'':fold?`<div class="v6side v6sfold"><span class="v6sx">Other side: Outside air · <button class="link-btn" data-a="sideopen">change</button></span></div>`:`<div class="v6side${c.sideAsk||!sdv?' ask':''}"><label><span class="glbl">${XP.SIDEQ(c)}</span><select data-f="side">${(sdv?[]:[['','Choose…']]).concat(SD).map(([k,l])=>`<option value="${k}"${sdv===k?' selected':''}>${esc(l)}</option>`).join('')}</select></label>${c.sideAsk?`<span class="v6sa"><span class="ms s16">help</span>Confirm what is on the other side of this wall (2.1.2.4)<button class="v6btn" data-a="psideok" data-v="${c.id}">Confirmed</button></span>`:!sdv?'<span class="v6sa"><span class="ms s16">help</span>Choose what is on the other side — counted in the meantime.</span>':sdv?`<span class="v6sx">${esc(XP.SIDEHELP[sdv])}${sdv==='cond'?' Not counted in the heat loss, gross wall area, glazing ratio or reference building.':''}</span>`:''}</div>`;
  return `<div class="card-hd v6hd"><div class="v6hd-a"><input type="text" class="v6name" data-f="name" value="${esc(c.name)}" autocomplete="off" aria-label="Construction name">
  ${P?`<div class="v6R2"><span><em>Field</em><b class="mono">R${r2(x.total)}</b></span><span${P.x.total<pminOf(c)-1e-9?' class="bad"':''}><em>Perimeter ${P.E.W} mm</em><b class="mono">R${r2(P.x.total)}</b></span></div>`:`<b class="v6R mono">${RT==='—'?RT:'R'+RT}</b>`}
  <div class="v6btns"><button class="v6btn" data-a="dup"><span class="ms s16">content_copy</span>Duplicate</button><button class="v6btn" data-a="del"${S.list.length<2?' disabled':''}><span class="ms s16">delete</span>Delete</button></div></div>
  ${side}<div class="v6ck">${ck.map(([s,tx])=>`<div class="v6ci"><i class="cx-dot ${s}"></i><span>${tx}</span></div>`).join('')}</div>
  ${x.notes.length?`<div class="v6notes">${x.notes.map(n=>`<div class="v6nt"><span class="ms s16">info</span><span>${esc(n)}</span></div>`).join('')}</div>`:''}
  <label class="v6lab"><span class="glbl">Type</span>${selF('kind',kinds,t.kind)}</label>
  <div class="v6opts">${opts||pTgl?`<div class="v6o1">${opts}${pTgl}</div>`:''}${heat}</div>${SG0?eavesBox(c,SG0):''}</div>`}
function midCol(c,x){const hd=header(c,tpl(c),x),SG=isStrat(c)?strategy(c):null;c=SG?SG.ce:c;const t=tpl(c);
  if(t.slab)return hd+slabMid(c);
  if(t.manual)return hd+`<div class="stack">${lrow(1,null,'Construction R-value',`<div class="lctl">${ib('manualR',c.manualR,'R')}</div><div class="lsub">Entered directly — keep the source with the consent documents.</div>`,r2(x.total))}</div>`;
  const rows=[],num={};let k=0;
  t.slots.forEach((s,i)=>{num[i]=++k;if(s.id==='roof'&&rLink((c.v.roof||{}).m))k+=2});
  const first=x.rows[0],last=x.rows[x.rows.length-1];
  rows.push(lrow('·',null,first.name,'',r2(first.r),'fixed',first.half?halfChip('halved · vented cavity'):''));
  t.slots.forEach((s,i)=>{
    const v=val(c,s.id),row=x.rows.find(r=>r.i===i),half=t.vented&&s.ext,chip=half?halfChip('halved · outside the vented cavity'):'';
    const host=x.rows.find(r=>r.kind==='frame'&&r.slots&&r.slots.includes(i)&&r.i!==i),cnt=host&&s.k!=='frame'?cntChip(num[host.i]):'';
    if(s.k==='mat'){const m=matR(s,v),f='v.'+s.id;
      const body=`<div class="lctl v6mat${s.lib==='cladding'&&v.m!==-1?' v6clad':''}">${s.lib==='cladding'&&v.m!==-1?cladSel(f+'.m',v.m||0):selF(f+'.m',(v.m===-1&&v.lm?[[-1,v.lm.n+' — saved earlier']]:[]).concat((s.lib==='cladding'?cladOpts():LIB[s.lib].map((o,j)=>[j,o.n]))),v.m===-1&&v.lm?-1:v.m||0)}${ib(f+'.r',r2(m.r),'R',{w:'74px'})}${m.over?`<span class="v6ent">R entered — thickness not used</span><button class="link-btn" data-a="reset" data-v="${s.id}">Reset</button>`:''}</div>`;
      rows.push(lrow(num[i],s.id,s.label,body,row?r2(row.r):r2(m.r*(half?.5:1)),'',chip));
      const L=s.id==='roof'&&rLink(v.m);
      if(L){const by=`<span class="chip-set"><span class="ms">link</span>Set by ${esc(m.m.n)}</span>`;
        rows.push(lrow(num[i]+1,'roof','Underlay',`<div class="lockrow"><span class="lockval"><span class="ms s16">lock</span>${L[0]}</span>${by}</div>`,''));
        rows.push(lrow(num[i]+2,'roof','Substrate',`<div class="lockrow"><span class="lockval"><span class="ms s16">lock</span>${L[1]}</span>${by}</div>`,''))}}
    else if(s.k==='ins'&&s.opt&&!ovOn(v)){rows.push(lrow(num[i],s.id,s.label,`<label class="tgl v6ovt"><input type="checkbox" data-f="v.over.on">Add a second layer of insulation over the framing</label>`,'','',''))}
    else if(s.k==='ins'&&SG&&s.id==='over'){const on=S.af==='over';rows.push(lrow(num[i],s.id,s.label,`${s.opt?'<label class="tgl v6ovt"><input type="checkbox" data-f="v.over.on" checked>Add a second layer of insulation over the framing</label>':''}<div class="lctl">${ib('v.over.r',v.r,'R',{w:'74px'})}<label class="v6prod v6thk"><span class="glbl">Thickness</span>${ib('v.over.t',v.t,'mm',{w:'84px'})}</label><label class="v6prod"><span class="glbl">Product (optional)</span><input type="text" data-f="v.over.prod" value="${esc(v.prod)}" autocomplete="off"></label></div><div class="lsub">${on?'<span class="ms s16">arrow_forward</span>Pick a product in the Pink® Batts® list on the right, or enter R and thickness (Custom).':'Click this row to fill it from the Pink® Batts® list.'}</div>`,row?r2(row.r):r2((+v.r||0)*(half?.5:1)),'',chip+cnt).replace('<div class="lrow ',`<div data-a="af" data-v="over" class="lrow v6pick${on?' v6act':''} `))}
    else if(s.k==='ins'&&c.fkey&&c.fkey!=='own'){const fi=t.slots.findIndex(z=>z.id==='fr');rows.push(lrow(num[i],s.id,s.label,`<div class="v6from"><span class="mono">R${(+v.r).toFixed(1)} · ${v.t} mm</span><span>${esc(v.prod||'')} — the upper layer of the row ${num[fi]} insulation</span></div>`,row?r2(row.r):'','',chip+cnt))}
    else if(s.k==='ins')rows.push(lrow(num[i],s.id,s.label,`<div class="lctl">${ib('v.'+s.id+'.r',v.r,'R',{w:'74px'})}<label class="v6prod v6thk"><span class="glbl">Thickness</span>${ib('v.'+s.id+'.t',v.t,'mm',{w:'84px'})}</label><label class="v6prod"><span class="glbl">Product (optional)</span><input type="text" data-f="v.${s.id}.prod" value="${esc(v.prod)}" autocomplete="off"></label></div>`,row?r2(row.r):r2((+v.r||0)*(half?.5:1)),'',chip+cnt));
    else if(s.k==='fix'&&s.id==='vcav'&&!isUnl(c,'vcav'))rows.push(lrow(num[i],'vcav',s.label,`<div class="lockrow"><span class="lockval"><span class="ms s16">lock</span>20 mm drained cavity (E2/AS1) · R${r2(v.r!=null?v.r:s.r)}</span>${lockBtn('vcav','unl')}<span class="v6dv">Default value — unlock to change</span></div>`,row?r2(row.r):r2(v.r!=null?v.r:s.r),'',cnt));
    else if(s.k==='fix'&&s.id==='rspace'&&t.kind==='truss'&&!isUnl(c,'rspace'))rows.push(lrow(num[i],'rspace',s.label,`<div class="lockrow"><span class="lockval"><span class="ms s16">lock</span>${r2(v.r!=null?v.r:s.r)}</span>${lockBtn('rspace','unl')}<span class="v6dv">Default value — unlock to change</span></div>`,r2(s.r),'',cnt));
    else if(s.k==='fix')rows.push(lrow(num[i],null,s.label,`<div class="lctl">${ib('v.'+s.id+'.r',v.r!=null?v.r:s.r,'R',{w:'74px'})}</div>`,row?r2(row.r):r2(v.r!=null?v.r:s.r),'',cnt));
    else if(s.k==='gap')rows.push(lrow(num[i],s.id,s.label,`<div class="lctl v6mat">${selF('v.'+s.id+'.m',LIB.gap.map((o,j)=>[j,o.n]),v.m||0)}</div>`,row?r2(row.r):r2(LIB.gap[v.m||0].r),'',cnt));
    else if(c.el==='roof'&&s.id==='st'&&!isUnl(c,'st')){const bw=+v.w||BAT0.w,bd=+v.d||BAT0.d,bs=+v.s||BAT0.s,bi=+v.insR;
      rows.push(lrow(num[i],'st',s.label,`<div class="lockrow"><span class="lockval"><span class="ms s16">lock</span>${bw} × ${bd} @ ${bs} mm</span>${lockBtn('st','unl')}<span class="v6dv">Default value — unlock to change</span></div><div class="lsub">${BATTXT}${bi?' · insulation R'+r2(bi)+' between the battens':''} → layer R ${r2(layerR(c,s))} on its own.</div>`,r2(layerR(c,s)),'',''))}
    else rows.push(SG&&(s.member==='chord'||s.member==='batten')?trussCard(c,t,s,i,v,x,num):frameCard(c,t,s,i,v,x,num));
  });
  if(last.name==='Subfloor space')rows.push(lrow('·',null,'Subfloor space',`<div class="lctl">${ib('subR',c.subR,'R',{w:'74px'})}</div><div class="lsub">From NZS 4214 Table E5 for your subfloor.</div>`,r2(last.r)));
  else rows.push(lrow('·',null,last.name,'',r2(last.r),'fixed'));
  {const P=perimOf(c);rows.push(`<div class="lrow v6tot"><span class="lnum"></span><div><div class="lname">Construction R-value${P?' · field':''}</div></div><div class="lr">${r2(x.total)}</div></div>`);
   if(P)rows.push(`<div class="lrow v6tot"><span class="lnum"></span><div><div class="lname">Construction R-value · perimeter ${P.E.W} mm</div></div><div class="lr">${r2(P.x.total)}</div></div>`)}
  return hd+`<div class="stack v6stack">${rows.join('')}</div>`}

function eavesBox(c,st){const e=c.v.edge=c.v.edge||{},G=st.G,f='v.edge.',r1=x=>(+x).toFixed(1);
  let h=`<div class="v6eave"><div class="frow">${grpF('Minimum roof pitch',ib(f+'pitch',e.pitch,'°'))}${grpF('Heel height',ib(f+'heel',e.heel,'mm',{ph:'std '+Math.round(G.tcv)}))}<span class="v6eh">Room at the heel (top plate centreline) <b class="mono">${r1(G.H)} mm</b> — each layer needs its thickness + 25 mm ventilation gap.</span></div><div class="v6eh v6pn">Enter the lowest pitch of this roof. It sets the room at the heel, which decides whether the insulation fits.</div>`;
  if(st.per!=='none'){h+=`<div class="frow">${grpF('Ceiling perimeter',selF(f+'psel',[['product','Perimeter product'],['comp','Compressed insulation (BRANZ slices)']],st.per,'260px'))}${grpF('Strip width',ib(f+'width',e.width,'mm'))}</div>`;
    h+=st.per==='product'?`<div class="frow">${grpF('Perimeter product',ib(f+'pprod',e.pprod!=null?e.pprod:st.pp.name,'',{text:1,w:'200px'}))}${grpF('R',ib(f+'pR',e.pR,'R',{ph:'2.7'}))}${grpF('Thickness',ib(f+'pT',e.pT,'mm',{ph:'100'}))}${grpF('Width',ib(f+'pW',e.pW,'mm',{ph:'560'}))}</div>`
      :`<div class="frow">${grpF('Compressed product',ib(f+'cpName',e.cpName!=null?e.cpName:st.cp.name,'',{text:1,w:'200px'}))}${grpF('R',ib(f+'cpR',e.cpR,'R',{ph:'7.0'}))}${grpF('Thickness',ib(f+'cpT',e.cpT,'mm',{ph:'275'}))}</div>
      <div class="frow">${grpF('Insulation type',selF(f+'n',[[0.24,'Glass wool · n 0.24'],[0.3,'Polyester or wool · n 0.30'],[0,'Rigid board · n 0']],e.n!=null&&e.n!==''?e.n:0.24,'220px'))}${grpF('Manufacturer compressed R',ib(f+'rOver',e.rOver,'R',{ph:st.cs?r2(st.cs.rAvg):''}))}</div>`;
    h+=`<div class="v6eh">Perimeter part: ${st.per==='product'?esc(st.pp.name+' R'+st.pp.R.toFixed(1)+' · '+st.pp.T+' mm'):'compressed '+esc(st.cp.name+' R'+st.cp.R.toFixed(1))+' under an insulation guard'} · RT <b class="mono">${r2(st.pRT)}</b> · its own sheet in the PDF (2.1.2.9). Areas are entered on the Project page.</div>`}
  return h+'</div>'}
/* truss roof: framing on the left, insulation on the right */
function trussCard(c,t,s,i,v,x,num){
  const o=cur(),st=strategy(o),e=o.v.edge=o.v.edge||{},d=MEMBER[s.member],ov0=o.v[s.id]||{},depth=+ov0.d||d.d,F=frac(s,ov0,o),f='v.'+s.id;
  const row=x.rows.find(r=>r.i===i&&r.kind==='frame'),R=r2(layerR(c,s)),k=D.kTimber,tR=depth/1000/k;
  const mv=ov0.mode==='pct'&&ov0.p38?'p38':(ov0.mode||'std');
  const left=`<div class="v6col"><div class="v6colh">Framing</div><div class="frow">${grpF('Depth',ib(f+'.d',ov0.d,'mm'))}${grpF('Width',ib(f+'.w',ov0.w,'mm'))}${grpF('Centres',ib(f+'.s',ov0.s,'mm'))}</div>
    <div class="frow">${grpF('Framing fraction',selF(f+'.mode',[['std','Width ÷ centres'],['pct','Enter a percentage']],mv==='p38'?'pct':mv,'190px'))}${mv==='pct'?grpF('Percentage',ib(f+'.pct',ov0.pct,'%')):''}</div>
    <div class="v6calc"><div><span>Framing fraction</span><b class="mono">${p1(F.f)}</b><i>${mv==='std'?esc(F.how)+' = '+p1(F.f):mv==='p38'?'38% default':'entered'}</i></div><div><span>Timber R</span><b class="mono">${r2(tR)}</b><i>${(depth/1000).toFixed(3)} ÷ ${k.toFixed(2)} = ${r2(tR)}</i></div></div></div>`;
  if(s.member==='batten'){const on=!!(ov0.addIns||+ov0.insR),Rc=on&&+ov0.insR?+ov0.insR:D.emptyGap,Rl=1/(F.f/tR+(1-F.f)/Rc);
    return `<div class="lrow v6bat" data-layer="${s.id}" tabindex="0"><span class="lnum">${num[i]}</span><div><div class="lname">${esc(s.label)}</div>
    <div class="frow">${grpF('Depth',ib(f+'.d',ov0.d,'mm'))}${grpF('Width',ib(f+'.w',ov0.w,'mm'))}${grpF('Centres',ib(f+'.s',ov0.s,'mm'))}<label class="tgl"><input type="checkbox" data-f="${f}.addIns"${on?' checked':''}>Add insulation between the battens</label></div>
    ${on?`<div class="frow">${grpF('Insulation R',ib(f+'.insR',ov0.insR,'R'))}${grpF('Thickness',ib(f+'.insT',ov0.insT,'mm'))}</div>`:''}
    <div class="lsub">${p1(F.f)} timber (${esc(F.how)}) R${r2(tR)} · ${on&&+ov0.insR?'insulation R'+r2(Rc):'still air R'+r2(D.emptyGap)} → layer R ${r2(Rl)} on its own; counted in the bridged portion with the chords (2.1.3.2).</div></div><div class="lr">${r2(Rl)}</div></div>`}
  const on=S.af===s.id,fr=ov0;
  const thick=+fr.insT>depth&&+fr.insR>0,cvr=`<label class="tgl v6cvr${thick?'':' dis'}"><input type="checkbox" data-f="${f}.cover"${thick&&fr.cover?' checked':''}${thick?'':' disabled'}>Insulation covering bottom chord</label><div class="lsub v6cvn">${thick?"When using this option make sure that the insulation product is suitable - typically manufactured at 460mm width":'The insulation is not thicker than the bottom chord — there is nothing to cover the chord.'}</div>`;
  const right=`<div class="v6col"><div class="v6colh">Insulation</div><div class="frow">${grpF('Insulation R',ib(f+'.insR',fr.insR,'R'))}${grpF('Thickness',ib(f+'.insT',fr.insT,'mm'))}</div>${cvr}
    <div class="lsub">${on?'<span class="ms s16">arrow_forward</span>Pick a product in the Pink® Batts® list on the right, or enter R and thickness (Custom).':'Click this row to fill it from the Pink® Batts® list.'}${fr.prod?' · '+esc(fr.prod):''}</div>
    ${XP?XP.suggHTML(o):''}</div>`;
  const act=S.af===s.id;
  return `<div class="flayer v6fl v6tc${act?' v6act':''}" data-a="af" data-v="${s.id}">
  <div class="flh" data-layer="${s.id}" tabindex="0"><span class="lnum">${num[i]}</span><div><div class="fname"><span class="ficon"><span class="ms">forest</span></span><h3>${esc(s.label)}</h3></div>
  <div class="v6chips"><span class="bchip" tabindex="0"><span class="ms">info</span>Bridged portion<span class="tip">Framing bridges the insulation here, so the standard treats it as parallel heat paths (H1/AS1 2.1.3.2).</span></span></div>
  <div class="fsub">${esc(d.name)}${s.member==='chord'?' with insulation between and over them':' with still air or insulation between them'}</div></div><div class="lr">${R}</div></div>
  ${trussBody(o,s,ov0,F,depth,row,f,mv,fr,cvr,on,x,i,num,tR)}</div>`}
/* truss bottom chords: the same three blocks as the other framing layers — frame, insulation (full width), result strip */
function trussBody(o,s,ov0,F,depth,row,f,mv,fr,cvr,on,x,i,num,tR){const gn=groupNote(x,i,num),lk=mv==='std'&&!isUnl(o,s.id+'.ff');
  const fracL=lk?`<div class="lctl v6frac"><span class="glbl">Framing fraction</span><div class="lockrow"><span class="lockval"><span class="ms s16">lock</span>${esc(F.how)} = ${p1(F.f)}</span>${lockBtn(s.id+'.ff','unl')}<span class="v6dv">Chord width ÷ chord spacing — unlock to enter a percentage</span></div></div>`
    :`<div class="frow">${grpF('Framing fraction',selF(f+'.mode',[['std','Width ÷ centres'],['pct','Enter a percentage']],mv==='p38'?'pct':mv,'190px'))}${mv!=='std'?grpF('Percentage',ib(f+'.pct',ov0.pct,'%')):''}<b class="mono v6fv">${p1(F.f)}</b></div>`;
  const frame=`<div class="v6wf v6ff1"><div class="frow">${grpF('Depth',ib(f+'.d',ov0.d,'mm'))}${grpF('Width',ib(f+'.w',ov0.w,'mm'))}${grpF('Centres',ib(f+'.s',ov0.s,'mm'))}</div>${fracL}</div>`;
  const ins=`<div class="v6pp cav v6wins"><div class="v6pph"><span>Insulation between the bottom chords</span></div><div class="frow">${grpF('Insulation R',ib(f+'.insR',fr.insR,'R'))}${grpF('Thickness',ib(f+'.insT',fr.insT,'mm'))}</div>
    <div class="lctl v6tcv">${cvr}</div><div class="lsub">${on?'<span class="ms s16">arrow_forward</span>Pick a product in the Pink® Batts® list on the right, or enter R and thickness (Custom).':'Click this row to fill it from the Pink® Batts® list.'}${fr.prod?' · '+esc(fr.prod):''}</div>${XP?XP.suggHTML(o):''}</div>`;
  let bar='';if(row&&row.regions){const pc=q=>{const p=q*100;return(Math.abs(p-Math.round(p))<.05?Math.round(p):p.toFixed(1))+'%'},two=row.regions.length===2&&!gn,sh=two?row.shared||0:0,t0=two?row.regions[0].r:tR,t1=two?row.regions[1].r:(+fr.insR||0)*(fr.cover&&+fr.insT>depth?depth/(+fr.insT):1);
    bar=`<div class="v6wr"><div class="v6wrb"><i style="width:${(F.f*100).toFixed(1)}%"></i><i></i></div><div class="v6wrl"><span><b>Through the timber ${pc(F.f)}</b> · R${r2(t0+sh)} <em>(chord ${depth} mm ${r2(tR)}${two&&t0-tR>.005?' + '+r2(t0-tR):''}${sh?' + '+r2(sh):''})</em></span><span><b>Through the insulation ${pc(1-F.f)}</b> · R${r2(t1+sh)}${sh?` <em>(${r2(t1)} + ${r2(sh)})</em>`:''}</span></div>
    ${gn?'<p class="lsub">This layer’s own paths — the combined value is below.</p>':`<p class="lsub">Bridged portion (2.1.3.2) — the two paths in parallel: R${r2(row.r)}</p>`}</div>`}
  return `<div class="v6fb v6wall">${frame}${ins}${bar}${gn}</div>`}
/* insulation products: js/products.js. [name, R, thickness mm, width mm, note, brand] */
/* listed by R-value, then thickness — never by brand or file order (the listing rules on for-manufacturers.html) */
const RPI=window.RVC_PRODUCTS.insulation,pbT=L=>L.slice().sort((a,b)=>a.r-b.r||a.t-b.t).map(p=>[p.name,p.r,p.t,p.w,p.note,p.brand]);
const PB_CEIL=pbT(RPI.ceiling),PB_SKILL=pbT(RPI.skillion);
/* a list's heading and source line name the brands in it */
const brandsOf=L=>[...new Set(L.map(p=>p[5]))],pbHead=L=>'Insulation · '+brandsOf(L).join(' · '),pbSrc=L=>brandsOf(L).map(b=>RPI.sources[b]||b+' declared values.').join(' ');
const pbList=m=>m==='chord'?PB_CEIL:m==='rafter'?PB_SKILL:null;
/* one product row: R · thickness · width, name, chips */
const pbRow=(p,chips,max)=>`<button class="prow2 v6pr" data-a="prod" data-r="${p[1]}" data-t="${p[2]}" data-n="${esc(p[0])}"><b>R${p[1].toFixed(1)} · ${max?'max ':''}${p[2]} mm</b><em>${esc(p[0])} · ${p[3]} mm wide${p[4]==='two'?'<br>Two-layer system with Superbatts®':''}</em>${chips.length?`<span class="pchips">${chips.join('')}</span>`:''}</button>`;
const cntChip=k=>`<span class="v6cnt" title="H1/AS1 2.1.3.2: an insulation layer or air cavity next to framing joins the bridged portion.">Counted in ${k}</span>`;
const MWORD={stud:['Stud','studs'],chord:['Chord','chords'],rafter:['Rafter','rafters'],joist:['Joist','joists'],batten:['Batten','battens']};
const pline=(n,r,tip)=>`<div class="v6pl"${tip?` title="${esc(tip)}"`:''}><span>${n}</span><b class="mono">${r2(r)}</b></div>`;
function frameCard(c,t,s,i,v,x,num){
  const d=MEMBER[s.member],depth=+v.d||d.d,F=frac(s,v,c),isWall=s.member==='stud',f='v.'+s.id;
  const row=x.rows.find(r=>r.i===i&&r.kind==='frame'),merged=row&&row.name!==s.label;
  const host=!row&&x.rows.find(r=>r.kind==='frame'&&r.name.includes(s.label));
  const R=r2(layerR(c,s)),own=row&&!merged,W=MWORD[s.member]||['Member','members'];
  const pathR=j=>own?` · R${r2(row.regions[j].r+row.shared)}`:'';
  const tipParts=own?(row.sharedParts||[]).map(q=>q.name):[];
  const sharedL=own&&row.shared>0?pline('On every path',row.shared,tipParts.join(' + ')):'';
  const pfoot=j=>own?`<div class="v6pf">${pline(j?'Between the '+W[1]:W[0]+' '+depth+' mm',row.regions[j].r)}${sharedL}</div>`:'';
  /* floor joists: the usual engineered size is shown locked — unlock to change it (this visit only) */
  const jLock=c.el==='floor'&&s.member==='joist'&&!isUnl(c,s.id);
  const sizes=jLock?`<div class="lockrow"><span class="lockval"><span class="ms s16">lock</span>Joists ${+v.d||MEMBER.joist.d} × ${+v.w||MEMBER.joist.w} @ ${+v.s||MEMBER.joist.s} mm</span>${lockBtn(s.id,'unl')}<span class="v6dv">Typical engineered size — unlock to change</span></div>`:grpF('Depth',ib(f+'.d',v.d,'mm'))+grpF('Width',ib(f+'.w',v.w,'mm'))+grpF('Centres',ib(f+'.s',v.s,'mm'))+(isWall?grpF('Dwangs at',ib(f+'.dw',v.dw,'mm')):'');
  const modes=isWall?[['std','🔒 H1/AS1 default 38% (2.1.3.1 a) i))'],['dem','Custom — demonstrated for this building (evidence required)']]:[['std','Width ÷ centres'],['pct','Enter a percentage']];
  if(isWall){const dem=v.mode==='dem',pc=+v.pct,bad=dem&&!(pc>=10&&pc<=60),noEv=dem&&pc<38&&!String(v.ev||'').trim(),w0=+v.w||MEMBER.stud.w,s0=+v.s||MEMBER.stud.s;
    var wallFF=`<div class="lctl v6frac v6ffw"><span class="glbl">Framing fraction</span>${selF(f+'.mode',modes,dem?'dem':'std','100%')}<b class="mono v6fv">${p1(F.f)}</b></div>
    ${dem?`<div class="v6ffd"><div class="frow">${grpF('Framing fraction',ib(f+'.pct',v.pct,'%',{w:'72px',bad}),bad?'10–60%':'')}</div><div class="v6ev">${grpF('Evidence (required)',ib(f+'.ev',v.ev,'',{text:1,w:'100%',ph:'Frame take-off from the frame manufacturer’s shop drawings dated … : timber area ÷ wall area, openings excluded',bad:noEv}))}</div>
      <p class="lsub">A lower fraction must be demonstrated for this building (2.1.3.1 a) i)). Attach the take-off to the consent documents. Stud width ÷ centres alone is not a demonstration — it leaves out plates, lintels, trimmers, corners and nogs.</p>
      <p class="lsub v6ref">Studs only: ${w0} ÷ ${s0} = ${p1(w0/s0)} (reference, not a demonstration)</p>
      ${noEv?`<p class="v6ffwarn"><span class="ms s16">warning</span>${esc(FFEV)}</p>`:''}</div>`:'<p class="lsub">Framed walls: 38% framing unless a lower fraction is demonstrated for this building (2.1.3.1 a) i)).</p>'}`}
  /* roofs and floors: width ÷ centres, shown locked; unlock to enter a percentage (this visit only) */
  const fLock=!isWall&&(v.mode||'std')==='std'&&!isUnl(c,s.id+'.ff');
  const fracRow=isWall?wallFF:fLock?`<div class="lctl v6frac"><span class="glbl">Framing fraction</span><div class="lockrow"><span class="lockval"><span class="ms s16">lock</span>${esc(F.how)} = ${p1(F.f)}</span>${lockBtn(s.id+'.ff','unl')}<span class="v6dv">${W[0]} width ÷ ${W[0].toLowerCase()} spacing — unlock to enter a percentage</span></div></div>`:`<div class="lctl v6frac"><span class="glbl">Framing fraction</span>${selF(f+'.mode',modes,v.mode||'std','230px')}${(v.mode||'std')==='pct'?ib(f+'.pct',v.pct,'%',{w:'64px'}):''}<b class="mono v6fv">${p1(F.f)}</b><span class="fcalc">${(v.mode||'std')==='std'&&!isWall?'Framing fraction '+esc(F.how)+' = '+p1(F.f)+' ('+W[0].toLowerCase()+' width ÷ '+W[0].toLowerCase()+' spacing)':esc(F.how)}</span></div>`;
  const tl=`<div class="v6pp tim"><div class="v6pph"><span>Through the timber</span><span class="mono">${p1(F.f)}${pathR(0)}</span></div>${s.brk?`<div class="frow">${grpF('Thermal break strip R',ib(f+'.brkR',v.brkR,'R',{bad:!(+v.brkR>0)}))}${grpF('Thickness (shown only)',ib(f+'.brkT',v.brkT,'mm'))}</div><p class="lsub">From the strip manufacturer, e.g. a polystyrene or PIR strip fixed along the ${W[1]}. Only the timber path gets it.</p>`:''}${pfoot(0)}</div>`;
  const tr=`<div class="v6pp cav"><div class="v6pph"><span>Through the cavity</span><span class="mono">${p1(1-F.f)}${pathR(1)}</span></div>
  ${c.fkey&&s.id==='fr'?`<div class="v6lock"><span class="lockval"><span class="ms s16">lock</span>R${(+v.insR).toFixed(1)} · ${v.insT} mm · ${esc(v.prod||'')}</span><span class="chip-set"><span class="ms">link</span>Set by Insulation strategy</span></div>`:`<div class="frow">${grpF('Insulation R',ib(f+'.insR',v.insR,'R'))}${grpF('Thickness',ib(f+'.insT',v.insT,'mm'))}</div>`}
  ${XP&&s.id==='fr'&&!c.fkey?XP.suggHTML(c):''}
  ${!s.gap&&s.cavGap>0&&+v.insT>0&&+v.insT<depth?`<div class="lctl v6gap"><span class="glbl">Air gap in the ${MEMBER[s.member].name.toLowerCase().replace(/s$/,'')} space</span><div class="lockrow"><span class="lockval"><span class="ms s16">lock</span>Air gap ${depth-(+v.insT)} mm (${MEMBER[s.member].name.toLowerCase().replace(/s$/,'')} ${depth} − insulation ${+v.insT}) · R${r2(s.cavGap)}</span><span class="v6dv">${c.el==='floor'?'Enclosed still air, heat flow down — fixed':'Enclosed still air — fixed'}</span></div></div>`:''}
  ${s.gap?((isWall||c.el==='floor'&&s.member==='joist')&&v.gapMan!==true?(()=>{const gm=gapMM(s,v);if(!gm)return'';const g=LIB.gap[gapAuto(s,v)];return `<div class="lctl v6gap"><span class="glbl">Air gap in the stud space</span><div class="lockrow"><span class="lockval"><span class="ms s16">lock</span>Air gap ${gm} mm (${s.member==='joist'?'joist':'stud'} ${depth} − insulation ${+v.insT}) · R${r2(g.r)}</span><button class="link-btn v6unl" data-a="gapunl" data-v="${s.id}"><span class="ms s16">lock_open</span>Unlock to edit</button></div>${g.r?'':'<span class="lsub">Under 12 mm — not counted.</span>'}</div>`})():`<div class="lctl"><span class="glbl">Air space</span>${selF(f+'.gap',LIB.gap.map((o,j)=>[j,o.n]),v.gap||0,'240px')}${isWall||c.el==='floor'&&s.member==='joist'?`<button class="link-btn" data-a="gapauto" data-v="${s.id}">Use automatic</button>`:''}</div>`):''}
  ${s.cover&&!c.fkey?`<label class="tgl"><input type="checkbox" data-f="${f}.cover"${v.cover?' checked':''}>Insulation covers the framing</label>`:''}${pfoot(1)}</div>`;
  const foot=[];
  if(s.compressed)foot.push(`<div class="v6fn">Enter the R-value the insulation achieves when compressed at the eaves, from the manufacturer.</div>`);
  if(+v.insT>depth&&!(s.cover&&v.cover)&&!s.compressed)foot.push(`<div class="lowerwarn"><span class="ms s18">warning</span><span>${+v.insT} mm insulation in a ${depth} mm cavity is compressed — its declared R no longer applies.</span></div>`);
  const act=S.af===s.id;
  return `<div class="flayer v6fl${act?' v6act':''}" data-a="af" data-v="${s.id}">
  <div class="flh" data-layer="${s.id}" tabindex="0"><span class="lnum">${num[i]}</span><div><div class="fname"><span class="ficon"><span class="ms">forest</span></span><h3>${esc(s.label)}</h3></div>
  <div class="v6chips"><span class="bchip" tabindex="0"><span class="ms">info</span>Bridged portion<span class="tip">Framing bridges the insulation here, so the standard treats it as parallel heat paths (H1/AS1 2.1.3.2).</span></span>${act&&PROD[s.member].length?'<span class="chip-set"><span class="ms">arrow_back</span>Filled from the product list</span>':''}</div>
  <div class="fsub">${esc(d.name)} with insulation between them</div></div><div class="lr">${R}</div></div>
  ${true?wallBody(c,s,v,F,depth,row||host,own,f,fracRow,tr,foot,x,i,num,isWall?null:sizes,s.brk?(tl.match(/<div class="frow">[\s\S]*?<\/p>/)||[''])[0]:''):`<div class="v6fb"><div class="frow">${sizes}</div>${fracRow}<div class="v6paths">${tl}${tr}</div>${foot.join('')}${groupNote(x,i,num)}</div>`}</div>`}
/* walls: 38% is fixed, so the frame is one line, the insulation takes the full width and the two paths are a result strip */
const FEDIT=new Set();
function wallBody(c,s,v,F,depth,rr,own,f,fracRow,tr,foot,x,i,num,fsz,brkH){const MN=(MEMBER[s.member]||{}).name||'Studs',NM=MN.toLowerCase(),nm=NM.replace(/s$/,'');const gn=groupNote(x,i,num),pc=q=>{const p=q*100;return (Math.abs(p-Math.round(p))<.05?Math.round(p):p.toFixed(1))+'%'},d=MEMBER[s.member],w=+v.w||d.w,sp=+v.s||d.s,dw=+v.dw||d.dw,ed=FEDIT.has(c.id+':'+s.id);
  const sz=fsz?`<div class="v6wf v6ff1">${fsz.startsWith('<div class="lockrow"')?fsz:`<div class="frow">${fsz}</div>`}${fracRow}${brkH||''}</div>`:`<div class="v6wf"><div class="v6wf1">${grpF('Stud depth',ib(f+'.d',v.d,'mm'))}<p class="lsub v6wfs">Studs ${depth} × ${w} @ ${sp}${dw?' · dwangs @ '+dw:''} — for the drawings; at ${pc(F.f)} framing they don't change the R-value <button class="link-btn" data-a="fedit" data-v="${s.id}">${ed?'Done':'Edit'}</button></p></div>
    ${ed?`<div class="frow">${grpF('Width',ib(f+'.w',v.w,'mm'))}${grpF('Centres',ib(f+'.s',v.s,'mm'))}${grpF('Dwangs at',ib(f+'.dw',v.dw,'mm'))}</div>`:''}${fracRow}</div>`;
  const ins=tr.replace('<div class="v6pp cav"><div class="v6pph"><span>Through the cavity</span>','<div class="v6pp cav v6wins"><div class="v6pph"><span>Insulation between the '+NM+'</span>').replace(/<span class="mono">[^<]*<\/span><\/div>/,'</div>').replace(/<div class="v6pf">[\s\S]*$/,'</div>');
  let bar='';if(rr&&rr.regions){const two=rr.regions.length===2&&own,kT=D.kTimber,gR=(s.cavGap||0)+(s.gap?LIB.gap[gapIdx(s,v)].r:0),sh=two?rr.shared||0:0,bk=s.brk&&+v.brkR>0?+v.brkR:0,t0=two?rr.regions[0].r:depth/1000/kT+bk,t1=two?rr.regions[1].r:(+v.insR||0)+gR,ps=(rr.sharedParts||[]).length?' + '+r2(sh):'',ft=F.f,fi=1-ft;
    bar=`<div class="v6wr"><div class="v6wrb"><i style="width:${(ft*100).toFixed(1)}%"></i><i></i></div><div class="v6wrl"><span><b>Through the timber ${pc(ft)}</b> · R${r2(t0+sh)}${` <em>(${nm} ${depth} mm${two?' '+r2(t0):bk?' '+r2(t0-bk)+' + break '+r2(bk):''}${sh?ps:''})</em>`}</span><span><b>Through the insulation ${pc(fi)}</b> · R${r2(t1+sh)}${true?` <em>(${Math.abs(t1-(+v.insR||0))>.005&&+v.insR>0?r2(+v.insR)+' + air '+r2(t1-(+v.insR)):r2(t1)}${sh?ps:''})</em>`:''}</span></div>
    ${own&&!gn?`<p class="lsub">Bridged portion (2.1.3.2) — the two paths in parallel: R${r2(rr.r)}</p>`:gn?'<p class="lsub">This layer’s own paths — the combined value is below.</p>':''}</div>`}
  return `<div class="v6fb v6wall">${sz}${ins}${bar}${foot.join('')}${gn}</div>`}

/* ---------- right: section, products, schedule ---------- */
const mmOf=s=>{const m=/([\d.]+)\s*mm/.exec(s||'');return m?+m[1]:0};
function esSized(svg){const m=svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);return m?svg.replace(/<svg class="(eaves|wall|floor)-section"/,'<svg class="$1-section" style="aspect-ratio:'+m[1]+'/'+m[2]+'"'):svg}
const SECT={itWallSection:['wall','Section · intertenancy wall','Plan cut through both frames, drawn to scale'],wallSection:['wall','Section · wall','Vertical cut between two studs, drawn to scale'],eavesSection:['eaves','Section · eaves','Drawn from the construction.'],floorSection:['floor','Section · floor','Cut across the joists, drawn to scale']};
function drawing(c,pdf){const s=toSection(c);if(!s||typeof window[s.fn]!=='function'||!SECT[s.fn])return null;const m=SECT[s.fn];
  return{t:m[0],h:m[1],p:m[2],notDrawn:s.notDrawn||[],svg:esSized(window[s.fn](pdf?s.params:Object.assign({},s.params,{labels:false})))}}
const ndLine=d=>d&&d.notDrawn.length?`<div class="v6nd">Not shown in the drawing: ${esc(d.notDrawn.join(', '))}</div>`:'';
function secCard(c){const d=drawing(c);
  if(!d&&tpl(c).slab)return `<div class="card secpanel"><div class="sechd"><div><h2>Section</h2><p>Section not available for this floor yet</p></div></div></div>`;
  if(!d){const s0=toSection(c);return `<div class="card secpanel"><div class="sechd"><div><h2>Section</h2><p>${esc(s0&&s0.na||'No section drawing for this construction type yet.')}</p></div></div></div>`}
  return `<div class="card secpanel"><div class="sechd"><div><h2>${d.h}</h2><p>${d.p}</p></div></div><div class="v6draw ${d.t}">${fitSvg(d.svg)}</div>${ndLine(d)}
  <div class="secfoot" id="pinstate">${S.pin?`<span class="ms s16">push_pin</span>${esc(slotLabel(c,S.pin))} pinned — click it again to release`:'<span class="ms s16">touch_app</span>Hover a layer to find it in the section · click to pin'}</div></div>`}
function slotLabel(c,id){const s=(tpl(c).slots||[]).find(s=>s.id===id);return s?s.label:id}
function prodCard(c){const t=tpl(c),ovr=isStrat(c)&&S.af==='over'&&(t.slots||[]).find(x=>x.id==='over'),s=ovr||(!t.manual&&(t.slots||[]).find(x=>x.id===S.af&&x.k==='frame'));
  if(ovr){const v=c.v.over||{},sel=(r,th)=>Math.abs((+v.r||0)-r)<1e-9&&+v.t===th;
    const cov=!!(c.v.fr||{}).cover,rows=PB_CEIL.map(p=>{const ch=[];if(sel(p[1],p[2]))ch.push('<i class="pchip on">Selected</i>');if(cov&&p[3]===460)ch.push('<i class="pchip fit">Suits covering the chords</i>');return pbRow(p,ch)}).join('');
    return `<div class="card prodcard"><div class="prod-hd"><h2>${esc(pbHead(PB_CEIL))}</h2><p>Click a product to fill ${esc(ovr.label.toLowerCase())} — R-value and thickness together.</p></div><div class="prodscroll">${rows}</div><div class="prodsrc">${esc(pbSrc(PB_CEIL))} Fills the selected layer only.</div></div>`}
  const PLh=s?pbList(s.member):null,hd=`<div class="prod-hd"><h2>${esc(PLh?pbHead(PLh):'Insulation · '+RPI.byMember.brand)}</h2><p>${s?`Click a product to fill ${esc(s.label.toLowerCase())} — R-value and thickness together.`:'Select a framing layer to fill it from this list.'}</p></div>`;
  if(!s)return `<div class="card prodcard">${hd}</div>`;
  const v=c.v[s.id]||{},depth=+v.d||MEMBER[s.member].d,L=prodList(s.member,depth);
  const sk=XP&&s.id==='fr'?XP.suggKey(c):null,PL=pbList(s.member);
  if(PL){const cov=s.member==='chord'&&!!v.cover;const rows=PL.map(p=>{const r=p[1],th=p[2],chips=[];if(Math.abs((+v.insR||0)-r)<1e-9&&+v.insT===th)chips.push('<i class="pchip on">Selected</i>');if(sk===r+'@'+th)chips.push('<i class="pchip sugg">Suggested</i>');
      if(th===depth)chips.push(`<i class="pchip fit">Fills a ${depth} mm ${MEMBER[s.member].name.toLowerCase().replace(/s$/,'')}</i>`);else if(th>depth&&!s.cover)chips.push('<i class="pchip squash">Compressed in this depth</i>');
      if(cov&&p[3]===460)chips.push('<i class="pchip fit">Suits covering the chords</i>');return pbRow(p,chips,s.member==='rafter')}).join('');
    return `<div class="card prodcard">${hd}<div class="prodscroll">${rows}</div><div class="prodsrc">${esc(pbSrc(PL))} Fills the selected framing layer only.</div></div>`}
  const rows=L.map(([r,th])=>{const chips=[];if(Math.abs((+v.insR||0)-r)<1e-9&&+v.insT===th)chips.push('<i class="pchip on">Selected</i>');if(sk===r+'@'+th)chips.push('<i class="pchip sugg">Suggested</i>');
    if(th===depth)chips.push(`<i class="pchip fit">Fills a ${depth} mm ${MEMBER[s.member].name.toLowerCase().replace(/s$/,'')}</i>`);
    /* members that let insulation rise above them (truss chords) never compress it — whether it is counted over the chords is a separate choice */
    else if(th>depth&&!s.cover)chips.push('<i class="pchip squash">Compressed in this depth</i>');
    return `<button class="prow2 v6pr" data-a="prod" data-r="${r}" data-t="${th}"><b>R${r.toFixed(1)} · ${th} mm</b><em>${esc(MEMBER[s.member].name)}</em>${chips.length?`<span class="pchips">${chips.join('')}</span>`:''}</button>`}).join('');
  return `<div class="card prodcard">${hd}<div class="prodscroll">${rows||'<div class="pgrp">No products listed for this member — enter the R-value.</div>'}</div><div class="prodsrc">${esc(RPI.byMember.brand)} declared product values. Fills the selected framing layer only.</div></div>`}
/* ---------- render ---------- */
/* ---------- Open project ---------- */
let PEND=null;
function projMsg(html,cls){let el=document.getElementById('v6pdlg');if(!el){el=document.createElement('div');el.id='v6pdlg';document.body.appendChild(el)}el.className=cls||'';el.innerHTML=html}
function projClose(){const el=document.getElementById('v6pdlg');if(el)el.remove();PEND=null}
function projLoad(d){try{d=EZFile.migrate(d);XP.replaceWith(d);n=S.list.reduce((m,c)=>Math.max(m,+String(c.id).slice(1)||0),n);S.list.forEach(ensure);projClose();render();
    projMsg(`<div class="pd-in ok"><span class="ms s18">check_circle</span><span>Opened “${esc((S.pdf.proj||{}).address||'project')}” — saved ${esc(new Date(d.savedAt||Date.now()).toLocaleString())}.</span><button class="v6btn" data-a="pdlg" data-v="x">OK</button></div>`,'note');setTimeout(()=>{const el=document.getElementById('v6pdlg');if(el&&el.className==='note')el.remove()},4000)}
  catch(e){projMsg(`<div class="pd-in bad"><span class="ms s18">error</span><span>${esc(e.message)} — the current project is unchanged.</span><button class="v6btn" data-a="pdlg" data-v="x">OK</button></div>`)}}
function projOpen(){let f=document.getElementById('v6pfile');if(!f){f=document.createElement('input');f.type='file';f.id='v6pfile';f.accept='.json,.ezh1.json,application/json,.pdf,application/pdf';f.style.display='none';document.body.appendChild(f);
    f.addEventListener('change',async()=>{const file=f.files[0];f.value='';if(!file)return;const r=await EZFile.read(file),err=r.err||EZFile.check(r.data);
      if(err){projMsg(`<div class="pd-in bad"><span class="ms s18">error</span><span>${esc(err)} The current project is unchanged.</span><button class="v6btn" data-a="pdlg" data-v="x">OK</button></div>`);return}
      if(!XP.hasContent()){projLoad(r.data);return}
      PEND=r.data;projMsg(`<div class="pd-in"><span class="ms s18">swap_horiz</span><span>The current project will be replaced by “${esc(file.name)}”. Save it first?</span><button class="v6btn" data-a="pdlg" data-v="save">Save first</button><button class="v6pdfb" data-a="pdlg" data-v="replace">Replace</button><button class="v6btn" data-a="pdlg" data-v="x">Cancel</button></div>`)})}
  f.click()}
/* ---------- New project ---------- */
function npOpen(){const nm=((S.pdf&&S.pdf.proj)||{}).address||'untitled project';let el=document.getElementById('v6np');if(!el){el=document.createElement('div');el.id='v6np';document.body.appendChild(el)}
  el.innerHTML=`<div class="np-bg" data-a="np" data-v="x"></div><div class="np-box" role="dialog" aria-modal="true" aria-labelledby="np-t"><h3 id="np-t">Start a new project?</h3><p>The current project (${esc(nm)}) is only kept in this browser. Save it first if you want to come back to it.</p>
  <div class="np-btns"><button class="v6btn pri" data-a="np" data-v="save"><span class="ms s18">save</span>Save and start new</button><button class="v6btn np-warn" data-a="np" data-v="new">Start new without saving</button><button class="v6btn" data-a="np" data-v="x">Cancel</button></div></div>`}
function npStart(){if(XP.blank)XP.blank();try{sessionStorage.setItem('ezbuild-newproj','1')}catch(e){}location.reload()}
function npAct(v){const el=document.getElementById('v6np');if(v==='save'){if(window.EZFile)EZFile.save(S,XP.state());setTimeout(npStart,400);return}if(v==='new'){npStart();return}if(el)el.remove()}
function projDlg(v){if(v==='save'){EZFile.save(S,XP.state());const d=PEND;setTimeout(()=>{if(d)projLoad(d)},300);return}if(v==='replace'){if(PEND)projLoad(PEND);return}projClose()}
/* the name a new construction takes from the last one in its group: the next level or storey
   (一层 → 二层, Level 1 → Level 2, L1 → L2, 1st floor → 2nd floor, Ground floor → First floor); null when there is none */
function nextName(s){const CN='一二三四五六七八九',ORD=['ground','first','second','third','fourth','fifth','sixth'],sfx=n=>n%100>10&&n%100<14?'th':['th','st','nd','rd'][n%10]||'th';
  let m;s=String(s||'');
  if((m=s.match(/([一二三四五六七八])(层|楼)/)))return s.replace(m[0],CN[CN.indexOf(m[1])+1]+m[2]);
  if((m=s.match(/(\d+)\s*(层|楼)/)))return s.replace(m[0],(+m[1]+1)+m[2]);
  if((m=s.match(/\b(level|lvl|storey|story)\s*(\d+)/i)))return s.replace(m[0],m[0].replace(m[2],+m[2]+1));
  if((m=s.match(/\bL(\d+)\b/)))return s.replace(m[0],'L'+(+m[1]+1));
  if((m=s.match(/\b(\d+)(st|nd|rd|th)(?=\s+(floor|storey|story|level)\b)/i))){const k=+m[1]+1;return s.replace(m[0],k+sfx(k))}
  if((m=s.match(/\b(ground|first|second|third|fourth|fifth)(?=\s+(floor|storey|story|level)\b)/i))){const w=ORD[ORD.indexOf(m[1].toLowerCase())+1];return s.replace(m[0],m[1][0]===m[1][0].toUpperCase()?w[0].toUpperCase()+w.slice(1):w)}
  return null}
function undoBar(){let el=document.getElementById('v6undo');if(!S.undo){if(el)el.remove();return}if(!el){el=document.createElement('div');el.id='v6undo';document.body.appendChild(el)}
  el.innerHTML=`<span>Deleted “${esc(S.undo.c.name)}”</span><button class="v6btn" data-a="undo">Undo</button>`}
function render(){const c=cur();if(XP)XP.after();
  const a=document.activeElement,af=a&&a.dataset&&a.dataset.f,ss=a&&a.selectionStart;
  $('#c-left').innerHTML=leftCol();
  if(!c){$('#c-mid').innerHTML=S.cur==='openings'?XP.openMid():startCard()+XP.mid();$('#c-right').innerHTML=XP.right();stick();
    if(af){const nx=document.querySelector(`[data-f="${af}"]`);if(nx){nx._sel=1;nx.focus();try{if(ss!=null)nx.setSelectionRange(ss,ss)}catch(e){}}}return}
  ensure(c);const x=calc(c);requestAnimationFrame(()=>phys(c).forEach(p=>{const el=document.querySelector(`#c-mid [data-layer="${p.slot}"]`);const box=el&&(el.closest('.flayer')||el.closest('.lrow')||el);if(box)box.classList.add('v6bad')}));$('#c-mid').innerHTML=(c.origin&&c.origin.guide?`<div class="hg-ban"><span class="ms s18">cottage</span><span>Created by the House Guide — edit here or in the guide</span><a href="house-guide.html#part=${encodeURIComponent(c.origin.guide)}">Open in the House Guide</a></div>`:'')+`<div class="card" id="stack">${midCol(c,x)}</div>`;
  $('#c-right').innerHTML=secCard(c)+prodCard(c);stick();
  const sj=$('#statejson');if(sj)sj.textContent=JSON.stringify(S,null,2);
  if(af){const nx=document.querySelector(`[data-f="${af}"]`);if(nx){nx._sel=1;nx.focus();try{if(ss!=null)nx.setSelectionRange(ss,ss)}catch(e){}}}
  hl()}
function svgFor(id){const c=cur();return c?(SVGMAP[c.el]||{})[id]||[]:[]}
function hl(){const k=S.hover||S.pin,parts=new Set(k?svgFor(k):[]);
  document.querySelectorAll('#c-mid [data-layer]').forEach(n=>{n.classList.toggle('row-hl',!!k&&n.dataset.layer===k);n.classList.toggle('pinned',!!S.pin&&n.dataset.layer===S.pin)});
  document.querySelectorAll('.eaves-section,.wall-section,.floor-section').forEach(s=>{s.classList.toggle('es-dim',parts.size>0);s.querySelectorAll('[data-layer]').forEach(g=>g.classList.toggle('hl',parts.has(g.dataset.layer)))})}
function slotFromSvg(name){const c=cur();if(!c)return null;const m=SVGMAP[c.el]||{};return Object.keys(m).find(k=>m[k].includes(name)&&(tpl(c).slots||[]).some(s=>s.id===k))||null}

/* ---------- writes ---------- */
function retype(c){ensure(c);S.af=firstFrame(c);if(S.pin&&!(tpl(c).slots||[]).some(s=>s.id===S.pin))S.pin=null}
/* a slab's area and perimeter worth a second look. {w:1} is a warning: A/P under 1.0 means a slab under 2 m wide on average —
   e.g. the perimeter of several units with the area of one. A perimeter shorter than the square of the same area (4√A) is only
   a note: right for a terraced unit whose slab edge adjoins the next heated unit (only the exposed perimeter counts). */
function slabWarn(c){if(!tpl(c).slab)return null;const A=+c.area||0,P=+(c.v.slab||{}).sP||0;if(!(A>0&&P>0))return null;const sq=4*Math.sqrt(A);
  if(A/P<1)return{w:1,t:'A/P is '+(A/P).toFixed(2)+': the slab would be under 2 m wide on average. Check the area and the perimeter — e.g. a perimeter for several units with the area of one.'};
  if(P<sq-1e-6)return{t:'The perimeter '+P.toFixed(1)+' m is less than the outline of a square of '+A.toFixed(1)+' m² ('+sq.toFixed(1)+' m). That is right when part of the slab edge adjoins another heated unit (only the exposed perimeter counts); otherwise check the area and the perimeter.'};
  return null}
/* a wall's name tells its type: "IT wall" → intertenancy; "internal wall" → timber frame whose other face is still indoor air,
   with no vented cavity and no air barrier (no building paper inside). Applied when the name newly says so — a later choice is kept. */
function nameHint(c){if(!c||c.el!=='wall')return;const s=c.name||'',k=/\bIT\b|\bI\/T\b/.test(s)||/inter-?\s?tenancy|party wall/i.test(s)?'it':/\b(internal|interior)\b|内墙/i.test(s)?'int':'';
  if(k===(c.nh||''))return;c.nh=k;if(!k)return;
  const af=S.af,pin=S.pin,mine=cur()===c;
  if(k==='it'){if(c.kind!=='it')setF('kind','it',false,c)}
  else{if(c.kind!=='frame')setF('kind','frame',false,c);setF('o.cav',false,false,c);
    setF('v.clad.m',String(LIB.cladding.findIndex(m=>m.still&&/^None/.test(m.n))),false,c);setF('v.ab.m','0',false,c)}
  if(!mine){S.af=af;S.pin=pin}}   /* renamed on the Project page: the open construction keeps its state */
function setF(path,raw,isNum,cc){if(XP&&/^(p|pp)\./.test(path)){XP.set(path.replace(/^p\./,''),raw);return}const c=cc||cur();if(!c)return;const val0=isNum?(raw===''?null:(isNaN(parseFloat(raw))?null:parseFloat(raw))):raw;
  if(path==='kind'){const nm=k=>ELW[c.el]+' – '+k;if(!c.name||c.name===nm(c.kind))c.name=nm(raw);
    const frs=k=>{try{return(tpl(Object.assign({},c,{kind:k})).slots||[]).filter(s=>s.k==='frame')}catch(e){return[]}};
    c.vk=c.vk||{};const keep={};frs(c.kind).forEach(s=>{if(c.v[s.id])keep[s.id]=JSON.parse(JSON.stringify(c.v[s.id]))});c.vk[c.kind]=keep;
    c.kind=raw;const back=c.vk[raw];
    frs(raw).forEach(s=>{if(back&&back[s.id]){c.v[s.id]=JSON.parse(JSON.stringify(back[s.id]));return}
      const d=MEMBER[s.member],bst=raw==='block'&&s.id==='st',dd=bst?BLOCK_ST.d:d.d,SK=s.member==='rafter'?PB_SKILL.filter(p=>/Skillion/.test(p[0])&&p[2]<=d.d).map(p=>[p[1],p[2],p[0]]):null,L=SK||prodList(s.member,dd).filter(([,t])=>t<=dd),b=L.length?L.reduce((a,x)=>x[0]>a[0]?x:a):null;   /* skillion: the highest-R Pink® Batts® Skillion that fits */
      c.v[s.id]=Object.assign({d:d.d,w:d.w,s:d.s,mode:'std',insR:b?b[0]:null,insT:b?b[1]:null,gap:0,cover:false,prod:b?(b[2]||RPI.byMember.brand):''},d.dw?{dw:d.dw}:{},c.el==='roof'&&s.id==='st'?{d:35,w:70,s:450,lock:true}:{},bst?BLOCK_ST:{})});
    retype(c);return}
  if(path==='v.slab.sF'){const sv=c.v.slab=c.v.slab||{};sv.sF=raw;if(raw==='raft')sv.sU='none';return}
  if(path.startsWith('v.slab.parts.')){const [,,,i,k]=path.split('.'),sv=c.v.slab=c.v.slab||{};sv.parts=sv.parts||[];const pt=sv.parts[+i]=sv.parts[+i]||{};pt[k]=k==='len'?(raw===''?'':parseFloat(raw)):raw;return}
  if(path.startsWith('o.')){c.o[path.slice(2)]=!!raw;retype(c);return}
  if(path==='heated'){c.heated=raw;if(!raw)delete c.heatWet;return}
  if(path==='heatWet'){c.heatWet=!!raw;return}
  if(path==='side'){c.side=raw||undefined;delete c.sideAsk;return}
  if(path==='perimTgl'){c.v.edge=c.v.edge||{};c.v.edge.psel=raw?'product':'none';return}
  if(path==='name'){c.name=raw;nameHint(c);return}
  if(!path.startsWith('v.')){c[path]=val0;return}
  const [,id,key]=path.split('.'),o=c.v[id]=c.v[id]||{};
  if(key==='m'){o.m=+raw;delete o.r;return}
  if(key==='mode'){if(raw==='p38'){o.mode='pct';o.pct=38;o.p38=true}else{o.mode=raw;o.p38=false;if(raw==='dem'&&!(+o.pct>0))o.pct=38}delete c.ffMsg;return}
  if(key==='gap'){o.gap=+raw;return}
  if(key==='addIns'){o.addIns=raw?'1':'';if(!raw){o.insR='';o.insT=''}return}
  if(id==='over'&&(key==='r'||key==='t'))o.prod='';
  if(key==='cover'){o.cover=raw;return}
  if(key==='insR')o.prod='';
  o[key]=val0}
/* ---------- undo / redo: Ctrl+Z, Ctrl+Y or Ctrl+Shift+Z — snapshots of the constructions, the Project fields and the
   project details, taken before each change; typing in one field (pauses under 1.5 s) is one step ---------- */
const HIST={u:[],r:[],f:null,t:0},HMAX=100;
const snap=()=>JSON.stringify({list:S.list,P:XP?XP.state():null,proj:S.pdf.proj});
function hPush(fld){const now=Date.now();if(fld&&fld===HIST.f&&now-HIST.t<1500){HIST.t=now;return}HIST.f=fld||null;HIST.t=now;
  const s=snap();if(HIST.u[HIST.u.length-1]===s)return;HIST.u.push(s);if(HIST.u.length>HMAX)HIST.u.shift();HIST.r=[]}
function hApply(s){const d=JSON.parse(s);S.list=d.list;S.list.forEach(ensure);
  if(XP&&d.P){const P=XP.state();Object.keys(P).forEach(k=>delete P[k]);Object.assign(P,d.P)}Object.assign(S.pdf.proj,d.proj||{});
  if(S.cur!=='project'&&S.cur!=='openings'&&!S.list.some(c=>c.id===S.cur)){S.cur=XP?'project':(S.list[0]||{}).id;S.af=null}
  Object.keys(RAW).forEach(k=>delete RAW[k]);S.undo=null;undoBar();HIST.f=null;render()}
/* a step equal to what is on screen (e.g. a click that changed nothing) is skipped */
function undo(){const now=snap();let s;while(HIST.u.length&&(s=HIST.u.pop())===now)s=null;if(!s)return;HIST.r.push(now);hApply(s)}
function redo(){const now=snap();let s;while(HIST.r.length&&(s=HIST.r.pop())===now)s=null;if(!s)return;HIST.u.push(now);hApply(s)}
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey||(S.pdf&&S.pdf.open))return;const k=e.key.toLowerCase();
  if(k==='z'&&!e.shiftKey){e.preventDefault();undo()}else if(k==='y'||(k==='z'&&e.shiftKey)){e.preventDefault();redo()}});
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.f||t.tagName==='SELECT'||t.type==='checkbox')return;hPush(t.dataset.f);if(t.dataset.n)RAW[t.dataset.f]=t.value;setF(t.dataset.f,t.value,!!t.dataset.n);render()});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.f)return;hPush();
  if(t.dataset.cl){const L=LIB.cladding,o=L[+t.closest('.v6clad').querySelector('select:not([data-cl])').value]||L[0],g=t.dataset.cl==='g'?t.value:(o.grp||'ot'),b=t.dataset.cl==='b'?t.value:null,j=cladIn(g,b)[0];if(j!=null){setF(t.dataset.f,String(j),false);render()}return}
  if(t.tagName==='SELECT'){setF(t.dataset.f,t.value,false);render()}else if(t.type==='checkbox'){setF(t.dataset.f,t.checked);render()}});
document.addEventListener('focusout',e=>{const t=e.target;t._sel=0;t._fj=0;if(t.dataset&&t.dataset.f&&RAW[t.dataset.f]!=null){delete RAW[t.dataset.f];const nv2=lz(t.value);if(nv2!==t.value)t.value=nv2}});
/* clicking into a number selects it, ready to type over: every time it gets focus (not only the first), and the
   mouse-up of that click must not put a caret back. Focus put back after a re-render (_sel set first) keeps the caret. */
document.addEventListener('focusin',e=>{const t=e.target;if(t.tagName==='INPUT'&&t.type==='text'&&!t._sel){t._sel=1;if(t.dataset.n){t._fj=1;setTimeout(()=>{if(document.activeElement===t)t.select()},0)}}});
document.addEventListener('mouseup',e=>{const t=e.target;if(t.tagName==='INPUT'&&t._fj){t._fj=0;e.preventDefault();t.select()}});
document.addEventListener('click',e=>{if(S.pdf&&S.pdf.open&&(e.target.id==='pdfx'||e.target.id==='pdfpages')){closePdf();return}   /* the empty background around the PDF pages closes Export PDF */
  const b=e.target.closest('[data-a]');
  if(S.menu&&!e.target.closest('.cx-add')){S.menu=false;render();if(!b)return}
  if(!b){return}
  if(!/^(theme|pdf|pdfclose|pdfdl|psave|popen|pcopy)$/.test(b.dataset.a))hPush();
  const a=b.dataset.a,v=b.dataset.v,c=cur();
  if(a==='af'){if(e.target.closest('input,select,label,button,.bchip'))return;const row=e.target.closest('.flh');if(S.af!==v){S.af=v;render()}
    if(row){S.pin=S.pin===v?null:v;render()}return}
  if(!c&&['dup','del','reset','prod','af'].includes(a))return;
  if(a==='sel'){S.cur=v;S.pin=null;S.af=cur()?firstFrame(cur()):null}
  else if(a==='add'){S.menu=!S.menu;if(S.menu)setTimeout(()=>{const m=document.querySelector('#c-left .cx-menu');if(m)m.scrollIntoView({block:'nearest'})},0)}   /* the left column scrolls on its own: bring the menu into view */
  else if(a==='addel'){const nc=v==='slab'?mk('floor',c=>{c.kind='slab';c.name='Floor – concrete slab';c.v={slab:{sM:'int',sF:'slab',sU:'none',sE:'none',sWall:'other',sT:100}}}):mk(v);ensure(nc);{const L=S.list.filter(z=>z.el===nc.el&&!!tpl(z).slab===!!tpl(nc).slab),nm=L.length&&nextName(L[L.length-1].name);if(nm)nc.name=nm}S.list.push(nc);S.menu=false;S.pin=null;if(b.dataset.stay){setTimeout(()=>{const i=document.querySelector(`[data-f="p.ca.${nc.id}"],[data-f="p.ra.${nc.id}"]`);if(i){i.scrollIntoView({block:'center'});i.focus()}},0)}else{S.cur=nc.id;S.af=firstFrame(nc)}}   /* the Project page + stays on the Project page: areas first */
  else if(a==='dup'){const nc=JSON.parse(JSON.stringify(c));nc.id='c'+(++n);nc.name=c.name+' (copy)';S.list.splice(S.list.indexOf(c)+1,0,nc);S.cur=nc.id}
  else if(a==='sbadd'){const sv=c.v.slab=c.v.slab||{};(sv.parts=sv.parts||[]).push({len:'',sE:'none',sWall:'other'})}
  else if(a==='sbgar'){const sv=c.v.slab=c.v.slab||{};(sv.parts=sv.parts||[]).push({name:'Wall to garage',len:'',sE:'none',sWall:'other'})}
  else if(a==='sbdel'){((c.v.slab||{}).parts||[]).splice(+v,1)}
  else if(a==='undo'){const u=S.undo;if(!u)return;S.list.splice(Math.min(u.i,S.list.length),0,u.c);if(!u.stay){S.cur=u.c.id;S.af=firstFrame(u.c)}S.undo=null;undoBar()}
  else if(a==='delc'){const x=S.list.find(z=>z.id===v);if(!x||S.list.length<2)return;const i=S.list.indexOf(x);S.undo={c:x,i,stay:1};clearTimeout(S.undoT);S.undoT=setTimeout(()=>{S.undo=null;undoBar()},5000);S.list.splice(i,1);setTimeout(undoBar,0)}   /* delete from the Project page: stays on the Project page */
  else if(a==='del'){if(S.list.length<2)return;const i=S.list.indexOf(c);S.undo={c,i};clearTimeout(S.undoT);S.undoT=setTimeout(()=>{S.undo=null;undoBar()},5000);S.list.splice(i,1);setTimeout(undoBar,0);S.cur=(S.list[i]||S.list[i-1]).id;S.af=firstFrame(cur());S.pin=null}
  else if(a==='reset'){delete (c.v[v]||{}).r}
  else if(a==='ffok'){delete c.ffMsg}
  else if(a==='batok'){delete c.batMsg}
  else if(a==='sideopen'){SOPEN.add(c.id)}
  else if(a==='gapunl'){const o=c.v[v];if(o){o.gap=gapAuto(tpl(c).slots.find(z=>z.id===v),o);o.gapMan=true}}
  else if(a==='gapauto'){const o=c.v[v];if(o)o.gapMan=false}
  else if(a==='fedit'){const k=c.id+':'+v;FEDIT.has(k)?FEDIT.delete(k):FEDIT.add(k)}
  else if(a==='unlock'){UNL.add(c.id+':'+v)}
  else if(a==='prod'){const s=c.v[S.af];if(!s)return;if(S.af==='over'){s.r=+b.dataset.r;s.t=+b.dataset.t;s.on=true}else{s.insR=+b.dataset.r;s.insT=+b.dataset.t}s.prod=b.dataset.n||RPI.byMember.brand}
  else if(a==='pdf'){openPdf();return}
  else if(a==='pnew'){npOpen();return}
  else if(a==='np'){npAct(v);return}
  else if(a==='psave'){if(window.EZFile)EZFile.save(S,XP.state());return}
  else if(a==='popen'){projOpen();return}
  else if(a==='pdlg'){projDlg(v);return}
  else if(a==='pdfclose'){closePdf();return}
  else if(a==='pdfdl'){download();return}
  else if(XP&&/^p(seg|sugg|suggall|copy|glz|wadd|wdel|dadd|ddel|sadd|sdel|wown|sideok)$/.test(a)){if(XP.act(a,v,b)===false)return}
  else if(a==='theme'){const t=document.body.dataset.theme==='light'?'dark':'light';document.body.dataset.theme=t;try{localStorage.setItem('ezbuild-theme',t)}catch(e){}
    /* shared with ezbuild.co.nz and its other subdomains */if(/(^|\.)ezbuild\.co\.nz$/.test(location.hostname))document.cookie='ezbuild-theme='+t+';domain=.ezbuild.co.nz;path=/;max-age=31536000;samesite=lax';return}
  else if(a==='startx'){FROMG=false;history.replaceState(null,'',location.pathname+(TQ?'?'+TQ:''))}
  else return;
  render()});
document.addEventListener('click',e=>{const r=e.target.closest('#c-mid .lrow[data-layer]');if(!r||e.target.closest('input,select,button,label,a'))return;const k=r.dataset.layer;S.pin=S.pin===k?null:k;render()});
document.addEventListener('mouseover',e=>{let k=null;const r=e.target.closest('#c-mid [data-layer]');
  if(r)k=r.dataset.layer;else{const g=e.target.closest('.eaves-section [data-layer],.wall-section [data-layer],.floor-section [data-layer]');if(g)k=slotFromSvg(g.dataset.layer)}
  if(k!==S.hover){S.hover=k;hl()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(S.pdf.open){closePdf();return}if(S.menu){S.menu=false;render()}}});
addEventListener('resize',stick);
if($('#zone'))$('#zone').addEventListener('change',e=>{S.zone=+e.target.value;render()});
/* ---------- section sizing ---------- */
function fitSvg(svg){return svg.replace(/\s?preserveAspectRatio="[^"]*"/,'').replace(/<svg /,'<svg preserveAspectRatio="xMidYMid meet" ')}
function stick(){const rc=$('#c-right');if(rc)rc.classList.toggle('nostick',rc.offsetHeight>innerHeight-40)}

/* ---------- PDF export: a calculation report — every word and number comes from toSheet() / basis() ---------- */
const today=()=>{const d=new Date(),p=x=>String(x).padStart(2,'0');return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()};
S.pdf={open:false,proj:{client:'',project_name:'',address:'',designer:'',date:today()},ex:{},sum:true,solo:0};
if(S._proj)Object.assign(S.pdf.proj,S._proj);
const PF=[['client','Client'],['project_name','Project name'],['address','Address'],['designer','Designer'],['date','Date']];
const ordered=()=>['roof','wall','floor'].flatMap(el=>S.list.filter(c=>c.el===el));
const incl=()=>ordered().filter(c=>!S.pdf.ex[c.id]);
const dash=x=>esc(x!=null&&String(x).trim()?x:'—');
const n2=x=>x==null?'—':(+x).toFixed(2);
function uniq(svg,k){[...new Set([...svg.matchAll(/id="([^"]+)"/g)].map(m=>m[1]))].forEach(id=>{svg=svg.split('id="'+id+'"').join('id="'+id+'-p'+k+'"').split('url(#'+id+')').join('url(#'+id+'-p'+k+')')});return svg}
/* page foot: the disclaimer on every page, then the page number — the project details are on the first page */
const DISCLAIMER='Disclaimer: produced by the EZbuild Construction R-value calculator from the user’s inputs. Default material, air-gap and surface values are provisional — check every value against NZS 4214:2006, H1/AS1 6th edition and current manufacturer data. Construction R-values only: H1 compliance is shown by the user’s own H1/AS1 calculation (e.g. the BRANZ tool) and is for the building consent authority to accept. EZbuild accepts no liability for decisions made on the basis of this report.';
const pageFoot=(k,N)=>`<div class="pg-ft"><span class="disc">${esc(DISCLAIMER)}</span><span class="pno">Page ${k} of ${N}</span></div>`;

/* summary sheet */
const sumHead=()=>`<div class="ps-h1"><h1>Construction R-values</h1><p>H1/AS1 6th edition · NZS 4214:2006 isothermal planes · Climate zone ${S.zone}</p></div>`;
const sumTable=()=>`<table class="ps-sum"><colgroup><col style="width:9mm"><col style="width:29mm"><col><col style="width:38mm"><col style="width:28mm"><col style="width:18mm"><col style="width:16mm"></colgroup>
  <thead><tr><th>Ref</th><th>Construction</th><th>Build-up</th><th>Framing</th><th>Insulation</th><th class="n">R-value</th><th class="n">Min R</th></tr></thead><tbody></tbody></table>`;
const slabSum=L=>!L||!L.ok?['—','—']:L.vm1?['H1/VM1 Appendix E calculation',L.src||'manufacturer']:[(L.segs?L.segs[0]:L)&&'',''];
function slabTxt(c){const s=c.v.slab||{},L=calc(c).slab||{};const fl=s.sF==='raft'?'Raft':'Slab floor',U={none:'',s12:'1.2 m strip R1.2',s24:'1.2 m strip R2.4',f12:'full cover R1.2',f24:'full cover R2.4'}[s.sU||'none'];
  if(L.vm1)return[fl,'H1/VM1 Appendix E calculation'+(L.src?' — '+L.src:'')];
  const segs=L.segs||(L.ok?[{len:+s.sP||0,edge:s.sE==='r10'}]:[]),ed=segs.map(g=>(g.edge?'R1.0 edge ':'no edge ')+(+g.len).toFixed(2)+' m').join(' + ');
  return[fl,(U?'underslab '+U+(ed?' · ':''):'')+(ed||'no edge insulation')]}
function sumRows(){const out=[];[['roof'],['wall'],['floor',0],['floor',1]].forEach(([el,sl])=>{const L=incl().filter(c=>c.el===el&&(el!=='floor'||!!tpl(c).slab===!!sl));if(!L.length)return;
  out.push(`<tr class="grp"><td colspan="7">${sl?'Slab on ground':esc(EL[el].name)}</td></tr>`);
  L.forEach(c=>{const s=toSheet(c,S.list),ok=s.slab?!!s.slab.ok:s.checks.every(k=>k.ok);
    out.push(`<tr${ok?'':' class="bad"'}><td class="mono">${s.ref}</td><td>${esc(s.name)}</td><td>${esc(s.type)}</td>${s.slab?(t2=>`<td class="fr">${esc(t2[0])}</td><td>${esc(t2[1])}</td>`)(slabTxt(c)):`<td class="mono fr">${s.framing?s.framing.split(' + ').map(x=>`<span>${esc(x)}</span>`).join(''):'—'}</td><td>${dash(s.insulation)}</td>`}<td class="n r">${s.slab&&!s.slab.ok?'—':s.slab?'R'+s.slab.Rtxt:s.total.toFixed(2)}</td><td class="n">${s.slab?'None':s.min.toFixed(1)}</td></tr>`);
    const P=s.perimeter;if(P){const pk=P.checks.every(x=>x.ok);out.push(`<tr class="sub${pk?'':' bad'}"><td></td><td>Ceiling perimeter</td><td>${P.width} mm strip, insulation compressed</td><td class="mono fr">—</td><td>${dash(P.insulation)}</td><td class="n r">${P.total.toFixed(2)}</td><td class="n">${P.min.toFixed(1)}</td></tr>`)}})});
  return out}
const basisBlock=()=>`<div class="ps-basis"><h3>Basis of calculation</h3><ol>${basis().map(b=>`<li>${esc(b)}</li>`).join('')}</ol></div>`;

/* one calculation block */
function cbHead(s,tag,name,bad){return `<div class="cb-hd"><div class="cb-l"><span class="ref">${s.ref}</span><h2>${esc(name||s.name)}</h2></div><div class="cb-r${bad?' bad':''}">${tag?`<em>${tag}</em>`:''}<b class="mono">${s.slab&&!s.slab.ok?'No R':'R '+s.total.toFixed(2)}</b><span>${s.slab&&!s.slab.ok?'not determined':'m²·K/W'}</span></div>
  <div class="cb-ty">${esc(s.type)}</div><div class="cb-ck">${s.checks.map(x=>`<span${x.ok?'':x.warn?' class="warn"':' class="bad"'}>${esc(x.text)}</span>`).join('<i> · </i>')}</div></div>`}
/* truss roofs and timber-joist floors: one line of small print on how the bridged portion is worked out (walls use the 38% default) */
const howLine=s=>s.portions.length?'How the framing layer is calculated (NZS 4214 bridged portion, H1/AS1 2.1.3.2): '+s.portions.map(p=>p.id+' — '+p.paths.map(g=>g.name.toLowerCase()+' '+g.pct.toFixed(1)+'% at R'+g.r.toFixed(2)).join(', ')+'; '+p.formula.replace(/\s+→\s+/,' → ')).join(' · ')+'.':'';
function layerTable(s,how){const L=s.layers;let rows='';
  /* a bridged portion is shown once, on its own subtotal row after its last layer; its layers read "in B1" */
  const POR={};s.portions.forEach(p=>{const nos=L.filter(l=>l.portion===p.id).map(l=>l.no);POR[p.id]={p,nos,last:L.map(l=>l.portion).lastIndexOf(p.id)}});
  const rng=a=>{const g=[];a.forEach(x=>{const t=g[g.length-1];if(t&&x===t[1]+1)t[1]=x;else g.push([x,x])});const s2=g.map(([a,b])=>a===b?a:b===a+1?a+', '+b:a+'–'+b);return s2.length>1?s2.slice(0,-1).join(', ')+' and '+s2[s2.length-1]:s2[0]};
  L.forEach((l,i)=>{const B=l.portion&&POR[l.portion];
    const cv=B?'<span class="inb">in '+esc(l.portion)+'</span>':esc(l.countedText);
    const sl=!B&&l.halved?'<span class="h">½</span>':'';
    const own=l.own!=null?(+l.own).toFixed(2):'';
    const pr=l.lead&&B?`<span class="pr2"><span><i>timber</i> ${(B.p.members[0].depth/1000/D.kTimber).toFixed(2)}</span>${own?`<span><i>cavity</i> ${own}</span>`:''}</span>`:own;
    rows+=`<tr><td class="no mono">${l.no===''?'·':l.no}</td><td>${esc(l.label)}</td><td class="mt">${esc(l.material)}</td><td class="n">${l.thickness!=null?l.thickness:''}</td><td class="n">${pr}</td><td class="n c">${cv}<span class="slot">${sl}</span></td></tr>`;
    if(B&&B.last===i)rows+=`<tr class="bsub"><td class="no"></td><td>${esc(l.portion)} bridged portion (row${B.nos.length>1?'s':''} ${(B.p.rows||B.nos).map(String).every(x=>/^\d+$/.test(x))?rng(B.nos):(B.p.rows||B.nos).join(' and ')})</td><td></td><td></td><td class="n">Rb =</td><td class="n c"><b>${B.p.rb!=null?B.p.rb.toFixed(2):esc(B.p.rbText||'')}</b><span class="slot"><span class="ref g">${esc(l.portion)}</span></span></td></tr>`});
  const k2=s.sum.lastIndexOf(' = ');
  const tbl=`<table class="cb-tb"><colgroup><col style="width:8mm"><col style="width:50mm"><col><col style="width:13mm"><col style="width:21mm"><col style="width:27mm"></colgroup>
  <thead><tr><th>No</th><th>Layer</th><th>Material</th><th class="n">mm</th><th class="n">Product R</th><th class="n c">Counted R<span class="slot"></span></th></tr></thead><tbody>${rows}</tbody></table>
  <div class="cb-sum"><span class="lb">Construction R</span><span class="mono">${esc(s.sum.slice(0,k2))} = <b>${esc(s.sum.slice(k2+3))}</b></span></div>
  ${how?`<p class="cb-pn cb-how">${esc(how)}</p>`:''}`;
  return tbl}
const edgeHTML=P=>P.edge?`<div class="cb-edge"><div class="bp-hd"><span class="bp-t">Heel check and perimeter</span></div><table class="cb-tb etb"><colgroup><col style="width:52mm"><col style="width:26mm"><col></colgroup>
  <thead><tr><th>Quantity</th><th class="n">Value</th><th>How it is found</th></tr></thead><tbody>${P.edge.map(([a,b,h])=>`<tr><td>${esc(a)}</td><td class="n">${esc(b)}</td><td class="mt">${esc(h)}</td></tr>`).join('')}</tbody></table>${P.areaText?`<p class="cb-pn">${esc(P.areaText)}</p>`:''}</div>`:'';
function fnHTML(s){const fn=(s.ff||[]).map(l=>`<p${l.ok?'':' style="color:#C2410C;font-weight:600"'}>${esc(l.text)}</p>`).concat(s.layers.some(l=>l.halved)?['<p><b>½</b>Counted at half value: outside the vented cavity.</p>']:[]).concat(s.notes.map(n=>`<p${n.startsWith(FFEV)?' style="color:#C2410C;font-weight:600"':''}>Note: ${esc(n)}</p>`)).join('');return fn?`<div class="cb-fn">${fn}</div>`:''}
/* one calculation block per construction — a truss roof that does not fit at the edge gets a second block for its perimeter part */
function block(c,k){const s=toSheet(c,S.list),P=s.perimeter;
  const hd=s.slab?'':cbHead(s,P?'Field':'',null,!(s.checks[0]||{ok:true}).ok);
  if(s.slab){const L=s.slab;const sv0=c.v.slab||{},UL={none:'None',s12:'1.2 m strip R1.2',s24:'1.2 m strip R2.4',f12:'Full cover R1.2',f24:'Full cover R2.4'};
    const inp=!L.ok?`<table class="cb-tb sbt"><colgroup><col style="width:52mm"><col></colgroup><thead><tr><th>Known input</th><th>Value</th></tr></thead><tbody>${[['Floor area',(+c.area||0).toFixed(1)+' m² (Project page)'],['Perimeter',(+sv0.sP||0).toFixed(2)+' m (Project page)'],['A/P',L.ap!=null?(+L.ap).toFixed(2)+' m (Eq '+(L.eq||'E.1')+(sv0.sM==='ext'?', external dimensions, w '+sv0.sW+' m':', internal dimensions')+')':'—'],['Floor type',sv0.sF==='raft'?'Concrete raft foundation':'Slab floor'],['Underslab insulation',UL[sv0.sU||'none']],['Vertical edge insulation',[{len:(+sv0.sP||0)-((sv0.parts||[]).reduce((a,x)=>a+(+x.len||0),0)),sE:sv0.sE}].concat(sv0.parts||[]).filter(x=>+x.len>0).map(x=>(x.sE==='r10'?'R1.0':'none')+' '+(+x.len).toFixed(2)+' m').join(' + ')||'none'],['External wall',[sv0.sWall].concat((sv0.parts||[]).map(x=>x.sWall)).map(w=>w==='masonry'?'Masonry veneer':'Other cladding').filter((x,i,a)=>a.indexOf(x)===i).join(' / ')],['Effective wall thickness',(sv0.sT==null||sv0.sT===''?100:+sv0.sT)+' mm']].map(([a,b])=>`<tr><td>${a}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`:'';
    const txt=!L.ok?'Slab-on-ground R not determined: '+esc(slabMsg(L))+'. The inputs below are what the manufacturer needs for the calculation.':L.vm1?`H1/VM1 Appendix E calculation — source: ${esc(L.src||'not given')} → R${L.Rtxt} (E.1.1.1 b)). BRANZ House Insulation Guide 5th edition or earlier slab values are not acceptable (E.1.1.1 Comment 1).`
    :L.mixed?`Slab-on-ground construction R from H1/AS1 6th edition Appendix E (2.1.3.1 c)). Area ${(+L.A).toFixed(1)} m², perimeter ${(+L.P).toFixed(2)} m → A/P = ${(+L.ap).toFixed(2)} (Eq ${L.eq}), the same for every part. ${L.segs.map(g=>`${g.name?esc(g.name)+' ':''}${g.len.toFixed(2)} m ${g.edge?'with R1.0 edge insulation':'without edge insulation'}, ${g.wall==='masonry'?'masonry veneer':'other cladding'}: Table ${esc(g.table)}, A/P row ${esc(g.apRow)}, wall ${esc(g.band)} → R${g.R.toFixed(1)}`).join('; ')}. Equations E.3–E.5: R = 1 / Σ (Pᵢ/P ÷ Rᵢ) = R${L.Rtxt}. A/P rows: the smaller row when A/P falls between two — no interpolation.`
    :`Slab-on-ground construction R from H1/AS1 6th edition Appendix E (2.1.3.1 c)). Area ${(+L.A).toFixed(1)} m², perimeter ${(+L.P).toFixed(1)} m → A/P = ${(+L.ap).toFixed(2)} (Eq ${L.eq}). ${esc(L.title)}. A/P row ${esc(L.apRow)} (the smaller row when A/P falls between two — no interpolation), effective wall thickness ${esc(L.band)} → R${L.Rtxt}.`;
    const txt2=txt+(L.ok&&!L.vm1?' Tables for soil conductivity λ = 2.0 W/(m·K) (E.1.2.1 Comment 5); floor coverings not counted.':'');
    const ED=e=>e?'R1.0':'None',WL=w=>w==='masonry'?'Masonry veneer':'Other cladding',sv=c.v.slab||{};
    const rows=!L.ok||L.vm1?[]:L.segs?L.segs:[{len:+L.P,edge:sv.sE==='r10',wall:sv.sWall||'other',table:L.table,apRow:L.apRow,band:L.band,R:L.R}];
    const tb=rows.length?`<table class="cb-tb sbt"><colgroup><col style="width:18mm"><col style="width:22mm"><col style="width:28mm"><col style="width:22mm"><col style="width:18mm"><col><col style="width:13mm"></colgroup><thead><tr><th class="n">Length m</th><th>Edge insulation</th><th>External wall</th><th>Table</th><th class="n">A/P row</th><th>Wall thickness</th><th class="n">R</th></tr></thead><tbody>${rows.map(g=>`<tr><td class="n">${g.name?esc(g.name)+' ':''}${(+g.len).toFixed(2)}</td><td>${ED(g.edge)}</td><td>${WL(g.wall)}</td><td class="mono">${esc(g.table)}</td><td class="n">${esc(g.apRow)}</td><td>${esc(g.band)}</td><td class="n">${g.R.toFixed(1)}</td></tr>`).join('')}<tr class="tot"><td colspan="6">${L.segs?'Equations E.3–E.5: R = 1 / Σ (Pᵢ/P ÷ Rᵢ)':'One perimeter part — the table value'} · A/P = ${(+L.ap).toFixed(2)} (Eq ${L.eq})</td><td class="n">R${L.Rtxt}</td></tr></tbody></table>`:'';
    return[`<section class="cb">${cbHead(s,'',null,!L.ok)}${tb}<p class="cb-pn">${txt2}</p>${inp}</section>`]}
  if(s.manual)return[`<section class="cb">${hd}<p class="cb-man">R-value entered directly. Source to be attached.</p></section>`];
  const d=drawing(c,true);
  const s0=d?null:toSection(c),fig=d?`<figure class="cb-fig ${d.t}">${uniq(d.svg,k)}</figure>${d.notDrawn.length?`<div class="cb-nd">Not shown in the drawing: ${esc(d.notDrawn.join(', '))}</div>`:''}`:s0&&s0.na?`<div class="cb-nd">${esc(s0.na)}</div>`:'';
  const out=[`<section class="cb">${hd}${fig}<div class="cb-bd">${layerTable(s,c.el==='wall'?'':howLine(s))}</div>${fnHTML(s)}</section>`];
  if(P){const pd=drawing(strategy(c).pc,true),pf=pd?`<figure class="cb-fig ${pd.t}">${uniq(pd.svg,k+'p')}</figure>`:'';
    out.push(`<section class="cb cb-per">${cbHead(P,'Perimeter',s.name+' — ceiling perimeter',P.checks.some(x=>!x.ok&&!x.warn))}${pf}${edgeHTML(P)}<div class="cb-bd">${layerTable(P)}</div>${P.rsText?`<p class="cb-pn">${esc(P.rsText)}</p>`:''}${fnHTML(P)}</section>`)}
  return out}
/* the drawing is fitted whole into its fixed-height figure; numbers print at 9pt, nothing in it below 7pt */
function fitFig(el){const fig=el.querySelector('.cb-fig'),svg=fig&&fig.querySelector('svg');if(!svg)return;const V=svg.viewBox.baseVal;if(!V||!V.width)return;
  /* insulation drawn with a loop pattern gets a solid pale copy underneath: some print routes drop SVG patterns, and the band must still show */
  svg.querySelectorAll('[style*="url(#"][style*="batt"]').forEach(s=>{const u=s.cloneNode(false);u.removeAttribute('data-layer');u.setAttribute('class','ins-under');u.setAttribute('style','fill:#F3DE9C;stroke:none');s.parentNode.insertBefore(u,s)});
  const sc=Math.min(fig.clientWidth/V.width,fig.clientHeight/V.height),PT=96/72;if(!sc)return;
  svg.querySelectorAll('text.num').forEach(t=>t.style.fontSize=(9*PT/sc).toFixed(1)+'px');
  svg.querySelectorAll('text:not(.num)').forEach(t=>{const fs=parseFloat(getComputedStyle(t).fontSize)||0;if(fs*sc<7.05*PT)t.style.fontSize=(Math.ceil(7.05*PT/sc*10)/10)+'px'});
  svg.querySelectorAll('.leader-dot').forEach(d=>d.setAttribute('r',(.55*96/25.4/sc).toFixed(1)))}

/* pages: fixed A4 sheets, filled block by block so preview and print are the same */
function selfCheck(c){const s=toSheet(c,S.list);if(s.manual)return;const sum=s.layers.reduce((a,l)=>a+(l.counted||0),0);
  if(Math.abs(sum-s.total)>.015)console.warn(s.ref+': counted layers add to '+sum.toFixed(2)+', total '+s.total.toFixed(2));
  s.portions.forEach(p=>p.paths.forEach(g=>{const t=g.parts.reduce((a,q)=>a+q.r,0);if(Math.abs(t-g.r)>.015)console.warn(s.ref+' '+p.id+' '+g.name+': parts '+t.toFixed(2)+' ≠ '+g.r.toFixed(2))}))}
function stamp(){const P=[...document.querySelectorAll('#pdfpages .pg')];P.forEach((p,i)=>p.querySelector('.pg-fs').innerHTML=pageFoot(i+1,P.length))}
function pages(){const host=$('#pdfpages');if(!host)return;host.classList.remove('solo');host.innerHTML='';const L=incl();
  if(!S.pdf.sum&&!L.length){host.innerHTML='<div class="pdf-empty">Nothing selected.</div>';return}
  const over=b=>b.scrollHeight>b.clientHeight+1;
  const add=()=>{const p=document.createElement('div');p.className='pg';p.dataset.theme='light';p.innerHTML=`<div class="pg-b"></div><div class="pg-fs">${pageFoot(1,1)}</div>`;host.appendChild(p);return p.querySelector('.pg-b')};
  const MV=':scope>.cb-edge,:scope>.cb-bd,:scope>.cb-pn,:scope>.cb-fn';
  const split=(b,dep)=>{dep=dep||0;const el=b.lastElementChild;if(!over(b)||dep>8)return b;const cont=el.classList.contains('cont');
    const mv=[...el.querySelectorAll(MV)].filter((x,i)=>!(cont&&i===0));if(!mv.length)return b;
    const ref=el.querySelector('.ref').textContent,nm=el.querySelector('.cb-l h2').textContent.replace(/ — continued$/,''),nb=add();
    nb.insertAdjacentHTML('beforeend',`<section class="cb cont"><div class="cb-hd"><div class="cb-l"><span class="ref">${esc(ref)}</span><h2>${esc(nm)} — continued</h2></div></div></section>`);
    const cs=nb.lastElementChild;
    /* move from the end until the sheet fits, then split the new sheet the same way */for(let k=mv.length-1;k>=0;k--){if(!over(b))break;cs.insertBefore(mv[k],cs.children[1]||null)}
    return split(nb,dep+1)};
  const put=(b,html,fit)=>{b.insertAdjacentHTML('beforeend',html);let el=b.lastElementChild;if(fit)fit(el);
    if(over(b)&&b.children.length>1){el.remove();b=add();b.insertAdjacentHTML('beforeend',html);el=b.lastElementChild;if(fit)fit(el)}
    return over(b)?split(b):b};
  /* first page: title, project details, then the construction R-value summary */
  let b0=null;if(XP&&!S.pdf.solo){b0=add();b0.insertAdjacentHTML('beforeend',sumHead());XP.pdf().forEach(h=>{b0=put(b0,h)})}
  if(S.pdf.sum){let b=b0||add();b.insertAdjacentHTML('beforeend',(b0?'':sumHead())+sumTable());let tb=[...b.querySelectorAll('table.ps-sum tbody')].pop();
    sumRows().forEach(h=>{tb.insertAdjacentHTML('beforeend',h);if(!over(b))return;const carry=[tb.lastElementChild];carry[0].remove();
      const prev=tb.lastElementChild;if(prev&&prev.classList.contains('grp')){prev.remove();carry.unshift(prev)}
      b=add();b.insertAdjacentHTML('beforeend',sumTable());tb=b.querySelector('tbody');carry.forEach(r=>tb.appendChild(r))});
    b=put(b,basisBlock())}
  if(L.length){let b=add();L.forEach((c,i)=>{selfCheck(c);block(c,i).forEach(h=>{b=put(b,h,fitFig)})});}
  stamp();
  if(S.pdf.solo){const P=[...host.querySelectorAll('.pg')];host.classList.add('solo');const i=S.pdf.solo==='perim'?Math.max(0,P.findIndex(p=>p.querySelector('.cb.cb-per'))):S.pdf.solo-1;if(P[i])P[i].classList.add('on')}}
function openPdf(){S.pdf.open=true;let x=$('#pdfx');if(!x){x=document.createElement('div');x.id='pdfx';x.className='pdfx';document.body.appendChild(x)}
  x.innerHTML=`<div class="pdfbar"><div class="pdfbar-a"><h2>Export PDF</h2><div class="pdfbar-b"><button class="v6pdfb" data-a="pdfdl"><span class="ms s18">download</span>Download PDF</button><button class="v6btn" data-a="pdfclose">Close</button></div></div>
  <div class="pdfgrp"><span class="glbl">Project details</span><div class="pdffields">${PF.map(([k,l])=>`<label class="pdff${k==='address'?' wide':''}"><span>${l}</span><input type="text" data-p="${k}" value="${esc(S.pdf.proj[k])}" autocomplete="off"></label>`).join('')}<label class="pdff zone"><span>Climate zone</span><input type="text" value="Zone ${S.zone}" readonly tabindex="-1"></label></div></div>
  <div class="pdfgrp"><span class="glbl">Include</span><div class="pdfinc"><label class="tgl"><input type="checkbox" data-sum="1"${S.pdf.sum?' checked':''}>Summary sheet</label>${ordered().map(c=>`<label class="tgl"><input type="checkbox" data-inc="${c.id}"${S.pdf.ex[c.id]?'':' checked'}><b class="mono">${toSheet(c,S.list).ref}</b>${esc(c.name)}</label>`).join('')}</div></div></div>
  <div class="pdfpages" id="pdfpages"></div>`;
  document.documentElement.classList.add('pdf-open');pages();if(document.fonts)document.fonts.ready.then(()=>{if(S.pdf.open)pages()})}
function closePdf(){S.pdf.open=false;const x=$('#pdfx');if(x)x.remove();document.documentElement.classList.remove('pdf-open')}
async function download(){const API=window.RVC_BACKEND?'/api/h1/report':null;
  if(API){try{const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:S.pdf.proj,elements:[],constructions:incl().map(c=>toReport(c,S.list))})});
    if(!res.ok)throw 0;const b=await res.blob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=exportFileName(projName(),'pdf');a.click();return}catch(_){}}
  printAs(projName())}
/* the project name everywhere a file is named: Project Details F7, which is the address on the Project page */
function projName(){const p=S.pdf.proj||{};return p.address||p.project_name||''}
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.p){S.pdf.proj[t.dataset.p]=t.value;stamp();if(XP)XP.after()}});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset)return;if(t.dataset.inc){S.pdf.ex[t.dataset.inc]=!t.checked;pages()}else if(t.dataset.sum){S.pdf.sum=t.checked;pages()}});
{const K={w1:0,w2:1,w3:2,r1:3,r2:3,f1:5},at=k=>S.list[K[k]];
  if(q.get('strap'))q.get('strap').split(',').forEach(k=>{const c=at(k);if(c){c.o.strap=true;ensure(c)}});
  if(q.get('inc')){const on=q.get('inc').split(',').map(at);S.list.forEach(c=>{if(!on.includes(c))S.pdf.ex[c.id]=true})}
  if(q.get('sum')==='0')S.pdf.sum=false;
  {const r=at('r1');if(r){r.v.edge=r.v.edge||{};if(q.get('heel'))r.v.edge.heel=+q.get('heel');if(q.get('heated'))r.heated=true;if(q.get('psel'))r.v.edge.psel=q.get('psel')}}
  if(q.get('sheet'))S.pdf.solo=q.get('sheet')==='perim'?'perim':(+q.get('sheet')||1)}
render();
if(S.pdf.solo){document.documentElement.classList.add('pdf-solo');openPdf()}else if(q.get('pdf'))openPdf();
})();
