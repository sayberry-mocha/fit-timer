// 구형 iOS Safari에서 빠진 소규모 표준 API를 외부 라이브러리 없이 보완합니다.
(function installLegacyPolyfills() {
  const elementPrototype = window.Element && window.Element.prototype;

  if (elementPrototype && !elementPrototype.matches) {
    elementPrototype.matches =
      elementPrototype.webkitMatchesSelector || elementPrototype.msMatchesSelector;
  }

  if (elementPrototype && !elementPrototype.closest) {
    elementPrototype.closest = function closest(selector) {
      let element = this;
      while (element) {
        if (element.matches && element.matches(selector)) return element;
        element = element.parentElement;
      }
      return null;
    };
  }

  function appendValues(parent, values) {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      fragment.appendChild(value && value.nodeType ? value : document.createTextNode(String(value)));
    }
    parent.appendChild(fragment);
  }

  if (elementPrototype && !elementPrototype.append) {
    elementPrototype.append = function append() {
      appendValues(this, arguments);
    };
  }

  if (elementPrototype && !elementPrototype.replaceChildren) {
    elementPrototype.replaceChildren = function replaceChildren() {
      while (this.firstChild) this.removeChild(this.firstChild);
      appendValues(this, arguments);
    };
  }

  if (!Array.from) {
    Array.from = function from(arrayLike, mapFunction, thisArgument) {
      const result = [];
      const length = Math.max(0, Number(arrayLike?.length) || 0);
      for (let index = 0; index < length; index += 1) {
        const value = arrayLike[index];
        result.push(mapFunction ? mapFunction.call(thisArgument, value, index) : value);
      }
      return result;
    };
  }

  if (!Array.prototype.find) {
    Array.prototype.find = function find(predicate, thisArgument) {
      for (let index = 0; index < this.length; index += 1) {
        const value = this[index];
        if (predicate.call(thisArgument, value, index, this)) return value;
      }
      return undefined;
    };
  }

  if (!Array.prototype.includes) {
    Array.prototype.includes = function includes(searchElement, fromIndex) {
      let index = Math.max(Number(fromIndex) || 0, 0);
      while (index < this.length) {
        const value = this[index];
        if (value === searchElement || (value !== value && searchElement !== searchElement)) return true;
        index += 1;
      }
      return false;
    };
  }

  if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
      const value = String(this);
      const target = Math.max(Number(targetLength) || 0, 0);
      let padding = padString === undefined ? " " : String(padString);
      if (value.length >= target || padding === "") return value;
      while (padding.length < target - value.length) padding += padding;
      return padding.slice(0, target - value.length) + value;
    };
  }

  if (!Number.isFinite) {
    Number.isFinite = function isFiniteNumber(value) {
      return typeof value === "number" && isFinite(value);
    };
  }

  if (!Number.isInteger) {
    Number.isInteger = function isInteger(value) {
      return Number.isFinite(value) && Math.floor(value) === value;
    };
  }
})();

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
    {
      id: "test",
      name: "테스트",
      description: "짧은 휴식과 자동 전환을 확인합니다.",
      accent: "#7184c9",
      restSeconds: 3,
      exercises: [{ name: "TEST", sets: 2 }],
    },
  ],
};

const SCREEN_IDS = ["loading-screen", "select-screen", "workout-screen", "complete-screen", "error-screen"];
const DEFAULT_TITLE = "핏타이머";
const HISTORY_LIMIT = 20;
const ALARM_TEST_SECONDS = 1;
const ALARM_TEST_COMPLETE_HOLD_MS = 1600;
const STAGE_ACTION_LOCK_MS = 450;
const AUTOMATIC_TRANSITION_LOCK_MS = 800;

