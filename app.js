const $ = (sel) => document.querySelector(sel);

const CONDITIONS = {
  control: {
    label: "Control",
    short: "No guidance",
    title: "Control: minimal prompt only",
    intro: "You only receive the task prompt, without explanation.",
  },
  direct: {
    label: "Direct",
    short: "Pure instruction",
    title: "Direct guidance",
    intro: "You receive a short action command with no rationale.",
  },
  concise: {
    label: "Concise",
    short: "Short rationale",
    title: "Concise explanatory guidance",
    intro: "You receive a short instruction plus a one-sentence reason.",
  },
  full: {
    label: "Full",
    short: "Detailed rationale",
    title: "Full explanatory guidance",
    intro: "You receive the instruction, the rationale, and why the step matters.",
  },
};

const PRESSURE = {
  low: { label: "Low", secondsPerStep: 70, meter: 34, tone: "calm" },
  high: { label: "High", secondsPerStep: 25, meter: 86, tone: "urgent" },
};

const SCENARIOS = {
  baseline: {
    label: "Baseline CPR",
    banner: "Collapsed adult, bystander CPR needed, one rescuer only, no bystander interruption.",
    interruptions: false,
  },
  interrupt: {
    label: "CPR + interruption",
    banner: "Same CPR scene, but a bystander interrupts once with a distracting question.",
    interruptions: true,
  },
  compressed: {
    label: "Compressed CPR",
    banner: "Same CPR scene, but the timer is tighter and the environment is more urgent.",
    interruptions: true,
  },
};

const STEPS = [
  {
    id: "scene_safety",
    title: "Scene safety",
    prompt: "Check that the environment is safe before approaching the patient.",
    rationale:
      "Unsafe scenes can create additional casualties. A safe approach is the first gate in many emergency flowcharts.",
    details:
      "The goal here is to notice immediate hazards and decide whether to approach, call for help, or move to a safer position.",
    correct: "safe",
    options: [
      { key: "safe", label: "Approach carefully and check the scene", hint: "Prioritize scene safety first." },
      { key: "unsafe", label: "Ignore the scene and go straight in", hint: "Skipping safety raises risk." },
      { key: "call", label: "Ask someone to call 120 now", hint: "Useful, but safety still comes first." },
    ],
    bullets: [
      "Do not rush into an unsafe environment.",
      "The protocol begins with environment checking.",
      "Delegate help if needed, but confirm safety first.",
    ],
  },
  {
    id: "responsiveness",
    title: "Check responsiveness",
    prompt: "Assess whether the patient is responsive and breathing normally.",
    rationale:
      "Responsiveness and breathing status determine whether CPR should start and whether you should continue the emergency chain.",
    details:
      "A clear, systematic check reduces hesitation and helps the rescuer move from observation to action.",
    correct: "check",
    options: [
      { key: "check", label: "Tap and shout, then check breathing", hint: "This is the intended action." },
      { key: "wait", label: "Wait and watch silently", hint: "This increases delay." },
      { key: "water", label: "Give the person water", hint: "Not appropriate in this stage." },
    ],
    bullets: [
      "Use a direct responsiveness check.",
      "Look for normal breathing, not just movement.",
      "If unresponsive, move to the next emergency step.",
    ],
  },
  {
    id: "call_help",
    title: "Call for help",
    prompt: "Get emergency services and an AED or nearby help.",
    rationale:
      "Early calling improves the chance that expert help and a defibrillator arrive quickly.",
    details:
      "This stage separates recognition from coordination. Delegating the call reduces workload on the rescuer.",
    correct: "call_120",
    options: [
      { key: "call_120", label: "Call 120 and ask for AED", hint: "The most appropriate action." },
      { key: "video", label: "Record a video for later", hint: "Not useful for immediate care." },
      { key: "wait", label: "Keep watching and do nothing yet", hint: "Delays emergency response." },
    ],
    bullets: [
      "Emergency services should be called as early as possible.",
      "Ask a bystander to fetch the AED if one is available.",
      "The rescuer should not wait for perfect certainty before calling.",
    ],
  },
  {
    id: "compressions",
    title: "Start compressions",
    prompt: "Begin chest compressions and keep the rhythm going.",
    rationale:
      "For suspected cardiac arrest, compressions maintain circulation while professional help is on the way.",
    details:
      "This is the action stage where explanations can either support execution or create extra cognitive load.",
    correct: "compress",
    options: [
      { key: "compress", label: "Start compressions now", hint: "Correct immediate action." },
      { key: "search", label: "Search online for more info", hint: "Too slow for this stage." },
      { key: "ask", label: "Ask the patient to sit up", hint: "Not appropriate if unresponsive." },
    ],
    bullets: [
      "This step is action-critical.",
      "Delay is more costly than uncertainty.",
      "Keep the rhythm until help arrives or the scenario changes.",
    ],
  },
  {
    id: "aed_handover",
    title: "AED and handover",
    prompt: "If an AED arrives, prepare to follow it; when help arrives, hand over key facts.",
    rationale:
      "The final stage tests whether the participant can continue the flow and summarize the situation clearly.",
    details:
      "We are checking continuation, recovery from interruptions, and whether the participant can hand over a concise summary.",
    correct: "aed",
    options: [
      { key: "aed", label: "Prepare AED and give a handover", hint: "Best final action." },
      { key: "rest", label: "Stop and leave immediately", hint: "Breaks the protocol." },
      { key: "forget", label: "Forget the previous steps", hint: "Reduces report quality." },
    ],
    bullets: [
      "This stage combines continuation and handover.",
      "Good handover is part of action completeness.",
      "Report only the facts you observed.",
    ],
  },
];

