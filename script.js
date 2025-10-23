/*
  Linear Regression Practice (vanilla JS + Chart.js)
  - Generates a reproducible dataset (x, y) from a linear model with noise
  - Lets students adjust w0 and w1 via sliders and see the line update
  - Shows MSE for the current line
  - Provides a CSV download of the dataset
*/

(function () {
  // --- deterministic random number generator (LCG) ---
  function createLCG(seed) {
    // Numerical Recipes LCG
    let state = seed >>> 0;
    return function rand() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0xffffffff;
    };
  }

  // Gaussian noise via Box-Muller, using provided RNG
  function gaussian(rng, mean = 0, std = 1) {
    // Use Box–Muller transform
    let u = 0, v = 0;
    while (u === 0) u = rng(); // avoid 0
    while (v === 0) v = rng();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + std * z;
  }

  function randomIntInclusive(rng, a, b) {
    const t = rng();
    return Math.floor(a + (b - a + 1) * t);
  }

  // Generate a new problem: random polynomial degree 1..4 with moderate coefficients
  function generatePolynomialProblem(seed) {
    const rng = createLCG(seed >>> 0);
    const degree = randomIntInclusive(rng, 1, 4);

    const coeffs = [];
    for (let k = 0; k <= degree; k++) {
      const range = k === 0 ? 3.0 : (k === 1 ? 2.0 : 1.0);
      const coeff = (rng() * 2 - 1) * range; // [-range, range]
      coeffs.push(coeff);
    }

    const NOISE_STD = 1.0;
    const N = 40;
    const X_MIN = -5;
    const X_MAX = 5;

    const points = Array.from({ length: N }, () => {
      const x = X_MIN + (X_MAX - X_MIN) * rng();
      let yDet = 0;
      let xPow = 1; // x^0 initially
      for (let k = 0; k <= degree; k++) {
        if (k > 0) xPow *= x;
        yDet += coeffs[k] * xPow;
      }
      const y = yDet + gaussian(rng, 0, NOISE_STD);
      return { x, y };
    });

    // Bounds
    const xVals = points.map(d => d.x);
    const yVals = points.map(d => d.y);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);
    const xPad = (maxX - minX) * 0.06;
    const yPad = (maxY - minY) * 0.12;

    return {
      seed,
      degree,
      coefficients: coeffs,
      data: points,
      minX,
      maxX,
      minY,
      maxY,
      xPad,
      yMinFixed: minY - yPad,
      yMaxFixed: maxY + yPad
    };
  }

  // Initial problem (fixed seed for reproducibility)
  let state = generatePolynomialProblem(12345);

  // UI elements
  const paramControls = document.getElementById('paramControls');
  const mseEl = document.getElementById('mse');
  const modelEqEl = document.getElementById('modelEq');
  const downloadBtn = document.getElementById('downloadCsv');
  const newProblemBtn = document.getElementById('newProblem');

  // Adjustable model weights (match current degree)
  let weights = [];

  function initWeightsForDegree(degree) {
    weights = new Array(degree + 1).fill(0);
    if (degree >= 1) weights[1] = 1; // start with slope 1 for visibility
  }

  // Build sliders dynamically for current degree
  function rebuildControls() {
    if (!paramControls) return;
    paramControls.innerHTML = '';
    for (let k = 0; k < weights.length; k++) {
      const control = document.createElement('div');
      control.className = 'control';

      const label = document.createElement('label');
      label.setAttribute('for', `w${k}`);
      label.innerHTML = `w${k}${k === 0 ? ' (intercept)' : ''}: <span id="w${k}Value">${weights[k].toFixed(2)}</span>`;

      const input = document.createElement('input');
      input.type = 'range';
      input.id = `w${k}`;
      input.min = '-10';
      input.max = '10';
      input.step = '0.01';
      input.value = String(weights[k]);
      input.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        weights[k] = v;
        const span = document.getElementById(`w${k}Value`);
        if (span) span.textContent = v.toFixed(2);
        updateUI();
      });

      control.appendChild(label);
      control.appendChild(input);
      paramControls.appendChild(control);
    }
  }

  // Evaluate polynomial and generate smooth curve points
  function evalPoly(coeffs, x) {
    let sum = 0;
    let xPow = 1;
    for (let k = 0; k < coeffs.length; k++) {
      if (k > 0) xPow *= x;
      sum += coeffs[k] * xPow;
    }
    return sum;
  }

  function modelCurvePoints(coeffs) {
    const xA = state.minX - state.xPad;
    const xB = state.maxX + state.xPad;
    const steps = 200;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = xA + (xB - xA) * t;
      const y = evalPoly(coeffs, x);
      pts.push({ x, y });
    }
    return pts;
  }

  // Mean Squared Error between data and current polynomial
  function computeMSE(coeffs) {
    const n = state.data.length;
    if (n === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const { x, y } = state.data[i];
      const yHat = evalPoly(coeffs, x);
      const diff = y - yHat;
      sum += diff * diff;
    }
    return sum / n;
  }

  // --- Chart.js setup ---
  const ctx = document.getElementById('chart').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Data',
          data: state.data.map(d => ({ x: d.x, y: d.y })),
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--data').trim() || '#1f77b4',
          pointRadius: 4,
          borderWidth: 0,
          showLine: false
        },
        {
          label: 'Model',
          data: [],
          type: 'line',
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#d62728',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: true, labels: { usePointStyle: true } },
        tooltip: { mode: 'nearest', intersect: false }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'x' },
          grid: { color: 'rgba(0,0,0,0.06)' },
          min: state.minX - state.xPad,
          max: state.maxX + state.xPad
        },
        y: {
          type: 'linear',
          title: { display: true, text: 'y' },
          grid: { color: 'rgba(0,0,0,0.06)' },
          min: state.yMinFixed,
          max: state.yMaxFixed
        }
      }
    }
  });

  function formatSymbolicPolynomial(degree) {
    if (degree <= 0) return 'w0';
    const terms = [];
    for (let k = 0; k <= degree; k++) {
      if (k === 0) terms.push('w0');
      else if (k === 1) terms.push('w1·x');
      else terms.push(`w${k}·x^${k}`);
    }
    return terms.join(' + ');
  }

  function updateUI() {
    // Update model curve
    chart.data.datasets[1].data = modelCurvePoints(weights);
    chart.update();
    // Update MSE
    const mse = computeMSE(weights);
    mseEl.textContent = mse.toFixed(3);
    // Update explicit model equation display
    if (modelEqEl) {
      const degree = Math.max(0, (weights?.length || 1) - 1);
      modelEqEl.textContent = `y = ${formatSymbolicPolynomial(degree)}`;
    }
  }

  // Dynamic sliders are built in rebuildControls() and update the UI on input

  // CSV download
  downloadBtn.addEventListener('click', () => {
    const rows = [
      ['x', 'y'],
      ...state.data.map(p => [p.x, p.y])
    ];
    const csv = rows.map(r => r.map(v => typeof v === 'number' ? v.toFixed(6) : String(v)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'regression_data.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // New Problem: regenerate dataset from a random polynomial and reset UI
  newProblemBtn.addEventListener('click', () => {
    const seed = (window.crypto && window.crypto.getRandomValues)
      ? window.crypto.getRandomValues(new Uint32Array(1))[0]
      : Math.floor(Math.random() * 0xffffffff);
    state = generatePolynomialProblem(seed);

    // Initialize weights and rebuild controls
    initWeightsForDegree(state.degree);
    rebuildControls();

    // Update chart data and axis bounds
    chart.data.datasets[0].data = state.data.map(d => ({ x: d.x, y: d.y }));
    chart.data.datasets[1].data = modelCurvePoints(weights);
    chart.options.scales.x.min = state.minX - state.xPad;
    chart.options.scales.x.max = state.maxX + state.xPad;
    chart.options.scales.y.min = state.yMinFixed;
    chart.options.scales.y.max = state.yMaxFixed;

    updateUI();
  });

  // Initial render
  initWeightsForDegree(state.degree);
  rebuildControls();
  updateUI();
})();
