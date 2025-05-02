// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// --- Configuration ---
const googleApiKey = process.env.GEMINI_API_KEY; // Renamed for clarity
const googleImageModel = process.env.IMAGE_MODEL; // Renamed for clarity
const googleRemixModel = process.env.REMIX_MODEL; // Renamed for clarity
const openaiApiKey = process.env.OPENAI_API_KEY;

// --- API Key Checks ---
if (!googleApiKey) {
    console.warn("WARN: GEMINI_API_KEY is not set in the .env file. Google image generation or remixing will not work.");
}
if (!openaiApiKey) {
    console.warn("WARN: OPENAI_API_KEY is not set in the .env file. OpenAI image generation will not work.");
}

// Check if at least one image generation API key is set (remix is secondary)
if (!googleApiKey && !openaiApiKey) {
    console.error("FATAL ERROR: Neither GEMINI_API_KEY nor OPENAI_API_KEY is set. At least one is required for image generation.");
    process.exit(1); // Stop the server if no relevant API keys are missing
}

// --- Model Name Checks (now non-blocking warnings) ---
// We moved key existence check above, these are just warnings for clarity
if (!googleImageModel && googleApiKey) {
    console.warn("WARN: IMAGE_MODEL is not set in the .env file. Defaulting Google image model or expecting it later.");
}
if (!googleRemixModel && googleApiKey) {
    console.warn("WARN: REMIX_MODEL is not set in the .env file. Defaulting Google remix model or expecting it later.");
}


// --- Middleware ---
// Parse JSON request bodies
app.use(express.json());

// Basic logging middleware (optional)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Helper function to map aspect ratio to OpenAI sizes ---
function aspectRatioToOpenAI(ratio, model) {
    // DALL-E 3 sizes: 1024x1024, 1792x1024, 1024x1792
    // gpt-image-1 sizes: 1024x1024, 1536x1024, 1024x1536
    // Defaulting 4:3 and 3:4 to 1024x1024 as they don't have direct matches
    switch (ratio) {
        case '1:1':
            return '1024x1024';
        case '16:9':
            return (model === 'dall-e-3' ? '1792x1024' : '1536x1024');
        case '9:16':
            return (model === 'dall-e-3' ? '1024x1792' : '1024x1536');
        case '4:3':
        case '3:4':
        default:
            return '1024x1024'; // Default to square for others
    }
}


// --- API Endpoints ---

