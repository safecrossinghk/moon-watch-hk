/* ==================================================
   Moon Watch HK V0.6
   ==================================================

   V0.6 重點：

   1. Open-Meteo 天氣
   2. Open-Meteo 月相
   3. Open-Meteo 月出 / 月落
   4. 真實月亮方位
   5. 真實月亮高度
   6. 真實賞月指數
   7. 原本賞月指數圓環
   8. 原本月亮位置卡片
   9. 右上角選單
   10. CounterAPI 隱藏式瀏覽次數
   11. 維多利亞公園即時人流

   ================================================== */


"use strict";


/* ==================================================
   香港預設位置
   ================================================== */

const DEFAULT_LOCATION = {
  lat: 22.3193,
  lon: 114.1694
};


/* ==================================================
   維多利亞公園人流 Worker
   ================================================== */

const VICTORIA_PARK_WORKER =
  "https://tiny-disk-0d7b.ctakwah.workers.dev/";


/* ==================================================
   CounterAPI 設定
   ================================================== */


const COUNTER_WORKSPACE = "moon-watch-hk";
const COUNTER_NAME = "moon-watch-hk";
const COUNTER_API_KEY = "ut_BOL8Qvqe55faGPve7aLSNjpfDRGXdUTEp245Vx8L";


/* ==================================================
   DOM
   ================================================== */

const menuBtn =
  document.getElementById("menuBtn");

const menuClose =
  document.getElementById("menuClose");

const siteMenu =
  document.getElementById("siteMenu");

const scoreRing =
  document.getElementById("scoreRing");

const scoreNumber =
  document.querySelector(".score-number");

const scoreTitle =
  document.querySelector(".score-copy h2");

const scoreText =
  document.querySelector(".score-copy p");

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

const toast =
  document.getElementById("toast");


/* ==================================================
   維多利亞公園人流 DOM
   ================================================== */

const crowdStatus =
  document.getElementById("crowdStatus");

const crowdPercentage =
  document.getElementById("crowdPercentage");

const crowdUpdated =
  document.getElementById("crowdUpdated");


/* ==================================================
   Toast
   ================================================== */

function showToast(message) {

  if (!toast) {
    return;
  }

  toast.textContent =
    message;

  toast.classList.add("show");

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(() => {

      toast.classList.remove("show");

    }, 2500);
}


/* ==================================================
   Menu
   ================================================== */

function openMenu() {

  if (!siteMenu) {
    return;
  }

  siteMenu.classList.add("open");

  siteMenu.setAttribute(
    "aria-hidden",
    "false"
  );

  if (menuBtn) {

    menuBtn.setAttribute(
      "aria-expanded",
      "true"
    );
  }
}


function closeMenu() {

  if (!siteMenu) {
    return;
  }

  siteMenu.classList.remove("open");

  siteMenu.setAttribute(
    "aria-hidden",
    "true"
  );

  if (menuBtn) {

    menuBtn.setAttribute(
      "aria-expanded",
      "false"
    );
  }
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


if (siteMenu) {

  siteMenu
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        closeMenu
      );

    });
}


/* ==================================================
   CounterAPI
   ================================================== */

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
        workspace:
          COUNTER_WORKSPACE,

        accessToken:
          COUNTER_API_KEY
      });


    await counter.up(
      COUNTER_NAME
    );


    console.log(
      "Moon Watch HK page view recorded."
    );

  } catch (error) {

    console.warn(
      "CounterAPI error:",
      error
    );

  }
}


/*
   注意：

   不會把 counter 數字寫到 HTML。

   所以使用者完全看不到瀏覽人次。
*/

trackPageView();


/* ==================================================
   維多利亞公園人流
   ==================================================

   使用現有 Cloudflare Worker：

   https://tiny-disk-0d7b.ctakwah.workers.dev/

   查詢：

   維多利亞公園

   不顯示：
   - 地圖
   - 未來 3 小時預測
   - 搜尋框

   只顯示：
   - 現時人流狀態
   - 百分比
   - 查詢時間

   ================================================== */

