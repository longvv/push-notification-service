const fs = require('fs').promises;
const path = require('path');
const vault = require('node-vault');
const logger = require('./logging');

// Đọc token từ file (được mount từ Docker)
const getVaultToken = async () => {
    try {

        if (process.env.NODE_ENV !== 'production') {
            return 'dev-token';  // Token mặc định khi dev local
        }
        
        if (process.env.VAULT_TOKEN) {
            return process.env.VAULT_TOKEN;
        }

        try {
            const tokenFile = process.env.VAULT_TOKEN_FILE || '/vault/config/notification-token';
            await fs.access(tokenFile);
            return await fs.readFile(tokenFile, 'utf8');
        } catch (accessError) {
            // Nếu đang chạy local, kiểm tra ở đường dẫn local
            const isRunningLocally = tokenFile.includes('/vault/') && !require('fs').existsSync(tokenFile);
            if (isRunningLocally) {
                // Sử dụng đường dẫn local (thay thế với đường dẫn file token thực tế trên máy của bạn)
                const localTokenPath = './vault-init/notification-token';
                return await fs.readFile(localTokenPath, 'utf8');
            }
            throw accessError;
        }
    } catch (error) {
        logger.error('Không thể đọc Vault token:', error);
        // Fallback vào default token hoặc env var
        return process.env.VAULT_TOKEN || 'dev-token';
    }
};

// Khởi tạo Vault client
const initVaultClient = async () => {
    const token = await getVaultToken();
    return vault({
        apiVersion: 'v1',
        endpoint: process.env.VAULT_ADDR || 'http://vault:8200',
        token: token.trim()
    });
};

const startConfigWatcher = () => {
    // Cập nhật cấu hình mỗi phút
    const intervalId = setInterval(async () => {
        try {
            await getConfig(true); // Làm mới cache
            logger.debug('Configuration updated from Vault');
        } catch (error) {
            logger.error('Error in config watcher:', error);
        }
    }, 60 * 1000);

    // Xử lý khi process kết thúc
    process.on('SIGTERM', () => {
        clearInterval(intervalId);
    });

    return {
        stop: () => clearInterval(intervalId)
    };
};

// Cache cấu hình
let configCache = {};
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 phút

// Lấy cấu hình từ Vault
const getConfig = async (refresh = false, retryCount = 0) => {
    const now = Date.now();

    // Trả về cache nếu còn hợp lệ
    if (!refresh && cacheExpiry > now && Object.keys(configCache).length > 0) {
        return configCache;
    }

    try {
        const client = await initVaultClient();

        // Đọc cấu hình
        const compressionResult = await client.read('secret/data/notification-service/compression');
        const redisResult = await client.read('secret/data/notification-service/redis');
        const rabbitmqResult = await client.read('secret/data/notification-service/rabbitmq');

        // Cấu trúc dữ liệu trả về từ Vault KV version 2
        configCache = {
            compression: compressionResult.data.data,
            redis: redisResult.data.data,
            rabbitmq: rabbitmqResult.data.data
        };

        cacheExpiry = now + CACHE_TTL;
        return configCache;
    } catch (error) {
        logger.error('Lỗi khi truy xuất cấu hình từ Vault:', error);

        // Sử dụng cache cũ nếu có
        if (Object.keys(configCache).length > 0) {
            logger.warn('Sử dụng cache cũ cho cấu hình');
            return configCache;
        }

        if (retryCount < 3 && (error.message.includes('ECONNREFUSED') || error.message.includes('connection'))) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            logger.info(`Retrying Vault connection in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return getConfig(refresh, retryCount + 1);
        }

        // Fallback vào cấu hình mặc định
        return {
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
            }
        };
    }
};

module.exports = {
    getConfig,
    startConfigWatcher,
    refreshConfig: () => getConfig(true)
};