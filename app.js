// =====================================================
// 🌕 Moon Watch HK V0.6
//
// 功能：
// 1. Open-Meteo 天氣
// 2. 真實月相
// 3. 真實月出 / 月落
// 4. 真實月亮方位 / 高度
// 5. 今晚賞月指數
// 6. 右上角選單
// 7. CounterAPI 背景計數
//
// 注意：
// - 不顯示逐小時天氣表
// - 不顯示瀏覽人次
// - 不再自動建立任何新卡片
// =====================================================


// =====================================================
// 基本設定
// =====================================================

const DEFAULT_LOCATION = {
  lat: 22.3193,
  lon: 114.1694,
  name: "香港"
};


// =====================================================
// DOM
// =====================================================

const scoreNumber =
  document.getElementById("scoreNumber");

const scoreTitle =
  document.getElementById("scoreTitle");

const scoreDescription =
  document.getElementById("scoreDescription");

const weatherSummary =
  document.getElementById("weatherSummary");

const weatherTemp =
  document.getElementById("weatherTemp");

const moonPhase =
  document.getElementById("moonPhase");

const moonriseTime =
  document.getElementById("moonriseTime");

const moonsetTime =
  document.getElementById("moonsetTime");

const moonDirection =
  document.getElementById("moonDirection");

const moonPositionText =
  document.getElementById("moonPositionText");

const moonNeedle =
  document.getElementById("moonNeedle");


// =====================================================
// 選單
// =====================================================

const menuBtn =
  document.getElementById("menuBtn");

const menuClose =
  document.getElementById("menuClose");

const siteMenu =
  document.getElementById("siteMenu");


function openMenu() {

  siteMenu.classList.add("open");

  siteMenu.setAttribute(
    "aria-hidden",
    "false"
  );

  menuBtn.setAttribute(
    "aria-expanded",
    "true"
  );
}


function closeMenu() {

  siteMenu.classList.remove("open");

  siteMenu.setAttribute(
    "aria-hidden",
    "true"
  );

  menuBtn.setAttribute(
    "aria-expanded",
    "false"
  );
}


if (menuBtn) {
  menuBtn.addEventListener(
    "click",
    openMenu
  );
}


if (menuClose) {
  menuClose.addEventListener(
    "click",
    closeMenu
  );
}


document
  .querySelectorAll(".site-menu a")
  .forEach(link => {

    link.addEventListener(
      "click",
      closeMenu
    );

  });


// =====================================================
// Toast
// =====================================================

function showToast(message) {

  let toast =
    document.getElementById("toast");

  if (!toast) {

    toast =
      document.createElement("div");

    toast.id = "toast";

    toast.className = "toast";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {

    toast.classList.remove("show");

  }, 2500);
}


// =====================================================
// 香港時間
// =====================================================

function getHongKongDateParts() {

  const now = new Date();

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      }
    );

  const parts =
    formatter.formatToParts(now);

  const result = {};

  parts.forEach(part => {

    if (part.type !== "literal") {
      result[part.type] = part.value;
    }

  });

  return result;
}


function getHongKongDateString() {

  const p =
    getHongKongDateParts();

  return `${p.year}-${p.month}-${p.day}`;
}


function getHongKongHour() {

  const p =
    getHongKongDateParts();

  return Number(p.hour);
}


// =====================================================
// 月相
// =====================================================

function getMoonPhaseInfo(phase) {

  if (phase === null ||
      phase === undefined ||
      Number.isNaN(Number(phase))) {

    return {
      name: "未知月相",
      illumination: null
    };
  }

  const p =
    Number(phase);

  let name;

  if (p < 0.03 || p > 0.97) {

    name = "新月";

  } else if (p < 0.22) {

    name = "娥眉月";

  } else if (p < 0.28) {

    name = "上弦月";

  } else if (p < 0.47) {

    name = "盈凸月";

  } else if (p < 0.53) {

    name = "滿月";

  } else if (p < 0.72) {

    name = "虧凸月";

  } else if (p < 0.78) {

    name = "下弦月";

  } else {

    name = "殘月";
  }


  const illumination =
    Math.round(
      (
        1 -
        Math.cos(
          2 * Math.PI * p
        )
      ) / 2 * 100
    );


  return {
    name,
    illumination
  };
}


// =====================================================
// 時間格式
// =====================================================

