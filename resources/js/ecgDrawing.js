/**
 * @file High-precision 12-lead ECG grid and waveform renderer.
 * Supports 12-lead (6+6 + rhythm II), 6-lead limb, and 3-lead rhythm strip views
 * at 25 mm/s and 50 mm/s paper speeds.
 */

(function (root) {
    const EcgApp = (root.EcgApp = root.EcgApp || {});

const LEAD_GAIN_SCALE = {
    I: 0.9,
    II: 1.0,
    III: 0.9,
    aVR: 0.85,
    aVL: 0.85,
    aVF: 0.95,
    V1: 1.15,
    V2: 1.0,
    V3: 0.8,
    V4: 0.7,
    V5: 0.6,
    V6: 0.5
};

/**
 * Evaluates a smooth asymmetric or symmetric bell wave for P or T waves.
 */
function bellWave(u, symmetric = false, peaked = false) {
    if (u <= 0 || u >= 1) return 0;
    if (peaked) {
        const dist = Math.abs(u - 0.5) * 2;
        return Math.pow(Math.max(0, 1 - dist), 1.6);
    }
    if (symmetric) {
        return Math.pow(Math.sin(Math.PI * u), 1.7);
    }
    // Slight asymmetry (gradual rise, slightly steeper fall) typical for T wave
    const shifted = Math.pow(u, 0.82);
    return Math.pow(Math.sin(Math.PI * shifted), 1.5);
}

/**
 * Evaluates P-wave voltage (in mm) at time tSec for a P wave starting at tStart.
 */
function evalPWave(tSec, tStart, pDesc, beatType) {
    if (pDesc.absent && beatType !== 'pac') return 0;
    const dur = pDesc.dur || 0.09;
    const u = (tSec - tStart) / dur;
    if (u <= 0 || u >= 1) return 0;

    let amp = pDesc.amp;
    if (beatType === 'pac') {
        amp = amp >= 0 ? -Math.max(0.9, amp * 0.75) : Math.abs(amp) * 0.75;
    }

    if (pDesc.notched && beatType !== 'pac') {
        const g1 = Math.exp(-Math.pow((u - 0.30) / 0.16, 2));
        const g2 = Math.exp(-Math.pow((u - 0.68) / 0.17, 2));
        return amp * (0.78 * g1 + 1.0 * g2) * 0.92;
    }
    return amp * bellWave(u, true, pDesc.peaked);
}

/**
 * Evaluates a piecewise-linear triangle/trapezoid wave in [0, 1].
 */
function triWave(u, peakPos = 0.5) {
    if (u <= 0 || u >= 1) return 0;
    return u < peakPos ? u / peakPos : (1 - u) / (1 - peakPos);
}

/**
 * Evaluates QRS voltage (in mm) at time tSec starting at tQrs.
 */
function evalQrs(tSec, tQrs, desc, beatType, leadName) {
    if (beatType === 'pvc_a' || beatType === 'pvc_b') {
        const dur = 0.14;
        const u = (tSec - tQrs) / dur;
        if (u <= 0 || u >= 1) return 0;
        const isVLead = leadName.startsWith('V');
        let dir = 1;
        if (beatType === 'pvc_a') {
            dir = (leadName === 'aVR' || leadName === 'I' || leadName === 'aVL' || leadName === 'V5' || leadName === 'V6') ? -1 : 1;
        } else {
            dir = (leadName === 'I' || leadName === 'aVL' || leadName === 'V5' || leadName === 'V6') ? 1 : -1;
        }
        const amp = isVLead ? 13.0 : 11.5;
        // M-shaped / notched wide ectopic QRS
        if (dir > 0) {
            const m = Math.exp(-Math.pow((u - 0.34) / 0.14, 2)) * 1.0 +
                Math.exp(-Math.pow((u - 0.64) / 0.15, 2)) * 0.85 -
                Math.exp(-Math.pow((u - 0.88) / 0.08, 2)) * 0.22;
            return amp * m;
        }
        const negM = Math.exp(-Math.pow((u - 0.35) / 0.15, 2)) * 1.0 +
            Math.exp(-Math.pow((u - 0.66) / 0.16, 2)) * 0.82;
        return -amp * negM + (u < 0.16 ? 1.5 * triWave(u / 0.16) : 0);
    }

    const dt = tSec - tQrs;
    if (dt < 0 || dt > desc.qrsDur + 0.01) return 0;

    if (desc.isQS) {
        const u = dt / desc.qrsDur;
        if (u <= 0 || u >= 1) return 0;
        return -desc.q.amp * triWave(u, 0.42);
    }

    let cursor = 0;
    const qDur = desc.q.dur || 0;
    if (desc.q.amp > 0 && qDur > 0) {
        if (dt >= cursor && dt <= cursor + qDur) {
            return -desc.q.amp * triWave((dt - cursor) / qDur, 0.5);
        }
        cursor += qDur;
    }

    const rDur = desc.r.dur || 0.04;
    if (desc.r.amp > 0 && rDur > 0) {
        if (dt >= cursor && dt <= cursor + rDur) {
            const u = (dt - cursor) / rDur;
            let val = desc.r.amp * triWave(u, 0.5);
            if (desc.r.notched) {
                // Create distinct M-shaped notch near peak
                const notch = Math.exp(-Math.pow((u - 0.5) / 0.11, 2)) * (desc.r.notchDepth || 2.5);
                const shoulders = (Math.exp(-Math.pow((u - 0.32) / 0.12, 2)) + Math.exp(-Math.pow((u - 0.68) / 0.12, 2))) * desc.r.amp * 0.92;
                val = Math.max(0, shoulders - notch);
            }
            return val;
        }
        cursor += rDur;
    }

    const sDur = desc.s.dur || 0;
    if (desc.s.amp > 0 && sDur > 0) {
        if (dt >= cursor && dt <= cursor + sDur) {
            const u = (dt - cursor) / sDur;
            return -desc.s.amp * triWave(u, desc.s.wide ? 0.38 : 0.48);
        }
        cursor += sDur;
    }

    if (desc.r2 && desc.r2.amp > 0 && desc.r2.dur > 0) {
        if (dt >= cursor && dt <= cursor + desc.r2.dur) {
            return desc.r2.amp * triWave((dt - cursor) / desc.r2.dur, 0.46);
        }
    }

    return 0;
}

/**
 * Evaluates ST segment + T wave voltage (in mm) after J-point.
 */
function evalStT(tSec, tQrs, desc, beatType, leadName) {
    const qrsDur = (beatType === 'pvc_a' || beatType === 'pvc_b') ? 0.14 : desc.qrsDur;
    const dt = tSec - (tQrs + qrsDur);
    const tDur = desc.t.dur || 0.16;
    const stLen = tDur < 0.14 ? 0.045 : 0.09;
    const totalLen = stLen + tDur + 0.03;
    if (dt < 0 || dt > totalLen) return 0;

    if (beatType === 'pvc_a' || beatType === 'pvc_b') {
        let dir = 1;
        if (beatType === 'pvc_a') {
            dir = (leadName === 'aVR' || leadName === 'I' || leadName === 'aVL' || leadName === 'V5' || leadName === 'V6') ? -1 : 1;
        } else {
            dir = (leadName === 'I' || leadName === 'aVL' || leadName === 'V5' || leadName === 'V6') ? 1 : -1;
        }
        // Discordant ST & T opposite to main ectopic QRS deflection
        const discSign = -dir;
        const stVal = discSign * 1.4 * Math.min(1, dt / 0.03) * (1 - Math.max(0, (dt - stLen) / tDur));
        const tU = (dt - stLen * 0.65) / (tDur + 0.03);
        const tVal = discSign * 4.0 * bellWave(tU, true, false);
        return stVal + tVal;
    }

    const stOff = desc.st.offset || 0;
    const tAmp = desc.t.amp;

    if (desc.st.monophasic && stOff > 0) {
        // Pardee monophasic ST-T dome
        const u = dt / (stLen + tDur);
        if (u <= 0 || u >= 1) return 0;
        const stPart = stOff * Math.pow(Math.max(0, 1 - u), 0.55);
        const tPart = Math.max(0, tAmp) * bellWave(Math.max(0, (dt - 0.03) / (stLen + tDur - 0.03)), desc.t.symmetric, desc.t.peaked);
        return Math.max(stPart, stPart * 0.55 + tPart * 0.75);
    }

    if (desc.st.concave && stOff > 0) {
        // Upward concave saddle-shaped ST elevation characteristic of acute pericarditis (MSD manual)
        const u = dt / (stLen + tDur);
        if (u <= 0 || u >= 1) return 0;
        const stPart = stOff * Math.pow(Math.max(0, 1 - (dt / (stLen * 1.15))), 1.7);
        const tU = Math.max(0, (dt - stLen * 0.45) / (tDur + stLen * 0.55));
        const tPart = Math.max(0, tAmp) * bellWave(tU, desc.t.symmetric, desc.t.peaked);
        return Math.max(stPart * 0.85, stPart * 0.65 + tPart);
    }

    let stContribution = 0;
    if (stOff !== 0) {
        if (dt < stLen) {
            stContribution = stOff;
        } else {
            const fade = Math.max(0, 1 - (dt - stLen) / (tDur * 0.7));
            stContribution = stOff * fade;
        }
    }

    const tStart = stLen * 0.85;
    const tU = (dt - tStart) / tDur;
    const tContribution = tAmp * bellWave(tU, desc.t.symmetric, desc.t.peaked);
    return stContribution + tContribution;
}

/**
 * Evaluates atrial fibrillation / flutter / VF / VFlutter background waveforms in mm.
 */
function evalBackgroundWave(tSec, pathologyId, leadName) {
    if (pathologyId === 'v_flutter') {
        const leadScale = LEAD_GAIN_SCALE[leadName] ?? 0.9;
        return 11.5 * leadScale * Math.sin(2 * Math.PI * 5.0 * tSec + (leadName.length * 0.4));
    }
    if (pathologyId === 'v_fib') {
        const phase = leadName.charCodeAt(0) * 0.7;
        const env = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.85 * tSec + phase);
        const wave =
            3.6 * Math.sin(2 * Math.PI * 7.6 * tSec + phase) +
            2.7 * Math.sin(2 * Math.PI * 9.3 * tSec + phase * 1.4) +
            2.1 * Math.sin(2 * Math.PI * 6.1 * tSec + phase * 0.5) +
            1.4 * Math.sin(2 * Math.PI * 11.2 * tSec);
        return wave * env;
    }
    if (pathologyId === 'afib') {
        const strong = ['II', 'III', 'aVF', 'V1'].includes(leadName);
        const amp = strong ? 0.42 : 0.16;
        return amp * (
            Math.sin(2 * Math.PI * 6.3 * tSec + 0.4) +
            0.8 * Math.sin(2 * Math.PI * 7.9 * tSec + 1.1) +
            0.6 * Math.sin(2 * Math.PI * 9.4 * tSec)
        );
    }
    if (pathologyId === 'aflutter') {
        const strong = ['II', 'III', 'aVF', 'V1'].includes(leadName);
        const amp = strong ? 2.1 : 0.65;
        // Sawtooth wave at 300/min (5 Hz)
        const period = 0.20;
        const phase = (tSec % period) / period;
        // Classic negative sawtooth in II/III/aVF, positive in V1
        const saw = phase < 0.72 ? (-1 + (phase / 0.72) * 1.6) : (0.6 - ((phase - 0.72) / 0.28) * 1.6);
        return (leadName === 'V1' ? -saw : saw) * amp;
    }
    return 0;
}

/**
 * Samples the total ECG signal (in mm) at time tSec for a specific lead.
 */
function sampleLeadSignalMm(ecgState, leadName, tSec) {
    const { pathologyId, timeline, leads } = ecgState;
    const desc = leads[leadName];
    let val = evalBackgroundWave(tSec, pathologyId, leadName);

    if (timeline.continuousMode) {
        return val;
    }

    // Blocked / dissociated P waves
    for (const pw of timeline.pOnlyWaves) {
        if (tSec >= pw.time - 0.01 && tSec <= pw.time + (desc.p.dur || 0.1) + 0.02) {
            const pDescForIndependent = { ...desc.p, absent: false };
            val += evalPWave(tSec, pw.time, pDescForIndependent, 'sinus');
        }
    }

    // Conducted / ectopic beats
    for (const b of timeline.beats) {
        if (tSec < b.time - 0.42 || tSec > b.time + 0.48) continue;
        const scale = b.altScale || 1.0;

        if (b.pq > 0) {
            const pStart = b.pTime ?? (b.time - b.pq);
            val += evalPWave(tSec, pStart, desc.p, b.type) * scale;
            const pDur = desc.p.dur || 0.09;
            if (desc.prOffset && tSec >= pStart + pDur * 0.7 && tSec <= b.time + 0.02) {
                const uPr = Math.min(1, (tSec - (pStart + pDur * 0.7)) / (pDur * 0.3));
                const dtQrs = Math.max(0, tSec - b.time);
                const fadeQrs = Math.max(0, 1 - dtQrs / 0.02);
                val += desc.prOffset * uPr * (dtQrs > 0 ? fadeQrs : 1) * scale;
            }
        }
        val += evalQrs(tSec, b.time, desc, b.type, leadName) * scale;
        val += evalStT(tSec, b.time, desc, b.type, leadName) * scale;
    }

    return val;
}

/**
 * Draws the 1 mm and 5 mm red ECG grid onto ctxGrid.
 */
function drawGrid(ctx, canvasWidth, canvasHeight, mmPx, dpr = 1) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const drawLines = (step, color, lineWidth) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        for (let x = step; x < canvasWidth; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
        }
        for (let y = step; y < canvasHeight; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
        }
        ctx.stroke();
    };

    const scale = Math.max(0.75, Math.min(1.4, dpr * 0.65));
    drawLines(mmPx, '#ffd7d7', 0.8 * scale);
    drawLines(mmPx * 5, '#ff9e9e', 1.1 * scale);
}

