(function(){
  var form=document.getElementById('contact-form'); if(!form) return;
  var btn=document.getElementById('c-btn'), status=document.getElementById('c-status');
  var captchaRequested=false;
  // Adapt the page to the link the visitor came from, e.g. /contact/?topic=state
  var TOPICS={
    mistake:{title:'Report a mistake',lede:'Tell us what looks wrong, which page it\u2019s on, and what you expected to see. We check every report against the official source.',ph:'For example: the notice period on the QLD rules page says 2 months, but my notice said 60 days.'},
    state:{title:'Request your state',lede:'Tell us which state you rent in. Requests help us decide which checker to build next.',ph:'For example: I rent in Western Australia and would use a checker for WA rent increases.'},
    feedback:{title:'Send feedback',lede:'Tell us what\u2019s confusing, broken or missing, or what would make RentRise more useful.',ph:'Tell us what you noticed or what you\u2019d like to see.'},
    other:{title:'Contact us',lede:'Send us a message and we\u2019ll get back to you by email.',ph:'How can we help?'}
  };
  var sel=document.getElementById('c-topic'), msg=document.getElementById('c-msg');
  var titleEl=document.getElementById('contact-title'), ledeEl=document.getElementById('contact-lede');
  function keyOf(){ var o=sel && sel.options[sel.selectedIndex]; return o ? o.getAttribute('data-key') : null; }
  function applyPlaceholder(){ var t=TOPICS[keyOf()]; if(t && msg) msg.placeholder=t.ph; }
  try{
    var key=new URLSearchParams(location.search).get('topic');
    if(key && TOPICS[key] && sel){
      for(var i=0;i<sel.options.length;i++){ if(sel.options[i].getAttribute('data-key')===key){ sel.selectedIndex=i; break; } }
      if(titleEl) titleEl.textContent=TOPICS[key].title;
      if(ledeEl) ledeEl.textContent=TOPICS[key].lede;
      document.title=TOPICS[key].title+' | RentRise';
    }
    applyPlaceholder();
    if(sel) sel.addEventListener('change',applyPlaceholder);
  }catch(err){}
  function say(msg,cls){ status.textContent=msg; status.className='c-status '+(cls||''); }
  // Load hCaptcha (via Web3Forms) only when someone starts using the form.
  function loadCaptcha(){
    if(captchaRequested) return; captchaRequested=true;
    var s=document.createElement('script');
    s.src='https://web3forms.com/client/script.js'; s.async=true; s.defer=true;
    document.body.appendChild(s);
  }
  form.addEventListener('focusin',loadCaptcha);
  form.addEventListener('pointerdown',loadCaptcha);
  form.addEventListener('submit',function(e){
    e.preventDefault();
    loadCaptcha();
    if(!form.checkValidity()){ form.reportValidity(); return; }
    var tokenField=form.querySelector('textarea[name="h-captcha-response"], [name="h-captcha-response"]');
    if(!tokenField || !tokenField.value){ say('Please complete the “I am human” check above the button.','err'); return; }
    var data=new FormData(form);
    data.delete('redirect');
    data.append('page', location.pathname);
    btn.disabled=true; btn.textContent='Sending…'; say('');
    fetch(form.action,{method:'POST',body:data,headers:{'Accept':'application/json'}})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok && j.success, j:j}; }); })
      .then(function(res){
        if(res.ok){ form.reset(); say('Thanks, your message has been sent. We’ll reply by email.','ok'); }
        else { say('Your message didn’t send. Please try again, or email hello@rentrise.au.','err'); }
      })
      .catch(function(){ say('Your message didn’t send. Check your connection and try again, or email hello@rentrise.au.','err'); })
      .then(function(){
        btn.disabled=false; btn.textContent='Send message';
        try{ if(window.hcaptcha) window.hcaptcha.reset(); }catch(err){}
      });
  });
})();