// POST /api/generate - Endpoint to generate an image
app.post('/api/generate', async (req, res) => {
    // Destructure prompt, aspectRatio, provider, and openaiModel from the request body
    const { prompt, aspectRatio, provider, openaiModel } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }

    // Determine the provider, default to 'google' if not specified
    const selectedProvider = provider || 'google';

    console.log(`Received generation request for prompt: "${prompt}", Aspect Ratio: ${aspectRatio || 'default (1:1)'}, Provider: ${selectedProvider}, OpenAI Model: ${openaiModel}`);

    try {
        let imageDataUrl = null;

        if (selectedProvider === 'google') {
            if (!googleApiKey || !googleImageModel) {
                return res.status(500).json({ success: false, error: 'Google API key or image model configuration missing.' });
            }
            // --- Google Imagen API Call Logic ---
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${googleImageModel}:predict?key=${googleApiKey}`;

            const payload = {
                instances: [
                    { prompt: prompt }
                ],
                parameters: {
                    sampleCount: 1,
                    ...(aspectRatio && { aspectRatio: aspectRatio }),
                    personGeneration: "ALLOW_ADULT"
                }
            };

            console.log("Sending request to Google Imagen API:", apiUrl);

            const response = await axios.post(apiUrl, payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // --- Process Google Response ---
            if (response.data && response.data.predictions && response.data.predictions.length > 0 && response.data.predictions[0].bytesBase64Encoded) {
                imageDataUrl = `data:image/png;base64,${response.data.predictions[0].bytesBase64Encoded}`;
                console.log("Successfully received image data from Google API.");
            } else {
                console.error("Unexpected response structure from Google API:", response.data);
                throw new Error('Invalid response format received from Google image generation API.');
            }

        } else if (selectedProvider === 'openai') {
            if (!openaiApiKey) {
                 return res.status(500).json({ success: false, error: 'OpenAI API key configuration missing.' });
            }
            if (!openaiModel) {
                 return res.status(400).json({ success: false, error: 'OpenAI model is required when using OpenAI provider.' });
            }

            // --- OpenAI Image API Call Logic ---
            let openaiApiUrl;
            let openaiPayload;
            const responseFormat = "b64_json"; // Request base64 data

            // Determine endpoint and payload based on model
            if (openaiModel === 'dall-e-3') {
                openaiApiUrl = "https://api.openai.com/v1/images/generations";
                openaiPayload = {
                    model: openaiModel,
                    prompt: prompt,
                    size: aspectRatioToOpenAI(aspectRatio, openaiModel), // Use helper
                    n: 1,
                    response_format: responseFormat,
                    quality: "standard" // Default quality for DALL-E 3
                };
             } else if (openaiModel === 'gpt-image-1') {
                openaiApiUrl = "https://api.openai.com/v1/images"; // Different endpoint for gpt-image-1
                 openaiPayload = {
                    prompt: prompt,
                    size: aspectRatioToOpenAI(aspectRatio, openaiModel), // Use helper
                    n: 1,
                    response_format: responseFormat,
                    quality: "auto" // Default quality for gpt-image-1
                }; // As per CURL, model is not explicitly in payload for gpt-image-1 endpoint.
             } else {
                 return res.status(400).json({ success: false, error: `Unsupported OpenAI model: ${openaiModel}` });
             }

            console.log("Sending request to OpenAI API:", openaiApiUrl, "with payload:", openaiPayload);

            // Make the POST request using axios
            const response = await axios.post(openaiApiUrl, openaiPayload, {
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            // --- Process OpenAI Response (Expecting b64_json structure) ---
            if (response.data && response.data.data && response.data.data.length > 0 && response.data.data[0].b64_json) {
                 imageDataUrl = `data:image/png;base64,${response.data.data[0].b64_json}`;
                 console.log("Successfully received image data from OpenAI API.");
            } else {
                 console.error("Unexpected response structure from OpenAI API:");
                 console.error(JSON.stringify(response.data, null, 2)); // Log the full response for debugging
                 throw new Error('Invalid response format received from OpenAI image generation API.');
            }

        } else {
             // Should not happen with default, but as a fallback
            return res.status(400).json({ success: false, error: `Unsupported provider: ${selectedProvider}` });
        }

        // --- Send the final image data URL back to the frontend ---
        if (imageDataUrl) {
            res.json({ success: true, imageData: imageDataUrl });
        } else {
             // This case should ideally be caught by earlier error handling,
             // but as a safeguard.
            throw new Error('Image data could not be retrieved or processed.');
        }

    } catch (error) {
        console.error("Error during image generation:", error);
        // Centralized error handling
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
            console.error("Headers:", error.response.headers);
            // Attempt to extract a more specific error message from the API response
            const apiError = error.response.data?.error?.message || error.message || 'An API error occurred.';
            res.status(error.response.status || 500).json({ success: false, error: apiError });
        } else if (error.request) {
            console.error("Request Error:", error.request);
             res.status(500).json({ success: false, error: 'No response received from the image generation service.' });
        } else {
            console.error("Error:", error.message);
            res.status(500).json({ success: false, error: error.message || 'An unknown error occurred.' });
        }
    }
});

// POST /api/remix - Endpoint to remix a prompt
// This endpoint currently only supports Google's remix model.
app.post('/api/remix', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required for remixing.' });
    }
    if (!googleApiKey || !googleRemixModel) {
         return res.status(500).json({ success: false, error: 'Google API key or remix model configuration missing for remixing.' });
    }

    console.log(`Received remix request for prompt: "${prompt}"`);

    try {
        // Construct the API endpoint URL using the provided structure
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${googleRemixModel}:generateContent?key=${googleApiKey}`;

        // Construct the request payload using the provided structure
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: `Rewrite the following image prompt to be more descriptive and visually appealing, suitable for an AI image generator, keeping the core subject matter:

"${prompt}"`
                        }
                    ]
                }
            ]
            // Optional: Add generationConfig if needed (temperature, max tokens, etc.)
            // generationConfig: {
            //     temperature: 0.7,
            //     maxOutputTokens: 200,
            // }
        };

        console.log("Sending remix request to Google Gemini API:", apiUrl);

        // Make the POST request using axios
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // --- Process the response ---
        // Extract the generated text using the provided path: response.data.candidates[0].content.parts[0].text
        if (response.data && response.data.candidates && response.data.candidates.length > 0 && response.data.candidates[0].content && response.data.candidates[0].content.parts && response.data.candidates[0].content.parts.length > 0 && response.data.candidates[0].content.parts[0].text) {
            const remixedPrompt = response.data.candidates[0].content.parts[0].text;

            console.log("Successfully received remixed prompt from API.");
            res.json({ success: true, remixedPrompt: remixedPrompt });
        } else {
            console.error("Unexpected response structure from Google API (remix):");
            console.error(JSON.stringify(response.data, null, 2)); // Log the full response for debugging
            throw new Error('Invalid response format received from prompt remix API.');
        }

    } catch (error) {
        console.error("Error calling Google AI Text Generation API for remix:", error.response ? error.response.data : error.message);
        // Centralized error handling for remix
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
            console.error("Headers:", error.response.headers);
            const googleError = error.response.data?.error?.message || error.message || 'Failed to remix prompt due to API error.';
            res.status(error.response.status || 500).json({ success: false, error: googleError });
        } else if (error.request) {
            console.error("Request Error:", error.request);
            res.status(500).json({ success: false, error: 'No response received from prompt remix service.' });
        } else {
            console.error("Error:", error.message);
            res.status(500).json({ success: false, error: error.message || 'An unknown error occurred during remixing.' });
        }
    }
});

// --- Error Handling ---
// Basic 404 handler for undefined routes
app.use((req, res, next) => {
    res.status(404).json({ success: false, error: 'Not Found' });
});

// Basic error handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// --- Server Start ---
app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
});
