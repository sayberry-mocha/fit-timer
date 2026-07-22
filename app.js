const STORAGE_KEYS = {
  session: "fit-timer:session:v1",
  history: "fit-timer:history:v1",
  settings: "fit-timer:settings:v1",
};

// 운동 프로그램과 휴식 시간을 이 객체에서 바로 수정합니다.
const PROGRAM_CONFIG = {
  version: 1,
  restSeconds: 60,
  programs: [
    {
      id: "large-muscle",
      name: "대근육",
      description: "6가지 운동을 차례로 진행합니다.",
      accent: "#ff7958",
      exercises: [
        { name: "DFP", sets: 3 },
        { name: "D-RDL", sets: 3 },
        { name: "D-BO-R", sets: 3 },
        { name: "DS", sets: 3 },
        { name: "OTE", sets: 3 },
        { name: "ADC", sets: 3 },
      ],
    },
    {
      id: "medium-muscle",
      name: "중근육",
      description: "2가지 운동에 집중합니다.",
      accent: "#68a989",
      exercises: [
        { name: "OTE", sets: 3 },
        { name: "ADC", sets: 3 },
      ],
    },
    {
      id: "small-muscle",
      name: "소근육",
      description: "3가지 운동을 꼼꼼히 진행합니다.",
      accent: "#e8ae45",
      exercises: [
        { name: "HG", sets: 3 },
        { name: "DB", sets: 3 },
        { name: "P", sets: 3 },
      ],
    },
  ],
};

const SCREEN_IDS = ["loading-screen", "select-screen", "workout-screen", "complete-screen", "error-screen"];
const DEFAULT_TITLE = "핏타이머";
const HISTORY_LIMIT = 20;

const elements = {
  themeColor: document.querySelector("#theme-color"),
  homeButton: document.querySelector("#home-button"),
  soundToggle: document.querySelector("#sound-toggle"),
  soundLabel: document.querySelector("#sound-label"),
  programList: document.querySelector("#program-list"),
  historySection: document.querySelector("#history-section"),
  historyList: document.querySelector("#history-list"),
  clearHistoryButton: document.querySelector("#clear-history-button"),
  programName: document.querySelector("#program-name"),
  changeProgramButton: document.querySelector("#change-program-button"),
  overallProgressText: document.querySelector("#overall-progress-text"),
  overallProgress: document.querySelector("#overall-progress"),
  overallProgressBar: document.querySelector("#overall-progress-bar"),
  exerciseView: document.querySelector("#exercise-view"),
  exerciseName: document.querySelector("#exercise-name"),
  setLabel: document.querySelector("#set-label"),
  setDots: document.querySelector("#set-dots"),
  encouragement: document.querySelector("#encouragement"),
  restView: document.querySelector("#rest-view"),
  restPhaseLabel: document.querySelector("#rest-phase-label"),
  restTitle: document.querySelector("#rest-title"),
  timerDisplay: document.querySelector("#timer-display"),
  restContext: document.querySelector("#rest-context"),
  nextUp: document.querySelector("#next-up"),
  nextUpText: document.querySelector("#next-up-text"),
  actionHint: document.querySelector("#action-hint"),
  primaryAction: document.querySelector("#primary-action"),
  summaryProgram: document.querySelector("#summary-program"),
  summarySets: document.querySelector("#summary-sets"),
  summaryDuration: document.querySelector("#summary-duration"),
  repeatProgramButton: document.querySelector("#repeat-program-button"),
  chooseProgramButton: document.querySelector("#choose-program-button"),
  retryButton: document.querySelector("#retry-button"),
  liveRegion: document.querySelector("#live-region"),
};

let config = null;
let activeSession = null;
let lastCompletedSession = null;
let timerInterval = null;
let audioContext = null;
let soundEnabled = true;
let primaryActionUnlockTimer = null;
let primaryActionLocked = false;

init();

function init() {
  bindEvents();
  restoreSettings();
  loadPrograms();
}

