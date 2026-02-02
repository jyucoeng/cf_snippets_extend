require('dotenv').config();
const ApiClient = require('./api-client');
const Tester = require('./tester');
const Logger = require('./logger');

const logger = new Logger();

class CFAutoCheck {
  constructor() {
    this.apiClient = new ApiClient({
      apiUrl: process.env.API_URL,
      apiKey: process.env.API_KEY,
      maxRetries: parseInt(process.env.API_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.API_RETRY_DELAY) || 2000,
      useSessionToken: process.env.API_USE_SESSION_TOKEN !== 'false'
    });
    
    this.tester = new Tester({
      timeout: parseInt(process.env.TIMEOUT) || 5000,
      testUrl: process.env.TEST_URL || 'https://www.cloudflare.com/cdn-cgi/trace',
      speedTestSize: parseInt(process.env.SPEED_TEST_SIZE) || 1048576,
      speedTestDuration: parseInt(process.env.SPEED_TEST_DURATION) || 10000
    });
    
    this.checkInterval = parseInt(process.env.CHECK_INTERVAL) || 3600;
    this.concurrentTests = parseInt(process.env.CONCURRENT_TESTS) || 5;
    this.testMode = process.env.TEST_MODE || 'cfip';
    this.enableLatencyTest = process.env.ENABLE_LATENCY_TEST !== 'false';
    this.enableSpeedTest = process.env.ENABLE_SPEED_TEST === 'true';
    this.enableAutoUpdate = process.env.ENABLE_AUTO_UPDATE !== 'false';
  }

  async start() {
    logger.info('CF Auto Check Service Started');
    logger.info(`API URL: ${process.env.API_URL}`);
    logger.info(`Check Interval: ${this.checkInterval}s`);
    logger.info(`Test Mode: ${this.testMode}`);
    logger.info(`Concurrent Tests: ${this.concurrentTests}`);
    
    // Run immediately on start
    await this.runCheck();
    
    // Schedule periodic checks
    setInterval(() => {
      this.runCheck().catch(err => {
        logger.error('Check failed:', err);
      });
    }, this.checkInterval * 1000);
  }

  async runCheck() {
    try {
      logger.info('Starting check cycle...');
      
      if (this.testMode === 'all' || this.testMode === 'cfip') {
        await this.checkCFIPs();
      }
      
      if (this.testMode === 'all' || this.testMode === 'proxyip') {
        await this.checkProxyIPs();
      }
      
      if (this.testMode === 'all' || this.testMode === 'outbound') {
        await this.checkOutbounds();
      }
      
      logger.info('Check cycle completed');
    } catch (error) {
      logger.error('Error in check cycle:', error);
    }
  }

  async checkCFIPs() {
    try {
      logger.info('Fetching CF IPs...');
      const cfips = await this.apiClient.getCFIPs();
      
      if (!cfips || cfips.length === 0) {
        logger.warn('No CF IPs found');
        return;
      }
      
      logger.info(`Found ${cfips.length} CF IPs`);
      
      // Test in batches
      for (let i = 0; i < cfips.length; i += this.concurrentTests) {
        const batch = cfips.slice(i, i + this.concurrentTests);
        await Promise.all(batch.map(ip => this.testAndUpdateCFIP(ip)));
      }
      
      logger.info('CF IP checks completed');
    } catch (error) {
      logger.error('Error checking CF IPs:', error);
    }
  }

