// --------------------------------------------------------------
    //  Complex arithmetic (robust)
    // --------------------------------------------------------------
    function c(r, i) { return { re: r, im: i }; }
    function add(a, b) { return c(a.re + b.re, a.im + b.im); }
    function mul(a, b) {
        return c(a.re * b.re - a.im * b.im,
                 a.re * b.im + a.im * b.re);
    }
    function div(a, b) {
        let denom = b.re * b.re + b.im * b.im;
        if (denom === 0) return c(Infinity, Infinity);
        return c((a.re * b.re + a.im * b.im) / denom,
                 (a.im * b.re - a.re * b.im) / denom);
    }
    function scale(a, k) { return c(a.re * k, a.im * k); }
    function mag(a) { return Math.hypot(a.re, a.im); }
    function phaseDeg(a) { return Math.atan2(a.im, a.re) * 180 / Math.PI; }

    // polynomial evaluation using iterative power (compatible with original)
    function polyval(coeffs, s) {
        let result = c(0, 0);
        let n = coeffs.length;
        for (let i = 0; i < n; i++) {
            let coeffVal = coeffs[i];
            let power = n - i - 1;
            let term = c(coeffVal, 0);
            for (let j = 0; j < power; j++) {
                term = mul(term, s);
            }
            result = add(result, term);
        }
        return result;
    }

    function parseCoeffs(str) {
        if (!str.trim()) return [1];
        return str.split(",").map(v => {
            let num = parseFloat(v.trim());
            return isNaN(num) ? 0 : num;
        }).filter(v => !isNaN(v));
    }

    // frequency vector generation (logspace)
    function logspace(a, b, n) {
        let arr = new Array(n);
        let step = (b - a) / (n - 1);
        for (let i = 0; i < n; i++) {
            arr[i] = Math.pow(10, a + i * step);
        }
        return arr;
    }

    // ----- Plant model G_base(s) = N(s)/D(s) -----
    function G_base(w, numCoeffs, denCoeffs) {
        let s = c(0, w);
        let N = polyval(numCoeffs, s);
        let D = polyval(denCoeffs, s);
        return div(N, D);
    }

    // ----- Compensator Unified Logic -----
    function Gc(w, a, T, mode) {
        let s = c(0, w);
        let one = c(1, 0);
        let termT = scale(s, T);       // T*s
        let termAT = scale(s, a * T);  // a*T*s
        
        // FIX: Both Lead and Lag use the exact same TF structure: (1 + aTs) / (1 + Ts)
        // Since the UI enforces 'a > 1' for Lead and 'a < 1' for Lag:
        // - Lead (a > 1): High freq limit is 'a', boosting gain and creating phase lead.
        // - Lag (a < 1): High freq limit is 'a', attenuating gain and creating phase lag.
        let num = add(one, termAT);
        let den = add(one, termT);
        return div(num, den);
    }

    // unwrap phase to avoid -180/180 jumps for smoother plotting
    function unwrapPhase(phaseArr) {
        let out = new Array(phaseArr.length);
        if (phaseArr.length === 0) return out;
        out[0] = phaseArr[0];
        let offset = 0;
        for (let i = 1; i < phaseArr.length; i++) {
            let diff = phaseArr[i] - phaseArr[i-1];
            if (diff > 180) offset -= 360;
            else if (diff < -180) offset += 360;
            out[i] = phaseArr[i] + offset;
        }
        return out;
    }

    // find gain crossover (mag=0 dB) and phase crossover (phase=-180°)
    function findCrossings(w, magDB, phaseDegArr) {
        let wcg = null, wcp = null, PM = null, GM = null;

        // Gain crossover: magnitude crosses 0 dB
        for (let i = 1; i < w.length; i++) {
            let m1 = magDB[i-1], m2 = magDB[i];
            if ((m1 >= 0 && m2 <= 0) || (m1 <= 0 && m2 >= 0)) {
                let t = (0 - m1) / (m2 - m1);
                if (isFinite(t) && t >= 0 && t <= 1) {
                    wcg = w[i-1] + t * (w[i] - w[i-1]);
                    let ph_interp = phaseDegArr[i-1] + t * (phaseDegArr[i] - phaseDegArr[i-1]);
                    PM = 180 + ph_interp;
                    break;
                }
            }
        }

        // Phase crossover: phase crosses -180°
        for (let i = 1; i < w.length; i++) {
            let p1 = phaseDegArr[i-1], p2 = phaseDegArr[i];
            if ((p1 >= -180 && p2 <= -180) || (p1 <= -180 && p2 >= -180)) {
                let t = (-180 - p1) / (p2 - p1);
                if (isFinite(t) && t >= 0 && t <= 1) {
                    wcp = w[i-1] + t * (w[i] - w[i-1]);
                    let mag_interp = magDB[i-1] + t * (magDB[i] - magDB[i-1]);
                    GM = -mag_interp;
                    break;
                }
            }
        }
        return { wcg, wcp, PM, GM };
    }

    // ---------- Helper: format polynomial as readable string (high power first) ----------
    function formatPoly(coeffs, varName = 's') {
        if (!coeffs || coeffs.length === 0) return '0';
        let terms = [];
        let degree = coeffs.length - 1;
        for (let i = 0; i < coeffs.length; i++) {
            let coef = coeffs[i];
            if (Math.abs(coef) < 1e-12) continue; // skip zero terms
            let power = degree - i;
            let absCoef = Math.abs(coef);
            let coefStr = (Math.abs(absCoef - 1) < 1e-10 && power !== 0) ? '' : absCoef.toFixed(4).replace(/\.?0+$/, '');
            if (coefStr === '' && power === 0) coefStr = '1';
            let sign = (coef >= 0) ? (terms.length === 0 ? '' : '+') : '-';
            let term = '';
            if (power === 0) {
                term = `${coefStr === '' ? '1' : coefStr}`;
            } else if (power === 1) {
                term = `${coefStr !== '' ? coefStr : ''}${varName}`;
            } else {
                term = `${coefStr !== '' ? coefStr : ''}${varName}^${power}`;
            }
            if (term === '') term = '1';
            terms.push(`${sign} ${term}`);
        }
        if (terms.length === 0) return '0';
        let result = terms.join(' ').replace(/\+ -/g, '- ');
        if (result.startsWith('+ ')) result = result.substring(2);
        return result.trim();
    }

    // Plain text version for display without LaTeX (more readable in div)
    function formatTFPlain(numCoeffs, denCoeffs) {
        let numStr = formatPoly(numCoeffs, 's');
        let denStr = formatPoly(denCoeffs, 's');
        if (numStr === '0') return 'G(s) = 0';
        if (denStr === '0') return 'G(s) = ∞';
        if (denStr === '') denStr = '1';
        if (numStr === '') numStr = '0';
        return `G(s) = ${numStr}  /  (${denStr})`;
    }

    // ---------- Global DOM elements ----------
    const numInput = document.getElementById('numInput');
    const denInput = document.getElementById('denInput');
    const aInput = document.getElementById('aInput');
    const TInput = document.getElementById('TInput');
    const modeSel = document.getElementById('modeSel');
    const infoBox = document.getElementById('infoBox');
    const tfStringDiv = document.getElementById('tfString');

    // frequency axis: 800 points from 10^-2 to 10^3 rad/s (covers typical range)
    let w = logspace(-2, 3, 800);   // 0.01 to 1000 rad/s

    function getNumCoeffs() { return parseCoeffs(numInput.value); }
    function getDenCoeffs() { return parseCoeffs(denInput.value); }

    // Update plant TF display
    function updatePlantTFDisplay() {
        let numC = getNumCoeffs();
        let denC = getDenCoeffs();
        let plainTF = formatTFPlain(numC, denC);
        // Beautify with span elements and better visual
        let numeratorPoly = formatPoly(numC, 's');
        let denominatorPoly = formatPoly(denC, 's');
        if (denominatorPoly === '') denominatorPoly = '1';
        if (numeratorPoly === '') numeratorPoly = '0';
        
        tfStringDiv.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; align-items:baseline; gap:6px;">
                <span style="background:#0b2b44; padding:2px 8px; border-radius:20px; font-size:0.7rem;">TF</span>
                <span style="font-family: monospace; font-size: 1rem; letter-spacing:0.3px;">G(s) =</span>
                <div style="display: inline-flex; flex-direction: column; align-items: center;">
                    <span style="border-bottom: 2px solid #5f8fd9; padding: 0 8px;">${escapeHtml(numeratorPoly)}</span>
                    <span style="padding-top: 2px;">${escapeHtml(denominatorPoly)}</span>
                </div>
            </div>
            <div style="font-size: 0.7rem; color:#87a9dd; margin-top: 8px; border-top: 1px solid #1e2f4a; padding-top: 6px;">
            ⚡ coefficients: [${numC.map(v=>v.toFixed(4)).join(', ')}] / [${denC.map(v=>v.toFixed(4)).join(', ')}]
            </div>
        `;
    }
    
    function escapeHtml(str) { return str; } // simple, no dangerous chars
    
    // Core update: compute all frequency responses, plots, margins
    function update() {
        // read parameters
        let a = parseFloat(aInput.value);
        let T = parseFloat(TInput.value);
        let mode = modeSel.value;

        // sanitize for lead/lag boundaries
        if (mode === "lead" && a <= 1.0) {
            a = 1.01;
            aInput.value = a.toFixed(4);
        }
        if (mode === "lag" && a >= 1.0) {
            a = 0.99;
            aInput.value = a.toFixed(4);
        }
        if (T <= 1e-8) T = 1e-8;
        if (isNaN(a)) a = 1;
        if (isNaN(T)) T = 0.01;

        let numCoeffs = getNumCoeffs();
        let denCoeffs = getDenCoeffs();
        
        // Update the plant TF display every time
        updatePlantTFDisplay();

        // arrays for responses
        let mag_b = new Array(w.length);
        let mag_c = new Array(w.length);
        let mag_t = new Array(w.length);
        let ph_b = new Array(w.length);
        let ph_c = new Array(w.length);
        let ph_t = new Array(w.length);

        // compute pointwise
        for (let i = 0; i < w.length; i++) {
            let omega = w[i];
            let Gb = G_base(omega, numCoeffs, denCoeffs);
            let Gc_val = Gc(omega, a, T, mode);
            let Gtotal = mul(Gb, Gc_val);

            mag_b[i] = 20 * Math.log10(mag(Gb) + 1e-12);
            mag_c[i] = 20 * Math.log10(mag(Gc_val) + 1e-12);
            mag_t[i] = 20 * Math.log10(mag(Gtotal) + 1e-12);

            ph_b[i] = phaseDeg(Gb);
            ph_c[i] = phaseDeg(Gc_val);
            ph_t[i] = phaseDeg(Gtotal);
        }

        // Unwrap phases for smooth plotting (total and plant)
        let ph_t_unwrap = unwrapPhase(ph_t);
        let ph_b_unwrap = unwrapPhase(ph_b);
        let ph_c_unwrap = unwrapPhase(ph_c);

        // Find margins for compensated system
        let cross = findCrossings(w, mag_t, ph_t_unwrap);
        let cross_base = findCrossings(w, mag_b, ph_b_unwrap);

        // ----- MAGNITUDE PLOT (dB) -----
        Plotly.react('magPlot', [
            { x: w, y: mag_b, name: '🌿 Uncompensated Plant', line: { width: 2.5, color: '#3b82f6' }, mode: 'lines' },
            { x: w, y: mag_c, name: '⚙️ Compensator Gc(s)', line: { width: 2, color: '#f97316', dash: 'dot' }, mode: 'lines' },
            { x: w, y: mag_t, name: '✨ Compensated Total (Plant + Gc)', line: { width: 3, color: '#10b981' }, mode: 'lines' }
        ], {
            title: { text: '📊 Bode Magnitude Diagram — Uncompensated vs Compensated', font: { size: 14, color: '#eef2ff' } },
            xaxis: { type: 'log', title: 'Frequency ω (rad/s)', gridcolor: '#1e2a44', color: '#ccddf8', zerolinecolor: '#3b4b6e' },
            yaxis: { title: 'Magnitude (dB)', gridcolor: '#1e2a44', color: '#ccddf8', zerolinecolor: '#4f7bc0', zerolinewidth: 1.5 },
            template: 'plotly_dark',
            legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1, bgcolor: 'rgba(0,0,0,0.6)' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: '#0b1022'
        });

        // Phase plot with 0° and -180° reference lines
        let phaseShapes = [
            { type: 'line', x0: w[0], x1: w[w.length-1], y0: 0, y1: 0, line: { color: '#facc15', width: 1.5, dash: 'dash' }, name: '0° ref' },
            { type: 'line', x0: w[0], x1: w[w.length-1], y0: -180, y1: -180, line: { color: '#ef4444', width: 1.5, dash: 'dot' }, name: '-180°' }
        ];

        Plotly.react('phasePlot', [
            { x: w, y: ph_b_unwrap, name: '🌿 Uncompensated Plant Phase', line: { width: 2.5, color: '#3b82f6' } },
            { x: w, y: ph_c_unwrap, name: '⚙️ Compensator Phase', line: { width: 2, color: '#f97316', dash: 'dot' } },
            { x: w, y: ph_t_unwrap, name: '✨ Compensated Total Phase', line: { width: 3, color: '#10b981' } }
        ], {
            title: { text: '📐 Bode Phase Diagram — Phase Margin Enhancement', font: { size: 14, color: '#eef2ff' } },
            xaxis: { type: 'log', title: 'Frequency ω (rad/s)', gridcolor: '#1e2a44', color: '#ccddf8' },
            yaxis: { title: 'Phase (degrees)', gridcolor: '#1e2a44', color: '#ccddf8', zerolinecolor: '#facc15' },
            shapes: phaseShapes,
            template: 'plotly_dark',
            legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1, bgcolor: 'rgba(0,0,0,0.6)' },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: '#0b1022'
        });

        // Helper format numbers
        function fmt(val) { return (val !== null && isFinite(val)) ? val.toFixed(4) : '—'; }
        function fmtPM(val) { return (val !== null && isFinite(val)) ? val.toFixed(2) + '°' : '—'; }

        let uncompPM = cross_base.PM;
        let compPM = cross.PM;
        let uncompWcg = cross_base.wcg;
        let compWcg = cross.wcg;
        
        let gmInfo = '';
        if (cross.GM !== null && isFinite(cross.GM)) gmInfo = ` | GM: ${cross.GM.toFixed(2)} dB`;
        
        infoBox.innerHTML = `
            <div class="badge-mode" style="margin-bottom: 10px;">🔍 MARGINS & CROSSOVER</div>
            <b>🌿 Uncompensated Plant</b><br>
            ω<sub>gc</sub> : ${fmt(uncompWcg)} rad/s <br>
            PM : ${fmtPM(uncompPM)} <br>
            <span style="font-size: 12px;">Phase margin (plant only)</span><br><br>
            <b>✅ Compensated System (${mode === 'lead' ? 'Lead' : 'Lag'})</b><br>
            ω<sub>gc</sub> : ${fmt(compWcg)} rad/s <br>
            PM : ${fmtPM(compPM)} ${gmInfo}<br>
            <hr>
            <span style="font-size:12px;">⚙️ a = ${a.toFixed(4)} &nbsp;| T = ${T.toExponential(4)}</span><br>
            <span style="font-size:11px; color:#7c9bd0;">${mode === 'lead' ? '➕ Lead increases PM, boosts bandwidth' : '➖ Lag improves steady-state error'}</span>
            <div style="margin-top: 10px; font-size:11px; color:#6e8bb8;">🔁 Uncompensated plant TF shown above</div>
        `;
    }

    // Event listeners
    function attachEvents() {
        numInput.addEventListener('input', () => update());
        denInput.addEventListener('input', () => update());
        aInput.addEventListener('input', () => update());
        TInput.addEventListener('input', () => update());
        modeSel.addEventListener('change', () => {
            let a = parseFloat(aInput.value);
            let mode = modeSel.value;
            if (mode === 'lead' && a <= 1.0) aInput.value = '2.0';
            if (mode === 'lag' && a >= 1.0) aInput.value = '0.5';
            update();
        });
    }

    attachEvents();
    update();  // initial rendering with plant TF shown
    
    // resize handling
    window.addEventListener('resize', () => {
        Plotly.relayout('magPlot', {});
        Plotly.relayout('phasePlot', {});
    });