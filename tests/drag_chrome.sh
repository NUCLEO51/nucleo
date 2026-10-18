#!/bin/bash
set -e
rm -rf /tmp/drag_t && mkdir /tmp/drag_t && cp ~/Projects/nucleo/index.html /tmp/drag_t/
python3 - <<'PYEOF'
p='/tmp/drag_t/index.html'
s=open(p,encoding='utf-8').read()
seed="<style>#lg{display:none!important}</style><script>window.__NUCLEO_TEST__=true;</script>\n"
s=s.replace('<script id="lib">',seed+'<script id="lib">',1)
tail=r"""
<script>
setTimeout(async function(){
  var T=window.__NUCLEO_TEST__,S=T.S,out={},wait=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  try{
    var titles=['Banana','Abacate','Cereja','Damasco','Figo'];
    S.ready=true;S.conf='del';S.folders=[{id:'cr',name:'Consulta rápida'}];S.lists=[];S.reminders=[];S.events=[];S.inbox=[];
    S.notes=titles.map(function(t,i){return {id:'n'+(i+1),title:t,body:'texto '+t,folder:'cr',kind:'nota',checklist:[],files:[],images:[],createdAt:10-i,updatedAt:10-i};});
    S.raw={reminders:[],lists:[],notes:S.notes.slice(),folders:S.folders.slice(),events:[],inbox:[]};
    S.tab='lembretes';S.folder='cr';
    document.getElementById('tab-notas').click();await wait(300);
    var grp=document.querySelector('[data-rgroup="notes:cr"]');
    var ids=function(){return Array.from(document.querySelector('[data-rgroup="notes:cr"]').children).map(function(c){return c.getAttribute('data-rid');}).join(',');};
    out.antes=ids();
    var rows=Array.from(grp.children),r0=rows[0],rect0=r0.getBoundingClientRect();
    var x=rect0.left+rect0.width/2,y0=rect0.top+rect0.height/2;
    var tch=function(type,y,target){var t=new Touch({identifier:7,target:target||r0,clientX:x,clientY:y,pageX:x,pageY:y});return new TouchEvent(type,{touches:type==='touchend'?[]:[t],targetTouches:type==='touchend'?[]:[t],changedTouches:[t],bubbles:true,cancelable:true});};
    r0.dispatchEvent(tch('touchstart',y0));
    await wait(650);
    out.arrastando=!!T.RO.drag;out.barra=!!document.getElementById('roBar');
    var rect3=rows[3].getBoundingClientRect(),yFim=rect3.top+rect3.height*0.8;
    for(var k=1;k<=12;k++){var yy=y0+(yFim-y0)*k/12;r0.dispatchEvent(tch('touchmove',yy));await wait(40);}
    out.aoVivo=ids();
    r0.dispatchEvent(tch('touchend',yFim));
    await wait(500);
    out.depois=ids();
    out.ordens=S.notes.slice().sort(function(a,b){return a.ord-b.ord;}).map(function(n){return n.id;}).join(',');
    out.abriuNota=(S.sheet&&S.sheet.type)||'nao';
    out.datasIguais=S.notes.map(function(n){return n.updatedAt;}).join(',');
    out.destaque=!!document.querySelector('.ro-sel');
  }catch(e){out.err=String(e&&e.stack||e);}
  document.title='RESULT '+JSON.stringify(out);
},700);
</script>
"""
s=s.replace('</body>',tail+'</body>',1)
open(p,'w',encoding='utf-8').write(s)
PYEOF
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$C" --headless=new --disable-gpu --window-size=390,844 --virtual-time-budget=20000 --dump-dom "file:///tmp/drag_t/index.html" 2>/dev/null | grep -o "<title>RESULT[^<]*</title>" > /tmp/drag_result.txt || true
cat /tmp/drag_result.txt
