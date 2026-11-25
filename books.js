// StudyGuru Books PDF Library
async function loadBookFilterSubjects(){
  const classId=$('bookClassFilter').value;
  let q=db.from('subjects').select('id,name').eq('is_active',true).order('sort_order').order('name');
  if(classId)q=q.eq('class_id',classId);
  const {data,error}=await q;
  if(error)throw error;
  const previous=$('bookSubjectFilter').value;
  $('bookSubjectFilter').innerHTML='<option value="">All Subjects</option>'+(data||[]).map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('');
  if((data||[]).some(s=>s.id===previous))$('bookSubjectFilter').value=previous;
}
async function loadAdminBookSubjects(){
  const {data,error}=await db.from('subjects').select('id,name').eq('class_id',$('bookClass').value).eq('is_active',true).order('sort_order').order('name');
  if(error)return status('bookStatus',error.message,'error');
  $('bookSubject').innerHTML='<option value="">सभी Subjects</option>'+(data||[]).map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('');
}
async function loadBooks(){
  const box=$('booksList');if(!box)return;
  box.innerHTML='<div class="empty">Books लोड हो रही हैं…</div>';
  let q=db.from('books').select('id,title,description,class_id,subject_id,storage_bucket,storage_path,created_at,classes(name),subjects(name)').eq('is_published',true).order('created_at',{ascending:false});
  const classId=$('bookClassFilter')?.value,subjectId=$('bookSubjectFilter')?.value;
  if(classId)q=q.eq('class_id',classId);
  if(subjectId)q=q.eq('subject_id',subjectId);
  const {data,error}=await q;
  if(error){box.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return;}
  if(!data?.length){box.innerHTML='<div class="empty">अभी कोई Published Book उपलब्ध नहीं है।</div>';return;}
  box.innerHTML=data.map(b=>'<article class="item"><h3>'+esc(b.title)+'</h3><p>'+esc(b.classes?.name||'')+' · '+esc(b.subjects?.name||'All Subjects')+'</p><p>'+esc(b.description||'')+'</p><div class="actions"><button onclick="openBook(\''+b.id+'\')">Read PDF</button><button class="secondary" onclick="downloadBook(\''+b.id+'\')">Download</button></div></article>').join('');
}
async function bookSignedUrl(book,download=false){
  const {data,error}=await db.storage.from(book.storage_bucket).createSignedUrl(book.storage_path,3600,download?{download:true}:{});
  if(error)throw error;
  return data.signedUrl;
}
async function openBook(id){
  const {data,error}=await db.from('books').select('storage_bucket,storage_path').eq('id',id).eq('is_published',true).single();
  if(error)return alert(error.message);
  try{window.open(await bookSignedUrl(data),'_blank','noopener');}catch(e){alert(e.message||'PDF नहीं खुल सकी।');}
}
async function downloadBook(id){
  const {data,error}=await db.from('books').select('title,storage_bucket,storage_path').eq('id',id).eq('is_published',true).single();
  if(error)return alert(error.message);
  try{const url=await bookSignedUrl(data,true);const a=document.createElement('a');a.href=url;a.download=(data.title||'StudyGuru-Book')+'.pdf';document.body.appendChild(a);a.click();a.remove();}catch(e){alert(e.message||'Download नहीं हो सका।');}
}
async function loadAdminBooks(){
  const box=$('adminBooksList');if(!box)return;
  const {data,error}=await db.from('books').select('id,title,description,is_published,storage_bucket,storage_path,classes(name),subjects(name)').order('created_at',{ascending:false});
  if(error){box.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return;}
  box.innerHTML=(data||[]).length?(data||[]).map(b=>'<article class="item"><h3>'+esc(b.title)+'</h3><p>'+esc(b.classes?.name||'')+' · '+esc(b.subjects?.name||'All Subjects')+' · '+(b.is_published?'Published':'Draft')+'</p><div class="actions"><button class="secondary" onclick="toggleBookPublish(\''+b.id+'\','+(!b.is_published)+')">'+(b.is_published?'Unpublish':'Publish')+'</button><button class="danger" onclick="deleteBook(\''+b.id+'\')">Delete</button></div></article>').join(''):'<div class="empty">अभी कोई किताब upload नहीं हुई है।</div>';
}
async function uploadBook(){
  const title=$('bookTitle').value.trim(),class_id=$('bookClass').value,subject_id=$('bookSubject').value||null,file=$('bookFile').files[0];
  if(!title||!class_id||!file)return status('bookStatus','Book title, Class और PDF file जरूरी हैं।','error');
  if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf'))return status('bookStatus','केवल PDF file upload करें।','error');
  if(file.size>100*1024*1024)return status('bookStatus','PDF 100 MB से बड़ी है।','error');
  const btn=$('bookUploadButton');btn.disabled=true;status('bookStatus','PDF upload हो रही है…');
  const path=profile.id+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  try{
    const {error:uploadError}=await db.storage.from('study-books').upload(path,file,{upsert:false,contentType:'application/pdf'});
    if(uploadError)throw uploadError;
    const {error}=await db.from('books').insert({title,description:$('bookDescription').value.trim()||null,class_id,subject_id,storage_bucket:'study-books',storage_path:path,is_published:$('bookPublish').checked,created_by:profile.id});
    if(error){await db.storage.from('study-books').remove([path]);throw error;}
    $('bookTitle').value='';$('bookDescription').value='';$('bookFile').value='';
    status('bookStatus','Book PDF सफलतापूर्वक upload हो गई।','ok');
    await loadAdminBooks();await loadBooks();
  }catch(e){status('bookStatus',e.message||'Upload failed','error');}
  finally{btn.disabled=false;}
}
async function toggleBookPublish(id,value){
  const {error}=await db.from('books').update({is_published:value,updated_at:new Date().toISOString()}).eq('id',id);
  if(error)return alert(error.message);
  await loadAdminBooks();await loadBooks();
}
async function deleteBook(id){
  if(!confirm('इस Book PDF को स्थायी रूप से delete करना है?'))return;
  const {data,error}=await db.from('books').select('storage_bucket,storage_path').eq('id',id).single();
  if(error)return alert(error.message);
  const {error:deleteError}=await db.from('books').delete().eq('id',id);
  if(deleteError)return alert(deleteError.message);
  const {error:storageError}=await db.storage.from(data.storage_bucket).remove([data.storage_path]);
  if(storageError)alert('Book record हट गया, लेकिन Storage file हटाने में समस्या आई: '+storageError.message);
  await loadAdminBooks();await loadBooks();
}
