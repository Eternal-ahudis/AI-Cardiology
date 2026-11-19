/**
 * @file Implements the 12-point ECG Analysis Plan (Chapter 5.1)
 * and Diagnostic Algorithm path tracer (Figure 5.1) from the textbook.
 */

(function (root) {
    const EcgApp = (root.EcgApp = root.EcgApp || {});
    const { lagetyp } = EcgApp.calculations;

/**
 * Traces the path through the textbook's ECG rhythm & conduction algorithm (Fig. 5.1, p. 76).
 * @param {object} ecgState
 * @returns {{ path: string[], steps: Array<{node: string, answer: string}>, conclusion: string }}
 */
function traceDiagnosticAlgorithm(ecgState) {
    const { pathologyId, pathology } = ecgState;

    const presets = {
        normal_sinus: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'qrs_ok_2'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'да' },
                { node: 'СР (синусовый ритм)', answer: 'да' },
                { node: 'PQ ≤ 0,2 с?', answer: 'да' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'да (норма)' }
            ],
            conclusion: 'Нормальный синусовый ритм'
        },
        sinus_tachycardia: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'qrs_ok_2'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'да' },
                { node: 'СР (ЧСС > 80 уд/мин)', answer: 'да' },
                { node: 'PQ ≤ 0,2 с?', answer: 'да' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'да' }
            ],
            conclusion: 'Синусовая тахикардия'
        },
        sinus_bradycardia: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'qrs_ok_2'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'да' },
                { node: 'СР (ЧСС < 60 уд/мин)', answer: 'да' },
                { node: 'PQ ≤ 0,2 с?', answer: 'да' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'да' }
            ],
            conclusion: 'Синусовая брадикардия'
        },
        sinus_arrhythmia: {
            path: ['rr_equal', 'p_present_irreg', 'qrs_ok_1', 'sr'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'нет (разница > 0,1 с)' },
                { node: 'Волны FF «зубья пилы»?', answer: 'нет' },
                { node: 'з. P есть?*', answer: 'да (перед всеми QRS)' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'да (нет преждевременных ЭС)' }
            ],
            conclusion: 'Синусовая аритмия'
        },
        afib: {
            path: ['rr_equal', 'ff_waves', 'p_present_irreg', 'fp'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'нет' },
                { node: 'Волны FF «зубья пилы»?', answer: 'нет (волны ff)' },
                { node: 'з. P есть?*', answer: 'нет' }
            ],
            conclusion: 'ФП — фибрилляция предсердий'
        },
        aflutter: {
            path: ['rr_equal', 'ff_waves', 'tp'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да / нет**' },
                { node: 'Волны FF «зубья пилы»?', answer: 'да' }
            ],
            conclusion: 'ТП — трепетание предсердий'
        },
        pac: {
            path: ['rr_equal', 'ff_waves', 'p_present_irreg', 'qrs_ok_1', 'pes'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'нет' },
                { node: 'Волны FF «зубья пилы»?', answer: 'нет' },
                { node: 'з. P есть?*', answer: 'да (перед большинством QRS)' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'да' }
            ],
            conclusion: 'ПЭС — предсердная экстрасистолия'
        },
        pvc_single: {
            path: ['rr_equal', 'ff_waves', 'p_present_irreg', 'qrs_ok_1', 'zhes'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'нет' },
                { node: 'Волны FF «зубья пилы»?', answer: 'нет' },
                { node: 'з. P есть?*', answer: 'да (перед большинством QRS)' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'нет (QRS ЭС > 0,1 с)' }
            ],
            conclusion: 'ЖЭС — желудочковая экстрасистолия'
        },
        svt: {
            path: ['rr_equal', 'p_present_reg', 'qrs_ok_reg_nop', 'nzht'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'нет (сливается с T)' },
                { node: 'QRS ≤ 0,1 с?', answer: 'да' }
            ],
            conclusion: 'НЖТ — пароксизмальная наджелудочковая тахикардия'
        },
        vt: {
            path: ['rr_equal', 'p_present_reg', 'qrs_ok_reg_nop', 'zht'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'нет' },
                { node: 'QRS ≤ 0,1 с?', answer: 'нет (QRS > 0,12 с)' }
            ],
            conclusion: 'ЖТ — пароксизмальная желудочковая тахикардия'
        },
        avb_1: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'avb', 'av_rr_equal', 'p_eq_qrs', 'avb1'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'да → СР' },
                { node: 'PQ ≤ 0,2 с?', answer: 'нет → АВ-блокада' },
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'Кол-во P = QRS?', answer: 'да' }
            ],
            conclusion: 'АВ-блокада I степени'
        },
        avb_2_mobitz1: {
            path: ['rr_equal', 'p_present_irreg', 'avb', 'av_rr_equal', 'avb2'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'нет' },
                { node: 'з. P есть?*', answer: 'да (часть блокирована)' },
                { node: 'PQ ≤ 0,2 с? / АВ-блокада', answer: 'нет (PQ нарастает 0,18→0,34 с)' },
                { node: 'Инт. RR одинаковы?', answer: 'нет → АВ-бл. II ст.' }
            ],
            conclusion: 'АВ-блокада II степени (Мобитц I, периодика Самойлова — Венкебаха)'
        },
        avb_2_mobitz2: {
            path: ['rr_equal', 'p_present_irreg', 'avb', 'av_rr_equal', 'avb2'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'нет (паузы при выпадении QRS)' },
                { node: 'з. P есть?*', answer: 'да (часть блокирована)' },
                { node: 'АВ-блокада', answer: 'да (выпадение QRS при постоянном PQ)' },
                { node: 'Инт. RR одинаковы?', answer: 'нет → АВ-бл. II ст.' }
            ],
            conclusion: 'АВ-блокада II степени (Мобитц II)'
        },
        avb_3: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'avb', 'av_rr_equal', 'p_eq_qrs', 'avb3'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да (ритм желудочков регулярен)' },
                { node: 'з. P есть?*', answer: 'да (независимый ритм)' },
                { node: 'PQ ≤ 0,2 с?', answer: 'нет (АВ-диссоциация) → АВ-блокада' },
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'Кол-во P = QRS?', answer: 'нет (P > QRS)' }
            ],
            conclusion: 'АВ-блокада III степени (полная поперечная блокада)'
        },
        rbbb: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'qrs_ok_2', 'pbnpg', 'rbbb'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'да → СР' },
                { node: 'PQ ≤ 0,2 с?', answer: 'да' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'нет → ПБНПГ' },
                { node: 'М-образный R?', answer: 'в правых грудных (V1–V2)' }
            ],
            conclusion: 'БПравойНПГ — полная блокада правой ножки пучка Гиса'
        },
        lbbb: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'qrs_ok_2', 'pbnpg', 'lbbb'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'да → СР' },
                { node: 'PQ ≤ 0,2 с?', answer: 'да' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'нет → ПБНПГ' },
                { node: 'М-образный R?', answer: 'в левых грудных (V5–V6)' }
            ],
            conclusion: 'БЛевойНПГ — полная блокада левой ножки пучка Гиса'
        },
        pericarditis_acute: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'qrs_ok_2', 'pericarditis_acute'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'да → СР' },
                { node: 'PQ ≤ 0,2 с?', answer: 'да (депрессия сегмента PR в отведениях I, II, aVF, V2–V6 и элевация в aVR)' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'да' },
                { node: 'Патологический зубец Q?', answer: 'нет (некроз миокарда отсутствует)' },
                { node: 'Характер элевации ST?', answer: 'диффузный вогнутый (седловидный) подъём ST без зеркальной депрессии (депрессия только в aVR)' }
            ],
            conclusion: 'Острый перикардит (Стадия I)'
        },
        pericarditis_stage2: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'qrs_ok_2', 'pericarditis_stage2'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'да → СР' },
                { node: 'PQ ≤ 0,2 с?', answer: 'да' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'да' },
                { node: 'Сегмент ST', answer: 'возврат к изолинии во всех отведениях' },
                { node: 'Зубец T', answer: 'уплощён в большинстве отведений' }
            ],
            conclusion: 'Перикардит: возврат ST к изолинии (Стадия II)'
        },
        pericarditis_stage3: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'qrs_ok_2', 'pericarditis_stage3'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'да → СР' },
                { node: 'PQ ≤ 0,2 с?', answer: 'да' },
                { node: 'все QRS ≤ 0,1 с?', answer: 'да' },
                { node: 'Сегмент ST', answer: 'строго на изолинии (элевация отсутствует)' },
                { node: 'Зубец T', answer: 'диффузно инвертирован (отрицательный) после нормализации ST' }
            ],
            conclusion: 'Перикардит: инверсия зубцов T (Стадия III)'
        },
        pericarditis_effusion: {
            path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'qrs_ok_2', 'pericarditis_effusion'],
            steps: [
                { node: 'Инт. RR одинаковы?', answer: 'да' },
                { node: 'з. P есть?*', answer: 'да → СР (синусовая тахикардия)' },
                { node: 'Вольтаж QRS', answer: 'диффузный микровольтаж (< 5 мм от конечностей, < 10 мм в грудных)' },
                { node: 'Динамика амплитуды QRS', answer: 'электрическая альтернация (ритмичное колебание амплитуды комплексов QRS через сокращение)' }
            ],
            conclusion: 'Перикардиальный выпот / тампонада сердца'
        }
    };

    if (presets[pathologyId]) return presets[pathologyId];
    if (['pvc_bigeminy', 'pvc_trigeminy', 'pvc_paired_poly'].includes(pathologyId)) {
        return { ...presets.pvc_single, conclusion: pathology.ru };
    }
    if (pathologyId === 'v_flutter' || pathologyId === 'v_fib') {
        return {
            path: ['vf'],
            steps: [
                { node: 'Комплексы QRS дифференцируются?', answer: 'нет, изоэлектрическая линия отсутствует' },
                { node: 'Характер осцилляций', answer: pathologyId === 'v_flutter' ? 'синусоида ~300/мин' : 'хаотичные волны 400–600/мин' }
            ],
            conclusion: pathology.ru
        };
    }

    // Hypertrophies & coronary insufficiency follow normal rhythm path on Fig. 5.1,
    // and deviations are found in steps 5, 8, 9, 10, 11 of the 12-point plan.
    return {
        path: ['rr_equal', 'p_present_reg', 'sr', 'pq_ok', 'qrs_ok_2'],
        steps: [
            { node: 'Инт. RR одинаковы?', answer: 'да' },
            { node: 'з. P есть?*', answer: 'да → СР' },
            { node: 'PQ ≤ 0,2 с?', answer: 'да' },
            { node: 'все QRS ≤ 0,1 с?', answer: 'да (отклонения в зубцах P, Q, R/S, сегменте ST или T)' }
        ],
        conclusion: pathology.ru
    };
}

