document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const promptInput = document.getElementById('promptInput');
    const generateButton = document.getElementById('generateButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorArea = document.getElementById('errorArea');
    const resultArea = document.getElementById('resultArea');
    const generatedImage = document.getElementById('generatedImage');
    const downloadButton = document.getElementById('downloadButton');
    const retryButton = document.getElementById('retryButton');
    const remixButton = document.getElementById('remixButton');
    const buttonControls = document.getElementById('buttonControls'); // Container for result buttons
    const aspectRatioSelect = document.getElementById('aspectRatioSelect');
    const providerSelect = document.getElementById('providerSelect'); // Added provider select
    const openaiModelGroup = document.getElementById('openaiModelGroup'); // Added OpenAI model group div
    const openaiModelSelect = document.getElementById('openaiModelSelect'); // Added OpenAI model select

    // --- State ---
    let originalPrompt = '';
    let currentImageData = null; // Store the image data (e.g., base64 URL)

    // Define supported aspect ratios per provider/model
    const supportedAspectRatios = {
        google: [
            { value: '1:1', text: '1:1 (Square)' },
            { value: '16:9', text: '16:9 (Widescreen)' },
            { value: '9:16', text: '9:16 (Tall)' },
            { value: '4:3', text: '4:3 (Standard)' }, // Backend might map this, but include for completeness
            { value: '3:4', text: '3:4 (Portrait)' } // Backend might map this, but include for completeness
        ],
        openai: {
            'dall-e-3': [
                { value: '1:1', text: '1:1 (Square - 1024x1024)' },
                { value: '16:9', text: '16:9 (Widescreen - 1792x1024)' },
                { value: '9:16', text: '9:16 (Tall - 1024x1792)' }
            ],
            'gpt-image-1': [
                 { value: '1:1', text: '1:1 (Square - 1024x1024)' },
                 { value: '16:9', text: '16:9 (Widescreen - 1536x1024)' },
                 { value: '9:16', text: '9:16 (Tall - 1024x1536)' }
            ]
        }
    };

    // --- UI State Functions ---
    function showLoading(isLoading, message = 'Generating image... Please wait.') {
        if (isLoading) {
            loadingIndicator.querySelector('span').textContent = message;
            loadingIndicator.style.display = 'flex';
            errorArea.style.display = 'none';
            resultArea.style.display = 'none';
            generateButton.disabled = true;
            retryButton.disabled = true;
            remixButton.disabled = true;
            downloadButton.disabled = true;
             // Disable provider and model selects during loading
            providerSelect.disabled = true;
            openaiModelSelect.disabled = true;

        } else {
            loadingIndicator.style.display = 'none';
            generateButton.disabled = false;
             // Re-enable provider and model selects
            providerSelect.disabled = false;
            openaiModelSelect.disabled = false;

            // Re-enable result buttons only if there's a result visible
            const resultVisible = resultArea.style.display !== 'none';
            retryButton.disabled = !resultVisible;
            remixButton.disabled = !resultVisible;
            downloadButton.disabled = !resultVisible || !currentImageData;
        }
    }

    function showError(message) {
        errorArea.textContent = `Error: ${message}`;
        errorArea.style.display = 'block';
        resultArea.style.display = 'none';
        showLoading(false); // Ensure loading is hidden
    }

    function showResult(imageData) {
        currentImageData = imageData; // Store for download
        generatedImage.src = imageData;
        resultArea.style.display = 'block';
        errorArea.style.display = 'none';
        showLoading(false); // Ensure loading is hidden and buttons are re-enabled
    }

    function clearStatus() {
        errorArea.style.display = 'none';
        errorArea.textContent = '';
        loadingIndicator.style.display = 'none';
        // Don't hide result area here, only on new generation/error
    }

     // --- Aspect Ratio Control ---
    function updateAspectRatioOptions() {
        const currentProvider = providerSelect.value;
        const currentOpenAIModel = openaiModelSelect.value;

        // Clear existing options
        aspectRatioSelect.innerHTML = '';

        let optionsToRender = [];

        if (currentProvider === 'google') {
            optionsToRender = supportedAspectRatios.google;
        } else if (currentProvider === 'openai') {
            optionsToRender = supportedAspectRatios.openai[currentOpenAIModel] || [];
        }

        // Populate dropdown with new options
        optionsToRender.forEach(ratio => {
            const option = document.createElement('option');
            option.value = ratio.value;
            option.textContent = ratio.text;
            aspectRatioSelect.appendChild(option);
        });
    }

    // --- API Call Functions ---
    async function generateImage() {
        const prompt = promptInput.value.trim();
        const aspectRatio = aspectRatioSelect.value;
        const selectedProvider = providerSelect.value; // Get selected provider
        const selectedOpenAIModel = openaiModelSelect.value; // Get selected OpenAI model

        if (!prompt) {
            showError('Please enter a prompt.');
            return;
        }
         if (selectedProvider === 'openai' && !selectedOpenAIModel) {
             showError('Please select an OpenAI model.');
             return;
         }

        originalPrompt = prompt; // Store the prompt used for this generation
        clearStatus();
        showLoading(true);
        currentImageData = null; // Reset image data

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Include prompt, aspectRatio, provider, and openaiModel in the body
                body: JSON.stringify({
                    prompt: prompt,
                    aspectRatio: aspectRatio,
                    provider: selectedProvider,
                    openaiModel: selectedProvider === 'openai' ? selectedOpenAIModel : undefined // Only include openaiModel if provider is openai
                })
            });

            // Check for specific HTTP status codes first
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
            }

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            showResult(data.imageData);

        } catch (error) {
            console.error('Generation failed:', error);
            showError(error.message || 'An unknown error occurred during generation.');
        } finally {
            showLoading(false);
        }
    }

    async function remixPrompt() {
        // Note: Remix currently only supports Google's API
        if (providerSelect.value !== 'google') {
             showError('Remix is currently only supported for the Google provider.');
             return;
        }

        if (!originalPrompt) {
            showError('No prompt available to remix. Generate an image first or use the retry button.');
            return;
        }

        clearStatus();
        showLoading(true, 'Remixing prompt...'); // Custom loading message

        try {
            const response = await fetch('/api/remix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: originalPrompt }) // Send the original prompt for remixing
            });

            // Check for specific HTTP status codes first
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
            }

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            promptInput.value = data.remixedPrompt; // Update the input field with the remixed prompt
            resultArea.style.display = 'none'; // Hide old result after remixing
            currentImageData = null; // Clear old image data
            originalPrompt = data.remixedPrompt; // Update original prompt to the remixed one for potential retry
            alert('Prompt remixed! You can now generate an image with the new prompt.'); // Simple feedback

        } catch (error) {
            console.error('Remix failed:', error);
            showError(error.message || 'An unknown error occurred during remixing.');
        } finally {
            showLoading(false);
        }
    }

    // --- Event Listeners ---
    generateButton.addEventListener('click', generateImage);

    retryButton.addEventListener('click', () => {
        if (originalPrompt) {
            promptInput.value = originalPrompt; // Restore the original prompt
            generateImage(); // Start generation with the restored prompt
        } else {
            showError('No previous prompt to retry.');
        }
    });

    remixButton.addEventListener('click', remixPrompt);

    downloadButton.addEventListener('click', () => {
        if (!currentImageData) {
            showError('No image data available to download.');
            return;
        }

        try {
            const link = document.createElement('a');
            link.href = currentImageData; // Assumes imageData is a data URL

            // Create a filename (optional, improve later if needed)
            const filename = (originalPrompt.substring(0, 30) || 'generated_image').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
            link.download = filename;

            // Append to body, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            showError('Failed to initiate download.');
        }
    });

    // Listen for changes on the provider select dropdown
    providerSelect.addEventListener('change', (event) => {
        if (event.target.value === 'openai') {
            openaiModelGroup.style.display = 'block'; // Show OpenAI model select
        } else {
            openaiModelGroup.style.display = 'none'; // Hide OpenAI model select
        }
        // Update aspect ratio options when provider changes
        updateAspectRatioOptions();
    });

     // Listen for changes on the OpenAI model select dropdown
    openaiModelSelect.addEventListener('change', () => {
         // Update aspect ratio options when OpenAI model changes (only relevant if provider is OpenAI)
        updateAspectRatioOptions();
    });

    // Optional: Allow pressing Enter in textarea to generate (Shift+Enter for newline)
    promptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default newline insertion
            generateButton.click(); // Trigger generation
        }
    });

    // Initial state setup
    // Hide OpenAI model select on load if Google is default
    if (providerSelect.value !== 'openai') {
         openaiModelGroup.style.display = 'none';
    }
    // Populate initial aspect ratio options based on default selection
    updateAspectRatioOptions();

});
