// Advanced Scalability Management System
// Manager Direct Implementation - Critical Scalability Enhancement

class ScalabilityManager {
    constructor() {
        this.instances = new Map();
        this.loadBalancer = {
            active: true,
            algorithm: 'round_robin',
            healthChecks: true,
            stickySessions: false
        };
        this.autoScaling = {
            enabled: true,
            minInstances: 2,
            maxInstances: 10,
            targetCPU: 70,
            targetMemory: 80,
            scaleUpThreshold: 80,
            scaleDownThreshold: 30
        };
        this.metrics = {
            currentInstances: 2,
            totalRequests: 0,
            avgResponseTime: 0,
            errorRate: 0,
            throughput: 0
        };
        this.init();
    }

    init() {
        console.log('🚀 Scalability Manager Initializing...');
        this.initializeInstances();
        this.setupLoadBalancer();
        this.startAutoScaling();
        this.monitorPerformance();
    }

    initializeInstances() {
        console.log('🖥️ Initializing application instances...');
        
        // Create initial instances
        for (let i = 1; i <= this.autoScaling.minInstances; i++) {
            this.createInstance(i);
        }
        
        console.log(`✅ Initialized ${this.autoScaling.minInstances} instances`);
    }

    createInstance(id) {
        const instance = {
            id: `instance-${id}`,
            status: 'running',
            cpu: 0,
            memory: 0,
            requests: 0,
            errors: 0,
            startTime: new Date().toISOString(),
            health: 'healthy'
        };
        
        this.instances.set(instance.id, instance);
        console.log(`🖥️ Created instance: ${instance.id}`);
        
        return instance;
    }

    setupLoadBalancer() {
        console.log('⚖️ Setting up load balancer...');
        
        const loadBalancerConfig = {
            algorithm: this.loadBalancer.algorithm,
            healthChecks: this.loadBalancer.healthChecks,
            stickySessions: this.loadBalancer.stickySessions,
            instances: Array.from(this.instances.keys())
        };
        
        console.log('✅ Load balancer configured:', loadBalancerConfig);
    }

    startAutoScaling() {
        console.log('📈 Starting auto-scaling...');
        
        setInterval(() => {
            this.evaluateScaling();
            this.updateInstanceMetrics();
            this.performHealthChecks();
        }, 10000); // Check every 10 seconds
    }

    evaluateScaling() {
        console.log('📊 Evaluating scaling requirements...');
        
        const avgCPU = this.calculateAverageCPU();
        const avgMemory = this.calculateAverageMemory();
        const currentInstances = this.instances.size;
        
        console.log(`📈 Current metrics - CPU: ${avgCPU.toFixed(1)}%, Memory: ${avgMemory.toFixed(1)}%, Instances: ${currentInstances}`);
        
        // Scale up if needed
        if (avgCPU > this.autoScaling.scaleUpThreshold || avgMemory > this.autoScaling.scaleUpThreshold) {
            if (currentInstances < this.autoScaling.maxInstances) {
                this.scaleUp();
            }
        }
        
        // Scale down if possible
        if (avgCPU < this.autoScaling.scaleDownThreshold && avgMemory < this.autoScaling.scaleDownThreshold) {
            if (currentInstances > this.autoScaling.minInstances) {
                this.scaleDown();
            }
        }
    }

    calculateAverageCPU() {
        let totalCPU = 0;
        let count = 0;
        
        this.instances.forEach(instance => {
            if (instance.status === 'running') {
                totalCPU += instance.cpu;
                count++;
            }
        });
        
        return count > 0 ? totalCPU / count : 0;
    }

    calculateAverageMemory() {
        let totalMemory = 0;
        let count = 0;
        
        this.instances.forEach(instance => {
            if (instance.status === 'running') {
                totalMemory += instance.memory;
                count++;
            }
        });
        
        return count > 0 ? totalMemory / count : 0;
    }

    scaleUp() {
        const currentInstances = this.instances.size;
        const newInstanceId = currentInstances + 1;
        
        console.log(`📈 Scaling up - Creating instance ${newInstanceId}`);
        this.createInstance(newInstanceId);
        
        this.updateLoadBalancer();
        this.metrics.currentInstances = this.instances.size;
    }