async function loadVictoriaParkCrowd() {

  if (
    !crowdStatus ||
    !crowdPercentage ||
    !crowdUpdated
  ) {

    return;
  }


  try {

    crowdStatus.textContent =
      "載入中…";

    crowdPercentage.textContent =
      "--%";

    crowdUpdated.textContent =
      "正在查詢現場人流…";


    const url =
      VICTORIA_PARK_WORKER +
      "?query=" +
      encodeURIComponent(
        "維多利亞公園"
      );


    const response =
      await fetch(
        url,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `Crowd Worker HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    const percentage =
      getCrowdPercentage(
        data
      );


    if (
      !Number.isFinite(
        percentage
      )
    ) {

      throw new Error(
        "找不到人流百分比"
      );
    }


    renderVictoriaParkCrowd(
      percentage
    );


  } catch (error) {

    console.error(
      "Victoria Park crowd error:",
      error
    );


    crowdStatus.textContent =
      "暫時無法取得";


    crowdPercentage.textContent =
      "--%";


    crowdUpdated.textContent =
      "請稍後重新整理";

  }
}


/* ==================================================
   取得人流百分比
   ================================================== */

function getCrowdPercentage(data) {

  if (!data) {
    return null;
  }


  /*
     第一優先：
     Worker 的 popular_times
     中 day = live 的資料。
  */

  if (
    Array.isArray(
      data.popular_times
    )
  ) {

    const live =
      data.popular_times.find(
        item =>
          String(
            item.day || ""
          ).toLowerCase() ===
          "live"
      );


    if (
      live &&
      Number.isFinite(
        Number(
          live.percentage
        )
      )
    ) {

      return Number(
        live.percentage
      );
    }
  }


  /*
     如果 Worker 直接提供
     percentage，也可以使用。
  */

  if (
    Number.isFinite(
      Number(
        data.percentage
      )
    )
  ) {

    return Number(
      data.percentage
    );
  }


  /*
     兼容 current.percentage。
  */

  if (
    data.current &&
    Number.isFinite(
      Number(
        data.current.percentage
      )
    )
  ) {

    return Number(
      data.current.percentage
    );
  }


  return null;
}


/* ==================================================
   顯示維多利亞公園人流
   ================================================== */

function renderVictoriaParkCrowd(
  percentage
) {

  percentage =
    clamp(
      Math.round(
        percentage
      ),
      0,
      100
    );


  let status =
    "🟡 正常";


  let statusColor =
    "#f2c94c";


  /*
     < 60%
     正常
  */

  if (
    percentage < 60
  ) {

    status =
      "🟢 正常";

    statusColor =
      "#55d68a";
  }


  /*
     60% - 79%
     繁忙
  */

  else if (
    percentage < 80
  ) {

    status =
      "🟡 繁忙";

    statusColor =
      "#f2c94c";
  }


  /*
     >= 80%
     非常繁忙
  */

  else {

    status =
      "🔴 非常繁忙";

    statusColor =
      "#ff6b6b";
  }


  crowdStatus.textContent =
    status;


  crowdPercentage.textContent =
    `${percentage}%`;


  /*
     只為人流狀態加入顏色，
     不修改其他 Moon Watch HK 顏色。
  */

  crowdStatus.style.color =
    statusColor;


  crowdPercentage.style.color =
    statusColor;


  const now =
    new Date();


  const time =
    now.toLocaleTimeString(
      "zh-HK",
      {
        timeZone:
          "Asia/Hong_Kong",

        hour: "2-digit",
        minute: "2-digit",

        hour12: false
      }
    );


  crowdUpdated.textContent =
    `最後查詢 ${time}`;
}


/* ==================================================
   Open-Meteo
   ================================================== */

async function loadWeather() {

  const lat =
    DEFAULT_LOCATION.lat;

  const lon =
    DEFAULT_LOCATION.lon;


  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    "&hourly=" +
    [
      "temperature_2m",
      "precipitation_probability",
      "cloud_cover",
      "visibility",
      "weather_code"
    ].join(",") +
    "&daily=" +
    [
      "moonrise",
      "moonset",
      "moon_phase"
    ].join(",") +
    "&forecast_days=2" +
    "&timezone=Asia%2FHong_Kong";


  try {

    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        `Open-Meteo HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    renderWeather(data);

    renderMoonData(data);

    calculateTonightScore(data);


  } catch (error) {

    console.error(
      "Open-Meteo error:",
      error
    );


    if (weatherSummary) {

      weatherSummary.textContent =
        "暫時無法取得";
    }

    if (weatherTemp) {

      weatherTemp.textContent =
        "請稍後重新整理";
    }

  }
}


/* ==================================================
   香港日期
   ================================================== */

function getHongKongDateString() {

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Hong_Kong",

        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).formatToParts(
      new Date()
    );


  const map = {};


  parts.forEach(part => {

    if (
      part.type !== "literal"
    ) {

      map[part.type] =
        part.value;
    }

  });


  return (
    `${map.year}-${map.month}-${map.day}`
  );
}


