/* Anonymous usage counts.
   Sends only a state code, an event name and a result category, for example
   {s:"vic", e:"result", v:"bad", r:["short_notice"]}.
   It never sends dates, rent amounts, other answers, or anything that identifies you. */
(function(){
  var ENDPOINT='/api/e';
  var verdictEl=document.getElementById('verdict');
  var state=(location.pathname.match(/^\/(qld|nsw|vic)\//)||[])[1];
  if(!state || !verdictEl) return;

  var interacted=false, sentResult=false, latest=null;

  function send(payload){
    try{
      var body=JSON.stringify(payload);
      if(navigator.sendBeacon){ navigator.sendBeacon(ENDPOINT,new Blob([body],{type:'application/json'})); }
      else { fetch(ENDPOINT,{method:'POST',body:body,headers:{'Content-Type':'application/json'},keepalive:true}).catch(function(){}); }
    }catch(e){}
  }

  // Map failed rule titles (fixed text written by us) to short category codes.
  var RULES=[
    [/too soon/i,'too_early'],
    [/not enough notice|notice arrived after/i,'short_notice'],
    [/in writing/i,'not_written'],
    [/official notice form/i,'no_form'],
    [/missing/i,'missing_details'],
    [/lease|clause/i,'no_lease_term']
  ];
  function reasons(){
    var out=[];
    document.querySelectorAll('#checks .mark.fail').forEach(function(m){
      var t=(m.parentNode.querySelector('b')||{}).textContent||'';
      for(var i=0;i<RULES.length;i++){ if(RULES[i][0].test(t)){ if(out.indexOf(RULES[i][1])<0) out.push(RULES[i][1]); break; } }
    });
    return out;
  }

  // Only count a check once someone has actually entered their own answers
  // (not the pre-filled example), and only their final result per visit.
  var form=document.getElementById('f');
  // Setting values in code (the example, or a shared link) doesn't fire 'input', so only real edits count.
  if(form) form.addEventListener('input',function(){ interacted=true; },true);
  document.addEventListener('rr:verdict',function(e){ if(e.detail) latest=e.detail.result; });

  function sendResult(){
    if(sentResult || !interacted || !latest || latest==='none') return;
    sentResult=true;
    send({s:state,e:'result',v:latest,r:latest==='bad'?reasons():[]});
  }
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') sendResult(); });
  window.addEventListener('pagehide',sendResult);

  // One-off actions
  function action(name){ if(interacted) sendResult(); send({s:state,e:name}); }
  var copy=document.getElementById('copy'); if(copy) copy.addEventListener('click',function(){ action('message_copied'); });
  var cal=document.getElementById('calBtn'); if(cal) cal.addEventListener('click',function(){ action('calendar'); });
  document.addEventListener('rr:event',function(e){ if(e.detail && e.detail.event) action(e.detail.event); });
})();