function bindEvents() {
  elements.programList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-program-id]");
    if (card) startProgram(card.dataset.programId);
  });

  elements.primaryAction.addEventListener("click", handlePrimaryAction);
  elements.changeProgramButton.addEventListener("click", requestProgramChange);
  elements.homeButton.addEventListener("click", requestProgramChange);
  elements.soundToggle.addEventListener("click", toggleSound);
  elements.clearHistoryButton.addEventListener("click", clearHistory);
  elements.repeatProgramButton.addEventListener("click", () => {
    if (lastCompletedSession) startProgram(lastCompletedSession.programId);
  });
  elements.chooseProgramButton.addEventListener("click", showProgramSelection);
  elements.retryButton.addEventListener("click", loadPrograms);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && activeSession?.phase === "resting") updateTimer();
  });
}

function loadPrograms() {
  stopTimer();
  showScreen("loading-screen");

  try {
    validateConfig(PROGRAM_CONFIG);
    config = PROGRAM_CONFIG;
    renderProgramCards();
    renderHistory();

    activeSession = restoreSession();
    if (activeSession) {
      reconcileRestTimer();
      renderWorkout();
      showScreen("workout-screen");
      if (activeSession.phase === "resting") startTimer();
    } else {
      showProgramSelection();
    }
  } catch (error) {
    console.error(error);
    showScreen("error-screen");
  }
}

function validateConfig(candidate) {
  if (
    !candidate ||
    !Number.isInteger(candidate.version) ||
    !Number.isFinite(candidate.restSeconds) ||
    candidate.restSeconds <= 0
  ) {
    throw new Error("올바른 휴식 시간이 없습니다.");
  }

  if (!Array.isArray(candidate.programs) || candidate.programs.length === 0) {
    throw new Error("운동 프로그램이 비어 있습니다.");
  }

  const ids = new Set();
  candidate.programs.forEach((program) => {
    if (!program?.id || !program?.name || ids.has(program.id) || !Array.isArray(program.exercises)) {
      throw new Error("운동 프로그램 형식이 올바르지 않습니다.");
    }
    ids.add(program.id);
    if (program.exercises.length === 0) throw new Error("운동이 없는 프로그램이 있습니다.");
    program.exercises.forEach((exercise) => {
      if (!exercise?.name || !Number.isInteger(exercise.sets) || exercise.sets < 1) {
        throw new Error("운동 세트 정보가 올바르지 않습니다.");
      }
    });
  });
}

function renderProgramCards() {
  elements.programList.replaceChildren(
    ...config.programs.map((program) => {
      const totalSets = getTotalSets(program);
      const card = document.createElement("button");
      card.className = "program-card";
      card.type = "button";
      card.dataset.programId = program.id;
      card.style.setProperty("--program-color", program.accent || "#ff7958");

      const copy = document.createElement("span");
      copy.className = "program-card-copy";

      const title = document.createElement("span");
      title.className = "program-title";
      title.textContent = program.name;
      const meta = document.createElement("span");
      meta.className = "program-meta";
      meta.textContent = `운동 ${program.exercises.length}종 · 총 ${totalSets}세트`;
      const exercises = document.createElement("span");
      exercises.className = "program-exercises";
      exercises.textContent = program.exercises.map((exercise) => exercise.name).join(" · ");
      copy.append(title, meta, exercises);

      const arrow = document.createElement("span");
      arrow.className = "program-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      card.append(copy, arrow);
      return card;
    }),
  );
}

function startProgram(programId) {
  const program = getProgram(programId);
  if (!program) return;

  ensureAudioContext();
  stopTimer();
  resetPrimaryActionLock();
  activeSession = {
    version: 1,
    programVersion: config.version,
    programSignature: getProgramSignature(program),
    programId,
    exerciseIndex: 0,
    setIndex: 0,
    completedSets: 0,
    phase: "exercise",
    restEndsAt: null,
    startedAt: Date.now(),
    setLog: [],
  };
  saveSession();
  renderWorkout();
  showScreen("workout-screen");
  announce(`${program.name} 프로그램을 시작합니다. ${program.exercises[0].name} 1세트입니다.`);
}

function handlePrimaryAction() {
  if (!activeSession || primaryActionLocked) return;
  lockPrimaryActionBriefly();
  ensureAudioContext();

  if (activeSession.phase === "exercise") {
    completeCurrentSet();
  } else if (activeSession.phase === "resting" || activeSession.phase === "restComplete") {
    advanceAfterRest();
  }
}

