// src/core/config/vault.js
const fs = require('fs').promises;
const vault = require('node-vault');
const logger = require('../logging');

/**
 * Vault configuration provider
 */
class VaultConfigProvider {
  /**
   * Create a new Vault configuration provider
   * @param {object} options - Provider options
   */
  constructor(options = {}) {
    this.options = {
      vaultAddr: process.env.VAULT_ADDR || 'http://vault:8200',
      tokenFile: process.env.VAULT_TOKEN_FILE || '/vault/config/notification-token',
      token: process.env.VAULT_TOKEN,
      basePath: process.env.VAULT_BASE_PATH || 'secret/data',
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      ...options
    };
    
    this.client = null;
    this.configCache = {};
    this.cacheExpiry = 0;
  }
  
  /**
   * Get Vault token from file or environment
   * @returns {Promise<string>} Vault token
   * @private
   */
  async getVaultToken() {
    try {
      // Use token from options if available
      if (this.options.token) {
        return this.options.token;
      }
      
      // Use token from environment if available
      if (process.env.VAULT_TOKEN) {
        return process.env.VAULT_TOKEN;
      }
      
      // In development mode, return a default token
      if (process.env.NODE_ENV !== 'production') {
        return 'dev-token';
      }
      
      // Read token from file
      try {
        const tokenFile = this.options.tokenFile;
        await fs.access(tokenFile);
        return (await fs.readFile(tokenFile, 'utf8')).trim();
      } catch (accessError) {
        // If running locally, check for a local token file
        const isRunningLocally = this.options.tokenFile.includes('/vault/') && 
          !require('fs').existsSync(this.options.tokenFile);
        
        if (isRunningLocally) {
          const localTokenPath = './vault-init/notification-token';
          return (await fs.readFile(localTokenPath, 'utf8')).trim();
        }
        
        throw accessError;
      }
    } catch (error) {
      logger.error('Unable to read Vault token:', error);
      return 'dev-token';
    }
  }
  
  /**
   * Initialize Vault client
   * @returns {Promise<any>} Vault client
   * @private
   */
  async initClient() {
    if (this.client) {
      return this.client;
    }
    
    const token = await this.getVaultToken();
    this.client = vault({
      apiVersion: 'v1',
      endpoint: this.options.vaultAddr,
      token
    });
    
    return this.client;
  }
  
  /**
   * Get configuration from Vault
   * @param {boolean} refresh - Force refresh from Vault
   * @returns {Promise<object>} Configuration object
   */
  async getConfig(refresh = false) {
    const now = Date.now();
    
    // Return cache if it's still valid
    if (!refresh && this.cacheExpiry > now && Object.keys(this.configCache).length > 0) {
      return this.configCache;
    }
    
    try {
      const client = await this.initClient();
      
      // Read configuration from multiple paths
      const configPaths = [
        'compression',
        'redis',
        'rabbitmq',
        'database',
        'server'
      ];
      
      const config = {};
      
      for (const path of configPaths) {
        try {
          const result = await client.read(`${this.options.basePath}/${path}`);
          config[path] = result.data.data;
        } catch (error) {
          logger.warn(`Unable to read ${path} configuration from Vault:`, error.message);
        }
      }
      
      // Update cache
      this.configCache = config;
      this.cacheExpiry = now + this.options.cacheTTL;
      
      return config;
    } catch (error) {
      logger.error('Error retrieving configuration from Vault:', error);
      
      // Return existing cache if available
      if (Object.keys(this.configCache).length > 0) {
        logger.warn('Using cached configuration');
        return this.configCache;
      }
      
      // Return default configuration
      return {
        server: {
          port: 3003,
          host: '0.0.0.0'
        },
        compression: {
          enabled: true,
          threshold: 5120,
          level: 3,
          enableMetrics: true
        },
        redis: {
          host: 'localhost',
          port: 6379
        },
        rabbitmq: {
          host: 'localhost',
          port: 5672,
          user: 'admin',
          password: 'admin123'
        },
        database: {
          host: 'localhost',
          port: 5432,
          name: 'notification_db',
          user: 'admin',
          password: 'admin123'
        }
      };
    }
  }
  
  /**
   * Start configuration watcher to periodically refresh configuration
   * @param {number} interval - Refresh interval in milliseconds
   * @returns {object} Watcher control
   */
  startConfigWatcher(interval = 60000) {
    const intervalId = setInterval(async () => {
      try {
        await this.getConfig(true);
        logger.debug('Configuration updated from Vault');
      } catch (error) {
        logger.error('Error in config watcher:', error);
      }
    }, interval);
    
    // Handle process termination
    process.on('SIGTERM', () => {
      clearInterval(intervalId);
    });
    
    return {
      stop: () => clearInterval(intervalId)
    };
  }
}

// Create and export singleton instance
const vaultProvider = new VaultConfigProvider();

module.exports = vaultProvider;