const elements = {
  themeColor: document.querySelector("#theme-color"),
  homeButton: document.querySelector("#home-button"),
  soundToggle: document.querySelector("#sound-toggle"),
  soundLabel: document.querySelector("#sound-label"),
  programList: document.querySelector("#program-list"),
  alarmTest: document.querySelector("#alarm-test"),
  alarmTestButton: document.querySelector("#alarm-test-button"),
  alarmTestStatus: document.querySelector("#alarm-test-status"),
  historySection: document.querySelector("#history-section"),
  historyList: document.querySelector("#history-list"),
  clearHistoryButton: document.querySelector("#clear-history-button"),
  programName: document.querySelector("#program-name"),
  changeProgramButton: document.querySelector("#change-program-button"),
  overallProgressText: document.querySelector("#overall-progress-text"),
  completedExerciseList: document.querySelector("#completed-exercise-list"),
  currentExerciseList: document.querySelector("#current-exercise-list"),
  nextExerciseList: document.querySelector("#next-exercise-list"),
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
  stageCard: document.querySelector("#stage-card"),
  panelActionMessage: document.querySelector("#panel-action-message"),
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
let stageActionUnlockTimer = null;
let stageActionLocked = false;
let restChimeSources = [];
let restChimeContext = null;
let restChimeStartsAt = null;
let alarmTestInterval = null;
let alarmTestResetTimer = null;
let alarmTestEndsAt = null;
let alarmTestSources = [];

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

  elements.stageCard.addEventListener("click", handleStageAction);
  elements.stageCard.addEventListener("keydown", handleStageKeydown);
  elements.changeProgramButton.addEventListener("click", requestProgramChange);
  elements.homeButton.addEventListener("click", requestProgramChange);
  elements.soundToggle.addEventListener("click", toggleSound);
  elements.alarmTestButton.addEventListener("click", startAlarmTest);
  elements.clearHistoryButton.addEventListener("click", clearHistory);
  elements.repeatProgramButton.addEventListener("click", () => {
    if (lastCompletedSession) startProgram(lastCompletedSession.programId);
  });
  elements.chooseProgramButton.addEventListener("click", showProgramSelection);
  elements.retryButton.addEventListener("click", loadPrograms);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAlarmTest();
    } else if (activeSession?.phase === "resting") {
      updateTimer();
    }
  });
}

function loadPrograms() {
  cancelAlarmTest();
  stopTimer();
  stopRestChimeSources();
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
    !Number.isInteger(candidate.restSeconds) ||
    candidate.restSeconds <= 0
  ) {
    throw new Error("올바른 휴식 시간이 없습니다.");
  }

  if (!Array.isArray(candidate.programs) || candidate.programs.length === 0) {
    throw new Error("운동 프로그램이 비어 있습니다.");
  }

  const ids = [];
  candidate.programs.forEach((program) => {
    if (!program?.id || !program?.name || ids.indexOf(program.id) !== -1 || !Array.isArray(program.exercises)) {
      throw new Error("운동 프로그램 형식이 올바르지 않습니다.");
    }
    ids.push(program.id);
    if (program.exercises.length === 0) throw new Error("운동이 없는 프로그램이 있습니다.");
    if (
      program.restSeconds !== undefined &&
      (!Number.isInteger(program.restSeconds) || program.restSeconds <= 0)
    ) {
      throw new Error("운동 프로그램의 휴식 시간이 올바르지 않습니다.");
    }
    program.exercises.forEach((exercise) => {
      if (!exercise?.name || !Number.isInteger(exercise.sets) || exercise.sets < 1) {
        throw new Error("운동 세트 정보가 올바르지 않습니다.");
      }
    });
  });
}

function renderProgramCards() {
  const cards = config.programs.map((program) => {
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
      meta.textContent =
        `운동 ${program.exercises.length}종 · 총 ${totalSets}세트 · ` +
        `휴식 ${formatRestDuration(getProgramRestSeconds(program))}`;
      const exercises = document.createElement("span");
      exercises.className = "program-exercises";
      exercises.textContent = program.exercises.map((exercise) => exercise.name).join(" → ");
      copy.append(title, meta, exercises);

      const arrow = document.createElement("span");
      arrow.className = "program-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      card.append(copy, arrow);
      return card;
    });
  elements.programList.replaceChildren.apply(elements.programList, cards);
}