function lockPrimaryActionBriefly() {
  primaryActionLocked = true;
  elements.primaryAction.setAttribute("aria-disabled", "true");
  window.clearTimeout(primaryActionUnlockTimer);
  primaryActionUnlockTimer = window.setTimeout(() => {
    primaryActionLocked = false;
    elements.primaryAction.removeAttribute("aria-disabled");
    primaryActionUnlockTimer = null;
  }, 450);
}

function resetPrimaryActionLock() {
  window.clearTimeout(primaryActionUnlockTimer);
  primaryActionUnlockTimer = null;
  primaryActionLocked = false;
  elements.primaryAction.removeAttribute("aria-disabled");
}

function completeCurrentSet() {
  const program = getActiveProgram();
  const exercise = getCurrentExercise();
  if (!program || !exercise) return;

  activeSession.completedSets += 1;
  activeSession.setLog.push({
    exercise: exercise.name,
    set: activeSession.setIndex + 1,
    completedAt: Date.now(),
  });

  if (activeSession.completedSets >= getTotalSets(program)) {
    completeProgram();
    return;
  }

  activeSession.phase = "resting";
  activeSession.restEndsAt = Date.now() + config.restSeconds * 1000;
  saveSession();
  renderWorkout();
  startTimer();
  announce(`${exercise.name} ${activeSession.setIndex + 1}세트 완료. ${config.restSeconds}초 휴식을 시작합니다.`);
}

function startTimer() {
  stopTimer();
  updateTimer();
  if (activeSession?.phase === "resting") {
    timerInterval = window.setInterval(updateTimer, 250);
  }
}

function updateTimer() {
  if (!activeSession || activeSession.phase !== "resting") {
    stopTimer();
    return;
  }

  const remainingMilliseconds = activeSession.restEndsAt - Date.now();
  if (remainingMilliseconds <= 0) {
    markRestComplete();
    return;
  }

  const remainingSeconds = Math.ceil(remainingMilliseconds / 1000);
  const clock = formatClock(remainingSeconds);
  if (elements.timerDisplay.textContent !== clock) {
    elements.timerDisplay.textContent = clock;
    elements.timerDisplay.dateTime = `PT${remainingSeconds}S`;
    document.title = `${clock} · 휴식 중`;
  }
}

function markRestComplete({ playSound = true } = {}) {
  if (!activeSession || activeSession.phase !== "resting") return;

  stopTimer();
  activeSession.phase = "restComplete";
  activeSession.restEndsAt = null;
  saveSession();
  renderWorkout();
  if (playSound) playChime();
  announce("휴식이 끝났어요. 다음 세트를 시작할 준비가 되었습니다.");
}

function advanceAfterRest() {
  const program = getActiveProgram();
  const exercise = getCurrentExercise();
  if (!program || !exercise) return;

  stopTimer();
  if (activeSession.setIndex + 1 < exercise.sets) {
    activeSession.setIndex += 1;
  } else {
    activeSession.exerciseIndex += 1;
    activeSession.setIndex = 0;
  }

  activeSession.phase = "exercise";
  activeSession.restEndsAt = null;
  saveSession();
  renderWorkout();

  const nextExercise = getCurrentExercise();
  if (nextExercise) announce(`${nextExercise.name} ${activeSession.setIndex + 1}세트입니다.`);
}

function completeProgram() {
  const program = getActiveProgram();
  if (!program) return;

  stopTimer();
  const completedAt = Date.now();
  lastCompletedSession = {
    ...activeSession,
    programName: program.name,
    totalSets: getTotalSets(program),
    completedAt,
    durationSeconds: Math.max(1, Math.round((completedAt - activeSession.startedAt) / 1000)),
  };

  addHistory(lastCompletedSession);
  activeSession = null;
  removeStoredSession();
  renderCompletion(lastCompletedSession);
  renderHistory();
  showScreen("complete-screen");
  playCompletionChime();
  announce(`${program.name} 프로그램의 모든 운동을 완료했습니다.`);
}

