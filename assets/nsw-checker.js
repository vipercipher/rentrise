(function(){
  const $ = id => document.getElementById(id);
  const DAY = 86400000;
  const LEGACY_CUTOFF = Date.UTC(2024,11,13); // 13 Dec 2024
  const EXAMPLE = {agr:'periodic', len:'under2', terms:'unsure', start:'2025-03-01', lastinc:'', notice:'2026-01-10', newstart:'2026-03-01', writing:'yes', content:'yes', cur:'720', nw:'780'};

  function parse(v){ if(!v) return null; const [y,m,d]=v.split('-').map(Number); if(!y||!m||!d) return null; return new Date(Date.UTC(y,m-1,d)); }
  function addMonths(dt,n){ const y=dt.getUTCFullYear(), m=dt.getUTCMonth()+n, d=dt.getUTCDate(); const last=new Date(Date.UTC(y,m+1,0)).getUTCDate(); return new Date(Date.UTC(y,m,Math.min(d,last))); }
  function addDays(dt,n){ return new Date(dt.getTime()+n*DAY); }
  function fmt(dt){ return dt.toLocaleDateString('en-AU',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',year:'numeric'}); }
  function days(a,b){ return Math.round((b-a)/DAY); }
  function today(){ const n=new Date(); return new Date(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())); }
  function radio(name){ const r=document.querySelector('input[name="'+name+'"]:checked'); return r?r.value:null; }
  function setRadio(name,v){ const r=document.querySelector('input[name="'+name+'"][value="'+v+'"]'); if(r) r.checked=true; }
  function money(n){ return '$'+n.toLocaleString('en-AU',{maximumFractionDigits:0}); }
  function plural(n,w){ return n+' '+w+(n===1?'':'s'); }

  function fill(o){ ['agr','len','terms','writing','content'].forEach(k=>setRadio(k,o[k])); ['start','lastinc','notice','newstart','cur','nw'].forEach(k=>$(k).value=o[k]); }
  fill(EXAMPLE);
  $('clear').addEventListener('click',()=>{ ['start','lastinc','notice','newstart','cur','nw'].forEach(k=>$(k).value=''); $('sampleBar').hidden=true; run(); $('start').focus(); });
  $('f').addEventListener('input',()=>{ $('sampleBar').hidden=true; run(); });
  $('f').addEventListener('change',run);
  $('f').addEventListener('submit',e=>e.preventDefault());
  $('copy').addEventListener('click',()=>{
    const t=$('msg').textContent, b=$('copy');
    const done=()=>{ b.textContent='Copied'; setTimeout(()=>b.textContent='Copy message',1800); };
    const fallback=()=>{ const r=document.createRange(); r.selectNodeContents($('msg')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent='Selected. Press Ctrl+C or Cmd+C'; };
    try{ navigator.clipboard.writeText(t).then(done,fallback); }catch(e){ fallback(); }
  });

  function run(){
    const agr=radio('agr'), len=radio('len'), terms=radio('terms'), writing=radio('writing'), content=radio('content');
    const fixed = agr==='fixed', under2 = fixed && len==='under2';
    $('lenBox').hidden=!fixed;
    $('termsBox').hidden=!under2;

    const start=parse($('start').value), lastinc=parse($('lastinc').value), notice=parse($('notice').value), ns=parse($('newstart').value);
    const cur=parseFloat($('cur').value), nw=parseFloat($('nw').value);

    if(!start || !notice || !ns){
      setVerdict('none','Waiting','Fill in the dates to see your result','');
      ['checksCard','tlCard','msgCard'].forEach(id=>$(id).hidden=true);
      renderMoney(cur,nw,notice);
      emitDates([]);
      return;
    }

    const legacy = under2 && start.getTime() < LEGACY_CUTOFF;
    const checks=[], fails=[];
    const baseline = (lastinc && lastinc>start) ? lastinc : start;
    const twelve = addMonths(baseline,12);

    // Fixed term under 2 years: increase must be in the agreement
    if(under2){
      if(terms==='yes') checks.push({s:'pass',t:'Your lease allows an increase during the fixed term',d:'It sets out the increase amount or the exact way it’s calculated.'});
      else if(terms==='no'){ checks.push({s:'fail',t:'Your lease doesn’t set out an increase',d:'For a fixed term under 2 years, rent can only go up during the term if the agreement states the amount or exact method, such as a dollar amount or percentage. Terms like “market rate” don’t count.'}); fails.push('terms'); }
      else checks.push({s:'unknown',t:'Check your lease for a rent increase term',d:'Look for a term giving the increase amount or an exact method (a dollar amount or percentage). Vague terms like “in line with the market” don’t count.'});
    }

    // 12-month rule
    if(legacy && terms==='yes'){
      checks.push({s:'na',t:'12-month limit',d:'Your fixed term started before 13 Dec 2024 and is under 2 years, so increases written into it can apply until it ends. After that, the 12-month limit applies.'});
    } else if(ns>=twelve){
      checks.push({s:'pass',t:'At least 12 months since '+(baseline===start?'your tenancy started':'your last increase'),d:'The new rent starts '+plural(days(baseline,ns),'day')+' after '+fmt(baseline)+'. The minimum is 12 months ('+fmt(twelve)+').'});
    } else {
      checks.push({s:'fail',t:baseline===start?'Too soon after your tenancy started':'Too soon after your last increase',d:'Rent can’t go up in the first 12 months of a tenancy or more than once in 12 months. The earliest it can rise is '+fmt(twelve)+', which is '+plural(days(ns,twelve),'day')+' after the proposed start.'});
      fails.push('twelve');
    }

    // 60 days notice
    const noticeEnd=addDays(notice,60);
    if(notice>ns){ checks.push({s:'fail',t:'Notice arrived after the increase started',d:'You must get at least 60 days’ written notice before the new rent starts.'}); fails.push('notice'); }
    else if(ns>=noticeEnd) checks.push({s:'pass',t:'At least 60 days’ notice',d:'You got '+plural(days(notice,ns),'day')+' notice. The new rent can start from '+fmt(noticeEnd)+'.'});
    else { checks.push({s:'fail',t:'Not enough notice',d:'You got '+plural(days(notice,ns),'day')+' notice. The minimum is 60 days, so the earliest start is '+fmt(noticeEnd)+'.'}); fails.push('notice'); }

    // Writing and content
    if(writing==='yes') checks.push({s:'pass',t:'Notice given in writing',d:'A letter, email or the NSW Government notice form all count.'});
    else { checks.push({s:'fail',t:'Notice wasn’t in writing',d:'A rent increase needs written notice. A phone call or verbal notice isn’t valid.'}); fails.push('writing'); }
    if(content==='yes') checks.push({s:'pass',t:'Notice states the new rent and start date',d:'It should show the new rent amount (not just the increase) and the date it applies from.'});
    else { checks.push({s:'fail',t:'Notice is missing key details',d:'The notice must state the new rent amount and the day it starts. Without these, you don’t have to pay the increase.'}); fails.push('content'); }

    renderChecks(checks);

    const needsNewNotice = fails.includes('writing')||fails.includes('content')||(fails.includes('notice') && notice>ns);
    let earliest = (legacy && terms==='yes') ? noticeEnd : (twelve>noticeEnd?twelve:noticeEnd);
    if(needsNewNotice){ const n=addDays(today(),60); earliest = (legacy&&terms==='yes') ? n : (twelve>n?twelve:n); }

    const unknown = checks.some(c=>c.s==='unknown');
    if(fails.length){
      const lead = fails.includes('terms') ? 'Your rent can’t go up during your fixed term because your lease doesn’t set out the increase.' :
        'Based on your answers, the earliest this increase could legally start is <b>'+fmt(earliest)+'</b>'+(needsNewNotice?', and only with a new, valid written notice.':'.');
      setVerdict('bad','Doesn’t follow the rules','This increase doesn’t follow NSW rules', lead+(fails.includes('terms')?' You don’t have to pay the higher rent until your fixed term ends and you get a valid notice.':' You don’t have to pay the higher rent before then.'));
    } else if(unknown){
      setVerdict('warn','Check one thing','The timing is fine, but check your lease first','The 12-month and notice rules are met. Because you’re in a fixed term under 2 years, the increase is only allowed if your lease sets out the amount or exact method.');
    } else {
      setVerdict('ok','Timing is OK','The timing of this increase follows the rules','NSW doesn’t cap how much rent can rise. If the amount seems too high, you can negotiate or apply to NCAT. See the deadline below.');
    }

    renderTimeline(baseline,start,twelve,notice,noticeEnd,ns,fails.length>0,legacy&&terms==='yes');
    renderMoney(cur,nw,notice);
    var ev=[];
    if(fails.length && !fails.includes('terms')) ev.push({date:earliest,title:'Earliest legal date for your new rent',desc:'Based on your answers, this is the earliest date your NSW rent increase can legally start. You don\u2019t have to pay the higher rent before then.'});
    else if(!fails.length) ev.push({date:ns,title:'New rent starts',desc:'Your new rent amount starts today, based on the notice you checked.'});
    if(notice) ev.push({date:addDays(notice,30),title:'Last day to apply to NCAT about the rent increase',desc:'If you think the increase is excessive, today is the last day to apply to NCAT (30 days after you received the notice).',remind:7});
    emitDates(ev,'https://rentrise.au/nsw/');
    renderMessage(fails,unknown,{baseline,start,twelve,notice,ns,earliest});
  }

  function setVerdict(cls,pill,h,p){ const v=$('verdict'); v.className='verdict '+cls; v.innerHTML='<span class="pill">'+pill+'</span><h2>'+h+'</h2>'+(p?'<p>'+p+'</p>':''); }
  function renderChecks(list){
    const ICON={pass:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',fail:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',unknown:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 6.2a2.1 2.1 0 1 1 3 1.9c-.7.4-1 .8-1 1.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="12.2" r="1.2" fill="currentColor"/></svg>',na:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 8h7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'};
    const LABEL={pass:'Passed',fail:'Failed',unknown:'Check needed',na:'Not applicable'};
    $('checks').innerHTML=list.map(c=>'<li><span class="mark '+c.s+'" role="img" aria-label="'+LABEL[c.s]+'">'+ICON[c.s]+'</span><div><b>'+c.t+'</b><span>'+c.d+'</span></div></li>').join('');
    $('checksCard').hidden=false;
  }
  function renderTimeline(baseline,start,twelve,notice,noticeEnd,ns,bad,skip12){
    const ev=[{d:start,t:'Tenancy started'},{d:notice,t:'Notice received'},{d:noticeEnd,t:'60 days’ notice ends',c:'key'},{d:ns,t:'Proposed new rent starts',c:bad?'badk':'okk'}];
    if(baseline!==start) ev.push({d:baseline,t:'Last rent increase'});
    if(!skip12) ev.push({d:twelve,t:'12-month mark',c:'key'});
    ev.sort((a,b)=>a.d-b.d);
    $('tl').innerHTML=ev.map((e,i)=>{ const g=i?'<span class="gap">'+(days(ev[i-1].d,e.d)===0?'same day':'+'+plural(days(ev[i-1].d,e.d),'day'))+'</span>':''; return '<li class="'+(e.c||'')+'"><span>'+e.t+g+'</span><span class="d">'+fmt(e.d)+'</span></li>'; }).join('');
    $('tlCard').hidden=false;
  }
  function renderMoney(cur,nw,notice){
    if(!(cur>0)||!(nw>0)){ $('moneyCard').hidden=true; return; }
    const diff=nw-cur, pct=diff/cur*100;
    $('stats').innerHTML='<div class="stat"><span class="n">'+(diff>=0?'+':'−')+money(Math.abs(diff))+'</span><span class="k">per week</span></div><div class="stat"><span class="n">'+(pct>=0?'+':'')+pct.toFixed(1)+'%</span><span class="k">increase</span></div><div class="stat"><span class="n">'+money(Math.abs(diff*52))+'</span><span class="k">extra per year</span></div>';
    let note='NSW has no cap on the amount. If you think it’s excessive, you can apply to NCAT. ';
    if(notice) note+='Your NCAT deadline is <b>'+fmt(addDays(notice,30))+'</b> (30 days after you received the notice). ';
    note+='You’ll need to show it’s excessive. NCAT looks at rents for similar places nearby, the property’s condition and the landlord’s costs, not your income. Compare local rents with the NSW Government’s <a href="https://www.nsw.gov.au/rent-check" target="_blank" rel="noopener">Rent Check</a> tool.';
    $('moneyNote').innerHTML=note; $('moneyCard').hidden=false;
  }
  function renderMessage(fails,unknown,x){
    let title, body; const hi='Hi [agent or landlord name],\n\n', sign='\n\nKind regards,\n[Your name]\n[Property address]';
    if(fails.length){
      title='Message to your agent'; const pts=[];
      if(fails.includes('twelve')) pts.push((x.baseline===x.start?'My tenancy started on ':'My rent last increased on ')+fmt(x.baseline)+'. Under the Residential Tenancies Act 2010 (NSW), rent can’t be increased in the first 12 months of a tenancy or more than once in 12 months, so the earliest it can increase is '+fmt(x.twelve)+'.');
      if(fails.includes('notice')) pts.push('I received the notice on '+fmt(x.notice)+'. A rent increase needs at least 60 days’ written notice, so the proposed start date of '+fmt(x.ns)+' is too early.');
      if(fails.includes('writing')) pts.push('I haven’t received written notice of the increase. A rent increase must be given in writing.');
      if(fails.includes('content')) pts.push('The notice doesn’t state the new rent amount and the day it starts, which a rent increase notice must include.');
      if(fails.includes('terms')) pts.push('My fixed-term agreement is for less than 2 years and doesn’t set out a rent increase amount or method, so the rent can’t increase during the fixed term.');
      body=hi+'Thank you for the notice of a proposed rent increase from '+fmt(x.ns)+'. I’ve checked NSW Fair Trading’s rules and I don’t believe the increase can take effect on that date:\n\n'+pts.map(p=>'• '+p).join('\n')+'\n\nI’ll continue paying my current rent until a valid increase takes effect'+(fails.includes('terms')?'':'. Based on the rules, the earliest date appears to be '+fmt(x.earliest))+'. Could you please confirm in writing?'+sign;
    } else if(unknown){
      title='Question for your agent';
      body=hi+'Thanks for the notice of a rent increase from '+fmt(x.ns)+'. My fixed-term agreement is for less than 2 years. Could you please point me to the term in the agreement that sets out the rent increase amount or the exact method for calculating it?'+sign;
    } else {
      title='Confirm the details with your agent';
      body=hi+'Thanks for the notice of a rent increase from '+fmt(x.ns)+'. Before I agree, could you please confirm in writing the date my rent was last increased, and how the new amount was worked out?'+sign;
    }
    $('msgTitle').textContent=title; $('msg').textContent=body; $('msgCard').hidden=false;
  }
  function emitDates(ev,url){ document.dispatchEvent(new CustomEvent('rr:dates',{detail:{events:ev,url:url}})); }
  run();
})();