const QUESTIONNAIRE = [
  { id: "trust", text: "I trusted the guidance enough to follow it." },
  { id: "understand", text: "The guidance was easy to understand under pressure." },
  { id: "load", text: "The task felt mentally demanding." },
  { id: "control", text: "I felt I still had control over my own decisions." },
  { id: "use", text: "I would want to use a system like this in a real emergency." },
  { id: "actionability", text: "The guidance helped me know what to do next." },
  { id: "certainty", text: "The explanation made me more certain about my choice." },
];

const state = {
  phase: "setup",
  sessionId: "",
  participantId: "",
  condition: "direct",
  pressure: "low",
  scenario: "baseline",
  familiarity: "medium",
  stepIndex: 0,
  stepPresentedAt: 0,
  stepDeadline: 0,
  timerHandle: null,
  ratingFor: null,
  currentChoice: null,
  logs: [],
  responses: [],
  questionnaire: {},
  startedAt: 0,
  finishedAt: 0,
  interruptionsSeen: 0,
};

const els = {
  setupView: $("#setupView"),
  taskView: $("#taskView"),
  ratingView: $("#ratingView"),
  surveyView: $("#surveyView"),
  resultView: $("#resultView"),
  participantId: $("#participantId"),
  assignmentMode: $("#assignmentMode"),
  condition: $("#condition"),
  pressure: $("#pressure"),
  scenario: $("#scenario"),
  familiarity: $("#familiarity"),
  startBtn: $("#startBtn"),
  randomizeBtn: $("#randomizeBtn"),
  exportBtn: $("#exportBtn"),
  resetBtn: $("#resetBtn"),
  restartBtn: $("#restartBtn"),
  downloadBtn: $("#downloadBtn"),
  finishBtn: $("#finishBtn"),
  continueBtn: $("#continueBtn"),
  confidence: $("#confidence"),
  load: $("#load"),
  confidenceOut: $("#confidenceOut"),
  loadOut: $("#loadOut"),
  surveyForm: $("#surveyForm"),
  surveyTemplate: $("#surveyTemplate"),
  liveLog: $("#liveLog"),
  summaryLine: $("#summaryLine"),
  resultJson: $("#resultJson"),
  clockChip: $("#clockChip"),
  connChip: $("#connChip"),
  sessionBadge: $("#sessionBadge"),
  stageTitle: $("#stageTitle"),
  stageDesc: $("#stageDesc"),
  timerText: $("#timerText"),
  stepCounter: $("#stepCounter"),
  pressureLabel: $("#pressureLabel"),
  pressureFill: $("#pressureFill"),
  scenarioBanner: $("#scenarioBanner"),
  guidanceTitle: $("#guidanceTitle"),
  guidanceBody: $("#guidanceBody"),
  guidanceBullets: $("#guidanceBullets"),
  choiceButtons: $("#choiceButtons"),
};

