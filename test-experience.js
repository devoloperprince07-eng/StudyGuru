(function () {
  'use strict';

  var session = null;
  var timerId = null;
  var root = null;
  var styleId = 'sg-test-experience-style';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function formatClock(totalSeconds) {
    var seconds = Math.max(0, Math.floor(totalSeconds));
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var remainder = seconds % 60;
    return (hours ? String(hours).padStart(2, '0') + ':' : '') +
      String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
  }

  function ensureStyles() {
    if (document.getElementById(styleId)) return;
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '#sgTestExperience{position:fixed;inset:0;z-index:99999;background:#f5f6f8;color:#252a35;display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif;overflow:hidden}',
      '#sgTestExperience *{box-sizing:border-box}',
      '.sg-test-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 18px;background:#fff;border-bottom:1px solid #e9ebef;min-height:66px}',
      '.sg-test-brand{min-width:0}.sg-test-brand strong{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sg-test-brand small{display:block;color:#7b8290;font-size:11px;margin-top:3px}',
      '.sg-test-exit{background:#f1f2f4;color:#303846;border-radius:10px;padding:9px 13px;font-weight:700;min-height:40px;flex:0 0 auto}',
      '.sg-test-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px max(14px,calc((100% - 920px)/2));background:#fff;border-bottom:1px solid #eceef1}',
      '.sg-test-progress-copy{font-size:12px;font-weight:700;color:#596273}.sg-test-timer{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;color:#c6533b;background:#fff0eb;padding:8px 12px;border-radius:10px}',
      '.sg-test-progress{height:5px;background:#eceef2}.sg-test-progress>span{display:block;height:100%;background:#ff704d;transition:width .2s}',
      '.sg-test-scroll{flex:1;overflow:auto;padding:22px 14px 28px}',
      '.sg-test-content{max-width:860px;margin:0 auto}',
      '.sg-test-question-card{background:#fff;border:1px solid #e8ebef;border-radius:18px;padding:24px;box-shadow:0 8px 28px rgba(31,38,51,.05)}',
      '.sg-test-question-kicker{font-size:11px;color:#8a919e;font-weight:800;letter-spacing:.08em;text-transform:uppercase}',
      '.sg-test-question{font-size:clamp(18px,3vw,24px);line-height:1.55;margin:12px 0 22px;overflow-wrap:anywhere}',
      '.sg-test-options{display:grid;gap:10px}.sg-test-option{display:flex;align-items:center;gap:12px;width:100%;min-height:54px;padding:12px 14px;border:1px solid #e3e7ed;border-radius:13px;background:#fff;color:#28303c;text-align:left;font-weight:600}',
      '.sg-test-option.is-selected{border-color:#ff886f;background:#fff2ed;box-shadow:0 0 0 2px rgba(255,112,77,.1)}',
      '.sg-test-option-letter{width:29px;height:29px;flex:0 0 29px;border-radius:9px;background:#f0f2f5;color:#687182;display:grid;place-items:center;font-size:12px;font-weight:800}',
      '.sg-test-option.is-selected .sg-test-option-letter{background:#ff704d;color:#fff}.sg-test-option-text{flex:1;line-height:1.45;overflow-wrap:anywhere}.sg-test-option-check{color:#d85c40;font-size:17px}',
      '.sg-test-jump{display:flex;align-items:center;gap:10px;margin:14px 0;color:#6d7481;font-size:12px}.sg-test-jump select{max-width:210px;border:1px solid #dfe3e9;border-radius:10px;background:#fff;padding:9px 11px;color:#252a35}',
      '.sg-test-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px max(14px,calc((100% - 920px)/2));background:#fff;border-top:1px solid #e9ebef}',
      '.sg-test-btn{border:0;border-radius:11px;padding:11px 17px;min-height:44px;background:#ff674b;color:#fff;font-weight:800}.sg-test-btn.secondary{background:#f1f2f4;color:#394253}.sg-test-btn:disabled{opacity:.4}',
      '.sg-test-submit{background:#1f2937}.sg-test-answer-count{font-size:12px;color:#747d8a;text-align:center}',
      '.sg-test-result{max-width:650px;margin:26px auto;background:#fff;border:1px solid #e7eaf0;border-radius:20px;padding:25px;box-shadow:0 10px 30px rgba(31,38,51,.06)}',
      '.sg-test-score{font-size:36px;font-weight:900;letter-spacing:-.04em;margin:8px 0;color:#d75d43}.sg-test-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:18px 0}.sg-test-stat{background:#f7f8fa;border-radius:12px;padding:12px}.sg-test-stat span{display:block;font-size:11px;color:#78808d}.sg-test-stat strong{display:block;font-size:19px;margin-top:4px}',
      '.sg-test-notice{padding:12px 14px;margin:0 0 14px;border-radius:12px;background:#fff4e8;color:#925a20;font-size:12px;line-height:1.5}',
      '@media(max-width:600px){.sg-test-topbar{padding:10px 12px;min-height:58px}.sg-test-brand strong{font-size:13px}.sg-test-exit{padding:8px 10px;font-size:12px}.sg-test-meta{padding:10px 12px}.sg-test-scroll{padding:14px 10px 18px}.sg-test-question-card{padding:17px 14px;border-radius:15px}.sg-test-question{font-size:19px;margin:10px 0 17px}.sg-test-option{min-height:50px;padding:10px}.sg-test-bottom{padding:10px 11px;gap:7px}.sg-test-btn{padding:10px 12px;min-height:42px;font-size:12px}.sg-test-answer-count{font-size:10px}.sg-test-stats{gap:6px}.sg-test-stat{padding:9px}.sg-test-stat strong{font-size:16px}.sg-test-result{margin:12px auto;padding:18px 14px}}',
      '@media(prefers-reduced-motion:reduce){#sgTestExperience *{transition:none!important}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function answeredCount() {
    if (!session) return 0;
    return Object.keys(session.answers).length;
  }

  function openExperience() {
    ensureStyles();
    root = document.createElement('section');
    root.id = 'sgTestExperience';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'StudyGuru Test');
    root.addEventListener('click', handleClick);
    root.addEventListener('change', handleChange);
    document.body.appendChild(root);
    document.body.classList.add('sg-test-open');
  }

  function closeExperience(force) {
    if (!session) return;
    if (!force && !session.submitted && answeredCount() > 0) {
      if (!window.confirm('आपके उत्तर अभी submit नहीं हुए हैं। Test से बाहर निकलने पर ये उत्तर खो जाएँगे। बाहर निकलें?')) return;
    }
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    if (root) root.remove();
    root = null;
    session = null;
    document.body.classList.remove('sg-test-open');
    if (typeof loadTests === 'function') loadTests();
  }

  function render() {
    if (!root || !session) return;
    if (session.result) {
      renderResult();
      return;
    }
    var question = session.questions[session.index];
    var count = session.questions.length;
    var selected = session.answers[question.id];
    var percent = Math.round(((session.index + 1) / count) * 100);
    var optionsHtml = question.options.map(function (option, index) {
      var chosen = selected === index;
      return '<button type="button" class="sg-test-option' + (chosen ? ' is-selected' : '') +
        '" data-action="choose" data-option="' + index + '" aria-pressed="' + String(chosen) + '">' +
        '<span class="sg-test-option-letter">' + String.fromCharCode(65 + index) + '</span>' +
        '<span class="sg-test-option-text">' + escapeHtml(option) + '</span>' +
        '<span class="sg-test-option-check">' + (chosen ? '✓' : '') + '</span></button>';
    }).join('');

    var jumpOptions = session.questions.map(function (item, index) {
      var label = 'Question ' + (index + 1) + (Object.prototype.hasOwnProperty.call(session.answers, item.id) ? ' ✓' : '');
      return '<option value="' + index + '"' + (index === session.index ? ' selected' : '') + '>' +
        escapeHtml(label) + '</option>';
    }).join('');

    root.innerHTML =
      '<header class="sg-test-topbar"><div class="sg-test-brand"><strong>' + escapeHtml(session.test.title) +
      '</strong><small>' + escapeHtml(session.test.class_name || '') +
      (session.test.subject ? ' · ' + escapeHtml(session.test.subject) : '') +
      (session.isDraftPreview ? ' · Draft preview' : '') + '</small></div>' +
      '<button type="button" class="sg-test-exit" data-action="exit">Exit test</button></header>' +
      '<div class="sg-test-meta"><span class="sg-test-progress-copy">Question ' + (session.index + 1) + ' of ' + count +
      ' · ' + answeredCount() + ' answered</span><span class="sg-test-timer" id="sgTestClock">' +
      formatClock(session.remainingSeconds) + '</span></div>' +
      '<div class="sg-test-progress"><span style="width:' + percent + '%"></span></div>' +
      '<main class="sg-test-scroll"><div class="sg-test-content">' +
      (session.isDraftPreview ? '<div class="sg-test-notice">यह Draft Preview है। केवल test owner या Admin इसे preview और submit कर सकता है; Students को केवल published test दिखाई देंगे।</div>' : '') +
      '<div class="sg-test-question-card"><div class="sg-test-question-kicker">Question ' + (session.index + 1) +
      '</div><h1 class="sg-test-question">' + escapeHtml(question.question_text) + '</h1>' +
      '<div class="sg-test-options">' + optionsHtml + '</div></div>' +
      '<div class="sg-test-jump"><label for="sgTestJump">Go to question</label><select id="sgTestJump">' +
      jumpOptions + '</select></div></div></main>' +
      '<footer class="sg-test-bottom"><button type="button" class="sg-test-btn secondary" data-action="previous"' +
      (session.index === 0 ? ' disabled' : '') + '>← Previous</button>' +
      '<span class="sg-test-answer-count">' + answeredCount() + ' / ' + count + ' answered</span>' +
      (session.index === count - 1
        ? '<button type="button" class="sg-test-btn sg-test-submit" data-action="submit">Submit test</button>'
        : '<button type="button" class="sg-test-btn" data-action="next">Next →</button>') +
      '</footer>';
  }

  function renderResult() {
    if (!root || !session) return;
    var result = session.result || {};
    var total = Number(result.total_questions || result.total || session.questions.length);
    var score = Number(result.obtained_marks ?? result.score ?? 0);
    var totalMarks = Number(result.total_marks || 0);
    root.innerHTML =
      '<header class="sg-test-topbar"><div class="sg-test-brand"><strong>Test completed</strong>' +
      '<small>' + escapeHtml(session.test.title) + '</small></div></header>' +
      '<main class="sg-test-scroll"><div class="sg-test-result"><span class="sg-test-question-kicker">YOUR RESULT</span>' +
      '<div class="sg-test-score">' + score + ' / ' + totalMarks + ' marks</div>' +
      '<p>' + total + ' questions · ' + Number(result.accuracy || 0) + '% accuracy</p>' +
      '<div class="sg-test-stats"><div class="sg-test-stat"><span>Correct</span><strong>' + Number(result.correct_count || result.correct || 0) +
      '</strong></div><div class="sg-test-stat"><span>Incorrect</span><strong>' + Number(result.incorrect_count || result.incorrect || 0) +
      '</strong></div><div class="sg-test-stat"><span>Skipped</span><strong>' + Number(result.skipped_count || result.skipped || 0) +
      '</strong></div></div><p class="small">आपका result सुरक्षित रूप से save हो गया है।</p>' +
      '<button type="button" class="sg-test-btn" data-action="back-tests">Back to Practice Tests</button></div></main>';
    if (typeof loadAttempts === 'function') loadAttempts();
  }

  function handleClick(event) {
    var button = event.target.closest('[data-action]');
    if (!button || !session) return;
    var action = button.getAttribute('data-action');
    if (action === 'choose') {
      session.answers[session.questions[session.index].id] = Number(button.getAttribute('data-option'));
      render();
    } else if (action === 'previous') {
      session.index = Math.max(0, session.index - 1);
      render();
    } else if (action === 'next') {
      session.index = Math.min(session.questions.length - 1, session.index + 1);
      render();
    } else if (action === 'submit') {
      submit(false);
    } else if (action === 'exit') {
      closeExperience(false);
    } else if (action === 'back-tests') {
      closeExperience(true);
    }
  }

  function handleChange(event) {
    if (!session || !event.target || event.target.id !== 'sgTestJump') return;
    var next = Number(event.target.value);
    if (Number.isInteger(next) && next >= 0 && next < session.questions.length) {
      session.index = next;
      render();
    }
  }

  function tick() {
    if (!session || session.submitted || session.submitting) return;
    var elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
    session.remainingSeconds = Math.max(0, session.durationSeconds - elapsed);
    var clock = document.getElementById('sgTestClock');
    if (clock) clock.textContent = formatClock(session.remainingSeconds);
    if (session.remainingSeconds <= 0) submit(true);
  }

  async function submit(autoSubmit) {
    if (!session || session.submitted || session.submitting) return;
    var unanswered = session.questions.length - answeredCount();
    if (!autoSubmit && unanswered > 0 &&
      !window.confirm(unanswered + ' प्रश्न अभी खाली हैं। क्या फिर भी test submit करना है?')) return;

    session.submitting = true;
    var elapsed = Math.min(86400, Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)));
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    renderSubmitting();

    try {
      var response = await db.rpc('submit_studyguru_test', {
        p_test_id: session.test.id,
        p_answers: session.answers,
        p_duration_seconds: elapsed
      });
      if (response.error) throw response.error;
      session.result = response.data || {};
      session.submitted = true;
      session.submitting = false;
      renderResult();
    } catch (error) {
      session.submitting = false;
      session.submitError = error && error.message ? error.message : 'Result submit नहीं हो सका।';
      renderSubmitError();
    }
  }

  function renderSubmitting() {
    if (!root) return;
    root.innerHTML = '<main class="sg-test-scroll"><div class="sg-test-result"><h2>Submitting your test…</h2><p>आपके answers verify और save किए जा रहे हैं।</p></div></main>';
  }

  function renderSubmitError() {
    if (!root || !session) return;
    root.innerHTML = '<main class="sg-test-scroll"><div class="sg-test-result"><h2>Test submit नहीं हो सका</h2>' +
      '<div class="sg-test-notice">' + escapeHtml(session.submitError || 'Unknown error') + '</div>' +
      '<p>आपके answers इस screen में सुरक्षित हैं। सुधार के बाद फिर से submit कर सकते हैं।</p>' +
      '<button type="button" class="sg-test-btn" data-action="retry-submit">Retry submit</button> ' +
      '<button type="button" class="sg-test-btn secondary" data-action="return-question">Back to question</button></div></main>';
  }

  async function startTest(id) {
    var currentProfile = typeof profile !== 'undefined' ? profile : null;
    if (!currentProfile || !currentProfile.id) {
      window.alert('Test शुरू करने के लिए पहले Login करें।');
      return;
    }

    try {
      var testResponse = await db.from('practice_tests')
        .select('id,title,description,class_name,subject,duration_minutes,is_published,created_by,marks_per_question,negative_marks')
        .eq('id', id).single();
      if (testResponse.error) throw testResponse.error;
      var test = testResponse.data;
      var ownerOrAdmin = currentProfile.role === 'admin' || test.created_by === currentProfile.id;
      if (!test.is_published && !ownerOrAdmin) {
        window.alert('यह test अभी प्रकाशित नहीं हुआ है।');
        return;
      }

      var countResponse = await db.from('test_questions')
        .select('id', { count: 'exact', head: true }).eq('test_id', id);
      if (countResponse.error) throw countResponse.error;
      var questionCount = Number(countResponse.count || 0);
      if (!questionCount) {
        window.alert('इस test में अभी कोई question नहीं है। पहले Admin/Teacher से questions जोड़ने को कहें।');
        return;
      }
      if (questionCount > 2000) {
        window.alert('एक test में अधिकतम 2,000 questions रखे जा सकते हैं।');
        return;
      }

      var questionResponse = await db.from('test_questions')
        .select('id,question_text,options,sort_order')
        .eq('test_id', id).order('sort_order', { ascending: true }).range(0, 1999);
      if (questionResponse.error) throw questionResponse.error;
      var questions = questionResponse.data || [];
      if (!questions.length) {
        window.alert('Questions load नहीं हो सके। कृपया दोबारा कोशिश करें।');
        return;
      }
      for (var i = 0; i < questions.length; i++) {
        if (!Array.isArray(questions[i].options) || questions[i].options.length < 2) {
          throw new Error('Question ' + (i + 1) + ' के options सही format में नहीं हैं।');
        }
      }

      session = {
        test: test,
        questions: questions,
        answers: {},
        index: 0,
        startedAt: Date.now(),
        durationSeconds: Math.max(60, Math.min(14400, Number(test.duration_minutes || 15) * 60)),
        remainingSeconds: Math.max(60, Math.min(14400, Number(test.duration_minutes || 15) * 60)),
        isDraftPreview: !test.is_published,
        submitted: false,
        submitting: false,
        result: null
      };
      openExperience();
      render();
      if (timerId) window.clearInterval(timerId);
      timerId = window.setInterval(tick, 1000);
      tick();
    } catch (error) {
      window.alert(error && error.message ? error.message : 'Test खोलने में समस्या आई।');
    }
  }

  function handleClickRetry(event) {
    var button = event.target.closest('[data-action]');
    if (!button || !session) return;
    var action = button.getAttribute('data-action');
    if (action === 'retry-submit') submit(true);
    else if (action === 'return-question') {
      session.index = Math.max(0, Math.min(session.index, session.questions.length - 1));
      render();
      if (timerId) window.clearInterval(timerId);
      timerId = window.setInterval(tick, 1000);
    }
  }

  // Attach error-page actions through the same delegated click handler.
  var originalOpen = openExperience;
  openExperience = function () {
    originalOpen();
    root.addEventListener('click', handleClickRetry);
  };

  window.startDbTest = startTest;
  window.closeStudyGuruTest = function () { closeExperience(false); };
  window.sgStudyGuruTestIsOpen = function () { return !!session; };
})();