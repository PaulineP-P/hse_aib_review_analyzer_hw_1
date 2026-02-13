// Review Sentiment Analyzer with Business Actions
// Uses Hugging Face Inference API

// Global variables
let reviews = [];
let apiToken = '';
let currentSelectedReview = '';

// DOM elements
const analyzeBtn = document.getElementById('analyze-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const actionResult = document.getElementById('action-result');
const loadingElement = document.querySelector('.loading');
const loadingText = document.getElementById('loading-text');
const errorElement = document.getElementById('error-message');
const apiTokenInput = document.getElementById('api-token');

// Model URL
const MODEL_URL = 'https://router.huggingface.co/hf-inference/models/j-hartmann/sentiment-roberta-large-english-3-classes';

// Google Apps Script URL
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwrdYEcnoZdo7yUjrAfMixydOtt8HNcZKl6G19Yo7pBBdgRej24MRMQ7ppp6UsEUDdu0g/exec';

// Initialize app
function initApp() {
    console.log('Initializing Sentiment Analyzer with Business Logic...');
    
    loadReviews();
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    apiTokenInput.addEventListener('input', saveApiToken);
    loadSavedToken();
    
    console.log('App initialized');
}

// Load reviews from TSV
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
            const results = Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                skipEmptyLines: true,
                dynamicTyping: true
            });
            
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

// Use sample reviews if TSV fails
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

// Save token to localStorage
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

// Load saved token
function loadSavedToken() {
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
        console.log('Loaded saved token from localStorage');
    }
}

/**
 * Determines business action based on sentiment analysis
 * 
 * @param {number} confidence - Model confidence (0.0 to 1.0)
 * @param {string} label - Label ("POSITIVE", "NEGATIVE")
 * @returns {object} Action metadata
 */
function determineBusinessAction(confidence, label) {
    console.log(`Determining action for label: ${label}, confidence: ${confidence}`);
    
    // 1. Normalize score to 0 (worst) to 1 (best) scale
    let normalizedScore = 0.5; // Default neutral

    if (label === "POSITIVE") {
        normalizedScore = confidence; // POSITIVE with high confidence = good
    } else if (label === "NEGATIVE") {
        normalizedScore = 1.0 - confidence; // NEGATIVE with high confidence = bad
    }

    console.log(`Normalized score: ${normalizedScore.toFixed(2)}`);

    // 2. Apply business rules
    if (normalizedScore <= 0.4) {
        // Churn risk case
        return {
            actionCode: "OFFER_COUPON",
            uiMessage: "🚨 We're sorry. Please accept this 50% discount coupon for your next purchase!",
            uiColor: "#ef4444", // Red
            icon: "fa-ticket"
        };
    } else if (normalizedScore < 0.7) {
        // Neutral / ambiguous case
        return {
            actionCode: "REQUEST_FEEDBACK",
            uiMessage: "📝 Thank you for your feedback! Could you tell us more about how we can improve?",
            uiColor: "#6b7280", // Gray
            icon: "fa-clipboard-list"
        };
    } else {
        // Happy customer case
        return {
            actionCode: "ASK_REFERRAL",
            uiMessage: "⭐ Glad you liked it! Refer a friend and earn rewards.",
            uiColor: "#3b82f6", // Blue
            icon: "fa-share-alt"
        };
    }
}

// Analyze random review
async function analyzeRandomReview() {
    hideError();
    if (actionResult) {
        actionResult.style.display = 'none';
        actionResult.innerHTML = '';
    }
    
    if (reviews.length === 0) {
        showError('No reviews available. Please wait for reviews to load.');
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * reviews.length);
    currentSelectedReview = reviews[randomIndex];
    
    reviewText.textContent = currentSelectedReview;
    
    loadingText.textContent = 'Sending request to Hugging Face API...';
    loadingElement.style.display = 'block';
    analyzeBtn.disabled = true;
    
    sentimentResult.innerHTML = '';
    sentimentResult.className = 'sentiment-result';
    
    try {
        const result = await callHuggingFaceAPI(currentSelectedReview);
        await processAndDisplayResult(result, currentSelectedReview);
    } catch (error) {
        console.error('Analysis error:', error);
        showError(`Analysis failed: ${error.message}`);
    } finally {
        loadingElement.style.display = 'none';
        analyzeBtn.disabled = false;
    }
}

