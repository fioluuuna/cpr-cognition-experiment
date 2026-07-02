const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const CONDITIONS = {
  control: {
    label: "Control",
    explanation: "No explanation",
    cue: "The system only shows the next action.",
    template: "control",
  },
  direct: {
    label: "Direct",
    explanation: "Instruction only",
    cue: "A short command plus the next action.",
    template: "direct",
  },
  concise: {
    label: "Concise",
    explanation: "Brief rationale",
    cue: "A short command with one sentence of reason.",
    template: "concise",
  },
  full: {
    label: "Full",
    explanation: "Detailed rationale",
    cue: "A command plus fuller rationale and step context.",
    template: "full",
  },
};

const PRESSURES = {
  low: {
    label: "Low",
    stepSeconds: 70,
    totalMinutes: 10,
    meter: 28,
    visibleCountdown: true,
    sound: false,
  },
  high: {
    label: "High",
    stepSeconds: 25,
    totalMinutes: 6,
    meter: 88,
    visibleCountdown: true,
    sound: true,
  },
  hidden: {
    label: "Hidden timer",
    stepSeconds: 35,
    totalMinutes: 8,
    meter: 55,
    visibleCountdown: false,
    sound: false,
  },
};

const SCENARIOS = {
  baseline: {
    label: "Baseline CPR",
    description: "Single adult CPR scenario with no interruption.",
    interruptAt: null,
    errorAt: null,
  },
  interrupt: {
    label: "Interruptive CPR",
    description: "A bystander interrupts once during the middle steps.",
    interruptAt: "response_check",
    errorAt: null,
  },
  error: {
    label: "Error-correction CPR",
    description: "A deliberate wrong turn is inserted and then corrected.",
    interruptAt: null,
    errorAt: "compressions",
  },
  stress: {
    label: "High-stress CPR",
    description: "Tighter pacing, one interruption, and a late-stage reminder.",
    interruptAt: "call_help",
    errorAt: "aed_handover",
  },
};

const STEPS = [
  {
    id: "scene_safety",
    title: "Scene safety",
    prompt: "Check that the environment is safe before approaching the patient.",
    rationale:
      "Unsafe scenes can create additional casualties. A safe approach is the first gate in emergency response.",
    details:
      "Look for fire, traffic, electrical risk, or crowding. Delegate if needed, but do not rush into an unsafe scene.",
    correct: "safe",
    options: [
      { key: "safe", label: "Approach carefully and check the scene", note: "This matches the protocol." },
      { key: "rush", label: "Run straight in immediately", note: "This increases risk." },
      { key: "call", label: "Ask someone to call emergency services", note: "Helpful, but safety comes first." },
    ],
    corrections: [
      "Before anything else, confirm the scene is safe.",
      "If the scene is unsafe, do not proceed until it is controlled.",
    ],
  },
  {
    id: "response_check",
    title: "Check responsiveness",
    prompt: "Tap and shout, then check breathing.",
    rationale:
      "Responsiveness and breathing status determine whether the participant should move into the CPR branch.",
    details:
      "Move from observation to action quickly. A systematic check reduces hesitation and helps the user understand why CPR is or is not needed.",
    correct: "check",
    options: [
      { key: "check", label: "Tap, shout, and check breathing", note: "Correct emergency check." },
      { key: "wait", label: "Wait and observe silently", note: "This delays action." },
      { key: "water", label: "Give the person water", note: "Not appropriate here." },
    ],
    corrections: [
      "If the person is unresponsive, continue to the next step.",
      "Normal breathing, not movement, is the key decision cue.",
    ],
  },
  {
    id: "call_help",
    title: "Call for help",
    prompt: "Call 120 and ask for an AED.",
    rationale:
      "Calling early brings professional help and a defibrillator sooner, while one rescuer continues CPR.",
    details:
      "The participant can delegate the call if a bystander is present. This step tests whether the explanation helps them stay action-oriented.",
    correct: "call_120",
    options: [
      { key: "call_120", label: "Call 120 and ask for AED", note: "Correct emergency escalation." },
      { key: "video", label: "Record a video first", note: "Not helpful in the moment." },
      { key: "wait", label: "Keep watching and do nothing", note: "Breaks the response chain." },
    ],
    corrections: [
      "Emergency services and AED support should be requested immediately.",
      "Do not wait for certainty before calling.",
    ],
  },
  {
    id: "compressions",
    title: "Start compressions",
    prompt: "Begin chest compressions now.",
    rationale:
      "For suspected cardiac arrest, early compressions support circulation while help is on the way.",
    details:
      "This is the action-critical stage. Explanation should support execution without overloading the participant.",
    correct: "compress",
    options: [
      { key: "compress", label: "Start compressions", note: "Correct immediate action." },
      { key: "search", label: "Search the web for more detail", note: "Too slow for this step." },
      { key: "ask", label: "Ask the patient to sit up", note: "Not appropriate if unresponsive." },
    ],
    corrections: [
      "Compression quality matters, but movement should start now.",
      "If you hesitated, return to the compression step immediately.",
    ],
  },
  {
    id: "aed_handover",
    title: "AED and handover",
    prompt: "Prepare to use the AED and hand over the key facts.",
    rationale:
      "The final stage checks whether the participant can continue the flow and summarize the case clearly.",
    details:
      "This stage combines continuation, recovery from interruptions, and the transfer of task state to the next rescuer.",
    correct: "aed",
    options: [
      { key: "aed", label: "Prepare AED and hand over", note: "Correct final action." },
      { key: "stop", label: "Stop and leave immediately", note: "Breaks the flow." },
      { key: "forget", label: "Forget the prior steps", note: "Reduces execution quality." },
    ],
    corrections: [
      "Keep the task state visible for handover.",
      "Do not drop the AED or the summary stage.",
    ],
  },
];

const QUESTIONNAIRES = {
  pre: [
    ["experience", "Prior CPR / first-aid experience"],
    ["selfEfficacy", "I feel capable of helping in an emergency"],
    ["trustBaseline", "I generally trust AI guidance"],
  ],
  post: [
    ["trust", "The guidance was trustworthy"],
    ["calibration", "I trusted the system at the right level"],
    ["understand", "The explanation was easy to understand"],
    ["control", "I still felt in control of my own decisions"],
    ["load", "The task felt mentally demanding"],
    ["stress", "The task felt stressful"],
    ["actionability", "The guidance helped me know what to do next"],
    ["use", "I would want to use a system like this in a real emergency"],
  ],
};