function now() {
  return Date.now();
}

function iso(ts = now()) {
  return new Date(ts).toISOString();
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatClock(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(sec / 60);
  return `${min}:${pad(sec % 60)}`;
}

function setPhase(phase) {
  state.phase = phase;
  els.setupView.classList.toggle("hidden", phase !== "setup");
  els.taskView.classList.toggle("hidden", phase !== "task");
  els.ratingView.classList.toggle("hidden", phase !== "rating");
  els.surveyView.classList.toggle("hidden", phase !== "survey");
  els.resultView.classList.toggle("hidden", phase !== "result");
}

function log(type, detail = {}) {
  const entry = { type, at: iso(), t: now(), detail };
  state.logs.push(entry);
  renderLiveLog();
  persistDraft();
}

function persistDraft() {
  const draft = buildPayload(true);
  localStorage.setItem("firstaid-web-draft", JSON.stringify(draft));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem("firstaid-web-draft");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem("firstaid-web-draft");
}

function randomizeSetup() {
  const seed = `${els.participantId.value || "anon"}-${Date.now()}`;
  const value = hashString(seed);
  const conditionKeys = Object.keys(CONDITIONS);
  const pressureKeys = Object.keys(PRESSURE);
  const scenarioKeys = Object.keys(SCENARIOS);
  els.condition.value = conditionKeys[value % conditionKeys.length];
  els.pressure.value = pressureKeys[(value >> 2) % pressureKeys.length];
  els.scenario.value = scenarioKeys[(value >> 4) % scenarioKeys.length];
}

function assignByParticipant() {
  const id = (els.participantId.value || "P00").trim();
  const value = hashString(id);
  const conditionKeys = Object.keys(CONDITIONS);
  els.condition.value = conditionKeys[value % conditionKeys.length];
  els.pressure.value = value % 2 === 0 ? "low" : "high";
  els.scenario.value = value % 3 === 0 ? "interrupt" : "baseline";
}

function buildPayload(draft = false) {
  const startedAt = state.startedAt || now();
  const finishedAt = state.finishedAt || now();
  const durationMs = finishedAt - startedAt;
  return {
    draft,
    sessionId: state.sessionId,
    participantId: state.participantId,
    condition: state.condition,
    pressure: state.pressure,
    scenario: state.scenario,
    familiarity: state.familiarity,
    startedAt: state.startedAt ? iso(state.startedAt) : null,
    finishedAt: state.finishedAt ? iso(state.finishedAt) : null,
    durationMs,
    responses: state.responses,
    questionnaire: state.questionnaire,
    interruptionsSeen: state.interruptionsSeen,
    logs: state.logs,
    summary: summarize(),
  };
}

function summarize() {
  if (!state.responses.length) {
    return {
      correct: 0,
      total: STEPS.length,
      meanReactionMs: 0,
      timeouts: 0,
      confidenceMean: 0,
      loadMean: 0,
    };
  }
  const correct = state.responses.filter((r) => r.correct).length;
  const total = STEPS.length;
  const reactionMs = state.responses
    .filter((r) => typeof r.reactionMs === "number")
    .map((r) => r.reactionMs);
  const confidence = state.responses.filter((r) => typeof r.confidence === "number").map((r) => r.confidence);
  const load = state.responses.filter((r) => typeof r.load === "number").map((r) => r.load);
  return {
    correct,
    total,
    accuracy: Number((correct / total).toFixed(2)),
    meanReactionMs: reactionMs.length ? Math.round(reactionMs.reduce((a, b) => a + b, 0) / reactionMs.length) : 0,
    timeouts: state.responses.filter((r) => r.timeout).length,
    confidenceMean: confidence.length ? Number((confidence.reduce((a, b) => a + b, 0) / confidence.length).toFixed(2)) : 0,
    loadMean: load.length ? Number((load.reduce((a, b) => a + b, 0) / load.length).toFixed(2)) : 0,
  };
}

function currentStep() {
  return STEPS[state.stepIndex];
}

function guidanceFor(step, conditionKey) {
  const condition = CONDITIONS[conditionKey];
  const prompt = step.prompt;
  const intro = condition.intro;
  const actionMap = {
    control: {
      body: prompt,
      bullets: step.bullets,
    },
    direct: {
      body: `${prompt} ${step.title === "AED and handover" ? "Follow the AED and prepare a handover." : "Do the next action now."}`,
      bullets: [step.bullets[0], "Keep moving to the next action without overthinking."],
    },
    concise: {
      body: `${prompt} ${step.rationale}`,
      bullets: [step.details, step.bullets[0], step.bullets[1]],
    },
    full: {
      body: `${prompt} ${step.rationale} ${step.details}`,
      bullets: [...step.bullets],
    },
  };
  return {
    title: condition.title,
    intro,
    body: actionMap[conditionKey].body,
    bullets: actionMap[conditionKey].bullets,
  };
}

function renderSetupSummary() {
  els.sessionBadge.textContent = state.participantId || "unset";
}

function renderLiveLog() {
  els.liveLog.innerHTML = "";
  const items = state.logs.slice(-8).reverse();
  for (const item of items) {
    const div = document.createElement("article");
    div.className = "log-entry";
    div.innerHTML = `<time>${item.at}</time><strong>${item.type}</strong><div>${escapeHtml(JSON.stringify(item.detail))}</div>`;
    els.liveLog.appendChild(div);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderTimer() {
  const stepLeft = Math.max(0, state.stepDeadline - now());
  const total = Math.max(0, now() - state.startedAt);
  els.timerText.textContent = formatClock(stepLeft);
  els.clockChip.textContent = formatClock(total);
}

function renderStep() {
  const step = currentStep();
  if (!step) return;
  const guidance = guidanceFor(step, state.condition);
  els.stageTitle.textContent = step.title;
  els.stageDesc.textContent = guidance.intro;
  els.stepCounter.textContent = `${state.stepIndex + 1} / ${STEPS.length}`;
  els.pressureLabel.textContent = PRESSURE[state.pressure].label;
  els.pressureFill.style.width = `${PRESSURE[state.pressure].meter}%`;
  els.scenarioBanner.textContent = SCENARIOS[state.scenario].banner;
  els.guidanceTitle.textContent = guidance.title;
  els.guidanceBody.textContent = guidance.body;
  els.guidanceBullets.innerHTML = guidance.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("");
  els.choiceButtons.innerHTML = "";

  for (const choice of step.options) {
    const button = document.createElement("button");
    button.className = "choice-btn";
    button.dataset.choice = choice.key;
    button.innerHTML = `<strong>${escapeHtml(choice.label)}</strong><span>${escapeHtml(choice.hint)}</span>`;
    button.addEventListener("click", () => handleChoice(choice));
    els.choiceButtons.appendChild(button);
  }

  if (state.phase === "task") {
    state.stepPresentedAt = now();
    state.stepDeadline = now() + PRESSURE[state.pressure].secondsPerStep * 1000;
    clearTimeout(state.timerHandle);
    state.timerHandle = setInterval(renderTimer, 250);
    renderTimer();
    log("step_presented", { step: step.id, title: step.title, seconds: PRESSURE[state.pressure].secondsPerStep });
    if (state.scenario !== "baseline" && state.stepIndex === 1 && state.interruptionsSeen === 0) {
      setTimeout(() => {
        if (state.phase !== "task" || state.stepIndex !== 1) return;
        state.interruptionsSeen += 1;
        log("interruption", { type: "bystander_question", text: "Should we move them first?" });
        showBanner("Bystander interruption: a helper asks a distracting question.");
      }, 6500);
    }
  }
}

function showBanner(text) {
  els.scenarioBanner.textContent = text;
  els.scenarioBanner.style.border = "1px solid rgba(239, 109, 82, 0.22)";
}

function clearBanner() {
  els.scenarioBanner.textContent = SCENARIOS[state.scenario].banner;
  els.scenarioBanner.style.border = "none";
}

function handleChoice(choice) {
  if (state.phase !== "task") return;
  const step = currentStep();
  const reactionMs = now() - state.stepPresentedAt;
  const correct = choice.key === step.correct;
  state.currentChoice = { step: step.id, choice: choice.key, correct, reactionMs };
  log("choice_made", { step: step.id, choice: choice.key, correct, reactionMs });
  [...els.choiceButtons.querySelectorAll("button")].forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.choice === step.correct) btn.classList.add("correct");
    if (btn.dataset.choice === choice.key && !correct) btn.classList.add("wrong");
  });
  state.phase = "rating";
  setPhase("rating");
  els.confidence.value = "4";
  els.load.value = "4";
  els.confidenceOut.textContent = "4";
  els.loadOut.textContent = "4";
  log("rating_prompted", { step: step.id });
}

