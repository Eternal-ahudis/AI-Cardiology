/**
 * @file Main application controller: Cabrera axis trainer, 12-lead ECG pathology explorer,
 * 12-point ECG analysis plan, diagnostic algorithm tracer, and multi-mode quiz.
 */

(function (root) {
    const EcgApp = root.EcgApp;
    const { drawEcgState } = EcgApp.drawing;
    const { mouseAngle } = EcgApp.circleCalculations;
    const {
        computeEcgState,
        lagetyp,
        normalizeAngle,
        toClinicalAngle
    } = EcgApp.calculations;
    const {
        MI_DEPTHS,
        MI_LOCALIZATIONS,
        MI_STAGES,
        PATHOLOGIES,
        PATHOLOGY_CATEGORIES,
        TEXTBOOK_TEST_QUESTIONS,
        getPathologyById
    } = EcgApp.pathologies;
    const { buildAnalysisPlan, traceDiagnosticAlgorithm } = EcgApp.analysis;
    const { langDe, langEn, langEs, langRu } = EcgApp.languages;

// Application State
let axisMode = 'ru'; // 'ru' | 'de' | 'int'
let currentLanguage = langRu;
let currentSection = 'cabrera'; // 'cabrera' | 'pathologies' | 'quiz' | 'about'
let sectionHistory = [];
let currentQuizMode = 'axis'; // 'axis' | 'pathology' | 'textbook'
let mouseDown = false;
let angle = 45;
let answersCorrect = 0;
let answersWrong = 0;
let dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
let firstMove = true;
let pendingRafId = 0;
let pendingResizeTimer = 0;

// ECG rendering options
let viewMode = '6lead'; // '12lead' | '6lead' | 'rhythm'
let speedMmPerSec = 25;

// Pathology explorer state
let selectedCategory = 'automatism';
let selectedPathologyId = 'sinus_tachycardia';
let pathologyOptions = {
    hr: 112,
    localization: 'anteroseptal_apical',
    miStage: 'acute',
    miDepth: 'transmural'
};
let activeAnalysisTab = 'plan'; // 'plan' | 'algo'

// Quiz state
let currentPathoQuestion = null;
let pathoQuizAnswered = false;
let currentTextbookIdx = 0;
let textbookQuizAnswered = false;
let selectedTextbookIndices = new Set();

// Main DOM elements
const line = document.getElementById('line');
const lineright = document.getElementById('lineright');
const bigCircle = document.getElementById('bigCircle');
const containerDivs = document.querySelectorAll('div.containerInner');
const circleDe = document.getElementById('circleDe');
const circleInt = document.getElementById('circleInt');
const circleRu = document.getElementById('circleRu');
const split = document.querySelector('div.split');
const ecg = document.getElementById('ecg');
const cabrera = document.getElementById('cabrera');
const pathologiesPanel = document.getElementById('pathologies');
const quiz = document.getElementById('quiz');
const about = document.getElementById('about');
const analysisSection = document.getElementById('analysisSection');
const sectionGeneral = document.getElementById('sectionGeneral');
const sectionSources = document.getElementById('sectionSources');
const axisMetricsBar = document.getElementById('axisMetricsBar');

// Canvas
const ecgCanvasBox = document.getElementById('ecgCanvasBox');
const ecgCanvas = document.getElementById('ecgCanvas');
const ctxEcg = ecgCanvas.getContext('2d');
const gridCanvas = document.getElementById('gridCanvas');
const ctxGrid = gridCanvas.getContext('2d');

// ECG Toolbar
const view12Btn = document.getElementById('view12Btn');
const view6Btn = document.getElementById('view6Btn');
const viewRhythmBtn = document.getElementById('viewRhythmBtn');
const speed25Btn = document.getElementById('speed25Btn');
const speed50Btn = document.getElementById('speed50Btn');

// Cabrera-circle elements
const uelt = document.getElementById('uelt');
const lt = document.getElementById('lt');
const it = document.getElementById('it');
const st = document.getElementById('st');
const rt = document.getElementById('rt');
const uert = document.getElementById('uert');
const nwt = document.getElementById('nwt');
const circleParts = [lt, it, st, rt, uert, uelt, nwt];

const enLad = document.getElementById('enLad');
const enNormal = document.getElementById('enNormal');
const enRad = document.getElementById('enRad');
const enNwt = document.getElementById('enNwt');
const circlePartsEn = [enLad, enNormal, enRad, enNwt];

const ruLad = document.getElementById('ruLad');
const ruHoriz = document.getElementById('ruHoriz');
const ruNormal = document.getElementById('ruNormal');
const ruVert = document.getElementById('ruVert');
const ruRad = document.getElementById('ruRad');
const ruNwt = document.getElementById('ruNwt');
const circlePartsRu = [ruLad, ruHoriz, ruNormal, ruVert, ruRad, ruNwt];

// Navigation Buttons
const buttonCabrera = document.getElementById('button_cabrera');
const buttonPathologies = document.getElementById('button_pathologies');
const buttonQuiz = document.getElementById('button_quiz');
const buttonAbout = document.getElementById('button_about');
const buttonLangRu = document.getElementById('button_ru');
const buttonLangEn = document.getElementById('button_en');
const buttonLangDe = document.getElementById('button_de');
const buttonLangEs = document.getElementById('button_es');

// Pathology DOM elements
const categoryTabs = document.getElementById('categoryTabs');
const pathologyList = document.getElementById('pathologyList');
const selectedPathologyTitle = document.getElementById('selectedPathologyTitle');
const hrControlRow = document.getElementById('hrControlRow');
const hrSlider = document.getElementById('hrSlider');
const hrValueLabel = document.getElementById('hrValueLabel');
const axisControlRow = document.getElementById('axisControlRow');
const axisSlider = document.getElementById('axisSlider');
const axisValueLabel = document.getElementById('axisValueLabel');
const miStageRow = document.getElementById('miStageRow');
const miStageSelect = document.getElementById('miStageSelect');
const miDepthRow = document.getElementById('miDepthRow');
const miDepthSelect = document.getElementById('miDepthSelect');
const localizationRow = document.getElementById('localizationRow');
const localizationSelect = document.getElementById('localizationSelect');
const criteriaList = document.getElementById('criteriaList');
const clinicalNote = document.getElementById('clinicalNote');

// Analysis section DOM elements
const tabPlanBtn = document.getElementById('tabPlanBtn');
const tabAlgoBtn = document.getElementById('tabAlgoBtn');
const analysisPlanContainer = document.getElementById('analysisPlanContainer');
const analysisAlgoContainer = document.getElementById('analysisAlgoContainer');

// Quiz DOM elements
const quizModeAxisBtn = document.getElementById('quizModeAxis');
const quizModePathologyBtn = document.getElementById('quizModePathology');
const quizModeTextbookBtn = document.getElementById('quizModeTextbook');
const axisQuizContainer = document.getElementById('axisQuizContainer');
const pathologyQuizContainer = document.getElementById('pathologyQuizContainer');
const textbookQuizContainer = document.getElementById('textbookQuizContainer');
const pathoQuizHintBtn = document.getElementById('pathoQuizHintBtn');
const pathoQuizNextBtn = document.getElementById('pathoQuizNextBtn');
const pathoQuizHintBox = document.getElementById('pathoQuizHintBox');
const pathoQuizOptions = document.getElementById('pathoQuizOptions');
const pathoQuizFeedback = document.getElementById('pathoQuizFeedback');
const textbookQuizPrompt = document.getElementById('textbookQuizPrompt');
const textbookQuizOptions = document.getElementById('textbookQuizOptions');
const textbookQuizCheckBtn = document.getElementById('textbookQuizCheckBtn');
const textbookQuizNextBtn = document.getElementById('textbookQuizNextBtn');
const textbookQuizFeedback = document.getElementById('textbookQuizFeedback');

const displayAnswersCorrect = document.getElementById('answersCorrect');
const displayAnswersWrong = document.getElementById('answersWrong');
const displayLagetyp = document.getElementById('lagetyp');
const displayCorrect = document.getElementById('correct');
const displayWrong = document.getElementById('wrong');
const labelCorrect = document.getElementById('labelCorrect');
const labelWrong = document.getElementById('labelWrong');

// Navigation Listeners
buttonCabrera.addEventListener('click', () => switchSection('cabrera'));
buttonPathologies.addEventListener('click', () => switchSection('pathologies'));
buttonQuiz.addEventListener('click', () => switchSection('quiz'));
buttonAbout.addEventListener('click', () => switchSection('about'));

buttonLangRu.addEventListener('click', (e) => setLanguage(langRu, 'ru', e.target.id));
buttonLangEn.addEventListener('click', (e) => setLanguage(langEn, 'int', e.target.id));
buttonLangDe.addEventListener('click', (e) => setLanguage(langDe, 'de', e.target.id));
buttonLangEs.addEventListener('click', (e) => setLanguage(langEs, 'int', e.target.id));

function setLanguage(langObj, mode, buttonId) {
    currentLanguage = langObj;
    axisMode = mode;
    switchLanguage(axisMode, currentLanguage);
    styleLanguageButtons(buttonId);
    update();
}

// ECG Toolbar Listeners
view12Btn.addEventListener('click', () => setViewMode('12lead'));
view6Btn.addEventListener('click', () => setViewMode('6lead'));
viewRhythmBtn.addEventListener('click', () => setViewMode('rhythm'));
speed25Btn.addEventListener('click', () => setSpeed(25));
speed50Btn.addEventListener('click', () => setSpeed(50));

function setViewMode(mode) {
    viewMode = mode;
    view12Btn.classList.toggle('active', mode === '12lead');
    view6Btn.classList.toggle('active', mode === '6lead');
    viewRhythmBtn.classList.toggle('active', mode === 'rhythm');
    update();
}

function setSpeed(speed) {
    speedMmPerSec = speed;
    speed25Btn.classList.toggle('active', speed === 25);
    speed50Btn.classList.toggle('active', speed === 50);
    update();
}

// Axis Quiz Button Listeners
document.getElementById('button_it').addEventListener('click', () => checkAxisAnswer('Indifferenztyp', 'de'));
document.getElementById('button_lt').addEventListener('click', () => checkAxisAnswer('Linkstyp', 'de'));
document.getElementById('button_uelt').addEventListener('click', () => checkAxisAnswer('Ueberdrehter Linkstyp', 'de'));
document.getElementById('button_st').addEventListener('click', () => checkAxisAnswer('Steiltyp', 'de'));
document.getElementById('button_rt').addEventListener('click', () => checkAxisAnswer('Rechtstyp', 'de'));
document.getElementById('button_uert').addEventListener('click', () => checkAxisAnswer('Ueberdrehter Rechtstyp', 'de'));

document.getElementById('button_enNormal').addEventListener('click', () => checkAxisAnswer(currentLanguage.typeNormal, 'int'));
document.getElementById('button_enLad').addEventListener('click', () => checkAxisAnswer(currentLanguage.typeLad, 'int'));
document.getElementById('button_enRad').addEventListener('click', () => checkAxisAnswer(currentLanguage.typeRad, 'int'));

document.getElementById('button_ruLad').addEventListener('click', () => checkAxisAnswer(langRu.typeRuLad, 'ru'));
document.getElementById('button_ruHoriz').addEventListener('click', () => checkAxisAnswer(langRu.typeRuHorizontal, 'ru'));
document.getElementById('button_ruNormal').addEventListener('click', () => checkAxisAnswer(langRu.typeRuNormal, 'ru'));
document.getElementById('button_ruVert').addEventListener('click', () => checkAxisAnswer(langRu.typeRuVertical, 'ru'));
document.getElementById('button_ruRad').addEventListener('click', () => checkAxisAnswer(langRu.typeRuRad, 'ru'));

// Quiz Mode Switcher
quizModeAxisBtn.addEventListener('click', () => switchQuizMode('axis'));
quizModePathologyBtn.addEventListener('click', () => switchQuizMode('pathology'));
quizModeTextbookBtn.addEventListener('click', () => switchQuizMode('textbook'));

pathoQuizHintBtn.addEventListener('click', () => {
    const isHidden = pathoQuizHintBox.style.display === 'none' || !pathoQuizHintBox.style.display;
    pathoQuizHintBox.style.display = isHidden ? 'block' : 'none';
});
pathoQuizNextBtn.addEventListener('click', generatePathologyQuizQuestion);
textbookQuizNextBtn.addEventListener('click', () => {
    currentTextbookIdx = (currentTextbookIdx + 1) % TEXTBOOK_TEST_QUESTIONS.length;
    renderTextbookQuestion();
});
textbookQuizCheckBtn.addEventListener('click', submitMultiTextbookAnswer);

// Analysis Drawer Tabs
tabPlanBtn.addEventListener('click', () => {
    activeAnalysisTab = 'plan';
    tabPlanBtn.classList.add('active');
    tabAlgoBtn.classList.remove('active');
    analysisPlanContainer.style.display = 'grid';
    analysisAlgoContainer.style.display = 'none';
});

tabAlgoBtn.addEventListener('click', () => {
    activeAnalysisTab = 'algo';
    tabAlgoBtn.classList.add('active');
    tabPlanBtn.classList.remove('active');
    analysisPlanContainer.style.display = 'none';
    analysisAlgoContainer.style.display = 'flex';
});

function scheduleUpdate() {
    if (pendingRafId) return;
    pendingRafId = requestAnimationFrame(() => {
        pendingRafId = 0;
        update();
    });
}

function scheduleResize() {
    clearTimeout(pendingResizeTimer);
    pendingResizeTimer = setTimeout(() => {
        resizeDivs();
        resizeEcg();
    }, 80);
}

// Cabrera circle drag & wheel listeners
lineright.addEventListener('mousedown', () => { mouseDown = true; }, true);
document.addEventListener('mouseup', () => { mouseDown = false; }, true);
document.addEventListener('mousemove', (event) => {
    if (mouseDown) {
        if (firstMove) {
            deleteRotationAnimation();
            firstMove = false;
        }
        angle = mouseAngle(event, bigCircle);
        scheduleUpdate();
    }
}, true);

bigCircle.addEventListener('wheel', (event) => {
    event.preventDefault();
    angle = normalizeAngle(angle - event.deltaY / 25);
    scheduleUpdate();
}, { passive: false });

lineright.addEventListener('touchstart', () => { mouseDown = true; }, { capture: true, passive: true });
document.addEventListener('touchend', () => { mouseDown = false; }, { capture: true, passive: true });
document.addEventListener('touchcancel', () => { mouseDown = false; }, { capture: true, passive: true });
document.addEventListener('touchmove', (event) => {
    if (mouseDown) {
        event.preventDefault();
        if (firstMove) {
            deleteRotationAnimation();
            firstMove = false;
        }
        angle = mouseAngle(event, bigCircle);
        scheduleUpdate();
    }
}, { passive: false });

window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', scheduleResize);

// Pathology Controls Initialization
function initPathologyControls() {
    // Category tabs
    categoryTabs.innerHTML = '';
    PATHOLOGY_CATEGORIES.forEach((cat) => {
        const btn = document.createElement('button');
        btn.className = 'catBtn';
        btn.dataset.catId = cat.id;
        btn.textContent = cat.ru;
        btn.addEventListener('click', () => {
            selectedCategory = cat.id;
            const items = PATHOLOGIES.filter((p) => p.category === selectedCategory);
            if (items.length && !items.some((p) => p.id === selectedPathologyId)) {
                selectPathology(items[0].id);
            } else {
                renderPathologyList();
            }
        });
        categoryTabs.appendChild(btn);
    });

    // MI Stage select
    MI_STAGES.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.ru;
        miStageSelect.appendChild(opt);
    });
    miStageSelect.value = pathologyOptions.miStage;
    miStageSelect.addEventListener('change', () => {
        pathologyOptions.miStage = miStageSelect.value;
        update();
    });

    // MI Depth select
    MI_DEPTHS.forEach((d) => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.ru;
        miDepthSelect.appendChild(opt);
    });
    miDepthSelect.value = pathologyOptions.miDepth;
    miDepthSelect.addEventListener('change', () => {
        pathologyOptions.miDepth = miDepthSelect.value;
        update();
    });

    // Localization select
    MI_LOCALIZATIONS.forEach((l) => {
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = l.ru;
        localizationSelect.appendChild(opt);
    });
    localizationSelect.value = pathologyOptions.localization;
    localizationSelect.addEventListener('change', () => {
        pathologyOptions.localization = localizationSelect.value;
        update();
    });

    // HR & Axis sliders
    hrSlider.addEventListener('input', () => {
        pathologyOptions.hr = Number(hrSlider.value);
        scheduleUpdate();
    });

    axisSlider.addEventListener('input', () => {
        angle = normalizeAngle(Number(axisSlider.value));
        scheduleUpdate();
    });

    selectPathology('sinus_tachycardia');
}

