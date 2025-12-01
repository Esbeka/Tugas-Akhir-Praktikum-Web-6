# Weather Dashboard – Tugas Akhir Praktikum Pemrograman Web 6

Aplikasi **Weather Dashboard** ini dibuat untuk memenuhi Tugas Akhir Praktikum Pemrograman Web 6.  
Aplikasi menampilkan cuaca saat ini, prakiraan 5 hari ke depan, pencarian kota, penyimpanan kota favorit, serta beberapa fitur interaktif seperti toggle tema dan konversi satuan suhu.

================================================================================
🏷  INFORMASI PROYEK
================================================================================

Nama Proyek : Weather Dashboard  
Mata Kuliah : Praktikum Pemrograman Web 6  
Repository  : https://github.com/Esbeka/Tugas-Akhir-Praktikum-Web-6  

================================================================================
🌤  FITUR UTAMA
================================================================================

1. Current Weather Display
   - Menampilkan suhu saat ini.
   - Menampilkan kelembapan (humidity).
   - Menampilkan kecepatan angin (wind speed).
   - Menampilkan kondisi cuaca dengan ikon.
   - Menampilkan nama kota dan negara.
   - Menampilkan waktu lokal kota dan informasi "Last updated".
   - Data dikonversi ke waktu lokal kota dengan memperhitungkan offset timezone.

2. 5-Day Forecast
   - Prakiraan cuaca untuk 5 hari ke depan.
   - Menampilkan temperatur maksimum dan minimum tiap hari.
   - Menampilkan ikon cuaca dan deskripsi singkat (misalnya: Few Clouds, Light Rain).
   - Data diolah dari endpoint 5-day/3-hour forecast (bukan One Call 3.0).

3. Search Functionality
   - Pencarian cuaca berdasarkan nama kota.
   - Auto-complete suggestions (menggunakan OpenWeather Geocoding API).
   - Menampilkan cuaca dan forecast untuk kota hasil pencarian.

4. Favorite Cities
   - Menyimpan kota favorit ke localStorage browser.
   - Menampilkan daftar kota favorit dalam bentuk chip.
   - Klik nama kota di daftar favorit untuk memuat cuaca kota tersebut.
   - Tombol "✕" untuk menghapus kota dari daftar favorit.

5. Interactive Features
   - Toggle suhu: mengubah antara Celsius (°C) dan Fahrenheit (°F).
   - Dark / Light mode toggle (tema gelap dan terang).
   - Tombol refresh manual untuk memperbarui data cuaca kota saat ini.
   - Loading indicator untuk current weather, highlight, dan forecast.

================================================================================
🧩 TEKNOLOGI YANG DIGUNAKAN
================================================================================

- HTML5
- Tailwind CSS (via CDN)
- JavaScript (DOM manipulation, fetch API, modular function)
- OpenWeather API:
  - Current Weather Data API
  - 5 Day / 3 Hour Forecast API
  - Geocoding API (untuk search & auto-complete)
  - Weather Icons API
- Browser LocalStorage (untuk menyimpan kota favorit)
- Live Server / static file server (untuk menjalankan secara lokal)

================================================================================
📦 STRUKTUR FOLDER PROYEK
================================================================================

.
├── index.html      # Halaman utama aplikasi Weather Dashboard
├── app.js         # Seluruh logika JavaScript (fetch API, UI update, favorites, theme, dll)
└── README.md      # Dokumentasi proyek

================================================================================
🔑 KONFIGURASI API KEY
================================================================================

Aplikasi menggunakan API dari OpenWeather.  
API key dapat dibuat melalui: https://home.openweathermap.org/api_keys

Setelah mendapatkan API key, buka file `app.js` dan ganti nilai konstanta:

  const API_KEY = "YOUR_API_KEY_HERE";

menjadi:

  const API_KEY = "3a1f468f68fc4bf77ef08179fbdc3d29";

atau menggunakan key Anda sendiri.

Pastikan:
- Status API key = Active
- Akun sudah melakukan verifikasi email di OpenWeather

================================================================================
▶️ CARA MENJALANKAN SECARA LOKAL
================================================================================

1. Clone repository dari GitHub:

   git clone https://github.com/Esbeka/Tugas-Akhir-Praktikum-Web-6.git

2. Masuk ke folder project:

   cd Tugas-Akhir-Praktikum-Web-6

3. Pastikan `API_KEY` pada `app.js` sudah diisi dengan API key milik Anda.

4. Jalankan proyek:
   - Cara 1: Menggunakan Live Server (rekomendasi di VSCode)
     - Klik kanan pada `index.html` → "Open with Live Server"
     - Biasanya akan berjalan di `http://127.0.0.1:5500/index.html`
   - Cara 2: Buka file `index.html` langsung di browser (double-click).
     - Beberapa fitur fetch mungkin butuh dijalankan lewat server (Live Server).