const SURVEY_TYPES = [
  {
    id: "stateTrust",
    label: "Trust state",
    items: [
      ["trustNow", "I trusted the system right now"],
      ["follow", "I was willing to follow the guidance"],
    ],
  },
  {
    id: "cognitiveLoad",
    label: "Cognitive load",
    items: [
      ["effort", "Mental effort"],
      ["overload", "I felt overloaded"],
      ["pressure", "I felt time pressure"],
    ],
  },
  {
    id: "actionQuality",
    label: "Action quality",
    items: [
      ["readiness", "I felt ready to act"],
      ["continuity", "I could keep going after interruptions"],
      ["correction", "I could correct mistakes quickly"],
    ],
  },
];

const STORAGE_KEY = "cpr-cognition-experiment-draft-v1";

const state = {
  phase: "setup",
  sessionId: "",
  participantId: "",
  trialId: "",
  trialIndex: 1,
  condition: "direct",
  pressure: "low",
  scenario: "baseline",
  visibleCountdown: true,
  explanationTone: "instruction",
  notes: "",
  startedAt: 0,
  finishedAt: 0,
  stepIndex: 0,
  responses: [],
  events: [],
  annotations: [],
  interruptionCount: 0,
  errorCount: 0,
  explanationRequests: 0,
  explanationReplays: 0,
  explanationSkips: 0,
  pauseCount: 0,
  isPaused: false,
  pausedRemainingMs: 0,
  pauseStartedAt: 0,
  midTaskInterruptions: 0,
  correctionAcceptCount: 0,
  correctionRejectCount: 0,
  stageFlags: {
    consentDone: false,
    deviceCheckDone: false,
    trainingDone: false,
    taskDone: false,
    questionnaireDone: false,
    interviewDone: false,
  },
  questionnaire: {
    pre: {},
    post: {},
    short: {},
  },
  taskState: {
    scenarioStatus: "scene_safe",
    lastAction: "",
    summary: "",
    revealLevel: "basic",
    countdownVisible: true,
    pressureMode: "low",
  },
  currentDeadline: 0,
  taskStartTime: 0,
  currentChoice: null,
  activeStepId: "",
  timerHandle: null,
  model: null,
  replayFilter: "all",
  selectedEventId: "",
  liveViewLocked: false,
};

const els = {
  setupView: $("#setupView"),
  participantView: $("#participantView"),
  taskView: $("#taskView"),
  questionnaireView: $("#questionnaireView"),
  interviewView: $("#interviewView"),
  completeView: $("#completeView"),
  experimenterView: $("#experimenterView"),
  replayView: $("#replayView"),
  exportView: $("#exportView"),
  participantId: $("#participantId"),
  trialIndex: $("#trialIndex"),
  condition: $("#condition"),
  pressure: $("#pressure"),
  scenario: $("#scenario"),
  countdownToggle: $("#countdownToggle"),
  explanationMode: $("#explanationMode"),
  participantNotes: $("#participantNotes"),
  startBtn: $("#startBtn"),
  randomizeBtn: $("#randomizeBtn"),
  loadDraftBtn: $("#loadDraftBtn"),
  saveDraftBtn: $("#saveDraftBtn"),
  consentYes: $("#consentYes"),
  consentNo: $("#consentNo"),
  deviceCheckBtn: $("#deviceCheckBtn"),
  trainingBtn: $("#trainingBtn"),
  beginTaskBtn: $("#beginTaskBtn"),
  beginTaskBtn2: $("#beginTaskBtn2"),
  pauseBtn: $("#pauseBtn"),
  pauseBtn2: $("#pauseBtn2"),
  endTaskBtn: $("#endTaskBtn"),
  endTaskBtn2: $("#endTaskBtn2"),
  injectErrorBtn: $("#injectErrorBtn"),
  injectErrorBtn2: $("#injectErrorBtn2"),
  injectInterruptBtn: $("#injectInterruptBtn"),
  injectInterruptBtn2: $("#injectInterruptBtn2"),
  injectReminderBtn: $("#injectReminderBtn"),
  injectReminderBtn2: $("#injectReminderBtn2"),
  injectCorrectionBtn: $("#injectCorrectionBtn"),
  previousStepBtn: $("#previousStepBtn"),
  repeatStepBtn: $("#repeatStepBtn"),
  explainMoreBtn: $("#explainMoreBtn"),
  repeatExplanationBtn: $("#repeatExplanationBtn"),
  skipExplanationBtn: $("#skipExplanationBtn"),
  acceptCorrectionBtn: $("#acceptCorrectionBtn"),
  rejectCorrectionBtn: $("#rejectCorrectionBtn"),
  addNoteBtn: $("#addNoteBtn"),
  finishSessionBtn: $("#finishSessionBtn"),
  exportJsonBtn: $("#exportJsonBtn"),
  exportCsvBtn: $("#exportCsvBtn"),
  downloadReplayBtn: $("#downloadReplayBtn"),
  replayFilter: $("#replayFilter"),
  clearBtn: $("#clearBtn"),
  clearBtn2: $("#clearBtn2"),
  timerText: $("#timerText"),
  totalClock: $("#totalClock"),
  connectionChip: $("#connectionChip"),
  trialChip: $("#trialChip"),
  pressureChip: $("#pressureChip"),
  conditionChip: $("#conditionChip"),
  stepChip: $("#stepChip"),
  progressFill: $("#progressFill"),
  currentStageTitle: $("#currentStageTitle"),
  currentStageDesc: $("#currentStageDesc"),
  stepProgressText: $("#stepProgressText"),
  scenarioBanner: $("#scenarioBanner"),
  explanationCard: $("#explanationCard"),
  explanationTitle: $("#explanationTitle"),
  explanationBody: $("#explanationBody"),
  explanationBullets: $("#explanationBullets"),
  explanationCues: $("#explanationCues"),
  responseGrid: $("#responseGrid"),
  liveLog: $("#liveLog"),
  statusSummary: $("#statusSummary"),
  summaryList: $("#summaryList"),
  questionnairePre: $("#questionnairePre"),
  questionnairePost: $("#questionnairePost"),
  questionnaireShort: $("#questionnaireShort"),
  interviewInput: $("#interviewInput"),
  resultJson: $("#resultJson"),
  resultCsv: $("#resultCsv"),
  replayList: $("#replayList"),
  replayDetail: $("#replayDetail"),
  annotationInput: $("#annotationInput"),
  annotationType: $("#annotationType"),
  annotationBtn: $("#annotationBtn"),
  visibleCountdownLabel: $("#visibleCountdownLabel"),
  pressureLabel: $("#pressureLabel"),
  modeLabel: $("#modeLabel"),
  participantOverview: $("#participantOverview"),
  experimenterStatus: $("#experimenterStatus"),
  experimenterStep: $("#experimenterStep"),
  experimenterMetrics: $("#experimenterMetrics"),
  switchConditionBtn: $("#switchConditionBtn"),
};

