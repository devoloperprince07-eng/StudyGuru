/* StudyGuru Admin Editing tools - injected enhancement */
(function(){
  const $=id=>document.getElementById(id);
  const isAdmin=()=>profile&&profile.role==='admin';
  const escText=s=>String(s||'');
  function addButton(container,label,cls,handler){
    if(!container)return;const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls||'secondary';b.addEventListener('click',handler);container.appendChild(b);return b;
  }
  async function editCourse(id){
    if(!isAdmin())return alert('केवल Admin course edit कर सकता है।');
    const {data,error}=await db.from('courses').select('*').eq('id',id).single();if(error)return alert(error.message);
    const title=prompt('Course title:',data.title);if(title===null)return;
    const className=prompt('Class:',data.class_name);if(className===null)return;
    const subject=prompt('Course subject:',data.subject);if(subject===null)return;
    const description=prompt('Description:',data.description||'');if(description===null)return;
    if(!title.trim()||!subject.trim())return alert('Title और subject खाली नहीं हो सकते।');
    const {error:e}=await db.from('courses').update({title:title.trim(),class_name:className.trim(),subject:subject.trim(),description:description.trim(),updated_at:new Date().toISOString()}).eq('id',id);
    if(e)return alert(e.message);alert('Course update हो गया।');window.loadCourses();
  }
  function hookCourses(){
    const original=window.loadCourses;if(!original||original.__sgAdminEdit)return;
    const wrapped=async function(){await original.apply(this,arguments);if(!isAdmin())return;const {data,error}=await db.from('courses').select('id').order('created_at',{ascending:false});if(error)return;const cards=$('courseList')?.querySelectorAll('.item')||[];cards.forEach((card,i)=>{if(data[i])addButton(card.querySelector('.actions'),'Edit course','secondary',()=>editCourse(data[i].id))})};
    wrapped.__sgAdminEdit=true;window.loadCourses=wrapped;
  }
  async function editMaterial(id){
    if(!isAdmin())return alert('केवल Admin lecture edit कर सकता है।');
    const {data,error}=await db.from('learning_materials').select('*').eq('id',id).single();if(error)return alert(error.message);
    const title=prompt('Lecture/PDF title:',data.title);if(title===null)return;
    const description=prompt('Description:',data.description||'');if(description===null)return;
    let url=data.external_url||'';
    if(!data.storage_path){url=prompt('External URL (https://):',url)||'';if(url&&!/^https:\/\//i.test(url))return alert('URL https:// से शुरू होना चाहिए।')}
    if(!title.trim())return alert('Title खाली नहीं हो सकता।');
    const {error:e}=await db.from('learning_materials').update({title:title.trim(),description:description.trim(),external_url:url||null,updated_at:new Date().toISOString()}).eq('id',id);
    if(e)return alert(e.message);alert('Lecture/material edit हो गया।');if(window.loadAdminMaterials)await loadAdminMaterials();if(window.loadLibrary)await loadLibrary();
  }
  function hookMaterials(){
    const original=window.renderMaterials;if(!original||original.__sgAdminEdit)return;
    const wrapped=async function(box,items,admin){await original.apply(this,arguments);if(!admin||!isAdmin()||!box)return;box.querySelectorAll('.item').forEach((card,i)=>{const material=items[i];if(material)addButton(card.querySelector('.actions'),'Edit lecture','secondary',()=>editMaterial(material.id))})};
    wrapped.__sgAdminEdit=true;window.renderMaterials=wrapped;
  }
  async function editSubject(){
    if(!isAdmin())return alert('केवल Admin edit कर सकता है。');
    const id=$('manageSubject')?.value;if(!id)return alert('Subject चुनें।');
    const {data,error}=await db.from('subjects').select('*').eq('id',id).single();if(error)return alert(error.message);
    const name=prompt('Subject का नया नाम:',data.name);if(name===null)return;if(!name.trim())return alert('नाम खाली नहीं हो सकता।');
    const {error:e}=await db.from('subjects').update({name:name.trim()}).eq('id',id);if(e)return alert(e.message);alert('Subject update हो गया।');await loadManageSubjects();
  }
  async function editChapter(){
    if(!isAdmin())return alert('केवल Admin edit कर सकता है。');
    const id=$('uploadChapter')?.value;if(!id)return alert('Chapter चुनें।');
    const {data,error}=await db.from('chapters').select('*').eq('id',id).single();if(error)return alert(error.message);
    const name=prompt('Chapter का नया नाम:',data.name);if(name===null)return;if(!name.trim())return alert('नाम खाली नहीं हो सकता।');
    const {error:e}=await db.from('chapters').update({name:name.trim()}).eq('id',id);if(e)return alert(e.message);alert('Chapter update हो गया।');await loadManageChapters();
  }
  function hookStructure(){
    const subjectBtn=[...document.querySelectorAll('#adminAcademic button')].find(b=>b.textContent.trim()==='Subject जोड़ें');
    if(subjectBtn&&!document.getElementById('sgEditSubject')){const b=addButton(subjectBtn.parentElement,'Edit selected Subject','secondary',editSubject);if(b)b.id='sgEditSubject'}
    const chapterBtn=[...document.querySelectorAll('#adminAcademic button')].find(b=>b.textContent.trim()==='Chapter जोड़ें');
    if(chapterBtn&&!document.getElementById('sgEditChapter')){const b=addButton(chapterBtn.parentElement,'Edit selected Chapter','secondary',editChapter);if(b)b.id='sgEditChapter'}
  }
  async function editTestDetails(id){
    if(!isAdmin())return alert('केवल Admin test details edit कर सकता है।');
    const {data,error}=await db.from('practice_tests').select('*').eq('id',id).single();if(error)return alert(error.message);
    const title=prompt('Test title:',data.title);if(title===null)return;
    const className=prompt('Class:',data.class_name);if(className===null)return;
    const subject=prompt('Subject:',data.subject);if(subject===null)return;
    const description=prompt('Description:',data.description||'');if(description===null)return;
    const duration=prompt('Duration (minutes):',String(data.duration_minutes||15));if(duration===null)return;
    const minutes=Number(duration);if(!title.trim()||!subject.trim()||!Number.isInteger(minutes)||minutes<1||minutes>600)return alert('Title, subject और 1–600 मिनट की अवधि सही भरें।');
    const {error:e}=await db.from('practice_tests').update({title:title.trim(),class_name:className.trim(),subject:subject.trim(),description:description.trim(),duration_minutes:minutes,updated_at:new Date().toISOString()}).eq('id',id);
    if(e)return alert(e.message);alert('Test details update हो गईं।');loadTests();
  }
  async function loadQuestionList(testId){
    const box=$('questionList');if(!box)return;
    const {data,error}=await db.from('test_questions').select('id,question_text,options,sort_order,test_answer_keys(question_id,correct_option,explanation)').eq('test_id',testId).order('sort_order');
    if(error){box.textContent=error.message;return;}
    box.innerHTML='';
    (data||[]).forEach((q,i)=>{
      const card=document.createElement('article');card.className='item';
      const h=document.createElement('h4');h.textContent='Q'+(i+1)+': '+q.question_text;card.appendChild(h);
      const p=document.createElement('p');p.textContent=(q.options||[]).join(' · ');card.appendChild(p);
      const key=document.createElement('p');key.className='small';key.textContent='Correct option: '+((q.test_answer_keys?.[0]?.correct_option??0)+1);card.appendChild(key);
      const actions=document.createElement('div');actions.className='actions';card.appendChild(actions);
      addButton(actions,'Edit question','secondary',()=>editQuestion(q));
      addButton(actions,'Delete question','danger',()=>deleteQuestion(q.id,testId));
      box.appendChild(card);
    });
    if(!data?.length)box.innerHTML='<div class="empty">अभी प्रश्न नहीं हैं। नीचे Add Question से जोड़ें।</div>';
  }
  async function editQuestion(q){
    if(!canTeach()&&!isAdmin())return alert('Teacher/Admin access चाहिए।');
    const question=prompt('Question:',q.question_text);if(question===null)return;
    const options=[];for(let n=0;n<4;n++){const value=prompt('Option '+(n+1)+':',(q.options||[])[n]||'');if(value===null)return;options.push(value.trim())}
    const answer=prompt('Correct option number (1-4):',String((q.test_answer_keys?.[0]?.correct_option??0)+1));if(answer===null)return;
    const explanation=prompt('Explanation (optional):',q.test_answer_keys?.[0]?.explanation||'');if(explanation===null)return;
    const n=Number(answer);if(!question.trim()||options.some(x=>!x)||!Number.isInteger(n)||n<1||n>4)return alert('Question/options/answer सही भरें।');
    const {error}=await db.from('test_questions').update({question_text:question.trim(),options}).eq('id',q.id);if(error)return alert(error.message);
    const {error:keyError}=await db.from('test_answer_keys').update({correct_option:n-1,explanation:explanation.trim()||null}).eq('question_id',q.id);if(keyError)return alert('Question update हुआ, लेकिन Answer Key error: '+keyError.message);
    alert('Question और Answer Key update हो गई।');await loadQuestionList(activeTestId);loadTests();
  }
  async function deleteQuestion(id,testId){
    if(!confirm('इस question को delete करें?'))return;
    const {error:keyError}=await db.from('test_answer_keys').delete().eq('question_id',id);if(keyError)return alert(keyError.message);
    const {error}=await db.from('test_questions').delete().eq('id',id);if(error)return alert(error.message);
    await loadQuestionList(testId);loadTests();
  }
  function hookTests(){
    const originalLoad=window.loadTests;if(originalLoad&&!originalLoad.__sgAdminEdit){const wrapped=async function(){await originalLoad.apply(this,arguments);if(!isAdmin())return;const {data,error}=await db.from('practice_tests').select('id').order('created_at',{ascending:false});if(error)return;const cards=$('testList')?.querySelectorAll('.test-card')||[];cards.forEach((card,i)=>{if(data[i])addButton(card.querySelector('.actions'),'Edit test details','secondary',()=>editTestDetails(data[i].id))})};wrapped.__sgAdminEdit=true;window.loadTests=wrapped}
    const originalEdit=window.editTest;if(originalEdit&&!originalEdit.__sgAdminEdit){const wrapped=function(id){originalEdit.apply(this,arguments);activeTestId=id;loadQuestionList(id)};wrapped.__sgAdminEdit=true;window.editTest=wrapped}
    const originalAdd=window.addQuestion;if(originalAdd&&!originalAdd.__sgAdminEdit){const wrapped=async function(){await originalAdd.apply(this,arguments);if(activeTestId)await loadQuestionList(activeTestId)};wrapped.__sgAdminEdit=true;window.addQuestion=wrapped}
  }
  function install(){hookCourses();hookMaterials();hookTests();hookStructure()}
  document.addEventListener('DOMContentLoaded',install);
  setTimeout(install,1000);
  const observer=new MutationObserver(()=>hookStructure());
  const admin=document.getElementById('adminAcademic');if(admin)observer.observe(admin,{childList:true,subtree:true});
})();
