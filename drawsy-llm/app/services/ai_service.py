import random
import os
from typing import Dict, List, Tuple
import requests
import logging

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.openrouter_model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp")
        self.openrouter_base_url = "https://openrouter.ai/api/v1/chat/completions"
        
        if self.openrouter_api_key:
            logger.info(f"OpenRouter initialized with model: {self.openrouter_model}")
        else:
            logger.warning("No OpenRouter API key found, using fallback responses only")
        
        # Fallback word lists for different topics
        self.word_bank = {
            "Animals": [
                "elephant", "giraffe", "penguin", "kangaroo", "octopus",
                "butterfly", "dolphin", "tiger", "peacock", "flamingo",
                "hedgehog", "platypus", "chameleon", "rhinoceros", "hippopotamus"
            ],
            "Fruits": [
                "banana", "pineapple", "strawberry", "watermelon", "kiwi",
                "mango", "papaya", "pomegranate", "blueberry", "raspberry",
                "coconut", "avocado", "dragonfruit", "passionfruit", "lychee"
            ],
            "Objects": [
                "bicycle", "umbrella", "telescope", "typewriter", "compass",
                "calculator", "microscope", "harmonica", "accordion", "saxophone",
                "binoculars", "thermometer", "stethoscope", "periscope", "metronome"
            ],
            "Nature": [
                "mountain", "volcano", "waterfall", "rainbow", "lightning",
                "glacier", "desert", "forest", "canyon", "meadow",
                "archipelago", "peninsula", "geyser", "aurora", "stalactite"
            ],
            "Food": [
                "pizza", "hamburger", "spaghetti", "sushi", "tacos",
                "croissant", "pretzel", "pancake", "waffle", "burrito",
                "sandwich", "hotdog", "donut", "cupcake", "ice cream"
            ],
            "Sports": [
                "basketball", "football", "tennis", "swimming", "gymnastics",
                "volleyball", "badminton", "archery", "fencing", "wrestling",
                "bowling", "golf", "hockey", "skiing", "surfing"
            ]
        }
        
        # Funny response templates
        self.funny_responses = [
            "Close! But not quite there yet!",
            "Nice try! Keep those creative juices flowing!",
            "Ooh, interesting guess! But let's try again!",
            "You're thinking outside the box! I like it!",
            "Hmm, that's a unique perspective!",
            "Getting warmer... or maybe colder? 🤔",
            "I see where you're going with that!",
            "Creative thinking! But let's aim a bit differently!",
            "That would make for an interesting drawing too!",
            "Points for creativity! Now let's get the right answer!"
        ]

    async def generate_funny_response(self, guess: str, correct_word: str) -> str:
        """Generate a funny response to an incorrect guess."""
        
        if self.openrouter_api_key:
            try:
                response = await self._generate_openrouter_funny_response(guess, correct_word)
                if response:
                    return response
            except Exception as e:
                logger.error(f"OpenRouter funny response generation failed: {e}")
        
        # Fallback to predefined responses
        base_response = random.choice(self.funny_responses)
        
        # Add some context-aware humor
        if len(guess) > 10:
            return f"{base_response} That's quite a long word you're thinking of!"
        elif len(guess) == 1:
            return f"{base_response} Just one letter? Let's think bigger!"
        elif guess.lower() in correct_word.lower():
            return f"{base_response} You've got some letters right!"
        else:
            return base_response

    async def generate_word_suggestion(self, topic: str = None) -> Dict[str, str]:
        """Generate a word and topic for the drawing game."""
        
        if self.openrouter_api_key and topic:
            try:
                response = await self._generate_openrouter_word(topic)
                if response:
                    return response
            except Exception as e:
                logger.error(f"OpenRouter word generation failed: {e}")
        
        # Fallback to predefined word bank
        if topic and topic in self.word_bank:
            selected_topic = topic
            words = self.word_bank[topic]
        else:
            selected_topic = random.choice(list(self.word_bank.keys()))
            words = self.word_bank[selected_topic]
        
        selected_word = random.choice(words)
        
        return {
            "topic": selected_topic,
            "word": selected_word
        }

    async def generate_chat_suggestion(self, message: str, current_word: str = None) -> str:
        """Generate an AI suggestion for chat messages."""
        
        if self.openrouter_api_key:
            try:
                response = await self._generate_openrouter_chat_suggestion(message, current_word)
                if response:
                    return response
            except Exception as e:
                logger.error(f"OpenRouter chat suggestion failed: {e}")
        
        # Simple fallback suggestions
        message_lower = message.lower()
        
        if "looks like" in message_lower:
            return "I can see the resemblance!"
        elif "what is" in message_lower or "what's" in message_lower:
            return "Keep guessing! You're on the right track!"
        elif "hard" in message_lower or "difficult" in message_lower:
            return "Don't give up! Sometimes the best guesses come when you least expect them!"
        elif "good" in message_lower or "nice" in message_lower:
            return "Great observation! Art is all about perspective!"
        else:
            return ""

    async def _generate_openrouter_funny_response(self, guess: str, correct_word: str) -> str:
        """Generate funny response using OpenRouter with Gemini."""
        try:
            headers = {
                "Authorization": f"Bearer {self.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Scribbl AI Game"
            }
            
            prompt = f"""In a drawing guessing game, someone guessed "{guess}" but the correct answer is "{correct_word}".
Generate a funny, encouraging response that doesn't reveal the correct answer.
Keep it short, friendly, and humorous. Maximum 20 words."""
            
            payload = {
                "model": self.openrouter_model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 50,
                "temperature": 0.8
            }
            
            response = requests.post(self.openrouter_base_url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()
            
        except Exception as e:
            logger.error(f"OpenRouter funny response error: {e}")
            return None

    async def _generate_openrouter_word(self, topic: str) -> Dict[str, str]:
        """Generate word using OpenRouter with Gemini."""
        try:
            headers = {
                "Authorization": f"Bearer {self.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Scribbl AI Game"
            }
            
            prompt = f"""Generate a single word that would be good for a drawing game in the topic "{topic}".
The word should be:
- Not too easy, not too hard
- Drawable/visual
- Appropriate for all ages
- Between 4-12 letters

Respond with just the word, nothing else."""
            
            payload = {
                "model": self.openrouter_model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 20,
                "temperature": 0.7
            }
            
            response = requests.post(self.openrouter_base_url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            word = result["choices"][0]["message"]["content"].strip().lower()
            return {"topic": topic, "word": word}
            
        except Exception as e:
            logger.error(f"OpenRouter word generation error: {e}")
            return None

    async def _generate_openrouter_chat_suggestion(self, message: str, current_word: str = None) -> str:
        """Generate chat suggestion using OpenRouter with Gemini."""
        try:
            headers = {
                "Authorization": f"Bearer {self.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Scribbl AI Game"
            }
            
            context = f" The current word being drawn is '{current_word}'." if current_word else ""
            prompt = f"""Someone in a drawing game chat said: "{message}"{context}
Generate a brief, encouraging AI response that adds to the conversation.
Keep it under 15 words and don't reveal any answers.
If the message doesn't warrant a response, return empty string."""
            
            payload = {
                "model": self.openrouter_model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 30,
                "temperature": 0.7
            }
            
            response = requests.post(self.openrouter_base_url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()
            
        except Exception as e:
            logger.error(f"OpenRouter chat suggestion error: {e}")
            return ""
