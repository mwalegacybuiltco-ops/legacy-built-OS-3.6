/* Tabs Hotfix (delegated router + hash sync) */
(function(){
  const $$=(s,sc)=>Array.from((sc||document).querySelectorAll(s));
  const nav=document.querySelector('.sidebar nav');
  if(nav){
    nav.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-tab]'); if(!btn) return;
      const id=btn.getAttribute('data-tab');
      $$('.sidebar nav button').forEach(b=>b.classList.toggle('active',b===btn));
      $$('.panel').forEach(p=>p.classList.remove('show'));
      const pane=document.getElementById(id); if(pane) pane.classList.add('show');
      if(location.hash!=='#'+id) history.replaceState(null,'','#'+id);
      document.getElementById('sidebar')?.classList.remove('open');
    });
  }
  function initTab(){
    const id=(location.hash||'#dashboard').slice(1);
    const btn=document.querySelector(`.sidebar nav button[data-tab="${id}"]`)||document.querySelector('.sidebar nav button[data-tab="dashboard"]');
    if(btn) btn.click();
  }
  window.addEventListener('hashchange',initTab,{passive:true});
  document.addEventListener('DOMContentLoaded',initTab,{once:true});
})();

// storage helpers
const store={get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),del:(k)=>localStorage.removeItem(k)};

// Export / Import
document.getElementById('exportAll').addEventListener('click',()=>{
  const dump={
    focus:val('focusInput')||'',
    qi:store.get('qi',[]), qt:store.get('qt',[]),
    system:store.get('system',{posts:0,starts:0,nudges:0,closes:0,calls:0,sales:0}),
    leads:store.get('leads',[]),
    calendar:store.get('calendar',[]),
    mindset:store.get('mindset',{affirm:[],journal:[]}),
    brand:store.get('brand',{brand:"#6b3fa0",accent:"#d4af37",tag:"",voice:"",snips:""}),
    content:store.get('content',''),
    planner:store.get('planner','')
  };
  const url=URL.createObjectURL(new Blob([JSON.stringify(dump,null,2)],{type:'application/json'}));
  const a=Object.assign(document.createElement('a'),{href:url,download:'legacybuilt_backup.json'});a.click();URL.revokeObjectURL(url);
});
document.getElementById('importFile').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return; const r=new FileReader();
  r.onload=()=>{ try{ const obj=JSON.parse(r.result); Object.entries(obj).forEach(([k,v])=>{ if(k==='focus') set('focusInput',v); else store.set(k,v); }); renderAll(); alert('Imported'); }catch(e){ alert('Invalid JSON'); }};
  r.readAsText(f);
});

// Dashboard
document.getElementById('saveFocus').addEventListener('click',()=>{ store.set('focus',val('focusInput')||''); });

// Quick Income Tasks
let qiUndoCache=[];
function renderQI(){
  const arr=store.get('qi',[]);
  let planned=0, done=0, cnt=0, cd=0;
  const list=document.getElementById('qiList');
  list.innerHTML=arr.map((t,i)=>{
    planned += Number(t.est||0); cnt++; cd += t.done?1:0; done += t.done?Number(t.est||0):0;
    return `<li><span><input type="checkbox" data-i="${i}" class="qi-check" ${t.done?'checked':''}> ${t.text} ${t.est?`<em>($${t.est})</em>`:''}</span><button data-i="${i}" class="del qi-del">Delete</button></li>`;
  }).join('');
  document.getElementById('qiMeta').textContent=`Total planned: $${planned.toFixed(2)} · Completed: $${done.toFixed(2)} (${cd}/${cnt})`;
  document.querySelectorAll('.qi-check').forEach(cb=>cb.addEventListener('change',()=>{ const arr=store.get('qi',[]); arr[cb.dataset.i].done=cb.checked; store.set('qi',arr); renderQI(); }));
  document.querySelectorAll('.qi-del').forEach(b=>b.addEventListener('click',()=>{ const arr=store.get('qi',[]); qiUndoCache=arr.slice(); arr.splice(b.dataset.i,1); store.set('qi',arr); renderQI(); }));
}
document.getElementById('qiAdd').addEventListener('click',()=>{
  const text=val('qiText').trim(); if(!text) return;
  const est=Number(val('qiEst')||0);
  const arr=store.get('qi',[]); arr.unshift({text,est,done:false}); store.set('qi',arr);
  set('qiText',''); set('qiEst',''); renderQI();
});
document.getElementById('qiClear').addEventListener('click',()=>{ qiUndoCache=store.get('qi',[]); store.set('qi',[]); renderQI(); });
document.getElementById('qiUndo').addEventListener('click',()=>{ if(qiUndoCache.length){ store.set('qi',qiUndoCache); qiUndoCache=[]; renderQI(); }});

