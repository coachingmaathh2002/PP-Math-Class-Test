(function () {
  const LS_RESULTS = 'lmmResults';
  const LS_TESTS = 'lmmTests';

  const params = new URLSearchParams(location.search);
  const resultId = params.get('resultId');

  const results = JSON.parse(localStorage.getItem(LS_RESULTS) || '[]');
  const tests = JSON.parse(localStorage.getItem(LS_TESTS) || '[]');

  const result = results.find(r => r.id === resultId);
  if (!result) {
    document.body.innerHTML = '<p style="padding:1rem;">Result not found.</p>';
    return;
  }
  const test = tests.find(t => t.id === result.testId);

  const scoreSummary = document.getElementById('scoreSummary');
  const detail = document.getElementById('detail');
  const leaderboard = document.getElementById('leaderboard');
  const printBtn = document.getElementById('printBtn');

  function fmtTime(s) {
    const m = Math.floor(s/60), ss = s%60;
    return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }

  // Summary
  scoreSummary.innerHTML = `
    <h2>${test?.title || 'Test'}</h2>
    <p><strong>${result.student.name}</strong> • ${result.student.class} • Roll: ${result.student.roll}</p>
    <p>Score: <strong>${result.score.total}</strong> / ${result.score.max}</p>
    <p>Correct: ${result.score.correct}, Incorrect: ${result.score.incorrect}, Unanswered: ${result.score.unanswered}</p>
    <p>Time Taken: ${fmtTime(result.score.timeTaken)}</p>
  `;

  // Detailed review
  const qMap = new Map(test.questions.map(q => [q.id, q]));
  detail.innerHTML = result.breakdown.map((b, idx) => {
    const q = qMap.get(b.qid);
    const isCorrect = b.isCorrect;
    const sa = b.type === 'mcq' ? (b.studentAnswer !== null && b.studentAnswer !== undefined ? String.fromCharCode(65 + b.studentAnswer) : '—') : (b.studentAnswer ?? '—');
    const ca = b.type === 'mcq' ? String.fromCharCode(65 + q.answer) : q.answer;
    return `
      <div class="rev-item ${isCorrect ? 'ok' : (b.studentAnswer===null||b.studentAnswer===undefined?'na':'bad')}">
        <div class="rev-head">
          <strong>Q${idx + 1} • ${b.type.toUpperCase()}</strong>
          <span>Marks: ${b.marksAwarded >= 0 ? '+' : ''}${b.marksAwarded}</span>
        </div>
        <div class="rev-q">${q.text}</div>
        <div class="rev-ans">
          <div>Correct: <strong>${ca}</strong></div>
          <div>Your answer: <strong>${sa}</strong></div>
        </div>
        ${q.explanation ? `<details><summary>Explanation</summary><div class="rev-exp">${q.explanation}</div></details>` : ''}
      </div>
    `;
  }).join('');
  if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise();

  // Leaderboard (top 10 for this test)
  const all = results.filter(r => r.testId === result.testId);
  const sorted = all.slice().sort((a,b) => b.score.total - a.score.total || a.score.timeTaken - b.score.timeTaken);
  leaderboard.innerHTML = `
    <div class="lb-row lb-head"><span>#</span><span>Name</span><span>Class</span><span>Roll</span><span>Score</span><span>Time</span></div>
    ${sorted.slice(0, 10).map((r,i)=>`
      <div class="lb-row ${r.id===result.id?'me':''}">
        <span>${i+1}</span>
        <span>${r.student.name}</span>
        <span>${r.student.class}</span>
        <span>${r.student.roll}</span>
        <span>${r.score.total}</span>
        <span>${fmtTime(r.score.timeTaken)}</span>
      </div>
    `).join('')}
  `;

  printBtn.addEventListener('click', () => window.print());
})();
