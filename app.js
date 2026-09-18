// ===================================================
// 🌕 中秋賞月 Moon Watch HK · V0.3
//
// V0.3：
// 1. Open-Meteo 真實逐小時天氣資料
// 2. Open-Meteo 真實月出資料
// 3. Open-Meteo 真實月落資料
// 4. Open-Meteo 真實月相資料
// 5. 真實月出倒數
//
// 暫時仍然是示範資料：
// - 賞月指數
// - 月亮方位
// - 月亮高度
// ===================================================


// ---------------------------------------------------
// 頁面元素
// ---------------------------------------------------

const countdownEl = document.getElementById("countdown");
const countdownText = document.getElementById("countdownText");
const locationBtn = document.getElementById("locationBtn");
const toast = document.getElementById("toast");

const weatherSummaryEl = document.getElementById("weatherSummary");
const weatherTempEl = document.getElementById("weatherTemp");
const hourlyWeatherEl = document.getElementById("hourlyWeather");
const weatherUpdatedEl = document.getElementById("weatherUpdated");

const locationEl = document.querySelector(".location");

// 🌙 月亮資料
const moonPhaseEl = document.getElementById("moonPhase");
const moonPhasePercentEl = document.getElementById("moonPhasePercent");

const moonriseTimeEl = document.getElementById("moonriseTime");
const moonriseLabelEl = document.getElementById("moonriseLabel");

const moonsetTimeEl = document.getElementById("moonsetTime");
const moonsetLabelEl = document.getElementById("moonsetLabel");

const moonriseArcTimeEl = document.getElementById("moonriseArcTime");
const moonsetArcTimeEl = document.getElementById("moonsetArcTime");


// ---------------------------------------------------
// 香港預設位置
// ---------------------------------------------------

const DEFAULT_LOCATION = {
  name: "香港",
  latitude: 22.3193,
  longitude: 114.1694
};


// ---------------------------------------------------
// 月出倒數計時器
// ---------------------------------------------------

let moonriseTimer = null;


// ---------------------------------------------------
// Toast
// ---------------------------------------------------

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(showToast.timer);

  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


// ---------------------------------------------------
// Open-Meteo 天氣文字
// ---------------------------------------------------

function weatherText(code) {
  const map = {
    0: "晴朗",
    1: "大致晴朗",
    2: "部分多雲",
    3: "多雲",
    45: "有霧",
    48: "霧凇",
    51: "毛毛雨",
    53: "毛毛雨",
    55: "毛毛雨",
    56: "凍毛毛雨",
    57: "凍毛毛雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    66: "凍雨",
    67: "凍雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    77: "雪粒",
    80: "陣雨",
    81: "陣雨",
    82: "大驟雨",
    85: "陣雪",
    86: "陣雪",
    95: "雷雨",
    96: "雷雨及冰雹",
    99: "雷雨及冰雹"
  };

  return map[code] || "天氣變化";
}


// ---------------------------------------------------
// Open-Meteo 天氣圖示
// ---------------------------------------------------

function weatherIcon(code) {
  if (code === 0) return "☀️";

  if ([1, 2].includes(code)) {
    return "🌤️";
  }

  if (code === 3) {
    return "☁️";
  }

  if ([45, 48].includes(code)) {
    return "🌫️";
  }

  if (
    [
      51, 53, 55,
      56, 57,
      61, 63, 65,
      66, 67,
      80, 81, 82
    ].includes(code)
  ) {
    return "🌧️";
  }

  if ([95, 96, 99].includes(code)) {
    return "⛈️";
  }

  return "🌦️";
}


// ---------------------------------------------------
// 取得香港當日日期
//
// Open-Meteo 使用 Asia/Hong_Kong。
// 這裡不直接使用裝置所在地的日期，避免使用者人在
// 其他時區時出現日期錯誤。
// ---------------------------------------------------

function getHongKongDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}


