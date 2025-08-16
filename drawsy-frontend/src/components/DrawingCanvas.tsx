import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DrawingData } from '../types/game';
import { useGameStore, useCurrentUser, useCurrentDrawer } from '../store/gameStore';
import socketService from '../services/socket';

interface DrawingCanvasProps {
  width?: number;
  height?: number;
  disabled?: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width = 800,
  height = 500,
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

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

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

    const handleClearCanvas = () => {
      clearCanvas();
    };

    const handleDrawingDataLoaded = (drawingDataArray: DrawingData[]) => {
      // Clear canvas first
      clearCanvas();

      // Redraw all the saved drawing data
      drawingDataArray.forEach(data => {
        drawOnCanvas(data);
        addDrawingData(data);
      });
    };

    socketService.onDrawingData(handleDrawingData);
    socketService.onClearCanvas(handleClearCanvas);
    socketService.onDrawingDataLoaded(handleDrawingDataLoaded);

    // Load existing drawing data when component mounts
    socketService.loadDrawingData();

    return () => {
      // Don't remove all listeners - just this specific one would be better
      // socketService.removeAllListeners(); 
      // For now, we'll let the parent component handle cleanup
    };
  }, [addDrawingData, clearCanvas, drawOnCanvas]);

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

  // Clear canvas and broadcast to all players
  const handleClearCanvas = useCallback(() => {
    clearCanvas();
    socketService.sendClearCanvas();
  }, [clearCanvas]);

  return (
    <div className="h-full flex flex-col">
      {/* Word Display for Drawer */}
      {isCurrentUserDrawer && gameState?.currentWord && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-400/30 flex-shrink-0"
        >
          <div className="text-center">
            <div className="text-white/80 text-xs mb-1">🎯 Your word to draw:</div>
            <div className="text-xl font-bold text-white tracking-wider">
              {gameState.currentWord.toUpperCase()}
            </div>
            <div className="text-white/60 text-xs mt-1">
              Draw this so others can guess it!
            </div>
          </div>
        </motion.div>
      )}

      {/* Canvas Container - Now takes up most of the space */}
      <div className="flex-1 flex items-center justify-center relative min-h-0">
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
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            aspectRatio: `${width}/${height}`,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        />

        {/* Floating Clear Button - Top Right Corner */}
        {!disabled && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleClearCanvas}
            className="absolute top-3 right-3 w-8 h-8 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-sm transition-all hover:scale-110 z-10 backdrop-blur-sm border border-white/20 shadow-lg"
            disabled={disabled}
            title="Clear canvas for all players"
          >
            🗑️
          </motion.button>
        )}
      </div>

      {/* Drawing Instructions - Smaller and at bottom */}
      {!disabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/50 text-xs py-1 flex-shrink-0"
        >
          🎨 Use the color palette to select colors and brush size
        </motion.div>
      )}
    </div>
  );
};

export default DrawingCanvas;
