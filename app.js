const STORAGE_KEY = "cet4-progress-v2";

const state = {
  words: [],
  currentIndex: 0,
  reviewIndex: 0,
  view: "learn",
  learnMode: "all",
  quizMode: "all",
  definitionHidden: true,
  quiz: [],
  quizIndex: 0,
  deferredInstall: null,
  progress: {
    known: {},
    review: {},
    today: "",
    todayCount: 0,
    dailyGoal: 30,
    dailyIds: [],
    checkins: {},
  },
};

const els = {
  installBtn: document.querySelector("#installBtn"),
  learnedCount: document.querySelector("#learnedCount"),
  reviewCount: document.querySelector("#reviewCount"),
  todayCount: document.querySelector("#todayCount"),
  goalCount: document.querySelector("#goalCount"),
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".panel"),
  learnRangeMode: document.querySelector("#learnRangeMode"),
  learnCustomRange: document.querySelector("#learnCustomRange"),
  learnStart: document.querySelector("#learnStart"),
  learnEnd: document.querySelector("#learnEnd"),
  quizRangeMode: document.querySelector("#quizRangeMode"),
  quizCustomRange: document.querySelector("#quizCustomRange"),
  quizStart: document.querySelector("#quizStart"),
  quizEnd: document.querySelector("#quizEnd"),
  prevBtn: document.querySelector("#prevBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  randomBtn: document.querySelector("#randomBtn"),
  wordText: document.querySelector("#wordText"),
  phoneticText: document.querySelector("#phoneticText"),
  definitionBox: document.querySelector("#definitionBox"),
  definitionText: document.querySelector("#definitionText"),
  toggleDefinitionBtn: document.querySelector("#toggleDefinitionBtn"),
  hideDefinitionBtn: document.querySelector("#hideDefinitionBtn"),
  speakBtn: document.querySelector("#speakBtn"),
  knownBtn: document.querySelector("#knownBtn"),
  reviewBtn: document.querySelector("#reviewBtn"),
  quizProgress: document.querySelector("#quizProgress"),
  quizDefinition: document.querySelector("#quizDefinition"),
  quizOptions: document.querySelector("#quizOptions"),
  quizFeedback: document.querySelector("#quizFeedback"),
  newQuizBtn: document.querySelector("#newQuizBtn"),
  reviewSummary: document.querySelector("#reviewSummary"),
  reviewWordText: document.querySelector("#reviewWordText"),
  reviewPhoneticText: document.querySelector("#reviewPhoneticText"),
  reviewDefinitionText: document.querySelector("#reviewDefinitionText"),
  reviewSpeakBtn: document.querySelector("#reviewSpeakBtn"),
  reviewRandomBtn: document.querySelector("#reviewRandomBtn"),
  reviewPrevBtn: document.querySelector("#reviewPrevBtn"),
  stillReviewBtn: document.querySelector("#stillReviewBtn"),
  reviewKnownBtn: document.querySelector("#reviewKnownBtn"),
  reviewList: document.querySelector("#reviewList"),
  searchInput: document.querySelector("#searchInput"),
  wordList: document.querySelector("#wordList"),
  alphaRail: document.querySelector("#alphaRail"),
  planStatus: document.querySelector("#planStatus"),
  checkBadge: document.querySelector("#checkBadge"),
  dailyGoalInput: document.querySelector("#dailyGoalInput"),
  goalProgressBar: document.querySelector("#goalProgressBar"),
  startTodayBtn: document.querySelector("#startTodayBtn"),
  checkinBtn: document.querySelector("#checkinBtn"),
  todayWordList: document.querySelector("#todayWordList"),
};

const todayKey = () => new Date().toISOString().slice(0, 10);

function loadProgress() {
  const legacy = localStorage.getItem("cet4-progress");
  const saved = localStorage.getItem(STORAGE_KEY) || legacy;
  if (saved) {
    state.progress = { ...state.progress, ...JSON.parse(saved) };
  }
  resetDailyIfNeeded();
}

