const firebaseConfig = {
  apiKey: "AIzaSyDJ13KUPRF36vM7HH9PfBPKdSQi7KMNkCw",
  authDomain: "pressure-monitor-99f94.firebaseapp.com",
  databaseURL: "https://pressure-monitor-99f94-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pressure-monitor-99f94",
  storageBucket: "pressure-monitor-99f94.firebasestorage.app",
  messagingSenderId: "355403386532",
  appId: "1:355403386532:web:2ea88adfb28db15013a031"
};

// ✅ Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
console.log("Firebase initialized");

const heatmapContainer = document.getElementById('heatmapContainer');

// 👇 สร้าง canvas
const canvas = document.createElement('canvas');
canvas.id = 'pressuremapCanvas';
canvas.width = 600;
canvas.height = 600;
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '1';
heatmapContainer.appendChild(canvas);

const ctx = canvas.getContext('2d');

const sensorMap = {
  left: { x: 336, y: 414 },
  middle: { x: 302, y: 278 },
  right: { x: 271, y: 414 }
};

let examplePoints = [];

// ฟังก์ชันแปลงค่าความดันเป็นสี
function getColor(value) {
  if (value === undefined || value === null || value == 0.0) return 'gray';  // ถ้าไม่มีค่า ให้แสดงสีเทา
  if (value <= 996.875) return 'green';
  if (value <= 2187.5) return 'yellow';
  return 'red';
}
// 🔄 ดึงข้อมูลแบบ real-time
database.ref('pressure').on('child_changed', function(snapshot) {
  console.log('🔁 child changed:', snapshot.key, snapshot.val());

  database.ref('pressure').once('value').then(snap => {
    const data = snap.val();
    const leftValue = typeof data.left === 'number' ? data.left : (data.left?.value || 0);
    const middleValue = typeof data.middle === 'number' ? data.middle : (data.middle?.value || 0);
    const rightValue = typeof data.right === 'number' ? data.right : (data.right?.value || 0);
    console.log("Firebase data:", data);
    if (!data) {
      console.log("No data found.");
    }

    examplePoints = [];  // Clear previous points

  // ตรวจสอบว่ามีค่าความดันในแต่ละเซ็นเซอร์หรือไม่
    examplePoints.push({
      x: sensorMap.left.x,
      y: sensorMap.left.y,
      value: leftValue
    });
    examplePoints.push({
      x: sensorMap.middle.x,
      y: sensorMap.middle.y,
      value: middleValue
    });
    examplePoints.push({
      x: sensorMap.right.x,
      y: sensorMap.right.y,
      value: rightValue
    });

    drawCircles();
    updateSensorValues({ 
      left: { value: leftValue },
      middle: { value: middleValue },
      right: { value: rightValue }
    });
  });
});

function updateSensorValues(data) {
  const leftValueRaw = data.left.value;
  const middleValueRaw = data.middle.value;
  const rightValueRaw = data.right.value;

  const leftValue = (leftValueRaw * 131.04 / 4095).toFixed(2);
  const middleValue = (middleValueRaw * 131.04 / 4095).toFixed(2);
  const rightValue = (rightValueRaw * 131.04 / 4095).toFixed(2);

  console.log(`Sensor values: Left: ${leftValue}, Middle: ${middleValue}, Right: ${rightValue}`);
  // แสดงค่าความดันใน DOM
  document.getElementById("sensor1").textContent = `KneeLeft: ${leftValue}`;
  document.getElementById("sensor2").textContent = `Bottom: ${middleValue}`;
  document.getElementById("sensor3").textContent = `KneeRight: ${rightValue}`;

  // เปลี่ยนสีของเซ็นเซอร์ตามค่าความดัน
  document.getElementById("sensor1").style.backgroundColor = getColor(leftValueRaw);
  document.getElementById("sensor2").style.backgroundColor = getColor(middleValueRaw);
  document.getElementById("sensor3").style.backgroundColor = getColor(rightValueRaw);
  examplePoints = [
    { x: sensorMap.left.x, y: sensorMap.left.y, value: left },
    { x: sensorMap.middle.x, y: sensorMap.middle.y, value: middle },
    { x: sensorMap.right.x, y: sensorMap.right.y, value: right }
  ];
  drawCircles();
}

// วาดจุด
function drawCircles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log("Drawing circles...");
    examplePoints.forEach(p => {
        const color = getColor(p.value);
        console.log(`x: ${p.x}, y: ${p.y}, Value: ${p.value}, Color: ${getColor(p.value)}`);  // ตรวจสอบค่าความดันและสีที่ได้
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, 2 * Math.PI);  // วาดจุด
        ctx.fillStyle = getColor(p.value);
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
}

function saveToHistory(left, middle, right) {
  const timestamp = Date.now();
  database.ref('history/' + timestamp).set({ left, middle, right });
}

