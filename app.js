const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const CONDITIONS = {
  control: {
    label: { zh: "对照组", en: "Control" },
    explanation: { zh: "无解释", en: "No explanation" },
    cue: { zh: "系统只显示下一步动作。", en: "The system only shows the next action." },
    template: "control",
  },
  direct: {
    label: { zh: "纯指令型", en: "Direct" },
    explanation: { zh: "仅指令", en: "Instruction only" },
    cue: { zh: "一句简短指令加下一步动作。", en: "A short command plus the next action." },
    template: "direct",
  },
  concise: {
    label: { zh: "简释型", en: "Concise" },
    explanation: { zh: "简短理由", en: "Brief rationale" },
    cue: { zh: "简短指令加一句理由。", en: "A short command with one sentence of reason." },
    template: "concise",
  },
  full: {
    label: { zh: "全释型", en: "Full" },
    explanation: { zh: "详细理由", en: "Detailed rationale" },
    cue: { zh: "指令加更完整的理由和步骤背景。", en: "A command plus fuller rationale and step context." },
    template: "full",
  },
};

const PRESSURES = {
  low: {
    label: { zh: "低压", en: "Low" },
    stepSeconds: 70,
    totalMinutes: 10,
    meter: 28,
    visibleCountdown: true,
    sound: false,
  },
  high: {
    label: { zh: "高压", en: "High" },
    stepSeconds: 25,
    totalMinutes: 6,
    meter: 88,
    visibleCountdown: true,
    sound: true,
  },
  hidden: {
    label: { zh: "隐藏倒计时", en: "Hidden timer" },
    stepSeconds: 35,
    totalMinutes: 8,
    meter: 55,
    visibleCountdown: false,
    sound: false,
  },
};

const SCENARIOS = {
  baseline: {
    label: { zh: "基础 CPR", en: "Baseline CPR" },
    description: { zh: "单一成人 CPR 场景，不插入打断。", en: "Single adult CPR scenario with no interruption." },
    interruptAt: null,
    errorAt: null,
  },
  interrupt: {
    label: { zh: "打断版 CPR", en: "Interruptive CPR" },
    description: { zh: "在中段由旁观者插入一次打断。", en: "A bystander interrupts once during the middle steps." },
    interruptAt: "response_check",
    errorAt: null,
  },
  error: {
    label: { zh: "纠错版 CPR", en: "Error-correction CPR" },
    description: { zh: "插入一个故意的错误并随后纠正。", en: "A deliberate wrong turn is inserted and then corrected." },
    interruptAt: null,
    errorAt: "compressions",
  },
  stress: {
    label: { zh: "高压力 CPR", en: "High-stress CPR" },
    description: { zh: "更紧的节奏、一次打断和一次后期提醒。", en: "Tighter pacing, one interruption, and a late-stage reminder." },
    interruptAt: "call_help",
    errorAt: "aed_handover",
  },
};

