/* StudyGuru Test Result Dashboard — uses authenticated Supabase data only. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
  #sgResultView{max-width:920px;margin:0 auto;padding:4px 0 30px}
  .sg-result-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:8px 0 18px}
  .sg-result-head h1{font-size:clamp(22px,4vw,30px);margin:0}
  .sg-score{display:grid;grid-template-columns:150px 1fr;gap:22px;align-items:center;background:linear-gradient(125deg,#1F2633,#354052);color:#fff;border-radius:20px;padding:24px;margin-bottom:14px}
  .sg-ring{--p:0;width:132px;height:132px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#FF6148 calc(var(--p)*1%),#ffffff24 0);position:relative}
  .sg-ring:before{content:"";position:absolute;inset:10px;border-radius:50%;background:#263142}
  .sg-ring>div{position:relative;text-align:center}.sg-ring strong{font-size:27px;display:block}.sg-ring small{font-size:12px;color:#d7dce4}
  .sg-score h2{margin:0 0 6px;font-size:21px}.sg-score p{margin:5px 0;color:#e1e5eb}
  .sg-status{display:inline-block;padding:6px 11px;border-radius:99px;background:#16865b;color:white;font-size:12px;font-weight:700;margin-top:8px}
  .sg-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}
  .sg-stat,.sg-card{background:#fff;border:1px solid #e7e9ed;border-radius:15px;padding:15px;min-width:0}
  .sg-stat b{font-size:24px;display:block;margin:5px 0}.sg-stat span{font-size:12px;color:#6b7280}
  .sg-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
  .sg-green{background:#16865b}.sg-red{background:#c33d3d}.sg-grey{background:#9ca3af}
  .sg-two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}
  .sg-card h3{font-size:16px;margin:0 0 12px}.sg-line{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin:10px 0}
  .sg-track{height:9px;border-radius:99px;background:#edf0f3;overflow:hidden}.sg-track i{height:100%;display:block;background:#FF6148;border-radius:99px}
  .sg-subject{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 7px}
  .sg-note{font-size:12px;color:#6b7280;line-height:1.5}
  .sg-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
  .sg-actions button{min-height:44px}
  .sg-outline{background:#fff;color:#1F2633;border:1px solid #d9dde3}
  @media(max-width:620px){.sg-score{grid-template-columns:1fr;text-align:center;justify-items:center;padding:20px 15px}.sg-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.sg-two{grid-template-columns:1fr}.sg-actions{display:grid;grid-template-columns:1fr}.sg-actions button{width:100%}}
  `;
  document.head.appendChild(style);

  let startedAt = 0, activeTestId = null, activeQuestions = [], activeTest = null;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const oldStart = window.startDbTest;
  if (typeof oldStart === 'function') {
    window.startDbTest = async function(id) {
      const result = await oldStart(id);
      activeTestId = id; startedAt = Date.now();
      const {data: qs} = await db.from('test_questions').select('id,question_text,options,sort_order').eq('test_id',id).order('sort_order');
      const {data: t} = await db.from('practice_tests').select('id,title,subject,class_name').eq('id',id).single();
      activeQuestions = qs || []; activeTest = t || {};
      return result;
    };
  }

  window.submitDbTest = async function() {
    const id = activeTestId || $('testRunner')?.dataset.testId;
    if (!id) return;
    const answers = {};
    $('testRunner').querySelectorAll('input[type=radio]:checked').forEach(i => answers[i.name.slice(4)] = Number(i.value));
    const elapsed = Math.max(1, Math.round((Date.now() - (startedAt || Date.now())) / 1000));
    const btn = $('testRunner').querySelector('button'); if (btn) btn.disabled = true;
    const {data,error} = await db.rpc('submit_studyguru_test',{p_test_id:id,p_answers:answers,p_duration_seconds:elapsed});
    if (error) { if(btn)btn.disabled=false; return alert(error.message); }
    const total = Number(data.total || activeQuestions.length || 0);
    const score = Number(data.score || 0);
    const attempted = Object.keys(answers).length;
    const skipped = Math.max(0,total-attempted);
    const incorrect = Math.max(0,attempted-score);
    const accuracy = attempted ? Math.round(score/attempted*100) : 0;
    const pct = total ? Math.round(score/total*100) : 0;
    const passed = pct >= 40;
    $('testRunner').innerHTML = `
      <div id="sgResultView">
        <div class="sg-result-head"><h1>Test Result</h1><button class="sg-outline" onclick="showTab('tests')">⌂ Home</button></div>
        <section class="sg-score">
          <div class="sg-ring" style="--p:${pct}"><div><strong>${pct}%</strong><small>Score</small></div></div>
          <div><h2>${esc(activeTest?.title || 'Test completed')}</h2><p>Score: <b>${score} / ${total}</b></p><p>Percentage: <b>${pct}%</b></p><span class="sg-status">${passed?'Completed':'Keep Practicing'}</span></div>
        </section>
        <div class="sg-stats">
          <div class="sg-stat"><span>Total Questions</span><b>${total}</b></div>
          <div class="sg-stat"><span><i class="sg-dot sg-green"></i>Correct</span><b>${score}</b></div>
          <div class="sg-stat"><span><i class="sg-dot sg-red"></i>Incorrect</span><b>${incorrect}</b></div>
          <div class="sg-stat"><span><i class="sg-dot sg-grey"></i>Skipped</span><b>${skipped}</b></div>
        </div>
        <div class="sg-two">
          <section class="sg-card"><h3>Accuracy & Time</h3>
            <div class="sg-line"><span>Accuracy</span><b>${accuracy}%</b></div><div class="sg-track"><i style="width:${accuracy}%"></i></div>
            <div class="sg-line"><span>Total time</span><b>${Math.floor(elapsed/60)}m ${elapsed%60}s</b></div>
            <div class="sg-line"><span>Average / question</span><b>${total?Math.round(elapsed/total):0}s</b></div>
          </section>
          <section class="sg-card"><h3>Subject-wise Breakdown</h3>
            <div class="sg-subject"><b>${esc(activeTest?.subject || 'Subject not set')}</b><b>${score}/${total}</b></div>
            <div class="sg-track"><i style="width:${pct}%"></i></div>
            <p class="sg-note">इस मौजूदा test में एक subject दर्ज है। Multi-subject analysis के लिए test/question data में subject mapping चाहिए।</p>
          </section>
        </div>
        <div class="sg-two">
          <section class="sg-card"><h3>Performance Overview</h3>
            <div class="sg-line"><span>Correct</span><b>${score}</b></div><div class="sg-track"><i style="width:${total?score/total*100:0}%;background:#16865b"></i></div>
            <div class="sg-line"><span>Incorrect</span><b>${incorrect}</b></div><div class="sg-track"><i style="width:${total?incorrect/total*100:0}%;background:#c33d3d"></i></div>
            <div class="sg-line"><span>Skipped</span><b>${skipped}</b></div><div class="sg-track"><i style="width:${total?skipped/total*100:0}%;background:#9ca3af"></i></div>
          </section>
          <section class="sg-card"><h3>Leaderboard / Rank</h3><p class="sg-note">अभी verified class/batch ranking उपलब्ध नहीं है। Rank और topper score तभी दिखेंगे जब सभी विद्यार्थियों के ranking data और class mapping को सुरक्षित तरीके से जोड़ा जाएगा।</p></section>
        </div>
        <section class="sg-card"><h3>Answer Review</h3><p class="sg-note">तुम्हारे चुने हुए answers सुरक्षित रूप से submit हो गए हैं। Correct answer keys केवल server पर सुरक्षित हैं; अभी student-facing solutions API उपलब्ध नहीं है, इसलिए यहाँ अनुमानित solutions नहीं दिखाए जा रहे।</p></section>
        <div class="sg-actions"><button onclick="window.startDbTest('${id}')">Re-attempt Test</button><button class="sg-outline" onclick="showTab('tests')">Back to Tests</button></div>
      </div>`;
    loadAttempts();
  };
})();