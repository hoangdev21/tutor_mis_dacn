// ===== TOKEN MANAGER - AUTOMATIC TOKEN REFRESH =====
// Quản lý token và tự động làm mới khi hết hạn

const TokenManager = {
  API_BASE_URL: 'http://localhost:5000/api',
  refreshPromise: null,
  isRefreshing: false,
  
  /**
   * Get current access token
   */
  getAccessToken() {
    return localStorage.getItem('token') || localStorage.getItem('accessToken');
  },
  
  /**
   * Get refresh token
   */
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  },
  
  /**
   * Set access token
   */
  setAccessToken(token) {
    localStorage.setItem('token', token);
    localStorage.setItem('accessToken', token);
  },
  
  /**
   * Set refresh token
   */
  setRefreshToken(token) {
    localStorage.setItem('refreshToken', token);
  },
  
  /**
   * Clear all tokens
   */
  clearTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  },
  
  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      // Token hết hạn nếu còn ít hơn 5 phút
      const fiveMinutes = 5 * 60 * 1000;
      return (expiryTime - currentTime) < fiveMinutes;
    } catch (error) {
      console.error('❌ Error checking token expiry:', error);
      return true;
    }
  },
  
  /**
   * Check if token is test token
   */
  isTestToken(token) {
    return token && token.startsWith('test_token');
  },
  
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      console.log('🔄 Token refresh already in progress, waiting...');
      return this.refreshPromise;
    }
    
    this.isRefreshing = true;
    
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 Refreshing access token...');
        
        const refreshToken = this.getRefreshToken();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Call refresh token API
        const response = await fetch(`${this.API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Important: send cookies with refresh token
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          const newAccessToken = data.data.accessToken;
          this.setAccessToken(newAccessToken);
          
          console.log('✅ Access token refreshed successfully');
          return newAccessToken;
        } else {
          throw new Error(data.message || 'Token refresh failed');
        }
        
      } catch (error) {
        console.error('❌ Token refresh failed:', error.message);
        
        // Clear tokens and redirect to login
        this.clearTokens();
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('index.html')) {
          alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          window.location.href = '../../index.html';
        }
        
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();
    
    return this.refreshPromise;
  },
  
  /**
   * Make authenticated API request with automatic token refresh
   */
  async apiRequest(endpoint, options = {}) {
    let token = this.getAccessToken();
    
    // Check if token exists
    if (!token) {
      console.error('❌ No token available');
      window.location.href = '../../index.html';
      throw new Error('Authentication required');
    }
    
    // Check for test token
    if (this.isTestToken(token)) {
      console.error('❌ Invalid test token detected!');
      alert('❌ Invalid Token Detected!\n\nYou have a test token stored. Please:\n1. Clear your token\n2. Log in again with valid credentials\n\nRedirecting to clear token page...');
      window.location.href = '../clear-token.html';
      throw new Error('Invalid test token');
    }
    
    // Check if token is expired or about to expire
    if (this.isTokenExpired(token)) {
      console.log('⚠️ Token expired or about to expire, refreshing...');
      try {
        token = await this.refreshAccessToken();
      } catch (error) {
        // If refresh fails, error is already handled in refreshAccessToken
        throw error;
      }
    }
    
    // Make the API request
    const url = endpoint.startsWith('http') ? endpoint : `${this.API_BASE_URL}${endpoint}`;
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      credentials: 'include', // Include cookies for refresh token
      ...options
    };
    
    console.log('📤 API Request:', config.method, url);
    
    try {
      const response = await fetch(url, config);
      
      console.log('📥 API Response:', response.status, response.statusText);
      
      // If we get 401, token might have expired during the request
      // Try to refresh once and retry the request
      if (response.status === 401) {
        console.log('⚠️ Got 401, attempting token refresh...');
        
        try {
          token = await this.refreshAccessToken();
          
          // Retry the request with new token
          config.headers.Authorization = `Bearer ${token}`;
          const retryResponse = await fetch(url, config);
          
          console.log('📥 Retry Response:', retryResponse.status, retryResponse.statusText);
          
          if (!retryResponse.ok) {
            const retryData = await retryResponse.json();
            throw new Error(retryData.message || 'Request failed after token refresh');
          }
          
          return await retryResponse.json();
          
        } catch (refreshError) {
          console.error('❌ Token refresh failed on 401:', refreshError);
          throw new Error('Authentication failed');
        }
      }
      
      // Handle other authentication errors
      if (response.status === 403) {
        console.error('❌ Forbidden - Status:', response.status);
        throw new Error('Access forbidden');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Request failed:', data);
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ API Request Error:', error);
      throw error;
    }
  },
  
  /**
   * Initialize token manager
   * Call this when app starts
   */
  init() {
    console.log('🔐 Token Manager initialized');
    
    // Check token on page load
    const token = this.getAccessToken();
    if (token && !this.isTestToken(token) && this.isTokenExpired(token)) {
      console.log('⚠️ Token expired on page load, will refresh on first API call');
    }
    
    // Set up periodic token check (every 4 minutes)
    setInterval(() => {
      const currentToken = this.getAccessToken();
      if (currentToken && !this.isTestToken(currentToken) && this.isTokenExpired(currentToken)) {
        console.log('⏰ Periodic check: Token about to expire, refreshing...');
        this.refreshAccessToken().catch(err => {
          console.error('❌ Periodic token refresh failed:', err);
        });
      }
    }, 4 * 60 * 1000); // Check every 4 minutes
  }
};

// Auto-initialize when script loads
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TokenManager.init());
  } else {
    TokenManager.init();
  }
}

// Make TokenManager globally available
window.TokenManager = TokenManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokenManager;
}