function selectPathology(id) {
    selectedPathologyId = id;
    const p = getPathologyById(id);
    selectedCategory = p.category;
    pathologyOptions.hr = p.defaultHr;
    if (p.defaultAngle !== undefined) {
        angle = normalizeAngle(p.defaultAngle);
    }
    if (p.defaultLocalization) {
        pathologyOptions.localization = p.defaultLocalization;
        localizationSelect.value = p.defaultLocalization;
    }
    if (p.defaultStage) {
        pathologyOptions.miStage = p.defaultStage;
        miStageSelect.value = p.defaultStage;
    }
    if (p.defaultDepth) {
        pathologyOptions.miDepth = p.defaultDepth;
        miDepthSelect.value = p.defaultDepth;
    }

    renderPathologyList();
    update();
}

function renderPathologyList() {
    document.querySelectorAll('.catBtn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.catId === selectedCategory);
    });

    pathologyList.innerHTML = '';
    PATHOLOGIES.filter((p) => p.category === selectedCategory).forEach((p) => {
        const btn = document.createElement('button');
        btn.className = 'pathoItemBtn' + (p.id === selectedPathologyId ? ' active' : '');
        btn.textContent = p.ru;
        btn.addEventListener('click', () => selectPathology(p.id));
        pathologyList.appendChild(btn);
    });

    const currentP = getPathologyById(selectedPathologyId);
    selectedPathologyTitle.textContent = currentP.ru;

    if (currentP.fixedHr) {
        hrControlRow.style.display = 'none';
    } else {
        hrControlRow.style.display = 'flex';
        const [minHr, maxHr] = currentP.hrRange || [30, 200];
        hrSlider.min = minHr;
        hrSlider.max = maxHr;
        hrSlider.value = pathologyOptions.hr;
    }

    axisControlRow.style.display = (currentP.id === 'v_flutter' || currentP.id === 'v_fib') ? 'none' : 'flex';
    miStageRow.style.display = currentP.supportsMiStage ? 'flex' : 'none';
    miDepthRow.style.display = currentP.supportsMiDepth ? 'flex' : 'none';
    localizationRow.style.display = currentP.supportsLocalization ? 'flex' : 'none';

    criteriaList.innerHTML = '';
    currentP.criteriaRu.forEach((c) => {
        const li = document.createElement('li');
        li.textContent = c;
        criteriaList.appendChild(li);
    });
    clinicalNote.textContent = currentP.noteRu;
}