function renderWorkout() {
  const program = getActiveProgram();
  const exercise = getCurrentExercise();
  if (!activeSession || !program || !exercise) {
    removeStoredSession();
    activeSession = null;
    showProgramSelection();
    return;
  }

  const totalSets = getTotalSets(program);
  const completed = Math.min(activeSession.completedSets, totalSets);
  const isExercisePhase = activeSession.phase === "exercise";
  const isRestComplete = activeSession.phase === "restComplete";

  elements.programName.textContent = program.name;
  elements.overallProgressText.textContent = `${completed} / ${totalSets} 세트`;
  elements.overallProgress.setAttribute("aria-valuemax", String(totalSets));
  elements.overallProgress.setAttribute("aria-valuenow", String(completed));
  elements.overallProgressBar.style.width = `${(completed / totalSets) * 100}%`;

  elements.exerciseView.hidden = !isExercisePhase;
  elements.restView.hidden = isExercisePhase;
  elements.exerciseName.textContent = exercise.name;
  elements.setLabel.textContent = `${activeSession.setIndex + 1} / ${exercise.sets} 세트`;
  renderSetDots(exercise.sets);

  const upcoming = getUpcomingSet();
  elements.nextUp.hidden = !upcoming;
  elements.nextUpText.textContent = upcoming ? `${upcoming.exercise.name} · ${upcoming.setNumber}세트` : "";

  document.body.classList.toggle("is-resting", activeSession.phase === "resting");
  document.body.classList.toggle("is-rest-complete", isRestComplete);
  elements.themeColor.content = isRestComplete ? "#dcecdf" : "#f4f1ea";

  if (isExercisePhase) {
    const isFinalSet = completed === totalSets - 1;
    elements.encouragement.textContent = isFinalSet
      ? "마지막 세트예요. 끝까지 천천히!"
      : "운동을 마친 뒤 아래 버튼을 누르세요.";
    elements.actionHint.textContent = isFinalSet
      ? "마지막 세트 뒤에는 휴식 타이머가 시작되지 않아요."
      : "버튼을 누르면 1분 휴식이 시작됩니다.";
    elements.primaryAction.textContent = isFinalSet ? "마지막 세트 완료" : "세트 완료 · 휴식 시작";
    document.title = `${exercise.name} ${activeSession.setIndex + 1}세트 · ${DEFAULT_TITLE}`;
  } else {
    elements.restContext.textContent = `${exercise.name} · ${activeSession.setIndex + 1}세트 완료`;
    elements.restPhaseLabel.textContent = isRestComplete ? "휴식 완료" : "휴식 중";
    elements.restTitle.textContent = isRestComplete ? "다음 세트를 시작할까요?" : "천천히 숨을 고르세요";
    if (isRestComplete) {
      elements.timerDisplay.textContent = "00:00";
      elements.timerDisplay.dateTime = "PT0S";
      elements.actionHint.textContent = "준비가 되면 다음 세트로 넘어가세요.";
      elements.primaryAction.textContent = "휴식 종료 · 다음 세트";
      document.title = `휴식 완료 · ${DEFAULT_TITLE}`;
    } else {
      elements.actionHint.textContent = "필요하면 휴식을 일찍 끝낼 수 있어요.";
      elements.primaryAction.textContent = "휴식 건너뛰기";
      updateTimer();
    }
  }

  nudgeCurrentHeadingForShortViewport();
}

function renderSetDots(setCount) {
  elements.setDots.replaceChildren(
    ...Array.from({ length: setCount }, (_, index) => {
      const dot = document.createElement("span");
      dot.className = "set-dot";
      const currentSetIsCompleted = activeSession.phase !== "exercise";
      if (index < activeSession.setIndex || (currentSetIsCompleted && index === activeSession.setIndex)) {
        dot.classList.add("is-done");
      } else if (index === activeSession.setIndex) {
        dot.classList.add("is-current");
      }
      return dot;
    }),
  );
}

function renderCompletion(session) {
  elements.summaryProgram.textContent = session.programName;
  elements.summarySets.textContent = `${session.totalSets}세트`;
  elements.summaryDuration.textContent = formatDuration(session.durationSeconds);
  document.title = `운동 완료 · ${DEFAULT_TITLE}`;
}

function renderHistory() {
  const history = getHistory();
  elements.historySection.hidden = history.length === 0;
  elements.historyList.replaceChildren(
    ...history.slice(0, 5).map((entry) => {
      const item = document.createElement("li");
      item.className = "history-item";

      const name = document.createElement("strong");
      name.textContent = entry.programName;
      const time = document.createElement("time");
      const completedAt = new Date(entry.completedAt);
      time.dateTime = completedAt.toISOString();
      time.textContent = formatHistoryDate(completedAt);
      const detail = document.createElement("span");
      detail.textContent = `${entry.totalSets}세트 · ${formatDuration(entry.durationSeconds)}`;
      item.append(name, time, detail);
      return item;
    }),
  );
}