/**
 * Draws a single lead strip with label, 1 mV calibration pulse, and sampled waveform.
 */
function drawLeadStrip(ctx, ecgState, leadName, x0, yBaseline, widthPx, mmPx, speedMmPerSec, dpr, customLabel = null) {
    const labelText = customLabel || leadName;
    const fontPx = Math.round(Math.max(9.5 * dpr, Math.min(13 * dpr, 4.4 * mmPx)));
    ctx.fillStyle = '#1f2937';
    ctx.font = `bold ${fontPx}px Roboto, sans-serif`;

    const leftPadPx = Math.max(4 * dpr, 2 * mmPx);
    const labelMetric = customLabel ? ctx.measureText(customLabel).width : Math.max(22 * dpr, ctx.measureText('aVR').width);
    const labelWidthPx = Math.max(11 * mmPx, leftPadPx + labelMetric + 2 * dpr);
    const calWidthMm = 5;
    const calPulseWidthMm = 3.5;
    const calX = x0 + labelWidthPx;
    const waveformStartPx = calX + (calWidthMm + 1.5) * mmPx;
    const waveformEndPx = Math.max(waveformStartPx + mmPx, x0 + widthPx - 2 * mmPx);

    // Lead label
    ctx.fillText(labelText, x0 + leftPadPx, yBaseline + Math.max(3 * dpr, 1.4 * mmPx));

    // 1 mV (10 mm) calibration square pulse + lead trace
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = Math.max(1.1, 1.05 * dpr);
    ctx.beginPath();

    ctx.moveTo(calX, yBaseline);
    ctx.lineTo(calX + mmPx, yBaseline);
    ctx.lineTo(calX + mmPx, yBaseline - 10 * mmPx);
    ctx.lineTo(calX + (1 + calPulseWidthMm) * mmPx, yBaseline - 10 * mmPx);
    ctx.lineTo(calX + (1 + calPulseWidthMm) * mmPx, yBaseline);
    ctx.lineTo(waveformStartPx, yBaseline);

    const stepPx = Math.max(1, dpr * 0.9);
    for (let px = waveformStartPx; px <= waveformEndPx; px += stepPx) {
        const mmElapsed = (px - waveformStartPx) / mmPx;
        const tSec = mmElapsed / speedMmPerSec;
        const yValMm = sampleLeadSignalMm(ecgState, leadName, tSec);
        ctx.lineTo(px, yBaseline - yValMm * mmPx);
    }

    ctx.stroke();
}