/**
 * Generates the 12-point ECG Analysis Plan matching Chapter 5.1 (pp. 74–85).
 * @param {object} ecgState
 * @param {object} languageRu Russian language object (or any language with Russian axis names)
 */
function buildAnalysisPlan(ecgState, languageRu) {
    const { pathologyId, pathology, clinicalAngle, angle, hr, timeline, leads, localizationObj, stageObj, options } = ecgState;
    const leadII = leads.II;
    const leadI = leads.I;
    const leadIII = leads.III;
    const leadV1 = leads.V1;
    const leadV2 = leads.V2;
    const leadV5 = leads.V5;
    const leadV6 = leads.V6;

    // 1. Rhythm source
    let rhythmText = 'синусовый (чёткий одинаковый зубец P перед каждым QRS с постоянным PQ)';
    if (['afib', 'aflutter', 'svt', 'vt', 'v_flutter', 'v_fib'].includes(pathologyId)) {
        rhythmText = 'несинусовый (зубец P отсутствует)';
    } else if (pathologyId === 'avb_3') {
        rhythmText = 'независимый ритм предсердий (синусовый) и желудочков (АВ-диссоциация)';
    } else if (['pac', 'pvc_single', 'pvc_bigeminy', 'pvc_trigeminy', 'pvc_paired_poly'].includes(pathologyId)) {
        rhythmText = 'синусовый с преждевременными внеочередными комплексами (экстрасистолами)';
    } else if (pathologyId === 'avb_2_mobitz1' || pathologyId === 'avb_2_mobitz2') {
        rhythmText = 'синусовый с периодическим блокированием проведения на желудочки';
    }

    // 2. Regularity
    const rrList = timeline.rrList || [];
    const rrMin = rrList.length ? Math.min(...rrList) : 60 / hr;
    const rrMax = rrList.length ? Math.max(...rrList) : 60 / hr;
    const rrDiff = Number((rrMax - rrMin).toFixed(2));
    const isIrregular = rrDiff > 0.1 || ['afib', 'sinus_arrhythmia', 'pac', 'pvc_single', 'pvc_bigeminy', 'pvc_trigeminy', 'pvc_paired_poly', 'avb_2_mobitz1', 'avb_2_mobitz2', 'v_fib'].includes(pathologyId);
    const regularityText = pathologyId === 'v_flutter' || pathologyId === 'v_fib'
        ? 'оценка RR неприменима (отсутствуют комплексы QRS)'
        : (isIrregular
            ? `неправильный (разброс интервалов RR: ${rrMin.toFixed(2)}–${rrMax.toFixed(2)} с, разница ${rrDiff.toFixed(2)} с > 0,10 с)`
            : `правильный (интервалы RR одинаковы, ~${rrMin.toFixed(2)} с)`);

    // 3. Heart rate
    let hrText = `${hr} уд/мин`;
    if (pathologyId === 'v_flutter') {
        hrText = 'осцилляции ~300 в мин (эффективного сокращения желудочков нет)';
    } else if (pathologyId === 'v_fib') {
        hrText = 'хаотичные волны 400–600 в мин (циркуляции крови нет)';
    } else if (isIrregular && rrList.length > 0 && rrMax > rrMin) {
        const minHr = Math.round(60 / rrMax);
        const maxHr = Math.round(60 / rrMin);
        const avgHr = Math.round(60 / ((rrMin + rrMax) / 2));
        hrText = `${minHr}–${maxHr} уд/мин (средняя ЧСС ≈ ${avgHr} уд/мин)`;
    } else if (pathologyId === 'sinus_tachycardia') {
        hrText = `${hr} уд/мин (тахикардия > 80 уд/мин)`;
    } else if (pathologyId === 'sinus_bradycardia') {
        hrText = `${hr} уд/мин (брадикардия < 60 уд/мин)`;
    } else if (pathologyId === 'avb_3') {
        hrText = `желудочки ${hr} уд/мин, предсердия ${timeline.atrialRate || 75} уд/мин`;
    }

    // 4. Cardiac axis
    const axisLabel = lagetyp(angle, false, languageRu, 'ru');
    const axisSign = clinicalAngle > 0 ? `+${Math.round(clinicalAngle)}` : `${Math.round(clinicalAngle)}`;
    const axisText = (pathologyId === 'v_flutter' || pathologyId === 'v_fib')
        ? 'не определяется'
        : `${axisSign}° (${axisLabel}; ΣQRS I = ${leadI.qrsNet > 0 ? '+' : ''}${leadI.qrsNet} мм, ΣQRS III = ${leadIII.qrsNet > 0 ? '+' : ''}${leadIII.qrsNet} мм)`;

    // 5. P wave
    let pText = '';
    if (pathologyId === 'v_flutter' || pathologyId === 'v_fib') {
        pText = 'не дифференцируется';
    } else if (pathologyId === 'afib') {
        pText = 'отсутствует, регистрируются волны фибрилляции ff';
    } else if (pathologyId === 'aflutter') {
        pText = 'отсутствует, регистрируются пилообразные волны трепетания FF (~300/мин)';
    } else if (pathologyId === 'svt') {
        pText = 'не виден (сливается с предыдущим зубцом T)';
    } else if (pathologyId === 'vt') {
        pText = 'отсутствует';
    } else if (pathologyId === 'lah') {
        pText = `«+» в I, II, aVL, V2–V6; двугорбый; амплитуда ${leadII.p.amp.toFixed(1)} мм; длительность ${leadII.p.dur.toFixed(2)} с (≥ 0,12 с — P-mitrale)`;
    } else if (pathologyId === 'rah') {
        pText = `«+» в II, III, aVF; заострённый («готический»); амплитуда ${leadII.p.amp.toFixed(1)} мм (> 2,5 мм — P-pulmonale); длительность ${leadII.p.dur.toFixed(2)} с`;
    } else {
        pText = `«+» в I, II, aVF, V2–V6, «−» в aVR; амплитуда ${leadII.p.amp.toFixed(1)} мм (≤ 2,5 мм), длительность ${leadII.p.dur.toFixed(2)} с (≤ 0,10 с)`;
    }

    // 6. PQ interval
    let pqText = 'нет';
    if (pathologyId === 'avb_1') {
        pqText = `${leadII.pq.toFixed(2)} с (удлинён > 0,20 с)`;
    } else if (pathologyId === 'avb_2_mobitz1') {
        pqText = 'прогрессивно удлиняется: 0,18 → 0,26 → 0,34 с с последующим выпадением QRS';
    } else if (pathologyId === 'avb_2_mobitz2') {
        pqText = '0,18 с (постоянный перед проведёнными QRS, периодически блокирован)';
    } else if (pathologyId === 'avb_3') {
        pqText = 'постоянный интервал отсутствует (полная АВ-диссоциация)';
    } else if (pathologyId === 'pericarditis_acute') {
        pqText = `${leadII.pq.toFixed(2)} с (норма 0,12–0,20 с); депрессия сегмента PR (PQ) в отведениях I, II, aVF, V2–V6 при реципрокной элевации PR в aVR (субэпикардиальное повреждение предсердий)`;
    } else if (!['afib', 'aflutter', 'svt', 'vt', 'v_flutter', 'v_fib'].includes(pathologyId)) {
        pqText = `${leadII.pq.toFixed(2)} с (норма 0,12–0,20 с)`;
    }

    // 7. QRS duration
    let qrsDurMax = Math.max(...Object.values(leads).map((l) => l.qrsDur));
    let qrsText = `${qrsDurMax.toFixed(2)} с (норма ≤ 0,10 с)`;
    if (pathologyId === 'v_flutter' || pathologyId === 'v_fib') {
        qrsText = 'комплексы QRS отсутствуют';
    } else if (pathologyId === 'pericarditis_effusion') {
        qrsText = `${qrsDurMax.toFixed(2)} с (норма ≤ 0,10 с); электрическая альтернация (ритмичное чередование высоты QRS от комплекса к комплексу)`;
    } else if (['pvc_single', 'pvc_bigeminy', 'pvc_trigeminy', 'pvc_paired_poly'].includes(pathologyId)) {
        qrsText = 'основные комплексы 0,08 с; в экстрасистолах расширен до 0,14 с (> 0,10 с)';
    } else if (qrsDurMax > 0.1) {
        qrsText = `${qrsDurMax.toFixed(2)} с (расширен ≥ 0,12 с)`;
    }

    // 8. Q wave
    const pathQLeads = Object.values(leads).filter((l) => l.isQS || (l.q.dur >= 0.03 && l.r.amp > 0 && l.q.amp > l.r.amp * 0.25));
    let qText = 'не патологический (≤ 1/4 R, < 0,03 с)';
    if (pathologyId === 'v_flutter' || pathologyId === 'v_fib') {
        qText = 'не определяется';
    } else if (['pericarditis_acute', 'pericarditis_stage2', 'pericarditis_stage3', 'pericarditis_effusion'].includes(pathologyId)) {
        qText = 'не патологический (зубец Q не расширен, комплексы QS отсутствуют — некроз миокарда исключён)';
    } else if (pathologyId === 'lbbb' && pathQLeads.some((l) => l.lead === 'V1')) {
        qText = 'комплекс QS в V1 (обусловлен БЛНПГ), в V5–V6 зубец q отсутствует';
    } else if (pathQLeads.length > 0) {
        const hasQS = pathQLeads.some((l) => l.isQS);
        qText = `патологический (${hasQS ? 'комплекс QS' : 'зубец Q ≥ 0,03 с и > 1/4 R'}) в отведениях ${pathQLeads.map((l) => l.lead).join(', ')}`;
    }

    // 9. R and S waves (hypertrophy check)
    let rsText = '';
    if (pathologyId === 'v_flutter' || pathologyId === 'v_fib') {
        rsText = 'неприменимо';
    } else if (pathologyId === 'pericarditis_effusion') {
        rsText = 'диффузный микровольтаж: размах QRS < 5 мм во всех отведениях от конечностей и < 10 мм во всех грудных отведениях; феномен электрической альтернации';
    } else if (qrsDurMax > 0.1 || ['vt'].includes(pathologyId)) {
        rsText = 'неприменимо, так как длительность комплекса QRS превышает 0,10 с';
    } else {
        const rMaxLeft = Math.max(leadV5.r.amp, leadV6.r.amp);
        const sMaxRight = Math.max(leadV1.s.amp, leadV2.s.amp);
        const sokolovLyon = Number((rMaxLeft + sMaxRight).toFixed(1));
        const rv1Ratio = leadV1.s.amp > 0 ? Number((leadV1.r.amp / leadV1.s.amp).toFixed(2)) : leadV1.r.amp;
        rsText = `ЛЖ: индекс Соколова — Лайона = ${sokolovLyon} мм (${sokolovLyon > 35 ? '> 35 мм — признак ГЛЖ' : '≤ 35 мм'}); ПЖ: R/S в V1 = ${rv1Ratio} (${rv1Ratio >= 1 ? '≥ 1 — признак ГПЖ' : '< 1'})`;
    }

    // 10. ST segment
    const stElevLeads = Object.values(leads).filter((l) => l.st.offset >= 1.0).map((l) => l.lead);
    const stDepLeads = Object.values(leads).filter((l) => l.st.offset <= -1.0).map((l) => l.lead);
    let stText = 'на изолинии (точка j в пределах ±1 мм)';
    if (pathologyId === 'v_flutter' || pathologyId === 'v_fib') {
        stText = 'изоэлектрическая линия отсутствует';
    } else if (pathologyId === 'pericarditis_acute') {
        stText = `диффузная конкордантная вогнутая (седловидная) элевация в ${stElevLeads.join(', ')} (без зеркальной депрессии в противоположных стенках; депрессия только в aVR)`;
    } else if (pathologyId === 'pericarditis_stage2' || pathologyId === 'pericarditis_stage3') {
        stText = 'на изолинии (полная нормализация сегмента ST во всех 12 отведениях)';
    } else if (stElevLeads.length || stDepLeads.length) {
        const parts = [];
        if (stElevLeads.length) parts.push(`элевация в ${stElevLeads.join(', ')}`);
        if (stDepLeads.length) parts.push(`депрессия в ${stDepLeads.join(', ')}`);
        stText = parts.join('; ');
        if (pathologyId === 'rbbb' || pathologyId === 'lbbb') {
            stText += ' (вторичные изменения при блокаде ножки пучка Гиса)';
        }
    }

    // 11. T wave
    const negTLeads = Object.values(leads)
        .filter((l) => l.lead !== 'aVR' && l.t.amp <= -1.0)
        .map((l) => l.lead);
    const tallTLeads = Object.values(leads)
        .filter((l) => l.t.peaked && l.t.amp >= 6.0)
        .map((l) => l.lead);
    let tText = 'положительный (кроме aVR)';
    if (pathologyId === 'v_flutter' || pathologyId === 'v_fib') {
        tText = 'не дифференцируется';
    } else if (pathologyId === 'pericarditis_acute') {
        tText = 'положительный во всех отведениях с элевацией ST (T не инвертируется пока приподнят ST)';
    } else if (pathologyId === 'pericarditis_stage2') {
        tText = 'диффузно уплощённый (снижение амплитуды зубца T на фоне вернувшегося к изолинии сегмента ST)';
    } else if (pathologyId === 'pericarditis_stage3') {
        tText = `диффузная симметричная инверсия (отрицательный T в ${negTLeads.join(', ')}) при строго изоэлектричном ST`;
    } else if (tallTLeads.length) {
        tText = `высокоамплитудный положительный остроконечный («коронарный») в ${tallTLeads.join(', ')}`;
    } else if (negTLeads.length) {
        tText = `отрицательный в ${negTLeads.join(', ')}`;
        if (pathologyId === 'rbbb' || pathologyId === 'lbbb') {
            tText += ' (следствие нарушения внутрижелудочковой проводимости, не ишемия)';
        } else if (pathologyId === 'lvh' || pathologyId === 'rvh') {
            tText += ' (перегрузка гипертрофированного желудочка)';
        }
    }

    // 12. Conclusion
    let conclusion = pathology.ru;
    if (pathologyId === 'mi' && stageObj && localizationObj) {
        const depthLabel = options.miDepth === 'transmural' ? 'трансмуральный (QS)' : 'с зубцом Q';
        conclusion = `Инфаркт миокарда ${depthLabel}: ${localizationObj.ru.toLowerCase()}, ${stageObj.ru.toLowerCase().replace(/^\d+\.\s*/, '')}`;
    } else if (localizationObj) {
        conclusion = `${pathology.ru}: ${localizationObj.ru}`;
    }

    return [
        { num: 1, label: 'Ритм', value: rhythmText, abnormal: !['normal_sinus', 'sinus_tachycardia', 'sinus_bradycardia', 'rbbb', 'lbbb', 'lah', 'rah', 'lvh', 'rvh', 'ischemia_subendo', 'ischemia_subepi', 'injury_subendo', 'injury_subepi', 'mi', 'pericarditis_acute', 'pericarditis_stage2', 'pericarditis_stage3', 'pericarditis_effusion'].includes(pathologyId) },
        { num: 2, label: 'Регулярность', value: regularityText, abnormal: isIrregular },
        { num: 3, label: 'ЧСС', value: hrText, abnormal: hr > 80 || hr < 60 || isIrregular },
        { num: 4, label: 'ЭОС', value: axisText, abnormal: clinicalAngle < 0 || clinicalAngle > 90 },
        { num: 5, label: 'Зубец P', value: pText, abnormal: ['afib', 'aflutter', 'svt', 'vt', 'v_flutter', 'v_fib', 'lah', 'rah', 'pac'].includes(pathologyId) },
        { num: 6, label: 'Интервал PQ (PR)', value: pqText, abnormal: ['avb_1', 'avb_2_mobitz1', 'avb_2_mobitz2', 'avb_3', 'afib', 'aflutter', 'svt', 'vt', 'pericarditis_acute'].includes(pathologyId) },
        { num: 7, label: 'Длительность QRS', value: qrsText, abnormal: qrsDurMax > 0.1 || ['pvc_single', 'pvc_bigeminy', 'pvc_trigeminy', 'pvc_paired_poly', 'v_flutter', 'v_fib', 'pericarditis_effusion'].includes(pathologyId) },
        { num: 8, label: 'Зубец Q (q)', value: qText, abnormal: pathQLeads.length > 0 && pathologyId === 'mi' },
        { num: 9, label: 'Зубцы R и S (гипертрофия)', value: rsText, abnormal: ['lvh', 'rvh', 'pericarditis_effusion'].includes(pathologyId) },
        { num: 10, label: 'Сегмент ST', value: stText, abnormal: stElevLeads.length > 0 || stDepLeads.length > 0 },
        { num: 11, label: 'Зубец T', value: tText, abnormal: tallTLeads.length > 0 || negTLeads.length > 0 || ['pericarditis_stage2', 'pericarditis_stage3'].includes(pathologyId) },
        { num: 12, label: 'Заключение', value: conclusion, abnormal: pathologyId !== 'normal_sinus', isConclusion: true }
    ];
}

    EcgApp.analysis = { traceDiagnosticAlgorithm, buildAnalysisPlan };
})(typeof globalThis !== 'undefined' ? globalThis : window);
