from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

from .models import (
    FunnyResponseRequest,
    FunnyResponseResponse,
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



@app.post("/generate-chat-suggestions", response_model=ChatSuggestionResponse)
async def generate_chat_suggestions(request: ChatSuggestionRequest):
    """
    Generate multiple AI suggestions for chat messages with different moods.
    
    Takes a chat message and returns multiple appropriate AI responses with different moods
    (encouraging, curious, playful) to enhance the social drawing game experience.
    The AI understands the game context and responds appropriately without revealing answers.
    """
    try:
        suggestions = await ai_service.generate_chat_suggestion(
            request.message,
            request.count,
            request.moods
        )
        
        return ChatSuggestionResponse(suggestions=suggestions)
    
    except Exception as e:
        logger.error(f"Error generating chat suggestions: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate chat suggestions"
        )

@app.post("/generate-words-by-topic")
async def generate_words_by_topic(request: dict):
    """
    Generate exactly 5 easy drawable words for a specific topic.
    
    Takes a topic and returns exactly 5 AI-generated words and 5 fallback words
    for the drawing game word selection. Words are optimized to be easy to draw.
    """
    try:
        topic = request.get("topic", "Objects")
        # Always generate exactly 5 words
        target_count = 5
        
        # Generate AI words using the existing word bank and potentially AI
        ai_words = []
        fallback_words = []
        
        # Get fallback words from the word bank (ensure exactly 5)
        if topic in ai_service.word_bank:
            available_fallback = ai_service.word_bank[topic]
            fallback_words = available_fallback[:target_count]
            # If we don't have enough, pad with random words from the same topic
            if len(fallback_words) < target_count:
                remaining = target_count - len(fallback_words)
                fallback_words.extend(available_fallback[-remaining:] if len(available_fallback) > target_count else available_fallback)
        else:
            # If topic not found, use Objects as fallback
            objects_words = ai_service.word_bank.get("Objects", [])
            fallback_words = objects_words[:target_count]
        
        # Ensure we have exactly 5 fallback words
        while len(fallback_words) < target_count and len(fallback_words) > 0:
            fallback_words.extend(fallback_words[:target_count - len(fallback_words)])
        fallback_words = fallback_words[:target_count]
        
        # Try to generate AI words if OpenRouter is available
        if ai_service.openrouter_api_key:
            try:
                # Generate exactly 5 easy drawable words
                ai_words = await ai_service.generate_multiple_words(topic, target_count)
                # Ensure we have exactly 5 AI words
                if len(ai_words) < target_count:
                    # Pad with fallback words if needed
                    needed = target_count - len(ai_words)
                    ai_words.extend(fallback_words[:needed])
                ai_words = ai_words[:target_count]
            except Exception as e:
                logger.error(f"Error generating AI words: {e}")
        
        return {
            "words": ai_words,
            "fallbackWords": fallback_words,
            "topic": topic
        }
    
    except Exception as e:
        logger.error(f"Error generating words by topic: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate words by topic"
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
