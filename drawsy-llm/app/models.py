from pydantic import BaseModel
from typing import Optional

class FunnyResponseRequest(BaseModel):
    guess: str
    correctWord: str

class FunnyResponseResponse(BaseModel):
    funnyResponse: str

class WordGenerationRequest(BaseModel):
    topic: Optional[str] = None

class WordGenerationResponse(BaseModel):
    topic: str
    word: str

class ChatSuggestionRequest(BaseModel):
    message: str
    currentWord: Optional[str] = None

class ChatSuggestionResponse(BaseModel):
    suggestion: str

class HealthResponse(BaseModel):
    status: str
    message: str