function showProgramSelection() {
  stopTimer();
  resetPrimaryActionLock();
  activeSession = null;
  removeStoredSession();
  resetPageState();
  renderHistory();
  showScreen("select-screen");
  document.title = DEFAULT_TITLE;
}

function requestProgramChange() {
  if (!activeSession) {
    showProgramSelection();
    return;
  }

  const hasProgress = activeSession.completedSets > 0 || activeSession.phase !== "exercise";
  if (!hasProgress || window.confirm("진행 중인 기록이 삭제됩니다. 프로그램 선택 화면으로 돌아갈까요?")) {
    showProgramSelection();
  }
}

function clearHistory() {
  if (!window.confirm("저장된 운동 기록을 모두 지울까요?")) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.history);
  } catch (error) {
    console.warn("운동 기록을 지우지 못했습니다.", error);
  }
  renderHistory();
  const selectionHeading = document.querySelector("#select-screen h1");
  selectionHeading.tabIndex = -1;
  selectionHeading.focus();
  announce("운동 기록을 모두 지웠습니다.");
}

function showScreen(screenId) {
  let activeScreen = null;
  SCREEN_IDS.forEach((id) => {
    const screen = document.querySelector(`#${id}`);
    screen.hidden = id !== screenId;
    if (id === screenId) activeScreen = screen;
  });
  window.scrollTo({ top: 0, behavior: "auto" });

  const heading = [...activeScreen.querySelectorAll("h1")].find((candidate) => !candidate.closest("[hidden]"));
  if (heading) {
    heading.tabIndex = -1;
    window.requestAnimationFrame(() => heading.focus());
  }
}

function nudgeCurrentHeadingForShortViewport() {
  if (!window.matchMedia?.("(max-height: 700px)").matches) return;

  window.requestAnimationFrame(() => {
    const heading = [...document.querySelectorAll("#workout-screen h1")].find(
      (candidate) => !candidate.closest("[hidden]"),
    );
    if (!heading) return;

    const top = heading.getBoundingClientRect().top;
    if (top < 12) window.scrollBy({ top: top - 12, behavior: "auto" });
  });
}

function getProgram(programId) {
  return config?.programs.find((program) => program.id === programId) ?? null;
}

function getActiveProgram() {
  return activeSession ? getProgram(activeSession.programId) : null;
}

function getCurrentExercise() {
  return getActiveProgram()?.exercises[activeSession.exerciseIndex] ?? null;
}

function getTotalSets(program) {
  return program.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
}

function getProgramSignature(program) {
  return program.exercises.map((exercise) => `${exercise.name}:${exercise.sets}`).join("|");
}

function getUpcomingSet() {
  const program = getActiveProgram();
  const exercise = getCurrentExercise();
  if (!program || !exercise) return null;

  if (activeSession.setIndex + 1 < exercise.sets) {
    return { exercise, setNumber: activeSession.setIndex + 2 };
  }

  const nextExercise = program.exercises[activeSession.exerciseIndex + 1];
  return nextExercise ? { exercise: nextExercise, setNumber: 1 } : null;
}

function saveSession() {
  try {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(activeSession));
  } catch (error) {
    console.warn("진행 상태를 저장하지 못했습니다.", error);
  }
}

function restoreSession() {
  try {
    const candidate = JSON.parse(localStorage.getItem(STORAGE_KEYS.session));
    if (!candidate || candidate.version !== 1) return null;

    const program = getProgram(candidate.programId);
    const exercise = program?.exercises[candidate.exerciseIndex];
    const validPhase = ["exercise", "resting", "restComplete"].includes(candidate.phase);
    const validRestEnd =
      candidate.phase === "resting" ? Number.isFinite(candidate.restEndsAt) : candidate.restEndsAt === null;
    const totalSets = program ? getTotalSets(program) : 0;
    const completedBeforeCurrentExercise = program
      ? program.exercises
          .slice(0, candidate.exerciseIndex)
          .reduce((sum, candidateExercise) => sum + candidateExercise.sets, 0)
      : 0;
    const expectedCompletedSets =
      completedBeforeCurrentExercise + candidate.setIndex + (candidate.phase === "exercise" ? 0 : 1);
    const isValid =
      program &&
      exercise &&
      candidate.programVersion === config.version &&
      candidate.programSignature === getProgramSignature(program) &&
      validPhase &&
      validRestEnd &&
      Number.isInteger(candidate.exerciseIndex) &&
      Number.isInteger(candidate.setIndex) &&
      candidate.setIndex >= 0 &&
      candidate.setIndex < exercise.sets &&
      Number.isInteger(candidate.completedSets) &&
      candidate.completedSets >= 0 &&
      candidate.completedSets < totalSets &&
      candidate.completedSets === expectedCompletedSets &&
      Number.isFinite(candidate.startedAt) &&
      Array.isArray(candidate.setLog) &&
      candidate.setLog.length === candidate.completedSets;

    if (!isValid) throw new Error("저장된 진행 상태가 올바르지 않습니다.");
    return candidate;
  } catch (error) {
    console.warn("저장된 진행 상태를 복원하지 못했습니다.", error);
    removeStoredSession();
    return null;
  }
}

