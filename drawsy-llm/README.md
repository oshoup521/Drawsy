
# Drawsy LLM Microservice

The Drawsy LLM microservice provides AI-powered features for the Drawsy game, such as generating funny responses, word suggestions, and chat enhancements. Built with FastAPI and Python, it integrates with OpenRouter (or uses fallback logic) and supports easy extension.

## Features
- FastAPI-based REST endpoints for:
   - Generating funny responses to player guesses
   - Suggesting drawing words by topic
   - Chat suggestions
- OpenRouter integration for advanced AI (Gemini, GPT, etc.)
- Fallback logic for offline/limited environments
- CORS support for local and remote development
- Optional Redis caching

## Folder Structure
```
drawsy-llm/
├── app/
│   ├── main.py         # FastAPI app entry point
│   ├── models.py       # Pydantic models
│   └── services/
│       └── ai_service.py # AI logic (OpenRouter + fallback)
├── requirements.txt    # Python dependencies
├── env.example         # Example environment variables
```

## Getting Started

### 1. Create and activate a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment variables
Copy `.env.example` to `.env` and update values as needed:
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemini-2.0-flash-exp
PORT=8000
HOST=0.0.0.0
REDIS_URL=redis://localhost:6379
```

### 4. Run the service
```bash
python -m app.main
```

## API Endpoints
- `/generate-funny-response` (POST): Generate a funny response to a guess
- `/generate-words-by-topic` (POST): Generate multiple words for a specific topic
- `/generate-chat-suggestions` (POST): Generate multiple mood-based chat suggestions
- `/health` (GET): Health check

## Technologies Used
- FastAPI
- Pydantic
- OpenRouter (AI integration)
- Redis (optional)
- Python 3.10+

## Contribution
Contributions are welcome! Please open issues or submit pull requests for improvements or bug fixes.

## License
This project is licensed under the MIT License. See the root `LICENSE` file for details.
