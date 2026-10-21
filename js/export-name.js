/* One file name for everything this site exports: "H1 construction R-value - <project name>".
   exportBaseName(name) — safe on Windows and macOS. printAs(name) — print with that name as the document title
   (the browser uses it as the "Save as PDF" file name and the PDF Title), then put the old titles back. */
(function(g){'use strict';
var PRE='H1 construction R-value - ',MAX=150;
function exportBaseName(name){
  var n=String(name==null?'':name).replace(/[\\/:*?"<>|\r\n]+/g,'-').replace(/\s+/g,' ').replace(/^[\s.]+|[\s.]+$/g,'');
  if(!n)n='Untitled project';
  if(n.length+PRE.length>MAX)n=n.slice(0,MAX-PRE.length).replace(/[\s.]+$/,'');
  return PRE+n}
function exportFileName(name,ext){return exportBaseName(name)+'.'+String(ext||'pdf').replace(/^\./,'')}
function printAs(name){var t=exportBaseName(name),docs=[document];
  try{if(window.top&&window.top!==window&&window.top.document)docs.push(window.top.document)}catch(e){}
  var old=docs.map(function(d){try{return d.title}catch(e){return null}});
  docs.forEach(function(d){try{d.title=t}catch(e){}});
  var done=false;function restore(){if(done)return;done=true;docs.forEach(function(d,i){try{if(old[i]!=null)d.title=old[i]}catch(e){}});window.removeEventListener('afterprint',restore)}
  window.addEventListener('afterprint',restore);
  try{window.print()}finally{setTimeout(restore,1500)}}
g.exportBaseName=exportBaseName;g.exportFileName=exportFileName;g.printAs=printAs;
})(typeof window!=='undefined'?window:this);
