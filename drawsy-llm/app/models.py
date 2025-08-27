from pydantic import BaseModel
from typing import Optional

class FunnyResponseRequest(BaseModel):
    guess: str
    correctWord: str

class FunnyResponseResponse(BaseModel):
    funnyResponse: str



class ChatSuggestionRequest(BaseModel):
    message: str
    count: Optional[int] = 3
    moods: Optional[list] = ['encouraging', 'curious', 'playful']

class ChatSuggestionResponse(BaseModel):
    suggestions: list[str]

class HealthResponse(BaseModel):
    status: str
    message: str