// Section Switching
function switchSection(target, pushHistory = true) {
    if (currentSection === target) return;
    if (pushHistory) {
        sectionHistory.push(currentSection);
        if (sectionHistory.length > 20) sectionHistory.shift();
    }
    currentSection = target;

    cabrera.style.display = target === 'cabrera' ? '' : 'none';
    pathologiesPanel.style.display = target === 'pathologies' ? 'flex' : 'none';
    quiz.style.display = target === 'quiz' ? 'flex' : 'none';
    about.style.display = target === 'about' ? 'block' : 'none';
    ecg.style.display = target === 'about' ? 'none' : 'flex';
    analysisSection.style.display = target === 'pathologies' ? 'block' : 'none';

    buttonCabrera.style.color = target === 'cabrera' ? 'var(--activeButton)' : '';
    buttonPathologies.style.color = target === 'pathologies' ? 'var(--activeButton)' : '';
    buttonQuiz.style.color = target === 'quiz' ? 'var(--activeButton)' : '';
    buttonAbout.style.color = target === 'about' ? 'var(--activeButton)' : '';
    split.style.padding = target === 'about' ? '1rem 1rem' : '';

    if (target === 'pathologies' && viewMode === '6lead') {
        setViewMode('12lead');
    } else if (target === 'cabrera' && viewMode !== '6lead') {
        setViewMode('6lead');
    }

    if (target === 'quiz') {
        displayCorrect.classList.remove('animateCorrect');
        displayWrong.classList.remove('animateWrong');
        if (currentQuizMode === 'axis') {
            newAxisEcg();
        } else if (currentQuizMode === 'pathology' && !currentPathoQuestion) {
            generatePathologyQuizQuestion();
        } else if (currentQuizMode === 'textbook') {
            renderTextbookQuestion();
        }
    }

    resizeDivs();
    resizeEcg();
}

