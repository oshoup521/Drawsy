import React from 'react';
import { motion } from 'framer-motion';
import { DRAWING_COLORS } from '../types/game';
import { useGameStore } from '../store/gameStore';

interface VerticalColorPaletteProps {
  disabled?: boolean;
  className?: string;
}

const VerticalColorPalette: React.FC<VerticalColorPaletteProps> = ({ 
  disabled = false, 
  className = '' 
}) => {
  const {
    currentDrawingColor,
    currentBrushSize,
    setDrawingColor,
    setBrushSize,
  } = useGameStore();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex flex-col items-center gap-2 h-full max-h-[calc(100vh-140px)] ${className}`}
    >
      <div className="glass-card p-3 flex flex-col items-center gap-3 h-full overflow-y-auto">
        {/* Color Palette */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <span className="text-white text-xs font-semibold text-center">Colors</span>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {DRAWING_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setDrawingColor(color)}
                className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
                  currentDrawingColor === color
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-white/30 hover:border-white/60 hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                disabled={disabled}
                title={`Select ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <span className="text-white text-xs font-semibold">Size</span>
          <div className="flex flex-col items-center gap-1">
            <input
              type="range"
              min="1"
              max="20"
              value={currentBrushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="vertical-slider"
              disabled={disabled}
              style={{ height: '60px' }}
            />
            <span className="text-white text-xs">{currentBrushSize}px</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VerticalColorPalette;