function now() {
  return Date.now();
}

function ts(value = now()) {
  return new Date(value).toISOString();
}

function uid(prefix = "session") {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}-${Date.now().toString(36)}`;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

function normalizeId(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "-") || "P01";
}

function durationMs(start, end = now()) {
  return Math.max(0, end - start);
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${pad(s)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function currentStep() {
  return STEPS[state.stepIndex] || null;
}

function buildConditionTemplate() {
  const condition = CONDITIONS[state.condition];
  const step = currentStep();
  if (!step) return { title: "", body: "", bullets: [], cue: condition.cue };
  const bodyByMode = {
    control: step.prompt,
    direct: `${step.prompt} Do the next action now.`,
    concise: `${step.prompt} ${step.rationale}`,
    full: `${step.prompt} ${step.rationale} ${step.details}`,
  };
  const bulletsByMode = {
    control: step.corrections.slice(0, 2),
    direct: [step.correct === "safe" ? "Start with safety." : "Move to the next response step.", "Keep moving forward."],
    concise: step.corrections,
    full: [step.rationale, step.details, ...step.corrections],
  };
  return {
    title: condition.label,
    body: bodyByMode[state.condition],
    bullets: bulletsByMode[state.condition],
    cue: condition.cue,
  };
}

function buildSessionSummary() {
  const responseSteps = state.responses.filter((r) => r.type === "choice");
  const correctSteps = responseSteps.filter((r) => r.correct).length;
  const reactionTimes = responseSteps.map((r) => r.reactionMs).filter((n) => typeof n === "number");
  const stepDurations = responseSteps.map((r) => r.completeMs).filter((n) => typeof n === "number");
  const trust = Object.values(state.questionnaire.post).map(Number).filter((n) => !Number.isNaN(n));
  const load = [state.questionnaire.post.load, state.questionnaire.short.load, state.questionnaire.short.pressure]
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  return {
    sessionId: state.sessionId,
    participantId: state.participantId,
    trialId: state.trialId,
    condition: state.condition,
    pressure: state.pressure,
    scenario: state.scenario,
    phase: state.phase,
    startedAt: state.startedAt ? ts(state.startedAt) : "",
    finishedAt: state.finishedAt ? ts(state.finishedAt) : "",
    durationMs: state.finishedAt ? durationMs(state.startedAt, state.finishedAt) : durationMs(state.startedAt),
    totalSteps: STEPS.length,
    completedSteps: responseSteps.length,
    accuracy: responseSteps.length ? Number((correctSteps / responseSteps.length).toFixed(2)) : 0,
    meanReactionMs: reactionTimes.length ? Math.round(mean(reactionTimes)) : 0,
    meanStepMs: stepDurations.length ? Math.round(mean(stepDurations)) : 0,
    interruptions: state.interruptionCount,
    errors: state.errorCount,
    explanationRequests: state.explanationRequests,
    explanationReplays: state.explanationReplays,
    explanationSkips: state.explanationSkips,
    correctionAcceptCount: state.correctionAcceptCount,
    correctionRejectCount: state.correctionRejectCount,
    trustMean: trust.length ? Number(mean(trust).toFixed(2)) : 0,
    loadMean: load.length ? Number(mean(load).toFixed(2)) : 0,
    notes: state.notes,
  };
}

function addEvent(type, detail = {}, stepId = null) {
  const active = currentStep();
  const event = {
    eventId: `${state.sessionId || "draft"}-${state.events.length + 1}`,
    sessionId: state.sessionId,
    conditionId: state.condition,
    trialId: state.trialId,
    trialIndex: state.trialIndex,
    stepId: stepId || (active ? active.id : ""),
    phase: state.phase,
    type,
    detail,
    timestamp: ts(),
    timestampMs: now(),
    context: {
      stepIndex: state.stepIndex,
      visibleCountdown: state.visibleCountdown,
      explanationMode: state.explanationMode,
      pressure: state.pressure,
      scenario: state.scenario,
      countdownVisible: state.visibleCountdown,
    },
  };
  state.events.push(event);
  if (type === "choice_made" && detail.correct) {
    state.taskState.lastAction = detail.choice;
  }
  renderLiveLog();
  renderReplay();
  renderSummary();
  persistDraft();
  return event;
}

function persistDraft() {
  const draft = {
    state: clone(state),
    summary: buildSessionSummary(),
  };
  localStorage.setItem(STORAGE_KEY, safeJson(draft));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

function switchPhase(phase) {
  state.phase = phase;
  const map = {
    setup: [els.setupView],
    participant: [els.participantView],
    task: [els.taskView],
    questionnaire: [els.questionnaireView],
    interview: [els.interviewView],
    complete: [els.completeView],
    experimenter: [els.experimenterView],
    replay: [els.replayView],
    export: [els.exportView],
  };
  const all = [
    els.setupView,
    els.participantView,
    els.taskView,
    els.questionnaireView,
    els.interviewView,
    els.completeView,
    els.experimenterView,
    els.replayView,
    els.exportView,
  ];
  all.forEach((node) => node.classList.add("hidden"));
  (map[phase] || []).forEach((node) => node.classList.remove("hidden"));
  $$(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.target === phase);
  });
  updateTopChips();
}

function updateTopChips() {
  const step = currentStep();
  els.connectionChip.textContent = navigator.onLine ? "Online" : "Offline";
  els.trialChip.textContent = state.trialId || "No trial";
  els.pressureChip.textContent = PRESSURES[state.pressure].label;
  els.conditionChip.textContent = CONDITIONS[state.condition].label;
  els.stepChip.textContent = step ? `${state.stepIndex + 1}/${STEPS.length}` : "-";
  els.visibleCountdownLabel.textContent = state.visibleCountdown ? "Visible timer" : "Hidden timer";
  els.pressureLabel.textContent = PRESSURES[state.pressure].label;
  els.modeLabel.textContent = CONDITIONS[state.condition].explanation;
  els.participantOverview.textContent = [
    `Participant: ${state.participantId || "-"}`,
    `Trial: ${state.trialId || "-"}`,
    `Scenario: ${SCENARIOS[state.scenario].label}`,
    `Countdown: ${state.visibleCountdown ? "Visible" : "Hidden"}`,
  ].join(" | ");
}

function renderSetup() {
  const summary = buildSessionSummary();
  els.experimenterStatus.textContent = `Ready to configure trial`;
  els.experimenterStep.textContent = `Current phase: ${state.phase}`;
  els.experimenterMetrics.textContent = [
    `Logs: ${state.events.length}`,
    `Choices: ${state.responses.filter((r) => r.type === "choice").length}`,
    `Interruption events: ${state.interruptionCount}`,
  ].join(" | ");
  els.statusSummary.textContent = `Current summary: ${summary.completedSteps}/${summary.totalSteps} steps recorded.`;
  renderSummary();
}

function renderSummary() {
  const summary = buildSessionSummary();
  els.summaryList.innerHTML = [
    `Session: ${summary.sessionId || "-"}`,
    `Duration: ${summary.durationMs} ms`,
    `Accuracy: ${summary.accuracy}`,
    `Mean reaction: ${summary.meanReactionMs} ms`,
    `Mean step time: ${summary.meanStepMs} ms`,
    `Explanation requests: ${summary.explanationRequests}`,
    `Replays: ${summary.explanationReplays}`,
    `Skips: ${summary.explanationSkips}`,
    `Interruptions: ${summary.interruptions}`,
    `Errors: ${summary.errors}`,
    `Correction acceptance: ${summary.correctionAcceptCount}`,
  ]
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderTimer() {
  const elapsed = state.startedAt ? durationMs(state.startedAt) : 0;
  els.totalClock.textContent = formatClock(elapsed);
  if (!state.startedAt) {
    els.timerText.textContent = "--:--";
    return;
  }
  const step = currentStep();
  if (!step) {
    els.timerText.textContent = "--:--";
    return;
  }
  const remaining = Math.max(0, state.currentDeadline - now());
  els.timerText.textContent = PRESSURES[state.pressure].visibleCountdown && state.visibleCountdown ? formatClock(remaining) : "Hidden";
  els.progressFill.style.width = `${Math.min(100, (state.stepIndex / STEPS.length) * 100)}%`;
}

function renderScenarioBanner() {
  const step = currentStep();
  const scenario = SCENARIOS[state.scenario];
  const pressure = PRESSURES[state.pressure];
  const message = [
    `${scenario.label}: ${scenario.description}`,
    `Pressure mode: ${pressure.label}.`,
    step ? `Current step: ${step.title}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  els.scenarioBanner.textContent = message;
}

