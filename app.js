// ==========================================================
// 🌕 Moon Watch HK
// V0.5 - Open-Meteo + 真實月亮位置 + 今晚賞月指數
//
// 功能：
// 1. Open-Meteo 真實天氣
// 2. Open-Meteo 月相 / 月出 / 月落
// 3. 天文計算：月亮即時方位 / 高度
// 4. 今晚賞月指數 0-100
// 5. 直接更新原本 HTML 的卡片
// 6. GPS 使用我的位置
// ==========================================================

(() => {
"use strict";

// ----------------------------------------------------------
// 基本設定
// ----------------------------------------------------------

const DEFAULT_LOCATION = {
lat: 22.3193,
lon: 114.1694,
name: "香港"
};

let currentLocation = { ...DEFAULT_LOCATION };
let currentWeatherData = null;
let currentMoonData = null;
let moonPositionTimer = null;
let countdownTimer = null;

// ----------------------------------------------------------
// DOM
// ----------------------------------------------------------

const scoreNumber = document.querySelector(".score-number");
const scoreTitle = document.querySelector(".score-copy h2");
const scoreDescription = document.querySelector(".score-copy p");

const moonPhaseEl = document.getElementById("moonPhase");
const moonPhasePercentEl = document.getElementById("moonPhasePercent");

const weatherSummaryEl = document.getElementById("weatherSummary");
const weatherTempEl = document.getElementById("weatherTemp");

const moonriseTimeEl = document.getElementById("moonriseTime");
const moonriseLabelEl = document.getElementById("moonriseLabel");

const moonsetTimeEl = document.getElementById("moonsetTime");
const moonsetLabelEl = document.getElementById("moonsetLabel");

const weatherUpdatedEl = document.getElementById("weatherUpdated");
const hourlyWeatherEl = document.getElementById("hourlyWeather");

const countdownEl = document.getElementById("countdown");
const countdownTextEl = document.getElementById("countdownText");

const moonriseArcTimeEl = document.getElementById("moonriseArcTime");
const moonsetArcTimeEl = document.getElementById("moonsetArcTime");

const locationBtn = document.getElementById("locationBtn");
const toastEl = document.getElementById("toast");

const directionBigEl = document.querySelector(".direction-big");
const directionMutedEl = document.querySelector(".direction .muted");
const needleEl = document.querySelector(".needle");

// ----------------------------------------------------------
// 工具
// ----------------------------------------------------------

function showToast(message) {
if (!toastEl) return;

toastEl.textContent = message;
toastEl.classList.add("show");

setTimeout(() => {
toastEl.classList.remove("show");
}, 2600);
}

function pad2(value) {
return String(value).padStart(2, "0");
}

function formatTime(value) {
if (!value) return "--:--";

// Open-Meteo timezone=Asia/Hong_Kong
// 回傳格式通常是：
// 2026-09-21T14:10
const match = String(value).match(/T(\d{2}):(\d{2})/);

if (match) {
return `${match[1]}:${match[2]}`;
}

return "--:--";
}

function getHongKongDateParts(date = new Date()) {
const formatter = new Intl.DateTimeFormat("en-CA", {
timeZone: "Asia/Hong_Kong",
year: "numeric",
month: "2-digit",
day: "2-digit",
hour: "2-digit",
minute: "2-digit",
second: "2-digit",
hourCycle: "h23"
});

const parts = formatter.formatToParts(date);

const result = {};

parts.forEach(part => {
if (part.type !== "literal") {
result[part.type] = part.value;
}
});

return {
year: Number(result.year),
month: Number(result.month),
day: Number(result.day),
hour: Number(result.hour),
minute: Number(result.minute),
second: Number(result.second)
};
}

function getHKDateString(date = new Date()) {
const p = getHongKongDateParts(date);

return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

function parseLocalDateTime(text) {
if (!text) return null;

const match = String(text).match(
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
);

if (!match) return null;

const year = Number(match[1]);
const month = Number(match[2]);
const day = Number(match[3]);
const hour = Number(match[4]);
const minute = Number(match[5]);
const second = Number(match[6] || 0);

// 香港 UTC+8
return Date.UTC(
year,
month - 1,
day,
hour - 8,
minute,
second
);
}

function formatDuration(ms) {
if (ms <= 0) return "00:00:00";

let totalSeconds = Math.floor(ms / 1000);

const hours = Math.floor(totalSeconds / 3600);
totalSeconds %= 3600;

const minutes = Math.floor(totalSeconds / 60);
const seconds = totalSeconds % 60;

return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

// ----------------------------------------------------------
// 天氣圖示
// ----------------------------------------------------------

function weatherInfo(code) {
const map = {
0: { text: "晴朗", icon: "☀️" },
1: { text: "大致晴朗", icon: "🌤️" },
2: { text: "局部多雲", icon: "⛅" },
3: { text: "多雲", icon: "☁️" },
45: { text: "有霧", icon: "🌫️" },
48: { text: "有霧", icon: "🌫️" },
51: { text: "毛毛雨", icon: "🌦️" },
53: { text: "毛毛雨", icon: "🌦️" },
55: { text: "毛毛雨", icon: "🌦️" },
56: { text: "凍毛毛雨", icon: "🌧️" },
57: { text: "凍毛毛雨", icon: "🌧️" },
61: { text: "有雨", icon: "🌧️" },
63: { text: "有雨", icon: "🌧️" },
65: { text: "大雨", icon: "🌧️" },
66: { text: "凍雨", icon: "🌧️" },
67: { text: "凍雨", icon: "🌧️" },
71: { text: "有雪", icon: "🌨️" },
73: { text: "有雪", icon: "🌨️" },
75: { text: "大雪", icon: "❄️" },
77: { text: "雪粒", icon: "🌨️" },
80: { text: "驟雨", icon: "🌦️" },
81: { text: "驟雨", icon: "🌧️" },
82: { text: "大驟雨", icon: "⛈️" },
85: { text: "陣雪", icon: "🌨️" },
86: { text: "大陣雪", icon: "❄️" },
95: { text: "雷雨", icon: "⛈️" },
96: { text: "雷雨", icon: "⛈️" },
99: { text: "雷雨", icon: "⛈️" }
};

return map[code] || {
text: "天氣不明",
icon: "🌥️"
};
}

// ----------------------------------------------------------
// 月相
// ----------------------------------------------------------

function getMoonPhaseInfo(phase) {
if (phase == null || Number.isNaN(Number(phase))) {
return {
name: "月相不明",
emoji: "🌕",
illumination: null
};
}

const p = Number(phase);

let name;
let emoji;

if (p < 0.03 || p >= 0.97) {
name = "新月";
emoji = "🌑";
} else if (p < 0.22) {
name = "娥眉月";
emoji = "🌒";
} else if (p < 0.28) {
name = "上弦月";
emoji = "🌓";
} else if (p < 0.47) {
name = "盈凸月";
emoji = "🌔";
} else if (p < 0.53) {
name = "滿月";
emoji = "🌕";
} else if (p < 0.72) {
name = "虧凸月";
emoji = "🌖";
} else if (p < 0.78) {
name = "下弦月";
emoji = "🌗";
} else {
name = "殘月";
emoji = "🌘";
}

// 根據月相週期估算照明比例
const illumination =
Math.round(
((1 - Math.cos(2 * Math.PI * p)) / 2) * 100
);

return {
name,
emoji,
illumination
};
}

// ----------------------------------------------------------
// Open-Meteo
// ----------------------------------------------------------

async function loadWeather(location) {
const url =
"https://api.open-meteo.com/v1/forecast" +
`?latitude=${encodeURIComponent(location.lat)}` +
`&longitude=${encodeURIComponent(location.lon)}` +
"&hourly=temperature_2m,precipitation_probability,cloud_cover,visibility,weather_code" +
"&daily=moonrise,moonset,moon_phase" +
"&forecast_days=2" +
"&timezone=Asia%2FHong_Kong";

try {
if (weatherUpdatedEl) {
weatherUpdatedEl.textContent = "更新中";
}

const response = await fetch(url, {
cache: "no-store"
});

if (!response.ok) {
throw new Error(`Open-Meteo HTTP ${response.status}`);
}

const data = await response.json();

currentWeatherData = data;

renderCurrentWeather(data);
renderMoonData(data);
renderHourlyWeather(data);

// 天氣完成後計算今晚賞月指數
calculateTonightScore(data);

// 啟動月出倒數
startMoonriseCountdown();

// 即時月亮位置
updateMoonPosition();

if (moonPositionTimer) {
clearInterval(moonPositionTimer);
}

moonPositionTimer = setInterval(() => {
updateMoonPosition();
}, 30000);

} catch (error) {
console.error("Open-Meteo error:", error);

if (weatherUpdatedEl) {
weatherUpdatedEl.textContent = "資料讀取失敗";
}

if (weatherSummaryEl) {
weatherSummaryEl.textContent = "暫時無法取得";
}

if (weatherTempEl) {
weatherTempEl.textContent = "請稍後重新整理";
}

showToast("暫時無法取得 Open-Meteo 天氣資料");
}
}

// ----------------------------------------------------------
// 目前天氣
// ----------------------------------------------------------

function renderCurrentWeather(data) {
if (!data || !data.hourly) return;

const now = Date.now();

let closestIndex = 0;
let closestDiff = Infinity;

data.hourly.time.forEach((time, index) => {
const t = parseLocalDateTime(time);
if (t == null) return;

const diff = Math.abs(t - now);

if (diff < closestDiff) {
closestDiff = diff;
closestIndex = index;
}
});

const temp = data.hourly.temperature_2m?.[closestIndex];
const code = data.hourly.weather_code?.[closestIndex];
const cloud = data.hourly.cloud_cover?.[closestIndex];

const info = weatherInfo(code);

if (weatherSummaryEl) {
weatherSummaryEl.textContent =
`${info.icon} ${info.text}`;
}

if (weatherTempEl) {
const tempText =
temp != null
? `${Math.round(temp)}°C`
: "--°C";

const cloudText =
cloud != null
? `雲量 ${Math.round(cloud)}%`
: "";

weatherTempEl.textContent =
`${tempText}${cloudText ? " · " + cloudText : ""}`;
}

if (weatherUpdatedEl) {
const p = getHongKongDateParts();

weatherUpdatedEl.textContent =
`LIVE ${pad2(p.hour)}:${pad2(p.minute)}`;
}
}

// ----------------------------------------------------------
// 月相 / 月出 / 月落
// ----------------------------------------------------------

function renderMoonData(data) {
if (!data || !data.daily) return;

const today = getHKDateString();

let index = data.daily.time.indexOf(today);

if (index < 0) {
index = 0;
}

const moonrise = data.daily.moonrise?.[index];
const moonset = data.daily.moonset?.[index];
const phase = data.daily.moon_phase?.[index];

currentMoonData = {
moonrise,
moonset,
phase
};

const phaseInfo = getMoonPhaseInfo(phase);

if (moonPhaseEl) {
moonPhaseEl.textContent =
`${phaseInfo.emoji} ${phaseInfo.name}`;
}

if (moonPhasePercentEl) {
if (phaseInfo.illumination != null) {
moonPhasePercentEl.textContent =
`約 ${phaseInfo.illumination}% 可見`;
} else {
moonPhasePercentEl.textContent =
"正在取得資料";
}
}

if (moonriseTimeEl) {
moonriseTimeEl.textContent =
formatTime(moonrise);
}

if (moonriseLabelEl) {
moonriseLabelEl.textContent =
"香港本地時間";
}

if (moonsetTimeEl) {
moonsetTimeEl.textContent =
formatTime(moonset);
}

if (moonsetLabelEl) {
moonsetLabelEl.textContent =
"香港本地時間";
}

if (moonriseArcTimeEl) {
moonriseArcTimeEl.textContent =
formatTime(moonrise);
}

if (moonsetArcTimeEl) {
moonsetArcTimeEl.textContent =
formatTime(moonset);
}
}

// ----------------------------------------------------------
// 今晚逐小時天氣
// ----------------------------------------------------------

function getTonightRows(data) {
if (!data || !data.hourly) return [];

const today = getHongKongDateParts();

const todayString =
`${today.year}-${pad2(today.month)}-${pad2(today.day)}`;

const rows = [];

for (let i = 0; i < data.hourly.time.length; i++) {
const time = data.hourly.time[i];

if (!time.startsWith(todayString)) {
continue;
}

const match = time.match(/T(\d{2}):(\d{2})/);

if (!match) continue;

const hour = Number(match[1]);

// 今晚 18:00 - 23:00
if (hour < 18 || hour > 23) {
continue;
}

rows.push({
time,
hour,
temperature: data.hourly.temperature_2m?.[i],
rainProbability:
data.hourly.precipitation_probability?.[i],
cloud:
data.hourly.cloud_cover?.[i],
visibility:
data.hourly.visibility?.[i],
weatherCode:
data.hourly.weather_code?.[i]
});
}

return rows;
}

function renderHourlyWeather(data) {
if (!hourlyWeatherEl) return;

const rows = getTonightRows(data);

if (!rows.length) {
hourlyWeatherEl.innerHTML =
`<div class="weather-loading">暫時沒有今晚逐小時資料</div>`;
return;
}

hourlyWeatherEl.innerHTML = rows.map(row => {
const info = weatherInfo(row.weatherCode);

const temp =
row.temperature != null
? `${Math.round(row.temperature)}°`
: "--";

const cloud =
row.cloud != null
? `雲 ${Math.round(row.cloud)}%`
: "雲 --";

const rain =
row.rainProbability != null
? `雨 ${Math.round(row.rainProbability)}%`
: "雨 --";

return `
<div class="hour-row">
<div class="hour-time">
${pad2(row.hour)}:00
</div>

<div class="hour-icon">
${info.icon}
</div>

<div class="hour-temp">
${temp}
</div>

<div class="hour-detail">
${info.text}<br>
${cloud} · ${rain}
</div>

<div class="hour-live">
LIVE
</div>
</div>
`;
}).join("");
}

// ==========================================================
// 🌕 月亮天文計算
// ==========================================================

function degToRad(deg) {
return deg * Math.PI / 180;
}

function radToDeg(rad) {
return rad * 180 / Math.PI;
}

function normalizeDegrees(value) {
let result = value % 360;

if (result < 0) {
result += 360;
}

return result;
}

function normalizeRadians(value) {
const twoPi = Math.PI * 2;

let result = value % twoPi;

if (result < 0) {
result += twoPi;
}

return result;
}

// ----------------------------------------------------------
// Julian Date
// ----------------------------------------------------------

function julianDate(date) {
return date.getTime() / 86400000 + 2440587.5;
}

// ----------------------------------------------------------
// 低誤差月球軌道計算
//
// 用於 Moon Watch 的「現在在哪裡」功能。
// 目的：
// - 方位角
// - 高度角
//
// 不用作專業天文觀測級定位。
// ----------------------------------------------------------

function calculateMoonPosition(date, lat, lon) {

const jd = julianDate(date);
const d = jd - 2451543.5;

// Moon orbital elements
const N =
normalizeDegrees(
125.1228 - 0.0529538083 * d
);

const i = 5.1454;

const w =
318.0634 + 0.1643573223 * d;

const a = 60.2666;

const e = 0.054900;

const M =
normalizeDegrees(
115.3654 + 13.0649929509 * d
);

const Nrad = degToRad(N);
const irad = degToRad(i);
const wrad = degToRad(w);
const Mrad = degToRad(M);

// Eccentric anomaly
let E = Mrad;

for (let j = 0; j < 8; j++) {
E =
E -
(
E - e * Math.sin(E) - Mrad
) /
(
1 - e * Math.cos(E)
);
}

// Orbital plane coordinates
const xv =
a *
(
Math.cos(E) - e
);

const yv =
a *
(
Math.sqrt(1 - e * e) *
Math.sin(E)
);

const v =
Math.atan2(yv, xv);

const r =
Math.sqrt(
xv * xv + yv * yv
);

// Ecliptic coordinates
const xh =
r *
(
Math.cos(Nrad) * Math.cos(v + wrad) -
Math.sin(Nrad) *
Math.sin(v + wrad) *
Math.cos(irad)
);

const yh =
r *
(
Math.sin(Nrad) * Math.cos(v + wrad) +
Math.cos(Nrad) *
Math.sin(v + wrad) *
Math.cos(irad)
);

const zh =
r *
(
Math.sin(v + wrad) *
Math.sin(irad)
);

const lonEcl =
Math.atan2(yh, xh);

const latEcl =
Math.atan2(
zh,
Math.sqrt(xh * xh + yh * yh)
);

// --------------------------------------------------------
// Obliquity of ecliptic
// --------------------------------------------------------

const ecl =
degToRad(
23.4393 - 3.563e-7 * d
);

// Ecliptic -> Equatorial
const xe =
Math.cos(latEcl) *
Math.cos(lonEcl);

const ye =
Math.cos(latEcl) *
Math.sin(lonEcl);

const ze =
Math.sin(latEcl);

const xeq = xe;

const yeq =
ye * Math.cos(ecl) -
ze * Math.sin(ecl);

const zeq =
ye * Math.sin(ecl) +
ze * Math.cos(ecl);

let ra =
Math.atan2(yeq, xeq);

if (ra < 0) {
ra += Math.PI * 2;
}

const dec =
Math.atan2(
zeq,
Math.sqrt(
xeq * xeq +
yeq * yeq
)
);

// --------------------------------------------------------
// Local Sidereal Time
// --------------------------------------------------------

const T =
(jd - 2451545.0) / 36525;

const gmst =
normalizeDegrees(
280.46061837 +
360.98564736629 *
(jd - 2451545.0) +
0.000387933 * T * T -
T * T * T / 38710000
);

const lst =
degToRad(
normalizeDegrees(
gmst + lon
)
);

// Hour angle
const H =
normalizeRadians(
lst - ra
);

// --------------------------------------------------------
// Topocentric correction
// --------------------------------------------------------

const latRad =
degToRad(lat);

const u =
Math.atan(
0.99664719 *
Math.tan(latRad)
);

const rhoSin =
0.99664719 *
Math.sin(u);

const rhoCos =
Math.cos(u);

const moonDistance =
r;

const sinParallax =
1 / moonDistance;

const cosH = Math.cos(H);
const sinH = Math.sin(H);

let topocentricRa =
ra -
Math.atan2(
rhoCos *
sinParallax *
sinH,

Math.cos(dec) -
rhoCos *
sinParallax *
cosH
);

const topocentricDec =
Math.atan2(
(
Math.sin(dec) -
rhoSin * sinParallax
) *
Math.cos(
topocentricRa - ra
),

Math.cos(dec) -
rhoCos *
sinParallax *
cosH
);

// --------------------------------------------------------
// Alt/Az
// --------------------------------------------------------

const hourAngle =
normalizeRadians(
lst - topocentricRa
);

const sinAlt =
Math.sin(latRad) *
Math.sin(topocentricDec) +
Math.cos(latRad) *
Math.cos(topocentricDec) *
Math.cos(hourAngle);

let altitude =
radToDeg(
Math.asin(
Math.max(-1, Math.min(1, sinAlt))
)
);

let azimuth =
radToDeg(
Math.atan2(
Math.sin(hourAngle),

Math.cos(hourAngle) *
Math.sin(latRad) -
Math.tan(topocentricDec) *
Math.cos(latRad)
)
);

azimuth =
normalizeDegrees(
azimuth + 180
);

// --------------------------------------------------------
// 大氣折射
// 只對地平線以上位置修正
// --------------------------------------------------------

if (altitude > -1 && altitude < 90) {
const refraction =
1.02 /
Math.tan(
degToRad(
altitude +
10.3 /
(altitude + 5.11)
)
) /
60;

altitude += refraction;
}

return {
azimuth,
altitude
};
}

// ----------------------------------------------------------
// 方位文字
// ----------------------------------------------------------

function getDirectionName(azimuth) {
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
normalizeDegrees(azimuth) / 22.5
) % 16;

return directions[index];
}

// ----------------------------------------------------------
// 即時月亮位置
//
// 直接寫入原本：
// .direction-big
// .direction .muted
// ----------------------------------------------------------

function updateMoonPosition() {
if (!directionBigEl || !directionMutedEl) {
return;
}

const position =
calculateMoonPosition(
new Date(),
currentLocation.lat,
currentLocation.lon
);

const azimuth =
Math.round(
normalizeDegrees(position.azimuth)
);

const altitude =
Math.round(
position.altitude
);

const direction =
getDirectionName(azimuth);

directionBigEl.textContent =
`${direction} ${azimuth}°`;

if (altitude >= 0) {
directionMutedEl.textContent =
`月亮高度約 ${altitude}° · 天文計算`;
} else {
directionMutedEl.textContent =
`月亮高度約 ${altitude}° · 目前在地平線以下`;
}

// 原本箭咀是 ↗
// 將它大致旋轉到月亮所在方向
if (needleEl) {
needleEl.style.transform =
`rotate(${azimuth - 45}deg)`;
needleEl.style.transformOrigin =
"center center";
}

console.log(
"🌕 Moon position",
{
latitude: currentLocation.lat,
longitude: currentLocation.lon,
azimuth,
altitude,
direction
}
);
}

// ==========================================================
// 🌕 今晚賞月指數
// ==========================================================

function calculateWeatherScore(row) {
if (!row) return 0;

const cloud =
row.cloud != null
? Number(row.cloud)
: 50;

const rain =
row.rainProbability != null
? Number(row.rainProbability)
: 30;

const visibility =
row.visibility != null
? Number(row.visibility)
: 10000;

// --------------------------------------------------------
// 雲量分
// 45%
// --------------------------------------------------------

const cloudScore =
Math.max(
0,
Math.min(
100,
100 - cloud
)
);

// --------------------------------------------------------
// 降雨機率分
// 30%
// --------------------------------------------------------

const rainScore =
Math.max(
0,
Math.min(
100,
100 - rain
)
);

// --------------------------------------------------------
// 能見度
// 15%
// --------------------------------------------------------

const visibilityKm =
visibility / 1000;

let visibilityScore;

if (visibilityKm >= 15) {
visibilityScore = 100;
} else if (visibilityKm >= 10) {
visibilityScore = 90;
} else if (visibilityKm >= 7) {
visibilityScore = 80;
} else if (visibilityKm >= 5) {
visibilityScore = 65;
} else if (visibilityKm >= 3) {
visibilityScore = 45;
} else {
visibilityScore = 20;
}

return (
cloudScore * 0.45 +
rainScore * 0.30 +
visibilityScore * 0.15
);
}

// ----------------------------------------------------------
// 月亮高度分
// 10%
// ----------------------------------------------------------

function calculateMoonVisibilityScore(date) {
const position =
calculateMoonPosition(
date,
currentLocation.lat,
currentLocation.lon
);

const altitude =
position.altitude;

// 地平線以下
if (altitude < -5) {
return 0;
}

// 剛剛升起
if (altitude < 5) {
return 35;
}

if (altitude < 15) {
return 60;
}

if (altitude < 30) {
return 80;
}

if (altitude < 50) {
return 100;
}

// 太高仍然可以看
return 90;
}

// ----------------------------------------------------------
// 今晚賞月指數
// ----------------------------------------------------------

function calculateTonightScore(data) {
const rows =
getTonightRows(data);

if (!rows.length || !scoreNumber) {
return;
}

const tonightScores = [];

rows.forEach(row => {

// 建立香港時間該小時的 Date
const dateText =
`${row.time}:00`;

const timestamp =
parseLocalDateTime(dateText);

if (timestamp == null) {
return;
}

const date =
new Date(timestamp);

const weatherScore =
calculateWeatherScore(row);

const moonScore =
calculateMoonVisibilityScore(date);

// 天氣部分佔 90%
// 月亮高度佔 10%
const total =
weatherScore * 0.90 +
moonScore * 0.10;

tonightScores.push({
hour: row.hour,
total,
weatherScore,
moonScore,
date
});
});

if (!tonightScores.length) {
return;
}

// 找出今晚最佳時段
tonightScores.sort(
(a, b) =>
b.total - a.total
);

const best =
tonightScores[0];

let score =
Math.round(best.total);

score =
Math.max(
0,
Math.min(
100,
score
)
);

// --------------------------------------------------------
// 分級文字
// --------------------------------------------------------

let title;

if (score >= 85) {
title = "非常適合賞月";
} else if (score >= 70) {
title = "適合賞月";
} else if (score >= 50) {
title = "天氣一般";
} else if (score >= 30) {
title = "賞月條件較差";
} else {
title = "今晚不太適合賞月";
}

// --------------------------------------------------------
// 建議時段
// --------------------------------------------------------

const bestHourText =
`${pad2(best.hour)}:00`;

let description;

if (score >= 70) {
description =
`建議 ${bestHourText} 前後到戶外看看月亮`;
} else {
description =
`較佳時段：${bestHourText}`;
}

// --------------------------------------------------------
// 寫入原本 92 的位置
// --------------------------------------------------------

scoreNumber.textContent =
score;

if (scoreTitle) {
scoreTitle.textContent =
title;
}

if (scoreDescription) {
scoreDescription.textContent =
description;
}

// 將最佳時段另外顯示在 description 後面
// 如果原本 CSS 只容納一行，就不額外建立新元素
console.log(
"🌕 今晚賞月指數",
{
score,
title,
bestHour: bestHourText,
weatherScore: Math.round(best.weatherScore),
moonScore: Math.round(best.moonScore)
}
);
}

// ==========================================================
// 🌅 月出倒數
// ==========================================================

function getTodayMoonriseTimestamp() {
if (
!currentMoonData ||
!currentMoonData.moonrise
) {
return null;
}

return parseLocalDateTime(
currentMoonData.moonrise
);
}

function startMoonriseCountdown() {
if (countdownTimer) {
clearInterval(countdownTimer);
}

function updateCountdown() {
const moonriseTimestamp =
getTodayMoonriseTimestamp();

if (!moonriseTimestamp) {
if (countdownEl) {
countdownEl.textContent =
"--:--:--";
}

if (countdownTextEl) {
countdownTextEl.textContent =
"正在取得真實月出資料…";
}

return;
}

const now =
Date.now();

const diff =
moonriseTimestamp - now;

if (diff > 0) {

if (countdownEl) {
countdownEl.textContent =
formatDuration(diff);
}

if (countdownTextEl) {
countdownTextEl.textContent =
"距離月出還有";
}

} else {

if (countdownEl) {
countdownEl.textContent =
"🌕 已月出";
}

if (countdownTextEl) {
const elapsed =
now - moonriseTimestamp;

const hours =
Math.floor(
elapsed / 3600000
);

const minutes =
Math.floor(
(elapsed % 3600000) /
60000
);

if (hours > 0) {
countdownTextEl.textContent =
`月亮已升起約 ${hours} 小時 ${minutes} 分鐘`;
} else {
countdownTextEl.textContent =
`月亮已升起約 ${minutes} 分鐘`;
}
}
}
}

updateCountdown();

countdownTimer =
setInterval(
updateCountdown,
1000
);
}

// ==========================================================
// 📍 使用我的位置
// ==========================================================

function useMyLocation() {

if (!navigator.geolocation) {
showToast("此瀏覽器不支援定位功能");
return;
}

if (locationBtn) {
locationBtn.disabled = true;
locationBtn.textContent =
"📍 正在取得位置…";
}

navigator.geolocation.getCurrentPosition(
position => {

currentLocation = {
lat: position.coords.latitude,
lon: position.coords.longitude,
name: "我的位置"
};

const locationEl =
document.querySelector(".location");

if (locationEl) {
locationEl.textContent =
"📍 我的目前位置";
}

if (locationBtn) {
locationBtn.disabled = false;
locationBtn.textContent =
"📍 使用我的位置";
}

showToast("已使用你的目前位置");

// 重新取得該位置的天氣 / 月出月落
loadWeather(currentLocation);
},

error => {

console.error(
"Geolocation error:",
error
);

if (locationBtn) {
locationBtn.disabled = false;
locationBtn.textContent =
"📍 使用我的位置";
}

if (error.code === 1) {
showToast(
"你拒絕了定位權限，現時使用香港預設位置"
);
} else {
showToast(
"無法取得位置，現時使用香港預設位置"
);
}
},

{
enableHighAccuracy: true,
timeout: 15000,
maximumAge: 60000
}
);
}

// ==========================================================
// 選單
// ==========================================================

const menuBtn =
document.querySelector(".menu-btn");

if (menuBtn) {
menuBtn.addEventListener(
"click",
() => {
showToast(
"Moon Watch HK 選單功能稍後加入"
);
}
);
}

// ==========================================================
// Location button
// ==========================================================

if (locationBtn) {
locationBtn.addEventListener(
"click",
useMyLocation
);
}

// ==========================================================
// 啟動
// ==========================================================

console.log(
"🌕 Moon Watch HK V0.5 啟動"
);

console.log(
"📍 預設位置：",
currentLocation
);

loadWeather(
currentLocation
);

})();