function switchQuizMode(mode) {
    currentQuizMode = mode;
    quizModeAxisBtn.classList.toggle('active', mode === 'axis');
    quizModePathologyBtn.classList.toggle('active', mode === 'pathology');
    quizModeTextbookBtn.classList.toggle('active', mode === 'textbook');

    axisQuizContainer.style.display = mode === 'axis' ? 'flex' : 'none';
    pathologyQuizContainer.style.display = mode === 'pathology' ? 'flex' : 'none';
    textbookQuizContainer.style.display = mode === 'textbook' ? 'flex' : 'none';
    ecg.style.display = mode === 'textbook' ? 'none' : 'flex';

    if (mode === 'axis') {
        setViewMode('6lead');
        newAxisEcg();
    } else if (mode === 'pathology') {
        setViewMode('12lead');
        generatePathologyQuizQuestion();
    } else {
        renderTextbookQuestion();
    }
    resizeEcg();
}

// Active ECG State Selector depending on current section
function getCurrentEcgState() {
    if (currentSection === 'pathologies') {
        return computeEcgState(angle, selectedPathologyId, pathologyOptions);
    }
    if (currentSection === 'quiz' && currentQuizMode === 'pathology' && currentPathoQuestion) {
        return currentPathoQuestion.ecgState;
    }
    // Axis trainer & Axis quiz use clean normal sinus rhythm at current angle
    return computeEcgState(angle, 'normal_sinus', { hr: 72 });
}

