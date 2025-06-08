# How to Maintain Consistency with AI Assistant

## The Problem
AI assistants may lose context between sessions and accidentally:
- Change token amounts
- Use wrong denominations  
- Forget agreed configurations
- Make up new parameters

## The Solution

### 1. Canonical Configuration File
**CANONICAL_BLOCKCHAIN_CONFIG.md** is the single source of truth containing:
- Exact token amounts
- Denomination conversions
- SDK minting parameters
- All fixed configuration values

### 2. AI Context Files
- **CLAUDE.md** - Detailed context for AI assistant
- **.claude-context** - Quick reference for common values
- These files help AI remember project specifics

### 3. Verification Script
**verify-blockchain-config.sh** checks that running blockchain matches canonical config:
```bash
./verify-blockchain-config.sh
```

### 4. Consistent Launch Process
**fresh-launch-complete.sh** uses values from canonical config:
```bash
./fresh-launch-complete.sh
mychaind start
```

## Best Practices

### For Users

1. **Start Each Session**
   - Tell AI to read CANONICAL_BLOCKCHAIN_CONFIG.md
   - Run verify-blockchain-config.sh to ensure consistency
   - Reference specific numbers when asking questions

2. **When Restarting Blockchain**
   - Always use fresh-launch-complete.sh
   - Don't manually edit genesis unless updating canonical config
   - Verify after launch with verification script

3. **If AI Gets Confused**
   - Point to CANONICAL_BLOCKCHAIN_CONFIG.md
   - Say "Check the canonical configuration"
   - Run verification script to show correct values

### For AI Assistants

1. **At Session Start**
   - Read CANONICAL_BLOCKCHAIN_CONFIG.md
   - Read CLAUDE.md for context
   - Check recent SESSION_SUMMARY files

2. **Before Any Changes**
   - Verify values against canonical config
   - Don't make up numbers
   - Ask user if unsure

3. **Common Reminders**
   - LC total is 100,000 (not 100)
   - MC shows as 100,010 (not 10)
   - Use ulc (not alc)
   - 1 token = 1,000,000 micro-units

## Example Conversation Starters

### Good Ways to Start
```
"Please read CANONICAL_BLOCKCHAIN_CONFIG.md first"
"Continue from previous session - check canonical config"
"We have 100,000 LC with 90,000 staked as documented"
```

### If AI Makes Mistakes
```
"That's wrong - check CANONICAL_BLOCKCHAIN_CONFIG.md"
"We agreed on 100,000 LC, not [wrong number]"
"Run verify-blockchain-config.sh to see correct values"
```

## File Hierarchy

1. **CANONICAL_BLOCKCHAIN_CONFIG.md** - Ultimate authority
2. **verify-blockchain-config.sh** - Validates against canonical
3. **fresh-launch-complete.sh** - Implements canonical config
4. **CLAUDE.md** - AI context (references canonical)
5. **.claude-context** - Quick reference (from canonical)

## Updating Configuration

If you need to change configuration:
1. Update CANONICAL_BLOCKCHAIN_CONFIG.md FIRST
2. Update fresh-launch-complete.sh to match
3. Update CLAUDE.md with new info
4. Commit changes with clear message
5. Tell AI about the updates

## Summary

The key to consistency is:
- One source of truth (CANONICAL_BLOCKCHAIN_CONFIG.md)
- Automated verification (verify-blockchain-config.sh)
- Consistent implementation (fresh-launch-complete.sh)
- Clear communication with AI about the canonical source

This system ensures that every blockchain restart uses the exact same configuration, regardless of which AI assistant or human is performing the task.