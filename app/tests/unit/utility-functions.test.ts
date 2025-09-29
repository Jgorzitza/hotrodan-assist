import { describe, it, expect, beforeEach } from 'vitest';

// Mock the UtilityFunctions class for testing
class UtilityFunctions {
    public cache: Map<string, any>;
    public metrics: any;

    constructor() {
        this.cache = new Map();
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            operationsPerformed: 0
        };
    }

    getCached(key: string, generator: () => any, ttl = 300000) {
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

    sanitizeString(str: string) {
        if (typeof str !== 'string') return '';
        return str.trim().replace(/[<>\"'&]/g, (match: string) => {
            const entities: any = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
            return entities[match];
        });
    }

    generateSlug(str: string) {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    isValidEmail(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidUrl(url: string) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
        };
    }
}

describe('UtilityFunctions', () => {
    let utils: UtilityFunctions;

    beforeEach(() => {
        utils = new UtilityFunctions();
    });

    describe('Caching', () => {
        it('should cache data correctly', () => {
            const generator = () => 'test-data';
            const result1 = utils.getCached('test-key', generator);
            const result2 = utils.getCached('test-key', generator);
            
            expect(result1).toBe('test-data');
            expect(result2).toBe('test-data');
            expect(utils.getMetrics().cacheHits).toBe(1);
        });

        it('should handle cache misses', () => {
            const generator = () => 'test-data';
            utils.getCached('test-key', generator);
            
            expect(utils.getMetrics().cacheMisses).toBe(1);
        });
    });

    describe('String Utilities', () => {
        it('should sanitize strings correctly', () => {
            const input = '<script>alert("xss")</script>';
            const result = utils.sanitizeString(input);
            
            expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        });

        it('should generate slugs correctly', () => {
            const input = 'Hello World! 123 Test';
            const result = utils.generateSlug(input);
            
            expect(result).toBe('hello-world-123-test');
        });

        it('should handle empty strings', () => {
            expect(utils.sanitizeString('')).toBe('');
            expect(utils.generateSlug('')).toBe('');
        });
    });

    describe('Validation', () => {
        it('should validate emails correctly', () => {
            expect(utils.isValidEmail('test@example.com')).toBe(true);
            expect(utils.isValidEmail('invalid-email')).toBe(false);
            expect(utils.isValidEmail('')).toBe(false);
        });

        it('should validate URLs correctly', () => {
            expect(utils.isValidUrl('https://example.com')).toBe(true);
            expect(utils.isValidUrl('http://localhost:3000')).toBe(true);
            expect(utils.isValidUrl('invalid-url')).toBe(false);
        });
    });

    describe('Metrics', () => {
        it('should track metrics correctly', () => {
            const generator = () => 'test';
            utils.getCached('key1', generator);
            utils.getCached('key1', generator); // Cache hit
            utils.getCached('key2', generator); // Cache miss
            
            const metrics = utils.getMetrics();
            expect(metrics.cacheHits).toBe(1);
            expect(metrics.cacheMisses).toBe(2);
            expect(metrics.cacheSize).toBe(2);
        });
    });
});