function renderExplanation(requestType = "main") {
  const step = currentStep();
  const pack = buildConditionTemplate();
  if (!step) return;
  const explanation = {
    title: `${CONDITIONS[state.condition].label} explanation`,
    body: pack.body,
    bullets: pack.bullets,
    cue: pack.cue,
  };
  els.explanationTitle.textContent = explanation.title;
  els.explanationBody.textContent = explanation.body;
  els.explanationBullets.innerHTML = explanation.bullets
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  els.explanationCues.textContent = explanation.cue;
  addEvent("explanation_rendered", { requestType, mode: state.condition, step: step.id }, step.id);
  if (state.pressure !== "low" && PRESSURES[state.pressure].sound) {
    pulsePressureTone();
  }
}

function pulsePressureTone() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.02;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
    addEvent("pressure_tone", { frequency: 880 }, currentStep()?.id || "");
  } catch {
    addEvent("pressure_tone_failed", {}, currentStep()?.id || "");
  }
}

function speak(text, label = "speech") {
  if (!("speechSynthesis" in window)) {
    addEvent("speech_unavailable", { label }, currentStep()?.id || "");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = state.condition === "full" ? 0.95 : 1.02;
  utterance.pitch = state.pressure === "high" ? 1.08 : 1;
  utterance.onstart = () => addEvent("speech_start", { label, text }, currentStep()?.id || "");
  utterance.onend = () => addEvent("speech_end", { label }, currentStep()?.id || "");
  utterance.onerror = () => addEvent("speech_error", { label }, currentStep()?.id || "");
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function renderTask(preserveDeadline = false) {
  const step = currentStep();
  if (!step) return;
  state.activeStepId = step.id;
  const condition = buildConditionTemplate();
  els.currentStageTitle.textContent = step.title;
  els.currentStageDesc.textContent = condition.body;
  els.stepProgressText.textContent = `Step ${state.stepIndex + 1} / ${STEPS.length}`;
  els.explanationCard.classList.remove("hidden");
  renderExplanation("step");
  renderScenarioBanner();
  renderActionButtons();
  if (!preserveDeadline) {
    state.currentDeadline = now() + PRESSURES[state.pressure].stepSeconds * 1000;
  }
  renderTimer();
  addEvent("step_presented", {
    stepTitle: step.title,
    stepPrompt: step.prompt,
    explanationMode: state.condition,
    pressure: state.pressure,
    countdownVisible: state.visibleCountdown,
  }, step.id);
  startPressureClock();
}

function renderActionButtons() {
  const step = currentStep();
  if (!step) return;
  els.responseGrid.innerHTML = "";
  step.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.innerHTML = `
      <strong>${escapeHtml(option.label)}</strong>
      <span>${escapeHtml(option.note)}</span>
    `;
    button.addEventListener("click", () => submitChoice(option.key, option.label, false));
    els.responseGrid.appendChild(button);
  });
}

function startPressureClock() {
  clearInterval(state.timerHandle);
  state.timerHandle = setInterval(() => {
    renderTimer();
    if (state.isPaused) return;
    if (state.startedAt && state.phase === "task" && now() > state.currentDeadline) {
      addEvent("step_timeout", { step: state.activeStepId }, state.activeStepId);
      markResponse(currentStep(), "timeout", false, {
        timeout: true,
        reactionMs: PRESSURES[state.pressure].stepSeconds * 1000,
      });
      clearInterval(state.timerHandle);
      nextStep();
    }
  }, 250);
}

function stopPressureClock() {
  clearInterval(state.timerHandle);
  state.timerHandle = null;
}

function updatePauseButtons() {
  const label = state.isPaused ? "Resume task" : "Pause task";
  [els.pauseBtn, els.pauseBtn2].forEach((button) => {
    if (button) button.textContent = label;
  });
}

function markResponse(step, choice, correct, extras = {}) {
  const response = {
    type: "choice",
    trialId: state.trialId,
    trialIndex: state.trialIndex,
    stepId: step?.id || "",
    stepTitle: step?.title || "",
    choice,
    correct,
    at: ts(),
    atMs: now(),
    reactionMs: extras.reactionMs ?? null,
    completeMs: extras.completeMs ?? null,
    timeout: Boolean(extras.timeout),
    interruptionCount: state.interruptionCount,
    errorCount: state.errorCount,
    explanationRequests: state.explanationRequests,
    explanationReplays: state.explanationReplays,
    explanationSkips: state.explanationSkips,
  };
  state.responses.push(response);
  addEvent("choice_made", response, step?.id || "");
  renderSummary();
  return response;
}

