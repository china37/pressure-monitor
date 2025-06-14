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
  canvas.width = 700;
  canvas.height = 700;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.zIndex = '1';
  heatmapContainer.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const sensorMap = {
    left: { x: 390, y: 621 },
    middle: { x: 347, y: 330 },
    right: { x: 318, y: 621 }
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
    const leftValueRaw = data.left.value;
    const middleValueRaw = data.middle.value;
    const rightValueRaw = data.right.value;

    let leftValue, middleValue, rightValue;
    if (nowMs - lastChartUpdate >= PLOT_INTERVAL) {
      const timestamp = new Date(nowMs);
      leftValue = formatPressure(leftValueRaw);
      middleValue = formatPressure(middleValueRaw);
      rightValue = formatPressure(rightValueRaw);
  
      chartHeelLeft.data.datasets[0].data.push({ x: timestamp, y: leftValue }); 
      chartBottom.data.datasets[0].data.push({ x: timestamp, y: middleValue });
      chartHeelRight.data.datasets[0].data.push({ x: timestamp, y: rightValue });

      chartHeelLeft.update();
      chartBottom.update();
      chartHeelRight.update();

      lastChartUpdate = nowMs;

      console.log(`Sensor values: Left: ${leftValue}, Middle: ${middleValue}, Right: ${rightValue}`);
    } else {
      leftValue = formatPressure(leftValueRaw);
      middleValue = formatPressure(middleValueRaw);
      rightValue = formatPressure(rightValueRaw);
    }
  // แสดงค่าความดันใน DOM
    document.getElementById("sensor1").textContent = `HeelLeft: ${leftValue ?? 'No data'}`;
    document.getElementById("sensor2").textContent = `Bottom: ${middleValue ?? 'No data'}`;
    document.getElementById("sensor3").textContent = `HeelRight: ${rightValue ?? 'No data'}`;

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
      HeelLeft: left,
      Bottom: middle,
      HeelRight: right,
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
  console.log("Endtime:", endTime.toDateString());


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
          pointRadius: 2,
          pointHoverRadius: 4
        }]
      },
      options: {
        devicePixelRatio: 2, // เพิ่มความละเอียดของกราฟ
        responsive: false,
        maintainAspectRatio: false,
        layout: {
          padding: {
            right: 50
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'minute',
              stepSize: 5,
              displayFormats: {
                  minute: 'HH:mm',
              },
              tooltipFormat: 'HH:mm',
            },
            ticks: {
              font: {
                size: 16
              },
              source: 'linear',
              autoSkip: false,
              maxTicksLimit: 288, // แสดงสูงสุด 24 ชั่วโมง
              callback: function(value, index, ticks) {
                console.log("Tick value:", value);
                const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
                const minutes = date.getMinutes();
                return minutes === 0 ? date.getHours().toString().padStart(2, '0') + ':00' : ''; // แสดงแค่ชั่วโมงที่มีค่าเป็น 0 นาที
              },
              maxRotation: 0, // ไม่หมุนข้อความ
              minRotation: 0 // ไม่หมุนข้อความ
            },
            min: currenHour,
            max: endTime,
            grid: {
              drawOnChartArea: true, // ไม่วาดกริดบนแกน X
              drawTicks: true, // ไม่วาดเส้นแนวตั้ง
              tickLength: 5, // ไม่วาดเส้นแนวตั้ง
              color: function(context) {
                if (new Date(context.tick.value).getMinutes() === 0) {
                  return 'rgba(0, 0, 0, 0.2)'; // สีจางสำหรับนอกช่วงเวลา
                }
                return 'rgba(0, 0, 0, 0.1)'; // สีจางสำหรับนอกช่วงเวลา
              }
            },
            title: {
              display: true,
              text: 'Time',
              font: {
                size: 18
              }
            }
          },
          y: {
            min: 0,
            max: 160,
            title: {
              display: true,
              text: 'Pressure (mmHg)',
              font: {
                size: 18
              }
            },
            ticks: {
              font: {
                size: 16
              },
            },
            beginAtZero: true 
          }
        },
        plugins: {
          zoom: {
            pan: {
              enabled: true,
              mode: 'x',
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              mode: 'x',
            }
          },
          legend: {
            position: 'top',
            label: {
              font: {
                size: 16
              }
            }
          },
          title: {
            display: true,
            text: `Pressure Over Time`,
            font: {
              size: 20
            }
          }
        }
      }
    });
  }

