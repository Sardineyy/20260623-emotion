// API 키는 브라우저에 넣지 않습니다.
// Vercel 서버(api/analyze.js)가 환경 변수 GEMINI_API_KEY로 Gemini를 호출합니다.
const ANALYZE_API_URL = "/api/analyze";

const STORAGE_KEY = "ai-emotion-diary-entries";

// 감정별 바 색상
const EMOTION_COLORS = {
  기쁨: "#fbbf24",
  행복: "#fbbf24",
  슬픔: "#60a5fa",
  불안: "#a78bfa",
  분노: "#f87171",
  화남: "#f87171",
  평온: "#34d399",
  감사: "#f472b6",
  피로: "#94a3b8",
  외로움: "#818cf8",
  설렘: "#fb923c",
  default: "#c4b5fd",
};

// ===== DOM 요소 =====
const diaryDate = document.getElementById("diary-date");
const diaryContent = document.getElementById("diary-content");
const charCount = document.getElementById("char-count");
const analyzeBtn = document.getElementById("analyze-btn");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const resultEmoji = document.getElementById("result-emoji");
const emotionBars = document.getElementById("emotion-bars");
const encouragement = document.getElementById("encouragement");
const saveBtn = document.getElementById("save-btn");
const errorMsg = document.getElementById("error-msg");

const viewListBtn = document.getElementById("view-list");
const viewCalendarBtn = document.getElementById("view-calendar");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const currentMonthLabel = document.getElementById("current-month-label");
const monthSummary = document.getElementById("month-summary");
const listView = document.getElementById("list-view");
const calendarView = document.getElementById("calendar-view");
const calendarGrid = document.getElementById("calendar-grid");
const emptyState = document.getElementById("empty-state");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalClose = document.getElementById("modal-close");
const modalTitle = document.getElementById("modal-title");
const modalDate = document.getElementById("modal-date");
const modalEmotions = document.getElementById("modal-emotions");
const modalContent = document.getElementById("modal-content");
const modalEncouragement = document.getElementById("modal-encouragement");
const modalDelete = document.getElementById("modal-delete");

// ===== 상태 =====
let currentAnalysis = null;
let currentView = "list";
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let selectedEntryId = null;

// ===== 초기화 =====
function init() {
  const today = formatDateInput(new Date());
  diaryDate.value = today;
  diaryDate.max = today;

  loadAndRender();
  bindEvents();
}

function bindEvents() {
  diaryContent.addEventListener("input", () => {
    charCount.textContent = diaryContent.value.length;
  });

  analyzeBtn.addEventListener("click", analyzeEmotion);
  saveBtn.addEventListener("click", saveDiary);

  viewListBtn.addEventListener("click", () => switchView("list"));
  viewCalendarBtn.addEventListener("click", () => switchView("calendar"));
  prevMonthBtn.addEventListener("click", () => changeMonth(-1));
  nextMonthBtn.addEventListener("click", () => changeMonth(1));

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
  modalDelete.addEventListener("click", deleteSelectedEntry);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

// ===== Local Storage =====
function getEntries() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${y}년 ${m}월 ${d}일 (${weekdays[date.getDay()]})`;
}

function formatMonthLabel(year, month) {
  return `${year}년 ${month + 1}월`;
}

// ===== Gemini API =====
async function analyzeEmotion() {
  const content = diaryContent.value.trim();
  const date = diaryDate.value;

  hideError();

  if (!content) {
    showError("일기 내용을 입력해 주세요.");
    return;
  }

  if (!date) {
    showError("날짜를 선택해 주세요.");
    return;
  }

  setLoading(true);
  result.classList.add("hidden");
  currentAnalysis = null;

  try {
    const response = await fetch(ANALYZE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, content }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `API 요청 실패 (상태 코드: ${response.status})`);
    }

    currentAnalysis = {
      date,
      content,
      dominantEmoji: data.dominantEmoji,
      emotions: data.emotions,
      encouragement: data.encouragement,
      analyzedAt: new Date().toISOString(),
    };

    renderAnalysisResult(currentAnalysis);
    result.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showError(err.message || "감정 분석 중 오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
}

function renderAnalysisResult(analysis) {
  resultEmoji.textContent = analysis.dominantEmoji;
  encouragement.textContent = analysis.encouragement;

  emotionBars.innerHTML = analysis.emotions
    .sort((a, b) => b.percentage - a.percentage)
    .map((emo) => {
      const color = EMOTION_COLORS[emo.name] || EMOTION_COLORS.default;
      return `
        <div class="emotion-item">
          <span class="emotion-emoji">${emo.emoji}</span>
          <div class="emotion-info">
            <div class="emotion-label-row">
              <span class="emotion-name">${emo.name}</span>
              <span class="emotion-percent">${emo.percentage}%</span>
            </div>
            <div class="emotion-bar-track">
              <div class="emotion-bar-fill" style="width: 0%; background: ${color};" data-width="${emo.percentage}%"></div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  requestAnimationFrame(() => {
    emotionBars.querySelectorAll(".emotion-bar-fill").forEach((bar) => {
      bar.style.width = bar.dataset.width;
    });
  });
}