function startProgram(programId) {
  const program = getProgram(programId);
  if (!program) return;

  cancelAlarmTest();
  ensureAudioContext();
  stopTimer();
  stopRestChimeSources();
  resetStageActionLock();
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

function handleStageKeydown(event) {
  const isActivationKey = event.key === "Enter" || event.key === " " || event.key === "Spacebar";
  if (!isActivationKey || event.repeat) return;

  event.preventDefault();
  handleStageAction();
}

function handleStageAction() {
  if (!activeSession || stageActionLocked) return;
  if (activeSession.phase !== "exercise" && activeSession.phase !== "resting") return;

  lockStageActionBriefly();
  ensureAudioContext();

  if (activeSession.phase === "exercise") {
    completeCurrentSet();
  } else if (activeSession.restEndsAt <= Date.now()) {
    finishRest(true);
  } else {
    finishRest(false);
  }
}

function lockStageActionBriefly(duration = STAGE_ACTION_LOCK_MS) {
  stageActionLocked = true;
  elements.stageCard.setAttribute("aria-disabled", "true");
  window.clearTimeout(stageActionUnlockTimer);
  stageActionUnlockTimer = window.setTimeout(() => {
    stageActionLocked = false;
    elements.stageCard.removeAttribute("aria-disabled");
    stageActionUnlockTimer = null;
  }, duration);
}

function resetStageActionLock() {
  window.clearTimeout(stageActionUnlockTimer);
  stageActionUnlockTimer = null;
  stageActionLocked = false;
  elements.stageCard.removeAttribute("aria-disabled");
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

  const restSeconds = getProgramRestSeconds(program);
  activeSession.phase = "resting";
  activeSession.restEndsAt = Date.now() + restSeconds * 1000;
  saveSession();
  scheduleRestChimeForActiveTimer();
  renderWorkout();
  startTimer();
  announce(
    `${exercise.name} ${activeSession.setIndex + 1}세트 완료. ` +
      `${formatRestDuration(restSeconds)} 휴식을 시작합니다.`,
  );
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
    finishRest(true);
    return;
  }

  renderRestTimerDisplay(remainingMilliseconds);
}

function renderRestTimerDisplay(remainingMilliseconds) {
  const remainingSeconds = Math.ceil(remainingMilliseconds / 1000);
  const clock = formatClock(remainingSeconds);
  if (elements.timerDisplay.textContent !== clock) {
    elements.timerDisplay.textContent = clock;
    elements.timerDisplay.dateTime = `PT${remainingSeconds}S`;
    document.title = `${clock} · 휴식 중`;
  }
}

function finishRest(isAutomatic) {
  if (!activeSession || activeSession.phase !== "resting") return;

  stopTimer();
  const scheduledContextIsRunning =
    restChimeContext && (!restChimeContext.state || restChimeContext.state === "running");
  const scheduledChimeHasStarted =
    restChimeSources.length > 0 &&
    scheduledContextIsRunning &&
    Number.isFinite(restChimeStartsAt) &&
    restChimeContext.currentTime + 0.05 >= restChimeStartsAt;
  if (isAutomatic) {
    if (scheduledChimeHasStarted) {
      restChimeSources = [];
      restChimeContext = null;
      restChimeStartsAt = null;
      ensureAudioContext();
    } else {
      stopRestChimeSources();
      playChime();
    }
  } else {
    stopRestChimeSources();
  }

  const nextExercise = advanceSessionAfterRest();
  if (!nextExercise) return;

  if (isAutomatic) lockStageActionBriefly(AUTOMATIC_TRANSITION_LOCK_MS);
  renderWorkout();
  announce(
    isAutomatic
      ? `휴식이 끝났어요. ${nextExercise.name} ${activeSession.setIndex + 1}세트를 시작합니다.`
      : `휴식을 일찍 끝냈습니다. ${nextExercise.name} ${activeSession.setIndex + 1}세트입니다.`,
  );
}