/* ==================================================
   Weather code
   ================================================== */

function getWeatherInfo(code) {

  if (code === 0) {

    return {
      icon: "☀️",
      text: "晴朗"
    };
  }


  if (
    code === 1 ||
    code === 2
  ) {

    return {
      icon: "🌤️",
      text: "大致晴朗"
    };
  }


  if (code === 3) {

    return {
      icon: "☁️",
      text: "多雲"
    };
  }


  if (
    code === 45 ||
    code === 48
  ) {

    return {
      icon: "🌫️",
      text: "有霧"
    };
  }


  if (
    code >= 51 &&
    code <= 67
  ) {

    return {
      icon: "🌧️",
      text: "有雨"
    };
  }


  if (
    code >= 71 &&
    code <= 77
  ) {

    return {
      icon: "❄️",
      text: "降雪"
    };
  }


  if (
    code >= 80 &&
    code <= 82
  ) {

    return {
      icon: "🌦️",
      text: "陣雨"
    };
  }


  if (
    code >= 95
  ) {

    return {
      icon: "⛈️",
      text: "雷雨"
    };
  }


  return {
    icon: "🌤️",
    text: "天氣變化"
  };
}


/* ==================================================
   Render 今晚天氣
   ==================================================

   「今晚天氣」代表今晚 20:00 預測。

   ================================================== */

function renderWeather(data) {

  if (
    !data ||
    !data.hourly
  ) {

    return;
  }


  const hourly =
    data.hourly;

  const times =
    hourly.time || [];

  const temperatures =
    hourly.temperature_2m || [];

  const clouds =
    hourly.cloud_cover || [];

  const weatherCodes =
    hourly.weather_code || [];


  const tonightIndex =
    findTonightWeatherIndex(
      times
    );


  if (
    tonightIndex < 0
  ) {

    return;
  }


  const temp =
    temperatures[tonightIndex];

  const cloud =
    clouds[tonightIndex];

  const code =
    weatherCodes[tonightIndex];


  const info =
    getWeatherInfo(code);


  if (weatherSummary) {

    weatherSummary.textContent =
      `${info.icon} ${info.text}`;
  }


  if (weatherTemp) {

    const tempText =
      Number.isFinite(temp)
        ? `${Math.round(temp)}°C`
        : "--°C";


    const cloudText =
      Number.isFinite(cloud)
        ? `・雲量 ${Math.round(cloud)}%`
        : "";


    weatherTemp.textContent =
      `${tempText}${cloudText}`;
  }
}


/* ==================================================
   找今晚 20:00
   ================================================== */

function findTonightWeatherIndex(times) {

  if (
    !Array.isArray(times) ||
    times.length === 0
  ) {

    return -1;
  }


  const today =
    getHongKongDateString();


  let bestIndex =
    -1;

  let bestDifference =
    Infinity;


  times.forEach(
    (time, index) => {

      const match =
        time.match(
          /^(\d{4}-\d{2}-\d{2})T(\d{2}):/
        );


      if (!match) {
        return;
      }


      const date =
        match[1];

      const hour =
        Number(
          match[2]
        );


      if (
        date !== today ||
        hour < 18 ||
        hour > 23
      ) {

        return;
      }


      const difference =
        Math.abs(
          hour - 20
        );


      if (
        difference <
        bestDifference
      ) {

        bestDifference =
          difference;

        bestIndex =
          index;
      }

    }
  );


  return bestIndex;
}


/* ==================================================
   找最接近現在的一小時
   ================================================== */

function findNearestHourIndex(times) {

  if (
    !Array.isArray(times) ||
    times.length === 0
  ) {

    return -1;
  }


  const now =
    new Date();


  let bestIndex =
    0;

  let bestDifference =
    Infinity;


  times.forEach(
    (time, index) => {

      const parsed =
        parseLocalDateTime(
          time
        );


      const difference =
        Math.abs(
          parsed.getTime() -
          now.getTime()
        );


      if (
        difference <
        bestDifference
      ) {

        bestDifference =
          difference;

        bestIndex =
          index;
      }

    }
  );


  return bestIndex;
}