function saveDiary() {
  if (!currentAnalysis) return;

  const entries = getEntries();
  const existingIndex = entries.findIndex((e) => e.date === currentAnalysis.date);

  const entry = {
    id: existingIndex >= 0 ? entries[existingIndex].id : crypto.randomUUID(),
    ...currentAnalysis,
    savedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));
  saveEntries(entries);

  const [y, m] = currentAnalysis.date.split("-").map(Number);
  viewYear = y;
  viewMonth = m - 1;

  loadAndRender();

  saveBtn.textContent = "저장 완료! ✓";
  setTimeout(() => {
    saveBtn.textContent = "일기 저장하기";
  }, 2000);
}

// ===== 뷰 렌더링 =====
function loadAndRender() {
  const entries = getEntries();
  const monthEntries = getMonthEntries(entries, viewYear, viewMonth);

  currentMonthLabel.textContent = formatMonthLabel(viewYear, viewMonth);
  renderMonthSummary(monthEntries);

  if (monthEntries.length === 0 && entries.length === 0) {
    emptyState.classList.remove("hidden");
    listView.innerHTML = "";
    calendarGrid.innerHTML = "";
  } else {
    emptyState.classList.add("hidden");
    if (currentView === "list") {
      renderListView(monthEntries);
    } else {
      renderCalendarView(monthEntries);
    }
  }
}

function getMonthEntries(entries, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return entries.filter((e) => e.date.startsWith(prefix));
}

function renderMonthSummary(monthEntries) {
  if (monthEntries.length === 0) {
    monthSummary.innerHTML = '<span class="month-summary-empty">이 달에 기록된 감정이 아직 없어요</span>';
    return;
  }

  const emotionMap = {};

  monthEntries.forEach((entry) => {
    entry.emotions.forEach((emo) => {
      const key = emo.name;
      if (!emotionMap[key]) {
        emotionMap[key] = { name: emo.name, emoji: emo.emoji, total: 0, count: 0 };
      }
      emotionMap[key].total += emo.percentage;
      emotionMap[key].count += 1;
    });
  });

  const sorted = Object.values(emotionMap)
    .map((e) => ({ ...e, avg: Math.round(e.total / e.count) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  monthSummary.innerHTML = sorted
    .map(
      (e) => `
      <span class="summary-chip">
        <span class="summary-chip-emoji">${e.emoji}</span>
        ${e.name} ${e.avg}%
      </span>
    `
    )
    .join("");
}

function renderListView(monthEntries) {
  if (monthEntries.length === 0) {
    listView.innerHTML =
      '<p class="empty-state" style="padding:1.5rem">이 달에 작성된 일기가 없어요</p>';
    return;
  }

  listView.innerHTML = monthEntries
    .map(
      (entry) => `
      <div class="diary-item" data-id="${entry.id}" role="button" tabindex="0" aria-label="${formatDateDisplay(entry.date)} 일기 보기">
        <span class="diary-item-emoji">${entry.dominantEmoji}</span>
        <div class="diary-item-info">
          <div class="diary-item-date">${formatDateDisplay(entry.date)}</div>
          <div class="diary-item-preview">${escapeHtml(entry.content)}</div>
        </div>
        <div class="diary-item-emotions">
          ${entry.emotions
            .slice(0, 3)
            .map((e) => `<span title="${e.name} ${e.percentage}%">${e.emoji}</span>`)
            .join("")}
        </div>
      </div>
    `
    )
    .join("");

  listView.querySelectorAll(".diary-item").forEach((item) => {
    item.addEventListener("click", () => openModal(item.dataset.id));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(item.dataset.id);
      }
    });
  });
}