    scaleDown() {
        const currentInstances = this.instances.size;
        
        if (currentInstances > this.autoScaling.minInstances) {
            // Find least loaded instance to remove
            let leastLoadedInstance = null;
            let minLoad = Infinity;
            
            this.instances.forEach(instance => {
                if (instance.status === 'running') {
                    const load = instance.cpu + instance.memory;
                    if (load < minLoad) {
                        minLoad = load;
                        leastLoadedInstance = instance;
                    }
                }
            });
            
            if (leastLoadedInstance) {
                console.log(`📉 Scaling down - Removing instance ${leastLoadedInstance.id}`);
                this.removeInstance(leastLoadedInstance.id);
                this.updateLoadBalancer();
                this.metrics.currentInstances = this.instances.size;
            }
        }
    }

    removeInstance(instanceId) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.status = 'terminated';
            console.log(`🖥️ Instance ${instanceId} terminated`);
        }
    }

    updateLoadBalancer() {
        const activeInstances = Array.from(this.instances.values())
            .filter(instance => instance.status === 'running')
            .map(instance => instance.id);
        
        console.log(`⚖️ Load balancer updated with ${activeInstances.length} active instances`);
    }

    updateInstanceMetrics() {
        this.instances.forEach(instance => {
            if (instance.status === 'running') {
                // Simulate real-time metrics
                instance.cpu = Math.random() * 100;
                instance.memory = Math.random() * 100;
                instance.requests += Math.floor(Math.random() * 10);
                instance.errors += Math.floor(Math.random() * 2);
            }
        });
        
        this.updateGlobalMetrics();
    }

    updateGlobalMetrics() {
        let totalRequests = 0;
        let totalErrors = 0;
        let totalResponseTime = 0;
        let activeInstances = 0;
        
        this.instances.forEach(instance => {
            if (instance.status === 'running') {
                totalRequests += instance.requests;
                totalErrors += instance.errors;
                totalResponseTime += Math.random() * 500; // Simulate response time
                activeInstances++;
            }
        });
        
        this.metrics.totalRequests = totalRequests;
        this.metrics.errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
        this.metrics.avgResponseTime = activeInstances > 0 ? totalResponseTime / activeInstances : 0;
        this.metrics.throughput = totalRequests / 60; // Requests per second
    }

    performHealthChecks() {
        console.log('🏥 Performing health checks...');
        
        this.instances.forEach(instance => {
            if (instance.status === 'running') {
                // Simulate health check
                const isHealthy = Math.random() > 0.05; // 95% chance of being healthy
                
                if (!isHealthy) {
                    console.log(`⚠️ Instance ${instance.id} is unhealthy - restarting`);
                    this.restartInstance(instance.id);
                } else {
                    instance.health = 'healthy';
                }
            }
        });
    }

    restartInstance(instanceId) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            console.log(`🔄 Restarting instance ${instanceId}`);
            instance.status = 'restarting';
            
            setTimeout(() => {
                instance.status = 'running';
                instance.health = 'healthy';
                instance.cpu = 0;
                instance.memory = 0;
                console.log(`✅ Instance ${instanceId} restarted successfully`);
            }, 2000);
        }
    }

    monitorPerformance() {
        setInterval(() => {
            console.log('📊 Performance Summary:');
            console.log(`   Instances: ${this.metrics.currentInstances}`);
            console.log(`   Requests: ${this.metrics.totalRequests}`);
            console.log(`   Error Rate: ${this.metrics.errorRate.toFixed(2)}%`);
            console.log(`   Avg Response: ${this.metrics.avgResponseTime.toFixed(0)}ms`);
            console.log(`   Throughput: ${this.metrics.throughput.toFixed(1)} req/s`);
        }, 30000); // Log every 30 seconds
    }

    generateScalabilityReport() {
        return {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            instances: Object.fromEntries(this.instances),
            autoScaling: this.autoScaling,
            loadBalancer: this.loadBalancer,
            status: this.getScalabilityStatus()
        };
    }

    getScalabilityStatus() {
        const avgCPU = this.calculateAverageCPU();
        const avgMemory = this.calculateAverageMemory();
        
        if (avgCPU < 50 && avgMemory < 50) return 'optimal';
        if (avgCPU < 80 && avgMemory < 80) return 'good';
        if (avgCPU < 95 && avgMemory < 95) return 'warning';
        return 'critical';
    }
}

// Initialize Scalability Manager
const scalabilityManager = new ScalabilityManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScalabilityManager;
}