function advanceSessionAfterRest() {
  const program = getActiveProgram();
  const exercise = getCurrentExercise();
  if (!program || !exercise) return null;

  if (activeSession.setIndex + 1 < exercise.sets) {
    activeSession.setIndex += 1;
  } else {
    activeSession.exerciseIndex += 1;
    activeSession.setIndex = 0;
  }

  activeSession.phase = "exercise";
  activeSession.restEndsAt = null;
  saveSession();
  return getCurrentExercise();
}

function completeProgram() {
  const program = getActiveProgram();
  if (!program) return;

  stopTimer();
  stopRestChimeSources();
  resetStageActionLock();
  const completedAt = Date.now();
  lastCompletedSession = {
    programId: activeSession.programId,
    programName: program.name,
    totalSets: getTotalSets(program),
    startedAt: activeSession.startedAt,
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

  elements.programName.textContent = program.name;
  elements.overallProgressText.textContent = `${completed} / ${totalSets} 세트`;
  elements.overallProgress.setAttribute("aria-valuemax", String(totalSets));
  elements.overallProgress.setAttribute("aria-valuenow", String(completed));
  elements.overallProgressBar.style.width = `${(completed / totalSets) * 100}%`;
  renderExerciseProgressSummary(program, exercise);

  elements.exerciseView.hidden = !isExercisePhase;
  elements.restView.hidden = isExercisePhase;
  elements.exerciseName.textContent = exercise.name;
  elements.setLabel.textContent = `${activeSession.setIndex + 1} / ${exercise.sets} 세트`;
  renderSetDots(exercise.sets);

  const upcoming = getUpcomingSet();
  elements.nextUp.hidden = !upcoming;
  elements.nextUpText.textContent = upcoming ? `${upcoming.exercise.name} · ${upcoming.setNumber}세트` : "";

  document.body.classList.toggle("is-resting", !isExercisePhase);
  document.body.classList.remove("is-rest-complete");
  elements.themeColor.content = isExercisePhase ? "#f4f1ea" : "#e5f0eb";

  if (isExercisePhase) {
    const isFinalSet = completed === totalSets - 1;
    elements.encouragement.textContent = isFinalSet
      ? "마지막 세트예요. 끝까지 천천히!"
      : "운동을 마친 뒤 패널을 선택하세요.";
    elements.panelActionMessage.textContent = isFinalSet
      ? "패널을 선택하여 운동 완료"
      : "패널을 선택하여 휴식 시작";
    elements.stageCard.setAttribute(
      "aria-label",
      isFinalSet
        ? `${exercise.name} ${activeSession.setIndex + 1}세트 완료`
        : `${exercise.name} ${activeSession.setIndex + 1}세트 완료 후 휴식 시작`,
    );
    document.title = `${exercise.name} ${activeSession.setIndex + 1}세트 · ${DEFAULT_TITLE}`;
  } else {
    elements.restContext.textContent = `${exercise.name} · ${activeSession.setIndex + 1}세트 완료`;
    elements.restPhaseLabel.textContent = "휴식 중";
    elements.restTitle.textContent = "천천히 숨을 고르세요";
    elements.panelActionMessage.textContent = "패널을 선택하여 휴식 종료";
    elements.stageCard.setAttribute(
      "aria-label",
      upcoming
        ? `휴식을 일찍 끝내고 ${upcoming.exercise.name} ${upcoming.setNumber}세트 시작`
        : "휴식을 일찍 끝내고 다음 세트 시작",
    );
    renderRestTimerDisplay(Math.max(0, activeSession.restEndsAt - Date.now()));
  }

  nudgeCurrentHeadingForShortViewport();
}

function renderExerciseProgressSummary(program, exercise) {
  let targetExerciseIndex = activeSession.exerciseIndex;
  if (activeSession.phase !== "exercise" && activeSession.setIndex + 1 >= exercise.sets) {
    targetExerciseIndex += 1;
  }

  const completedExercises = program.exercises.slice(0, targetExerciseIndex);
  const currentExercise = program.exercises[targetExerciseIndex] || null;
  const nextExercises = currentExercise ? program.exercises.slice(targetExerciseIndex + 1) : [];

  elements.completedExerciseList.textContent = formatExerciseProgressNames(completedExercises);
  elements.currentExerciseList.textContent = formatExerciseProgressNames(currentExercise ? [currentExercise] : []);
  elements.nextExerciseList.textContent = formatExerciseProgressNames(nextExercises);
}

function formatExerciseProgressNames(exercises) {
  const names = exercises.map((exercise) => exercise.name);
  return `(${names.length > 0 ? names.join(" → ") : "-"})`;
}

function renderSetDots(setCount) {
  const dots = Array.from({ length: setCount }, (_, index) => {
      const dot = document.createElement("span");
      dot.className = "set-dot";
      const currentSetIsCompleted = activeSession.phase !== "exercise";
      if (index < activeSession.setIndex || (currentSetIsCompleted && index === activeSession.setIndex)) {
        dot.classList.add("is-done");
      } else if (index === activeSession.setIndex) {
        dot.classList.add("is-current");
      }
      return dot;
    });
  elements.setDots.replaceChildren.apply(elements.setDots, dots);
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
  const items = history.slice(0, 5).map((entry) => {
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
    });
  elements.historyList.replaceChildren.apply(elements.historyList, items);
}

function showProgramSelection() {
  cancelAlarmTest();
  stopTimer();
  stopRestChimeSources();
  resetStageActionLock();
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
  window.scrollTo(0, 0);

  const heading = Array.from(activeScreen.querySelectorAll("h1")).find(
    (candidate) => !candidate.closest("[hidden]"),
  );
  if (heading) {
    heading.tabIndex = -1;
    window.requestAnimationFrame(() => heading.focus());
  }
}

function nudgeCurrentHeadingForShortViewport() {
  if (!window.matchMedia || !window.matchMedia("(max-height: 700px)").matches) return;

  window.requestAnimationFrame(() => {
    const heading = Array.from(document.querySelectorAll("#workout-screen h1")).find(
      (candidate) => !candidate.closest("[hidden]"),
    );
    if (!heading) return;

    const top = heading.getBoundingClientRect().top;
    if (top < 12) window.scrollBy(0, top - 12);
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

function getProgramRestSeconds(program) {
  return program.restSeconds === undefined ? config.restSeconds : program.restSeconds;
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
  const isExpiredRest =
    activeSession?.phase === "resting" && activeSession.restEndsAt <= Date.now();
  const isLegacyCompletedRest = activeSession?.phase === "restComplete";
  if (isExpiredRest || isLegacyCompletedRest) advanceSessionAfterRest();
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
  const nextSoundEnabled = !soundEnabled;
  if (!nextSoundEnabled) {
    cancelAlarmTest();
    stopRestChimeSources();
  }
  soundEnabled = nextSoundEnabled;
  if (soundEnabled) {
    ensureAudioContext();
    if (activeSession?.phase === "resting") scheduleRestChimeForActiveTimer();
  }
  saveSoundSetting();
  renderSoundSetting();
  announce(soundEnabled ? "효과음을 켰습니다." : "효과음을 껐습니다.");
}

function saveSoundSetting() {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ soundEnabled }));
  } catch (error) {
    console.warn("효과음 설정을 저장하지 못했습니다.", error);
  }
}