// Main Update
function update() {
    const ecgState = getCurrentEcgState();

    // Update Cabrera circle UI
    line.style.transform = `rotate(${angle}deg)`;
    updateDropShadow(line, angle);
    if (axisMode === 'ru') {
        styleCircleRu(angle);
    } else if (axisMode === 'int') {
        styleCircleInt(angle);
    } else {
        styleCircleDe(angle);
    }
    const clinDeg = Math.round(toClinicalAngle(angle));
    const clinStr = clinDeg > 0 ? `+${clinDeg}` : `${clinDeg}`;
    displayLagetyp.innerHTML = `${lagetyp(angle, axisMode === 'int', currentLanguage, axisMode)}<br>${clinStr}&deg;`;

    // Axis algebraic sums display
    if (axisMetricsBar) {
        const netI = ecgState.leads.I.qrsNet;
        const netIII = ecgState.leads.III.qrsNet;
        axisMetricsBar.innerHTML = `
            <span class="axisMetricPill">α = ${clinStr}°</span>
            <span class="axisMetricPill">ΣQRS (I) = ${netI > 0 ? '+' : ''}${netI} мм</span>
            <span class="axisMetricPill">ΣQRS (III) = ${netIII > 0 ? '+' : ''}${netIII} мм</span>
        `;
    }

    // Update Pathology controls readouts
    if (currentSection === 'pathologies') {
        hrValueLabel.textContent = `${pathologyOptions.hr} уд/мин`;
        axisSlider.value = clinDeg;
        axisValueLabel.textContent = `${clinStr}° (${lagetyp(angle, false, langRu, 'ru')})`;
        renderAnalysisSection(ecgState);
    }

    // Draw ECG
    drawEcgState(ctxEcg, ctxGrid, ecgState, ecgCanvas.width, ecgCanvas.height, {
        viewMode,
        speedMmPerSec,
        dpr,
        rhythmLabel: currentLanguage.rhythmLabel || 'II (ритм)'
    });
}

function renderAnalysisSection(ecgState) {
    const plan = buildAnalysisPlan(ecgState, langRu);
    analysisPlanContainer.innerHTML = '';
    plan.forEach((step) => {
        const div = document.createElement('div');
        div.className = 'analysisStep' + (step.abnormal ? ' abnormal' : '') + (step.isConclusion ? ' conclusion' : '');
        div.innerHTML = `<span class="analysisStepNum">${step.num}. ${step.label}:</span> ${step.value}`;
        analysisPlanContainer.appendChild(div);
    });

    const algo = traceDiagnosticAlgorithm(ecgState);
    analysisAlgoContainer.innerHTML = `
        <div class="algoFlowSteps">
            ${algo.steps.map((s, idx) => `
                ${idx > 0 ? '<span class="algoArrow">→</span>' : ''}
                <div class="algoNodeCard highlight">
                    <span>${s.node}</span>
                    <small style="color:var(--activeButton);">Ответ: ${s.answer}</small>
                </div>
            `).join('')}
            <span class="algoArrow">→</span>
            <div class="algoResultBadge">${algo.conclusion}</div>
        </div>
        <div class="algoLegend">
            <strong>Примечания к алгоритму (рис. 5.1, стр. 76):</strong>
            * зубец P положительный и присутствует перед большинством комплексов QRS;
            ** при трепетании предсердий интервалы RR могут быть как одинаковыми, так и разными (главный признак — волны FF «зубья пилы»);
            при расширении QRS &gt; 0,10 с проверка на гипертрофию желудочков не проводится.
        </div>
    `;
}

