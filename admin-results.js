/* StudyGuru Admin Results: admin-only, RLS-protected, paginated report. */
(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const panel = $('adminPanel');
  if (!panel) return;

  panel.insertAdjacentHTML('beforeend', `
    <section class="panel" id="sgAdminResults">
      <div class="topline">
        <div><h2 class="section-title" style="margin:0">All Student Test Results</h2>
          <p class="small">Admin-only report · निजी Student Results दूसरे Students को नहीं दिखते</p>
        </div>
        <button class="plain" onclick="loadAdminResults(true)">Refresh</button>
      </div>
      <div id="sgAdminResultSummary" class="notice">Results load करने के लिए Refresh दबाएँ।</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;min-width:680px">
          <thead><tr style="text-align:left;border-bottom:1px solid var(--line)">
            <th style="padding:10px">Student</th><th style="padding:10px">Test</th>
            <th style="padding:10px">Score</th><th style="padding:10px">Time</th>
            <th style="padding:10px">Submitted</th>
          </tr></thead>
          <tbody id="sgAdminResultRows"><tr><td colspan="5" class="small" style="padding:12px">कोई result अभी load नहीं हुआ है।</td></tr></tbody>
        </table>
      </div>
      <div class="topline" style="margin-top:12px">
        <span id="sgAdminResultPage" class="small"></span>
        <button id="sgAdminResultMore" class="secondary hidden" onclick="loadAdminResults(false)">Load more results</button>
      </div>
    </section>`);

  let offset = 0;
  let total = 0;
  const pageSize = 100;
  window.loadAdminResults = async (reset = false) => {
    if (typeof profile === 'undefined' || profile?.role !== 'admin') {
      $('sgAdminResultSummary').textContent = 'यह रिपोर्ट केवल Admin account के लिए है।';
      return;
    }
    if (reset) {
      offset = 0;
      total = 0;
      $('sgAdminResultRows').innerHTML = '';
      $('sgAdminResultMore').classList.add('hidden');
    }
    $('sgAdminResultSummary').textContent = 'Student results load हो रहे हैं…';
    const {data,error,count} = await db.from('test_attempts')
      .select('id,user_id,score,total_questions,submitted_at,duration_seconds,practice_tests(title,class_name,subject)', {count:'exact'})
      .order('submitted_at',{ascending:false})
      .range(offset, offset + pageSize - 1);
    if (error) {
      $('sgAdminResultSummary').textContent = 'Results load नहीं हो सके: ' + error.message;
      return;
    }
    total = count ?? total;
    const attempts = data || [];
    if (!attempts.length && offset === 0) {
      $('sgAdminResultRows').innerHTML = '<tr><td colspan="5" class="small" style="padding:12px">अभी कोई student test attempt नहीं है।</td></tr>';
    } else if (attempts.length) {
      const userIds = [...new Set(attempts.map(a => a.user_id).filter(Boolean))];
      const {data:people,error:peopleError} = userIds.length
        ? await db.from('profiles').select('id,full_name').in('id',userIds)
        : {data:[],error:null};
      if (peopleError) {
        $('sgAdminResultSummary').textContent = 'Student names load नहीं हो सके: ' + peopleError.message;
        return;
      }
      const byId = new Map((people || []).map(p => [p.id,p.full_name || 'Student']));
      $('sgAdminResultRows').insertAdjacentHTML('beforeend', attempts.map(a => {
        const test = a.practice_tests || {};
        const pct = a.total_questions ? Math.round(a.score / a.total_questions * 100) : 0;
        const elapsed = Math.max(0, Number(a.duration_seconds || 0));
        const date = a.submitted_at ? new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(a.submitted_at)) : '—';
        return '<tr style="border-bottom:1px solid var(--line)">' +
          '<td style="padding:10px">' + esc(byId.get(a.user_id) || 'Student') + '</td>' +
          '<td style="padding:10px">' + esc(test.title || 'Practice Test') + '<div class="small">' + esc(test.class_name || '') + ' · ' + esc(test.subject || '') + '</div></td>' +
          '<td style="padding:10px"><b>' + Number(a.score || 0) + '/' + Number(a.total_questions || 0) + '</b><div class="small">' + pct + '%</div></td>' +
          '<td style="padding:10px">' + Math.floor(elapsed/60) + 'm ' + (elapsed%60) + 's</td>' +
          '<td style="padding:10px">' + esc(date) + '</td></tr>';
      }).join(''));
    }
    offset += attempts.length;
    $('sgAdminResultSummary').textContent = 'कुल attempts: ' + total + ' · Loaded: ' + offset;
    $('sgAdminResultPage').textContent = offset + ' of ' + total + ' results';
    $('sgAdminResultMore').classList.toggle('hidden', offset >= total);
  };

  const previousShowTab = window.showTab;
  if (typeof previousShowTab === 'function') {
    window.showTab = function(tab) {
      previousShowTab(tab);
      if (tab === 'admin' && typeof profile !== 'undefined' && profile?.role === 'admin') {
        window.loadAdminResults(true);
      }
    };
  }
})();