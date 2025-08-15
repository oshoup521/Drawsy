
# Drawsy

Drawsy is a collaborative, AI-powered drawing and guessing game platform. It features a modern React frontend, a scalable NestJS backend, and a Python-based LLM microservice for enhanced gameplay. The project is designed for extensibility, real-time multiplayer fun, and easy local or cloud deployment.

## Architecture
```
Drawsy/
├── drawsy-frontend/   # React + TypeScript web client
├── drawsy-backend/    # NestJS + TypeScript API & real-time server
├── drawsy-llm/        # FastAPI + Python LLM microservice
```

### How it works
- Players join a room, draw, and guess words in real time
- The backend manages game state, users, and sockets
- The LLM service provides AI-generated words, funny responses, and chat suggestions

## Quick Start
See the README in each subproject for detailed setup instructions:
- [Frontend](./drawsy-frontend/README.md)
- [Backend](./drawsy-backend/README.md)
- [LLM Microservice](./drawsy-llm/README.md)

## Requirements
- Node.js 18+, npm
- Python 3.10+
- PostgreSQL (for backend)

## License
This project is licensed under the MIT License. See the root `LICENSE` file for details.
