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
  const [currentStrokeId, setCurrentStrokeId] = useState<string | null>(null);

  const {
    currentWord,
    currentDrawingColor,
    currentBrushSize,
    addDrawingData,
  } = useGameStore();

  const currentUser = useCurrentUser();
  const currentDrawer = useCurrentDrawer();
  const isCurrentUserDrawer = currentUser?.userId === currentDrawer?.userId;

  // Store all drawing data for complete redraw approach
  const allDrawingData = useRef<DrawingData[]>([]);
  
  // Simple function to redraw entire canvas from scratch
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Group drawing data by strokeId
    const strokeGroups = new Map<string, DrawingData[]>();
    
    allDrawingData.current.forEach(data => {
      const strokeId = data.strokeId || `${data.x}-${data.y}`;
      if (!strokeGroups.has(strokeId)) {
        strokeGroups.set(strokeId, []);
      }
      strokeGroups.get(strokeId)!.push(data);
    });

    // Draw each stroke completely
    strokeGroups.forEach(strokeData => {
      if (strokeData.length === 0) return;
      
      // Sort by drawing order: start points first, then continue points
      strokeData.sort((a, b) => {
        if (a.isDrawing === false && b.isDrawing === true) return -1;
        if (a.isDrawing === true && b.isDrawing === false) return 1;
        return 0;
      });

      const startPoint = strokeData[0];
      const continuePoints = strokeData.slice(1);

      if (continuePoints.length === 0) return; // No line to draw if only start point

      // Set up drawing style
      ctx.strokeStyle = startPoint.color;
      ctx.lineWidth = startPoint.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw the complete stroke
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      
      continuePoints.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      
      ctx.stroke();
    });
  }, [width, height]);

  // Local drawing function (for real-time drawing by current user)
  const drawLocal = useCallback((data: DrawingData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

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
    
    // Clear all drawing data
    allDrawingData.current = [];
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
      // Add to our drawing data collection
      allDrawingData.current.push(data);
      
      // Redraw entire canvas to ensure consistency
      redrawCanvas();
      
      // Also add to store
      addDrawingData(data);
    };

    const handleClearCanvas = () => {
      clearCanvas();
    };

    const handleDrawingDataLoaded = (drawingDataArray: DrawingData[]) => {
      // Set all drawing data and redraw
      allDrawingData.current = [...drawingDataArray];
      redrawCanvas();
      
      // Add to store
      drawingDataArray.forEach(data => addDrawingData(data));
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
  }, [addDrawingData, clearCanvas, redrawCanvas]);

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

    // Generate unique stroke ID
    const strokeId = `${Date.now()}-${Math.random()}`;
    setCurrentStrokeId(strokeId);

    const drawingData: DrawingData = {
      x: point.x,
      y: point.y,
      color: currentDrawingColor,
      lineWidth: currentBrushSize,
      strokeId: strokeId,
      isDrawing: false,
    };

    // For local drawing, draw immediately and add to our data
    drawLocal(drawingData);
    allDrawingData.current.push(drawingData);
    
    // Send to other players
    socketService.sendDrawingData(drawingData);
    addDrawingData(drawingData);
  }, [disabled, getEventPosition, currentDrawingColor, currentBrushSize, drawLocal, addDrawingData]);

  // Continue drawing
  const continueDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled || !currentStrokeId) return;

    event.preventDefault();
    const point = getEventPosition(event);

    if (lastPoint) {
      const drawingData: DrawingData = {
        x: point.x,
        y: point.y,
        color: currentDrawingColor,
        lineWidth: currentBrushSize,
        strokeId: currentStrokeId,
        isDrawing: true,
      };

      // For local drawing, draw immediately and add to our data
      drawLocal(drawingData);
      allDrawingData.current.push(drawingData);
      
      // Send to other players
      socketService.sendDrawingData(drawingData);
      addDrawingData(drawingData);
    }

    setLastPoint(point);
  }, [isDrawing, disabled, getEventPosition, lastPoint, currentDrawingColor, currentBrushSize, currentStrokeId, drawLocal, addDrawingData]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
    setCurrentStrokeId(null);
  }, []);

  // Clear canvas and broadcast to all players
  const handleClearCanvas = useCallback(() => {
    clearCanvas();
    socketService.sendClearCanvas();
  }, [clearCanvas]);

  return (
    <div className="h-full flex flex-col">
      {/* Word Display for Drawer */}
      {isCurrentUserDrawer && currentWord && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-xl border-2 border-green-400/50 flex-shrink-0 shadow-lg backdrop-blur-sm"
          style={{ zIndex: 10 }}
        >
          <div className="text-center">
            <div className="text-white/90 text-sm mb-2 font-medium">🎯 Your word to draw:</div>
            <div className="text-2xl font-bold text-white tracking-wider drop-shadow-lg">
              {currentWord.toUpperCase()}
            </div>
            <div className="text-white/70 text-sm mt-2">
              Draw this so others can guess it!
            </div>
          </div>
        </motion.div>
      )}

      {/* Canvas Container - Now takes up all remaining space */}
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
    </div>
  );
};

export default DrawingCanvas;