function resetDailyIfNeeded() {
  if (state.progress.today !== todayKey()) {
    state.progress.today = todayKey();
    state.progress.todayCount = 0;
    state.progress.dailyIds = [];
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  renderStats();
  renderPlan();
}

function ensureDailyPlan() {
  resetDailyIfNeeded();
  const goal = clampNumber(state.progress.dailyGoal, 1, 500, 30);
  if (state.progress.dailyIds.length !== goal) {
    const known = state.progress.known;
    const current = new Set(state.progress.dailyIds);
    const kept = state.words.filter((word) => current.has(word.id) && !known[word.id]).map((word) => word.id);
    const fill = state.words
      .filter((word) => !known[word.id] && !kept.includes(word.id))
      .slice(0, Math.max(0, goal - kept.length))
      .map((word) => word.id);
    state.progress.dailyIds = [...kept, ...fill].slice(0, goal);
  }
}

function renderStats() {
  els.learnedCount.textContent = Object.keys(state.progress.known).length;
  els.reviewCount.textContent = Object.keys(state.progress.review).length;
  els.todayCount.textContent = state.progress.todayCount;
  els.goalCount.textContent = state.progress.dailyGoal;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function wordsForMode(mode, startInput, endInput) {
  ensureDailyPlan();
  if (mode === "new") {
    return state.words.filter((word) => !state.progress.known[word.id]);
  }
  if (mode === "review") {
    return state.words.filter((word) => state.progress.review[word.id]);
  }
  if (mode === "today") {
    const ids = new Set(state.progress.dailyIds);
    return state.words.filter((word) => ids.has(word.id));
  }
  if (mode === "custom") {
    const start = clampNumber(startInput.value, 1, state.words.length, 1);
    const end = clampNumber(endInput.value, 1, state.words.length, Math.min(100, state.words.length));
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    return state.words.filter((word) => word.id >= min && word.id <= max);
  }
  return state.words;
}

function learnWords() {
  return wordsForMode(state.learnMode, els.learnStart, els.learnEnd);
}

function quizWords() {
  return wordsForMode(state.quizMode, els.quizStart, els.quizEnd);
}

function currentWord() {
  const list = learnWords();
  if (!list.length) return null;
  state.currentIndex = (state.currentIndex + list.length) % list.length;
  return list[state.currentIndex];
}

function currentReviewWord() {
  const list = reviewWords();
  if (!list.length) return null;
  state.reviewIndex = (state.reviewIndex + list.length) % list.length;
  return list[state.reviewIndex];
}

function reviewWords() {
  return state.words.filter((word) => state.progress.review[word.id]);
}

function renderWord() {
  const word = currentWord();
  if (!word) {
    els.wordText.textContent = "完成";
    els.phoneticText.textContent = "";
    els.definitionText.textContent = "这个范围里暂时没有要学习的单词。";
  } else {
    els.wordText.textContent = word.word;
    els.phoneticText.textContent = word.phonetic || "";
    els.definitionText.textContent = word.definition || "";
  }
  renderDefinitionVisibility();
}

function renderDefinitionVisibility() {
  els.definitionBox.classList.toggle("hidden", state.definitionHidden);
  els.toggleDefinitionBtn.textContent = state.definitionHidden ? "显示释义" : "隐藏释义";
  els.hideDefinitionBtn.textContent = state.definitionHidden ? "显示释义" : "隐藏释义";
}

function move(delta) {
  const list = learnWords();
  if (!list.length) return;
  state.currentIndex = (state.currentIndex + delta + list.length) % list.length;
  renderWord();
}

function randomLearnWord() {
  const list = learnWords();
  if (!list.length) return;
  state.currentIndex = Math.floor(Math.random() * list.length);
  renderWord();
}

function markKnown() {
  const word = currentWord();
  if (!word) return;
  markWordKnown(word);
  move(1);
}

function markWordKnown(word) {
  if (!state.progress.known[word.id]) {
    state.progress.todayCount += 1;
  }
  state.progress.known[word.id] = true;
  delete state.progress.review[word.id];
  saveProgress();
}

function markReview() {
  const word = currentWord();
  if (!word) return;
  state.progress.review[word.id] = true;
  saveProgress();
  renderReview();
  move(1);
}

function speak(word) {
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
  const source = quizWords().length >= 4 ? quizWords() : state.words;
  state.quiz = shuffle(source).slice(0, Math.min(10, source.length));
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
    markWordKnown(answer);
    els.quizFeedback.textContent = "答对了";
  }
  saveProgress();
  renderReview();
  window.setTimeout(() => {
    state.quizIndex += 1;
    renderQuiz();
  }, 850);
}

function renderReview() {
  const list = reviewWords();
  els.reviewSummary.textContent = `${list.length} 个单词待复习`;
  const word = currentReviewWord();
  if (!word) {
    els.reviewWordText.textContent = "暂无";
    els.reviewPhoneticText.textContent = "";
    els.reviewDefinitionText.textContent = "学习或测试时加入复习的单词会出现在这里。";
  } else {
    els.reviewWordText.textContent = word.word;
    els.reviewPhoneticText.textContent = word.phonetic || "";
    els.reviewDefinitionText.textContent = word.definition || "";
  }
  renderMiniList(els.reviewList, list.slice(0, 30), (selected) => {
    state.reviewIndex = list.findIndex((wordItem) => wordItem.id === selected.id);
    renderReview();
  });
}

function moveReview(delta) {
  const list = reviewWords();
  if (!list.length) return;
  state.reviewIndex = (state.reviewIndex + delta + list.length) % list.length;
  renderReview();
}

function randomReviewWord() {
  const list = reviewWords();
  if (!list.length) return;
  state.reviewIndex = Math.floor(Math.random() * list.length);
  renderReview();
}

function markReviewKnown() {
  const word = currentReviewWord();
  if (!word) return;
  markWordKnown(word);
  renderReview();
}

function stillReview() {
  moveReview(1);
}

function renderList() {
  const query = els.searchInput.value.trim().toLowerCase();
  const sorted = [...state.words].sort((a, b) => a.word.localeCompare(b.word));
  const matches = sorted.filter((word) => {
    if (!query) return true;
    return word.word.toLowerCase().includes(query) || word.definition.includes(query);
  });

  els.wordList.innerHTML = "";
  const groups = groupByLetter(matches);
  Object.keys(groups).sort().forEach((letter) => {
    const heading = document.createElement("h3");
    heading.className = "letter-heading";
    heading.id = `letter-${letter}`;
    heading.textContent = letter;
    els.wordList.append(heading);
    groups[letter].forEach((word) => els.wordList.append(createWordItem(word)));
  });
  renderAlphaRail(Object.keys(groupByLetter(sorted)).sort());
}

function groupByLetter(words) {
  return words.reduce((groups, word) => {
    const first = (word.word[0] || "#").toUpperCase();
    const letter = first >= "A" && first <= "Z" ? first : "#";
    groups[letter] = groups[letter] || [];
    groups[letter].push(word);
    return groups;
  }, {});
}

function createWordItem(word, onPick = null) {
  const item = document.createElement("article");
  item.className = "list-item";
  item.innerHTML = `<strong>${escapeHtml(word.word)}</strong><span>${escapeHtml(word.phonetic)}</span><p>${escapeHtml(word.definition)}</p>`;
  item.addEventListener("click", () => {
    if (onPick) {
      onPick(word);
      return;
    }
    state.learnMode = "all";
    els.learnRangeMode.value = "all";
    state.currentIndex = state.words.findIndex((entry) => entry.id === word.id);
    switchView("learn");
    renderWord();
  });
  return item;
}

function renderAlphaRail(letters) {
  els.alphaRail.innerHTML = "";
  letters.forEach((letter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = letter;
    button.addEventListener("click", () => {
      document.querySelector(`#letter-${letter}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.alphaRail.append(button);
  });
}

function renderMiniList(container, words, onPick) {
  container.innerHTML = "";
  words.forEach((word) => {
    container.append(createWordItem(word, onPick));
  });
}

function renderPlan() {
  ensureDailyPlan();
  const goal = state.progress.dailyGoal;
  const done = Math.min(state.progress.todayCount, goal);
  const checked = Boolean(state.progress.checkins[todayKey()]);
  els.dailyGoalInput.value = goal;
  els.planStatus.textContent = `今日完成 ${done} / ${goal}`;
  els.goalProgressBar.style.width = `${Math.min(100, Math.round((done / goal) * 100))}%`;
  els.checkBadge.textContent = checked ? "已打卡" : "未打卡";
  els.checkBadge.classList.toggle("done", checked);
  els.checkinBtn.disabled = checked || done < goal;
  const ids = new Set(state.progress.dailyIds);
  const todayWords = state.words.filter((word) => ids.has(word.id));
  renderMiniList(els.todayWordList, todayWords, (word) => {
    state.learnMode = "today";
    els.learnRangeMode.value = "today";
    state.currentIndex = todayWords.findIndex((entry) => entry.id === word.id);
    switchView("learn");
    renderWord();
  });
}

function checkin() {
  if (state.progress.todayCount < state.progress.dailyGoal) return;
  state.progress.checkins[todayKey()] = true;
  saveProgress();
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
  if (view === "review") renderReview();
  if (view === "list") renderList();
  if (view === "plan") renderPlan();
}

function updateCustomVisibility() {
  els.learnCustomRange.hidden = state.learnMode !== "custom";
  els.quizCustomRange.hidden = state.quizMode !== "custom";
}

function bindEvents() {
  els.tabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
  els.learnRangeMode.addEventListener("change", () => {
    state.learnMode = els.learnRangeMode.value;
    state.currentIndex = 0;
    updateCustomVisibility();
    renderWord();
  });
  [els.learnStart, els.learnEnd].forEach((input) => input.addEventListener("change", () => {
    state.currentIndex = 0;
    renderWord();
  }));
  els.quizRangeMode.addEventListener("change", () => {
    state.quizMode = els.quizRangeMode.value;
    updateCustomVisibility();
    buildQuiz();
  });
  [els.quizStart, els.quizEnd].forEach((input) => input.addEventListener("change", buildQuiz));
  els.prevBtn.addEventListener("click", () => move(-1));
  els.nextBtn.addEventListener("click", () => move(1));
  els.randomBtn.addEventListener("click", randomLearnWord);
  els.knownBtn.addEventListener("click", markKnown);
  els.reviewBtn.addEventListener("click", markReview);
  els.speakBtn.addEventListener("click", () => speak(currentWord()));
  els.toggleDefinitionBtn.addEventListener("click", () => {
    state.definitionHidden = !state.definitionHidden;
    renderDefinitionVisibility();
  });
  els.hideDefinitionBtn.addEventListener("click", () => {
    state.definitionHidden = !state.definitionHidden;
    renderDefinitionVisibility();
  });
  els.newQuizBtn.addEventListener("click", buildQuiz);
  els.reviewSpeakBtn.addEventListener("click", () => speak(currentReviewWord()));
  els.reviewRandomBtn.addEventListener("click", randomReviewWord);
  els.reviewPrevBtn.addEventListener("click", () => moveReview(-1));
  els.stillReviewBtn.addEventListener("click", stillReview);
  els.reviewKnownBtn.addEventListener("click", markReviewKnown);
  els.searchInput.addEventListener("input", renderList);
  els.dailyGoalInput.addEventListener("change", () => {
    state.progress.dailyGoal = clampNumber(els.dailyGoalInput.value, 1, 500, 30);
    state.progress.dailyIds = [];
    saveProgress();
  });
  els.startTodayBtn.addEventListener("click", () => {
    state.learnMode = "today";
    els.learnRangeMode.value = "today";
    state.currentIndex = 0;
    updateCustomVisibility();
    switchView("learn");
    renderWord();
  });
  els.checkinBtn.addEventListener("click", checkin);

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
  updateCustomVisibility();
  const response = await fetch("data/words.json");
  state.words = await response.json();
  els.learnEnd.value = Math.min(100, state.words.length);
  els.quizEnd.value = Math.min(100, state.words.length);
  ensureDailyPlan();
  renderStats();
  renderWord();
  renderReview();
  renderList();
  buildQuiz();
  renderPlan();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
}

init();
