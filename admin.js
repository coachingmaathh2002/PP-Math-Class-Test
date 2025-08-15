(function () {
  const LS_USER = 'lmmUser';
  const LS_TESTS = 'lmmTests';
  const LS_RESULTS = 'lmmResults';

  const user = JSON.parse(localStorage.getItem(LS_USER) || 'null');
  if (!user || user.role !== 'admin') {
    location.href = 'login.html#admin';
    return;
  }

  // Elements
  const testList = document.getElementById('testList');
  const newTestBtn = document.getElementById('newTestBtn');
  const deleteTestBtn = document.getElementById('deleteTestBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const shareLink = document.getElementById('shareLink');
  const copyLinkBtn = document.getElementById('copyLinkBtn');

  const testTitle = document.getElementById('testTitle');
  const testDuration = document.getElementById('testDuration');
  const negMcq = document.getElementById('negMcq');
  const negInt = document.getElementById('negInt');
  const adminPwd = document.getElementById('adminPwd');
  const saveTestBtn = document.getElementById('saveTestBtn');

  const qType = document.getElementById('qType');
  const qMarks = document.getElementById('qMarks');
  const qText = document.getElementById('qText');
  const opt0 = document.getElementById('opt0');
  const opt1 = document.getElementById('opt1');
  const opt2 = document.getElementById('opt2');
  const opt3 = document.getElementById('opt3');
  const qAnswerIdx = document.getElementById('qAnswerIdx');
  const qAnswerInt = document.getElementById('qAnswerInt');
  const qExplanation = document.getElementById('qExplanation');
  const mcqBox = document.getElementById('mcqBox');
  const intBox = document.getElementById('intBox');
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  const qList = document.getElementById('qList');

  const refreshResultsBtn = document.getElementById('refreshResultsBtn');
  const resultsSummary = document.getElementById('resultsSummary');
  const leaderboard = document.getElementById('leaderboard');

  // Helpers
  const getTests = () => JSON.parse(localStorage.getItem(LS_TESTS) || '[]');
  const saveTests = (t) => localStorage.setItem(LS_TESTS, JSON.stringify(t));
  const getResults = () => JSON.parse(localStorage.getItem(LS_RESULTS) || '[]');
  const genId = (p) => `${p}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

  let tests = getTests();
  let currentTestId = tests[0]?.id || null;

  function populateTestList() {
    tests = getTests();
    testList.innerHTML = '';
    if (!tests.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No tests. Create new.';
      testList.appendChild(opt);
      currentTestId = null;
      updateShareLink();
      clearTestFields();
      renderQuestions([]);
      return;
    }
    tests.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.title} (${t.duration} min)`;
      testList.appendChild(opt);
    });
    if (!currentTestId) currentTestId = tests[0].id;
    testList.value = currentTestId;
    loadTestIntoForm(currentTestId);
    updateShareLink();
  }

  function clearTestFields() {
    testTitle.value = '';
    testDuration.value = 60;
    negMcq.value = -1;
    negInt.value = 0;
  }

  function loadTestIntoForm(id) {
    const t = tests.find(x => x.id === id);
    if (!t) { clearTestFields(); renderQuestions([]); return; }
    testTitle.value = t.title;
    testDuration.value = t.duration;
    negMcq.value = t.negative?.mcq ?? -1;
    negInt.value = t.negative?.integer ?? 0;
    renderQuestions(t.questions || []);
  }

  function updateShareLink() {
    if (!currentTestId) { shareLink.value = ''; return; }
    const url = `${location.origin}${location.pathname.replace(/admin\\.html$/, '')}test.html?testId=${encodeURIComponent(currentTestId)}`;
    shareLink.value = url;
  }

  qType.addEventListener('change', () => {
    const isMCQ = qType.value === 'mcq';
    mcqBox.style.display = isMCQ ? 'grid' : 'none';
    intBox.style.display = isMCQ ? 'none' : 'grid';
  });

  addQuestionBtn.addEventListener('click', () => {
    if (!currentTestId) return alert('Create or select a test first.');
    const t = tests.find(x => x.id === currentTestId);
    const base = {
      id: genId('Q'),
      type: qType.value,
      text: qText.value.trim(),
      marks: Number(qMarks.value || 4),
      negative: qType.value === 'mcq' ? Number(negMcq.value || -1) : Number(negInt.value || 0),
      explanation: qExplanation.value.trim()
    };
    if (!base.text) return alert('Enter the question text.');

    if (qType.value === 'mcq') {
      const opts = [opt0.value, opt1.value, opt2.value, opt3.value].map(s => s.trim());
      if (opts.some(o => !o)) return alert('All MCQ options are required.');
      const ans = Number(qAnswerIdx.value);
      if (!(ans >= 0 && ans <= 3)) return alert('Correct option index must be 0-3.');
      t.questions.push({ ...base, options: opts, answer: ans });
    } else {
      const ansInt = qAnswerInt.value;
      if (ansInt === '') return alert('Enter the correct integer answer.');
      t.questions.push({ ...base, answer: Number(ansInt) });
    }
    saveTests(tests);
    loadTestIntoForm(currentTestId);
    qText.value = qExplanation.value = '';
    [opt0, opt1, opt2, opt3, qAnswerInt].forEach(i => i.value = '');
    qAnswerIdx.value = 0;
    alert('Question added.');
  });

  function renderQuestions(questions) {
    qList.innerHTML = '';
    questions.forEach((q, idx) => {
      const li = document.createElement('li');
      li.className = 'q-item';
      li.innerHTML = `
        <div class="q-top">
          <strong>Q${idx + 1} • ${q.type.toUpperCase()}</strong>
          <div class="q-actions">
            <button data-act="up" data-id="${q.id}">↑</button>
            <button data-act="down" data-id="${q.id}">↓</button>
            <button data-act="del" data-id="${q.id}" class="danger">Delete</button>
          </div>
        </div>
        <div class="q-body">${q.text}</div>
        <div class="q-meta">Marks: ${q.marks}, Negative: ${q.negative}</div>
      `;
      qList.appendChild(li);
    });

    qList.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        const t = tests.find(x => x.id === currentTestId);
        const i = t.questions.findIndex(x => x.id === id);
        if (i < 0) return;
        if (act === 'del') {
          if (confirm('Delete this question?')) {
            t.questions.splice(i, 1);
          }
        } else if (act === 'up' && i > 0) {
          [t.questions[i-1], t.questions[i]] = [t.questions[i], t.questions[i-1]];
        } else if (act === 'down' && i < t.questions.length - 1) {
          [t.questions[i+1], t.questions[i]] = [t.questions[i], t.questions[i+1]];
        }
        saveTests(tests);
        renderQuestions(t.questions);
      });
    });
  }

  newTestBtn.addEventListener('click', () => {
    const id = genId('TST');
    const t = { id, title: 'Untitled Test', duration: 60, negative: { mcq: -1, integer: 0 }, createdAt: new Date().toISOString(), questions: [] };
    tests.push(t);
    saveTests(tests);
    currentTestId = id;
    populateTestList();
  });

  deleteTestBtn.addEventListener('click', () => {
    if (!currentTestId) return;
    if (!confirm('Delete this test?')) return;
    tests = tests.filter(t => t.id !== currentTestId);
    saveTests(tests);
    currentTestId = tests[0]?.id || null;
    populateTestList();
  });

  testList.addEventListener('change', () => {
    currentTestId = testList.value || null;
    loadTestIntoForm(currentTestId);
    updateShareLink();
  });

  saveTestBtn.addEventListener('click', () => {
    if (!currentTestId) return alert('No test selected.');
    const t = tests.find(x => x.id === currentTestId);
    t.title = testTitle.value.trim() || 'Untitled Test';
    t.duration = Math.max(1, Number(testDuration.value || 60));
    t.negative = { mcq: Number(negMcq.value || -1), integer: Number(negInt.value || 0) };
    saveTests(tests);
    if (adminPwd.value) {
      localStorage.setItem('lmmAdminPwd', adminPwd.value);
      adminPwd.value = '';
      alert('Settings saved and admin password updated.');
    } else {
      alert('Test saved.');
    }
    populateTestList();
  });

  exportBtn.addEventListener('click', () => {
    if (!currentTestId) return;
    const t = tests.find(x => x.id === currentTestId);
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${t.title.replace(/\\s+/g,'_')}.json`;
    a.click();
  });

  importFile.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (!obj.id) obj.id = genId('TST');
      tests.push(obj);
      saveTests(tests);
      currentTestId = obj.id;
      populateTestList();
      alert('Imported.');
    } catch {
      alert('Invalid JSON.');
    } finally {
      importFile.value = '';
    }
  });

  function updateResultsOverview() {
    leaderboard.innerHTML = '';
    resultsSummary.innerHTML = '';
    if (!currentTestId) return;
    const rs = getResults().filter(r => r.testId === currentTestId);
    if (!rs.length) {
      resultsSummary.textContent = 'No submissions yet.';
      return;
    }
    const maxMarks = (getTests().find(t => t.id === currentTestId)?.questions || []).reduce((s,q) => s + (q.marks||0), 0);
    const avg = (rs.reduce((s,r) => s + r.score.total, 0) / rs.length).toFixed(2);
    resultsSummary.innerHTML = `
      <p>Submissions: <strong>${rs.length}</strong></p>
      <p>Average Score: <strong>${avg}</strong> / ${maxMarks}</p>
    `;
    const sorted = rs.slice().sort((a,b) => b.score.total - a.score.total || a.score.timeTaken - b.score.timeTaken);
    const top = sorted.slice(0, 10);
    const div = document.createElement('div');
    div.className = 'lb';
    div.innerHTML = `
      <div class="lb-row lb-head"><span>#</span><span>Name</span><span>Class</span><span>Roll</span><span>Score</span><span>Time</span></div>
      ${top.map((r,i)=>`
        <div class="lb-row">
          <span>${i+1}</span>
          <span>${r.student.name}</span>
          <span>${r.student.class}</span>
          <span>${r.student.roll}</span>
          <span>${r.score.total}</span>
          <span>${fmtTime(r.score.timeTaken)}</span>
        </div>
      `).join('')}
    `;
    leaderboard.appendChild(div);
  }

  function fmtTime(s) {
    const m = Math.floor(s/60), ss = s%60;
    return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }

  refreshResultsBtn.addEventListener('click', updateResultsOverview);
  copyLinkBtn.addEventListener('click', () => {
    shareLink.select();
    document.execCommand('copy');
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(()=>copyLinkBtn.textContent='Copy', 1200);
  });

  populateTestList();
  updateResultsOverview();
})();
