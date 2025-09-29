// Utility Functions Module
// Manager Direct Implementation - High-Impact Utility System

class UtilityFunctions {
    constructor() {
        this.cache = new Map();
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            operationsPerformed: 0
        };
    }

    // Data Processing Utilities
    async processDataInBatches(data, batchSize = 100, processor) {
        const results = [];
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(processor));
            results.push(...batchResults);
            this.metrics.operationsPerformed += batch.length;
        }
        return results;
    }

    // Caching Utilities
    getCached(key, generator, ttl = 300000) { // 5 minutes default TTL
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < ttl) {
            this.metrics.cacheHits++;
            return cached.data;
        }
        
        this.metrics.cacheMisses++;
        const data = generator();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    }

    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // String Utilities
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str.trim().replace(/[<>\"'&]/g, (match) => {
            const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
            return entities[match];
        });
    }

    generateSlug(str) {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    // Performance Utilities
    async measurePerformance(name, operation) {
        const start = performance.now();
        const result = await operation();
        const end = performance.now();
        const duration = end - start;
        
        console.log(`⚡ Performance: ${name} took ${duration.toFixed(2)}ms`);
        return { result, duration };
    }

    // Validation Utilities
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // Error Handling Utilities
    async retryOperation(operation, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) throw error;
                console.log(`🔄 Retry attempt ${attempt}/${maxRetries} failed:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }

    // Metrics and Monitoring
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
        };
    }
}

module.exports = UtilityFunctions;
