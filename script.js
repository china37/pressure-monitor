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
  left: { x: 271, y: 414 },
  middle: { x: 302, y: 278 },
  right: { x: 336, y: 414 }
};

let examplePoints = [];

// ฟังก์ชันแปลงค่าความดันเป็นสี
function getColor(value) {
  if (value === undefined || value === null || value <= 9) return 'gray';  // ถ้าไม่มีค่า ให้แสดงสีเทา
  if (value <= 999) return 'green';
  if (value <= 2999) return 'yellow';
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
  const leftValue = data.left.value;
  const middleValue = data.middle.value;
  const rightValue = data.right.value;
  console.log(`Sensor values: Left: ${leftValue}, Middle: ${middleValue}, Right: ${rightValue}`);
  // แสดงค่าความดันใน DOM
  document.getElementById("sensor1").textContent = `Sensor 1: ${leftValue}`;
  document.getElementById("sensor2").textContent = `Sensor 2: ${middleValue}`;
  document.getElementById("sensor3").textContent = `Sensor 3: ${rightValue}`;

  // เปลี่ยนสีของเซ็นเซอร์ตามค่าความดัน
  document.getElementById("sensor1").style.backgroundColor = getColor(leftValue);
  document.getElementById("sensor2").style.backgroundColor = getColor(middleValue);
  document.getElementById("sensor3").style.backgroundColor = getColor(rightValue);
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
    tooltip.innerText = `pressure: ${closest.value} `;
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
  } else {
    tooltip.style.display = "none";
  }
});

heatmapContainer.addEventListener("mouseleave", () => {
  tooltip.style.display = "none";
});