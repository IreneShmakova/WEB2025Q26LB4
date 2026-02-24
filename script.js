const API_KEY = '51fe7c9692554d5f5fa4324f1dd446f9'; 
const API_URL = 'https://api.openweathermap.org/data/2.5';

// состояние
let currentCity = null;
let useGeo = true;

// эл-ты
const weatherDiv = document.getElementById('weatherContent');
const modal = document.getElementById('cityModal');
const refreshBtn = document.getElementById('refreshBtn');
const cityInput = document.getElementById('cityInput');
const submitBtn = document.getElementById('submitCity');
const cancelBtn = document.getElementById('cancelModal');

// запуск 
document.addEventListener('DOMContentLoaded', () => {
    startApp();
});

async function startApp() {
    showLoading();
    
    // попытка получить геолокацию
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                getWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            error => {
                console.log('Геолокация отключена');
                useGeo = false;
                
                // проверяем, есть ли сохраненный город
                const savedCity = localStorage.getItem('city');
                if (savedCity) {
                    getWeatherByCity(savedCity);
                } else {
                    showModal();
                }
            }
        );
    } else {
        showModal();
    }
}

// погода по координатам
async function getWeatherByCoords(lat, lon) {
    try {
        // текущая погода
        const weatherRes = await fetch(
            `${API_URL}/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`
        );
        const weather = await weatherRes.json();
        
        // прогноз
        const forecastRes = await fetch(
            `${API_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ru&cnt=24&appid=${API_KEY}`
        );
        const forecast = await forecastRes.json();
        
        // прогноз на 3 дня (берем каждые 24 часа)
        const daily = [];
        for (let i = 0; i < forecast.list.length; i += 8) {
            if (daily.length < 3) {
                daily.push(forecast.list[i]);
            }
        }
        
        showWeather(weather, daily, 'Текущее местоположение');
        
    } catch (error) {
        showError('Ошибка загрузки погоды');
    }
}

// погода по названию города
async function getWeatherByCity(city) {
    try {
        const weatherRes = await fetch(
            `${API_URL}/weather?q=${city}&units=metric&lang=ru&appid=${API_KEY}`
        );
        
        if (!weatherRes.ok) {
            throw new Error('Город не найден');
        }
        
        const weather = await weatherRes.json();
        
        const forecastRes = await fetch(
            `${API_URL}/forecast?q=${city}&units=metric&lang=ru&cnt=24&appid=${API_KEY}`
        );
        const forecast = await forecastRes.json();
        
        const daily = [];
        for (let i = 0; i < forecast.list.length; i += 8) {
            if (daily.length < 3) {
                daily.push(forecast.list[i]);
            }
        }
        
        showWeather(weather, daily, city);
        
        // сохраняем город
        localStorage.setItem('city', city);
        currentCity = city;
        hideModal();
        
    } catch (error) {
        alert('Город не найден, попробуйте еще раз');
    }
}

// показать погоду
function showWeather(weather, forecast, location) {
    const days = ['Сегодня', 'Завтра', 'Послезавтра'];
    
    const html = `
        <div class="weather-card">
            <div class="location">${location}</div>
            <div class="temp-block">
                <div class="temp-main">${Math.round(weather.main.temp)}°</div>
                <div class="temp-desc">${weather.weather[0].description}</div>
            </div>
            <div class="details">
                <p>Ощущается как: ${Math.round(weather.main.feels_like)}°</p>
                <p>Влажность: ${weather.main.humidity}%</p>
                <p>Ветер: ${Math.round(weather.wind.speed)} м/с</p>
            </div>
        </div>
        
        <div class="forecast">
            <h3>Прогноз на 3 дня</h3>
            <div class="forecast-days">
                ${forecast.map((day, i) => `
                    <div class="day-card">
                        <div class="day-name">${days[i]}</div>
                        <div class="day-icon">${getIcon(day.weather[0].main)}</div>
                        <div class="day-temp">${Math.round(day.main.temp)}°</div>
                        <div class="day-desc">${day.weather[0].description}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    weatherDiv.innerHTML = html;
}

// иконка погоды
function getIcon(weather) {
    const icons = {
        'Clear': '☀️',
        'Clouds': '☁️', 
        'Rain': '🌧️',
        'Snow': '❄️',
        'Thunderstorm': '⚡',
        'Drizzle': '🌧️',
        'Mist': '🌫️'
    };
    return icons[weather] || '☁️';
}

// показать загрузку
function showLoading() {
    weatherDiv.innerHTML = '<div class="loading">Загрузка...</div>';
}

// показать ошибку
function showError(msg) {
    weatherDiv.innerHTML = `<div class="error">${msg}</div>`;
}

// показать модальное
function showModal() {
    modal.classList.remove('hidden');
}

// скрыть модальное
function hideModal() {
    modal.classList.add('hidden');
    cityInput.value = '';
}

// обновить
refreshBtn.addEventListener('click', () => {
    if (useGeo && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude)
        );
    } else if (currentCity || localStorage.getItem('city')) {
        getWeatherByCity(currentCity || localStorage.getItem('city'));
    } else {
        showModal();
    }
});

// добавить город
submitBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherByCity(city);
    }
});

// отмена
cancelBtn.addEventListener('click', () => {
    hideModal();
    if (!currentCity && !localStorage.getItem('city')) {
        weatherDiv.innerHTML = '<div class="error">Введите город для отображения погоды</div>';
    }
});

// Enter в поле ввода
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitBtn.click();
    }
});

// клик вне модального
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        hideModal();
    }
});
