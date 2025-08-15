
# Drawsy Frontend

Drawsy Frontend is a modern, interactive web client for the Drawsy platform—a collaborative, multiplayer drawing and guessing game enhanced with AI features. Built with React, TypeScript, Zustand, and Tailwind CSS, it provides a seamless, real-time gaming experience.

## Features
- Real-time multiplayer drawing and guessing
- Live chat and player panel
- AI-powered word suggestions and funny responses
- Responsive, mobile-friendly UI
- Smooth animations and notifications
- Environment-based configuration for local and remote (ngrok) development

## Folder Structure
```
drawsy-frontend/
├── public/           # Static assets (index.html, manifest, icons)
├── src/
│   ├── components/   # Reusable UI components (DrawingCanvas, ChatPanel, PlayersPanel)
│   ├── pages/        # Main app pages (HomePage, GameRoom, JoinRoom)
│   ├── services/     # API and socket communication logic
│   ├── store/        # Zustand state management
│   ├── types/        # TypeScript types and interfaces
│   └── App.tsx       # App entry point
├── env.example       # Example environment variables
├── package.json      # Project metadata and scripts
├── tailwind.config.js / postcss.config.js # Styling config
└── tsconfig.json     # TypeScript config
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and update values as needed:
```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
REACT_APP_APP_NAME=Drawsy
REACT_APP_VERSION=1.0.0
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_DEBUG=true
```

### 3. Start the development server
```bash
npm start
```
The app will run at [http://localhost:3001](http://localhost:3001) by default.

### 4. Build for production
```bash
npm run build
```

### 5. Lint, format, and test
```bash
npm run lint        # Lint code
npm run lint:fix    # Auto-fix lint issues
npm run format      # Format code with Prettier
npm run test        # Run tests
```

## Technologies Used
- React 18 + TypeScript
- Zustand (state management)
- Socket.IO (real-time communication)
- Tailwind CSS (utility-first styling)
- Framer Motion (animations)
- MUI (Material UI components)
- Axios (API requests)
- ESLint, Prettier (code quality)

## API & Socket Configuration
- The frontend communicates with the backend REST API and Socket.IO server.
- Update `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` in your `.env` as needed for local or remote (ngrok) development.

## Contribution
Contributions are welcome! Please open issues or submit pull requests for improvements or bug fixes.

## License
This project is licensed under the MIT License. See the root `LICENSE` file for details.
