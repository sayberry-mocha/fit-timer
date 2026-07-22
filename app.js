(function installLegacyPolyfills() {
  var elementPrototype = window.Element && window.Element.prototype;
  if (elementPrototype && !elementPrototype.matches) {
    elementPrototype.matches = elementPrototype.webkitMatchesSelector || elementPrototype.msMatchesSelector;
  }
  if (elementPrototype && !elementPrototype.closest) {
    elementPrototype.closest = function closest(selector) {
      var element = this;
      while (element) {
        if (element.matches && element.matches(selector)) return element;
        element = element.parentElement;
      }
      return null;
    };
  }
  function appendValues(parent, values) {
    var fragment = document.createDocumentFragment();
    for (var index = 0; index < values.length; index += 1) {
      var value = values[index];
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
      var result = [];
      var length = Math.max(0, Number(arrayLike === null || arrayLike === void 0 ? void 0 : arrayLike.length) || 0);
      for (var index = 0; index < length; index += 1) {
        var value = arrayLike[index];
        result.push(mapFunction ? mapFunction.call(thisArgument, value, index) : value);
      }
      return result;
    };
  }
  if (!Array.prototype.find) {
    Array.prototype.find = function find(predicate, thisArgument) {
      for (var index = 0; index < this.length; index += 1) {
        var value = this[index];
        if (predicate.call(thisArgument, value, index, this)) return value;
      }
      return undefined;
    };
  }
  if (!Array.prototype.includes) {
    Array.prototype.includes = function includes(searchElement, fromIndex) {
      var index = Math.max(Number(fromIndex) || 0, 0);
      while (index < this.length) {
        var value = this[index];
        if (value === searchElement || value !== value && searchElement !== searchElement) return true;
        index += 1;
      }
      return false;
    };
  }
  if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
      var value = String(this);
      var target = Math.max(Number(targetLength) || 0, 0);
      var padding = padString === undefined ? " " : String(padString);
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
var STORAGE_KEYS = {
  session: "fit-timer:session:v1",
  history: "fit-timer:history:v1",
  settings: "fit-timer:settings:v1"
};
var PROGRAM_CONFIG = {
  version: 1,
  restSeconds: 60,
  programs: [{
    id: "large-muscle",
    name: "대근육",
    description: "6가지 운동을 차례로 진행합니다.",
    accent: "#ff7958",
    exercises: [{
      name: "DFP",
      sets: 3
    }, {
      name: "D-RDL",
      sets: 3
    }, {
      name: "D-BO-R",
      sets: 3
    }, {
      name: "DS",
      sets: 3
    }, {
      name: "OTE",
      sets: 3
    }, {
      name: "ADC",
      sets: 3
    }]
  }, {
    id: "medium-muscle",
    name: "중근육",
    description: "2가지 운동에 집중합니다.",
    accent: "#68a989",
    exercises: [{
      name: "OTE",
      sets: 3
    }, {
      name: "ADC",
      sets: 3
    }]
  }, {
    id: "small-muscle",
    name: "소근육",
    description: "3가지 운동을 꼼꼼히 진행합니다.",
    accent: "#e8ae45",
    exercises: [{
      name: "HG",
      sets: 3
    }, {
      name: "DB",
      sets: 3
    }, {
      name: "P",
      sets: 3
    }]
  }]
};
var SCREEN_IDS = ["loading-screen", "select-screen", "workout-screen", "complete-screen", "error-screen"];
var DEFAULT_TITLE = "핏타이머";
var HISTORY_LIMIT = 20;
var ALARM_TEST_SECONDS = 3;
var ALARM_TEST_COMPLETE_HOLD_MS = 1600;
var elements = {
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
  actionHint: document.querySelector("#action-hint"),
  primaryAction: document.querySelector("#primary-action"),
  summaryProgram: document.querySelector("#summary-program"),
  summarySets: document.querySelector("#summary-sets"),
  summaryDuration: document.querySelector("#summary-duration"),
  repeatProgramButton: document.querySelector("#repeat-program-button"),
  chooseProgramButton: document.querySelector("#choose-program-button"),
  retryButton: document.querySelector("#retry-button"),
  liveRegion: document.querySelector("#live-region")
};
var config = null;
var activeSession = null;
var lastCompletedSession = null;
var timerInterval = null;
var audioContext = null;
var soundEnabled = true;
var primaryActionUnlockTimer = null;
var primaryActionLocked = false;
var alarmTestInterval = null;
var alarmTestResetTimer = null;
var alarmTestEndsAt = null;
var alarmTestSources = [];
init();
function init() {
  bindEvents();
  restoreSettings();
  loadPrograms();
}
function bindEvents() {
  elements.programList.addEventListener("click", function (event) {
    var card = event.target.closest("[data-program-id]");
    if (card) startProgram(card.dataset.programId);
  });
  elements.primaryAction.addEventListener("click", handlePrimaryAction);
  elements.changeProgramButton.addEventListener("click", requestProgramChange);
  elements.homeButton.addEventListener("click", requestProgramChange);
  elements.soundToggle.addEventListener("click", toggleSound);
  elements.alarmTestButton.addEventListener("click", startAlarmTest);
  elements.clearHistoryButton.addEventListener("click", clearHistory);
  elements.repeatProgramButton.addEventListener("click", function () {
    if (lastCompletedSession) startProgram(lastCompletedSession.programId);
  });
  elements.chooseProgramButton.addEventListener("click", showProgramSelection);
  elements.retryButton.addEventListener("click", loadPrograms);
  document.addEventListener("visibilitychange", function () {
    var _activeSession;
    if (document.hidden) {
      cancelAlarmTest();
    } else if (((_activeSession = activeSession) === null || _activeSession === void 0 ? void 0 : _activeSession.phase) === "resting") {
      updateTimer();
    }
  });
}
function loadPrograms() {
  cancelAlarmTest();
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
  if (!candidate || !Number.isInteger(candidate.version) || !Number.isFinite(candidate.restSeconds) || candidate.restSeconds <= 0) {
    throw new Error("올바른 휴식 시간이 없습니다.");
  }
  if (!Array.isArray(candidate.programs) || candidate.programs.length === 0) {
    throw new Error("운동 프로그램이 비어 있습니다.");
  }
  var ids = [];
  candidate.programs.forEach(function (program) {
    if (!(program !== null && program !== void 0 && program.id) || !(program !== null && program !== void 0 && program.name) || ids.indexOf(program.id) !== -1 || !Array.isArray(program.exercises)) {
      throw new Error("운동 프로그램 형식이 올바르지 않습니다.");
    }
    ids.push(program.id);
    if (program.exercises.length === 0) throw new Error("운동이 없는 프로그램이 있습니다.");
    program.exercises.forEach(function (exercise) {
      if (!(exercise !== null && exercise !== void 0 && exercise.name) || !Number.isInteger(exercise.sets) || exercise.sets < 1) {
        throw new Error("운동 세트 정보가 올바르지 않습니다.");
      }
    });
  });
}
function renderProgramCards() {
  var cards = config.programs.map(function (program) {
    var totalSets = getTotalSets(program);
    var card = document.createElement("button");
    card.className = "program-card";
    card.type = "button";
    card.dataset.programId = program.id;
    card.style.setProperty("--program-color", program.accent || "#ff7958");
    var copy = document.createElement("span");
    copy.className = "program-card-copy";
    var title = document.createElement("span");
    title.className = "program-title";
    title.textContent = program.name;
    var meta = document.createElement("span");
    meta.className = "program-meta";
    meta.textContent = `운동 ${program.exercises.length}종 · 총 ${totalSets}세트`;
    var exercises = document.createElement("span");
    exercises.className = "program-exercises";
    exercises.textContent = program.exercises.map(function (exercise) {
      return exercise.name;
    }).join(" → ");
    copy.append(title, meta, exercises);
    var arrow = document.createElement("span");
    arrow.className = "program-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    card.append(copy, arrow);
    return card;
  });
  elements.programList.replaceChildren.apply(elements.programList, cards);
}
function startProgram(programId) {
  var program = getProgram(programId);
  if (!program) return;
  cancelAlarmTest();
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
    setLog: []
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
  primaryActionUnlockTimer = window.setTimeout(function () {
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
  var program = getActiveProgram();
  var exercise = getCurrentExercise();
  if (!program || !exercise) return;
  activeSession.completedSets += 1;
  activeSession.setLog.push({
    exercise: exercise.name,
    set: activeSession.setIndex + 1,
    completedAt: Date.now()
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
  var _activeSession2;
  stopTimer();
  updateTimer();
  if (((_activeSession2 = activeSession) === null || _activeSession2 === void 0 ? void 0 : _activeSession2.phase) === "resting") {
    timerInterval = window.setInterval(updateTimer, 250);
  }
}
function updateTimer() {
  if (!activeSession || activeSession.phase !== "resting") {
    stopTimer();
    return;
  }
  var remainingMilliseconds = activeSession.restEndsAt - Date.now();
  if (remainingMilliseconds <= 0) {
    markRestComplete();
    return;
  }
  var remainingSeconds = Math.ceil(remainingMilliseconds / 1000);
  var clock = formatClock(remainingSeconds);
  if (elements.timerDisplay.textContent !== clock) {
    elements.timerDisplay.textContent = clock;
    elements.timerDisplay.dateTime = `PT${remainingSeconds}S`;
    document.title = `${clock} · 휴식 중`;
  }
}
function markRestComplete() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
    _ref$playSound = _ref.playSound,
    playSound = _ref$playSound === void 0 ? true : _ref$playSound;
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
  var program = getActiveProgram();
  var exercise = getCurrentExercise();
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
  var nextExercise = getCurrentExercise();
  if (nextExercise) announce(`${nextExercise.name} ${activeSession.setIndex + 1}세트입니다.`);
}
function completeProgram() {
  var program = getActiveProgram();
  if (!program) return;
  stopTimer();
  var completedAt = Date.now();
  lastCompletedSession = {
    programId: activeSession.programId,
    programName: program.name,
    totalSets: getTotalSets(program),
    startedAt: activeSession.startedAt,
    completedAt,
    durationSeconds: Math.max(1, Math.round((completedAt - activeSession.startedAt) / 1000))
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
  var program = getActiveProgram();
  var exercise = getCurrentExercise();
  if (!activeSession || !program || !exercise) {
    removeStoredSession();
    activeSession = null;
    showProgramSelection();
    return;
  }
  var totalSets = getTotalSets(program);
  var completed = Math.min(activeSession.completedSets, totalSets);
  var isExercisePhase = activeSession.phase === "exercise";
  var isRestComplete = activeSession.phase === "restComplete";
  elements.programName.textContent = program.name;
  elements.overallProgressText.textContent = `${completed} / ${totalSets} 세트`;
  elements.overallProgress.setAttribute("aria-valuemax", String(totalSets));
  elements.overallProgress.setAttribute("aria-valuenow", String(completed));
  elements.overallProgressBar.style.width = `${completed / totalSets * 100}%`;
  renderExerciseProgressSummary(program, exercise);
  elements.exerciseView.hidden = !isExercisePhase;
  elements.restView.hidden = isExercisePhase;
  elements.exerciseName.textContent = exercise.name;
  elements.setLabel.textContent = `${activeSession.setIndex + 1} / ${exercise.sets} 세트`;
  renderSetDots(exercise.sets);
  var upcoming = getUpcomingSet();
  elements.nextUp.hidden = !upcoming;
  elements.nextUpText.textContent = upcoming ? `${upcoming.exercise.name} · ${upcoming.setNumber}세트` : "";
  document.body.classList.toggle("is-resting", activeSession.phase === "resting");
  document.body.classList.toggle("is-rest-complete", isRestComplete);
  elements.themeColor.content = isRestComplete ? "#dcecdf" : "#f4f1ea";
  if (isExercisePhase) {
    var isFinalSet = completed === totalSets - 1;
    elements.encouragement.textContent = isFinalSet ? "마지막 세트예요. 끝까지 천천히!" : "운동을 마친 뒤 아래 버튼을 누르세요.";
    elements.actionHint.textContent = isFinalSet ? "마지막 세트 뒤에는 휴식 타이머가 시작되지 않아요." : "버튼을 누르면 1분 휴식이 시작됩니다.";
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
function renderExerciseProgressSummary(program, exercise) {
  var targetExerciseIndex = activeSession.exerciseIndex;
  if (activeSession.phase !== "exercise" && activeSession.setIndex + 1 >= exercise.sets) {
    targetExerciseIndex += 1;
  }
  var completedExercises = program.exercises.slice(0, targetExerciseIndex);
  var currentExercise = program.exercises[targetExerciseIndex] || null;
  var nextExercises = currentExercise ? program.exercises.slice(targetExerciseIndex + 1) : [];
  elements.completedExerciseList.textContent = formatExerciseProgressNames(completedExercises);
  elements.currentExerciseList.textContent = formatExerciseProgressNames(currentExercise ? [currentExercise] : []);
  elements.nextExerciseList.textContent = formatExerciseProgressNames(nextExercises);
}
function formatExerciseProgressNames(exercises) {
  var names = exercises.map(function (exercise) {
    return exercise.name;
  });
  return `(${names.length > 0 ? names.join(" → ") : "-"})`;
}
function renderSetDots(setCount) {
  var dots = Array.from({
    length: setCount
  }, function (_, index) {
    var dot = document.createElement("span");
    dot.className = "set-dot";
    var currentSetIsCompleted = activeSession.phase !== "exercise";
    if (index < activeSession.setIndex || currentSetIsCompleted && index === activeSession.setIndex) {
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
  var history = getHistory();
  elements.historySection.hidden = history.length === 0;
  var items = history.slice(0, 5).map(function (entry) {
    var item = document.createElement("li");
    item.className = "history-item";
    var name = document.createElement("strong");
    name.textContent = entry.programName;
    var time = document.createElement("time");
    var completedAt = new Date(entry.completedAt);
    time.dateTime = completedAt.toISOString();
    time.textContent = formatHistoryDate(completedAt);
    var detail = document.createElement("span");
    detail.textContent = `${entry.totalSets}세트 · ${formatDuration(entry.durationSeconds)}`;
    item.append(name, time, detail);
    return item;
  });
  elements.historyList.replaceChildren.apply(elements.historyList, items);
}
function showProgramSelection() {
  cancelAlarmTest();
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
  var hasProgress = activeSession.completedSets > 0 || activeSession.phase !== "exercise";
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
  var selectionHeading = document.querySelector("#select-screen h1");
  selectionHeading.tabIndex = -1;
  selectionHeading.focus();
  announce("운동 기록을 모두 지웠습니다.");
}
function showScreen(screenId) {
  var activeScreen = null;
  SCREEN_IDS.forEach(function (id) {
    var screen = document.querySelector(`#${id}`);
    screen.hidden = id !== screenId;
    if (id === screenId) activeScreen = screen;
  });
  window.scrollTo(0, 0);
  var heading = Array.from(activeScreen.querySelectorAll("h1")).find(function (candidate) {
    return !candidate.closest("[hidden]");
  });
  if (heading) {
    heading.tabIndex = -1;
    window.requestAnimationFrame(function () {
      return heading.focus();
    });
  }
}
function nudgeCurrentHeadingForShortViewport() {
  if (!window.matchMedia || !window.matchMedia("(max-height: 700px)").matches) return;
  window.requestAnimationFrame(function () {
    var heading = Array.from(document.querySelectorAll("#workout-screen h1")).find(function (candidate) {
      return !candidate.closest("[hidden]");
    });
    if (!heading) return;
    var top = heading.getBoundingClientRect().top;
    if (top < 12) window.scrollBy(0, top - 12);
  });
}
function getProgram(programId) {
  var _config$programs$find, _config;
  return (_config$programs$find = (_config = config) === null || _config === void 0 ? void 0 : _config.programs.find(function (program) {
    return program.id === programId;
  })) !== null && _config$programs$find !== void 0 ? _config$programs$find : null;
}
function getActiveProgram() {
  return activeSession ? getProgram(activeSession.programId) : null;
}
function getCurrentExercise() {
  var _getActiveProgram$exe, _getActiveProgram;
  return (_getActiveProgram$exe = (_getActiveProgram = getActiveProgram()) === null || _getActiveProgram === void 0 ? void 0 : _getActiveProgram.exercises[activeSession.exerciseIndex]) !== null && _getActiveProgram$exe !== void 0 ? _getActiveProgram$exe : null;
}
function getTotalSets(program) {
  return program.exercises.reduce(function (sum, exercise) {
    return sum + exercise.sets;
  }, 0);
}
function getProgramSignature(program) {
  return program.exercises.map(function (exercise) {
    return `${exercise.name}:${exercise.sets}`;
  }).join("|");
}
function getUpcomingSet() {
  var program = getActiveProgram();
  var exercise = getCurrentExercise();
  if (!program || !exercise) return null;
  if (activeSession.setIndex + 1 < exercise.sets) {
    return {
      exercise,
      setNumber: activeSession.setIndex + 2
    };
  }
  var nextExercise = program.exercises[activeSession.exerciseIndex + 1];
  return nextExercise ? {
    exercise: nextExercise,
    setNumber: 1
  } : null;
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
    var candidate = JSON.parse(localStorage.getItem(STORAGE_KEYS.session));
    if (!candidate || candidate.version !== 1) return null;
    var program = getProgram(candidate.programId);
    var exercise = program === null || program === void 0 ? void 0 : program.exercises[candidate.exerciseIndex];
    var validPhase = ["exercise", "resting", "restComplete"].includes(candidate.phase);
    var validRestEnd = candidate.phase === "resting" ? Number.isFinite(candidate.restEndsAt) : candidate.restEndsAt === null;
    var totalSets = program ? getTotalSets(program) : 0;
    var completedBeforeCurrentExercise = program ? program.exercises.slice(0, candidate.exerciseIndex).reduce(function (sum, candidateExercise) {
      return sum + candidateExercise.sets;
    }, 0) : 0;
    var expectedCompletedSets = completedBeforeCurrentExercise + candidate.setIndex + (candidate.phase === "exercise" ? 0 : 1);
    var isValid = program && exercise && candidate.programVersion === config.version && candidate.programSignature === getProgramSignature(program) && validPhase && validRestEnd && Number.isInteger(candidate.exerciseIndex) && Number.isInteger(candidate.setIndex) && candidate.setIndex >= 0 && candidate.setIndex < exercise.sets && Number.isInteger(candidate.completedSets) && candidate.completedSets >= 0 && candidate.completedSets < totalSets && candidate.completedSets === expectedCompletedSets && Number.isFinite(candidate.startedAt) && Array.isArray(candidate.setLog) && candidate.setLog.length === candidate.completedSets;
    if (!isValid) throw new Error("저장된 진행 상태가 올바르지 않습니다.");
    return candidate;
  } catch (error) {
    console.warn("저장된 진행 상태를 복원하지 못했습니다.", error);
    removeStoredSession();
    return null;
  }
}
function reconcileRestTimer() {
  var _activeSession3;
  if (((_activeSession3 = activeSession) === null || _activeSession3 === void 0 ? void 0 : _activeSession3.phase) === "resting" && activeSession.restEndsAt <= Date.now()) {
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
  var history = getHistory();
  history.unshift({
    id: `${session.completedAt}-${session.programId}`,
    programId: session.programId,
    programName: session.programName,
    totalSets: session.totalSets,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    durationSeconds: session.durationSeconds
  });
  try {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  } catch (error) {
    console.warn("운동 기록을 저장하지 못했습니다.", error);
  }
}
function getHistory() {
  try {
    var history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
    return Array.isArray(history) ? history.filter(function (entry) {
      return entry && typeof entry.programName === "string" && Number.isFinite(entry.completedAt) && Number.isFinite(new Date(entry.completedAt).getTime()) && Number.isFinite(entry.durationSeconds) && entry.durationSeconds > 0 && Number.isInteger(entry.totalSets) && entry.totalSets > 0;
    }) : [];
  } catch (_unused) {
    return [];
  }
}
function restoreSettings() {
  try {
    var settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
    soundEnabled = settings.soundEnabled !== false;
  } catch (_unused2) {
    soundEnabled = true;
  }
  renderSoundSetting();
}
function toggleSound() {
  var nextSoundEnabled = !soundEnabled;
  if (!nextSoundEnabled) cancelAlarmTest();
  soundEnabled = nextSoundEnabled;
  if (soundEnabled) ensureAudioContext();
  saveSoundSetting();
  renderSoundSetting();
  announce(soundEnabled ? "효과음을 켰습니다." : "효과음을 껐습니다.");
}
function saveSoundSetting() {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({
      soundEnabled
    }));
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
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;
  elements.alarmTest.classList.remove("is-counting", "is-complete");
  elements.alarmTestButton.removeAttribute("aria-busy");
  elements.alarmTestButton.disabled = !AudioContextClass;
  if (!AudioContextClass) {
    elements.alarmTestButton.textContent = "재생할 수 없음";
    elements.alarmTestStatus.textContent = "이 브라우저에서는 알람 소리 재생을 지원하지 않습니다.";
  } else if (soundEnabled) {
    elements.alarmTestButton.textContent = "3초 테스트";
    elements.alarmTestStatus.textContent = "3초 후 실제 휴식 종료 알림을 재현합니다. 기기 음량 버튼으로 조절하세요.";
  } else {
    elements.alarmTestButton.textContent = "소리 켜고 테스트";
    elements.alarmTestStatus.textContent = "테스트를 시작하면 효과음도 함께 켜집니다. 기기 음량 버튼으로 조절하세요.";
  }
}
function startAlarmTest() {
  if (alarmTestEndsAt !== null || alarmTestResetTimer !== null) return;
  if (!soundEnabled) {
    soundEnabled = true;
    saveSoundSetting();
    renderSoundSetting();
  }
  var context = ensureAudioContext();
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
  var remainingMilliseconds = alarmTestEndsAt - Date.now();
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
  alarmTestResetTimer = window.setTimeout(function () {
    return cancelAlarmTest(false);
  }, ALARM_TEST_COMPLETE_HOLD_MS);
}
function cancelAlarmTest() {
  var stopScheduledSound = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
  var wasActive = alarmTestInterval !== null || alarmTestResetTimer !== null || alarmTestEndsAt !== null || alarmTestSources.length > 0 || document.body.classList.contains("is-alarm-test-complete");
  window.clearInterval(alarmTestInterval);
  window.clearTimeout(alarmTestResetTimer);
  alarmTestInterval = null;
  alarmTestResetTimer = null;
  alarmTestEndsAt = null;
  if (stopScheduledSound) stopAlarmTestSources();
  alarmTestSources = [];
  if (wasActive) {
    document.body.classList.remove("is-alarm-test-complete");
    elements.themeColor.content = document.body.classList.contains("is-rest-complete") ? "#dcecdf" : "#f4f1ea";
  }
  renderAlarmTestIdle();
}
function stopAlarmTestSources() {
  alarmTestSources.forEach(function (source) {
    try {
      source.stop();
    } catch (error) {}
  });
}
function ensureAudioContext() {
  if (!soundEnabled) return null;
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    var _audioContext;
    if (((_audioContext = audioContext) === null || _audioContext === void 0 ? void 0 : _audioContext.state) === "closed") audioContext = null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state && audioContext.state !== "running" && typeof audioContext.resume === "function") {
      var resumeResult = audioContext.resume();
      if (resumeResult && typeof resumeResult.catch === "function") {
        resumeResult.catch(function (error) {
          return console.warn("오디오 재생을 시작하지 못했습니다.", error);
        });
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
  var context = ensureAudioContext();
  if (!canPlayAudio(context)) return [];
  try {
    return scheduleRestChime(context, context.currentTime);
  } catch (error) {
    console.warn("휴식 종료 알람을 재생하지 못했습니다.", error);
    return [];
  }
}
function scheduleRestChime(context, startsAt) {
  return [playTone(context, 523.25, startsAt, 0.42, 0.035), playTone(context, 659.25, startsAt + 0.16, 0.48, 0.03)];
}
function canPlayAudio(context) {
  return Boolean(context && (!context.state || context.state === "running"));
}
function playCompletionChime() {
  if (!soundEnabled) return;
  var context = ensureAudioContext();
  if (!canPlayAudio(context)) return;
  try {
    var now = context.currentTime;
    playTone(context, 392, now, 0.34, 0.025);
    playTone(context, 523.25, now + 0.12, 0.42, 0.03);
    playTone(context, 659.25, now + 0.25, 0.48, 0.025);
  } catch (error) {
    console.warn("운동 완료 알람을 재생하지 못했습니다.", error);
  }
}
function playTone(context, frequency, startsAt, duration, volume) {
  var oscillator = context.createOscillator();
  var gain = context.createGain();
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
  window.setTimeout(function () {
    elements.liveRegion.textContent = message;
  }, 30);
}
function formatClock(totalSeconds) {
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function formatDuration(totalSeconds) {
  var minutes = Math.floor(totalSeconds / 60);
  if (minutes < 1) return `${Math.max(1, totalSeconds)}초`;
  if (minutes < 60) return `${minutes}분`;
  var hours = Math.floor(minutes / 60);
  var remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}
function formatHistoryDate(date) {
  var now = new Date();
  var sameYear = date.getFullYear() === now.getFullYear();
  if (window.Intl && typeof window.Intl.DateTimeFormat === "function") {
    try {
      var options = {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      };
      if (!sameYear) options.year = "numeric";
      return new Intl.DateTimeFormat("ko-KR", options).format(date);
    } catch (error) {
      console.warn("날짜를 기본 형식으로 표시합니다.", error);
    }
  }
  var year = sameYear ? "" : `${date.getFullYear()}년 `;
  return `${year}${date.getMonth() + 1}월 ${date.getDate()}일 ${formatClock(date.getHours() * 60 + date.getMinutes())}`;
}