/**
 * Draws the full ECG canvas from an ecgState object.
 * @param {CanvasRenderingContext2D} ctxEcg
 * @param {CanvasRenderingContext2D} ctxGrid
 * @param {object} ecgState
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {object} renderOpts { viewMode: '12lead' | '6lead' | 'rhythm', speedMmPerSec: 25 | 50, dpr: number, rhythmLabel: string }
 */
function drawEcgState(ctxEcg, ctxGrid, ecgState, canvasWidth, canvasHeight, renderOpts = {}) {
    const viewMode = renderOpts.viewMode || '12lead';
    const speedMmPerSec = renderOpts.speedMmPerSec || 25;
    const dpr = renderOpts.dpr || 1;
    const rhythmLabel = renderOpts.rhythmLabel || 'II (ритм)';

    // Responsive paper density: narrower screens show ~160-250 mm so waves & labels remain crisp and unclipped
    const cssWidth = canvasWidth / dpr;
    const paperWidthMm = cssWidth < 460 ? 180 : 250;
    const mmPx = canvasWidth / paperWidthMm;
    drawGrid(ctxGrid, canvasWidth, canvasHeight, mmPx, dpr);

    ctxEcg.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxEcg.lineJoin = 'round';
    ctxEcg.lineCap = 'round';

    const usableHeight = canvasHeight - Math.max(12 * dpr, 5 * mmPx);

    if (viewMode === '6lead') {
        const limbLeads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
        const rowHeight = usableHeight / (limbLeads.length + 0.7);
        limbLeads.forEach((lead, idx) => {
            const yBaseline = rowHeight * (idx + 0.95);
            drawLeadStrip(ctxEcg, ecgState, lead, 0, yBaseline, canvasWidth, mmPx, speedMmPerSec, dpr);
        });
    } else if (viewMode === 'rhythm') {
        const rhythmLeads = ['II', 'V1', 'V5'];
        const rowHeight = usableHeight / (rhythmLeads.length + 0.55);
        rhythmLeads.forEach((lead, idx) => {
            const yBaseline = rowHeight * (idx + 0.9);
            drawLeadStrip(ctxEcg, ecgState, lead, 0, yBaseline, canvasWidth, mmPx, speedMmPerSec, dpr);
        });
    } else {
        // 12-lead (6 limb on left, 6 precordial on right) + full-width II rhythm strip at bottom
        const limbLeads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
        const chestLeads = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
        const colWidth = canvasWidth / 2;
        const rowHeight = usableHeight / 7.5;

        for (let i = 0; i < 6; i++) {
            const yBaseline = rowHeight * (i + 0.96);
            drawLeadStrip(ctxEcg, ecgState, limbLeads[i], 0, yBaseline, colWidth, mmPx, speedMmPerSec, dpr);
            drawLeadStrip(ctxEcg, ecgState, chestLeads[i], colWidth, yBaseline, colWidth, mmPx, speedMmPerSec, dpr);
        }

        // Column separator line (subtle)
        ctxEcg.strokeStyle = 'rgba(0,0,0,0.18)';
        ctxEcg.lineWidth = Math.max(1, dpr * 0.7);
        ctxEcg.beginPath();
        ctxEcg.moveTo(colWidth, 3 * mmPx);
        ctxEcg.lineTo(colWidth, rowHeight * 6.35);
        ctxEcg.stroke();

        // Full-width bottom rhythm strip (Lead II)
        const yRhythm = rowHeight * 7.05;
        drawLeadStrip(ctxEcg, ecgState, 'II', 0, yRhythm, canvasWidth, mmPx, speedMmPerSec, dpr, rhythmLabel);
    }

    // Paper speed & gain calibration stamp
    ctxEcg.fillStyle = 'rgba(31, 41, 55, 0.78)';
    const stampFontPx = Math.round(Math.max(9.5 * dpr, Math.min(12 * dpr, 3.6 * mmPx)));
    ctxEcg.font = `${stampFontPx}px Roboto, sans-serif`;
    const stamp = `${speedMmPerSec} мм/с · 10 мм/мВ`;
    const textWidth = ctxEcg.measureText(stamp).width;
    ctxEcg.fillText(stamp, canvasWidth - textWidth - Math.max(6 * dpr, 3 * mmPx), canvasHeight - Math.max(4 * dpr, 2 * mmPx));
}

/**
 * Legacy-compatible wrapper if called with amplitudes array.
 */
function drawEcg(ctxEcg, ctxGrid, ecgLeads, ecgAmplitudes, canvasWidth, canvasHeight, sideBySide = false, _dpr = 1) {
    // Kept for backward compatibility if any external caller uses the old signature
    const mmPx = canvasWidth / 250;
    drawGrid(ctxGrid, canvasWidth, canvasHeight, mmPx);
    ctxEcg.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxEcg.fillStyle = '#111827';
    ctxEcg.font = `${Math.round(4.5 * mmPx)}px Roboto, sans-serif`;
    ecgLeads.forEach((lead, i) => {
        const y = (canvasHeight / (ecgLeads.length + 1)) * (i + 1);
        ctxEcg.fillText(`${lead}: ${ecgAmplitudes[i].toFixed(2)}`, 10, y);
    });
}

    EcgApp.drawing = { drawEcgState, drawEcg };
})(typeof globalThis !== 'undefined' ? globalThis : window);