5. Buka aplikasi di browser, Anda akan melihat:
   - Cuaca default (misal: Jakarta atau kota yang ditentukan di `currentCity`).
   - Bagian 5-Day Forecast di sisi kanan.
   - Tombol toggle tema, toggle satuan, daftar favorite cities, dan tombol refresh.

================================================================================
🧠 DETAIL IMPLEMENTASI PENTING
================================================================================

1. Pengambilan Data Cuaca (Current Weather)
   - Endpoint:
     https://api.openweathermap.org/data/2.5/weather
   - Parameter:
     - q     : nama kota (misal: Jakarta, Palembang, Berlin)
     - units : metric atau imperial
     - appid : API key
   - Data yang digunakan:
     - main.temp          : suhu
     - main.feels_like    : suhu yang terasa
     - main.humidity      : kelembapan
     - wind.speed         : kecepatan angin (m/s → dikonversi ke km/h atau mph)
     - weather[0].icon    : ikon cuaca
     - weather[0].description : deskripsi cuaca
     - sys.sunrise / sys.sunset : waktu matahari terbit & terbenam
     - timezone           : offset timezone kota (dalam detik)

2. Pengambilan Data Forecast 5 Hari
   - Endpoint:
     https://api.openweathermap.org/data/2.5/forecast
   - Parameter:
     - lat, lon : koordinat kota (diambil dari current weather)
     - units    : metric / imperial
     - appid    : API key
   - Data yang digunakan:
     - list[]   : data cuaca per 3 jam
   - Logika:
     - Data `list` dikelompokkan per tanggal lokal.
     - Untuk tiap tanggal dihitung:
       - temperatur minimum (min dari temp_min)
       - temperatur maksimum (max dari temp_max)
       - icon & description representatif (slot yang paling dekat dengan jam 12 siang).
     - Hari ini (today) tidak dimasukkan ke forecast (forecast mulai dari "Tomorrow").
     - Diambil maksimal 5 hari ke depan.

3. Konversi Waktu ke Zona Waktu Lokal Kota
   - OpenWeather memberikan:
     - `dt`             : UNIX UTC timestamp
     - `timezone`       : offset kota dari UTC (dalam detik)
   - Browser memiliki:
     - `getTimezoneOffset()` : offset timezone lokal user (dalam menit)
   - Fungsi yang digunakan:

     function formatLocalDateTime(unixSeconds, timezoneOffset) {
       const browserOffset = -new Date().getTimezoneOffset() * 60; 
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

   - Dengan rumus di atas, waktu yang ditampilkan (header tanggal, sunrise, sunset, dan last updated) mengikuti zona waktu kota yang dicari (misal UTC+7 untuk Palembang/Jakarta).

4. Favorite Cities (localStorage)
   - Key yang digunakan: `weather_favorite_cities`
   - Menyimpan array berisi nama kota (contoh: ["Jakarta", "Palembang", "Berlin"])
   - Operasi:
     - `getFavorites()`    : mengambil data dari localStorage dan mengubahnya menjadi array.
     - `saveFavorites()`   : menyimpan array ke localStorage dalam bentuk JSON string.
     - `renderFavorites()` : merender chip kota favorit ke UI.
     - `addCurrentToFavorites()` : menambahkan kota yang sedang ditampilkan.
     - `removeFavorite(city)` : menghapus kota favorit.

5. Theme Toggle (Dark / Light)
   - Menggunakan atribut `data-theme` pada elemen `<body>`.
   - Nilai:
     - `data-theme="dark"`
     - `data-theme="light"`
   - CSS diatur supaya komponen memiliki warna berbeda bergantung pada `data-theme`.
   - Tombol menggunakan icon:
     - 🌙 untuk dark mode
     - ☀️ untuk light mode

6. Toggle Satuan Suhu (°C / °F)
   - Variabel global:
     - `currentUnit = "metric"` atau `"imperial"`
   - Ketika tombol di-klik:
     - nilai `currentUnit` di-flip.
     - label tombol diubah (°C atau °F).
     - data cuaca di-fetch ulang untuk kota saat ini.

================================================================================
🧪 PENGUJIAN SINGKAT
================================================================================

Beberapa skenario yang diuji:
- Pencarian kota Indonesia (Jakarta, Palembang, Bandung) → menampilkan waktu UTC+7.
- Pencarian kota luar negeri (Berlin, Tokyo, New York) → timezone dan jam menyesuaikan lokasi.
- Menambahkan kota ke daftar favorit → muncul chip kota, klik chip berpindah kota.
- Menghapus kota dari daftar favorit → chip hilang dari UI dan localStorage.
- Toggle tema → seluruh card dan input mengikuti tema.
- Toggle satuan suhu → angka suhu dan kecepatan angin menyesuaikan (°C/°F dan km/h/mph).
- Refresh manual → data terbaru diambil dari API.

================================================================================
END OF README
================================================================================
