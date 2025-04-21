// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// --- Configuration ---
const apiKey = process.env.GEMINI_API_KEY;
const imageModel = process.env.IMAGE_MODEL;
const remixModel = process.env.REMIX_MODEL;

if (!apiKey) {
    console.error("ERROR: GEMINI_API_KEY is not set in the .env file.");
    process.exit(1); // Stop the server if the API key is missing
}
if (!imageModel) {
    console.warn("WARN: IMAGE_MODEL is not set in the .env file. Using default or expecting it later.");
    // Potentially set a default or handle this case as needed
}
if (!remixModel) {
    console.warn("WARN: REMIX_MODEL is not set in the .env file. Using default or expecting it later.");
    // Potentially set a default or handle this case as needed
}


// --- Middleware ---
// Parse JSON request bodies
app.use(express.json());

// Basic logging middleware (optional)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- API Endpoints ---

// POST /api/generate - Endpoint to generate an image
app.post('/api/generate', async (req, res) => {
    // Destructure prompt and aspectRatio from the request body
    const { prompt, aspectRatio } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }
    if (!imageModel) {
        console.error("ERROR: IMAGE_MODEL is not set in the .env file.");
        return res.status(500).json({ success: false, error: 'Image model configuration missing.' });
    }
    if (!apiKey) {
        // This check is already done at startup, but good practice here too
        console.error("ERROR: GEMINI_API_KEY is missing.");
        return res.status(500).json({ success: false, error: 'API key configuration missing.' });
    }

    console.log(`Received generation request for prompt: "${prompt}", Aspect Ratio: ${aspectRatio || 'default (1:1)'}`);

    try {
        // Construct the API endpoint URL
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:predict?key=${apiKey}`;

        // Construct the request payload
        const payload = {
            instances: [
                { prompt: prompt }
            ],
            parameters: {
                // Default to 1 image for simplicity in this example
                sampleCount: 1,
                // Include aspectRatio if provided, otherwise Google API uses its default (1:1)
                ...(aspectRatio && { aspectRatio: aspectRatio }),
                // Default personGeneration setting (can be made configurable later)
                personGeneration: "ALLOW_ADULT"
            }
        };

        console.log("Sending request to Google Imagen API:", apiUrl);
        // console.log("Payload:", JSON.stringify(payload, null, 2)); // Uncomment for debugging

        // Make the POST request using axios
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // --- Process the response ---
        // IMPORTANT: Adjust the following lines based on the *actual* response structure
        // from the Google Imagen API. This is a common pattern but might differ.
        // Check Google's documentation for the exact structure.
        if (response.data && response.data.predictions && response.data.predictions.length > 0 && response.data.predictions[0].bytesBase64Encoded) {
            const base64ImageData = response.data.predictions[0].bytesBase64Encoded;
            const imageDataUrl = `data:image/png;base64,${base64ImageData}`; // Assuming PNG format

            console.log("Successfully received image data from API.");
            res.json({ success: true, imageData: imageDataUrl });
        } else {
            console.error("Unexpected response structure from Google API:", response.data);
            throw new Error('Invalid response format received from image generation API.');
        }

    } catch (error) {
        console.error("Error calling Google AI Image Generation API:");
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
            console.error("Headers:", error.response.headers);
            // Try to extract a more specific error message from Google's response
            const googleError = error.response.data?.error?.message || 'Failed to generate image due to API error.';
            res.status(error.response.status || 500).json({ success: false, error: googleError });
        } else if (error.request) {
            // The request was made but no response was received
            console.error("Request Error:", error.request);
            res.status(500).json({ success: false, error: 'No response received from image generation service.' });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Error:", error.message);
            res.status(500).json({ success: false, error: 'Failed to generate image.' });
        }
    }
});

// POST /api/remix - Endpoint to remix a prompt
app.post('/api/remix', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required for remixing.' });
    }

    console.log(`Received remix request for prompt: "${prompt}"`);

    try {
        // --- TODO: Implement Google AI Text Generation API Call (for remixing) ---
        // 1. Construct the correct API endpoint URL for the specified remixModel (e.g., Gemini).
        // 2. Construct the request payload. This will involve the original prompt and instructions
        //    for the model to rewrite or enhance it for image generation. Example payload structure:
        //    {
        //      "contents": [{
        //        "parts": [{
        //          "text": `Rewrite the following image prompt to be more descriptive and visually appealing, suitable for an AI image generator:\n\n"${prompt}"`
        //        }]
        //      }]
        //      // Add generationConfig if needed (temperature, max tokens, etc.)
        //    }
        // 3. Make the POST request using axios to the Gemini API endpoint:
        //    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${remixModel}:generateContent?key=${apiKey}`,
        //       { /* payload */ },
        //       { headers: { 'Content-Type': 'application/json' } }
        //    );
        // 4. Process the response: Extract the generated text (the remixed prompt).
        //    Check Google's API documentation for the response structure (e.g., response.data.candidates[0].content.parts[0].text).

        console.log(`Placeholder: Simulating prompt remix for: "${prompt}"`);
        // Simulate a successful response for now
        const simulatedRemixedPrompt = `An enhanced, visually stunning version of: ${prompt}`;

        res.json({ success: true, remixedPrompt: simulatedRemixedPrompt }); // Replace with actual data

    } catch (error) {
        console.error("Error calling Google AI Text Generation API for remix:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: 'Failed to remix prompt.' });
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