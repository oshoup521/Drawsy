import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DrawingData, DRAWING_COLORS } from '../types/game';
import { useGameStore, useCurrentUser, useCurrentDrawer } from '../store/gameStore';
import socketService from '../services/socket';

interface DrawingCanvasProps {
  width?: number;
  height?: number;
  disabled?: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width = 800,
  height = 600,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  const {
    gameState,
    currentDrawingColor,
    currentBrushSize,
    setDrawingColor,
    setBrushSize,
    addDrawingData,
  } = useGameStore();

  const currentUser = useCurrentUser();
  const currentDrawer = useCurrentDrawer();
  const isCurrentUserDrawer = currentUser?.userId === currentDrawer?.userId;

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  // Listen for drawing data from other players
  useEffect(() => {
    const handleDrawingData = (data: DrawingData) => {
      drawOnCanvas(data);
      addDrawingData(data);
    };

    socketService.onDrawingData(handleDrawingData);

    return () => {
      socketService.removeAllListeners();
    };
  }, [addDrawingData]);

  // Draw on canvas
  const drawOnCanvas = useCallback((data: DrawingData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;

    if (data.isDrawing === false) {
      // Start new stroke
      ctx.beginPath();
      ctx.moveTo(data.x, data.y);
    } else {
      // Continue stroke
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    }
  }, []);

  // Get mouse/touch position relative to canvas
  const getEventPosition = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number;
    let clientY: number;

    if ('touches' in event) {
      // Touch event
      const touch = event.touches[0] || event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      // Mouse event
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // Start drawing
  const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;

    event.preventDefault();
    setIsDrawing(true);

    const point = getEventPosition(event);
    setLastPoint(point);

    const drawingData: DrawingData = {
      x: point.x,
      y: point.y,
      color: currentDrawingColor,
      lineWidth: currentBrushSize,
      isDrawing: false,
    };

    drawOnCanvas(drawingData);
    socketService.sendDrawingData(drawingData);
    addDrawingData(drawingData);
  }, [disabled, getEventPosition, currentDrawingColor, currentBrushSize, drawOnCanvas, addDrawingData]);

  // Continue drawing
  const continueDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;

    event.preventDefault();
    const point = getEventPosition(event);

    if (lastPoint) {
      const drawingData: DrawingData = {
        x: point.x,
        y: point.y,
        color: currentDrawingColor,
        lineWidth: currentBrushSize,
        isDrawing: true,
      };

      drawOnCanvas(drawingData);
      socketService.sendDrawingData(drawingData);
      addDrawingData(drawingData);
    }

    setLastPoint(point);
  }, [isDrawing, disabled, getEventPosition, lastPoint, currentDrawingColor, currentBrushSize, drawOnCanvas, addDrawingData]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  return (
    <div className="drawing-area">
      {/* Drawing Tools */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="tools-panel"
      >
        {/* Color Picker */}
        <div className="color-picker">
          {DRAWING_COLORS.map((color) => (
            <button
              key={color}
              className={`color-button ${currentDrawingColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setDrawingColor(color)}
              disabled={disabled}
              title={`Select ${color}`}
            />
          ))}
        </div>

        {/* Brush Size */}
        <div className="brush-size">
          <span>Size:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={currentBrushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="brush-slider"
            disabled={disabled}
          />
          <span>{currentBrushSize}px</span>
        </div>

        {/* Clear Button */}
        <button
          onClick={clearCanvas}
          className="btn-secondary"
          disabled={disabled}
          title="Clear canvas"
        >
          🗑️ Clear
        </button>
      </motion.div>

      {/* Word Display for Drawer */}
      {isCurrentUserDrawer && gameState?.currentWord && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-400/30"
        >
          <div className="text-center">
            <div className="text-white/80 text-sm mb-2">🎯 Your word to draw:</div>
            <div className="text-2xl font-bold text-white tracking-wider">
              {gameState.currentWord.toUpperCase()}
            </div>
            <div className="text-white/60 text-xs mt-2">
              Draw this so others can guess it!
            </div>
          </div>
        </motion.div>
      )}

      {/* Canvas */}
      <motion.canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`drawing-canvas ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onMouseDown={startDrawing}
        onMouseMove={continueDrawing}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={continueDrawing}
        onTouchEnd={stopDrawing}
        style={{
          maxWidth: '100%',
          height: 'auto',
          aspectRatio: `${width}/${height}`,
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      />

      {/* Drawing Status */}
      {disabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg"
        >
          <div className="glass-card p-4 text-center">
            <p className="text-white font-semibold">👀 Watch and Guess!</p>
            <p className="text-white/80 text-sm">It's someone else's turn to draw</p>
          </div>
        </motion.div>
      )}

      {/* Drawing Instructions */}
      {!disabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/80 text-sm mt-2"
        >
          <p>🎨 Your turn to draw! Use mouse or touch to create your masterpiece</p>
        </motion.div>
      )}
    </div>
  );
};

export default DrawingCanvas;
