import React, { useState, useEffect } from 'react';
import { environmentDetector } from '../services/environment';

interface ConnectionHealthProps {
  className?: string;
}

interface HealthStatus {
  backend: 'checking' | 'connected' | 'failed';
  llm: 'checking' | 'connected' | 'failed';
  lastCheck: Date;
}

export const ConnectionHealth: React.FC<ConnectionHealthProps> = ({ className = '' }) => {
  const [health, setHealth] = useState<HealthStatus>({
    backend: 'checking',
    llm: 'checking',
    lastCheck: new Date(),
  });

  const checkHealth = async () => {
    const config = environmentDetector.getConfig();
    
    // Check backend health
    try {
      const response = await fetch(`${config.apiUrl}/api/health`, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setHealth(prev => ({ 
        ...prev, 
        backend: response.ok ? 'connected' : 'failed',
        lastCheck: new Date()
      }));
    } catch (error) {
      setHealth(prev => ({ 
        ...prev, 
        backend: 'failed',
        lastCheck: new Date()
      }));
    }

    // Check LLM service health (usually localhost)
    try {
      const response = await fetch('http://localhost:8000/', {
        method: 'GET',
      });
      setHealth(prev => ({ 
        ...prev, 
        llm: response.ok ? 'connected' : 'failed'
      }));
    } catch (error) {
      setHealth(prev => ({ 
        ...prev, 
        llm: 'failed'
      }));
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (process.env.REACT_APP_ENABLE_DEBUG !== 'true') {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '✅';
      case 'failed': return '❌';
      case 'checking': return '🔄';
      default: return '❓';
    }
  };

  const config = environmentDetector.getConfig();

  return (
    <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
      <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg text-sm">
        <div className="font-semibold mb-2">Connection Health</div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(health.backend)}</span>
            <span>Backend ({config.environment})</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span>{getStatusIcon(health.llm)}</span>
            <span>LLM Service</span>
          </div>
        </div>
        
        <div className="text-xs opacity-70 mt-2">
          Last: {health.lastCheck.toLocaleTimeString()}
        </div>
        
        <button
          onClick={checkHealth}
          className="text-xs bg-blue-600 px-2 py-1 rounded mt-2 hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default ConnectionHealth;