function advanceAfterRating() {
  const step = currentStep();
  if (!step || !state.currentChoice) return;
  const response = {
    step: step.id,
    choice: state.currentChoice.choice,
    correct: state.currentChoice.correct,
    reactionMs: state.currentChoice.reactionMs,
    confidence: Number(els.confidence.value),
    load: Number(els.load.value),
    timeout: false,
  };
  state.responses.push(response);
  log("rating_saved", { step: step.id, confidence: response.confidence, load: response.load });
  state.currentChoice = null;
  clearBanner();
  state.stepIndex += 1;
  if (state.stepIndex >= STEPS.length) {
    finishTask();
    return;
  }
  state.phase = "task";
  setPhase("task");
  renderStep();
  renderSummary();
}

function handleTimeout() {
  if (state.phase !== "task") return;
  const step = currentStep();
  const response = {
    step: step.id,
    choice: "timeout",
    correct: false,
    reactionMs: PRESSURE[state.pressure].secondsPerStep * 1000,
    confidence: null,
    load: null,
    timeout: true,
  };
  state.responses.push(response);
  log("step_timeout", { step: step.id });
  state.stepIndex += 1;
  if (state.stepIndex >= STEPS.length) {
    finishTask();
    return;
  }
  renderStep();
  renderSummary();
}