function formatMoonTime(value) {

  if (!value) {
    return "--:--";
  }

  const match =
    String(value).match(
      /T(\d{2}):(\d{2})/
    );

  if (!match) {
    return "--:--";
  }

  return `${match[1]}:${match[2]}`;
}


// =====================================================
// 天氣文字
// =====================================================

function weatherInfo(code) {

  const c = Number(code);

  if (c === 0) {

    return {
      text: "晴朗",
      icon: "☀️"
    };

  }

  if (c === 1 ||
      c === 2) {

    return {
      text: "大致天晴",
      icon: "🌤️"
    };

  }

  if (c === 3) {

    return {
      text: "多雲",
      icon: "☁️"
    };

  }

  if (
    c === 45 ||
    c === 48
  ) {

    return {
      text: "有霧",
      icon: "🌫️"
    };

  }

  if (
    c >= 51 &&
    c <= 67
  ) {

    return {
      text: "有雨",
      icon: "🌧️"
    };

  }

  if (
    c >= 80 &&
    c <= 82
  ) {

    return {
      text: "驟雨",
      icon: "🌦️"
    };

  }

  if (
    c >= 95
  ) {

    return {
      text: "雷暴",
      icon: "⛈️"
    };

  }

  return {
    text: "天氣變化",
    icon: "🌥️"
  };
}


// =====================================================
// 天氣 + 月亮資料
// =====================================================

let currentWeatherData = null;

let currentLocation =
  { ...DEFAULT_LOCATION };


