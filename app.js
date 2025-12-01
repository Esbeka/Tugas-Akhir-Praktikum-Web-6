// =========================
// CONFIG & STATE
// =========================
const API_KEY = "3a1f468f68fc4bf77ef08179fbdc3d29";
const BASE_URL = "https://api.openweathermap.org";

let currentCity = "Jakarta";
let currentUnit = "metric"; // 'metric' atau 'imperial'
let autoRefreshTimer = null;
let debounceTimer = null;

// =========================
// HELPER DOM
// =========================
const $ = (id) => document.getElementById(id);

// =========================
// LOADING HANDLERS
// =========================
function setGlobalLoading(isLoading) {
  $("current-loading").classList.toggle("hidden", !isLoading);
  $("highlight-loading").classList.toggle("hidden", !isLoading);
  $("forecast-loading").classList.toggle("hidden", !isLoading);

  $("current-weather-card").style.opacity = isLoading ? "0.7" : "1";
}

function setRefreshLoading(isLoading) {
  $("refresh-icon").classList.toggle("hidden", isLoading);
  $("refresh-spinner").classList.toggle("hidden", !isLoading);
}

// =========================
// API REQUESTS
// =========================
async function fetchCurrentWeatherByCity(city) {
  try {
    setGlobalLoading(true);
    const url = `${BASE_URL}/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&units=${currentUnit}&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`City not found (${res.status})`);
    const data = await res.json();

    currentCity = data.name;
    updateCurrentWeatherUI(data);

    // fetch forecast with lat/lon
    await fetchForecast(data.coord.lat, data.coord.lon, data.timezone);

  } catch (err) {
    console.error(err);
    alert("Gagal mengambil data cuaca: " + err.message);
  } finally {
    setGlobalLoading(false);
    setRefreshLoading(false);
  }
}

// Ambil forecast 5 hari (data 3-jam) dan olah jadi 5 hari ke depan
async function fetchForecast(lat, lon) {
  try {
    const url = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Forecast error: " + res.status);
    const data = await res.json();

    // data.list = array 3 jam sekali, data.city.timezone = offset detik
    updateForecastUI(data.list, data.city.timezone);
  } catch (err) {
    console.error(err);
  }
}


async function fetchSuggestions(query) {
  if (query.length < 3) {
    $("autocomplete-suggestions").classList.add("hidden");
    $("autocomplete-suggestions").innerHTML = "";
    return;
  }

  try {
    const url = `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(
      query
    )}&limit=5&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Geocoding error");
    const data = await res.json();
    renderSuggestions(data);
  } catch (err) {
    console.error(err);
  }
}

// =========================
// UI UPDATE: CURRENT WEATHER
// =========================
function updateCurrentWeatherUI(data) {
  const tempUnitLabel = currentUnit === "metric" ? "°C" : "°F";
  const windUnitLabel = currentUnit === "metric" ? "km/h" : "mph";

  $("city-name").textContent = `${data.name}, ${data.sys.country}`;
  $("current-temp").textContent = `${Math.round(data.main.temp)}${tempUnitLabel}`;

  const description = data.weather[0]?.description || "";
  $("current-condition").textContent = toTitleCase(description);

  $("feels-like-temp").textContent = `${Math.round(
    data.main.feels_like
  )}${tempUnitLabel}`;

  // humidity & wind
  $("humidity-value").textContent = `${data.main.humidity}%`;
  $("highlight-humidity").textContent = data.main.humidity;
  $("humidity-comment").textContent =
    data.main.humidity > 80
      ? "High humidity, udara terasa lembap."
      : "Humidity is in a comfortable range.";

  // wind (m/s dari API)
  const windSpeed = data.wind.speed * (currentUnit === "metric" ? 3.6 : 2.23694);
  $("wind-speed").textContent = windSpeed.toFixed(1);
  $("wind-unit").textContent = windUnitLabel;
  $("highlight-wind").textContent = windSpeed.toFixed(1);
  $("highlight-wind-unit").textContent = windUnitLabel;

  // timezone & timestamp
  $("timezone-label").textContent = `UTC ${data.timezone / 3600 >= 0 ? "+" : ""}${
    data.timezone / 3600
  }`;

  const localTime = formatLocalDateTime(data.dt, data.timezone);
  $("current-timestamp").textContent = localTime.full;
  $("last-updated").textContent = `Last updated: ${localTime.time}`;

  // sunrise / sunset
  $("sunrise-time").textContent = formatLocalDateTime(
    data.sys.sunrise,
    data.timezone
  ).time;
  $("sunset-time").textContent = formatLocalDateTime(
    data.sys.sunset,
    data.timezone
  ).time;

  // icon (pakai icon OpenWeather langsung)
  const iconCode = data.weather[0]?.icon;
  if (iconCode) {
    const imgUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    const img = $("current-icon");
    img.src = imgUrl;
    img.alt = description;
    img.onload = () => {
      img.classList.remove("opacity-0");
    };
  }

  // update subtitle
  $("header-subtitle").textContent = `Showing weather for ${data.name}, ${data.sys.country}`;
}

