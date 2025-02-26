// src/utils/compression.js
const zstd = require('node-zstandard');
const { getConfig } = require('../config/vault');
const { metrics } = require('../config/metrics');
const logger = require('../config/logging');

// Ngưỡng kích thước để áp dụng nén (tính bằng byte)
const COMPRESSION_THRESHOLD = 5 * 1024; // 5KB

const getCompressionConfig = async () => {
  const config = await getConfig();
  return config.compression || {
    enabled: true,
    threshold: 5 * 1024, // 5KB
    level: 3
  };
};

// Hàm kiểm tra xem dữ liệu có nên được nén hay không
const shouldCompress = async (data) => {
  // Lấy cấu hình hiện tại
  const config = await getCompressionConfig();
  
  // Nếu tính năng nén bị tắt, luôn trả về false
  if (!config.enabled) {
    return false;
  }
  
  // Kiểm tra kích thước dữ liệu
  const size = Buffer.isBuffer(data) 
    ? data.length 
    : Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));
  
  return size > config.threshold;
};

// Nén dữ liệu nếu vượt ngưỡng
const maybeCompress = async (data, options = { level: 3 }) => {
  const config = await getCompressionConfig();
  let buffer;
  let metadata = { compressed: false, originalType: typeof data };
  
  // Chuẩn bị dữ liệu
  if (Buffer.isBuffer(data)) {
    buffer = data;
    metadata.originalType = 'buffer';
  } else if (typeof data === 'string') {
    buffer = Buffer.from(data);
  } else {
    buffer = Buffer.from(JSON.stringify(data));
    metadata.originalType = 'object';
  }
  
  // Kiểm tra nếu nên nén
  if (await shouldCompress(buffer)) {
    const startTime = process.hrtime();
    const originalSize = buffer.length;
    
    try {
      const compressed = await zstd.compress(buffer, {
        level: config.level || 3
      });
      
      // Ghi nhận metrics nếu được bật
      if (config.enableMetrics) {
        const endTime = process.hrtime(startTime);
        const timeInSeconds = endTime[0] + endTime[1] / 1e9;
        
        metrics.compressionStats.inc({ operation: 'compress', compressed: 'true' });
        metrics.compressionTime.observe({ operation: 'compress' }, timeInSeconds);
        metrics.compressionRatio.observe(originalSize / compressed.length);
      }
      
      metadata.compressed = true;
      return { data: compressed, metadata };
    } catch (error) {
      logger.error('Compression error:', error);
      // Nếu nén thất bại, trả về dữ liệu gốc
      return { data: buffer, metadata };
    }
  }
  
  // Trả về nguyên dạng nếu không nén
  if (config.enableMetrics) {
    metrics.compressionStats.inc({ operation: 'compress', compressed: 'false' });
  }
  
  return { data: buffer, metadata };
};

// Giải nén dữ liệu nếu cần
const maybeDecompress = async (dataPackage) => {
  const { data, metadata } = dataPackage;
  
  // Nếu dữ liệu không được nén, chuyển về định dạng ban đầu
  if (!metadata.compressed) {
    if (metadata.originalType === 'buffer') {
      return data;
    } else if (metadata.originalType === 'string') {
      return data.toString();
    } else if (metadata.originalType === 'object') {
      return JSON.parse(data.toString());
    }
    return data;
  }
  
  // Giải nén dữ liệu
  const decompressed = await zstd.decompress(data);
  
  // Chuyển về định dạng ban đầu
  if (metadata.originalType === 'buffer') {
    return decompressed;
  } else if (metadata.originalType === 'string') {
    return decompressed.toString();
  } else if (metadata.originalType === 'object') {
    return JSON.parse(decompressed.toString());
  }
  
  return decompressed;
};

module.exports = {
  shouldCompress,
  maybeCompress,
  maybeDecompress
};