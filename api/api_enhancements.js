// API Enhancement Functions
// Manager Direct Implementation - High-Performance API System

const UtilityFunctions = require('../utils/utility_functions');

class APIEnhancements {
    constructor() {
        this.utils = new UtilityFunctions();
        this.rateLimits = new Map();
        this.apiMetrics = {
            requestsProcessed: 0,
            averageResponseTime: 0,
            errorRate: 0,
            cacheHitRate: 0
        };
    }

    // Request Processing Enhancements
    async processRequest(request, responseHandler) {
        const startTime = performance.now();
        
        try {
            // Validate request
            const validationResult = this.validateRequest(request);
            if (!validationResult.valid) {
                return this.createErrorResponse(400, validationResult.errors);
            }

            // Check rate limiting
            const rateLimitResult = this.checkRateLimit(request);
            if (!rateLimitResult.allowed) {
                return this.createErrorResponse(429, 'Rate limit exceeded');
            }

            // Process request
            const result = await responseHandler(request);
            
            // Update metrics
            const endTime = performance.now();
            this.updateMetrics(endTime - startTime, false);
            
            return this.createSuccessResponse(result);
        } catch (error) {
            const endTime = performance.now();
            this.updateMetrics(endTime - startTime, true);
            
            console.error('🚨 API Error:', error);
            return this.createErrorResponse(500, 'Internal server error');
        }
    }

    // Health Check
    getHealthStatus() {
        return {
            status: 'healthy',
            metrics: this.apiMetrics,
            timestamp: new Date().toISOString()
        };
    }

    // Response Helpers
    createSuccessResponse(data, statusCode = 200) {
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'X-Response-Time': Date.now().toString()
            },
            body: JSON.stringify({
                success: true,
                data,
                timestamp: new Date().toISOString()
            })
        };
    }

    createErrorResponse(statusCode, message) {
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: message,
                timestamp: new Date().toISOString()
            })
        };
    }
}

module.exports = APIEnhancements;
