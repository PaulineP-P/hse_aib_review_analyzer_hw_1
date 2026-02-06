// Review Sentiment Analyzer
// Использует Hugging Face Inference API

// Глобальные переменные
let reviews = [];
let apiToken = '';

// DOM элементы
const analyzeBtn = document.getElementById('analyze-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const loadingElement = document.querySelector('.loading');
const loadingText = document.getElementById('loading-text');
const errorElement = document.getElementById('error-message');
const apiTokenInput = document.getElementById('api-token');

// URL модели из задания
const MODEL_URL = 'https://router.huggingface.co/hf-inference/models/j-hartmann/sentiment-roberta-large-english-3-classes';

// Инициализация приложения
function initApp() {
    console.log('Initializing Sentiment Analyzer...');
    
    // Загружаем отзывы
    loadReviews();
    
    // Назначаем обработчики событий
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    apiTokenInput.addEventListener('input', saveApiToken);
    
    // Загружаем сохраненный токен
    loadSavedToken();
    
    console.log('App initialized');
}

// Загрузка отзывов из TSV
function loadReviews() {
    console.log('Loading reviews from reviews_test.tsv...');
    
    fetch('reviews_test.tsv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(tsvData => {
            // Используем PapaParse для парсинга TSV
            const results = Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                skipEmptyLines: true,
                dynamicTyping: true
            });
            
            if (results.errors && results.errors.length > 0) {
                console.warn('TSV parsing warnings:', results.errors);
            }
            
            // Извлекаем текст из колонки 'text'
            reviews = results.data
                .filter(row => row && row.text)
                .map(row => row.text.toString().trim())
                .filter(text => text.length > 0);
            
            console.log(`Successfully loaded ${reviews.length} reviews`);
            
            if (reviews.length === 0) {
                showError('No reviews found in TSV file. Using sample reviews.');
                useSampleReviews();
            }
        })
        .catch(error => {
            console.error('Failed to load reviews:', error);
            showError(`Failed to load reviews: ${error.message}. Using sample reviews.`);
            useSampleReviews();
        });
}

// Использовать примеры отзывов если TSV не загрузился
function useSampleReviews() {
    reviews = [
        "This product is absolutely amazing! It exceeded all my expectations.",
        "Terrible quality, broke after just two days of use.",
        "It's okay for the price but nothing special.",
        "Excellent value, highly recommended to everyone.",
        "Very disappointed, doesn't work as advertised.",
        "Fantastic! The best purchase I've made this year.",
        "Poor customer service and product quality.",
        "Good product with some minor issues.",
        "Horrible experience, would never buy again.",
        "Perfect for my needs, works flawlessly."
    ];
    console.log('Using sample reviews');
}

// Сохранение токена в localStorage
function saveApiToken() {
    apiToken = apiTokenInput.value.trim();
    if (apiToken) {
        localStorage.setItem('hfApiToken', apiToken);
        console.log('Token saved to localStorage');
    } else {
        localStorage.removeItem('hfApiToken');
        console.log('Token cleared from localStorage');
    }
}

// Загрузка сохраненного токена
function loadSavedToken() {
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
        console.log('Loaded saved token from localStorage');
    }
}

// Анализ случайного отзыва
async function analyzeRandomReview() {
    // Скрываем предыдущие ошибки
    hideError();
    
    // Проверяем наличие отзывов
    if (reviews.length === 0) {
        showError('No reviews available. Please wait for reviews to load.');
        return;
    }
    
    // Выбираем случайный отзыв
    const randomIndex = Math.floor(Math.random() * reviews.length);
    const selectedReview = reviews[randomIndex];
    
    // Показываем отзыв
    reviewText.textContent = selectedReview;
    
    // Показываем индикатор загрузки
    loadingText.textContent = 'Sending request to Hugging Face API...';
    loadingElement.style.display = 'block';
    analyzeBtn.disabled = true;
    
    // Очищаем предыдущий результат
    sentimentResult.innerHTML = '';
    sentimentResult.className = 'sentiment-result';
    
    try {
        // Отправляем запрос к API
        const result = await callHuggingFaceAPI(selectedReview);
        
        // Обрабатываем и показываем результат
        processAndDisplayResult(result);
        
    } catch (error) {
        console.error('Analysis error:', error);
        showError(`Analysis failed: ${error.message}`);
        
    } finally {
        // Скрываем индикатор загрузки
        loadingElement.style.display = 'none';
        analyzeBtn.disabled = false;
    }
}

// Вызов Hugging Face API
async function callHuggingFaceAPI(text) {
    // Подготавливаем заголовки
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Добавляем Authorization header если есть токен
    if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    // Отправляем запрос
    const response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ inputs: text })
    });
    
    // Проверяем ответ
    if (!response.ok) {
        let errorMsg = `API Error: ${response.status} ${response.statusText}`;
        
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMsg = errorData.error;
                
                // Добавляем подсказки для распространенных ошибок
                if (errorData.error.includes('token')) {
                    errorMsg += '. Please check your API token.';
                } else if (errorData.error.includes('loading')) {
                    errorMsg += '. The model is loading, please wait a moment and try again.';
                }
            }
        } catch (e) {
            // Не удалось распарсить JSON ошибки
        }
        
        throw new Error(errorMsg);
    }
    
    // Возвращаем результат
    return await response.json();
}

// Обработка и отображение результата
function processAndDisplayResult(apiResult) {
    // Значения по умолчанию (нейтральный)
    let sentiment = 'neutral';
    let label = 'NEUTRAL';
    let score = 0.5;
    
    try {
        // Формат ответа: [[{label: "POSITIVE", score: 0.99}, {label: "NEGATIVE", score: 0.01}]]
        if (Array.isArray(apiResult) && apiResult.length > 0) {
            const firstResult = apiResult[0];
            
            if (Array.isArray(firstResult) && firstResult.length > 0) {
                const data = firstResult[0];
                
                if (data && data.label && data.score !== undefined) {
                    label = data.label.toUpperCase();
                    score = data.score;
                    
                    // Определяем сентимент по правилам из задания
                    if (label === 'POSITIVE' && score > 0.5) {
                        sentiment = 'positive';
                    } else if (label === 'NEGATIVE' && score > 0.5) {
                        sentiment = 'negative';
                    } else {
                        sentiment = 'neutral';
                        label = 'NEUTRAL';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error processing API result:', error);
        showError('Could not parse API response. Using default neutral sentiment.');
    }
    
    // Обновляем UI
    updateSentimentDisplay(sentiment, label, score);
}

// Обновление отображения сентимента
function updateSentimentDisplay(sentiment, label, score) {
    // Обновляем классы
    sentimentResult.className = `sentiment-result ${sentiment}`;
    
    // Выбираем иконку
    let icon = 'fa-question-circle';
    if (sentiment === 'positive') icon = 'fa-thumbs-up';
    if (sentiment === 'negative') icon = 'fa-thumbs-down';
    
    // Форматируем уверенность
    const confidence = (score * 100).toFixed(1);
    
    // Создаем HTML
    sentimentResult.innerHTML = `
        <i class="fas ${icon} icon"></i>
        <span>${label} (${confidence}% confidence)</span>
    `;
}

// Показать сообщение об ошибке
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Автоматически скрыть через 7 секунд
    setTimeout(hideError, 7000);
}

// Скрыть ошибку
function hideError() {
    errorElement.style.display = 'none';
}

// Запускаем приложение когда DOM загружен
document.addEventListener('DOMContentLoaded', initApp);