/* ==================================================
   Parse Open-Meteo local datetime
   ================================================== */

function parseLocalDateTime(value) {

  if (
    !value ||
    typeof value !== "string"
  ) {

    return new Date(
      "invalid"
    );
  }


  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
    );


  if (!match) {

    return new Date(value);
  }


  const [
    ,
    year,
    month,
    day,
    hour,
    minute
  ] = match;


  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0
  );
}


/* ==================================================
   Moon data
   ================================================== */

function renderMoonData(data) {

  if (
    !data ||
    !data.daily
  ) {

    return;
  }


  const daily =
    data.daily;


  const phases =
    daily.moon_phase || [];


  const moonrises =
    daily.moonrise || [];


  const moonsets =
    daily.moonset || [];


  const phase =
    phases[0];


  const moonInfo =
    getMoonPhaseInfo(
      phase
    );


  if (moonPhase) {

    moonPhase.textContent =
      moonInfo.name;
  }


  if (
    moonrises.length
  ) {

    moonriseTime.textContent =
      formatMoonTime(
        moonrises[0]
      );
  }


  if (
    moonsets.length
  ) {

    let moonset =
      moonsets[0];


    if (
      moonrises[0] &&
      moonset &&
      moonset < moonrises[0] &&
      moonsets[1]
    ) {

      moonset =
        moonsets[1];
    }


    moonsetTime.textContent =
      formatMoonTime(
        moonset
      );
  }
}


/* ==================================================
   Moon phase
   ================================================== */

function getMoonPhaseInfo(phase) {

  if (
    !Number.isFinite(phase)
  ) {

    return {
      name: "月相資料",
      illumination: null
    };
  }


  let name;


  if (
    phase < 0.0625 ||
    phase >= 0.9375
  ) {

    name = "新月";

  } else if (
    phase < 0.1875
  ) {

    name = "娥眉月";

  } else if (
    phase < 0.3125
  ) {

    name = "上弦月";

  } else if (
    phase < 0.4375
  ) {

    name = "盈凸月";

  } else if (
    phase < 0.5625
  ) {

    name = "滿月";

  } else if (
    phase < 0.6875
  ) {

    name = "虧凸月";

  } else if (
    phase < 0.8125
  ) {

    name = "下弦月";

  } else {

    name = "殘月";
  }


  const illumination =
    (
      (
        1 -
        Math.cos(
          2 *
          Math.PI *
          phase
        )
      ) / 2
    ) * 100;


  return {
    name,
    illumination
  };
}


/* ==================================================
   Moon time
   ================================================== */

function formatMoonTime(value) {

  if (!value) {

    return "--:--";
  }


  const match =
    value.match(
      /T(\d{2}):(\d{2})/
    );


  if (!match) {

    return "--:--";
  }


  return `${match[1]}:${match[2]}`;
}


/* ==================================================
   真實月亮位置
   ================================================== */