function deleteRotationAnimation() {
    lineright.style.backgroundImage = 'none';
    lineright.style.animationIterationCount = 0;
}

function resizeDivs() {
    containerDivs.forEach((e) => {
        if (e.id === 'pathologies' || e.id === 'quiz' || e.id === 'cabrera') return;
        const width = e.offsetWidth;
        if (width > 0) {
            e.style.height = width + 'px';
        }
    });
}

function resizeEcg() {
    const width = ecg.clientWidth;
    if (width <= 0) return;
    dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const toolbarH = document.getElementById('ecgToolbar').offsetHeight || 28;
    const isShortLandscape = window.innerWidth > window.innerHeight && window.innerHeight <= 560;
    const canvasH = isShortLandscape
        ? Math.min(Math.max(width * 0.72, 260), Math.max(window.innerHeight - toolbarH - 60, 260))
        : Math.max(width, 320);

    ecgCanvasBox.style.height = `${canvasH}px`;
    ecgCanvas.width = dpr * width;
    gridCanvas.width = dpr * width;
    ecgCanvas.height = dpr * canvasH;
    gridCanvas.height = dpr * canvasH;
    ecgCanvas.style.width = `${width}px`;
    ecgCanvas.style.height = `${canvasH}px`;
    gridCanvas.style.width = `${width}px`;
    gridCanvas.style.height = `${canvasH}px`;
    ecg.style.height = `${canvasH + toolbarH + 10}px`;

    update();
}

const degToRad = (deg) => (deg * Math.PI) / 180;

const updateDropShadow = (e, deg) => {
    const distance = 0.3;
    const shadowAngle = 45;
    const offsetY = Math.sin(degToRad(shadowAngle - deg)) * distance;
    const offsetX = Math.cos(degToRad(shadowAngle - deg)) * distance;
    e.style.filter = `drop-shadow(${offsetX}rem ${offsetY}rem 0.1rem rgba(0, 0, 0, 0.5))`;
};

const styleCircleParts = (active, parts) => {
    parts.forEach((part) => {
        part.style.filter = active === part ? 'saturate(5)' : 'saturate(1)';
    });
};

const styleCircleDe = (degree) => {
    if (degree >= 30 && degree < 60) {
        styleCircleParts(it, circleParts);
        displayLagetyp.style.backgroundColor = 'var(--it)';
    } else if (degree >= 60 && degree < 90) {
        styleCircleParts(st, circleParts);
        displayLagetyp.style.backgroundColor = 'var(--st)';
    } else if (degree >= 90 && degree < 120) {
        styleCircleParts(rt, circleParts);
        displayLagetyp.style.backgroundColor = 'var(--rt)';
    } else if (degree >= 120 && degree < 180) {
        styleCircleParts(uert, circleParts);
        displayLagetyp.style.backgroundColor = 'var(--uert)';
    } else if (degree >= 180 && degree < 270) {
        styleCircleParts(nwt, circleParts);
        displayLagetyp.style.backgroundColor = 'var(--nwt)';
    } else if (degree >= 270 && degree < 330) {
        styleCircleParts(uelt, circleParts);
        displayLagetyp.style.backgroundColor = 'var(--uelt)';
    } else {
        styleCircleParts(lt, circleParts);
        displayLagetyp.style.backgroundColor = 'var(--lt)';
    }
};

const styleCircleInt = (degree) => {
    if (degree >= 90 && degree < 180) {
        styleCircleParts(enRad, circlePartsEn);
        displayLagetyp.style.backgroundColor = 'var(--st)';
    } else if (degree >= 180 && degree < 270) {
        styleCircleParts(enNwt, circlePartsEn);
        displayLagetyp.style.backgroundColor = 'var(--uert)';
    } else if (degree >= 270 && degree < 330) {
        styleCircleParts(enLad, circlePartsEn);
        displayLagetyp.style.backgroundColor = 'var(--lt)';
    } else {
        styleCircleParts(enNormal, circlePartsEn);
        displayLagetyp.style.backgroundColor = 'var(--it)';
    }
};

const styleCircleRu = (degree) => {
    const norm = degree === 360 ? 0 : degree;
    if (norm >= 30 && norm < 70) {
        styleCircleParts(ruNormal, circlePartsRu);
        displayLagetyp.style.backgroundColor = 'var(--it)';
    } else if (norm >= 0 && norm < 30) {
        styleCircleParts(ruHoriz, circlePartsRu);
        displayLagetyp.style.backgroundColor = 'hsl(168, 72%, 76%)';
    } else if (norm >= 70 && norm <= 90) {
        styleCircleParts(ruVert, circlePartsRu);
        displayLagetyp.style.backgroundColor = 'var(--st)';
    } else if (norm > 90 && norm <= 180) {
        styleCircleParts(ruRad, circlePartsRu);
        displayLagetyp.style.backgroundColor = 'var(--rt)';
    } else if (norm > 180 && norm < 270) {
        styleCircleParts(ruNwt, circlePartsRu);
        displayLagetyp.style.backgroundColor = 'var(--nwt)';
    } else {
        styleCircleParts(ruLad, circlePartsRu);
        displayLagetyp.style.backgroundColor = 'var(--lt)';
    }
};

