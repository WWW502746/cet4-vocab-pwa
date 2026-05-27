const state = {
  words: [],
  currentIndex: 0,
  view: "learn",
  filter: "all",
  quiz: [],
  quizIndex: 0,
  deferredInstall: null,
  progress: {
    known: {},
    review: {},
    today: "",
    todayCount: 0,
  },
};

const els = {
  installBtn: document.querySelector("#installBtn"),
  learnedCount: document.querySelector("#learnedCount"),
  reviewCount: document.querySelector("#reviewCount"),
  todayCount: document.querySelector("#todayCount"),
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".panel"),
  rangeSelect: document.querySelector("#rangeSelect"),
  prevBtn: document.querySelector("#prevBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  wordText: document.querySelector("#wordText"),
  phoneticText: document.querySelector("#phoneticText"),
  definitionText: document.querySelector("#definitionText"),
  speakBtn: document.querySelector("#speakBtn"),
  knownBtn: document.querySelector("#knownBtn"),
  reviewBtn: document.querySelector("#reviewBtn"),
  quizProgress: document.querySelector("#quizProgress"),
  quizDefinition: document.querySelector("#quizDefinition"),
  quizOptions: document.querySelector("#quizOptions"),
  quizFeedback: document.querySelector("#quizFeedback"),
  newQuizBtn: document.querySelector("#newQuizBtn"),
  searchInput: document.querySelector("#searchInput"),
  wordList: document.querySelector("#wordList"),
};

const todayKey = () => new Date().toISOString().slice(0, 10);

function loadProgress() {
  const saved = localStorage.getItem("cet4-progress");
  if (saved) {
    state.progress = { ...state.progress, ...JSON.parse(saved) };
  }
  if (state.progress.today !== todayKey()) {
    state.progress.today = todayKey();
    state.progress.todayCount = 0;
  }
}

function saveProgress() {
  localStorage.setItem("cet4-progress", JSON.stringify(state.progress));
  renderStats();
}

function renderStats() {
  els.learnedCount.textContent = Object.keys(state.progress.known).length;
  els.reviewCount.textContent = Object.keys(state.progress.review).length;
  els.todayCount.textContent = state.progress.todayCount;
}

function filteredWords() {
  if (state.filter === "new") {
    return state.words.filter((word) => !state.progress.known[word.id]);
  }
  if (state.filter === "review") {
    return state.words.filter((word) => state.progress.review[word.id]);
  }
  return state.words;
}

function currentWord() {
  const list = filteredWords();
  if (!list.length) return null;
  state.currentIndex = (state.currentIndex + list.length) % list.length;
  return list[state.currentIndex];
}

function renderWord() {
  const word = currentWord();
  if (!word) {
    els.wordText.textContent = "完成";
    els.phoneticText.textContent = "";
    els.definitionText.textContent = "这个范围里暂时没有要学习的单词。";
    return;
  }
  els.wordText.textContent = word.word;
  els.phoneticText.textContent = word.phonetic || "";
  els.definitionText.textContent = word.definition || "";
}

function move(delta) {
  const list = filteredWords();
  if (!list.length) return;
  state.currentIndex = (state.currentIndex + delta + list.length) % list.length;
  renderWord();
}

function markKnown() {
  const word = currentWord();
  if (!word) return;
  if (!state.progress.known[word.id]) {
    state.progress.todayCount += 1;
  }
  state.progress.known[word.id] = true;
  delete state.progress.review[word.id];
  saveProgress();
  move(1);
}

function markReview() {
  const word = currentWord();
  if (!word) return;
  state.progress.review[word.id] = true;
  saveProgress();
  move(1);
}

function speakCurrent() {
  const word = currentWord();
  if (!word || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.word);
  utterance.lang = "en-US";
  utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildQuiz() {
  const source = filteredWords().length >= 8 ? filteredWords() : state.words;
  state.quiz = shuffle(source).slice(0, 10);
  state.quizIndex = 0;
  renderQuiz();
}

function renderQuiz() {
  const answer = state.quiz[state.quizIndex];
  if (!answer) {
    els.quizProgress.textContent = "完成";
    els.quizDefinition.textContent = "这一组已经做完。";
    els.quizOptions.innerHTML = "";
    els.quizFeedback.textContent = "";
    return;
  }

  els.quizProgress.textContent = `${state.quizIndex + 1} / ${state.quiz.length}`;
  els.quizDefinition.textContent = answer.definition;
  els.quizFeedback.textContent = "";

  const distractors = shuffle(state.words.filter((word) => word.id !== answer.id)).slice(0, 3);
  const options = shuffle([answer, ...distractors]);
  els.quizOptions.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "option";
    button.type = "button";
    button.textContent = option.word;
    button.addEventListener("click", () => chooseOption(button, option.id === answer.id, answer));
    els.quizOptions.append(button);
  });
}

function chooseOption(button, isCorrect, answer) {
  [...els.quizOptions.children].forEach((child) => {
    child.disabled = true;
    if (child.textContent === answer.word) child.classList.add("correct");
  });
  if (!isCorrect) {
    button.classList.add("wrong");
    state.progress.review[answer.id] = true;
    els.quizFeedback.textContent = `正确答案：${answer.word}`;
  } else {
    state.progress.known[answer.id] = true;
    delete state.progress.review[answer.id];
    els.quizFeedback.textContent = "答对了";
  }
  saveProgress();
  window.setTimeout(() => {
    state.quizIndex += 1;
    renderQuiz();
  }, 850);
}

function renderList() {
  const query = els.searchInput.value.trim().toLowerCase();
  const matches = state.words
    .filter((word) => {
      if (!query) return true;
      return word.word.toLowerCase().includes(query) || word.definition.includes(query);
    })
    .slice(0, 80);

  els.wordList.innerHTML = "";
  matches.forEach((word) => {
    const item = document.createElement("article");
    item.className = "list-item";
    item.innerHTML = `<strong>${escapeHtml(word.word)}</strong><span>${escapeHtml(word.phonetic)}</span><p>${escapeHtml(word.definition)}</p>`;
    item.addEventListener("click", () => {
      state.filter = "all";
      els.rangeSelect.value = "all";
      state.currentIndex = state.words.findIndex((entry) => entry.id === word.id);
      switchView("learn");
      renderWord();
    });
    els.wordList.append(item);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function switchView(view) {
  state.view = view;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  els.panels.forEach((panel) => panel.classList.toggle("active", panel.id === `${view}View`));
  if (view === "quiz" && !state.quiz.length) buildQuiz();
  if (view === "list") renderList();
}

function bindEvents() {
  els.tabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
  els.rangeSelect.addEventListener("change", () => {
    state.filter = els.rangeSelect.value;
    state.currentIndex = 0;
    renderWord();
  });
  els.prevBtn.addEventListener("click", () => move(-1));
  els.nextBtn.addEventListener("click", () => move(1));
  els.knownBtn.addEventListener("click", markKnown);
  els.reviewBtn.addEventListener("click", markReview);
  els.speakBtn.addEventListener("click", speakCurrent);
  els.newQuizBtn.addEventListener("click", buildQuiz);
  els.searchInput.addEventListener("input", renderList);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstall = event;
    els.installBtn.hidden = false;
  });
  els.installBtn.addEventListener("click", async () => {
    if (!state.deferredInstall) return;
    state.deferredInstall.prompt();
    await state.deferredInstall.userChoice;
    state.deferredInstall = null;
  });
}

async function init() {
  loadProgress();
  bindEvents();
  const response = await fetch("data/words.json");
  state.words = await response.json();
  renderStats();
  renderWord();
  renderList();
  buildQuiz();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
}

init();
