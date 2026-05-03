const resultList = document.querySelector("#resultList");
const savedList = document.querySelector("#savedList");
const gameCount = document.querySelector("#gameCount");
const includeBonus = document.querySelector("#includeBonus");
const excludeLastDraw = document.querySelector("#excludeLastDraw");
const oddEvenRatio = document.querySelector("#oddEvenRatio");
const sumRange = document.querySelector("#sumRange");
const generateButton = document.querySelector("#generateButton");
const copyButton = document.querySelector("#copyButton");
const clearButton = document.querySelector("#clearButton");
const topThemeButton = document.querySelector("#topThemeButton");
const soundButton = document.querySelector("#soundButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const deleteSavedButton = document.querySelector("#deleteSavedButton");
const totalGames = document.querySelector("#totalGames");
const favoriteRange = document.querySelector("#favoriteRange");
const lastGenerated = document.querySelector("#lastGenerated");
const toastEl = document.querySelector("#toast");
const savedCount = document.querySelector("#savedCount");
const moonIcon = document.querySelector("#moonIcon");
const sunIcon = document.querySelector("#sunIcon");
const soundIconOn = document.querySelector("#soundIconOn");
const soundIconOff = document.querySelector("#soundIconOff");
const expandIcon = document.querySelector("#expandIcon");
const compressIcon = document.querySelector("#compressIcon");
const hotNumbers = document.querySelector("#hotNumbers");
const coldNumbers = document.querySelector("#coldNumbers");
const lastDrawNumbers = document.querySelector("#lastDrawNumbers");
const frequencyChart = document.querySelector("#frequencyChart");
const activeFilterCount = document.querySelector("#activeFilterCount");
const candidateSignal = document.querySelector("#candidateSignal");
const generatedSum = document.querySelector("#generatedSum");
const constraintBars = document.querySelector("#constraintBars");
const analysisDrawRange = document.querySelector("#analysisDrawRange");

const STORAGE_KEY = "lotto.saved.games";
const THEME_KEY = "lotto.theme";
const SOUND_KEY = "lotto.sound";

let currentGames = [];
let toastTimer = null;
let soundEnabled = localStorage.getItem(SOUND_KEY) !== "false";
let audioCtx = null;
const recentDraws = createRecentDrawSample(100);
const lastDraw = recentDraws[recentDraws.length - 1];

// ─── Toast ───────────────────────────────────────────
function showToast(message, duration = 2000) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), duration);
}

// ─── Sound ───────────────────────────────────────────
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playBallSound(number, delayMs) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const when = ctx.currentTime + delayMs / 1000;
    const baseFreq = 420 + (number / 45) * 360;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq * 1.6, when);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, when + 0.06);

    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.1, when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);

    osc.start(when);
    osc.stop(when + 0.18);
  } catch {
    // AudioContext blocked — ignore
  }
}

function updateSoundUI() {
  soundIconOn.style.display = soundEnabled ? "" : "none";
  soundIconOff.style.display = soundEnabled ? "none" : "";
  soundButton.classList.toggle("on", soundEnabled);
  soundButton.title = soundEnabled ? "소리 끄기" : "소리 켜기";
}

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem(SOUND_KEY, soundEnabled);
  updateSoundUI();
  showToast(soundEnabled ? "소리 켜짐" : "소리 꺼짐");
});

// ─── Theme ───────────────────────────────────────────
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
  // Light mode → show moon (click to go dark); Dark mode → show sun (click to go light)
  moonIcon.style.display = theme === "dark" ? "none" : "";
  sunIcon.style.display = theme === "dark" ? "" : "none";
}

topThemeButton.addEventListener("click", () => {
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
});

// ─── Fullscreen ───────────────────────────────────────
function updateFullscreenUI() {
  const isFs = !!document.fullscreenElement;
  expandIcon.style.display = isFs ? "none" : "";
  compressIcon.style.display = isFs ? "" : "none";
  fullscreenButton.title = isFs ? "전체 화면 종료" : "전체 화면";
}

fullscreenButton.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      showToast("전체 화면을 지원하지 않는 환경입니다.");
    });
  } else {
    document.exitFullscreen();
  }
});

document.addEventListener("fullscreenchange", updateFullscreenUI);

