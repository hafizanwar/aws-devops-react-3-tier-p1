import { Config } from '../types';

// Extend Window interface to include runtime config
declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      REACT_APP_API_URL?: string;
      REACT_APP_ENV?: string;
    };
  }
}

// Load configuration from runtime environment variables (injected at container startup)
// Falls back to build-time environment variables for development
const config: Config = {
  apiUrl: window.RUNTIME_CONFIG?.REACT_APP_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000',
  environment: window.RUNTIME_CONFIG?.REACT_APP_ENV || process.env.REACT_APP_ENV || 'development',
};

export default config;
