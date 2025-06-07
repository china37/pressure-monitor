document.addEventListener("DOMContentLoaded", function () {
  const firebaseConfig = {
    apiKey: "AIzaSyChzBBptuD546WWHmfMQRVFUzB6uukV_M0",
    authDomain: "simdatra.firebaseapp.com",
    databaseURL: "https://simdatra-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "simdatra",
    storageBucket: "simdatra.firebasestorage.app",
    messagingSenderId: "1016085499195",
    appId: "1:1016085499195:web:e3b29935385633136efb1e",
    measurementId: "G-21DPPVWHY9"
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
  database.ref('pressure').on('value', function(snapshot) {
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
      const leftValueRaw = typeof data.left === 'number' ? data.left : (data.left?.value || 0);
      const middleValueRaw = typeof data.middle === 'number' ? data.middle : (data.middle?.value || 0);
      const rightValueRaw = typeof data.right === 'number' ? data.right : (data.right?.value || 0);

      updateSensorValues({ 
        left: { value: leftValueRaw },
        middle: { value: middleValueRaw },
        right: { value: rightValueRaw }
      });
      saveToHistory(leftValue, middleValue, rightValue);
    });
  });

  function formatPressure(valueRaw) {
    if (typeof valueRaw !== 'number' || isNaN(valueRaw) || valueRaw === 0) {
      return undefined;
    }
    return parseFloat((valueRaw * 131.04 / 4095).toFixed(2));
  }

  function updateSensorValues(data) {
    const timestamp = data.actualTime ? new Date(data.actualTime) : new Date();
    const leftValueRaw = data.left.value;
    const middleValueRaw = data.middle.value;
    const rightValueRaw = data.right.value;

    const leftValue = formatPressure(leftValueRaw);
    const middleValue = formatPressure(middleValueRaw);
    const rightValue = formatPressure(rightValueRaw);

    const now = new Date();
    chartKneeLeft.data.datasets[0].data.push({ x: timestamp, y: leftValue });
    chartBottom.data.datasets[0].data.push({ x: timestamp, y: middleValue });
    chartKneeRight.data.datasets[0].data.push({ x: timestamp, y: rightValue });

    function getMinTime(dataset) {
      if (!dataset.length) return timestamp;
      return dataset.reduce((min, point) => (point.x < min ? point.x : min), dataset[0].x);
    }

    function getMaxTime(dataset) {
      if (!dataset.length) return timestamp;
      return dataset.reduce((max, point) => (point.x > max ? point.x : max), dataset[0].x);
    }

    const minTime = new Date(Math.min(
      getMinTime(chartKneeLeft.data.datasets[0].data),
      getMinTime(chartBottom.data.datasets[0].data),
      getMinTime(chartKneeRight.data.datasets[0].data)
    ));

    const maxTime = new Date(Math.max(
      getMaxTime(chartKneeLeft.data.datasets[0].data),
      getMaxTime(chartBottom.data.datasets[0].data),
      getMaxTime(chartKneeRight.data.datasets[0].data)
    ));

    chartKneeLeft.update();
    chartBottom.update();
    chartKneeRight.update();

    console.log(`Sensor values: Left: ${leftValue}, Middle: ${middleValue}, Right: ${rightValue}`);
  // แสดงค่าความดันใน DOM
    document.getElementById("sensor1").textContent = `KneeLeft: ${leftValue ?? 'No data'}`;
    document.getElementById("sensor2").textContent = `Bottom: ${middleValue ?? 'No data'}`;
    document.getElementById("sensor3").textContent = `KneeRight: ${rightValue ?? 'No data'}`;

  // เปลี่ยนสีของเซ็นเซอร์ตามค่าความดัน
    document.getElementById("sensor1").style.backgroundColor = getColor(leftValueRaw);
    document.getElementById("sensor2").style.backgroundColor = getColor(middleValueRaw);
    document.getElementById("sensor3").style.backgroundColor = getColor(rightValueRaw);
    
    examplePoints = [
      { x: sensorMap.left.x, y: sensorMap.left.y, value: leftValueRaw || 0 }, //left
      { x: sensorMap.middle.x, y: sensorMap.middle.y, value: middleValueRaw || 0 }, //middle
      { x: sensorMap.right.x, y: sensorMap.right.y, value: rightValueRaw || 0} //right
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
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.8;
          ctx.fill();
          ctx.globalAlpha = 1.0;
      });
  }

  function getRoundedKeyForHistory() {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 0 : 30;
    now.setMinutes(roundedMinutes, 0, 0); // ตั้งค่าเป็น 00 หรือ 30 นาที
    return now.getTime();
  }

  function saveToHistory(left, middle, right) {
    const roundedTime = getRoundedKeyForHistory();  // ปัดเฉพาะ key
    const actualTimestamp = Date.now();     // เก็บเวลาจริงในตัวข้อมูล

    database.ref('history/' + roundedTime).update({
      KneeLeft: left,
      Bottom: middle,
      KneeRight: right,
      actualTime: actualTimestamp
    });
  }