// Quick Tasks
let qtUndoCache=[];
function renderQT(){
  const arr=store.get('qt',[]);
  const list=document.getElementById('qtList');
  list.innerHTML=arr.map((t,i)=>`<li><span><input type="checkbox" data-i="${i}" class="qt-check" ${t.done?'checked':''}> ${t.text}</span><button data-i="${i}" class="del qt-del">Delete</button></li>`).join('');
  document.querySelectorAll('.qt-check').forEach(cb=>cb.addEventListener('change',()=>{ const arr=store.get('qt',[]); arr[cb.dataset.i].done=cb.checked; store.set('qt',arr); renderQT(); }));
  document.querySelectorAll('.qt-del').forEach(b=>b.addEventListener('click',()=>{ const arr=store.get('qt',[]); qtUndoCache=arr.slice(); arr.splice(b.dataset.i,1); store.set('qt',arr); renderQT(); }));
}
document.getElementById('qtAdd').addEventListener('click',()=>{
  const text=val('qtText').trim(); if(!text) return;
  const arr=store.get('qt',[]); arr.unshift({text,done:false}); store.set('qt',arr);
  set('qtText',''); renderQT();
});
document.getElementById('qtClear').addEventListener('click',()=>{ qtUndoCache=store.get('qt',[]); store.set('qt',[]); renderQT(); });
document.getElementById('qtUndo').addEventListener('click',()=>{ if(qtUndoCache.length){ store.set('qt',qtUndoCache); qtUndoCache=[]; renderQT(); }});

// System
document.getElementById('saveSystem').addEventListener('click',()=>{
  const sys={posts:+val('sys_posts'),starts:+val('sys_starts'),nudges:+val('sys_nudges'),closes:+val('sys_closes'),calls:+val('sys_calls'),sales:+val('sys_sales')};
  store.set('system',sys); renderSystemTotals();
});
function renderSystemTotals(){
  const s=store.get('system',{posts:0,starts:0,nudges:0,closes:0,calls:0,sales:0});
  document.getElementById('sysTotals').innerHTML=`<li>Posts: ${s.posts}</li><li>DM Starts: ${s.starts}</li><li>DM Nudges: ${s.nudges}</li><li>DM Closes: ${s.closes}</li><li>Calls: ${s.calls}</li><li>Sales ($): ${s.sales}</li>`;
}

// Date helpers
function toISO(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; }
function addDaysISO(n){ const d=new Date(); d.setDate(d.getDate()+n); return toISO(d); }
function parseLooseDate(s){
  if(!s) return ''; s=s.trim();
  if(/\d{4}-\d{2}-\d{2}/.test(s)) return s;          // YYYY-MM-DD
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if(m){ const mm=m[1].padStart(2,'0'), dd=m[2].padStart(2,'0'), yy=m[3].length===2?('20'+m[3]):m[3]; return `${yy}-${mm}-${dd}`; }
  return '';
}

// Leads + Calendar
const leadTBody=document.querySelector('#leadTable tbody');
document.querySelectorAll('[data-adddays]').forEach(b=>b.addEventListener('click',()=>{
  document.getElementById('leadNext').value = addDaysISO(parseInt(b.dataset.adddays,10));
}));
document.getElementById('clearNext').addEventListener('click',()=>{ document.getElementById('leadNext').value=''; });

document.getElementById('addLead').addEventListener('click',()=>{
  const name=val('leadName').trim(); if(!name) return;
  const stage=val('leadStage'); let next=val('leadNext');
  if(!next) next = parseLooseDate(next);
  const note=val('leadNote').trim();
  const arr=store.get('leads',[]); const lead={id:Date.now(),name,stage,next, note}; arr.unshift(lead); store.set('leads',arr);
  if(next){ const cal=store.get('calendar',[]); cal.unshift({id:'lead-'+lead.id, when:next, title:`Follow-up: ${name}`, source:'Lead'}); store.set('calendar',cal); }
  set('leadName',''); set('leadNext',''); set('leadNote',''); renderLeads(); renderCal();
});
function renderLeads(){
  const arr=store.get('leads',[]);
  leadTBody.innerHTML=arr.map(r=>`<tr><td>${r.name}</td><td>${r.stage}</td><td>${r.next||''}</td><td>${r.note||''}</td>
  <td><button class="mini send" data-id="${r.id}">Send</button> <button class="mini danger" data-id="${r.id}" data-del="lead">Del</button></td></tr>`).join('');
  document.querySelectorAll('button.mini.send').forEach(b=>b.addEventListener('click',()=>{
    const arr=store.get('leads',[]); const r=arr.find(x=>String(x.id)===String(b.dataset.id)); if(!r||!r.next) return alert('Add next date first');
    const cal=store.get('calendar',[]); cal.unshift({id:'lead-'+r.id, when:r.next, title:`Follow-up: ${r.name}`, source:'Lead'}); store.set('calendar',cal); renderCal();
  }));
  document.querySelectorAll('button[data-del="lead"]').forEach(b=>b.addEventListener('click',()=>{
    const arr=store.get('leads',[]); const i=arr.findIndex(x=>String(x.id)===String(b.dataset.id)); if(i>=0){ arr.splice(i,1); store.set('leads',arr); renderLeads(); }
  }));
}