// ─── Storage ──────────────────────────────────────────
function loadSavedGames() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveGames(games) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

// ─── Number utils ────────────────────────────────────
function randomNumbers(size, max) {
  const numbers = new Set();
  while (numbers.size < size) {
    numbers.add(getRandomInt(max) + 1);
  }
  return [...numbers].sort((a, b) => a - b);
}

function getRandomInt(maxExclusive) {
  const cryptoApi = window.crypto || window.msCrypto;

  if (!cryptoApi?.getRandomValues) {
    return Math.floor(Math.random() * maxExclusive);
  }

  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % maxExclusive);
  const values = new Uint32Array(1);

  do {
    cryptoApi.getRandomValues(values);
  } while (values[0] >= limit);

  return values[0] % maxExclusive;
}

function createRecentDrawSample(count) {
  const draws = [];
  let seed = 20260503;

  function nextSeededInt(maxExclusive) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % maxExclusive;
  }

  for (let i = 0; i < count; i += 1) {
    const numbers = new Set();
    while (numbers.size < 6) {
      numbers.add(nextSeededInt(45) + 1);
    }
    draws.push([...numbers].sort((a, b) => a - b));
  }

  return draws;
}

function getNumberFrequency(draws) {
  const frequency = Array.from({ length: 45 }, (_, index) => ({
    number: index + 1,
    count: 0,
  }));

  draws.flat().forEach((number) => {
    frequency[number - 1].count += 1;
  });

  return frequency;
}

function createNumberPill(number, count = null) {
  const pill = document.createElement("span");
  pill.className = `mini-ball ${numberClass(number)}`;
  pill.textContent = count === null ? number : `${number}(${count})`;
  return pill;
}

function renderAnalysisDashboard() {
  const frequency = getNumberFrequency(recentDraws);
  const sorted = [...frequency].sort((a, b) => b.count - a.count || a.number - b.number);
  const maxCount = Math.max(...frequency.map((item) => item.count));

  analysisDrawRange.textContent = `최근 ${recentDraws.length}회차 샘플`;
  hotNumbers.replaceChildren(...sorted.slice(0, 6).map((item) => createNumberPill(item.number, item.count)));
  coldNumbers.replaceChildren(...sorted.slice(-6).reverse().map((item) => createNumberPill(item.number, item.count)));
  lastDrawNumbers.replaceChildren(...lastDraw.map((number) => createNumberPill(number)));

  frequencyChart.replaceChildren();
  frequency.forEach((item) => {
    const bar = document.createElement("div");
    bar.className = "frequency-bar";
    bar.style.setProperty("--bar-height", `${Math.max(8, (item.count / maxCount) * 100)}%`);
    bar.title = `${item.number}번: ${item.count}회`;

    const fill = document.createElement("span");
    fill.className = "frequency-fill";
    const label = document.createElement("em");
    label.textContent = item.number;
    bar.append(fill, label);
    frequencyChart.append(bar);
  });
}

function getActiveFilters() {
  return {
    excludeLast: excludeLastDraw.checked,
    ratio: oddEvenRatio.value,
    sum: sumRange.value,
  };
}

function getFilterCount(filters = getActiveFilters()) {
  return [filters.excludeLast, filters.ratio !== "any", filters.sum !== "any"].filter(Boolean).length;
}

function parseRange(value) {
  if (value === "any") return null;
  const [min, max] = value.split("-").map(Number);
  return { min, max };
}

function matchesFilters(numbers, filters = getActiveFilters()) {
  if (filters.excludeLast && numbers.some((number) => lastDraw.includes(number))) {
    return false;
  }

  if (filters.ratio !== "any") {
    const [oddTarget, evenTarget] = filters.ratio.split("-").map(Number);
    const oddCount = numbers.filter((number) => number % 2 === 1).length;
    if (oddCount !== oddTarget || numbers.length - oddCount !== evenTarget) {
      return false;
    }
  }

  const range = parseRange(filters.sum);
  if (range) {
    const sum = numbers.reduce((total, number) => total + number, 0);
    if (sum < range.min || sum > range.max) {
      return false;
    }
  }

  return true;
}