function calculateMoonPosition(
  date,
  latitude,
  longitude
) {

  const jd =
    julianDate(date);


  const d =
    jd - 2451543.5;


  const N =
    normalizeAngle(
      125.1228 -
      0.0529538083 * d
    );


  const i =
    5.1454;


  const w =
    normalizeAngle(
      318.0634 +
      0.1643573223 * d
    );


  const a =
    60.2666;


  const e =
    0.054900;


  const M =
    normalizeAngle(
      115.3654 +
      13.0649929509 * d
    );


  const E =
    solveKepler(
      M,
      e
    );


  const xv =
    a *
    (
      Math.cos(
        degToRad(E)
      ) -
      e
    );


  const yv =
    a *
    (
      Math.sqrt(
        1 - e * e
      ) *
      Math.sin(
        degToRad(E)
      )
    );


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


  const lon =
    radToDeg(
      Math.atan2(
        yh,
        xh
      )
    );


  const lat =
    radToDeg(
      Math.atan2(
        zh,
        Math.sqrt(
          xh * xh +
          yh * yh
        )
      )
    );


  const obliquity =
    23.4393 -
    3.563E-7 * d;


  const eclLon =
    normalizeAngle(
      lon
    );


  const ra =
    radToDeg(
      Math.atan2(
        Math.sin(
          degToRad(eclLon)
        ) *
        Math.cos(
          degToRad(obliquity)
        ) -
        Math.tan(
          degToRad(lat)
        ) *
        Math.sin(
          degToRad(obliquity)
        ),
        Math.cos(
          degToRad(eclLon)
        )
      )
    );


  const dec =
    radToDeg(
      Math.asin(
        Math.sin(
          degToRad(lat)
        ) *
        Math.cos(
          degToRad(obliquity)
        ) +
        Math.cos(
          degToRad(lat)
        ) *
        Math.sin(
          degToRad(obliquity)
        ) *
        Math.sin(
          degToRad(eclLon)
        )
      )
    );


  const raHours =
    normalizeAngle(ra) / 15;


  const gmst =
    normalizeAngle(
      280.46061837 +
      360.98564736629 *
      (jd - 2451545.0)
    );


  const lst =
    normalizeAngle(
      gmst + longitude
    ) / 15;


  let hourAngle =
    (
      lst -
      raHours
    ) * 15;


  hourAngle =
    normalizeAngle180(
      hourAngle
    );


  const H =
    degToRad(
      hourAngle
    );


  const decRad =
    degToRad(
      dec
    );


  const latRad =
    degToRad(
      latitude
    );


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
    normalizeAngle(
      azimuth + 180
    );


  if (
    altitude > -1 &&
    altitude < 90
  ) {

    const correction =
      1.02 /
      Math.tan(
        degToRad(
          altitude +
          10.3 /
          (
            altitude +
            5.11
          )
        )
      ) / 60;


    altitude +=
      correction;
  }


  return {
    azimuth,
    altitude,
    ra,
    dec
  };
}


/* ==================================================
   Julian Date
   ================================================== */

function julianDate(date) {

  return (
    date.getTime() /
    86400000 +
    2440587.5
  );
}


/* ==================================================
   Kepler
   ================================================== */

function solveKepler(
  meanAnomaly,
  eccentricity
) {

  let E =
    meanAnomaly;


  for (
    let i = 0;
    i < 8;
    i++
  ) {

    const f =
      E -
      radToDeg(
        eccentricity *
        Math.sin(
          degToRad(E)
        )
      ) -
      meanAnomaly;


    const derivative =
      1 -
      eccentricity *
      Math.cos(
        degToRad(E)
      );


    E -=
      f /
      derivative;
  }


  return E;
}


/* ==================================================
   Angle helpers
   ================================================== */

function degToRad(deg) {

  return deg *
    Math.PI /
    180;
}


function radToDeg(rad) {

  return rad *
    180 /
    Math.PI;
}


function normalizeAngle(angle) {

  return (
    (
      angle % 360
    ) + 360
  ) % 360;
}


function normalizeAngle180(angle) {

  let result =
    normalizeAngle(
      angle
    );


  if (
    result > 180
  ) {

    result -= 360;
  }


  return result;
}


/* ==================================================
   中文方位
   ================================================== */

function getDirectionName(
  azimuth
) {

  const directions = [
    "北",
    "北北東",
    "東北",
    "東北偏東",
    "東",
    "東南偏東",
    "東南",
    "南南東",
    "南",
    "南南西",
    "西南",
    "西南偏西",
    "西",
    "西北偏西",
    "西北",
    "北北西"
  ];


  const index =
    Math.round(
      azimuth / 22.5
    ) % 16;


  return directions[index];
}


/* ==================================================
   更新月亮位置
   ================================================== */

