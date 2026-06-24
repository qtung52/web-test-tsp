const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
let cities = [];
let tour = [];
let currentAlgo = 'nn';
let lastRect = { width: 0, height: 0 };

const algoInfo = {
  nn: { 
    name: 'Nearest Neighbor (Heuristic)', 
    complexity: 'O(n²)', 
    quality: 'badge-amber', 
    qualityText: 'Xấp xỉ', 
    desc: 'Bắt đầu từ một thành phố, luôn đi đến thành phố gần nhất chưa thăm. Nhanh nhưng không tối ưu — kết quả thường dài hơn tối ưu ~20-25%. Ứng dụng nhiều trong logistics thực tế khi số điểm lớn.' 
  },
  '2opt': { 
    name: '2-Opt Improvement', 
    complexity: 'O(n²)', 
    quality: 'badge-green', 
    qualityText: 'Tốt hơn NN', 
    desc: 'Bắt đầu từ tour Nearest Neighbor, sau đó thử hoán đổi từng cặp cạnh. Nếu hoán đổi rút ngắn tổng đường, giữ lại — lặp đến khi không còn cải thiện. Thường tốt hơn NN từ 10% đến 15%.' 
  },
  exact: { 
    name: 'Brute Force (Exact)', 
    complexity: 'O(n!)', 
    quality: 'badge-red', 
    qualityText: 'Tối ưu', 
    desc: 'Thử mọi hoán vị của các thành phố để tìm tour ngắn nhất. Đảm bảo tối ưu toàn cục nhưng chỉ khả thi với n ≤ 8. Với n=20: 20! ≈ 2.4 × 10¹⁸ trường hợp.' 
  }
};

// Helper function to query theme color variables from CSS
function getThemeColor(variableName) {
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

function setAlgo(a) {
  currentAlgo = a;
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + a).classList.add('active');
  document.getElementById('exact-warn').style.display = (a === 'exact') ? 'inline-flex' : 'none';
  updateAlgoInfo();
  if (tour.length) runAlgo();
}

function updateAlgoInfo() {
  const info = algoInfo[currentAlgo];
  document.getElementById('algo-info').innerHTML =
    `<div class="info-header">
       <span class="info-title">${info.name}</span>
       <span class="badge ${info.quality}">${info.qualityText}</span>
       <span class="badge badge-blue">${info.complexity}</span>
     </div>
     <div class="info-desc">${info.desc}</div>`;
  document.getElementById('stat-complexity').textContent = info.complexity;
}

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return { 
    x: e.clientX - rect.left, 
    y: e.clientY - rect.top 
  };
}

