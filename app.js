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
    
    // Меняем текст для ясности (API больше не нужно)
    const tokenNote = document.querySelector('.token-note');
    if (tokenNote) {
        tokenNote.textContent = 'API key is not required for local sentiment analysis';
    }
    apiTokenInput.placeholder = 'API key not needed (using local analysis)';
    apiTokenInput.disabled = true;
    apiTokenInput.style.backgroundColor = '#f5f5f5';
    apiTokenInput.style.cursor = 'not-allowed';
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

// Analyze a random review using LOCAL sentiment analysis
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
        
        // Call LOCAL sentiment analysis
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

// LOCAL sentiment analysis based on keyword matching
async function analyzeSentiment(reviewText) {
    // Simulate API delay for realistic experience
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Comprehensive keyword lists for sentiment analysis
    const positiveKeywords = [
        // Strong positive
        'excellent', 'outstanding', 'amazing', 'wonderful', 'fantastic', 'superb',
        'perfect', 'brilliant', 'exceptional', 'phenomenal', 'awesome', 'magnificent',
        'love', 'adore', 'favorite', 'best', 'great', 'good',
        
        // Moderate positive
        'nice', 'pleased', 'satisfied', 'happy', 'enjoy', 'like', 'decent',
        'recommend', 'worth', 'valuable', 'helpful', 'useful', 'effective',
        
        // Product-specific positive
        'quality', 'durable', 'reliable', 'efficient', 'fast', 'quick', 'easy',
        'comfortable', 'beautiful', 'stylish', 'attractive', 'well-made'
    ];
    
    const negativeKeywords = [
        // Strong negative
        'terrible', 'horrible', 'awful', 'worst', 'disgusting', 'disappointing',
        'hate', 'regret', 'waste', 'rubbish', 'garbage', 'useless', 'broken',
        
        // Moderate negative
        'bad', 'poor', 'mediocre', 'average', 'okay', 'so-so', 'unhappy',
        'problem', 'issue', 'fault', 'defect', 'flaw', 'disadvantage',
        
        // Product-specific negative
        'cheap', 'flimsy', 'slow', 'difficult', 'complicated', 'uncomfortable',
        'expensive', 'overpriced', 'noisy', 'heavy', 'small', 'big'
    ];
    
    const neutralKeywords = [
        'average', 'standard', 'normal', 'regular', 'typical', 'ordinary',
        'adequate', 'sufficient', 'acceptable', 'moderate', 'fair', 'reasonable'
    ];
    
    // Negation words that invert sentiment
    const negationWords = ['not', 'no', 'never', 'none', 'nothing', 'without'];
    
    // Intensifier words
    const intensifiers = ['very', 'really', 'extremely', 'absolutely', 'totally'];
    
    const textLower = reviewText.toLowerCase();
    const words = textLower.split(/\s+/);
    
    // Scoring system
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 1; // Start with 1 for baseline
    
    // Analyze each word in context
    for (let i = 0; i < words.length; i++) {
        const word = words[i].replace(/[^\w\s]/g, '');
        let wordScore = 0;
        let isNegated = false;
        
        // Check for negation
        if (i > 0 && negationWords.includes(words[i-1])) {
            isNegated = true;
        }
        
        // Check for intensifiers
        let intensity = 1;
        if (i > 0 && intensifiers.includes(words[i-1])) {
            intensity = 2;
        }
        
        // Check word against sentiment dictionaries
        if (positiveKeywords.includes(word)) {
            wordScore = isNegated ? -2 : 3;
        } else if (negativeKeywords.includes(word)) {
            wordScore = isNegated ? 2 : -3;
        } else if (neutralKeywords.includes(word)) {
            wordScore = 0.5;
        }
        
        // Apply intensity multiplier
        wordScore *= intensity;
        
        // Add to appropriate score
        if (wordScore > 0) {
            positiveScore += wordScore;
        } else if (wordScore < 0) {
            negativeScore += Math.abs(wordScore);
        } else {
            neutralScore += 0.1;
        }
    }
    
    // Check for punctuation emphasis
    if ((reviewText.match(/!/g) || []).length > 1) {
        if (positiveScore > negativeScore) positiveScore += 2;
        if (negativeScore > positiveScore) negativeScore += 2;
    }
    
    // Check for question marks (uncertainty)
    if ((reviewText.match(/\?/g) || []).length > 0) {
        neutralScore += 1;
    }
    
    // Check for contrast words
    if (textLower.includes('but') || textLower.includes('however') || textLower.includes('although')) {
        neutralScore += 1;
    }
    
    // Determine final sentiment
    let sentiment, label;
    const maxScore = Math.max(positiveScore, negativeScore, neutralScore);
    
    if (maxScore === neutralScore || Math.abs(positiveScore - negativeScore) < 2) {
        // Close scores or neutral wins
        sentiment = 'neutral';
        label = 'NEUTRAL';
    } else if (positiveScore === maxScore) {
        sentiment = 'positive';
        label = 'POSITIVE';
    } else {
        sentiment = 'negative';
        label = 'NEGATIVE';
    }
    
    // Calculate confidence score
    const totalScore = positiveScore + negativeScore + neutralScore;
    let confidence;
    if (sentiment === 'neutral') {
        confidence = 0.5 + (neutralScore / totalScore) * 0.3;
    } else if (sentiment === 'positive') {
        confidence = 0.6 + (positiveScore / totalScore) * 0.3;
    } else {
        confidence = 0.6 + (negativeScore / totalScore) * 0.3;
    }
    
    // Ensure confidence is within bounds
    confidence = Math.min(Math.max(confidence, 0.5), 0.95);
    
    return {
        label: label,
        score: confidence,
        sentiment: sentiment
    };
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
    
    // Log analysis details for debugging
    console.log(`Sentiment Analysis: ${sentimentResult.sentiment} (${(sentimentResult.score * 100).toFixed(1)}% confidence)`);
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
