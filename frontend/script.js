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
    // Add reference for the new aspect ratio select
    const aspectRatioSelect = document.getElementById('aspectRatioSelect');

    // --- State ---
    let originalPrompt = '';
    let currentImageData = null; // Store the image data (e.g., base64 URL)

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
        } else {
            loadingIndicator.style.display = 'none';
            generateButton.disabled = false;
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

    // --- API Call Functions ---
    async function generateImage() {
        const prompt = promptInput.value.trim();
        // Get the selected aspect ratio
        const aspectRatio = aspectRatioSelect.value;

        if (!prompt) {
            showError('Please enter a prompt.');
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
                // Include both prompt and aspectRatio in the body
                body: JSON.stringify({
                    prompt: prompt,
                    aspectRatio: aspectRatio
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

    // Optional: Allow pressing Enter in textarea to generate (Shift+Enter for newline)
    promptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default newline insertion
            generateButton.click(); // Trigger generation
        }
    });

});