function reconcileRestTimer() {
  if (activeSession?.phase === "resting" && activeSession.restEndsAt <= Date.now()) {
    activeSession.phase = "restComplete";
    activeSession.restEndsAt = null;
    saveSession();
  }
}

function removeStoredSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.session);
  } catch (error) {
    console.warn("진행 상태를 지우지 못했습니다.", error);
  }
}

function addHistory(session) {
  const history = getHistory();
  history.unshift({
    id: `${session.completedAt}-${session.programId}`,
    programId: session.programId,
    programName: session.programName,
    totalSets: session.totalSets,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    durationSeconds: session.durationSeconds,
  });

  try {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  } catch (error) {
    console.warn("운동 기록을 저장하지 못했습니다.", error);
  }
}

function getHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
    return Array.isArray(history)
      ? history.filter(
          (entry) =>
            entry &&
            typeof entry.programName === "string" &&
            Number.isFinite(entry.completedAt) &&
            Number.isFinite(new Date(entry.completedAt).getTime()) &&
            Number.isFinite(entry.durationSeconds) &&
            entry.durationSeconds > 0 &&
            Number.isInteger(entry.totalSets) &&
            entry.totalSets > 0,
        )
      : [];
  } catch {
    return [];
  }
}

function restoreSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
    soundEnabled = settings.soundEnabled !== false;
  } catch {
    soundEnabled = true;
  }
  renderSoundSetting();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (soundEnabled) ensureAudioContext();
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ soundEnabled }));
  } catch (error) {
    console.warn("효과음 설정을 저장하지 못했습니다.", error);
  }
  renderSoundSetting();
  announce(soundEnabled ? "효과음을 켰습니다." : "효과음을 껐습니다.");
}

function renderSoundSetting() {
  elements.soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  elements.soundToggle.setAttribute("aria-label", soundEnabled ? "효과음 끄기" : "효과음 켜기");
  elements.soundLabel.textContent = soundEnabled ? "효과음 켜짐" : "효과음 꺼짐";
}

function ensureAudioContext() {
  if (!soundEnabled) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function playChime() {
  if (!soundEnabled) return;
  const context = ensureAudioContext();
  if (!context || context.state !== "running") return;

  const now = context.currentTime;
  playTone(context, 523.25, now, 0.42, 0.035);
  playTone(context, 659.25, now + 0.16, 0.48, 0.03);
}

function playCompletionChime() {
  if (!soundEnabled) return;
  const context = ensureAudioContext();
  if (!context || context.state !== "running") return;

  const now = context.currentTime;
  playTone(context, 392, now, 0.34, 0.025);
  playTone(context, 523.25, now + 0.12, 0.42, 0.03);
  playTone(context, 659.25, now + 0.25, 0.48, 0.025);
}

function playTone(context, frequency, startsAt, duration, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

function stopTimer() {
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetPageState() {
  document.body.classList.remove("is-resting", "is-rest-complete");
  elements.themeColor.content = "#f4f1ea";
}

function announce(message) {
  elements.liveRegion.textContent = "";
  window.setTimeout(() => {
    elements.liveRegion.textContent = message;
  }, 30);
}

function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 1) return `${Math.max(1, totalSeconds)}초`;
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}

function formatHistoryDate(date) {
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("ko-KR", {
    ...(sameYear ? {} : { year: "numeric" }),
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