function renderSummary() {
  const s = summarize();
  els.summaryLine.textContent = [
    `Accuracy: ${s.correct}/${s.total}${s.total ? ` (${Math.round((s.correct / s.total) * 100)}%)` : ""}`,
    `Mean reaction: ${s.meanReactionMs || 0} ms`,
    `Timeouts: ${s.timeouts}`,
    `Confidence mean: ${s.confidenceMean || 0}`,
    `Load mean: ${s.loadMean || 0}`,
  ].join("\n");
}

function finishTask() {
  clearTimeout(state.timerHandle);
  state.timerHandle = null;
  state.finishedAt = now();
  log("task_complete", summarize());
  buildSurvey();
  setPhase("survey");
}

function buildSurvey() {
  els.surveyForm.innerHTML = "";
  for (const item of QUESTIONNAIRE) {
    const node = els.surveyTemplate.content.firstElementChild.cloneNode(true);
    const label = node.querySelector("span");
    const input = node.querySelector("input");
    const output = node.querySelector("output");
    label.textContent = item.text;
    input.name = item.id;
    input.value = state.questionnaire[item.id] || "4";
    output.textContent = input.value;
    input.addEventListener("input", () => {
      output.textContent = input.value;
      state.questionnaire[item.id] = Number(input.value);
      log("questionnaire_change", { id: item.id, value: Number(input.value) });
      persistDraft();
    });
    state.questionnaire[item.id] = Number(input.value);
    els.surveyForm.appendChild(node);
  }
}

function beginExperiment() {
  state.participantId = (els.participantId.value || "P00").trim();
  state.condition = els.condition.value;
  state.pressure = els.pressure.value;
  state.scenario = els.scenario.value;
  state.familiarity = els.familiarity.value;
  state.sessionId = `${state.participantId || "P00"}-${Date.now().toString(36)}`;
  state.stepIndex = 0;
  state.logs = [];
  state.responses = [];
  state.questionnaire = {};
  state.interruptionsSeen = 0;
  state.currentChoice = null;
  state.startedAt = now();
  state.finishedAt = 0;
  clearBanner();
  renderSetupSummary();
  setPhase("task");
  log("session_start", {
    participantId: state.participantId,
    condition: state.condition,
    pressure: state.pressure,
    scenario: state.scenario,
    familiarity: state.familiarity,
  });
  renderStep();
  renderSummary();
}