function submitChoice(choice, label, fromCorrection = false) {
  const step = currentStep();
  if (!step || state.phase !== "task") return;
  const reactionMs = durationMs(state.stepPresentedAt);
  const completeMs = durationMs(state.stepPresentedAt);
  const correct = choice === step.correct;
  state.taskState.lastAction = choice;
  state.taskState.scenarioStatus = step.id;
  stopPressureClock();
  markResponse(step, choice, correct, { reactionMs, completeMs });
  if (correct) {
    addEvent("step_correct", { choice, label, fromCorrection }, step.id);
    nextStep();
    return;
  }
  addEvent("step_error", { choice, label, fromCorrection }, step.id);
  state.errorCount += 1;
  state.currentChoice = choice;
  renderCorrectionPanel(step, choice);
  renderLiveLog();
}

function renderCorrectionPanel(step, choice) {
  els.currentStageDesc.textContent = `Incorrect choice recorded: ${choice}. The system can now show a correction, a gentle nudge, or a risk-only reminder.`;
  els.explanationBody.textContent = `Correction mode for ${step.title}.`;
  els.explanationBullets.innerHTML = step.corrections.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  els.explanationCues.textContent = "The correction module is ready.";
}

function nextStep() {
  state.stepIndex += 1;
  state.stepPresentedAt = now();
  if (state.stepIndex >= STEPS.length) {
    state.stageFlags.taskDone = true;
    endTask();
    return;
  }
  renderTask();
  renderReplay();
  updateTopChips();
}

function navigateStep(offset) {
  if (state.phase !== "task") return;
  const fromStep = currentStep();
  if (!fromStep) return;
  if (offset < 0 && state.stepIndex > 0) {
    state.stepIndex -= 1;
  }
  const targetStep = currentStep();
  state.currentChoice = null;
  stopPressureClock();
  addEvent("step_navigate", {
    from: fromStep.id,
    to: targetStep ? targetStep.id : fromStep.id,
    offset,
  }, targetStep?.id || fromStep.id);
  renderTask();
}

function beginTrial() {
  state.sessionId = uid("session");
  state.trialId = `T${pad(state.trialIndex)}`;
  state.startedAt = now();
  state.finishedAt = 0;
  state.responses = [];
  state.events = [];
  state.annotations = [];
  state.interruptionCount = 0;
  state.errorCount = 0;
  state.explanationRequests = 0;
  state.explanationReplays = 0;
  state.explanationSkips = 0;
  state.pauseCount = 0;
  state.isPaused = false;
  state.pausedRemainingMs = 0;
  state.pauseStartedAt = 0;
  state.currentChoice = null;
  state.stepIndex = 0;
  state.stepPresentedAt = now();
  state.taskStartTime = now();
  state.visibleCountdown = state.countdownVisible ?? state.visibleCountdown;
  state.questionnaire = { pre: {}, post: {}, short: {} };
  state.taskState = {
    scenarioStatus: "scene_safe",
    lastAction: "",
    summary: "",
    revealLevel: state.explanationMode,
    countdownVisible: state.visibleCountdown,
    pressureMode: state.pressure,
  };
  state.stageFlags = {
    consentDone: false,
    deviceCheckDone: false,
    trainingDone: false,
    taskDone: false,
    questionnaireDone: false,
    interviewDone: false,
  };
  addEvent("session_start", {
    participantId: state.participantId,
    trialId: state.trialId,
    condition: state.condition,
    pressure: state.pressure,
    scenario: state.scenario,
    explanationMode: state.explanationMode,
    visibleCountdown: state.visibleCountdown,
  });
  updatePauseButtons();
  switchPhase("participant");
  updateTopChips();
  renderParticipantPanel();
  renderQuestionnaires();
  renderReplay();
  renderSummary();
  renderExperimenterPanel();
}

function renderParticipantPanel() {
  els.participantOverview.textContent = [
    `Participant: ${state.participantId}`,
    `Trial: ${state.trialId}`,
    `Condition: ${CONDITIONS[state.condition].label}`,
    `Pressure: ${PRESSURES[state.pressure].label}`,
    `Scenario: ${SCENARIOS[state.scenario].label}`,
  ].join(" | ");
  renderTaskHeader();
}

function renderTaskHeader() {
  const step = currentStep();
  if (!step) return;
  els.currentStageTitle.textContent = step.title;
  els.currentStageDesc.textContent = buildConditionTemplate().body;
  els.stepProgressText.textContent = `Step ${state.stepIndex + 1} / ${STEPS.length}`;
}

function renderQuestionnaires() {
  renderQuestionnaireGroup(els.questionnairePre, QUESTIONNAIRES.pre, state.questionnaire.pre);
  renderQuestionnaireGroup(els.questionnairePost, QUESTIONNAIRES.post, state.questionnaire.post);
  renderQuestionnaireGroup(els.questionnaireShort, [["load", "How much mental effort did this take?"], ["pressure", "How stressful did it feel?"], ["control", "How much control did you feel?"]], state.questionnaire.short);
}

function renderQuestionnaireGroup(container, items, store) {
  container.innerHTML = "";
  items.forEach(([key, label]) => {
    const wrapper = document.createElement("label");
    wrapper.className = "survey-item";
    wrapper.innerHTML = `
      <span>${escapeHtml(label)}</span>
      <input type="range" min="1" max="7" value="${store[key] || 4}" />
      <output>${store[key] || 4}</output>
    `;
    const input = $("input", wrapper);
    const output = $("output", wrapper);
    input.addEventListener("input", () => {
      output.textContent = input.value;
      store[key] = Number(input.value);
      addEvent("questionnaire_change", { group: container.id, key, value: Number(input.value) });
    });
    container.appendChild(wrapper);
  });
}

function renderLiveLog() {
  els.liveLog.innerHTML = "";
  const items = state.events.slice(-12).reverse();
  items.forEach((event) => {
    const item = document.createElement("article");
    item.className = "log-entry";
    item.innerHTML = `
      <time>${escapeHtml(event.timestamp)}</time>
      <strong>${escapeHtml(event.type)}</strong>
      <div>${escapeHtml(JSON.stringify(event.detail))}</div>
    `;
    els.liveLog.appendChild(item);
  });
}

function renderReplay() {
  if (els.replayFilter) {
    els.replayFilter.value = state.replayFilter;
  }
  const filtered = state.replayFilter === "all"
    ? state.events
    : state.events.filter((event) => event.stepId === state.replayFilter || event.type === state.replayFilter);
  els.replayList.innerHTML = "";
  filtered.slice().reverse().forEach((event) => {
    const item = document.createElement("button");
    item.className = "replay-row";
    item.innerHTML = `
      <strong>${escapeHtml(event.type)}</strong>
      <span>${escapeHtml(event.stepId || "global")} · ${escapeHtml(event.timestamp)}</span>
    `;
    item.addEventListener("click", () => selectReplayEvent(event));
    els.replayList.appendChild(item);
  });
}

