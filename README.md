# Gemini Image Generator

A web application that uses Google's Gemini and Imagen APIs to generate images from text prompts. It features a simple frontend to input prompts and view results, and a Node.js backend to handle API interactions. The entire application is containerized using Docker for easy setup and deployment.

## Features

* **Image Generation:** Generate images based on user-provided text prompts using Google's Imagen model.
* **Aspect Ratio Selection:** Choose from common aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4) for generated images.
* **Prompt Remixing:** Enhance or rewrite prompts using Google's Gemini text model for potentially better image results.
* **Simple UI:** Easy-to-use interface for entering prompts, viewing images, downloading, retrying, and remixing.
* **Dockerized:** Fully containerized using Docker Compose for straightforward setup and deployment.

## Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js, Express.js, Axios
* **API:** Google AI (Gemini for remixing, Imagen for image generation)
* **Web Server/Proxy:** Nginx
* **Containerization:** Docker, Docker Compose

## Setup and Installation

1. **Clone the Repository:**
   
   ```bash
   git clone <your-repository-url>
   cd image-maker
   ```

2. **Configure Environment Variables:**
   
   * Navigate to the `backend` directory: `cd backend`
   
   * Copy the example environment file: `cp env.example .env`
   
   * Edit the `.env` file with your actual credentials and desired model names:
     
     ```dotenv
     # Gemini API Configuration
     GEMINI_API_KEY=YOUR_GOOGLE_AI_API_KEY # Replace with your key
     
     # Model Names (Adjust if necessary)
     IMAGE_MODEL=imagen-3 # Or another available Imagen model
     REMIX_MODEL=gemini-1.5-flash # Or another available Gemini model
     
     # Server Configuration
     PORT=3000
     ```
   
   * Go back to the root directory: `cd ..`

3. **Build and Run with Docker Compose:**
   
   * Make sure you have Docker and Docker Compose installed.
   * From the root directory (`image-maker`), run:
     
     ```bash
     docker-compose up --build -d
     ```
   * The `-d` flag runs the containers in detached mode. The `--build` flag ensures images are built if they don't exist or if Dockerfiles have changed.

## Usage

1. Once the containers are running, open your web browser and navigate to:
   `http://localhost:25004`
   (Or replace `localhost` with your server's IP/domain if running remotely).

2. Enter a text prompt describing the image you want to generate in the text area.

3. Select the desired aspect ratio from the dropdown.

4. Click the "Generate Image" button.

5. Wait for the image to be generated. The result will appear below the form.

6. You can then:
   
   * **Download:** Save the generated image.
   * **Retry Prompt:** Generate a new image using the exact same prompt and settings.
   * **Remix Prompt:** Use the Gemini model to rewrite your original prompt, then generate an image with the new prompt.

## API Endpoints (Internal)

The frontend communicates with the backend via these endpoints, proxied through Nginx:

* `POST /api/generate`: Accepts `{ prompt: string, aspectRatio: string }` and returns `{ success: boolean, imageData: string (base64 data URL) }` or an error.
* `POST /api/remix`: Accepts `{ prompt: string }` and returns `{ success: boolean, remixedPrompt: string }` or an error.

## Configuration

* **Backend Port:** Defined by the `PORT` variable in `backend/.env` (default is 3000). Nginx proxies requests to this port.
* **Frontend Port:** Exposed on the host machine via the `ports` mapping in `docker-compose.yml` (e.g., `25004:80`).
* **API Keys & Models:** Configured in `backend/.env`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.