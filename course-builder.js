/* StudyGuru: Course -> Chapters -> PDF / Video / MCQ Tests */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const canManage = course => !!window.profile && (window.profile.role === 'admin' || course?.created_by === window.profile.id);
  let selectedCourse = null, selectedChapters = [], selectedCourseTest = null;

  const style = document.createElement('style');
  style.textContent = `
  .sg-course-detail{margin:16px 0}
  .sg-course-banner{background:#1F2633;color:#fff;border-radius:17px;padding:20px;margin-bottom:14px}
  .sg-course-banner h2{margin:0 0 6px;font-size:22px}
  .sg-course-form{background:#fff;border:1px solid #e7e9ed;border-radius:15px;padding:16px;margin:12px 0}
  .sg-course-chapter{background:#fff;border:1px solid #e7e9ed;border-radius:15px;padding:15px;margin:12px 0}
  .sg-course-chapter h3{margin:0 0 8px;font-size:17px}
  .sg-course-resource{border:1px solid #edf0f3;border-radius:12px;padding:12px;margin:9px 0}
  .sg-course-resource p{color:#6b7280;font-size:13px;margin:5px 0 10px}
  .sg-course-actions{display:flex;flex-wrap:wrap;gap:8px}
  .sg-course-actions button{min-height:42px}
  .sg-course-chip{display:inline-block;border-radius:99px;padding:5px 9px;background:#fff0ed;color:#d94f38;font-size:11px;font-weight:700}
  .sg-course-muted{font-size:12px;color:#6b7280}
  .sg-course-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .sg-course-video{width:100%;max-height:360px;border-radius:12px;background:#111;margin-top:10px}
  @media(max-width:600px){.sg-course-grid{grid-template-columns:1fr}.sg-course-detail{margin-top:10px}}
  `;
  document.head.appendChild(style);

  const panel = $('coursesPanel');
  if (!panel || !$('courseList')) return;
  $('courseList').insertAdjacentHTML('beforebegin', `
    <section id="sgCourseDetail" class="sg-course-detail hidden">
      <div class="topline"><button class="plain" onclick="closeCourseDetail()">← सभी Courses</button><span id="sgCourseState" class="sg-course-muted"></span></div>
      <div id="sgCourseBanner" class="sg-course-banner"></div>
      <div id="sgCourseManager" class="sg-course-form hidden">
        <h3 class="section-title" style="margin-top:0">Course Chapters</h3>
        <div class="sg-course-grid">
          <div><label>Chapter Name</label><input id="sgChapterTitle" class="field" maxlength="160" placeholder="जैसे Chapter 1 — Introduction"></div>
          <div><label>Short Description</label><input id="sgChapterDescription" class="field" maxlength="300" placeholder="Chapter का विवरण"></div>
        </div>
        <button onclick="addCourseChapter()">+ Add Chapter</button><div id="sgChapterStatus" class="status"></div>
      </div>
      <div id="sgCourseUpload" class="sg-course-form hidden">
        <h3 class="section-title" style="margin-top:0">Chapter में PDF / Video जोड़ें</h3>
        <label>Chapter</label><select id="sgResourceChapter" class="field"></select>
        <div class="sg-course-grid">
          <div><label>Content Title</label><input id="sgResourceTitle" class="field" maxlength="160" placeholder="जैसे Chapter Notes PDF"></div>
          <div><label>Content Type</label><select id="sgResourceType" class="field"><option value="pdf">PDF / Test PDF</option><option value="video">Video</option></select></div>
        </div>
        <label>File (PDF या MP4, अधिकतम 50 MB)</label><input id="sgResourceFile" class="field" type="file" accept=".pdf,application/pdf,video/mp4">
        <label>या External URL (HTTPS)</label><input id="sgResourceUrl" class="field" type="url" placeholder="PDF / YouTube / Video URL">
        <label>Description</label><textarea id="sgResourceDescription" class="field" rows="2" maxlength="500"></textarea>
        <label style="display:flex;align-items:center;gap:8px"><input id="sgResourcePublish" type="checkbox" checked> Students को अभी दिखाएँ</label>
        <button id="sgResourceSave" onclick="uploadCourseResource()">Upload to Chapter</button><div id="sgResourceStatus" class="status"></div>
      </div>
      <div id="sgCourseTest" class="sg-course-form hidden">
        <h3 class="section-title" style="margin-top:0">Chapter-wise MCQ Test बनाएँ</h3>
        <label>Chapter</label><select id="sgTestChapter" class="field"></select>
        <label>Test Title</label><input id="sgTestTitle" class="field" maxlength="160" placeholder="जैसे Chapter 1 Practice Test">
        <label>Duration (minutes)</label><input id="sgTestDuration" class="field" type="number" min="1" max="240" value="15">
        <label>Description</label><textarea id="sgTestDescription" class="field" rows="2"></textarea>
        <button onclick="createCourseTest()">Create MCQ Test</button><div id="sgTestStatus" class="status"></div>
        <div id="sgQuestionBuilder" class="hidden">
          <hr style="border:0;border-top:1px solid #e7e9ed;margin:18px 0">
          <h3>Add Test Questions</h3>
          <label>Question</label><textarea id="sgQuestionText" class="field" rows="2"></textarea>
          <div class="sg-course-grid">
            <input id="sgOption0" class="field" placeholder="Option 1">
            <input id="sgOption1" class="field" placeholder="Option 2">
            <input id="sgOption2" class="field" placeholder="Option 3">
            <input id="sgOption3" class="field" placeholder="Option 4">
          </div>
          <label>Correct Answer</label><select id="sgCorrectOption" class="field"><option value="0">Option 1</option><option value="1">Option 2</option><option value="2">Option 3</option><option value="3">Option 4</option></select>
          <div class="sg-course-actions"><button onclick="addCourseTestQuestion()">Add Question</button><button class="secondary" onclick="publishCourseTest()">Publish Test</button></div>
          <div id="sgQuestionStatus" class="status"></div>
        </div>
      </div>
      <div id="sgCourseChapterList"></div>
    </section>`);

  window.closeCourseDetail = () => {
    $('sgCourseDetail').classList.add('hidden');
    $('courseList').classList.remove('hidden');
    selectedCourse = null;
  };

  window.openCourse = async id => {
    $('courseList').classList.add('hidden');
    $('sgCourseDetail').classList.remove('hidden');
    $('sgCourseBanner').innerHTML = '<h2>Course लोड हो रहा है…</h2>';
    $('sgCourseChapterList').innerHTML = '';
    const {data:course,error} = await db.from('courses').select('*').eq('id',id).single();
    if(error){$('sgCourseBanner').textContent=error.message;return;}
    selectedCourse = course;
    const manager = canManage(course);
    $('sgCourseState').textContent = course.is_published ? 'Published course' : 'Draft — केवल course owner/admin';
    $('sgCourseBanner').innerHTML = '<h2>'+esc(course.title)+'</h2><p>'+esc(course.class_name)+' · '+esc(course.subject)+'</p><p>'+esc(course.description||'')+'</p>';
    ['sgCourseManager','sgCourseUpload','sgCourseTest'].forEach(x => $(x).classList.toggle('hidden',!manager));
    const {data:chapters,error:chapterError} = await db.from('course_chapters').select('*').eq('course_id',id).order('sort_order').order('created_at');
    if(chapterError){$('sgCourseChapterList').innerHTML='<div class="empty">'+esc(chapterError.message)+'</div>';return;}
    selectedChapters = chapters || [];
    const opts = selectedChapters.map(ch=>'<option value="'+ch.id+'">'+esc(ch.title)+'</option>').join('');
    $('sgResourceChapter').innerHTML=opts || '<option value="">पहले Chapter जोड़ें</option>';
    $('sgTestChapter').innerHTML=opts || '<option value="">पहले Chapter जोड़ें</option>';
    if(!selectedChapters.length){$('sgCourseChapterList').innerHTML='<div class="empty">अभी कोई chapter नहीं है।'+(manager?' ऊपर से पहला chapter जोड़ें।':'')+'</div>';return;}
    const ids = selectedChapters.map(ch=>ch.id);
    const [resourceResult,testResult] = await Promise.all([
      db.from('course_chapter_resources').select('*').in('chapter_id',ids).order('created_at'),
      db.from('practice_tests').select('id,title,description,duration_minutes,is_published,course_chapter_id').in('course_chapter_id',ids).order('created_at')
    ]);
    if(resourceResult.error || testResult.error){
      $('sgCourseChapterList').innerHTML='<div class="notice">Course content schema upgrade pending. Preview UI is ready, but backend chapter tables need the migration first.</div>';
      return;
    }
    const resources=resourceResult.data||[], tests=testResult.data||[];
    const sections = await Promise.all(selectedChapters.map(async ch=>{
      const files = resources.filter(r=>r.chapter_id===ch.id);
      const quizzes = tests.filter(t=>t.course_chapter_id===ch.id);
      const fileCards = await Promise.all(files.map(async r=>{
        let url=r.external_url||'';
        if(!url && r.storage_path){const {data}=await db.storage.from(r.storage_bucket).createSignedUrl(r.storage_path,3600);url=data?.signedUrl||'';}
        const tag=r.resource_type==='pdf'?'PDF':'VIDEO';
        const player=r.resource_type==='video' && url && /youtu(?:\.be|be\.com)/i.test(url)
          ? '<p><a href="'+esc(url)+'" target="_blank" rel="noopener">YouTube पर Video खोलें</a></p>'
          : r.resource_type==='video' && url && /\.(mp4|webm)(\?|$)/i.test(url)
            ? '<video class="sg-course-video" controls playsinline src="'+esc(url)+'"></video>' : '';
        return '<div class="sg-course-resource"><span class="sg-course-chip">'+tag+'</span><h4>'+esc(r.title)+'</h4><p>'+esc(r.description||'')+'</p>'+player+'<div class="sg-course-actions">'+(url?'<button onclick="window.open('+JSON.stringify(url)+',\'_blank\',\'noopener\')">'+(r.resource_type==='pdf'?'Open PDF':'Open Video')+'</button>':'<span class="sg-course-muted">File link unavailable</span>')+(manager?'<button class="secondary" onclick="toggleCourseResource(\''+r.id+'\','+(!r.is_published)+')">'+(r.is_published?'Hide':'Publish')+'</button><button class="danger" onclick="deleteCourseResource(\''+r.id+'\')">Delete</button>':'')+'</div></div>';
      }));
      const testCards=quizzes.map(t=>'<div class="sg-course-resource"><span class="sg-course-chip">MCQ TEST</span><h4>'+esc(t.title)+'</h4><p>'+esc(t.duration_minutes)+' minutes · '+esc(t.description||'')+'</p><div class="sg-course-actions">'+(t.is_published?'<button onclick="startDbTest(\''+t.id+'\')">Start Test</button>':'<span class="sg-course-muted">Draft test</span>')+(manager?'<button class="secondary" onclick="editCourseTest(\''+t.id+'\')">Add Questions</button><button class="secondary" onclick="toggleCourseTest(\''+t.id+'\','+(!t.is_published)+')">'+(t.is_published?'Unpublish':'Publish')+'</button>':'')+'</div></div>');
      return '<article class="sg-course-chapter"><h3>'+esc(ch.title)+'</h3><p class="sg-course-muted">'+esc(ch.description||'')+'</p>'+((fileCards.length||testCards.length)?fileCards.join('')+testCards.join(''):'<p class="sg-course-muted">इस chapter में अभी PDF, Video या Test नहीं है।</p>')+'</article>';
    }));
    $('sgCourseChapterList').innerHTML=sections.join('');
  };

  window.addCourseChapter = async () => {
    if(!selectedCourse || !canManage(selectedCourse)) return;
    const title=$('sgChapterTitle').value.trim();
    if(!title) return status('sgChapterStatus','Chapter का नाम लिखें।','error');
    const {error}=await db.from('course_chapters').insert({
      course_id:selectedCourse.id,title,description:$('sgChapterDescription').value.trim(),
      sort_order:selectedChapters.length,is_published:true
    });
    if(error) return status('sgChapterStatus',error.message,'error');
    $('sgChapterTitle').value='';$('sgChapterDescription').value='';
    status('sgChapterStatus','Chapter बन गया।','ok');
    await openCourse(selectedCourse.id);
  };

  window.uploadCourseResource = async () => {
    if(!selectedCourse || !canManage(selectedCourse)) return;
    const chapterId=$('sgResourceChapter').value,title=$('sgResourceTitle').value.trim();
    const type=$('sgResourceType').value,file=$('sgResourceFile').files[0],url=$('sgResourceUrl').value.trim();
    if(!chapterId || !title) return status('sgResourceStatus','Chapter और title जरूरी हैं।','error');
    if(!file && !url) return status('sgResourceStatus','PDF/Video file चुनें या HTTPS URL दें।','error');
    if(file && file.size>50*1024*1024) return status('sgResourceStatus','File 50 MB से बड़ी है।','error');
    if(file && type==='pdf' && file.type!=='application/pdf') return status('sgResourceStatus','PDF file ही चुनें।','error');
    if(file && type==='video' && !['video/mp4','video/webm'].includes(file.type)) return status('sgResourceStatus','MP4 या WebM video चुनें।','error');
    if(url && !/^https:\/\//i.test(url)) return status('sgResourceStatus','URL https:// से शुरू होना चाहिए।','error');
    const btn=$('sgResourceSave');btn.disabled=true;status('sgResourceStatus','Upload हो रहा है…');
    const bucket=type==='pdf'?'study-pdfs':'study-videos';
    let path='';
    try{
      if(file){
        path=profile.id+'/courses/'+chapterId+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        const {error}=await db.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type});
        if(error) throw error;
      }
      const {error}=await db.from('course_chapter_resources').insert({
        chapter_id:chapterId,title,description:$('sgResourceDescription').value.trim()||null,
        resource_type:type,storage_bucket:file?bucket:null,storage_path:path,external_url:file?null:url,
        is_published:$('sgResourcePublish').checked,created_by:profile.id
      });
      if(error){if(path)await db.storage.from(bucket).remove([path]);throw error;}
      $('sgResourceTitle').value='';$('sgResourceDescription').value='';$('sgResourceFile').value='';$('sgResourceUrl').value='';
      status('sgResourceStatus','Chapter में content upload हो गया।','ok');
      await openCourse(selectedCourse.id);
    }catch(e){status('sgResourceStatus',e.message||'Upload failed','error');}
    finally{btn.disabled=false;}
  };

  window.toggleCourseResource = async (id,value) => {
    const {error}=await db.from('course_chapter_resources').update({is_published:value,updated_at:new Date().toISOString()}).eq('id',id);
    if(error) return alert(error.message);
    if(selectedCourse) await openCourse(selectedCourse.id);
  };
  window.deleteCourseResource = async id => {
    if(!confirm('इस chapter resource को delete करना है?')) return;
    const {data,error}=await db.from('course_chapter_resources').select('*').eq('id',id).single();
    if(error) return alert(error.message);
    const {error:delError}=await db.from('course_chapter_resources').delete().eq('id',id);
    if(delError) return alert(delError.message);
    if(data.storage_path) await db.storage.from(data.storage_bucket).remove([data.storage_path]);
    if(selectedCourse) await openCourse(selectedCourse.id);
  };

  window.createCourseTest = async () => {
    if(!selectedCourse || !canManage(selectedCourse)) return;
    const chapter=$('sgTestChapter').value,title=$('sgTestTitle').value.trim();
    const duration=Number($('sgTestDuration').value);
    if(!chapter||!title||!Number.isInteger(duration)||duration<1||duration>240) return status('sgTestStatus','Chapter, title और 1–240 मिनट का समय भरें।','error');
    const {data,error}=await db.from('practice_tests').insert({
      title,class_name:selectedCourse.class_name,subject:selectedCourse.subject,
      description:$('sgTestDescription').value.trim(),duration_minutes:duration,
      course_chapter_id:chapter,created_by:profile.id,is_published:false
    }).select('id').single();
    if(error) return status('sgTestStatus',error.message,'error');
    selectedCourseTest=data.id;
    $('sgQuestionBuilder').classList.remove('hidden');
    status('sgTestStatus','Test draft बन गया। अब questions जोड़ें और Publish करें।','ok');
    await openCourse(selectedCourse.id);
    $('sgQuestionBuilder').classList.remove('hidden');
  };

  window.addCourseTestQuestion = async () => {
    if(!selectedCourseTest) return status('sgQuestionStatus','पहले test बनाएँ।','error');
    const text=$('sgQuestionText').value.trim();
    const options=[0,1,2,3].map(i=>$('sgOption'+i).value.trim());
    if(!text||options.some(x=>!x)) return status('sgQuestionStatus','Question और चारों options भरें।','error');
    const {data,error}=await db.from('test_questions').insert({test_id:selectedCourseTest,question_text:text,options}).select('id').single();
    if(error) return status('sgQuestionStatus',error.message,'error');
    const {error:keyError}=await db.from('test_answer_keys').insert({question_id:data.id,correct_option:Number($('sgCorrectOption').value)});
    if(keyError) return status('sgQuestionStatus',keyError.message,'error');
    $('sgQuestionText').value='';[0,1,2,3].forEach(i=>$('sgOption'+i).value='');
    status('sgQuestionStatus','Question save हो गया।','ok');
  };

  window.editCourseTest = async id => {
    selectedCourseTest=id;
    $('sgQuestionBuilder').classList.remove('hidden');
    status('sgTestStatus','Selected test में questions जोड़ सकते हैं।','ok');
    $('sgQuestionBuilder').scrollIntoView({behavior:'smooth',block:'center'});
  };

  window.publishCourseTest = async () => {
    if(!selectedCourseTest) return;
    const {count,error}=await db.from('test_questions').select('*',{count:'exact',head:true}).eq('test_id',selectedCourseTest);
    if(error) return status('sgQuestionStatus',error.message,'error');
    if(!count) return status('sgQuestionStatus','Publish करने से पहले कम से कम एक question जोड़ें।','error');
    const {error:publishError}=await db.from('practice_tests').update({is_published:true}).eq('id',selectedCourseTest);
    if(publishError) return status('sgQuestionStatus',publishError.message,'error');
    status('sgQuestionStatus','Test publish हो गया।','ok');
    const id=selectedCourse.id;
    selectedCourseTest=null;
    await openCourse(id);
  };

  window.toggleCourseTest = async (id,value) => {
    const {error}=await db.from('practice_tests').update({is_published:value}).eq('id',id);
    if(error) return alert(error.message);
    if(selectedCourse) await openCourse(selectedCourse.id);
  };

  // Replace course creation/list rendering while retaining the existing form and DB schema.
  window.loadCourses = async () => {
    const box=$('courseList');
    const {data,error}=await db.from('courses').select('*').order('created_at',{ascending:false});
    if(error){box.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return;}
    const courses=data||[];
    if(!courses.length){box.innerHTML='<div class="empty">अभी कोई course नहीं है। ऊपर Create Course से शुरू करें।</div>';return;}
    box.innerHTML=courses.map(c=>{
      const manager=canManage(c);
      return '<article class="item"><h3>'+esc(c.title)+'</h3><p>'+esc(c.class_name)+' · '+esc(c.subject)+'</p><p>'+esc(c.description||'')+'</p><div class="actions"><span class="small">'+(c.is_published?'Published':'Draft')+'</span><button onclick="openCourse(\''+c.id+'\')">'+(manager?'Manage Course':'Open Course')+'</button>'+(manager?'<button class="secondary" onclick="toggleCourse(\''+c.id+'\','+(!c.is_published)+')">'+(c.is_published?'Unpublish':'Publish Course')+'</button>':'')+'</div></article>';
    }).join('');
  };

  window.createCourse = async () => {
    const title=$('courseTitle').value.trim(),subject=$('courseSubject').value.trim();
    if(!title||!subject) return status('courseStatus','Title और subject जरूरी हैं।','error');
    const {data,error}=await db.from('courses').insert({
      title,class_name:$('courseClass').value,subject,
      description:$('courseDescription').value.trim(),created_by:profile.id
    }).select('id').single();
    if(error) return status('courseStatus',error.message,'error');
    $('courseTitle').value='';$('courseSubject').value='';$('courseDescription').value='';
    status('courseStatus','Course draft बन गया। अब इसमें chapters जोड़ें।','ok');
    await window.loadCourses();
    window.openCourse(data.id);
  };

  const oldToggleCourse=window.toggleCourse;
  window.toggleCourse=async (id,value)=>{
    const {error}=await db.from('courses').update({is_published:value,updated_at:new Date().toISOString()}).eq('id',id);
    if(error) alert(error.message); else await window.loadCourses();
  };

  // Keep the active Course tab refreshed after navigation.
  const oldShowTab=window.showTab;
  if(typeof oldShowTab==='function'){
    window.showTab=function(tab){
      oldShowTab(tab);
      if(tab==='courses') window.loadCourses();
    };
  }
})();