function generateFilteredNumbers() {
  const filters = getActiveFilters();

  for (let attempt = 0; attempt < 5000; attempt += 1) {
    const numbers = randomNumbers(6, 45);
    if (matchesFilters(numbers, filters)) {
      return numbers;
    }
  }

  showToast("조건이 너무 좁아 기본 무작위 조합으로 생성했습니다.");
  return randomNumbers(6, 45);
}

function renderFilterSummary() {
  const filters = getActiveFilters();
  const count = getFilterCount(filters);
  const latestSums = currentGames.map((game) => game.numbers.reduce((total, number) => total + number, 0));
  const averageSum = latestSums.length
    ? Math.round(latestSums.reduce((total, sum) => total + sum, 0) / latestSums.length)
    : null;

  activeFilterCount.textContent = `${count}개`;
  candidateSignal.textContent = count === 0 ? "기본" : count === 1 ? "낮음" : count === 2 ? "중간" : "높음";
  generatedSum.textContent = averageSum ? `${averageSum}` : "-";

  const rows = [
    { label: "직전 회차 제외", active: filters.excludeLast },
    { label: "홀짝 비율 고정", active: filters.ratio !== "any" },
    { label: "총합 구간 제한", active: filters.sum !== "any" },
  ];

  constraintBars.replaceChildren();
  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "constraint-row";
    item.innerHTML = `<span>${row.label}</span><strong>${row.active ? "적용" : "자유"}</strong>`;
    item.style.setProperty("--constraint-width", row.active ? "100%" : "28%");
    constraintBars.append(item);
  });
}

function numberClass(number) {
  if (number <= 10) return "range-1";
  if (number <= 20) return "range-2";
  if (number <= 30) return "range-3";
  if (number <= 40) return "range-4";
  return "range-5";
}

// ─── DOM builders ────────────────────────────────────
function createBall(number, animDelay) {
  const ball = document.createElement("span");
  ball.className = `ball ${numberClass(number)}`;
  ball.textContent = number;
  if (animDelay !== undefined) {
    ball.classList.add("animate");
    ball.style.animationDelay = `${animDelay}s`;
  }
  return ball;
}

function createGameCard(game, index, canSave = false, onDelete = null) {
  const card = document.createElement("article");
  card.className = "game-card";

  if (canSave) {
    const cardDelay = index * 0.08;
    card.style.animationDelay = `${cardDelay}s`;

    const gameIndex = document.createElement("span");
    gameIndex.className = "game-index";
    gameIndex.textContent = index + 1;
    card.append(gameIndex);

    const balls = document.createElement("div");
    balls.className = "balls";
    game.numbers.forEach((number, i) => {
      balls.append(createBall(number, cardDelay + i * 0.035));
    });
    if (game.bonus) {
      const mark = document.createElement("span");
      mark.className = "bonus-mark";
      mark.textContent = "+";
      balls.append(mark, createBall(game.bonus, cardDelay + game.numbers.length * 0.035));
    }
    card.append(balls);

    const saveButton = document.createElement("button");
    saveButton.className = "save-button";
    saveButton.type = "button";
    saveButton.textContent = "저장";
    saveButton.addEventListener("click", () => {
      const saved = loadSavedGames();
      saved.unshift(game);
      saveGames(saved.slice(0, 30));
      renderSaved();
      showToast("조합이 저장되었습니다.");
    });
    card.append(saveButton);
  } else {
    const balls = document.createElement("div");
    balls.className = "balls";
    game.numbers.forEach((number) => balls.append(createBall(number)));
    if (game.bonus) {
      const mark = document.createElement("span");
      mark.className = "bonus-mark";
      mark.textContent = "+";
      balls.append(mark, createBall(game.bonus));
    }
    card.append(balls);

    if (onDelete) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-saved-btn";
      deleteBtn.type = "button";
      deleteBtn.title = "삭제";
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", onDelete);
      card.append(deleteBtn);
    }
  }

  return card;
}

// ─── Render ───────────────────────────────────────────
function renderResults() {
  resultList.replaceChildren();
  if (currentGames.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "번호 생성 버튼을 누르면 추천 조합이 표시됩니다.";
    resultList.append(empty);
    return;
  }
  currentGames.forEach((game, index) => {
    resultList.append(createGameCard(game, index, true));
  });
}

