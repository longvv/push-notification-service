// src/core/api/validator.js

/**
 * Validator utility for API requests
 */
class Validator {
  /**
   * Create a validator middleware using schema
   * @param {object} schema - Validation schema
   * @param {string} location - Request property to validate (body, query, params)
   * @returns {function} Express middleware
   */
  static validate(schema, location = 'body') {
    return (req, res, next) => {
      const data = req[location];
      const errors = Validator.validateData(data, schema);
      
      if (errors.length > 0) {
        return res.validationError(errors);
      }
      
      next();
    };
  }
  
  /**
   * Validate data against schema
   * @param {object} data - Data to validate
   * @param {object} schema - Validation schema
   * @returns {string[]} Validation errors
   */
  static validateData(data, schema) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      // Skip other validations if the field is not present
      if (value === undefined || value === null) {
        continue;
      }
      
      // Type check
      if (rules.type) {
        const type = typeof value;
        if (rules.type === 'array' && !Array.isArray(value)) {
          errors.push(`${field} must be an array`);
        } else if (rules.type === 'number' && type !== 'number') {
          errors.push(`${field} must be a number`);
        } else if (rules.type === 'string' && type !== 'string') {
          errors.push(`${field} must be a string`);
        } else if (rules.type === 'boolean' && type !== 'boolean') {
          errors.push(`${field} must be a boolean`);
        } else if (rules.type === 'object' && (type !== 'object' || Array.isArray(value))) {
          errors.push(`${field} must be an object`);
        }
      }
      
      // Min/max checks for numbers
      if (rules.type === 'number' || type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }
      
      // Min/max length checks for strings
      if ((rules.type === 'string' || type === 'string') && type === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
      }
      
      // Pattern check for strings
      if ((rules.type === 'string' || type === 'string') && rules.pattern) {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          errors.push(`${field} has an invalid format`);
        }
      }
      
      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
      
      // Min/max items check for arrays
      if ((rules.type === 'array' || Array.isArray(value)) && Array.isArray(value)) {
        if (rules.minItems !== undefined && value.length < rules.minItems) {
          errors.push(`${field} must contain at least ${rules.minItems} items`);
        }
        if (rules.maxItems !== undefined && value.length > rules.maxItems) {
          errors.push(`${field} must contain at most ${rules.maxItems} items`);
        }
        
        // Items validation
        if (rules.items && Array.isArray(value)) {
          value.forEach((item, index) => {
            const itemErrors = Validator.validateData({ item }, { item: rules.items });
            
            if (itemErrors.length > 0) {
              errors.push(`${field}[${index}]: ${itemErrors.join(', ')}`);
            }
          });
        }
      }
      
      // Custom validation function
      if (rules.validate && typeof rules.validate === 'function') {
        try {
          const customErrors = rules.validate(value, data);
          
          if (Array.isArray(customErrors) && customErrors.length > 0) {
            errors.push(...customErrors);
          } else if (typeof customErrors === 'string') {
            errors.push(customErrors);
          } else if (customErrors === false) {
            errors.push(`${field} is invalid`);
          }
        } catch (error) {
          errors.push(`${field} validation error: ${error.message}`);
        }
      }
    }
    
    // Check for unknown fields
    if (schema._allowUnknown === false) {
      const schemaKeys = Object.keys(schema).filter(key => !key.startsWith('_'));
      const dataKeys = Object.keys(data);
      
      for (const key of dataKeys) {
        if (!schemaKeys.includes(key)) {
          errors.push(`Unknown field: ${key}`);
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Create a schema object for validation
   * @param {object} schema - Schema definition
   * @returns {object} Validation schema
   */
  static createSchema(schema) {
    return schema;
  }
  
  /**
   * Create a schema with required fields
   * @param {string[]} fields - Required field names
   * @param {object} schema - Existing schema (optional)
   * @returns {object} Validation schema
   */
  static requiredFields(fields, schema = {}) {
    const result = { ...schema };
    
    for (const field of fields) {
      if (!result[field]) {
        result[field] = {};
      }
      
      result[field].required = true;
    }
    
    return result;
  }
}

module.exports = Validator;
