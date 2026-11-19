/**
 * @file ECG axis calculations and 12-lead ECG morphology generator
 * covering cardiac axis and all pathologies from the textbook.
 */

(function (root) {
    const EcgApp = (root.EcgApp = root.EcgApp || {});
    const {
        getPathologyById,
        getLocalizationById,
        getStageById
    } = EcgApp.pathologies;

const LEAD_NAMES_LIMB = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const LEAD_NAMES_PRECORDIAL = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const LEAD_NAMES_ALL = [...LEAD_NAMES_LIMB, ...LEAD_NAMES_PRECORDIAL];

const LIMB_LEAD_DEGREES = {
    I: 0,
    II: 60,
    III: 120,
    aVR: 210,
    aVL: 330,
    aVF: 90
};

/**
 * Converts degree to radians.
 * @param {number} deg
 * @returns {number}
 */
const degToRad = (deg) => (deg * Math.PI) / 180;

/**
 * Normalizes any angle in degrees to [0, 360).
 * @param {number} deg
 * @returns {number}
 */
const normalizeAngle = (deg) => ((deg % 360) + 360) % 360;

/**
 * Formats Cabrera angle [0, 360) to clinical (-180, +180] range.
 * @param {number} deg
 * @returns {number}
 */
const toClinicalAngle = (deg) => {
    const norm = normalizeAngle(deg);
    return norm > 180 ? norm - 360 : norm;
};

/**
 * Calculates the normalized projection amplitude (-1 to 1) of a heart-axis onto a lead.
 * @param {number} angle
 * @param {number} leadDegree
 * @returns {number}
 */
const calculateAmplitude = (angle, leadDegree) => {
    return Math.cos(degToRad(angle) - degToRad(leadDegree));
};

/**
 * Calculates the amplitudes (-1 to 1) for the 6 limb leads [I, II, III, aVR, aVL, aVF].
 * @param {number} angle
 * @returns {number[]}
 */
const calculateEcg = (angle) => {
    return [
        calculateAmplitude(angle, 0),
        calculateAmplitude(angle, 60),
        calculateAmplitude(angle, 120),
        calculateAmplitude(angle, 210),
        calculateAmplitude(angle, 330),
        calculateAmplitude(angle, 90)
    ];
};

/**
 * Defines which heart-axis-position is present.
 * @param {number} degree Cabrera angle [0, 360]
 * @param {boolean} international
 * @param {object} language
 * @param {string} mode 'auto' | 'de' | 'int' | 'ru'
 * @returns {string}
 */
const lagetyp = (degree, international = false, language = null, mode = 'auto') => {
    if (degree > 360 || degree < 0) {
        return 'invalid degree';
    }
    const norm = degree === 360 ? 0 : degree;
    const effectiveMode = mode === 'auto'
        ? (language && language.code === 'ru' ? 'ru' : (international ? 'int' : 'de'))
        : mode;

    if (effectiveMode === 'ru') {
        if (norm >= 30 && norm < 70) {
            return language.typeRuNormal;
        } else if (norm >= 0 && norm < 30) {
            return language.typeRuHorizontal;
        } else if (norm >= 70 && norm <= 90) {
            return language.typeRuVertical;
        } else if (norm > 90 && norm <= 180) {
            return language.typeRuRad;
        } else if (norm > 180 && norm < 270) {
            return language.typeRuNw;
        } else {
            return language.typeRuLad;
        }
    }

    if (effectiveMode === 'de' || !international) {
        if (norm >= 30 && norm < 60) {
            return 'Indifferenztyp';
        } else if (norm >= 60 && norm < 90) {
            return 'Steiltyp';
        } else if (norm >= 90 && norm < 120) {
            return 'Rechtstyp';
        } else if (norm >= 120 && norm < 180) {
            return 'Ueberdrehter Rechtstyp';
        } else if (norm >= 180 && norm < 270) {
            return 'Northwest-Typ';
        } else if (norm >= 270 && norm < 330) {
            return 'Ueberdrehter Linkstyp';
        } else {
            return 'Linkstyp';
        }
    }

    if (norm >= 90 && norm < 180) {
        return language.typeRad;
    } else if (norm >= 180 && norm < 270) {
        return language.typeNw;
    } else if (norm >= 270 && norm < 330) {
        return language.typeLad;
    } else {
        return language.typeNormal;
    }
};

/**
 * Builds baseline Q/R/S amplitudes (in mm) for any of the 12 leads for a given Cabrera angle.
 */
function buildBaseQrsForLead(lead, angle) {
    if (LIMB_LEAD_DEGREES[lead] !== undefined) {
        const net = 10 * calculateAmplitude(angle, LIMB_LEAD_DEGREES[lead]);
        const septalQ = (lead === 'I' || lead === 'aVL') && net > 2.5 ? 0.6 : 0;
        if (net >= 2.5) {
            const s = 1.0;
            const r = net + septalQ + s;
            return { q: { amp: septalQ, dur: septalQ > 0 ? 0.015 : 0 }, r: { amp: r, dur: 0.045 }, s: { amp: s, dur: 0.025 } };
        }
        if (net <= -2.5) {
            const r = 1.2;
            const s = -net + r;
            return { q: { amp: 0, dur: 0 }, r: { amp: r, dur: 0.025 }, s: { amp: s, dur: 0.05 } };
        }
        // Equiphasic RS near perpendicular axis
        const r = Math.max(1.0, 4.0 + net / 2);
        const s = Math.max(1.0, 4.0 - net / 2);
        return { q: { amp: 0, dur: 0 }, r: { amp: r, dur: 0.038 }, s: { amp: s, dur: 0.038 } };
    }

    const precordialDefaults = {
        V1: { q: 0, qDur: 0, r: 2.5, rDur: 0.025, s: 9.5, sDur: 0.05 },
        V2: { q: 0, qDur: 0, r: 4.5, rDur: 0.03, s: 11.0, sDur: 0.05 },
        V3: { q: 0, qDur: 0, r: 8.5, rDur: 0.038, s: 7.5, sDur: 0.04 },
        V4: { q: 0.4, qDur: 0.012, r: 13.5, rDur: 0.045, s: 3.5, sDur: 0.025 },
        V5: { q: 1.0, qDur: 0.015, r: 15.0, rDur: 0.045, s: 1.5, sDur: 0.02 },
        V6: { q: 0.8, qDur: 0.015, r: 12.5, rDur: 0.045, s: 1.0, sDur: 0.018 }
    };
    const p = precordialDefaults[lead];
    return {
        q: { amp: p.q, dur: p.qDur },
        r: { amp: p.r, dur: p.rDur },
        s: { amp: p.s, dur: p.sDur }
    };
}

/**
 * Builds baseline P-wave descriptor (in mm and sec) for a lead.
 */
function buildBasePForLead(lead) {
    const pAmps = {
        I: 1.2,
        II: 1.6,
        III: 0.8,
        aVR: -1.4,
        aVL: 0.7,
        aVF: 1.3,
        V1: 0.8,
        V2: 1.1,
        V3: 1.2,
        V4: 1.2,
        V5: 1.1,
        V6: 1.0
    };
    return {
        amp: pAmps[lead] ?? 1.0,
        dur: 0.09,
        notched: false,
        peaked: false,
        absent: false
    };
}

/**
 * Builds baseline T-wave descriptor (in mm and sec) for a lead.
 */
function buildBaseTForLead(lead, angle) {
    let amp = 3.0;
    if (lead === 'aVR') amp = -2.8;
    else if (lead === 'I') amp = 2.4 + 0.6 * calculateAmplitude(angle, 0);
    else if (lead === 'II') amp = 3.2;
    else if (lead === 'III') amp = Math.max(0.6, 1.4 + 1.0 * calculateAmplitude(angle, 120));
    else if (lead === 'aVL') amp = Math.max(0.6, 1.5 + 0.9 * calculateAmplitude(angle, 330));
    else if (lead === 'aVF') amp = Math.max(0.8, 2.2 + 0.8 * calculateAmplitude(angle, 90));
    else if (lead === 'V1') amp = 1.2;
    else if (lead === 'V2') amp = 3.4;
    else if (lead === 'V3') amp = 4.2;
    else if (lead === 'V4') amp = 4.5;
    else if (lead === 'V5') amp = 4.0;
    else if (lead === 'V6') amp = 3.2;

    return {
        amp: Number(amp.toFixed(2)),
        dur: 0.16,
        peaked: false,
        symmetric: false
    };
}

/**
 * Builds a timeline of cardiac beats (in seconds) for a 10-second strip
 * based on rhythm pathology and heart rate.
 */
function buildBeatTimeline(pathologyId, hr, totalDuration = 10.5) {
    const baseRR = 60 / Math.max(20, hr);
    const beats = [];
    const pOnlyWaves = []; // Unconducted P waves (Mobitz I/II, AVB III)

    if (pathologyId === 'v_flutter' || pathologyId === 'v_fib') {
        return { beats, pOnlyWaves, continuousMode: pathologyId, rrList: [] };
    }

    if (pathologyId === 'sinus_arrhythmia') {
        // Respiratory modulation > 0.14 s difference between shortest and longest RR
        const pattern = [0.84, 0.92, 1.06, 1.16, 1.08, 0.94, 0.84];
        const scale = baseRR / 0.97;
        let t = 0.28;
        let idx = 0;
        while (t < totalDuration) {
            const rr = pattern[idx % pattern.length] * scale;
            beats.push({ time: t, type: 'sinus', pq: 0.16, rrPrev: idx === 0 ? null : rr });
            t += rr;
            idx += 1;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList };
    }

    if (pathologyId === 'afib') {
        // Irregularly irregular RR sequence scaled around target HR
        const multipliers = [0.72, 1.18, 0.84, 1.32, 0.78, 1.05, 0.68, 1.25, 0.91, 1.14, 0.76, 1.22];
        let t = 0.25;
        let idx = 0;
        while (t < totalDuration) {
            const rr = baseRR * multipliers[idx % multipliers.length];
            beats.push({ time: t, type: 'afib', pq: 0, rrPrev: idx === 0 ? null : rr });
            t += rr;
            idx += 1;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList };
    }

    if (pathologyId === 'aflutter') {
        // 3:1 or 4:1 flutter conduction (4:1 gives clear sawtooth waves at 75 bpm when flutter = 300/min)
        const flutterPeriod = 0.2; // 300/min
        const rr = Math.max(0.4, Math.round(baseRR / flutterPeriod) * flutterPeriod);
        let t = 0.25;
        while (t < totalDuration) {
            beats.push({ time: t, type: 'aflutter', pq: 0 });
            t += rr;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList };
    }

    if (pathologyId === 'pac') {
        // Premature atrial beat after 2nd sinus beat
        const coupling = baseRR * 0.56;
        const pause = baseRR * 1.24;
        const intervals = [baseRR, coupling, pause, baseRR, baseRR, coupling, pause, baseRR, baseRR];
        let t = 0.25;
        let idx = 0;
        while (t < totalDuration) {
            const isPac = idx % 3 === 2;
            beats.push({
                time: t,
                type: isPac ? 'pac' : 'sinus',
                pq: isPac ? 0.14 : 0.16
            });
            t += intervals[idx % intervals.length];
            idx += 1;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList };
    }

    if (pathologyId === 'pvc_single') {
        const coupling = baseRR * 0.52;
        const compPause = 2 * baseRR - coupling;
        let t = 0.25;
        let idx = 0;
        while (t < totalDuration) {
            const isPvc = idx === 2 || idx === 6;
            beats.push({
                time: t,
                type: isPvc ? 'pvc_a' : 'sinus',
                pq: isPvc ? 0 : 0.16
            });
            if (idx === 1 || idx === 5) t += coupling;
            else if (isPvc) t += compPause;
            else t += baseRR;
            idx += 1;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList };
    }

    if (pathologyId === 'pvc_bigeminy') {
        const coupling = baseRR * 0.54;
        const compPause = 2 * baseRR - coupling;
        let t = 0.25;
        let idx = 0;
        while (t < totalDuration) {
            const isPvc = idx % 2 === 1;
            beats.push({
                time: t,
                type: isPvc ? 'pvc_a' : 'sinus',
                pq: isPvc ? 0 : 0.16
            });
            t += isPvc ? compPause : coupling;
            idx += 1;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList };
    }

    if (pathologyId === 'pvc_trigeminy') {
        const coupling = baseRR * 0.54;
        const compPause = 2 * baseRR - coupling;
        let t = 0.25;
        let idx = 0;
        while (t < totalDuration) {
            const mod = idx % 3;
            const isPvc = mod === 2;
            beats.push({
                time: t,
                type: isPvc ? 'pvc_a' : 'sinus',
                pq: isPvc ? 0 : 0.16
            });
            if (mod === 0) t += baseRR;
            else if (mod === 1) t += coupling;
            else t += compPause;
            idx += 1;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList };
    }

    if (pathologyId === 'pvc_paired_poly') {
        const coupling = baseRR * 0.52;
        const pairGap = 0.44;
        const compPause = baseRR * 1.48;
        let t = 0.25;
        let idx = 0;
        while (t < totalDuration) {
            const mod = idx % 5;
            const type = mod === 2 ? 'pvc_a' : (mod === 3 ? 'pvc_b' : 'sinus');
            beats.push({
                time: t,
                type,
                pq: type === 'sinus' ? 0.16 : 0
            });
            if (mod === 1) t += coupling;
            else if (mod === 2) t += pairGap;
            else if (mod === 3) t += compPause;
            else t += baseRR;
            idx += 1;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList };
    }

    if (pathologyId === 'avb_1') {
        let t = 0.30;
        while (t < totalDuration) {
            beats.push({ time: t, type: 'sinus', pq: 0.28 });
            t += baseRR;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList };
    }

    if (pathologyId === 'avb_2_mobitz1') {
        // Periodica Samoilov-Wenckebach 4:3
        const pp = baseRR; // e.g. 0.80 s at 75 bpm
        const pqSteps = [0.18, 0.26, 0.34];
        let pStart = 0.20;
        let step = 0;
        while (pStart < totalDuration) {
            const cyclePos = step % 4;
            if (cyclePos < 3) {
                const pq = pqSteps[cyclePos];
                const qrsTime = pStart + pq;
                if (qrsTime < totalDuration) {
                    beats.push({ time: qrsTime, type: 'sinus', pq, pTime: pStart });
                }
            } else {
                // Blocked P wave
                pOnlyWaves.push({ time: pStart });
            }
            pStart += pp;
            step += 1;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList, pCount: step };
    }

    if (pathologyId === 'avb_2_mobitz2') {
        // 3:2 Mobitz II
        const pp = baseRR;
        const pq = 0.18;
        let pStart = 0.20;
        let step = 0;
        while (pStart < totalDuration) {
            const cyclePos = step % 3;
            if (cyclePos < 2) {
                const qrsTime = pStart + pq;
                if (qrsTime < totalDuration) {
                    beats.push({ time: qrsTime, type: 'sinus', pq, pTime: pStart });
                }
            } else {
                pOnlyWaves.push({ time: pStart });
            }
            pStart += pp;
            step += 1;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList, pCount: step };
    }

    if (pathologyId === 'avb_3') {
        // Independent atrial P waves at 75 bpm (PP = 0.80 s) and escape QRS at hr (e.g. 36 bpm)
        const pp = 0.80;
        let pt = 0.18;
        let pCount = 0;
        while (pt < totalDuration) {
            pOnlyWaves.push({ time: pt });
            pt += pp;
            pCount += 1;
        }
        let qt = 0.45;
        while (qt < totalDuration) {
            beats.push({ time: qt, type: 'escape', pq: 0 });
            qt += baseRR;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList, pCount, atrialRate: 75 };
    }

    if (pathologyId === 'pericarditis_effusion') {
        // Electrical alternans: alternating beat amplitude in pericardial effusion / tamponade
        let t = 0.22;
        let idx = 0;
        while (t < totalDuration) {
            beats.push({
                time: t,
                type: 'sinus',
                pq: 0.15,
                altScale: (idx % 2 === 0) ? 1.0 : 0.62
            });
            t += baseRR;
            idx += 1;
        }
        const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
        return { beats, pOnlyWaves, continuousMode: null, rrList };
    }

    // Regular rhythms (normal, sinus_tachycardia, sinus_bradycardia, svt, vt, rbbb, lbbb, hypertrophies, ischemia/MI, pericarditis)
    let t = 0.25;
    const beatType = pathologyId === 'svt' ? 'svt' : (pathologyId === 'vt' ? 'vt' : 'sinus');
    const pq = (pathologyId === 'svt' || pathologyId === 'vt') ? 0 : 0.16;
    while (t < totalDuration) {
        beats.push({ time: t, type: beatType, pq });
        t += baseRR;
    }
    const rrList = beats.slice(1).map((b, i) => Number((b.time - beats[i].time).toFixed(2)));
    return { beats, pOnlyWaves, continuousMode: null, rrList };
}

/**
 * Applies pathology-specific modifications to each of the 12 lead descriptors.
 */
function applyPathologyToLead(lead, base, pathologyId, angle, options) {
    const desc = {
        lead,
        p: { ...base.p },
        pq: options.pq ?? 0.16,
        q: { ...base.q },
        r: { ...base.r, notched: false, notchDepth: 0 },
        r2: null,
        s: { ...base.s, wide: false },
        qrsDur: 0.08,
        isQS: false,
        st: { offset: 0, slope: 0, monophasic: false },
        t: { ...base.t }
    };

    // Rhythm abnormalities affecting P or QRS globally
    if (['afib', 'aflutter', 'avb_3', 'vt'].includes(pathologyId)) {
        desc.p.absent = true;
    }
    if (pathologyId === 'svt') {
        desc.p.absent = true; // P merged into preceding T
    }
    if (pathologyId === 'avb_1') {
        desc.pq = 0.28;
    }

    // VT: wide M-shaped QRS + discordant T
    if (pathologyId === 'vt') {
        desc.qrsDur = 0.14;
        const positiveMain = desc.r.amp >= desc.s.amp;
        if (positiveMain) {
            desc.r = { amp: Math.max(10, desc.r.amp * 1.1), dur: 0.095, notched: true, notchDepth: 3.0 };
            desc.s = { amp: 2.5, dur: 0.045, wide: true };
            desc.st = { offset: -1.5, slope: -0.5, monophasic: false };
            desc.t = { amp: -4.2, dur: 0.17, peaked: false, symmetric: true };
        } else {
            desc.r = { amp: 1.5, dur: 0.03, notched: false, notchDepth: 0 };
            desc.s = { amp: Math.max(11, desc.s.amp * 1.15), dur: 0.11, wide: true };
            desc.st = { offset: 1.5, slope: 0.5, monophasic: false };
            desc.t = { amp: 4.0, dur: 0.17, peaked: false, symmetric: true };
        }
    }

    // RBBB (БПНПГ)
    if (pathologyId === 'rbbb') {
        desc.qrsDur = 0.14;
        if (lead === 'V1' || lead === 'V2') {
            desc.q = { amp: 0, dur: 0 };
            desc.r = { amp: 5.5, dur: 0.035, notched: false, notchDepth: 0 };
            desc.s = { amp: 3.5, dur: 0.035, wide: false };
            desc.r2 = { amp: lead === 'V1' ? 10.5 : 8.5, dur: 0.065 };
            desc.st = { offset: -1.4, slope: -0.4, monophasic: false };
            desc.t = { amp: -3.2, dur: 0.16, peaked: false, symmetric: false };
        } else if (lead === 'V5' || lead === 'V6' || lead === 'I' || lead === 'aVL') {
            desc.q = { amp: 1.0, dur: 0.015 };
            desc.r = { amp: Math.max(5.5, desc.r.amp * 0.85), dur: 0.045, notched: false, notchDepth: 0 };
            desc.s = { amp: lead === 'I' || lead === 'V6' ? 5.5 : 4.5, dur: 0.075, wide: true };
        } else {
            desc.s.dur = Math.max(desc.s.dur, 0.065);
            desc.r.dur = Math.max(desc.r.dur, 0.055);
        }
    }

    // LBBB (БЛНПГ)
    if (pathologyId === 'lbbb') {
        desc.qrsDur = 0.14;
        if (lead === 'V5' || lead === 'V6' || lead === 'I' || lead === 'aVL') {
            desc.q = { amp: 0, dur: 0 }; // Absent q in V5, V6
            desc.r = {
                amp: lead === 'V5' || lead === 'V6' ? 13.5 : 10.0,
                dur: 0.12,
                notched: true,
                notchDepth: 2.6
            };
            desc.s = { amp: 0.6, dur: 0.02, wide: false };
            desc.st = { offset: -1.8, slope: -0.5, monophasic: false };
            desc.t = { amp: -3.8, dur: 0.17, peaked: false, symmetric: false };
        } else if (lead === 'V1' || lead === 'V2') {
            desc.q = { amp: 0, dur: 0 };
            if (lead === 'V1') {
                desc.isQS = true;
                desc.q = { amp: 14.0, dur: 0.13 };
                desc.r = { amp: 0, dur: 0, notched: false, notchDepth: 0 };
                desc.s = { amp: 0, dur: 0, wide: false };
            } else {
                desc.r = { amp: 1.2, dur: 0.02, notched: false, notchDepth: 0 };
                desc.s = { amp: 15.5, dur: 0.115, wide: true };
            }
            desc.st = { offset: 1.2, slope: 0.4, monophasic: false };
            desc.t = { amp: 3.2, dur: 0.16, peaked: false, symmetric: false };
        } else {
            desc.r.dur = Math.max(desc.r.dur, 0.07);
            desc.s.dur = Math.max(desc.s.dur, 0.065);
        }
    }

    // LAH (P-mitrale)
    if (pathologyId === 'lah') {
        desc.p.dur = 0.14;
        if (lead === 'I' || lead === 'II' || lead === 'aVL') {
            desc.p.notched = true;
            desc.p.amp = lead === 'II' ? 2.6 : 2.1;
        }
    }

    // RAH (P-pulmonale)
    if (pathologyId === 'rah') {
        desc.p.dur = 0.09;
        if (lead === 'II' || lead === 'III' || lead === 'aVF') {
            desc.p.peaked = true;
            desc.p.amp = lead === 'II' ? 3.4 : 3.0;
        }
    }

    // LVH (ГЛЖ): Sokolow-Lyon > 35 mm + ST depression & inverted T in V5, V6
    if (pathologyId === 'lvh') {
        if (lead === 'V5') {
            desc.r.amp = 23.0;
            desc.st = { offset: -1.6, slope: -0.4, monophasic: false };
            desc.t = { amp: -3.2, dur: 0.16, peaked: false, symmetric: false };
        } else if (lead === 'V6') {
            desc.r.amp = 20.5;
            desc.st = { offset: -1.5, slope: -0.4, monophasic: false };
            desc.t = { amp: -3.0, dur: 0.16, peaked: false, symmetric: false };
        } else if (lead === 'V4') {
            desc.r.amp = 18.0;
        } else if (lead === 'V1') {
            desc.r.amp = 1.5;
            desc.s.amp = 15.5;
        } else if (lead === 'V2') {
            desc.r.amp = 2.5;
            desc.s.amp = 18.5;
        } else if (lead === 'I' || lead === 'aVL') {
            desc.r.amp = Math.max(desc.r.amp, 12.0);
            desc.st = { offset: -1.0, slope: -0.3, monophasic: false };
            desc.t = { amp: -2.0, dur: 0.15, peaked: false, symmetric: false };
        }
    }

    // RVH (ГПЖ): R/S in V1 >= 1
    if (pathologyId === 'rvh') {
        if (lead === 'V1') {
            desc.r.amp = 11.5;
            desc.s.amp = 3.5;
            desc.st = { offset: -1.2, slope: -0.3, monophasic: false };
            desc.t = { amp: -2.5, dur: 0.15, peaked: false, symmetric: false };
        } else if (lead === 'V2') {
            desc.r.amp = 9.0;
            desc.s.amp = 5.5;
            desc.t = { amp: -1.5, dur: 0.15, peaked: false, symmetric: false };
        } else if (lead === 'V5') {
            desc.r.amp = 7.5;
            desc.s.amp = 8.0;
        } else if (lead === 'V6') {
            desc.r.amp = 6.0;
            desc.s.amp = 7.5;
        }
    }

    // Coronary insufficiency (Ischemia, Injury, MI)
    if (['ischemia_subendo', 'ischemia_subepi', 'injury_subendo', 'injury_subepi', 'mi'].includes(pathologyId)) {
        const loc = getLocalizationById(options.localization);
        const affected = loc.leads.includes(lead);
        const reciprocal = loc.reciprocal.includes(lead);

        if (pathologyId === 'ischemia_subendo' && affected) {
            desc.t = { amp: 8.5, dur: 0.17, peaked: true, symmetric: true };
        } else if (pathologyId === 'ischemia_subepi' && affected) {
            desc.t = { amp: -4.8, dur: 0.17, peaked: true, symmetric: true };
        } else if (pathologyId === 'injury_subendo' && affected) {
            desc.st = { offset: -2.5, slope: -0.1, monophasic: false };
        } else if (pathologyId === 'injury_subepi') {
            if (affected) {
                desc.st = { offset: 3.6, slope: 0.2, monophasic: true };
                desc.t = { amp: 4.5, dur: 0.16, peaked: false, symmetric: false };
            } else if (reciprocal) {
                desc.st = { offset: -1.8, slope: -0.2, monophasic: false };
            }
        } else if (pathologyId === 'mi') {
            const stage = options.miStage || 'acute';
            const depth = options.miDepth || 'transmural';

            if (affected) {
                if (stage === 'hyperacute') {
                    // Pre-necrotic: no pathological Q yet, tall T & ST elevation (monophasic)
                    desc.st = { offset: 3.5, slope: 0.4, monophasic: true };
                    desc.t = { amp: 7.5, dur: 0.17, peaked: true, symmetric: true };
                } else {
                    // Necrosis: pathological Q (QR/Qr) or QS
                    if (depth === 'transmural') {
                        desc.isQS = true;
                        desc.q = { amp: Math.max(9.0, desc.r.amp * 0.85), dur: 0.065 };
                        desc.r = { amp: 0, dur: 0, notched: false, notchDepth: 0 };
                        desc.s = { amp: 0, dur: 0, wide: false };
                    } else {
                        const rHeight = Math.max(6.5, desc.r.amp * 0.6);
                        desc.r.amp = rHeight;
                        desc.q = { amp: Math.max(3.5, rHeight * 0.55), dur: 0.042 };
                    }

                    if (stage === 'acute') {
                        desc.st = { offset: 4.0, slope: 0.2, monophasic: true };
                        desc.t = { amp: 4.2, dur: 0.16, peaked: false, symmetric: false };
                    } else if (stage === 'subacute') {
                        desc.st = { offset: 1.6, slope: 0, monophasic: false };
                        desc.t = { amp: -3.8, dur: 0.17, peaked: true, symmetric: true };
                    } else if (stage === 'scar') {
                        desc.st = { offset: 0, slope: 0, monophasic: false };
                        desc.t = { amp: -4.5, dur: 0.17, peaked: true, symmetric: true };
                    }
                }
            } else if (reciprocal && (stage === 'hyperacute' || stage === 'acute')) {
                desc.st = { offset: -2.0, slope: -0.2, monophasic: false };
            }
        }
    }

    // Pericarditis (Перикардит, по руководству MSD)
    if (pathologyId === 'pericarditis_acute') {
        // Stage I: diffuse concave upward ST elevation + PR depression (PR elevation in aVR)
        if (lead === 'aVR') {
            desc.prOffset = 1.1; // PR elevation in aVR
            desc.st = { offset: -1.8, slope: -0.15, concave: false, monophasic: false };
            desc.t = { amp: -2.4, dur: 0.15, peaked: false, symmetric: false };
        } else if (lead === 'V1') {
            desc.prOffset = 0; // PR usually isoelectric in V1
            desc.st = { offset: 0.5, slope: 0.05, concave: true, monophasic: false };
            desc.t = { amp: 1.8, dur: 0.16, peaked: false, symmetric: false };
        } else if (lead === 'aVL') {
            desc.prOffset = 0; // PR usually isoelectric in aVL (MSD manual p. 14)
            desc.st = { offset: 1.2, slope: 0.1, concave: true, monophasic: false };
            desc.t = { amp: 2.2, dur: 0.16, peaked: false, symmetric: false };
        } else {
            // I, II, III, aVF, V2-V6
            desc.prOffset = -0.9; // PR depression
            const isChest = lead.startsWith('V');
            desc.st = { offset: isChest ? 3.0 : 2.2, slope: 0.15, concave: true, monophasic: false };
            desc.t = { amp: isChest ? 4.5 : 3.5, dur: 0.16, peaked: false, symmetric: false };
        }
        desc.isQS = false;
        if (desc.q.amp > 1.0) desc.q.amp = 0.5;
    }

    if (pathologyId === 'pericarditis_stage2') {
        // Stage II: ST segment returns to baseline, T wave flattens
        desc.prOffset = 0;
        desc.st = { offset: 0, slope: 0, concave: false, monophasic: false };
        desc.t = { amp: (lead === 'aVR' ? -0.4 : 0.6), dur: 0.16, peaked: false, symmetric: false };
        desc.isQS = false;
        if (desc.q.amp > 1.0) desc.q.amp = 0.5;
    }

    if (pathologyId === 'pericarditis_stage3') {
        // Stage III: T wave inversion across leads after ST returned to baseline
        desc.prOffset = 0;
        desc.st = { offset: 0, slope: 0, concave: false, monophasic: false };
        if (lead === 'aVR') {
            desc.t = { amp: 2.0, dur: 0.16, peaked: false, symmetric: false };
        } else if (lead === 'V1') {
            desc.t = { amp: -1.2, dur: 0.16, peaked: true, symmetric: true };
        } else if (lead === 'aVL') {
            desc.t = { amp: -1.5, dur: 0.16, peaked: true, symmetric: true };
        } else {
            desc.t = { amp: lead.startsWith('V') ? -4.2 : -3.2, dur: 0.17, peaked: true, symmetric: true };
        }
        desc.isQS = false;
        if (desc.q.amp > 1.0) desc.q.amp = 0.5;
    }

    if (pathologyId === 'pericarditis_effusion') {
        // Pericardial effusion / tamponade: microvoltage in all leads
        desc.prOffset = 0;
        desc.st = { offset: 0, slope: 0, concave: false, monophasic: false };
        const isLimb = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'].includes(lead);
        if (isLimb) {
            desc.r.amp = Math.min(desc.r.amp, 4.0);
            desc.s.amp = Math.min(desc.s.amp, 2.0);
            desc.p.amp = Math.min(desc.p.amp, 0.8);
            desc.t.amp = Math.min(desc.t.amp, 1.2);
        } else {
            desc.r.amp = Math.min(desc.r.amp, 7.5);
            desc.s.amp = Math.min(desc.s.amp, 6.0);
            desc.p.amp = Math.min(desc.p.amp, 1.0);
            desc.t.amp = Math.min(desc.t.amp, 1.8);
        }
        desc.isQS = false;
    }

    // Extrasystole descriptors (used for premature beat shapes)
    if (options.hr && options.hr > 130 && pathologyId !== 'v_flutter' && pathologyId !== 'v_fib') {
        const rr = 60 / options.hr;
        desc.t.dur = Number(Math.max(0.08, Math.min(desc.t.dur, rr * 0.35)).toFixed(3));
    }
    desc.qrsNet = Number((desc.r.amp + (desc.r2 ? desc.r2.amp : 0) - desc.q.amp - desc.s.amp).toFixed(1));
    return desc;
}

/**
 * Generates the complete 12-lead ECG state for rendering and analysis.
 * @param {number} angle Cabrera angle [0, 360)
 * @param {string} pathologyId
 * @param {object} options { hr, localization, miStage, miDepth }
 */
function computeEcgState(angle, pathologyId = 'normal_sinus', options = {}) {
    const pathology = getPathologyById(pathologyId);
    const normAngle = normalizeAngle(angle);
    const hr = options.hr ?? pathology.defaultHr;
    const localization = options.localization ?? pathology.defaultLocalization ?? 'anteroseptal_apical';
    const miStage = options.miStage ?? pathology.defaultStage ?? 'acute';
    const miDepth = options.miDepth ?? pathology.defaultDepth ?? 'transmural';

    const effectiveOptions = {
        hr,
        localization,
        miStage,
        miDepth
    };

    const timeline = buildBeatTimeline(pathologyId, hr, 10.5);

    const leads = {};
    for (const leadName of LEAD_NAMES_ALL) {
        const base = {
            p: buildBasePForLead(leadName),
            ...buildBaseQrsForLead(leadName, normAngle),
            t: buildBaseTForLead(leadName, normAngle)
        };
        leads[leadName] = applyPathologyToLead(leadName, base, pathologyId, normAngle, effectiveOptions);
    }

    return {
        angle: normAngle,
        clinicalAngle: toClinicalAngle(normAngle),
        pathologyId,
        pathology,
        hr,
        options: effectiveOptions,
        timeline,
        leads,
        localizationObj: pathology.supportsLocalization ? getLocalizationById(localization) : null,
        stageObj: pathology.supportsMiStage ? getStageById(miStage) : null
    };
}

    EcgApp.calculations = {
        LEAD_NAMES_LIMB,
        LEAD_NAMES_PRECORDIAL,
        LEAD_NAMES_ALL,
        degToRad,
        normalizeAngle,
        toClinicalAngle,
        calculateEcg,
        lagetyp,
        computeEcgState
    };
})(typeof globalThis !== 'undefined' ? globalThis : window);