// สร้างกราฟ
  const chartHeelLeft = createChart(document.getElementById('chartHeelLeft').getContext('2d'), 'HeelLeft', 'red');
  const chartBottom = createChart(document.getElementById('chartBottom').getContext('2d'), 'Bottom', 'green');
  const chartHeelRight = createChart(document.getElementById('chartHeelRight').getContext('2d'), 'HeelRight', 'blue');

  function loadAndListenHistory() {
    const historyRef = firebase.database().ref("history");
  
      const heelLeftData = [];
      const bottomData = [];
      const heelRightData = [];

      const pressureCounts = {
        HeelLeft: { yellow: 0, red: 0 },
        Bottom: { yellow: 0, red: 0 },
        HeelRight: { yellow: 0, red: 0 }
      };

      function convertRawToMmHg(raw) {
        return Math.round((raw / 31.25) * 10) / 10;
      }

      function updateCount(sensor, value) {
        console.log(`[${sensor}] mmHg = ${value}`);

        const counts = pressureCounts[sensor];

        if (value > 31.9 && value <= 70) counts.yellow++;
        else if (value > 70) counts.red++;

        const yellowElem = document.getElementById(`count-${sensor.toLowerCase()}-yellow`);
        const redElem = document.getElementById(`count-${sensor.toLowerCase()}-red`);

        if (yellowElem) yellowElem.textContent = counts.yellow;
        if (redElem) redElem.textContent = counts.red;
      }

      function shouldAddPoint(dataArray, newTime) {
        const last = dataArray[dataArray.length - 1];
        return !last || newTime - last.x >= 10 * 1000;
      }

      function addPointToChart(sensor, value, time) {
        const timestamp = time.getTime();
        if (sensor === 'HeelLeft') {
          if (shouldAddPoint(heelLeftData, timestamp)) {
            heelLeftData.push({ x: time, y: value });
            chartHeelLeft.update();
          }
        }
        if (sensor === 'Bottom') {
          if (shouldAddPoint(bottomData, timestamp)) {
            bottomData.push({ x: time, y: value });
            chartBottom.update();
          }
        }
        if (sensor === 'HeelRight') {
          if (shouldAddPoint(heelRightData, timestamp)) {
            heelRightData.push({ x: time, y: value });
            chartHeelRight.update();
          }
        }
      }

      historyRef.once('value').then(snapshot => {
        const data = snapshot.val();
        if (!data) return;
        const allHeelLeft = [];
        const allBottom = [];
        const allHeelRight = [];

        Object.keys(pressureCounts).forEach(sensor => {
          pressureCounts[sensor].yellow = 0;
          pressureCounts[sensor].red = 0;
        });

        Object.entries(data).forEach(([_, entry]) => {
          if (!entry?.actualTime) return; // Skip if no actualTime
          const time = new Date(entry.actualTime);
          if (time < currenHour || time > endTime) return; // Skip if outside range

          const timestamp = time.getTime();

          if (entry.HeelLeft !== undefined) {
            const mmHg = convertRawToMmHg(entry.HeelLeft);
            console.log('HeelLeft mmHg =', mmHg); 
            allHeelLeft.push({ x: timestamp, y: mmHg });
            updateCount('HeelLeft', mmHg);
          }
          if (entry.Bottom !== undefined) {
            const mmHg = convertRawToMmHg(entry.Bottom);
            console.log('Bottom mmHg =', mmHg); 
            allBottom.push({ x: timestamp, y: mmHg });
            updateCount('Bottom', mmHg);
          }
          if (entry.HeelRight !== undefined) {
            const mmHg = convertRawToMmHg(entry.HeelRight);
            console.log('HeelRight mmHg =', mmHg); 
            allHeelRight.push({ x: timestamp, y: mmHg });
            updateCount('HeelRight', mmHg);
          }
        });

        function filterEvery10Seconds(data) {
          if (!data || data.length === 0) return [];
          const sorted = data.sort((a, b) => a.x - b.x);
          const result = [];
          let anchor = currenHour.getTime();
          for (const point of sorted) {
            if (point.x >= anchor) {
              result.push(point);
              anchor = point.x + 10 * 1000; // เพิ่มทุก 10 วินาที
            }
          }
          return result;
        }

        filterEvery10Seconds(allHeelLeft).forEach(p => {
          addPointToChart('HeelLeft', p.y, new Date(p.x));
        });
        filterEvery10Seconds(allBottom).forEach(p => {
          addPointToChart('Bottom', p.y, new Date(p.x));
        });
        filterEvery10Seconds(allHeelRight).forEach(p => {
          addPointToChart('HeelRight', p.y, new Date(p.x));
        });

        [chartHeelLeft, chartBottom, chartHeelRight].forEach(chart => {
          chart.options.scales.x.min = currenHour;
          chart.options.scales.x.max = endTime;
          chart.update();
        });

        Object.keys(pressureCounts).forEach(sensor => {
          const yellowElem = document.getElementById(`count-${sensor.toLowerCase()}-yellow`);
          const redElem = document.getElementById(`count-${sensor.toLowerCase()}-red`);

          if (yellowElem) yellowElem.textContent = pressureCounts[sensor].yellow;
          if (redElem) redElem.textContent = pressureCounts[sensor].red;
        });
      });

      const lastTimestamps = {
        HeelLeft: 0,
        Bottom: 0,
        HeelRight: 0
      };

      historyRef.on('child_added', snapshot => {
        console.log('📥 Child added from Firebase:', snapshot.val());
        const entry = snapshot.val();
        if (!entry?.actualTime) return; // Skip if no actualTime
        const time = new Date(Number(entry.actualTime));
        const timestamp = time.getTime();
        if (time < currenHour || time > endTime) return; // Skip if outside range
        console.log('🔥 New child added', entry);

        function tryAdd(sensor, value) {
          if (timestamp - lastTimestamps[sensor] >= 10 * 1000) {
            lastTimestamps[sensor] = timestamp;
            updateCount(sensor, value);
            addPointToChart(sensor, value, time);
          }
        }

        const leftValue = entry.HeelLeft !== undefined ? Math.round((entry.HeelLeft / 31.25) * 10) / 10 : undefined;
        const middleValue = entry.Bottom !== undefined ? Math.round((entry.Bottom / 31.25) * 10) / 10 : undefined;
        const rightValue = entry.HeelRight !== undefined ? Math.round((entry.HeelRight / 31.25) * 10) / 10 : undefined;

        if (leftValue !== undefined) tryAdd('HeelLeft', leftValue);
        if (middleValue !== undefined) tryAdd('Bottom', middleValue);
        if (rightValue !== undefined) tryAdd('HeelRight', rightValue);
      });
  
  }


// โหลดกราฟทันทีตอนเข้าเว็บ
  loadAndListenHistory();
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
// เรียก simulate ทุก 5 วินาที
  setInterval(simulateSensorData, 2000);

});