function renderSaved() {
  const saved = loadSavedGames();
  savedList.replaceChildren();
  savedCount.textContent = saved.length || "";

  if (saved.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "마음에 드는 조합을 저장해 보세요.";
    savedList.append(empty);
    return;
  }

  saved.forEach((game, index) => {
    const card = createGameCard(game, index, false, () => {
      const updated = loadSavedGames().filter((_, i) => i !== index);
      saveGames(updated);
      renderSaved();
      showToast("삭제되었습니다.");
    });
    savedList.append(card);
  });
}

function updateStats() {
  const flatNumbers = currentGames.flatMap((game) => game.numbers);
  const ranges = [
    { label: "1-10",  count: flatNumbers.filter((n) => n <= 10).length },
    { label: "11-20", count: flatNumbers.filter((n) => n > 10 && n <= 20).length },
    { label: "21-30", count: flatNumbers.filter((n) => n > 20 && n <= 30).length },
    { label: "31-40", count: flatNumbers.filter((n) => n > 30 && n <= 40).length },
    { label: "41-45", count: flatNumbers.filter((n) => n > 40).length },
  ];
  const topRange = ranges.sort((a, b) => b.count - a.count)[0];

  totalGames.textContent = currentGames.length;
  favoriteRange.textContent = currentGames.length ? topRange.label : "-";
  lastGenerated.textContent = currentGames.length
    ? new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date())
    : "-";
}

// ─── Generate ────────────────────────────────────────
function generateGames() {
  const count = Number(gameCount.value);
  currentGames = Array.from({ length: count }, () => {
    const numbers = generateFilteredNumbers();
    const bonusPool = Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => !numbers.includes(n));
    return {
      numbers,
      bonus: includeBonus.checked ? bonusPool[getRandomInt(bonusPool.length)] : null,
    };
  });

  renderResults();
  updateStats();
  renderFilterSummary();

  // Play staggered ball sounds matching the visual animation timing
  currentGames.forEach((game, cardIndex) => {
    const cardDelay = cardIndex * 80;
    game.numbers.forEach((number, ballIndex) => {
      playBallSound(number, cardDelay + ballIndex * 35);
    });
    if (game.bonus) {
      playBallSound(game.bonus, cardDelay + game.numbers.length * 35);
    }
  });
}

// ─── Copy ────────────────────────────────────────────
async function copyCurrentGames() {
  if (currentGames.length === 0) {
    showToast("복사할 번호가 없습니다.");
    return;
  }
  const text = currentGames
    .map((game, index) => {
      const base = `${index + 1}게임: ${game.numbers.join(", ")}`;
      return game.bonus ? `${base} + 보너스 ${game.bonus}` : base;
    })
    .join("\n");
  try {
    await navigator.clipboard.writeText(text);
    showToast("클립보드에 복사되었습니다!");
  } catch {
    showToast("브라우저에서 복사를 허용해 주세요.");
  }
}

function clearResults() {
  currentGames = [];
  renderResults();
  updateStats();
  renderFilterSummary();
}

// ─── Keyboard shortcut ───────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    generateGames();
  }
});

// ─── Event listeners ──────────────────────────────────
generateButton.addEventListener("click", generateGames);
copyButton.addEventListener("click", copyCurrentGames);
clearButton.addEventListener("click", clearResults);
excludeLastDraw.addEventListener("change", renderFilterSummary);
oddEvenRatio.addEventListener("change", renderFilterSummary);
sumRange.addEventListener("change", renderFilterSummary);
deleteSavedButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderSaved();
  showToast("저장된 조합이 모두 삭제되었습니다.");
});

// ─── FAQ accordion ───────────────────────────────────
document.querySelectorAll(".faq-question").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".faq-item");
    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item.open").forEach((el) => {
      el.classList.remove("open");
      el.querySelector(".faq-question").setAttribute("aria-expanded", "false");
    });
    if (!isOpen) {
      item.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
    }
  });
});

// ─── Init ────────────────────────────────────────────
applyTheme(localStorage.getItem(THEME_KEY) || "light");
updateSoundUI();
updateFullscreenUI();
renderAnalysisDashboard();
renderFilterSummary();
renderResults();
renderSaved();
updateStats();