// Quiz Logic
function recordAnswer(isCorrect) {
    if (isCorrect) {
        answersCorrect += 1;
        displayCorrect.classList.remove('animateCorrect');
        void displayCorrect.offsetWidth;
        displayCorrect.classList.add('animateCorrect');
        displayAnswersCorrect.textContent = answersCorrect;
    } else {
        answersWrong += 1;
        displayWrong.classList.remove('animateWrong');
        void displayWrong.offsetWidth;
        displayWrong.classList.add('animateWrong');
        displayAnswersWrong.textContent = answersWrong;
    }
}

function checkAxisAnswer(answer, mode) {
    const expected = lagetyp(angle, mode === 'int', currentLanguage, mode);
    const isCorrect = expected === answer;
    recordAnswer(isCorrect);
    if (isCorrect) {
        newAxisEcg();
    }
}

function newAxisEcg() {
    angle = getRandomAxis();
    update();
}

function getRandomAxis() {
    let degree = 0;
    do {
        degree = Math.floor(Math.random() * 360);
    } while (
        (degree >= 170 && degree < 280) ||
        (degree > 320 && degree < 340) ||
        (degree > 355 || degree < 5) ||
        (degree > 20 && degree < 35) ||
        (degree > 55 && degree < 75) ||
        (degree > 85 && degree < 95) ||
        (degree > 115 && degree < 130)
    );
    return degree;
}

function generatePathologyQuizQuestion() {
    pathoQuizAnswered = false;
    pathoQuizFeedback.style.display = 'none';
    pathoQuizHintBox.style.display = 'none';

    const pool = PATHOLOGIES;
    const target = pool[Math.floor(Math.random() * pool.length)];

    // Randomize localization/stage for MI/ischemia to train all cases
    const loc = MI_LOCALIZATIONS[Math.floor(Math.random() * MI_LOCALIZATIONS.length)].id;
    const stages = ['hyperacute', 'acute', 'subacute', 'scar'];
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const depth = Math.random() > 0.5 ? 'transmural' : 'subendocardial';
    const qAngle = normalizeAngle(target.defaultAngle ?? 45);
    const ecgState = computeEcgState(qAngle, target.id, {
        hr: target.defaultHr,
        localization: loc,
        miStage: stage,
        miDepth: depth
    });

    // Pick 3 distractors
    const others = pool.filter((p) => p.id !== target.id);
    const shuffledOthers = others.sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [target, ...shuffledOthers].sort(() => Math.random() - 0.5);

    currentPathoQuestion = { target, ecgState, options };

    // Build hint without revealing pathology name
    const plan = buildAnalysisPlan(ecgState, langRu).slice(0, 11);
    pathoQuizHintBox.innerHTML = plan
        .map((s) => `<div><strong>${s.num}. ${s.label}:</strong> ${s.value}</div>`)
        .join('');

    pathoQuizOptions.innerHTML = '';
    options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'quizOptionBtn';
        btn.textContent = opt.ru;
        btn.addEventListener('click', () => handlePathologyQuizChoice(opt.id, btn));
        pathoQuizOptions.appendChild(btn);
    });

    update();
}

function handlePathologyQuizChoice(chosenId, clickedBtn) {
    if (pathoQuizAnswered || !currentPathoQuestion) return;
    pathoQuizAnswered = true;

    const { target, ecgState } = currentPathoQuestion;
    const isCorrect = chosenId === target.id;
    recordAnswer(isCorrect);

    Array.from(pathoQuizOptions.children).forEach((btn) => {
        btn.disabled = true;
        if (btn.textContent === target.ru) {
            btn.classList.add('isCorrect');
        } else if (btn === clickedBtn && !isCorrect) {
            btn.classList.add('isWrong');
        }
    });

    const plan = buildAnalysisPlan(ecgState, langRu);
    const conclusionLine = plan[plan.length - 1].value;
    pathoQuizFeedback.className = `quizFeedbackBox ${isCorrect ? 'correct' : 'wrong'}`;
    pathoQuizFeedback.style.display = 'block';
    pathoQuizFeedback.innerHTML = `
        <strong>${isCorrect ? 'Верно!' : 'Неверно.'}</strong> ${conclusionLine}<br>
        <ul class="criteriaList" style="margin-top:0.3rem;">
            ${target.criteriaRu.map((c) => `<li>${c}</li>`).join('')}
        </ul>
    `;
}

function renderTextbookQuestion() {
    textbookQuizAnswered = false;
    selectedTextbookIndices.clear();
    const q = TEXTBOOK_TEST_QUESTIONS[currentTextbookIdx];
    const isMulti = q.correctIndices.length > 1;

    textbookQuizPrompt.innerHTML = `
        <div style="font-size:0.72rem; color:var(--activeButton); font-weight:700;">
            ${q.chapter} · Вопрос ${currentTextbookIdx + 1} из ${TEXTBOOK_TEST_QUESTIONS.length}
        </div>
        <div style="margin-top:0.25rem; font-weight:700;">${q.question}</div>
    `;
    textbookQuizFeedback.style.display = 'none';
    textbookQuizCheckBtn.style.display = isMulti ? 'inline-block' : 'none';

    textbookQuizOptions.innerHTML = '';
    q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quizOptionBtn';
        btn.textContent = `${idx + 1}) ${optText}`;
        btn.addEventListener('click', () => {
            if (textbookQuizAnswered) return;
            if (isMulti) {
                if (selectedTextbookIndices.has(idx)) {
                    selectedTextbookIndices.delete(idx);
                    btn.style.outline = '';
                    btn.style.background = '';
                } else {
                    selectedTextbookIndices.add(idx);
                    btn.style.outline = '2px solid var(--activeButton)';
                    btn.style.background = '#fff7ed';
                }
            } else {
                selectedTextbookIndices = new Set([idx]);
                evaluateTextbookAnswer();
            }
        });
        textbookQuizOptions.appendChild(btn);
    });
}

