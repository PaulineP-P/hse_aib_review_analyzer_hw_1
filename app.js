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
});

// Load and parse reviews from TSV file using Papa Parse
async function loadReviews() {
    try {
        statusElement.textContent = 'Loading reviews from file...';
        
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

// Analyze a random review using Hugging Face API
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
        
        // Call Hugging Face API for sentiment analysis
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

// Call Hugging Face Inference API for sentiment analysis
async function analyzeSentiment(reviewText) {
    const apiToken = apiTokenInput.value.trim();
    
    // Prepare request options
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: reviewText })
    };
    
    // Add Authorization header if token is provided
    if (apiToken) {
        options.headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    const model = 'nlptown/bert-base-multilingual-uncased-sentiment';
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    
    try {
        const response = await fetch(apiUrl, options);
        
        // Handle different response statuses
        if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment or add your Hugging Face API token for higher limits.');
        }
        
        if (response.status === 401) {
            throw new Error('Invalid API token. Please check your token or leave it empty to use the free tier.');
        }
        
        if (response.status === 503) {
            // Model might be loading, wait and retry
            const result = await response.json();
            if (result.estimated_time) {
                throw new Error(`Model is loading. Please try again in ${Math.ceil(result.estimated_time)} seconds.`);
            } else {
                throw new Error('Model is temporarily unavailable. Please try again in a moment.');
            }
        }
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Validate response format
        if (!Array.isArray(data) || !data[0] || !Array.isArray(data[0]) || !data[0][0]) {
            console.error('Unexpected API response format:', data);
            throw new Error('Received unexpected response format from the sentiment analysis API.');
        }
        
        const sentimentResult = data[0][0];
        
        // Determine sentiment based on label and score
        let sentiment;
        if (sentimentResult.label === 'POSITIVE' && sentimentResult.score > 0.5) {
            sentiment = 'positive';
        } else if (sentimentResult.label === 'NEGATIVE' && sentimentResult.score > 0.5) {
            sentiment = 'negative';
        } else {
            sentiment = 'neutral';
        }
        
        return {
            label: sentimentResult.label,
            score: sentimentResult.score,
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