// Calendar
const calTBody=document.querySelector('#calTable tbody');
document.getElementById('addCal').addEventListener('click',()=>{
  const title=val('calTitle').trim(); const dateTxt=val('calDate'); const time=val('calTime');
  const date = parseLooseDate(dateTxt) || dateTxt;
  if(!title||!date) return alert('Title + date required');
  const when=time?`${date} ${time}`:date;
  const cal=store.get('calendar',[]); cal.unshift({id:Date.now(),when,title,source:'Manual'}); store.set('calendar',cal); renderCal();
  set('calTitle',''); set('calDate',''); set('calTime','');
});
function renderCal(){
  const arr=store.get('calendar',[]);
  calTBody.innerHTML=arr.map(ev=>`<tr><td>${ev.when}</td><td>${ev.title}</td><td>${ev.source||''}</td>
  <td><button class="mini danger" data-id="${ev.id}" data-del="cal">Del</button></td></tr>`).join('');
  document.querySelectorAll('button[data-del="cal"]').forEach(b=>b.addEventListener('click',()=>{
    const arr=store.get('calendar',[]); const i=arr.findIndex(x=>String(x.id)===String(b.dataset.id)); if(i>=0){ arr.splice(i,1); store.set('calendar',arr); renderCal(); }
  }));
}

// Mindset
const defaultAffirm=[
  "People love buying from me because I make them feel safe, seen, and capable.",
  "I close with integrity, certainty, and calm authority.",
  "Every conversation I start turns into a win.",
  "My content creates curiosity. My DMs create clarity. My energy creates conversions.",
  "Today, 3–7 new people say yes."
];
function renderAffirm(){ const m=store.get('mindset',{affirm:[],journal:[]}); const arr=m.affirm.length?m.affirm:defaultAffirm; document.getElementById('affirmList').innerHTML=arr.map(t=>`<li>${t}</li>`).join(''); }
document.getElementById('addAffirm').addEventListener('click',()=>{
  const v=val('newAffirm').trim(); if(!v) return; const m=store.get('mindset',{affirm:[],journal:[]}); m.affirm.unshift(v); store.set('mindset',m); set('newAffirm',''); renderAffirm();
});
document.getElementById('resetAffirmations').addEventListener('click',()=>{ const m=store.get('mindset',{affirm:[],journal:[]}); m.affirm=[]; store.set('mindset',m); renderAffirm(); });
document.getElementById('saveJournal').addEventListener('click',()=>{
  const t=val('journalText').trim(); if(!t) return; const m=store.get('mindset',{affirm:[],journal:[]}); m.journal.unshift({ts:new Date().toISOString(),text:t}); store.set('mindset',m); set('journalText',''); renderJournal();
});
function renderJournal(){ const m=store.get('mindset',{affirm:[],journal:[]}); document.getElementById('journalList').innerHTML=m.journal.map(j=>`<li><b>${new Date(j.ts).toLocaleString()}</b> — ${j.text}</li>`).join(''); }