function updateMoonPosition() {

  const position =
    calculateMoonPosition(
      new Date(),
      DEFAULT_LOCATION.lat,
      DEFAULT_LOCATION.lon
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


  if (moonDirection) {

    moonDirection.textContent =
      `${direction} ${azimuth}°`;
  }


  if (moonPositionText) {

    if (
      position.altitude < 0
    ) {

      moonPositionText.textContent =
        `月亮高度約 ${altitude}° · 目前在地平線以下`;

    } else {

      moonPositionText.textContent =
        `月亮高度約 ${altitude}°`;
    }
  }


  if (moonNeedle) {

    moonNeedle.style.transform =
      `rotate(${position.azimuth}deg)`;
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


/* ==================================================
   今晚賞月指數
   ==================================================

   評分：

   雲量       45%
   降雨機率   30%
   能見度     15%
   月亮高度   10%

   ================================================== */

function calculateTonightScore(
  data
) {

  if (
    !data ||
    !data.hourly
  ) {

    return;
  }


  const hourly =
    data.hourly;


  const times =
    hourly.time || [];


  const clouds =
    hourly.cloud_cover || [];


  const rain =
    hourly.precipitation_probability || [];


  const visibility =
    hourly.visibility || [];


  const today =
    getHongKongDateString();


  const tonight = [];


  times.forEach(
    (time, index) => {

      const match =
        time.match(
          /^(\d{4}-\d{2}-\d{2})T(\d{2}):/
        );


      if (!match) {
        return;
      }


      const date =
        match[1];

      const hour =
        Number(
          match[2]
        );


      if (
        date === today &&
        hour >= 18 &&
        hour <= 23
      ) {

        tonight.push({
          index,
          hour,
          cloud:
            Number(
              clouds[index]
            ),
          rain:
            Number(
              rain[index]
            ),
          visibility:
            Number(
              visibility[index]
            )
        });
      }

    }
  );


  if (
    tonight.length === 0
  ) {

    return;
  }


  const scored =
    tonight.map(
      item => {

        const cloudScore =
          clamp(
            100 -
            item.cloud,
            0,
            100
          );


        const rainScore =
          clamp(
            100 -
            item.rain,
            0,
            100
          );


        const visibilityScore =
          clamp(
            (
              item.visibility /
              10000
            ) * 100,
            0,
            100
          );


        const moon =
          calculateMoonPosition(
            new Date(),
            DEFAULT_LOCATION.lat,
            DEFAULT_LOCATION.lon
          );


        const moonAltitudeScore =
          clamp(
            (
              moon.altitude /
              60
            ) * 100,
            0,
            100
          );


        const score =
          Math.round(
            cloudScore * 0.45 +
            rainScore * 0.30 +
            visibilityScore * 0.15 +
            moonAltitudeScore * 0.10
          );


        return {
          ...item,
          score
        };

      }
    );


  const average =
    Math.round(
      scored.reduce(
        (
          total,
          item
        ) =>
          total +
          item.score,
        0
      ) /
      scored.length
    );


  const best =
    scored.reduce(
      (
        bestItem,
        item
      ) =>
        item.score >
        bestItem.score
          ? item
          : bestItem,
      scored[0]
    );


  renderScore(
    average,
    best.hour
  );
}


/* ==================================================
   Render score
   ================================================== */

function renderScore(
  score,
  bestHour
) {

  score =
    clamp(
      Math.round(score),
      0,
      100
    );


  if (scoreNumber) {

    scoreNumber.textContent =
      score;
  }


  if (scoreRing) {

    scoreRing.style
      .setProperty(
        "--score-pct",
        `${score}%`
      );
  }


  let title =
    "天氣一般";


  if (
    score >= 85
  ) {

    title =
      "非常適合賞月";

  } else if (
    score >= 70
  ) {

    title =
      "適合賞月";

  } else if (
    score >= 50
  ) {

    title =
      "天氣一般";

  } else if (
    score >= 30
  ) {

    title =
      "賞月條件較差";

  } else {

    title =
      "今晚較難看到月亮";
  }


  if (scoreTitle) {

    scoreTitle.textContent =
      title;
  }


  if (scoreText) {

    const hourText =
      String(
        bestHour
      ).padStart(
        2,
        "0"
      );


    scoreText.textContent =
      `較佳時段：${hourText}:00`;
  }
}


/* ==================================================
   Clamp
   ================================================== */

function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


/* ==================================================
   啟動
   ================================================== */

loadWeather();

loadVictoriaParkCrowd();

updateMoonPosition();


/*
   每 30 秒更新一次月亮方位及高度。
*/

setInterval(
  updateMoonPosition,
  30000
);


/*
   每 5 分鐘重新查詢一次
   維多利亞公園人流。

   不需要每 30 秒查詢，
   避免對 Worker 造成不必要請求。
*/

setInterval(
  loadVictoriaParkCrowd,
  5 * 60 * 1000
);