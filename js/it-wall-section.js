/* Intertenancy wall — plan cut, as a GIB Barrierline-type wall: lining | frame | gap | central board | gap | frame | lining.
   The central board stands free between the two frames (in practice held by wall clips). One stud per frame, opposite each
   other; insulation loops drawn as lines (no fill pattern, so they print everywhere). Numbered leaders only — the numbers
   match the layer table. The gaps are drawn (GAP mm each side) but not counted in the R-value — conservative. */
(function(root){'use strict';
var GAP=20,uid=0;
function itWallSection(o){var n=o.numbers||{},key='it'+(++uid),pad=40,L1=o.lin1.t,C=o.centre.t,L2=o.lin2.t,F1=o.f1.d,F2=o.f2.d,T=L1+F1+GAP+C+GAP+F2+L2,sc=440/T;
  var x=pad,out=[],clips=[],lab=[],y0=60,h=520,ym=y0+h/2;
  function band(name,th,cls){var w=th*sc;out.push('<g data-layer="'+name+'"><rect class="'+cls+'" x="'+x.toFixed(1)+'" y="'+y0+'" width="'+w.toFixed(1)+'" height="'+h+'"/></g>');lab.push({name:name,cx:x+w/2});x+=w}
  /* insulation loops down a band x0..x1, clipped to it */
  function loops(x0,x1,ya,yb){var bw=x1-x0,ry=bw*0.42,cx=(x0+x1)/2,id=key+'-c'+clips.length,s='';if(bw<=1||yb<=ya)return'';
    clips.push('<clipPath id="'+id+'"><rect x="'+x0.toFixed(1)+'" y="'+ya.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(yb-ya).toFixed(1)+'"/></clipPath>');
    for(var y=ya-ry;y<yb+ry;y+=ry){s+='<ellipse class="loop" cx="'+cx.toFixed(1)+'" cy="'+y.toFixed(1)+'" rx="'+(bw/2).toFixed(1)+'" ry="'+ry.toFixed(1)+'"/>'}
    return '<g clip-path="url(#'+id+')">'+s+'</g>'}
  /* a frame: insulation against its lining (side 'l' or 'r'), one stud across the cut at mid-height */
  function frame(name,f,side){var w=f.d*sc,ins=f.ins&&(Array.isArray(f.ins)?f.ins[0]:f.ins),t=ins?Math.min(ins.thickness||f.d,f.d)*sc:0,sw=f.w*sc;
    var ix0=side==='l'?x:x+w-t,ix1=ix0+t,sy=ym-sw/2,g='<g data-layer="'+name+'">';
    if(t>0){g+='<rect class="ins" x="'+ix0.toFixed(1)+'" y="'+y0+'" width="'+t.toFixed(1)+'" height="'+h+'"/>'+loops(ix0,ix1,y0,sy)+loops(ix0,ix1,sy+sw,y0+h)}
    g+='<rect class="stud" x="'+x.toFixed(1)+'" y="'+sy.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+sw.toFixed(1)+'"/>'+
       '<line class="grain" x1="'+x.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+(x+w).toFixed(1)+'" y2="'+(sy+sw).toFixed(1)+'"/></g>';
    out.push(g);lab.push({name:name,cx:x+(side==='l'?t/2:w-t/2)});x+=w}
  function gap(){x+=GAP*sc}
  band('lining1',L1,'lin');frame('frame1',o.f1,'l');gap();band('centre',C,'lin board');gap();frame('frame2',o.f2,'r');band('lining2',L2,'lin');
  /* leaders: from each numbered layer, staggered down the cut (clear of the studs), to its number in a column on the right */
  var tx=x+70,svg='',k=0,ys=[y0+50,y0+110,ym+80,y0+h-110,y0+h-50];
  lab.forEach(function(l){var num=n[l.name];if(num==null)return;var ya=ys[k%ys.length],yy=y0+30+k*(h-60)/4;k++;
    svg+='<polyline class="leader" points="'+l.cx.toFixed(1)+','+ya.toFixed(1)+' '+(x+20).toFixed(1)+','+ya.toFixed(1)+' '+(tx-16)+','+(yy-8).toFixed(1)+'"/>'+
      '<circle class="leader-dot" cx="'+l.cx.toFixed(1)+'" cy="'+ya.toFixed(1)+'" r="6"/>'+
      '<text class="label num" x="'+tx+'" y="'+yy.toFixed(1)+'">'+num+'</text>'});
  var Wd=tx+60;
  return '<svg class="it-section wall-section" viewBox="0 0 '+Wd+' '+(y0+h+70)+'" xmlns="http://www.w3.org/2000/svg"><defs>'+clips.join('')+'</defs>'+out.join('')+svg+
    '<text class="cap" x="'+pad+'" y="'+(y0-20)+'">UNIT A</text><text class="cap" x="'+(x)+'" y="'+(y0-20)+'" text-anchor="end">UNIT B</text>'+
    '<text class="cap" x="'+pad+'" y="'+(y0+h+44)+'">Plan cut · '+T+' mm incl. 2 × '+GAP+' mm gaps (not counted)</text></svg>'}
root.itWallSection=itWallSection})(typeof window!=='undefined'?window:this);
