#!/bin/bash

# Agent Monitoring Script - Automated Manager
# Monitors all agents every 5 minutes and updates direction files

echo "🤖 AGENT MONITOR - Starting automated monitoring..."

# Function to check agent status
check_agent_status() {
    local agent=$1
    local feedback_file="feedback/${agent}.md"
    local direction_file="plans/agents/${agent}/direction.md"
    
    echo "Checking ${agent} agent..."
    
    # Check if feedback file exists and has recent activity
    if [ -f "$feedback_file" ]; then
        local last_modified=$(stat -c %Y "$feedback_file" 2>/dev/null || echo 0)
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_modified))
        
        # If no activity in last 10 minutes, agent might be idle
        if [ $time_diff -gt 600 ]; then
            echo "⚠️  ${agent} agent appears idle (no feedback in ${time_diff}s)"
            return 1
        else
            echo "✅ ${agent} agent active (feedback ${time_diff}s ago)"
            return 0
        fi
    else
        echo "❌ ${agent} agent has no feedback file"
        return 1
    fi
}

# Function to update agent direction
update_agent_direction() {
    local agent=$1
    local direction_file="plans/agents/${agent}/direction.md"
    
    echo "Updating ${agent} direction file..."
    
    # Add timestamp to direction file
    echo "" >> "$direction_file"
    echo "## 🤖 AUTOMATED UPDATE" >> "$direction_file"
    echo "**Last Checked**: $(date)" >> "$direction_file"
    echo "**Status**: Active monitoring enabled" >> "$direction_file"
}

# Main monitoring loop
while true; do
    echo ""
    echo "🔄 AGENT MONITOR CYCLE - $(date)"
    echo "=================================="
    
    # Check all agents
    agents=("rag" "seo" "inventory" "mcp" "sales" "dashboard" "approvals" "tooling")
    
    idle_agents=()
    
    for agent in "${agents[@]}"; do
        if ! check_agent_status "$agent"; then
            idle_agents+=("$agent")
        fi
    done
    
    # Report idle agents
    if [ ${#idle_agents[@]} -gt 0 ]; then
        echo ""
        echo "🚨 IDLE AGENTS DETECTED:"
        for agent in "${idle_agents[@]}"; do
            echo "  - ${agent}"
        done
        echo ""
        echo "📝 Updating direction files for idle agents..."
        
        for agent in "${idle_agents[@]}"; do
            update_agent_direction "$agent"
        done
    else
        echo ""
        echo "✅ ALL AGENTS ACTIVE - No intervention needed"
    fi
    
    echo ""
    echo "⏰ Next check in 5 minutes..."
    sleep 300  # 5 minutes
done