  async testAndUpdateCFIP(cfip) {
    try {
      const address = cfip.address;
      const port = cfip.port || 443;
      
      logger.info(`Testing CF IP: ${address}:${port}`);
      
      const results = {
        latency: null,
        speed: null,
        status: 'offline'
      };
      
      // Latency test
      if (this.enableLatencyTest) {
        const latency = await this.tester.testLatency(address, port);
        results.latency = latency;
        if (latency > 0) {
          results.status = 'online';
        }
      }
      
      // Speed test
      if (this.enableSpeedTest && results.status === 'online') {
        const speed = await this.tester.testSpeed(address, port);
        results.speed = speed;
      }
      
      logger.info(`CF IP ${address}:${port} - Latency: ${results.latency}ms, Speed: ${results.speed ? (results.speed / 1024).toFixed(2) + 'KB/s' : 'N/A'}`);
      
      // Update via API
      if (this.enableAutoUpdate) {
        const updateData = {
          remark: `${cfip.remark || address} [${results.latency}ms]`
        };
        
        // Disable if offline
        if (results.status === 'offline') {
          updateData.enabled = false;
        }
        
        await this.apiClient.updateCFIP(cfip.id, updateData);
        logger.info(`Updated CF IP ${address} in database`);
      }
      
      return results;
    } catch (error) {
      logger.error(`Error testing CF IP ${cfip.address}:`, error);
      return null;
    }
  }

  async checkProxyIPs() {
    try {
      logger.info('Fetching Proxy IPs...');
      const proxyips = await this.apiClient.getProxyIPs();
      
      if (!proxyips || proxyips.length === 0) {
        logger.warn('No Proxy IPs found');
        return;
      }
      
      logger.info(`Found ${proxyips.length} Proxy IPs`);
      
      for (let i = 0; i < proxyips.length; i += this.concurrentTests) {
        const batch = proxyips.slice(i, i + this.concurrentTests);
        await Promise.all(batch.map(ip => this.testAndUpdateProxyIP(ip)));
      }
      
      logger.info('Proxy IP checks completed');
    } catch (error) {
      logger.error('Error checking Proxy IPs:', error);
    }
  }

  async testAndUpdateProxyIP(proxyip) {
    try {
      logger.info(`Testing Proxy IP: ${proxyip.address}`);
      
      const latency = await this.tester.testProxyLatency(proxyip.address);
      
      logger.info(`Proxy IP ${proxyip.address} - Latency: ${latency}ms`);
      
      if (this.enableAutoUpdate) {
        const updateData = {
          remark: `${proxyip.remark || proxyip.address} [${latency}ms]`
        };
        
        if (latency < 0) {
          updateData.enabled = false;
        }
        
        await this.apiClient.updateProxyIP(proxyip.id, updateData);
        logger.info(`Updated Proxy IP ${proxyip.address} in database`);
      }
      
      return latency;
    } catch (error) {
      logger.error(`Error testing Proxy IP ${proxyip.address}:`, error);
      return -1;
    }
  }

  async checkOutbounds() {
    try {
      logger.info('Fetching Outbounds...');
      const outbounds = await this.apiClient.getOutbounds();
      
      if (!outbounds || outbounds.length === 0) {
        logger.warn('No Outbounds found');
        return;
      }
      
      logger.info(`Found ${outbounds.length} Outbounds`);
      
      for (let i = 0; i < outbounds.length; i += this.concurrentTests) {
        const batch = outbounds.slice(i, i + this.concurrentTests);
        await Promise.all(batch.map(ob => this.testAndUpdateOutbound(ob)));
      }
      
      logger.info('Outbound checks completed');
    } catch (error) {
      logger.error('Error checking Outbounds:', error);
    }
  }

  async testAndUpdateOutbound(outbound) {
    try {
      logger.info(`Testing Outbound: ${outbound.address}`);
      
      const latency = await this.tester.testProxyLatency(outbound.address);
      
      logger.info(`Outbound ${outbound.address} - Latency: ${latency}ms`);
      
      if (this.enableAutoUpdate) {
        const updateData = {
          remark: `${outbound.remark || outbound.address} [${latency}ms]`
        };
        
        if (latency < 0) {
          updateData.enabled = false;
        }
        
        await this.apiClient.updateOutbound(outbound.id, updateData);
        logger.info(`Updated Outbound ${outbound.address} in database`);
      }
      
      return latency;
    } catch (error) {
      logger.error(`Error testing Outbound ${outbound.address}:`, error);
      return -1;
    }
  }
}

// Start the service
const service = new CFAutoCheck();
service.start().catch(err => {
  logger.error('Failed to start service:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