async function exportSession(downloadOnly = false) {
  const payload = buildPayload(false);
  const json = JSON.stringify(payload, null, 2);
  els.resultJson.textContent = json;
  log("export_requested", { downloadOnly });
  if (!downloadOnly) {
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      const data = await res.json();
      log("server_saved", data);
    } catch (error) {
      log("server_save_failed", { message: error.message });
    }
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.sessionId || "firstaid-session"}.json`;
  a.click();
  URL.revokeObjectURL(url);
  state.finishedAt = state.finishedAt || now();
  setPhase("result");
  renderSummary();
  persistDraft();
}

function resetSession() {
  clearTimeout(state.timerHandle);
  state.timerHandle = null;
  state.phase = "setup";
  state.sessionId = "";
  state.participantId = "";
  state.stepIndex = 0;
  state.logs = [];
  state.responses = [];
  state.questionnaire = {};
  state.currentChoice = null;
  state.startedAt = 0;
  state.finishedAt = 0;
  state.interruptionsSeen = 0;
  clearDraft();
  els.participantId.value = "";
  els.sessionBadge.textContent = "unset";
  els.liveLog.innerHTML = "";
  els.summaryLine.textContent = "No responses yet.";
  els.resultJson.textContent = "";
  setPhase("setup");
}

function restoreDraft() {
  const draft = loadDraft();
  if (!draft || draft.draft !== true) return;
  els.participantId.value = draft.participantId || "";
  els.condition.value = draft.condition || "direct";
  els.pressure.value = draft.pressure || "low";
  els.scenario.value = draft.scenario || "baseline";
  els.familiarity.value = draft.familiarity || "medium";
  state.participantId = draft.participantId || "";
  state.condition = draft.condition || "direct";
  state.pressure = draft.pressure || "low";
  state.scenario = draft.scenario || "baseline";
  state.familiarity = draft.familiarity || "medium";
  state.sessionId = draft.sessionId || "";
  state.logs = draft.logs || [];
  state.responses = draft.responses || [];
  state.questionnaire = draft.questionnaire || {};
  state.startedAt = draft.startedAt ? Date.parse(draft.startedAt) : 0;
  state.finishedAt = draft.finishedAt ? Date.parse(draft.finishedAt) : 0;
  state.stepIndex = draft.responses ? draft.responses.length : 0;
  renderSetupSummary();
  renderLiveLog();
  if (state.startedAt && state.stepIndex < STEPS.length && !state.finishedAt) {
    setPhase("task");
    renderStep();
    renderSummary();
  }
}

function updateAnswerOutput(el, output) {
  output.textContent = el.value;
}

function setupEvents() {
  els.startBtn.addEventListener("click", () => {
    if (els.assignmentMode.value === "auto") {
      assignByParticipant();
    }
    beginExperiment();
  });
  els.randomizeBtn.addEventListener("click", randomizeSetup);
  els.exportBtn.addEventListener("click", () => exportSession(false));
  els.resetBtn.addEventListener("click", resetSession);
  els.restartBtn.addEventListener("click", resetSession);
  els.downloadBtn.addEventListener("click", () => exportSession(true));
  els.finishBtn.addEventListener("click", () => {
    state.finishedAt = now();
    log("questionnaire_complete", state.questionnaire);
    const payload = buildPayload(false);
    els.resultJson.textContent = JSON.stringify(payload, null, 2);
    exportSession(false);
  });
  els.continueBtn.addEventListener("click", advanceAfterRating);
  els.confidence.addEventListener("input", () => updateAnswerOutput(els.confidence, els.confidenceOut));
  els.load.addEventListener("input", () => updateAnswerOutput(els.load, els.loadOut));
  document.addEventListener("visibilitychange", () => {
    log("visibility_change", { hidden: document.hidden });
  });
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

function initNetworkChip() {
  els.connChip.textContent = navigator.onLine ? "online" : "offline";
  window.addEventListener("online", () => (els.connChip.textContent = "online"));
  window.addEventListener("offline", () => (els.connChip.textContent = "offline"));
}

function main() {
  setupEvents();
  registerSW();
  initNetworkChip();
  renderSetupSummary();
  restoreDraft();
  setInterval(renderTimer, 200);
  renderSummary();
  log("app_ready", {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
  });
}

main();
