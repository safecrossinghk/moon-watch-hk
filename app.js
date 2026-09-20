// ==========================================================
// 🌕 Moon Watch HK V0.5.1
//
// 功能：
// 1. Open-Meteo 真實天氣
// 2. Open-Meteo 真實月相
// 3. Open-Meteo 真實月出 / 月落
// 4. 天文計算：即時月亮方位
// 5. 天文計算：即時月亮高度
// 6. 今晚賞月指數 0–100
// 7. 自動找出今晚較佳賞月時段
// 8. GPS 使用者位置
// 9. 月出倒數
//
// 本版本只需要更換 app.js
// ==========================================================


// ==========================================================
// DOM
// ==========================================================

const countdownEl =
    document.getElementById("countdown");

const countdownTextEl =
    document.getElementById("countdownText");

const locationBtn =
    document.getElementById("locationBtn");

const toastEl =
    document.getElementById("toast");

const weatherSummaryEl =
    document.getElementById("weatherSummary");

const weatherTempEl =
    document.getElementById("weatherTemp");

const hourlyWeatherEl =
    document.getElementById("hourlyWeather");

const weatherUpdatedEl =
    document.getElementById("weatherUpdated");


// ==========================================================
// 預設位置：香港
// ==========================================================

const DEFAULT_LOCATION = {
    lat: 22.3193,
    lon: 114.1694,
    name: "香港"
};

let currentLocation = {
    ...DEFAULT_LOCATION
};


// ==========================================================
// 工具
// ==========================================================

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}


function degToRad(deg) {
    return deg * Math.PI / 180;
}


function radToDeg(rad) {
    return rad * 180 / Math.PI;
}


function normalizeAngle(angle) {

    angle %= 360;

    if (angle < 0) {
        angle += 360;
    }

    return angle;
}


// ==========================================================
// 香港日期
// ==========================================================

function getHongKongDateString(date = new Date()) {

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(date);
}


// ==========================================================
// 香港時間
// ==========================================================

function getHongKongHour(date = new Date()) {

    const value =
        new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Hong_Kong",
            hour: "2-digit",
            hour12: false
        }).format(date);

    return Number(value);
}


// ==========================================================
// 時間格式
// ==========================================================

function formatLocalTime(dateString) {

    if (!dateString) {
        return "--";
    }

    const match =
        dateString.match(/T(\d{2}):(\d{2})/);

    if (match) {
        return `${match[1]}:${match[2]}`;
    }

    return "--";
}


// ==========================================================
// 天氣文字
// ==========================================================

function weatherText(code) {

    const map = {

        0: "晴朗",
        1: "大致晴朗",
        2: "局部多雲",
        3: "多雲",

        45: "有霧",
        48: "霧",

        51: "毛毛雨",
        53: "毛毛雨",
        55: "毛毛雨",

        61: "小雨",
        63: "中雨",
        65: "大雨",

        66: "凍雨",
        67: "凍雨",

        71: "小雪",
        73: "中雪",
        75: "大雪",

        80: "陣雨",
        81: "陣雨",
        82: "大陣雨",

        95: "雷雨",
        96: "雷雨",
        99: "雷雨"
    };

    return map[code] || "天氣資料";
}


// ==========================================================
// 天氣圖示
// ==========================================================

function weatherIcon(code) {

    if (code === 0) return "☀️";

    if (code === 1 || code === 2) {
        return "🌤️";
    }

    if (code === 3) {
        return "☁️";
    }

    if (code === 45 || code === 48) {
        return "🌫️";
    }

    if (code >= 51 && code <= 67) {
        return "🌧️";
    }

    if (code >= 71 && code <= 77) {
        return "❄️";
    }

    if (code >= 80 && code <= 82) {
        return "🌦️";
    }

    if (code >= 95) {
        return "⛈️";
    }

    return "🌤️";
}


// ==========================================================
// 🌕 月相
// ==========================================================

function getMoonPhaseInfo(phase) {

    if (
        phase == null ||
        Number.isNaN(Number(phase))
    ) {

        return {
            name: "月相資料",
            illumination: null
        };
    }


    const p =
        Number(phase);


    let name;


    if (
        p < 0.0625 ||
        p >= 0.9375
    ) {

        name = "新月";

    } else if (p < 0.1875) {

        name = "眉月";

    } else if (p < 0.3125) {

        name = "上弦月";

    } else if (p < 0.4375) {

        name = "盈凸月";

    } else if (p < 0.5625) {

        name = "滿月";

    } else if (p < 0.6875) {

        name = "虧凸月";

    } else if (p < 0.8125) {

        name = "下弦月";

    } else {

        name = "殘月";
    }


    const illumination =
        (
            1 -
            Math.cos(2 * Math.PI * p)
        ) / 2 * 100;


    return {
        name,
        illumination
    };
}


