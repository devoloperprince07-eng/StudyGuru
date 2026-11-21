/* StudyGuru: Course -> Chapters -> PDF / Video / MCQ Tests */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const canManage = course => typeof profile !== 'undefined' && !!profile && (profile.role === 'admin' || course?.created_by === profile.id);
  let selectedCourse = null, selectedChapters = [], selectedCourseTest = null, schemaReady = false;

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
  .sg-course-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}
  .sg-course-nav button{background:#fff;color:#1F2633;border:1px solid #e7e9ed;border-radius:15px;padding:20px;text-align:left;min-height:94px}
  .sg-course-nav button strong{display:block;font-size:17px;margin:7px 0 3px}
  .sg-course-nav button span{font-size:12px;color:#6b7280;font-weight:500}
  .sg-course-back{background:#f0f1f3!important;color:#1F2633!important;margin:10px 0}
  .sg-course-video{width:100%;max-height:360px;border-radius:12px;background:#111;margin-top:10px}
  .sg-course-video{width:100%;max-height:360px;border-radius:12px;background:#111;margin-top:10px}
  @media(max-width:600px){.sg-course-grid{grid-template-columns:1fr}.sg-course-detail{margin-top:10px}}
  `;
  document.head.appendChild(style);

  const panel = $('coursesPanel');
  if (!panel || !$('courseList')) return;
  $('courseList').insertAdjacentHTML('beforebegin', '<div id="sgMigrationNotice" class="notice hidden">Chapter-wise content का सुरक्षित backend migration अभी लागू नहीं है। यह Preview केवल design review के लिए है; course upload/create और test changes फिलहाल disabled हैं ताकि Production database में preview data न लिखा जाए।</div>');
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
        <label>File (PDF अधिकतम 50 MB / MP4 या WebM Video अधिकतम 25 MB)</label><input id="sgResourceFile" class="field" type="file" accept=".pdf,application/pdf,video/mp4,video/webm">
        <label>या External URL (HTTPS)</label><input id="sgResourceUrl" class="field" type="url" placeholder="PDF / YouTube / Video URL">
        <label>Description</label><textarea id="sgResourceDescription" class="field" rows="2" maxlength="500"></textarea>
        <label style="display:flex;align-items:center;gap:8px"><input id="sgResourcePublish" type="checkbox" checked> Students को अभी दिखाएँ</label>
        <button id="sgResourceSave" onclick="uploadCourseResource()">Upload to Chapter</button><div id="sgResourceStatus" class="status"></div>
      </div>
      <div id="sgCourseTest" class="sg-course-form hidden">
        <h3 class="section-title" style="margin-top:0">Subject-wise MCQ Test बनाएँ</h3>
        <label>Subject</label><select id="sgTestChapter" class="field"></select>
        <label>Test Title</label><input id="sgTestTitle" class="field" maxlength="160" placeholder="जैसे Chapter 1 Practice Test">
        <label>Duration (minutes)</label><input id="sgTestDuration" class="field" type="number" min="1" max="240" value="15">
        <div class="sg-course-grid"><div><label>Marks for correct answer (+)</label><input id="sgMarksPerQuestion" class="field" type="number" min="1" max="100" value="4"></div><div><label>Negative marks for wrong answer (−)</label><input id="sgNegativeMarks" class="field" type="number" min="0" max="100" value="1"></div></div>
        <p class="sg-course-muted">Unanswered question: 0 marks. Default scheme: +4 / −1.</p>
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
          <hr style="border:0;border-top:1px solid #e7e9ed;margin:16px 0">
          <h3>Bulk Import — CSV / Excel</h3>
          <p class="sg-course-muted">एक Test में अधिकतम 2,000 प्रश्न। CSV या .xlsx फाइल में question, option1–option6 और correct_answer कॉलम रखें। कम-से-कम 4 विकल्प जरूरी हैं।</p>
          <div class="sg-course-actions"><button class="secondary" onclick="downloadStudyGuruQuestionTemplate()">Download CSV Template</button></div>
          <label>CSV / Excel File</label><input id="sgQuestionImportFile" class="field" type="file" accept=".csv,.xlsx,.xls,text/csv">
          <div class="sg-course-actions"><button onclick="importStudyGuruQuestions()">Import Questions</button></div>
          <div id="sgBulkImportStatus" class="status" aria-live="polite"></div>
        </div>
      </div>
      <div id="sgCourseHome" class="sg-course-nav">
        <button onclick="showCourseRoute('chapters')"><strong>📚 Chapters</strong><span>सभी Chapters और उनके Lectures / PDFs</span></button>
        <button onclick="showCourseRoute('tests')"><strong>📝 Tests</strong><span>सभी Chapter-wise MCQ Tests</span></button>
      </div>
      <div id="sgChapterIndex" class="hidden"><button class="plain sg-course-back" onclick="showCourseRoute('home')">← Course</button><h3>All Chapters</h3><div id="sgChapterCards" class="grid"></div></div>
      <div id="sgChapterContent" class="hidden"><button class="plain sg-course-back" onclick="showCourseRoute('chapters')">← All Chapters</button><div id="sgActiveChapterTitle"></div><div class="sg-course-nav">
        <button onclick="showChapterResourceType('video')"><strong>▶ Lecture</strong><span>इस Chapter के सभी Lectures</span></button>
        <button onclick="showChapterResourceType('pdf')"><strong>▤ PDF</strong><span>इस Chapter की सभी PDFs</span></button>
      </div><div id="sgChapterResources"></div></div>
      <div id="sgCourseTests" class="hidden"><button class="plain sg-course-back" onclick="showCourseRoute('home')">← Course</button><h3>All Tests</h3><div id="sgCourseTestCards" class="grid"></div></div>
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
    const {data:course,error} = await db.from('courses').select('*').eq('id',id).single();
    if(error){$('sgCourseBanner').textContent=error.message;return;}
    selectedCourse = course;
    const manager = canManage(course);
    $('sgCourseState').textContent = course.is_published ? 'Published course' : 'Draft — केवल course owner/admin';
    $('sgCourseBanner').innerHTML = '<h2>'+esc(course.title)+'</h2><p>'+esc(course.class_name)+' · '+esc(course.subject)+'</p><p>'+esc(course.description||'')+'</p>';
    ['sgCourseManager','sgCourseUpload','sgCourseTest'].forEach(x => $(x).classList.add('hidden'));
    let chapterQuery = db.from('course_chapters').select('*').eq('course_id',id).order('sort_order').order('created_at');
    if(!manager) chapterQuery = chapterQuery.eq('is_published',true);
    const {data:chapters,error:chapterError} = await chapterQuery;
    if(chapterError){$('sgCourseHome').classList.add('hidden');$('sgChapterIndex').classList.remove('hidden');$('sgChapterCards').innerHTML='<div class="notice">Chapters लोड नहीं हो पाए: '+esc(chapterError.message)+'</div>';return;}
    selectedChapters = chapters || [];
    const opts = selectedChapters.map(ch=>'<option value="'+ch.id+'">'+esc(ch.title)+'</option>').join('');
    $('sgResourceChapter').innerHTML=opts || '<option value="">पहले Chapter जोड़ें</option>';
    $('sgTestChapter').innerHTML=opts || '<option value="">पहले Chapter जोड़ें</option>';
    const ids = selectedChapters.map(ch=>ch.id);
    let resources=[],tests=[];
    if(ids.length){
      const [resourceResult,testResult] = await Promise.all([
        db.from('course_chapter_resources').select('*').in('chapter_id',ids).order('created_at'),
        db.from('practice_tests').select('id,title,description,duration_minutes,is_published,course_chapter_id,marks_per_question,negative_marks').in('course_chapter_id',ids).order('created_at')
      ]);
      if(resourceResult.error || testResult.error){
        $('sgCourseHome').classList.add('hidden');$('sgChapterIndex').classList.remove('hidden');
        $('sgChapterCards').innerHTML='<div class="notice">Course content लोड नहीं हुआ। '+esc(resourceResult.error?.message||testResult.error?.message||'Backend error')+'</div>';return;
      }
      resources=resourceResult.data||[];
      tests=testResult.data||[];
    }
    courseResources=manager?resources:resources.filter(r=>r.is_published);
    courseTests=manager?tests:tests.filter(t=>t.is_published);
    activeChapter=null;
    $('sgChapterCards').innerHTML=selectedChapters.map(ch=>{
      const n=courseResources.filter(r=>r.chapter_id===ch.id).length;
      const t=courseTests.filter(test=>test.course_chapter_id===ch.id).length;
      return '<article class="item"><h3>'+esc(ch.title)+'</h3><p>'+esc(ch.description||'')+'</p><p>'+n+' learning materials · '+t+' tests</p><button onclick="openCourseChapter(\''+ch.id+'\')">Open Chapter</button></article>';
    }).join('') || '<div class="empty">अभी कोई Chapter नहीं है।</div>';
    $('sgCourseTestCards').innerHTML=courseTests.map(t=>{
      const ch=selectedChapters.find(x=>x.id===t.course_chapter_id);
      return '<article class="item"><span class="sg-course-chip">MCQ TEST</span><h3>'+esc(t.title)+'</h3><p>'+esc(ch?.title||'Chapter')+' · '+esc(t.duration_minutes)+' minutes · +'+esc(t.marks_per_question??4)+' / −'+esc(t.negative_marks??1)+'</p><p>'+esc(t.description||'')+'</p><div class="sg-course-actions"><button onclick="startCourseChapterTest(\''+t.id+'\')">Start Test</button>'+(manager?'<button class="secondary" onclick="editCourseTest(\''+t.id+'\')">Add Questions</button><button class="secondary" onclick="toggleCourseTest(\''+t.id+'\','+(!t.is_published)+')">'+(t.is_published?'Unpublish':'Publish')+'</button>':'')+'</div></article>';
    }).join('') || '<div class="empty">अभी कोई Test उपलब्ध नहीं है।</div>';
    $('sgCourseHome').classList.remove('hidden');
    $('sgChapterIndex').classList.add('hidden');
    $('sgChapterContent').classList.add('hidden');
    $('sgCourseTests').classList.add('hidden');
    courseRoute='home';
  };

  window.showCourseRoute = route => {
    courseRoute=route;
    $('sgCourseHome').classList.toggle('hidden',route!=='home');
    $('sgChapterIndex').classList.toggle('hidden',route!=='chapters');
    $('sgChapterContent').classList.toggle('hidden',route!=='chapter');
    $('sgCourseTests').classList.toggle('hidden',route!=='tests');
    ['sgCourseManager','sgCourseUpload','sgCourseTest'].forEach(x => $(x).classList.add('hidden'));
    if(!canManage(selectedCourse)) return;
    if(route==='chapters') $('sgCourseManager').classList.remove('hidden');
    if(route==='chapter') $('sgCourseUpload').classList.remove('hidden');
    if(route==='tests') $('sgCourseTest').classList.remove('hidden');
  };

  window.openCourseChapter = chapterId => {
    activeChapter=selectedChapters.find(ch=>ch.id===chapterId);
    if(!activeChapter) return;
    $('sgActiveChapterTitle').innerHTML='<h3>'+esc(activeChapter.title)+'</h3><p class="sg-course-muted">'+esc(activeChapter.description||'')+'</p>';
    $('sgResourceChapter').value=chapterId;
    showCourseRoute('chapter');
    $('sgChapterResources').innerHTML='<div class="notice">ऊपर Lecture या PDF चुनें।</div>';
  };

  window.showChapterResourceType = type => {
    if(!activeChapter || !['video','pdf'].includes(type)) return;
    const files=courseResources.filter(r=>r.chapter_id===activeChapter.id && r.resource_type===type);
    if(!files.length){$('sgChapterResources').innerHTML='<div class="empty">इस Chapter में अभी '+(type==='video'?'कोई Lecture':'कोई PDF')+' उपलब्ध नहीं है।</div>';return;}
    $('sgChapterResources').innerHTML=files.map(r=>{
      const tag=type==='pdf'?'PDF':'LECTURE';
      return '<article class="sg-course-resource"><span class="sg-course-chip">'+tag+'</span><h4>'+esc(r.title)+'</h4><p>'+esc(r.description||'')+'</p><div id="sgResourceOpen_'+r.id+'"><span class="sg-course-muted">File link लोड हो रहा है…</span></div>'+(canManage(selectedCourse)?'<div class="sg-course-actions"><button class="secondary" onclick="toggleCourseResource(\''+r.id+'\','+(!r.is_published)+')">'+(r.is_published?'Hide':'Publish')+'</button><button class="danger" onclick="deleteCourseResource(\''+r.id+'\')">Delete</button></div>':'')+'</article>';
    }).join('');
    files.forEach(async r=>{
      let url=r.external_url||'';
      if(!url && r.storage_path){const {data,error}=await db.storage.from(r.storage_bucket).createSignedUrl(r.storage_path,3600);if(error){const h=$('sgResourceOpen_'+r.id);if(h)h.textContent='File access error: '+error.message;return;}url=data?.signedUrl||'';}
      const holder=$('sgResourceOpen_'+r.id);if(!holder)return;
      const video=type==='video' && url && /\.(mp4|webm)(\?|$)/i.test(url);
      const youtube=type==='video' && url && /youtu(?:\.be|be\.com)/i.test(url);
      holder.innerHTML=video?'<video class="sg-course-video" controls playsinline src="'+esc(url)+'"></video>':youtube?'<p><a href="'+esc(url)+'" target="_blank" rel="noopener">Lecture खोलें</a></p>':url?'<button onclick="window.open('+JSON.stringify(url)+',\'_blank\',\'noopener\')">'+(type==='pdf'?'PDF खोलें':'Lecture खोलें')+'</button>':'<span class="sg-course-muted">File link unavailable</span>';
    });
  };

  window.addCourseChapter = async () => {
    if(!schemaReady || !selectedCourse || !canManage(selectedCourse)) return;
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
    if(!schemaReady || !selectedCourse || !canManage(selectedCourse)) return;
    const chapterId=$('sgResourceChapter').value,title=$('sgResourceTitle').value.trim();
    const type=$('sgResourceType').value,file=$('sgResourceFile').files[0],url=$('sgResourceUrl').value.trim();
    if(!chapterId || !title) return status('sgResourceStatus','Chapter और title जरूरी हैं।','error');
    if(!file && !url) return status('sgResourceStatus','PDF/Video file चुनें या HTTPS URL दें।','error');
    const maxBytes=type==='video'?25*1024*1024:50*1024*1024;
    if(file && file.size>maxBytes) return status('sgResourceStatus',type==='video'?'Video 25 MB से बड़ी है।':'PDF 50 MB से बड़ी है।','error');
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
    if(!schemaReady || !selectedCourse || !canManage(selectedCourse)) return;
    const chapter=$('sgTestChapter').value,title=$('sgTestTitle').value.trim();
    const duration=Number($('sgTestDuration').value),marks=Number($('sgMarksPerQuestion').value),negative=Number($('sgNegativeMarks').value);
    if(!chapter||!title||!Number.isInteger(duration)||duration<1||duration>240) return status('sgTestStatus','Chapter, title और 1–240 मिनट का समय भरें।','error');
    if(!Number.isInteger(marks)||marks<1||marks>100||!Number.isInteger(negative)||negative<0||negative>marks) return status('sgTestStatus','Marks 1–100 और negative marks 0 से marks तक रखें।','error');
    const {data,error}=await db.from('practice_tests').insert({
      title,class_name:selectedCourse.class_name,subject:selectedCourse.subject,
      description:$('sgTestDescription').value.trim(),duration_minutes:duration,
      marks_per_question:marks,negative_marks:negative,
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
    const {count:existingCount,error:countError}=await db.from('test_questions').select('id',{count:'exact',head:true}).eq('test_id',selectedCourseTest);
    if(countError) return status('sgQuestionStatus',countError.message,'error');
    if(existingCount>=2000) return status('sgQuestionStatus','एक Test में अधिकतम 2,000 Questions हो सकते हैं।','error');
    const text=$('sgQuestionText').value.trim();
    const options=[0,1,2,3].map(i=>$('sgOption'+i).value.trim());
    if(!text||options.some(x=>!x)) return status('sgQuestionStatus','Question और चारों options भरें।','error');
    const {data,error}=await db.from('test_questions').insert({test_id:selectedCourseTest,question_text:text,options}).select('id').single();
    if(error) return status('sgQuestionStatus',error.message,'error');
    const {error:keyError}=await db.from('test_answer_keys').insert({question_id:data.id,correct_option:Number($('sgCorrectOption').value)});
    if(keyError){await db.from('test_questions').delete().eq('id',data.id);return status('sgQuestionStatus',keyError.message,'error');}
    $('sgQuestionText').value='';[0,1,2,3].forEach(i=>$('sgOption'+i).value='');
    status('sgQuestionStatus','Question save हो गया।','ok');
  };


  function sgParseCSV(text){
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i],next=text[i+1];
      if(ch==='"'&&quoted&&next==='"'){cell+='"';i++;}
      else if(ch==='"') quoted=!quoted;
      else if(ch===','&&!quoted){row.push(cell);cell='';}
      else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
      else cell+=ch;
    }
    row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
    if(quoted) throw new Error('CSV में quotes सही तरह बंद नहीं हैं।');
    const headers=(rows.shift()||[]).map(h=>h.trim().toLowerCase().replace(/^\uFEFF/,''));
    return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
  }
  function sgQuestionRowsFromRecords(records){
    return records.map((r,i)=>{
      const question=String(r.question||r.question_text||'').trim();
      const options=[];
      for(let n=1;n<=6;n++){const v=String(r['option'+n]||r['option_'+n]||'').trim();if(v)options.push(v);}
      if(Array.isArray(r.options)) options.splice(0,options.length,...r.options.map(v=>String(v).trim()).filter(Boolean));
      const raw=String(r.correct_answer??r.correct_option??r.answer??'').trim().toUpperCase();
      const answer=/^[A-F]$/.test(raw)?raw.charCodeAt(0)-65:(/^\d+$/.test(raw)?Number(raw)-1:-1);
      if(!question) throw new Error('Row '+(i+2)+': question खाली है।');
      if(options.length<4||options.length>6) throw new Error('Row '+(i+2)+': 4 से 6 options जरूरी हैं।');
      if(answer<0||answer>=options.length) throw new Error('Row '+(i+2)+': correct_answer A-F या 1-6 होना चाहिए।');
      return {question_text:question,options,correct_option:answer,sort_order:i};
    });
  }
  window.downloadStudyGuruQuestionTemplate=()=>{
    const csv='question,option1,option2,option3,option4,option5,option6,correct_answer\n"भारत की राजधानी क्या है?","दिल्ली","मुंबई","पटना","जयपुर","","","A"\n';
    const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='studyguru-2000-mcq-template.csv';a.click();URL.revokeObjectURL(url);
  };
  window.importStudyGuruQuestions=async()=>{
    if(!selectedCourseTest)return status('sgBulkImportStatus','पहले Test चुनें।','error');
    const file=$('sgQuestionImportFile')?.files?.[0];if(!file)return status('sgBulkImportStatus','CSV या Excel file चुनें।','error');
    if(file.size>10*1024*1024)return status('sgBulkImportStatus','File अधिकतम 10 MB हो सकती है।','error');
    const statusEl=$('sgBulkImportStatus');
    const button=statusEl?.previousElementSibling?.querySelector('button');
    if(button)button.disabled=true;
    try{
      let records;
      const name=file.name.toLowerCase();
      if(name.endsWith('.csv')) records=sgParseCSV(await file.text());
      else{
        if(!window.XLSX){
          await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('Excel reader load नहीं हुआ। CSV Template इस्तेमाल करें।'));document.head.appendChild(s);});
        }
        const workbook=XLSX.read(await file.arrayBuffer(),{type:'array'});
        records=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{defval:''});
      }
      const rows=sgQuestionRowsFromRecords(records);
      if(!rows.length)throw new Error('File में कोई प्रश्न नहीं मिला।');
      const {count,error:countError}=await db.from('test_questions').select('id',{count:'exact',head:true}).eq('test_id',selectedCourseTest);
      if(countError)throw countError;
      if(count+rows.length>2000)throw new Error('इस Test में अभी '+count+' प्रश्न हैं। '+(2000-count)+' और प्रश्न ही जोड़े जा सकते हैं।');
      let inserted=0;
      for(let offset=0;offset<rows.length;offset+=100){
        const chunk=rows.slice(offset,offset+100);
        const {data,error}=await db.from('test_questions').insert(chunk.map(({correct_option,...q})=>({...q,test_id:selectedCourseTest}))).select('id');
        if(error)throw error;
        const keys=data.map((q,j)=>({question_id:q.id,correct_option:chunk[j].correct_option}));
        const {error:keyError}=await db.from('test_answer_keys').insert(keys);
        if(keyError)throw keyError;
        inserted+=chunk.length;
        statusEl.textContent='Importing… '+inserted+' / '+rows.length;
      }
      status('sgBulkImportStatus',inserted+' Questions और Answer Keys Import हो गईं।','ok');
      $('sgQuestionImportFile').value='';
    }catch(e){status('sgBulkImportStatus',e.message||'Import failed','error');}
    finally{if(button)button.disabled=false;}
  };

  window.editCourseTest = async id => {
    selectedCourseTest=id;
    $('sgQuestionBuilder').classList.remove('hidden');
    status('sgTestStatus','Selected test में questions जोड़ सकते हैं।','ok');
    $('sgQuestionBuilder').scrollIntoView({behavior:'smooth',block:'center'});
  };

  window.publishCourseTest = async () => {
    if(!selectedCourseTest) return;
    const {data:questionRows,error}=await db.from('test_questions').select('id').eq('test_id',selectedCourseTest);
    if(error) return status('sgQuestionStatus',error.message,'error');
    if(!questionRows?.length) return status('sgQuestionStatus','Publish करने से पहले कम से कम एक question जोड़ें।','error');
    const questionIds=questionRows.map(q=>q.id);
    const {count:keyCount,error:keyError}=await db.from('test_answer_keys').select('question_id',{count:'exact',head:true}).in('question_id',questionIds);
    if(keyError) return status('sgQuestionStatus',keyError.message,'error');
    if(keyCount!==questionRows.length) return status('sgQuestionStatus','हर Question की सही Answer Key जोड़ने के बाद ही Test publish होगा।','error');
    const {error:publishError}=await db.from('practice_tests').update({is_published:true}).eq('id',selectedCourseTest);
    if(publishError) return status('sgQuestionStatus',publishError.message,'error');
    status('sgQuestionStatus','Test publish हो गया।','ok');
    const id=selectedCourse.id;
    selectedCourseTest=null;
    await openCourse(id);
  };

  window.startCourseChapterTest = async id => {
    if(typeof window.showTab === 'function') window.showTab('tests');
    await window.startDbTest(id);
  };

  window.toggleCourseTest = async (id,value) => {
    const {error}=await db.from('practice_tests').update({is_published:value}).eq('id',id);
    if(error) return alert(error.message);
    if(selectedCourse) await openCourse(selectedCourse.id);
  };

  // Replace course creation/list rendering while retaining the existing form and DB schema.
  window.loadCourses = async () => {
    const box=$('courseList');
    const {error:schemaError}=await db.from('course_chapters').select('id').limit(1);
    schemaReady = !schemaError;
    $('sgMigrationNotice')?.classList.toggle('hidden',schemaReady);
    if($('courseCreate')){
      $('courseCreate').querySelectorAll('input,select,textarea,button').forEach(el=>{el.disabled=!schemaReady;});
    }
    const {data,error}=await db.from('courses').select('*').order('created_at',{ascending:false});
    if(error){box.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return;}
    const courses=data||[];
    if(!courses.length){box.innerHTML='<div class="empty">अभी कोई course नहीं है। ऊपर Create Course से शुरू करें।</div>';return;}
    box.innerHTML=courses.map(c=>{
      const manager=canManage(c);
      return '<article class="item"><h3>'+esc(c.title)+'</h3><p>'+esc(c.class_name)+' · '+esc(c.subject)+'</p><p>'+esc(c.description||'')+'</p><div class="actions"><span class="small">'+(c.is_published?'Published':'Draft')+'</span><button onclick="openCourse(\''+c.id+'\')">'+(manager?'Manage Course':'Open Course')+'</button>'+(manager?'<button class="secondary" onclick="toggleCourse(\''+c.id+'\','+(!c.is_published)+')">'+(c.is_published?'Unpublish':'Publish Course')+'</button>':'')+'</div></article>';
    }).join('');
    if(!schemaReady) box.querySelectorAll('button[onclick^="toggleCourse"]').forEach(btn=>btn.disabled=true);
  };

  window.createCourse = async () => {
    if(!schemaReady){status('courseStatus','Backend migration pending है; Preview से course create disabled है।','error');return;}
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

  // Subject-first course navigation and admin-only course deletion.
  let selectedSubjects = [], selectedSubject = null;
  const subjectStyles=document.createElement('style');
  subjectStyles.textContent='.sg-subject-card{border:1px solid #eee8e3;border-radius:14px;padding:16px;background:#fff}.sg-subject-card h3{margin:0 0 7px}.sg-subject-section{margin:16px 0}.sg-subject-section h3{margin:0 0 10px}.sg-subject-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}';
  document.head.appendChild(subjectStyles);
  $('sgCourseBanner').insertAdjacentHTML('afterend', '<section id="sgCourseSubjects" class="sg-course-form"><div class="topline"><h3 style="margin:0">Subjects</h3><span class="sg-course-muted">Course के विषय</span></div><div id="sgSubjectCards" class="grid"></div><div id="sgAddSubjectBox" class="sg-subject-actions hidden"><input id="sgNewSubjectName" class="field" maxlength="120" placeholder="नया Subject नाम" style="max-width:340px"><button onclick="addCourseSubject()">+ Add Subject</button></div><div id="sgSubjectStatus" class="status"></div></section><section id="sgSubjectDetail" class="sg-course-form hidden"><button class="plain sg-course-back" onclick="backToCourseSubjects()">← सभी Subjects</button><h3 id="sgSubjectHeading"></h3><div class="sg-subject-section"><div class="topline"><h3>Chapters</h3></div><div id="sgSubjectChapterCards" class="grid"></div></div><div class="sg-subject-section"><div class="topline"><h3>Tests</h3></div><div id="sgSubjectTestCards" class="grid"></div></div></section>');
  window.backToCourseSubjects=()=>{$('sgSubjectDetail').classList.add('hidden');$('sgCourseSubjects').classList.remove('hidden');['sgCourseManager','sgCourseUpload','sgCourseTest','sgChapterContent','sgChapterIndex','sgCourseHome','sgCourseTests'].forEach(id=>$(id)?.classList.add('hidden'));};
  window.addCourseSubject=async()=>{
    if(!selectedCourse||!canManage(selectedCourse))return;
    const name=$('sgNewSubjectName').value.trim();
    if(!name)return status('sgSubjectStatus','Subject का नाम लिखें।','error');
    const {error}=await db.from('course_subjects').insert({course_id:selectedCourse.id,name,sort_order:selectedSubjects.length});
    if(error)return status('sgSubjectStatus',error.message,'error');
    $('sgNewSubjectName').value='';status('sgSubjectStatus','Subject जोड़ दिया गया।','ok');await openCourse(selectedCourse.id);
  };
  window.openCourse=async id=>{
    $('courseList').classList.add('hidden');$('sgCourseDetail').classList.remove('hidden');
    $('sgCourseBanner').innerHTML='<h2>Course लोड हो रहा है…</h2>';
    const {data:course,error}=await db.from('courses').select('*').eq('id',id).single();
    if(error){$('sgCourseBanner').textContent=error.message;return;}
    selectedCourse=course;const manager=canManage(course);
    $('sgCourseState').textContent=course.is_published?'Published course':'Draft — केवल owner/admin';
    $('sgCourseBanner').innerHTML='<h2>'+esc(course.title)+'</h2><p>'+esc(course.class_name)+' · '+esc(course.subject)+'</p><p>'+esc(course.description||'')+'</p>';
    ['sgCourseManager','sgCourseUpload','sgCourseTest','sgChapterContent','sgChapterIndex','sgCourseHome','sgCourseTests','sgSubjectDetail'].forEach(id=>$(id)?.classList.add('hidden'));
    $('sgCourseSubjects').classList.remove('hidden');
    $('sgAddSubjectBox').classList.toggle('hidden',!manager);
    const {data:subs,error:subError}=await db.from('course_subjects').select('*').eq('course_id',id).order('sort_order').order('name');
    if(subError){$('sgSubjectCards').innerHTML='<div class="notice">'+esc(subError.message)+'</div>';return;}
    selectedSubjects=subs||[];
    $('sgSubjectCards').innerHTML=selectedSubjects.map(s=>'<article class="sg-subject-card"><h3>'+esc(s.name)+'</h3><p class="sg-course-muted">इस Subject के Chapters और Tests</p><button onclick="openCourseSubject(\''+s.id+'\')">Open Subject</button></article>').join('')||'<div class="empty">अभी कोई Subject नहीं है। Admin/Teacher नया Subject जोड़ सकते हैं।</div>';
  };
  window.openCourseSubject=async subjectId=>{
    selectedSubject=selectedSubjects.find(s=>s.id===subjectId);if(!selectedSubject||!selectedCourse)return;
    $('sgCourseSubjects').classList.add('hidden');$('sgSubjectDetail').classList.remove('hidden');
    $('sgSubjectHeading').textContent=selectedSubject.name;
    const manager=canManage(selectedCourse);
    const [chRes,testRes]=await Promise.all([
      db.from('course_chapters').select('*').eq('course_id',selectedCourse.id).eq('course_subject_id',subjectId).order('sort_order').order('created_at'),
      db.from('practice_tests').select('id,title,description,duration_minutes,is_published,course_subject_id,marks_per_question,negative_marks').eq('course_id',selectedCourse.id).eq('course_subject_id',subjectId).order('created_at')
    ]);
    if(chRes.error||testRes.error){$('sgSubjectChapterCards').innerHTML='<div class="notice">'+esc(chRes.error?.message||testRes.error?.message)+'</div>';return;}
    selectedChapters=chRes.data||[];
    let visibleChapters=manager?selectedChapters:selectedChapters.filter(ch=>ch.is_published);
    const chIds=visibleChapters.map(ch=>ch.id);
    let resources=[];
    if(chIds.length){const rr=await db.from('course_chapter_resources').select('*').in('chapter_id',chIds).order('created_at');if(rr.error){$('sgSubjectChapterCards').innerHTML='<div class="notice">'+esc(rr.error.message)+'</div>';return;}resources=rr.data||[];}
    courseResources=manager?resources:resources.filter(r=>r.is_published);
    courseTests=manager?(testRes.data||[]):(testRes.data||[]).filter(t=>t.is_published);
    $('sgSubjectChapterCards').innerHTML=visibleChapters.map(ch=>'<article class="item"><h3>'+esc(ch.title)+'</h3><p>'+esc(ch.description||'')+'</p><button onclick="openCourseChapter(\''+ch.id+'\')">Open Chapter</button></article>').join('')||'<div class="empty">इस Subject में अभी Chapters नहीं हैं।</div>';
    $('sgSubjectTestCards').innerHTML=courseTests.map(t=>'<article class="item"><span class="sg-course-chip">SUBJECT TEST</span><h3>'+esc(t.title)+'</h3><p>'+Number(t.duration_minutes)+' min · +'+Number(t.marks_per_question||4)+' / −'+Number(t.negative_marks||1)+'</p><p>'+esc(t.description||'')+'</p><div class="sg-course-actions"><button onclick="startCourseChapterTest(\''+t.id+'\')">Start Test</button>'+(manager?'<button class="secondary" onclick="editCourseTest(\''+t.id+'\')">Add Questions</button><button class="secondary" onclick="toggleCourseTest(\''+t.id+'\','+(!t.is_published)+')">'+(t.is_published?'Unpublish':'Publish')+'</button>':'')+'</div></article>').join('')||'<div class="empty">इस Subject में अभी कोई Test नहीं है।</div>';
    ['sgCourseManager','sgCourseTest','sgCourseUpload'].forEach(id=>$(id).classList.add('hidden'));
    if(manager){$('sgCourseManager').classList.remove('hidden');$('sgCourseTest').classList.remove('hidden');$('sgCourseUpload').classList.add('hidden');}
    $('sgTestChapter').innerHTML='<option value="'+subjectId+'">'+esc(selectedSubject.name)+'</option>';
    $('sgTestChapter').value=subjectId;
  };
  window.showCourseRoute=route=>{
    if(route==='chapter'){['sgCourseSubjects','sgSubjectDetail'].forEach(id=>$(id).classList.add('hidden'));$('sgChapterContent').classList.remove('hidden');if(canManage(selectedCourse))$('sgCourseUpload').classList.remove('hidden');return;}
    if(route==='chapters'){backToCourseSubjects();return;}
    if(route==='home'){backToCourseSubjects();return;}
  };
  window.openCourseChapter=chapterId=>{
    activeChapter=selectedChapters.find(ch=>ch.id===chapterId);if(!activeChapter)return;
    $('sgActiveChapterTitle').innerHTML='<h3>'+esc(activeChapter.title)+'</h3><p class="sg-course-muted">'+esc(activeChapter.description||'')+'</p>';
    $('sgResourceChapter').value=chapterId;
    $('sgSubjectDetail').classList.add('hidden');$('sgChapterContent').classList.remove('hidden');
    if(canManage(selectedCourse))$('sgCourseUpload').classList.remove('hidden');
    $('sgChapterResources').innerHTML='<div class="notice">ऊपर Lecture या PDF चुनें।</div>';
  };
  window.addCourseChapter=async()=>{
    if(!schemaReady||!selectedCourse||!selectedSubject||!canManage(selectedCourse))return;
    const title=$('sgChapterTitle').value.trim();if(!title)return status('sgChapterStatus','Chapter का नाम लिखें।','error');
    const {error}=await db.from('course_chapters').insert({course_id:selectedCourse.id,course_subject_id:selectedSubject.id,title,description:$('sgChapterDescription').value.trim(),sort_order:selectedChapters.length,is_published:true});
    if(error)return status('sgChapterStatus',error.message,'error');
    $('sgChapterTitle').value='';$('sgChapterDescription').value='';status('sgChapterStatus','Chapter बन गया।','ok');await openCourseSubject(selectedSubject.id);
  };
  window.createCourseTest=async()=>{
    if(!schemaReady||!selectedCourse||!selectedSubject||!canManage(selectedCourse))return;
    const title=$('sgTestTitle').value.trim(),duration=Number($('sgTestDuration').value),marks=Number($('sgMarksPerQuestion').value),negative=Number($('sgNegativeMarks').value);
    if(!title||!Number.isInteger(duration)||duration<1||duration>240)return status('sgTestStatus','Test title और 1–240 मिनट का समय भरें।','error');
    if(!Number.isInteger(marks)||marks<1||marks>100||!Number.isInteger(negative)||negative<0||negative>marks)return status('sgTestStatus','Marks 1–100 और negative marks 0 से marks तक रखें।','error');
    const {data,error}=await db.from('practice_tests').insert({title,class_name:selectedCourse.class_name,subject:selectedSubject.name,description:$('sgTestDescription').value.trim(),duration_minutes:duration,marks_per_question:marks,negative_marks:negative,course_id:selectedCourse.id,course_subject_id:selectedSubject.id,course_chapter_id:null,created_by:profile.id,is_published:false}).select('id').single();
    if(error)return status('sgTestStatus',error.message,'error');
    selectedCourseTest=data.id;$('sgQuestionBuilder').classList.remove('hidden');status('sgTestStatus','Subject Test draft बन गया। अब Questions जोड़ें।','ok');
  };
  window.deleteCourse=async id=>{
    if(profile?.role!=='admin')return alert('केवल Admin Course delete कर सकता है।');
    if(!confirm('इस Course के Subjects, Chapters, Lectures, PDFs, Tests और Test Attempts भी delete होंगे। यह कार्रवाई वापस नहीं होगी। क्या जारी रखें?'))return;
    const {data:chapters,error:chapterError}=await db.from('course_chapters').select('id').eq('course_id',id);
    if(chapterError)return alert(chapterError.message);
    const ids=(chapters||[]).map(c=>c.id);
    if(ids.length){
      const {data:resources,error}=await db.from('course_chapter_resources').select('storage_bucket,storage_path').in('chapter_id',ids);
      if(error)return alert(error.message);
      for(const bucket of ['study-pdfs','study-videos']){
        const paths=(resources||[]).filter(r=>r.storage_bucket===bucket&&r.storage_path).map(r=>r.storage_path);
        for(let i=0;i<paths.length;i+=100){const {error:storageError}=await db.storage.from(bucket).remove(paths.slice(i,i+100));if(storageError)return alert('Storage files delete नहीं हुए: '+storageError.message+'। Course सुरक्षित रखा गया है।');}
      }
    }
    const {error}=await db.from('courses').delete().eq('id',id);
    if(error)return alert(error.message);
    closeCourseDetail();await loadCourses();alert('Course और उसका संबंधित content delete हो गया।');
  };
  const originalLoadCourses=window.loadCourses;
  window.loadCourses=async()=>{
    await originalLoadCourses();
    const {data,error}=await db.from('courses').select('id,created_by').order('created_at',{ascending:false});
    if(error)return;
    document.querySelectorAll('#courseList article.item').forEach((card,index)=>{
      const course=data[index];if(!course||profile?.role!=='admin')return;
      const actions=card.querySelector('.actions');if(actions&&!actions.querySelector('.sg-delete-course')){const btn=document.createElement('button');btn.className='danger sg-delete-course';btn.textContent='Delete Course';btn.onclick=()=>deleteCourse(course.id);actions.appendChild(btn);}
    });
  };
  window.createCourse=async()=>{
    if(!schemaReady)return status('courseStatus','Course structure migration अभी उपलब्ध नहीं है।','error');
    const title=$('courseTitle').value.trim(),subject=$('courseSubject').value.trim();
    if(!title||!subject)return status('courseStatus','Course title और पहला Subject जरूरी हैं।','error');
    const {data:course,error}=await db.from('courses').insert({title,class_name:$('courseClass').value,subject,description:$('courseDescription').value.trim(),created_by:profile.id}).select('id').single();
    if(error)return status('courseStatus',error.message,'error');
    const {error:subjectError}=await db.from('course_subjects').insert({course_id:course.id,name:subject,sort_order:0});
    if(subjectError){await db.from('courses').delete().eq('id',course.id);return status('courseStatus','Course subject save नहीं हुआ: '+subjectError.message,'error');}
    $('courseTitle').value='';$('courseSubject').value='';$('courseDescription').value='';
    status('courseStatus','Course और पहला Subject बन गया।','ok');
    await loadCourses();await openCourse(course.id);
  };
  const originalLoadTests=window.loadTests;
  window.loadTests=async()=>{
    const {data,error}=await db.from('practice_tests').select('id,title,description,class_name,subject,duration_minutes,is_published,created_by,marks_per_question,negative_marks').is('course_id',null).order('created_at',{ascending:false});
    const box=$('testList');if(error){box.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return;}
    box.innerHTML=(data||[]).length?data.map(t=>'<article class="item"><h3>'+esc(t.title)+'</h3><p>'+esc(t.class_name)+' · '+esc(t.subject)+' · '+t.duration_minutes+' min</p><p>Marking: +'+Number(t.marks_per_question??4)+' correct · −'+Number(t.negative_marks??1)+' wrong</p><p>'+esc(t.description||'')+'</p><div class="actions"><button onclick="startDbTest(\''+t.id+'\')">Start test</button>'+(canTeach()&&(t.created_by===profile.id||profile.role==='admin')?'<button class="secondary" onclick="editTest(\''+t.id+'\')">Add questions</button>':'')+(profile.role==='admin'?'<button class="secondary" onclick="toggleTest(\''+t.id+'\','+(!t.is_published)+')">'+(t.is_published?'Unpublish':'Publish')+'</button>':'')+'</div></article>').join(''):'<div class="empty">अभी कोई अलग Test Course उपलब्ध नहीं है।</div>';
    loadAttempts();
  };

})();