async function loadWeather(
  location = DEFAULT_LOCATION
) {

  currentLocation =
    { ...location };


  const url =
    new URL(
      "https://api.open-meteo.com/v1/forecast"
    );


  url.searchParams.set(
    "latitude",
    location.lat
  );

  url.searchParams.set(
    "longitude",
    location.lon
  );


  // current：
  // 用於目前天氣顯示
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "weather_code",
      "cloud_cover",
      "precipitation",
      "visibility"
    ].join(",")
  );


  // hourly：
  // 不顯示表格，
  // 只用於計算今晚賞月指數
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "precipitation_probability",
      "cloud_cover",
      "visibility",
      "weather_code"
    ].join(",")
  );


  // 每日月亮資料
  url.searchParams.set(
    "daily",
    [
      "moonrise",
      "moonset",
      "moon_phase"
    ].join(",")
  );


  url.searchParams.set(
    "forecast_days",
    "2"
  );


  url.searchParams.set(
    "timezone",
    "Asia/Hong_Kong"
  );


  try {

    const response =
      await fetch(url.toString(), {
        cache: "no-store"
      });


    if (!response.ok) {
      throw new Error(
        `Open-Meteo HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    currentWeatherData =
      data;


    renderCurrentWeather(data);

    renderMoonData(data);

    calculateMoonScore(data);

    updateMoonPosition();


  } catch (error) {

    console.error(
      "Open-Meteo error:",
      error
    );


    weatherSummary.textContent =
      "暫時無法取得";


    weatherTemp.textContent =
      "請稍後重新載入";


    moonPhase.textContent =
      "暫時無法取得";


    scoreTitle.textContent =
      "資料暫時不可用";


    scoreDescription.textContent =
      "請稍後重新載入頁面。";
  }
}


// =====================================================
// 顯示目前天氣
// =====================================================

function renderCurrentWeather(data) {

  if (
    !data.current
  ) {
    return;
  }


  const current =
    data.current;


  const info =
    weatherInfo(
      current.weather_code
    );


  weatherSummary.textContent =
    `${info.icon} ${info.text}`;


  const temperature =
    Math.round(
      Number(
        current.temperature_2m
      )
    );


  const cloud =
    Math.round(
      Number(
        current.cloud_cover ?? 0
      )
    );


  weatherTemp.textContent =
    `${temperature}°C　雲量 ${cloud}%`;
}


// =====================================================
// 月亮資料
// =====================================================

function renderMoonData(data) {

  if (!data.daily) {
    return;
  }


  const daily =
    data.daily;


  const phase =
    daily.moon_phase?.[0];


  const phaseInfo =
    getMoonPhaseInfo(phase);


  moonPhase.textContent =
    phaseInfo.name;


  const today =
    getHongKongDateString();


  let todayIndex =
    daily.time?.indexOf(today);


  if (
    todayIndex === -1 ||
    todayIndex === undefined
  ) {

    todayIndex = 0;
  }


  const moonrise =
    daily.moonrise?.[todayIndex];


  const moonset =
    daily.moonset?.[todayIndex];


  moonriseTime.textContent =
    formatMoonTime(moonrise);


  moonsetTime.textContent =
    formatMoonTime(moonset);
}


// =====================================================
// 今晚賞月指數
// =====================================================

function calculateMoonScore(data) {

  if (!data.hourly) {
    return;
  }


  const hourly =
    data.hourly;


  const today =
    getHongKongDateString();


  const tonightHours = [];


  for (
    let i = 0;
    i < hourly.time.length;
    i++
  ) {

    const time =
      hourly.time[i];


    if (
      !time.startsWith(today)
    ) {
      continue;
    }


    const hour =
      Number(
        time.substring(11, 13)
      );


    if (
      hour >= 18 &&
      hour <= 23
    ) {

      tonightHours.push(i);
    }
  }


  if (!tonightHours.length) {
    return;
  }


  // ---------------------------------------------------
  // 找今晚較適合賞月的時間
  // ---------------------------------------------------

  let bestScore = 0;

  let bestHour = 20;


  tonightHours.forEach(i => {

    const cloud =
      Number(
        hourly.cloud_cover?.[i] ?? 100
      );


    const rain =
      Number(
        hourly.precipitation_probability?.[i] ?? 100
      );


    const visibility =
      Number(
        hourly.visibility?.[i] ?? 10000
      );


    const weatherCode =
      Number(
        hourly.weather_code?.[i] ?? 3
      );


    // 雲量分數：45%
    const cloudScore =
      Math.max(
        0,
        100 - cloud
      ) * 0.45;


    // 降雨分數：30%
    const rainScore =
      Math.max(
        0,
        100 - rain
      ) * 0.30;


    // 能見度：15%
    const visibilityPercent =
      Math.min(
        100,
        Math.max(
          0,
          visibility / 15000 * 100
        )
      );


    const visibilityScore =
      visibilityPercent * 0.15;


    // 天氣狀況輕微修正
    let weatherBonus = 0;


    if (
      weatherCode === 0
    ) {

      weatherBonus = 5;

    } else if (
      weatherCode === 1 ||
      weatherCode === 2
    ) {

      weatherBonus = 2;

    } else if (
      weatherCode >= 51
    ) {

      weatherBonus = -5;
    }


    const score =
      Math.round(
        Math.max(
          0,
          Math.min(
            100,
            cloudScore +
            rainScore +
            visibilityScore +
            weatherBonus
          )
        )
      );


    if (
      score > bestScore
    ) {

      bestScore = score;

      bestHour =
        Number(
          hourly.time[i]
            .substring(11, 13)
        );
    }

  });


  // ---------------------------------------------------
  // 加入目前月亮高度因素
  // ---------------------------------------------------

  const moonPosition =
    calculateMoonPosition(
      new Date(),
      currentLocation.lat,
      currentLocation.lon
    );


  let finalScore =
    bestScore;


  if (
    moonPosition.altitude > 20
  ) {

    finalScore += 8;

  } else if (
    moonPosition.altitude > 5
  ) {

    finalScore += 4;

  } else if (
    moonPosition.altitude < 0
  ) {

    finalScore -= 5;
  }


  finalScore =
    Math.round(
      Math.max(
        0,
        Math.min(
          100,
          finalScore
        )
      )
    );


  renderScore(
    finalScore,
    bestHour
  );
}


// =====================================================
// 顯示賞月指數
// =====================================================

function renderScore(
  score,
  bestHour
) {

  scoreNumber.textContent =
    score;


  let title;

  let description;


  if (score >= 85) {

    title =
      "非常適合賞月";

    description =
      `今晚 ${String(bestHour).padStart(2, "0")}:00 左右值得出門看看月亮。`;

  } else if (score >= 70) {

    title =
      "適合賞月";

    description =
      `今晚 ${String(bestHour).padStart(2, "0")}:00 左右可以考慮出門賞月。`;

  } else if (score >= 50) {

    title =
      "天氣一般";

    description =
      "雲層或降雨機會可能影響月亮觀賞。";

  } else if (score >= 30) {

    title =
      "賞月條件較差";

    description =
      "今晚雲層、降雨或能見度可能影響觀賞。";

  } else {

    title =
      "今晚不太適合";

    description =
      "目前天氣條件不太有利於觀賞月亮。";
  }


  scoreTitle.textContent =
    title;


  scoreDescription.textContent =
    description;
}


// =====================================================
// 月亮天文計算
//
// 低精度版本。
// 用於目前「月亮在哪裡」功能。
// =====================================================

function degToRad(deg) {
  return deg * Math.PI / 180;
}


function radToDeg(rad) {
  return rad * 180 / Math.PI;
}


function normalize360(value) {

  let result =
    value % 360;

  if (result < 0) {
    result += 360;
  }

  return result;
}


function julianDate(date) {

  return (
    date.getTime() / 86400000
  ) + 2440587.5;
}


function calculateMoonPosition(
  date,
  latitude,
  longitude
) {

  const d =
    julianDate(date) - 2451543.5;


  // -----------------------------
  // Moon orbital elements
  // -----------------------------

  const N =
    normalize360(
      125.1228 -
      0.0529538083 * d
    );


  const i =
    5.1454;


  const w =
    normalize360(
      318.0634 +
      0.1643573223 * d
    );


  const a =
    60.2666;


  const e =
    0.054900;


  const M =
    normalize360(
      115.3654 +
      13.0649929509 * d
    );


  const E =
    degToRad(
      M +
      radToDeg(
        e *
        Math.sin(
          degToRad(M)
        )
      )
    );


  const xv =
    a *
    (
      Math.cos(E) -
      e
    );


  const yv =
    a *
    Math.sqrt(
      1 - e * e
    ) *
    Math.sin(E);


  const v =
    radToDeg(
      Math.atan2(
        yv,
        xv
      )
    );


  const r =
    Math.sqrt(
      xv * xv +
      yv * yv
    );


  const xh =
    r *
    (
      Math.cos(
        degToRad(N)
      ) *
      Math.cos(
        degToRad(v + w)
      ) -
      Math.sin(
        degToRad(N)
      ) *
      Math.sin(
        degToRad(v + w)
      ) *
      Math.cos(
        degToRad(i)
      )
    );


  const yh =
    r *
    (
      Math.sin(
        degToRad(N)
      ) *
      Math.cos(
        degToRad(v + w)
      ) +
      Math.cos(
        degToRad(N)
      ) *
      Math.sin(
        degToRad(v + w)
      ) *
      Math.cos(
        degToRad(i)
      )
    );


  const zh =
    r *
    Math.sin(
      degToRad(v + w)
    ) *
    Math.sin(
      degToRad(i)
    );


  const eclLon =
    radToDeg(
      Math.atan2(
        yh,
        xh
      )
    );


  const eclLat =
    radToDeg(
      Math.atan2(
        zh,
        Math.sqrt(
          xh * xh +
          yh * yh
        )
      )
    );


  // -----------------------------
  // Ecliptic -> Equatorial
  // -----------------------------

  const oblecl =
    23.4393 -
    3.563e-7 * d;


  const xequat =
    Math.cos(
      degToRad(eclLon)
    ) *
    Math.cos(
      degToRad(eclLat)
    );


  const yequat =
    Math.sin(
      degToRad(eclLon)
    ) *
    Math.cos(
      degToRad(eclLat)
    ) *
    Math.cos(
      degToRad(oblecl)
    ) -
    Math.sin(
      degToRad(eclLat)
    ) *
    Math.sin(
      degToRad(oblecl)
    );


  const zequat =
    Math.sin(
      degToRad(eclLon)
    ) *
    Math.cos(
      degToRad(eclLat)
    ) *
    Math.sin(
      degToRad(oblecl)
    ) +
    Math.sin(
      degToRad(eclLat)
    ) *
    Math.cos(
      degToRad(oblecl)
    );


  const RA =
    radToDeg(
      Math.atan2(
        yequat,
        xequat
      )
    ) / 15;


  const Dec =
    radToDeg(
      Math.atan2(
        zequat,
        Math.sqrt(
          xequat * xequat +
          yequat * yequat
        )
      )
    );


  // -----------------------------
  // Local Sidereal Time
  // -----------------------------

  const JD =
    julianDate(date);


  const T =
    (
      JD - 2451545.0
    ) / 36525;


  let GMST =
    280.46061837 +
    360.98564736629 *
    (
      JD - 2451545.0
    ) +
    0.000387933 *
    T * T -
    T * T * T / 38710000;


  GMST =
    normalize360(
      GMST
    );


  const LST =
    normalize360(
      GMST + longitude
    );


  const hourAngle =
    normalize360(
      LST - RA * 15
    );


  // -----------------------------
  // Equatorial -> Horizontal
  // -----------------------------

  const H =
    degToRad(
      hourAngle > 180
        ? hourAngle - 360
        : hourAngle
    );


  const latRad =
    degToRad(latitude);


  const decRad =
    degToRad(Dec);


  let altitude =
    radToDeg(
      Math.asin(
        Math.sin(latRad) *
        Math.sin(decRad) +
        Math.cos(latRad) *
        Math.cos(decRad) *
        Math.cos(H)
      )
    );


  let azimuth =
    radToDeg(
      Math.atan2(
        Math.sin(H),
        Math.cos(H) *
        Math.sin(latRad) -
        Math.tan(decRad) *
        Math.cos(latRad)
      )
    );


  azimuth =
    normalize360(
      azimuth + 180
    );


  // -----------------------------
  // 大氣折射
  // -----------------------------

  if (
    altitude > -1 &&
    altitude < 90
  ) {

    const refraction =
      1.02 /
      Math.tan(
        degToRad(
          altitude +
          10.3 /
          (
            altitude + 5.11
          )
        )
      ) / 60;


    altitude += refraction;
  }


  return {
    azimuth,
    altitude
  };
}


// =====================================================
// 方位文字
// =====================================================

function getDirectionName(
  azimuth
) {

  const directions = [
    "北",
    "北北東",
    "東北偏北",
    "東北",
    "東北偏東",
    "東北偏東",
    "東",
    "東南偏東",
    "東南",
    "東南偏南",
    "南",
    "南南西",
    "西南",
    "西南偏西",
    "西",
    "西北偏西",
    "西北",
    "西北偏北"
  ];


  const index =
    Math.round(
      azimuth / 22.5
    ) % 16;


  const shortDirections = [
    "北",
    "北北東",
    "東北",
    "東北偏東",
    "東",
    "東南偏東",
    "東南",
    "南南東",
    "南",
    "西南偏南",
    "西南",
    "西南偏西",
    "西",
    "西北偏西",
    "西北",
    "北北西"
  ];


  return (
    shortDirections[index] ||
    "北"
  );
}


// =====================================================
// 更新月亮位置
// =====================================================

function updateMoonPosition() {

  const position =
    calculateMoonPosition(
      new Date(),
      currentLocation.lat,
      currentLocation.lon
    );


  const azimuth =
    Math.round(
      position.azimuth
    );


  const altitude =
    Math.round(
      position.altitude
    );


  const direction =
    getDirectionName(
      position.azimuth
    );


  moonDirection.textContent =
    `${direction} ${azimuth}°`;


  if (
    position.altitude < 0
  ) {

    moonPositionText.textContent =
      `月亮高度約 ${altitude}° · 目前在地平線以下`;

  } else {

    moonPositionText.textContent =
      `月亮高度約 ${altitude}°`;
  }


  // 指向羅盤上的方位
  if (moonNeedle) {

    moonNeedle.style.transform =
      `translate(-50%, -50%) rotate(${azimuth}deg)`;
  }


  console.log(
    "Moon position:",
    {
      azimuth,
      altitude,
      direction
    }
  );
}


// =====================================================
// CounterAPI
//
// 只增加計數。
// 不將結果放到網頁。
// =====================================================

async function trackPageView() {

  try {

    if (
      typeof Counter === "undefined"
    ) {

      console.warn(
        "CounterAPI library not loaded."
      );

      return;
    }


    const counter =
      new Counter({
        workspace: "moon-watch-hk"
      });


    await counter.up(
      "page-views"
    );


    console.log(
      "Moon Watch HK page view counted."
    );


  } catch (error) {

    // Counter 出錯不應影響網站正常運作

    console.warn(
      "CounterAPI error:",
      error
    );
  }
}


// =====================================================
// 啟動
// =====================================================

async function init() {

  // 背景記錄瀏覽量
  trackPageView();


  // 載入香港資料
  await loadWeather(
    DEFAULT_LOCATION
  );


  // 每 30 秒重新計算月亮位置
  setInterval(
    updateMoonPosition,
    30000
  );
}


init();