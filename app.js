// Review Sentiment Analyzer - app.js
// Использует Hugging Face Inference API

document.addEventListener('DOMContentLoaded', function() {
    console.log('App loaded');
    
    // DOM элементы
    const analyzeBtn = document.getElementById('analyze-btn');
    const reviewText = document.getElementById('review-text');
    const sentimentResult = document.getElementById('sentiment-result');
    const loadingElement = document.querySelector('.loading');
    const errorElement = document.getElementById('error-message');
    const apiTokenInput = document.getElementById('api-token');
    
    // Массив для хранения отзывов
    let reviews = [];
    // Токен API
    let apiToken = '';
    
    // URL модели Hugging Face
    const MODEL_URL = 'https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english';
    
    // ========== ФУНКЦИИ ==========
    
    // 1. Загрузка отзывов из TSV файла
    function loadReviews() {
        console.log('Loading reviews from TSV...');
        
        fetch('reviews_test.tsv')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Cannot load reviews_test.tsv. Make sure file exists.');
                }
                return response.text();
            })
            .then(tsvData => {
                // Используем PapaParse для парсинга TSV
                const results = Papa.parse(tsvData, {
                    header: true,
                    delimiter: '\t',
                    skipEmptyLines: true
                });
                
                if (results.errors.length > 0) {
                    throw new Error('Error parsing TSV: ' + results.errors[0].message);
                }
                
                // Извлекаем колонку 'text'
                reviews = results.data
                    .map(row => row.text)
                    .filter(text => text && text.trim() !== '');
                
                console.log(`Loaded ${reviews.length} reviews`);
            })
            .catch(error => {
                console.error('Error loading reviews:', error);
                showError(`Cannot load reviews: ${error.message}`);
                
                // Если файл не загрузился, используем тестовые отзывы
                reviews = [
                    "This product is amazing! I love it!",
                    "Terrible quality, would not recommend.",
                    "It's okay, nothing special.",
                    "Excellent value for the money.",
                    "Very disappointed with this purchase."
                ];
                console.log('Using fallback reviews');
            });
    }
    
    // 2. Сохранение токена
    function saveApiToken() {
        apiToken = apiTokenInput.value.trim();
        if (apiToken) {
            localStorage.setItem('hfApiToken', apiToken);
            console.log('Token saved');
        } else {
            localStorage.removeItem('hfApiToken');
            console.log('Token cleared');
        }
    }
    
    // 3. Анализ случайного отзыва
    async function analyzeRandomReview() {
        // Скрыть предыдущие ошибки
        hideError();
        
        // Проверить, есть ли отзывы
        if (reviews.length === 0) {
            showError('No reviews loaded. Please wait or check TSV file.');
            return;
        }
        
        // Выбрать случайный отзыв
        const randomIndex = Math.floor(Math.random() * reviews.length);
        const selectedReview = reviews[randomIndex];
        
        // Показать отзыв
        reviewText.textContent = selectedReview;
        
        // Показать загрузку
        loadingElement.style.display = 'block';
        analyzeBtn.disabled = true;
        
        // Очистить предыдущий результат
        sentimentResult.innerHTML = '';
        sentimentResult.className = 'sentiment-result';
        
        try {
            // Вызвать API для анализа
            const result = await callHuggingFaceAPI(selectedReview);
            
            // Обработать и показать результат
            processAndDisplayResult(result);
        } catch (error) {
            console.error('Analysis error:', error);
            showError(`Analysis failed: ${error.message}`);
        } finally {
            // Скрыть загрузку
            loadingElement.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    }
    
    // 4. Вызов Hugging Face API
    async function callHuggingFaceAPI(text) {
        // Подготовить заголовки
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Добавить токен, если он есть
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }
        
        // Отправить запрос
        const response = await fetch(MODEL_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ inputs: text })
        });
        
        // Проверить ответ
        if (!response.ok) {
            let errorMsg = `API error: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMsg = errorData.error;
                }
            } catch (e) {
                // Не удалось распарсить JSON
            }
            throw new Error(errorMsg);
        }
        
        // Вернуть результат
        return await response.json();
    }
    
    // 5. Обработка и отображение результата
    function processAndDisplayResult(apiResult) {
        // Значения по умолчанию
        let sentiment = 'neutral';
        let label = 'NEUTRAL';
        let score = 0.5;
        
        try {
            // Формат ответа: [[{label: "POSITIVE", score: 0.99}]]
            if (Array.isArray(apiResult) && apiResult.length > 0) {
                const firstResult = apiResult[0];
                if (Array.isArray(firstResult) && firstResult.length > 0) {
                    const data = firstResult[0];
                    
                    if (data && data.label && data.score) {
                        label = data.label.toUpperCase();
                        score = data.score;
                        
                        // Определить сентимент по правилам из задания
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
            console.error('Error processing result:', error);
            // Оставить значения по умолчанию
        }
        
        // Обновить UI
        sentimentResult.className = `sentiment-result ${sentiment}`;
        
        // Выбрать иконку
        let icon = 'fa-question-circle';
        if (sentiment === 'positive') icon = 'fa-thumbs-up';
        if (sentiment === 'negative') icon = 'fa-thumbs-down';
        
        // Форматировать процент уверенности
        const confidence = (score * 100).toFixed(1);
        
        // Создать HTML
        sentimentResult.innerHTML = `
            <i class="fas ${icon} icon"></i>
            <span>${label} (${confidence}% confidence)</span>
        `;
    }
    
    // 6. Показать ошибку
    function showError(message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Автоматически скрыть через 5 секунд
        setTimeout(hideError, 5000);
    }
    
    // 7. Скрыть ошибку
    function hideError() {
        errorElement.style.display = 'none';
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    
    // Загрузить отзывы
    loadReviews();
    
    // Загрузить сохраненный токен
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
    }
    
    // Назначить обработчики событий
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    apiTokenInput.addEventListener('input', saveApiToken);
    
    console.log('App initialized successfully');
});