function renderSoundSetting() {
  elements.soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  elements.soundToggle.setAttribute("aria-label", soundEnabled ? "효과음 끄기" : "효과음 켜기");
  elements.soundLabel.textContent = soundEnabled ? "효과음 켜짐" : "효과음 꺼짐";
  renderAlarmTestIdle();
}

function renderAlarmTestIdle() {
  if (alarmTestEndsAt !== null || alarmTestResetTimer !== null) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  elements.alarmTest.classList.remove("is-counting", "is-complete");
  elements.alarmTestButton.removeAttribute("aria-busy");
  elements.alarmTestButton.disabled = !AudioContextClass;

  if (!AudioContextClass) {
    elements.alarmTestButton.textContent = "재생할 수 없음";
    elements.alarmTestStatus.textContent = "이 브라우저에서는 알람 소리 재생을 지원하지 않습니다.";
  } else if (soundEnabled) {
    elements.alarmTestButton.textContent = "1초 테스트";
    elements.alarmTestStatus.textContent =
      "1초 후 실제 휴식 종료 알림을 재현합니다. 기기 음량 버튼으로 조절하세요.";
  } else {
    elements.alarmTestButton.textContent = "소리 켜고 테스트";
    elements.alarmTestStatus.textContent =
      "테스트를 시작하면 효과음도 함께 켜집니다. 기기 음량 버튼으로 조절하세요.";
  }
}

