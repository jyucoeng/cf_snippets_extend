const axios = require('axios');

class ApiClient {
  constructor(config) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 2000;
    this.useSessionToken = config.useSessionToken !== false;
    this.sessionToken = null;
    
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Add request interceptor to add auth header
    this.client.interceptors.request.use((config) => {
      const token = this.sessionToken || this.apiKey;
      if (token) {
        config.headers['X-API-Key'] = token;
      }
      return config;
    });
  }

  async login() {
    try {
      const response = await axios.post(`${this.apiUrl}/api/auth/login`, {
        apiKey: this.apiKey
      }, {
        timeout: 30000
      });
      
      if (response.data.success && response.data.apiKey) {
        this.sessionToken = response.data.apiKey;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error.message);
      return false;
    }
  }

  async ensureAuthenticated() {
    if (this.useSessionToken && !this.sessionToken) {
      await this.login();
    }
  }

  async retryRequest(fn, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.ensureAuthenticated();
        return await fn();
      } catch (error) {
        const isLastRetry = i === retries - 1;
        
        if (isLastRetry) {
          throw error;
        }

        // Check if it's an auth error
        if (error.response && error.response.status === 401) {
          // Try to re-login
          this.sessionToken = null;
          await this.login();
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1)));
      }
    }
  }

  async getCFIPs() {
    return this.retryRequest(async () => {
      try {
        const response = await this.client.get('/api/cfip');
        return response.data.data || [];
      } catch (error) {
        const errorMsg = error.response 
          ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
          : error.message;
        throw new Error(`Failed to get CF IPs: ${errorMsg}`);
      }
    });
  }

  async updateCFIP(id, data) {
    return this.retryRequest(async () => {
      try {
        const response = await this.client.put(`/api/cfip/${id}`, data);
        return response.data;
      } catch (error) {
        const errorMsg = error.response 
          ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
          : error.message;
        throw new Error(`Failed to update CF IP ${id}: ${errorMsg}`);
      }
    });
  }

  async getProxyIPs() {
    return this.retryRequest(async () => {
      try {
        const response = await this.client.get('/api/proxyip');
        return response.data.data || [];
      } catch (error) {
        const errorMsg = error.response 
          ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
          : error.message;
        throw new Error(`Failed to get Proxy IPs: ${errorMsg}`);
      }
    });
  }

  async updateProxyIP(id, data) {
    return this.retryRequest(async () => {
      try {
        const response = await this.client.put(`/api/proxyip/${id}`, data);
        return response.data;
      } catch (error) {
        const errorMsg = error.response 
          ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
          : error.message;
        throw new Error(`Failed to update Proxy IP ${id}: ${errorMsg}`);
      }
    });
  }

  async getOutbounds() {
    return this.retryRequest(async () => {
      try {
        const response = await this.client.get('/api/outbound');
        return response.data.data || [];
      } catch (error) {
        const errorMsg = error.response 
          ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
          : error.message;
        throw new Error(`Failed to get Outbounds: ${errorMsg}`);
      }
    });
  }

  async updateOutbound(id, data) {
    return this.retryRequest(async () => {
      try {
        const response = await this.client.put(`/api/outbound/${id}`, data);
        return response.data;
      } catch (error) {
        const errorMsg = error.response 
          ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
          : error.message;
        throw new Error(`Failed to update Outbound ${id}: ${errorMsg}`);
      }
    });
  }

  async testOutbound(id) {
    try {
      const response = await this.client.post('/api/test-outbound', { id });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to test Outbound ${id}: ${error.message}`);
    }
  }

  async checkExit(id) {
    try {
      const response = await this.client.post('/api/check-exit', { id });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to check exit ${id}: ${error.message}`);
    }
  }
}

module.exports = ApiClient;