function submitMultiTextbookAnswer() {
    if (textbookQuizAnswered || selectedTextbookIndices.size === 0) return;
    evaluateTextbookAnswer();
}

function evaluateTextbookAnswer() {
    textbookQuizAnswered = true;
    const q = TEXTBOOK_TEST_QUESTIONS[currentTextbookIdx];
    const expected = new Set(q.correctIndices);
    const isCorrect =
        expected.size === selectedTextbookIndices.size &&
        [...expected].every((x) => selectedTextbookIndices.has(x));

    recordAnswer(isCorrect);

    Array.from(textbookQuizOptions.children).forEach((btn, idx) => {
        btn.disabled = true;
        btn.style.outline = '';
        if (expected.has(idx)) {
            btn.classList.add('isCorrect');
        } else if (selectedTextbookIndices.has(idx)) {
            btn.classList.add('isWrong');
        }
    });

    textbookQuizFeedback.className = `quizFeedbackBox ${isCorrect ? 'correct' : 'wrong'}`;
    textbookQuizFeedback.style.display = 'block';
    textbookQuizFeedback.innerHTML = `<strong>${isCorrect ? 'Верно!' : 'Неверно.'}</strong> ${q.explanation}`;
}

// Language Helpers
function switchLanguage(mode, language) {
    langButtons(mode);
    langCabrera(mode);
    langFillContent(language);
}

function styleLanguageButtons(activeId) {
    [buttonLangRu, buttonLangDe, buttonLangEn, buttonLangEs].forEach((b) => {
        b.classList.remove('langButtonActive');
    });
    document.getElementById(activeId).classList.add('langButtonActive');
}

function langButtons(mode) {
    document.querySelectorAll('button.answer.de').forEach((el) => {
        el.style.display = mode === 'de' ? 'block' : 'none';
    });
    document.querySelectorAll('button.answer.en').forEach((el) => {
        el.style.display = mode === 'int' ? 'block' : 'none';
    });
    document.querySelectorAll('button.answer.ru').forEach((el) => {
        el.style.display = mode === 'ru' ? 'block' : 'none';
    });
}

function langCabrera(mode) {
    circleDe.style.display = mode === 'de' ? 'block' : 'none';
    circleInt.style.display = mode === 'int' ? 'block' : 'none';
    circleRu.style.display = mode === 'ru' ? 'block' : 'none';
}

function langFillContent(language) {
    document.querySelector('h1').innerHTML = language.title;
    buttonCabrera.innerHTML = language.navCabrera;
    buttonPathologies.innerHTML = language.navPathologies;
    buttonQuiz.innerHTML = language.navQuiz;
    buttonAbout.innerHTML = language.navAbout;
    labelCorrect.innerHTML = language.quizCorrect;
    labelWrong.innerHTML = language.quizWrong;
    sectionGeneral.innerHTML = language.aboutGeneral;
    sectionSources.innerHTML = language.aboutSources;
    if (language.typeNormal) {
        document.getElementById('button_enNormal').innerHTML = language.typeNormal;
        document.getElementById('button_enLad').innerHTML = language.typeLad;
        document.getElementById('button_enRad').innerHTML = language.typeRad;
    }
}

function handleBackButton() {
    if (pathoQuizHintBox && pathoQuizHintBox.style.display === 'block') {
        pathoQuizHintBox.style.display = 'none';
        return true;
    }
    if (currentSection === 'quiz' && currentQuizMode !== 'axis') {
        switchQuizMode('axis');
        return true;
    }
    if (currentSection === 'pathologies' && activeAnalysisTab !== 'plan') {
        tabPlanBtn.click();
        return true;
    }
    if (sectionHistory.length > 0) {
        const prev = sectionHistory.pop();
        switchSection(prev, false);
        return true;
    }
    if (currentSection !== 'cabrera') {
        switchSection('cabrera', false);
        return true;
    }
    return false;
}

EcgApp.navigation = {
    handleBackButton,
    switchSection
};

// Startup
function initApp() {
    initPathologyControls();
    angle = 45;
    setViewMode('6lead');
    setSpeed(25);

    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('de')) {
        axisMode = 'de';
        currentLanguage = langDe;
        styleLanguageButtons('button_de');
    } else if (navLang.startsWith('es')) {
        axisMode = 'int';
        currentLanguage = langEs;
        styleLanguageButtons('button_es');
    } else {
        axisMode = 'ru';
        currentLanguage = langRu;
        styleLanguageButtons('button_ru');
    }

    switchLanguage(axisMode, currentLanguage);
    buttonCabrera.style.color = 'var(--activeButton)';
    resizeDivs();
    resizeEcg();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
})(typeof globalThis !== 'undefined' ? globalThis : window);