const STEPS = [
  {
    id: "scene_safety",
    title: { zh: "场景安全", en: "Scene safety" },
    prompt: { zh: "在接近患者前先确认环境安全。", en: "Check that the environment is safe before approaching the patient." },
    rationale:
      { zh: "危险环境可能造成新的伤害。先确认安全是急救流程的第一道门槛。", en: "Unsafe scenes can create additional casualties. A safe approach is the first gate in emergency response." },
    details:
      { zh: "检查火源、车辆、电源或拥挤风险。必要时可请旁人协助，但不要贸然进入危险区域。", en: "Look for fire, traffic, electrical risk, or crowding. Delegate if needed, but do not rush into an unsafe scene." },
    correct: "safe",
    options: [
      { key: "safe", label: { zh: "小心接近并检查现场", en: "Approach carefully and check the scene" }, note: { zh: "这符合流程。", en: "This matches the protocol." } },
      { key: "rush", label: { zh: "立刻直接冲进去", en: "Run straight in immediately" }, note: { zh: "这会增加风险。", en: "This increases risk." } },
      { key: "call", label: { zh: "请旁人拨打急救电话", en: "Ask someone to call emergency services" }, note: { zh: "有帮助，但先确认安全。", en: "Helpful, but safety comes first." } },
    ],
    corrections: [
      { zh: "在做任何事之前，先确认现场安全。", en: "Before anything else, confirm the scene is safe." },
      { zh: "如果现场不安全，先控制风险再继续。", en: "If the scene is unsafe, do not proceed until it is controlled." },
    ],
  },
  {
    id: "response_check",
    title: { zh: "检查反应", en: "Check responsiveness" },
    prompt: { zh: "拍打并呼喊，然后检查呼吸。", en: "Tap and shout, then check breathing." },
    rationale:
      { zh: "反应和呼吸状态决定是否进入 CPR 分支。", en: "Responsiveness and breathing status determine whether the participant should move into the CPR branch." },
    details:
      { zh: "尽快从观察进入行动。系统化检查能减少犹豫，并帮助参与者理解是否需要 CPR。", en: "Move from observation to action quickly. A systematic check reduces hesitation and helps the user understand why CPR is or is not needed." },
    correct: "check",
    options: [
      { key: "check", label: { zh: "拍打、呼喊并检查呼吸", en: "Tap, shout, and check breathing" }, note: { zh: "正确的急救检查。", en: "Correct emergency check." } },
      { key: "wait", label: { zh: "静静等待观察", en: "Wait and observe silently" }, note: { zh: "这会延迟行动。", en: "This delays action." } },
      { key: "water", label: { zh: "给患者喂水", en: "Give the person water" }, note: { zh: "此时不合适。", en: "Not appropriate here." } },
    ],
    corrections: [
      { zh: "如果患者无反应，就继续下一步。", en: "If the person is unresponsive, continue to the next step." },
      { zh: "判断关键是正常呼吸，而不是动作。", en: "Normal breathing, not movement, is the key decision cue." },
    ],
  },
  {
    id: "call_help",
    title: { zh: "呼叫帮助", en: "Call for help" },
    prompt: { zh: "拨打 120，并请求 AED。", en: "Call 120 and ask for an AED." },
    rationale:
      { zh: "尽早呼叫能更快获得专业救援和除颤仪，同时让一名施救者继续 CPR。", en: "Calling early brings professional help and a defibrillator sooner, while one rescuer continues CPR." },
    details:
      { zh: "如果有旁人，可请对方拨打电话。这个步骤用于观察解释是否能帮助参与者保持行动导向。", en: "The participant can delegate the call if a bystander is present. This step tests whether the explanation helps them stay action-oriented." },
    correct: "call_120",
    options: [
      { key: "call_120", label: { zh: "拨打 120 并请求 AED", en: "Call 120 and ask for AED" }, note: { zh: "正确的急救升级。", en: "Correct emergency escalation." } },
      { key: "video", label: { zh: "先录个视频", en: "Record a video first" }, note: { zh: "此时没有帮助。", en: "Not helpful in the moment." } },
      { key: "wait", label: { zh: "继续看着什么都不做", en: "Keep watching and do nothing" }, note: { zh: "会打断响应链。", en: "Breaks the response chain." } },
    ],
    corrections: [
      { zh: "应立即请求急救服务和 AED 支持。", en: "Emergency services and AED support should be requested immediately." },
      { zh: "不要等完全确定后再打电话。", en: "Do not wait for certainty before calling." },
    ],
  },
  {
    id: "compressions",
    title: { zh: "开始按压", en: "Start compressions" },
    prompt: { zh: "现在开始胸外按压。", en: "Begin chest compressions now." },
    rationale:
      { zh: "对于疑似心脏骤停，尽早按压有助于在救援到来前维持循环。", en: "For suspected cardiac arrest, early compressions support circulation while help is on the way." },
    details:
      { zh: "这是最关键的动作阶段。解释应支持执行，但不能让参与者负担过重。", en: "This is the action-critical stage. Explanation should support execution without overloading the participant." },
    correct: "compress",
    options: [
      { key: "compress", label: { zh: "开始按压", en: "Start compressions" }, note: { zh: "正确的立即动作。", en: "Correct immediate action." } },
      { key: "search", label: { zh: "去网上再查查", en: "Search the web for more detail" }, note: { zh: "这一步太慢了。", en: "Too slow for this step." } },
      { key: "ask", label: { zh: "让患者坐起来", en: "Ask the patient to sit up" }, note: { zh: "若无反应则不合适。", en: "Not appropriate if unresponsive." } },
    ],
    corrections: [
      { zh: "按压质量重要，但现在必须先开始动作。", en: "Compression quality matters, but movement should start now." },
      { zh: "如果刚才犹豫了，请立刻回到按压步骤。", en: "If you hesitated, return to the compression step immediately." },
    ],
  },
  {
    id: "aed_handover",
    title: { zh: "AED 与交接", en: "AED and handover" },
    prompt: { zh: "准备使用 AED，并交接关键信息。", en: "Prepare to use the AED and hand over the key facts." },
    rationale:
      { zh: "最后阶段用于检查参与者能否继续流程并清晰总结情况。", en: "The final stage checks whether the participant can continue the flow and summarize the case clearly." },
    details:
      { zh: "这个阶段结合了持续执行、中断恢复和任务状态向下一位施救者的交接。", en: "This stage combines continuation, recovery from interruptions, and the transfer of task state to the next rescuer." },
    correct: "aed",
    options: [
      { key: "aed", label: { zh: "准备 AED 并完成交接", en: "Prepare AED and hand over" }, note: { zh: "正确的最终动作。", en: "Correct final action." } },
      { key: "stop", label: { zh: "立刻停下离开", en: "Stop and leave immediately" }, note: { zh: "会打断流程。", en: "Breaks the flow." } },
      { key: "forget", label: { zh: "忘掉前面的步骤", en: "Forget the prior steps" }, note: { zh: "会降低执行质量。", en: "Reduces execution quality." } },
    ],
    corrections: [
      { zh: "交接时要保留任务状态。", en: "Keep the task state visible for handover." },
      { zh: "不要漏掉 AED 或总结步骤。", en: "Do not drop the AED or the summary stage." },
    ],
  },
];

const QUESTIONNAIRES = {
  pre: [
    ["experience", { zh: "过往 CPR / 急救经验", en: "Prior CPR / first-aid experience" }],
    ["selfEfficacy", { zh: "我觉得自己有能力在紧急情况下提供帮助", en: "I feel capable of helping in an emergency" }],
    ["trustBaseline", { zh: "我通常信任 AI 引导", en: "I generally trust AI guidance" }],
  ],
  post: [
    ["trust", { zh: "我觉得这套引导是可信的", en: "The guidance was trustworthy" }],
    ["calibration", { zh: "我对系统的信任处于合适水平", en: "I trusted the system at the right level" }],
    ["understand", { zh: "这个解释很容易理解", en: "The explanation was easy to understand" }],
    ["control", { zh: "我仍然觉得自己在掌控决策", en: "I still felt in control of my own decisions" }],
    ["load", { zh: "这个任务很费脑力", en: "The task felt mentally demanding" }],
    ["stress", { zh: "这个任务让我感到紧张", en: "The task felt stressful" }],
    ["actionability", { zh: "这个引导帮助我知道下一步该做什么", en: "The guidance helped me know what to do next" }],
    ["use", { zh: "如果是真实紧急情况，我愿意使用类似系统", en: "I would want to use a system like this in a real emergency" }],
  ],
};

const SURVEY_TYPES = [
  {
    id: "stateTrust",
    label: { zh: "信任状态", en: "Trust state" },
    items: [
      ["trustNow", { zh: "我此刻信任这个系统", en: "I trusted the system right now" }],
      ["follow", { zh: "我愿意跟随这个引导", en: "I was willing to follow the guidance" }],
    ],
  },
  {
    id: "cognitiveLoad",
    label: { zh: "认知负荷", en: "Cognitive load" },
    items: [
      ["effort", { zh: "心理努力程度", en: "Mental effort" }],
      ["overload", { zh: "我感到超负荷", en: "I felt overloaded" }],
      ["pressure", { zh: "我感到时间压力", en: "I felt time pressure" }],
    ],
  },
  {
    id: "actionQuality",
    label: { zh: "行为质量", en: "Action quality" },
    items: [
      ["readiness", { zh: "我感觉已经准备好行动", en: "I felt ready to act" }],
      ["continuity", { zh: "我能在被打断后继续执行", en: "I could keep going after interruptions" }],
      ["correction", { zh: "我能快速纠正错误", en: "I could correct mistakes quickly" }],
    ],
  },
];

