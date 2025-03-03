// src/core/api/base-controller.js
const logger = require('../logging');

/**
 * Base Controller class for standardized CRUD operations
 */
class BaseController {
  /**
   * Create a new base controller
   * @param {Model} model - Sequelize model
   * @param {object} options - Controller options
   */
  constructor(model, options = {}) {
    this.model = model;
    this.options = {
      idParam: 'id',
      defaultLimit: 20,
      maxLimit: 100,
      softDelete: true,
      ...options
    };
    
    // Bind methods to make them available for routes
    this.list = this.list.bind(this);
    this.get = this.get.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.patch = this.patch.bind(this);
    this.delete = this.delete.bind(this);
  }
  
  /**
   * Parse pagination parameters
   * @param {object} query - Request query parameters
   * @returns {object} Pagination options
   * @private
   */
  _getPaginationOptions(query) {
    const page = parseInt(query.page, 10) || 1;
    let limit = parseInt(query.limit, 10) || this.options.defaultLimit;
    
    // Ensure limit doesn't exceed maximum
    if (limit > this.options.maxLimit) {
      limit = this.options.maxLimit;
    }
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  }
  
  /**
   * Parse sorting parameters
   * @param {object} query - Request query parameters
   * @returns {Array<Array<string>>} Sort order
   * @private
   */
  _getSortOptions(query) {
    // Default sort order
    let sortOrder = [];
    
    if (query.sort) {
      // Parse sort parameter (field:direction,field:direction)
      sortOrder = query.sort.split(',').map(item => {
        const [field, direction] = item.split(':');
        return [field, direction === 'desc' ? 'DESC' : 'ASC'];
      });
    } else if (this.options.defaultSort) {
      // Use default sort order
      sortOrder = this.options.defaultSort;
    }
    
    return sortOrder;
  }
  
  /**
   * Parse filter parameters
   * @param {object} query - Request query parameters
   * @returns {object} Filter options
   * @private
   */
  _getFilterOptions(query) {
    const filters = {};
    
    // Apply allowed filters
    if (this.options.allowedFilters) {
      for (const filter of this.options.allowedFilters) {
        if (query[filter] !== undefined) {
          filters[filter] = query[filter];
        }
      }
    }
    
    return filters;
  }
  
  /**
   * Get list of resources
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   * @returns {Promise<void>}
   */
  async list(req, res, next) {
    try {
      // Get pagination options
      const { limit, offset } = this._getPaginationOptions(req.query);
      
      // Get sort options
      const order = this._getSortOptions(req.query);
      
      // Get filter options
      const where = this._getFilterOptions(req.query);
      
      // Handle soft deletes
      if (this.options.softDelete) {
        where.deleted_at = null;
      }
      
      // Find all resources with pagination
      const result = await this.model.findAndCountAll({
        where,
        order,
        limit,
        offset,
        ...this.options.listOptions
      });
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(result.count / limit);
      const currentPage = Math.floor(offset / limit) + 1;
      
      // Format response
      return res.success({
        data: result.rows,
        meta: {
          total: result.count,
          page: currentPage,
          limit,
          pages: totalPages
        }
      });
    } catch (error) {
      logger.error('Error in list controller:', error);
      next(error);
    }
  }
  
  /**
   * Get a single resource
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   * @returns {Promise<void>}
   */
  async get(req, res, next) {
    try {
      const id = req.params[this.options.idParam];
      
      // Build query options
      const options = { ...this.options.getOptions };
      
      // Handle soft deletes
      if (this.options.softDelete) {
        options.where = { deleted_at: null };
      }
      
      // Find resource by ID
      const item = await this.model.findByPk(id, options);
      
      // Return 404 if not found
      if (!item) {
        return res.notFound(`${this.model.name} not found`);
      }
      
      return res.success({ data: item });
    } catch (error) {
      logger.error('Error in get controller:', error);
      next(error);
    }
  }
  
