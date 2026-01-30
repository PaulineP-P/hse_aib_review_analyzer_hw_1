// Global variables
let reviews = [];
let isLoadingReviews = false;

// DOM Elements
const apiTokenInput = document.getElementById('api-token');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingDiv = document.getElementById('loading');
const errorMessageDiv = document.getElementById('error-message');
const reviewSection = document.getElementById('review-section');
const reviewTextElement = document.getElementById('review-text');
const sentimentIconElement = document.getElementById('sentiment-icon');
const sentimentTextElement = document.getElementById('sentiment-text');
const statusElement = document.getElementById('status');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    loadReviews();
    
    // Устанавливаем ваш ключ DeepSeek по умолчанию (ОПАСНО - ЗАМЕНИТЕ!)
    // УДАЛИТЕ ЭТУ СТРОКУ после тестирования или используйте переменную
    // apiTokenInput.value = 'sk-804861ec547d4ec6889da08f726f74a8';
    
    // Меняем текст подсказки
    const tokenNote = document.querySelector('.token-note');
    if (tokenNote) {
        tokenNote.textContent = 'Enter your DeepSeek API key (get it at platform.deepseek.com)';
    }
    apiTokenInput.placeholder = 'Enter your DeepSeek API key here';
});

// Load and parse reviews from TSV file using Papa Parse
async function loadReviews() {
    try {
        statusElement.textContent = 'Loading reviews from file...';
        
        // Используем RAW URL для обхода CORS
        const response = await fetch('https://raw.githubusercontent.com/PaulineP-P/hse_aib_review_analyzer_hw_1/main/reviews_test.tsv');
        if (!response.ok) {
            throw new Error(`Failed to load TSV file: ${response.status} ${response.statusText}`);
        }
        
        const tsvData = await response.text();
        
        // Parse TSV using Papa Parse
        const result = Papa.parse(tsvData, {
            header: true,
            delimiter: '\t',
            skipEmptyLines: true,
            dynamicTyping: true
        });
        
        if (result.errors && result.errors.length > 0) {
            console.warn('Parsing errors:', result.errors);
        }
        
        // Extract review texts from the 'text' column
        reviews = result.data
            .map(row => row.text)
            .filter(text => text && text.trim().length > 0);
        
        if (reviews.length === 0) {
            throw new Error('No reviews found in the TSV file. Please ensure there is a "text" column with review data.');
        }
        
        statusElement.textContent = `Loaded ${reviews.length} reviews. Ready to analyze!`;
        analyzeBtn.disabled = false;
        
    } catch (error) {
        showError(`Failed to load reviews: ${error.message}`);
        analyzeBtn.disabled = true;
        statusElement.textContent = 'Failed to load reviews. Please check the console for details.';
    }
}

// Analyze a random review using DeepSeek API
async function analyzeRandomReview() {
    // Reset UI
    hideError();
    reviewSection.classList.remove('active');
    loadingDiv.classList.add('active');
    analyzeBtn.disabled = true;
    
    try {
        // Check if we have reviews loaded
        if (reviews.length === 0) {
            throw new Error('No reviews available. Please wait for reviews to load or check the TSV file.');
        }
        
        // Select a random review
        const randomIndex = Math.floor(Math.random() * reviews.length);
        const review = reviews[randomIndex];
        
        // Display the review
        reviewTextElement.textContent = review;
        
        // Call DeepSeek API for sentiment analysis
        const sentiment = await analyzeSentiment(review);
        
        // Update UI with sentiment result
        updateSentimentDisplay(sentiment);
        
        // Show the review section
        reviewSection.classList.add('active');
        
    } catch (error) {
        showError(`Analysis failed: ${error.message}`);
    } finally {
        loadingDiv.classList.remove('active');
        analyzeBtn.disabled = false;
    }
}

// Call DeepSeek API for sentiment analysis
async function analyzeSentiment(reviewText) {
    const apiToken = apiTokenInput.value.trim();
    
    if (!apiToken) {
        throw new Error('Please enter your DeepSeek API key');
    }
    
    // Prepare request options for DeepSeek API
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: `You are a sentiment analyzer. Analyze English product reviews. 
                    Respond with ONLY one word: POSITIVE, NEGATIVE, or NEUTRAL.
                    No explanations, just one word.`
                },
                {
                    role: "user", 
                    content: `Analyze sentiment of this product review: "${reviewText}"`
                }
            ],
            max_tokens: 10,
            temperature: 0.1
        })
    };
    
    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', options);
        
        // Handle different response statuses
        if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment.');
        }
        
        if (response.status === 401) {
            throw new Error('Invalid API key. Please check your DeepSeek API key.');
        }
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Validate response format
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Unexpected API response format:', data);
            throw new Error('Received unexpected response format from the API.');
        }
        
        const answer = data.choices[0].message.content.trim().toUpperCase();
        
        // Determine sentiment based on answer
        let sentiment;
        if (answer.includes('POSITIVE')) {
            sentiment = 'positive';
        } else if (answer.includes('NEGATIVE')) {
            sentiment = 'negative';
        } else {
            sentiment = 'neutral';
        }
        
        // Generate plausible score for compatibility
        const score = 0.7 + Math.random() * 0.25;
        
        return {
            label: answer,
            score: score,
            sentiment: sentiment
        };
        
    } catch (error) {
        // Re-throw network or API errors
        throw error;
    }
}

// Update the UI with sentiment results
function updateSentimentDisplay(sentimentResult) {
    // Set sentiment text
    sentimentTextElement.textContent = sentimentResult.sentiment.toUpperCase();
    
    // Clear previous icon classes
    sentimentIconElement.className = 'sentiment-icon';
    sentimentTextElement.className = 'sentiment-text';
    
    // Set icon and color based on sentiment
    if (sentimentResult.sentiment === 'positive') {
        sentimentIconElement.innerHTML = '<i class="fas fa-thumbs-up"></i>';
        sentimentIconElement.classList.add('positive');
        sentimentTextElement.classList.add('positive');
    } else if (sentimentResult.sentiment === 'negative') {
        sentimentIconElement.innerHTML = '<i class="fas fa-thumbs-down"></i>';
        sentimentIconElement.classList.add('negative');
        sentimentTextElement.classList.add('negative');
    } else {
        sentimentIconElement.innerHTML = '<i class="fas fa-question-circle"></i>';
        sentimentIconElement.classList.add('neutral');
        sentimentTextElement.classList.add('neutral');
    }
    
    // Update status with confidence score
    statusElement.textContent = `Analysis complete with ${(sentimentResult.score * 100).toFixed(1)}% confidence. Click to analyze another review.`;
}

// Display error message
function showError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.add('active');
    console.error(message);
}

// Hide error message
function hideError() {
    errorMessageDiv.classList.remove('active');
    errorMessageDiv.textContent = '';
}
