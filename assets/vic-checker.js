(function(){
  const $ = id => document.getElementById(id);
  const DAY = 86400000;
  const NINETY_FROM = Date.UTC(2025,10,25); // 25 Nov 2025: notice period rose from 60 to 90 days
  const EXAMPLE = {agr:'periodic', pre2019:'no', clause:'unsure', last:'2025-10-01', notice:'2026-08-01', newstart:'2026-10-01', form:'yes', content:'yes', cur:'560', nw:'610'};

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

  function fill(o){ ['agr','pre2019','clause','form','content'].forEach(k=>setRadio(k,o[k])); ['last','notice','newstart','cur','nw'].forEach(k=>$(k).value=o[k]); }
  fill(EXAMPLE);
  $('clear').addEventListener('click',()=>{ ['last','notice','newstart','cur','nw'].forEach(k=>$(k).value=''); $('sampleBar').hidden=true; run(); $('last').focus(); });
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
    const agr=radio('agr'), pre2019=radio('pre2019'), clause=radio('clause'), form=radio('form'), content=radio('content');
    const fixed = agr==='fixed';
    $('preBox').hidden = fixed;
    $('clauseBox').hidden = !fixed;

    const last=parse($('last').value), notice=parse($('notice').value), ns=parse($('newstart').value);
    const cur=parseFloat($('cur').value), nw=parseFloat($('nw').value);

    if(!last || !notice || !ns){
      setVerdict('none','Waiting','Fill in the dates to see your result','');
      ['checksCard','tlCard','msgCard'].forEach(id=>$(id).hidden=true);
      renderMoney(cur,nw,notice);
      emitDates([]);
      return;
    }

    const checks=[], fails=[];
    const gapMonths = (!fixed && pre2019==='yes') ? 6 : 12;
    const minDate = addMonths(last,gapMonths);
    const noticeDays = notice.getTime() >= NINETY_FROM ? 90 : 60;

    if(fixed){
      if(clause==='yes') checks.push({s:'pass',t:'Your lease has a rent increase clause',d:'It states the amount of the increase, or the method used to work it out.'});
      else if(clause==='no'){ checks.push({s:'fail',t:'Your lease has no rent increase clause',d:'During a fixed term, rent can’t go up at all unless the lease includes a clause stating the amount or method of the increase.'}); fails.push('clause'); }
      else checks.push({s:'unknown',t:'Check your lease for a rent increase clause',d:'Look for a clause stating the increase amount or how it will be calculated, such as CPI or a fixed percentage. Without one, rent can’t go up until the fixed term ends.'});
    }

    if(ns>=minDate) checks.push({s:'pass',t:'At least '+gapMonths+' months since the last increase',d:'The new rent starts '+plural(days(last,ns),'day')+' after your current rent began ('+fmt(last)+'). The earliest allowed is '+fmt(minDate)+'.'});
    else { checks.push({s:'fail',t:'Too soon after the last increase',d:'Rent can only go up once every '+gapMonths+' months. The earliest it can rise is '+fmt(minDate)+', which is '+plural(days(ns,minDate),'day')+' after the proposed start.'}); fails.push('gap'); }

    const noticeEnd=addDays(notice,noticeDays);
    const nLabel=noticeDays+' days’ notice';
    if(notice>ns){ checks.push({s:'fail',t:'Notice arrived after the increase started',d:'You must get at least '+nLabel+' before the new rent starts.'}); fails.push('notice'); }
    else if(ns>=noticeEnd) checks.push({s:'pass',t:'At least '+nLabel,d:'You got '+plural(days(notice,ns),'day')+' notice. The new rent can start from '+fmt(noticeEnd)+'.'+(noticeDays===60?' Notices given before 25 Nov 2025 needed 60 days.':'')});
    else { checks.push({s:'fail',t:'Not enough notice',d:'You got '+plural(days(notice,ns),'day')+' notice. The minimum is '+noticeDays+' days'+(noticeDays===90?' (since 25 Nov 2025)':'')+', so the earliest start is '+fmt(noticeEnd)+'.'}); fails.push('notice'); }

    if(form==='yes') checks.push({s:'pass',t:'Official notice form used',d:'Rental providers must use the Consumer Affairs Victoria form “Notice of proposed rent increase”.'});
    else if(form==='no'){ checks.push({s:'fail',t:'Official notice form not used',d:'A rent increase must be given on the Consumer Affairs Victoria form. A letter, text or email without the form isn’t a valid notice.'}); fails.push('form'); }
    else checks.push({s:'unknown',t:'Check the notice is on the official form',d:'It should be titled “Notice of proposed rent increase to renter of rented premises” and explain your right to ask for a rent assessment.'});

    if(content==='yes') checks.push({s:'pass',t:'Notice shows the new rent, start date and how it was calculated',d:'The method might be CPI, a rent index, or a market comparison.'});
    else { checks.push({s:'fail',t:'Notice is missing required details',d:'The notice must show the increase, the date it starts and the method used to calculate it.'}); fails.push('content'); }

    renderChecks(checks);

    const needsNew = fails.includes('form')||fails.includes('content')||(fails.includes('notice') && notice>ns);
    let earliest = minDate>noticeEnd ? minDate : noticeEnd;
    if(needsNew){ const n=addDays(today(),90); earliest = minDate>n ? minDate : n; }

    const unknown = checks.some(c=>c.s==='unknown');
    if(fails.length){
      const lead = fails.includes('clause') ? 'Your rent can’t go up during your fixed term because your lease has no rent increase clause.' :
        'Based on your answers, the earliest this increase could legally start is <b>'+fmt(earliest)+'</b>'+(needsNew?', and only with a new notice on the official form.':'.');
      setVerdict('bad','Doesn’t follow the rules','This increase doesn’t follow Victorian rules', lead+' You don’t have to pay an invalid increase, but Tenants Victoria recommends paying it while you challenge it, so you don’t fall into rent arrears.');
    } else if(unknown){
      setVerdict('warn','Check one thing','The timing is fine, but check the details','The time and notice rules are met. Check the items marked with a question mark before you agree to the increase.');
    } else {
      setVerdict('ok','Timing is OK','The timing of this increase follows the rules','Victoria doesn’t cap how much rent can rise. If the amount seems too high, you can ask Consumer Affairs Victoria for a free rent assessment. See the deadline below.');
    }

    renderTimeline(last,minDate,gapMonths,notice,noticeEnd,noticeDays,ns,fails.length>0);
    renderMoney(cur,nw,notice);
    var ev=[];
    if(fails.length && !fails.includes('clause')) ev.push({date:earliest,title:'Earliest legal date for your new rent',desc:'Based on your answers, this is the earliest date your Victorian rent increase can legally start.'});
    else if(!fails.length) ev.push({date:ns,title:'New rent starts',desc:'Your new rent amount starts today, based on the notice you checked.'});
    ev.push({date:addDays(notice,30),title:'Last day to ask Consumer Affairs Victoria for a rent assessment',desc:'If you think the increase is excessive, today is the last day to ask Consumer Affairs Victoria for a free rent assessment (30 days after you received the notice).',remind:7});
    emitDates(ev,'https://rentrise.au/vic/');
    renderMessage(fails,unknown,{last,minDate,gapMonths,notice,ns,earliest,noticeDays});
  }

  function setVerdict(cls,pill,h,p){ const v=$('verdict'); v.className='verdict '+cls; v.innerHTML='<span class="pill">'+pill+'</span><h2>'+h+'</h2>'+(p?'<p>'+p+'</p>':''); }
  function renderChecks(list){
    const ICON={pass:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',fail:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',unknown:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 6.2a2.1 2.1 0 1 1 3 1.9c-.7.4-1 .8-1 1.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="12.2" r="1.2" fill="currentColor"/></svg>',na:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 8h7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'};
    const LABEL={pass:'Passed',fail:'Failed',unknown:'Check needed',na:'Not applicable'};
    $('checks').innerHTML=list.map(c=>'<li><span class="mark '+c.s+'" role="img" aria-label="'+LABEL[c.s]+'">'+ICON[c.s]+'</span><div><b>'+c.t+'</b><span>'+c.d+'</span></div></li>').join('');
    $('checksCard').hidden=false;
  }
  function renderTimeline(last,minDate,gap,notice,noticeEnd,nDays,ns,bad){
    const ev=[{d:last,t:'Current rent started'},{d:minDate,t:gap+'-month mark',c:'key'},{d:notice,t:'Notice received'},{d:noticeEnd,t:nDays+' days’ notice ends',c:'key'},{d:ns,t:'Proposed new rent starts',c:bad?'badk':'okk'}];
    ev.sort((a,b)=>a.d-b.d);
    $('tl').innerHTML=ev.map((e,i)=>{ const g=i?'<span class="gap">'+(days(ev[i-1].d,e.d)===0?'same day':'+'+plural(days(ev[i-1].d,e.d),'day'))+'</span>':''; return '<li class="'+(e.c||'')+'"><span>'+e.t+g+'</span><span class="d">'+fmt(e.d)+'</span></li>'; }).join('');
    $('tlCard').hidden=false;
  }
  function renderMoney(cur,nw,notice){
    if(!(cur>0)||!(nw>0)){ $('moneyCard').hidden=true; return; }
    const diff=nw-cur, pct=diff/cur*100;
    $('stats').innerHTML='<div class="stat"><span class="n">'+(diff>=0?'+':'−')+money(Math.abs(diff))+'</span><span class="k">per week</span></div><div class="stat"><span class="n">'+(pct>=0?'+':'')+pct.toFixed(1)+'%</span><span class="k">increase</span></div><div class="stat"><span class="n">'+money(Math.abs(diff*52))+'</span><span class="k">extra per year</span></div>';
    let note='Victoria has no cap on the amount. If you think it’s excessive, ask Consumer Affairs Victoria for a free rent assessment';
    note+= notice ? ' by <b>'+fmt(addDays(notice,30))+'</b> (30 days after you received the notice). ' : ' within 30 days of receiving the notice. ';
    note+='If the assessment finds it’s excessive and your rental provider won’t lower it, you have 30 days from the report to apply to Rental Dispute Resolution Victoria. Since 31 March 2026, CPI is one of the factors considered, along with rents for similar places and the property’s condition.';
    $('moneyNote').innerHTML=note; $('moneyCard').hidden=false;
  }
  function renderMessage(fails,unknown,x){
    let title, body; const hi='Hi [agent or rental provider name],\n\n', sign='\n\nKind regards,\n[Your name]\n[Property address]';
    if(fails.length){
      title='Message to your agent'; const pts=[];
      if(fails.includes('gap')) pts.push('My current rent started on '+fmt(x.last)+'. Under the Residential Tenancies Act 1997 (Vic), rent can only be increased once every '+x.gapMonths+' months, so the earliest it can increase is '+fmt(x.minDate)+'.');
      if(fails.includes('notice')) pts.push('I received the notice on '+fmt(x.notice)+'. A rent increase needs at least '+x.noticeDays+' days’ notice, so the proposed start date of '+fmt(x.ns)+' is too early.');
      if(fails.includes('form')) pts.push('The increase wasn’t given on the Consumer Affairs Victoria “Notice of proposed rent increase” form, which is required.');
      if(fails.includes('content')) pts.push('The notice doesn’t show the increase, the date it starts and how it was calculated, which the notice must include.');
      if(fails.includes('clause')) pts.push('My agreement is for a fixed term and doesn’t include a rent increase clause, so the rent can’t increase until the fixed term ends.');
      body=hi+'Thank you for the notice of a proposed rent increase from '+fmt(x.ns)+'. I’ve checked Consumer Affairs Victoria’s rules and I don’t believe the increase can take effect on that date:\n\n'+pts.map(p=>'• '+p).join('\n')+'\n\n'+(fails.includes('clause')?'':'Based on the rules, the earliest date appears to be '+fmt(x.earliest)+'. ')+'Could you please confirm in writing, and send a corrected notice if needed?'+sign;
    } else if(unknown){
      title='Question for your agent';
      body=hi+'Thanks for the notice of a rent increase from '+fmt(x.ns)+'. Could you please confirm the increase is being given on the Consumer Affairs Victoria “Notice of proposed rent increase” form'+(document.querySelector('input[name="agr"]:checked').value==='fixed'?', and point me to the rent increase clause in my fixed-term agreement':'')+'?'+sign;
    } else {
      title='Ask how the increase was worked out';
      body=hi+'Thanks for the notice of a rent increase from '+fmt(x.ns)+'. Before I agree, could you please explain how the new amount was calculated, including any comparable rents you relied on?'+sign;
    }
    $('msgTitle').textContent=title; $('msg').textContent=body; $('msgCard').hidden=false;
  }
  function emitDates(ev,url){ document.dispatchEvent(new CustomEvent('rr:dates',{detail:{events:ev,url:url}})); }
  run();
})();
