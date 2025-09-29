# 🔄 AGENT POLLING INSTRUCTIONS

## ⚡ **CRITICAL: POLL EVERY 5 MINUTES - DON'T WAIT!**

### 🚨 **YOU MUST POLL - DON'T SIT IDLE:**

**Every 5 Minutes, Check These Files:**
1. `coordination/GO-SIGNAL.md` - Sprint status and priorities
2. `coordination/AGENT-INSTRUCTIONS.md` - Process instructions  
3. `plans/agents/[your-agent]/direction.md` - Your specific tasks
4. `coordination/agent-notifications.md` - Your status updates

### 📋 **Polling Schedule:**
- **Every 5 Minutes**: Check all 4 files above
- **Immediately**: Start work when you see new tasks
- **Immediately**: Submit feedback when work is complete
- **Never Wait**: If no new instructions, continue current work

### 🎯 **Current Status (Check Now):**

#### **Tooling Engineer** - READY FOR NEXT TASK:
**Current Task**: TypeScript error resolution (2-3 hours)
**Status**: READY FOR NEXT INSTRUCTIONS
**Action**: Continue with TypeScript fixes OR request new task

#### **Dashboard Engineer** - BLOCKED ON TYPESCRIPT:
**Current Task**: Dashboard Home functionality
**Status**: BLOCKED - TypeScript compilation errors
**Action**: Fix TypeScript errors (2-3 hours) OR wait for tooling

#### **All Other Agents** - CHECK YOUR STATUS:
- Read your direction file for current tasks
- Continue prep work if no new assignments
- Submit progress immediately when complete

### 🚀 **Polling Commands (Run Every 5 Minutes):**

```bash
# Check for updates
ls -la coordination/GO-SIGNAL.md coordination/AGENT-INSTRUCTIONS.md
cat plans/agents/[your-agent]/direction.md | head -20
cat coordination/agent-notifications.md | grep -A 5 "[your-agent]"
```

### ⚡ **High-Velocity Mode:**
- **Don't Wait**: Poll every 5 minutes for new instructions
- **Work Continuously**: Continue current tasks between polls
- **Report Immediately**: Submit feedback as soon as work is done
- **Expect Rapid Response**: Manager will update within 5 minutes

### 🎯 **If You're Idle:**
1. **Check Your Direction File**: Look for current tasks
2. **Continue Prep Work**: Algorithm development, UI components, etc.
3. **Submit Progress**: Report what you've accomplished
4. **Request Next Task**: Ask for specific work assignments

---

## 🚨 **START POLLING NOW - DON'T WAIT FOR INSTRUCTIONS!**

**Every agent should be actively checking files and working continuously.**

---
*Last Updated: 2025-09-28 - POLLING MANDATORY*
