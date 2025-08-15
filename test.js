(function () {
  const LS_USER = 'lmmUser';
  const LS_TESTS = 'lmmTests';
  const LS_RESULTS = 'lmmResults';

  const user = JSON.parse(localStorage.getItem(LS_USER) || 'null');
  if (!user || user.role !== 'student') {
    location.href = 'login.html#student';
    return;
  }

  // Helpers
  const params = new URLSearchParams(location.search);
  const testId = params.get('testId');
  const tests = JSON.parse(localStorage.getItem(LS_TESTS) || '[]');
  const test = tests.find(t => t.id === testId);
  if (!test) {
    alert('Test not found.');
    location.href = 'login.html#student';
    return;
  }
  const draftKey = `lmmDraft:${testId}:${user.roll}`;
  const saveDraft = (obj) => localStorage.setItem(draftKey, JSON.stringify(obj));
  const loadDraft = () => JSON.parse(localStorage.getItem(draftKey) || 'null');
  const getResults = () => JSON.parse(localStorage.getItem(LS_RESULTS) || '[]');
  const saveResults = (r) => localStorage.setItem(LS_RESULTS, JSON.stringify(r));
  const genId = (p) => `${p}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

  // Elements
  document.getElementById('testTitle').textContent = test.title;
  document.getElementById('studentName').textContent = `${user.name} (${user.class} • ${user.roll})`;
  const navGrid = document.getElementById('navGrid');
  const qHeader = document.getElementById('qHeader');
  const qTextEl = document.getElementById('qText');
  const mcqOptions = document.getElementById('mcqOptions');
  const intInput = document.getElementById('intInput');
  const intAnswer = document.getElementById('intAnswer');
  const timerEl = document.getElementById('timer');

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const clearBtn = document.getElementById('clearBtn');
  const markBtn = document.getElementById('markBtn');
  const submitBtn = document.getElementById('submitBtn');

  // State
  let current = 0;
  const N = test.questions.length;
  let remaining = test.duration * 60;
  let answers = {}; // qid -> {selected, value, status, marked, timeSpent}

  // Load draft if exists
  const draft = loadDraft();
  if (draft && draft.testId === testId) {
    answers = draft.answers || {};
    remaining = draft.remaining ?? remaining;
    current = draft.current ?? 0;
  }

  // Timer
  function tick() {
    remaining--;
    if (remaining <= 0) {
      timerEl.textContent = '00:00';
      submit(true);
      return;
    }
    const m = Math.floor(remaining/60), s = remaining%60;
    timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    // persist draft every 10 seconds
    if (remaining % 10 === 0) persist();
  }
  let timerId = setInterval(tick, 1000);
  tick();

  function persist() {
    saveDraft({ testId, answers, current, remaining, savedAt: Date.now() });
  }

  // Nav grid
  function renderNav() {
    navGrid.innerHTML = '';
    test.questions.forEach((q, i) => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.textContent = String(i + 1);
      const a = answers[q.id];
      if (!a) btn.classList.add('not-visited');
      else if (a.marked) btn.classList.add('review');
      else if (a.selected !== undefined || a.value !== undefined) btn.classList.add('answered');
      else btn.classList.add('visited');
      if (i === current) btn.classList.add('active');
      btn.addEventListener('click', () => {
        current = i;
        loadQuestion();
        renderNav();
      });
      navGrid.appendChild(btn);
    });
  }

  function typeset() {
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise();
    }
  }

  function loadQuestion() {
    const q = test.questions[current];
    qHeader.textContent = `Q${current + 1} • ${q.type.toUpperCase()} • Marks: ${q.marks}`;
    qTextEl.innerHTML = q.text;
    mcqOptions.innerHTML = '';
    intInput.style.display = 'none';

    if (q.type === 'mcq') {
      q.options.forEach((opt, idx) => {
        const id = `opt-${current}-${idx}`;
        const label = document.createElement('label');
        label.className = 'opt';
        label.innerHTML = `<input type="radio" name="q${current}" id="${id}" value="${idx}"><span>${String.fromCharCode(65+idx)}.</span> <span>${opt}</span>`;
        const inp = label.querySelector('input');
        const a = answers[q.id];
        if (a && a.selected === idx) inp.checked = true;
        inp.addEventListener('change', () => {
          answers[q.id] = { ...(answers[q.id] || {}), selected: idx, status: 'answered', marked: false };
          persist();
          renderNav();
        });
        mcqOptions.appendChild(label);
      });
    } else {
      intInput.style.display = 'block';
      const a = answers[q.id];
      intAnswer.value = a?.value ?? '';
      intAnswer.oninput = () => {
        const val = intAnswer.value;
        if (val === '') {
          if (answers[q.id]) {
            delete answers[q.id].value;
            answers[q.id].status = 'visited';
          }
        } else {
          answers[q.id] = { ...(answers[q.id] || {}), value: Number(val), status: 'answered', marked: false };
        }
        persist();
        renderNav();
      };
    }

    typeset();
  }

  clearBtn.addEventListener('click', () => {
    const q = test.questions[current];
    if (q.type === 'mcq') {
      document.querySelectorAll(`input[name="q${current}"]`).forEach(r => r.checked = false);
      if (!answers[q.id]) answers[q.id] = {};
      delete answers[q.id].selected;
      answers[q.id].status = 'visited';
      answers[q.id].marked = false;
    } else {
      intAnswer.value = '';
      if (!answers[q.id]) answers[q.id] = {};
      delete answers[q.id].value;
      answers[q.id].status = 'visited';
      answers[q.id].marked = false;
    }
    persist();
    renderNav();
  });

  markBtn.addEventListener('click', () => {
    const q = test.questions[current];
    answers[q.id] = { ...(answers[q.id] || {}), marked: true, status: (answers[q.id]?.status || 'visited') };
    persist();
    renderNav();
  });

  prevBtn.addEventListener('click', () => {
    if (current > 0) current--;
    loadQuestion(); renderNav();
  });
  nextBtn.addEventListener('click', () => {
    if (current < N - 1) current++;
    loadQuestion(); renderNav();
  });

  submitBtn.addEventListener('click', () => submit(false));

  function submit(auto = false) {
    if (!auto) {
      const un = test.questions.filter(q => !answers[q.id] || (answers[q.id] && answers[q.id].selected === undefined && answers[q.id].value === undefined)).length;
      if (!confirm(`You have ${un} unanswered questions. Submit now?`)) return;
    }
    clearInterval(timerId);
    // Evaluate
    let total = 0, correct = 0, incorrect = 0, unanswered = 0;
    const breakdown = [];
    for (const q of test.questions) {
      const a = answers[q.id];
      let awarded = 0;
      let isCorrect = false;
      let sAns = null;
      if (!a || (a.selected === undefined && a.value === undefined)) {
        unanswered++;
      } else if (q.type === 'mcq') {
        sAns = a.selected;
        if (a.selected === q.answer) {
          isCorrect = true;
          awarded = q.marks;
        } else {
          isCorrect = false;
          awarded = q.negative ?? test.negative.mcq ?? 0;
        }
        if (isCorrect) correct++; else incorrect++;
      } else {
        sAns = a.value;
        if (Number(a.value) === Number(q.answer)) {
          isCorrect = true;
          awarded = q.marks;
          correct++;
        } else {
          isCorrect = false;
          awarded = q.negative ?? test.negative.integer ?? 0;
          if (awarded < 0) incorrect++; else unanswered++; // if no negative, treat as wrong but non-penalized
        }
      }
      total += awarded;
      breakdown.push({
        qid: q.id,
        type: q.type,
        studentAnswer: sAns,
        correctAnswer: q.answer,
        marksAwarded: awarded,
        isCorrect
      });
    }
    const maxTotal = test.questions.reduce((s,q)=>s+(q.marks||0),0);
    const result = {
      id: genId('RES'),
      testId,
      student: { name: user.name, class: user.class, roll: user.roll },
      score: {
        total,
        max: maxTotal,
        correct, incorrect, unanswered,
        timeTaken: test.duration * 60 - Math.max(remaining, 0)
      },
      breakdown,
      submittedAt: new Date().toISOString()
    };
    const results = getResults();
    results.push(result);
    saveResults(results);
    // Clean draft for this test/student
    localStorage.removeItem(draftKey);
    location.href = `results.html?resultId=${result.id}`;
  }

  // Initial render
  renderNav();
  loadQuestion();

  // Warn before unload
  window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = '';
  });
})();