// ✅ ดึงข้อมูลจาก Firebase ทุกครั้งที่มีการเปลี่ยนแปลง
database.ref('pressure').on('child_changed', () => {
  database.ref('pressure').once('value').then(snapshot => {
    const data = snapshot.val();
    const left = data.left?.value || data.left || 0;
    const middle = data.middle?.value || data.middle || 0;
    const right = data.right?.value || data.right || 0;
    updateSensorValues({ left, middle, right });
    // จะบันทึกข้อมูลแค่ตอนที่ครบ 10 นาที โดยใช้ global flag
    lastSaved = checkAndSaveEvery10Mins(left, middle, right);
  });
});

let lastSaved = 0;
function checkAndSaveEvery10Mins(left, middle, right) {
  const now = Date.now();
  if (now - lastSaved > 10 * 60 * 1000) {
    saveToHistory(left, middle, right);
    return now;
  }
  return lastSaved;
}

function generateInitialTimestamps() {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const timestamps = [];
  for (let i = 0; i <= 60; i += 10) {
    timestamps.push(new Date(oneHourAgo + i * 60 * 1000));  // ทุก 10 นาที
  }
  return timestamps;
}

const initialLabels = generateInitialTimestamps();
const emptyData = new Array(initialLabels.length).fill(null); // หรือ .fill(0) ถ้าอยากเห็นเส้นที่ระดับ 0

const chart = new Chart(ctxChart, {
  type: 'line',
  data: {
    labels: initialLabels,
    datasets: [
      {
        label: 'KneeLeft',
        data: emptyData.slice(),
        borderColor: 'red',
        borderWidth: 2,
        tension: 0.3,
        fill: false
      },
      {
        label: 'Bottom',
        data: emptyData.slice(),
        borderColor: 'green',
        borderWidth: 2,
        tension: 0.3,
        fill: false
      },
      {
        label: 'KneeRight',
        data: emptyData.slice(),
        borderColor: 'blue',
        borderWidth: 2,
        tension: 0.3,
        fill: false
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'hour' },
        title: { display: true, text: 'Time' },
        grid: { display: true },
      },
      y: {
        min: 0,
        max: 120,  // 👈 ให้แกน Y โชว์ช่วง mmHg ล่วงหน้า
        title: { display: true, text: 'Pressure (mmHg)' },
        grid: { display: true }
      }
    }
  }
});

function loadHistoryAndPlotChart() {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  database.ref('history')
    .orderByKey()
    .startAt(oneDayAgo.toString())
    .once('value')
    .then(snapshot => {
      const data = snapshot.val();
      if (!data) return;

      const labels = [];
      const left = [];
      const middle = [];
      const right = [];

      for (const [ts, val] of Object.entries(data)) {
        labels.push(new Date(Number(ts)));
        left.push((val.left * 131.04 / 4095).toFixed(2));
        middle.push((val.middle * 131.04 / 4095).toFixed(2));
        right.push((val.right * 131.04 / 4095).toFixed(2));
      }

      chart.data.labels = labels;
      chart.data.datasets[0].data = left;
      chart.data.datasets[1].data = middle;
      chart.data.datasets[2].data = right;
      chart.update();
    });
}

// โหลดกราฟทันทีตอนเข้าเว็บ
loadHistoryAndPlotChart();
// และอัปเดตกราฟทุก 10 นาที
setInterval(loadHistoryAndPlotChart, 10 * 60 * 1000);

// Tooltip
const tooltip = document.createElement('div');
tooltip.id = 'tooltip';
tooltip.style.position = 'absolute';
tooltip.style.background = 'rgba(0, 0, 0, 0.7)';
tooltip.style.color = '#fff';
tooltip.style.padding = '5px 10px';
tooltip.style.borderRadius = '5px';
tooltip.style.display = 'none';
tooltip.style.pointerEvents = 'none';
tooltip.style.fontSize = '14px';
document.body.appendChild(tooltip);

heatmapContainer.addEventListener('click', function (e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log(`x: ${Math.round(x)}, y: ${Math.round(y)}`);
});

// โชว์ tooltip ตามตำแหน่งเมาส์
heatmapContainer.addEventListener("mousemove", function (e) {
  const rect = heatmapContainer.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  let closest = null;
  let minDist = 30;

  for (let p of examplePoints) {
    const dx = p.x - mouseX;
    const dy = p.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  }

  if (closest) {
    tooltip.style.display = "block";
    const pressureMMHg = (closest.value * 131.04 / 4095).toFixed(2); // Convert to mmHg
    tooltip.innerText = `pressure: ${pressureMMHg} mmHg `;
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
  } else {
    tooltip.style.display = "none";
  }
});

heatmapContainer.addEventListener("mouseleave", () => {
  tooltip.style.display = "none";
});