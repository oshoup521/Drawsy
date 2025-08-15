import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import HomePage from './pages/HomePage';
import GameRoom from './pages/GameRoom';
import JoinRoom from './pages/JoinRoom';
import './App.css';

function App() {
  return (
    <div className="App">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/room/:roomId" element={<GameRoom />} />
        </Routes>
      </motion.div>
    </div>
  );
}

export default App;
