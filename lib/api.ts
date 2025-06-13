/**
 * API client for the Flask spam detection service
 */

// The base URLs to try for the API
const API_URLS = ['http://localhost:5000', 'http://127.0.0.1:5000'];

// Define header types
interface ApiHeaders {
  'Content-Type': string;
  'Accept': string;
}

// API configuration
const API_CONFIG = {
  baseURL: API_URLS[0],
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  } as ApiHeaders
};

/**
 * Check if the API is available by trying multiple endpoints
 */
export async function checkApiHealth() {
  let lastError: string | null = null;
  
  for (const baseUrl of API_URLS) {
    try {
      console.log(`Checking API health at ${baseUrl}...`);
      
      const response = await fetch(`${baseUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // Reduced timeout for faster feedback
        mode: 'cors',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
        console.log(`API is healthy at ${baseUrl}`);
        // Update the base URL to the working endpoint
        API_CONFIG.baseURL = baseUrl;
        return true;
        }
      }
      lastError = `HTTP ${response.status} at ${baseUrl}`;
      console.warn(`API returned status ${response.status} at ${baseUrl}`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`API health check failed for ${baseUrl}:`, error);
      continue;
    }
  }
  
  console.error('All API endpoints failed health check:', lastError);
  return false;
}

/**
 * Make an API request with automatic endpoint fallback
 */
export async function makeApiRequest(path: string, options: RequestInit = {}) {
  let lastError: Error | null = null;
  
  for (const baseUrl of API_URLS) {
    try {
      // Prepare headers
      const headers = new Headers({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      });
      
      // Make the request
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
        mode: 'cors'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.msg || errorJson.error || errorText);
        } catch {
          throw new Error(errorText || `API error: ${response.status}`);
        }
      }
      
      return response;
    } catch (error) {
      console.warn(`Request failed for ${baseUrl}:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }
  
  throw lastError || new Error('All API endpoints failed');
}

// Authentication utilities
export const isAuthenticated = () => {
  const token = localStorage.getItem('auth_token');
  return !!token;
};

export const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
};