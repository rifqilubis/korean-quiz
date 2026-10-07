/* Korean vocabulary quiz — no dependencies */

(function () {
  "use strict";

  const TOTAL_QUESTIONS = 50;
  const KEYS = ["A", "B", "C", "D"];

  const $ = (id) => document.getElementById(id);

  const els = {
    start: $("screen-start"),
    quiz: $("screen-quiz"),
    result: $("screen-result"),
    btnStart: $("btnStart"),
    qNum: $("qNum"),
    qTotal: $("qTotal"),
    liveScore: $("liveScore"),
    progressBar: $("progressBar"),
    qWord: $("qWord"),
    qRom: $("qRom"),
    options: $("options"),
    feedback: $("feedback"),
    btnNext: $("btnNext"),
    btnFinish: $("btnFinish"),
    scoreRing: $("scoreRing"),
    scoreNum: $("scoreNum"),
    scoreDen: $("scoreDen"),
    resultMsg: $("resultMsg"),
    statCorrect: $("statCorrect"),
    statWrong: $("statWrong"),
    statPct: $("statPct"),
    reviewTitle: $("reviewTitle"),
    reviewList: $("reviewList"),
    btnToggleReview: $("btnToggleReview"),
    btnRetry: $("btnRetry"),
    btnHome: $("btnHome"),
    btnTheme: $("btnTheme"),
    bankSize: $("bankSize")
  };

  const state = {
    questions: [],
    index: 0,
    score: 0,
    answered: false,
    results: [],   // { word, selected, correct, isCorrect }
    showAll: false
  };

  /* ---------- helpers ---------- */

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function show(screen) {
    [els.start, els.quiz, els.result].forEach((s) => s.classList.remove("active"));
    screen.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function sample(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  /* ---------- quiz setup ---------- */

  function buildQuestions() {
    const count = Math.min(TOTAL_QUESTIONS, WORDS.length);
    const picked = sample(WORDS, count);

    // Answers grouped by category, so entries without hand-written
    // distractors (the PDF word lists) get plausible same-topic options.
    const pools = {};
    WORDS.forEach((w) => {
      if (!w.cat) return;
      const p = pools[w.cat] || (pools[w.cat] = []);
      if (p.indexOf(w.id) === -1) p.push(w.id);
    });
    const allIds = [];
    WORDS.forEach((w) => {
      if (allIds.indexOf(w.id) === -1) allIds.push(w.id);
    });

    function distractorsFor(w) {
      if (w.wrong && w.wrong.length === 3) return w.wrong;
      const local = (pools[w.cat] || []).filter((v) => v !== w.id);
      const pickedLocal = sample(local, Math.min(3, local.length));
      if (pickedLocal.length < 3) {
        const fill = sample(
          allIds.filter((v) => v !== w.id && pickedLocal.indexOf(v) === -1),
          3 - pickedLocal.length
        );
        pickedLocal.push.apply(pickedLocal, fill);
      }
      return pickedLocal;
    }

    return picked.map((w) => {
      const options = shuffle([w.id].concat(distractorsFor(w)));
      return { word: w, options: options, answer: w.id };
    });
  }

  function startQuiz() {
    state.questions = buildQuestions();
    state.index = 0;
    state.score = 0;
    state.answered = false;
    state.results = [];
    state.showAll = false;
    els.qTotal.textContent = String(state.questions.length);
    show(els.quiz);
    renderQuestion();
  }

  /* ---------- quiz rendering ---------- */

  function renderQuestion() {
    const q = state.questions[state.index];
    state.answered = false;

    els.qNum.textContent = String(state.index + 1);
    els.liveScore.textContent = String(state.score);
    els.progressBar.style.width =
      ((state.index) / state.questions.length) * 100 + "%";

    els.qWord.textContent = q.word.kr;
    els.qRom.textContent = q.word.rom;
    els.feedback.textContent = "";
    els.feedback.className = "feedback";
    els.btnNext.classList.add("hidden");
    els.btnFinish.classList.add("hidden");

    els.options.innerHTML = "";
    els.options.classList.remove("revealed");
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.dataset.value = opt;

      const key = document.createElement("span");
      key.className = "opt-key";
      key.textContent = KEYS[i];

      const text = document.createElement("span");
      text.className = "opt-text";

      const label = document.createElement("span");
      label.className = "opt-label";
      label.textContent = opt;
      text.appendChild(label);

      // Korean counterpart — revealed only after the answer is locked in
      const ko = document.createElement("span");
      ko.className = "opt-ko";
      ko.textContent = typeof KO !== "undefined" && KO[opt] ? KO[opt] : "";
      text.appendChild(ko);

      btn.appendChild(key);
      btn.appendChild(text);
      btn.addEventListener("click", () => choose(btn, opt));
      els.options.appendChild(btn);
    });
  }

  function choose(btn, value) {
    if (state.answered) return;
    state.answered = true;

    const q = state.questions[state.index];
    const isCorrect = value === q.answer;

    if (isCorrect) state.score += 1;
    state.results.push({
      no: state.index + 1,
      word: q.word,
      selected: value,
      correct: q.answer,
      isCorrect: isCorrect
    });

    // paint options + reveal the Korean counterpart of every option
    els.options.classList.add("revealed");
    Array.prototype.forEach.call(els.options.children, (el) => {
      el.disabled = true;
      const v = el.dataset.value;
      if (v === q.answer) {
        el.classList.add("correct");
      } else if (el === btn) {
        el.classList.add("wrong");
      } else {
        el.classList.add("dim");
      }
    });

    els.liveScore.textContent = String(state.score);
    els.progressBar.style.width =
      ((state.index + 1) / state.questions.length) * 100 + "%";

    if (isCorrect) {
      els.feedback.textContent = "✔ Benar! " + q.word.kr + " = " + q.answer;
      els.feedback.className = "feedback ok";
    } else {
      els.feedback.textContent =
        "✖ Salah. " + q.word.kr + " berarti \"" + q.answer + "\".";
      els.feedback.className = "feedback no";
    }

    const last = state.index === state.questions.length - 1;
    if (last) {
      els.btnFinish.classList.remove("hidden");
      els.btnFinish.focus();
    } else {
      els.btnNext.classList.remove("hidden");
      els.btnNext.focus();
    }
  }

  function next() {
    if (!state.answered) return;
    if (state.index >= state.questions.length - 1) {
      finish();
      return;
    }
    state.index += 1;
    renderQuestion();
  }

  /* ---------- result ---------- */

  function gradeMessage(pct) {
    if (pct === 100) return "Sempurna! 만점 🎉";
    if (pct >= 90) return "Luar biasa! Hampir sempurna 🌟";
    if (pct >= 75) return "Kerja bagus! Terus berlatih 💪";
    if (pct >= 50) return "Cukup baik, ulangi lagi ya 📚";
    return "Jangan menyerah, coba sekali lagi 🔥";
  }

  function finish() {
    const total = state.questions.length;
    const correct = state.score;
    const wrong = total - correct;
    const pct = Math.round((correct / total) * 100);

    els.scoreNum.textContent = String(correct);
    els.scoreDen.textContent = String(total);
    els.statCorrect.textContent = String(correct);
    els.statWrong.textContent = String(wrong);
    els.statPct.textContent = pct + "%";
    els.resultMsg.textContent = gradeMessage(pct);
    els.scoreRing.style.setProperty("--pct", String(pct));
    els.scoreRing.style.setProperty(
      "--ring",
      pct >= 75 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)"
    );

    state.showAll = false;
    renderReview();
    show(els.result);
  }

  function renderReview() {
    const wrongItems = state.results.filter((r) => !r.isCorrect);
    const items = state.showAll ? state.results : wrongItems;

    els.btnToggleReview.textContent = state.showAll
      ? "Hanya yang salah"
      : "Tampilkan semua";

    els.reviewTitle.textContent = state.showAll
      ? "Semua jawaban (" + state.results.length + " soal)"
      : "Pembahasan jawaban yang salah (" + wrongItems.length + " soal)";

    els.reviewList.innerHTML = "";

    if (items.length === 0) {
      const div = document.createElement("div");
      div.className = "review-empty";
      div.textContent = "Semua jawaban benar — hebat! 🎉";
      els.reviewList.appendChild(div);
      return;
    }

    items.forEach((r, i) => {
      const row = document.createElement("div");
      row.className = "review-item" + (r.isCorrect ? " ok-item" : "");

      const num = document.createElement("div");
      num.className = "review-num";
      num.textContent = String(r.no);

      const word = document.createElement("div");
      word.className = "review-word";
      word.textContent = r.word.kr;

      const answers = document.createElement("div");
      answers.className = "review-answers";
      if (r.isCorrect) {
        answers.innerHTML =
          '<span class="right">✔ ' + escapeHtml(r.correct) + "</span>";
      } else {
        answers.innerHTML =
          '<span class="yours no">Jawabanmu: ' + escapeHtml(r.selected) +
          koNote(r.selected) +
          "</span><br><span class=\"right\">Benar: " + escapeHtml(r.correct) + "</span>";
      }

      const tag = document.createElement("span");
      tag.className = "review-tag " + (r.isCorrect ? "tag-yes" : "tag-no");
      tag.textContent = r.isCorrect ? "BENAR" : "SALAH";

      row.appendChild(num);
      row.appendChild(word);
      row.appendChild(answers);
      row.appendChild(tag);
      els.reviewList.appendChild(row);
    });
  }

  function koNote(value) {
    if (typeof KO === "undefined" || !KO[value]) return "";
    return ' <span class="ko-inline">(' + escapeHtml(KO[value]) + ")</span>";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- events ---------- */

  els.btnStart.addEventListener("click", startQuiz);
  els.btnRetry.addEventListener("click", startQuiz);
  els.btnHome.addEventListener("click", () => show(els.start));
  els.btnNext.addEventListener("click", next);
  els.btnFinish.addEventListener("click", finish);
  els.btnToggleReview.addEventListener("click", () => {
    state.showAll = !state.showAll;
    renderReview();
  });

  document.addEventListener("keydown", (e) => {
    if (!els.quiz.classList.contains("active")) return;

    const k = e.key.toUpperCase();
    let idx = KEYS.indexOf(k);
    if (idx === -1 && /^[1-4]$/.test(e.key)) idx = Number(e.key) - 1;

    if (!state.answered && idx >= 0 && idx < els.options.children.length) {
      const btn = els.options.children[idx];
      if (!btn.disabled) {
        e.preventDefault();
        btn.click();
      }
      return;
    }

    if (state.answered && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      next();
    }
  });

  /* ---------- theme (dark / light) ---------- */

  function storedTheme() {
    try {
      const t = localStorage.getItem("kq-theme");
      if (t === "dark" || t === "light") return t;
    } catch (e) { /* storage unavailable */ }
    return null;
  }

  function systemTheme() {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    els.btnTheme.textContent = theme === "dark" ? "☀️" : "🌙";
    els.btnTheme.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  }

  els.btnTheme.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light" : "dark";
    try { localStorage.setItem("kq-theme", next); } catch (e) { /* ignore */ }
    applyTheme(next);
  });

  applyTheme(
    document.documentElement.getAttribute("data-theme") ||
      storedTheme() || systemTheme()
  );

  /* ---------- init ---------- */
  els.bankSize.textContent = String(WORDS.length);
})();
