
# Drawsy Backend

Drawsy Backend is a robust, scalable API and real-time server for the Drawsy platform, built with NestJS and TypeScript. It powers multiplayer game logic, user management, and integrates with the LLM microservice for AI features.

## Features
- RESTful API for game management (create/join game, rounds, players)
- Real-time communication via Socket.IO
- Integration with LLM microservice for AI-powered word suggestions and funny responses
- PostgreSQL database via TypeORM
- Input validation, error handling, and CORS support
- Swagger API documentation

## Folder Structure
```
drawsy-backend/
├── src/
│   ├── controllers/   # API controllers (game logic)
│   ├── database/      # Data source and DB config
│   ├── dto/           # Data transfer objects
│   ├── entities/      # TypeORM entities (Game, Player, Round, DrawingData)
│   ├── gateways/      # WebSocket gateway
│   ├── middleware/    # Custom middleware (e.g., ngrok)
│   ├── models/        # TypeScript models
│   ├── services/      # Business logic (game, LLM)
│   └── main.ts        # App entry point
├── env.example        # Example environment variables
├── package.json       # Project metadata and scripts
├── tsconfig.json      # TypeScript config
└── nest-cli.json      # NestJS CLI config
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and update values as needed:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_DATABASE=drawsy
PORT=3000
LLM_SERVICE_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
```

### 3. Start the development server
```bash
npm run start:dev
```

### 4. Build for production
```bash
npm run build
```

### 5. Lint, format, and test
```bash
npm run lint        # Lint code
npm run format      # Format code with Prettier
npm run test        # Run tests
```

## Technologies Used
- NestJS (TypeScript framework)
- TypeORM (PostgreSQL ORM)
- Socket.IO (real-time communication)
- Swagger (API docs)
- Class-validator, class-transformer (validation)
- Jest (testing)

## API & LLM Integration
- REST API and WebSocket endpoints for game logic
- Communicates with the LLM microservice for AI features (see `services/llm.service.ts`)
- API docs available at `/api/docs` when running

## Contribution
Contributions are welcome! Please open issues or submit pull requests for improvements or bug fixes.

## License
This project is licensed under the MIT License. See the root `LICENSE` file for details.