function renderCalendarView(monthEntries) {
  const entryMap = {};
  monthEntries.forEach((e) => {
    const day = parseInt(e.date.split("-")[2], 10);
    entryMap[day] = e;
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = formatDateInput(new Date());

  let html = "";

  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = entryMap[day];
    const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
    const isToday = dateStr === todayStr;

    let classes = "calendar-day";
    if (dayOfWeek === 0) classes += " sunday";
    if (dayOfWeek === 6) classes += " saturday";
    if (isToday) classes += " today";
    if (entry) classes += " has-entry";

    html += `
      <div class="${classes}" data-id="${entry ? entry.id : ""}" ${entry ? 'role="button" tabindex="0"' : ""}>
        <span class="calendar-day-num">${day}</span>
        ${entry ? `<span class="calendar-day-emoji">${entry.dominantEmoji}</span>` : ""}
      </div>
    `;
  }

  calendarGrid.innerHTML = html;

  calendarGrid.querySelectorAll(".calendar-day.has-entry").forEach((cell) => {
    cell.addEventListener("click", () => openModal(cell.dataset.id));
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(cell.dataset.id);
      }
    });
  });
}

function switchView(view) {
  currentView = view;
  viewListBtn.classList.toggle("active", view === "list");
  viewCalendarBtn.classList.toggle("active", view === "calendar");
  viewListBtn.setAttribute("aria-pressed", view === "list");
  viewCalendarBtn.setAttribute("aria-pressed", view === "calendar");

  listView.classList.toggle("hidden", view !== "list");
  calendarView.classList.toggle("hidden", view !== "calendar");

  loadAndRender();
}

function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear += 1;
  } else if (viewMonth < 0) {
    viewMonth = 11;
    viewYear -= 1;
  }
  loadAndRender();
}

// ===== 모달 =====
function openModal(id) {
  const entry = getEntries().find((e) => e.id === id);
  if (!entry) return;

  selectedEntryId = id;
  modalTitle.textContent = "일기 상세";
  modalDate.textContent = formatDateDisplay(entry.date);
  modalContent.textContent = entry.content;
  modalEncouragement.textContent = entry.encouragement;

  modalEmotions.innerHTML = entry.emotions
    .map(
      (e) => `
      <span class="modal-emotion-tag">
        ${e.emoji} ${e.name} ${e.percentage}%
      </span>
    `
    )
    .join("");

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  selectedEntryId = null;
}

function deleteSelectedEntry() {
  if (!selectedEntryId) return;
  if (!confirm("이 일기를 삭제할까요?")) return;

  const entries = getEntries().filter((e) => e.id !== selectedEntryId);
  saveEntries(entries);
  closeModal();
  loadAndRender();
}

// ===== 유틸리티 =====
function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  loading.classList.toggle("hidden", !isLoading);
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 앱 시작
init();
