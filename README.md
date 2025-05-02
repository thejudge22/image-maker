# AI Image Creator

A web application that uses various AI image and text generation APIs (Google AI, OpenAI) to generate and remix images from text prompts. It features a simple frontend to input prompts and view results, and a Node.js backend to handle API interactions. The entire application is containerized using Docker for easy setup and deployment.

## Features

*   **Multi-Provider Image Generation:** Generate images using either Google's Imagen model or OpenAI's DALL-E 3 and GPT Image 1 models.
*   **Provider and Model Selection:** Easily switch between Google and OpenAI providers in the UI. When using OpenAI, select between DALL-E 3 and GPT Image 1.
*   **Dynamic Aspect Ratio Selection:** Choose from supported aspect ratios that update based on the selected provider and OpenAI model.
*   **Prompt Remixing:** Enhance or rewrite prompts using Google's Gemini text model for potentially better image results (currently only supported for the Google provider).
*   **Simple UI:** Easy-to-use interface for entering prompts, viewing images, downloading, retrying, and remixing.
*   **Error Handling:** Improved frontend feedback for API errors, including specific messages for rate limits.
*   **Dockerized:** Fully containerized using Docker Compose for straightforward setup and deployment.

## Tech Stack

*   **Frontend:** HTML, CSS, JavaScript
*   **Backend:** Node.js, Express.js, Axios
*   **API:** Google AI (Gemini, Imagen), OpenAI (DALL-E 3, GPT Image 1)
*   **Web Server/Proxy:** Nginx
*   **Containerization:** Docker, Docker Compose

## Setup and Installation

1.  **Clone the Repository:**

    ```bash
    git clone <your-repository-url>
    cd image-maker
    ```

2.  **Configure Environment Variables:**

    *   Navigate to the `backend` directory: `cd backend`

    *   Copy the example environment file: `cp env.example .env`

    *   Edit the `.env` file with your actual credentials and desired model names. **You need API keys for the provider(s) you intend to use.** If a key is missing for a selected provider, image generation for that provider will fail.

    ```dotenv
    # Google API Configuration (Required for Google Image Generation and Remixing)
    GEMINI_API_KEY=YOUR_GOOGLE_AI_API_KEY # Replace with your key

    # OpenAI API Configuration (Required for OpenAI Image Generation)
    OPENAI_API_KEY=YOUR_OPENAI_API_KEY # Replace with your key

    # Google Model Names (Adjust if necessary - used when Google is selected)
    IMAGE_MODEL=imagen-3 # Or another available Imagen model
    REMIX_MODEL=gemini-1.5-flash # Or another available Gemini model

    # Server Configuration
    PORT=3000
    ```

    *   Go back to the root directory: `cd ..`

3.  **Build and Run with Docker Compose:**

    *   Make sure you have Docker and Docker Compose installed.
    *   From the root directory (`image-maker`), run:

    ```bash
    docker-compose up --build -d
    ```

    *   The `-d` flag runs the containers in detached mode. The `--build` flag ensures images are built if they don't exist or if Dockerfiles have changed.

## Usage

1.  Once the containers are running, open your web browser and navigate to:
    `http://localhost:25004`
    (Or replace `localhost` with your server's IP/domain if running remotely).

2.  Enter a text prompt describing the image you want to generate in the text area.

3.  Select the desired **Image Provider** (Google or OpenAI).

4.  If you selected OpenAI, choose the **OpenAI Model** (DALL-E 3 or GPT Image 1).

5.  Select the desired **Aspect Ratio** from the dropdown (options will update based on the selected provider and model).

6.  Click the "Generate Image" button.

7.  Wait for the image to be generated. The result will appear below the form.

8.  You can then:

    *   **Download:** Save the generated image.
    *   **Retry Prompt:** Generate a new image using the exact same prompt and settings.
    *   **Remix Prompt:** Use the Google Gemini model to rewrite your original prompt, then generate an image with the new prompt (only available when Google is selected as the provider).

## API Endpoints (Internal)

The frontend communicates with the backend via these endpoints, proxied through Nginx:

*   `POST /api/generate`: Accepts `{ prompt: string, aspectRatio: string, provider: string, openaiModel?: string }` and returns `{ success: boolean, imageData: string (base64 data URL) }` or an error.
*   `POST /api/remix`: Accepts `{ prompt: string }` and returns `{ success: boolean, remixedPrompt: string }` or an error. (Currently only uses Google's API).

## Configuration

*   **API Keys & Models:** Configured server-side in `backend/.env`. **API keys should NOT be stored in the frontend/browser.** You must add your `GEMINI_API_KEY` and `OPENAI_API_KEY` to `backend/.env` to use the respective providers.
*   **Backend Port:** Defined by the `PORT` variable in `backend/.env` (default is 3000). Nginx proxies requests to this port.
*   **Frontend Port:** Exposed on the host machine via the `ports` mapping in `docker-compose.yml` (e.g., `25004:80`).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Notes on Remixing

The `Remix Prompt` feature currently only utilizes Google's Gemini API. If the OpenAI provider is selected, this feature will inform the user that it is only supported for Google.

## Next Steps

*   Add support for OpenAI text models for the Remix feature.
*   Explore adding more configurable parameters (e.g., image quality, number of images).
*   Improve frontend styling and responsiveness.
