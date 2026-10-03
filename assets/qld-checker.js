
(function(){
  const $ = id => document.getElementById(id);
  const DAY = 86400000;
  const EXAMPLE = {kind:'general', agr:'periodic', terms:'unsure', last:'2025-11-15', notice:'2026-09-20', start:'2026-11-10', writing:'yes', cur:'550', nw:'600'};

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

  function fill(o){ setRadio('kind',o.kind); setRadio('agr',o.agr); setRadio('terms',o.terms); setRadio('writing',o.writing); ['last','notice','start','cur','nw'].forEach(k=>$(k).value=o[k]); }
  fill(EXAMPLE);
  $('clear').addEventListener('click',()=>{ ['last','notice','start','cur','nw'].forEach(k=>$(k).value=''); $('sampleBar').hidden=true; run(); $('last').focus(); });
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
    const kind=radio('kind'), agr=radio('agr'), terms=radio('terms'), writing=radio('writing');
    const isNew = agr==='new';
    $('termsBox').hidden = agr!=='fixed';
    $('noticeBox').hidden = isNew;
    $('writingBox').hidden = isNew;
    $('startLbl').textContent = isNew ? 'When does the new lease (and new rent) start?' : 'When does the new rent start?';

    const last=parse($('last').value), notice=isNew?null:parse($('notice').value), start=parse($('start').value);
    const cur=parseFloat($('cur').value), nw=parseFloat($('nw').value);
    const periodLabel = kind==='rooming' ? '4 weeks' : '2 months';

    if(!last || !start || (!isNew && !notice)){
      setVerdict('none','Waiting','Fill in the dates to see your result','');
      ['checksCard','tlCard','msgCard'].forEach(id=>$(id).hidden=true);
      renderMoney(cur,nw,null,agr,notice,start);
      return;
    }

    const checks=[]; const fails=[];
    // 12-month rule
    const twelve=addMonths(last,12);
    if(start>=twelve){ checks.push({s:'pass',t:'At least 12 months since the last increase',d:'The new rent starts '+plural(days(last,start),'day')+' after the current rent began. The minimum is 12 months ('+fmt(twelve)+').'}); }
    else { const short=days(start,twelve); checks.push({s:'fail',t:'Too soon after the last increase',d:'Rent can only go up once every 12 months. The earliest it can rise is '+fmt(twelve)+', which is '+plural(short,'day')+' after the proposed start.'}); fails.push('twelve'); }

    // Notice period
    let noticeEnd=null;
    if(isNew){
      checks.push({s:'na',t:'Notice period',d:'For a new lease you sign, no separate notice is needed. The 12-month rule still applies.'});
    } else {
      noticeEnd = kind==='rooming' ? addDays(notice,28) : addMonths(notice,2);
      if(notice>start){ checks.push({s:'fail',t:'Notice arrived after the increase started',d:'You must get at least '+periodLabel+' written notice before the new rent starts.'}); fails.push('notice'); }
      else if(start>=noticeEnd){ checks.push({s:'pass',t:'At least '+periodLabel+' notice',d:'You got '+plural(days(notice,start),'day')+' notice. The new rent can start from '+fmt(noticeEnd)+'.'}); }
      else { checks.push({s:'fail',t:'Not enough notice',d:'You got '+plural(days(notice,start),'day')+' notice. The minimum is '+periodLabel+', so the earliest start is '+fmt(noticeEnd)+'.'}); fails.push('notice'); }
      // Writing
      if(writing==='yes') checks.push({s:'pass',t:'Notice given in writing',d:'It should state the new amount, the start date and when the rent last went up.'});
      else { checks.push({s:'fail',t:'Notice wasn’t in writing',d:'A rent increase needs written notice. A verbal notice isn’t valid.'}); fails.push('writing'); }
    }

    // Fixed-term terms
    if(agr==='fixed'){
      if(terms==='yes') checks.push({s:'pass',t:'Your lease allows an increase during the term',d:'It states the rent will go up and the new amount or how it’s worked out.'});
      else if(terms==='no'){ checks.push({s:'fail',t:'Your lease doesn’t allow an increase during the term',d:'Rent can’t go up before your fixed term ends unless the lease says so and states the amount or how it’s calculated.'}); fails.push('terms'); }
      else checks.push({s:'unknown',t:'Check your lease for a rent increase term',d:'Look for a special term saying the rent will increase and by how much. Without it, rent can’t go up until the lease ends.'});
    }

    renderChecks(checks);

    // Earliest legal start
    let earliest=twelve;
    if(!isNew){
      const nEnd = writing==='no' ? (kind==='rooming'?addDays(today(),28):addMonths(today(),2)) : (notice>start ? null : noticeEnd);
      const base = nEnd || (kind==='rooming'?addDays(today(),28):addMonths(today(),2));
      if(base>earliest) earliest=base;
    }

    const unknown = checks.some(c=>c.s==='unknown');
    if(fails.length){
      const lead = fails.includes('terms') ? 'Your rent can’t go up until your fixed term ends, unless your lease allows it.' :
        'Based on your answers, the earliest this increase could legally start is <b>'+fmt(earliest)+'</b>'+((fails.includes('writing')||fails.includes('notice')&&notice>start)?', and only with a new written notice.':'.');
      setVerdict('bad','Doesn’t follow the rules','This increase doesn’t follow Queensland’s rules', lead+' You don’t have to pay the higher rent before then.');
    } else if(unknown){
      setVerdict('warn','Check one thing','The timing is fine, but check your lease first','The 12-month and notice rules are met. The increase is only allowed if your lease has a term allowing it. See below.');
    } else {
      setVerdict('ok','Timing is OK','The timing of this increase follows the rules','Queensland doesn’t cap how much rent can rise. If the amount seems too high, you can still negotiate or dispute it. See the deadline below.');
    }

    renderTimeline(last,twelve,notice,noticeEnd,start,fails.length>0,isNew,periodLabel);
    renderMoney(cur,nw,fails.length>0,agr,notice,start);
    renderMessage(fails,unknown,{last,twelve,notice,start,earliest,periodLabel,isNew,agr});
  }

  function setVerdict(cls,pill,h,p){ const v=$('verdict'); v.className='verdict '+cls; v.innerHTML='<span class="pill">'+pill+'</span><h2>'+h+'</h2>'+(p?'<p>'+p+'</p>':''); }

  function renderChecks(list){
    const ICON={pass:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',fail:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',unknown:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 6.2a2.1 2.1 0 1 1 3 1.9c-.7.4-1 .8-1 1.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="12.2" r="1.2" fill="currentColor"/></svg>',na:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 8h7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'};
    const LABEL={pass:'Passed',fail:'Failed',unknown:'Check needed',na:'Not applicable'};
    $('checks').innerHTML=list.map(c=>'<li><span class="mark '+c.s+'" role="img" aria-label="'+LABEL[c.s]+'">'+ICON[c.s]+'</span><div><b>'+c.t+'</b><span>'+c.d+'</span></div></li>').join('');
    $('checksCard').hidden=false;
  }

  function renderTimeline(last,twelve,notice,noticeEnd,start,bad,isNew,periodLabel){
    const ev=[{d:last,t:'Current rent started'},{d:twelve,t:'12-month mark',c:'key'},{d:start,t:isNew?'New lease and rent start':'Proposed new rent starts',c:bad?'badk':'okk'}];
    if(!isNew){ ev.push({d:notice,t:'Notice received'}); if(noticeEnd && notice<=start) ev.push({d:noticeEnd,t:periodLabel+' notice ends',c:'key'}); }
    ev.sort((a,b)=>a.d-b.d);
    $('tl').innerHTML=ev.map((e,i)=>{ const g=i? '<span class="gap">'+(days(ev[i-1].d,e.d)===0?'same day':'+'+plural(days(ev[i-1].d,e.d),'day'))+'</span>':''; return '<li class="'+(e.c||'')+'"><span>'+e.t+g+'</span><span class="d">'+fmt(e.d)+'</span></li>'; }).join('');
    $('tlCard').hidden=false;
  }

  function renderMoney(cur,nw,bad,agr,notice,start){
    if(!(cur>0) || !(nw>0)){ $('moneyCard').hidden=true; return; }
    const diff=nw-cur, pct=diff/cur*100;
    $('stats').innerHTML=
      '<div class="stat"><span class="n">'+(diff>=0?'+':'−')+money(Math.abs(diff))+'</span><span class="k">per week</span></div>'+
      '<div class="stat"><span class="n">'+(pct>=0?'+':'')+pct.toFixed(1)+'%</span><span class="k">increase</span></div>'+
      '<div class="stat"><span class="n">'+money(Math.abs(diff*52))+'</span><span class="k">extra per year</span></div>';
    let note='Queensland has no cap on the amount. If you think it’s excessive, talk to your agent first, then you can ask the RTA for free dispute resolution or apply to QCAT. ';
    if(agr==='new') note+='For a new lease, you can apply to QCAT only after signing it, within 30 days of signing.';
    else if(notice) note+='Your QCAT deadline is <b>'+fmt(addDays(notice,30))+'</b> (30 days after you received the notice'+(agr==='fixed'?', and before your lease ends':'')+').';
    note+=' QCAT looks at rents for similar places nearby, the size of the jump, and the property’s condition.';
    $('moneyNote').innerHTML=note;
    $('moneyCard').hidden=false;
  }

  function renderMessage(fails,unknown,x){
    let title, body;
    const hi='Hi [agent or owner name],\n\n';
    const sign='\n\nKind regards,\n[Your name]\n[Property address]';
    if(fails.length){
      title='Message to your agent';
      const pts=[];
      if(fails.includes('twelve')) pts.push('The current rent started on '+fmt(x.last)+'. Under the Residential Tenancies and Rooming Accommodation Act 2008, rent can’t be increased until at least 12 months after the current amount became payable, which is '+fmt(x.twelve)+'.');
      if(fails.includes('notice')) pts.push('I received the notice on '+fmt(x.notice)+'. A rent increase needs at least '+x.periodLabel+' written notice, so the proposed start date of '+fmt(x.start)+' is too early.');
      if(fails.includes('writing')) pts.push('I haven’t received written notice of the increase. A rent increase must be given in writing.');
      if(fails.includes('terms')) pts.push('My lease is a fixed term and doesn’t include a term allowing the rent to increase during it, so the rent can’t change until the fixed term ends.');
      body=hi+'Thank you for letting me know about the proposed rent increase to start on '+fmt(x.start)+'. I’ve checked the Residential Tenancies Authority’s rules and I don’t think the increase can take effect on that date:\n\n'+pts.map(p=>'• '+p).join('\n')+'\n\nI’ll keep paying my current rent until a valid increase takes effect'+(fails.includes('terms')?'':'. Based on the rules, the earliest date appears to be '+fmt(x.earliest))+'. Could you please confirm in writing? Could you also send me evidence of the date the rent was last increased for the property? I understand you need to provide this within 14 days of my request.'+sign;
    } else if(unknown){
      title='Question for your agent';
      body=hi+'Thanks for the notice of the rent increase starting '+fmt(x.start)+'. My lease is for a fixed term. Could you please point me to the term in my agreement that allows the rent to be increased during the fixed term, including the new amount or how it’s calculated?'+sign;
    } else {
      title='Ask for proof of the last increase';
      body=hi+'Thanks for the notice of the rent increase starting '+fmt(x.start)+'. Before I agree, could you please send me written evidence of the date the rent was last increased for this property? I understand you need to provide this within 14 days of my request.'+sign;
    }
    $('msgTitle').textContent=title; $('msg').textContent=body; $('msgCard').hidden=false;
  }

  run();
})();
