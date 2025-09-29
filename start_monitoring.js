#!/usr/bin/env node

// Long-term Monitoring Startup Script
// Manager Direct Implementation - Continuous System Monitoring

const SystemMonitor = require('./monitoring/system_monitor');

async function startLongTermMonitoring() {
    console.log('🚀 Starting Long-term System Monitoring...');
    console.log('📅 Started at:', new Date().toISOString());
    
    const monitor = new SystemMonitor();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        monitor.stopMonitoring();
        
        // Generate final report
        const finalReport = monitor.generateReport();
        console.log('\n📊 Final Monitoring Report:');
        console.log(JSON.stringify(finalReport.summary, null, 2));
        
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        monitor.stopMonitoring();
        process.exit(0);
    });
    
    // Start monitoring with 5-minute intervals
    monitor.startMonitoring(300000); // 5 minutes
    
    console.log('✅ Monitoring started successfully');
    console.log('⏰ Health checks will run every 5 minutes');
    console.log('📊 Press Ctrl+C to stop monitoring and generate report');
    
    // Keep the process running
    setInterval(() => {
        // Just keep alive
    }, 60000); // Check every minute
}

// Start monitoring
startLongTermMonitoring().catch(error => {
    console.error('🚨 Failed to start monitoring:', error);
    process.exit(1);
});