// ==========================================================
// 🌕 Julian Date
// ==========================================================

function julianDate(date) {

    return (
        date.getTime() / 86400000
    ) + 2440587.5;
}


// ==========================================================
// 🌕 月亮天文位置計算
//
// 回傳：
// azimuth = 方位角
// altitude = 高度角
//
// 方位：
// 0°   北
// 90°  東
// 180° 南
// 270° 西
// ==========================================================

function moonPosition(
    date,
    latitude,
    longitude
) {

    const jd =
        julianDate(date);

    const d =
        jd - 2451543.5;


    // ------------------------------------------------------
    // 月球軌道元素
    // ------------------------------------------------------

    const N =
        normalizeAngle(
            125.1228 -
            0.0529538083 * d
        );

    const i =
        5.1454;

    const w =
        318.0634 +
        0.1643573223 * d;

    const a =
        60.2666;

    const e =
        0.054900;

    const M =
        normalizeAngle(
            115.3654 +
            13.0649929509 * d
        );


    // ------------------------------------------------------
    // 偏近點角
    // ------------------------------------------------------

    const Mrad =
        degToRad(M);

    let E =
        M +
        radToDeg(
            e *
            Math.sin(Mrad) *
            (
                1 +
                e *
                Math.cos(Mrad)
            )
        );

    E =
        degToRad(E);


    // ------------------------------------------------------
    // 軌道平面
    // ------------------------------------------------------

    const xv =
        a *
        (
            Math.cos(E) -
            e
        );

    const yv =
        a *
        Math.sqrt(1 - e * e) *
        Math.sin(E);


    const v =
        radToDeg(
            Math.atan2(yv, xv)
        );


    const r =
        Math.sqrt(
            xv * xv +
            yv * yv
        );


    // ------------------------------------------------------
    // 黃道座標
    // ------------------------------------------------------

    const Nrad =
        degToRad(N);

    const irad =
        degToRad(i);

    const vrad =
        degToRad(v + w);


    const xh =
        r *
        (
            Math.cos(Nrad) *
            Math.cos(vrad)
            -
            Math.sin(Nrad) *
            Math.sin(vrad) *
            Math.cos(irad)
        );


    const yh =
        r *
        (
            Math.sin(Nrad) *
            Math.cos(vrad)
            +
            Math.cos(Nrad) *
            Math.sin(vrad) *
            Math.cos(irad)
        );


    const zh =
        r *
        Math.sin(vrad) *
        Math.sin(irad);


    const eclipticLongitude =
        radToDeg(
            Math.atan2(yh, xh)
        );


    const eclipticLatitude =
        radToDeg(
            Math.atan2(
                zh,
                Math.sqrt(
                    xh * xh +
                    yh * yh
                )
            )
        );


    // ------------------------------------------------------
    // 黃赤交角
    // ------------------------------------------------------

    const ecl =
        23.4393 -
        3.563E-7 * d;

    const eclRad =
        degToRad(ecl);


    const lonRad =
        degToRad(
            eclipticLongitude
        );

    const latRad =
        degToRad(
            eclipticLatitude
        );


    // ------------------------------------------------------
    // 黃道座標 → 赤道座標
    //
    // 注意：
    // 這裡的 latRad 是「月球黃道緯度」
    // 不可以再用作觀測者緯度
    // ------------------------------------------------------

    const xe =
        Math.cos(lonRad) *
        Math.cos(latRad);


    const ye =
        Math.sin(lonRad) *
        Math.cos(latRad) *
        Math.cos(eclRad)
        -
        Math.sin(latRad) *
        Math.sin(eclRad);


    const ze =
        Math.sin(lonRad) *
        Math.cos(latRad) *
        Math.sin(eclRad)
        +
        Math.sin(latRad) *
        Math.cos(eclRad);


    const ra =
        radToDeg(
            Math.atan2(ye, xe)
        );


    const dec =
        radToDeg(
            Math.atan2(
                ze,
                Math.sqrt(
                    xe * xe +
                    ye * ye
                )
            )
        );


    // ------------------------------------------------------
    // 本地恆星時
    // ------------------------------------------------------

    const GMST =
        normalizeAngle(
            280.46061837
            +
            360.98564736629 *
            (jd - 2451545.0)
            +
            0.000387933 *
            Math.pow(
                (jd - 2451545.0) / 36525,
                2
            )
        );


    const LST =
        normalizeAngle(
            GMST + longitude
        );


    const hourAngle =
        normalizeAngle(
            LST - ra
        );


    const H =
        degToRad(
            hourAngle > 180
                ? hourAngle - 360
                : hourAngle
        );


    // ------------------------------------------------------
    // 觀測者緯度
    //
    // 重要：
    // 改名為 observerLatRad
    // 避免與上面的月球 latRad 重複
    // ------------------------------------------------------

    const observerLatRad =
        degToRad(latitude);

    const decRad =
        degToRad(dec);


    // ------------------------------------------------------
    // 赤道座標 → 高度角
    // ------------------------------------------------------

    let altitude =
        Math.asin(
            Math.sin(observerLatRad) *
            Math.sin(decRad)
            +
            Math.cos(observerLatRad) *
            Math.cos(decRad) *
            Math.cos(H)
        );


    altitude =
        radToDeg(altitude);


    // ------------------------------------------------------
    // 方位角
    // ------------------------------------------------------

    let azimuth =
        Math.atan2(
            Math.sin(H),
            Math.cos(H) *
            Math.sin(observerLatRad)
            -
            Math.tan(decRad) *
            Math.cos(observerLatRad)
        );


    azimuth =
        normalizeAngle(
            radToDeg(azimuth) + 180
        );


    // ------------------------------------------------------
    // 大氣折射
    // ------------------------------------------------------

    let apparentAltitude =
        altitude;


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
                    (altitude + 5.11)
                )
            ) /
            60;


        apparentAltitude =
            altitude + refraction;
    }


    return {

        azimuth:
            normalizeAngle(azimuth),

        altitude:
            apparentAltitude
    };
}


