// Настройки
const API_KEY = '51fe7c9692554d5f5fa4324f1dd446f9'; 
const API_URL = 'https://api.openweathermap.org/data/2.5';

// Состояние
let cities = [];
let activeCity = null;

// эл-ты
const citiesList = document.getElementById('citiesList');
const weatherBlock = document.getElementById('weatherBlock');
const modal = document.getElementById('cityModal');
const cityInput = document.getElementById('cityInput');
const suggestions = document.getElementById('suggestions');
const cityError = document.getElementById('cityError');
const refreshBtn = document.getElementById('refreshBtn');
const addBtn = document.getElementById('addCityBtn');
const submitBtn = document.getElementById('submitCity');
const cancelBtn = document.getElementById('cancelModal');

// загрузка
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    if (cities.length === 0) {
        getGeo();
    } else {
        showCities();
        loadWeather(activeCity || cities[0].id);
    }
});

// сохранение/загрузка данных
function saveData() {
    localStorage.setItem('weatherData', JSON.stringify({
        cities: cities.map(c => ({ id: c.id, name: c.name, isGeo: c.isGeo, lat: c.lat, lon: c.lon })),
        active: activeCity
    }));
}

function loadData() {
    const data = localStorage.getItem('weatherData');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            cities = parsed.cities || [];
            activeCity = parsed.active || null;
        } catch (e) {}
    }
}

function getGeo() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            pos => addGeoCity(pos.coords.latitude, pos.coords.longitude),
            () => showModal()
        );
    } else {
        showModal();
    }
}