// ✅ ดึงข้อมูลจาก Firebase ทุกครั้งที่มีการเปลี่ยนแปลง
  database.ref('pressure').once('value').then(snapshot => {
    const data = snapshot.val();
    const left = data.left?.value || data.left || 0;
    const middle = data.middle?.value || data.middle || 0;
    const right = data.right?.value || data.right || 0;
    updateSensorValues({ left, middle, right });
    // จะบันทึกข้อมูลแค่ตอนที่ครบ 10 นาที โดยใช้ global flag
    lastSaved = checkAndSaveEvery10Mins(left, middle, right);
  });

  let lastSaved = 0;
  const now = new Date();

  const startTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    0, 0, 0 // เริ่มต้นที่เวลา 00:00:00 ของวัน
  );
  const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // สิ้นสุดที่เวลา 23:59:59

  console.log("Start time:", startTime.toDateString());
  console.log("End time:", endTime.toDateString());

  function createChart(ctx, label, color) {
    return new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: label,
          data: [],
          borderColor: color,
          backgroundColor: color,
          fill: false,
          tension: 0.2,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'hour',
              tooltipFormat: 'HH:mm:ss',
              displayFormats: {
                  minute: 'HH:mm',
                  hour: 'HH:mm',
              }
            },
            min: startTime,
            max: endTime,
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            min: 0,
            max: 140,
            title: {
              display: true,
              text: 'Pressure (mmHg)'
            }
          }
        }
      }
    });
  }

// สร้างกราฟ
  const chartKneeLeft = createChart(document.getElementById('chartKneeLeft').getContext('2d'), 'KneeLeft', 'red');
  const chartBottom = createChart(document.getElementById('chartBottom').getContext('2d'), 'Bottom', 'green');
  const chartKneeRight = createChart(document.getElementById('chartKneeRight').getContext('2d'), 'KneeRight', 'blue');

  function loadHistoryAndPlotChart() {
    const historyRef = firebase.database().ref("history");
    historyRef.once('value').then(snapshot => {
      const data = snapshot.val();

      if (!data) {
          [chartKneeLeft, chartBottom, chartKneeRight].forEach(chart => {
        // เคลียร์กราฟ (ถ้าไม่มีข้อมูล)
              chart.data.datasets.forEach(ds => ds.data = []);
              chart.update();
          });
          return;
      }

      const kneeLeftData = [];
      const bottomData = [];
      const kneeRightData = [];

      Object.entries(data).forEach(([_, entry]) => {
          if (!entry.actualTime) return;
          const time = new Date(Number(entry.actualTime));

          if (time >= startTime && time <= endTime) {
            if (entry.KneeLeft !== undefined) kneeLeftData.push({ x: time, y: entry.KneeLeft });
            if (entry.Bottom !== undefined) bottomData.push({ x: time, y: entry.Bottom });
            if (entry.KneeRight !== undefined) kneeRightData.push({ x: time, y: entry.KneeRight });
          }
      });


      chartKneeLeft.data.datasets[0].data = kneeLeftData;
      chartBottom.data.datasets[0].data = bottomData;
      chartKneeRight.data.datasets[0].data = kneeRightData;

      [chartKneeLeft, chartBottom, chartKneeRight].forEach(chart => {
        chart.options.scales.x.min = startTime;
        chart.options.scales.x.max = endTime;
        chart.update();
      });
    });
  }

// โหลดกราฟทันทีตอนเข้าเว็บ
  loadHistoryAndPlotChart();
// และอัปเดตกราฟทุก 10 นาที
  //setInterval(loadHistoryAndPlotChart, 10 * 60 * 1000);

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

  function simulateSensorData() {
    const minRaw = 500;
    const maxRaw = 4000;
    const randomValue = () => Math.floor(Math.random() * (maxRaw - minRaw + 1)) + minRaw;

    const simulatedData = {
      left: randomValue(),
      middle: randomValue(),
      right: randomValue()
    };

    firebase.database().ref('pressure').set(simulatedData)
      .then(() => console.log("Simulated data sent:", simulatedData));
  }

  setInterval(simulateSensorData, 1000); // Simulate data every 5 seconds
});