function startAlarmTest() {
  if (alarmTestEndsAt !== null || alarmTestResetTimer !== null) return;

  if (!soundEnabled) {
    soundEnabled = true;
    saveSoundSetting();
    renderSoundSetting();
  }

  const context = ensureAudioContext();
  if (!context) {
    elements.alarmTestButton.disabled = true;
    elements.alarmTestButton.textContent = "재생할 수 없음";
    elements.alarmTestStatus.textContent = "이 브라우저에서 알람 소리를 준비하지 못했습니다.";
    announce("알람 소리를 재생할 수 없습니다.");
    return;
  }

  try {
    alarmTestSources = scheduleRestChime(context, context.currentTime + ALARM_TEST_SECONDS);
  } catch (error) {
    console.warn("알람 테스트 소리를 준비하지 못했습니다.", error);
    alarmTestSources = [];
    elements.alarmTestButton.disabled = true;
    elements.alarmTestButton.textContent = "재생할 수 없음";
    elements.alarmTestStatus.textContent = "이 브라우저에서 알람 소리를 준비하지 못했습니다.";
    announce("알람 소리를 재생할 수 없습니다.");
    return;
  }

  alarmTestEndsAt = Date.now() + ALARM_TEST_SECONDS * 1000;
  elements.alarmTest.classList.add("is-counting");
  elements.alarmTestButton.disabled = true;
  elements.alarmTestButton.setAttribute("aria-busy", "true");
  elements.alarmTestStatus.textContent = "알람 테스트 카운트다운 중입니다.";
  document.body.classList.remove("is-alarm-test-complete");
  updateAlarmTestCountdown();
  alarmTestInterval = window.setInterval(updateAlarmTestCountdown, 100);
}

function updateAlarmTestCountdown() {
  if (alarmTestEndsAt === null) return;

  const remainingMilliseconds = alarmTestEndsAt - Date.now();
  if (remainingMilliseconds <= 0) {
    completeAlarmTest();
    return;
  }

  elements.alarmTestButton.textContent = formatClock(Math.ceil(remainingMilliseconds / 1000));
}

function completeAlarmTest() {
  window.clearInterval(alarmTestInterval);
  alarmTestInterval = null;
  alarmTestEndsAt = null;
  elements.alarmTest.classList.remove("is-counting");
  elements.alarmTest.classList.add("is-complete");
  elements.alarmTestButton.textContent = "알람 재생 중";
  elements.alarmTestStatus.textContent = "이 소리와 배경 변화가 실제 휴식 종료 때 재현됩니다.";
  document.body.classList.add("is-alarm-test-complete");
  elements.themeColor.content = "#dcecdf";

  alarmTestResetTimer = window.setTimeout(() => cancelAlarmTest(false), ALARM_TEST_COMPLETE_HOLD_MS);
}

function cancelAlarmTest(stopScheduledSound = true) {
  const wasActive =
    alarmTestInterval !== null ||
    alarmTestResetTimer !== null ||
    alarmTestEndsAt !== null ||
    alarmTestSources.length > 0 ||
    document.body.classList.contains("is-alarm-test-complete");

  window.clearInterval(alarmTestInterval);
  window.clearTimeout(alarmTestResetTimer);
  alarmTestInterval = null;
  alarmTestResetTimer = null;
  alarmTestEndsAt = null;

  if (stopScheduledSound) stopAlarmTestSources();
  alarmTestSources = [];
  if (wasActive) {
    document.body.classList.remove("is-alarm-test-complete");
    elements.themeColor.content = document.body.classList.contains("is-resting") ? "#e5f0eb" : "#f4f1ea";
  }
  renderAlarmTestIdle();
}