function selectReplayEvent(event) {
  state.selectedEventId = event.eventId;
  els.replayDetail.textContent = safeJson(event);
  addEvent("replay_select", { eventId: event.eventId, type: event.type }, event.stepId);
}

function renderExperimenterPanel() {
  els.experimenterStatus.textContent = `Trial ${state.trialId || "-"} ready.`;
  els.experimenterStep.textContent = currentStep() ? `Current step: ${currentStep().title}` : "No active step";
  els.experimenterMetrics.textContent = [
    `Logs: ${state.events.length}`,
    `Choices: ${state.responses.length}`,
    `Interruption count: ${state.interruptionCount}`,
    `Error count: ${state.errorCount}`,
  ].join(" | ");
}

function startTask() {
  if (!state.sessionId) beginTrial();
  switchPhase("task");
  state.taskState.summary = "Task started";
  renderTask();
  renderExperimenterPanel();
  renderSummary();
  addEvent("task_started", {
    countdownVisible: state.visibleCountdown,
    pressureSeconds: PRESSURES[state.pressure].stepSeconds,
    totalMinutes: PRESSURES[state.pressure].totalMinutes,
  });
}

function pauseTask() {
  if (!state.startedAt || !currentStep()) return;
  if (!state.isPaused) {
    state.pauseCount += 1;
    state.isPaused = true;
    state.pauseStartedAt = now();
    state.pausedRemainingMs = Math.max(0, state.currentDeadline - now());
    stopPressureClock();
    addEvent("task_paused", { pauseCount: state.pauseCount, remainingMs: state.pausedRemainingMs });
    els.currentStageDesc.textContent = "Task paused by experimenter.";
  } else {
    state.isPaused = false;
    state.currentDeadline = now() + state.pausedRemainingMs;
    state.pausedRemainingMs = 0;
    addEvent("task_resumed", { pauseCount: state.pauseCount });
    renderTask(true);
  }
  updatePauseButtons();
}

function endTask() {
  stopPressureClock();
  state.finishedAt = now();
  state.stageFlags.taskDone = true;
  addEvent("task_complete", buildSessionSummary());
  switchPhase("questionnaire");
  renderQuestionnaires();
  renderExperimenterPanel();
  renderSummary();
}

function finalizeExperiment() {
  state.stageFlags.questionnaireDone = true;
  state.stageFlags.interviewDone = true;
  state.notes = els.participantNotes.value || state.notes || "";
  addEvent("experiment_finished", buildSessionSummary());
  switchPhase("complete");
  renderExportPayload();
  persistDraft();
}

function renderExportPayload() {
  const json = buildExportJson();
  els.resultJson.textContent = json;
  els.resultCsv.textContent = buildCsv();
}

function buildExportJson() {
  const payload = {
    meta: buildSessionSummary(),
    state: {
      participantId: state.participantId,
      trialId: state.trialId,
      condition: state.condition,
      pressure: state.pressure,
      scenario: state.scenario,
      visibleCountdown: state.visibleCountdown,
      explanationMode: state.explanationMode,
      notes: state.notes,
    },
    questionnaire: state.questionnaire,
    responses: state.responses,
    events: state.events,
    annotations: state.annotations,
  };
  return safeJson(payload);
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function buildCsv() {
  const header = [
    "eventId",
    "sessionId",
    "conditionId",
    "trialId",
    "trialIndex",
    "stepId",
    "phase",
    "type",
    "timestamp",
    "detail",
  ];
  const rows = [header.join(",")];
  state.events.forEach((event) => {
    rows.push([
      event.eventId,
      event.sessionId,
      event.conditionId,
      event.trialId,
      event.trialIndex,
      event.stepId,
      event.phase,
      event.type,
      event.timestamp,
      safeJson(event.detail),
    ]
      .map(csvEscape)
      .join(","));
  });
  return rows.join("\n");
}

async function saveToServer() {
  const payload = JSON.parse(buildExportJson());
  try {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: safeJson(payload),
    });
    const data = await res.json();
    addEvent("server_save_ok", data);
    return data;
  } catch (error) {
    addEvent("server_save_failed", { message: error.message });
    return null;
  }
}

function downloadText(text, filename, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const canDownload = "download" in HTMLAnchorElement.prototype && !/iP(ad|hone|od)/.test(navigator.userAgent);
  if (canDownload) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    return;
  }
  const fallbackUrl = `data:${mime};charset=utf-8,${encodeURIComponent(text)}`;
  const opened = window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    alert("Export preview is ready on the page. Copy the text manually if your browser blocks downloads.");
  }
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function addAnnotation() {
  const text = els.annotationInput.value.trim();
  if (!text) return;
  const annotation = {
    annotationId: `${state.sessionId}-ann-${state.annotations.length + 1}`,
    type: els.annotationType.value,
    text,
    timestamp: ts(),
    stepId: currentStep()?.id || "",
  };
  state.annotations.push(annotation);
  els.annotationInput.value = "";
  addEvent("annotation_added", annotation, annotation.stepId);
  renderReplay();
}

function injectEvent(kind) {
  const step = currentStep();
  const stepId = step ? step.id : "";
  switch (kind) {
    case "error":
      state.errorCount += 1;
      addEvent("injected_error", { stepId, note: "Experimenter injected error." }, stepId);
      break;
    case "interrupt":
      state.interruptionCount += 1;
      state.midTaskInterruptions += 1;
      addEvent("injected_interruption", { stepId, note: "Experimenter injected interruption." }, stepId);
      els.scenarioBanner.textContent = "Experimenter interruption inserted.";
      break;
    case "reminder":
      addEvent("injected_reminder", { stepId, note: "Emergency reminder event." }, stepId);
      speak("Please continue with the next emergency step.", "reminder");
      break;
    case "correction":
      state.correctionAcceptCount += 1;
      addEvent("injected_correction", { stepId, note: "Correction event inserted." }, stepId);
      break;
    default:
      break;
  }
  renderExperimenterPanel();
  renderSummary();
}

function toggleCountdown() {
  state.visibleCountdown = !state.visibleCountdown;
  state.taskState.countdownVisible = state.visibleCountdown;
  els.countdownToggle.checked = state.visibleCountdown;
  addEvent("countdown_toggle", { visible: state.visibleCountdown });
  updateTopChips();
}

