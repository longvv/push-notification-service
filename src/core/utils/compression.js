// src/core/utils/compression.js
const zstd = require('node-zstandard');
const configManager = require('../config/manager');
const logger = require('../logging');

/**
 * Check if data should be compressed
 * @param {any} data - Data to check
 * @returns {Promise<boolean>} True if should be compressed
 */
async function shouldCompress(data) {
  // Get compression config
  const config = configManager.getSection('compression');
  
  // If compression is disabled, return false
  if (config.enabled === false) {
    return false;
  }
  
  // Get compression threshold (default 5KB)
  const threshold = config.threshold || 5120;
  
  // Get data size
  const size = Buffer.isBuffer(data) 
    ? data.length 
    : Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));
  
  // Return true if size exceeds threshold
  return size > threshold;
}

/**
 * Compress data if it exceeds threshold
 * @param {any} data - Data to compress
 * @param {object} options - Compression options
 * @returns {Promise<object>} Compressed data and metadata
 */
async function maybeCompress(data, options = {}) {
  // Get compression config
  const config = configManager.getSection('compression');
  
  // Prepare data and metadata
  let buffer;
  let metadata = { compressed: false, originalType: typeof data };
  
  // Convert data to buffer
  if (Buffer.isBuffer(data)) {
    buffer = data;
    metadata.originalType = 'buffer';
  } else if (typeof data === 'string') {
    buffer = Buffer.from(data);
  } else {
    buffer = Buffer.from(JSON.stringify(data));
    metadata.originalType = 'object';
  }
  
  // Check if should compress
  if ((options.force === true || await shouldCompress(buffer)) && config.enabled !== false) {
    const level = options.level || config.level || 3;
    
    try {
      // Compress the data
      const startTime = process.hrtime();
      const compressed = await zstd.compress(buffer, { level });
      
      // Record metrics
      const endTime = process.hrtime(startTime);
      const timeInMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
      
      if (config.enableMetrics !== false) {
        // Get metrics provider if available
        const metrics = global.metrics?.compression;
        
        if (metrics) {
          metrics.compressionOperations.inc({ operation: 'compress', compressed: 'true' });
          metrics.compressionTime.observe({ operation: 'compress' }, timeInMs / 1000);
          metrics.compressionRatio.observe(buffer.length / compressed.length);
        }
      }
      
      // Return compressed data with metadata
      metadata.compressed = true;
      return { data: compressed, metadata };
    } catch (error) {
      logger.error('Compression error:', error);
      // Return original data if compression fails
      return { data: buffer, metadata };
    }
  }
  
  // Return original data if not compressing
  return { data: buffer, metadata };
}

/**
 * Decompress data if it was compressed
 * @param {object} package - Data package with metadata
 * @returns {Promise<any>} Decompressed data
 */
async function maybeDecompress(package) {
  const { data, metadata } = package;
  
  // If not compressed, convert back to original format
  if (!metadata || !metadata.compressed) {
    if (metadata?.originalType === 'buffer') {
      return data;
    } else if (metadata?.originalType === 'string') {
      return data.toString();
    } else if (metadata?.originalType === 'object') {
      return JSON.parse(data.toString());
    }
    
    // If no metadata, return as is
    return data;
  }
  
  try {
    // Get compression config
    const config = configManager.getSection('compression');
    
    // Decompress the data
    const startTime = process.hrtime();
    const decompressed = await zstd.decompress(data);
    
    // Record metrics
    const endTime = process.hrtime(startTime);
    const timeInMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
    
    if (config.enableMetrics !== false) {
      // Get metrics provider if available
      const metrics = global.metrics?.compression;
      
      if (metrics) {
        metrics.compressionOperations.inc({ operation: 'decompress', compressed: 'true' });
        metrics.compressionTime.observe({ operation: 'decompress' }, timeInMs / 1000);
      }
    }
    
    // Convert back to original format
    if (metadata.originalType === 'buffer') {
      return decompressed;
    } else if (metadata.originalType === 'string') {
      return decompressed.toString();
    } else if (metadata.originalType === 'object') {
      return JSON.parse(decompressed.toString());
    }
    
    // Default to returning the decompressed buffer
    return decompressed;
  } catch (error) {
    logger.error('Decompression error:', error);
    
    // Return original data if decompression fails
    return data;
  }
}

module.exports = {
  shouldCompress,
  maybeCompress,
  maybeDecompress
};
