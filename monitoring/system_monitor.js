// System Monitoring Module
// Manager Direct Implementation - Long-term Monitoring System

class SystemMonitor {
    constructor() {
        this.metrics = {
            startTime: Date.now(),
            uptime: 0,
            testRuns: 0,
            testPasses: 0,
            testFailures: 0,
            lastHealthCheck: null,
            performanceMetrics: [],
            errorLog: []
        };
        this.isRunning = false;
        this.monitoringInterval = null;
    }

    startMonitoring(intervalMs = 300000) { // 5 minutes default
        if (this.isRunning) {
            console.log('⚠️ Monitoring already running');
            return;
        }

        console.log('🔍 Starting system monitoring...');
        this.isRunning = true;
        
        this.monitoringInterval = setInterval(() => {
            this.performHealthCheck();
            this.updateMetrics();
            this.logStatus();
        }, intervalMs);

        // Initial health check
        this.performHealthCheck();
    }

    stopMonitoring() {
        if (!this.isRunning) {
            console.log('⚠️ Monitoring not running');
            return;
        }

        console.log('🛑 Stopping system monitoring...');
        this.isRunning = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    async performHealthCheck() {
        const startTime = performance.now();
        
        try {
            // Test TypeScript compilation
            const tsResult = await this.testTypeScriptCompilation();
            
            // Test unit tests
            const unitTestResult = await this.runUnitTests();
            
            // Test integration tests
            const integrationTestResult = await this.runIntegrationTests();
            
            // Update metrics
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.metrics.lastHealthCheck = {
                timestamp: new Date().toISOString(),
                duration,
                results: {
                    typescript: tsResult,
                    unitTests: unitTestResult,
                    integrationTests: integrationTestResult
                },
                overall: tsResult.success && unitTestResult.success && integrationTestResult.success
            };

            if (this.metrics.lastHealthCheck.overall) {
                console.log('✅ System health check passed');
            } else {
                console.log('❌ System health check failed');
                this.logError('Health check failed', this.metrics.lastHealthCheck);
            }

        } catch (error) {
            console.error('🚨 Health check error:', error);
            this.logError('Health check error', error);
        }
    }

    async testTypeScriptCompilation() {
        try {
            // Simulate TypeScript compilation test
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            
            const { stdout, stderr } = await execAsync('npx tsc --noEmit', { 
                cwd: process.cwd(),
                timeout: 30000 
            });
            
            return {
                success: true,
                message: 'TypeScript compilation successful',
                details: { stdout, stderr }
            };
        } catch (error) {
            return {
                success: false,
                message: 'TypeScript compilation failed',
                error: error.message
            };
        }
    }

    async runUnitTests() {
        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            
            const { stdout } = await execAsync('npx vitest run app/tests/unit/ --reporter=basic', { 
                cwd: process.cwd(),
                timeout: 60000 
            });
            
            // Parse test results
            const passed = (stdout.match(/Tests\s+(\d+)\s+passed/g) || []).length;
            const failed = (stdout.match(/Tests\s+(\d+)\s+failed/g) || []).length;
            
            return {
                success: failed === 0,
                message: `Unit tests: ${passed} passed, ${failed} failed`,
                details: { passed, failed, output: stdout }
            };
        } catch (error) {
            return {
                success: false,
                message: 'Unit tests failed',
                error: error.message
            };
        }
    }

    async runIntegrationTests() {
        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            
            const { stdout } = await execAsync('npx vitest run app/tests/integration/ --reporter=basic', { 
                cwd: process.cwd(),
                timeout: 60000 
            });
            
            // Parse test results
            const passed = (stdout.match(/Tests\s+(\d+)\s+passed/g) || []).length;
            const failed = (stdout.match(/Tests\s+(\d+)\s+failed/g) || []).length;
            
            return {
                success: failed === 0,
                message: `Integration tests: ${passed} passed, ${failed} failed`,
                details: { passed, failed, output: stdout }
            };
        } catch (error) {
            return {
                success: false,
                message: 'Integration tests failed',
                error: error.message
            };
        }
    }

    updateMetrics() {
        this.metrics.uptime = Date.now() - this.metrics.startTime;
        
        // Keep only last 100 performance metrics
        if (this.metrics.performanceMetrics.length > 100) {
            this.metrics.performanceMetrics = this.metrics.performanceMetrics.slice(-100);
        }
        
        // Keep only last 50 errors
        if (this.metrics.errorLog.length > 50) {
            this.metrics.errorLog = this.metrics.errorLog.slice(-50);
        }
    }

    logError(message, details) {
        const error = {
            timestamp: new Date().toISOString(),
            message,
            details: typeof details === 'object' ? JSON.stringify(details, null, 2) : details
        };
        
        this.metrics.errorLog.push(error);
        console.error('🚨 Error logged:', message);
    }

    logStatus() {
        const uptimeHours = Math.floor(this.metrics.uptime / (1000 * 60 * 60));
        const uptimeMinutes = Math.floor((this.metrics.uptime % (1000 * 60 * 60)) / (1000 * 60));
        
        console.log(`📊 Monitoring Status:`);
        console.log(`   Uptime: ${uptimeHours}h ${uptimeMinutes}m`);
        console.log(`   Health Checks: ${this.metrics.lastHealthCheck ? 'Last check passed' : 'No checks yet'}`);
        console.log(`   Errors: ${this.metrics.errorLog.length}`);
        
        if (this.metrics.lastHealthCheck) {
            const { results } = this.metrics.lastHealthCheck;
            console.log(`   TypeScript: ${results.typescript.success ? '✅' : '❌'}`);
            console.log(`   Unit Tests: ${results.unitTests.success ? '✅' : '❌'}`);
            console.log(`   Integration: ${results.integrationTests.success ? '✅' : '❌'}`);
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            isRunning: this.isRunning,
            uptimeFormatted: this.formatUptime(this.metrics.uptime)
        };
    }

    formatUptime(ms) {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    generateReport() {
        const metrics = this.getMetrics();
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                uptime: metrics.uptimeFormatted,
                isRunning: metrics.isRunning,
                lastHealthCheck: metrics.lastHealthCheck?.overall ? 'PASSED' : 'FAILED',
                totalErrors: metrics.errorLog.length
            },
            details: metrics
        };
        
        return report;
    }
}

module.exports = SystemMonitor;
