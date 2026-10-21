/* Save / Open project files — all in the browser. File: <exportBaseName>.ezh1.json
   { format:"ezbuild-h1", version:1, savedAt, project:{P, proj}, list:[constructions, materials by fixed id] }
   Open also accepts a PDF that carries the same JSON as an embedded file (/EmbeddedFile, FlateDecode or plain). */
(function(g){'use strict';
var FORMAT='ezbuild-h1',VERSION=2;
function pack(S,P){return{format:FORMAT,version:VERSION,savedAt:new Date().toISOString(),project:{P:JSON.parse(JSON.stringify(P)),proj:JSON.parse(JSON.stringify(S.pdf.proj||{}))},list:toSaved(S.list),guide:JSON.parse(JSON.stringify(S.guide||{}))}}
/* older file versions are converted here, one step at a time (none yet) */
var MIG={1:function(d){d.guide=d.guide||{};return d}};   /* 1 → 2: House Guide choices (none in version 1 files) */
function check(d){if(!d||typeof d!=='object')return'This file is not an EZbuild H1 project.';
  if(d.format!==FORMAT)return'This file is not an EZbuild H1 project (format “'+String(d.format||'none')+'”).';
  if(!(+d.version>=1))return'This project file has no valid version.';
  if(+d.version>VERSION)return'This project was saved by a newer version of the calculator (file version '+d.version+', this page reads up to '+VERSION+'). Update the page and try again.';
  if(!Array.isArray(d.list)||!d.project)return'This project file is incomplete — no constructions or project data.';return null}
function migrate(d){var v=+d.version;while(v<VERSION){if(!MIG[v])throw new Error('No migration from version '+v);d=MIG[v](d);v++;d.version=v}return d}
function name(S){var p=S.pdf.proj||{};return exportFileName(p.address||p.project_name||'','ezh1.json')}
function save(S,P){var b=new Blob([JSON.stringify(pack(S,P),null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name(S);document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
/* ---------- reading a PDF's embedded project file ---------- */
function latin(u8){var s='';for(var i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return s}
async function inflate(u8){if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot read compressed PDF data.');
  var ds=new DecompressionStream('deflate'),w=ds.writable.getWriter();w.write(u8);w.close();return new Uint8Array(await new Response(ds.readable).arrayBuffer())}
async function fromPdf(u8){var s=latin(u8),re=/\/Type\s*\/EmbeddedFile\b[\s\S]{0,400}?>>\s*stream\r?\n/g,m;
  while((m=re.exec(s))){var dict=s.slice(Math.max(0,m.index-400),m.index+m[0].length),start=m.index+m[0].length,end=s.indexOf('endstream',start);if(end<0)continue;
    var raw=u8.subarray(start,end),txt;try{txt=/\/FlateDecode/.test(dict)?new TextDecoder().decode(await inflate(raw)):new TextDecoder().decode(raw)}catch(e){continue}
    txt=txt.trim();try{var d=JSON.parse(txt);if(d&&d.format===FORMAT)return d}catch(e){}}
  return null}
async function read(file){var u8=new Uint8Array(await file.arrayBuffer());
  if(latin(u8.subarray(0,5))==='%PDF-'){var d=await fromPdf(u8);if(!d)return{err:'This PDF has no project data.'};return{data:d}}
  var t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(u8)}catch(e){return{err:'This file is not an EZbuild H1 project (not a text file).'}}
  try{return{data:JSON.parse(t)}}catch(e){return{err:'This file is not an EZbuild H1 project (not valid JSON).'}}}
g.EZFile={FORMAT:FORMAT,VERSION:VERSION,pack:pack,check:check,migrate:migrate,save:save,read:read,name:name};
})(window);
