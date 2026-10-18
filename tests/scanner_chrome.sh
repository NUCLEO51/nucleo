#!/bin/bash
set -e
rm -rf /tmp/scan_t && mkdir /tmp/scan_t && cp ~/Projects/nucleo/index.html /tmp/scan_t/
python3 - <<'EOF'
p='/tmp/scan_t/index.html'
s=open(p,encoding='utf-8').read()
s=s.replace('<script id="lib">','<style>#lg{display:none!important}</style><script>window.__NUCLEO_TEST__=true;</script>\n<script id="lib">',1)
tail=r"""
<script>
setTimeout(async function(){
  var T=window.__NUCLEO_TEST__,out={},wait=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  try{
    var cv=document.createElement('canvas');cv.width=1200;cv.height=1600;var x=cv.getContext('2d');
    x.fillStyle='#2b2b2b';x.fillRect(0,0,1200,1600);
    x.save();x.translate(600,800);x.rotate(0.12);
    var g=x.createLinearGradient(-400,0,400,0);g.addColorStop(0,'#b5b5b5');g.addColorStop(1,'#f4f4f4');x.fillStyle=g;x.fillRect(-400,-560,800,1120);
    x.fillStyle='#111';for(var i=0;i<30;i++){x.fillRect(-340,-480+i*30,560+((i*37)%120),6);}
    x.restore();
    var blob=await new Promise(function(r){cv.toBlob(r,'image/jpeg',0.9);});
    var file=new File([blob],'foto.jpg',{type:'image/jpeg'});
    var got=null;T.openScanner(function(f){got=f;});
    var inp=document.getElementById('scFcam');
    Object.defineProperty(inp,'files',{value:[file]});inp.onchange();
    await wait(2500);
    out.editor=!!document.getElementById('edBox');
    out.handles=document.querySelectorAll('[data-h]').length;
    var pts=(document.getElementById('edPoly')||{getAttribute:function(){return '';}}).getAttribute('points');
    out.poly=pts;
    out.msg=(document.querySelector('#scanUI p:nth-of-type(1)')||{}).textContent;
    document.getElementById('edOk').click();await wait(4000);
    out.preview=!!document.getElementById('pvCv');
    var pv=document.getElementById('pvCv');
    if(pv){out.size=[pv.width,pv.height];var d=pv.getContext('2d').getImageData(8,8,1,1).data;out.cornerColor=[d[0],d[1],d[2]];var d2=pv.getContext('2d').getImageData(pv.width-9,pv.height-9,1,1).data;out.cornerColor2=[d2[0],d2[1],d2[2]];}
    document.querySelector('[data-m="doc"]').click();await wait(2000);
    if(pv){var e=pv.getContext('2d').getImageData(8,8,1,1).data;out.docCorner=[e[0],e[1],e[2]];}
    window.__errs=[];window.addEventListener('error',function(e){window.__errs.push(String(e.message));});window.addEventListener('unhandledrejection',function(e){window.__errs.push('rej:'+String(e.reason&&e.reason.stack||e.reason));});
    document.getElementById('pvOk').click();for(var k=0;k<40;k++){await wait(500);if(/Páginas \(1\)/.test((document.getElementById('scanUI')||{textContent:''}).textContent))break;}out.waitedAdd=k;
    var ui=document.getElementById('scanUI');out.afterAdd=ui?ui.textContent.slice(0,160):'(sem scanUI)';out.errs=window.__errs;
    out.pages=/Páginas \(1\)/.test((ui||{textContent:''}).textContent);
    if(document.getElementById('scFinish')){document.getElementById('scFinish').click();await wait(800);}
    out.pdf=got?{name:got.name,size:got.size,type:got.type}:null;
    if(got){var b64=await new Promise(function(r){var fr=new FileReader();fr.onload=function(){r(String(fr.result).split(',')[1]);};fr.readAsDataURL(got);});document.body.setAttribute('data-pdf',b64);}
  }catch(e){out.err=String(e&&e.stack||e);}
  document.title='RESULT '+JSON.stringify(out);
},800);
</script>
"""
s=s.replace('</body>',tail+'</body>',1)
open(p,'w',encoding='utf-8').write(s)
EOF
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$C" --headless=new --disable-gpu --window-size=500,900 --virtual-time-budget=30000 --dump-dom "file:///tmp/scan_t/index.html" 2>/dev/null > /tmp/scan_dom.html || true
grep -o "<title>RESULT[^<]*</title>" /tmp/scan_dom.html > /tmp/scan_result.txt || true
python3 - <<'EOF2'
import re,base64
h=open('/tmp/scan_dom.html',encoding='utf-8',errors='ignore').read()
m=re.search(r'data-pdf="([^"]+)"',h)
if m:
    open('/tmp/scan_out.pdf','wb').write(base64.b64decode(m.group(1)))
    print('pdf salvo')
EOF2
file /tmp/scan_out.pdf
sips -s format png /tmp/scan_out.pdf --out /tmp/scan_out.png >/dev/null 2>&1 || true
ls -la /tmp/scan_out.png
cat /tmp/scan_result.txt