// Call Hugging Face API
async function callHuggingFaceAPI(text) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    const response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ inputs: text })
    });
    
    if (!response.ok) {
        let errorMsg = `API Error: ${response.status} ${response.statusText}`;
        
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMsg = errorData.error;
                if (errorData.error.includes('token')) {
                    errorMsg += '. Please check your API token.';
                } else if (errorData.error.includes('loading')) {
                    errorMsg += '. The model is loading, please wait a moment and try again.';
                }
            }
        } catch (e) {}
        
        throw new Error(errorMsg);
    }
    
    return await response.json();
}

// Process and display result
async function processAndDisplayResult(apiResult, reviewText) {
    let sentiment = 'neutral';
    let label = 'NEUTRAL';
    let score = 0.5;
    
    try {
        if (Array.isArray(apiResult) && apiResult.length > 0) {
            const firstResult = apiResult[0];
            
            if (Array.isArray(firstResult) && firstResult.length > 0) {
                const data = firstResult[0];
                
                if (data && data.label && data.score !== undefined) {
                    label = data.label.toUpperCase();
                    score = data.score;
                    
                    if (label === 'POSITIVE' && score > 0.5) {
                        sentiment = 'positive';
                    } else if (label === 'EGATIVE' && score > 0.5) {
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
    
    updateSentimentDisplay(sentiment, label, score);
    
    const decision = determineBusinessAction(score, label);
    updateActionDisplay(decision);
    
    await logToGoogleSheets({
        review: reviewText,
        sentiment: sentiment,
        label: label,
        score: score,
        confidence: (score * 100).toFixed(1),
        actionTaken: decision.actionCode,
        rawApiResult: apiResult
    });
}

// Update sentiment display
function updateSentimentDisplay(sentiment, label, score) {
    sentimentResult.className = `sentiment-result ${sentiment}`;
    
    let icon = 'fa-question-circle';
    if (sentiment === 'positive') icon = 'fa-thumbs-up';
    if (sentiment === 'negative') icon = 'fa-thumbs-down';
    
    const confidence = (score * 100).toFixed(1);
    
    sentimentResult.innerHTML = `
        <i class="fas ${icon} icon"></i>
        <span>${label} (${confidence}% confidence)</span>
    `;
}

// Update action display
function updateActionDisplay(decision) {
    if (!actionResult) return;
    
    actionResult.style.display = 'block';
    actionResult.className = 'action-result';
    actionResult.style.borderLeftColor = decision.uiColor;
    actionResult.style.backgroundColor = `${decision.uiColor}15`;
    
    actionResult.innerHTML = `
        <div class="action-icon">
            <i class="fas ${decision.icon}" style="color: ${decision.uiColor}"></i>
        </div>
        <div class="action-content">
            <div class="action-code">${decision.actionCode}</div>
            <div class="action-message">${decision.uiMessage}</div>
        </div>
    `;
}

// Log to Google Sheets (FIXED VERSION - removed no-cors)
async function logToGoogleSheets(data) {
    console.log('📤 Preparing data for Google Sheets...');
    
    const payload = {
        ts_iso: new Date().toISOString(),
        review: data.review,
        sentiment: `${data.label} (${data.confidence}% confidence)`,
        action_taken: data.actionTaken,
        meta: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            model: 'j-hartmann/sentiment-roberta-large-english-3-classes',
            rawScore: data.score,
            sentimentCategory: data.sentiment,
            timestampClient: Date.now(),
            apiResponse: Array.isArray(data.rawApiResult) ? 
                JSON.stringify(data.rawApiResult[0]) : 
                JSON.stringify(data.rawApiResult)
        }
    };
    
    console.log('Sending data:', {
        ts_iso: payload.ts_iso,
        review: payload.review.substring(0, 50) + '...',
        sentiment: payload.sentiment,
        action_taken: payload.action_taken,
        meta: '✓ (object included)'
    });
    
    try {
        // FIXED: Removed mode: 'no-cors'
        const response = await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        console.log('✅ Google Sheets response:', result);
        
        if (result.success) {
            console.log('✅ Data successfully logged to Google Sheets');
        } else {
            console.error('❌ Google Sheets error:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Error sending data to Google Sheets:', error);
        showError('Failed to log data to Google Sheets. Check console for details.');
    }
}

// Show error message
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(hideError, 7000);
}

// Hide error message
function hideError() {
    errorElement.style.display = 'none';
}

// Start app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
