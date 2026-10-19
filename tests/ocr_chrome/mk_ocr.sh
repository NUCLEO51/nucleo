#!/bin/bash
rm -rf /tmp/fin_t && mkdir /tmp/fin_t && cp ~/Projects/nucleo/fin/index.html /tmp/fin_t/index.html
python3 - <<'PYEOF'
p='/tmp/fin_t/index.html'
s=open(p,encoding='utf-8').read()
tail=r"""
<script>
window.addEventListener('load',async function(){
  var out={};
  try{
    var hoje=new Date(),alvo=new Date(hoje.getTime()+40*864e5);
    function pad(n){return String(n).padStart(2,'0');}
    var dias=Math.round((Date.UTC(alvo.getFullYear(),alvo.getMonth(),alvo.getDate())-Date.UTC(2025,1,22))/864e5);
    var fator=String(1000+dias).padStart(4,'0'),val=String(12345).padStart(10,'0'),livre='1234567890123456789012345',banco='341';
    var dvg=bolMod11(banco+'9'+fator+val+livre);
    var c1=banco+'9'+livre.slice(0,5),c2=livre.slice(5,15),c3=livre.slice(15,25);
    var a=c1+bolMod10(c1),b=c2+bolMod10(c2),c=c3+bolMod10(c3);
    var linha=a.slice(0,5)+'.'+a.slice(5)+' '+b.slice(0,5)+'.'+b.slice(5)+' '+c.slice(0,5)+'.'+c.slice(5)+' '+dvg+' '+fator+val;
    var venc=pad(alvo.getDate())+'/'+pad(alvo.getMonth()+1)+'/'+alvo.getFullYear();
    var cv=document.createElement('canvas');cv.width=1500;cv.height=520;var g=cv.getContext('2d');
    g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.fillStyle='#000';g.font='bold 40px Arial';
    g.fillText('BANCO ITAU S.A.   341-7',40,70);
    g.font='36px Arial';g.fillText('Beneficiario: LOJA EXEMPLO LTDA',40,140);
    g.fillText('Vencimento: '+venc,40,210);
    g.fillText('Valor do documento: R$ 123,45',40,280);
    g.font='bold 44px Courier New';g.fillText(linha,40,400);
    var blob=await new Promise(function(r){cv.toBlob(r,'image/png');});
    var t0=Date.now();
    var txt=await ocrRead(await ocrPrep(blob),function(){});
    var r=docLer(txt,new Date());
    out={esperado:{linha:linha,venc:venc,valor:12345},segundos:Math.round((Date.now()-t0)/1000),texto:txt.slice(0,420),lido:r};
  }catch(e){out={erro:String(e&&e.message||e)};}
  document.title='OCR '+JSON.stringify(out);
});
</script>
"""
s=s.replace('</body>',tail+'</body>',1)
open(p,'w',encoding='utf-8').write(s)
PYEOF
cd /tmp/fin_t && (python3 -m http.server 8765 >/dev/null 2>&1 &) ; sleep 1
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$C" --headless=new --disable-gpu --window-size=1000,900 --virtual-time-budget=150000 --dump-dom "http://localhost:8765/index.html" 2>/dev/null | grep -o "<title>OCR[^<]*</title>" > /tmp/ocr_result.txt
pkill -f "http.server 8765"
cat /tmp/ocr_result.txt | head -c 2500