  /**
   * Create a new resource
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   * @returns {Promise<void>}
   */
  async create(req, res, next) {
    try {
      // Allow beforeCreate hook to modify data
      let data = req.body;
      
      if (typeof this.beforeCreate === 'function') {
        data = await this.beforeCreate(data, req);
      }
      
      // Create resource
      const item = await this.model.create(data, this.options.createOptions);
      
      // Allow afterCreate hook to modify response
      let result = item;
      
      if (typeof this.afterCreate === 'function') {
        result = await this.afterCreate(item, req);
      }
      
      return res.created({ data: result });
    } catch (error) {
      logger.error('Error in create controller:', error);
      next(error);
    }
  }
  
  /**
   * Update a resource (replace)
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   * @returns {Promise<void>}
   */
  async update(req, res, next) {
    try {
      const id = req.params[this.options.idParam];
      
      // Build query options
      const options = { ...this.options.updateOptions };
      
      // Handle soft deletes
      if (this.options.softDelete) {
        options.where = { deleted_at: null };
      }
      
      // Find resource by ID
      const item = await this.model.findByPk(id, options);
      
      // Return 404 if not found
      if (!item) {
        return res.notFound(`${this.model.name} not found`);
      }
      
      // Allow beforeUpdate hook to modify data
      let data = req.body;
      
      if (typeof this.beforeUpdate === 'function') {
        data = await this.beforeUpdate(data, item, req);
      }
      
      // Update resource
      await item.update(data);
      
      // Allow afterUpdate hook to modify response
      let result = item;
      
      if (typeof this.afterUpdate === 'function') {
        result = await this.afterUpdate(item, req);
      }
      
      return res.success({ data: result });
    } catch (error) {
      logger.error('Error in update controller:', error);
      next(error);
    }
  }
  
  /**
   * Partially update a resource
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   * @returns {Promise<void>}
   */
  async patch(req, res, next) {
    try {
      const id = req.params[this.options.idParam];
      
      // Build query options
      const options = { ...this.options.patchOptions };
      
      // Handle soft deletes
      if (this.options.softDelete) {
        options.where = { deleted_at: null };
      }
      
      // Find resource by ID
      const item = await this.model.findByPk(id, options);
      
      // Return 404 if not found
      if (!item) {
        return res.notFound(`${this.model.name} not found`);
      }
      
      // Allow beforePatch hook to modify data
      let data = req.body;
      
      if (typeof this.beforePatch === 'function') {
        data = await this.beforePatch(data, item, req);
      }
      
      // Update only provided fields
      await item.update(data);
      
      // Allow afterPatch hook to modify response
      let result = item;
      
      if (typeof this.afterPatch === 'function') {
        result = await this.afterPatch(item, req);
      }
      
      return res.success({ data: result });
    } catch (error) {
      logger.error('Error in patch controller:', error);
      next(error);
    }
  }
  
  /**
   * Delete a resource
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   * @returns {Promise<void>}
   */
  async delete(req, res, next) {
    try {
      const id = req.params[this.options.idParam];
      
      // Build query options
      const options = { ...this.options.deleteOptions };
      
      // Handle soft deletes
      if (this.options.softDelete) {
        options.where = { deleted_at: null };
      }
      
      // Find resource by ID
      const item = await this.model.findByPk(id, options);
      
      // Return 404 if not found
      if (!item) {
        return res.notFound(`${this.model.name} not found`);
      }
      
      // Allow beforeDelete hook
      if (typeof this.beforeDelete === 'function') {
        await this.beforeDelete(item, req);
      }
      
      // Delete or soft delete resource
      if (this.options.softDelete) {
        await item.update({ deleted_at: new Date() });
      } else {
        await item.destroy();
      }
      
      // Allow afterDelete hook
      if (typeof this.afterDelete === 'function') {
        await this.afterDelete(item, req);
      }
      
      return res.noContent();
    } catch (error) {
      logger.error('Error in delete controller:', error);
      next(error);
    }
  }
}

module.exports = BaseController;
