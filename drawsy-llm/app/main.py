from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

from .models import (
    FunnyResponseRequest,
    FunnyResponseResponse,
    WordGenerationRequest,
    WordGenerationResponse,
    ChatSuggestionRequest,
    ChatSuggestionResponse,
    HealthResponse
)
from .services.ai_service import AIService

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Drawsy - LLM Service",
    description="AI service for generating funny responses, word suggestions, and chat interactions",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS - Allow all origins for testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Initialize AI service
ai_service = AIService()

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        message="Drawsy LLM Service is running!"
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check endpoint."""
    return HealthResponse(
        status="healthy",
        message="All systems operational"
    )

@app.post("/generate-funny-response", response_model=FunnyResponseResponse)
async def generate_funny_response(request: FunnyResponseRequest):
    """
    Generate a funny response to an incorrect guess.
    
    This endpoint takes a user's guess and the correct word,
    then returns a humorous, encouraging response that doesn't
    reveal the correct answer.
    """
    try:
        funny_response = await ai_service.generate_funny_response(
            request.guess,
            request.correctWord
        )
        
        return FunnyResponseResponse(funnyResponse=funny_response)
    
    except Exception as e:
        logger.error(f"Error generating funny response: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate funny response"
        )

@app.post("/generate-word", response_model=WordGenerationResponse)
async def generate_word(request: WordGenerationRequest):
    """
    Generate a word and topic for the drawing game.
    
    Optionally takes a topic parameter. If no topic is provided,
    a random topic will be selected.
    """
    try:
        word_data = await ai_service.generate_word_suggestion(request.topic)
        
        return WordGenerationResponse(
            topic=word_data["topic"],
            word=word_data["word"]
        )
    
    except Exception as e:
        logger.error(f"Error generating word: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate word"
        )

@app.post("/generate-chat-suggestion", response_model=ChatSuggestionResponse)
async def generate_chat_suggestion(request: ChatSuggestionRequest):
    """
    Generate an AI suggestion for chat messages.
    
    Takes a chat message and optionally the current word being drawn,
    then returns an appropriate AI response to add to the conversation.
    """
    try:
        suggestion = await ai_service.generate_chat_suggestion(
            request.message,
            request.currentWord
        )
        
        return ChatSuggestionResponse(suggestion=suggestion)
    
    except Exception as e:
        logger.error(f"Error generating chat suggestion: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate chat suggestion"
        )

@app.get("/word-topics")
async def get_word_topics():
    """
    Get available word topics.
    
    Returns a list of available topics that can be used
    for word generation.
    """
    return {
        "topics": list(ai_service.word_bank.keys())
    }

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )
