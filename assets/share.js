/* Share and print a checker result.
   Answers are stored after the "#" in the link. Browsers never send that part
   of a link to a website's server, so sharing doesn't send answers to RentRise. */
(function(){
  var form=document.getElementById('f'), card=document.getElementById('shareCard');
  if(!form || !card) return;
  var status=document.getElementById('shareStatus');
  var DATE=/^\d{4}-\d{2}-\d{2}$/, NUM=/^\d{1,6}(\.\d{1,2})?$/, WORD=/^[a-z0-9]{1,12}$/;

  function collect(){
    var q=new URLSearchParams();
    form.querySelectorAll('input').forEach(function(el){
      if(el.type==='radio'){ if(el.checked) q.set(el.name, el.value); }
      else if((el.type==='date'||el.type==='number') && el.value) q.set(el.id, el.value);
    });
    return q.toString();
  }

  // Restore answers from a shared link, accepting only known fields and safe values.
  function restore(){
    var h=location.hash.slice(1);
    if(!h || h.indexOf('=')<0) return false;
    var q=new URLSearchParams(h), applied=0;
    q.forEach(function(v,k){
      var radio=form.querySelector('input[type="radio"][name="'+CSS.escape(k)+'"][value="'+CSS.escape(v)+'"]');
      if(radio && WORD.test(v)){ radio.checked=true; applied++; return; }
      var el=document.getElementById(k);
      if(!el || !form.contains(el)) return;
      if(el.type==='date' && DATE.test(v)){ el.value=v; applied++; }
      else if(el.type==='number' && NUM.test(v)){ el.value=v; applied++; }
    });
    // Remove answers from the address bar straight away, before analytics loads.
    try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    if(!applied) return false;
    var bar=document.getElementById('sampleBar'); if(bar) bar.hidden=true;
    form.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function link(){ return location.origin+location.pathname+'#'+collect(); }
  function headline(){ var h=document.querySelector('#verdict h2'); return h ? h.textContent : 'My rent increase check'; }
  function say(t){ status.textContent=t; }
  function track(name){ document.dispatchEvent(new CustomEvent('rr:event',{detail:{event:name}})); }

  document.getElementById('shareCopy').addEventListener('click',function(){
    var url=link();
    var done=function(){ say('Link copied. Anyone you send it to will see your answers.'); };
    var fail=function(){ say('Copy this link: '+url); };
    try{ navigator.clipboard.writeText(url).then(done,fail); }catch(e){ fail(); }
    track('share_link');
  });

  document.getElementById('shareWhatsApp').addEventListener('click',function(){
    var text='I checked our rent increase on RentRise: '+headline()+'\n'+link();
    window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');
    track('share_whatsapp');
  });

  var native=document.getElementById('shareNative');
  if(navigator.share){
    native.hidden=false;
    native.addEventListener('click',function(){
      navigator.share({title:'Rent increase check | RentRise',text:headline(),url:link()}).catch(function(){});
      track('share_native');
    });
  }

  document.getElementById('printBtn').addEventListener('click',function(){
    track('print');
    window.print();
  });

  document.addEventListener('rr:verdict',function(e){ card.hidden = !e.detail || e.detail.result==='none'; });
  var v=document.getElementById('verdict');
  card.hidden = !v || v.classList.contains('none');
  restore();
})();
