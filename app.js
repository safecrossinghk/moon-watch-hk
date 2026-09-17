// 中秋賞月 Moon Watch HK · V0.2
// 第一階段：接入 Open-Meteo 真實逐小時天氣資料。
// 月亮資料、賞月指數仍然保留為示範資料，下一階段再處理。

const countdownEl = document.getElementById("countdown");
const countdownText = document.getElementById("countdownText");
const locationBtn = document.getElementById("locationBtn");
const toast = document.getElementById("toast");
const weatherSummaryEl = document.getElementById("weatherSummary");
const weatherTempEl = document.getElementById("weatherTemp");
const hourlyWeatherEl = document.getElementById("hourlyWeather");
const weatherUpdatedEl = document.getElementById("weatherUpdated");
const locationEl = document.querySelector(".location");

const DEFAULT_LOCATION = {
  name: "香港",
  latitude: 22.3193,
  longitude: 114.1694
};

let remaining = 18 * 60 + 42;

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

function tick() {
  countdownEl.textContent = formatTime(remaining);

  if (remaining > 0) {
    remaining--;
  } else {
    countdownText.textContent = "月亮已經升起，抬頭看看吧。";
    countdownEl.textContent = "🌕 已月出";
  }
}

tick();
setInterval(tick, 1000);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

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

function weatherIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌦️";
}

function getTonightRows(data) {
  const now = new Date();
  const rows = [];

  for (let i = 0; i < data.hourly.time.length; i++) {
    const time = new Date(data.hourly.time[i]);
    const hour = time.getHours();
    const sameDate = time.toDateString() === now.toDateString();

    // 第一階段只顯示今晚 18:00–23:00。
    if (sameDate && hour >= 18 && hour <= 23) {
      rows.push({
        time,
        hour,
        temperature: data.hourly.temperature_2m[i],
        precipitationProbability: data.hourly.precipitation_probability[i],
        cloudCover: data.hourly.cloud_cover[i],
        visibility: data.hourly.visibility[i],
        weatherCode: data.hourly.weather_code[i]
      });
    }
  }

  return rows;
}

function renderHourlyWeather(rows) {
  if (!rows.length) {
    hourlyWeatherEl.innerHTML = '<div class="weather-loading">暫時沒有今晚逐小時資料。</div>';
    return;
  }

  hourlyWeatherEl.innerHTML = rows.map(row => `
    <div class="weather-row">
      <div class="weather-hour">${String(row.hour).padStart(2, "0")}:00</div>
      <div class="weather-icon">${weatherIcon(row.weatherCode)}</div>
      <div class="weather-main">
        <strong>${weatherText(row.weatherCode)}</strong>
        <small>雲量 ${Math.round(row.cloudCover)}% · 雨機率 ${Math.round(row.precipitationProbability)}%</small>
      </div>
      <div class="weather-temp">${Math.round(row.temperature)}°</div>
    </div>
  `).join("");
}

async function loadWeather(latitude, longitude, locationName = "香港") {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    timezone: "Asia/Hong_Kong",
    forecast_days: "1",
    hourly: "temperature_2m,precipitation_probability,cloud_cover,visibility,weather_code"
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  weatherUpdatedEl.textContent = "更新中";
  weatherSummaryEl.textContent = "載入中…";
  weatherTempEl.textContent = "正在取得 Open-Meteo 資料";
  hourlyWeatherEl.innerHTML = '<div class="weather-loading">正在取得 Open-Meteo 天氣資料…</div>';

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const rows = getTonightRows(data);

    if (!rows.length) {
      throw new Error("今晚資料不足");
    }

    const first = rows[0];
    weatherSummaryEl.textContent = weatherText(first.weatherCode);
    weatherTempEl.textContent = `${Math.round(first.temperature)}°C · 雲量 ${Math.round(first.cloudCover)}%`;
    weatherUpdatedEl.textContent = "LIVE";
    renderHourlyWeather(rows);

    locationEl.textContent = `📍 ${locationName}`;
    console.log("Open-Meteo data:", data);
  } catch (error) {
    console.error("Open-Meteo error:", error);
    weatherUpdatedEl.textContent = "暫停";
    weatherSummaryEl.textContent = "暫時無法取得";
    weatherTempEl.textContent = "請稍後再試";
    hourlyWeatherEl.innerHTML = '<div class="weather-loading">Open-Meteo 暫時無法提供資料，請稍後重新整理。</div>';
    showToast("暫時未能取得 Open-Meteo 天氣資料。");
  }
}

function useLocation() {
  if (!navigator.geolocation) {
    showToast("你的裝置不支援位置服務。");
    return;
  }

  locationBtn.disabled = true;
  locationBtn.textContent = "📍 正在取得位置…";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      console.log("User location:", latitude, longitude);

      locationBtn.textContent = "✓ 已取得我的位置";
      showToast("已取得位置，正在更新天氣。");
      await loadWeather(latitude, longitude, "我的位置");
    },
    () => {
      locationBtn.disabled = false;
      locationBtn.textContent = "📍 使用我的位置";
      showToast("未能取得位置，先使用香港預設位置。");
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

locationBtn.addEventListener("click", useLocation);

document.querySelector(".menu-btn").addEventListener("click", () => {
  showToast("選單功能將於下一階段加入。");
});

// 第一階段預設使用香港座標，不需要使用者先開啟 GPS。
loadWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.name);