// ==========================================================
// 🧭 方位文字
// ==========================================================

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
        "南東偏南",
        "南",
        "西南偏南",
        "西南",
        "西南偏西",
        "西",
        "西北偏西",
        "西北",
        "北西偏北"
    ];


    const index =
        Math.round(
            azimuth / 22.5
        ) % 16;


    return directions[index];
}


// ==========================================================
// 🌕 即時月亮位置
// ==========================================================

function renderMoonPosition() {

    const now =
        new Date();


    const position =
        moonPosition(
            now,
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


    const altitudeText =
        altitude > 0
            ? "離地平線"
            : "目前在地平線以下";


    // ------------------------------------------------------
    // 如果 HTML 本身有 moonAzimuth
    // ------------------------------------------------------

    const azEl =
        document.getElementById(
            "moonAzimuth"
        );


    if (azEl) {

        azEl.textContent =
            `${azimuth}°`;
    }


    // ------------------------------------------------------
    // 如果 HTML 本身有 moonAltitude
    // ------------------------------------------------------

    const altEl =
        document.getElementById(
            "moonAltitude"
        );


    if (altEl) {

        altEl.textContent =
            `${altitude}°`;
    }


    // ------------------------------------------------------
    // 舊月亮位置文字
    // ------------------------------------------------------

    const moonDirectionEl =
        document.getElementById(
            "moonDirection"
        );


    if (moonDirectionEl) {

        moonDirectionEl.textContent =
            `${direction} ${azimuth}°`;
    }


    const moonDemoEl =
        document.getElementById(
            "moonDemo"
        );


    if (moonDemoEl) {

        moonDemoEl.textContent =
            `月亮高度約 ${altitude}°・天文計算`;
    }


    // ------------------------------------------------------
    // 建立 / 更新即時月亮位置卡
    // ------------------------------------------------------

    let liveCard =
        document.getElementById(
            "liveMoonPosition"
        );


    if (!liveCard) {

        liveCard =
            document.createElement("div");


        liveCard.id =
            "liveMoonPosition";


        liveCard.style.marginTop =
            "18px";


        liveCard.style.padding =
            "22px";


        liveCard.style.borderRadius =
            "24px";


        liveCard.style.background =
            "rgba(255,255,255,0.06)";


        liveCard.style.border =
            "1px solid rgba(255,255,255,0.18)";


        const parent =
            document.querySelector(
                ".details, .moon-details, main"
            );


        if (parent) {

            parent.appendChild(
                liveCard
            );

        } else {

            document.body.appendChild(
                liveCard
            );
        }
    }


    const timeText =
        new Intl.DateTimeFormat(
            "zh-HK",
            {
                timeZone: "Asia/Hong_Kong",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }
        ).format(now);


    liveCard.innerHTML = `

        <div style="
            font-size:18px;
            font-weight:700;
            margin-bottom:16px;
        ">
            🌕 即時月亮位置
        </div>

        <div style="
            display:flex;
            gap:42px;
            margin-bottom:10px;
        ">

            <div>

                <div style="
                    font-size:15px;
                    opacity:.7;
                ">
                    方位
                </div>

                <div style="
                    font-size:38px;
                    font-weight:700;
                    line-height:1.1;
                ">
                    ${azimuth}°
                </div>

                <div style="
                    font-size:17px;
                ">
                    ${direction}
                </div>

            </div>


            <div>

                <div style="
                    font-size:15px;
                    opacity:.7;
                ">
                    高度
                </div>

                <div style="
                    font-size:38px;
                    font-weight:700;
                    line-height:1.1;
                ">
                    ${altitude}°
                </div>

                <div style="
                    font-size:17px;
                ">
                    ${altitudeText}
                </div>

            </div>

        </div>


        <div style="
            margin-top:18px;
            font-size:14px;
            opacity:.65;
        ">
            天文計算 · ${timeText}
        </div>
    `;
}


// ==========================================================
// 🌕 月相 / 月出 / 月落
// ==========================================================

function renderMoonData(data) {

    if (
        !data ||
        !data.daily ||
        !data.daily.time ||
        !data.daily.time.length
    ) {
        return;
    }


    const phaseEl =
        document.getElementById(
            "moonPhase"
        );


    const phasePercentEl =
        document.getElementById(
            "moonPhasePercent"
        );


    const moonriseEl =
        document.getElementById(
            "moonriseTime"
        );


    const moonriseLabelEl =
        document.getElementById(
            "moonriseLabel"
        );


    const moonsetEl =
        document.getElementById(
            "moonsetTime"
        );


    const moonsetLabelEl =
        document.getElementById(
            "moonsetLabel"
        );


    const moonriseArcEl =
        document.getElementById(
            "moonriseArcTime"
        );


    const moonsetArcEl =
        document.getElementById(
            "moonsetArcTime"
        );


    const today =
        getHongKongDateString();


    let index =
        data.daily.time.indexOf(
            today
        );


    if (index < 0) {
        index = 0;
    }


    const phase =
        data.daily.moon_phase
            ? data.daily.moon_phase[index]
            : null;


    const moonInfo =
        getMoonPhaseInfo(
            phase
        );


    const moonrise =
        data.daily.moonrise
            ? data.daily.moonrise[index]
            : null;


    const moonset =
        data.daily.moonset
            ? data.daily.moonset[index]
            : null;


    if (phaseEl) {

        phaseEl.textContent =
            moonInfo.name;
    }


    if (
        phasePercentEl &&
        moonInfo.illumination != null
    ) {

        phasePercentEl.textContent =
            `約 ${Math.round(
                moonInfo.illumination
            )}% 可見`;
    }


    if (moonriseEl) {

        moonriseEl.textContent =
            formatLocalTime(
                moonrise
            );
    }


    if (moonriseLabelEl) {

        moonriseLabelEl.textContent =
            "香港本地時間";
    }


    if (moonsetEl) {

        moonsetEl.textContent =
            formatLocalTime(
                moonset
            );
    }


    if (moonsetLabelEl) {

        moonsetLabelEl.textContent =
            "香港本地時間";
    }


    if (moonriseArcEl) {

        moonriseArcEl.textContent =
            formatLocalTime(
                moonrise
            );
    }


    if (moonsetArcEl) {

        moonsetArcEl.textContent =
            formatLocalTime(
                moonset
            );
    }


    startMoonriseCountdown(
        moonrise
    );
}


// ==========================================================
// ⏱ 月出倒數
// ==========================================================

function startMoonriseCountdown(
    moonriseString
) {

    if (!moonriseString) {
        return;
    }


    function update() {

        const match =
            moonriseString.match(
                /T(\d{2}):(\d{2})/
            );


        if (!match) {
            return;
        }


        const riseHour =
            Number(match[1]);


        const riseMinute =
            Number(match[2]);


        const parts =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone: "Asia/Hong_Kong",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false
                }
            ).formatToParts(
                new Date()
            );


        function getPart(type) {

            const item =
                parts.find(
                    p => p.type === type
                );

            return item
                ? Number(item.value)
                : 0;
        }


        const currentSeconds =
            getPart("hour") * 3600
            +
            getPart("minute") * 60
            +
            getPart("second");


        const riseSeconds =
            riseHour * 3600
            +
            riseMinute * 60;


        let diff =
            riseSeconds -
            currentSeconds;


        if (diff <= 0) {

            if (countdownEl) {

                countdownEl.textContent =
                    "🌕";
            }


            if (countdownTextEl) {

                countdownTextEl.textContent =
                    "月亮已經升起";
            }


            return;
        }


        const hours =
            Math.floor(
                diff / 3600
            );


        diff %= 3600;


        const minutes =
            Math.floor(
                diff / 60
            );


        const seconds =
            diff % 60;


        if (countdownEl) {

            countdownEl.textContent =
                `${String(hours).padStart(2, "0")}:` +
                `${String(minutes).padStart(2, "0")}:` +
                `${String(seconds).padStart(2, "0")}`;
        }


        if (countdownTextEl) {

            countdownTextEl.textContent =
                "距離月出";
        }
    }


    update();


    clearInterval(
        window.moonCountdownTimer
    );


    window.moonCountdownTimer =
        setInterval(
            update,
            1000
        );
}


