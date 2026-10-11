/* RentRise date helpers.
   All dates are plain calendar dates stored as UTC midnight, so results never
   shift by a day because of the visitor's timezone or daylight saving. */
(function(root){
  var DAY = 86400000;

  // "2026-10-11" (from <input type="date">) -> Date at UTC midnight, or null if invalid.
  function parse(v){
    if(!v || typeof v!=='string') return null;
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
    if(!m) return null;
    var y=+m[1], mo=+m[2], d=+m[3];
    var dt=new Date(Date.UTC(y,mo-1,d));
    // Reject impossible dates like 2026-02-31 rather than letting them roll over.
    if(dt.getUTCFullYear()!==y || dt.getUTCMonth()!==mo-1 || dt.getUTCDate()!==d) return null;
    return dt;
  }

  // Calendar months. If the target month is shorter, use its last day
  // (31 Dec + 2 months = 28 Feb, or 29 Feb in a leap year).
  function addMonths(dt,n){
    var y=dt.getUTCFullYear(), m=dt.getUTCMonth()+n, d=dt.getUTCDate();
    var last=new Date(Date.UTC(y,m+1,0)).getUTCDate();
    return new Date(Date.UTC(y,m,Math.min(d,last)));
  }

  function addDays(dt,n){ return new Date(dt.getTime()+n*DAY); }

  // Whole days from a to b (b - a).
  function days(a,b){ return Math.round((b-a)/DAY); }

  // Today's calendar date in the visitor's own timezone, as UTC midnight.
  function today(now){
    var n=now||new Date();
    return new Date(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate()));
  }

  // Format a stored date for display without timezone shifts.
  function format(dt){
    return dt.toLocaleDateString('en-AU',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',year:'numeric'});
  }

  // "1 day's notice", "51 days' notice"
  function noticeOf(n){ return n===1 ? '1 day’s notice' : n+' days’ notice'; }

  function iso(dt){ return dt.toISOString().slice(0,10); }

  var api={DAY:DAY,parse:parse,addMonths:addMonths,addDays:addDays,days:days,today:today,format:format,noticeOf:noticeOf,iso:iso};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.RRDates=api;
})(typeof window!=='undefined'?window:this);
