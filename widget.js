const STORAGE_KEY = "cet4-progress-v2";

const els = {
  checkBadge: document.querySelector("#widgetCheckBadge"),
  percent: document.querySelector("#widgetPercent"),
  progressBar: document.querySelector("#widgetProgressBar"),
  todayCount: document.querySelector("#widgetTodayCount"),
  goalCount: document.querySelector("#widgetGoalCount"),
  knownCount: document.querySelector("#widgetKnownCount"),
  reviewCount: document.querySelector("#widgetReviewCount"),
  note: document.querySelector("#widgetNote"),
};

const todayKey = () => new Date().toISOString().slice(0, 10);

function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("cet4-progress");
  const fallback = {
    known: {},
    review: {},
    today: todayKey(),
    todayCount: 0,
    dailyGoal: 30,
    checkins: {},
  };
  if (!raw) return fallback;
  return { ...fallback, ...JSON.parse(raw) };
}

function render() {
  const progress = loadProgress();
  const isToday = progress.today === todayKey();
  const todayCount = isToday ? Number(progress.todayCount || 0) : 0;
  const goal = Math.max(1, Number(progress.dailyGoal || 30));
  const percent = Math.min(100, Math.round((todayCount / goal) * 100));
  const checked = Boolean(progress.checkins?.[todayKey()]);

  els.todayCount.textContent = todayCount;
  els.goalCount.textContent = goal;
  els.knownCount.textContent = Object.keys(progress.known || {}).length;
  els.reviewCount.textContent = Object.keys(progress.review || {}).length;
  els.percent.textContent = `${percent}%`;
  els.progressBar.style.width = `${percent}%`;
  document.querySelector(".widget-ring").style.background = `
    radial-gradient(circle at center, var(--panel) 0 55%, transparent 56%),
    conic-gradient(var(--green) 0 ${percent}%, #e9eee7 ${percent}% 100%)
  `;
  els.checkBadge.textContent = checked ? "已打卡" : "未打卡";
  els.checkBadge.classList.toggle("done", checked);
  els.note.textContent = checked ? "今天已经完成，继续保持。" : `还差 ${Math.max(0, goal - todayCount)} 个词完成今日目标。`;
}

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
