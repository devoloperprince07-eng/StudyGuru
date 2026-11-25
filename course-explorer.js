/* StudyGuru Course Explorer: shared Student browsing and Admin content manager */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const root = () => $('courseExplorer');
  const admin = () => !!profile && profile.role === 'admin';
  const safe = value => typeof esc === 'function' ? esc(value) : String(value ?? '');
  let state = { view:'list', course:null, subject:null, chapter:null };

  function styles(){
    if($('cxStyles')) return;
    const style=document.createElement('style');style.id='cxStyles';
    style.textContent=`
      #courseExplorer{width:100%;min-width:0}
      .cx-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:8px 0 14px;flex-wrap:wrap}
      .cx-crumb{display:flex;gap:7px;flex-wrap:wrap;align-items:center;font-size:12px;color:#818895;margin-bottom:8px}
      .cx-crumb button{border:0;background:transparent;color:#d85b40;padding:0;font-weight:700}
      .cx-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,235px),1fr));gap:12px}
      .cx-card{background:#fff;border:1px solid #e8ebef;border-radius:15px;padding:16px;min-width:0;box-shadow:0 4px 16px rgba(30,38,51,.035)}
      .cx-card h3{font-size:16px;margin:0 0 7px;overflow-wrap:anywhere}.cx-card p{font-size:12px;color:#77808d;line-height:1.5;margin:5px 0;overflow-wrap:anywhere}
      .cx-card-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:12px}
      .cx-btn{border:0;border-radius:9px;padding:9px 12px;min-height:38px;background:#ff674b;color:white;font-size:12px;font-weight:800}
      .cx-btn.soft{background:#fff0e9;color:#bd563d}.cx-btn.dark{background:#263142;color:white}.cx-btn.danger{background:#fff0ef;color:#bc413b}.cx-btn:disabled{opacity:.45}
      .cx-pill{display:inline-flex;padding:5px 9px;border-radius:999px;background:#eef7f1;color:#27764e;font-size:10px;font-weight:800}.cx-pill.draft{background:#fff3e6;color:#965c21}
      .cx-empty{background:#fff;border:1px dashed #dfe3e9;border-radius:14px;padding:22px 16px;color:#7b8390;text-align:center;font-size:13px}
      .cx-form{background:#fff;border:1px solid #e8ebef;border-radius:15px;padding:16px;margin:0 0 14px}
      .cx-form h3{font-size:15px;margin:0 0 12px}.cx-form label,.cx-modal label{display:block;font-size:12px;font-weight:700;margin:10px 0 5px}
      .cx-form input,.cx-form textarea,.cx-form select,.cx-modal input,.cx-modal textarea,.cx-modal select{width:100%;min-width:0;box-sizing:border-box;border:1px solid #dfe3e9;border-radius:9px;padding:11px 12px;background:#fff;color:#252a35;font:inherit;font-size:14px}
      .cx-form textarea,.cx-modal textarea{min-height:78px;resize:vertical}
      .cx-modal-backdrop{position:fixed;inset:0;z-index:100000;background:rgba(20,26,37,.55);display:flex;align-items:center;justify-content:center;padding:14px}
      .cx-modal{width:min(520px,100%);max-height:90dvh;overflow:auto;background:#fff;border-radius:17px;padding:19px;box-shadow:0 18px 55px rgba(0,0,0,.22)}
      .cx-modal h3{font-size:18px;margin:0 0 8px}.cx-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
      .cx-material{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .cx-material-main{min-width:0;flex:1}.cx-material-main h3{margin:0 0 4px}
      .cx-muted{color:#858d99;font-size:11px;line-height:1.5}
      @media(max-width:650px){.cx-card-grid{grid-template-columns:minmax(0,1fr)}.cx-card{padding:14px}.cx-form{padding:13px}.cx-head{gap:8px}}
    `;
    document.head.appendChild(style);
  }

  function ensureRoot(){
    let el=root();
    if(!el){
      const list=$('courseList');
      if(!list)return null;
      el=document.createElement('div');el.id='courseExplorer';list.insertAdjacentElement('afterend',el);
    }
    if($('courseList'))$('courseList').style.display='none';
    return el;
  }

  function showError(error){
    const el=root();if(el)el.innerHTML='<div class="cx-empty">'+safe(error?.message||error||'कुछ गलत हुआ।')+'</div>';
  }

  function courseCard(course,subjectCount,chapterCount){
    return '<article class="cx-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h3>'+safe(course.title)+'</h3><span class="cx-pill '+(course.is_published?'':'draft')+'">'+(course.is_published?'Published':'Draft')+'</span></div><p>'+safe(course.class_name)+' · '+safe(course.subject)+'</p><p>'+safe(course.description||'')+'</p><p>'+subjectCount+' Subjects · '+chapterCount+' Chapters</p><div class="cx-card-actions"><button class="cx-btn" data-action="open-course" data-id="'+safe(course.id)+'">Open Course</button>'+(admin()?'<button class="cx-btn soft" data-action="edit-course" data-id="'+safe(course.id)+'">Edit</button><button class="cx-btn danger" data-action="delete-course" data-id="'+safe(course.id)+'">Delete</button><button class="cx-btn soft" data-action="toggle-course" data-id="'+safe(course.id)+'" data-value="'+(!course.is_published)+'">'+(course.is_published?'Unpublish':'Publish')+'</button>':'')+'</div></article>';
  }

  async function loadCourses(){
    const el=ensureRoot();if(!el)return;
    styles();state={view:'list',course:null,subject:null,chapter:null};
    el.innerHTML='<div class="cx-empty">Courses लोड हो रहे हैं…</div>';
    try{
      const {data,error}=await db.from('courses').select('id,title,class_name,subject,description,is_published,created_by').order('created_at',{ascending:false});
      if(error)throw error;
      const courses=data||[];
      if(!courses.length){el.innerHTML='<div class="cx-empty">अभी कोई published course उपलब्ध नहीं है।</div>';return}
      const cards=await Promise.all(courses.map(async c=>{
        const [ss,cc]=await Promise.all([
          db.from('course_subjects').select('id',{count:'exact',head:true}).eq('course_id',c.id),
          db.from('course_chapters').select('id',{count:'exact',head:true}).eq('course_id',c.id)
        ]);
        return courseCard(c,ss.count||0,cc.count||0);
      }));
      el.innerHTML='<div class="cx-head"><div><h2 class="section-title">Courses</h2><p class="cx-muted">Course खोलकर Subject, Chapters और Lectures देखें। Tests अलग Practice Tests section में हैं।</p></div><button class="cx-btn soft" data-action="refresh">Refresh</button></div><div class="cx-card-grid">'+cards.join('')+'</div>';
    }catch(error){showError(error)}
  }

  async function openCourse(id){
    const el=ensureRoot();if(!el)return;el.innerHTML='<div class="cx-empty">Course खुल रहा है…</div>';
    try{
      const [cr,sr]=await Promise.all([
        db.from('courses').select('id,title,class_name,subject,description,is_published,created_by').eq('id',id).single(),
        db.from('course_subjects').select('id,name,sort_order').eq('course_id',id).order('sort_order').order('name')
      ]);
      if(cr.error)throw cr.error;if(sr.error)throw sr.error;
      state={view:'course',course:cr.data,subject:null,chapter:null};
      const subjects=sr.data||[];
      el.innerHTML='<div class="cx-crumb"><button data-action="back-list">← सभी Courses</button><span>›</span><b>'+safe(cr.data.title)+'</b></div><div class="cx-head"><div><h2 class="section-title">'+safe(cr.data.title)+'</h2><p class="cx-muted">'+safe(cr.data.class_name)+' · '+safe(cr.data.description||'')+'</p></div>'+(admin()?'<button class="cx-btn soft" data-action="edit-course" data-id="'+safe(id)+'">Edit Course</button>':'')+'</div>'+
      (admin()?'<form class="cx-form" data-form="add-subject"><h3>नया Subject जोड़ें</h3><label>Subject Name</label><input name="name" required maxlength="100" placeholder="जैसे Mathematics"><button class="cx-btn" type="submit">Add Subject</button></form>':'')+
      (subjects.length?'<div class="cx-card-grid">'+subjects.map(s=>'<article class="cx-card"><h3>'+safe(s.name)+'</h3><p>Chapters और lectures देखने के लिए खोलें।</p><div class="cx-card-actions"><button class="cx-btn" data-action="open-subject" data-id="'+safe(s.id)+'">Open Subject</button>'+(admin()?'<button class="cx-btn soft" data-action="edit-subject" data-id="'+safe(s.id)+'">Edit</button><button class="cx-btn danger" data-action="delete-subject" data-id="'+safe(s.id)+'">Delete</button>':'')+'</div></article>').join('')+'</div>':'<div class="cx-empty">इस Course में अभी Subject नहीं हैं।'+(admin()?' ऊपर से Subject जोड़ें।':'')+'</div>');
    }catch(error){showError(error)}
  }

  async function openSubject(id){
    const el=ensureRoot();if(!el)return;el.innerHTML='<div class="cx-empty">Subject खुल रहा है…</div>';
    try{
      const [sr,cr]=await Promise.all([
        db.from('course_subjects').select('id,name,course_id,sort_order').eq('id',id).single(),
        Promise.resolve(null)
      ]);
      if(sr.error)throw sr.error;
      const subject=sr.data;
      const {data:chapters,error}=await db.from('course_chapters').select('id,title,description,is_published,sort_order,course_id,course_subject_id').eq('course_subject_id',id).order('sort_order').order('title');
      if(error)throw error;
      const course=state.course;
      state={view:'subject',course:course,subject:subject,chapter:null};
      const visible=(chapters||[]).filter(ch=>admin()||ch.is_published);
      el.innerHTML='<div class="cx-crumb"><button data-action="back-course">← '+safe(course?.title||'Course')+'</button><span>›</span><b>'+safe(subject.name)+'</b></div><div class="cx-head"><div><h2 class="section-title">'+safe(subject.name)+'</h2><p class="cx-muted">'+visible.length+' Chapters</p></div>'+(admin()?'<button class="cx-btn soft" data-action="edit-subject" data-id="'+safe(id)+'">Edit Subject</button>':'')+'</div>'+
      (admin()?'<form class="cx-form" data-form="add-chapter"><h3>नया Chapter जोड़ें</h3><label>Chapter Title</label><input name="title" required maxlength="160" placeholder="Chapter का नाम"><label>Description (optional)</label><textarea name="description" maxlength="500" placeholder="छोटा विवरण"></textarea><button class="cx-btn" type="submit">Add Chapter</button></form>':'')+
      (visible.length?'<div class="cx-card-grid">'+visible.map(ch=>'<article class="cx-card"><div style="display:flex;justify-content:space-between;gap:8px"><h3>'+safe(ch.title)+'</h3><span class="cx-pill '+(ch.is_published?'':'draft')+'">'+(ch.is_published?'Published':'Draft')+'</span></div><p>'+safe(ch.description||'Chapter lectures और PDFs')</p><div class="cx-card-actions"><button class="cx-btn" data-action="open-chapter" data-id="'+safe(ch.id)+'">Open Chapter</button>'+(admin()?'<button class="cx-btn soft" data-action="edit-chapter" data-id="'+safe(ch.id)+'">Edit</button><button class="cx-btn danger" data-action="delete-chapter" data-id="'+safe(ch.id)+'">Delete</button><button class="cx-btn soft" data-action="toggle-chapter" data-id="'+safe(ch.id)+'" data-value="'+(!ch.is_published)+'">'+(ch.is_published?'Unpublish':'Publish')+'</button>':'')+'</div></article>').join('')+'</div>':'<div class="cx-empty">अभी कोई Chapter उपलब्ध नहीं है।'+(admin()?' ऊपर से Chapter जोड़ें।':'')+'</div>');
    }catch(error){showError(error)}
  }

  async function openChapter(id){
    const el=ensureRoot();if(!el)return;el.innerHTML='<div class="cx-empty">Chapter खुल रहा है…</div>';
    try{
      const {data:ch,error:ce}=await db.from('course_chapters').select('id,title,description,is_published,course_id,course_subject_id').eq('id',id).single();
      if(ce)throw ce;
      const {data:materials,error}=await db.from('learning_materials').select('id,title,description,material_type,storage_bucket,storage_path,external_url,is_published,created_at').eq('course_chapter_id',id).order('sort_order').order('created_at');
      if(error)throw error;
      state.chapter=ch;state.view='chapter';
      const rows=materials||[];
      const cards=await Promise.all(rows.map(async m=>{
        let href=m.external_url||'';
        if(!href&&m.storage_path){try{const signed=await db.storage.from(m.storage_bucket).createSignedUrl(m.storage_path,3600);if(!signed.error)href=signed.data.signedUrl}catch(e){}}
        return '<article class="cx-card cx-material"><div class="cx-material-main"><h3>'+safe(m.title)+'</h3><p>'+safe(m.material_type.toUpperCase())+' · '+safe(m.description||'')+'</p><span class="cx-pill '+(m.is_published?'':'draft')+'">'+(m.is_published?'Published':'Draft')+'</span></div><div class="cx-card-actions">'+(href?'<button class="cx-btn" data-action="open-material" data-url="'+safe(href)+'">'+(m.material_type==='pdf'?'Open PDF':'Open Video')+'</button>':'<span class="cx-muted">File link unavailable</span>')+(admin()?'<button class="cx-btn soft" data-action="edit-material" data-id="'+safe(m.id)+'">Edit</button><button class="cx-btn soft" data-action="toggle-material" data-id="'+safe(m.id)+'" data-value="'+(!m.is_published)+'">'+(m.is_published?'Unpublish':'Publish')+'</button><button class="cx-btn danger" data-action="delete-material" data-id="'+safe(m.id)+'">Delete</button>':'')+'</div></article>';
      }));
      el.innerHTML='<div class="cx-crumb"><button data-action="back-subject">← '+safe(state.subject?.name||'Subject')+'</button><span>›</span><b>'+safe(ch.title)+'</b></div><div class="cx-head"><div><h2 class="section-title">'+safe(ch.title)+'</h2><p class="cx-muted">Lectures और PDFs</p></div>'+(admin()?'<button class="cx-btn soft" data-action="edit-chapter" data-id="'+safe(id)+'">Edit Chapter</button>':'')+'</div>'+
      (admin()?'<form class="cx-form" data-form="add-material" enctype="multipart/form-data"><h3>Upload Lecture / PDF</h3><label>Title</label><input name="title" required maxlength="120" placeholder="Lecture या PDF का नाम"><label>Type</label><select name="type"><option value="pdf">PDF</option><option value="video">Video (MP4)</option></select><label>Description (optional)</label><textarea name="description" maxlength="500"></textarea><label>File (PDF / MP4, अधिकतम 50 MB)</label><input name="file" type="file" accept=".pdf,application/pdf,.mp4,video/mp4"><label>या External URL (https://)</label><input name="url" type="url" placeholder="https://..."><label><input name="publish" type="checkbox" checked style="width:auto"> Upload के बाद Students को दिखाएँ</label><button class="cx-btn" type="submit">Upload Material</button><p class="cx-muted" data-status></p></form>':'')+
      (rows.length?'<div class="cx-card-grid">'+cards.join('')+'</div>':'<div class="cx-empty">अभी कोई published lecture या PDF उपलब्ध नहीं है।</div>');
    }catch(error){showError(error)}
  }

  function modal(title,fields,save){
    const el=document.createElement('div');el.className='cx-modal-backdrop';el.innerHTML='<form class="cx-modal"><h3>'+safe(title)+'</h3>'+fields.map(f=>'<label>'+safe(f.label)+'</label>'+(f.type==='textarea'?'<textarea name="'+safe(f.name)+'" maxlength="'+(f.max||500)+'">'+safe(f.value)+'</textarea>':'<input name="'+safe(f.name)+'" type="'+(f.type||'text')+'" maxlength="'+(f.max||180)+'" value="'+safe(f.value)+'" '+(f.required?'required':'')+'>')).join('')+'<div class="cx-modal-actions"><button type="button" class="cx-btn soft" data-modal-cancel>Cancel</button><button type="submit" class="cx-btn">Save Changes</button></div></form>';
    document.body.appendChild(el);
    el.querySelector('[data-modal-cancel]').addEventListener('click',()=>el.remove());
    el.addEventListener('click',e=>{if(e.target===el)el.remove()});
    el.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget).entries());const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;try{await save(values);el.remove()}catch(err){alert(err.message||String(err));btn.disabled=false}});
  }

  async function editCourse(id){
    if(!admin())return alert('केवल Admin course edit कर सकता है।');
    const {data,error}=await db.from('courses').select('*').eq('id',id).single();if(error)return alert(error.message);
    modal('Edit Course',[{name:'title',label:'Course Title',value:data.title,required:true},{name:'class_name',label:'Class',value:data.class_name,required:true},{name:'subject',label:'Main Subject',value:data.subject,required:true},{name:'description',label:'Description',value:data.description||'',type:'textarea'}],async v=>{
      const {error:e}=await db.from('courses').update({title:v.title.trim(),class_name:v.class_name.trim(),subject:v.subject.trim(),description:v.description.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(e)throw e;await loadCourses();
    });
  }

  async function deleteCourse(id){
    if(!admin()||!confirm('इस Course, उसके Subjects और Chapters को हटाएँ?'))return;
    const {data:chs,error}=await db.from('course_chapters').select('id').eq('course_id',id);if(error)return alert(error.message);
    const ids=(chs||[]).map(x=>x.id);let files=[];
    if(ids.length){const {data,error:e}=await db.from('learning_materials').select('storage_bucket,storage_path').in('course_chapter_id',ids);if(e)return alert(e.message);files=data||[]}
    const {error}=await db.from('courses').delete().eq('id',id);if(error)return alert(error.message);
    for(const bucket of ['study-pdfs','study-videos']){const paths=files.filter(f=>f.storage_bucket===bucket&&f.storage_path).map(f=>f.storage_path);if(paths.length)await db.storage.from(bucket).remove(paths)}
    await loadCourses();
  }

  async function editSubject(id){
    if(!admin())return;const {data,error}=await db.from('course_subjects').select('*').eq('id',id).single();if(error)return alert(error.message);
    modal('Edit Subject',[{name:'name',label:'Subject Name',value:data.name,required:true}],async v=>{
      const {error:e}=await db.from('course_subjects').update({name:v.name.trim()}).eq('id',id);if(e)throw e;await openCourse(data.course_id);
    });
  }

  async function deleteSubject(id){
    if(!admin()||!confirm('इस Subject और इसके Chapters/Lectures को हटाएँ?'))return;
    const {data:chs,error}=await db.from('course_chapters').select('id').eq('course_subject_id',id);if(error)return alert(error.message);
    const ids=(chs||[]).map(x=>x.id);let files=[];
    if(ids.length){const {data,error:e}=await db.from('learning_materials').select('storage_bucket,storage_path').in('course_chapter_id',ids);if(e)return alert(e.message);files=data||[]}
    const courseId=state.course?.id;
    const {error}=await db.from('course_subjects').delete().eq('id',id);if(error)return alert(error.message);
    for(const bucket of ['study-pdfs','study-videos']){const paths=files.filter(f=>f.storage_bucket===bucket&&f.storage_path).map(f=>f.storage_path);if(paths.length)await db.storage.from(bucket).remove(paths)}
    await openCourse(courseId);
  }

  async function editChapter(id){
    if(!admin())return;const {data,error}=await db.from('course_chapters').select('*').eq('id',id).single();if(error)return alert(error.message);
    modal('Edit Chapter',[{name:'title',label:'Chapter Title',value:data.title,required:true},{name:'description',label:'Description',value:data.description||'',type:'textarea'}],async v=>{
      const {error:e}=await db.from('course_chapters').update({title:v.title.trim(),description:v.description.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(e)throw e;await openSubject(data.course_subject_id);
    });
  }

  async function deleteChapter(id){
    if(!admin()||!confirm('इस Chapter और उसके Lectures को हटाएँ?'))return;
    const {data:files,error:fe}=await db.from('learning_materials').select('storage_bucket,storage_path').eq('course_chapter_id',id);if(fe)return alert(fe.message);
    const chapter=state.chapter;const subjectId=state.subject?.id || chapter?.course_subject_id;
    const {error}=await db.from('course_chapters').delete().eq('id',id);if(error)return alert(error.message);
    for(const bucket of ['study-pdfs','study-videos']){const paths=(files||[]).filter(f=>f.storage_bucket===bucket&&f.storage_path).map(f=>f.storage_path);if(paths.length)await db.storage.from(bucket).remove(paths)}
    await openSubject(subjectId);
  }

  async function toggleChapter(id,value){
    if(!admin())return;const {error}=await db.from('course_chapters').update({is_published:value,updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);await openSubject(state.subject.id);
  }

  async function uploadMaterial(form){
    if(!admin())throw new Error('केवल Admin lecture/PDF upload कर सकता है।');
    const data=new FormData(form),title=String(data.get('title')||'').trim(),type=String(data.get('type')||'pdf'),file=form.elements.file.files[0],url=String(data.get('url')||'').trim();
    if(!title)throw new Error('Title जरूरी है।');if(!file&&!url)throw new Error('File upload करें या External URL दें।');
    if(file&&file.size>50*1024*1024)throw new Error('File 50 MB से बड़ी है।');
    if(file&&type==='pdf'&&file.type!=='application/pdf')throw new Error('PDF file चुनें।');
    if(file&&type==='video'&&file.type!=='video/mp4')throw new Error('MP4 video चुनें।');
    if(url&&!String(url).toLowerCase().startsWith('https://'))throw new Error('External URL https:// से शुरू होना चाहिए।');
    const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Uploading…';
    const bucket=type==='pdf'?'study-pdfs':'study-videos';let path='';
    try{
      if(file){path=profile.id+'/'+crypto.randomUUID()+'-'+file.name.split('').map(ch=>/[a-zA-Z0-9._-]/.test(ch)?ch:'_').join('');const {error}=await db.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type});if(error)throw error}
      const {error}=await db.from('learning_materials').insert({chapter_id:null,course_chapter_id:state.chapter.id,title,description:String(data.get('description')||'').trim()||null,material_type:type,storage_bucket:bucket,storage_path:path,external_url:file?null:url,is_published:data.get('publish')==='on',created_by:profile.id});
      if(error){if(path)await db.storage.from(bucket).remove([path]);throw error}
      await openChapter(state.chapter.id);
    }finally{if(btn){btn.disabled=false;btn.textContent='Upload Material'}}
  }

  async function editMaterial(id){
    if(!admin())return;const {data,error}=await db.from('learning_materials').select('*').eq('id',id).single();if(error)return alert(error.message);
    modal('Edit Lecture / PDF',[{name:'title',label:'Title',value:data.title,required:true},{name:'description',label:'Description',value:data.description||'',type:'textarea'},{name:'external_url',label:'External URL (leave blank for uploaded file)',value:data.external_url||''}],async v=>{
      if(v.external_url&&!String(v.external_url).toLowerCase().startsWith('https://'))throw new Error('URL https:// से शुरू होना चाहिए।');
      const {error:e}=await db.from('learning_materials').update({title:v.title.trim(),description:v.description.trim()||null,external_url:v.external_url.trim()||null,updated_at:new Date().toISOString()}).eq('id',id);if(e)throw e;await openChapter(state.chapter.id);
    });
  }

  async function deleteMaterial(id){
    if(!admin()||!confirm('इस Lecture/PDF को delete करें?'))return;
    const {data,error}=await db.from('learning_materials').select('storage_bucket,storage_path').eq('id',id).single();if(error)return alert(error.message);
    const {error:de}=await db.from('learning_materials').delete().eq('id',id);if(de)return alert(de.message);
    if(data.storage_path)await db.storage.from(data.storage_bucket).remove([data.storage_path]);
    await openChapter(state.chapter.id);
  }

  async function toggleMaterial(id,value){
    if(!admin())return;const {error}=await db.from('learning_materials').update({is_published:value,updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);await openChapter(state.chapter.id);
  }

  async function submitForm(form){
    const type=form.getAttribute('data-form');
    if(type==='add-subject'){
      const name=new FormData(form).get('name').trim();if(!name)throw new Error('Subject name जरूरी है।');
      const {error}=await db.from('course_subjects').insert({course_id:state.course.id,name,sort_order:0});if(error)throw error;await openCourse(state.course.id);
    }else if(type==='add-chapter'){
      const data=new FormData(form);const title=String(data.get('title')||'').trim();if(!title)throw new Error('Chapter title जरूरी है।');
      const {error}=await db.from('course_chapters').insert({course_id:state.course.id,course_subject_id:state.subject.id,title,description:String(data.get('description')||'').trim()||null,is_published:false,sort_order:0});if(error)throw error;await openSubject(state.subject.id);
    }else if(type==='add-material'){
      const p=form.querySelector('[data-status]');if(p)p.textContent='Upload हो रहा है…';await uploadMaterial(form);
    }
  }

  async function click(event){
    const btn=event.target.closest('[data-action]');if(!btn)return;
    const action=btn.dataset.action,id=btn.dataset.id;
    try{
      if(action==='refresh')await loadCourses();
      else if(action==='open-course')await openCourse(id);
      else if(action==='open-subject')await openSubject(id);
      else if(action==='open-chapter')await openChapter(id);
      else if(action==='back-list')await loadCourses();
      else if(action==='back-course')await openCourse(state.course.id);
      else if(action==='back-subject')await openSubject(state.subject.id);
      else if(action==='edit-course')await editCourse(id);
      else if(action==='delete-course')await deleteCourse(id);
      else if(action==='toggle-course'){const {error}=await db.from('courses').update({is_published:btn.dataset.value==='true',updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await loadCourses()}
      else if(action==='edit-subject')await editSubject(id);
      else if(action==='delete-subject')await deleteSubject(id);
      else if(action==='edit-chapter')await editChapter(id);
      else if(action==='delete-chapter')await deleteChapter(id);
      else if(action==='toggle-chapter')await toggleChapter(id,btn.dataset.value==='true');
      else if(action==='open-material'){const url=btn.dataset.url;if(url)window.open(url,'_blank','noopener,noreferrer')}
      else if(action==='edit-material')await editMaterial(id);
      else if(action==='delete-material')await deleteMaterial(id);
      else if(action==='toggle-material')await toggleMaterial(id,btn.dataset.value==='true');
    }catch(error){alert(error.message||String(error))}
  }

  async function submit(event){
    const form=event.target.closest('form[data-form]');if(!form)return;event.preventDefault();
    const submitButton=form.querySelector('[type=submit]');if(submitButton)submitButton.disabled=true;
    try{await submitForm(form)}catch(error){const p=form.querySelector('[data-status]');if(p)p.textContent=error.message||String(error);else alert(error.message||String(error))}
    finally{if(submitButton&&submitButton.isConnected)submitButton.disabled=false}
  }

  function install(){
    const el=ensureRoot();if(!el)return;
    el.addEventListener('click',click);el.addEventListener('submit',submit);
    window.loadCourses=loadCourses;
    if(typeof currentTab!=='undefined'&&currentTab==='courses')loadCourses();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.loadStudyGuruCourses=loadCourses;
})();
