import React from 'react';
import { environmentDetector } from '../services/environment';

interface EnvironmentStatusProps {
  className?: string;
}

export const EnvironmentStatus: React.FC<EnvironmentStatusProps> = ({ className = '' }) => {
  const config = environmentDetector.getConfig();
  
  if (process.env.REACT_APP_ENABLE_DEBUG !== 'true') {
    return null;
  }

  const getStatusColor = () => {
    switch (config.environment) {
      case 'local': return 'bg-green-500';
      case 'ngrok': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getEnvironmentIcon = () => {
    switch (config.environment) {
      case 'local': return '🏠';
      case 'ngrok': return '🌐';
      default: return '🔧';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className={`${getStatusColor()} text-white px-3 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2`}>
        <span>{getEnvironmentIcon()}</span>
        <div>
          <div className="font-semibold">
            {config.environment.toUpperCase()} Mode
          </div>
          <div className="text-xs opacity-90">
            API: {config.apiUrl.replace('https://', '').replace('http://', '')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentStatus;
