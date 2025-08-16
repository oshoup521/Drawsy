// Dynamic environment configuration
// This file automatically detects the environment and provides appropriate URLs

interface EnvironmentConfig {
  apiUrl: string;
  socketUrl: string;
  environment: 'local' | 'ngrok' | 'production';
  isLocal: boolean;
  isNgrok: boolean;
}

class EnvironmentDetector {
  private static instance: EnvironmentDetector;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.detectEnvironment();
  }

  static getInstance(): EnvironmentDetector {
    if (!EnvironmentDetector.instance) {
      EnvironmentDetector.instance = new EnvironmentDetector();
    }
    return EnvironmentDetector.instance;
  }

  private detectEnvironment(): EnvironmentConfig {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;
    
    // Check for forced environment override
    const forcedEnv = process.env.REACT_APP_FORCE_ENVIRONMENT;
    
    // Check if we're running on ngrok
    const isNgrok = hostname.includes('ngrok') || hostname.includes('ngrok-free.app');
    
    // Check if we're running locally
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');

    let apiUrl: string;
    let socketUrl: string;
    let environment: 'local' | 'ngrok' | 'production';

    // Apply forced environment if specified
    if (forcedEnv === 'ngrok' || (forcedEnv !== 'local' && isNgrok)) {
      // We're accessing via ngrok - use the backend ngrok URL
      const backendNgrokUrl = process.env.REACT_APP_BACKEND_NGROK_URL || 'https://intent-knowing-ape.ngrok-free.app';
      apiUrl = backendNgrokUrl;
      socketUrl = backendNgrokUrl;
      environment = 'ngrok';
    } else if (forcedEnv === 'local' || (forcedEnv !== 'ngrok' && isLocal)) {
      // We're accessing locally - use localhost backend
      apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
      environment = 'local';
    } else {
      // Production or other environment
      apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
      environment = 'production';
    }

    const config: EnvironmentConfig = {
      apiUrl,
      socketUrl,
      environment,
      isLocal,
      isNgrok
    };

    console.log('🌍 Environment detected:', {
      hostname,
      port,
      protocol,
      forcedEnv,
      environment,
      apiUrl,
      socketUrl
    });

    return config;
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  getApiUrl(): string {
    return this.config.apiUrl;
  }

  getSocketUrl(): string {
    return this.config.socketUrl;
  }

  getEnvironment(): 'local' | 'ngrok' | 'production' {
    return this.config.environment;
  }

  isLocalEnvironment(): boolean {
    return this.config.isLocal;
  }

  isNgrokEnvironment(): boolean {
    return this.config.isNgrok;
  }

  // Method to refresh configuration if needed
  refresh(): void {
    this.config = this.detectEnvironment();
  }
}

export const environmentDetector = EnvironmentDetector.getInstance();
export default environmentDetector;