function randomizeSetup() {
  const id = normalizeId(els.participantId.value || `P${Math.floor(Math.random() * 100)}`);
  els.participantId.value = id;
  const seed = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const conditionKeys = Object.keys(CONDITIONS);
  const pressureKeys = Object.keys(PRESSURES);
  const scenarioKeys = Object.keys(SCENARIOS);
  els.condition.value = conditionKeys[seed % conditionKeys.length];
  els.pressure.value = pressureKeys[(seed + 1) % pressureKeys.length];
  els.scenario.value = scenarioKeys[(seed + 2) % scenarioKeys.length];
  els.explanationMode.value = els.condition.value;
  els.countdownToggle.checked = PRESSURES[els.pressure.value].visibleCountdown;
}

function captureSetup() {
  state.participantId = normalizeId(els.participantId.value);
  state.trialIndex = Number(els.trialIndex.value || 1);
  state.trialId = `T${pad(state.trialIndex)}`;
  state.condition = els.condition.value;
  state.pressure = els.pressure.value;
  state.scenario = els.scenario.value;
  state.explanationMode = els.explanationMode.value;
  state.visibleCountdown = els.countdownToggle.checked;
  state.countdownVisible = state.visibleCountdown;
  state.notes = els.participantNotes.value || "";
  state.questionnaire.pre = state.questionnaire.pre || {};
  state.questionnaire.post = state.questionnaire.post || {};
  state.questionnaire.short = state.questionnaire.short || {};
  updateTopChips();
}

function initializeQuestionnaireInputs() {
  const renderGroup = (container, items, store, groupName) => {
    container.innerHTML = "";
    items.forEach(([key, label]) => {
      const item = document.createElement("label");
      item.className = "survey-item";
      item.innerHTML = `
        <span>${escapeHtml(label)}</span>
        <input type="range" min="1" max="7" value="${store[key] || 4}" />
        <output>${store[key] || 4}</output>
      `;
      const input = $("input", item);
      const output = $("output", item);
      input.addEventListener("input", () => {
        output.textContent = input.value;
        store[key] = Number(input.value);
        addEvent("questionnaire_input", { group: groupName, key, value: Number(input.value) });
      });
      container.appendChild(item);
    });
  };
  renderGroup(els.questionnairePre, QUESTIONNAIRES.pre, state.questionnaire.pre, "pre");
  renderGroup(els.questionnairePost, QUESTIONNAIRES.post, state.questionnaire.post, "post");
  renderGroup(els.questionnaireShort, QUESTIONNAIRES.post.slice(0, 3), state.questionnaire.short, "short");
}

function startInterviewMode() {
  switchPhase("interview");
  addEvent("interview_opened", {});
}

function startExperiment() {
  captureSetup();
  initializeQuestionnaireInputs();
  beginTrial();
  renderParticipantPanel();
  startTask();
}

function loadFromDraft() {
  const draft = loadDraft();
  if (!draft?.state) return;
  Object.assign(state, draft.state);
  els.participantId.value = state.participantId || "";
  els.trialIndex.value = state.trialIndex || 1;
  els.condition.value = state.condition || "direct";
  els.pressure.value = state.pressure || "low";
  els.scenario.value = state.scenario || "baseline";
  els.countdownToggle.checked = state.visibleCountdown !== false;
  els.explanationMode.value = state.explanationMode || state.condition || "direct";
  els.participantNotes.value = state.notes || "";
  initializeQuestionnaireInputs();
  renderLiveLog();
  renderReplay();
  renderSummary();
  updateTopChips();
  switchPhase(state.phase || "setup");
}

function restoreExperimenterState() {
  if (state.phase === "task") {
    switchPhase("task");
  }
}