// ---------------------------------------------------
// 取得今晚 18:00–23:00 天氣
// ---------------------------------------------------

function getTonightRows(data) {
  const todayHK = getHongKongDateString();
  const rows = [];

  if (!data.hourly || !data.hourly.time) {
    return rows;
  }

  for (let i = 0; i < data.hourly.time.length; i++) {

    const timeString = data.hourly.time[i];

    // Open-Meteo 在 Asia/Hong_Kong 時區返回：
    // 2026-09-18T18:00
    const datePart = timeString.substring(0, 10);
    const hour = Number(timeString.substring(11, 13));

    if (datePart === todayHK && hour >= 18 && hour <= 23) {

      rows.push({
        time: timeString,
        hour,
        temperature: data.hourly.temperature_2m[i],
        precipitationProbability:
          data.hourly.precipitation_probability[i],
        cloudCover:
          data.hourly.cloud_cover[i],
        visibility:
          data.hourly.visibility[i],
        weatherCode:
          data.hourly.weather_code[i]
      });
    }
  }

  return rows;
}


// ---------------------------------------------------
// 顯示逐小時天氣
// ---------------------------------------------------

function renderHourlyWeather(rows) {

  if (!rows.length) {
    hourlyWeatherEl.innerHTML =
      '<div class="weather-loading">暫時沒有今晚逐小時資料。</div>';

    return;
  }

  hourlyWeatherEl.innerHTML = rows.map(row => `
    <div class="weather-row">

      <div class="weather-hour">
        ${String(row.hour).padStart(2, "0")}:00
      </div>

      <div class="weather-icon">
        ${weatherIcon(row.weatherCode)}
      </div>

      <div class="weather-main">

        <strong>
          ${weatherText(row.weatherCode)}
        </strong>

        <small>
          雲量 ${Math.round(row.cloudCover)}%
          · 雨機率 ${Math.round(row.precipitationProbability)}%
        </small>

      </div>

      <div class="weather-temp">
        ${Math.round(row.temperature)}°
      </div>

    </div>
  `).join("");
}


// ---------------------------------------------------
// 月相
//
// Open-Meteo moon_phase：
// 0.00 ≈ 新月
// 0.25 ≈ 上弦月
// 0.50 ≈ 滿月
// 0.75 ≈ 下弦月
// 1.00 ≈ 下一個新月
// ---------------------------------------------------

