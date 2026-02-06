// app.js - Sentiment analysis using Hugging Face Inference API
// Model: siebert/sentiment-roberta-large-english

// Global variables
let reviews = []; // Array to store parsed reviews from TSV
let apiToken = ""; // User's Hugging Face API token

// DOM elements
const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const loadingElement = document.querySelector(".loading");
const errorElement = document.getElementById("error-message");
const apiTokenInput = document.getElementById("api-token");

// Hugging Face API configuration
const MODEL_URL = "https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english";

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    console.log("Initializing Review Sentiment Analyzer...");
    
    // Load the TSV file with reviews
    loadReviews();
    
    // Set up event listeners
    analyzeBtn.addEventListener("click", analyzeRandomReview);
    apiTokenInput.addEventListener("input", saveApiToken);
    
    // Load saved API token from localStorage if exists
    const savedToken = localStorage.getItem("hfApiToken");
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
        console.log("Loaded saved API token");
    }
});

/**
 * Load and parse the TSV file using Papa Parse
 * File: reviews_test.tsv (should be in same directory)
 */
function loadReviews() {
    console.log("Loading reviews from TSV file...");
    
    fetch("reviews_test.tsv")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to load TSV file: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then((tsvData) => {
            // Use Papa Parse to parse TSV data
            Papa.parse(tsvData, {
                header: true,
                delimiter: "\t",
                complete: function(results) {
                    // Extract text column from parsed data
                    if (results.data && results.data.length > 0) {
                        reviews = results.data
                            .map(row => row.text)
                            .filter(text => typeof text === "string" && text.trim() !== "");
                        
                        console.log(`Successfully loaded ${reviews.length} reviews from TSV`);
                    } else {
                        showError("No review data found in TSV file. Please ensure the file contains a 'text' column.");
                    }
                },
                error: function(error) {
                    console.error("TSV parsing error:", error);
                    showError(`Failed to parse TSV file: ${error.message}`);
                }
            });
        })
        .catch((error) => {
            console.error("Error loading TSV file:", error);
            showError(`Failed to load reviews: ${error.message}. Please ensure 'reviews_test.tsv' exists.`);
        });
}

/**
 * Save API token to localStorage
 */
function saveApiToken() {
    apiToken = apiTokenInput.value.trim();
    if (apiToken) {
        localStorage.setItem("hfApiToken", apiToken);
        console.log("API token saved to localStorage");
    } else {
        localStorage.removeItem("hfApiToken");
        console.log("API token cleared from localStorage");
    }
}

/**
 * Analyze a random review from the loaded TSV data
 */
async function analyzeRandomReview() {
    // Clear any previous errors
    hideError();
    
    // Check if reviews are loaded
    if (!Array.isArray(reviews) || reviews.length === 0) {
        showError("No reviews available. Please wait for reviews to load or check TSV file.");
        return;
    }
    
    // Select a random review
    const randomIndex = Math.floor(Math.random() * reviews.length);
    const selectedReview = reviews[randomIndex];
    
    // Display the selected review
    reviewText.textContent = selectedReview;
    
    // Show loading state
    loadingElement.style.display = "block";
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = ""; // Clear previous result
    sentimentResult.className = "sentiment-result"; // Reset classes
    
    try {
        // Analyze sentiment using Hugging Face API
        const result = await analyzeSentimentWithAPI(selectedReview);
        
        // Display the result
        displaySentiment(result);
    } catch (error) {
        console.error("Error analyzing sentiment:", error);
        showError(error.message || "Failed to analyze sentiment. Please check your API token and try again.");
    } finally {
        // Hide loading state
        loadingElement.style.display = "none";
        analyzeBtn.disabled = false;
    }
}

/**
 * Call Hugging Face Inference API to analyze sentiment
 * @param {string} text - Review text to analyze
 * @returns {Promise<Array>} - Sentiment analysis results
 */
async function analyzeSentimentWithAPI(text) {
    // Prepare request headers
    const headers = {
        "Content-Type": "application/json"
    };
    
    // Add Authorization header if token is provided
    if (apiToken) {
        headers["Authorization"] = `Bearer ${apiToken}`;
    }
    
    // Prepare request body
    const body = JSON.stringify({
        inputs: text
    });
    
    // Make API request
    const response = await fetch(MODEL_URL, {
        method: "POST",
        headers: headers,
        body: body
    });
    
    // Check if request was successful
    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        
        // Try to parse error details
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
                errorMessage = errorJson.error;
            }
        } catch (e) {
            // If can't parse as JSON, use raw error text
            if (errorText) {
                errorMessage += ` - ${errorText}`;
            }
        }
        
        throw new Error(errorMessage);
    }
    
    // Parse and return the response
    return await response.json();
}

/**
 * Display sentiment result in the UI
 * @param {Array} apiResult - Result from Hugging Face API
 */
function displaySentiment(apiResult) {
    // Default values (neutral sentiment)
    let sentiment = "neutral";
    let score = 0.5;
    let label = "NEUTRAL";
    
    // Parse the API response
    // Expected format: [[{label: "POSITIVE", score: 0.99}, {label: "NEGATIVE", score: 0.01}]]
    try {
        if (Array.isArray(apiResult) && apiResult.length > 0) {
            const sentimentArray = apiResult[0];
            
            if (Array.isArray(sentimentArray) && sentimentArray.length > 0) {
                // Get the first (highest confidence) result
                const sentimentData = sentimentArray[0];
                
                if (sentimentData && typeof sentimentData === "object") {
                    label = sentimentData.label || "NEUTRAL";
                    score = sentimentData.score || 0.5;
                    
                    // Determine sentiment based on rules from assignment
                    if (label.toUpperCase() === "POSITIVE" && score > 0.5) {
                        sentiment = "positive";
                    } else if (label.toUpperCase() === "NEGATIVE" && score > 0.5) {
                        sentiment = "negative";
                    } else {
                        sentiment = "neutral";
                        label = "NEUTRAL";
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error parsing API response:", error);
        // Keep default neutral values
    }
    
    // Update UI with sentiment result
    sentimentResult.classList.add(sentiment);
    
    // Format confidence percentage
    const confidencePercent = (score * 100).toFixed(1);
    
    // Get appropriate icon for sentiment
    const iconClass = getSentimentIcon(sentiment);
    
    // Create result HTML
    sentimentResult.innerHTML = `
        <i class="fas ${iconClass} icon"></i>
        <span>${label} (${confidencePercent}% confidence)</span>
    `;
}

/**
 * Get Font Awesome icon class for sentiment
 * @param {string} sentiment - "positive", "negative", or "neutral"
 * @returns {string} - Icon class name
 */
function getSentimentIcon(sentiment) {
    switch (sentiment) {
        case "positive":
            return "fa-thumbs-up";
        case "negative":
            return "fa-thumbs-down";
        default:
            return "fa-question-circle";
    }
}

/**
 * Show error message in UI
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
    
    // Auto-hide error after 5 seconds
    setTimeout(hideError, 5000);
}

/**
 * Hide error message
 */
function hideError() {
    errorElement.style.display = "none";
}