async function addGeoCity(lat, lon) {
    try {
        const res = await fetch(`${API_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
        const data = await res.json();
        
        cities = [{
            id: Date.now(),
            name: 'Текущее местоположение',
            isGeo: true,
            lat, lon
        }];
        activeCity = cities[0].id;
        saveData();
        showCities();
        loadWeather(activeCity);
        
    } catch (e) {
        showModal();
    }
}

function showCities() {
    if (cities.length === 0) {
        citiesList.innerHTML = '';
        return;
    }
    
    let html = '';
    cities.forEach(c => {
        html += `
            <div class="city-tab ${activeCity === c.id ? 'active' : ''}" data-id="${c.id}">
                <span>${c.name}</span>
                ${cities.length > 1 ? `<button class="remove-btn" data-id="${c.id}">✕</button>` : ''}
            </div>
        `;
    });
    
    citiesList.innerHTML = html;
    
    // обработчики
    document.querySelectorAll('.city-tab').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) return;
            const id = Number(el.dataset.id);
            activeCity = id;
            saveData();
            showCities();
            loadWeather(id);
        });
    });
    
    document.querySelectorAll('.remove-btn').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = Number(el.dataset.id);
            cities = cities.filter(c => c.id !== id);
            if (activeCity === id) {
                activeCity = cities.length ? cities[0].id : null;
            }
            saveData();
            showCities();
            if (activeCity) {
                loadWeather(activeCity);
            } else {
                weatherBlock.innerHTML = '<div class="no-data">Добавьте город</div>';
            }
        });
    });
}

async function loadWeather(cityId) {
    const city = cities.find(c => c.id === cityId);
    if (!city) return;
    
    weatherBlock.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        let weather, forecast;
        
        if (city.isGeo && city.lat && city.lon) {
            const wRes = await fetch(`${API_URL}/weather?lat=${city.lat}&lon=${city.lon}&units=metric&lang=ru&appid=${API_KEY}`);
            weather = await wRes.json();
            
            const fRes = await fetch(`${API_URL}/forecast?lat=${city.lat}&lon=${city.lon}&units=metric&cnt=24&appid=${API_KEY}`);
            forecast = await fRes.json();
        } else {
            const wRes = await fetch(`${API_URL}/weather?q=${city.name}&units=metric&lang=ru&appid=${API_KEY}`);
            weather = await wRes.json();
            
            const fRes = await fetch(`${API_URL}/forecast?q=${city.name}&units=metric&cnt=24&appid=${API_KEY}`);
            forecast = await fRes.json();
        }
        
        // прогноз на 3 дня
        const days = [];
        for (let i = 0; i < 24; i += 8) {
            if (days.length < 3 && forecast.list[i]) {
                days.push(forecast.list[i]);
            }
        }
        
        showWeather(weather, days, city.name);
        
    } catch (e) {
        weatherBlock.innerHTML = '<div class="error">Ошибка загрузки</div>';
    }
}

function showWeather(w, forecast, cityName) {
    const dayNames = ['Сегодня', 'Завтра', 'Послезавтра'];
    const icons = {
        'Clear': '☀️', 'Clouds': '☁️', 'Rain': '🌧️',
        'Snow': '❄️', 'Thunderstorm': '⚡', 'Drizzle': '🌧️'
    };
    
    let forecastHtml = '';
    forecast.forEach((day, i) => {
        const icon = icons[day.weather[0].main] || '☁️';
        forecastHtml += `
            <div class="day">
                <div class="day-name">${dayNames[i]}</div>
                <div class="day-icon">${icon}</div>
                <div class="day-temp">${Math.round(day.main.temp)}°</div>
            </div>
        `;
    });
    
    weatherBlock.innerHTML = `
        <div class="weather-card">
            <div class="location">${cityName}</div>
            <div class="temp">${Math.round(w.main.temp)}°</div>
            <div class="desc">${w.weather[0].description}</div>
            <div class="details">
                <div>Ощущается: ${Math.round(w.main.feels_like)}°</div>
                <div>Влажность: ${w.main.humidity}%</div>
                <div>Ветер: ${Math.round(w.wind.speed)} м/с</div>
            </div>
        </div>
        <div class="forecast">
            <h3>Прогноз на 3 дня</h3>
            <div class="forecast-days">${forecastHtml}</div>
        </div>
    `;
}

function showModal() {
    modal.classList.remove('hidden');
    cityInput.value = '';
    cityInput.focus();
    updateSuggestions('');
}

function hideModal() {
    modal.classList.add('hidden');
    cityError.classList.add('hidden');
    suggestions.classList.add('hidden');
}

// подсказки
function updateSuggestions(text) {
    if (text.length < 1) {
        suggestions.classList.add('hidden');
        return;
    }
    
    const filtered = CITY_LIST.filter(c => 
        c.toLowerCase().includes(text.toLowerCase())
    ).slice(0, 5);
    
    if (filtered.length === 0) {
        suggestions.classList.add('hidden');
        return;
    }
    
    let html = '';
    filtered.forEach(c => {
        html += `<div class="suggestion">${c}</div>`;
    });
    
    suggestions.innerHTML = html;
    suggestions.classList.remove('hidden');
    
    document.querySelectorAll('.suggestion').forEach(el => {
        el.addEventListener('click', () => {
            cityInput.value = el.textContent;
            suggestions.classList.add('hidden');
        });
    });
}

async function addCity(name) {
    // проверка дубликата
    if (cities.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        cityError.textContent = 'Город уже добавлен';
        cityError.classList.remove('hidden');
        return false;
    }
    
    try {
        const res = await fetch(`${API_URL}/weather?q=${name}&appid=${API_KEY}`);
        if (!res.ok) throw new Error();
        
        const data = await res.json();
        
        cities.push({
            id: Date.now(),
            name: data.name,
            isGeo: false
        });
        
        if (!activeCity) activeCity = cities[cities.length-1].id;
        
        saveData();
        showCities();
        hideModal();
        loadWeather(activeCity);
        
        return true;
        
    } catch (e) {
        cityError.textContent = 'Город не найден';
        cityError.classList.remove('hidden');
        return false;
    }
}

function showLoading() {
    weatherBlock.innerHTML = '<div class="loading">Загрузка...</div>';
}

async function refreshAll() {
    if (activeCity) {
        loadWeather(activeCity);
    }
}

// обработчики
cityInput.addEventListener('input', (e) => updateSuggestions(e.target.value));

addBtn.addEventListener('click', showModal);

submitBtn.addEventListener('click', async () => {
    const city = cityInput.value.trim();
    if (city) await addCity(city);
});

cancelBtn.addEventListener('click', hideModal);

refreshBtn.addEventListener('click', refreshAll);

// закрытие по клику вне
modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
});

document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !suggestions.contains(e.target)) {
        suggestions.classList.add('hidden');
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitBtn.click();
});