// ==========================================================
// 🌦 今晚 18:00–23:00
// ==========================================================

function getTonightRows(data) {

    if (
        !data ||
        !data.hourly ||
        !data.hourly.time
    ) {

        return [];
    }


    const today =
        getHongKongDateString();


    const rows = [];


    for (
        let i = 0;
        i < data.hourly.time.length;
        i++
    ) {

        const time =
            data.hourly.time[i];


        if (
            !time.startsWith(today)
        ) {

            continue;
        }


        const hour =
            Number(
                time.slice(11, 13)
            );


        if (
            hour >= 18 &&
            hour <= 23
        ) {

            rows.push({

                index: i,

                time,

                hour,

                temperature:
                    data.hourly.temperature_2m[i],

                precipitationProbability:
                    data.hourly
                        .precipitation_probability[i],

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


// ==========================================================
// 🌦 顯示今晚逐小時天氣
// ==========================================================

function renderHourlyWeather(
    rows
) {

    if (!hourlyWeatherEl) {
        return;
    }


    hourlyWeatherEl.innerHTML =
        "";


    rows.forEach(row => {

        const div =
            document.createElement(
                "div"
            );


        div.className =
            "hour-row";


        div.innerHTML = `

            <div class="hour-time">
                ${String(row.hour).padStart(2, "0")}:00
            </div>

            <div class="hour-icon">
                ${weatherIcon(row.weatherCode)}
            </div>

            <div class="hour-temp">
                ${Math.round(row.temperature)}°
            </div>

            <div class="hour-weather">
                ${weatherText(row.weatherCode)}
            </div>

            <div class="hour-cloud">
                ☁️ ${Math.round(row.cloudCover)}%
            </div>

            <div class="hour-rain">
                🌧 ${Math.round(row.precipitationProbability)}%
            </div>

        `;


        hourlyWeatherEl.appendChild(
            div
        );
    });
}


// ==========================================================
// 🌕 指定時間的月亮位置
// ==========================================================

function getMoonPositionForTime(
    timeString
) {

    const parts =
        timeString.match(
            /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
        );


    if (!parts) {
        return null;
    }


    const year =
        Number(parts[1]);

    const month =
        Number(parts[2]);

    const day =
        Number(parts[3]);

    const hour =
        Number(parts[4]);

    const minute =
        Number(parts[5]);


    // 香港 = UTC+8
    const utcDate =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                hour - 8,
                minute
            )
        );


    return moonPosition(
        utcDate,
        currentLocation.lat,
        currentLocation.lon
    );
}


// ==========================================================
// ⭐ 每小時賞月分數
//
// 雲量       35%
// 降雨機率   25%
// 能見度     15%
// 月亮高度   25%
// ==========================================================

function calculateHourlyMoonScore(
    row
) {

    // ------------------------------------------------------
    // ☁️ 雲量
    // ------------------------------------------------------

    const cloudScore =
        clamp(
            100 -
            Number(row.cloudCover),
            0,
            100
        );


    // ------------------------------------------------------
    // 🌧 降雨
    // ------------------------------------------------------

    const rainScore =
        clamp(
            100 -
            Number(
                row.precipitationProbability
            ),
            0,
            100
        );


    // ------------------------------------------------------
    // 👁 能見度
    // ------------------------------------------------------

    const visibilityKm =
        Number(row.visibility) / 1000;


    let visibilityScore;


    if (visibilityKm >= 10) {

        visibilityScore = 100;

    } else if (visibilityKm >= 5) {

        visibilityScore =
            70 +
            (
                visibilityKm - 5
            ) * 6;

    } else if (visibilityKm >= 2) {

        visibilityScore =
            40 +
            (
                visibilityKm - 2
            ) * 10;

    } else {

        visibilityScore =
            10 +
            visibilityKm * 15;
    }


    visibilityScore =
        clamp(
            visibilityScore,
            0,
            100
        );


    // ------------------------------------------------------
    // 🌕 月亮高度
    // ------------------------------------------------------

    const moon =
        getMoonPositionForTime(
            row.time
        );


    let altitudeScore = 0;


    if (moon) {

        const altitude =
            moon.altitude;


        if (altitude <= 0) {

            altitudeScore = 0;

        } else if (altitude < 5) {

            altitudeScore = 25;

        } else if (altitude < 15) {

            altitudeScore = 55;

        } else if (altitude < 30) {

            altitudeScore = 80;

        } else if (altitude < 50) {

            altitudeScore = 100;

        } else if (altitude < 70) {

            altitudeScore = 90;

        } else {

            altitudeScore = 75;
        }
    }


    // ------------------------------------------------------
    // ⭐ 最終分數
    // ------------------------------------------------------

    let score =
        cloudScore * 0.35
        +
        rainScore * 0.25
        +
        visibilityScore * 0.15
        +
        altitudeScore * 0.25;


    // 月亮在地平線以下
    if (
        moon &&
        moon.altitude <= 0
    ) {

        score *= 0.35;
    }


    return Math.round(
        clamp(
            score,
            0,
            100
        )
    );
}


// ==========================================================
// ⭐ 今晚賞月指數
// ==========================================================

function calculateTonightMoonScore(
    rows
) {

    if (
        !rows ||
        rows.length === 0
    ) {

        return {

            score: 0,

            bestRow: null,

            bestScore: 0,

            averageScore: 0,

            scores: []
        };
    }


    const scores =
        rows.map(row => {

            return {

                row,

                score:
                    calculateHourlyMoonScore(
                        row
                    )
            };
        });


    const best =
        scores.reduce(
            (bestItem, currentItem) => {

                return currentItem.score >
                    bestItem.score

                    ? currentItem

                    : bestItem;
            }
        );


    const average =
        scores.reduce(
            (sum, item) => {

                return sum +
                    item.score;

            },
            0
        ) / scores.length;


    // 最佳時段 60%
    // 今晚平均 40%

    const finalScore =
        Math.round(
            best.score * 0.6
            +
            average * 0.4
        );


    return {

        score:
            clamp(
                finalScore,
                0,
                100
            ),

        bestRow:
            best.row,

        bestScore:
            best.score,

        averageScore:
            Math.round(
                average
            ),

        scores
    };
}


// ==========================================================
// ⭐ 賞月指數文字
// ==========================================================

function getMoonScoreText(
    score
) {

    if (score >= 85) {

        return {

            label:
                "非常適合賞月",

            icon:
                "🌕",

            description:
                "今晚天空條件相當不錯，適合外出抬頭看看月亮。"
        };
    }


    if (score >= 70) {

        return {

            label:
                "適合賞月",

            icon:
                "🌔",

            description:
                "今晚有不錯的賞月條件，選擇較少雲的位置會更理想。"
        };
    }


    if (score >= 55) {

        return {

            label:
                "尚可賞月",

            icon:
                "🌓",

            description:
                "今晚仍有機會看到月亮，但雲量或降雨可能有所影響。"
        };
    }


    if (score >= 35) {

        return {

            label:
                "賞月條件一般",

            icon:
                "🌙",

            description:
                "今晚天氣或月亮高度可能影響觀賞效果。"
        };
    }


    return {

        label:
            "較不適合賞月",

        icon:
            "☁️",

        description:
            "今晚雲量、降雨或月亮位置可能令觀賞月亮較困難。"
    };
}


// ==========================================================
// ⭐ 顯示賞月指數
// ==========================================================

function renderTonightMoonScore(
    result
) {

    if (!result) {
        return;
    }


    const score =
        result.score;


    const info =
        getMoonScoreText(
            score
        );


    // ------------------------------------------------------
    // 如果 HTML 有預留 ID，就同步更新
    // ------------------------------------------------------

    const scoreNumber =
        document.getElementById(
            "scoreNumber"
        );


    const scoreLabel =
        document.getElementById(
            "scoreLabel"
        );


    const scoreDesc =
        document.getElementById(
            "scoreDesc"
        );


    const scoreBestTime =
        document.getElementById(
            "scoreBestTime"
        );


    if (scoreNumber) {

        scoreNumber.textContent =
            score;
    }


    if (scoreLabel) {

        scoreLabel.textContent =
            `${info.icon} ${info.label}`;
    }


    if (scoreDesc) {

        scoreDesc.textContent =
            info.description;
    }


    if (
        scoreBestTime &&
        result.bestRow
    ) {

        scoreBestTime.textContent =
            `建議時間 ${String(
                result.bestRow.hour
            ).padStart(2, "0")}:00`;
    }


    // ------------------------------------------------------
    // 建立真正的動態賞月指數卡
    // ------------------------------------------------------

    let card =
        document.getElementById(
            "tonightMoonScore"
        );


    if (!card) {

        card =
            document.createElement(
                "section"
            );


        card.id =
            "tonightMoonScore";


        card.style.margin =
            "20px 0";


        card.style.padding =
            "24px";


        card.style.borderRadius =
            "26px";


        card.style.background =
            "rgba(255,255,255,0.07)";


        card.style.border =
            "1px solid rgba(255,255,255,0.18)";


        // --------------------------------------------------
        // 嘗試放在頁面最前面的內容區
        // --------------------------------------------------

        const main =
            document.querySelector(
                "main"
            );


        if (
            main &&
            main.firstElementChild
        ) {

            main.insertBefore(
                card,
                main.firstElementChild
            );

        } else if (main) {

            main.appendChild(
                card
            );

        } else {

            document.body.prepend(
                card
            );
        }
    }


    let bestTimeText =
        "今晚暫無較佳時段";


    if (result.bestRow) {

        bestTimeText =
            `${String(
                result.bestRow.hour
            ).padStart(2, "0")}:00`;
    }


    card.innerHTML = `

        <div style="
            font-size:17px;
            font-weight:700;
            margin-bottom:18px;
        ">
            🌕 今晚賞月指數
        </div>


        <div style="
            display:flex;
            align-items:center;
            gap:20px;
        ">

            <div style="
                font-size:58px;
                font-weight:800;
                line-height:1;
            ">
                ${score}
            </div>


            <div>

                <div style="
                    font-size:20px;
                    font-weight:700;
                ">
                    ${info.icon}
                    ${info.label}
                </div>


                <div style="
                    margin-top:6px;
                    font-size:14px;
                    opacity:.75;
                ">
                    根據今晚天氣及月亮位置計算
                </div>

            </div>

        </div>


        <div style="
            margin-top:18px;
            font-size:15px;
            line-height:1.6;
            opacity:.85;
        ">
            ${info.description}
        </div>


        <div style="
            margin-top:16px;
            padding-top:15px;
            border-top:
                1px solid rgba(255,255,255,.12);
            font-size:15px;
        ">
            🌟 較佳時段：
            <strong>
                ${bestTimeText}
            </strong>
        </div>

    `;
}


// ==========================================================
// 🧹 嘗試移除舊「示範資料」
//
// 注意：
// 不會刪除整個月亮卡片，避免影響定位按鈕。
// ==========================================================

function cleanOldDemoText() {

    const allElements =
        document.querySelectorAll(
            "body *"
        );


    allElements.forEach(
        element => {

            if (
                element.children.length === 0 &&
                element.textContent
            ) {

                const text =
                    element.textContent.trim();


                if (
                    text ===
                    "示範資料"
                ) {

                    element.textContent =
                        "天文計算";
                }
            }
        }
    );
}


// ==========================================================
// 🌦 載入 Open-Meteo
// ==========================================================

async function loadWeather(
    lat = currentLocation.lat,
    lon = currentLocation.lon
) {

    try {

        if (weatherSummaryEl) {

            weatherSummaryEl.textContent =
                "正在取得 Open-Meteo 天氣資料…";
        }


        const url =
            "https://api.open-meteo.com/v1/forecast"
            +
            `?latitude=${lat}`
            +
            `&longitude=${lon}`
            +
            "&hourly="
            +
            "temperature_2m,"
            +
            "precipitation_probability,"
            +
            "cloud_cover,"
            +
            "visibility,"
            +
            "weather_code"
            +
            "&daily="
            +
            "moonrise,"
            +
            "moonset,"
            +
            "moon_phase"
            +
            "&forecast_days=2"
            +
            "&timezone=Asia%2FHong_Kong";


        const response =
            await fetch(
                url
            );


        if (!response.ok) {

            throw new Error(
                `Open-Meteo HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        // ==================================================
        // 目前天氣
        // ==================================================

        const today =
            getHongKongDateString();


        const nowHour =
            getHongKongHour();


        let currentIndex =
            data.hourly.time.findIndex(
                time => {

                    return (
                        time.startsWith(
                            today
                        )
                        &&
                        Number(
                            time.slice(11, 13)
                        ) === nowHour
                    );
                }
            );


        if (currentIndex < 0) {

            currentIndex = 0;
        }


        const currentTemp =
            data.hourly
                .temperature_2m[
                    currentIndex
                ];


        const currentCloud =
            data.hourly
                .cloud_cover[
                    currentIndex
                ];


        const currentCode =
            data.hourly
                .weather_code[
                    currentIndex
                ];


        if (weatherTempEl) {

            weatherTempEl.textContent =
                `${Math.round(
                    currentTemp
                )}°C`;
        }


        if (weatherSummaryEl) {

            weatherSummaryEl.textContent =
                `${weatherIcon(
                    currentCode
                )} ${
                    weatherText(
                        currentCode
                    )
                } · 雲量 ${
                    Math.round(
                        currentCloud
                    )
                }%`;
        }


        if (weatherUpdatedEl) {

            weatherUpdatedEl.textContent =
                "資料來源：Open-Meteo";
        }


        // ==================================================
        // 今晚天氣
        // ==================================================

        const tonightRows =
            getTonightRows(
                data
            );


        renderHourlyWeather(
            tonightRows
        );


        // ==================================================
        // 月相 / 月出 / 月落
        // ==================================================

        renderMoonData(
            data
        );


        // ==================================================
        // ⭐ 今晚賞月指數
        // ==================================================

        const scoreResult =
            calculateTonightMoonScore(
                tonightRows
            );


        renderTonightMoonScore(
            scoreResult
        );


        // ==================================================
        // 🌕 即時月亮位置
        // ==================================================

        renderMoonPosition();


        // ==================================================
        // 清理舊示範文字
        // ==================================================

        cleanOldDemoText();


        // ==================================================
        // Console
        // ==================================================

        console.log(
            "🌕 Moon Watch HK V0.5.1",
            {
                location:
                    currentLocation,

                moonScore:
                    scoreResult,

                tonightRows:
                    tonightRows
            }
        );


    } catch (error) {

        console.error(
            "Open-Meteo error:",
            error
        );


        if (weatherSummaryEl) {

            weatherSummaryEl.textContent =
                "暫時未能取得天氣資料";
        }


        showToast(
            "暫時未能取得 Open-Meteo 天氣資料"
        );
    }
}


// ==========================================================
// 📍 使用我的位置
// ==========================================================

function useMyLocation() {

    if (!navigator.geolocation) {

        showToast(
            "你的裝置不支援定位功能"
        );

        return;
    }


    showToast(
        "正在取得你的位置…"
    );


    navigator.geolocation.getCurrentPosition(

        position => {

            currentLocation = {

                lat:
                    position.coords.latitude,

                lon:
                    position.coords.longitude,

                name:
                    "我的位置"
            };


            showToast(
                "已使用你的位置"
            );


            loadWeather(
                currentLocation.lat,
                currentLocation.lon
            );
        },


        error => {

            console.error(
                "Geolocation error:",
                error
            );


            showToast(
                "未能取得位置，繼續使用香港預設位置"
            );
        },


        {
            enableHighAccuracy:
                true,

            timeout:
                10000,

            maximumAge:
                300000
        }
    );
}


// ==========================================================
// 🔔 Toast
// ==========================================================

function showToast(
    message
) {

    if (!toastEl) {
        return;
    }


    toastEl.textContent =
        message;


    toastEl.classList.add(
        "show"
    );


    clearTimeout(
        window.toastTimer
    );


    window.toastTimer =
        setTimeout(
            () => {

                toastEl.classList.remove(
                    "show"
                );

            },
            3000
        );
}


// ==========================================================
// 📍 按鈕
// ==========================================================

if (locationBtn) {

    locationBtn.addEventListener(
        "click",
        useMyLocation
    );
}


// ==========================================================
// 🚀 啟動
// ==========================================================

cleanOldDemoText();


// 預設香港位置
loadWeather(
    DEFAULT_LOCATION.lat,
    DEFAULT_LOCATION.lon
);


// ==========================================================
// 🔄 每 30 秒更新即時月亮位置
// ==========================================================

clearInterval(
    window.moonPositionTimer
);


window.moonPositionTimer =
    setInterval(
        renderMoonPosition,
        30000
    );


// ==========================================================
// 完成
// ==========================================================

console.log(
    "🌕 Moon Watch HK V0.5.1 已啟動"
);