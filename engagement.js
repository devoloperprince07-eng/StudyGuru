/* StudyGuru engagement, admin overview and live-test controls */
(()=>{
 'use strict';
 const el=id=>document.getElementById(id);
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const isAdmin=()=>profile?.role==='admin';
 const event=async(type,content_type=null,content_id=null)=>{
   if(!profile?.id)return;
   const {error}=await db.from('study_activity_events').insert({user_id:profile.id,event_type:type,content_type,content_id});
   if(error)console.warn('Activity tracking:',error.message);
 };
 const recordView=async(type,id)=>{
   if(!profile?.id)return;
   const {error}=await db.from('study_content_views').upsert({content_type:type,content_id:id,user_id:profile.id},{onConflict:'content_type,content_id,user_id,viewed_on',ignoreDuplicates:true});
   if(error)console.warn('View tracking:',error.message);
   await event('view',type,id);
 };
 function addOverview(){
   const tabs=document.querySelector('#appView .tabs');
   if(tabs&&!el('overviewTab')){
     const b=document.createElement('button');b.id='overviewTab';b.textContent='Overview';b.className='hidden';
     b.onclick=()=>showOverview();tabs.appendChild(b);
   }
   const app=el('appView');
   if(app&&!el('overviewPanel')){
     const sec=document.createElement('section');sec.id='overviewPanel';sec.className='hidden';
     sec.innerHTML='<div class="topline"><h2 class="section-title">Admin Overview</h2><button class="plain" id="overviewRefresh">Refresh</button></div><div id="overviewStatus" class="small">Loading…</div><div id="overviewStats" class="grid"></div><div class="panel"><h3>Member activity — Same / Others</h3><p class="small">Same = members who returned on more than one day; Others = members seen on only one day.</p><div id="overviewMembers" class="grid"></div></div><div class="panel"><h3>Recent activity</h3><div id="overviewRecent" class="grid"></div></div>';
     app.appendChild(sec);el('overviewRefresh').onclick=loadOverview;
   }
 }
 function showOverview(){
   if(!isAdmin())return;
   document.querySelectorAll('#appView>section').forEach(s=>s.classList.add('hidden'));
   document.querySelectorAll('#appView .tabs button').forEach(b=>b.classList.remove('active'));
   el('overviewPanel')?.classList.remove('hidden');el('overviewTab')?.classList.add('active');
   loadOverview();
 }
 async function count(table){const r=await db.from(table).select('*',{count:'exact',head:true});if(r.error)throw r.error;return r.count||0}
 async function loadOverview(){
   if(!isAdmin())return;
   const box=el('overviewStatus');box.textContent='Overview आँकड़े लोड हो रहे हैं…';
   try{
     const [attempts,views,comments,likes,events,people]=await Promise.all([
       count('studyguru_test_results').catch(()=>count('test_attempts')),
       count('study_content_views'),count('study_content_comments'),count('study_content_likes'),
       db.from('study_activity_events').select('user_id,event_type,created_at').order('created_at',{ascending:false}).limit(1500),
       db.from('profiles').select('id,full_name,role,created_at').order('created_at',{ascending:false})
     ]);
     if(events.error)throw events.error;if(people.error)throw people.error;
     const rows=events.data||[],members=people.data||[];
     const dayMap=new Map();
     rows.filter(x=>x.event_type==='view'||x.event_type==='login').forEach(x=>{const d=new Date(x.created_at).toISOString().slice(0,10);if(!dayMap.has(x.user_id))dayMap.set(x.user_id,new Set());dayMap.get(x.user_id).add(d)});
     const returning=[...dayMap.values()].filter(s=>s.size>1).length,oneDay=[...dayMap.values()].filter(s=>s.size===1).length;
     const logins=new Set(rows.filter(x=>x.event_type==='login').map(x=>x.user_id)).size;
     const uniqueViewers=new Set(rows.filter(x=>x.event_type==='view').map(x=>x.user_id)).size;
     const stats=[['Total Members',members.length],['Test Attempts',attempts],['Unique Viewers',uniqueViewers],['Views',views],['Login Members',logins],['Comments',comments],['Likes',likes]];
     el('overviewStats').innerHTML=stats.map(([k,v])=>'<article class="item"><p>'+safe(k)+'</p><h2>'+Number(v).toLocaleString('en-IN')+'</h2></article>').join('');
     el('overviewMembers').innerHTML='<article class="item"><p>Same — Returning members</p><h2>'+returning+'</h2></article><article class="item"><p>Others — One-day members</p><h2>'+oneDay+'</h2></article>';
     const recent=rows.slice(0,20);const ids=[...new Set(recent.map(x=>x.user_id))];
     const nameMap=new Map(members.map(m=>[m.id,m.full_name||'Member']));
     el('overviewRecent').innerHTML=recent.length?recent.map(x=>'<article class="item"><b>'+safe(nameMap.get(x.user_id)||'Member')+'</b><p>'+safe(x.event_type.replace('_',' '))+(x.content_type?' · '+safe(x.content_type):'')+'</p><span class="small">'+new Date(x.created_at).toLocaleString('en-IN')+'</span></article>').join(''):'<p class="muted">अभी activity उपलब्ध नहीं है।</p>';
     box.textContent='Updated: '+new Date().toLocaleString('en-IN')+' · आँकड़े वास्तविक database records से हैं।';
   }catch(e){box.textContent='Overview load नहीं हुआ: '+(e.message||e);}
 }
 async function decorate(type,containerId,rows){
   const box=el(containerId);if(!box)return;
   const cards=[...box.querySelectorAll(':scope > .item')];
   for(let i=0;i<Math.min(cards.length,rows.length);i++){
     const card=cards[i],row=rows[i],id=row.id;if(!id)continue;
     if(card.querySelector('.sg-engagement'))continue;
     card.dataset.sgId=id;
     await recordView(type,id);
     const panel=document.createElement('div');panel.className='sg-engagement';panel.style.cssText='border-top:1px solid #eee;padding-top:10px;margin-top:12px';
     panel.innerHTML='<div class="actions"><button type="button" class="secondary sg-like">♡ Like</button><span class="small sg-like-count">…</span><button type="button" class="plain sg-comment-toggle">Comments</button><span class="small sg-comment-count"></span></div><div class="sg-comments hidden" style="margin-top:10px"><div class="sg-comment-list small">Loading comments…</div><textarea class="field sg-comment-input" rows="2" maxlength="1200" placeholder="अपना comment लिखें"></textarea><button type="button" class="secondary sg-comment-send">Post comment</button></div>';
     card.appendChild(panel);
     const likeBtn=panel.querySelector('.sg-like'),likeCount=panel.querySelector('.sg-like-count'),commentToggle=panel.querySelector('.sg-comment-toggle'),commentsBox=panel.querySelector('.sg-comments'),commentList=panel.querySelector('.sg-comment-list'),commentCount=panel.querySelector('.sg-comment-count');
     async function refreshLikes(){
       const {data,error}=await db.from('study_content_likes').select('user_id').eq('content_type',type).eq('content_id',id);
       if(error){likeCount.textContent='';return}
       likeCount.textContent=(data||[]).length+' likes';likeBtn.textContent=(data||[]).some(x=>x.user_id===profile.id)?'♥ Liked':'♡ Like';
     }
     async function refreshComments(){
       const {data,error}=await db.from('study_content_comments').select('id,user_id,body,created_at').eq('content_type',type).eq('content_id',id).order('created_at',{ascending:false}).limit(50);
       if(error){commentList.textContent=error.message;return}
       const rows2=data||[];commentCount.textContent=rows2.length?rows2.length+' comments':'';
       const userIds=[...new Set(rows2.map(x=>x.user_id))];
       let names={};if(userIds.length){const p=await db.from('profiles').select('id,full_name').in('id',userIds);(p.data||[]).forEach(x=>names[x.id]=x.full_name||'Member')}
       commentList.innerHTML=rows2.length?rows2.map(c=>'<div style="padding:8px 0;border-bottom:1px solid #eee"><b>'+safe(names[c.user_id]||'Member')+'</b><p style="margin:4px 0;white-space:pre-wrap">'+safe(c.body)+'</p><span>'+new Date(c.created_at).toLocaleString('en-IN')+'</span>'+(c.user_id===profile.id||isAdmin()?'<button class="plain sg-delete-comment" data-id="'+c.id+'" style="margin-left:8px;padding:4px 8px">Delete</button>':'')+'</div>').join(''):'अभी कोई comment नहीं है।';
       commentList.querySelectorAll('.sg-delete-comment').forEach(b=>b.onclick=async()=>{const {error}=await db.from('study_content_comments').delete().eq('id',b.dataset.id);if(error)alert(error.message);else refreshComments()});
     }
     likeBtn.onclick=async()=>{
       const {data}=await db.from('study_content_likes').select('id').eq('content_type',type).eq('content_id',id).eq('user_id',profile.id).maybeSingle();
       const result=data?await db.from('study_content_likes').delete().eq('id',data.id):await db.from('study_content_likes').insert({content_type:type,content_id:id,user_id:profile.id});
       if(result.error)alert(result.error.message);else{await event(data?'view':'like',type,id);refreshLikes()}
     };
     commentToggle.onclick=()=>{commentsBox.classList.toggle('hidden');if(!commentsBox.classList.contains('hidden'))refreshComments()};
     panel.querySelector('.sg-comment-send').onclick=async()=>{
       const input=panel.querySelector('.sg-comment-input'),body=input.value.trim();if(!body)return;
       const {error}=await db.from('study_content_comments').insert({content_type:type,content_id:id,user_id:profile.id,body});
       if(error)alert(error.message);else{input.value='';await event('comment',type,id);refreshComments()}
     };
     await refreshLikes();
   }
 }
 async function addLiveTests(){
   const live=el('livePanel');if(!live||el('liveTestPanel'))return;
   const panel=document.createElement('div');panel.id='liveTestPanel';panel.className='panel';
   panel.innerHTML='<h3>Live Tests</h3><div id="liveTestCreate" class="hidden"><label>Practice Test</label><select id="liveTestSelect" class="field"></select><div class="row"><div><label>Starts at</label><input id="liveTestStart" type="datetime-local" class="field"></div><div><label>Ends at</label><input id="liveTestEnd" type="datetime-local" class="field"></div></div><button id="publishLiveTest">Schedule Live Test</button><div id="liveTestStatus" class="status"></div></div><div id="liveTestList" class="grid"></div>';
   live.appendChild(panel);
   if(canTeach())el('liveTestCreate').classList.remove('hidden');
   el('publishLiveTest').onclick=async()=>{
     const testId=el('liveTestSelect').value,start=el('liveTestStart').value,end=el('liveTestEnd').value;
     if(!testId||!start||!end||new Date(end)<=new Date(start))return el('liveTestStatus').textContent='Test और सही start/end time चुनें।';
     const {error}=await db.from('live_test_sessions').insert({test_id:testId,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),created_by:profile.id,is_published:true});
     el('liveTestStatus').textContent=error?error.message:'Live Test schedule हो गया।';if(!error)loadLiveTests();
   };
   loadLiveTests();
 }
 async function loadLiveTests(){
   const box=el('liveTestList');if(!box)return;
   const {data,error}=await db.from('live_test_sessions').select('id,test_id,starts_at,ends_at,practice_tests(title,class_name,subject)').eq('is_published',true).order('starts_at');
   if(error){box.textContent=error.message;return}
   const tests=data||[];
   if(canTeach()){
     const p=await db.from('practice_tests').select('id,title').order('created_at',{ascending:false});
     el('liveTestSelect').innerHTML='<option value="">Select test</option>'+(p.data||[]).map(t=>'<option value="'+t.id+'">'+safe(t.title)+'</option>').join('');
   }
   box.innerHTML=tests.length?tests.map(t=>{
     const now=Date.now(),start=new Date(t.starts_at).getTime(),end=new Date(t.ends_at).getTime(),active=now>=start&&now<=end;
     return '<article class="item"><h4>'+safe(t.practice_tests?.title||'Live Test')+'</h4><p>'+safe(t.practice_tests?.class_name||'')+' · '+safe(t.practice_tests?.subject||'')+'</p><p>Starts: '+new Date(t.starts_at).toLocaleString('en-IN')+'</p><p>Ends: '+new Date(t.ends_at).toLocaleString('en-IN')+'</p><div class="actions">'+(active?'<button class="sg-live-test-start" data-id="'+t.test_id+'">Join Live Test</button>':'<span class="small">'+(now<start?'Scheduled':'Ended')+'</span>')+(isAdmin()?'<button class="danger sg-live-test-delete" data-id="'+t.id+'">Delete</button>':'')+'</div></article>';
   }).join(''):'<div class="empty">अभी कोई Live Test schedule नहीं है।</div>';
   box.querySelectorAll('.sg-live-test-start').forEach(b=>b.onclick=()=>{event('test_attempt','live_test',b.dataset.id);startDbTest(b.dataset.id)});
   box.querySelectorAll('.sg-live-test-delete').forEach(b=>b.onclick=async()=>{if(!confirm('Live Test हटाएँ?'))return;const {error}=await db.from('live_test_sessions').delete().eq('id',b.dataset.id);if(error)alert(error.message);else loadLiveTests()});
 }
 function install(){
   if(!profile?.id||!db)return;
   addOverview();addLiveTests();patchStartTest();
   if(!window.__sgLoginRecorded){window.__sgLoginRecorded=true;event('login')}
   if(isAdmin())el('overviewTab')?.classList.remove('hidden');
 }
 const originalShow=window.showTab;
 if(typeof originalShow==='function'){
   window.showTab=function(tab){if(tab==='overview')return showOverview();originalShow(tab);if(tab==='live')setTimeout(()=>{addLiveTests();loadLiveTests();decorateLive()},0);if(tab==='courses')setTimeout(decorateCourses,0)};
 }
 async function decorateCourses(){
   const {data,error}=await db.from('courses').select('id').order('created_at',{ascending:false});if(!error)decorate('course','courseList',data||[]);
 }
 async function decorateLive(){
   const {data,error}=await db.from('live_classes').select('id').order('starts_at');if(!error)decorate('live_class','liveList',data||[]);
 }
 const oldCourses=window.loadCourses;if(typeof oldCourses==='function')window.loadCourses=async function(){await oldCourses();await decorateCourses()};
 const oldLive=window.loadLiveClasses;if(typeof oldLive==='function')window.loadLiveClasses=async function(){await oldLive();await decorateLive()};
 let sgStartWrapped=false;
 function patchStartTest(){
   if(sgStartWrapped||typeof window.startDbTest!=='function')return;
   const original=window.startDbTest;
   window.startDbTest=async function(testId){
     const {data,error}=await db.from('live_test_sessions').select('starts_at,ends_at').eq('test_id',testId).eq('is_published',true).order('starts_at',{ascending:false}).limit(1);
     if(error){alert('Live Test status जाँचा नहीं जा सका: '+error.message);return}
     if(data&&data.length){
       const session=data[0],now=Date.now(),start=new Date(session.starts_at).getTime(),end=new Date(session.ends_at).getTime();
       if(now<start||now>end){alert('यह Live Test केवल निर्धारित समय पर उपलब्ध होगा।');return}
     }
     await event('test_attempt',data&&data.length?'live_test':'practice_test',testId);
     return original(testId);
   };
   sgStartWrapped=true;
 }
 const oldEnter=window.enterApp;if(typeof oldEnter==='function')window.enterApp=async function(user){await oldEnter(user);install();};
 document.addEventListener('DOMContentLoaded',install);
 setInterval(install,1200);
})();
