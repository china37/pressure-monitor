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
  let lastChartUpdate = 0;
  const PLOT_INTERVAL = 10000; // 10 seconds

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
    const nowMs = Date.now();
    if (nowMs - lastChartUpdate >= PLOT_INTERVAL) {
      const timestamp = new Date(nowMs);
      const leftValueRaw = data.left.value;
      const middleValueRaw = data.middle.value;
      const rightValueRaw = data.right.value;

      const leftValue = formatPressure(leftValueRaw);
      const middleValue = formatPressure(middleValueRaw);
      const rightValue = formatPressure(rightValueRaw);
  
      chartKneeLeft.data.datasets[0].data.push({ x: timestamp, y: leftValue });
      chartBottom.data.datasets[0].data.push({ x: timestamp, y: middleValue });
      chartKneeRight.data.datasets[0].data.push({ x: timestamp, y: rightValue });

      chartKneeLeft.update();
      chartBottom.update();
      chartKneeRight.update();

      lastChartUpdate = nowMs;

      console.log(`Sensor values: Left: ${leftValue}, Middle: ${middleValue}, Right: ${rightValue}`);
    }
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
  });

  const currenHour = new Date();
  currenHour.setMinutes(0, 0, 0); // ตั้งเวลาเป็น 00:00:00 ของชั่วโมงปัจจุบัน
  const endTime = new Date(currenHour.getTime() + 24 * 60 * 60 * 1000); // สิ้นสุดที่เวลา 23:59:59

  console.log("Start time:", currenHour.toDateString());
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
              tooltipFormat: 'HH:mm',
              displayFormats: {
                  minute: 'HH:mm',
                  hour: 'HH:mm',
              }
            },
            min: currenHour,
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

      function filterEvery10Seconds(data) {
        if (!data || data.length === 0) return [];

        const sortedData = data.sort((a, b) => a.x - b.x);
        const result = [];

        let lastTimestamp = null;
        sortedData.forEach(point => {
          if (!lastTimestamp === null || point.x - lastTimestamp >= 10000) { // 10 seconds in milliseconds
            result.push(point);
            lastTimestamp = point.x;
          }
        });
        return result;
      }

      const allKneeLeft = [];
      const allBottom = [];
      const allKneeRight = [];

  
      Object.entries(data).forEach(([_, entry]) => {
          if (!entry.actualTime) return;

          const time = new Date(Number(entry.actualTime));

          if (time >= currenHour && time <= endTime) {
            if (entry.KneeLeft !== undefined) allKneeLeft.push({ x: time.getTime(), y: entry.KneeLeft });
            if (entry.Bottom !== undefined) allBottom.push({ x: time.getTime(), y: entry.Bottom });
            if (entry.KneeRight !== undefined) allKneeRight.push({ x: time.getTime(), y: entry.KneeRight });
          }
      });

      const filteredKneeLeft = filterEvery10Seconds(allKneeLeft);
      const filteredBottom = filterEvery10Seconds(allBottom);
      const filteredKneeRight = filterEvery10Seconds(allKneeRight);


      kneeLeftData.push(...filteredKneeLeft);
      bottomData.push(...filteredBottom);
      kneeRightData.push(...filteredKneeRight);

      chartKneeLeft.data.datasets[0].data = kneeLeftData;
      chartBottom.data.datasets[0].data = bottomData;
      chartKneeRight.data.datasets[0].data = kneeRightData;

      [chartKneeLeft, chartBottom, chartKneeRight].forEach(chart => {
        chart.options.scales.x.min = currenHour;
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
      right: randomValue(),
      actualTime: Date.now()
    };

    firebase.database().ref('pressure').set(simulatedData)
      .then(() => console.log("Simulated data sent:", simulatedData));
  }

  setInterval(simulateSensorData, 1000); // Simulate data every 5 seconds
});
