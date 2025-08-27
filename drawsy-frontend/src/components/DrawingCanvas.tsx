import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import { DrawingData } from '../types/game';
import { useGameStore, useCurrentUser, useCurrentDrawer } from '../store/gameStore';
import socketService from '../services/socket';

interface DrawingCanvasProps {
  width?: number;
  height?: number;
  disabled?: boolean;
}

interface KonvaLine {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width = 600,
  height = 400,
  disabled = false,
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState<KonvaLine[]>([]);
  const [currentLine, setCurrentLine] = useState<KonvaLine | null>(null);

  const {
    currentWord,
    currentDrawingColor,
    currentBrushSize,
    addDrawingData,
  } = useGameStore();

  const currentUser = useCurrentUser();
  const currentDrawer = useCurrentDrawer();
  const isCurrentUserDrawer = currentUser?.userId === currentDrawer?.userId;

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setLines([]);
    setCurrentLine(null);
  }, []);

  // Listen for drawing data from other players
  useEffect(() => {
    const handleDrawingData = (data: DrawingData) => {
      console.log('Received drawing data:', data);

      if (data.isDrawing === false) {
        // Start new line
        const newLine: KonvaLine = {
          id: data.strokeId || `${Date.now()}-${Math.random()}`,
          points: [data.x, data.y],
          stroke: data.color,
          strokeWidth: data.lineWidth,
        };
        setCurrentLine(newLine);
      } else if (data.isDrawing === true) {
        // Continue current line
        setCurrentLine(prev => {
          if (!prev) return null;
          return {
            ...prev,
            points: [...prev.points, data.x, data.y]
          };
        });
      } else {
        // End of stroke (isDrawing is undefined or null)
        setCurrentLine(prev => {
          if (prev) {
            // Add the completed line to the lines array
            setLines(prevLines => [...prevLines, prev]);
          }
          return null;
        });
      }

      addDrawingData(data);
    };

    const handleClearCanvas = () => {
      clearCanvas();
    };

    const handleDrawingDataLoaded = (drawingDataArray: DrawingData[]) => {
      // Convert drawing data to Konva lines
      const strokeGroups = new Map<string, DrawingData[]>();

      drawingDataArray.forEach(data => {
        const strokeId = data.strokeId || `fallback-${data.x}-${data.y}`;
        if (!strokeGroups.has(strokeId)) {
          strokeGroups.set(strokeId, []);
        }
        strokeGroups.get(strokeId)!.push(data);
      });

      const konvaLines: KonvaLine[] = [];
      strokeGroups.forEach((strokeData, strokeId) => {
        if (strokeData.length === 0) return;

        const sortedData = strokeData.sort((a, b) => {
          if (a.isDrawing === false && b.isDrawing === true) return -1;
          if (a.isDrawing === true && b.isDrawing === false) return 1;
          return 0;
        });

        const points: number[] = [];
        let stroke = '#000000';
        let strokeWidth = 2;

        sortedData.forEach(data => {
          points.push(data.x, data.y);
          stroke = data.color;
          strokeWidth = data.lineWidth;
        });

        if (points.length >= 2) {
          konvaLines.push({
            id: strokeId,
            points,
            stroke,
            strokeWidth
          });
        }
      });

      setLines(konvaLines);
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
  }, [addDrawingData, clearCanvas]);

  // Start drawing
  const handleMouseDown = useCallback((e: any) => {
    if (disabled) return;

    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();

    const strokeId = `${Date.now()}-${Math.random()}`;
    const newLine: KonvaLine = {
      id: strokeId,
      points: [pos.x, pos.y],
      stroke: currentDrawingColor,
      strokeWidth: currentBrushSize,
    };

    setCurrentLine(newLine);

    const drawingData: DrawingData = {
      x: pos.x,
      y: pos.y,
      color: currentDrawingColor,
      lineWidth: currentBrushSize,
      strokeId: strokeId,
      isDrawing: false,
    };

    socketService.sendDrawingData(drawingData);
    addDrawingData(drawingData);
  }, [disabled, currentDrawingColor, currentBrushSize, addDrawingData]);

  // Continue drawing
  const handleMouseMove = useCallback((e: any) => {
    if (!isDrawing || disabled || !currentLine) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    const newLine = {
      ...currentLine,
      points: [...currentLine.points, point.x, point.y]
    };
    setCurrentLine(newLine);

    const drawingData: DrawingData = {
      x: point.x,
      y: point.y,
      color: currentDrawingColor,
      lineWidth: currentBrushSize,
      strokeId: currentLine.id,
      isDrawing: true,
    };

    socketService.sendDrawingData(drawingData);
    addDrawingData(drawingData);
  }, [isDrawing, disabled, currentLine, currentDrawingColor, currentBrushSize, addDrawingData]);

  // Stop drawing
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentLine) return;

    setIsDrawing(false);
    setLines(prev => [...prev, currentLine]);
    setCurrentLine(null);

    // Send end of stroke signal
    const endStrokeData: DrawingData = {
      x: 0,
      y: 0,
      color: currentDrawingColor,
      lineWidth: currentBrushSize,
      strokeId: currentLine.id,
      isDrawing: undefined, // This signals end of stroke
    };

    socketService.sendDrawingData(endStrokeData);
  }, [isDrawing, currentLine, currentDrawingColor, currentBrushSize]);

  // Clear canvas and broadcast to all players
  const handleClearCanvas = useCallback(() => {
    clearCanvas();
    socketService.sendClearCanvas();
  }, [clearCanvas]);

  return (
    <div className="flex flex-col h-full">
      {/* Word Display for Drawer */}
      {isCurrentUserDrawer && currentWord && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 mx-auto mb-3 p-3 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-xl border-2 border-green-400/50 shadow-lg backdrop-blur-sm max-w-md"
          style={{ zIndex: 10 }}
        >
          <div className="text-center">
            <div className="text-white/90 text-xs mb-1 font-medium">🎯 Your word to draw:</div>
            <div className="text-xl font-bold text-white tracking-wider drop-shadow-lg">
              {currentWord.toUpperCase()}
            </div>
            <div className="text-white/70 text-xs mt-1">
              Draw this so others can guess it!
            </div>
          </div>
        </motion.div>
      )}

      {/* Canvas Container - Responsive */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div
          className="relative bg-white rounded-lg border border-gray-300 shadow-lg max-w-full max-h-full"
          style={{
            width: `min(${width}px, 100%)`,
            height: `min(${height}px, 100%)`,
            aspectRatio: `${width}/${height}`
          }}
        >
          <motion.div
            className={`w-full h-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Stage
              width={width}
              height={height}
              onMouseDown={handleMouseDown}
              onMousemove={handleMouseMove}
              onMouseup={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              ref={stageRef}
              className="drawing-canvas rounded-lg bg-white w-full h-full"
              scaleX={1}
              scaleY={1}
            >
              <Layer>
                {/* Render all completed lines */}
                {lines.map((line) => (
                  <Line
                    key={line.id}
                    points={line.points}
                    stroke={line.stroke}
                    strokeWidth={line.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation="source-over"
                  />
                ))}
                {/* Render current line being drawn */}
                {currentLine && (
                  <Line
                    points={currentLine.points}
                    stroke={currentLine.stroke}
                    strokeWidth={currentLine.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation="source-over"
                  />
                )}
              </Layer>
            </Stage>
          </motion.div>

          {/* Floating Clear Button - Top Right Corner */}
          {!disabled && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              onClick={handleClearCanvas}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-all hover:scale-110 z-10 backdrop-blur-sm border border-white/20 shadow-lg"
              disabled={disabled}
              title="Clear canvas for all players"
            >
              🗑️
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawingCanvas;
