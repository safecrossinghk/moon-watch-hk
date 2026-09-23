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
   CounterAPI 設定
   ==================================================

   如果你已有 CounterAPI workspace，
   將下面名稱改成你的 workspace。

   網頁不會顯示瀏覽人次。
   只會在 CounterAPI 後台記錄。
   ================================================== */

const COUNTER_WORKSPACE = "moon-watch-hk";
const COUNTER_NAME = "page-views";


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
   Toast
   ================================================== */

function showToast(message) {

  if (!toast) {
    return;
  }

  toast.textContent = message;

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
          COUNTER_WORKSPACE
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
   Render weather
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


  const nowIndex =
    findNearestHourIndex(
      times
    );


  if (
    nowIndex < 0
  ) {

    return;
  }


  const temp =
    temperatures[nowIndex];

  const cloud =
    clouds[nowIndex];

  const code =
    weatherCodes[nowIndex];


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


  let bestIndex = 0;

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


  /*
     Open-Meteo 已指定
     timezone=Asia/Hong_Kong。

     這裡建立一個接近本地時間的 Date，
     主要用於今晚資料判斷。
  */

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


    /*
       如果月落時間在月出之前，
       嘗試使用翌日月落。
    */

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
      (1 -
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
   ==================================================

   以下為低精度天文計算。

   用香港：

   latitude  = 22.3193
   longitude = 114.1694

   計算：

   Moon RA
   Moon Dec
   Local Sidereal Time
   Azimuth
   Altitude

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


  /*
     Moon orbital elements
  */

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


  /*
     Ecliptic → Equatorial
  */

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


  /*
     Local Sidereal Time
  */

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


  /*
     Equatorial → Horizontal
  */

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


  /*
     Azimuth:
     0 = North
     90 = East
     180 = South
     270 = West
  */

  azimuth =
    normalizeAngle(
      azimuth + 180
    );


  /*
     簡單大氣折射修正。
     只在地平線附近使用。
  */

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


  /*
     更新指南針箭頭。
  */

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

   注意：
   這是 Moon Watch HK 自己的資訊指標，
   並不是官方氣象機構評級。
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
            Number(clouds[index]),
          rain:
            Number(rain[index]),
          visibility:
            Number(visibility[index])
        });
      }

    }
  );


  if (
    tonight.length === 0
  ) {

    return;
  }


  /*
     每一小時評分
  */

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


        /*
           Open-Meteo visibility 單位為米。
           10km 或以上視為滿分。
        */

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


        /*
           月亮高度：
           0° 以下 = 0
           60° 或以上 = 100
        */

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


  /*
     今晚平均分數
  */

  const average =
    Math.round(
      scored.reduce(
        (
          total,
          item
        ) =>
          total + item.score,
        0
      ) /
      scored.length
    );


  /*
     找最佳時間
  */

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

updateMoonPosition();


/*
   每 30 秒更新一次月亮方位及高度。
*/

setInterval(
  updateMoonPosition,
  30000
);