// Content Generator
const outEl = document.getElementById('genOutput');
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function getInputs(){
  return {
    topic: (document.getElementById('genTopic').value||'your second‑act Wi‑Fi income').trim(),
    audience: (document.getElementById('genAudience').value||'Gen‑X rebuilders').trim(),
    platform: document.getElementById('genPlatform').value,
    tone: document.getElementById('genTone').value,
    cta: document.getElementById('genCTA').value,
    length: document.getElementById('genLength').value
  };
}
const hooks = [
  "Stop scrolling. {aud}: this is your {topic} wake‑up call.",
  "If {aud} knew this, {topic} would already be paying you.",
  "{topic} in 90 days? Here’s the part no one tells {aud}.",
  "Skeptical? Good. Here’s the proof path for {aud} → {topic}.",
  "You don’t need perfect. You need a system. ({topic})"
];
function genHookSet(n=6){
  const {topic,audience:aud} = getInputs();
  return Array.from({length:n}, ()=> pick(hooks).replace('{topic}',topic).replace('{aud}',aud));
}
function genCaptionSet(n=4){
  const {topic,audience:aud,tone,cta} = getInputs();
  const frames=[
    "REAL TALK ({tone}): You don’t start because you have it all figured out — you start because {topic} gives you options. {cta}.",
    "For {aud}: I built from $130 and a phone. Structure → wins → commissions. {topic} is the vehicle. {cta}.",
    "3 steps to start {topic} this weekend: 1) Watch the short video 2) Plug in your link 3) Run the 7‑min daily play. {cta}.",
    "{tone} & simple: If you can send a DM, you can start {topic}. I’ll hand you the roadmap. {cta}."
  ];
  return frames.slice(0,n).map(t=>t.replace('{topic}',topic).replace('{aud}',aud).replace('{tone}',tone).replace('{cta}',cta));
}
function genPostSet(n=3){
  const {topic,audience:aud,tone,cta,length} = getInputs();
  const skeleton=[
    `HOOK: {aud}, read this before you give up on {topic}.
PROOF: I started with $130 and a fifth‑wheel. Structure beats motivation.
VALUE: The 3 things I wish I knew sooner about {topic}.
CTA: {cta}.`,
    `HOOK: You’re not late — {aud}, you’re early.
SHIFT: {topic} isn’t a trend; it’s leverage.
STEPS: Watch → Plug in → Run the 7‑min daily. 
CTA: {cta}.`,
    `HOOK: If you’re tired of starting over, stop stopping.
TRUTH: Most {aud} don’t need more info; they need a system for {topic}.
OFFER: I’ll show you mine.
CTA: {cta}.`
  ];
  return skeleton.slice(0,n).map(x=>x.replace('{topic}',topic).replace('{aud}',aud).replace('{cta}',cta));
}
function renderList(title, arr){
  outEl.innerHTML = `<div class="card"><h3>${title}</h3><ol>${arr.map(i=>`<li>${i}</li>`).join('')}</ol></div>` + outEl.innerHTML;
}
document.getElementById('genHooks').addEventListener('click',()=> renderList('Hooks', genHookSet()));
document.getElementById('genCaptions').addEventListener('click',()=> renderList('Captions', genCaptionSet()));
document.getElementById('genPosts').addEventListener('click',()=> renderList('Posts', genPostSet()));
document.getElementById('addAllToVault').addEventListener('click',()=>{
  const vault=document.getElementById('contentVault');
  vault.value = (vault.value+'\n\n'+outEl.innerText).trim();
});
document.getElementById('clearOutput').addEventListener('click',()=> outEl.innerHTML='');

// Brand/Content/Planner
document.getElementById('saveContent').addEventListener('click',()=>{ store.set('content',val('contentVault')||''); });
document.getElementById('saveBrand').addEventListener('click',()=>{
  const data={brand:val('brandColor')||'#6b3fa0',accent:val('accentColor')||'#d4af37',tag:val('brandTag')||'',voice:val('brandVoice')||'',snips:val('brandSnips')||''};
  store.set('brand',data);
});
document.getElementById('saveSnips').addEventListener('click',()=>{ const b=store.get('brand',{brand:"#6b3fa0",accent:"#d4af37"}); b.snips=val('brandSnips')||''; store.set('brand',b); });
document.getElementById('savePlanner').addEventListener('click',()=>{ store.set('planner',val('plannerText')||''); });

// Theme toggle
function applyTheme(mode){
  const root=document.documentElement;
  root.removeAttribute('data-theme');
  if(mode==='light'||mode==='dark'||mode==='dark-comfort') root.setAttribute('data-theme',mode);
}
document.getElementById('applyTheme').addEventListener('click',()=>applyTheme(val('themeSel')));

// Helpers + initial render
function val(id){ return document.getElementById(id).value; }
function set(id,v){ document.getElementById(id).value=v; }

function renderAll(){
  set('focusInput', store.get('focus',''));
  renderQI(); renderQT(); renderSystemTotals(); renderLeads(); renderCal(); renderAffirm(); renderJournal();
  set('contentVault', store.get('content','')); set('plannerText', store.get('planner',''));
}
renderAll();