function getMoonPhaseInfo(phase) {

  let name;

  if (phase < 0.03 || phase >= 0.97) {
    name = "新月";
  }
  else if (phase < 0.22) {
    name = "蛾眉月";
  }
  else if (phase < 0.28) {
    name = "上弦月";
  }
  else if (phase < 0.47) {
    name = "盈凸月";
  }
  else if (phase < 0.53) {
    name = "滿月";
  }
  else if (phase < 0.72) {
    name = "虧凸月";
  }
  else if (phase < 0.78) {
    name = "下弦月";
  }
  else {
    name = "殘月";
  }

  // 由月相計算大約照明比例。
  //
  // 0 = 新月
  // 0.5 = 滿月
  //
  // illumination 約為 0–100%
  const illumination =
    Math.round(
      ((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100
    );

  return {
    name,
    illumination
  };
}


// ---------------------------------------------------
// 月亮時間格式
// ---------------------------------------------------

function formatMoonTime(value) {

  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("zh-HK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Hong_Kong"
  });
}


// ---------------------------------------------------
// 真實月出倒數
// ---------------------------------------------------

function startMoonriseCountdown(moonrise) {

  const moonriseDate = new Date(moonrise);

  if (Number.isNaN(moonriseDate.getTime())) {

    countdownEl.textContent = "--:--:--";
    countdownText.textContent =
      "暫時無法取得月出時間";

    return;
  }

  // 清除上一個倒數計時器
  if (moonriseTimer) {
    window.clearTimeout(moonriseTimer);
  }


  function updateCountdown() {

    const difference =
      moonriseDate.getTime() - Date.now();


    // 月亮已經升起
    if (difference <= 0) {

      countdownEl.textContent = "🌕 已月出";

      countdownText.textContent =
        "月亮已經升起，抬頭看看吧。";

      return;
    }


    const totalSeconds =
      Math.floor(difference / 1000);

    const hours =
      Math.floor(totalSeconds / 3600);

    const minutes =
      Math.floor((totalSeconds % 3600) / 60);

    const seconds =
      totalSeconds % 60;


    countdownEl.textContent =
      [
        hours,
        minutes,
        seconds
      ]
        .map(value =>
          String(value).padStart(2, "0")
        )
        .join(":");


    countdownText.textContent =
      "距離月出還有";


    moonriseTimer =
      window.setTimeout(updateCountdown, 1000);
  }


  updateCountdown();
}


// ---------------------------------------------------
// 顯示月亮資料
// ---------------------------------------------------

function renderMoonData(data) {

  if (!data.daily) {
    throw new Error(
      "Open-Meteo 沒有返回 daily 月亮資料"
    );
  }


  const moonriseList =
    data.daily.moonrise || [];

  const moonsetList =
    data.daily.moonset || [];

  const moonPhaseList =
    data.daily.moon_phase || [];


  // -------------------------------------------------
  // 月相
  // -------------------------------------------------

  const moonPhase =
    moonPhaseList[0];


  if (typeof moonPhase === "number") {

    const phaseInfo =
      getMoonPhaseInfo(moonPhase);

    moonPhaseEl.textContent =
      phaseInfo.name;

    moonPhasePercentEl.textContent =
      `約 ${phaseInfo.illumination}% 可見`;
  }


  // -------------------------------------------------
  // 今日月出
  // -------------------------------------------------

  const moonrise =
    moonriseList[0];


  if (moonrise) {

    const time =
      formatMoonTime(moonrise);


    moonriseTimeEl.textContent =
      time;

    moonriseArcTimeEl.textContent =
      time;

    moonriseLabelEl.textContent =
      "香港本地時間";


    // 啟動真實月出倒數
    startMoonriseCountdown(moonrise);
  }


  // -------------------------------------------------
  // 月落
  //
  // 如果今日月落時間早於今日月出，
  // 我們使用翌日月落。
  // -------------------------------------------------

  let moonset =
    moonsetList[0];

  let moonsetIsTomorrow =
    false;


  if (
    moonrise &&
    moonsetList[0]
  ) {

    const moonriseDate =
      new Date(moonrise);

    const moonsetDate =
      new Date(moonsetList[0]);


    if (
      moonsetDate.getTime() <
      moonriseDate.getTime()
    ) {

      if (moonsetList[1]) {

        moonset =
          moonsetList[1];

        moonsetIsTomorrow =
          true;
      }
    }
  }


  if (moonset) {

    const time =
      formatMoonTime(moonset);


    moonsetTimeEl.textContent =
      time;

    moonsetArcTimeEl.textContent =
      time;


    moonsetLabelEl.textContent =
      moonsetIsTomorrow
        ? "翌日 · 香港本地時間"
        : "香港本地時間";
  }


  // Console 方便我們測試
  console.log("🌕 Open-Meteo Moon data:", {
    moonrise,
    moonset,
    moonPhase
  });
}


// ---------------------------------------------------
// 取得 Open-Meteo 天氣 + 月亮資料
// ---------------------------------------------------

async function loadWeather(
  latitude,
  longitude,
  locationName = "香港"
) {

  const params =
    new URLSearchParams({

      latitude:
        latitude.toFixed(4),

      longitude:
        longitude.toFixed(4),

      timezone:
        "Asia/Hong_Kong",

      // 需要兩日資料：
      // 今日 + 翌日
      forecast_days:
        "2",

      hourly:
        "temperature_2m,precipitation_probability,cloud_cover,visibility,weather_code",

      daily:
        "moonrise,moonset,moon_phase"
    });


  const url =
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`;


  // -------------------------------------------------
  // 載入中
  // -------------------------------------------------

  weatherUpdatedEl.textContent =
    "更新中";

  weatherSummaryEl.textContent =
    "載入中…";

  weatherTempEl.textContent =
    "正在取得 Open-Meteo 資料";


  hourlyWeatherEl.innerHTML =
    '<div class="weather-loading">正在取得 Open-Meteo 天氣資料…</div>';


  try {

    // ------------------------------------------------
    // 呼叫 Open-Meteo
    // ------------------------------------------------

    const response =
      await fetch(
        url,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    console.log(
      "🌤️ Open-Meteo data:",
      data
    );


    // ------------------------------------------------
    // 月亮資料
    // ------------------------------------------------

    renderMoonData(data);


    // ------------------------------------------------
    // 今晚天氣
    // ------------------------------------------------

    const rows =
      getTonightRows(data);


    if (!rows.length) {

      throw new Error(
        "今晚資料不足"
      );
    }


    // 第一個今晚時段
    const first =
      rows[0];


    weatherSummaryEl.textContent =
      weatherText(first.weatherCode);


    weatherTempEl.textContent =
      `${Math.round(first.temperature)}°C · 雲量 ${Math.round(first.cloudCover)}%`;


    weatherUpdatedEl.textContent =
      "LIVE";


    renderHourlyWeather(rows);


    locationEl.textContent =
      `📍 ${locationName}`;


  }
  catch (error) {

    console.error(
      "❌ Open-Meteo error:",
      error
    );


    weatherUpdatedEl.textContent =
      "暫停";


    weatherSummaryEl.textContent =
      "暫時無法取得";


    weatherTempEl.textContent =
      "請稍後再試";


    hourlyWeatherEl.innerHTML =
      '<div class="weather-loading">Open-Meteo 暫時無法提供資料，請稍後重新整理。</div>';


    showToast(
      "暫時未能取得 Open-Meteo 天氣資料。"
    );
  }
}


// ---------------------------------------------------
// 使用我的位置
// ---------------------------------------------------

function useLocation() {

  if (!navigator.geolocation) {

    showToast(
      "你的裝置不支援位置服務。"
    );

    return;
  }


  locationBtn.disabled = true;

  locationBtn.textContent =
    "📍 正在取得位置…";


  navigator.geolocation.getCurrentPosition(

    async (position) => {

      const {
        latitude,
        longitude
      } = position.coords;


      console.log(
        "📍 User location:",
        latitude,
        longitude
      );


      locationBtn.textContent =
        "✓ 已取得我的位置";


      showToast(
        "已取得位置，正在更新天氣。"
      );


      await loadWeather(
        latitude,
        longitude,
        "我的位置"
      );
    },


    () => {

      locationBtn.disabled =
        false;


      locationBtn.textContent =
        "📍 使用我的位置";


      showToast(
        "未能取得位置，先使用香港預設位置。"
      );
    },


    {
      enableHighAccuracy:
        false,

      timeout:
        10000,

      maximumAge:
        300000
    }
  );
}


// ---------------------------------------------------
// 按鈕事件
// ---------------------------------------------------

locationBtn.addEventListener(
  "click",
  useLocation
);


// ---------------------------------------------------
// 選單
// ---------------------------------------------------

document
  .querySelector(".menu-btn")
  .addEventListener(
    "click",
    () => {

      showToast(
        "選單功能將於下一階段加入。"
      );
    }
  );


// ---------------------------------------------------
// 網站啟動
//
// 預設使用香港位置。
// 不需要使用者先開啟 GPS。
// ---------------------------------------------------

loadWeather(
  DEFAULT_LOCATION.latitude,
  DEFAULT_LOCATION.longitude,
  DEFAULT_LOCATION.name
);