function addCity(e) {
  const { x, y } = getCanvasCoords(e);
  cities.push({ x, y });
  tour = [];
  draw();
  document.getElementById('stat-cities').textContent = cities.length;
  document.getElementById('stat-dist').textContent = '—';
  document.getElementById('stat-time').textContent = '—';
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function tourLength(t) {
  let d = 0;
  for (let i = 0; i < t.length; i++) {
    d += dist(cities[t[i]], cities[t[(i + 1) % t.length]]);
  }
  return d;
}

function nearestNeighbor() {
  if (cities.length < 2) return [...Array(cities.length).keys()];
  const visited = new Array(cities.length).fill(false);
  const t = [0]; 
  visited[0] = true;
  while (t.length < cities.length) {
    const last = t[t.length - 1];
    let best = -1, bd = Infinity;
    for (let i = 0; i < cities.length; i++) {
      if (!visited[i]) { 
        const d = dist(cities[last], cities[i]); 
        if (d < bd) { bd = d; best = i; } 
      }
    }
    t.push(best); 
    visited[best] = true;
  }
  return t;
}

function twoOpt(t) {
  let improved = true, tour = [...t];
  while (improved) {
    improved = false;
    for (let i = 0; i < tour.length - 1; i++) {
      for (let j = i + 2; j < tour.length; j++) {
        if (j === tour.length - 1 && i === 0) continue;
        const d1 = dist(cities[tour[i]], cities[tour[i+1]]) + dist(cities[tour[j]], cities[tour[(j+1) % tour.length]]);
        const d2 = dist(cities[tour[i]], cities[tour[j]]) + dist(cities[tour[i+1]], cities[tour[(j+1) % tour.length]]);
        if (d2 < d1 - 0.001) {
          tour = [...tour.slice(0,i+1), ...tour.slice(i+1,j+1).reverse(), ...tour.slice(j+1)];
          improved = true;
        }
      }
    }
  }
  return tour;
}

function brute(n) {
  if (n > 8) return nearestNeighbor();
  const indices = [...Array(n).keys()].slice(1);
  let bestT = [0, ...indices], bestD = tourLength(bestT);
  function permute(arr, l) {
    if (l === arr.length) {
      const t = [0, ...arr];
      const d = tourLength(t);
      if (d < bestD) { bestD = d; bestT = [...t]; }
      return;
    }
    for (let i = l; i < arr.length; i++) {
      [arr[l], arr[i]] = [arr[i], arr[l]];
      permute(arr, l + 1);
      [arr[l], arr[i]] = [arr[i], arr[l]];
    }
  }
  permute(indices, 0);
  return bestT;
}

function runAlgo() {
  if (cities.length < 2) { 
    updateAlgoInfo(); 
    return; 
  }
  updateAlgoInfo();
  const t0 = performance.now();
  if (currentAlgo === 'nn') {
    tour = nearestNeighbor();
  } else if (currentAlgo === '2opt') {
    tour = twoOpt(nearestNeighbor());
  } else {
    tour = brute(cities.length);
  }
  const elapsed = (performance.now() - t0).toFixed(1);
  const d = tourLength(tour);
  document.getElementById('stat-dist').textContent = Math.round(d);
  document.getElementById('stat-time').textContent = elapsed;
  draw();
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  
  ctx.clearRect(0, 0, W, H);
  
  const bg = getThemeColor('--canvas-bg');
  const pathColor = getThemeColor('--canvas-path');
  const pathFillColor = getThemeColor('--canvas-path-fill');
  const nodeColor = getThemeColor('--canvas-node');
  const nodeActiveColor = getThemeColor('--canvas-node-active');
  const nodeBorderColor = getThemeColor('--canvas-node-border');
  const textColor = getThemeColor('--canvas-text');
  
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Draw Tour Path
  if (tour.length > 1) {
    ctx.beginPath();
    ctx.moveTo(cities[tour[0]].x, cities[tour[0]].y);
    for (let i = 1; i < tour.length; i++) {
      ctx.lineTo(cities[tour[i]].x, cities[tour[i]].y);
    }
    ctx.closePath();
    
    ctx.fillStyle = pathFillColor;
    ctx.fill();
    
    ctx.strokeStyle = pathColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Draw Cities/Nodes
  cities.forEach((c, i) => {
    const isStart = (tour.length && tour[0] === i);
    
    if (isStart) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = getThemeColor('--bg-amber-light') || 'rgba(245, 158, 11, 0.2)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(c.x, c.y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = isStart ? nodeActiveColor : nodeColor;
    ctx.fill();
    
    ctx.strokeStyle = nodeBorderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i + 1, c.x, c.y + 18);
  });

  // Empty State Instruction
  if (!cities.length) {
    ctx.fillStyle = getThemeColor('--text-muted');
    ctx.font = '400 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Click trên bản đồ để thêm thành phố, hoặc chọn demo', W / 2, H / 2);
  }
}

function addRandom(n) {
  const rect = canvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  for (let i = 0; i < n; i++) {
    cities.push({ 
      x: 40 + Math.random() * (W - 80), 
      y: 40 + Math.random() * (H - 80) 
    });
  }
  tour = [];
  document.getElementById('stat-cities').textContent = cities.length;
  document.getElementById('stat-dist').textContent = '—';
  document.getElementById('stat-time').textContent = '—';
  draw();
}

function reset() {
  cities = []; 
  tour = [];
  document.getElementById('stat-cities').textContent = 0;
  document.getElementById('stat-dist').textContent = '—';
  document.getElementById('stat-time').textContent = '—';
  draw();
}

function loadDemo() {
  reset();
  const rect = canvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  const pts = [
    [0.5, 0.5], [0.25, 0.35], [0.7, 0.25], [0.15, 0.65], [0.8, 0.6],
    [0.4, 0.75], [0.6, 0.45], [0.35, 0.2], [0.85, 0.35], [0.1, 0.3]
  ];
  cities = pts.map(([rx, ry]) => ({ 
    x: 30 + rx * (W - 60), 
    y: 30 + ry * (H - 60) 
  }));
  document.getElementById('stat-cities').textContent = cities.length;
  draw();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  if (cities.length && lastRect.width > 0 && lastRect.height > 0) {
    const sx = rect.width / lastRect.width;
    const sy = rect.height / lastRect.height;
    cities = cities.map(c => ({ x: c.x * sx, y: c.y * sy }));
  }
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  lastRect = { width: rect.width, height: rect.height };
  draw();
}

// Event Bindings
document.addEventListener('DOMContentLoaded', () => {
  canvas.addEventListener('click', addCity);
  
  document.querySelectorAll('.algo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const algo = e.currentTarget.getAttribute('data-algo');
      setAlgo(algo);
    });
  });
  
  document.getElementById('btn-run').addEventListener('click', runAlgo);
  document.getElementById('btn-add-8').addEventListener('click', () => addRandom(8));
  document.getElementById('btn-add-15').addEventListener('click', () => addRandom(15));
  document.getElementById('btn-reset').addEventListener('click', reset);
  document.getElementById('btn-demo').addEventListener('click', loadDemo);
  
  resizeCanvas();
  updateAlgoInfo();
  
  window.addEventListener('resize', resizeCanvas);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
});