function bindEvents() {
  els.startBtn.addEventListener("click", startExperiment);
  els.randomizeBtn.addEventListener("click", randomizeSetup);
  els.loadDraftBtn.addEventListener("click", () => {
    loadFromDraft();
    addEvent("draft_loaded", {});
  });
  els.saveDraftBtn.addEventListener("click", () => {
    persistDraft();
    addEvent("draft_saved", {});
  });
  els.consentYes.addEventListener("click", () => {
    state.stageFlags.consentDone = true;
    addEvent("consent_accepted", {});
  });
  els.consentNo.addEventListener("click", () => {
    addEvent("consent_declined", {});
  });
  els.deviceCheckBtn.addEventListener("click", () => {
    state.stageFlags.deviceCheckDone = true;
    addEvent("device_check_passed", {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      userAgent: navigator.userAgent,
    });
  });
  els.trainingBtn.addEventListener("click", () => {
    state.stageFlags.trainingDone = true;
    addEvent("training_complete", {});
    speak("Training example started. Follow the next action.", "training");
  });
  els.beginTaskBtn.addEventListener("click", () => {
    captureSetup();
    startExperiment();
  });
  els.beginTaskBtn2.addEventListener("click", () => {
    captureSetup();
    startExperiment();
  });
  els.pauseBtn.addEventListener("click", pauseTask);
  els.pauseBtn2.addEventListener("click", pauseTask);
  els.endTaskBtn.addEventListener("click", () => {
    state.stageFlags.taskDone = true;
    endTask();
  });
  els.endTaskBtn2.addEventListener("click", () => {
    state.stageFlags.taskDone = true;
    endTask();
  });
  els.injectErrorBtn.addEventListener("click", () => injectEvent("error"));
  els.injectErrorBtn2.addEventListener("click", () => injectEvent("error"));
  els.injectInterruptBtn.addEventListener("click", () => injectEvent("interrupt"));
  els.injectInterruptBtn2.addEventListener("click", () => injectEvent("interrupt"));
  els.injectReminderBtn.addEventListener("click", () => injectEvent("reminder"));
  els.injectReminderBtn2.addEventListener("click", () => injectEvent("reminder"));
  els.injectCorrectionBtn.addEventListener("click", () => injectEvent("correction"));
  els.previousStepBtn.addEventListener("click", () => navigateStep(-1));
  els.repeatStepBtn.addEventListener("click", () => navigateStep(0));
  els.explainMoreBtn.addEventListener("click", () => {
    state.explanationRequests += 1;
    addEvent("explanation_more_requested", { count: state.explanationRequests }, currentStep()?.id || "");
    renderExplanation("more");
    speak(`${buildConditionTemplate().body} ${buildConditionTemplate().cue}`, "more_explanation");
  });
  els.repeatExplanationBtn.addEventListener("click", () => {
    state.explanationReplays += 1;
    addEvent("explanation_replay_requested", { count: state.explanationReplays }, currentStep()?.id || "");
    renderExplanation("repeat");
    speak(buildConditionTemplate().body, "repeat_explanation");
  });
  els.skipExplanationBtn.addEventListener("click", () => {
    state.explanationSkips += 1;
    addEvent("explanation_skipped", { count: state.explanationSkips }, currentStep()?.id || "");
  });
  els.acceptCorrectionBtn.addEventListener("click", () => {
    state.correctionAcceptCount += 1;
    addEvent("correction_accepted", { choice: state.currentChoice }, currentStep()?.id || "");
    nextStep();
  });
  els.rejectCorrectionBtn.addEventListener("click", () => {
    state.correctionRejectCount += 1;
    addEvent("correction_rejected", { choice: state.currentChoice }, currentStep()?.id || "");
    state.errorCount += 1;
  });
  els.addNoteBtn.addEventListener("click", () => {
    state.notes = els.participantNotes.value || "";
    addEvent("note_saved", { notes: state.notes });
  });
  els.finishSessionBtn.addEventListener("click", () => {
    state.stageFlags.questionnaireDone = true;
    state.stageFlags.interviewDone = true;
    state.notes = els.participantNotes.value || state.notes || "";
    addEvent("session_finished", buildSessionSummary());
    finalizeExperiment();
  });
  els.exportJsonBtn.addEventListener("click", async () => {
    const json = buildExportJson();
    els.resultJson.textContent = json;
    downloadText(json, `${state.sessionId || "session"}.json`, "application/json");
    await saveToServer();
  });
  els.exportCsvBtn.addEventListener("click", () => {
    const csv = buildCsv();
    els.resultCsv.textContent = csv;
    downloadText(csv, `${state.sessionId || "session"}.csv`, "text/csv");
  });
  els.downloadReplayBtn.addEventListener("click", () => {
    const replay = {
      summary: buildSessionSummary(),
      events: state.events,
      annotations: state.annotations,
    };
    downloadText(safeJson(replay), `${state.sessionId || "session"}-replay.json`, "application/json");
  });
  els.clearBtn.addEventListener("click", resetAll);
  els.clearBtn2.addEventListener("click", resetAll);
  els.annotationBtn.addEventListener("click", addAnnotation);
  els.replayFilter.addEventListener("change", () => {
    state.replayFilter = els.replayFilter.value;
    renderReplay();
    addEvent("replay_filter_changed", { filter: state.replayFilter });
  });
  els.countdownToggle.addEventListener("change", toggleCountdown);
  els.explanationMode.addEventListener("change", () => {
    state.condition = els.explanationMode.value;
    updateTopChips();
    renderTask();
    addEvent("explanation_mode_changed", { condition: state.condition });
  });
  els.condition.addEventListener("change", () => {
    state.condition = els.condition.value;
    els.explanationMode.value = state.condition;
    updateTopChips();
  });
  els.pressure.addEventListener("change", () => {
    state.pressure = els.pressure.value;
    state.visibleCountdown = PRESSURES[state.pressure].visibleCountdown;
    els.countdownToggle.checked = state.visibleCountdown;
    updateTopChips();
    addEvent("pressure_changed", { pressure: state.pressure });
  });
  els.scenario.addEventListener("change", () => {
    state.scenario = els.scenario.value;
    updateTopChips();
    addEvent("scenario_changed", { scenario: state.scenario });
  });
  els.switchConditionBtn.addEventListener("click", () => {
    updateTopChips();
    addEvent("condition_refresh", {
      condition: state.condition,
      pressure: state.pressure,
      scenario: state.scenario,
    });
  });
  els.trialIndex.addEventListener("change", () => {
    state.trialIndex = Number(els.trialIndex.value || 1);
    state.trialId = `T${pad(state.trialIndex)}`;
    updateTopChips();
  });
  window.addEventListener("online", updateTopChips);
  window.addEventListener("offline", updateTopChips);
}

function resetAll() {
  stopPressureClock();
  clearDraft();
  state.phase = "setup";
  state.sessionId = "";
  state.trialId = "";
  state.trialIndex = 1;
  state.participantId = "";
  state.condition = "direct";
  state.pressure = "low";
  state.scenario = "baseline";
  state.visibleCountdown = true;
  state.explanationMode = "direct";
  state.notes = "";
  state.startedAt = 0;
  state.finishedAt = 0;
  state.stepIndex = 0;
  state.responses = [];
  state.events = [];
  state.annotations = [];
  state.interruptionCount = 0;
  state.errorCount = 0;
  state.explanationRequests = 0;
  state.explanationReplays = 0;
  state.explanationSkips = 0;
  state.pauseCount = 0;
  state.isPaused = false;
  state.pausedRemainingMs = 0;
  state.pauseStartedAt = 0;
  state.midTaskInterruptions = 0;
  state.correctionAcceptCount = 0;
  state.correctionRejectCount = 0;
  state.stageFlags = {
    consentDone: false,
    deviceCheckDone: false,
    trainingDone: false,
    taskDone: false,
    questionnaireDone: false,
    interviewDone: false,
  };
  state.questionnaire = { pre: {}, post: {}, short: {} };
  els.participantId.value = "";
  els.trialIndex.value = "1";
  els.condition.value = "direct";
  els.pressure.value = "low";
  els.scenario.value = "baseline";
  els.countdownToggle.checked = true;
  els.explanationMode.value = "direct";
  els.participantNotes.value = "";
  els.liveLog.innerHTML = "";
  els.replayList.innerHTML = "";
  els.replayDetail.textContent = "";
  els.resultJson.textContent = "";
  els.resultCsv.textContent = "";
  els.annotationInput.value = "";
  renderQuestionnaires();
  updateTopChips();
  updatePauseButtons();
  renderSummary();
  switchPhase("setup");
}

function renderSetupPanel() {
  updateTopChips();
  renderSummary();
  renderTaskHeader();
  renderQuestionnaires();
  renderReplay();
  renderLiveLog();
}

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

function initVoice() {
  if (!("speechSynthesis" in window)) {
    addEvent("speech_not_supported", {});
  }
}

function initNavigation() {
  $$(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      switchPhase(target);
      addEvent("nav_change", { target });
      if (target === "replay") renderReplay();
      if (target === "export") renderExportPayload();
      if (target === "experimenter") renderExperimenterPanel();
    });
  });
}

function bootstrap() {
  initServiceWorker();
  initVoice();
  bindEvents();
  initNavigation();
  renderQuestionnaires();
  renderSetupPanel();
  updateTopChips();
  updatePauseButtons();
  loadFromDraft();
  setInterval(renderTimer, 200);
  window.addEventListener("beforeunload", persistDraft);
  addEvent("app_ready", {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  });
}

bootstrap();