const STORAGE_KEY = "cpr-cognition-experiment-draft-v1";

const state = {
  phase: "setup",
  locale: "zh",
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
  localeToggle: $("#localeToggle"),
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

const UI_TEXT = {
  zh: {
    title: "CPR 认知实验",
    heroEyebrow: "成人 CPR 引导研究工具",
    heroLede:
      "这是一个面向研究的网页版原型，用于操控解释深度、时间压力、认知负荷、信任校准和行为执行，并稳定记录全过程日志。",
    setupTab: "设置",
    participantTab: "参与者流程",
    taskTab: "正式任务",
    questionnaireTab: "问卷",
    experimenterTab: "实验员控制台",
    replayTab: "回放与标注",
    exportTab: "导出",
    currentStatus: "当前状态",
    experimentReady: "可开始配置试次",
    setupTitle: "会话设置",
    setupDesc: "开始前请设置参与者编号、试次、解释条件、压力条件和场景版本。",
    participantLabel: "参与者编号",
    trialLabel: "试次编号",
    conditionLabel: "解释深度",
    pressureLabel: "时间压力",
    scenarioLabel: "场景版本",
    explanationModeLabel: "界面模式",
    countdownLabel: "任务中显示倒计时",
    notesLabel: "实验员备注",
    randomize: "随机分配",
    loadDraft: "载入草稿",
    saveDraft: "保存草稿",
    startExperiment: "开始实验",
    researchLogic: "研究逻辑",
    supportExport: "支持导出",
    platformSupport: "平台",
    participantFlowTitle: "参与者流程",
    participantFlowDesc: "知情同意、设备检查、训练示例、正式任务和事后回顾被组织成连续流程。",
    taskTitle: "正式任务",
    taskDesc: "进入 CPR 场景后，参与者在系统引导和压力条件下完成每一步动作。",
    explanationTitle: "解释",
    actionTitle: "请选下一步动作",
    logTitle: "实时日志",
    summaryTitle: "当前概览",
    questionnaireTitle: "问卷",
    interviewTitle: "回顾访谈",
    experimenterTitle: "实验员控制台",
    replayTitle: "回放与标注",
    exportTitle: "数据导出",
    completeTitle: "会话完成",
    visibleTimer: "可见倒计时",
    hiddenTimer: "隐藏倒计时",
    online: "在线",
    offline: "离线",
    participantOverview: "参与者",
    trialOverview: "试次",
    scenarioOverview: "场景",
    countdownOverview: "倒计时",
    stepPrefix: "步骤",
    pause: "暂停",
    resume: "继续",
    endTask: "结束任务",
    acceptCorrection: "接受纠错",
    rejectCorrection: "拒绝纠错",
    saveNote: "保存备注",
    finishSession: "结束会话",
    openInterview: "打开访谈",
    goExport: "前往导出",
    viewExport: "查看导出",
    openReplay: "打开回放",
    clearSession: "重置会话",
    addAnnotation: "添加标注",
    replayJson: "下载回放 JSON",
    exportJson: "导出 JSON",
    exportCsv: "导出 CSV",
    chooseCondition: "刷新条件标签",
    noActiveStep: "暂无激活步骤",
    ready: "就绪",
    hidden: "隐藏",
    visible: "可见",
    pauseHint: "任务已由实验员暂停。",
    downloadBlocked: "浏览器阻止了下载，已在页面中显示预览。",
  },
  en: {
    title: "CPR Cognition Experiment",
    heroEyebrow: "Adult CPR Guidance Research Tool",
    heroLede:
      "A web-based research prototype for manipulating explanation depth, time pressure, cognitive load, trust calibration, and behavioral execution with stable end-to-end logging.",
    setupTab: "Setup",
    participantTab: "Participant Flow",
    taskTab: "Task",
    questionnaireTab: "Questionnaire",
    experimenterTab: "Experimenter",
    replayTab: "Replay & Annotation",
    exportTab: "Export",
    currentStatus: "Current Status",
    experimentReady: "Ready to configure the trial",
    setupTitle: "Session Setup",
    setupDesc: "Before starting, set the participant ID, trial, explanation condition, pressure condition, and scenario.",
    participantLabel: "Participant ID",
    trialLabel: "Trial Number",
    conditionLabel: "Explanation depth",
    pressureLabel: "Time pressure",
    scenarioLabel: "Scenario version",
    explanationModeLabel: "Interface mode",
    countdownLabel: "Show countdown during task",
    notesLabel: "Experimenter notes",
    randomize: "Randomize",
    loadDraft: "Load draft",
    saveDraft: "Save draft",
    startExperiment: "Start experiment",
    researchLogic: "Research logic",
    supportExport: "Export support",
    platformSupport: "Platform",
    participantFlowTitle: "Participant Flow",
    participantFlowDesc: "Consent, device check, training example, formal task, and retrospective interview are organized as one continuous flow.",
    taskTitle: "Task",
    taskDesc: "Inside the CPR scenario, the participant completes each action under system guidance and pressure conditions.",
    explanationTitle: "Explanation",
    actionTitle: "Choose the next action",
    logTitle: "Live Log",
    summaryTitle: "Current Summary",
    questionnaireTitle: "Questionnaire",
    interviewTitle: "Retrospective Interview",
    experimenterTitle: "Experimenter Console",
    replayTitle: "Replay & Annotation",
    exportTitle: "Data Export",
    completeTitle: "Session Complete",
    visibleTimer: "Visible countdown",
    hiddenTimer: "Hidden countdown",
    online: "Online",
    offline: "Offline",
    participantOverview: "Participant",
    trialOverview: "Trial",
    scenarioOverview: "Scenario",
    countdownOverview: "Countdown",
    stepPrefix: "Step",
    pause: "Pause",
    resume: "Resume",
    endTask: "End task",
    acceptCorrection: "Accept correction",
    rejectCorrection: "Reject correction",
    saveNote: "Save note",
    finishSession: "Finish session",
    openInterview: "Open interview",
    goExport: "Go to export",
    viewExport: "View export",
    openReplay: "Open replay",
    clearSession: "Reset session",
    addAnnotation: "Add annotation",
    replayJson: "Download replay JSON",
    exportJson: "Export JSON",
    exportCsv: "Export CSV",
    chooseCondition: "Refresh condition label",
    noActiveStep: "No active step",
    ready: "Ready",
    hidden: "Hidden",
    visible: "Visible",
    pauseHint: "Task paused by experimenter.",
    downloadBlocked: "The browser blocked the download, so the preview is shown on the page.",
  },
};

const CONDITION_TEXT = {
  control: {
    zh: { label: "对照组", explanation: "无解释", cue: "系统只显示下一步动作。" },
    en: { label: "Control", explanation: "No explanation", cue: "The system only shows the next action." },
  },
  direct: {
    zh: { label: "纯指令型", explanation: "仅指令", cue: "一句简短指令加下一步动作。" },
    en: { label: "Direct", explanation: "Instruction only", cue: "A short command plus the next action." },
  },
  concise: {
    zh: { label: "简释型", explanation: "简短理由", cue: "简短指令加一句理由。" },
    en: { label: "Concise", explanation: "Brief rationale", cue: "A short command with one sentence of reason." },
  },
  full: {
    zh: { label: "全释型", explanation: "详细理由", cue: "指令加更完整的理由和步骤背景。" },
    en: { label: "Full", explanation: "Detailed rationale", cue: "A command plus fuller rationale and step context." },
  },
};

const PRESSURE_TEXT = {
  low: {
    zh: { label: "低压", visibleLabel: "可见倒计时" },
    en: { label: "Low", visibleLabel: "Visible timer" },
    stepSeconds: 70,
    totalMinutes: 10,
    meter: 28,
    visibleCountdown: true,
    sound: false,
  },
  high: {
    zh: { label: "高压", visibleLabel: "可见倒计时" },
    en: { label: "High", visibleLabel: "Visible timer" },
    stepSeconds: 25,
    totalMinutes: 6,
    meter: 88,
    visibleCountdown: true,
    sound: true,
  },
  hidden: {
    zh: { label: "隐藏倒计时", visibleLabel: "隐藏倒计时" },
    en: { label: "Hidden timer", visibleLabel: "Hidden timer" },
    stepSeconds: 35,
    totalMinutes: 8,
    meter: 55,
    visibleCountdown: false,
    sound: false,
  },
};

const SCENARIO_TEXT = {
  baseline: {
    zh: { label: "基础 CPR", description: "单一成人 CPR 场景，不插入打断。" },
    en: { label: "Baseline CPR", description: "Single adult CPR scenario with no interruption." },
  },
  interrupt: {
    zh: { label: "打断型 CPR", description: "在中段由旁观者插入一次打断。" },
    en: { label: "Interruptive CPR", description: "A bystander interrupts once during the middle steps." },
  },
  error: {
    zh: { label: "纠错型 CPR", description: "插入一个故意错误并随后纠正。" },
    en: { label: "Error-correction CPR", description: "A deliberate wrong turn is inserted and then corrected." },
  },
  stress: {
    zh: { label: "高压型 CPR", description: "更紧的节奏、一次打断和一次后期提醒。" },
    en: { label: "High-stress CPR", description: "Tighter pacing, one interruption, and a late-stage reminder." },
  },
};

const STEP_TEXT = {
  scene_safety: {
    zh: {
      title: "场景安全",
      prompt: "在接近患者前先确认环境安全。",
      rationale: "危险环境可能造成新的伤害。先确认安全是急救流程的第一道门槛。",
      details: "检查火源、车辆、电源或拥挤风险。必要时请旁人协助，但不要贸然进入危险区域。",
      correct: "safe",
      options: [
        { key: "safe", label: "小心接近并检查现场", note: "这符合流程。" },
        { key: "rush", label: "立刻直接冲进去", note: "这会增加风险。" },
        { key: "call", label: "先请旁人拨打急救电话", note: "有帮助，但先确认安全。" },
      ],
      corrections: [
        "在做任何事之前，先确认现场安全。",
        "如果现场不安全，先控制风险再继续。",
      ],
    },
    en: {
      title: "Scene safety",
      prompt: "Check that the environment is safe before approaching the patient.",
      rationale: "Unsafe scenes can create additional casualties. A safe approach is the first gate in emergency response.",
      details: "Look for fire, traffic, electrical risk, or crowding. Delegate if needed, but do not rush into an unsafe scene.",
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
  },
  response_check: {
    zh: {
      title: "检查反应",
      prompt: "拍打并呼叫，然后检查呼吸。",
      rationale: "反应和呼吸状态决定是否进入 CPR 分支。",
      details: "尽快从观察进入行动。系统化检查能减少犹豫，并帮助参与者判断是否需要 CPR。",
      correct: "check",
      options: [
        { key: "check", label: "拍打、呼叫并检查呼吸", note: "正确的急救检查。" },
        { key: "wait", label: "安静等待观察", note: "这会延迟行动。" },
        { key: "water", label: "先给患者喝水", note: "此时不合适。" },
      ],
      corrections: [
        "如果患者无反应，就继续下一步。",
        "关键判断是是否正常呼吸，而不是是否在动。",
      ],
    },
    en: {
      title: "Check responsiveness",
      prompt: "Tap and shout, then check breathing.",
      rationale: "Responsiveness and breathing status determine whether the participant should move into the CPR branch.",
      details: "Move from observation to action quickly. A systematic check reduces hesitation and helps the user understand why CPR is or is not needed.",
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
  },
  call_help: {
    zh: {
      title: "呼叫帮助",
      prompt: "拨打 120，并请求 AED。",
      rationale: "尽早呼叫能更快获得专业救援和除颤仪，同时让一名施救者继续 CPR。",
      details: "如果有旁人，可请对方拨打电话。这个步骤用于观察解释是否能帮助参与者保持行动导向。",
      correct: "call_120",
      options: [
        { key: "call_120", label: "拨打 120 并请求 AED", note: "正确的急救升级。" },
        { key: "video", label: "先录个视频", note: "这时没有帮助。" },
        { key: "wait", label: "继续看着什么都不做", note: "会打断响应链。" },
      ],
      corrections: [
        "应立刻请求急救服务和 AED 支持。",
        "不要等到完全确定后才打电话。",
      ],
    },
    en: {
      title: "Call for help",
      prompt: "Call 120 and ask for an AED.",
      rationale: "Calling early brings professional help and a defibrillator sooner, while one rescuer continues CPR.",
      details: "The participant can delegate the call if a bystander is present. This step tests whether the explanation helps them stay action-oriented.",
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
  },
  compressions: {
    zh: {
      title: "开始按压",
      prompt: "现在开始胸外按压。",
      rationale: "对于疑似心脏骤停，尽早按压有助于在救援到达前维持循环。",
      details: "这是最关键的动作阶段。解释应支持执行，但不能让参与者负担过重。",
      correct: "compress",
      options: [
        { key: "compress", label: "开始按压", note: "正确的立即动作。" },
        { key: "search", label: "先上网再查一查", note: "这一步太慢了。" },
        { key: "ask", label: "让患者坐起来", note: "若无反应则不合适。" },
      ],
      corrections: [
        "按压质量重要，但现在必须先开始动作。",
        "如果刚才犹豫了，请立即回到按压步骤。",
      ],
    },
    en: {
      title: "Start compressions",
      prompt: "Begin chest compressions now.",
      rationale: "For suspected cardiac arrest, early compressions support circulation while help is on the way.",
      details: "This is the action-critical stage. Explanation should support execution without overloading the participant.",
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
  },
  aed_handover: {
    zh: {
      title: "AED 与交接",
      prompt: "准备使用 AED，并交接关键信息。",
      rationale: "最后阶段用于检验参与者能否继续流程并清楚总结情况。",
      details: "这个阶段结合了持续执行、中断恢复和向下一位施救者的任务交接。",
      correct: "aed",
      options: [
        { key: "aed", label: "准备 AED 并完成交接", note: "正确的最终动作。" },
        { key: "stop", label: "立刻停下离开", note: "会打断流程。" },
        { key: "forget", label: "忘掉前面的步骤", note: "会降低执行质量。" },
      ],
      corrections: [
        "交接时要保留任务状态。",
        "不要漏掉 AED 或总结步骤。",
      ],
    },
    en: {
      title: "AED and handover",
      prompt: "Prepare to use the AED and hand over the key facts.",
      rationale: "The final stage checks whether the participant can continue the flow and summarize the case clearly.",
      details: "This stage combines continuation, recovery from interruptions, and the transfer of task state to the next rescuer.",
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
  },
};

const QUESTIONNAIRE_GROUPS = {
  zh: {
    pre: [
      ["experience", "过往 CPR / 急救经验"],
      ["selfEfficacy", "我觉得自己有能力在紧急情境下提供帮助"],
      ["trustBaseline", "我通常信任 AI 指引"],
    ],
    post: [
      ["trust", "我觉得这套引导是可信的"],
      ["calibration", "我对系统的信任处于合适水平"],
      ["understand", "这个解释很容易理解"],
      ["control", "我仍然觉得自己在掌控决策"],
      ["load", "这个任务很费脑力"],
      ["stress", "这个任务让我感到紧张"],
      ["actionability", "这个引导帮助我知道下一步该做什么"],
      ["use", "如果是真实紧急情境，我愿意使用类似系统"],
    ],
    short: [
      ["load", "心理负荷"],
      ["pressure", "时间压力"],
      ["control", "控制感"],
    ],
    surveyTypes: [
      { id: "stateTrust", label: "信任状态" },
      { id: "cognitiveLoad", label: "认知负荷" },
      { id: "actionQuality", label: "行为质量" },
    ],
  },
  en: {
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
    short: [
      ["load", "Mental load"],
      ["pressure", "Time pressure"],
      ["control", "Sense of control"],
    ],
    surveyTypes: [
      { id: "stateTrust", label: "Trust state" },
      { id: "cognitiveLoad", label: "Cognitive load" },
      { id: "actionQuality", label: "Action quality" },
    ],
  },
};

function loc(value, locale = state.locale) {
  if (value && typeof value === "object" && ("zh" in value || "en" in value)) {
    return locale === "en" ? value.en ?? value.zh ?? "" : value.zh ?? value.en ?? "";
  }
  return value ?? "";
}

function localizedText(map, key, fallback = "") {
  return loc(map?.[key] ?? fallback);
}

function currentStep() {
  return STEPS[state.stepIndex] || null;
}

function buildConditionTemplate() {
  const step = currentStep();
  const stepText = STEP_TEXT[step?.id]?.[state.locale] || {};
  const condition = CONDITION_TEXT[state.condition]?.[state.locale] || {};
  if (!step) return { title: "", body: "", bullets: [], cue: condition.cue || "" };
  const bodyByMode = {
    control: stepText.prompt,
    direct: state.locale === "en" ? `${stepText.prompt} Do the next action now.` : `${stepText.prompt} 现在执行下一步动作。`,
    concise: `${stepText.prompt} ${stepText.rationale}`,
    full: `${stepText.prompt} ${stepText.rationale} ${stepText.details}`,
  };
  const bulletsByMode = {
    control: stepText.corrections.slice(0, 2),
    direct: state.locale === "en"
      ? [stepText.correct === "safe" ? "Start with safety." : "Move to the next response step.", "Keep moving forward."]
      : [stepText.correct === "safe" ? "先确保安全。" : "继续进入下一步。", "保持行动推进。"],
    concise: stepText.corrections,
    full: [stepText.rationale, stepText.details, ...stepText.corrections],
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
  const pressure = PRESSURE_TEXT[state.pressure]?.[state.locale] || {};
  const condition = CONDITION_TEXT[state.condition]?.[state.locale] || {};
  const scenario = SCENARIO_TEXT[state.scenario]?.[state.locale] || {};
  els.connectionChip.textContent = navigator.onLine ? UI_TEXT[state.locale].online : UI_TEXT[state.locale].offline;
  els.trialChip.textContent = state.trialId || "-";
  els.pressureChip.textContent = pressure.label || "-";
  els.conditionChip.textContent = condition.label || "-";
  els.stepChip.textContent = step ? `${state.stepIndex + 1}/${STEPS.length}` : "-";
  els.visibleCountdownLabel.textContent = state.visibleCountdown ? UI_TEXT[state.locale].visibleTimer : UI_TEXT[state.locale].hiddenTimer;
  els.pressureLabel.textContent = pressure.label || "-";
  els.modeLabel.textContent = condition.explanation || "-";
  els.participantOverview.textContent = [
    `${UI_TEXT[state.locale].participantOverview}: ${state.participantId || "-"}`,
    `${UI_TEXT[state.locale].trialOverview}: ${state.trialId || "-"}`,
    `${UI_TEXT[state.locale].scenarioOverview}: ${scenario.label || "-"}`,
    `${UI_TEXT[state.locale].countdownOverview}: ${state.visibleCountdown ? UI_TEXT[state.locale].visible : UI_TEXT[state.locale].hidden}`,
  ].join(" | ");
}

function renderSetup() {
  const summary = buildSessionSummary();
  els.experimenterStatus.textContent = UI_TEXT[state.locale].experimentReady;
  els.experimenterStep.textContent = `${UI_TEXT[state.locale].currentStatus}: ${state.phase}`;
  els.experimenterMetrics.textContent = state.locale === "en"
    ? [
        `Logs: ${state.events.length}`,
        `Choices: ${state.responses.filter((r) => r.type === "choice").length}`,
        `Interruptions: ${state.interruptionCount}`,
      ].join(" | ")
    : [
        `日志: ${state.events.length}`,
        `选择: ${state.responses.filter((r) => r.type === "choice").length}`,
        `中断: ${state.interruptionCount}`,
      ].join(" | ");
  els.statusSummary.textContent = `${UI_TEXT[state.locale].summaryTitle}: ${summary.completedSteps}/${summary.totalSteps}`;
  renderSummary();
}

function renderSummary() {
  const summary = buildSessionSummary();
  const rows = state.locale === "en"
    ? [
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
    : [
        `会话: ${summary.sessionId || "-"}`,
        `时长: ${summary.durationMs} ms`,
        `准确率: ${summary.accuracy}`,
        `平均反应: ${summary.meanReactionMs} ms`,
        `平均步骤耗时: ${summary.meanStepMs} ms`,
        `解释请求: ${summary.explanationRequests}`,
        `重复解释: ${summary.explanationReplays}`,
        `跳过解释: ${summary.explanationSkips}`,
        `中断: ${summary.interruptions}`,
        `错误: ${summary.errors}`,
        `纠错接受: ${summary.correctionAcceptCount}`,
      ];
  els.summaryList.innerHTML = rows
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
  els.timerText.textContent = PRESSURE_TEXT[state.pressure].visibleCountdown && state.visibleCountdown ? formatClock(remaining) : UI_TEXT[state.locale].hidden;
  els.progressFill.style.width = `${Math.min(100, (state.stepIndex / STEPS.length) * 100)}%`;
}

function renderScenarioBanner() {
  const step = currentStep();
  const scenario = SCENARIO_TEXT[state.scenario]?.[state.locale] || {};
  const pressure = PRESSURE_TEXT[state.pressure]?.[state.locale] || {};
  const message = [
    `${scenario.label}: ${scenario.description}`,
    `${UI_TEXT[state.locale].pressureLabel}: ${pressure.label}.`,
    step ? `${UI_TEXT[state.locale].stepPrefix}: ${loc(STEP_TEXT[step.id]?.[state.locale]?.title || step.title)}.` : "",
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
    title: `${loc(CONDITION_TEXT[state.condition]?.[state.locale]?.label)} ${UI_TEXT[state.locale].explanationTitle}`,
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
  if (state.pressure !== "low" && PRESSURE_TEXT[state.pressure].sound) {
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
  els.currentStageTitle.textContent = loc(STEP_TEXT[step.id]?.[state.locale]?.title || step.title);
  els.currentStageDesc.textContent = condition.body;
  els.stepProgressText.textContent = `${UI_TEXT[state.locale].stepPrefix} ${state.stepIndex + 1} / ${STEPS.length}`;
  els.explanationCard.classList.remove("hidden");
  renderExplanation("step");
  renderScenarioBanner();
  renderActionButtons();
  if (!preserveDeadline) {
    state.currentDeadline = now() + PRESSURE_TEXT[state.pressure].stepSeconds * 1000;
  }
  renderTimer();
  addEvent("step_presented", {
    stepTitle: loc(STEP_TEXT[step.id]?.[state.locale]?.title || step.title),
    stepPrompt: loc(STEP_TEXT[step.id]?.[state.locale]?.prompt || step.prompt),
    explanationMode: state.condition,
    pressure: state.pressure,
    countdownVisible: state.visibleCountdown,
  }, step.id);
  startPressureClock();
}

function renderActionButtons() {
  const step = currentStep();
  if (!step) return;
  const stepText = STEP_TEXT[step.id]?.[state.locale] || {};
  els.responseGrid.innerHTML = "";
  (stepText.options || []).forEach((option) => {
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
        reactionMs: PRESSURE_TEXT[state.pressure].stepSeconds * 1000,
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
  const label = state.isPaused ? UI_TEXT[state.locale].resume : UI_TEXT[state.locale].pause;
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
  const stepText = STEP_TEXT[step.id]?.[state.locale] || {};
  els.currentStageDesc.textContent = state.locale === "en"
    ? `Incorrect choice recorded: ${choice}. The system can now show a correction, a gentle nudge, or a risk-only reminder.`
    : `已记录错误选择：${choice}。系统现在可以给出纠错、温和提醒或仅风险提示。`;
  els.explanationBody.textContent = state.locale === "en"
    ? `Correction mode for ${loc(stepText.title || step.title)}.`
    : `${loc(stepText.title || step.title)} 的纠错模式。`;
  els.explanationBullets.innerHTML = (stepText.corrections || [])
    .map((item) => `<li>${escapeHtml(loc(item))}</li>`)
    .join("");
  els.explanationCues.textContent = state.locale === "en" ? "The correction module is ready." : "纠错模块已就绪。";
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
  const condition = CONDITION_TEXT[state.condition]?.[state.locale] || {};
  const pressure = PRESSURE_TEXT[state.pressure]?.[state.locale] || {};
  const scenario = SCENARIO_TEXT[state.scenario]?.[state.locale] || {};
  els.participantOverview.textContent = [
    `${UI_TEXT[state.locale].participantOverview}: ${state.participantId || "-"}`,
    `${UI_TEXT[state.locale].trialOverview}: ${state.trialId || "-"}`,
    `${UI_TEXT[state.locale].conditionLabel}: ${condition.label || "-"}`,
    `${UI_TEXT[state.locale].pressureLabel}: ${pressure.label || "-"}`,
    `${UI_TEXT[state.locale].scenarioOverview}: ${scenario.label || "-"}`,
  ].join(" | ");
  renderTaskHeader();
}

function renderTaskHeader() {
  const step = currentStep();
  if (!step) return;
  els.currentStageTitle.textContent = loc(STEP_TEXT[step.id]?.[state.locale]?.title || step.title);
  els.currentStageDesc.textContent = buildConditionTemplate().body;
  els.stepProgressText.textContent = `${UI_TEXT[state.locale].stepPrefix} ${state.stepIndex + 1} / ${STEPS.length}`;
}

function renderQuestionnaires() {
  renderQuestionnaireGroup(els.questionnairePre, QUESTIONNAIRE_GROUPS[state.locale].pre, state.questionnaire.pre);
  renderQuestionnaireGroup(els.questionnairePost, QUESTIONNAIRE_GROUPS[state.locale].post, state.questionnaire.post);
  renderQuestionnaireGroup(els.questionnaireShort, QUESTIONNAIRE_GROUPS[state.locale].short, state.questionnaire.short);
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
  const step = currentStep();
  els.experimenterStatus.textContent = state.locale === "en" ? `Trial ${state.trialId || "-"} ready.` : `试次 ${state.trialId || "-"} 已就绪。`;
  els.experimenterStep.textContent = step
    ? `${UI_TEXT[state.locale].stepPrefix}: ${loc(STEP_TEXT[step.id]?.[state.locale]?.title || step.title)}`
    : UI_TEXT[state.locale].noActiveStep;
  els.experimenterMetrics.textContent = state.locale === "en"
    ? [
        `Logs: ${state.events.length}`,
        `Choices: ${state.responses.length}`,
        `Interruptions: ${state.interruptionCount}`,
        `Errors: ${state.errorCount}`,
      ].join(" | ")
    : [
        `日志: ${state.events.length}`,
        `选择: ${state.responses.length}`,
        `中断: ${state.interruptionCount}`,
        `错误: ${state.errorCount}`,
      ].join(" | ");
}

function startTask() {
  if (!state.sessionId) beginTrial();
  switchPhase("task");
  state.taskState.summary = state.locale === "en" ? "Task started" : "任务已开始";
  renderTask();
  renderExperimenterPanel();
  renderSummary();
  addEvent("task_started", {
    countdownVisible: state.visibleCountdown,
    pressureSeconds: PRESSURE_TEXT[state.pressure].stepSeconds,
    totalMinutes: PRESSURE_TEXT[state.pressure].totalMinutes,
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
    els.currentStageDesc.textContent = UI_TEXT[state.locale].pauseHint;
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
      locale: state.locale,
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
    alert(UI_TEXT[state.locale].downloadBlocked);
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
      speak(state.locale === "en" ? "Please continue with the next emergency step." : "请继续完成下一步急救动作。", "reminder");
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
  const conditionKeys = Object.keys(CONDITION_TEXT);
  const pressureKeys = Object.keys(PRESSURE_TEXT);
  const scenarioKeys = Object.keys(SCENARIO_TEXT);
  els.condition.value = conditionKeys[seed % conditionKeys.length];
  els.pressure.value = pressureKeys[(seed + 1) % pressureKeys.length];
  els.scenario.value = scenarioKeys[(seed + 2) % scenarioKeys.length];
  els.explanationMode.value = els.condition.value;
  els.countdownToggle.checked = PRESSURE_TEXT[els.pressure.value].visibleCountdown;
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
  state.locale = state.locale || "zh";
  state.notes = els.participantNotes.value || "";
  state.questionnaire.pre = state.questionnaire.pre || {};
  state.questionnaire.post = state.questionnaire.post || {};
  state.questionnaire.short = state.questionnaire.short || {};
  updateTopChips();
}

function initializeQuestionnaireInputs() {
  renderQuestionnaires();
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
  state.locale = draft.state.locale || state.locale || "zh";
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
  applyLocale();
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
    speak(
      state.locale === "en" ? "Training example started. Follow the next action." : "训练示例已开始，请跟随下一步动作。",
      "training"
    );
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
    state.visibleCountdown = PRESSURE_TEXT[state.pressure].visibleCountdown;
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
  if (els.localeToggle) {
    els.localeToggle.addEventListener("click", () => {
      state.locale = state.locale === "zh" ? "en" : "zh";
      localStorage.setItem("cpr-cognition-locale-v1", state.locale);
      applyLocale();
      addEvent("locale_changed", { locale: state.locale });
    });
  }
  window.addEventListener("online", updateTopChips);
  window.addEventListener("offline", updateTopChips);
}

function resetAll() {
  stopPressureClock();
  clearDraft();
  state.phase = "setup";
  state.locale = "zh";
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
  applyLocale();
}

function renderSetupPanel() {
  updateTopChips();
  renderSummary();
  renderTaskHeader();
  renderQuestionnaires();
  renderReplay();
  renderLiveLog();
  applyLocale();
}

function applyLocale() {
  const locale = state.locale === "en" ? "en" : "zh";
  document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  document.title = UI_TEXT[locale].title;
  if (els.localeToggle) {
    els.localeToggle.textContent = locale === "zh" ? "English" : "中文";
  }

  const heroEyebrow = $(".hero .eyebrow");
  const heroTitle = $(".hero h1");
  const heroLede = $(".hero .lede");
  if (heroEyebrow) heroEyebrow.textContent = UI_TEXT[locale].heroEyebrow;
  if (heroTitle) heroTitle.textContent = UI_TEXT[locale].title;
  if (heroLede) heroLede.textContent = UI_TEXT[locale].heroLede;

  const tabLabels = {
    setup: UI_TEXT[locale].setupTab,
    participant: UI_TEXT[locale].participantTab,
    task: UI_TEXT[locale].taskTab,
    questionnaire: UI_TEXT[locale].questionnaireTab,
    experimenter: UI_TEXT[locale].experimenterTab,
    replay: UI_TEXT[locale].replayTab,
    export: UI_TEXT[locale].exportTab,
    interview: UI_TEXT[locale].openInterview,
  };
  $$("[data-target]").forEach((button) => {
    const target = button.dataset.target;
    if (tabLabels[target]) button.textContent = tabLabels[target];
  });

  const set = (node, value) => {
    if (node) node.textContent = value;
  };

  set($("#setupView .panel-head h2"), UI_TEXT[locale].setupTitle);
  set($("#setupView .panel-head p"), UI_TEXT[locale].setupDesc);
  set($("#participantView .panel-head h2"), UI_TEXT[locale].participantFlowTitle);
  set($("#participantView .panel-head p"), UI_TEXT[locale].participantFlowDesc);
  set($("#taskView .eyebrow"), UI_TEXT[locale].taskTab);
  set($("#questionnaireView .panel-head h2"), UI_TEXT[locale].questionnaireTitle);
  set($("#experimenterView .panel-head h2"), UI_TEXT[locale].experimenterTab);
  set($("#replayView .panel-head h2"), UI_TEXT[locale].replayTitle);
  set($("#exportView .panel-head h2"), UI_TEXT[locale].exportTitle);
  set($("#completeView .panel-head h2"), UI_TEXT[locale].completeTitle);

  const participantFields = $$(".field span", $("#setupView"));
  if (participantFields[0]) participantFields[0].textContent = UI_TEXT[locale].participantLabel;
  if (participantFields[1]) participantFields[1].textContent = UI_TEXT[locale].trialLabel;
  if (participantFields[2]) participantFields[2].textContent = UI_TEXT[locale].conditionLabel;
  if (participantFields[3]) participantFields[3].textContent = UI_TEXT[locale].pressureLabel;
  if (participantFields[4]) participantFields[4].textContent = UI_TEXT[locale].scenarioLabel;
  if (participantFields[5]) participantFields[5].textContent = UI_TEXT[locale].explanationModeLabel;
  if (participantFields[6]) participantFields[6].textContent = UI_TEXT[locale].countdownLabel;
  const noteLabels = $$("#setupView .field span");
  if (noteLabels[7]) noteLabels[7].textContent = UI_TEXT[locale].notesLabel;

  const buttons = {
    randomizeBtn: UI_TEXT[locale].randomize,
    loadDraftBtn: UI_TEXT[locale].loadDraft,
    saveDraftBtn: UI_TEXT[locale].saveDraft,
    startBtn: UI_TEXT[locale].startExperiment,
    consentYes: locale === "en" ? "Consent" : "同意参与",
    consentNo: locale === "en" ? "Decline" : "不同意",
    deviceCheckBtn: locale === "en" ? "Run device check" : "运行设备检查",
    trainingBtn: locale === "en" ? "Play training example" : "播放训练示例",
    beginTaskBtn: locale === "en" ? "Start timed task" : "开始计时任务",
    pauseBtn: state.isPaused ? UI_TEXT[locale].resume : UI_TEXT[locale].pause,
    endTaskBtn: UI_TEXT[locale].endTask,
    injectErrorBtn: locale === "en" ? "Inject error" : "插入错误",
    injectInterruptBtn: locale === "en" ? "Inject interruption" : "插入打断",
    injectReminderBtn: locale === "en" ? "Inject reminder" : "插入提醒",
    injectCorrectionBtn: locale === "en" ? "Inject correction" : "插入纠错",
    previousStepBtn: locale === "en" ? "Previous step" : "上一步",
    repeatStepBtn: locale === "en" ? "Repeat step" : "重复当前步骤",
    explainMoreBtn: locale === "en" ? "More explanation" : "更多解释",
    repeatExplanationBtn: locale === "en" ? "Repeat explanation" : "重复播放",
    skipExplanationBtn: locale === "en" ? "Skip" : "跳过",
    acceptCorrectionBtn: UI_TEXT[locale].acceptCorrection,
    rejectCorrectionBtn: UI_TEXT[locale].rejectCorrection,
    addNoteBtn: UI_TEXT[locale].saveNote,
    finishSessionBtn: UI_TEXT[locale].finishSession,
    exportJsonBtn: UI_TEXT[locale].exportJson,
    exportCsvBtn: UI_TEXT[locale].exportCsv,
    downloadReplayBtn: UI_TEXT[locale].replayJson,
    clearBtn: UI_TEXT[locale].clearSession,
    clearBtn2: UI_TEXT[locale].clearSession,
    annotationBtn: UI_TEXT[locale].addAnnotation,
    switchConditionBtn: UI_TEXT[locale].chooseCondition,
    beginTaskBtn2: locale === "en" ? "Start task" : "开始任务",
    pauseBtn2: state.isPaused ? UI_TEXT[locale].resume : UI_TEXT[locale].pause,
    endTaskBtn2: UI_TEXT[locale].endTask,
    injectErrorBtn2: locale === "en" ? "Inject error" : "插入错误",
    injectInterruptBtn2: locale === "en" ? "Inject interruption" : "插入打断",
    injectReminderBtn2: locale === "en" ? "Inject reminder" : "插入提醒",
  };
  Object.entries(buttons).forEach(([id, text]) => set($("#" + id), text));

  const placeholders = {
    participantId: locale === "en" ? "P01" : "P01",
    participantNotes: locale === "en" ? "Experimenter notes or participant observations..." : "可填写会话备注或观察记录",
    annotationInput: locale === "en" ? "Write an observation for coding later" : "填写供后续编码的观察内容",
  };
  if (els.participantId) els.participantId.placeholder = placeholders.participantId;
  if (els.participantNotes) els.participantNotes.placeholder = placeholders.participantNotes;
  if (els.annotationInput) els.annotationInput.placeholder = placeholders.annotationInput;

  renderQuestionnaires();
  updateTopChips();
  renderSummary();
  renderExperimenterPanel();
  renderTaskHeader();
  renderReplay();
  renderExportPayload();
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
  state.locale = localStorage.getItem("cpr-cognition-locale-v1") || state.locale || "zh";
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