// =========================
// UI UPDATE: FORECAST
// =========================
// list = data.list dari /data/2.5/forecast (interval 3 jam)
function updateForecastUI(list, timezoneOffset) {
  const container = $("forecast-container");
  container.innerHTML = "";

  const tempUnitLabel = currentUnit === "metric" ? "°C" : "°F";

  // Kelompokkan per tanggal lokal
  const days = {}; // { 'YYYY-MM-DD': { min, max, icon, desc, dtLocal } }

  list.forEach((item) => {
    const dtLocal = new Date((item.dt + timezoneOffset) * 1000);
    const year = dtLocal.getUTCFullYear();
    const month = String(dtLocal.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dtLocal.getUTCDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;

    // Tanggal hari ini (berdasarkan timezone lokasi) → nanti kita skip
    const todayKey = (() => {
      const now = new Date(Date.now() + timezoneOffset * 1000);
      const y = now.getUTCFullYear();
      const m = String(now.getUTCMonth() + 1).padStart(2, "0");
      const d = String(now.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    })();

    // Lewati slot 3-jam yang masih termasuk hari ini
    if (dateKey === todayKey) return;

    const tempMin = item.main.temp_min;
    const tempMax = item.main.temp_max;
    const weather = item.weather[0] || {};
    const desc = weather.description || "";
    const icon = weather.icon;

    if (!days[dateKey]) {
      days[dateKey] = {
        min: tempMin,
        max: tempMax,
        icon,
        desc,
        dtLocal,
      };
    } else {
      days[dateKey].min = Math.min(days[dateKey].min, tempMin);
      days[dateKey].max = Math.max(days[dateKey].max, tempMax);

      // Kalau jamnya mendekati tengah hari, pakai sebagai representatif
      const hour = dtLocal.getUTCHours();
      const currentHour = days[dateKey].dtLocal.getUTCHours();
      if (Math.abs(hour - 12) < Math.abs(currentHour - 12)) {
        days[dateKey].icon = icon;
        days[dateKey].desc = desc;
        days[dateKey].dtLocal = dtLocal;
      }
    }
  });

  // Urutkan tanggal dan ambil maksimal 5 hari
  const sortedKeys = Object.keys(days).sort().slice(0, 5);

  sortedKeys.forEach((key, index) => {
    const dayData = days[key];
    const dateObj = dayData.dtLocal;
    const dayName =
      index === 0
        ? "Tomorrow"
        : dateObj.toLocaleDateString("en-US", { weekday: "short" });

    const card = document.createElement("div");
    card.className =
      "card px-4 py-3 flex items-center justify-between gap-2 text-sm";

    const descTitle = toTitleCase(dayData.desc || "");

    card.innerHTML = `
      <div class="flex-1">
        <p class="font-medium">${dayName}</p>
        <p class="text-xs text-slate-400 mt-0.5">${descTitle}</p>
      </div>
      <div class="w-10 h-10 flex items-center justify-center">
        ${
          dayData.icon
            ? `<img src="https://openweathermap.org/img/wn/${dayData.icon}.png" alt="${descTitle}" class="w-8 h-8" />`
            : ""
        }
      </div>
      <div class="text-right text-sm">
        <p class="font-semibold">${Math.round(dayData.max)}${tempUnitLabel}</p>
        <p class="text-xs text-slate-400">${Math.round(dayData.min)}${tempUnitLabel}</p>
      </div>
    `;

    container.appendChild(card);
  });

  $("forecast-loading").classList.add("hidden");
}


// =========================
// AUTOCOMPLETE SUGGESTIONS
// =========================
function renderSuggestions(list) {
  const box = $("autocomplete-suggestions");
  box.innerHTML = "";

  if (!list || list.length === 0) {
    box.classList.add("hidden");
    return;
  }

  list.forEach((item) => {
    const div = document.createElement("div");
    div.className = "px-3 py-2 cursor-pointer text-sm";
    const label = `${item.name}${
      item.state ? ", " + item.state : ""
    }, ${item.country}`;
    div.textContent = label;

    div.addEventListener("click", () => {
      $("search-input").value = "";
      box.classList.add("hidden");
      fetchCurrentWeatherByCity(item.name);
    });

    box.appendChild(div);
  });

  box.classList.remove("hidden");
}

// =========================
// FAVORITES (localStorage)
// =========================
const FAVORITES_KEY = "weather_favorite_cities";

function getFavorites() {
  const raw = localStorage.getItem(FAVORITES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveFavorites(list) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

function addCurrentToFavorites() {
  if (!currentCity) return;
  const favorites = getFavorites();
  if (!favorites.includes(currentCity)) {
    favorites.push(currentCity);
    saveFavorites(favorites);
    renderFavorites();
  }
}

function removeFavorite(city) {
  let favorites = getFavorites();
  favorites = favorites.filter((c) => c !== city);
  saveFavorites(favorites);
  renderFavorites();
}

function renderFavorites() {
  const container = $("favorites-container");
  const favorites = getFavorites();
  container.innerHTML = "";

  if (favorites.length === 0) {
    const p = document.createElement("p");
    p.className = "text-xs text-slate-400";
    p.textContent = "No favorite cities saved yet.";
    container.appendChild(p);
    return;
  }

  favorites.forEach((city) => {
    const chip = document.createElement("div");
    chip.className =
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-blue-500/10 border border-blue-400/40";

    const spanCity = document.createElement("button");
    spanCity.type = "button";
    spanCity.className = "hover:text-blue-400";
    spanCity.textContent = city;
    spanCity.addEventListener("click", () => fetchCurrentWeatherByCity(city));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "text-red-400 hover:text-red-500";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => removeFavorite(city));

    chip.appendChild(spanCity);
    chip.appendChild(removeBtn);
    container.appendChild(chip);
  });
}

// =========================
// THEME TOGGLE
// =========================
function toggleTheme() {
  const body = document.body;
  const isDark = body.dataset.theme === "dark";
  body.dataset.theme = isDark ? "light" : "dark";
  $("theme-icon").textContent = isDark ? "☀️" : "🌙";
}

// =========================
// UTILS
// =========================
function toTitleCase(str) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatLocalDateTime(unixSeconds, timezoneOffset) {
  // browserOffset = offset timezone laptop dalam detik (misal Jakarta = +7 jam = 25200)
  const browserOffset = -new Date().getTimezoneOffset() * 60; 

  // Koreksi waktu supaya yang tampil = waktu lokal kota (bukan dobel offset)
  const date = new Date(
    (unixSeconds + timezoneOffset - browserOffset) * 1000
  );

  const full = date.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return { full, time };
}


// =========================
// INIT + EVENT LISTENERS
// =========================
function init() {
  // Awal: fetch Jakarta
  fetchCurrentWeatherByCity(currentCity);
  renderFavorites();

  // Auto refresh tiap 5 menit
  autoRefreshTimer = setInterval(() => {
    if (currentCity) fetchCurrentWeatherByCity(currentCity);
  }, 5 * 60 * 1000);

  // Search input
  $("search-input").addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearTimeout(debounceTimer);
    if (!q) {
      $("autocomplete-suggestions").classList.add("hidden");
      return;
    }
    debounceTimer = setTimeout(() => fetchSuggestions(q), 500);
  });

  $("search-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = e.target.value.trim();
      if (q) {
        $("autocomplete-suggestions").classList.add("hidden");
        fetchCurrentWeatherByCity(q);
      }
    }
  });

  // Theme toggle
  $("theme-toggle").addEventListener("click", toggleTheme);

  // Unit toggle
  $("toggle-units").addEventListener("click", () => {
    currentUnit = currentUnit === "metric" ? "imperial" : "metric";
    $("toggle-units").textContent = currentUnit === "metric" ? "°C" : "°F";
    if (currentCity) fetchCurrentWeatherByCity(currentCity);
  });

  // Refresh button
  $("refresh-btn").addEventListener("click", () => {
    if (!currentCity) return;
    setRefreshLoading(true);
    fetchCurrentWeatherByCity(currentCity);
  });

  // Save favorite
  $("save-favorite-btn").addEventListener("click", addCurrentToFavorites);
}

document.addEventListener("DOMContentLoaded", init);