function stopAlarmTestSources() {
  alarmTestSources.forEach((source) => {
    try {
      source.stop();
    } catch (error) {
      // 이미 끝난 음원은 중지할 필요가 없습니다.
    }
  });
}

function scheduleRestChimeForActiveTimer() {
  stopRestChimeSources();
  if (!soundEnabled || !activeSession || activeSession.phase !== "resting") return;

  const context = ensureAudioContext();
  if (!context) return;

  const remainingSeconds = Math.max(0, activeSession.restEndsAt - Date.now()) / 1000;
  try {
    restChimeContext = context;
    restChimeStartsAt = context.currentTime + remainingSeconds;
    restChimeSources = scheduleRestChime(context, restChimeStartsAt);
  } catch (error) {
    restChimeSources = [];
    restChimeContext = null;
    restChimeStartsAt = null;
    console.warn("휴식 종료 알람을 준비하지 못했습니다.", error);
  }
}

function stopRestChimeSources() {
  restChimeSources.forEach((source) => {
    try {
      source.stop();
    } catch (error) {
      // 이미 끝난 음원은 중지할 필요가 없습니다.
    }
  });
  restChimeSources = [];
  restChimeContext = null;
  restChimeStartsAt = null;
}

function ensureAudioContext() {
  if (!soundEnabled) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    if (audioContext?.state === "closed") audioContext = null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state && audioContext.state !== "running" && typeof audioContext.resume === "function") {
      const resumeResult = audioContext.resume();
      if (resumeResult && typeof resumeResult.catch === "function") {
        resumeResult.catch((error) => console.warn("오디오 재생을 시작하지 못했습니다.", error));
      }
    }
  } catch (error) {
    console.warn("오디오를 준비하지 못했습니다.", error);
    return null;
  }
  return audioContext;
}

function playChime() {
  if (!soundEnabled) return [];
  const context = ensureAudioContext();
  if (!canPlayAudio(context)) return [];

  try {
    return scheduleRestChime(context, context.currentTime);
  } catch (error) {
    console.warn("휴식 종료 알람을 재생하지 못했습니다.", error);
    return [];
  }
}

function scheduleRestChime(context, startsAt) {
  return [
    playTone(context, 523.25, startsAt, 0.42, 0.035),
    playTone(context, 659.25, startsAt + 0.16, 0.48, 0.03),
  ];
}

function canPlayAudio(context) {
  return Boolean(context && (!context.state || context.state === "running"));
}

function playCompletionChime() {
  if (!soundEnabled) return;
  const context = ensureAudioContext();
  if (!canPlayAudio(context)) return;

  try {
    const now = context.currentTime;
    playTone(context, 392, now, 0.34, 0.025);
    playTone(context, 523.25, now + 0.12, 0.42, 0.03);
    playTone(context, 659.25, now + 0.25, 0.48, 0.025);
  } catch (error) {
    console.warn("운동 완료 알람을 재생하지 못했습니다.", error);
  }
}

function playTone(context, frequency, startsAt, duration, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
  return oscillator;
}

function stopTimer() {
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetPageState() {
  document.body.classList.remove("is-resting", "is-rest-complete", "is-alarm-test-complete");
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

function formatRestDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0 && seconds > 0) return `${minutes}분 ${seconds}초`;
  if (minutes > 0) return `${minutes}분`;
  return `${seconds}초`;
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
  if (window.Intl && typeof window.Intl.DateTimeFormat === "function") {
    try {
      const options = {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      if (!sameYear) options.year = "numeric";
      return new Intl.DateTimeFormat("ko-KR", options).format(date);
    } catch (error) {
      console.warn("날짜를 기본 형식으로 표시합니다.", error);
    }
  }

  const year = sameYear ? "" : `${date.getFullYear()}년 `;
  return `${year}${date.getMonth() + 1}월 ${date.getDate()}일 ${formatClock(
    date.getHours() * 60 + date.getMinutes(),
  )}`;
}
