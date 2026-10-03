(function(){
  var card=document.getElementById('calCard'), list=document.getElementById('calList'), btn=document.getElementById('calBtn'), status=document.getElementById('calStatus');
  if(!card) return;
  var current={events:[],url:'https://rentrise.au/'};
  function ymd(d){ return d.getUTCFullYear()+String(d.getUTCMonth()+1).padStart(2,'0')+String(d.getUTCDate()).padStart(2,'0'); }
  function fmt(d){ return d.toLocaleDateString('en-AU',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',year:'numeric'}); }
  function esc(t){ return String(t).replace(/\\/g,'\\\\').replace(/;/g,'\;').replace(/,/g,'\\,').replace(/\n/g,'\\n'); }
  function fold(line){ var out=[]; while(line.length>73){ out.push(line.slice(0,73)); line=' '+line.slice(73); } out.push(line); return out.join('\r\n'); }
  function stamp(){ var n=new Date(); return n.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''); }
  function build(){
    var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//RentRise.au//Rent increase dates//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    current.events.forEach(function(e,i){
      var end=new Date(e.date.getTime()+86400000);
      lines.push('BEGIN:VEVENT',
        'UID:'+ymd(e.date)+'-'+i+'-'+Math.random().toString(36).slice(2)+'@rentrise.au',
        'DTSTAMP:'+stamp(),
        'DTSTART;VALUE=DATE:'+ymd(e.date),
        'DTEND;VALUE=DATE:'+ymd(end),
        fold('SUMMARY:'+esc(e.title)),
        fold('DESCRIPTION:'+esc(e.desc+'\n\nChecked with RentRise: '+current.url+'\nGeneral information, not legal advice.')),
        fold('URL:'+current.url),
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM','ACTION:DISPLAY',fold('DESCRIPTION:'+esc(e.title)),'TRIGGER:-P'+(e.remind||3)+'D','END:VALARM',
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n')+'\r\n';
  }
  document.addEventListener('rr:dates',function(ev){
    current=ev.detail||current;
    if(!current.events || !current.events.length){ card.hidden=true; return; }
    list.innerHTML=current.events.map(function(e){ return '<li><span>'+e.title+'</span><span class="d">'+fmt(e.date)+'</span></li>'; }).join('');
    status.textContent='';
    card.hidden=false;
  });
  btn.addEventListener('click',function(){
    try{
      var blob=new Blob([build()],{type:'text/calendar;charset=utf-8'});
      var url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download='rentrise-rent-increase-dates.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); },4000);
      status.textContent='Downloaded. Open the file to add the dates to your calendar, with reminders before each one.';
    }catch(err){ status.textContent='Your browser blocked the download. Please add the dates to your calendar manually.'; }
  });
})();
