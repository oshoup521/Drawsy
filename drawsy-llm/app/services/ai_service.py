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

    async def generate_chat_suggestion(self, message: str, count: int = 3, moods: List[str] = None) -> List[str]:
        """Generate multiple AI suggestions for chat messages with different moods."""
        
        if moods is None:
            moods = ['encouraging', 'curious', 'playful']
        
        suggestions = []
        
        if self.openrouter_api_key:
            try:
                for i, mood in enumerate(moods[:count]):
                    response = await self._generate_openrouter_chat_suggestion(message, mood)
                    if response:
                        suggestions.append(response)
                    else:
                        # Fallback if OpenRouter fails for this mood
                        suggestions.append(self._get_fallback_suggestion(message, mood))
                
                if suggestions:
                    return suggestions
            except Exception as e:
                logger.error(f"OpenRouter chat suggestion failed: {e}")
        
        # Fallback suggestions with different moods
        for mood in moods[:count]:
            suggestions.append(self._get_fallback_suggestion(message, mood))
        
        return suggestions
    
    def _get_fallback_suggestion(self, message: str, mood: str) -> str:
        """Generate fallback suggestions based on mood and message context."""
        message_lower = message.lower()
        
        # Context-aware responses based on common drawing game scenarios
        encouraging_responses = {
            'drawing_progress': ["Keep up the amazing drawing!", "You're doing great!", "Nice work so far!"],
            'guessing': ["Great guess!", "Keep trying!", "You're on the right track!"],
            'general': ["Looking good!", "Great effort!", "Keep it up!"]
        }
        
        curious_responses = {
            'drawing_progress': ["Interesting shape!", "What could that be?", "I wonder what you're creating?"],
            'guessing': ["Hmm, what is it?", "That's intriguing!", "Curious to see more!"],
            'general': ["What's happening here?", "This looks interesting!", "Tell me more!"]
        }
        
        playful_responses = {
            'drawing_progress': ["Ooh, mystery drawing!", "Plot twist incoming!", "This is getting exciting!"],
            'guessing': ["The suspense is real!", "Fun guessing game!", "What a puzzle!"],
            'general': ["Fun times ahead!", "This is awesome!", "Love the energy!"]
        }
        
        # Determine context from message
        context = 'general'
        if any(word in message_lower for word in ['draw', 'drawing', 'sketch', 'line', 'shape']):
            context = 'drawing_progress'
        elif any(word in message_lower for word in ['guess', 'think', 'looks like', 'is it', 'what is']):
            context = 'guessing'
        
        # Select appropriate response based on mood and context
        if mood == 'encouraging':
            responses = encouraging_responses[context]
        elif mood == 'curious':
            responses = curious_responses[context]
        elif mood == 'playful':
            responses = playful_responses[context]
        else:
            responses = encouraging_responses['general']
        
        return random.choice(responses)

    async def _generate_openrouter_funny_response(self, guess: str, correct_word: str) -> str:
        """Generate funny response using OpenRouter with Gemini."""
        try:
            headers = {
                "Authorization": f"Bearer {self.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Drawsy Game"
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
                "X-Title": "Drawsy Game"
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

    async def _generate_openrouter_chat_suggestion(self, message: str, mood: str = "encouraging") -> str:
        """Generate chat suggestion using OpenRouter with Gemini for a specific mood."""
        try:
            headers = {
                "Authorization": f"Bearer {self.openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Drawsy Game"
            }
            
            system_prompt = """You are an AI assistant in a multiplayer drawing guessing game called Drawsy. 
In this game, one player draws while others try to guess what they're drawing through chat messages.
Your role is to respond to chat messages in a way that enhances the social experience without giving away answers.

Key rules:
- Never reveal or hint at what's being drawn
- Keep responses under 12 words
- Be natural and conversational
- Match the requested mood/tone
- Focus on the social aspect and game experience
- Respond to player emotions and observations about the drawing process"""
            
            mood_instructions = {
                "encouraging": "Be supportive and motivating. Cheer players on and boost their confidence.",
                "curious": "Show genuine interest and wonder. Ask thoughtful questions about the drawing process.",
                "playful": "Be fun and energetic. Add excitement and humor to keep the game lively."
            }
            
            mood_instruction = mood_instructions.get(mood, mood_instructions["encouraging"])
            
            user_prompt = f"""A player in the drawing game just said: "{message}"

{mood_instruction}

Generate a brief, {mood} response that adds to the conversation."""
            
            payload = {
                "model": self.openrouter_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 25,
                "temperature": 0.8
            }
            
            response = requests.post(self.openrouter_base_url, headers=headers, json=payload)
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()
            
        except Exception as e:
            logger.error(f"OpenRouter chat suggestion error: {e}")
            return ""
